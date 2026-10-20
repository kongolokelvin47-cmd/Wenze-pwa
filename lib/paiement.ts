// lib/paiement.ts - MODÈLE ÉCONOMIQUE OFFICIEL WENZE BUSINESS - 100% PARFAIT
export const TAUX_CDF = 2300;
export const toCDF = (usd: number) => usd * TAUX_CDF;
export const toUSD = (cdf: number) => Math.round(cdf / TAUX_CDF);

export const FORMULES = {
  // minuscule - utilisé par app/page.tsx, publier, inscription, connexion
  client: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Client / Acheteur", duree: "À vie", limite: "Recherche illimitée + Contact vendeur + Vente occasionnelle 3$ / 6900 CDF par annonce", annonces: 0 },
  freemium: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Vendeur Freemium", duree: "À vie", limite: "3 annonces à vie max", annonces: 3 },
  pro: { prix: 5, prixUSD: 5, prixCDF: 11500, nom: "Vendeur Pro", duree: "1 mois", limite: "Illimité + CRM + IA + Boost", annonces: 9999, professions: ["Vendeur boutique","Mécanicien","Salon de coiffure","Électricien","Plombier","Menuisier","Tailleur","Photographe","Restaurateur","Autres petits services"] },
  grossiste: { prix: 25, prixUSD: 25, prixCDF: 57500, nom: "Grossiste / Grande échelle", duree: "1 mois", limite: "Illimité + B2B + Sous-comptes + IA", annonces: 9999, professions: ["Grossiste / Dépôt B2B","Agriculteur","Entreprise","Grande échelle / Usine"] },
  occasionnel: { prix: 3, prixUSD: 3, prixCDF: 6900, nom: "Publication Occasionnelle", duree: "5 jours", limite: "1 annonce pour Client perso", annonces: 1 },
  
  // MAJUSCULE pour compatibilité ancien code
  CLIENT: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Client / Acheteur", duree: "À vie", limite: "Recherche + Contact", annonces: 0 } as any,
  FREEMIUM: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Vendeur Freemium", duree: "À vie", limite: "3 annonces", annonces: 3 } as any,
  PRO: { prix: 5, prixUSD: 5, prixCDF: 11500, nom: "Vendeur Pro", duree: "1 mois", limite: "Illimité + CRM + IA", annonces: 9999 } as any,
  GROSSISTE: { prix: 25, prixUSD: 25, prixCDF: 57500, nom: "Grossiste", duree: "1 mois", limite: "Illimité + B2B", annonces: 9999 } as any,
  OCCASIONNEL: { prix: 3, prixUSD: 3, prixCDF: 6900, nom: "Occasionnel", duree: "5 jours", limite: "1 annonce", annonces: 1 } as any,
} as any;

export const PUBS = {
  boost_image: { prix: 2, prixUSD: 2, prixCDF: 4600, jours: 5, nom: "Boost Image", limite: "1 image + carrousel" },
  occasionnel: { prix: 3, prixUSD: 3, prixCDF: 6900, jours: 5, nom: "Occasionnel", limite: "1 annonce Client" },
  video_express: { prix: 1, prixUSD: 1, prixCDF: 2300, jours: 2, nom: "Vidéo Express 60s", limite: "1 vidéo 60s" },
  video_standard: { prix: 3, prixUSD: 3, prixCDF: 6900, jours: 6, nom: "Vidéo Standard 60s", limite: "1 vidéo 60s" },
  video_mensuelle: { prix: 15, prixUSD: 15, prixCDF: 34500, jours: 30, nom: "Vidéo Mensuelle 60s", limite: "1 vidéo 60s" },
  BOOST_IMAGE: { prix: 2, prixUSD: 2, prixCDF: 4600, jours: 5, nom: "Boost Image" } as any,
  OCCASIONNEL: { prix: 3, prixUSD: 3, prixCDF: 6900, jours: 5, nom: "Occasionnel" } as any,
  VIDEO_EXPRESS: { prix: 1, prixUSD: 1, prixCDF: 2300, jours: 2, nom: "Vidéo Express" } as any,
  VIDEO_STANDARD: { prix: 3, prixUSD: 3, prixCDF: 6900, jours: 6, nom: "Vidéo Standard" } as any,
  VIDEO_MENSUELLE: { prix: 15, prixUSD: 15, prixCDF: 34500, jours: 30, nom: "Vidéo Mensuelle" } as any,
} as any;

