"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { lireSession, cle9 } from "@/lib/connexion";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  checkAndNotifyExpirations,
} from "@/lib/notifications";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
  verifierAbonnement,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

const supabase: any =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : null;

function formatNotifDate(d?: string) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  if (isNaN(diff) || diff < 60000) return "À l'instant";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 259200000) return `${Math.floor(diff / 86400000)}j`;
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function notifConfig(type: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("annonce_dg")) {
    return {
      icon: "📢",
      color: "bg-blue-100 border-blue-200 text-blue-700",
      label: "Annonce DG",
    };
  }
  if (t.includes("tombola")) {
    return {
      icon: "🎟️",
      color: "bg-amber-100 border-amber-300 text-amber-800",
      label: "Tombola",
    };
  }
  if (
    t.includes("paiement") ||
    t.includes("paye") ||
    t.includes("payé")
  ) {
    return {
      icon: "💰",
      color: "bg-emerald-100 border-emerald-200 text-emerald-700",
      label: "Paiement",
    };
  }
  if (t.includes("moderation") || t.includes("suspend")) {
    return {
      icon: "🛡️",
      color: "bg-red-50 border-red-200 text-red-700",
      label: "Modération",
    };
  }
  if (t.includes("probleme") || t.includes("problème")) {
    return {
      icon: "🚨",
      color: "bg-red-100 border-red-200 text-red-700",
      label: "Problème",
    };
  }
  if (t.includes("boutique") || t.includes("annonce")) {
    return {
      icon: "🏪",
      color: "bg-purple-100 border-purple-200 text-purple-700",
      label: "Boutique",
    };
  }
  if (
    t.includes("rappel") ||
    t.includes("expire") ||
    t.includes("expir") ||
    t.includes("cache")
  ) {
    return {
      icon: "⏰",
      color: "bg-orange-100 border-orange-200 text-orange-700",
      label: "Rappel",
    };
  }
  if (
    t.includes("boost") ||
    t.includes("palier") ||
    t.includes("premium") ||
    t.includes("pro") ||
    t.includes("standard")
  ) {
    return {
      icon: "🚀",
      color: "bg-black text-white border-black",
      label: "Abonnement",
    };
  }
  if (t.includes("pub") || t.includes("video") || t.includes("promo")) {
    return {
      icon: "📢",
      color: "bg-blue-100 border-blue-200 text-blue-700",
      label: "Pub",
    };
  }
  if (t.includes("perso") || t.includes("compte")) {
    return {
      icon: "👤",
      color: "bg-red-50 border-red-200 text-red-700",
      label: "Compte",
    };
  }
  return {
    icon: "🔔",
    color: "bg-gray-100 border-gray-200 text-gray-700",
    label: "Info",
  };
}

