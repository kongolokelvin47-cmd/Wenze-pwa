// lib/notifications.ts - WENZE WENZE BUSINESS - Notification intelligente complète + Rappels
export type NotifType = "publication_approved" | "abonnement_payed" | "boost_payed" | "new_boutique_annonce" | "abonnement_rappel_5j" | "abonnement_rappel_1j" | "abonnement_expire" | "boost_rappel_1j" | "boost_expire" | "essai_rappel";

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
}

const KEY_NOTIFS = "wenze_notifications";
const KEY_LAST_CHECK = "wenze_notif_last_check";

export function addNotification(notif: Omit<WenzeNotif, "id" | "read" | "createdAt">){
  try{
    const list: WenzeNotif[] = JSON.parse(localStorage.getItem(KEY_NOTIFS)||"[]");
    // Anti-spam: ne pas dupliquer même type même annonce même jour
    const today = new Date().toISOString().slice(0,10);
    const exists = list.find(n=> n.type===notif.type && n.annonceId===notif.annonceId && n.createdAt.slice(0,10)===today && n.type.includes("rappel"));
    if(exists) return null;

    const newNotif: WenzeNotif = {
      ...notif,
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newNotif);
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(list.slice(0,120)));
    window.dispatchEvent(new CustomEvent("wenze-notif", { detail: newNotif }));
    return newNotif;
  } catch(e){ return null; }
}

export function notifyClientsNewAnnonce(annonce: any, user: any){
  const hasDroit = !!annonce.boostUntil || (user?.abonnementPaye) || annonce.boutiquePrixUSD>=5 || annonce.boostType;
  
  if(!hasDroit){
    addNotification({
      type: "publication_approved",
      title: "✅ Publication approuvée - Freemium 3 vie",
      message: `${annonce.titre} - ${annonce.prix}$ publié en images only. Tu n'as pas droit à notif clients. Passe boutique 5$ / 11 500 CDF pour notifier tous les clients WENZE WENZE BUSINESS + vidéos`,
      annonceId: annonce.id,
      boutiqueId: annonce.userId,
      boutiqueName: annonce.ownerName,
      prix: `${annonce.prix}$ / ${annonce.prixCDF?.toLocaleString()} CDF`,
      image: annonce.photo,
      forUserId: annonce.userId,
      actionUrl: `/produit/${annonce.id}`,
      priority: "medium"
    });
    return;
  }

  addNotification({
    type: "publication_approved",
    title: "✅ Publication approuvée + Clients notifiés!",
    message: `${annonce.titre} - ${annonce.prix}$ - Visible TOP + push notif à tous les clients WENZE WENZE BUSINESS - ${annonce.typeVente==="occasionnelle"?`Boost ${annonce.boostType} ${annonce.boostPrixUSD}$`:`Boutique ${annonce.boutiquePrixUSD}$`}`,
    annonceId: annonce.id,
    boutiqueId: annonce.userId,
    boutiqueName: annonce.ownerName,
    prix: `${annonce.prix}$ / ${annonce.prixCDF?.toLocaleString()} CDF`,
    image: annonce.photo,
    forUserId: annonce.userId,
    actionUrl: `/produit/${annonce.id}`,
    priority: "high"
  });

  addNotification({
    type: "new_boutique_annonce",
    title: `🏬 Nouvelle annonce ${annonce.typeVente==="occasionnelle"?"occasionnelle boostée":"boutique payante"}!`,
    message: `${annonce.ownerName} vient de publier ${annonce.titre} à ${annonce.prix}$ / ${annonce.prixCDF?.toLocaleString()} CDF - ${annonce.commune} - Clique pour voir - WENZE WENZE BUSINESS`,
    annonceId: annonce.id,
    boutiqueId: annonce.userId,
    boutiqueName: annonce.ownerName,
    prix: `${annonce.prix}$ / ${annonce.prixCDF?.toLocaleString()} CDF`,
    image: annonce.photo,
    forAllClients: true,
    actionUrl: `/produit/${annonce.id}`,
    priority: "high"
  });
}

