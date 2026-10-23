"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

      // 1. Portefeuille - crée si n'existe pas
      let { data: port } = await supabase.from('portefeuilles').select('solde').eq('user_id', user.id).single()
      if (!port) {
        await supabase.from('portefeuilles').insert({ user_id: user.id, solde: 0 })
        port = { solde: 0 }
      }
      setSolde(port?.solde || 0)

      // 2. Profil
      const { data: prof } = await supabase.from('profiles').select('plan, plan_expire_at').eq('id', user.id).single()
      if (prof) { setPlan(prof.plan || 'freemium'); setExpire(prof.plan_expire_at) }

      // 3. Historique - CORRIGÉ: seulement mes transactions
      const { data: h } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15)
      if (h) setHist(h)

    } catch (e) { console.log(e) }
    finally { setLoading(false) }
  }

  async function recharger(montant: number) {
    setPaying('recharge')
    const { data, error } = await supabase.rpc('recharger_fictif', { montant_input: montant })
    if (error) alert('Erreur: ' + error.message)
    else { 
      setSolde(data)
      await init()
    }
    setPaying(null)
  }

  async function payer(code: string, prix: number) {
    if (solde < prix) return alert(`Solde insuffisant! Il te manque ${(prix - solde).toLocaleString()} CDF.`)
    if (!confirm(`Confirmer ${code.toUpperCase()} pour ${prix.toLocaleString()} CDF ?`)) return
    
    setPaying(code)
    const { data, error } = await supabase.rpc('payer_service_wenze', { service_code: code })
    if (error) {
      alert(error.message)
      setPaying(null)
    } else {
      setSolde(data)
      alert('✅ Paiement W-Pay réussi!')
      await init()
      if (code === 'pro' || code === 'grossiste') router.push('/profil')
      else setPaying(null)
    }
  }

  if (loading) return <div className="max-w-[430px] mx-auto p-10 text-center text-sm">Chargement W-Pay...</div>

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-4 pb-24">
      <Link href="/tarifs" className="text-xs">← Voir tarifs officiels</Link>
      
      <h1 className="text-[22px] font-black mt-2">Mon W-Pay</h1>
      <p className="text-[11px] text-gray-500">Taux 2 300 CDF - Test fictif avant vrai Mobile Money</p>

      <div className="bg-black text-white rounded-2xl p-5 mt-4">
        <p className="text-[11px] text-gray-400">Solde disponible</p>
        <p className="text-[32px] font-black mt-1">{solde.toLocaleString()} CDF</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full">Plan: {plan.toUpperCase()}</span>
          {expire && <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Expire: {new Date(expire).toLocaleDateString()}</span>}
          {!expire && <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">MODE TEST</span>}
        </div>
      </div>

      <div className="mt-5">
        <p className="font-bold text-[12px] mb-2">Recharger (Fictif) - Pour tester</p>
        <div className="grid grid-cols-3 gap-2">
          <button disabled={!!paying} onClick={() => recharger(10000)} className="border-2 p-3 rounded-xl text-[11px] font-bold disabled:opacity-50">+10K</button>
          <button disabled={!!paying} onClick={() => recharger(25000)} className="bg-orange-500 text-white p-3 rounded-xl text-[11px] font-bold disabled:opacity-50">+25K</button>
          <button disabled={!!paying} onClick={() => recharger(60000)} className="bg-black text-white p-3 rounded-xl text-[11px] font-bold disabled:opacity-50">+60K</button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {SERVICES.map(section => (
          <div key={section.section}>
            <h2 className="font-black text-[12px] mb-2">{section.section}</h2>
            <div className="space-y-2">
              {section.items.map(s => (
                <div key={s.code} className={`border-2 ${s.border} ${s.bg} rounded-xl p-3 flex justify-between items-center`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[12px] truncate">{s.label}</p>
                    <p className="text-[10px] text-gray-600">{s.sub}</p>
                    <p className="text-[11px] font-black mt-1">{s.usd} / {s.prix.toLocaleString()} CDF</p>
                  </div>
                  <button 
                    disabled={!!paying || solde < s.prix}
                    onClick={() => payer(s.code, s.prix)}
                    className={`${s.color} text-white text-[10px] px-4 py-2.5 rounded-full font-bold disabled:bg-gray-300 whitespace-nowrap ml-3 min-w-[90px]`}
                  >
                    {paying === s.code ? '...' : solde < s.prix ? 'Solde faible' : 'Payer'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-black text-[12px] mt-8 mb-2">Historique W-Pay</h2>
      <div className="border rounded-xl divide-y bg-gray-50">
        {hist.length === 0 && <p className="p-4 text-[11px] text-gray-400 text-center">Aucune transaction</p>}
        {hist.map(t => (
          <div key={t.id} className="flex justify-between p-3">
            <div className="flex-1"><p className="text-[11px] font-medium">{t.description}</p><p className="text-[9px] text-gray-400">{new Date(t.created_at).toLocaleString('fr-FR')}</p></div>
            <span className={`text-[11px] font-black ml-2 ${t.montant > 0 ? 'text-green-600' : 'text-red-600'}`}>{t.montant > 0 ? '+' : ''}{t.montant.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
             }
