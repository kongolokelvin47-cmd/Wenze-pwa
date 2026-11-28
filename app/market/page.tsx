"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  PALIERS,
} from "@/lib/paiement";
import {
  CATEGORIES_WENZE,
  getCategorieById,
  normalizeCategorie,
} from "@/lib/categories";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

type Product = {
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
  categorieId: string;
  categorieTitre?: string;
  province?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  photo?: string;
  images?: string[];
  user?: string;
  ownerWhatsapp?: string;
  whatsapp?: string;
  userId?: string;
  createdAt?: string;
  _isPaye?: boolean;
  _palierId?: string;
  _jours?: number;
};

function isAnnonceVisibleMarket(a: any): boolean {
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

function safeParseArray(key: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function tracerMarketJournal(
  action: "MARKET_WHATSAPP_CLIC",
  produitId: string,
  acteurWa: string,
  roleActuel: string,
  titreProduit?: string
) {
  try {
    if (typeof window === "undefined") return;
    const arr = safeParseArray("wenze_journal");
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      produitId,
      acteurWhatsapp: acteurWa,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));

    const prevAct = safeParseArray("wenze_journal_activite");
    const msg = `Contact WhatsApp Marché : "${titreProduit || produitId}"`;
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
        type: "contact",
        message: msg,
      };
      localStorage.setItem(
        "wenze_journal_activite",
        JSON.stringify([entry, ...prevAct].slice(0, 60))
      );
      window.dispatchEvent(new Event("wenze-update"));
    }
  } catch {}
}

function formatZoneProduit(p: Product): string {
  const parts = [
    p.commune || "Kinshasa",
    p.quartier ? `Q/ ${p.quartier}` : "",
    p.province && p.province !== "Kinshasa" ? p.province : "",
  ].filter(Boolean);
  return parts.join(" • ");
}

