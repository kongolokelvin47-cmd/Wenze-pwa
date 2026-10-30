"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNotifications, markAsRead, markAllAsRead, checkAndNotifyExpirations, type WenzeNotif } from "@/lib/notifications";
import { TAUX_CDF, toCDFString, verifierAbonnement, PALIERS } from "@/lib/paiement";

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");

function formatNotifDate(d?: string){
  if(!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  if(diff<60000) return "À l'instant";
  if(diff<3600000) return `${Math.floor(diff/60000)}m`;
  if(diff<86400000) return `${Math.floor(diff/3600000)}h`;
  if(diff<259200000) return `${Math.floor(diff/86400000)}j`;
  return new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});
}

function notifConfig(type: string){
  const t=(type||"").toLowerCase();
  if(t.includes("boutique")||t.includes("annonce")) return { icon:"🏪", color:"bg-purple-100 border-purple-200 text-purple-700", label:"Boutique" };
  if(t.includes("rappel")||t.includes("expire")||t.includes("expir")) return { icon:"⏰", color:"bg-orange-100 border-orange-200 text-orange-700", label:"Rappel" };
  if(t.includes("boost")||t.includes("palier")||t.includes("premium")||t.includes("pro")||t.includes("standard")) return { icon:"🚀", color:"bg-black text-white border-black", label:"Boost" };
  if(t.includes("pub")||t.includes("video")||t.includes("promo")) return { icon:"📢", color:"bg-blue-100 border-blue-200 text-blue-700", label:"Pub" };
  if(t.includes("perso")||t.includes("compte")||t.includes("cache")) return { icon:"👤", color:"bg-red-50 border-red-200 text-red-700", label:"Compte" };
  return { icon:"🔔", color:"bg-gray-100 border-gray-200 text-gray-700", label:"Info" };
}

