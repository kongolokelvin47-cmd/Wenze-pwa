'use client';
import { useState } from 'react';

export default function Etape1Pro(){
  const [search,setSearch]=useState('');
  const [selectedCats,setSelectedCats]=useState([]);
  const [showDetail,setShowDetail]=useState(null);
  
  const C10 = [
    { id:1, name:'Commerce', full:"Commerce, boutiques et distribution", icon:'🛍️', color:'from-orange-100 to-orange-200', ring:'ring-orange-300', sous:["Commerce et distribution","Commerce de gros B2B","Mode, textile","Vente divers"] },
    { id:2, name:'Agriculture', full:"Agriculture, élevage et agroalimentaire", icon:'🌾', color:'from-green-100 to-emerald-200', ring:'ring-green-300', sous:["Agriculture","Élevage/pisciculture","Pêche","Agroalimentaire"] },
    { id:3, name:'Construction', full:"Construction, immobilier et habitat", icon:'🏗️', color:'from-amber-100 to-yellow-200', ring:'ring-amber-300', sous:["Construction","Immobilier","Architecture","Matériaux"] },
    { id:4, name:'Technique', full:"Services techniques, réparation et industrie", icon:'🔧', color:'from-slate-100 to-gray-200', ring:'ring-slate-300', sous:["Réparation","Automobile","Artisanat","Industrie"] },
    { id:5, name:'Transport', full:"Transport, logistique et mobilité", icon:'🚚', color:'from-blue-100 to-sky-200', ring:'ring-blue-300', sous:["Transport","Livraison","Logistique","Déménagement"] },
    { id:6, name:'Numérique', full:"Numérique, technologie et télécoms", icon:'💻', color:'from-indigo-100 to-violet-200', ring:'ring-indigo-300', sous:["Informatique","Dev apps","Télécoms","IA"] },
    { id:7, name:'Santé', full:"Santé, beauté et bien-être", icon:'💄', color:'from-pink-100 to-rose-200', ring:'ring-pink-300', sous:["Santé","Beauté/coiffure","Esthétique","Vétérinaire"] },
    { id:8, name:'Éducation', full:"Éducation, formation et services pro", icon:'🎓', color:'from-violet-100 to-purple-200', ring:'ring-violet-300', sous:["Éducation","Juridique","Comptabilité","Finance"] },
    { id:9, name:'Restauration', full:"Restauration, tourisme et hébergement", icon:'🍽️', color:'from-red-100 to-orange-200', ring:'ring-red-300', sous:["Restauration","Hôtellerie","Tourisme","Traiteur"] },
    { id:10, name:'Services', full:"Services aux particuliers et loisirs", icon:'🎉', color:'from-emerald-100 to-teal-200', ring:'ring-emerald-300', sous:["Domicile","Particuliers","Événementiel","Loisirs"] },
  ];

  const toggle = (id) => setSelectedCats(p=>p.includes(id)?p.filter(c=>c!==id):[...p,id]);

  return(
    <div className="min-h-screen bg-[#f6f6f7] max-w-[420px] mx-auto text-black antialiased">
      
      {/* HEADER PREMIUM */}
      <div className="bg-white/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between sticky top-0 z-20 border-b border-black/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="bg-black text-white font-black px-3 py-1.5 rounded-xl text-[12px] leading-[12px] tracking-tighter">WENZE<br/>WENZE</div>
          <div><p className="text-[11px] font-black tracking-widest">BUSINESS</p><p className="text-[9px] text-gray-400 -mt-1">10 SECTEURS</p></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[14px]">🔔</div>
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[14px]">🛒</div>
        </div>
      </div>

      {/* SEARCH NEOMORPHIC */}
      <div className="bg-white px-4 py-3">
        <div className="bg-[#f2f2f3] rounded-[14px] flex items-center px-4 py-3 gap-3 shadow-inner">
          <span className="text-gray-400 text-[16px]">⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Que recherchez-vous à Kinshasa ?" className="bg-transparent flex-1 outline-none text-[13px] font-medium placeholder:text-gray-400" />
          <div className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center text-[13px]">→</div>
        </div>
      </div>

      {/* HERO PREMIUM - BLACK & GOLD */}
      <div className="px-4 mt-1">
        <div className="bg-black rounded-[22px] p-[1px]">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-black rounded-[21px] p-5 flex justify-between items-center overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A017]/20 blur-[30px] rounded-full"></div>
            <div className="z-10">
              <div className="inline-flex bg-[#D4A017]/20 border border-[#D4A017]/30 px-2 py-0.5 rounded-full text-[8px] text-[#D4A017] font-bold tracking-widest mb-2">NOUVEAU • WENZE WENZE</div>
              <h1 className="font-black text-[20px] leading-[19px] text-white tracking-tight">Achetez.<br/>Vendez.<br/><span className="text-[#D4A017]">Grandissez.</span></h1>
              <p className="text-[10px] text-white/50 mt-2 leading-3">Tout Kinshasa dans votre<br/>poche. Livré en 24h.</p>
              <button className="bg-white text-black font-bold text-[11px] px-4 py-2 rounded-full mt-3 tracking-wide">Explorer →</button>
            </div>
            <div className="w-[110px] h-[110px] bg-gradient-to-br from-white to-gray-200 rounded-[20px] flex items-center justify-center text-[55px] z-10 rotate-3 shadow-2xl">🛒</div>
          </div>
        </div>
      </div>

      {/* 10 CATEGORIES - DESIGN AMELIORE */}
      <div className="bg-white mt-4 mx-4 rounded-[20px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex justify-between items-center">
          <div><b className="text-[14px] tracking-tight">Les 10 secteurs</b><p className="text-[10px] text-gray-400 -mt-1">Cliquez plusieurs fois si polyvalent</p></div>
          {selectedCats.length>0 && <div className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold">{selectedCats.length} • actifs</div>}
        </div>
        
        <div className="grid grid-cols-5 gap-y-5 gap-x-2 mt-5">
          {C10.map(cat=>(
            <button key={cat.id} onClick={()=>toggle(cat.id)} onDoubleClick={()=>setShowDetail(showDetail===cat.id?null:cat.id)} className="group flex flex-col items-center gap-2">
              <div className={`w-[58px] h-[58px] rounded-[18px] bg-gradient-to-br ${cat.color} flex items-center justify-center text-[26px] relative transition-all duration-300 ${selectedCats.includes(cat.id) ? `ring-2 ${cat.ring} scale-105 shadow-lg` : 'group-active:scale-95'}`}>
                {cat.icon}
                {selectedCats.includes(cat.id) && <div className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white rounded-full text-[10px] flex items-center justify-center font-bold shadow-md">✓</div>}
              </div>
              <span className={`text-[9px] font-bold text-center leading-[10px] tracking-tight ${selectedCats.includes(cat.id)?'text-black':'text-gray-500'}`}>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* DETAIL GLASS */}
        {showDetail && (
          <div className="mt-5 p-4 bg-[#f8f8f8] rounded-[16px] border border-black/[0.04] animate-in">
            <b className="text-[11px]">{C10.find(c=>c.id===showDetail).full}</b>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {C10.find(c=>c.id===showDetail).sous.map(s=>(
                <span key={s} className="bg-white border border-black/5 text-[9px] font-medium px-2.5 py-1 rounded-full shadow-sm">{s}</span>
              ))}
            </div>
            <button onClick={()=>setShowDetail(null)} className="mt-3 text-[9px] text-gray-400">Fermer ✕</button>
          </div>
        )}

        {/* BANDEAU MULTI-SELECT PREMIUM */}
        {selectedCats.length>0 && (
          <div className="mt-5 rounded-[16px] bg-black p-4 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 w-20 h-20 bg-[#D4A017]/30 blur-2xl"></div>
            <p className="text-[11px] font-bold tracking-wide z-10 relative">✓ Visible dans {selectedCats.length} secteur(s)</p>
            <div className="flex flex-wrap gap-1.5 mt-3 z-10 relative">
              {selectedCats.map(id=>{
                const c=C10.find(x=>x.id===id);
                return <span key={id} className="bg-white text-black text-[9px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1">{c.icon} {c.name}</span>
              })}
            </div>
            <button className="w-full mt-4 bg-[#D4A017] text-black py-3 rounded-full font-black text-[12px] tracking-wide">CONTINUER AVEC {selectedCats.length} SECTEUR(S) →</button>
            <p className="text-[8px] text-white/40 text-center mt-2">Double-clic = voir sous-catégories</p>
          </div>
        )}
      </div>

      {/* FOOTER HINT */}
      <div className="px-4 mt-4 mb-2">
        <div className="bg-[#D4A017]/10 border border-[#D4A017]/20 rounded-full px-4 py-2.5 flex items-center gap-2">
          <span className="text-[12px]">💡</span><p className="text-[10px] font-medium">Un pro polyvalent? Cochez Commerce + Transport + Restauration, vous serez trouvé partout.</p>
        </div>
      </div>

      {/* BOTTOM NAV FLOATING */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] bg-black rounded-full flex justify-around items-center py-2.5 px-2 shadow-2xl z-30">
        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[16px]">🏠</div>
        <div className="text-white/40 text-[18px]">⌕</div>
        <div className="bg-[#D4A017] w-11 h-11 rounded-full flex items-center justify-center text-black text-[22px] font-bold shadow-lg">+</div>
        <div className="text-white/40 text-[18px]">▶</div>
        <div className="text-white/40 text-[18px]">👤</div>
      </div>

      <div className="h-[90px]"></div>
    </div>
  );
        }