export function notifyAbonnementPayed(user: any, prixUSD: number, prixCDF: number){
  addNotification({
    type: "abonnement_payed",
    title: "✅ Abonnement payé - Droits instant!",
    message: `WENZE WENZE BUSINESS - Boutique ${prixUSD}$ / ${prixCDF.toLocaleString()} CDF activée 30j - Illimité images+vidéos + 🔔 notif clients à chaque publication + boost gratuit 1/mois + rappel J-5 avant expiration - Taux 2300`,
    boutiqueId: user?.id || user?.ownerWhatsapp,
    boutiqueName: user?.nomEtablissement || user?.nom,
    prix: `${prixUSD}$ / ${prixCDF.toLocaleString()} CDF`,
    forUserId: user?.id,
    actionUrl: "/publier",
    priority: "high"
  });
}

export function notifyBoostPayed(user: any, annonceId: string, boost: any){
  addNotification({
    type: "boost_payed",
    title: `🚀 Boost ${boost.label} activé!`,
    message: `${boost.label} ${boost.prixUSD}$ / ${boost.prixCDF} CDF - TOP feed 24h + 🔔 notif clients + rappel J-1 avant expiration - WENZE WENZE BUSINESS - ${annonceId}`,
    annonceId,
    boutiqueId: user?.id,
    boutiqueName: user?.nomEtablissement,
    prix: `${boost.prixUSD}$ / ${boost.prixCDF} CDF`,
    forUserId: user?.id,
    actionUrl: `/produit/${annonceId}`,
    priority: "high"
  });
}

