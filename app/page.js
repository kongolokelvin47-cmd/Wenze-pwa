'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const C10 = [
  {id:1, n:'Commerce', ic:'🛍️', full:"Commerce, boutiques et distribution", sous:["Commerce et distribution","Commerce de gros B2B","Mode, textile et accessoires","Vente de produits divers"], grad:'from-orange-400 to-red-400'},
  {id:2, n:'Agriculture', ic:'🌾', full:"Agriculture, élevage et agroalimentaire", sous:["Agriculture et cultures","Élevage et pisciculture","Pêche","Transformation agroalimentaire","Vente produits agricoles"], grad:'from-green-400 to-emerald-500'},
  {id:3, n:'Construction', ic:'🏗️', full:"Construction, immobilier et habitat", sous:["Construction et bâtiment","Immobilier","Architecture","Matériaux","Aménagement"], grad:'from-amber-400 to-yellow-500'},
  {id:4, n:'Technique', ic:'🔧', full:"Services techniques, réparation et industrie", sous:["Réparation et maintenance","Automobile et mobilité","Artisanat","Industrie","Énergie"], grad:'from-slate-400 to-gray-600'},
  {id:5, n:'Transport', ic:'🚚', full:"Transport, logistique et mobilité", sous:["Transport personnes/marchandises","Livraison et coursiers","Logistique","Déménagement","Mobilité"], grad:'from-blue-400 to-indigo-500'},
  {id:6, n:'Numérique', ic:'💻', full:"Numérique, technologie et télécoms", sous:["Informatique","Dev logiciels","Télécoms","IA","Maintenance"], grad:'from-indigo-400 to-violet-500'},
  {id:7, n:'Santé', ic:'💄', full:"Santé, beauté et bien-être", sous:["Santé/paramédical","Beauté/coiffure","Soins esthétiques","Bien-être","Vétérinaire"], grad:'from-pink-400 to-rose-500'},
  {id:8, n:'Éducation', ic:'🎓', full:"Éducation, formation et pro", sous:["Éducation","Juridique","Comptabilité","Finance/assurance","Services entreprises"], grad:'from-violet-400 to-purple-600'},
  {id:9, n:'Restauration', ic:'🍽️', full:"Restauration, tourisme et hébergement", sous:["Restauration","Hôtellerie","Tourisme","Traiteur","Livraison repas"], grad:'from-red-400 to-orange-500'},
  {id:10, n:'Services', ic:'🎉', full:"Services aux particuliers, événementiel et loisirs", sous:["Services à domicile","Services particuliers","Événementiel","Culture","Sport/loisirs","Nettoyage"], grad:'from-emerald-400 to-teal-500'},
];

