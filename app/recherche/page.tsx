"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { lireSession, cle9 } from "@/lib/connexion";
import {
  getCategorieById,
  normalizeCategorie,
  CATEGORIES_WENZE,
} from "@/lib/categories";
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

const safeParse = (k: string) => {
  try {
    if (typeof window === "undefined") return [];
    const r = localStorage.getItem(k);
    const p = r ? JSON.parse(r) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

function isAnnonceVisibleRecherche(a: any): boolean {
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

function tracerRechercheJournal(
  action: "RECHERCHE_EXECUTEE",
  acteurWa: string,
  roleActuel: string,
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

    if (detail) {
      const prevAct = safeParse("wenze_journal_activite");
      const msg = `Recherche effectuée : "${detail}"`;
      const last = prevAct[0];
      if (
        !last ||
        last.message !== msg ||
        Date.now() - Number(last.ts || 0) >= 4000
      ) {
        const entry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          date: new Date().toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          role: roleActuel || "client",
          type: "navigation",
          message: msg,
        };
        localStorage.setItem(
          "wenze_journal_activite",
          JSON.stringify([entry, ...prevAct].slice(0, 60))
        );
        window.dispatchEvent(new Event("wenze-update"));
      }
    }
  } catch {}
}

function formatZoneCourte(item: any): string {
  const parts = [
    item?.commune || "Kinshasa",
    item?.quartier ? `Q/ ${item.quartier}` : "",
    item?.province && item.province !== "Kinshasa" ? item.province : "",
  ].filter(Boolean);
  return parts.join(" • ");
}

export default function RecherchePage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [resultBoutiques, setResultBoutiques] = useState<any[]>([]);
  const [resultAnnonces, setResultAnnonces] = useState<any[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [moi, setMoi] = useState<any>(null);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});
  const [syncTick, setSyncTick] = useState(0);

  const monRole = String(moi?.role || "client").toLowerCase();
  const jeSuisDG =
    moi?.roleAdmin === "dg" ||
    monRole === "dg" ||
    Boolean(moi?.dgSessionActive);
  const jePeuxVoirGros = monRole === "grossiste" || jeSuisDG;

  const getPrixAnnonceUSD = useCallback(
    (a: any): number => {
      const estGros = a?.typeAnnonce === "gros";
      if (estGros && jePeuxVoirGros) {
        const pg = Number(a?.prixGrosUSD ?? a?.prixGros ?? 0);
        if (pg > 0) return pg;
      }
      return Number(a?.prixUSD ?? a?.prix ?? 0);
    },
    [jePeuxVoirGros]
  );

  useEffect(() => {
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

    const onSync = () => setSyncTick((t) => t + 1);
    window.addEventListener("storage", onSync);
    window.addEventListener("wenze-update", onSync);
    return () => {
      window.removeEventListener("storage", onSync);
      window.removeEventListener("wenze-update", onSync);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!debounced || debounced.length < 2) {
      setResultBoutiques([]);
      setResultAnnonces([]);
      return;
    }

    const q = debounced.toLowerCase();
    const allUsers = safeParse("wenze_all_users");
    const currentRaw =
      typeof window !== "undefined" ? localStorage.getItem("wenze_user") : null;
    const map = new Map<string, any>();

    try {
      if (currentRaw) {
        const u = JSON.parse(currentRaw);
        const wa = cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "");
        if (wa) map.set(wa, u);
      }
    } catch {}

    for (const u of allUsers) {
      const wa = cle9(
        u?.ownerWhatsapp || u?.whatsapp || u?.telephone || u?.id || ""
      );
      if (!wa) continue;
      try {
        if (typeof isCompteCache === "function" && isCompteCache(u)) continue;
      } catch {}
      if (!map.has(wa)) map.set(wa, u);
    }

    const allBoutiques = Array.from(map.values());

    const filteredBoutiques = allBoutiques
      .filter((u: any) => {
        const nom = String(u?.nomEtablissement || u?.nom || "").toLowerCase();
        const province = String(u?.province || "").toLowerCase();
        const commune = String(u?.commune || "").toLowerCase();
        const quartier = String(u?.quartier || "").toLowerCase();
        const avenue = String(u?.avenue || "").toLowerCase();
        const activite = String(
          u?.activite || u?.activiteId || ""
        ).toLowerCase();
        const cat = String(u?.categorieId || "").toLowerCase();
        const match =
          nom.includes(q) ||
          province.includes(q) ||
          commune.includes(q) ||
          quartier.includes(q) ||
          avenue.includes(q) ||
          activite.includes(q) ||
          cat.includes(q);
        if (!match) return false;
        if (
          filterCat !== "all" &&
          normalizeCategorie(u?.categorieId || "") !== filterCat
        ) {
          return false;
        }
        return true;
      })
      .map((u: any) => {
        let ab: any = null;
        try {
          ab = checkFreemiumWenze && checkFreemiumWenze(u, 0);
        } catch {}
        return {
          ...u,
          _isPaye: Boolean(ab?.isPaye),
          _palierId: ab?.palierId || "FREEMIUM",
          _places: Math.min(
            PLAFOND_ACTIVES,
            Number(ab?.placesRestantes ?? PLAFOND_ACTIVES)
          ),
          _wa: cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || ""),
        };
      })
      .slice(0, 20);

    const allAnnonces = safeParse("wenze_annonces_list");
    const usersMap = new Map<string, any>();
    for (const u of allUsers) {
      const wa = cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "");
      if (wa) usersMap.set(wa, u);
    }

    const filteredAnnonces = allAnnonces
      .filter((a: any) => isAnnonceVisibleRecherche(a))
      .filter((a: any) => {
        const waA = cle9(a?.ownerWhatsapp || a?.whatsapp || a?.userId || "");
        const vendeur = usersMap.get(waA);
        try {
          if (
            vendeur &&
            typeof isCompteCache === "function" &&
            isCompteCache(vendeur)
          ) {
            return false;
          }
        } catch {}
        if (
          filterCat !== "all" &&
          normalizeCategorie(a?.categorieId || a?.categorie || "") !== filterCat
        ) {
          return false;
        }
        const titre = String(a?.titre || a?.title || "").toLowerCase();
        const desc = String(a?.description || "").toLowerCase();
        const province = String(a?.province || "").toLowerCase();
        const commune = String(a?.commune || "").toLowerCase();
        const quartier = String(a?.quartier || "").toLowerCase();
        const avenue = String(a?.avenue || "").toLowerCase();
        const ville = String(a?.ville || "").toLowerCase();
        const activite = String(a?.activite || "").toLowerCase();
        return (
          titre.includes(q) ||
          desc.includes(q) ||
          province.includes(q) ||
          commune.includes(q) ||
          quartier.includes(q) ||
          avenue.includes(q) ||
          ville.includes(q) ||
          activite.includes(q)
        );
      })
      .map((a: any) => {
        const waA = cle9(a?.ownerWhatsapp || a?.whatsapp || a?.userId || "");
        const vendeur = usersMap.get(waA);
        let isPaye = false;
        try {
          const ab = vendeur
            ? checkFreemiumWenze && checkFreemiumWenze(vendeur, 0)
            : null;
          isPaye = Boolean(ab?.isPaye);
        } catch {}
        const imgs: string[] = Array.isArray(a?.images)
          ? a.images
          : a?.photo
          ? [a.photo]
          : [];
        const safeImgs = isPaye
          ? imgs
          : imgs.slice(0, MAX_FREE_IMAGES);
        return {
          ...a,
          _safeImages: safeImgs,
        };
      })
      .slice(0, Math.min(30, PLAFOND_ACTIVES));

    setResultBoutiques(filteredBoutiques);
    setResultAnnonces(filteredAnnonces);

    tracerRechercheJournal(
      "RECHERCHE_EXECUTEE",
      cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
      monRole,
      debounced
    );
  }, [debounced, filterCat, moi, monRole, syncTick]);

  const total = resultBoutiques.length + resultAnnonces.length;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            href="/market"
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center font-black shrink-0"
          >
            ←
          </Link>
          <div className="flex-1 relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher boutique, article, province, commune..."
              className="w-full border-2 rounded-full pl-11 pr-8 py-3 text-[13px] focus:ring-2 focus:ring-black outline-none focus:border-black"
              autoFocus
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[12px]"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterCat("all")}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold border-2 transition ${
              filterCat === "all"
                ? "bg-black text-white border-black"
                : "bg-white border-gray-200"
            }`}
          >
            Tous • {total}
          </button>
          {CATEGORIES_WENZE.slice(0, 4).map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterCat(c.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold border-2 transition flex items-center gap-1 ${
                filterCat === c.id
                  ? "bg-black text-white border-black"
                  : "bg-white border-gray-200"
              }`}
            >
              {c.icon} {c.titreCourt || c.titre}
            </button>
          ))}
        </div>

        <div className="mt-2 bg-black text-white rounded-xl p-2.5 text-[9px] flex justify-between items-center gap-2">
          <span>
            <b>0 % commission</b> • Freemium :{" "}
            <b>
              {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
            </b>{" "}
            puis <b>is_visible = false</b> • Max <b>{PLAFOND_ACTIVES}</b>{" "}
            actives • Min {usd(1)} ({toCDFString(1)})
          </span>
          <span className="bg-white text-black px-2 py-0.5 rounded-full font-black shrink-0">
            {TAUX_CDF}
          </span>
        </div>
      </header>

      <div className="p-4 space-y-5">
        {!debounced ? (
          <div className="text-center py-14">
            <p className="text-5xl">🔍</p>
            <p className="font-black text-[14px] mt-3">
              {cfgPublique?.titreRecherche || "Recherche • RDC"}
            </p>
            <p className="text-[11px] text-gray-500 mt-2 max-w-[280px] mx-auto">
              Saisissez au moins 2 caractères • 0 % commission • Taux{" "}
              {TAUX_CDF} CDF/$
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                "riz",
                "ciment",
                "coiffure",
                "Gombe",
                "Lubumbashi",
                "électricien",
              ].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSearch(k)}
                  className="bg-white border px-3 py-1.5 rounded-full text-[11px] font-bold hover:border-black"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {debounced && debounced.length >= 2 && total === 0 ? (
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-3xl">😕</p>
            <p className="font-bold text-[13px] mt-2">
              Aucun résultat pour &ldquo;{debounced}&rdquo;
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              0 % commission • Taux {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES}{" "}
              actives
            </p>
            <Link
              href="/publier"
              className="mt-4 inline-block bg-black text-white px-5 py-2.5 rounded-full text-[11px] font-black"
            >
              Publier une annonce
            </Link>
          </div>
        ) : null}

        {resultBoutiques.length > 0 ? (
          <div>
            <p className="font-black text-[13px] flex items-center gap-2">
              <span>🏪 Boutiques • {resultBoutiques.length}</span>
            </p>
            <div className="mt-3 grid gap-3">
              {resultBoutiques.map((b: any) => {
                const cat: any = getCategorieById(
                  normalizeCategorie(b?.categorieId || "commerces-services")
                );
                const boutiqueHref = `/boutiques/${encodeURIComponent(
                  b?._wa || b?.id || ""
                )}`;
                return (
                  <Link
                    key={b?._wa || b?.id}
                    href={boutiqueHref}
                    className="bg-white border rounded-2xl p-3 flex gap-3 hover:shadow transition"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#FFFBF0] border-2 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {b?.photo ? (
                        <img
                          src={b.photo}
                          alt={b?.nomEtablissement || b?.nom || "Boutique"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{cat?.icon || "🏪"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[13px] truncate flex items-center gap-2">
                        <span>
                          {b?.nomEtablissement || b?.nom || "Boutique"}
                        </span>
                        <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {b?._palierId}
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-600 truncate">
                        {formatZoneCourte(b)} •{" "}
                        {b?.activite || b?.activiteId || cat?.titre || ""}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {b?._places}/{PLAFOND_ACTIVES} places • Taux {TAUX_CDF}{" "}
                        CDF/$ • 0 % comm
                      </p>
                    </div>
                    <span className="text-[11px] bg-black text-white px-3 py-1.5 rounded-full font-bold h-fit self-center">
                      Voir
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {resultAnnonces.length > 0 ? (
          <div>
            <p className="font-black text-[13px]">
              📦 Annonces • {resultAnnonces.length}{" "}
              <span className="text-[10px] font-normal text-gray-500">
                0 % commission • Max {PLAFOND_ACTIVES} actives
              </span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {resultAnnonces.map((a: any) => {
                const cat: any = getCategorieById(
                  normalizeCategorie(
                    a?.categorieId || a?.categorie || "commerces-services"
                  )
                );
                const prixUSD = getPrixAnnonceUSD(a);
                const imgSrc = a?._safeImages?.[0] || a?.photo;
                const estGrosVisible =
                  a?.typeAnnonce === "gros" &&
                  jePeuxVoirGros &&
                  Number(a?.prixGrosUSD ?? a?.prixGros ?? 0) > 0;
                return (
                  <Link
                    key={a.id || a.annonceId}
                    href={`/produit/${encodeURIComponent(a.id || a.annonceId)}`}
                    className="bg-white border rounded-2xl overflow-hidden hover:shadow transition"
                  >
                    <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden relative">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={a?.titre || a?.title || "Annonce"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">{cat?.icon || "📦"}</span>
                      )}
                      <span className="absolute top-2 left-2 bg-black text-white text-[8px] px-2 py-1 rounded-full font-bold">
                        {cat?.icon} {cat?.titreCourt || ""}
                      </span>
                      {estGrosVisible ? (
                        <span className="absolute bottom-2 left-2 bg-orange-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black">
                          🏭 GROS
                        </span>
                      ) : null}
                    </div>
                    <div className="p-2.5">
                      <p className="font-bold text-[11px] truncate">
                        {a?.titre || a?.title}
                      </p>
                      <p className="text-[11px] font-black text-orange-600 mt-1">
                        {prixUSD > 0
                          ? `${usd(prixUSD)} / ${toCDFString(prixUSD)}`
                          : "Prix sur demande"}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1 truncate">
                        {formatZoneCourte(a)} •{" "}
                        {a?.ownerName || a?.nomBoutique || a?.vendeur || "Boutique"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link
          href="/"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">🏠</span>Accueil
        </Link>
        <Link
          href="/market"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">🏪</span>Marché
        </Link>
        <Link
          href="/recherche"
          className="font-black text-black flex flex-col items-center gap-0.5"
        >
          <span className="text-[18px]">🔍</span>Recherche
        </Link>
        <Link
          href="/panier"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">🛒</span>Panier
        </Link>
        <Link
          href="/profil"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">👤</span>Profil
        </Link>
      </nav>
    </div>
  );
}
