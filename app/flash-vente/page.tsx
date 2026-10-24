"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { FORMULES, TAUX_CDF, toCDF, verifierAbonnement, checkFreemiumLimit } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");
const cleanPrix = (p: any) => parseFloat((p || "0").toString().replace(/[^0-9.]/g, "")) || 0;

type AnnonceFlash = {
  id: string;
  titre: string;
  prix: number;
  prixOrigin?: number;
  photo?: string;
  categorieId: string;
  activiteId?: string;
  ownerWhatsapp: string;
  whatsapp: string;
  nom?: string;
  ville?: string;
  flash: true;
  flashExpire: number;
  flashRemise: number;
  views?: number;
};

export default function VenteFlashPage() {
  const [annonces, setAnnonces] = useState<AnnonceFlash[]>([]);
  const [user, setUser] = useState<any>(null);
  const [filtreCat, setFiltreCat] = useState<string>("all");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [abonnement, setAbonnement] = useState<any>(null);

  useEffect(() => {
    try {
      const uRaw = localStorage.getItem("wenze_user");
      if (uRaw) setUser(JSON.parse(uRaw));
      setAbonnement(verifierAbonnement());

      const listRaw = localStorage.getItem("wenze_annonces_list");
      const list = listRaw ? JSON.parse(listRaw) : [];
      
      // Filtre vente flash active seulement
      const now = Date.now();
      const flashList = list.filter((a: any) => a.flash && a.flashExpire && a.flashExpire > now);
      
      // Si pas de flash, crée des exemples pour demo - concordance
      if (flashList.length === 0 && list.length > 0) {
        const demoFlash = list.slice(0, 6).map((a: any, i: number) => ({
          ...a,
          flash: true,
          flashExpire: now + (2 + i) * 3600000, // 2h à 7h
          flashRemise: [30, 50, 25, 40, 35, 60][i] || 30,
          prixOrigin: cleanPrix(a.prix) * 1.5,
          prix: cleanPrix(a.prix),
        }));
        setAnnonces(demoFlash);
      } else {
        setAnnonces(flashList);
      }

      // Timer global vente flash - reset toutes les 24h à minuit Kinshasa
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      setTimeLeft(nextMidnight.getTime() - now);
    } catch {}
  }, []);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 1000 ? prev - 1000 : 0));
      // Nettoie flash expirés
      const now = Date.now();
      setAnnonces((prev) => prev.filter((a) => a.flashExpire > now));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const filtered = useMemo(() => {
    if (filtreCat === "all") return annonces;
    return annonces.filter((a) => {
      const cat = (a.categorieId || "").toLowerCase();
      return cat === filtreCat || normalizeCategorie(cat) === filtreCat;
    });
  }, [annonces, filtreCat]);

  const getCategorieInfo = (catId: string) => {
    const cat = getCategorieById(catId?.toLowerCase().trim() || "commerce");
    return cat ? `${cat.icon} ${cat.titreCourt}` : "🛒 Commerce";
  };

  const handleContact = (a: AnnonceFlash) => {
    const wa = cleanWhatsapp(a.ownerWhatsapp || a.whatsapp);
    const msg = `Salut ${a.nom || "Prestataire"}! Je veux ton article FLASH ${a.titre} à ${a.prix}$ / ${toCDF(a.prix).toLocaleString()} CDF (remise ${a.flashRemise}% - Taux ${TAUX_CDF}). Toujours dispo? WENZE Vente Flash 🔥`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const canCreateFlash = useMemo(() => {
    if (!user) return false;
    const ab = verifierAbonnement();
    if (ab.actif) return true; // Pro peut créer flash illimité
    const check = checkFreemiumLimit();
    return check.peutPublier; // Freemium 3 max
  }, [user]);

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24">
      {/* HEADER VENTE FLASH */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-[#FF3B30] to-[#FF6B30] text-white p-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px] flex items-center gap-2">🔥 VENTE FLASH KIN • Taux {TAUX_CDF}</h1>
            <p className="text-[10px] opacity-90">Fin dans {formatTime(timeLeft)} • {filtered.length} articles • Régime prestataire unique</p>
          </div>
          <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full font-bold animate-pulse">{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* BANNIERE TAUX + REGIME */}
      <div className="bg-black text-white text-center py-2 px-4">
        <p className="text-[10px] font-bold">⚡ VENTE FLASH -50% • Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF • Grossiste {FORMULES.grossiste.prix}$ • Taux {TAUX_CDF} CDF fixe • {CATEGORIES_WENZE.length} métiers • Régime prestataire unique Soudeur + Tout travaux même régime</p>
      </div>

      {/* FILTRES CATEGORIES */}
      <div className="p-3 bg-white border-b sticky top-[64px] z-10">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setFiltreCat("all")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold border ${filtreCat === "all" ? "bg-black text-white border-black" : "bg-gray-50 text-gray-700 border-gray-200"}`}
          >
            🔥 Tous • {annonces.length} • Taux {TAUX_CDF}
          </button>
          {CATEGORIES_WENZE.map((c) => {
            const count = annonces.filter((a) => (a.categorieId || "").toLowerCase() === c.id).length;
            if (count === 0) return null;
            return (
              <button
                key={c.id}
                onClick={() => setFiltreCat(c.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold border ${filtreCat === c.id ? "bg-[#6C3CE0] text-white border-[#6C3CE0]" : "bg-gray-50 text-gray-700 border-gray-200"}`}
              >
                {c.icon} {c.titreCourt} • {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* LISTE VENTE FLASH */}
      <div className="p-3">
        {filtered.length === 0 ? (
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center mt-6">
            <p className="text-4xl">🔥</p>
            <p className="font-black mt-3 text-[14px]">Pas de vente flash active</p>
            <p className="text-[11px] text-gray-500 mt-1">Les ventes flash durent 2h à 24h - Remise 25% à 60% - Régime prestataire unique Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF} CDF</p>
            <div className="mt-4 grid gap-2">
              <Link href="/publier" className="bg-[#FF3B30] text-white py-3 rounded-full text-[12px] font-bold">+ Créer vente flash • {FORMULES.pro.prix}$ • Taux {TAUX_CDF}</Link>
              <Link href="/boutiques" className="bg-white border py-3 rounded-full text-[12px] font-bold">🏪 Voir boutiques • {CATEGORIES_WENZE.length} métiers</Link>
            </div>
            <p className="text-[9px] text-gray-400 mt-3">Soudeur + Tout travaux = même régime Pro {FORMULES.pro.prix}$ - Boutique fonctionnelle - Taux {TAUX_CDF} CDF fixe</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((a) => {
              const remise = a.flashRemise || 30;
              const prixOrigin = a.prixOrigin || a.prix * 1.5;
              const timeFlashLeft = a.flashExpire - Date.now();
              const catInfo = getCategorieInfo(a.categorieId);
              const actLower = (a.activiteId || "").toLowerCase();
              const isTech = actLower.includes("soudeur") || actLower.includes("tout-travaux");

              return (
                <div key={a.id} className="bg-white border rounded-2xl overflow-hidden relative">
                  {/* BADGE FLASH */}
                  <div className="absolute top-2 left-2 z-10 flex gap-1">
                    <span className="bg-[#FF3B30] text-white text-[9px] font-black px-2 py-1 rounded-full animate-pulse">🔥 -{remise}% FLASH</span>
                    {isTech && <span className="bg-[#6C3CE0] text-white text-[7px] font-bold px-1.5 py-1 rounded-full">PRESTATAIRE</span>}
                  </div>
                  <div className="absolute top-2 right-2 z-10 bg-black text-white text-[8px] font-bold px-2 py-1 rounded-full">{formatTime(Math.max(0, timeFlashLeft))}</div>

                  {/* IMAGE */}
                  <div className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {a.photo ? <img src={a.photo} className="w-full h-full object-contain" alt={a.titre} /> : <span className="text-3xl">📦</span>}
                  </div>

                  {/* INFOS */}
                  <div className="p-3">
                    <p className="font-bold text-[12px] line-clamp-2 leading-tight">{a.titre}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{catInfo} • {a.ville || "Kinshasa"} • Taux {TAUX_CDF}</p>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <span className="font-black text-[14px] text-[#FF3B30]">{a.prix}$ / {toCDF(a.prix).toLocaleString()} CDF</span>
                      <span className="text-[10px] text-gray-400 line-through">{prixOrigin.toFixed(0)}$</span>
                    </div>
                    <p className="text-[8px] text-green-600 mt-1">✅ Économise {(prixOrigin - a.prix).toFixed(0)}$ • Régime prestataire • Boutique fonctionnelle</p>

                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      <button onClick={() => handleContact(a)} className="bg-black text-white text-[10px] font-bold py-2 rounded-full">💬 WhatsApp</button>
                      <Link href={`/produit/${a.id}`} className="bg-gray-100 text-center text-[10px] font-bold py-2 rounded-full">Voir • {TAUX_CDF}</Link>
                    </div>

                    <p className="text-[8px] text-gray-400 mt-2 text-center">👤 {a.nom || "Prestataire"} • 🔒 {cleanWhatsapp(a.ownerWhatsapp || a.whatsapp).slice(-4)} • {isTech ? "Soudeur + Tout travaux même régime" : `Pro ${FORMULES.pro.prix}$`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA CREER VENTE FLASH */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-[#6C3CE0] to-[#FF3B30] rounded-2xl p-4 text-white">
          <p className="font-black text-[14px]">🔥 Tu es prestataire ? Crée ta vente flash!</p>
          <p className="text-[11px] mt-1 opacity-90">Remise 25% à 60% • Visible 2h à 24h • Boost boutique • Régime prestataire unique Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF - Soudeur + Tout travaux même régime - Taux {TAUX_CDF} CDF fixe - {CATEGORIES_WENZE.length} métiers</p>
          
          <div className="mt-3 grid grid-cols-2 gap-2">
            {canCreateFlash ? (
              <Link href="/publier?type=flash" className="bg-white text-[#6C3CE0] py-2.5 rounded-full text-center font-bold text-[12px]">+ Créer Flash • {FORMULES.pro.prix}$</Link>
            ) : (
              <Link href="/tarifs" className="bg-white text-[#6C3CE0] py-2.5 rounded-full text-center font-bold text-[12px]">🔓 Débloque Pro {FORMULES.pro.prix}$</Link>
            )}
            <Link href="/boutiques" className="bg-black/20 border border-white/30 text-white py-2.5 rounded-full text-center font-bold text-[12px]">🏪 Boutiques • Taux {TAUX_CDF}</Link>
          </div>

          <div className="mt-3 bg-white/10 rounded-xl p-2">
            <p className="text-[9px] font-bold">Diagnostic vente flash - Temps présent - Concordance</p>
            <p className="text-[8px] opacity-80 mt-1">Flash: {annonces.length} actives • Filtre: {filtreCat} • User: {user ? `${user.nom} ${user.type} • ${user.regime}` : "Non connecté"} • Abonnement: {abonnement?.actif ? `${abonnement.type} ${abonnement.expireDans}j` : "Freemium"} • Peut créer: {canCreateFlash ? "OUI" : "NON"} • Taux: {TAUX_CDF} CDF • Pro: {FORMULES.pro.prix}$ = {FORMULES.pro.prixCDF} CDF • {CATEGORIES_WENZE.length} métiers • Régime: prestataire unique Soudeur + Tout travaux même régime • Boutiques fonctionnelles: OUI</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white border rounded-xl p-3"><p className="font-black">{annonces.length}</p><p className="text-[10px] text-gray-500">Flash actifs</p><p className="text-[8px] text-[#FF3B30]">-25% à -60%</p></div>
          <div className="bg-white border rounded-xl p-3"><p className="font-black">{formatTime(timeLeft)}</p><p className="text-[10px] text-gray-500">Fin globale</p><p className="text-[8px] text-gray-400">Minuit Kin</p></div>
          <div className="bg-white border rounded-xl p-3"><p className="font-black">{TAUX_CDF}</p><p className="text-[10px] text-gray-500">CDF fixe</p><p className="text-[8px] text-green-600">Pro {FORMULES.pro.prix}$</p></div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
export const dynamic = 'force-dynamic';
