// lib/paiement.ts - V5 FINAL - TONMARCHÉ.CD 100% PUB - 0% COMMISSION
// Politique: 3 images à vie Freemium 30j puis Caché - 3 Paliers $ - Client Occasionnel 0.2$
// Expert - Build Vert Garanti

export const TAUX_CDF = 2300;

// ========== HELPERS PRIX ==========
export function toCDF(usd: number){ return Math.round((usd || 0) * TAUX_CDF); }
export function toUSD(cdf: number){ return Math.round((cdf || 0) / TAUX_CDF); }
export function toCDFString(usd: number){ return toCDF(usd).toLocaleString("fr-FR")+" CDF"; }
export function toUSDString(usd: number){ return usd+" $"; }
export function formatPrix(usd: number){
  if(usd === 0) return "Gratuit";
  return `${usd}$ / ${toCDFString(usd)}`;
}

function cleanWa(n: any){ return (n || "").toString().replace(/[^0-9]/g,""); }
function safeWindow(){ return typeof window !== "undefined"; }
function safeGet(key:string){ try{ if(!safeWindow()) return null; return localStorage.getItem(key);}catch{ return null; } }
function safeSet(key:string, val:string){ try{ if(!safeWindow()) return; localStorage.setItem(key,val);}catch{} }
function safeParse(key:string){ try{ const r=safeGet(key); return r?JSON.parse(r):[];}catch{ return []; } }

// ========== 1. FREEMIUM OFFICIEL ==========
export const FREEMIUM = {
  id: "freemium",
  nom: "Freemium Découverte",
  maxImages: 3,
  maxImagesLabel: "3 images à vie",
  dureeJours: 30,
  dureeLabel: "30 jours",
  apres: "cache" as const,
  prix: 0,
  badge: "🆓",
  droits: "freemium-3-vie-30j",
  message: "3 images à vie, visible 30j, puis compte caché jusqu'à achat pub",
} as const;

// ========== 2. LES 3 PALIERS PUB - MEME PRIX DETAIL/GROS/PRESTA ==========
export type PalierId = "STANDARD" | "PRO" | "PREMIUM";
export type DureeId = "1j" | "7j" | "30j";

export interface PalierConfig {
  id: PalierId;
  nom: string;
  imagesMin: number;
  imagesMax: number;
  videos: string;
  videoCount: number;
  videoDuree: string;
  prix: Record<DureeId, number>;
  jours: Record<DureeId, number>;
  badge: string;
  limiteActives: number;
}

export const PALIERS: Record<PalierId, PalierConfig> = {
  STANDARD: {
    id: "STANDARD",
    nom: "STANDARD - Vente Flash",
    imagesMin: 1,
    imagesMax: 4,
    videos: "1 vidéo 15s",
    videoCount: 1,
    videoDuree: "15s",
    prix: { "1j": 0.5, "7j": 2.5, "30j": 5 },
    jours: { "1j": 1, "7j": 7, "30j": 30 },
    badge: "⭐",
    limiteActives: 50,
  },
  PRO: {
    id: "PRO",
    nom: "PRO - Boutique Active",
    imagesMin: 5,
    imagesMax: 10,
    videos: "1 vidéo 60s",
    videoCount: 1,
    videoDuree: "60s",
    prix: { "1j": 1, "7j": 5, "30j": 10 },
    jours: { "1j": 1, "7j": 7, "30j": 30 },
    badge: "🚀",
    limiteActives: 50,
  },
  PREMIUM: {
    id: "PREMIUM",
    nom: "PREMIUM - Gros Vendeur",
    imagesMin: 11,
    imagesMax: 30,
    videos: "2 vidéos 60s",
    videoCount: 2,
    videoDuree: "60s",
    prix: { "1j": 1.5, "7j": 10, "30j": 20 },
    jours: { "1j": 1, "7j": 7, "30j": 30 },
    badge: "👑",
    limiteActives: 50,
  },
};

// ========== 3. COMPTE CLIENT OCCASIONNEL - PAS DE FREEMIUM ==========
export const OCCASIONNEL = {
  id: "OCCASIONNEL",
  nom: "Vente Occasionnelle Client",
  offres: [
    { id: "occ-1img-1j", label: "1 image / 1 jour", images: 1, jours: 1, prixUSD: 0.2, prixCDF: 460, badge: "🎟️" },
    { id: "occ-1img-7j", label: "1 image / 7 jours", images: 1, jours: 7, prixUSD: 1, prixCDF: 2300, badge: "🎟️" },
    { id: "occ-3img-1j", label: "3 images / 1 jour", images: 3, jours: 1, prixUSD: 0.5, prixCDF: 1150, badge: "🎟️" },
    { id: "occ-3img-7j", label: "3 images / 7 jours", images: 3, jours: 7, prixUSD: 2.5, prixCDF: 5750, badge: "🎟️" },
    { id: "occ-video-1j", label: "1 vidéo 15s / 1 jour", images: 0, jours: 1, prixUSD: 0.5, prixCDF: 1150, badge: "🎬" },
    { id: "occ-video-7j", label: "1 vidéo 15s / 7 jours", images: 0, jours: 7, prixUSD: 2.5, prixCDF: 5750, badge: "🎬" },
  ]
} as const;

