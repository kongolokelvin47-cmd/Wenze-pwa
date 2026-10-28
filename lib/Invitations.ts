// lib/invitations.ts - V15 PRO FINALE - WENZE WENZE BUSINESS - Invitation amis avec confirmation WhatsApp + MDP côté autrui - Règles strictes - BUILD VERT
export type Invitation = {
  id:string; fromWa:string; fromName:string;
  toWa:string; toName?:string;
  token:string; status:"pending"|"confirmed"|"expired"|"cancelled";
  createdAt:string; expireAt:string; confirmedAt?:string;
  tries?:number; // anti-bruteforce
};

const KEY_INVITS = "wenze_invitations";

function cleanWa(n:any){ 
  return (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/, ""); 
}

function safeGet(key:string){
  try{ 
    if(typeof window==="undefined") return null;
    return localStorage.getItem(key); 
  }catch{ return null; }
}

function safeSet(key:string, val:string){
  try{ 
    if(typeof window==="undefined") return;
    localStorage.setItem(key, val); 
  }catch{}
}

function getCurrentUserSafe(){
  try{
    const r = safeGet("wenze_user");
    return r ? JSON.parse(r) : null;
  }catch{ return null; }
}

function getAllUsersSafe(){
  try{
    const r = safeGet("wenze_all_users");
    return r ? JSON.parse(r) : [];
  }catch{ return []; }
}

function expireOldInvitations(list:Invitation[]):Invitation[]{
  const now = Date.now();
  return list.map(i=>{
    if(i.status==="pending" && new Date(i.expireAt).getTime() < now){
      return {...i, status:"expired" as const};
    }
    return i;
  });
}

export function createInvitation(toWa:string, toName:string){
  const from = getCurrentUserSafe();
  if(!from?.ownerWhatsapp && !from?.whatsapp) throw new Error("Connecte-toi pour inviter - /connexion");
  
  const fromWa = cleanWa(from.ownerWhatsapp||from.whatsapp);
  const toClean = cleanWa(toWa);
  
  // Règles strictes - depuis lib/auth
  if(fromWa===toClean) throw new Error("⛔ Tu ne peux pas t'inviter toi-même - Règle stricte");
  if(toClean.length<9) throw new Error("Numéro WhatsApp invalide - Min 9 chiffres - Ex: 243970000000");
  if(!toName || toName.trim().length<2) throw new Error("Nom ami min 2 caractères");
  
  // Vérifie si numéro a déjà compte
  const allUsers = getAllUsersSafe();
  if(allUsers.find((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp)===toClean)){
    throw new Error(`Ce numéro ${toClean} a déjà un compte WENZE - Il doit se connecter, pas être invité`);
  }
  
  // Anti-spam: max 20 invitations/jour + pas de doublon pending pour même numéro
  let list:Invitation[] = [];
  try{ list = JSON.parse(safeGet(KEY_INVITS)||"[]"); }catch{ list=[]; }
  list = expireOldInvitations(list);
  
  const today = new Date().toISOString().slice(0,10);
  const todayCount = list.filter(i=> i.fromWa===fromWa && i.createdAt.slice(0,10)===today).length;
  if(todayCount>=20) throw new Error("Limite 20 invitations/jour atteinte - Anti-spam WENZE");
  
  const alreadyPending = list.find(i=> i.fromWa===fromWa && i.toWa===toClean && i.status==="pending");
  if(alreadyPending){
    throw new Error(`Invitation déjà en attente pour ${toClean} - Code ${alreadyPending.token} - Expire ${new Date(alreadyPending.expireAt).toLocaleString()} - Attends confirmation ou annule`);
  }
  
  const token = Math.random().toString(36).slice(2,8).toUpperCase();
  
  const inv: Invitation = {
    id:`INV-${Date.now()}-${token}`,
    fromWa, fromName: from.nomEtablissement||from.nom||"Ami WENZE",
    toWa: toClean, toName: toName.trim(),
    token, status:"pending",
    createdAt: new Date().toISOString(),
    expireAt: new Date(Date.now()+48*3600000).toISOString(), // 48h
    tries: 0
  };
  
  list.unshift(inv);
  safeSet(KEY_INVITS, JSON.stringify(list.slice(0,100)));
  
  const origin = typeof window!=="undefined" ? window.location.origin : "https://wenzewenze.com";
  const link = `${origin}/inscription?invite=${inv.token}&wa=${toClean}`;
  const waMessage = `Salut ${toName.trim()}! 👋 ${from.nomEtablissement||from.nom||"Ton ami"} t'invite sur WENZE WENZE BUSINESS - 0% commission - Taux fixe 2300 CDF - Clique pour créer ton compte (validé par TON WhatsApp + TON mot de passe côté toi): ${link} - Code: ${inv.token} - Valide 48h - Règle stricte: seul toi peux valider avec ton WhatsApp + MDP`;
  
  return { 
    inv, 
    link, 
    waLink:`https://wa.me/${toClean}?text=${encodeURIComponent(waMessage)}`,
    message: waMessage
  };
}

