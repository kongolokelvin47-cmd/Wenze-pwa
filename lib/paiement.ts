// lib/paiement.ts - WENZE 2.0 FINAL AJUSTÉ PRO - Freemium 3 à vie images only + Essai 7j pro illimité + 5$/10$ + Booster 1$ - VERT 100%
export const TAUX_CDF = 2300;

export const toCDF = (usd: number) => Math.round((usd || 0) * TAUX_CDF);
export const toUSD = (cdf: number) => Math.round((cdf || 0) / TAUX_CDF);
export const toCDFString = (usd: number) => `${toCDF(usd).toLocaleString("fr-FR")} CDF`;
export const toUSDString = (usd: number) => `${usd} $`;
export const formatPrix = (usd: number) => usd === 0 ? "Gratuit" : `${usd}$ / ${toCDFString(usd)}`;

function cleanWa(n: string) { return (n || "").toString().replace(/[^0-9]/g, ""); }
function safeWindow() { return typeof window !== "undefined"; }

// ✅ BOOSTERS - CLIENT OCCASIONNEL PEUT VENDRE SANS BOUTIQUE
export const PUBS = {
  boost_24h: { prix: 1, prixUSD: 1, prixCDF: 2300, jours: 1, heures: 24, nom: "Booster 24h Occasionnel - Image only", badge: "⚡", media: "image-only" as const },
  boost_72h: { prix: 2, prixUSD: 2, prixCDF: 4600, jours: 3, heures: 72, nom: "Booster 72h Top - Image only", badge: "🚀", media: "image-only" as const },
  boost_image: { prix: 2, prixUSD: 2, prixCDF: 4600, jours: 5, nom: "Boost Image Boutique", badge: "🖼️", media: "images-videos" as const },
  video_express: { prix: 1, prixUSD: 1, prixCDF: 2300, jours: 2, nom: "Vidéo Express - Payant only", media: "images-videos" as const },
  video_standard: { prix: 3, prixUSD: 3, prixCDF: 6900, jours: 6, nom: "Vidéo Standard - Payant only", media: "images-videos" as const },
  video_mensuelle: { prix: 15, prixUSD: 15, prixCDF: 34500, jours: 30, nom: "Vidéo Mensuelle - Payant only", media: "images-videos" as const },
} as const;

