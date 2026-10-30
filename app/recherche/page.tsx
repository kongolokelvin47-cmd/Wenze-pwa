"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getCategorieById, normalizeCategorie, CATEGORIES_WENZE } from "@/lib/categories";
import { TAUX_CDF, toCDFString, isCompteCache, checkFreemiumWenze } from "@/lib/paiement";

const cleanWa = (n:any)=> (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const safeParse = (k:string)=>{ try{ const r=localStorage.getItem(k); return r?JSON.parse(r):[];}catch{return[];} };

export default function RecherchePage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [resultBoutiques, setResultBoutiques] = useState<any[]>([]);
  const [resultAnnonces, setResultAnnonces] = useState<any[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");

  // Debounce 300ms V6 pro
  useEffect(()=>{ const t=setTimeout(()=>setDebounced(search.trim()),300); return ()=>clearTimeout(t); },[search]);

  useEffect(() => {
    if (!debounced || debounced.length < 2) {
      setResultBoutiques([]); setResultAnnonces([]); return;
    }
    const q = debounced.toLowerCase();

    // 1. BOUTIQUES V6: toutes users avec ownerWhatsapp, filtre cache, dédupliqué par WA clean
    const allUsers = safeParse("wenze_all_users");
    const currentRaw = localStorage.getItem("wenze_user");
    const map = new Map<string,any>();
    try{
      if(currentRaw){ const u=JSON.parse(currentRaw); const wa=cleanWa(u.ownerWhatsapp||u.whatsapp); if(wa) map.set(wa,u); }
    }catch{}
    for(const u of allUsers){
      const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||u.id||"");
      if(!wa) continue;
      // V6: filtre compte caché
      if(isCompteCache(u)) continue;
      if(!map.has(wa)) map.set(wa,u);
    }
    let allBoutiques = Array.from(map.values());

    const filteredBoutiques = allBoutiques.filter((u:any)=>{
      const nom=(u.nomEtablissement||u.nom||"").toLowerCase();
      const commune=(u.commune||"").toLowerCase();
      const activite=(u.activite||u.activiteId||"").toLowerCase();
      const cat=(u.categorieId||"").toLowerCase();
      const match = nom.includes(q) || commune.includes(q) || activite.includes(q) || cat.includes(q);
      if(!match) return false;
      if(filterCat!=="all" && normalizeCategorie(u.categorieId||"")!==filterCat) return false;
      return true;
    }).map((u:any)=>{
      const ab=checkFreemiumWenze(u,0);
      return { ...u, _badge:ab.badge, _palierId:ab.palierId, _places:ab.placesRestantes, _wa:cleanWa(u.ownerWhatsapp||u.whatsapp) };
    }).slice(0,20);

    // 2. ANNONCES V6: filtre cachés + catégorie + recherche titre/desc/commune
    const allAnnonces = safeParse("wenze_annonces_list");
    const usersMap = new Map<string,any>();
    for(const u of allUsers){ const wa=cleanWa(u.ownerWhatsapp||""); if(wa) usersMap.set(wa,u); }
    if(currentRaw){ try{ const u=JSON.parse(currentRaw); const wa=cleanWa(u.ownerWhatsapp||""); if(wa) usersMap.set(wa,u); }catch{} }

    const filteredAnnonces = allAnnonces.filter((a:any)=>{
      const waA=cleanWa(a.ownerWhatsapp||a.whatsapp||"");
      const vendeur=usersMap.get(waA);
      if(vendeur && isCompteCache(vendeur)) return false; // V6: ne pas afficher annonces de vendeur caché
      if(filterCat!=="all" && normalizeCategorie(a.categorieId||"")!==filterCat) return false;
      const titre=(a.titre||a.title||"").toLowerCase();
      const desc=(a.description||"").toLowerCase();
      const commune=(a.commune||"").toLowerCase();
      const activite=(a.activite||"").toLowerCase();
      return titre.includes(q) || desc.includes(q) || commune.includes(q) || activite.includes(q);
    }).slice(0,30);

    setResultBoutiques(filteredBoutiques);
    setResultAnnonces(filteredAnnonces);
  }, [debounced, filterCat]);

  const total = resultBoutiques.length + resultAnnonces.length;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/market" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1 relative">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher boutique, produit, commune... (min 2 lettres)" className="w-full border-2 rounded-full pl-11 pr-4 py-3 text-[13px] focus:ring-2 focus:ring-black outline-none focus:border-black" autoFocus />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            {search&&<button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[12px]">✕</button>}
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button onClick={()=>setFilterCat("all")} className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold border-2 transition ${filterCat==="all"?"bg-black text-white border-black":"bg-white border-gray-200"}`}>Tous • {total}</button>
          {CATEGORIES_WENZE.slice(0,2).map((c:any)=>(
            <button key={c.id} onClick={()=>setFilterCat(c.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold border-2 transition flex items-center gap-1 ${filterCat===c.id?"bg-black text-white border-black":"bg-white border-gray-200"}`}>{c.icon} {c.titreCourt||c.titre}</button>
          ))}
        </div>
        <div className="mt-2 bg-black text-white rounded-xl p-2.5 text-[9px] flex justify-between"><span><b>V6 Recherche:</b> Filtre comptes cachés 🔒 - Même ticket ⭐ 5$ ({toCDFString(5)}) 🚀 10$ 👑 20$ - Max 50 - 0% comm - Taux {TAUX_CDF}</span><span className="bg-white text-black px-2 rounded-full font-black">{TAUX_CDF}</span></div>
      </header>

      <div className="p-4 space-y-5">
        {!debounced && (
          <div className="text-center py-16">
            <p className="text-5xl">🔍</p>
            <p className="font-black text-[14px] mt-3">Recherche V6 intelligente</p>
            <p className="text-[11px] text-gray-500 mt-2 max-w-[280px] mx-auto">Tape boutique, produit, commune, activité - Filtre auto des comptes cachés - Même ticket pour tous - Taux {TAUX_CDF} - 0% commission</p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {["riz","ciment","coiffure","Gombe","électricien"].map(k=>(
                <button key={k} onClick={()=>setSearch(k)} className="bg-white border px-3 py-1.5 rounded-full text-[11px] font-bold hover:border-black">{k}</button>
              ))}
            </div>
          </div>
        )}

        {debounced && debounced.length>=2 && total===0 && (
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-3xl">😕</p>
            <p className="font-bold text-[13px] mt-2">Aucun résultat pour "{debounced}"</p>
            <p className="text-[11px] text-gray-500 mt-1">Essaie autre mot - V6 filtre les comptes 🔒 cachés (Freemium 30j expiré) - Active ticket 5$ ({toCDFString(5)}) pour réapparaître</p>
            <Link href="/publier" className="mt-4 inline-block bg-black text-white px-5 py-2.5 rounded-full text-[11px] font-black">Publier "{debounced}"</Link>
          </div>
        )}

        {resultBoutiques.length>0 && (
          <div>
            <p className="font-black text-[13px] flex items-center gap-2">🏪 Boutiques • {resultBoutiques.length} <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full">Filtre caché V6</span></p>
            <div className="mt-3 grid gap-3">
              {resultBoutiques.map((b:any)=>{
                const cat=getCategorieById(normalizeCategorie(b.categorieId||"commerces-services")) as any;
                return (
                  <Link key={b._wa||b.id} href={`/boutique/${b._wa||cleanWa(b.ownerWhatsapp||"")}`} className="bg-white border rounded-2xl p-3 flex gap-3 hover:shadow transition">
                    <div className="w-14 h-14 rounded-full bg-[#FFFBF0] border-2 flex items-center justify-center text-2xl shrink-0 overflow-hidden">{b.photo?<img src={b.photo} alt={b.nom} className="w-full h-full object-cover"/>:<span>{cat?.icon||"🏪"}</span>}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[13px] truncate flex items-center gap-2">{b.nomEtablissement||b.nom||"Boutique"} <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded-full">{b._badge} {b._palierId||"Freemium"}</span></p>
                      <p className="text-[11px] text-gray-600 truncate">{b.commune||"Kinshasa"} • {b.activite||b.activiteId||cat?.titre||""}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{b._places||0} places libres / 50 max • Taux {TAUX_CDF} • 0% comm • WA {b._wa?.slice(-9)}</p>
                    </div>
                    <span className="text-[11px] bg-black text-white px-3 py-1.5 rounded-full font-bold h-fit self-center">Voir</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {resultAnnonces.length>0 && (
          <div>
            <p className="font-black text-[13px]">📦 Annonces • {resultAnnonces.length} <span className="text-[10px] font-normal text-gray-500">Même ticket ⭐5$ 🚀10$ 👑20$ - Max 50 - 0% comm</span></p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {resultAnnonces.map((a:any)=>{
                const cat=getCategorieById(normalizeCategorie(a.categorieId||"commerces-services")) as any;
                const prix=Number(a.prixUSD||a.prix||0);
                return (
                  <Link key={a.id} href={`/produit/${a.id}`} className="bg-white border rounded-2xl overflow-hidden hover:shadow transition">
                    <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden relative">
                      {a.photo||a.images?.[0]?<img src={a.photo||a.images?.[0]} alt={a.titre} className="w-full h-full object-cover"/>:<span className="text-3xl">{cat?.icon||"📦"}</span>}
                      <span className="absolute top-2 left-2 bg-black text-white text-[8px] px-2 py-1 rounded-full font-bold">{cat?.icon} {cat?.titreCourt||""}</span>
                    </div>
                    <div className="p-2.5">
                      <p className="font-bold text-[11px] truncate">{a.titre||a.title}</p>
                      <p className="text-[11px] font-black text-orange-600 mt-1">{prix?`${prix}$ / ${toCDFString(prix)}`:"Prix à discuter"}</p>
                      <p className="text-[9px] text-gray-400 mt-1 truncate">{a.commune||"Kin"} • {a.nomBoutique||a.vendeur||"Boutique"}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {debounced && (
          <div className="bg-white border rounded-2xl p-4">
            <p className="font-black text-[11px]">Politique Recherche V6</p>
            <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">V6 filtre automatiquement les comptes 🔒 cachés (Freemium 3 images à vie visibles 30j puis caché si 0 ticket). Recherche par WA nettoyé <code>cleanWa(n).replace(/^0+/,"")</code> pour éviter doublons 081 vs 24381. Même ticket pour tous secteurs 🛍️ Détail et 🏭 Gros: ⭐ 5$ ({toCDFString(5)}) 4pl/7j, 🚀 10$ 10pl/15j, 👑 20$ 30pl/30j. Max 50 actives. Suppression libère place immédiatement. 0% commission. Taux {TAUX_CDF}. isOwner sécurisé par WA.</p>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/recherche" className="font-black text-black flex flex-col items-center gap-0.5"><span className="text-[18px]">🔍</span>Recherche</Link>
        <Link href="/panier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🛒</span>Panier</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  );
         }
