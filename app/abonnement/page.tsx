"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FREEMIUM,
  PALIERS,
  OCCASIONNEL,
  TYPES_OCC,
  TAUX_CDF,
  PAIEMENT_REEL,
  EMPLACEMENTS_FLASH,
  MAX_ANNONCES_ACTIVES,
  verifierAbonnement,
  acheterTicket,
  renouvelerTicket,
  acheterOccasionnel,
  toCDFString,
  usd
} from "@/lib/paiement";
import { SuccessModal, MesAbonnements, Comparatif } from "./Parts";

export const dynamic = "force-dynamic";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function AbonnementContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const annonceId = sp.get("id");
  const mode = sp.get("mode");
  const paramPalier = (sp.get("palier") || sp.get("ticket") || "").toUpperCase();
  const isOccasionnel = mode === "occasionnel" || mode === "client";

  const [ab, setAb] = useState<any>(null);
  const [palierId, setPalierId] = useState<string>(paramPalier in PALIERS ? paramPalier : "STANDARD");
  const [dureeId, setDureeId] = useState<string>("30j");
  const [showCourtes, setShowCourtes] = useState(false);
  const [typeOcc, setTypeOcc] = useState<string>("image");
  const [dureeOcc, setDureeOcc] = useState<string>("7j");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [error, setError] = useState("");

  const refresh = () => {
    try {
      setAb(verifierAbonnement());
    } catch {}
  };
  useEffect(() => {
    refresh();
  }, []);

  const palier: any = (PALIERS as any)[palierId] || PALIERS.STANDARD;
  const offre: any = palier.durees.find((d: any) => d.id === dureeId) || palier.durees.find((d: any) => d.id === "30j");
  const normales = palier.durees.filter((d: any) => !d.courte);
  const courtes = palier.durees.filter((d: any) => d.courte);
  const offreOcc: any = OCCASIONNEL.offres.find((o) => o.type === typeOcc && o.dureeId === dureeOcc) || OCCASIONNEL.offres[0];

  const choisirPalier = (k: string) => {
    setPalierId(k);
    const p: any = (PALIERS as any)[k];
    if (!p.durees.some((d: any) => d.id === dureeId)) setDureeId("30j");
  };

  const handlePayPalier = async () => {
    setPaying(true);
    setError("");
    await pause(1000);
    const res = acheterTicket(palierId as any, offre.id);
    if (res.success) {
      setSuccess({ type: "palier", ticket: res.ticket });
      refresh();
      setTimeout(() => setSuccess(null), 3500);
    } else {
      setError(res.error || "Achat impossible");
    }
    setPaying(false);
  };

  const handlePayOcc = async () => {
    setPaying(true);
    setError("");
    await pause(1000);
    const res = acheterOccasionnel(offreOcc.id);
    if (res.success && res.ticket) {
      try {
        if (annonceId) {
          const list: any[] = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
          const idx = list.findIndex((a: any) => String(a.id) === String(annonceId));
          if (idx >= 0) {
            list[idx].ticketId = res.ticket.ticketId;
            list[idx].occasionnelPaye = true;
            list[idx].boostUntil = res.ticket.expireAt;
            localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
            const occs: any[] = JSON.parse(localStorage.getItem("wenze_occasionnel") || "[]");
            const o = occs.findIndex((t: any) => t.ticketId === res.ticket.ticketId);
            if (o >= 0) {
              occs[o].imagesUsed = 1;
              occs[o].imagesIds = [annonceId];
              localStorage.setItem("wenze_occasionnel", JSON.stringify(occs));
            }
          }
        }
      } catch {}
      setSuccess({ type: "occasionnel", ticket: res.ticket, offre: offreOcc });
      refresh();
      setTimeout(() => router.push(annonceId ? "/produit/" + annonceId : "/"), 2500);
    } else {
      setError(res.error || "Achat impossible");
    }
    setPaying(false);
  };

  const handleRenouveler = async (t: any) => {
    setPaying(true);
    setError("");
    await pause(1000);
    const res = renouvelerTicket(t.ticketId);
    if (res.success) {
      refresh();
      setSuccess({ type: "renouvel", ticket: res.ticket });
      setTimeout(() => setSuccess(null), 2500);
    } else {
      setError(res.error || "Renouvellement impossible");
    }
    setPaying(false);
  };

  const chip = ab?.isCache ? "bg-red-100 border-red-300 text-red-800" : ab?.isPaye ? "bg-green-100 border-green-300 text-green-800" : "bg-yellow-100 border-yellow-300";
  const choix = (actif: boolean) => "border-2 rounded-xl p-3 text-center " + (actif ? "border-black bg-black text-white" : "border-gray-200 bg-white");

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <div className="sticky top-0 bg-white border-b-2 border-black p-4 z-10">
        <h1 className="font-black text-[14px]">{isOccasionnel ? "Boost flash" : "Abonnements"} - 0% commission</h1>
        <p className="text-[9px] text-gray-600 mt-1">Taux {TAUX_CDF} CDF/$ • Minimum de paiement 1 $ • Achats cumulables</p>
        {ab ? (
          <div className={"mt-2 text-[10px] font-bold px-2 py-1 rounded-full border-2 " + chip}>
            {ab.badge} {ab.message}
            {ab.placesRestantes !== undefined ? " - " + ab.placesRestantes + " images libres" : ""}
          </div>
        ) : null}
        {!PAIEMENT_REEL ? <p className="mt-2 text-[9px] font-bold bg-orange-100 border border-orange-300 text-orange-800 rounded-lg px-2 py-1">Mode test : aucun argent n'est débité pour l'instant.</p> : null}
      </div>

      <SuccessModal success={success} />

      <div className="p-4 space-y-4">
        {error ? <div className="bg-red-50 border-2 border-red-300 text-red-700 rounded-xl p-3 text-[11px] font-bold">{error}</div> : null}

        {ab?.isCache ? (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4">
            <p className="font-black text-[12px] text-red-800">🔒 Boutique masquée : {FREEMIUM.dureeJours} jours gratuits expirés</p>
            <p className="text-[10px] text-red-700 mt-1">Personne ne voit vos annonces. Achetez un abonnement ci-dessous pour réapparaître.</p>
          </div>
        ) : null}

        <MesAbonnements ab={ab} paying={paying} onRenew={handleRenouveler} />

        {isOccasionnel ? (
          <div className="bg-white border-2 border-black rounded-2xl p-4">
            <p className="font-black text-[13px]">🎟️ Boost flash (vente occasionnelle)</p>
            <p className="text-[9px] text-gray-600 mt-1">Votre annonce passe en haut de l'accueil. {EMPLACEMENTS_FLASH} emplacements en simultané : au-delà, rotation équitable.</p>

            <p className="font-black text-[10px] mt-3">Que voulez-vous mettre en avant ?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {TYPES_OCC.map((t) => (
                <button key={t.id} type="button" onClick={() => setTypeOcc(t.id)} className={choix(typeOcc === t.id)}>
                  <p className="text-[16px]">{t.badge}</p>
                  <p className="font-black text-[9px]">{t.label}</p>
                </button>
              ))}
            </div>

            <p className="font-black text-[10px] mt-3">Durée</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {OCCASIONNEL.offres
                .filter((o) => o.type === typeOcc)
                .map((o) => (
                  <button key={o.id} type="button" onClick={() => setDureeOcc(o.dureeId)} className={choix(dureeOcc === o.dureeId)}>
                    <p className="font-black text-[12px]">{o.jours} j</p>
                    <p className="font-black text-[11px]">{usd(o.prixUSD)}</p>
                    {o.prixAffiche ? <p className="text-[7px] opacity-70">{usd(o.prixAffiche)}/jour, minimum 1 $</p> : null}
                  </button>
                ))}
            </div>

            <button type="button" onClick={handlePayOcc} disabled={paying} className="mt-4 w-full bg-black text-white py-4 rounded-full font-black text-[12px] disabled:opacity-50">
              {paying ? "Paiement..." : "Acheter : " + offreOcc.label + " - " + usd(offreOcc.prixUSD) + " / " + toCDFString(offreOcc.prixUSD)}
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white border-2 border-black rounded-2xl p-4">
              <p className="font-black text-[13px]">Acheter un abonnement</p>
              <p className="text-[9px] text-gray-600 mt-1">Chaque achat s'ajoute aux précédents sans les écraser. Supprimer une annonce libère son image.</p>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {Object.keys(PALIERS).map((k) => {
                  const p: any = (PALIERS as any)[k];
                  return (
                    <button key={k} type="button" onClick={() => choisirPalier(k)} className={choix(palierId === k)}>
                      <p className="text-[16px]">{p.badge}</p>
                      <p className="font-black text-[10px]">{k}</p>
                      <p className="text-[8px] opacity-80">{p.imagesMin} à {p.imagesMax} images</p>
                      <p className="text-[8px] opacity-80">{p.videos}</p>
                    </button>
                  );
                })}
              </div>

              <p className="font-black text-[10px] mt-3">Durée</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {normales.map((d: any) => (
                  <button key={d.id} type="button" onClick={() => setDureeId(d.id)} className={choix(offre.id === d.id) + (d.id === "30j" ? " ring-2 ring-green-400" : "")}>
                    <p className="font-black text-[12px]">{d.jours} j</p>
                    <p className="font-black text-[11px]">{usd(d.prixUSD)}</p>
                    <p className="text-[8px] opacity-70">{toCDFString(d.prixUSD)}</p>
                  </button>
                ))}
              </div>

              {courtes.length > 0 ? (
                <div className="mt-2">
                  <button type="button" onClick={() => setShowCourtes(!showCourtes)} className="text-[10px] underline font-bold">
                    {showCourtes ? "Masquer les durées courtes" : "Besoin de 1 ou 3 jours seulement ? Cliquez ici"}
                  </button>
                  {showCourtes ? (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {courtes.map((d: any) => (
                        <button key={d.id} type="button" onClick={() => setDureeId(d.id)} className={choix(offre.id === d.id)}>
                          <p className="font-black text-[12px]">{d.jours} j</p>
                          <p className="font-black text-[11px]">{usd(d.prixUSD)}</p>
                          {d.prixAffiche ? <p className="text-[7px] opacity-70">{usd(d.prixAffiche)}/jour, minimum 1 $</p> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 bg-green-50 border-2 border-green-200 rounded-xl p-3">
                <p className="font-black text-[11px]">{palier.badge} {palier.nom} - {offre.jours} jour{offre.jours > 1 ? "s" : ""}</p>
                <p className="text-[9px] mt-1">Jusqu'à {palier.imagesMax} images actives + {palier.videos}. Renouvelable et cumulable. Maximum {MAX_ANNONCES_ACTIVES} annonces actives.</p>
                <p className="text-[10px] mt-1 font-black">💰 {usd(offre.prixUSD)} / {toCDFString(offre.prixUSD)}</p>
              </div>

              <button type="button" onClick={handlePayPalier} disabled={paying} className="mt-4 w-full bg-black text-white py-4 rounded-full font-black text-[12px] disabled:opacity-50">
                {paying ? "Achat..." : "Acheter " + palierId + " " + offre.jours + " j - " + usd(offre.prixUSD) + " / " + toCDFString(offre.prixUSD)}
              </button>
              <p className="text-[8px] text-gray-500 text-center mt-2">Paiement par Mobile Money (Airtel, Orange, M-Pesa). Activation instantanée.</p>
            </div>

            <Comparatif />
          </>
        )}

        <div className="text-center space-y-2">
          <Link href="/" className="block text-[10px] text-gray-500">← Accueil</Link>
          {isOccasionnel ? (
            <Link href="/abonnement" className="block text-[10px] font-bold underline">Voir les abonnements boutique →</Link>
          ) : (
            <Link href="/abonnement?mode=occasionnel" className="block text-[10px] font-bold underline">Boost flash pour une vente occasionnelle →</Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PageAbonnement() {
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-[12px]">Chargement...</div>}>
      <AbonnementContent />
    </Suspense>
  );
        }
    
