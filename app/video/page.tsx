"use client";
import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDF } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g,"");

function VideoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("id");
  const [videos, setVideos] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // ✅ FIX 1 - LECTURE RÉELLE depuis isVideo + photo (ton publier sauve comme ça)
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      // Supporte les 2 anciens formats: isVideo + typeMedia + video
      const vids = list.filter((a:any) => 
        (a.isVideo === true || a.typeMedia === "video" || a.video) && (a.photo || a.video)
      ).map((a:any)=> ({
        ...a,
        videoUrl: a.video || a.photo, // photo contient data:video si vidéo
        categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"),
        prix: Math.round(Number(a.prix||0)),
        prixCDF: a.prixCDF ? Math.round(Number(a.prixCDF)) : toCDF(Math.round(Number(a.prix||0))),
        ownerWa: cleanWa(a.ownerWhatsapp || a.whatsapp || ""),
      })).reverse();

      // Si ?id, mettre en premier
      if(focusId){
        vids.sort((a:any,b:any)=> (a.id===focusId?-1:b.id===focusId?1:0));
      }
      setVideos(vids);

      if(focusId){
        setTimeout(()=>{
          document.getElementById(`vid-${focusId}`)?.scrollIntoView({ behavior:"smooth", block:"center" });
        }, 400);
      }
    } catch {}
  }, [focusId]);

  // ✅ FIX 2 - Observer TikTok pro - play/pause auto
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          video.play().catch(()=>{});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.7 });

    // Attendre que refs soient remplies
    const t = setTimeout(()=>{
      videoRefs.current.forEach(v => observer.observe(v));
    }, 300);

    return () => {
      clearTimeout(t);
      observer.disconnect();
    };
  }, [videos]);

  const filtered = useMemo(() => {
    return videos.filter((v: any) => {
      const catId = (v.categorieId || "").toLowerCase();
      const act = (v.activiteId || v.activite || "").toLowerCase();
      const q = search.toLowerCase();

      if (filter !== "all" && !catId.includes(filter) && !act.includes(filter)) {
        // technique = soudeur + tout-travaux même régime 5$
        if(filter==="technique"){
          const isTech = catId.includes("technique") || act.includes("soudeur") || act.includes("tout-travaux") || act.includes("electric");
          if(!isTech) return false;
        } else {
          return false;
        }
      }
      if (search && !`${v.titre} ${v.description} ${v.ownerName||v.user} ${act} ${catId}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [videos, filter, search]);

  const getCatInfo = (v:any)=> {
    const cat = getCategorieById(v.categorieId);
    return cat ? { label: cat.titreCourt, icon: cat.icon, prixUSD: cat.prixUSD } : { label: v.categorieId, icon:"📦", prixUSD:5 };
  };

  const getWaLink = (v:any)=>{
    const catInfo = getCatInfo(v);
    const msg = `Bonjour ${v.ownerName||v.user||"WENZE WENZE BUSINESS"}, je viens de WENZE WENZE BUSINESS Vidéo 🎬 ${catInfo.label} - Je veux "${v.titre}" à ${v.prix}$ / ${v.prixCDF.toLocaleString()} CDF - ${v.id}`;
    return `https://wa.me/${v.ownerWa}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="max-w-[430px] mx-auto bg-black min-h-screen pb-24 text-white">
      <header className="sticky top-0 bg-black/90 backdrop-blur z-20 p-4 border-b border-white/10">
        <div className="flex justify-between items-center">
          <button onClick={()=> router.push("/")} className="text-[11px] font-bold bg-white/10 px-3 py-2 rounded-full">← Accueil</button>
          <div className="text-center">
            {/* ✅ NOM GARDÉ */}
            <h1 className="font-black text-[11px] leading-tight">WENZE WENZE BUSINESS - Vidéo 🎬</h1>
            <p className="text-[8px] text-white/60">{filtered.length}/{videos.length} vidéos • 5$/10$ = Vidéo • Taux {TAUX_CDF}</p>
          </div>
          <button onClick={()=> router.push("/publier?cat=commerces-services")} className="text-[10px] bg-[#6C3CE0] px-3 py-2 rounded-full font-bold">➕ Publier</button>
        </div>
        
        <div className="mt-3 space-y-2">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cherche vidéo: soudeur, coiffure, sacs..." className="w-full bg-white/10 border border-white/10 rounded-full py-2.5 px-4 text-[12px] text-white placeholder:text-white/40 outline-none focus:border-[#6C3CE0]" />
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {[
              { id: "all", label: "Toutes" },
              { id: "commerces-services", label: "🛍️ Commerces 5$" },
              { id: "gros-autres", label: "🏭 Gros 10$" },
              { id: "technique", label: "🔧 Technique" },
            ].map(f => (
              <button key={f.id} onClick={()=>setFilter(f.id)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold border ${filter===f.id ? "bg-white text-black border-white" : "bg-white/10 text-white/70 border-white/10"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="p-10 text-center mt-10">
          <p className="text-6xl">🎬</p>
          <p className="font-bold mt-4">{videos.length === 0 ? "Pas encore de vidéos" : `Pas de vidéo dans ${filter}`}</p>
          <p className="text-[11px] opacity-60 mt-2">Vidéo réservée boutiques payantes 5$/10$ • Freemium 3 vie = Images only<br/>WENZE WENZE BUSINESS - Taux {TAUX_CDF} - 0% commission</p>
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={()=> router.push("/abonnement")} className="bg-white text-black px-6 py-3 rounded-full font-bold text-sm">Payer 5$ pour publier vidéo</button>
            <button onClick={()=> router.push("/")} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-full font-bold text-sm">Retour fil d'actu</button>
          </div>
        </div>
      ) : (
        <div className="snap-y snap-mandatory h-[calc(100vh-150px)] overflow-y-scroll">
          {filtered.map((v) => {
            const catInfo = getCatInfo(v);
            const isFocus = v.id===focusId;
            return (
              <div key={v.id} id={`vid-${v.id}`} className={`snap-start h-[calc(100vh-150px)] relative flex items-end bg-black border-b border-white/5 ${isFocus?"ring-2 ring-red-600":""}`}>
                <video 
                  ref={(el) => { if (el) videoRefs.current.set(v.id, el); else videoRefs.current.delete(v.id); }}
                  src={v.videoUrl} 
                  className="absolute inset-0 w-full h-full object-contain bg-black" 
                  loop 
                  muted 
                  playsInline 
                  controls={false}
                  autoPlay={isFocus}
                  preload="metadata"
                  onClick={(e)=> (e.target as HTMLVideoElement).paused ? (e.target as HTMLVideoElement).play() : (e.target as HTMLVideoElement).pause()}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent pointer-events-none" />
                
                {isFocus && <div className="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full animate-pulse">▶️ Lecture depuis fil d'actu</div>}

                <div className="relative p-4 w-full z-10">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span className="text-[9px] bg-white/20 backdrop-blur px-2 py-1 rounded-full font-bold">🎥 {catInfo.prixUSD}$ Boutique</span>
                    <span className="text-[9px] bg-[#6C3CE0] px-2 py-1 rounded-full font-bold">{v.prix}$ / {v.prixCDF.toLocaleString()} CDF</span>
                    <span className="text-[9px] bg-white/10 px-2 py-1 rounded-full">{catInfo.icon} {catInfo.label}</span>
                  </div>
                  <p className="font-black text-[16px] leading-tight">{v.titre}</p>
                  <p className="text-[12px] opacity-80 mt-1">🏪 {v.ownerName||v.user||"WENZE WENZE BUSINESS"} • {v.commune||"Kinshasa"}</p>
                  <p className="text-[11px] opacity-60 mt-1 line-clamp-2">{v.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <a href={getWaLink(v)} target="_blank" className="bg-[#25D366] text-white text-center py-3 rounded-full font-black text-[12px]">💬 WhatsApp</a>
                    <button onClick={()=> router.push(`/produit/${v.id}`)} className="bg-white text-black text-center py-3 rounded-full font-bold text-[12px]">Voir produit</button>
                  </div>
                </div>

                <div className="absolute right-2 bottom-28 z-10 flex flex-col gap-4">
                  <button onClick={()=> router.push(`/produit/${v.id}`)} className="text-center"><p className="text-xl">❤️</p><p className="text-[9px]">WENZE</p></button>
                  <button onClick={()=> router.push(`/boutique/${v.ownerWa}`)} className="text-center"><p className="text-xl">🏪</p><p className="text-[9px]">Boutique</p></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30 text-black">
        <button onClick={()=> router.push("/")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</button>
        <button onClick={()=> router.push("/video")} className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">🎥</span>Vidéo</button>
        <button onClick={()=> router.push("/publier")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[22px]">➕</span>Publier</button>
        <button onClick={()=> router.push("/boutiques")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</button>
        <button onClick={()=> router.push("/profil")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</button>
      </nav>
    </div>
  );
}

export default function VideoPageWrapper(){
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-black p-6"><div className="h-96 bg-white/10 rounded-2xl animate-pulse"/><p className="text-[10px] text-white/40 mt-2">WENZE WENZE BUSINESS Vidéo...</p></div>}>
      <VideoContent/>
    </Suspense>
  )
                                               }
