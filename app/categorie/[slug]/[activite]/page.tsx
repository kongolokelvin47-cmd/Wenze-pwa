"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { getCategorieById, getActiviteById, normalizeCategorie, getPrixByCategorie, CATEGORIES_WENZE, normalizeActivite } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");
function formatPrix(p:any){
  const usd = Number(p.prixUSD || p.prix || 0);
  if(usd===0) return "Prix sur demande";
  return `${usd}$ / ${toCDFString(usd)}`;
}

export default function ActivitePage() {
  const params = useParams();
  const rawCatId = (params.slug as string)?.toLowerCase();
  const rawActSlug = (params.activite as string)?.toLowerCase();
  
  const catId = normalizeCategorie(rawCatId);
  const actSlug = (normalizeActivite as any)?.(rawActSlug) || rawActSlug?.toLowerCase().replace(/[^a-z0-9-]/g,"-");
  
  const cat = getCategorieById(catId) || getCategorieById(rawCatId) || { id: catId, titre: catId, icone: "📦", groupe: "commerces-services" } as any;
  const act = cat ? (getActiviteById(cat.id, actSlug) || getActiviteById(cat.id, rawActSlug) || { id: actSlug, titre: actSlug, icone: "🔧" }) : null;
  
  const [allAnnonces, setAllAnnonces] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const allUsersRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : [];
      const userMap = new Map<string, any>();
      for(const u of allUsers){
        const wa = cleanWhatsapp(u.ownerWhatsapp||u.whatsapp||"");
        if(wa) userMap.set(wa, u);
      }

      let filtered = list.filter((a:any)=>{
        const aCat = normalizeCategorie(a.categorieId||a.categorie||"");
        const aAct = (a.activiteId||a.activite||a.subCategory||"").toString().toLowerCase();
        
        // V6: match catégorie
        if(aCat!==catId && normalizeCategorie(aCat)!==catId) return false;
        
        // V6: match activité si présente dans annonce
        if(actSlug && aAct){
          if(aAct!==actSlug && normalizeCategorie(aAct)!==actSlug && !aAct.includes(actSlug) && !actSlug.includes(aAct)){
            return false;
          }
        }
        // Si annonce n'a pas d'activité, on l'accepte quand même dans la catégorie (compat)
        return true;
      });

      // V6 CRITIQUE: Filtre comptes cachés
      try{
        const { isCompteCache, checkFreemiumWenze } = require("@/lib/paiement");
        filtered = filtered.filter((a:any)=>{
          const wa = cleanWhatsapp(a.ownerWhatsapp||a.whatsapp||a.userId||"");
          const user = userMap.get(wa) || { ownerWhatsapp: wa, whatsapp: wa, createdAt: a.createdAt, id: wa };
          if(typeof isCompteCache==="function" && isCompteCache(user)) return false;
          return true;
        });

        filtered = filtered.map((a:any)=>{
          try{
            const wa = cleanWhatsapp(a.ownerWhatsapp||a.whatsapp||a.userId||"");
            const user = userMap.get(wa) || { ownerWhatsapp: wa, whatsapp: wa, createdAt: a.createdAt, id: wa };
            const ab = checkFreemiumWenze(user, 0);
            return { ...a, _isPaye: !!ab.isPaye, _badge: ab.badge, _palierId: ab.palierId, _joursRestants: ab.joursRestants||0 };
          }catch{ return { ...a, _isPaye: false, _badge: "🆓" }; }
        });

        filtered.sort((a:any,b:any)=>{
          if(a._isPaye && !b._isPaye) return -1;
          if(!a._isPaye && b._isPaye) return 1;
          return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();
        });
      }catch{}

      setAllAnnonces(filtered);
    }catch(e){ console.error("activite page V6 error", e); }
  },[catId, actSlug, rawCatId, rawActSlug]);

  const filteredSearch = useMemo(()=>{
    if(!search.trim()) return allAnnonces;
    const q = search.toLowerCase();
    return allAnnonces.filter((a:any)=>
      (a.titre||a.title||"").toLowerCase().includes(q) ||
      (a.description||"").toLowerCase().includes(q)
    );
  },[allAnnonces, search]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 bg-white border-b p-3">
        <div className="flex items-center gap-2">
          <Link href={`/categorie/${catId}`} className="p-2 rounded-full bg-gray-100">←</Link>
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">{(act as any)?.icone||(cat as any).icone||"🔧"}</div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate">{(act as any)?.titre||actSlug} - {cat.titre||catId} V6</h1>
            <p className="text-[11px] text-gray-500 truncate">{(act as any)?.description||`Activité ${actSlug} dans ${cat.titre} - ${allAnnonces.length} visibles (cachés filtrés) - Même prix`}</p>
          </div>
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full">{allAnnonces.length} visibles</span>
        </div>
        <div className="flex gap-2 mt-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Recherche dans ${act?.titre||actSlug}...`} className="flex-1 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
          <Link href="/publier" className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold">+ Publier</Link>
        </div>
        <div className="mt-2 text-[10px] text-gray-500 bg-blue-50 p-2 rounded-xl">
          V6 FIX Double Slug: rawCat `{rawCatId}` → `{catId}` + rawAct `{rawActSlug}` → `{actSlug}` | {cat.titre} › {act?.titre||actSlug} | <b>Même prix pour tous</b> - STANDARD 5$ 4 places strictes / PRO 10$ 10 places / PREMIUM 20$ 30 places - 1 ticket = X places sur Y jours - Cumulable - Max 50 - Taux {TAUX_CDF} - Comptes cachés 🔒 filtrés - Tri payés d'abord
        </div>
        <div className="flex gap-1.5 mt-2 overflow-x-auto text-[10px]">
          <Link href="/" className="bg-gray-100 px-2 py-1 rounded-full">Accueil</Link>
          <span className="py-1">›</span>
          <Link href="/categorie" className="bg-gray-100 px-2 py-1 rounded-full">Catégories</Link>
          <span className="py-1">›</span>
          <Link href={`/categorie/${catId}`} className="bg-gray-100 px-2 py-1 rounded-full">{cat.titre||catId}</Link>
          <span className="py-1">›</span>
          <span className="bg-black text-white px-2 py-1 rounded-full">{act?.titre||actSlug}</span>
        </div>
      </div>

      <div className="p-3 grid grid-cols-2 gap-3">
        {filteredSearch.map((a:any)=>(
          <Link key={a.id||a.annonceId} href={`/produit/${a.id||a.annonceId}`} className="bg-white rounded-2xl border overflow-hidden hover:shadow-md transition">
            <div className="aspect-square bg-gray-100 relative">
              {a.images?.[0] ? <img src={a.images[0]} alt={a.titre||a.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Pas d'image</div>}
              <div className="absolute top-1.5 left-1.5 flex gap-1">
                <span className="text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded-full backdrop-blur">{a._badge||"🆓"} {a._palierId||""}</span>
                {a._isPaye && <span className="text-[9px] bg-green-500 text-white px-1 py-0.5 rounded-full">{a._joursRestants}j</span>}
              </div>
            </div>
            <div className="p-2">
              <div className="font-bold text-xs line-clamp-2">{a.titre||a.title||"Produit"}</div>
              <div className="text-[11px] text-orange-600 font-bold mt-1">{formatPrix(a)}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{cleanWhatsapp(a.ownerWhatsapp||a.whatsapp||"").slice(-9)} • {a._badge} {a._palierId||""}</div>
            </div>
          </Link>
        ))}
      </div>

      {filteredSearch.length===0 && (
        <div className="text-center py-10 p-4">
          <div className="text-4xl mb-2">🔍</div>
          <div className="text-sm font-bold">Aucune annonce dans {act?.titre||actSlug} / {cat.titre||catId}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            V6 Double Slug Fix: rawCat `{rawCatId}` → `{catId}` + rawAct `{rawActSlug}` → `{actSlug}`<br/>
            Anciens liens technique/commerce/beaute → commerces-services, agro → gros-autres<br/>
            Comptes cachés 🔒 filtrés - Sois le premier - STANDARD 5$ = 4 places strictes sur 7j - Même prix Détail/Gros/Presta
          </div>
          <Link href="/publier" className="inline-block mt-4 bg-black text-white px-6 py-2.5 rounded-xl text-sm font-bold">Publier dans {act?.titre||actSlug} - 0.2$/j OCC</Link>
        </div>
      )}
    </div>
  );
                                           }
