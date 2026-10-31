/**
 * lib/paiement.ts - WENZE (V7) : achat et usage des tickets, vérification de l'abonnement.
 * Point d'entrée unique : ré-exporte aussi lib/paiement-base.ts.
 *
 * ATTENTION : aucun paiement réel n'est vérifié ici (localStorage uniquement).
 * Brancher un vrai paiement (Mobile Money) et une base serveur avant le lancement.
 */
import {
  TAUX_CDF,
  MAX_ANNONCES_ACTIVES,
  MAX_TICKETS_ACTIFS,
  DAY_MS,
  MAX_TRANSACTIONS,
  toCDFString,
  cleanWa,
  hasWindow,
  safeSet,
  readList,
  writeList,
  readUser,
  timeOf,
  waOf,
  FREEMIUM,
  PALIERS,
  getPalier,
  OCCASIONNEL,
  sameOwner,
  estActif,
  listeActive,
  abonnementHeritageActif,
  notifySafe,
  type PalierId,
  type DureeId,
  type PalierConfig,
  type Ticket,
  type AchatResult
} from "./paiement-base";

export * from "./paiement-base";

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
  `🚀 PRO ${PALIERS.PRO.prixUSD}$ / ${toCDFString(PALIERS.PRO.prixUSD)} ${PALIERS.PRO.places} places / ${PALIERS.PRO.jours}j - ` +
  `👑 PREMIUM ${PALIERS.PREMIUM.prixUSD}$ / ${toCDFString(PALIERS.PREMIUM.prixUSD)} ${PALIERS.PREMIUM.places} places / ${PALIERS.PREMIUM.jours}j - ` +
  `1 ticket = X places strictes sur Y jours (pas X/j) - Cumulable - Max ${MAX_ANNONCES_ACTIVES} - Suppression libère place - 0% comm - Taux ${TAUX_CDF}`;

export const REGLE_LEGALE =
  "WENZE plateforme main à main 0% commission. Un ticket = X places strictes sur Y jours (pas X/j). " +
  `Cumulable, renouvelable, suppression libère place. Max ${MAX_ANNONCES_ACTIVES} actives. ` +
  `Freemium ${FREEMIUM.maxImages} images à vie visibles ${FREEMIUM.dureeJours}j puis compte caché si 0 ticket. Même ticket pour tous secteurs.`;
      
