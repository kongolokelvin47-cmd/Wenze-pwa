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
  const [pleinEcran, setPleinEcran] = useState<any>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const pleinRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      const list = safeParse("wenze_annonces_list");
      const allUsers = safeParse("wenze_all_users");
      const usersMap = new Map<string,any>();
      for(const u of allUsers){ const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||""); if(wa) usersMap.set(wa,u); }
      try{ const curRaw=localStorage.getItem("wenze_user"); if(curRaw){ const u=JSON.parse(curRaw); const wa=cleanWa(u.ownerWhatsapp||""); if(wa) usersMap.set(wa,u); } }catch{}
      const vids = list.filter((a:any)=>{
        const wa=cleanWa(a.ownerWhatsapp||a.whatsapp||"");
        const vendeur=usersMap.get(wa);
        if(vendeur && isCompteCache(vendeur)) return false;
        const hasVideo = a.isVideo || (a.photo && a.photo.startsWith("data:video")) || (a.images?.[0] && a.images[0].startsWith("data:video")) || a.videoUrl;
        if(!hasVideo) return false;
        if(vendeur){
          const ab=checkFreemiumWenze(vendeur,0);
          if(!ab.isPaye) return false;
        }
        return true;
      }).map((a:any)=>{
        const wa=cleanWa(a.ownerWhatsapp||a.whatsapp||"");
        const vendeur=usersMap.get(wa);
        const cat=getCategorieById(normalizeCategorie(a.categorieId||"commerces-services")) as any;
        const prix=Number(a.prixUSD||a.prix||0);
        const ab = vendeur ? checkFreemiumWenze(vendeur,0) : null;
        const src = a.videoUrl || (a.photo && a.photo.startsWith("data:video") ? a.photo : null) || (a.images?.[0] && a.images[0].startsWith("data:video") ? a.images[0] : null) || a.photo || a.images?.[0] || "";
        return { ...a, _wa:wa, _cat:cat, _prix:prix, _prixCDF:toCDFString(prix), _vendeurBadge: ab?.badge || "🆓", _vendeurNom: vendeur?.nomEtablissement||a.ownerName||"Boutique", _palier: ab?.palierId || "Freemium", _videoSec: ab?.palier?.videoCount ? (ab.palierId==="STANDARD"?15:ab.palierId==="PRO"?30:60) : 15, _src: src };
      }).slice(0,50);
      setVideos(vids);
      if(focusId){
        const v = vids.find((x:any)=>x.id===focusId);
        if(v) setPleinEcran(v);
        else { const el=document.getElementById(`vid-${focusId}`); if(el) el.scrollIntoView({behavior:"smooth",block:"center"}); }
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

  const getIndexPlein = () => filtered.findIndex((v:any)=>v.id===pleinEcran?.id);
  const videoSuivante = () => { const i=getIndexPlein(); if(i>=0 && i<filtered.length-1) setPleinEcran(filtered[i+1]); };
  const videoPrecedente = () => { const i=getIndexPlein(); if(i>0) setPleinEcran(filtered[i-1]); };

  // Plein écran : lecture auto, verrouille le scroll, Echap / swipe pour fermer
  useEffect(()=>{
    if(!pleinEcran) return;
    document.body.style.overflow="hidden";
    const t=setTimeout(()=>{ pleinRef.current?.play().catch(()=>{}); },100);
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") setPleinEcran(null); if(e.key==="ArrowDown") videoSuivante(); if(e.key==="ArrowUp") videoPrecedente(); };
    window.addEventListener("keydown",onKey);
    return ()=>{ document.body.style.overflow=""; clearTimeout(t); window.removeEventListener("keydown",onKey); };
  },[pleinEcran]);

  const handlePlay = (id:string)=>{
    const vid=videoRefs.current.get(id);
    if(!vid) return;
    if(playing && playing!==id){ const prev=videoRefs.current.get(playing); if(prev) prev.pause(); }
    if(vid.paused){ vid.muted = mutedMap[id] ?? false; vid.play().catch(()=>{}); setPlaying(id); } else { vid.pause(); setPlaying(null); }
  };
  const toggleMute = (id:string, e:any)=>{
    e.stopPropagation();
    setMutedMap(prev => { const newVal = !prev[id]; const vid = videoRefs.current.get(id); if(vid) vid.muted = newVal; return {...prev, [id]: newVal}; });
  };
  const ouvrirPleinEcran = (v:any)=>{
    if(playing){ const prev=videoRefs.current.get(playing); if(prev) prev.pause(); setPlaying(null); }
    setPleinEcran(v);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-black pb-20">
      <header className="sticky top-0 bg-black/90 backdrop-blur z-20 p-3 border-b border-white/10 flex items-center gap-2">
        <Link href="/" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-white text-[13px]">WENZE Vidéo 🎬</h1>
          <p className="text-[8px] text-white/60 leading-[10px] mt-0.5">TikTok Shop Kin - Pour vendre, pas buzz - Clique sur une vidéo pour plein écran - Taux {TAUX_CDF} - 0% comm</p>
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
          {CATEGORIES_WENZE.map((c:any)=>(
            <button key={c.id} onClick={()=>setFilter(c.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold border transition flex items-center gap-1 ${filter===c.id?"bg-white text-black border-white":"bg-white/10 text-white border-white/20"}`}>{c.icon} {c.titreCourt}</button>
          ))}
        </div>
        <div className="bg-white/10 border border-white/20 rounded-xl p-2.5 text-[9px] text-white/70 leading-[13px]">
          <b className="text-white">POLITIQUE VIDÉO (Article 4):</b> Freemium 🆓 0 vidéo • ⭐ STANDARD + 1 vidéo 15s • 🚀 PRO + 1 vidéo 30s • 👑 PREMIUM + 1 vidéo 60s • Max 50 actives • Suppression libère place • Taux {TAUX_CDF} • 0% comm • Min 1$ FlexPay
        </div>
                {filtered.length===0 ? (
          <div className="text-center py-20">
            <p className="text-5xl">🎬</p>
            <p className="font-black text-white text-[14px] mt-3">Aucune vidéo</p>
            <p className="text-[11px] text-white/50 mt-2 max-w-[280px] mx-auto">Publie avec ticket ⭐ STANDARD (1 vidéo 15s) - 🚀 PRO (30s) - 👑 PREMIUM (60s) - Même prix pour tous - Max 50 - 0% comm</p>
            <Link href="/publier" className="mt-5 inline-block bg-white text-black px-6 py-3 rounded-full font-black text-[12px]">Publier première vidéo - STANDARD</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((v:any)=>{
              const isPlaying=playing===v.id;
              const isMuted=mutedMap[v.id] ?? false;
              return (
                <div key={v.id} id={`vid-${v.id}`} className="bg-white rounded-[20px] overflow-hidden border-2 border-white/10">
                  <div className="relative bg-black aspect-[9/14] flex items-center justify-center group cursor-pointer" onClick={()=>ouvrirPleinEcran(v)}>
                    {v._src && v._src.startsWith("data:video") || v._src?.startsWith("http") && (v.videoUrl || v.photo?.startsWith("data:video") || v.images?.[0]?.startsWith("data:video")) ? (
                      <video ref={el=>{ if(el) videoRefs.current.set(v.id, el); }} src={v._src} className="w-full h-full object-contain" loop playsInline muted={isMuted} controls={false} />
                    ) : (
                      <img src={v.photo||v.images?.[0]} alt={v.titre} className="w-full h-full object-cover" />
                    )}
                    <button onClick={(e)=>{ e.stopPropagation(); handlePlay(v.id); }} className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className={`w-16 h-16 bg-white/90 rounded-full flex items-center justify-center text-2xl font-black transition ${isPlaying?"opacity-0 group-hover:opacity-100":"opacity-100"}`}>{isPlaying?"⏸️":"▶️"}</span>
                    </button>
                    <button onClick={(e)=>toggleMute(v.id, e)} className="absolute bottom-20 right-3 w-9 h-9 bg-black/70 rounded-full flex items-center justify-center text-white text-[16px] border border-white/30 z-10">{isMuted ? "🔇" : "🔊"}</button>
                    <div className="absolute top-3 left-3 flex gap-2"><span className="bg-black/70 text-white text-[9px] px-2.5 py-1 rounded-full font-bold">{v._cat?.icon} {v._cat?.titreCourt}</span><span className="bg-white text-black text-[9px] px-2.5 py-1 rounded-full font-bold">{v._vendeurBadge} {v._vendeurNom} • {v._videoSec}s</span></div>
                    <div className="absolute top-3 right-3 bg-black text-white text-[9px] px-2 py-1 rounded-full font-bold">{v._prix?`${v._prix}$ / ${v._prixCDF}`:""}</div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pointer-events-none"><p className="font-black text-white text-[13px]">{v.titre}</p><p className="text-[11px] text-white/70 mt-1">{v.commune||"Kinshasa"} • {v._vendeurNom} • {v._palier} • {v._videoSec}s • WA {v._wa?.slice(-9)}</p><p className="text-[9px] text-white/50 mt-1">👆 Clique pour plein écran • Ticket {v._palier} • Max 50 • Taux {TAUX_CDF} • 0% comm</p></div>
                  </div>
                  <div className="p-3 flex gap-2">
                    <Link href={`/produit/${v.id}`} className="flex-1 bg-black text-white rounded-full py-3 text-center font-black text-[11px]">🛒 Voir produit - {v._prix||""}$ / {v._prixCDF||""}</Link>
                    <Link href={`https://wa.me/${v._wa}?text=${encodeURIComponent(`Salut, j'ai vu ta vidéo ${v.titre} sur WENZE - ${v._prix}$`)}`} target="_blank" className="bg-[#25D366] text-white px-5 py-3 rounded-full font-black text-[11px]">WhatsApp</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="bg-white/10 border border-white/20 rounded-2xl p-4"><p className="font-black text-white text-[11px]">Politique Économique WENZE - Vidéo</p><p className="text-[10px] text-white/60 mt-2 leading-relaxed">Filtre auto comptes 🔒 cachés. Vidéo selon Article 4: Freemium 0 vidéo, STANDARD 4 places + 1 vidéo 15s, PRO 10 places + 1 vidéo 30s, PREMIUM 30 places + 1 vidéo 60s (1 vidéo, pas 2). Max 50 actives. Suppression libère place. 1 ticket = X places strictes sur Y jours. Cumulable. Taux {TAUX_CDF}. 0% commission. Paiement min 1$ pour FlexPay.</p></div>
      </div>

      {/* PLEIN ECRAN - STYLE TIKTOK */}
      {pleinEcran && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col">
          <div className="flex justify-between items-center p-3 z-10">
            <button onClick={()=>setPleinEcran(null)} className="w-9 h-9 bg-white/20 text-white rounded-full font-black text-[16px]">×</button>
            <p className="text-white text-[11px] font-black">{getIndexPlein()+1} / {filtered.length}</p>
            <Link href="/publier" className="bg-white text-black px-3 py-1.5 rounded-full font-black text-[10px]">+ Publier</Link>
          </div>
          <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
            {pleinEcran._src ? <video key={pleinEcran.id} ref={pleinRef} src={pleinEcran._src} className="w-full h-full object-contain" loop playsInline autoPlay controls={false} /> : <img src={pleinEcran.photo||pleinEcran.images?.[0]} className="w-full h-full object-contain" />}
            <button onClick={()=>{ if(pleinRef.current){ if(pleinRef.current.paused) pleinRef.current.play(); else pleinRef.current.pause(); } }} className="absolute inset-0 flex items-center justify-center"><span className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl">▶️</span></button>
            <div className="absolute right-3 bottom-28 flex flex-col gap-3 items-center">
              <button onClick={()=>{ if(pleinRef.current) pleinRef.current.muted = !pleinRef.current.muted; }} className="w-11 h-11 bg-black/60 border border-white/30 rounded-full text-white text-[18px]">🔊</button>
              <Link href={`https://wa.me/${pleinEcran._wa}?text=${encodeURIComponent(`Salut, j'ai vu ta vidéo ${pleinEcran.titre} sur WENZE - ${pleinEcran._prix}$`)}`} target="_blank" className="w-11 h-11 bg-[#25D366] rounded-full flex items-center justify-center text-[18px]">💬</Link>
              <Link href={`/produit/${pleinEcran.id}`} className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-[18px]">🛒</Link>
            </div>
            <div className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-4 pb-24 pointer-events-none">
              <p className="font-black text-white text-[15px]">{pleinEcran.titre}</p>
              <p className="text-[11px] text-white/80 mt-1">{pleinEcran._vendeurBadge} {pleinEcran._vendeurNom} • {pleinEcran.commune||"Kinshasa"} • {pleinEcran._palier} • {pleinEcran._videoSec}s</p>
              <p className="text-[12px] text-white font-black mt-1">{pleinEcran._prix}$ / {pleinEcran._prixCDF}</p>
            </div>
          </div>
          <div className="p-3 flex gap-2 bg-black border-t border-white/10">
            <button onClick={videoPrecedente} disabled={getIndexPlein()<=0} className="flex-1 bg-white/10 text-white py-3 rounded-full font-black text-[12px] disabled:opacity-30">⬆️ Précédente</button>
            <Link href={`/produit/${pleinEcran.id}`} className="flex-1 bg-white text-black py-3 rounded-full font-black text-[12px] text-center">🛒 Voir produit</Link>
            <button onClick={videoSuivante} disabled={getIndexPlein()>=filtered.length-1} className="flex-1 bg-white/10 text-white py-3 rounded-full font-black text-[12px] disabled:opacity-30">Suivante ⬇️</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-black/95 backdrop-blur border-t border-white/10 flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-white/50"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/video" className="font-black text-white flex flex-col items-center gap-0.5"><span className="text-[18px]">🎬</span>Vidéo</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-white/50"><span className="text-[18px] bg-white text-black w-7 h-7 rounded-full flex items-center justify-center">+</span>Publier</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-white/50"><span className="text-[18px]">🏪</span>Boutique</Link>
        <Link href="/panier" className="flex flex-col items-center gap-0.5 text-white/50"><span className="text-[18px]">🛒</span>Panier</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-white/50"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  );
}
export default function VideoPage(){
  return <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-black p-6"><div className="h-24 bg-white/10 rounded-2xl animate-pulse"/></div>}><VideoContent/></Suspense>;
                  }
