"use client";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { CATEGORIES_WENZE, normalizeCategorie, getPrixByCategorie, getCategorieById } from "@/lib/categories";
import { PALIERS, TAUX_CDF, toCDFString } from "@/lib/paiement";

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countsPayes, setCountsPayes] = useState<Record<string, number>>({});

  useEffect(()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const allUsersRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : [];
      const userMap = new Map<string, any>();
      for(const u of allUsers){
        const wa = (u.ownerWhatsapp||u.whatsapp||"").toString().replace(/[^0-9]/g,"");
        if(wa) userMap.set(wa, u);
      }

      const c: Record<string, number> = {};
      const cPaye: Record<string, number> = {};

      // V6: fonction check si compte caché
      const isCacheForAnnonce = (a:any)=>{
        try{
          const wa = (a.ownerWhatsapp||a.whatsapp||a.userId||"").toString().replace(/[^0-9]/g,"");
          const user = userMap.get(wa) || { ownerWhatsapp: wa, whatsapp: wa, createdAt: a.createdAt, id: wa };
          const { isCompteCache } = require("@/lib/paiement");
          if(typeof isCompteCache==="function"){
            return isCompteCache(user);
          }
          return false;
        }catch{ return false; }
      };

      const isPayeForAnnonce = (a:any)=>{
        try{
          const wa = (a.ownerWhatsapp||a.whatsapp||"").toString().replace(/[^0-9]/g,"");
          const user = userMap.get(wa) || { ownerWhatsapp: wa, whatsapp: wa, createdAt: a.createdAt, id: wa };
          const { checkFreemiumWenze } = require("@/lib/paiement");
          const ab = checkFreemiumWenze(user, 0);
          return !!ab.isPaye;
        }catch{ return false; }
      };

      list.forEach((a:any)=>{
        if(isCacheForAnnonce(a)) return; // V6: ne compte pas cachés
        const id = normalizeCategorie(a.categorieId || a.categorie || "commerces-services");
        c[id] = (c[id]||0)+1;
        if(isPayeForAnnonce(a)){
          cPaye[id] = (cPaye[id]||0)+1;
        }
      });

      // Compat: compte aussi pour groupe parent
      for(const cat of CATEGORIES_WENZE){
        const norm = normalizeCategorie(cat.id);
        if(c[norm]){
          const groupe = (cat as any).groupe || "commerces-services";
          c[groupe] = (c[groupe]||0)+c[norm];
        }
      }

      setCounts(c);
      setCountsPayes(cPaye);
    }catch(e){ console.error("counts V6 error", e); }
  },[]);

  const filtered = useMemo(()=>{
    const q = search.toLowerCase().trim();
    if(!q) return CATEGORIES_WENZE;
    return CATEGORIES_WENZE.filter(cat => 
      cat.id.toLowerCase().includes(q) ||
      cat.titre.toLowerCase().includes(q) || 
      (cat as any).description?.toLowerCase().includes(q) ||
      (cat as any).keywords?.some((k:string)=> k.toLowerCase().includes(q))
    );
  },[search]);

  const grouped = useMemo(()=>{
    const g: Record<string, typeof CATEGORIES_WENZE> = {};
    for(const cat of filtered){
      const groupe = (cat as any).groupe || (cat.id.includes("gros")||cat.id.includes("agro") ? "gros-autres" : "commerces-services");
      if(!g[groupe]) g[groupe]=[];
      g[groupe].push(cat);
    }
    return g;
  },[filtered]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 bg-white border-b p-3">
        <div className="flex items-center gap-2 mb-3">
          <Link href="/" className="p-2 rounded-full bg-gray-100">←</Link>
          <h1 className="font-bold text-lg">Catégories V6</h1>
          <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full">Cachés filtrés - Même prix</span>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Recherche catégorie... V6 ownerWhatsapp filtré" className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
        <div className="mt-2 text-[10px] text-gray-500 bg-orange-50 p-2 rounded-xl">
          V6 Modèle: <b>Même prix pour tous</b> - STANDARD 5$ (4 places strictes) / PRO 10$ (10 places) / PREMIUM 20$ (30 places) - 1 ticket = X places sur Y jours (pas X/j) - Cumulable - Suppression libère place - Max 50 - Taux {TAUX_CDF} - 0% comm - Counts sans comptes cachés 🔒
        </div>
      </div>

      <div className="p-3 space-y-6">
        {Object.entries(grouped).map(([groupe, cats])=>(
          <div key={groupe}>
            <h2 className="font-bold text-sm mb-2 uppercase tracking-wider text-gray-600">{groupe} - {cats.length} catégories - Même tarif</h2>
            <div className="grid grid-cols-2 gap-3">
              {cats.map((cat:any)=>{
                const norm = normalizeCategorie(cat.id);
                const count = counts[norm]||0;
                const countPaye = countsPayes[norm]||0;
                const prixInfo = getPrixByCategorie(cat.id); // V6: retourne même prix 5$ pour compat
                return (
                  <Link key={cat.id} href={`/categorie/${cat.id}`} className="bg-white rounded-2xl border p-3 hover:shadow-md transition relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div className="text-2xl">{cat.icone||cat.icon||"📦"}</div>
                      <div className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded-full">5$ même prix</div>
                    </div>
                    <div className="font-bold text-sm mt-2 line-clamp-1">{cat.titre}</div>
                    <div className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{cat.description||""}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-full">{count} annonces</span>
                      {countPaye>0 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">⭐ {countPaye} payées</span>}
                    </div>
                    <div className="text-[9px] text-gray-400 mt-1">STANDARD 5$={toCDFString(5)} - PRO 10$ - PREMIUM 20$ - Taux {TAUX_CDF} - Max 50</div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length===0 && (
          <div className="text-center py-10 text-sm text-gray-500">
            Aucune catégorie trouvée V6<br/>
            <span className="text-[11px]">Recherche par id, titre, description - Comptes cachés filtrés</span>
          </div>
        )}

        {/* Footer prix même pour tous */}
        <div className="bg-white rounded-2xl border p-4">
          <h3 className="font-bold text-sm mb-2">💰 V6 Tarifs uniques - Même prix Détail/Gros/Presta</h3>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="bg-orange-50 p-2 rounded-xl"><b>⭐ STANDARD</b><br/>1j 0.5$<br/>7j 2.5$<br/>30j 5$ = {toCDFString(5)}<br/>4 places strictes<br/>1 vidéo 15s</div>
            <div className="bg-blue-50 p-2 rounded-xl"><b>🚀 PRO</b><br/>1j 1$<br/>7j 5$<br/>30j 10$ = {toCDFString(10)}<br/>10 places strictes<br/>1 vidéo 60s</div>
            <div className="bg-purple-50 p-2 rounded-xl"><b>👑 PREMIUM</b><br/>1j 1.5$<br/>7j 10$<br/>30j 20$ = {toCDFString(20)}<br/>30 places strictes<br/>2 vidéos 60s</div>
          </div>
          <div className="text-[10px] text-gray-500 mt-2">1 ticket = X places sur Y jours (pas X/j) - Cumulable, renouvelable, suppression libère place - Max 50 actives - 0% commission - Taux {TAUX_CDF} - 🎟️ Occasionnel 0.2$/j 1 place stricte</div>
        </div>
      </div>
    </div>
  );
                      }
