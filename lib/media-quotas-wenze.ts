export type PalierVideoWenze = "15s_30vues" | "30s_50vues";

export interface ConfigurationPalierVideo {
  palier: PalierVideoWenze;
  dureeMaxSec: 15 | 30;
  vuesMax: 30 | 50;
  libelle: string;
}

export const PALIERS_VIDEO_WENZE: Record<
  PalierVideoWenze,
  ConfigurationPalierVideo
> = {
  "15s_30vues": {
    palier: "15s_30vues",
    dureeMaxSec: 15,
    vuesMax: 30,
    libelle: "15 secondes max • 30 vues max",
  },
  "30s_50vues": {
    palier: "30s_50vues",
    dureeMaxSec: 30,
    vuesMax: 50,
    libelle: "30 secondes max • 50 vues max",
  },
};

export function obtenirConfigPalier(
  palier: PalierVideoWenze
): ConfigurationPalierVideo {
  return PALIERS_VIDEO_WENZE[palier] || PALIERS_VIDEO_WENZE["15s_30vues"];
}

export function verifierFichierSelonPalier(
  fichier: File,
  palier: PalierVideoWenze
): Promise<{
  valide: boolean;
  dureeSec: number;
  dureeMaxSec: 15 | 30;
  vuesMax: 30 | 50;
  erreur?: string;
}> {
  const cfg = obtenirConfigPalier(palier);

  return new Promise((resolve) => {
    if (!fichier.type.startsWith("video/")) {
      resolve({
        valide: false,
        dureeSec: 0,
        dureeMaxSec: cfg.dureeMaxSec,
        vuesMax: cfg.vuesMax,
        erreur: "Sélectionnez un fichier vidéo valide.",
      });
      return;
    }

    const url = URL.createObjectURL(fichier);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const dureeSec = Math.ceil(video.duration || 0);

      if (!Number.isFinite(dureeSec) || dureeSec <= 0) {
        resolve({
          valide: false,
          dureeSec: 0,
          dureeMaxSec: cfg.dureeMaxSec,
          vuesMax: cfg.vuesMax,
          erreur: "Impossible de lire la durée de la vidéo.",
        });
        return;
      }

      if (dureeSec > cfg.dureeMaxSec) {
        resolve({
          valide: false,
          dureeSec,
          dureeMaxSec: cfg.dureeMaxSec,
          vuesMax: cfg.vuesMax,
          erreur: `Vidéo de ${dureeSec}s trop longue pour ce palier (${cfg.dureeMaxSec}s max pour ${cfg.vuesMax} vues).`,
        });
        return;
      }

      resolve({
        valide: true,
        dureeSec,
        dureeMaxSec: cfg.dureeMaxSec,
        vuesMax: cfg.vuesMax,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valide: false,
        dureeSec: 0,
        dureeMaxSec: cfg.dureeMaxSec,
        vuesMax: cfg.vuesMax,
        erreur: "Erreur lors de la lecture des métadonnées vidéo.",
      });
    };

    video.src = url;
  });
}

export function peutLireVideoSelonQuota(params: {
  streamVideoUid?: string | null;
  videoVues?: number | null;
  videoMaxVues?: number | null;
  videoBloquee?: boolean | null;
}): boolean {
  if (!params.streamVideoUid) return false;
  if (params.videoBloquee) return false;
  const vues = Number(params.videoVues ?? 0);
  const max = Number(params.videoMaxVues ?? 30);
  return vues < max;
      }
