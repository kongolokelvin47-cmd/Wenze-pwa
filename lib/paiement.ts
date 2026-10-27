// lib/paiement.ts - WENZE 2.0 MODERNE FORMIDABLE - 2 CATEGORIES 5$ / 10$ - VERT 100%
export const TAUX_CDF = 2300;
export const toCDF = (usd: number) => Math.round((usd || 0) * TAUX_CDF);
export const toUSD = (cdf: number) => Math.round((cdf || 0) / TAUX_CDF);
export const toCDFString = (usd: number) => `${toCDF(usd).toLocaleString("fr-FR")} CDF`;
export const toUSDString = (usd: number) => `${usd} $`;
export const formatPrix = (usd: number) => usd === 0 ? "Gratuit" : `${usd}$ / ${toCDFString(usd)}`;

export const PUBS = {
  boost_image: { prix: 2, prixUSD: 2, prixCDF: 2 * TAUX_CDF, jours: 5, nom: "Boost Image - Boutique" },
  video_express: { prix: 1, prixUSD: 1, prixCDF: 1 * TAUX_CDF, jours: 2, nom: "Vidéo Express" },
  video_standard: { prix: 3, prixUSD: 3, prixCDF: 3 * TAUX_CDF, jours: 6, nom: "Vidéo Standard" },
  video_mensuelle: { prix: 15, prixUSD: 15, prixCDF: 15 * TAUX_CDF, jours: 30, nom: "Vidéo Mensuelle" },
} as const;

// ✅ 2 FORMULES MODERNES - 5$ et 10$ - SOURCE UNIQUE PRIX
export const FORMULES = {
  freemium: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Freemium", duree: "À vie", jours: 36500, limite: "3 annonces gratuites", annonces: 3, badge: "🆓", regime: "petites-activites", categorie: "commerces-services" },
  client: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Client / Acheteur", duree: "À vie", jours: 36500, limite: "Recherche illimitée + 1 annonce occasionnelle", annonces: 0, badge: "👤", regime: "client", categorie: "client" },
  
  // ✅ NOUVELLES 2 CATEGORIES - PRIX OFFICIELS
  commerces_services: { prix: 5, prixUSD: 5, prixCDF: 5 * TAUX_CDF, nom: "Commerces et Services", duree: "30 jours", jours: 30, limite: "Illimité - Toutes petites activités (détail, service, électricité, maçon, coiffure...)", annonces: 9999, badge: "🛍️", regime: "petites-activites", categorie: "commerces-services" },
  gros_autres: { prix: 10, prixUSD: 10, prixCDF: 10 * TAUX_CDF, nom: "Commerces en gros et autres activités", duree: "30 jours", jours: 30, limite: "Illimité - Grossistes, production, import, B2B", annonces: 9999, badge: "🏭", regime: "grossiste", categorie: "gros-autres" },

  // Compatibilité ancien code - pro = 5$, grossiste = 10$ maintenant (plus 25$)
  pro: { prix: 5, prixUSD: 5, prixCDF: 5 * TAUX_CDF, nom: "Commerces et Services - 5$", duree: "30 jours", jours: 30, limite: "Illimité - Petites activités", annonces: 9999, badge: "🛍️", regime: "petites-activites", categorie: "commerces-services" },
  grossiste: { prix: 10, prixUSD: 10, prixCDF: 10 * TAUX_CDF, nom: "Gros et autres - 10$", duree: "30 jours", jours: 30, limite: "Illimité - Gros & production", annonces: 9999, badge: "🏭", regime: "grossiste", categorie: "gros-autres" },

  occasionnel: { prix: 3, prixUSD: 3, prixCDF: 3 * TAUX_CDF, nom: "Annonce Occasionnelle", duree: "5 jours", jours: 5, limite: "1 annonce / 5 jours", annonces: 1, badge: "🎟️", regime: "client", categorie: "client" },
  boost: { prix: 2, prixUSD: 2, prixCDF: 2 * TAUX_CDF, nom: "Boost Image", duree: "5 jours", jours: 5, limite: "Boost 5 jours", annonces: 0, badge: "🚀", regime: "petites-activites", categorie: "commerces-services" },
} as const;

