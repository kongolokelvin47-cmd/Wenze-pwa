"use client";

// lib/notifications.ts - V32 PRO BUILD VERT - WENZE WENZE BUSINESS
// Pub Vidéo + Boutique 5$/10$ + Boost 1$/3$/5$ = même système 🔔 + rappels J-5 J-1

export type NotifType = 
| "publication_approved" | "abonnement_payed" | "boost_payed" | "pub_video_payed"
| "new_boutique_annonce" | "new_pub_video"
| "abonnement_rappel_5j" | "abonnement_rappel_1j" | "abonnement_expire"
| "boost_rappel_1j" | "boost_expire"
| "pub_video_rappel_5j" | "pub_video_rappel_1j" | "pub_video_expire"
| "essai_rappel" | "essai_expire";

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

function cleanWa(n:any){
  return (n || "").toString().replace(/[^0-9]/g,"");
}

function safeGet(key:string){
  try{
    if(typeof window === "undefined") return null;
    return localStorage.getItem(key);
  }catch{
    return null;
  }
}

function safeSet(key:string, val:string){
  try{
    if(typeof window === "undefined") return;
    localStorage.setItem(key, val);
  }catch{}
}

function safeParse(key:string){
  try{
    if(typeof window === "undefined") return [];
    const raw = localStorage.getItem(key);
    if(!raw) return [];
    return JSON.parse(raw);
  }catch{
    return [];
  }
}

export function addNotification(notif: Omit<WenzeNotif, "id" | "read" | "createdAt">){
  try{
    if(typeof window === "undefined") return null;
    const list: WenzeNotif[] = safeParse(KEY_NOTIFS);
    const today = new Date().toISOString().slice(0,10);
    const uid = notif.annonceId || (notif.data && notif.data.pubId) || notif.boutiqueId || "global";
    // Anti-spam V32: unique par type+uid+jour - sans ?.
    let already = null;
    for(let i=0;i<list.length;i++){
      const x = list[i];
      const xUid = x.annonceId || (x.data && x.data.pubId) || x.boutiqueId || "global";
      const xDay = x.createdAt ? x.createdAt.slice(0,10) : "";
      if(x.type === notif.type && xUid === uid && xDay === today){
        already = x;
        break;
      }
    }
    if(already){
      const t = notif.type || "";
      if(t.indexOf("rappel") >=0) return null;
    }

    const n: WenzeNotif = Object.assign({}, notif, {
      id: "NOTIF-"+Date.now()+"-"+Math.random().toString(36).slice(2,4).toUpperCase(),
      read: false,
      createdAt: new Date().toISOString()
    }) as WenzeNotif;

    list.unshift(n);
    safeSet(KEY_NOTIFS, JSON.stringify(list.slice(0,150)));
    try{
      window.dispatchEvent(new CustomEvent("wenze-notif", {detail:n}));
    }catch{}
    return n;
  }catch{
    return null;
  }
}

