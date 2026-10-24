// lib/categories.ts - SOURCE UNIQUE OFFICIELLE - 6 METIERS DE KINSHASA - VERT 100% - BUILD FIX 24/24
// CONCORDANCE TOTALE - TAUX 2300 depuis paiement.ts - REGIME PRESTATAIRE UNIQUE

export type Activite = { id: string; label: string; slug: string; regime?: "prestataire" };
export type Categorie = {
  id: string;
  numero: string;
  titre: string;
  titreCourt: string;
  icon: string;
  description: string;
  activites: Activite[];
  regime?: "prestataire";
};

// ✅ FIX 1: Import unique TAUX_CDF depuis paiement.ts - plus de duplication - concordance totale
import { TAUX_CDF as TAUX_PAIEMENT } from "./paiement";
export const TAUX_CDF = TAUX_PAIEMENT || 2300;

export const CATEGORIES_WENZE: Categorie[] = [
  { 
    id: "commerce", numero: "01", titre: "Commerce, Vente, Boutique", titreCourt: "Commerce", icon: "🛒", 
    description: "Vente de produits à Kinshasa - Régime prestataire unique Pro 5$ / 11500 CDF - Taux 2300", regime: "prestataire",
    activites: [
      { id: "c1", label: "Vendeur boutique", slug: "vendeur-boutique", regime: "prestataire" },
      { id: "c2", label: "Vendeur en ligne", slug: "vendeur-en-ligne", regime: "prestataire" },
      { id: "c3", label: "Grossiste", slug: "grossiste", regime: "prestataire" },
      { id: "c4", label: "Détaillant", slug: "detaillant", regime: "prestataire" },
      { id: "c5", label: "Vendeur friperie", slug: "vendeur-friperie", regime: "prestataire" },
    ]
  },
  { 
    id: "beaute", numero: "02", titre: "Beauté, Coiffure, Mode", titreCourt: "Beauté", icon: "💇", 
    description: "Salon, coiffure, maquillage, couture - Régime prestataire unique", regime: "prestataire",
    activites: [
      { id: "b1", label: "Coiffeur", slug: "coiffeur", regime: "prestataire" },
      { id: "b2", label: "Barbier", slug: "barbier", regime: "prestataire" },
      { id: "b3", label: "Maquilleuse", slug: "maquilleuse", regime: "prestataire" },
      { id: "b4", label: "Styliste / Couturier", slug: "styliste", regime: "prestataire" },
      { id: "b5", label: "Manucure / Pédicure", slug: "manucure", regime: "prestataire" },
    ]
  },
  { 
    id: "technique", numero: "03", titre: "Technique, Réparation, BTP", titreCourt: "Technique", icon: "🔧", 
    description: "Maçon, électricien, plombier, mécanicien, soudeur + tout travaux techniques = même régime prestataire unique Pro 5$ / 11500 CDF - Taux 2300", regime: "prestataire",
    activites: [
      { id: "t1", label: "Maçon", slug: "macon", regime: "prestataire" },
      { id: "t2", label: "Électricien", slug: "electricien", regime: "prestataire" },
      { id: "t3", label: "Plombier", slug: "plombier", regime: "prestataire" },
      { id: "t4", label: "Mécanicien", slug: "mecanicien", regime: "prestataire" },
      { id: "t5", label: "Menuisier", slug: "menuisier", regime: "prestataire" },
      { id: "t6", label: "Peintre bâtiment", slug: "peintre", regime: "prestataire" },
      { id: "t7", label: "Soudeur - Régime unique 5$ / 11500 CDF", slug: "soudeur", regime: "prestataire" },
      { id: "t8", label: "Tout travaux techniques - Même régime 5$ / 11500 CDF", slug: "tout-travaux-techniques", regime: "prestataire" },
      { id: "t9", label: "Carreleur", slug: "carreleur", regime: "prestataire" },
      { id: "t10", label: "Vitreur / Aluminium", slug: "vitreur", regime: "prestataire" },
    ]
  },
  { 
    id: "alimentation", numero: "04", titre: "Alimentation, Restauration", titreCourt: "Alimentation", icon: "🍲", 
    description: "Cuisine, restaurant, street food, boulangerie - Régime prestataire unique", regime: "prestataire",
    activites: [
      { id: "a1", label: "Cuisinier", slug: "cuisinier", regime: "prestataire" },
      { id: "a2", label: "Boulanger / Pâtissier", slug: "boulanger", regime: "prestataire" },
      { id: "a3", label: "Vendeuse de rue", slug: "vendeuse-rue", regime: "prestataire" },
      { id: "a4", label: "Traiteur", slug: "traiteur", regime: "prestataire" },
    ]
  },
  { 
    id: "menage", numero: "05", titre: "Ménage, Nettoyage", titreCourt: "Ménage", icon: "🧹", 
    description: "Femme de ménage, pressing, nettoyage - Régime prestataire unique", regime: "prestataire",
    activites: [
      { id: "m1", label: "Femme de ménage", slug: "femme-menage", regime: "prestataire" },
      { id: "m2", label: "Pressing / Blanchisserie", slug: "pressing", regime: "prestataire" },
      { id: "m3", label: "Nettoyage bureaux", slug: "nettoyage", regime: "prestataire" },
    ]
  },
  { 
    id: "evenement", numero: "06", titre: "Événementiel, Musique", titreCourt: "Événement", icon: "🎤", 
    description: "DJ, décorateur, animateur, sonorisation - Régime prestataire unique", regime: "prestataire",
    activites: [
      { id: "ev1", label: "DJ", slug: "dj", regime: "prestataire" },
      { id: "ev2", label: "Décorateur", slug: "decorateur", regime: "prestataire" },
      { id: "ev3", label: "Animateur / MC", slug: "animateur", regime: "prestataire" },
      { id: "ev4", label: "Photographe événement", slug: "photographe-event", regime: "prestataire" },
    ]
  },
];

