// lib/categories.ts - V32 EXPERT BUILD VERT - WENZE 2.0 MODERNE FORMIDABLE
// 2 CATEGORIES 2 PRIX - SOURCE UNIQUE - SANS IMPORT CIRCULAIRE

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

// ✅ SOURCE UNIQUE TAUX - Pas d'import de paiement pour éviter boucle circulaire
export const TAUX_CDF = 2300;
export const TAUX_PAIEMENT = 2300;

// ✅ 2 CATEGORIES MODERNES - 2 PRIX
export const CATEGORIES_WENZE: Categorie[] = [
  {
    id: "commerces-services",
    numero: "01",
    titre: "Commerces et Services",
    titreCourt: "Détails & Services",
    icon: "🛍️",
    description: "Toutes petites activités - commerces détails, services, technique (électricité, maçon, soudeur, coiffure, alimentation, ménage, événement) - Même abonnement 5$ / 11500 CDF - Taux 2300",
    regime: "petites-activites",
    couleur: "#6C3CE0",
    prixUSD: 5,
    prixCDF: 11500,
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
    description: "Grossistes, production, import, B2B, fabrication - Volume - Abonnement 10$ / 23000 CDF - Taux 2300",
    regime: "grossiste",
    couleur: "#111111",
    prixUSD: 10,
    prixCDF: 23000,
    activites: [
      { id: "ga1", label: "Commerces en gros", slug: "gros", regime: "grossiste", prixUSD: 10 },
      { id: "ga2", label: "Autres activités", slug: "autres", regime: "grossiste", prixUSD: 10 },
    ]
  }
];

const MOTS_CLES_GROS = ["gros","wholesale","b2b","production","import","usine","fabrication","industriel","distributeur","fournisseur","manufacture","semi-gros","demi-gros"];

export const CATEGORIES_ALIAS: Record<string, string> = {
  "commerce": "commerces-services",
  "beaute": "commerces-services",
  "technique": "commerces-services",
  "alimentation": "commerces-services",
  "menage": "commerces-services",
  "evenement": "commerces-services",
  "evenementiel": "commerces-services",
  "commerce-general": "commerces-services",
  "beaute-mode": "commerces-services",
  "technique-btp": "commerces-services",
  "grossiste": "gros-autres",
  "production": "gros-autres",
};

export function normalizeCategorie(raw: string): string {
  if (!raw) return "commerces-services";
  const lower = raw.toLowerCase().trim();
  if (CATEGORIES_ALIAS[lower]) return CATEGORIES_ALIAS[lower];
  for(let i=0;i<MOTS_CLES_GROS.length;i++){
    const mot = MOTS_CLES_GROS[i];
    if (lower.indexOf(mot) >=0) return "gros-autres";
  }
  return "commerces-services";
}

export function getCategorieById(id: string) {
  if (!id) return CATEGORIES_WENZE[0];
  const normalized = normalizeCategorie(id);
  for(let i=0;i<CATEGORIES_WENZE.length;i++){
    if(CATEGORIES_WENZE[i].id === normalized) return CATEGORIES_WENZE[i];
  }
  return CATEGORIES_WENZE[0];
}

export function getActiviteById(catId: string, actSlug: string) {
  const cat = getCategorieById(catId);
  if (!actSlug) return cat.activites[0];
  const lower = actSlug.toLowerCase();
  for(let i=0;i<cat.activites.length;i++){
    const a = cat.activites[i];
    if(a.slug === lower) return a;
    if(a.label.toLowerCase().indexOf(lower) >=0) return a;
  }
  return cat.activites[0];
}

export function getAllActivites() {
  const result:any[] = [];
  for(let i=0;i<CATEGORIES_WENZE.length;i++){
    const c = CATEGORIES_WENZE[i];
    for(let j=0;j<c.activites.length;j++){
      const a = c.activites[j];
      result.push({ id: a.id, label: a.label, slug: a.slug, regime: a.regime, prixUSD: a.prixUSD, categorieId: c.id, categorieTitre: c.titreCourt, categoriePrix: c.prixUSD });
    }
  }
  return result;
}

export function normalizeActivite(raw: string): string {
  if (!raw) return "detail";
  const lower = raw.toLowerCase().trim();
  for(let i=0;i<MOTS_CLES_GROS.length;i++){
    if(lower.indexOf(MOTS_CLES_GROS[i]) >=0) return "gros";
  }
  if (lower.indexOf("autre") >=0) return "autres";
  if (lower.indexOf("service") >=0) return "service";
  return "detail";
}

export function isCategorieValide(id: string): boolean {
  if(!id) return false;
  const norm = normalizeCategorie(id);
  for(let i=0;i<CATEGORIES_WENZE.length;i++){
    if(CATEGORIES_WENZE[i].id === norm) return true;
  }
  return false;
}

export function getCategorieByActiviteSlug(actSlug: string) {
  const norm = normalizeActivite(actSlug);
  if(norm === "gros" || norm === "autres") return CATEGORIES_WENZE[1];
  return CATEGORIES_WENZE[0];
}

export const NOMBRE_METIERS = 2;
export const NOMBRE_CATEGORIES = 2;

export function getPrixByCategorie(id: string) {
  const cat = getCategorieById(id);
  return { prix: cat.prixUSD, prixUSD: cat.prixUSD, prixCDF: cat.prixCDF, titre: cat.titre };
}

export const MESSAGE_REGIME_UNIQUE = "🛍️ Petites activités (Détails & Services + toute technique électricité etc) 5$ / 11500 CDF - 🏭 Gros & Autres (grossiste, production) 10$ / 23000 CDF - Taux 2300 fixe - 2 catégories";

export const CATEGORIES_OPTIONS = [
  { value: "commerces-services", label: "🛍️ Détails & Services - 5$ / 11,500 CDF", fullLabel: "🛍️ Détails & Services", regime: "petites-activites", numero: "01", couleur: "#6C3CE0", prix: 5, prixUSD: 5, prixCDF: 11500 },
  { value: "gros-autres", label: "🏭 Gros & Autres - 10$ / 23,000 CDF", fullLabel: "🏭 Gros & Autres", regime: "grossiste", numero: "02", couleur: "#111111", prix: 10, prixUSD: 10, prixCDF: 23000 },
];

export function getAllSousCategoriesLabels(): string[] {
  const result:string[] = [];
  for(let i=0;i<CATEGORIES_WENZE.length;i++){
    for(let j=0;j<CATEGORIES_WENZE[i].activites.length;j++){
      result.push(CATEGORIES_WENZE[i].activites[j].label);
    }
  }
  return result;
}

export function getCategorieCouleur(id: string) {
  return getCategorieById(id).couleur;
}

export function getCategorieIcon(id: string) {
  return getCategorieById(id).icon;
}

export function isSoudeurOrToutTravaux(slug: string) {
  return normalizeCategorie(slug) === "commerces-services";
}

export function getPrixFormule(catIdOrSlug: string) {
  return getPrixByCategorie(catIdOrSlug);
}

export function getFormuleByCategorie(catId: string) {
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
    }