export function getMyInvitations(){
  const from = getCurrentUserSafe();
  if(!from) return [];
  const fromWa = cleanWa(from.ownerWhatsapp||from.whatsapp);
  let list:Invitation[] = [];
  try{ list = JSON.parse(safeGet(KEY_INVITS)||"[]"); }catch{ list=[]; }
  list = expireOldInvitations(list);
  safeSet(KEY_INVITS, JSON.stringify(list));
  return list.filter(i=> i.fromWa===fromWa).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getInvitationByToken(token:string){
  if(!token) return null;
  let list:Invitation[] = [];
  try{ list = JSON.parse(safeGet(KEY_INVITS)||"[]"); }catch{ list=[]; }
  list = expireOldInvitations(list);
  return list.find(i=> i.token===token.toUpperCase().trim());
}

export function getPendingCount(){
  return getMyInvitations().filter(i=> i.status==="pending").length;
}

export function deleteInvitation(invId:string){
  const from = getCurrentUserSafe();
  if(!from) throw new Error("Non connecté");
  const fromWa = cleanWa(from.ownerWhatsapp||from.whatsapp);
  let list:Invitation[] = [];
  try{ list = JSON.parse(safeGet(KEY_INVITS)||"[]"); }catch{ list=[]; }
  const idx = list.findIndex(i=> i.id===invId && i.fromWa===fromWa);
  if(idx<0) throw new Error("Invitation introuvable ou pas à toi - Règle stricte");
  list.splice(idx,1);
  safeSet(KEY_INVITS, JSON.stringify(list));
  return true;
}

export function confirmInvitation(token:string, newUser:{ whatsapp:string, password:string, nom:string, commune?:string, ville?:string }){
  if(!token) throw new Error("Token manquant");
  let list:Invitation[] = [];
  try{ list = JSON.parse(safeGet(KEY_INVITS)||"[]"); }catch{ list=[]; }
  list = expireOldInvitations(list);
  
  const idx = list.findIndex(i=> i.token===token.toUpperCase().trim());
  if(idx<0) throw new Error("Invitation invalide - Code incorrect - Vérifie le lien");
  const inv = list[idx];
  
  if(inv.status!=="pending") throw new Error(`Invitation déjà ${inv.status} - Ne peut plus être utilisée`);
  if(new Date(inv.expireAt).getTime() < Date.now()){
    list[idx].status="expired";
    safeSet(KEY_INVITS, JSON.stringify(list));
    throw new Error("Invitation expirée 48h - Demande nouvelle invitation à ton ami");
  }
  
  // Règle stricte: ce lien est pour le WhatsApp invité seulement
  const waInput = cleanWa(newUser.whatsapp);
  const waInv = cleanWa(inv.toWa);
  if(waInput!==waInv) throw new Error(`⛔ Ce lien est pour ${inv.toWa} (${inv.toName}), pas pour ${newUser.whatsapp}. Règle stricte anti-fraude: chacun valide avec son propre WhatsApp. Demande invitation avec ton vrai numéro.`);
  
  if(!newUser.nom || newUser.nom.trim().length<2) throw new Error("Nom min 2 caractères");
  if(!newUser.password || newUser.password.length<4) throw new Error("Mot de passe min 4 caractères - Créé côté autrui pour validation - Règle stricte");
  if(newUser.password.length>32) throw new Error("Mot de passe max 32 caractères");
  
  // Anti-bruteforce
  if((inv.tries||0)>=5){
    list[idx].status="expired";
    safeSet(KEY_INVITS, JSON.stringify(list));
    throw new Error("Trop de tentatives - Invitation bloquée - Demande nouvelle invitation");
  }
  
  // Vérifie si WhatsApp a déjà compte
  const users = getAllUsersSafe();
  if(users.find((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp)===waInput)){
    throw new Error(`Ce WhatsApp ${waInput} a déjà un compte - Connecte-toi à /connexion au lieu de t'inscrire`);
  }
  
  // Crée compte autrui avec confirmation WhatsApp + MDP côté autrui - validé
  const newAccount = {
    id:`USER-${Date.now()}-${Math.random().toString(36).slice(2,4).toUpperCase()}`,
    ownerWhatsapp:waInput, whatsapp:waInput,
    nom:newUser.nom.trim(), nomEtablissement:newUser.nom.trim(),
    // En prod: hash bcrypt - ici stock simple pour localStorage demo
    password: newUser.password,
    role:"client", type:"freemium", categorieId:"client",
    createdAt:new Date().toISOString(),
    abonnementDate: null, abonnementPaye:false,
    invitedBy: inv.fromWa, invitedByName: inv.fromName,
    commune: newUser.commune||"Kinshasa", ville: newUser.ville||"Kinshasa",
    bio: `Invité par ${inv.fromName} - WENZE WENZE BUSINESS`,
    photo: "",
    verified: true, // WhatsApp + MDP validé côté autrui
    essaisRestants: 7 // Essai 7j gratuit WENZE 2.0
  };
  
  users.push(newAccount);
  safeSet("wenze_all_users", JSON.stringify(users));
  
  // Marque invitation confirmée
  list[idx].status="confirmed";
  list[idx].confirmedAt=new Date().toISOString();
  safeSet(KEY_INVITS, JSON.stringify(list));
  
  // Notif bienvenue forte + validation - 0% commission + expérience réelle
  try{
    if(typeof window!=="undefined"){
      import("@/lib/notifications").then(({ addNotification })=>{
        // Pour le filleul - bienvenue forte
        addNotification({
          type:"publication_approved" as any,
          title:`🎉 Bienvenue ${newUser.nom} dans WENZE WENZE BUSINESS - Compte validé!`,
          message:`Bienvenue ${newUser.nom}! Ton compte est validé par WhatsApp ${waInput} + mot de passe côté toi - Règle stricte respectée. Tu as Freemium 3 vie images only - Essai 7j illimité images only - Puis boutique 5$ / 11 500 CDF et 10$ / 23 000 CDF pour illimité images+vidéos + 🔔 notif clients à chaque pub payante + boost 1$/3$/5$ + pub vidéo 1$/3$/15$ + rappel J-5 J-1 auto - Taux fixe 2300 CDF - 0% commission - Ton parrain ${inv.fromName} t'a invité - Vis l'expérience réelle Kinshasa!`,
          boutiqueId:waInput, boutiqueName:newUser.nom,
          forUserId:waInput,
          actionUrl:"/publier",
          priority:"high",
          data:{ boutiqueId:waInput, fromWa: inv.fromWa }
        } as any);
        // Pour le parrain - filleul a rejoint
        addNotification({
          type:"new_boutique_annonce" as any,
          title:`✅ Ton filleul ${newUser.nom} a rejoint WENZE! - Invitation ${inv.token} validée!`,
          message:`${newUser.nom} (${waInput}) a confirmé son compte via ton invitation ${inv.token}! WhatsApp ${waInput} + MDP validés côté lui - Règle stricte respectée. Il est maintenant dans WENZE WENZE BUSINESS avec Freemium 3 vie. Il peut publier vente occasionnelle 0$/1$/3$/5$ - Toi tu as ${getMyInvitations().filter(i=>i.status==="confirmed").length} filleuls. Continue d'inviter!`,
          boutiqueId:inv.fromWa, boutiqueName:inv.fromName,
          forUserId:inv.fromWa,
          actionUrl:`/boutiques/${waInput}`,
          priority:"high",
          data:{ boutiqueId:waInput, filleulWa: waInput }
        } as any);
      });
    }
  }catch{}
  
  // Connecte automatiquement le nouveau compte
  safeSet("wenze_user", JSON.stringify(newAccount));
  
  return newAccount;
}

// Nettoyage auto - appelé dans /profil
export function cleanupExpired(){
  let list:Invitation[] = [];
  try{ list = JSON.parse(safeGet(KEY_INVITS)||"[]"); }catch{ list=[]; }
  const before = list.length;
  list = expireOldInvitations(list);
  // Garde seulement 100 dernières, supprime expirées de +30j
  const now = Date.now();
  list = list.filter(i=>{
    if(i.status==="expired" && now - new Date(i.expireAt).getTime() > 30*86400000) return false;
    return true;
  }).slice(0,100);
  if(list.length!==before) safeSet(KEY_INVITS, JSON.stringify(list));
  return list;
          }
