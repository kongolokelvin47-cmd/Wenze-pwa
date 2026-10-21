'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
      if (!profile?.user_type) { router.push('/onboarding'); return }
      if (profile.user_type === 'client') { router.push('/'); return }
    }
    check()
  }, [])

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold">WENZE Dashboard</h1>
      <p className="text-sm text-gray-500">Chargement de ton espace business...</p>
    </div>
  )
}
