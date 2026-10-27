"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDF, verifierAbonnement } from "@/lib/paiement";

function cleanWa(n: string){ return (n||"").toString().replace(/[^0-9]/g,""); }

function formatPrix(p:any){
  const usd = Math.round(Number(p.prix||0));
  const cdf = p.prixCDF ? Math.round(Number(p.prixCDF)) : toCDF(usd);
  return `${usd}$ / ${cdf.toLocaleString("fr-FR")} CDF`;
}

export default function WenzeBusiness() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [ab, setAb] = useState<any>(null);

  const loadAnnonces = ()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const fixed = list.map((a:any)=> ({
        ...a,
        categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"),
        prix: Math.round(Number(a.prix||0)),
        prixCDF: a.prixCDF ? Math.round(Number(a.prixCDF)) : toCDF(Math.round(Number(a.prix||0))),
        isVideo: !!a.isVideo,
        media: a.isVideo ? "images-videos" : "image-only",
      }));
      setAnnonces(fixed);
    } catch { setAnnonces([]); }
  };

  useEffect(()=> { 
    loadAnnonces(); 
    try{ setAb(verifierAbonnement()); } catch {}
    const onStorage = ()=> loadAnnonces();
    window.addEventListener("storage", onStorage);
    return ()=> window.removeEventListener("storage", onStorage);
  }, []);

  const filtered = useMemo(()=>{
    let list = [...annonces];
    if(selectedCat!=="all") list = list.filter(a=> a.categorieId===selectedCat);
    if(search.trim()){
      const s = search.toLowerCase();
      list = list.filter(a=> (a.titre||"").toLowerCase().includes(s) || (a.description||"").toLowerCase().includes(s) || (a.commune||"").toLowerCase().includes(s));
    }
    return list.sort((a,b)=> {
      const boostA = a.boostUntil && new Date(a.boostUntil).getTime()>Date.now() ? 1 : 0;
      const boostB = b.boostUntil && new Date(b.boostUntil).getTime()>Date.now() ? 1 : 0;
      if(boostA!==boostB) return boostB-boostA;
      return new Date(b.created_at||b.createdAt||0).getTime() - new Date(a.created_at||a.createdAt||0).getTime();
    });
  }, [annonces, search, selectedCat]);

  const showToast = (m:string)=> { setToast(m); setTimeout(()=> setToast(""), 2500); };

  const addPanier = (a:any)=>{
    try{
      const panier = JSON.parse(localStorage.getItem("wenze_panier")||"[]");
      if(panier.find((p:any)=> p.id===a.id)){ showToast("Déjà dans panier 🛒"); return; }
      panier.push({ ...a, qty:1 });
      localStorage.setItem("wenze_panier", JSON.stringify(panier));
      showToast(`Ajouté ${a.prix}$ / ${a.prixCDF.toLocaleString()} CDF 🛒`);
      window.dispatchEvent(new Event("storage"));
    } catch { showToast("Panier erreur"); }
  };

  const openProduit = (a:any)=>{
    try{ localStorage.setItem("wenze_current_produit", JSON.stringify(a)); } catch {}
    router.push(`/produit/${a.id}`);
  };

  // ✅ VIDEO REDIRECT - Fix pro
  const openVideoPage = (a:any)=>{
    try{ localStorage.setItem("wenze_current_produit", JSON.stringify(a)); } catch {}
    router.push(`/video?id=${a.id}`);
  };

  const prixMoyenUSD = filtered.length ? Math.round(filtered.reduce((s,a)=> s + Number(a.prix||0),0)/filtered.length) : 0;
  const prixMoyenCDF = toCDF(prixMoyenUSD);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 border-b">
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white font-black">W</div>
          <div className="flex-1">
            <h1 className="font-black text-[14px] leading-none">WENZE WENZE BUSINESS - {ab?.isPaye?`✅ ${ab?.label} ${ab?.joursRestants}j`: ab?.isEssai7j?`⏳ Essai ${ab?.joursRestants}j`:`🆓 ${ab?.count||0}/3 vie`}</h1>
            <p className="text-[9px] text-gray-500">Kinshasa • Freemium 3 vie images only • Essai 7j • 5$/10$ • Taux {TAUX_CDF} • 0% comm</p>
          </div>
          <Link href="/panier" className="w-9 h-9 bg-[#FFFBF0] border rounded-full flex items-center justify-center">🛒</Link>
          <Link href="/profil" className="w-9 h-9 bg-[#6C3CE0] text-white rounded-full flex items-center justify-center">👤</Link>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Recherche sacs, électricité, maçon..." className="flex-1 border-2 p-3 rounded-full text-[13px] bg-[#FFFBF0] outline-none focus:border-[#6C3CE0]"/>
          <button onClick={()=> router.push("/publier")} className="bg-[#6C3CE0] text-white px-5 rounded-full font-black text-[12px]">+ Publier</button>
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <button onClick={()=> setSelectedCat("all")} className={`px-3 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap ${selectedCat==="all"?"bg-black text-white border-black":"bg-white"}`}>Tout • {annonces.length}</button>
          {CATEGORIES_WENZE.map(c=> {
            const count = annonces.filter(a=> a.categorieId===c.id).length;
            return <button key={c.id} onClick={()=> setSelectedCat(c.id)} className={`px-3 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap ${selectedCat===c.id?"bg-[#6C3CE0] text-white border-[#6C3CE0]":"bg-white"}`}>{c.icon} {c.titreCourt} • {count}</button>
          })}
        </div>
      </header>

      <div className="p-4 space-y-3">
        {toast && <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center animate-pulse">{toast}</div>}

        <div className="bg-black text-white rounded-2xl p-4">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <p className="font-black text-[12px]">WENZE WENZE BUSINESS - 2 Boutiques + Freemium</p>
              <p className="text-[10px] opacity-70 mt-1">🛍️ Commerces & Services 5$ / 11 500 CDF • Électricité, maçon, coiffure même régime 5$ • 🏭 Gros 10$ / 23 000 CDF • Taux fixe {TAUX_CDF} • Freemium 3 vie images only</p>
            </div>
            <button onClick={()=> router.push("/boutiques")} className="bg-white text-black px-3 py-2 rounded-full font-black text-[10px]">Boutiques</button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <p className="font-black text-[11px]">{filtered.length} annonces • {prixMoyenUSD}$ / {prixMoyenCDF.toLocaleString()} CDF moyen • Taux {TAUX_CDF}</p>
          <button onClick={()=> router.push("/categories")} className="text-[10px] text-[#6C3CE0] font-bold">Catégories →</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.length===0 ? (
            <div className="col-span-2 text-center py-12 bg-white border-2 border-dashed rounded-2xl">
              <p className="text-3xl">📦</p><p className="text-[12px] font-bold mt-2">Aucune annonce</p>
              <button onClick={()=> router.push(`/publier?cat=${selectedCat==="all"?"commerces-services":selectedCat}`)} className="mt-3 bg-[#6C3CE0] text-white px-4 py-2 rounded-full font-black text-[11px]">+ Publier</button>
            </div>
          ) : filtered.map((a:any)=>{
            const cat = getCategorieById(a.categorieId);
            const pi = getPrixByCategorie(a.categorieId);
            const isVideo = !!a.isVideo;
            return (
              <div key={a.id} className="bg-white border rounded-2xl overflow-hidden flex flex-col">
                {/* ✅ FIX VIDEO - Image -> modal, Video -> /video?id */}
                <button 
                  onClick={()=> isVideo ? openVideoPage(a) : setSelectedImage(a)} 
                  className="h-36 bg-[#FFFBF0] flex items-center justify-center overflow-hidden relative group"
                >
                  {isVideo ? (
                    <>
                      <video src={a.photo} className="max-w-full max-h-full object-contain" muted playsInline preload="metadata"/>
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center text-[18px] shadow-lg group-active:scale-90 transition">▶️</div>
                      </div>
                    </>
                  ) : a.photo ? (
                    <img src={a.photo} alt={a.titre} className="max-w-full max-h-full object-contain"/>
                  ) : (
                    <span className="text-3xl">{cat?.icon}</span>
                  )}
                  <span className={`absolute top-2 left-2 text-[8px] px-2 py-1 rounded-full font-black ${isVideo?"bg-red-600 text-white":"bg-[#6C3CE0] text-white"}`}>{isVideo?"🎥 VIDÉO":"🖼️"} {pi.prixUSD}$</span>
                  {isVideo && <span className="absolute bottom-1.5 right-1.5 text-[7px] bg-black/80 text-white px-2 py-1 rounded-full">Lire sur Vidéo →</span>}
                  {a.boostUntil && new Date(a.boostUntil).getTime()>Date.now() && <span className="absolute top-2 right-2 text-[7px] bg-[#25D366] text-white px-2 py-1 rounded-full font-black">🚀</span>}
                </button>

                <div className="p-2.5 flex-1 flex flex-col">
                  <button onClick={()=> isVideo ? openVideoPage(a) : openProduit(a)} className="text-left font-bold text-[12px] leading-tight line-clamp-2 hover:text-[#6C3CE0]">
                    {a.titre} {isVideo?"🎥":""}
                  </button>
                  <p className="text-[10px] text-gray-500 truncate">{cat?.titreCourt} • {a.commune}</p>
                  <p className="font-black text-[12px] text-[#6C3CE0] mt-1">{Math.round(a.prix)}$ / {Math.round(a.prixCDF).toLocaleString()} CDF</p>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <a href={`https://wa.me/${cleanWa(a.ownerWhatsapp||a.whatsapp||"")}?text=${encodeURIComponent(`Bonjour WENZE WENZE BUSINESS 👋 ${a.titre} - ${a.prix}$ - ${a.id}`)}`} target="_blank" className="bg-[#25D366] text-white text-center py-2 rounded-full font-bold text-[10px]">WhatsApp</a>
                    {isVideo ? (
                      <button onClick={()=> openVideoPage(a)} className="bg-red-600 text-white py-2 rounded-full font-bold text-[10px]">▶️ Lire</button>
                    ) : (
                      <button onClick={()=> addPanier(a)} className="bg-black text-white py-2 rounded-full font-bold text-[10px]">🛒 Panier</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ✅ MODAL IMAGE ONLY - Video ne ouvre plus modal */}
      {selectedImage && !selectedImage.isVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={()=> setSelectedImage(null)}>
          <div className="bg-white rounded-2xl max-w-[380px] w-full overflow-hidden" onClick={e=> e.stopPropagation()}>
            <div className="h-72 bg-[#FFFBF0] flex items-center justify-center">
              <img src={selectedImage.photo} alt={selectedImage.titre} className="max-w-full max-h-full object-contain"/>
            </div>
            <div className="p-4">
              <p className="font-black text-[13px]">{selectedImage.titre} 🖼️</p>
              <p className="text-[11px] text-gray-600 mt-1 line-clamp-3">{selectedImage.description}</p>
              <p className="font-black text-[#6C3CE0] mt-2">{formatPrix(selectedImage)} • Boutique {getPrixByCategorie(selectedImage.categorieId).prixUSD}$ • Taux {TAUX_CDF}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={()=> { setSelectedImage(null); openProduit(selectedImage); }} className="bg-black text-white py-3 rounded-full font-bold text-[12px]">Voir produit</button>
                <button onClick={()=> setSelectedImage(null)} className="bg-white border py-3 rounded-full font-bold text-[12px]">Fermer</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <a href={`https://wa.me/${cleanWa(selectedImage.ownerWhatsapp||"")}?text=${encodeURIComponent(`WENZE WENZE BUSINESS ${selectedImage.titre}`)}`} target="_blank" className="bg-[#25D366] text-white text-center py-3 rounded-full font-bold text-[12px]">WhatsApp</a>
                <button onClick={()=> { addPanier(selectedImage); setSelectedImage(null); }} className="bg-[#6C3CE0] text-white py-3 rounded-full font-bold text-[12px]">🛒 Panier</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ BARRE TÂCHE FIX - Marché supprimé → Vidéo */}
      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <button onClick={()=> router.push("/")} className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">🏠</span>Accueil</button>
        <button onClick={()=> router.push("/video")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🎥</span>Vidéo</button>
        <button onClick={()=> router.push("/publier")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">➕</span>Publier</button>
        <button onClick={()=> router.push("/boutiques")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</button>
        <button onClick={()=> router.push("/profil")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</button>
      </nav>
    </div>
  );
                  }
