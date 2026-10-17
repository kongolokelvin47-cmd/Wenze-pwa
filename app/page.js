'use client';
import { useState } from 'react';

// FONCTION DE COMPRESSION AVANT ENVOI DB
async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    reader.readAsDataURL(file);
  });
}

export default function WenzeWenze() {
  const [preview, setPreview] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // COMPRESSION AVANT DB
    const compressed = await compressImage(file);
    console.log(`Original: ${(file.size/1024).toFixed(0)}KB -> Compressé: ${(compressed.size/1024).toFixed(0)}KB`);
    const url = URL.createObjectURL(compressed);
    setPreview(url);
    // ICI: envoie `compressed` à ta DB (Supabase/Firebase)
  };

  return (
    <div style={{minHeight:'100vh', background:'#FFFBF0'}}>
      {/* HEADER AVEC LOGO RESPONSIVE */}
      <header style={{background:'#0F3D2E', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <div style={{width:'36px', height:'36px', background:'#fff', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'900', color:'#0F3D2E'}}>W</div>
          <span style={{color:'#D4A017', fontWeight:'800'}}>WENZE-WENZE</span>
        </div>
        <div style={{background:'#fff', borderRadius:'20px', padding:'6px 12px', display:'flex', gap:'8px', flex:1, maxWidth:'60%', marginLeft:'12px'}}>
          <span>🔍</span><input placeholder="Rechercher produits..." style={{border:'none', outline:'none', width:'100%', fontSize:'13px'}} />
        </div>
      </header>

      {/* LOGO HERO - BIEN ENCADRÉ, JAMAIS COUPÉ */}
      <div className="logo-container" style={{background:'white', padding:'16px', display:'flex', justifyContent:'center'}}>
        <img 
          src="/logo.png" 
          alt="WENZE-WENZE"
          style={{maxWidth:'360px', width:'90%', height:'auto', objectFit:'contain'}}
          onError={(e)=>e.target.style.display='none'}
        />
      </div>

      {/* TEST UPLOAD AVEC COMPRESSION */}
      <div style={{padding:'16px'}}>
        <h3 style={{fontSize:'14px', fontWeight:'700', marginBottom:'8px'}}>Test Upload Produit (avec compression)</h3>
        <input type="file" accept="image/*" onChange={handleUpload} style={{width:'100%'}} />
        {preview && (
          <div style={{marginTop:'12px', background:'white', borderRadius:'12px', padding:'8px'}}>
            <img src={preview} className="product-image" alt="preview" />
            <p style={{fontSize:'12px', color:'green', marginTop:'6px'}}>✅ Image compressée et encadrée, prête pour DB</p>
          </div>
        )}
      </div>

      {/* CATÉGORIES - RESPONSIVE GRID */}
      <div style={{padding:'16px'}}>
        <div style={{background:'linear-gradient(90deg,#D4A017,#FFD700)', borderRadius:'12px', padding:'14px', textAlign:'center'}}>
          <b>FLASH SALES • JUSQU'À -50%</b><p style={{fontSize:'12px'}}>Offres limitées aujourd'hui</p>
        </div>
        
        <h4 style={{marginTop:'16px', fontWeight:'700'}}>Produits populaires • Près de Kinshasa</h4>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'12px', marginTop:'12px'}}>
          {[1,2].map(i=>(
            <div key={i} style={{background:'white', borderRadius:'12px', padding:'8px'}}>
              <img src="/logo.png" className="product-image" alt="produit" />
              <p style={{fontSize:'12px', fontWeight:'600', marginTop:'6px'}}>Produit WENZE-WENZE</p>
              <p style={{fontSize:'13px', color:'#0F3D2E', fontWeight:'800'}}>45 000 CDF</p>
            </div>
          ))}
        </div>
      </div>

      <footer style={{textAlign:'center', padding:'20px', fontSize:'11px', opacity:0.6}}>
        WENZE-WENZE • Paiement sécurisé • Livraison Kinshasa, Lubumbashi, Bukavu
      </footer>
    </div>
  );
    }
