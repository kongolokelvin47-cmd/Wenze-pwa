import Link from "next/link";
export default function ReglesVideo() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-5 bg-white text-sm leading-relaxed">
      <Link href="/video" className="text-[#6C3CE0]">← Wenze Video</Link>
      <h1 className="text-2xl font-black mt-4">Règles Wenze Video 🎬</h1>
      <p className="text-xs text-gray-500">Le TikTok Shop de Kinshasa - Pour vendre, pas pour buzz</p>

      <div className="mt-6 space-y-5">
        <section className="bg-red-50 p-3 rounded-xl border border-red-200">
          <h2 className="font-bold text-red-700">❌ INTERDIT - Bannissement direct</h2>
          <ul className="list-disc ml-5 mt-2">
            <li>Nudité, sexe, danse provocante. On vend des produits, pas du buzz.</li>
            <li>Armes, drogue, fétiches dangereux, maraboutage.</li>
            <li>Arnaque: "Gagnez 1000$ vite", faux billets, faux produits (faux iPhone).</li>
            <li>Discours haine, tribalisme, politique, insultes.</li>
            <li>Vidéo volée d'un autre vendeur. Soyez original.</li>
            <li>Musique avec droits d'auteur si vous n'avez pas droit (utilisez sons libres).</li>
          </ul>
        </section>

        <section className="bg-green-50 p-3 rounded-xl border border-green-200">
          <h2 className="font-bold text-green-700">✅ AUTORISÉ ET RECOMMANDÉ</h2>
          <ul className="list-disc ml-5 mt-2">
            <li>Vidéo 15-30 sec max, verticale, 15 Mo max. Montrez produit réel dans votre boutique à Kin.</li>
            <li>Parlez prix en CDF, montrez qualité, donnez votre commune (Gombe, Limete...).</li>
            <li>Langues: Français, Lingala, Swahili, Tshiluba, Kikongo. Utilisez notre IA pour traduire description.</li>
            <li>Compression auto: votre vidéo sera compressée à 720p pour économiser data de vos clients.</li>
            <li>Ajoutez votre position GPS pour que client proche vous trouve.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold">⚖️ MODÉRATION</h2>
          <p>Toutes les vidéos passent par: 1) IA qui détecte nudité/arme (gratuit) 2) Équipe WENZE à Kin. Si refusée, vous recevez raison par WhatsApp. 3 refus = compte Pro en pause 7 jours. Vidéo supprimée automatiquement après 90 jours si boutique inactive (pour économiser stockage pas cher).</p>
        </section>

        <section>
          <h2 className="font-bold">💰 MONÉTISATION</h2>
          <p>Wenze Video est inclus dans vos 15 000 CDF/mois. Pas de commission. Si votre vidéo vend, l'argent va direct à vous via WhatsApp / Mobile Money. WENZE ne touche pas. Vous pouvez mettre lien WhatsApp direct dans vidéo.</p>
        </section>

        <section>
          <h2 className="font-bold">🤖 ASSISTANTE IA VIDÉO</h2>
          <p>Besoin d'idée? Allez dans Assistant → "Idée vidéo". L'IA vous écrit script: "Mbote! Lelo na zali na robe wax ya kitoko na Gombe..." Vous filmez, vous postez. Simple.</p>
        </section>

        <Link href="/video" className="block w-full bg-black text-white text-center p-4 rounded-full font-bold">J'ai compris, je poste ma vidéo</Link>
        <Link href="/confidentialite" className="block text-center text-xs text-gray-500 mt-3">Politique confidentialité</Link>
      </div>
    </div>
  )
}
