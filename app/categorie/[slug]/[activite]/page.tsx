// app/categorie/[slug]/[activite]/page.tsx - PAGE FINALE ACTIVITÉ
import Link from "next/link";
import { CATEGORIES_WENZE, getCategorieById, getActiviteById } from "@/lib/categories";
import { notFound } from "next/navigation";

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

  // FAUX PRODUITS POUR TEST - tu remplaceras par ta DB plus tard
  const pros = [
    { id: 1, nom: `${activite.label} Pro 1`, prix: "15 000 CDF", note: "4.9 ⭐", img: "👤" },
    { id: 2, nom: `${activite.label} Pro 2`, prix: "25 000 CDF", note: "4.8 ⭐", img: "👤" },
    { id: 3, nom: `${activite.label} Pro 3`, prix: "Sur devis", note: "5.0 ⭐", img: "👤" },
  ];

  return (
    <div className="max-w-[430px] mx-auto bg-gray-50 min-h-screen pb-24">
      <header className="bg-white p-4 border-b sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/categorie/${categorie.id}`} className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[15px] leading-tight">{activite.label}</h1>
            <p className="text-[11px] text-gray-500">{categorie.icon} {categorie.titreCourt} • {categorie.activites.length} métiers</p>
          </div>
          <Link href={`/publier?categorie=${categorie.id}&activite=${activite.id}`} className="bg-[#6C3CE0] text-white text-[10px] font-bold px-3 py-2 rounded-full">+ Publier</Link>
        </div>
      </header>

      <div className="p-4">
        <div className="bg-gradient-to-br from-[#6C3CE0] to-[#FF8C00] rounded-2xl p-4 text-white mb-4">
          <h2 className="font-black text-lg">{activite.label} à Kinshasa</h2>
          <p className="text-xs opacity-90 mt-1">{categorie.description} • Contact direct WhatsApp • 0% commission</p>
        </div>

        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm">{pros.length} professionnels trouvés</h3>
          <span className="text-[10px] bg-[#25D366]/10 text-[#25D366] px-2 py-1 rounded-full font-bold">WhatsApp direct</span>
        </div>

        <div className="space-y-3">
          {pros.map(p => (
            <div key={p.id} className="bg-white p-3 rounded-xl border flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">{p.img}</div>
              <div className="flex-1">
                <p className="font-bold text-[13px]">{p.nom}</p>
                <p className="text-[11px] text-gray-500">{p.note} • Kinshasa • Dispo aujourd'hui</p>
                <p className="text-[12px] font-black text-[#6C3CE0] mt-1">{p.prix}</p>
              </div>
              <a href={getWaLink(p.nom, p.prix)} target="_blank" className="self-center bg-[#25D366] text-white text-[11px] font-black px-4 py-2 rounded-full">
                💬 WhatsApp
              </a>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-black text-white rounded-2xl p-4">
          <p className="font-bold text-sm">Tu fais ce métier {activite.label}?</p>
          <p className="text-[11px] opacity-80 mt-1">Deviens visible à Kinshasa. Abonnement Pro 5$ / 11 500 CDF par mois, tu gardes 100%, 0% commission, bouton WhatsApp direct, IA gratuite qui rédige ton annonce.</p>
          <Link href={`/publier?categorie=${categorie.id}&activite=${activite.id}`} className="mt-3 bg-[#FF8C00] text-white text-center py-3 rounded-xl font-black text-sm block">
            Devenir Pro et Publier 👑
          </Link>
        </div>
      </div>
    </div>
  );
}

// Génère toutes les pages activites (110 pages)
export function generateStaticParams() {
  const params: { slug: string; activite: string }[] = [];
  CATEGORIES_WENZE.forEach(cat => {
    cat.activites.forEach(act => {
      params.push({ slug: cat.id, activite: act.slug });
    });
  });
  return params;
            }
