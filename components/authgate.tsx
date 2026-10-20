"use client"
export function useAuthGate() {
  const router = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('wenze_user') || 'null') : null;
  
  const requireAuth = (action: string, callback: () => void) => {
    const user = JSON.parse(localStorage.getItem('wenze_user') || 'null');
    if (!user) {
      // Il peut VOIR, mais pour FAIRE, on bloque
      if (confirm(`Pour ${action}, crée ton compte WENZE gratuit (1 numéro = 1 compte). Continuer ?`)) {
        router.push('/inscription?redirect=' + window.location.pathname);
      }
      return false;
    }
    callback();
    return true;
  }
  return { requireAuth };
}

// Utilisation dans Boutiques - bouton WhatsApp
const { requireAuth } = useAuthGate();
<button onClick={() => requireAuth('contacter ce vendeur sur WhatsApp', () => {
  window.open(`https://wa.me/${boutique.telephone}`, '_blank')
})}>
  Contacter WhatsApp
</button>
