// lib/comptes.ts - Comptes WENZE : inscription, connexion, ouverture de boutique, invitations.
//
// ATTENTION : tout est stocké dans le localStorage du téléphone. Les mots de passe sont hachés (PBKDF2),
// mais n'importe qui ayant le téléphone en main peut modifier ses propres données. La vraie sécurité
// (vérification du numéro, mots de passe, niveaux, parrainage) viendra avec Supabase.

import { originOf, freemiumImagesDe } from "./paiement-base";

const K_SESSION = "wenze_user";
const K_USERS = "wenze_all_users";
const K_AUTH = "wenze_auth";
const K_LEGACY_PW = "wenze_passwords";
const K_CLAIMS = "wenze_freemium_claims";
const K_INVITES = "wenze_invitations";
const K_FAILS = "wenze_login_fails";

export const MDP_MIN = 6;
export const PLACES_INVITATION_BASE = 5;
export const PLACES_INVITATION_MAX = 20;
const RESERVATION_MS = 48 * 3600 * 1000;
const ITERATIONS = 100000;
const MAX_ECHECS = 5;
const BLOCAGE_MS = 5 * 60 * 1000;

export const COMMUNES = [
  "Bandalungwa", "Barumbu", "Bumbu", "Gombe", "Kalamu", "Kasa-Vubu", "Kimbanseke", "Kinshasa", "Kintambo", "Kisenso", "Lemba", "Limete",
  "Lingwala", "Makala", "Maluku", "Masina", "Matete", "Mont-Ngafula", "Ndjili", "Ngaba", "Ngaliema", "Ngiri-Ngiri", "Nsele", "Selembao"
];

export type TypeCompte = "client" | "vendeur" | "prestataire" | "grossiste";

export interface Resultat {
  ok: boolean;
  erreur?: string;
  code?: string;
  compte?: any;
  invitation?: any;
  lien?: string;
}

const echec = (erreur: string, code?: string): Resultat => ({ ok: false, erreur, code });

// ========== Stockage ==========
function lire<T>(key: string, defaut: T): T {
  try {
    if (typeof window === "undefined") return defaut;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : defaut;
  } catch {
    return defaut;
  }
}

