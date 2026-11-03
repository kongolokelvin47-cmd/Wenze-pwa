"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TAUX_CDF } from "@/lib/categories";

export const dynamic = "force-dynamic";
const cleanWa = (n:any)=> (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const safeGet = (k:string)=>{ try{ return typeof window!=="undefined"?localStorage.getItem(k):null; }catch{return null;} };
const readList = (k:string):any[]=>{ try{ const raw=safeGet(k); if(!raw) return []; const v=JSON.parse(raw); return Array.isArray(v)?v:[]; }catch{return[];} };

function InscriptionContent(){
  const sp = useSearchParams();
  const router = useRouter();
  
  // === PARAMS INVITATION - REFORMES 3-5-6 ===
  const inviteParam = sp.get("invite")||""; // Numéro invité réservé
  const parrainParam = sp.get("parrain")||""; // Numéro parrain (client ou boutique ou ambassadeur)
  const codeParam = sp.get("code")||""; // Code ambassadeur / numéro parrainage
  const typeParam = (sp.get("type")||"boutique") as "boutique"|"client";

  const [typeCompte, setTypeCompte] = useState<"boutique"|"client">(typeParam);
  const [nom, setNom] = useState("");
  const [marque, setMarque] = useState("");
  const [whatsapp, setWhatsapp] = useState(inviteParam||"");
  const [commune, setCommune] = useState("Gombe");
  const [email, setEmail] = useState(""); // Facultatif - Pour Niveau 2
  const [codeAmbassadeur, setCodeAmbassadeur] = useState(codeParam||"");
  const [isAmbassadeur, setIsAmbassadeur] = useState(false);
  const [toast, setToast] = useState("");
  const [parrainInfo, setParrainInfo] = useState<any>(null);

  useEffect(()=>{
    // Charge info parrain si invitation
    if(parrainParam || codeParam){
      try{
        const all = readList("wenze_all_users");
        const clean = (n:string)=> n.replace(/[^0-9]/g,"").replace(/^0+/,"");
        const parrain = all.find((u:any)=> clean(u.ownerWhatsapp||u.whatsapp)===clean(parrainParam) || (u.ambassadorCode||"").toUpperCase()===codeParam.toUpperCase() || (u.myInviteCode||"").toUpperCase()===codeParam.toUpperCase());
        if(parrain){
          const nomP = parrain.nomEtablissement || parrain.boutiqueName || parrain.name || `Parrain ${clean(parrain.ownerWhatsapp||"").slice(-4)}`;
          setParrainInfo({ ...parrain, nomAffiche: nomP, isAmb: !!parrain.isAmbassadeur });
        } else if(codeParam){
          // Parrain pas encore en base mais code valide = numéro WhatsApp
          setParrainInfo({ nomAffiche: `Parrain ${codeParam.slice(-4)}`, isAmb: false, code: codeParam });
        }
      }catch{}
    }
  },[parrainParam, codeParam]);

  const getBoutiqueIdentite = (n:string, m:string)=>{
    const base = n.replace(/^Boutiques\s*/i,"").trim() || "Bilamba";
    const marq = m.trim() || (base.toLowerCase().includes("bilamba")?"Maison d'habillement": base.toLowerCase().includes("mamie")?"Agro & Vivrier":"Commerce général");
    return `Boutiques ${base} (${marq})`;
  };

  const handleCreate = ()=>{
    const clean = (n:string)=> n.replace(/[^0-9]/g,"").replace(/^0+/,"");
    const wa = clean(whatsapp);
    if(wa.length<9){ setToast("Numéro WhatsApp invalide - Ex: 0825000000"); setTimeout(()=>setToast(""),3000); return; }
    if(!nom.trim()){ setToast(typeCompte==="boutique"?"Nom boutique obligatoire Ex: Bilamba":"Nom client obligatoire"); setTimeout(()=>setToast(""),3000); return; }
    
    // === REFORME 1: NIVEAU ===
    const hasGmail = !!(email && email.includes("@"));
    const niveau = hasGmail ? 2 : 1; // Niveau 1 sans Gmail (1 image), Niveau 2 avec Gmail (3 images), Niveau 3 sera après verif WhatsApp

    // === REFORME 2+6: CODE AMBASSADEUR 0 PLACE ===
    let myInviteCode = `WENZE-${wa.slice(-4)}`;
    if(isAmbassadeur && codeAmbassadeur){
      myInviteCode = codeAmbassadeur.toUpperCase(); // Ambassadeur: BILAMBA2026 = code parrainage
    }
    
    const newUser = {
      id: wa,
      ownerWhatsapp: wa,
      whatsapp: wa,
      telephone: wa,
      role: typeCompte==="client"?"client":"vendeur",
      user_type: typeCompte==="client"?"client":"vendeur",
      name: nom,
      nom: nom,
      nomBoutique: typeCompte==="boutique"?nom:"",
      marque: typeCompte==="boutique"?marque:"",
      nomEtablissement: typeCompte==="boutique"?getBoutiqueIdentite(nom, marque):nom,
      boutiqueName: typeCompte==="boutique"?getBoutiqueIdentite(nom, marque):"",
      commune,
      ville: "Kinshasa",
      email: hasGmail?email:"",
      emailVerified: false,
      whatsappVerified: false,
      niveau,
      hasGmail,
      // REFORMES 3-5-6: Invitation
      myInviteCode,
      ambassadorCode: isAmbassadeur?codeAmbassadeur.toUpperCase():null,
      isAmbassadeur,
      parrainWa: parrainParam?clean(parrainParam):null,
      codeParrainageUtilise: codeAmbassadeur||codeParam||null, // Code ambassadeur / numéro parrainage utilisé - 0 place
      ambassadorUsed: codeAmbassadeur||codeParam||null, // Pour ne pas compter place
      inviteWaOrigine: inviteParam?clean(inviteParam):null,
      tombolaTickets: 0,
      bonusJours: codeParam?1:0, // +1 jour si invité
      createdAt: new Date().toISOString(),
      becameSellerAt: typeCompte==="vendeur"?new Date().toISOString():null,
    };

    // Sauvegarde user
    if(typeof window!=="undefined"){
      localStorage.setItem("wenze_user", JSON.stringify(newUser));
      const all = readList("wenze_all_users");
      const idx = all.findIndex((u:any)=> clean(u.ownerWhatsapp||u.whatsapp)===wa);
      if(idx>=0) all[idx]=newUser; else all.push(newUser);
      localStorage.setItem("wenze_all_users", JSON.stringify(all));

      // === REFORMES 5-6: VALIDE INVITATION + TOMBOLA ===
      if(parrainParam){
        const invList = readList("wenze_invitations");
        const inv = invList.find((i:any)=> clean(i.parrainWa)===clean(parrainParam) && clean(i.inviteWa)===wa);
        if(inv){ inv.status="validé"; inv.dateValidation=new Date().toISOString(); inv.inviteNom=newUser.nomEtablissement||newUser.name; }
        else {
          // Invitation directe via lien sans enregistrement préalable
          invList.push({
            id: Date.now().toString(),
            parrainWa: clean(parrainParam),
            parrainNom: parrainInfo?.nomAffiche||`Parrain ${clean(parrainParam).slice(-4)}`,
            parrainType: parrainInfo?.isAmb?"ambassadeur":(parrainInfo?.role||"boutique"),
            codeParrainage: codeParam||clean(parrainParam),
            codeAmbassadeur: parrainInfo?.isAmb?codeParam:null,
            inviteWa: wa,
            inviteNom: newUser.nomEtablissement||newUser.name,
            typeCompteInvite: typeCompte,
            status: "validé",
            date: new Date().toISOString(),
            dateValidation: new Date().toISOString(),
            commissionAmbassadeur: parrainInfo?.isAmb?0.20:0,
            premierAbonnementPaye: false,
          });
        }
        localStorage.setItem("wenze_invitations", JSON.stringify(invList));

        // Ticket Tombola pour parrain
        const tombola = readList("wenze_tombola");
        tombola.push({
          parrainWa: clean(parrainParam),
          parrainNom: parrainInfo?.nomAffiche||"",
          inviteWa: wa,
          inviteNom: newUser.nomEtablissement||newUser.name,
          ticketId: `TOMBOLA-${Date.now()}`,
          codeParrainage: codeParam||clean(parrainParam),
          type: typeCompte,
          date: new Date().toISOString(),
          isAmbassadeur: !!parrainInfo?.isAmb,
        });
        localStorage.setItem("wenze_tombola", JSON.stringify(tombola));
      }

      // Transaction code ambassadeur 0 place
      if(codeAmbassadeur){
        const trans = readList("wenze_transactions");
        trans.push({ type:"code_ambassadeur_utilise_inscription", code:codeAmbassadeur, ownerWhatsapp:wa, parrainWa: parrainParam?clean(parrainParam):null, date:new Date().toISOString(), placesConsommees:0 });
        localStorage.setItem("wenze_transactions", JSON.stringify(trans));
      }
    }

    setToast(`✅ ${newUser.nomEtablissement||newUser.name} créé! Niveau ${niveau} - ${niveau===1?'1 image freemium (Sans Gmail)':'3 images freemium (Gmail)'} - Code ${codeAmbassadeur||'aucun'} (0 place) - Parrain ${parrainInfo?.nomAffiche||parrainParam||'aucun'} gagne ticket Tombola`);
    setTimeout(()=> router.push(typeCompte==="boutique"?"/boutiques":"/"), 2000);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[15px] truncate">Inscription WENZE WENZE BUSINESS V7</h1>
          <p className="text-[9px] text-gray-500 truncate">Client ou Boutique - 1 compte = 2 rôles - Niveau 1-2-3 - Code 0 place - Invitation {inviteParam?`réservée 0${inviteParam.slice(-4)}`:''}</p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {toast&&<div className="bg-black text-white p-3 rounded-xl text-[11px] font-bold text-center">{toast}</div>}

        {/* BANDEAU INVITATION - REFORMES 3-5-6 */}
        {(parrainParam || codeParam) && (
          <div className="bg-black text-white rounded-2xl p-4">
            <p className="font-black text-[12px]">🎟️ Invitation reçue</p>
            <p className="text-[10px] text-white/80 mt-1">
              Tu es invité par <b>{parrainInfo?.nomAffiche||parrainParam||codeParam}</b> {parrainInfo?.isAmb?"(Ambassadeur - 20% 1er abo fin mois)":"(Client/Boutique - Numéro WhatsApp plateforme = code parrainage - Cadeaux)"} 
              <br/>Numéro invité réservé: <b>0{cleanWa(inviteParam||whatsapp).slice(-9)}</b> • Code parrainage: <b>{codeParam||parrainParam}</b> (0 place) • Tu préciseras tes coordonnées ci-dessous. Parrain gagne ticket Tombola.
            </p>
          </div>
        )}

        {/* REFORME 1: 3 NIVEAUX */}
        <div className="bg-[#FFF2CC] border-2 border-black rounded-2xl p-4">
          <p className="font-black text-[11px]">Système 3 Niveaux Temu Kinshasa</p>
          <p className="text-[9px] mt-1">Niveau 1 Sans Gmail (40%): 1 image freemium • Peut acheter OUI • Peut créer compte vendeur OUI (3 champs WhatsApp) • Peut payer abo NON, seulement occasionnel 2$/7j • Niveau 2 Avec Gmail vérifié (60%): 3 images freemium • Tous abo • Niveau 3 Gmail+WhatsApp vérifié (5%): Badge Vérifié + Top3</p>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">Type de compte - Client peut créer boutique et devenir vendeur</p>
          <div className="flex gap-2 mt-3">
            <button onClick={()=>setTypeCompte("boutique")} className={`flex-1 py-3 rounded-full text-[11px] font-black border-2 ${typeCompte==="boutique"?"bg-black text-white border-black":"bg-white"}`}>🏬 Boutique - Ex: Boutiques Bilamba (Maison d'habillement)</button>
            <button onClick={()=>setTypeCompte("client")} className={`flex-1 py-3 rounded-full text-[11px] font-black border-2 ${typeCompte==="client"?"bg-black text-white border-black":"bg-white"}`}>👤 Client - Achète puis deviens vendeur 1 clic</button>
          </div>
          <p className="text-[9px] text-gray-500 mt-2">Réforme 4: Tout client peut créer boutique et devenir vendeur en gardant son compte. 1 compte = 2 rôles. Ne compte pas comme place.</p>
        </div>

        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <p className="font-black text-[12px]">Tes coordonnées - Invité précise ses coordonnées</p>
          <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="Numéro WhatsApp (obligatoire) Ex: 0825000000 - Numéro invité réservé" className="w-full p-3 rounded-xl border text-[13px] font-bold" />
          <input value={nom} onChange={e=>setNom(e.target.value)} placeholder={typeCompte==="boutique"?"Nom boutique Ex: Bilamba":"Ton nom Ex: Patrick"} className="w-full p-3 rounded-xl border text-[13px]" />
          {typeCompte==="boutique" && <input value={marque} onChange={e=>setMarque(e.target.value)} placeholder="Marque Ex: Maison d'habillement - Ex: Mamie Wenze (Agro & Vivrier)" className="w-full p-3 rounded-xl border text-[13px]" />}
          <input value={commune} onChange={e=>setCommune(e.target.value)} placeholder="Commune Ex: Gombe / Masina" className="w-full p-3 rounded-xl border text-[13px]" />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Gmail (facultatif - Pour Niveau 2: 3 images + abo) Ex: bilamba@gmail.com" className="w-full p-3 rounded-xl border text-[12px]" />
          <p className="text-[9px] text-gray-500">Sans Gmail = Niveau 1: 1 image freemium, occasionnel 2$/7j seulement. Avec Gmail = Niveau 2: 3 images + STANDARD 0.5$ PRO 1$ PREMIUM 2$ - Coût 0$</p>
        </div>

        <div className="bg-white border-2 border-dashed rounded-2xl p-4">
          <p className="font-black text-[11px]">Code Ambassadeur / Parrainage (Facultatif - 0 place comptée) - Réformes 2-5-6</p>
          <p className="text-[8px] text-gray-600 mt-1">Formule: Tout le monde peut inviter. Ambassadeur: code BILAMBA2026 utilisé comme parrainage = 20% 1er abo fin mois. Client/Boutique: numéro WhatsApp plateforme comme code parrainage = cadeaux offerts par plateforme selon parrainages + pubs invités. Invitation contient numéro invité + code.</p>
          <input value={codeAmbassadeur} onChange={e=>setCodeAmbassadeur(e.target.value.toUpperCase())} placeholder="CODE AMBASSADEUR OU NUMÉRO PARRAINAGE Ex: BILAMBA2026 ou 0825... (facultatif - 0 place)" className="w-full mt-3 p-3 rounded-xl border text-[11px] uppercase font-bold" />
          <div className="flex gap-2 mt-3 items-center">
            <input type="checkbox" checked={isAmbassadeur} onChange={e=>setIsAmbassadeur(e.target.checked)} className="w-4 h-4" />
            <span className="text-[10px] font-bold">Je veux devenir Ambassadeur - Mon code ambassadeur = mon code parrainage = 20% 1er abo fin mois</span>
          </div>
          {parrainInfo && <p className="text-[10px] font-bold mt-2 text-green-700">✅ Parrain: {parrainInfo.nomAffiche} - Code: {codeParam||parrainParam} - {parrainInfo.isAmb?'Il touchera 20%':'Il gagnera cadeau + ticket Tombola'} - 0 place comptée</p>}
          <p className="text-[8px] text-gray-400 mt-2">Ex: Boutiques Bilamba (Maison d'habillement) BILAMBA2026 invite Mamie Wenze → Mamie s'inscrit avec code → Bilamba gagne ticket Tombola + 20% si abo</p>
        </div>

        <button onClick={handleCreate} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px]">
          Créer mon compte {typeCompte==="boutique"?`Boutiques ${nom||'Bilamba'} (${marque||'Commerce'})`:nom||'Client'} - Niveau {email.includes("@")?2:1} - Code 0 place
        </button>
        <p className="text-[9px] text-center text-gray-500">Client peut devenir vendeur • Ambassadeur 20% • Client/Boutique cadeaux • Numéro invité + code = Tombola • Taux {TAUX_CDF} • 0% comm</p>
      </div>
    </div>
  );
}

export default function InscriptionPage(){
  return <Suspense fallback={<div className="max-w-[430px] mx-auto p-6">Chargement inscription V7...</div>}><InscriptionContent/></Suspense>;
                          }
