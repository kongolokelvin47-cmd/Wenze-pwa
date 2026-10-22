'use client'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { TAUX_CDF } from '@/lib/paiement'

const clean = (n: string) => (n || "").replace(/[^0-9]/g, "")
const getLocal = () => { try { return JSON.parse(localStorage.getItem("wenze_user") || "null") } catch { return null } }

function ProfilContent() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [produits, setProduits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        const u = getLocal()
        if (!u) { router.replace('/connexion'); return }
        setProfile(u)
        const all = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]")
        setProduits(all.filter((a:any) => clean(a.whatsapp) === clean(u.whatsapp)))
        setLoading(false)
        return
      }

      let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (!prof) {
        const u = getLocal()
        const { data: np } = await supabase.from('profiles').insert({
          id: user.id,
          nom: u?.nom || user.email?.split('@')[0],
          telephone: u?.whatsapp || '',
          commune: 'Kinshasa',
          email: user.email,
          type: 'freemium'
        }).select().single()
        prof = np
      }

      if (!prof) { setLoading(false); return }
      setProfile(prof)

      const { data: prods } = await supabase.from('produits').select('*').eq('vendeur_id', user.id).order('created_at', { ascending: false })
      setProduits(prods || [])
      setLoading(false)
    })()
  }, [])

  const save = async () => {
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      nom: profile.nom,
      telephone: profile.telephone || profile.whatsapp,
      commune: profile.commune
    }).eq('id', profile.id)
    if (error) return alert(error.message)
    alert('✅ Profil mis à jour')
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.clear()
    window.location.href = '/'
  }

  if (loading) return <div className="max-w-[430px] mx-auto p-10 text-center">Chargement...</div>
  if (!profile) return null

  const isFreemium = (profile.type || 'freemium') === 'freemium'
  const limite = isFreemium ? 3 : 9999
  const restant = limite - produits.length

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 pb-20">
      <button onClick={() => router.push('/')} className="bg-black text-white w-10 h-10 rounded-full">←</button>
      <h1 className="text-xl font-black mt-3">👤 Mon Profil</h1>

      <div className="mt-4 space-y-3">
        <input value={profile.nom || ''} onChange={e=>setProfile({...profile, nom:e.target.value})} className="border p-3 w-full rounded-xl" placeholder="Nom"/>
        <input value={profile.telephone || profile.whatsapp || ''} onChange={e=>setProfile({...profile, telephone:e.target.value})} className="border p-3 w-full rounded-xl" placeholder="WhatsApp"/>
        <input value={profile.commune || ''} onChange={e=>setProfile({...profile, commune:e.target.value})} className="border p-3 w-full rounded-xl" placeholder="Commune"/>
        <button onClick={save} className="w-full bg-black text-white p-3 rounded-full font-bold">Enregistrer</button>
      </div>

      <div className="mt-4 bg-black text-white p-3 rounded-xl flex justify-between">
        <p>{produits.length} / {limite === 9999 ? "ILLIMITÉ" : limite}</p>
        {isFreemium && <p className="text-xs">{restant > 0 ? `${restant} restantes` : 'Limite atteinte!'}</p>}
      </div>

      <div className="mt-6 space-y-2">
        {isFreemium && restant <= 0 ? 
          <Link href="/tarifs" className="block bg-[#6C3CE0] text-white p-3 rounded-full text-center font-bold">Passer Pro 5$ = {TAUX_CDF.toLocaleString()} CDF</Link> :
          <Link href="/publier" className="block bg-black text-white p-3 rounded-xl text-center font-bold">+ Publier</Link>
        }
        <button onClick={logout} className="w-full bg-red-50 text-red-600 p-3 rounded-xl font-bold">Déconnexion</button>
      </div>
    </div>
  )
}

export default function Page(){ return <Suspense fallback={<div className="p-10 text-center">Chargement...</div>}><ProfilContent/></Suspense> }
