"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import {
  CATEGORIES_WENZE,
  normalizeCategorie,
} from "@/lib/categories";
import { cle9 } from "@/lib/connexion";
import {
  PALIERS,
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

function isAnnonceVisibleCat(a: any): boolean {
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

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countsPayes, setCountsPayes] = useState<Record<string, number>>({});
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      setCfgPublique(lireConfigPublique());

      const rawList = localStorage.getItem("wenze_annonces_list") || "[]";
      const parsedList = JSON.parse(rawList);
      const list = (Array.isArray(parsedList) ? parsedList : [])
        .filter((a: any) => isAnnonceVisibleCat(a))
        .slice(0, PLAFOND_ACTIVES);

      const allUsersRaw = localStorage.getItem("wenze_all_users") || "[]";
      const allUsersParsed = JSON.parse(allUsersRaw);
      const allUsers = Array.isArray(allUsersParsed) ? allUsersParsed : [];
      const userMap = new Map<string, any>();
      for (const u of allUsers) {
        const wa = cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "");
        if (wa) userMap.set(wa, u);
      }

      const c: Record<string, number> = {};
      const cPaye: Record<string, number> = {};

      for (const a of list) {
        const wa = cle9(a?.ownerWhatsapp || a?.whatsapp || a?.userId || "");
        const u = userMap.get(wa) || {
          ownerWhatsapp: wa,
          whatsapp: wa,
          createdAt: a?.createdAt,
          id: wa,
        };

        try {
          if (typeof isCompteCache === "function" && isCompteCache(u)) {
            continue;
          }
        } catch {}

        const id = normalizeCategorie(
          a?.categorieId || a?.categorie || "commerces-services"
        );
        c[id] = (c[id] || 0) + 1;

        let estPaye = false;
        try {
          if (typeof checkFreemiumWenze === "function") {
            estPaye = Boolean(checkFreemiumWenze(u, 0)?.isPaye);
          }
        } catch {}
        if (estPaye) {
          cPaye[id] = (cPaye[id] || 0) + 1;
        }
      }

      for (const cat of CATEGORIES_WENZE) {
        const norm = normalizeCategorie(cat.id);
        if (c[norm]) {
          const groupe = (cat as any).groupe || "commerces-services";
          c[groupe] = (c[groupe] || 0) + c[norm];
        }
      }

      setCounts(c);
      setCountsPayes(cPaye);
    } catch {
      setCounts({});
      setCountsPayes({});
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return CATEGORIES_WENZE;
    return CATEGORIES_WENZE.filter(
      (cat) =>
        cat.id.toLowerCase().includes(q) ||
        cat.titre.toLowerCase().includes(q) ||
        (cat as any).description?.toLowerCase().includes(q) ||
        (cat as any).keywords?.some((k: string) =>
          k.toLowerCase().includes(q)
        )
    );
  }, [search]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof CATEGORIES_WENZE> = {};
    for (const cat of filtered) {
      const groupe =
        (cat as any).groupe ||
        (cat.id.includes("gros") || cat.id.includes("agro")
          ? "gros-autres"
          : "commerces-services");
      if (!g[groupe]) g[groupe] = [];
      g[groupe].push(cat);
    }
    return g;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#FFFBF0] pb-24 max-w-[430px] mx-auto">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-black shrink-0"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[16px] truncate">
              {cfgPublique?.titreCategories || "Catégories • Kinshasa"}
            </h1>
            <p className="text-[10px] text-gray-500 truncate">
              0 % commission • Taux {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES}{" "}
              actives
            </p>
          </div>
          <span className="text-[10px] bg-black text-white px-2.5 py-1 rounded-full font-black shrink-0">
            {usd(1)} = {toCDFString(1)}
          </span>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une catégorie..."
          className="w-full border rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-black outline-none"
        />

        <div className="mt-2.5 text-[10px] text-white bg-black p-2.5 rounded-xl leading-relaxed">
          <b>0 % commission</b> • Freemium :{" "}
          <b>
            {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
          </b>{" "}
          puis <b>is_visible = false</b> • Plafond :{" "}
          <b>{PLAFOND_ACTIVES} annonces actives</b> max.
        </div>
      </header>

      <div className="p-3 space-y-6">
        {Object.entries(grouped).map(([groupe, cats]) => (
          <div key={groupe}>
            <h2 className="font-black text-xs mb-2 uppercase tracking-wider text-gray-700">
              {groupe} • {cats.length} catégorie(s)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {cats.map((cat: any) => {
                const norm = normalizeCategorie(cat.id);
                const count = Math.min(PLAFOND_ACTIVES, counts[norm] || 0);
                const countPaye = Math.min(
                  PLAFOND_ACTIVES,
                  countsPayes[norm] || 0
                );
                return (
                  <Link
                    key={cat.id}
                    href={`/categorie/${encodeURIComponent(cat.id)}`}
                    className="bg-white rounded-2xl border p-3 hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <div className="text-2xl">
                          {cat.icone || cat.icon || "📦"}
                        </div>
                        <span className="text-[9px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-bold">
                          0 % comm
                        </span>
                      </div>
                      <div className="font-bold text-sm mt-2 line-clamp-1">
                        {cat.titre}
                      </div>
                      <div className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                        {cat.description || ""}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-semibold">
                          {count} annonce(s)
                        </span>
                        {countPaye > 0 ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                            {countPaye} boostée(s)
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[9px] text-gray-400 mt-1">
                        Dès {usd(1)} ({toCDFString(1)}) • Taux {TAUX_CDF}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-500 bg-white rounded-2xl border p-4">
            Aucune catégorie trouvée pour &laquo; {search} &raquo;.
          </div>
        ) : null}

        <div className="bg-white rounded-2xl border p-4">
          <h3 className="font-black text-sm mb-2">
            Formules de visibilité • 0 % commission
          </h3>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            {Object.entries(PALIERS || {}).map(([k, v]: any) => {
              const pUSD = Number(v?.prixUSD ?? v?.prix ?? 1);
              return (
                <div key={k} className="bg-gray-50 border rounded-xl p-2">
                  <b className="block">{k}</b>
                  <span className="font-bold text-black">
                    {usd(pUSD)}
                  </span>
                  <br />
                  <span className="text-gray-500">{toCDFString(pUSD)}</span>
                  <br />
                  <span>
                    {Math.min(PLAFOND_ACTIVES, Number(v?.places || 4))} pl /{" "}
                    {v?.jours || 7}j
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-gray-500 mt-2.5 leading-relaxed">
            Freemium : {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours puis{" "}
            <b>is_visible = false</b> • Max {PLAFOND_ACTIVES} annonces actives •
            Taux {TAUX_CDF} CDF/$.
          </div>
        </div>
      </div>
    </div>
  );
}
