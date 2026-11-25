"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { lireSession, cle9 } from "@/lib/connexion";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
  isCompteCache,
  checkFreemiumWenze,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

type Message = {
  id: string;
  order_id?: string;
  boutique_id?: string;
  vendor_name: string;
  vendor_phone: string;
  ownerWhatsapp?: string;
  whatsapp?: string;
  user?: string;
  nomBoutique?: string;
  last_text: string;
  last_date?: string;
  created_at?: string;
  categorie_id?: string;
  categorieId?: string;
  titre?: string;
  title?: string;
  name?: string;
  photo?: string;
  images?: string[];
  unread?: number;
  total?: number;
  totalUSD?: number;
  prixGrosUSD?: number;
  prixGros?: number;
  typeAnnonce?: string;
  _isPaye?: boolean;
  _palierId?: string;
  _jours?: number;
  _vendeurCache?: boolean;
};

function formatDate(d?: string) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}j`;
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
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

function tracerMessageJournal(
  action: "MESSAGE_CONTACT_WA",
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

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<
    "all" | "commerces-services" | "gros-autres"
  >("all");
  const [moi, setMoi] = useState<any>(null);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  const monRole = String(moi?.role || "client").toLowerCase();
  const jeSuisDG =
    moi?.roleAdmin === "dg" ||
    monRole === "dg" ||
    Boolean(moi?.dgSessionActive);
  const jePeuxVoirGros = monRole === "grossiste" || jeSuisDG;

  const getMontantMessageUSD = useCallback(
    (m: Message): number => {
      if (m.typeAnnonce === "gros" && jePeuxVoirGros) {
        const pg = Number(m.prixGrosUSD ?? m.prixGros ?? 0);
        if (pg > 0) return pg;
      }
      return Number(m.totalUSD ?? m.total ?? 0);
    },
    [jePeuxVoirGros]
  );

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      setCfgPublique(lireConfigPublique());

      const session: any = lireSession();
      const rawUser = localStorage.getItem("wenze_user");
      const currentUser =
        session ||
        (() => {
          try {
            return rawUser ? JSON.parse(rawUser) : null;
          } catch {
            return null;
          }
        })();
      setMoi(currentUser);

      const raw =
        localStorage.getItem("wenze_messages_list") ||
        localStorage.getItem("wenze_commandes_list") ||
        "[]";
      const parsedList = JSON.parse(raw);
      const list = Array.isArray(parsedList) ? parsedList : [];

      const allUsersRaw = localStorage.getItem("wenze_all_users") || "[]";
      const allUsersParsed = JSON.parse(allUsersRaw);
      const allUsers = Array.isArray(allUsersParsed) ? allUsersParsed : [];
      const userMap = new Map<string, any>();
      for (const u of allUsers) {
        const wa = cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "");
        if (wa) userMap.set(wa, u);
      }

      const enriched: Message[] = list
        .map((m: any) => {
          const imgs: string[] = Array.isArray(m?.images)
            ? m.images
            : m?.photo
            ? [m.photo]
            : [];
          return {
            id: String(m?.id || m?.order_id || ""),
            order_id: m?.order_id || m?.id,
            boutique_id: m?.boutique_id || m?.vendor_phone,
            vendor_name:
              m?.vendor_name || m?.user || m?.nomBoutique || "Boutique",
            vendor_phone:
              m?.vendor_phone || m?.ownerWhatsapp || m?.whatsapp || "",
            ownerWhatsapp: m?.ownerWhatsapp || m?.vendor_phone,
            whatsapp: m?.whatsapp,
            user: m?.user,
            nomBoutique: m?.nomBoutique,
            last_text:
              m?.last_text ||
              m?.titre ||
              m?.title ||
              "Bonjour, je suis intéressé par votre annonce.",
            last_date: m?.last_date || m?.created_at || m?.createdAt,
            created_at: m?.created_at || m?.last_date,
            categorie_id: m?.categorie_id || m?.categorieId,
            categorieId: m?.categorieId || m?.categorie_id,
            titre: m?.titre || m?.title || m?.name,
            title: m?.title,
            name: m?.name,
            photo: imgs[0] || m?.photo,
            images: imgs,
            unread: Number(m?.unread || 0),
            total: Number(m?.total ?? m?.totalUSD ?? 0),
            totalUSD: Number(m?.totalUSD ?? m?.total ?? 0),
            prixGrosUSD: Number(m?.prixGrosUSD ?? m?.prixGros ?? 0),
            prixGros: Number(m?.prixGros ?? m?.prixGrosUSD ?? 0),
            typeAnnonce: m?.typeAnnonce,
          };
        })
        .map((m: Message) => {
          const wa = cle9(
            m.ownerWhatsapp || m.vendor_phone || m.whatsapp || ""
          );
          const user = userMap.get(wa) || {
            ownerWhatsapp: wa,
            createdAt: m.created_at || m.last_date,
            id: wa,
          };

          let vendeurCache = false;
          let isPaye = false;
          let palierId = "FREEMIUM";
          let jours = 0;

          try {
            vendeurCache = Boolean(isCompteCache && isCompteCache(user));
            const ab = checkFreemiumWenze && checkFreemiumWenze(user, 0);
            isPaye = Boolean(ab?.isPaye);
            palierId = ab?.palierId || (isPaye ? "ACTIF" : "FREEMIUM");
            jours = ab?.joursRestants || 0;
          } catch {}

          const safeImgs = isPaye
            ? m.images || []
            : (m.images || []).slice(0, MAX_FREE_IMAGES);

          return {
            ...m,
            photo: safeImgs[0] || m.photo,
            images: safeImgs,
            _vendeurCache: vendeurCache,
            _isPaye: isPaye,
            _palierId: palierId,
            _jours: jours,
          };
        })
        .sort(
          (a: any, b: any) =>
            new Date(b.last_date || b.created_at || 0).getTime() -
            new Date(a.last_date || a.created_at || 0).getTime()
        )
        .slice(0, PLAFOND_ACTIVES);

      setMessages(enriched);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    let list = messages;
    if (filterCat !== "all") {
      list = list.filter((m) => {
        const cat = normalizeCategorie(
          m.categorie_id || m.categorieId || "commerces-services"
        );
        const obj: any = getCategorieById(cat);
        if (filterCat === "commerces-services") {
          return obj?.groupe === "commerces-services" || !cat.includes("gros");
        }
        if (filterCat === "gros-autres") {
          return obj?.groupe === "gros-autres" || cat.includes("gros");
        }
        return true;
      });
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    const qWa = cle9(q);
    return list.filter(
      (m) =>
        (m.vendor_name || m.nomBoutique || m.user || "")
          .toLowerCase()
          .includes(q) ||
        (m.last_text || "").toLowerCase().includes(q) ||
        (m.titre || m.title || m.name || "").toLowerCase().includes(q) ||
        (qWa &&
          cle9(m.vendor_phone || m.ownerWhatsapp || "").includes(qWa))
    );
  }, [messages, search, filterCat]);

  const totalUnread = messages.reduce((s, m) => s + (m.unread || 0), 0);

  if (loading) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-24 bg-white border rounded-2xl animate-pulse" />
        <p className="text-[11px] text-gray-400 mt-3">
          Chargement des messages • 0 % commission • Taux {TAUX_CDF} CDF/$
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center font-black shrink-0"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[16px] flex items-center gap-2 truncate">
              <span>{cfgPublique?.titreMessages || "Messages"}</span>
              {totalUnread > 0 ? (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shrink-0">
                  {totalUnread}
                </span>
              ) : null}
            </h1>
            <p className="text-[10px] text-gray-500 truncate">
              {messages.length}/{PLAFOND_ACTIVES} max • 0 % commission • Taux{" "}
              {TAUX_CDF} CDF/$
            </p>
          </div>
          <Link
            href="/market"
            className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white shrink-0"
          >
            🛒
          </Link>
        </div>

        <div className="mt-3 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher : boutique, article..."
            className="w-full bg-gray-100 rounded-2xl py-3 px-5 pl-11 text-sm outline-none focus:ring-2 focus:ring-black"
          />
          <span className="absolute left-4 top-3">🔍</span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {[
            { id: "all", label: `Tous • ${messages.length}` },
            { id: "commerces-services", label: "🛍️ Détail" },
            { id: "gros-autres", label: "🏭 Gros" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterCat(c.id as any)}
              className={`whitespace-nowrap py-2 px-4 rounded-full font-black text-[11px] border-2 ${
                filterCat === c.id
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
            <b>0 % commission</b> • Freemium :{" "}
            <b>
              {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
            </b>{" "}
            puis <b>is_visible = false</b> • Min {usd(1)} ({toCDFString(1)})
          </span>
          <span className="bg-white text-black px-2 py-0.5 rounded-full font-black shrink-0">
            {TAUX_CDF}
          </span>
        </div>
      </header>

      <div>
        {filtered.length === 0 ? (
          <div className="mt-6 mx-3 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">💬</p>
            <p className="font-black mt-2 text-[13px]">
              {search || filterCat !== "all"
                ? "Aucun message correspondant"
                : "Aucune conversation pour le moment"}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              0 % commission • Taux {TAUX_CDF} CDF/$ • Échanges directs
              WhatsApp
            </p>
            <Link
              href="/market"
              className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]"
            >
              Aller au Marché
            </Link>
          </div>
        ) : (
          <div className="bg-white divide-y divide-gray-100">
            {filtered.map((m) => {
              const catId = normalizeCategorie(
                m.categorie_id || m.categorieId || "commerces-services"
              );
              const catObj: any = getCategorieById(catId);
              const wa = cle9(
                m.ownerWhatsapp || m.vendor_phone || m.whatsapp || ""
              );
              const montantUSD = getMontantMessageUSD(m);

              return (
                <div
                  key={m.id}
                  className={`flex gap-3 p-4 hover:bg-gray-50 transition ${
                    m._vendeurCache ? "opacity-75" : ""
                  } ${m.unread ? "bg-orange-50/50" : ""}`}
                >
                  <div className="relative shrink-0">
                    <div className="w-[52px] h-[52px] bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                      {m.photo || m.images?.[0] ? (
                        <img
                          src={m.photo || m.images?.[0]}
                          alt={m.vendor_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">
                          {catObj?.icon || "🏪"}
                        </span>
                      )}
                    </div>
                    {m.unread ? (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">
                        {m.unread > 9 ? "9+" : m.unread}
                      </span>
                    ) : (
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          m._isPaye ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-[13px] truncate flex items-center gap-1">
                        <span>
                          {m.vendor_name || m.nomBoutique || m.user || "Boutique"}
                        </span>
                        <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {m._palierId}
                          {m._vendeurCache ? " • masqué" : ""}
                        </span>
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {formatDate(m.last_date || m.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {catObj?.icon} {m.titre || m.title || m.name || "Article"}
                      {montantUSD > 0
                        ? ` • ${usd(montantUSD)} / ${toCDFString(montantUSD)}`
                        : ""}
                    </p>

                    <p
                      className={`text-[12px] truncate mt-1 ${
                        m.unread ? "font-bold text-black" : "text-gray-600"
                      }`}
                    >
                      {m.last_text}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {wa ? (
                      <a
                        href={`https://wa.me/${wa}?text=${encodeURIComponent(
                          `Bonjour ${
                            m.vendor_name || "Boutique"
                          }, suite message sur Wenze Wenze (0 % commission) : ${
                            m.titre || m.title || "annonce"
                          }`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          tracerMessageJournal(
                            "MESSAGE_CONTACT_WA",
                            cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
                            m.id
                          )
                        }
                        className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center text-white"
                      >
                        💬
                      </a>
                    ) : null}
                    <Link
                      href={`/produit/${encodeURIComponent(
                        String(m.order_id || m.boutique_id || m.id)
                      )}`}
                      className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-[12px]"
                    >
                      👁️
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          href="/messages"
          className="font-black text-black flex flex-col items-center gap-0.5"
        >
          <span className="text-[18px] relative">
            💬
            {totalUnread > 0 ? (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">
                {totalUnread}
              </span>
            ) : null}
          </span>
          Messages
        </Link>
        <Link
          href="/boutiques"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px]">🏬</span>Boutiques
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
