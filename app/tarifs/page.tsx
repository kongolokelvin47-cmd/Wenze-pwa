import Link from "next/link";
import { CATEGORIES_WENZE } from "@/lib/categories";
import { TAUX_CDF, FORMULES, verifierAbonnement } from "@/lib/paiement";

// Client component pour abonnement temps réel
import TarifsClient from "./TarifsClient";

export default function Tarifs() {
  const toCDF = (usd: number) => `${(usd * TAUX_CDF).toLocaleString()} CDF`;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-4 pb-24">
      <Link href="/" className="text-xs">← Accueil</Link>
      <h1 className="text-[22px] font-black mt-2 leading-tight">WENZE WENZE BUSINESS<br/>Formules & Publicités</h1>
      <p className="text-[11px] text-gray-500 mt-1">Taux fixe WENZE: {TAUX_CDF.toLocaleString()} CDF / $ • Paiement $ ou CDF • 0% commission • {CATEGORIES_WENZE.length} métiers</p>

      <div className="bg-green-50 border border-green-200 p-2 rounded-xl mt-3 text-[11px] font-bold text-center">
        💱 0% commission sur ventes - Prix $ + CDF - Pas de renouvellement auto - Taux {TAUX_CDF} CDF fixe
      </div>

      {/* BANDEAU REGIME PRESTATAIRE UNIQUE - CRITIQUE */}
      <div className="bg-[#6C3CE0] text-white rounded-2xl p-3 mt-3">
        <p className="font-black text-[12px]">🔧 RÉGIME PRESTATAIRE UNIQUE - TEMPS PRÉSENT</p>
        <p className="text-[10px] mt-1 leading-snug opacity-90">
          <b>Soudeur + Tout travaux techniques = même régime que tous les prestataires</b> - Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF - {CATEGORIES_WENZE.length} métiers même régime.<br/>
          Pas de régime spécial - un seul régime prestataire unique 5$ / 11500 CDF.
        </p>
        <div className="flex gap-1 mt-2 flex-wrap">
          {CATEGORIES_WENZE.slice(0,6).map(c => (
            <span key={c.id} className="text-[8px] bg-white/20 px-2 py-0.5 rounded-full font-bold">{c.icon} {c.titreCourt}</span>
          ))}
        </div>
      </div>

      <TarifsClient />

      {/* A - CLIENT */}
      <div className="border-2 rounded-2xl p-4 mt-5">
        <div className="flex justify-between">
          <h2 className="font-black text-sm">A. Client / Acheteur</h2>
          <span className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-bold">0 $ / 0 CDF</span>
        </div>
        <p className="text-[10px] text-gray-500">Gratuit à vie - Taux {TAUX_CDF} CDF</p>
        <div className="text-[11px] mt-3 bg-gray-50 p-3 rounded-xl space-y-1">
          <p>✓ Recherche produits/services, consultation annonces et profils</p>
          <p>✓ Contact vendeurs + Messagerie intégrée</p>
          <p className="font-bold text-[#6C3CE0]">✓ Peut vendre occasionnellement moyennant paiement avant lancement (Boost)</p>
          <p>✓ Boutique fonctionnelle visible /boutiques après 1 annonce</p>
        </div>
        <div className="mt-3 border-2 border-dashed rounded-xl p-3 bg-yellow-50">
          <p className="font-bold text-[11px]">Publication Occasionnelle pour Client - Régime prestataire:</p>
          <p className="text-[11px]">1 annonce / 1 produit / 5 jours - <b>3 $ / {toCDF(3)}</b> - 1 seul paiement = 1 mise en ligne - Taux {TAUX_CDF}</p>
          <Link href="/publier?type=occasionnel" className="block bg-black text-white text-center text-[11px] p-2 rounded-full mt-2">Publier occasionnellement - Payer avant lancement</Link>
        </div>
        <p className="text-[10px] mt-2 text-red-500">Limites: Pas de publication vendeur illimitée. Pas de pub incluse. Pas d'outils Pro.</p>
      </div>

      {/* B - FREEMIUM */}
      <div className="border rounded-2xl p-4 mt-4 bg-gray-50">
        <div className="flex justify-between">
          <h2 className="font-black text-sm">B. Vendeur Freemium - Régime prestataire</h2>
          <span className="bg-gray-800 text-white text-[10px] px-3 py-1 rounded-full font-bold">0 $ / 0 CDF - À vie - Taux {TAUX_CDF}</span>
        </div>
        <div className="text-[11px] mt-3 space-y-1">
          <p>✓ Création profil professionnel - {CATEGORIES_WENZE.length} métiers disponibles</p>
          <p>✓ <b>3 annonces gratuites à vie maximum</b>, pas 3/mois. Après suppression, quota NON rendu.</p>
          <p>✓ Présentation produits/services + Réception demandes</p>
          <p>✓ <b>🔧 Soudeur + Tout travaux techniques inclus - même régime freemium 3 gratuites</b></p>
          <p>✓ Boutique fonctionnelle visible dans /boutiques</p>
        </div>
        <p className="text-[10px] mt-2 text-gray-500">Mode de secours automatique si abonnement Pro/Grossiste non payé - Taux {TAUX_CDF} CDF fixe.</p>
        <Link href="/inscription?type=freemium" className="block bg-gray-800 text-white text-center text-xs font-bold p-3 rounded-full mt-3">Commencer Freemium - 3 annonces gratuites - Taux {TAUX_CDF}</Link>
      </div>

      {/* C - VENDEUR PRO / PETITS SERVICES - REGIME PRESTATAIRE UNIQUE */}
      <div className="border-2 border-purple-200 rounded-2xl p-4 mt-4 bg-purple-50">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-black text-sm">C. Vendeur Pro / Services - Régime prestataire unique</h2>
            <p className="text-[10px] text-gray-600">Même tarif pour tous petits services - Soudeur + Tout travaux inclus</p>
          </div>
          <span className="bg-[#6C3CE0] text-white text-[10px] px-3 py-1 rounded-full font-bold whitespace-nowrap">5 $ / {toCDF(5)} / mois - Taux {TAUX_CDF}</span>
        </div>

        <div className="grid grid-cols-2 gap-1 mt-3 text-[10px]">
          <span className="bg-white p-1.5 rounded border">🛍️ Vendeur boutique - {CATEGORIES_WENZE.find(c=>c.id==="commerce")?.titreCourt}</span>
          <span className="bg-white p-1.5 rounded border font-bold text-[#6C3CE0]">🔧 Soudeur - Régime unique</span>
          <span className="bg-white p-1.5 rounded border font-bold text-[#6C3CE0]">🏗️ Tout travaux techniques - Même régime</span>
          <span className="bg-white p-1.5 rounded border">🔧 Mécanicien</span>
          <span className="bg-white p-1.5 rounded border">💇 Salon coiffure - {CATEGORIES_WENZE.find(c=>c.id==="beaute")?.titreCourt}</span>
          <span className="bg-white p-1.5 rounded border">⚡ Électricien</span>
          <span className="bg-white p-1.5 rounded border">🚿 Plombier</span>
          <span className="bg-white p-1.5 rounded border">🧵 Autres services - {CATEGORIES_WENZE.length} métiers</span>
        </div>

        <div className="text-[11px] mt-3 space-y-1">
          <p>✓ Annonces illimitées + Profil Pro + Messagerie + Outils gestion clientèle + Stats de base</p>
          <p>✓ <b>🔧 Soudeur + Tout travaux techniques = même régime Pro 5$ / {toCDF(5)} - Pas de régime spécial</b></p>
          <p>✓ Boutique Pro fonctionnelle visible /boutiques - {CATEGORIES_WENZE.length} métiers</p>
          <p>✓ <b>Dès paiement, avantages Pro actifs immédiatement - Taux {TAUX_CDF} CDF</b></p>
        </div>

        <div className="bg-white border border-red-200 p-2 rounded-xl mt-3 text-[10px]">
          <p className="font-bold text-red-600">⚠️ Règle de non-paiement:</p>
          <p>Si abonnement expire et non renouvelé, le compte repasse automatiquement en mode Freemium (3 annonces max à vie). Les annonces au-delà de 3 sont masquées jusqu'au repaiement. Pas de suppression, mais suspension Pro. Taux {TAUX_CDF} CDF fixe.</p>
        </div>

        <Link href="/inscription?type=pro" className="block bg-[#6C3CE0] text-white text-center text-xs font-bold p-3 rounded-full mt-3">Devenir Pro - 5$ / 11 500 CDF / mois - Régime prestataire unique - Taux {TAUX_CDF}</Link>
      </div>

      {/* D - GROSSISTE / GRANDE ECHELLE */}
      <div className="border-2 border-orange-200 rounded-2xl p-4 mt-4 bg-orange-50">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-black text-sm">D. Grossiste / Grande Échelle - Régime prestataire volume</h2>
            <p className="text-[10px] text-gray-600">Même tarif activités grande échelle - Soudeur + Tout travaux multi-équipes inclus</p>
          </div>
          <span className="bg-orange-500 text-white text-[10px] px-3 py-1 rounded-full font-bold whitespace-nowrap">25 $ / {toCDF(25)} / mois</span>
        </div>

        <div className="grid grid-cols-2 gap-1 mt-3 text-[10px]">
          <span className="bg-white p-1.5 rounded border">🏭 Grossiste / Dépôt</span>
          <span className="bg-white p-1.5 rounded border">🌾 Agriculteurs</span>
          <span className="bg-white p-1.5 rounded border">🏢 Entreprises</span>
          <span className="bg-white p-1.5 rounded border">📦 Grande échelle</span>
          <span className="bg-white p-1.5 rounded border font-bold text-[#6C3CE0]">🔧 Soudeur multi-équipes - Même régime</span>
          <span className="bg-white p-1.5 rounded border font-bold text-[#6C3CE0]">🏗️ Tout travaux multi-équipes - Même régime</span>
        </div>

        <div className="text-[11px] mt-3 space-y-1">
          <p>✓ Tout Pro + Devis B2B + Sous-comptes employés (plafonnés par règle plateforme) + Fonctions B2B avancées</p>
          <p>✓ Boutique Grossiste fonctionnelle - 5 boutiques multi-villes</p>
          <p>✓ <b>Dès paiement, avantages B2B actifs immédiatement - Taux {TAUX_CDF} CDF</b></p>
        </div>

        <div className="bg-white border border-red-200 p-2 rounded-xl mt-3 text-[10px]">
          <p className="font-bold text-red-600">⚠️ Règle de non-paiement:</p>
          <p>Même règle: retour auto en Freemium si non payé. Certification B2B suspendue. Sous-comptes désactivés jusqu'au repaiement. Taux {TAUX_CDF} CDF fixe.</p>
        </div>

        <Link href="/inscription?type=grossiste" className="block bg-orange-500 text-white text-center text-xs font-bold p-3 rounded-full mt-3">Devenir Grossiste - 25$ / 57 500 CDF / mois - Taux {TAUX_CDF}</Link>
      </div>

      {/* PUBLICITE */}
      <h2 className="font-black mt-8 text-sm">2. PUBLICITÉ PAR IMAGE - BOOST - Taux {TAUX_CDF} CDF</h2>
      <div className="border rounded-xl p-3 mt-2 flex justify-between gap-2">
        <div className="flex-1 text-[11px]"><b>Boost Image</b> - 2 $ / {toCDF(2)} - 5 jours<br/>1 image pub + 1 annonce promue + 1 emplacement carrousel. Pas de garantie clics/ventes. Taux {TAUX_CDF}</div>
        <Link href="/publier?boost=image" className="bg-black text-white text-[10px] px-3 py-2 rounded-full h-fit">Acheter - {toCDF(2)}</Link>
      </div>

      <h2 className="font-black mt-6 text-sm">3. PUBLICITÉ VIDÉO - Taux {TAUX_CDF} CDF</h2>
      <div className="space-y-2 mt-2">
        <div className="border rounded-xl p-3 flex justify-between text-[11px]"><div><b>Video Express</b> - 1 $ / {toCDF(1)} - 2 jours<br/>1 vidéo max 60s (conseillé 30s) - 1 produit - Régime prestataire</div><b className="whitespace-nowrap ml-2">1 $ / {toCDF(1)}</b></div>
        <div className="border rounded-xl p-3 flex justify-between text-[11px]"><div><b>Video Standard</b> - 3 $ / {toCDF(3)} - 6 jours<br/>1 vidéo max 60s - 1 produit - Régime prestataire</div><b className="whitespace-nowrap ml-2">3 $ / {toCDF(3)}</b></div>
        <div className="border rounded-xl p-3 flex justify-between text-[11px]"><div><b>Video Mensuelle</b> - 15 $ / {toCDF(15)} - 30 jours<br/>1 vidéo max 60s - 1 produit - Pas de renouvellement auto - Régime prestataire unique</div><b className="whitespace-nowrap ml-2">15 $ / {toCDF(15)}</b></div>
      </div>

      <div className="mt-8 bg-gray-900 text-white p-4 rounded-2xl text-[11px]">
        <p className="font-bold">7. RÈGLES GÉNÉRALES (modèle temps présent - Taux {TAUX_CDF} CDF):</p>
        <p className="mt-2">1. Durées depuis activation. Pas de renouvellement auto. Taux fixe {TAUX_CDF} CDF.</p>
        <p>2. Non-paiement Pro/Grossiste → retour auto Freemium. Paiement → avantages immédiats. Régime prestataire unique.</p>
        <p>3. Client peut vendre occasionnellement uniquement après paiement Boost/Publication Occasionnelle avant lancement. Soudeur + Tout travaux = même régime Pro 5$.</p>
        <p>4. Validation avant diffusion. Fichiers non conformes refusés.</p>
        <p>5. Aucune garantie vues/clics/ventes. 0% commission. Boutiques fonctionnelles.</p>
        <p>6. Paiement $ ou CDF via Mobile Money - Taux {TAUX_CDF} CDF fixe - {CATEGORIES_WENZE.length} métiers.</p>
        <p>7. <b>Régime prestataire unique: Soudeur + Tout travaux techniques = même régime que tous les prestataires - Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF.</b></p>
      </div>

      <p className="text-[10px] text-center text-gray-400 mt-4">Prix indicatifs CDF arrondis Taux {TAUX_CDF} CDF fixe. Pro {FORMULES.pro.prix}$ = {FORMULES.pro.prixCDF.toLocaleString()} CDF. Grossiste {FORMULES.grossiste.prix}$ = {FORMULES.grossiste.prixCDF.toLocaleString()} CDF. {CATEGORIES_WENZE.length} métiers - Soudeur + Tout travaux même régime prestataire unique - Boutiques fonctionnelles.</p>
    </div>
  )
}

export const dynamic = 'force-dynamic';
