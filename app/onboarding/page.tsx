'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function OnboardingPage() {
  const [user_type, setUserType] = useState('client')
  const [domaine, setDomaine] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // LISTE COMPLÈTE KINSHASA
  const domainesParRole: any = {
    client: ['Acheteur régulier', 'Je revends un peu', 'Juste curieux'],
    vendeur: ['Téléphones & Accessoires', 'Friperie - Vêtements', 'Cosmétiques & Parfums', 'Chaussures', 'Sacs', 'Alimentation - Riz, Huile', 'Électronique'],
    boutique: ['Boutique Mode', 'Boutique Électronique', 'Alimentation Générale', 'Quincaillerie', 'Pharmacie / Parapharmacie', 'Bébé & Enfants'],
    grossiste: ['Zando - Gros Habillement', 'Zando - Gros Chaussures', 'Marché Central - Alimentaire', 'Importateur Téléphones', 'Importateur Cosmétiques', 'Gambela - Tissus & Pagnes'],
    prestataire: {
      "💇‍♀️ BEAUTÉ": ["Coiffure Femme - Tissage", "Coiffure Homme - Barber", "Makeup Mariage", "Onglerie", "Tresse Africaine"],
      "✂️ MODE": ["Couture Homme - Basil", "Couture Femme - Pagne", "Cordonnier", "Pressing"],
      "🔧 TECH": ["Réparation Téléphones", "Réparation PC", "Électricien", "Installateur Parabole", "Photographe"],
      "🏗️ BÂTIMENT": ["Maçon", "Plombier", "Peintre", "Menuisier", "Soudeur", "Carreleur"],
      "🚚 TRANSPORT": ["Livreur Moto Weewa", "Livreur Ketch", "Déménageur", "Chauffeur Course"],
      "🧹 QUOTIDIEN": ["Ménage", "Nounou", "Cuisinière", "Lessive"],
      "📚 AUTRE": ["Prof à domicile", "DJ Animation", "Décoration fête", "Coach Sport"]
    }
  }

  const handleSave = async () => {
    if (!domaine) { alert('Choisis ton domaine DG'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('profiles').update({ user_type, domaine }).eq('id', user.id)
    setLoading(false)
    if (error) { alert(error.message); return }
    
    if (user_type === 'client') router.push('/')
    else router.push('/dashboard')
  }

  const renderDomaineInput = () => {
    if (user_type === 'prestataire') {
      return (
        <select value={domaine} onChange={(e) => setDomaine(e.target.value)} className="w-full mt-2 p-3 border rounded-xl bg-white">
          <option value="">Choisis ton service...</option>
          {Object.entries(domainesParRole.prestataire).map(([cat, list]: any) => (
            <optgroup key={cat} label={cat}>
              {list.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </optgroup>
          ))}
        </select>
      )
    }
    return (
      <>
        <input list="domaines" value={domaine} onChange={(e) => setDomaine(e.target.value)} placeholder="Ex: Téléphones, Riz, Coiffure..." className="w-full mt-2 p-3 border rounded-xl" />
        <datalist id="domaines">
          {domainesParRole[user_type]?.map((d: string) => <option key={d} value={d} />)}
        </datalist>
        <div className="flex flex-wrap gap-2 mt-2">
          {domainesParRole[user_type]?.map((d: string) => (
            <button key={d} onClick={() => setDomaine(d)} className={`text-xs px-3 py-1 rounded-full border ${domaine===d ? 'bg-black text-white' : 'bg-gray-100'}`}>{d}</button>
          ))}
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold">Bienvenue sur WENZE</h1>
        <p className="text-gray-500 mb-6 text-sm">2 questions pour personnaliser ton expérience Kinshasa</p>

        <label className="font-semibold text-sm">Tu es qui?</label>
        <select value={user_type} onChange={(e) => { setUserType(e.target.value); setDomaine('') }} className="w-full mt-2 mb-5 p-3 border rounded-xl bg-white font-medium">
          <option value="client">🛒 Je veux acheter</option>
          <option value="vendeur">👕 Je suis vendeur détaillant</option>
          <option value="boutique">🏪 J'ai une boutique</option>
          <option value="grossiste">📦 Je suis grossiste (Zando, etc)</option>
          <option value="prestataire">🔧 Je suis prestataire de service</option>
        </select>

        <label className="font-semibold text-sm">Ton domaine?</label>
        {renderDomaineInput()}

        <button onClick={handleSave} disabled={loading} className="w-full mt-8 bg-black text-white p-3 rounded-xl font-bold disabled:opacity-50">
          {loading ? 'Sauvegarde...' : 'Continuer →'}
        </button>
      </div>
    </div>
  )
}
