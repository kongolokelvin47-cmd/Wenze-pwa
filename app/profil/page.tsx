'use client'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { FORMULES, TAUX_CDF, verifierAbonnement } from '@/lib/paiement'

// Sécurité: 1 numéro = 1 compte
const cleanWhatsapp = (num: string) => (num || "").toString().replace(/[^0-9]/g, "");
const getCurrentUserLocal = () => { try { const raw = localStorage.getItem("wenze_user"); return raw ? JSON.parse(raw) : null; } catch { return null; } }

function ProfilContent() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [mesProduits, setMesProduits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Pas connecté Supabase? Check localStorage (ancien système)
      if (!user) {
        const localUser = getCurrentUserLocal()
        if (!localUser) { router.push('/connexion'); return }
        setProfile(localUser)
        const all = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]")
        const miennes = all.filter((a:any) => cleanWhatsapp(a.whatsapp) === cleanWhatsapp(localUser.whatsapp))
        setMesProduits(miennes)
        setLoading(false)
        return
      }

      // Connecté Supabase: charge profil
      let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      
      // Si pas de profil, crée le
      if (!prof) {
        const localUser = getCurrentUserLocal()
        const { data: newProf } = await supabase.from('profiles').insert({
          id: user.id,
          nom: localUser?.nom || user.email?.split('@')[0],
          telephone: localUser?.whatsapp || '',
          commune: localUser?.commune || 'Kinshasa',
          email: user.email
        }).select().single()
        prof = newProf
      }

      setProfile(prof)
      
      // Sync localStorage pour que l'ancien système continue de marcher
      const ab = verifierAbonnement()
      const wenzeUser = {
        id: prof.id,
        nom: prof.nom,
        whatsapp: prof.telephone,
        commune: prof.commune,
        type: prof.type || 'freemium',
        abonnement: prof.abonnement || 'Freemium',
        photo: prof.avatar_url
      }
      localStorage.setItem("wenze_user", JSON.stringify(wenzeUser))

      // Charge produits Supabase
      const { data: prods } = await supabase.from('produits').select('*').eq('vendeur_id', user.id).order('created_at', { ascending: false })
      setMesProduits(prods || [])
      setLoading(false)
    }
    load()
  }, [router])

  const save = async () => {
    const supabase = createClient()
    await supabase.from('profiles').update({ 
      nom: profile.nom, 
      telephone: profile.telephone, 
      commune: profile.commune 
    }).eq('id', profile.id)
    
    // Met à jour localStorage aussi
    const local = getCurrentUserLocal()
    if (local) {
      localStorage.setItem("wenze_user", JSON.stringify({ ...local, nom: profile.nom, whatsapp: profile.telephone, commune: profile.commune }))
    }
    alert('Profil mis à jour ✅')
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem("wenze_user")
    localStorage.removeItem("wenze_connecte")
    router.push('/')
  }

  if (loading) return <div className="p-6">Chargement WENZE...</div>
  if (!profile) return null

  const isFreemium = profile.type === 'freemium'
  const limite = isFreemium ? 3 : 9999
  const restant = limite === 9999 ? 9999 : limite - mesProduits.length

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 pb-20">
      <Link href="/" className="text-xs text-[#6C3CE0] font-bold">← Accueil</Link>
      <h1 className="text-xl font-black mt-3">👤 Mon Profil</h1>

      <div className="mt-4 bg-gradient-to-br from-purple-50 to-orange-50 p-4 rounded-2xl border">
        <p className="font-bold text-sm">{profile.nom} • {profile.commune}</p>
        <p className="text-xs text-gray-600">{profile.telephone || profile.whatsapp} • {profile.email}</p>
        <span className="text-[9px] px-2 py-1 rounded-full font-bold bg-black text-white mt-2 inline-block">{profile.type?.toUpperCase() || 'FREEMIUM'}</span>
      </div>

      <div className="mt-4 space-y-3">
        <input value={profile.nom || ''} onChange={e => setProfile({...profile, nom: e.target.value})} placeholder="Nom" className="border p-3 w-full rounded-xl"/>
        <input value={profile.telephone || profile.whatsapp || ''} onChange={e => setProfile({...profile, telephone: e.target.value, whatsapp: e.target.value})} placeholder="WhatsApp 243..." className="border p-3 w-full rounded-xl"/>
        <input value={profile.commune || ''} onChange={e => setProfile({...profile, commune: e.target.value})} placeholder="Commune" className="border p-3 w-full rounded-xl"/>
        <button onClick={save} className="w-full bg-black text-white p-3 rounded-full font-bold text-sm">Enregistrer</button>
      </div>

      <div className="mt-4 bg-black text-white p-3 rounded-xl flex justify-between">
        <div><p className="text-[11px]">Mes Publications</p><p className="font-black text-lg">{mesProduits.length} / {limite === 9999 ? "ILLIMITÉ" : limite}</p></div>
        <div className="text-right text-[10px]">{isFreemium && restant <= 0 && <p className="text-red-400 font-bold">Limite atteinte!</p>}{isFreemium && restant > 0 && <p>{restant} restantes</p>}</div>
      </div>

      <p className="font-black text-sm mt-6">📦 Mes Publications ({mesProduits.length})</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {mesProduits.map(p => (
          <div key={p.id} className="border p-2 rounded-xl">
            <img src={p.image_url || p.photo} className="w-full h-24 object-contain mb-1"/>
            <p className="text-xs truncate">{p.nom || p.titre}</p>
            <p className="font-bold text-sm">{p.prix}$</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {restant <= 0 && isFreemium ? <Link href="/tarifs" className="block bg-[#6C3CE0] text-white p-3 rounded-full text-center font-bold text-sm">Passer Pro 5$ ({toCDF ? '' : ''} 5$ = {TAUX_CDF} CDF)</Link> : <Link href="/publier" className="block bg-black text-white p-3 rounded-xl text-center text-sm font-bold">+ Publier</Link>}
        <button onClick={logout} className="w-full bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold">Déconnexion</button>
      </div>

      <p className="text-[10px] text-center text-gray-400 mt-8">WENZE: Supabase + localStorage sync • 1 numéro = 1 compte</p>
    </div>
  )
}

export default function ProfilPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Chargement...</div>}>
      <ProfilContent />
    </Suspense>
  )
}
