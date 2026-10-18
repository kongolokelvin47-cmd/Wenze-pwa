"use client";
import { useState } from "react";
import Link from "next/link";

export default function WenzeVideo() {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(12300);

  return (
    <div className="max-w-[430px] mx-auto bg-black min-h-screen relative overflow-hidden">
      {/* VIDEO FULL SCREEN */}
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1592627109543-92e0140c6fa7?q=80&w=800"
          alt="Wenze Video"
          className="w-full h-full object-cover"
        />
        {/* Gradient pour lire le texte */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>

      {/* TOP BAR */}
      <div className="relative z-10 flex justify-between items-center p-4 pt-12">
        <div className="flex items-center gap-2 text-white">
          <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">▶</span>
          <span className="font-bold text-sm">Wenze Video</span>
          <span className="text-white/60">·</span>
          <button className="border border-white px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur">
            Suivre
          </button>
        </div>
      </div>

      {/* RIGHT ACTIONS - Comme TikTok */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-6 items-center">
        <button onClick={() => { setLiked(!liked); setLikes(liked ? likes-1 : likes+1) }} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${liked ? 'bg-red-500' : 'bg-white/20'} backdrop-blur`}>❤️</div>
          <span className="text-white text-xs font-bold mt-1">{(likes/1000).toFixed(1)}k</span>
        </button>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-xl">💬</div>
          <span className="text-white text-xs font-bold mt-1">843</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-xl">↗️</div>
          <span className="text-white text-xs font-bold mt-1">210</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-xl">🔖</div>
          <span className="text-white text-xs font-bold mt-1">92</span>
        </div>
      </div>

      {/* BOTTOM INFO */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-8">
        <div className="text-white mb-4">
          <p className="font-bold text-[15px] leading-tight">
            @wenze.collection · Nouvelle collection sacs tendance ✨<br/>
            <span className="font-normal">#Kinshasa #Mode</span>
          </p>
        </div>

        {/* PRODUCT CARD - Exactement comme image */}
        <div className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
          <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-3xl">👜</div>
          <div className="flex-1">
            <p className="font-bold text-[16px] leading-tight text-black">Nouvelle collection disponible !</p>
            <div className="flex items-center justify-between mt-2">
              <span className="font-black text-[#6C3CE0] text-[18px]">45 000 CDF</span>
              <Link href="/produit/sac-noir" className="bg-[#6C3CE0] text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                Voir le produit
              </Link>
            </div>
          </div>
        </div>

        {/* HOME INDICATOR */}
        <div className="w-32 h-1 bg-white rounded-full mx-auto mt-6 opacity-80" />
      </div>

      {/* NAV RETOUR */}
      <Link href="/" className="absolute top-20 left-4 z-20 bg-black/40 backdrop-blur text-white px-3 py-1 rounded-full text-xs">
        ← Retour
      </Link>
    </div>
  );
      }
