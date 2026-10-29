"use client";

// lib/paiement.ts - V32 EXPERT BUILD VERT - WENZE WENZE BUSINESS
// Freemium 3 vie images only + Essai 7j + 5$/10$ + Boost 1$ + Pub Vidéo 1$/3$/15$ + J-5 J-1 + 0% comm

export const TAUX_CDF = 2300;

export function toCDF(usd: number){
  return Math.round((usd || 0) * TAUX_CDF);
}
export function toUSD(cdf: number){
  return Math.round((cdf || 0) / TAUX_CDF);
}
export function toCDFString(usd: number){
  return toCDF(usd).toLocaleString("fr-FR")+" CDF";
}
export function toUSDString(usd: number){
  return usd+" $";
}
export function formatPrix(usd: number){
  if(usd === 0) return "Gratuit";
  return usd+"$ / "+toCDFString(usd);
}

function cleanWa(n: any){
  return (n || "").toString().replace(/[^0-9]/g,"");
}
function safeWindow(){
  return typeof window !== "undefined";
}
function safeGet(key:string){
  try{
    if(typeof window === "undefined") return null;
    return localStorage.getItem(key);
  }catch{ return null; }
}
function safeSet(key:string, val:string){
  try{
    if(typeof window === "undefined") return;
    localStorage.setItem(key, val);
  }catch{}
}
function safeParse(key:string){
  try{
    const raw = safeGet(key);
    if(!raw) return [];
    return JSON.parse(raw);
  }catch{ return []; }
}

// ✅ BOOSTS WENZE
export const BOOSTS_WENZE = [
  { id:"boost-1", prix:1, prixUSD:1, prixCDF:2300, jours:1, dureeJ:1, heures:24, label:"Boost 24h TOP", nom:"Boost 24h TOP - Occasionnel", badge:"⚡", type:"annonce", desc:"TOP feed 24h + 🔔 notif à tous les clients + rappel 24h avant fin", media:"image-only" },
  { id:"boost-3", prix:3, prixUSD:3, prixCDF:6900, jours:3, dureeJ:3, heures:72, label:"Boost 3 jours", nom:"Boost 3j - Top", badge:"🚀", type:"annonce", desc:"TOP feed 3j + 🔔 notif clients + rappel J-1", media:"image-only" },
  { id:"boost-7", prix:5, prixUSD:5, prixCDF:11500, jours:7, dureeJ:7, heures:168, label:"Boost 7 jours MAX", nom:"Boost 7j MAX", badge:"🔥", type:"annonce", desc:"TOP feed 7j MAX + 🔔 notif clients + rappel J-1 + badge 🚀", media:"image-only" },
];

// ✅ PUBS VIDEO
export const PUBS_VIDEO = [
  { id:"video_express", prix:1, prixUSD:1, prixCDF:2300, jours:2, dureeJ:2, label:"Vidéo Express 2j", nom:"Vidéo Express - Payant only", badge:"🎬", desc:"Vidéo TOP sur /video 2j + page accueil + 🔔 notif clients + rappel J-1", media:"images-videos" },
  { id:"video_standard", prix:3, prixUSD:3, prixCDF:6900, jours:6, dureeJ:6, label:"Vidéo Standard 6j", nom:"Vidéo Standard", badge:"🎬", desc:"Vidéo TOP 6j + 🔔 notif clients + rappel J-1", media:"images-videos" },
  { id:"video_mensuelle", prix:15, prixUSD:15, prixCDF:34500, jours:30, dureeJ:30, label:"Vidéo Mensuelle 30j", nom:"Vidéo Mensuelle", badge:"🎥", desc:"Vidéo TOP 30j + 🔔 notif clients + rappel J-5 J-1 + badge vidéo", media:"images-videos" },
  { id:"pub-7j", prix:5, prixUSD:5, prixCDF:11500, jours:7, dureeJ:7, label:"Pub Vidéo 7j", nom:"Pub Vidéo 7j", badge:"📢", desc:"Pub vidéo TOP 7j /video + 🔔 broadcast + rappel J-1", media:"images-videos" },
];