// === ALIAS COMPATIBILITE BUILD - FIX 404 evenementiel ===
export const CATEGORIES_ALIAS: Record<string, string> = {
  "evenementiel": "evenement",
  "evenementiel-musique": "evenement",
  "event": "evenement",
  "commerce-general": "commerce",
  "beaute-mode": "beaute",
  "technique-btp": "technique",
};

// === FONCTIONS VERT 100% - CONCORDANCE ===

export function normalizeCategorie(raw: string): string {
  if (!raw) return "commerce";
  const lower = raw.toLowerCase().trim();
  // Alias direct
  if (CATEGORIES_ALIAS[lower]) return CATEGORIES_ALIAS[lower];
  
  if (lower.includes("soud") || lower.includes("tout-travaux") || lower.includes("tout travaux") || lower.includes("technique") || lower.includes("mécanic") || lower.includes("macon") || lower.includes("electric") || lower.includes("plomb") || lower.includes("menuisier") || lower.includes("peintre") || lower.includes("carreleur") || lower.includes("vitreur") || lower.includes("btp")) return "technique";
  if (lower.includes("beauté") || lower.includes("beaute") || lower.includes("coiff") || lower.includes("barbier") || lower.includes("maquillage") || lower.includes("styliste") || lower.includes("manucure")) return "beaute";
  if (lower.includes("aliment") || lower.includes("restauration") || lower.includes("cuisin") || lower.includes("boulang") || lower.includes("traiteur") || lower.includes("food")) return "alimentation";
  if (lower.includes("ménage") || lower.includes("menage") || lower.includes("nettoyage") || lower.includes("pressing")) return "menage";
  if (lower.includes("événement") || lower.includes("evenement") || lower.includes("dj") || lower.includes("décorateur") || lower.includes("animateur") || lower.includes("photographe")) return "evenement";
  // Si c'est directement un slug d'activité, trouve sa catégorie
  const catByAct = getCategorieByActiviteSlug(lower);
  if (catByAct) return catByAct.id;
  return "commerce";
}

