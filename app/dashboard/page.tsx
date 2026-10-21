'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function DashboardPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Chargement...')

  useEffect(() => {
    const check = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
      setStatus('Connecté: ' + (profile?.user_type || 'nouveau'))
      
      if (!profile?.user_type) { router.push('/onboarding'); return }
      if (profile.user_type === 'client') { router.push('/'); return }
    }
    check()
  }, [router])

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold">WENZE Dashboard</h1>
      <p className="text-sm text-gray-500">{status}</p>
    </div>
  )
}
