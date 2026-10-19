import Link from "next/link";

export default function Tarifs() {
  const TAUX = 2300;
  const toCDF = (usd: number) => `${(usd * TAUX).toLocaleString()} CDF`;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-4 pb-20">
      <Link href="/" className="text-xs">← Accueil</Link>
      <h1 className="text-[22px] font-black mt-2 leading-tight">WENZE WENZE BUSINESS<br/>Formules & Publicités</h1>
      <p className="text-[11px] text-gray-500 mt-1">Taux BCC 09/10/2026: 2 265,67 CDF officiel / 2 327,89 parallèle. Affichage arrondi à 2 300 CDF. Paiement en $ ou CDF.</p>

      <div className="bg-green-50 border border-green-200 p-2 rounded-xl mt-3 text-[11px] font-bold text-center">
        💱 0% commission sur ventes - Prix $ + CDF - Pas de renouvellement auto
      </div>

      {/* A - CLIENT */}
      <div className="border-2 rounded-2xl p-4 mt-5">
        <div className="flex justify-between">
          <h2 className="font-black text-sm">A. Client / Acheteur</h2>
          <span className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-bold">0 $ / 0 CDF</span>
        </div>
        <p className="text-[10px] text-gray-500">Gratuit à vie</p>
        <div className="text-[11px] mt-3 bg-gray-50 p-3 rounded-xl space-y-1">
          <p>✓ Recherche produits/services, consultation annonces et profils</p>
          <p>✓ Contact vendeurs + Messagerie intégrée</p>
          <p className="font-bold text-[#6C3CE0]">✓ Peut vendre occasionnellement moyennant paiement avant lancement (Boost)</p>
        </div>
        <div className="mt-3 border-2 border-dashed rounded-xl p-3 bg-yellow-50">
          <p className="font-bold text-[11px]">Publication Occasionnelle pour Client:</p>
          <p className="text-[11px]">1 annonce / 1 produit / 5 jours - <b>3 $ / {toCDF(3)}</b> - 1 seul paiement = 1 mise en ligne</p>
          <Link href="/publier?type=occasionnel" className="block bg-black text-white text-center text-[11px] p-2 rounded-full mt-2">Publier occasionnellement - Payer avant lancement</Link>
        </div>
        <p className="text-[10px] mt-2 text-red-500">Limites: Pas de publication vendeur illimitée. Pas de pub incluse. Pas d'outils Pro.</p>
      </div>

      {/* B - FREEMIUM */}
      <div className="border rounded-2xl p-4 mt-4 bg-gray-50">
        <div className="flex justify-between">
          <h2 className="font-black text-sm">B. Vendeur Freemium</h2>
          <span className="bg-gray-800 text-white text-[10px] px-3 py-1 rounded-full font-bold">0 $ / 0 CDF - À vie</span>
        </div>
        <div className="text-[11px] mt-3 space-y-1">
          <p>✓ Création profil professionnel</p>
          <p>✓ <b>3 annonces gratuites à vie maximum</b>, pas 3/mois. Après suppression, quota NON rendu.</p>
          <p>✓ Présentation produits/services + Réception demandes</p>
        </div>
        <p className="text-[10px] mt-2 text-gray-500">Mode de secours automatique si abonnement Pro/Grossiste non payé.</p>
        <Link href="/inscription?type=freemium" className="block bg-gray-800 text-white text-center text-xs font-bold p-3 rounded-full mt-3">Commencer Freemium - 3 annonces gratuites</Link>
      </div>

      {/* C - VENDEUR PRO / PETITS SERVICES */}
      <div className="border-2 border-purple-200 rounded-2xl p-4 mt-4 bg-purple-50">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-black text-sm">C. Vendeur Pro / Services</h2>
            <p className="text-[10px] text-gray-600">Même tarif pour tous petits services</p>
          </div>
          <span className="bg-[#6C3CE0] text-white text-[10px] px-3 py-1 rounded-full font-bold whitespace-nowrap">5 $ / {toCDF(5)} / mois</span>
        </div>

        <div className="grid grid-cols-2 gap-1 mt-3 text-[10px]">
          <span className="bg-white p-1.5 rounded border">🛍️ Vendeur boutique</span>
          <span className="bg-white p-1.5 rounded border">🔧 Mécanicien</span>
          <span className="bg-white p-1.5 rounded border">💇 Salon coiffure</span>
          <span className="bg-white p-1.5 rounded border">⚡ Électricien</span>
          <span className="bg-white p-1.5 rounded border">🚿 Plombier</span>
          <span className="bg-white p-1.5 rounded border">🧵 Autres services</span>
        </div>

        <div className="text-[11px] mt-3 space-y-1">
          <p>✓ Annonces illimitées + Profil Pro + Messagerie + Outils gestion clientèle + Stats de base</p>
          <p>✓ <b>Dès paiement, avantages Pro actifs immédiatement</b></p>
        </div>

        <div className="bg-white border border-red-200 p-2 rounded-xl mt-3 text-[10px]">
          <p className="font-bold text-red-600">⚠️ Règle de non-paiement:</p>
          <p>Si abonnement expire et non renouvelé, le compte repasse automatiquement en mode Freemium (3 annonces max à vie). Les annonces au-delà de 3 sont masquées jusqu'au repaiement. Pas de suppression, mais suspension Pro.</p>
        </div>

        <Link href="/inscription?type=pro" className="block bg-[#6C3CE0] text-white text-center text-xs font-bold p-3 rounded-full mt-3">Devenir Pro - 5$ / 11 500 CDF / mois</Link>
      </div>

      {/* D - GROSSISTE / GRANDE ECHELLE */}
      <div className="border-2 border-orange-200 rounded-2xl p-4 mt-4 bg-orange-50">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-black text-sm">D. Grossiste / Grande Échelle</h2>
            <p className="text-[10px] text-gray-600">Même tarif activités grande échelle</p>
          </div>
          <span className="bg-orange-500 text-white text-[10px] px-3 py-1 rounded-full font-bold whitespace-nowrap">25 $ / {toCDF(25)} / mois</span>
        </div>

        <div className="grid grid-cols-2 gap-1 mt-3 text-[10px]">
          <span className="bg-white p-1.5 rounded border">🏭 Grossiste / Dépôt</span>
          <span className="bg-white p-1.5 rounded border">🌾 Agriculteurs</span>
          <span className="bg-white p-1.5 rounded border">🏢 Entreprises</span>
          <span className="bg-white p-1.5 rounded border">📦 Grande échelle</span>
        </div>

        <div className="text-[11px] mt-3 space-y-1">
          <p>✓ Tout Pro + Devis B2B + Sous-comptes employés (plafonnés par règle plateforme) + Fonctions B2B avancées</p>
          <p>✓ <b>Dès paiement, avantages B2B actifs immédiatement</b></p>
        </div>

        <div className="bg-white border border-red-200 p-2 rounded-xl mt-3 text-[10px]">
          <p className="font-bold text-red-600">⚠️ Règle de non-paiement:</p>
          <p>Même règle: retour auto en Freemium si non payé. Certification B2B suspendue. Sous-comptes désactivés jusqu'au repaiement.</p>
        </div>

        <Link href="/inscription?type=grossiste" className="block bg-orange-500 text-white text-center text-xs font-bold p-3 rounded-full mt-3">Devenir Grossiste - 25$ / 57 500 CDF / mois</Link>
      </div>

      {/* PUBLICITE */}
      <h2 className="font-black mt-8 text-sm">2. PUBLICITÉ PAR IMAGE - BOOST</h2>
      <div className="border rounded-xl p-3 mt-2 flex justify-between gap-2">
        <div className="flex-1 text-[11px]"><b>Boost Image</b> - 2 $ / {toCDF(2)} - 5 jours<br/>1 image pub + 1 annonce promue + 1 emplacement carrousel. Pas de garantie clics/ventes.</div>
        <Link href="/publier?boost=image" className="bg-black text-white text-[10px] px-3 py-2 rounded-full h-fit">Acheter</Link>
      </div>

      <h2 className="font-black mt-6 text-sm">3. PUBLICITÉ VIDÉO</h2>
      <div className="space-y-2 mt-2">
        <div className="border rounded-xl p-3 flex justify-between text-[11px]"><div><b>Video Express</b> - 1 $ / {toCDF(1)} - 2 jours<br/>1 vidéo max 60s (conseillé 30s) - 1 produit</div><b className="whitespace-nowrap ml-2">1 $</b></div>
        <div className="border rounded-xl p-3 flex justify-between text-[11px]"><div><b>Video Standard</b> - 3 $ / {toCDF(3)} - 6 jours<br/>1 vidéo max 60s - 1 produit</div><b className="whitespace-nowrap ml-2">3 $</b></div>
        <div className="border rounded-xl p-3 flex justify-between text-[11px]"><div><b>Video Mensuelle</b> - 15 $ / {toCDF(15)} - 30 jours<br/>1 vidéo max 60s - 1 produit - Pas de renouvellement auto</div><b className="whitespace-nowrap ml-2">15 $</b></div>
      </div>

      <div className="mt-8 bg-gray-900 text-white p-4 rounded-2xl text-[11px]">
        <p className="font-bold">7. RÈGLES GÉNÉRALES (ton modèle):</p>
        <p className="mt-2">1. Durées depuis activation. Pas de renouvellement auto.</p>
        <p>2. Non-paiement Pro/Grossiste → retour auto Freemium. Paiement → avantages immédiats.</p>
        <p>3. Client peut vendre occasionnellement uniquement après paiement Boost/Publication Occasionnelle avant lancement.</p>
        <p>4. Validation avant diffusion. Fichiers non conformes refusés.</p>
        <p>5. Aucune garantie vues/clics/ventes. 0% commission.</p>
        <p>6. Paiement $ ou CDF via Mobile Money.</p>
      </div>

      <p className="text-[10px] text-center text-gray-400 mt-4">Prix indicatifs CDF arrondis. Taux exact au paiement selon BCC.</p>
    </div>
  )
}
