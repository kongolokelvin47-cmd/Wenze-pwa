export type ProfilActeurCarte =
  | "boutique"
  | "prestataire"
  | "grossiste"
  | "client"
  | "DG"
  | "SUPERVISEUR"
  | "AMBASSADEUR";

export type StatutConsentementClient = "en_attente" | "accepte" | "refuse";

export interface ContexteAccesCarte {
  profil: ProfilActeurCarte;
  abonnementActif?: boolean;
  dateExpirationAbonnement?: string | null;
  venteOccasionnelleActive?: boolean;
  abonnementPubliciteActif?: boolean;
  consentementClient?: StatutConsentementClient;
}

export interface DroitCarteWenze {
  carteActive: boolean;
  partageTempsReelActif: boolean;
  suiviLivraisonActif: boolean;
  accesPubliciteGeoActif: boolean;
  motifBlocage?: string;
}

/**
 * Vérifie si un abonnement est payé et non expiré.
 * Dès que dateExpiration <= maintenant, retourne false (coupure automatique).
 */
export function estAbonnementValide(
  abonnementActif?: boolean,
  dateExpiration?: string | null
): boolean {
  if (!abonnementActif) return false;
  if (!dateExpiration) return true;
  const exp = new Date(dateExpiration).getTime();
  if (Number.isNaN(exp)) return false;
  return exp > Date.now();
}

/**
 * Évalue les permissions complètes d'accès à la carte Leaflet + OSM :
 * - DG, Superviseur, Ambassadeur : actif dans leurs dashboards
 * - Boutique, Prestataire, Grossiste : actif uniquement tant que l'abonnement est valide
 * - Client : actif uniquement si partage accepté ou via vente occasionnelle / abonnement publicitaire
 */
export function evaluerDroitsCarte(ctx: ContexteAccesCarte): DroitCarteWenze {
  // 1. Dashboards internes (DG, Superviseur, Ambassadeur)
  if (
    ctx.profil === "DG" ||
    ctx.profil === "SUPERVISEUR" ||
    ctx.profil === "AMBASSADEUR"
  ) {
    return {
      carteActive: true,
      partageTempsReelActif: true,
      suiviLivraisonActif: true,
      accesPubliciteGeoActif: true,
    };
  }

  // 2. Boutique, Prestataire, Grossiste : soumis à l'abonnement actif
  if (
    ctx.profil === "boutique" ||
    ctx.profil === "prestataire" ||
    ctx.profil === "grossiste"
  ) {
    const valide = estAbonnementValide(
      ctx.abonnementActif,
      ctx.dateExpirationAbonnement
    );

    if (!valide) {
      return {
        carteActive: false,
        partageTempsReelActif: false,
        suiviLivraisonActif: false,
        accesPubliciteGeoActif: false,
        motifBlocage:
          "Votre abonnement est terminé ou inactif : la carte interactive, le partage de position en temps réel et le suivi de livraison sont automatiquement coupés.",
      };
    }

    return {
      carteActive: true,
      partageTempsReelActif: true,
      suiviLivraisonActif: true,
      accesPubliciteGeoActif: true,
    };
  }

  // 3. Client : acceptation du partage ou vente occasionnelle / abonnement publicitaire
  const aDroitExceptionnel = Boolean(
    ctx.venteOccasionnelleActive || ctx.abonnementPubliciteActif
  );
  const aAcceptePartage = ctx.consentementClient === "accepte";

  if (!aDroitExceptionnel && !aAcceptePartage) {
    return {
      carteActive: false,
      partageTempsReelActif: false,
      suiviLivraisonActif: false,
      accesPubliciteGeoActif: true,
      motifBlocage:
        ctx.consentementClient === "refuse"
          ? "Vous avez refusé le partage de position."
          : "Acceptez le partage de position ou souscrivez à une vente occasionnelle / abonnement publicitaire pour accéder à la carte en direct.",
    };
  }

  return {
    carteActive: true,
    partageTempsReelActif: aAcceptePartage,
    suiviLivraisonActif: aAcceptePartage || aDroitExceptionnel,
    accesPubliciteGeoActif: true,
  };
}
