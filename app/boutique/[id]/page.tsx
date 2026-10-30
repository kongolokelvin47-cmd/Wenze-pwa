"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FREEMIUM, PALIERS, TAUX_CDF, toCDF, verifierAbonnement, checkFreemiumWenze, isCompteCache, libererPlace, renouvelerTicket } from "@/lib/paiement";
import { getCategorieById, normalizeCategorie, CATEGORIES_WENZE } from "@/lib/categories";

export const dynamic = 'force-dynamic';

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,""); }
function formatDate(d:any){ try{ const date = typeof d==="number" ? new Date(d) : new Date(d); return date.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}); }catch{ return String(d); } }
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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"annonces"|"operations">("annonces");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [isCacheView, setIsCacheView] = useState(false);

  const refresh = ()=>{
    try{
      const u = getCurrentUser(); setCurrentUser(u);
      const allRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allRaw ? JSON.parse(allRaw) : [];
      let found = allUsers.find((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp||x.id)===waSearch || x.id===idParam);
      if(!found && u && cleanWa(u.ownerWhatsapp||u.whatsapp||u.id)===waSearch) found = u;
      if(!found) found = { nom:idParam, nomEtablissement:idParam, ownerWhatsapp:waSearch, whatsapp:waSearch, categorieId:"commerces-services", ville:"Kinshasa", createdAt: new Date().toISOString() };
      
      const cache = isCompteCache(found);
      setIsCacheView(cache);
      
      if(found){
        const fixedCat = normalizeCategorie(found.categorieId||"commerces-services");
        const catObj = getCategorieById(fixedCat);
        const listTmp = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
        const countTmp = listTmp.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===waSearch).length;
        const check = checkFreemiumWenze(found, countTmp);
        found = {...found, categorieId:fixedCat, categorieTitre:catObj?.titre||fixedCat, catObj, abCheck: check, isCache: cache };
      }
      setBoutique(found);

      const listRaw = localStorage.getItem("wenze_annonces_list");
      const list = listRaw ? JSON.parse(listRaw) : [];
      const res = list.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===waSearch);
      res.sort((a:any,b:any)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime());
      setAnnonces(res);

      const transRaw = localStorage.getItem("wenze_transactions");
      const trans = transRaw ? JSON.parse(transRaw) : [];
      const uniq:any[]=[]; const seen:any={};
      for(const t of trans){ const tid=t.transactionId||t.id||t.ticketId; if(tid&&!seen[tid]){ seen[tid]=true; uniq.push(t); } }
      uniq.sort((a:any,b:any)=> new Date(b.date||b.createdAt||0).getTime() - new Date(a.date||a.createdAt||0).getTime());
      setTransactions(uniq.filter((t:any)=> !t.ownerWhatsapp || cleanWa(t.ownerWhatsapp)===waSearch || cleanWa(t.userId||"")===waSearch).slice(0,30));

      const checkB = checkFreemiumWenze(found, res.length);
      setAbInfo(checkB);
    }catch{}
    setLoading(false);
  };

  useEffect(()=>{ refresh(); },[waSearch, idParam]);

  const isOwner = useMemo(()=>{
    if(!currentUser) return false;
    const waU = cleanWa(currentUser.ownerWhatsapp||currentUser.whatsapp||currentUser.id);
    return waU===waSearch || currentUser.id===idParam;
  },[currentUser, waSearch, idParam]);

  const catInfo = useMemo(()=> boutique ? getCategorieById(boutique.categorieId)||{} as any : null,[boutique]);

  const handleWhatsApp = (annonce:any)=>{
    const phone = cleanWa(boutique?.ownerWhatsapp||boutique?.whatsapp||waSearch);
    const msg = `Bonjour ${boutique?.nomEtablissement||boutique?.nom}! Sur TonMarché.cd, intéressé par *${annonce.titre}* à ${annonce.prix}$ / ${toCDF(annonce.prix).toLocaleString()} CDF (ID: ${annonce.id}) - Précise taille/couleur/qty? - 0% comm - Taux ${TAUX_CDF}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,"_blank");
  };

  const handleDelete = (annonceId:string)=>{
    if(!isOwner){ setToast("⛔ Pas ton annonce"); setTimeout(()=>setToast(null),3000); return; }
    if(!confirm("Supprimer cette annonce? TA PLACE SERA LIBÉRÉE dans ton ticket (règle V6 stricte). Tu pourras reposter dedans jusqu'à expiration du ticket.")) return;
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      const filtered = list.filter((a:any)=> a.id!==annonceId);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(filtered));
      libererPlace(annonceId); // V6: libère place
      setAnnonces(prev=> prev.filter(a=> a.id!==annonceId));
      setToast("✅ Supprimé - Place libérée dans ticket - Tu peux reposter 1/j jusqu'à max");
      refresh();
      setTimeout(()=>setToast(null),3000);
    }catch{ setToast("Erreur suppression"); setTimeout(()=>setToast(null),3000); }
  };

  const handleRenouveler = (ticketId:string)=>{
    const res = renouvelerTicket(ticketId);
    if(res.success){ setToast(`♻️ Ticket renouvelé +${res.ticket.jours}j - Expire ${formatDate(res.ticket.expireAt)}`); refresh(); setTimeout(()=>setToast(null),3000); }
  };

  if(loading) return <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">Chargement boutique V6... Taux {TAUX_CDF}</div>;

  if(isCacheView && !isOwner){
    return (
      <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-20 p-6 text-center">
        <div className="bg-white border-2 border-black rounded-2xl p-8 mt-10">
          <p className="text-4xl">🔒</p>
          <p className="font-black text-[16px] mt-4">Boutique en mode caché</p>
          <p className="text-[11px] text-gray-600 mt-2">Ce vendeur a utilisé ses 3 images à vie gratuites et ses 30j sont expirés. Son compte est caché jusqu'à achat d'un ticket. Règle V6: 0% commission, tickets stricts cumulables.</p>
          <Link href="/" className="mt-6 block bg-black text-white py-3 rounded-full font-black text-[11px]">Retour accueil - Taux {TAUX_CDF}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/boutiques" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[12px] truncate">{boutique?.nomEtablissement||boutique?.nom||idParam} {isOwner?"• TOI":""}</h1><p className="text-[9px] text-gray-500">Taux {TAUX_CDF} • {abInfo?.badge} {abInfo?.palier?.nom||"Freemium"} {abInfo?.placesRestantes!==undefined?`- ${abInfo.placesRestantes} libres`:''} • {isOwner?"👑":""}</p></div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-black ${abInfo?.isCache?'bg-red-600 text-white':abInfo?.isPaye?'bg-green-600 text-white':'bg-black text-white'}`}>{abInfo?.isCache?"CACHÉ":abInfo?.isPaye?`${abInfo.ticketsActifs?.length||0} tickets`:`${abInfo?.count||0}/3`}</span>
      </header>

      <div className="p-4">
        {isCacheView && isOwner && (
          <div className="bg-red-600 text-white rounded-2xl p-4 mb-4 border-2 border-black">
            <p className="font-black text-[13px]">🔒 TON COMPTE EST CACHÉ</p>
            <p className="text-[11px] mt-1">Freemium 3 images à vie + 30j expirés. Tes {annonces.length} annonces sont invisibles. Achète un ticket pour réapparaître. Tes anciens tickets expirés restent archivés.</p>
            <Link href="/abonnement" className="mt-3 block bg-white text-black text-center py-3 rounded-full font-black text-[11px]">Payer 5$ / 11.500 CDF - Réapparaître - Tickets cumulables</Link>
          </div>
        )}

        {!isCacheView && (
          <div className={`rounded-2xl p-4 mb-4 border-2 ${abInfo?.isPaye?"bg-green-50 border-green-300":"bg-black text-white border-black"}`}>
            <p className={`font-black text-[12px] ${abInfo?.isPaye?"text-green-800":"text-white"}`}>{abInfo?.message}</p>
            <p className={`text-[10px] mt-1 ${abInfo?.isPaye?"text-green-700":"text-white/80"}`}>Règle V6 stricte: 1 ticket = X places strictes sur Y jours (pas X/j) - Cumulable, renouvelable, suppression libère place - Max 50 actives - Taux {TAUX_CDF}</p>
            {abInfo?.ticketsActifs?.length>0 && <p className="text-[9px] mt-2 opacity-80">{abInfo.ticketsActifs.length} ticket(s) actif(s) - {abInfo.placesRestantes} places libres / {abInfo.totalImagesMax} - Tu peux poster 1 image/j jusqu'à max</p>}
            {!abInfo?.isPaye && <Link href="/abonnement" className="mt-3 block bg-[#6C3CE0] text-white text-center py-3 rounded-full font-bold text-[11px]">Acheter ticket 5$/10$/20$ - Strict cumulable</Link>}
          </div>
        )}

        {toast && <div className="mb-3 bg-black text-white p-3 rounded-xl text-[10px] font-bold text-center">{toast}</div>}

        <div className="bg-white border-2 border-black rounded-xl p-3 mb-4 text-[9px]">
          <p className="font-black">⛔ RÈGLES V6 STRICTES</p>
          <p className="text-gray-600 mt-1">1 ticket = X places strictes sur Y jours (même pour 1j/7j/30j). Ex: STANDARD 4 places/7j = tu peux poster 1/j pendant 4j, pas 4/j. Tickets cumulables, renouvelables. Occasionnel cumulable. Suppression libère place avant échéance. Max 50 actives.</p>
        </div>

        {abInfo?.ticketsActifs?.length>0 && (
          <div className="bg-white border-2 rounded-2xl p-3 mb-4">
            <p className="font-black text-[11px]">🎫 Tickets actifs de cette boutique ({abInfo.ticketsActifs.length})</p>
            <div className="mt-2 space-y-2">
              {abInfo.ticketsActifs.map((t:any)=>(
                <div key={t.ticketId} className="border-2 rounded-xl p-2 flex justify-between items-center">
                  <div>
                    <p className="font-black text-[10px]">{PALIERS[t.palierId]?.badge} {t.palierId} {t.dureeId} - {t.imagesUsed}/{t.imagesMax} strictes</p>
                    <p className="text-[8px] text-gray-600">{t.jours}j strict - Expire {formatDate(t.expireAt)} - {Math.ceil((new Date(t.expireAt).getTime()-Date.now())/86400000)}j restants</p>
                  </div>
                  {isOwner && <button onClick={()=>handleRenouveler(t.ticketId)} className="bg-black text-white px-2 py-1 rounded-full text-[8px] font-black">♻️ Renouveler</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button onClick={()=> setTab("annonces")} className={`flex-1 py-3 rounded-full font-bold text-[11px] border-2 ${tab==="annonces" ? "bg-black text-white border-black" : "bg-white"}`}>Annonces ({annonces.length}/50)</button>
          <button onClick={()=> setTab("operations")} className={`flex-1 py-3 rounded-full font-bold text-[11px] border-2 ${tab==="operations" ? "bg-[#6C3CE0] text-white border-[#6C3CE0]" : "bg-white"}`}>Tickets ({transactions.length})</button>
        </div>

        {tab==="annonces" ? (
          <div className="grid gap-3">
            {annonces.length===0 ? <div className="bg-white border-2 border-dashed rounded-2xl p-6 text-center"><p className="font-bold text-[11px]">Pas d'annonces</p><p className="text-[9px] text-gray-500">Max 50 actives - Taux {TAUX_CDF} - Strict</p></div> :
              annonces.map((a:any)=>(
                <div key={a.id} className="bg-white border-2 rounded-2xl p-3 flex gap-3">
                  <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border">{a.photo ? <img src={a.photo} className="w-full h-full object-cover"/> : "📦"}</div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black">{a.titre} {a.ticketId && <span className="text-[7px] bg-gray-100 px-1 rounded">🎫 {a.ticketId.slice(0,8)}</span>}</p>
                    <p className="text-[9px] text-gray-500">{a.commune} • {a.images?.length||1} img • Ticket {a.palierId||'Freemium'}</p>
                    <p className="text-[10px] font-black mt-1 text-red-600">{a.prix}$ / {toCDF(a.prix).toLocaleString()} CDF</p>
                    <button onClick={()=>handleWhatsApp(a)} className="w-full mt-2 bg-[#25D366] text-white py-2 rounded-full font-black text-[9px]">💬 WhatsApp - Préciser choix</button>
                    <div className="flex gap-2 mt-2">
                      <Link href={`/produit/${a.id}`} className="flex-1 bg-white border-2 border-black py-2 rounded-full font-black text-[9px] text-center">👁️ Voir</Link>
                      {isOwner && <Link href={`/publier?edit=${a.id}`} className="flex-1 bg-black text-white py-2 rounded-full font-black text-[9px] text-center">✏️ Edit</Link>}
                    </div>
                    {isOwner && <button onClick={()=>handleDelete(a.id)} className="mt-2 text-[8px] text-red-600 font-black border border-red-200 px-3 py-1 rounded-full">🗑️ Supprimer - Place libérée V6</button>}
                  </div>
                </div>
              ))
            }
          </div>
        ) : (
          <div className="grid gap-2">
            <div className={`rounded-xl p-3 text-[10px] ${abInfo?.isPaye ? "bg-green-600 text-white" : "bg-black text-white"}`}>
              <p className="font-bold">{abInfo?.isPaye ? `✅ ${abInfo.ticketsActifs?.length||0} ticket(s) PAYÉ(S) - ${abInfo.placesRestantes} places libres` : "❌ Aucun ticket payé"}</p>
              <p className="opacity-80 mt-1 text-[9px]">{abInfo?.message}</p>
            </div>
            {transactions.map((t:any,i:number)=>(
              <div key={i} className="bg-white border rounded-xl p-3">
                <p className="font-bold text-[11px]">{t.palierId||t.offreId||t.type||"Ticket"} {t.ticketId?.slice(0,12)||""} ✅</p>
                <p className="text-[9px] text-gray-500">{t.prixUSD||t.prix}$ / {t.prixCDF?.toLocaleString()||toCDF(t.prixUSD||0).toLocaleString()} CDF - {formatDate(t.createdAt||t.date)} - Expire {t.expireAt?formatDate(t.expireAt):""}</p>
                <p className="text-[8px] text-gray-400 mt-1">{t.imagesUsed!==undefined?`${t.imagesUsed}/${t.imagesMax} strictes - `:""}{t.jours}j strict - {t.actif?"Actif":"Expiré"} - Cumulable</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-[8px] font-bold">TONMARCHÉ V6 • Tickets stricts cumulables • 1 ticket = X places sur Y jours • Suppression libère • Max 50 • Taux {TAUX_CDF}</div>
    </div>
  );
}
