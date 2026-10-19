import Link from "next/link";
const data:any = {
  commerce: ["Boutiques et magasins","Vendeurs vêtements/chaussures","Vendeurs téléphones","Produits alimentaires","Cosmétiques/parfums","Meubles/électroménagers","Matériaux construction","Pièces détachées","Supermarchés","Grossistes"],
  beaute: ["Salon coiffure femme","Salon coiffure homme","Barbiers","Coiffeur à domicile","Salon beauté","Pédicure/Manicure","Maquilleurs","Prothésiste ongulaire","Esthéticiens","Masseurs"],
  construction: ["Maçons","Plombiers","Électriciens","Menuisiers","Soudeurs","Peintres bâtiment","Carreleurs","Mécaniciens","Réparateurs téléphones/ordi","Climatisation/Panneaux solaires"],
  immobilier: ["Agences immobilières","Agents","Locations","Vente maisons/parcelles","Appartements/Chambres","Gestionnaires","Promoteurs","Rénovation"],
  agriculture: ["Agriculteurs","Maraîchers","Éleveurs poulets/porcs/chèvres","Pisciculteurs/Pêcheurs","Vendeurs produits agricoles","Semences/engrais","Matériel agricole"],
  transport: ["Chauffeurs taxi/moto-taxi","Transport marchandises","Livreurs/Coursiers","Déménagement","Location voitures/motos","Vente voitures/motos","Garages/Laveurs auto"],
  restauration: ["Restaurants/Fast-foods","Cuisiniers à domicile/Traiteurs","Nourriture de rue","Pâtisseries/Boulangeries","Cafés/Jus","Livraison repas","Hôtels/Auberges"],
  informatique: ["Informaticiens/Développeurs","Créateurs sites/Graphistes","Photographes/Vidéastes","Community managers/Marketing digital","Avocats/Comptables","Traducteurs/Recrutement"],
  "sante-education": ["Cliniques/Cabinets médicaux/dentaires","Infirmiers/Laboratoires","Pharmacies","Écoles/Centres formation","Enseignants/Répétiteurs","Formation couture/coiffure/informatique"],
  "services-domicile": ["Agents nettoyage/Pressings","Jardiniers/Ménage/Gardiens enfants","Décorateurs/Organisateurs mariages","DJ/Musiciens/Photographes","Location chaises/salles/sono","Coachs sportifs/Salles sport","Couturiers/Artisans/Sécurité"]
};
export default function Cat({ params }: { params: { slug: string } }) {
  const list = data[params.slug] || [];
  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-4">
      <Link href="/" className="text-[#6C3CE0]">← Accueil</Link>
      <h1 className="text-2xl font-black mt-3 capitalize">{params.slug.replace("-", " ")}</h1>
      <p className="text-sm text-gray-500">{list.length} activités disponibles</p>
      <div className="grid gap-2 mt-4">
        {list.map((it:string)=><Link key={it} href="/boutiques" className="border p-4 rounded-xl bg-white flex justify-between"><span>{it}</span><span>›</span></Link>)}
      </div>
    </div>
  )
}
