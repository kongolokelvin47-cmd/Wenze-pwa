"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TAUX_CDF, toCDF, verifierAbonnement, checkFreemiumLimit, getSoldeWPay } from "@/lib/paiement";
import { getCategorieById, normalizeCategorie, getActiviteById } from "@/lib/categories";

function cleanWa(n: string) {
  return (n || "").toString().replace(/[^0-9]/g, "");
}

function formatDate(d: string | number) {
  try {
    const date = typeof d === "number" ? new Date(d) : new Date(d);
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) + " " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch { return String(d); }
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
    try {
      const allRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allRaw ? JSON.parse(allRaw) : [];
      let found = null;
      for (let i = 0; i < allUsers.length; i++) {
        if (cleanWa(allUsers[i].ownerWhatsapp || allUsers[i].whatsapp) === waSearch) { found = allUsers[i]; break; }
      }
      if (!found) {
        const myRaw = localStorage.getItem("wenze_user");
        if (myRaw) {
          const my = JSON.parse(myRaw);
          if (cleanWa(my.ownerWhatsapp || my.whatsapp) === waSearch) found = my;
        }
      }
      setBoutique(found);

      const listRaw = localStorage.getItem("wenze_annonces_list");
      const list = listRaw ? JSON.parse(listRaw) : [];
      const res: any[] = [];
      for (let j = 0; j < list.length; j++) {
        if (cleanWa(list[j].ownerWhatsapp || list[j].whatsapp) === waSearch) res.push(list[j]);
      }
      res.sort((a,b)=> new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setAnnonces(res);

      // Opérations effectuées - abonnement + pubs
      const transRaw = localStorage.getItem("wenze_transactions");
      const trans = transRaw ? JSON.parse(transRaw) : [];
      // Filtre pour cette boutique: transactions globales (pas par wa, car paiement est par device)
      // On montre toutes les transactions locales + dernier paiement
      const dernierRaw = localStorage.getItem("dernier_paiement");
      const dernier = dernierRaw ? JSON.parse(dernierRaw) : null;
      const allTrans = dernier ? [...trans, dernier] : trans;
      // Deduplicate par transactionId
      const uniq: any[] = [];
      const seen: any = {};
      for (let k = 0; k < allTrans.length; k++) {
        const t = allTrans[k];
        const tid = t.transactionId || t.transaction || t.id;
        if (tid && !seen[tid]) { seen[tid]=true; uniq.push(t); }
      }
      uniq.sort((a,b)=> new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setTransactions(uniq.slice(0, 20));

      setAbInfo(verifierAbonnement());
      setLimitInfo(checkFreemiumLimit());
      setSolde(getSoldeWPay());
    } catch {}
    setLoading(false);
  }, [waSearch, idParam]);

  const catInfo = useMemo(() => {
    if (!boutique) return null;
    const cid = boutique.categorieId || boutique.categorie || "commerce";
    return getCategorieById(cid) || getCategorieById(normalizeCategorie(cid)) || null;
  }, [boutique]);

  const actInfo = useMemo(() => {
    if (!boutique || !catInfo) return null;
    return getActiviteById(catInfo.id, boutique.activiteId || boutique.activite || "") || null;
  }, [boutique, catInfo]);

  if (loading) {
    return <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">Chargement boutique... Taux {TAUX_CDF}</div>;
  }

  const abActif = abInfo && abInfo.actif;
  const expireDans = abInfo ? abInfo.expireDans : 0;
  const isOwner = typeof window !== "undefined" ? (() => { try { const u = JSON.parse(localStorage.getItem("wenze_user")||"{}"); return cleanWa(u.ownerWhatsapp||u.whatsapp)===waSearch; } catch { return false; } })() : false;

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/profil" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[13px] truncate">{boutique ? boutique.nom : idParam}</h1><p className="text-[10px] text-gray-500">Taux {TAUX_CDF} CDF fixe - Commission 0% - Abonnement seulement</p></div>
      </header>

      <div className="p-4">
        {/* BANNER ABONNEMENT AUTOMATIQUE */}
        <div className={`rounded-2xl p-4 mb-4 border-2 ${abActif ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className={`font-black text-[13px] ${abActif ? "text-green-800" : "text-orange-800"}`}>
                {abActif ? `✅ Abonnement ${abInfo.type.toUpperCase()} actif - ${expireDans}j restants` : "⚠️ Abonnement expiré / Freemium - 3 gratuites"}
              </p>
              <p className={`text-[11px] mt-1 ${abActif ? "text-green-700" : "text-orange-700"}`}>
                {abActif 
                  ? `Vous avez payé l'abonnement ${abInfo.type} - Expire le ${formatDate(abInfo.expire)} - Boutique fonctionnelle garantie - Taux ${TAUX_CDF}` 
                  : "Vous n'avez pas payé d'abonnement ou il a expiré - Passez Pro 5$ pour illimité - WENZE ne prend pas de commission sur vos remises"}
              </p>
              {limitInfo && (
                <p className="text-[10px] mt-1 text-gray-600">
                  Annonces: {limitInfo.count} / {limitInfo.isPro ? "∞" : "3"} - Restantes: {limitInfo.annoncesRestantes} - W-Pay: {solde.toLocaleString("fr-FR")} CDF
                </p>
              )}
            </div>
            <span className={`ml-2 text-[8px] px-2 py-1 rounded-full font-black ${abActif ? "bg-green-600 text-white" : "bg-orange-600 text-white"}`}>{abActif ? "PAYÉ" : "NON PAYÉ"}</span>
          </div>
          {!abActif && (
            <Link href="/abonnement" className="mt-3 block bg-black text-white text-center py-3 rounded-full font-bold text-[12px]">Payer Abonnement Pro 5$ / 11 500 CDF - Débloquer</Link>
          )}
          {abActif && (
            <p className="mt-2 text-[9px] text-green-600 bg-white border border-green-200 rounded-lg p-2">
              💡 Rappel automatique: Plateforme ne touche pas commission sur vos remises Flash - Le client paie remise directement - Nous gagnons seulement abonnement {abInfo.type} {abInfo.formule ? abInfo.formule : ""} + publicité Boost/Vidéo - Taux fixe {TAUX_CDF}
            </p>
          )}
        </div>

        {boutique && (
          <div className="bg-white border rounded-2xl p-4 mb-4">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-full bg-[#6C3CE0]/10 flex items-center justify-center text-2xl">{catInfo ? catInfo.icon : "👤"}</div>
              <div className="flex-1">
                <p className="font-black text-[15px]">{boutique.nom}</p>
                <p className="text-[11px] text-gray-600">{actInfo ? actInfo.label : boutique.profession} - {boutique.ville || "Kinshasa"} {boutique.commune ? "• " + boutique.commune : ""}</p>
                <p className="text-[10px] text-gray-500 mt-1">Régime prestataire unique - Taux {TAUX_CDF} - Commission 0% - Abonnement seulement</p>
              </div>
            </div>
          </div>
        )}

        {/* TABS: Annonces / Opérations */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("annonces")} className={`flex-1 py-3 rounded-full font-bold text-[12px] ${tab==="annonces" ? "bg-black text-white" : "bg-white border"}`}>Annonces ({annonces.length})</button>
          <button onClick={() => setTab("operations")} className={`flex-1 py-3 rounded-full font-bold text-[12px] ${tab==="operations" ? "bg-[#6C3CE0] text-white" : "bg-white border"}`}>Opérations ({transactions.length}) {abActif ? "• PAYÉ" : "• NON PAYÉ"}</button>
        </div>

        {tab==="annonces" ? (
          <div className="grid gap-2">
            {annonces.length===0 ? (
              <div className="bg-white border-2 border-dashed rounded-2xl p-6 text-center"><p className="font-bold text-[12px]">Pas d'annonces</p><p className="text-[10px] text-gray-500">Remise gérée par vous - WENZE 0% commission</p></div>
            ) : annonces.map((a:any)=>{
              const prixFinal = a.flash && a.flashRemise ? Math.round(a.prix * (1 - a.flashRemise/100)) : a.prix;
              return (
                <div key={a.id} className="bg-white border rounded-xl p-3 flex gap-3 relative">
                  {a.flash && <span className="absolute top-1 right-1 bg-red-600 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black">-{a.flashRemise}% Remise vendeur - 0% commission plateforme</span>}
                  <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">{a.photo ? <img src={a.photo} className="object-contain" alt=""/> : "📦"}</div>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold">{a.titre}</p>
                    <p className="text-[10px] text-gray-500">{a.categorieTitre || a.categorie} • Remise à votre charge - Plateforme 0%</p>
                    <p className="text-[11px] font-black mt-1">{a.flash ? <><span className="line-through text-gray-400 text-[9px]">{a.prix}$</span> <span className="text-red-600">{prixFinal}$ / {toCDF(prixFinal).toLocaleString("fr-FR")} CDF</span></> : a.prix+"$ / "+toCDF(a.prix).toLocaleString("fr-FR")+" CDF"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2">
            {/* Message automatique abonnement */}
            <div className={`rounded-xl p-3 text-[11px] ${abActif ? "bg-green-600 text-white" : "bg-black text-white"}`}>
              <p className="font-bold">{abActif ? "✅ Opération payée - Abonnement actif" : "❌ Aucun abonnement payé - Opération en attente"}</p>
              <p className="opacity-80 mt-1 text-[10px]">
                {abActif ? `Vous avez payé ${abInfo.type} le ${abInfo.expire ? formatDate(new Date(abInfo.expire).getTime() - 30*86400000) : ""} - Expire ${expireDans}j - Boutique fonctionnelle - Taux ${TAUX_CDF}` 
                : "Vous n'avez pas encore payé - Vos ventes Flash remises sont 100% pour vous - WENZE ne touche que 5$ abonnement + Boost 2$ + Vidéo"}
              </p>
            </div>

            {transactions.length===0 ? (
              <div className="bg-white border rounded-2xl p-6 text-center">
                <p className="font-bold text-[12px]">Aucune opération payée</p>
                <p className="text-[10px] text-gray-500 mt-1">Vous n'avez pas payé d'abonnement - Freemium 3 gratuites - Remise 0% commission - Abonnement seulement</p>
                <Link href="/abonnement" className="mt-3 inline-block bg-[#6C3CE0] text-white px-5 py-2 rounded-full text-[11px] font-bold">Payer abonnement - Voir opérations</Link>
              </div>
            ) : transactions.map((t:any, idx:number)=>(
              <div key={idx} className="bg-white border rounded-xl p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-[12px]">{t.nom || t.type || "Paiement"} {t.success ? "✅ PAYÉ" : "❌"}</p>
                    <p className="text-[10px] text-gray-500">{t.confirmation ? t.confirmation.formule : t.type} - {t.prix ? t.prix+"$" : ""} {t.prixCDF ? "/ "+t.prixCDF.toLocaleString("fr-FR")+" CDF" : ""}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{formatDate(t.date)} • Trans: {t.transactionId || t.transaction || t.id} • Taux {t.taux || TAUX_CDF}</p>
                  </div>
                  <span className={`text-[8px] px-2 py-1 rounded-full font-bold ${t.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700"}`}>{t.success ? "PAYÉ" : "ÉCHEC"}</span>
                </div>
                {t.confirmation && (
                  <div className="mt-2 bg-[#FFFBF0] border rounded-lg p-2 text-[10px]">
                    <p><b>Boutique:</b> {t.confirmation.boutique}</p>
                    <p><b>Régime:</b> {t.confirmation.regime}</p>
                    <p className="text-green-700 font-bold mt-1">Plateforme commission 0% sur remise - Seulement abonnement + pub</p>
                  </div>
                )}
              </div>
            ))}

            <div className="bg-white border-2 border-black rounded-2xl p-4 mt-2">
              <p className="font-black text-[12px]">À-propos remise & commission</p>
              <div className="text-[10px] text-gray-700 mt-2 space-y-1">
                <p>• <b>Remise Flash -25% à -60%:</b> C'est VOUS vendeur qui décidez - Le client paie le prix remisé directement sur votre WhatsApp - <b>WENZE 0% commission</b></p>
                <p>• <b>Nous gagnons seulement:</b> Abonnement Pro 5$ / 11 500 CDF + Grossiste 25$ + Boost 2$ + Vidéo 1-15$</p>
                <p>• <b>Taux fixe:</b> {TAUX_CDF} CDF partout - Pas de frais cachés</p>
                <p>• <b>Boutique fonctionnelle:</b> Visible dans /boutiques après paiement abonnement</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-2">
          <Link href="/boutiques" className="bg-white border p-3 rounded-xl text-center font-bold text-[12px]">Voir toutes boutiques</Link>
          <Link href="/abonnement" className="bg-[#6C3CE0] text-white p-3 rounded-xl text-center font-bold text-[12px]">Gérer abonnement - Taux {TAUX_CDF}</Link>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
