// app/categorie/[slug]/page.tsx - VERSION FINALE VERCEL OK
import Link from "next/link";
import { CATEGORIES_WENZE, getCategorieById } from "@/lib/categories";
import { notFound } from "next/navigation";

export default function PageCategorie({ params }: { params: { slug: string } }) {
  const categorie = getCategorieById(params.slug);
  
  if (!categorie) return notFound();

  const getWaLink = (activiteLabel: string) => {
    const msg = `Bonjour 👋 Je vous contacte depuis WENZE WENZE BUSINESS. Je cherche: ${activiteLabel} dans ${categorie.titreCourt}. Vous êtes disponible à Kinshasa?`;
    return `https://wa.me/243810000000?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="max-w-[430px] mx-auto bg-gray-50 min-h-screen pb-24">
      {/* HEADER */}
      <header className="bg-white p-4 border-b sticky top-0 z-10 flex items-center gap-3">
        <Link href="/categories" className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center">←</Link>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gray-50 border flex items-center justify-center text-2xl">
            {categorie.icon}
          </div>
          <div>
            <h1 className="font-black text-[14px] leading-tight">{categorie.titre}</h1>
            <p className="text-[11px] text-gray-500">{categorie.description}</p>
            <p className="text-[10px] text-[#6C3CE0] font-bold mt-0.5">{categorie.activites.length} métiers • 0% commission</p>
          </div>
        </div>
      </header>

      {/* LISTE ACTIVITÉS */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-[14px]">Choisissez votre métier:</h2>
          <span className="text-[11px] bg-black text-white px-2 py-1 rounded-full">{categorie.numero}/10</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {categorie.activites.map(act => (
            <div key={act.id} className="bg-white p-3 rounded-xl border flex justify-between items-center hover:border-[#6C3CE0] transition">
              <Link href={`/categorie/${categorie.id}/${act.slug}`} className="flex-1">
                <p className="text-[13px] font-medium">{act.label}</p>
                <p className="text-[10px] text-gray-400">Cliquez pour voir les pros</p>
              </Link>
              <a href={getWaLink(act.label)} target="_blank" className="ml-3 bg-[#25D366] text-white text-[10px] font-bold px-3 py-2 rounded-full">
                WhatsApp
              </a>
            </div>
          ))}
        </div>

        <Link href={`/publier?categorie=${categorie.id}`} className="mt-6 w-full bg-[#6C3CE0] text-white py-4 rounded-xl font-black text-center block">
          + Publier comme {categorie.titreCourt} 👑 Pro 5$
        </Link>

        <div className="mt-4 bg-white p-3 rounded-xl border text-[11px] text-gray-600">
          <p className="font-bold">💡 Wenze Wenze Business:</p>
          <p>Abonnement 15 000 CDF/mois (5$), vous gardez 100%, 0% commission. Bouton WhatsApp direct, IA gratuite Pro, géoloc gratuite.</p>
        </div>
      </div>
    </div>
  );
}

// Génère les 10 pages statiques
export function generateStaticParams() {
  return CATEGORIES_WENZE.map(c => ({ slug: c.id }));
            }
