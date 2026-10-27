"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { getCategorieById, normalizeCategorie, getPrixByCategorie, CATEGORIES_WENZE } from "@/lib/categories";
import { TAUX_CDF, toCDF } from "@/lib/paiement";

function cleanWa(n: string){ return (n||"").toString().replace(/[^0-9]/g,""); }
function formatPrix(p:any){
  const usd = Number(p.prix) || 0;
  if(p.prixCDF) return `${p.prixCDF.toLocaleString("fr-FR")} CDF`;
  return `${usd}$ / ${toCDF(usd).toLocaleString("fr-FR")} CDF`;
}

export default function CategorieSlugPage() {
  const params = useParams();
  const rawSlug = (params.slug as string)?.toLowerCase();
  const slug = normalizeCategorie(rawSlug); // ✅ FIX: ancien soudeur/commerce → commerces-services
  const cat = getCategorieById(slug);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      // ✅ FIX WENZE 2.0: filtre exact par normalizeCategorie, pas includes
      const filtered = list.filter((a:any)=>{
        const c = normalizeCategorie(a.categorieId || a.categorie || "");
        return c === slug;
      });
      filtered.sort((a:any,b:any)=> new Date(b.createdAt||b.date).getTime() - new Date(a.createdAt||a.date).getTime());
      setAnnonces(filtered);
    }catch{}
  },[slug]);

  const prixInfo = useMemo(()=> cat ? getPrixByCategorie(cat.id) : { prixUSD: 5, prixCDF: 11500, label: "🛍️ Commerces & Services" }, [cat]);

  const filteredAnnonces = useMemo(()=>{
    const q = search.toLowerCase().trim();
    if(!q) return annonces;
    return annonces.filter((a:any)=> (a.titre||"").toLowerCase().includes(q) || (a.description||"").toLowerCase().includes(q) || (a.user||"").toLowerCase().includes(q));
  }, [annonces, search]);

  if(!cat){
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-center">
        <p className="text-4xl mt-10">📁</p>
        <p className="font-black mt-4">Catégorie introuvable - {rawSlug}</p>
        <p className="text-[11px] text-gray-500 mt-2">WENZE 2.0: {CATEGORIES_WENZE.map(c=> `${c.icon} ${c.titre} ${c.prixUSD}$`).join(" • ")}</p>
        <div className="mt-6 grid gap-2">
          {CATEGORIES_WENZE.map((c:any)=> <Link key={c.id} href={`/categorie/${c.id}`} className={`p-4 rounded-xl font-bold text-[13px] ${c.id==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{c.icon} {c.titre} - {c.prixUSD}$</Link>)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/categories" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[15px]">{cat.icon} {cat.titre}</h1>
            <p className="text-[10px] text-gray-500">{cat.description} • {annonces.length} annonces • {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF • Taux {TAUX_CDF}</p>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-full font-black ${cat.id==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixInfo.prixUSD}$</span>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={e=> setSearch(e.target.value)} placeholder={`Recherche dans ${cat.titreCourt}...`} className="w-full bg-gray-100 rounded-full py-3 px-5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
          <span className="absolute left-3 top-3.5">🔍</span>
        </div>
      </header>

      <div className="p-4">
        <div className={`rounded-2xl p-4 border-2 ${cat.id==="gros-autres"?"bg-black text-white border-black":"bg-[#6C3CE0] text-white border-[#6C3CE0]"}`}>
          <div className="flex justify-between items-center">
            <div><p className="font-black text-[14px]">{cat.icon} {cat.titre}</p><p className="text-[11px] opacity-80 mt-1">{cat.description} • {cat.regime} • Taux {TAUX_CDF}</p></div>
            <span className="bg-white text-black text-[11px] px-3 py-1 rounded-full font-black">{prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF</span>
          </div>
          <div className="mt-3 flex gap-1 flex-wrap">
            {cat.activites.map((a:any)=> <span key={a.id} className="text-[9px] bg-white/20 px-2 py-1 rounded-full font-bold">{a.label}</span>)}
          </div>
        </div>

        {filteredAnnonces.length===0 ? (
          <div className="mt-6 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">{cat.icon}</p>
            <p className="font-black mt-2 text-[13px]">{search ? `Pas de résultat pour "${search}"` : `Pas encore d'annonces en ${cat.titre}`}</p>
            <p className="text-[11px] text-gray-500 mt-1">Sois le premier - {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF} - 0% commission</p>
            <Link href={`/publier?categorie=${cat.id}`} className={`mt-4 inline-block text-white px-6 py-3 rounded-full font-bold text-[12px] ${cat.id==="gros-autres"?"bg-black":"bg-[#6C3CE0]"}`}>Publier en {cat.titreCourt} {prixInfo.prixUSD}$</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {filteredAnnonces.map((p:any)=> (
              <div key={p.id} className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                <Link href={`/produit/${p.id}`} className="block w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden relative">
                  {p.photo ? <img src={p.photo} alt={p.titre} className="max-w-full max-h-full object-contain"/> : <span className="text-3xl">{cat.icon}</span>}
                  <span className={`absolute top-2 right-2 text-[7px] px-1.5 py-0.5 rounded-full font-bold ${cat.id==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixInfo.prixUSD}$</span>
                  {p.boost && <span className="absolute top-2 left-2 bg-[#6C3CE0] text-white text-[7px] px-1.5 py-0.5 rounded-full font-bold">BOOST</span>}
                </Link>
                <div className="p-2.5">
                  <p className="font-bold text-[#6C3CE0] text-[13px] truncate">{formatPrix(p)}</p>
                  <Link href={`/produit/${p.id}`}><p className="text-[11px] font-semibold truncate hover:text-[#6C3CE0]">{p.titre}</p></Link>
                  <p className="text-[9px] text-gray-400 truncate">👤 {p.user} • {cat.titreCourt}</p>
                  <a href={`https://wa.me/${cleanWa(p.ownerWhatsapp||p.whatsapp)}?text=${encodeURIComponent(`Bonjour ${p.user} 👋 WENZE - "${p.titre}" à ${formatPrix(p)} - Taux ${TAUX_CDF}`)}`} target="_blank" className="mt-2 w-full bg-[#00C950] text-white text-[11px] font-bold py-2.5 rounded-full flex justify-center">💬 WhatsApp</a>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/categories" className="mt-6 block bg-white border p-3 rounded-xl text-center font-bold text-[12px]">← Voir les {CATEGORIES_WENZE.length} catégories - 🛍️ 5$ • 🏭 10$ - Taux {TAUX_CDF}</Link>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