// ✅ NOUVEAU - RAPPELS INTELLIGENTS ABONNEMENT + BOOST
export function checkAndNotifyExpirations(){
  try{
    const now = Date.now();
    const lastCheck = localStorage.getItem(KEY_LAST_CHECK);
    // Vérifie max 1x par heure
    if(lastCheck && now - Number(lastCheck) < 60*60*1000) return;
    localStorage.setItem(KEY_LAST_CHECK, String(now));

    const user = JSON.parse(localStorage.getItem("wenze_user")||"{}");
    const userId = user.id || user.ownerWhatsapp;
    if(!userId) return;

    // 1. CHECK ABONNEMENT - depuis verifierAbonnement stocké
    try{
      const abRaw = localStorage.getItem("wenze_abonnement");
      if(abRaw){
        const ab = JSON.parse(abRaw);
        if(ab.expireAt){
          const expire = new Date(ab.expireAt).getTime();
          const diffDays = Math.ceil((expire - now) / (24*60*60*1000));
          
          if(diffDays===5){
            addNotification({
              type: "abonnement_rappel_5j",
              title: "⏰ Ton abonnement finit dans 5 jours!",
              message: `WENZE WENZE BUSINESS - Ta boutique ${ab.prixUSD||5}$ expire dans 5j. Renouvelle maintenant pour garder droit notif clients + images+vidéos illimité. Sans renouvellement → retour Freemium 3 vie sans notif`,
              boutiqueId: userId,
              boutiqueName: user.nomEtablissement,
              prix: `${ab.prixUSD||5}$`,
              forUserId: userId,
              actionUrl: "/abonnement",
              priority: "high"
            });
          }
          if(diffDays===1){
            addNotification({
              type: "abonnement_rappel_1j",
              title: "⚠️ Dernier jour! Abonnement expire demain!",
              message: `WENZE WENZE BUSINESS - Plus que 1 jour! Ta boutique ${ab.prixUSD||5}$ expire demain. Renouvelle pour ne pas perdre visibilité + notif clients`,
              boutiqueId: userId,
              boutiqueName: user.nomEtablissement,
              prix: `${ab.prixUSD||5}$`,
              forUserId: userId,
              actionUrl: "/abonnement",
              priority: "high"
            });
          }
          if(diffDays<=0){
            addNotification({
              type: "abonnement_expire",
              title: "❌ Abonnement expiré - Retour Freemium",
              message: `WENZE WENZE BUSINESS - Ton abonnement a expiré. Tu es repassé Freemium 3 vie images only, sans droit notif clients. Repaye 5$/10$ pour réactiver`,
              boutiqueId: userId,
              boutiqueName: user.nomEtablissement,
              forUserId: userId,
              actionUrl: "/abonnement",
              priority: "high"
            });
          }
        }
      }
    } catch{}

    // 2. CHECK ESSAI 7j
    try{
      const essaiRaw = localStorage.getItem("wenze_essai");
      if(essaiRaw){
        const essai = JSON.parse(essaiRaw);
        if(essai.expireAt){
          const diffDays = Math.ceil((new Date(essai.expireAt).getTime() - now) / (86400000));
          if(diffDays===2){
            addNotification({
              type: "essai_rappel",
              title: "⏳ Essai 7j finit dans 2 jours!",
              message: `WENZE WENZE BUSINESS - Ton essai gratuit illimité images only finit dans 2j. Après → Freemium 3 vie. Passe boutique 5$ pour garder illimité + vidéos + notif clients`,
              forUserId: userId,
              actionUrl: "/abonnement",
              priority: "medium"
            });
          }
        }
      }
    } catch{}

    // 3. CHECK BOOSTS PUBLICITÉS
    try{
      const list: any[] = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      list.forEach((a:any)=>{
        if(!a.boostUntil) return;
        const expire = new Date(a.boostUntil).getTime();
        const diffHours = Math.ceil((expire - now) / (3600000));
        const diffDays = Math.ceil(diffHours/24);
        
        if(diffHours===24 || diffDays===1){
          if(a.userId!==userId && a.ownerWhatsapp!==user.ownerWhatsapp) return;
          addNotification({
            type: "boost_rappel_1j",
            title: "⏰ Ton boost expire dans 24h!",
            message: `WENZE WENZE BUSINESS - Boost ${a.boostType||a.titre} ${a.boostPrixUSD||1}$ expire dans 24h. Repaye pour rester TOP + notif clients. Annonce: ${a.titre}`,
            annonceId: a.id,
            boutiqueId: a.userId,
            boutiqueName: a.ownerName,
            image: a.photo,
            forUserId: userId,
            actionUrl: `/produit/${a.id}`,
            priority: "high"
          });
        }
        if(expire < now && expire > now - 24*60*60*1000){ // expiré depuis moins de 24h
          if(a.userId!==userId && a.ownerWhatsapp!==user.ownerWhatsapp) return;
          addNotification({
            type: "boost_expire",
            title: "📉 Boost expiré - Visibilité normale",
            message: `WENZE WENZE BUSINESS - Ton boost ${a.titre} a expiré. Tu n'es plus TOP feed ni notif clients. Rebooste 1$/3$/5$ pour revenir TOP`,
            annonceId: a.id,
            boutiqueId: a.userId,
            boutiqueName: a.ownerName,
            image: a.photo,
            forUserId: userId,
            actionUrl: `/produit/${a.id}`,
            priority: "medium"
          });
        }
      });
    } catch{}

  } catch(e){ console.log(e); }
}

export function getNotifications(forUserId?: string){
  try{
    const list: WenzeNotif[] = JSON.parse(localStorage.getItem(KEY_NOTIFS)||"[]");
    if(forUserId){
      return list.filter(n=> !n.forUserId || n.forUserId===forUserId || n.forAllClients);
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
export function markAllAsRead(){
  try{
    const list: WenzeNotif[] = JSON.parse(localStorage.getItem(KEY_NOTIFS)||"[]");
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(list.map(n=> ({ ...n, read: true }))));
  } catch{}
}
export function getUnreadCount(forUserId?: string){
  return getNotifications(forUserId).filter(n=> !n.read).length;
}
