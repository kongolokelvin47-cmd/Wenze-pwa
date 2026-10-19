// lib/categories.ts - SOURCE UNIQUE OFFICIELLE
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
  { id: "commerce", numero: "01", titre: "Commerce, Vente, Boutique", titreCourt: "Commerce", icon: "🛒", description: "Vente de produits à Kinshasa", activites: [
    { id: "c1", label: "Vendeur boutique", slug: "vendeur-boutique" },
    { id: "c2", label: "Vendeur en ligne", slug: "vendeur-en-ligne" },
    { id: "c3", label: "Grossiste", slug: "grossiste" },
    { id: "c4", label: "Détaillant", slug: "detaillant" },
  ]},
  { id: "beaute", numero: "02", titre: "Beauté, Coiffure, Mode", titreCourt: "Beauté", icon: "💇", description: "Salon, coiffure, maquillage", activites: [
    { id: "b1", label: "Coiffeur", slug: "coiffeur" },
    { id: "b2", label: "Barbier", slug: "barbier" },
    { id: "b3", label: "Maquilleuse", slug: "maquilleuse" },
    { id: "b4", label: "Styliste", slug: "styliste" },
  ]},
  { id: "technique", numero: "03", titre: "Technique, Réparation, BTP", titreCourt: "Technique", icon: "🔧", description: "Maçon, électricien, plombier", activites: [
    { id: "t1", label: "Maçon", slug: "macon" },
    { id: "t2", label: "Électricien", slug: "electricien" },
    { id: "t3", label: "Plombier", slug: "plombier" },
    { id: "t4", label: "Mécanicien", slug: "mecanicien" },
  ]},
  { id: "alimentation", numero: "04", titre: "Alimentation, Restauration", titreCourt: "Alimentation", icon: "🍲", description: "Cuisine, restaurant, street food", activites: [
    { id: "a1", label: "Cuisinier", slug: "cuisinier" },
    { id: "a2", label: "Boulanger", slug: "boulanger" },
  ]},
  { id: "transport", numero: "05", titre: "Transport, Livraison", titreCourt: "Transport", icon: "🏍️", description: "Moto, taxi, livraison", activites: [
    { id: "tr1", label: "Chauffeur", slug: "chauffeur" },
    { id: "tr2", label: "Livreur", slug: "livreur" },
  ]},
  { id: "sante", numero: "06", titre: "Santé, Bien-être", titreCourt: "Santé", icon: "⚕️", description: "Infirmier, kiné, pharmacie", activites: [
    { id: "s1", label: "Infirmier", slug: "infirmier" },
  ]},
  { id: "education", numero: "07", titre: "Éducation, Formation", titreCourt: "Éducation", icon: "📚", description: "Prof, coach, répétiteur", activites: [
    { id: "e1", label: "Enseignant", slug: "enseignant" },
  ]},
  { id: "digital", numero: "08", titre: "Digital, Design, Photo", titreCourt: "Digital", icon: "💻", description: "Graphiste, dev, photographe", activites: [
    { id: "d1", label: "Graphiste", slug: "graphiste" },
    { id: "d2", label: "Développeur", slug: "developpeur" },
  ]},
  { id: "menage", numero: "09", titre: "Ménage, Nettoyage", titreCourt: "Ménage", icon: "🧹", description: "Femme de ménage, pressing", activites: [
    { id: "m1", label: "Ménage", slug: "menage" },
  ]},
  { id: "evenement", numero: "10", titre: "Événementiel, Musique", titreCourt: "Événement", icon: "🎤", description: "DJ, décorateur, animateur", activites: [
    { id: "ev1", label: "DJ", slug: "dj" },
  ]},
];

export function getCategorieById(id: string) {
  return CATEGORIES_WENZE.find(c => c.id === id);
}
export function getActiviteById(catId: string, actSlug: string) {
  const cat = getCategorieById(catId);
  return cat?.activites.find(a => a.slug === actSlug);
  }
