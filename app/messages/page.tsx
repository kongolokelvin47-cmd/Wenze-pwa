'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type Message = {
  id: string
  order_id: string
  vendor_name: string
  vendor_phone: string
  last_text: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        // Essaie de charger les commandes pour créer l'historique
        const { data } = await supabase.from('orders').select('*').limit(10)
        if (data && data.length > 0) {
          // Simule des messages à partir des commandes
          const fakeMessages = data.map((o: any) => ({
            id: o.id,
            order_id: o.id.slice(0, 6),
            vendor_name: 'Vendeur Marché Central',
            vendor_phone: '243900000000',
            last_text: `Commande #${o.id.slice(0,6)} - ${o.status || 'En attente'}`
          }))
          setMessages(fakeMessages)
        }
      } catch (e) {
        console.log('Pas de orders table, normal')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const openWhatsApp = (phone: string, orderId: string) => {
    const text = `Bonjour! Je vous contacte depuis WENZE pour ma commande #${orderId}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) return <div className="p-6">Chargement messages...</div>

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-1">Messages</h1>
      <p className="text-xs text-gray-500 mb-6">Historique relié à WhatsApp</p>

      {messages.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow text-center">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-bold">Aucune conversation</p>
          <p className="text-sm text-gray-500 mt-1">Tes discussions avec les vendeurs apparaîtront ici</p>
          
          <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="text-xs text-green-800 font-bold">Comment ça marche au début:</p>
            <p className="text-xs text-green-700 mt-1">1. Tu commandes au marché<br/>2. On te connecte sur WhatsApp<br/>3. L'historique reste ici</p>
          </div>

          <Link href="/market" className="inline-block mt-6 bg-black text-white text-sm px-6 py-2.5 rounded-full">
            Aller au Marché
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(m => (
            <div key={m.id} className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">{m.vendor_name}</p>
                <p className="text-xs text-gray-500">{m.last_text}</p>
              </div>
              <button
                onClick={() => openWhatsApp(m.vendor_phone, m.order_id)}
                className="bg-[#25D366] text-white text-xs font-bold px-4 py-2 rounded-full"
              >
                WhatsApp
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
            }
