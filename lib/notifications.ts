// lib/notifications.ts - V7 PRO FINAL BUILD VERT - WENZE WENZE BUSINESS
// Pub Vidéo + Boutique 5$/10$ + Boost 1$/3$/5$ = même système 🔔 + rappels J-5 J-1
export type NotifType = 
| "publication_approved" | "abonnement_payed" | "boost_payed" | "pub_video_payed"
| "new_boutique_annonce" | "new_pub_video"
| "abonnement_rappel_5j" | "abonnement_rappel_1j" | "abonnement_expire"
| "boost_rappel_1j" | "boost_expire"
| "pub_video_rappel_5j" | "pub_video_rappel_1j" | "pub_video_expire"
| "essai_rappel" | "essai_expire";

export interface WenzeNotif {
  id: string; type: NotifType; title: string; message: string;
  annonceId?: string; boutiqueId?: string; boutiqueName?: string;
  prix?: string; image?: string; forAllClients?: boolean; forUserId?: string;
  read: boolean; createdAt: string; actionUrl?: string;
  priority: "high" | "medium" | "low"; data?: any;
}

const KEY_NOTIFS = "wenze_notifications";
const KEY_LAST_CHECK = "wenze_notif_last_check";

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,""); }
function safeParse(key:string){ try{ return JSON.parse(localStorage.getItem(key)||"[]"); } catch{ return []; } }

export function addNotification(notif: Omit<WenzeNotif, "id" | "read" | "createdAt">){
  try{
    const list: WenzeNotif[] = safeParse(KEY_NOTIFS);
    const today = new Date().toISOString().slice(0,10);
    const uid = notif.annonceId || notif.data?.pubId || notif.boutiqueId || "global";
    // Anti-spam V7: unique par type+uid+jour
    const already = list.find(x => x.type===notif.type && (x.annonceId||x.data?.pubId||x.boutiqueId||"global")===uid && x.createdAt.slice(0,10)===today);
    if(already && notif.type.includes("rappel")) return null;

    const n: WenzeNotif = { ...notif, id:`NOTIF-${Date.now()}-${Math.random().toString(36).slice(2,4).toUpperCase()}`, read:false, createdAt:new Date().toISOString() } as WenzeNotif;
    list.unshift(n);
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(list.slice(0,150)));
    if(typeof window!=="undefined") window.dispatchEvent(new CustomEvent("wenze-notif", {detail:n}));
    return n;
  } catch{ return null; }
}

export function notifyClientsNewAnnonce(annonce:any, user:any){
  const hasDroit = !!annonce.boostUntil || !!user?.abonnementPaye || !!user?.abonnementDate || (annonce.boutiquePrixUSD||0)>=5 || !!annonce.boostType;
  if(!hasDroit){
    addNotification({ type:"publication_approved", title:"✅ Publication approuvée - Freemium 3 vie", message:`${annonce.titre} ${annonce.prix}$ publié images only. Sans droit 🔔 notif. Passe boutique 5$/11500 CDF ou boost 1$ ou pub vidéo 1$ pour notifier tous les clients`, annonceId:annonce.id, boutiqueId:annonce.userId, boutiqueName:annonce.ownerName, prix:`${annonce.prix}$`, image:annonce.photo, forUserId:annonce.userId, actionUrl:`/produit/${annonce.id}`, priority:"medium", data:{annonceId:annonce.id} });
    return;
  }
  addNotification({ type:"publication_approved", title:"✅ Publi approuvée + Clients notifiés! 🔔", message:`${annonce.titre} ${annonce.prix}$ - TOP + push clients - ${annonce.typeVente==="occasionnelle"?`Boost ${annonce.boostPrixUSD}$`:`Boutique ${annonce.boutiquePrixUSD}$`}`, annonceId:annonce.id, boutiqueId:annonce.userId, boutiqueName:annonce.ownerName, prix:`${annonce.prix}$`, image:annonce.photo, forUserId:annonce.userId, actionUrl:`/produit/${annonce.id}`, priority:"high", data:{annonceId:annonce.id} });
  addNotification({ type:"new_boutique_annonce", title:`🏬 Nouvelle annonce payante!`, message:`${annonce.ownerName} publie ${annonce.titre} ${annonce.prix}$ - ${annonce.commune} - WENZE WENZE BUSINESS`, annonceId:annonce.id, boutiqueId:annonce.userId, boutiqueName:annonce.ownerName, prix:`${annonce.prix}$`, image:annonce.photo, forAllClients:true, actionUrl:`/produit/${annonce.id}`, priority:"high", data:{annonceId:annonce.id} });
}

