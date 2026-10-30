"use client";

// lib/notifications.ts - V35 PRO FINAL - WENZE WENZE BUSINESS - COMPAT V32 + V6 STRICT
// Garde tous les types anciens pour build vert, mais adapte modèle éco: Tickets stricts cumulables, Même prix pour tous, Suppression libère place, Max 50, Compte caché filtré

export type NotifType = 
// ANCIENS TYPES V32 - gardés pour compat build vert - mappés vers V6
| "publication_approved" | "abonnement_payed" | "boost_payed" | "pub_video_payed"
| "new_boutique_annonce" | "new_pub_video"
| "abonnement_rappel_5j" | "abonnement_rappel_1j" | "abonnement_expire"
| "boost_rappel_1j" | "boost_expire"
| "pub_video_rappel_5j" | "pub_video_rappel_1j" | "pub_video_expire"
| "essai_rappel" | "essai_expire"
// NOUVEAUX TYPES V6 - coeur business
| "freemium_welcome" | "freemium_rappel_5j" | "freemium_rappel_1j" | "freemium_cache"
| "ticket_payed" | "ticket_rappel_5j" | "ticket_rappel_1j" | "ticket_expire" | "ticket_renouvele"
| "occasionnel_payed" | "occasionnel_expire"
| "place_liberee" | "place_consommee" | "max_50_atteint" | "compte_reactive" | "video_quota_full";

export interface WenzeNotif {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  annonceId?: string;
  boutiqueId?: string;
  boutiqueName?: string;
  prix?: string;
  image?: string;
  forAllClients?: boolean;
  forUserId?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  priority: "high" | "medium" | "low";
  data?: any;
}

const KEY_NOTIFS = "wenze_notifications";
const KEY_LAST_CHECK = "wenze_notif_last_check";

function cleanWa(n:any){ return (n || "").toString().replace(/[^0-9]/g,""); }
function safeGet(key:string){ try{ if(typeof window === "undefined") return null; return localStorage.getItem(key); }catch{ return null; } }
function safeSet(key:string, val:string){ try{ if(typeof window === "undefined") return; localStorage.setItem(key, val); }catch{} }
function safeParse(key:string){ try{ if(typeof window === "undefined") return []; const raw = localStorage.getItem(key); if(!raw) return []; return JSON.parse(raw); }catch{ return []; } }

export function getNotifications(): WenzeNotif[]{
  return safeParse(KEY_NOTIFS) as WenzeNotif[];
}

export function addNotification(notif: Partial<WenzeNotif> & { title: string; message: string; type: NotifType }){
  try{
    if(typeof window === "undefined") return null;
    const all = getNotifications();
    const full: WenzeNotif = {
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      annonceId: notif.annonceId,
      boutiqueId: notif.boutiqueId,
      boutiqueName: notif.boutiqueName,
      prix: notif.prix,
      image: notif.image,
      forAllClients: notif.forAllClients ?? false,
      forUserId: notif.forUserId,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: notif.actionUrl || "/abonnement",
      priority: notif.priority || "medium",
      data: notif.data || {},
    };
    all.unshift(full);
    safeSet(KEY_NOTIFS, JSON.stringify(all.slice(0,120)));
    safeSet(KEY_LAST_CHECK, new Date().toISOString());
    if(typeof window !== "undefined") window.dispatchEvent(new Event("wenze-notif"));
    return full;
  }catch{ return null; }
}

export function getUnreadCount(userId?:string){
  const all = getNotifications();
  if(!userId) return all.filter(n=> !n.read).length;
  const uid = cleanWa(userId);
  return all.filter(n=> !n.read && (!n.forUserId || cleanWa(n.forUserId)===uid || cleanWa(n.boutiqueId)===uid || n.forAllClients)).length;
}
export function markAsRead(id:string){ const all=getNotifications(); const idx=all.findIndex(n=> n.id===id); if(idx>=0){ all[idx].read=true; safeSet(KEY_NOTIFS, JSON.stringify(all)); if(typeof window!=="undefined") window.dispatchEvent(new Event("wenze-notif")); } }
export function markAllAsRead(userId?:string){ const all=getNotifications(); const uid=userId?cleanWa(userId):""; for(const n of all){ if(!n.read && (!uid || !n.forUserId || cleanWa(n.forUserId)===uid)) n.read=true; } safeSet(KEY_NOTIFS, JSON.stringify(all)); if(typeof window!=="undefined") window.dispatchEvent(new Event("wenze-notif")); }

