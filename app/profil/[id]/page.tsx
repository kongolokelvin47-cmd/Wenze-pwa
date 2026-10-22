'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProfilVendeurPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [vendor, setVendor] = useState<any>(null)
  const [produits, setProduits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const supabase = createClient()
        // FIX: ta table c'est profiles, pas vendors
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
        
        if (prof) {
          setVendor(prof)
          // Charge ses produits
          const { data: prods } = await supabase.from('produits').select('*').eq('vendeur_id', id).order('created_at', { ascending: false })
          setProduits(prods || [])
        } else {
          // Fallback localStorage
          const all = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]")
          const localV = all.find((a:any) => a.id === id || a.vendeur_id === id)
          if (localV) setVendor({ nom: localV.vendeur_nom, telephone: localV.whatsapp, commune: localV.commune })
        }
      } catch (e) {
        console.log('Vendeur pas en base')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <div className="max-w-[430px] mx-auto p-10 text-center">Chargement vendeur...</div>
  
  if (!vendor) return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-6 text-center">
      <p className="mt-20">Vendeur introuvable</p>
      <p className="text-xs text-gray-400">ID: {id}</p>
      <button onClick={() => router.push('/')} className="mt-4 bg-black text-white px-6 py-2 rounded-full">← Accueil</button>
    </div>
  )

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-gray-50 p-5 pb-20">
      <button onClick={() => router.push('/')} className="bg-black text-white w-10 h-10 rounded-full">←</button>
      
      <div className="mt-4 bg-white p-4 rounded-2xl border">
        <h1 className="text-xl font-black">👤 {vendor.nom}</h1>
        <p className="text-xs text-gray-600">{vendor.telephone || vendor.whatsapp} • {vendor.commune}</p>
        <span className="text-[9px] bg-black text-white px-2 py-1 rounded-full mt-2 inline-block">{(vendor.type || 'VENDEUR').toUpperCase()}</span>
      </div>

      <h2 className="font-black text-sm mt-6">📦 Ses produits ({produits.length})</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {produits.map(p => (
          <Link key={p.id} href={`/produit/${p.id}`} className="bg-white border p-2 rounded-xl">
            <img src={p.image_url || p.photo || 'https://via.placeholder.com/150'} className="w-full h-24 object-contain"/>
            <p className="text-xs truncate mt-1">{p.nom || p.titre}</p>
            <p className="font-bold text-sm">{p.prix}$</p>
          </Link>
        ))}
        {produits.length === 0 && <p className="text-xs text-gray-400 col-span-2">Aucun produit encore</p>}
      </div>

      <a href={`https://wa.me/${vendor.telephone || vendor.whatsapp}`} className="mt-6 block bg-green-500 text-white p-3 rounded-full text-center font-bold">Contacter sur WhatsApp</a>
    </div>
  )
}