export function notifyAbonnementPayed(user:any, prixUSD:number, prixCDF:number){
  addNotification({ type:"abonnement_payed", title:"✅ Boutique payée - Droits instant!", message:`Boutique ${prixUSD}$/${prixCDF} CDF 30j - Illimité images+vidéos + 🔔 notif clients + boost gratuit + rappel J-5 J-1 - Taux 2300`, boutiqueId:user?.id||user?.ownerWhatsapp, boutiqueName:user?.nomEtablissement||user?.nom, prix:`${prixUSD}$`, forUserId:user?.id||user?.ownerWhatsapp, actionUrl:"/publier", priority:"high", data:{prixUSD, expireAt:new Date(Date.now()+30*86400000).toISOString()} });
}
export function notifyBoostPayed(user:any, annonceId:string, boost:any){
  addNotification({ type:"boost_payed", title:`🚀 Boost ${boost.label||"activé"}!`, message:`${boost.label} ${boost.prixUSD}$ - TOP ${boost.dureeJ||1}j + 🔔 notif + rappel J-1`, annonceId, boutiqueId:user?.id, prix:`${boost.prixUSD}$`, forUserId:user?.id||user?.ownerWhatsapp, actionUrl:`/produit/${annonceId}`, priority:"high", data:{annonceId, expireAt:new Date(Date.now()+(boost.dureeJ||1)*86400000).toISOString()} });
}
export function notifyPubVideoPayed(user:any, pub:any){
  addNotification({ type:"pub_video_payed", title:`🎬 Pub Vidéo ${pub.label} activée!`, message:`Pub ${pub.prixUSD}$ - TOP /video ${pub.dureeJ}j + 🔔 notif clients + rappel J-5 J-1`, boutiqueId:user?.id, prix:`${pub.prixUSD}$`, forUserId:user?.id||user?.ownerWhatsapp, actionUrl:"/video", priority:"high", data:{pubId:pub.id, expireAt:new Date(Date.now()+(pub.dureeJ||7)*86400000).toISOString()} });
  addNotification({ type:"new_pub_video", title:`🎬 Nouvelle pub vidéo!`, message:`${user?.nomEtablissement||"Boutique"} publie une pub vidéo`, boutiqueId:user?.id, forAllClients:true, actionUrl:"/video", priority:"high", data:{pubId:pub.id} });
}

