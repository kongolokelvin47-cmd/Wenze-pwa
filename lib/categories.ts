// lib/categories.ts - WENZE 2.0 MODERNE FORMIDABLE - 2 CATEGORIES 2 PRIX - SOURCE UNIQUE
// REGLE DG FINALE: 1) Toutes petites activités même régime 5$ 2) Gros + production 10$

export type Activite = { id: string; label: string; slug: string; regime: string; prixUSD?: number };
export type Categorie = {
  id: string;
  numero: string;
  titre: string;
  titreCourt: string;
  icon: string;
  description: string;
  activites: Activite[];
  regime: string;
  couleur: string;
  prixUSD: number;
  prixCDF: number;
};

import { TAUX_CDF as TAUX_PAIEMENT } from "./paiement";
export const TAUX_CDF = TAUX_PAIEMENT || 2300;

// ✅ 2 CATEGORIES MODERNES - 2 PRIX
export const CATEGORIES_WENZE: Categorie[] = [
  {
    id: "commerces-services",
    numero: "01",
    titre: "Commerces et Services",
    titreCourt: "Détails & Services",
    icon: "🛍️",
    description: `Toutes petites activités - commerces détails, services, technique (électricité, maçon, soudeur, coiffure, alimentation, ménage, événement) - Même abonnement 5$ / ${5*2300} CDF - Taux ${TAUX_PAIEMENT}`,
    regime: "petites-activites",
    couleur: "#6C3CE0",
    prixUSD: 5,
    prixCDF: 5 * TAUX_CDF,
    activites: [
      { id: "cs1", label: "Commerces en détails", slug: "detail", regime: "petites-activites", prixUSD: 5 },
      { id: "cs2", label: "Services", slug: "service", regime: "petites-activites", prixUSD: 5 },
    ]
  },
  {
    id: "gros-autres",
    numero: "02",
    titre: "Commerces en gros et autres activités",
    titreCourt: "Gros & Autres",
    icon: "🏭",
    description: `Grossistes, production, import, B2B, fabrication - Volume - Abonnement 10$ / ${10*2300} CDF - Taux ${TAUX_PAIEMENT}`,
    regime: "grossiste",
    couleur: "#111111",
    prixUSD: 10,
    prixCDF: 10 * TAUX_CDF,
    activites: [
      { id: "ga1", label: "Commerces en gros", slug: "gros", regime: "grossiste", prixUSD: 10 },
      { id: "ga2", label: "Autres activités", slug: "autres", regime: "grossiste", prixUSD: 10 },
    ]
  }
];

// ✅ MIGRATION INTELLIGENTE - SEULS MOTS GROS = CATEGORIE 2 - TOUT LE RESTE = 5$
const MOTS_CLES_GROS = ["gros","wholesale","b2b","production","import","usine","fabrication","industriel","distributeur","fournisseur","manufacture","semi-gros","demi-gros"];

export const CATEGORIES_ALIAS: Record<string, string> = {
  // Anciennes 6 → toutes petites activités sauf si mot gros
  "commerce": "commerces-services",
  "beaute": "commerces-services",
  "technique": "commerces-services", // Électricien, soudeur, maçon = 5$
  "alimentation": "commerces-services",
  "menage": "commerces-services",
  "evenement": "commerces-services",
  "evenementiel": "commerces-services",
  "commerce-general": "commerces-services",
  "beaute-mode": "commerces-services",
  "technique-btp": "commerces-services",
  // Gros explicites
  "grossiste": "gros-autres",
  "production": "gros-autres",
};

export function normalizeCategorie(raw: string): string {
  if (!raw) return "commerces-services";
  const lower = raw.toLowerCase().trim();
  if (CATEGORIES_ALIAS[lower]) return CATEGORIES_ALIAS[lower];
  // ✅ REGLE DG: Si contient mot gros → 10$, sinon 5$
  for (const mot of MOTS_CLES_GROS) {
    if (lower.includes(mot)) return "gros-autres";
  }
  return "commerces-services"; // Toutes petites activités = 5$
}

