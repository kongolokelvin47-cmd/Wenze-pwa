"use client";
import { useEffect, useState, useMemo } from "react";
import { TAUX_CDF, toCDFString, PALIERS } from "@/lib/paiement";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";

type Props = {
  lat?: number;
  lng?: number;
  name?: string;
  categorieId?: string;
  whatsapp?: string;
  palierId?: "STANDARD"|"PRO"|"PREMIUM"|"OCC"|string;
  badge?: string;
};

// ✅ Coordonnées fallback Kinshasa si pas de lat/lng
const DEFAULT_KIN = { lat: -4.325, lng: 15.322, name: "Kinshasa" };

export default function MapKin({ lat, lng, name, categorieId, whatsapp, palierId, badge }: Props) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => setIsClient(true), []);

  const finalLat = useMemo(()=>{
    const v = Number(lat);
    return !isNaN(v) && v!==0 ? v : DEFAULT_KIN.lat;
  },[lat]);
  
  const finalLng = useMemo(()=>{
    const v = Number(lng);
    return !isNaN(v) && v!==0 ? v : DEFAULT_KIN.lng;
  },[lng]);

  const finalName = name || DEFAULT_KIN.name;
  
  // V6 FIX: Même prix pour tous - plus de 5$ vs 10$ selon categorieId
  const categorie = useMemo(()=>{
    if(!categorieId) return null;
    try{ return getCategorieById(normalizeCategorie(categorieId)); }catch{ return null; }
  },[categorieId]);

  // V6: prix label = palier du vendeur, pas catégorie
  const prixLabel = useMemo(()=>{
    if(palierId){
      const p = (PALIERS as any)[palierId] || PALIERS.STANDARD;
      return `${badge||"⭐"} ${palierId} ${p.prixUSD||p.prix||5}$ / ${toCDFString(p.prixUSD||5)}`;
    }
    // Fallback V6 même prix
    return `⭐ STANDARD 5$ / ${toCDFString(5)} - Même prix Détail/Gros/Presta - Taux ${TAUX_CDF}`;
  },[palierId, badge]);

  const isGros = categorieId?.includes("gros");

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${finalLat.toFixed(6)},${finalLng.toFixed(6)}`;
  const mapsDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${finalLat.toFixed(6)},${finalLng.toFixed(6)}&destination_place_id=${encodeURIComponent(finalName)}`;
  const waUrl = whatsapp ? `https://wa.me/${whatsapp.toString().replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Bonjour ${finalName}, je viens de TonMarché.cd - Vu sur carte ${finalName} (${finalLat.toFixed(4)},${finalLng.toFixed(4)})`)}` : null;

  if (!isClient) {
    return <div className="h-48 bg-gray-100 rounded-2xl animate-pulse border flex items-center justify-center text-[11px] text-gray-400">Chargement carte Kinshasa... Taux {TAUX_CDF} - Même prix 5$/10$/20$</div>;
  }

  return (
    <div className="rounded-2xl border overflow-hidden bg-white">
      {/* Header V6 */}
      <div className="p-3 flex items-center justify-between bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs">📍</div>
          <div>
            <div className="font-bold text-xs">{finalName}</div>
            <div className="text-[10px] text-gray-500">{finalLat.toFixed(4)}, {finalLng.toFixed(4)} - {categorie?.titre||categorieId||"Kinshasa"} - {prixLabel}</div>
          </div>
        </div>
        {badge && <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full">{badge} {palierId||""}</span>}
      </div>

      {/* Map embed simple sans lib externe - OSM iframe + fallback image */}
      <div className="relative h-48 bg-gray-100">
        <iframe
          title={`Carte ${finalName}`}
          width="100%"
          height="100%"
          style={{ border:0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${(finalLng-0.01).toFixed(4)}%2C${(finalLat-0.01).toFixed(4)}%2C${(finalLng+0.01).toFixed(4)}%2C${(finalLat+0.01).toFixed(4)}&layer=mapnik&marker=${finalLat.toFixed(6)}%2C${finalLng.toFixed(6)}`}
        />
        <div className="absolute bottom-2 left-2 right-2 flex gap-2">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white/95 backdrop-blur text-[11px] font-bold px-3 py-2 rounded-xl border text-center hover:bg-white">🗺️ Voir sur Google Maps</a>
          <a href={mapsDirUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-black text-white text-[11px] font-bold px-3 py-2 rounded-xl text-center hover:bg-gray-900">🧭 Itinéraire</a>
        </div>
      </div>

      {/* Actions V6 */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {waUrl ? (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white text-[11px] font-bold px-3 py-2.5 rounded-xl text-center hover:bg-green-700">💬 WhatsApp {whatsapp?.slice(-9)}</a>
        ) : (
          <div className="bg-gray-100 text-gray-400 text-[11px] px-3 py-2.5 rounded-xl text-center">Pas de WhatsApp</div>
        )}
        <div className="bg-orange-50 border border-orange-100 text-[10px] px-3 py-2 rounded-xl">
          <b>V6 Même prix:</b><br/>
          STANDARD 5$ 4 places strictes<br/>
          PRO 10$ 10 places<br/>
          PREMIUM 20$ 30 places<br/>
          Taux {TAUX_CDF} - Max 50 - 0% comm
        </div>
      </div>

      <div className="px-3 pb-3 text-[9px] text-gray-400">
        V6 FIX: Ancien `gros-autres ? 10$ : 5$` supprimé → Maintenant `{prixLabel}` - Prix ticket ne dépend plus de catégorie - On vend visibilité, pas catégorie - 1 ticket = X places sur Y jours (pas X/j) - Cumulable - Suppression libère place
      </div>
    </div>
  );
      }