// ========== V6 MAPPING ANCIENS TYPES -> NOUVEAU MODÈLE ==========
function mapLegacyToV6(type: NotifType): string {
  // Pour suivi compte: on garde historique mais on affiche message V6
  if(type.startsWith("abonnement_")) return "STANDARD/PRO/PREMIUM";
  if(type.startsWith("boost_")) return "STANDARD";
  if(type.startsWith("pub_video_")) return "PRO/PREMIUM Vidéo";
  return type;
}

// ========== V6 CHECK COMPLET - COEUR SUIVI COMPTE ==========
export function checkAndNotifyExpirations(){
  try{
    const now = Date.now();
    const tickets: any[] = safeParse("wenze_tickets");
    const occs: any[] = safeParse("wenze_occasionnel");
    const annonces: any[] = safeParse("wenze_annonces_list");
    const user = safeParse("wenze_user") as any;
    const wa = cleanWa(user.ownerWhatsapp||user.whatsapp||user.id||"");
    const allNotifs = getNotifications();

    const hasRecent = (dedupKey:string)=>{
      return allNotifs.some(n=> n.data?.dedupKey===dedupKey && (now-new Date(n.createdAt).getTime()) < 2*24*3600*1000);
    };

    // 1. TICKETS PUB V6 - STANDARD/PRO/PREMIUM + OCCASIONNEL
    for(const t of [...tickets, ...occs]){
      const expire = new Date(t.expireAt||t.expire||0).getTime();
      if(!expire) continue;
      const diffDays = Math.ceil((expire-now)/86400000);
      const label = `${t.palierId||'OCC'} ${t.dureeId||''}`.trim();
      const used = t.imagesUsed||0; const max = t.imagesMax||1;

      if(diffDays===5 && !hasRecent(`ticket_rappel_5j_${t.ticketId}_j5`)){
        // Garde 2 types pour compat: ancien abonnement_rappel_5j + nouveau ticket_rappel_5j
        addNotification({
          type: "ticket_rappel_5j",
          title: `⏰ Rappel J-5: Ticket ${label} expire dans 5j`,
          message: `V6 Suivi compte: Ticket ${label} ${used}/${max} places strictes sur ${t.jours||7}j (pas ${max}/j) - Expire ${new Date(expire).toLocaleDateString("fr-FR")} - Renouvelable ♻️ - Cumulable - Suppression libère place - Max 50 actives - Taux 2300 - Ancien type ${mapLegacyToV6("abonnement_rappel_5j")} mappé V6`,
          boutiqueId: wa, forUserId: wa, priority: "medium", actionUrl: "/abonnement",
          data: { ticketId: t.ticketId, dedupKey: `ticket_rappel_5j_${t.ticketId}_j5`, palierId: t.palierId, jours: diffDays, legacyTypes: ["abonnement_rappel_5j","boost_rappel_1j","pub_video_rappel_5j"] }
        });
      }
      if(diffDays===1 && !hasRecent(`ticket_rappel_1j_${t.ticketId}_j1`)){
        addNotification({
          type: "ticket_rappel_1j",
          title: `🔴 J-1 URGENT: Ticket ${label} expire demain!`,
          message: `Dernier jour V6: Ticket ${label} ${used}/${max} strictes - Expire demain - Si non renouvelé, ${used} annonces archivées - Si 0 ticket actif restant, compte devient CACHÉ filtré accueil/boutiques - Renouvelle ♻️ - Modèle: 1 ticket = X places sur Y jours`,
          boutiqueId: wa, forUserId: wa, priority: "high", actionUrl: "/abonnement",
          data: { ticketId: t.ticketId, dedupKey: `ticket_rappel_1j_${t.ticketId}_j1`, legacyTypes: ["abonnement_rappel_1j","boost_rappel_1j","pub_video_rappel_1j"] }
        });
      }
      if(diffDays<=0 && diffDays>-3 && !hasRecent(`ticket_expire_${t.ticketId}_exp`)){
        let isCacheNow = false;
        try{ const { verifierAbonnement } = require("./paiement"); const ab = verifierAbonnement(); isCacheNow = ab.isCache; }catch{}
        addNotification({
          type: "ticket_expire",
          title: isCacheNow ? `🔒 Ticket ${label} expiré - Compte caché filtré` : `❌ Ticket ${label} expiré`,
          message: isCacheNow 
            ? `V6 Compte caché: Ticket ${label} expiré - 0 ticket actif - Compte CACHÉ filtré (invisible accueil/boutiques) - ${used} annonces invisibles - Paye STANDARD 5$/PRO 10$/PREMIUM 20$ pour réapparaître - Même prix Détail/Gros/Presta - Tickets cumulables - Ancien abonnement_expire/boost_expire/pub_video_expire mappés`
            : `Ticket ${label} expiré le ${new Date(expire).toLocaleDateString("fr-FR")} - ${used}/${max} places archivées - V6 suppression libère place reste valide pour autres tickets`,
          boutiqueId: wa, forUserId: wa, priority: "high", actionUrl: "/abonnement",
          data: { ticketId: t.ticketId, dedupKey: `ticket_expire_${t.ticketId}_exp`, isCacheNow, legacyTypes: ["abonnement_expire","boost_expire","pub_video_expire"] }
        });
        // Compat: ajoute aussi ancien type pour code qui écoute ancien type
        addNotification({
          type: "abonnement_expire" as NotifType,
          title: `❌ [Compat] ${label} expiré`,
          message: `Compat V32: Ce type abonnement_expire est conservé mais pointe vers ticket_expire V6 - ${used}/${max} strictes`,
          boutiqueId: wa, forUserId: wa, priority: "low", actionUrl: "/abonnement",
          data: { ticketId: t.ticketId, dedupKey: `abonnement_expire_${t.ticketId}_compat`, isLegacyCompat: true }
        });
      }
    }

    // 2. FREEMIUM 30j puis CACHÉ - SUIVI COMPTE
    try{
      const { verifierAbonnement } = require("./paiement");
      const ab = verifierAbonnement();
      const userCreated = new Date(user.createdAt||Date.now()).getTime();
      const daysSince = Math.floor((now-userCreated)/86400000);
      const daysLeft = 30-daysSince;

      if(ab.isFreemium && !ab.isPaye){
        if(daysLeft===5 && !hasRecent(`freemium_rappel_5j_freemium_j5`)){
          addNotification({
            type: "freemium_rappel_5j",
            title: `⏰ Freemium: Plus que 5j avant compte caché`,
            message: `V6 Suivi: Tu as ${ab.count||0}/3 images à vie strictes Freemium - Dans 5j compte CACHÉ filtré si 0 ticket - Achète STANDARD 5$ pour 4 places strictes + 1 vidéo 15s - Même prix pour tous - Compat essai_rappel -> freemium_rappel`,
            forUserId: wa, boutiqueId: wa, priority: "medium", actionUrl: "/abonnement",
            data: { dedupKey: `freemium_rappel_5j_freemium_j5`, legacyType: "essai_rappel" }
          });
          // Compat ancien essai_rappel
          addNotification({ type: "essai_rappel", title: `[Compat] Essai J-5 -> Freemium J-5`, message: `Compat V32 essai_rappel conservé et mappé vers freemium_rappel_5j V6`, forUserId: wa, boutiqueId: wa, priority: "low", actionUrl: "/abonnement", data: { dedupKey: `essai_rappel_compat_j5`, isLegacyCompat: true } });
        }
        if(daysLeft===1 && !hasRecent(`freemium_rappel_1j_freemium_j1`)){
          addNotification({ type: "freemium_rappel_1j", title: `🔴 Freemium J-1: Demain compte caché`, message: `Dernier jour avant caché V6 - ${ab.count||0}/3 strictes - Demain invisible accueil - Paye 5$ pour réapparaître`, forUserId: wa, boutiqueId: wa, priority: "high", actionUrl: "/abonnement", data: { dedupKey: `freemium_rappel_1j_freemium_j1` } });
        }
        if(ab.isCache && !hasRecent(`freemium_cache_freemium_cache`)){
          addNotification({
            type: "freemium_cache",
            title: `🔒 Compte caché - Freemium expiré`,
            message: `V6 Compte caché filtré: Freemium 30j expiré + 0 ticket actif - ${ab.count||0} annonces invisibles - Paye STANDARD 5$/PRO 10$/PREMIUM 20$ pour réapparaître - 0% comm - Taux 2300 - Tickets stricts cumulables - Compat essai_expire -> freemium_cache`,
            forUserId: wa, boutiqueId: wa, priority: "high", actionUrl: "/abonnement",
            data: { dedupKey: `freemium_cache_freemium_cache`, legacyType: "essai_expire" }
          });
          addNotification({ type: "essai_expire" as NotifType, title: `[Compat] Essai expiré -> Compte caché`, message: `Compat V32 essai_expire conservé et mappé vers freemium_cache V6`, forUserId: wa, boutiqueId: wa, priority: "low", actionUrl: "/abonnement", data: { dedupKey: `essai_expire_compat`, isLegacyCompat: true } });
        }
      }
    }catch{}

    // 3. MAX 50 ACTIVES
    const myCount = annonces.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===wa).length;
    if(myCount>=45 && !hasRecent(`max_50_${wa}`)){
      const isMax = myCount>=50;
      addNotification({
        type: "max_50_atteint",
        title: isMax ? `🚫 Max 50 actives atteint` : `⚠️ Bientôt max 50 actives (${myCount}/50)`,
        message: `V6 Suivi compte: Tu as ${myCount}/50 annonces actives - ${isMax?"Max atteint - Archive ou supprime pour libérer 1 place - V6 suppression libère place":"Plus que ${50-myCount} places avant max"} - Tickets restent valides - Taux 2300`,
        forUserId: wa, boutiqueId: wa, priority: isMax?"high":"medium", actionUrl: "/boutiques/"+wa,
        data: { count: myCount, dedupKey: `max_50_${wa}` }
      });
    }

  }catch(e){ console.error("checkAndNotifyExpirations V35 error", e); }
}

