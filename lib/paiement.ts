// lib/paiement.ts - V6 FINAL STRICT MULTI-TICKETS - TONMARCHÉ.CD
// Politique: 3 images à vie Freemium 30j -> Caché - Tickets cumulables - Strict 1j/7j/30j même règle
// Expert - Build Vert Garanti

export const TAUX_CDF = 2300;
export function toCDF(usd: number){ return Math.round((usd || 0) * TAUX_CDF); }
export function toUSD(cdf: number){ return Math.round((cdf || 0) / TAUX_CDF); }
export function toCDFString(usd: number){ return toCDF(usd).toLocaleString("fr-FR")+" CDF"; }
export function toUSDString(usd: number){ return usd+" $"; }
export function formatPrix(usd: number){ return usd===0 ? "Gratuit" : `${usd}$ / ${toCDFString(usd)}`; }

function cleanWa(n: any){ return (n || "").toString().replace(/[^0-9]/g,""); }
function safeWindow(){ return typeof window !== "undefined"; }
function safeGet(k:string){ try{ if(!safeWindow()) return null; return localStorage.getItem(k);}catch{ return null; } }
function safeSet(k:string,v:string){ try{ if(!safeWindow()) return; localStorage.setItem(k,v);}catch{} }
function safeParse(k:string){ try{ const r=safeGet(k); return r?JSON.parse(r):[];}catch{ return []; } }

// ========== 1. FREEMIUM ==========
export const FREEMIUM = {
  id:"freemium", nom:"Freemium Découverte", maxImages:3, maxImagesLabel:"3 images à vie",
  dureeJours:30, apres:"cache" as const, prix:0, badge:"🆓",
  message:"3 images à vie, visible 30j, puis compte caché jusqu'à achat pub",
} as const;

// ========== 2. PALIERS - MÊME PRIX ==========
export type PalierId = "STANDARD" | "PRO" | "PREMIUM";
export type DureeId = "1j" | "7j" | "30j";

export interface PalierConfig {
  id:PalierId; nom:string; imagesMin:number; imagesMax:number;
  videos:string; videoCount:number; videoDuree:string;
  prix:Record<DureeId,number>; jours:Record<DureeId,number>;
  badge:string; limiteActives:number;
}

export const PALIERS: Record<PalierId, PalierConfig> = {
  STANDARD:{ id:"STANDARD", nom:"STANDARD - Vente Flash", imagesMin:1, imagesMax:4, videos:"1 vidéo 15s", videoCount:1, videoDuree:"15s", prix:{"1j":0.5,"7j":2.5,"30j":5}, jours:{"1j":1,"7j":7,"30j":30}, badge:"⭐", limiteActives:50 },
  PRO:{ id:"PRO", nom:"PRO - Boutique Active", imagesMin:5, imagesMax:10, videos:"1 vidéo 60s", videoCount:1, videoDuree:"60s", prix:{"1j":1,"7j":5,"30j":10}, jours:{"1j":1,"7j":7,"30j":30}, badge:"🚀", limiteActives:50 },
  PREMIUM:{ id:"PREMIUM", nom:"PREMIUM - Gros Vendeur", imagesMin:11, imagesMax:30, videos:"2 vidéos 60s", videoCount:2, videoDuree:"60s", prix:{"1j":1.5,"7j":10,"30j":20}, jours:{"1j":1,"7j":7,"30j":30}, badge:"👑", limiteActives:50 },
};

// ========== 3. OCCASIONNEL ==========
export const OCCASIONNEL = {
  id:"OCCASIONNEL", nom:"Vente Occasionnelle Client",
  offres:[
    { id:"occ-1img-1j", label:"1 image / 1 jour", images:1, jours:1, prixUSD:0.2, prixCDF:460, badge:"🎟️" },
    { id:"occ-1img-7j", label:"1 image / 7 jours", images:1, jours:7, prixUSD:1, prixCDF:2300, badge:"🎟️" },
    { id:"occ-3img-1j", label:"3 images / 1 jour", images:3, jours:1, prixUSD:0.5, prixCDF:1150, badge:"🎟️" },
    { id:"occ-3img-7j", label:"3 images / 7 jours", images:3, jours:7, prixUSD:2.5, prixCDF:5750, badge:"🎟️" },
    { id:"occ-video-1j", label:"1 vidéo 15s / 1 jour", images:0, jours:1, prixUSD:0.5, prixCDF:1150, badge:"🎬" },
    { id:"occ-video-7j", label:"1 vidéo 15s / 7 jours", images:0, jours:7, prixUSD:2.5, prixCDF:5750, badge:"🎬" },
  ]
} as const;