// ========== 4. LOGIQUE CACHE / FREEMIUM ==========
export function isCompteCache(user: any): boolean {
  if(!user) return false;
  // Si palier actif, jamais caché
  if(user.palierExpireAt){
    const exp = new Date(user.palierExpireAt).getTime();
    if(exp > Date.now()) return false;
  }
  if(user.abonnementExpireAt){
    const exp = new Date(user.abonnementExpireAt).getTime();
    if(exp > Date.now()) return false;
  }
  // Sinon, check 30j depuis création
  let created = Date.now();
  if(user.createdAt){ try{ created = new Date(user.createdAt).getTime(); }catch{} }
  const diffJ = (Date.now() - created) / 86400000;
  return diffJ > FREEMIUM.dureeJours;
}

export function getImagesRestantesFreemium(user: any, annoncesCount: number){
  // Nombre d'images à vie déjà publiées = annoncesCount (tu comptes images pas annonces)
  return Math.max(0, FREEMIUM.maxImages - annoncesCount);
}

export function checkFreemiumWenze(user: any, annoncesCount: number){
  const now = Date.now();
  let created = now;
  if(user?.createdAt){ try{ created = new Date(user.createdAt).getTime(); }catch{} }
  
  const diffJ = Math.ceil((now - created)/86400000);
  const joursRestantsFreemium = Math.max(0, FREEMIUM.dureeJours - diffJ);
  
  // 1. Check palier payant actif
  let palierExpire = 0;
  let palierActif: PalierId | null = null;
  if(user?.palierExpireAt && user?.palierId){
    try{ palierExpire = new Date(user.palierExpireAt).getTime(); palierActif = user.palierId as PalierId; }catch{}
  }
  if(palierExpire > now && palierActif){
    const joursRestants = Math.ceil((palierExpire - now)/86400000);
    const config = PALIERS[palierActif];
    return {
      isPaye: true, isFreemium: false, isCache: false,
      peutPublier: annoncesCount < config.limiteActives,
      palierId: palierActif, palier: config,
      joursRestants, expireAt: new Date(palierExpire).toISOString(),
      annoncesRestantes: config.limiteActives - annoncesCount,
      imagesRestantes: 9999,
      message: `${config.badge} ${config.nom} actif - ${joursRestants}j restants - ${config.imagesMax} images max`,
      badge: config.badge,
      type: palierActif,
    };
  }

  // 2. Check freemium dans les 30j
  if(diffJ <= FREEMIUM.dureeJours){
    const imagesRest = getImagesRestantesFreemium(user, annoncesCount);
    return {
      isPaye: false, isFreemium: true, isCache: false,
      peutPublier: imagesRest > 0,
      palierId: null, palier: null,
      joursRestants: joursRestantsFreemium,
      expireAt: new Date(created + FREEMIUM.dureeJours*86400000).toISOString(),
      annoncesRestantes: imagesRest,
      imagesRestantes: imagesRest,
      message: imagesRest>0 ? `🆓 Freemium ${annoncesCount}/${FREEMIUM.maxImages} - ${joursRestantsFreemium}j restants` : `🆓 Freemium 3/3 atteint - Paye un palier pour continuer`,
      badge: "🆓",
      type: "freemium",
    };
  }

  // 3. Mode caché
  return {
    isPaye: false, isFreemium: false, isCache: true,
    peutPublier: false,
    palierId: null, palier: null,
    joursRestants: 0,
    expireAt: null,
    annoncesRestantes: 0,
    imagesRestantes: 0,
    message: `🔒 Compte caché - Freemium 30j expiré - Paye 5$ pour réapparaître`,
    badge: "🔒",
    type: "cache",
  };
}

