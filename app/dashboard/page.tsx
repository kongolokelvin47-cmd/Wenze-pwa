// app/dashboard/page.tsx - VERSION VISION
if (!me) router.push('/onboarding') // pas de profil -> onboarding

if (me.user_type === 'client') {
  router.push('/') // PAS /favoris. Home = son dashboard avec favoris inclus
} 
else {
  // ICI ON AFFICHE LE VRAI DASHBOARD BUSINESS
  switch(me.user_type) {
    case 'grossiste':
      // Métriques: 
      // SELECT count(distinct vendeur_id) FROM commandes WHERE grossiste_id = me.id
      // SELECT sum(total) WHERE created_at = today AND type='b2b'
      // Liste: Mes Vendeurs fidèles (top 10)
      break;
    case 'vendeur':
    case 'boutique':
      // Métriques:
      // Ventes du jour: SELECT sum(total) FROM commandes WHERE vendeur_id = me.id AND date=today
      // Stock faible: SELECT * FROM produits WHERE vendeur_id=me.id AND stock < 5
      // Commandes grossiste: bouton "Voir grossistes"
      break;
    case 'prestataire':
      // Métriques:
      // Demandes: SELECT * FROM demandes WHERE prestataire_id=me.id AND statut='en_attente'
      // Avis: SELECT avg(note) FROM avis WHERE prestataire_id=me.id
      break;
  }
}
