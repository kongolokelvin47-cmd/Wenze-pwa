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
  toCDF,
  usd,
  isCompteCache,
  checkFreemiumWenze,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

type Order = {
  id: string;
  status: string;
  total: number;
  total_cdf?: number;
  totalUSD?: number;
  created_at: string;
  createdAt?: string;
  categorie_id?: string;
  categorieId?: string;
  categorieTitre?: string;
  titre?: string;
  title?: string;
  name?: string;
  photo?: string;
  images?: string[];
  vendeur_whatsapp?: string;
  ownerWhatsapp?: string;
  whatsapp?: string;
  user?: string;
  nomBoutique?: string;
  acheteur_whatsapp?: string;
  acheteurWa?: string;
  buyerWa?: string;
  clientWa?: string;
  quantite?: number;
  qty?: number;
  typeAnnonce?: string;
  prixGros?: number;
  prixGrosUSD?: number;
  uniteGros?: string;
  minimumCommande?: number;
  province?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  _isPaye?: boolean;
  _palierId?: string;
  _vendeurCache?: boolean;
  _sens?: "achat" | "vente";
};

function statusConfig(s: string) {
  const low = (s || "").toLowerCase();
  if (low.includes("paye") || low.includes("payé") || low === "paid") {
    return {
      label: "Payée",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      icon: "✅",
    };
  }
  if (low.includes("livre") || low === "delivered") {
    return {
      label: "Livrée",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
      icon: "📦",
    };
  }
  if (
    low.includes("cours") ||
    low === "pending" ||
    low === "en_attente"
  ) {
    return {
      label: "En cours",
      color: "bg-orange-100 text-orange-700 border-orange-200",
      dot: "bg-orange-500",
      icon: "⏳",
    };
  }
  if (low.includes("annule") || low === "cancelled") {
    return {
      label: "Annulée",
      color: "bg-red-100 text-red-700 border-red-200",
      dot: "bg-red-500",
      icon: "❌",
    };
  }
  return {
    label: s || "En attente",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
    icon: "🕒",
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

function safeParseList(key: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function tracerCommandeJournal(
  action: "COMMANDE_CONTACT_WA",
  acteurWa: string,
  roleActuel: string,
  detail?: string,
  messageHumain?: string
) {
  try {
    if (typeof window === "undefined") return;
    const arr = safeParseList("wenze_journal");
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      acteurWhatsapp: acteurWa,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));

    const prevAct = safeParseList("wenze_journal_activite");
    const msg =
      messageHumain || `Contact WhatsApp commande ${detail || ""}`.trim();
    const last = prevAct[0];
    if (
      !last ||
      last.message !== msg ||
      Date.now() - Number(last.ts || 0) >= 4000
    ) {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        date: new Date().toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        role: roleActuel || "client",
        type: "contact",
        message: msg,
      };
      localStorage.setItem(
        "wenze_journal_activite",
        JSON.stringify([entry, ...prevAct].slice(0, 60))
      );
      window.dispatchEvent(new Event("wenze-update"));
    }
  } catch {}
}

function formatZoneCommande(o: Order): string {
  const parts = [
    o.commune || "",
    o.quartier ? `Q/ ${o.quartier}` : "",
    o.province && o.province !== "Kinshasa" ? o.province : "",
  ].filter(Boolean);
  return parts.join(" • ");
}

