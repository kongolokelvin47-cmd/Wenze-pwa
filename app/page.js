'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const C10 = [
  {id:1, n:'Commerce', ic:'🛍️', full:"Commerce, boutiques et distribution", grad:'from-orange-400 to-red-400'},
  {id:2, n:'Agriculture', ic:'🌾', full:"Agriculture et élevage", grad:'from-green-400 to-emerald-500'},
  {id:3, n:'Construction', ic:'🏗️', full:"Construction et immobilier", grad:'from-amber-400 to-yellow-500'},
  {id:4, n:'Technique', ic:'🔧', full:"Services techniques", grad:'from-slate-400 to-gray-600'},
  {id:5, n:'Transport', ic:'🚚', full:"Transport et logistique", grad:'from-blue-400 to-indigo-500'},
  {id:6, n:'Numérique', ic:'💻', full:"Numérique et tech", grad:'from-indigo-400 to-violet-500'},
  {id:7, n:'Santé', ic:'💄', full:"Santé et beauté", grad:'from-pink-400 to-rose-500'},
  {id:8, n:'Éducation', ic:'🎓', full:"Éducation et formation", grad:'from-violet-400 to-purple-600'},
  {id:9, n:'Restauration', ic:'🍽️', full:"Restauration et hôtellerie", grad:'from-red-400 to-orange-500'},
  {id:10, n:'Services', ic:'🎉', full:"Services et loisirs", grad:'from-emerald-400 to-teal-500'},
];

