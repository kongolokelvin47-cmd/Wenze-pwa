// lib/paiement.ts - WENZE 2026 MODERNE FORMIDABLE VERT 100% - Fix Build + Fix 404 + Anti-freeze
export const TAUX_CDF = 2300;
export const toCDF = (usd: number) => Math.round((usd || 0) * TAUX_CDF);
export const toUSD = (cdf: number) => Math.round((cdf || 0) / TAUX_CDF);
export const toCDFString = (usd: number) => `${toCDF(usd).toLocaleString("fr-FR")} CDF`;
export const toUSDString = (usd: number) => `${usd} $`;
export const formatPrix = (usd: number) => usd === 0 ? "Gratuit" : `${usd}$ / ${toCDFString(usd)}`;

export const PUBS = {
  boost_image: { prix: 2, prixUSD: 2, prixCDF: 2 * TAUX_CDF, jours: 5, nom: "Boost Image - Boutique fonctionnelle" },
  video_express: { prix: 1, prixUSD: 1, prixCDF: 1 * TAUX_CDF, jours: 2, nom: "Vidéo Express - Régime prestataire" },
  video_standard: { prix: 3, prixUSD: 3, prixCDF: 3 * TAUX_CDF, jours: 6, nom: "Vidéo Standard - Boutique fonctionnelle" },
  video_mensuelle: { prix: 15, prixUSD: 15, prixCDF: 15 * TAUX_CDF, jours: 30, nom: "Vidéo Mensuelle - Régime unique Soudeur + Tout travaux" },
} as const;

export const FORMULES = {
  freemium: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Prestataire Freemium", duree: "À vie", jours: 36500, limite: "3 annonces gratuites à vie - Régime prestataire unique", annonces: 3, badge: "🆓", regime: "prestataire" },
  client: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Client / Acheteur", duree: "À vie", jours: 36500, limite: "Recherche illimitée + 1 annonce occasionnelle 3$ / 6900 CDF", annonces: 0, badge: "👤", regime: "client" },
  pro: { prix: 5, prixUSD: 5, prixCDF: 5 * TAUX_CDF, nom: "Prestataire Pro - Régime unique", duree: "1 mois", jours: 30, limite: "Illimité - REGIME PRESTATAIRE UNIQUE: Soudeur + Tout travaux + 6 métiers - Taux 2300 CDF", annonces: 9999, badge: "👑", regime: "prestataire" },
  grossiste: { prix: 25, prixUSD: 25, prixCDF: 25 * TAUX_CDF, nom: "Grossiste B2B - Prestataire", duree: "1 mois", jours: 30, limite: "Illimité B2B - Même régime prestataire", annonces: 9999, badge: "🏭", regime: "prestataire" },
  occasionnel: { prix: 3, prixUSD: 3, prixCDF: 3 * TAUX_CDF, nom: "Annonce Occasionnelle", duree: "5 jours", jours: 5, limite: "1 annonce / 5 jours", annonces: 1, badge: "🎟️", regime: "client" },
  boost: { prix: 2, prixUSD: 2, prixCDF: 2 * TAUX_CDF, nom: "Boost Image - Boutique fonctionnelle", duree: "5 jours", jours: 5, limite: "Boost 5 jours - Taux 2300 CDF", annonces: 0, badge: "🚀", regime: "prestataire" },
} as const;

export const FORMULES_ALIAS: any = {
  CLIENT: FORMULES.client, FREEMIUM: FORMULES.freemium, PRO: FORMULES.pro, GROSSISTE: FORMULES.grossiste, OCCASIONNEL: FORMULES.occasionnel,
  SOUDEUR: FORMULES.pro, TOUT_TRAVAUX: FORMULES.pro, TOUT_TRAVAUX_TECHNIQUES: FORMULES.pro, SOUDEUR_PRO: FORMULES.pro, TOUT_TRAVAUX_PRO: FORMULES.pro,
  BOOST: FORMULES.boost, BOOST_IMAGE: FORMULES.boost, BOOST_IMAGE_ALIAS: PUBS.boost_image,
};

