// lib/categories.ts - SOURCE UNIQUE OFFICIELLE - 6 METIERS DE KINSHASA - CONCORDANCE TOTALE - TAUX 2300 - REGIME PRESTATAIRE UNIQUE
export type Activite = { id: string; label: string; slug: string };
export type Categorie = {
  id: string;
  numero: string;
  titre: string;
  titreCourt: string;
  icon: string;
  description: string;
  activites: Activite[];
  regime?: "prestataire"; // Ajout concordance - tous même régime
};

export const TAUX_CDF = 2300; // Concordance - pour import unique

export const CATEGORIES_WENZE: Categorie[] = [
  { 
    id: "commerce", 
    numero: "01", 
    titre: "Commerce, Vente, Boutique", 
    titreCourt: "Commerce", 
    icon: "🛒", 
    description: "Vente de produits à Kinshasa - Régime prestataire unique Pro 5$ / 11500 CDF - Taux 2300", 
    regime: "prestataire",
    activites: [
      { id: "c1", label: "Vendeur boutique", slug: "vendeur-boutique" },
      { id: "c2", label: "Vendeur en ligne", slug: "vendeur-en-ligne" },
      { id: "c3", label: "Grossiste", slug: "grossiste" },
      { id: "c4", label: "Détaillant", slug: "detaillant" },
      { id: "c5", label: "Vendeur friperie", slug: "vendeur-friperie" },
    ]
  },
  { 
    id: "beaute", 
    numero: "02", 
    titre: "Beauté, Coiffure, Mode", 
    titreCourt: "Beauté", 
    icon: "💇", 
    description: "Salon, coiffure, maquillage, couture - Régime prestataire unique", 
    regime: "prestataire",
    activites: [
      { id: "b1", label: "Coiffeur", slug: "coiffeur" },
      { id: "b2", label: "Barbier", slug: "barbier" },
      { id: "b3", label: "Maquilleuse", slug: "maquilleuse" },
      { id: "b4", label: "Styliste / Couturier", slug: "styliste" },
      { id: "b5", label: "Manucure / Pédicure", slug: "manucure" },
    ]
  },
  { 
    id: "technique", 
    numero: "03", 
    titre: "Technique, Réparation, BTP", 
    titreCourt: "Technique", 
    icon: "🔧", 
    description: "Maçon, électricien, plombier, mécanicien, soudeur + tout travaux techniques = même régime prestataire unique Pro 5$ / 11500 CDF - Taux 2300", 
    regime: "prestataire",
    activites: [
      { id: "t1", label: "Maçon", slug: "macon" },
      { id: "t2", label: "Électricien", slug: "electricien" },
      { id: "t3", label: "Plombier", slug: "plombier" },
      { id: "t4", label: "Mécanicien", slug: "mecanicien" },
      { id: "t5", label: "Menuisier", slug: "menuisier" },
      { id: "t6", label: "Peintre bâtiment", slug: "peintre" },
      { id: "t7", label: "Soudeur - Régime unique 5$ / 11500 CDF", slug: "soudeur" },
      { id: "t8", label: "Tout travaux techniques - Même régime 5$ / 11500 CDF", slug: "tout-travaux-techniques" },
      { id: "t9", label: "Carreleur", slug: "carreleur" },
      { id: "t10", label: "Vitreur / Aluminium", slug: "vitreur" },
    ]
  },
  { 
    id: "alimentation", 
    numero: "04", 
    titre: "Alimentation, Restauration", 
    titreCourt: "Alimentation", 
    icon: "🍲", 
    description: "Cuisine, restaurant, street food, boulangerie - Régime prestataire unique", 
    regime: "prestataire",
    activites: [
      { id: "a1", label: "Cuisinier", slug: "cuisinier" },
      { id: "a2", label: "Boulanger / Pâtissier", slug: "boulanger" },
      { id: "a3", label: "Vendeuse de rue", slug: "vendeuse-rue" },
      { id: "a4", label: "Traiteur", slug: "traiteur" },
    ]
  },
  { 
    id: "menage", 
    numero: "05", 
    titre: "Ménage, Nettoyage", 
    titreCourt: "Ménage", 
    icon: "🧹", 
    description: "Femme de ménage, pressing, nettoyage - Régime prestataire unique", 
    regime: "prestataire",
    activites: [
      { id: "m1", label: "Femme de ménage", slug: "femme-menage" },
      { id: "m2", label: "Pressing / Blanchisserie", slug: "pressing" },
      { id: "m3", label: "Nettoyage bureaux", slug: "nettoyage" },
    ]
  },
  { 
    id: "evenement", 
    numero: "06", 
    titre: "Événementiel, Musique", 
    titreCourt: "Événement", 
    icon: "🎤", 
    description: "DJ, décorateur, animateur, sonorisation - Régime prestataire unique", 
    regime: "prestataire",
    activites: [
      { id: "ev1", label: "DJ", slug: "dj" },
      { id: "ev2", label: "Décorateur", slug: "decorateur" },
      { id: "ev3", label: "Animateur / MC", slug: "animateur" },
      { id: "ev4", label: "Photographe événement", slug: "photographe-event" },
    ]
  },
];

