"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getNotifications, markAsRead, markAllAsRead, checkAndNotifyExpirations, WenzeNotif } from "@/lib/notifications";

export default function NotificationsPage(){
  const router = useRouter();
  const [notifs, setNotifs] = useState<WenzeNotif[]>([]);
  const [filter, setFilter] = useState<"all"|"boutique"|"rappels"|"boost"|"pub-video"|"perso">("all");

  function load(){
    try{
      const raw = localStorage.getItem("wenze_user");
      const user = raw ? JSON.parse(raw) : {};
      const uid = user.id || user.ownerWhatsapp || user.whatsapp || "guest";
      const list = getNotifications(uid);
      setNotifs(list || []);
    }catch{
      setNotifs([]);
    }
  }

  useEffect(function(){
    try{ checkAndNotifyExpirations(); }catch(e){ console.log("check exp",e); }
    load();
    const i = setInterval(load, 2500);
    const j = setInterval(function(){
      try{ checkAndNotifyExpirations(); load(); }catch{}
    }, 15000);
    return function(){ clearInterval(i); clearInterval(j); };
  },[]);

  const filtered = useMemo(function(){
    const result:WenzeNotif[] = [];
    for(let k=0;k<notifs.length;k++){
      const n = notifs[k];
      const type = n.type || "";
      if(filter === "all"){ result.push(n); continue; }
      if(filter === "rappels"){
        if(type.indexOf("rappel") >=0 || type.indexOf("expiration") >=0 || type.indexOf("expire") >=0) result.push(n);
        continue;
      }
      if(filter === "boutique"){
        if(type.indexOf("boutique") >=0 || type.indexOf("abonnement") >=0 || type.indexOf("publication") >=0) result.push(n);
        continue;
      }
      if(filter === "boost"){
        if(type.indexOf("boost") >=0) result.push(n);
        continue;
      }
      if(filter === "pub-video"){
        if(type.indexOf("pub") >=0 || type.indexOf("video") >=0) result.push(n);
        continue;
      }
      if(filter === "perso"){
        if(type.indexOf("perso") >=0 || type.indexOf("message") >=0 || type.indexOf("commande") >=0) result.push(n);
        continue;
      }
    }
    return result;
  },[notifs, filter]);

  const unread = useMemo(function(){
    let c = 0;
    for(let i=0;i<notifs.length;i++){ if(!notifs[i].read) c++; }
    return c;
  },[notifs]);

  function getIcon(type:string){
    const t = type || "";
    if(t.indexOf("pub") >=0) return "🎬";
    if(t.indexOf("boost") >=0) return "🚀";
    if(t.indexOf("rappel") >=0 || t.indexOf("expiration") >=0) return "⏰";
    if(t.indexOf("abonnement") >=0 || t.indexOf("boutique") >=0) return "👑";
    if(t.indexOf("publication") >=0) return "🔔";
    return "📦";
  }

  function getColor(type:string, read?:boolean){
    const t = type || "";
    if(read) return "bg-white border-gray-200";
    if(t.indexOf("rappel") >=0 || t.indexOf("expiration") >=0) return "bg-red-50 border-red-300";
    if(t.indexOf("pub") >=0) return "bg-purple-50 border-purple-300";
    if(t.indexOf("boost") >=0) return "bg-orange-50 border-orange-300";
    if(t.indexOf("abonnement") >=0) return "bg-green-50 border-green-300";
    return "bg-[#FFFBF0] border-black";
  }

  function countBy(typeStr:string){
    let c = 0;
    for(let i=0;i<notifs.length;i++){
      const t = notifs[i].type || "";
      if(t.indexOf(typeStr) >=0) c++;
    }
    return c;
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <div className="sticky top-0 bg-white border-b-2 border-black p-4 z-10">
        <div className="flex items-center justify-between">
          <h1 className="font-black text-[18px]">🔔 WENZE WENZE BUSINESS</h1>
          <span className="bg-black text-white text-[10px] font-black px-3 py-1 rounded-full">{unread} non lus</span>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">Rappels J-5 J-1 auto • Pub vidéo + Boutique + Boost = même système • 0% commission</p>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          <button onClick={function(){ setFilter("all"); }} className={"whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-black border-2 "+(filter==="all"?"bg-black text-white border-black":"bg-white text-black border-gray-200")}>Tout ({notifs.length})</button>
          <button onClick={function(){ setFilter("rappels"); }} className={"whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-black border-2 "+(filter==="rappels"?"bg-black text-white border-black":"bg-white text-black border-gray-200")}>⏰ Rappels J-5 J-1 ({countBy("rappel")})</button>
          <button onClick={function(){ setFilter("boutique"); }} className={"whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-black border-2 "+(filter==="boutique"?"bg-black text-white border-black":"bg-white text-black border-gray-200")}>👑 Boutique ({countBy("abonnement")})</button>
          <button onClick={function(){ setFilter("boost"); }} className={"whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-black border-2 "+(filter==="boost"?"bg-black text-white border-black":"bg-white text-black border-gray-200")}>🚀 Boost ({countBy("boost")})</button>
          <button onClick={function(){ setFilter("pub-video"); }} className={"whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-black border-2 "+(filter==="pub-video"?"bg-black text-white border-black":"bg-white text-black border-gray-200")}>🎬 Pub Vidéo ({countBy("pub")})</button>
        </div>
        {unread>0 ? (
          <button onClick={function(){ markAllAsRead(); load(); }} className="mt-3 w-full bg-black text-white py-2 rounded-full font-black text-[11px]">Marquer tout lu ({unread})</button>
        ) : null}
      </div>

      <div className="p-3 space-y-3">
        {filtered.length===0 ? (
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center mt-8">
            <p className="text-[40px]">🔔</p>
            <p className="font-black text-[14px] mt-2">Aucune notification {filter!=="all"?filter:""}</p>
            <p className="text-[11px] text-gray-500 mt-1">Tes rappels J-5 J-1 abonnement / boost / pub vidéo apparaîtront ici auto.<br/>Publie en payant 1$/5$/10$ pour déclencher 🔔 broadcast clients.</p>
            <button onClick={function(){ try{ checkAndNotifyExpirations(); }catch{} load(); }} className="mt-4 bg-white border-2 border-black px-4 py-2 rounded-full font-black text-[11px]">🔄 Vérifier rappels maintenant</button>
          </div>
        ) : filtered.map(function(n:any){
          const type = n.type || "";
          const isRappel = type.indexOf("rappel") >=0 || type.indexOf("expiration") >=0;
          const isPub = type.indexOf("pub") >=0;
          const isBoost = type.indexOf("boost") >=0;
          let dateStr = "Maintenant";
          try{ if(n.createdAt) dateStr = new Date(n.createdAt).toLocaleString("fr-FR"); }catch{}
          let annonceId = "";
          if(n.data && n.data.annonceId) annonceId = n.data.annonceId;
          let pubId = "";
          if(n.data && n.data.pubId) pubId = n.data.pubId;
          let prixUSD = "";
          if(n.data && n.data.prixUSD) prixUSD = n.data.prixUSD;

          return (
            <div key={n.id} className={"border-2 rounded-2xl p-3 cursor-pointer "+getColor(type, n.read)} onClick={function(){ markAsRead(n.id); load(); if(annonceId) router.push("/produit/"+annonceId); else if(pubId) router.push("/video"); else if(isRappel) router.push("/abonnement"); }}>
              <div className="flex gap-3">
                <div className="text-[22px]">{getIcon(type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-[12px]">{n.title}</p>
                    {!n.read ? <span className="w-2 h-2 bg-red-500 rounded-full"></span> : null}
                  </div>
                  <p className="text-[11px] text-gray-700 mt-1 leading-[14px]">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-gray-400">{dateStr}</span>
                    {isRappel ? <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">ACTION J-5 J-1</span> : null}
                    {isPub ? <span className="bg-purple-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full">PUB VIDEO</span> : null}
                    {isBoost ? <span className="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">BOOST TOP</span> : null}
                  </div>
                  {isRappel ? (
                    <button className="mt-2 bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-full" onClick={function(e:any){ e.stopPropagation(); router.push(pubId?"/abonnement?mode=pub-video":"/abonnement"); }}>Renouveler {prixUSD}$ - Garder droits 🔔</button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-[9px] font-bold">
        WENZE WENZE BUSINESS • Taux 2300 CDF • 0% commission • Rappels auto
      </div>
    </div>
  );
                                                                                                                                                            }
