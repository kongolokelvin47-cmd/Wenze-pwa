"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FREEMIUM, TAUX_CDF, toCDFString } from "@/lib/paiement";

export const APP_NAME = "WENZE WENZE BUSINESS";
export function fmtUSD(n: any): string { const v = Number(n) || 0; return Number.isInteger(v) ? String(v) : v.toFixed(2); }
export function waLink(wa: any, text: string): string { const d = (wa || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, ""); if (!d) return ""; const full = d.length <= 9 ? "243" + d : d; return "https://wa.me/" + full + "?text=" + encodeURIComponent(text); }

function lireMoi(): any { try { if (typeof window === "undefined") return null; return JSON.parse(localStorage.getItem("wenze_user") || "null"); } catch { return null; } }
function lireDesign(): any {
  try {
    let d:any=null;
    const v1 = localStorage.getItem("wenze_design_pub"); if(v1) d=JSON.parse(v1);
    if(!d){ const v2=localStorage.getItem("wenze_dg_v3"); if(v2) d=JSON.parse(v2)?.designPub; }
    return d || { main:"#FF6B00", title:"WENZE WENZE BUSINESS", logo:"", slogan:"Le réseau qui te fait gagner" };
  } catch { return { main:"#FF6B00", title:"WENZE WENZE BUSINESS", logo:"", slogan:"Le réseau qui te fait gagner" }; }
}
function lireRecherches(): any[] { try{ const v=JSON.parse(localStorage.getItem("wenze_recherches")||"[]"); return Array.isArray(v)?v:[]; }catch{ return []; } }
function lireSuggestNotifs(): any[] { try{ const v=JSON.parse(localStorage.getItem("wenze_suggest_notifs")||"[]"); return Array.isArray(v)?v:[]; }catch{ return []; } }

