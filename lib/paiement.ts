// lib/paiement.ts - WENZE 2026 - REGIME PRESTATAIRE UNIQUE - VERT
// Soudeur + Tout travaux techniques = même régime que Prestataire Pro 5$

export const TAUX_CDF = 2300;
export const toCDF = (usd: number) => Math.round(usd * TAUX_CDF);
export const toUSD = (cdf: number) => Math.round(cdf / TAUX_CDF);

// ✅ 5 FORMULES SEULEMENT - REGIME PRESTATAIRE UNIQUE
export const FORMULES = {
  freemium: {
    prix: 0, prixUSD: 0, prixCDF: 0,
    nom: "Prestataire Freemium",
    duree: "À vie", jours: 36500,
    limite: "3 annonces gratuites à vie - Tous métiers: Soudeur, Tout travaux, etc",
    annonces: 3, badge: "🆓",
    regime: "prestataire"
  },
  client: {
    prix: 0, prixUSD: 0, prixCDF: 0,
    nom: "Client / Acheteur",
    duree: "À vie", jours: 36500,
    limite: "Recherche illimitée + 1 annonce occasionnelle 3$",
    annonces: 0, badge: "👤",
    regime: "client"
  },
  pro: {
    prix: 5, prixUSD: 5, prixCDF: 11500,
    nom: "Prestataire Pro", // ✅ NOM UNIQUE - inclut soudeur et tout travaux
    duree: "1 mois", jours: 30,
    limite: "Illimité - REGIME PRESTATAIRE UNIQUE: Soudeur + Tout travaux techniques + Commerce + Beauté + Technique + Alimentation + Ménage + Événementiel + CRM + IA",
    annonces: 9999, badge: "👑",
    regime: "prestataire",
    // ✅ TOUS LES METIERS AU MEME REGIME
    professions: [
      "Prestataire", "Soudeur", "Tout travaux techniques",
      "Commerce", "Beauté", "Technique", "Alimentation", "Ménage", "Événementiel",
      "Électricien", "Plombier", "Menuisier", "Mécanicien", "Peintre", "Carreleur", "Vitrier"
    ]
  },
  grossiste: {
    prix: 25, prixUSD: 25, prixCDF: 57500,
    nom: "Grossiste B2B - Prestataire",
    duree: "1 mois", jours: 30,
    limite: "Illimité B2B - Même régime prestataire mais volume grossiste",
    annonces: 9999, badge: "🏭",
    regime: "prestataire",
    professions: ["Grossiste", "Dépôt", "Usine"]
  },
  occasionnel: {
    prix: 3, prixUSD: 3, prixCDF: 6900,
    nom: "Annonce Occasionnelle",
    duree: "5 jours", jours: 5,
    limite: "1 annonce",
    annonces: 1, badge: "🎟️",
    regime: "client"
  },
} as const;

export const PUBS = {
  boost_image: { prix: 2, prixUSD: 2, prixCDF: 4600, jours: 5, nom: "Boost Image" },
  video_express: { prix: 1, prixUSD: 1, prixCDF: 2300, jours: 2, nom: "Vidéo Express" },
  video_standard: { prix: 3, prixUSD: 3, prixCDF: 6900, jours: 6, nom: "Vidéo Standard" },
  video_mensuelle: { prix: 15, prixUSD: 15, prixCDF: 34500, jours: 30, nom: "Vidéo Mensuelle" },
} as const;

// Compatibilité ancien code - ne supprime pas
export const FORMULES_ALIAS: any = {
  CLIENT: FORMULES.client, FREEMIUM: FORMULES.freemium,
  PRO: FORMULES.pro, GROSSISTE: FORMULES.grossiste, OCCASIONNEL: FORMULES.occasionnel,
  SOUDEUR: FORMULES.pro, TOUT_TRAVAUX: FORMULES.pro, // ✅ Soudeur et tout travaux = Pro
};

export const COMMUNES_KIN = ["Gombe","Lingwala","Kinshasa","Barumbu","Bandalungwa","Ngaliema","Kintambo","Mont Ngafula","Bumbu","Makala","Selembao","Ngaba","Lemba","Matete","Kisenso","Masina","Ndjili","Kimbanseke","Nsele","Maluku","Limete","Ngiri-Ngiri","Kasa-Vubu"] as const;

export type TypeFormule = keyof typeof FORMULES;

