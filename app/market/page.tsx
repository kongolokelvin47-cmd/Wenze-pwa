'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { TAUX_CDF, toCDF } from '@/lib/paiement'
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie } from '@/lib/categories'

type Product = {
  id: string
  titre: string
  prix: number
  prixCDF?: number
  categorieId: string
  categorieTitre?: string
  user?: string
  photo?: string
  ownerWhatsapp?: string
  market?: string // ancien champ compat
  name?: string // compat supabase
  price?: number
}

function cleanWa(n: string){ return (n||"").toString().replace(/[^0-9]/g,""); }
function formatPrix(p:any){
  const usd = Number(p.prix || p.price) || 0
  return `${usd}$ / ${toCDF(usd).toLocaleString("fr-FR")} CDF`
}

export default function MarketPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState<"all" | "commerces-services" | "gros-autres">("all")

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // ✅ WENZE 2.0: priorité localStorage, Supabase optionnel si table existe
        let list: any[] = []
        
        // 1. Try Supabase si dispo (ne crashe pas si pas de table)
        try {
          const { createClient } = await import('@/utils/supabase/client')
          const supabase = createClient()
          const { data } = await supabase.from('products').select('*').limit(20)
          if(data && data.length > 0){
            list = data.map((d:any)=> ({
              id: d.id,
              titre: d.name || d.titre,
              prix: d.price || d.prix,
              categorieId: normalizeCategorie(d.categorieId || d.category || "commerces-services"),
              user: d.market || d.user,
              photo: d.photo,
              ownerWhatsapp: d.ownerWhatsapp
            }))
          }
        } catch(e){
          // normal - pas de table products WENZE
        }

        // 2. Fallback WENZE réel: wenze_annonces_list
        if(list.length === 0){
          const raw = localStorage.getItem("wenze_annonces_list")
          if(raw){
            const parsed = JSON.parse(raw)
            list = parsed.map((a:any)=> ({
              ...a,
              categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"),
              titre: a.titre || a.name,
              prix: a.prix || a.price,
            }))
          }
        }

        setProducts(list)
      } catch (e) {
        console.log('WENZE Market - pas de produits encore')
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const filtered = useMemo(()=>{
    const q = search.toLowerCase().trim()
    return products.filter(p=>{
      const cat = normalizeCategorie(p.categorieId)
      if(filterCat !== "all" && cat !== filterCat) return false
      if(!q) return true
      return (p.titre||"").toLowerCase().includes(q) || (p.user||p.market||"").toLowerCase().includes(q) || (p.categorieTitre||"").toLowerCase().includes(q)
    })
  }, [products, search, filterCat])

  if (loading) {
    return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Chargement Marché WENZE 2.0... Taux {TAUX_CDF} CDF</p></div>
  }

  const totalCommerces = products.filter(p=> normalizeCategorie(p.categorieId)==="commerces-services").length
  const totalGros = products.filter(p=> normalizeCategorie(p.categorieId)==="gros-autres").length

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">Marché WENZE 2.0</h1>
            <p className="text-[10px] text-gray-500">🛍️ {totalCommerces} • 🏭 {totalGros} • {products.length} produits • Taux {TAUX_CDF} • 0% comm</p>
          </div>
          <Link href="/publier" className="w-9 h-9 bg-[#6C3CE0] rounded-full flex items-center justify-center text-white font-bold">➕</Link>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Recherche marché: nom, boutique, catégorie..." className="w-full bg-gray-100 rounded-full py-3 px-5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
          <span className="absolute left-3 top-3.5">🔍</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=> setFilterCat("all")} className={`flex-1 py-2.5 rounded-full font-black text-[11px] border-2 ${filterCat==="all"?"bg-black text-white border-black":"bg-white border-gray-200"}`}>Tous • {products.length}</button>
          <button onClick={()=> setFilterCat("commerces-services")} className={`flex-1 py-2.5 rounded-full font-black text-[11px] border-2 ${filterCat==="commerces-services"?"bg-[#6C3CE0] text-white border-[#6C3CE0]":"bg-white border-gray-200"}`}>🛍️ 5$ • {totalCommerces}</button>
          <button onClick={()=> setFilterCat("gros-autres")} className={`flex-1 py-2.5 rounded-full font-black text-[11px] border-2 ${filterCat==="gros-autres"?"bg-black text-white border-black":"bg-white border-gray-200"}`}>🏭 10$ • {totalGros}</button>
        </div>
      </header>

      <div className="p-4">
        <div className="bg-black text-white rounded-xl p-3 flex justify-between items-center">
          <div><p className="font-black text-[12px]">Marché Kinshasa - WENZE 2.0</p><p className="text-[10px] opacity-70">🛍️ Petites activités 5$ même régime (électricité, maçon, coiffure) • 🏭 Gros 10$</p></div>
          <span className="bg-white text-black text-[9px] px-2 py-1 rounded-full font-black">Taux {TAUX_CDF}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">🏪</p>
            <p className="font-black mt-2 text-[13px]">{search ? `Pas de produit pour "${search}"` : "Marché vide - Sois le premier!"}</p>
            <p className="text-[11px] text-gray-500 mt-1">🛍️ 5$ / 11 500 CDF • 🏭 10$ / 23 000 CDF • Taux {TAUX_CDF} • 0% commission</p>
            <Link href="/publier" className="mt-3 inline-block bg-[#6C3CE0] text-white px-6 py-3 rounded-full font-bold text-[12px]">Publier produit 🛍️ 5$</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {filtered.map((p:any)=>{
              const catId = normalizeCategorie(p.categorieId)
              const catObj = getCategorieById(catId)
              const prixInfo = catObj ? getPrixByCategorie(catObj.id) : { prixUSD: 5, prixCDF: 11500 }
              return (
                <div key={p.id} className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                  <Link href={`/produit/${p.id}`} className="block w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden relative">
                    {p.photo ? <img src={p.photo} alt={p.titre} className="max-w-full max-h-full object-contain"/> : <span className="text-3xl">{catObj?.icon || "🏪"}</span>}
                    <span className={`absolute top-2 right-2 text-[7px] px-1.5 py-0.5 rounded-full font-bold ${catId==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixInfo.prixUSD}$</span>
                  </Link>
                  <div className="p-2.5">
                    <p className="font-bold text-[#6C3CE0] text-[13px] truncate">{formatPrix(p)}</p>
                    <p className="text-[11px] font-semibold truncate">{p.titre || p.name}</p>
                    <p className="text-[9px] text-gray-400 truncate">{catObj?.icon} {p.categorieTitre || catObj?.titreCourt || catId} • 👤 {p.user || p.market}</p>
                    <a href={`https://wa.me/${cleanWa(p.ownerWhatsapp)}?text=${encodeURIComponent(`Bonjour ${p.user} 👋 WENZE Marché - "${p.titre}" à ${formatPrix(p)} - Taux ${TAUX_CDF}`)}`} target="_blank" className="mt-2 w-full bg-[#00C950] text-white text-[11px] font-bold py-2.5 rounded-full flex justify-center">💬 WhatsApp</a>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-8 bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">WENZE 2.0 - Marché Kinshasa</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
            {CATEGORIES_WENZE.map((c:any)=> (
              <Link key={c.id} href={`/categorie/${c.id}`} className={`p-3 rounded-xl border-2 ${c.id==="gros-autres"?"bg-black text-white border-black":"bg-purple-50 border-[#6C3CE0]/20"}`}>
                <p className="font-black text-[12px]">{c.icon} {c.titre}</p>
                <p className="opacity-70 mt-1">{c.description}</p>
                <p className="font-black mt-2">{c.prixUSD}$ / {c.prixCDF.toLocaleString()} CDF</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px] bg-[#6C3CE0] text-white w-6 h-6 rounded-full flex items-center justify-center">➕</span>Vendre</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
}
export const dynamic = 'force-dynamic';
