// lib/securite.ts - WENZE WENZE BUSINESS - SÉCURITÉ WENZE - TON MARCHÉ.CD
// V6: Même prix pour tous - Tickets stricts cumulables - Suppression libère place - Max 50 - Compte caché filtré

export const getCurrentUser = () => {
  try {
    const raw = typeof window!=="undefined"?localStorage.getItem("wenze_user"):null;
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const cleanWhatsapp = (num: string) => (num || "").toString().replace(/[^0-9]/g, "");

// V6: récup tous les champs possibles owner
function getUserIdentifiers(user:any){
  if(!user) return { wa:"", id:"", waList:[] as string[] };
  const wa = cleanWhatsapp(user.ownerWhatsapp||user.whatsapp||user.telephone||user.id||"");
  const id = (user.id||"").toString();
  const waList = [
    cleanWhatsapp(user.ownerWhatsapp),
    cleanWhatsapp(user.whatsapp),
    cleanWhatsapp(user.telephone),
    cleanWhatsapp(user.phone),
    id
  ].filter(Boolean);
  return { wa, id, waList };
}

function getAnnonceIdentifiers(annonce:any){
  if(!annonce) return { wa:"", id:"", waList:[] as string[] };
  const wa = cleanWhatsapp(annonce.ownerWhatsapp||annonce.whatsapp||annonce.telephone||annonce.userId||"");
  const id = (annonce.userId||annonce.ownerId||"").toString();
  const waList = [
    cleanWhatsapp(annonce.ownerWhatsapp),
    cleanWhatsapp(annonce.whatsapp),
    cleanWhatsapp(annonce.telephone),
    cleanWhatsapp(annonce.userId),
  ].filter(Boolean);
  return { wa, id, waList };
}

export const isOwner = (annonce: any) => {
  const current = getCurrentUser();
  if (!current) return false;
  // DG bypass
  if(current.role==="dg") return true;
  
  const cur = getUserIdentifiers(current);
  const ann = getAnnonceIdentifiers(annonce);
  
  if(!cur.wa && !cur.id) return false;

  // V6 double sécurité: id OU whatsapp OU ownerWhatsapp doit matcher
  const sameWhatsapp = cur.wa && ann.wa && cur.wa === ann.wa;
  const sameId = cur.id && ann.id && cur.id === ann.id;
  const crossMatch = cur.waList.some(w=> ann.waList.includes(w)) || ann.waList.some(w=> cur.waList.includes(w));

  // Sécurité double V6: id OU whatsapp OU cross list
  return sameWhatsapp || sameId || crossMatch;
}

// V6: Vérif si compte caché avant de permettre action
export const isCompteCacheV6 = (): boolean => {
  try{
    const user = getCurrentUser();
    if(!user) return false;
    const { verifierAbonnement, isCompteCache } = require("./paiement");
    if(typeof isCompteCache==="function"){
      return isCompteCache(user);
    }
    const ab = verifierAbonnement();
    return !!ab.isCache;
  }catch{ return false; }
}

export const canDelete = (annonce: any) => {
  if(!isOwner(annonce)) return false;
  // V6: même si caché, peut supprimer pour libérer place
  return true;
};

export const canEdit = (annonce: any) => {
  if(!isOwner(annonce)) return false;
  // V6: si compte caché, peut éditer mais reste caché jusqu'à paiement
  // Bloque édition si ticket du annonce expiré
  try{
    const { safeParse } = { safeParse: (k:string)=>{ try{ const r=localStorage.getItem(k); return r?JSON.parse(r):[]; }catch{ return []; } } };
    const tickets = safeParse("wenze_tickets");
    const ticketId = (annonce.ticketId||annonce.palierTicketId||"");
    if(ticketId){
      const t = tickets.find((x:any)=> x.ticketId===ticketId);
      if(t && new Date(t.expireAt).getTime() < Date.now()){
        // ticket expiré, annonce déjà archivée, peut éditer seulement pour renouveler
        return false;
      }
    }
  }catch{}
  return true;
};

// V6 FINAL: canPublish check complet suivi compte
export const canPublish = () => {
  const current = getCurrentUser();
  if(!current) return false;
  if(current.role==="dg" || current.role==="superviseur") return true;
  
  try{
    const { verifierAbonnement } = require("./paiement");
    const ab = verifierAbonnement();
    
    // 1. Compte caché -> bloqué
    if(ab.isCache){
      return false;
    }
    
    // 2. Max 50 actives global V6
    if((ab.count||0) >= 50){
      return false;
    }
    
    // 3. Places restantes strictes
    if(!ab.peutPublier){
      return false;
    }
    
    // 4. Si paye, check placesRestantes
    if(ab.isPaye && (ab.placesRestantes||0) <=0){
      return false;
    }
    
    // 5. Freemium 3 à vie
    if(ab.isFreemium && (ab.imagesRestantes||0) <=0){
      return false;
    }
    
    return true;
  }catch{
    return !!current;
  }
};

// Nouveau helper V6
export const canPublishDetail = () => {
  const current = getCurrentUser();
  if(!current) return { ok:false, msg:"Connecte-toi", code:"NO_USER" };
  
  try{
    const { verifierAbonnement } = require("./paiement");
    const ab = verifierAbonnement();
    
    if(ab.isCache){
      return { ok:false, msg: ab.message || "🔒 Compte caché - Freemium 30j expiré - Paye 5$ pour réapparaître", code:"CACHE", ab };
    }
    if((ab.count||0) >=50){
      return { ok:false, msg:`🚫 Max 50 actives atteint (${ab.count}/50) - Supprime une ancienne pour libérer place - V6 suppression libère place`, code:"MAX50", ab };
    }
    if(!ab.peutPublier){
      if(ab.isFreemium){
        return { ok:false, msg:`🆓 Freemium 3/3 strictes à vie atteint - Achète STANDARD 5$ pour 4 places strictes sur 7j + 1 vidéo 15s - Même prix pour tous`, code:"FREEMIUM_FULL", ab };
      }
      return { ok:false, msg:`❌ Plus de places strictes - ${ab.ticketsActifs?.length||0} tickets utilisés ${ab.totalImagesMax?`0/${ab.totalImagesMax}`:""} - Achète nouveau ticket cumulable - Suppression libère place`, code:"NO_PLACE", ab };
    }
    return { ok:true, msg: ab.message || `✅ Peut publier - ${ab.placesRestantes||ab.imagesRestantes||0} places libres - Max 50`, code:"OK", ab };
  }catch(e){
    return { ok: !!current, msg: current?"Peut publier (verif fallback)":"Non connecté", code: current?"FALLBACK_OK":"NO_USER" };
  }
};

// V6: Sécurité suppression avec libération place
export const secureDelete = (annonceId:string): boolean => {
  try{
    const listRaw = typeof window!=="undefined"?localStorage.getItem("wenze_annonces_list"):null;
    if(!listRaw) return false;
    const list = JSON.parse(listRaw);
    const annonce = list.find((a:any)=> (a.id||a.annonceId)===annonceId);
    if(!annonce) return false;
    if(!isOwner(annonce)) return false;
    
    // LIGNE CRITIQUE V6: libérer place avant suppression
    try{
      const { libererPlace } = require("./paiement");
      libererPlace(annonceId);
    }catch{}
    
    // Notif place libérée déjà gérée dans libererPlace via securite? non, via paiement.ts
    return true;
  }catch{ return false; }
};

// V6: Check role hiérarchie
export const hasRole = (required: Role | Role[]) => {
  const user = getCurrentUser();
  if(!user) return false;
  if(user.role==="dg") return true;
  const req = Array.isArray(required)?required:[required];
  if(req.includes(user.role)) return true;
  // hiérarchie: dg > superviseur > ambassadeur > grossiste/prestataire/vendeur > client
  const hierarchy: Record<string,number> = { client:0, vendeur:1, prestataire:1, grossiste:1, ambassadeur:2, superviseur:3, dg:4 };
  const userLevel = hierarchy[user.role||"client"]||0;
  const needLevel = Math.min(...req.map(r=> hierarchy[r]||0));
  return userLevel >= needLevel;
};

export type Role = "client" | "vendeur" | "prestataire" | "grossiste" | "ambassadeur" | "superviseur" | "dg";

// Compat anciens noms
export const cleanWa = cleanWhatsapp;
