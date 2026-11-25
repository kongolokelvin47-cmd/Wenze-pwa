"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TAUX_CDF,
  FREEMIUM,
  PALIERS,
  OCCASIONNEL,
  TYPES_OCC,
  EMPLACEMENTS_FLASH,
  MAX_ANNONCES_ACTIVES,
  PAIEMENT_MINIMUM_USD,
  verifierAbonnement,
  toCDFString,
  usd,
} from "@/lib/paiement";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);
const MIN_USD = Number(PAIEMENT_MINIMUM_USD || 1);

export default function TarifsPage() {
  const [ab, setAb] = useState<any>(null);
  const [showCourtes, setShowCourtes] = useState(false);

  const refresh = () => {
    try {
      setAb(verifierAbonnement());
    } catch {}
  };

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const onSync = () => refresh();
    window.addEventListener("storage", onSync);
    window.addEventListener("wenze_abonnements_updated", onSync);
    return () => {
      window.removeEventListener("storage", onSync);
      window.removeEventListener("wenze_abonnements_updated", onSync);
    };
  }, []);

  const palierIds = Object.keys(PALIERS);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[18px] leading-tight">Tarifs</h1>
            <p className="text-[10px] text-gray-500">
              0 % commission • Même prix pour tous • Taux {TAUX_CDF} CDF/$ • Min{" "}
              {usd(MIN_USD)} ({toCDFString(MIN_USD)})
            </p>
          </div>
          <span
            className={
              "text-[10px] px-2.5 py-1 rounded-full font-black shrink-0 " +
              (ab?.isCache
                ? "bg-red-100 text-red-700"
                : ab?.isPaye
                ? "bg-black text-white"
                : "bg-orange-100 text-orange-700")
            }
          >
            {ab?.badge || "🆓"} {ab?.palierId || "Gratuit"}
          </span>
        </div>
        <p className="mt-3 bg-black text-white rounded-xl p-2.5 text-[10px]">
          Nous vendons de la visibilité, jamais vos produits (0 % de
          commission). Vous contactez vos clients directement par WhatsApp.
        </p>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white border-2 border-dashed rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-black text-[14px]">🆓 Gratuit (Freemium)</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Pour démarrer à Kinshasa
              </p>
            </div>
            <span className="bg-gray-100 px-3 py-1 rounded-full text-[12px] font-black">
              0 $ / {toCDFString(0)}
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-[11px]">
            <li>
              ✅ <b>{MAX_FREE_IMAGES} images max</b> pendant{" "}
              <b>{FREE_DAYS} jours</b>
            </li>
            <li>
              ⚠️ Après {FREE_DAYS} jours sans renouvellement, passage automatique
              en masqué (<b>is_visible = false</b>)
            </li>
            <li>❌ Pas de vidéo en offre gratuite</li>
          </ul>
        </div>

        <div>
          <p className="font-black text-[13px]">🎫 Abonnements boutique</p>
          <p className="text-[10px] text-gray-500 mt-1">
            Les achats sont cumulables : les quotas d&apos;images
            s&apos;additionnent (maximum {PLAFOND_ACTIVES} annonces actives • 0 %
            commission).
          </p>

          <div className="mt-3 grid gap-3">
            {palierIds.map((k) => {
              const p: any = (PALIERS as any)[k];
              const normales = p.durees.filter((d: any) => !d.courte);
              const courtes = p.durees.filter((d: any) => d.courte);
              return (
                <div
                  key={k}
                  className={
                    "bg-white border-2 rounded-2xl p-5 shadow-sm " +
                    (k === "PRO" ? "border-black" : "")
                  }
                >
                  <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 bg-[#FFFBF0] border-2 rounded-xl flex items-center justify-center text-2xl">
                      {p.badge}
                    </div>
                    <div>
                      <p className="font-black text-[14px]">{k}</p>
                      <p className="text-[10px] text-gray-500">
                        {p.imagesMin} à {p.imagesMax} images + {p.videos}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {normales.map((d: any) => (
                      <div
                        key={d.id}
                        className="border rounded-xl p-2 text-center bg-[#FFFBF0]"
                      >
                        <p className="font-black text-[11px]">{d.jours} jours</p>
                        <p className="font-black text-[13px]">
                          {usd(d.prixUSD)}
                        </p>
                        <p className="text-[8px] text-gray-600">
                          {toCDFString(d.prixUSD)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {showCourtes && courtes.length > 0 ? (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {courtes.map((d: any) => (
                        <div
                          key={d.id}
                          className="border border-dashed rounded-xl p-2 text-center"
                        >
                          <p className="font-black text-[11px]">
                            {d.jours} jour{d.jours > 1 ? "s" : ""}
                          </p>
                          <p className="font-black text-[12px]">
                            {usd(d.prixUSD)}
                          </p>
                          <p className="text-[8px] text-gray-600">
                            {toCDFString(d.prixUSD)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <ul className="mt-3 space-y-1 text-[10px] text-gray-700">
                    {k === "STANDARD" ? (
                      <li>
                        ✓ Boutique visible, badge Standard, remontée quotidienne
                      </li>
                    ) : null}
                    {k === "PRO" ? (
                      <li>
                        ✓ Badge Pro, Top 10 de la catégorie, statistiques de
                        vues, remontée automatique à 8 h
                      </li>
                    ) : null}
                    {k === "PREMIUM" ? (
                      <li>
                        ✓ Page personnelle, Top 3 garanti dans votre catégorie,
                        badge Premium Or, support prioritaire
                      </li>
                    ) : null}
                  </ul>

                  <Link
                    href={"/abonnement?palier=" + encodeURIComponent(k)}
                    className={
                      "mt-4 block w-full text-center py-3.5 rounded-full font-black text-[12px] " +
                      (k === "PRO"
                        ? "bg-black text-white"
                        : "bg-white border-2 border-black text-black")
                    }
                  >
                    Choisir {k}
                  </Link>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowCourtes(!showCourtes)}
            className="mt-3 text-[11px] underline font-bold"
          >
            {showCourtes
              ? "Masquer les durées de 1 et 3 jours"
              : "Besoin de 1 ou 3 jours seulement ? Cliquez ici"}
          </button>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[13px]">
            🎟️ Boost flash (vente occasionnelle)
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            Pour les clients et pour les vendeurs : votre annonce passe en haut
            de l&apos;accueil. {EMPLACEMENTS_FLASH} emplacements en simultané,
            avec rotation équitable.
          </p>
          <div className="mt-3 space-y-2 text-[10px]">
            <div className="grid grid-cols-4 gap-2 font-black border-b pb-2">
              <span>Offre</span>
              <span>1 jour</span>
              <span>7 jours</span>
              <span>15 jours</span>
            </div>
            {TYPES_OCC.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-4 gap-2 items-center"
              >
                <span>
                  {t.badge} {t.label}
                </span>
                {OCCASIONNEL.offres
                  .filter((o) => o.type === t.id)
                  .map((o) => (
                    <span key={o.id} className="font-black leading-tight">
                      {usd(o.prixUSD)}
                      <span className="block text-[7.5px] font-normal text-gray-600">
                        {toCDFString(o.prixUSD)}
                      </span>
                    </span>
                  ))}
              </div>
            ))}
          </div>
          <Link
            href="/abonnement?mode=occasionnel"
            className="mt-3 block text-center bg-black text-white rounded-full py-3 font-black text-[12px]"
          >
            Booster une annonce
          </Link>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">❓ Questions fréquentes</p>
          <div className="mt-3 space-y-3 text-[11px]">
            <div>
              <p className="font-bold">
                Que se passe-t-il à la fin de mon abonnement ou de l&apos;offre
                gratuite ?
              </p>
              <p className="text-gray-600 mt-1">
                L&apos;offre gratuite couvre {MAX_FREE_IMAGES} images max
                pendant {FREE_DAYS} jours, puis passe en masqué (is_visible =
                false). À l&apos;expiration d&apos;un ticket, vos annonces
                deviennent invisibles jusqu&apos;au renouvellement.
              </p>
            </div>
            <div>
              <p className="font-bold">
                Pourquoi un minimum de {usd(MIN_USD)} ({toCDFString(MIN_USD)}) ?
              </p>
              <p className="text-gray-600 mt-1">
                C&apos;est le montant minimum accepté pour les paiements Mobile
                Money.
              </p>
            </div>
            <div>
              <p className="font-bold">Les achats se cumulent-ils ?</p>
              <p className="text-gray-600 mt-1">
                Oui. Chaque achat garde son quota et son échéance, dans la
                limite de {PLAFOND_ACTIVES} annonces actives (0 % commission).
              </p>
            </div>
            <div>
              <p className="font-bold">Pourquoi le même prix pour tous ?</p>
              <p className="text-gray-600 mt-1">
                Nous vendons de la visibilité, pas une catégorie :
                détaillants, grossistes et prestataires paient la même grille.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/abonnement"
            className="flex-1 bg-black text-white rounded-full py-4 text-center font-black text-[13px]"
          >
            🎫 Acheter
          </Link>
          <Link
            href="/"
            className="flex-1 bg-white border-2 border-black rounded-full py-4 text-center font-bold text-[13px]"
          >
            Voir le marché
          </Link>
        </div>
      </div>
    </div>
  );
}
          
