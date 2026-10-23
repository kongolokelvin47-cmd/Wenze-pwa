"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

// ✅ FIX VERCEL ANTI-ROUGE - plus de ../../lib/supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ProfilWenze() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [solde, setSolde] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { charger() }, [])

  async function charger() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const [profRes, soldeRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('portefeuilles').select('solde').eq('user_id', user.id).single()
        ])
        
        if (profRes.data) {
          // Auto-downgrade si expiré
          if (profRes.data?.plan_expire_at && new Date(profRes.data.plan_expire_at) < new Date() && profRes.data.plan !== 'freemium') {
            await supabase.from('profiles').update({ plan: 'freemium', annonces_max: 3 }).eq('id', user.id)
            setProfile({ ...profRes.data, plan: 'freemium' })
          } else {
            setProfile(profRes.data)
          }
        }
        if (soldeRes.data) setSolde(soldeRes.data.solde)
        else {
          // Crée portefeuille si n'existe pas
          await supabase.from('portefeuilles').insert({ user_id: user.id, solde: 0 })
        }
      }
    } catch(e) { console.log(e) }
    finally { setLoading(false) }
  }

  async function logout() {
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') localStorage.clear()
    router.push('/login')
  }

  if (loading) return <div className="max-w-[430px] mx-auto p-10 text-center text-xs">Chargement WENZE...</div>

  const isPro = profile?.plan === 'pro' || profile?.plan === 'grossiste'
  const isExpired = profile?.plan_expire_at ? new Date(profile.plan_expire_at) < new Date() : false

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#f5f5f5] pb-24">
      <div className="bg-white p-4">
        {!user ? (
          <Link href="/login" className="block w-full bg-white border shadow-sm rounded-full py-3 font-bold text-orange-600 text-center text-sm">
            S'IDENTIFIER / S'ENREGISTRER
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isPro && !isExpired ? 'bg-purple-100 text-[#6C3CE0]' : 'bg-gray-100 text-gray-600'}`}>
                  {isExpired ? 'EXPIRÉ' : (profile?.plan || 'FREEMIUM').toUpperCase()}
                </span>
                <span className="text-[11px] text-green-600 font-bold">
                  {isPro && !isExpired ? 'ILLIMITÉ' : '3 annonces max'}
                </span>
              </div>
              {profile?.plan_expire_at && !isExpired && (
                <p className="text-[10px] text-gray-500 mt-1">Expire le {new Date(profile.plan_expire_at).toLocaleDateString('fr-FR')}</p>
              )}
              {isExpired && <p className="text-[10px] text-red-500 font-bold">Repaye pour réactiver</p>}
            </div>
            <Link href="/portefeuille" className="bg-black text-white text-[10px] px-3 py-2 rounded-full font-bold">
              {solde.toLocaleString()} CDF
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white mt-2 p-4">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold text-[14px]">Ma Commande</h2>
          <Link href="/commandes" className="text-blue-600 text-[11px]">Voir tout</Link>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div onClick={()=>router.push('/commandes')} className="flex flex-col items-center cursor-pointer"><span className="text-xl">⏳</span><span className="text-[10px] mt-1 leading-tight">En attente<br/>paiement</span></div>
          <div className="flex flex-col items-center"><span className="text-xl">🚚</span><span className="text-[10px] mt-1">Expédition</span></div>
          <div className="flex flex-col items-center"><span className="text-xl">💬</span><span className="text-[10px] mt-1">Commentaires</span></div>
          <div className="flex flex-col items-center"><span className="text-xl">📦</span><span className="text-[10px] mt-1">Retours</span></div>
        </div>
      </div>

      <div className="bg-white mt-2">
        <div className="p-3 bg-gradient-to-r from-purple-50 to-orange-50">
          <p className="text-[11px] font-black">💳 MON W-PAY (recommandé)</p>
        </div>
        <Item icon="💳" label="Mon W-Pay - Portefeuille" right={`${solde.toLocaleString()} CDF`} onClick={() => router.push('/portefeuille')} highlight />
        <Item icon="💰" label="Devenir Pro" right="5$ / 11 500 CDF" onClick={() => router.push('/tarifs')} highlight />
        <Item icon="🏢" label="Devenir Grossiste" right="25$ / 57 500 CDF" onClick={() => router.push('/tarifs')} />
        <Item icon="🚀" label="Boost & Vidéo Pub" right="Dès 2 300 CDF" onClick={() => router.push('/portefeuille')} />
      </div>

      <div className="bg-white mt-2 divide-y divide-gray-100">
        <Item icon="❤️" label="Liste de souhait" onClick={() => router.push('/favoris')} />
        <Item icon="🏪" label="Magasin suivi" value="0" />
        <Item icon="🕒" label="Vu récemment" />
        <Item icon="🎟️" label="Mes bons" right="Disponible: 0" />
        <div className="h-2 bg-[#f5f5f5]"></div>
        <Item icon="🏠" label="Gestion des adresses" onClick={() => router.push('/profil/adresses')} />
        <Item icon="🎧" label="Centre de services" />
        <Item icon="👥" label="Inviter un ami - Gagne 1 mois Pro" />
      </div>

      {user && (
        <div className="p-4 space-y-2">
          <button onClick={logout} className="w-full bg-white border border-red-200 text-red-500 p-3 rounded-xl text-sm font-bold">
            Déconnexion sécurisée
          </button>
          <p className="text-[9px] text-center text-gray-400">ID: {user.id.slice(0,8)}... | WENZE v2.3 | Taux 2300 CDF</p>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t flex justify-around py-3 text-[11px] z-50">
        <span onClick={() => router.push('/')} className="cursor-pointer">Accueil</span>
        <span className="cursor-pointer">Catégories</span>
        <span className="font-bold cursor-pointer">Shopping</span>
        <span className="cursor-pointer">Chariot</span>
        <span className="text-orange-600 font-black">Mon WENZE</span>
      </div>
    </div>
  )
}

function Item({ icon, label, right, value, onClick, highlight }: any) {
  return (
    <div onClick={onClick} className={`flex items-center justify-between p-4 ${highlight ? 'bg-purple-50 border-l-4 border-l-[#6C3CE0]' : 'bg-white'} ${onClick ? 'cursor-pointer active:bg-gray-50' : ''}`}>
      <div className="flex items-center gap-3"><span className="text-[18px] w-6 text-center">{icon}</span><span className="text-[13px] font-medium">{label}</span></div>
      <span className="text-blue-600 text-[11px] font-bold ml-2 truncate">{right || value || "›"}</span>
    </div>
  )
        }
