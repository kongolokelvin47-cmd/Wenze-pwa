'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getCategorieById, normalizeCategorie } from '@/lib/categories'
import { TAUX_CDF, toCDFString, isCompteCache, checkFreemiumWenze } from '@/lib/paiement'

type Message = {
  id: string; order_id?: string; boutique_id?: string;
  vendor_name: string; vendor_phone: string; ownerWhatsapp?: string; whatsapp?: string; user?: string; nomBoutique?: string;
  last_text: string; last_date?: string; created_at?: string;
  categorie_id?: string; categorieId?: string; titre?: string; title?: string; name?: string;
  photo?: string; images?: string[]; unread?: number; total?: number; totalUSD?: number;
  _isPaye?: boolean; _badge?: string; _palierId?: string; _jours?: number; _vendeurCache?: boolean;
}

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");
function formatDate(d?: string){
  if(!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  if(diff<60000) return "À l'instant";
  if(diff<3600000) return `${Math.floor(diff/60000)}m`;
  if(diff<86400000) return `${Math.floor(diff/3600000)}h`;
  if(diff<604800000) return `${Math.floor(diff/86400000)}j`;
  return new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState<"all"|"commerces-services"|"gros-autres">("all")

  useEffect(() => {
    try{
      const raw = localStorage.getItem("wenze_messages_list") || localStorage.getItem("wenze_commandes_list") || "[]";
      const list = JSON.parse(raw);
      const allUsers = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
      const userMap = new Map<string,any>();
      for(const u of allUsers){ const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||""); if(wa) userMap.set(wa,u); }

      let enriched: Message[] = list.map((m:any)=>({
        id:m.id||m.order_id||Math.random().toString(), order_id:m.order_id||m.id, boutique_id:m.boutique_id||m.vendor_phone,
        vendor_name:m.vendor_name||m.user||m.nomBoutique||"Boutique", vendor_phone:m.vendor_phone||m.ownerWhatsapp||m.whatsapp||"", ownerWhatsapp:m.ownerWhatsapp||m.vendor_phone, whatsapp:m.whatsapp, user:m.user, nomBoutique:m.nomBoutique,
        last_text:m.last_text||m.titre||m.title||"Bonjour, votre produit m'intéresse...", last_date:m.last_date||m.created_at||m.createdAt, created_at:m.created_at||m.last_date,
        categorie_id:m.categorie_id||m.categorieId, categorieId:m.categorieId||m.categorie_id, titre:m.titre||m.title||m.name, title:m.title, name:m.name,
        photo:m.photo||m.images?.[0], images:m.images, unread:m.unread||0, total:m.total||m.totalUSD||0, totalUSD:m.totalUSD||m.total||0,
      })).map((m:Message)=>{
        try{
          const wa=cleanWa(m.ownerWhatsapp||m.vendor_phone||m.whatsapp||"");
          const user=userMap.get(wa)||{ ownerWhatsapp:wa, createdAt:m.created_at||m.last_date, id:wa };
          const cache=isCompteCache(user);
          const ab=checkFreemiumWenze(user,0);
          return { ...m, _vendeurCache:!!cache, _isPaye:!!ab.isPaye, _badge:ab.badge, _palierId:ab.palierId, _jours:ab.joursRestants||0 };
        }catch{ return { ...m, _vendeurCache:false, _isPaye:false, _badge:"🆓" }; }
      }).sort((a:any,b:any)=> new Date(b.last_date||b.created_at||0).getTime()-new Date(a.last_date||a.created_at||0).getTime());

      // V6: On garde messages même si vendeur caché mais on les marque - comme WhatsApp
      setMessages(enriched);
    }catch(e){ console.log("messages V6",e); } finally{ setLoading(false); }
  },[])

  const filtered = useMemo(()=>{
    let list=messages;
    if(filterCat!=="all"){
      list=list.filter(m=>{
        const cat=normalizeCategorie(m.categorie_id||m.categorieId||"commerces-services");
        const obj=getCategorieById(cat) as any;
        if(filterCat==="commerces-services") return obj?.groupe==="commerces-services"||!cat.includes("gros");
        if(filterCat==="gros-autres") return obj?.groupe==="gros-autres"||cat.includes("gros");
        return true;
      });
    }
    if(!search.trim()) return list;
    const q=search.toLowerCase(); const qWa=cleanWa(q);
    return list.filter(m=> (m.vendor_name||m.nomBoutique||m.user||"").toLowerCase().includes(q) || (m.last_text||"").toLowerCase().includes(q) || (m.titre||m.title||m.name||"").toLowerCase().includes(q) || (qWa&&cleanWa(m.vendor_phone||m.ownerWhatsapp||"").includes(qWa)));
  },[messages,search,filterCat]);

  const totalUnread = messages.reduce((s,m)=>s+(m.unread||0),0);

  if(loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Chargement messages V6 - Taux {TAUX_CDF} - 0% comm...</p></div>;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px] flex items-center gap-2">Messages V6 {totalUnread>0&&<span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{totalUnread} non lus</span>}</h1>
            <p className="text-[10px] text-gray-500">{messages.length} conversations • Taux {TAUX_CDF} • 0% commission • WhatsApp direct</p>
          </div>
          <Link href="/market" className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white">🛒</Link>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Recherche: boutique, produit, WA..." className="w-full bg-gray-100 rounded-2xl py-3.5 px-5 pl-11 text-sm outline-none focus:ring-2 focus:ring-black" />
          <span className="absolute left-4 top-3.5">🔍</span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {[{id:"all",label:`Tous • ${messages.length}`},{id:"commerces-services",label:"🛍️ Détail"},{id:"gros-autres",label:"🏭 Gros"}].map(c=>(
            <button key={c.id} onClick={()=>setFilterCat(c.id as any)} className={`whitespace-nowrap py-2.5 px-4 rounded-full font-black text-[11px] border-2 ${filterCat===c.id?"bg-black text-white border-black":"bg-white border-gray-200"}`}>{c.label}</button>
          ))}
        </div>
        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px] flex justify-between">
          <span><b>V6 Nouvelle Politique:</b> 0% comm • Messages directs WhatsApp • Même ticket ⭐5$ ({toCDFString(5)}) 🚀10$ 👑20$ • Max 50 • Vendeur caché 🔒 gardé en messages</span>
          <span className="bg-white text-black px-2 py-0.5 rounded-full font-black">{TAUX_CDF}</span>
        </div>
      </header>

      <div className="p-0">
        {filtered.length===0 ? (
          <div className="mt-6 mx-3 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">💬</p>
            <p className="font-black mt-2 text-[13px]">{search||filterCat!=="all"?`Pas de message pour "${search||filterCat}"`:"Aucun message - Commence à discuter!"}</p>
            <p className="text-[11px] text-gray-500 mt-1">Contacte un vendeur depuis Marché → WhatsApp direct - 0% comm - Taux {TAUX_CDF}</p>
            <Link href="/market" className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]">Aller au Marché</Link>
          </div>
        ) : (
          <div className="bg-white divide-y divide-gray-100">
            {filtered.map(m=>{
              const catId=normalizeCategorie(m.categorie_id||m.categorieId||"commerces-services");
              const catObj=getCategorieById(catId) as any;
              const wa=cleanWa(m.ownerWhatsapp||m.vendor_phone||m.whatsapp||"");
              return (
                <div key={m.id} className={`flex gap-3 p-4 hover:bg-gray-50 transition ${m._vendeurCache?"opacity-70":""} ${m.unread?"bg-orange-50/50":""}`}>
                  <div className="relative shrink-0">
                    <div className="w-[52px] h-[52px] bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                      {m.photo||m.images?.[0]?<img src={m.photo||m.images?.[0]} alt={m.vendor_name} className="w-full h-full object-cover"/>:<span className="text-xl">{catObj?.icon||"🏪"}</span>}
                    </div>
                    {m.unread? <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">{m.unread>9?"9+":m.unread}</span> : <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${m._isPaye?"bg-green-500":"bg-gray-300"}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-[13px] truncate flex items-center gap-1">{m.vendor_name||m.nomBoutique||m.user||"Boutique"} <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded-full">{m._badge} {m._palierId}{m._vendeurCache&&" 🔒"}</span></p>
                      <span className="text-[10px] text-gray-400 shrink-0">{formatDate(m.last_date||m.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{catObj?.icon} {m.titre||m.title||m.name||"Produit"} {m.total?`• ${m.total}$`: ""}</p>
                    <p className={`text-[12px] truncate mt-1 ${m.unread?"font-bold text-black":"text-gray-600"}`}>{m.last_text}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Bonjour ${m.vendor_name||"Boutique"} 👋 Suite message WENZE V6 - "${m.titre||m.title||"produit"}" - Taux ${TAUX_CDF} - 0% comm`)}`} target="_blank" className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center text-white">💬</a>
                    <Link href={`/produit/${m.order_id||m.boutique_id||m.id}`} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-[12px]">👁️</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {filtered.some(m=>m._vendeurCache)&&<div className="mx-3 mt-3 bg-orange-50 border border-orange-100 rounded-xl p-2.5 text-[10px] text-orange-700">⚠️ Certains vendeurs sont actuellement 🔒 cachés (Freemium 30j expiré + 0 ticket actif) - Leurs messages restent accessibles - Ils réapparaîtront dès paiement ticket 5$ - Même prix pour tous - Max 50 actives - Suppression libère place</div>}
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/messages" className="font-black text-black flex flex-col items-center gap-0.5"><span className="text-[18px] relative">💬{totalUnread>0&&<span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">{totalUnread}</span>}</span>Messages</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
     }