// ✅ Compat ancien code - SANS reduce spread qui plantait build
export const PUBS: any = {
  boost_24h: { prix:1, prixUSD:1, prixCDF:2300, jours:1, heures:24, id:"boost-1", label:"Boost 24h", nom:"Booster 24h Occasionnel - Image only", badge:"⚡", media:"image-only", dureeJ:1, desc:"TOP 24h + notif clients" },
  boost_72h: { prix:2, prixUSD:2, prixCDF:4600, jours:3, heures:72, id:"boost-3", label:"Boost 3j", nom:"Booster 72h Top - Image only", badge:"🚀", media:"image-only", dureeJ:3, desc:"TOP 3j + notif clients" },
  boost_image: { prix:2, prixUSD:2, prixCDF:4600, jours:5, id:"boost-7", label:"Boost 7j", nom:"Boost Image Boutique", badge:"🖼️", media:"images-videos", dureeJ:7, desc:"TOP 7j + notif" },
  video_express: { prix:1, prixUSD:1, prixCDF:2300, jours:2, id:"video_express", label:"Vidéo Express 2j", nom:"Vidéo Express - Payant only", badge:"🎬", media:"images-videos", dureeJ:2, desc:"Vidéo TOP 2j" },
  video_standard: { prix:3, prixUSD:3, prixCDF:6900, jours:6, id:"video_standard", label:"Vidéo Standard 6j", nom:"Vidéo Standard - Payant only", badge:"🎬", media:"images-videos", dureeJ:6, desc:"Vidéo TOP 6j" },
  video_mensuelle: { prix:15, prixUSD:15, prixCDF:34500, jours:30, id:"video_mensuelle", label:"Vidéo Mensuelle 30j", nom:"Vidéo Mensuelle - Payant only", badge:"🎥", media:"images-videos", dureeJ:30, desc:"Vidéo TOP 30j" },
};

export const PUBS_LIST = PUBS_VIDEO.slice();
export const BOOSTS_LIST = BOOSTS_WENZE.slice();

// ✅ FORMULES SOURCE UNIQUE
export const FORMULES = {
  freemium: { prix:0, prixUSD:0, prixCDF:0, nom:"Freemium 3 à vie", duree:"À vie", jours:36500, limite:"3 annonces à vie - Images seulement - Non vidéo", annonces:3, badge:"🆓", regime:"freemium", categorie:"commerces-services", droits:"freemium-3-vie-images-only", media:"image-only" },
  client: { prix:0, prixUSD:0, prixCDF:0, nom:"Client / Acheteur", duree:"À vie", jours:36500, limite:"Recherche illimitée + 1 annonce occasionnelle booster 1$", annonces:0, badge:"👤", regime:"client", categorie:"client", droits:"client", media:"image-only" },
  commerces_services: { prix:5, prixUSD:5, prixCDF:11500, nom:"Commerces et Services", duree:"30 jours", jours:30, limite:"Illimité - Images + Vidéo - Électricité, maçon, soudeur, plombier, coiffure", annonces:9999, badge:"🛍️", regime:"petites-activites", categorie:"commerces-services", droits:"boutique-5-illimite-images-videos", media:"images-videos" },
  gros_autres: { prix:10, prixUSD:10, prixCDF:23000, nom:"Gros & Autres", duree:"30 jours", jours:30, limite:"Illimité - Images + Vidéo - Grossistes, production, import, B2B", annonces:9999, badge:"🏭", regime:"grossiste", categorie:"gros-autres", droits:"boutique-10-illimite-images-videos", media:"images-videos" },
  pro: { prix:5, prixUSD:5, prixCDF:11500, nom:"Commerces et Services - 5$", duree:"30 jours", jours:30, limite:"Illimité Images+Vidéo", annonces:9999, badge:"🛍️", regime:"petites-activites", categorie:"commerces-services", droits:"boutique-5", media:"images-videos" },
  grossiste: { prix:10, prixUSD:10, prixCDF:23000, nom:"Gros & Autres - 10$", duree:"30 jours", jours:30, limite:"Illimité Images+Vidéo", annonces:9999, badge:"🏭", regime:"grossiste", categorie:"gros-autres", droits:"boutique-10", media:"images-videos" },
  occasionnel: { prix:1, prixUSD:1, prixCDF:2300, nom:"Annonce Occasionnelle Booster 24h", duree:"1 jour", jours:1, limite:"1 annonce / 24h - Image only", annonces:1, badge:"🎟️", regime:"client", categorie:"client", droits:"occasionnel-booster-24h-image-only", media:"image-only" },
  boost: { prix:2, prixUSD:2, prixCDF:4600, nom:"Boost 72h", duree:"3 jours", jours:3, limite:"Boost top 72h - Image only", annonces:0, badge:"🚀", regime:"boost", categorie:"commerces-services", droits:"boost-72h", media:"image-only" },
} as const;

