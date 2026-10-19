"use client";
import Link from "next/link";
const cats = ["Commerce","Beauté","Construction","Immobilier","Agriculture","Transport","Restauration","Informatique","Santé & Éducation","Services Domicile"];
export default function Inscription() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-5">
      <Link href="/profil" className="text-sm">← Retour</Link>
      <h1 className="text-2xl font-black mt-6">Créer Compte Boutique Pro</h1>
      <p className="text-xs text-gray-500 mt-1">15 000 CDF/mois - 0% commission</p>
      <input placeholder="Nom de votre boutique" className="w-full border p-4 rounded-xl mt-6" />
      <input placeholder="Numéro WhatsApp" className="w-full border p-4 rounded-xl mt-3" />
      <select className="w-full border p-4 rounded-xl mt-3">
        <option>Choisissez votre grande catégorie (1 à 10)</option>
        {cats.map(c=><option key={c}>{c}</option>)}
      </select>
      <input type="password" placeholder="Créez mot de passe" className="w-full border p-4 rounded-xl mt-3" />
      <button className="w-full bg-[#FF8C00] text-white p-4 rounded-full font-bold mt-4">S'inscrire et Payer 15 000 CDF</button>
      <p className="text-center text-sm mt-4">Déjà un compte? <Link href="/connexion" className="text-[#6C3CE0] font-bold">Connectez-vous</Link></p>
    </div>
  )
}
