// app/categorie/[slug]/page.tsx - VERSION FINALE BRANCHÉE SUR lib/
import { CATEGORIES_WENZE } from "@/lib/categorieswenza";
import WhatsappButton from "@/components/WhatsappButton";
import Link from "next/link";
import { notFound } from "next/navigation";

export default function PageCategorie({ params }: { params: { slug: string } }) {
  const categorie = CATEGORIES_WENZE.find(c => c.id === params.slug);
  
  if (!categorie) return notFound();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header catégorie */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
        <h1 className="text-3xl font-black">{categorie.icon} {categorie.titre}</h1>
        <p className="text-gray-500 mt-2">{categorie.description}</p>
        <p className="text-sm text-gray-400 mt-1">{categorie.activites.length} activités</p>
      </div>

      {/* Liste des activités de cette catégorie */}
      <h2 className="font-bold text-lg mb-3">Choisissez une activité:</h2>
      <div className="grid grid-cols-1 gap-3 mb-24">
        {categorie.activites.map(act => (
          <Link
            key={act.id}
            href={`/categorie/${categorie.id}/${act.id}`}
            className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm hover:shadow-md transition"
          >
            <span className="font-medium">{act.label}</span>
            <span className="text-gray-400">›</span>
          </Link>
        ))}
      </div>

      {/* Retour */}
      <Link href="/" className="fixed bottom-20 left-4 bg-black text-white px-4 py-2 rounded-full text-sm">
        ← Accueil
      </Link>
    </div>
  );
}

// Pour générer les 10 pages statiques automatiquement
export function generateStaticParams() {
  return CATEGORIES_WENZE.map(c => ({ slug: c.id }));
            }
