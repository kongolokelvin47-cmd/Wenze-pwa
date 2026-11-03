import Link from "next/link";
import { TAUX_CDF, FREEMIUM, PALIERS, MAX_ANNONCES_ACTIVES, toCDFString, usd } from "@/lib/paiement";

export default function ReglesVideo() {
  const palierIds = Object.keys(PALIERS);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/video" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">Règles WENZE Vidéo 🎬</h1>
            <p className="text-[10px] text-gray-500">Pour vendre, pas pour faire le buzz • 0% commission • Taux {TAUX_CDF} CDF/$</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <section className="bg-red-50 p-4 rounded-2xl border-2 border-red-200">
          <h2 className="font-black text-red-700 text-[13px]">❌ Interdit : suppression et bannissement</h2>
          <ul className="list-disc ml-5 mt-2 text-[11px] space-y-1.5">
            <li><b>Nudité, sexe, danse provocante.</b> On vend des produits, pas du buzz.</li>
            <li><b>Armes, drogue, objets dangereux, maraboutage.</b></li>
            <li><b>Arnaque :</b> « Gagnez 1000 $ vite », faux billets, faux produits (faux iPhone), fausse monnaie.</li>
            <li><b>Haine, tribalisme, politique, insultes.</b> Kinshasa est diverse : le respect est obligatoire.</li>
            <li><b>Vidéo volée à un autre vendeur.</b> Le vol entraîne un bannissement.</li>
            <li><b>Musique protégée à fort volume.</b> Parlez, montrez le produit.</li>
          </ul>
        </section>

        <section className="bg-white border rounded-2xl p-4 shadow-sm">
          <h2 className="font-black text-[13px]">🎬 Quota de vidéo selon votre abonnement</h2>
          <p className="text-[10px] text-gray-500 mt-1">Le compte gratuit publie des images uniquement. La vidéo est réservée aux abonnements payants.</p>
          <div className="mt-3 grid gap-2">
            <div className="border-2 border-dashed rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="font-bold text-[11px]">🆓 Gratuit - {FREEMIUM.maxImages} images à vie</p>
                <p className="text-[10px] text-gray-500">Visibles {FREEMIUM.dureeJours} jours, puis boutique masquée</p>
              </div>
              <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-full font-bold">0 vidéo</span>
            </div>
            {palierIds.map((k) => {
              const p: any = (PALIERS as any)[k];
              const minimum = Math.min(...p.durees.map((d: any) => d.prixUSD));
              return (
                <div key={k} className="border rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[11px]">{p.badge} {k} - dès {usd(minimum)}</p>
                    <p className="text-[10px] text-gray-500">{p.imagesMin} à {p.imagesMax} images • abonnement 30 jours : {usd(p.prixUSD)} ({toCDFString(p.prixUSD)})</p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-black text-white">{p.videos}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-gray-400 mt-3">
            Les achats sont cumulables et chaque achat garde son quota. Maximum {MAX_ANNONCES_ACTIVES} annonces actives. Supprimer une annonce libère sa place. La durée de la vidéo est vérifiée à l'envoi.
          </p>
        </section>

        <section className="bg-black text-white rounded-2xl p-4">
          <h2 className="font-black text-[12px]">💰 Pourquoi la vidéo demande un abonnement ?</h2>
          <p className="text-[11px] mt-2 opacity-90 leading-relaxed">
            WENZE prend <b>0% de commission</b> sur vos ventes WhatsApp. Nous gagnons uniquement quand vous achetez de la visibilité. Une vidéo pèse beaucoup plus qu'une image et coûte plus cher à stocker : elle est donc réservée aux abonnés. Le compte gratuit reste léger, avec des images compressées.
          </p>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[12px]">✅ Réussir une vidéo qui vend</h2>
          <ul className="mt-2 space-y-2 text-[11px]">
            <li className="flex gap-2"><span className="font-bold">1.</span><span><b>Montrez le produit, 15 secondes si possible.</b> Lumière du jour, sans filtre. Annoncez le prix ({toCDFString(1)} pour 1 $) et votre commune.</span></li>
            <li className="flex gap-2"><span className="font-bold">2.</span><span><b>Pas de musique forte.</b> Votre voix compte plus : le client veut entendre l'état et l'origine du produit.</span></li>
            <li className="flex gap-2"><span className="font-bold">3.</span><span><b>1 produit = 1 vidéo.</b> Ne mélangez pas cinq produits dans la même vidéo.</span></li>
            <li className="flex gap-2"><span className="font-bold">4.</span><span><b>Produit vendu ?</b> Supprimez l'annonce : la place est libérée tout de suite pour un nouveau produit.</span></li>
          </ul>
        </section>

        <section className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4">
          <h2 className="font-black text-[12px] text-yellow-800">⚠️ Règle légale</h2>
          <p className="text-[10px] mt-2 text-yellow-900 leading-relaxed">
            WENZE est une plateforme de mise en relation main à main. Elle ne perçoit aucune commission et ne touche jamais l'argent de vos ventes. Chaque vendeur est responsable de ses annonces et de ses vidéos. Les contenus interdits sont supprimés et les comptes concernés peuvent être bannis.
          </p>
        </section>

        <div className="flex gap-2">
          <Link href="/abonnement" className="flex-1 bg-black text-white rounded-full py-3.5 text-center font-black text-[12px]">🚀 Voir les abonnements</Link>
          <Link href="/video" className="flex-1 bg-white border-2 border-black rounded-full py-3.5 text-center font-bold text-[12px]">Voir WENZE Vidéo</Link>
        </div>
      </div>
    </div>
  );
}
