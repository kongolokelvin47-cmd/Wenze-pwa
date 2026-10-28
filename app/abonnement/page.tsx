"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FORMULES, PUBS, TAUX_CDF, verifierAbonnement, getSoldeWPay, getPrixByCategorie, activerAbonnement } from "@/lib/paiement";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";

export const dynamic = 'force-dynamic';

function AbonnementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catFromUrl = normalizeCategorie(searchParams.get("cat") || searchParams.get("categorie") || "");
  const mode = searchParams.get("mode"); // occasionnel, boutique, pub-video
  const boostId = searchParams.get("boost");
  const pubId = searchParams.get("pub"); // id pub vidéo
  const annonceId = searchParams.get("id");

  const [ab, setAb] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const isOccasionnel = mode === "occasionnel" || catFromUrl === "client";
  const isPubVideo = mode === "pub-video" || !!pubId;
  const catObj = getCategorieById(catFromUrl);

  const BOOSTS = [
    { id:"boost-1", label:"Boost 24h TOP", prixUSD:1, prixCDF:2300, dureeJ:1, type:"annonce" },
    { id:"boost-3", label:"Boost 3 jours", prixUSD:3, prixCDF:6900, dureeJ:3, type:"annonce" },
    { id:"boost-7", label:"Boost 7 jours MAX", prixUSD:5, prixCDF:11500, dureeJ:7, type:"annonce" },
  ];

  // PUB VIDEO - depuis lib/paiement PUBS
  const pubVideoObj = PUBS?.find((p:any)=>p.id===pubId) || (isPubVideo ? PUBS?.[0] : null);

  const boostObj = BOOSTS.find(b=>b.id===boostId) || BOOSTS[0];
  const prixBoutique = getPrixByCategorie(catFromUrl);

  let prixUSD = prixBoutique.prixUSD;
  let prixCDF = prixBoutique.prixCDF;
  let label = `${catObj?.titre} ${prixUSD}$`;
  let dureeJ = 30;

  if(isOccasionnel){ prixUSD=boostObj.prixUSD; prixCDF=boostObj.prixCDF; label=boostObj.label; dureeJ=boostObj.dureeJ; }
  if(isPubVideo && pubVideoObj){ prixUSD=pubVideoObj.prixUSD; prixCDF=pubVideoObj.prixCDF; label=`Pub Vidéo ${pubVideoObj.label} ${prixUSD}$`; dureeJ=pubVideoObj.dureeJ||7; }

  useEffect(()=>{
    try{ setAb(verifierAbonnement()); }catch{}
  },[]);

  const handlePay = async ()=>{
    setPaying(true);
    try{
      const user = JSON.parse(localStorage.getItem("wenze_user")||"{}");
      await new Promise(r=>setTimeout(r,1400));

      if(isOccasionnel && annonceId){
        const list:any[] = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
        const idx = list.findIndex((a:any)=>a.id===annonceId);
        if(idx>=0){
          list[idx].boostUntil = new Date(Date.now()+dureeJ*86400000).toISOString();
          list[idx].boostType = boostObj.id;
          list[idx].boostPrixUSD = prixUSD;
          list[idx].boostedAt = new Date().toISOString();
          localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
        }
        const { notifyBoostPayed } = await import("@/lib/notifications");
        notifyBoostPayed(user, annonceId, { ...boostObj, prixUSD, prixCDF });
        setSuccess({ type:"boost", label, prixUSD, prixCDF, annonceId, dureeJ });
        setTimeout(()=> router.push(`/produit/${annonceId}`), 2000);

      } else if(isPubVideo){
        // ✅ PUB VIDEO PAYÉE - Sauve expireAt + notif + rappel J-5 J-1
        const expireAt = new Date(Date.now()+dureeJ*86400000).toISOString();
        const pubsPayees:any[] = JSON.parse(localStorage.getItem("wenze_pubs_video")||"[]");
        pubsPayees.push({ id:`pub-${Date.now()}`, pubId: pubVideoObj?.id, label, prixUSD, prixCDF, expireAt, createdAt:new Date().toISOString(), userId:user.id||user.ownerWhatsapp });
        localStorage.setItem("wenze_pubs_video", JSON.stringify(pubsPayees));
        // Réutilise activerAbonnement pour que checkAndNotifyExpirations voit expireAt
        localStorage.setItem("wenze_abonnement", JSON.stringify({ prixUSD, prixCDF, expireAt, type:"pub-video", label, createdAt:new Date().toISOString() }));
        try{
          const { notifyAbonnementPayed, addNotification } = await import("@/lib/notifications");
          notifyAbonnementPayed(user, prixUSD, prixCDF);
          // Notif spécifique pub vidéo
          addNotification({ type:"pub-video-payee", title:`🎬 Pub Vidéo ${label} activée!`, message:`Ta pub vidéo ${label} ${prixUSD}$ est TOP sur /video ${dureeJ}j + 🔔 notif clients + rappel J-1`, data:{ pubId: pubVideoObj?.id, expireAt } } as any);
        }catch{}
        setSuccess({ type:"pub-video", label, prixUSD, prixCDF, expireAt, dureeJ });
        setTimeout(()=> router.push("/video"), 2000);

      } else {
        // ✅ BOUTIQUE 5$/10$
        const expireAt = activerAbonnement(prixUSD, prixCDF);
        const { notifyAbonnementPayed } = await import("@/lib/notifications");
        notifyAbonnementPayed(user, prixUSD, prixCDF);
        setSuccess({ type:"abonnement", label, prixUSD, prixCDF, expireAt, dureeJ:30 });
        setTimeout(()=> router.push("/publier"), 2000);
      }
    } catch{ setPaying(false); }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <div className="sticky top-0 bg-white border-b p-4 z-10">
        <h1 className="font-black text-[15px]">WENZE WENZE BUSINESS - Paiement {isPubVideo?"Pub Vidéo":isOccasionnel?"Boost":"Boutique"}</h1>
        <p className="text-[9px] text-gray-500 mt-1">Taux {TAUX_CDF} CDF • 0% comm • Pub vidéo incluse • Rappels J-5 J-1 • 🔔 notif clients</p>
        {ab && <p className="text-[10px] mt-1 font-bold">Statut: {ab.label}</p>}
      </div>

      {success && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[340px] w-full p-6 text-center border-2 border-black">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div>
            <h2 className="font-black text-[17px] mt-4">Paiement approuvé!</h2>
            <div className="bg-[#FFFBF0] border-2 rounded-xl p-3 mt-3 text-left">
              <p className="font-black text-[12px]">{success.label} - {success.prixUSD}$ / {success.prixCDF.toLocaleString()} CDF</p>
              {success.type==="pub-video" && <p className="text-[10px] text-green-700 font-bold mt-1">🎬 Pub Vidéo TOP sur /video {success.dureeJ}j + 🔔 notif à tous les clients + rappel J-5 J-1 + badge vidéo</p>}
              {success.type==="boost" && <p className="text-[10px] text-green-700 font-bold mt-1">🚀 Boost TOP {success.dureeJ}j + 🔔 notif clients + rappel 24h</p>}
              {success.type==="abonnement" && <p className="text-[10px] text-green-700 font-bold mt-1">✅ Boutique 30j + 🔔 notif clients à chaque pub + boost gratuit + rappel J-5 J-1</p>}
              {success.expireAt && <p className="text-[9px] text-gray-500 mt-1">Expire {new Date(success.expireAt).toLocaleDateString("fr-FR")} - Rappel auto</p>}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {isPubVideo && (
          <div className="bg-white border-2 border-purple-300 rounded-2xl p-4">
            <p className="font-black text-[13px]">🎬 Publicité Vidéo WENZE WENZE BUSINESS</p>
            <p className="text-[11px] text-gray-600 mt-1">Ta vidéo sera en TOP sur /video + page d'accueil + 🔔 notif à tous les clients comme une boutique 5$/10$.</p>
            <div className="mt-3 grid gap-2">
              {PUBS?.map((p:any)=>(
                <div key={p.id} className={`border-2 rounded-xl p-3 cursor-pointer ${pubId===p.id?"border-purple-600 bg-purple-50":"border-gray-200"}`} onClick={()=>router.push(`/abonnement?mode=pub-video&pub=${p.id}`)}>
                  <p className="font-black text-[12px]">{p.label} - {p.prixUSD}$ / {p.prixCDF?.toLocaleString()||toCDF(p.prixUSD)} CDF - {p.dureeJ||7}j</p>
                  <p className="text-[10px] text-gray-600">{p.desc||`Vidéo TOP ${p.dureeJ}j + notif clients + rappel J-1`}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-purple-50 border-2 border-purple-200 rounded-xl p-3">
              <p className="font-black text-[12px]">{label} - {prixUSD}$ sélectionnée</p>
              <p className="text-[10px] mt-1">TOP /video {dureeJ}j + 🔔 broadcast clients + rappel J-5 J-1 + badge 🎬</p>
            </div>
          </div>
        )}

        {isOccasionnel && !isPubVideo && (
          <div className="bg-white border-2 rounded-2xl p-4">
            <p className="font-black text-[13px]">📦 Boost occasionnel</p>
            <div className="mt-3 grid gap-2">
              {BOOSTS.map(b=>(
                <div key={b.id} className={`border-2 rounded-xl p-3 cursor-pointer ${boostId===b.id?"border-black bg-[#FFFBF0]":"border-gray-200"}`} onClick={()=>router.push(`/abonnement?mode=occasionnel&boost=${b.id}&id=${annonceId||""}`)}>
                  <p className="font-black text-[12px]">{b.label} - {b.prixUSD}$ / {b.prixCDF} CDF</p>
                  <p className="text-[10px] text-gray-600">TOP {b.dureeJ}j + 🔔 notif clients</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isOccasionnel && !isPubVideo && (
          <div className="bg-white border-2 rounded-2xl p-4">
            <p className="font-black text-[13px]">{catObj?.icon} {catObj?.titre} - {prixUSD}$</p>
            <div className="mt-3 bg-green-50 border-2 border-green-200 rounded-xl p-3">
              <p className="text-[10px]">✅ Illimité images+vidéos<br/>🔔 Notif clients à chaque publication<br/>🚀 Boost gratuit 1/mois<br/>⏰ Rappel J-5 J-1<br/>0% commission</p>
            </div>
            <div className="mt-3">
              <p className="font-black text-[11px]">FORMULES disponibles:</p>
              <div className="grid gap-2 mt-2">
                {FORMULES?.map((f:any)=><div key={f.id} className="border rounded-xl p-2 text-[11px]"><span className="font-black">{f.label} {f.prixUSD}$</span> - {f.duree}</div>)}
              </div>
            </div>
          </div>
        )}

        <button onClick={handlePay} disabled={paying} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px] disabled:opacity-50">
          {paying?`Paiement ${prixUSD}$...`:`Payer ${prixUSD}$ / ${prixCDF.toLocaleString()} CDF - ${isPubVideo?"🎬 Pub Vidéo":"Mobile Money"}`}
        </button>
        <p className="text-[9px] text-gray-500 text-center">Airtel/Orange/M-Pesa • Pub vidéo + Boutique + Boost = même système 🔔 notif + rappel J-5 J-1 • WENZE WENZE BUSINESS</p>
        <Link href={isPubVideo?"/video":"/"} className="block text-center text-[11px] text-gray-500">← Retour</Link>
      </div>
    </div>
  );
}

export default function PageAbonnement(){
  return <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">Chargement WENZE WENZE BUSINESS...</div>}><AbonnementContent/></Suspense>
          }