// ========== 4. TICKET STRICT INTERCHANGEABLE ==========
export interface Ticket {
  ticketId:string; palierId:PalierId; dureeId:DureeId;
  imagesMax:number; imagesUsed:number; imagesIds:string[];
  jours:number; startAt:string; expireAt:string; prixUSD:number; actif:boolean;
  renouvelable:boolean;
}

// Acheter = AJOUTE, n'écrase jamais
export function acheterTicket(palierId:PalierId, dureeId:DureeId){
  if(!safeWindow()) return { success:false, error:"No window" };
  const palier = PALIERS[palierId];
  if(!palier) return { success:false, error:"Palier inconnu" };
  const tickets = safeParse("wenze_tickets");
  const actifs = tickets.filter((t:any)=> new Date(t.expireAt).getTime() > Date.now());
  if(actifs.length >= 10) return { success:false, error:"Max 10 tickets actifs simultanés - Renouvelle un ancien" };

  const jours = palier.jours[dureeId];
  const ticket:Ticket = {
    ticketId:`TICKET-${palierId}-${dureeId}-${Date.now()}-${Math.random().toString(36).slice(2,4).toUpperCase()}`,
    palierId, dureeId, imagesMax: palier.imagesMax, imagesUsed:0, imagesIds:[],
    jours, startAt:new Date().toISOString(), expireAt:new Date(Date.now()+jours*86400000).toISOString(),
    prixUSD: palier.prix[dureeId], actif:true, renouvelable:true,
  };
  tickets.push(ticket);
  safeSet("wenze_tickets", JSON.stringify(tickets));

  // Compat ancien + nettoyage cache
  try{
    const userRaw = safeGet("wenze_user");
    if(userRaw){
      const user = JSON.parse(userRaw);
      user.palierId = palierId; user.palierExpireAt = ticket.expireAt; user.isCache = false; user.badge = palier.badge;
      safeSet("wenze_user", JSON.stringify(user));
      const all = safeParse("wenze_all_users");
      const wa = cleanWa(user.ownerWhatsapp||user.whatsapp);
      let idx = all.findIndex((u:any)=>cleanWa(u.ownerWhatsapp||u.whatsapp)===wa);
      if(idx>=0) all[idx]=user; else all.push(user);
      safeSet("wenze_all_users", JSON.stringify(all));
    }
    const log = safeParse("wenze_transactions");
    log.push({ id:ticket.ticketId, transactionId:ticket.ticketId, ...ticket, success:true, createdAt:ticket.startAt });
    safeSet("wenze_transactions", JSON.stringify(log));
  }catch{}

  return { success:true, ticket, message:`✅ ${palier.nom} ${dureeId} - ${palier.imagesMax} places strictes sur ${jours}j` };
}

export function renouvelerTicket(ticketId:string){
  const tickets = safeParse("wenze_tickets");
  const idx = tickets.findIndex((t:any)=>t.ticketId===ticketId);
  if(idx<0) return { success:false, error:"Ticket introuvable" };
  const t = tickets[idx];
  // Renouvellement = ajoute jours à expireAt actuel, garde compteur imagesIds mais prolonge visibilité
  const base = new Date(t.expireAt).getTime() > Date.now() ? new Date(t.expireAt).getTime() : Date.now();
  t.expireAt = new Date(base + t.jours*86400000).toISOString();
  t.actif = true;
  safeSet("wenze_tickets", JSON.stringify(tickets));
  return { success:true, ticket:t, message:`♻️ Renouvelé +${t.jours}j - Expire ${t.expireAt}` };
}

// Consommer une place stricte
export function consommerPlace(ticketId:string, annonceId:string){
  const tickets = safeParse("wenze_tickets");
  const idx = tickets.findIndex((t:any)=>t.ticketId===ticketId);
  if(idx<0) return false;
  const t = tickets[idx];
  if(new Date(t.expireAt).getTime() < Date.now()) return false;
  if(t.imagesUsed >= t.imagesMax) return false; // STRICT 4 max sur 7j, pas 4/j
  if(t.imagesIds.includes(annonceId)) return true; // déjà compté = edit
  t.imagesUsed +=1; t.imagesIds.push(annonceId);
  safeSet("wenze_tickets", JSON.stringify(tickets));
  return true;
}

// Libérer place si supprime avant échéance
export function libererPlace(annonceId:string){
  const tickets = safeParse("wenze_tickets");
  let changed=false;
  tickets.forEach((t:any)=>{
    const pos = t.imagesIds.indexOf(annonceId);
    if(pos>=0){ t.imagesIds.splice(pos,1); t.imagesUsed=Math.max(0,t.imagesUsed-1); changed=true; }
  });
  if(changed) safeSet("wenze_tickets", JSON.stringify(tickets));
  return changed;
}

