"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { lireSession, cle9 } from "@/lib/connexion";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  toCDF,
  usd,
  isCompteCache,
  checkFreemiumWenze,
} from "@/lib/paiement";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

type PanierItem = {
  id: string;
  titre: string;
  title?: string;
  name?: string;
  prix: number;
  prixUSD?: number;
  price?: number;
  typeAnnonce?: string;
  prixGros?: number;
  prixGrosUSD?: number;
  uniteGros?: string;
  minimumCommande?: number;
  prixAffiche?: number;
  photo?: string;
  images?: string[];
  video?: string;
  typeMedia?: "image" | "video";
  vendeur: string;
  nomBoutique?: string;
  whatsapp: string;
  ownerWhatsapp?: string;
  userId?: string;
  categorieId?: string;
  commune?: string;
  quantite?: number;
  qty?: number;
  _vendeurCache?: boolean;
  _palierId?: string;
};

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

function tracerPanierJournal(
  action: "PANIER_COMMANDE_WA" | "PANIER_VIDE" | "PANIER_ARTICLE_SUPPRIME",
  acteurWa: string,
  detail?: string
) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("wenze_journal");
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      acteurWhatsapp: acteurWa,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export default function Panier() {
  const [items, setItems] = useState<PanierItem[]>([]);
  const [moi, setMoi] = useState<any>(null);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  const monRole = String(moi?.role || "client").toLowerCase();
  const jeSuisDG =
    moi?.roleAdmin === "dg" ||
    monRole === "dg" ||
    Boolean(moi?.dgSessionActive);
  const jeSuisGrossiste = monRole === "grossiste" || jeSuisDG;

  const prixUnitairePour = useCallback(
    (it: PanierItem): number => {
      if (it.typeAnnonce === "gros" && jeSuisGrossiste) {
        const pg = Number(it.prixGrosUSD ?? it.prixGros ?? 0);
        if (pg > 0) return pg;
      }
      return Number(it.prixUSD ?? it.prix ?? it.price ?? 0);
    },
    [jeSuisGrossiste]
  );

  const prixAffichePour = useCallback(
    (it: PanierItem): string => {
      const mUSD = prixUnitairePour(it);
      if (mUSD <= 0) return "Prix sur demande";
      const baseStr = `${usd(mUSD)} / ${toCDFString(mUSD)}`;
      if (it.typeAnnonce === "gros" && jeSuisGrossiste) {
        return `${baseStr} / ${it.uniteGros || "carton"}`;
      }
      return baseStr;
    },
    [prixUnitairePour, jeSuisGrossiste]
  );

  const load = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      setCfgPublique(lireConfigPublique());

      const session: any = lireSession();
      const rawUser = localStorage.getItem("wenze_user");
      const currentUser =
        session ||
        (() => {
          try {
            return rawUser ? JSON.parse(rawUser) : null;
          } catch {
            return null;
          }
        })();
      setMoi(currentUser);

      const savedRaw = localStorage.getItem("wenze_panier") || "[]";
      const savedParsed = JSON.parse(savedRaw);
      const savedList = (Array.isArray(savedParsed) ? savedParsed : []).slice(
        0,
        PLAFOND_ACTIVES
      );

      const allUsersRaw = localStorage.getItem("wenze_all_users") || "[]";
      const allUsersParsed = JSON.parse(allUsersRaw);
      const allUsers = Array.isArray(allUsersParsed) ? allUsersParsed : [];
      const userMap = new Map<string, any>();
      for (const u of allUsers) {
        const wa = cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "");
        if (wa) userMap.set(wa, u);
      }

      const normalized: PanierItem[] = savedList.map((it: any) => {
        const prixDetailUSD = Number(it?.prixUSD ?? it?.prix ?? it?.price ?? 0);
        const prixGrosVal = Number(it?.prixGrosUSD ?? it?.prixGros ?? 0);
        const imgs: string[] = Array.isArray(it?.images)
          ? it.images.slice(0, MAX_FREE_IMAGES)
          : it?.photo
          ? [it.photo]
          : [];

        const wa = cle9(
          it?.ownerWhatsapp || it?.whatsapp || it?.userId || ""
        );
        const uVendeur = userMap.get(wa) || {
          ownerWhatsapp: wa,
          createdAt: "",
          id: wa,
        };

        let vendeurCache = false;
        let palierId = "FREEMIUM";
        try {
          vendeurCache = Boolean(isCompteCache && isCompteCache(uVendeur));
          const ab = checkFreemiumWenze && checkFreemiumWenze(uVendeur, 0);
          palierId = ab?.palierId || (ab?.isPaye ? "ACTIF" : "FREEMIUM");
        } catch {}

        return {
          id: String(it?.id || it?.annonceId || ""),
          titre: it?.titre || it?.title || it?.name || "Article",
          title: it?.title,
          name: it?.name,
          prix: prixDetailUSD,
          prixUSD: prixDetailUSD,
          price: it?.price,
          typeAnnonce: it?.typeAnnonce,
          prixGros: prixGrosVal,
          prixGrosUSD: prixGrosVal,
          uniteGros: it?.uniteGros || "carton",
          minimumCommande: Number(it?.minimumCommande || 10),
          prixAffiche: it?.prixAffiche,
          photo: imgs[0] || it?.photo,
          images: imgs,
          video: it?.video,
          typeMedia: it?.typeMedia,
          vendeur:
            it?.vendeur || it?.nomBoutique || it?.user || "Boutique Kinshasa",
          nomBoutique: it?.nomBoutique || it?.vendeur,
          whatsapp: it?.whatsapp || it?.ownerWhatsapp || "",
          ownerWhatsapp: it?.ownerWhatsapp || it?.whatsapp || "",
          userId: it?.userId,
          categorieId: normalizeCategorie(
            it?.categorieId || "commerces-services"
          ),
          commune: it?.commune || "Kinshasa",
          quantite: Math.max(1, Number(it?.quantite ?? it?.qty ?? 1)),
          qty: Math.max(1, Number(it?.qty ?? it?.quantite ?? 1)),
          _vendeurCache: vendeurCache,
          _palierId: palierId,
        };
      });

      setItems(normalized);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
    const onStorage = (e: StorageEvent) => {
      if (
        e.key?.includes("panier") ||
        e.key?.includes("wenze_user") ||
        e.key?.includes("wenze_config_publique")
      ) {
        load();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("wenze-update", load);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wenze-update", load);
    };
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, PanierItem[]>();
    for (const it of items) {
      const wa = cle9(it.ownerWhatsapp || it.whatsapp || "") || it.vendeur;
      if (!map.has(wa)) map.set(wa, []);
      map.get(wa)!.push(it);
    }
    return Array.from(map.entries()).map(([wa, list]) => ({
      wa,
      vendeur: list[0].vendeur || list[0].nomBoutique || "Boutique",
      items: list,
      totalUSD: list.reduce(
        (s, i) => s + prixUnitairePour(i) * (i.quantite || 1),
        0
      ),
      isCache: Boolean(list[0]._vendeurCache),
      palier: list[0]._palierId || "FREEMIUM",
    }));
  }, [items, prixUnitairePour]);

  const totalGlobalUSD = useMemo(
    () =>
      items.reduce((s, i) => s + prixUnitairePour(i) * (i.quantite || 1), 0),
    [items, prixUnitairePour]
  );

  const updateQty = (id: string, delta: number) => {
    try {
      if (typeof window === "undefined") return;
      const savedRaw = localStorage.getItem("wenze_panier") || "[]";
      const saved = JSON.parse(savedRaw);
      if (!Array.isArray(saved)) return;
      const idx = saved.findIndex(
        (it: any) => String(it?.id || it?.annonceId || "") === String(id)
      );
      if (idx >= 0) {
        const isGros = saved[idx]?.typeAnnonce === "gros";
        const min = isGros ? Math.max(1, Number(saved[idx]?.minimumCommande || 10)) : 1;
        const nextQ = Number(saved[idx]?.quantite ?? saved[idx]?.qty ?? 1) + delta;
        if (nextQ <= 0 && !isGros) {
          saved.splice(idx, 1);
        } else {
          const clamped = Math.max(min, nextQ);
          saved[idx].quantite = clamped;
          saved[idx].qty = clamped;
        }
        localStorage.setItem("wenze_panier", JSON.stringify(saved));
        window.dispatchEvent(new Event("wenze-update"));
        load();
      }
    } catch {}
  };

  const removeItem = (id: string) => {
    try {
      if (typeof window === "undefined") return;
      const savedRaw = localStorage.getItem("wenze_panier") || "[]";
      const saved = JSON.parse(savedRaw);
      const next = (Array.isArray(saved) ? saved : []).filter(
        (it: any) => String(it?.id || it?.annonceId || "") !== String(id)
      );
      localStorage.setItem("wenze_panier", JSON.stringify(next));
      tracerPanierJournal(
        "PANIER_ARTICLE_SUPPRIME",
        cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
        String(id)
      );
      window.dispatchEvent(new Event("wenze-update"));
      load();
    } catch {}
  };

  const clearPanier = () => {
    if (typeof window === "undefined") return;
    if (!window.confirm(`Vider le panier (${items.length} article(s)) ?`)) {
      return;
    }
    localStorage.setItem("wenze_panier", "[]");
    tracerPanierJournal(
      "PANIER_VIDE",
      cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
      `${items.length} article(s)`
    );
    window.dispatchEvent(new Event("wenze-update"));
    setItems([]);
  };

  const grosRestreint = items.filter(
    (it) => it.typeAnnonce === "gros" && !jeSuisGrossiste
  );

  if (items.length === 0) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
        <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center font-black"
          >
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="font-black text-[16px] truncate">
              {cfgPublique?.titrePanier || "Panier Wenze Wenze"}
            </h1>
            <p className="text-[10px] text-gray-500">
              0 article • 0 % commission • Taux {TAUX_CDF} CDF/$
            </p>
          </div>
        </header>

        <div className="p-4">
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center mt-6">
            <p className="text-4xl">🛒</p>
            <p className="font-black mt-2">Votre panier est vide</p>
            <p className="text-[11px] text-gray-500 mt-1">
              0 % commission • Minimum {usd(1)} ({toCDFString(1)}) • Taux{" "}
              {TAUX_CDF} CDF/$
            </p>
            <Link
              href="/"
              className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]"
            >
              Découvrir à Kinshasa
            </Link>
          </div>

          <div className="mt-4 bg-black text-white rounded-xl p-2.5 text-[10px] leading-relaxed">
            <b>0 % commission</b> • Freemium :{" "}
            <b>
              {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
            </b>{" "}
            puis <b>is_visible = false</b> • Max <b>{PLAFOND_ACTIVES}</b>{" "}
            annonces actives.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-32">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center font-black"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[16px] truncate">
              Panier • {items.length} article(s)
            </h1>
            <p className="text-[10px] text-gray-500 truncate">
              {grouped.length} boutique(s) • {usd(totalGlobalUSD)} /{" "}
              {toCDFString(totalGlobalUSD)} • 0 % comm
            </p>
          </div>
          <button
            type="button"
            onClick={clearPanier}
            className="text-[11px] bg-gray-100 px-3 py-1.5 rounded-full font-bold shrink-0"
          >
            Vider
          </button>
        </div>

        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px] flex justify-between items-center gap-2">
          <span>
            <b>0 % commission</b> • Taux {TAUX_CDF} CDF/$ • Max{" "}
            <b>{PLAFOND_ACTIVES}</b> actives • Freemium {MAX_FREE_IMAGES} img /{" "}
            {FREE_DAYS}j
          </span>
          <span className="bg-white text-black px-2 py-0.5 rounded-full font-black shrink-0">
            {usd(1)} = {toCDFString(1)}
          </span>
        </div>
      </header>

      <div className="p-3 space-y-4">
        {grosRestreint.length > 0 ? (
          <div className="bg-orange-50 border border-orange-300 rounded-2xl p-3">
            <p className="font-black text-[12px]">
              ℹ️ {grosRestreint.length} article(s) gros chiffré(s) au tarif
              détail
            </p>
            <p className="text-[11px] text-gray-600 mt-1">
              Les tarifs gros sont réservés aux comptes Grossiste et DG.
            </p>
          </div>
        ) : null}

        {grouped.map((g) => {
          const wa = cle9(g.wa);
          const lignes = g.items
            .map((i) => {
              const q = i.quantite || 1;
              const uPrice = prixUnitairePour(i);
              const subUSD = uPrice * q;
              return `• ${i.titre} x${q} — ${usd(subUSD)} / ${toCDFString(
                subUSD
              )}`;
            })
            .join("\n");

          const text = encodeURIComponent(
            `Bonjour ${g.vendeur}, commande Wenze Wenze (0 % commission) :\n${lignes}\nTotal boutique : ${usd(
              g.totalUSD
            )} / ${toCDFString(g.totalUSD)} (Taux ${TAUX_CDF} CDF/$)`
          );

          const catObj = getCategorieById(
            normalizeCategorie(g.items[0].categorieId || "commerces-services")
          ) as any;

          return (
            <div
              key={g.wa}
              className={`bg-white rounded-2xl border overflow-hidden ${
                g.isCache ? "opacity-75 border-dashed" : "shadow-sm"
              }`}
            >
              <div className="p-3 flex items-center gap-3 bg-gray-50 border-b">
                <div className="w-10 h-10 bg-white rounded-full border flex items-center justify-center text-lg shrink-0">
                  {catObj?.icon || "🏪"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[13px] flex items-center gap-1.5 truncate">
                    <span className="truncate">{g.vendeur}</span>
                    <span className="text-[9px] bg-gray-200 px-1.5 py-0.5 rounded-full shrink-0">
                      {g.palier}
                      {g.isCache ? " • is_visible = false" : ""}
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {g.items.length} article(s) • {usd(g.totalUSD)} /{" "}
                    {toCDFString(g.totalUSD)}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {wa ? `0${wa.slice(-9)}` : ""}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {g.items.map((it) => {
                  const cat = getCategorieById(
                    normalizeCategorie(it.categorieId || "commerces-services")
                  ) as any;
                  const estGros = it.typeAnnonce === "gros";
                  const min = estGros
                    ? Math.max(1, Number(it.minimumCommande || 10))
                    : 1;
                  const q = it.quantite || 1;
                  const lineTotalUSD = prixUnitairePour(it) * q;

                  return (
                    <div key={it.id} className="p-3 flex gap-3">
                      <Link
                        href={`/produit/${encodeURIComponent(it.id)}`}
                        className="w-[64px] h-[64px] bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                      >
                        {it.photo || it.images?.[0] ? (
                          <img
                            src={it.photo || it.images?.[0]}
                            alt={it.titre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">{cat?.icon || "📦"}</span>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[12px] truncate">
                          {it.titre || it.name}
                        </p>
                        {estGros ? (
                          <span className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black inline-block mt-0.5">
                            GROS {jeSuisGrossiste ? "(TARIF GROS)" : "(DÉTAIL)"}
                          </span>
                        ) : null}
                        <p className="text-[11px] font-black text-orange-600 mt-0.5">
                          {prixAffichePour(it)}
                        </p>
                        {q > 1 ? (
                          <p className="text-[10px] font-bold text-gray-800">
                            Sous-total ({q}) : {usd(lineTotalUSD)} /{" "}
                            {toCDFString(lineTotalUSD)} ({toCDF(lineTotalUSD)}{" "}
                            FC)
                          </p>
                        ) : null}
                        {estGros ? (
                          <p className="text-[10px] text-gray-500">
                            Minimum : {min} {it.uniteGros || "cartons"}
                          </p>
                        ) : null}

                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
                            <button
                              type="button"
                              onClick={() => updateQty(it.id, -1)}
                              disabled={estGros && q <= min}
                              className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[12px] font-bold disabled:opacity-30"
                            >
                              -
                            </button>
                            <span className="text-[11px] font-bold px-2">
                              {q}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(it.id, 1)}
                              className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[12px] font-bold"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(it.id)}
                            className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold"
                          >
                            Suppr
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 flex gap-2">
                {wa ? (
                  <a
                    href={`https://wa.me/${wa}?text=${text}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      tracerPanierJournal(
                        "PANIER_COMMANDE_WA",
                        cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
                        `${g.vendeur} (${usd(g.totalUSD)})`
                      )
                    }
                    className="flex-1 bg-[#25D366] text-white text-[12px] font-black py-3 rounded-full flex justify-center items-center gap-2"
                  >
                    💬 Commander • {usd(g.totalUSD)}
                  </a>
                ) : null}
                <Link
                  href={`/boutiques/${encodeURIComponent(wa || g.wa)}`}
                  className="px-4 bg-gray-100 rounded-full flex items-center justify-center text-[11px] font-bold"
                >
                  Boutique
                </Link>
              </div>
            </div>
          );
        })}

        <div className="bg-white border rounded-2xl p-4">
          <div className="flex justify-between text-[13px] items-baseline gap-2">
            <span className="font-bold">Total global</span>
            <span className="font-black text-right">
              {usd(totalGlobalUSD)} / {toCDFString(totalGlobalUSD)}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            0 % commission • Taux {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES}{" "}
            annonces actives • Freemium {MAX_FREE_IMAGES} img / {FREE_DAYS}j
          </p>
        </div>

        <Link
          href="/"
          className="block text-center text-[11px] bg-white border rounded-full py-3 font-bold"
        >
          ← Continuer vos achats
        </Link>
      </div>

      <div className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t p-3 z-30">
        <div className="flex justify-between items-center mb-2 gap-2">
          <span className="font-black text-[13px] truncate">
            Total {usd(totalGlobalUSD)} / {toCDFString(totalGlobalUSD)}
          </span>
          <span className="text-[10px] text-gray-500 shrink-0">
            {items.length} art. • 0 % comm
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {grouped.map((g) => {
            const wa = cle9(g.wa);
            if (!wa) return null;
            const t = encodeURIComponent(
              `Bonjour ${g.vendeur}, commande Wenze Wenze (0 % commission) : ${usd(
                g.totalUSD
              )} / ${toCDFString(g.totalUSD)} — ${g.items
                .map((i) => `${i.titre} x${i.quantite || 1}`)
                .join(", ")}`
            );
            return (
              <a
                key={g.wa}
                href={`https://wa.me/${wa}?text=${t}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  tracerPanierJournal(
                    "PANIER_COMMANDE_WA",
                    cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
                    `${g.vendeur} (${usd(g.totalUSD)})`
                  )
                }
                className="whitespace-nowrap bg-[#25D366] text-white text-[11px] font-black px-5 py-3 rounded-full"
              >
                💬 {g.vendeur}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
