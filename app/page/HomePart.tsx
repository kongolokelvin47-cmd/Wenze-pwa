"use client";
import { useState } from "react";
import Link from "next/link";
import { FREEMIUM, TAUX_CDF, toCDFString } from "@/lib/paiement";

export const APP_NAME = "WENZE WENZE BUSINESS";

/** 25 -> "25", 0.5 -> "0.50" */
export function fmtUSD(n: any): string {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** Lien WhatsApp valide : ajoute l'indicatif RDC (243) aux numéros locaux de 9 chiffres. */
export function waLink(wa: any, text: string): string {
  const d = (wa || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
  if (!d) return "";
  const full = d.length <= 9 ? "243" + d : d;
  return "https://wa.me/" + full + "?text=" + encodeURIComponent(text);
}

function statusText(ab: any): string {
  if (!ab) return "";
  if (ab.isCache) return "🔒 Compte caché";
  if (ab.isPaye) return (ab.badge || "✅") + " " + (ab.palierId || "Ticket") + " • " + (ab.joursRestants ?? 0) + "j • " + (ab.placesRestantes || 0) + " places libres";
  return "🆓 Gratuit " + (ab.count || 0) + "/" + FREEMIUM.maxImages + " • " + (ab.joursRestants ?? 30) + "j";
}

const ICON_BTN = "relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 border";

/* ---------- En-tête : nom, état du compte, recherche, catégories ---------- */
export function HomeHeader(props: {
  ab: any;
  payantCount: number;
  boostedCount: number;
  notifCount: number;
  cartCount: number;
  search: string;
  onSearch: (v: string) => void;
  tabs: { id: string; label: string; count: number }[];
  selectedCat: string;
  onSelectCat: (id: string) => void;
  totalCount: number;
}) {
  const { ab, payantCount, boostedCount, notifCount, cartCount, search, onSearch, tabs, selectedCat, onSelectCat, totalCount } = props;
  const tab = (active: boolean) =>
    "px-4 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap " + (active ? "bg-black text-white border-black" : "bg-white");

  return (
    <header className="sticky top-0 bg-white z-20 border-b">
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white font-black shrink-0">W</div>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[13px] leading-tight truncate">{APP_NAME}</h1>
          <Link href={ab?.isCache ? "/abonnement" : "/tarifs"} className="block text-[9px] text-gray-500 truncate">
            {statusText(ab)}
            {ab ? " • " : ""}Kinshasa • {payantCount} payants • {boostedCount} TOP
          </Link>
        </div>
        <Link href="/notifications" className={ICON_BTN + " bg-[#FFFBF0]"}>
          🔔
          {notifCount > 0 ? (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-black px-1">
              {notifCount > 99 ? "99+" : notifCount}
            </span>
          ) : null}
        </Link>
        <Link href="/panier" className={ICON_BTN + " bg-[#FFFBF0]"}>
          🛒
          {cartCount > 0 ? (
            <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-black px-1">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          ) : null}
        </Link>
        <Link href="/profil" className={ICON_BTN + " bg-black text-white border-black"}>👤</Link>
      </div>

      <div className="px-4 pb-3 flex gap-2">
        <div className="flex-1 relative">
          <input
            value={search}
            onChange={(e: any) => onSearch(e.target.value)}
            placeholder="Recherche sacs, riz, coiffure, Gombe..."
            className="w-full border-2 pl-10 pr-4 p-3 rounded-full text-[13px] bg-[#FFFBF0] outline-none focus:border-black"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>
        <Link href="/publier" className="bg-black text-white px-5 rounded-full font-black text-[12px] shrink-0 flex items-center">+ Publier</Link>
      </div>

      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        <button type="button" onClick={() => onSelectCat("all")} className={tab(selectedCat === "all")}>
          Tout • {totalCount}
          {boostedCount ? " 🚀" + boostedCount : ""}
        </button>
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => onSelectCat(t.id)} className={tab(selectedCat === t.id)}>
            {t.label} • {t.count}
          </button>
        ))}
        <Link href="/tarifs" className="px-4 py-2 rounded-full text-[10px] font-bold bg-white border-2 whitespace-nowrap flex items-center">🎫 Tarifs</Link>
      </div>
    </header>
  );
}

