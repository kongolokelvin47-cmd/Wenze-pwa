/**
 * lib/paiement.ts - WENZE WENZE BUSINESS
 * Fichier unique de tarification, abonnements, boosts occasionnels,
 * collaboration avec DG Privé et préparation aux agrégateurs de paiement.
 *
 * Règles métier (Politique Économique Officielle) :
 * - 0% de commission sur les transactions main à main.
 * - Même grille d'abonnements pour Détail, Grossiste et Prestataire.
 * - Freemium : 3 images à vie, visibles 30 jours, puis compte caché (is_visible = false).
 * - Maximum 50 annonces actives côté serveur.
 */

// ========== 0. CONSTANTES ET FORMATAGE ==========
export const TAUX_CDF_DEFAUT = 2300;
export let TAUX_CDF = TAUX_CDF_DEFAUT;

export const MAX_ANNONCES_ACTIVES = 50;
export const MAX_TICKETS_ACTIFS = 10;
export const DAY_MS = 86_400_000;
export const MAX_TRANSACTIONS = 200;
export const EMPLACEMENTS_FLASH = 3;

/** Plus bas tarif de la grille officielle (0.2 $/jour pour 1 image occasionnelle). */
export const PAIEMENT_MINIMUM_USD = 0.2;

/** Passe à true dès que NEXT_PUBLIC_PAIEMENT_REEL="true" est défini sur Vercel. */
export const PAIEMENT_REEL =
  typeof process !== "undefined" &&
  process.env?.NEXT_PUBLIC_PAIEMENT_REEL === "true";

export type FournisseurPaiement =
  | "simulation"
  | "flexpay"
  | "mpesa"
  | "airtel"
  | "orange";

export type StatutTransaction =
  | "simulated"
  | "pending"
  | "paid"
  | "failed"
  | "cancelled";

export interface IntentPaiement {
  intentId: string;
  categorie: "abonnement" | "boost_occasionnel";
  referenceOffre: string;
  montantUSD: number;
  montantCDF: number;
  devise: "USD" | "CDF";
  fournisseur: FournisseurPaiement;
  modeEssai: boolean;
  ownerWhatsapp: string;
  createdAt: string;
}

export interface ResultatTransaction {
  ok: boolean;
  statut: StatutTransaction;
  intentId: string;
  referenceExterne?: string;
  message: string;
  erreur?: string;
}
export const TYPES_OCC: {
  id: TypeOcc;
  prefix: string;
  label: string;
  usage: string;
  badge: string;
}[] = [
  {
    id: "image",
    prefix: "1img",
    label: "1 image seule",
    usage: "1 image en #1 pendant la durée",
    badge: "🖼️",
  },
  {
    id: "pack3",
    prefix: "3img",
    label: "3 images",
    usage: "Pack 3 images",
    badge: "🗂️",
  },
  {
    id: "video",
    prefix: "video",
    label: "1 vidéo 15s",
    usage: "Vidéo 15s en story haut d'app",
    badge: "🎬",
  },
];

