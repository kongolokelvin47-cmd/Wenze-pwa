// lib/constants.ts - V6 FINAL STRICT MULTI-TICKETS - TONMARCHÉ.CD
// BCC officiel 2 265,67 / parallèle 2 327,89 - Arrondi 2300 fixe - Source unique TAUX
// Règle V6: Même prix pour tous - Tickets stricts cumulables - 1 ticket = X places sur Y jours (pas X/j)

export const TAUX_CDF = 2300; // BCC 2 265,67 officiel / 2 327,89 parallèle - arrondi 2300
export const toCDF = (usd:number) => Math.round(usd * TAUX_CDF);
export const toUSD = (cdf:number) => Math.round(cdf / TAUX_CDF);
export const toCDFString = (usd:number) => toCDF(usd).toLocaleString("fr-FR")+" CDF";

// ========== FORMULES V6 - COMPAT ANCIEN CODE MAIS ALIGNÉ V6 ==========
export const FORMULES = {
  CLIENT: { 
    prixUSD: 0, prixCDF: 0, 
    nom: "Client / Acheteur", 
    duree: "À vie", 
    limite: "Recherche + Contact + Peut vendre occasionnellement avec ticket 0.2$/j cumulable",
    badge: "👤"
  },
  FREEMIUM: { 
    prixUSD: 0, prixCDF: 0, 
    nom: "Vendeur Freemium Découverte", 
    duree: "30j puis caché", 
    limite: "3 images à vie strictes - Visible 30j puis compte caché filtré - Suppression libère place V6 - Max 50 actives global",
    maxImages: 3,
    badge: "🆓"
  },
  // V6: PRO 5$ ancien = STANDARD 5$ nouveau - Même prix pour tous
  PRO: { 
    prixUSD: 5, prixCDF: 11500, 
    nom: "STANDARD - Vente Flash V6", 
    professions: ["Vendeur boutique","Services","Détails","Gros","Presta"], 
    duree: "1j/7j/30j strict", 
    limite: "STANDARD 1-4 places strictes sur 1j/7j/30j (pas 4/j) + 1 vidéo 15s - Cumulable, renouvelable, suppression libère place - Max 50",
    imagesMax: 4,
    badge: "⭐",
    palierId: "STANDARD" as const
  },
  STANDARD: { 
    prixUSD: 5, prixCDF: 11500, 
    nom: "STANDARD - Vente Flash V6", 
    duree: "1j/7j/30j strict", 
    limite: "1-4 places strictes sur 1j/7j/30j - 1 vidéo 15s - Cumulable",
    imagesMax: 4,
    badge: "⭐"
  },
  // GROSSISTE 25$ ancien = PREMIUM 20$ nouveau - Prix unifié
  GROSSISTE: { 
    prixUSD: 20, prixCDF: 46000, 
    nom: "PREMIUM - Gros Vendeur V6 (ex-GROSSISTE 25$)", 
    professions: ["Grossiste / Dépôt B2B","Agriculteur","Entreprise","Grande échelle"], 
    duree: "1j/7j/30j strict", 
    limite: "PREMIUM 11-30 places strictes sur 1j/7j/30j + 2 vidéos 60s - Cumulable, renouvelable - Même prix que détails",
    imagesMax: 30,
    badge: "👑",
    palierId: "PREMIUM" as const
  },
  PREMIUM: { 
    prixUSD: 20, prixCDF: 46000, 
    nom: "PREMIUM - Gros Vendeur", 
    duree: "1j/7j/30j strict", 
    limite: "11-30 places strictes",
    imagesMax: 30,
    badge: "👑"
  },
  PRO_PLUS: {
    prixUSD: 10, prixCDF: 23000,
    nom: "PRO - Boutique Active V6",
    duree: "1j/7j/30j strict",
    limite: "5-10 places strictes sur 1j/7j/30j + 1 vidéo 60s - Cumulable",
    imagesMax: 10,
    badge: "🚀",
    palierId: "PRO" as const
  }
};