// ✅ SOURCE UNIQUE PRIX - 2 BOUTIQUES + FREEMIUM 3 VIE
export const FORMULES = {
  // Freemium = alternative abonnement - 3 À VIE - Images only - Non vidéo
  freemium: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Freemium 3 à vie", duree: "À vie", jours: 36500, limite: "3 annonces à vie - Images seulement - Non vidéo", annonces: 3, badge: "🆓", regime: "freemium", categorie: "commerces-services", droits: "freemium-3-vie-images-only", media: "image-only" as const },
  client: { prix: 0, prixUSD: 0, prixCDF: 0, nom: "Client / Acheteur", duree: "À vie", jours: 36500, limite: "Recherche illimitée + 1 annonce occasionnelle booster 1$", annonces: 0, badge: "👤", regime: "client", categorie: "client", droits: "client", media: "image-only" as const },
  
  // Boutiques - 5$ / 10$ - Illimité Images + Vidéo + 1 booster/mois gratuit
  commerces_services: { prix: 5, prixUSD: 5, prixCDF: 11500, nom: "Commerces et Services", duree: "30 jours", jours: 30, limite: "Illimité - Images + Vidéo - Électricité, maçon, soudeur, plombier, coiffure", annonces: 9999, badge: "🛍️", regime: "petites-activites", categorie: "commerces-services", droits: "boutique-5-illimite-images-videos", media: "images-videos" as const },
  gros_autres: { prix: 10, prixUSD: 10, prixCDF: 23000, nom: "Gros & Autres", duree: "30 jours", jours: 30, limite: "Illimité - Images + Vidéo - Grossistes, production, import, B2B", annonces: 9999, badge: "🏭", regime: "grossiste", categorie: "gros-autres", droits: "boutique-10-illimite-images-videos", media: "images-videos" as const },

  // Compat ancien code - plus jamais 25$
  pro: { prix: 5, prixUSD: 5, prixCDF: 11500, nom: "Commerces et Services - 5$", duree: "30 jours", jours: 30, limite: "Illimité Images+Vidéo", annonces: 9999, badge: "🛍️", regime: "petites-activites", categorie: "commerces-services", droits: "boutique-5", media: "images-videos" as const },
  grossiste: { prix: 10, prixUSD: 10, prixCDF: 23000, nom: "Gros & Autres - 10$", duree: "30 jours", jours: 30, limite: "Illimité Images+Vidéo", annonces: 9999, badge: "🏭", regime: "grossiste", categorie: "gros-autres", droits: "boutique-10", media: "images-videos" as const },

  occasionnel: { prix: 1, prixUSD: 1, prixCDF: 2300, nom: "Annonce Occasionnelle Booster 24h", duree: "1 jour", jours: 1, limite: "1 annonce / 24h - Image only", annonces: 1, badge: "🎟️", regime: "client", categorie: "client", droits: "occasionnel-booster-24h-image-only", media: "image-only" as const },
  boost: { prix: 2, prixUSD: 2, prixCDF: 4600, nom: "Boost 72h", duree: "3 jours", jours: 3, limite: "Boost top 72h - Image only", annonces: 0, badge: "🚀", regime: "boost", categorie: "commerces-services", droits: "boost-72h", media: "image-only" as const },
} as const;

export type TypeFormule = keyof typeof FORMULES;
export const COMMUNES_KIN = ["Gombe","Lingwala","Kinshasa","Barumbu","Bandalungwa","Ngaliema","Kintambo","Mont Ngafula","Bumbu","Makala","Selembao","Ngaba","Lemba","Matete","Kisenso","Masina","Ndjili","Kimbanseke","Nsele","Maluku","Limete","Ngiri-Ngiri","Kasa-Vubu"] as const;

// ✅ COEUR WENZE 2.0 - LOGIQUE QUE TU AS VALIDÉ
export const checkFreemiumWenze = (user:any, annoncesCount:number) => {
  const now = Date.now();
  const aboDate = user?.abonnementDate ? new Date(user.abonnementDate).getTime() : 0;
  const created = user?.createdAt ? new Date(user.createdAt).getTime() : now;

  // 1. ABONNEMENT PAYÉ ACTIF = ILLIMITÉ + VIDÉO
  if(aboDate){
    const f = (FORMULES as any)[user?.type || user?.plan || "commerces_services"] || FORMULES.commerces_services;
    const expire = aboDate + f.jours * 86400000;
    const joursRestants = Math.ceil((expire - now)/86400000);
    if(joursRestants > 0){
      const type = (user?.type as TypeFormule) || "commerces_services";
      return {
        isPaye: true, isFreemium: false, isEssai7j: false,
        peutPublier: true, canPublish: true, needsPay: false,
        joursRestants: Math.max(0,joursRestants), expireDans: Math.max(0,joursRestants),
        expire: new Date(expire).toISOString(), type, count: annoncesCount,
        annoncesRestantes: 9999, droits: type==="gros_autres" ? "boutique-10-illimite-images-videos" : "boutique-5-illimite-images-videos",
        media: "images-videos" as const, limitVie: 9999, boosterGratuit: 1,
        message: `Actif ${joursRestants}j - Illimité images+vidéos`
      }
    }
  }

  // 2. ESSAI GRATUIT 7J À LA CRÉATION COMPTE PRO - ILLIMITÉ IMAGES ONLY (pour goûter boutique)
  const diffDaysCreation = Math.ceil((now - created)/86400000);
  if(diffDaysCreation <= 7){
    const joursRestants = 7 - diffDaysCreation;
    return {
      isPaye: false, isFreemium: false, isEssai7j: true,
      peutPublier: true, canPublish: true, needsPay: false,
      joursRestants, expireDans: joursRestants, expire: null,
      type: "freemium" as TypeFormule, count: annoncesCount, annoncesRestantes: 9999,
      droits: "essai-7j-gratuit-illimite-images-only", media: "image-only" as const, limitVie: 9999, boosterGratuit: 0,
      message: `Essai gratuit ${joursRestants}j - Publie illimité images only (non vidéo)`
    }
  }

  // 3. APRÈS 7J + SANS ABO = RETOUR FREEMIUM 3 À VIE - IMAGES ONLY - NON VIDÉO
  return {
    isPaye: false, isFreemium: true, isEssai7j: false,
    peutPublier: annoncesCount < 3, canPublish: annoncesCount < 3, needsPay: annoncesCount >= 3,
    joursRestants: 0, expireDans: 0, expire: null,
    type: "freemium" as TypeFormule, count: annoncesCount,
    annoncesRestantes: Math.max(0, 3 - annoncesCount),
    droits: "freemium-3-vie-images-only-non-video", media: "image-only" as const, limitVie: 3, boosterGratuit: 0,
    message: annoncesCount>=3 ? "Freemium 3/3 à vie atteint (images only) - Paye 5$ ou 10$ pour illimité + vidéo" : `Freemium ${annoncesCount}/3 à vie - Images only - Non vidéo - ${3-annoncesCount} restante(s)`
  }
};

