import Link from "next/link";
import { TAUX_CDF, toCDFString, PALIERS } from "@/lib/paiement";

export default function Confidentialite() {
  const now = new Date().toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" });

  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-5 bg-[#FFFBF0] pb-24">
      <Link href="/" className="text-[#6C3CE0] font-bold text-xs">← Accueil</Link>
      
      <div className="mt-4 bg-black text-white rounded-2xl p-4">
        <h1 className="text-xl font-black">Politique de Confidentialité</h1>
        <p className="text-[11px] opacity-70 mt-1">WENZE 2.0 V6.1 STRICT • TonMarché.cd - Kinshasa RDC • Mise à jour: {now}</p>
        <p className="text-[10px] mt-2 bg-white/20 inline-block px-2 py-1 rounded-full">V6 Même prix: ⭐ STANDARD 5$ ({toCDFString(5)}) • 🚀 PRO 10$ ({toCDFString(10)}) • 👑 PREMIUM 20$ ({toCDFString(20)}) • 🎟️ OCC 0.2$/j • Taux {TAUX_CDF} • 0% commission • Max 50 actives</p>
      </div>

      <div className="mt-5 space-y-5 text-[12px] leading-relaxed">
        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-sm">1. Données collectées V6</h2>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-[11px]">
            <li><b>ownerWhatsapp / whatsapp (obligatoire):</b> identifiant principal V6 - nettoyé via cleanWhatsapp() - utilisé pour isOwner(), suivi compte, filtre compte caché, max 50, suppression libère place</li>
            <li><b>wenze_user (localStorage):</b> id, ownerWhatsapp, whatsapp, email, role (client/vendeur/prestataire/grossiste/ambassadeur/superviseur/dg), badge, createdAt, palierId, palierExpireAt</li>
            <li><b>wenze_all_users:</b> liste locale des boutiques pour recherche rapide - max 500 entrées</li>
            <li><b>wenze_tickets (V6 MULTI-TICKETS STRICTS):</b> ticketId, ownerWhatsapp, palierId (STANDARD/PRO/PREMIUM/OCC), placesTotales (ex: 4 places strictes sur 7j, pas 4/j), placesUtilisees[], expireAt, isActif - Cumulable, renouvelable</li>
            <li><b>wenze_annonces_list:</b> annonces avec ownerWhatsapp, titre, prixUSD (prix produit, pas prix ticket), images (max 50 actives global), categorieId, activiteId, lat/lng, ticketId lié, createdAt</li>
            <li><b>wenze_freemium_used:</b> [wa] = {`{ count: 0-3 strictes à vie, createdAt }`} pour freemium 3 images à vie strictes 30j puis compte caché filtré</li>
            <li><b>Supabase profiles:</b> id, email, whatsapp, ownerWhatsapp, user_type/role, created_at, avatar - RLS activé</li>
          </ul>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-sm">2. Modèle V6 - Même prix pour tous</h2>
          <p className="mt-2 text-[11px]">V6.1 Suppression ancien modèle Détail 5$ / Gros 10$:</p>
          <div className="grid grid-cols-1 gap-2 mt-2 text-[11px]">
            <div className="bg-orange-50 p-2 rounded-xl"><b>⭐ STANDARD 5$ / {toCDFString(5)} - 30j</b>: 4 places strictes sur 7j (ou 1j 0.5$ = 1 place / 7j 2.5$ = 4 places) + 1 vidéo 15s - Même prix vendeur/prestataire/grossiste/client</div>
            <div className="bg-blue-50 p-2 rounded-xl"><b>🚀 PRO 10$ / {toCDFString(10)} - 30j</b>: 10 places strictes sur 30j (1j 1$ = 2 places / 7j 5$ = 10 places) + 1 vidéo 60s - Même prix pour tous</div>
            <div className="bg-purple-50 p-2 rounded-xl"><b>👑 PREMIUM 20$ / {toCDFString(20)} - 30j</b>: 30 places strictes sur 30j (1j 1.5$ = 3 places / 7j 10$ = 30 places) + 2 vidéos 60s - Ex-25$ grossiste supprimé, maintenant 20$ max pour tous</div>
            <div className="bg-green-50 p-2 rounded-xl"><b>🎟️ OCCASIONNEL 0.2$/j / {toCDFString(0.2)}</b>: 1 place stricte sur X jours cumulables (ex: 1$ = 5j) - Pour client occasionnel - Max 50 global</div>
            <div className="bg-gray-50 p-2 rounded-xl"><b>🆓 Freemium</b>: 3 images à vie strictes 30j visibles puis compte CACHÉ filtré sur accueil/boutiques/catégories - Réapparaît après paiement 5$ - 0% commission - Taux fixe {TAUX_CDF}</div>
          </div>
          <p className="mt-2 text-[10px] text-gray-500">Règle V6: 1 ticket = X places strictes sur Y jours (pas X/j) - Cumulable, renouvelable, suppression libère place immédiatement - Max 50 actives global - Comptes cachés 🔒 filtrés</p>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-sm">3. Finalité - Suivi compte V6</h2>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-[11px]">
            <li><b>isOwner():</b> vérifie ownerWhatsapp/whatsapp/telephone/userId cross-match pour canDelete/canEdit/canPublish</li>
            <li><b>checkFreemiumWenze() / verifierAbonnement() / isCompteCache():</b> calcule jours restants 30j, placesRestantes strictes, isCache, badge, palierId, ticketsActifs</li>
            <li><b>libererPlace(annonceId):</b> lors de suppression, retire annonceId de ticket.placesUtilisees[] et met à jour totalImagesMax - Règle V6 suppression libère place</li>
            <li><b>canPublishDetail():</b> retourne codes CACHE / MAX50 / FREEMIUM_FULL / NO_PLACE / OK pour redirection /abonnement</li>
            <li><b>hasRole():</b> hiérarchie dg(4) &gt; superviseur(3) &gt; ambassadeur(2) &gt; vendeur/prestataire/grossiste(1) &gt; client(0)</li>
          </ul>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-sm">4. Stockage & Sécurité</h2>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-[11px]">
            <li>LocalStorage chiffré côté client, pas de serveur tiers - Supabase RLS pour profiles</li>
            <li>ownerWhatsapp nettoyé: replace(/[^0-9]/g,"") - pas de +243, pas d'espaces</li>
            <li>DG: need2FA=true - Code 6 chiffres (demo 123456) - Table 2fa_codes en prod</li>
            <li>Pas de vente de données - WhatsApp utilisé uniquement pour contact vendeur-client et identification propriétaire - Bouton wa.me/ direct</li>
            <li>Carte MapKin: lat/lng fallback Kinshasa -4.325,15.322 - Lien OSM + Google Maps - Pas de tracking Google</li>
          </ul>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-sm">5. Droits - Suppression libère place</h2>
          <p className="mt-2 text-[11px]">Tu peux à tout moment supprimer une annonce via bouton Supprimer - Action appelle secureDelete() qui appelle libererPlace() - Ta place stricte est immédiatement libérée et utilisable pour nouvelle publication sans repayer - Max 50 actives global - Si tu supprimes ton compte, envoie WhatsApp support - Données localStorage effaçables via paramètres navigateur.</p>
          <p className="mt-2 text-[10px] text-gray-500">Contact: via bouton WhatsApp sur boutique - Pas de collecte email marketing - 0% commission - On vend visibilité, pas produit</p>
        </section>

        <div className="text-center">
          <Link href="/" className="inline-block bg-black text-white px-6 py-3 rounded-xl text-xs font-bold">← Retour accueil V6 - Même prix pour tous - Taux {TAUX_CDF}</Link>
          <p className="text-[9px] text-gray-400 mt-3">WENZE PWA V6.1 STRICT - TonMarché.cd - Kinshasa RDC - ownerWhatsapp = clé - Freemium 3 à vie 30j → caché → paye 5$ → réapparaît - 1 ticket = X places strictes sur Y jours - Cumulable - Max 50 - Suppression libère place</p>
        </div>
      </div>
    </div>
  );
                                                                                         }
