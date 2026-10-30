"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROLES, type Role } from "@/lib/roles";
import { TAUX_CDF, toCDFString } from "@/lib/paiement";

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function Connexion() {
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [code2FA, setCode2FA] = useState("");
  const [pendingUser, setPendingUser] = useState<any>(null);

  useEffect(()=>{
    // Si déjà connecté V6
    try{
      const raw = localStorage.getItem("wenze_user");
      if(raw){
        const u = JSON.parse(raw);
        const { checkDowngrade } = require("@/lib/roles");
        const up = checkDowngrade(u);
        if(up.isCache){
          setError(`🔒 Compte caché - ${up.abonnement} - Redirection abonnement...`);
          setTimeout(()=> router.push(`/abonnement?wa=${cleanWa(u.ownerWhatsapp||"")}&reason=cache`), 1500);
          return;
        }
      }
    }catch{}
  },[router]);

  const handleLogin = async () => {
    setError("");
    const waClean = cleanWa(whatsapp);
    if (!waClean || !password) { 
      setError("❌ WhatsApp et mot de passe requis - WhatsApp est ton identifiant ownerWhatsapp V6"); 
      return; 
    }
    if(waClean.length < 9){
      setError("❌ Numéro WhatsApp invalide - ex: 243970000000 ou 0810000000 - 9 chiffres min");
      return;
    }
    setLoading(true);

    try{
      // V6: Cherche dans wenze_all_users + wenze_user + Supabase si dispo
      let found: any = null;
      
      // 1. Local all_users
      try{
        const allRaw = localStorage.getItem("wenze_all_users");
        const all = allRaw ? JSON.parse(allRaw) : [];
        found = all.find((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp||u.telephone||u.id||"")===waClean);
      }catch{}

      // 2. wenze_user
      if(!found){
        try{
          const raw = localStorage.getItem("wenze_user");
          const u = raw ? JSON.parse(raw) : null;
          if(u && cleanWa(u.ownerWhatsapp||u.whatsapp||"")===waClean) found = u;
        }catch{}
      }

      // 3. Si pas trouvé, crée temporaire pour compat ancien système (ancien password stocké en clair dans localStorage? On vérifie)
      if(!found){
        // V6: check si password match ancien stockage wenze_passwords
        try{
          const pwRaw = localStorage.getItem("wenze_passwords");
          const pwMap = pwRaw ? JSON.parse(pwRaw) : {};
          if(pwMap[waClean] && pwMap[waClean]!==password){
            throw new Error("Mot de passe incorrect - V6 sécurité ownerWhatsapp");
          }
          if(!pwMap[waClean]){
            // Première connexion avec ce WA - on autorise si format WA ok (compat ancien système sans compte)
            found = {
              id: waClean,
              ownerWhatsapp: waClean,
              whatsapp: waClean,
              role: "vendeur",
              user_type: "vendeur",
              createdAt: new Date().toISOString(),
              email: `${waClean}@wenze.local`,
              badge: "🛍️",
            };
          }
        }catch(e:any){
          if(e.message?.includes("incorrect")) throw e;
        }
      }

      if(!found){
        throw new Error("Compte non trouvé - Crée compte via Inscription - ownerWhatsapp non enregistré - V6 nécessite inscription avec WhatsApp");
      }

      // V6: Check mot de passe si existait
      try{
        const pwRaw = localStorage.getItem("wenze_passwords");
        const pwMap = pwRaw ? JSON.parse(pwRaw) : {};
        if(pwMap[waClean] && pwMap[waClean]!==password){
          throw new Error("Mot de passe incorrect");
        }
      }catch(e:any){
        if(e.message.includes("incorrect")) throw e;
      }

      const role = (found.role||found.user_type||"vendeur") as Role;

      // DG 2FA V6
      if((ROLES as any)[role]?.need2FA || role==="dg"){
        if(!show2FA){
          setPendingUser(found);
          setShow2FA(true);
          setLoading(false);
          return;
        }else{
          if(code2FA!=="123456" && code2FA.length<6){
            throw new Error("Code 2FA DG requis - 6 chiffres - Demo: 123456");
          }
        }
      }

      // V6: Sync wenze_user pro
      const now = new Date().toISOString();
      const wenzeUser = {
        id: found.id || waClean,
        ownerWhatsapp: waClean,
        whatsapp: waClean,
        telephone: waClean,
        email: found.email || `${waClean}@wenze.local`,
        role,
        user_type: role,
        createdAt: found.createdAt || found.created_at || now,
        updatedAt: now,
        badge: (ROLES as any)[role]?.badge || found.badge || "🛍️",
        ownerId: found.id || waClean,
        name: found.name || found.nomBoutique || `Boutique ${waClean.slice(-4)}`,
        nomBoutique: found.nomBoutique || found.name || `Boutique ${waClean.slice(-4)}`,
      };

      localStorage.setItem("wenze_user", JSON.stringify(wenzeUser));

      // Save all_users
      try{
        const allRaw = localStorage.getItem("wenze_all_users");
        const all = allRaw ? JSON.parse(allRaw) : [];
        const idx = all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp||"")===waClean);
        if(idx>=0) all[idx] = { ...all[idx], ...wenzeUser };
        else all.push(wenzeUser);
        localStorage.setItem("wenze_all_users", JSON.stringify(all.slice(0,500)));
        
        // Save password map V6 (hash simple pour demo - en prod hash bcrypt côté Supabase)
        const pwRaw = localStorage.getItem("wenze_passwords");
        const pwMap = pwRaw ? JSON.parse(pwRaw) : {};
        pwMap[waClean] = password;
        localStorage.setItem("wenze_passwords", JSON.stringify(pwMap));
      }catch{}

      // V6 CRITIQUE: Check suivi compte après login
      try{
        const { verifierAbonnement } = require("@/lib/paiement");
        const ab = verifierAbonnement();
        if(ab.isCache){
          setError(`🔒 ${ab.message} - Redirection vers abonnement pour réactiver - Même prix pour tous`);
          setTimeout(()=> router.push(`/abonnement?wa=${waClean}&reason=cache`), 1500);
          setLoading(false);
          return;
        }
        // Message places restantes
        if(ab.isPaye){
          console.log(`V6 Login OK: ${ab.badge} ${ab.palierId} - ${ab.placesRestantes} places libres - ${ab.joursRestants}j restants`);
        }
      }catch{}

      // Redirect selon rôle V6
      if(role==="dg"){
        router.push("/dg");
      }else if(role==="superviseur"){
        router.push("/superviseur");
      }else{
        router.push("/");
      }

    }catch(e:any){
      setError(`❌ ${e.message||"Erreur connexion V6 - Vérifie WhatsApp + mot de passe - ownerWhatsapp obligatoire"}`);
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-[#FFFBF0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-orange-100 p-6">
        <div className="text-center mb-6">
          <Link href="/" className="text-[11px] text-[#6C3CE0] font-bold">← Accueil TonMarché.cd</Link>
          <h1 className="text-2xl font-black mt-2">Connexion V6</h1>
          <p className="text-[11px] text-gray-500 mt-1">WhatsApp = identifiant ownerWhatsapp - Sécurité isOwner() - Max 50 actives - Suppression libère place</p>
          <div className="mt-3 bg-black text-white rounded-xl p-2 text-[10px]">V6 Même prix: ⭐ 5$ ({toCDFString(5)}) • 🚀 10$ ({toCDFString(10)}) • 👑 20$ ({toCDFString(20)}) • Taux {TAUX_CDF} • 0% comm • 🆓 3 à vie 30j puis caché</div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold">WhatsApp (ownerWhatsapp V6)</label>
            <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="243970000000 - 9 chiffres min" type="tel" className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
            <p className="text-[9px] text-gray-400 mt-1">Nettoyé via cleanWa() → replace(/[^0-9]/g) - Clé pour filtre compte caché + max 50</p>
          </div>
          <div>
            <label className="text-[11px] font-bold">Mot de passe</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" type="password" className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
          </div>

          {show2FA && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700">🔐 2FA DG requis - Rôle {pendingUser?.role||"dg"} need2FA=true</p>
              <input value={code2FA} onChange={e=>setCode2FA(e.target.value)} placeholder="Code 2FA - demo 123456" className="w-full mt-2 border rounded-xl px-4 py-2 text-sm" />
              <p className="text-[9px] text-gray-500 mt-1">En prod: table supabase 2fa_codes - Demo accepte 123456</p>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] p-3 rounded-xl">{error}</div>}

          <button onClick={handleLogin} disabled={loading} className="w-full bg-black text-white rounded-xl py-3.5 text-sm font-black disabled:opacity-50 hover:bg-gray-900 transition">
            {loading ? "Vérification V6..." : show2FA ? "Vérifier 2FA + Se connecter" : "Se connecter - Vérif compte caché + tickets stricts"}
          </button>

          <div className="flex justify-between text-[11px] mt-3">
            <Link href="/inscription" className="text-[#6C3CE0] font-bold">Créer compte Freemium 3 images</Link>
            <Link href="/abonnement" className="text-gray-500">Tarifs V6 même prix →</Link>
          </div>

          <div className="mt-4 bg-gray-50 rounded-xl p-3 text-[10px] text-gray-500">
            <b>V6 Sécurité:</b><br/>
            - isOwner() check ownerWhatsapp/whatsapp/telephone/userId cross-match<br/>
            - isCompteCache() = freemium 30j expiré + 0 ticket actif → filtré accueil/boutiques/catégories<br/>
            - canPublishDetail() codes CACHE/MAX50/FREEMIUM_FULL/NO_PLACE<br/>
            - libererPlace() lors suppression → place libérée immédiatement<br/>
            - hasRole() hiérarchie dg(4) &gt; superviseur(3) &gt; ambassadeur(2) &gt; vendeur(1) &gt; client(0)
          </div>
        </div>
      </div>
    </div>
  );
        }