export default function MesCommandesPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "paid" | "delivered"
  >("all");
  const [sens, setSens] = useState<"achat" | "vente" | "tout">("achat");
  const [moi, setMoi] = useState<any>(null);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});
  const [syncTick, setSyncTick] = useState(0);

  const monRole = String(moi?.role || "client").toLowerCase();
  const jeSuisDG =
    moi?.roleAdmin === "dg" ||
    monRole === "dg" ||
    Boolean(moi?.dgSessionActive);
  const jePeuxVoirGros = monRole === "grossiste" || jeSuisDG;
  const jePeuxVendre =
    monRole === "vendeur" ||
    monRole === "grossiste" ||
    monRole === "prestataire" ||
    jeSuisDG;

  const totalUSDOrder = useCallback(
    (o: Order): number => {
      const q = Math.max(1, Number(o.quantite ?? o.qty ?? 1));
      if (o.typeAnnonce === "gros" && jePeuxVoirGros) {
        const pg = Number(o.prixGrosUSD ?? o.prixGros ?? 0);
        if (pg > 0) return pg * q;
      }
      const baseUnit = Number(o.totalUSD ?? o.total ?? 0);
      return baseUnit > 0 ? baseUnit : 0;
    },
    [jePeuxVoirGros]
  );

  const formatTotalDouble = useCallback(
    (o: Order): string => {
      const montant = totalUSDOrder(o);
      if (montant <= 0) return "Prix sur demande";
      return `${usd(montant)} / ${toCDFString(montant)} (${toCDF(montant)} FC)`;
    },
    [totalUSDOrder]
  );

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      setCfgPublique(lireConfigPublique());

      const session: any = lireSession();
      const moiRawStr = localStorage.getItem("wenze_user");
      const moiRaw =
        session ||
        (() => {
          try {
            return moiRawStr ? JSON.parse(moiRawStr) : null;
          } catch {
            return null;
          }
        })();
      setMoi(moiRaw);

      const monWa = cle9(
        moiRaw?.ownerWhatsapp || moiRaw?.whatsapp || moiRaw?.telephone || ""
      );

      const raw =
        localStorage.getItem("wenze_commandes_list") ||
        localStorage.getItem("wenze_orders") ||
        "[]";
      const parsedList = JSON.parse(raw);
      const list = Array.isArray(parsedList) ? parsedList : [];

      const allUsers = safeParseList("wenze_all_users");
      const userMap = new Map<string, any>();
      for (const u of allUsers) {
        const wa = cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "");
        if (wa) userMap.set(wa, u);
      }

      const enriched: Order[] = list
        .map((o: any) => {
          const vendeurWa = cle9(
            o?.vendeur_whatsapp || o?.ownerWhatsapp || o?.whatsapp || ""
          );
          const acheteurWa = cle9(
            o?.acheteur_whatsapp ||
              o?.acheteurWa ||
              o?.buyerWa ||
              o?.clientWa ||
              o?.acheteur ||
              ""
          );
          const imgs: string[] = Array.isArray(o?.images)
            ? o.images
            : o?.photo
            ? [o.photo]
            : [];
          const uVendeurRef = userMap.get(vendeurWa);

          return {
            id: String(o?.id || o?.orderId || ""),
            status: o?.status || "en_attente",
            total: Number(o?.total ?? o?.totalUSD ?? o?.prix ?? 0),
            totalUSD: Number(o?.totalUSD ?? o?.total ?? 0),
            total_cdf: o?.total_cdf,
            created_at: o?.created_at || o?.createdAt || "",
            createdAt: o?.createdAt || o?.created_at || "",
            categorie_id: o?.categorie_id || o?.categorieId,
            categorieId: o?.categorieId || o?.categorie_id,
            categorieTitre: o?.categorieTitre,
            titre: o?.titre || o?.title || o?.name || "Commande",
            title: o?.title,
            name: o?.name,
            photo: imgs[0] || o?.photo,
            images: imgs,
            vendeur_whatsapp: vendeurWa,
            ownerWhatsapp: vendeurWa,
            whatsapp: o?.whatsapp,
            user: o?.user || o?.nomBoutique || "Boutique",
            nomBoutique: o?.nomBoutique || o?.user,
            acheteur_whatsapp: acheteurWa,
            quantite: Math.max(1, Number(o?.quantite ?? o?.qty ?? 1)),
            qty: Math.max(1, Number(o?.qty ?? o?.quantite ?? 1)),
            typeAnnonce: o?.typeAnnonce,
            prixGros: Number(o?.prixGros ?? o?.prixGrosUSD ?? 0),
            prixGrosUSD: Number(o?.prixGrosUSD ?? o?.prixGros ?? 0),
            uniteGros: o?.uniteGros || "carton",
            minimumCommande: Number(o?.minimumCommande || 10),
            province: o?.province || uVendeurRef?.province || "",
            commune: o?.commune || uVendeurRef?.commune || "",
            quartier: o?.quartier || uVendeurRef?.quartier || "",
            avenue: o?.avenue || uVendeurRef?.avenue || "",
            _sens: vendeurWa && monWa && vendeurWa === monWa ? "vente" : "achat",
          };
        })
        .map((o: Order) => {
          const wa = cle9(
            o.ownerWhatsapp || o.vendeur_whatsapp || o.whatsapp || ""
          );
          const uVendeur = userMap.get(wa) || {
            ownerWhatsapp: wa,
            createdAt: o.created_at || o.createdAt,
            id: wa,
          };

          let vendeurCache = false;
          let isPaye = false;
          let palierId = "FREEMIUM";
          try {
            vendeurCache = Boolean(isCompteCache && isCompteCache(uVendeur));
            const ab = checkFreemiumWenze && checkFreemiumWenze(uVendeur, 0);
            isPaye = Boolean(ab?.isPaye);
            palierId = ab?.palierId || (isPaye ? "ACTIF" : "FREEMIUM");
          } catch {}

          const safeImgs = isPaye
            ? o.images || []
            : (o.images || []).slice(0, MAX_FREE_IMAGES);

          return {
            ...o,
            photo: safeImgs[0] || o.photo,
            images: safeImgs,
            _vendeurCache: vendeurCache,
            _isPaye: isPaye,
            _palierId: palierId,
          };
        })
        .filter((o: Order) => {
          if (!monWa) return false;
          const vendeurWa = cle9(o.vendeur_whatsapp || "");
          const acheteurWa = cle9(o.acheteur_whatsapp || "");
          if (!acheteurWa && !vendeurWa) return false;
          return vendeurWa === monWa || acheteurWa === monWa;
        })
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at || b.createdAt || 0).getTime() -
            new Date(a.created_at || a.createdAt || 0).getTime()
        )
        .slice(0, PLAFOND_ACTIVES);

      setOrders(enriched);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [syncTick]);
            useEffect(() => {
    if (typeof window === "undefined") return;
    const onSync = () => setSyncTick((t) => t + 1);
    window.addEventListener("storage", onSync);
    window.addEventListener("wenze-update", onSync);
    return () => {
      window.removeEventListener("storage", onSync);
      window.removeEventListener("wenze-update", onSync);
    };
  }, []);

  const filtered = useMemo(() => {
    let list = orders;
    if (sens !== "tout") {
      list = list.filter((o) => o._sens === sens);
    }
    if (filterStatus !== "all") {
      list = list.filter((o) => {
        const s = (o.status || "").toLowerCase();
        if (filterStatus === "pending") {
          return s.includes("attente") || s.includes("cours") || s === "pending";
        }
        if (filterStatus === "paid") {
          return s.includes("paye") || s.includes("payé") || s === "paid";
        }
        if (filterStatus === "delivered") {
          return s.includes("livre") || s === "delivered";
        }
        return true;
      });
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    const qWa = cle9(q);
    return list.filter(
      (o) =>
        (o.titre || o.title || o.name || "").toLowerCase().includes(q) ||
        (o.user || o.nomBoutique || "").toLowerCase().includes(q) ||
        (o.commune || "").toLowerCase().includes(q) ||
        (o.province || "").toLowerCase().includes(q) ||
        (qWa &&
          cle9(o.ownerWhatsapp || o.vendeur_whatsapp || "").includes(qWa))
    );
  }, [orders, search, filterStatus, sens]);

  const stats = {
    all: orders.length,
    pending: orders.filter((o) => {
      const s = (o.status || "").toLowerCase();
      return s.includes("attente") || s.includes("cours") || s === "pending";
    }).length,
    paid: orders.filter((o) => {
      const s = (o.status || "").toLowerCase();
      return s.includes("paye") || s.includes("payé");
    }).length,
    delivered: orders.filter((o) => {
      const s = (o.status || "").toLowerCase();
      return s.includes("livre") || s === "delivered";
    }).length,
  };

  const nbAchats = orders.filter((o) => o._sens === "achat").length;
  const nbVentes = orders.filter((o) => o._sens === "vente").length;

  if (loading) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-24 bg-white border rounded-2xl animate-pulse" />
        <p className="text-[11px] text-gray-400 mt-3">
          Chargement des commandes • 0 % commission • Taux {TAUX_CDF} CDF/$
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
            <h1 className="font-black text-[16px] truncate">
              {cfgPublique?.titreCommandes || "Mes Commandes • RDC"}
            </h1>
            <p className="text-[10px] text-gray-500 truncate">
              {orders.length}/{PLAFOND_ACTIVES} max • 0 % commission • Taux{" "}
              {TAUX_CDF} CDF/$
            </p>
          </div>
          <span className="text-[10px] bg-black text-white px-2.5 py-1 rounded-full font-bold shrink-0">
            {filtered.length}
          </span>
        </div>

        {jePeuxVendre ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSens("achat")}
              className={`flex-1 py-2 rounded-full font-black text-[11px] border-2 ${
                sens === "achat"
                  ? "bg-black text-white border-black"
                  : "bg-white border-gray-200"
              }`}
            >
              🛒 Achats • {nbAchats}
            </button>
            <button
              type="button"
              onClick={() => setSens("vente")}
              className={`flex-1 py-2 rounded-full font-black text-[11px] border-2 ${
                sens === "vente"
                  ? "bg-black text-white border-black"
                  : "bg-white border-gray-200"
              }`}
            >
              💰 Ventes • {nbVentes}
            </button>
            <button
              type="button"
              onClick={() => setSens("tout")}
              className={`px-3.5 py-2 rounded-full font-black text-[11px] border-2 ${
                sens === "tout"
                  ? "bg-black text-white border-black"
                  : "bg-white border-gray-200"
              }`}
            >
              Tout
            </button>
          </div>
        ) : null}

        <div className="mt-3 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher : article, boutique, zone..."
            className="w-full bg-gray-100 rounded-2xl py-3 px-5 pl-11 text-sm outline-none focus:ring-2 focus:ring-black"
          />
          <span className="absolute left-4 top-3">🔍</span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {[
            { id: "all", label: `Tous • ${stats.all}` },
            { id: "pending", label: `⏳ En cours • ${stats.pending}` },
            { id: "paid", label: `✅ Payées • ${stats.paid}` },
            { id: "delivered", label: `📦 Livrées • ${stats.delivered}` },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterStatus(c.id as any)}
              className={`whitespace-nowrap py-2 px-4 rounded-full font-black text-[11px] border-2 ${
                filterStatus === c.id
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
            puis <b>is_visible = false</b> • Tarif min : <b>{usd(1)}</b>
          </span>
          <span className="bg-white text-black px-2 py-0.5 rounded-full font-black shrink-0">
            {TAUX_CDF}
          </span>
        </div>
      </header>

      <div className="p-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="mt-6 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">📦</p>
            <p className="font-black mt-2 text-[13px]">
              {search || filterStatus !== "all"
                ? "Aucune commande correspondante"
                : sens === "vente"
                ? "Aucune vente enregistrée"
                : "Aucune commande pour le moment"}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              0 % commission • Taux {TAUX_CDF} CDF/$ • Contact direct
              WhatsApp
            </p>
            <Link
              href="/"
              className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : (
          filtered.map((o) => {
            const st = statusConfig(o.status);
            const catId = normalizeCategorie(
              o.categorieId || o.categorie_id || "commerces-services"
            );
            const catObj = getCategorieById(catId) as any;
            const wa = cle9(
              o.ownerWhatsapp || o.vendeur_whatsapp || o.whatsapp || ""
            );
            const estGros = o.typeAnnonce === "gros";
            const totalLabel = formatTotalDouble(o);
            const zoneLabel = formatZoneCommande(o);

            return (
              <div
                key={o.id}
                className={`bg-white rounded-2xl border overflow-hidden ${
                  o._vendeurCache
                    ? "opacity-75 border-dashed"
                    : "shadow-sm hover:shadow-md"
                } transition`}
              >
                <div className="p-3 flex gap-3">
                  <Link
                    href={`/produit/${encodeURIComponent(o.id)}`}
                    className="w-[72px] h-[72px] bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                  >
                    {o.photo || o.images?.[0] ? (
                      <img
                        src={o.photo || o.images?.[0]}
                        alt={o.titre || "Commande"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{catObj?.icon || "📦"}</span>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-[13px] truncate">
                        {o.titre || o.title || o.name}
                      </p>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 shrink-0 ${st.color}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                        />
                        {st.icon} {st.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {catObj?.icon}{" "}
                      {o.categorieTitre || catObj?.titreCourt || catId} •{" "}
                      {o.user || o.nomBoutique || "Boutique"} • Qté{" "}
                      {o.quantite || 1}
                    </p>

                    {zoneLabel ? (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        📍 {zoneLabel}
                      </p>
                    ) : null}
                    <p className="font-black text-[12px] mt-1">{totalLabel}</p>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {estGros ? (
                        <span className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black">
                          GROS {jePeuxVoirGros ? "" : "(DÉTAIL)"}
                        </span>
                      ) : null}
                      {o._sens === "vente" ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black">
                          VENTE
                        </span>
                      ) : (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black">
                          ACHAT
                        </span>
                      )}
                      <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded-full">
                        {o._palierId}
                        {o._vendeurCache ? " • is_visible = false" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-3 pb-3 flex gap-2">
                  {wa ? (
                    <a
                      href={`https://wa.me/${wa}?text=${encodeURIComponent(
                        `Bonjour ${
                          o.user || "Boutique"
                        }, suivi commande Wenze Wenze #${o.id} — "${
                          o.titre
                        }" (${totalLabel}) • Statut : ${st.label}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        tracerCommandeJournal(
                          "COMMANDE_CONTACT_WA",
                          cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
                          monRole,
                          `#${o.id}`,
                          `Contact WhatsApp commande #${o.id} (${o.titre || "Article"})`
                        )
                      }
                      className="flex-1 bg-[#25D366] text-white text-[11px] font-black py-2.5 rounded-full flex justify-center"
                    >
                      💬 WhatsApp vendeur
                    </a>
                  ) : null}
                  <Link
                    href={`/produit/${encodeURIComponent(o.id)}`}
                    className="px-4 bg-gray-100 text-[11px] font-bold py-2.5 rounded-full flex items-center"
                  >
                    Voir
                  </Link>
                </div>
              </div>
            );
          })
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
          href="/mes-commandes"
          className="font-black text-black flex flex-col items-center gap-0.5"
        >
          <span className="text-[18px]">📦</span>Commandes
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