// === TES FONCTIONS ORIGINALES AMÉLIORÉES POUR CONCORDANCE ===
export function getCategorieById(id: string) {
  if (!id) return undefined;
  // Fix: lowerCase + trim pour concordance ancien users
  return CATEGORIES_WENZE.find(c => c.id.toLowerCase() === id.toLowerCase().trim());
}

export function getActiviteById(catId: string, actSlug: string) {
  const cat = getCategorieById(catId);
  if (!cat) return undefined;
  return cat.activites.find(a => a.slug.toLowerCase() === actSlug.toLowerCase() || a.id.toLowerCase() === actSlug.toLowerCase());
}

export function getAllActivites() {
  return CATEGORIES_WENZE.flatMap(c => c.activites.map(a => ({ ...a, categorieId: c.id, categorieTitre: c.titreCourt, regime: c.regime })));
}

// === FONCTIONS EXPERTES MANQUANTES - CONCORDANCE TOTALE ===

// Fix: Soudeur / Tout travaux = même régime - ancien user avec activiteId = soudeur
export function normalizeCategorie(raw: string): string {
  if (!raw) return "commerce";
  const lower = raw.toLowerCase().trim();
  if (lower.includes("soud") || lower.includes("tout-travaux") || lower.includes("tout travaux") || lower.includes("technique") || lower.includes("mécanic") || lower.includes("macon") || lower.includes("electric") || lower.includes("plomb") || lower.includes("menuisier") || lower.includes("peintre") || lower.includes("carreleur") || lower.includes("vitreur")) return "technique";
  if (lower.includes("beauté") || lower.includes("beaute") || lower.includes("coiff") || lower.includes("barbier") || lower.includes("maquillage") || lower.includes("styliste") || lower.includes("manucure")) return "beaute";
  if (lower.includes("aliment") || lower.includes("restauration") || lower.includes("cuisin") || lower.includes("boulang") || lower.includes("traiteur") || lower.includes("food")) return "alimentation";
  if (lower.includes("ménage") || lower.includes("menage") || lower.includes("nettoyage") || lower.includes("pressing")) return "menage";
  if (lower.includes("événement") || lower.includes("evenement") || lower.includes("dj") || lower.includes("décorateur") || lower.includes("animateur") || lower.includes("photographe")) return "evenement";
  return "commerce";
}

export function normalizeActivite(raw: string): string {
  if (!raw) return "vendeur-boutique";
  const lower = raw.toLowerCase().trim();
  // Cherche dans toutes les activités
  const all = getAllActivites();
  const found = all.find(a => 
    a.slug === lower || 
    a.id.toLowerCase() === lower || 
    a.label.toLowerCase().includes(lower) ||
    lower.includes(a.label.toLowerCase())
  );
  return found ? found.slug : "vendeur-boutique";
}

// Pour validation boutique fonctionnelle - /boutiques filtre
export function isCategorieValide(id: string): boolean {
  return !!getCategorieById(id);
}

export function getCategorieByActiviteSlug(actSlug: string) {
  return CATEGORIES_WENZE.find(c => c.activites.some(a => a.slug === actSlug));
}

// Nombre métiers - utilisé partout tarifs/portefeuille
export const NOMBRE_METIERS = CATEGORIES_WENZE.length; // 6

// Message régime prestataire unique - temps présent - utilisé dans connexion/inscription
export const MESSAGE_REGIME_UNIQUE = `🔧 Régime prestataire unique: Soudeur (t7) + Tout travaux techniques (t8) = même régime que tous les prestataires - Pro 5$ / 11500 CDF - Taux ${TAUX_CDF} CDF fixe - ${CATEGORIES_WENZE.length} métiers - Boutique fonctionnelle garantie - Source: ${CATEGORIES_WENZE.find(c=>c.id==="technique")?.description}`;

// Pour select dropdown inscription - concordance
export const CATEGORIES_OPTIONS = CATEGORIES_WENZE.map(c => ({
  value: c.id,
  label: `${c.icon} ${c.titreCourt} - ${c.description.split(' - ')[0]}`,
  regime: c.regime || "prestataire",
  numero: c.numero,
}));

// Toutes sous-catégories - pour recherche /boutiques
export const getAllSousCategoriesLabels = (): string[] => {
  return CATEGORIES_WENZE.flatMap(c => c.activites.map(a => a.label));
};