export default function MarketPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<
    "all" | "commerces-services" | "gros-autres"
  >("all");
  const [user, setUser] = useState<any>(null);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});
  const [syncTick, setSyncTick] = useState(0);

  const chargerMarket = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const session: any = lireSession();
      setUser(session);
      setCfgPublique(lireConfigPublique());

      const raw = localStorage.getItem("wenze_annonces_list");
      const parsedList = raw ? JSON.parse(raw) : [];
      const list = (Array.isArray(parsedList) ? parsedList : [])
        .filter((a: any) => isAnnonceVisibleMarket(a))
        .slice(0, PLAFOND_ACTIVES);

      const allUsersRaw = localStorage.getItem("wenze_all_users") || "[]";
      const allUsers = JSON.parse(allUsersRaw);
      const userMap = new Map<string, any>();
      if (Array.isArray(allUsers)) {
        for (const u of allUsers) {
          const wa = cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "");
          if (wa) userMap.set(wa, u);
        }
      }

      const prods: Product[] = list.map((a: any) => {
        const prixVal = Number(a.prixUSD ?? a.prix ?? a.price ?? 0);
        const rawImgs: string[] = Array.isArray(a.images)
          ? a.images
          : a.photo
          ? [a.photo]
          : [];
        return {
          id: String(a.id || a.annonceId || ""),
          titre: a.titre || a.title || a.name || "Article",
          title: a.title,
          name: a.name,
          prix: prixVal,
          prixUSD: prixVal,
          price: a.price,
          typeAnnonce: a.typeAnnonce,
          prixGros: Number(a.prixGrosUSD ?? a.prixGros ?? 0),
          prixGrosUSD: Number(a.prixGrosUSD ?? a.prixGros ?? 0),
          uniteGros: a.uniteGros || "carton",
          categorieId: normalizeCategorie(
            a.categorieId || a.categorie || "commerces-services"
          ),
          categorieTitre: a.categorieTitre,
          province: a.province || "Kinshasa",
          commune: a.commune || "Kinshasa",
          quartier: a.quartier || "",
          avenue: a.avenue || "",
          photo: rawImgs[0] || a.photo,
          images: rawImgs.slice(0, MAX_FREE_IMAGES),
          user: a.user || a.nomBoutique || a.boutiqueName || a.ownerName,
          ownerWhatsapp: a.ownerWhatsapp || a.whatsapp || a.userId,
          whatsapp: a.whatsapp || a.ownerWhatsapp,
          userId: a.userId,
          createdAt: a.createdAt || a.created_at,
        };
      });

      const final = prods
        .filter((p) => {
          const wa = cle9(p.ownerWhatsapp || p.whatsapp || p.userId || "");
          const u = userMap.get(wa) || {
            ownerWhatsapp: wa,
            whatsapp: wa,
            createdAt: p.createdAt,
            id: wa,
          };
          try {
            if (typeof isCompteCache === "function" && isCompteCache(u)) {
              return false;
            }
          } catch {}
          return true;
        })
        .map((p) => {
          try {
            const wa = cle9(p.ownerWhatsapp || p.whatsapp || p.userId || "");
            const u = userMap.get(wa) || {
              ownerWhatsapp: wa,
              createdAt: p.createdAt,
              id: wa,
            };
            const ab = checkFreemiumWenze(u, 0);
            return {
              ...p,
              _isPaye: Boolean(ab?.isPaye),
              _palierId: ab?.palierId || (ab?.isPaye ? "ACTIF" : "FREEMIUM"),
              _jours: ab?.joursRestants || 0,
            };
          } catch {
            return {
              ...p,
              _isPaye: false,
              _palierId: "FREEMIUM",
              _jours: 0,
            };
          }
        })
        .sort((a: any, b: any) => {
          if (a._isPaye && !b._isPaye) return -1;
          if (!a._isPaye && b._isPaye) return 1;
          if (a._isPaye && b._isPaye) {
            const ordre: Record<string, number> = {
              PREMIUM: 3,
              PRO: 2,
              STANDARD: 1,
              OCC: 0,
            };
            return (ordre[b._palierId] || 0) - (ordre[a._palierId] || 0);
          }
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        })
        .slice(0, PLAFOND_ACTIVES);

      setProducts(final);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerMarket();
    if (typeof window === "undefined") return;
    const onSync = () => setSyncTick((t) => t + 1);
    window.addEventListener("storage", onSync);
    window.addEventListener("wenze-update", onSync);
    return () => {
      window.removeEventListener("storage", onSync);
      window.removeEventListener("wenze-update", onSync);
    };
  }, [chargerMarket]);

  useEffect(() => {
    if (syncTick > 0) chargerMarket();
  }, [syncTick, chargerMarket]);

  const monRole = String(user?.role || "client").toLowerCase();
  const jeSuisDG =
    user?.roleAdmin === "dg" ||
    monRole === "dg" ||
    Boolean(user?.dgSessionActive);

  const formatPrixDouble = (p: Product) => {
    const estGros = p.typeAnnonce === "gros";
    const peutVoirGros = estGros && (monRole === "grossiste" || jeSuisDG);
    const montantUSD = peutVoirGros
      ? Number(p.prixGrosUSD || p.prixGros || p.prixUSD || p.prix || 0)
      : Number(p.prixUSD || p.prix || p.price || 0);
    if (montantUSD <= 0) return "Prix sur demande";
    return `${usd(montantUSD)} / ${toCDFString(montantUSD)}`;
  };

  const filtered = useMemo(() => {
    let list = products;
    if (filterCat !== "all") {
      list = list.filter((p) => {
        const cat = normalizeCategorie(p.categorieId);
        const obj = getCategorieById(cat) as any;
        if (filterCat === "commerces-services") {
          return obj?.groupe === "commerces-services" || !cat.includes("gros");
        }
        if (filterCat === "gros-autres") {
          return obj?.groupe === "gros-autres" || cat.includes("gros");
        }
        return true;
      });
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    const qWa = cle9(q);
    return list.filter(
      (p) =>
        (p.titre || p.title || p.name || "").toLowerCase().includes(q) ||
        (p.categorieTitre || "").toLowerCase().includes(q) ||
        (p.province || "").toLowerCase().includes(q) ||
        (p.commune || "").toLowerCase().includes(q) ||
        (p.quartier || "").toLowerCase().includes(q) ||
        (p.avenue || "").toLowerCase().includes(q) ||
        (p.user || "").toLowerCase().includes(q) ||
        (qWa && cle9(p.ownerWhatsapp || "").includes(qWa))
    );
  }, [products, search, filterCat]);

  const totalCommerces = products.filter((p) => {
    const c = normalizeCategorie(p.categorieId);
    const o = getCategorieById(c) as any;
    return o?.groupe === "commerces-services" || !c.includes("gros");
  }).length;

  const totalGros = products.filter((p) => {
    const c = normalizeCategorie(p.categorieId);
    const o = getCategorieById(c) as any;
    return o?.groupe === "gros-autres" || c.includes("gros");
  }).length;

  if (loading) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-24 bg-white border rounded-2xl animate-pulse" />
        <p className="text-[11px] text-gray-400 mt-3">
          Chargement du Marché RDC • 0 % commission • Taux {TAUX_CDF} CDF/$
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
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
              {cfgPublique?.titreMarket || "Marché Wenze Wenze • RDC"}
            </h1>
            <p className="text-[10px] text-gray-500 truncate">
              🛍️ {totalCommerces} Détail/Services • 🏭 {totalGros} Gros •{" "}
              {products.length}/{PLAFOND_ACTIVES} max • 0 % comm
            </p>
          </div>
          <Link
            href="/publier"
            className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-black shrink-0"
          >
            +
          </Link>
        </div>
        <div className="mt-3 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher : produit, boutique, province, commune..."
            className="w-full bg-gray-100 rounded-2xl py-3.5 px-5 pl-11 text-sm outline-none focus:ring-2 focus:ring-black"
          />
          <span className="absolute left-4 top-3.5">🔍</span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setFilterCat("all")}
            className={`whitespace-nowrap py-2 px-4 rounded-full font-black text-[11px] border-2 ${
              filterCat === "all"
                ? "bg-black text-white border-black"
                : "bg-white border-gray-200"
            }`}
          >
            Tous • {products.length}
          </button>
          <button
            type="button"
            onClick={() => setFilterCat("commerces-services")}
            className={`whitespace-nowrap py-2 px-4 rounded-full font-black text-[11px] border-2 ${
              filterCat === "commerces-services"
                ? "bg-black text-white border-black"
                : "bg-white border-gray-200"
            }`}
          >
            🛍️ Détail &amp; Services • {totalCommerces}
          </button>
          <button
            type="button"
            onClick={() => setFilterCat("gros-autres")}
            className={`whitespace-nowrap py-2 px-4 rounded-full font-black text-[11px] border-2 ${
              filterCat === "gros-autres"
                ? "bg-black text-white border-black"
                : "bg-white border-gray-200"
            }`}
          >
            🏭 Gros &amp; Dépôts • {totalGros}
          </button>
        </div>

        <div className="mt-3 bg-black text-white rounded-xl p-2.5 flex justify-between items-center gap-2">
          <div className="min-w-0">
            <p className="font-black text-[11px]">
              0 % commission • Taux {TAUX_CDF} CDF/$
            </p>
            <p className="text-[9px] text-white/75 leading-tight mt-0.5">
              Freemium : {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours puis{" "}
              <b>is_visible = false</b> • Max {PLAFOND_ACTIVES} annonces actives
            </p>
          </div>
          <span className="bg-white text-black text-[9px] px-2.5 py-1 rounded-full font-black whitespace-nowrap shrink-0">
            {usd(1)} = {toCDFString(1)}
          </span>
        </div>
      </header>

      <div className="p-3">
        <div className="bg-white border rounded-2xl p-3 flex gap-2 text-[10px]">
          {Object.entries(PALIERS || {}).map(([k, v]: any) => {
            const pUSD = Number(v?.prixUSD ?? v?.prix ?? 1);
            return (
              <div key={k} className="flex-1 text-center">
                <div className="font-black">{k}</div>
                <div className="text-gray-800 font-bold">{usd(pUSD)}</div>
                <div className="text-[8px] text-gray-500">
                  {toCDFString(pUSD)}
                </div>
                <div className="text-[8px] text-gray-500">
                  {Math.min(PLAFOND_ACTIVES, Number(v?.places || 4))} pl /{" "}
                  {v?.jours || 7}j
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">🏪</p>
            <p className="font-black mt-2 text-[13px]">
              {search
                ? `Aucun résultat pour "${search}"`
                : "Aucune annonce visible pour le moment"}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              0 % commission • Freemium {MAX_FREE_IMAGES} images / {FREE_DAYS}{" "}
              jours • Minimum {usd(1)} ({toCDFString(1)})
            </p>
            <Link
              href="/publier"
              className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]"
            >
              Publier une annonce
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {filtered.map((p) => {
              const catId = normalizeCategorie(p.categorieId);
              const catObj = getCategorieById(catId) as any;
              const prixLabel = formatPrixDouble(p);
              const waTarget = cle9(p.ownerWhatsapp || p.whatsapp || "");
              const estGros = p.typeAnnonce === "gros";
              const peutVoirGros =
                estGros && (monRole === "grossiste" || jeSuisDG);

              const waMsg = `Bonjour ${
                p.user || "Boutique"
              }, je vous contacte depuis Wenze Wenze (0 % commission) concernant "${
                p.titre
              }" (${prixLabel}).`;

              return (
                <div
                  key={p.id}
                  className="border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition flex flex-col"
                >
                  <Link
                    href={`/produit/${encodeURIComponent(p.id)}`}
                    className="block w-full aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden relative"
                  >
                    {p.photo || p.images?.[0] ? (
                      <img
                        src={p.photo || p.images?.[0]}
                        alt={p.titre}
                        className="max-w-full max-h-full object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-3xl">{catObj?.icon || "🏪"}</span>
                    )}

                    <span className="absolute top-2 left-2 text-[8px] bg-black/75 text-white px-2 py-1 rounded-full font-bold">
                      {p._isPaye
                        ? `${p._palierId} • ${p._jours}j`
                        : "FREEMIUM"}
                    </span>

                    <span className="absolute bottom-2 left-2 text-[8px] bg-white/95 px-2 py-0.5 rounded-full font-bold">
                      {catObj?.icon} {catObj?.titreCourt || catId}
                    </span>
                  </Link>

                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-black text-[12px] truncate">
                        {p.titre || p.name}
                      </p>
                      <p className="text-[11px] font-black text-orange-600 mt-0.5">
                        {prixLabel}
                      </p>
                      {estGros && !peutVoirGros ? (
                        <p className="text-[9px] text-gray-500">
                          Tarif gros : Grossiste / DG uniquement
                        </p>
                      ) : null}
                      <p className="text-[9px] text-gray-400 truncate mt-0.5">
                        {p.user || "Boutique"} • {formatZoneProduit(p)}
                      </p>
                    </div>

                    {waTarget ? (
                      <a
                        href={`https://wa.me/${waTarget}?text=${encodeURIComponent(
                          waMsg
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          tracerMarketJournal(
                            "MARKET_WHATSAPP_CLIC",
                            p.id,
                            cle9(user?.ownerWhatsapp || user?.whatsapp || ""),
                            monRole,
                            p.titre
                          )
                        }
                        className="mt-2 w-full bg-[#25D366] text-white text-[11px] font-black py-2.5 rounded-full flex justify-center"
                      >
                        💬 WhatsApp
                      </a>
                    ) : (
                      <Link
                        href={`/produit/${encodeURIComponent(p.id)}`}
                        className="mt-2 w-full bg-black text-white text-[11px] font-black py-2.5 rounded-full flex justify-center"
                      >
                        Voir l&apos;article
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">
            Catégories Wenze Wenze • RDC
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            {CATEGORIES_WENZE.slice(0, 6).map((c: any) => (
              <Link
                key={c.id}
                href={`/categorie/${encodeURIComponent(c.id)}`}
                className="p-3 rounded-xl border bg-gray-50 hover:bg-black hover:text-white transition"
              >
                <p className="font-black text-[12px]">
                  {c.icon} {c.titreCourt || c.titre}
                </p>
                <p className="opacity-70 mt-1 text-[9px]">{c.description}</p>
              </Link>
            ))}
          </div>
          <p className="text-[9px] text-gray-400 mt-3 leading-relaxed">
            0 % commission sur toutes les ventes • Freemium : {MAX_FREE_IMAGES}{" "}
            images max / {FREE_DAYS} jours puis is_visible = false • Max{" "}
            {PLAFOND_ACTIVES} annonces actives.
          </p>
        </div>
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
          className="font-black text-black flex flex-col items-center gap-0.5"
        >
          <span className="text-[18px]">🏪</span>Marché
        </Link>
        <Link
          href="/publier"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">
            +
          </span>
          Vendre
        </Link>
        <Link
          href="/boutiques"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">🏬</span>Boutiques
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
