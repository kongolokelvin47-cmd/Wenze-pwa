// WENZE - GESTION DES LIENS SUPERVISEUR <-> AMBASSADEUR
export type LienWenze = {
  codeSuperviseur: string; // Ex: SUP-GOM-2026-014
  nomSuperviseur: string;
  quartier: string;
  codeAmbassadeur: string; // Ex: AMB-MIR-2026-087
  nomAmbassadeur: string;
  creePar: string; // "DG" ou "AMBASSADEUR"
  dateLien: string;
  statut: "ACTIF" | "EN_ATTENTE_DG";
};

// Exemple de liens déjà existants - Après, ça viendra de ton tableau DG
export const LIENS_EXEMPLE: LienWenze[] = [
  {
    codeSuperviseur: "SUP-GOM-2026-014",
    nomSuperviseur: "Superviseur Gombe",
    quartier: "Gombe • Lemba",
    codeAmbassadeur: "AMB-MIR-2026-087",
    nomAmbassadeur: "Mireille T.",
    creePar: "AMBASSADEUR David I.",
    dateLien: "Il y a 10 jours",
    statut: "ACTIF",
  },
  {
    codeSuperviseur: "SUP-GOM-2026-014",
    nomSuperviseur: "Superviseur Gombe",
    quartier: "Gombe • Lemba",
    codeAmbassadeur: "AMB-DAV-2026-045",
    nomAmbassadeur: "David I.",
    creePar: "DG",
    dateLien: "Il y a 15 jours",
    statut: "ACTIF",
  },
  {
    codeSuperviseur: "SUP-GOM-2026-014",
    nomSuperviseur: "Superviseur Gombe",
    quartier: "Gombe • Lemba",
    codeAmbassadeur: "AMB-GRA-2026-099",
    nomAmbassadeur: "Grace M.",
    creePar: "DG",
    dateLien: "Hier",
    statut: "EN_ATTENTE_DG",
  },
];

export function getAmbassadeursDuSuperviseur(codeSup: string) {
  return LIENS_EXEMPLE.filter(l => l.codeSuperviseur === codeSup);
}

export function getSuperviseurDeAmbassadeur(codeAmb: string) {
  return LIENS_EXEMPLE.find(l => l.codeAmbassadeur === codeAmb);
  }
