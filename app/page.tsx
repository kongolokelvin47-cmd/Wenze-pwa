"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDFString, PALIERS, FREEMIUM, verifierAbonnement, isCompteCache, checkFreemiumWenze } from "@/lib/paiement";

export const dynamic = "force-dynamic";

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const safeParse = (k:string)=>{ 
  try{ 
    if(typeof window==="undefined") return [];
    const r=localStorage.getItem(k); 
    return r?JSON.parse(r):[]; 
  }catch{return[];} 
};

export default function WenzeBusiness() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [ab, setAb] = useState<any>(null);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(()=>{ 
    const t=setTimeout(()=>setDebounced(search.trim()),300); 
    return ()=>clearTimeout(t); 
  },[search]);

  const loadAnnonces = ()=>{
    try{
      const list = safeParse("wenze_annonces_list");
      const allUsers = safeParse("wenze_all_users");
      const usersMap = new Map<string,any>();
      for(const u of allUsers){ const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||""); if(wa) usersMap.set(wa,u); }
      try{ 
        if(typeof window!=="undefined"){
          const curRaw=localStorage.getItem("wenze_user"); 
          if(curRaw){ const u=JSON.parse(curRaw); const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||""); if(wa) usersMap.set(wa,u); } 
        }
      }catch{}

      const fixed = list.filter((a:any)=>{
        const wa=cleanWa(a.ownerWhatsapp||a.whatsapp||"");
        const vendeur=usersMap.get(wa);
        if(vendeur && isCompteCache(vendeur)) return false;
        return true;
      }).map((a:any)=> {
        const wa=cleanWa(a.ownerWhatsapp||a.whatsapp||"");
        const vendeur=usersMap.get(wa);
        let abVendeur:any=null;
        try{ abVendeur=vendeur?checkFreemiumWenze(vendeur,0):null; }catch{ abVendeur=null; }
        return {
          ...a,
          categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"),
          prix: Math.round(Number(a.prixUSD||a.prix||0)),
          prixCDF: toCDFString(Math.round(Number(a.prixUSD||a.prix||0))),
          isVideo: !!a.isVideo || (a.photo && a.photo.startsWith("data:video")),
          isBoosted: a.boostUntil && new Date(a.boostUntil).getTime()>Date.now(),
          isPayant: abVendeur?.isPaye||false,
          vendeurBadge: abVendeur?.badge||"🆓",
          vendeurPalier: abVendeur?.palierId||"Freemium",
          _wa: wa,
        };
      });
      setAnnonces(fixed);
    } catch { setAnnonces([]); }
  };

  useEffect(()=> { 
    loadAnnonces(); 
    try{ setAb(verifierAbonnement()); } catch {}

    let interval1:any=null;
    let interval2:any=null;

    const initNotifs = async ()=>{
      try{
        const { getUnreadCount, checkAndNotifyExpirations } = await import("@/lib/notifications");
        if(typeof window==="undefined") return;
        const userRaw=localStorage.getItem("wenze_user");
        const user=userRaw?JSON.parse(userRaw):{};
        checkAndNotifyExpirations();
        const updateBadge = ()=>{
          try{
            const wa=cleanWa(user.ownerWhatsapp||user.whatsapp||user.id||"");
            const count = getUnreadCount(user.id || wa);
            setNotifCount(count);
          }catch{}
        };
        updateBadge();
        window.addEventListener("wenze-notif", updateBadge);
        interval1 = setInterval(()=> { try{ checkAndNotifyExpirations(); updateBadge(); loadAnnonces(); }catch{} }, 60*60*1000);
        interval2 = setInterval(updateBadge, 3000);
      } catch{}
    };
    initNotifs();

    const onStorage = ()=> { loadAnnonces(); try{ setAb(verifierAbonnement()); }catch{} };
    if(typeof window!=="undefined"){
      window.addEventListener("storage", onStorage);
      window.addEventListener("wenze-update", onStorage as any);
    }
    return ()=> { 
      if(typeof window!=="undefined"){
        window.removeEventListener("storage", onStorage); 
        window.removeEventListener("wenze-update", onStorage as any);
        window.removeEventListener("wenze-notif", onStorage as any);
      }
      if(interval1) clearInterval(interval1);
      if(interval2) clearInterval(interval2);
    };
  }, []);

  const filtered = useMemo(()=>{
    let list = [...annonces];
    if(selectedCat!=="all") list = list.filter(a=> a.categorieId===selectedCat);
    if(debounced){
      const s = debounced.toLowerCase();
      list = list.filter(a=> (a.titre||"").toLowerCase().includes(s) || (a.description||"").toLowerCase().includes(s) || (a.commune||"").toLowerCase().includes(s));
    }
    return list.sort((a,b)=> {
      const boostA = a.isBoosted ? 1 : 0;
      const boostB = b.isBoosted ? 1 : 0;
      if(boostA!==boostB) return boostB-boostA;
      const payA = a.isPayant ? 1 : 0;
      const payB = b.isPayant ? 1 : 0;
      if(payA!==payB) return payB-payA;
      return new Date(b.created_at||b.createdAt||0).getTime() - new Date(a.created_at||a.createdAt||0).getTime();
    });
  }, [annonces, debounced, selectedCat]);

  const showToast = (m:string)=> { setToast(m); setTimeout(()=> setToast(""), 2500); };

  const addPanier = (a:any)=>{
    try{
      const panier = safeParse("wenze_panier");
      if(panier.find((p:any)=> p.id===a.id)){ showToast("Déjà dans panier 🛒"); return; }
      panier.push({ ...a, qty:1 });
      if(typeof window!=="undefined"){
        localStorage.setItem("wenze_panier", JSON.stringify(panier));
        window.dispatchEvent(new Event("storage"));
      }
      showToast(`Ajouté ${a.prix}$ / ${a.prixCDF} 🛒`);
    } catch { showToast("Panier erreur"); }
  };

  const openProduit = (a:any)=>{
    try{ if(typeof window!=="undefined") localStorage.setItem("wenze_current_produit", JSON.stringify(a)); } catch {}
    router.push(`/produit/${a.id}`);
  };

  const openVideoPage = (a:any)=>{
    try{ if(typeof window!=="undefined") localStorage.setItem("wenze_current_produit", JSON.stringify(a)); } catch {}
    router.push(`/video?id=${a.id}`);
  };

  const prixMoyenUSD = filtered.length ? Math.round(filtered.reduce((s,a)=> s + Number(a.prix||0),0)/filtered.length) : 0;
  const boostedCount = filtered.filter((a:any)=> a.isBoosted).length;
  const payantCount = filtered.filter((a:any)=> a.isPayant).length;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 border-b">
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white font-black">W</div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[11px] leading-none truncate">WENZE V6.4 - {ab?.isPaye?`✅ ${ab.badge} ${ab.palierId} ${ab.joursRestants}j ${ab.placesRestantes||0} libres`:`🆓 ${ab?.count||0}/${FREEMIUM.maxImages} Freemium ${ab?.joursRestants||30}j`}{ab?.isCache?" 🔒 CACHÉ":""}</h1>
            <p className="text-[8px] text-gray-500 truncate">Kinshasa • {payantCount} payants • {boostedCount} TOP • Même ticket ⭐ 5$ ({toCDFString(5)}) 🚀 10$ 👑 20$ • Max 50 • Taux {TAUX_CDF} • 0% comm</p>
          </div>
          <Link href="/notifications" className="relative w-9 h-9 bg-[#FFFBF0] border rounded-full flex items-center justify-center shrink-0">🔔{notifCount>0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-black px-1">{notifCount>99?"99+":notifCount}</span>}</Link>
          <Link href="/panier" className="w-9 h-9 bg-[#FFFBF0] border rounded-full flex items-center justify-center shrink-0">🛒</Link>
          <Link href="/profil" className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center shrink-0">👤</Link>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Recherche sacs, riz, coiffure, Gombe..." className="w-full border-2 pl-10 pr-4 p-3 rounded-full text-[13px] bg-[#FFFBF0] outline-none focus:border-black"/>
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
          <button onClick={()=> router.push("/publier")} className="bg-black text-white px-5 rounded-full font-black text-[12px] shrink-0">+ Publier</button>
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <button onClick={()=> setSelectedCat("all")} className={`px-4 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap transition ${selectedCat==="all"?"bg-black text-white border-black":"bg-white"}`}>Tout • {annonces.length} {boostedCount?`🚀${boostedCount}`:""}</button>
          {CATEGORIES_WENZE.slice(0,2).map((c:any)=> {
            const count = annonces.filter((a:any)=> a.categorieId===c.id).length;
            return <button key={c.id} onClick={()=> setSelectedCat(c.id)} className={`px-4 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap transition ${selectedCat===c.id?"bg-black text-white border-black":"bg-white"}`}>{c.icon} {c.titreCourt} • {count}</button>
          })}
          <button onClick={()=> router.push("/tarifs")} className="px-4 py-2 rounded-full text-[10px] font-bold bg-white border-2 whitespace-nowrap">🎫 Tarifs {TAUX_CDF}</button>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {toast && <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center animate-pulse">{toast}</div>}
        {notifCount>0 && <button onClick={()=> router.push("/notifications")} className="w-full bg-black text-white rounded-2xl p-3.5 flex justify-between items-center"><p className="font-black text-[11px] text-left">🔔 {notifCount} notifs</p><span className="bg-white text-black px-3 py-1 rounded-full text-[10px] font-black">Voir →</span></button>}
        <div className="flex justify-between items-center"><p className="font-black text-[11px]">{filtered.length} annonces {payantCount>0?`• ✅ ${payantCount} payants`:``} • {prixMoyenUSD}$ moyen</p><Link href="/recherche" className="text-[10px] text-black font-bold border px-3 py-1 rounded-full bg-white">Recherche →</Link></div>
        <div className="grid grid-cols-2 gap-3">
          {filtered.length===0 ? (
            <div className="col-span-2 text-center py-12 bg-white border-2 border-dashed rounded-2xl">
              <p className="text-4xl">📦</p><p className="text-[13px] font-black mt-3">Aucune annonce</p>
              <button onClick={()=> router.push(`/publier?cat=${selectedCat==="all"?"commerces-services":selectedCat}`)} className="mt-4 bg-black text-white px-6 py-3 rounded-full font-black text-[11px]">+ Publier - 5$ / {toCDFString(5)}</button>
            </div>
          ) : filtered.map((a:any)=>{
            const cat = getCategorieById(a.categorieId) as any;
            const isVideo = !!a.isVideo;
            return (
              <div key={a.id} className={`bg-white border rounded-2xl overflow-hidden flex flex-col ${a.isBoosted?"border-2 border-green-500":""}`}>
                <button onClick={()=> isVideo ? openVideoPage(a) : setSelectedImage(a)} className="h-36 bg-[#FFFBF0] flex items-center justify-center overflow-hidden relative">
                  {isVideo ? <video src={a.photo} className="max-w-full max-h-full object-contain" muted playsInline preload="metadata"/> : a.photo ? <img src={a.photo} alt={a.titre} className="max-w-full max-h-full object-contain"/> : <span className="text-3xl">{cat?.icon||"🏬"}</span>}
                  <span className="absolute top-2 left-2 text-[8px] px-2 py-1 rounded-full font-black bg-black text-white">{a.vendeurBadge} {a.vendeurPalier} • {a.prix}$</span>
                </button>
                <div className="p-2.5 flex-1 flex flex-col">
                  <button onClick={()=> isVideo ? openVideoPage(a) : openProduit(a)} className="text-left font-bold text-[12px] line-clamp-2">{a.titre}</button>
                  <p className="font-black text-[12px] mt-1">{a.prix}$ / {a.prixCDF}</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                    <a href={`https://wa.me/${a._wa}?text=${encodeURIComponent(`Salut WENZE ${a.titre} - ${a.prix}$`)}`} target="_blank" className="bg-[#25D366] text-white text-center py-2.5 rounded-full font-bold text-[10px]">WhatsApp</a>
                    <button onClick={()=> addPanier(a)} className="bg-white border-2 border-black text-black py-2.5 rounded-full font-bold text-[10px]">🛒 Panier</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="font-bold text-black flex flex-col items-center gap-0.5"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/video" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🎥</span>Vidéo</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[22px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">+</span>Publier</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500 relative"><span className="text-[18px]">👤</span>Profil {notifCount>0 && <span className="absolute -top-1 left-3 bg-red-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">{notifCount}</span>}</Link>
      </nav>
    </div>
  );
                                          }
