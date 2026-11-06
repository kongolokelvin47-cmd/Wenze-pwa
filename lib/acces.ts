// lib/acces.ts - Règle d'accès : tout le monde peut regarder, mais agir demande un compte.
//
// Contacter un vendeur, ajouter au panier, publier, acheter un abonnement ou un boost :
// un visiteur sans compte est dirigé vers la connexion, qui lui propose de créer un compte gratuit.

import { lireSession, cheminSur } from "./comptes";

/** Vrai si un compte est connecté sur ce téléphone. */
export function estConnecte(): boolean {
  return !!lireSession();
}

/** Adresse de la page de connexion, avec retour automatique vers la page d'origine. */
export function versConnexion(next?: string): string {
  return "/connexion?raison=action&next=" + encodeURIComponent(cheminSur(next));
}

/**
 * À appeler avant toute action réservée aux membres.
 * Renvoie true si l'action peut continuer ; sinon redirige vers la connexion et renvoie false.
 */
export function exigerCompte(router: { push: (url: string) => void }, next?: string): boolean {
  if (estConnecte()) return true;
  router.push(versConnexion(next));
  return false;
}
