"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { getCategorieById, normalizeCategorie, getPrixByCategorie, CATEGORIES_WENZE } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString, PALIERS } from "@/lib/paiement";

function cleanWa(n: string){ return (n||"").toString().replace(/[^0-9]/g,""); }
function formatPrix(p:any){
  // V6: prix produit, pas prix ticket - p.prix = prix du produit du vendeur
  const usd = Number(p.prixUSD || p.prix || 0);
  if(usd===0) return "Prix sur demande";
  return `${usd}$ / ${toCDFString(usd)}`;
}

export default function CategorieSlugPage() {
  const params = useParams();
  const rawSlug = (params.slug as string)?.toLowerCase();
  const slug = normalizeCategorie(rawSlug);
  const cat = getCategorieById(slug) || getCategorieById(rawSlug) || { id: slug, titre: slug, description: `Catégorie ${slug} - Même prix pour tous`, icone: "📦", groupe: "commerces-services" } as any;
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const allUsersRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : [];
      const userMap = new Map<string, any>();
      for(const u of allUsers){
        const wa = cleanWa(u.ownerWhatsapp||u.whatsapp||"");
        if(wa) userMap.set(wa, u);
      }

      let filtered = list.filter((a:any)=>{
        const catId = normalizeCategorie(a.categorieId||a.categorie||"");
        // V6 FIX slug: soudeur/commerce -> commerces-services, gros -> gros-autres etc
        if(catId!==slug && normalizeCategorie(catId)!==slug){
          // Check si appartient au même groupe
          const aCat = getCategorieById(catId);
          const targetCat = getCategorieById(slug);
          if(aCat && targetCat){
            const aGroupe = (aCat as any).groupe;
            const tGroupe = (targetCat as any).groupe;
            if(aGroupe && tGroupe && aGroupe!==tGroupe && catId!==slug) {
              // Si slug est un groupe, accepte tout du groupe
              if(slug==="commerces-services" || slug==="gros-autres"){
                if(aGroupe!==slug && catId!==slug) return false;
              } else {
                return false;
              }
            }
          } else if(catId!==slug) {
            return false;
          }
        }
        return true;
      });

      // V6 CRITIQUE: Filtre comptes cachés
      try{
        const { isCompteCache, checkFreemiumWenze } = require("@/lib/paiement");
        filtered = filtered.filter((a:any)=>{
          const wa = cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId||"");
          const user = userMap.get(wa) || { ownerWhatsapp: wa, whatsapp: wa, createdAt: a.createdAt, id: wa };
          if(typeof isCompteCache==="function" && isCompteCache(user)) return false;
          return true;
        });

        // Enrichir avec abonnement pour tri payés d'abord
        filtered = filtered.map((a:any)=>{
          try{
            const wa = cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId||"");
            const user = userMap.get(wa) || { ownerWhatsapp: wa, whatsapp: wa, createdAt: a.createdAt, id: wa };
            const ab = checkFreemiumWenze(user, 0);
            return { ...a, _isPaye: !!ab.isPaye, _badge: ab.badge, _palierId: ab.palierId, _joursRestants: ab.joursRestants||0, _isFreemium: !!ab.isFreemium };
          }catch{ return { ...a, _isPaye: false, _badge: "🆓" }; }
        });

        // Tri V6 business: Payés d'abord (PREMIUM > PRO > STANDARD) puis récents
        filtered.sort((a:any,b:any)=>{
          if(a._isPaye && !b._isPaye) return -1;
          if(!a._isPaye && b._isPaye) return 1;
          if(a._isPaye && b._isPaye){
            const order: any = { PREMIUM:3, PRO:2, STANDARD:1 };
            const ao = order[a._palierId]||0;
            const bo = order[b._palierId]||0;
            if(ao!==bo) return bo-ao;
          }
          return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();
        });

      }catch{}

      setAnnonces(filtered);
    }catch(e){ console.error("slug page V6 error", e); }
  },[slug, rawSlug]);

  const filteredSearch = useMemo(()=>{
    if(!search.trim()) return annonces;
    const q = search.toLowerCase();
    return annonces.filter((a:any)=>
      (a.titre||a.title||"").toLowerCase().includes(q) ||
      (a.description||"").toLowerCase().includes(q) ||
      cleanWa(a.ownerWhatsapp||a.whatsapp||"").includes(cleanWa(q))
    );
  },[annonces, search]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 bg-white border-b p-3">
        <div className="flex items-center gap-2">
          <Link href="/categorie" className="p-2 rounded-full bg-gray-100">←</Link>
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl">{(cat as any).icone||"📦"}</div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate">{(cat as any).titre||slug} - V6 Même prix</h1>
            <p className="text-[11px] text-gray-500 truncate">{(cat as any).description||`Catégorie ${slug} - ${annonces.length} annonces visibles (cachés filtrés)`}</p>
          </div>
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full">{annonces.length} visibles</span>
        </div>
        <div className="mt-3 flex gap-2">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Recherche dans ${cat.titre||slug}... V6`} className="flex-1 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
          <Link href="/publier" className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold">+ Publier</Link>
        </div>
        <div className="mt-2 text-[10px] text-gray-500 bg-orange-50 p-2 rounded-xl">
          V6: <b>Même prix pour tous</b> - Cette catégorie ne change pas le prix ticket - STANDARD 5$ (4 places strictes sur 7j) / PRO 10$ (10 places) / PREMIUM 20$ (30 places) - 1 ticket = X places sur Y jours (pas X/j) - Cumulable - Suppression libère place - Max 50 - Taux {TAUX_CDF} - Comptes cachés 🔒 filtrés - Tri payés d'abord ⭐🚀👑
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
              {a._isPaye && <div className="absolute bottom-1 right-1 text-[8px] bg-white/90 px-1 rounded">⭐ Payé</div>}
            </div>
            <div className="p-2">
              <div className="font-bold text-xs line-clamp-2">{a.titre||a.title||"Produit"}</div>
              <div className="text-[11px] text-orange-600 font-bold mt-1">{formatPrix(a)}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{cleanWa(a.ownerWhatsapp||a.whatsapp||"").slice(-9)} • {new Date(a.createdAt).toLocaleDateString("fr-FR")}</div>
            </div>
          </Link>
        ))}
      </div>

      {filteredSearch.length===0 && (
        <div className="text-center py-10 p-4">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-sm font-bold">Aucune annonce visible dans {cat.titre||slug}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            V6: Les comptes cachés (Freemium 30j expiré + 0 ticket actif) sont filtrés<br/>
            Ancien slug `{rawSlug}` → normalisé `{slug}` → catégorie `{cat.titre||slug}`<br/>
            Sois le premier à publier - STANDARD 5$ = 4 places strictes sur 7j - Même prix Détail/Gros/Presta
          </div>
          <Link href="/publier" className="inline-block mt-4 bg-black text-white px-6 py-2.5 rounded-xl text-sm font-bold">Publier maintenant - 0.2$/j OCC</Link>
        </div>
      )}

      <div className="p-3">
        <div className="bg-white rounded-2xl border p-3 text-[11px]">
          <b>🔧 FIX Slug V6:</b> raw `{rawSlug}` → normalized `{slug}` → cat `{cat.id}` - Anciens liens `soudeur`, `commerce`, `vetement` → `commerces-services` grâce à `normalizeCategorie()` - Plus de 404
        </div>
      </div>
    </div>
  );
                                                                      }
