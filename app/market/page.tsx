'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type Product = {
  id: string
  name: string
  price: number
  market: string
}

export default function MarketPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const supabase = createClient()
        // Si ta table s'appelle 'products', sinon ça affichera vide sans crasher
        const { data } = await supabase.from('products').select('*').limit(20)
        if (data) setProducts(data)
      } catch (e) {
        console.log('Pas encore de table products, normal')
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  if (loading) {
    return <div className="p-6">Chargement Marché Central...</div>
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Marché WENZE</h1>
        <Link href="/" className="text-sm bg-black text-white px-3 py-1 rounded-full">Accueil</Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <p className="text-3xl mb-2">🛒</p>
          <p className="font-bold">Marché vide pour l'instant</p>
          <p className="text-sm text-gray-500 mt-1">Les produits de Kinshasa arriveront ici</p>
          <p className="text-xs text-gray-400 mt-4">Build OK - en attente de données Supabase</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map(p => (
            <div key={p.id} className="bg-white p-3 rounded-xl shadow">
              <p className="font-bold text-sm">{p.name}</p>
              <p className="text-green-600 font-bold">{p.price} $</p>
              <p className="text-xs text-gray-400">{p.market}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
          }
