"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TAUX_CDF, toCDFString, verifierAbonnement } from "@/lib/paiement";
import { ROLES, checkDowngrade, hasRole, type Role } from "@/lib/roles";

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
    try{
      const raw = localStorage.getItem("wenze_user");
      if(raw){
        const u = JSON.parse(raw);
        const up: any = checkDowngrade(u);
        if(up.isCache || up.isDowngraded){
          const wa = cleanWa(u.ownerWhatsapp||u.whatsapp||"");
          setError(`🔒 Compte caché - ${up.abonnement||"Freemium expiré"} - Redirection...`);
          setTimeout(()=> router.push(`/abonnement?wa=${wa}&reason=cache`), 1500);
        }
      }
    }catch{}
  },[router]);

  const handleLogin = async () => {
    setError("");
    const waClean = cleanWa(whatsapp);
    if (!waClean || !password) { 
      setError("❌ WhatsApp et mot de passe requis"); 
      return; 
    }
    if(waClean.length < 9){
      setError("❌ Numéro invalide - 243970000000 - 9 chiffres min");
      return;
    }
    setLoading(true);

    try{
      let found: any = null;
      try{
        const allRaw = localStorage.getItem("wenze_all_users");
        const all = allRaw ? JSON.parse(allRaw) : [];
        found = all.find((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp||u.telephone||"")===waClean);
      }catch{}
      if(!found){
        try{
          const raw = localStorage.getItem("wenze_user");
          const u = raw ? JSON.parse(raw) : null;
          if(u && cleanWa(u.ownerWhatsapp||u.whatsapp||"")===waClean) found = u;
        }catch{}
      }

      try{
        const pwRaw = localStorage.getItem("wenze_passwords");
        const pwMap = pwRaw ? JSON.parse(pwRaw) : {};
        if(pwMap[waClean] && pwMap[waClean]!==password) throw new Error("Mot de passe incorrect");
        if(!found && !pwMap[waClean]){
          found = { id: waClean, ownerWhatsapp: waClean, whatsapp: waClean, role: "vendeur" as Role, user_type: "vendeur", createdAt: new Date().toISOString(), email: `${waClean}@wenze.local`, badge: "🛍️" };
        }
      }catch(e:any){ if(e.message?.includes("incorrect")) throw e; }

      if(!found) throw new Error("Compte non trouvé - Inscris-toi");
      const role = (found.role||found.user_type||"vendeur") as Role;
      const roleInfo = (ROLES as any)[role];

      if(roleInfo?.need2FA || role==="dg"){
        if(!show2FA){ setPendingUser(found); setShow2FA(true); setLoading(false); return; }
        else if(code2FA!=="123456" && code2FA.length!==6) throw new Error("Code 2FA DG requis - Demo 123456");
      }

      const now = new Date().toISOString();
      const wenzeUser = { id: found.id||waClean, ownerWhatsapp: waClean, whatsapp: waClean, telephone: waClean, email: found.email||`${waClean}@wenze.local`, role, user_type: role, createdAt: found.createdAt||found.created_at||now, updatedAt: now, badge: roleInfo?.badge||found.badge||"🛍️", ownerId: found.id||waClean, name: found.name||found.nomBoutique||`Boutique ${waClean.slice(-4)}`, nomBoutique: found.nomBoutique||found.name||`Boutique ${waClean.slice(-4)}` };
      localStorage.setItem("wenze_user", JSON.stringify(wenzeUser));

      try{
        const allRaw = localStorage.getItem("wenze_all_users");
        const all = allRaw ? JSON.parse(allRaw) : [];
        const idx = all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp||"")===waClean);
        if(idx>=0) all[idx] = { ...all[idx], ...wenzeUser }; else all.push(wenzeUser);
        localStorage.setItem("wenze_all_users", JSON.stringify(all.slice(0,500)));
        const pwRaw = localStorage.getItem("wenze_passwords");
        const pwMap = pwRaw ? JSON.parse(pwRaw) : {};
        pwMap[waClean] = password;
        localStorage.setItem("wenze_passwords", JSON.stringify(pwMap));
      }catch{}

      // V6 FIX SANS require()
      try{
        const ab = verifierAbonnement();
        if((ab as any).isCache){
          setError(`🔒 ${(ab as any).message} - Redirection abonnement`);
          setTimeout(()=> router.push(`/abonnement?wa=${waClean}&reason=cache`), 1500);
          setLoading(false);
          return;
        }
      }catch{}

      if(role==="dg") router.push("/dg");
      else if(role==="superviseur" || hasRole(role,"superviseur")) router.push("/superviseur");
      else router.push("/");

    }catch(e:any){ setError(`❌ ${e.message||"Erreur V6"}`); } finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-[#FFFBF0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border p-6">
        <div className="text-center mb-6">
          <Link href="/" className="text-[11px] text-[#6C3CE0] font-bold">← Accueil</Link>
          <h1 className="text-2xl font-black mt-2">Connexion V6 FIX</h1>
          <div className="mt-3 bg-black text-white rounded-xl p-2 text-[10px]">V6 Même prix: ⭐ 5$ ({toCDFString(5)}) • 🚀 10$ ({toCDFString(10)}) • 👑 20$ ({toCDFString(20)}) • Taux {TAUX_CDF}</div>
        </div>
        <div className="space-y-3">
          <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="243970000000" type="tel" className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" type="password" className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
          {show2FA && <input value={code2FA} onChange={e=>setCode2FA(e.target.value)} placeholder="Code 2FA 123456" className="w-full border rounded-xl px-4 py-2 text-sm" />}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] p-3 rounded-xl">{error}</div>}
          <button onClick={handleLogin} disabled={loading} className="w-full bg-black text-white rounded-xl py-3.5 text-sm font-black disabled:opacity-50">{loading?"Vérification...":show2FA?"Vérifier 2FA":"Se connecter"}</button>
        </div>
      </div>
    </div>
  );
      }
