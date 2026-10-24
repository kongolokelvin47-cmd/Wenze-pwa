// lib/categories.ts - SOURCE UNIQUE OFFICIELLE - 6 METIERS DE KINSHASA
export type Activite = { id: string; label: string; slug: string };
export type Categorie = {
  id: string;
  numero: string;
  titre: string;
  titreCourt: string;
  icon: string;
  description: string;
  activites: Activite[];
};

export const CATEGORIES_WENZE: Categorie[] = [
  { 
    id: "commerce", 
    numero: "01", 
    titre: "Commerce, Vente, Boutique", 
    titreCourt: "Commerce", 
    icon: "🛒", 
    description: "Vente de produits à Kinshasa", 
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
    description: "Salon, coiffure, maquillage, couture", 
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
    description: "Maçon, électricien, plombier, mécanicien", 
    activites: [
      { id: "t1", label: "Maçon", slug: "macon" },
      { id: "t2", label: "Électricien", slug: "electricien" },
      { id: "t3", label: "Plombier", slug: "plombier" },
      { id: "t4", label: "Mécanicien", slug: "mecanicien" },
      { id: "t5", label: "Menuisier", slug: "menuisier" },
      { id: "t6", label: "Peintre bâtiment", slug: "peintre" },
    ]
  },
  { 
    id: "alimentation", 
    numero: "04", 
    titre: "Alimentation, Restauration", 
    titreCourt: "Alimentation", 
    icon: "🍲", 
    description: "Cuisine, restaurant, street food, boulangerie", 
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
    description: "Femme de ménage, pressing, nettoyage", 
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
    description: "DJ, décorateur, animateur, sonorisation", 
    activites: [
      { id: "ev1", label: "DJ", slug: "dj" },
      { id: "ev2", label: "Décorateur", slug: "decorateur" },
      { id: "ev3", label: "Animateur / MC", slug: "animateur" },
      { id: "ev4", label: "Photographe événement", slug: "photographe-event" },
    ]
  },
];

export function getCategorieById(id: string) {
  return CATEGORIES_WENZE.find(c => c.id === id);
}

export function getActiviteById(catId: string, actSlug: string) {
  const cat = getCategorieById(catId);
  return cat?.activites.find(a => a.slug === actSlug);
}

export function getAllActivites() {
  return CATEGORIES_WENZE.flatMap(c => c.activites.map(a => ({ ...a, categorieId: c.id })));
}
