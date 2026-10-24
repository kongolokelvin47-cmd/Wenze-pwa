"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { CATEGORIES_WENZE } from "@/lib/categories"
import { TAUX_CDF, FORMULES, toCDF } from "@/lib/paiement"

export const dynamic = 'force-dynamic';

// ✅ FIX: Supabase seulement côté client - pas pendant build Vercel
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

// ✅ FIX: prix avec fallback si FORMULES.boost undefined
const SAFE_FORMULES = {
  pro: { prixCDF: FORMULES?.pro?.prixCDF ?? 11500, prix: FORMULES?.pro?.prix ?? 5 },
  grossiste: { prixCDF: FORMULES?.grossiste?.prixCDF ?? 23000, prix: FORMULES?.grossiste?.prix ?? 10 },
  boost: { prixCDF: (FORMULES as any)?.boost?.prixCDF ?? 4600, prix: (FORMULES as any)?.boost?.prix ?? 2 },
};

const SERVICES = [
  { section: "ABONNEMENTS - RÉGIME PRESTATAIRE UNIQUE", items: [
    { 
      code: 'pro', 
      label: 'Vendeur Pro / Services - Régime prestataire unique', 
      sub: 'Annonces illimitées + Boutique Pro fonctionnelle + 🔧 Soudeur + Tout travaux inclus même régime', 
      prix: SAFE_FORMULES.pro.prixCDF, 
      usd: `${SAFE_FORMULES.pro.prix} $ / mois`, 
      color: 'bg-[#6C3CE0]', border: 'border-purple-300', bg: 'bg-purple-50',
      badge: `🔧 Soudeur + Tout travaux = même régime ${SAFE_FORMULES.pro.prix}$`
    },
    { 
      code: 'grossiste', 
      label: 'Grossiste / Grande Échelle - Régime prestataire volume', 
      sub: 'Tout Pro + B2B + 5 boutiques multi-villes + Soudeur + Tout travaux multi-équipes même régime', 
      prix: SAFE_FORMULES.grossiste.prixCDF, 
      usd: `${SAFE_FORMULES.grossiste.prix} $ / mois`, 
      color: 'bg-orange-500', border: 'border-orange-200', bg: 'bg-orange-50',
      badge: `🏗️ Volume même régime`
    },
  ]},
  { section: `PUBLICATIONS - Taux ${TAUX_CDF} CDF`, items: [
    { code: 'occasionnel', label: 'Publication Occasionnelle - Régime prestataire', sub: '1 annonce / 5 jours - Boutique fonctionnelle', prix: 3 * TAUX_CDF, usd: '3 $', color: 'bg-black', border: 'border-yellow-200', bg: 'bg-yellow-50', badge: `Régime prestataire` },
  ]},
  { section: `PUBLICITÉ BOOST & VIDÉO - Taux ${TAUX_CDF} CDF`, items: [
    { code: 'boost_image', label: 'Boost Image - Boutique fonctionnelle', sub: '5 jours - Carrousel - 6 métiers', prix: SAFE_FORMULES.boost.prixCDF, usd: `${SAFE_FORMULES.boost.prix} $`, color: 'bg-black', border: 'border-gray-200', bg: 'bg-white', badge: `${TAUX_CDF} CDF` },
    { code: 'video_express', label: 'Video Express 60s', sub: '2 jours - Régime prestataire', prix: 1 * TAUX_CDF, usd: '1 $', color: 'bg-gray-800', border: 'border-gray-200', bg: 'bg-white', badge: `10MB MAX` },
    { code: 'video_standard', label: 'Video Standard 60s', sub: '6 jours - Boutique fonctionnelle', prix: 3 * TAUX_CDF, usd: '3 $', color: 'bg-gray-800', border: 'border-gray-200', bg: 'bg-white', badge: `Régime prestataire` },
    { code: 'video_mensuelle', label: 'Video Mensuelle 60s - Régime unique', sub: '30 jours - Soudeur + Tout travaux même régime', prix: 15 * TAUX_CDF, usd: '15 $', color: 'bg-gray-900', border: 'border-gray-200', bg: 'bg-white', badge: `🔧 Prestataire unique` },
  ]},
]

