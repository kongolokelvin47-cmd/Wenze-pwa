'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from '@/lib/categories'
import { TAUX_CDF, toCDFString, PALIERS } from '@/lib/paiement'

type Role = 'client' | 'boutique'

export default function OnboardingPage() {
  const [user_type, setUserType] = useState<Role>('client')
  const [categorieId, setCategorieId] = useState<string>('commerces-services')
  const [domaine, setDomaine] = useState('')
  const [nom, setNom] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");

  const currentCat = useMemo(()=> getCategorieById(normalizeCategorie(categorieId)) || CATEGORIES_WENZE[0], [categorieId])
  const activites = currentCat.activites || []

  const handleContinue = async () => {
    setError("");
    if(!nom.trim()){ setError("Nom boutique / Nom complet requis"); return; }
    if(user_type==='boutique' && !cleanWa(whatsapp)){ setError("WhatsApp requis pour vendeur"); return; }
    if(user_type==='boutique' && !domaine){ setError("Choisis ton activité"); return; }
    setLoading(true);
    try{
      const wa = cleanWa(whatsapp);
      const user = {
        id: wa || `guest_${Date.now()}`,
        nom: nom.trim(),
        ownerWhatsapp: wa,
        whatsapp: wa,
        role: user_type,
        categorieId: normalizeCategorie(categorieId),
        activiteId: domaine,
        createdAt: new Date().toISOString(),
        // V6 politique nouvelle - freemium 3 images à vie, 30j visible puis caché si 0 ticket
        abonnement: { palierId:"", badge:"🆓", isPaye:false, isFreemium:true, places:3, maxPlaces:50, joursRestants:30 },
      };
      localStorage.setItem("wenze_user", JSON.stringify(user));
      const allUsers = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
      const idx = allUsers.findIndex((u:any)=> cleanWa(u.ownerWhatsapp||"")===wa && wa);
      if(idx>=0) allUsers[idx]={...allUsers[idx],...user}; else allUsers.push(user);
      localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));

      if(user_type==='client'){
        router.push("/market?onboarding=client");
      }else{
        router.push(`/publier?onboarding=boutique&cat=${categorieId}&act=${domaine}`);
      }
    }catch(e:any){ setError(e.message||"Erreur onboarding"); } finally{ setLoading(false); }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">Onboarding V6 • Politique Nouvelle</h1>
            <p className="text-[10px] text-gray-500">2 rôles seulement • Même ticket pour tous • Taux {TAUX_CDF} • Max 50 • 0% comm</p>
          </div>
        </div>
        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px]">
          <b>V6:</b> On vend VISIBILITÉ, pas catégorie - 1 ticket = X places strictes sur Y jours (pas X/j) - ⭐ STANDARD 5$ ({toCDFString(5)}) 4pl/7j • 🚀 PRO 10$ 10pl/15j • 👑 PREMIUM 20$ 30pl/30j • Cumulable • Suppression libère place • Freemium 3 images à vie 30j puis 🔒 caché • 0% comm • Taux {TAUX_CDF}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {error && <div className="bg-red-50 border-2 border-red-200 text-red-700 text-[11px] p-3 rounded-xl">{error}</div>}

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[13px]">Tu es ?</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button onClick={()=>setUserType('client')} className={`p-4 rounded-2xl border-2 text-left transition ${user_type==='client'?"bg-black text-white border-black":"bg-gray-50 border-gray-200 hover:border-black"}`}>
              <p className="text-2xl">🛒</p>
              <p className="font-black text-[13px] mt-1">Client</p>
              <p className="text-[10px] opacity-70 mt-1">Acheter • Gratuit à vie • 0% comm • Accès Market complet</p>
            </button>
            <button onClick={()=>setUserType('boutique')} className={`p-4 rounded-2xl border-2 text-left transition ${user_type==='boutique'?"bg-black text-white border-black":"bg-gray-50 border-gray-200 hover:border-black"}`}>
              <p className="text-2xl">🏪</p>
              <p className="font-black text-[13px] mt-1">Vendeur</p>
              <p className="text-[10px] opacity-70 mt-1">Vendre • Freemium 3 annonces 30j • Puis ticket même prix pour tous</p>
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-[11px] font-bold">{user_type==='client'?"Ton nom":"Nom boutique *"} </label>
            <input value={nom} onChange={e=>setNom(e.target.value)} placeholder={user_type==='client'?"Ex: Kelvin":"Ex: Boutique Kelvin"} className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold">WhatsApp {user_type==='boutique'?"*":"(optionnel)"}</label>
            <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="Ex: 081..." className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none" />
            <p className="text-[9px] text-gray-400 mt-1">Clé unique ownerWhatsapp - Sécurise tes annonces - isOwner() = WA, pas nom</p>
          </div>
        </div>

        {user_type==='boutique' && (
          <>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">Catégorie - Même ticket pour tous</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[
                  {id:"commerces-services", label:"🛍️ Détail / Services", desc:"Électricité, maçon, coiffure..."},
                  {id:"gros-autres", label:"🏭 Gros / Dépôt", desc:"Riz, ciment, quincaillerie..."},
                ].map(c=>(
                  <button key={c.id} onClick={()=>setCategorieId(c.id)} className={`p-3 rounded-xl border-2 text-left ${categorieId===c.id?"bg-black text-white border-black":"bg-gray-50 border-gray-200"}`}>
                    <p className="font-black text-[12px]">{c.label}</p>
                    <p className="text-[9px] opacity-70 mt-1">{c.desc}</p>
                    <p className="text-[9px] font-bold mt-2">Même prix tickets • 0% comm</p>
                  </button>
                ))}
              </div>
              <div className="mt-3 bg-gray-50 rounded-xl p-2.5 text-[10px] flex items-center gap-2">
                <span className="text-lg">{(currentCat as any).icon}</span>
                <div><p className="font-bold">{currentCat.titre}</p><p className="text-[9px] text-gray-500">{currentCat.description}</p></div>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">Ton activité *</p>
              <div className="grid grid-cols-1 gap-2 mt-3 max-h-[220px] overflow-y-auto">
                {activites.map((a:any)=>(
                  <button key={a.id} onClick={()=>setDomaine(a.id)} className={`p-3 rounded-xl border text-left flex items-center gap-3 ${domaine===a.id?"bg-black text-white border-black":"bg-white border-gray-200 hover:border-black"}`}>
                    <span className="text-lg">{(currentCat as any).icon}</span>
                    <div className="flex-1"><p className="font-bold text-[11px]">{a.titre}</p><p className="text-[9px] opacity-70">{a.description||""}</p></div>
                    {domaine===a.id&&<span className="text-[12px]">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-3">
              <p className="font-black text-[12px]">Tickets V6 - Même prix pour tous</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {Object.entries(PALIERS).map(([k,v]:any)=>(
                  <div key={k} className="border rounded-xl p-2.5 text-center">
                    <p className="font-black text-[11px]">{v.badge} {k}</p>
                    <p className="font-black text-[13px] mt-1">{v.prixUSD}$</p>
                    <p className="text-[9px] text-gray-500">{toCDFString(v.prixUSD)}</p>
                    <p className="text-[9px] font-bold mt-1">{v.places} places</p>
                    <p className="text-[8px] text-gray-400">{v.jours} jours</p>
                    <p className="text-[8px] mt-1">{v.prixUSD===5?"⭐ Populaire":v.prixUSD===10?"🚀 Pro":"👑 Max"}</p>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-gray-400 mt-3 text-center">1 ticket = X places strictes sur Y jours (pas X/j) - Cumulable - Max 50 actives - Suppression libère place immédiatement - 0% commission - Taux {TAUX_CDF}</p>
            </div>
          </>
        )}

        <button onClick={handleContinue} disabled={loading} className="w-full bg-black text-white rounded-full py-4 font-black text-[14px] disabled:opacity-50">
          {loading?"Chargement...": user_type==='client'?`Continuer comme Client 🛒`:`Continuer comme Vendeur 🏪 - Freemium 3 annonces`}
        </button>
        <p className="text-[9px] text-gray-400 text-center">V6: Freemium 3 images à vie 30j visibles puis 🔒 caché si 0 ticket - Active ⭐ 5$ pour rester visible - Même prix Détail/Gros - Max 50 - 0% comm - isOwner sécurisé par WA</p>
      </div>
    </div>
  )
            }
