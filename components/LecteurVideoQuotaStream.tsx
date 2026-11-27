"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { peutLireVideoSelonQuota } from "@/lib/media-quotas-wenze";

interface LecteurVideoQuotaStreamProps {
  table: "produits" | "annonces";
  elementId: string;
  titre: string;
  streamVideoUid?: string | null;
  streamThumbnailUrl?: string | null;
  videoVuesInitiales?: number;
  videoMaxVues?: number;
  videoBloqueeInitial?: boolean;
  onQuotaMisAJour?: (etat: {
    videoVues: number;
    videoMaxVues: number;
    videoBloquee: boolean;
  }) => void;
}

export default function LecteurVideoQuotaStream({
  table,
  elementId,
  titre,
  streamVideoUid,
  streamThumbnailUrl,
  videoVuesInitiales = 0,
  videoMaxVues = 30,
  videoBloqueeInitial = false,
  onQuotaMisAJour,
}: LecteurVideoQuotaStreamProps) {
  const [lectureLancee, setLectureLancee] = useState<boolean>(false);
  const [chargementVue, setChargementVue] = useState<boolean>(false);
  const [vues, setVues] = useState<number>(videoVuesInitiales);
  const [maxVues, setMaxVues] = useState<number>(videoMaxVues);
  const [bloquee, setBloquee] = useState<boolean>(videoBloqueeInitial);
  const [message, setMessage] = useState<string>("");

  const disponible = peutLireVideoSelonQuota({
    streamVideoUid,
    videoVues: vues,
    videoMaxVues: maxVues,
    videoBloquee: bloquee,
  });

  if (!streamVideoUid) {
    return null;
  }

  // Quota épuisé : on coupe la vidéo et on invite à consulter les photos R2
  if (!disponible) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
        <span className="font-extrabold">Vidéo indisponible</span> — Quota de{" "}
        <span className="font-bold">{maxVues} vues</span> atteint ({vues}/{maxVues}).
        Les photos du produit restent disponibles ci-dessus.
      </div>
    );
  }

  const demarrerLecture = async () => {
    if (chargementVue || lectureLancee) return;
    setChargementVue(true);
    setMessage("");

    try {
      if (supabase) {
        const { data, error } = await supabase.rpc(
          "enregistrer_vue_video_wenze",
          {
            p_table: table,
            p_id: elementId,
          }
        );

        const row = Array.isArray(data) ? data[0] : data;
        if (!error && row) {
          const nouvellesVues = Number(row.video_vues ?? vues + 1);
          const nouveauMax = Number(row.video_max_vues ?? maxVues);
          const estBloquee = Boolean(row.video_bloquee);

          setVues(nouvellesVues);
          setMaxVues(nouveauMax);
          setBloquee(estBloquee);
          onQuotaMisAJour?.({
            videoVues: nouvellesVues,
            videoMaxVues: nouveauMax,
            videoBloquee: estBloquee,
          });

          if (!row.autorise || estBloquee) {
            setBloquee(true);
            setMessage(
              `Quota vidéo atteint (${nouvellesVues}/${nouveauMax} vues).`
            );
            setChargementVue(false);
            return;
          }
        }
      }

      setLectureLancee(true);
    } catch {
      setMessage("Impossible de lancer la vidéo pour le moment.");
    } finally {
      setChargementVue(false);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-2.5">
      <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
        <span>Vidéo courte (clic requis)</span>
        <span>
          Vues : {vues} / {maxVues}
        </span>
      </div>

      {!lectureLancee ? (
        <button
          type="button"
          onClick={demarrerLecture}
          disabled={chargementVue}
          className="group relative block w-full overflow-hidden rounded-xl bg-gray-900 text-left"
        >
          {streamThumbnailUrl ? (
            <img
              src={streamThumbnailUrl}
              alt={titre}
              className="h-56 w-full object-cover opacity-85 transition group-hover:opacity-75"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center bg-gray-800 text-xs font-bold text-white">
              Aperçu vidéo — {titre}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/85 px-4 py-2 text-xs font-black text-white shadow">
              {chargementVue ? "Vérification du quota..." : "▶ Lire la vidéo"}
            </span>
          </div>
        </button>
      ) : (
        <div className="overflow-hidden rounded-xl bg-black">
          <iframe
            src={`https://iframe.videodelivery.net/${streamVideoUid}`}
            title={titre}
            allow="accelerometer; gyroscope; encrypted-media; picture-in-picture;"
            allowFullScreen
            className="h-60 w-full border-0"
          />
        </div>
      )}

      {message && (
        <p className="text-[11px] font-bold text-amber-800">{message}</p>
      )}
    </div>
  );
}