// ========== PUBS V6 - ANCIEN BOOST_IMAGE 2$ etc => NOUVEAU TICKETS STRICTS ==========
export const PUBS = {
  // Compat ancien: BOOST_IMAGE 2$ => STANDARD 7j 2.5$
  BOOST_IMAGE: { 
    prixUSD: 2.5, prixCDF: 5750, 
    nom: "Ticket STANDARD 7j V6 (ex-BOOST_IMAGE 2$)", 
    duree: "7j strict", 
    limite: "STANDARD 4 places strictes sur 7j (pas 4/j) - 1 vidéo 15s - Cumulable - Suppression libère place",
    imagesMax: 4,
    jours: 7,
    badge: "⭐"
  },
  OCCASIONNEL: { 
    prixUSD: 0.2, prixCDF: 460, 
    nom: "Ticket Occasionnel Client V6 (ex-OCCASIONNEL 3$)", 
    duree: "1j strict", 
    limite: "1 place stricte sur 1j - Cumulable avec tickets pub - 1$/7j aussi dispo - Anti-spam - Suppression libère",
    imagesMax: 1,
    jours: 1,
    badge: "🎟️"
  },
  VIDEO_EXPRESS: { 
    prixUSD: 0.5, prixCDF: 1150, 
    nom: "STANDARD 1j V6 (ex-VIDEO_EXPRESS 1$)", 
    duree: "1j strict", 
    limite: "STANDARD 4 places strictes sur 1j + 1 vidéo 15s",
    imagesMax: 4,
    jours: 1,
    badge: "⭐"
  },
  VIDEO_STANDARD: { 
    prixUSD: 5, prixCDF: 11500, 
    nom: "PRO 7j V6 (ex-VIDEO_STANDARD 3$)", 
    duree: "7j strict", 
    limite: "PRO 10 places strictes sur 7j + 1 vidéo 60s",
    imagesMax: 10,
    jours: 7,
    badge: "🚀"
  },
  VIDEO_MENSUELLE: { 
    prixUSD: 20, prixCDF: 46000, 
    nom: "PREMIUM 30j V6 (ex-VIDEO_MENSUELLE 15$)", 
    duree: "30j strict", 
    limite: "PREMIUM 30 places strictes sur 30j + 2 vidéos 60s - Meilleur prix",
    imagesMax: 30,
    jours: 30,
    badge: "👑"
  },
  // V6 NOUVEAUX TICKETS EXPLICITES
  STANDARD_1J: { prixUSD: 0.5, prixCDF: 1150, nom: "STANDARD 1j", jours: 1, imagesMax: 4, limite: "4 places strictes sur 1j - Même principe que 7j/30j" },
  STANDARD_7J: { prixUSD: 2.5, prixCDF: 5750, nom: "STANDARD 7j", jours: 7, imagesMax: 4, limite: "4 places strictes sur 7j - 1/j jusqu'à 4" },
  STANDARD_30J: { prixUSD: 5, prixCDF: 11500, nom: "STANDARD 30j", jours: 30, imagesMax: 4, limite: "4 places strictes sur 30j" },
  PRO_7J: { prixUSD: 5, prixCDF: 11500, nom: "PRO 7j", jours: 7, imagesMax: 10 },
  PREMIUM_30J: { prixUSD: 20, prixCDF: 46000, nom: "PREMIUM 30j", jours: 30, imagesMax: 30 },
};

// Pour compat ancien code qui importe COMMISS_KTN etc
export const COMMISS_KTN = "Gombe - Kinshasa - Taux BCC 2265,67 / Parallèle 2327,89 - Arrondi 2300 - 0% commission - On vend visibilité, pas produits - V6 Tickets stricts cumulables - 1 ticket = X places sur Y jours (pas X/j) - Max 50 actives";

export const MESSAGE_REGIME_V6 = "🆓 FREEMIUM 3 images à vie strictes 30j puis caché filtré - ⭐ STANDARD 5$/30j 1-4 places strictes sur 1j/7j/30j + 1 vidéo 15s - 🚀 PRO 10$/30j 5-10 places strictes + 1 vidéo 60s - 👑 PREMIUM 20$/30j 11-30 places + 2 vidéos 60s - 📦 OCC 0.2$/j ticket strict cumulable - Cumulable, renouvelable, suppression libère place - Max 50 - Taux 2300 - 0% comm";

// Export pour remplacer ancien getPrix etc
export const getPrixByFormule = (formuleId: string) => {
  const f = (FORMULES as any)[formuleId] || FORMULES.PRO;
  return { prixUSD: f.prixUSD, prixCDF: f.prixCDF, nom: f.nom, limite: f.limite };
};