/* ---------- Carte d'annonce ---------- */
export function AnnonceCard(props: {
  a: any;
  icon: string;
  onMedia: (a: any) => void;
  onOpen: (a: any) => void;
  onCart: (a: any) => void;
}) {
  const { a, icon, onMedia, onOpen, onCart } = props;
  const wa = waLink(a._wa, 'Bonjour, je suis intéressé par "' + a.titre + '" à ' + fmtUSD(a.prix) + "$ sur " + APP_NAME);

  return (
    <div className={"bg-white border rounded-2xl overflow-hidden flex flex-col " + (a.isBoosted ? "border-2 border-green-500" : "")}>
      <button type="button" onClick={() => onMedia(a)} className="h-36 bg-[#FFFBF0] flex items-center justify-center overflow-hidden relative">
        {a.isVideo ? (
          <video src={a.photo} className="max-w-full max-h-full object-contain" muted playsInline preload="metadata"></video>
        ) : a.photo ? (
          <img src={a.photo} alt={a.titre} className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="text-3xl">{icon}</span>
        )}
        <span className="absolute top-2 left-2 text-[8px] px-2 py-1 rounded-full font-black bg-black text-white">
          {a.vendeurBadge} {a.vendeurPalier} • {fmtUSD(a.prix)}$
        </span>
      </button>
      <div className="p-2.5 flex-1 flex flex-col">
        <button type="button" onClick={() => onOpen(a)} className="text-left font-bold text-[12px] line-clamp-2">{a.titre}</button>
        <p className="font-black text-[12px] mt-1">{fmtUSD(a.prix)}$ / {a.prixCDF}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white text-center py-2.5 rounded-full font-bold text-[10px]">WhatsApp</a>
          ) : (
            <span className="bg-gray-200 text-gray-500 text-center py-2.5 rounded-full font-bold text-[10px]">Sans WhatsApp</span>
          )}
          <button type="button" onClick={() => onCart(a)} className="bg-white border-2 border-black text-black py-2.5 rounded-full font-bold text-[10px]">🛒 Panier</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Visionneuse photo (ouverte en touchant une image) ---------- */
export function ImageViewer(props: { a: any; onClose: () => void; onOpen: (a: any) => void; onCart: (a: any) => void }) {
  const { a, onClose, onOpen, onCart } = props;
  const [idx, setIdx] = useState(0);
  const images: string[] = a.images && a.images.length ? a.images : a.photo ? [a.photo] : [];
  const current = images[idx] || "";
  const wa = waLink(a._wa, 'Bonjour, je suis intéressé par "' + a.titre + '" à ' + fmtUSD(a.prix) + "$ sur " + APP_NAME);

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[400px] max-h-[90vh] overflow-y-auto" onClick={(e: any) => e.stopPropagation()}>
        <div className="relative bg-[#FFFBF0] flex items-center justify-center min-h-[200px]">
          {current ? <img src={current} alt={a.titre} className="max-h-[55vh] w-full object-contain" /> : <span className="text-5xl">📦</span>}
          <button type="button" onClick={onClose} className="absolute top-2 right-2 w-9 h-9 bg-black text-white rounded-full font-bold">✕</button>
        </div>
        {images.length > 1 ? (
          <div className="flex gap-2 p-3 overflow-x-auto">
            {images.map((src: string, i: number) => (
              <button key={i} type="button" onClick={() => setIdx(i)} className={"shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 " + (i === idx ? "border-black" : "border-gray-200")}>
                <img src={src} alt={"Photo " + (i + 1)} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
        <div className="p-4">
          <p className="font-black text-[14px]">{a.titre}</p>
          <p className="font-black text-[13px] text-[#6C3CE0] mt-1">{fmtUSD(a.prix)}$ / {toCDFString(Number(a.prix) || 0)}</p>
          <p className="text-[10px] text-gray-500 mt-1">Taux {TAUX_CDF} • {a.commune || "Kinshasa"}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onOpen(a)} className="col-span-2 bg-black text-white py-3 rounded-full font-black text-[12px]">Voir l'annonce</button>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white text-center py-3 rounded-full font-bold text-[11px]">WhatsApp</a>
            ) : (
              <span className="bg-gray-200 text-gray-500 text-center py-3 rounded-full font-bold text-[11px]">Sans WhatsApp</span>
            )}
            <button type="button" onClick={() => onCart(a)} className="bg-white border-2 border-black py-3 rounded-full font-bold text-[11px]">🛒 Panier</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Barre de navigation du bas ---------- */
export function BottomNav({ notifCount }: { notifCount: number }) {
  const item = "flex flex-col items-center gap-0.5 text-gray-500";
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
      <Link href="/" className="font-bold text-black flex flex-col items-center gap-0.5"><span className="text-[18px]">🏠</span>Accueil</Link>
      <Link href="/video" className={item}><span className="text-[18px]">🎥</span>Vidéo</Link>
      <Link href="/publier" className={item}>
        <span className="text-[22px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">+</span>Publier
      </Link>
      <Link href="/boutiques" className={item}><span className="text-[18px]">🏬</span>Boutiques</Link>
      <Link href="/profil" className={item + " relative"}>
        <span className="text-[18px]">👤</span>Profil
        {notifCount > 0 ? (
          <span className="absolute -top-1 left-3 bg-red-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">{notifCount}</span>
        ) : null}
      </Link>
    </nav>
  );
  }
          
