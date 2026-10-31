"use client";
import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDFString, PALIERS, isCompteCache, checkFreemiumWenze } from "@/lib/paiement";

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const safeParse = (k:string)=>{ try{ const r=localStorage.getItem(k); return r?JSON.parse(r):[];}catch{return[];} };

function VideoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("id");
  const [videos, setVideos] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState<string|null>(null);
  const [mutedMap, setMutedMap] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    try {
      const list = safeParse("wenze_annonces_list");
      const allUsers = safeParse("wenze_all_users");
      const usersMap = new Map<string,any>();
      for(const u of allUsers){ const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||""); if(wa) usersMap.set(wa,u); }
      try{ const curRaw=localStorage.getItem("wenze_user"); if(curRaw){ const u=JSON.parse(curRaw); const wa=cleanWa(u.ownerWhatsapp||""); if(wa) usersMap.set(wa,u); } }catch{}

      // WENZE WENZE BUSINESS - POLITIQUE OFFICIELLE ARTICLE 4
      const vids = list.filter((a:any)=>{
        const wa=cleanWa(a.ownerWhatsapp||a.whatsapp||"");
        const vendeur=usersMap.get(wa);
        if(vendeur && isCompteCache(vendeur)) return false;
        const hasVideo = a.isVideo || (a.photo && a.photo.startsWith("data:video")) || (a.images?.[0] && a.images[0].startsWith("data:video")) || a.videoUrl;
        if(!hasVideo) return false;
        
        // NOUVEAU: STANDARD a droit à 1 vidéo 15s maintenant (pas 0)
        if(vendeur){
          const ab=checkFreemiumWenze(vendeur,0);
          if(!ab.isPaye) return false; // Freemium 0 vidéo - reste caché
          // STANDARD, PRO, PREMIUM = tous ont videoCount >=1
        }
        return true;
      }).map((a:any)=>{
        const wa=cleanWa(a.ownerWhatsapp||a.whatsapp||"");
        const vendeur=usersMap.get(wa);
        const cat=getCategorieById(normalizeCategorie(a.categorieId||"commerces-services")) as any;
        const prix=Number(a.prixUSD||a.prix||0);
        const ab = vendeur ? checkFreemiumWenze(vendeur,0) : null;
        return {
          ...a, _wa:wa, _cat:cat, _prix:prix, _prixCDF:toCDFString(prix),
          _vendeurBadge: ab?.badge || "🆓",
          _vendeurNom: vendeur?.nomEtablissement||a.ownerName||"Boutique",
          _palier: ab?.palierId || "Freemium",
          _videoSec: ab?.palier?.videoCount ? (ab.palierId==="STANDARD"?15:ab.palierId==="PRO"?30:60) : 15,
        };
      }).slice(0,50);

      setVideos(vids);
      if(focusId){
        const el=document.getElementById(`vid-${focusId}`);
        if(el) el.scrollIntoView({behavior:"smooth",block:"center"});
      }
    } catch {}
  }, [focusId]);

  const filtered = useMemo(()=>{
    let f=videos;
    if(filter!=="all") f=f.filter((v:any)=>normalizeCategorie(v.categorieId||"")===filter);
    if(search.trim()){
      const q=search.toLowerCase();
      f=f.filter((v:any)=>(v.titre||"").toLowerCase().includes(q) || (v.commune||"").toLowerCase().includes(q) || (v._vendeurNom||"").toLowerCase().includes(q));
    }
    return f;
  },[videos,filter,search]);

  const handlePlay = (id:string)=>{
    const vid=videoRefs.current.get(id);
    if(!vid) return;
    if(playing && playing!==id){
      const prev=videoRefs.current.get(playing);
      if(prev) prev.pause();
    }
    if(vid.paused){ 
      vid.muted = mutedMap[id] ?? false;
      vid.play().catch(()=>{}); 
      setPlaying(id); 
    } else { 
      vid.pause(); 
      setPlaying(null); 
    }
  };

  const toggleMute = (id:string, e:any)=>{
    e.stopPropagation();
    setMutedMap(prev => {
      const newVal = !prev[id];
      const vid = videoRefs.current.get(id);
      if(vid) vid.muted = newVal;
      return {...prev, [id]: newVal};
    });
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-black pb-20">
      <header className="sticky top-0 bg-black/90 backdrop-blur z-20 p-3 border-b border-white/10 flex items-center gap-2">
        <Link href="/" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-white text-[13px]">WENZE WENZE BUSINESS Vidéo 🎬</h1>
          <p className="text-[8px] text-white/60 leading-[10px] mt-0.5">TikTok Shop Kin - Pour vendre, pas buzz - Même ticket ⭐0.5$ 🚀1$ 👑2$ /j - Max 50 - Taux {TAUX_CDF} - 0% comm</p>
        </div>
        <Link href="/tarifs" className="text-[10px] bg-white text-black px-3 py-1.5 rounded-full font-bold">Tarifs</Link>
      </header>

      <div className="p-3 bg-black space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher vidéo, commune, boutique..." className="w-full bg-white/10 border border-white/20 rounded-full pl-9 pr-4 py-2.5 text-[12px] text-white placeholder-white/50 focus:ring-2 focus:ring-white outline-none" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">🔍</span>
          </div>
          <Link href="/publier" className="bg-white text-black px-4 py-2.5 rounded-full font-black text-[11px]">+ Publier</Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={()=>setFilter("all")} className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold border transition ${filter==="all"?"bg-white text-black border-white":"bg-white/10 text-white border-white/20"}`}>Tous • {filtered.length}</button>
          {CATEGORIES_WENZE.slice(0,2).map((c:any)=>(
            <button key={c.id} onClick={()=>setFilter(c.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold border transition flex items-center gap-1 ${filter===c.id?"bg-white text-black border-white":"bg-white/10 text-white border-white/20"}`}>{c.icon} {c.titreCourt}</button>
          ))}
        </div>

        <div className="bg-white/10 border border-white/20 rounded-xl p-2.5 text-[9px] text-white/70 leading-[13px]">
          <b className="text-white">WENZE WENZE BUSINESS POLITIQUE VIDÉO (Article 4):</b> Freemium 🆓 3 images à vie visibles 30j puis 🔒 caché 0 vidéo • ⭐ STANDARD 0.5$/1j - 3$/7j - 12$/30j (4 places) + 1 vidéo 15s • 🚀 PRO 1$/1j - 5$/7j - 20$/30j (10 places) + 1 vidéo 30s • 👑 PREMIUM 2$/1j - 10$/7j - 25$/30j (30 places) + 1 vidéo 60s • Max 50 actives • Suppression libère place • 1 ticket = X places strictes sur Y jours (pas X/j) • Cumulable • Taux {TAUX_CDF} • 0% comm • Min 1$ FlexPay
        </div>

        {filtered.length===0 ? (
          <div className="text-center py-20">
            <p className="text-5xl">🎬</p>
            <p className="font-black text-white text-[14px] mt-3">Aucune vidéo - Filtre caché actif</p>
            <p className="text-[11px] text-white/50 mt-2 max-w-[280px] mx-auto">WENZE WENZE BUSINESS filtre les comptes 🔒 cachés et Freemium sans ticket vidéo - Publie avec ticket ⭐ STANDARD 0.5$ (1 vidéo 15s) - 🚀 PRO 1$ (30s) - 👑 PREMIUM 2$ (60s) - Même prix pour tous - Max 50 - 0% comm</p>
            <Link href="/publier" className="mt-5 inline-block bg-white text-black px-6 py-3 rounded-full font-black text-[12px]">Publier première vidéo - STANDARD 0.5$</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((v:any)=>{
              const isPlaying=playing===v.id;
              const isMuted=mutedMap[v.id] ?? false;
              return (
                <div key={v.id} id={`vid-${v.id}`} className="bg-white rounded-[20px] overflow-hidden border-2 border-white/10">
                  <div className="relative bg-black aspect-[9/14] flex items-center justify-center group">
                    {v.photo && v.photo.startsWith("data:video") ? (
                      <video ref={el=>{ if(el) videoRefs.current.set(v.id, el); }} src={v.photo} className="w-full h-full object-contain" loop playsInline muted={isMuted} controls={false} />
                    ) : v.images?.[0]?.startsWith("data:video") ? (
                      <video ref={el=>{ if(el) videoRefs.current.set(v.id, el); }} src={v.images[0]} className="w-full h-full object-contain" loop playsInline muted={isMuted} controls={false} />
                    ) : v.videoUrl ? (
                      <video ref={el=>{ if(el) videoRefs.current.set(v.id, el); }} src={v.videoUrl} className="w-full h-full object-contain" loop playsInline muted={isMuted} controls={false} />
                    ) : (
                      <img src={v.photo||v.images?.[0]} alt={v.titre} className="w-full h-full object-cover" />
                    )}
                    
                    {/* CONTROLES FIXES - BUG SON RÉGLÉ */}
                    <button onClick={()=>handlePlay(v.id)} className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className={`w-16 h-16 bg-white/90 rounded-full flex items-center justify-center text-2xl font-black transition ${isPlaying?"opacity-0 group-hover:opacity-100":"opacity-100"}`}>{isPlaying?"⏸️":"▶️"}</span>
                    </button>

                    {/* BOUTON SON - NOUVEAU */}
                    <button onClick={(e)=>toggleMute(v.id, e)} className="absolute bottom-20 right-3 w-9 h-9 bg-black/70 rounded-full flex items-center justify-center text-white text-[16px] border border-white/30">
                      {isMuted ? "🔇" : "🔊"}
                    </button>
                    
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="bg-black/70 text-white text-[9px] px-2.5 py-1 rounded-full font-bold">{v._cat?.icon} {v._cat?.titreCourt}</span>
                      <span className="bg-white text-black text-[9px] px-2.5 py-1 rounded-full font-bold">{v._vendeurBadge} {v._vendeurNom} • {v._videoSec}s</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-black text-white text-[9px] px-2 py-1 rounded-full font-bold">{v._prix?`${v._prix}$ / ${v._prixCDF}`:""}</div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                      <p className="font-black text-white text-[13px]">{v.titre}</p>
                      <p className="text-[11px] text-white/70 mt-1">{v.commune||"Kinshasa"} • {v._vendeurNom} • {v._palier} • {v._videoSec}s • WA {v._wa?.slice(-9)}</p>
                      <p className="text-[9px] text-white/50 mt-1">Ticket {v._palier} • Max 50 • Suppression libère place • Taux {TAUX_CDF} • 0% comm</p>
                    </div>
                  </div>
                  <div className="p-3 flex gap-2">
                    <Link href={`/produit/${v.id}`} className="flex-1 bg-black text-white rounded-full py-3 text-center font-black text-[11px]">🛒 Voir produit - {v._prix||""}$ / {v._prixCDF||""}</Link>
                    <Link href={`https://wa.me/${v._wa}?text=${encodeURIComponent(`Salut, j'ai vu ta vidéo ${v.titre} sur WENZE WENZE BUSINESS - ${v._prix}$`)}`} target="_blank" className="bg-[#25D366] text-white px-5 py-3 rounded-full font-black text-[11px]">WhatsApp</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
          <p className="font-black text-white text-[11px]">Politique Économique WENZE WENZE BUSINESS - Vidéo</p>
          <p className="text-[10px] text-white/60 mt-2 leading-relaxed">WENZE WENZE BUSINESS filtre auto comptes 🔒 cachés (Freemium 3 images à vie visibles 30j puis caché si 0 ticket). Vidéo selon Article 4: Freemium 0 vidéo, STANDARD 0.5$/1j - 12$/30j - 4 places + 1 vidéo 15s, PRO 1$/1j - 20$/30j - 10 places + 1 vidéo 30s, PREMIUM 2$/1j - 25$/30j - 30 places + 1 vidéo 60s (1 vidéo, pas 2). Compression WebP 1024px 75% = 6Mo→180Ko + R2. Max 50 actives. Suppression libère place immédiatement. 1 ticket = X places strictes sur Y jours. Cumulable. Taux {TAUX_CDF}. 0% commission. Paiement min 1$ pour FlexPay (2%+0.10$).</p>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-black/95 backdrop-blur border-t border-white/10 flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-white/50"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-white/50"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/video" className="font-black text-white flex flex-col items-center gap-0.5"><span className="text-[18px]">🎬</span>Video</Link>
        <Link href="/panier" className="flex flex-col items-center gap-0.5 text-white/50"><span className="text-[18px]">🛒</span>Panier</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-white/50"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  );
}

export default function VideoPage(){
  return <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-black p-6"><div className="h-24 bg-white/10 rounded-2xl animate-pulse"/></div>}><VideoContent/></Suspense>;
      }
