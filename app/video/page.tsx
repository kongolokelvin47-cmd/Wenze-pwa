"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function VideoPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      // ✅ Seulement vidéos + ownerWhatsapp vérifié
      const vids = list.filter((a:any) => (a.typeMedia === "video" || a.video) && (a.ownerWhatsapp || a.whatsapp)).reverse();
      setVideos(vids);
    } catch {}
  }, []);

  // ✅ Anti-facture: joue seulement la vidéo visible (TikTok)
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

  const getWaLink = (v: any) => {
    const msg = `Bonjour ${v.user}, je viens de WENZE VIDÉO 🎬, je veux "${v.titre}" à ${v.prix}$ - owner ${cleanWhatsapp(v.ownerWhatsapp).slice(-4)}`;
    return `https://wa.me/${cleanWhatsapp(v.ownerWhatsapp || v.whatsapp)}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="max-w-[430px] mx-auto bg-black min-h-screen pb-20 text-white">
      <header className="sticky top-0 bg-black/90 backdrop-blur z-20 p-4 flex justify-between items-center border-b border-white/10">
        <Link href="/" className="text-xs font-bold">← Accueil</Link>
        <h1 className="font-black text-sm">WENZE VIDÉO 🎬 • {videos.length} vidéos 10MB</h1>
        <Link href="/publier?boost=video" className="text-[10px] bg-[#6C3CE0] px-3 py-2 rounded-full font-bold">➕ Publier</Link>
      </header>

      {videos.length === 0 ? (
        <div className="p-10 text-center mt-20">
          <p className="text-6xl">🎬</p>
          <p className="font-bold mt-4">Pas encore de vidéos 10MB</p>
          <p className="text-[11px] opacity-60 mt-2">Publie ta première vidéo verticale max 10MB (anti-facture)</p>
          <Link href="/publier?boost=video" className="mt-6 inline-block bg-white text-black px-6 py-3 rounded-full font-bold text-sm">Publier première vidéo 🎬</Link>
        </div>
      ) : (
        <div className="snap-y snap-mandatory h-[calc(100vh-64px)] overflow-y-scroll">
          {videos.map((v) => (
            <div key={v.id} className="snap-start h-[calc(100vh-64px)] relative flex items-end bg-black border-b border-white/5">
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
                <div className="flex gap-2 mb-2">
                  <span className="text-[9px] bg-white/20 backdrop-blur px-2 py-1 rounded-full font-bold">🎬 10MB MAX</span>
                  <span className="text-[9px] bg-green-500/80 px-2 py-1 rounded-full font-bold">🔒 owner {cleanWhatsapp(v.ownerWhatsapp||v.whatsapp).slice(-4)}</span>
                  <span className="text-[9px] bg-[#6C3CE0] px-2 py-1 rounded-full font-bold">{v.prix}$</span>
                </div>
                <p className="font-black text-[18px] leading-tight">{v.titre}</p>
                <p className="text-[13px] opacity-90 mt-1">👤 {v.user} • {v.categorie}</p>
                <p className="text-[11px] opacity-60 mt-1 line-clamp-2">{v.description}</p>
                
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <a href={getWaLink(v)} target="_blank" className="bg-[#00C950] text-white text-center py-3 rounded-full font-black text-sm">💬 WhatsApp</a>
                  <Link href={`/boutique/${encodeURIComponent(v.ownerWhatsapp||v.whatsapp)}`} className="bg-white/10 backdrop-blur text-white text-center py-3 rounded-full font-bold text-sm border border-white/20">🏪 Boutique</Link>
                </div>
              </div>

              {/* Boutons droite style TikTok */}
              <div className="absolute right-2 bottom-32 z-10 flex flex-col gap-4">
                <div className="text-center"><p className="text-xl">❤️</p><p className="text-[10px]">Wenze</p></div>
                <div className="text-center"><p className="text-xl">💬</p><p className="text-[10px]">{v.user?.slice(0,4)}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 🔥 FIX VERCEL OBLIGATOIRE - SANS ÇA TES 292 RESTENT ROUGES
export const dynamic = 'force-dynamic';
