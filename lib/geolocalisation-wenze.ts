export type CategorieLieuWenze =
  | "boutique"
  | "produit"
  | "publicite"
  | "point_interet";

export interface LieuCarteWenze {
  id: string;
  titre: string;
  categorie: CategorieLieuWenze;
  sousTitre?: string;
  avenue?: string | null;
  numeroParcelle?: string | null;
  quartier?: string | null;
  commune?: string | null;
  province?: string | null;
  pays?: string | null;
  latitude: number;
  longitude: number;
  prixUsd?: number | null;
  telephone?: string | null;
}

export interface CoordonneesGPS {
  latitude: number;
  longitude: number;
  precision?: number;
}

// Centre par défaut : Kinshasa, République Démocratique du Congo
export const CENTRE_KINSHASA: [number, number] = [-4.3219, 15.3069];

/**
 * Calcule la distance en kilomètres entre deux points GPS (formule de Haversine)
 */
export function calculerDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Formate une adresse complète : Avenue (N°), Quartier, Commune • Province, Pays
 */
export function formaterAdresseHierarchique(lieu: {
  avenue?: string | null;
  numeroParcelle?: string | null;
  quartier?: string | null;
  commune?: string | null;
  province?: string | null;
  pays?: string | null;
}): string {
  const voie = lieu.avenue?.trim()
    ? lieu.numeroParcelle?.trim()
      ? `Av. ${lieu.avenue.trim()} n°${lieu.numeroParcelle.trim()}`
      : `Av. ${lieu.avenue.trim()}`
    : "";

  const local = [voie, lieu.quartier?.trim(), lieu.commune?.trim()]
    .filter(Boolean)
    .join(", ");

  const zone = [lieu.province?.trim() || "Kinshasa", lieu.pays?.trim() || "RDC"]
    .filter(Boolean)
    .join(", ");

  if (local && zone) return `${local} • ${zone}`;
  return local || zone;
}

/**
 * Génère une URL de partage vers la carte Wenze ou OpenStreetMap
 */
export function construireLienPosition(
  lat: number,
  lng: number,
  label?: string
): string {
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("lat", lat.toFixed(6));
    url.searchParams.set("lng", lng.toFixed(6));
    if (label) url.searchParams.set("lieu", label);
    return url.toString();
  }
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}#map=16/${lat.toFixed(6)}/${lng.toFixed(6)}`;
}

/**
 * Partage une position (temps réel, boutique, publicité ou livraison)
 */
export async function partagerPositionWenze(params: {
  latitude: number;
  longitude: number;
  titre: string;
  adresse?: string;
}): Promise<{
  ok: boolean;
  mode: "share" | "clipboard" | "fallback";
  lien: string;
}> {
  const lien = construireLienPosition(
    params.latitude,
    params.longitude,
    params.titre
  );
  const texte = [
    `📍 ${params.titre}`,
    params.adresse ? `🗺️ ${params.adresse}` : null,
    `📌 GPS : ${params.latitude.toFixed(5)}, ${params.longitude.toFixed(5)}`,
    `🔗 ${lien}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({
        title: `Wenze Wenze — ${params.titre}`,
        text: texte,
        url: lien,
      });
      return { ok: true, mode: "share", lien };
    } catch {
      // Repli vers le presse-papiers si l'utilisateur annule ou si le partage natif échoue
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texte);
      return { ok: true, mode: "clipboard", lien };
    } catch {}
  }

  return { ok: true, mode: "fallback", lien };
}

/**
 * Récupère la position GPS actuelle de l'appareil
 */
export function obtenirPositionActuelle(): Promise<CoordonneesGPS> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(
        new Error(
          "La géolocalisation n'est pas prise en charge sur cet appareil."
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precision: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(
          new Error(err.message || "Impossible d'obtenir la position GPS.")
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  });
}

/**
 * Démarre un suivi GPS continu pour le partage en temps réel (livraison / boutique)
 * Retourne une fonction d'arrêt propre.
 */
export function demarrerSuiviPositionTempsReel(
  onPosition: (coords: CoordonneesGPS) => void,
  onErreur?: (message: string) => void
): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onErreur?.("Suivi GPS temps réel indisponible sur cet appareil.");
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onPosition({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        precision: pos.coords.accuracy,
      });
    },
    (err) => {
      onErreur?.(err.message || "Erreur lors du suivi GPS en temps réel.");
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
                
