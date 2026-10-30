"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TAUX_CDF, toCDFString, PALIERS } from "@/lib/paiement";
import { ROLES, type Role } from "@/lib/roles";

export const dynamic = 'force-dynamic';
function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,""); }

const COMPTES = [
  { id:"client", titre:"🛒 Client", desc:"J'achète seulement - Gratuit à vie", badge:"🛒", role:"client" as Role, detail:"Parcours boutiques, chat WhatsApp direct, 0% comm. Pas besoin de publier.", freemium:"Gratuit" },
  { id:"vendeur", titre:"🛍️ Vendeur Boutique", desc:"Je vends en détail - Magasin, boutique", badge:"🛍️", role:"vendeur" as Role, detail:"Idéal pour vendeurs de Kinshasa. 3 images gratuites à vie, puis STANDARD 5$ même prix que gros.", freemium:"3 images gratuites 30j" },
  { id:"prestataire", titre:"🔧 Prestataire Service", desc:"Je vends service - Coiffeur, mécano, plombier", badge:"🔧", role:"prestataire" as Role, detail:"Coiffure, soudure, mécanique, électricien, menuiserie, couture. Même prix que vendeur.", freemium:"3 services gratuits 30j" },
  { id:"grossiste", titre:"🏭 Grossiste / Dépôt B2B", desc:"Je vends en gros - Agriculteur, usine", badge:"🏭", role:"grossiste" as Role, detail:"Dépôt, agriculture, grande échelle. Ex-25$ supprimé - Maintenant même prix: 5$/10$/20$ max pour tous.", freemium:"3 produits gros gratuits 30j" },
];

