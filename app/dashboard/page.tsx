'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

// On importe les 3 dashboards
import GrossisteDashboard from '@/components/dashboard/GrossisteDashboard'
import VendeurDashboard from '@/components/dashboard/VendeurDashboard'
import PrestataireDashboard from '@/components/dashboard/PrestataireDashboard'

export default function DashboardRouter() {
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, domaine')
        .eq('id', user.id)
        .single()

      // 1. PAS DE PROFIL -> ONBOARDING
      if (!profile?.user_type) {
        router.push('/onboarding')
        return
      }

      // 2. CLIENT -> PAS DE DASHBOARD BUSINESS
      // Vision: son dashboard c'est le Home avec favoris
      if (profile.user_type === 'client') {
        router.push('/')
        return
      }

      setMe(profile)
      setLoading(false)
    }
    check()
  }, [])

  if (loading) return <div className="p-6">Chargement WENZE...</div>

  // 3. VRAI ROUTAGE BUSINESS - ICI ON AFFICHE
  switch (me.user_type) {
    case 'grossiste':
      return <GrossisteDashboard />
    
    case 'vendeur':
    case 'boutique':
      return <VendeurDashboard />
    
    case 'prestataire':
      return <PrestataireDashboard />
    
    default:
      return <div className="p-6">Rôle inconnu: {me.user_type}</div>
  }
        }
