'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const COMMUNES = ["Gombe","Bandale","Ngaliema","Limete","Masina","Matete","Kalamu","Lingwala","Barumbu","Kinshasa","Bumbu","Selembao","Mont-Ngafula","Ngaba","Makala","Ndjili","Kimbanseke","Nsele","Maluku","Kintambo","Ngiri-Ngiri","Bandal","Kasa-Vubu","Ngiri-Ngiri"];
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
    supabase.auth.getUser().then(({data})=>setUser(data?.user));
    navigator.geolocation?.getCurrentPosition(p=>setPos({lat:p.coords.latitude,lng:p.coords.longitude}),()=>{}, {enableHighAccuracy:true});
    fetchAll();
  },[]);

  const fetchAll = async()=>{
    const {data:b}=await supabase.from('boutiques').select('*').order('created_at',{ascending:false});
    const {data:a}=await supabase.from('annonces').select('*').order('created_at',{ascending:false});
    if(b) setBoutiques(b); if(a) setAnnonces(a);
  };

  const signup = async()=>{
    if(role==='DG') return alert('Compte DG: contactez administration - 2FA obligatoire');
    setLoading(true);
    const {data,error}=await supabase.auth.signUp({email,password:pwd});
    if(error){setLoading(false); return alert(error.message);}
    await supabase.from('profiles').insert({id:data.user.id, nom:email.split('@')[0], role, commune, verifie:false});
    setLoading(false); alert('Compte créé! Vérifiez email'); setUser(data.user);
  };
  const login = async()=>{ setLoading(true); const {data,error}=await supabase.auth.signInWithPassword({email,password:pwd}); setLoading(false); if(error) alert(error.message); else setUser(data.user); };

  const createBoutique = async()=>{
    if(!nomBoutique) return alert('Nom requis'); setLoading(true);
    const {data,error}=await supabase.from('boutiques').insert({user_id:user.id, nom_boutique:nomBoutique, categorie:cat, commune, description:'Vitrine WENZE-WENZE-BUSINESS', lat:pos?.lat, lng:pos?.lng}).select().single();
    setLoading(false); if(error) alert(error.message); else {setMyBoutiqueId(data.id); setNomBoutique(''); fetchAll(); alert('Boutique créée + partageable: wenze-pwa.vercel.app/b/'+data.id); }
  };

  const publishAnnonce = async(e)=>{
    const files=Array.from(e.target.files||[]); if(!files.length||!myBoutiqueId) return alert('Crée boutique d\'abord + choisis images');
    setLoading(true); const urls=[];
    for(const f of files.slice(0,3)){ const c=await compress(f); const name=`${Date.now()}_${Math.random()}.jpg`; await supabase.storage.from('annonces').upload(name,c); const {data}=supabase.storage.from('annonces').getPublicUrl(name); urls.push(data.publicUrl); }
    const prix_cdf=parseInt(prix||'0');
    const {error}=await supabase.from('annonces').insert({boutique_id:myBoutiqueId, titre, prix_cdf, description:desc, images:urls, categorie:cat, commune, lat:pos?.lat, lng:pos?.lng});
    setLoading(false); if(error) alert(error.message); else {alert(`Annonce publiée! ${prix_cdf} CDF = ${(prix_cdf/2250).toFixed(2)}$`); setTitre(''); setPrix(''); setDesc(''); fetchAll();}
  };

  const filtered = annonces.filter(a=>{
    const matchSearch = !search || a.titre.toLowerCase().includes(search.toLowerCase()) || a.description?.toLowerCase().includes(search.toLowerCase());
    const matchCommune = !filtreCommune || a.commune===filtreCommune;
    const matchCat = !filtreCat || a.categorie===filtreCat;
    const d=haversine(pos?.lat,pos?.lng,a.lat,a.lng); const maxDist = dist==='500m'?0.5:dist==='1km'?1:5;
    const matchDist = !pos || d<=maxDist;
    return matchSearch && matchCommune && matchCat && matchDist;
  });

  if(!user) return(
    <div style={{minHeight:'100vh',background:'#FFFBF0',padding:'20px'}}>
      <div style={{background:'#0F3D2E',padding:'12px',borderRadius:'12px',color:'#D4A017',fontWeight:'900',textAlign:'center'}}>WENZE-WENZE-BUSINESS • PHASE 1</div>
      <div style={{background:'#fff',padding:'16px',borderRadius:'12px',marginTop:'16px'}}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #ddd'}} />
        <input placeholder="Mot de passe" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'10px'}} />
        <select value={role} onChange={e=>setRole(e.target.value)} style={{width:'100%',padding:'10px',borderRadius:'8px',marginTop:'10px'}}><option value="client">Client</option><option value="vendeur">Vendeur</option><option value="grossiste">Grossiste B2B 25$/mois (56 250 FC)</option><option value="DG">DG (bloqué)</option></select>
        <button disabled={loading} onClick={signup} style={{width:'100%',marginTop:'12px',background:'#0F3D2E',color:'#D4A017',padding:'12px',borderRadius:'8px',border:'none',fontWeight:'800'}}>{loading?'...':'Créer compte sécurisé'}</button>
        <button disabled={loading} onClick={login} style={{width:'100%',marginTop:'8px',background:'#D4A017',color:'#0F3D2E',padding:'12px',borderRadius:'8px',border:'none',fontWeight:'800'}}>Se connecter</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:'100vh',background:'#FFFBF0',paddingBottom:'80px'}}>
      <div style={{background:'#0F3D2E',padding:'10px 14px',display:'flex',justifyContent:'space-between',color:'#D4A017',position:'sticky',top:0,zIndex:10}}><b>WENZE-WENZE-BUSINESS</b><button onClick={async()=>{await supabase.auth.signOut();}} style={{background:'#D4A017',border:'none',padding:'4px 10px',borderRadius:'20px',fontSize:'12px'}}>Sortir</button></div>

      <div style={{padding:'12px'}}>
        <div style={{background:'#fff',padding:'12px',borderRadius:'12px'}}>
          <b>Vitrine Pro {pos?'📍 GPS OK':''}</b>
          <input placeholder="Nom boutique ex: TechHub Gombe" value={nomBoutique} onChange={e=>setNomBoutique(e.target.value)} style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginTop:'8px'}}>
            <select value={commune} onChange={e=>setCommune(e.target.value)} style={{padding:'8px',borderRadius:'8px'}}>{COMMUNES.map(c=><option key={c}>{c}</option>)}</select>
            <select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:'8px',borderRadius:'8px'}}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
          </div>
          <button disabled={loading} onClick={createBoutique} style={{width:'100%',marginTop:'10px',background:'#0F3D2E',color:'#D4A017',padding:'10px',borderRadius:'8px',border:'none',fontWeight:'700'}}>{loading?'Création...':'Créer Boutique + Lien partageable'}</button>
          {myBoutiqueId && <p style={{fontSize:'11px',color:'green',marginTop:'6px'}}>ID Boutique: {myBoutiqueId} - prête pour annonces</p>}
        </div>

        <div style={{background:'#fff',padding:'12px',borderRadius:'12px',marginTop:'12px'}}>
          <b>Publier annonce - Prix CDF auto $ (1$=2250FC)</b>
          <input placeholder="Titre produit" value={titre} onChange={e=>setTitre(e.target.value)} style={{width:'100%',padding:'8px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}} />
          <input placeholder="Prix CDF ex: 45000" type="number" value={prix} onChange={e=>setPrix(e.target.value)} style={{width:'100%',padding:'8px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'6px'}} />
          <input placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} style={{width:'100%',padding:'8px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'6px'}} />
          <input type="file" multiple accept="image/*" onChange={publishAnnonce} style={{width:'100%',marginTop:'8px'}} />
          <p style={{fontSize:'11px',color:'#0F3D2E',marginTop:'6px'}}>✅ 3 images max • 800px • 70% • object-fit:contain • responsive</p>
        </div>

        <div style={{background:'#fff',padding:'12px',borderRadius:'12px',marginTop:'12px'}}>
          <b>Recherche intelligente + Géoloc</b>
          <input placeholder="Recherche produit, boutique..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px',marginTop:'8px'}}>
            <select value={filtreCommune} onChange={e=>setFiltreCommune(e.target.value)} style={{padding:'6px',borderRadius:'8px',fontSize:'12px'}}><option value="">Toutes communes</option>{COMMUNES.map(c=><option key={c}>{c}</option>)}</select>
            <select value={filtreCat} onChange={e=>setFiltreCat(e.target.value)} style={{padding:'6px',borderRadius:'8px',fontSize:'12px'}}><option value="">Toutes cat</option>{CATS.map(c=><option key={c}>{c}</option>)}</select>
            <select value={dist} onChange={e=>setDist(e.target.value)} style={{padding:'6px',borderRadius:'8px',fontSize:'12px'}}><option value="500m">500m</option><option value="1km">1km</option><option value="5km">5km</option></select>
          </div>
          <p style={{fontSize:'11px',opacity:0.6,marginTop:'6px'}}>{pos?`GPS: ${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)}`:'Active GPS pour filtre distance'} • {filtered.length} résultats</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'12px'}}>
          {filtered.map(a=>(
            <div key={a.id} style={{background:'#fff',borderRadius:'12px',padding:'8px',border:'1px solid #eee'}}>
              {a.images?.[0] ? <img src={a.images[0]} alt={a.titre} style={{width:'100%',aspectRatio:'1/1',objectFit:'contain',background:'#f7f7f7',borderRadius:'8px'}} /> : <div style={{width:'100%',aspectRatio:'1/1',background:'#f7f7f7',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}>📦</div>}
              <p style={{fontSize:'12px',fontWeight:'600',marginTop:'6px'}}>{a.titre}</p>
              <p style={{fontSize:'12px',fontWeight:'800',color:'#0F3D2E'}}>{a.prix_cdf} CDF • {(a.prix_cdf/2250).toFixed(2)}$</p>
              <p style={{fontSize:'10px',opacity:0.6}}>{a.commune} • {pos?`${haversine(pos.lat,pos.lng,a.lat,a.lng).toFixed(1)}km`:''}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
                                                                                                                                                                    }
