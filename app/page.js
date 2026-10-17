'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const COMMUNES = ["Gombe","Lingwala","Barumbu","Kinshasa","Bumbu","Selembao","Mont-Ngafula","Ngaba","Makala","Ndjili","Kimbanseke","Nsele","Maluku","Kintambo","Ngiri-Ngiri","Bandale","Ngaliema","Limete","Masina","Matete","Kalamu","Bandal","Kasa-Vubu"];
const CATS = ["Alimentation","Mode","Électronique","Services","Cosmétique","Quincaillerie","Grossiste"];

const compress = (file) => new Promise(res=>{
  const img=new Image(), c=document.createElement('canvas'), r=new FileReader();
  r.onload=e=>img.src=e.target.result;
  img.onload=()=>{let w=img.width,h=img.height; if(w>800){h=h*800/w;w=800} c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h); c.toBlob(b=>res(new File([b],file.name,{type:'image/jpeg'})),'image/jpeg',0.7);};
  r.readAsDataURL(file);
});

const haversine = (lat1,lon1,lat2,lon2)=>{
  if(!lat1||!lat2) return 999; const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

export default function Business(){
  const [user,setUser]=useState(null); const [email,setEmail]=useState(''); const [pwd,setPwd]=useState(''); const [role,setRole]=useState('vendeur');
  const [boutiques,setBoutiques]=useState([]); const [annonces,setAnnonces]=useState([]);
  const [nomBoutique,setNomBoutique]=useState(''); const [commune,setCommune]=useState('Gombe'); const [cat,setCat]=useState('Électronique');
  const [titre,setTitre]=useState(''); const [prix,setPrix]=useState(''); const [desc,setDesc]=useState('');
  const [search,setSearch]=useState(''); const [filtreCommune,setFiltreCommune]=useState(''); const [filtreCat,setFiltreCat]=useState(''); const [dist,setDist]=useState('5km');
  const [pos,setPos]=useState(null); const [loading,setLoading]=useState(false); const [myBoutiqueId,setMyBoutiqueId]=useState(null);

  useEffect(()=>{
    supabase.auth.onAuthStateChange((_,s)=>setUser(s?.user||null));
    supabase.auth.getSession().then(({data})=>setUser(data?.session?.user||null));
    navigator.geolocation?.getCurrentPosition(p=>setPos({lat:p.coords.latitude,lng:p.coords.longitude}),()=>{}, {enableHighAccuracy:true});
    fetchAll();
  },[]);

  useEffect(()=>{ if(user) fetchMyBoutique(); },[user]);

  const fetchAll = async()=>{
    const {data:b}=await supabase.from('boutiques').select('*').order('created_at',{ascending:false});
    const {data:a}=await supabase.from('annonces').select('*').order('created_at',{ascending:false});
    if(b) setBoutiques(b); if(a) setAnnonces(a);
  };
  const fetchMyBoutique = async()=>{
    const {data}=await supabase.from('boutiques').select('id').eq('user_id',user.id).limit(1).single();
    if(data) setMyBoutiqueId(data.id);
  };

  const signup = async()=>{
    if(role==='DG') return alert('Compte DG bloqué - contact admin');
    if(!email||!pwd) return alert('Email + mot de passe requis');
    setLoading(true);
    const {data,error}=await supabase.auth.signUp({email,password:pwd});
    if(error){setLoading(false); return alert('Signup: '+error.message);}
    const userId = data.user?.id || data.session?.user?.id;
    if(userId){
      await supabase.from('profiles').insert({id:userId, nom:email.split('@')[0], role, commune, verifie:false});
    }
    setLoading(false); alert('Compte créé! Tu peux te connecter maintenant'); setUser(data.user||data.session?.user);
  };
  const login = async()=>{ 
    if(!email||!pwd) return alert('Email + mot de passe requis');
    setLoading(true); 
    const {data,error}=await supabase.auth.signInWithPassword({email,password:pwd}); 
    setLoading(false); 
    if(error) alert('Login: '+error.message); 
    else setUser(data.user); 
  };

  const createBoutique = async()=>{
    if(!user) return alert('Connecte-toi d\'abord');
    if(!nomBoutique) return alert('Nom boutique requis'); 
    setLoading(true);
    const {data,error}=await supabase.from('boutiques').insert({user_id:user.id, nom_boutique:nomBoutique, categorie:cat, commune, description:'Vitrine WENZE-WENZE-BUSINESS', lat:pos?.lat, lng:pos?.lng}).select().single();
    setLoading(false); 
    if(error) alert('Boutique: '+error.message); 
    else {setMyBoutiqueId(data.id); setNomBoutique(''); fetchAll(); alert('Boutique créée! ID: '+data.id); }
  };

  const publishAnnonce = async(e)=>{
    const files=Array.from(e.target.files||[]); if(!myBoutiqueId) return alert('Crée ta boutique d\'abord en haut!');
    if(!files.length) return;
    setLoading(true); const urls=[];
    for(const f of files.slice(0,3)){ const c=await compress(f); const name=`${Date.now()}_${Math.random()}.jpg`; const {error:upErr}=await supabase.storage.from('annonces').upload(name,c); if(upErr){alert(upErr.message); setLoading(false); return;} const {data}=supabase.storage.from('annonces').getPublicUrl(name); urls.push(data.publicUrl); }
    const prix_cdf=parseInt(prix||'0');
    const {error}=await supabase.from('annonces').insert({boutique_id:myBoutiqueId, titre, prix_cdf, description:desc, images:urls, categorie:cat, commune, lat:pos?.lat, lng:pos?.lng});
    setLoading(false); if(error) alert(error.message); else {alert(`Annonce publiée! ${prix_cdf} CDF = ${(prix_cdf/2250).toFixed(2)}$`); setTitre(''); setPrix(''); setDesc(''); fetchAll();}
  };

  const filtered = annonces.filter(a=>{
    const matchSearch = !search || a.titre?.toLowerCase().includes(search.toLowerCase());
    const matchCommune = !filtreCommune || a.commune===filtreCommune;
    const matchCat = !filtreCat || a.categorie===filtreCat;
    const d=haversine(pos?.lat,pos?.lng,a.lat,a.lng); const maxDist = dist==='500m'?0.5:dist==='1km'?1:5;
    const matchDist = !pos || d<=maxDist;
    return matchSearch && matchCommune && matchCat && matchDist;
  });

  if(!user) return(
    <div style={{minHeight:'100vh',background:'#FFFBF0',padding:'20px'}}>
      <div style={{background:'#0F3D2E',padding:'12px',borderRadius:'12px',color:'#D4A017',fontWeight:'900',textAlign:'center',fontSize:'18px'}}>WENZE-WENZE-BUSINESS • PHASE 1</div>
      <div style={{background:'#fff',padding:'
