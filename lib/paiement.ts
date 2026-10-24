// lib/paiement.ts - WENZE 2026 - REGIME PRESTATAIRE UNIQUE - VERT 100% - CONCORDANCE TOTALE
// Soudeur + Tout travaux techniques = même régime que Prestataire Pro 5$ - Taux 2300 CDF fixe

export const TAUX_CDF = 2300;
export const toCDF = (usd: number) => Math.round(usd * TAUX_CDF);
export const toUSD = (cdf: number) => Math.round(cdf / TAUX_CDF);
export const toCDFString = (usd: number) => `${toCDF(usd).toLocaleString()} CDF`;
export const toUSDString = (usd: number) => `${usd} $`;

// ✅ 5 FORMULES SEULEMENT - REGIME PRESTATAIRE UNIQUE - PRIX CALCULE AUTO POUR CONCORDANCE
export const FORMULES = {
  freemium: {
    prix: 0, prixUSD: 0, prixCDF: 0 * TAUX_CDF,
    nom: "Prestataire Freemium",
    duree: "À vie", jours: 36500,
    limite: "3 annonces gratuites à vie - Tous métiers: Soudeur, Tout travaux, etc - Régime prestataire unique",
    annonces: 3, badge: "🆓",
    regime: "prestataire"
  },
  client: {
    prix: 0, prixUSD: 0, prixCDF: 0 * TAUX_CDF,
    nom: "Client / Acheteur",
    duree: "À vie", jours: 36500,
    limite: "Recherche illimitée + 1 annonce occasionnelle 3$ / 6900 CDF - Régime prestataire",
    annonces: 0, badge: "👤",
    regime: "client"
  },
  pro: {
    prix: 5, prixUSD: 5, prixCDF: 5 * TAUX_CDF, // 11500 auto - plus jamais hardcodé
    nom: "Prestataire Pro - Régime unique", // ✅ NOM UNIQUE - inclut soudeur et tout travaux
    duree: "1 mois", jours: 30,
    limite: "Illimité - REGIME PRESTATAIRE UNIQUE: Soudeur + Tout travaux techniques + Commerce + Beauté + Technique + Alimentation + Ménage + Événementiel + CRM + IA - Taux 2300 CDF",
    annonces: 9999, badge: "👑",
    regime: "prestataire",
    professions: [
      "Prestataire", "Soudeur", "Tout travaux techniques",
      "Commerce", "Beauté", "Technique", "Alimentation", "Ménage", "Événementiel",
      "Électricien", "Plombier", "Menuisier", "Mécanicien", "Peintre", "Carreleur", "Vitrier"
    ]
  },
  grossiste: {
    prix: 25, prixUSD: 25, prixCDF: 25 * TAUX_CDF, // 57500 auto
    nom: "Grossiste B2B - Prestataire",
    duree: "1 mois", jours: 30,
    limite: "Illimité B2B - Même régime prestataire mais volume grossiste - Taux 2300 CDF",
    annonces: 9999, badge: "🏭",
    regime: "prestataire",
    professions: ["Grossiste", "Dépôt", "Usine"]
  },
  occasionnel: {
    prix: 3, prixUSD: 3, prixCDF: 3 * TAUX_CDF, // 6900 auto
    nom: "Annonce Occasionnelle - Régime prestataire",
    duree: "5 jours", jours: 5,
    limite: "1 annonce / 5 jours - Régime prestataire unique - Taux 2300 CDF",
    annonces: 1, badge: "🎟️",
    regime: "client"
  },
} as const;

export const PUBS = {
  boost_image: { prix: 2, prixUSD: 2, prixCDF: 2 * TAUX_CDF, jours: 5, nom: "Boost Image - Boutique fonctionnelle" },
  video_express: { prix: 1, prixUSD: 1, prixCDF: 1 * TAUX_CDF, jours: 2, nom: "Vidéo Express - Régime prestataire" },
  video_standard: { prix: 3, prixUSD: 3, prixCDF: 3 * TAUX_CDF, jours: 6, nom: "Vidéo Standard - Boutique fonctionnelle" },
  video_mensuelle: { prix: 15, prixUSD: 15, prixCDF: 15 * TAUX_CDF, jours: 30, nom: "Vidéo Mensuelle - Régime unique Soudeur + Tout travaux" },
} as const;

