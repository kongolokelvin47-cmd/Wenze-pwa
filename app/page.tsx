"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE } from "@/lib/categories";

// Fallback si lib/paiement n'existe pas encore sur Vercel
let FORMULES = { pro: { prix: 5, prixCDF: 11500 }, grossiste: { prix: 25, prixCDF: 57500 } };
let TAUX_CDF = 2300;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const paiement = require("@/lib/paiement");
  FORMULES = paiement.FORMULES || FORMULES;
  TAUX_CDF = paiement.TAUX_CDF || TAUX_CDF;
} catch {}

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function WenzeBusiness() {
  const [search, setSearch] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      setAnnonces(list.reverse());
    } catch {
      setAnnonces([]);
    }
  }, []);
  
  const getWaLink = (v: any) => {
    const num = cleanWhatsapp(v.ownerWhatsapp || v.whatsapp);
    if(!num) return "#";
    const prixTxt = v.prixCDF ? `${v.prixCDF.toLocaleString()} CDF` : `${v.prix}$`;
    const msg = `Bonjour ${v.user || 'vendeur'} 👋 Je viens de WENZE, je veux "${v.titre}" à ${prixTxt}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    const cats = CATEGORIES_WENZE.filter(c => 
      !q || 
      c.titre.toLowerCase().includes(q) || 
      c.titreCourt.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.activites.some(a => a.label.toLowerCase().includes(q))
    );

    const ann = annonces.filter(a => 
      !q || 
      a.titre?.toLowerCase().includes(q) || 
      a.description?.toLowerCase().includes(q) || 
      a.categorie?.toLowerCase().includes(q) ||
      a.user?.toLowerCase().includes(q)
    );

    return { cats, ann };
  }, [search, annonces]);

  const flashAnnonces = filteredData.ann.filter(a => a.typeMedia === "image" || a.photo).slice(0, 6);
  const videoAnnonces = filteredData.ann.filter(a => a.typeMedia === "video" || a.video).slice(0, 6);

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24">
      {/* HEADER - BOUTONS OK */}
      <header className="sticky top-0 bg-white z-20 p-4 border-b shadow-sm">
        <div className="flex justify-between items-center">
          <Link href="/">
            <h1 className="text-[22px] font-black text-[#6C3CE0] leading-none">WENZE WENZE</h1>
            <p className="text-[11px] font-bold text-[#FF6B35] tracking-[3px]">BUSINESS • {annonces.length}/3</p>
          </Link>
          <div className="flex gap-2">
            <Link href="/publier" className="w-9 h-9 bg-[#6C3CE0] rounded-full flex items-center justify-center text-white font-bold">➕</Link> 
            <Link href="/profil" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">👤</Link>
          </div>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Que recherchez-vous ? Ex: soudeur, coiffeur..." className="w-full bg-gray-100 rounded-full py-3 px-5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
          <span className="absolute left-3 top-3.5">🔍</span>
          {search && <button onClick={()=>setSearch("")} className="absolute right-3 top-3 text-gray-400">✕</button>}
        </div>
      </header>

      {/* HERO */}
      <div className="m-4 rounded-2xl bg-gradient-to-br from-[#6C3CE0] to-[#FF6B35] p-[1px]">
        <div className="bg-black rounded-2xl h-[150px] flex items-end p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
          <div className="relative text-white z-10">
            <h2 className="font-bold text-[18px]">Achetez, Vendez, Gagnez</h2>
            <p className="text-[11px] opacity-90 mt-1">0% commission • Pro {FORMULES.pro.prix}$ • W-Pay {TAUX_CDF} CDF</p>
            <Link href="/publier" className="mt-2 inline-block bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-full">Publier +</Link>
          </div>
        </div>
      </div>

      {/* 6 METIERS - BOUTONS OK */}
      <section className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-[15px]">6 Métiers de Kinshasa</h3>
          <Link href="/categories" className="text-[#6C3CE0] text-xs font-bold">Tout voir →</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {filteredData.cats.map(c => (
            <Link key={c.id} href={`/categorie/${c.id}`} className="flex flex-col items-center gap-1.5 bg-white border rounded-2xl p-3 hover:border-[#6C3CE0] hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-[#FFFBF0] flex items-center justify-center text-2xl">
                {c.icon}
              </div>
              <span className="text-[10px] font-bold text-center leading-tight">{c.titreCourt}</span>
              <span className="text-[8px] text-gray-400 text-center line-clamp-1">{c.activites.length} métiers</span>
            </Link>
          ))}
        </div>
        {filteredData.cats.length === 0 && <p className="text-center text-xs text-gray-400 mt-4">Aucun métier trouvé pour "{search}"</p>}
      </section>

      {/* VIDEO - BOUTON VOIR TOUT OK */}
      <section className="px-4 mt-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[15px]">Wenze Vidéo 🎬</h3>
          <Link href="/video" className="text-[#6C3CE0] text-xs font-bold">Voir tout ({videoAnnonces.length}) ›</Link>
        </div>
        {videoAnnonces.length > 0 ? (
          <div className="flex gap-3 mt-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {videoAnnonces.map((v) => (
              <Link key={v.id} href={`/produit/${v.id}`} className="min-w-[135px] w-[135px] relative rounded-xl overflow-hidden bg-black h-[190px] flex-shrink-0 group">
                {v.video ? <video src={v.video} className="w-full h-full object-cover group-hover:scale-105 transition" muted preload="metadata" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                  <p className="text-white text-[11px] font-bold truncate">{v.titre}</p>
                  <p className="text-white/70 text-[9px]">🔒 {cleanWhatsapp(v.ownerWhatsapp||v.whatsapp).slice(-4)} • {v.prix}$</p>
                </div>
                <span className="absolute top-2 left-2 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">VIDEO</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-[11px] text-gray-400">Pas encore de vidéos. <Link href="/publier" className="text-[#6C3CE0] font-bold">Publier une vidéo</Link></div>
        )}
      </section>

      {/* VENTES FLASH - BOUTONS WHATSAPP OK */}
      <section className="px-4 mt-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[15px]">Ventes Flash ({filteredData.ann.length})</h3>
          <Link href="/ventes-flash" className="text-[#6C3CE0] text-xs font-bold">Voir tout ›</Link>
        </div>
        
        {flashAnnonces.length === 0 ? (
          <div className="mt-3 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">📸</p>
            <p className="text-sm font-bold mt-2">{search ? `Pas de résultat pour "${search}"` : "Pas encore de produits"}</p>
            <p className="text-[11px] text-gray-500 mt-1">Soudeur, coiffeur, tout travaux techniques...</p>
            <Link href="/publier" className="mt-3 inline-block bg-[#6C3CE0] text-white text-xs font-bold px-6 py-3 rounded-full">Publier maintenant ➕</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {flashAnnonces.map((p) => {
              const prixTxt = p.prixCDF ? `${p.prixCDF.toLocaleString()} CDF` : `${p.prix}$`;
              return (
                <div key={p.id} className="border rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col hover:shadow-md transition">
                  <Link href={`/produit/${p.id}`} className="w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden relative">
                    {p.photo ? <img src={p.photo} alt={p.titre} className="max-w-full max-h-full object-contain" /> : <span className="text-3xl">📦</span>}
                    <span className="absolute top-2 right-2 bg-black/70 text-white text-[8px] px-2 py-1 rounded-full">🔒 {cleanWhatsapp(p.ownerWhatsapp||p.whatsapp).slice(-4)}</span>
                  </Link>
                  <div className="p-2.5">
                    <p className="font-bold text-[#6C3CE0] text-[13px] truncate">{prixTxt}</p>
                    <Link href={`/produit/${p.id}`}><p className="text-[11px] font-semibold truncate hover:text-[#6C3CE0]">{p.titre}</p></Link>
                    <p className="text-[9px] text-gray-400 truncate">👤 {p.user} • {p.categorie}</p>
                    <a href={getWaLink(p)} target="_blank" rel="noopener noreferrer" className="mt-2 w-full bg-[#00C950] hover:bg-[#00b247] text-white text-[11px] font-bold py-2.5 rounded-full flex justify-center items-center gap-1">💬 WhatsApp</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* PRO BANNER - BOUTON OK */}
      <Link href="/portefeuille" className="m-4 bg-[#6C3CE0] rounded-2xl p-4 text-white flex justify-between items-center hover:bg-[#5a32bd] transition">
        <div>
          <h4 className="font-bold text-[13px]">Devenez Boutique Pro 👑</h4>
          <p className="text-[10px] opacity-90 mt-0.5">{FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF - 0% commission</p>
        </div>
        <span className="bg-[#FF6B35] text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">Pro {FORMULES.pro.prix}$</span>
      </Link>

      {/* BOTTOM NAV - TOUS LES BOUTONS OK */}
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

export const dynamic = 'force-dynamic';
