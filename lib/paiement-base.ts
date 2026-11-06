/**
 * lib/paiement-base.ts - WENZE (V7) : constantes, formats, stockage, paliers, types.
 * Les fonctions de tickets et de vérification sont dans lib/paiement.ts,
 * qui ré-exporte tout ce fichier : les pages continuent d'importer depuis "@/lib/paiement".
 *
 * Règles métier :
 * - Même ticket pour tous les secteurs, 0% de commission.
 * - 1 ticket = X places STRICTES sur Y jours. 1 annonce = 1 place.
 * - Tickets cumulables, renouvelables. Maximum 50 annonces actives.
 * - Supprimer une annonce libère sa place immédiatement.
 * - Freemium : 3 annonces à vie, visibles 30 jours, puis compte caché sans ticket.
 *
 * ATTENTION : tout est stocké dans le localStorage du téléphone et aucun
 * paiement réel n'est vérifié ici. acheterTicket() accorde le ticket sans
 * contrôle : il faudra brancher un vrai paiement (Mobile Money) et une base
 * de données côté serveur avant l'ouverture au public.
 */

// ========== 0. CONSTANTES ET UTILITAIRES ==========
export const TAUX_CDF = 2300;
export const MAX_ANNONCES_ACTIVES = 50;
export const MAX_TICKETS_ACTIFS = 10;
export const DAY_MS = 86400000;
export const MAX_TRANSACTIONS = 200;

/** Séparateur de milliers fixe : même rendu sur le serveur et sur le téléphone. */
function formatNombre(n: number): string {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
}

export function toCDF(usd: number): number {
  return Math.round((Number(usd) || 0) * TAUX_CDF);
}
export function toUSD(cdf: number): number {
  return Math.round(((Number(cdf) || 0) / TAUX_CDF) * 100) / 100;
}
export function toCDFString(usd: number): string {
  return formatNombre(toCDF(usd)) + " CDF";
}
export function toUSDString(usd: number): string {
  return `${usd}$`;
}
/** 2.5 -> "2,5 $" ; 12 -> "12 $" */
export function usd(n: number): string {
  return String(Math.round((Number(n) || 0) * 100) / 100).replace(".", ",") + " $";
}
export function formatPrix(usd: number): string {
  return usd === 0 ? "Gratuit" : `${usd}$ / ${toCDFString(usd)}`;
}

