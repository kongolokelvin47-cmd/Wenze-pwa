// lib/admin.ts - WENZE ADMIN V3 - DG / Superviseur / Ambassadeur / Boutique / Client

export type RoleAdmin = "dg" | "superviseur" | "ambassadeur" | "boutique" | "client" | null;

// --- 1. QUI EST QUI ---
export const DG_WHATSAPPS = ["243812345678"]; // <-- MET TON NUMÉRO DG ICI, sans +
export const SUPERVISEUR_WHATSAPPS = ["243890000001"]; // <-- Tu ajouteras les autres ici, ou via /admin

export function roleDe(compte: any): RoleAdmin {
  if (!compte) return null;
  if (compte.roleAdmin) return compte.roleAdmin;
  const wa = (compte.ownerWhatsapp || compte.whatsapp || "").toString().replace(/[^0-9]/g, "");
  if (DG_WHATSAPPS.includes(wa)) return "dg";
  if (SUPERVISEUR_WHATSAPPS.includes(wa)) return "superviseur";
  if (compte.estAmbassadeur || compte.codeAmbassadeur?.startsWith("WENZE-AMB")) return "ambassadeur";
  if (compte.estVendeur) return "boutique";
  return "client"; // Tout compte connecté est au moins client
}

export function estAdmin(compte: any) {
  const r = roleDe(compte);
  return r === "dg" || r === "superviseur" || r === "ambassadeur";
}

// --- 2. DROITS - Qui voit quoi ---
export const DROITS: Record<string, string[]> = {
  dg: ["dashboard", "utilisateurs", "annonces", "paiements", "invitations", "ambassadeurs", "superviseurs", "parametres", "argent", "support", "utilisation", "commissions"],
  superviseur: ["dashboard", "utilisateurs", "annonces", "paiements", "invitations", "ambassadeurs", "support"],
  ambassadeur: ["dashboard", "mes-filleules", "mon-lien", "mes-commissions"],
  boutique: ["dashboard", "mes-filleules", "mon-lien"],
  client: ["dashboard", "mes-filleules", "mon-lien"],
};

export function aDroit(compte: any, page: string) {
  const r = roleDe(compte);
  if (!r) return false;
  return DROITS[r]?.includes(page) || false;
}

