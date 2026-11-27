"use client";

import React from "react";
import Link from "next/link";
import { formaterAdresseHierarchique } from "@/lib/geolocalisation-wenze";

interface BoutonVoirSurCarteProps {
  lieuId: string; // ex: "annonce-123" | "boutique-45" | "produit-89"
  avenue?: string | null;
  numeroParcelle?: string | null;
  quartier?: string | null;
  commune?: string | null;
  province?: string | null;
  pays?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export default function BoutonVoirSurCarte({
  lieuId,
  avenue,
  numeroParcelle,
  quartier,
  commune,
  province,
  pays,
  latitude,
  longitude,
}: BoutonVoirSurCarteProps) {
  const aCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);

  const adresse = formaterAdresseHierarchique({
    avenue,
    numeroParcelle,
    quartier,
    commune,
    province,
    pays,
  });

  if (!aCoords) {
    return (
      <span className="inline-block text-[11px] text-gray-500">
        📍 {adresse}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <span className="text-[11px] text-gray-600">📍 {adresse}</span>
      <Link
        href={`/carte?focus=${encodeURIComponent(lieuId)}&lat=${latitude}&lng=${longitude}`}
        className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-gray-700"
      >
        🗺️ Voir sur la carte
      </Link>
    </div>
  );
 }
