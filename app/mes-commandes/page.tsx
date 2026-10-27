'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie } from '@/lib/categories'
import { TAUX_CDF, toCDF } from '@/lib/paiement'

type Order = {
  id: string
  status: string
  total: number
  total_cdf?: number
  created_at: string
  categorie_id?: string
  categorieId?: string
  titre?: string
  photo?: string
  vendeur_whatsapp?: string
  ownerWhatsapp?: string
  whatsapp?: string
  user?: string
  quantite?: number
}

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

function formatTotal(o: Order){
  const usd = Number(o.total) || 0
  const cdf = o.total_cdf || toCDF(usd)
  return `${usd}$ / ${cdf.toLocaleString("fr-FR")} CDF`
}

function statusConfig(s: string){
  const low = (s||"").toLowerCase()
  if(low.includes("paye") || low.includes("payé") || low==="paid") return { label: "Payée", color: "bg-green-500 text-white", icon: "✅" }
  if(low.includes("expedition") || low.includes("livraison")) return { label: "En expédition", color: "bg-blue-500 text-white", icon: "🚚" }
  if(low.includes("livre") || low==="delivered") return { label: "Livrée", color: "bg-black text-white", icon: "📦" }
  if(low.includes("annul")) return { label: "Annulée", color: "bg-red-500 text-white", icon: "❌" }
  return { label: "En attente", color: "bg-orange-400 text-white", icon: "⏳" }
}