function ecrire(key: string, value: any): boolean {
  try {
    if (typeof window === "undefined") return false;
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ========== Numéros WhatsApp ==========
/** Forme officielle : 243 + 9 chiffres (numéros mobiles congolais commençant par 8 ou 9), ou null. */
export function normaliserWa(input: any): string | null {
  let d = (input === null || input === undefined ? "" : String(input)).replace(/[^0-9]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("243")) d = d.slice(3);
  d = d.replace(/^0+/, "");
  return /^[89][0-9]{8}$/.test(d) ? "243" + d : null;
}

/** Clé de comparaison : 9 derniers chiffres, identique pour 0970000001, 970000001 et +243970000001. */
export function cle9(wa: any): string {
  const d = (wa === null || wa === undefined ? "" : String(wa)).replace(/[^0-9]/g, "");
  return d.length >= 7 ? d.slice(-9) : "";
}

// ========== Comptes et session ==========
export function lireSession(): any {
  return lire<any>(K_SESSION, null);
}

function ecrireSession(compte: any): void {
  ecrire(K_SESSION, compte);
}

export function lireComptes(): any[] {
  const l = lire<any>(K_USERS, []);
  return Array.isArray(l) ? l : [];
}

export function trouverCompte(wa: any): any {
  const k = cle9(wa);
  if (!k) return null;
  const trouve = lireComptes().find((u: any) => cle9(u.ownerWhatsapp || u.whatsapp || u.telephone) === k);
  if (trouve) return trouve;
  const s = lireSession();
  return s && cle9(s.ownerWhatsapp || s.whatsapp) === k ? s : null;
}

/** Enregistre le compte dans la liste et met la session à jour s'il s'agit du compte connecté. */
export function sauverCompte(compte: any): boolean {
  const k = cle9(compte.ownerWhatsapp || compte.whatsapp);
  const liste = lireComptes();
  const i = liste.findIndex((u: any) => cle9(u.ownerWhatsapp || u.whatsapp || u.telephone) === k);
  if (i >= 0) liste[i] = { ...liste[i], ...compte };
  else liste.push(compte);
  const ok = ecrire(K_USERS, liste.slice(0, 500));
  const s = lireSession();
  if (s && cle9(s.ownerWhatsapp || s.whatsapp) === k) ecrireSession({ ...s, ...compte });
  return ok;
}

export function deconnecter(): void {
  try {
    if (typeof window !== "undefined") localStorage.removeItem(K_SESSION);
  } catch {}
}

/** Champs que l'utilisateur peut modifier lui-même. L'origine, le niveau et le rôle ne sont jamais modifiables ici. */
export function majCompte(champs: any): Resultat {
  const s = lireSession();
  if (!s) return echec("Non connecté", "SESSION");
  const permis = ["nom", "name", "nomBoutique", "nomEtablissement", "boutiqueName", "categorieId", "activiteId", "commune", "ville", "photo", "avatar", "email", "bio"];
  const maj: any = { ...s, updatedAt: new Date().toISOString() };
  permis.forEach((k) => {
    if (champs[k] !== undefined) maj[k] = champs[k];
  });
  sauverCompte(maj);
  return { ok: true, compte: maj };
}

// ========== Mots de passe ==========
function versHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function depuisHex(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

async function deriver(mdp: string, selHex: string): Promise<string> {
  const subtle = typeof globalThis !== "undefined" && (globalThis as any).crypto ? (globalThis as any).crypto.subtle : null;
  if (!subtle) throw new Error("Ce navigateur ne permet pas de protéger le mot de passe : mettez-le à jour.");
  const cle = await subtle.importKey("raw", new TextEncoder().encode(mdp), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: depuisHex(selHex) as any, iterations: ITERATIONS }, cle, 256);
  return versHex(new Uint8Array(bits));
}

async function enregistrerMdp(cle: string, mdp: string): Promise<void> {
  const sel = versHex((globalThis as any).crypto.getRandomValues(new Uint8Array(16)));
  const auth = lire<any>(K_AUTH, {});
  auth[cle] = { sel, hash: await deriver(mdp, sel) };
  ecrire(K_AUTH, auth);
}

export function validerMdp(mdp: string, wa?: string): string {
  if (!mdp || mdp.length < MDP_MIN) return "Mot de passe : " + MDP_MIN + " caractères minimum";
  if (wa && cle9(mdp) && cle9(mdp) === cle9(wa)) return "Le mot de passe ne doit pas être votre numéro";
  return "";
}

function msBloque(cle: string): number {
  const f = lire<any>(K_FAILS, {})[cle];
  return f && f.until ? Math.max(0, f.until - Date.now()) : 0;
}

function noterEchec(cle: string): void {
  const tous = lire<any>(K_FAILS, {});
  const f = tous[cle] || { n: 0, until: 0 };
  f.n = (f.until && f.until < Date.now() ? 0 : f.n) + 1;
  if (f.n >= MAX_ECHECS) {
    f.until = Date.now() + BLOCAGE_MS;
    f.n = 0;
  }
  tous[cle] = f;
  ecrire(K_FAILS, tous);
}

function effacerEchecs(cle: string): void {
  const tous = lire<any>(K_FAILS, {});
  delete tous[cle];
  ecrire(K_FAILS, tous);
}

// ========== Parrainage ==========
/** Un code de parrainage ou ambassadeur est soit un numéro WhatsApp, soit un code de 4 à 20 caractères. */
export function lireCode(brut: any): { numero?: string; code?: string } | null {
  const v = (brut || "").toString().trim().toUpperCase();
  if (!v) return null;
  const wa = normaliserWa(v);
  if (wa) return { numero: wa };
  return /^[A-Z0-9][A-Z0-9-]{3,19}$/.test(v) ? { code: v } : null;
}

// ========== Inscription ==========
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

const BADGES: Record<TypeCompte, string> = { client: "🛒", vendeur: "🛍️", prestataire: "🔧", grossiste: "🏭" };

export async function creerCompte(d: DonneesInscription): Promise<Resultat> {
  if (!d.accepte) return echec("Acceptez les règles et la politique de confidentialité", "CONSENTEMENT");
  const wa = normaliserWa(d.whatsapp);
  if (!wa) return echec("Numéro WhatsApp invalide (exemple : 081 234 5678 ou 097 000 0001)", "WA");
  const nom = (d.nom || "").trim();
  if (nom.length < 2) return echec("Indiquez votre nom", "NOM");
  const vendeur = d.type !== "client";
  const boutique = (d.nomBoutique || "").trim();
  if (vendeur && boutique.length < 2) return echec("Indiquez le nom de votre boutique ou de votre service", "BOUTIQUE");
  const erreurMdp = validerMdp(d.mdp, wa);
  if (erreurMdp) return echec(erreurMdp, "MDP");
  const email = (d.email || "").trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return echec("Adresse e-mail invalide (ou laissez le champ vide)", "EMAIL");
  const code = lireCode(d.code);
  if (d.code && d.code.trim() && !code) return echec("Code de parrainage invalide (ou laissez le champ vide)", "CODE");
  if (trouverCompte(wa)) return echec("Ce numéro a déjà un compte : connectez-vous", "EXISTE");

  // Un seul freemium par numéro, même si le compte est recréé
  const claims = lire<string[]>(K_CLAIMS, []);
  const cle = cle9(wa);
  let freemiumDeja = false;
  if (vendeur) {
    if (claims.includes(cle)) freemiumDeja = true;
    else ecrire(K_CLAIMS, [...claims, cle]);
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
    updatedAt: maintenant
  };

  await enregistrerMdp(cle, d.mdp);
  if (!sauverCompte(compte)) return echec("Stockage plein : impossible de créer le compte", "STOCKAGE");
  ecrireSession(compte);

  // Si ce téléphone contient l'invitation correspondante, elle passe à « inscrit »
  if (parrainWa) {
    const inv = lire<any[]>(K_INVITES, []);
    let change = false;
    inv.forEach((i: any) => {
      if (cle9(i.parrainWa) === cle9(parrainWa) && cle9(i.inviteWa) === cle && i.status === "invité") {
        i.status = "inscrit";
        i.dateInscription = maintenant;
        change = true;
      }
    });
    if (change) ecrire(K_INVITES, inv);
  }
  return { ok: true, compte };
}

// ========== Connexion ==========
export async function connecter(waSaisi: any, mdp: string): Promise<Resultat> {
  const wa = normaliserWa(waSaisi);
  if (!wa) return echec("Numéro WhatsApp invalide", "WA");
  if (!mdp) return echec("Saisissez votre mot de passe", "MDP");
  const cle = cle9(wa);
  const reste = msBloque(cle);
  if (reste > 0) return echec("Trop d'essais. Réessayez dans " + Math.ceil(reste / 60000) + " min", "BLOQUE");
  const compte = trouverCompte(wa);
  if (!compte) return echec("Aucun compte avec ce numéro : créez-en un", "INCONNU");

  const auth = lire<any>(K_AUTH, {})[cle];
  let ok = false;
  if (auth) {
    ok = (await deriver(mdp, auth.sel)) === auth.hash;
  } else {
    // Anciens comptes : mot de passe en clair, converti en empreinte à la première connexion réussie
    const ancien = lire<Record<string, string>>(K_LEGACY_PW, {});
    const k = Object.keys(ancien).find((x) => cle9(x) === cle);
    if (k === undefined) return echec("Ce compte n'a pas encore de mot de passe : créez-en un", "SANS_MDP");
    ok = ancien[k] === mdp;
    if (ok) {
      await enregistrerMdp(cle, mdp);
      delete ancien[k];
      ecrire(K_LEGACY_PW, ancien);
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

/** Création du mot de passe d'un ancien compte qui n'en avait pas. */
export async function definirMotDePasse(waSaisi: any, mdp: string): Promise<Resultat> {
  const wa = normaliserWa(waSaisi);
  if (!wa) return echec("Numéro WhatsApp invalide", "WA");
  const erreur = validerMdp(mdp, wa);
  if (erreur) return echec(erreur, "MDP");
  const cle = cle9(wa);
  const compte = trouverCompte(wa);
  if (!compte) return echec("Aucun compte avec ce numéro", "INCONNU");
  const legacy = lire<Record<string, string>>(K_LEGACY_PW, {});
  if (lire<any>(K_AUTH, {})[cle] || Object.keys(legacy).some((x) => cle9(x) === cle)) return echec("Un mot de passe existe déjà : connectez-vous", "EXISTE");
  await enregistrerMdp(cle, mdp);
  ecrireSession(compte);
  return { ok: true, compte };
}

// ========== Client qui ouvre une boutique ==========
/** Le client devient vendeur, sans période gratuite : l'origine du compte ne change pas. */
export function ouvrirBoutique(infos: { nomBoutique: string; categorieId: string; activiteId: string; commune?: string }): Resultat {
  const s = lireSession();
  if (!s) return echec("Non connecté", "SESSION");
  const nom = (infos.nomBoutique || "").trim();
  if (nom.length < 2) return echec("Indiquez le nom de votre boutique ou de votre service", "BOUTIQUE");
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
    updatedAt: new Date().toISOString()
  };
  sauverCompte(maj);
  return { ok: true, compte: maj };
}

// ========== Invitations par numéro WhatsApp ==========
export function listerInvitations(wa: any): any[] {
  const k = cle9(wa);
  const toutes = lire<any[]>(K_INVITES, []);
  let change = false;
  toutes.forEach((i: any) => {
    if (i.status === "invité" && i.reservedUntil && new Date(i.reservedUntil).getTime() < Date.now()) {
      i.status = "expiré";
      change = true;
    }
  });
  if (change) ecrire(K_INVITES, toutes);
  return toutes.filter((i: any) => cle9(i.parrainWa) === k);
}

export function placesInvitation(wa: any): { total: number; utilisees: number; libres: number } {
  const liste = listerInvitations(wa);
  const valides = liste.filter((i: any) => i.status === "validé").length;
  const total = Math.min(PLACES_INVITATION_MAX, PLACES_INVITATION_BASE + valides);
  const utilisees = liste.filter((i: any) => i.status === "invité" || i.status === "inscrit" || i.status === "validé").length;
  return { total, utilisees, libres: Math.max(0, total - utilisees) };
}

/** Réserve une place 48 h et prépare le message WhatsApp que l'invitant enverra lui-même. */
export function inviter(compte: any, d: { nom: string; whatsapp: string; type: "vendeur" | "client" }): Resultat {
  if (!compte) return echec("Non connecté", "SESSION");
  const wa = normaliserWa(d.whatsapp);
  if (!wa) return echec("Numéro WhatsApp de l'invité invalide", "WA");
  const nom = (d.nom || "").trim();
  if (nom.length < 2) return echec("Indiquez le nom de l'invité", "NOM");
  const moi = normaliserWa(compte.ownerWhatsapp || compte.whatsapp);
  if (cle9(wa) === cle9(moi)) return echec("Vous ne pouvez pas vous inviter vous-même", "SOI");
  if (trouverCompte(wa)) return echec("Ce numéro a déjà un compte", "EXISTE");
  const toutes = lire<any[]>(K_INVITES, []);
  if (toutes.some((i: any) => cle9(i.inviteWa) === cle9(wa) && (i.status === "invité" || i.status === "inscrit" || i.status === "validé"))) {
    return echec("Ce numéro a déjà été invité", "DEJA");
  }
  if (placesInvitation(moi).libres <= 0) return echec("Plus de place d'invitation : attendez qu'une invitation expire", "PLACES");

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
    reservedUntil: new Date(maintenant + RESERVATION_MS).toISOString()
  };
  if (!ecrire(K_INVITES, [...toutes, invitation])) return echec("Stockage plein", "STOCKAGE");

  const origine = typeof window !== "undefined" ? window.location.origin : "";
  const lienInscription = origine + "/inscription?invite=" + wa + "&parrain=" + moi + "&code=" + encodeURIComponent(code) + "&type=" + d.type;
  const message = "Bonjour " + nom + " ! " + (invitation.parrainNom || "Un ami") + " vous invite à créer votre compte sur WENZE WENZE BUSINESS (0% de commission). Inscription : " + lienInscription;
  return { ok: true, invitation, lien: "https://wa.me/" + wa + "?text=" + encodeURIComponent(message) };
}

// ========== Divers ==========
/** N'accepte que les chemins internes du site (évite les redirections vers un autre site). */
export function cheminSur(next: any): string {
  const v = (next || "").toString();
  return v.startsWith("/") && !v.startsWith("//") && !v.includes(":") && !v.includes("\\") ? v : "/";
}

export function niveauDe(compte: any): { niveau: number; titre: string; detail: string } {
  const n = compte && compte.niveau ? compte.niveau : 1;
  if (n >= 3) return { niveau: 3, titre: "Vérifié WENZE", detail: "Numéro, e-mail et boutique contrôlés" };
  if (n === 2 || (compte && compte.whatsappVerifie)) return { niveau: 2, titre: "Numéro vérifié", detail: "Votre numéro WhatsApp est confirmé" };
  return { niveau: 1, titre: "Inscrit", detail: "Numéro non vérifié" };
}

/** Images gratuites auxquelles un type de compte aurait droit à l'inscription. */
export function imagesGratuitesPour(type: TypeCompte): number {
  return freemiumImagesDe({ origine: type === "client" ? "client" : "vendeur", niveau: 1 });
}

export { originOf };
        
