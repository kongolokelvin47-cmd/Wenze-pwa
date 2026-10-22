'use client'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { TAUX_CDF } from '@/lib/paiement'

const clean = (n: string) => (n || "").replace(/[^0-9]/g, "")
const getLocal = () => { try { return JSON.parse(localStorage.getItem("wenze_user") || "null") } catch { return null } }

const PROVINCES = [
  "Kinshasa", "Kongo Central", "Kwango", "Kwilu", "Mai-Ndombe",
  "Kasaï", "Kasaï-Central", "Kasaï-Oriental", "Lomami", "Sankuru",
  "Maniema", "Sud-Kivu", "Nord-Kivu", "Ituri", "Haut-Uele", 
  "Bas-Uele", "Tshopo", "Equateur", "Mongala", "Nord-Ubangi",
  "Sud-Ubangi", "Tshuapa", "Tanganyika", "Haut-Lomami", "Lualaba", "Haut-Katanga"
]

function ProfilContent() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [produits, setProduits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string|null>(null)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        const u = getLocal()
        if (!u) { router.replace('/connexion'); return }
        setProfile({
          ...u,
          pays: u.pays || 'RDC',
          province: u.province || 'Kinshasa',
          ville: u.ville || 'Kinshasa',
          commune: u.commune || '',
          territoire: u.territoire || '',
          quartier: u.quartier || ''
        })
        const all = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]")
        setProduits(all.filter((a:any) => clean(a.whatsapp) === clean(u.whatsapp)))
        setLoading(false)
        return
      }

      setUserId(user.id)
      let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      
      if (!prof) {
        const u = getLocal()
        const { data: np, error } = await supabase.from('profiles').insert({
          id: user.id,
          nom: u?.nom || user.email?.split('@')[0],
          telephone: u?.whatsapp || '',
          email: user.email,
          type: 'freemium',
          pays: 'RDC',
          province: 'Kinshasa',
          ville: 'Kinshasa',
          commune: u?.commune || '',
          territoire: '',
          quartier: ''
        }).select().single()
        if (error) console.log("Erreur insert profil:", error.message)
        prof = np
      }

      if (!prof) { setLoading(false); return }
      setProfile(prof)

      const { data: prods } = await supabase.from('produits').select('*').eq('vendeur_id', user.id).order('created_at', { ascending: false })
      setProduits(prods || [])
      setLoading(false)
    })()
  }, [router])

  const isKinshasa = (profile?.province || 'Kinshasa') === 'Kinshasa'

  const save = async () => {
    const supabase = createClient()
    if (!profile.ville) return alert('Ajoute ta ville')
    if (isKinshasa && !profile.commune) return alert('Ajoute ta commune')
    if (!isKinshasa && !profile.territoire) return alert('Ajoute ton territoire')

    const payload = {
      nom: profile.nom,
      telephone: profile.telephone || profile.whatsapp,
      pays: profile.pays || 'RDC',
      province: profile.province,
      ville: profile.ville,
      commune: isKinshasa ? profile.commune : null,
      territoire: !isKinshasa ? profile.territoire : null,
      quartier: profile.quartier || null,
    }

    // ON UTILISE userId QUI EST LE VRAI UUID, PAS profile.id
    const targetId = userId || profile.id
    const { error } = await supabase.from('profiles').update(payload).eq('id', targetId)
    if (error) return alert("Erreur Supabase: " + error.message)
    
    localStorage.setItem("wenze_user", JSON.stringify({...getLocal(), ...payload, whatsapp: payload.telephone}))
    alert('✅ Profil mis à jour DG!')
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
        <input value={profile.nom || ''} onChange={e=>setProfile({...profile, nom:e.target.value})} className="border p-3 w-full rounded-xl" placeholder="Nom complet"/>
        <input value={profile.telephone || profile.whatsapp || ''} onChange={e=>setProfile({...profile, telephone:e.target.value})} className="border p-3 w-full rounded-xl" placeholder="WhatsApp ex: 082..."/>
        <div className="grid grid-cols-2 gap-2">
          <select value={profile.pays || 'RDC'} onChange={e=>setProfile({...profile, pays:e.target.value})} className="border p-3 w-full rounded-xl bg-white"><option value="RDC">RDC</option></select>
          <select value={profile.province || 'Kinshasa'} onChange={e=>setProfile({...profile, province: e.target.value, ville: e.target.value === 'Kinshasa' ? 'Kinshasa' : ''})} className="border p-3 w-full rounded-xl bg-white">{PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}</select>
        </div>
        <input value={profile.ville || ''} onChange={e=>setProfile({...profile, ville:e.target.value})} className="border p-3 w-full rounded-xl" placeholder="Ville ex: Kinshasa"/>
        {isKinshasa ? (
          <input value={profile.commune || ''} onChange={e=>setProfile({...profile, commune:e.target.value})} className="border p-3 w-full rounded-xl" placeholder="Commune * ex: Ngaliema"/>
        ) : (
          <input value={profile.territoire || ''} onChange={e=>setProfile({...profile, territoire:e.target.value})} className="border p-3 w-full rounded-xl" placeholder="Territoire * ex: Mbanza-Ngungu"/>
        )}
        <input value={profile.quartier || ''} onChange={e=>setProfile({...profile, quartier:e.target.value})} className="border p-3 w-full rounded-xl" placeholder="Quartier (facultatif) ex: Binza Pigeon"/>
        <button onClick={save} className="w-full bg-black text-white p-3 rounded-full font-bold">Enregistrer</button>
      </div>
      <div className="mt-4 bg-black text-white p-3 rounded-xl flex justify-between text-sm">
        <p>{produits.length} / {limite === 9999 ? "ILLIMITÉ" : limite} annonces</p>
        {isFreemium && <p className="text-xs opacity-80">{restant > 0 ? `${restant} restantes` : 'Limite atteinte!'}</p>}
      </div>
      <div className="mt-6 space-y-2">
        {isFreemium && restant <= 0 ? 
          <Link href="/tarifs" className="block bg-[#6C3CE0] text-white p-3 rounded-full text-center font-bold">Passer Pro 5$ = {TAUX_CDF.toLocaleString()} CDF</Link> :
          <Link href="/publier" className="block bg-black text-white p-3 rounded-xl text-center font-bold">+ Publier une annonce</Link>
        }
        <button onClick={logout} className="w-full bg-red-50 text-red-600 p-3 rounded-xl font-bold">Déconnexion</button>
      </div>
    </div>
  )
}

export default function Page(){ return <Suspense fallback={<div className="p-10 text-center">Chargement...</div>}><ProfilContent/></Suspense> }