export default function Etape3Expert(){
  const [step,setStep]=useState('home'); // home | createBoutique | createAnnonce
  const [activeCat,setActiveCat]=useState(null);
  const [annonces,setAnnonces]=useState([]);
  const [boutiques,setBoutiques]=useState([]);
  const [user,setUser]=useState(null);
  // Form boutique
  const [bForm,setBForm]=useState({nom:'', commune:'Gombe', description:'', categories_ids:[1], sous_categories:[], lat:null, lng:null});
  const [aForm,setAForm]=useState({titre:'', prix:'', description:'', commune:'Gombe', categories_ids:[1]});
  const [saving,setSaving]=useState(false);

  useEffect(()=>{ checkUser(); fetchData(); },[activeCat]);
  const checkUser = async()=>{ const {data}=await supabase.auth.getUser(); if(data.user) setUser(data.user); };
  const fetchData = async()=>{
    let qB=supabase.from('boutiques').select('*'); let qA=supabase.from('annonces').select('*').order('created_at',{ascending:false}).limit(20);
    if(activeCat){ qB=qB.contains('categories_ids',[activeCat]); qA=qA.contains('categories_ids',[activeCat]); }
    const [b,a]=await Promise.all([qB,qA]); if(b.data) setBoutiques(b.data); if(a.data) setAnnonces(a.data);
  };

  const toggleCat = (id, formSetter, field='categories_ids')=>{
    formSetter(prev=>{
      const exists=prev[field].includes(id);
      const newCats=exists?prev[field].filter(c=>c!==id):[...prev[field], id];
      return {...prev, [field]:newCats.length?newCats:[1]};
    });
  };

  const createBoutique = async()=>{
    if(!bForm.nom) return alert('Nom boutique obligatoire');
    setSaving(true);
    if(!user){ const {data,error}=await supabase.auth.signUp({email:`${Date.now()}@wenze.cd`, password:'Wenze123!'}); if(error) return alert(error.message); setUser(data.user); }
    const {data:u}=await supabase.auth.getUser(); const uid=u.user?.id || user?.id;
    if(!uid) return setSaving(false);
    const {error}=await supabase.from('boutiques').insert({user_id:uid, nom_boutique:bForm.nom, categories_ids:bForm.categories_ids, sous_categories:bForm.sous_categories, commune:bForm.commune, description:bForm.description});
    setSaving(false);
    if(error) alert(error.message); else { alert(`✅ Boutique créée dans ${bForm.categories_ids.length} secteurs!`); setStep('home'); fetchData(); }
  };

  const createAnnonce = async()=>{
    if(!aForm.titre || !aForm.prix) return alert('Titre + prix obligatoires');
    setSaving(true);
    const boutique = boutiques[0]; if(!boutique) return alert('Crée d’abord ta boutique'); 
    const {error}=await supabase.from('annonces').insert({boutique_id:boutique.id, titre:aForm.titre, prix_cdf:parseInt(aForm.prix), description:aForm.description, commune:aForm.commune, categories_ids:aForm.categories_ids, images:[`https://picsum.photos/400?random=${Date.now()}`]});
    setSaving(false);
    if(error) alert(error.message); else { alert('✅ Produit publié!'); setStep('home'); fetchData(); }
  };

  // --- UI HOME (Étape 2 améliorée) ---
  if(step==='home') return(
    <div className="min-h-screen bg-[#f6f6f7] max-w-[420px] mx-auto pb-[100px]">
      <div className="bg-white px-4 py-3 flex justify-between items-center sticky top-0 z-20 border-b">
        <div className="bg-black text-white font-black px-3 py-1.5 rounded-xl text-[11px]">WENZE<br/>WENZE</div>
        <div className="flex gap-2"><button onClick={()=>setStep('createBoutique')} className="bg-[#D4A017] text-black px-3 py-1.5 rounded-full text-[10px] font-black">+ BOUTIQUE</button><button onClick={()=>setStep('createAnnonce')} className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-bold">+ PRODUIT</button></div>
      </div>

      <div className="bg-white mx-4 mt-3 rounded-[20px] p-4 shadow-sm">
        <div className="flex justify-between"><b className="text-[13px]">10 Secteurs • Filtrer</b><button onClick={()=>setActiveCat(null)} className={`text-[10px] px-3 py-1 rounded-full font-bold ${!activeCat?'bg-black text-white':'bg-gray-100'}`}>Tous</button></div>
        <div className="grid grid-cols-5 gap-3 mt-4">
          {C10.map(c=><button key={c.id} onClick={()=>setActiveCat(activeCat===c.id?null:c.id)} className="flex flex-col items-center gap-1"><div className={`w-[52px] h-[52px] rounded-[16px] bg-gradient-to-br ${c.grad} flex items-center justify-center text-[22px] text-white shadow-md border-2 ${activeCat===c.id?'border-black scale-110':'border-transparent'}`}>{c.ic}</div><span className={`text-[8px] font-bold ${activeCat===c.id?'text-black':''}`}>{c.n}</span></button>)}
        </div>
      </div>

      <div className="bg-white mx-4 mt-3 rounded-[20px] p-4">
        <b className="text-[13px]">⚡ Ventes Flash {activeCat && C10.find(x=>x.id===activeCat).n} • {annonces.length}</b>
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          {annonces.length===0 ? <p className="col-span-2 text-center text-[11px] text-gray-400 py-8">Aucun produit. Clique + PRODUIT</p> : annonces.map(a=><div key={a.id} className="border rounded-[14px] overflow-hidden"><img src={a.images?.[0]} className="aspect-square object-cover"/><div className="p-2"><p className="text-[11px] font-bold truncate">{a.titre}</p><p className="text-[12px] font-black">{a.prix_cdf} CDF</p><div className="flex gap-1 mt-1">{a.categories_ids?.map(id=><span key={id} className="text-[7px]">{C10.find(c=>c.id===id)?.ic}</span>)}</div></div></div>)}
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] bg-black rounded-full flex justify-around items-center py-2.5 px-2 shadow-2xl z-30">
        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center">🏠</div><div className="text-white/40">⌕</div>
        <button onClick={()=>setStep('createBoutique')} className="bg-[#D4A017] w-11 h-11 rounded-full flex items-center justify-center text-black text-[22px] font-bold">+</button>
        <div className="text-white/40">▶</div><div className="text-white/40">👤</div>
      </div>
    </div>
  );

  // --- CREATE BOUTIQUE - EXPERT MULTI-CAT ---
  return(
    <div className="min-h-screen bg-white max-w-[420px] mx-auto">
      <div className="px-4 py-3 flex items-center gap-3 border-b sticky top-0 bg-white z-20"><button onClick={()=>setStep('home')} className="w-8 h-8 bg-gray-100 rounded-full">←</button><b className="text-[14px]">{step==='createBoutique' ? 'Créer Boutique Multi-Secteurs' : 'Publier Produit Multi-Secteurs'}</b></div>

      <div className="p-4 space-y-5">
        {step==='createBoutique' ? <>
          <div><label className="text-[11px] font-bold">Nom boutique *</label><input value={bForm.nom} onChange={e=>setBForm({...bForm,nom:e.target.value})} placeholder="Ex: Wenze Shop Gombe" className="w-full mt-1 bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px] outline-none border focus:border-black" /></div>

          <div><label className="text-[11px] font-bold">📍 Commune</label><select value={bForm.commune} onChange={e=>setBForm({...bForm,commune:e.target.value})} className="w-full mt-1 bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px]"><option>Gombe</option><option>Bandale</option><option>Limete</option><option>Kalamu</option><option>Ngaliema</option><option>Kinshasa</option></select></div>

          <div>
            <label className="text-[11px] font-bold">✅ Cochez vos secteurs d'activité (plusieurs possibles) *</label>
            <p className="text-[9px] text-gray-500 mt-1">Si vous vendez téléphones + vous faites livraison + vous avez un restaurant, cochez 3 cases</p>
            <div className="grid grid-cols-1 gap-2 mt-3">
              {C10.map(cat=>(
                <button key={cat.id} onClick={()=>toggleCat(cat.id,setBForm)} className={`text-left p-3 rounded-xl border-2 flex gap-3 transition-all ${bForm.categories_ids.includes(cat.id) ? 'border-black bg-black text-white' : 'border-gray-100 bg-[#fafafa]'}`}>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.grad} flex items-center justify-center text-white shrink-0`}>{cat.ic}</div>
                  <div className="flex-1"><p className="font-bold text-[11px]">{cat.id}. {cat.full}</p><div className="flex flex-wrap gap-1 mt-1">{cat.sous.slice(0,3).map(s=><span key={s} className={`text-[7px] px-1.5 py-0.5 rounded-full ${bForm.categories_ids.includes(cat.id)?'bg-white/20 text-white':'bg-white border'}`}>{s}</span>)}</div></div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${bForm.categories_ids.includes(cat.id)?'bg-[#D4A017] border-[#D4A017] text-black':'border-gray-300'}`}>{bForm.categories_ids.includes(cat.id)?'✓':''}</div>
                </button>
              ))}
            </div>
          </div>

          <div><label className="text-[11px] font-bold">Description</label><textarea value={bForm.description} onChange={e=>setBForm({...bForm,description:e.target.value})} placeholder="Décrivez votre activité polyvalente..." className="w-full mt-1 bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px] h-[80px] outline-none" /></div>

          <div className="bg-black text-white rounded-xl p-4"><p className="text-[11px] font-bold">🎯 Votre boutique sera visible dans:</p><div className="flex flex-wrap gap-1.5 mt-2">{bForm.categories_ids.map(id=>{const c=C10.find(x=>x.id===id); return <span key={id} className="bg-[#D4A017] text-black text-[9px] px-2.5 py-1 rounded-full font-bold">{c.ic} {c.n}</span>})}</div><p className="text-[8px] text-white/50 mt-2">Plus vous cochez, plus vous avez de clients - mais restez cohérent</p></div>

          <button onClick={createBoutique} disabled={saving} className="w-full bg-[#D4A017] text-black py-4 rounded-full font-black text-[13px]">{saving ? 'Création...' : `CRÉER BOUTIQUE DANS ${bForm.categories_ids.length} SECTEURS →`}</button>
        </> : <>
          {/* FORM PRODUIT */}
          <div><label className="text-[11px] font-bold">Titre produit *</label><input value={aForm.titre} onChange={e=>setAForm({...aForm,titre:e.target.value})} placeholder="iPhone 13 Pro Max 256GB" className="w-full mt-1 bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px] outline-none" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-[11px] font-bold">Prix CDF *</label><input type="number" value={aForm.prix} onChange={e=>setAForm({...aForm,prix:e.target.value})} placeholder="2500000" className="w-full mt-1 bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px]" /></div><div><label className="text-[11px] font-bold">Commune</label><select value={aForm.commune} onChange={e=>setAForm({...aForm,commune:e.target.value})} className="w-full mt-1 bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px]"><option>Gombe</option><option>Bandale</option><option>Limete</option></select></div></div>
          <div><label className="text-[11px] font-bold">Dans quels secteurs ce produit doit apparaître? *</label><div className="grid grid-cols-5 gap-2 mt-2">{C10.map(c=><button key={c.id} onClick={()=>toggleCat(c.id,setAForm)} className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 ${aForm.categories_ids.includes(c.id)?'border-black bg-black text-white':'border-gray-100'}`}><span className="text-[18px]">{c.ic}</span><span className="text-[7px] font-bold">{c.n}</span></button>)}</div></div>
          <div><label className="text-[11px] font-bold">Description</label><textarea value={aForm.description} onChange={e=>setAForm({...aForm,description:e.target.value})} className="w-full mt-1 bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px] h-[80px]" /></div>
          <button onClick={createAnnonce} disabled={saving} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px]">{saving ? 'Publication...' : 'PUBLIER →'}</button>
        </>}
      </div>
      <div className="h-[40px]"></div>
    </div>
  );
  }