export function getCategorieById(id: string) {
  if (!id) return undefined;
  const clean = id.toLowerCase().trim();
  // ✅ FIX 2: normalise d'abord pour boutique fonctionnelle
  const normalized = normalizeCategorie(clean);
  // Cherche par id exact, puis normalisé, puis alias
  return CATEGORIES_WENZE.find(c => 
    c.id.toLowerCase() === clean || 
    c.id.toLowerCase() === normalized ||
    CATEGORIES_ALIAS[clean] === c.id
  );
}

export function getActiviteById(catId: string, actSlug: string) {
  if (!actSlug) return undefined;
  const cat = getCategorieById(catId);
  if (cat) {
    const found = cat.activites.find(a => 
      a.slug.toLowerCase() === actSlug.toLowerCase() || 
      a.id.toLowerCase() === actSlug.toLowerCase() ||
      a.slug.toLowerCase().includes(actSlug.toLowerCase())
    );
    if (found) return found;
  }
  // ✅ FIX 3: Fallback global si catId mauvais (ex: soudeur stocké comme categorie)
  const all = getAllActivites();
  return all.find(a => a.slug.toLowerCase() === actSlug.toLowerCase() || a.id.toLowerCase() === actSlug.toLowerCase());
}

export function getAllActivites() {
  return CATEGORIES_WENZE.flatMap(c => c.activites.map(a => ({ ...a, categorieId: c.id, categorieTitre: c.titreCourt, regime: c.regime })));
}

export function normalizeActivite(raw: string): string {
  if (!raw) return "vendeur-boutique";
  const lower = raw.toLowerCase().trim();
  const all = getAllActivites();
  const found = all.find(a => 
    a.slug === lower || 
    a.id.toLowerCase() === lower || 
    a.label.toLowerCase().includes(lower) ||
    lower.includes(a.label.toLowerCase())
  );
  return found ? found.slug : "vendeur-boutique";
}

export function isCategorieValide(id: string): boolean {
  return !!getCategorieById(id);
}

export function getCategorieByActiviteSlug(actSlug: string) {
  if (!actSlug) return undefined;
  return CATEGORIES_WENZE.find(c => c.activites.some(a => a.slug.toLowerCase() === actSlug.toLowerCase() || a.id.toLowerCase() === actSlug.toLowerCase()));
}

export const NOMBRE_METIERS = CATEGORIES_WENZE.length;

export const MESSAGE_REGIME_UNIQUE = `🔧 Régime prestataire unique: Soudeur (t7) + Tout travaux techniques (t8) = même régime que tous les prestataires - Pro 5$ / ${5 * TAUX_CDF} CDF - Taux ${TAUX_CDF} CDF fixe - ${CATEGORIES_WENZE.length} métiers - Boutique fonctionnelle garantie`;

export const CATEGORIES_OPTIONS = CATEGORIES_WENZE.map(c => ({
  value: c.id,
  label: `${c.icon} ${c.titreCourt} - ${c.titre}`,
  regime: c.regime || "prestataire",
  numero: c.numero,
}));

export const getAllSousCategoriesLabels = (): string[] => {
  return CATEGORIES_WENZE.flatMap(c => c.activites.map(a => a.label));
};

// ✅ FIX 4: Helper pour Vente Flash + Boost sans incidence - utilisé dans publier
export const isSoudeurOrToutTravaux = (slug: string) => {
  const s = (slug || "").toLowerCase();
  return s.includes("soudeur") || s.includes("tout-travaux") || s.includes("tout travaux");
};

export const getPrixFormule = (slug: string) => {
  // Soudeur et Tout travaux même régime Pro 5$ / 11500 CDF
  if (isSoudeurOrToutTravaux(slug)) return { prix: 5, prixCDF: 5 * TAUX_CDF };
  return { prix: 0, prixCDF: 0 };
};
