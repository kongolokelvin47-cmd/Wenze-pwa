"use client";
import { useState } from "react";
import Link from "next/link";

// FIX ECRAN BLANC: plus d'import lib/paiement - c'est lui qui faisait planter l'accueil
const TAUX_CDF = 2300;
const FREEMIUM_MAX = 3;

export const APP_NAME = "WENZE WENZE BUSINESS";

export function fmtUSD(n: any): string {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
export function toCDFString(n:any): string {
  try{ const v = Number(n||0); return isNaN(v)?"0 CDF":(v*TAUX_CDF).toLocaleString()+" CDF"; }catch{ return "0 CDF"; }
}
function safePrix(p:any){ const v=Number(p||0); return isNaN(v)?0:v; }

/** NOUVEAU MESSAGE - Ton modèle exact + LIEN CLIQUABLE */
export function buildWenzeMessage(a:any): string {
  const base = typeof window!=="undefined" ? window.location.origin : "https://wenze.cd";
  const lien = `${base}/produit/${encodeURIComponent(a?.id || "")}`;
  const prixUSD = fmtUSD(a?.prix);
  const prixCDF = toCDFString(a?.prix);
  return `Bonjour,

Je vous contacte depuis Wenze Wenze Business.

Je suis intéressé(e) par votre article :

- Article : ${a?.titre || "Article"}
- Prix affiché : ${prixUSD}$ / ${prixCDF}
- Référence : ${a?.id || "WENZE"}

Je souhaiterais acheter cet article. Est-il toujours disponible ?

Merci de bien vouloir me renseigner sur les modalités d'achat.

Cordialement.

Lien annonce : ${lien}`;
}

/** Lien WhatsApp valide : 243 + 9 chiffres */
export function waLink(wa: any, text: string): string {
  const d = (wa || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
  if (!d) return "";
  const full = d.length <= 9 ? "243" + d : d.startsWith("243") ? d : "243"+d.slice(-9);
  return "https://wa.me/" + full + "?text=" + encodeURIComponent(text);
}
// Raccourci: waLink avec le nouveau message automatique
export function waLinkForAnnonce(a:any): string {
  const wa = a?._wa || a?.ownerWhatsapp || a?.whatsapp || a?.userId || "";
  return waLink(wa, buildWenzeMessage(a));
}

/* ---------- PARTAGE IMAGE + LIEN ---------- */
export function shareProductImage(a:any){
  try{
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFBF0"; ctx.fillRect(0,0,1080,1350);
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,1080,120);
    ctx.fillStyle = "#fff"; ctx.font = "900 42px Arial"; ctx.textAlign = "left"; ctx.fillText("WENZE WENZE BUSINESS", 40, 75);
    const finish = (img?: HTMLImageElement)=>{
      if(img){ try{ ctx.drawImage(img, 40, 160, 1000, 700); }catch{ ctx.fillStyle="#eee"; ctx.fillRect(40,160,1000,700); } }
      else { ctx.fillStyle="#eee"; ctx.fillRect(40,160,1000,700); ctx.fillStyle="#000"; ctx.font="200px Arial"; ctx.textAlign="center"; ctx.fillText("📦", 540, 600); ctx.textAlign="left"; }
      ctx.fillStyle = "#000"; ctx.font = "900 48px Arial";
      ctx.fillText((a.titre||"Article").slice(0,34), 40, 940);
      ctx.fillStyle = "#6C3CE0"; ctx.font = "900 56px Arial";
      ctx.fillText(`${fmtUSD(a.prix)}$ / ${toCDFString(a.prix)}`, 40, 1020);
      ctx.fillStyle = "#666"; ctx.font = "28px Arial";
      ctx.fillText(`Réf: ${a.id} • ${a.commune||"Kinshasa"}`.slice(0,60), 40, 1080);
      const base = window.location.origin;
      const lien = `${base}/produit/${encodeURIComponent(a.id)}`;
      ctx.fillStyle = "#25D366"; ctx.fillRect(40, 1140, 1000, 110);
      ctx.fillStyle = "#fff"; ctx.font = "900 32px Arial"; ctx.textAlign = "center";
      ctx.fillText("👉 Clique pour acheter sur Wenze", 540, 1210);
      ctx.fillStyle = "#000"; ctx.font = "24px Arial"; ctx.fillText(lien, 540, 1300);
      canvas.toBlob(async (blob)=>{
        if(!blob) return;
        const file = new File([blob], `wenze-${a.id}.png`, { type:"image/png" });
        const text = `🛍️ ${a.titre} - ${fmtUSD(a.prix)}$ sur Wenze !\n\n👉 ${lien}`;
        try{
          if(navigator.share && (navigator as any).canShare?.({ files:[file] })){
            await navigator.share({ title: a.titre, text, files:[file] });
          } else {
            const url = URL.createObjectURL(blob);
            const l = document.createElement("a"); l.href=url; l.download=`wenze-${a.id}.png`; l.click();
            await navigator.clipboard.writeText(text);
            alert("Image téléchargée + lien copié ! Colle-le sur WhatsApp / Facebook / Statut.");
          }
        }catch{}
      }, "image/png");
    };
    if(a.photo && typeof a.photo==="string" && a.photo.length>10){
      const img = new Image(); img.crossOrigin="anonymous";
      img.onload = ()=> finish(img); img.onerror = ()=> finish();
      img.src = a.photo;
    } else finish();
  }catch{}
}

function statusText(ab: any): string {
  if (!ab) return "";
  if (ab.isCache) return "🔒 Compte caché";
  if (ab.isPaye) return (ab.badge || "✅") + " " + (ab.palierId || "Ticket") + " • " + (ab.joursRestants ?? 0) + "j • " + (ab.placesRestantes || 0) + " places libres";
  return "🆓 Gratuit " + (ab.count || 0) + "/" + FREEMIUM_MAX + " • " + (ab.joursRestants ?? 30) + "j";
}

const ICON_BTN = "relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 border";

/* ---------- En-tête ---------- */
export function HomeHeader(props: {
  ab: any; payantCount: number; boostedCount: number; notifCount: number; cartCount: number;
  search: string; onSearch: (v: string) => void;
  tabs: { id: string; label: string; count: number }[];
  selectedCat: string; onSelectCat: (id: string) => void; totalCount: number;
  inviteCount?: number; inviteEnAttente?: number; filleulCount?: number;
}) {
  const { ab, payantCount, boostedCount, notifCount, cartCount, search, onSearch, tabs, selectedCat, onSelectCat, totalCount, inviteCount=0, inviteEnAttente=0, filleulCount=0 } = props;
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
        <Link href="/mes-invitations" className={ICON_BTN + " bg-[#FFF2CC]"} title="Mes invitations">
          🎁
          {inviteEnAttente > 0 ? (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-black px-1">{inviteEnAttente > 99 ? "99+" : inviteEnAttente}</span>
          ) : inviteCount > 0 ? (
            <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[9px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-black px-1">{inviteCount > 99 ? "99+" : inviteCount}</span>
          ) : null}
        </Link>
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
        <Link href="/mes-invitations" className="px-4 py-2 rounded-full text-[10px] font-bold bg-[#FFF2CC] border-2 border-orange-300 whitespace-nowrap flex items-center">🎁 Invitations {inviteCount>0 ? `• ${inviteCount}` : ""}</Link>
        <Link href="/inviter" className="px-4 py-2 rounded-full text-[10px] font-black bg-black text-white whitespace-nowrap flex items-center">+ Inviter</Link>
      </div>
    </header>
  );
}

/* ---------- Carte d'annonce ---------- */
export function AnnonceCard(props: {
  a: any; icon: string; onMedia: (a: any) => void; onOpen: (a: any) => void; onCart: (a: any) => void;
  isFilleul?: boolean;
}) {
  const { a, icon, onMedia, onOpen, onCart, isFilleul=false } = props;
  const wa = waLinkForAnnonce(a);

  return (
    <div className={"bg-white border rounded-2xl overflow-hidden flex flex-col " + (a.isBoosted ? "border-2 border-green-500" : isFilleul ? "border-2 border-orange-300" : "")}>
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
        {a.isBoosted && <span className="absolute top-2 right-2 text-[8px] px-2 py-1 rounded-full font-black bg-green-500 text-white">🚀 TOP</span>}
        {isFilleul && !a.isBoosted && <span className="absolute top-2 right-2 text-[8px] px-2 py-1 rounded-full font-black bg-orange-500 text-white">🎁 Filleul</span>}
      </button>
      <div className="p-2.5 flex-1 flex flex-col">
        <button type="button" onClick={() => onOpen(a)} className="text-left font-bold text-[12px] line-clamp-2">{a.titre}</button>
        <p className="font-black text-[12px] mt-1">{fmtUSD(a.prix)}$ / {a.prixCDF || toCDFString(a.prix)}</p>
        <p className="text-[9px] text-gray-500 mt-0.5 truncate">Réf: {a.id} • {a.vendeurNom || a.commune || "Kinshasa"}</p>
        {isFilleul && <p className="text-[8px] text-orange-600 font-bold mt-0.5">🎁 Boutique que tu as invitée</p>}
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white text-center py-2.5 rounded-full font-bold text-[10px]">WhatsApp</a>
          ) : (
            <span className="bg-gray-200 text-gray-500 text-center py-2.5 rounded-full font-bold text-[10px]">Sans WhatsApp</span>
          )}
          <button type="button" onClick={() => onCart(a)} className="bg-white border-2 border-black text-black py-2.5 rounded-full font-bold text-[10px]">🛒 Panier</button>
        </div>
        <button type="button" onClick={()=>shareProductImage(a)} className="w-full mt-1.5 bg-black text-white py-2 rounded-full font-bold text-[9px]">📤 Partager Image + Lien</button>
      </div>
    </div>
  );
}

