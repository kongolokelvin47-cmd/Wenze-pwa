'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const COMMUNES_KIN = ['Gombe','Bandal','Kintambo','Lingwala','Kinshasa','Ngaliema','Limete','Masina','Ndjili','Matete','Kalamu','Barumbu','Ngiri-Ngiri','Selembao'];
const SECTEURS = [
  {id:'coiffure', n:'Coiffure & Beauté', ic:'💄'},
  {id:'couture', n:'Couture & Mode', ic:'👗'},
  {id:'restauration', n:'Restauration', ic:'🍽️'},
  {id:'electronique', n:'Électronique', ic:'📱'},
  {id:'construction', n:'Construction', ic:'🏗️'},
  {id:'transport', n:'Transport', ic:'🚚'},
  {id:'sante', n:'Santé', ic:'💊'},
  {id:'education', n:'Éducation', ic:'🎓'},
];

export default function WenzeV3Expert(){
  const [step,setStep]=useState('home');
  const [user,setUser]=useState(null);
  const [annonces,setAnnonces]=useState([]);
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  
  // Forms V3
  const [auth,setAuth]=useState({email:'', pass:'', nom:''});
  const [bForm,setBForm]=useState({owner_name:'', etablissement_name:'', service_number:'243', secteur_detail:'coiffure', commune:'Gombe', adresse:'', is_physique:true});
  const [aForm,setAForm]=useState({titre:'', prix:'', desc:'', file:null});

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setUser(data.session?.user||null));
    fetchAll();
  },[]);

  const fetchAll = async()=>{
    setLoading(true);
    const {data} = await supabase.from('annonces').select('*, boutiques(*)').order('created_at',{ascending:false}).limit(50);
    if(data) setAnnonces(data);
    setLoading(false);
  };

  const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') + '-' + Math.floor(Math.random()*999);

  const handleAuth = async(type)=>{
    if(!auth.email || !auth.pass) return alert('Email + mot de passe');
    if(type==='signup'){
      const {data,error}=await supabase.auth.signUp({email:auth.email, password:auth.pass, options:{data:{full_name:auth.nom}}});
      if(error) return alert(error.message);
      alert('Compte créé! Connecte-toi maintenant.');
      setStep('login');
    } else {
      const {data,error}=await supabase.auth.signInWithPassword({email:auth.email, password:auth.pass});
      if(error) return alert(error.message);
      setUser(data.user); setStep('home');
    }
  };

  const createBoutiqueAndAnnonceFlow = async()=>{
    if(!user) return setStep('register');
    // Validation EXPERT
    if(!bForm.owner_name || bForm.owner_name.length<3) return alert('Nom complet min 3 lettres');
    if(!/^243[0-9]{9}$/.test(bForm.service_number)) return alert('Numéro WhatsApp doit être format 243810000000 (12 chiffres)');
    
    setLoading(true);
    const slug = slugify(bForm.etablissement_name);
    
    const {data: boutique, error: errB} = await supabase.from('boutiques').insert({
      user_id: user.id,
      owner_name: bForm.owner_name,
      etablissement_name: bForm.etablissement_name,
      slug: slug,
      service_number: bForm.service_number,
      whatsapp: bForm.service_number,
      secteur_detail: bForm.secteur_detail,
      commune: bForm.commune,
      adresse_physique: bForm.adresse,
      is_physique: bForm.is_physique,
    }).select().single();
    
    if(errB){ setLoading(false); return alert('Erreur boutique: '+errB.message); }
    alert('✅ Boutique créée: '+boutique.etablissement_name);
    setStep('createAnnonce');
    setLoading(false);
  };

  const createAnnonce = async()=>{
    if(!aForm.titre || !aForm.prix) return alert('Titre + Prix obligatoires');
    setLoading(true);
    
    // 1. Trouver ma boutique
    const {data: myBoutique} = await supabase.from('boutiques').select('*').eq('user_id',user.id).single();
    if(!myBoutique) return alert('Crée ta boutique d’abord');

    // 2. Upload image si existe
    let imageUrl = `https://picsum.photos/400?random=${Date.now()}`;
    if(aForm.file){
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const {error: upErr} = await supabase.storage.from('annonces').upload(fileName, aForm.file);
      if(!upErr){
        const {data: urlData} = supabase.storage.from('annonces').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    const {error} = await supabase.from('annonces').insert({
      boutique_id: myBoutique.id,
      user_id: user.id,
      titre: aForm.titre,
      prix_cdf: parseInt(aForm.prix),
      description: aForm.desc,
      images: [imageUrl],
    });
    
    setLoading(false);
    if(error) alert(error.message); else { alert('✅ Produit publié!'); setStep('home'); fetchAll(); }
  };

  const filtered = useMemo(()=>{
    if(!search) return annonces;
    const s=search.toLowerCase();
    return annonces.filter(a=> a.titre.toLowerCase().includes(s) || a.boutiques?.etablissement_name?.toLowerCase().includes(s) || a.boutiques?.commune?.toLowerCase().includes(s));
  },[search,annonces]);

  if(step!=='home') return(
    <div className="min-h-screen bg-[#F6F6F7] max-w-[430px] mx-auto p-4">
      <button onClick={()=>setStep('home')} className="mb-4 bg-white px-4 py-2 rounded-full text-sm">← Retour</button>
      {step==='register' || step==='login' ? (
        <div className="bg-white rounded-2xl p-6">
          <h1 className="font-black text-xl">{step==='register'?'Inscription Prestataire':'Connexion'}</h1>
          {step==='register' && <input value={auth.nom} onChange={e=>setAuth({...auth,nom:e.target.value})} placeholder="Nom complet" className="w-full mt-4 bg-gray-100 p-3 rounded-xl"/>}
          <input value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})} placeholder="email@wenze.cd" className="w-full mt-3 bg-gray-100 p-3 rounded-xl"/>
          <input type="password" value={auth.pass} onChange={e=>setAuth({...auth,pass:e.target.value})} placeholder="Mot de passe" className="w-full mt-3 bg-gray-100 p-3 rounded-xl"/>
          <button onClick={()=>handleAuth(step==='register'?'signup':'login')} className="w-full mt-4 bg-[#5F2EEA] text-white p-4 rounded-full font-black">{step==='register'?'CRÉER COMPTE':'SE CONNECTER'}</button>
          <button onClick={()=>setStep(step==='register'?'login':'register')} className="w-full mt-2 text-sm text-[#5F2EEA]">{step==='register'?'Déjà compte? Login':'Pas de compte? S’inscrire'}</button>
        </div>
      ): step==='createBoutique' ? (
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <h1 className="font-black">Devenir Prestataire V3</h1>
          <input value={bForm.owner_name} onChange={e=>setBForm({...bForm,owner_name:e.target.value})} placeholder="Nom complet (ex: Kelvin Mukendi)" className="w-full bg-gray-100 p-3 rounded-xl text-sm"/>
          <input value={bForm.etablissement_name} onChange={e=>setBForm({...bForm,etablissement_name:e.target.value})} placeholder="Nom établissement (ex: Maison Glam)" className="w-full bg-gray-100 p-3 rounded-xl text-sm"/>
          <input value={bForm.service_number} onChange={e=>setBForm({...bForm,service_number:e.target.value})} placeholder="243810000000" className="w-full bg-gray-100 p-3 rounded-xl text-sm border-2 border-green-200"/>
          <p className="text-[10px] text-gray-500">Format obligatoire: 243 + 9 chiffres (sans +)</p>
          <select value={bForm.secteur_detail} onChange={e=>setBForm({...bForm,secteur_detail:e.target.value})} className="w-full bg-gray-100 p-3 rounded-xl text-sm">
            {SECTEURS.map(s=><option key={s.id} value={s.id}>{s.ic} {s.n}</option>)}
          </select>
          <select value={bForm.commune} onChange={e=>setBForm({...bForm,commune:e.target.value})} className="w-full bg-gray-100 p-3 rounded-xl text-sm">
            {COMMUNES_KIN.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <input value={bForm.adresse} onChange={e=>setBForm({...bForm,adresse:e.target.value})} placeholder="Adresse physique (ex: Av. Lumumba 12)" className="w-full bg-gray-100 p-3 rounded-xl text-sm"/>
          <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={bForm.is_physique} onChange={e=>setBForm({...bForm,is_physique:e.target.checked})}/> J'ai une boutique physique 📍</label>
          <button onClick={createBoutiqueAndAnnonceFlow} className="w-full bg-[#FFD233] p-4 rounded-full font-black">VALIDER MA BOUTIQUE →</button>
        </div>
      ): (
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <h1 className="font-black">Publier Produit</h1>
          <input value={aForm.titre} onChange={e=>setAForm({...aForm,titre:e.target.value})} placeholder="Ex: Pagne Wax 6 yards" className="w-full bg-gray-100 p-3 rounded-xl"/>
          <input type="number" value={aForm.prix} onChange={e=>setAForm({...aForm,prix:e.target.value})} placeholder="Prix CDF" className="w-full bg-gray-100 p-3 rounded-xl"/>
          <input type="file" accept="image/*" onChange={e=>setAForm({...aForm,file:e.target.files[0]})} className="w-full bg-gray-100 p-3 rounded-xl text-sm"/>
          <textarea value={aForm.desc} onChange={e=>setAForm({...aForm,desc:e.target.value})} placeholder="Description" className="w-full bg-gray-100 p-3 rounded-xl"/>
          <button onClick={createAnnonce} className="w-full bg-[#5F2EEA] text-white p-4 rounded-full font-black">PUBLIER MAINTENANT</button>
        </div>
      )}
    </div>
  );

  return(
    <div className="min-h-screen bg-[#F6F6F7] max-w-[430px] mx-auto pb-20">
      <div className="bg-[#5F2EEA] p-4 flex justify-between items-center sticky top-0 z-10">
        <b className="text-white">WENZE V3 EXPERT</b>
        {user? <span className="bg-[#FFD233] w-8 h-8 rounded-full flex items-center justify-center font-bold">{user.email[0].toUpperCase()}</span> : <button onClick={()=>setStep('register')} className="bg-white px-3 py-1 rounded-full text-xs font-bold">S'inscrire</button>}
      </div>
      <div className="bg-[#5F2EEA] px-4 pb-3">
        <div className="bg-white rounded-full px-4 py-2 flex gap-2"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cherche coiffure à Gombe..." className="flex-1 outline-none text-sm"/></div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {loading? <p className="col-span-2 text-center py-10">Chargement...</p> : filtered.map(a=>(
          <div key={a.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border">
            <div className="relative">
              <img src={a.images?.[0]} className="aspect-square object-cover w-full" alt=""/>
              {/* BOUTON CONTACTEZ-MOI SUR IMAGE - VISION V3 */}
              <a href={`https://wa.me/${a.boutiques?.service_number}?text=Salut ${a.boutiques?.etablissement_name}, je veux ${a.titre} à ${a.prix_cdf} CDF sur WENZE`} target="_blank" className="absolute bottom-2 left-2 right-2 bg-green-500 text-white text-[10px] font-black py-2 rounded-full text-center shadow-lg">
                💬 Contactez-moi
              </a>
            </div>
            <div className="p-2.5">
              <p className="font-bold text-xs truncate">{a.titre}</p>
              <p className="text-[11px] text-gray-500 truncate">{a.boutiques?.etablissement_name} • {a.boutiques?.commune}</p>
              <p className="font-black text-sm mt-1">{a.prix_cdf?.toLocaleString()} CDF</p>
              {a.boutiques?.is_physique && <p className="text-[9px] text-green-600">📍 Boutique physique</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t flex justify-around py-3 rounded-t-2xl">
        <button onClick={()=>setStep('home')}>🏠</button>
        <button onClick={()=> user? setStep('createBoutique') : setStep('register')} className="bg-[#FFD233] w-12 h-12 rounded-full -mt-3 font-bold text-xl">+</button>
        <button onClick={()=> user? supabase.auth.signOut().then(()=>setUser(null)) : setStep('login')}>{user?'🚪':'👤'}</button>
      </div>
    </div>
  );
      }