export default function WenzeV2(){
  const [step,setStep]=useState('home');
  const [menuOpen,setMenuOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [activeCat,setActiveCat]=useState(null);
  const [annonces,setAnnonces]=useState([]);
  const [boutiques,setBoutiques]=useState([]);
  const [allBoutiques,setAllBoutiques]=useState([]);
  const [user,setUser]=useState(null);
  const [bForm,setBForm]=useState({nom:'', commune:'Gombe', description:'', categories_ids:[1]});
  const [aForm,setAForm]=useState({titre:'', prix:'', commune:'Gombe', description:''});
  const [authForm,setAuthForm]=useState({email:'', password:'', nom:''});
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    if(!supabase) return;
    supabase.auth.getSession().then(({data})=>{ if(data.session) setUser(data.session.user) });
    const {data:listener}=supabase.auth.onAuthStateChange((e,session)=> setUser(session?.user || null));
    fetchData();
    return ()=> listener?.subscription?.unsubscribe();
  },[activeCat]);

  const fetchData = async()=>{
    if(!supabase) return;
    let qB=supabase.from('boutiques').select('*'); 
    let qA=supabase.from('annonces').select('*').order('created_at',{ascending:false}).limit(30);
    let qAll=supabase.from('boutiques').select('*');
    if(activeCat){ qB=qB.contains('categories_ids',[activeCat]); qA=qA.contains('categories_ids',[activeCat]); }
    const [b,a,all]=await Promise.all([qB,qA,qAll]);
    if(b.data) setBoutiques(b.data); if(a.data) setAnnonces(a.data); if(all.data) setAllBoutiques(all.data);
  };

  // RECHERCHE INTELLIGENTE - Dès 1 lettre
  const filteredAnnonces = useMemo(()=>{
    if(!search) return annonces;
    const s=search.toLowerCase();
    return annonces.filter(x=> x.titre?.toLowerCase().includes(s) || x.description?.toLowerCase().includes(s) || x.commune?.toLowerCase().includes(s));
  },[annonces,search]);
  const filteredBoutiques = useMemo(()=>{
    if(!search) return boutiques;
    const s=search.toLowerCase();
    return boutiques.filter(x=> x.nom_boutique?.toLowerCase().includes(s) || x.commune?.toLowerCase().includes(s));
  },[boutiques,search]);

  const toggleCat = (id)=> setBForm(p=>{
    const has=p.categories_ids.includes(id); const next=has?p.categories_ids.filter(x=>x!==id):[...p.categories_ids,id];
    return {...p,categories_ids:next.length?next:[1]};
  });

  const handleSignup = async()=>{
    if(!supabase) return alert('Supabase non configuré - ajoute les clés dans Vercel');
    if(!authForm.email || !authForm.password) return alert('Email + mot de passe obligatoires');
    setSaving(true);
    const {data,error}=await supabase.auth.signUp({email:authForm.email, password:authForm.password, options:{data:{full_name:authForm.nom}}});
    setSaving(false);
    if(error) alert(error.message); else { alert('✅ Compte créé! Vérifie ton email, puis connecte-toi.'); setStep('login'); }
  };
  const handleLogin = async()=>{
    if(!supabase) return alert('Supabase non configuré');
    if(!authForm.email || !authForm.password) return alert('Email + mot de passe obligatoires');
    setSaving(true);
    const {data,error}=await supabase.auth.signInWithPassword({email:authForm.email, password:authForm.password});
    setSaving(false);
    if(error) alert(error.message); else { setUser(data.user); setStep('home'); }
  };

  const createBoutique = async()=>{
    if(!user) { setStep('register'); return alert('Crée un compte d\'abord pour publier'); }
    if(!supabase) return alert('Supabase non configuré');
    if(!bForm.nom) return alert('Nom boutique obligatoire');
    setSaving(true);
    const {error}=await supabase.from('boutiques').insert({user_id:user.id, nom_boutique:bForm.nom, categories_ids:bForm.categories_ids, commune:bForm.commune, description:bForm.description});
    setSaving(false);
    if(error) alert(error.message); else { alert(`✅ Boutique créée dans ${bForm.categories_ids.length} secteurs!`); setStep('home'); fetchData(); }
  };
  const createAnnonce = async()=>{
    if(!user) { setStep('register'); return; }
    if(!supabase) return alert('Supabase non configuré');
    if(!aForm.titre||!aForm.prix) return alert('Titre + prix obligatoires');
    if(!allBoutiques.length) return alert('Crée d’abord ta boutique');
    setSaving(true);
    // Publication harmonisée: prend les secteurs de la boutique automatiquement
    const boutique=allBoutiques.find(b=>b.user_id===user.id) || allBoutiques[0];
    const {error}=await supabase.from('annonces').insert({boutique_id:boutique.id, titre:aForm.titre, prix_cdf:parseInt(aForm.prix), commune:aForm.commune, categories_ids:boutique.categories_ids, description:aForm.description, images:[`https://picsum.photos/400?random=${Date.now()}`]});
    setSaving(false);
    if(error) alert(error.message); else { alert('✅ Produit publié!'); setStep('home'); fetchData(); }
  };

  const whatsappLink = (titre,prix)=> `https://wa.me/243900000000?text=Salut%20WENZE%20!%20Je%20veux%20${encodeURIComponent(titre)}%20à%20${prix}%20CDF`;

  const Header = ()=>(
    <div className="bg-[#5F2EEA] px-4 py-3 flex justify-between items-center sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={()=>setMenuOpen(true)} className="text-white text-[22px]">☰</button>
        <img src="/logo.png" onError={(e)=>e.target.style.display='none'} className="h-9 w-9 rounded-xl bg-white p-1 object-cover" alt="W"/>
        <div className="bg-black text-white font-black px-2.5 py-1 rounded-lg text-[10px] leading-[10px]">WENZE<br/>WENZE</div>
      </div>
      <div className="flex items-center gap-2">
        {user ? <div className="w-8 h-8 bg-[#FFD233] rounded-full flex items-center justify-center text-[12px] font-bold text-black">{user.email?.[0]?.toUpperCase()}</div> :
        <button onClick={()=>setStep('register')} className="bg-white text-[#5F2EEA] px-3 py-1.5 rounded-full text-[10px] font-black">S'inscrire</button>}
      </div>
    </div>
  );

  const SideMenu = ()=> menuOpen && (
    <div className="fixed inset-0 z-50 flex">
      <div className="w-[280px] bg-white h-full p-5 shadow-2xl">
        <div className="flex justify-between items-center"><b className="text-[16px]">Menu WENZE</b><button onClick={()=>setMenuOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full">✕</button></div>
        <div className="mt-6 space-y-1">
          <button onClick={()=>{setStep('home'); setMenuOpen(false)}} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 font-bold text-[13px]">🏠 Accueil</button>
          <button onClick={()=>{setActiveCat(null); setMenuOpen(false)}} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 text-[13px]">⊞ Toutes Catégories ({C10.length})</button>
          <button onClick={()=>{setMenuOpen(false); document.getElementById('ventes')?.scrollIntoView()}} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 text-[13px]">⚡ Ventes Flash</button>
          <button onClick={()=>{setStep('createBoutique'); setMenuOpen(false)}} className="w-full text-left px-4 py-3 rounded-xl bg-[#FFD233] font-bold text-[13px]">+ Créer Boutique</button>
          <hr className="my-3"/>
          <p className="text-[11px] font-bold text-gray-400 px-4">MES ACTIVITÉS</p>
          <button onClick={()=>{setStep('home'); setMenuOpen(false)}} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 text-[13px]">🏪 Mes Boutiques ({allBoutiques.length})</button>
          <button onClick={()=>{setStep('home'); setMenuOpen(false)}} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 text-[13px]">📦 Mes Publications ({annonces.length})</button>
          <button onClick={()=> window.open('https://wa.me/243900000000','_blank')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-[13px] text-green-600 font-bold">💬 Chat WhatsApp Support</button>
          {user && <button onClick={async()=>{await supabase?.auth.signOut(); setUser(null); setMenuOpen(false)}} className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-[13px] text-red-500">🚪 Déconnexion</button>}
        </div>
      </div>
      <div onClick={()=>setMenuOpen(false)} className="flex-1 bg-black/40"></div>
    </div>
  );

  // PAGES AUTH
  if(step==='register' || step==='login') return(
    <div className="min-h-screen bg-[#F6F6F7] max-w-[430px] mx-auto">
      <Header/><SideMenu/>
      <div className="p-5">
        <div className="bg-white rounded-[24px] p-6 mt-4 shadow-sm">
          <h1 className="font-black text-[20px]">{step==='register'?'Créer un compte WENZE':'Se connecter'}</h1>
          <p className="text-[12px] text-gray-500 mt-1">Place réservée - Votre compte est sauvegardé</p>
          <div className="mt-6 space-y-3">
            {step==='register' && <input value={authForm.nom} onChange={e=>setAuthForm({...authForm,nom:e.target.value})} placeholder="Nom complet" className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3.5 text-[13px] outline-none focus:border-[#5F2EEA] border" />}
            <input value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="Email: kelvin@wenze.cd" className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3.5 text-[13px] outline-none border" />
            <input type="password" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="Mot de passe (6 caractères min)" className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3.5 text-[13px] outline-none border" />
            <button onClick={step==='register'?handleSignup:handleLogin} disabled={saving} className="w-full bg-[#5F2EEA] text-white py-4 rounded-full font-black text-[13px]">{saving?'...': step==='register'?'CRÉER MON COMPTE →':'SE CONNECTER →'}</button>
            <button onClick={()=>setStep(step==='register'?'login':'register')} className="w-full text-[12px] text-[#5F2EEA] font-bold py-2">{step==='register'?'Déjà un compte? Se connecter':'Pas de compte? S\'inscrire'}</button>
            <button onClick={()=>setStep('home')} className="w-full bg-gray-100 py-3 rounded-full text-[12px]">Retour Accueil</button>
          </div>
        </div>
      </div>
    </div>
  );

  return(
    <div className="min-h-screen bg-[#F6F6F7] max-w-[430px] mx-auto pb-[90px] relative">
      <Header/><SideMenu/>
      {/* Recherche intelligente */}
      <div className="bg-[#5F2EEA] px-4 pb-3">
        <div className="bg-white rounded-full px-4 py-2.5 flex items-center gap-2">
          <span className="text-gray-400">⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Recherche intelligente... tape une lettre" className="flex-1 outline-none text-[13px]" />
          {search && <button onClick={()=>setSearch('')} className="text-gray-400">✕</button>}
        </div>
        {search && <p className="text-white text-[10px] mt-2">{filteredAnnonces.length} produits • {filteredBoutiques.length} boutiques trouvés pour "{search}"</p>}
      </div>

      <div className="mx-4 mt-3 bg-gradient-to-r from-[#5F2EEA] to-[#8B5CF6] rounded-[18px] p-4 flex justify-between items-center text-white">
        <div><h2 className="font-bold text-[14px]">Wenze Wenze</h2><p className="font-black text-[14px]">Achetez, Vendez, Grandissez</p><button onClick={()=>{ if(!user) setStep('register'); else setStep('createBoutique')}} className="mt-2 bg-[#FFD233] text-black text-[10px] font-bold px-3 py-1.5 rounded-full">Commencer maintenant</button></div>
        <img src="https://i.pravatar.cc/150?img=26" className="w-[70px] h-[70px] rounded-full object-cover" alt=""/>
      </div>

      <div className="bg-white mx-4 mt-3 rounded-[20px] p-4 shadow-sm">
        <div className="flex justify-between items-center"><b className="text-[13px]">10 Secteurs • Filtrer</b><button onClick={()=>setActiveCat(null)} className={`text-[10px] px-3 py-1 rounded-full font-bold ${!activeCat?'bg-black text-white':'bg-gray-100'}`}>Tous ({allBoutiques.length})</button></div>
        <div className="grid grid-cols-5 gap-3 mt-4">{C10.map(c=><button key={c.id} onClick={()=>setActiveCat(activeCat===c.id?null:c.id)} className="flex flex-col items-center gap-1"><div className={`w-[52px] h-[52px] rounded-[16px] bg-gradient-to-br ${c.grad} flex items-center justify-center text-[20px] text-white shadow-md border-2 ${activeCat===c.id?'border-black scale-110':'border-transparent'}`}>{c.ic}</div><span className="text-[8px] font-bold">{c.n}</span></button>)}</div>
      </div>

      <div id="ventes" className="bg-white mx-4 mt-3 rounded-[20px] p-4">
        <div className="flex justify-between"><b className="text-[13px]">⚡ Ventes Flash {search?`• "${search}"`:''} • {filteredAnnonces.length}</b></div>
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          {filteredAnnonces.length===0 ? <div className="col-span-2 text-center py-8 text-gray-400 text-[12px]">{search?`Aucun résultat pour "${search}"`:'Aucun produit pour le moment'}</div> :
          filteredAnnonces.map(a=><div key={a.id} className="border rounded-[14px] overflow-hidden bg-white">
            <img src={a.images?.[0]} className="aspect-square object-cover w-full" alt=""/>
            <div className="p-2"><p className="text-[11px] font-bold truncate">{a.titre}</p><p className="text-[12px] font-black">{a.prix_cdf} CDF</p>
            <a href={whatsappLink(a.titre,a.prix_cdf)} target="_blank" className="mt-2 block bg-green-500 text-white text-[10px] font-bold py-1.5 rounded-full text-center">💬 WhatsApp</a>
            </div></div>)}
        </div>
      </div>

      {/* WhatsApp flottant */}
      <a href="https://wa.me/243900000000?text=Bonjour%20WENZE%20!" target="_blank" className="fixed bottom-[80px] right-4 bg-green-500 w-12 h-12 rounded-full flex items-center justify-center text-white text-[22px] shadow-xl z-40">💬</a>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t flex justify-around py-2.5 px-2 z-40 rounded-t-[18px]">
        <button onClick={()=>setStep('home')} className="flex flex-col items-center text-[#5F2EEA]"><span>🏠</span><span className="text-[9px] font-bold">Accueil</span></button>
        <button onClick={()=>setMenuOpen(true)} className="flex flex-col items-center opacity-60"><span>☰</span><span className="text-[9px]">Menu</span></button>
        <button onClick={()=>{ if(!user) setStep('register'); else setStep('createBoutique')}} className="bg-[#FFD233] w-11 h-11 rounded-full flex items-center justify-center text-black text-[20px] font-bold -mt-2">+</button>
        <button onClick={()=>window.open('https://wa.me/243900000000','_blank')} className="flex flex-col items-center opacity-60"><span>💬</span><span className="text-[9px]">Chat</span></button>
        <button onClick={()=>{ if(!user) setStep('register'); else setStep('home')}} className="flex flex-col items-center opacity-60"><span>👤</span><span className="text-[9px]">{user?'Compte':'Login'}</span></button>
      </div>

      {/* Formulaire Boutique/Annonce */}
      {(step==='createBoutique' || step==='createAnnonce') && (
        <div className="fixed inset-0 z-50 bg-white max-w-[430px] mx-auto overflow-auto">
          <div className="bg-[#5F2EEA] text-white px-4 py-3 flex items-center gap-3 sticky top-0"><button onClick={()=>setStep('home')} className="w-8 h-8 bg-white/20 rounded-full">←</button><b className="text-[14px]">{step==='createBoutique'?'Créer Boutique Multi-Secteurs':'Publier Produit (sans secteur)'}</b></div>
          <div className="p-4 space-y-5">
            {step==='createBoutique'?<>
              <input value={bForm.nom} onChange={e=>setBForm({...bForm,nom:e.target.value})} placeholder="Ex: Wenze Shop Gombe" className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px]" />
              <div><label className="text-[11px] font-bold">✅ Cochez vos secteurs</label><div className="grid grid-cols-1 gap-2 mt-3">{C10.map(cat=><button key={cat.id} onClick={()=>toggleCat(cat.id)} className={`text-left p-3 rounded-xl border-2 flex gap-3 ${bForm.categories_ids.includes(cat.id)?'border-[#5F2EEA] bg-[#5F2EEA] text-white':'border-gray-100 bg-[#fafafa]'}`}><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.grad} flex items-center justify-center text-white`}>{cat.ic}</div><p className="font-bold text-[11px]">{cat.full}</p><span className="ml-auto">{bForm.categories_ids.includes(cat.id)?'✓':''}</span></button>)}</div></div>
              <button onClick={createBoutique} disabled={saving} className="w-full bg-[#FFD233] text-black py-4 rounded-full font-black text-[13px]">CRÉER BOUTIQUE →</button>
            </>:<>
              <input value={aForm.titre} onChange={e=>setAForm({...aForm,titre:e.target.value})} placeholder="Titre produit" className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px]" />
              <input type="number" value={aForm.prix} onChange={e=>setAForm({...aForm,prix:e.target.value})} placeholder="Prix CDF" className="w-full bg-[#f5f5f5] rounded-xl px-4 py-3 text-[13px]" />
              <p className="text-[10px] text-gray-500">ℹ️ Le secteur sera pris automatiquement de ta boutique - plus besoin de choisir</p>
              <button onClick={createAnnonce} disabled={saving} className="w-full bg-[#5F2EEA] text-white py-4 rounded-full font-black text-[13px]">PUBLIER →</button>
            </>}
          </div>
        </div>
      )}
    </div>
  );
      }