// Compatibilité ancien code - ne supprime pas - concordance
export const FORMULES_ALIAS: any = {
  CLIENT: FORMULES.client, FREEMIUM: FORMULES.freemium,
  PRO: FORMULES.pro, GROSSISTE: FORMULES.grossiste, OCCASIONNEL: FORMULES.occasionnel,
  SOUDEUR: FORMULES.pro, TOUT_TRAVAUX: FORMULES.pro, TOUT_TRAVAUX_TECHNIQUES: FORMULES.pro,
  SOUDEUR_PRO: FORMULES.pro, TOUT_TRAVAUX_PRO: FORMULES.pro,
};

export const COMMUNES_KIN = ["Gombe","Lingwala","Kinshasa","Barumbu","Bandalungwa","Ngaliema","Kintambo","Mont Ngafula","Bumbu","Makala","Selembao","Ngaba","Lemba","Matete","Kisenso","Masina","Ndjili","Kimbanseke","Nsele","Maluku","Limete","Ngiri-Ngiri","Kasa-Vubu"] as const;

export type TypeFormule = keyof typeof FORMULES;

export const handlePaiement = (type: string, devise: "$" | "CDF" = "$") => {
  const raw = String(type).toLowerCase().trim();
  // ✅ Si on paie "soudeur" ou "tout-travaux" -> on map direct sur "pro" - même régime
  const isSoudeurOrToutTravaux = raw.includes("soudeur") || raw.includes("tout") || raw.includes("soud");
  const key = (isSoudeurOrToutTravaux ? "pro" : raw) as TypeFormule;
  
  const f: any = (FORMULES as any)[key] || FORMULES_ALIAS[raw.toUpperCase()] || (PUBS as any)[raw] || FORMULES_ALIAS[key.toUpperCase()];
  if (!f) return null;

  const prixUSD = f.prixUSD ?? f.prix ?? 0;
  const prixCDF = f.prixCDF ?? toCDF(prixUSD);
  const expire = Date.now() + (f.jours ?? 30) * 86400000;

  const paiement = {
    type: key, nom: f.nom, prixUSD, prixCDF, prix: prixUSD,
    devise, date: new Date().toISOString(), expire, actif: true, taux: TAUX_CDF,
    regime: f.regime || "prestataire",
    metiers: 6, // Concordance categories
    boutiqueFonctionnelle: true,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("paiement_reussi", "true");
    localStorage.setItem("type_paye", key);
    localStorage.setItem("abonnement_expire", String(expire));
    localStorage.setItem("dernier_paiement", JSON.stringify(paiement));
    localStorage.setItem("est_pro", String(key === "pro" || key === "grossiste"));
    localStorage.setItem("regime_prestataire", "true"); // Marqueur régime unique

    try {
      const userRaw = localStorage.getItem("wenze_user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (key === "pro" || isSoudeurOrToutTravaux) {
          user.type = "pro"; user.plan = "pro"; user.regime = "prestataire"; user.annoncesLimite = 9999;
          user.abonnement = `Prestataire Pro 5$ / ${FORMULES.pro.prixCDF.toLocaleString()} CDF - Régime unique inclut Soudeur + Tout travaux - Actif - Taux ${TAUX_CDF}`;
          user.estBoutique = true; user.badge = "👑"; user.profession = user.profession || "Prestataire";
        } else if (key === "grossiste") {
          user.type = "grossiste"; user.plan = "grossiste"; user.regime = "prestataire"; user.annoncesLimite = 9999;
          user.abonnement = `Grossiste Prestataire 25$ / ${FORMULES.grossiste.prixCDF.toLocaleString()} CDF - Taux ${TAUX_CDF}`;
          user.estBoutique = true;
        }
        user.ownerWhatsapp = (user.ownerWhatsapp || user.whatsapp || "").replace(/[^0-9]/g,"");
        localStorage.setItem("wenze_user", JSON.stringify(user));

        // ✅ FIX CONCORDANCE CRITIQUE - Sync wenze_all_users pour boutiques fonctionnelles
        try {
          const allRaw = localStorage.getItem("wenze_all_users");
          const allUsers = allRaw ? JSON.parse(allRaw) : [];
          const wa = (user.ownerWhatsapp || user.whatsapp || "").replace(/[^0-9]/g,"");
          const idx = allUsers.findIndex((x: any) => (x.ownerWhatsapp || x.whatsapp || "").replace(/[^0-9]/g,"") === wa);
          if (idx >= 0) allUsers[idx] = { ...allUsers[idx], ...user };
          else allUsers.push(user);
          localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
        } catch {}
      }
    } catch {}
  }
  return paiement;
};