export default function CommandesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "attente" | "paye" | "expedition" | "livre">("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        let list: Order[] = []
        
        // 1. Supabase optionnel (si table orders existe)
        try {
          const { createClient } = await import('@/utils/supabase/client')
          const supabase = createClient()
          const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50)
          if(data && data.length>0) list = data
        } catch(e){
          // normal si pas de table
        }

        // 2. Fallback WENZE 2.0 localStorage - wenze_commandes_list + wenze_cart
        if(list.length===0){
          try {
            const rawCmd = localStorage.getItem("wenze_commandes_list")
            if(rawCmd){
              const parsed = JSON.parse(rawCmd)
              list = parsed
            } else {
              // fallback panier converti en commandes démo si vide
              const cartRaw = localStorage.getItem("wenze_panier")
              if(cartRaw){
                const cart = JSON.parse(cartRaw)
                list = cart.map((c:any, i:number)=> ({
                  id: c.id || `CMD-${Date.now()}-${i}`,
                  status: "attente",
                  total: c.prix || c.price || 0,
                  total_cdf: toCDF(c.prix || c.price || 0),
                  created_at: new Date().toISOString(),
                  categorie_id: normalizeCategorie(c.categorieId || c.categorie || "commerces-services"),
                  titre: c.titre || c.name,
                  photo: c.photo,
                  vendeur_whatsapp: c.ownerWhatsapp || c.vendeur_whatsapp,
                }))
              }
            }
          } catch {}
        }

        // Normalise categories 2.0
        const fixed = list.map(o=> ({
          ...o,
          categorie_id: normalizeCategorie(o.categorie_id || o.categorieId || "commerces-services"),
        }))

        setOrders(fixed)
      } catch(e){
        console.log("WENZE commandes - vide")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(()=>{
    const q = search.toLowerCase().trim()
    return orders.filter(o=>{
      if(filter!=="all"){
        const st = statusConfig(o.status).label.toLowerCase()
        if(filter==="attente" && !st.includes("attente")) return false
        if(filter==="paye" && !st.includes("payée")) return false
        if(filter==="expedition" && !st.includes("expédition")) return false
        if(filter==="livre" && !st.includes("livrée")) return false
      }
      if(q){
        const hay = `${o.titre} ${o.id} ${o.categorie_id} ${o.vendeur_whatsapp}`.toLowerCase()
        if(!hay.includes(q)) return false
      }
      return true
    })
  }, [orders, filter, search])

  const totalUSD = filtered.reduce((s,o)=> s + (Number(o.total)||0), 0)

  if (loading) {
    return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Chargement commandes WENZE 2.0... Taux {TAUX_CDF}</p></div>
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/profil" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">Mes Commandes</h1>
            <p className="text-[10px] text-gray-500">{filtered.length}/{orders.length} commandes • Total {totalUSD}$ / {toCDF(totalUSD).toLocaleString()} CDF • Taux {TAUX_CDF} • 0% comm</p>
          </div>
          <span className="text-[9px] bg-black text-white px-2 py-1 rounded-full font-black">{totalUSD}$</span>
        </div>

        <div className="mt-3 relative">
          <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Recherche: titre, vendeur, ID..." className="w-full bg-gray-100 rounded-full py-3 px-5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
          <span className="absolute left-3 top-3.5">🔍</span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { id: "all", label: `Toutes • ${orders.length}` },
            { id: "attente", label: `⏳ Attente` },
            { id: "paye", label: `✅ Payées` },
            { id: "expedition", label: `🚚 Expédition` },
            { id: "livre", label: `📦 Livrées` },
          ].map(f=> (
            <button key={f.id} onClick={()=> setFilter(f.id as any)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-bold border-2 ${filter===f.id ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}>{f.label}</button>
          ))}
        </div>
      </header>

      <div className="p-4">
        <div className="bg-black text-white rounded-xl p-3 flex justify-between items-center">
          <div><p className="font-black text-[12px]">WENZE 2.0 - 2 catégories</p><p className="text-[10px] opacity-70">🛍️ Commerces & Services 5$ • 🏭 Gros & autres 10$ - 0% commission - Paiement direct WhatsApp vendeur</p></div>
          <span className="bg-white text-black text-[9px] px-2 py-1 rounded-full font-black">Taux {TAUX_CDF}</span>
        </div>

        {filtered.length===0 ? (
          <div className="mt-6 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">🛒</p>
            <p className="font-black mt-2 text-[13px]">{search || filter!=="all" ? `Aucune commande ${filter} pour "${search}"` : "Aucune commande encore"}</p>
            <p className="text-[11px] text-gray-500 mt-1">Passe commande via WhatsApp direct vendeur - WENZE 0% commission - Taux {TAUX_CDF}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/market" className="bg-[#6C3CE0] text-white p-3 rounded-xl text-[12px] font-bold">🏪 Marché</Link>
              <Link href="/boutiques" className="bg-black text-white p-3 rounded-xl text-[12px] font-bold">🏬 Boutiques</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 mt-4">
            {filtered.map((o)=>{
              const catId = normalizeCategorie(o.categorie_id || o.categorieId || "commerces-services")
              const catObj = getCategorieById(catId)
              const prixCat = catObj ? getPrixByCategorie(catObj.id) : { prixUSD: 5, prixCDF: 11500 }
              const st = statusConfig(o.status)
              return (
                <div key={o.id} className="bg-white border rounded-2xl p-3 flex gap-3 shadow-sm">
                  <div className="w-14 h-14 rounded-xl bg-[#FFFBF0] border flex items-center justify-center overflow-hidden text-xl">
                    {o.photo ? <img src={o.photo} alt={o.titre} className="w-full h-full object-contain"/> : catObj?.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-[13px] truncate">{o.titre || `Commande ${o.id.slice(0,8)}`}</p>
                      <span className={`text-[9px] px-2 py-1 rounded-full font-black whitespace-nowrap ${st.color}`}>{st.icon} {st.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{catObj?.icon} {catObj?.titreCourt || catId} • {prixCat.prixUSD}$ boutique • {new Date(o.created_at).toLocaleDateString("fr-FR")} • Qté {o.quantite||1}</p>
                    <p className="font-black text-[#6C3CE0] text-[13px] mt-1">{formatTotal(o)}</p>
                    <div className="mt-2 flex gap-2">
                      <Link href={`/produit/${o.id}`} className="flex-1 bg-black text-white text-[11px] font-bold py-2 rounded-full text-center">Voir</Link>
                      <a href={`https://wa.me/${cleanWhatsapp(o.vendeur_whatsapp || o.ownerWhatsapp || o.whatsapp || "")}?text=${encodeURIComponent(`Bonjour, commande WENZE ${o.id} - ${o.titre} - ${formatTotal(o)} - Taux ${TAUX_CDF}`)}`} target="_blank" className="flex-1 bg-[#25D366] text-white text-[11px] font-bold py-2 rounded-full text-center">💬 Vendeur</a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-8 bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">Résumé WENZE 2.0</p>
          <div className="mt-2 flex justify-between text-[12px]"><span>Total filtré:</span><b>{totalUSD}$ / {toCDF(totalUSD).toLocaleString()} CDF</b></div>
          <p className="text-[10px] text-gray-500 mt-2">Taux fixe {TAUX_CDF} CDF • 🛍️ 5$ / 11 500 CDF petites activités (électricité, maçon, coiffure) • 🏭 10$ / 23 000 CDF gros - 0% commission - Paiement direct WhatsApp</p>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/mes-commandes" className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">🛒</span>Commandes</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
}
export const dynamic = 'force-dynamic';
