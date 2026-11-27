"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Home,
  LayoutGrid,
  Plus,
  Store,
  User,
  MapPin,
} from "lucide-react";
import { toCDFString, usd } from "@/lib/paiement-base";

export interface ProduitOuAnnonceSimple {
  id: string;
  titre: string;
  categorie?: "detail_service" | "gros_autres";
  prix_usd?: number | null;
  moq?: number | null;
  r2_image_urls?: string[] | null;
  stream_video_uid?: string | null;
  commune?: string | null;
  avenue?: string | null;
}

interface AccueilWenzeSimpleAlibabaProps {
  elements?: ProduitOuAnnonceSimple[];
}

export default function AccueilWenzeSimpleAlibaba({
  elements = [],
}: AccueilWenzeSimpleAlibabaProps) {
  const [recherche, setRecherche] = useState<string>("");
  const [filtre, setFiltre] = useState<"tous" | "detail_service" | "gros_autres">(
    "tous"
  );

  const listeFiltree = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return elements.filter((item) => {
      const okCat = filtre === "tous" || item.categorie === filtre;
      const okRecherche =
        !q ||
        item.titre.toLowerCase().includes(q) ||
        (item.commune || "").toLowerCase().includes(q) ||
        (item.avenue || "").toLowerCase().includes(q);
      return okCat && okRecherche;
    });
  }, [elements, filtre, recherche]);

  return (
    <div className="min-h-screen bg-white pb-20 text-gray-900">
      {/* Barre de recherche unique et onglets simples en haut */}
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-3 pt-2.5">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un produit, service, avenue à Kinshasa..."
              className="w-full rounded-full border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-xs text-gray-900 placeholder:text-gray-400 focus:border-black focus:bg-white focus:outline-none"
            />
          </div>

          {/* Onglets simples style catalogue */}
          <div className="mt-2 flex items-center gap-4 border-b border-gray-100 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFiltre("tous")}
              className={`border-b-2 pb-1.5 transition ${
                filtre === "tous"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500"
              }`}
            >
              Tout ({elements.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltre("detail_service")}
              className={`border-b-2 pb-1.5 transition ${
                filtre === "detail_service"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500"
              }`}
            >
              Détails & Services
            </button>
            <button
              type="button"
              onClick={() => setFiltre("gros_autres")}
              className={`border-b-2 pb-1.5 transition ${
                filtre === "gros_autres"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500"
              }`}
            >
              Gros & Autres
            </button>
          </div>
        </div>
      </div>

      {/* Grille produit 2 colonnes directe */}
      <main className="mx-auto max-w-4xl px-3 pt-3">
        {listeFiltree.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 py-12 text-center">
            <p className="text-xs font-bold text-gray-700">
              Aucun article disponible pour le moment
            </p>
            <Link
              href="/publier"
              className="mt-3 inline-block rounded-full bg-black px-4 py-1.5 text-xs font-extrabold text-white"
            >
              Publier une annonce
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {listeFiltree.map((item) => {
              const photo = item.r2_image_urls?.[0];
              const repereAdresse = [item.avenue, item.commune]
                .filter(Boolean)
                .join(" • ");

              return (
                <Link
                  key={item.id}
                  href={`/annonces/${item.id}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                    {photo ? (
                      <img
                        src={photo}
                        alt={item.titre}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-gray-400">
                        WENZE
                      </div>
                    )}
                    {item.stream_video_uid && (
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        ▶ Vidéo
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-2">
                    <div>
                      <h2 className="line-clamp-2 text-xs font-semibold text-gray-900">
                        {item.titre}
                      </h2>

                      {typeof item.prix_usd === "number" && item.prix_usd > 0 && (
                        <div className="mt-1">
                          <div className="text-xs font-black text-gray-900">
                            {usd(item.prix_usd)}
                          </div>
                          <div className="text-[10px] font-medium text-gray-500">
                            {toCDFString(item.prix_usd)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px] text-gray-500">
                      {repereAdresse ? (
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{repereAdresse}</span>
                        </span>
                      ) : (
                        <span />
                      )}
                      {item.moq && item.moq > 1 && (
                        <span className="shrink-0 font-bold text-gray-700">
                          MOQ {item.moq}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Barre de navigation inférieure unique */}
      <nav
        aria-label="Navigation"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white"
      >
        <div className="mx-auto flex max-w-4xl items-center justify-around py-2 text-[11px] font-bold">
          <Link href="/" className="flex flex-col items-center gap-0.5 text-black">
            <Home className="h-4 w-4" />
            <span>Accueil</span>
          </Link>
          <Link
            href="/categories"
            className="flex flex-col items-center gap-0.5 text-gray-500"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Catégories</span>
          </Link>
          <Link
            href="/publier"
            className="flex flex-col items-center gap-0.5 text-black"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
              <Plus className="h-4 w-4" />
            </span>
            <span>Publier</span>
          </Link>
          <Link
            href="/boutique"
            className="flex flex-col items-center gap-0.5 text-gray-500"
          >
            <Store className="h-4 w-4" />
            <span>Boutique</span>
          </Link>
          <Link
            href="/profil"
            className="flex flex-col items-center gap-0.5 text-gray-500"
          >
            <User className="h-4 w-4" />
            <span>Profil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
