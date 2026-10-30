// lib/paiement.ts - V6.2 FINAL UNIFIÉ - TONMARCHÉ.CD / WENZE.CD
// Politique Nouvelle: Même ticket pour tous - 1 ticket = X places STRICTES sur Y jours (pas X/j) - Cumulable - Max 50 - Suppression libère place - Freemium 3 à vie 30j -> Caché - 0% comm - Taux 2300 - Build Vert

export const TAUX_CDF = 2300;
export function toCDF(usd: number){ return Math.round((usd || 0) * TAUX_CDF); }
export function toUSD(cdf: number){ return Math.round((cdf || 0) / TAUX_CDF); }
export function toCDFString(usd: number){ return toCDF(usd).toLocaleString("fr-FR")+" CDF"; }
export function toUSDString(usd: number){ return `${usd}$`; }
export function formatPrix(usd: number){ return usd===0 ? "Gratuit" : `${usd}$ / ${toCDFString(usd)}`; }

export function cleanWa(n: any){ return (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,""); }
function safeWindow(){ return typeof window !== "undefined"; }
function safeGet(k:string){ try{ if(!safeWindow()) return null; return localStorage.getItem(k);}catch{ return null; } }
function safeSet(k:string,v:string){ try{ if(!safeWindow()) return; localStorage.setItem(k,v);}catch{} }
function safeParse(k:string){ try{ const r=safeGet(k); return r?JSON.parse(r):[];}catch{ return []; } }

// ========== 1. FREEMIUM - 3 images à vie mais visibles 30j ==========
export const FREEMIUM = {
  id:"freemium", nom:"Freemium Découverte", maxImages:3, maxImagesLabel:"3 images à vie",
  dureeJours:30, apres:"cache" as const, prix:0, badge:"🆓",
  message:"3 images à vie, visibles 30j, puis compte caché jusqu'à achat ticket - Panier conservé",
} as const;

// ========== 2. PALIERS - MÊME PRIX POUR TOUS - UNIFIÉ V6 ==========
export type PalierId = "STANDARD" | "PRO" | "PREMIUM";
export type DureeId = "7j" | "15j" | "30j";

export interface PalierConfig {
  id:PalierId; nom:string; imagesMax:number; places:number; jours:number;
  prixUSD:number; prixCDF:number; badge:string; limiteActives:number;
  videoCount:number; videoDuree:string; description:string;
}

export const PALIERS: Record<PalierId, PalierConfig> = {
  STANDARD:{ id:"STANDARD", nom:"STANDARD - Populaire", places:4, imagesMax:4, jours:7, prixUSD:5, prixCDF:toCDF(5), badge:"⭐", limiteActives:50, videoCount:0, videoDuree:"0s", description:"⭐ STANDARD 5$ (11 500 CDF) = 4 places strictes sur 7j - Idéal test" },
  PRO:{ id:"PRO", nom:"PRO - Boutique Active", places:10, imagesMax:10, jours:15, prixUSD:10, prixCDF:toCDF(10), badge:"🚀", limiteActives:50, videoCount:1, videoDuree:"60s", description:"🚀 PRO 10$ (23 000 CDF) = 10 places strictes sur 15j + 1 vidéo 60s - Cumulable" },
  PREMIUM:{ id:"PREMIUM", nom:"PREMIUM - Gros Vendeur", places:30, imagesMax:30, jours:30, prixUSD:20, prixCDF:toCDF(20), badge:"👑", limiteActives:50, videoCount:2, videoDuree:"60s", description:"👑 PREMIUM 20$ (46 000 CDF) = 30 places strictes sur 30j + 2 vidéos - Max 50" },
};

// Compat ancien code qui attend PALIERS[id].prix["30j"] et jours["30j"]
(PALIERS as any).STANDARD.prix = {"1j":0.5,"7j":5,"15j":7,"30j":5};
(PALIERS as any).STANDARD.jours = {"1j":1,"7j":7,"15j":7,"30j":7};
(PALIERS as any).PRO.prix = {"1j":1,"7j":10,"15j":10,"30j":10};
(PALIERS as any).PRO.jours = {"1j":1,"7j":15,"15j":15,"30j":15};
(PALIERS as any).PREMIUM.prix = {"1j":1.5,"7j":20,"15j":20,"30j":20};
(PALIERS as any).PREMIUM.jours = {"1j":1,"7j":30,"15j":30,"30j":30};

