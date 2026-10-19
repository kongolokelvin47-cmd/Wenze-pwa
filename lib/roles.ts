export type Role = "client" | "vendeur" | "prestataire" | "grossiste" | "ambassadeur" | "superviseur" | "dg";

export const ROLES = {
  client: { canPublish: false, canPublishOccasionnel: true, maxAnnonces: 0, needsPayment: true },
  vendeur: { canPublish: true, maxAnnonces: 3, freemium: true }, // 3 à vie
  prestataire: { canPublish: true, maxAnnonces: 9999, prix: 5 }, // même tarif pro
  grossiste: { canPublish: true, maxAnnonces: 9999, prix: 25, canHaveSubAccounts: true },
  ambassadeur: { hasCodeParrainage: true },
  superviseur: { canCreateAmbassadeur: true },
  dg: { allAccess: true, need2FA: true }
};

export const checkDowngrade = (user:any) => {
  const expire = localStorage.getItem("abonnement_expire");
  if(expire && Date.now() > parseInt(expire) && ["vendeur","prestataire","grossiste"].includes(user.role)){
    return { ...user, role: "vendeur", type: "freemium", abonnement: "Freemium - Retour auto non-paiement" };
  }
  return user;
};