export function getCategorieById(id: string) {
  if (!id) return CATEGORIES_WENZE[0];
  const normalized = normalizeCategorie(id);
  return CATEGORIES_WENZE.find(c => c.id === normalized) || CATEGORIES_WENZE[0];
}

export function getActiviteById(catId: string, actSlug: string) {
  const cat = getCategorieById(catId);
  if (!actSlug) return cat.activites[0];
  return cat.activites.find(a => a.slug === actSlug.toLowerCase() || a.label.toLowerCase().includes(actSlug.toLowerCase())) || cat.activites[0];
}

export function getAllActivites() {
  return CATEGORIES_WENZE.flatMap(c => c.activites.map(a => ({ ...a, categorieId: c.id, categorieTitre: c.titreCourt, categoriePrix: c.prixUSD })));
}

export function normalizeActivite(raw: string): string {
  if (!raw) return "detail";
  const lower = raw.toLowerCase().trim();
  if (MOTS_CLES_GROS.some(m => lower.includes(m))) return "gros";
  if (lower.includes("autre")) return "autres";
  if (lower.includes("service")) return "service";
  return "detail";
}

export function isCategorieValide(id: string): boolean {
  return CATEGORIES_WENZE.some(c => c.id === id || normalizeCategorie(id) === c.id);
}

export function getCategorieByActiviteSlug(actSlug: string) {
  const norm = normalizeActivite(actSlug);
  return norm === "gros" || norm === "autres" ? CATEGORIES_WENZE[1] : CATEGORIES_WENZE[0];
}

// ✅ HELPERS MODERNES FORMIDABLES - 2 PRIX
export const NOMBRE_METIERS = 2;
export const NOMBRE_CATEGORIES = 2;

export const getPrixByCategorie = (id: string) => {
  const cat = getCategorieById(id);
  return { prix: cat.prixUSD, prixUSD: cat.prixUSD, prixCDF: cat.prixCDF, titre: cat.titre };
};

export const MESSAGE_REGIME_UNIQUE = `🛍️ Petites activités (Détails & Services + toute technique électricité etc) 5$ / ${5*TAUX_CDF} CDF - 🏭 Gros & Autres (grossiste, production) 10$ / ${10*TAUX_CDF} CDF - Taux ${TAUX_CDF} fixe - 2 catégories`;

export const CATEGORIES_OPTIONS = CATEGORIES_WENZE.map(c => ({
  value: c.id,
  label: `${c.icon} ${c.titreCourt} - ${c.prixUSD}$ / ${c.prixCDF.toLocaleString()} CDF`,
  fullLabel: `${c.icon} ${c.titre}`,
  regime: c.regime,
  numero: c.numero,
  couleur: c.couleur,
  prix: c.prixUSD,
  prixUSD: c.prixUSD,
  prixCDF: c.prixCDF,
}));

export const getAllSousCategoriesLabels = (): string[] => CATEGORIES_WENZE.flatMap(c => c.activites.map(a => a.label));
export const getCategorieCouleur = (id: string) => getCategorieById(id).couleur;
export const getCategorieIcon = (id: string) => getCategorieById(id).icon;

// ✅ Compatibilité ancien code publier/abonnement
export const isSoudeurOrToutTravaux = (slug: string) => normalizeCategorie(slug) === "commerces-services"; // Soudeur = 5$ maintenant
export const getPrixFormule = (catIdOrSlug: string) => getPrixByCategorie(catIdOrSlug);

// ✅ Nouveau helper pour abonnement
export const getFormuleByCategorie = (catId: string) => {
  const cat = getCategorieById(catId);
  return {
    id: cat.id,
    nom: cat.titre,
    prix: cat.prixUSD,
    prixUSD: cat.prixUSD,
    prixCDF: cat.prixCDF,
    duree: "30 jours",
    jours: 30,
    regime: cat.regime,
    limite: cat.id === "gros-autres" ? "Gros volume illimité" : "Petites activités illimité",
  };
};
