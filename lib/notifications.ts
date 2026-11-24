"use client";

// lib/notifications.ts - Notifications strictement personnalisées par utilisateur WENZE WENZE

import { lireSession } from "./connexion";
import { verifierAbonnement } from "./paiement";

export type NotifType =
  | "publication_approved"
  | "abonnement_payed"
  | "boost_payed"
  | "pub_video_payed"
  | "new_boutique_annonce"
  | "new_pub_video"
  | "abonnement_rappel_5j"
  | "abonnement_rappel_1j"
  | "abonnement_expire"
  | "boost_rappel_1j"
  | "boost_expire"
  | "pub_video_rappel_5j"
  | "pub_video_rappel_1j"
  | "pub_video_expire"
  | "essai_rappel"
  | "essai_expire"
  | "freemium_welcome"
  | "freemium_rappel_5j"
  | "freemium_rappel_1j"
  | "freemium_cache"
  | "ticket_payed"
  | "ticket_rappel_5j"
  | "ticket_rappel_1j"
  | "ticket_expire"
  | "ticket_renouvele"
  | "occasionnel_payed"
  | "occasionnel_expire"
  | "place_liberee"
  | "place_consommee"
  | "max_50_atteint"
  | "compte_reactive"
  | "video_quota_full";

export interface WenzeNotif {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  annonceId?: string;
  boutiqueId?: string;
  boutiqueName?: string;
  prix?: string;
  image?: string;
  forAllClients?: boolean;
  forUserId: string; // Obligatoire : propriétaire unique de la notification
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  priority: "high" | "medium" | "low";
  data?: any;
}

const KEY_NOTIFS = "wenze_notifications";
const KEY_LAST_CHECK = "wenze_notif_last_check";

function cleanWa(n: any): string {
  return (n || "").toString().replace(/[^0-9]/g, "");
}

function safeSet(key: string, val: string) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, val);
  } catch {}
}

function safeParseArray<T = any>(key: string): T[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function getCurrentUserWa(): string {
  const session: any = lireSession();
  if (!session || typeof session !== "object") return "";
  return cleanWa(session.ownerWhatsapp || session.whatsapp || session.id || "");
}

function belongsToUser(n: WenzeNotif, targetWa: string): boolean {
  const uid = cleanWa(targetWa);
  if (!uid) return false;
  const owner = cleanWa(n.forUserId || n.boutiqueId || "");
  if (owner) return owner === uid;
  return Boolean(n.forAllClients);
}

/** Liste brute interne (usage helpers internes) */
export function getAllNotificationsRaw(): WenzeNotif[] {
  return safeParseArray<WenzeNotif>(KEY_NOTIFS);
}

/** Retourne UNIQUEMENT les notifications de l'utilisateur indiqué (ou connecté). */
export function getNotifications(userId?: string): WenzeNotif[] {
  const uid = cleanWa(userId || getCurrentUserWa());
  if (!uid) return [];
  return getAllNotificationsRaw().filter((n) => belongsToUser(n, uid));
}

export function addNotification(
  notif: Partial<WenzeNotif> & {
    title: string;
    message: string;
    type: NotifType;
    forUserId?: string;
  }
) {
  try {
    if (typeof window === "undefined") return null;
    const ownerWa = cleanWa(notif.forUserId || notif.boutiqueId || getCurrentUserWa());
    if (!ownerWa) return null; // Jamais de notification orpheline sans propriétaire

    const all = getAllNotificationsRaw();
    const full: WenzeNotif = {
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      annonceId: notif.annonceId,
      boutiqueId: cleanWa(notif.boutiqueId) || ownerWa,
      boutiqueName: notif.boutiqueName,
      prix: notif.prix,
      image: notif.image,
      forAllClients: notif.forAllClients ?? false,
      forUserId: ownerWa,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: notif.actionUrl || "/abonnement",
      priority: notif.priority || "medium",
      data: notif.data || {},
    };
    all.unshift(full);
    safeSet(KEY_NOTIFS, JSON.stringify(all.slice(0, 200)));
    safeSet(KEY_LAST_CHECK, new Date().toISOString());
    window.dispatchEvent(new Event("wenze-notif"));
    return full;
  } catch {
    return null;
  }
}

export function getUnreadCount(userId?: string): number {
  const uid = cleanWa(userId || getCurrentUserWa());
  if (!uid) return 0;
  return getNotifications(uid).filter((n) => !n.read).length;
}

export function markAsRead(id: string, userId?: string) {
  const uid = cleanWa(userId || getCurrentUserWa());
  if (!uid) return;
  const all = getAllNotificationsRaw();
  const idx = all.findIndex((n) => n.id === id && belongsToUser(n, uid));
  if (idx >= 0) {
    all[idx].read = true;
    safeSet(KEY_NOTIFS, JSON.stringify(all));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("wenze-notif"));
  }
}

