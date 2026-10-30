"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FREEMIUM, PALIERS, OCCASIONNEL, TAUX_CDF, verifierAbonnement, acheterTicket, renouvelerTicket, acheterOccasionnel, toCDF } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

function AbonnementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const annonceId = searchParams.get("id");

  const [ab, setAb] = useState<any>(null);
  const [selectedPalier, setSelectedPalier] = useState<"STANDARD"|"PRO"|"PREMIUM">("STANDARD");
  const [selectedDuree, setSelectedDuree] = useState<"1j"|"7j"|"30j">("7j");
  const [selectedOcc, setSelectedOcc] = useState<string>("occ-1img-1j");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const isOccasionnel = mode === "occasionnel" || mode === "client";

  const refresh = ()=>{ try{ setAb(verifierAbonnement()); }catch{} };
  useEffect(()=>{ refresh(); },[]);

  const palier = PALIERS[selectedPalier];
  const prixUSD = palier.prix[selectedDuree];
  const prixCDF = toCDF(prixUSD);
  const jours = palier.jours[selectedDuree];
  const occSelected = OCCASIONNEL.offres.find(o=>o.id===selectedOcc) || OCCASIONNEL.offres[0];

  const handlePayPalier = async ()=>{
    setPaying(true);
    await new Promise(r=>setTimeout(r,1000));
    const res = acheterTicket(selectedPalier, selectedDuree);
    if(res.success){
      setSuccess({ type:"palier", ticket: res.ticket, prixUSD, prixCDF });
      refresh();
      setTimeout(()=> setSuccess(null), 3500);
    } else {
      alert(res.error);
    }
    setPaying(false);
  };

  const handlePayOcc = async ()=>{
    setPaying(true);
    await new Promise(r=>setTimeout(r,1000));
    const res = acheterOccasionnel(selectedOcc);
    if(res.success){
      // Si annonceId donné, lie l'annonce au ticket occasionnel
      if(annonceId){
        const list:any[] = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
        const idx = list.findIndex((a:any)=>a.id===annonceId);
        if(idx>=0){
          list[idx].ticketId = res.ticket.ticketId;
          list[idx].occasionnelPaye = true;
          localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
          // consomme place dans occasionnel (strict)
          const occs = JSON.parse(localStorage.getItem("wenze_occasionnel")||"[]");
          const oIdx = occs.findIndex((t:any)=>t.ticketId===res.ticket.ticketId);
          if(oIdx>=0){ occs[oIdx].imagesUsed = 1; occs[oIdx].imagesIds = [annonceId]; localStorage.setItem("wenze_occasionnel", JSON.stringify(occs)); }
        }
      }
      setSuccess({ type:"occasionnel", ticket: res.ticket, offre: occSelected });
      refresh();
      setTimeout(()=> router.push(annonceId ? `/produit/${annonceId}` : "/"), 2500);
    }
    setPaying(false);
  };

  const handleRenouveler = (ticketId:string)=>{
    const res = renouvelerTicket(ticketId);
    if(res.success){ refresh(); setSuccess({ type:"renouvel", ticket: res.ticket }); setTimeout(()=>setSuccess(null),2500); }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <div className="sticky top-0 bg-white border-b-2 border-black p-4 z-10">
        <h1 className="font-black text-[13px]">WENZE PUB - Tickets Stricts Cumulables - 0% Comm</h1>
        <p className="text-[8px] text-gray-600 mt-1">Taux {TAUX_CDF} • Règle stricte: {FREEMIUM.maxImages} images à vie Freemium 30j puis caché • Ticket = X places strictes sur Y jours (pas X/j)</p>
        {ab && (
          <div className={`mt-2 text-[10px] font-bold px-2 py-1 rounded-full border-2 ${ab.isCache ? 'bg-red-100 border-red-300 text-red-800' : ab.isPaye ? 'bg-green-100 border-green-300 text-green-800' : 'bg-yellow-100 border-yellow-300'}`}>
            {ab.badge} {ab.message} {ab.placesRestantes!==undefined?`- ${ab.placesRestantes} places libres sur ${ab.totalImagesMax||ab.placesRestantes} - Max 50 actives`:''}
          </div>
        )}
      </div>

      {success && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[340px] w-full p-6 text-center border-2 border-black">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div>
            <h2 className="font-black text-[14px] mt-3">{success.type==="renouvel"?"Renouvelé!":"Paiement approuvé!"}</h2>
            <div className="bg-[#FFFBF0] border-2 rounded-xl p-3 mt-3 text-left">
              {success.type==="palier" && <><p className="font-black text-[11px]">{PALIERS[success.ticket.palierId].badge} {success.ticket.palierId} {success.ticket.dureeId} - {success.ticket.imagesMax} places strictes / {success.ticket.jours}j</p><p className="text-[10px] text-green-700 font-bold mt-1">✅ {success.prixUSD}$ / {success.prixCDF.toLocaleString()} CDF - Ticket ajouté, n'écrase pas les anciens - Renouvelable - Suppression libère place</p><p className="text-[9px] text-gray-500 mt-1">Expire {new Date(success.ticket.expireAt).toLocaleDateString("fr-FR")} - Max 50 actives</p></>}
              {success.type==="occasionnel" && <><p className="font-black text-[11px]">{success.offre.badge} {success.offre.label} - {success.ticket.prixUSD}$</p><p className="text-[10px] text-green-700 font-bold mt-1">✅ Ticket occasionnel TOP {success.ticket.jours}j - Cumulable avec tickets pub</p></>}
              {success.type==="renouvel" && <><p className="font-black text-[11px]">♻️ {success.ticket.palierId} {success.ticket.dureeId} prolongé +{success.ticket.jours}j</p><p className="text-[10px] text-green-700 font-bold">Expire {new Date(success.ticket.expireAt).toLocaleDateString("fr-FR")}</p></>}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {ab?.isCache && (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4">
            <p className="font-black text-[12px] text-red-800">🔒 Compte caché - Freemium 30j expiré</p>
            <p className="text-[10px] text-red-700 mt-1">Tu as utilisé tes 3 images à vie. Personne ne te voit. Achète un ticket ci-dessous pour réapparaître. Tes anciens tickets expirés restent archivés.</p>
          </div>
        )}

        {/* MES TICKETS ACTIFS V6 */}
        {ab?.ticketsActifs?.length>0 && (
          <div className="bg-white border-2 border-black rounded-2xl p-4">
            <p className="font-black text-[12px]">🎫 Mes tickets actifs - Strict & Cumulable ({ab.ticketsActifs.length})</p>
            <p className="text-[9px] text-gray-600 mt-1">Principe: 1 ticket 4 places/7j = 4 places max sur 7j, pas 4/j. Suppression libère place. Renouvelable.</p>
            <div className="mt-3 space-y-2">
              {ab.ticketsActifs.map((t:any)=>(
                <div key={t.ticketId} className="border-2 rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-black text-[11px]">{PALIERS[t.palierId]?.badge} {t.palierId} {t.dureeId} - {t.imagesUsed}/{t.imagesMax} places strictes</p>
                      <p className="text-[9px] text-gray-600">{t.jours}j - Expire {new Date(t.expireAt).toLocaleDateString("fr-FR")} - {Math.ceil((new Date(t.expireAt).getTime()-Date.now())/86400000)}j restants</p>
                      <div className="mt-1 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden"><div className="bg-black h-full" style={{width:`${(t.imagesUsed/t.imagesMax)*100}%`}}></div></div>
                      <p className="text-[8px] text-gray-500 mt-1">{t.imagesMax - t.imagesUsed} places libres - Peut poster 1 image/j jusqu'à {t.imagesMax}</p>
                    </div>
                    <div className="ml-2 flex flex-col gap-1">
                      <button onClick={()=>handleRenouveler(t.ticketId)} className="bg-black text-white px-3 py-1 rounded-full text-[8px] font-black">♻️ Renouveler</button>
                      <Link href={`/publier?ticket=${t.ticketId}`} className="bg-green-600 text-white px-3 py-1 rounded-full text-[8px] font-black text-center">📤 Publier dedans</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-500 mt-2">Total: {ab.placesRestantes} places libres / {ab.totalImagesMax} achetées - Max 50 actives global - Occasionnel cumulable</p>
          </div>
        )}

        {ab?.ticketsOccasionnel?.length>0 && (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-3">
            <p className="font-black text-[11px]">🎟️ Tickets occasionnels actifs ({ab.ticketsOccasionnel.length}) - Cumulables avec pub</p>
            <div className="mt-2 space-y-1">
              {ab.ticketsOccasionnel.map((t:any)=>(
                <div key={t.ticketId} className="text-[9px] border rounded-lg p-2 bg-white flex justify-between"><span>{t.offreId||t.ticketId} - {t.imagesUsed}/{t.imagesMax}</span><span>{Math.ceil((new Date(t.expireAt).getTime()-Date.now())/86400000)}j restants</span></div>
              ))}
            </div>
          </div>
        )}

        {isOccasionnel ? (
          <div className="bg-white border-2 border-black rounded-2xl p-4">
            <p className="font-black text-[13px]">🎟️ Vente Occasionnelle - Client (Pas de freemium) - Ticket strict</p>
            <p className="text-[9px] text-gray-600 mt-1">1 image = 0.2$/1j ou 1$/7j. Ticket strict: 1 place sur 1j ou 7j. Cumulable avec tickets pub. Suppression libère place. Anti-spam.</p>
            <div className="mt-4 grid gap-2">
              {OCCASIONNEL.offres.map(o=>(
                <div key={o.id} onClick={()=>setSelectedOcc(o.id)} className={`border-2 rounded-xl p-3 cursor-pointer flex justify-between items-center ${selectedOcc===o.id?"border-black bg-black text-white":"border-gray-200 bg-white"}`}>
                  <div><p className="font-black text-[11px]">{o.badge} {o.label}</p><p className="text-[8px] opacity-70">{o.jours}j strict - {o.images} place(s) - N'écrase rien</p></div>
                  <p className="font-black text-[11px]">{o.prixUSD}$</p>
                </div>
              ))}
            </div>
            <button onClick={handlePayOcc} disabled={paying} className="mt-4 w-full bg-black text-white py-4 rounded-full font-black text-[12px] disabled:opacity-50">
              {paying?`Paiement...`:`Acheter ticket occ ${occSelected.prixUSD}$ / ${occSelected.prixCDF} CDF - ${occSelected.jours}j strict`}
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white border-2 border-black rounded-2xl p-4">
              <p className="font-black text-[13px]">Acheter un nouveau ticket (n'écrase pas les anciens)</p>
              <p className="text-[9px] text-gray-600 mt-1">Même règle pour 1j/7j/30j: X places strictes sur Y jours. Ex: STANDARD 4 places/7j = tu peux poster 1/j pendant 4j, pas 4/j pendant 7j. Renouvelable, cumulable, suppression libère place.</p>
              
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["STANDARD","PRO","PREMIUM"] as const).map(k=>{
                  const p = PALIERS[k];
                  return <div key={k} onClick={()=>setSelectedPalier(k)} className={`border-2 rounded-xl p-3 cursor-pointer text-center ${selectedPalier===k?"border-black bg-black text-white":"border-gray-200"}`}><p className="text-[14px]">{p.badge}</p><p className="font-black text-[10px]">{k}</p><p className="text-[7px]">{p.imagesMin}-{p.imagesMax} places strictes</p><p className="text-[7px]">{p.videos}</p></div>
                })}
              </div>

              <div className="mt-3">
                <p className="font-black text-[10px]">Durée stricte pour {palier.nom}:</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["1j","7j","30j"] as const).map(d=>{
                    const prix = palier.prix[d];
                    const active = selectedDuree===d;
                    return <div key={d} onClick={()=>setSelectedDuree(d)} className={`border-2 rounded-xl p-3 cursor-pointer text-center relative ${active?"border-black bg-[#FFFBF0]":"border-gray-200"} ${d==="30j"?"ring-2 ring-green-400":""}`}><p className="font-black text-[12px]">{d}</p><p className="font-black text-[11px] mt-1">{prix}$</p><p className="text-[8px] text-gray-500">{toCDF(prix).toLocaleString()} CDF</p><p className="text-[7px] mt-1 font-bold">{palier.imagesMax} places strictes sur {palier.jours[d]}j</p></div>
                  })}
                </div>
              </div>

              <div className="mt-3 bg-green-50 border-2 border-green-200 rounded-xl p-3">
                <p className="font-black text-[11px]">{palier.badge} {palier.nom} {selectedDuree} = {palier.imagesMax} places strictes sur {jours}j</p>
                <p className="text-[9px] mt-1">✅ Strict: 1 ticket = {palier.imagesMax} places max sur {jours}j, pas {palier.imagesMax}/j. Tu peux poster 1 image/j jusqu'à {palier.imagesMax}. Renouvelable ♻️, cumulable avec autres tickets, occasionnel en parallèle, suppression libère place. Max 50 actives.</p>
                <p className="text-[9px] mt-1 font-bold">💰 {prixUSD}$ / {prixCDF.toLocaleString()} CDF</p>
              </div>

              <button onClick={handlePayPalier} disabled={paying} className="mt-4 w-full bg-black text-white py-4 rounded-full font-black text-[12px] disabled:opacity-50">
                {paying?`Achat...`:`Acheter nouveau ticket ${selectedPalier} ${selectedDuree} - ${prixUSD}$ / ${prixCDF.toLocaleString()} CDF`}
              </button>
              <p className="text-[8px] text-gray-500 text-center mt-2">Ce ticket s'ajoute aux anciens, ne les écrase pas. Airtel/Orange/M-Pesa - Activation instantanée</p>
            </div>

            <div className="bg-white border-2 rounded-2xl p-4">
              <p className="font-black text-[11px]">Comparatif strict (même règle 1j/7j/30j)</p>
              <div className="mt-3 space-y-2 text-[10px]">
                <div className="grid grid-cols-4 gap-2 font-black border-b pb-2"><span>Palier</span><span>Places strictes</span><span>Vidéo</span><span>Prix 30j</span></div>
                <div className="grid grid-cols-4 gap-2"><span>⭐ STANDARD</span><span>1-4 sur 1j/7j/30j</span><span>1x15s</span><span className="font-black">5$</span></div>
                <div className="grid grid-cols-4 gap-2"><span>🚀 PRO</span><span>5-10 sur 1j/7j/30j</span><span>1x60s</span><span className="font-black">10$</span></div>
                <div className="grid grid-cols-4 gap-2"><span>👑 PREMIUM</span><span>11-30 sur 1j/7j/30j</span><span>2x60s</span><span className="font-black">20$</span></div>
                <div className="grid grid-cols-4 gap-2 text-gray-500"><span>🆓 Freemium</span><span>3 à vie strictes</span><span>0</span><span>0$ / 30j puis caché</span></div>
              </div>
            </div>
          </>
        )}

        <div className="text-center space-y-2">
          <Link href="/" className="block text-[10px] text-gray-500">← Accueil - 0% commission - On vend visibilité, pas produits</Link>
          <Link href="/abonnement?mode=occasionnel" className="block text-[10px] font-bold underline">Client occasionnel 0.2$ cumulable →</Link>
        </div>
      </div>
    </div>
  );
}

export default function PageAbonnement(){
  return <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">Chargement WENZE PUB V6 Strict...</div>}><AbonnementContent/></Suspense>
                  }