export const FORMULES_ALIAS: any = {
  CLIENT: FORMULES.client, FREEMIUM: FORMULES.freemium, PRO: FORMULES.pro, GROSSISTE: FORMULES.grossiste, OCCASIONNEL: FORMULES.occasionnel,
  COMMERCES_SERVICES: FORMULES.commerces_services, COMMERCES_ET_SERVICES: FORMULES.commerces_services, DETAIL: FORMULES.commerces_services, SERVICE: FORMULES.commerces_services, SERVICES: FORMULES.commerces_services,
  GROS_AUTRES: FORMULES.gros_autres, GROS: FORMULES.gros_autres, AUTRES: FORMULES.gros_autres, PRODUCTION: FORMULES.gros_autres, IMPORT: FORMULES.gros_autres,
  SOUDEUR: FORMULES.commerces_services, TOUT_TRAVAUX: FORMULES.commerces_services, TECHNIQUE: FORMULES.commerces_services, BEAUTE: FORMULES.commerces_services, COMMERCE: FORMULES.commerces_services,
  BOOST: FORMULES.boost, BOOST_IMAGE: FORMULES.boost,
};

export const COMMUNES_KIN = ["Gombe","Lingwala","Kinshasa","Barumbu","Bandalungwa","Ngaliema","Kintambo","Mont Ngafula","Bumbu","Makala","Selembao","Ngaba","Lemba","Matete","Kisenso","Masina","Ndjili","Kimbanseke","Nsele","Maluku","Limete","Ngiri-Ngiri","Kasa-Vubu"] as const;
export type TypeFormule = keyof typeof FORMULES;

function cleanWa(n: string) { return (n || "").toString().replace(/[^0-9]/g, ""); }
function safeWindow() { return typeof window !== "undefined"; }

// ✅ Mots clés gros = 10$, sinon 5$
const MOTS_GROS = ["gros","production","import","usine","fabrication","b2b","wholesale","distributeur"];

export const handlePaiement = (type: string, devise: "$" | "CDF" = "$") => {
  try {
    const raw = String(type).toLowerCase().trim();
    let key: TypeFormule = "commerces_services";

    if (raw.includes("gros") || MOTS_GROS.some(m=> raw.includes(m)) || raw === "gros-autres" || raw === "gros_autres") key = "gros_autres";
    else if (raw.includes("commerce") || raw.includes("service") || raw.includes("detail") || raw === "commerces-services" || raw === "pro") key = "commerces_services";
    else if (raw === "grossiste") key = "gros_autres"; // Maintenant 10$ plus 25$
    else key = (raw as TypeFormule) in FORMULES ? raw as TypeFormule : "commerces_services";

    const f: any = (FORMULES as any)[key] || FORMULES_ALIAS[raw.toUpperCase()] || FORMULES.commerces_services;
    const prixUSD = f.prixUSD || f.prix || 0;
    const prixCDF = f.prixCDF || toCDF(prixUSD);
    const expire = Date.now() + (f.jours || 30) * 86400000;
    const transactionId = "WENZE-" + Date.now() + "-" + String(key).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

    const paiement: any = {
      success: true, type: key, nom: f.nom, prixUSD, prixCDF, prix: prixUSD, devise,
      date: new Date().toISOString(), expire, actif: true, taux: TAUX_CDF,
      regime: f.regime, categorie: f.categorie, boutiqueFonctionnelle: true,
      transactionId, expireDans: f.jours, expireLe: new Date(expire).toLocaleDateString("fr-FR"),
      confirmation: {
        titre: "🎉 Paiement confirmé",
        formule: f.nom, prix: prixUSD + "$ / " + prixCDF.toLocaleString("fr-FR") + " CDF",
        duree: f.duree, jours: f.jours, taux: TAUX_CDF + " CDF fixe",
        transaction: transactionId, expire: new Date(expire).toLocaleDateString("fr-FR"),
        boutique: "Fonctionnelle - " + f.categorie, regime: f.regime + " - " + f.categorie,
        message: "✅ " + f.nom + " activé - " + prixUSD + "$ / " + prixCDF.toLocaleString("fr-FR") + " CDF - " + f.jours + "j",
      },
      message: "✅ " + f.nom + " activé! " + prixUSD + "$ / " + prixCDF.toLocaleString("fr-FR") + " CDF",
    };

    if (safeWindow()) {
      try {
        localStorage.setItem("paiement_reussi", "true");
        localStorage.setItem("type_paye", key);
        localStorage.setItem("categorie_payee", f.categorie);
        localStorage.setItem("abonnement_expire", String(expire));
        localStorage.setItem("dernier_paiement", JSON.stringify(paiement));
        localStorage.setItem("est_pro", String(true));
        localStorage.setItem("wenze_abonnement", JSON.stringify({ type: key, categorie: f.categorie, expire, prix: prixUSD, prixCDF, transactionId, regime: f.regime }));

        const userRaw = localStorage.getItem("wenze_user");
        if (userRaw) {
          const user = JSON.parse(userRaw);
          user.type = key; user.plan = key; user.regime = f.regime; user.categorieId = f.categorie; user.categoriePayee = f.categorie;
          user.annoncesLimite = 9999; user.prixFormule = prixUSD;
          user.abonnement = `${f.nom} ${prixUSD}$ / ${prixCDF.toLocaleString("fr-FR")} CDF - ${f.jours}j - Taux ${TAUX_CDF}`;
          user.estBoutique = true; user.badge = f.badge;
          user.ownerWhatsapp = cleanWa(user.ownerWhatsapp || user.whatsapp);
          localStorage.setItem("wenze_user", JSON.stringify(user));
        }

        setTimeout(()=> {
          try {
            const uRaw = localStorage.getItem("wenze_user"); if(!uRaw) return;
            const u = JSON.parse(uRaw); const allRaw = localStorage.getItem("wenze_all_users");
            const allUsers = allRaw ? JSON.parse(allRaw) : []; const wa = cleanWa(u.ownerWhatsapp || u.whatsapp);
            let idx = allUsers.findIndex((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp)===wa);
            if(idx>=0) allUsers[idx]={...allUsers[idx], ...u}; else allUsers.push(u);
            localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
            const logs = JSON.parse(localStorage.getItem("wenze_transactions") || "[]");
            logs.push({ id: Date.now().toString(), ...paiement }); localStorage.setItem("wenze_transactions", JSON.stringify(logs));
          } catch {}
        }, 0);
      } catch {}
    }
    return paiement;
  } catch (e:any) { return { success: false, error: e.message || "Erreur paiement" }; }
};