export function markAllAsRead(userId?: string) {
  const uid = cleanWa(userId || getCurrentUserWa());
  if (!uid) return;
  const all = getAllNotificationsRaw();
  let changed = false;
  for (const n of all) {
    if (!n.read && belongsToUser(n, uid)) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) {
    safeSet(KEY_NOTIFS, JSON.stringify(all));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("wenze-notif"));
  }
}

export function checkAndNotifyExpirations() {
  try {
    if (typeof window === "undefined") return;
    const session: any = lireSession();
    const wa = getCurrentUserWa();
    if (!session || !wa) return;

    const now = Date.now();
    const tickets = safeParseArray<any>("wenze_tickets").filter((t: any) => {
      const owner = cleanWa(t.ownerWhatsapp || t.whatsapp || t.userId || wa);
      return !t.ownerWhatsapp && !t.whatsapp && !t.userId ? true : owner === wa;
    });
    const occs = safeParseArray<any>("wenze_occasionnel").filter((t: any) => {
      const owner = cleanWa(t.ownerWhatsapp || t.whatsapp || t.userId || wa);
      return !t.ownerWhatsapp && !t.whatsapp && !t.userId ? true : owner === wa;
    });
    const annonces = safeParseArray<any>("wenze_annonces_list");
    const myNotifs = getNotifications(wa);
    const ab: any = verifierAbonnement();

    const hasRecent = (dedupKey: string) =>
      myNotifs.some(
        (n) =>
          n.data?.dedupKey === dedupKey &&
          now - new Date(n.createdAt).getTime() < 2 * 24 * 3600 * 1000
      );

    for (const t of [...tickets, ...occs]) {
      const expire = new Date(t.expireAt || t.expire || 0).getTime();
      if (!expire) continue;
      const diffDays = Math.ceil((expire - now) / 86400000);
      const label = `${t.palierId || "OCC"} ${t.dureeId || ""}`.trim();
      const used = t.imagesUsed || 0;
      const max = t.imagesMax || 1;
      const ticketKey = t.ticketId || `${label}_${expire}`;

      if (diffDays === 5 && !hasRecent(`ticket_rappel_5j_${ticketKey}_j5`)) {
        addNotification({
          type: "ticket_rappel_5j",
          title: `Rappel J-5 : ticket ${label} expire dans 5j`,
          message: `Ticket ${label} (${used}/${max} places sur ${t.jours || 7}j) — expire le ${new Date(expire).toLocaleDateString("fr-FR")}. Renouvelable et cumulable (0 % commission).`,
          forUserId: wa,
          boutiqueId: wa,
          priority: "medium",
          actionUrl: "/abonnement",
          data: { ticketId: ticketKey, dedupKey: `ticket_rappel_5j_${ticketKey}_j5` },
        });
      }

      if (diffDays === 1 && !hasRecent(`ticket_rappel_1j_${ticketKey}_j1`)) {
        addNotification({
          type: "ticket_rappel_1j",
          title: `J-1 : ticket ${label} expire demain`,
          message: `Ticket ${label} (${used}/${max} places) expire demain. Sans ticket actif, le compte est masqué (is_visible = false).`,
          forUserId: wa,
          boutiqueId: wa,
          priority: "high",
          actionUrl: "/abonnement",
          data: { ticketId: ticketKey, dedupKey: `ticket_rappel_1j_${ticketKey}_j1` },
        });
      }

      if (diffDays <= 0 && diffDays > -3 && !hasRecent(`ticket_expire_${ticketKey}_exp`)) {
        const isCacheNow = Boolean(ab?.isCache);
        addNotification({
          type: "ticket_expire",
          title: isCacheNow
            ? `Ticket ${label} expiré — compte masqué`
            : `Ticket ${label} expiré`,
          message: isCacheNow
            ? `Ticket ${label} expiré : aucun ticket actif, compte masqué (is_visible = false). Renouvelez votre abonnement pour réapparaître.`
            : `Ticket ${label} expiré le ${new Date(expire).toLocaleDateString("fr-FR")} (${used}/${max} places). Supprimer une annonce libère une place.`,
          forUserId: wa,
          boutiqueId: wa,
          priority: "high",
          actionUrl: "/abonnement",
          data: { ticketId: ticketKey, dedupKey: `ticket_expire_${ticketKey}_exp`, isCacheNow },
        });
      }
    }

    if (ab?.isFreemium && !ab?.isPaye) {
      const userCreated = new Date(session.createdAt || Date.now()).getTime();
      const daysSince = Math.floor((now - userCreated) / 86400000);
      const daysLeft = 30 - daysSince;

      if (daysLeft === 5 && !hasRecent("freemium_rappel_5j_j5")) {
        addNotification({
          type: "freemium_rappel_5j",
          title: "Freemium : plus que 5 jours avant masquage",
          message: `Offre freemium (${ab.count || 0}/3 images max) : dans 5 jours, le compte passe en masqué (is_visible = false) sans abonnement actif.`,
          forUserId: wa,
          boutiqueId: wa,
          priority: "medium",
          actionUrl: "/abonnement",
          data: { dedupKey: "freemium_rappel_5j_j5" },
        });
      }

      if (daysLeft === 1 && !hasRecent("freemium_rappel_1j_j1")) {
        addNotification({
          type: "freemium_rappel_1j",
          title: "Freemium J-1 : masquage demain",
          message: `Dernier jour avant masquage (is_visible = false) si aucun abonnement n'est activé (${ab.count || 0}/3 images max).`,
          forUserId: wa,
          boutiqueId: wa,
          priority: "high",
          actionUrl: "/abonnement",
          data: { dedupKey: "freemium_rappel_1j_j1" },
        });
      }

      if (ab.isCache && !hasRecent("freemium_cache_exp")) {
        addNotification({
          type: "freemium_cache",
          title: "Compte masqué — période freemium expirée",
          message: `Période freemium de 30 jours expirée : compte masqué (is_visible = false). Activez un abonnement pour redevenir visible.`,
          forUserId: wa,
          boutiqueId: wa,
          priority: "high",
          actionUrl: "/abonnement",
          data: { dedupKey: "freemium_cache_exp" },
        });
      }
    }

    const myCount = annonces.filter(
      (a: any) =>
        cleanWa(a.ownerWhatsapp || a.whatsapp || a.userId) === wa &&
        a.is_visible !== false
    ).length;

    if (myCount >= 45 && !hasRecent(`max_50_${wa}`)) {
      const isMax = myCount >= 50;
      addNotification({
        type: "max_50_atteint",
        title: isMax
          ? "Plafond de 50 annonces actives atteint"
          : `Bientôt le plafond de 50 actives (${myCount}/50)`,
        message: isMax
          ? `Vous avez ${myCount}/50 annonces actives. Supprimez ou archivez une annonce pour libérer une place.`
          : `Vous avez ${myCount}/50 annonces actives (${50 - myCount} places restantes avant le plafond).`,
        forUserId: wa,
        boutiqueId: wa,
        priority: isMax ? "high" : "medium",
        actionUrl: `/boutiques/${wa}`,
        data: { count: myCount, dedupKey: `max_50_${wa}` },
      });
    }
  } catch (e) {
    console.error("checkAndNotifyExpirations error", e);
  }
}