export const COMMUNES_KIN = ["Gombe","Lingwala","Kinshasa","Barumbu","Bandalungwa","Ngaliema","Kintambo","Mont Ngafula","Bumbu","Makala","Selembao","Ngaba","Lemba","Matete","Kisenso","Masina","Ndjili","Kimbanseke","Nsele","Maluku","Limete","Ngiri-Ngiri","Kasa-Vubu"] as const;
export type TypeFormule = keyof typeof FORMULES;

function cleanWa(n: string) {
  return (n || "").toString().replace(/[^0-9]/g, "");
}

function safeWindow() {
  return typeof window !== "undefined";
}

// FIX 404: handlePaiement sauvegarde SYNCHRONE abonnement pour verifierAbonnement immédiat
export const handlePaiement = (type: string, devise: "$" | "CDF" = "$") => {
  try {
    const raw = String(type).toLowerCase().trim();
    const isSoudeurOrToutTravaux = raw.indexOf("soudeur") !== -1 || raw.indexOf("tout") !== -1 || raw.indexOf("soud") !== -1;
    const key = (isSoudeurOrToutTravaux ? "pro" : raw) as TypeFormule;

    const f: any = (FORMULES as any)[key] || FORMULES_ALIAS[raw.toUpperCase()] || (PUBS as any)[raw] || (PUBS as any)[raw + "_image"] || FORMULES_ALIAS[key.toUpperCase()];
    if (!f) return { success: false, error: "Formule invalide - Taux 2300" };

    const prixUSD = f.prixUSD !== undefined ? f.prixUSD : (f.prix || 0);
    const prixCDF = f.prixCDF !== undefined ? f.prixCDF : toCDF(prixUSD);
    const expire = Date.now() + (f.jours || 30) * 86400000;
    const transactionId = "WENZE-" + Date.now() + "-" + String(key).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

    const paiement: any = {
      success: true,
      type: key, nom: f.nom, prixUSD, prixCDF, prix: prixUSD,
      devise, date: new Date().toISOString(), expire, actif: true, taux: TAUX_CDF,
      regime: f.regime || "prestataire", boutiqueFonctionnelle: true,
      transactionId, expireDans: f.jours, expireLe: new Date(expire).toLocaleDateString("fr-FR"),
      confirmation: {
        titre: "🎉 Paiement confirmé - Abonnement payé",
        formule: f.nom,
        prix: prixUSD + "$ / " + prixCDF.toLocaleString("fr-FR") + " CDF",
        duree: f.duree, jours: f.jours, taux: TAUX_CDF + " CDF fixe",
        transaction: transactionId,
        expire: new Date(expire).toLocaleDateString("fr-FR"),
        boutique: "Fonctionnelle - Visible dans /boutiques",
        regime: "Prestataire unique - Soudeur + Tout travaux même régime Pro 5$",
        message: "✅ " + f.nom + " activé - " + prixUSD + "$ / " + prixCDF.toLocaleString("fr-FR") + " CDF - " + f.jours + "j - Taux " + TAUX_CDF,
      },
      message: "✅ " + f.nom + " activé! " + prixUSD + "$ / " + prixCDF.toLocaleString("fr-FR") + " CDF",
    };

    if (safeWindow()) {
      // SAUVEGARDE SYNCHRONE - FIX 404 - doit être immédiate pour verifierAbonnement()
      try {
        localStorage.setItem("paiement_reussi", "true");
        localStorage.setItem("type_paye", key);
        localStorage.setItem("abonnement_expire", String(expire));
        localStorage.setItem("dernier_paiement", JSON.stringify(paiement));
        localStorage.setItem("est_pro", String(key === "pro" || key === "grossiste"));
        localStorage.setItem("regime_prestataire", "true");
        localStorage.setItem("wenze_abonnement", JSON.stringify({ type: key, expire, prix: prixUSD, prixCDF, transactionId }));

        // Update user immédiat - FIX boutique qui disparaît
        const userRaw = localStorage.getItem("wenze_user");
        if (userRaw) {
          const user = JSON.parse(userRaw);
          if (key === "pro" || isSoudeurOrToutTravaux) {
            user.type = "pro"; user.plan = "pro"; user.regime = "prestataire"; user.annoncesLimite = 9999;
            user.abonnement = "Pro 5$ / " + FORMULES.pro.prixCDF.toLocaleString("fr-FR") + " CDF - Régime unique - Actif " + f.jours + "j - Taux " + TAUX_CDF;
            user.estBoutique = true; user.badge = "👑";
          } else if (key === "grossiste") {
            user.type = "grossiste"; user.plan = "grossiste"; user.regime = "prestataire"; user.annoncesLimite = 9999;
            user.abonnement = "Grossiste 25$ / " + FORMULES.grossiste.prixCDF.toLocaleString("fr-FR") + " CDF";
            user.estBoutique = true;
          }
          user.ownerWhatsapp = cleanWa(user.ownerWhatsapp || user.whatsapp);
          localStorage.setItem("wenze_user", JSON.stringify(user));
        }

        // Sync all_users en arrière-plan non bloquant mais pas bloquant pour verifierAbonnement
        setTimeout(() => {
          try {
            const uRaw = localStorage.getItem("wenze_user");
            if (!uRaw) return;
            const u = JSON.parse(uRaw);
            const allRaw = localStorage.getItem("wenze_all_users");
            const allUsers = allRaw ? JSON.parse(allRaw) : [];
            const wa = cleanWa(u.ownerWhatsapp || u.whatsapp);
            let idx = -1;
            for (let i = 0; i < allUsers.length; i++) {
              if (cleanWa(allUsers[i].ownerWhatsapp || allUsers[i].whatsapp) === wa) { idx = i; break; }
            }
            if (idx >= 0) allUsers[idx] = { ...allUsers[idx], ...u };
            else allUsers.push(u);
            localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
            const logs = JSON.parse(localStorage.getItem("wenze_transactions") || "[]");
            logs.push({ id: Date.now().toString(), ...paiement });
            localStorage.setItem("wenze_transactions", JSON.stringify(logs));
          } catch {}
        }, 0);
      } catch {}
    }
    return paiement;
  } catch (e: any) {
    return { success: false, error: e.message || "Erreur paiement" };
  }
};

