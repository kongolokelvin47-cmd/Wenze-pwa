"use client";

import React, { useState } from "react";
import { obtenirPositionActuelle } from "@/lib/geolocalisation-wenze";

export interface DonneesGeoPublicite {
  pays: string;
  province: string;
  commune: string;
  quartier: string;
  avenue: string;
  numero_parcelle: string;
  latitude: number | null;
  longitude: number | null;
}

interface FormulaireGeoPubliciteProps {
  valeur: DonneesGeoPublicite;
  onChange: (val: DonneesGeoPublicite) => void;
}

export default function FormulaireGeoPublicite({
  valeur,
  onChange,
}: FormulaireGeoPubliciteProps) {
  const [statutGps, setStatutGps] = useState<string>("");

  const capturerPosition = async () => {
    setStatutGps("Capture GPS en cours...");
    try {
      const pos = await obtenirPositionActuelle();
      onChange({
        ...valeur,
        latitude: pos.latitude,
        longitude: pos.longitude,
      });
      setStatutGps(
        `GPS capturé : ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`
      );
    } catch (err: any) {
      setStatutGps(err?.message || "Impossible de capter le GPS.");
    }
  };

  return (
    <div className="space-y-2.5 rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black text-gray-900">
          📍 Géolocalisation de la publicité / boutique
        </span>
        <button
          type="button"
          onClick={capturerPosition}
          className="rounded-xl bg-black px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-gray-800"
        >
          Utiliser ma position GPS
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Pays (ex: RDC)"
          value={valeur.pays}
          onChange={(e) => onChange({ ...valeur, pays: e.target.value })}
          className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium"
        />
        <input
          type="text"
          placeholder="Province (ex: Kinshasa)"
          value={valeur.province}
          onChange={(e) => onChange({ ...valeur, province: e.target.value })}
          className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium"
        />
        <input
          type="text"
          placeholder="Commune (ex: Gombe, Limete...)"
          value={valeur.commune}
          onChange={(e) => onChange({ ...valeur, commune: e.target.value })}
          className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium"
        />
        <input
          type="text"
          placeholder="Quartier"
          value={valeur.quartier}
          onChange={(e) => onChange({ ...valeur, quartier: e.target.value })}
          className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium"
        />
        <input
          type="text"
          placeholder="Avenue"
          value={valeur.avenue}
          onChange={(e) => onChange({ ...valeur, avenue: e.target.value })}
          className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium"
        />
        <input
          type="text"
          placeholder="N° parcelle (optionnel)"
          value={valeur.numero_parcelle}
          onChange={(e) =>
            onChange({ ...valeur, numero_parcelle: e.target.value })
          }
          className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium"
        />
      </div>

      {statutGps && (
        <p className="text-[11px] font-semibold text-gray-700">{statutGps}</p>
      )}
    </div>
  );
}
