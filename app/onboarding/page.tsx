'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie } from '@/lib/categories'
import { TAUX_CDF, toCDF } from '@/lib/paiement'

type Role = 'client' | 'boutique'

export default function OnboardingPage() {
  const [user_type, setUserType] = useState<Role>('client')
  const [categorieId, setCategorieId] = useState<string>('commerces-services')
  const [domaine, setDomaine] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  // ✅ WENZE 2.0 - 2 catégories seulement, pas 4 rôles
  const currentCat = useMemo(()=> getCategorieById(normalizeCategorie(categorieId)) || CATEGORIES_WENZE[0], [categorieId])
  const prixInfo = useMemo(()=> getPrixByCategorie(currentCat.id), [currentCat])

  const activites = currentCat.activites

  const handleFinish = async () => {
    setError("")
    if(user_type==='boutique' && !domaine){
      setError("Choisis ton activité précise - ex: électricité, maçon, coiffure = 5$ même régime")
      return
    }
    setLoading(true)
    try {
      // 1. Récupère user existant (inscription a déjà créé wenze_user)
      let existing: any = null
      try { existing = JSON.parse(localStorage.getItem("wenze_user") || "null") } catch {}
      
      if(!existing){
        setError("Pas de compte trouvé - Va à /inscription d'abord");
        setLoading(false)
        return
      }

      const finalCatId = user_type==='client' ? 'client' : normalizeCategorie(categorieId)
      const finalUser = {
        ...existing,
        user_type,
        categorieId: finalCatId,
        categorie: finalCatId,
        domaine: domaine || (user_type==='client' ? 'Acheteur régulier' : currentCat.titre),
        activiteId: domaine ? activites.find(a=> a.label===domaine || a.id===domaine)?.id || domaine.toLowerCase() : "",
        activite: domaine || currentCat.titre,
        prixUSD: user_type==='client' ? 0 : prixInfo.prixUSD,
        prixCDF: user_type==='client' ? 0 : prixInfo.prixCDF,
        onboardingDone: true,
        updatedAt: new Date().toISOString(),
      }

      localStorage.setItem("wenze_user", JSON.stringify(finalUser))
      
      // Met à jour wenze_all_users
      try {
        const allRaw = localStorage.getItem("wenze_all_users")
        if(allRaw){
          const all = JSON.parse(allRaw)
          const idx = all.findIndex((u:any)=> (u.ownerWhatsapp||u.whatsapp) === (existing.ownerWhatsapp||existing.whatsapp))
          if(idx>=0){
            all[idx] = finalUser
            localStorage.setItem("wenze_all_users", JSON.stringify(all))
          }
        }
      } catch {}

      // Supabase optionnel - si table profiles existe, sync
      try {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        await supabase.from('profiles').upsert({
          id: existing.id || existing.ownerWhatsapp,
          user_type: finalUser.user_type,
          categorie_id: finalUser.categorieId,
          domaine: finalUser.domaine,
          activite: finalUser.activite,
          prix_usd: finalUser.prixUSD,
          updated_at: new Date().toISOString(),
        })
      } catch {}

      setLoading(false)
      router.push(user_type==='client' ? "/market" : "/profil")
    } catch(e){
      setError("Erreur onboarding - réessaie")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-24">
      <Link href="/" className="text-[#6C3CE0] font-bold text-xs">← Accueil</Link>
      
      <div className="mt-4">
        <h1 className="text-2xl font-black">Onboarding WENZE 2.0</h1>
        <p className="text-[11px] text-gray-500 mt-1">Kinshasa - 2 types: Client 0$ ou Boutique • 🛍️ 5$ / 11 500 CDF • 🏭 10$ / 23 000 CDF • Taux fixe {TAUX_CDF} • 0% commission</p>
      </div>

      <div className="mt-5 bg-black text-white rounded-2xl p-4 flex justify-between items-center">
        <div>
          <p className="font-black text-[13px]">WENZE 2.0 - Choisis ton profil</p>
          <p className="text-[10px] opacity-70">Électricité, maçon, soudeur, coiffure = 5$ même régime • Gros = 10$</p>
        </div>
        <span className="bg-white text-black text-[9px] px-2 py-1 rounded-full font-black">Taux {TAUX_CDF}</span>
      </div>

      <div className="mt-5 bg-white border-2 rounded-2xl p-5 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-[12px] font-bold">{error}</div>}

        {/* ETAPE 1 - TYPE */}
        <div>
          <p className="font-black text-[12px]">1. Tu es ?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={()=> setUserType('client')} className={`p-4 rounded-xl border-2 text-left ${user_type==='client' ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}>
              <p className="font-black text-[13px]">👤 Client</p>
              <p className="text-[10px] opacity-70 mt-1">Acheter - 0$ / mois - Accès marché</p>
              <p className="font-black text-[11px] mt-2">0$ / 0 CDF</p>
            </button>
            <button onClick={()=> setUserType('boutique')} className={`p-4 rounded-xl border-2 text-left ${user_type==='boutique' ? "bg-[#6C3CE0] text-white border-[#6C3CE0]" : "bg-white border-gray-200"}`}>
              <p className="font-black text-[13px]">🏬 Boutique</p>
              <p className="text-[10px] opacity-70 mt-1">Vendre - 2 prix WENZE</p>
              <p className="font-black text-[11px] mt-2">🛍️ 5$ • 🏭 10$</p>
            </button>
          </div>
        </div>

        {/* ETAPE 2 - si boutique, choix 2 catégories */}
        {user_type==='boutique' && (
          <>
            <div>
              <p className="font-black text-[12px]">2. Catégorie Boutique - 2 prix WENZE 2.0</p>
              <div className="mt-2 grid gap-2">
                {CATEGORIES_WENZE.map(c=> (
                  <button key={c.id} onClick={()=> { setCategorieId(c.id); setDomaine(""); }} className={`p-3 rounded-xl border-2 text-left flex justify-between items-center ${categorieId===c.id ? (c.id==="gros-autres" ? "bg-black text-white border-black" : "bg-purple-50 border-[#6C3CE0]") : "bg-white border-gray-200"}`}>
                    <div>
                      <p className="font-black text-[12px]">{c.icon} {c.titre} - {c.titreCourt}</p>
                      <p className="text-[10px] opacity-70">{c.description}</p>
                      <p className="text-[10px] mt-1">{c.id==="commerces-services" ? "Électricité, maçon, soudeur, plombier, coiffure = même régime 5$" : "Grossiste, import, production = 10$"}</p>
                    </div>
                    <span className={`text-[11px] font-black px-2 py-1 rounded-full ${categorieId===c.id ? "bg-white text-black" : "bg-black text-white"}`}>{c.prixUSD}$</span>
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-gray-500 mt-2">Choisi: {currentCat.icon} {currentCat.titre} → {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF}</p>
            </div>

            <div>
              <p className="font-black text-[12px]">3. Activité précise - inclus dans {prixInfo.prixUSD}$</p>
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-xl p-2 grid grid-cols-1 gap-1">
                {activites.map((a:any)=> (
                  <button key={a.id} onClick={()=> setDomaine(a.label)} className={`text-left px-3 py-2 rounded-full text-[11px] font-bold border ${domaine===a.label ? "bg-black text-white border-black" : "bg-[#FFFBF0] border-gray-200"}`}>
                    {a.label} {a.slug===domaine ? "✓" : ""}
                  </button>
                ))}
              </div>
              <input value={domaine} onChange={e=> setDomaine(e.target.value)} placeholder="Ou tape ton activité..." className="mt-2 w-full border p-3 rounded-xl text-[12px]" />
              <p className="text-[9px] text-gray-400 mt-1">Ex: Si tu fais électricité + maçon + plomberie → reste 🛍️ 5$ même régime</p>
            </div>
          </>
        )}

        {user_type==='client' && (
          <div>
            <p className="font-black text-[12px]">Client - centres d'intérêt (optionnel)</p>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {['Acheteur régulier', 'Je revends un peu', 'Juste curieux'].map(v=> (
                <button key={v} onClick={()=> setDomaine(v)} className={`text-[11px] px-3 py-2 rounded-full font-bold border ${domaine===v ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}>{v}</button>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleFinish} disabled={loading} className="w-full bg-[#6C3CE0] text-white font-black py-3.5 rounded-full text-[13px] disabled:opacity-50">
          {loading ? "Enregistrement..." : user_type==='client' ? `Continuer Client 0$ → Marché` : `Valider ${currentCat.icon} ${domaine || currentCat.titreCourt} ${prixInfo.prixUSD}$ / ${prixInfo.prixCDF.toLocaleString()} CDF →`}
        </button>

        <p className="text-[9px] text-center text-gray-400">WENZE 2.0 - 2 catégories - Taux fixe {TAUX_CDF} CDF - 0% commission - Sauve dans wenze_user + wenze_all_users + supabase profiles optionnel</p>
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic';
