"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDFString, verifierAbonnement, libererPlace } from "@/lib/paiement";

export const dynamic = "force-dynamic";
const cleanWa = (n: any) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const safeGet = (k:string)=>{ try{ return typeof window!=="undefined"?localStorage.getItem(k):null; }catch{return null;} };
const readList = (k:string):any[]=>{ try{ const raw=safeGet(k); if(!raw) return []; const v=JSON.parse(raw); return Array.isArray(v)?v:[]; }catch{return[];} };
const createdTime = (a:any)=>{ try{ return new Date(a.createdAt||a.created_at||a.updatedAt||0).getTime(); }catch{return 0;} };

// FIX TAUTOLOGIE BOUTIQUES BOUTIQUES
function getBoutiqueIdentite(u:any){
  if(!u) return "Boutiques Bilamba (Maison d'habillement)";
  const nomBrut = (u?.nomBoutique || u?.boutiqueName || u?.name || u?.nomEtablissement || u?.nom || "").trim();
  const marqueBrut = (u?.marque || u?.slogan || "").trim();
  // Si déjà format correct avec parenthèse, on retourne tel quel nettoyé d'un double Boutiques
  if(nomBrut.toLowerCase().includes("boutiques") && nomBrut.includes("(")){
    return nomBrut.replace(/Boutiques\s+Boutiques/i,"Boutiques").replace(/\s+/g," ").trim();
  }
  // Nettoie le nom
  let base = nomBrut.replace(/^Boutiques\s*/i,"").split("(")[0].trim() || "Bilamba";
  let marque = marqueBrut.replace(/^Boutiques\s*/i,"").split(")")[0].trim();
  if(!marque){
    marque = base.toLowerCase().includes("bilamba") ? "Maison d'habillement" : "Commerce général";
  }
  return `Boutiques ${base} (${marque})`;
}

function getNomCourtSansTautologie(u:any){
  const plein = getBoutiqueIdentite(u);
  return plein.replace(/^Boutiques\s+/i,"").trim();
}

