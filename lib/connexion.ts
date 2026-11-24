// lib/connexion.ts - Source unique WENZE WENZE : comptes, session, accès, sécurité & règles métier
// - Visite libre ; agir (publier, contacter, acheter, gérer son compte) demande un compte
// - Synchronisation profil public uniquement vers Supabase (jamais de mot de passe ni d'auth)
// - Freemium : 3 images max / 30 jours puis masquage (is_visible = false), max 50 annonces actives, 0 % commission
// - Paramètres tarifaires / taux dynamiques gérés via lib/paiement.ts (config_publique)

import { verifierAbonnement, libererPlace } from "@/lib/paiement";
import { originOf, freemiumImagesDe } from "@/lib/paiement-base";
import { createClient } from "@/utils/supabase/client";

export const DUREE_SESSION_MS = 12 * 60 * 60 * 1000; // 12h
export const CLE_SESSION = "wenze_session";
export const CLE_USER = "wenze_user";
export const CLE_ALL_USERS = "wenze_all_users";
export const CLE_AUTH = "wenze_auth";
export const CLE_LEGACY_PW = "wenze_passwords";
export const CLE_CLAIMS = "wenze_freemium_claims";
export const CLE_INVITES = "wenze_invitations";
export const CLE_FAILS = "wenze_login_fails";
export const CLE_ANNONCES = "wenze_annonces_list";
export const CLE_TICKETS = "wenze_tickets";
export const CLE_OCCASIONNEL = "wenze_occasionnel";

export const MAX_ANNONCES_ACTIVES = 50;
export const MDP_MIN = 6;
export const PLACES_INVITATION_BASE = 5;
export const PLACES_INVITATION_MAX = 20;

const RESERVATION_MS = 48 * 3600 * 1000;
const ITERATIONS = 100000;
const MAX_ECHECS = 5;
const BLOCAGE_MS = 5 * 60 * 1000;

export const COMMUNES = [
  "Bandalungwa", "Barumbu", "Bumbu", "Gombe", "Kalamu", "Kasa-Vubu", "Kimbanseke",
  "Kinshasa", "Kintambo", "Kisenso", "Lemba", "Limete", "Lingwala", "Makala",
  "Maluku", "Masina", "Matete", "Mont-Ngafula", "Ndjili", "Ngaba", "Ngaliema",
  "Ngiri-Ngiri", "Nsele", "Selembao",
];

export type TypeCompte = "client" | "vendeur" | "prestataire" | "grossiste";

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

export interface Resultat {
  ok: boolean;
  erreur?: string;
  code?: string;
  compte?: any;
  invitation?: any;
  lien?: string;
}

