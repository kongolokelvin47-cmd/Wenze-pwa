import Link from "next/link";
export default function Confidentialite() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-5 bg-white text-sm leading-relaxed">
      <Link href="/" className="text-[#6C3CE0]">← Accueil</Link>
      <h1 className="text-2xl font-black mt-4">Politique de Confidentialité</h1>
      <p className="text-xs text-gray-500">WENZE WENZE BUSINESS - Kinshasa RDC</p>

      <div className="mt-6 space-y-5">
        <section>
          <h2 className="font-bold">1. DONNÉES QUE NOUS COLLECTONS</h2>
          <ul className="list-disc ml-5">
            <li><b>Compte Client:</b> Nom complet, WhatsApp, Photo profil (compressée 400px, 40Ko), Mot de passe crypté.</li>
            <li><b>Compte Pro:</b> + Nom établissement, Activité (parmi 10 catégories), Position GPS (lat/lng) si vous activez.</li>
            <li><b>Utilisation:</b> Produits consultés, recherches tapées (ex: "maçon"), vidéos vues. Pour améliorer la recherche intelligente.</li>
            <li><b>Technique:</b> Modèle téléphone, connexion (pour compresser images/vidéos).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold">2. POURQUOI ON COLLECTE</h2>
          <p>- Pour afficher votre boutique sur la carte virtuelle.</p>
          <p>- Pour que l'Assistante IA vous aide (générer description).</p>
          <p>- Pour la livraison: partager votre position avec le livreur/moto que VOUS choisissez.</p>
          <p>- Jamais pour vous spammer. 0 pub externe.</p>
        </section>

        <section>
          <h2 className="font-bold">3. OÙ SONT STOCKÉES VOS DONNÉES</h2>
          <p>Photos/vidéos compressées → Supabase (EU) + Cloudflare R2 (pas cher, sécurisé). Mots de passe → cryptés bcrypt, nous ne les voyons jamais. GPS → stocké seulement si vous cliquez "Partager position". Vous pouvez effacer dans Profil → Supprimer position.</p>
        </section>

        <section>
          <h2 className="font-bold">4. TRADUCTION & IA LOCALE</h2>
          <p>Quand vous cliquez "Traduire en Lingala", le texte part vers MyMemory ou Groq (gratuit) ou NLLB locale dans votre téléphone. Nous ne gardons pas vos traductions. L'Assistante IA vendeur ne garde pas vos secrets commerciaux.</p>
        </section>

        <section>
          <h2 className="font-bold">5. PARTAGE</h2>
          <p>Nous ne vendons JAMAIS vos données. Partage seulement avec: 1) Le client qui veut vous acheter (il voit votre WhatsApp et position si vous avez activé) 2) Notre hébergeur Vercel/Supabase pour faire marcher l'app. C'est tout.</p>
        </section>

        <section>
          <h2 className="font-bold">6. VOS DROITS (Loi RDC)</h2>
          <p>Vous pouvez: Voir vos données (Profil), Modifier, Supprimer compte définitivement (Profil → Supprimer), Retirer position GPS. Demande par WhatsApp: +243 8XX XXX XXX - Réponse en 72h.</p>
          <p className="mt-2">Photos: Vous restez propriétaire. En uploadant, vous nous donnez droit de les afficher compressées sur WENZE.</p>
        </section>

        <div className="bg-gray-50 p-3 rounded-xl text-xs">
          <p>Contact DPO: confidentialite@wenzewenze.cd</p>
          <p>Si vous avez moins de 18 ans, demandez à un parent pour créer compte Pro.</p>
        </div>

        <Link href="/conditions" className="block text-center text-[#6C3CE0] font-bold">Voir Conditions d'utilisation →</Link>
      </div>
    </div>
  )
}