function peutVoirGros(a: any, moi: any): boolean {
  if (!a || a.typeAnnonce !== "gros") return false;
  const role = moi?.role || "client";
  if (role === "grossiste" || role === "dg" || moi?.roleAdmin === "dg") return true;
  const monWa = (moi?.ownerWhatsapp || moi?.whatsapp || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
  const aWa = (a._wa || a.ownerWhatsapp || a.whatsapp || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
  return monWa && aWa && monWa === aWa;
}
function lienPublier(moi: any): string {
  const role = moi?.role || "client";
  if (role === "prestataire") return "/publier-service";
  if (role === "vendeur" || role === "grossiste" || role === "boutique") return "/publier";
  if (role === "dg") return "/publier";
  return "/devenir-vendeur";
}
function statusText(ab: any): string {
  if (!ab) return "";
  if (ab.isCache) return "🔒 Compte caché";
  if (ab.isPaye) return (ab.badge || "✅") + " " + (ab.palierId || "Ticket") + " • " + (ab.joursRestants ?? 0) + "j • " + (ab.placesRestantes || 0) + " places libres";
  return "🆓 Gratuit " + (ab.count || 0) + "/" + FREEMIUM.maxImages + " • " + (ab.joursRestants ?? 30) + "j";
}
const ICON_BTN = "relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 border";

/* ---------- En-tête V4 ---------- */
export function HomeHeader(props: { ab: any; payantCount: number; boostedCount: number; notifCount: number; cartCount: number; search: string; onSearch: (v: string) => void; tabs: { id: string; label: string; count: number }[]; selectedCat: string; onSelectCat: (id: string) => void; totalCount: number; }) {
  const { ab, payantCount, boostedCount, notifCount, cartCount, search, onSearch, tabs, selectedCat, onSelectCat, totalCount } = props;
  const moi = lireMoi();
  const design = lireDesign();
  const [showHist, setShowHist] = useState(false);
  const [suggestCount, setSuggestCount] = useState(0);
  const [hist, setHist] = useState<any[]>([]);
  useEffect(()=>{ setHist(lireRecherches()); setSuggestCount(lireSuggestNotifs().filter((n:any)=>!n.lu).length); },[search]);
  const totalNotif = notifCount + suggestCount;
  const tab = (active: boolean) => "px-4 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap " + (active ? "bg-black text-white border-black" : "bg-white");
  const suggestionsLive = search.trim().length>=2 ? hist.filter((h:any)=> String(h.q).toLowerCase().includes(search.toLowerCase())).slice(0,4) : hist.slice(0,4);

  return (
    <header className="sticky top-0 bg-white z-20 border-b">
      <div className="p-4 flex items-center gap-3">
        {design.logo ? <img src={design.logo} alt="W" className="w-9 h-9 rounded-full object-cover shrink-0" /> : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black shrink-0" style={{ background: design.main }}>W</div>}
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[13px] leading-tight truncate">{design.title || APP_NAME}</h1>
          <Link href={ab?.isCache ? "/abonnement" : "/tarifs"} className="block text-[9px] text-gray-500 truncate">{statusText(ab)}{ab ? " • " : ""}Kinshasa • {payantCount} payants • {boostedCount} TOP</Link>
        </div>
        <Link href="/notifications" className={ICON_BTN + " bg-[#FFFBF0]"}>🔔{totalNotif > 0 ? <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-black px-1">{totalNotif > 99 ? "99+" : totalNotif}</span> : null}</Link>
        <Link href="/panier" className={ICON_BTN + " bg-[#FFFBF0]"}>🛒{cartCount > 0 ? <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-black px-1">{cartCount > 99 ? "99+" : cartCount}</span> : null}</Link>
        <Link href="/profil" className={ICON_BTN + " bg-black text-white border-black"}>👤</Link>
      </div>

      {/* 🔍 RECHERCHE INTELLIGENTE - Comme Alibaba */}
      <div className="px-4 pb-3 flex gap-2 relative">
        <div className="flex-1 relative">
          <input value={search} onChange={(e: any) => { onSearch(e.target.value); setShowHist(true); }} onFocus={()=>{ setHist(lireRecherches()); setShowHist(true); }} onBlur={()=> setTimeout(()=> setShowHist(false),200)} placeholder="Recherche sacs, riz, coiffure, Gombe..." className="w-full border-2 pl-10 pr-4 p-3 rounded-full text-[13px] bg-[#FFFBF0] outline-none focus:border-black" />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          {showHist && suggestionsLive.length>0 ? (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-2xl shadow-xl z-50 overflow-hidden">
              <p className="px-3 pt-2 text-[9px] font-black text-gray-400">{search ? "🔥 SUGGESTIONS" : "🕘 RECHERCHES RÉCENTES"}</p>
              {suggestionsLive.map((h:any,i:number)=>(
                <button key={i} type="button" onMouseDown={()=>{ onSearch(h.q); setShowHist(false); }} className="w-full text-left px-3 py-2.5 text-[12px] font-bold flex justify-between hover:bg-[#FFFBF0]"><span>🔍 {h.q}</span><span style={{ color: design.main }}>→</span></button>
              ))}
              {suggestCount>0 ? <Link href="/" className="block px-3 py-2 bg-yellow-50 text-[11px] font-black">🔔 {suggestCount} suggestion(s) pour toi →</Link> : null}
            </div>
          ) : null}
        </div>
        <Link href={lienPublier(moi)} className="text-white px-5 rounded-full font-black text-[12px] shrink-0 flex items-center" style={{ background: design.main }}>{moi?.role === "prestataire" ? "+ Service" : "+ Publier"}</Link>
      </div>

      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        <button type="button" onClick={() => onSelectCat("all")} className={tab(selectedCat === "all")}>Tout • {totalCount}{boostedCount ? " 🚀" + boostedCount : ""}</button>
        {tabs.map((t) => (<button key={t.id} type="button" onClick={() => onSelectCat(t.id)} className={tab(selectedCat === t.id)}>{t.label} • {t.count}</button>))}
        <Link href="/tarifs" className="px-4 py-2 rounded-full text-[10px] font-bold bg-white border-2 whitespace-nowrap flex items-center">🎫 Tarifs</Link>
      </div>
    </header>
  );
                           }
/* ---------- Bandeau visiteur ---------- */
export function BandeauVisiteur() {
  return (
    <div className="mx-4 mt-3 bg-black text-white rounded-2xl p-4">
      <p className="font-black text-[13px]">👀 Vous visitez en lecture seule</p>
      <p className="text-[11px] text-white/80 mt-1">Parcourez librement. Pour contacter un vendeur ou acheter, créez un compte gratuit : c'est rapide.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href="/inscription" className="bg-white text-black text-center py-2.5 rounded-full font-black text-[12px]">Créer un compte</Link>
        <Link href="/connexion" className="border border-white/40 text-center py-2.5 rounded-full font-bold text-[12px]">Se connecter</Link>
      </div>
    </div>
  );
}

/* ---------- Carte d'annonce V4 ---------- */
export function AnnonceCard(props: { a: any; icon: string; onMedia: (a: any) => void; onOpen: (a: any) => void; onCart: (a: any) => void; onContact: (a: any) => void; isSuggestion?: boolean; }) {
  const { a, icon, onMedia, onOpen, onCart, onContact, isSuggestion } = props;
  const aWhatsapp = !!a._wa;
  const moi = lireMoi();
  const voirGros = peutVoirGros(a, moi);
  const estGros = a.typeAnnonce === "gros";
  return (
    <div className={"bg-white border rounded-2xl overflow-hidden flex flex-col " + (a.isBoosted ? "border-2 border-green-500" : "") + (isSuggestion ? " ring-2 ring-yellow-400" : "")}>
      <button type="button" onClick={() => onMedia(a)} className="h-36 bg-[#FFFBF0] flex items-center justify-center overflow-hidden relative">
        {a.isVideo ? (<video src={a.photo} className="max-w-full max-h-full object-contain" muted playsInline preload="metadata"></video>) : a.photo ? (<img src={a.photo} alt={a.titre} className="max-w-full max-h-full object-contain" />) : (<span className="text-3xl">{icon}</span>)}
        <span className="absolute top-2 left-2 text-[8px] px-2 py-1 rounded-full font-black bg-black text-white">{a.vendeurBadge} {a.vendeurPalier} • {fmtUSD(a.prix)}$</span>
        {isSuggestion ? <span className="absolute top-2 right-2 text-[8px] px-2 py-1 rounded-full font-black bg-yellow-400 text-black">🔥 POUR TOI</span> : null}
        {a.recommandeParDG ? <span className="absolute bottom-2 right-2 text-[8px] px-2 py-1 rounded-full font-black bg-yellow-400 text-black">⭐ RECOMMANDÉ</span> : null}
        {estGros ? <span className="absolute bottom-2 left-2 text-[8px] px-2 py-1 rounded-full font-black bg-orange-500 text-white">🏭 GROS</span> : null}
      </button>
      <div className="p-2.5 flex-1 flex flex-col">
        <button type="button" onClick={() => onOpen(a)} className="text-left font-bold text-[12px] line-clamp-2">{a.titre}</button>
        <p className="text-[10px] text-gray-500">{a.commune || "Kinshasa"}</p>
        <p className="font-black text-[12px] mt-1">{fmtUSD(a.prix)}$ / {a.prixCDF}</p>
        {estGros ? (voirGros ? (<p className="text-[11px] font-bold text-orange-600 mt-1">🏭 Gros : {a.prixGros ? fmtUSD(a.prixGros) + " FC" : a.prixGrosCDF || ""} / {a.uniteGros || "carton"} {a.minimumCommande ? `• Min ${a.minimumCommande}` : ""}</p>) : (<p className="text-[10px] text-orange-600 mt-1">🔒 Prix gros : connecte-toi comme Grossiste</p>)) : null}
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {aWhatsapp ? (<button type="button" onClick={() => onContact(a)} className="bg-[#25D366] text-white text-center py-2.5 rounded-full font-bold text-[10px]">WhatsApp</button>) : (<span className="bg-gray-200 text-gray-500 text-center py-2.5 rounded-full font-bold text-[10px]">Sans WhatsApp</span>)}
          <button type="button" onClick={() => onCart(a)} className="bg-white border-2 border-black text-black py-2.5 rounded-full font-bold text-[10px]">🛒 Panier</button>
        </div>
      </div>
    </div>
  );
          }
/* ---------- Visionneuse photo V4 ---------- */
export function ImageViewer(props: { a: any; onClose: () => void; onOpen: (a: any) => void; onCart: (a: any) => void; onContact: (a: any) => void }) {
  const { a, onClose, onOpen, onCart, onContact } = props;
  const [idx, setIdx] = useState(0);
  const images: string[] = a.images && a.images.length ? a.images : a.photo ? [a.photo] : [];
  const current = images[idx] || "";
  const aWhatsapp = !!a._wa;
  const moi = lireMoi();
  const voirGros = peutVoirGros(a, moi);
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[400px] max-h-[90vh] overflow-y-auto" onClick={(e: any) => e.stopPropagation()}>
        <div className="relative bg-[#FFFBF0] flex items-center justify-center min-h-[200px]">
          {current ? <img src={current} alt={a.titre} className="max-h-[55vh] w-full object-contain" /> : <span className="text-5xl">📦</span>}
          <button type="button" onClick={onClose} className="absolute top-2 right-2 w-9 h-9 bg-black text-white rounded-full font-bold">✕</button>
          {a.recommandeParDG ? <span className="absolute bottom-2 left-2 text-[9px] bg-yellow-400 px-2 py-1 rounded-full font-black">⭐ RECOMMANDÉ PAR WENZE</span> : null}
        </div>
        {images.length > 1 ? (<div className="flex gap-2 p-3 overflow-x-auto">{images.map((src: string, i: number) => (<button key={i} type="button" onClick={() => setIdx(i)} className={"shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 " + (i === idx ? "border-black" : "border-gray-200")}><img src={src} alt={"Photo " + (i + 1)} className="w-full h-full object-cover" /></button>))}</div>) : null}
        <div className="p-4">
          <p className="font-black text-[14px]">{a.titre}</p>
          <p className="font-black text-[13px] text-[#6C3CE0] mt-1">{fmtUSD(a.prix)}$ / {toCDFString(Number(a.prix) || 0)}</p>
          {a.typeAnnonce === "gros" ? (voirGros ? (<p className="text-[11px] font-bold text-orange-600 mt-1">🏭 Gros : {a.prixGros ? fmtUSD(a.prixGros) + " FC" : ""} / {a.uniteGros || "carton"} {a.minimumCommande ? `• Min ${a.minimumCommande}` : ""}</p>) : (<p className="text-[11px] text-orange-600 mt-1">🔒 Prix gros réservé aux Grossistes</p>)) : null}
          <p className="text-[10px] text-gray-500 mt-1">Taux {TAUX_CDF} • {a.commune || "Kinshasa"}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onOpen(a)} className="col-span-2 bg-black text-white py-3 rounded-full font-black text-[12px]">Voir l'annonce →</button>
            {aWhatsapp ? (<button type="button" onClick={() => onContact(a)} className="bg-[#25D366] text-white text-center py-3 rounded-full font-bold text-[11px]">WhatsApp</button>) : (<span className="bg-gray-200 text-gray-500 text-center py-3 rounded-full font-bold text-[11px]">Sans WhatsApp</span>)}
            <button type="button" onClick={() => onCart(a)} className="bg-white border-2 border-black py-3 rounded-full font-bold text-[11px]">🛒 Panier</button>
          </div>
          <Link href={`/produit/${a.id}`} className="mt-3 block text-center text-[11px] font-black bg-yellow-50 border border-yellow-300 py-2.5 rounded-full">🔥 Voir les produits similaires →</Link>
        </div>
      </div>
    </div>
  );
}

/* ---------- Barre de navigation V4 ---------- */
export function BottomNav({ notifCount }: { notifCount: number }) {
  const item = "flex flex-col items-center gap-0.5 text-gray-500";
  const moi = lireMoi();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
      <Link href="/" className="font-bold text-black flex flex-col items-center gap-0.5"><span className="text-[18px]">🏠</span>Accueil</Link>
      <Link href="/video" className={item}><span className="text-[18px]">🎥</span>Vidéo</Link>
      <Link href={lienPublier(moi)} className={item}><span className="text-[22px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">+</span>{moi?.role === "prestataire" ? "Service" : "Publier"}</Link>
      <Link href="/boutiques" className={item}><span className="text-[18px]">🏬</span>Boutiques</Link>
      <Link href="/profil" className={item + " relative"}><span className="text-[18px]">👤</span>Profil{notifCount > 0 ? <span className="absolute -top-1 left-3 bg-red-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">{notifCount > 99 ? "99+" : notifCount}</span> : null}</Link>
    </nav>
  );
}
