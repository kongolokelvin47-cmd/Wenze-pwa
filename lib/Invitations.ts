// lib/invitations.ts - WENZE V3 EXPERT - Tout le monde invite, DG voit tout
import { supabase } from "./supabase";

// --- 0. UTILS ---
const cleanWa = (n: any) => {
  const d = (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
  if (!d) return "";
  return d.length <= 9 ? "243" + d : d.startsWith("243") ? d : "243" + d.slice(-9);
};

export type TypeInviteur = "dg" | "superviseur" | "ambassadeur" | "boutique" | "client";
export type StatutInvitation = "en_attente" | "clique" | "inscrit" | "boutique_ouverte" | "a_paye" | "accepte" | "refuse" | "fraude";

// --- 1. CODES PAR RÔLE - Le DG voit d'un coup d'œil qui a invité ---
export const PREFIX_CODE: Record<TypeInviteur, string> = {
  dg: "WENZE-DG",
  superviseur: "WENZE-SUP",
  ambassadeur: "WENZE-AMB",
  boutique: "WENZE-BOUT",
  client: "WENZE-CLI",
};

export const genCode = (type: TypeInviteur = "boutique") => {
  const prefix = PREFIX_CODE[type] || "WENZE-BOUT";
  const alea = Math.random().toString(36).slice(2, 6).toUpperCase();
  const chiffres = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${alea}${chiffres}`;
};

// Pour retrouver le type depuis un code : WENZE-BOUT-XXXX -> boutique
export function typeDepuisCode(code: string): TypeInviteur {
  if (code.includes("WENZE-DG")) return "dg";
  if (code.includes("WENZE-SUP")) return "superviseur";
  if (code.includes("WENZE-AMB")) return "ambassadeur";
  if (code.includes("WENZE-CLI")) return "client";
  return "boutique";
}

// --- 2. MESSAGE WHATSAPP - Ton modèle, amélioré avec bonus ---
export function buildInvitationMessage(o: { parrainNom: string; parrainType: TypeInviteur; type: string; code: string; inviteNom?: string }) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://wenze.cd";
  const lien = `${base}/invitation/${o.code}`;
  const typeLabel = o.type === "boutique" ? "ta boutique" : "ton compte client";

  // Bonus affiché selon qui invite - ça donne envie de cliquer
  const bonusTexte =
    o.parrainType === "ambassadeur" ? "Ton parrain t'aide à ouvrir ta boutique en 1 minute."
    : o.parrainType === "boutique" ? `${o.parrainNom} t'offre un accès prioritaire pour ouvrir ta boutique.`
    : o.parrainType === "client" ? `${o.parrainNom} t'invite à acheter moins cher à Kinshasa.`
    : "Rejoins la plus grande communauté de vendeurs à Kinshasa.";

  return `Bonjour ${o.inviteNom || ""} 👋

${o.parrainNom} t'invite sur WENZE WENZE BUSINESS.

${bonusTexte}

Tu peux créer ${typeLabel} gratuitement et vendre / acheter à Kinshasa.

👉 Clique ici pour créer ton compte :
${lien}

Code d'invitation : ${o.code}

C'est gratuit, ça prend 1 minute.

À très vite sur Wenze ! 🛍️`;
}

export function lienInvitation(code: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://wenze.cd";
  return `${base}/invitation/${code}`;
}

// --- 3. CRÉER UNE INVITATION - Avec anti-fraude + traçabilité ---
export async function createInvitation(o: {
  type: string; // boutique ou client - ce que le filleul va créer
  parrainWa: string;
  parrainNom: string;
  parrainType?: TypeInviteur;
  inviteWa: string;
  inviteNom: string;
  // Pour garder l'ambassadeur d'origine même si c'est une boutique qui invite
  ambassadeurOrigineWa?: string;
}) {
  const parrainWaClean = cleanWa(o.parrainWa);
  const inviteWaClean = cleanWa(o.inviteWa);

  // 🛡️ ANTI-FRAUDE 1 : On ne s'invite pas soi-même
  if (parrainWaClean === inviteWaClean) throw new Error("Tu ne peux pas t'inviter toi-même");

  // 🛡️ ANTI-FRAUDE 2 : Ce numéro a déjà été invité par ce parrain ?
  const existantes = await listInvitations();
  const deja = existantes.find((x: any) => cleanWa(x.invite_wa) === inviteWaClean && cleanWa(x.parrain_wa) === parrainWaClean && x.statut !== "refuse");
  if (deja) return deja.code; // On renvoie le même code, on ne crée pas de doublon

  const parrainType = o.parrainType || typeDepuisCode(o.parrainWa) || "boutique";
  // Si le parrain a lui-même un ambassadeur d'origine, on le garde
  const ambassadeurOrigine = o.ambassadeurOrigineWa
    ? cleanWa(o.ambassadeurOrigineWa)
    : parrainType === "ambassadeur" ? parrainWaClean : "";

  const code = genCode(parrainType as TypeInviteur);

  const payload: any = {
    code,
    type: o.type, // boutique ou client
    parrain_wa: parrainWaClean,
    parrain_nom: o.parrainNom,
    parrain_type: parrainType,
    ambassadeur_origine_wa: ambassadeurOrigine,
    invite_wa: inviteWaClean,
    invite_nom: o.inviteNom,
    invite_type: o.type,
    statut: "en_attente",
    // Traçabilité pour le DG
    clics: 0,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase.from("invitations").insert(payload);
    if (error) throw error;
  } else {
    const list = JSON.parse(localStorage.getItem("wenze_invitations") || "[]");
    list.push(payload);
    localStorage.setItem("wenze_invitations", JSON.stringify(list));
  }
  return code;
}

// --- 4. LIRE ---
export async function listInvitations() {
  if (supabase) {
    const { data } = await supabase.from("invitations").select("*").order("created_at", { ascending: false });
    return data || [];
  }
  try { return JSON.parse(localStorage.getItem("wenze_invitations") || "[]"); } catch { return []; }
}

export async function getInvitation(code: string) {
  if (supabase) {
    const { data } = await supabase.from("invitations").select("*").eq("code", code).single();
    return data;
  }
  const list = JSON.parse(localStorage.getItem("wenze_invitations") || "[]");
  return list.find((x: any) => x.code === code) || null;
}

// Pour Boutique / Client / Ambassadeur : voir MES filleules
export async function mesFilleules(maWa: string) {
  const all = await listInvitations();
  const clean = cleanWa(maWa);
  return all.filter((x: any) => cleanWa(x.parrain_wa) === clean);
}

// Pour DG : stats complètes
export async function statsInvitations() {
  const all = await listInvitations();
  return {
    total: all.length,
    parAmbassadeur: all.filter((x: any) => x.parrain_type === "ambassadeur").length,
    parBoutique: all.filter((x: any) => x.parrain_type === "boutique").length,
    parClient: all.filter((x: any) => x.parrain_type === "client").length,
    parSuperviseur: all.filter((x: any) => x.parrain_type === "superviseur").length,
    boutiquesInvitees: all.filter((x: any) => x.invite_type === "boutique" || x.type === "boutique").length,
    clientsInvites: all.filter((x: any) => x.invite_type === "client" || x.type === "client").length,
    ontPaye: all.filter((x: any) => x.statut === "a_paye").length,
    enAttente: all.filter((x: any) => x.statut === "en_attente").length,
    tauxConversion: all.length ? Math.round((all.filter((x: any) => x.statut === "a_paye" || x.statut === "accepte").length / all.length) * 100) : 0,
  };
}

export async function topInviteurs(limit = 10) {
  const all = await listInvitations();
  const map = new Map();
  all.forEach((x: any) => {
    const key = cleanWa(x.parrain_wa);
    if (!map.has(key)) map.set(key, { wa: key, nom: x.parrain_nom, type: x.parrain_type, total: 0, boutiques: 0, clients: 0, payes: 0 });
    const e = map.get(key);
    e.total += 1;
    if ((x.invite_type || x.type) === "boutique") e.boutiques += 1; else e.clients += 1;
    if (x.statut === "a_paye") e.payes += 1;
  });
  return Array.from(map.values()).sort((a: any, b: any) => b.total - a.total).slice(0, limit);
}

// --- 5. SUIVI DU PARCOURS - Clic → Inscrit → Boutique → Payé ---
export async function marquerClic(code: string) {
  if (supabase) {
    const inv = await getInvitation(code);
    if (!inv) return;
    await supabase.from("invitations").update({ statut: inv.statut === "en_attente" ? "clique" : inv.statut, clics: (inv.clics || 0) + 1 }).eq("code", code);
  } else {
    const list = JSON.parse(localStorage.getItem("wenze_invitations") || "[]");
    const i = list.findIndex((x: any) => x.code === code);
    if (i >= 0) { if (list[i].statut === "en_attente") list[i].statut = "clique"; list[i].clics = (list[i].clics || 0) + 1; localStorage.setItem("wenze_invitations", JSON.stringify(list)); }
  }
}

export async function acceptInvitation(code: string) {
  // Ancien nom, gardé pour compatibilité avec ton ancien code
  return await changerStatut(code, "accepte");
}

export async function changerStatut(code: string, nouveauStatut: StatutInvitation) {
  if (supabase) {
    const payload: any = { statut: nouveauStatut };
    if (nouveauStatut === "accepte" || nouveauStatut === "inscrit") payload.accepted_at = new Date().toISOString();
    if (nouveauStatut === "a_paye") payload.paid_at = new Date().toISOString();
    await supabase.from("invitations").update(payload).eq("code", code);
  } else {
    const list = JSON.parse(localStorage.getItem("wenze_invitations") || "[]");
    const i = list.findIndex((x: any) => x.code === code);
    if (i >= 0) {
      list[i].statut = nouveauStatut;
      if (nouveauStatut === "accepte" || nouveauStatut === "inscrit") list[i].accepted_at = new Date().toISOString();
      if (nouveauStatut === "a_paye") list[i].paid_at = new Date().toISOString();
      localStorage.setItem("wenze_invitations", JSON.stringify(list));
    }
  }
  // Quand le filleul paie, on déclenche la récompense
  if (nouveauStatut === "a_paye") {
    const inv = await getInvitation(code);
    if (inv) await distribuerRecompense(inv);
  }
}

// --- 6. RÉCOMPENSES AUTOMATIQUES - C'est ça qui fait que ça marche ---
export async function distribuerRecompense(invitation: any) {
  const parrainType = invitation.parrain_type as TypeInviteur;

  // 1. Commission Ambassadeur d'origine - en $ - à valider par DG
  if (invitation.ambassadeur_origine_wa) {
    const comms = JSON.parse(localStorage.getItem("wenze_commissions") || "[]");
    comms.push({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ambassadeur_wa: cleanWa(invitation.ambassadeur_origine_wa),
      filleul_wa: cleanWa(invitation.invite_wa),
      filleul_nom: invitation.invite_nom,
      invitation_code: invitation.code,
      statut: "en_attente_validation_dg", // DG valide avant paiement
    });
    localStorage.setItem("wenze_commissions", JSON.stringify(comms));
    // En Supabase, tu feras pareil dans table commissions
    if (supabase) {
      await supabase.from("commissions").insert({
        ambassadeur_wa: cleanWa(invitation.ambassadeur_origine_wa),
        filleul_wa: cleanWa(invitation.invite_wa),
        invitation_code: invitation.code,
        statut: "en_attente_validation_dg",
      }).then(() => {});
    }
  }

  // 2. Bonus Boutique qui invite -> +7 jours visibles
  if (parrainType === "boutique") {
    const bonus = JSON.parse(localStorage.getItem("wenze_bonus") || "[]");
    bonus.push({ wa: cleanWa(invitation.parrain_wa), type: "visibilite_7j", date: new Date().toISOString(), invitation_code: invitation.code });
    localStorage.setItem("wenze_bonus", JSON.stringify(bonus));
  }

  // 3. Bonus Client qui invite -> Badge Fidèle
  if (parrainType === "client") {
    const bonus = JSON.parse(localStorage.getItem("wenze_bonus") || "[]");
    bonus.push({ wa: cleanWa(invitation.parrain_wa), type: "badge_fidele", date: new Date().toISOString(), invitation_code: invitation.code });
    localStorage.setItem("wenze_bonus", JSON.stringify(bonus));
  }
}