export const verifierAbonnement = () => {
  if (!safeWindow()) return { actif: false, formule: null as any, expireDans: 0, regime: "prestataire", taux: TAUX_CDF, type: "freemium" as const, isPro: false, label: "Freemium" };
  try {
    const expireStr = localStorage.getItem("abonnement_expire");
    const wenzeAb = localStorage.getItem("wenze_abonnement");
    let expire = expireStr ? Number(expireStr) : 0;
    let formule: any = localStorage.getItem("type_paye");
    if (wenzeAb) {
      try {
        const parsed = JSON.parse(wenzeAb);
        if (parsed.expire) expire = Number(parsed.expire);
        if (parsed.type) formule = parsed.type;
      } catch {}
    }
    if (formule && (String(formule).toLowerCase().indexOf("soudeur") !== -1 || String(formule).toLowerCase().indexOf("tout") !== -1)) formule = "pro";
    if (!expire) return { actif: false, formule, expireDans: 0, regime: "prestataire", taux: TAUX_CDF, type: (formule || "freemium") as any, isPro: false, label: (FORMULES as any)[formule] ? (FORMULES as any)[formule].nom : "Freemium" };
    const actif = Date.now() < expire;
    const isPro = actif && (formule === "pro" || formule === "grossiste");
    return { actif, formule, type: (formule || "freemium") as any, label: (FORMULES as any)[formule] ? (FORMULES as any)[formule].nom : formule, expireDans: Math.max(0, Math.ceil((expire - Date.now()) / 86400000)), regime: "prestataire", taux: TAUX_CDF, isPro, expire };
  } catch {
    return { actif: false, formule: null as any, expireDans: 0, regime: "prestataire", taux: TAUX_CDF, type: "freemium" as const, isPro: false, label: "Freemium" };
  }
};