function InscriptionForm(){
  const params=useSearchParams();
  const router=useRouter();
  const inviteToken=params.get("invite");
  const waParam=params.get("wa")||params.get("whatsapp")||"";
  const initialType=params.get("type")||"client";

  const [type,setType]=useState(initialType);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [form,setForm]=useState({ whatsapp: waParam, password:"", nomBoutique:"", nom:"" });

  const selected = COMPTES.find(c=>c.id===type) || COMPTES[0];

  const handleSubmit = async () => {
    setError("");
    const waClean = cleanWa(form.whatsapp);
    if(!waClean || waClean.length<9) { setError("WhatsApp requis - ex: 243970000000"); return; }
    if(!form.password || form.password.length<4) { setError("Mot de passe 4 caractères min"); return; }
    if(type!=="client" && !form.nomBoutique) { setError("Nom boutique / service requis"); return; }
    setLoading(true);
    try{
      const now = new Date().toISOString();
      const user = {
        id: waClean,
        ownerWhatsapp: waClean,
        whatsapp: waClean,
        telephone: waClean,
        email: `${waClean}@wenze.local`,
        role: selected.role,
        user_type: selected.role,
        nomBoutique: form.nomBoutique || form.nom || `Boutique ${waClean.slice(-4)}`,
        name: form.nom || form.nomBoutique || `Boutique ${waClean.slice(-4)}`,
        nom: form.nom,
        createdAt: now,
        updatedAt: now,
        badge: selected.badge,
        ownerId: waClean,
        inviteToken: inviteToken || null,
        isFreemium: true,
        freemiumCount: 0,
        freemiumMax: 3,
      };

      localStorage.setItem("wenze_user", JSON.stringify(user));
      
      try{
        const allRaw = localStorage.getItem("wenze_all_users");
        const all = allRaw ? JSON.parse(allRaw) : [];
        const idx = all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp||"")===waClean);
        if(idx>=0) all[idx] = { ...all[idx], ...user }; else all.push(user);
        localStorage.setItem("wenze_all_users", JSON.stringify(all.slice(0,500)));
        
        const pwRaw = localStorage.getItem("wenze_passwords");
        const pwMap = pwRaw ? JSON.parse(pwRaw) : {};
        pwMap[waClean] = form.password;
        localStorage.setItem("wenze_passwords", JSON.stringify(pwMap));

        const freeRaw = localStorage.getItem("wenze_freemium_used");
        const freeMap = freeRaw ? JSON.parse(freeRaw) : {};
        if(!freeMap[waClean]) freeMap[waClean] = { count:0, createdAt: now };
        localStorage.setItem("wenze_freemium_used", JSON.stringify(freeMap));
      }catch{}

      // Redirect V6 avec message clair
      if(type==="client") router.push("/");
      else router.push(`/publier?welcome=1&type=${type}&wa=${waClean}`);

    }catch(e:any){ setError(e.message||"Erreur inscription V6"); } finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF0] pb-20">
      <div className="max-w-[430px] mx-auto p-4">
        <Link href="/" className="text-[11px] text-[#6C3CE0] font-bold">← Accueil</Link>
        
        <div className="mt-3 bg-black text-white rounded-3xl p-5">
          <h1 className="text-2xl font-black">Inscription V6</h1>
          <p className="text-[11px] opacity-70 mt-1">TonMarché.cd - Kinshasa - 1 WhatsApp = ton compte ownerWhatsapp</p>
          <div className="mt-3 bg-white/15 rounded-xl p-2.5 text-[10px] leading-relaxed">
            <b>V6 Même prix pour tous:</b> ⭐ STANDARD 5$ ({toCDFString(5)}) 4 places strictes sur 7j • 🚀 PRO 10$ ({toCDFString(10)}) 10 places • 👑 PREMIUM 20$ ({toCDFString(20)}) 30 places • Taux {TAUX_CDF} • 0% comm • Max 50 actives • Suppression libère place
          </div>
          {inviteToken && <div className="mt-2 text-[10px] bg-green-500 text-white px-3 py-1.5 rounded-full inline-block">🎁 Invitation ambassadeur: {inviteToken.slice(0,8)} - Bonus à l'activation</div>}
        </div>

        <div className="mt-4">
          <h2 className="font-black text-sm">1. Choisis ton compte - Simple comme app moderne</h2>
          <p className="text-[11px] text-gray-500">Tous les comptes pro ont même prix. Client reste gratuit.</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {COMPTES.map(c=>(
              <button key={c.id} onClick={()=>setType(c.id)} className={`text-left rounded-2xl border-2 p-3 transition ${type===c.id?"border-black bg-white shadow-lg scale-[1.02]":"border-gray-100 bg-white hover:border-gray-300"}`}>
                <div className="text-xl">{c.titre.split(" ")[0]}</div>
                <div className="font-black text-xs mt-1">{c.titre.replace(/^[^\s]+\s/,"")}</div>
                <div className="text-[10px] text-gray-600 mt-1 leading-tight">{c.desc}</div>
                <div className={`mt-2 text-[9px] px-2 py-1 rounded-full inline-block ${type===c.id?"bg-black text-white":"bg-gray-100"}`}>{c.freemium}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 bg-white border rounded-2xl p-3 text-[11px]">
            <b>{selected.badge} {selected.titre}:</b> {selected.detail}
            <div className="mt-2 text-[10px] text-gray-500">Règle V6: Freemium = 3 images à vie strictes pendant 30j puis compte <b>🔒 caché filtré</b> sur accueil/boutiques/catégories. Réapparaît dès que tu payes 5$ - 1 ticket = X places strictes sur Y jours (pas X/j) - Cumulable - Max 50 - Suppression libère place immédiatement</div>
          </div>
        </div>

        <div className="mt-5 bg-white rounded-3xl border p-5 shadow-sm">
          <h2 className="font-black text-sm">2. Tes infos - 30 secondes</h2>
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-[11px] font-bold">WhatsApp (ton identifiant) *</label>
              <input value={form.whatsapp} onChange={e=>setForm({...form, whatsapp:e.target.value})} placeholder="243970000000" type="tel" className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none" />
              <p className="text-[9px] text-gray-400 mt-1">Utilisé pour isOwner() + filtre compte caché + max 50</p>
            </div>
            <div>
              <label className="text-[11px] font-bold">Mot de passe *</label>
              <input value={form.password} onChange={e=>setForm({...form, password:e.target.value})} placeholder="4 caractères min" type="password" className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none" />
            </div>
            {type!=="client" && (
              <>
                <div>
                  <label className="text-[11px] font-bold">Nom boutique / service / dépôt *</label>
                  <input value={form.nomBoutique} onChange={e=>setForm({...form, nomBoutique:e.target.value})} placeholder={type==="prestataire"?"Ex: Salon Beauté Glam - Coiffure":"Ex: Dépôt Maluku - Riz"} className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold">Ton nom (optionnel)</label>
                  <input value={form.nom} onChange={e=>setForm({...form, nom:e.target.value})} placeholder="Ex: Kelvin" className="w-full mt-1 border rounded-xl px-4 py-3 text-sm" />
                </div>
              </>
            )}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] p-3 rounded-xl">{error}</div>}
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-black text-white rounded-xl py-4 text-sm font-black disabled:opacity-50 hover:bg-gray-900 transition">
              {loading?"Création...":`Créer compte ${selected.badge} ${selected.titre.replace(/^[^\s]+\s/,"")} - ${selected.freemium}`}
            </button>
            <p className="text-[10px] text-center text-gray-400">En créant, tu acceptes: même prix 5$/10$/20$ - 1 ticket = X places strictes - Max 50 - 0% comm - Taux {TAUX_CDF}</p>
            <div className="flex justify-between text-[11px]">
              <Link href="/connexion" className="text-[#6C3CE0] font-bold">Déjà compte? Connexion</Link>
              <Link href="/abonnement" className="text-gray-500">Voir tarifs V6 →</Link>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-orange-50 border border-orange-100 rounded-2xl p-3 text-[10px]">
          <b>💡 Pourquoi même prix pour tous?</b> On vend visibilité, pas catégorie. Grossiste n'a plus 25$ - Maintenant 20$ max comme tous. Client achète direct via WhatsApp, 0% commission. Freemium 3 images à vie permet tester 30j. Après 30j si 0 ticket, compte caché 🔒 mais réapparaît dès paiement 5$.
        </div>
      </div>
    </div>
  );
}

export default function InscriptionPage(){
  return <Suspense fallback={<div className="p-10 text-center text-sm">Chargement inscription V6...</div>}><InscriptionForm/></Suspense>;
            }