// ========== 3. OCCASIONNEL - Client qui vend 1 fois ==========
export const OCCASIONNEL = {
  id:"OCCASIONNEL", nom:"Vente Occasionnelle Client",
  offres:[
    { id:"occ-1img-1j", label:"1 image / 1 jour", images:1, jours:1, prixUSD:0.2, prixCDF:460, badge:"🎟️" },
    { id:"occ-1img-7j", label:"1 image / 7 jours", images:1, jours:7, prixUSD:1, prixCDF:2300, badge:"🎟️" },
  ]
} as const;

// ========== 4. TICKET STRICT ==========
export interface Ticket {
  ticketId:string; palierId:PalierId; dureeId:DureeId;
  imagesMax:number; imagesUsed:number; imagesIds:string[];
  jours:number; startAt:string; expireAt:string; prixUSD:number; prixCDF:number; actif:boolean;
  renouvelable:boolean; ownerWhatsapp:string; videoMax:number; videoUsed:number;
}

// Notifications safe - lazy import sans require qui casse build
function notifySafe(type:string, data:any){
  try{
    if(!safeWindow()) return;
    // @ts-ignore
    import("./notifications").then(m=>{
      if(type==="payed" && m.notifyTicketPayed) m.notifyTicketPayed(data);
      if(type==="conso" && m.notifyPlaceConsommee) m.notifyPlaceConsommee(data.annonceId, data.ticketId, data.used, data.max);
      if(type==="lib" && m.notifyPlaceLiberee) m.notifyPlaceLiberee(data.annonceId, data.ticketId);
    }).catch(()=>{});
  }catch{}
}

// Acheter = AJOUTE, n'écrase jamais - V6
export function acheterTicket(palierId:PalierId, dureeId:DureeId = "7j" as any){
  if(!safeWindow()) return { success:false, error:"No window" };
  const palier = PALIERS[palierId];
  if(!palier) return { success:false, error:"Palier inconnu" };
  const tickets = safeParse("wenze_tickets");
  const actifs = tickets.filter((t:any)=> new Date(t.expireAt).getTime() > Date.now());
  if(actifs.length >= 10) return { success:false, error:"Max 10 tickets actifs simultanés - Renouvelle un ancien" };

  let ownerWa=""; try{ const uRaw=safeGet("wenze_user"); if(uRaw){ const u=JSON.parse(uRaw); ownerWa=cleanWa(u.ownerWhatsapp||u.whatsapp||u.id||""); } }catch{}

  // V6: jours réels selon palier, pas selon dureeId
  const jours = palier.jours;
  const ticket:Ticket = {
    ticketId:`TICKET-${palierId}-${jours}j-${Date.now()}-${Math.random().toString(36).slice(2,4).toUpperCase()}`,
    palierId, dureeId: `${jours}j` as any, imagesMax: palier.imagesMax, imagesUsed:0, imagesIds:[],
    jours, startAt:new Date().toISOString(), expireAt:new Date(Date.now()+jours*86400000).toISOString(),
    prixUSD: palier.prixUSD, prixCDF: palier.prixCDF, actif:true, renouvelable:true,
    ownerWhatsapp: ownerWa, videoMax: palier.videoCount, videoUsed:0,
  };
  tickets.push(ticket);
  safeSet("wenze_tickets", JSON.stringify(tickets));

  try{
    const userRaw=safeGet("wenze_user");
    if(userRaw){
      const user=JSON.parse(userRaw);
      user.palierId=palierId; user.palierExpireAt=ticket.expireAt; user.isCache=false; user.badge=palier.badge;
      safeSet("wenze_user", JSON.stringify(user));
      const all=safeParse("wenze_all_users");
      const wa=cleanWa(user.ownerWhatsapp||user.whatsapp);
      let idx=all.findIndex((u:any)=>cleanWa(u.ownerWhatsapp||u.whatsapp)===wa);
      if(idx>=0) all[idx]=user; else all.push(user);
      safeSet("wenze_all_users", JSON.stringify(all));
    }
    const log=safeParse("wenze_transactions");
    log.push({ id:ticket.ticketId, ...ticket, success:true, createdAt:ticket.startAt, type:"ticket", ownerWhatsapp:ownerWa });
    safeSet("wenze_transactions", JSON.stringify(log));
  }catch{}

  notifySafe("payed", ticket);
  return { success:true, ticket, message:`✅ ${palier.badge} ${palier.nom} - ${palier.imagesMax} places strictes sur ${jours}j - ${palier.prixUSD}$ / ${toCDFString(palier.prixUSD)} - Owner ${ownerWa.slice(-4)}` };
}