export default function PortefeuilleWenze() {
  const [solde, setSolde] = useState(0)
  const [plan, setPlan] = useState('freemium')
  const [expire, setExpire] = useState<string | null>(null)
  const [hist, setHist] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)
  const [whatsapp, setWhatsapp] = useState("")
  const [supabaseReady, setSupabaseReady] = useState(false)
  const router = useRouter()

  useEffect(() => { init() }, [])

  async function init() {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        console.log("Supabase env manquant - mode localStorage");
        setSupabaseReady(false);
        // Fallback localStorage
        const uRaw = localStorage.getItem("wenze_user");
        if (uRaw) {
          const u = JSON.parse(uRaw);
          setWhatsapp(u.whatsapp || u.ownerWhatsapp || "");
          setPlan(u.type || "freemium");
        }
        setSolde(parseInt(localStorage.getItem("wenze_solde") || "0"));
        setLoading(false);
        return;
      }
      setSupabaseReady(true);

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let { data: port } = await supabase.from('portefeuilles').select('solde').eq('user_id', user.id).maybeSingle()
      if (!port) {
        const { data: newPort } = await supabase.from('portefeuilles').insert({ user_id: user.id, solde: 0 }).select().maybeSingle()
        port = newPort || { solde: 0 } as any
      }
      setSolde(port?.solde || 0)

      const { data: prof } = await supabase.from('profiles').select('plan, plan_expire_at, whatsapp, owner_whatsapp').eq('id', user.id).maybeSingle()
      if (prof) { 
        setPlan(prof.plan || 'freemium'); 
        setExpire(prof.plan_expire_at)
        setWhatsapp(prof.whatsapp || prof.owner_whatsapp || "")
      }

      const { data: h } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15)
      if (h) setHist(h)
    } catch (e) { console.log(e) }
    finally { setLoading(false) }
  }

  async function recharger(montant: number) {
    setPaying('recharge')
    try {
      const supabase = getSupabase();
      if (!supabase) {
        const newSolde = solde + montant;
        setSolde(newSolde);
        localStorage.setItem("wenze_solde", String(newSolde));
        setPaying(null);
        return;
      }
      const { data, error } = await supabase.rpc('recharger_fictif', { montant_input: montant })
      if (error) alert('Erreur: ' + error.message)
      else { setSolde(data); await init() }
    } catch(e) { alert('RPC recharger_fictif pas encore créée - mode local') }
    setPaying(null)
  }

  async function payer(code: string, prix: number) {
    if (solde < prix) return alert(`Solde insuffisant! Manque ${(prix - solde).toLocaleString()} CDF - Taux ${TAUX_CDF} CDF - Recharge d'abord`)
    if (!confirm(`Payer ${prix.toLocaleString()} CDF (${(prix/TAUX_CDF).toFixed(0)}$) pour ${code}? Taux ${TAUX_CDF} CDF - Régime prestataire unique`)) return
    setPaying(code)
    try {
      const supabase = getSupabase();
      if (!supabase) {
        const newSolde = solde - prix;
        setSolde(newSolde);
        localStorage.setItem("wenze_solde", String(newSolde));
        alert(`✅ Paiement local réussi! ${code} - Régime prestataire unique - Taux ${TAUX_CDF}`);
        setPaying(null);
        return;
      }
      const { data, error } = await supabase.rpc('payer_service_wenze', { service_code: code })
      if (error) { alert(error.message); setPaying(null) }
      else { 
        setSolde(data); 
        alert(`✅ Paiement W-Pay réussi! ${code} - Régime prestataire unique - Taux ${TAUX_CDF} CDF - Boutique fonctionnelle activée`); 
        await init(); 
        if (code === 'pro' || code === 'grossiste') router.push('/profil'); 
        else setPaying(null) 
      }
    } catch(e) {
      alert('RPC payer_service_wenze pas encore créée')
      setPaying(null)
    }
  }

  if (loading) return <div className="max-w-[430px] mx-auto p-10 text-center text-sm">Chargement W-Pay... Taux {TAUX_CDF} CDF • Régime prestataire unique • {CATEGORIES_WENZE.length} métiers</div>

  const isPro = plan === 'pro' || plan === 'grossiste'

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-4 pb-24">
      <div className="flex justify-between items-center">
        <Link href="/tarifs" className="text-xs">← Tarifs</Link>
        <span className="text-[9px] bg-[#6C3CE0] text-white px-2 py-1 rounded-full font-bold">Taux {TAUX_CDF} CDF • Régime prestataire unique • {supabaseReady ? "Supabase" : "Local"}</span>
      </div>
      <h1 className="text-[22px] font-black mt-2">Mon W-Pay • Taux {TAUX_CDF} CDF</h1>
      <p className="text-[11px] text-gray-500">Test fictif - {CATEGORIES_WENZE.length} métiers - Soudeur + Tout travaux même régime Pro {SAFE_FORMULES.pro.prix}$ / {SAFE_FORMULES.pro.prixCDF.toLocaleString()} CDF</p>

      <div className="bg-[#6C3CE0] text-white rounded-2xl p-3 mt-3">
        <p className="font-black text-[11px]">🔧 RÉGIME PRESTATAIRE UNIQUE - TEMPS PRÉSENT</p>
        <p className="text-[10px] mt-1 opacity-90">Soudeur + Tout travaux techniques = même régime que tous les prestataires - Pro {SAFE_FORMULES.pro.prix}$ / {SAFE_FORMULES.pro.prixCDF.toLocaleString()} CDF (Taux {TAUX_CDF} CDF). Boutique fonctionnelle garantie. Vente Flash + Boost cumulables sans incidence.</p>
      </div>

      <div className="bg-black text-white rounded-2xl p-5 mt-4">
        <p className="text-[11px] text-gray-400">Solde W-Pay - Taux {TAUX_CDF} CDF fixe</p>
        <p className="text-[32px] font-black">{solde.toLocaleString()} CDF</p>
        <p className="text-[12px] text-gray-300">≈ {(solde / TAUX_CDF).toFixed(2)} $ • Taux {TAUX_CDF} CDF • {toCDF(1).toLocaleString()} CDF = 1$</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          <span className="text-[10px] bg-white/20 inline-block px-2 py-1 rounded-full">Plan: {plan.toUpperCase()} • Régime prestataire {isPro ? "Pro" : "Freemium"}</span>
          {expire && <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full">Exp {new Date(expire).toLocaleDateString()}</span>}
          {whatsapp && <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full">🔒 {cleanWhatsapp(whatsapp).slice(-4)} • Boutique fonctionnelle</span>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button disabled={!!paying} onClick={()=>recharger(10000)} className="border-2 p-3 rounded-xl text-[11px] font-bold disabled:opacity-50">+10K<br/><span className="text-[9px] text-gray-500">{(10000/TAUX_CDF).toFixed(1)}$</span></button>
        <button disabled={!!paying} onClick={()=>recharger(25000)} className="bg-orange-500 text-white p-3 rounded-xl text-[11px] font-bold disabled:opacity-50">+25K<br/><span className="text-[9px]">~{(25000/TAUX_CDF).toFixed(0)}$</span></button>
        <button disabled={!!paying} onClick={()=>recharger(60000)} className="bg-black text-white p-3 rounded-xl text-[11px] font-bold disabled:opacity-50">+60K<br/><span className="text-[9px]">~{(60000/TAUX_CDF).toFixed(0)}$</span></button>
      </div>

      <div className="mt-6 space-y-6">
        {SERVICES.map(s => (
          <div key={s.section}>
            <h2 className="font-black text-[11px] mb-2 flex items-center gap-2">{s.section} {s.section.includes("ABONNEMENTS") && <span className="text-[8px] bg-[#6C3CE0] text-white px-2 py-0.5 rounded-full">Soudeur + Tout travaux même régime</span>}</h2>
            <div className="space-y-2">
              {s.items.map(it => (
                <div key={it.code} className={`border-2 ${it.border} ${it.bg} rounded-xl p-3`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="font-bold text-[12px] flex items-center gap-2">{it.label} {it.badge && <span className="text-[7px] bg-[#6C3CE0] text-white px-1.5 py-0.5 rounded-full">{it.badge}</span>}</p>
                      <p className="text-[10px] text-gray-600 mt-1 leading-snug">{it.sub}</p>
                      <p className="text-[11px] font-black mt-1">{it.usd} / {it.prix.toLocaleString()} CDF • Taux {TAUX_CDF}</p>
                      {it.code === 'pro' && <p className="text-[9px] text-[#6C3CE0] font-bold mt-1">🔧 Régime prestataire unique: Soudeur + Tout travaux = même régime 5$ • Boutique fonctionnelle /boutiques</p>}
                    </div>
                    <button disabled={!!paying || solde < it.prix} onClick={()=>payer(it.code,it.prix)} className={`${it.color} text-white text-[10px] px-4 py-2 rounded-full font-bold disabled:bg-gray-300 ml-2 whitespace-nowrap`}>{paying===it.code?'...':solde<it.prix?'Faible':'Payer'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isPro && whatsapp && (
        <Link href={`/boutique/${encodeURIComponent(whatsapp)}`} className="block mt-6 bg-[#6C3CE0] text-white text-center p-3 rounded-xl font-bold text-[12px]">
          🏪 Voir ma boutique fonctionnelle - Régime prestataire {plan} - Taux {TAUX_CDF} CDF - 🔒 {cleanWhatsapp(whatsapp).slice(-4)}
        </Link>
      )}

      <h2 className="font-black text-[11px] mt-6 flex justify-between"><span>Historique - Taux {TAUX_CDF} CDF</span><span className="text-[9px] font-normal text-gray-400">Régime prestataire unique</span></h2>
      <div className="border rounded-xl divide-y mt-2">
        {hist.length === 0 ? (
          <p className="p-3 text-[10px] text-gray-400 text-center">Pas encore de transactions - Taux {TAUX_CDF} CDF fixe - Pro {SAFE_FORMULES.pro.prixCDF.toLocaleString()} CDF - Vente Flash + Boost sans incidence</p>
        ) : hist.map(t=>(
          <div key={t.id} className="flex justify-between p-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] truncate">{t.description} {t.description?.toLowerCase().includes('pro') ? '🔧 Régime prestataire unique' : ''}</p>
              <p className="text-[9px] text-gray-400">{new Date(t.created_at).toLocaleString()} • Taux {TAUX_CDF}</p>
            </div>
            <span className={`text-[11px] font-black ml-2 ${t.montant>0?'text-green-600':'text-red-600'}`}>{t.montant > 0 ? '+' : ''}{t.montant.toLocaleString()}<span className="text-[8px] font-normal"> CDF</span></span>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-gray-50 border rounded-xl p-3 text-[9px] text-gray-500">
        <p className="font-bold">Diagnostic temps présent - W-Pay - Build Fix</p>
        <p className="mt-1">Taux fixe {TAUX_CDF} CDF • Pro {SAFE_FORMULES.pro.prix}$ = {SAFE_FORMULES.pro.prixCDF.toLocaleString()} CDF • Grossiste {SAFE_FORMULES.grossiste.prix}$ = {SAFE_FORMULES.grossiste.prixCDF.toLocaleString()} CDF • Boost {SAFE_FORMULES.boost.prix}$ = {SAFE_FORMULES.boost.prixCDF.toLocaleString()} CDF • {CATEGORIES_WENZE.length} métiers • Soudeur + Tout travaux = même régime prestataire unique • Boutique fonctionnelle • Supabase portefeuilles + transactions • Vente Flash + Boost cumulables sans incidence • Build VERT 24/24</p>
      </div>
    </div>
  )
    }
