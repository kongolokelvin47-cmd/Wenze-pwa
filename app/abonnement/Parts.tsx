"use client";
import Link from "next/link";
import { FREEMIUM, PALIERS, MAX_ANNONCES_ACTIVES, toCDFString, usd } from "@/lib/paiement";

const DAY_MS = 86400000;
const joursRestants = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS));
const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

/* ---------- Fenêtre de confirmation d'achat ---------- */
export function SuccessModal({ success }: { success: any }) {
  return (
    <>
      {success ? (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[340px] w-full p-6 text-center border-2 border-black">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div>
            <h2 className="font-black text-[14px] mt-3">{success.type === "renouvel" ? "Renouvelé !" : "Achat enregistré !"}</h2>
            <div className="bg-[#FFFBF0] border-2 rounded-xl p-3 mt-3 text-left text-[11px]">
              {success.type === "palier" ? (
                <>
                  <p className="font-black">{(PALIERS as any)[success.ticket.palierId]?.badge} {success.ticket.palierId} - {success.ticket.imagesMax} images sur {success.ticket.jours}j</p>
                  <p className="text-green-700 font-bold mt-1">{usd(success.ticket.prixUSD)} / {toCDFString(success.ticket.prixUSD)}</p>
                  <p className="text-[9px] text-gray-500 mt-1">S'ajoute à vos achats actifs. Expire le {dateFr(success.ticket.expireAt)}.</p>
                </>
              ) : null}
              {success.type === "occasionnel" ? (
                <>
                  <p className="font-black">{success.offre.badge} {success.offre.label}</p>
                  <p className="text-green-700 font-bold mt-1">{usd(success.ticket.prixUSD)} - boost actif jusqu'au {dateFr(success.ticket.expireAt)}</p>
                </>
              ) : null}
              {success.type === "renouvel" ? (
                <>
                  <p className="font-black">♻️ {success.ticket.palierId} prolongé de {success.ticket.jours}j</p>
                  <p className="text-green-700 font-bold">Expire le {dateFr(success.ticket.expireAt)}</p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---------- Abonnements et boosts actifs de la boutique ---------- */
export function MesAbonnements({ ab, paying, onRenew }: { ab: any; paying: boolean; onRenew: (t: any) => void }) {
  return (
    <>
        {ab?.ticketsActifs?.length > 0 ? (
          <div className="bg-white border-2 border-black rounded-2xl p-4">
            <p className="font-black text-[12px]">🎫 Mes abonnements actifs ({ab.ticketsActifs.length})</p>
            <p className="text-[9px] text-gray-600 mt-1">Chaque achat a son propre quota et sa propre échéance. Les quotas s'additionnent (max {MAX_ANNONCES_ACTIVES} annonces actives).</p>
            <div className="mt-3 space-y-2">
              {ab.ticketsActifs.map((t: any) => (
                <div key={t.ticketId} className="border-2 rounded-xl p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="font-black text-[11px]">{(PALIERS as any)[t.palierId]?.badge} {t.palierId} - {t.imagesUsed}/{t.imagesMax} images</p>
                      <p className="text-[9px] text-gray-600">Expire le {dateFr(t.expireAt)} - {joursRestants(t.expireAt)}j restants</p>
                      <div className="mt-1 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-black h-full" style={{ width: (t.imagesMax ? Math.min(100, (t.imagesUsed / t.imagesMax) * 100) : 0) + "%" }}></div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => onRenew(t)} disabled={paying} className="bg-black text-white px-3 py-1.5 rounded-full text-[9px] font-black disabled:opacity-50">
                        ♻️ Renouveler {usd(t.prixUSD)}
                      </button>
                      <Link href={"/publier?ticket=" + t.ticketId} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[9px] font-black text-center">📤 Publier</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {ab?.ticketsOccasionnel?.length > 0 ? (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-3">
            <p className="font-black text-[11px]">🎟️ Boosts actifs ({ab.ticketsOccasionnel.length})</p>
            <div className="mt-2 space-y-1">
              {ab.ticketsOccasionnel.map((t: any) => (
                <div key={t.ticketId} className="text-[9px] border rounded-lg p-2 bg-white flex justify-between">
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
  return (
            <div className="bg-white border-2 rounded-2xl p-4">
              <p className="font-black text-[11px]">Comparatif</p>
              <div className="mt-3 space-y-2 text-[10px]">
                <div className="grid grid-cols-4 gap-2 font-black border-b pb-2"><span>Palier</span><span>Images</span><span>Vidéo</span><span>30 jours</span></div>
                {Object.keys(PALIERS).map((k) => {
                  const p: any = (PALIERS as any)[k];
                  return (
                    <div key={k} className="grid grid-cols-4 gap-2">
                      <span>{p.badge} {k}</span>
                      <span>{p.imagesMin}-{p.imagesMax}</span>
                      <span>{p.videoDuree}</span>
                      <span className="font-black">{usd(p.prixUSD)}</span>
                    </div>
                  );
                })}
                <div className="grid grid-cols-4 gap-2 text-gray-500"><span>🆓 Gratuit</span><span>{FREEMIUM.maxImages} à vie</span><span>0</span><span>0 $ ({FREEMIUM.dureeJours}j)</span></div>
              </div>
            </div>
  );
              }
                                     
