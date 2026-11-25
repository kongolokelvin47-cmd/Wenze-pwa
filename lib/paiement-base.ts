export const TAUX_CDF = 2300;
export const MAX_ANNONCES_ACTIVES = 50;
export const COMMISSION_POURCENT = 0;

export const FREEMIUM = {
  maxImages: 3,
  dureeJours: 30,
  masquageAuto: "is_visible = false",
} as const;

export const PALIERS: Record<
  string,
  {
    id: string;
    label: string;
    prixUSD: number;
    places: number;
    dureeJours: number;
    videoSecondes: number;
  }
> = {
  STANDARD: {
    id: "STANDARD",
    label: "Standard",
    prixUSD: 5,
    places: 4,
    dureeJours: 7,
    videoSecondes: 15,
  },
  PRO: {
    id: "PRO",
    label: "Pro",
    prixUSD: 10,
    places: 10,
    dureeJours: 30,
    videoSecondes: 30,
  },
  PREMIUM: {
    id: "PREMIUM",
    label: "Premium",
    prixUSD: 20,
    places: 30,
    dureeJours: 30,
    videoSecondes: 60,
  },
};

export function usd(montant: number): string {
  const n = Number(montant || 0);
  if (!Number.isFinite(n)) return "$0";
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `$${formatted}`;
}

export function toCDF(montantUSD: number, taux = TAUX_CDF): number {
  const n = Number(montantUSD || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * taux);
}

export function toCDFString(montantUSD: number, taux = TAUX_CDF): string {
  return `${toCDF(montantUSD, taux).toLocaleString("fr-FR")} CDF`;
}

export function peutVoirPrixGros(role?: string | null, estDG?: boolean): boolean {
  if (estDG) return true;
  const r = String(role || "").toLowerCase();
  return r === "grossiste" || r === "dg";
    }
