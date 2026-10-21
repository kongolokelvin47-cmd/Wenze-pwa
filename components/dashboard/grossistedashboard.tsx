'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function GrossisteDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState({ 
    totalVendeurs: 0, 
    caToday: 0, 
    caMois: 0, 
    commandesAttente: 0 
  })
  const [topVendeurs, setTopVendeurs] = useState<any[]>([])
  const [commandes, setCommandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. CHIFFRE D'AFFAIRES B2B
    const today = new Date().toISOString().split('T')[0]
    const { data: caTodayData } = await supabase
      .from('commandes')
      .select('total')
      .eq('grossiste_id', user.id)
      .gte('created_at', today)

    const { data: caMoisData } = await supabase
      .from('commandes')
      .select('total')
      .eq('grossiste_id', user.id)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    // 2. TOTAL VENDEURS QUI ACHÈTENT CHEZ TOI (DISTINCT)
    const { data: vendeursData } = await supabase
      .from('commandes')
      .select('vendeur_id')
      .eq('grossiste_id', user.id)

    const uniqueVendeurs = new Set(vendeursData?.map(c => c.vendeur_id)).size

    // 3. COMMANDES EN ATTENTE
    const { data: attentes } = await supabase
      .from('commandes')
      .select('id')
      .eq('grossiste_id', user.id)
      .eq('statut', 'en_attente')

    setStats({
      caToday: caTodayData?.reduce((s, c) => s + (c.total || 0), 0) || 0,
      caMois: caMoisData?.reduce((s, c) => s + (c.total || 0), 0) || 0,
      totalVendeurs: uniqueVendeurs,
      commandesAttente: attentes?.length || 0
    })

    // 4. TOP 5 VENDEURS FIDÈLES
    const { data: top } = await supabase
      .from('commandes')
      .select(`
        total,
        vendeur:profiles!commandes_vendeur_id_fkey(nom, boutique_nom, avatar_url, telephone)
      `)
      .eq('grossiste_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Groupe par vendeur
    const grouped: any = {}
    top?.forEach((c: any) => {
      const id = c.vendeur?.nom
      if (!grouped[id]) grouped[id] = { ...c.vendeur, totalAchats: 0, nbCommandes: 0 }
      grouped[id].totalAchats += c.total
      grouped[id].nbCommandes += 1
    })
    setTopVendeurs(Object.values(grouped).sort((a: any, b: any) => b.totalAchats - a.totalAchats).slice(0, 5))

    // 5. DERNIÈRES COMMANDES
    const { data: lastCmds } = await supabase
      .from('commandes')
      .select(`*, vendeur:profiles!commandes_vendeur_id_fkey(nom, boutique_nom)`)
      .eq('grossiste_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setCommandes(lastCmds || [])
    setLoading(false)
  }

  if (loading) return <div className="p-6">Chargement dashboard Grossiste...</div>

  return (
    <div className="p-4 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold">Dashboard Grossiste</h1>

      {/* CARDS CHIFFRES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow">
          <p className="text-gray-500 text-sm">CA Aujourd'hui</p>
          <p className="text-xl font-bold">{stats.caToday.toLocaleString()} FC</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow">
          <p className="text-gray-500 text-sm">CA Ce Mois</p>
          <p className="text-xl font-bold">{stats.caMois.toLocaleString()} FC</p>
        </div>
        <div className="bg-black text-white p-4 rounded-2xl shadow">
          <p className="text-gray-300 text-sm">Mes Vendeurs</p>
          <p className="text-xl font-bold">{stats.totalVendeurs}</p>
        </div>
        <div className="bg-orange-500 text-white p-4 rounded-2xl shadow">
          <p className="text-orange-100 text-sm">En attente</p>
          <p className="text-xl font-bold">{stats.commandesAttente}</p>
        </div>
      </div>

      {/* TOP VENDEURS */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="font-bold mb-3">Top Vendeurs fidèles (qui t'achètent le plus)</h2>
        {topVendeurs.map((v, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b last:border-0">
            <div>
              <p className="font-semibold">{v.boutique_nom || v.nom}</p>
              <p className="text-sm text-gray-500">{v.nbCommandes} commandes</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{v.totalAchats.toLocaleString()} FC</p>
              <a href={`https://wa.me/${v.telephone}`} className="text-xs bg-green-500 text-white px-2 py-1 rounded">WhatsApp</a>
            </div>
          </div>
        ))}
      </div>

      {/* DERNIÈRES COMMANDES B2B */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="font-bold mb-3">Dernières commandes B2B</h2>
        {commandes.map((c: any) => (
          <div key={c.id} className="flex justify-between py-2 border-b">
            <span>{c.vendeur?.boutique_nom} - {c.produit_nom}</span>
            <span className={`px-2 py-1 rounded text-xs ${c.statut === 'en_attente' ? 'bg-yellow-100' : 'bg-green-100'}`}>{c.statut}</span>
          </div>
        ))}
      </div>
    </div>
  )
    }
