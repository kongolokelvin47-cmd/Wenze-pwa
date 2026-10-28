// lib/notifications.ts - WENZE WENZE BUSINESS V5 PRO FINAL - Notification intelligente + Pub Vidéo + Rappels J-5 J-1 + Boost + 0% comm - BUILD VERT
export type NotifType = 
| "publication_approved" | "abonnement_payed" | "boost_payed" | "pub_video_payed"
| "new_boutique_annonce" | "new_pub_video"
| "abonnement_rappel_5j" | "abonnement_rappel_1j" | "abonnement_expire" 
| "boost_rappel_1j" | "boost_rappel_5j" | "boost_expire"
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
  data?: any; // { annonceId, pubId, expireAt, prixUSD }
}

const KEY_NOTIFS = "wenze_notifications";
const KEY_LAST_CHECK = "wenze_notif_last_check";

export function addNotification(notif: Omit<WenzeNotif, "id" | "read" | "createdAt"> & { data?:any }){
  try{
    const list: WenzeNotif[] = JSON.parse(localStorage.getItem(KEY_NOTIFS)||"[]");
    // Anti-spam PRO: même type + même annonce/pub + même jour = 1 seule fois
    const today = new Date().toISOString().slice(0,10);
    const key = `${notif.type}-${notif.annonceId||notif.data?.pubId||notif.boutiqueId||"global"}`;
    const exists = list.find(n=> `${n.type}-${n.annonceId||n.data?.pubId||n.boutiqueId||"global"}`===key && n.createdAt.slice(0,10)===today);
    if(exists && notif.type.includes("rappel")) return null;

    const newNotif: WenzeNotif = {
      ...notif,
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,
      read: false,
      createdAt: new Date().toISOString(),
    } as WenzeNotif;
    list.unshift(newNotif);
    // Garde 150 max
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(list.slice(0,150)));
    if(typeof window!=="undefined") window.dispatchEvent(new CustomEvent("wenze-notif", { detail: newNotif }));
    return newNotif;
  } catch(e){ return null; }
}

// ✅ PUBLICATION - Distinction droits payant vs gratuit
export function notifyClientsNewAnnonce(annonce: any, user: any){
  const hasDroit = !!annonce.boostUntil || (user?.abonnementPaye || user?.abonnementDate) || annonce.boutiquePrixUSD>=5 || annonce.boostType || annonce.pubVideo;
  
  if(!hasDroit){
    addNotification({
      type: "publication_approved",
      title: "✅ Publication approuvée - Freemium 3 vie",
      message: `${annonce.titre} - ${annonce.prix}$ publié images only. Sans droit 🔔 notif clients. Passe boutique 5$ / 11500 CDF ou boost 1$ ou pub vidéo 1$ pour notifier tous les clients + vidéos`,
      annonceId: annonce.id,
      boutiqueId: annonce.userId,
      boutiqueName: annonce.ownerName,
      prix: `${annonce.prix}$ / ${annonce.prixCDF?.toLocaleString()} CDF`,
      image: annonce.photo,
      forUserId: annonce.userId,
      actionUrl: `/produit/${annonce.id}`,
      priority: "medium",
      data:{ annonceId: annonce.id }
    });
    return;
  }

  addNotification({
    type: "publication_approved",
    title: "✅ Publi approuvée + Clients notifiés! 🔔",
    message: `${annonce.titre} - ${annonce.prix}$ - Visible TOP + push à tous les clients WENZE WENZE BUSINESS - ${annonce.typeVente==="occasionnelle"?`Boost ${annonce.boostType} ${annonce.boostPrixUSD}$`:annonce.pubVideo?`Pub Vidéo ${annonce.pubVideo}$`:`Boutique ${annonce.boutiquePrixUSD}$`}`,
    annonceId: annonce.id,
    boutiqueId: annonce.userId,
    boutiqueName: annonce.ownerName,
    prix: `${annonce.prix}$ / ${annonce.prixCDF?.toLocaleString()} CDF`,
    image: annonce.photo,
    forUserId: annonce.userId,
    actionUrl: `/produit/${annonce.id}`,
    priority: "high",
    data:{ annonceId: annonce.id, expireAt: annonce.boostUntil }
  });

  addNotification({
    type: "new_boutique_annonce",
    title: `🏬 Nouvelle ${annonce.pubVideo?"pub vidéo":"annonce"} ${annonce.typeVente==="occasionnelle"?"boostée":"payante"}!`,
    message: `${annonce.ownerName} vient de publier ${annonce.titre} à ${annonce.prix}$ / ${annonce.prixCDF?.toLocaleString()} CDF - ${annonce.commune} - WENZE WENZE BUSINESS`,
    annonceId: annonce.id,
    boutiqueId: annonce.userId,
    boutiqueName: annonce.ownerName,
    prix: `${annonce.prix}$ / ${annonce.prixCDF?.toLocaleString()} CDF`,
    image: annonce.photo,
    forAllClients: true,
    actionUrl: `/produit/${annonce.id}`,
    priority: "high",
    data:{ annonceId: annonce.id }
  });
}

