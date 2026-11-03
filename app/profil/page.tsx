"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDFString, verifierAbonnement, libererPlace, checkFreemiumWenze } from "@/lib/paiement";

export const dynamic = "force-dynamic";
const cleanWa = (n: any) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const safeGet = (k:string)=>{ try{ return typeof window!=="undefined"?localStorage.getItem(k):null; }catch{return null;} };
const readList = (k:string):any[]=>{ try{ const raw=safeGet(k); if(!raw) return []; const v=JSON.parse(raw); return Array.isArray(v)?v:[]; }catch{return[];} };
const createdTime = (a:any)=>{ try{ return new Date(a.createdAt||a.created_at||a.updatedAt||0).getTime(); }catch{return 0;} };

function getBoutiqueIdentite(u:any){
  const nomBrut = (u?.nomBoutique || u?.boutiqueName || u?.name || u?.nomEtablissement || "").trim();
  const marqueBrut = (u?.marque || u?.slogan || "").trim();
  if(nomBrut.includes("(") && nomBrut.toLowerCase().includes("boutiques")) return nomBrut;
  const base = nomBrut.replace(/^Boutiques\s*/i,"") || "Bilamba";
  const marque = marqueBrut || (base.toLowerCase().includes("bilamba")?"Maison d'habillement":"Commerce général");
  return `Boutiques ${base} (${marque})`;
}

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ab, setAb] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formCat, setFormCat] = useState<string>("commerces-services");
  const [toast, setToast] = useState("");
  const [nomBoutique, setNomBoutique] = useState("");
  const [marqueBoutique, setMarqueBoutique] = useState("");
  const [codeAmbassadeur, setCodeAmbassadeur] = useState("");
  const [isAmbassadeur, setIsAmbassadeur] = useState(false);
  const [inviteNum, setInviteNum] = useState("");
  const [inviteNom, setInviteNom] = useState("");
  const [inviteType, setInviteType] = useState<"boutique"|"client">("boutique");
  const [commissions, setCommissions] = useState<any[]>([]);
  const [cadeaux, setCadeaux] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);

  useEffect(()=>{
    try{
      const raw=safeGet("wenze_user");
      if(!raw){ router.push("/connexion?next=/profil"); return; }
      const u=JSON.parse(raw);
      setUser(u);
      setFormCat(normalizeCategorie(u.categorieId||"commerces-services"));
      setNomBoutique(u.nomBoutique||"");
      setMarqueBoutique(u.marque||"");
      setIsAmbassadeur(!!u.isAmbassadeur);
      setCodeAmbassadeur(u.ambassadorCode||"");
      try{
        const abInfo:any = verifierAbonnement();
        const hasGmail = !!(u.email && u.emailVerified);
        const hasWaVerified = !!u.whatsappVerified;
        let niveau = 1;
        if(hasGmail && hasWaVerified) niveau=3;
        else if(hasGmail) niveau=2;
        setAb({ ...abInfo, niveau, hasGmail, hasWaVerified });
      }catch{}
      const list=readList("wenze_annonces_list");
      const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||u.id||"");
      const mine=list.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId||"")===wa).sort((a,b)=> createdTime(b)-createdTime(a));
      setAnnonces(mine);
      setCommissions(readList("wenze_commissions_ambassadeurs").filter((c:any)=> cleanWa(c.parrainWa)===wa));
      setCadeaux(readList("wenze_cadeaux_parrainage").filter((c:any)=> cleanWa(c.parrainWa)===wa));
      setInvitations(readList("wenze_invitations").filter((c:any)=> cleanWa(c.parrainWa)===wa));
    }catch(e){ console.log("profil V7",e); }
    finally{ setLoading(false); }
  },[router]);

  const formCatObj:any = useMemo(()=> getCategorieById(formCat) || {}, [formCat]);
  const isClient = user && (user.role==="client" || user.user_type==="client");

  const handleDevenirVendeur = ()=>{
    if(!nomBoutique.trim()){ setToast("Nom boutique obligatoire Ex: Bilamba"); setTimeout(()=>setToast(""),3000); return; }
    const wa=cleanWa(user.ownerWhatsapp||user.whatsapp||user.id);
    const nomComplet = `Boutiques ${nomBoutique.replace(/^Boutiques\s*/i,"")} (${marqueBoutique||'Commerce général'})`;
    const myCode = isAmbassadeur ? (codeAmbassadeur.toUpperCase()||`WENZE-${wa.slice(-4)}`) : `WENZE-${wa.slice(-4)}`;
    const newUser = { ...user, role:"vendeur", user_type:"vendeur", nomBoutique, marque: marqueBoutique||"Commerce général", nomEtablissement: nomComplet, boutiqueName: nomComplet, myInviteCode: myCode, ambassadorCode: isAmbassadeur ? codeAmbassadeur.toUpperCase() : null, isAmbassadeur, createdAt: user.createdAt, becameSellerAt: new Date().toISOString() };
    if(typeof window!=="undefined"){
      localStorage.setItem("wenze_user", JSON.stringify(newUser));
      const all=readList("wenze_all_users");
      const idx=all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp)===wa);
      if(idx>=0) all[idx]=newUser; else all.push(newUser);
      localStorage.setItem("wenze_all_users", JSON.stringify(all));
    }
    setUser(newUser);
    setToast(`✅ ${nomComplet} créée! ${isAmbassadeur?`Ambassadeur ${myCode} - 20% 1er abo`:`Numéro ${wa.slice(-4)} = code parrainage - Cadeaux`} - 0 place comptée`);
    setTimeout(()=>setToast(""),4000);
  };

  const handleInvite = ()=>{
    const waParrain=cleanWa(user.ownerWhatsapp||user.whatsapp);
    const codeParrainage = isAmbassadeur && user.ambassadorCode ? user.ambassadorCode.toUpperCase() : waParrain;
    if(!inviteNum || !inviteNom){ setToast("Numéro invité + nom obligatoire"); setTimeout(()=>setToast(""),3000); return; }
    const clean = (n:string)=> n.replace(/[^0-9]/g,"").replace(/^0+/,"");
    const invitation = { id: Date.now().toString(), parrainWa: waParrain, parrainNom: getBoutiqueIdentite(user), parrainType: isAmbassadeur ? "ambassadeur" : user.role, codeParrainage, codeAmbassadeur: isAmbassadeur ? codeParrainage : null, inviteWa: clean(inviteNum), inviteNom, typeCompteInvite: inviteType, status: "invité", date: new Date().toISOString(), commissionAmbassadeur: isAmbassadeur ? 0.20 : 0 };
    const list=readList("wenze_invitations");
    list.push(invitation);
    if(typeof window!=="undefined") localStorage.setItem("wenze_invitations", JSON.stringify(list));
    const msg = `Salut ${inviteNom}! ${getBoutiqueIdentite(user)} t'invite à créer ton compte ${inviteType} sur WENZE WENZE BUSINESS. Inscris-toi: tonmarche.cd/inscription?invite=${clean(inviteNum)}&parrain=${waParrain}&code=${codeParrainage}&type=${inviteType} - Code: ${codeParrainage} ${isAmbassadeur?'(Ambassadeur 20% 1er abo)':'(Numéro WhatsApp plateforme - cadeaux)'} - Tu préciseras tes coordonnées.`;
    window.open(`https://wa.me/${clean(inviteNum)}?text=${encodeURIComponent(msg)}`,"_blank");
    setInvitations([...invitations, invitation]);
    setToast(`✅ Invitation ${inviteType} à ${inviteNom} - Code: ${codeParrainage}`);
    setInviteNum(""); setInviteNom("");
    setTimeout(()=>setToast(""),4000);
  };

  const handleDelete=(id:string)=>{
    if(typeof window!=="undefined" && !confirm("Supprimer? Place libérée V7")) return;
    try{
      let list=readList("wenze_annonces_list");
      list=list.filter((a:any)=> String(a.id)!==String(id));
      if(typeof window!=="undefined") localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
      try{ libererPlace(id); }catch{}
      setAnnonces(prev=>prev.filter((a:any)=> String(a.id)!==String(id)));
      setToast("Supprimé - place libérée ✅");
      setTimeout(()=> setToast(""),2500);
    }catch{ setToast("Erreur"); }
  };

  const handleLogout=()=>{ try{ if(typeof window!=="undefined"){ localStorage.removeItem("wenze_user"); } }catch{} router.push("/connexion"); };

  if(loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-2">Profil V7...</p></div>;

  const totalCommission = commissions.reduce((s,c)=> s + (c.commission||0),0);
  const totalPointsCadeaux = cadeaux.reduce((s,c)=> s + (c.points||0),0);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[16px] truncate">Mon profil V7 - {isClient?"Client":getBoutiqueIdentite(user)}</h1>
          <p className="text-[10px] text-gray-500 truncate">Niveau {ab?.niveau||1} - {ab?.niveau===1?"Sans Gmail 1 image":ab?.niveau===2?"Gmail 3 images":"Premium ✅"} • Taux {TAUX_CDF}</p>
        </div>
        <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold ${ab?.isPaye?"bg-black text-white":ab?.isCache?"bg-red-600 text-white":"bg-orange-100 text-orange-700"}`}>{ab?.badge||"🆓"} {ab?.palierId||"Freemium"}</span>
      </header>

      <div className="p-4 space-y-4">
        {toast&&<div className="bg-black text-white p-3 rounded-xl text-[11px] font-bold text-center">{toast}</div>}

        <div className="bg-[#FFF2CC] border-2 border-black rounded-2xl p-4">
          <p className="font-black text-[12px]">Système 3 Niveaux - Temu Kin</p>
          <p className="text-[10px] mt-2">N1 Sans Gmail: 1 image freemium, occasionnel 2$/7j seulement • N2 Gmail vérifié: 3 images + tous abo • N3 Gmail+WhatsApp: Badge Vérifié + Top3</p>
          <p className="text-[9px] mt-2 font-bold">Toi: Niveau {ab?.niveau||1} • 0$ pour 95% • Places: {ab?.placesRestantes||0} libres strictes • Code 0 place • Invitation 0 place</p>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-black text-[18px]">{(user?.nomEtablissement||user?.nom||"W").slice(0,1).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[13px] truncate">{isClient?user?.name||user?.nom:getBoutiqueIdentite(user)}</p>
              <p className="text-[11px] text-gray-500 truncate">WA {cleanWa(user?.ownerWhatsapp||user?.whatsapp||"").slice(-9)} • {annonces.length}/50 actives • Code: {user?.isAmbassadeur?user?.ambassadorCode:cleanWa(user?.ownerWhatsapp||"").slice(-4)} (0 place)</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/portefeuille" className="bg-black text-white rounded-full py-2.5 text-center text-[11px] font-black">💼 Portefeuille {totalCommission>0?`+${totalCommission}$`:''}</Link>
            <Link href="/boutiques" className="bg-white border-2 border-black rounded-full py-2.5 text-center text-[11px] font-black">🏬 Mes annonces</Link>
          </div>
          <button onClick={handleLogout} className="mt-2 w-full bg-gray-100 rounded-full py-2.5 text-[11px] font-bold">Deconnexion</button>
        </div>

        {isClient ? (
          <div className="bg-black text-white rounded-2xl p-4">
            <p className="font-black text-[13px]">Tu es client, deviens vendeur en 1 clic</p>
            <input value={nomBoutique} onChange={e=>setNomBoutique(e.target.value)} placeholder="Nom boutique Ex: Bilamba" className="w-full mt-3 p-3 rounded-xl border text-black font-bold text-[13px]" />
            <input value={marqueBoutique} onChange={e=>setMarqueBoutique(e.target.value)} placeholder="Marque Ex: Maison d'habillement" className="w-full mt-2 p-3 rounded-xl border text-black text-[13px]" />
            <div className="flex gap-2 mt-3 items-center">
              <input type="checkbox" checked={isAmbassadeur} onChange={e=>setIsAmbassadeur(e.target.checked)} className="w-4 h-4" />
              <span className="text-[11px] font-bold">Devenir Ambassadeur? Code = parrainage = 20% 1er abo</span>
            </div>
            <input value={codeAmbassadeur} onChange={e=>setCodeAmbassadeur(e.target.value.toUpperCase())} placeholder="Code ambassadeur Ex: BILAMBA2026 (0 place)" className="w-full mt-2 p-3 rounded-xl border text-black text-[11px] uppercase font-black" />
            <button onClick={handleDevenirVendeur} className="w-full mt-3 bg-white text-black py-3 rounded-full font-black text-[11px]">✅ Créer boutique → Vendeur</button>
          </div>
        ) : (
          <div className="bg-white border-2 border-black rounded-2xl p-4">
            <p className="font-black text-[12px]">Ambassadeur? Code = parrainage = 20% fin mois</p>
            <div className="flex gap-2 mt-2 items-center">
              <input type="checkbox" checked={isAmbassadeur} onChange={e=>{ const v=e.target.checked; setIsAmbassadeur(v); const updated={...user, isAmbassadeur:v, ambassadorCode: v ? (user.ambassadorCode||`WENZE-${cleanWa(user.ownerWhatsapp).slice(-4)}`) : null }; setUser(updated); if(typeof window!=="undefined"){ localStorage.setItem("wenze_user", JSON.stringify(updated)); const all=readList("wenze_all_users"); const idx=all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp)===cleanWa(user.ownerWhatsapp)); if(idx>=0){ all[idx]=updated; localStorage.setItem("wenze_all_users", JSON.stringify(all)); } } }} />
              <span className="text-[11px] font-bold">{isAmbassadeur?"✅ Ambassadeur actif":"Activer ambassadeur"}</span>
            </div>
            {isAmbassadeur && <input value={user?.ambassadorCode||""} onChange={e=>{ const code=e.target.value.toUpperCase(); const updated={...user, ambassadorCode:code, myInviteCode:code}; setUser(updated); if(typeof window!=="undefined"){ localStorage.setItem("wenze_user", JSON.stringify(updated)); } }} placeholder="BILAMBA2026" className="w-full mt-2 p-3 rounded-xl border text-[11px] uppercase font-black" />}
          </div>
        )}

        <div className="bg-white border-2 border-dashed rounded-2xl p-4">
          <p className="font-black text-[12px]">🎟️ Inviter - Numéro invité + Code parrainage</p>
          <p className="text-[9px] text-gray-600 mt-1">{isAmbassadeur?`Ambassadeur: Code ${user?.ambassadorCode} = 20% 1er abo`:`Client/Boutique: Numéro WhatsApp = code parrainage = cadeaux`}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={()=>setInviteType("boutique")} className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${inviteType==="boutique"?"bg-black text-white":"bg-white"}`}>Boutique</button>
            <button onClick={()=>setInviteType("client")} className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${inviteType==="client"?"bg-black text-white":"bg-white"}`}>Client</button>
          </div>
          <input value={inviteNum} onChange={e=>setInviteNum(e.target.value)} placeholder="Numéro invité Ex: 0825000000" className="w-full mt-2 border rounded-full px-4 py-2.5 text-[12px]" />
          <input value={inviteNom} onChange={e=>setInviteNom(e.target.value)} placeholder="Nom invité - Il précisera ses coordonnées" className="w-full mt-2 border rounded-full px-4 py-2.5 text-[12px]" />
          <button onClick={handleInvite} className="w-full mt-3 bg-[#25D366] text-white py-3 rounded-full font-black text-[11px]">Inviter via WhatsApp - Code: {isAmbassadeur?user?.ambassadorCode||'WENZE-...':cleanWa(user?.ownerWhatsapp||"").slice(-9)}</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black text-white rounded-2xl p-4">
            <p className="font-black text-[11px]">💰 Ambassadeur 20%</p>
            <p className="text-[20px] font-black mt-1">{totalCommission.toFixed(2)}$</p>
            <p className="text-[9px] text-white/60 mt-1">{commissions.length} abo • Fin mois</p>
          </div>
          <div className="bg-white border-2 border-black rounded-2xl p-4">
            <p className="font-black text-[11px]">🎁 Cadeaux</p>
            <p className="text-[20px] font-black mt-1">{totalPointsCadeaux} pts</p>
            <p className="text-[9px] text-gray-600 mt-1">{cadeaux.length} parrainages</p>
          </div>
        </div>

        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b">
            <p className="font-black text-[13px]">Mes annonces {annonces.length}/50 - Code 0 place</p>
            <Link href="/publier" className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black">+ Publier</Link>
          </div>
          {annonces.length===0 ? (
            <div className="p-8 text-center"><p className="text-3xl">📦</p><p className="text-[11px] mt-2 font-bold">Aucune annonce</p></div>
          ) : (
            <div className="divide-y">
              {annonces.map((a:any)=>(
                <div key={a.id} className="p-3 flex gap-3 items-center">
                  <div className="w-14 h-14 bg-[#FFFBF0] rounded-xl overflow-hidden flex items-center justify-center shrink-0 border">{a.photo?<img src={a.photo} alt="" className="w-full h-full object-cover"/>:<span>📦</span>}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] truncate">{a.titre}</p>
                    <p className="text-[10px] text-gray-500">{a.prixUSD||a.prix}$ / {toCDFString(Number(a.prixUSD||a.prix||0))} • {a.palierId||"Freemium"}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Link href={`/publier?edit=${a.id}`} className="bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold text-center">Modifier</Link>
                    <button onClick={()=> handleDelete(a.id)} className="bg-red-50 border border-red-200 text-red-600 px-2.5 py-1 rounded-full text-[10px] font-bold">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
