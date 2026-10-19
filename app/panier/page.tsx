import Link from "next/link";
export default function Panier() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-10 text-center">
      <h1 className="text-2xl font-bold">Votre Panier 🛒</h1>
      <p className="mt-2 text-gray-500">Votre panier est vide</p>
      <Link href="/" className="mt-6 inline-block bg-[#6C3CE0] text-white px-6 py-3 rounded-full">Continuer vos achats</Link>
    </div>
  )
}
