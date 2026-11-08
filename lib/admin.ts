// lib/admin.ts - Espace privé WENZE : DG, superviseurs, ambassadeurs.
//
// Principes :
// - Le moindre privilège : chaque rôle n'a que les permissions de la matrice ci-dessous.
// - Chaque fonction qui modifie quelque chose re-vérifie le rôle de la personne connectée :
//   l'interface n'est jamais la seule barrière.
// - Toute action sensible est écrite dans un journal d'audit.
//
// ATTENTION : en mode local, ces données vivent dans le téléphone et n'importe qui peut les modifier.
// Ce module sert de maquette fidèle. La vraie sécurité (rôles, double authentification du DG,
// journal non modifiable) sera appliquée côté serveur : voir supabase/001_espace_prive.sql.

import { lireSession, sauverCompte, trouverCompte, lireComptes, cle9, normaliserWa } from "./comptes";
import { readList, writeList } from "./paiement-base";

export type RoleStaff = "dg" | "superviseur" | "ambassadeur";

export type Permission =
  | "stats_globales"
  | "voir_comptes"
  | "moderer_comptes"
  | "voir_journal"
  | "gerer_superviseurs"
  | "gerer_ambassadeurs"
  | "voir_equipe"
  | "voir_filleuls";

export const LIBELLES_ROLE: Record<RoleStaff, string> = {
  dg: "Directeur général",
  superviseur: "Superviseur",
  ambassadeur: "Ambassadeur"
};

/** Matrice des permissions (moindre privilège). */
const MATRICE: Record<RoleStaff, Permission[]> = {
  dg: ["stats_globales", "voir_comptes", "moderer_comptes", "voir_journal", "gerer_superviseurs", "gerer_ambassadeurs", "voir_equipe", "voir_filleuls"],
  superviseur: ["gerer_ambassadeurs", "voir_equipe", "voir_filleuls"],
  ambassadeur: ["voir_filleuls"]
};

export function peut(role: RoleStaff | null | undefined, p: Permission): boolean {
  return !!role && MATRICE[role].includes(p);
}

/** Récompense de l'ambassadeur (proposition de la politique v1.3, à valider). */
export const REGLES_AMBASSADEUR = { palier: "STANDARD", jours: 3, plafondMensuel: 20 };

const K_STAFF = "wenze_staff";
const K_AUDIT = "wenze_audit";
const MAX_AUDIT = 500;

export interface EntreeStaff {
  id: string;
  wa: string;
  nom: string;
  role: RoleStaff;
  actif: boolean;
  superviseurWa: string | null;
  code: string | null;
  creePar: string;
  creeLe: string;
  suspenduLe?: string | null;
  motif?: string;
}

export interface EntreeAudit {
  id: string;
  date: string;
  acteurWa: string;
  acteurNom: string;
  role: string;
  action: string;
  cible: string;
  details: string;
}

export type Res<T> = { ok: true; data: T } | { ok: false; erreur: string; code: string };
const echec = (erreur: string, code: string): { ok: false; erreur: string; code: string } => ({ ok: false, erreur, code });

// ========== Équipe et rôle courant ==========
export function lireStaff(): EntreeStaff[] {
  return readList(K_STAFF) as EntreeStaff[];
}

export interface Acteur {
  compte: any;
  wa: string;
  nom: string;
  role: RoleStaff | null;
  entree: EntreeStaff | null;
}

/** Personne connectée et son rôle dans l'équipe (null si elle n'en fait pas partie). */
export function acteurCourant(): Acteur | null {
  const s = lireSession();
  if (!s) return null;
  const wa = normaliserWa(s.ownerWhatsapp || s.whatsapp) || String(s.ownerWhatsapp || s.whatsapp || "");
  const entree = lireStaff().find((e) => e.actif && cle9(e.wa) === cle9(wa)) || null;
  return { compte: s, wa, nom: s.nomEtablissement || s.nom || wa, role: entree ? entree.role : null, entree };
}

export function dgExiste(): boolean {
  return lireStaff().some((e) => e.actif && e.role === "dg");
}

