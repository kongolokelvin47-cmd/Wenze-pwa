"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE } from "@/lib/categories";
import { TAUX_CDF, FORMULES, verifierAbonnement } from "@/lib/paiement";

export default function Tarifs() {
  const toCDF = (usd: number) => `${(usd * TAUX_CDF).toLocaleString()} CDF`;
  const [abonnement, setAbonnement] = useState<any>(null);

  useEffect(() => { try { setAbonnement(verifierAbonnement()); } catch {} }, []);

  const isCommerces = abonnement?.actif && (abonnement?.categorie==="commerces-services" || abonnement?.type==="commerces_services" || abonnement?.type==="pro");
  const isGros = abonnement?.actif && (abonnement?.categorie==="gros-autres" || abonnement?.type==="gros_autres" || abonnement?.type==="grossiste");

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-4 pb-24">
      <Link href="/" className="text-xs font-bold text-[#6C3CE0]">← Accueil</Link>
      <h1 className="text-[22px] font-black mt-2 leading-tight">WENZE BUSINESS<br/>Tarifs 2.0</h1>
      <p className="text-[11px] text-gray-500 mt-1">Taux fixe {TAUX_CDF.toLocaleString()} CDF / $ • 0% commission • {CATEGORIES_WENZE.length} catégories • Boutique garantie</p>

      <div className="bg-black text-white rounded-xl p-3 mt-3 flex justify-between items-center">
        <div><p className="font-black text-[12px]">🛍️ Petites activités 5$ • 🏭 Gros & autres 10$</p><p className="text-[10px] opacity-70">Électricité, maçon, coiffure etc = 5$ - Gros/production = 10$</p></div>
        <span className="bg-white text-black text-[10px] px-2 py-1 rounded-full font-black">Taux {TAUX_CDF}</span>
      </div>

      {abonnement?.actif && (
        <div className="bg-green-50 border-2 border-green-400 rounded-xl p-3 mt-3">
          <p className="text-[11px] font-black text-green-700">✅ {abonnement.label} actif - {abonnement.expireDans}j - {abonnement.categorie}</p>
          <p className="text-[10px] text-green-600 mt-1">{abonnement.prixUSD}$ / {(abonnement.prixUSD*TAUX_CDF).toLocaleString()} CDF • Taux {TAUX_CDF}</p>
        </div>
      )}

      {/* A - CLIENT */}
      <div className="border-2 rounded-2xl p-4 mt-5 bg-white">
        <div className="flex justify-between items-center">
          <h2 className="font-black text-sm">A. Client / Acheteur</h2>
          <span className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-bold">0 $ / 0 CDF</span>
        </div>
        <p className="text-[10px] text-gray-500">Gratuit à vie</p>
        <div className="text-[11px] mt-3 bg-gray-50 p-3 rounded-xl space-y-1">
          <p>✓ Recherche produits, boutiques</p>
          <p>✓ Contact WhatsApp</p>
          <p className="font-bold">✓ Vente occasionnelle après paiement Boost</p>
        </div>
      </div>

      {/* B - FREEMIUM */}
      <div className="border-2 rounded-2xl p-4 mt-4 bg-white">
        <div className="flex justify-between items-center">
          <h2 className="font-black text-sm">B. Freemium - 3 gratuites</h2>
          <span className="bg-gray-800 text-white text-[10px] px-3 py-1 rounded-full font-bold">0 $ / 0 CDF - À vie</span>
        </div>
        <div className="text-[11px] mt-3 space-y-1">
          <p>✓ 2 catégories: 🛍️ Commerces/Services et 🏭 Gros/Autres</p>
          <p>✓ <b>3 annonces gratuites à vie</b></p>
          <p>✓ Boutique visible /boutiques</p>
        </div>
        <Link href="/inscription?type=freemium" className="block bg-gray-800 text-white text-center text-xs font-bold p-3 rounded-full mt-3">Commencer Freemium - Taux {TAUX_CDF}</Link>
      </div>

      {/* C - COMMERCES ET SERVICES 5$ */}
      <div className={`border-2 rounded-2xl p-4 mt-4 ${isCommerces ? 'border-green-400 bg-green-50' : 'border-[#6C3CE0] bg-purple-50'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-black text-[14px]">C. Commerces et Services {isCommerces && '✅ ACTIF'}</h2>
            <p className="text-[10px] text-gray-600">Toutes petites activités - même régime 5$</p>
          </div>
          <span className="bg-[#6C3CE0] text-white text-[10px] px-3 py-1 rounded-full font-black whitespace-nowrap">5 $ / {toCDF(5)} / mois</span>
        </div>
        <div className="grid grid-cols-2 gap-1 mt-3 text-[10px]">
          {["🛒 Détail","🛍️ Services","💇 Coiffure","⚡ Électricité / Maçon / Soudeur / Plombier","🍲 Restauration","🧹 Services divers","🎤 Événementiel","🔧 Réparation"].map(x=> <span key={x} className="bg-white p-1.5 rounded border font-bold">{x}</span>)}
        </div>
        <div className="text-[11px] mt-3 space-y-1">
          <p>✓ Illimité + Boutique Pro + Boost inclus</p>
          <p>✓ <b>Électricité, maçon, soudeur, coiffure etc = même prix 5$</b></p>
        </div>
        {isCommerces ? (
          <Link href="/abonnement" className="block bg-green-600 text-white text-center text-xs font-bold p-3 rounded-full mt-3">✅ Actif 5$ - Gérer</Link>
        ) : (
          <Link href="/abonnement" className="block bg-[#6C3CE0] text-white text-center text-xs font-bold p-3 rounded-full mt-3">Devenir 🛍️ 5$ / 11 500 CDF</Link>
        )}
      </div>

      {/* D - GROS ET AUTRES 10$ - CORRIGÉ 25$ → 10$ */}
      <div className={`border-2 rounded-2xl p-4 mt-4 ${isGros ? 'border-green-400 bg-green-50' : 'border-black bg-white'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-black text-[14px]">D. Gros et autres {isGros && '✅ ACTIF'}</h2>
            <p className="text-[10px] text-gray-600">Volume, production, import - 10$</p>
          </div>
          <span className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-black whitespace-nowrap">10 $ / {toCDF(10)} / mois</span>
        </div>
        <div className="grid grid-cols-2 gap-1 mt-3 text-[10px]">
          {["🏭 Grossiste","📦 Semi-gros","🏢 Import","🌾 Production / Usine","🚛 B2B","📋 Autres"].map(x=> <span key={x} className="bg-gray-50 p-1.5 rounded border font-bold">{x}</span>)}
        </div>
        <div className="text-[11px] mt-3 space-y-1">
          <p>✓ Illimité gros volume + Badge 🏭</p>
        </div>
        {isGros ? (
          <Link href="/abonnement" className="block bg-green-600 text-white text-center text-xs font-bold p-3 rounded-full mt-3">✅ Actif 10$ - Gérer</Link>
        ) : (
          <Link href="/abonnement" className="block bg-black text-white text-center text-xs font-bold p-3 rounded-full mt-3">Devenir 🏭 10$ / 23 000 CDF</Link>
        )}
      </div>

      <h2 className="font-black mt-8 text-sm">Boost & Vidéo - Taux {TAUX_CDF}</h2>
      <div className="border rounded-xl p-3 mt-2 flex justify-between gap-2 bg-white">
        <div className="flex-1 text-[11px]"><b>Boost Image</b> - 2 $ / {toCDF(2)} - 5 jours</div>
        <Link href="/publier?boost=image" className="bg-black text-white text-[10px] px-3 py-2 rounded-full h-fit font-bold">Acheter</Link>
      </div>
      <div className="space-y-2 mt-2">
        <div className="border rounded-xl p-3 flex justify-between text-[11px] bg-white"><div><b>Video Express</b> - 1 $ / {toCDF(1)} - 2 jours</div><b>1 $</b></div>
        <div className="border rounded-xl p-3 flex justify-between text-[11px] bg-white"><div><b>Video Standard</b> - 3 $ / {toCDF(3)} - 6 jours</div><b>3 $</b></div>
        <div className="border rounded-xl p-3 flex justify-between text-[11px] bg-white"><div><b>Video Mensuelle</b> - 15 $ / {toCDF(15)} - 30 jours</div><b>15 $</b></div>
      </div>

      <div className="mt-8 bg-gray-900 text-white p-4 rounded-2xl text-[11px]">
        <p className="font-bold">Règles WENZE 2.0 - Taux {TAUX_CDF} fixe:</p>
        <p className="mt-2">1. 🛍️ Commerces/Services 5$ / 11 500 CDF et 🏭 Gros/Autres 10$ / 23 000 CDF - 30 jours.</p>
        <p>2. Électricité, maçon, soudeur, plombier, coiffure = petites activités = 5$ même régime.</p>
        <p>3. 0% commission - Boutique visible /boutiques.</p>
      </div>

      <p className="text-[10px] text-center text-gray-400 mt-4">WENZE 2.0 • 🛍️ 5$ = {FORMULES.commerces_services.prixCDF.toLocaleString()} CDF • 🏭 10$ = {FORMULES.gros_autres.prixCDF.toLocaleString()} CDF • Taux {TAUX_CDF}</p>
    </div>
  )
}
export const dynamic = 'force-dynamic';