export function cleanWa(n: any): string {
  return (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
}

// ========== 1. STOCKAGE SÉCURISÉ (localStorage) ==========
export function hasWindow(): boolean {
  return typeof window !== "undefined";
}
export function safeGet(key: string): string | null {
  try {
    return hasWindow() ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
export function safeSet(key: string, value: string): boolean {
  try {
    if (!hasWindow()) return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
export function readList(key: string): any[] {
  try {
    const raw = safeGet(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function writeList(key: string, list: any[]): boolean {
  return safeSet(key, JSON.stringify(list));
}
export function readUser(): any {
  try {
    const raw = safeGet("wenze_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function timeOf(date: any, fallback: number): number {
  const t = new Date(date).getTime();
  return Number.isFinite(t) ? t : fallback;
}
export function waOf(user: any): string {
  return user ? cleanWa(user.ownerWhatsapp || user.whatsapp || user.id || "") : "";
}

// ========== 2. FREEMIUM ==========
export const FREEMIUM = {
  id: "freemium",
  nom: "Freemium Découverte",
  maxImages: 3,
  maxImagesLabel: "3 images à vie",
  dureeJours: 30,
  apres: "cache" as const,
  prix: 0,
  badge: "🆓",
  message: "3 images à vie, visibles 30j, puis compte caché jusqu'à achat d'un ticket - Panier conservé"
} as const;

// ========== 2b. ORIGINE DU COMPTE ET IMAGES GRATUITES (politique v1.3) ==========
/** Origine du compte : fixée à la création. Les anciens comptes sans origine suivent leur rôle. */
export function originOf(user: any): "client" | "vendeur" {
  if (!user) return "vendeur";
  if (user.origine === "client" || user.origine === "vendeur") return user.origine;
  return user.role === "client" || user.user_type === "client" ? "client" : "vendeur";
}

/**
 * Nombre d'images gratuites auxquelles le compte a droit :
 * 0 pour un client d'origine ou un numéro qui a déjà eu son freemium ; 1 au niveau 1 ; 3 au niveau 2 et plus.
 * Les anciens comptes (sans niveau) gardent leurs 3 images.
 */
export function freemiumImagesDe(user: any): number {
  if (!user) return FREEMIUM.maxImages;
  if (originOf(user) === "client" || user.freemiumDeja) return 0;
  if (user.niveau === undefined || user.niveau === null) return FREEMIUM.maxImages;
  return user.niveau >= 2 || user.whatsappVerifie ? FREEMIUM.maxImages : 1;
}

// ========== 3. PALIERS ET DURÉES (politique v1.2) ==========
/** Paiement minimum accepté par FlexPay (frais : 2 % + 0,10 $). */
export const PAIEMENT_MINIMUM_USD = 1;
/** Tant que FlexPay n'est pas branché, aucun argent n'est débité : l'application doit le dire. */
export const PAIEMENT_REEL = false;
/** Nombre d'emplacements Flash (boost) affichés en même temps en haut de l'accueil. */
export const EMPLACEMENTS_FLASH = 3;

export type PalierId = "STANDARD" | "PRO" | "PREMIUM";
export type DureeId = "1j" | "3j" | "7j" | "15j" | "30j";

export interface OffreDuree {
  id: DureeId;
  /** Jours réellement accordés (peut dépasser la durée affichée à cause du minimum de 1 $). */
  jours: number;
  /** Prix facturé en dollars US. */
  prixUSD: number;
  /** Prix par jour affiché avant application du minimum de 1 $. */
  prixAffiche?: number;
  /** Durée courte : proposée derrière le lien « Besoin de 1 ou 3 jours seulement ? ». */
  courte?: boolean;
}

export interface PalierConfig {
  id: PalierId;
  nom: string;
  imagesMin: number;
  imagesMax: number;
  places: number;
  /** Durée de référence (abonnement mensuel). */
  jours: number;
  /** Prix de référence (abonnement mensuel). */
  prixUSD: number;
  prixCDF: number;
  badge: string;
  limiteActives: number;
  videoCount: number;
  videoDuree: string;
  videos: string;
  description: string;
  durees: OffreDuree[];
  /** Ancienne grille de prix par durée, conservée pour l'ancien code. */
  prix: Record<string, number>;
}

function creerPalier(p: { id: PalierId; nom: string; imagesMin: number; imagesMax: number; badge: string; videoSecondes: number; durees: OffreDuree[] }): PalierConfig {
  const mois = p.durees.find((d) => d.id === "30j") as OffreDuree;
  const prix: Record<string, number> = {};
  p.durees.forEach((d) => {
    prix[d.id] = d.prixUSD;
  });
  const minimum = Math.min(...p.durees.map((d) => d.prixUSD));
  return {
    id: p.id,
    nom: p.nom,
    imagesMin: p.imagesMin,
    imagesMax: p.imagesMax,
    places: p.imagesMax,
    jours: mois.jours,
    prixUSD: mois.prixUSD,
    prixCDF: toCDF(mois.prixUSD),
    badge: p.badge,
    limiteActives: MAX_ANNONCES_ACTIVES,
    videoCount: 1,
    videoDuree: `${p.videoSecondes}s`,
    videos: `1 vidéo ${p.videoSecondes} s`,
    description: `${p.badge} ${p.id} - ${p.imagesMin} à ${p.imagesMax} images + 1 vidéo ${p.videoSecondes} s - dès ${minimum}$`,
    durees: p.durees,
    prix
  };
}

export const PALIERS: Record<PalierId, PalierConfig> = {
  STANDARD: creerPalier({
    id: "STANDARD", nom: "STANDARD - Débutant", imagesMin: 1, imagesMax: 4, badge: "⭐", videoSecondes: 15,
    durees: [
      { id: "1j", jours: 2, prixUSD: 1, prixAffiche: 0.5, courte: true },
      { id: "7j", jours: 7, prixUSD: 3 },
      { id: "15j", jours: 15, prixUSD: 6 },
      { id: "30j", jours: 30, prixUSD: 12 }
    ]
  }),
  PRO: creerPalier({
    id: "PRO", nom: "PRO - Vendeur régulier", imagesMin: 5, imagesMax: 10, badge: "🚀", videoSecondes: 30,
    durees: [
      { id: "1j", jours: 1, prixUSD: 1, courte: true },
      { id: "7j", jours: 7, prixUSD: 5 },
      { id: "15j", jours: 15, prixUSD: 10 },
      { id: "30j", jours: 30, prixUSD: 20 }
    ]
  }),
  PREMIUM: creerPalier({
    id: "PREMIUM", nom: "PREMIUM - Gros vendeur", imagesMin: 11, imagesMax: 30, badge: "👑", videoSecondes: 60,
    durees: [
      { id: "1j", jours: 1, prixUSD: 2, courte: true },
      { id: "3j", jours: 3, prixUSD: 5, courte: true },
      { id: "7j", jours: 7, prixUSD: 10 },
      { id: "15j", jours: 15, prixUSD: 15 },
      { id: "30j", jours: 30, prixUSD: 25 }
    ]
  })
};

export function getPalier(id: any): PalierConfig | null {
  return Object.prototype.hasOwnProperty.call(PALIERS, id) ? PALIERS[id as PalierId] : null;
}

export function offreDuree(palierId: any, dureeId: any): OffreDuree | null {
  const p = getPalier(palierId);
  return p ? p.durees.find((d) => d.id === dureeId) || null : null;
}

// ========== 4. BOOSTS OCCASIONNELS (publicité flash) ==========
export type TypeOcc = "image" | "pack3" | "video";
export type DureeOcc = "1j" | "7j" | "15j";

export interface OffreOcc {
  id: string;
  type: TypeOcc;
  dureeId: DureeOcc;
  label: string;
  images: number;
  video: boolean;
  jours: number;
  prixUSD: number;
  prixCDF: number;
  prixAffiche?: number;
  badge: string;
}

export const TYPES_OCC: { id: TypeOcc; prefix: string; label: string; badge: string }[] = [
  { id: "image", prefix: "1img", label: "1 image", badge: "🖼️" },
  { id: "pack3", prefix: "3img", label: "3 images", badge: "🗂️" },
  { id: "video", prefix: "video", label: "1 vidéo 15 s", badge: "🎬" }
];

function offreOcc(type: TypeOcc, dureeId: DureeOcc, jours: number, prixUSD: number, prixAffiche?: number): OffreOcc {
  const t = TYPES_OCC.find((x) => x.id === type) as { id: TypeOcc; prefix: string; label: string; badge: string };
  return {
    id: `occ-${t.prefix}-${dureeId}`,
    type,
    dureeId,
    label: `${t.label} - ${jours} jour${jours > 1 ? "s" : ""}`,
    images: type === "pack3" ? 3 : 1,
    video: type === "video",
    jours,
    prixUSD,
    prixCDF: toCDF(prixUSD),
    prixAffiche,
    badge: t.badge
  };
}

export const OCCASIONNEL = {
  id: "OCCASIONNEL",
  nom: "Vente occasionnelle et boost flash",
  offres: [
    offreOcc("image", "1j", 3, 1, 0.3),
    offreOcc("image", "7j", 7, 2),
    offreOcc("image", "15j", 15, 4),
    offreOcc("pack3", "1j", 1, 1, 0.8),
    offreOcc("pack3", "7j", 7, 5),
    offreOcc("pack3", "15j", 15, 10),
    offreOcc("video", "1j", 2, 1, 0.5),
    offreOcc("video", "7j", 7, 2.5),
    offreOcc("video", "15j", 15, 4)
  ] as OffreOcc[]
};

// ========== 5. TICKETS ==========
export interface Ticket {
  ticketId: string;
  palierId: PalierId;
  dureeId: DureeId;
  imagesMax: number;
  imagesUsed: number;
  imagesIds: string[];
  jours: number;
  startAt: string;
  expireAt: string;
  prixUSD: number;
  prixCDF: number;
  actif: boolean;
  renouvelable: boolean;
  ownerWhatsapp: string;
  videoMax: number;
  videoUsed: number;
}

export interface AchatResult {
  success: boolean;
  error?: string;
  message?: string;
  ticket?: any;
}

/** Notifications : import dynamique, une erreur ici ne bloque jamais l'achat. */
export function notifySafe(type: "payed" | "conso" | "lib", data: any): void {
  try {
    if (!hasWindow()) return;
    // @ts-ignore le module peut être absent selon le projet
    import("./notifications")
      .then((m: any) => {
        if (type === "payed" && m.notifyTicketPayed) m.notifyTicketPayed(data);
        if (type === "conso" && m.notifyPlaceConsommee) m.notifyPlaceConsommee(data.annonceId, data.ticketId, data.used, data.max);
        if (type === "lib" && m.notifyPlaceLiberee) m.notifyPlaceLiberee(data.annonceId, data.ticketId);
      })
      .catch(() => {});
  } catch {}
}

export function sameOwner(t: any, wa: string): boolean {
  return !t.ownerWhatsapp || !wa || cleanWa(t.ownerWhatsapp) === wa;
}
export function estActif(t: any, now: number): boolean {
  return timeOf(t.expireAt, 0) > now;
}
export function listeActive(key: string, wa: string, now: number): any[] {
  return readList(key).filter((t: any) => sameOwner(t, wa) && estActif(t, now));
}
/** Anciens comptes : abonnement stocké directement sur l'utilisateur. */
export function abonnementHeritageActif(user: any, now: number): boolean {
  if (!user) return false;
  return timeOf(user.palierExpireAt, 0) > now || timeOf(user.abonnementExpireAt, 0) > now;
}