export type TypeFormule = keyof typeof FORMULES;

export function getPrixByCategorie(cat: string){
  const c = (cat || "").toLowerCase();
  if(c.indexOf("gros") >=0 || c.indexOf("gros-autres") >=0){
    return { prixUSD:10, prixCDF:23000, prix:10, categorie:"gros-autres", label:"Gros & Autres 10$" };
  }
  return { prixUSD:5, prixCDF:11500, prix:5, categorie:"commerces-services", label:"Commerces et Services 5$" };
}

export function activerAbonnement(prixUSD: number, prixCDF: number){
  if(!safeWindow()) return new Date().toISOString();
  const expireAt = new Date(Date.now()+30*86400000).toISOString();
  const expireMs = new Date(expireAt).getTime();
  try{
    const raw = safeGet("wenze_abonnement");
    const existing = raw ? JSON.parse(raw) : {};
    const data = Object.assign({}, existing, {
      type: prixUSD>=10?"gros_autres":"commerces_services",
      categorie: prixUSD>=10?"gros-autres":"commerces-services",
      prix:prixUSD, prixUSD: prixUSD, prixCDF: prixCDF,
      expire:expireMs, expireAt: expireAt,
      createdAt:new Date().toISOString(), actif:true
    });
    safeSet("wenze_abonnement", JSON.stringify(data));
    safeSet("abonnement_expire", String(expireMs));
    safeSet("abonnement_expire_iso", expireAt);
  }catch{}
  return expireAt;
}

export const COMMUNES_KIN = ["Gombe","Lingwala","Kinshasa","Barumbu","Bandalungwa","Ngaliema","Kintambo","Mont Ngafula","Bumbu","Makala","Selembao","Ngaba","Lemba","Matete","Kisenso","Masina","Ndjili","Kimbanseke","Nsele","Maluku","Limete","Ngiri-Ngiri","Kasa-Vubu"] as const;