export function renouvelerTicket(ticketId:string){
  const tickets=safeParse("wenze_tickets");
  const idx=tickets.findIndex((t:any)=>t.ticketId===ticketId);
  if(idx<0) return { success:false, error:"Ticket introuvable" };
  const t=tickets[idx];
  const base=new Date(t.expireAt).getTime() > Date.now() ? new Date(t.expireAt).getTime() : Date.now();
  t.expireAt=new Date(base + t.jours*86400000).toISOString();
  t.actif=true;
  safeSet("wenze_tickets", JSON.stringify(tickets));
  notifySafe("payed", t);
  return { success:true, ticket:t, message:`♻️ Renouvelé +${t.jours}j` };
}

export function consommerPlace(ticketId:string, annonceId:string){
  const tickets=safeParse("wenze_tickets");
  const idx=tickets.findIndex((t:any)=>t.ticketId===ticketId);
  if(idx<0) return false;
  const t=tickets[idx];
  if(new Date(t.expireAt).getTime() < Date.now()) return false;
  if(t.imagesUsed >= t.imagesMax) return false;
  if((t.imagesIds||[]).includes(annonceId)) return true;
  t.imagesUsed+=1; t.imagesIds=[...(t.imagesIds||[]), annonceId];
  safeSet("wenze_tickets", JSON.stringify(tickets));
  notifySafe("conso", { annonceId, ticketId, used:t.imagesUsed, max:t.imagesMax });
  return true;
}

export function libererPlace(annonceId:string){
  const tickets=safeParse("wenze_tickets");
  let changed=false; let lastId="";
  tickets.forEach((t:any)=>{
    const pos=(t.imagesIds||[]).indexOf(annonceId);
    if(pos>=0){ t.imagesIds.splice(pos,1); t.imagesUsed=Math.max(0,t.imagesUsed-1); changed=true; lastId=t.ticketId; }
  });
  if(changed){ safeSet("wenze_tickets", JSON.stringify(tickets)); if(lastId) notifySafe("lib", { annonceId, ticketId:lastId }); }
  const occs=safeParse("wenze_occasionnel");
  let changedOcc=false; let occId="";
  occs.forEach((t:any)=>{
    const pos=(t.imagesIds||[]).indexOf(annonceId);
    if(pos>=0){ t.imagesIds.splice(pos,1); t.imagesUsed=Math.max(0,(t.imagesUsed||1)-1); changedOcc=true; occId=t.ticketId; }
  });
  if(changedOcc){ safeSet("wenze_occasionnel", JSON.stringify(occs)); if(occId) notifySafe("lib", { annonceId, ticketId:occId }); changed=true; }
  return changed;
}

export function acheterOccasionnel(offreId:string){
  const offre=OCCASIONNEL.offres.find(o=>o.id===offreId);
  if(!offre) return { success:false };
  let ownerWa=""; try{ const uRaw=safeGet("wenze_user"); if(uRaw){ const u=JSON.parse(uRaw); ownerWa=cleanWa(u.ownerWhatsapp||u.whatsapp||u.id||""); } }catch{}
  const occ=safeParse("wenze_occasionnel");
  const ticketOcc={ ticketId:`OCC-${offreId}-${Date.now()}`, offreId, imagesMax:offre.images||1, imagesUsed:0, imagesIds:[], jours:offre.jours, startAt:new Date().toISOString(), expireAt:new Date(Date.now()+offre.jours*86400000).toISOString(), prixUSD:offre.prixUSD, prixCDF:offre.prixCDF, actif:true, ownerWhatsapp:ownerWa, videoMax:0, videoUsed:0 };
  occ.push(ticketOcc);
  safeSet("wenze_occasionnel", JSON.stringify(occ));
  const log=safeParse("wenze_transactions");
  log.push({ id:ticketOcc.ticketId, ...ticketOcc, type:"OCCASIONNEL", success:true, ownerWhatsapp:ownerWa });
  safeSet("wenze_transactions", JSON.stringify(log));
  return { success:true, ticket:ticketOcc };
}

