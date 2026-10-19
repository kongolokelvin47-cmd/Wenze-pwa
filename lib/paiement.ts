// lib/paiement.ts - MODÈLE ÉCONOMIQUE OFFICIEL WENZE WENZE BUSINESS
export const TAUX_CDF = 2300; // BCC 2 265,67 officiel / 2 327,89 parallèle - arrondi 2300
export const toCDF = (usd: number) => usd * TAUX_CDF;
export const toUSD = (cdf: number) => Math.round(cdf / TAUX_CDF);

export const FORMULES = {
  CLIENT: { 
    prixUSD: 0, prixCDF: 0, nom: "Client / Acheteur", duree: "À vie", 
    limite: "Recherche + Contact + Peut vendre occasionnellement si paiement 3$ avant lancement" 
  },
  FREEMIUM: { 
    prixUSD: 0, prixCDF: 0, nom: "Vendeur Freemium", duree: "À vie", 
    limite: "3 annonces à vie max, non rendu après suppression. Retour auto si non-paiement Pro" 
  },
  PRO: { 
    prixUSD: 5, prixCDF: 11500, nom: "Vendeur Pro / Petits services", 
    professions: ["Vendeur boutique","Mécanicien","Salon coiffure","Électricien","Plombier","Autres services"], 
    duree: "1 mois", 
    limite: "Illimité + Messagerie + CRM + Stats base. Pub payante séparée. Paiement=activation immédiate. Non-paiement=retour Freemium" 
  },
  GROSSISTE: { 
    prixUSD: 25, prixCDF: 57500, nom: "Grossiste / Grande échelle", 
    professions: ["Grossiste / Dépôt B2B","Agriculteur","Entreprise","Grande échelle"], 
    duree: "1 mois", 
    limite: "Illimité + Devis B2B + Sous-comptes plafonnés + B2B avancé. Même règle paiement/non-paiement" 
  },
} as const;

export const PUBS = {
  BOOST_IMAGE: { prixUSD: 2, prixCDF: 4600, jours: 5, limite: "1 image + 1 annonce + 1 emplacement carrousel" },
  OCCASIONNEL: { prixUSD: 3, prixCDF: 6900, jours: 5, limite: "1 annonce / 1 produit pour Client occasionnel - Paiement avant lancement" },
  VIDEO_EXPRESS: { prixUSD: 1, prixCDF: 2300, jours: 2, limite: "1 vidéo max 60s" },
  VIDEO_STANDARD: { prixUSD: 3, prixCDF: 6900, jours: 6, limite: "1 vidéo max 60s" },
  VIDEO_MENSUELLE: { prixUSD: 15, prixCDF: 34500, jours: 30, limite: "1 vidéo max 60s" },
} as const;

export const COMMUNES_KIN = [
  "Gombe","Lingwala","Kinshasa","Barumbu","Bandala","Ngaliema","Kintambo",
  "Mont Ngafula","Bumbu","Makala","Selembao","Ngaba","Lemba","Matete",
  "Kisenso","Masina","Ndjili","Kimbanseke","Nsele","Maluku","Limete",
  "Ngiri-Ngiri","Kasa-Vubu"
] as const;

export type TypeFormule = keyof typeof FORMULES;
export type TypePub = keyof typeof PUBS;

// Logique paiement WENZE - 0% commission
export const handlePaiement = (type: TypeFormule | TypePub, devise: "$" | "CDF" = "$") => {
  let prixUSD = 0, prixCDF = 0, nom = "";
  
  if (type in FORMULES) {
    const f = FORMULES[type as TypeFormule];
    prixUSD = f.prixUSD; prixCDF = f.prixCDF; nom = f.nom;
  } else {
    const p = PUBS[type as TypePub];
    prixUSD = p.prixUSD; prixCDF = p.prixCDF; nom = type;
  }

  const now = Date.now();
  const dureeJours = type === "PRO" || type === "GROSSISTE" ? 30 : (PUBS as any)[type]?.jours || 30;
  const expire = now + dureeJours * 24 * 60 * 60 * 1000;

  const paiement = {
    type, nom, prixUSD, prixCDF, devise,
    date: new Date().toISOString(),
    expire,
    actif: true,
    taux: TAUX_CDF,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("paiement_reussi", "true");
    localStorage.setItem("type_paye", type);
    localStorage.setItem("abonnement_expire", String(expire));
    localStorage.setItem("dernier_paiement", JSON.stringify(paiement));
    localStorage.setItem("est_pro", String(type === "PRO" || type === "GROSSISTE"));
    
    // Gestion Freemium -> Pro
    if (type === "PRO" || type === "GROSSISTE") {
      localStorage.setItem("limite_annonces", "illimite");
    }
  }

  return paiement;
};

export const verifierAbonnement = (): { actif: boolean; formule: string | null; expireDans: number } => {
  if (typeof window === "undefined") return { actif: false, formule: null, expireDans: 0 };
  const expire = localStorage.getItem("abonnement_expire");
  const formule = localStorage.getItem("type_paye");
  if (!expire) return { actif: false, formule: null, expireDans: 0 };
  const expireNum = Number(expire);
  return {
    actif: Date.now() < expireNum,
    formule,
    expireDans: Math.max(0, Math.ceil((expireNum - Date.now()) / (24*60*60*1000))),
  };
};

export const checkFreemiumLimit = (): { peutPublier: boolean; annoncesRestantes: number } => {
  if (typeof window === "undefined") return { peutPublier: true, annoncesRestantes: 3 };
  const abonnement = verifierAbonnement();
  if (abonnement.actif) return { peutPublier: true, annoncesRestantes: 999 };
  
  const annoncesPubliees = Number(localStorage.getItem("annonces_publiees") || "0");
  return {
    peutPublier: annoncesPubliees < 3,
    annoncesRestantes: Math.max(0, 3 - annoncesPubliees),
  };
};
