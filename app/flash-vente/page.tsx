"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TAUX_CDF, toCDFString } from "@/lib/paiement";

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

function getTimeLeft(expireAt:string){
  const diff = new Date(expireAt).getTime() - Date.now();
  if(diff<=0) return { expired:true, text:"Expiré", h:0,m:0,s:0 };
  const h = Math.floor(diff/3600000);
  const m = Math.floor((diff%3600000)/60000);
  const s = Math.floor((diff%60000)/1000);
  return { expired:false, text:`${h}h ${m}m ${s}s`, h,m,s, diff };
}

export default function FlashVentePage() {
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(()=>{
    const id = setInterval(()=> setNow(Date.now()), 1000);
    return ()=> clearInterval(id);
  },[]);

  useEffect(()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const allUsersRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : [];
      const userMap = new Map<string, any>();
      for(const u of allUsers){
        const wa = cleanWa(u.ownerWhatsapp||u.whatsapp||"");
        if(wa) userMap.set(wa, u);
      }

      // V6: Flash = annonces qui ont flash=true ou promotion ou -20% ou créées <48h + payées
      let flash = list.filter((a:any)=> a.isFlash || a.flash || a.promotion || a.remise || (Date.now()-new Date(a.createdAt).getTime()<48*3600000));

      // Si pas de flag flash, prends les payées récentes comme flash par défaut V6 pour remplir page
      if(flash.length===0){
        flash = list.slice(0,20);
      }

      // V6 CRITIQUE: Filtre comptes cachés
      try{
        const { isCompteCache, checkFreemiumWenze } = require("@/lib/paiement");
        flash = flash.filter((a:any)=>{
          const wa = cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId||"");
          const user = userMap.get(wa) || { ownerWhatsapp: wa, whatsapp: wa, createdAt: a.createdAt, id: wa };
          if(typeof isCompteCache==="function" && isCompteCache(user)) return false;
          return true;
        });

        flash = flash.map((a:any)=>{
          try{
            const wa = cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId||"");
            const user = userMap.get(wa) || { ownerWhatsapp: wa, whatsapp: wa, createdAt: a.createdAt, id: wa };
            const ab = checkFreemiumWenze(user, 0);
            // Flash expire = expire du ticket ou +24h si freemium
            const expireAt = ab.isPaye ? ab.expireAt || new Date(Date.now()+24*3600000).toISOString() : new Date(new Date(a.createdAt).getTime()+24*3600000).toISOString();
            return { ...a, _isPaye: !!ab.isPaye, _badge: ab.badge, _palierId: ab.palierId, _expireAt: expireAt, _timeLeft: getTimeLeft(expireAt) };
          }catch{ return { ...a, _isPaye:false, _badge:"🆓", _expireAt: new Date(Date.now()+24*3600000).toISOString() }; }
        });

        flash.sort((a:any,b:any)=>{
          if(a._isPaye && !b._isPaye) return -1;
          if(!a._isPaye && b._isPaye) return 1;
          return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();
        });

      }catch{}

      setAnnonces(flash);
    }catch(e){ console.error("flash V6 error", e); }
  },[now]);

  const filtered = useMemo(()=>{
    if(!search.trim()) return annonces;
    const q = search.toLowerCase();
    return annonces.filter((a:any)=> (a.titre||a.title||"").toLowerCase().includes(q) || (a.description||"").toLowerCase().includes(q));
  },[annonces, search]);

  return (
    <div className="min-h-screen bg-[#FFFBF0] pb-20">
      <div className="sticky top-0 z-10 bg-black text-white p-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-2 rounded-full bg-white/20">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-lg">⚡ Flash Vente V6</h1>
            <p className="text-[11px] opacity-70">Comptes cachés filtrés • Payés d'abord • 1 ticket = X places strictes sur Y jours • Même prix</p>
          </div>
          <span className="text-[10px] bg-white text-black px-2 py-1 rounded-full font-bold">{filtered.length} flash</span>
        </div>
        <div className="mt-3 flex gap-2">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Recherche flash... V6" className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <Link href="/publier" className="bg-white text-black px-4 py-2 rounded-xl text-xs font-black">+ Publier Flash</Link>
        </div>
        <div className="mt-2 text-[9px] opacity-60 bg-white/10 p-2 rounded-xl">
          V6: Flash = annonces -20% ou promotion ou &lt;48h • STANDARD 5$ ({toCDFString(5)}) 4 places strictes • PRO 10$ 10 places • PREMIUM 20$ 30 places • Taux {TAUX_CDF} • Max 50 • Suppression libère place • 0% comm
        </div>
      </div>

      <div className="p-3 grid grid-cols-2 gap-3">
        {filtered.map((a:any)=>{
          const tl = a._timeLeft || getTimeLeft(a._expireAt);
          return (
            <Link key={a.id||a.annonceId} href={`/produit/${a.id||a.annonceId}`} className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition relative">
              <div className="aspect-square bg-gray-100 relative">
                {a.images?.[0] ? <img src={a.images[0]} alt={a.titre} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">IMG</div>}
                <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full animate-pulse">⚡ FLASH {tl.expired?"EXPIRÉ":tl.text}</div>
                <div className="absolute top-1.5 right-1.5 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded-full backdrop-blur">{a._badge||"🆓"} {a._palierId||""}</div>
                {a.prixAncien && <div className="absolute bottom-1.5 left-1.5 bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">-20%</div>}
              </div>
              <div className="p-2">
                <div className="font-bold text-xs line-clamp-2">{a.titre||a.title}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[12px] font-black text-red-600">{Number(a.prix||a.prixUSD||0)}$</span>
                  {a.prixAncien && <span className="text-[10px] line-through text-gray-400">{a.prixAncien}$</span>}
                  <span className="text-[9px] text-gray-400">/ {toCDFString(Number(a.prix||0))}</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">{cleanWa(a.ownerWhatsapp||a.whatsapp||"").slice(-9)} • {a._isPaye?"⭐ Payé":"🆓 Freemium"}</div>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-red-600" style={{ width: `${tl.expired?0: Math.max(5, 100 - (tl.diff ? (24*3600000 - tl.diff)/(24*3600000)*100 : 50))}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length===0 && (
        <div className="text-center py-16 p-4">
          <div className="text-5xl mb-3">⚡</div>
          <div className="font-black">Aucun flash vente visible V6</div>
          <div className="text-[11px] text-gray-500 mt-2">Les comptes cachés 🔒 (Freemium 30j expiré + 0 ticket) sont filtrés • Active ton ticket STANDARD 5$ pour apparaître en flash • 4 places strictes sur 7j • Même prix Détail/Gros/Presta</div>
          <Link href="/publier" className="inline-block mt-4 bg-black text-white px-6 py-3 rounded-xl text-sm font-black">Publier Flash - 0.2$/j OCC</Link>
        </div>
      )}
    </div>
  );
                                           }
