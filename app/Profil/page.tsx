import Link from "next/link";
export default function Profil() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-black">Mon Compte</h1>
      <div className="bg-white rounded-2xl p-5 mt-5 text-center shadow">
        <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto flex items-center justify-center text-3xl">👤</div>
        <h2 className="font-bold mt-3">Bienvenue sur Wenze</h2>
        <p className="text-xs text-gray-500">Connectez-vous pour gérer votre boutique</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Link href="/connexion" className="bg-black text-white py-3 rounded-full font-bold">Connexion</Link>
          <Link href="/inscription" className="bg-[#FF8C00] text-white py-3 rounded-full font-bold">S'inscrire</Link>
        </div>
      </div>
      <Link href="/" className="block text-center mt-6 text-[#6C3CE0]">← Retour Accueil</Link>
    </div>
  )
}
