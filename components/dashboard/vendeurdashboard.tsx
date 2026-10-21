'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function VendeurDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState({ ventesToday: 0, commandes: 0, produits: 0 })
  const [stockFaible, setStockFaible] = useState<any[]>([])
  const [grossistes, setGrossistes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]

    // 1. VENTES DU JOUR (tu es vendeur_id)
    const { data: ventes } = await supabase
      .from('commandes')
      .select('total')
      .eq('vendeur_id', user.id)
      .gte('created_at', today)

    // 2. STOCK FAIBLE < 5
    const TABLE = 'produits' // change en 'products' si besoin
    const { data: faible } = await supabase
      .from(TABLE)
      .select('id, nom, stock, prix')
      .eq('vendeur_id', user.id)
      .lt('stock', 5)
      .order('stock', { ascending: true })
      .limit(10)

    // 3. GROSSISTES DISPONIBLES DANS TON DOMAINE
    const { data: me } = await supabase.from('profiles').select('domaine').eq('id', user.id).single()
    
    const { data: gros } = await supabase
      .from('profiles')
      .select('id, nom, boutique_nom, domaine, telephone')
      .eq('user_type', 'grossiste')
      .ilike('domaine', `%${me?.domaine || ''}%`)
      .limit(6)

    const { data: countProd } = await supabase.from(TABLE).select('id', { count: 'exact' }).eq('vendeur_id', user.id)

    setStats({
      ventesToday: ventes?.reduce((s, c) => s + (c.total || 0), 0) || 0,
      commandes: ventes?.length || 0,
      produits: countProd?.length || 0
    })
    setStockFaible(faible || [])
    setGrossistes(gros || [])
    setLoading(false)
  }

  if (loading) return <div className="p-6">Chargement...</div>

  return (
    <div className="p-4 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold">Dashboard Vendeur</h1>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow">
          <p className="text-xs text-gray-500">Ventes aujourd'hui</p>
          <p className="font-bold text-lg">{stats.ventesToday.toLocaleString()} FC</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow">
          <p className="text-xs text-gray-500">Commandes</p>
          <p className="font-bold text-lg">{stats.commandes}</p>
        </div>
        <div className="bg-black text-white p-4 rounded-2xl shadow">
          <p className="text-xs text-gray-300">Produits</p>
          <p className="font-bold text-lg">{stats.produits}</p>
        </div>
      </div>

      {/* ALERTE STOCK FAIBLE - CRITIQUE */}
      <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
        <h2 className="font-bold text-red-700 mb-2">⚠️ Stock faible - À recommander</h2>
        {stockFaible.length === 0 ? <p className="text-sm text-green-600">Tout ton stock est OK 👍</p> :
          stockFaible.map((p: any) => (
            <div key={p.id} className="flex justify-between py-2 border-b border-red-100 last:border-0">
              <span className="font-medium">{p.nom} - <b>{p.stock} restant</b></span>
              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">Re-stock</span>
            </div>
          ))
        }
      </div>

      {/* GROSSISTES DANS TON DOMAINE - INNOVATION WENZE */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="font-bold mb-3">Grossistes pour ton domaine - Commande B2B</h2>
        <p className="text-xs text-gray-500 mb-3">Tu vendras moins cher si tu achètes chez eux</p>
        {grossistes.map((g: any) => (
          <div key={g.id} className="flex justify-between items-center py-3 border-b last:border-0">
            <div>
              <p className="font-semibold">{g.boutique_nom || g.nom}</p>
              <p className="text-xs text-gray-500">{g.domaine}</p>
            </div>
            <a href={`https://wa.me/${g.telephone}`} className="text-xs bg-green-500 text-white px-3 py-2 rounded-full">Commander</a>
          </div>
        ))}
      </div>

      <button onClick={() => window.location.href = '/produits/nouveau'} className="w-full bg-black text-white p-4 rounded-2xl font-bold">
        + Ajouter un produit
      </button>
    </div>
  )
}
