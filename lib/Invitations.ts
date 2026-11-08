// lib/invitations.ts - VERSION CORRIGÉE WENZE - 243 + DG-PRIVE
// Façade des invitations. Logique réelle dans lib/comptes.ts

import { lireSession, listerInvitations, inviter, cle9 } from "./comptes";
import { readList, writeList } from "./paiement-base";

const K_INVITES = "wenze_invitations";
const DOMAINE = "https://wenze.cd"; // <-- Change en localhost:3000 en test

/** Normalise TOUJOURS en 243. 082... -> 24382..., 243... -> 243... */
export function cleanWa(wa: string = ""): string {
  let c = String(wa).replace(/[^0-9]/g, "");
  if (c.startsWith("0")) c = "243" + c.slice(1);
  if (c.startsWith("243")) return c;
  if (c.length === 9) return "243" + c;
  return c;
}

/** Marque comme expirées les invitations en attente dont la réservation de 48h est terminée. */
export function cleanupExpired(): number {
  const l = readList(K_INVITES);
  let n = 0;
  l.forEach((i: any) => {
    if (i.status === "invité" && i.reservedUntil && new Date(i.reservedUntil).getTime() < Date.now()) {
      i.status = "expiré";
      n++;
    }
  });
  if (n > 0) writeList(K_INVITES, l);
  return n;
}

/** Toutes les invitations - DG + SUPERVISEUR SEULEMENT. */
export function getAllInvitations(): any[] {
  cleanupExpired();
  const s: any = lireSession();
  // Sécurité : si ce n'est pas DG / Superviseur, on ne montre que les siennes
  if (s && (s.roleAdmin === "dg" || s.roleAdmin === "superviseur")) {
    return readList(K_INVITES);
  }
  return getMyInvitations();
}

/** Invitations envoyées par la personne connectée. */
export function getMyInvitations(): any[] {
  const s: any = lireSession();
  if (!s) return [];
  return listerInvitations(cleanWa(s.ownerWhatsapp || s.whatsapp));
}

/**
 * Crée une invitation pour la personne connectée.
 * type: "vendeur" = Boutique, "client" = Client, "ambassadeur" = Ambassadeur
 */
export function createInvitation(
  whatsapp: string,
  nom: string,
  type: "vendeur" | "client" | "ambassadeur" = "client"
): { inv: any; link: string; waLink: string; message: string } {
  const s: any = lireSession();
  if (!s) throw new Error("Tu dois être connecté pour inviter.");

  const numeroPropre = cleanWa(whatsapp);
  if (numeroPropre === cleanWa(s.ownerWhatsapp || s.whatsapp)) {
    throw new Error("Tu ne peux pas t'inviter toi-même.");
  }
  if (numeroPropre.length !== 12 || !numeroPropre.startsWith("243")) {
    throw new Error("Numéro invalide. Utilise le format 243XXXXXXXXX (ex: 243825888889).");
  }

  // On passe le type ambassadeur à comptes.ts si il gère "vendeur" seulement, on mappe
  const typePourComptes: any = type === "ambassadeur" ? "vendeur" : type;
  const r: any = inviter(s, { nom: nom.trim(), whatsapp: numeroPropre, type: typePourComptes });
  if (!r.ok) throw new Error(r.erreur || "Invitation impossible");

  const inv = r.invitation || {};
  const code = inv.codeParrainage || inv.id;
  // Lien public à partager partout
  const link = r.lien || `${DOMAINE}/invitation/${code}`;
  // Vrai lien WhatsApp avec message pré-rempli
  const message = `Salut ${nom} 👋, ${s.nomEtablissement || s.nom || "Wenze"} t'invite sur WENZE Business.\nInscris-toi ici, c'est gratuit : ${link}\nCode : ${code}`;
  const waLink = `https://wa.me/${numeroPropre}?text=${encodeURIComponent(message)}`;

  return {
    inv: { ...inv, token: code, whatsapp: numeroPropre, link },
    link,
    waLink,
    message,
  };
}

export interface StatsInvitations {
  total: number;
  enAttente: number;
  inscrits: number;
  valides: number;
  expirees: number;
  annulees: number;
}

export function getInvitationStats(): StatsInvitations {
  const l = getAllInvitations();
  const compte = (statut: string) => l.filter((i: any) => i.status === statut).length;
  return {
    total: l.length,
    enAttente: compte("invité"),
    inscrits: compte("inscrit"),
    valides: compte("validé"),
    expirees: compte("expiré"),
    annulees: compte("annulé"),
  };
}

/** Annule une invitation. DG peut annuler tout, les autres seulement les leurs. */
export function revokeInvitation(id: string): boolean {
  const s: any = lireSession();
  if (!s) return false;
  const monWa = cleanWa(s.ownerWhatsapp || s.whatsapp);
  const estDG = s.roleAdmin === "dg" || s.roleAdmin === "superviseur";

  const l = readList(K_INVITES);
  const i = l.findIndex((x: any) => {
    const memeId = String(x.id) === String(id) || String(x.codeParrainage) === String(id);
    const cestMoi = cle9(x.parrainWa) === cle9(monWa);
    return memeId && (estDG || cestMoi);
  });
  if (i < 0 || l[i].status !== "invité") return false;
  l[i] = { ...l[i], status: "annulé", annuleLe: new Date().toISOString(), annulePar: monWa };
  return writeList(K_INVITES, l);
}

// Noms alternatifs utilisés par certaines pages
export const listInvitations = getAllInvitations;
export const listAllInvitations = getAllInvitations;
export const getInvitations = getAllInvitations;
