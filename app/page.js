'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const C10 = [
  {id:1, n:'Commerce', ic:'🛍️', full:"Commerce, boutiques et distribution", sous:["Commerce","Gros B2B","Mode","Vente divers"], grad:'from-orange-400 to-red-400'},
  {id:2, n:'Agriculture', ic:'🌾', full:"Agriculture, élevage et agroalimentaire", sous:["Agriculture","Élevage","Pêche","Agroalimentaire"], grad:'from-green-400 to-emerald-500'},
  {id:3, n:'Construction', ic:'🏗️', full:"Construction, immobilier et habitat", sous:["Construction","Immobilier","Architecture","Matériaux"], grad:'from-amber-400 to-yellow-500'},
  {id:4, n:'Technique', ic:'🔧', full:"Services techniques et industrie", sous:["Réparation","Automobile","Artisanat","Industrie"], grad:'from-slate-400 to-gray-600'},
  {id:5, n:'Transport', ic:'🚚', full:"Transport, logistique et mobilité", sous:["Transport","Livraison","Logistique","Déménagement"], grad:'from-blue-400 to-indigo-500'},
  {id:6, n:'Numérique', ic:'💻', full:"Numérique, technologie et télécoms", sous:["Informatique","Dev apps","Télécoms","IA"], grad:'from-indigo-400 to-violet-500'},
  {id:7, n:'Santé', ic:'💄', full:"Santé, beauté et bien-être", sous:["Santé","Beauté","Esthétique","Vétérinaire"], grad:'from-pink-400 to-rose-500'},
  {id:8, n:'Éducation', ic:'🎓', full:"Éducation, formation et pro", sous:["Éducation","Juridique","Comptabilité","Finance"], grad:'from-violet-400 to-purple-600'},
  {id:9, n:'Restauration', ic:'🍽️', full:"Restauration, tourisme et hébergement", sous:["Restauration","Hôtellerie","Tourisme","Traiteur"], grad:'from-red-400 to-orange-500'},
  {id:10, n:'Services', ic:'🎉', full:"Services aux particuliers et loisirs", sous:["Domicile","Particuliers","Événementiel","Loisirs"], grad:'from-emerald-400 to-teal-500'},
];

