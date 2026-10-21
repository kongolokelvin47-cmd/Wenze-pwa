'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true) // true = login, false = register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleAuth = async () => {
    setLoading(true)
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
      else router.push('/profil')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) alert(error.message)
      else { alert('Compte créé ! Connecte-toi maintenant'); setIsLogin(true) }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold mb-4">{isLogin ? 'Se connecter' : 'S\'inscrire'}</h1>
        
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border p-3 rounded mb-3"/>
        <input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border p-3 rounded mb-4"/>

        <button onClick={handleAuth} disabled={loading} className="w-full bg-black text-white p-3 rounded font-bold">
          {loading ? '...' : (isLogin ? 'Se connecter' : 'Créer mon compte')}
        </button>

        <p className="text-center mt-4 text-sm">
          {isLogin ? "Pas de compte ?" : "Déjà un compte ?"}{' '}
          <button onClick={()=>setIsLogin(!isLogin)} className="text-green-600 font-bold underline">
            {isLogin ? 'S\'inscrire' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
}