export const verifierAbonnement = () => {
  if (typeof window === "undefined") return { actif: false, formule: null as any, expireDans: 0, regime: "prestataire", taux: TAUX_CDF, type: "freemium" as const };
  const expire = localStorage.getItem("abonnement_expire");
  let formule = localStorage.getItem("type_paye") as TypeFormule | null;
  
  // ✅ Fix concordance - si soudeur/tout travaux payé, considère Pro actif
  if (formule && (formule.toLowerCase().includes("soudeur") || formule.toLowerCase().includes("tout"))) {
    formule = "pro" as TypeFormule;
  }

  if (!expire) return { actif: false, formule, expireDans: 0, regime: "prestataire", taux: TAUX_CDF, type: (formule || "freemium") as any };
  const actif = Date.now() < Number(expire);
  return { 
    actif, 
    formule, 
    type: (formule || "freemium") as any,
    expireDans: Math.max(0, Math.ceil((Number(expire) - Date.now()) / 86400000)), 
    regime: "prestataire", 
    taux: TAUX_CDF 
  };
};

// ✅ Compte réel depuis list + régime prestataire unique - concordance
export const checkFreemiumLimit = () => {
  if (typeof window === "undefined") return { peutPublier: true, annoncesRestantes: 3, type: "freemium" as const, isPro: false, regime: "prestataire" as const, taux: TAUX_CDF };

  const ab = verifierAbonnement();
  if (ab.actif && (ab.formule === "pro" || ab.formule === "grossiste" || ab.type === "pro" || ab.type === "grossiste")) {
    return { peutPublier: true, annoncesRestantes: 999, type: ab.formule as any, isPro: true, regime: "prestataire" as const, taux: TAUX_CDF };
  }

  try {
    const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const userRaw = localStorage.getItem("wenze_user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      const myWa = (user.whatsapp || user.ownerWhatsapp || "").replace(/[^0-9]/g,"");
      const myCount = myWa ? list.filter((a:any) => (a.ownerWhatsapp||a.whatsapp||"").replace(/[^0-9]/g,"") === myWa).length : list.length;
      if (user.type === "pro" || user.type === "grossiste" || user.plan === "pro" || user.plan === "grossiste") {
        return { peutPublier: true, annoncesRestantes: 999, type: user.type as any, isPro: true, regime: "prestataire" as const, taux: TAUX_CDF };
      }
      return { peutPublier: myCount < 3, annoncesRestantes: Math.max(0, 3 - myCount), type: "freemium" as const, isPro: false, regime: "prestataire" as const, taux: TAUX_CDF };
    }
    return { peutPublier: list.length < 3, annoncesRestantes: Math.max(0, 3 - list.length), type: "freemium" as const, isPro: false, regime: "prestataire" as const, taux: TAUX_CDF };
  } catch {
    return { peutPublier: true, annoncesRestantes: 3, type: "freemium" as const, isPro: false, regime: "prestataire" as const, taux: TAUX_CDF };
  }
};

export const getBadgeForUser = (user: any) => {
  if(!user) return "";
  const lower = (user.type || user.plan || "").toLowerCase();
  if(lower.includes("pro") || lower.includes("soudeur") || lower.includes("tout")) return "👑 Prestataire Pro - Régime unique 5$";
  if(lower.includes("grossiste")) return "🏭 Grossiste Prestataire - 25$";
  return "🆓 Prestataire Freemium - 3 gratuites";
};

// ✅ Messages finaux - concordance
export const MESSAGE_REGIME_UNIQUE_PAIEMENT = `🔧 Régime prestataire unique: Soudeur + Tout travaux techniques = même régime que tous les prestataires - Pro ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF.toLocaleString()} CDF - Taux ${TAUX_CDF} CDF fixe - 6 métiers - Boutique fonctionnelle garantie`;
export const PRIX_SUPABASE_RPC = {
  pro: FORMULES.pro.prixCDF,
  grossiste: FORMULES.grossiste.prixCDF,
  occasionnel: FORMULES.occasionnel.prixCDF,
  boost_image: PUBS.boost_image.prixCDF,
  video_express: PUBS.video_express.prixCDF,
  video_standard: PUBS.video_standard.prixCDF,
  video_mensuelle: PUBS.video_mensuelle.prixCDF,
};
