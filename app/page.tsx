"use client";
import { useState } from "react";

const CATEGORIES = [
  { name: "Mode", icon: "👗", color: "bg-purple-100" },
  { name: "Téléphones", icon: "📱", color: "bg-purple-100" },
  { name: "Electronique", icon: "💻", color: "bg-purple-100" },
  { name: "Maison", icon: "🏠", color: "bg-purple-100" },
  { name: "Beauté", icon: "💄", color: "bg-purple-100" },
  { name: "Alimentation", icon: "🛒", color: "bg-orange-100" },
  { name: "Sport", icon: "⚽", color: "bg-orange-100" },
  { name: "Bébé", icon: "👶", color: "bg-orange-100" },
  { name: "Automobile", icon: "🚗", color: "bg-blue-100" },
  { name: "Services", icon: "🔧", color: "bg-blue-100" },
];

const FLASH = [
  { name: "Casque Bluetooth", price: "32 000 CDF", old: "40 000", discount: "-20%", img: "🎧" },
  { name: "Sneakers Nike", price: "85 000 CDF", old: "100 000", discount: "-15%", img: "👟" },
];

export default function WenzeBusiness() {
  const [search, setSearch] = useState("");
  
  return (
    <div className="max-w-[430px] mx-auto bg-white min-h-screen pb-20">
      {/* HEADER */}
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex justify-between items-center">
          <h1 className="text-[26px] font-black text-[#6C3CE0] tracking-tight">WENZE WENZE</h1>
          <div className="flex gap-3 text-xl">🔔 🛒</div>
        </div>
        <div className="mt-3 relative">
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Que recherchez-vous ?"
            className="w-full bg-gray-100 rounded-full py-3 px-5 pl-10 text-sm"
          />
          <span className="absolute left-3 top-3.5">🔍</span>
        </div>
      </header>

      {/* HERO */}
      <div className="m-4 rounded-2xl bg-gradient-to-br from-[#6C3CE0] to-[#FF8C00] p-[1px]">
        <div className="bg-black rounded-2xl overflow-hidden relative h-[180px] flex items-end p-4">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative text-white z-10">
            <h2 className="font-bold text-[18px] leading-tight">Wenze Wenze - Achetez, Vendez, Gagnez</h2>
            <p className="text-xs opacity-90 mt-1">Le marketplace qui booste votre business à Kinshasa</p>
          </div>
        </div>
      </div>

      {/* 10 CATEGORIES */}
      <section className="px-4">
        <div className="grid grid-cols-5 gap-3">
          {CATEGORIES.map(c => (
            <div key={c.name} className="flex flex-col items-center gap-1">
              <div className={`w-14 h-14 rounded-xl ${c.color} flex items-center justify-center text-2xl`}>{c.icon}</div>
              <span className="text-[10px] font-medium text-center leading-tight">{c.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* VENTES FLASH */}
      <section className="px-4 mt-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Ventes Flash</h3>
          <span className="text-[#6C3CE0] text-sm font-semibold">Voir tout ›</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {FLASH.map(p => (
            <div key={p.name} className="border rounded-xl p-3 relative">
              <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full">{p.discount}</span>
              <div className="text-5xl text-center py-4">{p.img}</div>
              <p className="font-bold text-[#6C3CE0] text-sm">{p.price}</p>
              <p className="text-xs text-gray-500 truncate">{p.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BOOSTEZ VISIBILITE - MONETISATION */}
      <section className="m-4 bg-[#6C3CE0] rounded-xl p-4 text-white flex justify-between items-center">
        <div>
          <h4 className="font-bold">Boostez votre visibilité !</h4>
          <p className="text-xs opacity-90">Sponsorisez votre boutique aujourd'hui</p>
        </div>
        <button className="bg-[#FF8C00] text-white text-xs font-bold px-4 py-2 rounded-full">Commencer</button>
      </section>

      {/* WENZE VIDEO TEASER */}
      <section className="px-4 mt-2">
        <h3 className="font-bold text-lg">Wenze Video</h3>
        <div className="mt-3 bg-black rounded-xl h-[120px] flex items-center justify-center text-white">
          <span>▶️ Découvrez les tendances vidéo →</span>
        </div>
      </section>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-3 text-[11px]">
        <span className="font-bold text-[#6C3CE0]">🏠 Accueil</span>
        <span>🏪 Boutiques</span>
        <span>🎬 Video</span>
        <span>🛒 Panier</span>
        <span>👤 Profil</span>
      </nav>
    </div>
  );
    }
