/**
 * lib/paiement-base.ts - WENZE WENZE BUSINESS : constantes, formats, stockage, paliers, types.
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

// ========== 3. PALIERS ==========
export type PalierId = "STANDARD" | "PRO" | "PREMIUM";
export type DureeId = "7j" | "15j" | "30j";

export interface PalierConfig {
  id: PalierId;
  nom: string;
  imagesMax: number;
  places: number;
  jours: number;
  prixUSD: number;
  prixCDF: number;
  badge: string;
  limiteActives: number;
  videoCount: number;
  videoDuree: string;
  description: string;
  /** Ancienne grille de prix par durée, conservée pour l'ancien code. */
  prix: Record<string, number>;
}

function decrire(badge: string, nom: string, usd: number, places: number, jours: number, extra: string): string {
  return `${badge} ${nom} ${usd}$ (${toCDFString(usd)}) = ${places} places strictes sur ${jours}j${extra}`;
}

export const PALIERS: Record<PalierId, PalierConfig> = {
  STANDARD: {
    id: "STANDARD", nom: "STANDARD - Populaire", places: 4, imagesMax: 4, jours: 7,
    prixUSD: 5, prixCDF: toCDF(5), badge: "⭐", limiteActives: MAX_ANNONCES_ACTIVES,
    videoCount: 0, videoDuree: "0s",
    description: decrire("⭐", "STANDARD", 5, 4, 7, " - Idéal pour tester"),
    prix: { "1j": 0.5, "7j": 5, "15j": 7, "30j": 5 }
  },
  PRO: {
    id: "PRO", nom: "PRO - Boutique Active", places: 10, imagesMax: 10, jours: 15,
    prixUSD: 10, prixCDF: toCDF(10), badge: "🚀", limiteActives: MAX_ANNONCES_ACTIVES,
    videoCount: 1, videoDuree: "60s",
    description: decrire("🚀", "PRO", 10, 10, 15, " + 1 vidéo 60s - Cumulable"),
    prix: { "1j": 1, "7j": 10, "15j": 10, "30j": 10 }
  },
  PREMIUM: {
    id: "PREMIUM", nom: "PREMIUM - Gros Vendeur", places: 30, imagesMax: 30, jours: 30,
    prixUSD: 20, prixCDF: toCDF(20), badge: "👑", limiteActives: MAX_ANNONCES_ACTIVES,
    videoCount: 2, videoDuree: "60s",
    description: decrire("👑", "PREMIUM", 20, 30, 30, " + 2 vidéos - Max " + MAX_ANNONCES_ACTIVES),
    prix: { "1j": 1.5, "7j": 20, "15j": 20, "30j": 20 }
  }
};

export function getPalier(id: any): PalierConfig | null {
  return Object.prototype.hasOwnProperty.call(PALIERS, id) ? PALIERS[id as PalierId] : null;
}

// ========== 4. VENTE OCCASIONNELLE ==========
export const OCCASIONNEL = {
  id: "OCCASIONNEL",
  nom: "Vente Occasionnelle Client",
  offres: [
    { id: "occ-1img-1j", label: "1 image / 1 jour", images: 1, jours: 1, prixUSD: 0.2, prixCDF: 460, badge: "🎟️" },
    { id: "occ-1img-7j", label: "1 image / 7 jours", images: 1, jours: 7, prixUSD: 1, prixCDF: 2300, badge: "🎟️" }
  ]
} as const;

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
  
