"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

// ✅ FIX VERCEL: client direct, plus de ../../lib/supabase qui plante
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SERVICES = [
  { section: "ABONNEMENTS", items: [
    { code: 'pro', label: 'Vendeur Pro / Services', sub: 'Annonces illimitées + Outils', prix: 11500, usd: '5 $ / mois', color: 'bg-[#6C3CE0]', border: 'border-purple-200', bg: 'bg-purple-50' },
    { code: 'grossiste', label: 'Grossiste / Grande Échelle', sub: 'Tout Pro + B2B', prix: 57500, usd: '25 $ / mois', color: 'bg-orange-500', border: 'border-orange-200', bg: 'bg-orange-50' },
  ]},
  { section: "PUBLICATIONS", items: [
    { code: 'occasionnel', label: 'Publication Occasionnelle', sub: '1 annonce / 5 jours', prix: 6900, usd: '3 $', color: 'bg-black', border: 'border-yellow-200', bg: 'bg-yellow-50' },
  ]},
  { section: "PUBLICITÉ BOOST & VIDÉO", items: [
    { code: 'boost_image', label: 'Boost Image', sub: '5 jours - Carrousel', prix: 4600, usd: '2 $', color: 'bg-black', border: 'border-gray-200', bg: 'bg-white' },
    { code: 'video_express', label: 'Video Express', sub: '2 jours - 60s', prix: 2300, usd: '1 $', color: 'bg-gray-800', border: 'border-gray-200', bg: 'bg-white' },
    { code: 'video_standard', label: 'Video Standard', sub: '6 jours - 60s', prix: 6900, usd: '3 $', color: 'bg-gray-800', border: 'border-gray-200', bg: 'bg-white' },
    { code: 'video_mensuelle', label: 'Video Mensuelle', sub: '30 jours', prix: 34500, usd: '15 $', color: 'bg-gray-900', border: 'border-gray-200', bg: 'bg-white' },
  ]},
]

export default function PortefeuilleWenze() {
  const [solde, setSolde] = useState(0)
  const [plan, setPlan] = useState('freemium')
  const [expire, setExpire] = useState<string | null>(null)
  const [hist, setHist] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => { init() }, [])

  async function init() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let { data: port } = await supabase.from('portefeuilles').select('solde').eq('user_id', user.id).single()
      if (!port) {
        await supabase.from('portefeuilles').insert({ user_id: user.id, solde: 0 })
        port = { solde: 0 } as any
      }
      setSolde(port?.solde || 0)

      const { data: prof } = await supabase.from('profiles').select('plan, plan_expire_at').eq('id', user.id).single()
      if (prof) { setPlan(prof.plan || 'freemium'); setExpire(prof.plan_expire_at) }

      const { data: h } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15)
      if (h) setHist(h)
    } catch (e) { console.log(e) }
    finally { setLoading(false) }
  }

  async function recharger(montant: number) {
    setPaying('recharge')
    const { data, error } = await supabase.rpc('recharger_fictif', { montant_input: montant })
    if (error) alert('Erreur: ' + error.message)
    else { setSolde(data); await init() }
    setPaying(null)
  }

  async function payer(code: string, prix: number) {
    if (solde < prix) return alert(`Solde insuffisant! Manque ${(prix - solde).toLocaleString()} CDF`)
    if (!confirm(`Payer ${prix.toLocaleString()} CDF pour ${code}?`)) return
    setPaying(code)
    const { data, error } = await supabase.rpc('payer_service_wenze', { service_code: code })
    if (error) { alert(error.message); setPaying(null) }
    else { setSolde(data); alert('✅ Paiement W-Pay réussi!'); await init(); if (code === 'pro' || code === 'grossiste') router.push('/profil'); else setPaying(null) }
  }

  if (loading) return <div className="max-w-[430px] mx-auto p-10 text-center text-sm">Chargement W-Pay...</div>

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-4 pb-24">
      <Link href="/tarifs" className="text-xs">← Tarifs</Link>
      <h1 className="text-[22px] font-black mt-2">Mon W-Pay</h1>
      <p className="text-[11px] text-gray-500">Taux 2 300 CDF - Test fictif</p>
      <div className="bg-black text-white rounded-2xl p-5 mt-4">
        <p className="text-[11px] text-gray-400">Solde</p>
        <p className="text-[32px] font-black">{solde.toLocaleString()} CDF</p>
        <p className="text-[10px] mt-2 bg-white/20 inline-block px-2 py-1 rounded-full">Plan: {plan.toUpperCase()} {expire ? `- Exp ${new Date(expire).toLocaleDateString()}` : ''}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button disabled={!!paying} onClick={()=>recharger(10000)} className="border-2 p-3 rounded-xl text-[11px] font-bold disabled:opacity-50">+10K</button>
        <button disabled={!!paying} onClick={()=>recharger(25000)} className="bg-orange-500 text-white p-3 rounded-xl text-[11px] font-bold disabled:opacity-50">+25K</button>
        <button disabled={!!paying} onClick={()=>recharger(60000)} className="bg-black text-white p-3 rounded-xl text-[11px] font-bold disabled:opacity-50">+60K</button>
      </div>
      <div className="mt-6 space-y-6">
        {SERVICES.map(s => (
          <div key={s.section}>
            <h2 className="font-black text-[11px] mb-2">{s.section}</h2>
            <div className="space-y-2">
              {s.items.map(it => (
                <div key={it.code} className={`border-2 ${it.border} ${it.bg} rounded-xl p-3 flex justify-between items-center`}>
                  <div><p className="font-bold text-[12px]">{it.label}</p><p className="text-[10px] text-gray-600">{it.sub}</p><p className="text-[11px] font-black">{it.usd} / {it.prix.toLocaleString()} CDF</p></div>
                  <button disabled={!!paying || solde < it.prix} onClick={()=>payer(it.code,it.prix)} className={`${it.color} text-white text-[10px] px-4 py-2 rounded-full font-bold disabled:bg-gray-300 ml-2`}>{paying===it.code?'...':solde<it.prix?'Faible':'Payer'}</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <h2 className="font-black text-[11px] mt-6">Historique</h2>
      <div className="border rounded-xl divide-y mt-2">
        {hist.map(t=>(
          <div key={t.id} className="flex justify-between p-3"><div><p className="text-[11px]">{t.description}</p><p className="text-[9px] text-gray-400">{new Date(t.created_at).toLocaleString()}</p></div><span className={`text-[11px] font-black ${t.montant>0?'text-green-600':'text-red-600'}`}>{t.montant}</span></div>
        ))}
      </div>
    </div>
  )
                                                                             }
