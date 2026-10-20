"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function VideoPage() {
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const vids = list.filter((a:any) => a.typeMedia === "video" || a.video).reverse();
      setVideos(vids);
    } catch {}
  }, []);

  const getWaLink = (titre: string, prix: string, tel: string) => {
    const msg = `Bonjour depuis WENZE VIDEO, je veux ${titre} à ${prix}`;
    return `https://wa.me/${cleanWhatsapp(tel)}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="max-w-[430px] mx-auto bg-black min-h-screen pb-20 text-white">
      <header className="sticky top-0 bg-black z-20 p-4 flex justify-between items-center border-b border-white/10">
        <Link href="/" className="text-xs font-bold">← Accueil</Link>
        <h1 className="font-black">WENZE VIDÉO 🎬</h1>
        <Link href="/publier?boost=video" className="text-xs bg-[#6C3CE0] px-3 py-1 rounded-full font-bold">➕ Publier</Link>
      </header>

      {videos.length === 0 ? (
        <div className="p-10 text-center mt-20">
          <p className="text-6xl">🎬</p>
          <p className="font-bold mt-4">Pas encore de vidéos</p>
          <Link href="/publier?boost=video" className="mt-4 inline-block bg-white text-black px-6 py-3 rounded-full font-bold text-sm">Publier première vidéo</Link>
        </div>
      ) : (
        <div className="snap-y snap-mandatory h-[calc(100vh-80px)] overflow-y-scroll">
          {videos.map((v) => (
            <div key={v.id} className="snap-start h-[calc(100vh-80px)] relative flex items-end bg-black">
              <video src={v.video} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="relative p-4 w-full z-10">
                <p className="font-bold text-[16px]">{v.titre}</p>
                <p className="text-sm opacity-90">{v.prix} • {v.user}</p>
                <p className="text-[11px] opacity-70 mt-1 truncate">{v.description}</p>
                <a href={getWaLink(v.titre, v.prix, v.whatsapp)} target="_blank" className="mt-3 block w-full bg-[#00C950] text-white text-center py-3 rounded-full font-bold">💬 WhatsApp {v.whatsapp}</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
