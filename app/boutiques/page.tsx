"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { cleanWhatsapp as cleanWaLib } from "@/lib/securite";
import { ROLES } from "@/lib/roles";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function BoutiquesPage() {
  const router = useRouter();
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "commerces-services" | "gros-autres">("all");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [annoncesList, setAnnoncesList] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wenze_user");
      if (raw) setCurrentUser(JSON.parse(raw));
      const listRaw = localStorage.getItem("wenze_annonces_list");
      const list = listRaw ? JSON.parse(listRaw) : [];
      setAnnoncesList(list);

      // V6: Build boutiques depuis wenze_all_users + annonces, pas depuis wenze_user seul
      const allUsersRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : (raw ? [JSON.parse(raw)] : []);
      
      // V6: Pour compat si pas de all_users, build depuis annonces
      const boutiqueMap = new Map<string, any>();
      
      // 1. Depuis all_users
      for(const u of allUsers){
        const wa = cleanWhatsapp(u.ownerWhatsapp||u.whatsapp||u.telephone||u.id||"");
        if(!wa) continue;
        if(!boutiqueMap.has(wa)){
          boutiqueMap.set(wa, {
            id: wa,
            ownerWhatsapp: wa,
            whatsapp: wa,
            nom: u.nomBoutique || u.name || u.boutiqueName || u.email?.split("@")[0] || `Boutique ${wa.slice(-4)}`,
            name: u.nomBoutique || u.name || u.boutiqueName || `Boutique ${wa.slice(-4)}`,
            role: u.role || "vendeur",
            user_type: u.user_type || u.role || "vendeur",
            badge: u.badge || (ROLES as any)[u.role||"vendeur"]?.badge || "🛍️",
            createdAt: u.createdAt || u.created_at || new Date().toISOString(),
            avatar: u.avatar || u.photo || null,
            categorie: u.categorie || u.categorieId || "commerces-services",
            verified: !!u.verified,
            rawUser: u,
          });
        }
      }

      // 2. Depuis annonces (pour boutiques qui n'ont pas de user enregistré mais ont posté)
      for(const a of list){
        const wa = cleanWhatsapp(a.ownerWhatsapp||a.whatsapp||a.telephone||a.userId||"");
        if(!wa) continue;
        if(!boutiqueMap.has(wa)){
          boutiqueMap.set(wa, {
            id: wa,
            ownerWhatsapp: wa,
            whatsapp: wa,
            nom: a.boutiqueName || a.ownerName || a.userName || `Boutique ${wa.slice(-4)}`,
            name: a.boutiqueName || a.ownerName || `Boutique ${wa.slice(-4)}`,
            role: "vendeur",
            badge: "🛍️",
            createdAt: a.createdAt || new Date().toISOString(),
            categorie: normalizeCategorie(a.categorieId || a.category || "commerces-services"),
            rawUser: null,
          });
        }
      }

      let boutiquesArr = Array.from(boutiqueMap.values());

      // V6 CRITIQUE: Filtre comptes cachés - Ne pas afficher boutiques cachées sur liste
      try{
        const { isCompteCache } = require("@/lib/paiement");
        const { safeParse } = { safeParse: (k:string)=>{ try{ const r=localStorage.getItem(k); return r?JSON.parse(r):[]; }catch{ return []; } } } as any;
        
        boutiquesArr = boutiquesArr.filter((b:any)=>{
          // DG et superviseur toujours visibles
          if(b.role==="dg" || b.role==="superviseur") return true;
          try{
            // Utilise user stocké
            const userToCheck = b.rawUser || { ownerWhatsapp: b.ownerWhatsapp, whatsapp: b.whatsapp, createdAt: b.createdAt, id: b.id };
            if(isCompteCache(userToCheck)){
              return false; // V6: compte caché filtré
            }
          }catch{}
          return true;
        });
      }catch(e){ console.error("filter cache error", e); }

      // V6: Enrichir avec compte annonces + abonnement + places
      boutiquesArr = boutiquesArr.map((b:any)=>{
        const wa = b.ownerWhatsapp;
        const myAnnonces = list.filter((a:any)=> cleanWhatsapp(a.ownerWhatsapp||a.whatsapp||a.userId||"")===wa);
        
        let abonnementInfo: any = null;
        let placesRestantes = 0;
        let badge = b.badge;
        let palierId: any = null;
        try{
          const { checkFreemiumWenze } = require("@/lib/paiement");
          const userToCheck = b.rawUser || { ownerWhatsapp: wa, whatsapp: wa, createdAt: b.createdAt, id: b.id };
          abonnementInfo = checkFreemiumWenze(userToCheck, myAnnonces.length);
          placesRestantes = abonnementInfo.placesRestantes||0;
          badge = abonnementInfo.badge || badge;
          palierId = abonnementInfo.palierId || null;
        }catch{}

        return {
          ...b,
          annoncesCount: myAnnonces.length,
          annonces: myAnnonces.slice(0,3),
          abonnementInfo,
          placesRestantes,
          badge,
          palierId,
          isFreemium: !!abonnementInfo?.isFreemium,
          isPaye: !!abonnementInfo?.isPaye,
          isCache: !!abonnementInfo?.isCache,
          lastActive: myAnnonces.length>0 ? myAnnonces.sort((a:any,b:any)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())[0].createdAt : b.createdAt,
        };
      });

      // Tri V6: Payés d'abord, puis freemium, puis par nb annonces + dernier actif
      boutiquesArr.sort((a:any,b:any)=>{
        if(a.isPaye && !b.isPaye) return -1;
        if(!a.isPaye && b.isPaye) return 1;
        if(a.isFreemium && b.isCache) return -1;
        if(b.annoncesCount!==a.annoncesCount) return b.annoncesCount-a.annoncesCount;
        return new Date(b.lastActive).getTime()-new Date(a.lastActive).getTime();
      });

      setBoutiques(boutiquesArr);
    } catch (e) {
      console.error("BoutiquesPage load error V6", e);
    }
  }, []);

  const filteredBoutiques = useMemo(()=>{
    let arr = [...boutiques];
    if(filter!=="all"){
      arr = arr.filter((b:any)=>{
        const cat = normalizeCategorie(b.categorie||"");
        if(filter==="commerces-services"){
          return ["vetements","electronique","beaute","services","commerces-services"].some(k=> cat.includes(k) || (CATEGORIES_WENZE as any[]).find(c=> c.id===cat)?.groupe==="commerces-services");
        }
        if(filter==="gros-autres"){
          return cat.includes("gros") || cat.includes("agro") || cat.includes("autre") || ["gros","agriculture","autres"].includes(cat);
        }
        return true;
      });
    }
    if(search.trim()){
      const s = search.toLowerCase();
      arr = arr.filter((b:any)=> 
        b.nom?.toLowerCase().includes(s) ||
        b.name?.toLowerCase().includes(s) ||
        b.ownerWhatsapp?.includes(cleanWhatsapp(s)) ||
        b.annonces?.some((a:any)=> a.titre?.toLowerCase().includes(s) || a.title?.toLowerCase().includes(s))
      );
    }
    return arr;
  }, [boutiques, filter, search]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header V6 */}
      <div className="sticky top-0 z-10 bg-white border-b p-3">
        <div className="flex items-center gap-2 mb-3">
          <Link href="/" className="p-2 rounded-full bg-gray-100">←</Link>
          <h1 className="font-bold text-lg">Boutiques V6</h1>
          <span className="ml-auto text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{filteredBoutiques.length} visibles - Cachés filtrés</span>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Recherche boutique, WhatsApp, produit... V6 ownerWhatsapp" className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
        <div className="flex gap-2 mt-3">
          <button onClick={()=>setFilter("all")} className={`px-3 py-1.5 rounded-full text-xs ${filter==="all"?"bg-black text-white":"bg-gray-100"}`}>Tout - Même prix</button>
          <button onClick={()=>setFilter("commerces-services")} className={`px-3 py-1.5 rounded-full text-xs ${filter==="commerces-services"?"bg-black text-white":"bg-gray-100"}`}>Commerces/Services</button>
          <button onClick={()=>setFilter("gros-autres")} className={`px-3 py-1.5 rounded-full text-xs ${filter==="gros-autres"?"bg-black text-white":"bg-gray-100"}`}>Gros/Agro</button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2">V6: Comptes cachés filtrés - Freemium 3 à vie 30j puis caché - STANDARD 5$ 4 places strictes - Max 50 - Suppression libère place - Taux 2300 - Même prix Détail/Gros/Presta</p>
      </div>

      <div className="p-3 grid grid-cols-1 gap-3">
        {filteredBoutiques.map((b:any)=>(
          <Link key={b.id} href={`/boutiques/${b.ownerWhatsapp}`} className="bg-white rounded-2xl border p-3 flex gap-3 hover:shadow-md transition">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-200 to-orange-100 flex items-center justify-center text-xl font-bold shrink-0">
              {b.avatar ? <img src={b.avatar} alt={b.nom} className="w-full h-full rounded-full object-cover" /> : (b.nom?.[0]||"B").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm truncate">{b.nom}</span>
                <span className="text-xs">{b.badge}</span>
                {b.isPaye && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{b.palierId||"PAYE"} {b.abonnementInfo?.joursRestants||0}j</span>}
                {b.isFreemium && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">🆓 {b.annoncesCount}/3</span>}
                {b.verified && <span className="text-[9px] bg-blue-500 text-white px-1 py-0.5 rounded-full">✓</span>}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {b.ownerWhatsapp} • {b.annoncesCount}/50 actives • {b.placesRestantes} places libres strictes • {b.abonnementInfo?.message?.slice(0,60)||""}
              </div>
              <div className="flex gap-1.5 mt-2 overflow-x-auto">
                {b.annonces?.map((a:any)=>(
                  <div key={a.id||a.annonceId} className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                    {a.images?.[0] ? <img src={a.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px]">IMG</div>}
                  </div>
                ))}
                {b.annoncesCount>3 && <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center text-[10px]">+{b.annoncesCount-3}</div>}
              </div>
            </div>
            <div className="text-gray-400">›</div>
          </Link>
        ))}
        {filteredBoutiques.length===0 && (
          <div className="text-center py-10 text-sm text-gray-500">
            Aucune boutique visible V6<br/>
            <span className="text-[11px]">Les comptes cachés (Freemium 30j expiré + 0 ticket) sont filtrés - Ils réapparaissent après paiement STANDARD 5$/PRO 10$/PREMIUM 20$</span>
          </div>
        )}
      </div>
    </div>
  );
      }