export function checkFreemiumWenze(user:any, annoncesCount:number){
  const now = Date.now();
  let aboDate = 0;
  if(user && user.abonnementDate){
    try{ aboDate = new Date(user.abonnementDate).getTime(); }catch{ aboDate = 0; }
  }
  let created = now;
  if(user && user.createdAt){
    try{ created = new Date(user.createdAt).getTime(); }catch{ created = now; }
  }
  if(aboDate){
    const planKey = (user && (user.type || user.plan)) || "commerces_services";
    const f:any = (FORMULES as any)[planKey] || FORMULES.commerces_services;
    const expire = aboDate + f.jours * 86400000;
    const joursRestants = Math.ceil((expire - now)/86400000);
    if(joursRestants > 0){
      const type = (user && user.type) ? user.type as TypeFormule : "commerces_services" as TypeFormule;
      return { isPaye:true, isFreemium:false, isEssai7j:false, peutPublier:true, canPublish:true, needsPay:false, joursRestants: Math.max(0,joursRestants), expireDans: Math.max(0,joursRestants), expire:new Date(expire).toISOString(), expireAt:new Date(expire).toISOString(), type: type, count:annoncesCount, annoncesRestantes:9999, droits: type==="gros_autres"?"boutique-10-illimite-images-videos":"boutique-5-illimite-images-videos", media:"images-videos", limitVie:9999, boosterGratuit:1, message:"Actif "+joursRestants+"j - Illimité images+vidéos" };
    }
  }
  const diffDaysCreation = Math.ceil((now - created)/86400000);
  if(diffDaysCreation <= 7){
    const joursRestants = 7 - diffDaysCreation;
    return { isPaye:false, isFreemium:false, isEssai7j:true, peutPublier:true, canPublish:true, needsPay:false, joursRestants: joursRestants, expireDans:joursRestants, expire:null, expireAt:null, type:"freemium" as TypeFormule, count:annoncesCount, annoncesRestantes:9999, droits:"essai-7j-gratuit-illimite-images-only", media:"image-only", limitVie:9999, boosterGratuit:0, message:"Essai gratuit "+joursRestants+"j - Publie illimité images only (non vidéo)" };
  }
  const peut = annoncesCount < 3;
  return { isPaye:false, isFreemium:true, isEssai7j:false, peutPublier:peut, canPublish:peut, needsPay:annoncesCount>=3, joursRestants:0, expireDans:0, expire:null, expireAt:null, type:"freemium" as TypeFormule, count:annoncesCount, annoncesRestantes: Math.max(0,3-annoncesCount), droits:"freemium-3-vie-images-only-non-video", media:"image-only", limitVie:3, boosterGratuit:0, message: annoncesCount>=3 ? "Freemium 3/3 à vie atteint (images only) - Paye 5$ ou 10$ pour illimité + vidéo" : "Freemium "+annoncesCount+"/3 à vie - Images only - Non vidéo - "+(3-annoncesCount)+" restante(s)" };
}

