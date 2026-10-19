export const TAUX_CDF = 2300; // BCC 2 265,67 officiel / 2 327,89 parallèle - arrondi 2300
export const toCDF = (usd:number) => usd * TAUX_CDF;

export const FORMULES = {
  CLIENT: { prixUSD: 0, prixCDF: 0, nom: "Client / Acheteur", duree: "À vie", limite: "Recherche + Contact + Peut vendre occasionnellement si paiement 3$ avant lancement" },
  FREEMIUM: { prixUSD: 0, prixCDF: 0, nom: "Vendeur Freemium", duree: "À vie", limite: "3 annonces à vie max, non rendu après suppression. Retour auto si non-paiement Pro" },
  PRO: { prixUSD: 5, prixCDF: 11500, nom: "Vendeur Pro / Petits services", professions: ["Vendeur boutique","Mécanicien","Salon coiffure","Électricien","Plombier","Autres services"], duree: "1 mois", limite: "Illimité + Messagerie + CRM + Stats base. Pub payante séparée. Paiement=activation immédiate. Non-paiement=retour Freemium" },
  GROSSISTE: { prixUSD: 25, prixCDF: 57500, nom: "Grossiste / Grande échelle", professions: ["Grossiste / Dépôt B2B","Agriculteur","Entreprise","Grande échelle"], duree: "1 mois", limite: "Illimité + Devis B2B + Sous-comptes plafonnés + B2B avancé. Même règle paiement/non-paiement" },
};

export const PUBS = {
  BOOST_IMAGE: { prixUSD: 2, prixCDF: 4600, jours: 5, limite: "1 image + 1 annonce + 1 emplacement carrousel" },
  OCCASIONNEL: { prixUSD: 3, prixCDF: 6900, jours: 5, limite: "1 annonce / 1 produit pour Client occasionnel - Paiement avant lancement" },
  VIDEO_EXPRESS: { prixUSD: 1, prixCDF: 2300, jours: 2, limite: "1 vidéo max 60s" },
  VIDEO_STANDARD: { prixUSD: 3, prixCDF: 6900, jours: 6, limite: "1 vidéo max 60s" },
  VIDEO_MENSUELLE: { prixUSD: 15, prixCDF: 34500, jours: 30, limite: "1 vidéo max 60s" },
};

export const COMMUNES_KIN = ["Gombe","Lingwala","Kinshasa","Barumbu","Bandala","Ngaliema","Kintambo","Mont Ngafula","Bumbu","Makala","Selembao","Ngaba","Lemba","Matete","Kisenso","Masina","Ndjili","Kimbanseke","Nsele","Maluku","Limete","Ngiri-Ngiri","Kasa-Vubu"];
