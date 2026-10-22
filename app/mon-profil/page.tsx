'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function MonProfilPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')
      setLoading(false)
    }
    load()
  }, [])

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="p-6">Chargement profil...</div>

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Mon Profil</h1>
      <div className="bg-white p-6 rounded-2xl shadow">
        <p className="text-xs text-gray-400">Connecté en tant que</p>
        <p className="font-bold mt-1">{email}</p>
        <div className="mt-6 pt-6 border-t">
          <button onClick={logout} className="w-full bg-black text-white py-3 rounded-full text-sm font-bold">
            Se déconnecter
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-4 text-center">WENZE - Compte sécurisé Supabase</p>
      </div>
    </div>
  )
}