export const checkFreemiumLimit = () => {
  if (!safeWindow()) return { peutPublier: true, annoncesRestantes: 3, type: "freemium" as const, isPro: false, regime: "prestataire" as const, taux: TAUX_CDF, count: 0 };
  const ab = verifierAbonnement();
  if (ab.actif && ab.isPro) return { peutPublier: true, annoncesRestantes: 999, type: ab.formule as any, isPro: true, regime: "prestataire" as const, taux: TAUX_CDF, count: 0 };
  try {
    const listRaw = localStorage.getItem("wenze_annonces_list");
    const list = listRaw ? JSON.parse(listRaw) : [];
    const userRaw = localStorage.getItem("wenze_user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      const myWa = cleanWa(user.whatsapp || user.ownerWhatsapp);
      let myCount = 0;
      for (let i = 0; i < list.length; i++) {
        if (cleanWa(list[i].ownerWhatsapp || list[i].whatsapp) === myWa) myCount++;
      }
      if (user.type === "pro" || user.type === "grossiste" || user.plan === "pro" || user.plan === "grossiste") return { peutPublier: true, annoncesRestantes: 999, type: user.type as any, isPro: true, regime: "prestataire" as const, taux: TAUX_CDF, count: myCount };
      return { peutPublier: myCount < 3, annoncesRestantes: Math.max(0, 3 - myCount), type: "freemium" as const, isPro: false, regime: "prestataire" as const, taux: TAUX_CDF, count: myCount };
    }
    return { peutPublier: list.length < 3, annoncesRestantes: Math.max(0, 3 - list.length), type: "freemium" as const, isPro: false, regime: "prestataire" as const, taux: TAUX_CDF, count: list.length };
  } catch {
    return { peutPublier: true, annoncesRestantes: 3, type: "freemium" as const, isPro: false, regime: "prestataire" as const, taux: TAUX_CDF, count: 0 };
  }
};

export const getBadgeForUser = (user: any) => {
  if (!user) return "";
  const lower = (user.type || user.plan || "").toLowerCase();
  if (lower.indexOf("pro") !== -1 || lower.indexOf("soudeur") !== -1 || lower.indexOf("tout") !== -1) return "👑 Prestataire Pro - Régime unique 5$";
  if (lower.indexOf("grossiste") !== -1) return "🏭 Grossiste Prestataire - 25$";
  return "🆓 Prestataire Freemium - 3 gratuites";
};

export const MESSAGE_REGIME_UNIQUE_PAIEMENT = "🔧 Régime prestataire unique: Soudeur + Tout travaux = même régime Pro 5$ / " + FORMULES.pro.prixCDF.toLocaleString("fr-FR") + " CDF - Taux " + TAUX_CDF + " CDF fixe - Boutique fonctionnelle garantie";

export const PRIX_SUPABASE_RPC = {
  pro: FORMULES.pro.prixCDF, grossiste: FORMULES.grossiste.prixCDF, occasionnel: FORMULES.occasionnel.prixCDF,
  boost_image: PUBS.boost_image.prixCDF, video_express: PUBS.video_express.prixCDF, video_standard: PUBS.video_standard.prixCDF, video_mensuelle: PUBS.video_mensuelle.prixCDF, boost: FORMULES.boost.prixCDF,
};

export const getFormuleSecured = (code: string) => (FORMULES as any)[code] || (PUBS as any)[code] || FORMULES.pro;

export const getConfirmationAbonnement = (type: string) => {
  const raw = type.toLowerCase(); const isS = raw.indexOf("soudeur") !== -1 || raw.indexOf("tout") !== -1; const key = (isS ? "pro" : raw) as TypeFormule;
  const f: any = (FORMULES as any)[key] || FORMULES.pro;
  return { titre: "Confirmer " + f.nom + "?", detail: f.prixUSD + "$ / " + f.prixCDF.toLocaleString("fr-FR") + " CDF", duree: f.duree, taux: "Taux fixe " + TAUX_CDF + " CDF", regime: "Régime prestataire unique", avantages: key === "pro" ? ["∞ annonces", "Boost inclus", "Flash -60%", "Boutique OK", "Badge Pro"] : ["3 gratuites", "Boutique OK"] };
};

export const getSoldeWPay = () => { try { if (!safeWindow()) return 0; return parseInt(localStorage.getItem("wenze_wallet_solde") || localStorage.getItem("wenze_solde") || "0"); } catch { return 0; } };
export const ajouterSolde = (montantCDF: number) => { try { if (!safeWindow()) return 0; const a = getSoldeWPay(); const n = a + montantCDF; localStorage.setItem("wenze_wallet_solde", String(n)); localStorage.setItem("wenze_solde", String(n)); return n; } catch { return 0; } };
