"use client";

import React, { useState } from "react";
import LecteurVideoQuotaStream from "@/components/LecteurVideoQuotaStream";
import BoutonVoirSurCarte from "@/components/BoutonVoirSurCarte";
import { toCDFString, usd } from "@/lib/paiement-base";

interface FicheMediaGeoWenzeProps {
  table: "produits" | "annonces";
  id: string;
  titre: string;
  prixUsd?: number | null;
  r2ImageUrls?: string[] | null;
  streamVideoUid?: string | null;
  streamThumbnailUrl?: string | null;
  videoVues?: number;
  videoMaxVues?: number;
  videoBloquee?: boolean;
  avenue?: string | null;
  numeroParcelle?: string | null;
  quartier?: string | null;
  commune?: string | null;
  province?: string | null;
  pays?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export default function FicheMediaGeoWenze({
  table,
  id,
  titre,
  prixUsd = null,
  r2ImageUrls = [],
  streamVideoUid = null,
  streamThumbnailUrl = null,
  videoVues = 0,
  videoMaxVues = 30,
  videoBloquee = false,
  avenue,
  numeroParcelle,
  quartier,
  commune,
  province,
  pays,
  latitude,
  longitude,
}: FicheMediaGeoWenzeProps) {
  const photos = Array.isArray(r2ImageUrls) ? r2ImageUrls.filter(Boolean) : [];
  const [indexPhoto, setIndexPhoto] = useState<number>(0);

  return (
    <article className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-black text-gray-900">{titre}</h3>
        {typeof prixUsd === "number" && prixUsd > 0 && (
          <div className="text-right">
            <div className="text-xs font-black text-gray-900">
              {usd(prixUsd)}
            </div>
            <div className="text-[11px] font-semibold text-gray-600">
              {toCDFString(prixUsd)}
            </div>
          </div>
        )}
      </div>

      {/* Photos Cloudflare R2 (WebP) */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <img
            src={photos[indexPhoto] || photos[0]}
            alt={titre}
            className="h-56 w-full rounded-xl object-cover"
          />
          {photos.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {photos.map((url, idx) => (
                <button
                  key={`${url}-${idx}`}
                  type="button"
                  onClick={() => setIndexPhoto(idx)}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border ${
                    idx === indexPhoto
                      ? "border-black ring-2 ring-black/20"
                      : "border-gray-200 opacity-75"
                  }`}
                >
                  <img
                    src={url}
                    alt={`${titre} ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vidéo Stream sans autoplay avec quota 30 ou 50 vues */}
      <LecteurVideoQuotaStream
        table={table}
        elementId={id}
        titre={titre}
        streamVideoUid={streamVideoUid}
        streamThumbnailUrl={streamThumbnailUrl}
        videoVuesInitiales={videoVues}
        videoMaxVues={videoMaxVues}
        videoBloqueeInitial={videoBloquee}
      />

      {/* Adresse jusqu'à l'avenue + lien carte Leaflet / OSM */}
      <BoutonVoirSurCarte
        lieuId={`${table === "produits" ? "produit" : "annonce"}-${id}`}
        avenue={avenue}
        numeroParcelle={numeroParcelle}
        quartier={quartier}
        commune={commune}
        province={province}
        pays={pays}
        latitude={latitude}
        longitude={longitude}
      />
    </article>
  );
 }
  
