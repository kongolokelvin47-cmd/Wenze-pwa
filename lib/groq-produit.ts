import { TAUX_CDF, toCDFString, usd } from "@/lib/paiement-base";

export interface ProduitMultilingue {
  name_fr: string;
  name_en: string;
  name_ln: string;
  name_sw: string;
  description_fr: string;
  description_en: string;
  description_ln: string;
  description_sw: string;
}

const CACHE_KEY = "wenze_groq_cache_v1";

function lireCacheLocal(cle: string): ProduitMultilingue | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map && typeof map === "object" && map[cle] ? map[cle] : null;
  } catch {
    return null;
  }
}

function ecrireCacheLocal(cle: string, val: ProduitMultilingue) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(CACHE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[cle] = val;
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Génère la description + traductions FR / EN / LN / SW une seule fois
 * et met le résultat en cache (jamais de retraduction à chaque affichage).
 */
export async function genererEtCacherTraductionProduit(params: {
  productId?: string;
  name: string;
  description?: string;
  prixUsd?: number;
}): Promise<ProduitMultilingue> {
  const cleCache =
    params.productId ||
    `${params.name.trim().toLowerCase()}|${(params.description || "")
      .trim()
      .toLowerCase()}`;

  const cached = lireCacheLocal(cleCache);
  if (cached) return cached;

  const prixNote =
    typeof params.prixUsd === "number" && params.prixUsd > 0
      ? ` (${usd(params.prixUsd)} / ${toCDFString(params.prixUsd)} • taux ${TAUX_CDF})`
      : "";

  try {
    const res = await fetch("/api/translate-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: params.productId,
        name: params.name,
        description: `${params.description || ""}${prixNote}`.trim(),
      }),
    });
    const json = await res.json();
    if (res.ok && json?.ok && json?.data) {
      ecrireCacheLocal(cleCache, json.data);
      return json.data as ProduitMultilingue;
    }
  } catch {}

  const fallback: ProduitMultilingue = {
    name_fr: params.name,
    name_en: params.name,
    name_ln: params.name,
    name_sw: params.name,
    description_fr: params.description || params.name,
    description_en: params.description || params.name,
    description_ln: params.description || params.name,
    description_sw: params.description || params.name,
  };
  ecrireCacheLocal(cleCache, fallback);
  return fallback;
}
