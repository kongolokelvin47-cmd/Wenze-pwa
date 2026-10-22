'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams } from 'next/navigation'

export default function ProfilVendeurPage() {
  const params = useParams()
  const id = params.id as string
  const [vendor, setVendor] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('vendors').select('*').eq('id', id).single()
        if (data) setVendor(data)
      } catch (e) {
        console.log('Vendeur pas encore en base')
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
  }, [id])

  if (loading) return <div className="p-6">Chargement vendeur...</div>

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold">Profil Vendeur</h1>
      <p className="text-xs text-gray-400 mb-4">ID: {id}</p>
      
      {vendor ? (
        <div className="bg-white p-6 rounded-2xl shadow">
          <p className="font-bold">{vendor.name || 'Vendeur WENZE'}</p>
          <p className="text-sm text-gray-500">{vendor.market || 'Marché Central'}</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <p className="text-3xl mb-2">🏪</p>
          <p className="font-bold">Boutique en préparation</p>
          <p className="text-xs text-gray-400 mt-1">Le profil public de ce vendeur arrive bientôt</p>
        </div>
      )}
    </div>
  )
}
