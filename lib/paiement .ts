export const handlePaiement = (type:"pro"|"grossiste"|"boost"|"occasionnel", montantUSD:number, devise:"$" | "CDF") => {
  // Ici tu brancheras Mobile Money plus tard
  localStorage.setItem("paiement_reussi","true");
  localStorage.setItem("type_paye", type);
  localStorage.setItem("abonnement_expire", String(Date.now() + 30*24*60*60*1000));
  localStorage.setItem("dernier_paiement", JSON.stringify({type, montantUSD, devise, date: new Date().toISOString()}));
  return true; // activation immédiate
};
