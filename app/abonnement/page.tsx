"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FORMULES, PUBS, TAUX_CDF, handlePaiement, verifierAbonnement, checkFreemiumLimit, getSoldeWPay, toCDFString } from "@/lib/paiement";

export default function AbonnementPage() {
  const [ab, setAb] = useState<any>(null);
  const [limit, setLimit] = useState<any>(null);
  const [solde, setSolde] = useState(0);
  const [showConfirm, setShowConfirm] = useState<any>(null);
  const [success, setSuccess] = useState<any>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      setAb(verifierAbonnement());
      setLimit(checkFreemiumLimit());
      setSolde(getSoldeWPay());
    } catch {}
  }, []);

  function acheter(type: string) {
    const f: any = (FORMULES as any)[type] || (PUBS as any)[type];
    if (!f) return;
    setShowConfirm({
      type,
      titre: f.nom,
      prixUSD: f.prixUSD ?? f.prix,
      prixCDF: f.prixCDF ?? f.prix * TAUX_CDF,
      prix: (f.prixUSD ?? f.prix) + "$ / " + (f.prixCDF ?? f.prix * TAUX_CDF).toLocaleString("fr-FR") + " CDF",
      duree: f.duree || f.jours + " jours",
      limite: f.limite,
    });
  }

  function confirmerPaiement() {
    if (!showConfirm) return;
    const res: any = handlePaiement(showConfirm.type, "$");
    if (res && res.success) {
      setSuccess(res.confirmation);
      setShowConfirm(null);
      setAb(verifierAbonnement());
      setLimit(checkFreemiumLimit());
      setSolde(getSoldeWPay());
      setToast("✅ " + res.confirmation.formule + " activé!");
      setTimeout(() => setToast(""), 3000);
    } else {
      setToast("❌ " + (res.error || "Erreur"));
      setTimeout(() => setToast(""), 2500);
    }
  }

  const wa = typeof window !== "undefined" ? (() => { try { const u = JSON.parse(localStorage.getItem("wenze_user") || "{}"); return (u.ownerWhatsapp || u.whatsapp || ""); } catch { return ""; } })() : "";

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28 relative">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-black text-white px-4 py-3 rounded-full text-[11px] font-bold shadow-xl">{toast}</div>}

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-[360px]">
            <p className="font-black text-[15px]">Confirmer {showConfirm.titre}?</p>
            <div className="mt-3 bg-gray-50 rounded-xl p-3 text-[11px] space-y-1">
              <p><b>Prix:</b> {showConfirm.prix}</p>
              <p><b>Durée:</b> {showConfirm.duree}</p>
              <p><b>Limite:</b> {showConfirm.limite}</p>
              <p><b>Taux:</b> {TAUX_CDF} CDF fixe</p>
              <p><b>Régime:</b> Prestataire unique - Soudeur + Tout travaux même régime Pro 5$</p>
              <p><b>Solde W-Pay:</b> {solde.toLocaleString("fr-FR")} CDF</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => setShowConfirm(null)} className="bg-gray-100 py-3 rounded-full font-bold text-[12px]">Annuler</button>
              <button onClick={confirmerPaiement} className="bg-[#6C3CE0] text-white py-3 rounded-full font-bold text-[12px]">✅ Payer maintenant</button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[360px] text-center">
            <p className="text-4xl">🎉</p>
            <p className="font-black text-[16px] mt-2">{success.titre}</p>
            <div className="mt-3 bg-[#6C3CE0]/10 border border-[#6C3CE0]/20 rounded-xl p-3 text-[11px] text-left space-y-1">
              <p><b>Formule:</b> {success.formule}</p>
              <p><b>Prix:</b> {success.prix}</p>
              <p><b>Durée:</b> {success.duree}</p>
              <p><b>Expire:</b> {success.expire}</p>
              <p><b>Trans:</b> {success.transaction}</p>
              <p className="text-[#6C3CE0] font-bold"><b>Boutique:</b> {success.boutique}</p>
              <p><b>Régime:</b> {success.regime}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link href="/profil" className="bg-black text-white py-3 rounded-full font-bold text-[12px] text-center">Profil</Link>
              <Link href={wa ? `/boutique/${wa}` : "/boutiques"} className="bg-[#6C3CE0] text-white py-3 rounded-full font-bold text-[12px] text-center">Ma Boutique</Link>
            </div>
            <button onClick={() => setSuccess(null)} className="mt-3 w-full bg-gray-100 py-2 rounded-full text-[11px] font-bold">Fermer</button>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/profil" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[14px]">Abonnement - Taux {TAUX_CDF}</h1><p className="text-[10px] text-gray-500">{limit ? limit.count + "/3 annonces" : "Freemium"} • W-Pay {solde.toLocaleString("fr-FR")} CDF</p></div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${ab && ab.actif ? "bg-green-50 text-green-700 border" : "bg-orange-50 text-orange-700 border"}`}>{ab && ab.actif ? ab.type.toUpperCase()+" "+ab.expireDans+"j" : "BLOQUÉ"}</span>
      </header>

      <div className="p-4">
        <div className="bg-black text-white rounded-2xl p-4 mb-4 flex justify-between items-center">
          <div><p className="font-bold text-[12px]">{ab && ab.actif ? "✅ "+ab.label+" actif" : "⚠️ Jean Jacques - Limite 3 atteinte - BLOQUÉ"}</p><p className="text-[10px] opacity-70 mt-1">{limit ? limit.annoncesRestantes+" restantes • Régime prestataire unique" : "Taux "+TAUX_CDF+" CDF fixe"}</p></div>
          <div className="text-right"><p className="text-[10px] opacity-60">Taux</p><p className="font-black text-[13px]">{TAUX_CDF}</p></div>
        </div>

        <div className="grid gap-3">
          <div className="bg-white border rounded-2xl p-4">
            <p className="font-black text-[13px]">🆓 Freemium - {FORMULES.freemium.annonces} gratuites</p><p className="text-[10px] text-gray-500">{FORMULES.freemium.limite}</p>
            <div className="mt-2 bg-gray-50 rounded-xl p-2 text-[10px]"><p>✅ 0$ / 0 CDF - Taux {TAUX_CDF} - Boutique OUI</p></div>
          </div>

          <div className="bg-white border-2 border-[#6C3CE0] rounded-2xl p-4 relative">
            <span className="absolute -top-2 right-4 bg-[#6C3CE0] text-white text-[8px] px-2 py-1 rounded-full font-black">RECOMMANDÉ POUR TOI</span>
            <p className="font-black text-[14px]">👑 Pro - Régime unique - Débloque tout</p>
            <p className="text-[11px] text-gray-500">Soudeur + Tout travaux = même régime Pro - Illimité</p>
            <div className="mt-2 bg-[#6C3CE0]/5 border border-[#6C3CE0]/20 rounded-xl p-2.5 text-[10px] space-y-1">
              <p>✅ {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString("fr-FR")} CDF - {FORMULES.pro.duree}</p>
              <p>✅ Boost inclus - Flash -60% - Boutique fonctionnelle</p>
              <p>✅ 6 métiers - Taux {TAUX_CDF} fixe</p>
            </div>
            <button onClick={() => acheter("pro")} className="mt-3 w-full bg-[#6C3CE0] text-white py-4 rounded-full font-black text-[14px]">👑 Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString("fr-FR")} CDF - Débloquer</button>
            <p className="text-[9px] text-center text-gray-400 mt-2">Pour Jean Jacques - 3 annonces → illimité - {toCDFString(FORMULES.pro.prix)}</p>
          </div>

          <div className="bg-white border rounded-2xl p-4">
            <p className="font-black text-[13px]">🏭 Grossiste B2B</p><p className="text-[10px] text-gray-500">{FORMULES.grossiste.limite}</p>
            <button onClick={() => acheter("grossiste")} className="mt-3 w-full bg-black text-white py-3 rounded-full font-black text-[12px]">Grossiste {FORMULES.grossiste.prix}$ / {FORMULES.grossiste.prixCDF.toLocaleString("fr-FR")} CDF</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border rounded-2xl p-3">
              <p className="font-bold text-[12px]">🎟️ Occasionnel</p><p className="text-[9px] text-gray-500">1 annonce / 5j</p>
              <button onClick={() => acheter("occasionnel")} className="mt-2 w-full bg-gray-900 text-white py-2.5 rounded-full font-bold text-[11px]">{FORMULES.occasionnel.prix}$ / {FORMULES.occasionnel.prixCDF.toLocaleString("fr-FR")}</button>
            </div>
            <div className="bg-white border rounded-2xl p-3">
              <p className="font-bold text-[12px]">🚀 Boost Image</p><p className="text-[9px] text-gray-500">Top 5j</p>
              <button onClick={() => acheter("boost")} className="mt-2 w-full bg-[#6C3CE0] text-white py-2.5 rounded-full font-bold text-[11px]">{PUBS.boost_image.prix}$ / {PUBS.boost_image.prixCDF.toLocaleString("fr-FR")}</button>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-3">
            <p className="font-bold text-[11px]">🎬 Pubs Vidéo - Régime prestataire</p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button onClick={() => acheter("video_express")} className="bg-gray-50 border py-2 rounded-xl text-[9px] font-bold">Express {PUBS.video_express.prix}$</button>
              <button onClick={() => acheter("video_standard")} className="bg-gray-50 border py-2 rounded-xl text-[9px] font-bold">Standard {PUBS.video_standard.prix}$</button>
              <button onClick={() => acheter("video_mensuelle")} className="bg-black text-white py-2 rounded-xl text-[9px] font-bold">Mensuelle {PUBS.video_mensuelle.prix}$</button>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-black text-white rounded-xl p-3 text-[10px]">
          <p className="font-bold">Paiement local - Pas de redirect - 0 404 - Tous outils pris</p>
          <p className="opacity-70 mt-1">FORMULES: freemium, pro, grossiste, occasionnel, boost + PUBS: boost_image, video_express, standard, mensuelle + TAUX {TAUX_CDF} + checkFreemiumLimit + verifierAbonnement + getSoldeWPay + CATEGORIES 6 métiers - Boutique fonctionnelle via wenze_all_users</p>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
