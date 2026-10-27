"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { FORMULES, TAUX_CDF, toCDF } from "@/lib/paiement";

function cleanWa(n: string){ return (n||"").toString().replace(/[^0-9]/g,""); }
function formatPrix(p:any){
  const usd = Number(p.prix) || 0;
  if(p.prixCDF) return `${p.prixCDF.toLocaleString("fr-FR")} CDF`;
  return `${usd}$ / ${toCDF(usd).toLocaleString("fr-FR")} CDF`;
}

export default function WenzeBusiness() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [toast, setToast] = useState("");

  const loadAnnonces = ()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const arr = [...list];
      arr.sort((a:any,b:any)=>{
        if(a.boost && !b.boost) return -1;
        if(!a.boost && b.boost) return 1;
        if(a.flash && !b.flash) return -1;
        return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
      });
      setAnnonces(arr);
    }catch{ setAnnonces([]); }
  };

  useEffect(()=>{
    loadAnnonces();
    const onFocus = ()=> loadAnnonces();
    const onStorage = ()=> loadAnnonces();
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onFocus);
    return ()=>{
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onFocus);
    };
  },[]);
  
  const getWaLink = (v: any) => {
    const num = cleanWa(v.ownerWhatsapp || v.whatsapp);
    if(!num) return "#";
    const prixTxt = formatPrix(v);
    const msg = `Bonjour ${v.user || 'vendeur'} 👋 WENZE - "${v.titre}" à ${prixTxt} - Taux ${TAUX_CDF}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    const cats = CATEGORIES_WENZE.filter(c => !q || c.titre.toLowerCase().includes(q) || c.titreCourt.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    const ann = annonces.filter(a => !q || a.titre?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q) || a.categorie?.toLowerCase().includes(q) || a.user?.toLowerCase().includes(q));
    return { cats, ann };
  }, [search, annonces]);

  const flashAnnonces = useMemo(()=> filteredData.ann.filter((a:any)=> a.photo || a.typeMedia === "image").slice(0,8), [filteredData.ann]);
  const videoAnnonces = useMemo(()=> filteredData.ann.filter((a:any)=> a.typeMedia === "video" || a.video).slice(0,6), [filteredData.ann]);

  function handleImageClick(item:any){ setSelectedImage(item); }
  function handleVideoClick(item:any){ try{ localStorage.setItem("wenze_selected_video", JSON.stringify(item)); }catch{}; router.push("/video"); }

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24 relative">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-black text-white px-4 py-3 rounded-full text-[11px] font-bold">{toast}</div>}

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex justify-between items-center p-3 bg-black">
            <button onClick={()=> setSelectedImage(null)} className="w-9 h-9 bg-white/20 text-white rounded-full flex items-center justify-center">✕</button>
            <p className="text-white font-bold text-[12px] truncate flex-1 mx-3">{selectedImage.titre}</p>
            <button onClick={()=> setSelectedImage(null)} className="text-white text-[10px] bg-white/20 px-3 py-1.5 rounded-full">Fermer</button>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center p-2">
            <img src={selectedImage.photo} alt={selectedImage.titre} className="max-w-full max-h-[70vh] object-contain rounded-xl" />
          </div>
          <div className="bg-white rounded-t-[28px] p-5">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3"></div>
            <h2 className="font-black text-[16px] leading-tight">{selectedImage.titre}</h2>
            <p className="text-[11px] text-gray-500 mt-1">{selectedImage.categorieTitre || selectedImage.categorie} • Taux {TAUX_CDF} • 0% commission</p>
            <div className="flex items-center gap-2 mt-3">
              <p className="font-black text-[18px] text-[#6C3CE0]">{formatPrix(selectedImage)}</p>
              {selectedImage.flash && <span className="bg-red-600 text-white text-[9px] px-2 py-1 rounded-full font-bold">-{selectedImage.flashRemise || 30}%</span>}
              {selectedImage.boost && <span className="bg-[#6C3CE0] text-white text-[9px] px-2 py-1 rounded-full font-bold">BOOST</span>}
              {selectedImage.categorieId==="gros-autres" && <span className="bg-black text-white text-[9px] px-2 py-1 rounded-full font-bold">🏭 GROS 10$</span>}
              {selectedImage.categorieId==="commerces-services" && <span className="bg-[#6C3CE0] text-white text-[9px] px-2 py-1 rounded-full font-bold">🛍️ 5$</span>}
            </div>
            {selectedImage.description && <p className="text-[12px] mt-3 bg-[#FFFBF0] border rounded-xl p-3">{selectedImage.description}</p>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <a href={getWaLink(selectedImage)} target="_blank" className="bg-[#25D366] text-white py-4 rounded-full text-center font-black text-[13px]">💬 WhatsApp</a>
              <Link href={`/boutique/${selectedImage.ownerWhatsapp || selectedImage.whatsapp}`} className="bg-black text-white py-4 rounded-full text-center font-black text-[13px]">Boutique</Link>
            </div>
            <Link href={`/produit/${selectedImage.id}`} className="mt-2 block bg-gray-100 py-3 rounded-full text-center font-bold text-[11px]">Voir détails →</Link>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-white z-20 p-4 border-b shadow-sm">
        <div className="flex justify-between items-center">
          <Link href="/">
            <h1 className="text-[22px] font-black text-[#6C3CE0] leading-none">WENZE</h1>
            <p className="text-[11px] font-bold text-[#FF6B35] tracking-[2px]">BUSINESS • {annonces.length} annonces • Taux {TAUX_CDF}</p>
          </Link>
          <div className="flex gap-2">
            <button onClick={()=> router.push("/publier")} className="w-9 h-9 bg-[#6C3CE0] rounded-full flex items-center justify-center text-white font-bold active:scale-95 transition">➕</button> 
            <Link href="/profil" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">👤</Link>
          </div>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Recherche: sacs, électricien, gros, production..." className="w-full bg-gray-100 rounded-full py-3 px-5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
          <span className="absolute left-3 top-3.5">🔍</span>
          {search && <button onClick={()=>setSearch("")} className="absolute right-3 top-3 text-gray-400">✕</button>}
        </div>
      </header>

      <div className="m-4 rounded-2xl bg-gradient-to-br from-[#6C3CE0] to-[#FF6B35] p-[1px]">
        <div className="bg-black rounded-2xl h-[150px] flex items-end p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
          <div className="relative text-white z-10">
            <h2 className="font-bold text-[18px]">Achetez, Vendez, Gagnez</h2>
            <p className="text-[11px] opacity-90 mt-1">🛍️ Petites activités 5$ • 🏭 Gros & autres 10$ • 0% commission • Taux {TAUX_CDF}</p>
            <button onClick={()=> router.push("/publier")} className="mt-2 inline-block bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-full">Publier +</button>
          </div>
        </div>
      </div>

      {/* ✅ 2 CATEGORIES MODERNES - PLUS DE 6 METIERS */}
      <section className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-[15px]">2 Catégories WENZE 2.0</h3>
          <Link href="/categories" className="text-[#6C3CE0] text-xs font-bold">Tout voir →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {filteredData.cats.map(c => {
            const countCat = annonces.filter(a=> normalizeCategorie(a.categorie||"")===c.id).length;
            return (
              <Link key={c.id} href={`/categorie/${c.id}`} className={`flex flex-col items-start gap-1.5 border-2 rounded-2xl p-4 hover:shadow-md transition active:scale-[0.97] ${c.id==="gros-autres"?"bg-black text-white border-black":"bg-white border-[#6C3CE0]/20"}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${c.id==="gros-autres"?"bg-white/20":"bg-[#FFFBF0]"}`}>{c.icon}</div>
                <span className="text-[12px] font-black leading-tight">{c.titre}</span>
                <span className={`text-[10px] ${c.id==="gros-autres"?"text-white/60":"text-gray-500"}`}>{countCat} annonces • {c.prixUSD}$ / {c.prixCDF.toLocaleString()} CDF</span>
                <span className={`mt-1 text-[9px] font-black px-2 py-1 rounded-full ${c.id==="gros-autres"?"bg-white text-black":"bg-black text-white"}`}>{c.prixUSD}$ / 30j</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="px-4 mt-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[15px]">Wenze Vidéo 🎬</h3>
          <Link href="/video" className="text-[#6C3CE0] text-xs font-bold">Voir tout ({videoAnnonces.length}) ›</Link>
        </div>
        {videoAnnonces.length > 0 ? (
          <div className="flex gap-3 mt-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {videoAnnonces.map((v:any) => (
              <div key={v.id} onClick={()=> handleVideoClick(v)} className="min-w-[135px] w-[135px] relative rounded-xl overflow-hidden bg-black h-[190px] flex-shrink-0 cursor-pointer active:scale-[0.97] transition">
                {v.video ? <video src={v.video} className="w-full h-full object-cover" muted preload="metadata" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                  <p className="text-white text-[11px] font-bold truncate">{v.titre}</p>
                  <p className="text-white/70 text-[9px]">🔒 {cleanWa(v.ownerWhatsapp||v.whatsapp).slice(-4)} • {v.prix}$</p>
                </div>
                <span className="absolute top-2 left-2 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">VIDEO</span>
                <span className="absolute inset-0 flex items-center justify-center"><span className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center">▶️</span></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-[11px] text-gray-400">Pas encore de vidéos. <button onClick={()=> router.push("/publier")} className="text-[#6C3CE0] font-bold">Publier une vidéo</button></div>
        )}
      </section>

      <section className="px-4 mt-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[15px]">Ventes Flash ({filteredData.ann.length})</h3>
          <Link href="/vente-flash" className="text-[#6C3CE0] text-xs font-bold">Voir tout ›</Link>
        </div>
        
        {flashAnnonces.length === 0 ? (
          <div className="mt-3 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">📸</p>
            <p className="text-sm font-bold mt-2">{search ? `Pas de résultat pour "${search}"` : "Pas encore de produits"}</p>
            <p className="text-[11px] text-gray-500 mt-1">🛍️ Détail & Services 5$ • 🏭 Gros & Autres 10$</p>
            <button onClick={()=> router.push("/publier")} className="mt-3 inline-block bg-[#6C3CE0] text-white text-xs font-bold px-6 py-3 rounded-full">Publier maintenant ➕</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {flashAnnonces.map((p:any) => (
              <div key={p.id} className="border rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col hover:shadow-md transition">
                <div onClick={()=> handleImageClick(p)} className="w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden relative cursor-pointer">
                  {p.photo ? <img src={p.photo} alt={p.titre} className="max-w-full max-h-full object-contain" /> : <span className="text-3xl">📦</span>}
                  {p.boost && <span className="absolute top-2 left-2 bg-[#6C3CE0] text-white text-[7px] px-1.5 py-0.5 rounded-full font-bold">BOOST</span>}
                  <span className={`absolute top-2 right-2 text-[7px] px-1.5 py-0.5 rounded-full font-bold ${p.categorieId==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{p.categorieId==="gros-autres"?"🏭 10$":"🛍️ 5$"}</span>
                </div>
                <div className="p-2.5">
                  <p className="font-bold text-[#6C3CE0] text-[13px] truncate">{formatPrix(p)}</p>
                  <p onClick={()=> handleImageClick(p)} className="text-[11px] font-semibold truncate cursor-pointer hover:text-[#6C3CE0]">{p.titre}</p>
                  <p className="text-[9px] text-gray-400 truncate">👤 {p.user} • {p.categorieTitre||p.categorie}</p>
                  <a href={getWaLink(p)} target="_blank" rel="noopener noreferrer" className="mt-2 w-full bg-[#00C950] hover:bg-[#00b247] text-white text-[11px] font-bold py-2.5 rounded-full flex justify-center items-center gap-1">💬 WhatsApp</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Link href="/abonnement" className="m-4 bg-[#6C3CE0] rounded-2xl p-4 text-white flex justify-between items-center hover:bg-[#5a32bd] transition flex">
        <div>
          <h4 className="font-bold text-[13px]">Devenez Boutique Pro 👑</h4>
          <p className="text-[10px] opacity-90 mt-0.5">🛍️ 5$ / {FORMULES.commerces_services.prixCDF.toLocaleString("fr-FR")} CDF • 🏭 10$ / {FORMULES.gros_autres.prixCDF.toLocaleString("fr-FR")} CDF • 0% • Taux {TAUX_CDF}</p>
        </div>
        <span className="bg-[#FF6B35] text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">5$ / 10$</span>
      </Link>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <Link href="/" className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-[#6C3CE0]"><span className="text-[18px]">🏪</span>Boutiques</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-[#6C3CE0]"><span className="text-[18px] bg-[#6C3CE0] text-white w-6 h-6 rounded-full flex items-center justify-center">➕</span>Vendre</Link>
        <Link href="/video" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-[#6C3CE0]"><span className="text-[18px]">🎬</span>Vidéo</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-[#6C3CE0]"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  );
              }
