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
    try {
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      setAllAnnonces(list);
    } catch {}
  },[]);

  const filtered = useMemo(()=>{
    if(!cat) return [];
    return allAnnonces.filter((a:any)=>{
      const catField = (a.categorieId || a.categorie || "").toLowerCase();
      const actField = (a.activiteId || a.activite || "").toLowerCase();
      
      const matchCat = catField === cat.id || catField.includes(cat.id) || catField.includes(cat.titreCourt.toLowerCase()) || cat.titre.toLowerCase().includes(catField);
      if(!matchCat) return false;

      if(actSlug === "tout-travaux-techniques"){
        // Tout travaux = affiche tout ce qui est dans technique + soudeur + carreleur etc
        return true; // On affiche tout de la catégorie technique quand on est dans tout travaux
      }
      return actField === actSlug || actField.includes(actSlug) || actSlug.includes(actField);
    }).sort((a,b)=>{
      if(tri==="prix") return (a.prix||0) - (b.prix||0);
      return new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime();
    });
  },[allAnnonces, catId, actSlug, cat, tri]);

  const getWaLink = (p:any)=>{
    const num = cleanWhatsapp(p.ownerWhatsapp || p.whatsapp);
    if(!num) return "#";
    const msg = `Bonjour ${p.user||''} 👋 WENZE - Je veux ton service ${act?.label} "${p.titre}" à ${p.prix}$ - Kinshasa`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  if(!cat) return <div className="p-8 text-center"><p>Catégorie introuvable</p><Link href="/categorie" className="text-[#6C3CE0]">Retour</Link></div>;
  if(!act) return <div className="p-8 text-center"><p>Activité "{actSlug}" introuvable dans {cat.titre}</p><Link href={`/categorie/${catId}`} className="text-[#6C3CE0]">Retour {cat.titreCourt}</Link></div>;

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href={`/categorie/${catId}`} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[13px]">{cat.icon} {act.label}</h1>
            <p className="text-[10px] text-gray-500">{cat.titreCourt} • {filtered.length} pros à Kinshasa</p>
          </div>
          <Link href={`/publier?categorie=${catId}&activite=${actSlug}`} className="bg-[#6C3CE0] text-white text-[10px] font-bold px-3 py-2 rounded-full">Publier +</Link>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={()=>setTri("recent")} className={`text-[10px] px-3 py-1.5 rounded-full font-bold ${tri==="recent" ? "bg-[#6C3CE0] text-white" : "bg-gray-100"}`}>Plus récents</button>
          <button onClick={()=>setTri("prix")} className={`text-[10px] px-3 py-1.5 rounded-full font-bold ${tri==="prix" ? "bg-[#6C3CE0] text-white" : "bg-gray-100"}`}>Prix bas → haut</button>
        </div>
      </header>

      <div className="p-4">
        {filtered.length === 0 ? (
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">{cat.icon}</p>
            <p className="font-black text-[14px] mt-2">Pas encore de {act.label}</p>
            <p className="text-[11px] text-gray-500 mt-1">Sois le premier {act.label} à Kinshasa sur WENZE. Les clients te trouveront ici.</p>
            <Link href={`/publier?categorie=${catId}&activite=${actSlug}`} className="mt-4 inline-block bg-[#6C3CE0] text-white text-xs font-bold px-6 py-3 rounded-full">Devenir {act.label} ➕</Link>
            {actSlug === "tout-travaux-techniques" && <p className="text-[10px] text-gray-400 mt-3">Inclut: Soudeur, Carreleur, Vitreur, Aluminium, Maçon, etc.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p:any)=>{
              const prixTxt = p.prixCDF ? `${Number(p.prixCDF).toLocaleString()} CDF` : `${p.prix}$`;
              return (
                <div key={p.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                  <Link href={`/produit/${p.id}`} className="w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden relative">
                    {p.photo ? <img src={p.photo} alt={p.titre} className="max-w-full max-h-full object-contain" /> : <span className="text-2xl">📦</span>}
                    <span className="absolute top-2 right-2 bg-black/70 text-white text-[8px] px-2 py-1 rounded-full">🔒 {cleanWhatsapp(p.ownerWhatsapp||p.whatsapp).slice(-4)}</span>
                    {actSlug === "tout-travaux-techniques" && <span className="absolute top-2 left-2 bg-[#6C3CE0] text-white text-[7px] px-1.5 py-0.5 rounded-full font-bold">TOUT TRAVAUX</span>}
                  </Link>
                  <div className="p-2.5 flex-1 flex flex-col">
                    <p className="font-bold text-[#6C3CE0] text-[12px] truncate">{prixTxt}</p>
                    <Link href={`/produit/${p.id}`}><p className="text-[11px] font-semibold leading-tight line-clamp-2 h-7">{p.titre}</p></Link>
                    <p className="text-[9px] text-gray-400 truncate mt-0.5">👤 {p.user||"Anonyme"} • {act.label}</p>
                    <a href={getWaLink(p)} target="_blank" rel="noopener noreferrer" className="mt-2 w-full bg-[#00C950] hover:bg-[#00b247] text-white text-[10px] font-bold py-2.5 rounded-full flex justify-center items-center gap-1">💬 WhatsApp</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
