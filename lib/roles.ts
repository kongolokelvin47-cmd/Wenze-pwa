// lib/roles.ts - WENZE WENZE BUSINESS
// Les rôles décrivent des capacités. Les abonnements ont le même prix pour tous (voir lib/paiement.ts).
//
// ATTENTION : le rôle est lu dans le localStorage du téléphone, donc modifiable par n'importe qui.
// Ces règles ne protègent rien tant qu'elles ne sont pas aussi appliquées côté serveur (Supabase RLS).

import { verifierAbonnement } from "./paiement";

export type Role =
  | "client"
  | "vendeur"
  | "prestataire"
  | "grossiste"
  | "ambassadeur"
  | "superviseur"
  | "dg";

function cleanWa(n: unknown): string {
  return (n || "").toString().replace(/[^0-9]/g, "");
}

export const ROLES = {
  client: {
    canPublish: true, // uniquement en vente occasionnelle (boost)
    canPublishOccasionnel: true,
    canPublishBoutique: false, // doit devenir vendeur pour ouvrir une boutique
    maxAnnonces: 50,
    freemium: false, // le client n'a pas de freemium
    prix: 0,
    needsPayment: false,
    badge: "👤 Client",
  },
  vendeur: {
    canPublish: true,
    canPublishOccasionnel: true,
    canPublishBoutique: true,
    maxAnnonces: 50,
    freemium: true, // 3 images à vie, visibles 30 jours, puis compte caché
    freemiumMax: 3,
    freemiumDuree: 30,
    prix: 5, // valeur indicative de l'ancien système : la grille actuelle est dans PALIERS
    badge: "🛍️ Vendeur",
  },
  prestataire: {
    canPublish: true,
    canPublishOccasionnel: true,
    canPublishBoutique: true,
    maxAnnonces: 50,
    freemium: true,
    freemiumMax: 3,
    prix: 5,
    badge: "🔧 Prestataire",
    note: "Même tarif que le vendeur : on vend de la visibilité, pas un rôle",
  },
  grossiste: {
    canPublish: true,
    canPublishOccasionnel: true,
    canPublishBoutique: true,
    maxAnnonces: 50,
    freemium: true,
    freemiumMax: 3,
    prix: 5,
    canHaveSubAccounts: true, // seule différence avec le vendeur
    badge: "🏭 Grossiste",
    note: "Même tarif que le vendeur",
  },
  ambassadeur: {
    hasCodeParrainage: true,
    canPublish: false,
    canPublishOccasionnel: true,
    maxAnnonces: 50,
    badge: "🎖️ Ambassadeur",
  },
  superviseur: {
    canCreateAmbassadeur: true,
    canPublish: true,
    maxAnnonces: 50,
    badge: "👔 Superviseur",
  },
  dg: {
    allAccess: true,
    need2FA: true,
    canPublish: true,
    maxAnnonces: 50,
    badge: "👑 DG",
  },
} as const;

function normaliserRole(r: unknown): Role | "" {
  const val = String(r || "")
    .trim()
    .toLowerCase();
  if (val in ROLES) return val as Role;
  return "";
}

