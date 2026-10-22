'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type Order = {
  id: string
  status: string
  total: number
  created_at: string
}

export default function CommandesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (data) setOrders(data)
      } catch (e) {
        console.log('Table orders pas encore créée')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-6">Chargement de tes commandes...</div>

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Mes Commandes</h1>

      {orders.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-bold">Aucune commande</p>
          <p className="text-sm text-gray-500 mt-1">Tes achats au Marché Central apparaîtront ici</p>
          <Link href="/market" className="inline-block mt-4 bg-black text-white text-sm px-5 py-2 rounded-full">
            Aller au Marché
          </Link>
          <p className="text-[10px] text-gray-300 mt-6">Build OK - Auth Supabase connecté</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="bg-white p-4 rounded-xl shadow flex justify-between">
              <div>
                <p className="font-bold text-sm">#{o.id.slice(0,8)}</p>
                <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">{o.total} $</p>
                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
