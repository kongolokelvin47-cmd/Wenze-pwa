"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { TAUX_CDF } from "@/lib/paiement";

type PanierItem = {
  id: string;
  titre: string;
  prix: string;
  prixUSD?: number;
  photo?: string;
  vendeur: string;
  whatsapp: string;
  commune?: string;
};

export default function Panier() {
  const [items, setItems] = useState<PanierItem[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("wenze_panier") || localStorage.getItem("wenze_favoris") || "[]");
    setItems(saved);
  }, []);

  const removeItem = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    localStorage.setItem("wenze_panier", JSON.stringify(newItems));
    localStorage.setItem("wenze_favoris", JSON.stringify(newItems));
  };

  const clearPanier = () => {
    setItems([]);
    localStorage.removeItem("wenze_panier");
    localStorage.removeItem("wenze_favoris");
  };

  const totalUSD = items.reduce((acc, item) => acc + (item.prixUSD || 10), 0);
  const totalCDF = totalUSD * TAUX_CDF;

  const getWaLinkGlobal = () => {
    if (items.length === 0) return "#";
    const liste = items.map(i => `- ${i.titre} (${i.prix}) - Vendeur: ${i.vendeur}`).join("\n");
    const msg = `Bonjour 👋 Je vous contacte depuis WENZE WENZE BUSINESS.\n\nJe suis intéressé par ${items.length} article(s) de mon panier:\n${liste}\n\nTotal estimé: ${totalUSD}$ / ${totalCDF.toLocaleString()} CDF\n\nDisponible à Kinshasa? Merci!`;
    // Contacte le premier vendeur + message groupé, il transfèrera
    const firstTel = items[0]?.whatsapp || "243810000000";
    return `https://wa.me/${firstTel}?text=${encodeURIComponent(msg)}`;
  };

  if (items.length === 0) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen p-10 text-center bg-[#FFFBF0]">
        <h1 className="text-2xl font-bold">Votre Panier 🛒</h1>
        <p className="mt-2 text-gray-500 text-sm">Votre panier est vide. Ajoutez des produits depuis l'accueil.</p>
        <p className="mt-2 text-[11px] text-gray-400">WENZE = 0% commission • Contact direct WhatsApp vendeur</p>
        <Link href="/" className="mt-6 inline-block bg-[#6C3CE0] text-white px-6 py-3 rounded-full font-bold shadow-wenze">Continuer vos achats</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <Link href="/" className="text-xs text-[#6C3CE0] font-bold">← Continuer achats</Link>
        <h1 className="text-xl font-black mt-1">Panier 🛒 ({items.length})</h1>
        <p className="text-[11px] text-gray-500">0% commission • Paiement direct au vendeur en $ ou CDF</p>
      </div>

      <div className="p-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-3 flex gap-3 border shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl overflow-hidden">
              {item.photo ? <img src={item.photo} alt={item.titre} className="w-full h-full object-cover" /> : "📦"}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm line-clamp-1">{item.titre}</h3>
              <p className="text-xs text-gray-500">{item.vendeur} • {item.commune || "Kinshasa"}</p>
              <p className="text-sm font-bold text-[#6C3CE0]">{item.prix} • {(item.prixUSD || 10 * TAUX_CDF).toLocaleString()} CDF</p>
            </div>
            <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 font-bold px-2">✕</button>
          </div>
        ))}

        <div className="bg-white rounded-xl p-4 border-2 border-dashed border-[#6C3CE0] mt-4">
          <div className="flex justify-between text-sm">
            <span>Total estimé ({items.length} articles)</span>
            <span className="font-bold">{totalUSD}$ / {totalCDF.toLocaleString()} CDF</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Taux: 1$ = {TAUX_CDF} CDF • Livraison à discuter avec vendeurs</p>
          
          <a href={getWaLinkGlobal()} target="_blank" className="mt-3 block w-full bg-[#00C950] text-white text-center py-3 rounded-full font-bold">
            💬 Contacter vendeurs sur WhatsApp
          </a>
          <button onClick={clearPanier} className="mt-2 w-full text-xs text-gray-500">Vider panier</button>
        </div>

        <div className="bg-black text-white rounded-xl p-3 text-[11px]">
          <p className="font-bold">🔒 WENZE WENZE BUSINESS - 0% commission</p>
          <p className="opacity-80 mt-1">Vous payez directement le vendeur en $ / CDF / Mobile Money. WENZE ne touche pas votre argent. Abonnement vendeur: Pro 5$ / 11500 CDF, Grossiste 25$ / 57500 CDF.</p>
        </div>
      </div>
    </div>
  );
}
