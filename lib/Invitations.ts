// lib/invitations.ts - Façade des invitations.
//
// Plusieurs pages (profil, espace privé) importent ce module. La logique réelle (places, expiration à 48 h,
// refus des doublons et des auto-invitations) est dans lib/comptes.ts : ce fichier ne fait que l'exposer
// sous les noms attendus par ces pages.

import { lireSession, listerInvitations, inviter, cle9 } from "./comptes";
import { readList, writeList } from "./paiement-base";

const K_INVITES = "wenze_invitations";

/** Marque comme expirées les invitations en attente dont la réservation de 48 h est terminée. */
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

/** Toutes les invitations enregistrées sur cet appareil (usage administratif). */
export function getAllInvitations(): any[] {
  cleanupExpired();
  return readList(K_INVITES);
}

/** Invitations envoyées par la personne connectée. */
export function getMyInvitations(): any[] {
  const s = lireSession();
  return s ? listerInvitations(s.ownerWhatsapp || s.whatsapp) : [];
}

/**
 * Crée une invitation pour la personne connectée.
 * Lance une erreur avec un message clair si l'invitation est refusée (numéro invalide, déjà invité, plus de place…).
 */
export function createInvitation(whatsapp: string, nom: string, type: "vendeur" | "client" = "client"): { inv: any; link: string; waLink: string } {
  const s = lireSession();
  const r = inviter(s, { nom, whatsapp, type });
  if (!r.ok) throw new Error(r.erreur || "Invitation impossible");
  const inv = r.invitation || {};
  return { inv: { ...inv, token: inv.codeParrainage || inv.id }, link: r.lien || "", waLink: r.lien || "" };
}

export interface StatsInvitations {
  total: number;
  enAttente: number;
  inscrits: number;
  valides: number;
  expirees: number;
}

export function getInvitationStats(): StatsInvitations {
  const l = getAllInvitations();
  const compte = (statut: string) => l.filter((i: any) => i.status === statut).length;
  return { total: l.length, enAttente: compte("invité"), inscrits: compte("inscrit"), valides: compte("validé"), expirees: compte("expiré") };
}

/** Annule une invitation envoyée par la personne connectée. */
export function revokeInvitation(id: string): boolean {
  const s = lireSession();
  if (!s) return false;
  const l = readList(K_INVITES);
  const i = l.findIndex((x: any) => String(x.id) === String(id) && cle9(x.parrainWa) === cle9(s.ownerWhatsapp || s.whatsapp));
  if (i < 0 || l[i].status !== "invité") return false;
  l[i] = { ...l[i], status: "expiré" };
  return writeList(K_INVITES, l);
}

// Noms alternatifs utilisés par certaines pages
export const listInvitations = getAllInvitations;
export const listAllInvitations = getAllInvitations;
export const getInvitations = getAllInvitations;