export function notifyPlaceLiberee(annonceId: string, ticketId: string, ownerWa?: string) {
  const uid = cleanWa(ownerWa || getCurrentUserWa());
  if (!uid) return;
  addNotification({
    type: "place_liberee",
    title: "Place libérée sur le ticket",
    message: `L'annonce ${annonceId.slice(0, 8)} a été retirée : 1 place est de nouveau disponible sur le ticket ${ticketId.slice(0, 8)} (max 50 actives).`,
    annonceId,
    forUserId: uid,
    boutiqueId: uid,
    priority: "low",
    actionUrl: "/publier",
    data: { annonceId, ticketId },
  });
}

export function notifyPlaceConsommee(
  annonceId: string,
  ticketId: string,
  used: number,
  max: number,
  ownerWa?: string
) {
  const uid = cleanWa(ownerWa || getCurrentUserWa());
  if (!uid) return;
  addNotification({
    type: "place_consommee",
    title: `Place ${used}/${max} utilisée`,
    message: `Annonce ${annonceId.slice(0, 8)} publiée sur le ticket ${ticketId.slice(0, 8)} (${Math.max(0, max - used)} place(s) restante(s) sur ce ticket).`,
    annonceId,
    forUserId: uid,
    boutiqueId: uid,
    priority: "low",
    actionUrl: `/produit/${annonceId}`,
    data: { annonceId, ticketId, used, max },
  });
}

