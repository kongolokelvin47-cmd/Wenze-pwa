"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { TAUX_CDF } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

type PanierItem = {
  id: string;
  titre: string;
  prix: string;
  prixUSD?: number;
  photo?: string;
  vendeur: string;
  whatsapp: string;
  ownerWhatsapp?: string;
  commune?: string;
  typeMedia?: "image" | "video";
  video?: string;
};

export default function Panier() {
  const [items, setItems] = useState<PanierItem[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("wenze_panier") || localStorage.getItem("wenze_favoris") || "[]");
      setItems(saved);
    } catch {}
  }, []);

  const removeItem = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    localStorage.setItem("wenze_panier", JSON.stringify(newItems));
    localStorage.setItem("wenze_favoris", JSON.stringify(newItems));
  };

  const clearPanier = () => {
    if (!confirm("Vider panier?")) return;
    setItems([]);
    localStorage.removeItem("wenze_panier");
    localStorage.removeItem("wenze_favoris");
  };

  const totalUSD = items.reduce((acc, item) => acc + (item.prixUSD || parseFloat(item.prix) || 10), 0);
  const totalCDF = totalUSD * TAUX_CDF;

  const getWaLinkGlobal = () => {
    if (items.length === 0) return "#";
    const liste = items.map(i => `- ${i.titre} (${i.prix}) - ${i.vendeur} - 🔒 ${cleanWhatsapp(i.ownerWhatsapp||i.whatsapp).slice(-4)}`).join("\n");
    const msg = `Bonjour depuis WENZE BUSINESS 👋\n\nJe veux ${items.length} article(s):\n${liste}\n\nTotal: ${totalUSD}$ / ${totalCDF.toLocaleString()} CDF\nTaux 1$=${TAUX_CDF} CDF\n\nDispo à Kin?`;
    const firstTel = cleanWhatsapp(items[0]?.ownerWhatsapp || items[0]?.whatsapp || "243810000000");
    return `https://wa.me/${firstTel}?text=${encodeURIComponent(msg)}`;
  };

  if (items.length === 0) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen p-10 text-center bg-[#FFFBF0]">
        <h1 className="text-2xl font-bold">Panier 🛒 Vide</h1>
        <p className="mt-2 text-gray-500 text-sm">Ajoute des produits - Image 150KB / Vidéo 10MB</p>
        <Link href="/" className="mt-6 inline-block bg-[#6C3CE0] text-white px-6 py-3 rounded-full font-bold">Continuer achats</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <Link href="/" className="text-xs text-[#6C3CE0] font-bold">← Continuer achats</Link>
        <h1 className="text-xl font-black mt-1">Panier 🛒 ({items.length}) - {totalUSD}$</h1>
        <p className="text-[11px] text-gray-500">0% commission • ownerWhatsapp vérifié</p>
      </div>

      <div className="p-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-3 flex gap-3 border shadow-sm">
            <div className="w-16 h-16 bg-white border rounded-lg flex items-center justify-center overflow-hidden">
              {item.photo ? <img src={item.photo} alt={item.titre} className="max-w-full max-h-full object-contain" /> : "📦"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{item.titre}</h3>
              <p className="text-xs text-gray-500">{item.vendeur} • 🔒 {cleanWhatsapp(item.ownerWhatsapp||item.whatsapp).slice(-4)}</p>
              <p className="text-sm font-bold text-[#6C3CE0]">{item.prix} • {((item.prixUSD || parseFloat(item.prix) || 10) * TAUX_CDF).toLocaleString()} CDF</p>
            </div>
            <button onClick={() => removeItem(item.id)} className="text-xs bg-red-50 text-red-500 font-bold px-3 py-1 rounded-full border">✕</button>
          </div>
        ))}

        <div className="bg-white rounded-xl p-4 border-2 border-dashed border-[#6C3CE0] mt-4">
          <div className="flex justify-between text-sm font-black">
            <span>Total {items.length} articles</span>
            <span>{totalUSD}$ / {totalCDF.toLocaleString()} CDF</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Taux: 1$ = {TAUX_CDF} CDF • Image 150KB • Vidéo 10MB</p>
          <a href={getWaLinkGlobal()} target="_blank" className="mt-3 block w-full bg-[#00C950] text-white text-center py-3 rounded-full font-bold">💬 Commander via WhatsApp</a>
          <button onClick={clearPanier} className="mt-2 w-full text-xs text-gray-500">Vider panier</button>
        </div>
      </div>
    </div>
  );
}

// 🔥 FIX VERCEL - SANS ÇA TU RESTES EN ROUGE
export const dynamic = 'force-dynamic';
