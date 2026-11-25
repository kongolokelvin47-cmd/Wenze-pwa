"use client";

import Link from "next/link";
import {
  FREEMIUM,
  PALIERS,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
} from "@/lib/paiement";

const DAY_MS = 86400000;
const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));

function parseValidDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const joursRestants = (iso?: string) => {
  const d = parseValidDate(iso);
  if (!d) return 0;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / DAY_MS));
};

const dateFr = (iso?: string) => {
  const d = parseValidDate(iso);
  return d ? d.toLocaleDateString("fr-FR") : "—";
};

/* ---------- Fenêtre de confirmation d'achat ---------- */
export function SuccessModal({ success }: { success: any }) {
  if (!success) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] max-w-[340px] w-full p-6 text-center border-2 border-black">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">
          ✓
        </div>
        <h2 className="font-black text-[14px] mt-3">
          {success.type === "renouvel" ? "Renouvelé !" : "Achat enregistré !"}
        </h2>
        <div className="bg-[#FFFBF0] border-2 rounded-xl p-3 mt-3 text-left text-[11px]">
          {success.type === "palier" && success.ticket ? (
            <>
              <p className="font-black">
                {(PALIERS as any)[success.ticket.palierId]?.badge}{" "}
                {success.ticket.palierId} - {success.ticket.imagesMax} images
                sur {success.ticket.jours}j
              </p>
              <p className="text-green-700 font-bold mt-1">
                {usd(success.ticket.prixUSD)} /{" "}
                {toCDFString(success.ticket.prixUSD)}
              </p>
              <p className="text-[9px] text-gray-500 mt-1">
                S&apos;ajoute à vos achats actifs. Expire le{" "}
                {dateFr(success.ticket.expireAt)}. 0 % commission.
              </p>
            </>
          ) : null}

          {success.type === "occasionnel" && success.ticket ? (
            <>
              <p className="font-black">
                {success.offre?.badge} {success.offre?.label}
              </p>
              <p className="text-green-700 font-bold mt-1">
                {usd(success.ticket.prixUSD)} /{" "}
                {toCDFString(success.ticket.prixUSD)} - boost actif jusqu&apos;au{" "}
                {dateFr(success.ticket.expireAt)}
              </p>
            </>
          ) : null}

          {success.type === "renouvel" && success.ticket ? (
            <>
              <p className="font-black">
                ♻️ {success.ticket.palierId} prolongé de {success.ticket.jours}j
              </p>
              <p className="text-green-700 font-bold mt-1">
                Expire le {dateFr(success.ticket.expireAt)}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------- Abonnements et boosts actifs de la boutique ---------- */
export function MesAbonnements({
  ab,
  paying,
  onRenew,
}: {
  ab: any;
  paying: boolean;
  onRenew: (t: any) => void;
}) {
  return (
    <>
      {ab?.ticketsActifs?.length > 0 ? (
        <div className="bg-white border-2 border-black rounded-2xl p-4">
          <p className="font-black text-[12px]">
            🎫 Mes abonnements actifs ({ab.ticketsActifs.length})
          </p>
          <p className="text-[9px] text-gray-600 mt-1">
            Chaque achat a son propre quota et sa propre échéance. Les quotas
            s&apos;additionnent (max {PLAFOND_ACTIVES} annonces actives • 0 %
            commission).
          </p>
          <div className="mt-3 space-y-2">
            {ab.ticketsActifs.map((t: any) => {
              const used = Number(t.imagesUsed || 0);
              const max = Number(t.imagesMax || 0);
              const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;

              return (
                <div key={t.ticketId} className="border-2 rounded-xl p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="font-black text-[11px]">
                        {(PALIERS as any)[t.palierId]?.badge} {t.palierId} -{" "}
                        {used}/{max} images
                      </p>
                      <p className="text-[9px] text-gray-600">
                        Expire le {dateFr(t.expireAt)} -{" "}
                        {joursRestants(t.expireAt)}j restants
                      </p>
                      <div className="mt-1 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-black h-full"
                          style={{ width: pct + "%" }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => onRenew(t)}
                        disabled={paying}
                        className="bg-black text-white px-3 py-1.5 rounded-full text-[9px] font-black disabled:opacity-50 text-center"
                      >
                        ♻️ {usd(t.prixUSD)} ({toCDFString(t.prixUSD)})
                      </button>
                      <Link
                        href={"/publier?ticket=" + encodeURIComponent(t.ticketId)}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[9px] font-black text-center"
                      >
                        📤 Publier
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {ab?.ticketsOccasionnel?.length > 0 ? (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-3">
          <p className="font-black text-[11px]">
            🎟️ Boosts actifs ({ab.ticketsOccasionnel.length})
          </p>
          <div className="mt-2 space-y-1">
            {ab.ticketsOccasionnel.map((t: any) => (
              <div
                key={t.ticketId}
                className="text-[9px] border rounded-lg p-2 bg-white flex justify-between"
              >
                <span>{t.offreId || t.ticketId}</span>
                <span>{joursRestants(t.expireAt)}j restants</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---------- Comparatif des abonnements ---------- */
export function Comparatif() {
  const maxFreeImages = Number(FREEMIUM?.maxImages || 3);
  const freeDays = Number(FREEMIUM?.dureeJours || 30);

  return (
    <div className="bg-white border-2 rounded-2xl p-4">
      <p className="font-black text-[11px]">
        Comparatif (0 % commission • max {PLAFOND_ACTIVES} actives)
      </p>
      <div className="mt-3 space-y-2 text-[10px]">
        <div className="grid grid-cols-4 gap-2 font-black border-b pb-2">
          <span>Palier</span>
          <span>Images</span>
          <span>Vidéo</span>
          <span>30 jours</span>
        </div>
        {Object.keys(PALIERS).map((k) => {
          const p: any = (PALIERS as any)[k];
          return (
            <div key={k} className="grid grid-cols-4 gap-2 items-center">
              <span>
                {p.badge} {k}
              </span>
              <span>
                {p.imagesMin}-{p.imagesMax}
              </span>
              <span>{p.videoDuree}</span>
              <span className="font-black leading-tight">
                {usd(p.prixUSD)}
                <span className="block text-[8px] font-normal text-gray-600">
                  {toCDFString(p.prixUSD)}
                </span>
              </span>
            </div>
          );
        })}
        <div className="grid grid-cols-4 gap-2 text-gray-500 pt-1 border-t">
          <span>🆓 Gratuit</span>
          <span>{maxFreeImages} max</span>
          <span>0</span>
          <span>
            0 $ ({freeDays}j → masqué)
          </span>
        </div>
      </div>
    </div>
  );
  }
                  
