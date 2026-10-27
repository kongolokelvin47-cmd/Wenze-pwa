"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString } from "@/lib/paiement";

function cleanWa(n: string){ return (n||"").toString().replace(/[^0-9]/g,""); }

function formatPrix(p:any){
  const usd = Number(p.prix||p.prixUSD||0);
  const cdf = p.prixCDF ? Number(p.prixCDF) : toCDF(usd);
  return `${usd}$ / ${cdf.toLocaleString("fr-FR")} CDF`;
}

export default function WenzeBusiness() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [toast, setToast] = useState("");

  const loadAnnonces = ()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const fixed = list.map((a:any)=> ({
        ...a,
        categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"),
        prixCDF: a.prixCDF || toCDF(Number(a.prix||0)),
      }));
      setAnnonces(fixed);
    } catch { setAnnonces([]); }
  };

  useEffect(()=> { loadAnnonces(); const onStorage = ()=> loadAnnonces(); window.addEventListener("storage", onStorage); return ()=> window.removeEventListener("storage", onStorage); }, []);

  const filtered = useMemo(()=>{
    let list = [...annonces];
    if(selectedCat!=="all"){ list = list.filter(a=> a.categorieId===selectedCat); }
    if(search.trim()){
      const s = search.toLowerCase();
      list = list.filter(a=> 
        (a.titre||"").toLowerCase().includes(s) ||
        (a.description||"").toLowerCase().includes(s) ||
        (a.activite||"").toLowerCase().includes(s) ||
        (a.commune||"").toLowerCase().includes(s)
      );
    }
    return list.sort((a,b)=> new Date(b.created_at||b.createdAt||0).getTime() - new Date(a.created_at||a.createdAt||0).getTime());
  }, [annonces, search, selectedCat]);

  const showToast = (m:string)=> { setToast(m); setTimeout(()=> setToast(""), 2500); };

  const addPanier = (a:any)=>{
    try{
      const panier = JSON.parse(localStorage.getItem("wenze_panier")||"[]");
      const exists = panier.find((p:any)=> p.id===a.id);
      if(exists){ showToast("Déjà dans panier 🛒"); return; }
      panier.push({ ...a, qty:1, prixCDF: a.prixCDF || toCDF(Number(a.prix||0)) });
      localStorage.setItem("wenze_panier", JSON.stringify(panier));
      showToast(`Ajouté ${a.prix}$ / ${(a.prixCDF||toCDF(a.prix)).toLocaleString()} CDF 🛒`);
    } catch { showToast("Panier plein"); }
  };

  const totalUSD = filtered.reduce((s,a)=> s + Number(a.prix||0), 0);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 border-b">
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white font-black">W</div>
          <div className="flex-1">
            <h1 className="font-black text-[16px] leading-none">WENZE 2.0</h1>
            <p className="text-[10px] text-gray-500">Kinshasa • 2 prix • Taux {TAUX_CDF} • 0% comm</p>
          </div>
          <Link href="/panier" className="w-9 h-9 bg-[#FFFBF0] border rounded-full flex items-center justify-center">🛒</Link>
          <Link href="/profil" className="w-9 h-9 bg-[#6C3CE0] text-white rounded-full flex items-center justify-center">👤</Link>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Recherche électricité, maçon, coiffure, gros..." className="flex-1 border-2 p-3 rounded-full text-[13px] bg-[#FFFBF0]"/>
          <Link href="/publier" className="bg-[#6C3CE0] text-white px-5 rounded-full font-black text-[12px] flex items-center">+ Publier</Link>
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          <button onClick={()=> setSelectedCat("all")} className={`px-3 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap ${selectedCat==="all"?"bg-black text-white border-black":"bg-white"}`}>Tout • {annonces.length} • {totalUSD}$</button>
          {CATEGORIES_WENZE.map(c=> {
            const count = annonces.filter(a=> a.categorieId===c.id).length;
            const pi = getPrixByCategorie(c.id);
            return <button key={c.id} onClick={()=> setSelectedCat(c.id)} className={`px-3 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap ${selectedCat===c.id ? (c.id==="gros-autres"?"bg-black text-white border-black":"bg-[#6C3CE0] text-white border-[#6C3CE0]") : "bg-white"}`}>{c.icon} {c.titreCourt} • {count} • {pi.prixUSD}$</button>
          })}
        </div>
      </header>

      <div className="p-4 space-y-3">
        {toast && <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div>}

        <div className="bg-black text-white rounded-2xl p-4 flex justify-between items-center">
          <div><p className="font-black text-[12px]">WENZE 2.0 - 2 Boutiques</p><p className="text-[10px] opacity-70">🛍️ Commerces & Services 5$ / 11 500 CDF • Électricité, maçon, soudure, plombier, coiffure même régime</p><p className="text-[10px] opacity-70">🏭 Gros & Autres 10$ / 23 000 CDF • Grossiste, import, production • Taux fixe {TAUX_CDF}</p></div>
          <Link href="/boutiques" className="bg-white text-black px-3 py-2 rounded-full font-black text-[10px]">Boutiques</Link>
        </div>

        <div className="flex justify-between items-center">
          <p className="font-black text-[12px]">{filtered.length} annonces • {formatPrix({ prix: filtered.reduce((s,a)=> s + Number(a.prix||0),0)/Math.max(1,filtered.length) })} moyen • Taux {TAUX_CDF}</p>
          <Link href="/categories" className="text-[10px] text-[#6C3CE0] font-bold">Catégories →</Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.length===0 ? (
            <div className="col-span-2 text-center py-12 bg-white border-2 border-dashed rounded-2xl">
              <p className="text-3xl">📦</p><p className="text-[12px] font-bold mt-2">Aucune annonce {selectedCat!=="all" ? `en ${getCategorieById(selectedCat)?.titreCourt}` : ""} {search?`pour "${search}"`:""}</p><p className="text-[10px] text-gray-500 mt-1">Sois le 1er à publier en {selectedCat==="all"?"🛍️ 5$ ou 🏭 10$": getCategorieById(selectedCat)?.titreCourt + ` ${getPrixByCategorie(selectedCat).prixUSD}$`} • Taux {TAUX_CDF}</p><Link href={`/publier?cat=${selectedCat==="all"?"commerces-services":selectedCat}`} className="inline-block mt-3 bg-[#6C3CE0] text-white px-4 py-2 rounded-full font-black text-[11px]">+ Publier {selectedCat==="all"?"5$":`${getPrixByCategorie(selectedCat).prixUSD}$`}</Link>
            </div>
          ) : filtered.map((a:any)=>{
            const cat = getCategorieById(a.categorieId);
            const pi = cat ? getPrixByCategorie(cat.id) : { prixUSD:5, prixCDF:11500 };
            const activite = getActiviteById(a.categorieId, a.activiteId);
            return (
              <div key={a.id} className="bg-white border rounded-2xl overflow-hidden flex flex-col">
                <button onClick={()=> setSelectedImage(a)} className="h-36 bg-[#FFFBF0] flex items-center justify-center overflow-hidden relative">
                  {a.photo ? <img src={a.photo} alt={a.titre} className="max-w-full max-h-full object-contain"/> : <span className="text-3xl">{cat?.icon || "📦"}</span>}
                  <span className={`absolute top-2 left-2 text-[8px] px-2 py-1 rounded-full font-black ${a.categorieId==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{cat?.icon} {pi.prixUSD}$</span>
                </button>
                <div className="p-2.5 flex-1 flex flex-col">
                  <Link href={`/produit/${a.id}`} className="font-bold text-[12px] leading-tight line-clamp-2">{a.titre}</Link>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{activite?.label || a.activite || cat?.titreCourt} • {a.commune}</p>
                  <p className="font-black text-[12px] text-[#6C3CE0] mt-1">{Number(a.prix||0)}$ <span className="text-[10px] text-gray-500 font-normal">/ {(a.prixCDF||toCDF(a.prix)).toLocaleString()} CDF</span></p>
                  <p className="text-[9px] text-gray-400">Boutique {pi.prixUSD}$ • Taux {TAUX_CDF}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <a href={`https://wa.me/${cleanWa(a.ownerWhatsapp||a.whatsapp||"")}?text=${encodeURIComponent(`Bonjour WENZE 👋 ${a.titre} ${a.prix}$ / ${(a.prixCDF||toCDF(a.prix)).toLocaleString()} CDF - ${a.id} - Taux ${TAUX_CDF}`)}`} target="_blank" className="bg-[#25D366] text-white text-center py-2 rounded-full font-bold text-[10px]">WhatsApp</a>
                    <button onClick={()=> addPanier(a)} className="bg-black text-white py-2 rounded-full font-bold text-[10px]">🛒 Panier</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white border rounded-2xl p-4 text-[10px] text-gray-600">
          <p className="font-black text-[11px] text-black">WENZE 2.0 - Accueil PRO</p>
          <ul className="list-disc ml-4 mt-2 space-y-1">
            <li>Source: <b>wenze_annonces_list</b> local - fix {`normalizeCategorie`} - pas de FORMULES ancien 25$</li>
            <li>2 prix fixes: 🛍️ 5$ / 11 500 CDF (électricité, maçon, soudure, coiffure même régime) et 🏭 10$ / 23 000 CDF (gros)</li>
            <li>Prix affiché {`usd$ / cdf CDF`} via {`toCDF()`} taux fixe {TAUX_CDF} - 0% commission WhatsApp direct {`cleanWa`}</li>
          </ul>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={()=> setSelectedImage(null)}>
          <div className="bg-white rounded-2xl max-w-[380px] w-full overflow-hidden" onClick={e=> e.stopPropagation()}>
            <div className="h-72 bg-[#FFFBF0] flex items-center justify-center">{selectedImage.photo ? <img src={selectedImage.photo} alt={selectedImage.titre} className="max-w-full max-h-full object-contain"/> : <span className="text-4xl">{getCategorieById(selectedImage.categorieId)?.icon}</span>}</div>
            <div className="p-4"><p className="font-black text-[13px]">{selectedImage.titre}</p><p className="text-[11px] text-gray-600 mt-1 line-clamp-3">{selectedImage.description}</p><p className="font-black text-[#6C3CE0] mt-2">{formatPrix(selectedImage)} • Boutique {getPrixByCategorie(selectedImage.categorieId).prixUSD}$ • Taux {TAUX_CDF}</p><div className="mt-3 grid grid-cols-2 gap-2"><Link href={`/produit/${selectedImage.id}`} className="bg-black text-white text-center py-3 rounded-full font-bold text-[12px]">Voir produit</Link><button onClick={()=> setSelectedImage(null)} className="bg-white border py-3 rounded-full font-bold text-[12px]">Fermer</button></div></div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">➕</span>Publier</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  );
                  }