export const handlePaiement = (type: string, devise: "$" | "CDF" = "$") => {
  const raw = String(type).toLowerCase();
  // ✅ Si on paie "soudeur" ou "tout-travaux" -> on map direct sur "pro" - même régime
  const key = (raw.includes("soudeur") || raw.includes("tout") ? "pro" : raw) as TypeFormule;
  
  const f: any = (FORMULES as any)[key] || FORMULES_ALIAS[raw.toUpperCase()] || (PUBS as any)[raw];
  if (!f) return null;

  const prixUSD = f.prixUSD ?? f.prix ?? 0;
  const prixCDF = f.prixCDF ?? toCDF(prixUSD);
  const expire = Date.now() + (f.jours ?? 30) * 86400000;

  const paiement = {
    type: key, nom: f.nom, prixUSD, prixCDF, prix: prixUSD,
    devise, date: new Date().toISOString(), expire, actif: true, taux: TAUX_CDF,
    regime: f.regime || "prestataire"
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("paiement_reussi", "true");
    localStorage.setItem("type_paye", key);
    localStorage.setItem("abonnement_expire", String(expire));
    localStorage.setItem("dernier_paiement", JSON.stringify(paiement));
    localStorage.setItem("est_pro", String(key === "pro" || key === "grossiste"));
    localStorage.setItem("regime_prestataire", "true"); // ✅ Marqueur régime unique

    try {
      const userRaw = localStorage.getItem("wenze_user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (key === "pro") {
          user.type = "pro"; user.regime = "prestataire"; user.annoncesLimite = 9999;
          user.abonnement = `Prestataire Pro 5$ - Régime unique inclut Soudeur + Tout travaux - Actif`;
          user.estBoutique = true; user.badge = "👑";
        } else if (key === "grossiste") {
          user.type = "grossiste"; user.regime = "prestataire"; user.annoncesLimite = 9999;
          user.abonnement = `Grossiste Prestataire 25$`;
          user.estBoutique = true;
        }
        localStorage.setItem("wenze_user", JSON.stringify(user));
      }
    } catch {}
  }
  return paiement;
};

export const verifierAbonnement = () => {
  if (typeof window === "undefined") return { actif: false, formule: null as any, expireDans: 0, regime: "prestataire" };
  const expire = localStorage.getItem("abonnement_expire");
  const formule = localStorage.getItem("type_paye") as TypeFormule | null;
  if (!expire) return { actif: false, formule, expireDans: 0, regime: "prestataire" };
  const actif = Date.now() < Number(expire);
  return { actif, formule, expireDans: Math.max(0, Math.ceil((Number(expire) - Date.now()) / 86400000)), regime: "prestataire" };
};

// ✅ Compte réel depuis list + régime prestataire unique
export const checkFreemiumLimit = () => {
  if (typeof window === "undefined") return { peutPublier: true, annoncesRestantes: 3, type: "freemium" as const, isPro: false, regime: "prestataire" };

  const ab = verifierAbonnement();
  if (ab.actif && (ab.formule === "pro" || ab.formule === "grossiste")) {
    return { peutPublier: true, annoncesRestantes: 999, type: ab.formule as any, isPro: true, regime: "prestataire" as const };
  }

  try {
    const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const userRaw = localStorage.getItem("wenze_user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      const myWa = (user.whatsapp || "").replace(/[^0-9]/g,"");
      const myCount = myWa ? list.filter((a:any) => (a.ownerWhatsapp||a.whatsapp||"").replace(/[^0-9]/g,"") === myWa).length : list.length;
      if (user.type === "pro" || user.type === "grossiste") return { peutPublier: true, annoncesRestantes: 999, type: user.type, isPro: true, regime: "prestataire" as const };
      return { peutPublier: myCount < 3, annoncesRestantes: Math.max(0, 3 - myCount), type: "freemium" as const, isPro: false, regime: "prestataire" as const };
    }
    return { peutPublier: list.length < 3, annoncesRestantes: Math.max(0, 3 - list.length), type: "freemium" as const, isPro: false, regime: "prestataire" as const };
  } catch {
    return { peutPublier: true, annoncesRestantes: 3, type: "freemium" as const, isPro: false, regime: "prestataire" as const };
  }
};

export const getBadgeForUser = (user: any) => {
  if(!user) return "";
  if(user.type === "pro") return "👑 Prestataire Pro";
  if(user.type === "grossiste") return "🏭 Grossiste Prestataire";
  return "🆓 Prestataire Freemium";
};
