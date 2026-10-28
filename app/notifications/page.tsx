"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getNotifications, markAsRead, markAllAsRead, checkAndNotifyExpirations, WenzeNotif } from "@/lib/notifications";

export default function NotificationsPage(){
  const router = useRouter();
  const [notifs, setNotifs] = useState<WenzeNotif[]>([]);
  const [filter, setFilter] = useState<"all"|"boutique"|"rappels"|"boost"|"perso">("all");

  const load = ()=>{
    try{
      const user = JSON.parse(localStorage.getItem("wenze_user")||"{}");
      setNotifs(getNotifications(user.id || user.ownerWhatsapp || user.whatsapp));
    } catch{}
  };

  useEffect(()=>{ 
    // ✅ Check expirations à l'ouverture
    try{ checkAndNotifyExpirations(); } catch{}
    load(); 
    const i = setInterval(load, 2000); 
    const j = setInterval(()=> { try{ checkAndNotifyExpirations(); } catch{} }, 60*60*1000);
    return ()=> { clearInterval(i); clearInterval(j); }; 
  }, []);

  const filtered = useMemo(()=>{
    return notifs.filter(n=>{
      if(filter==="all") return true;
      if(filter==="boutique") return n.type==="new_boutique_annonce";
      if(filter==="rappels") return n.type.includes("rappel") || n.type.includes("expire");
      if(filter==="boost") return n.type.includes("boost");
      if(filter==="perso") return !n.forAllClients && (n.type==="publication_approved" || n.type==="abonnement_payed");
      return true;
    });
  }, [notifs, filter]);

  const unread = notifs.filter(n=> !n.read).length;

  const getIcon = (type: string)=>{
    if(type==="publication_approved") return "✅";
    if(type==="abonnement_payed") return "💳";
    if(type==="boost_payed") return "🚀";
    if(type==="new_boutique_annonce") return "🏬";
    if(type==="abonnement_rappel_5j") return "⏰";
    if(type==="abonnement_rappel_1j") return "⚠️";
    if(type==="abonnement_expire") return "❌";
    if(type==="boost_rappel_1j") return "⏰";
    if(type==="boost_expire") return "📉";
    if(type==="essai_rappel") return "⏳";
    return "🔔";
  };

  const getColor = (n: WenzeNotif)=>{
    if(!n.read) return "border-[#6C3CE0] bg-[#6C3CE0]/5 border-l-4 border-l-[#6C3CE0]";
    if(n.type.includes("expire")) return "border-red-200 bg-red-50 border-l-4 border-l-red-500";
    if(n.type.includes("rappel")) return "border-orange-200 bg-orange-50 border-l-4 border-l-orange-500";
    if(n.type==="abonnement_payed" || n.type==="boost_payed") return "border-green-200 bg-green-50 border-l-4 border-l-green-500";
    if(n.forAllClients) return "border-black bg-white border-l-4 border-l-black";
    return "border-gray-200 bg-white";
  };

  const timeAgo = (iso: string)=>{
    try{
      const diff = Date.now() - new Date(iso).getTime();
      const m = Math.floor(diff/60000);
      if(m<1) return "À l'instant";
      if(m<60) return `${m} min`;
      const h = Math.floor(m/60);
      if(h<24) return `${h}h`;
      const d = Math.floor(h/24);
      return `${d}j`;
    } catch{ return ""; }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <button onClick={()=> router.push("/")} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</button>
        <div className="flex-1">
          <h1 className="font-black text-[13px]">WENZE WENZE BUSINESS - Notifications 🔔 {unread>0?`• ${unread} non lues`:""}</h1>
          <p className="text-[8px] text-gray-500">
            {filtered.length} notifs • Boutiques payantes 5$/10$ + boosts = notif clients • Rappels J-5 J-1 expiration auto
          </p>
        </div>
        <button onClick={()=> { markAllAsRead(); load(); }} className="text-[9px] bg-black text-white px-3 py-2 rounded-full font-bold whitespace-nowrap">Tout lire ✓</button>
      </header>

      <div className="p-4 space-y-3">
        {/* ✅ FILTRES PRO AVEC NOUVEAUX TYPES */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {[
            { id:"all", label:`Toutes ${notifs.length}` },
            { id:"boutique", label:`🏬 Annonces payantes ${notifs.filter(n=>n.type==="new_boutique_annonce").length}` },
            { id:"rappels", label:`⏰ Rappels ${notifs.filter(n=> n.type.includes("rappel")||n.type.includes("expire")).length}` },
            { id:"boost", label:`🚀 Boosts ${notifs.filter(n=> n.type.includes("boost")).length}` },
            { id:"perso", label:`✅ Perso ${notifs.filter(n=> n.type==="publication_approved").length}` },
          ].map(f=>(
            <button key={f.id} onClick={()=> setFilter(f.id as any)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[10px] font-black border ${filter===f.id?"bg-black text-white border-black":"bg-white border-gray-200"}`}>{f.label}</button>
          ))}
        </div>

        {/* ✅ LÉGENDE DROITS */}
        <div className="bg-white border rounded-xl p-2.5 text-[9px] text-gray-600">
          <p className="font-black text-[10px]">WENZE WENZE BUSINESS - Droits notif intelligente:</p>
          <p className="mt-1">✅ <b>Freemium 3 vie:</b> Publication OK mais pas de notif clients • Sans rappel</p>
          <p>✅ <b>Boutique payante 5$/10$:</b> Notif perso + broadcast tous clients + rappel J-5 J-1 expiration</p>
          <p>✅ <b>Boost 1$/3$/5$:</b> TOP feed + notif clients + rappel 24h avant expiration</p>
          <p>✅ <b>Client occasionnel gratuit:</b> Sans notif clients • Boost payant = droit notif clients</p>
        </div>

        {filtered.length===0 ? (
          <div className="text-center py-16 bg-white border-2 border-dashed rounded-2xl">
            <p className="text-4xl">🔔</p>
            <p className="font-bold text-[13px] mt-2">Aucune notification dans {filter}</p>
            <p className="text-[10px] text-gray-500 mt-1">Seules boutiques payantes 5$/10$ + boosts notifient les clients<br/>Rappels abonnement J-5 J-1 + boost J-1 automatiques</p>
            <button onClick={()=> router.push("/publier")} className="mt-4 bg-[#6C3CE0] text-white px-5 py-2.5 rounded-full font-bold text-[11px]">Publier maintenant</button>
          </div>
        ) : filtered.map(n=>(
          <div key={n.id} onClick={()=> { markAsRead(n.id); load(); if(n.actionUrl) router.push(n.actionUrl); }} className={`rounded-2xl p-3 flex gap-3 cursor-pointer border-2 ${getColor(n)}`}>
            {n.image ? <img src={n.image} alt="" className="w-14 h-14 rounded-xl object-cover border bg-white"/> : <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl border bg-white ${n.type.includes("expire")?"text-red-500": n.type.includes("rappel")?"text-orange-500":""}`}>{getIcon(n.type)}</div>}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-2">
                <p className="font-black text-[11px] leading-tight">{n.title} {!n.read && <span className="ml-1 w-2 h-2 bg-red-500 rounded-full inline-block"></span>}</p>
                <p className="text-[9px] text-gray-400 whitespace-nowrap">{timeAgo(n.createdAt)}</p>
              </div>
              <p className="text-[10px] text-gray-700 mt-1 line-clamp-2 leading-tight">{n.message}</p>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                <span className="text-[8px] bg-black/10 px-2 py-1 rounded-full font-bold">{n.boutiqueName||"WENZE WENZE BUSINESS"} {n.forAllClients?"• 📢 Tous clients":"• Perso"}</span>
                {n.prix && <span className="text-[8px] bg-[#6C3CE0]/10 text-[#6C3CE0] px-2 py-1 rounded-full font-black">{n.prix}</span>}
                <span className={`text-[8px] px-2 py-1 rounded-full font-bold ${n.type.includes("expire")?"bg-red-500 text-white": n.type.includes("rappel")?"bg-orange-500 text-white": n.forAllClients?"bg-black text-white":"bg-white border"}`}>{n.type.replace("_"," ")}</span>
              </div>
            </div>
          </div>
        ))}

        {filtered.length>0 && (
          <div className="text-center py-4">
            <p className="text-[9px] text-gray-400">WENZE WENZE BUSINESS • Taux 1$ = 2300 CDF • 0% commission • Rappels auto toutes les heures</p>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <button onClick={()=> router.push("/")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</button>
        <button onClick={()=> router.push("/video")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🎥</span>Vidéo</button>
        <button onClick={()=> router.push("/publier")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">➕</span>Publier</button>
        <button onClick={()=> router.push("/boutiques")} className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</button>
        <button onClick={()=> router.push("/notifications")} className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">🔔</span>Notifs {unread>0 && <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded-full -mt-1">{unread}</span>}</button>
      </nav>
    </div>
  )
}
