"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProfilPage() {
  const [user, setUser] = useState<any>(null);
  const [annoncesCount, setAnnoncesCount] = useState(0);

  useEffect(()=>{
    const saved = localStorage.getItem("wenze_user");
    const count = parseInt(localStorage.getItem("wenze_annonces") || "0");
    setAnnoncesCount(count);

    if(saved) {
      let u = JSON.parse(saved);

      // 1. LOGIQUE DOWNGRADE AUTO SI NON-PAIEMENT
      const expire = localStorage.getItem("abonnement_expire");
      if(expire && Date.now() > parseInt(expire) && (u.type==="pro" || u.type==="grossiste")){
        u.type = "freemium";
        u.abonnement = "Freemium - Retour auto suite non-paiement (3 annonces max à vie)";
        u.ancienType = u.type; // pour savoir qu'il était pro
        localStorage.setItem("wenze_user", JSON.stringify(u));
        alert("⚠️ Abonnement expiré. Vous êtes repassé en Freemium (3 annonces). Repayez pour réactiver immédiatement les avantages Pro.");
      }

      // 2. LOGIQUE UPGRADE IMMEDIAT APRES PAIEMENT
      const paiementReussi = localStorage.getItem("paiement_reussi");
      const typePaye = localStorage.getItem("type_paye") as any;
      if(paiementReussi==="true" && typePaye){
        u.type = typePaye;
        u.abonnement = typePaye==="pro" ? "Pro 5$ / 11 500 CDF / mois - Actif" : typePaye==="grossiste" ? "Grossiste 25$ / 57 500 CDF / mois - Actif" : u.abonnement;
        const fin = Date.now() + 30*24*60*60*1000; // 30 jours
        localStorage.setItem("abonnement_expire", String(fin));
        localStorage.setItem("wenze_user", JSON.stringify(u));
        localStorage.removeItem("paiement_reussi");
        alert(`✅ Paiement reçu! Avantages ${typePaye} activés IMMÉDIATEMENT.`);
      }

      setUser(u);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("wenze_user");
    setUser(null);
    window.location.href = "/";
  };

  const TAUX = 2300;
  const toCDF = (usd:number) => `${(usd*TAUX).toLocaleString()} CDF`;

  if(!user){
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 flex flex-col justify-center">
        <h1 className="text-2xl font-black">👤 Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Inscription gratuite - Choisissez votre formule</p>

        <div className="mt-8 space-y-3">
          <Link href="/inscription?type=client" className="block w-full bg-black text-white p-4 rounded-full font-bold text-center">
            Compte Client - 0 $ / 0 CDF - Gratuit
          </Link>
          <Link href="/inscription?type=freemium" className="block w-full bg-gray-800 text-white p-4 rounded-full font-bold text-center">
            Vendeur Freemium - 0 $ / 0 CDF - 3 annonces à vie
          </Link>
          <Link href="/tarifs" className="block w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold text-center">
            Voir Tarifs Pro 5$ / Grossiste 25$ - $ ou CDF
          </Link>
        </div>

        <div className="mt-8 bg-yellow-50 p-4 rounded-xl text-[11px]">
          <p className="font-bold">💡 Client peut vendre occasionnellement:</p>
          <p>Payez Publication Occasionnelle 3$ / {toCDF(3)} avant lancement - 1 annonce / 5 jours</p>
        </div>
      </div>
    )
  }

  // Calcul limite
  const isClient = user.type==="client";
  const isFreemium = user.type==="freemium";
  const isPro = user.type==="pro";
  const isGrossiste = user.type==="grossiste";
  const limite = isClient ? 0 : isFreemium ? 3 : 9999;
  const restant = limite - annoncesCount;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 pb-20">
      <h1 className="text-xl font-black">👤 Mon Profil</h1>
      
      <div className="mt-4 bg-gradient-to-br from-purple-50 to-orange-50 p-4 rounded-2xl flex gap-4 items-center border">
        <img src={user.photo || "https://via.placeholder.com/80"} alt="profil" className="w-16 h-16 rounded-full object-cover border-2 border-white" />
        <div className="flex-1">
          <p className="font-bold text-sm">{user.nom}</p>
          <p className="text-xs text-gray-600">{user.whatsapp} • {user.categorie || "Client"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${isPro ? "bg-[#6C3CE0] text-white" : isGrossiste ? "bg-orange-500 text-white" : isFreemium ? "bg-gray-800 text-white" : "bg-black text-white"}`}>
              {user.type?.toUpperCase()} {user.etablissement && `• ${user.etablissement}`}
            </span>
          </div>
          <p className="text-[10px] mt-1 font-bold text-green-700">{user.abonnement}</p>
        </div>
      </div>

      {/* COMPTEUR ANNONCES */}
      <div className="mt-4 bg-black text-white p-3 rounded-xl flex justify-between items-center">
        <div>
          <p className="text-[11px]">Annonces publiées</p>
          <p className="font-black text-lg">{annoncesCount} / {limite===9999 ? "ILLIMITÉ" : limite}</p>
        </div>
        <div className="text-right text-[10px]">
          {isFreemium && restant<=0 && <p className="text-red-400 font-bold">Limite atteinte!<br/>Passez Pro 5$</p>}
          {isFreemium && restant>0 && <p>{restant} restantes à vie</p>}
          {isClient && <p>Client: Payez<br/>3$ pour publier</p>}
          {(isPro || isGrossiste) && <p>Illimité<br/>Actif</p>}
        </div>
      </div>

      {/* ACTIONS SELON TYPE */}
      <div className="mt-5 space-y-2">

        {/* CLIENT */}
        {isClient && (
          <>
            <div className="bg-yellow-50 border-2 border-dashed p-3 rounded-xl text-[11px]">
              <p className="font-bold">🛒 Vous êtes Client - Vous pouvez vendre occasionnellement:</p>
              <p className="mt-1">Payez <b>3$ / {toCDF(3)} pour 5 jours</b> avant chaque lancement. 1 annonce = 1 paiement.</p>
              <Link href="/publier?type=occasionnel" className="block bg-black text-white p-3 rounded-full text-center font-bold mt-2">Publier Occasionnellement - Payer 3$ / 6 900 CDF</Link>
            </div>
            <Link href="/inscription?type=freemium" className="block border p-3 rounded-xl text-center text-sm font-bold">⬆️ Devenir Vendeur Freemium Gratuit (3 annonces)</Link>
            <Link href="/tarifs" className="block bg-[#6C3CE0] text-white p-3 rounded-xl text-center text-sm font-bold">Voir Pro 5$ (mécanicien, coiffeur, électricien...) & Grossiste 25$ (agriculteurs, entreprises)</Link>
          </>
        )}

        {/* FREEMIUM */}
        {isFreemium && (
          <>
            {restant>0 ? (
              <Link href="/publier" className="block bg-black text-white p-3 rounded-xl text-center text-sm font-bold">+ Publier Annonce ({restant} restantes à vie)</Link>
            ) : (
              <div className="bg-red-50 p-3 rounded-xl text-center">
                <p className="text-[11px] font-bold text-red-600">Limite Freemium atteinte: 3 annonces à vie</p>
                <Link href="/tarifs" className="block bg-red-600 text-white p-3 rounded-full mt-2 font-bold">Passer Pro 5$ / 11 500 CDF - Illimité</Link>
              </div>
            )}
            <Link href="/tarifs" className="block bg-[#6C3CE0] text-white p-3 rounded-xl text-center text-sm font-bold">Passer Pro 5$ / {toCDF(5)} ou Grossiste 25$ / {toCDF(25)}</Link>
          </>
        )}

        {/* PRO ET GROSSISTE */}
        {(isPro || isGrossiste) && (
          <>
            <Link href="/publier" className="block bg-black text-white p-3 rounded-xl text-center text-sm font-bold">+ Publier Annonce Illimitée</Link>
            <Link href="/boutiques" className="block border p-3 rounded-xl text-center text-sm font-bold">🏪 Ma Boutique {isGrossiste ? "B2B Grande Échelle" : "Pro Services"}</Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/publier?boost=image" className="bg-white border p-3 rounded-xl text-center text-[11px] font-bold">📸 Boost Image<br/>2$ / {toCDF(2)} - 5j</Link>
              <Link href="/publier?boost=video" className="bg-white border p-3 rounded-xl text-center text-[11px] font-bold">🎬 Video Pub<br/>1$ à 15$</Link>
            </div>
            {isPro && <Link href="/inscription?type=grossiste" className="block bg-orange-500 text-white p-3 rounded-xl text-center text-sm font-bold">⬆️ Passer Grossiste 25$ / {toCDF(25)} (agriculteurs, dépôt, entreprises)</Link>}
            <div className="bg-green-50 p-2 rounded-xl text-[10px] text-center">✅ Abonnement actif - Expire dans 30 jours. Non-paiement = retour auto Freemium. Paiement = réactivation immédiate.</div>
          </>
        )}

        <Link href="/tarifs" className="block bg-gray-100 p-3 rounded-xl text-center text-sm">💱 Tarifs $ / CDF + Règles</Link>
        <Link href="/conditions" className="block bg-gray-50 p-3 rounded-xl text-center text-[11px]">📄 Conditions & Confidentialité</Link>
        <button onClick={logout} className="w-full bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold mt-4">Déconnexion</button>
      </div>

      <p className="text-[10px] text-center text-gray-400 mt-8">WENZE WENZE BUSINESS - Paiement $ ou CDF - 0% commission - Mode Freemium = secours auto</p>
    </div>
  )
  }
