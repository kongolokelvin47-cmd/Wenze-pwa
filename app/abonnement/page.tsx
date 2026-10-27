"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FORMULES, PUBS, TAUX_CDF, handlePaiement, verifierAbonnement, getSoldeWPay } from "@/lib/paiement";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie } from "@/lib/categories";

export const dynamic = 'force-dynamic';

function AbonnementContent() {
  const searchParams = useSearchParams();
  const catFromUrl = normalizeCategorie(searchParams.get("cat") || searchParams.get("categorie") || "");
  const [ab, setAb] = useState<any>(null);
  const [limit, setLimit] = useState<any>(null);
  const [solde, setSolde] = useState(0);
  const [showConfirm, setShowConfirm] = useState<any>(null);
  const [success, setSuccess] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [devise, setDevise] = useState<"USD" | "CDF">("CDF");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wenze_user");
      const u = raw ? JSON.parse(raw) : null;
      setUser(u);
      const v = verifierAbonnement();
      setAb(v);
      setLimit({ count: v.count, annoncesRestantes: v.annoncesRestantes, message: v.message, isEssai7j: v.isEssai7j, isFreemium: v.isFreemium, isPaye: v.isPaye, media: v.media, droits: v.droits, joursRestants: v.joursRestants });
      setSolde(getSoldeWPay());
      const saved = localStorage.getItem("wenze_devise_choisie") as any;
      if(saved) setDevise(saved);
    } catch {}
  }, []);

  function acheter(type: string) {
    const f: any = (FORMULES as any)[type] || (PUBS as any)[type];
    if (!f) return;
    setShowConfirm({
      type, titre: f.nom, prixUSD: f.prixUSD, prixCDF: f.prixCDF,
      prix: `${f.prixUSD}$ / ${f.prixCDF.toLocaleString("fr-FR")} CDF`,
      duree: f.duree, limite: f.limite, badge: f.badge, categorie: f.categorie, droits: f.droits, media: f.media,
    });
  }

  function confirmerPaiement() {
    if (!showConfirm) return;
    const res: any = handlePaiement(showConfirm.type, devise === "USD" ? "$" : "CDF");
    if (res && res.success) {
      localStorage.setItem("wenze_devise_choisie", devise);
      setSuccess({...res.confirmation, devisePayee: devise, droits: res.droits, media: res.media});
      setShowConfirm(null);
      const v = verifierAbonnement();
      setAb(v);
      setLimit({ count: v.count, annoncesRestantes: v.annoncesRestantes, message: v.message, isEssai7j: v.isEssai7j, isFreemium: v.isFreemium, isPaye: v.isPaye, media: v.media, droits: v.droits, joursRestants: v.joursRestants });
      setSolde(getSoldeWPay());
      setToast(`✅ ${res.confirmation.formule} activé en ${devise} - Droits instant!`);
      setTimeout(() => setToast(""), 3500);
    } else {
      setToast("❌ " + (res.error || "Erreur")); setTimeout(() => setToast(""), 2500);
    }
  }

  const wa = (()=>{ try{ const u=JSON.parse(localStorage.getItem("wenze_user")||"{}"); return (u.ownerWhatsapp||u.whatsapp||"").toString().replace(/[^0-9]/g,""); } catch{ return ""; } })();
  const currentCat = getCategorieById(catFromUrl || user?.categorieId || "commerces-services");

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28 relative">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-black text-white px-4 py-3 rounded-full text-[11px] font-bold shadow-xl max-w-[90%] text-center">{toast}</div>}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-[360px]">
            <p className="font-black text-[15px]">{showConfirm.badge} Confirmer {showConfirm.titre}?</p>
            <p className="text-[10px] text-gray-500 mt-1">{showConfirm.droits} • {showConfirm.media==="image-only"?"Images only - Non vidéo":"Images + Vidéo"}</p>
            <div className="bg-black rounded-full p-1 flex gap-1 w-fit mt-3">
              <button onClick={()=> setDevise("CDF")} className={`px-4 py-2 rounded-full text-[11px] font-black ${devise==="CDF"?"bg-white text-black":"text-white/60"}`}>🇨🇩 CDF</button>
              <button onClick={()=> setDevise("USD")} className={`px-4 py-2 rounded-full text-[11px] font-black ${devise==="USD"?"bg-white text-black":"text-white/60"}`}>💵 USD</button>
            </div>
            <div className="mt-3 bg-gray-50 rounded-xl p-3 text-[11px] space-y-1">
              <p><b>Prix:</b> {showConfirm.prixCDF.toLocaleString("fr-FR")} CDF / {showConfirm.prixUSD}$</p>
              <p><b>Droits:</b> {showConfirm.droits}</p>
              <p><b>Durée:</b> {showConfirm.duree} • Taux {TAUX_CDF}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={()=> setShowConfirm(null)} className="bg-gray-100 py-3 rounded-full font-bold text-[12px]">Annuler</button>
              <button onClick={confirmerPaiement} className="bg-[#6C3CE0] text-white py-3 rounded-full font-bold text-[12px]">✅ Payer en {devise} - Droits instant</button>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[360px] text-center">
            <p className="text-4xl">🎉</p><p className="font-black text-[16px] mt-2">{success.titre}</p>
            <p className="text-[10px] text-gray-500">{success.droits} • {success.media}</p>
            <div className="mt-3 bg-[#6C3CE0]/10 border rounded-xl p-3 text-[11px] text-left space-y-1">
              <p><b>Formule:</b> {success.formule}</p><p><b>Prix:</b> {success.prix} ({success.devisePayee})</p><p><b>Expire:</b> {success.expire}</p><p><b>Droits:</b> {success.droits} - Instant</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link href="/" className="bg-black text-white py-3 rounded-full font-bold text-[12px] text-center">WENZE WENZE BUSINESS</Link>
              <Link href={wa ? `/boutique/${wa}` : "/boutiques"} className="bg-[#6C3CE0] text-white py-3 rounded-full font-bold text-[12px] text-center">Ma Boutique</Link>
            </div>
            <button onClick={()=> setSuccess(null)} className="mt-3 w-full bg-gray-100 py-2 rounded-full text-[11px] font-bold">Fermer</button>
          </div>
        </div>
      )}
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-[13px]">WENZE WENZE BUSINESS - {ab?.isEssai7j ? `Essai ${ab?.joursRestants}j` : ab?.isPaye ? `Actif ${ab?.joursRestants}j` : `Freemium ${ab?.count||0}/3 vie`}</h1>
          <p className="text-[10px] text-gray-500">{limit?.message || "Freemium 3 à vie images only"} • W-Pay {solde.toLocaleString("fr-FR")} CDF • Taux {TAUX_CDF}</p>
        </div>
        <span className={`text-[8px] px-2 py-1 rounded-full font-black ${ab?.isPaye?"bg-green-500 text-white": ab?.isEssai7j?"bg-orange-400 text-white":"bg-gray-200"}`}>{ab?.isPaye ? `${ab?.type==="gros_autres"?"🏭 10$":"🛍️ 5$"} ${ab?.joursRestants}j` : ab?.isEssai7j ? `⏳ ${ab?.joursRestants}j essai` : `🆓 ${ab?.count||0}/3 vie`}</span>
      </header>
      <div className="p-4 space-y-3">
        <div className={`rounded-2xl p-4 flex justify-between items-center ${ab?.isPaye?"bg-green-500 text-white": ab?.isEssai7j?"bg-orange-400 text-white":"bg-black text-white"}`}>
          <div><p className="font-black text-[12px]">{ab?.isPaye ? `✅ ${ab?.label} actif - ${ab?.droits}` : ab?.isEssai7j ? `⏳ Essai gratuit ${ab?.joursRestants}j - ${ab?.droits}` : `🆓 ${ab?.label} - ${ab?.droits}`}</p><p className="text-[10px] opacity-80 mt-1">{ab?.isPaye ? `Expire dans ${ab?.joursRestants}j • ${ab?.prixUSD}$ payé` : ab?.isEssai7j ? `Il te reste ${ab?.joursRestants}j essai illimité images only` : `${limit?.annoncesRestantes||0} restante(s) / 3 à vie • Images only - Non vidéo`}</p></div>
          <div className="text-right"><p className="text-[9px] opacity-60">Taux</p><p className="font-black text-[13px]">{TAUX_CDF}</p></div>
        </div>
        <div className="bg-black rounded-full p-1 flex gap-1 w-fit mx-auto"><button onClick={()=> setDevise("CDF")} className={`px-6 py-2.5 rounded-full text-[12px] font-black ${devise==="CDF"?"bg-white text-black":"text-white/60"}`}>🇨🇩 CDF</button><button onClick={()=> setDevise("USD")} className={`px-6 py-2.5 rounded-full text-[12px] font-black ${devise==="USD"?"bg-white text-black":"text-white/60"}`}>💵 USD</button></div>
        <div className="grid gap-3">
          <div className={`bg-white border-2 rounded-2xl p-4 ${ab?.isFreemium?"border-orange-400":""}`}><p className="font-black text-[13px]">🆓 Freemium - 3 à vie - Images only</p><p className="text-[10px] text-gray-500">Alternative abo - 3 annonces à vie - Images only - Non vidéo - Sans abo retour freemium</p><div className="mt-2 bg-gray-50 rounded-xl p-2.5 text-[10px]"><p>✅ 0$ / 0 CDF - 3 à vie - Images only - Non vidéo</p><p>✅ {ab?.isFreemium ? ab?.message : "Après abo expiré, tu reviens ici 3 à vie"}</p></div></div>
          {ab?.isEssai7j && <div className="bg-orange-400 text-white border-2 border-orange-500 rounded-2xl p-4"><p className="font-black text-[13px]">⏳ Essai Gratuit 7j - Illimité Images Only</p><p className="text-[10px]">Création compte pro {currentCat?.icon} {currentCat?.titreCourt} - {ab?.joursRestants}j restants</p></div>}
          <div className="bg-white border-2 border-[#6C3CE0] rounded-2xl p-4 relative"><span className="absolute -top-2 right-4 bg-[#6C3CE0] text-white text-[8px] px-2 py-1 rounded-full font-black">POPULAIRE • DROITS INSTANT</span><p className="font-black text-[14px]">🛍️ Commerces et Services - 5$ / 11 500 CDF</p><button onClick={()=> acheter("commerces_services")} className="mt-3 w-full bg-[#6C3CE0] text-white py-4 rounded-full font-black text-[14px]">🛍️ 5$ - {devise==="USD"?`5$`:`11 500 CDF`} - Activer droits instant</button></div>
          <div className="bg-white border-2 border-black rounded-2xl p-4"><p className="font-black text-[14px]">🏭 Gros & Autres - 10$ / 23 000 CDF</p><button onClick={()=> acheter("gros_autres")} className="mt-3 w-full bg-black text-white py-4 rounded-full font-black text-[14px]">🏭 10$ - {devise==="USD"?`10$`:`23 000 CDF`} - Activer droits instant</button></div>
          <div className="grid grid-cols-2 gap-3"><div className="bg-white border rounded-2xl p-3"><p className="font-bold text-[12px]">🎟️ Occasionnel 24h - 1$</p><button onClick={()=> acheter("occasionnel")} className="mt-2 w-full bg-[#25D366] text-white py-2.5 rounded-full font-bold text-[11px]">{devise==="USD"?`1$`:`2 300 CDF`}</button></div><div className="bg-white border rounded-2xl p-3"><p className="font-bold text-[12px]">🚀 Boost 72h - 2$</p><button onClick={()=> acheter("boost")} className="mt-2 w-full bg-[#6C3CE0] text-white py-2.5 rounded-full font-bold text-[11px]">{devise==="USD"?`2$`:`4 600 CDF`}</button></div></div>
        </div>
      </div>
    </div>
  );
}

export default function AbonnementPageWrapper(){
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[10px] text-gray-400 mt-2">WENZE WENZE BUSINESS Chargement...</p></div>}>
      <AbonnementContent/>
    </Suspense>
  )
                }
