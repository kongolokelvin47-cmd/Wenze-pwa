import Link from "next/link";
import { TAUX_CDF } from "@/lib/paiement";
import { CATEGORIES_WENZE } from "@/lib/categories";

export default function Confidentialite() {
  const now = new Date().toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" });

  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-5 bg-[#FFFBF0] pb-24">
      <Link href="/" className="text-[#6C3CE0] font-bold text-xs">← Accueil</Link>
      
      <div className="mt-4 bg-black text-white rounded-2xl p-4">
        <h1 className="text-xl font-black">Politique de Confidentialité</h1>
        <p className="text-[11px] opacity-70 mt-1">WENZE 2.0 • WENZE BUSINESS - Kinshasa RDC • Mise à jour: {now}</p>
        <p className="text-[10px] mt-2 bg-white/20 inline-block px-2 py-1 rounded-full">🛍️ 5$ • 🏭 10$ • Taux fixe {TAUX_CDF} CDF • 0% commission</p>
      </div>

      <div className="mt-5 space-y-5 text-[12px] leading-relaxed">
        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[13px]">1. DONNÉES QUE NOUS COLLECTONS - WENZE 2.0</h2>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-gray-700">
            <li><b>Compte Client 0$:</b> Nom complet, WhatsApp (+243), photo profil (compressée 400px, ~40Ko max), mot de passe crypté (localStorage).</li>
            <li><b>Compte Boutique WENZE 2.0:</b> + Nom établissement, <b>2 catégories seulement:</b> {CATEGORIES_WENZE.map(c=> `${c.icon} ${c.titre} ${c.prixUSD}$/${c.prixCDF.toLocaleString()} CDF`).join(" - ")}, activité précise (ex: électricité, maçon, coiffure = inclus dans 🛍️ 5$), ville/commune Kinshasa, position GPS (lat/lng) seulement si vous activez la carte.</li>
            <li><b>Annonces:</b> Titre, description, prix en USD + conversion CDF taux {TAUX_CDF}, photo produit, catégorieId (commerces-services ou gros-autres), activiteId.</li>
            <li><b>Utilisation:</b> Produits consultés, recherches tapées (ex: "gros"), vidéos vues, pour améliorer le fil d'actualité.</li>
            <li><b>Technique:</b> Modèle téléphone, version PWA, localStorage keys: wenze_user, wenze_all_users, wenze_annonces_list. Pas de serveur externe pour l'instant - 100% local + WhatsApp direct.</li>
          </ul>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[13px]">2. POURQUOI - 2 CATÉGORIES 5$ / 10$</h2>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-gray-700">
            <li><b>Création boutique:</b> Vérifier que vous êtes humain + WhatsApp valide.</li>
            <li><b>Prix 2 catégories:</b> 🛍️ Commerces et Services = petites activités (détail, service, électricité, maçon, soudeur, plombier, coiffure etc) = <b>5$ / 11 500 CDF / mois</b>. 🏭 Gros et autres = grossiste, import, production = <b>10$ / 23 000 CDF / mois</b>. Taux fixe {TAUX_CDF} CDF. 0% commission sur ventes.</li>
            <li><b>Carte Kin:</b> Si GPS activé, montrer votre boutique dans /boutiques et /categorie avec MapKin OpenStreetMap.</li>
            <li><b>Pas de revente:</b> Vos numéros WhatsApp ne sont jamais vendus. Contact direct client → boutique via wa.me.</li>
          </ul>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[13px]">3. STOCKAGE - 100% LOCAL RDC</h2>
          <p className="mt-2 text-gray-700">
            Actuellement WENZE PWA stocke en <b>localStorage navigateur</b> (wenze_user, wenze_all_users, wenze_annonces_list). Pas de base de données cloud tant que le paiement Airtel/Mpesa/Orange n'est pas connecté. 
            Vos photos sont compressées côté client. Quand paiement 5$/10$ activé, données migreront vers serveur sécurisé RDC avec cryptage.
          </p>
          <p className="mt-2 text-[11px] text-gray-500">Vidéos courtes: stockage local temporaire, max 30 sec, 10Mo.</p>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[13px]">4. VOS DROITS - SUPPRESSION</h2>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-gray-700">
            <li>Supprimer votre compte: Profil → Supprimer → efface wenze_user + vos annonces de wenze_annonces_list.</li>
            <li>Demande export: WhatsApp support +243... - on vous envoie JSON de vos données.</li>
            <li>GPS: désactivable à tout moment - votre boutique reste visible sans carte.</li>
          </ul>
        </section>

        <section className="bg-[#6C3CE0] text-white rounded-2xl p-4">
          <h2 className="font-black text-[13px]">5. CONTACT - WENZE 2.0</h2>
          <p className="mt-2 text-[12px]">Support Kinshasa: WhatsApp Business (à venir)</p>
          <p className="text-[11px] opacity-80 mt-1">WENZE BUSINESS - 2 catégories: 🛍️ 5$ / 11 500 CDF - 🏭 10$ / 23 000 CDF - Taux fixe {TAUX_CDF} CDF - 0% commission - Électricité, maçon, coiffure = 5$ même régime.</p>
          <Link href="/cgu" className="mt-3 inline-block bg-white text-black text-[11px] font-bold px-4 py-2 rounded-full">Voir CGU</Link>
        </section>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href="/" className="flex-1 bg-black text-white text-center p-3 rounded-xl font-bold text-[12px]">← Accueil</Link>
        <Link href="/categories" className="flex-1 bg-white border text-center p-3 rounded-xl font-bold text-[12px]">🛍️ 5$ • 🏭 10$</Link>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