export function checkAndNotifyExpirations(force=false){
  try{
    const now = Date.now();
    if(!force){
      const last = localStorage.getItem(KEY_LAST_CHECK);
      if(last && now - Number(last) < 5*60*1000) return; // 5min en prod, force=true pour test
    }
    localStorage.setItem(KEY_LAST_CHECK, String(now));
    const user = JSON.parse(localStorage.getItem("wenze_user")||"{}");
    const userId = user.id || user.ownerWhatsapp || user.whatsapp;
    if(!userId) return;

    // 1. ABONNEMENT - compat V4 paiement.ts (expireAt ISO)
    try{
      let expireAt: string|null = localStorage.getItem("abonnement_expire_iso");
      if(!expireAt){
        const raw = localStorage.getItem("wenze_abonnement");
        if(raw){ try{ const o=JSON.parse(raw); expireAt = o.expireAt || (typeof o.expire==="number" ? new Date(o.expire).toISOString() : o.expire) || null; } catch{} }
      }
      if(expireAt){
        const diff = Math.ceil((new Date(expireAt).getTime()-now)/86400000);
        const prix = 5;
        if(diff===5) addNotification({ type:"abonnement_rappel_5j", title:"⏰ Abonnement finit dans 5j!", message:`Ta boutique ${prix}$ expire dans 5j le ${new Date(expireAt).toLocaleDateString("fr-FR")}. Renouvelle pour garder 🔔 notif clients`, boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement", priority:"high", data:{expireAt, prixUSD:prix} });
        if(diff===1) addNotification({ type:"abonnement_rappel_1j", title:"⚠️ Dernier jour!", message:`Ta boutique ${prix}$ expire demain! Renouvelle`, boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement", priority:"high", data:{expireAt, prixUSD:prix} });
        if(diff<=0 && diff>-2) addNotification({ type:"abonnement_expire", title:"❌ Abonnement expiré", message:`Abonnement expiré. Retour Freemium 3 vie sans 🔔`, boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement", priority:"high", data:{expireAt} });
      }
    } catch{}

    // 2. BOOSTS
    try{
      const list:any[] = safeParse("wenze_annonces_list");
      list.forEach((a:any)=>{
        if(!a.boostUntil) return;
        if(a.userId && a.userId!==userId && cleanWa(a.ownerWhatsapp)!==cleanWa(user.ownerWhatsapp)) return;
        const exp = new Date(a.boostUntil).getTime();
        const h = Math.ceil((exp-now)/3600000);
        if(h>=23 && h<=25) addNotification({ type:"boost_rappel_1j", title:"⏰ Boost expire dans 24h!", message:`Boost ${a.titre} expire demain`, annonceId:a.id, forUserId:userId, actionUrl:`/produit/${a.id}`, priority:"high", data:{annonceId:a.id, expireAt:a.boostUntil} });
        if(exp < now && exp > now-86400000) addNotification({ type:"boost_expire", title:"📉 Boost expiré", message:`Boost ${a.titre} expiré - Repaye 1$/3$/5$`, annonceId:a.id, forUserId:userId, actionUrl:`/produit/${a.id}`, priority:"medium", data:{annonceId:a.id} });
      });
    } catch{}

    // 3. PUB VIDEO
    try{
      const pubs:any[] = safeParse("wenze_pubs_video");
      pubs.forEach((p:any)=>{
        if(!p.expireAt) return;
        const diff = Math.ceil((new Date(p.expireAt).getTime()-now)/86400000);
        if(diff===5) addNotification({ type:"pub_video_rappel_5j", title:"⏰ Pub vidéo finit dans 5j!", message:`Pub ${p.label} ${p.prixUSD}$ expire dans 5j`, boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement?mode=pub-video", priority:"high", data:{pubId:p.pubId, expireAt:p.expireAt} });
        if(diff===1) addNotification({ type:"pub_video_rappel_1j", title:"⚠️ Pub vidéo expire demain!", message:`Pub ${p.label} expire demain`, boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement?mode=pub-video", priority:"high", data:{pubId:p.pubId, expireAt:p.expireAt} });
        if(diff<=0 && diff>-1) addNotification({ type:"pub_video_expire", title:"❌ Pub vidéo expirée", message:`Pub ${p.label} expirée - Repaye 1$/3$/15$`, boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement?mode=pub-video", priority:"high", data:{pubId:p.pubId} });
      });
    } catch{}

    // 4. ESSAI 7J
    try{
      const created = user.createdAt ? new Date(user.createdAt).getTime() : 0;
      if(created){
        const d = Math.ceil((now-created)/86400000);
        if(d===5) addNotification({ type:"essai_rappel", title:"⏳ Essai 7j finit dans 2j!", message:`Essai gratuit finit dans 2j → Freemium 3 vie. Passe 5$ pour garder illimité + 🔔`, forUserId:userId, actionUrl:"/abonnement", priority:"medium", data:{expireAt:new Date(created+7*86400000).toISOString()} });
      }
    } catch{}
  } catch(e){ console.log(e); }
}

export function getNotifications(forUserId?: string){
  try{
    const list: WenzeNotif[] = safeParse(KEY_NOTIFS);
    if(forUserId) return list.filter(n=> !n.forUserId || n.forUserId===forUserId || n.forAllClients);
    return list;
  } catch{ return []; }
}
export function markAsRead(id: string){
  try{
    const list: WenzeNotif[] = safeParse(KEY_NOTIFS);
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(list.map(n=> n.id===id ? {...n, read:true} : n)));
  } catch{}
}
export function markAllAsRead(forUserId?: string){
  try{
    const list: WenzeNotif[] = safeParse(KEY_NOTIFS);
    let filtered: WenzeNotif[];
    if(forUserId){
      filtered = list.map(n=>{
        if(n.forUserId===forUserId || n.forAllClients || !n.forUserId) return {...n, read:true};
        return n;
      });
    } else {
      filtered = list.map(n=> ({...n, read:true}));
    }
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(filtered));
  } catch{}
}
export function getUnreadCount(forUserId?: string){
  return getNotifications(forUserId).filter(n=> !n.read).length;
}
export function clearOldNotifs(){
  try{
    const list: WenzeNotif[] = safeParse(KEY_NOTIFS);
    const ago = Date.now()-30*86400000;
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(list.filter(n=> new Date(n.createdAt).getTime()>ago)));
  } catch{}
}