export default function ProfilPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [ab, setAb] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formCat, setFormCat] = useState<string>("commerces-services");
  const [toast, setToast] = useState("");
  const [inviteNum, setInviteNum] = useState("");
  const [inviteNom, setInviteNom] = useState("");
  const [inviteType, setInviteType] = useState<"boutique"|"client">("boutique");
  const [commissions, setCommissions] = useState<any[]>([]);
  const [cadeaux, setCadeaux] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [photo, setPhoto] = useState("");

  useEffect(()=>{
    try{
      const raw=safeGet("wenze_user");
      if(!raw){ router.push("/connexion?next=/profil"); return; }
      const u=JSON.parse(raw);
      setUser(u);
      setPhoto(u.photo||u.avatar||"");
      setFormCat(normalizeCategorie(u.categorieId||"commerces-services"));
      try{ setAb(verifierAbonnement()); }catch{}
      const list=readList("wenze_annonces_list");
      const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||u.id||"");
      const mine=list.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId||"")===wa).sort((a,b)=> createdTime(b)-createdTime(a));
      setAnnonces(mine);
      setCommissions(readList("wenze_commissions_ambassadeurs").filter((c:any)=> cleanWa(c.parrainWa)===wa));
      setCadeaux(readList("wenze_cadeaux_parrainage").filter((c:any)=> cleanWa(c.parrainWa)===wa));
      setInvitations(readList("wenze_invitations").filter((c:any)=> cleanWa(c.parrainWa)===wa));
    }catch(e){ console.log("profil V8",e); }
    finally{ setLoading(false); }
  },[router]);

  const formCatObj:any = useMemo(()=> getCategorieById(formCat) || {}, [formCat]);
  const isAmbassadeur = !!(user?.isAmbassadeur || user?.ambassadorCode);
  const totalCommission = commissions.reduce((s,c)=> s + (c.commission||0),0);
  const totalPointsCadeaux = cadeaux.reduce((s,c)=> s + (c.points||0),0);

  const handlePhoto = (e:any)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const url = reader.result as string;
      setPhoto(url);
      const updated = { ...user, photo: url, avatar: url };
      setUser(updated);
      if(typeof window!=="undefined"){
        localStorage.setItem("wenze_user", JSON.stringify(updated));
        const all=readList("wenze_all_users");
        const idx=all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp)===cleanWa(user.ownerWhatsapp));
        if(idx>=0){ all[idx]=updated; localStorage.setItem("wenze_all_users", JSON.stringify(all)); }
      }
      setToast("Photo profil mise à jour ✅");
      setTimeout(()=>setToast(""),2500);
    };
    reader.readAsDataURL(file);
  };

  const handleInvite = ()=>{
    const waParrain=cleanWa(user.ownerWhatsapp||user.whatsapp);
    const codeParrainage = isAmbassadeur && user.ambassadorCode ? user.ambassadorCode.toUpperCase() : waParrain;
    if(!inviteNum || !inviteNom){ setToast("Numéro invité + nom obligatoire"); setTimeout(()=>setToast(""),3000); return; }
    const clean = (n:string)=> n.replace(/[^0-9]/g,"").replace(/^0+/,"");
    const invitation = { id: Date.now().toString(), parrainWa: waParrain, parrainNom: getBoutiqueIdentite(user), parrainType: isAmbassadeur ? "ambassadeur" : "boutique", codeParrainage, inviteWa: clean(inviteNum), inviteNom, typeCompteInvite: inviteType, status: "invité", date: new Date().toISOString() };
    const list=readList("wenze_invitations");
    list.push(invitation);
    if(typeof window!=="undefined") localStorage.setItem("wenze_invitations", JSON.stringify(list));
    const msg = `Salut ${inviteNom}! ${getBoutiqueIdentite(user)} t'invite à créer ton compte ${inviteType} sur WENZE WENZE BUSINESS. Inscris-toi: tonmarche.cd/inscription?invite=${clean(inviteNum)}&parrain=${waParrain}&code=${codeParrainage}&type=${inviteType} - Code: ${codeParrainage}`;
    window.open(`https://wa.me/${clean(inviteNum)}?text=${encodeURIComponent(msg)}`,"_blank");
    setInvitations([...invitations, invitation]);
    setToast(`Invitation ${inviteType} envoyée à ${inviteNom}`);
    setInviteNum(""); setInviteNom("");
    setTimeout(()=>setToast(""),4000);
  };

  const handleDelete=(id:string)=>{
    if(typeof window!=="undefined" && !confirm("Supprimer? Place libérée")) return;
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

  if(loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/></div>;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[16px] truncate">Mon Profil boutique {getNomCourtSansTautologie(user).slice(0,28)}...</h1>
          <p className="text-[10px] text-gray-500 truncate">Taux {TAUX_CDF} • {isAmbassadeur?`Ambassadeur ${user?.ambassadorCode}`:`Boutique`}</p>
        </div>
        <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${ab?.isPaye?"bg-black text-white":"bg-orange-100 text-orange-700"}`}>{ab?.badge||"Freemium"}</span>
      </header>

      <div className="p-4 space-y-4">
        {toast&&<div className="bg-black text-white p-3 rounded-xl text-[11px] font-bold text-center">{toast}</div>}

        <div className="bg-white border-2 border-black rounded-[24px] p-5">
          <div className="flex gap-4 items-start">
            <div className="relative shrink-0">
              <div className="w-20 h-20 bg-black text-white rounded-[20px] flex items-center justify-center font-black text-[26px] overflow-hidden border-2 border-black">
                {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : (user?.nomEtablissement||user?.nom||"W").slice(0,1).toUpperCase()}
              </div>
              <button onClick={()=> fileRef.current?.click()} className="absolute -bottom-2 -right-2 bg-white border-2 border-black w-7 h-7 rounded-full flex items-center justify-center text-[12px]">📷</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[16px] leading-[1.1] uppercase tracking-tight">{getBoutiqueIdentite(user)}</p>
              <p className="text-[11px] text-gray-600 mt-1 font-bold">WA 0{cleanWa(user?.ownerWhatsapp||user?.whatsapp||"").slice(-9)} • {annonces.length}/50 actives</p>
              <p className="text-[10px] mt-1.5 bg-black text-white inline-block px-2.5 py-1 rounded-full font-bold">{isAmbassadeur?`Code: ${user?.ambassadorCode} (20% fin mois)`:`Code: 0${cleanWa(user?.ownerWhatsapp||"").slice(-9)} (cadeaux)`}</p>
              <p className="text-[10px] mt-2 text-gray-500">{ab?.isPaye?`${ab.ticketsActifs?.length||0} tickets • ${ab.placesRestantes||0} places`:`${ab?.count||0}/3 Freemium`} • 0% commission</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/portefeuille" className="bg-black text-white rounded-full py-3 text-center text-[12px] font-black">💼 Portefeuille {totalCommission>0?`+${totalCommission}$`:''}</Link>
            <Link href="/boutiques" className="bg-white border-2 border-black rounded-full py-3 text-center text-[12px] font-black">🏬 Mes annonces</Link>
          </div>
          <button onClick={handleLogout} className="mt-2 w-full bg-gray-100 rounded-full py-2.5 text-[11px] font-bold">Deconnexion</button>
        </div>

        <div className="bg-white border-2 border-dashed rounded-2xl p-4">
          <p className="font-black text-[13px]">🎟️ Inviter - {isAmbassadeur?`Ambassadeur ${user?.ambassadorCode}`:getBoutiqueIdentite(user)}</p>
          <p className="text-[10px] text-gray-600 mt-1">{isAmbassadeur?`Tu es ambassadeur identifié par ton code ${user?.ambassadorCode}. Tu sollicites invitation boutique/client - 20% 1er abo.`:`Tu es boutique identifiée comme boutique. Tu invites quelqu'un au serveur avec ton numéro WhatsApp comme code parrainage - cadeaux plateforme.`}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={()=>setInviteType("boutique")} className={`px-4 py-2 rounded-full text-[11px] font-black border-2 ${inviteType==="boutique"?"bg-black text-white border-black":"bg-white"}`}>Boutique</button>
            <button onClick={()=>setInviteType("client")} className={`px-4 py-2 rounded-full text-[11px] font-black border-2 ${inviteType==="client"?"bg-black text-white border-black":"bg-white"}`}>Client</button>
          </div>
          <input value={inviteNum} onChange={e=>setInviteNum(e.target.value)} placeholder="Numéro invité Ex: 0825000000" className="w-full mt-3 border-2 rounded-full px-4 py-3 text-[12px] font-bold" />
          <input value={inviteNom} onChange={e=>setInviteNom(e.target.value)} placeholder="Nom invité - Il précisera ses coordonnées" className="w-full mt-2 border-2 rounded-full px-4 py-3 text-[12px]" />
          <button onClick={handleInvite} className="w-full mt-3 bg-[#25D366] text-white py-3.5 rounded-full font-black text-[12px]">Inviter via WhatsApp - {isAmbassadeur?user?.ambassadorCode:`0${cleanWa(user?.ownerWhatsapp||"").slice(-9)}`}</button>
          {invitations.length>0 && (
            <div className="mt-3 max-h-24 overflow-y-auto border rounded-xl divide-y">
              {invitations.slice(-3).reverse().map((inv:any)=>(
                <div key={inv.id} className="p-2 flex justify-between text-[10px]"><span>{inv.inviteNom} 0{inv.inviteWa.slice(-9)}</span><span className="font-bold">{inv.status}</span></div>
              ))}
            </div>
          )}
        </div>

        {isAmbassadeur && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black text-white rounded-2xl p-4">
              <p className="font-black text-[11px]">💰 Commission 20%</p>
              <p className="text-[22px] font-black mt-1">{totalCommission.toFixed(2)}$</p>
              <p className="text-[9px] text-white/60">{commissions.length} abo</p>
            </div>
            <div className="bg-white border-2 border-black rounded-2xl p-4">
              <p className="font-black text-[11px]">🎁 Cadeaux</p>
              <p className="text-[22px] font-black">{totalPointsCadeaux} pts</p>
              <p className="text-[9px] text-gray-600">{cadeaux.length} parrainages</p>
            </div>
          </div>
        )}

        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b">
            <p className="font-black text-[13px]">Mes annonces {annonces.length}/50</p>
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
                    <p className="text-[10px] text-gray-500">{a.prixUSD||a.prix}$ / {toCDFString(Number(a.prixUSD||a.prix||0))}</p>
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
