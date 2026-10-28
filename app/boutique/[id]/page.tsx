"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TAUX_CDF, toCDF, verifierAbonnement, checkFreemiumLimit, getSoldeWPay } from "@/lib/paiement";
import { getCategorieById, normalizeCategorie, getPrixByCategorie, CATEGORIES_WENZE } from "@/lib/categories";

export const dynamic = 'force-dynamic';

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,""); }
function formatDate(d:any){
  try{
    const date = typeof d==="number" ? new Date(d) : new Date(d);
    return date.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})+" "+date.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  }catch{ return String(d); }
}
function getCurrentUser(){ try{ const r=localStorage.getItem("wenze_user"); return r?JSON.parse(r):null; }catch{ return null; } }

export default function BoutiquePage(){
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string)||"";
  let idParam = rawId;
  try{ idParam = decodeURIComponent(rawId); }catch{ idParam = rawId; }
  const waSearch = cleanWa(idParam);

  const [boutique, setBoutique] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [abInfo, setAbInfo] = useState<any>(null);
  const [limitInfo, setLimitInfo] = useState<any>(null);
  const [solde, setSolde] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"annonces"|"operations">("annonces");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [toast, setToast] = useState<string|null>(null);

  // Chargement + bienvenue forte
  useEffect(()=>{
    try{
      const u = getCurrentUser(); setCurrentUser(u);
      const allRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allRaw ? JSON.parse(allRaw) : [];
      let found = allUsers.find((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp||x.id)===waSearch || x.id===idParam);
      if(!found && u && cleanWa(u.ownerWhatsapp||u.whatsapp||u.id)===waSearch) found = u;
      if(!found) found = { nom: idParam, nomEtablissement:idParam, ownerWhatsapp:waSearch, whatsapp:waSearch, categorieId:"commerces-services", ville:"Kinshasa" };
      if(found){
        const fixedCat = normalizeCategorie(found.categorieId||found.categorie||"commerces-services");
        const catObj = getCategorieById(fixedCat);
        found = {...found, categorieId:fixedCat, categorieTitre:catObj?.titre||fixedCat, catObj};
      }
      setBoutique(found);

      const listRaw = localStorage.getItem("wenze_annonces_list");
      const list = listRaw ? JSON.parse(listRaw) : [];
      const res = list.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===waSearch);
      res.sort((a:any,b:any)=> new Date(b.createdAt||b.created_at||0).getTime() - new Date(a.createdAt||a.created_at||0).getTime());
      setAnnonces(res);

      const transRaw = localStorage.getItem("wenze_transactions");
      const trans = transRaw ? JSON.parse(transRaw) : [];
      const dernierRaw = localStorage.getItem("dernier_paiement");
      const dernier = dernierRaw ? JSON.parse(dernierRaw) : null;
      const allTrans = dernier ? [...trans, dernier] : trans;
      const uniq:any[]=[]; const seen:any={};
      for(const t of allTrans){ const tid=t.transactionId||t.transaction||t.id; if(tid&&!seen[tid]){ seen[tid]=true; uniq.push(t); } }
      uniq.sort((a,b)=> new Date(b.date||0).getTime() - new Date(a.date||0).getTime());
      setTransactions(uniq.slice(0,20));

      setAbInfo(verifierAbonnement());
      setLimitInfo(checkFreemiumLimit());
      setSolde(getSoldeWPay());

      // ✅ NOTIF BIENVENUE FORTE + VALIDATION - une seule fois
      const keyBienvenue = `wenze_bienvenue_${waSearch}`;
      if(!localStorage.getItem(keyBienvenue) && res.length>0){
        import("@/lib/notifications").then(({ addNotification })=>{
          addNotification({
            type:"publication_approved" as any,
            title:`🎉 Bienvenue dans WENZE WENZE BUSINESS - Boutique ${found.nomEtablissement||found.nom} validée!`,
            message:`WENZE WENZE BUSINESS: Taux fixe ${TAUX_CDF} CDF - 0% commission - Boutique ${found.catObj?.prixUSD||5}$ active - ${res.length} annonces en ligne TOP - 🔔 notif clients à chaque pub payante - Boost 1$/3$/5$ - Pub vidéo 1$/3$/15$ - Rappel J-5 J-1 auto. Vis l'expérience réelle!`,
            boutiqueId:waSearch, boutiqueName:found.nomEtablissement||found.nom,
            forUserId:waSearch, actionUrl:`/boutiques/${waSearch}`, priority:"high", data:{ boutiqueId:waSearch }
          } as any);
        });
        localStorage.setItem(keyBienvenue,"1");
      }
    }catch{}
    setLoading(false);
  },[waSearch, idParam]);

  const isOwner = useMemo(()=>{
    if(!currentUser) return false;
    const waU = cleanWa(currentUser.ownerWhatsapp||currentUser.whatsapp||currentUser.id);
    return waU===waSearch || currentUser.id===idParam;
  },[currentUser, waSearch, idParam]);

  const catInfo = useMemo(()=> {
    if(!boutique) return null;
    return getCategorieById(boutique.categorieId) || getCategorieById(normalizeCategorie(boutique.categorieId||"commerces-services"));
  },[boutique]);

  const prixInfo = useMemo(()=> catInfo ? getPrixByCategorie(catInfo.id) : { prixUSD:5, prixCDF:11500, label:"🛍️ Commerces & Services" }, [catInfo]);

  const getRemaining = (a:any)=>{
    if(!a.boostUntil) return null;
    const diff = Math.ceil((new Date(a.boostUntil).getTime()-Date.now())/86400000);
    if(diff<=0) return "Expiré";
    return `${diff}j restant`;
  };

  const handleWhatsApp = (annonce:any)=>{
    const phone = cleanWa(boutique?.ownerWhatsapp||boutique?.whatsapp||waSearch);
    const msg = `Bonjour ${boutique?.nomEtablissement||boutique?.nom||"Boutique"}! 👋 Sur WENZE WENZE BUSINESS, je suis intéressé par *${annonce.titre}* à ${annonce.prix}$ / ${(annonce.prixCDF||toCDF(annonce.prix)).toLocaleString()} CDF (ID: ${annonce.id}) - ${annonce.commune||""}. Je veux préciser mon choix d'achat: taille/couleur/quantité/livraison? Merci! - Taux ${TAUX_CDF} - 0% comm`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,"_blank");
  };

  const handleDelete = (annonceId:string)=>{
    try{
      const { assertCanDelete } = require("@/lib/auth");
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      const annonce = list.find((x:any)=> x.id===annonceId);
      if(annonce) assertCanDelete(annonce, currentUser);
      if(!confirm("Supprimer définitivement cette annonce? Ton compteur pub reste compté (règle stricte).")) return;
      const filtered = list.filter((a:any)=> a.id!==annonceId);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(filtered));
      setAnnonces(prev=> prev.filter(a=> a.id!==annonceId));
      setToast("✅ Annonce supprimée - Délai pub conservé - Règle stricte respectée");
      setTimeout(()=>setToast(null),3000);
    }catch(e:any){ setToast(e.message||"⛔ INTERDIT - Tu ne peux pas supprimer annonce d'autrui"); setTimeout(()=>setToast(null),3000); }
  };

  const handleEdit = (annonce:any)=>{
    try{
      const { assertCanEdit } = require("@/lib/auth");
      assertCanEdit(annonce, currentUser);
      // GARDE COMPTEUR - 5j consommé 3j reste 2j, ne repart pas à zéro
      const remaining = annonce.boostUntil ? Math.ceil((new Date(annonce.boostUntil).getTime()-Date.now())/86400000) : null;
      localStorage.setItem("wenze_edit_annonce", JSON.stringify({
        ...annonce,
        _originalCreatedAt: annonce.createdAt||annonce.created_at,
        _originalBoostUntil: annonce.boostUntil,
        _originalExpireAt: annonce.expireAt||annonce.boostUntil,
        _isEdit:true,
        _remainingDays: remaining
      }));
      localStorage.setItem("wenze_edit_keep_dates", JSON.stringify({
        createdAt: annonce.createdAt||annonce.created_at,
        boostUntil: annonce.boostUntil,
        expireAt: annonce.expireAt||annonce.boostUntil
      }));
      router.push(`/publier?edit=${annonce.id}`);
    }catch(e:any){ setToast(e.message); setTimeout(()=>setToast(null),3000); }
  };

  if(loading) return <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">Chargement boutique... Taux {TAUX_CDF}</div>;

  const abActif = abInfo && abInfo.actif;
  const expireDans = abInfo ? abInfo.expireDans : 0;

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/boutiques" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[13px] truncate">{boutique ? boutique.nom : idParam} {isOwner?"• TOI":""}</h1><p className="text-[10px] text-gray-500">Taux {TAUX_CDF} • {catInfo?.icon} {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF • 0% comm • {isOwner?"👑 Proprio":""}</p></div>
        <span className={`text-[10px] px-2 py-1 rounded-full font-black ${catInfo?.id==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixInfo.prixUSD}$</span>
      </header>

      <div className="p-4">
        {/* BANNER BIENVENUE FORTE */}
        <div className={`rounded-2xl p-4 mb-4 border-2 ${abActif?"bg-green-50 border-green-200":"bg-black text-white border-black"}`}>
          <p className={`font-black text-[13px] ${abActif?"text-green-800":"text-white"}`}>{abActif?`✅ ${abInfo.label} actif - ${expireDans}j restants`:`🎉 Bienvenue - WENZE WENZE BUSINESS - 0% commission - Expérience réelle!`}</p>
          <p className={`text-[11px] mt-1 ${abActif?"text-green-700":"text-white/80"}`}>{abActif?`Payé ${abInfo.prixUSD}$ / ${(abInfo.prixUSD*TAUX_CDF).toLocaleString()} CDF - Expire ${abInfo.expire?formatDate(abInfo.expire):""} - Taux ${TAUX_CDF}`:`Boutique ${boutique?.nomEtablissement||"Jean Jacques"}: ${annonces.length} annonces validées - Taux fixe ${TAUX_CDF} - Chaque pub payante = 🔔 notif à tous les clients - Boost 1$/3$/5$ - Pub vidéo 1$/3$/15$ - Rappel J-5 J-1 auto`}</p>
          {limitInfo && <p className="text-[10px] mt-2 opacity-80">Annonces: {limitInfo.count} / {limitInfo.isPro?"∞":"3"} - W-Pay: {solde.toLocaleString()} CDF - {isOwner?"Tu es propriétaire":"Visiteur"}</p>}
          {!abActif && <Link href="/abonnement" className="mt-3 block bg-[#6C3CE0] text-white text-center py-3 rounded-full font-bold text-[12px]">Payer 🛍️ 5$ / 🏭 10$ - Débloquer - Taux {TAUX_CDF}</Link>}
        </div>

        {toast && <div className="mb-3 bg-black text-white p-3 rounded-xl text-[11px] font-bold text-center">{toast}</div>}

        {/* REGLES STRICTES */}
        <div className="bg-white border-2 border-black rounded-xl p-3 mb-4 text-[10px]">
          <p className="font-black">⛔ RÈGLES STRICTES WENZE</p>
          <p className="text-gray-600 mt-1">Personne ne peut modifier/publier pour autrui. Chacun gère son profil/annonces. Proprio peut Modifier/Supprimer mais compteur continue: 5j pub - 3j consommé = reste 2j même après modif.</p>
        </div>

        {boutique && (
          <div className="bg-white border rounded-2xl p-4 mb-4">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-full bg-[#6C3CE0]/10 flex items-center justify-center text-2xl">{catInfo ? catInfo.icon : "🏪"}</div>
              <div className="flex-1">
                <p className="font-black text-[15px]">{boutique.nom} {isOwner && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full">TOI</span>}</p>
                <p className="text-[11px] text-gray-600">{catInfo?.icon} {catInfo?.titre} - {boutique.ville||"Kinshasa"} {boutique.commune?"• "+boutique.commune:""}</p>
                <p className="text-[10px] text-gray-500 mt-1">{prixInfo.label} - {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF} - 0% comm</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button onClick={()=> setTab("annonces")} className={`flex-1 py-3 rounded-full font-bold text-[12px] border-2 ${tab==="annonces" ? "bg-black text-white border-black" : "bg-white"}`}>Annonces ({annonces.length})</button>
          <button onClick={()=> setTab("operations")} className={`flex-1 py-3 rounded-full font-bold text-[12px] border-2 ${tab==="operations" ? "bg-[#6C3CE0] text-white border-[#6C3CE0]" : "bg-white"}`}>Opérations ({transactions.length}) {abActif ? "• PAYÉ" : ""}</button>
        </div>

        {tab==="annonces" ? (
          <div className="grid gap-3">
            {annonces.length===0 ? (
              <div className="bg-white border-2 border-dashed rounded-2xl p-6 text-center"><p className="font-bold text-[12px]">Pas d'annonces</p><p className="text-[10px] text-gray-500">{catInfo?.icon} {catInfo?.titre} • {prixInfo.prixUSD}$ • Taux {TAUX_CDF}</p></div>
            ) : annonces.map((a:any)=>{
              const prixFinal = a.flash && a.flashRemise ? Math.round(a.prix * (1 - a.flashRemise/100)) : a.prix;
              const remaining = getRemaining(a);
              return (
                <div key={a.id} className="bg-white border-2 rounded-2xl p-3 flex gap-3 relative overflow-hidden">
                  {a.flash && <span className="absolute top-2 right-2 bg-red-600 text-white text-[8px] px-2 py-1 rounded-full font-black">-{a.flashRemise}%</span>}
                  {!a.flash && <span className="absolute top-2 right-2 bg-black text-white text-[7px] px-2 py-1 rounded-full font-black">{remaining||"Actif"}</span>}
                  <span className={`absolute top-2 left-2 text-[7px] px-2 py-1 rounded-full font-bold ${a.categorieId==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{a.categorieId==="gros-autres"?"🏭 10$":"🛍️ 5$"}</span>
                  <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden border mt-4">{a.photo ? <img src={a.photo} className="w-full h-full object-cover" alt=""/> : "📦"}</div>
                  <div className="flex-1 mt-4">
                    <p className="text-[12px] font-black leading-[13px]">{a.titre}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{a.categorieTitre||a.categorie} • {catInfo?.icon} • {a.commune||"Kinshasa"}</p>
                    <p className="text-[11px] font-black mt-1">{a.flash ? <><span className="line-through text-gray-400 text-[9px]">{a.prix}$</span> <span className="text-red-600">{prixFinal}$ / {toCDF(prixFinal).toLocaleString()} CDF</span></> : <span className="text-red-600">{a.prix}$ / {toCDF(a.prix).toLocaleString()} CDF</span>} <span className="text-[9px] text-green-600">{remaining?`• ${remaining}`:""}</span></p>
                    
                    {/* BOUTON WHATSAPP PAR ANNONCE - PRÉCISER CHOIX ACHAT */}
                    <button onClick={()=>handleWhatsApp(a)} className="w-full mt-2 bg-[#25D366] text-white py-2.5 rounded-full font-black text-[11px] flex items-center justify-center gap-1">
                      💬 WhatsApp - Préciser choix d'achat
                    </button>
                    <div className="flex gap-2 mt-2">
                      <Link href={`/produit/${a.id}`} className="flex-1 bg-white border-2 border-black py-2 rounded-full font-black text-[10px] text-center">👁️ Voir détails</Link>
                      {isOwner ? (
                        <>
                          <button onClick={()=>handleEdit(a)} className="flex-1 bg-black text-white py-2 rounded-full font-black text-[10px]">✏️ Modifier</button>
                        </>
                      ) : null}
                    </div>
                    {isOwner && (
                      <div className="flex gap-2 mt-2">
                        <p className="text-[8px] text-gray-500 flex-1">Garde compteur: {remaining||"pas de boost"} - Modif ne remet pas à zéro</p>
                        <button onClick={()=>handleDelete(a.id)} className="text-[9px] text-red-600 font-black border border-red-200 px-3 py-1 rounded-full">🗑️ Supprimer</button>
                      </div>
                    )}
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
          </div>
        )}

        <div className="mt-6 grid gap-2">
          <Link href="/boutiques" className="bg-white border-2 p-3 rounded-xl text-center font-bold text-[12px]">Voir toutes boutiques - {CATEGORIES_WENZE.length} catégories</Link>
          <Link href="/profil" className="bg-black text-white p-3 rounded-xl text-center font-bold text-[12px]">👤 Mon Profil + Inviter amis - Règles strictes</Link>
        </div>
      </div>

      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-[9px] font-bold whitespace-nowrap">WENZE WENZE BUSINESS • Taux {TAUX_CDF} • 0% comm • WhatsApp par objet • Modif garde compteur</div>
    </div>
  );
    }