/* ---------- Visionneuse photo ---------- */
export function ImageViewer(props: { a: any; onClose: () => void; onOpen: (a: any) => void; onCart: (a: any) => void; isFilleul?: boolean }) {
  const { a, onClose, onOpen, onCart, isFilleul=false } = props;
  const [idx, setIdx] = useState(0);
  const images: string[] = a.images && a.images.length ? a.images : a.photo ? [a.photo] : [];
  const current = images[idx] || "";
  const wa = waLinkForAnnonce(a);

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[400px] max-h-[90vh] overflow-y-auto" onClick={(e: any) => e.stopPropagation()}>
        <div className="relative bg-[#FFFBF0] flex items-center justify-center min-h-[200px]">
          {current ? <img src={current} alt={a.titre} className="max-h-[55vh] w-full object-contain" /> : <span className="text-5xl">📦</span>}
          <button type="button" onClick={onClose} className="absolute top-2 right-2 w-9 h-9 bg-black text-white rounded-full font-bold">✕</button>
          {isFilleul && <span className="absolute top-2 left-2 text-[9px] px-2 py-1 rounded-full font-black bg-orange-500 text-white">🎁 Filleul</span>}
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
          <p className="text-[10px] text-gray-500 mt-1">Taux {TAUX_CDF} • {a.commune || "Kinshasa"} • Réf: {a.id}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onOpen(a)} className="col-span-2 bg-black text-white py-3 rounded-full font-black text-[12px]">Voir l'annonce</button>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white text-center py-3 rounded-full font-bold text-[11px]">WhatsApp</a>
            ) : (
              <span className="bg-gray-200 text-gray-500 text-center py-3 rounded-full font-bold text-[11px]">Sans WhatsApp</span>
            )}
            <button type="button" onClick={() => onCart(a)} className="bg-white border-2 border-black py-3 rounded-full font-bold text-[11px]">🛒 Panier</button>
            <button type="button" onClick={()=>shareProductImage(a)} className="col-span-2 bg-[#FFF2CC] border-2 border-black py-3 rounded-full font-black text-[11px]">📤 Partager Image + Lien</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Barre de navigation ---------- */
export function BottomNav({ notifCount, inviteEnAttente=0 }: { notifCount: number; inviteEnAttente?: number }) {
  const item = "flex flex-col items-center gap-0.5 text-gray-500";
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
      <Link href="/" className="font-bold text-black flex flex-col items-center gap-0.5"><span className="text-[18px]">🏠</span>Accueil</Link>
      <Link href="/video" className={item}><span className="text-[18px]">🎥</span>Vidéo</Link>
      <Link href="/publier" className={item}>
        <span className="text-[22px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">+</span>Publier
      </Link>
      <Link href="/inviter" className={item + " relative"}>
        <span className="text-[18px]">🎁</span>Inviter
        {inviteEnAttente > 0 ? <span className="absolute -top-1 left-4 bg-orange-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">{inviteEnAttente}</span> : null}
      </Link>
      <Link href="/profil" className={item + " relative"}>
        <span className="text-[18px]">👤</span>Profil
        {notifCount > 0 ? (
          <span className="absolute -top-1 left-3 bg-red-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">{notifCount}</span>
        ) : null}
      </Link>
    </nav>
  );
           }