// Occasionnel séparé
export function acheterOccasionnel(offreId:string){
  const offre = OCCASIONNEL.offres.find(o=>o.id===offreId);
  if(!offre) return { success:false };
  const occ = safeParse("wenze_occasionnel");
  const ticketOcc = { ticketId:`OCC-${offreId}-${Date.now()}`, offreId, imagesMax:offre.images||1, imagesUsed:0, imagesIds:[], jours:offre.jours, startAt:new Date().toISOString(), expireAt:new Date(Date.now()+offre.jours*86400000).toISOString(), prixUSD:offre.prixUSD, actif:true };
  occ.push(ticketOcc);
  safeSet("wenze_occasionnel", JSON.stringify(occ));
  const log = safeParse("wenze_transactions");
  log.push({ id:ticketOcc.ticketId, ...ticketOcc, type:"OCCASIONNEL", success:true });
  safeSet("wenze_transactions", JSON.stringify(log));
  return { success:true, ticket:ticketOcc };
}

// ========== 5. VERIFICATION MULTI-TICKETS ==========
export function isCompteCache(user:any):boolean{
  if(!user) return false;
  const tickets = safeParse("wenze_tickets");
  const actifs = tickets.filter((t:any)=> new Date(t.expireAt).getTime() > Date.now());
  if(actifs.length>0) return false; // un ticket actif = pas caché
  // Check ancien champ compat
  if(user.palierExpireAt){ try{ if(new Date(user.palierExpireAt).getTime() > Date.now()) return false; }catch{} }
  if(user.abonnementExpireAt){ try{ if(new Date(user.abonnementExpireAt).getTime() > Date.now()) return false; }catch{} }
  let created = Date.now();
  if(user.createdAt){ try{ created = new Date(user.createdAt).getTime(); }catch{} }
  return (Date.now()-created)/86400000 > FREEMIUM.dureeJours;
}

export function checkFreemiumWenze(user:any, annoncesCount:number){
  const now = Date.now();
  let created = now;
  if(user?.createdAt){ try{ created = new Date(user.createdAt).getTime(); }catch{} }
  const diffJ = Math.ceil((now-created)/86400000);
  const joursRestantsFreemium = Math.max(0, FREEMIUM.dureeJours - diffJ);

  // 1. Multi-tickets actifs
  const tickets = safeParse("wenze_tickets");
  const actifs = tickets.filter((t:any)=> new Date(t.expireAt).getTime() > now);
  const occs = safeParse("wenze_occasionnel").filter((t:any)=> new Date(t.expireAt).getTime() > now);
  if(actifs.length>0){
    const placesRestantes = actifs.reduce((s:any,t:any)=> s + (t.imagesMax - t.imagesUsed), 0);
    const totalMax = actifs.reduce((s:any,t:any)=> s + t.imagesMax, 0);
    const plusProcheExpire = actifs.sort((a:any,b:any)=> new Date(a.expireAt).getTime() - new Date(b.expireAt).getTime())[0];
    const joursRestants = Math.ceil((new Date(plusProcheExpire.expireAt).getTime() - now)/86400000);
    // Global max 50 actives
    const peutPublierGlobal = annoncesCount < 50 && placesRestantes>0;
    return {
      isPaye:true, isFreemium:false, isCache:false,
      peutPublier: peutPublierGlobal,
      palierId: plusProcheExpire.palierId, palier: PALIERS[plusProcheExpire.palierId],
      ticketsActifs: actifs, ticketsOccasionnel: occs,
      joursRestants, expireAt: plusProcheExpire.expireAt,
      placesRestantes, totalImagesMax: totalMax,
      annoncesRestantes: 50 - annoncesCount, imagesRestantes: placesRestantes,
      message: actifs.length>1 ? `${actifs.length} tickets actifs - ${placesRestantes}/${totalMax} places libres - ${joursRestants}j restants` : `${PALIERS[plusProcheExpire.palierId].badge} ${PALIERS[plusProcheExpire.palierId].nom} ${plusProcheExpire.dureeId} - ${plusProcheExpire.imagesUsed}/${plusProcheExpire.imagesMax} strictes - ${joursRestants}j restants`,
      badge: PALIERS[plusProcheExpire.palierId].badge, type: plusProcheExpire.palierId,
    };
  }

  if(occs.length>0){
    const placesOcc = occs.reduce((s:any,t:any)=> s + (t.imagesMax - t.imagesUsed), 0);
    return {
      isPaye:true, isFreemium:false, isCache:false, peutPublier: placesOcc>0,
      palierId:"OCCASIONNEL" as any, palier:null, ticketsActifs:[], ticketsOccasionnel:occs,
      joursRestantes: Math.ceil((new Date(occs[0].expireAt).getTime()-now)/86400000),
      placesRestantes: placesOcc, message:`🎟️ Occasionnel ${placesOcc} places - Cumulable avec tickets pub`, badge:"🎟️", type:"occasionnel",
    } as any;
  }

  // 2. Freemium 30j
  if(diffJ <= FREEMIUM.dureeJours){
    const rest = Math.max(0, FREEMIUM.maxImages - annoncesCount);
    return {
      isPaye:false, isFreemium:true, isCache:false, peutPublier: rest>0,
      palierId:null, palier:null, joursRestants:joursRestantsFreemium,
      expireAt: new Date(created + FREEMIUM.dureeJours*86400000).toISOString(),
      annoncesRestantes: rest, imagesRestantes: rest, placesRestantes: rest,
      message: rest>0 ? `🆓 Freemium ${annoncesCount}/${FREEMIUM.maxImages} strictes à vie - ${joursRestantsFreemium}j restants` : `🆓 Freemium 3/3 atteint - Achète ticket pour continuer`,
      badge:"🆓", type:"freemium",
    };
  }

  // 3. Caché
  return {
    isPaye:false, isFreemium:false, isCache:true, peutPublier:false,
    palierId:null, palier:null, joursRestants:0, expireAt:null,
    annoncesRestantes:0, imagesRestantes:0, placesRestantes:0,
    message:`🔒 Compte caché - Freemium 30j expiré - Paye 5$ pour réapparaître`, badge:"🔒", type:"cache",
  };
}

