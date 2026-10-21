'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async () => {
    if (!email || !password) { alert('Remplis email et mot de passe DG'); return }
    setLoading(true)
    
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        
        // Vérifie si onboarding fait
        const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', data.user.id).single()
        if (!profile?.user_type) {
          router.push('/onboarding')
        } else {
          router.push(profile.user_type === 'client' ? '/' : '/dashboard')
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        
        if (data.user) {
          // Crée le profil direct
          await supabase.from('profiles').insert({ id: data.user.id, email: email })
        }
        alert('Compte créé ! Vérifie tes emails puis connecte-toi')
        setIsLogin(true)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold mb-1">{isLogin ? 'Se connecter' : 'Créer compte'}</h1>
        <p className="text-sm text-gray-500 mb-4">WENZE - Kinshasa</p>
        
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border p-3 rounded-xl mb-3"/>
        <input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border p-3 rounded-xl mb-4"/>

        <button onClick={handleAuth} disabled={loading} className="w-full bg-black text-white p-3 rounded-xl font-bold disabled:opacity-50">
          {loading ? 'Chargement...' : (isLogin ? 'Se connecter →' : 'Créer mon compte')}
        </button>

        <p className="text-center mt-4 text-sm">
          {isLogin ? "Pas de compte ?" : "Déjà un compte ?"}{' '}
          <button onClick={()=>setIsLogin(!isLogin)} className="text-green-600 font-bold underline">
            {isLogin ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
          }