// --- 3. CODES PRO ---
export function genererCodePro(type: string) {
  const prefix: Record<string, string> = {
    dg: "WENZE-DG", superviseur: "WENZE-SUP", ambassadeur: "WENZE-AMB",
    boutique: "WENZE-BOUT", client: "WENZE-CLI",
  };
  const alea = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix[type] || "WENZE"}-${alea}`;
}

// --- 4. 2FA - DG + Superviseur obligatoire ---
export function genererCode2FA() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 chiffres
}

export function verifier2FA(codeSaisi: string, codeAttendu: string) {
  return codeSaisi.trim() === codeAttendu.trim();
}

export function doitFaire2FA(compte: any) {
  const r = roleDe(compte);
  return r === "dg" || r === "superviseur"; // Ambassadeur / Boutique / Client : pas de 2FA, juste mot de passe
}

// --- 5. SUSPENSIONS - Règle des 3 ---
export type StatutCompte = "actif" | "averti" | "suspendu-1" | "suspendu-2" | "supprime";

export function lireSuspensions(): any[] {
  try { const v = JSON.parse(localStorage.getItem("wenze_suspensions") || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

export function compterSuspensions(wa: string) {
  const clean = wa.replace(/[^0-9]/g, "");
  return lireSuspensions().filter((s: any) => (s.wa || "").replace(/[^0-9]/g, "") === clean && s.statut !== "annule").length;
}

// Superviseur PROPOSE, DG VALIDE
export function proposerSuspension({ wa, nom, motif, proposePar, preuve }: any) {
  const nb = compterSuspensions(wa);
  const nouvelle = {
    id: Date.now().toString(),
    wa, nom, motif, preuve: preuve || "",
    proposePar, proposeParRole: roleDe({ whatsapp: proposePar }) || "superviseur",
    dateProposition: new Date().toISOString(),
    numero: nb + 1, // 1, 2 ou 3
    duree: nb + 1 === 1 ? "24h" : nb + 1 === 2 ? "7 jours" : "DEFINITIF",
    statut: nb + 1 >= 3 ? "en-attente-validation-dg" : "en-attente-validation-dg",
    valideParDG: false,
  };
  const list = lireSuspensions();
  localStorage.setItem("wenze_suspensions", JSON.stringify([...list, nouvelle]));
  return nouvelle;
}

// DG seul valide
export function validerSuspensionDG(id: string, dgWa: string) {
  const list = lireSuspensions();
  const idx = list.findIndex((s: any) => s.id === id);
  if (idx < 0) return false;
  list[idx] = { ...list[idx], statut: list[idx].numero >= 3 ? "supprime" : "suspendu", valideParDG: true, valideLe: new Date().toISOString(), validePar: dgWa };
  localStorage.setItem("wenze_suspensions", JSON.stringify(list));
  // On marque aussi le compte
  try {
    const users = JSON.parse(localStorage.getItem("wenze_all_users") || "[]");
    const uIdx = users.findIndex((u: any) => (u.ownerWhatsapp || u.whatsapp || "").toString().replace(/[^0-9]/g, "") === (list[idx].wa || "").replace(/[^0-9]/g, ""));
    if (uIdx >= 0) {
      users[uIdx] = { ...users[uIdx], statutCompte: list[idx].numero >= 3 ? "supprime" : "suspendu", nbSuspensions: list[idx].numero };
      localStorage.setItem("wenze_all_users", JSON.stringify(users));
    }
  } catch {}
  return true;
}

// DG seul : suspension immédiate (arnaque)
export function suspensionImmediateDG({ wa, nom, motif, dgWa }: any) {
  const list = lireSuspensions();
  const nouvelle = { id: Date.now().toString(), wa, nom, motif, proposePar: dgWa, proposeParRole: "dg", dateProposition: new Date().toISOString(), numero: 99, duree: "IMMEDIAT", statut: "supprime", valideParDG: true, valideLe: new Date().toISOString(), validePar: dgWa };
  localStorage.setItem("wenze_suspensions", JSON.stringify([...list, nouvelle]));
  return nouvelle;
}

// --- 6. COMMISSIONS ---
export const TAUX_COMMISSION: Record<string, number> = {
  bronze: 0.10, // 0-10 filleules
  argent: 0.15, // 11-30
  or: 0.20,     // 31+
};

export const PRIX_ABONNEMENT: Record<string, number> = {
  occasionnel: 2, standard: 5, pro: 10, premium: 20,
};

export function niveauAmbassadeur(nbFilleules: number) {
  if (nbFilleules >= 31) return "or";
  if (nbFilleules >= 11) return "argent";
  return "bronze";
}

export function calculerCommission(palier: string, nbFilleules: number) {
  const prix = PRIX_ABONNEMENT[palier.toLowerCase()] || 0;
  const niv = niveauAmbassadeur(nbFilleules);
  return { montant: prix * TAUX_COMMISSION[niv], niveau: niv, taux: TAUX_COMMISSION[niv], prix };
}

// --- 7. JOURNAL D'AUDIT - DG voit qui a fait quoi ---
export function journaliser(action: string, acteurWa: string, acteurNom: string, cible?: string, details?: string) {
  try {
    const logs = JSON.parse(localStorage.getItem("wenze_audit") || "[]");
    logs.unshift({ id: Date.now().toString(), date: new Date().toISOString(), action, acteurWa, acteurNom, cible: cible || "", details: details || "" });
    localStorage.setItem("wenze_audit", JSON.stringify(logs.slice(0, 500)));
  } catch {}
  }
