"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export const APP_NAME = "WENZE";
export const fmtUSD = (n: any) => `${Number(n || 0).toLocaleString()} $`;

// --- WhatsApp propre Kinshasa ---
export function waLink(wa: any, msg: string = "") {
  const clean = (wa || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
  if (!clean) return "";
  const full = clean.startsWith("243") ? clean : "243" + clean.slice(-9);
  return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
}

function readDesign(): any {
  try { const raw = localStorage.getItem("wenze_design_pub"); if (raw) return JSON.parse(raw); } catch {}
  return {};
}

// ================= HEADER =================
export function HomeHeader({ ab, payantCount, boostedCount, notifCount, cartCount, search, onSearch, tabs, selectedCat, onSelectCat, totalCount }: any) {
  const router = useRouter();
  const design = readDesign();
  const couleur = design.couleur || "#FF6B00";

  return (
    <div className="sticky top-0 z-30 bg-[#FFFBF0]/95 backdrop-blur pb-2 pt-2">
      {/* SEARCH + PANIER + NOTIFS - Recherche et Cloche restent ICI, en haut */}
      <div className="px-4 flex gap-2 items-center">
        <div className="flex-1 flex items-center bg-white border rounded-full px-3 py-2.5">
          <span className="text-[14px]">🔍</span>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Chercher : robe, téléphone, Gombe..."
            className="flex-1 outline-none text-[13px] font-bold px-2 bg-transparent"
          />
          {search && <button onClick={() => onSearch("")} className="text-[14px] font-black px-1">✕</button>}
        </div>
        <button onClick={() => router.push("/panier")} className="relative w-11 h-11 bg-white border rounded-full flex items-center justify-center text-[18px]">
          🛒
          {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>}
        </button>
        <button onClick={() => router.push("/notifications")} className="relative w-11 h-11 bg-white border rounded-full flex items-center justify-center text-[18px]">
          🔔
          {notifCount > 0 && <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">{notifCount}</span>}
        </button>
      </div>

      {/* INFOS ABO + STATS */}
      <div className="px-4 mt-2 flex gap-2 items-center">
        <span className="text-[10px] font-black bg-white border px-2 py-1 rounded-full">{totalCount} annonces</span>
        {payantCount > 0 && <span className="text-[10px] font-black bg-green-100 px-2 py-1 rounded-full">✅ {payantCount} payants</span>}
        {boostedCount > 0 && <span className="text-[10px] font-black bg-yellow-100 px-2 py-1 rounded-full">🔥 {boostedCount} boostés</span>}
        {ab?.palierId && <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: couleur, color: "#fff" }}>{ab.palierId}</span>}
        <button onClick={() => router.push("/recherche")} className="ml-auto text-[10px] font-black underline">Filtres →</button>
      </div>

      {/* TABS CATEGORIES - TOUS MARCHENT */}
      <div className="flex gap-2 overflow-x-auto px-4 mt-3 pb-1 scrollbar-hide">
        <button onClick={() => onSelectCat("all")} className={`shrink-0 px-4 py-2 rounded-full font-black text-[11px] border-2 ${selectedCat === "all" ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}>
          🏠 Tout ({totalCount})
        </button>
        {tabs?.map((t: any) => (
          <button key={t.id} onClick={() => onSelectCat(t.id)} className={`shrink-0 px-4 py-2 rounded-full font-black text-[11px] border-2 ${selectedCat === t.id ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>
    </div>
  );
}

// ================= CARTE ANNONCE =================
export function AnnonceCard({ a, icon, onMedia, onOpen, onCart, onContact }: any) {
  const estGros = a.typeAnnonce === "gros";
  const prixAffiche = estGros
    ? `${Number(a.prixGros || 0).toLocaleString()} FC / ${a.uniteGros || "Carton"}`
    : `${fmtUSD(a.prix)} • ${a.prixCDF || ""}`;

  return (
    <div className="bg-white border rounded-2xl overflow-hidden flex flex-col shadow-sm">
      {/* IMAGE / VIDEO - CLIC = AGRANDIR */}
      <button onClick={() => onMedia(a)} className="relative w-full h-[150px] bg-gray-100 overflow-hidden">
        {a.photo ? (
          a.isVideo ? (
            <video src={a.photo} className="w-full h-full object-cover" muted playsInline preload="metadata" />
          ) : (
            <img src={a.photo} alt={a.titre} className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[40px]">{icon || "🏬"}</div>
        )}
        {a.isVideo && <span className="absolute inset-0 flex items-center justify-center text-[32px] bg-black/20">▶️</span>}
        {a.isBoosted && <span className="absolute top-2 right-2 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full">🔥 BOOSTÉ</span>}
        {estGros && <span className="absolute bottom-2 left-2 bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">🏭 GROS</span>}
        {a.recommandeParDG && <span className="absolute bottom-2 right-2 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full">⭐</span>}
      </button>

      {/* INFOS - CLIC = PAGE PRODUIT */}
      <button onClick={() => onOpen(a)} className="text-left p-3 flex-1">
        <p className="font-black text-[12px] leading-tight line-clamp-2">{a.titre}</p>
        <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{a.description || a.commune || "Kinshasa"}</p>
        <p className="font-black text-[13px] mt-2" style={{ color: estGros ? "#EA580C" : "#000" }}>{prixAffiche}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {a.vendeurBadge || "🆓"} {a.vendeurPalier || "Freemium"} • {a.commune || "Kinshasa"}
          {estGros && a.minimumCommande ? ` • Min: ${a.minimumCommande}` : ""}
        </p>
      </button>

      {/* BOUTONS - TOUS MARCHENT */}
      <div className="p-2 pt-0 flex gap-1.5">
        <button onClick={() => onCart(a)} className="flex-1 bg-black text-white py-2.5 rounded-full font-black text-[11px]">🛒 Ajouter</button>
        <button onClick={() => onContact && onContact(a)} className="flex-1 bg-green-500 text-white py-2.5 rounded-full font-black text-[11px]">💬 WhatsApp</button>
      </div>
    </div>
  );
}
// ================= IMAGE VIEWER - Accepte src OU a, pour ne plus planter ===
export function ImageViewer({ a, src, onClose, onOpen, onCart, onContact }: any) {
  const router = useRouter();
  const data = a || (typeof src === "string" ? { photo: src, titre: "Image" } : src);
  if (!data) return null;
  const photo = data.photo || data.src || src;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex justify-between items-center p-4">
        <button onClick={onClose} className="w-10 h-10 bg-white rounded-full font-black text-[18px]">✕</button>
        <p className="text-white font-black text-[12px] flex-1 text-center px-2 truncate">{data.titre || "WENZE"}</p>
        <button onClick={() => { onClose(); router.back(); }} className="w-10 h-10 bg-white rounded-full font-black text-[18px]">←</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        {data.isVideo ? (
          <video src={photo} controls autoPlay className="max-w-full max-h-full rounded-2xl" />
        ) : (
          <img src={photo} alt={data.titre} className="max-w-full max-h-full object-contain rounded-2xl" />
        )}
      </div>
      <div className="p-4 bg-white rounded-t-[24px] space-y-2">
        <p className="font-black text-[15px]">{data.titre}</p>
        <p className="text-[12px] text-gray-600">{data.description}</p>
        <p className="font-black text-[16px]">{fmtUSD(data.prix)} • {data.prixCDF}</p>
        <div className="flex gap-2">
          <button onClick={() => onCart && onCart(data)} className="flex-1 bg-black text-white py-3.5 rounded-full font-black text-[12px]">🛒 Ajouter au panier</button>
          <button onClick={() => onContact && onContact(data)} className="flex-1 bg-green-500 text-white py-3.5 rounded-full font-black text-[12px]">💬 Contacter</button>
        </div>
        {onOpen && <button onClick={() => onOpen(data)} className="w-full bg-[#FFFBF0] border-2 border-black py-3 rounded-full font-black text-[12px]">Voir la page produit →</button>}
        <button onClick={onClose} className="w-full text-center text-[11px] text-gray-500 underline py-1">Fermer</button>
      </div>
    </div>
  );
}

// ================= BANDEAU VISITEUR =================
export function BandeauVisiteur() {
  const router = useRouter();
  return (
    <div className="mx-4 mt-3 bg-black text-white rounded-2xl p-4 flex items-center gap-3">
      <span className="text-[28px]">👋</span>
      <div className="flex-1">
        <p className="font-black text-[13px]">Bienvenue sur {APP_NAME} !</p>
        <p className="text-[11px] text-white/70">Connecte-toi pour acheter, contacter et publier.</p>
      </div>
      <button onClick={() => router.push("/connexion")} className="bg-white text-black px-4 py-2.5 rounded-full font-black text-[11px] shrink-0">Se connecter →</button>
    </div>
  );
}

// ================= BOTTOM NAV - NOUVELLE VERSION DG =================
// ✅ Vidéo à la place de Recherche
// ✅ Boutique à la place de la Cloche
// ✅ Recherche et Cloche restent en haut dans le Header, pas perdues
export function BottomNav({ notifCount, cartCount }: any) {
  const router = useRouter();
  const [active, setActive] = useState("/");
  const go = (path: string) => { setActive(path); router.push(path); };

  const btn = (path: string, emoji: string, label: string, badge?: number, center?: boolean) => (
    <button onClick={() => go(path)} className={`flex-1 flex flex-col items-center py-2 relative ${active === path ? "text-black" : "text-gray-400"} ${center ? "-mt-5" : ""}`}>
      {center ? (
        <span className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-[22px] shadow-lg border-4 border-[#FFFBF0]">➕</span>
      ) : (
        <span className="text-[20px] relative">
          {emoji}
          {badge && badge > 0 ? <span className="absolute -top-1 -right-3 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{badge}</span> : null}
        </span>
      )}
      <span className="text-[9px] font-black mt-0.5">{label}</span>
      {active === path && !center && <span className="w-6 h-1 bg-black rounded-full mt-1" />}
    </button>
  );

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex px-2 z-40">
      {btn("/", "🏠", "Accueil")}
      {btn("/video", "🎬", "Vidéo")}
      {btn("/publier", "➕", "Publier", undefined, true)}
      {btn("/boutiques", "🏪", "Boutique")}
      {btn("/panier", "🛒", "Panier", cartCount)}
      {btn("/profil", "👤", "Profil")}
    </div>
  );
}
