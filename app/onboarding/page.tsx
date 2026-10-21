'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function OnboardingPage() {
  const [user_type, setUserType] = useState('client')
  const [domaine, setDomaine] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Domaines suggérés selon rôle - innovation Kinshasa
  const domainesParRole: any = {
    client: ['Acheteur régulier', 'Revendeur occasionnel'],
    vendeur: ['Téléphones', 'Friperie', 'Cosmétiques', 'Riz & Aliments'],
    boutique: ['Électronique', 'Mode', 'Alimentation', 'Quincaillerie'],
    grossiste: ['Zando - Gros', 'Marché central', 'Importateur'],
    prestataire: ['Coiffure', 'Couture', 'Réparation tel', 'Livraison', 'Maçon']
  }

  const handleSave = async () => {
    if (!domaine.trim()) {
      alert('Choisis ton domaine, DG')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ user_type, domaine })
      .eq('id', user.id)

    setLoading(false)

    if (error) {
      alert('Erreur: ' + error.message)
    } else {
      // Redirection intelligente selon rôle
      if (user_type === 'client') router.push('/')
      else router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Bienvenue sur WENZE</h1>
        <p className="text-gray-500 mb-6">2 questions pour personnaliser ton expérience</p>

        <label className="font-semibold">Tu es qui?</label>
        <select 
          value={user_type} 
          onChange={(e) => setUserType(e.target.value)}
          className="w-full mt-2 mb-4 p-3 border rounded-xl bg-white"
        >
          <option value="client">Je veux acheter</option>
          <option value="vendeur">Je suis vendeur détaillant</option>
          <option value="boutique">J'ai une boutique</option>
          <option value="grossiste">Je suis grossiste</option>
          <option value="prestataire">Je suis prestataire de service</option>
        </select>

        <label className="font-semibold">Ton domaine?</label>
        <input
          list="domaines"
          value={domaine}
          onChange={(e) => setDomaine(e.target.value)}
          placeholder="Ex: Téléphones, Coiffure, Riz..."
          className="w-full mt-2 p-3 border rounded-xl"
        />
        <datalist id="domaines">
          {domainesParRole[user_type]?.map((d: string) => (
            <option key={d} value={d} />
          ))}
        </datalist>

        <div className="flex gap-2 mt-2">
          {domainesParRole[user_type]?.map((d: string) => (
            <button key={d} onClick={() => setDomaine(d)} 
            className="text-xs bg-gray-100 px-2 py-1 rounded-full">{d}</button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full mt-6 bg-black text-white p-3 rounded-xl font-bold disabled:opacity-50"
        >
          {loading ? 'Sauvegarde...' : 'Continuer →'}
        </button>
      </div>
    </div>
  )
      }