// ========== 5. VERIFICATION V6 ==========
export function isCompteCache(user:any):boolean{
  if(!user) return false;
  const wa=user ? cleanWa(user.ownerWhatsapp||user.whatsapp||user.id||"") : "";
  const tickets=safeParse("wenze_tickets").filter((t:any)=>{
    const same=!t.ownerWhatsapp||!wa||cleanWa(t.ownerWhatsapp)===wa;
    return same && new Date(t.expireAt).getTime() > Date.now();
  });
  if(tickets.length>0) return false;
  const occs=safeParse("wenze_occasionnel").filter((t:any)=>{
    const same=!t.ownerWhatsapp||!wa||cleanWa(t.ownerWhatsapp)===wa;
    return same && new Date(t.expireAt).getTime() > Date.now();
  });
  if(occs.length>0) return false;
  if(user.palierExpireAt){ try{ if(new Date(user.palierExpireAt).getTime()>Date.now()) return false; }catch{} }
  if(user.abonnementExpireAt){ try{ if(new Date(user.abonnementExpireAt).getTime()>Date.now()) return false; }catch{} }
  let created=Date.now();
  if(user.createdAt){ try{ created=new Date(user.createdAt).getTime(); }catch{} }
  return (Date.now()-created)/86400000 > FREEMIUM.dureeJours;
}

export function checkFreemiumWenze(user:any, annoncesCount:number){
  const now=Date.now();
  let created=now;
  if(user?.createdAt){ try{ created=new Date(user.createdAt).getTime(); }catch{} }
  const diffJ=Math.ceil((now-created)/86400000);
  const joursRestantsFreemium=Math.max(0, FREEMIUM.dureeJours - diffJ);
  const wa=user ? cleanWa(user.ownerWhatsapp||user.whatsapp||user.id||"") : "";
  const allTickets=safeParse("wenze_tickets");
  const tickets=wa ? allTickets.filter((t:any)=> !t.ownerWhatsapp || cleanWa(t.ownerWhatsapp)===wa) : allTickets;
  const actifs=tickets.filter((t:any)=> new Date(t.expireAt).getTime() > now);
  const allOccs=safeParse("wenze_occasionnel");
  const occs=wa ? allOccs.filter((t:any)=> !t.ownerWhatsapp || cleanWa(t.ownerWhatsapp)===wa) : allOccs;
  const occsActifs=occs.filter((t:any)=> new Date(t.expireAt).getTime() > now);

  if(actifs.length>0){
    const placesRestantes=actifs.reduce((s:any,t:any)=> s + (t.imagesMax - t.imagesUsed), 0);
    const totalMax=actifs.reduce((s:any,t:any)=> s + t.imagesMax, 0);
    const plusProche=actifs.sort((a:any,b:any)=> new Date(a.expireAt).getTime() - new Date(b.expireAt).getTime())[0];
    const joursRestants=Math.ceil((new Date(plusProche.expireAt).getTime() - now)/86400000);
    const peut= annoncesCount < 50 && placesRestantes>0;
    return {
      isPaye:true, isFreemium:false, isCache:false, peutPublier:peut, actif:peut,
      palierId: plusProche.palierId, palier: PALIERS[plusProche.palierId],
      ticketsActifs: actifs, ticketsOccasionnel: occsActifs,
      joursRestants, joursRestantsFreemium:0, expireAt: plusProche.expireAt,
      placesRestantes, totalImagesMax: totalMax, totalAnnonces: annoncesCount, maxPlaces:50,
      annoncesRestantes: 50-annoncesCount, imagesRestantes: placesRestantes,
      count: annoncesCount, message: `${actifs.length} tickets - ${placesRestantes}/${totalMax} places libres - ${joursRestants}j`,
      badge: PALIERS[plusProche.palierId].badge, type: plusProche.palierId,
      prixUSD: PALIERS[plusProche.palierId].prixUSD,
    };
  }

  if(diffJ <= FREEMIUM.dureeJours){
    const rest=Math.max(0, FREEMIUM.maxImages - annoncesCount);
    return {
      isPaye:false, isFreemium:true, isCache:false, peutPublier: rest>0, actif: rest>0,
      palierId:null, palier:null, joursRestants:joursRestantsFreemium, joursRestantsFreemium,
      expireAt: new Date(created + FREEMIUM.dureeJours*86400000).toISOString(),
      annoncesRestantes: rest, imagesRestantes: rest, placesRestantes: rest, totalAnnonces: annoncesCount, maxPlaces:50,
      count: annoncesCount, message: rest>0 ? `🆓 Freemium ${annoncesCount}/${FREEMIUM.maxImages} strictes - ${joursRestantsFreemium}j restants` : `🆓 Freemium 3/3 atteint`,
      badge:"🆓", type:"freemium", prixUSD:0,
    };
  }

  return {
    isPaye:false, isFreemium:false, isCache:true, peutPublier:false, actif:false,
    palierId:null, palier:null, joursRestants:0, joursRestantsFreemium:0, expireAt:null,
    annoncesRestantes:0, imagesRestantes:0, placesRestantes:0, totalAnnonces: annoncesCount, maxPlaces:50,
    count: annoncesCount, message:`🔒 Caché - Freemium 30j expiré - Paye 5$ / ${toCDFString(5)} pour réapparaître`, badge:"🔒", type:"cache", prixUSD:0,
  };
}

