"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TAUX_CDF, toCDFString, PALIERS, FREEMIUM, verifierAbonnement } from "@/lib/paiement";

export default function Tarifs() {
  const [abonnement, setAbonnement] = useState<any>(null);

  useEffect(() => { try { setAbonnement(verifierAbonnement()); } catch {} }, []);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[18px] leading-tight">WENZE Tarifs V6.2 - Politique Actuelle</h1>
            <p className="text-[10px] text-gray-500">Même ticket pour tous - 0% commission - Taux {TAUX_CDF} - Max 50 - Suppression libère place</p>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-black ${abonnement?.isPaye?"bg-black text-white":"bg-orange-100 text-orange-700"} ${abonnement?.isCache?"bg-red-100 text-red-700":""}`}>{abonnement?.badge||"🆓"} {abonnement?.palierId||"Freemium"}{abonnement?.isCache?" 🔒":""}</span>
        </div>
        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px]">
          <b>POLITIQUE NOUVELLE V6 UNIFIÉE:</b> On vend VISIBILITÉ, pas catégorie - 1 ticket = X places STRICTES sur Y jours (pas X/j) - Cumulable - Max 50 actives - Suppression libère place immédiatement - Freemium 3 images à vie visibles 30j puis 🔒 caché si 0 ticket - 0% commission - Taux {TAUX_CDF} - isOwner = ownerWhatsapp
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* FREEMIUM */}
        <div className="bg-white border-2 border-dashed rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div><p className="font-black text-[14px]">🆓 Freemium Découverte</p><p className="text-[11px] text-gray-500 mt-1">Pour tester - 3 images à vie - Même prix pour tous après</p></div>
            <span className="bg-gray-100 px-3 py-1 rounded-full text-[12px] font-black">0$</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-[11px]">
            <li className="flex gap-2"><span>✅</span> <b>{FREEMIUM.maxImages} images à vie strictes</b> - 1 image = 1 place stricte</li>
            <li className="flex gap-2"><span>✅</span> Visibles <b>{FREEMIUM.dureeJours} jours</b> puis compte 🔒 caché si 0 ticket - Panier/messages conservés</li>
            <li className="flex gap-2"><span>✅</span> Max <b>50 actives</b> - Suppression libère place - isOwner WA sécurisé</li>
            <li className="flex gap-2"><span>❌</span> 0 vidéo - Images only 800px JPEG 65% - Léger pour éviter Quota</li>
          </ul>
          <p className="text-[9px] text-gray-400 mt-3">Freemium = {FREEMIUM.maxImages} places strictes à vie - Après {FREEMIUM.dureeJours}j, tu deviens 🔒 caché - Active ticket 5$ ({toCDFString(5)}) pour réapparaître - Même ticket pour 🛍️ Détail et 🏭 Gros</p>
        </div>

        {/* TICKETS - MÊME PRIX */}
        <div>
          <p className="font-black text-[13px]">🎫 Tickets Visibilité - Même prix pour tous secteurs</p>
          <p className="text-[10px] text-gray-500 mt-1">1 ticket = X places STRICTES sur Y jours (pas X/j) - Ex: 4 places/7j = tu postes 1/j pendant 4j jusqu'à 4/4, pas 4/j - Cumulable - Max 50 - Suppression libère place</p>
          <div className="mt-3 grid gap-3">
            {Object.entries(PALIERS).map(([k,v]:any)=>(
              <div key={k} className={`bg-white border-2 rounded-2xl p-5 shadow-sm ${k==="STANDARD"?"border-black":""}`}>
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-[#FFFBF0] border-2 rounded-xl flex items-center justify-center text-2xl">{v.badge}</div>
                    <div><p className="font-black text-[14px]">{v.badge} {k}</p><p className="text-[10px] text-gray-500">{v.nom} - {v.places} places strictes sur {v.jours}j</p><p className="text-[9px] mt-1 bg-black text-white inline-block px-2 py-0.5 rounded-full">Même prix pour tous - 0% comm - Taux {TAUX_CDF}</p></div>
                  </div>
                  <div className="text-right"><p className="font-black text-[20px]">{v.prixUSD}$</p><p className="text-[11px] text-gray-500">{toCDFString(v.prixUSD)}</p><p className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold mt-1">{k==="STANDARD"?"⭐ Populaire":k==="PRO"?"🚀 Pro":"👑 Max"}</p></div>
                </div>
                <ul className="mt-4 space-y-1.5 text-[11px]">
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> <b>{v.places} places strictes</b> sur <b>{v.jours} jours</b> - 1 place = 1 annonce active - Pas X/j</li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> <b>{v.videoCount} vidéo {v.videoDuree}</b> {v.videoCount===0?"(images only)":"60s max"} - Léger 800px</li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> <b>Cumulable</b> - Achète 2 tickets = {v.places*2} places - N'écrase pas ancien</li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> <b>Renouvelable</b> - Prolonge avant expiration - Expire = places perdues sauf si renouvelé</li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> <b>Suppression libère place immédiatement</b> - Vendu ? Supprime → place libre pour nouveau produit</li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Max <b>{v.limiteActives} actives</b> - Au-delà, plus ancienne archivée - 0% commission WhatsApp direct</li>
                </ul>
                <Link href={`/abonnement?ticket=${k}`} className={`mt-4 block w-full text-center py-3.5 rounded-full font-black text-[12px] ${k==="STANDARD"?"bg-black text-white":"bg-white border-2 border-black text-black"}`}>Activer {k} - {v.prixUSD}$ / {toCDFString(v.prixUSD)} - {v.places} places</Link>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-black text-white rounded-2xl p-5">
          <p className="font-black text-[13px]">💡 Exemple concret V6 - Même ticket pour tous</p>
          <p className="text-[11px] mt-2 opacity-90 leading-relaxed">
            Tu vends <b>riz 25kg</b> (🏭 Gros) et ton voisin vend <b>coiffure</b> (🛍️ Détail). Vous payez <b>même prix</b>:<br/><br/>
            ⭐ <b>STANDARD 5$ ({toCDFString(5)})</b> = 4 places strictes sur 7j. Tu postes 1 annonce Lundi, 1 Mardi, 1 Mercredi, 1 Jeudi = 4/4 places utilisées. Vendredi tu veux poster 5ème → plein. Tu supprimes Lundi (vendu) → 3/4 places → tu peux reposter 1 place libérée. Cumulable: achète 2× STANDARD = 8 places sur 7j. Max 50 actives. Taux {TAUX_CDF}. 0% comm. isOwner = ownerWhatsapp cleanWa().replace(/^0+/,"").
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">❓ FAQ Politique Actuelle V6.2</p>
          <div className="mt-3 space-y-3 text-[11px]">
            <div><p className="font-bold">Pourquoi même prix pour Détail et Gros ?</p><p className="text-gray-600 mt-1">On vend VISIBILITÉ, pas catégorie. Un maçon et un dépôt de ciment ont même besoin d'être vus. WENZE = plateforme, pas grossiste. 0% commission.</p></div>
            <div><p className="font-bold">1 ticket = X places strictes sur Y jours, c'est quoi ?</p><p className="text-gray-600 mt-1">Pas X/j. Ex: 4 places/7j = tu as 4 places à utiliser dans les 7j, tu peux poster 1/j pendant 4j. Si tu postes 4/jour 1 → 4/4 plein, tu dois attendre suppression ou nouveau ticket.</p></div>
            <div><p className="font-bold">Suppression libère place ?</p><p className="text-gray-600 mt-1">Oui V6. Supprime annonce avant expiration → place libérée immédiatement dans même ticket. Max 50 actives.</p></div>
            <div><p className="font-bold">Freemium 3 à vie puis caché ?</p><p className="text-gray-600 mt-1">3 images à vie strictes, visibles 30j. Après 30j + 0 ticket actif → compte 🔒 caché (annonces non visibles dans Marché/Recherche) mais panier/messages conservés. Active ticket 5$ ({toCDFString(5)}) pour réapparaître immédiatement.</p></div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/abonnement" className="flex-1 bg-black text-white rounded-full py-4 text-center font-black text-[13px]">🎫 Payer ticket - Même prix - Max 50</Link>
          <Link href="/market" className="flex-1 bg-white border-2 border-black rounded-full py-4 text-center font-bold text-[13px]">Voir Marché</Link>
        </div>

        <p className="text-[9px] text-gray-400 text-center leading-relaxed">V6.2 Politique économique actuelle: Même ticket pour tous - ⭐ 5$ ({toCDFString(5)}) 4pl/7j 0 vidéo • 🚀 10$ 10pl/15j 1 vidéo • 👑 20$ 30pl/30j 2 vidéos • Freemium 3 images à vie 30j puis 🔒 caché • Max 50 • Suppression libère place • 1 ticket = X places strictes sur Y jours (pas X/j) • Cumulable • 0% comm • Taux {TAUX_CDF} • isOwner WA</p>
      </div>
    </div>
  );
            }
