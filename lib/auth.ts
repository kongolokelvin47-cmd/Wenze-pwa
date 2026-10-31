// lib/auth.ts - WENZE WENZE BUSINESS MULTI-TICKETS - TON MARCHÉ.CD
// Règles: Chacun son compte, WhatsApp immutable, Tickets stricts cumulables, Suppression libère place, Max 50 actives

export function cleanWa(n:any){ 
  return (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/, ""); 
}
export function getCurrentUser(){
  try{ const r=typeof window!=="undefined" ? localStorage.getItem("wenze_user") : null; return r?JSON.parse(r):null; }catch{ return null; }
}
export function getAllUsers(){
  try{ const r=typeof window!=="undefined" ? localStorage.getItem("wenze_all_users") : null; return r?JSON.parse(r):[]; }catch{ return []; }
}
function safeParse(k:string){ try{ const r=typeof window!=="undefined"?localStorage.getItem(k):null; return r?JSON.parse(r):[]; }catch{ return []; } }

// ========== OWNER CHECK - RÈGLE STRICTE ==========
export function isOwnerOf(target:any, user:any=null){
  const u = user || getCurrentUser();
  if(!u || !target) return false;
  const waU = cleanWa(u.ownerWhatsapp||u.whatsapp||u.id||"");
  const waT = cleanWa(target.ownerWhatsapp||target.whatsapp||target.userId||target.boutiqueId||target.ownerId||"");
  const idU = String(u.id||"").trim();
  const idT = String(target.userId||target.ownerId||target.id||"").trim();
  if(waU && waT && waU===waT) return true;
  if(idU && idT && idU===idT) return true;
  if(waU && idT && waU===cleanWa(idT)) return true;
  return false;
}

export function assertNotPublishingForOthers(annonceData:any, user:any=null){
  const u = user || getCurrentUser();
  if(!u) throw new Error("Non connecté - /connexion");
  const waU = cleanWa(u.ownerWhatsapp||u.whatsapp||"");
  const waAnnonce = cleanWa(annonceData.ownerWhatsapp||annonceData.whatsapp||annonceData.userId||"");
  if(waAnnonce && waU && waAnnonce!==waU){
    throw new Error(`⛔ INTERDIT - Tu ne peux pas publier pour ${waAnnonce}. Tu es ${waU}. Chacun publie avec son propre WhatsApp.`);
  }
  return true;
}

// ========== V6 STRICT MULTI-TICKETS ==========
export function canPublish(user:any=null, ticketId?:string){
  const u = user || getCurrentUser();
  if(!u) return { ok:false, msg:"Connecte-toi d'abord - /connexion" };

  try{
    const { verifierAbonnement, isCompteCache } = require("@/lib/paiement");
    const ab = verifierAbonnement();
    
    // 1. Compte caché? Bloque sauf si ticket actif
    if(ab.isCache){
      return { ok:false, msg:`🔒 Compte caché - Freemium 30j expiré + 0 ticket actif - Paye 5$ pour réapparaître - Taux 2300 - ${ab.message}`, ab };
    }
    
    // 2. Max 50 actives global
    const list = safeParse("wenze_annonces_list");
    const waU = cleanWa(u.ownerWhatsapp||u.whatsapp||u.id);
    const myCount = list.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===waU).length;
    if(myCount >= 50){
      return { ok:false, msg:`⛔ Max 50 actives atteint (${myCount}/50) - Archive ou supprime une ancienne - Suppression libère place V6`, ab, count:myCount };
    }

    // 3. Si ticketId donné: check places strictes dans ce ticket
    if(ticketId){
      const tickets = safeParse("wenze_tickets");
      const occs = safeParse("wenze_occasionnel");
      const allTickets = [...tickets, ...occs];
      const t = allTickets.find((x:any)=> x.ticketId===ticketId);
      if(!t) return { ok:false, msg:`Ticket ${ticketId} introuvable`, ab };
      if(new Date(t.expireAt).getTime() < Date.now()) return { ok:false, msg:`Ticket ${t.palierId||'OCC'} ${t.dureeId||''} expiré le ${new Date(t.expireAt).toLocaleDateString("fr-FR")} - Renouvelle ♻️`, ab, ticket:t };
      if(t.imagesUsed >= t.imagesMax) return { ok:false, msg:`Ticket ${t.palierId||'OCC'} ${t.dureeId||''} plein ${t.imagesUsed}/${t.imagesMax} places strictes - Achète autre ticket - N'écrase pas - Cumulable`, ab, ticket:t };
      return { ok:true, msg:`Peut publier dans ${t.palierId||'OCC'} ${t.dureeId||''} - ${t.imagesMax - t.imagesUsed} places libres sur ${t.jours}j strict`, ab, ticket:t, count:myCount };
    }

    // 4. Sans ticketId: check global
    if(ab.isPaye){
      if(ab.placesRestantes!==undefined && ab.placesRestantes <=0){
        return { ok:false, msg:`Tous tes tickets sont pleins ${ab.totalImagesMax-ab.placesRestantes}/${ab.totalImagesMax} strictes - Achète nouveau ticket cumulable ou renouvelle - Suppression libère place`, ab, count:myCount };
      }
      return { ok:true, msg:`Peut publier - ${ab.ticketsActifs?.length||0} tickets actifs - ${ab.placesRestantes} places libres strictes - Max 50`, ab, count:myCount };
    }

    // 5. Freemium 3 à vie strictes
    if(ab.isFreemium){
      if(!ab.peutPublier) return { ok:false, msg:`🆓 Freemium 3/3 à vie strictes atteint (${ab.count}/3) - Paye STANDARD 5$ pour 1-4 places strictes + 1 vidéo 15s - 0% comm`, ab, count:ab.count };
      return { ok:true, msg:`Freemium ${ab.count}/${ab.count+ab.imagesRestantes} - Reste ${ab.imagesRestantes} places strictes à vie - 30j`, ab, count:ab.count };
    }

    return { ok:false, msg: ab.message||"Ne peut pas publier - Compte caché?", ab };
  }catch(e:any){
    // Fallback ancien
    try{
      const paiement = require("@/lib/paiement");
      if(paiement.checkFreemiumLimit){
        const lim = paiement.checkFreemiumLimit();
        if(!lim.peutPublier) return { ok:false, msg: lim.message };
      }
    }catch{}
    return { ok:true, msg:"Peut publier (fallback)" };
  }
}

