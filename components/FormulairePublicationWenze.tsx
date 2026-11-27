"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { compresserImageEnWebp } from "@/lib/compression-webp-r2";
import {
  PalierVideoWenze,
  PALIERS_VIDEO_WENZE,
  obtenirConfigPalier,
  verifierFichierSelonPalier,
} from "@/lib/media-quotas-wenze";
import FormulaireGeoPublicite, {
  DonneesGeoPublicite,
} from "@/components/FormulaireGeoPublicite";

interface FormulairePublicationWenzeProps {
  tableCible?: "produits" | "annonces";
  estPublicite?: boolean;
  boutiqueId?: string | null;
  onPublie?: (enregistrement: any) => void;
}

export default function FormulairePublicationWenze({
  tableCible = "annonces",
  estPublicite = false,
  boutiqueId = null,
  onPublie,
}: FormulairePublicationWenzeProps) {
  const [titre, setTitre] = useState<string>("");
  const [prixUsd, setPrixUsd] = useState<string>("");
  const [palier, setPalier] = useState<PalierVideoWenze>("15s_30vues");

  // État R2 (photos WebP)
  const [urlsR2, setUrlsR2] = useState<string[]>([]);
  const [uploadPhotoEnCours, setUploadPhotoEnCours] = useState<boolean>(false);

  // État Stream (vidéo courte avec quota 15s/30 vues ou 30s/50 vues)
  const [streamUid, setStreamUid] = useState<string | null>(null);
  const [streamThumb, setStreamThumb] = useState<string | null>(null);
  const [uploadVideoEnCours, setUploadVideoEnCours] = useState<boolean>(false);

  // Géolocalisation complète (avenue incluse)
  const [geo, setGeo] = useState<DonneesGeoPublicite>({
    pays: "RDC",
    province: "Kinshasa",
    commune: "",
    quartier: "",
    avenue: "",
    numero_parcelle: "",
    latitude: null,
    longitude: null,
  });

  const [statut, setStatut] = useState<string>("");
  const [erreur, setErreur] = useState<string>("");
  const [enregistrementEnCours, setEnregistrementEnCours] =
    useState<boolean>(false);

  const cfgPalier = obtenirConfigPalier(palier);

  // 1. Compression WebP (max 800px, ~150 Ko) -> Upload direct Cloudflare R2
  const gererAjoutPhotosR2 = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fichiers = e.target.files ? Array.from(e.target.files) : [];
    setErreur("");
    setStatut("");
    if (fichiers.length === 0) return;

    setUploadPhotoEnCours(true);
    const nouvellesUrls: string[] = [];

    try {
      for (const fichier of fichiers) {
        if (!fichier.type.startsWith("image/")) continue;

        setStatut(`Compression WebP de ${fichier.name}...`);
        const compressee = await compresserImageEnWebp(fichier, {
          maxDimensionPx: 800,
          cibleOctets: 153_600,
        });

        setStatut(`Envoi vers Cloudflare R2 (${compressee.fichierWebp.name})...`);
        const resSign = await fetch("/api/r2/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dossier: boutiqueId
              ? `boutiques/${boutiqueId}/${tableCible}`
              : tableCible,
          }),
        });

        const dataSign = await resSign.json();
        if (!resSign.ok || !dataSign?.uploadUrl || !dataSign?.publicUrl) {
          throw new Error(
            dataSign?.error || "Échec de signature R2."
          );
        }

        const resPut = await fetch(dataSign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/webp" },
          body: compressee.fichierWebp,
        });

        if (!resPut.ok) {
          throw new Error("Échec de l'envoi du fichier WebP vers R2.");
        }

        nouvellesUrls.push(dataSign.publicUrl);
      }

      setUrlsR2((prev) => [...prev, ...nouvellesUrls]);
      setStatut(`${nouvellesUrls.length} photo(s) WebP envoyée(s) sur R2.`);
    } catch (err: any) {
      setErreur(err?.message || "Erreur lors de l'envoi des photos R2.");
    } finally {
      setUploadPhotoEnCours(false);
      e.target.value = "";
    }
  };

  // 2. Vérification durée (15s ou 30s max) -> Upload direct Cloudflare Stream
  const gererAjoutVideoStream = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fichier = e.target.files?.[0];
    setErreur("");
    setStatut("");
    if (!fichier) return;

    const verif = await verifierFichierSelonPalier(fichier, palier);
    if (!verif.valide) {
      setErreur(verif.erreur || "Vidéo non conforme au palier choisi.");
      e.target.value = "";
      return;
    }

    setUploadVideoEnCours(true);
    setStatut(
      `Préparation Stream (${verif.dureeSec}s / max ${cfgPalier.dureeMaxSec}s)...`
    );

    try {
      const resUrl = await fetch("/api/stream/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palier }),
      });

      const dataUrl = await resUrl.json();
      if (!resUrl.ok || !dataUrl?.uploadURL || !dataUrl?.uid) {
        throw new Error(dataUrl?.error || "Échec URL Cloudflare Stream.");
      }

      setStatut("Envoi vidéo vers Cloudflare Stream...");
      const formData = new FormData();
      formData.append("file", fichier);

      const resUp = await fetch(dataUrl.uploadURL, {
        method: "POST",
        body: formData,
      });

      if (!resUp.ok) {
        throw new Error("Échec d'envoi vers Cloudflare Stream.");
      }

      setStreamUid(dataUrl.uid);
      setStreamThumb(
        `https://videodelivery.net/${dataUrl.uid}/thumbnails/thumbnail.jpg?time=1s&height=640`
      );
      setStatut(
        `Vidéo prête (${cfgPalier.dureeMaxSec}s max • quota ${cfgPalier.vuesMax} vues).`
      );
    } catch (err: any) {
      setErreur(err?.message || "Erreur lors de l'envoi vidéo.");
    } finally {
      setUploadVideoEnCours(false);
      e.target.value = "";
    }
  };

  // 3. Enregistrement texte + liens + quotas dans Supabase uniquement
  const soumettrePublication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    setStatut("");

    if (!titre.trim()) {
      setErreur("Le titre est obligatoire.");
      return;
    }
    if (!supabase) {
      setErreur("Supabase n'est pas initialisé.");
      return;
    }

    setEnregistrementEnCours(true);

    try {
      const prixNum = prixUsd.trim() ? Number(prixUsd) : null;
      const payloadCommun = {
        r2_image_urls: urlsR2,
        stream_video_uid: streamUid,
        stream_thumbnail_url: streamThumb,
        video_duree_max_sec: cfgPalier.dureeMaxSec,
        video_max_vues: cfgPalier.vuesMax,
        video_vues: 0,
        video_bloquee: false,
        pays: geo.pays || "RDC",
        province: geo.province || "Kinshasa",
        commune: geo.commune || null,
        quartier: geo.quartier || null,
        avenue: geo.avenue || null,
        numero_parcelle: geo.numero_parcelle || null,
        latitude: geo.latitude,
        longitude: geo.longitude,
        is_visible: true,
        ...(boutiqueId ? { boutique_id: boutiqueId } : {}),
      };

      const insertPayload =
        tableCible === "produits"
          ? {
              ...payloadCommun,
              name_fr: titre.trim(),
              prix_usd: prixNum,
            }
          : {
              ...payloadCommun,
              titre: titre.trim(),
              prix_usd: prixNum,
              is_publicite: estPublicite,
            };

      const { data, error } = await supabase
        .from(tableCible)
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setStatut("Publication enregistrée dans Supabase.");
      onPublie?.(data);
      setTitre("");
      setPrixUsd("");
      setUrlsR2([]);
      setStreamUid(null);
      setStreamThumb(null);
    } catch (err: any) {
      setErreur(err?.message || "Erreur d'enregistrement.");
    } finally {
      setEnregistrementEnCours(false);
    }
  };

  return (
    <form
      onSubmit={soumettrePublication}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-gray-900">
          {estPublicite
            ? "Publier une publicité (R2 WebP + Stream Quota + Avenue)"
            : `Publier dans ${tableCible} (R2 WebP + Stream Quota + Avenue)`}
        </h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-800">
          {cfgPalier.libelle}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Titre du produit ou de la publicité"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium sm:col-span-2"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Prix USD (optionnel)"
          value={prixUsd}
          onChange={(e) => setPrixUsd(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium"
        />
      </div>

      {/* Choix du palier vidéo : 15s/30 vues ou 30s/50 vues */}
      <div className="space-y-1.5">
        <label className="block text-xs font-extrabold text-gray-800">
          Palier vidéo Cloudflare Stream
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(PALIERS_VIDEO_WENZE) as PalierVideoWenze[]).map(
            (cle) => {
              const item = PALIERS_VIDEO_WENZE[cle];
              const actif = palier === cle;
              return (
                <button
                  key={cle}
                  type="button"
                  onClick={() => {
                    setPalier(cle);
                    setStreamUid(null);
                    setStreamThumb(null);
                  }}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                    actif
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  {item.libelle}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Photos R2 (WebP max 800px, ~150 Ko) */}
      <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-gray-900">
            🖼️ Photos R2 (WebP • max 800px • ~150 Ko)
          </span>
          <span className="text-[11px] font-bold text-gray-600">
            {urlsR2.length} photo(s)
          </span>
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploadPhotoEnCours}
          onChange={gererAjoutPhotosR2}
          className="block w-full text-xs text-gray-700 file:mr-3 file:rounded-xl file:border-0 file:bg-black file:px-3 py-1.5 file:text-xs file:font-extrabold file:text-white"
        />
        {urlsR2.length > 0 && (
          <div className="grid grid-cols-4 gap-2 pt-1">
            {urlsR2.map((url, i) => (
              <img
                key={`${url}-${i}`}
                src={url}
                alt={`Photo R2 ${i + 1}`}
                className="h-20 w-full rounded-xl border border-gray-200 object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {/* Vidéo courte Stream (sans autoplay, quota 30 ou 50 vues) */}
      <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-gray-900">
            🎬 Vidéo courte Stream ({cfgPalier.dureeMaxSec}s max •{" "}
            {cfgPalier.vuesMax} vues max)
          </span>
          {streamUid && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Prête
            </span>
          )}
        </div>
        <input
          type="file"
          accept="video/*"
          disabled={uploadVideoEnCours}
          onChange={gererAjoutVideoStream}
          className="block w-full text-xs text-gray-700 file:mr-3 file:rounded-xl file:border-0 file:bg-black file:px-3 py-1.5 file:text-xs file:font-extrabold file:text-white"
        />
        {streamThumb && (
          <img
            src={streamThumb}
            alt="Aperçu vidéo Stream"
            className="h-28 w-auto rounded-xl border border-gray-200 object-cover"
          />
        )}
      </div>

      {/* Géolocalisation complète avec Avenue */}
      <FormulaireGeoPublicite valeur={geo} onChange={setGeo} />

      {statut && (
        <p className="text-xs font-semibold text-gray-800">{statut}</p>
      )}
      {erreur && <p className="text-xs font-bold text-red-600">{erreur}</p>}

      <button
        type="submit"
        disabled={
          enregistrementEnCours || uploadPhotoEnCours || uploadVideoEnCours
        }
        className="w-full rounded-xl bg-black px-4 py-2.5 text-xs font-black text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {enregistrementEnCours ? "Enregistrement..." : "Publier maintenant"}
      </button>
    </form>
  );
  }
    