export const verifierAbonnement = () => {
  if (!safeWindow()) return { actif:false, isPaye:false, isFreemium:true, isEssai7j:false, type:"freemium" as const, label:"Freemium 3 à vie images only", categorie:"commerces-services", media:"image-only" } as any;
  try {
    const userRaw = localStorage.getItem("wenze_user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
    const myWa = user ? cleanWa(user.ownerWhatsapp||user.whatsapp) : "";
    const myCount = user ? list.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp)===myWa).length : list.length;
    if(!user) return { actif:false, isPaye:false, isFreemium:true, isEssai7j:false, type:"freemium" as const, label:"Freemium 3 à vie", categorie:"commerces-services", media:"image-only", count:myCount, droits:"freemium-3-vie" } as any;
    const f = checkFreemiumWenze(user, myCount);
    return {
      actif: f.peutPublier, isPaye: f.isPaye, isFreemium: f.isFreemium, isEssai7j: f.isEssai7j,
      formule: f.type, type: f.type, label: (FORMULES as any)[f.type]?.nom || f.type,
      expireDans: f.joursRestants, joursRestants: f.joursRestants, regime: f.isPaye ? "payant" : f.isEssai7j ? "essai-7j" : "freemium",
      taux: TAUX_CDF, isPro: f.isPaye, categorie: f.type==="gros_autres" ? "gros-autres" : "commerces-services",
      prixUSD: (FORMULES as any)[f.type]?.prixUSD||0, expire: f.expire, count: f.count, droits: f.droits,
      peutPublier: f.peutPublier, annoncesRestantes: f.annoncesRestantes, media: f.media, needsPay: f.needsPay, message: f.message, boosterGratuit: f.boosterGratuit,
    };
  } catch { return { actif:false, isPaye:false, isFreemium:true, isEssai7j:false, type:"freemium" as const } as any; }
};

export const checkFreemiumLimit = () => {
  const ab = verifierAbonnement();
  return {
    peutPublier: ab.peutPublier, annoncesRestantes: ab.annoncesRestantes, type: ab.type, isPro: ab.isPro, isPaye: ab.isPaye, isFreemium: ab.isFreemium, isEssai7j: ab.isEssai7j,
    regime: ab.regime, taux: TAUX_CDF, count: ab.count, categorie: ab.categorie, needsPay: ab.needsPay, media: ab.media, droits: ab.droits, message: ab.message, boosterGratuit: ab.boosterGratuit
  };
};

