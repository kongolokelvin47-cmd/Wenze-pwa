"use client";
import { useState } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE } from "@/lib/categorieswenza"; // <--- SOURCE UNIQUE

const FLASH = [
  { name: "Casque Bluetooth", price: "32 000 CDF", discount: "-20%", img: "🎧", tel: "243810000000" },
  { name: "Sneakers Nike", price: "85 000 CDF", discount: "-15%", img: "👟", tel: "243810000000" },
];

export default function WenzeBusiness() {
  const [search, setSearch] = useState("");
  
  const getWaLink = (titre: string, prix: string, tel: string) => {
    const msg = `Bonjour 👋 Je vous contacte depuis WENZE WENZE BUSINESS. Je suis intéressé par: ${titre} à ${prix}. Est-il dispo?`;
    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="max-w-[430px] mx-auto bg-white min-h-screen pb-20">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[22px] font-black text-[#6C3CE0] leading-none">WENZE WENZE</h1>
            <p className="text-[11px] font-bold text-[#FF8C00] tracking-[3px]">BUSINESS</p>
          </div>
          <div className="flex gap-3 text-xl"><Link href="/publier">➕</Link> 🔔 🛒</div>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Que recherchez-vous à Kinshasa ?" className="w-full bg-gray-100 rounded-full py-3 px-5 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
          <span className="absolute left-3 top-3.5">🔍</span>
        </div>
      </header>

      <div className="m-4 rounded-2xl bg-gradient-to-br from-[#6C3CE0] to-[#FF8C00] p-[1px]">
        <div className="bg-black rounded-2xl overflow-hidden relative h-[180px] flex items-end p-4">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
          <div className="relative text-white z-10">
            <h2 className="font-bold text-[18px] leading-tight">Achetez, Vendez, Gagnez</h2>
            <p className="text-xs opacity-90 mt-1">0% commission • Abonnement 15 000 CDF/mois • IA Gratuite Pro</p>
          </div>
        </div>
      </div>

      {/* 10 NOUVELLES CATEGORIES PRO - BRANCHÉ SUR lib/ */}
      <section className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">10 Métiers de Kinshasa</h3>
          <Link href="/categories" className="text-[#6C3CE0] text-xs">Tout voir</Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {CATEGORIES_WENZE.map(c => (
            <Link key={c.id} href={`/categorie/${c.id}`} className="flex flex-col items-center gap-1 group">
              <div className="w-14 h-14 rounded-xl bg-gray-50 border flex items-center justify-center text-2xl group-hover:bg-[#6C3CE0] group-hover:text-white transition">
                {c.icon}
              </div>
              <span className="text-[9px] font-bold text-center leading-tight uppercase">{c.titre.split(',')[0]}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 mt-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Ventes Flash</h3>
          <Link href="/ventes-flash" className="text-[#6C3CE0] text-sm font-semibold">Voir tout ›</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {FLASH.map(p => (
            <div key={p.name} className="border rounded-xl p-3 relative">
              <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">{p.discount}</span>
              <div className="text-5xl text-center py-4">{p.img}</div>
              <p className="font-bold text-[#6C3CE0] text-sm">{p.price}</p>
              <p className="text-xs text-gray-500 truncate">{p.name}</p>
              {/* INNOVATION WHATSAPP */}
              <a href={getWaLink(p.name, p.price, p.tel)} target="_blank" className="mt-2 w-full bg-[#25D366] text-white text-[11px] font-bold py-2 rounded-full flex justify-center">💬 WhatsApp</a>
            </div>
          ))}
        </div>
      </section>

      <Link href="/abonnement" className="m-4 bg-[#6C3CE0] rounded-xl p-4 text-white flex justify-between items-center block">
        <div>
          <h4 className="font-bold">Devenez Boutique Pro 👑 + IA</h4>
          <p className="text-xs opacity-90">15 000 CDF/mois, 0% commission, IA gratuite, bouton WhatsApp</p>
        </div>
        <span className="bg-[#FF8C00] text-white text-xs font-bold px-4 py-2 rounded-full">Pro 5$</span>
      </Link>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-3 text-[11px] z-30">
        <span className="font-bold text-[#6C3CE0] flex flex-col items-center"><span className="text-base">🏠</span>Accueil</span>
        <Link href="/boutiques" className="flex flex-col items-center"><span className="text-base">🏪</span>Boutiques</Link>
        <Link href="/publier" className="flex flex-col items-center"><span className="text-base">➕</span>Vendre</Link>
        <Link href="/panier" className="flex flex-col items-center"><span className="text-base">🛒</span>Panier</Link>
        <Link href="/profil" className="flex flex-col items-center"><span className="text-base">👤</span>Profil</Link>
      </nav>
    </div>
  );
      }
