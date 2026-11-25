"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { lireSession, cle9 } from "@/lib/connexion";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
  isCompteCache,
  checkFreemiumWenze,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

function getTimeLeft(expireAt: string, currentMs: number) {
  const diff = new Date(expireAt).getTime() - currentMs;
  if (isNaN(diff) || diff <= 0) {
    return { expired: true, text: "Terminé", h: 0, m: 0, s: 0, diff: 0 };
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { expired: false, text: `${h}h ${m}m ${s}s`, h, m, s, diff };
}

function isAnnonceActuelleVisible(a: any): boolean {
  if (
    !a ||
    a.is_visible === false ||
    a.statut === "masque" ||
    a.statut === "expire"
  ) {
    return false;
  }
  if (a.isFreemium || a.plan === "GRATUIT" || a.palier === "GRATUIT") {
    const baseTime = new Date(
      a.createdAt || a.created_at || a.updatedAt || 0
    ).getTime();
    if (baseTime > 0) {
      const ageJours = (Date.now() - baseTime) / (1000 * 60 * 60 * 24);
      const maxJours = Number(a.dureeJours || FREE_DAYS || 30);
      if (ageJours > maxJours) return false;
    }
  }
  return true;
}

function lireConfigPublique(): Record<string, any> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("wenze_config_publique");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function FlashVentePage() {
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [user, setUser] = useState<any>(null);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const session: any = lireSession();
      setUser(session);
      setCfgPublique(lireConfigPublique());

      const rawList = localStorage.getItem("wenze_annonces_list") || "[]";
      const parsedList = JSON.parse(rawList);
      const list = (Array.isArray(parsedList) ? parsedList : [])
        .filter((a: any) => isAnnonceActuelleVisible(a))
        .slice(0, PLAFOND_ACTIVES);

      const allUsersRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : [];
      const userMap = new Map<string, any>();
      if (Array.isArray(allUsers)) {
        for (const u of allUsers) {
          const wa = cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "");
          if (wa) userMap.set(wa, u);
        }
      }

      const nowMs = Date.now();
      let flash = list.filter((a: any) => {
        const createdMs = new Date(a?.createdAt || a?.created_at || 0).getTime();
        const isRecent = createdMs > 0 && nowMs - createdMs < 48 * 3600000;
        return Boolean(a?.isFlash || a?.flash || a?.promotion || a?.remise || isRecent);
      });

      if (flash.length === 0) {
        flash = list.slice(0, Math.min(20, PLAFOND_ACTIVES));
      }

      flash = flash.filter((a: any) => {
        const wa = cle9(a?.ownerWhatsapp || a?.whatsapp || a?.userId || "");
        const u = userMap.get(wa) || {
          ownerWhatsapp: wa,
          whatsapp: wa,
          createdAt: a?.createdAt,
          id: wa,
        };
        try {
          if (typeof isCompteCache === "function" && isCompteCache(u)) {
            return false;
          }
        } catch {}
        return true;
      });

      flash = flash.map((a: any) => {
        const wa = cle9(a?.ownerWhatsapp || a?.whatsapp || a?.userId || "");
        const u = userMap.get(wa) || {
          ownerWhatsapp: wa,
          whatsapp: wa,
          createdAt: a?.createdAt,
          id: wa,
        };
        let isPaye = false;
        let palierId = "FREEMIUM";
        let expireAt = new Date(
          new Date(a?.createdAt || nowMs).getTime() + 24 * 3600000
        ).toISOString();

        try {
          if (typeof checkFreemiumWenze === "function") {
            const ab = checkFreemiumWenze(u, 0);
            isPaye = Boolean(ab?.isPaye);
            palierId = ab?.palierId || (isPaye ? "ACTIF" : "FREEMIUM");
            expireAt = isPaye
              ? ab?.expireAt || expireAt
              : new Date(
                  new Date(a?.createdAt || nowMs).getTime() + 24 * 3600000
                ).toISOString();
          }
        } catch {}

        const rawImages: string[] = Array.isArray(a?.images)
          ? a.images
          : a?.photo
          ? [a.photo]
          : [];
        const safeImages = isPaye
          ? rawImages
          : rawImages.slice(0, MAX_FREE_IMAGES);

        return {
          ...a,
          _safeImages: safeImages,
          _isPaye: isPaye,
          _palierId: palierId,
          _expireAt: expireAt,
        };
      });

      flash.sort((a: any, b: any) => {
        if (a._isPaye && !b._isPaye) return -1;
        if (!a._isPaye && b._isPaye) return 1;
        return (
          new Date(b?.createdAt || 0).getTime() -
          new Date(a?.createdAt || 0).getTime()
        );
      });

      setAnnonces(flash.slice(0, PLAFOND_ACTIVES));
    } catch {
      setAnnonces([]);
    }
  }, []);

  const monRole = String(user?.role || "client").toLowerCase();
  const jeSuisDG =
    user?.roleAdmin === "dg" ||
    monRole === "dg" ||
    Boolean(user?.dgSessionActive);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return annonces.filter((a: any) => {
      const tl = getTimeLeft(a._expireAt, now);
      if (tl.expired && !a._isPaye) return false;
      if (!q) return true;
      const titre = String(a?.titre || a?.title || "").toLowerCase();
      const desc = String(a?.description || "").toLowerCase();
      const commune = String(a?.commune || "").toLowerCase();
      return titre.includes(q) || desc.includes(q) || commune.includes(q);
    });
  }, [annonces, search, now]);

  return (
    <div className="min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 z-20 bg-black text-white p-3.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center font-black shrink-0"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[16px] truncate">
              {cfgPublique?.titreFlashVente || "⚡ Ventes Flash • Kinshasa"}
            </h1>
            <p className="text-[10px] text-white/75 truncate">
              0 % commission • Taux {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES}{" "}
              annonces actives
            </p>
          </div>
          <span className="text-[10px] bg-white text-black px-2.5 py-1 rounded-full font-black shrink-0">
            {filtered.length} flash
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une vente flash, commune..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-[13px] text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <Link
            href="/publier"
            className="bg-white text-black px-4 py-2 rounded-xl text-[11px] font-black flex items-center shrink-0"
          >
            + Publier
          </Link>
        </div>

        <div className="mt-2.5 text-[10px] text-white/80 bg-white/10 px-3 py-2 rounded-xl leading-relaxed">
          <b>0 % commission</b> • Freemium :{" "}
          <b>
            {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
          </b>{" "}
          puis <b>is_visible = false</b> • Tarif minimum : <b>{usd(1)}</b> (
          {toCDFString(1)})
        </div>
      </header>

      <div className="p-3 grid grid-cols-2 gap-3">
        {filtered.map((a: any) => {
          const tl = getTimeLeft(a._expireAt, now);
          const estGros = a?.typeAnnonce === "gros";
          const peutVoirGros = estGros && (monRole === "grossiste" || jeSuisDG);

          const prixUnitaire = peutVoirGros
            ? Number(a?.prixGrosUSD ?? a?.prixGros ?? a?.prixUSD ?? a?.prix ?? 0)
            : Number(a?.prixUSD ?? a?.prix ?? 0);

          const prixAncienNum = Number(a?.prixAncien || 0);
          const totalCycleMs = 24 * 3600000;
          const progressPct = tl.expired
            ? 0
            : Math.max(
                6,
                Math.min(
                  100,
                  Math.round(
                    ((totalCycleMs - Math.min(totalCycleMs, tl.diff)) /
                      totalCycleMs) *
                      100
                  )
                )
              );

          const waShort = cle9(
            a?.ownerWhatsapp || a?.whatsapp || a?.userId || ""
          ).slice(-9);

          return (
            <Link
              key={a.id || a.annonceId}
              href={`/produit/${encodeURIComponent(a.id || a.annonceId)}`}
              className="bg-white rounded-2xl border border-black/10 overflow-hidden hover:shadow-md transition relative flex flex-col"
            >
              <div className="aspect-square bg-gray-100 relative">
                {a._safeImages?.[0] ? (
                  <img
                    src={a._safeImages[0]}
                    alt={a.titre || a.title || "Article flash"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                    ⚡ FLASH
                  </div>
                )}

                <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full">
                  ⚡ {tl.text}
                </div>

                <div className="absolute top-1.5 right-1.5 text-[9px] bg-black/75 text-white px-2 py-0.5 rounded-full font-bold">
                  {a._isPaye ? a._palierId : "FREEMIUM"}
                </div>

                {prixAncienNum > prixUnitaire ? (
                  <div className="absolute bottom-1.5 left-1.5 bg-amber-300 text-black text-[9px] font-black px-2 py-0.5 rounded-full">
                    PROMO
                  </div>
                ) : null}
              </div>

              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-[12px] line-clamp-2 leading-snug">
                    {a.titre || a.title || "Offre Flash"}
                  </div>
                  <div className="mt-1.5">
                    <div className="text-[12px] font-black text-red-600">
                      {usd(prixUnitaire)}
                    </div>
                    <div className="text-[10px] text-gray-600 font-semibold">
                      {toCDFString(prixUnitaire)}
                    </div>
                    {prixAncienNum > prixUnitaire ? (
                      <div className="text-[10px] line-through text-gray-400">
                        {usd(prixAncienNum)}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 truncate">
                    {a.commune || "Kinshasa"}
                    {waShort ? ` • 0${waShort}` : ""}
                  </div>
                </div>

                <div className="mt-2.5 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="text-5xl mb-3">⚡</div>
          <div className="font-black text-[15px]">
            Aucune vente flash active pour le moment
          </div>
          <div className="text-[11px] text-gray-600 mt-2 max-w-[340px] mx-auto leading-relaxed">
            Les offres freemium expirées après {FREE_DAYS} jours (
            <b>is_visible = false</b>) sont masquées. Tarif minimum :{" "}
            <b>{usd(1)}</b> ({toCDFString(1)}) • 0 % commission.
          </div>
          <Link
            href="/publier"
            className="inline-block mt-4 bg-black text-white px-6 py-3 rounded-xl text-xs font-black"
          >
            Publier une offre flash
          </Link>
        </div>
      ) : null}
    </div>
  );
}
        