export const handlePaiement = (type: string, devise: "$" | "CDF" = "$") => {
  try {
    const raw = String(type).toLowerCase().trim();
    let key: TypeFormule = "commerces_services";
    if (raw.includes("gros") || raw.includes("gros-autres")) key = "gros_autres";
    else if (raw.includes("commerce") || raw==="pro" || raw==="commerces-services" || raw==="5") key = "commerces_services";
    else if (raw==="grossiste" || raw==="10") key = "gros_autres";
    else if (raw==="boost" || raw==="occasionnel" || raw==="1") key = raw.includes("24") || raw==="1" || raw==="occasionnel" ? "occasionnel" : "boost";
    else key = (raw as TypeFormule) in FORMULES ? raw as TypeFormule : "commerces_services";

    const f: any = (FORMULES as any)[key];
    const expire = Date.now() + f.jours * 86400000;
    const transactionId = "WENZE-" + Date.now() + "-" + String(key).toUpperCase() + "-" + Math.random().toString(36).slice(2,6).toUpperCase();

    const paiement: any = {
      success: true, type: key, nom: f.nom, prixUSD: f.prixUSD, prixCDF: f.prixCDF, prix: f.prixUSD, devise,
      date: new Date().toISOString(), expire, actif: true, taux: TAUX_CDF, regime: f.regime, categorie: f.categorie,
      transactionId, droits: f.droits, media: f.media, boosterInclus: key==="commerces_services"||key==="gros_autres"?1:0,
      message: `✅ ${f.nom} activé! ${f.prixUSD}$ / ${f.prixCDF.toLocaleString("fr-FR")} CDF - ${f.droits} - Droits accordés instantanément`,
      confirmation: { titre: "🎉 Paiement confirmé", formule: f.nom, prix: `${f.prixUSD}$ / ${f.prixCDF.toLocaleString("fr-FR")} CDF`, duree: f.duree, jours: f.jours, taux: `${TAUX_CDF} CDF fixe`, transaction: transactionId, expire: new Date(expire).toLocaleDateString("fr-FR"), boutique: `Fonctionnelle - ${f.categorie}`, regime: f.regime, droits: f.droits, media: f.media, message: `✅ ${f.nom} activé - Droits instant` },
    };

    if (safeWindow()) {
      localStorage.setItem("paiement_reussi","true"); localStorage.setItem("type_paye",key); localStorage.setItem("categorie_payee",f.categorie); localStorage.setItem("abonnement_expire",String(expire)); localStorage.setItem("dernier_paiement",JSON.stringify(paiement));
      localStorage.setItem("wenze_abonnement", JSON.stringify({ type:key, categorie:f.categorie, expire, prix:f.prixUSD, prixCDF:f.prixCDF, transactionId, regime:f.regime, droits:f.droits, media:f.media, boosterGratuit:paiement.boosterInclus }));
      try {
        const userRaw = localStorage.getItem("wenze_user");
        if(userRaw){
          const user = JSON.parse(userRaw);
          const isBoutique = key==="commerces_services"||key==="gros_autres"||key==="pro"||key==="grossiste";
          const isBoost = key==="boost"||key==="occasionnel";
          if(isBoutique){
            user.type=key; user.plan=key; user.regime=f.regime; user.categorieId=f.categorie; user.categoriePayee=f.categorie;
            user.annoncesLimite=9999; user.prixFormule=f.prixUSD; user.prixUSD=f.prixUSD; user.prixCDF=f.prixCDF;
            user.abonnement=`${f.nom} ${f.prixUSD}$ / ${f.prixCDF.toLocaleString("fr-FR")} CDF - ${f.jours}j`; user.abonnementDate=new Date().toISOString(); user.abonnementPaye=true; user.estBoutique=true; user.badge=f.badge; user.droits=f.droits; user.media=f.media; user.boosterCredits=(user.boosterCredits||0)+1;
            user.ownerWhatsapp=cleanWa(user.ownerWhatsapp||user.whatsapp);
          }
          if(isBoost){ user.boosterCredits=(user.boosterCredits||0)+1; user.dernierBoost=new Date().toISOString(); user.boostExpire=new Date(expire).toISOString(); }
          localStorage.setItem("wenze_user", JSON.stringify(user));
          const allUsers = JSON.parse(localStorage.getItem("wenze_all_users")||"[]"); const wa = cleanWa(user.ownerWhatsapp||user.whatsapp);
          let idx = allUsers.findIndex((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp)===wa); if(idx>=0) allUsers[idx]={...allUsers[idx], ...user}; else allUsers.push(user); localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
          const logs = JSON.parse(localStorage.getItem("wenze_transactions")||"[]"); logs.push({ id:Date.now().toString(), ...paiement }); localStorage.setItem("wenze_transactions", JSON.stringify(logs));
        }
      } catch {}
    }
    return paiement;
  } catch(e:any){ return { success:false, error:e.message }; }
};

