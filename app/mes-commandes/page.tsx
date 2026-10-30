'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getCategorieById, normalizeCategorie } from '@/lib/categories'
import { TAUX_CDF, toCDFString, isCompteCache, checkFreemiumWenze } from '@/lib/paiement'

type Order = {
  id: string; status: string; total: number; total_cdf?: number; totalUSD?: number;
  created_at: string; createdAt?: string;
  categorie_id?: string; categorieId?: string; categorieTitre?: string;
  titre?: string; title?: string; name?: string; photo?: string; images?: string[];
  vendeur_whatsapp?: string; ownerWhatsapp?: string; whatsapp?: string; user?: string; nomBoutique?: string;
  quantite?: number; qty?: number;
  _isPaye?: boolean; _badge?: string; _palierId?: string; _vendeurCache?: boolean;
}

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");
function formatTotal(o: Order){
  const usd = Number(o.totalUSD||o.total)||0;
  if(usd===0) return "Prix sur demande";
  return `${usd}$ / ${toCDFString(usd)}`;
}
function statusConfig(s: string){
  const low=(s||"").toLowerCase();
  if(low.includes("paye")||low.includes("payé")||low==="paid") return { label:"Payée", color:"bg-green-100 text-green-700 border-green-200", dot:"bg-green-500", icon:"✅" };
  if(low.includes("livre")||low==="delivered") return { label:"Livrée", color:"bg-blue-100 text-blue-700 border-blue-200", dot:"bg-blue-500", icon:"📦" };
  if(low.includes("cours")||low==="pending"||low==="en_attente") return { label:"En cours", color:"bg-orange-100 text-orange-700 border-orange-200", dot:"bg-orange-500 animate-pulse", icon:"⏳" };
  if(low.includes("annule")||low==="cancelled") return { label:"Annulée", color:"bg-red-100 text-red-700 border-red-200", dot:"bg-red-500", icon:"❌" };
  return { label: s||"En attente", color:"bg-gray-100 text-gray-700 border-gray-200", dot:"bg-gray-400", icon:"🕒" };
}