function currentUser(): any {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("wenze_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Vérifie si un utilisateur possède un rôle donné (ou l'un des rôles autorisés).
 * Signatures supportées :
 *  - hasRole("dg") ou hasRole(["dg", "superviseur"]) -> vérifie l'utilisateur connecté
 *  - hasRole(user, "dg") ou hasRole(user, ["dg", "superviseur"]) -> vérifie l'objet user (ou rôle string)
 */
export function hasRole(
  userOrRole: any,
  expectedRoles?: Role | string | Array<Role | string>
): boolean {
  try {
    let targetUser: any;
    let allowedRaw: Role | string | Array<Role | string>;

    if (expectedRoles === undefined) {
      targetUser = currentUser();
      allowedRaw = userOrRole;
    } else {
      targetUser = userOrRole;
      allowedRaw = expectedRoles;
    }

    if (!targetUser || !allowedRaw) return false;

    const userRole =
      typeof targetUser === "string"
        ? normaliserRole(targetUser)
        : normaliserRole(targetUser.role || targetUser.type_compte);

    if (!userRole) return false;

    const list = Array.isArray(allowedRaw) ? allowedRaw : [allowedRaw];
    const normalizedAllowed = list
      .map((item) => normaliserRole(item))
      .filter((item): item is Role => Boolean(item));

    return normalizedAllowed.includes(userRole);
  } catch {
    return false;
  }
}

// ========== PROPRIÉTAIRE D'UNE ANNONCE ==========

/** Clé de comparaison d'un numéro : 9 derniers chiffres (ignore +243, 243 et le 0 initial). */
function phoneKey(v: unknown): string {
  const d = cleanWa(v);
  return d.length >= 7 ? d.slice(-9) : "";
}

/** Numéros et identifiants d'un utilisateur ou d'une annonce (ou d'un simple numéro). */
function identities(x: any): { phones: string[]; ids: string[] } {
  const phones: string[] = [];
  const ids: string[] = [];
  if (x === null || x === undefined || x === "") return { phones, ids };

  if (typeof x === "string" || typeof x === "number") {
    const k = phoneKey(x);
    if (k) phones.push(k);
    ids.push(String(x));
    return { phones, ids };
  }

  const isAnnonce =
    x.titre !== undefined || x.prix !== undefined || x.prixUSD !== undefined;
  const fields = isAnnonce
    ? ["ownerWhatsapp", "whatsapp", "telephone", "tel", "userId"]
    : ["ownerWhatsapp", "whatsapp", "telephone", "tel", "id"];
  for (const f of fields) {
    const v = x[f];
    if (v === undefined || v === null || v === "") continue;
    const k = phoneKey(v);
    if (k) phones.push(k);
    ids.push(String(v));
  }
  return { phones, ids };
}

/**
 * Vrai si l'utilisateur est le propriétaire de l'annonce.
 * Accepte isOwner(annonce, user), isOwner(user, annonce) ou isOwner(annonce) :
 * sans second argument, on compare avec l'utilisateur connecté.
 */
export function isOwner(a?: any, b?: any): boolean {
  try {
    const first = identities(a);
    const second = identities(b !== undefined ? b : currentUser());
    if (first.phones.some((p) => second.phones.includes(p))) return true;
    return first.ids.some((i) => second.ids.includes(i));
  } catch {
    return false;
  }
}

// ========== RÔLE SELON L'ABONNEMENT ==========

/** Met à jour le rôle affiché selon l'état de l'abonnement (caché, payé, freemium). */
export const checkDowngrade = (user: any) => {
  if (!user) return user;
  try {
    if (typeof window === "undefined") return user;
    const ab: any = verifierAbonnement();

    // 1. Compte caché : 30 jours gratuits expirés et aucun ticket actif
    if (ab.isCache) {
      return {
        ...user,
        role: "vendeur" as Role,
        type: "freemium_cache",
        abonnement:
          "Compte caché - 30 jours gratuits expirés - achetez un abonnement pour réapparaître",
        isCache: true,
        badge: "🔒",
        placesRestantes: 0,
        canPublish: false,
        message: ab.message,
      };
    }

    // 2. Abonnement actif : on garde le rôle et on met à jour les places
    if (ab.isPaye) {
      return {
        ...user,
        role: user.role || "vendeur",
        type: "paye",
        abonnement:
          (ab.ticketsActifs?.length || 1) +
          " ticket(s) actif(s) - " +
          (ab.placesRestantes || 0) +
          " places libres",
        isCache: false,
        badge: ab.badge || "⭐",
        placesRestantes: ab.placesRestantes,
        ticketsActifs: ab.ticketsActifs,
        canPublish: !!ab.peutPublier,
        maxAnnonces: 50,
        palierId: ab.palierId,
      };
    }

    // 3. Freemium visible : 3 images à vie
    if (ab.isFreemium) {
      return {
        ...user,
        role: "vendeur" as Role,
        type: "freemium",
        abonnement:
          "Gratuit " +
          (ab.count || 0) +
          "/3 - " +
          (ab.joursRestants || 0) +
          "j restants avant masquage",
        isCache: false,
        badge: "🆓",
        placesRestantes: ab.imagesRestantes || 0,
        canPublish: !!ab.peutPublier,
        maxAnnonces: 3,
        joursRestants: ab.joursRestants,
      };
    }

    // Compatibilité avec l'ancien système d'abonnement
    const expire =
      localStorage.getItem("abonnement_expire") ||
      localStorage.getItem("wenze_abonnement_expire");
    if (
      expire &&
      Date.now() > parseInt(expire, 10) &&
      ["vendeur", "prestataire", "grossiste"].includes(user.role)
    ) {
      return {
        ...user,
        role: "vendeur" as Role,
        type: "freemium",
        abonnement: "Gratuit - abonnement expiré",
        isCache: false,
        badge: "🆓",
        canPublish: true,
        maxAnnonces: 3,
      };
    }

    return user;
  } catch {
    return user;
  }
};

/** Peut-il publier ? Selon son rôle et son abonnement. */
export function canPublishByRole(user: any) {
  if (!user) return { ok: false, msg: "Non connecté" };
  const role = normaliserRole(user.role) || "vendeur";
  const roleConfig = ROLES[role] || ROLES.vendeur;

  // Le DG et le superviseur ne sont pas limités
  if (role === "dg" || role === "superviseur") {
    return {
      ok: true,
      msg: roleConfig.badge + " accès complet",
      role,
      config: roleConfig,
    };
  }

  if (typeof window === "undefined") {
    return {
      ok: !!roleConfig.canPublish,
      msg: roleConfig.badge + " peut publier - max " + roleConfig.maxAnnonces,
      role,
      config: roleConfig,
    };
  }

  try {
    const ab: any = verifierAbonnement();
    if (ab.isCache)
      return {
        ok: false,
        msg: ab.message,
        role,
        isCache: true,
        config: roleConfig,
      };
    if (!ab.peutPublier) {
      return {
        ok: false,
        msg:
          ab.message ||
          "Plus de places libres : achetez un abonnement (cumulable)",
        role,
        config: roleConfig,
        ab,
      };
    }
    return {
      ok: true,
      msg:
        roleConfig.badge +
        " " +
        role +
        " - " +
        (ab.placesRestantes || ab.imagesRestantes || 0) +
        " places libres",
      role,
      config: roleConfig,
      ab,
    };
  } catch {
    return {
      ok: !!roleConfig.canPublish,
      msg: roleConfig.badge + " peut publier - max " + roleConfig.maxAnnonces,
      role,
      config: roleConfig,
    };
  }
}

export function getMaxAnnoncesForRole(_role?: Role): number {
  return 50; // plafond de 50 annonces actives ; le freemium est limité à 3 dans lib/paiement.ts
}

export function isSamePriceForAllRoles(): boolean {
  return true;
    }
           