export const getBadgeForUser = (user:any) => {
  if(!user) return "🆓 Freemium 3 à vie - Images only";
  const check = user ? checkFreemiumWenze(user, 0) : null;
  if(check?.isPaye) return check.type==="gros_autres" ? "🏭 Gros 10$ Actif - Illimité images+vidéos" : "🛍️ Services 5$ Actif - Illimité images+vidéos";
  if(check?.isEssai7j) return `⏳ Essai ${check.joursRestants}j gratuit - Illimité images only`;
  return `🆓 Freemium ${check?.count||0}/3 à vie - Images only - Non vidéo`;
};

export const MESSAGE_REGIME_UNIQUE_PAIEMENT = `🆓 Freemium 3 à vie images only non vidéo - ⏳ 7j essai gratuit illimité images only à création pro - 🛍️ 5$ / 11500 CDF illimité images+vidéos - 🏭 10$ / 23000 CDF illimité images+vidéos - 🎟️ Booster occasionnel 1$ / 2300 CDF image only - Taux ${TAUX_CDF} fixe`;
export const PRIX_SUPABASE_RPC = { commerces_services:11500, gros_autres:23000, pro:11500, grossiste:23000, occasionnel:2300, boost_image:4600, boost_24h:2300, boost_72h:4600, video_express:2300, video_standard:6900, video_mensuelle:34500, boost:4600 };
export const getFormuleSecured = (code:string) => (FORMULES as any)[code] || FORMULES.commerces_services;
export const getConfirmationAbonnement = (type:string) => { const key = String(type).toLowerCase().includes("gros") ? "gros_autres" : "commerces_services" as TypeFormule; const f:any=(FORMULES as any)[key]; return { titre:`Confirmer ${f.nom}?`, detail:`${f.prixUSD}$ / ${f.prixCDF.toLocaleString("fr-FR")} CDF`, duree:f.duree, taux:`Taux fixe ${TAUX_CDF}`, regime:f.regime, categorie:f.categorie, droits:f.droits, media:f.media, avantages: key==="gros_autres" ? ["∞ annonces gros", "Boutique gros 10$", "Badge 🏭", "Images+Vidéo", "1 booster/mois"] : ["∞ annonces", "Boutique 5$", "Badge 🛍️", "Images+Vidéo", "1 booster/mois", "Taux 2300"] }; };
export const getSoldeWPay = () => { try { if(!safeWindow()) return 0; return parseInt(localStorage.getItem("wenze_wallet_solde")||"0"); } catch { return 0; } };
export const ajouterSolde = (m:number) => { try { if(!safeWindow()) return 0; const a=getSoldeWPay(); const n=a+m; localStorage.setItem("wenze_wallet_solde",String(n)); return n; } catch { return 0; } };
