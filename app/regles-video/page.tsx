import Link from "next/link";
import { TAUX_CDF, toCDFString, PALIERS, FREEMIUM } from "@/lib/paiement";

export default function ReglesVideo() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/video" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">Règles WENZE Video 🎬 V6.2</h1>
            <p className="text-[10px] text-gray-500">TikTok Shop Kin - Pour vendre, pas pour buzz - Politique économique actuelle - Taux {TAUX_CDF} - 0% comm</p>
          </div>
        </div>
        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px]">
          <b>POLITIQUE ÉCONOMIQUE ACTUELLE V6:</b> Même ticket pour tous - ⭐ STANDARD 5$ ({toCDFString(5)}) 4 places strictes/7j 0 vidéo • 🚀 PRO 10$ ({toCDFString(10)}) 10 places/15j 1 vidéo 60s • 👑 PREMIUM 20$ ({toCDFString(20)}) 30 places/30j 2 vidéos 60s • Freemium 🆓 3 images à vie visibles 30j puis 🔒 caché • Max 50 actives • Suppression libère place immédiatement • 1 ticket = X places strictes sur Y jours (pas X/j) • Cumulable • 0% commission • isOwner = ownerWhatsapp
        </div>
      </header>

      <div className="p-4 space-y-4">
        <section className="bg-red-50 p-4 rounded-2xl border-2 border-red-200">
          <h2 className="font-black text-red-700 text-[13px]">❌ INTERDIT - Bannissement direct V6</h2>
          <ul className="list-disc ml-5 mt-2 text-[11px] space-y-1.5">
            <li><b>Nudité, sexe, danse provocante.</b> On vend des produits, pas du buzz. WENZE = Jumia, pas TikTok buzz.</li>
            <li><b>Armes, drogue, fétiches dangereux, maraboutage.</b></li>
            <li><b>Arnaque:</b> "Gagnez 1000$ vite", faux billets, faux produits (faux iPhone), fausse monnaie.</li>
            <li><b>Discours haine, tribalisme, politique, insultes.</b> Kinshasa est diverse, respect obligatoire.</li>
            <li><b>Vidéo volée d'un autre vendeur.</b> V6 isOwner = ownerWhatsapp nettoyé - Vol = ban + place non libérée.</li>
            <li><b>Musique avec droits d'auteur loud.</b> Parle, montre produit, pas concert.</li>
          </ul>
        </section>

        <section className="bg-white border rounded-2xl p-4 shadow-sm">
          <h2 className="font-black text-[13px]">🎬 Quota Vidéo V6 - Lié à ton ticket - Même prix pour tous</h2>
          <p className="text-[10px] text-gray-500 mt-1">Freemium = images only - Vidéo seulement si ticket payé - Pour éviter QuotaExceededError localStorage</p>
          <div className="mt-3 grid gap-2">
            <div className="border-2 border-dashed rounded-xl p-3 flex justify-between items-center">
              <div><p className="font-bold text-[11px]">🆓 Freemium - {FREEMIUM.maxImages} images à vie</p><p className="text-[10px] text-gray-500">{FREEMIUM.dureeJours}j visibles puis 🔒 caché - Max 50 - 0 vidéo - Taux {TAUX_CDF}</p></div>
              <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-full font-bold">0 vidéo</span>
            </div>
            {(Object.entries(PALIERS) as any).map(([k,v]:any)=>(
              <div key={k} className="border rounded-xl p-3 flex justify-between items-center">
                <div><p className="font-bold text-[11px]">{v.badge} {k} - {v.prixUSD}$ / {toCDFString(v.prixUSD)}</p><p className="text-[10px] text-gray-500">{v.places} places strictes / {v.jours}j - {v.videoCount} vidéo {v.videoDuree} - Max 50 - Suppression libère place</p></div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${v.videoCount>0?"bg-black text-white":"bg-gray-100"}`}>{v.videoCount>0?`${v.videoCount} vidéo ${v.videoDuree}`:"0 vidéo"}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-gray-400 mt-3">V6 Strict: 1 ticket = X places strictes sur Y jours (pas X/j) - Ex: STANDARD 4 places/7j = tu peux poster 1/j pendant 4j jusqu'à 4/4, pas 4/j. Suppression libère 1 place immédiatement. Cumulable. Max 50 actives. isOwner sécurisé par ownerWhatsapp cleanWa().replace(/^0+/,"").</p>
        </section>

        <section className="bg-black text-white rounded-2xl p-4">
          <h2 className="font-black text-[12px]">💰 Pourquoi vidéo = ticket payé ? - Politique économique actuelle</h2>
          <p className="text-[11px] mt-2 opacity-90 leading-relaxed">
            WENZE gagne <b>0% commission</b> sur tes ventes WhatsApp. On gagne uniquement quand tu achètes ticket visibilité. Vidéo = 800px JPEG 65% + stockage localStorage 5Mo max. Si on laisse Freemium poster vidéo, 10 000 vendeurs × 60Mo = crash. Donc V6: <b>Freemium = images only (800px)</b>, <b>PRO = 1 vidéo 60s</b>, <b>PREMIUM = 2 vidéos 60s</b>. Même prix pour 🛍️ Détail et 🏭 Gros. ⭐ 5$ ({toCDFString(5)}) = 4 places strictes/7j, 🚀 10$ = 10 places/15j, 👑 20$ = 30 places/30j. Max 50 actives. Suppression libère place. Freemium 3 images à vie visibles 30j puis 🔒 caché si 0 ticket. Taux {TAUX_CDF}.
          </p>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[12px]">✅ Comment faire une bonne vidéo WENZE qui vend ?</h2>
          <ul className="mt-2 space-y-2 text-[11px]">
            <li className="flex gap-2"><span className="font-bold">1.</span><span><b>Montre produit 15s max</b> - Face cam, lumière jour, pas filtre - Prix USD + {toCDFString(1)} visible - Commune + WhatsApp.</span></li>
            <li className="flex gap-2"><span className="font-bold">2.</span><span><b>Pas de musique forte</b> - Ta voix > musique - Client veut entendre état, origine.</span></li>
            <li className="flex gap-2"><span className="font-bold">3.</span><span><b>1 produit = 1 vidéo</b> - Ne mélange pas 5 produits - 1 place = 1 vidéo strict.</span></li>
            <li className="flex gap-2"><span className="font-bold">4.</span><span><b>Suppression libère place</b> - Si produit vendu, supprime vidéo → place libérée immédiatement pour nouveau produit - Max 50.</span></li>
          </ul>
        </section>

        <section className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4">
          <h2 className="font-black text-[12px] text-yellow-800">⚠️ Règle Légale V6 - TonMarché.cd / WENZE.cd</h2>
          <p className="text-[10px] mt-2 text-yellow-900 leading-relaxed">
            {`WENZE plateforme main à main 0% commission. Un ticket = X places strictes sur Y jours (pas X/j). Cumulable, renouvelable, suppression libère place. Max 50 actives. Freemium ${FREEMIUM.maxImages} images à vie visibles ${FREEMIUM.dureeJours}j puis compte caché si 0 ticket. Même ticket pour tous secteurs. Taux ${TAUX_CDF}. isOwner sécurisé par ownerWhatsapp nettoyé cleanWa(n).replace(/[^0-9]/g,"").replace(/^0+/,""), jamais par nom boutique. Vidéo = quota ticket pour éviter QuotaExceededError.`}
          </p>
        </section>

        <div className="flex gap-2">
          <Link href="/publier" className="flex-1 bg-black text-white rounded-full py-3.5 text-center font-black text-[12px]">🚀 Publier vidéo - {PALIERS.STANDARD.badge} 5$ / {toCDFString(5)}</Link>
          <Link href="/video" className="flex-1 bg-white border-2 border-black rounded-full py-3.5 text-center font-bold text-[12px]">Voir WENZE Video</Link>
        </div>

        <p className="text-[9px] text-gray-400 text-center">V6.2 Politique économique actuelle: Même ticket pour tous - Freemium 3 images à vie 30j visibles puis 🔒 caché - Max 50 - Suppression libère place - 0% comm - Taux {TAUX_CDF} - isOwner WA</p>
      </div>
    </div>
  );
          }
