import Link from "next/link";

// Espace privé de WENZE (réservé à l'équipe). Page en cours de construction.
export const metadata = { title: "Espace privé", robots: { index: false, follow: false } };

export default function DgPriveUtilisateurs() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 pt-16 text-center">
      <p className="text-5xl">🛡️</p>
      <h1 className="font-black text-[17px] mt-4">Utilisateurs</h1>
      <p className="text-[12px] text-gray-600 mt-2">Cet espace est en cours de construction. Il sera réservé à l'équipe WENZE.</p>
      <Link href="/" className="mt-6 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]">Retour à l'accueil</Link>
    </div>
  );
}
