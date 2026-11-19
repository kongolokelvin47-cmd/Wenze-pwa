"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { getNotifications, markAsRead, markAllAsRead, checkAndNotifyExpirations } from "@/lib/notifications";
import { TAUX_CDF, toCDFString, verifierAbonnement, PALIERS } from "@/lib/paiement";

const supabase: any = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : null;

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
  if(t.includes("annonce_dg")) return { icon:"📢", color:"bg-blue-100 border-blue-200 text-blue-700", label:"Annonce DG" };
  if(t.includes("tombola")) return { icon:"🎟️", color:"bg-yellow-100 border-yellow-300 text-yellow-800", label:"Tombola" };
  if(t.includes("paiement")||t.includes("paye")||t.includes("payé")) return { icon:"💰", color:"bg-green-100 border-green-200 text-green-700", label:"Paiement" };
  if(t.includes("moderation")||t.includes("suspend")) return { icon:"🛡️", color:"bg-red-50 border-red-200 text-red-700", label:"Modération" };
  if(t.includes("probleme")||t.includes("problème")) return { icon:"🚨", color:"bg-red-100 border-red-200 text-red-700", label:"Problème" };
  if(t.includes("boutique")||t.includes("annonce")) return { icon:"🏪", color:"bg-purple-100 border-purple-200 text-purple-700", label:"Boutique" };
  if(t.includes("rappel")||t.includes("expire")||t.includes("expir")) return { icon:"⏰", color:"bg-orange-100 border-orange-200 text-orange-700", label:"Rappel" };
  if(t.includes("boost")||t.includes("palier")||t.includes("premium")||t.includes("pro")||t.includes("standard")) return { icon:"🚀", color:"bg-black text-white border-black", label:"Boost" };
  if(t.includes("pub")||t.includes("video")||t.includes("promo")) return { icon:"📢", color:"bg-blue-100 border-blue-200 text-blue-700", label:"Pub" };
  if(t.includes("perso")||t.includes("compte")||t.includes("cache")) return { icon:"👤", color:"bg-red-50 border-red-200 text-red-700", label:"Compte" };
  return { icon:"🔔", color:"bg-gray-100 border-gray-200 text-gray-700", label:"Info" };
}

