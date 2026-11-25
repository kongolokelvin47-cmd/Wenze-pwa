"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import {
  getCategorieById,
  normalizeCategorie,
  CATEGORIES_WENZE,
} from "@/lib/categories";
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

function isAnnonceVisibleSlug(a: any): boolean {
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

export default function CategorieSlugPage() {
  const params = useParams();
  const rawSlug = String((params?.slug as string) || "").toLowerCase();
  const slug = normalizeCategorie(rawSlug);
  const cat: any =
    getCategorieById(slug) ||
    getCategorieById(rawSlug) || {
      id: slug,
      titre: slug || "Catégorie",
      description: "Annonces actives à Kinshasa.",
      icone: "📦",
      groupe: "commerces-services",
    };

  const [annonces, setAnnonces] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<any>(null);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const session: any = lireSession();
      setUser(session);
      setCfgPublique(lireConfigPublique());

      const rawList = localStorage.getItem("wenze_annonces_list") || "[]";
      const parsedList = JSON.parse(rawList);
      const list = Array.isArray(parsedList) ? parsedList : [];

      const allUsersRaw = localStorage.getItem("wenze_all_users") || "[]";
      const allUsersParsed = JSON.parse(allUsersRaw);
      const allUsers = Array.isArray(allUsersParsed) ? allUsersParsed : [];
      const userMap = new Map<string, any>();
      for (const u of allUsers) {
        const wa = cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "");
        if (wa) userMap.set(wa, u);
      }

      const filtered = list
        .filter((a: any) => isAnnonceVisibleSlug(a))
        .filter((a: any) => {
          const catId = normalizeCategorie(
            a?.categorieId || a?.categorie || ""
          );
          if (catId !== slug && normalizeCategorie(catId) !== slug) {
            const aCat: any = getCategorieById(catId);
            const targetCat: any = getCategorieById(slug);
            if (aCat && targetCat) {
              const aGroupe = aCat.groupe;
              const tGroupe = targetCat.groupe;
              if (slug === "commerces-services" || slug === "gros-autres") {
                if (aGroupe !== slug && catId !== slug) return false;
              } else if (aGroupe && tGroupe && aGroupe !== tGroupe) {
                return false;
              } else if (catId !== slug) {
                return false;
              }
            } else if (catId !== slug) {
              return false;
            }
          }
          return true;
        })
        .filter((a: any) => {
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
        })
        .map((a: any) => {
          const wa = cle9(a?.ownerWhatsapp || a?.whatsapp || a?.userId || "");
          const u = userMap.get(wa) || {
            ownerWhatsapp: wa,
            createdAt: a?.createdAt,
            id: wa,
          };
          let isPaye = false;
          let palierId = "FREEMIUM";
          let joursRestants = 0;

          try {
            if (typeof checkFreemiumWenze === "function") {
              const ab = checkFreemiumWenze(u, 0);
              isPaye = Boolean(ab?.isPaye);
              palierId = ab?.palierId || (isPaye ? "ACTIF" : "FREEMIUM");
              joursRestants = ab?.joursRestants || 0;
            }
          } catch {}

          const imgs: string[] = Array.isArray(a?.images)
            ? a.images
            : a?.photo
            ? [a.photo]
            : [];
          const safeImages = isPaye
            ? imgs
            : imgs.slice(0, MAX_FREE_IMAGES);

          return {
            ...a,
            _safeImages: safeImages,
            _isPaye: isPaye,
            _palierId: palierId,
            _joursRestants: joursRestants,
          };
        })
        .sort((a: any, b: any) => {
          if (a._isPaye && !b._isPaye) return -1;
          if (!a._isPaye && b._isPaye) return 1;
          if (a._isPaye && b._isPaye) {
            const order: Record<string, number> = {
              PREMIUM: 3,
              PRO: 2,
              STANDARD: 1,
            };
            const ao = order[a._palierId] || 0;
            const bo = order[b._palierId] || 0;
            if (ao !== bo) return bo - ao;
          }
          return (
            new Date(b?.createdAt || 0).getTime() -
            new Date(a?.createdAt || 0).getTime()
          );
        })
        .slice(0, PLAFOND_ACTIVES);

      setAnnonces(filtered);
    } catch {
      setAnnonces([]);
    }
  }, [slug, rawSlug]);

  const monRole = String(user?.role || "client").toLowerCase();
  const jeSuisDG =
    user?.roleAdmin === "dg" ||
    monRole === "dg" ||
    Boolean(user?.dgSessionActive);

  const filteredSearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return annonces;
    const qWa = cle9(q);
    return annonces.filter((a: any) => {
      const titre = String(a?.titre || a?.title || "").toLowerCase();
      const desc = String(a?.description || "").toLowerCase();
      const commune = String(a?.commune || "").toLowerCase();
      const wa = cle9(a?.ownerWhatsapp || a?.whatsapp || "");
      return (
        titre.includes(q) ||
        desc.includes(q) ||
        commune.includes(q) ||
        (qWa && wa.includes(qWa))
      );
    });
  }, [annonces, search]);

  return (
    <div className="min-h-screen bg-[#FFFBF0] pb-24 max-w-[430px] mx-auto">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b p-4">
        <div className="flex items-center gap-2.5">
          <Link
            href="/categorie"
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-black shrink-0"
          >
            ←
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0">
            {cat?.icone || cat?.icon || "📦"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[15px] truncate">
              {cfgPublique?.titreCategorieSlug || cat?.titre || slug}
            </h1>
            <p className="text-[10px] text-gray-500 truncate">
              {annonces.length}/{PLAFOND_ACTIVES} actives • 0 % commission •
              Taux {TAUX_CDF} CDF/$
            </p>
          </div>
          <span className="text-[10px] bg-black text-white px-2.5 py-1 rounded-full font-black shrink-0">
            {filteredSearch.length}
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Rechercher dans ${cat?.titre || slug}...`}
            className="flex-1 border rounded-xl px-4 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-black outline-none"
          />
          <Link
            href="/publier"
            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black flex items-center shrink-0"
          >
            + Publier
          </Link>
        </div>

        <div className="mt-2.5 text-[10px] text-white bg-black p-2.5 rounded-xl leading-relaxed">
          <b>0 % commission</b> • Freemium :{" "}
          <b>
            {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
          </b>{" "}
          puis <b>is_visible = false</b> • Tarif minimum : <b>{usd(1)}</b> (
          {toCDFString(1)})
        </div>

        <div className="flex gap-1.5 mt-2 overflow-x-auto text-[10px] pb-0.5">
          {CATEGORIES_WENZE.slice(0, 7).map((c: any) => (
            <Link
              key={c.id}
              href={`/categorie/${encodeURIComponent(c.id)}`}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full font-bold border ${
                normalizeCategorie(c.id) === slug
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {c.icon} {c.titreCourt || c.titre}
            </Link>
          ))}
        </div>
      </header>

      <div className="p-3 grid grid-cols-2 gap-3">
        {filteredSearch.map((a: any) => {
          const estGros = a?.typeAnnonce === "gros";
          const peutVoirGros =
            estGros && (monRole === "grossiste" || jeSuisDG);
          const montantUSD = peutVoirGros
            ? Number(
                a?.prixGrosUSD ?? a?.prixGros ?? a?.prixUSD ?? a?.prix ?? 0
              )
            : Number(a?.prixUSD ?? a?.prix ?? 0);

          const waShort = cle9(
            a?.ownerWhatsapp || a?.whatsapp || a?.userId || ""
          ).slice(-9);

          return (
            <Link
              key={a.id || a.annonceId}
              href={`/produit/${encodeURIComponent(a.id || a.annonceId)}`}
              className="bg-white rounded-2xl border overflow-hidden hover:shadow-md transition flex flex-col"
            >
              <div className="aspect-square bg-gray-100 relative">
                {a._safeImages?.[0] ? (
                  <img
                    src={a._safeImages[0]}
                    alt={a.titre || a.title || "Annonce"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    Aucune photo
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5 flex gap-1">
                  <span className="text-[9px] bg-black/75 text-white px-2 py-0.5 rounded-full font-bold">
                    {a._isPaye ? a._palierId : "FREEMIUM"}
                  </span>
                  {a._isPaye && a._joursRestants > 0 ? (
                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                      {a._joursRestants}j
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-xs line-clamp-2">
                    {a.titre || a.title || "Annonce"}
                  </div>
                  <div className="text-xs text-orange-600 font-black mt-1">
                    {montantUSD > 0 ? usd(montantUSD) : "Sur demande"}
                  </div>
                  {montantUSD > 0 ? (
                    <div className="text-[10px] text-gray-500">
                      {toCDFString(montantUSD)}
                    </div>
                  ) : null}
                </div>
                <div className="text-[10px] text-gray-500 mt-1.5 truncate">
                  {a.commune || "Kinshasa"}
                  {waShort ? ` • 0${waShort}` : ""}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredSearch.length === 0 ? (
        <div className="text-center py-10 p-4 bg-white mx-3 mt-3 rounded-2xl border border-dashed">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-sm font-black">
            Aucune annonce visible dans {cat?.titre || slug}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">
            0 % commission • Freemium {MAX_FREE_IMAGES} images / {FREE_DAYS}{" "}
            jours puis is_visible = false • Max {PLAFOND_ACTIVES} actives.
          </div>
          <Link
            href="/publier"
            className="inline-block mt-4 bg-black text-white px-6 py-2.5 rounded-xl text-xs font-black"
          >
            Publier une annonce
          </Link>
        </div>
      ) : null}
    </div>
  );
 }
          
