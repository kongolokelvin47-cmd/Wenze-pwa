"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lireSession, cle9 } from "@/lib/connexion";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  toCDF,
  usd,
  verifierAbonnement,
  PALIERS,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

type Transaction = {
  id: string;
  type: "vente" | "abonnement" | "retrait" | "ticket";
  montant: number;
  montantUSD: number;
  montantCDF: number;
  date: string;
  createdAt?: string;
  statut: "paye" | "attente" | "retire" | "actif";
  titre?: string;
  boutique?: string;
  palierId?: string;
};

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

function tracerPortefeuilleJournal(
  action: "PORTEFEUILLE_OUVERT",
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

export default function PortefeuillePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [abInfo, setAbInfo] = useState<any>(null);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const session: any = lireSession();
      const rawUser = localStorage.getItem("wenze_user");
      const u = session || (rawUser ? JSON.parse(rawUser) : null);

      if (!u) {
        router.push("/auth?next=/portefeuille");
        return;
      }

      setUser(u);
      const cfg = lireConfigPublique();
      setCfgPublique(cfg);

      try {
        const ab = verifierAbonnement();
        setAbInfo(ab);
      } catch {}

      const wa = cle9(u.ownerWhatsapp || u.whatsapp || u.telephone || "");
      tracerPortefeuilleJournal("PORTEFEUILLE_OUVERT", wa);

      let list: Transaction[] = [];
      try {
        const txRaw =
          localStorage.getItem("wenze_transactions") ||
          localStorage.getItem(`wenze_tx_${wa}`) ||
          "[]";
        const parsed = JSON.parse(txRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.map((t: any) => {
            const mUSD = Number(t.montantUSD ?? t.montant ?? t.prixUSD ?? 0);
            return {
              id: String(t.id || `tx_${Date.now()}_${Math.random()}`),
              type: (t.type || "vente") as Transaction["type"],
              montant: mUSD,
              montantUSD: mUSD,
              montantCDF: toCDF(mUSD),
              date:
                t.date || t.createdAt || t.startAt || new Date().toISOString(),
              statut: (t.statut || "paye") as Transaction["statut"],
              titre:
                t.titre ||
                t.title ||
                `${t.palierId ? `${t.palierId} ` : ""}${t.type || "vente"}`,
              boutique: t.boutique || u.nomEtablissement || "Ma boutique",
              palierId: t.palierId,
            };
          });
        }
      } catch {}

      if (list.length === 0) {
        try {
          const annRaw = localStorage.getItem("wenze_annonces_list") || "[]";
          const parsedAnns = JSON.parse(annRaw);
          const anns = (Array.isArray(parsedAnns) ? parsedAnns : [])
            .filter(
              (a: any) =>
                cle9(a?.ownerWhatsapp || a?.whatsapp || a?.userId || "") === wa
            )
            .slice(0, PLAFOND_ACTIVES);

          const ventes: Transaction[] = anns.slice(0, 5).map((a: any, i: number) => {
            const prixVal = Number(a.prixUSD ?? a.prix ?? 0);
            return {
              id: `vente_${a.id}`,
              type: "vente" as const,
              montant: prixVal,
              montantUSD: prixVal,
              montantCDF: toCDF(prixVal),
              date: new Date(Date.now() - i * 86400000 * 2).toISOString(),
              statut: "paye" as const,
              titre: a.titre || "Produit",
              boutique: u.nomEtablissement || u.nom || "Ma boutique",
            };
          });
          list = [...ventes];

          try {
            const ticketsRaw =
              localStorage.getItem("wenze_tickets") ||
              localStorage.getItem(`wenze_tickets_${wa}`) ||
              "[]";
            const parsedTickets = JSON.parse(ticketsRaw);
            const tickets = Array.isArray(parsedTickets) ? parsedTickets : [];
            for (const t of tickets) {
              const mUSD = Number(t.prixUSD ?? t.montant ?? 1);
              list.push({
                id: `ticket_${
                  t.ticketId || t.id || Date.now()
                }_${Math.random().toString(36).slice(2, 4)}`,
                type: "ticket" as const,
                montant: mUSD,
                montantUSD: mUSD,
                montantCDF: toCDF(mUSD),
                date:
                  t.startAt ||
                  t.createdAt ||
                  t.date ||
                  new Date().toISOString(),
                statut: "actif" as const,
                palierId: t.palierId || "STANDARD",
                titre: `Ticket ${t.palierId || "STANDARD"} • ${Math.min(
                  PLAFOND_ACTIVES,
                  Number(t.imagesMax || t.places || 4)
                )} places / ${t.jours || 7}j`,
                boutique: u.nomEtablissement || "Ma boutique",
              });
            }
          } catch {}
        } catch {}
      }

      const sorted = [...list].sort(
        (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      );
      setTransactions(sorted);
    } catch {
      // Erreur silencieuse gérée par l'état
    } finally {
      setLoading(false);
    }
  }, [router]);

  const stats = useMemo(() => {
    const ventes = transactions.filter(
      (t) => t.type === "vente" && t.statut === "paye"
    );
    const tickets = transactions.filter(
      (t) => t.type === "ticket" || t.type === "abonnement"
    );
    const totalVentesUSD = ventes.reduce(
      (s, t) => s + Number(t.montantUSD || 0),
      0
    );
    const totalTicketsUSD = tickets.reduce(
      (s, t) => s + Number(t.montantUSD || 0),
      0
    );
    return {
      totalVentesUSD,
      totalTicketsUSD,
      countVentes: ventes.length,
      countTickets: tickets.length,
      totalVentesCDF: toCDFString(totalVentesUSD),
      totalTicketsCDF: toCDFString(totalTicketsUSD),
    };
  }, [transactions]);

  const formatDate = (d?: string) => {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  };

  if (loading) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-24 bg-white border rounded-2xl animate-pulse" />
        <p className="text-[11px] text-gray-400 mt-3">
          Chargement du portefeuille • Taux {TAUX_CDF} CDF/$ • 0 % commission
        </p>
      </div>
    );
  }

  const placesMaxAffichees = Math.min(
    PLAFOND_ACTIVES,
    Number(abInfo?.maxPlaces || PLAFOND_ACTIVES)
  );
  const totalAnnoncesAffichees = Math.min(
    PLAFOND_ACTIVES,
    Number(abInfo?.totalAnnonces || 0)
  );
  const placesLibresAffichees = Math.max(
    0,
    placesMaxAffichees - totalAnnoncesAffichees
  );

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            href="/profil"
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[16px] truncate">
              {cfgPublique?.titrePortefeuille || "Portefeuille Wenze Wenze"}
            </h1>
            <p className="text-[10px] text-gray-500 truncate">
              {user?.nomEtablissement || user?.nom || "Boutique"} • Kinshasa •
              0 % commission • Taux {TAUX_CDF} CDF/$
            </p>
          </div>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
              abInfo?.isCache
                ? "bg-red-100 text-red-700"
                : abInfo?.isPaye
                ? "bg-emerald-100 text-emerald-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {abInfo?.palierId || "FREEMIUM"}
          </span>
        </div>
        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[10px] leading-relaxed">
          <b>0 % commission</b> sur les ventes • Freemium :{" "}
          <b>
            {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
          </b>{" "}
          puis <b>is_visible = false</b> • Plafond :{" "}
          <b>{PLAFOND_ACTIVES} annonces actives</b> max.
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-black text-white rounded-3xl p-5 shadow-lg">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="text-[10px] opacity-70 uppercase tracking-wider">
                Ventes directes (0 % commission)
              </p>
              <p className="text-[26px] font-black mt-1">
                {usd(stats.totalVentesUSD)}
              </p>
              <p className="text-[12px] opacity-80">
                {stats.totalVentesCDF} • Taux {TAUX_CDF} CDF/$
              </p>
              <p className="text-[10px] opacity-60 mt-2">
                {stats.countVentes} vente(s) • 0 % commission
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl px-3 py-2 text-center shrink-0">
              <p className="text-[10px] opacity-70">Tickets</p>
              <p className="font-black text-[14px]">{stats.countTickets}</p>
              <p className="text-[10px] opacity-70">
                {usd(stats.totalTicketsUSD)}
              </p>
              <p className="text-[9px] opacity-60">
                {stats.totalTicketsCDF}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/publier"
              className="bg-white text-black rounded-full py-3 text-[11px] font-black text-center"
            >
              + Nouvelle annonce
            </Link>
            <Link
              href="/boutiques"
              className="bg-white/10 border border-white/20 text-white rounded-full py-3 text-[11px] font-bold text-center"
            >
              Mes boutiques
            </Link>
          </div>
        </div>

        {abInfo ? (
          <div className="bg-white border rounded-2xl p-4">
            <p className="font-black text-[13px] flex items-center gap-2">
              Visibilité &amp; places actives
              {abInfo.isCache ? (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px]">
                  is_visible = false
                </span>
              ) : null}
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className="bg-black text-white px-3 py-1.5 rounded-full text-[11px] font-bold">
                {abInfo.palierId || "FREEMIUM"} • {abInfo.joursRestants || 0}j
              </span>
              <span className="bg-gray-100 px-3 py-1.5 rounded-full text-[11px] font-bold">
                {placesLibresAffichees} place(s) libre(s) / {placesMaxAffichees}{" "}
                max
              </span>
              <span className="bg-gray-100 px-3 py-1.5 rounded-full text-[11px]">
                {totalAnnoncesAffichees} active(s)
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {Object.entries(PALIERS || {}).map(([k, v]: any) => {
                const prixP = Number(v?.prixUSD ?? v?.prix ?? 1);
                return (
                  <div
                    key={k}
                    className={`border rounded-xl p-2.5 text-center ${
                      abInfo.palierId === k
                        ? "border-black bg-gray-50"
                        : "border-gray-200"
                    }`}
                  >
                    <p className="font-black text-[11px]">{k}</p>
                    <p className="font-black text-[12px] mt-1">{usd(prixP)}</p>
                    <p className="text-[9px] text-gray-500">
                      {toCDFString(prixP)}
                    </p>
                    <p className="text-[9px] font-bold mt-1">
                      {Math.min(PLAFOND_ACTIVES, Number(v?.places || 4))} pl •{" "}
                      {v?.jours || 7}j
                    </p>
                  </div>
                );
              })}
            </div>

            <Link
              href="/abonnement"
              className="mt-3 block bg-black text-white rounded-full py-2.5 text-center text-[11px] font-black"
            >
              Gérer l&apos;abonnement • Max {PLAFOND_ACTIVES} actives
            </Link>
          </div>
        ) : null}

        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b">
            <p className="font-black text-[13px]">
              Historique • 0 % commission • Taux {TAUX_CDF} CDF/$
            </p>
            <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-full">
              {transactions.length}
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl">💼</p>
              <p className="font-bold text-[12px] mt-2">Aucune transaction</p>
              <p className="text-[10px] text-gray-500 mt-1">
                0 % commission • Tarif minimum {usd(1)} ({toCDFString(1)})
              </p>
              <Link
                href="/publier"
                className="mt-3 inline-block bg-black text-white px-5 py-2 rounded-full text-[11px] font-black"
              >
                Publier une annonce
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((t) => {
                const isVente = t.type === "vente";
                const isTicket =
                  t.type === "ticket" || t.type === "abonnement";
                const mUSD = Number(t.montantUSD || 0);
                return (
                  <div key={t.id} className="p-4 flex gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                        isVente
                          ? "bg-emerald-50 border border-emerald-200"
                          : isTicket
                          ? "bg-black text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {isVente ? "💰" : isTicket ? "🎫" : "📤"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[12px] truncate">
                        {t.titre ||
                          (isVente
                            ? "Vente directe"
                            : isTicket
                            ? `Ticket ${t.palierId || ""}`
                            : "Mouvement")}{" "}
                        {t.boutique ? `• ${t.boutique}` : ""}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        0 % comm • {formatDate(t.date)} •{" "}
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                            t.statut === "paye" || t.statut === "actif"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {t.statut}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-black text-[13px] ${
                          isVente
                            ? "text-emerald-600"
                            : isTicket
                            ? "text-black"
                            : "text-gray-700"
                        }`}
                      >
                        {isVente ? "+" : "-"}
                        {usd(mUSD)}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {toCDFString(mUSD)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">Modèle économique Wenze Wenze</p>
          <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
            <b>0 % de commission</b> sur les ventes • Offre freemium limitée à{" "}
            <b>
              {MAX_FREE_IMAGES} images max pendant {FREE_DAYS} jours
            </b>{" "}
            avant masquage (<b>is_visible = false</b>) • Plafond de{" "}
            <b>{PLAFOND_ACTIVES} annonces actives</b> maximum • Invitations
            réservées aux clients, boutiques et prestataires • Taux {TAUX_CDF}{" "}
            CDF/$.
          </p>
        </div>
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
          href="/publier"
          className="flex flex-col items-center gap-0.5 text-gray-500"
        >
          <span className="text-[18px] bg-black text-white w-7 h-7 rounded-full flex items-center justify-center">
            +
          </span>
          Vendre
        </Link>
        <Link
          href="/portefeuille"
          className="font-black text-black flex flex-col items-center gap-0.5"
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
