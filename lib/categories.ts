// lib/categories.ts - WENZE WENZE BUSINESS - TON MARCHÉ.CD
// Règle V6: Même prix pour Détail/Gros/Presta/Client - Catégories = filtre seulement - Tickets pub = paliers STANDARD/PRO/PREMIUM
// Source taux unique = lib/paiement.ts - BUILD VERT

export type Activite = { id: string; label: string; slug: string; regime: string; };
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
};

// Source unique taux - évite boucle circulaire, mais synchronisé avec paiement.ts
export const TAUX_CDF = 2300;
export const TAUX_PAIEMENT = 2300;

// V6: 3 catégories métier + client occasionnel - MÊME PRIX pour tous - On ne vend plus catégorie, on vend tickets pub
export const CATEGORIES_WENZE: Categorie[] = [
  {
    id: "commerces-services",
    numero: "01",
    titre: "Commerces et Services",
    titreCourt: "Détails & Services",
    icon: "🛍️",
    description: "Détails, services, technique, alimentation, beauté - Même prix pub - Tickets stricts cumulables",
    regime: "petites-activites",
    couleur: "#6C3CE0",
    activites: [
      { id: "cs1", label: "Commerces en détails", slug: "detail", regime: "petites-activites" },
      { id: "cs2", label: "Services & Technique", slug: "service", regime: "petites-activites" },
      { id: "cs3", label: "Alimentation & Restauration", slug: "alimentation", regime: "petites-activites" },
      { id: "cs4", label: "Beauté & Mode", slug: "beaute", regime: "petites-activites" },
    ]
  },
  {
    id: "gros-autres",
    numero: "02",
    titre: "Commerces en gros et autres activités",
    titreCourt: "Gros & Autres",
    icon: "🏭",
    description: "Grossistes, production, import, B2B - Même prix pub que détails - Tickets stricts",
    regime: "grossiste",
    couleur: "#111111",
    activites: [
      { id: "ga1", label: "Commerces en gros", slug: "gros", regime: "grossiste" },
      { id: "ga2", label: "Production & Autres", slug: "autres", regime: "grossiste" },
    ]
  },
  {
    id: "client",
    numero: "03",
    titre: "Vente Occasionnelle - Client",
    titreCourt: "Occasionnel",
    icon: "📦",
    description: "Client particulier - Vente occasionnelle - Ticket strict 0.2$/j cumulable avec tickets pub",
    regime: "client-occasionnel",
    couleur: "#FF8C00",
    activites: [
      { id: "cl1", label: "Vente occasionnelle", slug: "occasionnel", regime: "client-occasionnel" },
      { id: "cl2", label: "Vidéo occasionnelle", slug: "video-occ", regime: "client-occasionnel" },
    ]
  }
];

// Alias pour compat ancien code
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
  "occasionnelle": "client",
  "occasionnel": "client",
  "client-occasionnel": "client",
  "client": "client",
};

export function normalizeCategorie(raw: string): string {
  if (!raw) return "commerces-services";
  const lower = raw.toLowerCase().trim();
  if (CATEGORIES_ALIAS[lower]) return CATEGORIES_ALIAS[lower];
  if (lower.includes("client") || lower.includes("occasion")) return "client";
  // Même prix donc on ne détecte plus gros pour prix, mais on garde pour filtre
  if (lower.includes("gros") || lower.includes("production") || lower.includes("import")) return "gros-autres";
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
      result.push({ id: a.id, label: a.label, slug: a.slug, regime: a.regime, categorieId: c.id, categorieTitre: c.titreCourt });
    }
  }
  return result;
}

export function normalizeActivite(raw: string): string {
  if (!raw) return "detail";
  const lower = raw.toLowerCase().trim();
  if(lower.includes("gros")) return "gros";
  if(lower.includes("autre")) return "autres";
  if(lower.includes("service")) return "service";
  if(lower.includes("occasion")) return "occasionnel";
  return "detail";
}

