"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toCDFString } from "@/lib/paiement";

export const APP_NAME = "WENZE";
export const fmtUSD = (n: any) => `${Number(n || 0).toLocaleString("fr-FR")} $`;

export function waLink(wa: any, msg: string = "") {
  const clean = (wa || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
  if (!clean) return "";
  const full = clean.startsWith("243") ? clean : "243" + clean.slice(-9);
  return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
}

function readDesign(): any {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("wenze_design_pub");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

// ================= HEADER =================
export function HomeHeader({
  ab,
  payantCount,
  boostedCount,
  search,
  onSearch,
  tabs,
  selectedCat,
  onSelectCat,
  totalCount,
  onToggleFiltre,
  filtreOuvert,
}: any) {
  const [couleur, setCouleur] = useState("#FF6B00");

  useEffect(() => {
    const syncColor = () => {
      const d = readDesign();
      if (d.couleur) setCouleur(d.couleur);
    };
    syncColor();
    window.addEventListener("storage", syncColor);
    window.addEventListener("wenze-update", syncColor);
    return () => {
      window.removeEventListener("storage", syncColor);
      window.removeEventListener("wenze-update", syncColor);
    };
  }, []);

  return (
    <div className="sticky top-0 z-30 bg-[#FFFBF0]/95 backdrop-blur pb-2 pt-2">
      <div className="px-4 flex gap-2 items-center">
        <div className="flex-1 flex items-center bg-white border rounded-full px-3 py-2">
          <span className="text-[14px]">🔍</span>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Rechercher produit, commune, avenue..."
            className="flex-1 outline-none text-[12px] font-bold px-2 bg-transparent"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="text-[13px] font-black px-1"
            >
              ✕
            </button>
          )}
        </div>
        {onToggleFiltre && (
          <button
            type="button"
            aria-expanded={Boolean(filtreOuvert)}
            onClick={onToggleFiltre}
            className="shrink-0 bg-black text-white px-3.5 py-2 rounded-full font-black text-[11px]"
          >
            Filtre
          </button>
        )}
      </div>

      <div className="px-4 mt-2 flex gap-2 items-center flex-wrap">
        <span className="text-[10px] font-black bg-white border px-2 py-1 rounded-full">
          {totalCount} annonces
        </span>
        {payantCount > 0 && (
          <span className="text-[10px] font-black bg-green-100 px-2 py-1 rounded-full">
            ✅ {payantCount} payants
          </span>
        )}
        {boostedCount > 0 && (
          <span className="text-[10px] font-black bg-yellow-100 px-2 py-1 rounded-full">
            🔥 {boostedCount} boostés
          </span>
        )}
        {ab?.palierId && (
          <span
            className="text-[10px] font-black px-2 py-1 rounded-full"
            style={{ background: couleur, color: "#fff" }}
          >
            {ab.palierId}
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 mt-2.5 pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => onSelectCat("all")}
          className={`shrink-0 px-3.5 py-1.5 rounded-full font-black text-[11px] border-2 ${
            selectedCat === "all"
              ? "bg-black text-white border-black"
              : "bg-white border-gray-200"
          }`}
        >
          🏠 Tout ({totalCount})
        </button>
        {tabs?.map((t: any) => (
          <button
            type="button"
            key={t.id}
            onClick={() => onSelectCat(t.id)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full font-black text-[11px] border-2 ${
              selectedCat === t.id
                ? "bg-black text-white border-black"
                : "bg-white border-gray-200"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>
    </div>
  );
}

// ================= CARTE ANNONCE =================
export function AnnonceCard(props: any) {
  const item = props.a || props.annonce;
  if (!item) return null;

  const handleMedia = props.onMedia || props.onImage;
  const handleOpen = props.onOpen;
  const handleCart = props.onCart || props.onAddPanier;
  const handleContact = props.onContact || props.onContacter;
  const handleToggleRecommande = props.onToggleRecommande;
  const jeSuisDG = Boolean(props.jeSuisDG);

  const estGros = item.typeAnnonce === "gros";
  const grosUsd = Number(item.prixGros || item.prix || 0);
  const prixAffiche = estGros
    ? `${fmtUSD(grosUsd)} • ${toCDFString(grosUsd)} / ${item.uniteGros || "Carton"}`
    : `${fmtUSD(item.prix)} • ${item.prixCDF || toCDFString(Number(item.prix || 0))}`;

  const lieuAffiche =
    item.commune || item.quartier || item.province || "Kinshasa";
  const distLabel =
    typeof item._distanceKm === "number"
      ? ` • ${item._distanceKm.toFixed(1)} km`
      : "";

  return (
    <div className="bg-white border rounded-2xl overflow-hidden flex flex-col shadow-sm relative">
      {jeSuisDG && handleToggleRecommande && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleRecommande(item.id);
          }}
          title="Recommander / retirer"
          className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full text-[12px] font-black flex items-center justify-center border ${
            item.recommandeParDG
              ? "bg-yellow-400 text-black border-black"
              : "bg-white/90 text-gray-500 border-gray-300"
          }`}
        >
          ★
        </button>
      )}

      <button
        type="button"
        onClick={() => handleMedia && handleMedia(item)}
        className="relative w-full h-[150px] bg-gray-100 overflow-hidden"
      >
        {item.photo ? (
          item.isVideo ? (
            <video
              src={item.photo}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={item.photo}
              alt={item.titre || "Annonce"}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[40px]">
            {props.icon || "🏬"}
          </div>
        )}
        {item.isVideo && (
          <span className="absolute inset-0 flex items-center justify-center text-[32px] bg-black/20">
            ▶️
          </span>
        )}
        {item.isBoosted && (
          <span className="absolute top-2 right-2 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full">
            🔥 BOOSTÉ
          </span>
        )}
        {estGros && (
          <span className="absolute bottom-2 left-2 bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
            🏭 GROS
          </span>
        )}
        {item.recommandeParDG && (
          <span className="absolute bottom-2 right-2 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full">
            ⭐
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => handleOpen && handleOpen(item)}
        className="text-left p-3 flex-1"
      >
        <p className="font-black text-[12px] leading-tight line-clamp-2">
          {item.titre}
        </p>
        <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">
          {item.description || lieuAffiche}
        </p>
        <p
          className="font-black text-[12px] mt-2 leading-snug"
          style={{ color: estGros ? "#EA580C" : "#000" }}
        >
          {prixAffiche}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {item.vendeurBadge || "🆓"} {item.vendeurPalier || "Freemium"} •{" "}
          {lieuAffiche}
          {distLabel}
          {estGros && item.minimumCommande
            ? ` • Min: ${item.minimumCommande}`
            : ""}
        </p>
      </button>

      <div className="p-2 pt-0 flex gap-1.5">
        <button
          type="button"
          onClick={() => handleCart && handleCart(item)}
          className="flex-1 bg-black text-white py-2.5 rounded-full font-black text-[11px]"
        >
          🛒 Ajouter
        </button>
        <button
          type="button"
          onClick={() => handleContact && handleContact(item)}
          className="flex-1 bg-green-500 text-white py-2.5 rounded-full font-black text-[11px]"
        >
          💬 WhatsApp
        </button>
      </div>
    </div>
  );
}

// ================= IMAGE VIEWER =================
export function ImageViewer(props: any) {
  const { a, annonce, src, onClose } = props;
  const handleOpen = props.onOpen || props.onOpenProduit;
  const handleCart = props.onCart || props.onAddPanier;
  const handleContact = props.onContact || props.onContacter;

  const raw = a || annonce;
  const data =
    raw || (typeof src === "string" ? { photo: src, titre: "Image" } : src);
  if (!data) return null;

  const photo = data.photo || data.src || src;
  const estGros = data.typeAnnonce === "gros";
  const prixUsd = estGros
    ? Number(data.prixGros || data.prix || 0)
    : Number(data.prix || 0);
  const prixCdf = data.prixCDF || toCDFString(prixUsd);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex justify-between items-center p-4">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 bg-white rounded-full font-black text-[18px]"
        >
          ✕
        </button>
        <p className="text-white font-black text-[12px] flex-1 text-center px-2 truncate">
          {data.titre || APP_NAME}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 bg-white rounded-full font-black text-[18px]"
        >
          ←
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {data.isVideo ? (
          <video
            src={photo}
            controls
            playsInline
            className="max-w-full max-h-full rounded-2xl"
          />
        ) : (
          <img
            src={photo}
            alt={data.titre || "Aperçu"}
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
        )}
      </div>

      <div className="p-4 bg-white rounded-t-[24px] space-y-2">
        <p className="font-black text-[15px]">{data.titre}</p>
        {data.description && (
          <p className="text-[12px] text-gray-600">{data.description}</p>
        )}
        <p className="font-black text-[15px]">
          {fmtUSD(prixUsd)} • {prixCdf}
          {estGros ? ` / ${data.uniteGros || "Carton"}` : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleCart && handleCart(data)}
            className="flex-1 bg-black text-white py-3.5 rounded-full font-black text-[12px]"
          >
            🛒 Ajouter au panier
          </button>
          <button
            type="button"
            onClick={() => handleContact && handleContact(data)}
            className="flex-1 bg-green-500 text-white py-3.5 rounded-full font-black text-[12px]"
          >
            💬 Contacter
          </button>
        </div>
        {handleOpen && (
          <button
            type="button"
            onClick={() => handleOpen(data)}
            className="w-full bg-[#FFFBF0] border-2 border-black py-3 rounded-full font-black text-[12px]"
          >
            Voir la page produit →
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-full text-center text-[11px] text-gray-500 underline py-1"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

// ================= BOTTOM NAV =================
export function BottomNav({ cartCount, onOpenCategories }: any) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const btn = (
    path: string,
    emoji: string,
    label: string,
    badge?: number,
    center?: boolean,
    onClickOverride?: () => void
  ) => {
    const isActive =
      !onClickOverride &&
      (path === "/" ? pathname === "/" : pathname.startsWith(path));
    return (
      <button
        type="button"
        onClick={() => (onClickOverride ? onClickOverride() : router.push(path))}
        className={`flex-1 flex flex-col items-center py-2 relative ${
          isActive ? "text-black" : "text-gray-400"
        } ${center ? "-mt-5" : ""}`}
      >
        {center ? (
          <span className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-[20px] shadow-lg border-4 border-[#FFFBF0]">
            {emoji}
          </span>
        ) : (
          <span className="text-[20px] relative">
            {emoji}
            {badge && badge > 0 ? (
              <span className="absolute -top-1 -right-3 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {badge}
              </span>
            ) : null}
          </span>
        )}
        <span className="text-[9px] font-black mt-0.5">{label}</span>
        {isActive && !center && (
          <span className="w-6 h-1 bg-black rounded-full mt-1" />
        )}
      </button>
    );
  };

  const handleCategoriesClick = () => {
    if (onOpenCategories) {
      onOpenCategories();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex px-2 z-40">
      {btn("/", "🏠", "Accueil")}
      {btn(
        "/",
        "🗂️",
        "Catégories",
        undefined,
        false,
        handleCategoriesClick
      )}
      {btn("/videos", "🎬", "Vidéo", undefined, true)}
      {btn("/boutique", "🏪", "Boutique")}
      {btn("/panier", "🛒", "Panier", cartCount)}
      {btn("/profil", "👤", "Profil")}
    </div>
  );
}