export default function Etape3ExpertFix(){
  const [step,setStep]=useState('home');
  const [activeCat,setActiveCat]=useState(null);
  const [annonces,setAnnonces]=useState([]);
  const [boutiques,setBoutiques]=useState([]);
  const [allBoutiques,setAllBoutiques]=useState([]); // FIX BUG 3
  const [bForm,setBForm]=useState({nom:'', commune:'Gombe', description:'', categories_ids:[1]});
  const [aForm,setAForm]=useState({titre:'', prix:'', commune:'Gombe', categories_ids:[1], description:''});
  const [saving,setSaving]=useState(false);

  useEffect(()=>{ fetchData(); },[activeCat]);
  const fetchData = async()=>{
    let qB=supabase.from('boutiques').select('*'); let qA=supabase.from('annonces').select('*').order('created_at',{ascending:false}).limit(20);
    let qAll=supabase.from('boutiques').select('*'); // pour création produit
    if(activeCat){ qB=qB.contains('categories_ids',[activeCat]); qA=qA.contains('categories_ids',[activeCat]); }
    const [b,a,all]=await Promise.all([qB,qA,qAll]);
    if(b.data) setBoutiques(b.data); if(a.data) setAnnonces(a.data); if(all.data) setAllBoutiques(all.data);
  };

  const toggle = (id, setter, field) => setter(p=>{
    const has=p[field].includes(id); const next=has?p[field].filter(x=>x!==id):[...p[field],id];
    return {...p, [field]: next.length?next:[1]};
  });

  const createBoutique = async()=>{
    if(!bForm.nom) return alert('Nom boutique obligatoire');
    setSaving(true);
    const {data:{user}}=await supabase.auth.getUser();
    let uid=user?.id;
    if(!uid){ const {data}=await supabase.auth.signInAnonymously(); uid=data.user?.id; } // FIX BUG 2
    const {error}=await supabase.from('boutiques').insert({user_id:uid, nom_boutique:bForm.nom, categories_ids:bForm.categories_ids, commune:bForm.commune, description:bForm.description});
    setSaving(false);
    if(error) alert(error.message); else { alert(`✅ Boutique créée dans ${bForm.categories_ids.length} secteurs!`); setStep('home'); fetchData(); }
  };
  const createAnnonce = async()=>{
    if(!aForm.titre||!aForm.prix) return alert('Titre + prix obligatoires');
    if(!allBoutiques.length) return alert('Crée d’abord ta boutique');
    setSaving(true);
    const {error}=await supabase.from('annonces').insert({boutique_id:allBoutiques[0].id, titre:aForm.titre, prix_cdf:parseInt(aForm.prix), commune:aForm.commune, categories_ids:aForm.categories_ids, description:aForm.description, images:[`https://picsum.photos/400?random=${Date.now()}`]});
    setSaving(false);
    if(error) alert(error.message); else { alert('✅ Produit publié!'); setStep('home'); fetchData(); }
  };

  if(step==='home') return(
    <div className="min-h-screen bg-[#f6f6f7] max-w-[420px] mx-auto pb-[90px]">
      <div className="bg-white px-4 py-3 flex justify-between items-center sticky top-0 z-20 border-b">
        {/* LOGO INTÉGRÉ - FIX */}
        <div className="flex items-center gap-2">
          <img src="/logo.png" onError={(e)=>e.target.style.display='none'} className="h-9 w-9 rounded-xl object-cover bg-black" alt="WENZE" />
          <div className="bg-black text-white font-black px-2.5 py-1 rounded-lg text-[10px] leading-[10px]">WENZE<br/>WENZE</div>
        </div>
        <div className="flex gap-2"><button onClick={()=>setStep('createBoutique')} className="bg-[#D4A017] text-black px-3 py-1.5 rounded-full text-[10px] font-black">+ BOUTIQUE</button><button onClick={()=>setStep('createAnnonce')} className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-bold">+ PRODUIT</button></div>
      </div>
      <div className="bg-white mx-4 mt-3 rounded-[20px] p-4 shadow-sm">
        <div className="flex justify-between"><b className="text-[13px]">10 Secteurs • Filtrer</b><button onClick={()=>setActiveCat(null)} className={`text-[10px] px-3 py-1 rounded-full font-bold ${!activeCat?'bg-black text-white':'bg-gray-100'}`}>Tous ({allBoutiques.length})</button></div>
        <div className="grid grid-cols-5 gap-3 mt-4">{C10.map(c=><button key={c.id} onClick={()=>setActiveCat(activeCat===c.id?null:c.id)} className="flex flex-col items-center gap-1"><div className={`w-[52px] h-[52px] rounded-[16px] bg-gradient-to-br ${c.grad} flex items-center justify-center text-[22px] text-white shadow-md border-2 ${activeCat===c.id?'border-black scale-110':'border-transparent'}`}>{c.ic}</div><span className="text-[8px] font-bold">{c.n}</span></button>)}</div>
      </div>
      <div className="bg-white mx-4 mt-3 rounded-[20px] p-4">
        <b className="text-[13px]">⚡ Ventes Flash {activeCat?`• ${C10.find(x=>x.id===activeCat).n}`:''} • {annonces.length}</b>
        <div className="grid grid-cols-2 gap-2.5 mt-3">{annonces.length===0?<p className="col-span-2 text-center text-[11px] text-gray-400 py-8">Aucun produit. Clique + PRODUIT</p>:annonces.map(a=><div key={a.id} className="border rounded-[14px] overflow-hidden"><img src={a.images?.[0]} className="aspect-square object-cover w-full"/><div className="p-2"><p className="text-[11px] font-bold truncate">{a.titre}</p><p className="text-[12px] font-black">{a.prix_cdf} CDF</p></div></div>)}</div>
      </div>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] bg-black rounded-full flex justify-around items-center py-2.5 px-2 shadow-2xl z-30"><div className="w-9 h-9 bg-white rounded-full flex items-center justify-center">🏠</div><div className="text-white/40">⌕</div><button onClick={()=>setStep('createBoutique')} className="bg-[#D4A017] w-11 h-11 rounded-full flex items-center justify-center text-black text-[22px] font-bold">+</button><div className="text-white/40">▶</div><div className="text-white/40">👤</div></div>
    </div>
  );

  return(
    <div className="min-h-screen bg-white max-w-[420px] mx-auto">
      <div className="px-4 py-3 flex items-center gap-3 border-b sticky top-0 bg-white z-20"><button onClick={()=>setStep('home')} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</button><b className="text-[14px]">{step==='createBoutique'?'Créer Boutique Multi-Secteurs':'Publier Produit Multi-Secteurs'}</b></div>
      <div className="p-4 space-y-5">
        {step==='createBoutique'?<>
          <div><label className="text-[11px] font-bold">Nom boutique *</label><input value={bForm.nom} onChange={e=>setBForm({...bForm,nom:e.target.value})} placeholder="Ex: Wenze Shop Gombe" className="w-full mt-1 bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px] outline-none border focus:border-black" /></div>
          <div><label className="text-[11px] font-bold">✅ Cochez vos secteurs (plusieurs possibles) *</label><div className="grid grid-cols-1 gap-2 mt-3">{C10.map(cat=><button key={cat.id} onClick={()=>toggle(cat.id,setBForm,'categories_ids')} className={`text-left p-3 rounded-xl border-2 flex gap-3 ${bForm.categories_ids.includes(cat.id)?'border-black bg-black text-white':'border-gray-100 bg-[#fafafa]'}`}><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.grad} flex items-center justify-center text-white`}>{cat.ic}</div><div className="flex-1"><p className="font-bold text-[11px]">{cat.id}. {cat.full}</p></div><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${bForm.categories_ids.includes(cat.id)?'bg-[#D4A017] border-[#D4A017] text-black':''}`}>{bForm.categories_ids.includes(cat.id)?'✓':''}</div></button>)}</div></div>
          <div className="bg-black text-white rounded-xl p-4"><p className="text-[11px] font-bold">🎯 Visible dans {bForm.categories_ids.length} secteur(s):</p><div className="flex flex-wrap gap-1.5 mt-2">{bForm.categories_ids.map(id=>{const c=C10.find(x=>x.id===id);return <span key={id} className="bg-[#D4A017] text-black text-[9px] px-2.5 py-1 rounded-full font-bold">{c.ic} {c.n}</span>})}</div></div>
          <button onClick={createBoutique} disabled={saving} className="w-full bg-[#D4A017] text-black py-4 rounded-full font-black text-[13px]">{saving?'Création...':`CRÉER DANS ${bForm.categories_ids.length} SECTEURS →`}</button>
        </>:<>
          <div><label className="text-[11px] font-bold">Titre produit *</label><input value={aForm.titre} onChange={e=>setAForm({...aForm,titre:e.target.value})} placeholder="iPhone 13 Pro Max" className="w-full mt-1 bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px]" /></div>
          <div><label className="text-[11px] font-bold">Prix CDF *</label><input type="number" value={aForm.prix} onChange={e=>setAForm({...aForm,prix:e.target.value})} placeholder="2500000" className="w-full mt-1 bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px]" /></div>
          <div><label className="text-[11px] font-bold">Secteurs *</label><div className="grid grid-cols-5 gap-2 mt-2">{C10.map(c=><button key={c.id} onClick={()=>toggle(c.id,setAForm,'categories_ids')} className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 ${aForm.categories_ids.includes(c.id)?'border-black bg-black text-white':'border-gray-100'}`}><span className="text-[18px]">{c.ic}</span><span className="text-[7px] font-bold">{c.n}</span></button>)}</div></div>
          <button onClick={createAnnonce} disabled={saving} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px]">PUBLIER →</button>
        </>}
      </div>
    </div>
  );
      }
