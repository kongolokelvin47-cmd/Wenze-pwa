// lib/paiement.ts - MODÈLE ÉCONOMIQUE OFFICIEL WENZE WENZE BUSINESS
export const TAUX_CDF = 2300;
export const toCDF = (usd: number) => usd * TAUX_CDF;
export const toUSD = (cdf: number) => Math.round(cdf / TAUX_CDF);

export const FORMULES = {
  // minuscule pour app/page.tsx et app/publier/page.tsx
  client: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Client / Acheteur", duree: "À vie", limite: "Recherche + Contact + Peut vendre si paiement 3$ avant lancement" },
  freemium: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Vendeur Freemium", duree: "À vie", limite: "3 annonces à vie max" },
  pro: { prix: 5, prixUSD: 5, prixCDF: 11500, nom: "Vendeur Pro", duree: "1 mois", limite: "Illimité + CRM + IA", professions: ["Vendeur boutique","Mécanicien","Coiffure","Électricien","Plombier"] },
  grossiste: { prix: 25, prixUSD: 25, prixCDF: 57500, nom: "Grossiste / Grande échelle", duree: "1 mois", limite: "Illimité + B2B + Sous-comptes" },
  occasionnel: { prix: 3, prixUSD: 3, prixCDF: 6900, nom: "Publication Occasionnelle", duree: "5 jours", limite: "1 annonce pour Client occasionnel" },
  
  // MAJUSCULE pour compatibilité avec ton ancien code
  CLIENT: { prixUSD: 0, prixCDF: 0, prix: 0, nom: "Client / Acheteur", duree: "À vie", limite: "" } as any,
  FREEMIUM: { prixUSD: 0, prixCDF: 0, prix: 0, nom: "Vendeur Freemium", duree: "À vie", limite: "" } as any,
  PRO: { prixUSD: 5, prixCDF: 11500, prix: 5, nom: "Vendeur Pro", duree: "1 mois", limite: "" } as any,
  GROSSISTE: { prixUSD: 25, prixCDF: 57500, prix: 25, nom: "Grossiste", duree: "1 mois", limite: "" } as any,
} as any;

export const PUBS = {
  boost_image: { prix: 2, prixUSD: 2, prixCDF: 4600, jours: 5, nom: "Boost Image", limite: "1 image + carrousel" },
  occasionnel: { prix: 3, prixUSD: 3, prixCDF: 6900, jours: 5, nom: "Occasionnel", limite: "1 annonce Client" },
  video_express: { prix: 1, prixUSD: 1, prixCDF: 2300, jours: 2, nom: "Vidéo Express 60s", limite: "1 vidéo 60s" },
  video_standard: { prix: 3, prixUSD: 3, prixCDF: 6900, jours: 6, nom: "Vidéo Standard 60s", limite: "1 vidéo 60s" },
  video_mensuelle: { prix: 15, prixUSD: 15, prixCDF: 34500, jours: 30, nom: "Vidéo Mensuelle 60s", limite: "1 vidéo 60s" },
  // MAJUSCULE aussi
  BOOST_IMAGE: { prixUSD: 2, prixCDF: 4600, prix: 2, jours: 5, limite: "" } as any,
  OCCASIONNEL: { prixUSD: 3, prixCDF: 6900, prix: 3, jours: 5, limite: "" } as any,
  VIDEO_EXPRESS: { prixUSD: 1, prixCDF: 2300, prix: 1, jours: 2, limite: "" } as any,
  VIDEO_STANDARD: { prixUSD: 3, prixCDF: 6900, prix: 3, jours: 6, limite: "" } as any,
  VIDEO_MENSUELLE: { prixUSD: 15, prixCDF: 34500, prix: 15, jours: 30, limite: "" } as any,
} as any;

export const COMMUNES_KIN = ["Gombe","Lingwala","Kinshasa","Barumbu","Bandala","Ngaliema","Kintambo","Mont Ngafula","Bumbu","Makala","Selembao","Ngaba","Lemba","Matete","Kisenso","Masina","Ndjili","Kimbanseke","Nsele","Maluku","Limete","Ngiri-Ngiri","Kasa-Vubu"] as const;

export type TypeFormule = keyof typeof FORMULES;
export type TypePub = keyof typeof PUBS;

export const handlePaiement = (type: TypeFormule | TypePub, devise: "$" | "CDF" = "$") => {
  const key = String(type).toLowerCase();
  let prixUSD = 0, prixCDF = 0, nom = "", dureeJours = 30;

  const f = (FORMULES as any)[key] || (FORMULES as any)[type] || (PUBS as any)[key] || (PUBS as any)[type];
  if (f) {
    prixUSD = f.prixUSD ?? f.prix ?? 0;
    prixCDF = f.prixCDF ?? (prixUSD * TAUX_CDF);
    nom = f.nom ?? String(type);
    dureeJours = f.jours ?? (key === "pro" || key === "grossiste" ? 30 : 30);
  }

  const now = Date.now();
  const expire = now + dureeJours * 24 * 60 * 60 * 1000;

  const paiement = { type, nom, prixUSD, prixCDF, prix: prixUSD, devise, date: new Date().toISOString(), expire, actif: true, taux: TAUX_CDF };

  if (typeof window !== "undefined") {
    localStorage.setItem("paiement_reussi", "true");
    localStorage.setItem("type_paye", String(type));
    localStorage.setItem("abonnement_expire", String(expire));
    localStorage.setItem("dernier_paiement", JSON.stringify(paiement));
    localStorage.setItem("est_pro", String(key === "pro" || key === "grossiste" || type === "PRO" || type === "GROSSISTE"));
    if (key === "pro" || key === "grossiste") localStorage.setItem("limite_annonces", "illimite");
  }
  return paiement;
};

export const verifierAbonnement = () => {
  if (typeof window === "undefined") return { actif: false, formule: null, expireDans: 0 };
  const expire = localStorage.getItem("abonnement_expire");
  const formule = localStorage.getItem("type_paye");
  if (!expire) return { actif: false, formule: null, expireDans: 0 };
  const expireNum = Number(expire);
  return { actif: Date.now() < expireNum, formule, expireDans: Math.max(0, Math.ceil((expireNum - Date.now()) / 86400000)) };
};

export const checkFreemiumLimit = () => {
  if (typeof window === "undefined") return { peutPublier: true, annoncesRestantes: 3 };
  const ab = verifierAbonnement();
  if (ab.actif) return { peutPublier: true, annoncesRestantes: 999 };
  const annoncesPubliees = Number(localStorage.getItem("wenze_annonces") || localStorage.getItem("annonces_publiees") || "0");
  return { peutPublier: annoncesPubliees < 3, annoncesRestantes: Math.max(0, 3 - annoncesPubliees) };
};