export const verifierAbonnement = () => {
  if (!safeWindow()) return { actif: false, formule: null as any, expireDans: 0, regime: "petites-activites", taux: TAUX_CDF, type: "freemium" as const, isPro: false, label: "Freemium", categorie: "commerces-services" };
  try {
    const expireStr = localStorage.getItem("abonnement_expire");
    const wenzeAb = localStorage.getItem("wenze_abonnement");
    let expire = expireStr ? Number(expireStr) : 0; let formule: any = localStorage.getItem("type_paye"); let categorie = localStorage.getItem("categorie_payee") || "commerces-services";
    if (wenzeAb) { try { const p = JSON.parse(wenzeAb); if(p.expire) expire=p.expire; if(p.type) formule=p.type; if(p.categorie) categorie=p.categorie; } catch {} }
    if (!expire) return { actif: false, formule, expireDans: 0, regime: "petites-activites", taux: TAUX_CDF, type: (formule||"freemium") as any, isPro: false, label: "Freemium", categorie };
    const actif = Date.now() < expire;
    const isPro = actif; // Les deux 5$ et 10$ sont Pro
    const label = (FORMULES as any)[formule]?.nom || formule;
    return { actif, formule, type: (formule||"freemium") as any, label, expireDans: Math.max(0, Math.ceil((expire-Date.now())/86400000)), regime: (FORMULES as any)[formule]?.regime || "petites-activites", taux: TAUX_CDF, isPro, expire, categorie, prixUSD: (FORMULES as any)[formule]?.prixUSD || 5 };
  } catch { return { actif: false, formule: null as any, expireDans: 0, regime: "petites-activites", taux: TAUX_CDF, type: "freemium" as const, isPro: false, label: "Freemium", categorie: "commerces-services" }; }
};