function nombreSur(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function formatNombre(n: number): string {
  return Math.round(nombreSur(n, 0))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
}

export function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function safeGet(key: string): string | null {
  try {
    return hasWindow() ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): boolean {
  try {
    if (!hasWindow()) return false;
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readList<T = any>(key: string): T[] {
  try {
    const raw = safeGet(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeList<T = any>(key: string, list: T[]): boolean {
  return safeSet(key, JSON.stringify(Array.isArray(list) ? list : []));
}

export function readUser(): any {
  try {
    const raw = safeGet("wenze_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function timeOf(date: unknown, fallback: number): number {
  if (typeof date === "number" && Number.isFinite(date)) return date;
  const t = new Date(date as string).getTime();
  return Number.isFinite(t) ? t : fallback;
}

export function cleanWa(n: unknown): string {
  return (n ?? "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
}

export function waOf(user: any): string {
  return user
    ? cleanWa(user.ownerWhatsapp || user.whatsapp || user.telephone || user.id || "")
    : "";
}

export function setTauxCDF(nouveauTaux: number): number {
  const valide = nombreSur(nouveauTaux, 0);
  if (valide > 0) {
    TAUX_CDF = valide;
    safeSet("wenze_taux_cdf_actif", String(valide));
  }
  return TAUX_CDF;
}

export function getTauxCDFActif(): number {
  if (hasWindow()) {
    const stocke = nombreSur(safeGet("wenze_taux_cdf_actif"), 0);
    if (stocke > 0) TAUX_CDF = stocke;
  }
  return TAUX_CDF > 0 ? TAUX_CDF : TAUX_CDF_DEFAUT;
}

export function toCDF(usdVal: number): number {
  return Math.round(nombreSur(usdVal, 0) * getTauxCDFActif());
}

export function toUSD(cdfVal: number): number {
  const taux = getTauxCDFActif();
  return Math.round((nombreSur(cdfVal, 0) / taux) * 100) / 100;
}

export function toCDFString(usdVal: number): string {
  return `${formatNombre(toCDF(usdVal))} CDF`;
}

export function toUSDString(usdVal: number): string {
  const arrondi = Math.round(nombreSur(usdVal, 0) * 100) / 100;
  return `${arrondi}$`;
}

/** 2.5 -> "2,5 $" ; 20 -> "20 $" */
export function usd(n: number): string {
  const arrondi = Math.round(nombreSur(n, 0) * 100) / 100;
  return `${String(arrondi).replace(".", ",")} $`;
}

export function formatPrix(usdVal: number): string {
  const v = nombreSur(usdVal, 0);
  return v <= 0 ? "Gratuit" : `${toUSDString(v)} / ${toCDFString(v)}`;
}

// ========== 1. FREEMIUM OFFICIEL (3 IMAGES À VIE, 30 JOURS, PUIS CACHÉ) ==========
export const FREEMIUM = {
  id: "freemium",
  nom: "Freemium Découverte",
  maxImages: 3,
  maxImagesLabel: "3 images à vie",
  dureeJours: 30,
  apres: "cache" as const,
  prix: 0,
  badge: "🆓",
  message:
    "3 images à vie, visibles 30j en vente flash, puis compte caché (is_visible=false) jusqu'à achat d'un abonnement",
} as const;

export function originOf(user: any): "client" | "vendeur" {
  if (!user) return "vendeur";
  if (user.origine === "client" || user.origine === "vendeur") return user.origine;
  return user.role === "client" || user.user_type === "client"
    ? "client"
    : "vendeur";
}

export function freemiumImagesDe(user: any): number {
  if (!user) return FREEMIUM.maxImages;
  if (originOf(user) === "client" || user.freemiumDeja) return 0;
  if (user.niveau === undefined || user.niveau === null) return FREEMIUM.maxImages;
  return nombreSur(user.niveau, 0) >= 2 || Boolean(user.whatsappVerifie)
    ? FREEMIUM.maxImages
    : 1;
}

// ========== 2. ABONNEMENTS - 3 PALIERS (GRILLE OFFICIELLE PDF) ==========
export type PalierId = "STANDARD" | "PRO" | "PREMIUM";
export type DureeId = "1j" | "7j" | "30j";

export interface OffreDuree {
  id: DureeId;
  label: string;
  jours: number;
  prixUSD: number;
  prixCDF: number;
}

export interface PalierConfig {
  id: PalierId;
  nom: string;
  imagesMin: number;
  imagesMax: number;
  places: number;
  jours: number;
  prixUSD: number;
  prixCDF: number;
  badge: string;
  limiteActives: number;
  videoCount: number;
  videoDuree: string;
  videos: string;
  description: string;
  durees: OffreDuree[];
  prix: Record<DureeId, number>;
}

interface BasePalierInput {
  id: PalierId;
  nom: string;
  imagesMin: number;
  imagesMax: number;
  badge: string;
  videoCount: number;
  videoSecondes: number;
  prix1j: number;
  prix7j: number;
  prix30j: number;
}

function construirePalier(input: BasePalierInput): PalierConfig {
  const p1j = Math.max(0, nombreSur(input.prix1j, 0));
  const p7j = Math.max(0, nombreSur(input.prix7j, 0));
  const p30j = Math.max(0, nombreSur(input.prix30j, 0));

  const durees: OffreDuree[] = [
    { id: "1j", label: "1 jour", jours: 1, prixUSD: p1j, prixCDF: toCDF(p1j) },
    { id: "7j", label: "7 jours", jours: 7, prixUSD: p7j, prixCDF: toCDF(p7j) },
    { id: "30j", label: "Mois (30j)", jours: 30, prixUSD: p30j, prixCDF: toCDF(p30j) },
  ];

  const libelleVideos =
    input.videoCount > 1
      ? `${input.videoCount} vidéos ${input.videoSecondes}s`
      : `1 vidéo ${input.videoSecondes}s`;

  return {
    id: input.id,
    nom: input.nom,
    imagesMin: input.imagesMin,
    imagesMax: input.imagesMax,
    places: input.imagesMax,
    jours: 30,
    prixUSD: p30j,
    prixCDF: toCDF(p30j),
    badge: input.badge,
    limiteActives: MAX_ANNONCES_ACTIVES,
    videoCount: input.videoCount,
    videoDuree: `${input.videoSecondes}s`,
    videos: libelleVideos,
    description: `${input.badge} ${input.nom} — ${input.imagesMin} à ${input.imagesMax} images + ${libelleVideos} (dès ${toUSDString(p1j)}/j, ${toUSDString(p30j)}/30j)`,
    durees,
    prix: {
      "1j": p1j,
      "7j": p7j,
      "30j": p30j,
    },
  };
}

const GRILLE_PALIERS_OFFICIELLE: Record<PalierId, BasePalierInput> = {
  STANDARD: {
    id: "STANDARD",
    nom: "STANDARD",
    imagesMin: 1,
    imagesMax: 4,
    badge: "⭐",
    videoCount: 1,
    videoSecondes: 15,
    prix1j: 0.5,
    prix7j: 2.5,
    prix30j: 5,
  },
  PRO: {
    id: "PRO",
    nom: "PRO",
    imagesMin: 5,
    imagesMax: 10,
    badge: "🚀",
    videoCount: 1,
    videoSecondes: 60,
    prix1j: 1,
    prix7j: 5,
    prix30j: 10,
  },
  PREMIUM: {
    id: "PREMIUM",
    nom: "PREMIUM",
    imagesMin: 11,
    imagesMax: 30,
    badge: "👑",
    videoCount: 2,
    videoSecondes: 60,
    prix1j: 1.5,
    prix7j: 10,
    prix30j: 20,
  },
};

export let PALIERS: Record<PalierId, PalierConfig> = {
  STANDARD: construirePalier(GRILLE_PALIERS_OFFICIELLE.STANDARD),
  PRO: construirePalier(GRILLE_PALIERS_OFFICIELLE.PRO),
  PREMIUM: construirePalier(GRILLE_PALIERS_OFFICIELLE.PREMIUM),
};

// ========== 3. BOOSTS OCCASIONNELS (GRILLE OFFICIELLE PDF) ==========
export type TypeOcc = "image" | "pack3" | "video";
export type DureeOcc = "1j" | "7j";

export interface OffreOcc {
  id: string;
  type: TypeOcc;
  dureeId: DureeOcc;
  label: string;
  usage: string;
  images: number;
  video: boolean;
  jours: number;
  prixUSD: number;
  prixCDF: number;
  badge: string;
}

interface BaseOccInput {
  type: TypeOcc;
  dureeId: DureeOcc;
  jours: number;
  prixUSD: number;
  usage: string;
}

const GRILLE_OCCASIONNEL_OFFICIELLE: BaseOccInput[] = [
  {
    type: "image",
    dureeId: "1j",
    jours: 1,
    prixUSD: 0.2,
    usage: "1 image en #1 pendant la durée",
  },
  {
    type: "image",
    dureeId: "7j",
    jours: 7,
    prixUSD: 1,
    usage: "1 image en #1 pendant la durée",
  },
  {
    type: "pack3",
    dureeId: "1j",
    jours: 1,
    prixUSD: 0.5,
    usage: "Pack 3 images",
  },
  {
    type: "pack3",
    dureeId: "7j",
    jours: 7,
    prixUSD: 2.5,
    usage: "Pack 3 images",
  },
  {
    type: "video",
    dureeId: "1j",
    jours: 1,
    prixUSD: 0.5,
    usage: "Vidéo 15s en story haut d'app",
  },
  {
    type: "video",
    dureeId: "7j",
    jours: 7,
    prixUSD: 2.5,
    usage: "Vidéo 15s en story haut d'app",
  },
];

function construireOffreOcc(item: BaseOccInput): OffreOcc {
  const meta =
    item.type === "pack3"
      ? { prefix: "3img", titre: "3 images", badge: "🗂️", images: 3, video: false }
      : item.type === "video"
      ? { prefix: "video", titre: "1 vidéo 15s", badge: "🎬", images: 1, video: true }
      : { prefix: "1img", titre: "1 image seule", badge: "🖼️", images: 1, video: false };

  const prix = Math.max(0, nombreSur(item.prixUSD, 0));

  return {
    id: `occ-${meta.prefix}-${item.dureeId}`,
    type: item.type,
    dureeId: item.dureeId,
    label: `${meta.titre} — ${item.jours} jour${item.jours > 1 ? "s" : ""}`,
    usage: item.usage,
    images: meta.images,
    video: meta.video,
    jours: item.jours,
    prixUSD: prix,
    prixCDF: toCDF(prix),
    badge: meta.badge,
  };
}

export let OCCASIONNEL = {
  id: "OCCASIONNEL",
  nom: "Boost Flash Occasionnel (sans freemium)",
  offres: GRILLE_OCCASIONNEL_OFFICIELLE.map(construireOffreOcc) as OffreOcc[],
};

// ========== 4. COLLABORATION DG PRIVÉ & CHARGEMENT DYNAMIQUE ==========
export interface ConfigTarifsDG {
  tauxCDF?: number;
  paliers?: Partial<
    Record<
      PalierId,
      Partial<{
        prix1j: number;
        prix7j: number;
        prix30j: number;
        imagesMin: number;
        imagesMax: number;
        videoCount: number;
        videoSecondes: number;
      }>
    >
  >;
  occasionnel?: Partial<Record<string, number>>;
}

export function appliquerConfigTarifsDG(config?: ConfigTarifsDG | null): void {
  if (!config || typeof config !== "object") {
    reinitialiserGrilleOfficielle();
    return;
  }

  if (config.tauxCDF && nombreSur(config.tauxCDF, 0) > 0) {
    setTauxCDF(nombreSur(config.tauxCDF, TAUX_CDF_DEFAUT));
  }

  PALIERS = {
    STANDARD: construirePalier({
      ...GRILLE_PALIERS_OFFICIELLE.STANDARD,
      ...(config.paliers?.STANDARD || {}),
    }),
    PRO: construirePalier({
      ...GRILLE_PALIERS_OFFICIELLE.PRO,
      ...(config.paliers?.PRO || {}),
    }),
    PREMIUM: construirePalier({
      ...GRILLE_PALIERS_OFFICIELLE.PREMIUM,
      ...(config.paliers?.PREMIUM || {}),
    }),
  };

  const overridesOcc = config.occasionnel || {};
  OCCASIONNEL = {
    ...OCCASIONNEL,
    offres: GRILLE_OCCASIONNEL_OFFICIELLE.map((item) => {
      const baseOffre = construireOffreOcc(item);
      const prixOverride = overridesOcc[baseOffre.id];
      if (prixOverride !== undefined && nombreSur(prixOverride, -1) >= 0) {
        const p = nombreSur(prixOverride, baseOffre.prixUSD);
        return {
          ...baseOffre,
          prixUSD: p,
          prixCDF: toCDF(p),
        };
      }
      return baseOffre;
    }),
  };

  safeSet("wenze_tarifs_dg_override", JSON.stringify(config));
}

export function reinitialiserGrilleOfficielle(): void {
  TAUX_CDF = TAUX_CDF_DEFAUT;
  safeSet("wenze_taux_cdf_actif", String(TAUX_CDF_DEFAUT));
  if (hasWindow()) {
    try {
      window.localStorage.removeItem("wenze_tarifs_dg_override");
    } catch {}
  }
  PALIERS = {
    STANDARD: construirePalier(GRILLE_PALIERS_OFFICIELLE.STANDARD),
    PRO: construirePalier(GRILLE_PALIERS_OFFICIELLE.PRO),
    PREMIUM: construirePalier(GRILLE_PALIERS_OFFICIELLE.PREMIUM),
  };
  OCCASIONNEL = {
    ...OCCASIONNEL,
    offres: GRILLE_OCCASIONNEL_OFFICIELLE.map(construireOffreOcc),
  };
}

export async function chargerConfigTarifsDepuisSupabase(
  supabaseClient: any
): Promise<void> {
  try {
    if (hasWindow()) {
      const localOverride = safeGet("wenze_tarifs_dg_override");
      if (localOverride) {
        appliquerConfigTarifsDG(JSON.parse(localOverride));
      }
    }

    if (!supabaseClient?.from) return;

    const { data, error } = await supabaseClient
      .from("config_publique")
      .select("tarifs_json, taux_cdf")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return;

    if (data.taux_cdf && nombreSur(data.taux_cdf, 0) > 0) {
      setTauxCDF(nombreSur(data.taux_cdf, TAUX_CDF_DEFAUT));
    }

    const tarifsJson = data.tarifs_json as Record<string, any> | null;
    if (tarifsJson?.grille_paiement) {
      appliquerConfigTarifsDG(tarifsJson.grille_paiement as ConfigTarifsDG);
    }
  } catch {}
}

export function getPalier(id: unknown): PalierConfig | null {
  const key = String(id || "").toUpperCase() as PalierId;
  return Object.prototype.hasOwnProperty.call(PALIERS, key) ? PALIERS[key] : null;
}

export function offreDuree(palierId: unknown, dureeId: unknown): OffreDuree | null {
  const p = getPalier(palierId);
  if (!p) return null;
  return p.durees.find((d) => d.id === dureeId) || null;
}

// ========== 5. COUCHE AGRÉGATEURS & ESSAIS ==========
export function creerIntentPaiement(params: {
  categorie: "abonnement" | "boost_occasionnel";
  referenceOffre: string;
  montantUSD: number;
  devise?: "USD" | "CDF";
  fournisseur?: FournisseurPaiement;
  ownerWhatsapp?: string;
}): IntentPaiement {
  const montant = Math.max(0, nombreSur(params.montantUSD, 0));
  const modeEssai =
    !PAIEMENT_REEL || (params.fournisseur || "simulation") === "simulation";
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();

  return {
    intentId: `WNZ-${Date.now()}-${rand}`,
    categorie: params.categorie,
    referenceOffre: params.referenceOffre,
    montantUSD: montant,
    montantCDF: toCDF(montant),
    devise: params.devise || "USD",
    fournisseur: modeEssai ? "simulation" : params.fournisseur || "flexpay",
    modeEssai,
    ownerWhatsapp: cleanWa(params.ownerWhatsapp || ""),
    createdAt: new Date().toISOString(),
  };
}

export async function executerPaiementIntent(
  intent: IntentPaiement
): Promise<ResultatTransaction> {
  if (intent.modeEssai || !PAIEMENT_REEL) {
    return {
      ok: true,
      statut: "simulated",
      intentId: intent.intentId,
      referenceExterne: `SIM-${intent.intentId}`,
      message: `Essai validé (${formatPrix(intent.montantUSD)})`,
    };
  }

  try {
    const res = await fetch("/api/paiement/initier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(intent),
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      return {
        ok: false,
        statut: "failed",
        intentId: intent.intentId,
        message: data?.message || "Paiement non confirmé par l'agrégateur",
        erreur: data?.error || `HTTP_${res.status}`,
      };
    }

    return {
      ok: true,
      statut: data?.statut || "paid",
      intentId: intent.intentId,
      referenceExterne: data?.referenceExterne,
      message: data?.message || "Paiement confirmé",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur réseau paiement";
    return {
      ok: false,
      statut: "failed",
      intentId: intent.intentId,
      message: "Service de paiement indisponible",
      erreur: msg,
    };
  }
}

// ========== 6. TICKETS, CONSOMMATION & ABONNEMENTS ==========
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
  intentId?: string;
  referenceExterne?: string;
}

export interface AchatResult {
  success: boolean;
  error?: string;
  message?: string;
  ticket?: any;
  transaction?: ResultatTransaction;
}

export function notifySafe(
  type: "payed" | "conso" | "lib",
  data: any
): void {
  try {
    if (!hasWindow()) return;
    // @ts-ignore optionnel selon le build
    import("./notifications")
      .then((m: any) => {
        if (type === "payed" && m.notifyTicketPayed) m.notifyTicketPayed(data);
        if (type === "conso" && m.notifyPlaceConsommee) {
          m.notifyPlaceConsommee(
            data.annonceId,
            data.ticketId,
            data.used,
            data.max
          );
        }
        if (type === "lib" && m.notifyPlaceLiberee) {
          m.notifyPlaceLiberee(data.annonceId, data.ticketId);
        }
      })
      .catch(() => {});
  } catch {}
}
export function sameOwner(t: any, wa: string): boolean {
  return !t?.ownerWhatsapp || !wa || cleanWa(t.ownerWhatsapp) === cleanWa(wa);
}

export function estActif(t: any, now: number): boolean {
  return timeOf(t?.expireAt, 0) > now;
}

export function listeActive(key: string, wa: string, now: number): any[] {
  return readList(key).filter(
    (t: any) => sameOwner(t, wa) && estActif(t, now)
  );
}

export function abonnementHeritageActif(user: any, now: number): boolean {
  if (!user) return false;
  return (
    timeOf(user.palierExpireAt, 0) > now ||
    timeOf(user.abonnementExpireAt, 0) > now
  );
}

export function acheterTicket(
  palierId: PalierId,
  dureeId: DureeId = "7j",
  fournisseur: FournisseurPaiement = "simulation"
): AchatResult {
  if (!hasWindow()) {
    return { success: false, error: "Indisponible hors navigateur" };
  }
  const palier = getPalier(palierId);
  if (!palier) return { success: false, error: "Palier inconnu" };

  const offre = offreDuree(palierId, dureeId);
  if (!offre) {
    return { success: false, error: "Durée inconnue pour ce palier" };
  }
  if (offre.prixUSD < PAIEMENT_MINIMUM_USD) {
    return {
      success: false,
      error: `Paiement minimum : ${toUSDString(PAIEMENT_MINIMUM_USD)}`,
    };
  }

  const user = readUser();
  if (!user) {
    return {
      success: false,
      error: "Connectez-vous ou créez un compte pour acheter",
    };
  }

  const ownerWa = waOf(user);
  const now = Date.now();
  const tickets = readList<Ticket>("wenze_tickets");
  const actifsDuVendeur = tickets.filter(
    (t: any) => sameOwner(t, ownerWa) && estActif(t, now)
  );
  if (actifsDuVendeur.length >= MAX_TICKETS_ACTIFS) {
    return {
      success: false,
      error: `Maximum ${MAX_TICKETS_ACTIFS} tickets actifs : renouvelez un ancien ticket`,
    };
  }

  const intent = creerIntentPaiement({
    categorie: "abonnement",
    referenceOffre: `${palierId}_${dureeId}`,
    montantUSD: offre.prixUSD,
    fournisseur,
    ownerWhatsapp: ownerWa,
  });

  const jours = Math.max(1, Math.round(nombreSur(offre.jours, 7)));
  const ticket: Ticket = {
    ticketId: `TICKET-${palierId}-${jours}j-${now}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`,
    palierId,
    dureeId,
    imagesMax: palier.imagesMax,
    imagesUsed: 0,
    imagesIds: [],
    jours,
    startAt: new Date(now).toISOString(),
    expireAt: new Date(now + jours * DAY_MS).toISOString(),
    prixUSD: offre.prixUSD,
    prixCDF: toCDF(offre.prixUSD),
    actif: true,
    renouvelable: true,
    ownerWhatsapp: ownerWa,
    videoMax: palier.videoCount,
    videoUsed: 0,
    intentId: intent.intentId,
    referenceExterne: `SIM-${intent.intentId}`,
  };

  tickets.push(ticket);
  if (!writeList("wenze_tickets", tickets)) {
    return { success: false, error: "Stockage plein : achat impossible" };
  }

  try {
    const plusTard =
      timeOf(user.palierExpireAt, 0) > timeOf(ticket.expireAt, 0)
        ? user.palierExpireAt
        : ticket.expireAt;
    const maj = {
      ...user,
      palierId,
      palierExpireAt: plusTard,
      isCache: false,
      badge: palier.badge,
    };
    safeSet("wenze_user", JSON.stringify(maj));

    const all = readList("wenze_all_users");
    const idx = all.findIndex(
      (u: any) =>
        cleanWa(u.ownerWhatsapp || u.whatsapp) ===
        cleanWa(maj.ownerWhatsapp || maj.whatsapp)
    );
    if (idx >= 0) all[idx] = maj;
    else all.push(maj);
    writeList("wenze_all_users", all);

    const log = readList("wenze_transactions");
    log.push({
      id: ticket.ticketId,
      ...ticket,
      statut: PAIEMENT_REEL ? "pending" : "simulated",
      success: true,
      createdAt: ticket.startAt,
      type: "ticket",
    });
    writeList("wenze_transactions", log.slice(-MAX_TRANSACTIONS));
  } catch {}

  notifySafe("payed", ticket);
  return {
    success: true,
    ticket,
    message: `✅ ${palier.badge} ${palier.nom} (${palier.imagesMax} images + ${palier.videos}) — ${jours}j — ${formatPrix(offre.prixUSD)}`,
  };
}
export function renouvelerTicket(ticketId: string): AchatResult {
  const tickets = readList<Ticket>("wenze_tickets");
  const idx = tickets.findIndex((t: any) => t.ticketId === ticketId);
  if (idx < 0) return { success: false, error: "Ticket introuvable" };

  const t = tickets[idx];
  const now = Date.now();
  const base = Math.max(timeOf(t.expireAt, 0), now);
  const jours = Math.max(1, nombreSur(t.jours, 7));
  t.expireAt = new Date(base + jours * DAY_MS).toISOString();
  t.actif = true;

  if (!writeList("wenze_tickets", tickets)) {
    return { success: false, error: "Stockage plein" };
  }

  notifySafe("payed", t);
  return { success: true, ticket: t, message: `♻️ Renouvelé +${jours}j` };
}

export function consommerPlace(ticketId: string, annonceId: string): boolean {
  const tickets = readList<Ticket>("wenze_tickets");
  const t = tickets.find((x: any) => x.ticketId === ticketId);
  if (!t) return false;
  if (!estActif(t, Date.now())) return false;
  if ((t.imagesIds || []).includes(annonceId)) return true;
  if (nombreSur(t.imagesUsed, 0) >= nombreSur(t.imagesMax, 0)) return false;

  t.imagesUsed = nombreSur(t.imagesUsed, 0) + 1;
  t.imagesIds = [...(t.imagesIds || []), annonceId];

  if (!writeList("wenze_tickets", tickets)) return false;
  notifySafe("conso", {
    annonceId,
    ticketId,
    used: t.imagesUsed,
    max: t.imagesMax,
  });
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
      t.imagesUsed = Math.max(0, nombreSur(t.imagesUsed, 1) - 1);
      ticketId = t.ticketId;
    }
  });
  if (ticketId) writeList(key, list);
  return ticketId;
}

export function libererPlace(annonceId: string): boolean {
  const idTicket = retirerDeListe("wenze_tickets", annonceId);
  const idOcc = retirerDeListe("wenze_occasionnel", annonceId);
  if (idTicket) notifySafe("lib", { annonceId, ticketId: idTicket });
  if (idOcc) notifySafe("lib", { annonceId, ticketId: idOcc });
  return Boolean(idTicket || idOcc);
}

export function acheterOccasionnel(
  offreId: string,
  fournisseur: FournisseurPaiement = "simulation"
): AchatResult {
  const offre = OCCASIONNEL.offres.find((o) => o.id === offreId);
  if (!offre) return { success: false, error: "Offre inconnue" };

  const acheteur = readUser();
  if (!acheteur) {
    return {
      success: false,
      error: "Connectez-vous ou créez un compte pour acheter",
    };
  }

  const ownerWa = waOf(acheteur);
  const now = Date.now();
  const intent = creerIntentPaiement({
    categorie: "boost_occasionnel",
    referenceOffre: offre.id,
    montantUSD: offre.prixUSD,
    fournisseur,
    ownerWhatsapp: ownerWa,
  });

  const ticketOcc = {
    ticketId: `OCC-${offreId}-${now}`,
    offreId,
    type: offre.type,
    imagesMax: offre.images || 1,
    imagesUsed: 0,
    imagesIds: [] as string[],
    jours: offre.jours,
    startAt: new Date(now).toISOString(),
    expireAt: new Date(now + offre.jours * DAY_MS).toISOString(),
    prixUSD: offre.prixUSD,
    prixCDF: toCDF(offre.prixUSD),
    actif: true,
    ownerWhatsapp: ownerWa,
    videoMax: offre.video ? 1 : 0,
    videoUsed: 0,
    intentId: intent.intentId,
  };

  const occ = readList("wenze_occasionnel");
  occ.push(ticketOcc);
  if (!writeList("wenze_occasionnel", occ)) {
    return { success: false, error: "Stockage plein : achat impossible" };
  }

  const log = readList("wenze_transactions");
  log.push({
    id: ticketOcc.ticketId,
    ...ticketOcc,
    statut: PAIEMENT_REEL ? "pending" : "simulated",
    type: "OCCASIONNEL",
    success: true,
  });
  writeList("wenze_transactions", log.slice(-MAX_TRANSACTIONS));

  return {
    success: true,
    ticket: ticketOcc,
    message: `✅ Boost activé : ${offre.label} (${formatPrix(offre.prixUSD)})`,
  };
}

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

export function isCompteCache(user: any): boolean {
  if (!user) return false;
  const now = Date.now();
  const wa = waOf(user);
  if (listeActive("wenze_tickets", wa, now).length > 0) return false;
  if (listeActive("wenze_occasionnel", wa, now).length > 0) return false;
  if (abonnementHeritageActif(user, now)) return false;
  if (originOf(user) === "client") return Boolean(user.estVendeur);
  const created = timeOf(user.createdAt, now);
  return (now - created) / DAY_MS > FREEMIUM.dureeJours;
}

export function checkFreemiumWenze(
  user: any,
  annoncesCount: number
): AbonnementStatus {
  const now = Date.now();
  const created = timeOf(user?.createdAt, now);
  const diffJ = Math.ceil((now - created) / DAY_MS);
  const joursRestantsFreemium = Math.max(0, FREEMIUM.dureeJours - diffJ);
  const wa = waOf(user);
  const countSafe = Math.max(0, nombreSur(annoncesCount, 0));

  const actifs = listeActive("wenze_tickets", wa, now)
    .filter((t: any) => Boolean(getPalier(t.palierId)))
    .sort((a: any, b: any) => timeOf(a.expireAt, 0) - timeOf(b.expireAt, 0));
  const occsActifs = listeActive("wenze_occasionnel", wa, now);

  if (actifs.length > 0) {
    const plusProche = actifs[0];
    const palier = getPalier(plusProche.palierId) as PalierConfig;
    const placesRestantes = actifs.reduce(
      (s: number, t: any) =>
        s + Math.max(0, nombreSur(t.imagesMax, 0) - nombreSur(t.imagesUsed, 0)),
      0
    );
    const totalMax = actifs.reduce(
      (s: number, t: any) => s + nombreSur(t.imagesMax, 0),
      0
    );
    const joursRestants = Math.max(
      0,
      Math.ceil((timeOf(plusProche.expireAt, now) - now) / DAY_MS)
    );
    const peut = countSafe < MAX_ANNONCES_ACTIVES && placesRestantes > 0;

    return {
      isPaye: true,
      isFreemium: false,
      isCache: false,
      peutPublier: peut,
      actif: peut,
      palierId: plusProche.palierId,
      palier,
      ticketsActifs: actifs,
      ticketsOccasionnel: occsActifs,
      joursRestants,
      joursRestantsFreemium: 0,
      expireAt: plusProche.expireAt,
      placesRestantes,
      totalImagesMax: totalMax,
      totalAnnonces: countSafe,
      maxPlaces: MAX_ANNONCES_ACTIVES,
      annoncesRestantes: Math.max(0, MAX_ANNONCES_ACTIVES - countSafe),
      imagesRestantes: placesRestantes,
      count: countSafe,
      message: `${actifs.length} ticket(s) — ${placesRestantes}/${totalMax} places — ${joursRestants}j`,
      badge: palier.badge,
      type: plusProche.palierId,
      prixUSD: palier.prixUSD,
    };
  }

  if (user && originOf(user) === "client") {
    const estVendeur = Boolean(user.estVendeur);
    return {
      isPaye: false,
      isFreemium: false,
      isCache: estVendeur,
      peutPublier: false,
      actif: false,
      palierId: null,
      palier: null,
      joursRestants: 0,
      joursRestantsFreemium: 0,
      expireAt: null,
      annoncesRestantes: 0,
      imagesRestantes: 0,
      placesRestantes: 0,
      totalAnnonces: countSafe,
      maxPlaces: MAX_ANNONCES_ACTIVES,
      count: countSafe,
      ticketsOccasionnel: occsActifs,
      message: estVendeur
        ? `Pas de freemium sur ce profil : choisissez un abonnement dès ${formatPrix(PALIERS.STANDARD.prix.find((d) => d.id === "1j")?.prixUSD || 0.5)} ou un boost`
        : "Compte client : boost occasionnel disponible pour vendre",
      badge: estVendeur ? "🔒" : "👤",
      type: estVendeur ? "sans-abonnement" : "client",
      prixUSD: 0,
    };
  }

  const gratuit = freemiumImagesDe(user);
  if (diffJ <= FREEMIUM.dureeJours) {
    const rest = Math.max(0, gratuit - countSafe);
    return {
      isPaye: false,
      isFreemium: true,
      isCache: false,
      peutPublier: rest > 0,
      actif: rest > 0,
      palierId: null,
      palier: null,
      joursRestants: joursRestantsFreemium,
      joursRestantsFreemium,
      expireAt: new Date(created + FREEMIUM.dureeJours * DAY_MS).toISOString(),
      annoncesRestantes: rest,
      imagesRestantes: rest,
      placesRestantes: rest,
      totalAnnonces: countSafe,
      maxPlaces: MAX_ANNONCES_ACTIVES,
      count: countSafe,
      message:
        rest > 0
          ? `🆓 Gratuit ${countSafe}/${gratuit} — ${joursRestantsFreemium}j restants`
          : `🆓 Gratuit ${countSafe}/${gratuit} atteint`,
      badge: "🆓",
      type: "freemium",
      prixUSD: 0,
    };
  }

  return {
    isPaye: false,
    isFreemium: false,
    isCache: true,
    peutPublier: false,
    actif: false,
    palierId: null,
    palier: null,
    joursRestants: 0,
    joursRestantsFreemium: 0,
    expireAt: null,
    annoncesRestantes: 0,
    imagesRestantes: 0,
    placesRestantes: 0,
    totalAnnonces: countSafe,
    maxPlaces: MAX_ANNONCES_ACTIVES,
    count: countSafe,
    message: `🔒 Caché — ${FREEMIUM.dureeJours}j gratuits expirés — Souscrivez à un abonnement dès ${formatPrix(0.5)} pour réapparaître`,
    badge: "🔒",
    type: "cache",
    prixUSD: 0,
  };
}

export function verifierAbonnement(): AbonnementStatus {
  const defaut: AbonnementStatus = {
    isPaye: false,
    isFreemium: true,
    isCache: false,
    peutPublier: false,
    type: "freemium",
    count: 0,
    badge: "🆓",
  };
  if (!hasWindow()) return defaut;

  try {
    const user = readUser();
    const list = readList("wenze_annonces_list");

    if (!user) {
      const count = list.length;
      const rest = Math.max(0, FREEMIUM.maxImages - count);
      return {
        ...defaut,
        peutPublier: count < FREEMIUM.maxImages,
        count,
        totalAnnonces: count,
        maxPlaces: MAX_ANNONCES_ACTIVES,
        placesRestantes: rest,
        imagesRestantes: rest,
        message: `Connectez-vous pour profiter du freemium (${FREEMIUM.maxImages} images à vie, 30j)`,
      };
    }

    if (!user.createdAt) {
      user.createdAt = new Date().toISOString();
      safeSet("wenze_user", JSON.stringify(user));
    }

    const myWa = cleanWa(user.ownerWhatsapp || user.whatsapp);
    const myCount = list.filter(
      (a: any) => cleanWa(a.ownerWhatsapp || a.whatsapp) === myWa
    ).length;
    const check = checkFreemiumWenze(user, myCount);

    return {
      ...check,
      label: check.palier?.nom || FREEMIUM.nom,
      prixUSD: check.palierId ? getPalier(check.palierId)?.prixUSD || 0 : 0,
    };
  } catch {
    return { ...defaut, message: "Erreur de vérification" };
  }
}
// ========== 7. COMPATIBILITÉ & RÉSUMÉS ==========
export function checkFreemiumLimit(): AbonnementStatus {
  return verifierAbonnement();
}
export function activerPalier(
  palierId: PalierId,
  dureeId: DureeId = "7j"
): AchatResult {
  return acheterTicket(palierId, dureeId);
}
export function handlePaiement(type: string): AchatResult {
  const raw = String(type || "").toUpperCase();
  if (raw.includes("PREMIUM")) return acheterTicket("PREMIUM", "30j");
  if (raw.includes("PRO")) return acheterTicket("PRO", "30j");
  return acheterTicket("STANDARD", "7j");
}
export function getBadgeForUser(user: any): string {
  const c = checkFreemiumWenze(user, 0);
  return `${c.badge} ${c.message}`;
}
export function getPrixByCategorie(cat: string) {
  const o = offreDuree("STANDARD", "7j") || PALIERS.STANDARD.durees[1];
  return {
    prixUSD: o.prixUSD,
    prixCDF: toCDF(o.prixUSD),
    prix: o.prixUSD,
    categorie: cat,
    label: `STANDARD ${o.jours}j ${o.prixUSD}$ — Même prix pour tous — Taux ${getTauxCDFActif()}`,
  };
}
export function getSoldeWPay(): number {
  return 0;
}

function resume(id: PalierId): string {
  const p = PALIERS[id];
  const j1 = offreDuree(id, "1j");
  const j7 = offreDuree(id, "7j");
  const j30 = offreDuree(id, "30j");
  return `${p.badge} ${id} (${p.imagesMin}-${p.imagesMax} img, ${p.videos}): ${j1?.prixUSD}$/j, ${j7?.prixUSD}$/7j, ${j30?.prixUSD}$/30j`;
}

export const MESSAGE_REGIME =
  `🆓 ${FREEMIUM.maxImages} images à vie ${FREEMIUM.dureeJours}j visibles puis 🔒 caché — ` +
  `${resume("STANDARD")} | ${resume("PRO")} | ${resume("PREMIUM")} — ` +
  `Max ${MAX_ANNONCES_ACTIVES} annonces actives — 0% commission`;

export const REGLE_LEGALE =
  "WENZE plateforme main à main 0% commission : vente de visibilité uniquement (abonnements et boosts). " +
  `Max ${MAX_ANNONCES_ACTIVES} annonces actives. ` +
  `Freemium ${FREEMIUM.maxImages} images à vie visibles ${FREEMIUM.dureeJours}j puis compte caché (is_visible=false) jusqu'à achat d'un abonnement. ` +
  "Chaque utilisateur est responsable de sa transaction.";
