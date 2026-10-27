"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TAUX_CDF, toCDF, verifierAbonnement, checkFreemiumLimit, getSoldeWPay, FORMULES } from "@/lib/paiement";
import { getCategorieById, normalizeCategorie, getPrixByCategorie, CATEGORIES_WENZE } from "@/lib/categories";

function cleanWa(n: string){ return (n||"").toString().replace(/[^0-9]/g,""); }
function formatDate(d: string | number){
  try{
    const date = typeof d === "number" ? new Date(d) : new Date(d);
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) + " " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }catch{ return String(d); }
}

export default function BoutiquePage() {
  const params = useParams();
  const idParam = decodeURIComponent(params.id as string);
  const waSearch = cleanWa(idParam);

  const [boutique, setBoutique] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [abInfo, setAbInfo] = useState<any>(null);
  const [limitInfo, setLimitInfo] = useState<any>(null);
  const [solde, setSolde] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"annonces" | "operations">("annonces");

  useEffect(() => {
    try{
      const allRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allRaw ? JSON.parse(allRaw) : [];
      let found = allUsers.find((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp)===waSearch);
      if(!found){
        const myRaw = localStorage.getItem("wenze_user");
        if(myRaw){
          const my = JSON.parse(myRaw);
          if(cleanWa(my.ownerWhatsapp||my.whatsapp)===waSearch) found = my;
        }
      }
      if(found){
        const fixedCat = normalizeCategorie(found.categorieId || found.categorie || "commerces-services");
        const catObj = getCategorieById(fixedCat);
        found = {...found, categorieId: fixedCat, categorieTitre: catObj?.titre || fixedCat};
      }
      setBoutique(found);

      const listRaw = localStorage.getItem("wenze_annonces_list");
      const list = listRaw ? JSON.parse(listRaw) : [];
      const res = list.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp)===waSearch);
      res.sort((a:any,b:any)=> new Date(b.createdAt||b.date).getTime() - new Date(a.createdAt||a.date).getTime());
      setAnnonces(res);

      const transRaw = localStorage.getItem("wenze_transactions");
      const trans = transRaw ? JSON.parse(transRaw) : [];
      const dernierRaw = localStorage.getItem("dernier_paiement");
      const dernier = dernierRaw ? JSON.parse(dernierRaw) : null;
      const allTrans = dernier ? [...trans, dernier] : trans;
      const uniq: any[] = [];
      const seen: any = {};
      for(let k=0;k<allTrans.length;k++){
        const t = allTrans[k];
        const tid = t.transactionId || t.transaction || t.id;
        if(tid && !seen[tid]){ seen[tid]=true; uniq.push(t); }
      }
      uniq.sort((a,b)=> new Date(b.date||0).getTime() - new Date(a.date||0).getTime());
      setTransactions(uniq.slice(0,20));

      setAbInfo(verifierAbonnement());
      setLimitInfo(checkFreemiumLimit());
      setSolde(getSoldeWPay());
    }catch{}
    setLoading(false);
  }, [waSearch, idParam]);

  const catInfo = useMemo(()=> {
    if(!boutique) return null;
    return getCategorieById(boutique.categorieId) || getCategorieById(normalizeCategorie(boutique.categorieId||boutique.categorie||"commerces-services"));
  }, [boutique]);

  const prixInfo = useMemo(()=> catInfo ? getPrixByCategorie(catInfo.id) : { prixUSD: 5, prixCDF: 11500, label: "🛍️ Commerces & Services" }, [catInfo]);

  if(loading) return <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">Chargement boutique... Taux {TAUX_CDF}</div>;

  const abActif = abInfo && abInfo.actif;
  const expireDans = abInfo ? abInfo.expireDans : 0;

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/boutiques" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[13px] truncate">{boutique ? boutique.nom : idParam}</h1><p className="text-[10px] text-gray-500">Taux {TAUX_CDF} • {catInfo?.icon} {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF • 0% comm</p></div>
        <span className={`text-[10px] px-2 py-1 rounded-full font-black ${catInfo?.id==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixInfo.prixUSD}$</span>
      </header>

      <div className="p-4">
        {/* BANNER ABONNEMENT WENZE 2.0 - 2 PRIX */}
        <div className={`rounded-2xl p-4 mb-4 border-2 ${abActif ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className={`font-black text-[13px] ${abActif ? "text-green-800" : "text-orange-800"}`}>
                {abActif ? `✅ ${abInfo.label} actif - ${expireDans}j restants - ${abInfo.categorie}` : "⚠️ Freemium - 3 gratuites - Passe 🛍️ 5$ ou 🏭 10$"}
              </p>
              <p className={`text-[11px] mt-1 ${abActif ? "text-green-700" : "text-orange-700"}`}>
                {abActif 
                  ? `Payé ${abInfo.prixUSD}$ / ${(abInfo.prixUSD*TAUX_CDF).toLocaleString()} CDF - Expire ${formatDate(abInfo.expire)} - Boutique fonctionnelle - Taux ${TAUX_CDF}` 
                  : `🛍️ Commerces & Services 5$ / 11 500 CDF - Détail, service, électricité, maçon, coiffure etc • 🏭 Gros & Autres 10$ / 23 000 CDF - Production, import`}
              </p>
              {limitInfo && <p className="text-[10px] mt-1 text-gray-600">Annonces: {limitInfo.count} / {limitInfo.isPro ? "∞" : "3"} - W-Pay: {solde.toLocaleString()} CDF</p>}
            </div>
            <span className={`ml-2 text-[8px] px-2 py-1 rounded-full font-black ${abActif ? "bg-green-600 text-white" : "bg-orange-600 text-white"}`}>{abActif ? "PAYÉ" : "FREEMIUM"}</span>
          </div>
          {!abActif && <Link href="/abonnement" className="mt-3 block bg-black text-white text-center py-3 rounded-full font-bold text-[12px]">Payer 🛍️ 5$ / 🏭 10$ - Débloquer - Taux {TAUX_CDF}</Link>}
          {abActif && <p className="mt-2 text-[9px] text-green-600 bg-white border border-green-200 rounded-lg p-2">💡 WENZE 0% commission sur ventes - Nous gagnons seulement 🛍️ 5$ ou 🏭 10$ abonnement + Boost 2$ + Vidéo - Taux fixe {TAUX_CDF}</p>}
        </div>

        {boutique && (
          <div className="bg-white border rounded-2xl p-4 mb-4">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-full bg-[#6C3CE0]/10 flex items-center justify-center text-2xl">{catInfo ? catInfo.icon : "🏪"}</div>
              <div className="flex-1">
                <p className="font-black text-[15px]">{boutique.nom}</p>
                <p className="text-[11px] text-gray-600">{catInfo?.icon} {catInfo?.titre} - {catInfo?.regime} - {boutique.ville || "Kinshasa"} {boutique.commune ? "• "+boutique.commune : ""}</p>
                <p className="text-[10px] text-gray-500 mt-1">{prixInfo.label} - {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF} - 0% comm</p>
              </div>
            </div>
            <div className="mt-3 bg-black text-white rounded-xl p-3 text-[11px] flex justify-between"><span>{catInfo?.icon} {catInfo?.titre} • {catInfo?.regime}</span><span className="font-black">{prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF</span></div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button onClick={()=> setTab("annonces")} className={`flex-1 py-3 rounded-full font-bold text-[12px] ${tab==="annonces" ? "bg-black text-white" : "bg-white border"}`}>Annonces ({annonces.length})</button>
          <button onClick={()=> setTab("operations")} className={`flex-1 py-3 rounded-full font-bold text-[12px] ${tab==="operations" ? "bg-[#6C3CE0] text-white" : "bg-white border"}`}>Opérations ({transactions.length}) {abActif ? "• PAYÉ" : ""}</button>
        </div>

        {tab==="annonces" ? (
          <div className="grid gap-2">
            {annonces.length===0 ? (
              <div className="bg-white border-2 border-dashed rounded-2xl p-6 text-center"><p className="font-bold text-[12px]">Pas d'annonces</p><p className="text-[10px] text-gray-500">{catInfo?.icon} {catInfo?.titre} • {prixInfo.prixUSD}$ • Taux {TAUX_CDF}</p></div>
            ) : annonces.map((a:any)=>{
              const prixFinal = a.flash && a.flashRemise ? Math.round(a.prix * (1 - a.flashRemise/100)) : a.prix;
              return (
                <div key={a.id} className="bg-white border rounded-xl p-3 flex gap-3 relative">
                  {a.flash && <span className="absolute top-1 right-1 bg-red-600 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black">-{a.flashRemise}%</span>}
                  <span className={`absolute top-1 left-1 text-[7px] px-1.5 py-0.5 rounded-full font-bold ${a.categorieId==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{a.categorieId==="gros-autres"?"🏭 10$":"🛍️ 5$"}</span>
                  <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">{a.photo ? <img src={a.photo} className="object-contain" alt=""/> : "📦"}</div>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold">{a.titre}</p>
                    <p className="text-[10px] text-gray-500">{a.categorieTitre||a.categorie} • {catInfo?.icon}</p>
                    <p className="text-[11px] font-black mt-1">{a.flash ? <><span className="line-through text-gray-400 text-[9px]">{a.prix}$</span> <span className="text-red-600">{prixFinal}$ / {toCDF(prixFinal).toLocaleString()} CDF</span></> : a.prix+"$ / "+toCDF(a.prix).toLocaleString()+" CDF"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2">
            <div className={`rounded-xl p-3 text-[11px] ${abActif ? "bg-green-600 text-white" : "bg-black text-white"}`}>
              <p className="font-bold">{abActif ? `✅ ${abInfo.label} PAYÉ - ${abInfo.categorie}` : "❌ Aucun abonnement 5$/10$ payé"}</p>
              <p className="opacity-80 mt-1 text-[10px]">{abActif ? `Payé ${abInfo.prixUSD}$ / ${(abInfo.prixUSD*TAUX_CDF).toLocaleString()} CDF - Expire ${expireDans}j - Taux ${TAUX_CDF}` : `WENZE: 🛍️ 5$ Commerces/Services + 🏭 10$ Gros/Autres - 0% commission - Taux ${TAUX_CDF}`}</p>
            </div>
            {transactions.length===0 ? (
              <div className="bg-white border rounded-2xl p-6 text-center">
                <p className="font-bold text-[12px]">Aucune opération</p>
                <p className="text-[10px] text-gray-500 mt-1">Freemium 3 gratuites - 🛍️ 5$ ou 🏭 10$ pour illimité - Taux {TAUX_CDF}</p>
                <Link href="/abonnement" className="mt-3 inline-block bg-[#6C3CE0] text-white px-5 py-2 rounded-full text-[11px] font-bold">Payer 🛍️ 5$ / 🏭 10$</Link>
              </div>
            ) : transactions.map((t:any, idx:number)=>(
              <div key={idx} className="bg-white border rounded-xl p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-[12px]">{t.nom || t.type || "Paiement"} {t.success ? "✅ PAYÉ" : "❌"}</p>
                    <p className="text-[10px] text-gray-500">{t.confirmation ? t.confirmation.formule : t.type} - {t.prix ? t.prix+"$" : ""} {t.prixCDF ? "/ "+t.prixCDF.toLocaleString()+" CDF" : ""}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{formatDate(t.date)} • Trans: {t.transactionId || t.transaction || t.id} • Taux {t.taux || TAUX_CDF}</p>
                  </div>
                  <span className={`text-[8px] px-2 py-1 rounded-full font-bold ${t.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700"}`}>{t.success ? "PAYÉ" : "ÉCHEC"}</span>
                </div>
              </div>
            ))}
            <div className="bg-white border-2 border-black rounded-2xl p-4 mt-2">
              <p className="font-black text-[12px]">WENZE 2.0 - À-propos</p>
              <div className="text-[10px] text-gray-700 mt-2 space-y-1">
                <p>• <b>Remise Flash:</b> 100% pour vous vendeur - <b>WENZE 0% commission</b></p>
                <p>• <b>Nous gagnons:</b> 🛍️ Commerces/Services 5$ / 11 500 CDF + 🏭 Gros/Autres 10$ / 23 000 CDF + Boost 2$ + Vidéo</p>
                <p>• <b>Taux fixe:</b> {TAUX_CDF} CDF - Pas de frais cachés - {CATEGORIES_WENZE.length} catégories</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-2">
          <Link href="/boutiques" className="bg-white border p-3 rounded-xl text-center font-bold text-[12px]">Voir toutes boutiques - {CATEGORIES_WENZE.length} catégories</Link>
          <Link href="/abonnement" className="bg-[#6C3CE0] text-white p-3 rounded-xl text-center font-bold text-[12px]">Gérer 🛍️ 5$ / 🏭 10$ - Taux {TAUX_CDF}</Link>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
