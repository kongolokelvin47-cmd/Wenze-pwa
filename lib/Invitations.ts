"use client";

// lib/invitations.ts - V31 PRO - WENZE WENZE BUSINESS - BUILD VERT
// Invitation amis avec confirmation WhatsApp + MDP cote autrui - Regles strictes

export type Invitation = {
  id:string;
  fromWa:string;
  fromName:string;
  toWa:string;
  toName:string;
  token:string;
  status:"pending"|"confirmed"|"expired"|"cancelled";
  createdAt:string;
  expireAt:string;
  confirmedAt?:string;
  tries?:number;
};

const KEY_INVITS = "wenze_invitations";

function cleanWa(n:any){
  // NETTOYE - ne supprime PLUS les 0 du debut - garde 243...
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

function getCurrentUserSafe(){
  try{
    const r = safeGet("wenze_user");
    return r ? JSON.parse(r) : null;
  }catch{
    return null;
  }
}

function getAllUsersSafe(){
  try{
    const r = safeGet("wenze_all_users");
    return r ? JSON.parse(r) : [];
  }catch{
    return [];
  }
}

function expireOldInvitations(list:Invitation[]){
  const now = Date.now();
  const result:Invitation[] = [];
  for(let i=0;i<list.length;i++){
    const inv = list[i];
    if(inv.status === "pending"){
      try{
        const expTime = new Date(inv.expireAt).getTime();
        if(expTime < now){
          result.push(Object.assign({}, inv, {status:"expired" as const}));
          continue;
        }
      }catch{}
    }
    result.push(inv);
  }
  return result;
}

export function createInvitation(toWa:string, toName:string){
  if(typeof window === "undefined"){
    throw new Error("Invitation seulement cote client");
  }

  const from = getCurrentUserSafe();
  if(!from || (!from.ownerWhatsapp && !from.whatsapp)){
    throw new Error("Connecte-toi pour inviter - /connexion");
  }
  
  const fromWa = cleanWa(from.ownerWhatsapp || from.whatsapp);
  const toClean = cleanWa(toWa);
  
  // Regles strictes
  if(fromWa === toClean){
    throw new Error("⛔ Tu ne peux pas t'inviter toi-meme - Regle stricte");
  }
  if(toClean.length < 9){
    throw new Error("Numero WhatsApp invalide - Min 9 chiffres - Ex: 243970000000");
  }
  if(!toName || toName.trim().length < 2){
    throw new Error("Nom ami min 2 caracteres");
  }
  
  // Verifie si numero a deja compte
  const allUsers = getAllUsersSafe();
  for(let i=0;i<allUsers.length;i++){
    if(cleanWa(allUsers[i].ownerWhatsapp || allUsers[i].whatsapp) === toClean){
      throw new Error("Ce numero "+toClean+" a deja un compte WENZE");
    }
  }
  
  let list:Invitation[] = [];
  try{
    list = JSON.parse(safeGet(KEY_INVITS) || "[]");
  }catch{
    list = [];
  }
  list = expireOldInvitations(list);
  
  // Anti-spam: max 20/jour
  const today = new Date().toISOString().slice(0,10);
  let todayCount = 0;
  for(let i=0;i<list.length;i++){
    if(list[i].fromWa === fromWa && list[i].createdAt.slice(0,10) === today){
      todayCount++;
    }
  }
  if(todayCount >= 20){
    throw new Error("Limite 20 invitations/jour atteinte - Anti-spam");
  }
  
  // Pas de doublon pending
  for(let i=0;i<list.length;i++){
    if(list[i].fromWa === fromWa && list[i].toWa === toClean && list[i].status === "pending"){
      throw new Error("Invitation deja en attente pour "+toClean+" - Code "+list[i].token+" - Expire "+new Date(list[i].expireAt).toLocaleString());
    }
  }
  
  const token = Math.random().toString(36).slice(2,8).toUpperCase();
  
  const inv: Invitation = {
    id: "INV-"+Date.now()+"-"+token,
    fromWa: fromWa,
    fromName: from.nomEtablissement || from.nom || "Ami WENZE",
    toWa: toClean,
    toName: toName.trim(),
    token: token,
    status: "pending",
    createdAt: new Date().toISOString(),
    expireAt: new Date(Date.now()+48*3600000).toISOString(),
    tries: 0
  };
  
  list.unshift(inv);
  safeSet(KEY_INVITS, JSON.stringify(list.slice(0,100)));
  
  const origin = typeof window !== "undefined" ? window.location.origin : "https://wenzewenze.com";
  const link = origin+"/inscription?invite="+inv.token+"&wa="+toClean;
  const waMessage = "Salut "+toName.trim()+"! "+(from.nomEtablissement || from.nom || "Ton ami")+" t'invite sur WENZE WENZE BUSINESS - 0% commission - Taux 2300 CDF - Clique pour creer ton compte (valide par TON WhatsApp + TON MDP): "+link+" - Code: "+inv.token+" - Valide 48h";
  
  return { 
    inv: inv, 
    link: link, 
    waLink: "https://wa.me/"+toClean+"?text="+encodeURIComponent(waMessage),
    message: waMessage
  };
}

export function getMyInvitations(){
  const from = getCurrentUserSafe();
  if(!from) return [];
  const fromWa = cleanWa(from.ownerWhatsapp || from.whatsapp);
  let list:Invitation[] = [];
  try{
    list = JSON.parse(safeGet(KEY_INVITS) || "[]");
  }catch{
    list = [];
  }
  list = expireOldInvitations(list);
  safeSet(KEY_INVITS, JSON.stringify(list));
  const my:Invitation[] = [];
  for(let i=0;i<list.length;i++){
    if(list[i].fromWa === fromWa) my.push(list[i]);
  }
  my.sort(function(a,b){
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return my;
}

export function getInvitationByToken(token:string){
  if(!token) return null;
  let list:Invitation[] = [];
  try{
    list = JSON.parse(safeGet(KEY_INVITS) || "[]");
  }catch{
    list = [];
  }
  list = expireOldInvitations(list);
  const t = token.toUpperCase().trim();
  for(let i=0;i<list.length;i++){
    if(list[i].token === t) return list[i];
  }
  return null;
}

export function getPendingCount(){
  const all = getMyInvitations();
  let c = 0;
  for(let i=0;i<all.length;i++){ if(all[i].status === "pending") c++; }
  return c;
}

export function deleteInvitation(invId:string){
  const from = getCurrentUserSafe();
  if(!from) throw new Error("Non connecte");
  const fromWa = cleanWa(from.ownerWhatsapp || from.whatsapp);
  let list:Invitation[] = [];
  try{
    list = JSON.parse(safeGet(KEY_INVITS) || "[]");
  }catch{
    list = [];
  }
  let idx = -1;
  for(let i=0;i<list.length;i++){
    if(list[i].id === invId && list[i].fromWa === fromWa){ idx = i; break; }
  }
  if(idx < 0) throw new Error("Invitation introuvable ou pas a toi");
  list.splice(idx,1);
  safeSet(KEY_INVITS, JSON.stringify(list));
  return true;
}

export function confirmInvitation(token:string, newUser:{ whatsapp:string, password:string, nom:string, commune?:string, ville?:string }){
  if(!token) throw new Error("Token manquant");
  if(typeof window === "undefined") throw new Error("Confirmation seulement cote client");

  let list:Invitation[] = [];
  try{
    list = JSON.parse(safeGet(KEY_INVITS) || "[]");
  }catch{
    list = [];
  }
  list = expireOldInvitations(list);
  
  let idx = -1;
  const t = token.toUpperCase().trim();
  for(let i=0;i<list.length;i++){ if(list[i].token === t){ idx = i; break; } }
  if(idx < 0) throw new Error("Invitation invalide - Code incorrect");
  const inv = list[idx];
  
  if(inv.status !== "pending"){
    throw new Error("Invitation deja "+inv.status);
  }
  try{
    if(new Date(inv.expireAt).getTime() < Date.now()){
      list[idx].status = "expired";
      safeSet(KEY_INVITS, JSON.stringify(list));
      throw new Error("Invitation expiree 48h - Demande nouvelle invitation");
    }
  }catch(e:any){
    if(e.message && e.message.indexOf("expiree") >= 0) throw e;
  }
  
  const waInput = cleanWa(newUser.whatsapp);
  const waInv = cleanWa(inv.toWa);
  if(waInput !== waInv){
    throw new Error("⛔ Ce lien est pour "+inv.toWa+" ("+inv.toName+"), pas pour "+newUser.whatsapp+" - Regle stricte anti-fraude");
  }
  
  if(!newUser.nom || newUser.nom.trim().length < 2) throw new Error("Nom min 2 caracteres");
  if(!newUser.password || newUser.password.length < 4) throw new Error("Mot de passe min 4 caracteres - Cree cote autrui");
  if(newUser.password.length > 32) throw new Error("Mot de passe max 32");

  if(inv.tries && inv.tries >= 5){
    list[idx].status = "expired";
    safeSet(KEY_INVITS, JSON.stringify(list));
    throw new Error("Trop de tentatives - Invitation bloquee");
  }
  
  const users = getAllUsersSafe();
  for(let i=0;i<users.length;i++){
    if(cleanWa(users[i].ownerWhatsapp || users[i].whatsapp) === waInput){
      throw new Error("Ce WhatsApp "+waInput+" a deja un compte - Connecte-toi a /connexion");
    }
  }
  
  const newAccount = {
    id: "USER-"+Date.now()+"-"+Math.random().toString(36).slice(2,4).toUpperCase(),
    ownerWhatsapp: waInput,
    whatsapp: waInput,
    nom: newUser.nom.trim(),
    nomEtablissement: newUser.nom.trim(),
    password: newUser.password,
    role: "client",
    type: "freemium",
    categorieId: "client",
    createdAt: new Date().toISOString(),
    abonnementDate: null,
    abonnementPaye: false,
    invitedBy: inv.fromWa,
    invitedByName: inv.fromName,
    commune: newUser.commune || "Kinshasa",
    ville: newUser.ville || "Kinshasa",
    bio: "Invite par "+inv.fromName+" - WENZE WENZE BUSINESS",
    photo: "",
    verified: true,
    essaisRestants: 7
  };
  
  users.push(newAccount);
  safeSet("wenze_all_users", JSON.stringify(users));
  
  list[idx].status = "confirmed";
  list[idx].confirmedAt = new Date().toISOString();
  safeSet(KEY_INVITS, JSON.stringify(list));
  
  safeSet("wenze_user", JSON.stringify(newAccount));
  
  return newAccount;
}

export function cleanupExpired(){
  let list:Invitation[] = [];
  try{
    list = JSON.parse(safeGet(KEY_INVITS) || "[]");
  }catch{
    list = [];
  }
  const before = list.length;
  list = expireOldInvitations(list);
  const now = Date.now();
  const filtered:Invitation[] = [];
  for(let i=0;i<list.length;i++){
    const inv = list[i];
    if(inv.status === "expired"){
      try{
        const expTime = new Date(inv.expireAt).getTime();
        if(now - expTime > 30*86400000) continue;
      }catch{}
    }
    filtered.push(inv);
    if(filtered.length >= 100) break;
  }
  if(filtered.length !== before){
    safeSet(KEY_INVITS, JSON.stringify(filtered));
  }
  return filtered;
       }
