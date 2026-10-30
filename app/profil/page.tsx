"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDFString, verifierAbonnement, PALIERS, isCompteCache, libererPlace } from "@/lib/paiement";

export const dynamic = "force-dynamic";
const DAY_MS = 86400000;
const cleanWa = (n: any) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const safeGet = (k:string)=>{ try{ return typeof window!=="undefined"?localStorage.getItem(k):null; }catch{return null;} };
const readList = (k:string):any[]=>{ try{ const raw=safeGet(k); if(!raw) return []; const v=JSON.parse(raw); return Array.isArray(v)?v:[]; }catch{return[];} };
const createdTime = (a:any)=>{ try{ return new Date(a.createdAt||a.created_at||a.updatedAt||0).getTime(); }catch{return 0;} };

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ab, setAb] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formCat, setFormCat] = useState<string>("commerces-services");
  const [toast, setToast] = useState("");

  useEffect(()=>{
    try{
      const raw=safeGet("wenze_user");
      if(!raw){ router.push("/connexion?next=/profil"); return; }
      const u=JSON.parse(raw);
      setUser(u);
      setFormCat(normalizeCategorie(u.categorieId||"commerces-services"));
      try{ setAb(verifierAbonnement()); }catch{}
      const list=readList("wenze_annonces_list");
      const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||u.id||"");
      const mine=list.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId||"")===wa).sort((a,b)=> createdTime(b)-createdTime(a));
      setAnnonces(mine);
    }catch(e){ console.log("profil V6",e); }
    finally{ setLoading(false); }
  },[router]);

  const formCatObj:any = useMemo(()=> getCategorieById(formCat)||{},[formCat]);
  const activites:any[] = formCatObj?.activites||[];

  const handleDelete=(id:string)=>{
    if(typeof window!=="undefined" && !confirm("Supprimer? Place liberee immediatement V6 Strict")) return;
    try{
      let list=readList("wenze_annonces_list");
      list=list.filter((a:any)=> String(a.id)!==String(id));
      if(typeof window!=="undefined") localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
      try{ libererPlace(id); }catch{}
      setAnnonces(prev=>prev.filter((a:any)=> String(a.id)!==String(id)));
      setToast("Supprime - place liberee ✅");
      setTimeout(()=> setToast(""),2500);
      if(typeof window!=="undefined") window.dispatchEvent(new Event("wenze-update"));
    }catch{ setToast("Erreur suppression"); }
  };

  const handleLogout=()=>{
    try{ if(typeof window!=="undefined"){ localStorage.removeItem("wenze_user"); } }catch{}
    router.push("/connexion");
  };

  if(loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-2">Profil V6...</p></div>;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[16px] truncate">Mon profil V6.5</h1>
          <p className="text-[10px] text-gray-500 truncate">{user?.nomEtablissement||user?.nom||"Boutique"} • {formCatObj?.icon||"🏬"} {formCatObj?.titreCourt||formCat} • Taux {TAUX_CDF}</p>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${ab?.isPaye?"bg-black text-white":ab?.isCache?"bg-red-600 text-white":"bg-orange-100 text-orange-700"}`}>{ab?.badge||"🆓"} {ab?.palierId||"Freemium"}</span>
      </header>

      <div className="p-4 space-y-4">
        {toast&&<div className="bg-black text-white p-3 rounded-xl text-[11px] font-bold text-center">{toast}</div>}

        <div className="bg-white border rounded-2xl p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-black text-[18px]">{(user?.nomEtablissement||user?.nom||"W").slice(0,1).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[13px] truncate">{user?.nomEtablissement||user?.nom}</p>
              <p className="text-[11px] text-gray-500 truncate">WA {cleanWa(user?.ownerWhatsapp||user?.whatsapp||"").slice(-9)} • {user?.commune||"Kinshasa"} • {annonces.length}/50 actives</p>
              <p className="text-[10px] mt-1">{ab?.isPaye?`✅ ${ab.ticketsActifs?.length||0} tickets • ${ab.placesRestantes||0} places libres`:`🆓 ${ab?.count||0}/3 Freemium - ${ab?.joursRestants||0}j`} • 0% comm</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/portefeuille" className="bg-black text-white rounded-full py-2.5 text-center text-[11px] font-black">💼 Portefeuille</Link>
            <Link href="/boutiques" className="bg-white border-2 border-black rounded-full py-2.5 text-center text-[11px] font-black">🏬 Mes annonces</Link>
          </div>
          <button onClick={handleLogout} className="mt-2 w-full bg-gray-100 rounded-full py-2.5 text-[11px] font-bold">Deconnexion</button>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">Changer categorie boutique</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CATEGORIES_WENZE.map((c:any)=>{
              const sel=formCat===c.id;
              return <button key={c.id} onClick={()=> setFormCat(c.id)} className={`p-3 rounded-xl border-2 text-left text-[11px] font-bold ${sel?"bg-black text-white border-black":"bg-white border-gray-200"}`}>{c.icon} {c.titreCourt}</button>;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {activites.map((a:any)=><span key={a.id} className="px-2.5 py-1 bg-gray-100 rounded-full text-[10px]">{a.titre||a.label}</span>)}
          </div>
        </div>

        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b">
            <p className="font-black text-[13px]">Mes annonces V6 - {annonces.length}/50 max - Suppression libere place</p>
            <Link href="/publier" className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black">+ Publier</Link>
          </div>
          {annonces.length===0?(
            <div className="p-8 text-center"><p className="text-3xl">📦</p><p className="text-[11px] mt-2 font-bold">Aucune annonce</p><p className="text-[10px] text-gray-500 mt-1">Max 50 actives - Taux {TAUX_CDF} - 0% comm</p></div>
          ):(
            <div className="divide-y">
              {annonces.map((a:any)=>(
                <div key={a.id} className="p-3 flex gap-3 items-center">
                  <div className="w-14 h-14 bg-[#FFFBF0] rounded-xl overflow-hidden flex items-center justify-center shrink-0 border">{a.photo?<img src={a.photo} alt="" className="w-full h-full object-cover"/>:<span>{getCategorieById(a.categorieId)?.icon||"📦"}</span>}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] truncate">{a.titre}</p>
                    <p className="text-[10px] text-gray-500">{a.prixUSD||a.prix}$ / {toCDFString(Number(a.prixUSD||a.prix||0))} • {a.palierId||"Freemium"} {a.ticketId?`🎫 ${a.ticketId.slice(-4)}`:""}</p>
                    <p className="text-[9px] text-gray-400">{new Date(a.createdAt||a.created_at||Date.now()).toLocaleDateString("fr-FR")} • {a.commune||"Kin"} • Max 50</p>
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

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/video" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🎥</span>Vidéo</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[22px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">+</span>Publier</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="font-black text-black flex flex-col items-center gap-0.5"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  );
            }
