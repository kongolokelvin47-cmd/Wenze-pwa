"use client"
import { useState } from 'react'

export default function Home(){
  const [tab,setTab] = useState('home')
  
  return (
    <div style={{maxWidth:420,margin:'0 auto',background:'#fff',minHeight:'100vh',fontFamily:'sans-serif',position:'relative',paddingBottom:70}}>
      {/* HEADER */}
      <div style={{padding:'10px 15px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <b style={{color:'#7c3aed',fontSize:18}}>WENZE WENZE</b>
        <div style={{display:'flex',gap:12}}>🛒 👤 🔔</div>
      </div>
      
      {/* SEARCH */}
      <div style={{padding:'0 15px',display:'flex',gap:8}}>
        <div style={{flex:1,background:'#f3f4f6',borderRadius:20,padding:'8px 15px',display:'flex',alignItems:'center'}}>🔍 <span style={{color:'#999',marginLeft:8,fontSize:13}}>Que recherchez vous ?</span></div>
        <div style={{background:'#7c3aed',color:'#fff',borderRadius:20,width:35,height:35,display:'flex',alignItems:'center',justifyContent:'center'}}>🔍</div>
      </div>

      {/* BANNER */}
      <div style={{margin:15,background:'linear-gradient(90deg,#fef3c7,#fde68a)',borderRadius:12,padding:15,display:'flex',justifyContent:'space-between'}}>
        <div><b>Wenze Wenze</b><br/><small>Achetez, Vendez, Grandissez</small><br/><button style={{background:'#f59e0b',border:'none',padding:'5px 10px',borderRadius:20,marginTop:5,fontSize:12}}>Découvrir maintenant</button></div>
        <div style={{fontSize:40}}>👩🏾‍🦱</div>
      </div>

      {/* CATEGORIES */}
      <div style={{display:'flex',justifyContent:'space-around',padding:'0 10px',textAlign:'center',fontSize:11}}>
        {['Tous','Électrique','Fourniture','Accessoire','Téléphone','Électronique','Maison','Alimentaire','Beauté'].map(c=>(
          <div key={c}><div style={{width:45,height:45,background:'#f5f3ff',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 5px'}}>📦</div>{c}</div>
        ))}
      </div>

      {/* WENZE VIDEO */}
      <div style={{padding:'15px'}}>
        <b>Wenze Vidéo 🎥</b>
        <div style={{display:'flex',gap:10,overflowX:'auto',marginTop:10}}>
          {[1,2,3].map(i=>(
            <div key={i} style={{minWidth:120,height:180,background:'#ddd',borderRadius:10,position:'relative',backgroundImage:'url(https://i.pravatar.cc/150?img='+i+')',backgroundSize:'cover'}}>
              <div style={{position:'absolute',bottom:5,left:5,background:'rgba(0,0,0,0.6)',color:'#fff',fontSize:10,padding:'2px 5px',borderRadius:5}}>4:12 • Vente</div>
            </div>
          ))}
        </div>
      </div>

      {/* VENTES FLASH */}
      <div style={{padding:'0 15px'}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><b>Ventes Flash ⚡</b><small style={{color:'#7c3aed'}}>Voir tout</small></div>
        <div style={{display:'flex',gap:10,marginTop:10}}>
          {[{n:'Chaussure',p:'15 000 CDF'},{n:'Montre',p:'25 000 CDF'},{n:'Sac',p:'30 000 CDF'}].map(p=>(
            <div key={p.n} style={{flex:1,border:'1px solid #eee',borderRadius:10,padding:8,textAlign:'center'}}><div style={{height:60,background:'#f3f4f6',borderRadius:8}}>👟</div><small>{p.n}</small><br/><b style={{color:'#7c3aed',fontSize:12}}>{p.p}</b></div>
          ))}
        </div>
      </div>

      {/* RECOMMANDÉ */}
      <div style={{padding:15}}>
        <b>Recommandé pour vous</b>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
          {[1,2,3,4].map(i=>(
            <div key={i} style={{border:'1px solid #eee',borderRadius:10,padding:8}}>
              <div style={{height:100,background:'#f3f4f6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>📱</div>
              <small>Produit {i}</small><br/><b>20 000 CDF</b>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:420,background:'#fff',borderTop:'1px solid #eee',display:'flex',justifyContent:'space-around',padding:'10px 0'}}>
        <div style={{textAlign:'center',color:'#7c3aed'}}>🏠<br/><small>Accueil</small></div>
        <div style={{textAlign:'center'}}>📹<br/><small>Vidéo</small></div>
        <div style={{textAlign:'center'}}>➕<br/><small>Vendre</small></div>
        <div style={{textAlign:'center'}}>💬<br/><small>Message</small></div>
        <div style={{textAlign:'center'}}>👤<br/><small>Profil</small></div>
      </div>
    </div>
  )
}
