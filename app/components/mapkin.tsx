"use client";
import { useEffect, useState } from "react";
import { TAUX_CDF } from "@/lib/paiement";

type Props = {
  lat?: number;
  lng?: number;
  name?: string;
  categorieId?: string; // 🛍️ 5$ ou 🏭 10$
  whatsapp?: string;
};

// ✅ Coordonnées fallback Kinshasa si pas de lat/lng
const DEFAULT_KIN = { lat: -4.325, lng: 15.322, name: "Kinshasa" };

export default function MapKin({ lat, lng, name, categorieId, whatsapp }: Props) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => setIsClient(true), []);

  const finalLat = lat ?? DEFAULT_KIN.lat;
  const finalLng = lng ?? DEFAULT_KIN.lng;
  const finalName = name || DEFAULT_KIN.name;
  
  const prixLabel = categorieId === "gros-autres" ? "🏭 10$" : "🛍️ 5$";
  const isGros = categorieId === "gros-autres";

  if (!isClient) {
    return <div className="h-48 bg-gray-100 rounded-2xl animate-pulse border flex items-center justify-center text-[11px] text-gray-400">Chargement carte Kinshasa... Taux {TAUX_CDF}</div>;
  }

  // ✅ FIX toFixe → toFixed(4) - ton bug build
  const bbox = `${finalLng - 0.008},${finalLat - 0.008},${finalLng + 0.008},${finalLat + 0.008}`;
  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${finalLat},${finalLng}`;

  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${finalLat},${finalLng}`;
  const osmLink = `https://www.openstreetmap.org/?mlat=${finalLat}&mlon=${finalLng}#map=16/${finalLat}/${finalLng}`;

  return (
    <div className="rounded-2xl overflow-hidden border-2 bg-white shadow-sm">
      <div className="relative">
        <iframe
          width="100%"
          height="220"
          src={osmEmbed}
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Carte ${finalName} - WENZE`}
        ></iframe>
        <div className={`absolute top-2 left-2 text-[9px] px-2 py-1 rounded-full font-black ${isGros ? "bg-black text-white" : "bg-[#6C3CE0] text-white"}`}>
          {prixLabel} • Taux {TAUX_CDF}
        </div>
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-[8px] px-2 py-1 rounded-full font-bold border">
          📍 {finalLat.toFixed(4)}, {finalLng.toFixed(4)}
        </div>
      </div>

      <div className="p-3 bg-white">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-black text-[13px] truncate">{finalName}</p>
            <p className="text-[10px] text-gray-500">Kinshasa • WENZE 2.0 • {isGros ? "🏭 Gros & Autres 10$ / 23 000 CDF" : "🛍️ Commerces & Services 5$ / 11 500 CDF"} • 0% commission</p>
          </div>
          <span className="text-[10px] bg-[#FFFBF0] border px-2 py-1 rounded-full font-bold">{finalLat.toFixed(4)}, {finalLng.toFixed(4)}</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="bg-black text-white text-[11px] font-bold py-2.5 rounded-full text-center">📍 Google Maps</a>
          <a href={osmLink} target="_blank" rel="noopener noreferrer" className="bg-white border-2 border-black text-black text-[11px] font-bold py-2.5 rounded-full text-center">🗺️ OSM</a>
          {whatsapp ? (
            <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Bonjour ${finalName} 👋 Je suis sur ta localisation WENZE ${finalLat},${finalLng} - Taux ${TAUX_CDF}`)}`} target="_blank" className="bg-[#25D366] text-white text-[11px] font-bold py-2.5 rounded-full text-center">💬 WhatsApp</a>
          ) : (
            <button onClick={()=> navigator.clipboard?.writeText(`${finalLat},${finalLng}`)} className="bg-gray-100 text-[11px] font-bold py-2.5 rounded-full">📋 Copier</button>
          )}
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