export default function NotificationsPage(){
  const router = useRouter();
  const [notifs, setNotifs] = useState<WenzeNotif[]>([]);
  const [filter, setFilter] = useState<"all"|"boutique"|"rappels"|"boost"|"pub-video"|"perso">("all");
  const [abInfo, setAbInfo] = useState<any>(null);

  function load(){
    try{
      const raw = localStorage.getItem("wenze_user");
      const user = raw ? JSON.parse(raw) : {};
      const uid = cleanWa(user.ownerWhatsapp||user.whatsapp||"") || user.id || "guest";
      if(uid==="guest"){ setNotifs([]); return; }
      const list = getNotifications(uid) || [];
      // V6: tri non lues d'abord + récentes d'abord
      const sorted = [...list].sort((a:any,b:any)=>{
        const aUnread = !a.read ? 1 : 0; const bUnread = !b.read ? 1 : 0;
        if(aUnread!==bUnread) return bUnread-aUnread;
        return new Date(b.date||b.createdAt||0).getTime() - new Date(a.date||a.createdAt||0).getTime();
      });
      setNotifs(sorted);
      try{ const ab=verifierAbonnement(); setAbInfo(ab); }catch{}
    }catch{ setNotifs([]); }
  }

  useEffect(()=>{
    try{ checkAndNotifyExpirations(); }catch(e){ console.log("check exp",e); }
    load();
    // V6 BATTERIE: 1 seul interval 30s, pas 2.5s - cleanup obligatoire
    const interval = setInterval(()=>{ try{ checkAndNotifyExpirations(); }catch{} load(); }, 30000);
    // Listener storage pour temps réel sans poll
    const onStorage = (e: StorageEvent)=>{ if(e.key?.includes("wenze_notif")||e.key?.includes("wenze_user")) load(); };
    window.addEventListener("storage", onStorage);
    return ()=>{ clearInterval(interval); window.removeEventListener("storage", onStorage); };
  },[]);

  const filtered = useMemo(()=>{
    if(filter==="all") return notifs;
    return notifs.filter((n:any)=>{
      const t=(n.type||n.categorie||"").toLowerCase();
      if(filter==="boutique") return t.includes("boutique")||t.includes("annonce");
      if(filter==="rappels") return t.includes("rappel")||t.includes("expire")||t.includes("expir")||t.includes("cache");
      if(filter==="boost") return t.includes("boost")||t.includes("palier")||t.includes("premium")||t.includes("pro")||t.includes("standard");
      if(filter==="pub-video") return t.includes("pub")||t.includes("video")||t.includes("promo");
      if(filter==="perso") return t.includes("perso")||t.includes("compte");
      return true;
    });
  },[notifs,filter]);

  const stats = { all:notifs.length, unread:notifs.filter((n:any)=>!n.read).length, boutique:notifs.filter((n:any)=>(n.type||"").toLowerCase().includes("boutique")).length, rappels:notifs.filter((n:any)=>{ const t=(n.type||"").toLowerCase(); return t.includes("rappel")||t.includes("expire")||t.includes("cache"); }).length };

  const grouped = useMemo(()=>{
    const today: WenzeNotif[]=[]; const yesterday: WenzeNotif[]=[]; const older: WenzeNotif[]=[];
    const now=new Date(); const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(); const startYesterday=startToday-86400000;
    for(const n of filtered){
      const ts=new Date((n as any).date||(n as any).createdAt||Date.now()).getTime();
      if(ts>=startToday) today.push(n); else if(ts>=startYesterday) yesterday.push(n); else older.push(n);
    }
    return { today, yesterday, older };
  },[filtered]);

  const handleOpen = (n: WenzeNotif)=>{
    try{ markAsRead((n as any).id); load(); }catch{}
    const link=(n as any).link||(n as any).url;
    if(link) router.push(link);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px] flex items-center gap-2">Notifications V6 {stats.unread>0&&<span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{stats.unread} non lues</span>}</h1>
            <p className="text-[10px] text-gray-500">{notifs.length} notifs • Taux {TAUX_CDF} • Même ticket {Object.keys(PALIERS).join("/")} • 0% comm</p>
          </div>
          <button onClick={()=>{ try{ markAllAsRead(cleanWa(JSON.parse(localStorage.getItem("wenze_user")||"{}").ownerWhatsapp||"")||JSON.parse(localStorage.getItem("wenze_user")||"{}").id||"guest"); load(); }catch{} }} className="text-[11px] bg-black text-white px-3 py-1.5 rounded-full font-bold">✓ Tout lire</button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto">
          {[
            {id:"all",label:`Tous • ${stats.all}`},
            {id:"boutique",label:`🏪 Boutique • ${stats.boutique}`},
            {id:"rappels",label:`⏰ Rappels • ${stats.rappels}`},
            {id:"boost",label:"🚀 Boost"},
            {id:"pub-video",label:"📢 Pub"},
            {id:"perso",label:"👤 Compte"},
          ].map(c=>(
            <button key={c.id} onClick={()=>setFilter(c.id as any)} className={`whitespace-nowrap py-2.5 px-4 rounded-full font-black text-[11px] border-2 ${filter===c.id?"bg-black text-white border-black":"bg-white border-gray-200"}`}>{c.label}</button>
          ))}
        </div>

        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px] flex justify-between">
          <span><b>V6 Nouvelle Politique:</b> 1 ticket = X places strictes sur Y jours (pas X/j) - ⭐ 5$ ({toCDFString(5)}) 4pl/7j • 🚀 10$ 10pl • 👑 20$ 30pl • Max 50 • Suppression libère place • Freemium 3 images à vie 30j puis 🔒 caché • 0% comm</span>
          <span className="bg-white text-black px-2 py-0.5 rounded-full font-black shrink-0 ml-2">{TAUX_CDF}</span>
        </div>

        {abInfo && (
          <div className="mt-3 bg-white border rounded-xl p-2.5 flex gap-2 text-[10px]">
            <span className={`px-2 py-1 rounded-full font-bold ${abInfo.isPaye?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"}`}>{abInfo.badge} {abInfo.palierId}</span>
            <span className="bg-gray-100 px-2 py-1 rounded-full">{abInfo.placesRestantes||0} places libres / {abInfo.maxPlaces||50} max</span>
            <span className="bg-gray-100 px-2 py-1 rounded-full">{abInfo.joursRestants||0}j restants</span>
            {abInfo.isCache && <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">🔒 Caché</span>}
          </div>
        )}
      </header>

      <div className="p-0">
        {filtered.length===0 ? (
          <div className="mt-6 mx-3 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">🔔</p>
            <p className="font-black mt-2 text-[13px]">{filter!=="all"?`Pas de notif "${filter}"`:"Aucune notification - Tout est à jour!"}</p>
            <p className="text-[11px] text-gray-500 mt-1">Tu recevras ici rappels expiration, boosts, ventes - Taux {TAUX_CDF} - Même prix pour tous</p>
            <Link href="/market" className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]">Aller au Marché</Link>
          </div>
        ) : (
          <div className="bg-white divide-y divide-gray-100">
            {[
              {label:"Aujourd'hui", list: grouped.today},
              {label:"Hier", list: grouped.yesterday},
              {label:"Plus ancien", list: grouped.older},
            ].map(g=> g.list.length>0 && (
              <div key={g.label}>
                <div className="bg-gray-50 px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider">{g.label} • {g.list.length}</div>
                {g.list.map((n:any)=>{
                  const cfg=notifConfig(n.type||n.categorie||"");
                  const isUnread=!n.read;
                  return (
                    <button key={n.id} onClick={()=>handleOpen(n)} className={`w-full text-left flex gap-3 p-4 hover:bg-gray-50 transition ${isUnread?"bg-orange-50/60 border-l-4 border-l-orange-500":""}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[16px] shrink-0 border ${cfg.color}`}>{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <p className={`text-[13px] truncate ${isUnread?"font-black":"font-bold"}`}>{n.titre||n.title||cfg.label}</p>
                          <span className="text-[10px] text-gray-400 shrink-0">{formatNotifDate(n.date||n.createdAt)}</span>
                        </div>
                        <p className={`text-[11px] mt-0.5 line-clamp-2 ${isUnread?"text-black":"text-gray-600"}`}>{n.message||n.text||n.description||""}</p>
                        <div className="flex gap-2 mt-1.5">
                          <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded-full">{cfg.label}</span>
                          {n.link&&<span className="text-[9px] bg-black text-white px-2 py-0.5 rounded-full">Voir →</span>}
                          {isUnread&&<span className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">Nouveau</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">+</span>Vendre</Link>
        <Link href="/notifications" className="font-black text-black flex flex-col items-center gap-0.5"><span className="text-[18px] relative">🔔{stats.unread>0&&<span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">{stats.unread}</span>}</span>Notifs</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
    }
