"use client";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { CATEGORIES_WENZE, normalizeCategorie, getPrixByCategorie, getCategorieById } from "@/lib/categories";
import { TAUX_CDF } from "@/lib/paiement";

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const c: Record<string, number> = {};
      list.forEach((a:any)=>{
        const id = normalizeCategorie(a.categorieId || a.categorie || "commerces-services");
        c[id] = (c[id]||0)+1;
      });
      setCounts(c);
    }catch{}
  },[]);

  const filtered = useMemo(()=>{
    const q = search.toLowerCase().trim();
    if(!q) return CATEGORIES_WENZE;
    return CATEGORIES_WENZE.filter(cat => 
      cat.id.toLowerCase().includes(q) ||
      cat.titre.toLowerCase().includes(q) || 
      cat.titreCourt.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.regime.toLowerCase().includes(q) ||
      cat.activites.some(a=>a.label.toLowerCase().includes(q))
    );
  },[search]);

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-[#6C3CE0] leading-none">2 Catégories WENZE 2.0</h1>
          <p className="text-[10px] text-gray-500">🛍️ 5$ • 🏭 10$ • {Object.values(counts).reduce((a,b)=>a+b,0)} annonces • Taux {TAUX_CDF} CDF • 0% comm</p>
        </div>
        <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full font-black">Taux {TAUX_CDF}</span>
      </header>

      <div className="p-4">
        <div className="relative mb-4">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cherche: détail, électricité, maçon, gros, import, production..." className="w-full bg-white border-2 rounded-full py-3 px-5 pl-10 text-sm outline-none focus:border-[#6C3CE0]" />
          <span className="absolute left-3 top-3.5 text-sm">🔍</span>
        </div>

        <div className="bg-black text-white rounded-xl p-3 mb-4 flex justify-between items-center">
          <div>
            <p className="font-black text-[12px]">🛍️ Petites activités 5$ • 🏭 Gros & autres 10$</p>
            <p className="text-[10px] opacity-70">Électricité, maçon, soudeur, coiffure = 5$ même régime - Gros/production/import = 10$</p>
          </div>
          <span className="bg-white text-black text-[9px] px-2 py-1 rounded-full font-black">0% comm</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filtered.map(cat => {
            const prix = getPrixByCategorie(cat.id);
            return (
              <Link key={cat.id} href={`/categorie/${cat.id}`} className={`border-2 rounded-2xl p-5 flex flex-col gap-2 hover:shadow-md transition active:scale-[0.98] ${cat.id==="gros-autres"?"bg-black text-white border-black":"bg-white border-[#6C3CE0]/30 hover:border-[#6C3CE0]"}`}>
                <div className="flex justify-between items-start">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[30px] ${cat.id==="gros-autres"?"bg-white/20":"bg-[#FFFBF0]"}`}>{cat.icon}</div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[11px] font-black px-3 py-1 rounded-full ${cat.id==="gros-autres"?"bg-white text-black":"bg-black text-white"}`}>{prix.prixUSD}$ / {prix.prixCDF.toLocaleString()} CDF / mois</span>
                    {counts[cat.id] > 0 && <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${cat.id==="gros-autres"?"bg-white/20 text-white":"bg-[#6C3CE0] text-white"}`}>{counts[cat.id]} annonces</span>}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-black text-[16px]">{cat.icon} {cat.titre}</p>
                  <p className={`text-[12px] leading-tight mt-1 ${cat.id==="gros-autres"?"text-white/70":"text-gray-500"}`}>{cat.description}</p>
                  <p className={`text-[10px] mt-1 font-bold ${cat.id==="gros-autres"?"text-white/50":"text-gray-400"}`}>{cat.regime} • Taux {TAUX_CDF} • 0% commission</p>
                  <div className="flex gap-1 flex-wrap mt-2">
                    {cat.activites.slice(0,6).map((a:any)=> <span key={a.id} className={`text-[9px] px-2 py-1 rounded-full font-bold ${cat.id==="gros-autres"?"bg-white/20":"bg-gray-100"}`}>{a.label}</span>)}
                    {cat.activites.length > 6 && <span className={`text-[9px] px-2 py-1 rounded-full ${cat.id==="gros-autres"?"bg-white/10":"bg-black text-white"}`}>+{cat.activites.length-6} autres</span>}
                  </div>
                </div>
                <div className={`mt-2 rounded-xl p-3 text-[11px] font-black flex justify-between items-center ${cat.id==="gros-autres"?"bg-white text-black":"bg-[#6C3CE0] text-white"}`}>
                  <span>Voir {cat.titreCourt} →</span>
                  <span className="text-[10px] opacity-70">{prix.prixUSD}$</span>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length===0 && (
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center mt-4">
            <p className="text-3xl">🔍</p>
            <p className="font-bold text-[13px] mt-2">Pas de catégorie pour "{search}"</p>
            <p className="text-[11px] text-gray-500">2 catégories: 🛍️ Commerces & Services 5$ et 🏭 Gros & autres 10$</p>
          </div>
        )}

        <div className="mt-6 bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">WENZE 2.0 - Explication</p>
          <div className="text-[11px] text-gray-600 mt-2 space-y-2">
            <p>🛍️ <b>Commerces & Services 5$ / 11 500 CDF / mois:</b> Détail, alimentation, service, électricité, maçonnerie, soudeur, plomberie, coiffure, couture, restauration, réparation - toutes petites activités même prix 5$.</p>
            <p>🏭 <b>Gros & autres 10$ / 23 000 CDF / mois:</b> Grossiste, semi-gros, import-export, distribution, production locale, usine, B2B, gros volume.</p>
            <p className="text-[10px] text-gray-400">Taux fixe {TAUX_CDF} CDF • 0% commission sur ventes • Boutique visible /boutiques après paiement</p>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-3 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center text-gray-400"><span className="text-base">🏠</span>Accueil</Link>
        <span className="flex flex-col items-center font-bold text-[#6C3CE0]"><span className="text-base">🏪</span>Catégories</span>
        <Link href="/publier" className="flex flex-col items-center text-gray-400"><span className="text-base">➕</span>Vendre</Link>
        <Link href="/boutiques" className="flex flex-col items-center text-gray-400"><span className="text-base">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center text-gray-400"><span className="text-base">👤</span>Profil</Link>
      </nav>
    </div>
  );
}
export const dynamic = 'force-dynamic';
