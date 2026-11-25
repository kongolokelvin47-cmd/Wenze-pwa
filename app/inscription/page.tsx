"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cle9 } from "@/lib/connexion";
import { COMMUNES_KINSHASA } from "@/lib/zones";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

const safeGet = (k: string) => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(k) : null;
  } catch {
    return null;
  }
};

const safeSet = (k: string, v: string) => {
  try {
    if (typeof window !== "undefined") localStorage.setItem(k, v);
  } catch {}
};

const readList = (k: string): any[] => {
  try {
    const raw = safeGet(k);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

function tracerInscriptionJournal(
  action: "INSCRIPTION_CREEE" | "INVITATION_VALIDEE",
  role: string,
  waDigits: string,
  detail?: string
) {
  try {
    const arr = readList("wenze_journal");
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      role,
      acteurWhatsapp: waDigits,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    safeSet("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

function InscriptionContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const inviteParam = sp.get("invite") || "";
  const parrainParam = sp.get("parrain") || "";
  const codeParam = sp.get("code") || "";
  const typeParamRaw = (sp.get("type") || "boutique").toLowerCase();
  const typeParam: "boutique" | "client" | "prestataire" =
    typeParamRaw === "client"
      ? "client"
      : typeParamRaw === "prestataire"
      ? "prestataire"
      : "boutique";

  const [typeCompte, setTypeCompte] = useState<
    "boutique" | "client" | "prestataire"
  >(typeParam);
  const [nom, setNom] = useState("");
  const [marque, setMarque] = useState("");
  const [whatsapp, setWhatsapp] = useState(inviteParam || "");
  const [commune, setCommune] = useState("Gombe");
  const [email, setEmail] = useState("");
  const [codeInvitation, setCodeInvitation] = useState(codeParam || "");
  const [toast, setToast] = useState("");
  const [erreur, setErreur] = useState("");
  const [parrainInfo, setParrainInfo] = useState<any>(null);

  useEffect(() => {
    const pWa = cle9(parrainParam);
    const cInv = codeParam.trim().toUpperCase();
    if (!pWa && !cInv) return;

    try {
      const all = readList("wenze_all_users");
      const parrain = all.find((u: any) => {
        const uRole = String(u?.role || u?.user_type || "").toLowerCase();
        if (uRole === "ambassadeur" || uRole === "superviseur" || uRole === "dg") {
          return false;
        }
        const uWa = cle9(u?.ownerWhatsapp || u?.whatsapp);
        return (
          (pWa && uWa === pWa) ||
          (cInv && String(u?.myInviteCode || "").toUpperCase() === cInv)
        );
      });

      if (parrain) {
        const nomP =
          parrain.nomEtablissement ||
          parrain.boutiqueName ||
          parrain.name ||
          `Membre ${cle9(parrain.ownerWhatsapp || parrain.whatsapp).slice(-4)}`;
        setParrainInfo({
          ...parrain,
          nomAffiche: nomP,
          wa: cle9(parrain.ownerWhatsapp || parrain.whatsapp),
        });
      } else if (pWa) {
        setParrainInfo({
          nomAffiche: `Membre ${pWa.slice(-4)}`,
          wa: pWa,
          code: cInv || pWa,
        });
      }
    } catch {}
  }, [parrainParam, codeParam]);

  const getBoutiqueIdentite = (n: string, m: string) => {
    const base = n.replace(/^Boutiques\s*/i, "").trim() || "Boutique";
    const marq = m.trim() || "Commerce général";
    return `Boutiques ${base} (${marq})`;
  };

  const handleCreate = () => {
    setErreur("");
    setToast("");

    const wa = cle9(whatsapp);
    if (wa.length < 9) {
      setErreur("Numéro WhatsApp invalide (ex. : 0825000000 ou 243825000000).");
      return;
    }
    if (!nom.trim()) {
      setErreur(
        typeCompte === "boutique"
          ? "Le nom de la boutique est obligatoire."
          : typeCompte === "prestataire"
          ? "Le nom du prestataire ou service est obligatoire."
          : "Le nom du client est obligatoire."
      );
      return;
    }

    const hasEmail = Boolean(email && email.includes("@"));
    const now = new Date().toISOString();
    const expireFreemiumAt = new Date(
      Date.now() + FREE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const roleFinal =
      typeCompte === "client"
        ? "client"
        : typeCompte === "prestataire"
        ? "prestataire"
        : "vendeur";

    const parrainWaClean = cle9(parrainParam || parrainInfo?.wa || "");
    const myInviteCode = `WENZE-${wa.slice(-4)}`;

    const newUser = {
      id: wa,
      ownerWhatsapp: wa,
      whatsapp: wa,
      telephone: wa,
      role: roleFinal,
      user_type: roleFinal,
      name: nom.trim(),
      nom: nom.trim(),
      nomBoutique: typeCompte === "boutique" ? nom.trim() : "",
      marque: typeCompte === "boutique" ? marque.trim() : "",
      nomEtablissement:
        typeCompte === "boutique"
          ? getBoutiqueIdentite(nom.trim(), marque.trim())
          : nom.trim(),
      boutiqueName:
        typeCompte === "boutique"
          ? getBoutiqueIdentite(nom.trim(), marque.trim())
          : "",
      commune,
      ville: "Kinshasa",
      email: hasEmail ? email.trim() : "",
      emailVerified: false,
      whatsappVerified: false,
      hasGmail: hasEmail,
      freemiumMaxImages: MAX_FREE_IMAGES,
      freemiumDureeJours: FREE_DAYS,
      freemiumExpireAt: expireFreemiumAt,
      maxAnnoncesActives: PLAFOND_ACTIVES,
      is_visible: true,
      commissionPct: 0,
      myInviteCode,
      parrainWa: parrainWaClean || null,
      codeInvitationUtilise: codeInvitation.trim().toUpperCase() || null,
      inviteWaOrigine: cle9(inviteParam) || null,
      createdAt: now,
      updatedAt: now,
    };

    safeSet("wenze_user", JSON.stringify(newUser));

    const all = readList("wenze_all_users");
    const idx = all.findIndex(
      (u: any) => cle9(u?.ownerWhatsapp || u?.whatsapp) === wa
    );
    if (idx >= 0) all[idx] = { ...all[idx], ...newUser };
    else all.push(newUser);
    safeSet("wenze_all_users", JSON.stringify(all.slice(0, 500)));

    tracerInscriptionJournal(
      "INSCRIPTION_CREEE",
      roleFinal,
      wa,
      `${newUser.nomEtablissement} (${commune})`
    );

    if (parrainWaClean) {
      const invList = readList("wenze_invitations");
      const invIdx = invList.findIndex(
        (i: any) =>
          cle9(i?.parrainWa) === parrainWaClean && cle9(i?.inviteWa) === wa
      );
      if (invIdx >= 0) {
        invList[invIdx] = {
          ...invList[invIdx],
          status: "validé",
          dateValidation: now,
          inviteNom: newUser.nomEtablissement || newUser.name,
        };
      } else {
        invList.push({
          id: "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          parrainWa: parrainWaClean,
          parrainNom:
            parrainInfo?.nomAffiche || `Membre ${parrainWaClean.slice(-4)}`,
          parrainType: parrainInfo?.role || "client",
          codeInvitation:
            codeInvitation.trim().toUpperCase() || parrainWaClean,
          inviteWa: wa,
          inviteNom: newUser.nomEtablissement || newUser.name,
          typeCompteInvite: typeCompte,
          status: "validé",
          date: now,
          dateValidation: now,
        });
      }
      safeSet("wenze_invitations", JSON.stringify(invList.slice(-500)));
      tracerInscriptionJournal(
        "INVITATION_VALIDEE",
        roleFinal,
        wa,
        `Parrain ${parrainWaClean}`
      );
    }

    setToast(
      `Compte créé • ${MAX_FREE_IMAGES} images max / ${FREE_DAYS} jours puis is_visible = false • 0 % commission.`
    );

    const dest =
      typeCompte === "boutique"
        ? "/boutiques"
        : typeCompte === "prestataire"
        ? "/publier-service"
        : "/";
    setTimeout(() => router.push(dest), 1200);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link
          href="/"
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[15px] truncate">
            Inscription WENZE WENZE • Kinshasa
          </h1>
          <p className="text-[10px] text-gray-500 truncate">
            0 % commission • Taux {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES}{" "}
            annonces actives
          </p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {toast ? (
          <div className="bg-black text-white p-3 rounded-xl text-[11px] font-bold text-center">
            {toast}
          </div>
        ) : null}

        {erreur ? (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-[12px] font-bold"
          >
            {erreur}
          </div>
        ) : null}

        {parrainParam || codeParam ? (
          <div className="bg-black text-white rounded-2xl p-4">
            <p className="font-black text-[12px]">Invitation reçue</p>
            <p className="text-[10px] text-white/80 mt-1">
              Invitation par{" "}
              <b>{parrainInfo?.nomAffiche || parrainParam || codeParam}</b>{" "}
              (réservée aux clients, boutiques et prestataires).
              <br />
              Code : <b>{codeParam || parrainParam}</b> • 0 % commission.
            </p>
          </div>
        ) : null}

        <div className="bg-[#FFF2CC] border-2 border-black rounded-2xl p-4">
          <p className="font-black text-[11px]">
            Règles d&apos;accès &amp; freemium
          </p>
          <p className="text-[10px] mt-1">
            Offre gratuite : <b>{MAX_FREE_IMAGES} images max</b> pendant{" "}
            <b>{FREE_DAYS} jours</b>, puis masquage automatique (
            <b>is_visible = false</b>). Tarif minimum : <b>{usd(1)}</b> (
            {toCDFString(1)}).
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[12px]">Type de compte</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {(
              [
                { id: "boutique", label: "Boutique" },
                { id: "client", label: "Client" },
                { id: "prestataire", label: "Prestataire" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeCompte(t.id)}
                className={`py-2.5 px-2 rounded-full text-[11px] font-black border-2 ${
                  typeCompte === t.id
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-gray-500 mt-2">
            Les invitations réseau sont réservées exclusivement aux clients,
            boutiques et prestataires.
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <p className="font-black text-[12px]">Coordonnées</p>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Numéro WhatsApp (obligatoire) Ex. : 0825000000"
            inputMode="tel"
            className="w-full p-3 rounded-xl border text-[13px] font-bold"
          />
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder={
              typeCompte === "boutique"
                ? "Nom de la boutique Ex. : Bilamba"
                : typeCompte === "prestataire"
                ? "Nom du prestataire / service"
                : "Votre nom"
            }
            className="w-full p-3 rounded-xl border text-[13px]"
          />
          {typeCompte === "boutique" ? (
            <input
              value={marque}
              onChange={(e) => setMarque(e.target.value)}
              placeholder="Marque / spécialité Ex. : Maison d'habillement"
              className="w-full p-3 rounded-xl border text-[13px]"
            />
          ) : null}

          <select
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            className="w-full p-3 rounded-xl border text-[13px] bg-white"
          >
            {COMMUNES_KINSHASA.map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse e-mail / Gmail (facultatif)"
            type="email"
            className="w-full p-3 rounded-xl border text-[12px]"
          />
        </div>

        <div className="bg-white border-2 border-dashed rounded-2xl p-4">
          <label
            htmlFor="inv-code-input"
            className="font-black text-[11px] block"
          >
            Code d&apos;invitation (facultatif)
          </label>
          <input
            id="inv-code-input"
            value={codeInvitation}
            onChange={(e) => setCodeInvitation(e.target.value.toUpperCase())}
            placeholder="WENZE-XXXX (client, boutique ou prestataire)"
            className="w-full mt-2 p-3 rounded-xl border text-[11px] uppercase font-bold"
          />
          {parrainInfo ? (
            <p className="text-[10px] font-bold mt-2 text-emerald-700">
              Invitation associée à : {parrainInfo.nomAffiche} • 0 % commission
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="w-full bg-black text-white py-4 rounded-full font-black text-[13px]"
        >
          Créer mon compte • {usd(0)} ({toCDFString(0)})
        </button>

        <p className="text-[9px] text-center text-gray-500">
          0 % commission • {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours puis
          is_visible = false • Max {PLAFOND_ACTIVES} annonces actives • Taux{" "}
          {TAUX_CDF} CDF/$
        </p>
      </div>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[430px] mx-auto p-6">
          Chargement de l&apos;inscription...
        </div>
      }
    >
      <InscriptionContent />
    </Suspense>
  );
}
      
