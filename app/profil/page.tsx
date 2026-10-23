"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ProfilWenze() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    charger()
  }, [])

  async function charger() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile(data)
    }
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
    router.push('/login')
  }

  if (loading) return <div className="max-w-[430px] mx-auto p-10 text-center text-xs">Chargement...</div>

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#f5f5f5] pb-20">
      
      {/* HEADER */}
      <div className="bg-white p-4">
        {!user ? (
          <Link href="/login" className="block w-full bg-white border shadow-sm rounded-full py-3 font-bold text-orange-600 text-center text-sm">
            S'IDENTIFIER / S'ENREGISTRER
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm truncate">{user.email}</p>
              <p className="text-[11px] text-green-600 font-bold">
                Plan: {(profile?.plan || 'freemium').toUpperCase()} - {profile?.plan === 'freemium' ? '3 annonces' : 'ILLIMITÉ'}
              </p>
              {profile?.plan_expire_at && (
                <p className="text-[10px] text-gray-500">Expire: {new Date(profile.plan_expire_at).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MA COMMANDE - Style KiKUU */}
      <div className="bg-white mt-2 p-4">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold text-[14px]">Ma Commande</h2>
          <Link href="/commandes" className="text-blue-600 text-[11px]">Voir tout</Link>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="flex flex-col items-center"><span className="text-xl">⏳</span><span className="text-[10px] mt-1 leading-tight">En attente paiement</span></div>
          <div className="flex flex-col items-center"><span className="text-xl">🚚</span><span className="text-[10px] mt-1 leading-tight">Expédition</span></div>
          <div className="flex flex-col items-center"><span className="text-xl">💬</span><span className="text-[10px] mt-1 leading-tight">Commentaires</span></div>
          <div className="flex flex-col items-center"><span className="text-xl">📦</span><span className="text-[10px] mt-1 leading-tight">Retours</span></div>
        </div>
      </div>

      {/* LISTE WENZE */}
      <div className="bg-white mt-2 divide-y divide-gray-100">
        <Item icon="❤️" label="Liste de souhait" onClick={() => router.push('/favoris')} />
        <Item icon="🏪" label="Magasin suivi" value="0" />
        <Item icon="🕒" label="Vu récemment" />
        <Item icon="🎟️" label="Mes bons" right="Disponible: 0" />
        <Item icon="💳" label="Mon W-Pay" right={`${profile?.plan ? profile.plan : '0 CDF'}`} onClick={() => router.push('/portefeuille')} highlight />
        
        <div className="h-2 bg-[#f5f5f5]"></div>
        
        <Item icon="🏠" label="Gestion des adresses" onClick={() => router.push('/profil/adresses')} />
        <Item icon="🎧" label="Centre de services" />
        <Item icon="👥" label="Inviter un ami" />
        <Item icon="💰" label="Devenir Pro" right="5$ / 11 500 CDF" onClick={() => router.push('/tarifs')} highlight />
      </div>

      {user && (
        <div className="p-4">
          <button onClick={logout} className="w-full bg-white border border-red-200 text-red-500 p-3 rounded-xl text-sm font-bold">
            Déconnexion
          </button>
          <p className="text-[9px] text-center text-gray-400 mt-2">ID: {user.id.slice(0,8)}... (plus de bug 17927)</p>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t flex justify-around py-2 text-[11px]">
        <span onClick={() => router.push('/')}>Accueil</span>
        <span>Catégories</span>
        <span className="font-bold">Shopping</span>
        <span>Chariot</span>
        <span className="text-orange-600 font-bold">Mon WENZE</span>
      </div>
    </div>
  )
}

function Item({ icon, label, right, value, onClick, highlight }: any) {
  return (
    <div onClick={onClick} className={`flex items-center justify-between p-4 ${highlight ? 'bg-purple-50' : 'bg-white'} ${onClick ? 'cursor-pointer active:bg-gray-50' : ''}`}>
      <div className="flex items-center gap-3"><span className="text-[18px] w-6">{icon}</span><span className="text-[13px]">{label}</span></div>
      <span className="text-blue-600 text-[11px] font-bold">{right || value || "›"}</span>
    </div>
  )
}