export function notifyAbonnementPayed(user: any, prixUSD: number, prixCDF: number){
  addNotification({
    type: "abonnement_payed",
    title: "✅ Boutique payée - Droits instant!",
    message: `WENZE WENZE BUSINESS - Boutique ${prixUSD}$ / ${prixCDF.toLocaleString()} CDF activée 30j - Illimité images+vidéos + 🔔 notif clients à chaque publication + boost gratuit 1/mois + rappel J-5 J-1 - Taux 2300`,
    boutiqueId: user?.id || user?.ownerWhatsapp,
    boutiqueName: user?.nomEtablissement || user?.nom,
    prix: `${prixUSD}$ / ${prixCDF.toLocaleString()} CDF`,
    forUserId: user?.id || user?.ownerWhatsapp,
    actionUrl: "/publier",
    priority: "high",
    data:{ prixUSD, prixCDF, expireAt: new Date(Date.now()+30*86400000).toISOString() }
  });
}

export function notifyBoostPayed(user: any, annonceId: string, boost: any){
  addNotification({
    type: "boost_payed",
    title: `🚀 Boost ${boost.label||boost.nom} activé!`,
    message: `${boost.label||boost.nom} ${boost.prixUSD}$ / ${boost.prixCDF} CDF - TOP feed ${boost.dureeJ||boost.jours||1}j + 🔔 notif clients + rappel J-1 - ${annonceId}`,
    annonceId,
    boutiqueId: user?.id || user?.ownerWhatsapp,
    boutiqueName: user?.nomEtablissement,
    prix: `${boost.prixUSD}$ / ${boost.prixCDF} CDF`,
    forUserId: user?.id || user?.ownerWhatsapp,
    actionUrl: `/produit/${annonceId}`,
    priority: "high",
    data:{ annonceId, prixUSD: boost.prixUSD, expireAt: new Date(Date.now()+(boost.dureeJ||1)*86400000).toISOString(), boostId: boost.id }
  });
}

// ✅ NOUVEAU - PUB VIDÉO PAYÉE - MÊME DROITS 🔔
export function notifyPubVideoPayed(user: any, pub: any){
  addNotification({
    type: "pub_video_payed",
    title: `🎬 Pub Vidéo ${pub.label||pub.nom} activée!`,
    message: `Pub Vidéo ${pub.label} ${pub.prixUSD}$ / ${pub.prixCDF} CDF - TOP sur /video ${pub.dureeJ||pub.jours}j + page accueil + 🔔 notif à tous les clients + rappel J-5 J-1 - WENZE WENZE BUSINESS`,
    boutiqueId: user?.id || user?.ownerWhatsapp,
    boutiqueName: user?.nomEtablissement || user?.nom,
    prix: `${pub.prixUSD}$ / ${pub.prixCDF} CDF`,
    forUserId: user?.id || user?.ownerWhatsapp,
    actionUrl: "/video",
    priority: "high",
    data:{ pubId: pub.id, prixUSD: pub.prixUSD, expireAt: new Date(Date.now()+(pub.dureeJ||7)*86400000).toISOString() }
  });

  addNotification({
    type: "new_pub_video",
    title: `🎬 Nouvelle pub vidéo payante!`,
    message: `${user?.nomEtablissement||user?.nom} vient de publier une pub vidéo ${pub.label} - WENZE WENZE BUSINESS - Clique pour voir`,
    boutiqueId: user?.id || user?.ownerWhatsapp,
    boutiqueName: user?.nomEtablissement || user?.nom,
    prix: `${pub.prixUSD}$ / ${pub.prixCDF} CDF`,
    forAllClients: true,
    actionUrl: "/video",
    priority: "high",
    data:{ pubId: pub.id }
  });
}

