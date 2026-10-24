"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { getCategorieById } from "@/lib/categories";

export default function CategorieSlugPage() {
  const params = useParams();
  const slug = (params.slug as string)?.toLowerCase();
  const cat = getCategorieById(slug);
  const [annonces, setAnnonces] = useState<any[]>([]);

  useEffect(()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      setAnnonces(list.filter((a:any)=>{
        const c = (a.categorieId || a.categorie || "").toLowerCase();
        return c === slug || c.includes(slug) || cat?.titre.toLowerCase().includes(c) || c.includes(cat?.titreCourt.toLowerCase()||"");
      }));
    }catch{}
  },[slug, cat]);

  const isTechnique = cat?.id === "technique";
  const toutTravaux = cat?.activites.find(a=>a.slug==="tout-travaux-techniques");

  if (!cat) {
    return (
      <div className="max-w-[430px] mx-auto p-8 text-center bg-[#FFFBF0] min-h-screen">
        <p className="text-4xl">🛒</p>
        <p className="font-bold mt-2">Catégorie "{slug}" introuvable</p>
        <Link href="/categorie" className="mt-4 inline-block bg-[#6C3CE0] text-white px-6 py-2 rounded-full text-sm">← Retour catégories</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/categorie" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="w-10 h-10 bg-[#FFFBF0] rounded-xl flex items-center justify-center text-xl">{cat.icon}</div>
        <div className="flex-1">
          <h1 className="font-black text-[14px] leading-tight">{cat.titre}</h1>
          <p className="text-[10px] text-gray-500">{cat.description} • {annonces.length} annonces</p>
        </div>
        <Link href={`/publier?categorie=${cat.id}`} className="bg-[#6C3CE0] text-white text-[10px] font-bold px-3 py-1.5 rounded-full">Publier +</Link>
      </header>

      <div className="p-4">
        <h2 className="font-bold text-[13px] mb-3">Choisis ton métier ({cat.activites.length})</h2>
        <div className="grid grid-cols-1 gap-2">
          {cat.activites.map(act => {
            const isSpecial = act.slug === "tout-travaux-techniques";
            return (
              <Link key={act.slug} href={`/categorie/${cat.id}/${act.slug}`} className={`bg-white border rounded-xl p-3.5 flex justify-between items-center hover:border-[#6C3CE0] transition ${isSpecial ? 'border-[#6C3CE0] bg-[#6C3CE0]/5' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${isSpecial ? 'bg-[#6C3CE0] text-white' : 'bg-gray-100'}`}>{isSpecial ? '🔧' : '•'}</span>
                  <span className={`text-[13px] ${isSpecial ? 'font-black text-[#6C3CE0]' : 'font-semibold'}`}>{act.label}</span>
                </div>
                <span className="text-[#6C3CE0] text-xs">→</span>
              </Link>
            );
          })}
        </div>

        {isTechnique && toutTravaux && (
          <div className="mt-6 bg-gradient-to-br from-[#6C3CE0] to-[#3B1FA8] text-white rounded-2xl p-4">
            <p className="font-black text-[13px]">🔧 {toutTravaux.label} - Soudeur & plus</p>
            <p className="text-[11px] opacity-90 mt-1 leading-snug">Tu fais soudure, carrelage, vitrerie, aluminium, plomberie générale ? Publie dans <b>Tout travaux techniques</b>, les clients te trouvent même s'ils ne connaissent pas ton métier exact.</p>
            <div className="flex gap-2 mt-3">
              <Link href={`/categorie/${cat.id}/${toutTravaux.slug}`} className="bg-white text-[#6C3CE0] text-[11px] font-bold px-4 py-2 rounded-full">Voir les pros →</Link>
              <Link href={`/publier?categorie=${cat.id}&activite=${toutTravaux.slug}`} className="bg-black/20 text-white text-[11px] font-bold px-4 py-2 rounded-full">Publier service</Link>
            </div>
          </div>
        )}

        {annonces.length > 0 && (
          <div className="mt-6">
            <p className="font-bold text-[12px] mb-2">Dernières annonces dans {cat.titreCourt}</p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {annonces.slice(0,5).map((a:any)=>(
                <div key={a.id} className="min-w-[110px] bg-white border rounded-xl p-2 flex-shrink-0">
                  <div className="w-full h-16 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">{a.photo ? <img src={a.photo} className="max-w-full max-h-full object-contain"/> : <span>📦</span>}</div>
                  <p className="text-[10px] font-bold truncate mt-1">{a.titre}</p>
                  <p className="text-[9px] text-[#6C3CE0] font-bold">{a.prix}$</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
