'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function PrestataireDashboard() {
  const [stats, setStats] = useState({ demandes: 0, note: 0, termines: 0 })
  const [demandes, setDemandes] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return

    const { data: d } = await supabase.from('demandes')
      .select('*').eq('prestataire_id', user.id).eq('statut', 'en_attente')

    const { data: avis } = await supabase.from('avis')
      .select('note').eq('prestataire_id', user.id)

    const moyenne = avis?.length ? avis.reduce((s,c)=>s+c.note,0)/avis.length : 0

    setStats({ demandes: d?.length||0, note: Number(moyenne.toFixed(1)), termines: 0 })
    setDemandes(d||[])
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard Prestataire</h1>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow"><p className="text-xs">Demandes</p><p className="font-bold text-lg">{stats.demandes}</p></div>
        <div className="bg-black text-white p-4 rounded-2xl shadow"><p className="text-xs">Note</p><p className="font-bold text-lg">{stats.note} ★</p></div>
        <div className="bg-white p-4 rounded-2xl shadow"><p className="text-xs">Terminés</p><p className="font-bold text-lg">{stats.termines}</p></div>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="font-bold mb-2">Demandes en attente</h2>
        {demandes.map((x:any)=><div key={x.id} className="py-2 border-b flex justify-between"><span>{x.service} - {x.client_nom}</span><span className="bg-yellow-100 px-2 rounded text-xs">{x.statut}</span></div>)}
      </div>
    </div>
  )
  }