export function notifyClientsNewAnnonce(annonce:any, user:any){
  try{
    let hasDroit = false;
    if(annonce.boostUntil) hasDroit = true;
    if(user && user.abonnementPaye) hasDroit = true;
    if(user && user.abonnementDate) hasDroit = true;
    if(annonce.boutiquePrixUSD && annonce.boutiquePrixUSD >=5) hasDroit = true;
    if(annonce.boostType) hasDroit = true;

    if(!hasDroit){
      addNotification({
        type:"publication_approved",
        title:"✅ Publication approuvée - Freemium 3 vie",
        message: annonce.titre+" "+annonce.prix+"$ publié images only. Sans droit 🔔 notif. Passe boutique 5$/11500 CDF ou boost 1$ ou pub vidéo 1$ pour notifier tous les clients",
        annonceId: annonce.id,
        boutiqueId: annonce.userId,
        boutiqueName: annonce.ownerName,
        prix: annonce.prix+"$",
        image: annonce.photo,
        forUserId: annonce.userId,
        actionUrl: "/produit/"+annonce.id,
        priority:"medium",
        data:{annonceId:annonce.id}
      });
      return;
    }
    addNotification({
      type:"publication_approved",
      title:"✅ Publi approuvée + Clients notifiés! 🔔",
      message: annonce.titre+" "+annonce.prix+"$ - TOP + push clients - "+(annonce.typeVente==="occasionnelle" ? "Boost "+annonce.boostPrixUSD+"$" : "Boutique "+annonce.boutiquePrixUSD+"$"),
      annonceId: annonce.id,
      boutiqueId: annonce.userId,
      boutiqueName: annonce.ownerName,
      prix: annonce.prix+"$",
      image: annonce.photo,
      forUserId: annonce.userId,
      actionUrl: "/produit/"+annonce.id,
      priority:"high",
      data:{annonceId:annonce.id}
    });
    addNotification({
      type:"new_boutique_annonce",
      title:"🏬 Nouvelle annonce payante!",
      message: annonce.ownerName+" publie "+annonce.titre+" "+annonce.prix+"$ - "+annonce.commune+" - WENZE WENZE BUSINESS",
      annonceId: annonce.id,
      boutiqueId: annonce.userId,
      boutiqueName: annonce.ownerName,
      prix: annonce.prix+"$",
      image: annonce.photo,
      forAllClients:true,
      actionUrl: "/produit/"+annonce.id,
      priority:"high",
      data:{annonceId:annonce.id}
    });
  }catch{}
}

export function notifyAbonnementPayed(user:any, prixUSD:number, prixCDF:number){
  try{
    const uid = user ? (user.id || user.ownerWhatsapp) : "";
    const name = user ? (user.nomEtablissement || user.nom) : "Boutique";
    addNotification({
      type:"abonnement_payed",
      title:"✅ Boutique payée - Droits instant!",
      message: "Boutique "+prixUSD+"$/"+prixCDF+" CDF 30j - Illimité images+vidéos + 🔔 notif clients + boost gratuit + rappel J-5 J-1 - Taux 2300",
      boutiqueId: uid,
      boutiqueName: name,
      prix: prixUSD+"$",
      forUserId: uid,
      actionUrl:"/publier",
      priority:"high",
      data:{prixUSD, expireAt:new Date(Date.now()+30*86400000).toISOString()}
    });
  }catch{}
}

export function notifyBoostPayed(user:any, annonceId:string, boost:any){
  try{
    const uid = user ? user.id : "";
    addNotification({
      type:"boost_payed",
      title: "🚀 Boost "+(boost.label || "activé")+"!",
      message: (boost.label || "Boost")+" "+boost.prixUSD+"$ - TOP "+(boost.dureeJ || 1)+"j + 🔔 notif + rappel J-1",
      annonceId: annonceId,
      boutiqueId: uid,
      prix: boost.prixUSD+"$",
      forUserId: user ? (user.id || user.ownerWhatsapp) : "",
      actionUrl: "/produit/"+annonceId,
      priority:"high",
      data:{annonceId, expireAt:new Date(Date.now()+(boost.dureeJ || 1)*86400000).toISOString()}
    });
  }catch{}
}

export function notifyPubVideoPayed(user:any, pub:any){
  try{
    const uid = user ? user.id : "";
    const name = user ? (user.nomEtablissement || "Boutique") : "Boutique";
    addNotification({
      type:"pub_video_payed",
      title: "🎬 Pub Vidéo "+(pub.label || "")+" activée!",
      message: "Pub "+pub.prixUSD+"$ - TOP /video "+pub.dureeJ+"j + 🔔 notif clients + rappel J-5 J-1",
      boutiqueId: uid,
      prix: pub.prixUSD+"$",
      forUserId: uid,
      actionUrl:"/video",
      priority:"high",
      data:{pubId:pub.id, expireAt:new Date(Date.now()+(pub.dureeJ || 7)*86400000).toISOString()}
    });
    addNotification({
      type:"new_pub_video",
      title:"🎬 Nouvelle pub vidéo!",
      message: name+" publie une pub vidéo",
      boutiqueId: uid,
      forAllClients:true,
      actionUrl:"/video",
      priority:"high",
      data:{pubId:pub.id}
    });
  }catch{}
}