export function verifierAbonnement(){
  if (!safeWindow()) return { actif:false, isPaye:false, isFreemium:true, isEssai7j:false, type:"freemium", label:"Freemium 3 à vie images only", categorie:"commerces-services", media:"image-only" } as any;
  try {
    const userRaw = safeGet("wenze_user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    const list = safeParse("wenze_annonces_list");
    let myWa = "";
    if(user) myWa = cleanWa(user.ownerWhatsapp || user.whatsapp);
    let myCount = 0;
    if(user){
      for(let i=0;i<list.length;i++){
        const a = list[i];
        if(cleanWa(a.ownerWhatsapp || a.whatsapp) === myWa) myCount++;
      }
    } else {
      myCount = list.length;
    }
    if(!user) return { actif:false, isPaye:false, isFreemium:true, isEssai7j:false, type:"freemium", label:"Freemium 3 à vie", categorie:"commerces-services", media:"image-only", count:myCount, droits:"freemium-3-vie", expireAt:null } as any;
    const f = checkFreemiumWenze(user, myCount);
    return { actif:f.peutPublier, isPaye:f.isPaye, isFreemium:f.isFreemium, isEssai7j:f.isEssai7j, formule:f.type, type:f.type, label:(FORMULES as any)[f.type] ? (FORMULES as any)[f.type].nom : f.type, expireDans:f.joursRestants, joursRestants:f.joursRestants, regime:f.isPaye?"payant":f.isEssai7j?"essai-7j":"freemium", taux:TAUX_CDF, isPro:f.isPaye, categorie:f.type==="gros_autres"?"gros-autres":"commerces-services", prixUSD:(FORMULES as any)[f.type] ? (FORMULES as any)[f.type].prixUSD : 0, expire:f.expire, expireAt:f.expireAt, count:f.count, droits:f.droits, peutPublier:f.peutPublier, annoncesRestantes:f.annoncesRestantes, media:f.media, needsPay:f.needsPay, message:f.message, boosterGratuit:f.boosterGratuit };
  } catch { return { actif:false, isPaye:false, isFreemium:true, isEssai7j:false, type:"freemium", expireAt:null } as any; }
}

export function checkFreemiumLimit(){
  const ab = verifierAbonnement();
  return { peutPublier:ab.peutPublier, annoncesRestantes:ab.annoncesRestantes, type:ab.type, isPro:ab.isPro, isPaye:ab.isPaye, isFreemium:ab.isFreemium, isEssai7j:ab.isEssai7j, regime:ab.regime, taux:TAUX_CDF, count:ab.count, categorie:ab.categorie, needsPay:ab.needsPay, media:ab.media, droits:ab.droits, message:ab.message, boosterGratuit:ab.boosterGratuit, expireAt:ab.expireAt };
}

export function handlePaiement(type: string, devise: "$" | "CDF" = "$"){
  try {
    const raw = String(type).toLowerCase().trim();
    let key: TypeFormule = "commerces_services";
    if (raw.indexOf("gros") >=0 || raw.indexOf("gros-autres") >=0) key = "gros_autres";
    else if (raw.indexOf("commerce") >=0 || raw==="pro" || raw==="commerces-services" || raw==="5") key = "commerces_services";
    else if (raw==="grossiste" || raw==="10") key = "gros_autres";
    else if (raw==="boost" || raw==="occasionnel" || raw==="1") key = (raw.indexOf("24") >=0 || raw==="1" || raw==="occasionnel") ? "occasionnel" : "boost";
    else if (raw.indexOf("video") >=0 || raw.indexOf("pub") >=0) key = (raw.indexOf("mensuelle")>=0 || raw.indexOf("30")>=0 || raw.indexOf("15")>=0) ? "gros_autres" : "commerces_services";
    else {
      if((FORMULES as any)[raw]) key = raw as TypeFormule;
      else key = "commerces_services";
    }
    const f:any = (FORMULES as any)[key];
    const expireMs = Date.now() + f.jours * 86400000;
    const expireAt = new Date(expireMs).toISOString();
    const transactionId = "WENZE-" + Date.now() + "-" + String(key).toUpperCase() + "-" + Math.random().toString(36).slice(2,6).toUpperCase();
    const paiement:any = { success:true, type:key, nom:f.nom, prixUSD:f.prixUSD, prixCDF:f.prixCDF, prix:f.prixUSD, devise: devise, date:new Date().toISOString(), expire:expireMs, expireAt:expireAt, actif:true, taux:TAUX_CDF, regime:f.regime, categorie:f.categorie, transactionId:transactionId, droits:f.droits, media:f.media, boosterInclus: (key==="commerces_services"||key==="gros_autres")?1:0, message:"✅ "+f.nom+" activé! "+f.prixUSD+"$ / "+f.prixCDF.toLocaleString("fr-FR")+" CDF - "+f.droits+" - Droits accordés instantanément + Rappel J-5 J-1" };
    if (safeWindow()) {
      safeSet("paiement_reussi","true");
      safeSet("type_paye",key);
      safeSet("categorie_payee",f.categorie);
      safeSet("abonnement_expire",String(expireMs));
      safeSet("abonnement_expire_iso",expireAt);
      safeSet("wenze_abonnement", JSON.stringify({ type:key, categorie:f.categorie, expire:expireMs, expireAt:expireAt, prix:f.prixUSD, prixCDF:f.prixCDF, transactionId:transactionId, regime:f.regime, droits:f.droits, media:f.media, boosterGratuit:paiement.boosterInclus, createdAt:new Date().toISOString() }));
      try {
        const userRaw = safeGet("wenze_user");
        if(userRaw){
          const user = JSON.parse(userRaw);
          const isBoutique = key==="commerces_services"||key==="gros_autres"||key==="pro"||key==="grossiste";
          const isBoost = key==="boost"||key==="occasionnel";
          if(isBoutique){
            user.type=key; user.plan=key; user.regime=f.regime; user.categorieId=f.categorie; user.categoriePayee=f.categorie; user.annoncesLimite=9999; user.prixFormule=f.prixUSD; user.prixUSD=f.prixUSD; user.prixCDF=f.prixCDF; user.abonnement=f.nom+" "+f.prixUSD+"$ / "+f.prixCDF.toLocaleString("fr-FR")+" CDF - "+f.jours+"j"; user.abonnementDate=new Date().toISOString(); user.abonnementPaye=true; user.estBoutique=true; user.badge=f.badge; user.droits=f.droits; user.media=f.media; user.boosterCredits=(user.boosterCredits||0)+1; user.ownerWhatsapp=cleanWa(user.ownerWhatsapp||user.whatsapp);
          }
          if(isBoost){ user.boosterCredits=(user.boosterCredits||0)+1; user.dernierBoost=new Date().toISOString(); user.boostExpire=new Date(expireMs).toISOString(); }
          safeSet("wenze_user", JSON.stringify(user));
          const allUsers = safeParse("wenze_all_users");
          const wa = cleanWa(user.ownerWhatsapp||user.whatsapp);
          let idx = -1;
          for(let i=0;i<allUsers.length;i++){ if(cleanWa(allUsers[i].ownerWhatsapp||allUsers[i].whatsapp)===wa){ idx=i; break; } }
          if(idx>=0) allUsers[idx]=Object.assign({}, allUsers[idx], user);
          else allUsers.push(user);
          safeSet("wenze_all_users", JSON.stringify(allUsers));
          const logs = safeParse("wenze_transactions");
          logs.push({ id:Date.now().toString(), ...paiement });
          safeSet("wenze_transactions", JSON.stringify(logs));
        }
      } catch {}
    }
    return paiement;
  } catch(e:any){ return { success:false, error:e.message }; }
}

export function getBadgeForUser(user:any){
  if(!user) return "🆓 Freemium 3 à vie - Images only";
  const check = checkFreemiumWenze(user, 0);
  if(check && check.isPaye){
    if(check.type==="gros_autres") return "🏭 Gros 10$ Actif - Illimité images+vidéos";
    return "🛍️ Services 5$ Actif - Illimité images+vidéos";
  }
  if(check && check.isEssai7j) return "⏳ Essai "+check.joursRestants+"j gratuit - Illimité images only";
  return "🆓 Freemium "+(check ? check.count : 0)+"/3 à vie - Images only - Non vidéo";
}

export const MESSAGE_REGIME_UNIQUE_PAIEMENT = "🆓 Freemium 3 à vie images only non vidéo - ⏳ 7j essai gratuit illimité images only à création pro - 🛍️ 5$ / 11500 CDF illimité images+vidéos - 🏭 10$ / 23000 CDF illimité images+vidéos - 🎟️ Booster occasionnel 1$ / 2300 CDF image only - 🎬 Pub Vidéo 1$/3$/15$ - Taux 2300 fixe";
export const PRIX_SUPABASE_RPC = { commerces_services:11500, gros_autres:23000, pro:11500, grossiste:23000, occasionnel:2300, boost_image:4600, boost_24h:2300, boost_72h:4600, video_express:2300, video_standard:6900, video_mensuelle:34500, boost:4600 };

export function getFormuleSecured(code:string){
  if((FORMULES as any)[code]) return (FORMULES as any)[code];
  return FORMULES.commerces_services;
}
export function getConfirmationAbonnement(type:string){
  const lower = String(type).toLowerCase();
  let key:TypeFormule = "commerces_services";
  if(lower.indexOf("gros") >=0) key = "gros_autres";
  const f:any=(FORMULES as any)[key];
  return { titre:"Confirmer "+f.nom+"?", detail:f.prixUSD+"$ / "+f.prixCDF.toLocaleString("fr-FR")+" CDF", duree:f.duree, taux:"Taux fixe "+TAUX_CDF, regime:f.regime, categorie:f.categorie, droits:f.droits, media:f.media, avantages: key==="gros_autres" ? ["∞ annonces gros", "Boutique gros 10$", "Badge 🏭", "Images+Vidéo", "1 booster/mois"] : ["∞ annonces", "Boutique 5$", "Badge 🛍️", "Images+Vidéo", "1 booster/mois", "Taux 2300"] };
}
export function getSoldeWPay(){
  try { if(!safeWindow()) return 0; const v = safeGet("wenze_wallet_solde"); return v ? parseInt(v) : 0; } catch { return 0; }
}
export function ajouterSolde(m:number){
  try { if(!safeWindow()) return 0; const a=getSoldeWPay(); const n=a+m; safeSet("wenze_wallet_solde",String(n)); return n; } catch { return 0; }
   }