// ✅ RAPPELS INTELLIGENTS - ABONNEMENT + BOOST + PUB VIDÉO + ESSAI
export function checkAndNotifyExpirations(force=false){
  try{
    const now = Date.now();
    if(!force){
      const lastCheck = localStorage.getItem(KEY_LAST_CHECK);
      // En PROD 1x/h, en DEV/test si force=true on ignore
      if(lastCheck && now - Number(lastCheck) < 15*60*1000) return; // 15min max, pas 1h pour que test marche
    }
    localStorage.setItem(KEY_LAST_CHECK, String(now));

    const userRaw = localStorage.getItem("wenze_user");
    const user = userRaw ? JSON.parse(userRaw) : {};
    const userId = user.id || user.ownerWhatsapp || user.whatsapp;
    if(!userId) return;

    // 1. ABONNEMENT 5$/10$ - depuis wenze_abonnement (expireAt ISO de paiement.ts V4)
    try{
      const abRaw = localStorage.getItem("wenze_abonnement") || localStorage.getItem("abonnement_expire_iso") || localStorage.getItem("wenze_abonnement");
      let expireAt: string | null = null;
      let prixUSD = 5;
      if(abRaw){
        try{
          const ab = JSON.parse(abRaw);
          expireAt = ab.expireAt || ab.expire || null;
          prixUSD = ab.prixUSD || ab.prix || 5;
          if(typeof expireAt==="number") expireAt = new Date(expireAt).toISOString();
        } catch{
          // abRaw est directement ISO string
          if(abRaw.includes("T")) expireAt = abRaw;
        }
      }
      const isoFromOther = localStorage.getItem("abonnement_expire_iso");
      if(!expireAt && isoFromOther) expireAt = isoFromOther;

      if(expireAt){
        const expire = new Date(expireAt).getTime();
        const diffDays = Math.ceil((expire - now) / (86400000));
        if(diffDays===5){
          addNotification({ type:"abonnement_rappel_5j", title:"⏰ Abonnement finit dans 5 jours!", message:`WENZE WENZE BUSINESS - Ta boutique ${prixUSD}$ expire dans 5j (${new Date(expireAt).toLocaleDateString("fr-FR")}). Renouvelle pour garder 🔔 notif clients + illimité images+vidéos. Sans renouvellement → Freemium 3 vie sans notif`, boutiqueId:userId, boutiqueName:user.nomEtablissement, prix:`${prixUSD}$`, forUserId:userId, actionUrl:"/abonnement", priority:"high", data:{ expireAt, prixUSD } });
        }
        if(diffDays===1){
          addNotification({ type:"abonnement_rappel_1j", title:"⚠️ Dernier jour! Abonnement expire demain!", message:`WENZE WENZE BUSINESS - Plus que 1j! Ta boutique ${prixUSD}$ expire demain. Renouvelle pour ne pas perdre visibilité + 🔔 notif clients`, boutiqueId:userId, boutiqueName:user.nomEtablissement, prix:`${prixUSD}$`, forUserId:userId, actionUrl:"/abonnement", priority:"high", data:{ expireAt, prixUSD } });
        }
        if(diffDays<=0 && diffDays>-2){ // une seule fois à expiration
          addNotification({ type:"abonnement_expire", title:"❌ Abonnement expiré - Retour Freemium", message:`WENZE WENZE BUSINESS - Ton abonnement ${prixUSD}$ a expiré. Tu es repassé Freemium 3 vie images only, sans droit 🔔 notif. Repaye 5$/10$ pour réactiver + boost gratuit`, boutiqueId:userId, boutiqueName:user.nomEtablissement, forUserId:userId, actionUrl:"/abonnement", priority:"high", data:{ expireAt, prixUSD } });
        }
      }
    } catch{}

    // 2. BOOSTS ANNONCES
    try{
      const list: any[] = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      list.forEach((a:any)=>{
        if(!a.boostUntil) return;
        if(a.userId!==userId && cleanWa(a.ownerWhatsapp)!==cleanWa(user.ownerWhatsapp||user.whatsapp) && a.userId) return;
        const expire = new Date(a.boostUntil).getTime();
        const diffHours = Math.ceil((expire - now) / 3600000);
        if(diffHours===24 || (diffHours<=25 && diffHours>=23)){
          addNotification({ type:"boost_rappel_1j", title:"⏰ Ton boost expire dans 24h!", message:`WENZE WENZE BUSINESS - Boost ${a.boostType||a.titre} ${a.boostPrixUSD||1}$ expire dans 24h. Repaye pour rester TOP + 🔔 notif clients. Annonce: ${a.titre}`, annonceId:a.id, boutiqueId:a.userId, boutiqueName:a.ownerName, image:a.photo, forUserId:userId, actionUrl:`/produit/${a.id}`, priority:"high", data:{ annonceId:a.id, expireAt:a.boostUntil } });
        }
        if(expire < now && expire > now - 24*60*60*1000){
          addNotification({ type:"boost_expire", title:"📉 Boost expiré - Visibilité normale", message:`WENZE WENZE BUSINESS - Ton boost ${a.titre} a expiré. Tu n'es plus TOP ni 🔔 notif. Rebooste 1$/3$/5$ pour revenir TOP`, annonceId:a.id, boutiqueId:a.userId, boutiqueName:a.ownerName, image:a.photo, forUserId:userId, actionUrl:`/produit/${a.id}`, priority:"medium", data:{ annonceId:a.id } });
        }
      });
    } catch{}

    // 3. PUBS VIDEO - wenze_pubs_video depuis paiement.ts V4
    try{
      const pubs: any[] = JSON.parse(localStorage.getItem("wenze_pubs_video")||"[]");
      pubs.forEach((p:any)=>{
        if(!p.expireAt) return;
        const expire = new Date(p.expireAt).getTime();
        const diffDays = Math.ceil((expire - now)/86400000);
        if(diffDays===5){
          addNotification({ type:"pub_video_rappel_5j", title:"⏰ Ta pub vidéo finit dans 5j!", message:`WENZE WENZE BUSINESS - Pub vidéo ${p.label} ${p.prixUSD}$ expire dans 5j. Renouvelle pour garder TOP /video + 🔔 notif clients`, boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement?mode=pub-video", priority:"high", data:{ pubId:p.pubId||p.id, expireAt:p.expireAt, prixUSD:p.prixUSD } });
        }
        if(diffDays===1){
          addNotification({ type:"pub_video_rappel_1j", title:"⚠️ Pub vidéo expire demain!", message:`WENZE WENZE BUSINESS - Plus que 1j! Pub vidéo ${p.label} ${p.prixUSD}$ expire demain. Renouvelle pour rester TOP /video`, boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement?mode=pub-video", priority:"high", data:{ pubId:p.pubId||p.id, expireAt:p.expireAt, prixUSD:p.prixUSD } });
        }
        if(expire < now && expire > now - 24*60*60*1000){
          addNotification({ type:"pub_video_expire", title:"❌ Pub vidéo expirée", message:`WENZE WENZE BUSINESS - Ta pub vidéo ${p.label} a expiré. Repaye 1$/3$/15$ pour revenir TOP /video + 🔔 notif clients`, boutiqueId:userId, forUserId:userId, actionUrl:"/abonnement?mode=pub-video", priority:"high", data:{ pubId:p.pubId||p.id } });
        }
      });
    } catch{}

    // 4. ESSAI 7j
    try{
      const created = user.createdAt ? new Date(user.createdAt).getTime() : 0;
      if(created){
        const diffDaysCreation = Math.ceil((now - created)/86400000);
        if(diffDaysCreation===5){
          addNotification({ type:"essai_rappel", title:"⏳ Essai 7j finit dans 2 jours!", message:`WENZE WENZE BUSINESS - Ton essai gratuit illimité images only finit dans 2j (J5/7). Après → Freemium 3 vie. Passe boutique 5$ pour garder illimité + vidéos + 🔔 notif clients`, forUserId:userId, actionUrl:"/abonnement", priority:"medium", data:{ expireAt: new Date(created+7*86400000).toISOString() } });
        }
        if(diffDaysCreation===7){
          addNotification({ type:"essai_expire" as any, title:"❌ Essai 7j terminé - Freemium 3 vie", message:`WENZE WENZE BUSINESS - Essai gratuit terminé. Tu es passé Freemium 3/3 à vie images only non vidéo. Paye 5$ pour illimité + vidéos + 🔔 notif`, forUserId:userId, actionUrl:"/abonnement", priority:"high", data:{} });
        }
      }
    } catch{}

  } catch(e){ console.log("check exp err",e); }
}

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,""); }

export function getNotifications(forUserId?: string){
  try{
    const list: WenzeNotif[] = JSON.parse(localStorage.getItem(KEY_NOTIFS)||"[]");
    if(forUserId){
      return list.filter(n=> !n.forUserId || n.forUserId===forUserId || n.forAllClients || n.forUserId===undefined);
    }
    return list;
  } catch{ return []; }
}

export function markAsRead(id: string){
  try{
    const list: WenzeNotif[] = JSON.parse(localStorage.getItem(KEY_NOTIFS)||"[]");
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(list.map(n=> n.id===id ? { ...n, read: true } : n)));
  } catch{}
}
export function markAllAsRead(forUserId?: string){
  try{
    const list: WenzeNotif[] = JSON.parse(localStorage.getItem(KEY_NOTIFS)||"[]");
    const filtered = forUserId ? list.map(n=> (n.forUserId===forUserId||n.forAllClients||!n.forUserId) ? {...n, read:true}: n) : list.map(n=> ({ ...n, read: true })));
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(filtered));
  } catch{}
}
export function getUnreadCount(forUserId?: string){
  return getNotifications(forUserId).filter(n=> !n.read).length;
}
export function clearOldNotifs(){
  try{
    const list: WenzeNotif[] = JSON.parse(localStorage.getItem(KEY_NOTIFS)||"[]");
    const thirtyDaysAgo = Date.now()-30*86400000;
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(list.filter(n=> new Date(n.createdAt).getTime()>thirtyDaysAgo)));
  } catch{}
          }
