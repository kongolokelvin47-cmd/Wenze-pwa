"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE } from "@/lib/categories";
import { FORMULES, TAUX_CDF } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function WenzeBusiness() {
  const [search, setSearch] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      setAnnonces(list.reverse()); // dernières d'abord
    } catch {}
  }, []);
  
  const getWaLink = (v: any) => {
    const prixTxt = v.prixCDF || `${v.prix}$`;
    const msg = `Bonjour ${v.user} 👋 Je viens de WENZE BUSINESS, je veux "${v.titre}" à ${prixTxt} - owner ${cleanWhatsapp(v.ownerWhatsapp||v.whatsapp).slice(-4)}`;
    return `https://wa.me/${cleanWhatsapp(v.ownerWhatsapp||v.whatsapp)}?text=${encodeURIComponent(msg)}`;
  };

  const filteredCats = CATEGORIES_WENZE.filter(c => 
    !search || c.titreCourt.toLowerCase().includes(search.toLowerCase()) || c.titre.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAnnonces = annonces.filter(a => 
    !search || a.titre?.toLowerCase().includes(search.toLowerCase()) || a.description?.toLowerCase().includes(search.toLowerCase()) || a.categorie?.toLowerCase().includes(search.toLowerCase())
  );

  const flashAnnonces = filteredAnnonces.filter(a => a.typeMedia === "image" || a.photo).slice(0, 6);
  const videoAnnonces = filteredAnnonces.filter(a => a.typeMedia === "video" || a.video).slice(0, 6);

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-20">
      <header className="sticky top-0 bg-white z-20 p-4 border-b shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[22px] font-black text-[#6C3CE0] leading-none">WENZE WENZE</h1>
            <p className="text-[11px] font-bold text-[#FF6B35] tracking-[3px]">BUSINESS • {annonces.length}/3</p>
          </div>
          <div className="flex gap-3 text-xl">
            <Link href="/publier">➕</Link> 
            <Link href="/profil">👤</Link>
          </div>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Que recherchez-vous à Kinshasa ?" className="w-full bg-gray-100 rounded-full py-3 px-5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
          <span className="absolute left-3 top-3.5">🔍</span>
        </div>
      </header>

      <div className="m-4 rounded-2xl bg-gradient-to-br from-[#6C3CE0] to-[#FF6B35] p-[1px]">
        <div className="bg-black rounded-2xl h-[160px] flex items-end p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
          <div className="relative text-white z-10">
            <h2 className="font-bold text-[18px]">Achetez, Vendez, Gagnez</h2>
            <p className="text-[11px] opacity-90 mt-1">0% commission • Pro {FORMULES.pro.prix}$ • Image 150KB • Vidéo 10MB • ownerWhatsapp</p>
          </div>
        </div>
      </div>

      <section className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">10 Métiers de Kinshasa</h3>
          <Link href="/categories" className="text-[#6C3CE0] text-xs font-bold">Tout voir</Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {filteredCats.map(c => (
            <Link key={c.id} href={`/categorie/${c.id}`} className="flex flex-col items-center gap-1 group">
              <div className="w-14 h-14 rounded-xl bg-white border flex items-center justify-center text-2xl group-hover:bg-[#6C3CE0] group-hover:text-white transition shadow-sm">
                {c.icon}
              </div>
              <span className="text-[9px] font-bold text-center leading-tight uppercase">{c.titreCourt}</span>
            </Link>
          ))}
        </div>
      </section>

      {videoAnnonces.length > 0 && (
        <section className="px-4 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Wenze Vidéo 🎬 10MB</h3>
            <Link href="/video" className="text-[#6C3CE0] text-xs font-bold">Voir tout ›</Link>
          </div>
          <div className="flex gap-3 mt-3 overflow-x-auto pb-2 -mx-4 px-4">
            {videoAnnonces.map((v) => (
              <Link key={v.id} href="/video" className="min-w-[140px] w-[140px] relative rounded-xl overflow-hidden bg-black h-[200px] flex-shrink-0">
                <video src={v.video} className="w-full h-full object-cover" muted preload="metadata" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-2">
                  <p className="text-white text-[11px] font-bold truncate">{v.titre}</p>
                  <p className="text-white/80 text-[10px]">🔒 {cleanWhatsapp(v.ownerWhatsapp||v.whatsapp).slice(-4)} • {v.prix}$</p>
                </div>
                <span className="absolute top-2 left-2 bg-[#FF6B35] text-white text-[8px] px-2 py-1 rounded-full font-bold">10MB</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 mt-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">Ventes Flash 150KB ({filteredAnnonces.length})</h3>
          <Link href="/ventes-flash" className="text-[#6C3CE0] text-xs font-bold">Voir tout ›</Link>
        </div>
        
        {flashAnnonces.length === 0 ? (
          <div className="mt-3 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">📸</p>
            <p className="text-sm font-bold mt-2">Pas encore de produits</p>
            <p className="text-[11px] text-gray-500 mt-1">Image 150KB • Vidéo 10MB • ownerWhatsapp</p>
            <Link href="/publier" className="mt-3 inline-block bg-[#6C3CE0] text-white text-xs font-bold px-6 py-3 rounded-full">Publier maintenant ➕</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {flashAnnonces.map((p) => {
              const prixTxt = p.prixCDF || `${p.prix}$`;
              return (
                <div key={p.id} className="border rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden relative">
                    {p.photo ? <img src={p.photo} alt={p.titre} className="max-w-full max-h-full object-contain" /> : <span className="text-3xl">📦</span>}
                    <span className="absolute top-2 left-2 bg-[#FF6B35] text-white text-[9px] px-2 py-1 rounded-full font-bold">150KB</span>
                    <span className="absolute top-2 right-2 bg-black/70 text-white text-[8px] px-2 py-1 rounded-full">🔒 {cleanWhatsapp(p.ownerWhatsapp||p.whatsapp).slice(-4)}</span>
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-[#6C3CE0] text-sm truncate">{prixTxt}</p>
                    <p className="text-[11px] font-semibold truncate">{p.titre}</p>
                    <p className="text-[9px] text-gray-400 truncate">👤 {p.user} • {p.categorie}</p>
                    <a href={getWaLink(p)} target="_blank" className="mt-2 w-full bg-[#00C950] text-white text-[11px] font-bold py-2 rounded-full flex justify-center">💬 WhatsApp</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Link href="/abonnement" className="m-4 bg-[#6C3CE0] rounded-xl p-4 text-white flex justify-between items-center">
        <div>
          <h4 className="font-bold text-sm">Devenez Boutique Pro 👑</h4>
          <p className="text-[11px] opacity-90">{FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF - 0% commission - 150KB/10MB</p>
        </div>
        <span className="bg-[#FF6B35] text-white text-xs font-bold px-4 py-2 rounded-full">Pro {FORMULES.pro.prix}$</span>
      </Link>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-3 text-[11px] z-30">
        <span className="font-bold text-[#6C3CE0] flex flex-col items-center"><span className="text-base">🏠</span>Accueil</span>
        <Link href="/boutiques" className="flex flex-col items-center text-gray-500"><span className="text-base">🏪</span>Boutiques</Link>
        <Link href="/publier" className="flex flex-col items-center text-gray-500"><span className="text-base">➕</span>Vendre</Link>
        <Link href="/video" className="flex flex-col items-center text-gray-500"><span className="text-base">🎬</span>Vidéo</Link>
        <Link href="/profil" className="flex flex-col items-center text-gray-500"><span className="text-base">👤</span>Profil</Link>
      </nav>
    </div>
  );
}

// 🔥 FIX VERCEL FINAL - SANS ÇA TES 292 RESTENT ROUGES
export const dynamic = 'force-dynamic';