export default function NotificationsPage(){
  const router = useRouter();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all"|"dg"|"tombola"|"paiement"|"boutique"|"rappels"|"boost"|"pub-video"|"perso">("all");
  const [abInfo, setAbInfo] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [moi, setMoi] = useState<any>(null);

  async function load(){
    try{
      const raw = localStorage.getItem("wenze_user");
      const user = raw ? JSON.parse(raw) : {};
      setMoi(user);
      const uid = cleanWa(user.ownerWhatsapp||user.whatsapp||"") || user.id || "guest";
      if(uid==="guest"){ setNotifs([]); return; }

      // 1. Anciennes notifs locales - rappels, boost, cache - gardées
      const locales = (getNotifications(uid) || []).map((n: any) => ({
        ...n, source: "LOCAL", read: n.read, date: n.date || n.createdAt,
        titre: n.titre || n.title, message: n.message || n.text || n.description,
        type: n.type || n.categorie || "Info", link: n.link || n.url,
      }));

      // 2. Notifs DG personnalisées - Supabase
      let distantes: any[] = [];
      if (supabase) {
        const monType = (user.type_public || user.type || user.role || "CLIENT").toUpperCase();
        const monId = user.id;
        const monCode = user.code_pro || user.code_invitation || user.id;
        const monWa = cleanWa(user.ownerWhatsapp || user.whatsapp || "");
        const { data } = await supabase.from("notifications_perso").select("*").order("created_at", { ascending: false }).limit(100);
        distantes = (data || [])
          .filter((n: any) => {
            // PERSONNALISE : Seulement pour moi
            if (n.user_id === monId) return true;
            if (n.user_id && cleanWa(n.user_id) === monWa && monWa) return true;
            if (n.type_compte === monType) return true;
            if (n.type_compte === "TOUS") return true;
            if (n.code_invitation && n.code_invitation === monCode) return true;
            return false;
          })
          .map((n: any) => ({
            id: n.id, source: "DG", read: n.lu, date: n.created_at,
            titre: n.titre, message: n.message, type: n.type, link: n.lien,
            type_compte: n.type_compte, pour_moi_seul: n.user_id === monId,
          }));
      }

      // 3. Fusion + Tri : non lues d'abord, puis plus récentes
      const fusion = [...distantes, ...locales];
      const sorted = fusion.sort((a:any,b:any)=>{
        const aUnread = !a.read ? 1 : 0; const bUnread = !b.read ? 1 : 0;
        if(aUnread!==bUnread) return bUnread-aUnread;
        return new Date(b.date||0).getTime() - new Date(a.date||0).getTime();
      });
      setNotifs(sorted);
      try{ const ab=verifierAbonnement(); setAbInfo(ab); }catch{}
    }catch{ setNotifs([]); }
  }

  useEffect(()=>{
    try{ checkAndNotifyExpirations(); }catch{}
    load();
    if (!supabase) return;
    const ch = supabase.channel("notifs-perso")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications_perso" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications_perso" }, () => load())
      .subscribe();
    const interval = setInterval(()=>{ try{ checkAndNotifyExpirations(); }catch{} load(); }, 30000);
    const onStorage = (e: StorageEvent)=>{ if(e.key?.includes("wenze_notif")||e.key?.includes("wenze_user")) load(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("wenze-update", load);
    return ()=>{ supabase.removeChannel(ch); clearInterval(interval); window.removeEventListener("storage", onStorage); window.removeEventListener("wenze-update", load); };
  },[]);

  const filtered = useMemo(()=>{
    if(filter==="all") return notifs;
    return notifs.filter((n:any)=>{
      const t=(n.type||n.categorie||"").toLowerCase();
      if(filter==="dg") return t.includes("annonce_dg");
      if(filter==="tombola") return t.includes("tombola");
      if(filter==="paiement") return t.includes("paiement")||t.includes("paye")||t.includes("payé");
      if(filter==="boutique") return t.includes("boutique")||t.includes("annonce");
      if(filter==="rappels") return t.includes("rappel")||t.includes("expire")||t.includes("expir")||t.includes("cache");
      if(filter==="boost") return t.includes("boost")||t.includes("palier")||t.includes("premium")||t.includes("pro")||t.includes("standard");
      if(filter==="pub-video") return t.includes("pub")||t.includes("video")||t.includes("promo");
      if(filter==="perso") return t.includes("perso")||t.includes("compte");
      return true;
    });
  },[notifs,filter]);

  const stats = { all:notifs.length, unread:notifs.filter((n:any)=>!n.read).length, dg:notifs.filter((n:any)=>(n.type||"").toLowerCase().includes("annonce_dg")).length, tombola:notifs.filter((n:any)=>(n.type||"").toLowerCase().includes("tombola")).length, paiement:notifs.filter((n:any)=>(n.type||"").toLowerCase().includes("paiement")).length, boutique:notifs.filter((n:any)=>(n.type||"").toLowerCase().includes("boutique")).length, rappels:notifs.filter((n:any)=>{ const t=(n.type||"").toLowerCase(); return t.includes("rappel")||t.includes("expire")||t.includes("cache"); }).length };

  const grouped = useMemo(()=>{
    const today:any[]=[]; const yesterday:any[]=[]; const older:any[]=[];
    const now=new Date(); const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(); const startYesterday=startToday-86400000;
    for(const n of filtered){
      const ts=new Date((n as any).date||(n as any).createdAt||Date.now()).getTime();
      if(ts>=startToday) today.push(n); else if(ts>=startYesterday) yesterday.push(n); else older.push(n);
    }
    return { today, yesterday, older };
  },[filtered]);

  const handleOpen = async (n: any)=>{
    try{
      if (n.source === "DG" && supabase) await supabase.from("notifications_perso").update({ lu: true }).eq("id", n.id);
      else markAsRead(n.id);
    }catch{}
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setSelected(n);
  };

  const handleToutLire = async () => {
    try{
      if (supabase) {
        const idsDG = notifs.filter(n => n.source === "DG" && !n.read).map(n => n.id);
        for (const id of idsDG) await supabase.from("notifications_perso").update({ lu: true }).eq("id", id);
      }
      const raw = localStorage.getItem("wenze_user") || "{}";
      const u = JSON.parse(raw);
      markAllAsRead(cleanWa(u.ownerWhatsapp||u.whatsapp||"") || u.id || "guest");
      load();
    }catch{}
  };

  const handleGoLink = ()=>{
    if(!selected) return;
    const link=(selected as any).link||(selected as any).url;
    setSelected(null);
    if(link) router.push(link);
  };
    return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[15px] flex items-center gap-2">Mes Notifications {stats.unread>0&&<span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{stats.unread} non lues</span>}</h1>
            <p className="text-[10px] text-gray-500">👋 {moi?.nom || moi?.proprietaire || "Bonjour"} • {moi?.type_public || moi?.type || moi?.role || "CLIENT"} • Tu ne vois QUE tes opérations</p>
          </div>
          <button onClick={handleToutLire} className="text-[11px] bg-black text-white px-3 py-1.5 rounded-full font-bold">✓ Tout lire</button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto">
          {[
            {id:"all",label:`Tous • ${stats.all}`},
            {id:"dg",label:`📢 Annonce DG • ${stats.dg}`},
            {id:"tombola",label:`🎟️ Tombola • ${stats.tombola}`},
            {id:"paiement",label:`💰 Paiement • ${stats.paiement}`},
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
          <span><b>🔒 Personnalisé :</b> Tu ne vois que tes opérations + les annonces DG pour ton type de compte. Un Client ne voit pas les notifs d'une Boutique.</span>
          <span className="bg-white text-black px-2 py-0.5 rounded-full font-black shrink-0 ml-2">{TAUX_CDF}</span>
        </div>

        {abInfo && (
          <div className="mt-3 bg-white border rounded-xl p-2.5 flex gap-2 text-[10px] flex-wrap">
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
            <p className="font-black mt-2 text-[13px]">{filter!=="all"?`Pas de notif "${filter}"`:"Aucune notification pour toi - Tout est à jour!"}</p>
            <p className="text-[11px] text-gray-500 mt-1">Quand le DG valide ta boutique, ton paiement, ou lance une Tombola pour ton type de compte, ça apparaîtra ici, seulement pour toi.</p>
            <Link href="/" className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]">Aller à l'accueil</Link>
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
                          <p className={`text-[13px] truncate ${isUnread?"font-black":"font-bold"}`}>{(n.titre||n.title||cfg.label||"").toString().replace(/V6/gi,"WENZE")}</p>
                          <span className="text-[10px] text-gray-400 shrink-0">{formatNotifDate(n.date||n.createdAt)}</span>
                        </div>
                        <p className={`text-[11px] mt-0.5 line-clamp-2 ${isUnread?"text-black":"text-gray-600"}`}>{(n.message||n.text||n.description||"").toString().replace(/V6/gi,"WENZE")}</p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded-full">{cfg.label}</span>
                          {n.source === "DG" && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black">📢 DG</span>}
                          {n.pour_moi_seul && <span className="text-[9px] bg-[#FF6B00] text-white px-2 py-0.5 rounded-full font-black">Pour toi seul</span>}
                          {n.type_compte && n.type_compte !== "TOUS" && <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded-full">Pour : {n.type_compte}</span>}
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

      {/* MODAL LECTURE COMPLETE */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=> setSelected(null)} />
          <div className="relative bg-white w-full max-w-[430px] rounded-t-[24px] sm:rounded-[24px] p-5 max-h-[85vh] overflow-auto">
            <div className="flex justify-between items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${notifConfig((selected as any).type||"").color}`}>{notifConfig((selected as any).type||"").icon}</div>
              <button onClick={()=> setSelected(null)} className="w-8 h-8 bg-gray-100 rounded-full font-black">×</button>
            </div>
            <h2 className="font-black text-[15px] mt-4">{((selected as any).titre||(selected as any).title||"Notification").toString().replace(/V6/gi,"WENZE")}</h2>
            <p className="text-[11px] text-gray-400 mt-1">WENZE • {formatNotifDate((selected as any).date||(selected as any).createdAt)} • Taux {TAUX_CDF} {selected.source === "DG" && "• 📢 Envoyée par le DG"}{selected.pour_moi_seul && " • Pour toi seul"}</p>
            <div className="mt-4 bg-[#FFFBF0] border rounded-2xl p-4">
              <p className="text-[13px] leading-[19px] whitespace-pre-wrap">{((selected as any).message||(selected as any).text||(selected as any).description||"").toString().replace(/V6/gi,"WENZE")}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={()=> setSelected(null)} className="flex-1 bg-gray-100 font-black py-3 rounded-full text-[13px]">Fermer</button>
              {(selected as any).link && <button onClick={handleGoLink} className="flex-1 bg-black text-white font-black py-3 rounded-full text-[13px]">Ouvrir →</button>}
            </div>
            <p className="text-[10px] text-gray-500 mt-3 text-center">✅ Marquée comme lue</p>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/video" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🎬</span>Vidéo</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">+</span>Publier</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Boutique</Link>
        <Link href="/panier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🛒</span>Panier</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
      }