export function notifyTicketPayed(ticket: any, ownerWa?: string) {
  const uid = cleanWa(ownerWa || ticket?.ownerWhatsapp || getCurrentUserWa());
  if (!uid) return;
  addNotification({
    type: "ticket_payed",
    title: `Ticket ${ticket?.palierId || ""} ${ticket?.dureeId || ""} activé`,
    message: `Ticket activé (${ticket?.imagesMax || 0} places sur ${ticket?.jours || 0}j, 0 % commission). Le compte est visible et les tickets sont cumulables.`,
    forUserId: uid,
    boutiqueId: uid,
    priority: "high",
    actionUrl: `/boutiques/${uid}`,
    data: { ticketId: ticket?.ticketId, palierId: ticket?.palierId },
  });
  setTimeout(() => notifyCompteReactive(uid), 800);
}

export function notifyCompteReactive(ownerWa?: string) {
  const uid = cleanWa(ownerWa || getCurrentUserWa());
  if (!uid) return;
  addNotification({
    type: "compte_reactive",
    title: "Compte visible sur la marketplace",
    message:
      "Votre compte et vos annonces éligibles sont de nouveau visibles sur l'accueil et les boutiques (0 % commission).",
    forUserId: uid,
    boutiqueId: uid,
    priority: "high",
    actionUrl: "/",
    data: { dedupKey: `reactive_${uid}_${Date.now()}` },
  });
}

export function notifyVideoQuotaFull(used: number, max: number, ownerWa?: string) {
  const uid = cleanWa(ownerWa || getCurrentUserWa());
  if (!uid) return;
  addNotification({
    type: "video_quota_full",
    title: `Quota vidéo atteint (${used}/${max})`,
    message: `Vous avez atteint le quota vidéo (${used}/${max}) de votre ticket actif. Un ticket supplémentaire ou renouvelé est nécessaire pour publier d'autres vidéos.`,
    forUserId: uid,
    boutiqueId: uid,
    priority: "medium",
    actionUrl: "/abonnement",
    data: { used, max },
  });
}

export function checkMax50AndNotify(): number {
  try {
    if (typeof window === "undefined") return 0;
    const list = safeParseArray<any>("wenze_annonces_list");
    const wa = getCurrentUserWa();
    if (!wa) return 0;
    const myCount = list.filter(
      (a: any) =>
        cleanWa(a.ownerWhatsapp || a.whatsapp || a.userId) === wa &&
        a.is_visible !== false
    ).length;

    if (myCount >= 45) {
      const myNotifs = getNotifications(wa);
      const already = myNotifs.some(
        (n) =>
          n.type === "max_50_atteint" &&
          Date.now() - new Date(n.createdAt).getTime() < 12 * 3600 * 1000
      );
      if (!already) {
        addNotification({
          type: "max_50_atteint",
          title:
            myCount >= 50
              ? "Plafond de 50 annonces actives atteint"
              : `Bientôt le plafond de 50 actives (${myCount}/50)`,
          message:
            myCount >= 50
              ? "Plafond de 50 annonces actives atteint : supprimez ou archivez une annonce pour libérer une place."
              : `Vous avez ${myCount}/50 annonces actives (${50 - myCount} places restantes).`,
          forUserId: wa,
          boutiqueId: wa,
          priority: myCount >= 50 ? "high" : "medium",
          actionUrl: `/boutiques/${wa}`,
          data: { count: myCount, dedupKey: `max_50_${wa}` },
        });
      }
    }
    return myCount;
  } catch {
    return 0;
  }
}

export const notifyAbonnementPayed = (ticket: any, ownerWa?: string) =>
  notifyTicketPayed(ticket, ownerWa);
export const notifyBoostPayed = (ticket: any, ownerWa?: string) =>
  notifyTicketPayed(ticket, ownerWa);
export const notifyPubVideoPayed = (ticket: any, ownerWa?: string) =>
  notifyTicketPayed(ticket, ownerWa);
                                                 
