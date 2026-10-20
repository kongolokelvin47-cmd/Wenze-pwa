"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { FORMULES, TAUX_CDF, verifierAbonnement } from "@/lib/paiement";

function ProfilContent() {
  const [user, setUser] = useState<any>(null);
  const [annoncesCount, setAnnoncesCount] = useState(0);

  useEffect(()=>{
    const saved = localStorage.getItem("wenze_user");
    const count = parseInt(localStorage.getItem("wenze_annonces") || "0");
    setAnnoncesCount(count);

    if(saved) {
      let u = JSON.parse(saved);

      // 1. DOWNGRADE AUTO SI NON-PAIEMENT
      const ab = verifierAbonnement();
      if(!ab.actif && (u.type==="pro" || u.type==="grossiste")){
        u.type = "freemium";
        u.abonnement = "Freemium - Retour auto suite non-paiement (3 annonces max à vie)";
        u.ancienType = u.type;
        localStorage.setItem("wenze_user", JSON.stringify(u));
        // alert seulement une fois
        if(!sessionStorage.getItem("downgrade_alert")) {
          alert("⚠️ Abonnement expiré. Vous êtes repassé en Freemium (3 annonces). Repayez pour réactiver immédiatement.");
          sessionStorage.setItem("downgrade_alert", "1");
        }
      }

      // 2. UPGRADE IMMEDIAT APRES PAIEMENT
      const paiementReussi = localStorage.getItem("paiement_reussi");
      const typePaye = localStorage.getItem("type_paye") as any;
      if(paiementReussi==="true" && typePaye){
        const key = String(typePaye).toLowerCase();
        if(key==="pro" || key==="grossiste") {
          u.type = key;
          u.estBoutique = true;
          u.annoncesLimite = 9999;
          u.abonnement = key==="pro" ? `Pro ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF} CDF / mois - Actif` : `Grossiste ${FORMULES.grossiste.prix}$ / ${FORMULES.grossiste.prixCDF} CDF / mois - Actif`;
        } else if(key==="occasionnel") {
          // Ne change pas le type client, ajoute crédit
        }
        localStorage.setItem("wenze_user", JSON.stringify(u));
        localStorage.removeItem("paiement_reussi");
        alert(`✅ Paiement reçu! Avantages ${typePaye} activés IMMÉDIATEMENT.`);
      }

      setUser(u);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("wenze_user");
    localStorage.removeItem("wenze_connecte");
    setUser(null);
    window.location.href = "/";
  };

  const immigrerVersPro = () => {
    if(!user) return;
    const nouveauUser = {
      ...user,
      type: "freemium",
      typeSouhaite: "pro",
      categorie: user.categorie && user.categorie !== "client_perso" ? user.categorie : "Vendeur boutique",
      profession: user.profession !== "Client / Acheteur" ? user.profession : "Vendeur boutique",
      abonnement: `Freemium - 3 annonces gratuites à vie - Immigré depuis Client`,
      annoncesLimite: 3,
      estBoutique: true,
      peutImmigrerPro: false,
      dateImmigration: new Date().toISOString()
    };
    localStorage.setItem("wenze_user", JSON.stringify(nouveauUser));
    setUser(nouveauUser);
    alert("🎉 Félicitations! Votre compte perso est devenu Boutique Freemium avec 3 annonces gratuites à vie. Vous pouvez maintenant publier!");
  };

  const toCDF = (usd:number) => `${(usd*TAUX_CDF).toLocaleString()} CDF`;

  if(!user){
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 flex flex-col justify-center">
        <h1 className="text-2xl font-black">👤 Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Inscription gratuite 0$ / 0 CDF - Taux 1$ = {TAUX_CDF} CDF</p>

        <div className="mt-8 space-y-3">
          <Link href="/inscription?type=client" className="block w-full bg-black text-white p-4 rounded-full font-bold text-center">
            Compte Client Perso - 0$ / 0 CDF - Pas de boutique
          </Link>
          <Link href="/inscription?type=pro" className="block w-full bg-gray-800 text-white p-4 rounded-full font-bold text-center">
            Boutique Freemium - 0$ / 0 CDF - 3 annonces à vie
          </Link>
          <Link href="/tarifs" className="block w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold text-center">
            Voir Tarifs Pro 5$ / 11500 CDF & Grossiste 25$ / 57500 CDF
          </Link>
        </div>

        <div className="mt-8 bg-yellow-50 p-4 rounded-xl text-[11px] border">
          <p className="font-bold">💡 Client perso peut vendre occasionnellement:</p>
          <p className="mt-1">Payez Publication Occasionnelle 3$ / {toCDF(3)} avant lancement - 1 annonce / 5 jours - 0% commission</p>
          <p className="mt-2 text-[10px] text-gray-500">Inscription gratuite pour tous. Client peut immigrer vers Pro en 1 clic dans Profil.</p>
        </div>
        
        <p className="text-center text-xs mt-6"><Link href="/connexion" className="text-[#6C3CE0] font-bold">Déjà un compte? Se connecter</Link></p>
      </div>
    )
  }

  // CALCULS AVEC estBoutique
  const isClientPerso = user.estBoutique === false || user.type === "client" || user.categorie === "client_perso";
  const isFreemium = user.type==="freemium" && user.estBoutique === true;
  const isPro = user.type==="pro";
  const isGrossiste = user.type==="grossiste";
  const limite = isClientPerso ? 0 : isFreemium ? 3 : 9999;
  const restant = limite === 9999 ? 9999 : limite - annoncesCount;
  const creditOccasionnel = parseInt(localStorage.getItem("wenze_occasionnel_credit") || "0");
  const ab = verifierAbonnement();

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 pb-20">
      <Link href="/" className="text-xs text-[#6C3CE0] font-bold">← Accueil</Link>
      <h1 className="text-xl font-black mt-3">👤 Mon Profil</h1>
      
      <div className="mt-4 bg-gradient-to-br from-purple-50 to-orange-50 p-4 rounded-2xl flex gap-4 items-center border">
        <img src={user.photo || "https://via.placeholder.com/80"} alt="profil" className="w-16 h-16 rounded-full object-cover border-2 border-white" />
        <div className="flex-1">
          <p className="font-bold text-sm">{user.nom}</p>
          <p className="text-xs text-gray-600">{user.whatsapp} • {isClientPerso ? "Client Perso" : user.categorie || user.profession}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${isPro ? "bg-[#6C3CE0] text-white" : isGrossiste ? "bg-orange-500 text-white" : isFreemium ? "bg-gray-800 text-white" : "bg-black text-white"}`}>
              {isClientPerso ? "CLIENT PERSO - PAS BOUTIQUE" : user.type?.toUpperCase()}
            </span>
            {user.estBoutique && <span className="text-[9px] px-2 py-1 rounded-full bg-green-100 text-green-700 font-bold">BOUTIQUE</span>}
          </div>
          <p className="text-[10px] mt-1 font-bold text-green-700">{user.abonnement}</p>
          {ab.actif && <p className="text-[9px] text-gray-500">Expire dans {ab.expireDans} jours</p>}
        </div>
      </div>

      {/* COMPTEUR */}
      <div className="mt-4 bg-black text-white p-3 rounded-xl flex justify-between items-center">
        <div>
          <p className="text-[11px]">{isClientPerso ? "Crédits occasionnels" : "Annonces publiées"}</p>
          <p className="font-black text-lg">
            {isClientPerso ? `${creditOccasionnel - annoncesCount > 0 ? creditOccasionnel - annoncesCount : 0} crédit(s)` : `${annoncesCount} / ${limite===9999 ? "ILLIMITÉ" : limite}`}
          </p>
        </div>
        <div className="text-right text-[10px]">
          {isFreemium && restant<=0 && <p className="text-red-400 font-bold">Limite atteinte!<br/>Passez Pro 5$</p>}
          {isFreemium && restant>0 && <p>{restant} restantes à vie</p>}
          {isClientPerso && <p>Client: Payez 3$<br/>par annonce</p>}
          {(isPro || isGrossiste) && <p>Illimité<br/>Actif ✅</p>}
        </div>
      </div>

      <div className="mt-5 space-y-2">

        {/* CLIENT PERSO - PAS BOUTIQUE */}
        {isClientPerso && (
          <>
            <div className="bg-blue-50 border p-3 rounded-xl">
              <p className="text-[11px] font-bold">👤 Compte Personnel - Pas de boutique</p>
              <p className="text-[10px] text-gray-600 mt-1">Vous êtes client. Vous achetez en illimité. Vous ne créez pas de boutique. Vos annonces n'apparaissent pas dans /boutiques.</p>
            </div>

            <div className="bg-yellow-50 border-2 border-dashed p-3 rounded-xl text-[11px]">
              <p className="font-bold">🛒 Vendre occasionnellement:</p>
              <p className="mt-1">Payez <b>3$ / {toCDF(3)} pour 5 jours</b> avant chaque lancement. 1 paiement = 1 annonce.</p>
              <Link href="/abonnement?type=occasionnel" className="block bg-black text-white p-3 rounded-full text-center font-bold mt-2">Publier Occasionnel - Payer 3$ / 6900 CDF</Link>
            </div>

            <div className="bg-purple-50 border p-3 rounded-xl">
              <p className="text-[11px] font-bold">⬆️ Immigrer vers Boutique Pro (Gratuit au début)</p>
              <p className="text-[10px] text-gray-600 mt-1">Transformez votre compte perso en boutique Freemium avec 3 annonces gratuites à vie. Même WhatsApp, même photo, vous gardez tout. Ensuite Pro 5$ / 11500 CDF = illimité.</p>
              <button onClick={immigrerVersPro} className="w-full bg-[#6C3CE0] text-white p-3 rounded-full font-bold mt-2 text-sm">Immigrer en 1 clic → Devenir Vendeur Freemium (3 gratuites)</button>
            </div>

            <Link href="/tarifs" className="block bg-gray-100 p-3 rounded-xl text-center text-sm font-bold">Voir Pro 5$ (mécanicien, coiffeur...) & Grossiste 25$</Link>
          </>
        )}

        {/* FREEMIUM - BOUTIQUE */}
        {isFreemium && (
          <>
            {restant>0 ? (
              <Link href="/publier" className="block bg-black text-white p-3 rounded-xl text-center text-sm font-bold">+ Publier Annonce ({restant} restantes à vie)</Link>
            ) : (
              <div className="bg-red-50 p-3 rounded-xl text-center border border-red-200">
                <p className="text-[11px] font-bold text-red-600">Limite Freemium atteinte: 3 annonces à vie</p>
                <Link href="/tarifs" className="block bg-red-600 text-white p-3 rounded-full mt-2 font-bold">Passer Pro 5$ / 11500 CDF - Illimité immédiat</Link>
              </div>
            )}
            <Link href="/tarifs" className="block bg-[#6C3CE0] text-white p-3 rounded-xl text-center text-sm font-bold">Passer Pro 5$ / {toCDF(5)} ou Grossiste 25$ / {toCDF(25)}</Link>
            <Link href="/boutiques" className="block border p-3 rounded-xl text-center text-sm font-bold">🏪 Voir Ma Boutique dans la liste</Link>
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
            {isPro && <Link href="/tarifs" className="block bg-orange-500 text-white p-3 rounded-xl text-center text-sm font-bold">⬆️ Passer Grossiste 25$ / {toCDF(25)}</Link>}
            <div className="bg-green-50 p-2 rounded-xl text-[10px] text-center">✅ Actif - Non-paiement = retour Freemium. Paiement = réactivation immédiate.</div>
          </>
        )}

        <Link href="/tarifs" className="block bg-gray-100 p-3 rounded-xl text-center text-sm mt-2">💱 Tarifs $ / CDF + Règles</Link>
        <button onClick={logout} className="w-full bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold mt-2">Déconnexion</button>
      </div>

      <p className="text-[10px] text-center text-gray-400 mt-8">WENZE - Inscription gratuite 0$ - Client perso = pas boutique - Boutique = Freemium 3 gratuites - 0% commission - Paiement $ ou CDF</p>
    </div>
  )
}

export default function ProfilPage() {
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto p-10 text-center">Chargement...</div>}>
      <ProfilContent />
    </Suspense>
  );
  }
