// lib/supabase.ts — Client singleton Supabase et noms de tables WENZE WENZE
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (typeof window !== "undefined" && (!url || !key)) {
  console.error(
    "WENZE : variables NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes."
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __wenze_supabase: SupabaseClient | undefined;
}

function getClient(): SupabaseClient | null {
  if (!url || !key) return null;
  if (typeof window === "undefined") {
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
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

export const supabase: SupabaseClient | null = getClient();

export const supabaseOK = (): boolean => Boolean(supabase && url && key);

export function assertSupabase(): boolean {
  if (!supabaseOK()) {
    console.error("Supabase non configuré : vérifiez les variables d'environnement.");
    return false;
  }
  return true;
}

// Noms de tables partagés entre l'application publique et l'espace privé
export const TABLES = {
  membres: "membres",
  boutiques: "boutiques",
  clients: "clients",
  paiements: "paiements",
  annonces: "annonces",
  problemes: "problemes",
  config: "config_publique",
  tombola: "tombola_config",
  notifs: "notifications_perso",
  journal: "wenze_journal",
} as const;

export const TYPES_PUBLIC = [
  "CLIENT",
  "BOUTIQUE",
  "PRESTATAIRE",
  "GROSSISTE",
] as const;

export const estPublic = (t: string): boolean =>
  TYPES_PUBLIC.includes(((t || "").toUpperCase() as (typeof TYPES_PUBLIC)[number]));

export const estPaye = (p: any): boolean =>
  p?.statut === "PAYÉ" || p?.statut === "PAYE" || p?.statut === "VALIDE";

export const estActif = (s: string): boolean =>
  s === "ACTIF" || s === "VALIDEE" || s === "PAYE" || s === "PAYÉ";

export const typePaiement = (p: any): string => p?.type_paiement || p?.type || "";

export const getConfig = (row: any) => ({
  title: row?.title || "WENZE WENZE",
  slogan: row?.slogan || "",
  about: row?.about || "",
  whats: row?.whats || row?.whatsapp || "",
  main: row?.main || row?.main_color || "#FF6B00",
  btn: row?.btn || row?.btn_color || "#111111",
});

// Comptabilité alignée sur le modèle 0 % de commission par défaut
export function compta(paiements: any[], pctCommission = 0) {
  const payes = Array.isArray(paiements) ? paiements.filter(estPaye) : [];
  const premiers = payes.filter((p) => typePaiement(p) === "PREMIER");
  const occasionnels = payes.filter((p) => typePaiement(p) === "OCCASIONNELLE");
  const renouvellements = payes.filter(
    (p) => typePaiement(p) === "RENOUVELLEMENT"
  );
  const baseCommission = [...premiers, ...occasionnels].reduce(
    (s, p) => s + Number(p.montant || 0),
    0
  );
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
    enAttente: Array.isArray(paiements)
      ? paiements.filter((p) => !estPaye(p)).length
      : 0,
  };
}

export function channelDG() {
  if (!supabase) return null;
  return supabase.channel("wenze-dg-v2");
      }
