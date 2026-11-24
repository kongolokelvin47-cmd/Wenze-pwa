// lib/connexion.ts - Source unique authentification, session, accès et sécurité publique WENZE WENZE
// Règles officielles :
// - Chacun son compte, identifiant WhatsApp immuable côté membre
// - Session horodatée 12h (wenze_session) synchronisée avec le profil actif (wenze_user)
// - Visite libre, action soumise à connexion (/connexion?raison=action&next=...)
// - Freemium : 3 images max sur 30 jours puis masquage (is_visible = false), max 50 annonces actives, 0 % commission
// - Paramètres tarifaires/taux dynamiques gérés via lib/paiement.ts (config_publique)

import { verifierAbonnement, libererPlace } from "@/lib/paiement";

export const DUREE_SESSION_MS = 12 * 60 * 60 * 1000; // 12h
export const CLE_SESSION = "wenze_session";
export const CLE_USER = "wenze_user";
export const CLE_ALL_USERS = "wenze_all_users";
export const CLE_ANNONCES = "wenze_annonces_list";
export const CLE_TICKETS = "wenze_tickets";
export const CLE_OCCASIONNEL = "wenze_occasionnel";
export const MAX_ANNONCES_ACTIVES = 50;

export type Role =
  | "client"
  | "vendeur"
  | "prestataire"
  | "grossiste"
  | "ambassadeur"
  | "superviseur"
  | "dg";

export type WenzeRole =
  | "DG"
  | "SUPERVISEUR"
  | "AMBASSADEUR"
  | "BOUTIQUE"
  | "CLIENT"
  | Role
  | (string & {});

export interface SessionPayload<T = Record<string, unknown>> {
  role: WenzeRole;
  data: T;
  debut: number;
  expire: number;
}

export interface PublicationStatus {
  ok: boolean;
  msg: string;
  code?:
    | "OK"
    | "NO_USER"
    | "CACHE"
    | "MAX50"
    | "NO_PLACE"
    | "TICKET_NOT_FOUND"
    | "TICKET_EXPIRED"
    | "TICKET_FULL"
    | "FALLBACK_OK";
  ab?: any;
  ticket?: any;
  count?: number;
}

