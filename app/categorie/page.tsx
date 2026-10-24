"use client";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { CATEGORIES_WENZE } from "@/lib/categories";

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const c: Record<string, number> = {};
      list.forEach((a:any)=>{
        const id = (a.categorieId || a.categorie || "").toLowerCase();
        // match avec id ou titreCourt
        const found = CATEGORIES_WENZE.find(cat => cat.id === id || cat.titreCourt.toLowerCase() === id || cat.titre.toLowerCase().includes(id));
        const key = found ? found.id : id;
        c[key] = (c[key]||0)+1;
      });
      setCounts(c);
    }catch{}
  },[]);

  const filtered = useMemo(()=>{
    const q = search.toLowerCase();
    if(!q) return CATEGORIES_WENZE;
    return CATEGORIES_WENZE.filter(cat => 
      cat.titre.toLowerCase().includes(q) || 
      cat.titreCourt.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.activites.some(a=>a.label.toLowerCase().includes(q))
    );
  },[search]);

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-[#6C3CE0] leading-none">6 Métiers de Kinshasa</h1>
          <p className="text-[10px] text-gray-500">{CATEGORIES_WENZE.length} catégories • {Object.values(counts).reduce((a,b)=>a+b,0)} annonces</p>
        </div>
      </header>

      <div className="p-4">
        <div className="relative mb-4">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cherche: soudeur, coiffeur, ménage..." className="w-full bg-white border rounded-full py-3 px-5 pl-10 text-sm outline-none focus:border-[#6C3CE0]" />
          <span className="absolute left-3 top-3.5 text-sm">🔍</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filtered.map(cat => (
            <Link key={cat.id} href={`/categorie/${cat.id}`} className="bg-white border rounded-2xl p-4 flex items-center gap-4 hover:border-[#6C3CE0] hover:shadow-md transition">
              <div className="w-14 h-14 bg-[#FFFBF0] rounded-2xl flex items-center justify-center text-[28px]">{cat.icon}</div>
              <div className="flex-1">
                <p className="font-bold text-[13px]">{cat.numero} • {cat.titre}</p>
                <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{cat.description}</p>
                <div className="flex gap-2 mt-1.5">
                  <span className="text-[9px] bg-gray-100 px-2 py-1 rounded-full">{cat.activites.length} métiers</span>
                  {counts[cat.id] > 0 && <span className="text-[9px] bg-[#6C3CE0] text-white px-2 py-1 rounded-full">{counts[cat.id]} annonces</span>}
                </div>
              </div>
              <span className="text-[#6C3CE0]">→</span>
            </Link>
          ))}
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-3 text-[10px]">
        <Link href="/" className="flex flex-col items-center text-gray-400"><span className="text-base">🏠</span>Accueil</Link>
        <span className="flex flex-col items-center font-bold text-[#6C3CE0]"><span className="text-base">🏪</span>Catégories</span>
        <Link href="/publier" className="flex flex-col items-center text-gray-400"><span className="text-base">➕</span>Vendre</Link>
        <Link href="/profil" className="flex flex-col items-center text-gray-400"><span className="text-base">👤</span>Profil</Link>
      </nav>
    </div>
  );
}
export const dynamic = 'force-dynamic';
