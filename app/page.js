'use client';
import { useState } from 'react';

const compress = (file) => new Promise(res=>{
  const img=new Image(), c=document.createElement('canvas'), r=new FileReader();
  r.onload=e=>img.src=e.target.result; img.onload=()=>{
    let w=img.width,h=img.height; if(w>800){h=h*800/w;w=800}
    c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
    c.toBlob(b=>res(new File([b],file.name,{type:'image/jpeg'})),'image/jpeg',0.7);
  }; r.readAsDataURL(file);
});

const Logo = () => (
  <div style={{width:'100%',maxWidth:'340px',background:'#0F3D2E',borderRadius:'14px',padding:'14px',display:'flex',alignItems:'center',gap:'10px'}}>
    <div style={{width:'44px',height:'44px',background:'#fff',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'900',color:'#0F3D2E',fontSize:'22px'}}>W</div>
    <div>
      <div style={{color:'#D4A017',fontWeight:'900',fontSize:'15px',lineHeight:'1'}}>WENZE-WENZE-BUSINESS</div>
      <div style={{color:'#fff',fontSize:'9px',opacity:0.9}}>Votre plateforme, vos solutions</div>
    </div>
  </div>
);

export default function Business(){
  const [tab,setTab]=useState('Accueil');
  const [panier,setPanier]=useState([]);
  const produits=[
    {id:1,nom:'Écouteurs Bluetooth Pro',prix:'45 000 CDF'},
    {id:2,nom:'Montre Connectée',prix:'62 500 CDF'},
  ];

  return(
    <div style={{minHeight:'100vh',background:'#FFFBF0',paddingBottom:'70px'}}>
      <div style={{background:'#0F3D2E',padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:20}}>
        <b style={{color:'#D4A017',fontSize:'14px'}}>WENZE-WENZE-BUSINESS</b>
        <span style={{background:'#D4A017',padding:'4px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'700'}}>🛒 {panier.length}</span>
      </div>

      {tab==='Accueil' && (
        <div style={{padding:'12px'}}>
          <div style={{display:'flex',justifyContent:'center',padding:'8px'}}>
            <Logo />
          </div>
          {/* VRAI LOGO IMAGE - SI IL EXISTE IL S'AFFICHE, SINON LE LOGO CI-DESSUS RESTE */}
          <div style={{display:'flex',justifyContent:'center',marginTop:'8px'}}>
            <img src="/logo.png" alt="" style={{width:'90%',maxWidth:'340px',height:'auto',objectFit:'contain',display:'block'}} onError={e=>e.target.style.display='none'} />
          </div>

          <div style={{marginTop:'12px',background:'linear-gradient(90deg,#D4A017,#FFD700)',borderRadius:'10px',padding:'12px',textAlign:'center',fontWeight:'800',fontSize:'14px'}}>FLASH SALES • JUSQU'À -50%<div style={{fontWeight:'400',fontSize:'12px'}}>Offres limitées aujourd'hui</div></div>

          <h4 style={{marginTop:'14px',fontWeight:'800',fontSize:'14px'}}>Produits populaires • Près de Kinshasa</h4>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'10px'}}>
            {produits.map(p=>(
              <div key={p.id} style={{background:'#fff',borderRadius:'12px',padding:'8px',border:'1px solid #eee'}}>
                <div style={{width:'100%',aspectRatio:'1/1',background:'#f7f7f7',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px'}}>🎧</div>
                <p style={{fontSize:'12px',fontWeight:'600',marginTop:'6px'}}>{p.nom}</p>
                <p style={{fontSize:'13px',fontWeight:'800',color:'#0F3D2E'}}>{p.prix}</p>
                <button onClick={()=>setPanier([...panier,p])} style={{width:'100%',marginTop:'6px',background:'#0F3D2E',color:'#D4A017',border:'none',padding:'8px',borderRadius:'8px',fontWeight:'700'}}>Ajouter</button>
              </div>
            ))}
          </div>

          <div style={{marginTop:'14px',background:'#fff',borderRadius:'12px',padding:'12px'}}>
            <b style={{fontSize:'13px'}}>Test Upload (compression auto avant DB)</b>
            <input type="file" accept="image/*" onChange={async e=>{
              const f=e.target.files[0]; if(!f) return;
              const c=await compress(f);
              alert(`✅ Compressé: ${(f.size/1024).toFixed(0)}KB → ${(c.size/1024).toFixed(0)}KB\nPrêt pour envoi DB!`);
            }} style={{width:'100%',marginTop:'8px',fontSize:'13px'}} />
          </div>
        </div>
      )}

      {tab==='Boutiques' && <div style={{padding:'16px'}}><h3>Boutiques vérifiées</h3><div style={{background:'#fff',padding:'12px',borderRadius:'10px',marginTop:'10px'}}>TechHub Kinshasa - Livraison 24h</div></div>}
      {tab==='Video' && <div style={{padding:'16px'}}><div style={{background:'#000',color:'#fff',borderRadius:'12px',padding:'60px 20px',textAlign:'center'}}>Wenze Video • Démo produit<br/>Ajout panier direct</div></div>}
      {tab==='Panier' && <div style={{padding:'16px'}}><h3>Panier ({panier.length})</h3>{panier.map((p,i)=><div key={i} style={{background:'#fff',padding:'10px',borderRadius:'8px',marginTop:'8px'}}>{p.nom} - {p.prix}</div>)} {panier.length>0 && <button style={{width:'100%',marginTop:'12px',background:'#D4A017',padding:'14px',border:'none',borderRadius:'10px',fontWeight:'800'}}>Commander • Paiement sécurisé</button>}</div>}

      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#0F3D2E',display:'flex',justifyContent:'space-around',padding:'8px 0',borderTop:'1px solid #1a5a44'}}>
        {['Accueil','Boutiques','Video','Panier'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?'#D4A017':'transparent',color:tab===t?'#0F3D2E':'#fff',border:'none',padding:'6px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:'800'}}>{t}</button>
        ))}
      </div>
    </div>
  )
}