export function verifierAbonnement(){
  if(!safeWindow()) return { isPaye:false, isFreemium:true, isCache:false, peutPublier:false, type:"freemium", count:0, badge:"🆓" } as any;
  try{
    const userRaw=safeGet("wenze_user");
    const user=userRaw?JSON.parse(userRaw):null;
    const list=safeParse("wenze_annonces_list");
    let myWa=user ? cleanWa(user.ownerWhatsapp||user.whatsapp) : "";
    let myCount=0;
    if(user){ for(let i=0;i<list.length;i++){ if(cleanWa(list[i].ownerWhatsapp||list[i].whatsapp)===myWa) myCount++; } } else myCount=list.length;
    if(!user) return { isPaye:false, isFreemium:true, isCache:false, peutPublier: myCount<3, count:myCount, totalAnnonces:myCount, maxPlaces:50, placesRestantes: Math.max(0,3-myCount), imagesRestantes: Math.max(0,3-myCount), type:"freemium", badge:"🆓", message:"Crée compte pour 3 images gratuites" } as any;
    const check=checkFreemiumWenze(user, myCount);
    return { ...check, label: check.palier?.nom || FREEMIUM.nom, prixUSD: check.palierId? (PALIERS[check.palierId as PalierId]?.prixUSD||0) : 0 };
  }catch{ return { isPaye:false, isFreemium:true, isCache:false, peutPublier:false, type:"freemium", badge:"🆓", message:"Erreur verif" } as any; }
}

export function checkFreemiumLimit(){ return verifierAbonnement(); }
export function activerPalier(palierId:PalierId, dureeId:DureeId="7j" as any){ return acheterTicket(palierId, dureeId as any); }
export function handlePaiement(type:string){
  const raw=type.toUpperCase();
  if(raw.includes("PREMIUM")) return acheterTicket("PREMIUM","30j" as any);
  if(raw.includes("PRO")) return acheterTicket("PRO","15j" as any);
  return acheterTicket("STANDARD","7j" as any);
}
export function getBadgeForUser(user:any){ const c=checkFreemiumWenze(user,0); return c.badge+" "+c.message; }
export function getPrixByCategorie(cat:string){ return { prixUSD:5, prixCDF:11500, prix:5, categorie:cat, label:"STANDARD 5$ - Même prix pour tous - Taux 2300" }; }
export function getSoldeWPay(){ return 0; }
export const MESSAGE_REGIME = `🆓 3 images à vie 30j visibles puis 🔒 caché - ⭐ STANDARD 5$ / ${toCDFString(5)} 4 places strictes / 7j - 🚀 PRO 10$ / ${toCDFString(10)} 10 places / 15j - 👑 PREMIUM 20$ / ${toCDFString(20)} 30 places / 30j - 1 ticket = X places strictes sur Y jours (pas X/j) - Cumulable - Max 50 - Suppression libère place - 0% comm - Taux ${TAUX_CDF}`;
export const REGLE_LEGALE = "WENZE plateforme main à main 0% commission. Un ticket = X places strictes sur Y jours (pas X/j). Cumulable, renouvelable, suppression libère place. Max 50 actives. Freemium 3 images à vie visibles 30j puis compte caché si 0 ticket. Même ticket pour tous secteurs.";
