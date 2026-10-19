"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProfilPage() {
  const [user, setUser] = useState<any>(null);
  const [type, setType] = useState<"client"|"pro"|null>(null);

  useEffect(()=>{
    // Récupère ce que tu as sauvé à l'inscription
    const saved = localStorage.getItem("wenze_user");
    if(saved) {
      const u = JSON.parse(saved);
      setUser(u);
      setType(u.type || "client");
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("wenze_user");
    setUser(null);
    window.location.href = "/";
  };

  // CAS 1: PAS CONNECTÉ - On montre connexion
  if(!user){
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 flex flex-col justify-center">
        <h1 className="text-2xl font-black">👤 Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Connectez-vous pour gérer votre boutique</p>

        <div className="mt-8 space-y-3">
          <Link href="/inscription?type=client" className="block w-full bg-black text-white p-4 rounded-full font-bold text-center">
            Se connecter / Créer compte Client
          </Link>
          <Link href="/inscription?type=pro" className="block w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold text-center">
            Créer boutique Pro - 15 000 CDF/mois
          </Link>
          <Link href="/conditions" className="block text-center text-xs text-gray-400 mt-4 underline">
            Conditions & Confidentialité
          </Link>
        </div>

        <div className="mt-10 bg-gray-50 p-4 rounded-xl text-xs">
          <p className="font-bold">Pourquoi créer un compte?</p>
          <p className="mt-1">• Client: Suivre commandes, partager position livraison</p>
          <p>• Pro: Publier produits, vidéos Wenze Video, Assistante IA</p>
        </div>
      </div>
    )
  }

  // CAS 2: CONNECTÉ
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5">
      <h1 className="text-2xl font-black">👤 Mon Profil</h1>
      
      <div className="mt-6 bg-purple-50 p-4 rounded-2xl flex gap-4 items-center">
        <img src={user.photo || "https://via.placeholder.com/80"} alt="profil" className="w-16 h-16 rounded-full object-cover border-2 border-white" />
        <div>
          <p className="font-bold">{user.nom}</p>
          <p className="text-xs text-gray-600">{user.whatsapp}</p>
          <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${type==="pro" ? "bg-black text-white" : "bg-white"}`}>
            {type==="pro" ? "COMPTE PRO" : "COMPTE CLIENT"} {type==="pro" && `• ${user.etablissement}`}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {type==="client" && (
          <Link href="/inscription?type=pro" className="block w-full border-2 border-[#6C3CE0] p-3 rounded-xl text-center text-sm font-bold text-[#6C3CE0]">
            ⬆️ Passer en compte Pro - Devenir vendeur
          </Link>
        )}
        {type==="pro" && (
          <>
            <Link href="/boutiques" className="block w-full bg-black text-white p-3 rounded-xl text-center text-sm font-bold">🏪 Ma Boutique</Link>
            <Link href="/assistant" className="block w-full bg-white border p-3 rounded-xl text-center text-sm font-bold">🤖 Assistante IA</Link>
            <Link href="/video" className="block w-full bg-white border p-3 rounded-xl text-center text-sm font-bold">🎬 Mes Vidéos</Link>
          </>
        )}
        <Link href="/conditions" className="block w-full bg-gray-100 p-3 rounded-xl text-center text-sm">📄 Conditions</Link>
        <Link href="/confidentialite" className="block w-full bg-gray-100 p-3 rounded-xl text-center text-sm">🔒 Confidentialité</Link>
        <button onClick={logout} className="w-full bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold mt-4">Déconnexion</button>
      </div>

      <p className="text-[10px] text-center text-gray-400 mt-8">WENZE WENZE BUSINESS - Kinshasa - v1.0 - 0% commission</p>
    </div>
  )
        }
