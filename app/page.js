'use client';
import { useState } from 'react';

export default function Etape1(){
  const [search,setSearch]=useState('');
  const [selectedCats,setSelectedCats]=useState([]); // Multi-sélection
  const [showDetail,setShowDetail]=useState(null);
  
  const GRANDES_10 = [
    { id:1, name:'Commerce', full:"Commerce, boutiques et distribution", icon:'🛍️', color:'bg-orange-100', sous:["Commerce et distribution","Commerce de gros B2B","Mode, textile et accessoires","Vente de produits divers"] },
    { id:2, name:'Agriculture', full:"Agriculture, élevage et agroalimentaire", icon:'🌾', color:'bg-green-100', sous:["Agriculture et cultures","Élevage et pisciculture","Pêche","Transformation agroalimentaire","Vente produits agricoles"] },
    { id:3, name:'Construction', full:"Construction, immobilier et habitat", icon:'🏗️', color:'bg-yellow-100', sous:["Construction et bâtiment","Immobilier","Architecture","Matériaux","Aménagement"] },
    { id:4, name:'Technique', full:"Services techniques, réparation et industrie", icon:'🔧', color:'bg-slate-100', sous:["Réparation et maintenance","Automobile","Artisanat","Industrie","Énergie"] },
    { id:5, name:'Transport', full:"Transport, logistique et mobilité", icon:'🚚', color:'bg-blue-100', sous:["Transport personnes/marchandises","Livraison","Logistique","Déménagement","Mobilité"] },
    { id:6, name:'Numérique', full:"Numérique, technologie et télécoms", icon:'💻', color:'bg-indigo-100', sous:["Informatique","Dev apps","Télécoms","IA","Maintenance"] },
    { id:7, name:'Santé', full:"Santé, beauté et bien-être", icon:'💄', color:'bg-pink-100', sous:["Santé/paramédical","Beauté/coiffure","Soins esthétiques","Bien-être","Vétérinaire"] },
    { id:8, name:'Éducation', full:"Éducation, formation et pro", icon:'🎓', color:'bg-violet-100', sous:["Éducation","Juridique","Comptabilité","Finance/assurance","Services entreprises"] },
    { id:9, name:'Restauration', full:"Restauration, tourisme et hébergement", icon:'🍽️', color:'bg-red-100', sous:["Restauration","Hôtellerie","Tourisme","Traiteur","Livraison repas"] },
    { id:10, name:'Services', full:"Services aux particuliers, événementiel et loisirs", icon:'🎉', color:'bg-emerald-100', sous:["Services à domicile","Services particuliers","Événementiel","Culture","Sport/loisirs","Nettoyage"] },
  ];

  const toggleCat = (id) => {
    setSelectedCats(prev => prev.includes(id) ? prev.filter(c=>c!==id) : [...prev, id]);
  };

  return(
    <div className="min-h-screen bg-[#f5f5f5] max-w-[420px] mx-auto">
      
      {/* HEADER */}
      <div className="bg-white px-3 py-2.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-[#FF6A00] text-white font-black px-2.5 py-1 rounded-lg text-[11px] leading-[11px]">WENZE<br/>WENZE</div>
          <span className="text-[10px] text-gray-400">BUSINESS</span>
        </div>
        <div className="flex items-center gap-3 text-[16px]"><span>🔔</span><span>🛒</span><span>💬</span></div>
      </div>

      {/* SEARCH */}
      <div className="bg-white px-3 pb-3">
        <div className="bg-[#f1f1f1] rounded-full flex items-center px-4 py-2.5 gap-2">
          <span className="text-gray-400">🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Que recherchez-vous ?" className="bg-transparent flex-1 outline-none text-[13px] placeholder:text-gray-400" />
          <div className="bg-[#7B61FF] w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px]">🔍</div>
        </div>
      </div>

      {/* HERO */}
      <div className="px-3">
        <div className="bg-gradient-to-r from-[#FFF7E6] to-[#FFEFD0] rounded-2xl p-4 flex justify-between items-center relative overflow-hidden">
          <div className="z-10">
            <h1 className="font-black text-[17px] leading-5 text-black">Wenze Wenze<br/>Achetez, Vendez,<br/>Grandissez!</h1>
            <p className="text-[11px] text-gray-600 mt-1.5 leading-3">Tout ce dont vous avez<br/>besoin, livré chez vous.</p>
            <button className="bg-[#FFB800] text-black font-bold text-[11px] px-4 py-2 rounded-full mt-3">Découvrir maintenant →</button>
          </div>
          <div className="w-[90px] h-[90px] bg-white rounded-full flex items-center justify-center text-[45px] z-10 shadow-sm">👩🏾‍💼</div>
        </div>
      </div>

      {/* 10 CATEGORIES GRID - AVEC MULTI-SELECTION */}
      <div className="bg-white mt-3 mx-3 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <b className="text-[12px]">Les 10 secteurs WENZE</b>
          {selectedCats.length>0 && <span className="bg-[#FF6A00] text-white px-2 py-0.5 rounded-full text-[9px] font-bold">{selectedCats.length} sélectionnés</span>}
        </div>
        
        <div className="grid grid-cols-5 gap-y-4 gap-x-1">
          {GRANDES_10.map((cat) => (
            <button 
              key={cat.id} 
              onClick={()=>toggleCat(cat.id)}
              onDoubleClick={()=>setShowDetail(showDetail===cat.id?null:cat.id)}
              className="flex flex-col items-center gap-1.5 relative"
            >
              <div className={`w-[52px] h-[52px] ${cat.color} rounded-full flex items-center justify-center text-[22px] border-2 ${selectedCats.includes(cat.id) ? 'border-[#FF6A00] scale-105' : 'border-transparent'} transition-all`}>
                {cat.icon}
                {selectedCats.includes(cat.id) && <span className="absolute top-0 right-1 bg-[#FF6A00] text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center">✓</span>}
              </div>
              <span className={`text-[8px] font-medium text-center leading-[9px] ${selectedCats.includes(cat.id) ? 'text-[#FF6A00] font-black' : 'text-gray-700'}`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {/* Détail sous-catégories si on clique */}
        {showDetail && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl">
            <b className="text-[11px]">{GRANDES_10.find(c=>c.id===showDetail).full}</b>
            <div className="flex flex-wrap gap-1 mt-2">
              {GRANDES_10.find(c=>c.id===showDetail).sous.map(s=>(
                <span key={s} className="bg-white border text-[8px] px-2 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Bande multi-sélection pour pro */}
        {selectedCats.length>0 && (
          <div className="mt-4 p-3 bg-[#0F3D2E] rounded-xl">
            <p className="text-[10px] text-white font-bold">✅ Votre boutique sera visible dans {selectedCats.length} secteur(s):</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedCats.map(id=>{
                const c=GRANDES_10.find(x=>x.id===id);
                return <span key={id} className="bg-[#D4A017] text-black text-[8px] px-2 py-1 rounded-full font-bold">{c.icon} {c.name}</span>
              })}
            </div>
            <p className="text-[8px] text-gray-300 mt-2">Astuce: Double-cliquez une icône pour voir les sous-activités</p>
          </div>
        )}
      </div>

      {/* WENZE VIDEO PREVIEW */}
      <div className="bg-white mt-3 mx-3 rounded-2xl p-3">
        <div className="flex justify-between items-center">
          <b className="text-[13px]">Wenze Vidéo</b>
          <span className="text-[11px] text-[#FF6A00]">Bientôt →</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Cliquez plusieurs catégories si vous faites plusieurs activités</p>
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t flex justify-around py-2">
        <div className="flex flex-col items-center text-[#FF6A00]"><span>🏠</span><span className="text-[9px] mt-1 font-bold">Accueil</span></div>
        <div className="flex flex-col items-center text-gray-400"><span>🏷️</span><span className="text-[9px] mt-1">Catégories</span></div>
        <div className="flex flex-col items-center"><div className="bg-[#FF6A00] w-9 h-9 rounded-full flex items-center justify-center text-white text-[20px] -mt-1">+</div><span className="text-[9px] mt-1 text-gray-400">Vendre</span></div>
        <div className="flex flex-col items-center text-gray-400"><span>🛒</span><span className="text-[9px] mt-1">Panier</span></div>
        <div className="flex flex-col items-center text-gray-400"><span>👤</span><span className="text-[9px] mt-1">Compte</span></div>
      </div>

      <div className="h-[80px]"></div>
    </div>
  );
    }