export function verifierAbonnement(){
  if(!safeWindow()) return { isPaye:false, isFreemium:true, isCache:false, peutPublier:false, type:"freemium" } as any;
  try{
    const userRaw = safeGet("wenze_user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    const list = safeParse("wenze_annonces_list");
    let myWa = user ? cleanWa(user.ownerWhatsapp||user.whatsapp) : "";
    let myCount=0;
    if(user){ for(let i=0;i<list.length;i++){ if(cleanWa(list[i].ownerWhatsapp||list[i].whatsapp)===myWa) myCount++; } } else myCount=list.length;
    if(!user) return { isPaye:false, isFreemium:true, isCache:false, peutPublier: myCount<3, count:myCount, type:"freemium", badge:"🆓", message:"Crée compte pour 3 images gratuites strictes" } as any;
    const check = checkFreemiumWenze(user, myCount);
    return { ...check, count:myCount, actif:check.peutPublier, label: check.palier?.nom || FREEMIUM.nom, prixUSD: check.palierId? PALIERS[check.palierId as PalierId]?.prix["30j"]||0 : 0 };
  }catch{ return { isPaye:false, isFreemium:true, isCache:false, peutPublier:false, type:"freemium", message:"Erreur verif" } as any; }
}

export function checkFreemiumLimit(){ return verifierAbonnement(); }

// ========== 6. ACTIVATION COMPAT ANCIEN CODE ==========
export function activerPalier(palierId:PalierId, dureeId:DureeId, devise:"$"|"CDF"="$"){
  return acheterTicket(palierId, dureeId);
}
export function handlePaiement(type:string){
  const raw = type.toUpperCase();
  if(raw.includes("STANDARD")) return acheterTicket("STANDARD","30j");
  if(raw.includes("PRO")) return acheterTicket("PRO","30j");
  if(raw.includes("PREMIUM")) return acheterTicket("PREMIUM","30j");
  if(raw.includes("OCC")) return acheterOccasionnel("occ-1img-1j");
  return acheterTicket("STANDARD","30j");
}
export function getBadgeForUser(user:any){ const c=checkFreemiumWenze(user,0); return c.badge+" "+c.message; }
export function getPrixByCategorie(cat:string){ return { prixUSD:5, prixCDF:11500, prix:5, categorie:cat, label:"STANDARD 5$ - Même prix" }; }
export function getSoldeWPay(){ return 0; }
export const MESSAGE_REGIME = "🆓 3 images à vie 30j puis caché - ⭐ STANDARD 5$/30j 1-4 strictes + 1 vidéo 15s - 🚀 PRO 10$/30j 5-10 strictes - 👑 PREMIUM 20$/30j 11-30 strictes - 🎟️ 0.2$/j - Tickets cumulables, renouvelables, suppression libère place - Max 50 actives - 0% comm - Taux 2300";
export const REGLE_LEGALE = "TonMarché.cd plateforme main à main 0% commission. Un ticket = X places strictes sur Y jours (pas X/j). Cumulable, renouvelable, suppression libère place. Max 50 actives. Occasionnel en parallèle.";
