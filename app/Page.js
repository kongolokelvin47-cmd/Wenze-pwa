"use client"
import { useState } from "react"

export default function Home() {
  const [activeTab, setActiveTab] = useState("accueil")

  // Fonction compression image avant upload
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.7); // 70% qualité = 80% moins lourd
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f5f0] w-full flex justify-center">
      <div className="w-full min-h-screen bg-[#f8f5f0] md:max-w-[480px] lg:max-w-[420px] shadow-none md:shadow-2xl flex flex-col relative">

        {/* HEADER VERT FONCE DU LOGO */}
        <header className="bg-[#193a1e] text-white p-3 sticky top-0 z-50 w-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-[#d4a24e] to-[#a66a1a] w-8 h-8 rounded-full flex items-center justify-center font-black">W</div>
              <h1 className="font-black text-lg tracking-wider"><span className="text-white">WENZE</span><span className="text-[#d4a24e]">-WENZE</span></h1>
            </div>
            <div className="flex gap-4 text-lg">
              <span>🛒</span><span>💬</span><span>👤</span>
            </div>
          </div>
          <div className="mt-3 bg-white rounded-full flex items-center px-4 py-2.5">
            <span className="mr-2">🔍</span>
            <input placeholder="Rechercher produits, boutiques..." className="w-full text-black text-sm outline-none bg-transparent" />
          </div>
        </header>

        {/* BANNER DORE */}
        <div className="m-3 bg-gradient-to-r from-[#f6d78a] to-[#d4a24e] rounded-2xl p-4 flex justify-between items-center">
          <div>
            <h2 className="font-black text-[#193a1e] text-[15px] leading-tight">FLASH SALES • JUSQU'À -50%</h2>
            <p className="text-xs mt-1 text-[#193a1e]">Offres limitées aujourd'hui</p>
            <button className="mt-2 bg-[#193a1e] text-white px-4 py-1.5 rounded-full text-xs font-bold">Voir tout</button>
          </div>
          <div className="text-5xl">🛍️</div>
        </div>

        {/* CATEGORIES */}
        <div className="px-3">
          <h3 className="font-bold text-[#193a1e]">Catégories</h3>
          <div className="grid grid-cols-5 gap-2 mt-3 text-center">
            {[
              {e:"📱", n:"Électro"}, {e:"👕", n:"Mode"}, {e:"💄", n:"Beauté"},
              {e:"🏠", n:"Maison"}, {e:"🍚", n:"Alim."}
            ].map((c,i)=>(
              <div key={i} className="bg-white p-2 rounded-xl shadow-sm aspect-square flex flex-col justify-center items-center">
                <div className="text-xl">{c.e}</div>
                <div className="text-[10px] mt-1 font-medium text-[#193a1e]">{c.n}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PRODUITS POPULAIRES */}
        <div className="px-3 mt-5">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[#193a1e] text-sm">Produits populaires • Près de Kinshasa</h3>
            <span className="text-[10px] text-[#a66a1a]">Voir plus</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              {n:"Écouteurs Bluetooth Pro", p:"45 000 CDF", r:"-30%", v:"120"},
              {n:"Sac à dos robuste", p:"62 500 CDF", r:"-20%", v:"89"},
            ].map((p,i)=>(
              <div key={i} className="bg-white rounded-xl p-2 shadow-sm overflow-hidden">
                <div className="bg-gray-100 h-28 rounded-lg relative">
                  <span className="absolute top-1 left-1 bg-[#d4a24e] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{p.r}</span>
                  <img src={`https://picsum.photos/seed/${i}/200/200`} alt={p.n} className="w-full h-full object-cover rounded-lg" loading="lazy" />
                </div>
                <p className="text-xs mt-2 font-medium line-clamp-1">{p.n}</p>
                <p className="text-[#a66a1a] font-black text-sm">{p.p}</p>
                <p className="text-[10px] text-gray-500">★ 4.5 • {p.v} vendus</p>
              </div>
            ))}
          </div>
        </div>

        {/* WENZE VIDEO */}
        <div className="px-3 mt-6 mb-24">
          <h3 className="font-bold text-[#193a1e]">🔥 Wenze Vidéo</h3>
          <div className="flex gap-3 overflow-x-auto mt-3 pb-2 scrollbar-hide">
            {[1,2,3].map(v=>(
              <div key={v} className="min-w-[140px] bg-black rounded-xl h-52 relative overflow-hidden shrink-0">
                <img src={`https://picsum.photos/seed/video${v}/140/220`} className="w-full h-full object-cover opacity-80" alt="video" />
                <div className="absolute bottom-2 left-2 text-white text-[11px] font-bold">
                  <p>Mixeur 29 900 CDF</p>
                  <p className="font-normal">❤️ 2.1k 💬 134</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM NAV RESPONSIVE */}
        <div className="fixed bottom-0 w-full md:max-w-[480px] lg:max-w-[420px] bg-[#193a1e] text-white border-t border-[#2a5a2a] flex justify-around py-3 text-[11px]">
          <span className="text-[#d4a24e] font-bold flex flex-col items-center"><span>🏠</span>Accueil</span>
          <span className="flex flex-col items-center opacity-70"><span>🏬</span>Boutiques</span>
          <span className="flex flex-col items-center opacity-70"><span>🛒</span>Panier</span>
          <span className="flex flex-col items-center opacity-70"><span>👤</span>Profil</span>
        </div>
      </div>
    </div>
  )
              }