function estNavigateur(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParseList<T = any>(key: string): T[] {
  if (!estNavigateur()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function cleanWhatsapp(num: unknown): string {
  return (num ?? "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
}

export const cleanWa = cleanWhatsapp;

export function cheminSur(next?: string): string {
  if (!next || typeof next !== "string") return "/";
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed;
}

// ============================================================================
// 1. SESSION & COMPTE UTILISATEUR PUBLIC (12h)
// ============================================================================

export function demarrerSession<T extends Record<string, any> = Record<string, any>>(
  role: WenzeRole,
  data: T
): SessionPayload<T> {
  const maintenant = Date.now();
  const session: SessionPayload<T> = {
    role,
    data,
    debut: maintenant,
    expire: maintenant + DUREE_SESSION_MS,
  };

  if (estNavigateur()) {
    try {
      window.localStorage.setItem(CLE_SESSION, JSON.stringify(session));
      const userRecord = {
        ...data,
        role: data?.role ?? String(role).toLowerCase(),
      };
      window.localStorage.setItem(CLE_USER, JSON.stringify(userRecord));
    } catch {
      // Ignore si localStorage indisponible ou plein
    }
  }

  return session;
}

export function verifierSession<T = Record<string, any>>(): SessionPayload<T> | null {
  if (!estNavigateur()) return null;

  try {
    const raw = window.localStorage.getItem(CLE_SESSION);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SessionPayload<T>>;
    if (
      typeof parsed?.role !== "string" ||
      typeof parsed?.expire !== "number" ||
      Number.isNaN(parsed.expire)
    ) {
      window.localStorage.removeItem(CLE_SESSION);
      return null;
    }

    if (Date.now() > parsed.expire) {
      window.localStorage.removeItem(CLE_SESSION);
      return null;
    }

    return parsed as SessionPayload<T>;
  } catch {
    try {
      window.localStorage.removeItem(CLE_SESSION);
    } catch {
      // Ignore
    }
    return null;
  }
}

export function lireSession<T = Record<string, any>>(): SessionPayload<T> | null {
  return verifierSession<T>();
}

export function getCurrentUser<T extends Record<string, any> = Record<string, any>>(): T | null {
  if (!estNavigateur()) return null;

  const session = verifierSession<T>();
  try {
    const rawUser = window.localStorage.getItem(CLE_USER);
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser) as T;
      if (parsedUser && typeof parsedUser === "object") {
        return session?.data
          ? ({ ...session.data, ...parsedUser } as T)
          : parsedUser;
      }
    }
  } catch {
    // Ignore et tente session
  }

  return session?.data ?? null;
}

export function getAllUsers<T = Record<string, any>>(): T[] {
  return safeParseList<T>(CLE_ALL_USERS);
}

export function quitterSession(redirectTo = "/"): void {
  if (estNavigateur()) {
    try {
      window.localStorage.removeItem(CLE_SESSION);
      window.localStorage.removeItem(CLE_USER);
    } catch {
      // Ignore
    }
    window.location.href = cheminSur(redirectTo);
  }
}

export function tempsRestant(): string | null {
  const session = verifierSession();
  if (!session) return null;

  const reste = Math.max(0, session.expire - Date.now());
  const h = Math.floor(reste / 3_600_000);
  const m = Math.floor((reste % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

// ============================================================================
// 2. RÈGLE D'ACCÈS (VISITE LIBRE, ACTION AVEC COMPTE) & RÔLES
// ============================================================================

export function estConnecte(): boolean {
  return !!getCurrentUser();
}

export function versConnexion(next?: string): string {
  return "/connexion?raison=action&next=" + encodeURIComponent(cheminSur(next));
}

export function exigerCompte(router: { push: (url: string) => void }, next?: string): boolean {
  if (estConnecte()) return true;
  router.push(versConnexion(next));
  return false;
}

export function assertIsLogged<T = Record<string, any>>(user: T | null = null): T {
  const u = user || getCurrentUser<T>();
  if (!u) throw new Error("Non connecté - Va à /connexion");
  return u;
}

export function hasRole(required: Role | Role[], user: any = null): boolean {
  const current = user || getCurrentUser();
  if (!current) return false;
  if (current.role === "dg") return true;

  const req = Array.isArray(required) ? required : [required];
  if (req.includes(current.role)) return true;

  const hierarchy: Record<string, number> = {
    client: 0,
    vendeur: 1,
    prestataire: 1,
    grossiste: 1,
    ambassadeur: 2,
    superviseur: 3,
    dg: 4,
  };

  const userLevel = hierarchy[current.role || "client"] ?? 0;
  const needLevel = Math.min(...req.map((r) => hierarchy[r] ?? 0));
  return userLevel >= needLevel;
}

// ============================================================================
// 3. PROPRIÉTÉ, IDENTITÉ WHATSAPP & INVITATIONS
// ============================================================================

function getUserIdentifiers(user: any) {
  if (!user) return { wa: "", id: "", waList: [] as string[] };
  const wa = cleanWhatsapp(
    user.ownerWhatsapp || user.whatsapp || user.telephone || user.phone || user.id || ""
  );
  const id = String(user.id || "").trim();
  const waList = [
    cleanWhatsapp(user.ownerWhatsapp),
    cleanWhatsapp(user.whatsapp),
    cleanWhatsapp(user.telephone),
    cleanWhatsapp(user.phone),
    id,
  ].filter(Boolean);
  return { wa, id, waList };
}

function getAnnonceIdentifiers(annonce: any) {
  if (!annonce) return { wa: "", id: "", waList: [] as string[] };
  const wa = cleanWhatsapp(
    annonce.ownerWhatsapp || annonce.whatsapp || annonce.telephone || annonce.userId || ""
  );
  const id = String(annonce.userId || annonce.ownerId || "").trim();
  const waList = [
    cleanWhatsapp(annonce.ownerWhatsapp),
    cleanWhatsapp(annonce.whatsapp),
    cleanWhatsapp(annonce.telephone),
    cleanWhatsapp(annonce.userId),
  ].filter(Boolean);
  return { wa, id, waList };
}

export function isOwnerOf(target: any, user: any = null): boolean {
  const u = user || getCurrentUser();
  if (!u || !target) return false;
  if (u.role === "dg") return true;

  const cur = getUserIdentifiers(u);
  const ann = getAnnonceIdentifiers(target);
  if (!cur.wa && !cur.id) return false;

  const sameWhatsapp = Boolean(cur.wa && ann.wa && cur.wa === ann.wa);
  const sameId = Boolean(cur.id && ann.id && cur.id === ann.id);
  const crossMatch = cur.waList.some((w) => ann.waList.includes(w));

  return sameWhatsapp || sameId || crossMatch;
}

export const isOwner = (annonce: any): boolean => isOwnerOf(annonce);

export function assertNotPublishingForOthers(annonceData: any, user: any = null): boolean {
  const u = user || getCurrentUser();
  if (!u) throw new Error("Non connecté - /connexion");

  const waU = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp || u.telephone || "");
  const waAnnonce = cleanWhatsapp(
    annonceData?.ownerWhatsapp || annonceData?.whatsapp || annonceData?.userId || ""
  );

  if (waAnnonce && waU && waAnnonce !== waU) {
    throw new Error(
      `⛔ INTERDIT - Tu ne peux pas publier pour ${waAnnonce}. Tu es connecté avec ${waU}. Chacun publie avec son propre WhatsApp.`
    );
  }
  return true;
}

export function assertCanEdit(annonce: any, user: any = null): boolean {
  const u = user || getCurrentUser();
  if (!u) throw new Error("Non connecté - /connexion");
  if (!annonce) throw new Error("Annonce introuvable");
  if (!isOwnerOf(annonce, u)) {
    throw new Error(
      `⛔ INTERDIT - Tu ne peux pas modifier l'annonce d'autrui (${annonce.id || ""}).`
    );
  }
  return true;
}

export function canEdit(annonce: any): boolean {
  if (!isOwner(annonce)) return false;
  try {
    const tickets = safeParseList<any>(CLE_TICKETS);
    const ticketId = annonce?.ticketId || annonce?.palierTicketId || "";
    if (ticketId) {
      const t = tickets.find((x: any) => x.ticketId === ticketId);
      if (t && new Date(t.expireAt).getTime() < Date.now()) {
        return false;
      }
    }
  } catch {
    // Ignore
  }
  return true;
}

export function assertCanDelete(annonce: any, user: any = null): boolean {
  return assertCanEdit(annonce, user);
}

export function canDelete(annonce: any): boolean {
  return isOwner(annonce);
}

export function assertCanEditProfile(profileId: string, user: any = null): boolean {
  const u = user || getCurrentUser();
  if (!u) throw new Error("Non connecté - /connexion");
  if (!profileId) throw new Error("Profil ID manquant");

  const cur = getUserIdentifiers(u);
  const waP = cleanWhatsapp(profileId);
  const idP = String(profileId).trim();

  const isSelf =
    Boolean(cur.wa && waP && cur.wa === waP) ||
    Boolean(cur.id && idP && cur.id === idP) ||
    Boolean(cur.wa && waP && cur.waList.includes(waP));

  if (!isSelf) {
    throw new Error(
      `⛔ INTERDIT - Tu ne peux pas modifier le profil d'autrui (${profileId}). Le numéro WhatsApp est l'identifiant unique du compte.`
    );
  }
  return true;
}

export function validateWhatsAppImmutable(oldWa: string, newWa: string): boolean {
  const oldClean = cleanWhatsapp(oldWa);
  const newClean = cleanWhatsapp(newWa);
  if (oldClean && newClean && oldClean !== newClean) {
    throw new Error(
      `⛔ INTERDIT - Le numéro WhatsApp (${oldClean}) ne peut pas être modifié. Pour utiliser un autre numéro, crée un nouveau compte via invitation dans /profil.`
    );
  }
  return true;
}

export function assertCanInvite(toWa: string, user: any = null): boolean {
  const u = user || getCurrentUser();
  if (!u) throw new Error("Connecte-toi pour inviter - /connexion");

  const fromWa = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp || u.telephone || "");
  const toClean = cleanWhatsapp(toWa);

  if (!toClean || toClean.length < 9) {
    throw new Error("Numéro WhatsApp invalide - Minimum 9 chiffres");
  }
  if (fromWa && fromWa === toClean) {
    throw new Error("⛔ Tu ne peux pas t'inviter toi-même");
  }
  if (getAllUsers<any>().some((x: any) => cleanWhatsapp(x.ownerWhatsapp || x.whatsapp) === toClean)) {
    throw new Error(`Ce numéro ${toClean} a déjà un compte`);
  }
  return true;
}

export function assertCanLoadEdit(editId: string, user: any = null) {
  const u = user || getCurrentUser();
  if (!u) throw new Error("Non connecté - /connexion");
  if (!editId) throw new Error("ID annonce manquant");
  if (!estNavigateur()) return true;

  const list = safeParseList<any>(CLE_ANNONCES);
  const old = list.find((x: any) => x.id === editId || x.annonceId === editId);
  if (!old) throw new Error(`Annonce ${editId} introuvable`);
  assertCanEdit(old, u);
  return old;
}

// ============================================================================
// 4. QUOTAS, ABONNEMENT / FREEMIUM (3 IMAGES / 30J -> MASQUÉ), MAX 50 & SUPPRESSION
// ============================================================================

function compterAnnoncesActivesUtilisateur(user: any): number {
  const idents = getUserIdentifiers(user);
  const list = safeParseList<any>(CLE_ANNONCES);
  return list.filter((a: any) => {
    const ann = getAnnonceIdentifiers(a);
    const matchesOwner =
      Boolean(idents.wa && ann.wa && idents.wa === ann.wa) ||
      Boolean(idents.id && ann.id && idents.id === ann.id) ||
      idents.waList.some((w) => ann.waList.includes(w));
    return matchesOwner && a?.is_visible !== false && a?.archived !== true;
  }).length;
}

export function isCompteCacheV6(): boolean {
  try {
    const user = getCurrentUser();
    if (!user) return false;
    const ab: any = verifierAbonnement();
    return Boolean(ab?.isCache);
  } catch {
    return false;
  }
}

export function assertMax50(user: any = null): number {
  const u = user || getCurrentUser();
  if (!u) return 0;
  const count = compterAnnoncesActivesUtilisateur(u);
  if (count >= MAX_ANNONCES_ACTIVES) {
    throw new Error(
      `Limite de ${MAX_ANNONCES_ACTIVES} annonces actives atteinte (${count}/${MAX_ANNONCES_ACTIVES}). Supprime une annonce pour libérer une place.`
    );
  }
  return count;
}

export function verifierCapacitePublication(user: any = null, ticketId?: string): PublicationStatus {
  const u = user || getCurrentUser();
  if (!u) {
    return { ok: false, msg: "Connecte-toi d'abord - /connexion", code: "NO_USER" };
  }

  const myCount = compterAnnoncesActivesUtilisateur(u);
  if (myCount >= MAX_ANNONCES_ACTIVES) {
    return {
      ok: false,
      msg: `⛔ Limite de ${MAX_ANNONCES_ACTIVES} annonces actives atteinte (${myCount}/${MAX_ANNONCES_ACTIVES}). Supprime une annonce pour libérer une place.`,
      code: "MAX50",
      count: myCount,
    };
  }

  try {
    const ab: any = verifierAbonnement();

    if (ab?.isCache) {
      return {
        ok: false,
        msg:
          ab.message ||
          "🔒 Compte masqué (is_visible = false) après la période freemium de 30 jours ou ticket expiré. Active une offre pour réapparaître (0 % commission).",
        code: "CACHE",
        ab,
        count: myCount,
      };
    }

    if (ticketId) {
      const allTickets = [
        ...safeParseList<any>(CLE_TICKETS),
        ...safeParseList<any>(CLE_OCCASIONNEL),
      ];
      const t = allTickets.find((x: any) => x.ticketId === ticketId);
      if (!t) {
        return { ok: false, msg: `Ticket ${ticketId} introuvable`, code: "TICKET_NOT_FOUND", ab, count: myCount };
      }
      if (t.expireAt && new Date(t.expireAt).getTime() < Date.now()) {
        return {
          ok: false,
          msg: `Ticket ${t.palierId || "OCC"} expiré le ${new Date(t.expireAt).toLocaleDateString("fr-FR")}.`,
          code: "TICKET_EXPIRED",
          ab,
          ticket: t,
          count: myCount,
        };
      }
      if ((t.imagesUsed ?? 0) >= (t.imagesMax ?? 0)) {
        return {
          ok: false,
          msg: `Ticket ${t.palierId || "OCC"} complet (${t.imagesUsed}/${t.imagesMax}).`,
          code: "TICKET_FULL",
          ab,
          ticket: t,
          count: myCount,
        };
      }
      return {
        ok: true,
        msg: `Publication autorisée (${(t.imagesMax ?? 0) - (t.imagesUsed ?? 0)} place(s) restante(s)).`,
        code: "OK",
        ab,
        ticket: t,
        count: myCount,
      };
    }

    if (ab && ab.peutPublier === false) {
      return {
        ok: false,
        msg:
          ab.message ||
          "Quota de publication atteint (freemium : 3 images max / 30 jours, ou places de ticket épuisées).",
        code: "NO_PLACE",
        ab,
        count: myCount,
      };
    }

    return {
      ok: true,
      msg: ab?.message || "Publication autorisée.",
      code: "OK",
      ab,
      count: myCount,
    };
  } catch {
    return {
      ok: true,
      msg: "Publication autorisée (vérification locale).",
      code: "FALLBACK_OK",
      count: myCount,
    };
  }
}

export function canPublish(): boolean;
export function canPublish(user: any, ticketId?: string): PublicationStatus;
export function canPublish(user?: any, ticketId?: string): boolean | PublicationStatus {
  if (arguments.length === 0) {
    const current = getCurrentUser();
    if (!current) return false;
    if (current.role === "dg" || current.role === "superviseur") return true;
    return verifierCapacitePublication(current).ok;
  }
  return verifierCapacitePublication(user, ticketId);
}

export const canPublishDetail = (): PublicationStatus => verifierCapacitePublication(getCurrentUser());

export function assertCanPublish(user: any = null, ticketId?: string): PublicationStatus {
  const chk = verifierCapacitePublication(user, ticketId);
  if (!chk.ok) throw new Error(chk.msg);
  return chk;
}

export function assertCanPublishInTicket(ticketId: string, user: any = null): PublicationStatus {
  if (!ticketId) {
    throw new Error("Sélectionne un ticket valide avant de publier.");
  }
  return assertCanPublish(user, ticketId);
}

export function secureDelete(annonceId: string): boolean {
  if (!estNavigateur()) return false;
  try {
    const list = safeParseList<any>(CLE_ANNONCES);
    const annonce = list.find((a: any) => (a.id || a.annonceId) === annonceId);
    if (!annonce || !isOwner(annonce)) return false;

    try {
      libererPlace(annonceId);
    } catch {
      // Ignore si libererPlace n'a rien à libérer
    }
    return true;
  } catch {
    return false;
  }
}

export function getKeepDates(annonce: any) {
  if (!annonce) return null;
  const expiration = annonce.expireAt || annonce.boostUntil || annonce.ticketExpireAt || null;
  return {
    createdAt: annonce.createdAt || annonce.created_at,
    expireAt: expiration,
    ticketId: annonce.ticketId || null,
    ticketExpireAt: annonce.expireAt || null,
    remainingDays: expiration
      ? Math.ceil((new Date(expiration).getTime() - Date.now()) / 86_400_000)
      : null,
    originalId: annonce.id,
    isV6Ticket: Boolean(annonce.ticketId),
  };
}