// ========== 5. VERIFICATION GLOBALE ==========
export function verifierAbonnement(){
  if(!safeWindow()) return { isPaye:false, isFreemium:true, isCache:false, peutPublier:false, type:"freemium" } as any;
  try{
    const userRaw = safeGet("wenze_user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    const list = safeParse("wenze_annonces_list");
    let myWa = user ? cleanWa(user.ownerWhatsapp || user.whatsapp) : "";
    let myCount = 0;
    if(user){
      for(let i=0;i<list.length;i++){ if(cleanWa(list[i].ownerWhatsapp || list[i].whatsapp)===myWa) myCount++; }
    }else{ myCount = list.length; }
    if(!user) return { isPaye:false, isFreemium:true, isCache:false, peutPublier: myCount<3, count:myCount, type:"freemium", badge:"🆓", message:"Crée un compte pour 3 images gratuites" } as any;
    const check = checkFreemiumWenze(user, myCount);
    return { ...check, count:myCount, actif:check.peutPublier, label: check.palier?.nom || FREEMIUM.nom };
  }catch{ return { isPaye:false, isFreemium:true, isCache:false, peutPublier:false, type:"freemium", message:"Erreur vérif" } as any; }
}

export function checkFreemiumLimit(){ return verifierAbonnement(); }

// ========== 6. ACTIVATION PALIER PUB ==========
export function activerPalier(palierId: PalierId, dureeId: DureeId, devise: "$"|"CDF"="$"){
  if(!safeWindow()) return { success:false, error:"No window" };
  const palier = PALIERS[palierId];
  if(!palier) return { success:false, error:"Palier inconnu" };
  const prixUSD = palier.prix[dureeId];
  const jours = palier.jours[dureeId];
  const expireAt = new Date(Date.now()+jours*86400000).toISOString();
  const expireMs = new Date(expireAt).getTime();
  const transactionId = `WENZE-${palierId}-${dureeId}-${Date.now()}`;

  try{
    const userRaw = safeGet("wenze_user");
    if(!userRaw) return { success:false, error:"Pas de user" };
    const user = JSON.parse(userRaw);
    user.palierId = palierId;
    user.palierNom = palier.nom;
    user.palierDuree = dureeId;
    user.palierExpireAt = expireAt;
    user.palierExpireMs = expireMs;
    user.abonnementExpireAt = expireAt; // compat ancien code
    user.prixUSD = prixUSD;
    user.prixCDF = toCDF(prixUSD);
    user.badge = palier.badge;
    user.isCache = false;
    user.type = palierId.toLowerCase();
    user.plan = palierId;
    safeSet("wenze_user", JSON.stringify(user));

    const all = safeParse("wenze_all_users");
    const wa = cleanWa(user.ownerWhatsapp || user.whatsapp);
    let idx = all.findIndex((u:any)=>cleanWa(u.ownerWhatsapp||u.whatsapp)===wa);
    if(idx>=0) all[idx]=user; else all.push(user);
    safeSet("wenze_all_users", JSON.stringify(all));

    const abonnement = { type: palierId, palierId, dureeId, expire: expireMs, expireAt, prix: prixUSD, prixUSD, prixCDF: toCDF(prixUSD), transactionId, actif:true, createdAt: new Date().toISOString() };
    safeSet("wenze_abonnement", JSON.stringify(abonnement));
    safeSet("abonnement_expire", String(expireMs));
    safeSet("abonnement_expire_iso", expireAt);

    const logs = safeParse("wenze_transactions");
    logs.push({ id: transactionId, ...abonnement, success:true });
    safeSet("wenze_transactions", JSON.stringify(logs));

    return { success:true, palierId, dureeId, prixUSD, prixCDF: toCDF(prixUSD), expireAt, transactionId, message: `✅ ${palier.nom} ${dureeId} activé - ${prixUSD}$ - expire ${expireAt}` };
  }catch(e:any){ return { success:false, error:e.message }; }
}

// Compat ancien handlePaiement pour ne pas casser autres pages
export function handlePaiement(type: string){
  const raw = type.toUpperCase();
  if(raw.includes("STANDARD")) return activerPalier("STANDARD","30j");
  if(raw.includes("PRO")) return activerPalier("PRO","30j");
  if(raw.includes("PREMIUM")) return activerPalier("PREMIUM","30j");
  if(raw.includes("OCC")) {
    // Client occasionnel - activation 1j mini
    return { success:true, type:"OCCASIONNEL", prixUSD:0.2, message:"Occasionnel activé 0.2$" } as any;
  }
  return activerPalier("STANDARD","30j");
}

export function getBadgeForUser(user:any){
  if(!user) return "🆓 Freemium 3 images";
  const check = checkFreemiumWenze(user, 0);
  return check.badge+" "+check.message;
}

export function getPrixByCategorie(cat:string){
  // Même prix pour tous - Plus de différence
  return { prixUSD:5, prixCDF:11500, prix:5, categorie: cat, label:"STANDARD 5$ - Même prix pour tous" };
}

// CONSTANTES LEGALES
export const MESSAGE_REGIME = "🆓 3 images à vie 30j puis caché - ⭐ STANDARD 5$/30j 1-4 img + 1 vidéo 15s - 🚀 PRO 10$/30j 5-10 img + 1 vidéo 60s - 👑 PREMIUM 20$/30j 11-30 img + 2 vidéos 60s - 🎟️ Client occasionnel 0.2$/j - 0% commission - Taux 2300";
export const REGLE_LEGALE = "TonMarché.cd est une plateforme main à main. 0% commission. Nous vendons uniquement de la visibilité. Après 30 jours, les comptes freemium passent en mode caché jusqu'à achat de visibilité.";
