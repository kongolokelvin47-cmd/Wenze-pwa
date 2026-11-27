import { TAUX_CDF, toCDFString, usd } from "@/lib/paiement-base";

export type CodePlanEconomique =
  | "GRATUIT_VISITEUR"
  | "VENTE_OCCASIONNELLE"
  | "PUBLICITE_STANDARD"
  | "PUBLICITE_PREMIUM"
  | "ABONNEMENT_BOUTIQUE_ESSENTIEL"
  | "ABONNEMENT_BOUTIQUE_PRO"
  | "ABONNEMENT_PRESTATAIRE"
  | "ABONNEMENT_GROSSISTE";

export interface DroitMediaPolitiqueEconomique {
  codePlan: CodePlanEconomique;
  libellePlan: string;
  tarifUsd: number;
  tarifAffiche: string;
  maxPhotosR2: number;
  videoAutorisee: boolean;
  palierStream: "aucun" | "15s_30vues" | "30s_50vues";
  dureeMaxSec: 0 | 15 | 30;
  vuesMax: 0 | 30 | 50;
  commissionVentePct: 0;
}

/**
 * Table de correspondance stricte issue de la politique économique Wenze Wenze.
 * Ajuste les montants tarifUsd si tu les importes directement depuis lib/paiement-base.ts.
 */
export const POLITIQUE_MEDIAS_PAR_PLAN: Record<
  CodePlanEconomique,
  Omit<DroitMediaPolitiqueEconomique, "tarifAffiche">
> = {
  GRATUIT_VISITEUR: {
    codePlan: "GRATUIT_VISITEUR",
    libellePlan: "Compte gratuit (consultation)",
    tarifUsd: 0,
    maxPhotosR2: 0,
    videoAutorisee: false,
    palierStream: "aucun",
    dureeMaxSec: 0,
    vuesMax: 0,
    commissionVentePct: 0,
  },
  VENTE_OCCASIONNELLE: {
    codePlan: "VENTE_OCCASIONNELLE",
    libellePlan: "Forfait Vente Occasionnelle",
    tarifUsd: 2,
    maxPhotosR2: 3,
    videoAutorisee: true,
    palierStream: "15s_30vues",
    dureeMaxSec: 15,
    vuesMax: 30,
    commissionVentePct: 0,
  },
  PUBLICITE_STANDARD: {
    codePlan: "PUBLICITE_STANDARD",
    libellePlan: "Forfait Publicité Standard (15s / 30 vues)",
    tarifUsd: 5,
    maxPhotosR2: 4,
    videoAutorisee: true,
    palierStream: "15s_30vues",
    dureeMaxSec: 15,
    vuesMax: 30,
    commissionVentePct: 0,
  },
  PUBLICITE_PREMIUM: {
    codePlan: "PUBLICITE_PREMIUM",
    libellePlan: "Forfait Publicité Premium (30s / 50 vues)",
    tarifUsd: 10,
    maxPhotosR2: 6,
    videoAutorisee: true,
    palierStream: "30s_50vues",
    dureeMaxSec: 30,
    vuesMax: 50,
    commissionVentePct: 0,
  },
  ABONNEMENT_BOUTIQUE_ESSENTIEL: {
    codePlan: "ABONNEMENT_BOUTIQUE_ESSENTIEL",
    libellePlan: "Abonnement Boutique Essentiel",
    tarifUsd: 10,
    maxPhotosR2: 5,
    videoAutorisee: true,
    palierStream: "15s_30vues",
    dureeMaxSec: 15,
    vuesMax: 30,
    commissionVentePct: 0,
  },
  ABONNEMENT_BOUTIQUE_PRO: {
    codePlan: "ABONNEMENT_BOUTIQUE_PRO",
    libellePlan: "Abonnement Boutique Pro",
    tarifUsd: 25,
    maxPhotosR2: 10,
    videoAutorisee: true,
    palierStream: "30s_50vues",
    dureeMaxSec: 30,
    vuesMax: 50,
    commissionVentePct: 0,
  },
  ABONNEMENT_PRESTATAIRE: {
    codePlan: "ABONNEMENT_PRESTATAIRE",
    libellePlan: "Abonnement Prestataire",
    tarifUsd: 15,
    maxPhotosR2: 6,
    videoAutorisee: true,
    palierStream: "15s_30vues",
    dureeMaxSec: 15,
    vuesMax: 30,
    commissionVentePct: 0,
  },
  ABONNEMENT_GROSSISTE: {
    codePlan: "ABONNEMENT_GROSSISTE",
    libellePlan: "Abonnement Grossiste",
    tarifUsd: 35,
    maxPhotosR2: 12,
    videoAutorisee: true,
    palierStream: "30s_50vues",
    dureeMaxSec: 30,
    vuesMax: 50,
    commissionVentePct: 0,
  },
};

export function obtenirDroitsMediasSelonPolitique(
  codePlan: CodePlanEconomique,
  tauxCdfPersonnalise?: number
): DroitMediaPolitiqueEconomique {
  const regle =
    POLITIQUE_MEDIAS_PAR_PLAN[codePlan] ||
    POLITIQUE_MEDIAS_PAR_PLAN.GRATUIT_VISITEUR;

  const taux = tauxCdfPersonnalise || TAUX_CDF;
  const montantCdf = Math.round(regle.tarifUsd * taux).toLocaleString("fr-FR");

  return {
    ...regle,
    tarifAffiche:
      regle.tarifUsd > 0
        ? `${usd(regle.tarifUsd)} (${toCDFString(regle.tarifUsd)} • ${montantCdf} FC)`
        : "Gratuit",
  };
}
    