// ========== Journal d'audit ==========
function journaliser(a: Acteur, action: string, cible: string, details: string = ""): void {
  const l = readList(K_AUDIT) as EntreeAudit[];
  l.push({
    id: "AUD-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    date: new Date().toISOString(),
    acteurWa: a.wa,
    acteurNom: a.nom,
    role: a.role || "—",
    action,
    cible,
    details
  });
  writeList(K_AUDIT, l.slice(-MAX_AUDIT));
}

export function lireJournal(limite: number = 100): EntreeAudit[] {
  const a = acteurCourant();
  if (!a || !peut(a.role, "voir_journal")) return [];
  return (readList(K_AUDIT) as EntreeAudit[]).slice(-limite).reverse();
}

// ========== Initialisation et gestion de l'équipe ==========
/** Premier démarrage : la personne connectée devient DG si aucun DG n'existe. */
export function devenirDG(): Res<EntreeStaff> {
  const a = acteurCourant();
  if (!a) return echec("Connectez-vous d'abord", "SESSION");
  if (dgExiste()) return echec("Un directeur général existe déjà", "EXISTE");
  const e: EntreeStaff = {
    id: "STF-" + Date.now().toString(36),
    wa: a.wa,
    nom: a.nom,
    role: "dg",
    actif: true,
    superviseurWa: null,
    code: null,
    creePar: a.wa,
    creeLe: new Date().toISOString()
  };
  if (!writeList(K_STAFF, [...lireStaff(), e])) return echec("Stockage plein", "STOCKAGE");
  journaliser({ ...a, role: "dg" }, "initialisation_dg", a.wa, "Premier démarrage de l'espace privé");
  return { ok: true, data: e };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genererCode(): string {
  const pris = new Set<string>();
  lireStaff().forEach((e) => e.code && pris.add(e.code));
  lireComptes().forEach((c: any) => c.monCode && pris.add(String(c.monCode)));
  for (let t = 0; t < 30; t++) {
    let s = "AMB-";
    for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (!pris.has(s)) return s;
  }
  return "AMB-" + Date.now().toString(36).toUpperCase().slice(-6);
}

/** Ajoute un superviseur (DG) ou un ambassadeur (DG ou superviseur). La personne doit déjà avoir un compte. */
export function ajouterStaff(d: { wa: string; role: "superviseur" | "ambassadeur"; superviseurWa?: string }): Res<EntreeStaff> {
  const a = acteurCourant();
  if (!a || !a.role) return echec("Accès réservé à l'équipe", "ACCES");
  const permis = d.role === "superviseur" ? peut(a.role, "gerer_superviseurs") : peut(a.role, "gerer_ambassadeurs");
  if (!permis) return echec("Vous n'avez pas le droit d'ajouter ce rôle", "ACCES");

  const wa = normaliserWa(d.wa);
  if (!wa) return echec("Numéro WhatsApp invalide. Exemple : 081 234 5678", "NUMERO");
  if (cle9(wa) === cle9(a.wa)) return echec("Vous ne pouvez pas vous ajouter vous-même", "SOI");
  const cible = trouverCompte(wa);
  if (!cible) return echec("Ce numéro n'a pas de compte : la personne doit d'abord s'inscrire", "INCONNU");
  if (lireStaff().some((e) => e.actif && cle9(e.wa) === cle9(wa))) return echec("Cette personne fait déjà partie de l'équipe", "EXISTE");

  let superviseurWa: string | null = null;
  if (d.role === "ambassadeur") {
    if (a.role === "superviseur") superviseurWa = a.wa;
    else if (d.superviseurWa) {
      const sup = lireStaff().find((e) => e.actif && e.role === "superviseur" && cle9(e.wa) === cle9(d.superviseurWa));
      if (!sup) return echec("Superviseur introuvable", "SUPERVISEUR");
      superviseurWa = sup.wa;
    }
  }

  const code = d.role === "ambassadeur" ? genererCode() : null;
  const e: EntreeStaff = {
    id: "STF-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
    wa,
    nom: cible.nomEtablissement || cible.nom || wa,
    role: d.role,
    actif: true,
    superviseurWa,
    code,
    creePar: a.wa,
    creeLe: new Date().toISOString()
  };
  if (!writeList(K_STAFF, [...lireStaff(), e])) return echec("Stockage plein", "STOCKAGE");
  if (code) sauverCompte({ ...cible, codeAmbassadeur: code });
  journaliser(a, "ajout_" + d.role, wa, code ? "Code " + code : "");
  return { ok: true, data: e };
}

/** Équipe visible : le DG voit tout, le superviseur voit ses ambassadeurs. */
export function listerEquipe(): EntreeStaff[] {
  const a = acteurCourant();
  if (!a || !a.role) return [];
  const tous = lireStaff();
  if (a.role === "dg") return tous;
  if (a.role === "superviseur") return tous.filter((e) => e.role === "ambassadeur" && e.superviseurWa && cle9(e.superviseurWa) === cle9(a.wa));
  return [];
}

/** Suspend ou réactive un membre : le DG gère tout sauf les DG ; le superviseur gère ses ambassadeurs. */
export function changerStatutStaff(id: string, actif: boolean, motif: string = ""): Res<EntreeStaff> {
  const a = acteurCourant();
  if (!a || !a.role) return echec("Accès réservé à l'équipe", "ACCES");
  const tous = lireStaff();
  const i = tous.findIndex((e) => e.id === id);
  if (i < 0) return echec("Membre introuvable", "INCONNU");
  const e = tous[i];
  if (e.role === "dg") return echec("Un directeur général ne peut pas être suspendu ici", "ACCES");
  const droit = a.role === "dg" || (a.role === "superviseur" && e.role === "ambassadeur" && !!e.superviseurWa && cle9(e.superviseurWa) === cle9(a.wa));
  if (!droit) return echec("Vous n'avez pas le droit de modifier ce membre", "ACCES");
  if (!actif && motif.trim().length < 3) return echec("Indiquez un motif de suspension", "MOTIF");

  tous[i] = { ...e, actif, suspenduLe: actif ? null : new Date().toISOString(), motif: actif ? "" : motif.trim() };
  writeList(K_STAFF, tous);
  journaliser(a, actif ? "reactivation_" + e.role : "suspension_" + e.role, e.wa, actif ? "" : motif.trim());
  return { ok: true, data: tous[i] };
}

// ========== Modération des comptes (DG) ==========
export function suspendreCompte(wa: string, motif: string): Res<any> {
  const a = acteurCourant();
  if (!a || !peut(a.role, "moderer_comptes")) return echec("Accès réservé au directeur général", "ACCES");
  if (motif.trim().length < 3) return echec("Indiquez un motif", "MOTIF");
  const c = trouverCompte(wa);
  if (!c) return echec("Compte introuvable", "INCONNU");
  if (cle9(c.ownerWhatsapp || c.whatsapp) === cle9(a.wa)) return echec("Vous ne pouvez pas suspendre votre propre compte", "SOI");
  if (lireStaff().some((e) => e.actif && e.role === "dg" && cle9(e.wa) === cle9(wa))) return echec("Ce compte appartient à un directeur général", "ACCES");
  const maj = { ...c, suspendu: true, suspenduLe: new Date().toISOString(), suspenduMotif: motif.trim() };
  sauverCompte(maj);
  journaliser(a, "suspension_compte", String(wa), motif.trim());
  return { ok: true, data: maj };
}

export function reactiverCompte(wa: string): Res<any> {
  const a = acteurCourant();
  if (!a || !peut(a.role, "moderer_comptes")) return echec("Accès réservé au directeur général", "ACCES");
  const c = trouverCompte(wa);
  if (!c) return echec("Compte introuvable", "INCONNU");
  const maj = { ...c, suspendu: false, suspenduLe: null, suspenduMotif: "" };
  sauverCompte(maj);
  journaliser(a, "reactivation_compte", String(wa), "");
  return { ok: true, data: maj };
    }
    
