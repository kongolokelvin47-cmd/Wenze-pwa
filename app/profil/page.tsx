"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Heart, Store, Clock, Ticket, Wallet, Home, Headset, UserPlus, Hourglass, Truck, MessageSquare, PackageX } from "lucide-react"

export default function ProfilKikuu() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [plan, setPlan] = useState("gratuit")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const p = localStorage.getItem("wenze_plan")
    if(p) setPlan(p)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* HEADER - Comme ta capture */}
      <div className="bg-white p-4">
        {!user ? (
          <button 
            onClick={()=>router.push("/login")}
            className="w-full bg-white border shadow-sm rounded-full py-3 font-bold text-orange-600 text-center"
          >
            S'IDENTIFIER / S'ENREGISTRER
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold">JJ</div>
            <div>
              <p className="font-bold">{user.email}</p>
              <p className="text-xs text-green-600">Plan: {plan.toUpperCase()} - {plan==='gratuit' ? '3 annonces max' : 'ILLIMITÉ'}</p>
            </div>
          </div>
        )}
      </div>

      {/* MA COMMANDE */}
      <div className="bg-white mt-2 p-4">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold text-lg">Ma Commande</h2>
          <span className="text-blue-600 text-sm" onClick={()=>router.push("/commandes")}>Voir tout</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div onClick={()=>router.push("/commandes?f=en_attente")} className="flex flex-col items-center">
            <Hourglass className="w-7 h-7" /><span className="text-xs mt-1">En attente paiement</span>
          </div>
          <div className="flex flex-col items-center"><Truck className="w-7 h-7" /><span className="text-xs mt-1">Expédition</span></div>
          <div className="flex flex-col items-center"><MessageSquare className="w-7 h-7" /><span className="text-xs mt-1">En attente commentaires</span></div>
          <div className="flex flex-col items-center"><PackageX className="w-7 h-7" /><span className="text-xs mt-1">Retour & Remboursement</span></div>
        </div>
      </div>

      {/* LISTE */}
      <div className="bg-white mt-2">
        <Item icon={<Heart />} label="Liste de souhait" onClick={()=>router.push("/favoris")} />
        <Item icon={<Store />} label="Magasin suivi" value={user ? "2" : "0"} />
        <Item icon={<Clock />} label="vu récemment" />
        <Item icon={<Ticket />} label="Mes bons" right="Disponible: 0" />
        <Item icon={<Wallet />} label="Mon K-Pay" right={`Solde: 0 - Plan ${plan}`} onClick={()=>router.push("/abonnements")} />
        <div className="h-2 bg-gray-100"></div>
        <Item icon={<Home />} label="Gestion des adresses" onClick={()=>router.push("/profil/adresses")} />
        <Item icon={<Headset />} label="Centre de services" />
        <Item icon={<UserPlus />} label="Inviter un ami" />
        {user && <button onClick={async()=>{await supabase.auth.signOut(); localStorage.clear(); location.reload()}} className="w-full p-4 text-red-500 text-left">Déconnexion + Effacer cache 1792...</button>}
      </div>

      {/* BOTTOM NAV - Comme ta capture */}
      <div className="fixed bottom-0 w-full bg-white border-t flex justify-around py-2">
        <span onClick={()=>router.push("/")}>Accueil</span>
        <span>Catégories</span>
        <span className="relative font-bold">Shopping <span className="absolute -top-2 bg-red-600 text-white text-[8px] px-1 rounded">NEW</span></span>
        <span>Chariot</span>
        <span className="text-orange-600 font-bold">Mon KiKUU</span>
      </div>
    </div>
  )
}

function Item({icon, label, right, value, onClick}: any){
  return (
    <div onClick={onClick} className="flex items-center justify-between p-4 border-b border-gray-100">
      <div className="flex items-center gap-4">{icon}<span>{label}</span></div>
      <span className="text-blue-600 text-sm">{right || value || ""}</span>
    </div>
  )
        }