// ========== HELPERS V6 + COMPAT V32 ==========
export function notifyPlaceLiberee(annonceId:string, ticketId:string){
  addNotification({ type: "place_liberee", title: `♻️ Place libérée dans ticket`, message: `V6: Annonce ${annonceId.slice(0,8)} supprimée - 1 place libérée dans ticket ${ticketId.slice(0,8)} - Tu peux reposter 1 image/j jusqu'à max strict - Suppression libère place - Max 50`, annonceId, priority: "low", actionUrl: "/publier", data: { annonceId, ticketId } });
}
export function notifyPlaceConsommee(annonceId:string, ticketId:string, used:number, max:number){
  addNotification({ type: "place_consommee", title: `✅ Place ${used}/${max} consommée`, message: `V6: Annonce ${annonceId.slice(0,8)} publiée dans ticket ${ticketId.slice(0,8)} - Reste ${max-used} places strictes - Cumulable - Taux 2300 - Compat publication_approved`, annonceId, priority: "low", actionUrl: `/produit/${annonceId}`, data: { annonceId, ticketId, used, max } });
  // Compat publication_approved
  addNotification({ type: "publication_approved", title: `[Compat] Publication approuvée -> Place consommée V6`, message: `Compat V32 publication_approved conservé - Nouvelle annonce ${annonceId.slice(0,8)} dans ticket ${ticketId.slice(0,8)} - ${used}/${max} strictes`, annonceId, priority: "low", actionUrl: `/produit/${annonceId}`, data: { annonceId, ticketId, isLegacyCompat: true } });
}
export function notifyTicketPayed(ticket:any){
  const user = safeParse("wenze_user") as any;
  const wa = cleanWa(user.ownerWhatsapp||user.whatsapp||user.id||"");
  addNotification({
    type: "ticket_payed",
    title: `🎉 Ticket ${ticket.palierId} ${ticket.dureeId} payé - ${ticket.imagesMax} places strictes`,
    message: `V6 Paiement: ${ticket.prixUSD}$ / ${ticket.prixCDF?.toLocaleString()||""} CDF - Ticket ${ticket.palierId} ${ticket.dureeId} - ${ticket.imagesMax} places strictes sur ${ticket.jours}j (pas ${ticket.imagesMax}/j) - Cumulable, renouvelable - Compte réactivé visible - 0% comm - Taux 2300 - Suppression libère place - Max 50 - Compat abonnement_payed/boost_payed/pub_video_payed -> ticket_payed`,
    forUserId: wa, boutiqueId: wa, priority: "high", actionUrl: "/boutiques/"+wa,
    data: { ticketId: ticket.ticketId, palierId: ticket.palierId, prixUSD: ticket.prixUSD, legacyTypes: ["abonnement_payed","boost_payed","pub_video_payed"] }
  });
  // Compat: génère aussi les 3 anciens types pour code qui écoute encore
  (["abonnement_payed","boost_payed","pub_video_payed"] as NotifType[]).forEach(lt=>{
    addNotification({ type: lt, title: `[Compat] ${lt} -> Ticket ${ticket.palierId} payé V6`, message: `Compat V32 ${lt} conservé et mappé vers ticket_payed V6 - ${ticket.imagesMax} places strictes`, forUserId: wa, boutiqueId: wa, priority: "low", actionUrl: "/abonnement", data: { ticketId: ticket.ticketId, isLegacyCompat: true } });
  });
  // Notif nouvelle annonce boutique (ancien new_boutique_annonce / new_pub_video)
  addNotification({
    type: "new_boutique_annonce",
    title: `🏪 Nouvelle boutique: Ticket ${ticket.palierId} actif`,
    message: `Compat V32 new_boutique_annonce conservé - Ticket ${ticket.palierId} ${ticket.dureeId} actif - ${ticket.imagesMax} places - V6 même prix pour tous`,
    forAllClients: false, forUserId: wa, boutiqueId: wa, priority: "low", actionUrl: "/boutiques/"+wa,
    data: { ticketId: ticket.ticketId, isLegacyCompat: false }
  });
  setTimeout(()=> notifyCompteReactive(), 800);
}
export function notifyCompteReactive(){
  const user = safeParse("wenze_user") as any;
  const wa = cleanWa(user.ownerWhatsapp||user.whatsapp||user.id||"");
  addNotification({ type: "compte_reactive", title: `🎉 Compte réactivé - Visible!`, message: `V6 Suivi compte: Paiement confirmé - Compte redevenu visible sur accueil et boutiques - Tickets actifs cumulables - Poste 1 image/j jusqu'à max strict - 0% comm - Compat publication_approved`, priority: "high", actionUrl: "/", data: { dedupKey: `reactive_${Date.now()}` } });
}
export function notifyVideoQuotaFull(used:number, max:number){
  const user = safeParse("wenze_user") as any;
  const wa = cleanWa(user.ownerWhatsapp||user.whatsapp||user.id||"");
  addNotification({ type: "video_quota_full", title: `🎥 Quota vidéo plein ${used}/${max}`, message: `V6: Tu as utilisé ${used}/${max} vidéos de ton ticket - STANDARD 1 vidéo 15s / PRO 1x60s / PREMIUM 2x60s - Achète nouveau ticket pour plus - Compat pub_video_payed`, forUserId: wa, boutiqueId: wa, priority: "medium", actionUrl: "/abonnement", data: { used, max } });
}
export function checkMax50AndNotify(){
  try{
    const list = safeParse("wenze_annonces_list");
    const user = safeParse("wenze_user") as any;
    const wa = cleanWa(user.ownerWhatsapp||user.whatsapp||user.id||"");
    const myCount = (list as any[]).filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===wa).length;
    if(myCount>=45){
      const all = getNotifications();
      const already = all.some(n=> n.type==="max_50_atteint" && (Date.now()-new Date(n.createdAt).getTime())<12*3600*1000);
      if(!already){
        addNotification({ type: "max_50_atteint", title: myCount>=50?`🚫 Max 50 actives atteint`:`⚠️ Bientôt max 50 (${myCount}/50)`, message: `V6 Suivi compte: ${myCount}/50 actives - ${myCount>=50?"Archive/supprime pour libérer place":"Plus que "+(50-myCount)+" avant max"} - Suppression libère place`, forUserId: wa, boutiqueId: wa, priority: myCount>=50?"high":"medium", actionUrl: "/boutiques/"+wa, data: { count: myCount, dedupKey: `max_50_${wa}` } });
      }
    }
    return myCount;
  }catch{ return 0; }
}

// Compat wrappers pour ancien code qui appelle encore ces noms
export const notifyAbonnementPayed = (ticket:any)=> notifyTicketPayed(ticket);
export const notifyBoostPayed = (ticket:any)=> notifyTicketPayed(ticket);
export const notifyPubVideoPayed = (ticket:any)=> notifyTicketPayed(ticket);
