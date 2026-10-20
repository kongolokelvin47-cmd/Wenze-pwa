// app/categorie/[slug]/[activite]/page.tsx - WENZE WENZE BUSINESS FINAL
import Link from "next/link";
import { getCategorieById, getActiviteById } from "@/lib/categories";
import { notFound } from "next/navigation";
import { FORMULES, TAUX_CDF } from "@/lib/paiement";

export default function PageActivite({ params }: { params: { slug: string; activite: string } }) {
  const categorie = getCategorieById(params.slug);
  if (!categorie) return notFound();

  const activite = getActiviteById(params.slug, params.activite);
  if (!activite) return notFound();

  const getWaLink = (nomPro: string, prix?: string) => {
    const msg = `Bonjour 👋 Je vous contacte depuis WENZE WENZE BUSINESS.

Je suis intéressé par: ${activite.label} - ${nomPro}
Catégorie: ${categorie.titreCourt}
${prix ? `Prix vu: ${prix}` : ""}

Vous êtes disponible à Kinshasa? 
Merci!`;
    return `https://wa.me/243810000000?text=${encodeURIComponent(msg)}`;
  };

  const pros = [
    { id: 1, nom: `${activite.label} Pro - Gombe`, prix: "$15", prixCDF: 15 * TAUX_CDF, commune: "Gombe", note: 4.9 },
    { id: 2, nom: `${activite.label} Expert - Masina`, prix: "$10", prixCDF: 10 * TAUX_CDF, commune: "Masina", note: 4.8 },
    { id: 3, nom: `${activite.label} Service - Limete`, prix: "$25", prixCDF: 25 * TAUX_CDF, commune: "Limete", note: 5.0 },
  ];

  return (
    <div className="min-h-screen bg-[#FFFBF0] pb-20">
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <Link href={`/categorie/${params.slug}`} className="text-sm text-[#6C3CE0] font-semibold">← Retour {categorie.titreCourt}</Link>
        <h1 className="text-2xl font-bold mt-2">{activite.label}</h1>
        <p className="text-sm text-gray-600">{categorie.titreCourt} • 0% commission • Kinshasa</p>
      </div>

      <div className="p-4 grid gap-4">
        {pros.map((pro) => (
          <div key={pro.id} className="bg-white rounded-[12px] p-4 shadow-wenze border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{pro.nom}</h3>
                <p className="text-xs text-gray-500">{pro.commune} • ⭐ {pro.note}</p>
                <p className="text-sm font-bold text-[#6C3CE0] mt-1">{pro.prix} • {pro.prixCDF.toLocaleString()} CDF</p>
              </div>
              <span className="bg-[#00C950] text-white text-[10px] px-2 py-1 rounded-full">Vérifié</span>
            </div>
            <a href={getWaLink(pro.nom, pro.prix)} target="_blank" className="mt-3 block w-full bg-[#6C3CE0] text-white text-center py-3 rounded-[12px] font-bold">
              Contacter sur WhatsApp
            </a>
          </div>
        ))}

        <div className="bg-white rounded-[12px] p-4 mt-4 border-2 border-dashed border-[#6C3CE0]">
          <h4 className="font-bold">Tu fais {activite.label}?</h4>
          <p className="text-xs text-gray-600 mt-1">Freemium: 3 annonces gratuites à vie • Pro: 5$ (11500 CDF)/mois illimité</p>
          <Link href="/publier" className="mt-2 block w-full bg-[#FF6B35] text-white text-center py-3 rounded-[12px] font-bold">
            Publier maintenant
          </Link>
        </div>
      </div>
    </div>
  );
              }
