"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TAUX_CDF, toCDFString, verifierAbonnement, PALIERS, isCompteCache } from "@/lib/paiement"
import { getCategorieById, normalizeCategorie } from "@/lib/categories"

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");

type Transaction = {
  id: string
  type: "vente" | "abonnement" | "retrait" | "ticket"
  montant: number
  montantUSD?: number
  montantCDF?: number
  date: string
  createdAt?: string
  statut: "paye" | "attente" | "retire" | "actif"
  titre?: string
  boutique?: string
  palierId?: string
}

export default function PortefeuillePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [abInfo, setAbInfo] = useState<any>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wenze_user")
      if(!raw){ router.push("/connexion?next=/portefeuille"); return; }
      const u = JSON.parse(raw);
      setUser(u);

      try{
        const ab = verifierAbonnement();
        setAbInfo(ab);
      }catch{}

      // V6: Transactions = ventes directes + tickets, pas commission
      const txRaw = localStorage.getItem("wenze_transactions") || localStorage.getItem(`wenze_tx_${cleanWa(u.ownerWhatsapp||"")}`) || "[]";
      let list: Transaction[] = JSON.parse(txRaw);
      // Si vide, mock pro V6 basé sur annonces
      if(list.length===0){
        const annRaw = localStorage.getItem("wenze_annonces_list")||"[]";
        const anns = JSON.parse(annRaw).filter((a:any)=> cleanWa(a.ownerWhatsapp||"")===cleanWa(u.ownerWhatsapp||""));
        list = anns.slice(0,5).map((a:any,i:number)=>({
          id:`vente_${a.id}`, type:"vente" as const, montant:Number(a.prixUSD||a.prix||25), montantUSD:Number(a.prixUSD||a.prix||25), montantCDF:Number(toCDFString(Number(a.prixUSD||a.prix||25)).replace(/[^0-9]/g,""))||0),
          date:new Date(Date.now()-i*86400000*2).toISOString(), statut:"paye" as const, titre:a.titre||a.title||"Produit", boutique:u.nom||"Ma boutique"
        }));
        // Ajoute tickets achetés
        try{
          const tickets = JSON.parse(localStorage.getItem("wenze_tickets")||localStorage.getItem(`wenze_tickets_${cleanWa(u.ownerWhatsapp||"")}`)||"[]");
          for(const t of tickets){
            list.push({ id:`ticket_${t.id||Date.now()}`, type:"ticket" as const, montant:Number(t.prixUSD||t.montant||5), montantUSD:Number(t.prixUSD||5), date:t.date||t.createdAt||new Date().toISOString(), statut:"actif" as const, palierId:t.palierId||"STANDARD", titre:`Ticket ${t.palierId||"STANDARD"} - ${t.places||4} places` });
          }
        }catch{}
      }

      const sorted = [...list].sort((a,b)=> new Date(b.date||b.createdAt||0).getTime() - new Date(a.date||a.createdAt||0).getTime());
      setTransactions(sorted);
    } catch(e){ console.log("portefeuille V6",e); }
    finally{ setLoading(false); }
  },[router]);

  const stats = useMemo(()=>{
    const ventes = transactions.filter(t=>t.type==="vente"&&t.statut==="paye");
    const tickets = transactions.filter(t=>t.type==="ticket"||t.type==="abonnement");
    const totalVentesUSD = ventes.reduce((s,t)=>s+Number(t.montantUSD||t.montant||0),0);
    const totalTicketsUSD = tickets.reduce((s,t)=>s+Number(t.montantUSD||t.montant||0),0);
    return { totalVentesUSD, totalTicketsUSD, countVentes:ventes.length, countTickets:tickets.length, totalVentesCDF: toCDFString(totalVentesUSD) };
  },[transactions]);

  const formatDate = (d?:string)=>{ if(!d) return ""; const diff=Date.now()-new Date(d).getTime(); if(diff<60000) return "À l'instant"; if(diff<3600000) return `${Math.floor(diff/60000)}m`; if(diff<86400000) return `${Math.floor(diff/3600000)}h`; return new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"}); };

  if(loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Chargement portefeuille V6 - Taux {TAUX_CDF} - 0% comm...</p></div>;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/profil" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1"><h1 className="font-black text-[16px]">Portefeuille V6</h1><p className="text-[10px] text-gray-500">{user?.nom||"Boutique"} • Taux {TAUX_CDF} • 0% commission WENZE</p></div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${abInfo?.isPaye?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"}`}>{abInfo?.badge||"🆓"} {abInfo?.palierId||"Freemium"}</span>
        </div>
        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px]"><b>POLITIQUE NOUVELLE V6:</b> 0% commission sur ventes - WENZE gagne uniquement sur tickets visibilité - Même ticket pour tous ⭐ 5$ ({toCDFString(5)}) 4pl/7j • 🚀 10$ 10pl • 👑 20$ 30pl • Max 50 actives • Suppression libère place • Freemium 3 images à vie 30j puis 🔒 caché</div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-black text-white rounded-3xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div><p className="text-[10px] opacity-70 uppercase tracking-wider">Revenus ventes directes (WhatsApp)</p><p className="text-[28px] font-black mt-1">{stats.totalVentesUSD}$</p><p className="text-[12px] opacity-80">{stats.totalVentesCDF} CDF • Taux {TAUX_CDF}</p><p className="text-[10px] opacity-60 mt-2">{stats.countVentes} ventes • 0% commission • Paiement direct client → toi</p></div>
            <div className="bg-white/10 rounded-2xl px-3 py-2 text-center"><p className="text-[10px] opacity-70">Tickets achetés</p><p className="font-black text-[14px]">{stats.countTickets}</p><p className="text-[10px] opacity-70">{stats.totalTicketsUSD}$ dépensés</p></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/publier" className="bg-white text-black rounded-full py-3 text-[11px] font-black text-center">+ Nouvelle annonce</Link>
            <Link href="/boutiques" className="bg-white/10 border border-white/20 text-white rounded-full py-3 text-[11px] font-bold text-center">Mes boutiques</Link>
          </div>
          <p className="text-[8px] opacity-50 mt-3 text-center">V6: 0% comm - Max 50 actives - Suppression libère place - isOwner = ownerWhatsapp</p>
        </div>

        {abInfo && (
          <div className="bg-white border rounded-2xl p-4">
            <p className="font-black text-[13px] flex items-center gap-2">Abonnement visibilité {abInfo.isCache&&<span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px]">🔒 Caché</span>}</p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className="bg-black text-white px-3 py-1.5 rounded-full text-[11px] font-bold">{abInfo.badge} {abInfo.palierId} • {abInfo.joursRestants||0}j</span>
              <span className="bg-gray-100 px-3 py-1.5 rounded-full text-[11px] font-bold">{abInfo.placesRestantes||0} places libres / {abInfo.maxPlaces||50} max</span>
              <span className="bg-gray-100 px-3 py-1.5 rounded-full text-[11px]">{abInfo.totalAnnonces||0} actives</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Object.entries(PALIERS).map(([k,v]:any)=>(
                <div key={k} className={`border rounded-xl p-2.5 text-center ${abInfo.palierId===k?"border-black bg-gray-50":""}`}>
                  <p className="font-black text-[11px]">{v.badge} {k}</p><p className="font-black text-[12px] mt-1">{v.prixUSD}$</p><p className="text-[9px] text-gray-500">{toCDFString(v.prixUSD)}</p><p className="text-[9px] font-bold mt-1">{v.places} places • {v.jours}j</p>
                </div>
              ))}
            </div>
            <Link href="/publier?upgrade=1" className="mt-3 block bg-black text-white rounded-full py-2.5 text-center text-[11px] font-black">Activer ticket - Même prix pour tous - Max 50</Link>
            {abInfo.isCache&&<p className="text-[10px] text-red-600 mt-2 bg-red-50 border border-red-200 rounded-xl p-2">🔒 Compte caché - Freemium 30j expiré + 0 ticket actif - Tes annonces non visibles dans Marché - Active ticket 5$ ({toCDFString(5)}) pour réapparaître - Panier/messages conservés</p>}
          </div>
        )}

        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b"><p className="font-black text-[13px]">Transactions • 0% commission</p><span className="text-[10px] bg-gray-100 px-2 py-1 rounded-full">{transactions.length}</span></div>
          {transactions.length===0?(
            <div className="p-8 text-center"><p className="text-3xl">💼</p><p className="font-bold text-[12px] mt-2">Aucune transaction</p><p className="text-[10px] text-gray-500 mt-1">Ventes WhatsApp directes + tickets visibilité apparaîtront ici - Taux {TAUX_CDF}</p></div>
          ):(
            <div className="divide-y divide-gray-100">
              {transactions.map(t=>{
                const isVente=t.type==="vente"; const isTicket=t.type==="ticket"||t.type==="abonnement";
                return (
                  <div key={t.id} className="p-4 flex gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${isVente?"bg-green-50 border border-green-200":isTicket?"bg-black text-white":"bg-gray-100"}`}>{isVente?"💰":isTicket?"🎫":"📤"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[12px] truncate">{t.titre||(isVente?"Vente":isTicket?`Ticket ${t.palierId||""}`:"Retrait")} {t.boutique?`• ${t.boutique}`:""}</p>
                      <p className="text-[11px] text-gray-500">{isVente?`Vente directe WhatsApp - 0% comm • ${formatDate(t.date)}`:isTicket?`${t.palierId||"STANDARD"} - Visibilité - ${formatDate(t.date)}`:`${t.type} • ${formatDate(t.date)}`} • <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${t.statut==="paye"||t.statut==="actif"?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"}`}>{t.statut}</span></p>
                    </div>
                    <div className="text-right shrink-0"><p className={`font-black text-[13px] ${isVente?"text-green-600":isTicket?"text-black":"text-gray-700"}`}>{isVente?"+":"-"}{t.montantUSD||t.montant}$</p><p className="text-[10px] text-gray-500">{toCDFString(Number(t.montantUSD||t.montant||0))}</p></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">Pourquoi 0% commission ?</p>
          <p className="text-[11px] text-gray-600 mt-2">V6 Modèle Jumia décentralisé: <b>Tu vends direct via WhatsApp, client paie direct via Mobile Money / Cash</b>. WENZE ne touche pas ta vente. WENZE gagne uniquement quand tu achètes ticket visibilité ⭐5$ ({toCDFString(5)}) = 4 places strictes sur 7j, 🚀10$ 10 places, 👑20$ 30 places. Max 50 actives. Suppression libère place immédiatement. Freemium 3 images à vie 30j visibles puis 🔒 caché si 0 ticket. Taux {TAUX_CDF}.</p>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">+</span>Vendre</Link>
        <Link href="/portefeuille" className="font-black text-black flex flex-col items-center gap-0.5"><span className="text-[18px]">💼</span>Portefeuille</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
            }
