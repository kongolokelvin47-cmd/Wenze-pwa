"use client";
import { useState } from "react";
import Link from "next/link";

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
  { name: "Casque Bluetooth", price: "32 000 CDF", discount: "-20%", img: "🎧" },
  { name: "Sneakers Nike", price: "85 000 CDF", discount: "-15%", img: "👟" },
];

export default function WenzeBusiness() {
  const [search, setSearch] = useState("");
  
  return (
    <div className="max-w-[430px] mx-auto bg-white min-h-screen pb-20">
      {/* HEADER - NOM COMPLET */}
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[22px] font-black text-[#6C3CE0] tracking-tight leading-none">WENZE WENZE</h1>
            <p className="text-[11px] font-bold text-[#FF8C00] tracking-[3px]">BUSINESS</p>
          </div>
          <div className="flex gap-3 text-xl">🔔 🛒</div>
        </div>
        <div className="mt-3 relative">
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Que recherchez-vous à Kinshasa ?"
            className="w-full bg-gray-100 rounded-full py-3 px-5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#6C3CE0]"
          />
          <span className="absolute left-3 top-3.5">🔍</span>
        </div>
      </header>

      {/* HERO */}
      <div className="m-4 rounded-2xl bg-gradient-to-br from-[#6C3CE0] to-[#FF8C00] p-[1px]">
        <div className="bg-black rounded-2xl overflow-hidden relative h-[180px] flex items-end p-4">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
          <div className="relative text-white z-10">
            <h2 className="font-bold text-[18px] leading-tight">Wenze Wenze Business - Achetez, Vendez, Gagnez</h2>
            <p className="text-xs opacity-90 mt-1">0% commission • Vous gardez 100% • Abonnement seulement</p>
          </div>
        </div>
      </div>

      {/* 10 CATEGORIES */}
      <section className="px-4">
        <div className="grid grid-cols-5 gap-3">
          {CATEGORIES.map(c => (
            <Link key={c.name} href={`/categorie/${c.name.toLowerCase()}`} className="flex flex-col items-center gap-1">
              <div className={`w-14 h-14 rounded-xl ${c.color} flex items-center justify-center text-2xl border border-black/5`}>{c.icon}</div>
              <span className="text-[10px] font-medium text-center leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* VENTES FLASH */}
      <section className="px-4 mt-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Ventes Flash</h3>
          <Link href="/ventes-flash" className="text-[#6C3CE0] text-sm font-semibold">Voir tout ›</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {FLASH.map(p => (
            <div key={p.name} className="border rounded-xl p-3 relative hover:shadow-md transition">
              <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">{p.discount}</span>
              <div className="text-5xl text-center py-4">{p.img}</div>
              <p className="font-bold text-[#6C3CE0] text-sm">{p.price}</p>
              <p className="text-xs text-gray-500 truncate">{p.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABONNEMENT - PAS COMMISSION */}
      <Link href="/abonnement" className="m-4 bg-[#6C3CE0] rounded-xl p-4 text-white flex justify-between items-center block hover:bg-[#5a32b8] transition">
        <div>
          <h4 className="font-bold flex items-center gap-1">Devenez Boutique Pro 👑</h4>
          <p className="text-xs opacity-90">15 000 CDF/mois, 0% commission, 100% à vous</p>
        </div>
        <span className="bg-[#FF8C00] text-white text-xs font-bold px-4 py-2 rounded-full">Voir les plans</span>
      </Link>

      {/* WENZE VIDEO - HARMONISÉ AVEC TA VISION */}
      <section className="px-4 mt-2">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Wenze Video</h3>
          <Link href="/video" className="text-[#6C3CE0] text-sm font-semibold">Voir tout ›</Link>
        </div>
        <Link href="/video">
          <div className="mt-3 bg-black rounded-2xl h-[160px] relative overflow-hidden group">
            <img src="https://images.unsplash.com/photo-1592627109543-92e0140c6fa7?q=80&w=600" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition" alt="Wenze Video" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <p className="font-bold text-sm">Découvrez les tendances vidéo →</p>
              <p className="text-[11px] opacity-80">@wenze.collection • 12.3k likes • 45 000 CDF</p>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white/90 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition">▶️</div>
            <div className="absolute top-3 left-3 bg-[#6C3CE0] text-white text-[10px] px-2 py-1 rounded-full font-bold">TikTok Shop Kinshasa</div>
          </div>
        </Link>
      </section>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-3 text-[11px] z-30">
        <span className="font-bold text-[#6C3CE0] flex flex-col items-center"><span className="text-base">🏠</span>Accueil</span>
        <Link href="/boutiques" className="flex flex-col items-center"><span className="text-base">🏪</span>Boutiques</Link>
        <Link href="/video" className="flex flex-col items-center"><span className="text-base">🎬</span>Video</Link>
        <Link href="/panier" className="flex flex-col items-center"><span className="text-base">🛒</span>Panier</Link>
        <Link href="/profil" className="flex flex-col items-center"><span className="text-base">👤</span>Profil</Link>
      </nav>
    </div>
  );
      }
