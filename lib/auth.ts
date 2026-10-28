// lib/auth.ts - V14 PRO FINALE - WENZE WENZE BUSINESS - Règles strictes + Invitation + Garde compteur + WhatsApp immutable - BUILD VERT
export function cleanWa(n:any){ 
  return (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/, ""); 
}

export function getCurrentUser(){
  try{ 
    const r=typeof window!=="undefined" ? localStorage.getItem("wenze_user") : null;
    return r?JSON.parse(r):null;
  }catch{ return null; }
}

export function getAllUsers(){
  try{ 
    const r=typeof window!=="undefined" ? localStorage.getItem("wenze_all_users") : null;
    return r?JSON.parse(r):[];
  }catch{ return []; }
}

// Vérifie si user est propriétaire de l'annonce/boutique - Règle stricte: chacun son compte
export function isOwnerOf(target:any, user:any=null){
  const u = user || getCurrentUser();
  if(!u || !target) return false;
  
  const waU = cleanWa(u.ownerWhatsapp||u.whatsapp||u.id||"");
  const waT = cleanWa(target.ownerWhatsapp||target.whatsapp||target.userId||target.boutiqueId||target.ownerId||"");
  const idU = String(u.id||"").trim();
  const idT = String(target.userId||target.ownerId||target.id||"").trim();
  
  // 1. Match WhatsApp exact - ID unique immutable
  if(waU && waT && waU===waT) return true;
  // 2. Match ID utilisateur
  if(idU && idT && idU===idT) return true;
  // 3. Si target est une boutique avec ownerWhatsapp qui match currentUser.id
  if(waU && idT && waU===cleanWa(idT)) return true;
  
  return false;
}

// Vérifie si on essaie de publier pour autrui - INTERDIT
export function assertNotPublishingForOthers(annonceData:any, user:any=null){
  const u = user || getCurrentUser();
  if(!u) throw new Error("Non connecté - Connexion requise");
  
  const waU = cleanWa(u.ownerWhatsapp||u.whatsapp||"");
  const waAnnonce = cleanWa(annonceData.ownerWhatsapp||annonceData.whatsapp||annonceData.userId||"");
  
  if(waAnnonce && waU && waAnnonce!==waU){
    throw new Error(`⛔ INTERDIT - Tu ne peux pas publier pour ${waAnnonce}. Tu es ${waU}. Chacun publie avec son propre WhatsApp. Règle stricte WENZE WENZE BUSINESS.`);
  }
  return true;
}

export function canPublish(user:any=null){
  const u = user || getCurrentUser();
  if(!u) return { ok:false, msg:"Connecte-toi d'abord - /connexion" };
  
  try{
    // Client occasionnel peut toujours publier (boost payant ou gratuit)
    const isClient = u.role==="client" || u.type==="client" || u.categorieId==="client";
    if(isClient) return { ok:true, msg:"Client - peut publier vente occasionnelle 0$/1$/3$/5$" };
    
    // Boutique: vérifie freemium 3 vie / essai 7j / abonnement 5$/10$
    if(typeof window!=="undefined"){
      const v = (window as any).verifierAbonnement ? (window as any).verifierAbonnement() : null;
      if(v && v.needsPay) return { ok:false, msg: v.message || `Freemium ${v.count}/3 vie atteint - Paye 5$/10$ - Taux 2300` };
    }
    // Fallback checkFreemiumLimit
    try{
      const paiement = require("@/lib/paiement");
      if(paiement.checkFreemiumLimit){
        const lim = paiement.checkFreemiumLimit();
        if(!lim.peutPublier) return { ok:false, msg: lim.message||`Freemium ${lim.count}/3 atteint - Paye 5$/10$ - 0% comm` };
      }
    }catch{}
    
    return { ok:true, msg:"Peut publier - Règle stricte respectée" };
  }catch{ 
    return { ok:true, msg:"Peut publier" }; 
  }
}

export function assertCanPublish(user:any=null){
  const chk = canPublish(user);
  if(!chk.ok) throw new Error(chk.msg);
  return true;
}