export function isCategorieValide(id: string): boolean {
  if(!id) return false;
  const norm = normalizeCategorie(id);
  return CATEGORIES_WENZE.some(c=> c.id===norm);
}

export function getCategorieByActiviteSlug(actSlug: string) {
  const norm = normalizeActivite(actSlug);
  if(norm === "gros" || norm === "autres") return CATEGORIES_WENZE[1];
  if(norm === "occasionnel") return CATEGORIES_WENZE[2];
  return CATEGORIES_WENZE[0];
}

export const NOMBRE_METIERS = 3;
export const NOMBRE_CATEGORIES = 3;

// V6: MÊME PRIX POUR TOUS - On ne vend plus de prix par catégorie, on vend des tickets pub
// Compat ancien code: retourne prix standard unique
export function getPrixByCategorie(id: string) {
  // V6 - Même prix pour tous - Prix vient de PALIERS, pas de catégorie
  return { 
    prix: 5, prixUSD: 5, prixCDF: 11500, 
    titre: getCategorieById(id).titre,
    label: "Même prix pour tous - Tickets pub STANDARD 5$ / PRO 10$ / PREMIUM 20$ - Strict cumulable",
    regime: "meme-prix-v6",
    message: "V6: On vend visibilité (tickets), pas catégorie. STANDARD 1-4 places strictes, PRO 5-10, PREMIUM 11-30 sur 1j/7j/30j"
  };
}

export const MESSAGE_REGIME_UNIQUE = "V6 STRICT: Même prix pour Détails & Services et Gros & Autres - On vend tickets pub: ⭐ STANDARD 5$/30j 1-4 places strictes + 1 vidéo 15s - 🚀 PRO 10$/30j 5-10 places + 1 vidéo 60s - 👑 PREMIUM 20$/30j 11-30 places + 2 vidéos 60s - 📦 Occasionnel 0.2$/j cumulable - 1 ticket = X places sur Y jours (pas X/j) - Cumulable, renouvelable, suppression libère place - Max 50 actives - Taux 2300 - 0% comm";

export const CATEGORIES_OPTIONS = [
  { value: "commerces-services", label: "🛍️ Détails & Services - Même prix pub", fullLabel: "🛍️ Détails & Services", regime: "petites-activites", numero: "01", couleur: "#6C3CE0", prix: 5, prixUSD: 5, prixCDF: 11500 },
  { value: "gros-autres", label: "🏭 Gros & Autres - Même prix pub", fullLabel: "🏭 Gros & Autres", regime: "grossiste", numero: "02", couleur: "#111111", prix: 5, prixUSD: 5, prixCDF: 11500 },
  { value: "client", label: "📦 Occasionnel - 0.2$/j ticket strict cumulable", fullLabel: "📦 Occasionnel", regime: "client-occasionnel", numero: "03", couleur: "#FF8C00", prix: 0.2, prixUSD: 0.2, prixCDF: 460 },
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

export function getCategorieCouleur(id: string) { return getCategorieById(id).couleur; }
export function getCategorieIcon(id: string) { return getCategorieById(id).icon; }
export function isSoudeurOrToutTravaux(slug: string) { return normalizeCategorie(slug) === "commerces-services"; }
export function getPrixFormule(catIdOrSlug: string) { return getPrixByCategorie(catIdOrSlug); }
export function getFormuleByCategorie(catId: string) {
  const cat = getCategorieById(catId);
  return {
    id: cat.id,
    nom: cat.titre,
    prix: 5, // V6 même prix
    prixUSD: 5,
    prixCDF: 11500,
    duree: "Tickets 1j/7j/30j stricts",
    jours: 30,
    regime: "meme-prix-v6",
    limite: "Max 50 actives - Tickets cumulables - Suppression libère place",
    message: "V6: Tickets STANDARD 5$/PRO 10$/PREMIUM 20$ - Même prix pour toutes catégories",
  };
    }
