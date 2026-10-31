/**
 * lib/paiement.ts - WENZE (V6.3)
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
const DAY_MS = 86400000;
const MAX_TRANSACTIONS = 200;

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
function hasWindow(): boolean {
  return typeof window !== "undefined";
}
function safeGet(key: string): string | null {
  try {
    return hasWindow() ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string): boolean {
  try {
    if (!hasWindow()) return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
function readList(key: string): any[] {
  try {
    const raw = safeGet(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeList(key: string, list: any[]): boolean {
  return safeSet(key, JSON.stringify(list));
}
function readUser(): any {
  try {
    const raw = safeGet("wenze_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function timeOf(date: any, fallback: number): number {
  const t = new Date(date).getTime();
  return Number.isFinite(t) ? t : fallback;
}
function waOf(user: any): string {
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

function getPalier(id: any): PalierConfig | null {
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
function notifySafe(type: "payed" | "conso" | "lib", data: any): void {
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

function sameOwner(t: any, wa: string): boolean {
  return !t.ownerWhatsapp || !wa || cleanWa(t.ownerWhatsapp) === wa;
}
function estActif(t: any, now: number): boolean {
  return timeOf(t.expireAt, 0) > now;
}
function listeActive(key: string, wa: string, now: number): any[] {
  return readList(key).filter((t: any) => sameOwner(t, wa) && estActif(t, now));
}
/** Anciens comptes : abonnement stocké directement sur l'utilisateur. */
function abonnementHeritageActif(user: any, now: number): boolean {
  if (!user) return false;
  return timeOf(user.palierExpireAt, 0) > now || timeOf(user.abonnementExpireAt, 0) > now;
}