export function assertCanPublish(user:any=null, ticketId?:string){
  const chk = canPublish(user, ticketId);
  if(!chk.ok) throw new Error(chk.msg);
  return chk;
}

export function assertCanPublishInTicket(ticketId:string, user:any=null){
  if(!ticketId) throw new Error("Choisis le ticket où publier - Règle V6 stricte: 1 ticket = X places sur Y jours");
  return assertCanPublish(user, ticketId);
}

export function assertCanEdit(annonce:any, user:any=null){
  const u = user || getCurrentUser();
  if(!u) throw new Error("Non connecté - /connexion");
  if(!annonce) throw new Error("Annonce introuvable");
  if(!isOwnerOf(annonce, u)) throw new Error(`⛔ INTERDIT - Tu ne peux pas modifier l'annonce d'autrui (${annonce.id||""}). Tu es ${cleanWa(u.ownerWhatsapp||u.whatsapp)} - Elle est à ${cleanWa(annonce.ownerWhatsapp||annonce.whatsapp||annonce.userId)}. Règle stricte.`);
  return true;
}

export function assertCanDelete(annonce:any, user:any=null){
  // V6: suppression libère place
  assertCanEdit(annonce, user);
  return true;
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
  if(!isSelf) throw new Error(`⛔ INTERDIT - Tu ne peux pas modifier le profil d'autrui (${profileId}). WhatsApp = ID unique non modifiable.`);
  return true;
}

export function validateWhatsAppImmutable(oldWa:string, newWa:string){
  const oldClean = cleanWa(oldWa);
  const newClean = cleanWa(newWa);
  if(oldClean && newClean && oldClean!==newClean){
    throw new Error(`⛔ INTERDIT - WhatsApp non modifiable. Ton WhatsApp ${oldClean} est ton ID unique. Pour changer, crée nouveau compte via invitation dans /profil.`);
  }
  return true;
}

export function assertCanInvite(toWa:string, user:any=null){
  const u = user || getCurrentUser();
  if(!u) throw new Error("Connecte-toi pour inviter - /connexion");
  const fromWa = cleanWa(u.ownerWhatsapp||u.whatsapp||"");
  const toClean = cleanWa(toWa);
  if(!toClean || toClean.length<9) throw new Error("Numéro WhatsApp invalide - Min 9 chiffres");
  if(fromWa===toClean) throw new Error("⛔ Tu ne peux pas t'inviter toi-même");
  const all = getAllUsers();
  if(all.find((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp)===toClean)){
    throw new Error(`Ce numéro ${toClean} a déjà un compte - Il doit se connecter`);
  }
  return true;
}

// V6: Garde compteur + ticketId pour edit sans reset
export function getKeepDates(annonce:any){
  if(!annonce) return null;
  return {
    createdAt: annonce.createdAt||annonce.created_at,
    expireAt: annonce.expireAt||annonce.boostUntil||annonce.ticketExpireAt,
    ticketId: annonce.ticketId||null,
    ticketExpireAt: annonce.expireAt,
    remainingDays: annonce.expireAt ? Math.ceil((new Date(annonce.expireAt).getTime()-Date.now())/86400000) : (annonce.boostUntil ? Math.ceil((new Date(annonce.boostUntil).getTime()-Date.now())/86400000) : null),
    originalId: annonce.id,
    isV6Ticket: !!annonce.ticketId,
  };
}

export function assertIsLogged(user:any=null){
  const u = user || getCurrentUser();
  if(!u) throw new Error("Non connecté - Va à /connexion");
  return u;
}

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

// V6 NEW: Vérifie max 50
export function assertMax50(user:any=null){
  const u = user || getCurrentUser();
  if(!u) return;
  const list = safeParse("wenze_annonces_list");
  const waU = cleanWa(u.ownerWhatsapp||u.whatsapp||u.id);
  const myCount = list.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===waU).length;
  if(myCount >= 50) throw new Error(`Max 50 actives atteint (${myCount}/50) - Supprime une ancienne - V6 suppression libère place`);
  return myCount;
                      }
