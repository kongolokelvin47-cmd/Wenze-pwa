"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie } from "@/lib/categories"
import { TAUX_CDF, toCDF } from "@/lib/paiement"

export const dynamic = 'force-dynamic';

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

type Transaction = {
  id: string
  type: "vente" | "abonnement" | "retrait" | "commission"
  montant: number
  montantCDF: number
  date: string
  statut: "paye" | "attente" | "retire"
  titre?: string
  boutique?: string
}

export default function PortefeuillePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wenze_user")
      if(!raw){ router.push("/connexion?next=/portefeuille"); return; }
      const u = JSON.parse(raw)
      const fixedCat = normalizeCategorie(u.categorieId || u.categorie || "commerces-services")
      const catObj = getCategorieById(fixedCat)
      const prixInfo = catObj ? getPrixByCategorie(catObj.id) : { prixUSD: 5, prixCDF: 11500 }
      setUser({ ...u, categorieId: fixedCat, prixUSD: prixInfo.prixUSD, prixCDF: prixInfo.prixCDF, catObj })

      // Calcul transactions depuis commandes + annonces
      const cmds = JSON.parse(localStorage.getItem("wenze_commandes_list") || "[]")
      const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]")
      
      const myWa = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp || "")
      const mySales = cmds.filter((c:any)=> cleanWhatsapp(c.vendeur_whatsapp || c.ownerWhatsapp || "") === myWa)

      const trans: Transaction[] = []

      // Ventes
      for(const s of mySales){
        trans.push({
          id: `VENTE-${s.id}`,
          type: "vente",
          montant: Number(s.total||s.prix||0),
          montantCDF: toCDF(Number(s.total||s.prix||0)),
          date: s.created_at || s.createdAt || new Date().toISOString(),
          statut: s.status==="paye" ? "paye" : "attente",
          titre: s.titre || "Vente WENZE",
          boutique: catObj?.titreCourt || fixedCat,
        })
      }

      // Abonnement
      if(u.abonnementPaye || u.prixUSD){
        trans.push({
          id: `ABO-${u.id||myWa}`,
          type: "abonnement",
          montant: -(u.prixUSD || prixInfo.prixUSD),
          montantCDF: -(u.prixCDF || prixInfo.prixCDF),
          date: u.abonnementDate || u.createdAt || new Date().toISOString(),
          statut: "paye",
          titre: `Abonnement ${catObj?.titre || fixedCat} ${prixInfo.prixUSD}$`,
          boutique: catObj?.titre || fixedCat,
        })
      }

      // Si vide, exemple demo
      if(trans.length===0){
        trans.push({
          id: "DEMO-1",
          type: "vente",
          montant: 0,
          montantCDF: 0,
          date: new Date().toISOString(),
          statut: "attente",
          titre: "Aucune vente encore - Publie 1 annonce",
          boutique: catObj?.titreCourt || "WENZE",
        })
      }

      setTransactions(trans.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()))
    } catch(e){
      console.log(e)
    } finally {
      setLoading(false)
    }
  }, [router])

  const stats = useMemo(()=>{
    const totalVentes = transactions.filter(t=> t.type==="vente" && t.statut!=="retire").reduce((s,t)=> s + Math.max(0,t.montant), 0)
    const totalAbo = transactions.filter(t=> t.type==="abonnement").reduce((s,t)=> s + Math.abs(t.montant), 0)
    const solde = transactions.filter(t=> t.type==="vente").reduce((s,t)=> s + t.montant, 0)
    const aRetirer = transactions.filter(t=> t.type==="vente" && t.statut==="paye").reduce((s,t)=> s + t.montant, 0)
    return { totalVentes, totalAbo, solde, aRetirer, count: transactions.filter(t=> t.type==="vente" && t.montant>0).length }
  }, [transactions])

  if(loading){
    return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Portefeuille WENZE 2.0... Taux {TAUX_CDF}</p></div>
  }

  const cat = user?.catObj
  const isGros = user?.categorieId === "gros-autres"

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/profil" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-[16px]">Portefeuille</h1>
          <p className="text-[10px] text-gray-500">{user?.nom || user?.nomEtablissement} • {cat?.icon} {cat?.titre || user?.categorieId} • {user?.prixUSD}$ / {user?.prixCDF?.toLocaleString()} CDF • Taux {TAUX_CDF}</p>
        </div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-black ${isGros ? "bg-black text-white" : "bg-[#6C3CE0] text-white"}`}>{user?.prixUSD}$</span>
      </header>

      <div className="p-4 space-y-4">
        {/* SOLDE */}
        <div className={`rounded-2xl p-5 text-white ${isGros ? "bg-black" : "bg-[#6C3CE0]"}`}>
          <p className="text-[11px] opacity-70">Solde disponible - 0% commission WENZE</p>
          <p className="font-black text-[28px] mt-1">{stats.solde}$ <span className="text-[14px] opacity-80">/ {toCDF(stats.solde).toLocaleString()} CDF</span></p>
          <p className="text-[10px] opacity-60 mt-1">Total ventes: {stats.totalVentes}$ • {stats.count} ventes • Abonnement: {stats.totalAbo}$ • Taux fixe {TAUX_CDF}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={`https://wa.me/${cleanWhatsapp(user?.ownerWhatsapp || "")}?text=${encodeURIComponent(`Bonjour WENZE 👋 Retrait portefeuille ${stats.aRetirer}$ / ${toCDF(stats.aRetirer).toLocaleString()} CDF - Boutique ${user?.nomEtablissement || user?.nom} - Taux ${TAUX_CDF}`)}`} target="_blank" className="bg-[#25D366] text-white text-center py-3 rounded-full font-black text-[12px]">💰 Retirer {stats.aRetirer}$</a>
            <Link href="/publier" className="bg-white text-black text-center py-3 rounded-full font-black text-[12px]">➕ Vendre</Link>
          </div>
        </div>

        {/* ABONNEMENT */}
        <div className="bg-white border-2 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-black text-[13px]">Abonnement WENZE 2.0</p>
              <p className="text-[11px] text-gray-600 mt-1">{cat?.icon} {cat?.titre} - {cat?.description}</p>
              <p className="text-[10px] text-gray-400 mt-1">{cat?.id==="commerces-services" ? "Électricité, maçon, soudeur, plombier, coiffure = 5$ même régime" : "Grossiste, import, production = 10$"}</p>
            </div>
            <span className={`text-[11px] px-3 py-1 rounded-full font-black ${isGros ? "bg-black text-white" : "bg-[#6C3CE0] text-white"}`}>{user?.prixUSD}$ / {user?.prixCDF?.toLocaleString()} CDF</span>
          </div>
          <div className="mt-3 flex gap-2">
            <Link href={`/abonnement?cat=${user?.categorieId}`} className="flex-1 bg-black text-white text-center py-2.5 rounded-full font-bold text-[11px]">Payer {user?.prixUSD}$</Link>
            <Link href="/categories" className="flex-1 bg-white border text-center py-2.5 rounded-full font-bold text-[11px]">Changer catégorie</Link>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border rounded-xl p-3 text-center"><p className="font-black text-[16px]">{stats.count}</p><p className="text-[9px] text-gray-500">Ventes</p></div>
          <div className="bg-white border rounded-xl p-3 text-center"><p className="font-black text-[16px]">{stats.totalVentes}$</p><p className="text-[9px] text-gray-500">Chiffre</p></div>
          <div className="bg-white border rounded-xl p-3 text-center"><p className="font-black text-[16px]">{toCDF(stats.totalVentes).toLocaleString()}</p><p className="text-[9px] text-gray-500">CDF Taux {TAUX_CDF}</p></div>
        </div>

        {/* TRANSACTIONS */}
        <div className="bg-white border rounded-2xl p-3">
          <p className="font-black text-[12px]">Transactions • {transactions.length}</p>
          <div className="mt-3 grid gap-2">
            {transactions.map(t=> (
              <div key={t.id} className="flex gap-3 border rounded-xl p-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] ${t.type==="vente" ? "bg-green-50" : t.type==="abonnement" ? "bg-red-50" : "bg-gray-50"}`}>{t.type==="vente" ? "💰" : t.type==="abonnement" ? "🏬" : "📤"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between"><p className="font-bold text-[12px] truncate">{t.titre}</p><p className={`font-black text-[12px] ${t.montant<0?"text-red-600":"text-[#6C3CE0]"}`}>{t.montant>0?"+":""}{t.montant}$</p></div>
                  <p className="text-[10px] text-gray-500">{new Date(t.date).toLocaleDateString("fr-FR")} • {t.boutique} • {t.montantCDF.toLocaleString()} CDF • {t.statut}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#6C3CE0] text-white rounded-2xl p-4">
          <p className="font-black text-[11px]">WENZE 2.0 - Portefeuille PRO</p>
          <ul className="text-[10px] opacity-80 mt-2 list-disc ml-4 space-y-1">
            <li>Calcul depuis <b>wenze_commandes_list</b> filtré par ton WhatsApp {cleanWhatsapp(user?.ownerWhatsapp || "")}</li>
            <li>Abonnement: {user?.prixUSD}$ / {user?.prixCDF?.toLocaleString()} CDF - Taux fixe {TAUX_CDF} - 0% commission</li>
            <li>Retrait via WhatsApp support WENZE - Pas de FORMULES ancien</li>
          </ul>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/portefeuille" className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">💼</span>Portefeuille</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
      }
