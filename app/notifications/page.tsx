"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getNotifications, markAsRead, markAllAsRead, checkAndNotifyExpirations, WenzeNotif, getUnreadCount } from "@/lib/notifications";

export default function NotificationsPage(){
  const router = useRouter();
  const [notifs, setNotifs] = useState<WenzeNotif[]>([]);
  const [filter, setFilter] = useState<"all"|"boutique"|"rappels"|"boost"|"pub-video"|"perso">("all");

  const load = ()=>{
    try{
      const user = JSON.parse(localStorage.getItem("wenze_user")||"{}");
      const uid = user.id || user.ownerWhatsapp || user.whatsapp || "guest";
      setNotifs(getNotifications(uid));
    } catch{ setNotifs([]); }
  };

  useEffect(()=>{ 
    // ✅ Check intelligent J-5 J-1 abonnement + boost + pub vidéo à l'ouverture
    try{ checkAndNotifyExpirations(); } catch(e){ console.log("check exp",e); }
    load(); 
    const i = setInterval(load, 2500); 
    const j = setInterval(()=> { try{ checkAndNotifyExpirations(); load(); } catch{} }, 15000); // check toutes les 15s
    return ()=> { clearInterval(i); clearInterval(j); };
  },[]);

  const filtered = useMemo(()=>{
    if(filter==="all") return notifs;
    if(filter==="rappels") return notifs.filter(n=> n.type?.includes("rappel") || n.type?.includes("expiration") || n.type?.includes("expire"));
    if(filter==="boutique") return notifs.filter(n=> n.type?.includes("boutique") || n.type?.includes("abonnement") || n.type?.includes("publication"));
    if(filter==="boost") return notifs.filter(n=> n.type?.includes("boost"));
    if(filter==="pub-video") return notifs.filter(n=> n.type?.includes("pub") || n.type?.includes("video"));
    if(filter==="perso") return notifs.filter(n=> n.type?.includes("perso") || n.type?.includes("message") || n.type?.includes("commande"));
    return notifs;
  },[notifs, filter]);

  const unread = useMemo(()=> notifs.filter(n=>!n.read).length, [notifs]);

  const getIcon = (type:string)=>{
    if(type?.includes("pub")) return "🎬";
    if(type?.includes("boost")) return "🚀";
    if(type?.includes("rappel")||type?.includes("expiration")) return "⏰";
    if(type?.includes("abonnement")||type?.includes("boutique")) return "👑";
    if(type?.includes("publication")) return "🔔";
    return "📦";
  };

  const getColor = (type:string, read?:boolean)=>{
    if(read) return "bg-white border-gray-200";
    if(type?.includes("rappel")||type?.includes("expiration")) return "bg-red-50 border-red-300";
    if(type?.includes("pub")) return "bg-purple-50 border-purple-300";
    if(type?.includes("boost")) return "bg-orange-50 border-orange-300";
    if(type?.includes("abonnement")) return "bg-green-50 border-green-300";
    return "bg-[#FFFBF0] border-black";
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      {/* HEADER */}
      <div className="sticky top-0 bg-white border-b-2 border-black p-4 z-10">
        <div className="flex items-center justify-between">
          <h1 className="font-black text-[18px]">🔔 WENZE WENZE BUSINESS</h1>
          <span className="bg-black text-white text-[10px] font-black px-3 py-1 rounded-full">{unread} non lus</span>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">Rappels J-5 J-1 auto • Pub vidéo + Boutique + Boost = même système intelligent • 0% commission</p>
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          {[
            {id:"all", label:"Tout", count:notifs.length},
            {id:"rappels", label:"⏰ Rappels J-5 J-1", count:notifs.filter(n=>n.type?.includes("rappel")||n.type?.includes("expiration")).length},
            {id:"boutique", label:"👑 Boutique", count:notifs.filter(n=>n.type?.includes("abonnement")||n.type?.includes("boutique")||n.type?.includes("publication")).length},
            {id:"boost", label:"🚀 Boost", count:notifs.filter(n=>n.type?.includes("boost")).length},
            {id:"pub-video", label:"🎬 Pub Vidéo", count:notifs.filter(n=>n.type?.includes("pub")).length},
            {id:"perso", label:"💬 Perso", count:notifs.filter(n=>n.type?.includes("perso")||n.type?.includes("message")).length},
          ].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id as any)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-black border-2 ${filter===f.id?"bg-black text-white border-black":"bg-white text-black border-gray-200"}`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        {unread>0 && (
          <button onClick={()=>{ markAllAsRead(); load(); }} className="mt-3 w-full bg-black text-white py-2 rounded-full font-black text-[11px]">Marquer tout lu ({unread})</button>
        )}
      </div>

      {/* LIST */}
      <div className="p-3 space-y-3">
        {filtered.length===0 ? (
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center mt-8">
            <p className="text-[40px]">🔔</p>
            <p className="font-black text-[14px] mt-2">Aucune notification {filter!=="all"?`dans ${filter}`:""}</p>
            <p className="text-[11px] text-gray-500 mt-1">Tes rappels J-5 J-1 abonnement / boost / pub vidéo apparaîtront ici auto.<br/>Publie en payant 1$/5$/10$ pour déclencher 🔔 broadcast clients.</p>
            <button onClick={()=>{ checkAndNotifyExpirations(); load(); }} className="mt-4 bg-white border-2 border-black px-4 py-2 rounded-full font-black text-[11px]">🔄 Vérifier rappels maintenant</button>
          </div>
        ) : filtered.map((n:any)=>(
          <div key={n.id} className={`border-2 rounded-2xl p-3 ${getColor(n.type, n.read)} cursor-pointer`} onClick={()=>{ markAsRead(n.id); load(); if(n.data?.annonceId) router.push(`/produit/${n.data.annonceId}`); else if(n.data?.pubId) router.push("/video"); else if(n.type?.includes("rappel")||n.type?.includes("expiration")) router.push("/abonnement"); }}>
            <div className="flex gap-3">
              <div className="text-[22px]">{getIcon(n.type)} </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-black text-[12px]">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                </div>
                <p className="text-[11px] text-gray-700 mt-1 leading-[14px]">{n.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] text-gray-400">{n.createdAt? new Date(n.createdAt).toLocaleString("fr-FR"): "Maintenant"}</span>
                  {n.type?.includes("rappel") && <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">ACTION J-5 J-1</span>}
                  {n.type?.includes("pub") && <span className="bg-purple-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full">PUB VIDEO</span>}
                  {n.type?.includes("boost") && <span className="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">BOOST TOP</span>}
                </div>
                {(n.type?.includes("rappel")||n.type?.includes("expiration")) && (
                  <button className="mt-2 bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-full" onClick={(e)=>{ e.stopPropagation(); router.push(n.data?.pubId?"/abonnement?mode=pub-video":"/abonnement"); }}>Renouveler {n.data?.prixUSD||""}$ - Garder droits 🔔</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-[9px] font-bold">
        WENZE WENZE BUSINESS • Taux 2300 CDF • 0% commission • Rappels auto
      </div>
    </div>
  );
                          }