export const checkFreemiumLimit = () => {
  if (!safeWindow()) return { peutPublier: true, annoncesRestantes: 3, type: "freemium" as const, isPro: false, regime: "petites-activites" as const, taux: TAUX_CDF, count: 0, categorie: "commerces-services" };
  const ab = verifierAbonnement();
  if (ab.actif && ab.isPro) return { peutPublier: true, annoncesRestantes: 999, type: ab.formule as any, isPro: true, regime: ab.regime as any, taux: TAUX_CDF, count: 0, categorie: ab.categorie };
  try {
    const listRaw = localStorage.getItem("wenze_annonces_list"); const list = listRaw ? JSON.parse(listRaw) : [];
    const userRaw = localStorage.getItem("wenze_user");
    if (userRaw) {
      const user = JSON.parse(userRaw); const myWa = cleanWa(user.whatsapp || user.ownerWhatsapp);
      let myCount = 0; for(let i=0;i<list.length;i++){ if(cleanWa(list[i].ownerWhatsapp||list[i].whatsapp)===myWa) myCount++; }
      if(user.type==="pro"||user.type==="grossiste"||user.type==="commerces_services"||user.type==="gros_autres") return { peutPublier: true, annoncesRestantes: 999, type: user.type as any, isPro: true, regime: user.regime as any, taux: TAUX_CDF, count: myCount, categorie: user.categorieId || "commerces-services" };
      return { peutPublier: myCount<3, annoncesRestantes: Math.max(0,3-myCount), type: "freemium" as const, isPro: false, regime: "petites-activites" as const, taux: TAUX_CDF, count: myCount, categorie: "commerces-services" };
    }
    return { peutPublier: list.length<3, annoncesRestantes: Math.max(0,3-list.length), type: "freemium" as const, isPro: false, regime: "petites-activites" as const, taux: TAUX_CDF, count: list.length, categorie: "commerces-services" };
  } catch { return { peutPublier: true, annoncesRestantes: 3, type: "freemium" as const, isPro: false, regime: "petites-activites" as const, taux: TAUX_CDF, count: 0, categorie: "commerces-services" }; }
};

export const getBadgeForUser = (user: any) => {
  if(!user) return "";
  const cat = user.categorieId || user.categoriePayee || "commerces-services";
  if(cat==="gros-autres"||cat==="gros_autres") return "🏭 Gros & Autres - 10$ / 23000 CDF";
  return "🛍️ Commerces & Services - 5$ / 11500 CDF";
};

export const MESSAGE_REGIME_UNIQUE_PAIEMENT = `🛍️ Petites activités 5$ / ${5*TAUX_CDF} CDF - 🏭 Gros & Autres 10$ / ${10*TAUX_CDF} CDF - Taux ${TAUX_CDF} fixe`;

export const PRIX_SUPABASE_RPC = {
  commerces_services: FORMULES.commerces_services.prixCDF, gros_autres: FORMULES.gros_autres.prixCDF,
  pro: FORMULES.pro.prixCDF, grossiste: FORMULES.grossiste.prixCDF, occasionnel: FORMULES.occasionnel.prixCDF,
  boost_image: PUBS.boost_image.prixCDF, video_express: PUBS.video_express.prixCDF, video_standard: PUBS.video_standard.prixCDF, video_mensuelle: PUBS.video_mensuelle.prixCDF, boost: FORMULES.boost.prixCDF,
};

export const getFormuleSecured = (code: string) => (FORMULES as any)[code] || (FORMULES_ALIAS as any)[code.toUpperCase()] || FORMULES.commerces_services;

export const getConfirmationAbonnement = (type: string) => {
  const key = (type.toLowerCase().includes("gros") ? "gros_autres" : "commerces_services") as TypeFormule;
  const f: any = (FORMULES as any)[key];
  return { titre: "Confirmer " + f.nom + "?", detail: f.prixUSD + "$ / " + f.prixCDF.toLocaleString("fr-FR") + " CDF", duree: f.duree, taux: "Taux fixe " + TAUX_CDF + " CDF", regime: f.regime, categorie: f.categorie, avantages: key==="gros_autres" ? ["∞ annonces gros", "Boutique gros", "Badge 🏭", "Visible gros"] : ["∞ annonces", "Boutique OK", "Badge 🛍️", "Taux 2300"] };
};

export const getSoldeWPay = () => { try { if(!safeWindow()) return 0; return parseInt(localStorage.getItem("wenze_wallet_solde")||localStorage.getItem("wenze_solde")||"0"); } catch { return 0; } };
export const ajouterSolde = (montantCDF: number) => { try { if(!safeWindow()) return 0; const a=getSoldeWPay(); const n=a+montantCDF; localStorage.setItem("wenze_wallet_solde", String(n)); localStorage.setItem("wenze_solde", String(n)); return n; } catch { return 0; } };
