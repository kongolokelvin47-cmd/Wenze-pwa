"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { getCategorieById, getActiviteById } from "@/lib/categories";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function ActivitePage() {
  const params = useParams();
  const catId = (params.slug as string)?.toLowerCase();
  const actSlug = (params.activite as string)?.toLowerCase();
  const cat = getCategorieById(catId);
  const act = cat ? getActiviteById(catId, actSlug) : null;
  const [allAnnonces, setAllAnnonces] = useState<any[]>([]);
  const [tri, setTri] = useState<"recent"|"prix">("recent");

  useEffect(()=>{
    try { setAllAnnonces(JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]")); } catch {}
  },[]);

  // ✅ LES 2 AU MEME REGIME QUE PRESTATAIRES - pas de distinction
  const isPrestataireRegime = true; // Tous au même régime Pro 5$
  const isSpecialDisplay = actSlug === "soudeur" || actSlug === "tout-travaux-techniques";

  const filtered = useMemo(()=>{
    if(!cat) return [];
    return allAnnonces.filter((a:any)=>{
      const catField = (a.categorieId || a.categorie || "").toLowerCase();
      const actField = (a.activiteId || a.activite || "").toLowerCase();
      const matchCat = catField === cat.id || catField.includes(cat.id) || catField.includes(cat.titreCourt.toLowerCase());
      if(!matchCat) return false;
      // Si on est dans soudeur ou tout travaux, on affiche TOUT le technique = même régime prestataire
      if(isSpecialDisplay) return true;
      return actField === actSlug || actField.includes(actSlug);
    }).sort((a,b)=>{
      if(tri==="prix") return (a.prix||0) - (b.prix||0);
      return new Date(b.createdAt||b.date||0).getTime() - new Date(a.createdAt||a.date||0).getTime();
    });
  },[allAnnonces, catId, actSlug, cat, isSpecialDisplay, tri]);

  const getWaLink = (p:any)=>{
    const num = cleanWhatsapp(p.ownerWhatsapp || p.whatsapp);
    return num ? `https://wa.me/${num}?text=${encodeURIComponent(`Bonjour ${p.user||''} 👋 WENZE Prestataire ${act?.label} "${p.titre}" ${p.prix}$`)}` : "#";
  };

  if(!cat) return <div className="p-8 text-center"><Link href="/categorie" className="text-[#6C3CE0]">Retour</Link></div>;
  if(!act) return <div className="p-8 text-center"><Link href={`/categorie/${catId}`} className="text-[#6C3CE0]">Retour {cat.titreCourt}</Link></div>;

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href={`/categorie/${catId}`} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[13px]">{cat.icon} {act.label} <span className="text-[8px] bg-[#6C3CE0] text-white px-2 py-0.5 rounded-full ml-1">PRESTATAIRE</span></h1>
            <p className="text-[10px] text-gray-500">{filtered.length} prestataires • Régime prestataire unique 5$/mois • {cat.titreCourt}</p>
          </div>
          <Link href={`/publier?categorie=${catId}&activite=${actSlug}`} className="bg-[#6C3CE0] text-white text-[10px] font-bold px-3 py-2 rounded-full">Publier +</Link>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={()=>setTri("recent")} className={`text-[10px] px-3 py-1.5 rounded-full font-bold ${tri==="recent" ? "bg-[#6C3CE0] text-white" : "bg-gray-100"}`}>Récents</button>
          <button onClick={()=>setTri("prix")} className={`text-[10px] px-3 py-1.5 rounded-full font-bold ${tri==="prix" ? "bg-[#6C3CE0] text-white" : "bg-gray-100"}`}>Prix</button>
          <span className="text-[9px] bg-[#00C950]/10 text-[#00C950] px-3 py-1.5 rounded-full font-bold">Même régime que prestataires</span>
        </div>
      </header>

      <div className="p-4">
        <div className="bg-white border rounded-xl p-3 mb-4 text-[11px]">
          <b className="text-[#6C3CE0]">Régime:</b> Prestataire unique - Pro 5$ / 11500 CDF - Soudeur + Tout travaux = même régime que tous les prestataires
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">{cat.icon}</p>
            <p className="font-black mt-2">Pas encore de {act.label}</p>
            <p className="text-[11px] text-gray-500 mt-1">Même régime prestataire 5$ - Sois le premier {act.label}</p>
            <Link href={`/publier?categorie=${catId}&activite=${actSlug}`} className="mt-4 inline-block bg-[#6C3CE0] text-white text-xs font-bold px-6 py-3 rounded-full">Publier ➕</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p:any)=>(
              <div key={p.id} className="bg-white border rounded-2xl overflow-hidden flex flex-col">
                <Link href={`/produit/${p.id}`} className="aspect-[4/3] flex items-center justify-center relative bg-white overflow-hidden">
                  {p.photo ? <img src={p.photo} className="max-w-full max-h-full object-contain"/> : <span>📦</span>}
                  <span className="absolute top-2 right-2 bg-black/70 text-white text-[8px] px-2 py-1 rounded-full">🔒 {cleanWhatsapp(p.ownerWhatsapp||p.whatsapp).slice(-4)}</span>
                </Link>
                <div className="p-2.5">
                  <p className="font-bold text-[#6C3CE0] text-[12px]">{p.prix}$</p>
                  <p className="text-[11px] font-semibold line-clamp-2 h-7">{p.titre}</p>
                  <p className="text-[9px] text-gray-400">👤 {p.user} • Prestataire Pro</p>
                  <a href={getWaLink(p)} target="_blank" className="mt-2 w-full bg-[#00C950] text-white text-[10px] font-bold py-2.5 rounded-full flex justify-center">💬 WhatsApp</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