export interface DonneesInscription {
  type: TypeCompte;
  nom: string;
  nomBoutique?: string;
  whatsapp: string;
  mdp: string;
  commune?: string;
  email?: string;
  code?: string;
  parrain?: string;
  accepte: boolean;
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

const BADGES: Record<TypeCompte, string> = {
  client: "🛒",
  vendeur: "🛍️",
  prestataire: "🔧",
  grossiste: "🏭",
};

const echec = (erreur: string, code?: string): Resultat => ({ ok: false, erreur, code });

function estNavigateur(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function lire<T>(key: string, defaut: T): T {
  if (!estNavigateur()) return defaut;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : defaut;
  } catch {
    return defaut;
  }
}

function ecrire(key: string, value: any): boolean {
  if (!estNavigateur()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function safeParseList<T = any>(key: string): T[] {
  const val = lire<any>(key, []);
  return Array.isArray(val) ? val : [];
}

// ============================================================================
// 1. FORMATAGE, SÉCURITÉ CHEMINS & CRYPTOGRAPHIE MOT DE PASSE
// ============================================================================

export function cleanWhatsapp(num: unknown): string {
  return (num ?? "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
}

export const cleanWa = cleanWhatsapp;

export function normaliserWa(input: any): string | null {
  let d = (input === null || input === undefined ? "" : String(input)).replace(/[^0-9]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("243")) d = d.slice(3);
  d = d.replace(/^0+/, "");
  return /^[89][0-9]{8}$/.test(d) ? "243" + d : null;
}

export function cle9(wa: any): string {
  const d = (wa === null || wa === undefined ? "" : String(wa)).replace(/[^0-9]/g, "");
  return d.length >= 7 ? d.slice(-9) : "";
}

export function cheminSur(next: any): string {
  const v = (next ?? "").toString().trim();
  return v.startsWith("/") && !v.startsWith("//") && !v.includes(":") && !v.includes("\\")
    ? v
    : "/";
}

export function lireCode(brut: any): { numero?: string; code?: string } | null {
  const v = (brut || "").toString().trim().toUpperCase();
  if (!v) return null;
  const wa = normaliserWa(v);
  if (wa) return { numero: wa };
  return /^[A-Z0-9][A-Z0-9-]{3,19}$/.test(v) ? { code: v } : null;
}

function versHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function depuisHex(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

async function deriver(mdp: string, selHex: string): Promise<string> {
  const subtle =
    typeof globalThis !== "undefined" && (globalThis as any).crypto
      ? (globalThis as any).crypto.subtle
      : null;
  if (!subtle) {
    throw new Error("Ce navigateur ne permet pas de protéger le mot de passe : mettez-le à jour.");
  }
  const cle = await subtle.importKey(
    "raw",
    new TextEncoder().encode(mdp),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: depuisHex(selHex) as any, iterations: ITERATIONS },
    cle,
    256
  );
  return versHex(new Uint8Array(bits));
}

async function enregistrerMdp(cle: string, mdp: string): Promise<void> {
  const sel = versHex((globalThis as any).crypto.getRandomValues(new Uint8Array(16)));
  const auth = lire<any>(CLE_AUTH, {});
  auth[cle] = { sel, hash: await deriver(mdp, sel) };
  ecrire(CLE_AUTH, auth);
}

export function validerMdp(mdp: string, wa?: string): string {
  if (!mdp || mdp.length < MDP_MIN) return "Mot de passe : " + MDP_MIN + " caractères minimum";
  if (wa && cle9(mdp) && cle9(mdp) === cle9(wa)) {
    return "Le mot de passe ne doit pas être votre numéro";
  }
  return "";
}

function msBloque(cle: string): number {
  const f = lire<any>(CLE_FAILS, {})[cle];
  return f && f.until ? Math.max(0, f.until - Date.now()) : 0;
}

function noterEchec(cle: string): void {
  const tous = lire<any>(CLE_FAILS, {});
  const f = tous[cle] || { n: 0, until: 0 };
  f.n = (f.until && f.until < Date.now() ? 0 : f.n) + 1;
  if (f.n >= MAX_ECHECS) {
    f.until = Date.now() + BLOCAGE_MS;
    f.n = 0;
  }
  tous[cle] = f;
  ecrire(CLE_FAILS, tous);
}

function effacerEchecs(cle: string): void {
  const tous = lire<any>(CLE_FAILS, {});
  delete tous[cle];
  ecrire(CLE_FAILS, tous);
}

// ============================================================================
// 2. SYNCHRONISATION SUPABASE (PROFIL PUBLIC UNIQUEMENT)
// ============================================================================

async function pushCompteToSupabase(compte: any) {
  try {
    if (!compte) return;
    const supabase = createClient();
    const wa = compte.ownerWhatsapp || compte.whatsapp || compte.telephone;
    if (!wa) return;
    const { mdp, password, hash, sel, ...publicCompte } = compte;
    await supabase.from("profiles").upsert(
      {
        id: String(wa),
        owner_whatsapp: String(wa),
        telephone: String(wa),
        nom: compte.nom || "",
        email: compte.email || null,
        role: compte.role || "client",
        user_type: compte.user_type || compte.role || "client",
        origine: compte.origine || "client",
        est_vendeur: !!compte.estVendeur,
        vendeur_depuis: compte.vendeurDepuis || null,
        niveau: compte.niveau || 1,
        nom_boutique: compte.nomBoutique || "",
        nom_etablissement: compte.nomEtablissement || compte.nom || "",
        commune: compte.commune || "Gombe",
        ville: compte.ville || "Kinshasa",
        badge: compte.badge || "",
        mon_code: compte.monCode || "",
        code_parrainage: compte.codeParrainage || null,
        parrain_wa: compte.parrainWa || null,
        freemium_deja: !!compte.freemiumDeja,
        whatsapp_verifie: !!compte.whatsappVerifie,
        email_verifie: !!compte.emailVerifie,
        data: publicCompte,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch {
    // Mode local si Supabase indisponible
  }
}

export async function getComptesSupabase() {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data || []).map((r: any) => ({
    id: r.owner_whatsapp || r.id,
    ownerWhatsapp: r.owner_whatsapp,
    whatsapp: r.telephone,
    telephone: r.telephone,
    nom: r.nom,
    role: r.role,
    origine: r.origine,
    niveau: r.niveau,
    nomBoutique: r.nom_boutique,
    commune: r.commune,
    monCode: r.mon_code,
    parrainWa: r.parrain_wa,
    createdAt: r.created_at,
  }));
}

// ============================================================================
// 3. SESSION 12H & GESTION DES COMPTES PUBLICS
// ============================================================================

function ecrireSessionPayload<T extends Record<string, any>>(
  role: WenzeRole,
  data: T
): SessionPayload<T> {
  const maintenant = Date.now();
  const payload: SessionPayload<T> = {
    role,
    data,
    debut: maintenant,
    expire: maintenant + DUREE_SESSION_MS,
  };
  ecrire(CLE_SESSION, payload);
  ecrire(CLE_USER, {
    ...data,
    role: data?.role ?? String(role).toLowerCase(),
  });
  return payload;
}

export function demarrerSession<T extends Record<string, any> = Record<string, any>>(
  role: WenzeRole,
  data: T
): SessionPayload<T> {
  return ecrireSessionPayload(role, data);
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
    } catch {}
    return null;
  }
}

export function lireSession(): any {
  const session = verifierSession<any>();
  if (session?.data) return session.data;
  const u = lire<any>(CLE_USER, null);
  return u;
}

function ecrireSession(compte: any): void {
  if (!compte) return;
  const role: WenzeRole = compte.role || "CLIENT";
  ecrireSessionPayload(role, compte);
}

export function getCurrentUser<T extends Record<string, any> = Record<string, any>>(): T | null {
  if (!estNavigateur()) return null;
  const session = verifierSession<T>();
  const rawUser = lire<T | null>(CLE_USER, null);
  if (rawUser && typeof rawUser === "object") {
    return session?.data ? ({ ...session.data, ...rawUser } as T) : rawUser;
  }
  return session?.data ?? null;
}

export function lireComptes(): any[] {
  const l = lire<any>(CLE_ALL_USERS, []);
  return Array.isArray(l) ? l : [];
}

export function getAllUsers<T = Record<string, any>>(): T[] {
  return lireComptes() as T[];
}

export function trouverCompte(wa: any): any {
  const k = cle9(wa);
  if (!k) return null;
  const trouve = lireComptes().find(
    (u: any) => cle9(u.ownerWhatsapp || u.whatsapp || u.telephone) === k
  );
  if (trouve) return trouve;
  const s = lireSession();
  return s && cle9(s.ownerWhatsapp || s.whatsapp) === k ? s : null;
}

export function sauverCompte(compte: any): boolean {
  const k = cle9(compte.ownerWhatsapp || compte.whatsapp);
  const liste = lireComptes();
  const i = liste.findIndex(
    (u: any) => cle9(u.ownerWhatsapp || u.whatsapp || u.telephone) === k
  );
  if (i >= 0) liste[i] = { ...liste[i], ...compte };
  else liste.push(compte);
  const ok = ecrire(CLE_ALL_USERS, liste.slice(0, 500));
  const s = lireSession();
  if (s && cle9(s.ownerWhatsapp || s.whatsapp) === k) {
    ecrireSession({ ...s, ...compte });
  }
  pushCompteToSupabase(compte);
  return ok;
}

export function deconnecter(): void {
  if (!estNavigateur()) return;
  try {
    window.localStorage.removeItem(CLE_USER);
    window.localStorage.removeItem(CLE_SESSION);
  } catch {}
}

export function quitterSession(redirectTo = "/"): void {
  deconnecter();
  if (estNavigateur()) {
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

export function majCompte(champs: any): Resultat {
  const s = lireSession();
  if (!s) return echec("Non connecté", "SESSION");
  const permis = [
    "nom", "name", "nomBoutique", "nomEtablissement", "boutiqueName",
    "categorieId", "activiteId", "commune", "ville", "photo", "avatar", "email", "bio",
  ];
  const maj: any = { ...s, updatedAt: new Date().toISOString() };
  permis.forEach((k) => {
    if (champs[k] !== undefined) maj[k] = champs[k];
  });
  sauverCompte(maj);
  return { ok: true, compte: maj };
}

export async function creerCompte(d: DonneesInscription): Promise<Resultat> {
  if (!d.accepte) {
    return echec("Acceptez les règles et la politique de confidentialité", "CONSENTEMENT");
  }
  const wa = normaliserWa(d.whatsapp);
  if (!wa) {
    return echec("Numéro WhatsApp invalide (exemple : 081 234 5678 ou 097 000 0001)", "WA");
  }
  const nom = (d.nom || "").trim();
  if (nom.length < 2) return echec("Indiquez votre nom", "NOM");
  const vendeur = d.type !== "client";
  const boutique = (d.nomBoutique || "").trim();
  if (vendeur && boutique.length < 2) {
    return echec("Indiquez le nom de votre boutique ou de votre service", "BOUTIQUE");
  }
  const erreurMdp = validerMdp(d.mdp, wa);
  if (erreurMdp) return echec(erreurMdp, "MDP");
  const email = (d.email || "").trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return echec("Adresse e-mail invalide (ou laissez le champ vide)", "EMAIL");
  }
  const code = lireCode(d.code);
  if (d.code && d.code.trim() && !code) {
    return echec("Code de parrainage invalide (ou laissez le champ vide)", "CODE");
  }
  if (trouverCompte(wa)) {
    return echec("Ce numéro a déjà un compte : connectez-vous", "EXISTE");
  }

  const claims = lire<string[]>(CLE_CLAIMS, []);
  const cle = cle9(wa);
  let freemiumDeja = false;
  if (vendeur) {
    if (claims.includes(cle)) freemiumDeja = true;
    else ecrire(CLE_CLAIMS, [...claims, cle]);
  }

  const maintenant = new Date().toISOString();
  const parrainWa = normaliserWa(d.parrain) || (code && code.numero) || null;
  const compte: any = {
    id: wa,
    ownerWhatsapp: wa,
    whatsapp: wa,
    telephone: wa,
    role: d.type,
    user_type: d.type,
    origine: vendeur ? "vendeur" : "client",
    estVendeur: vendeur,
    vendeurDepuis: vendeur ? maintenant : null,
    niveau: 1,
    whatsappVerifie: false,
    emailVerifie: false,
    freemiumDeja,
    nom,
    name: nom,
    nomBoutique: vendeur ? boutique : "",
    nomEtablissement: vendeur ? boutique : nom,
    boutiqueName: vendeur ? boutique : "",
    commune: d.commune || "Gombe",
    ville: "Kinshasa",
    email,
    badge: BADGES[d.type],
    monCode: "WENZE-" + wa.slice(-6),
    codeParrainage: code && code.code ? code.code : null,
    parrainWa,
    codeVerifie: false,
    createdAt: maintenant,
    updatedAt: maintenant,
  };

  await enregistrerMdp(cle, d.mdp);
  if (!sauverCompte(compte)) {
    return echec("Stockage plein : impossible de créer le compte", "STOCKAGE");
  }
  ecrireSession(compte);

  if (parrainWa) {
    const inv = lire<any[]>(CLE_INVITES, []);
    let change = false;
    inv.forEach((i: any) => {
      if (
        cle9(i.parrainWa) === cle9(parrainWa) &&
        cle9(i.inviteWa) === cle &&
        i.status === "invité"
      ) {
        i.status = "inscrit";
        i.dateInscription = maintenant;
        change = true;
      }
    });
    if (change) ecrire(CLE_INVITES, inv);
  }
  return { ok: true, compte };
}

export async function connecter(waSaisi: any, mdp: string): Promise<Resultat> {
  const wa = normaliserWa(waSaisi);
  if (!wa) return echec("Numéro WhatsApp invalide", "WA");
  if (!mdp) return echec("Saisissez votre mot de passe", "MDP");
  const cle = cle9(wa);
  const reste = msBloque(cle);
  if (reste > 0) {
    return echec("Trop d'essais. Réessayez dans " + Math.ceil(reste / 60000) + " min", "BLOQUE");
  }
  const compte = trouverCompte(wa);
  if (!compte) return echec("Aucun compte avec ce numéro : créez-en un", "INCONNU");

  const auth = lire<any>(CLE_AUTH, {})[cle];
  let ok = false;
  if (auth) {
    ok = (await deriver(mdp, auth.sel)) === auth.hash;
  } else {
    const ancien = lire<Record<string, string>>(CLE_LEGACY_PW, {});
    const k = Object.keys(ancien).find((x) => cle9(x) === cle);
    if (k === undefined) {
      return echec("Ce compte n'a pas encore de mot de passe : créez-en un", "SANS_MDP");
    }
    ok = ancien[k] === mdp;
    if (ok) {
      await enregistrerMdp(cle, mdp);
      delete ancien[k];
      ecrire(CLE_LEGACY_PW, ancien);
    }
  }

  if (!ok) {
    noterEchec(cle);
    return echec("Mot de passe incorrect", "MDP");
  }

  effacerEchecs(cle);
  const maj = { ...compte, updatedAt: new Date().toISOString() };
  sauverCompte(maj);
  ecrireSession(maj);
  return { ok: true, compte: maj };
}

export async function definirMotDePasse(waSaisi: any, mdp: string): Promise<Resultat> {
  const wa = normaliserWa(waSaisi);
  if (!wa) return echec("Numéro WhatsApp invalide", "WA");
  const erreur = validerMdp(mdp, wa);
  if (erreur) return echec(erreur, "MDP");
  const cle = cle9(wa);
  const compte = trouverCompte(wa);
  if (!compte) return echec("Aucun compte avec ce numéro", "INCONNU");
  const legacy = lire<Record<string, string>>(CLE_LEGACY_PW, {});
  if (lire<any>(CLE_AUTH, {})[cle] || Object.keys(legacy).some((x) => cle9(x) === cle)) {
    return echec("Un mot de passe existe déjà : connectez-vous", "EXISTE");
  }
  await enregistrerMdp(cle, mdp);
  ecrireSession(compte);
  return { ok: true, compte };
}

export function ouvrirBoutique(infos: {
  nomBoutique: string;
  categorieId: string;
  activiteId: string;
  commune?: string;
}): Resultat {
  const s = lireSession();
  if (!s) return echec("Non connecté", "SESSION");
  const nom = (infos.nomBoutique || "").trim();
  if (nom.length < 2) {
    return echec("Indiquez le nom de votre boutique ou de votre service", "BOUTIQUE");
  }
  if (!infos.activiteId) return echec("Choisissez votre activité", "ACTIVITE");
  const maj = {
    ...s,
    role: s.role === "client" ? "vendeur" : s.role,
    estVendeur: true,
    vendeurDepuis: s.vendeurDepuis || new Date().toISOString(),
    nomBoutique: nom,
    nomEtablissement: nom,
    boutiqueName: nom,
    categorieId: infos.categorieId,
    activiteId: infos.activiteId,
    commune: infos.commune || s.commune || "Gombe",
    updatedAt: new Date().toISOString(),
  };
  sauverCompte(maj);
  return { ok: true, compte: maj };
  }
    export function listerInvitations(wa: any): any[] {
  const k = cle9(wa);
  const toutes = lire<any[]>(CLE_INVITES, []);
  let change = false;
  toutes.forEach((i: any) => {
    if (
      i.status === "invité" &&
      i.reservedUntil &&
      new Date(i.reservedUntil).getTime() < Date.now()
    ) {
      i.status = "expiré";
      change = true;
    }
  });
  if (change) ecrire(CLE_INVITES, toutes);
  return toutes.filter((i: any) => cle9(i.parrainWa) === k);
}

export function placesInvitation(wa: any): { total: number; utilisees: number; libres: number } {
  const liste = listerInvitations(wa);
  const valides = liste.filter((i: any) => i.status === "validé").length;
  const total = Math.min(PLACES_INVITATION_MAX, PLACES_INVITATION_BASE + valides);
  const utilisees = liste.filter(
    (i: any) => i.status === "invité" || i.status === "inscrit" || i.status === "validé"
  ).length;
  return { total, utilisees, libres: Math.max(0, total - utilisees) };
}

export function inviter(
  compte: any,
  d: { nom: string; whatsapp: string; type: "vendeur" | "client" }
): Resultat {
  if (!compte) return echec("Non connecté", "SESSION");
  const wa = normaliserWa(d.whatsapp);
  if (!wa) return echec("Numéro WhatsApp de l'invité invalide", "WA");
  const nom = (d.nom || "").trim();
  if (nom.length < 2) return echec("Indiquez le nom de l'invité", "NOM");
  const moi = normaliserWa(compte.ownerWhatsapp || compte.whatsapp);
  if (cle9(wa) === cle9(moi)) {
    return echec("Vous ne pouvez pas vous inviter vous-même", "SOI");
  }
  if (trouverCompte(wa)) return echec("Ce numéro a déjà un compte", "EXISTE");
  const toutes = lire<any[]>(CLE_INVITES, []);
  if (
    toutes.some(
      (i: any) =>
        cle9(i.inviteWa) === cle9(wa) &&
        (i.status === "invité" || i.status === "inscrit" || i.status === "validé")
    )
  ) {
    return echec("Ce numéro a déjà été invité", "DEJA");
  }
  if (placesInvitation(moi).libres <= 0) {
    return echec("Plus de place d'invitation : attendez qu'une invitation expire", "PLACES");
  }
  const maintenant = Date.now();
  const code = compte.codeAmbassadeur || compte.monCode || "WENZE-" + (moi || "").slice(-6);
  const invitation = {
    id: String(maintenant),
    parrainWa: moi,
    parrainNom: compte.nomEtablissement || compte.nom || "",
    codeParrainage: code,
    inviteWa: wa,
    inviteNom: nom,
    typeCompteInvite: d.type,
    status: "invité",
    date: new Date(maintenant).toISOString(),
    reservedUntil: new Date(maintenant + RESERVATION_MS).toISOString(),
  };
  if (!ecrire(CLE_INVITES, [...toutes, invitation])) return echec("Stockage plein", "STOCKAGE");
  const origine = estNavigateur() ? window.location.origin : "";
  const lienInscription =
    origine +
    "/inscription?invite=" +
    wa +
    "&parrain=" +
    moi +
    "&code=" +
    encodeURIComponent(code) +
    "&type=" +
    d.type;
  const message =
    "Bonjour " +
    nom +
    " ! " +
    (invitation.parrainNom || "Un ami") +
    " vous invite à créer votre compte sur WENZE WENZE BUSINESS (0% de commission). Inscription : " +
    lienInscription;
  return {
    ok: true,
    invitation,
    lien: "https://wa.me/" + wa + "?text=" + encodeURIComponent(message),
  };
}

export function niveauDe(compte: any): { niveau: number; titre: string; detail: string } {
  const n = compte && compte.niveau ? compte.niveau : 1;
  if (n >= 3) {
    return { niveau: 3, titre: "Vérifié WENZE", detail: "Numéro, e-mail et boutique contrôlés" };
  }
  if (n === 2 || (compte && compte.whatsappVerifie)) {
    return { niveau: 2, titre: "Numéro vérifié", detail: "Votre numéro WhatsApp est confirmé" };
  }
  return { niveau: 1, titre: "Inscrit", detail: "Numéro non vérifié" };
}

export function imagesGratuitesPour(type: TypeCompte): number {
  return freemiumImagesDe({ origine: type === "client" ? "client" : "vendeur", niveau: 1 });
}

export { originOf };

// ============================================================================
// 4. RÈGLE D'ACCÈS, RÔLES, PROPRIÉTÉ & QUOTAS DE PUBLICATION
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
  } catch {}
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
        return {
          ok: false,
          msg: `Ticket ${ticketId} introuvable`,
          code: "TICKET_NOT_FOUND",
          ab,
          count: myCount,
        };
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
    } catch {}
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
