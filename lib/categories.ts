// lib/categories.ts - WENZE WENZE BUSINESS - SOURCE UNIQUE DE VERITE
// 10 Grandes catégories + 110 activités

export interface Activite {
  id: string;
  label: string;
  slug: string;
}

export interface Categorie {
  id: string;
  slug: string;
  numero: number;
  icon: string;
  titre: string;
  titreCourt: string;
  description: string;
  activites: Activite[];
}

export const CATEGORIES_WENZE: Categorie[] = [
  {
    id: "commerce",
    slug: "commerce",
    numero: 1,
    icon: "🛍️",
    titre: "Commerce, boutiques et vendeurs",
    titreCourt: "Commerce",
    description: "Personnes et établissements qui vendent des produits",
    activites: [
      { id: "boutiques", slug: "boutiques", label: "Boutiques et magasins" },
      { id: "vetements", slug: "vetements", label: "Vendeurs de vêtements et de chaussures" },
      { id: "telephones", slug: "telephones", label: "Vendeurs de téléphones et d'accessoires" },
      { id: "alimentaire_com", slug: "alimentaire", label: "Vendeurs de produits alimentaires" },
      { id: "cosmetiques_com", slug: "cosmetiques", label: "Vendeurs de cosmétiques et de parfums" },
      { id: "meubles", slug: "meubles", label: "Vendeurs de meubles et d'électroménagers" },
      { id: "materiaux", slug: "materiaux", label: "Vendeurs de matériaux de construction" },
      { id: "pieces", slug: "pieces", label: "Vendeurs de pièces détachées" },
      { id: "supermarche", slug: "supermarche", label: "Supermarchés et alimentations" },
      { id: "ambulant", slug: "ambulant", label: "Marchands et commerçants ambulants" },
      { id: "grossiste", slug: "grossiste", label: "Grossistes et dépôts" },
      { id: "importateur", slug: "importateur", label: "Importateurs et distributeurs" },
    ]
  },
  {
    id: "beaute",
    slug: "beaute",
    numero: 2,
    icon: "💇",
    titre: "Beauté, coiffure et soins personnels",
    titreCourt: "Beauté",
    description: "Professionnels de la beauté et des soins",
    activites: [
      { id: "coiffure_femme", slug: "coiffure-femme", label: "Salons de coiffure pour femmes" },
      { id: "coiffure_homme", slug: "coiffure-homme", label: "Salons de coiffure pour hommes" },
      { id: "barbier", slug: "barbier", label: "Barbiers" },
      { id: "coiffure_domicile", slug: "coiffure-domicile", label: "Coiffeurs à domicile" },
      { id: "salon_beaute", slug: "salon-beaute", label: "Salons de beauté" },
      { id: "pedicure", slug: "pedicure", label: "Pédicures et manucures" },
      { id: "maquilleur", slug: "maquilleur", label: "Maquilleurs professionnels" },
      { id: "onglerie", slug: "onglerie", label: "Prothésistes ongulaires" },
      { id: "esthetique", slug: "esthetique", label: "Esthéticiens" },
      { id: "soins_capillaires", slug: "soins-capillaires", label: "Spécialistes soins capillaires" },
      { id: "massage", slug: "massage", label: "Masseurs et bien-être" },
      { id: "beaute_vente", slug: "vente-beaute", label: "Vendeurs de produits de beauté" },
    ]
  },
  {
    id: "technique",
    slug: "technique",
    numero: 3,
    icon: "🔧",
    titre: "Construction, réparation et métiers techniques",
    titreCourt: "Technique",
    description: "Artisans, techniciens qui construisent et réparent",
    activites: [
      { id: "macon", slug: "macon", label: "Maçons" },
      { id: "plombier", slug: "plombier", label: "Plombiers" },
      { id: "electricien", slug: "electricien", label: "Électriciens" },
      { id: "menuisier", slug: "menuisier", label: "Menuisiers" },
      { id: "soudeur", slug: "soudeur", label: "Soudeurs et ferronniers" },
      { id: "peintre", slug: "peintre", label: "Peintres en bâtiment" },
      { id: "carreleur", slug: "carreleur", label: "Carreleurs" },
      { id: "charpentier", slug: "charpentier", label: "Charpentiers" },
      { id: "vitrier", slug: "vitrier", label: "Vitriers et aluminium" },
      { id: "mecano_auto", slug: "mecano-auto", label: "Mécaniciens automobiles" },
      { id: "mecano_moto", slug: "mecano-moto", label: "Réparateurs de motos" },
      { id: "rep_telephone", slug: "reparateur-telephone", label: "Réparateurs de téléphones" },
      { id: "rep_ordi", slug: "reparateur-ordinateur", label: "Réparateurs d'ordinateurs" },
      { id: "clim", slug: "climatisation", label: "Techniciens en climatisation" },
      { id: "solaire", slug: "solaire", label: "Installateurs de panneaux solaires" },
      { id: "electromenager", slug: "electromenager", label: "Réparateurs d'électroménagers" },
    ]
  },
  {
    id: "immobilier",
    slug: "immobilier",
    numero: 4,
    icon: "🏠",
    titre: "Immobilier, maisons et terrains",
    titreCourt: "Immobilier",
    description: "Biens immobiliers à Kinshasa",
    activites: [
      { id: "agence_immo", slug: "agence", label: "Agences immobilières" },
      { id: "agent_immo", slug: "agent", label: "Agents immobiliers" },
      { id: "location_proprio", slug: "location", label: "Propriétaires locations" },
      { id: "vente_maison", slug: "maison", label: "Vendeurs de maisons" },
      { id: "vente_terrain", slug: "terrain", label: "Vendeurs de parcelles et terrains" },
      { id: "appart", slug: "appartement", label: "Propriétaires appartements" },
      { id: "chambre", slug: "chambre", label: "Loueurs de chambres et studios" },
      { id: "gestion_immo", slug: "gestion", label: "Gestionnaires immobiliers" },
      { id: "promoteur", slug: "promoteur", label: "Promoteurs immobiliers" },
    ]
  },
  {
    id: "agriculture",
    slug: "agriculture",
    numero: 5,
    icon: "🌾",
    titre: "Agriculture, élevage et produits alimentaires",
    titreCourt: "Agriculture",
    description: "Producteurs agricoles et éleveurs",
    activites: [
      { id: "agriculteur", slug: "agriculteur", label: "Agriculteurs" },
      { id: "maraicher", slug: "maraicher", label: "Maraîchers" },
      { id: "producteur_fruit", slug: "fruits-legumes", label: "Producteurs de fruits et légumes" },
      { id: "elevage_poulet", slug: "poulets", label: "Éleveurs de poulets" },
      { id: "elevage_porc", slug: "porcs", label: "Éleveurs de porcs" },
      { id: "elevage_betail", slug: "betail", label: "Éleveurs de chèvres et bovins" },
      { id: "pisciculteur", slug: "pisciculteur", label: "Pisciculteurs" },
      { id: "pecheur", slug: "pecheur", label: "Pêcheurs" },
      { id: "poisson", slug: "poissons", label: "Vendeurs de poissons" },
      { id: "produits_agri", slug: "produits-agricoles", label: "Vendeurs de produits agricoles" },
      { id: "semence", slug: "semences", label: "Fournisseurs de semences et d'engrais" },
    ]
  },
  {
    id: "transport",
    slug: "transport",
    numero: 6,
    icon: "🚚",
    titre: "Transport, livraison et automobile",
    titreCourt: "Transport",
    description: "Déplacements et transport de marchandises",
    activites: [
      { id: "chauffeur_prive", slug: "chauffeur-prive", label: "Chauffeurs privés" },
      { id: "taxi", slug: "taxi", label: "Chauffeurs de taxi" },
      { id: "moto_taxi", slug: "moto-taxi", label: "Conducteurs de motos-taxis" },
      { id: "transport_march", slug: "transport-marchandises", label: "Transporteurs de marchandises" },
      { id: "livreur", slug: "livreur", label: "Livreurs à domicile" },
      { id: "location_voiture", slug: "location-voiture", label: "Location de voitures" },
      { id: "vente_voiture", slug: "vente-voiture", label: "Vendeurs de voitures" },
      { id: "vente_moto", slug: "vente-moto", label: "Vendeurs de motos" },
      { id: "garage", slug: "garage", label: "Garages automobiles" },
      { id: "laveur", slug: "laveur", label: "Laveurs de voitures" },
    ]
  },
  {
    id: "restauration",
    slug: "restauration",
    numero: 7,
    icon: "🍽️",
    titre: "Restauration, alimentation et hébergement",
    titreCourt: "Restauration",
    description: "Repas, aliments préparés et hébergement",
    activites: [
      { id: "restaurant", slug: "restaurant", label: "Restaurants" },
      { id: "fast_food", slug: "fast-food", label: "Fast-foods" },
      { id: "cuisinier_dom", slug: "cuisinier-domicile", label: "Cuisiniers à domicile" },
      { id: "traiteur", slug: "traiteur", label: "Traiteurs" },
      { id: "rue", slug: "rue", label: "Vendeurs de nourriture de rue" },
      { id: "patisserie", slug: "patisserie", label: "Pâtisseries" },
      { id: "boulangerie", slug: "boulangerie", label: "Boulangeries" },
      { id: "jus", slug: "jus", label: "Vendeurs de jus naturels" },
      { id: "hotel", slug: "hotel", label: "Hôtels" },
      { id: "auberge", slug: "auberge", label: "Auberges" },
    ]
  },
  {
    id: "informatique",
    slug: "informatique",
    numero: 8,
    icon: "💻",
    titre: "Informatique, services professionnels et entreprises",
    titreCourt: "Informatique",
    description: "Numérique et services entreprises",
    activites: [
      { id: "informaticien", slug: "informaticien", label: "Informaticiens" },
      { id: "dev", slug: "developpeur", label: "Développeurs de logiciels" },
      { id: "web", slug: "web", label: "Créateurs de sites Internet" },
      { id: "graphiste", slug: "graphiste", label: "Graphistes et infographistes" },
      { id: "photographe", slug: "photographe", label: "Photographes" },
      { id: "marketing", slug: "marketing", label: "Experts en marketing numérique" },
      { id: "avocat", slug: "avocat", label: "Avocats et cabinets juridiques" },
      { id: "comptable", slug: "comptable", label: "Comptables" },
      { id: "traducteur", slug: "traducteur", label: "Traducteurs et interprètes" },
    ]
  },
  {
    id: "sante_education",
    slug: "sante-education",
    numero: 9,
    icon: "🏥",
    titre: "Santé, éducation et formation",
    titreCourt: "Santé & Éducation",
    description: "Santé, apprentissage et formation",
    activites: [
      { id: "clinique", slug: "clinique", label: "Cliniques et centres de santé" },
      { id: "medecin", slug: "medecin", label: "Cabinets médicaux" },
      { id: "pharmacie", slug: "pharmacie", label: "Pharmacies autorisées" },
      { id: "ecole", slug: "ecole", label: "Écoles et établissements" },
      { id: "formation_pro", slug: "formation-pro", label: "Centres de formation pro" },
      { id: "enseignant", slug: "enseignant", label: "Enseignants particuliers" },
      { id: "formation_info", slug: "formation-info", label: "Formateurs en informatique" },
      { id: "formation_couture", slug: "formation-couture", label: "Centres de formation en couture" },
    ]
  },
  {
    id: "services",
    slug: "services",
    numero: 10,
    icon: "🧹",
    titre: "Services à domicile, événements, loisirs et autres",
    titreCourt: "Services",
    description: "Services pratiques, événements et loisirs",
    activites: [
      { id: "nettoyage", slug: "nettoyage", label: "Agents de nettoyage" },
      { id: "pressing", slug: "pressing", label: "Blanchisseries et pressings" },
      { id: "menage", slug: "menage", label: "Femmes et hommes de ménage" },
      { id: "decorateur", slug: "decorateur", label: "Décorateurs de cérémonies" },
      { id: "organisateur_mariage", slug: "mariage", label: "Organisateurs de mariages" },
      { id: "dj", slug: "dj", label: "DJ et animateurs" },
      { id: "location_chaise", slug: "location-chaise", label: "Loueurs de chaises et tables" },
      { id: "salle_fete", slug: "salle-fete", label: "Loueurs de salles de fête" },
      { id: "couturier", slug: "couturier", label: "Couturiers et couturières" },
      { id: "securite", slug: "securite", label: "Entreprises de sécurité autorisées" },
    ]
  },
];

// HELPERS - UTILITAIRES PRO
export const getCategorieById = (id: string) => CATEGORIES_WENZE.find(c => c.id === id || c.slug === id);
export const getCategorieBySlug = (slug: string) => CATEGORIES_WENZE.find(c => c.slug === slug);
export const getActiviteById = (catId: string, actId: string) => {
  const cat = getCategorieById(catId);
  return cat?.activites.find(a => a.id === actId || a.slug === actId);
};
export const getAllActivites = () => CATEGORIES_WENZE.flatMap(c => c.activites.map(a => ({ ...a, categorie: c })));
export const getTotalActivites = () => CATEGORIES_WENZE.reduce((acc, c) => acc + c.activites.length, 0);