function lireConfigPublique(): Record<string, any> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("wenze_config_publique");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function tracerNotifJournal(
  action: "NOTIF_LUE" | "NOTIFS_TOUT_LU",
  acteurWa: string,
  detail?: string
) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("wenze_journal");
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      acteurWhatsapp: acteurWa,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [filter, setFilter] = useState<
    | "all"
    | "dg"
    | "tombola"
    | "paiement"
    | "boutique"
    | "rappels"
    | "boost"
    | "pub-video"
    | "perso"
  >("all");
  const [abInfo, setAbInfo] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [moi, setMoi] = useState<any>(null);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;
      setCfgPublique(lireConfigPublique());

      const session: any = lireSession();
      const rawUser = localStorage.getItem("wenze_user");
      const user =
        session ||
        (() => {
          try {
            return rawUser ? JSON.parse(rawUser) : {};
          } catch {
            return {};
          }
        })();

      setMoi(user);
      const monWa = cle9(
        user?.ownerWhatsapp || user?.whatsapp || user?.telephone || ""
      );
      const uid = monWa || user?.id || "guest";
      if (uid === "guest") {
        setNotifs([]);
        return;
      }

      const locales = (getNotifications(uid) || []).map((n: any) => ({
        ...n,
        source: "LOCAL",
        read: Boolean(n.read),
        date: n.date || n.createdAt,
        titre: n.titre || n.title,
        message: n.message || n.text || n.description,
        type: n.type || n.categorie || "Info",
        link: n.link || n.url,
      }));

      let distantes: any[] = [];
      if (supabase) {
        const roleBrut = String(
          user?.type_public || user?.type || user?.role || "CLIENT"
        )
          .toUpperCase()
          .trim();
        const isRoleNonInvite =
          roleBrut === "AMBASSADEUR" || roleBrut === "SUPERVISEUR";
        const monType = isRoleNonInvite ? "CLIENT" : roleBrut;
        const monId = user?.id;
        const monCode = user?.code_pro || user?.code_invitation || user?.id;

        const { data } = await supabase
          .from("notifications_perso")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        distantes = (data || [])
          .filter((n: any) => {
            if (monId && n.user_id === monId) return true;
            if (
              monWa &&
              n.user_id &&
              cle9(n.user_id) === monWa
            ) {
              return true;
            }
            if (n.type_compte === monType) return true;
            if (n.type_compte === "TOUS") return true;
            if (
              !isRoleNonInvite &&
              monCode &&
              n.code_invitation &&
              n.code_invitation === monCode
            ) {
              return true;
            }
            return false;
          })
          .map((n: any) => ({
            id: n.id,
            source: "DG",
            read: Boolean(n.lu),
            date: n.created_at,
            titre: n.titre,
            message: n.message,
            type: n.type,
            link: n.lien,
            type_compte: n.type_compte,
            pour_moi_seul: Boolean(monId && n.user_id === monId),
          }));
      }

      const fusion = [...distantes, ...locales];
      const sorted = fusion.sort((a: any, b: any) => {
        const aUnread = !a.read ? 1 : 0;
        const bUnread = !b.read ? 1 : 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });
      setNotifs(sorted);

      try {
        const ab = verifierAbonnement();
        setAbInfo(ab);
      } catch {}
    } catch {
      setNotifs([]);
    }
  }, []);

  useEffect(() => {
    try {
      checkAndNotifyExpirations();
    } catch {}
    load();
    if (!supabase) return;

    const ch = supabase
      .channel("notifs-perso")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications_perso" },
        () => {
          load();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications_perso" },
        () => {
          load();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      try {
        checkAndNotifyExpirations();
      } catch {}
      load();
    }, 30000);

    const onStorage = (e: StorageEvent) => {
      if (
        e.key?.includes("wenze_notif") ||
        e.key?.includes("wenze_user") ||
        e.key?.includes("wenze_config_publique")
      ) {
        load();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("wenze-update", load);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wenze-update", load);
    };
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return notifs;
    return notifs.filter((n: any) => {
      const t = (n.type || n.categorie || "").toLowerCase();
      if (filter === "dg") return t.includes("annonce_dg");
      if (filter === "tombola") return t.includes("tombola");
      if (filter === "paiement") {
        return (
          t.includes("paiement") || t.includes("paye") || t.includes("payé")
        );
      }
      if (filter === "boutique") {
        return t.includes("boutique") || t.includes("annonce");
      }
      if (filter === "rappels") {
        return (
          t.includes("rappel") ||
          t.includes("expire") ||
          t.includes("expir") ||
          t.includes("cache")
        );
      }
      if (filter === "boost") {
        return (
          t.includes("boost") ||
          t.includes("palier") ||
          t.includes("premium") ||
          t.includes("pro") ||
          t.includes("standard")
        );
      }
      if (filter === "pub-video") {
        return t.includes("pub") || t.includes("video") || t.includes("promo");
      }
      if (filter === "perso") return t.includes("perso") || t.includes("compte");
      return true;
    });
  }, [notifs, filter]);

  const stats = {
    all: notifs.length,
    unread: notifs.filter((n: any) => !n.read).length,
    dg: notifs.filter((n: any) =>
      (n.type || "").toLowerCase().includes("annonce_dg")
    ).length,
    tombola: notifs.filter((n: any) =>
      (n.type || "").toLowerCase().includes("tombola")
    ).length,
    paiement: notifs.filter((n: any) =>
      (n.type || "").toLowerCase().includes("paiement")
    ).length,
    boutique: notifs.filter((n: any) =>
      (n.type || "").toLowerCase().includes("boutique")
    ).length,
    rappels: notifs.filter((n: any) => {
      const t = (n.type || "").toLowerCase();
      return t.includes("rappel") || t.includes("expire") || t.includes("cache");
    }).length,
  };

  const grouped = useMemo(() => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const older: any[] = [];
    const now = new Date();
    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const startYesterday = startToday - 86400000;

    for (const n of filtered) {
      const ts = new Date(
        (n as any).date || (n as any).createdAt || Date.now()
      ).getTime();
      if (ts >= startToday) today.push(n);
      else if (ts >= startYesterday) yesterday.push(n);
      else older.push(n);
    }
    return { today, yesterday, older };
  }, [filtered]);

  const handleOpen = async (n: any) => {
    try {
      if (n.source === "DG" && supabase) {
        await supabase
          .from("notifications_perso")
          .update({ lu: true })
          .eq("id", n.id);
      } else {
        markAsRead(n.id);
      }
      tracerNotifJournal(
        "NOTIF_LUE",
        cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
        String(n.id || "")
      );
    } catch {}
    setNotifs((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
    );
    setSelected(n);
  };

  const handleToutLire = async () => {
    try {
      if (supabase) {
        const idsDG = notifs
          .filter((n) => n.source === "DG" && !n.read)
          .map((n) => n.id);
        for (const id of idsDG) {
          await supabase
            .from("notifications_perso")
            .update({ lu: true })
            .eq("id", id);
        }
      }
      const wa = cle9(moi?.ownerWhatsapp || moi?.whatsapp || "");
      markAllAsRead(wa || moi?.id || "guest");
      tracerNotifJournal(
        "NOTIFS_TOUT_LU",
        wa,
        `${stats.unread} notif(s)`
      );
      load();
    } catch {}
  };

  const handleGoLink = () => {
    if (!selected) return;
    const link = (selected as any).link || (selected as any).url;
    setSelected(null);
    if (link) router.push(link);
  };

  const placesMax = Math.min(
    PLAFOND_ACTIVES,
    Number(abInfo?.maxPlaces || PLAFOND_ACTIVES)
  );
  const placesRestantes = Math.min(
    placesMax,
    Number(abInfo?.placesRestantes || 0)
  );

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center font-black"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[15px] flex items-center gap-2 truncate">
              {cfgPublique?.titreNotifications || "Mes Notifications"}
              {stats.unread > 0 ? (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {stats.unread} non lues
                </span>
              ) : null}
            </h1>
            <p className="text-[10px] text-gray-500 truncate">
              {moi?.nom || moi?.proprietaire || "Compte Wenze Wenze"} • 0 %
              commission • Taux {TAUX_CDF} CDF/$
            </p>
          </div>
          <button
            type="button"
            onClick={handleToutLire}
            className="text-[11px] bg-black text-white px-3 py-1.5 rounded-full font-bold shrink-0"
          >
            ✓ Tout lire
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {[
            { id: "all", label: `Tous • ${stats.all}` },
            { id: "dg", label: `📢 DG • ${stats.dg}` },
            { id: "tombola", label: `🎟️ Tombola • ${stats.tombola}` },
            { id: "paiement", label: `💰 Paiement • ${stats.paiement}` },
            { id: "boutique", label: `🏪 Boutique • ${stats.boutique}` },
            { id: "rappels", label: `⏰ Rappels • ${stats.rappels}` },
            { id: "boost", label: "🚀 Abonnement" },
            { id: "pub-video", label: "📢 Pub" },
            { id: "perso", label: "👤 Compte" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id as any)}
              className={`whitespace-nowrap py-2 px-4 rounded-full font-black text-[11px] border-2 ${
                filter === c.id
                  ? "bg-black text-white border-black"
                  : "bg-white border-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px] flex justify-between items-center gap-2">
          <span>
            <b>0 % commission</b> • Freemium : <b>{MAX_FREE_IMAGES} images max / {FREE_DAYS} jours</b> puis <b>is_visible = false</b> • Max <b>{PLAFOND_ACTIVES}</b> actives
          </span>
          <span className="bg-white text-black px-2 py-0.5 rounded-full font-black shrink-0">
            {usd(1)} = {toCDFString(1)}
          </span>
        </div>

        {abInfo ? (
          <div className="mt-2.5 bg-white border rounded-xl p-2 flex gap-2 text-[10px] flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-full font-bold ${
                abInfo.isPaye
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {abInfo.palierId || "FREEMIUM"}
            </span>
            <span className="bg-gray-100 px-2 py-0.5 rounded-full">
              {placesRestantes} / {placesMax} places max
            </span>
            <span className="bg-gray-100 px-2 py-0.5 rounded-full">
              {abInfo.joursRestants || 0}j restants
            </span>
            {abInfo.isCache ? (
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                is_visible = false
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      <div>
        {filtered.length === 0 ? (
          <div className="mt-6 mx-3 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">🔔</p>
            <p className="font-black mt-2 text-[13px]">
              Aucune notification pour le moment
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Vos alertes de boutique, rappels ({FREE_DAYS}j freemium) et
              tombola à Kinshasa apparaîtront ici.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : (
          <div className="bg-white divide-y divide-gray-100">
            {[
              { label: "Aujourd'hui", list: grouped.today },
              { label: "Hier", list: grouped.yesterday },
              { label: "Plus ancien", list: grouped.older },
            ].map((g) =>
              g.list.length > 0 ? (
                <div key={g.label}>
                  <div className="bg-gray-50 px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    {g.label} • {g.list.length}
                  </div>
                  {g.list.map((n: any) => {
                    const cfg = notifConfig(n.type || n.categorie || "");
                    const isUnread = !n.read;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleOpen(n)}
                        className={`w-full text-left flex gap-3 p-4 hover:bg-gray-50 transition ${
                          isUnread
                            ? "bg-orange-50/60 border-l-4 border-l-orange-500"
                            : ""
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-[16px] shrink-0 border ${cfg.color}`}
                        >
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2">
                            <p
                              className={`text-[13px] truncate ${
                                isUnread ? "font-black" : "font-bold"
                              }`}
                            >
                              {n.titre || n.title || cfg.label}
                            </p>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {formatNotifDate(n.date || n.createdAt)}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] mt-0.5 line-clamp-2 ${
                              isUnread ? "text-black" : "text-gray-600"
                            }`}
                          >
                            {n.message || n.text || n.description || ""}
                          </p>
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded-full">
                              {cfg.label}
                            </span>
                            {n.source === "DG" ? (
                              <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black">
                                📢 DG
                              </span>
                            ) : null}
                            {n.link ? (
                              <span className="text-[9px] bg-black text-white px-2 py-0.5 rounded-full">
                                Voir →
                              </span>
                            ) : null}
                            {isUnread ? (
                              <span className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded-full">
                                Nouveau
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelected(null)}
          />
          <div className="relative bg-white w-full max-w-[430px] rounded-t-[24px] sm:rounded-[24px] p-5 max-h-[85vh] overflow-auto">
            <div className="flex justify-between items-start gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                  notifConfig((selected as any).type || "").color
                }`}
              >
                {notifConfig((selected as any).type || "").icon}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-8 h-8 bg-gray-100 rounded-full font-black"
              >
                ×
              </button>
            </div>
            <h2 className="font-black text-[15px] mt-4">
              {(selected as any).titre ||
                (selected as any).title ||
                "Notification"}
            </h2>
            <p className="text-[11px] text-gray-400 mt-1">
              WENZE WENZE •{" "}
              {formatNotifDate(
                (selected as any).date || (selected as any).createdAt
              )}{" "}
              • Taux {TAUX_CDF} CDF/$
            </p>
            <div className="mt-4 bg-[#FFFBF0] border rounded-2xl p-4">
              <p className="text-[13px] leading-[19px] whitespace-pre-wrap">
                {(selected as any).message ||
                  (selected as any).text ||
                  (selected as any).description ||
                  ""}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 bg-gray-100 font-black py-3 rounded-full text-[13px]"
              >
                Fermer
              </button>
              {(selected as any).link ? (
                <button
                  type="button"
                  onClick={handleGoLink}
                  className="flex-1 bg-black text-white font-black py-3 rounded-full text-[13px]"
                >
                  Ouvrir →
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link
          href="/"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">🏠</span>Accueil
        </Link>
        <Link
          href="/market"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">🏪</span>Marché
        </Link>
        <Link
          href="/publier"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">
            +
          </span>
          Publier
        </Link>
        <Link
          href="/boutiques"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">🏬</span>Boutiques
        </Link>
        <Link
          href="/portefeuille"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">💼</span>Portefeuille
        </Link>
        <Link
          href="/profil"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">👤</span>Profil
        </Link>
      </nav>
    </div>
  );
}
