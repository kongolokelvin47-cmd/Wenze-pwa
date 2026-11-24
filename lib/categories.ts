// lib/categories.ts - WENZE WENZE BUSINESS
// Catégories et activités = classement & filtre uniquement.
// Source unique des tarifs, paliers et taux CDF = lib/paiement.ts (synchronisé avec config_publique).

export type Activite = { id: string; label: string; slug: string; regime: string };
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

export const CATEGORIES_WENZE: Categorie[] = [
  {
    id: "commerces-services",
    numero: "01",
    titre: "Commerces et Services",
    titreCourt: "Détails & Services",
    icon: "🛍️",
    description: "Détails, services, technique, alimentation, beauté — filtre catalogue",
    regime: "petites-activites",
    couleur: "#6C3CE0",
    activites: [
      { id: "cs1", label: "Commerces en détails", slug: "detail", regime: "petites-activites" },
      { id: "cs2", label: "Services & Technique", slug: "service", regime: "petites-activites" },
      { id: "cs3", label: "Alimentation & Restauration", slug: "alimentation", regime: "petites-activites" },
      { id: "cs4", label: "Beauté & Mode", slug: "beaute", regime: "petites-activites" },
    ],
  },
  {
    id: "gros-autres",
    numero: "02",
    titre: "Commerces en gros et autres activités",
    titreCourt: "Gros & Autres",
    icon: "🏭",
    description: "Grossistes, production, import, B2B — filtre catalogue",
    regime: "grossiste",
    couleur: "#111111",
    activites: [
      { id: "ga1", label: "Commerces en gros", slug: "gros", regime: "grossiste" },
      { id: "ga2", label: "Production & Autres", slug: "autres", regime: "grossiste" },
    ],
  },
  {
    id: "client",
    numero: "03",
    titre: "Vente Occasionnelle - Client",
    titreCourt: "Occasionnel",
    icon: "📦",
    description: "Client particulier — vente ou vidéo occasionnelle",
    regime: "client-occasionnel",
    couleur: "#FF8C00",
    activites: [
      { id: "cl1", label: "Vente occasionnelle", slug: "occasionnel", regime: "client-occasionnel" },
      { id: "cl2", label: "Vidéo occasionnelle", slug: "video-occ", regime: "client-occasionnel" },
    ],
  },
];

export const CATEGORIES_ALIAS: Record<string, string> = {
  commerce: "commerces-services",
  beaute: "commerces-services",
  technique: "commerces-services",
  alimentation: "commerces-services",
  menage: "commerces-services",
  evenement: "commerces-services",
  evenementiel: "commerces-services",
  "commerce-general": "commerces-services",
  "beaute-mode": "commerces-services",
  "technique-btp": "commerces-services",
  grossiste: "gros-autres",
  production: "gros-autres",
  occasionnelle: "client",
  occasionnel: "client",
  "client-occasionnel": "client",
  client: "client",
};

export function normalizeCategorie(raw: string): string {
  if (!raw) return "commerces-services";
  const lower = raw.toLowerCase().trim();
  if (CATEGORIES_ALIAS[lower]) return CATEGORIES_ALIAS[lower];
  if (lower.includes("client") || lower.includes("occasion")) return "client";
  if (lower.includes("gros") || lower.includes("production") || lower.includes("import")) {
    return "gros-autres";
  }
  return "commerces-services";
}

export function getCategorieById(id: string): Categorie {
  if (!id) return CATEGORIES_WENZE[0];
  const normalized = normalizeCategorie(id);
  return CATEGORIES_WENZE.find((c) => c.id === normalized) || CATEGORIES_WENZE[0];
}

export function getActiviteById(catId: string, actSlug: string): Activite {
  const cat = getCategorieById(catId);
  if (!actSlug) return cat.activites[0];
  const lower = actSlug.toLowerCase();
  return (
    cat.activites.find((a) => a.slug === lower || a.label.toLowerCase().includes(lower)) ||
    cat.activites[0]
  );
}

export function getAllActivites() {
  return CATEGORIES_WENZE.flatMap((c) =>
    c.activites.map((a) => ({
      id: a.id,
      label: a.label,
      slug: a.slug,
      regime: a.regime,
      categorieId: c.id,
      categorieTitre: c.titreCourt,
    }))
  );
}

export function normalizeActivite(raw: string): string {
  if (!raw) return "detail";
  const lower = raw.toLowerCase().trim();
  if (lower.includes("gros")) return "gros";
  if (lower.includes("autre")) return "autres";
  if (lower.includes("service")) return "service";
  if (lower.includes("occasion")) return "occasionnel";
  return "detail";
}

export function isCategorieValide(id: string): boolean {
  if (!id) return false;
  const norm = normalizeCategorie(id);
  return CATEGORIES_WENZE.some((c) => c.id === norm);
}

export function getCategorieByActiviteSlug(actSlug: string): Categorie {
  const norm = normalizeActivite(actSlug);
  if (norm === "gros" || norm === "autres") return CATEGORIES_WENZE[1];
  if (norm === "occasionnel") return CATEGORIES_WENZE[2];
  return CATEGORIES_WENZE[0];
}

export const NOMBRE_METIERS = 3;
export const NOMBRE_CATEGORIES = 3;

export const CATEGORIES_OPTIONS = CATEGORIES_WENZE.map((c) => ({
  value: c.id,
  label: `${c.icon} ${c.titreCourt}`,
  fullLabel: `${c.icon} ${c.titre}`,
  regime: c.regime,
  numero: c.numero,
  couleur: c.couleur,
}));

export function getAllSousCategoriesLabels(): string[] {
  return CATEGORIES_WENZE.flatMap((c) => c.activites.map((a) => a.label));
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
  
