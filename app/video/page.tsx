"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE, getCategorieById } from "@/lib/categories";
import { TAUX_CDF } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function VideoPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "technique" | "beaute" | "commerce" | "alimentation">("all");
  const [search, setSearch] = useState("");
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const vids = list.filter((a:any) => (a.typeMedia === "video" || a.video) && (a.ownerWhatsapp || a.whatsapp)).reverse();
      setVideos(vids);
    } catch {}
  }, []);

  // Anti-facture TikTok
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) video.play().catch(()=>{});
        else video.pause();
      });
    }, { threshold: 0.7 });
    videoRefs.current.forEach(v => observer.observe(v));
    return () => observer.disconnect();
  }, [videos]);

  const filtered = useMemo(() => {
    return videos.filter((v: any) => {
      const catId = (v.categorieId || v.categorie || "").toLowerCase();
      const act = (v.activiteId || v.activite || "").toLowerCase();
      const q = search.toLowerCase();
      
      // Filtre technique = soudeur + tout travaux même régime
      if (filter !== "all") {
        const isTech = filter === "technique" && (catId.includes("technique") || act.includes("soudeur") || act.includes("tout-travaux"));
        if (filter === "technique" && !isTech) return false;
        if (filter !== "technique" && !catId.includes(filter)) return false;
      }
      
      if (search && !`${v.titre} ${v.description} ${v.user} ${v.profession} ${act} ${catId}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [videos, filter, search]);

  const getCategorieInfo = (v: any) => {
    const cat = getCategorieById((v.categorieId || v.categorie || "").toLowerCase());
    return cat ? { label: cat.titreCourt, icon: cat.icon } : { label: v.categorie || "Autre", icon: "📦" };
  };

  const getWaLink = (v: any) => {
    const catInfo = getCategorieInfo(v);
    const isSpecial = (v.activite || "").toLowerCase().includes("soudeur") || (v.activite || "").toLowerCase().includes("tout-travaux");
    const regimeTxt = isSpecial ? "Régime Prestataire Technique Unique - Soudeur + Tout travaux 5$" : "Régime Prestataire";
    const msg = `Bonjour ${v.user}, je viens de WENZE VIDÉO 🎬 ${catInfo.label} - ${regimeTxt} - Je veux "${v.titre}" à ${v.prix}$ - owner ${cleanWhatsapp(v.ownerWhatsapp).slice(-4)}`;
    return `https://wa.me/${cleanWhatsapp(v.ownerWhatsapp || v.whatsapp)}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="max-w-[430px] mx-auto bg-black min-h-screen pb-20 text-white">
      <header className="sticky top-0 bg-black/90 backdrop-blur z-20 p-4 border-b border-white/10">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xs font-bold">← Accueil</Link>
          <h1 className="font-black text-[12px] text-center leading-tight">WENZE VIDÉO 🎬 • {filtered.length}/{videos.length} vidéos • Régime prestataire unique</h1>
          <Link href="/publier?boost=video" className="text-[10px] bg-[#6C3CE0] px-3 py-2 rounded-full font-bold">➕ Publier</Link>
        </div>
        
        <div className="mt-3 space-y-2">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cherche vidéo: soudeur, tout travaux, coiffure..." className="w-full bg-white/10 border border-white/10 rounded-full py-2.5 px-4 text-[12px] text-white placeholder:text-white/40 outline-none focus:border-[#6C3CE0]" />
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {[
              { id: "all", label: "Toutes" },
              { id: "technique", label: "🔧 Technique - Soudeur + Tout travaux même régime prestataire" },
              { id: "beaute", label: "💅 Beauté" },
              { id: "commerce", label: "👕 Commerce" },
              { id: "alimentation", label: "🍲 Alimentation" },
            ].map(f => (
              <button key={f.id} onClick={()=>setFilter(f.id as any)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold border ${filter===f.id ? "bg-white text-black border-white" : "bg-white/10 text-white/70 border-white/10"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[9px] text-white/50 mt-2">Taux 1$ = {TAUX_CDF} CDF • Soudeur + Tout travaux = même régime prestataire Pro 5$ • 10MB MAX</p>
      </header>

      {filtered.length === 0 ? (
        <div className="p-10 text-center mt-10">
          <p className="text-6xl">🎬</p>
          <p className="font-bold mt-4">{videos.length === 0 ? "Pas encore de vidéos 10MB" : `Pas de vidéo dans ${filter}`}</p>
          <p className="text-[11px] opacity-60 mt-2">{videos.length === 0 ? "Publie ta première vidéo verticale max 10MB" : `Filtre: ${filter} • Recherche: ${search || "aucune"}`}<br/>Régime prestataire unique: soudeur + tout travaux = Pro 5$</p>
          <Link href="/publier?boost=video" className="mt-6 inline-block bg-white text-black px-6 py-3 rounded-full font-bold text-sm">Publier vidéo 🎬</Link>
        </div>
      ) : (
        <div className="snap-y snap-mandatory h-[calc(100vh-120px)] overflow-y-scroll">
          {filtered.map((v) => {
            const catInfo = getCategorieInfo(v);
            const isSpecialRegime = (v.activiteId || v.activite || "").toLowerCase().includes("soudeur") || (v.activiteId || v.activite || "").toLowerCase().includes("tout-travaux");
            return (
              <div key={v.id} className="snap-start h-[calc(100vh-120px)] relative flex items-end bg-black border-b border-white/5">
                <video 
                  ref={(el) => { if (el) videoRefs.current.set(v.id, el); }}
                  src={v.video} 
                  className="absolute inset-0 w-full h-full object-contain bg-black" 
                  loop 
                  muted 
                  playsInline 
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />
                
                <div className="relative p-4 w-full z-10">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span className="text-[9px] bg-white/20 backdrop-blur px-2 py-1 rounded-full font-bold">🎬 10MB MAX</span>
                    <span className="text-[9px] bg-green-500/80 px-2 py-1 rounded-full font-bold">🔒 {cleanWhatsapp(v.ownerWhatsapp||v.whatsapp).slice(-4)}</span>
                    <span className="text-[9px] bg-[#6C3CE0] px-2 py-1 rounded-full font-bold">{v.prix}$ • {catInfo.icon} {catInfo.label}</span>
                    {isSpecialRegime && <span className="text-[8px] bg-[#00C950] px-2 py-1 rounded-full font-bold">PRESTATAIRE • Soudeur + Tout travaux même régime</span>}
                  </div>
                  <p className="font-black text-[18px] leading-tight">{v.titre}</p>
                  <p className="text-[13px] opacity-90 mt-1">👤 {v.user} • {v.profession || catInfo.label} • Régime: prestataire</p>
                  <p className="text-[11px] opacity-60 mt-1 line-clamp-2">{v.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <a href={getWaLink(v)} target="_blank" className="bg-[#00C950] text-white text-center py-3 rounded-full font-black text-sm">💬 WhatsApp</a>
                    <Link href={`/boutique/${encodeURIComponent(v.ownerWhatsapp||v.whatsapp)}`} className="bg-white/10 backdrop-blur text-white text-center py-3 rounded-full font-bold text-sm border border-white/20">🏪 Boutique</Link>
                  </div>
                </div>

                <div className="absolute right-2 bottom-32 z-10 flex flex-col gap-4">
                  <div className="text-center"><p className="text-xl">❤️</p><p className="text-[10px]">Wenze</p></div>
                  <div className="text-center"><p className="text-xl">💬</p><p className="text-[10px]">{v.user?.slice(0,4)}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
