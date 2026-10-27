'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie } from '@/lib/categories'
import { TAUX_CDF, toCDF } from '@/lib/paiement'

type Message = {
  id: string
  order_id?: string
  boutique_id?: string
  vendor_name: string
  vendor_phone: string
  ownerWhatsapp?: string
  last_text: string
  last_date?: string
  categorie_id?: string
  titre?: string
  photo?: string
  unread?: number
  total?: number
}

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState<"all"|"commerces-services"|"gros-autres">("all")

  useEffect(() => {
    const load = async () => {
      try {
        let list: Message[] = []

        // 1. Supabase optionnel - si table messages existe
        try {
          const { createClient } = await import('@/utils/supabase/client')
          const supabase = createClient()
          const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(20)
          if(data && data.length>0){
            list = data.map((m:any)=> ({
              id: m.id,
              vendor_name: m.vendor_name || m.boutique_name,
              vendor_phone: m.vendor_phone || m.whatsapp,
              last_text: m.last_text || m.message,
              last_date: m.created_at,
              categorie_id: normalizeCategorie(m.categorie_id || "commerces-services"),
              titre: m.titre,
            }))
          }
        } catch {}

        // 2. WENZE 2.0 PRO - fallback localStorage complet
        if(list.length===0){
          const sources: Message[] = []

          // a) wenze_messages_list (historique pro)
          try {
            const raw = localStorage.getItem("wenze_messages_list")
            if(raw) sources.push(...JSON.parse(raw))
          } catch {}

          // b) wenze_commandes_list → convertit en conversations
          try {
            const rawCmd = localStorage.getItem("wenze_commandes_list")
            if(rawCmd){
              const cmds = JSON.parse(rawCmd)
              for(const c of cmds){
                sources.push({
                  id: c.id,
                  order_id: c.id.slice(0,6),
                  vendor_name: c.user || c.boutique_name || "Boutique WENZE",
                  vendor_phone: c.vendeur_whatsapp || c.ownerWhatsapp || c.whatsapp || "",
                  last_text: c.titre ? `Commande: ${c.titre} - ${c.total}$` : `Commande ${c.id.slice(0,6)}`,
                  last_date: c.created_at || new Date().toISOString(),
                  categorie_id: normalizeCategorie(c.categorie_id || c.categorieId || "commerces-services"),
                  titre: c.titre,
                  photo: c.photo,
                  total: c.total,
                })
              }
            }
          } catch {}

          // c) wenze_all_users → boutiques contactées
          try {
            const rawUsers = localStorage.getItem("wenze_all_users")
            if(rawUsers){
              const users = JSON.parse(rawUsers)
              for(const u of users.slice(0,15)){
                if(!u.ownerWhatsapp) continue
                sources.push({
                  id: u.id || u.ownerWhatsapp,
                  vendor_name: u.nomEtablissement || u.nom || "Boutique",
                  vendor_phone: u.ownerWhatsapp,
                  ownerWhatsapp: u.ownerWhatsapp,
                  last_text: u.categorieId ? `${getCategorieById(normalizeCategorie(u.categorieId))?.titre || u.categorieId} - Boutique WENZE` : "Boutique WENZE Kinshasa",
                  last_date: u.createdAt || new Date().toISOString(),
                  categorie_id: normalizeCategorie(u.categorieId || "commerces-services"),
                  titre: u.nomEtablissement,
                })
              }
            }
          } catch {}

          // Déduplique par vendor_phone
          const uniq = new Map<string, Message>()
          for(const m of sources){
            const key = cleanWa(m.vendor_phone || m.ownerWhatsapp || m.id)
            if(!key) continue
            if(!uniq.has(key) || (m.last_date && (m.last_date > (uniq.get(key)?.last_date || "")))){
              uniq.set(key, { ...m, vendor_phone: key })
            }
          }
          list = Array.from(uniq.values()).sort((a,b)=> new Date(b.last_date||0).getTime() - new Date(a.last_date||0).getTime())
        }

        setMessages(list)
      } catch (e) {
        console.log("WENZE messages vide - normal")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(()=>{
    const q = search.toLowerCase().trim()
    return messages.filter(m=>{
      const cat = normalizeCategorie(m.categorie_id || "commerces-services")
      if(filterCat!=="all" && cat!==filterCat) return false
      if(!q) return true
      return `${m.vendor_name} ${m.titre} ${m.last_text} ${m.vendor_phone}`.toLowerCase().includes(q)
    })
  }, [messages, search, filterCat])

  if (loading) {
    return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Chargement messages WENZE 2.0... Taux {TAUX_CDF}</p></div>
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">Messages</h1>
            <p className="text-[10px] text-gray-500">{filtered.length}/{messages.length} conversations • WhatsApp direct • 0% commission • Taux {TAUX_CDF}</p>
          </div>
          <span className="text-[9px] bg-black text-white px-2 py-1 rounded-full font-black">{messages.length}</span>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Recherche boutique, vendeur, produit..." className="w-full bg-gray-100 rounded-full py-3 px-5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
          <span className="absolute left-3 top-3.5">🔍</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=> setFilterCat("all")} className={`flex-1 py-2.5 rounded-full font-bold text-[11px] border-2 ${filterCat==="all"?"bg-black text-white border-black":"bg-white border-gray-200"}`}>Tous • {messages.length}</button>
          <button onClick={()=> setFilterCat("commerces-services")} className={`flex-1 py-2.5 rounded-full font-bold text-[11px] border-2 ${filterCat==="commerces-services"?"bg-[#6C3CE0] text-white border-[#6C3CE0]":"bg-white border-gray-200"}`}>🛍️ 5$</button>
          <button onClick={()=> setFilterCat("gros-autres")} className={`flex-1 py-2.5 rounded-full font-bold text-[11px] border-2 ${filterCat==="gros-autres"?"bg-black text-white border-black":"bg-white border-gray-200"}`}>🏭 10$</button>
        </div>
      </header>

      <div className="p-4">
        <div className="bg-black text-white rounded-xl p-3 flex justify-between items-center">
          <div><p className="font-black text-[12px]">Messages WENZE - WhatsApp direct</p><p className="text-[10px] opacity-70">Pas de messagerie interne - On ouvre WhatsApp vendeur direct - 0% commission - Taux {TAUX_CDF}</p></div>
          <span className="bg-[#25D366] text-white text-[9px] px-2 py-1 rounded-full font-black">WhatsApp</span>
        </div>

        {filtered.length===0 ? (
          <div className="mt-6 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">💬</p>
            <p className="font-black mt-2 text-[13px]">{search ? `Pas de messages pour "${search}"` : "Aucun message - Commence à vendre/acheter"}</p>
            <p className="text-[11px] text-gray-500 mt-1">WENZE n'héberge pas les messages - Tout passe par WhatsApp direct vendeur - Taux {TAUX_CDF} • 0% comm</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/market" className="bg-[#6C3CE0] text-white p-3 rounded-xl text-[12px] font-bold">🏪 Marché</Link>
              <Link href="/boutiques" className="bg-black text-white p-3 rounded-xl text-[12px] font-bold">🏬 Boutiques</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 mt-4">
            {filtered.map(m=>{
              const catId = normalizeCategorie(m.categorie_id || "commerces-services")
              const catObj = getCategorieById(catId)
              const prixInfo = catObj ? getPrixByCategorie(catObj.id) : { prixUSD: 5, prixCDF: 11500 }
              const wa = cleanWa(m.vendor_phone || m.ownerWhatsapp || "")
              return (
                <div key={`${m.id}-${wa}`} className="bg-white border rounded-2xl p-3 flex gap-3 shadow-sm hover:border-[#6C3CE0]/30 transition">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#FFFBF0] border flex items-center justify-center text-xl overflow-hidden">
                      {m.photo ? <img src={m.photo} alt={m.vendor_name} className="w-full h-full object-cover"/> : catObj?.icon || "🏪"}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 text-[7px] px-1 py-0.5 rounded-full font-black border-2 border-white ${catId==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixInfo.prixUSD}$</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-[13px] truncate">{m.vendor_name}</p>
                      <p className="text-[9px] text-gray-400 whitespace-nowrap ml-2">{m.last_date ? new Date(m.last_date).toLocaleDateString("fr-FR") : ""}</p>
                    </div>
                    <p className="text-[11px] text-gray-600 truncate mt-0.5">{m.last_text}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{catObj?.icon} {catObj?.titreCourt || catId} • {m.titre || `CMD ${m.order_id||""}`} • {m.total ? `${m.total}$ / ${toCDF(m.total).toLocaleString()} CDF` : `${prixInfo.prixUSD}$ boutique`}</p>
                    <div className="mt-2 flex gap-2">
                      <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Bonjour ${m.vendor_name} 👋 WENZE 2.0 - ${m.titre || m.last_text} - Taux ${TAUX_CDF}`)}`} target="_blank" className="flex-1 bg-[#25D366] text-white text-[11px] font-bold py-2 rounded-full text-center">💬 WhatsApp</a>
                      <Link href={m.boutique_id ? `/boutique/${m.boutique_id}` : `/boutiques`} className="px-4 bg-black text-white text-[11px] font-bold py-2 rounded-full">Voir</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-8 bg-white border rounded-2xl p-4">
          <p className="font-black text-[11px]">Comment marche Messages WENZE 2.0 - PRO</p>
          <ul className="text-[10px] text-gray-600 mt-2 space-y-1 list-disc ml-4">
            <li>Historique créé depuis <b>wenze_commandes_list + wenze_all_users + wenze_messages_list</b> (100% local)</li>
            <li>Dédupliqué par WhatsApp - Dernier contact en haut</li>
            <li>Clic ouvre <b>wa.me/{'{vendor_phone}'} direct</b> - 0% commission WENZE</li>
            <li>Badge 🛍️ 5$ / 🏭 10$ selon catégorie boutique - Taux {TAUX_CDF} CDF fixe</li>
          </ul>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/messages" className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">💬</span>Messages</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
}
export const dynamic = 'force-dynamic';