export function assertCanEdit(annonce:any, user:any=null){
  const u = user || getCurrentUser();
  if(!u) throw new Error("Non connecté - Connexion requise - /connexion");
  if(!annonce) throw new Error("Annonce introuvable");
  if(!isOwnerOf(annonce, u)) throw new Error(`⛔ INTERDIT - Tu ne peux pas modifier l'annonce d'autrui (${annonce.id||""}). Tu es ${cleanWa(u.ownerWhatsapp||u.whatsapp)} - Elle est à ${cleanWa(annonce.ownerWhatsapp||annonce.whatsapp||annonce.userId)}. Chacun gère ses propres annonces. Règle stricte WENZE WENZE BUSINESS.`);
  return true;
}

export function assertCanDelete(annonce:any, user:any=null){
  // Même règle que edit - chacun supprime ses propres annonces
  return assertCanEdit(annonce, user);
}

export function assertCanEditProfile(profileId:string, user:any=null){
  const u = user || getCurrentUser();
  if(!u) throw new Error("Non connecté - /connexion");
  if(!profileId) throw new Error("Profil ID manquant");
  
  const waU = cleanWa(u.ownerWhatsapp||u.whatsapp||u.id||"");
  const waP = cleanWa(profileId);
  const idU = String(u.id||"");
  const idP = String(profileId);
  
  const isSelf = (waU && waP && waU===waP) || (idU && idP && idU===idP) || (waU && waU===cleanWa(idP));
  
  if(!isSelf) throw new Error(`⛔ INTERDIT - Tu ne peux pas modifier le profil d'autrui (${profileId}). Tu es ${waU}. Chacun son profil - WhatsApp = ID unique non modifiable. Règle stricte WENZE WENZE BUSINESS.`);
  return true;
}

// WhatsApp immutable - non modifiable pour éviter vol de boutique
export function validateWhatsAppImmutable(oldWa:string, newWa:string){
  const oldClean = cleanWa(oldWa);
  const newClean = cleanWa(newWa);
  if(oldClean && newClean && oldClean!==newClean){
    throw new Error(`⛔ INTERDIT - WhatsApp non modifiable. Ton WhatsApp ${oldClean} est ton ID unique. Pour changer, crée nouveau compte via invitation d'amis dans /profil. Règle stricte anti-fraude.`);
  }
  return true;
}

// Invitation - ne peut pas s'inviter soi-même
export function assertCanInvite(toWa:string, user:any=null){
  const u = user || getCurrentUser();
  if(!u) throw new Error("Connecte-toi pour inviter - /connexion");
  const fromWa = cleanWa(u.ownerWhatsapp||u.whatsapp||"");
  const toClean = cleanWa(toWa);
  if(!toClean || toClean.length<9) throw new Error("Numéro WhatsApp invalide - Min 9 chiffres");
  if(fromWa===toClean) throw new Error("⛔ Tu ne peux pas t'inviter toi-même - Règle stricte");
  
  // Vérifie si ce numéro a déjà un compte
  const all = getAllUsers();
  if(all.find((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp)===toClean)){
    throw new Error(`Ce numéro ${toClean} a déjà un compte WENZE - Il doit se connecter, pas être invité`);
  }
  return true;
}

// Garde compteur - pour edit sans reset à zéro
export function getKeepDates(annonce:any){
  if(!annonce) return null;
  return {
    createdAt: annonce.createdAt||annonce.created_at,
    boostUntil: annonce.boostUntil,
    expireAt: annonce.expireAt||annonce.boostUntil,
    remainingDays: annonce.boostUntil ? Math.ceil((new Date(annonce.boostUntil).getTime()-Date.now())/86400000) : null,
    originalId: annonce.id
  };
}

export function assertIsLogged(user:any=null){
  const u = user || getCurrentUser();
  if(!u) throw new Error("Non connecté - Va à /connexion");
  return u;
}

// Pour /publier - vérifie que l'user est bien proprio avant de charger edit
export function assertCanLoadEdit(editId:string, user:any=null){
  const u = user || getCurrentUser();
  if(!u) throw new Error("Non connecté");
  if(!editId) throw new Error("ID annonce manquant");
  if(typeof window==="undefined") return true;
  try{
    const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
    const old = list.find((x:any)=> x.id===editId);
    if(!old) throw new Error(`Annonce ${editId} introuvable`);
    assertCanEdit(old, u);
    return old;
  }catch(e){ throw e; }
      }