export function checkAndNotifyExpirations(force?:boolean){
  try{
    if(typeof window === "undefined") return;
    const now = Date.now();
    if(!force){
      const last = safeGet(KEY_LAST_CHECK);
      if(last && now - Number(last) < 5*60*1000) return;
    }
    safeSet(KEY_LAST_CHECK, String(now));

    let user:any = {};
    try{
      const raw = safeGet("wenze_user");
      user = raw ? JSON.parse(raw) : {};
    }catch{ user = {}; }

    const userId = user.id || user.ownerWhatsapp || user.whatsapp;
    if(!userId) return;

    // 1. ABONNEMENT
    try{
      let expireAt: string|null = safeGet("abonnement_expire_iso");
      if(!expireAt){
        const raw = safeGet("wenze_abonnement");
        if(raw){
          try{
            const o = JSON.parse(raw);
            if(o.expireAt) expireAt = o.expireAt;
            else if(typeof o.expire === "number") expireAt = new Date(o.expire).toISOString();
            else if(o.expire) expireAt = o.expire;
          }catch{}
        }
      }
      if(expireAt){
        const diff = Math.ceil((new Date(expireAt).getTime()-now)/86400000);
        const prix = 5;
        if(diff===5){
          addNotification({ type:"abonnement_rappel_5j", title:"⏰ Abonnement finit dans 5j!", message:"Ta boutique "+prix+"$ expire dans 5j le "+new Date(expireAt).toLocaleDateString("fr-FR")+". Renouvelle pour garder 🔔 notif clients", boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement", priority:"high", data:{expireAt, prixUSD:prix} });
        }
        if(diff===1){
          addNotification({ type:"abonnement_rappel_1j", title:"⚠️ Dernier jour!", message:"Ta boutique "+prix+"$ expire demain! Renouvelle", boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement", priority:"high", data:{expireAt, prixUSD:prix} });
        }
        if(diff<=0 && diff>-2){
          addNotification({ type:"abonnement_expire", title:"❌ Abonnement expiré", message:"Abonnement expiré. Retour Freemium 3 vie sans 🔔", boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement", priority:"high", data:{expireAt} });
        }
      }
    }catch{}

    // 2. BOOSTS
    try{
      const list:any[] = safeParse("wenze_annonces_list");
      for(let i=0;i<list.length;i++){
        const a = list[i];
        if(!a.boostUntil) continue;
        const isMine = (a.userId && a.userId===userId) || (cleanWa(a.ownerWhatsapp)===cleanWa(user.ownerWhatsapp));
        if(!isMine) continue;
        const exp = new Date(a.boostUntil).getTime();
        const h = Math.ceil((exp-now)/3600000);
        if(h>=23 && h<=25){
          addNotification({ type:"boost_rappel_1j", title:"⏰ Boost expire dans 24h!", message:"Boost "+a.titre+" expire demain", annonceId:a.id, forUserId:userId, actionUrl:"/produit/"+a.id, priority:"high", data:{annonceId:a.id, expireAt:a.boostUntil} });
        }
        if(exp < now && exp > now-86400000){
          addNotification({ type:"boost_expire", title:"📉 Boost expiré", message:"Boost "+a.titre+" expiré - Repaye 1$/3$/5$", annonceId:a.id, forUserId:userId, actionUrl:"/produit/"+a.id, priority:"medium", data:{annonceId:a.id} });
        }
      }
    }catch{}

    // 3. PUB VIDEO
    try{
      const pubs:any[] = safeParse("wenze_pubs_video");
      for(let i=0;i<pubs.length;i++){
        const p = pubs[i];
        if(!p.expireAt) continue;
        const diff = Math.ceil((new Date(p.expireAt).getTime()-now)/86400000);
        if(diff===5){
          addNotification({ type:"pub_video_rappel_5j", title:"⏰ Pub vidéo finit dans 5j!", message:"Pub "+p.label+" "+p.prixUSD+"$ expire dans 5j", boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement?mode=pub-video", priority:"high", data:{pubId:p.pubId, expireAt:p.expireAt} });
        }
        if(diff===1){
          addNotification({ type:"pub_video_rappel_1j", title:"⚠️ Pub vidéo expire demain!", message:"Pub "+p.label+" expire demain", boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement?mode=pub-video", priority:"high", data:{pubId:p.pubId, expireAt:p.expireAt} });
        }
        if(diff<=0 && diff>-1){
          addNotification({ type:"pub_video_expire", title:"❌ Pub vidéo expirée", message:"Pub "+p.label+" expirée - Repaye 1$/3$/15$", boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement?mode=pub-video", priority:"high", data:{pubId:p.pubId} });
        }
      }
    }catch{}

    // 4. ESSAI 7J
    try{
      const created = user.createdAt ? new Date(user.createdAt).getTime() : 0;
      if(created){
        const d = Math.ceil((now-created)/86400000);
        if(d===5){
          addNotification({ type:"essai_rappel", title:"⏳ Essai 7j finit dans 2j!", message:"Essai gratuit finit dans 2j → Freemium 3 vie. Passe 5$ pour garder illimité + 🔔", forUserId:userId, actionUrl:"/abonnement", priority:"medium", data:{expireAt:new Date(created+7*86400000).toISOString()} });
        }
      }
    }catch{}

  }catch(e){ console.log(e); }
}

export function getNotifications(forUserId?: string){
  try{
    const list: WenzeNotif[] = safeParse(KEY_NOTIFS);
    if(!forUserId) return list;
    const filtered:WenzeNotif[] = [];
    for(let i=0;i<list.length;i++){
      const n = list[i];
      if(!n.forUserId) { filtered.push(n); continue; }
      if(n.forUserId===forUserId) { filtered.push(n); continue; }
      if(n.forAllClients) { filtered.push(n); continue; }
    }
    return filtered;
  }catch{ return []; }
}

export function markAsRead(id: string){
  try{
    const list: WenzeNotif[] = safeParse(KEY_NOTIFS);
    const updated = [];
    for(let i=0;i<list.length;i++){
      const n = list[i];
      if(n.id===id) updated.push(Object.assign({}, n, {read:true}));
      else updated.push(n);
    }
    safeSet(KEY_NOTIFS, JSON.stringify(updated));
  }catch{}
}

export function markAllAsRead(forUserId?: string){
  try{
    const list: WenzeNotif[] = safeParse(KEY_NOTIFS);
    const updated:WenzeNotif[] = [];
    for(let i=0;i<list.length;i++){
      const n = list[i];
      if(forUserId){
        if(n.forUserId===forUserId || n.forAllClients || !n.forUserId){
          updated.push(Object.assign({}, n, {read:true}));
        } else {
          updated.push(n);
        }
      } else {
        updated.push(Object.assign({}, n, {read:true}));
      }
    }
    safeSet(KEY_NOTIFS, JSON.stringify(updated));
  }catch{}
}

export function getUnreadCount(forUserId?: string){
  try{
    const list = getNotifications(forUserId);
    let c = 0;
    for(let i=0;i<list.length;i++){ if(!list[i].read) c++; }
    return c;
  }catch{ return 0; }
}

export function clearOldNotifs(){
  try{
    const list: WenzeNotif[] = safeParse(KEY_NOTIFS);
    const ago = Date.now()-30*86400000;
    const kept:WenzeNotif[] = [];
    for(let i=0;i<list.length;i++){
      try{
        const t = new Date(list[i].createdAt).getTime();
        if(t>ago) kept.push(list[i]);
      }catch{}
    }
    safeSet(KEY_NOTIFS, JSON.stringify(kept));
  }catch{}
      }
