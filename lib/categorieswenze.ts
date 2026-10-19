// lib/categoriesWenze.ts - WENZE WENZE BUSINESS - 10 GRANDES CATÉGORIES OFFICIELLES

export interface Activite {
  id: string;
  label: string;
}

export interface Categorie {
  id: string;
  numero: number;
  icon: string;
  titre: string;
  description: string;
  activites: Activite[];
}

export const CATEGORIES_WENZE: Categorie[] = [
  {
    id: "commerce",
    numero: 1,
    icon: "🛍️",
    titre: "Commerce, boutiques et vendeurs",
    description: "Personnes et établissements qui vendent des produits",
    activites: [
      { id: "boutiques", label: "Boutiques et magasins" },
      { id: "vetements", label: "Vendeurs de vêtements et de chaussures" },
      { id: "telephones", label: "Vendeurs de téléphones et d'accessoires" },
      { id: "alimentaire_com", label: "Vendeurs de produits alimentaires" },
      { id: "cosmetiques_com", label: "Vendeurs de cosmétiques et de parfums" },
      { id: "meubles", label: "Vendeurs de meubles et d'appareils électroménagers" },
      { id: "materiaux", label: "Vendeurs de matériaux de construction" },
      { id: "pieces", label: "Vendeurs de pièces détachées" },
      { id: "supermarche", label: "Supermarchés et alimentations" },
      { id: "ambulant", label: "Marchands et commerçants ambulants" },
      { id: "grossiste", label: "Grossistes et dépôts de marchandises" },
      { id: "importateur", label: "Importateurs et distributeurs" },
    ]
  },
  {
    id: "beaute",
    numero: 2,
    icon: "💇",
    titre: "Beauté, coiffure et soins personnels",
    description: "Professionnels de la beauté et des soins personnels",
    activites: [
      { id: "coiffure_femme", label: "Salons de coiffure pour femmes" },
      { id: "coiffure_homme", label: "Salons de coiffure pour hommes" },
      { id: "barbier", label: "Barbiers" },
      { id: "coiffure_domicile", label: "Coiffeurs à domicile" },
      { id: "salon_beaute", label: "Salons de beauté" },
      { id: "pedicure", label: "Pédicures et manucures" },
      { id: "maquilleur", label: "Maquilleurs professionnels" },
      { id: "onglerie", label: "Prothésistes ongulaires" },
      { id: "esthetique", label: "Esthéticiens et esthéticiennes" },
      { id: "soins_capillaires", label: "Spécialistes des soins capillaires" },
      { id: "massage", label: "Masseurs et praticiens du bien-être" },
      { id: "beaute_vente", label: "Vendeurs de produits de beauté" },
    ]
  },
  {
    id: "technique",
    numero: 3,
    icon: "🔧",
    titre: "Construction, réparation et métiers techniques",
    description: "Artisans, techniciens qui construisent, installent ou réparent",
    activites: [
      { id: "macon", label: "Maçons" },
      { id: "plombier", label: "Plombiers" },
      { id: "electricien", label: "Électriciens" },
      { id: "menuisier", label: "Menuisiers" },
      { id: "soudeur", label: "Soudeurs et ferronniers" },
      { id: "peintre", label: "Peintres en bâtiment" },
      { id: "carreleur", label: "Carreleurs" },
      { id: "charpentier", label: "Charpentiers" },
      { id: "vitrier", label: "Vitriers et installateurs d'aluminium" },
      { id: "mecano_auto", label: "Mécaniciens automobiles" },
      { id: "mecano_moto", label: "Réparateurs de motos" },
      { id: "rep_telephone", label: "Réparateurs de téléphones" },
      { id: "rep_ordi", label: "Réparateurs d'ordinateurs" },
      { id: "clim", label: "Techniciens en climatisation" },
      { id: "solaire", label: "Installateurs de panneaux solaires" },
      { id: "electromenager", label: "Réparateurs d'appareils électroménagers" },
    ]
  },
  {
    id: "immobilier",
    numero: 4,
    icon: "🏠",
    titre: "Immobilier, maisons et terrains",
    description: "Professionnels et offres liés aux biens immobiliers",
    activites: [
      { id: "agence_immo", label: "Agences immobilières" },
      { id: "agent_immo", label: "Agents immobiliers" },
      { id: "location_proprio", label: "Propriétaires proposant des locations" },
      { id: "vente_maison", label: "Vendeurs de maisons" },
      { id: "vente_terrain", label: "Vendeurs de parcelles et de terrains" },
      { id: "appart", label: "Propriétaires proposant des appartements" },
      { id: "chambre", label: "Loueurs de chambres et de studios" },
      { id: "gestion_immo", label: "Gestionnaires immobiliers" },
      { id: "promoteur", label: "Promoteurs immobiliers" },
    ]
  },
  {
    id: "agriculture",
    numero: 5,
    icon: "🌾",
    titre: "Agriculture, élevage et produits alimentaires",
    description: "Producteurs agricoles, éleveurs et chaîne alimentaire",
    activites: [
      { id: "agriculteur", label: "Agriculteurs" },
      { id: "maraicher", label: "Maraîchers" },
      { id: "producteur_fruit", label: "Producteurs de fruits et légumes" },
      { id: "elevage_poulet", label: "Éleveurs de poulets" },
      { id: "elevage_porc", label: "Éleveurs de porcs" },
      { id: "elevage_betail", label: "Éleveurs de chèvres et de bovins" },
      { id: "pisciculteur", label: "Pisciculteurs" },
      { id: "pecheur", label: "Pêcheurs" },
      { id: "poisson", label: "Vendeurs de poissons" },
      { id: "produits_agri", label: "Vendeurs de produits agricoles" },
      { id: "semence", label: "Fournisseurs de semences et d'engrais" },
    ]
  },
  {
    id: "transport",
    numero: 6,
    icon: "🚚",
    titre: "Transport, livraison et automobile",
    description: "Professionnels des déplacements et transport de marchandises",
    activites: [
      { id: "chauffeur_prive", label: "Chauffeurs privés" },
      { id: "taxi", label: "Chauffeurs de taxi" },
      { id: "moto_taxi", label: "Conducteurs de motos-taxis" },
      { id: "transport_march", label: "Transporteurs de marchandises" },
      { id: "livreur", label: "Livreurs à domicile" },
      { id: "location_voiture", label: "Agences de location de voitures" },
      { id: "vente_voiture", label: "Vendeurs de voitures" },
      { id: "vente_moto", label: "Vendeurs de motos" },
      { id: "garage", label: "Garages automobiles" },
      { id: "laveur", label: "Laveurs de voitures" },
    ]
  },
  {
    id: "restauration",
    numero: 7,
    icon: "🍽️",
    titre: "Restauration, alimentation et hébergement",
    description: "Préparation de repas, aliments et hébergement",
    activites: [
      { id: "restaurant", label: "Restaurants" },
      { id: "fast_food", label: "Fast-foods" },
      { id: "cuisinier_dom", label: "Cuisiniers à domicile" },
      { id: "traiteur", label: "Traiteurs" },
      { id: "rue", label: "Vendeurs de nourriture de rue" },
      { id: "patisserie", label: "Pâtisseries" },
      { id: "boulangerie", label: "Boulangeries" },
      { id: "jus", label: "Vendeurs de jus naturels" },
      { id: "hotel", label: "Hôtels" },
      { id: "auberge", label: "Auberges" },
    ]
  },
  {
    id: "informatique",
    numero: 8,
    icon: "💻",
    titre: "Informatique, services professionnels et entreprises",
    description: "Spécialistes du numérique et accompagnement entreprises",
    activites: [
      { id: "informaticien", label: "Informaticiens" },
      { id: "dev", label: "Développeurs de logiciels" },
      { id: "web", label: "Créateurs de sites Internet" },
      { id: "graphiste", label: "Graphistes et infographistes" },
      { id: "photographe", label: "Photographes" },
      { id: "marketing", label: "Experts en marketing numérique" },
      { id: "avocat", label: "Avocats et cabinets juridiques" },
      { id: "comptable", label: "Comptables" },
      { id: "traducteur", label: "Traducteurs et interprètes" },
    ]
  },
  {
    id: "sante_education",
    numero: 9,
    icon: "🏥",
    titre: "Santé, éducation et formation",
    description: "Santé, apprentissage et formation",
    activites: [
      { id: "clinique", label: "Cliniques et centres de santé" },
      { id: "medecin", label: "Cabinets médicaux" },
      { id: "pharmacie", label: "Pharmacies autorisées" },
      { id: "ecole", label: "Écoles et établissements scolaires" },
      { id: "formation_pro", label: "Centres de formation professionnelle" },
      { id: "enseignant", label: "Enseignants particuliers" },
      { id: "formation_info", label: "Formateurs en informatique" },
      { id: "formation_couture", label: "Centres de formation en couture" },
    ]
  },
  {
    id: "services",
    numero: 10,
    icon: "🧹",
    titre: "Services à domicile, événements, loisirs et autres",
    description: "Services pratiques, événements, loisirs",
    activites: [
      { id: "nettoyage", label: "Agents de nettoyage" },
      { id: "pressing", label: "Blanchisseries et pressings" },
      { id: "menage", label: "Femmes et hommes de ménage" },
      { id: "decorateur", label: "Décorateurs de cérémonies" },
      { id: "organisateur_mariage", label: "Organisateurs de mariages" },
      { id: "dj", label: "DJ et animateurs" },
      { id: "location_chaise", label: "Loueurs de chaises et de tables" },
      { id: "salle_fete", label: "Loueurs de salles de fête" },
      { id: "couturier", label: "Couturiers et couturières" },
      { id: "securite", label: "Entreprises de sécurité autorisées" },
    ]
  },
];

// Helpers
export const getCategorieById = (id: string) => CATEGORIES_WENZE.find(c => c.id === id);
export const getAllActivites = () => CATEGORIES_WENZE.flatMap(c => c.activites);