export default function MesCommandesPage(){
  const [loading,setLoading]=useState(true);
  const [orders,setOrders]=useState<Order[]>([]);
  const [search,setSearch]=useState("");
  const [filterStatus,setFilterStatus]=useState<"all"|"pending"|"paid"|"delivered">("all");

  useEffect(()=>{
    try{
      const raw = localStorage.getItem("wenze_commandes_list") || localStorage.getItem("wenze_orders") || "[]";
      const list = JSON.parse(raw);
      const allUsers = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
      const userMap = new Map<string,any>();
      for(const u of allUsers){ const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||""); if(wa) userMap.set(wa,u); }

      let enriched: Order[] = list.map((o:any)=>({
        id:o.id||o.orderId, status:o.status||"en_attente", total:Number(o.total||o.totalUSD||o.prix||0), totalUSD:Number(o.totalUSD||o.total||0), total_cdf:o.total_cdf,
        created_at:o.created_at||o.createdAt, createdAt:o.createdAt||o.created_at,
        categorie_id:o.categorie_id||o.categorieId, categorieId:o.categorieId||o.categorie_id, categorieTitre:o.categorieTitre,
        titre:o.titre||o.title||o.name||"Produit", title:o.title, name:o.name, photo:o.photo||o.images?.[0], images:o.images,
        vendeur_whatsapp:o.vendeur_whatsapp||o.ownerWhatsapp||o.whatsapp, ownerWhatsapp:o.ownerWhatsapp||o.vendeur_whatsapp, whatsapp:o.whatsapp, user:o.user||o.nomBoutique, nomBoutique:o.nomBoutique||o.user,
        quantite:o.quantite||o.qty||1, qty:o.qty,
      })).map((o:Order)=>{
        try{
          const wa=cleanWa(o.ownerWhatsapp||o.vendeur_whatsapp||o.whatsapp||"");
          const user=userMap.get(wa)||{ ownerWhatsapp:wa, createdAt:o.created_at||o.createdAt, id:wa };
          const cache=isCompteCache(user);
          const ab=checkFreemiumWenze(user,0);
          return { ...o, _vendeurCache:!!cache, _isPaye:!!ab.isPaye, _badge:ab.badge, _palierId:ab.palierId };
        }catch{ return { ...o, _vendeurCache:false, _isPaye:false, _badge:"🆓" }; }
      }).sort((a:any,b:any)=> new Date(b.created_at||b.createdAt||0).getTime()-new Date(a.created_at||a.createdAt||0).getTime());

      setOrders(enriched);
    }catch(e){ console.log("mes-commandes V6",e); } finally{ setLoading(false); }
  },[]);

  const filtered = useMemo(()=>{
    let list=orders;
    if(filterStatus!=="all"){
      list=list.filter(o=>{
        const s=(o.status||"").toLowerCase();
        if(filterStatus==="pending") return s.includes("attente")||s.includes("cours")||s==="pending";
        if(filterStatus==="paid") return s.includes("paye")||s.includes("payé")||s==="paid";
        if(filterStatus==="delivered") return s.includes("livre")||s==="delivered";
        return true;
      });
    }
    if(!search.trim()) return list;
    const q=search.toLowerCase(); const qWa=cleanWa(q);
    return list.filter(o=> (o.titre||o.title||o.name||"").toLowerCase().includes(q) || (o.user||o.nomBoutique||"").toLowerCase().includes(q) || (qWa&&cleanWa(o.ownerWhatsapp||o.vendeur_whatsapp||"").includes(qWa)));
  },[orders,search,filterStatus]);

  const stats = { all:orders.length, pending:orders.filter(o=>{ const s=(o.status||"").toLowerCase(); return s.includes("attente")||s.includes("cours")||s==="pending"; }).length, paid:orders.filter(o=>{ const s=(o.status||"").toLowerCase(); return s.includes("paye")||s.includes("payé"); }).length, delivered:orders.filter(o=>{ const s=(o.status||"").toLowerCase(); return s.includes("livre")||s==="delivered"; }).length };

  if(loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Chargement commandes V6 - Taux {TAUX_CDF} - 0% comm...</p></div>;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">Mes Commandes V6</h1>
            <p className="text-[10px] text-gray-500">{orders.length} commandes • Taux {TAUX_CDF} • 0% commission • WhatsApp direct</p>
          </div>
          <span className="text-[10px] bg-black text-white px-2.5 py-1 rounded-full font-bold">{filtered.length} visibles</span>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Recherche: produit, boutique, WA..." className="w-full bg-gray-100 rounded-2xl py-3.5 px-5 pl-11 text-sm outline-none focus:ring-2 focus:ring-black" />
          <span className="absolute left-4 top-3.5">🔍</span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {[{id:"all",label:`Tous • ${stats.all}`},{id:"pending",label:`⏳ En cours • ${stats.pending}`},{id:"paid",label:`✅ Payées • ${stats.paid}`},{id:"delivered",label:`📦 Livrées • ${stats.delivered}`}].map(c=>(
            <button key={c.id} onClick={()=>setFilterStatus(c.id as any)} className={`whitespace-nowrap py-2.5 px-4 rounded-full font-black text-[11px] border-2 ${filterStatus===c.id?"bg-black text-white border-black":"bg-white border-gray-200"}`}>{c.label}</button>
          ))}
        </div>
        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px] flex justify-between">
          <span><b>V6 Nouvelle Politique:</b> 0% commission • Même prix tickets ⭐5$ ({toCDFString(5)}) 🚀10$ 👑20$ • Max 50 • Suppression libère place • Vendeur caché 🔒 filtré mais commande gardée</span>
          <span className="bg-white text-black px-2 py-0.5 rounded-full font-black">{TAUX_CDF}</span>
        </div>
      </header>

      <div className="p-3 space-y-3">
        {filtered.length===0 ? (
          <div className="mt-6 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">📦</p>
            <p className="font-black mt-2 text-[13px]">{search||filterStatus!=="all"?`Pas de commande pour "${search||filterStatus}"`:"Aucune commande - Commence à acheter!"}</p>
            <p className="text-[11px] text-gray-500 mt-1">Achats directs via WhatsApp - 0% comm - Vendeurs payés d'abord - Taux {TAUX_CDF}</p>
            <Link href="/market" className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]">Aller au Marché</Link>
          </div>
        ) : (
          filtered.map(o=>{
            const st=statusConfig(o.status);
            const catId=normalizeCategorie(o.categorieId||o.categorie_id||"commerces-services");
            const catObj=getCategorieById(catId) as any;
            const wa=cleanWa(o.ownerWhatsapp||o.vendeur_whatsapp||o.whatsapp||"");
            return (
              <div key={o.id} className={`bg-white rounded-2xl border overflow-hidden ${o._vendeurCache?"opacity-70 border-dashed":"shadow-sm hover:shadow-md"} transition`}>
                <div className="p-3 flex gap-3">
                  <Link href={`/produit/${o.id}`} className="w-[72px] h-[72px] bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                    {o.photo||o.images?.[0]?<img src={o.photo||o.images?.[0]} alt={o.titre} className="w-full h-full object-cover"/>:<span className="text-2xl">{catObj?.icon||"📦"}</span>}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-[13px] truncate">{o.titre||o.title||o.name}</p>
                      <span className={`text-[9px] px-2 py-1 rounded-full border font-bold flex items-center gap-1 ${st.color}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{st.icon} {st.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{catObj?.icon} {o.categorieTitre||catObj?.titreCourt||catId} • {o.user||o.nomBoutique||"Boutique"} • Qté {o.quantite||1}</p>
                    <p className="font-black text-[12px] mt-1">{formatTotal(o)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded-full">{o._badge} {o._palierId}{o._vendeurCache&&" • 🔒 vendeur caché"}</span>
                      <span className="text-[9px] text-gray-400">{new Date(o.created_at||o.createdAt||Date.now()).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                </div>
                <div className="px-3 pb-3 flex gap-2">
                  <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Bonjour ${o.user||"Boutique"} 👋 Commande WENZE V6 #${o.id} - "${o.titre}" - ${formatTotal(o)} - Status: ${st.label} - Taux ${TAUX_CDF}`)}`} target="_blank" className="flex-1 bg-[#25D366] text-white text-[11px] font-black py-2.5 rounded-full flex justify-center">💬 Contacter vendeur</a>
                  <Link href={`/produit/${o.id}`} className="px-4 bg-gray-100 text-[11px] font-bold py-2.5 rounded-full">Voir</Link>
                </div>
                {o._vendeurCache&&<div className="bg-orange-50 border-t border-orange-100 p-2 text-[9px] text-orange-700">⚠️ Vendeur actuellement 🔒 caché (Freemium 30j expiré + 0 ticket) - Ta commande reste valide - Il réapparaîtra dès qu'il paye ticket 5$ - Même prix pour tous</div>}
              </div>
            );
          })
        )}
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/mes-commandes" className="font-black text-black flex flex-col items-center gap-0.5"><span className="text-[18px]">📦</span>Commandes</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
          }
