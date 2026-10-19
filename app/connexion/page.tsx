"use client";
import { useState } from "react";
import Link from "next/link";
export default function Connexion() {
  const [phone, setPhone] = useState("");
  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-5">
      <Link href="/profil" className="text-sm">← Retour</Link>
      <h1 className="text-2xl font-black mt-6">Connexion</h1>
      <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Numéro WhatsApp ex: +243..." className="w-full border p-4 rounded-xl mt-6" />
      <input type="password" placeholder="Mot de passe" className="w-full border p-4 rounded-xl mt-3" />
      <button className="w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold mt-4">Se Connecter</button>
      <p className="text-center text-sm mt-4">Pas encore de compte? <Link href="/inscription" className="text-[#FF8C00] font-bold">Inscrivez-vous ici</Link></p>
    </div>
  )
}
