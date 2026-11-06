import { supabase } from "./supabase";
const cleanWa = (n:any)=>{ const d=(n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,""); if(!d) return ""; return d.length<=9?"243"+d:d.startsWith("243")?d:"243"+d.slice(-9); };
export const genCode = ()=> "WENZE-"+Math.random().toString(36).slice(2,8).toUpperCase();

// MESSAGE WHATSAPP INVITATION - Ton modèle
export function buildInvitationMessage(o:{ parrainNom:string, type:string, code:string, inviteNom?:string }){
  const base = typeof window!=="undefined" ? window.location.origin : "https://wenze.cd";
  const lien = `${base}/invitation/${o.code}`;
  const typeLabel = o.type==="boutique" ? "ta boutique" : "ton compte client";
  return `Bonjour ${o.inviteNom||""} 👋

${o.parrainNom} t'invite sur WENZE WENZE BUSINESS.

Tu peux créer ${typeLabel} gratuitement et vendre / acheter à Kinshasa.

👉 Clique ici pour créer ton compte :
${lien}

Code d'invitation : ${o.code}

C'est gratuit, ça prend 1 minute.

À très vite sur Wenze ! 🛍️`;
}

export async function createInvitation(o:{ type:string, parrainWa:string, parrainNom:string, inviteWa:string, inviteNom:string }){
  const code = genCode();
  const payload = { code, type:o.type, parrain_wa:cleanWa(o.parrainWa), parrain_nom:o.parrainNom, invite_wa:cleanWa(o.inviteWa), invite_nom:o.inviteNom, statut:"en_attente" };
  if(supabase){
    const { error } = await supabase.from("invitations").insert(payload);
    if(error) throw error;
  } else {
    const list = JSON.parse(localStorage.getItem("wenze_invitations")||"[]");
    list.push(payload); localStorage.setItem("wenze_invitations", JSON.stringify(list));
  }
  return code;
}

export async function getInvitation(code:string){
  if(supabase){
    const { data } = await supabase.from("invitations").select("*").eq("code", code).single();
    return data;
  }
  const list = JSON.parse(localStorage.getItem("wenze_invitations")||"[]");
  return list.find((x:any)=>x.code===code) || null;
}

export async function acceptInvitation(code:string){
  if(supabase) await supabase.from("invitations").update({ statut:"accepte", accepted_at:new Date().toISOString() }).eq("code", code);
  else {
    const list = JSON.parse(localStorage.getItem("wenze_invitations")||"[]");
    const i = list.findIndex((x:any)=>x.code===code);
    if(i>=0){ list[i].statut="accepte"; localStorage.setItem("wenze_invitations", JSON.stringify(list)); }
  }
}
