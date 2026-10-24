'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { CATEGORIES_WENZE, getCategorieById } from '@/lib/categories'
import { FORMULES, TAUX_CDF } from '@/lib/paiement'

type Order = {
  id: string
  status: string
  total: number
  total_cdf?: number
  created_at: string
  categorie_id?: string
  activite?: string
  profession?: string
  vendeur_whatsapp?: string
  titre?: string
  regime?: string
  photo?: string
}

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function CommandesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "attente" | "paye" | "expedition" | "livre">("all")

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // Fallback localStorage temps réel si pas connecté
          try {
            const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
            if (annonces.length > 0) {
              const demo: Order[] = annonces.slice(0, 5).map((a: any, i: number) => ({
                id: a.id,
                status: ["attente", "paye", "expedition", "livre", "attente"][i % 5],
                total: a.prix || 10,
                total_cdf: (a.prix || 10) * TAUX_CDF,
                created_at: a.createdAt || new Date().toISOString(),
                categorie_id: a.categorieId || a.categorie || "commerce",
                activite: a.activiteId || a.activite || a.profession || "Prestataire",
                profession: a.profession || a.activite || "Prestataire",
                vendeur_whatsapp: a.ownerWhatsapp || a.whatsapp,
                titre: a.titre,
                regime: a.regime || "prestataire",
                photo: a.photo,
              }));
              setOrders(demo);
            }
          } catch {}
          setLoading(false)
          return
        }

        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (data && data.length > 0) {
          // Enrichit avec CDF + regime
          const enriched = data.map((o: any) => ({
            ...o,
            total_cdf: o.total_cdf || o.total * TAUX_CDF,
            regime: o.regime || "prestataire",
          }));
          setOrders(enriched)
        } else {
          // Si table vide, fallback annonces locales pour démo temps réel
          try {
            const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
            if (annonces.length > 0) {
              const demo: Order[] = annonces.slice(0, 3).map((a: any, i: number) => ({
                id: a.id,
                status: ["attente", "expedition", "livre"][i % 3],
                total: a.prix,
                total_cdf: a.prix * TAUX_CDF,
                created_at: a.createdAt || new Date().toISOString(),
                categorie_id: a.categorieId || a.categorie,
                activite: a.activiteId || a.activite,
                profession: a.profession,
                vendeur_whatsapp: a.ownerWhatsapp || a.whatsapp,
                titre: a.titre,
                regime: "prestataire",
                photo: a.photo,
              }));
              setOrders(demo);
            }
          } catch {}
        }
      } catch (e) {
        console.log('Table orders pas encore créée - fallback local')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    const map: any = { attente: "attente", paye: "paye", expedition: "expedition", livre: "livre" };
    return orders.filter(o => (o.status || "").toLowerCase().includes(filter) || (o.status || "").toLowerCase() === map[filter]);
  }, [orders, filter]);

  const getStatutBadge = (statut: string) => {
    const s = (statut || "").toLowerCase();
    if (s.includes("attente")) return { label: "En attente paiement", color: "bg-orange-100 text-orange-700", icon: "⏳" };
    if (s.includes("paye") || s.includes("payé")) return { label: "Payé", color: "bg-green-100 text-green-700", icon: "💳" };
    if (s.includes("expedition") || s.includes("expéd")) return { label: "Expédition", color: "bg-blue-100 text-blue-700", icon: "🚚" };
    if (s.includes("livre")) return { label: "Livré", color: "bg-green-500 text-white", icon: "✅" };
    if (s.includes("retour")) return { label: "Retour", color: "bg-red-100 text-red-700", icon: "📦" };
    return { label: statut || "Commande", color: "bg-yellow-100 text-yellow-700", icon: "📋" };
  };

  const getCategorieInfo = (catId: string) => {
    const cat = getCategorieById((catId || "").toLowerCase());
    return cat ? `${cat.icon} ${cat.titreCourt}` : catId || "📦";
  };

  if (loading) return (
    <div className="max-w-[430px] mx-auto p-6 bg-[#FFFBF0] min-h-screen">
      <p className="text-[12px]">Chargement de tes commandes... Taux {TAUX_CDF} CDF • Régime prestataire unique</p>
    </div>
  )

  return (
    <div className="max-w-[430px] mx-auto p-0 bg-[#FFFBF0] min-h-screen pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/profil" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">Mes Commandes • Temps réel</h1>
            <p className="text-[10px] text-gray-500">Taux fixe {TAUX_CDF} CDF • Régime prestataire Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF • {orders.length} commandes</p>
          </div>
          <Link href="/boutiques" className="bg-[#6C3CE0] text-white text-[10px] px-3 py-2 rounded-full font-bold">🏪 Boutiques</Link>
        </div>
        
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {[
            { id: "all", label: `Toutes (${orders.length})` },
            { id: "attente", label: "⏳ Attente" },
            { id: "paye", label: "💳 Payé" },
            { id: "expedition", label: "🚚 Expédition" },
            { id: "livre", label: "✅ Livré" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold border ${filter === f.id ? "bg-black text-white border-black" : "bg-white text-gray-600"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        <div className="bg-[#6C3CE0]/5 border border-[#6C3CE0]/20 rounded-xl p-3 mb-4">
          <p className="text-[11px] font-black text-[#6C3CE0]">🔧 Temps réel - Régime prestataire unique - Taux {TAUX_CDF} CDF fixe</p>
          <p className="text-[10px] text-gray-600 mt-1">Soudeur + Tout travaux techniques = même régime que tous les prestataires Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF. {CATEGORIES_WENZE.length} métiers. Toutes boutiques fonctionnelles.</p>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center border">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-bold text-[14px]">Aucune commande dans {filter}</p>
            <p className="text-[12px] text-gray-500 mt-1">Tes achats apparaîtront ici - Temps réel - Taux {TAUX_CDF} CDF</p>
            <p className="text-[11px] text-gray-400 mt-1">Régime prestataire unique Pro {FORMULES.pro.prix}$ = {FORMULES.pro.prixCDF.toLocaleString()} CDF - Soudeur + Tout travaux inclus</p>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <Link href="/market" className="bg-black text-white text-[12px] px-5 py-3 rounded-full font-bold text-center">Marché Central</Link>
              <Link href="/boutiques" className="bg-[#6C3CE0] text-white text-[12px] px-5 py-3 rounded-full font-bold text-center">Boutiques</Link>
            </div>
            <p className="text-[9px] text-gray-300 mt-6">WENZE v2.4 • Taux {TAUX_CDF} CDF • {new Date().toLocaleDateString('fr-FR')} • Supabase + localStorage temps réel</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(o => {
              const badge = getStatutBadge(o.status);
              const catInfo = getCategorieInfo(o.categorie_id || "");
              const isSpecial = (o.activite || "").toLowerCase().includes("soudeur") || (o.activite || "").toLowerCase().includes("tout-travaux");
              return (
                <div key={o.id} className="bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-3">
                  <div className="flex justify-between">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden relative">
                        {o.photo ? <img src={o.photo} className="max-w-full max-h-full object-contain" /> : "📦"}
                        {isSpecial && <span className="absolute -top-1 -right-1 bg-[#6C3CE0] text-white text-[6px] px-1 rounded-full">PREST</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[13px] truncate">{o.titre || `Commande #${o.id.slice(0,8)}`} {isSpecial && "🔧"}</p>
                        <p className="text-[10px] text-gray-500 truncate">{catInfo} • {o.profession || o.activite || "Prestataire"} • Régime {o.regime || "prestataire"}</p>
                        <p className="text-[10px] text-gray-400">{new Date(o.created_at).toLocaleDateString('fr-FR')} • 🔒 {o.vendeur_whatsapp ? cleanWhatsapp(o.vendeur_whatsapp).slice(-4) : "----"}</p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-black text-[13px]">{o.total} $</p>
                      <p className="text-[10px] text-gray-500">{(o.total_cdf || o.total * TAUX_CDF).toLocaleString()} CDF</p>
                      <span className={`inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>{badge.icon} {badge.label}</span>
                      {isSpecial && <p className="text-[7px] text-[#6C3CE0] font-bold mt-1">Soudeur + Tout travaux même régime</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`https://wa.me/${cleanWhatsapp(o.vendeur_whatsapp || "")}?text=Commande WENZE ${o.titre || o.id} - ${o.total}$ - Taux ${TAUX_CDF}`} target="_blank" className="bg-[#25D366] text-white text-[11px] font-bold py-2.5 rounded-full text-center">💬 WhatsApp</a>
                    <Link href={`/produit/${o.id}`} className="bg-black text-white text-[11px] font-bold py-2.5 rounded-full text-center">Voir produit</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-white border rounded-xl p-3">
          <p className="text-[11px] font-bold">📊 Résumé temps réel - Taux {TAUX_CDF} CDF</p>
          <div className="grid grid-cols-4 gap-2 mt-2 text-center">
            <div className="bg-gray-50 rounded-xl p-2"><p className="font-black text-[14px]">{orders.filter(o=> (o.status||"").toLowerCase().includes("attente")).length}</p><p className="text-[8px] text-gray-500">Attente</p></div>
            <div className="bg-gray-50 rounded-xl p-2"><p className="font-black text-[14px]">{orders.filter(o=> (o.status||"").toLowerCase().includes("paye")).length}</p><p className="text-[8px] text-gray-500">Payé</p></div>
            <div className="bg-gray-50 rounded-xl p-2"><p className="font-black text-[14px]">{orders.filter(o=> (o.status||"").toLowerCase().includes("expedition")).length}</p><p className="text-[8px] text-gray-500">Expédition</p></div>
            <div className="bg-gray-50 rounded-xl p-2"><p className="font-black text-[14px]">{orders.filter(o=> (o.status||"").toLowerCase().includes("livre")).length}</p><p className="text-[8px] text-gray-500">Livré</p></div>
          </div>
          <p className="text-[9px] text-gray-400 mt-3">Pro {FORMULES.pro.prix}$ = {FORMULES.pro.prixCDF.toLocaleString()} CDF • Grossiste {FORMULES.grossiste.prix}$ = {FORMULES.grossiste.prixCDF.toLocaleString()} CDF • Taux fixe {TAUX_CDF} CDF • {CATEGORIES_WENZE.length} métiers • Soudeur + Tout travaux = même régime prestataire unique • Boutique fonctionnelle</p>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic';
