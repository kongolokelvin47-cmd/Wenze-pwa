"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FREEMIUM, PALIERS, OCCASIONNEL, TAUX_CDF, verifierAbonnement, activerPalier, toCDF, formatPrix } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

function AbonnementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode"); // client
  const annonceId = searchParams.get("id");

  const [ab, setAb] = useState<any>(null);
  const [selectedPalier, setSelectedPalier] = useState<"STANDARD"|"PRO"|"PREMIUM">("STANDARD");
  const [selectedDuree, setSelectedDuree] = useState<"1j"|"7j"|"30j">("30j");
  const [selectedOcc, setSelectedOcc] = useState<string>("occ-1img-1j");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const isOccasionnel = mode === "occasionnel" || mode === "client";

  useEffect(()=>{ try{ setAb(verifierAbonnement()); }catch{} },[]);

  const palier = PALIERS[selectedPalier];
  const prixUSD = palier.prix[selectedDuree];
  const prixCDF = toCDF(prixUSD);
  const jours = palier.jours[selectedDuree];

  const occSelected = OCCASIONNEL.offres.find(o=>o.id===selectedOcc) || OCCASIONNEL.offres[0];

  const handlePayPalier = async ()=>{
    setPaying(true);
    await new Promise(r=>setTimeout(r,1200));
    const res = activerPalier(selectedPalier, selectedDuree);
    if(res.success){
      setSuccess({ type:"palier", palier: selectedPalier, duree: selectedDuree, prixUSD, prixCDF, expireAt: res.expireAt, jours });
      setTimeout(()=> router.push("/publier"), 2500);
    }
    setPaying(false);
  };

  const handlePayOcc = async ()=>{
    setPaying(true);
    await new Promise(r=>setTimeout(r,1200));
    // Simule paiement occasionnel
    const list:any[] = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
    if(annonceId){
      const idx = list.findIndex((a:any)=>a.id===annonceId);
      if(idx>=0){
        list[idx].boostUntil = new Date(Date.now()+occSelected.jours*86400000).toISOString();
        list[idx].occasionnelPaye = true;
        list[idx].occasionnelPrix = occSelected.prixUSD;
        localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
      }
    }
    // Sauve transaction occasionnelle
    const occTx = { id:`OCC-${Date.now()}`, type:"OCCASIONNEL", offre: occSelected.id, prixUSD: occSelected.prixUSD, prixCDF: occSelected.prixCDF, expireAt: new Date(Date.now()+occSelected.jours*86400000).toISOString(), createdAt: new Date().toISOString() };
    localStorage.setItem("wenze_occasionnel_dernier", JSON.stringify(occTx));
    const logs = JSON.parse(localStorage.getItem("wenze_transactions")||"[]");
    logs.push(occTx);
    localStorage.setItem("wenze_transactions", JSON.stringify(logs));

    setSuccess({ type:"occasionnel", offre: occSelected, prixUSD: occSelected.prixUSD, prixCDF: occSelected.prixCDF, jours: occSelected.jours });
    setTimeout(()=> router.push(annonceId ? `/produit/${annonceId}` : "/"), 2500);
    setPaying(false);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <div className="sticky top-0 bg-white border-b-2 border-black p-4 z-10">
        <h1 className="font-black text-[15px]">WENZE PUB - 100% Visibilité - 0% Commission</h1>
        <p className="text-[9px] text-gray-600 mt-1">Taux {TAUX_CDF} CDF fixe • 3 images à vie Freemium 30j puis caché • Règle: {FREEMIUM.maxImages} images gratuites à vie</p>
        {ab && (
          <div className={`mt-2 text-[11px] font-bold px-2 py-1 rounded-full border-2 ${ab.isCache ? 'bg-red-100 border-red-300 text-red-800' : ab.isPaye ? 'bg-green-100 border-green-300 text-green-800' : 'bg-yellow-100 border-yellow-300'}`}>
            Statut: {ab.badge} {ab.message} {ab.count!==undefined && `(${ab.count}/3)`}
          </div>
        )}
      </div>

      {success && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[340px] w-full p-6 text-center border-2 border-black">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div>
            <h2 className="font-black text-[16px] mt-4">Paiement approuvé!</h2>
            <div className="bg-[#FFFBF0] border-2 rounded-xl p-3 mt-3 text-left">
              {success.type==="palier" && <>
                <p className="font-black text-[12px]">{PALIERS[success.palier].badge} {success.palier} {success.duree} - {success.prixUSD}$ / {success.prixCDF.toLocaleString()} CDF</p>
                <p className="text-[10px] text-green-700 font-bold mt-1">✅ {PALIERS[success.palier].imagesMax} images max + {PALIERS[success.palier].videos} - TOP {success.jours}j - Réapparaît instantanément</p>
                <p className="text-[9px] text-gray-500 mt-1">Expire {new Date(success.expireAt).toLocaleDateString("fr-FR")} - Max 50 actives</p>
              </>}
              {success.type==="occasionnel" && <>
                <p className="font-black text-[12px]">{success.offre.badge} {success.offre.label} - {success.prixUSD}$</p>
                <p className="text-[10px] text-green-700 font-bold mt-1">✅ Vente occasionnelle TOP {success.jours}j - Pas de freemium</p>
              </>}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-5">
        {/* ALERTE CACHE */}
        {ab?.isCache && (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4">
            <p className="font-black text-[13px] text-red-800">🔒 Ton compte est en mode caché</p>
            <p className="text-[11px] text-red-700 mt-1">Tu as utilisé tes 3 images gratuites à vie et tes 30 jours sont expirés. Personne ne te voit dans la recherche. Paye un palier ci-dessous pour réapparaître instantanément.</p>
          </div>
        )}

        {/* MODE CLIENT OCCASIONNEL */}
        {isOccasionnel ? (
          <div className="bg-white border-2 border-black rounded-2xl p-4">
            <p className="font-black text-[14px]">🎟️ Vente Occasionnelle - Client (Pas de freemium)</p>
            <p className="text-[10px] text-gray-600 mt-1">Tu vends ta vieille télé? Pas de gratuit. Paye 0.2$ mini pour filtrer le spam. Visible immédiatement.</p>
            <div className="mt-4 grid gap-2">
              {OCCASIONNEL.offres.map(o=>(
                <div key={o.id} onClick={()=>setSelectedOcc(o.id)} className={`border-2 rounded-xl p-3 cursor-pointer flex justify-between items-center ${selectedOcc===o.id?"border-black bg-black text-white":"border-gray-200 bg-white"}`}>
                  <div>
                    <p className="font-black text-[12px]">{o.badge} {o.label}</p>
                    <p className="text-[9px] opacity-70">{o.jours}j TOP - Anti-spam</p>
                  </div>
                  <p className="font-black text-[12px]">{o.prixUSD}$ / {o.prixCDF} CDF</p>
                </div>
              ))}
            </div>
            <button onClick={handlePayOcc} disabled={paying} className="mt-4 w-full bg-black text-white py-4 rounded-full font-black text-[13px] disabled:opacity-50">
              {paying?`Paiement...`:`Payer ${occSelected.prixUSD}$ / ${occSelected.prixCDF} CDF - Publier occasionnel`}
            </button>
          </div>
        ) : (
          <>
            {/* SELECTEUR PALIER */}
            <div className="bg-white border-2 border-black rounded-2xl p-4">
              <p className="font-black text-[14px]">Choisis ton panneau publicitaire</p>
              <p className="text-[10px] text-gray-600 mt-1">Même prix pour Détail, Grossiste, Prestataire. Plus de triche catégorie. Max 50 actives.</p>
              
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(Object.keys(PALIERS) as Array<"STANDARD"|"PRO"|"PREMIUM">).map(k=>{
                  const p = PALIERS[k];
                  const active = selectedPalier===k;
                  return (
                    <div key={k} onClick={()=>setSelectedPalier(k)} className={`border-2 rounded-xl p-3 cursor-pointer text-center ${active?"border-black bg-black text-white":"border-gray-200"}`}>
                      <p className="text-[16px]">{p.badge}</p>
                      <p className="font-black text-[11px] mt-1">{k}</p>
                      <p className="text-[8px] mt-1 opacity-70">{p.imagesMin}-{p.imagesMax} img</p>
                      <p className="text-[8px] opacity-70">{p.videos}</p>
                    </div>
                  );
                })}
              </div>

              {/* SELECTEUR DUREE */}
              <div className="mt-4">
                <p className="font-black text-[11px]">Durée pour {palier.nom}:</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["1j","7j","30j"] as const).map(d=>{
                    const prix = palier.prix[d];
                    const active = selectedDuree===d;
                    const best = d==="30j";
                    return (
                      <div key={d} onClick={()=>setSelectedDuree(d)} className={`border-2 rounded-xl p-3 cursor-pointer text-center relative ${active?"border-black bg-[#FFFBF0]":"border-gray-200"} ${best?"ring-2 ring-green-400":""}`}>
                        {best && <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full">MEILLEUR</span>}
                        <p className="font-black text-[13px]">{d}</p>
                        <p className="font-black text-[12px] mt-1">{prix}$</p>
                        <p className="text-[9px] text-gray-500">{toCDF(prix).toLocaleString()} CDF</p>
                        <p className="text-[8px] mt-1">{palier.jours[d]}j TOP</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RECAP */}
              <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-3">
                <p className="font-black text-[12px]">{palier.badge} {palier.nom} - {selectedDuree}</p>
                <p className="text-[10px] mt-1">✅ {palier.imagesMin} à {palier.imagesMax} images actives + {palier.videos} + Max {palier.limiteActives} actives (51ème archive auto) + TOP {jours}j</p>
                <p className="text-[10px] mt-1 font-bold">💰 {prixUSD}$ / {prixCDF.toLocaleString()} CDF - Réapparition instantanée</p>
                <p className="text-[9px] text-gray-600 mt-1">Règle: Serveur protégé. 0% commission. Main à main.</p>
              </div>

              <button onClick={handlePayPalier} disabled={paying} className="mt-4 w-full bg-black text-white py-4 rounded-full font-black text-[13px] disabled:opacity-50">
                {paying?`Paiement ${prixUSD}$...`:`Payer ${prixUSD}$ / ${prixCDF.toLocaleString()} CDF - Activer ${selectedPalier} ${selectedDuree}`}
              </button>
              <p className="text-[9px] text-gray-500 text-center mt-2">Airtel / Orange / M-Pesa • Activation instantanée • Ton compte sort du mode caché</p>
            </div>

            {/* TABLEAU COMPARATIF */}
            <div className="bg-white border-2 rounded-2xl p-4">
              <p className="font-black text-[12px]">Comparatif paliers (Même prix pour tous)</p>
              <div className="mt-3 space-y-2 text-[10px]">
                <div className="grid grid-cols-4 gap-2 font-black border-b pb-2">
                  <span>Palier</span><span>Images</span><span>Vidéo</span><span>Prix 30j</span>
                </div>
                <div className="grid grid-cols-4 gap-2"><span>⭐ STANDARD</span><span>1-4</span><span>1x15s</span><span className="font-black">5$</span></div>
                <div className="grid grid-cols-4 gap-2"><span>🚀 PRO</span><span>5-10</span><span>1x60s</span><span className="font-black">10$</span></div>
                <div className="grid grid-cols-4 gap-2"><span>👑 PREMIUM</span><span>11-30</span><span>2x60s</span><span className="font-black">20$</span></div>
                <div className="grid grid-cols-4 gap-2 text-gray-500"><span>🆓 Freemium</span><span>3 à vie</span><span>0</span><span>0$ / 30j puis caché</span></div>
              </div>
            </div>
          </>
        )}

        <div className="text-center space-y-2">
          <Link href="/" className="block text-[11px] text-gray-500">← Retour accueil</Link>
          <Link href="/abonnement?mode=occasionnel" className="block text-[11px] font-bold underline">Je suis client, je veux vendre en occasionnel 0.2$ →</Link>
        </div>
      </div>
    </div>
  );
}

export default function PageAbonnement(){
  return <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">Chargement WENZE PUB...</div>}><AbonnementContent/></Suspense>
        }