/** Acheter AJOUTE un ticket et n'écrase jamais les anciens. Paiement non vérifié ici. */
export function acheterTicket(palierId: PalierId, _dureeId: DureeId = "7j"): AchatResult {
  if (!hasWindow()) return { success: false, error: "Indisponible hors navigateur" };
  const palier = getPalier(palierId);
  if (!palier) return { success: false, error: "Palier inconnu" };

  const user = readUser();
  const ownerWa = waOf(user);
  const now = Date.now();
  const tickets = readList("wenze_tickets");
  const actifsDuVendeur = tickets.filter((t: any) => sameOwner(t, ownerWa) && estActif(t, now));
  if (actifsDuVendeur.length >= MAX_TICKETS_ACTIFS) {
    return { success: false, error: `Maximum ${MAX_TICKETS_ACTIFS} tickets actifs : renouvelez un ancien ticket` };
  }

  const jours = palier.jours;
  const ticket: Ticket = {
    ticketId: `TICKET-${palierId}-${jours}j-${now}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
    palierId,
    dureeId: `${jours}j` as DureeId,
    imagesMax: palier.imagesMax,
    imagesUsed: 0,
    imagesIds: [],
    jours,
    startAt: new Date(now).toISOString(),
    expireAt: new Date(now + jours * DAY_MS).toISOString(),
    prixUSD: palier.prixUSD,
    prixCDF: palier.prixCDF,
    actif: true,
    renouvelable: true,
    ownerWhatsapp: ownerWa,
    videoMax: palier.videoCount,
    videoUsed: 0
  };
  tickets.push(ticket);
  if (!writeList("wenze_tickets", tickets)) return { success: false, error: "Stockage plein : achat impossible" };

  try {
    if (user) {
      const maj = { ...user, palierId, palierExpireAt: ticket.expireAt, isCache: false, badge: palier.badge };
      safeSet("wenze_user", JSON.stringify(maj));
      const all = readList("wenze_all_users");
      const idx = all.findIndex((u: any) => cleanWa(u.ownerWhatsapp || u.whatsapp) === cleanWa(maj.ownerWhatsapp || maj.whatsapp));
      if (idx >= 0) all[idx] = maj;
      else all.push(maj);
      writeList("wenze_all_users", all);
    }
    const log = readList("wenze_transactions");
    log.push({ id: ticket.ticketId, ...ticket, success: true, createdAt: ticket.startAt, type: "ticket" });
    writeList("wenze_transactions", log.slice(-MAX_TRANSACTIONS));
  } catch {}

  notifySafe("payed", ticket);
  return {
    success: true,
    ticket,
    message: `✅ ${palier.badge} ${palier.nom} - ${palier.imagesMax} places strictes sur ${jours}j - ${palier.prixUSD}$ / ${toCDFString(palier.prixUSD)}`
  };
}

export function renouvelerTicket(ticketId: string): AchatResult {
  const tickets = readList("wenze_tickets");
  const idx = tickets.findIndex((t: any) => t.ticketId === ticketId);
  if (idx < 0) return { success: false, error: "Ticket introuvable" };
  const t = tickets[idx];
  const now = Date.now();
  const base = Math.max(timeOf(t.expireAt, 0), now);
  t.expireAt = new Date(base + t.jours * DAY_MS).toISOString();
  t.actif = true;
  if (!writeList("wenze_tickets", tickets)) return { success: false, error: "Stockage plein" };
  notifySafe("payed", t);
  return { success: true, ticket: t, message: `♻️ Renouvelé +${t.jours}j` };
}

/** Utilise 1 place du ticket pour l'annonce. Idempotent : refaire l'appel ne consomme pas deux fois. */
export function consommerPlace(ticketId: string, annonceId: string): boolean {
  const tickets = readList("wenze_tickets");
  const t = tickets.find((x: any) => x.ticketId === ticketId);
  if (!t) return false;
  if (!estActif(t, Date.now())) return false;
  if ((t.imagesIds || []).includes(annonceId)) return true;
  if (t.imagesUsed >= t.imagesMax) return false;
  t.imagesUsed += 1;
  t.imagesIds = [...(t.imagesIds || []), annonceId];
  if (!writeList("wenze_tickets", tickets)) return false;
  notifySafe("conso", { annonceId, ticketId, used: t.imagesUsed, max: t.imagesMax });
  return true;
}

function retirerDeListe(key: string, annonceId: string): string {
  const list = readList(key);
  let ticketId = "";
  list.forEach((t: any) => {
    const ids: string[] = t.imagesIds || [];
    const pos = ids.indexOf(annonceId);
    if (pos >= 0) {
      ids.splice(pos, 1);
      t.imagesIds = ids;
      t.imagesUsed = Math.max(0, (t.imagesUsed || 1) - 1);
      ticketId = t.ticketId;
    }
  });
  if (ticketId) writeList(key, list);
  return ticketId;
}

/** Libère la place d'une annonce supprimée (ticket ou offre occasionnelle). */
export function libererPlace(annonceId: string): boolean {
  const idTicket = retirerDeListe("wenze_tickets", annonceId);
  const idOcc = retirerDeListe("wenze_occasionnel", annonceId);
  if (idTicket) notifySafe("lib", { annonceId, ticketId: idTicket });
  if (idOcc) notifySafe("lib", { annonceId, ticketId: idOcc });
  return !!(idTicket || idOcc);
}

export function acheterOccasionnel(offreId: string): AchatResult {
  const offre = OCCASIONNEL.offres.find((o) => o.id === offreId);
  if (!offre) return { success: false, error: "Offre inconnue" };
  const ownerWa = waOf(readUser());
  const now = Date.now();
  const ticketOcc = {
    ticketId: `OCC-${offreId}-${now}`,
    offreId,
    imagesMax: offre.images || 1,
    imagesUsed: 0,
    imagesIds: [] as string[],
    jours: offre.jours,
    startAt: new Date(now).toISOString(),
    expireAt: new Date(now + offre.jours * DAY_MS).toISOString(),
    prixUSD: offre.prixUSD,
    prixCDF: offre.prixCDF,
    actif: true,
    ownerWhatsapp: ownerWa,
    videoMax: 0,
    videoUsed: 0
  };
  const occ = readList("wenze_occasionnel");
  occ.push(ticketOcc);
  if (!writeList("wenze_occasionnel", occ)) return { success: false, error: "Stockage plein : achat impossible" };
  const log = readList("wenze_transactions");
  log.push({ id: ticketOcc.ticketId, ...ticketOcc, type: "OCCASIONNEL", success: true });
  writeList("wenze_transactions", log.slice(-MAX_TRANSACTIONS));
  return { success: true, ticket: ticketOcc };
}

// ========== 6. VÉRIFICATION DE L'ABONNEMENT ==========
export interface AbonnementStatus {
  isPaye: boolean;
  isFreemium: boolean;
  isCache: boolean;
  peutPublier: boolean;
  type: string;
  badge: string;
  count: number;
  message?: string;
  [key: string]: any;
}

/** Vrai si le compte est caché : plus de ticket actif et 30 jours gratuits écoulés. */
export function isCompteCache(user: any): boolean {
  if (!user) return false;
  const now = Date.now();
  const wa = waOf(user);
  if (listeActive("wenze_tickets", wa, now).length > 0) return false;
  if (listeActive("wenze_occasionnel", wa, now).length > 0) return false;
  if (abonnementHeritageActif(user, now)) return false;
  const created = timeOf(user.createdAt, now);
  return (now - created) / DAY_MS > FREEMIUM.dureeJours;
}

export function checkFreemiumWenze(user: any, annoncesCount: number): AbonnementStatus {
  const now = Date.now();
  const created = timeOf(user?.createdAt, now);
  const diffJ = Math.ceil((now - created) / DAY_MS);
  const joursRestantsFreemium = Math.max(0, FREEMIUM.dureeJours - diffJ);
  const wa = waOf(user);

  const actifs = listeActive("wenze_tickets", wa, now)
    .filter((t: any) => !!getPalier(t.palierId))
    .sort((a: any, b: any) => timeOf(a.expireAt, 0) - timeOf(b.expireAt, 0));
  const occsActifs = listeActive("wenze_occasionnel", wa, now);

  if (actifs.length > 0) {
    const plusProche = actifs[0];
    const palier = getPalier(plusProche.palierId) as PalierConfig;
    const placesRestantes = actifs.reduce((s: number, t: any) => s + Math.max(0, t.imagesMax - t.imagesUsed), 0);
    const totalMax = actifs.reduce((s: number, t: any) => s + t.imagesMax, 0);
    const joursRestants = Math.ceil((timeOf(plusProche.expireAt, now) - now) / DAY_MS);
    const peut = annoncesCount < MAX_ANNONCES_ACTIVES && placesRestantes > 0;
    return {
      isPaye: true, isFreemium: false, isCache: false, peutPublier: peut, actif: peut,
      palierId: plusProche.palierId, palier,
      ticketsActifs: actifs, ticketsOccasionnel: occsActifs,
      joursRestants, joursRestantsFreemium: 0, expireAt: plusProche.expireAt,
      placesRestantes, totalImagesMax: totalMax, totalAnnonces: annoncesCount, maxPlaces: MAX_ANNONCES_ACTIVES,
      annoncesRestantes: Math.max(0, MAX_ANNONCES_ACTIVES - annoncesCount), imagesRestantes: placesRestantes,
      count: annoncesCount,
      message: `${actifs.length} ticket(s) - ${placesRestantes}/${totalMax} places libres - ${joursRestants}j`,
      badge: palier.badge, type: plusProche.palierId, prixUSD: palier.prixUSD
    };
  }

  if (diffJ <= FREEMIUM.dureeJours) {
    const rest = Math.max(0, FREEMIUM.maxImages - annoncesCount);
    return {
      isPaye: false, isFreemium: true, isCache: false, peutPublier: rest > 0, actif: rest > 0,
      palierId: null, palier: null, joursRestants: joursRestantsFreemium, joursRestantsFreemium,
      expireAt: new Date(created + FREEMIUM.dureeJours * DAY_MS).toISOString(),
      annoncesRestantes: rest, imagesRestantes: rest, placesRestantes: rest,
      totalAnnonces: annoncesCount, maxPlaces: MAX_ANNONCES_ACTIVES, count: annoncesCount,
      message: rest > 0
        ? `🆓 Gratuit ${annoncesCount}/${FREEMIUM.maxImages} - ${joursRestantsFreemium}j restants`
        : `🆓 Gratuit ${FREEMIUM.maxImages}/${FREEMIUM.maxImages} atteint`,
      badge: "🆓", type: "freemium", prixUSD: 0
    };
  }

  return {
    isPaye: false, isFreemium: false, isCache: true, peutPublier: false, actif: false,
    palierId: null, palier: null, joursRestants: 0, joursRestantsFreemium: 0, expireAt: null,
    annoncesRestantes: 0, imagesRestantes: 0, placesRestantes: 0,
    totalAnnonces: annoncesCount, maxPlaces: MAX_ANNONCES_ACTIVES, count: annoncesCount,
    message: `🔒 Caché - ${FREEMIUM.dureeJours}j gratuits expirés - Payez ${PALIERS.STANDARD.prixUSD}$ / ${toCDFString(PALIERS.STANDARD.prixUSD)} pour réapparaître`,
    badge: "🔒", type: "cache", prixUSD: 0
  };
}

export function verifierAbonnement(): AbonnementStatus {
  const defaut: AbonnementStatus = { isPaye: false, isFreemium: true, isCache: false, peutPublier: false, type: "freemium", count: 0, badge: "🆓" };
  if (!hasWindow()) return defaut;
  try {
    const user = readUser();
    const list = readList("wenze_annonces_list");

    if (!user) {
      const count = list.length;
      const rest = Math.max(0, FREEMIUM.maxImages - count);
      return {
        ...defaut, peutPublier: count < FREEMIUM.maxImages, count, totalAnnonces: count,
        maxPlaces: MAX_ANNONCES_ACTIVES, placesRestantes: rest, imagesRestantes: rest,
        message: `Créez un compte pour ${FREEMIUM.maxImages} annonces gratuites`
      };
    }

    // Compte ancien sans date de création : le délai gratuit démarre maintenant.
    if (!user.createdAt) {
      user.createdAt = new Date().toISOString();
      safeSet("wenze_user", JSON.stringify(user));
    }

    const myWa = cleanWa(user.ownerWhatsapp || user.whatsapp);
    const myCount = list.filter((a: any) => cleanWa(a.ownerWhatsapp || a.whatsapp) === myWa).length;
    const check = checkFreemiumWenze(user, myCount);
    return {
      ...check,
      label: check.palier?.nom || FREEMIUM.nom,
      prixUSD: check.palierId ? getPalier(check.palierId)?.prixUSD || 0 : 0
    };
  } catch {
    return { ...defaut, message: "Erreur de vérification" };
  }
}

// ========== 7. ALIAS ET MESSAGES (compatibilité) ==========
export function checkFreemiumLimit(): AbonnementStatus {
  return verifierAbonnement();
}
export function activerPalier(palierId: PalierId, dureeId: DureeId = "7j"): AchatResult {
  return acheterTicket(palierId, dureeId);
}
export function handlePaiement(type: string): AchatResult {
  const raw = String(type || "").toUpperCase();
  if (raw.includes("PREMIUM")) return acheterTicket("PREMIUM", "30j");
  if (raw.includes("PRO")) return acheterTicket("PRO", "15j");
  return acheterTicket("STANDARD", "7j");
}
export function getBadgeForUser(user: any): string {
  const c = checkFreemiumWenze(user, 0);
  return c.badge + " " + c.message;
}
export function getPrixByCategorie(cat: string) {
  const p = PALIERS.STANDARD;
  return {
    prixUSD: p.prixUSD,
    prixCDF: p.prixCDF,
    prix: p.prixUSD,
    categorie: cat,
    label: `STANDARD ${p.prixUSD}$ - Même prix pour tous - Taux ${TAUX_CDF}`
  };
}
export function getSoldeWPay(): number {
  return 0;
}

export const MESSAGE_REGIME =
  `🆓 ${FREEMIUM.maxImages} images à vie ${FREEMIUM.dureeJours}j visibles puis 🔒 caché - ` +
  `⭐ STANDARD ${PALIERS.STANDARD.prixUSD}$ / ${toCDFString(PALIERS.STANDARD.prixUSD)} ${PALIERS.STANDARD.places} places / ${PALIERS.STANDARD.jours}j - ` +
  `🚀 PRO 