export const COMMUNES_KIN = ["Gombe","Lingwala","Kinshasa","Barumbu","Bandalungwa","Ngaliema","Kintambo","Mont Ngafula","Bumbu","Makala","Selembao","Ngaba","Lemba","Matete","Kisenso","Masina","Ndjili","Kimbanseke","Nsele","Maluku","Limete","Ngiri-Ngiri","Kasa-Vubu"] as const;

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
    dureeJours = f.jours ?? (key.includes("pro") || key.includes("grossiste") ? 30 : key === "occasionnel" ? 5 : 30);
  }

  const now = Date.now();
  const expire = now + dureeJours * 24 * 60 * 60 * 1000;
  const paiement = { type, nom, prixUSD, prixCDF, prix: prixUSD, devise, date: new Date().toISOString(), expire, actif: true, taux: TAUX_CDF };

  if (typeof window !== "undefined") {
    localStorage.setItem("paiement_reussi", "true");
    localStorage.setItem("type_paye", String(type));
    localStorage.setItem("abonnement_expire", String(expire));
    localStorage.setItem("dernier_paiement", JSON.stringify(paiement));
    localStorage.setItem("est_pro", String(key === "pro" || key === "grossiste"));

    // CORRECTION CRITIQUE: Met à jour wenze_user directement
    try {
      const userRaw = localStorage.getItem("wenze_user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (key === "pro") {
          user.type = "pro";
          user.annoncesLimite = 9999;
          user.abonnement = `Pro ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF} CDF - Actif`;
          user.estBoutique = true;
        } else if (key === "grossiste") {
          user.type = "grossiste";
          user.annoncesLimite = 9999;
          user.abonnement = `Grossiste ${FORMULES.grossiste.prix}$ / ${FORMULES.grossiste.prixCDF} CDF - Actif`;
          user.estBoutique = true;
        } else if (key === "occasionnel") {
          // Client perso paie 1 annonce
          const occ = Number(localStorage.getItem("wenze_occasionnel_credit") || "0") + 1;
          localStorage.setItem("wenze_occasionnel_credit", String(occ));
        }
        localStorage.setItem("wenze_user", JSON.stringify(user));
      }
      if (key === "pro" || key === "grossiste") localStorage.setItem("limite_annonces", "illimite");
    } catch {}
  }
  return paiement;
};

export const verifierAbonnement = () => {
  if (typeof window === "undefined") return { actif: false, formule: null, expireDans: 0 };
  const expire = localStorage.getItem("abonnement_expire");
  const formule = localStorage.getItem("type_paye");
  if (!expire) return { actif: false, formule: null, expireDans: 0 };
  const expireNum = Number(expire);
  const actif = Date.now() < expireNum;
  // Si expiré, on remet en freemium
  if (!actif && typeof window !== "undefined") {
    try {
      const userRaw = localStorage.getItem("wenze_user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user.type === "pro" || user.type === "grossiste") {
          user.type = "freemium";
          user.annoncesLimite = 3;
          user.abonnement = `Freemium - Retour après expiration - 3 gratuites`;
          localStorage.setItem("wenze_user", JSON.stringify(user));
        }
      }
    } catch {}
  }
  return { actif, formule, expireDans: Math.max(0, Math.ceil((expireNum - Date.now()) / 86400000)) };
};

export const checkFreemiumLimit = () => {
  if (typeof window === "undefined") return { peutPublier: true, annoncesRestantes: 3, type: "freemium" };
  
  // Vérifie abonnement Pro/Grossiste d'abord
  const ab = verifierAbonnement();
  if (ab.actif) return { peutPublier: true, annoncesRestantes: 999, type: "pro" };

  // Vérifie user
  try {
    const userRaw = localStorage.getItem("wenze_user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      // CLIENT PERSO: 0 annonce gratuite, doit payer occasionnel 3$
      if (user.type === "client" || user.estBoutique === false) {
        const creditOcc = Number(localStorage.getItem("wenze_occasionnel_credit") || "0");
        const annonces = Number(localStorage.getItem("wenze_annonces") || "0");
        // S'il a payé un crédit occasionnel et pas encore utilisé
        if (creditOcc > annonces) {
          return { peutPublier: true, annoncesRestantes: creditOcc - annonces, type: "client_avec_credit" };
        }
        return { peutPublier: false, annoncesRestantes: 0, type: "client" };
      }
      // FREEMIUM: 3 max
      if (user.type === "freemium") {
        const annonces = Number(localStorage.getItem("wenze_annonces") || "0");
        return { peutPublier: annonces < 3, annoncesRestantes: Math.max(0, 3 - annonces), type: "freemium" };
      }
      // PRO/GROSSISTE: illimité
      if (user.type === "pro" || user.type === "grossiste") {
        return { peutPublier: true, annoncesRestantes: 999, type: user.type };
      }
    }
  } catch {}

  // Fallback ancien système
  const annoncesPubliees = Number(localStorage.getItem("wenze_annonces") || localStorage.getItem("annonces_publiees") || "0");
  return { peutPublier: annoncesPubliees < 3, annoncesRestantes: Math.max(0, 3 - annoncesPubliees), type: "freemium" };
};
