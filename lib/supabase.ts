// lib/supabase.ts — Version corrigée WENZE
// 1 seul client, 1 seuls noms de tables, jamais de crash si env manquant
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ===== 1. LECTURE SÉCURISÉE DES VARIABLES =====
// On ne met PLUS de "!" — si Vercel oublie une variable, on le voit dans la console au lieu d'un écran blanc
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (typeof window !== "undefined" && (!url || !key)) {
  console.error(
    "❌ WENZE — Variables Supabase manquantes. Va sur Vercel → Settings → Environment Variables → vérifie NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY, puis Redéploie."
  );
}

// ===== 2. SINGLETON — 1 SEUL CLIENT POUR TOUTE L'APP =====
// Évite "Multiple GoTrueClient instances" et les déconnexions realtime
declare global {
  // eslint-disable-next-line no-var
  var __wenze_supabase: SupabaseClient | undefined;
}

function getClient(): SupabaseClient | null {
  if (!url || !key) return null;
  if (typeof window === "undefined") {
    // Côté serveur (build) : client simple, sans stockage
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  if (!globalThis.__wenze_supabase) {
    globalThis.__wenze_supabase = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "wenze-auth",
      },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return globalThis.__wenze_supabase;
}

// ✅ C'est ce que tu importes partout : import { supabase } from "../../lib/supabase"
export const supabase: any = getClient();

// ✅ Pour vérifier avant un appel, au lieu de planter
export const supabaseOK = () => !!supabase && !!url && !!key;

// Si supabase est null, on arrête proprement au lieu de planter
export function assertSupabase() {
  if (!supabaseOK()) {
    console.error("❌ Supabase non configuré — vérifie tes variables Vercel");
    return false;
  }
  return true;
}

// ===== 3. NOMS UNIQUES — NE PLUS JAMAIS CHANGER CES NOMS =====
// Toutes les pages DOIVENT utiliser ces noms. C'est ça qui branche DG ↔ Public ↔ Équipe
export const TABLES = {
  membres: "membres",
  boutiques: "boutiques",
  clients: "clients",
  paiements: "paiements",
  annonces: "annonces", // ⚠️ PAS annonces_publiques
  problemes: "problemes",
  config: "config_publique",
  tombola: "tombola_config",
  notifs: "notifications_perso",
} as const;

// ===== 4. RÈGLES COMMUNES — MÊMES RÈGLES PARTOUT =====
export const TYPES_PUBLIC = ["CLIENT", "BOUTIQUE", "PRESTATAIRE", "GROSSISTE"] as const;
export const estPublic = (t: string) => TYPES_PUBLIC.includes(((t || "").toUpperCase() as any));

export const estPaye = (p: any) => p?.statut === "PAYÉ" || p?.statut === "PAYE";
export const estActif = (s: string) => s === "ACTIF" || s === "VALIDEE" || s === "PAYE" || s === "PAYÉ";

// ✅ Lit type_paiement ET type, pour ne plus avoir 0 CDF si une vieille ligne a l'ancien nom
export const typePaiement = (p: any) => p?.type_paiement || p?.type || "";

// ✅ Lit main ET main_color, btn ET btn_color — DG écrit main, Public lit main, mais les anciennes lignes marchent aussi
export const getConfig = (row: any) => ({
  title: row?.title || "WENZE",
  slogan: row?.slogan || "",
  about: row?.about || "",
  whats: row?.whats || row?.whatsapp || "",
  main: row?.main || row?.main_color || "#FF6B00",
  btn: row?.btn || row?.btn_color || "#111111",
});

// ===== 5. POINTS TOMBOLA — 1 SEULE FORMULE PARTOUT =====
// Boutique validée +5, Client actif +3, Abo payé +20. Si tu changes ici, ça change partout.
export const REGLES_POINTS = { BOUTIQUE: 5, CLIENT: 3, ABO: 20 } as const;

export function pointsDe(
  codeInvitation: string,
  boutiques: any[],
  clients: any[],
  paiements: any[]
) {
  const boutInv = boutiques.filter(
    (b) =>
      (b.code_invitation === codeInvitation || b.code_amb === codeInvitation) &&
      estActif(b.statut) &&
      estPublic(b.type_public || b.type || "BOUTIQUE")
  );
  const cliInv = clients.filter(
    (c) =>
      (c.code_invitation === codeInvitation || c.code_parrain === codeInvitation) &&
      c.statut === "ACTIF" &&
      estPublic(c.type_public || c.type || "CLIENT")
  );
  const aboPayes = paiements.filter((p) => {
    const b = boutiques.find((x) => x.id === p.boutique_id);
    const codeB = b?.code_invitation || b?.code_amb || "";
    return (
      codeB === codeInvitation &&
      estPaye(p) &&
      (typePaiement(p) === "PREMIER" || typePaiement(p) === "OCCASIONNELLE")
    );
  });
  return {
    bout: boutInv.length,
    cli: cliInv.length,
    abo: aboPayes.length,
    ptsBout: boutInv.length * REGLES_POINTS.BOUTIQUE,
    ptsCli: cliInv.length * REGLES_POINTS.CLIENT,
    ptsBonus: aboPayes.length * REGLES_POINTS.ABO,
    total:
      boutInv.length * REGLES_POINTS.BOUTIQUE +
      cliInv.length * REGLES_POINTS.CLIENT +
      aboPayes.length * REGLES_POINTS.ABO,
  };
}

// ===== 6. COMPTA — 1 SEULE FORMULE PARTOUT =====
// Commission seulement sur PREMIER + OCCASIONNELLE. Renouvellement = 0.
export function compta(paiements: any[], pctCommission = 10) {
  const payes = paiements.filter(estPaye);
  const premiers = payes.filter((p) => typePaiement(p) === "PREMIER");
  const occasionnels = payes.filter((p) => typePaiement(p) === "OCCASIONNELLE");
  const renouvellements = payes.filter((p) => typePaiement(p) === "RENOUVELLEMENT");
  const baseCommission = [...premiers, ...occasionnels].reduce((s, p) => s + Number(p.montant || 0), 0);
  const totalVentes = payes.reduce((s, p) => s + Number(p.montant || 0), 0);
  const commission = Math.round((baseCommission * pctCommission) / 100);
  return {
    totalVentes,
    baseCommission,
    commission,
    benefice: totalVentes - commission,
    premiers: premiers.length,
    occasionnels: occasionnels.length,
    renouvellements: renouvellements.length,
    payes: payes.length,
    enAttente: paiements.filter((p) => !estPaye(p)).length,
  };
}

// ===== 7. AIDE POUR LE REALTIME — ÉVITE LES CANAUX EN DOUBLE =====
export function channelDG() {
  if (!supabase) return null;
  return supabase.channel("wenze-dg-v2");
    }
