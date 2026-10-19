"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// On charge Leaflet seulement côté client
export default function MapKin({ lat, lng, name }: { lat: number, lng: number, name: string }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(()=>setIsClient(true),[]);

  if(!isClient) return <div className="h-48 bg-gray-100 rounded-xl animate-pulse">Chargement carte...</div>;

  return (
    <div className="rounded-xl overflow-hidden border">
      <iframe 
        width="100%" height="250" 
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01}%2C${lat-0.01}%2C${lng+0.01}%2C${lat+0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
        style={{border:0}}
      ></iframe>
      <div className="p-3 bg-white flex justify-between items-center">
        <div><p className="font-bold text-sm">{name}</p><p className="text-xs text-gray-500">{lat.toFixed(4)}, {lng.toFixed(4)}</p></div>
        <a target="_blank" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} className="bg-black text-white text-xs px-3 py-2 rounded-full">Itinéraire →</a>
      </div>
    </div>
  )
}
