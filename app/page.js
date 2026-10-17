export default function Home() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '48px', color: '#193a1e', marginBottom: '10px' }}>
        WENZE-<span style={{ color: '#D4AF37' }}>WENZE</span>
      </h1>
      <p style={{ fontSize: '18px', color: '#193a1e', marginBottom: '30px', maxWidth: '400px' }}>
        Éveil de la Conscience à Kinshasa<br/>Ta transformation commence ici
      </p>
      
      <div style={{ display: 'flex', gap: '15px', flexDirection: 'column', width: '100%', maxWidth: '300px' }}>
        <button className="btn-primary">Commencer l'éveil</button>
        <button className="btn-gold">Voir les programmes</button>
      </div>

      <p style={{ marginTop: '40px', fontSize: '14px', opacity: 0.6 }}>
        ✅ Déploiement réussi - Vercel OK
      </p>
    </main>
  );
                 }
