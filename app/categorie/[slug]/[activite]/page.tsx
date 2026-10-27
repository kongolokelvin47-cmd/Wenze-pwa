"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { getCategorieById, getActiviteById, normalizeCategorie, getPrixByCategorie, CATEGORIES_WENZE } from "@/lib/categories";
import { TAUX_CDF, toCDF } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");
function formatPrix(p:any){
  const usd = Number(p.prix) || 0;
  return `${usd}$ / ${toCDF(usd).toLocaleString("fr-FR")} CDF`;
}

export default function ActivitePage() {
  const params = useParams();
  const rawCatId = (params.slug as string)?.toLowerCase();
  const actSlug = (params.activite as string)?.toLowerCase();
  
  // ✅ WENZE 2.0 - normalise ancien technique/commerce/beaute → commerces-services / gros-autres
  const catId = normalizeCategorie(rawCatId);
  const cat = getCategorieById(catId);
  const act = cat ? getActiviteById(cat.id, actSlug) : null;
  
  const [allAnnonces, setAllAnnonces] = useState<any[]>([]);
  const [tri, setTri] = useState<"recent"|"prix">("recent");
  const [search, setSearch] = useState("");

  useEffect(()=>{
    try { 
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      setAllAnnonces(list);
    } catch {}
  },[]);

  const prixInfo = useMemo(()=> cat ? getPrixByCategorie(cat.id) : { prixUSD: 5, prixCDF: 11500 }, [cat]);

  const filtered = useMemo(()=>{
    if(!cat) return [];
    // ✅ FIX: filtre exact categorie + activite (pas includes)
    let res = allAnnonces.filter((a:any)=>{
      const aCat = normalizeCategorie(a.categorieId || a.categorie || "");
      const aAct = (a.activiteId || a.activite || "").toLowerCase();
      if(aCat !== catId) return false;
      // Si activite demandée, filtre par activite, sinon montre tout de la catégorie
      if(actSlug && act){
        return aAct === act.id.toLowerCase() || aAct === act.slug.toLowerCase() || aAct.includes(actSlug);
      }
      return true;
    });
    
    if(search){
      const q = search.toLowerCase();
      res = res.filter((a:any)=> (a.titre||"").toLowerCase().includes(q) || (a.description||"").toLowerCase().includes(q));
    }
    
    if(tri==="prix"){
      res = [...res].sort((a,b)=> (a.prix||0)-(b.prix||0));
    } else {
      res = [...res].sort((a,b)=> new Date(b.createdAt||b.date).getTime() - new Date(a.createdAt||a.date).getTime());
    }
    return res;
  }, [allAnnonces, catId, actSlug, act, cat, tri, search]);

  if(!cat){
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-center">
        <p className="text-4xl mt-10">📁</p>
        <p className="font-black mt-4">Catégorie {rawCatId} introuvable</p>
        <p className="text-[11px] text-gray-500 mt-2">WENZE 2.0: 🛍️ Commerces-Services 5$ • 🏭 Gros-Autres 10$</p>
        <Link href="/categories" className="mt-6 inline-block bg-black text-white px-6 py-3 rounded-full font-bold text-[12px]">Voir 2 catégories</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-2">
          <Link href={`/categorie/${cat.id}`} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[14px] truncate">{cat.icon} {act ? act.label : cat.titre}</h1>
            <p className="text-[10px] text-gray-500 truncate">{cat.titre} • {act ? act.label : `${cat.activites.length} activités`} • {filtered.length} annonces • {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF • Taux {TAUX_CDF}</p>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-full font-black ${cat.id==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixInfo.prixUSD}$</span>
        </div>
        <div className="mt-3 flex gap-2">
          <div className="flex-1 relative">
            <input value={search} onChange={e=> setSearch(e.target.value)} placeholder={`Recherche ${act?.label || cat.titreCourt}...`} className="w-full bg-gray-100 rounded-full py-2.5 px-4 pl-9 text-sm outline-none" />
            <span className="absolute left-3 top-3 text-xs">🔍</span>
          </div>
          <button onClick={()=> setTri(tri==="recent"?"prix":"recent")} className="bg-white border px-3 py-2 rounded-full text-[11px] font-bold">{tri==="recent"?"🕒 Récent":"💰 Prix"}</button>
        </div>
      </header>

      <div className="p-4">
        {/* BANNER WENZE 2.0 - prix selon catégorie parente */}
        <div className={`rounded-2xl p-4 border-2 ${cat.id==="gros-autres"?"bg-black text-white border-black":"bg-[#6C3CE0] text-white border-[#6C3CE0]"}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-black text-[14px]">{act ? `${cat.icon} ${act.label}` : `${cat.icon} ${cat.titre}`}</p>
              <p className="text-[11px] opacity-80 mt-1">{cat.description} • {cat.regime} • Activité incluse dans {prixInfo.prixUSD}$</p>
              <p className="text-[10px] opacity-60 mt-1">Électricité, maçon, soudeur, plombier, coiffure = {cat.id==="commerces-services"?"5$ même régime":"inclus"} - Taux fixe {TAUX_CDF}</p>
            </div>
            <span className="bg-white text-black text-[11px] px-3 py-1 rounded-full font-black whitespace-nowrap">{prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF</span>
          </div>
          <div className="mt-3 flex gap-1 flex-wrap">
            {cat.activites.map((a:any)=> (
              <Link key={a.id} href={`/categorie/${cat.id}/${a.slug}`} className={`text-[9px] px-2 py-1 rounded-full font-bold border ${a.slug===actSlug ? "bg-white text-black border-white" : "bg-white/20 border-white/30"}`}>{a.label}</Link>
            ))}
          </div>
        </div>

        {filtered.length===0 ? (
          <div className="mt-6 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">{act ? "🔧" : cat.icon}</p>
            <p className="font-black mt-2 text-[13px]">{search ? `Pas de résultat "${search}"` : `Pas encore d'annonces ${act ? `en ${act.label}` : `en ${cat.titre}`}`}</p>
            <p className="text-[11px] text-gray-500 mt-1">{cat.icon} {cat.titre} - {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF} - 0% commission</p>
            <Link href={`/publier?categorie=${cat.id}&activite=${act?.slug || ""}`} className={`mt-4 inline-block text-white px-6 py-3 rounded-full font-bold text-[12px] ${cat.id==="gros-autres"?"bg-black":"bg-[#6C3CE0]"}`}>Publier {act ? act.label : cat.titreCourt} {prixInfo.prixUSD}$</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {filtered.map((p:any)=> (
              <div key={p.id} className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                <Link href={`/produit/${p.id}`} className="block w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden relative">
                  {p.photo ? <img src={p.photo} alt={p.titre} className="max-w-full max-h-full object-contain"/> : <span className="text-3xl">{cat.icon}</span>}
                  <span className={`absolute top-2 right-2 text-[7px] px-1.5 py-0.5 rounded-full font-bold ${cat.id==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixInfo.prixUSD}$</span>
                  {p.activiteId && <span className="absolute top-2 left-2 bg-white/90 text-black text-[7px] px-1.5 py-0.5 rounded-full font-bold border">{p.activiteId}</span>}
                </Link>
                <div className="p-2.5">
                  <p className="font-bold text-[#6C3CE0] text-[13px] truncate">{formatPrix(p)}</p>
                  <Link href={`/produit/${p.id}`}><p className="text-[11px] font-semibold truncate hover:text-[#6C3CE0]">{p.titre}</p></Link>
                  <p className="text-[9px] text-gray-400 truncate">👤 {p.user} • {act?.label || p.activiteId || cat.titreCourt}</p>
                  <a href={`https://wa.me/${cleanWhatsapp(p.ownerWhatsapp||p.whatsapp)}?text=${encodeURIComponent(`Bonjour ${p.user} 👋 WENZE - "${p.titre}" à ${formatPrix(p)} - Taux ${TAUX_CDF}`)}`} target="_blank" className="mt-2 w-full bg-[#00C950] text-white text-[11px] font-bold py-2.5 rounded-full flex justify-center">💬 WhatsApp</a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Link href={`/categorie/${cat.id}`} className="flex-1 bg-white border p-3 rounded-xl text-center font-bold text-[12px]">← {cat.titreCourt}</Link>
          <Link href="/categories" className="flex-1 bg-black text-white p-3 rounded-xl text-center font-bold text-[12px]">2 catégories</Link>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
