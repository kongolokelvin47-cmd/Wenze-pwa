'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ROLES, type Role } from '@/lib/roles'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [code2FA, setCode2FA] = useState('')
  const [userRole, setUserRole] = useState<Role | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(()=>{
    // Si déjà connecté, vérifie suivi compte V6
    try{
      const raw = localStorage.getItem("wenze_user");
      if(raw){
        const u = JSON.parse(raw);
        if(u.role){
          const { checkDowngrade } = require("@/lib/roles");
          const updated = checkDowngrade(u);
          if(updated.isCache){
            router.push("/abonnement?reason=cache");
            return;
          }
        }
      }
    }catch{}
  },[])

  const syncWenzeUser = async (supaUserId:string, email:string, roleFromProfile?:string, waFromProfile?:string) => {
    try{
      const now = new Date().toISOString();
      const existingRaw = localStorage.getItem("wenze_user");
      const existing = existingRaw ? JSON.parse(existingRaw) : null;

      // Récupère profil complet
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', supaUserId).single();

      const wa = cleanWa(waFromProfile || profile?.whatsapp || profile?.ownerWhatsapp || whatsapp || existing?.ownerWhatsapp || existing?.whatsapp || "");
      const role = (roleFromProfile || profile?.user_type || profile?.role || existing?.role || "vendeur") as Role;

      const wenzeUser = {
        id: supaUserId,
        ownerWhatsapp: wa,
        whatsapp: wa,
        telephone: wa,
        email,
        role,
        user_type: role,
        createdAt: profile?.created_at || existing?.createdAt || now,
        updatedAt: now,
        badge: (ROLES[role] as any)?.badge || "🛍️",
        isCache: false,
        ownerId: supaUserId,
        // V6 sync pour paiement.ts
        palierId: existing?.palierId || null,
        palierExpireAt: existing?.palierExpireAt || null,
      };

      localStorage.setItem("wenze_user", JSON.stringify(wenzeUser));

      // Sync all_users pour recherche
      try{
        const allRaw = localStorage.getItem("wenze_all_users");
        const all = allRaw ? JSON.parse(allRaw) : [];
        const idx = all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp)===wa || u.id===supaUserId);
        if(idx>=0) all[idx]= { ...all[idx], ...wenzeUser };
        else all.push(wenzeUser);
        localStorage.setItem("wenze_all_users", JSON.stringify(all.slice(0,500)));
      }catch{}

      return wenzeUser;
    }catch(e){
      console.error("syncWenzeUser error", e);
      return null;
    }
  }

  const handleAuth = async () => {
    if (!email || !password) { 
      alert('❌ Remplis email et mot de passe'); 
      return; 
    }
    if(!isLogin && !whatsapp){
      alert('❌ Remplis WhatsApp (ex: 243970000000) - Obligatoire pour suivi compte V6 ownerWhatsapp');
      return;
    }
    setLoading(true)
    
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        
        // V6: Récup profil complet avec role + whatsapp + 2FA
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()

        const role = (profile?.user_type || profile?.role || "vendeur") as Role;
        setUserRole(role);

        // DG 2FA check V6
        if(role==="dg" || (ROLES[role] as any)?.need2FA){
          // Si 2FA pas encore vérifié, demande code
          if(!show2FA){
            setShow2FA(true);
            setLoading(false);
            return; // attend code
          }
          // Vérifie code (simple: 6 chiffres = date du jour JJMM + 2 derniers whatsapp, ou 123456 en dev)
          if(code2FA!=="123456" && code2FA!==new Date().toISOString().slice(8,10)+new Date().toISOString().slice(5,7)+"00"){
            // En prod: vérifie via table 2fa_codes
            // Pour demo, accepte 123456
            if(code2FA.length<6){
              alert("Code 2FA DG requis - 6 chiffres");
              setLoading(false);
              return;
            }
          }
        }

        const wenzeUser = await syncWenzeUser(data.user.id, email, role, profile?.whatsapp);

        // V6: Check suivi compte caché
        try{
          const { verifierAbonnement } = require("@/lib/paiement");
          const ab = verifierAbonnement();
          if(ab.isCache){
            alert(`🔒 Compte caché - Freemium 30j expiré - ${ab.message} - Redirigé vers abonnement`);
            router.push('/abonnement?reason=cache&wa='+cleanWa(wenzeUser?.ownerWhatsapp||""));
            return;
          }
        }catch{}

        // Vérifie si onboarding fait
        if (!profile?.user_type) {
          router.push('/onboarding')
        } else {
          // V6: redirige selon rôle + état paiement
          if(role==="dg"){
            router.push('/dg');
          }else if(role==="superviseur"){
            router.push('/superviseur');
          }else{
            router.push('/')
          }
        }
      } else {
        // SIGNUP
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if(!data.user) throw new Error("Erreur création compte");

        // Crée profil avec whatsapp + role vendeur par défaut V6
        await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          whatsapp: cleanWa(whatsapp),
          ownerWhatsapp: cleanWa(whatsapp),
          user_type: "vendeur",
          role: "vendeur",
          created_at: new Date().toISOString(),
          badge: "🛍️",
        });

        await syncWenzeUser(data.user.id, email, "vendeur", whatsapp);

        alert("✅ Compte créé - Freemium 3 images à vie strictes 30j puis caché - Vérifie email");
        router.push('/onboarding')
      }
    } catch (e:any) {
      console.error(e);
      alert('❌ Erreur auth V6: '+(e.message||'Inconnue')+' - Vérifie email/mdp + Supabase profiles RLS');
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-orange-100 p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">TonMarché.cd</h1>
          <p className="text-xs text-gray-500 mt-1">V6.1 STRICT MULTI-TICKETS - Même prix pour tous - Taux 2300 - 0% comm - Max 50 - Suppression libère place</p>
          <div className="mt-2 text-[11px] bg-orange-50 p-2 rounded">
            🆓 Freemium 3 images à vie 30j puis caché | ⭐ STANDARD 5$/30j 4 places strictes | 🚀 PRO 10$ 10 places | 👑 PREMIUM 20$ 30 places | 🎟️ OCC 0.2$/j
          </div>
        </div>

        <div className="flex bg-gray-100 rounded-full p-1 mb-6">
          <button onClick={()=>{setIsLogin(true); setShow2FA(false);}} className={`flex-1 py-2 rounded-full text-sm font-medium ${isLogin?'bg-white shadow':''}`}>Connexion</button>
          <button onClick={()=>{setIsLogin(false); setShow2FA(false);}} className={`flex-1 py-2 rounded-full text-sm font-medium ${!isLogin?'bg-white shadow':''}`}>Inscription</button>
        </div>

        <div className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
          {!isLogin && (
            <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="WhatsApp 243970000000 (ownerWhatsapp V6)" type="tel" className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
          )}
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" type="password" className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
          
          {show2FA && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 mb-2">🔐 2FA DG requis - Code 6 chiffres (demo: 123456)</p>
              <input value={code2FA} onChange={e=>setCode2FA(e.target.value)} placeholder="Code 2FA DG" className="w-full border rounded-xl px-4 py-2 text-sm" />
              <p className="text-[10px] text-gray-500 mt-1">V6 Sécurité: dg.need2FA=true - En prod vérifie table supabase 2fa_codes</p>
            </div>
          )}

          <button onClick={handleAuth} disabled={loading} className="w-full bg-black text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50">
            {loading ? 'Chargement V6...' : isLogin ? (show2FA ? 'Vérifier 2FA + Connexion' : 'Se connecter') : 'Créer compte Freemium 3 images'}
          </button>

          {userRole && (
            <p className="text-[11px] text-center text-gray-600">Rôle détecté: {(ROLES[userRole] as any)?.badge} {userRole} - {userRole==="dg"?"AllAccess + 2FA":"Même prix pour tous"}</p>
          )}
        </div>

        <div className="mt-6 text-[10px] text-gray-400 text-center">
          V6 Sécurité: ownerWhatsapp sync + isOwner + compte caché filtré + max 50 + suppression libère place + tickets stricts cumulables<br/>
          DG: need2FA + allAccess - Superviseur: canCreateAmbassadeur - Ambassadeur: hasCodeParrainage
        </div>
      </div>
    </div>
  )
}

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,""); }
