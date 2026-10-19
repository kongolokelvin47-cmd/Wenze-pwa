"use client";
import Link from "next/link";
const boutiques = [
  { name: "Mama Mode Kin", cat: "Commerce", icon: "👗", ville: "Gombe" },
  { name: "Coiffure Grâce", cat: "Beauté", icon: "💇", ville: "Limete" },
  { name: "Batisseur Rapide", cat: "Construction", icon: "🔧", ville: "Matete" },
  { name: "Agence Immo Kin", cat: "Immobilier", icon: "🏠", ville: "Ngaliema" },
];
export default function Boutiques() {
  return (
    <div className="max-w-[430px] mx-auto bg-white min-h-screen p-4">
      <Link href="/" className="text-[#6C3CE0]">← Accueil</Link>
      <h1 className="text-2xl font-black mt-3">Boutiques Wenze</h1>
      <p className="text-sm text-gray-500">100% des boutiques de Kinshasa</p>
      <div className="grid gap-3 mt-4">
        {boutiques.map(b => (
          <div key={b.name} className="border p-3 rounded-xl flex gap-3">
            <div className="text-3xl">{b.icon}</div>
            <div><p className="font-bold">{b.name}</p><p className="text-xs text-gray-500">{b.cat} • {b.ville}</p></div>
            <Link href="/profil" className="ml-auto bg-black text-white text-xs px-3 py-1 rounded-full h-fit">Voir</Link>
          </div>
        ))}
      </div>
    </div>
  )
        }
