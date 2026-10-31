// lib/roles.ts - WENZE WENZE BUSINESS MULTI-TICKETS - TON MARCHÉ.CD
// Règle V6: Même prix pour vendeur/prestataire/grossiste/client - On vend tickets pub, pas rôle - Rôles = capacités seulement

export type Role = "client" | "vendeur" | "prestataire" | "grossiste" | "ambassadeur" | "superviseur" | "dg";

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,""); }
function safeParse(k:string){ try{ const r=typeof window!=="undefined"?localStorage.getItem(k):null; return r?JSON.parse(r):null; }catch{ return null; } }

export const ROLES = {
  client: { 
    canPublish: true, // V6: peut publier avec ticket occasionnel
    canPublishOccasionnel: true, 
    canPublishBoutique: false, // doit passer vendeur pour boutique
    maxAnnonces: 50, // Max 50 actives global V6, pas 0
    freemium: false, // client n'a pas freemium boutique, a ticket 0.2$/j
    prix: 0, // même prix, ticket OCC 0.2$/j
    needsPayment: false, // peut acheter ticket OCC direct
    badge: "👤 Client"
  },
  vendeur: { 
    canPublish: true, 
    canPublishOccasionnel: true,
    canPublishBoutique: true,
    maxAnnonces: 50, // V6 max 50 actives global, pas 3
    freemium: true, // 3 images à vie strictes 30j puis caché
    freemiumMax: 3,
    freemiumDuree: 30,
    prix: 5, // V6 même prix - STANDARD 5$ = 4 places strictes
    badge: "🛍️ Vendeur"
  },
  prestataire: { 
    canPublish: true, 
    canPublishOccasionnel: true,
    canPublishBoutique: true,
    maxAnnonces: 50, // même que vendeur V6
    freemium: true, // même freemium
    freemiumMax: 3,
    prix: 5, // V6 MÊME TARIF que vendeur - STANDARD 5$, PRO 10$, PREMIUM 20$ - plus de discrimination
    badge: "🔧 Prestataire",
    note: "Même tarif que vendeur - On vend tickets pub, pas rôle"
  },
  grossiste: { 
    canPublish: true, 
    canPublishOccasionnel: true,
    canPublishBoutique: true,
    maxAnnonces: 50, // V6 max 50, pas 9999
    freemium: true,
    freemiumMax: 3,
    prix: 5, // V6: 25$ ancien supprimé -> PREMIUM 20$ max mais même entrée STANDARD 5$ possible
    canHaveSubAccounts: true, // seul diff V6
    badge: "🏭 Grossiste",
    note: "Ex-25$ supprimé - Maintenant PREMIUM 20$ = 30 places strictes - Même prix que détails"
  },
  ambassadeur: { 
    hasCodeParrainage: true, 
    canPublish: false,
    canPublishOccasionnel: true,
    maxAnnonces: 50,
    badge: "🎖️ Ambassadeur"
  },
  superviseur: { 
    canCreateAmbassadeur: true, 
    canPublish: true,
    maxAnnonces: 50,
    badge: "👔 Superviseur"
  },
  dg: { 
    allAccess: true, 
    need2FA: true, 
    canPublish: true,
    maxAnnonces: 50,
    badge: "👑 DG"
  }
} as const;

// V6: Check downgrade = Freemium 30j -> Caché + tickets expirés -> pas de rôle vendeur avec 0 ticket
export const checkDowngrade = (user:any) => {
  if(!user) return user;
  try{
    if(typeof window==="undefined") return user;
    const { verifierAbonnement, isCompteCache } = require("./paiement");
    const ab = verifierAbonnement();
    const wa = cleanWa(user.ownerWhatsapp||user.whatsapp||user.id||"");

    // 1. Si compte caché (Freemium 30j expiré + 0 ticket actif) -> retour vendeur freemium caché
    if(ab.isCache){
      return { 
        ...user, 
        role: "vendeur" as Role, 
        type: "freemium_cache", 
        abonnement: "Freemium Caché - 30j expiré - Paye 5$ pour réapparaître",
        isCache: true,
        badge: "🔒",
        placesRestantes: 0,
        canPublish: false, // bloqué jusqu'à achat ticket
        message: ab.message
      };
    }

    // 2. Si a des tickets actifs -> garde rôle, mais met à jour places
    if(ab.isPaye){
      return {
        ...user,
        role: user.role || "vendeur",
        type: "paye",
        abonnement: `${ab.ticketsActifs?.length||1} tickets actifs - ${ab.placesRestantes||0} places libres strictes`,
        isCache: false,
        badge: ab.badge||"⭐",
        placesRestantes: ab.placesRestantes,
        ticketsActifs: ab.ticketsActifs,
        canPublish: ab.peutPublier && (ab.placesRestantes>0 || ab.isPaye),
        maxAnnonces: 50, // V6 max global
        palierId: ab.palierId,
      };
    }

    // 3. Freemium 30j visible - 3 à vie strictes
    if(ab.isFreemium){
      return {
        ...user,
        role: "vendeur" as Role,
        type: "freemium",
        abonnement: `Freemium ${ab.count||0}/3 strictes à vie - ${ab.joursRestants||0}j restants avant caché`,
        isCache: false,
        badge: "🆓",
        placesRestantes: ab.imagesRestantes||0,
        canPublish: ab.peutPublier,
        maxAnnonces: 3, // freemium 3 à vie mais max 50 global si paye après
        joursRestants: ab.joursRestants,
      };
    }

    // Fallback ancien système abonnement_expire pour compat
    const expire = localStorage.getItem("abonnement_expire") || localStorage.getItem("wenze_abonnement_expire");
    if(expire && Date.now() > parseInt(expire) && ["vendeur","prestataire","grossiste"].includes(user.role)){
      return { ...user, role: "vendeur" as Role, type: "freemium", abonnement: "Freemium - Retour auto non-paiement - V6: Compte caché après 30j", isCache: false, badge: "🆓", canPublish: true, maxAnnonces: 3 };
    }

    return user;
  }catch{
    return user;
  }
};

// Helper V6: peut publier selon rôle + tickets
export function canPublishByRole(user:any){
  if(!user) return { ok:false, msg:"Non connecté" };
  const role = (user.role||"vendeur") as Role;
  const roleConfig = ROLES[role] || ROLES.vendeur;
  
  // DG et superviseur bypass
  if(role==="dg" || role==="superviseur") return { ok:true, msg:`${roleConfig.badge} bypass - Max 50`, role, config: roleConfig };

  // Check tickets V6
  try{
    const { verifierAbonnement } = require("./paiement");
    const ab = verifierAbonnement();
    if(ab.isCache) return { ok:false, msg: ab.message, role, isCache:true, config: roleConfig };
    if(!ab.peutPublier) return { ok:false, msg: ab.message || "Plus de places strictes - Achète ticket cumulable", role, config: roleConfig, ab };
    return { ok:true, msg: `${roleConfig.badge} ${role} - ${ab.placesRestantes||ab.imagesRestantes||0} places libres strictes - Max 50 - Même prix pour tous`, role, config: roleConfig, ab };
  }catch{
    return { ok: roleConfig.canPublish, msg: `${roleConfig.badge} peut publier - Max ${roleConfig.maxAnnonces}`, role, config: roleConfig };
  }
}

export function getMaxAnnoncesForRole(role:Role){
  // V6: tous 50 max actives global, freemium limité à 3 à vie dans checkFreemiumWenze
  return 50;
}

export function isSamePriceForAllRoles(){
  return true; // V6 affirmation
        }
