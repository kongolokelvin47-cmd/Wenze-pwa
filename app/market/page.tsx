'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { TAUX_CDF, toCDFString, isCompteCache, checkFreemiumWenze, PALIERS } from '@/lib/paiement'
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from '@/lib/categories'

type Product = {
  id: string; titre: string; title?: string; name?: string;
  prix: number; prixUSD?: number; price?: number;
  categorieId: string; categorieTitre?: string;
  photo?: string; images?: string[]; user?: string;
  ownerWhatsapp?: string; whatsapp?: string; userId?: string; createdAt?: string;
  _isPaye?: boolean; _badge?: string; _palierId?: string; _jours?: number;
}
function cleanWa(n:string){ return (n||"").toString().replace(/[^0-9]/g,""); }
function formatPrix(p:any){
  const usd = Number(p.prixUSD||p.prix||p.price)||0;
  if(usd===0) return "Prix sur demande";
  return `${usd}$ / ${toCDFString(usd)}`;
}

export default function MarketPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState<"all"|"commerces-services"|"gros-autres">("all")

  useEffect(()=>{
    try{
      const raw = localStorage.getItem("wenze_annonces_list");
      const list = raw ? JSON.parse(raw) : [];
      const allUsers = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
      const userMap = new Map<string,any>();
      for(const u of allUsers){ const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||""); if(wa) userMap.set(wa,u); }

      let prods: Product[] = list.map((a:any)=>({
        id: a.id||a.annonceId, titre: a.titre||a.title||a.name||"Produit", title: a.title, name: a.name,
        prix: Number(a.prixUSD||a.prix||a.price||0), prixUSD: Number(a.prixUSD||a.prix||a.price||0), price: a.price,
        categorieId: normalizeCategorie(a.categorieId||a.categorie||"commerces-services"),
        categorieTitre: a.categorieTitre, photo: a.images?.[0]||a.photo, images: a.images, user: a.user||a.nomBoutique,
        ownerWhatsapp: a.ownerWhatsapp||a.whatsapp||a.userId, whatsapp: a.whatsapp||a.ownerWhatsapp, userId: a.userId, createdAt: a.createdAt,
      }));

      // POLITIQUE ÉCONOMIQUE NOUVELLE V6 - Filtre + enrichissement
      const final = prods.filter((p)=>{
        const wa=cleanWa(p.ownerWhatsapp||p.whatsapp||p.userId||"");
        const user=userMap.get(wa)||{ ownerWhatsapp:wa, whatsapp:wa, createdAt:p.createdAt, id:wa };
        try{ if(isCompteCache(user)) return false; }catch{} return true;
      }).map((p)=>{
        try{
          const wa=cleanWa(p.ownerWhatsapp||p.whatsapp||p.userId||"");
          const user=userMap.get(wa)||{ ownerWhatsapp:wa, createdAt:p.createdAt, id:wa };
          const ab=checkFreemiumWenze(user,0);
          return { ...p, _isPaye:!!ab.isPaye, _badge:ab.badge, _palierId:ab.palierId, _jours:ab.joursRestants||0 };
        }catch{ return { ...p, _isPaye:false, _badge:"🆓", _palierId:"", _jours:0 }; }
      }).sort((a:any,b:any)=>{
        if(a._isPaye&&!b._isPaye) return -1;
        if(!a._isPaye&&b._isPaye) return 1;
        if(a._isPaye&&b._isPaye){ const o:any={PREMIUM:3,PRO:2,STANDARD:1,OCC:0}; return (o[b._palierId]||0)-(o[a._palierId]||0); }
        return new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime();
      });

      setProducts(final);
    }catch(e){ console.log("Market V6",e); } finally{ setLoading(false); }
  },[]);

  const filtered = useMemo(()=>{
    let list=products;
    if(filterCat!=="all"){
      list=list.filter(p=>{
        const cat=normalizeCategorie(p.categorieId);
        const obj=getCategorieById(cat) as any;
        if(filterCat==="commerces-services") return obj?.groupe==="commerces-services"||!cat.includes("gros");
        if(filterCat==="gros-autres") return obj?.groupe==="gros-autres"||cat.includes("gros");
        return true;
      });
    }
    if(!search.trim()) return list;
    const q=search.toLowerCase(); const qWa=cleanWa(q);
    return list.filter(p=> (p.titre||p.title||p.name||"").toLowerCase().includes(q) || (p.categorieTitre||"").toLowerCase().includes(q) || (p.user||"").toLowerCase().includes(q) || (qWa&&cleanWa(p.ownerWhatsapp||"").includes(qWa)));
  },[products,search,filterCat]);

  const totalCommerces = products.filter(p=>{ const c=normalizeCategorie(p.categorieId); const o=getCategorieById(c) as any; return o?.groupe==="commerces-services"||!c.includes("gros"); }).length;
  const totalGros = products.filter(p=>{ const c=normalizeCategorie(p.categorieId); const o=getCategorieById(c) as any; return o?.groupe==="gros-autres"||c.includes("gros"); }).length;

  if(loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Chargement Marché V6 - Taux {TAUX_CDF} - Comptes cachés filtrés - Même prix pour tous...</p></div>;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">Marché • Politique Nouvelle V6</h1>
            <p className="text-[10px] text-gray-500">🛍️ {totalCommerces} Détail • 🏭 {totalGros} Gros • {products.length} visibles • Taux {TAUX_CDF} • 0% comm • Max 50</p>
          </div>
          <Link href="/publier" className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-black">+</Link>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Recherche: produit, boutique, WA..." className="w-full bg-gray-100 rounded-2xl py-3.5 px-5 pl-11 text-sm outline-none focus:ring-2 focus:ring-black" />
          <span className="absolute left-4 top-3.5">🔍</span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          <button onClick={()=>setFilterCat("all")} className={`whitespace-nowrap py-2.5 px-5 rounded-full font-black text-[11px] border-2 ${filterCat==="all"?"bg-black text-white border-black":"bg-white border-gray-200"}`}>Tous • {products.length}</button>
          <button onClick={()=>setFilterCat("commerces-services")} className={`whitespace-nowrap py-2.5 px-5 rounded-full font-black text-[11px] border-2 ${filterCat==="commerces-services"?"bg-black text-white border-black":"bg-white border-gray-200"}`}>🛍️ Détail/Services • {totalCommerces}</button>
          <button onClick={()=>setFilterCat("gros-autres")} className={`whitespace-nowrap py-2.5 px-5 rounded-full font-black text-[11px] border-2 ${filterCat==="gros-autres"?"bg-black text-white border-black":"bg-white border-gray-200"}`}>🏭 Gros/Dépôt • {totalGros}</button>
        </div>
        <div className="mt-3 bg-black text-white rounded-xl p-2.5 flex justify-between items-center">
          <div><p className="font-black text-[11px]">POLITIQUE NOUVELLE V6 - Même prix pour tous</p><p className="text-[9px] opacity-70 leading-tight mt-0.5">On vend VISIBILITÉ, pas catégorie - 1 ticket = X places strictes sur Y jours - Pas X/j - Cumulable - Max 50 actives - Suppression libère place - 🆓 Freemium 3 images à vie 30j puis caché 🔒</p></div>
          <span className="bg-white text-black text-[9px] px-2 py-1 rounded-full font-black whitespace-nowrap">{TAUX_CDF}</span>
        </div>
      </header>

      <div className="p-3">
        <div className="bg-white border rounded-2xl p-3 flex gap-2 text-[9px]">
          {Object.entries(PALIERS).map(([k,v]:any)=><div key={k} className="flex-1 text-center"><div className="font-black">{v.badge} {k}</div><div className="text-gray-500">{v.prixUSD}$</div><div className="text-[8px]">{v.places} places/{v.jours}j</div></div>)}
        </div>

        {filtered.length===0 ? (
          <div className="mt-6 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">🏪</p>
            <p className="font-black mt-2 text-[13px]">{search?`Pas de résultat pour "${search}"`:"Marché vide - Sois le premier!"}</p>
            <p className="text-[11px] text-gray-500 mt-1">V6: Comptes cachés filtrés - Publie → visible immédiatement - Même prix Détail/Gros</p>
            <Link href="/publier" className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]">Publier - ⭐ 5$ ({toCDFString(5)}) - 0.2$/j</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {filtered.map((p)=>{
              const catId=normalizeCategorie(p.categorieId);
              const catObj=getCategorieById(catId) as any;
              return (
                <div key={p.id} className="border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition">
                  <Link href={`/produit/${p.id}`} className="block w-full aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden relative">
                    {p.photo||p.images?.[0]?<img src={p.photo||p.images?.[0]} alt={p.titre} className="max-w-full max-h-full object-cover w-full h-full"/>:<span className="text-3xl">{catObj?.icon||"🏪"}</span>}
                    <span className="absolute top-2 left-2 text-[8px] bg-black/70 text-white px-2 py-1 rounded-full backdrop-blur">{p._badge} {p._palierId}{p._isPaye?` • ${p._jours}j`:""}</span>
                    <span className="absolute bottom-2 left-2 text-[8px] bg-white/90 px-2 py-0.5 rounded-full">{catObj?.icon} {catObj?.titreCourt||catId}</span>
                  </Link>
                  <div className="p-2.5">
                    <p className="font-bold text-black text-[12px] truncate">{p.titre||p.name}</p>
                    <p className="text-[12px] font-black text-orange-600">{formatPrix(p)}</p>
                    <p className="text-[9px] text-gray-400 truncate">{p.user||"Boutique"} • {cleanWa(p.ownerWhatsapp||"").slice(-9)}</p>
                    <a href={`https://wa.me/${cleanWa(p.ownerWhatsapp||"")}?text=${encodeURIComponent(`Bonjour ${p.user||"Boutique"} 👋 WENZE Market V6 - "${p.titre}" à ${formatPrix(p)} - Taux ${TAUX_CDF} - Même prix Détail/Gros`)}`} target="_blank" className="mt-2 w-full bg-[#25D366] text-white text-[11px] font-black py-2.5 rounded-full flex justify-center">💬 WhatsApp</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">Catégories WENZE - Même ticket pour toutes</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            {CATEGORIES_WENZE.slice(0,6).map((c:any)=>(
              <Link key={c.id} href={`/categorie/${c.id}`} className="p-3 rounded-xl border bg-gray-50 hover:bg-black hover:text-white transition">
                <p className="font-black text-[12px]">{c.icon} {c.titreCourt||c.titre}</p>
                <p className="opacity-70 mt-1 text-[9px]">{c.description}</p>
              </Link>
            ))}
          </div>
          <p className="text-[9px] text-gray-400 mt-3">Politique: Plus de différence prix par catégorie. On vend visibilité: 4 places strictes sur 7j (5$), 10 places sur 15j (10$), 30 places sur 30j (20$). Max 50 actives. Suppression libère place immédiatement. 0% commission.</p>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="font-black text-black flex flex-col items-center gap-0.5"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">+</span>Vendre</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
}
export const dynamic = 'force-dynamic';
