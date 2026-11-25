"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

const ROLES_INVITATION_AUTORISES = new Set([
  "client",
  "boutique",
  "vendeur",
  "grossiste",
  "prestataire",
]);

function readJsonArray(key: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readConfigPublique(): Record<string, any> {
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

function tracerConsultationInvitation(code: string, valide: boolean, detail: string) {
  try {
    if (typeof window === "undefined") return;
    const arr = readJsonArray("wenze_journal");
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action: valide ? "INVITATION_LIEN_OUVERT" : "INVITATION_LIEN_REFUSE",
      codeInvitation: code,
      detail,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export default function PageInvitationPublique() {
  const params = useParams();
  const code = String((params as any)?.code || "")
    .trim()
    .toUpperCase();

  const [inv, setInv] = useState<{
    parrain_nom: string;
    parrain_type: "client" | "boutique" | "prestataire";
    parrain_wa: string;
    code: string;
  } | null>(null);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    if (!code) {
      setInv(null);
      setCharge(false);
      return;
    }

    const cfg = readConfigPublique();
    const codesBloques: string[] = Array.isArray(cfg?.codesInvitationBloques)
      ? cfg.codesInvitationBloques.map((c: any) => String(c || "").toUpperCase())
      : Array.isArray(cfg?.codesBloques)
      ? cfg.codesBloques.map((c: any) => String(c || "").toUpperCase())
      : [];

    if (codesBloques.includes(code) || cfg?.invitationsActives === false) {
      tracerConsultationInvitation(code, false, "Code bloqué ou invitations suspendues via config_publique");
      setInv(null);
      setCharge(false);
      return;
    }

    const allUsers = readJsonArray("wenze_all_users");
    const parrain = allUsers.find((u: any) => {
      const uCode = String(u?.myInviteCode || u?.inviteCode || "").toUpperCase();
      return uCode === code;
    });

    const invitations = readJsonArray("wenze_invitations");
    const invData = invitations.find((x: any) => {
      const iCode = String(
        x?.codeInvitation || x?.codeParrainage || x?.code || ""
      ).toUpperCase();
      return iCode === code;
    });

    const roleBrut = String(
      parrain?.role ||
        parrain?.user_type ||
        invData?.parrainType ||
        invData?.parrain_type ||
        ""
    )
      .toLowerCase()
      .trim();

    if (
      roleBrut === "ambassadeur" ||
      roleBrut === "superviseur" ||
      roleBrut === "dg" ||
      Boolean(parrain?.isAmbassadeur) ||
      Boolean(invData?.isAmbassadeur)
    ) {
      tracerConsultationInvitation(code, false, "Rôle non éligible aux invitations (ambassadeur/superviseur/dg)");
      setInv(null);
      setCharge(false);
      return;
    }

    if (!parrain && !invData) {
      tracerConsultationInvitation(code, false, "Code introuvable");
      setInv(null);
      setCharge(false);
      return;
    }

    const roleEffectif = ROLES_INVITATION_AUTORISES.has(roleBrut)
      ? roleBrut
      : "client";

    const categorieType: "client" | "boutique" | "prestataire" =
      roleEffectif === "prestataire"
        ? "prestataire"
        : roleEffectif === "client"
        ? "client"
        : "boutique";

    const nomParrain =
      parrain?.nomEtablissement ||
      parrain?.boutiqueName ||
      parrain?.nom ||
      parrain?.name ||
      invData?.parrainNom ||
      invData?.parrain_nom ||
      "Membre Wenze Wenze";

    const waParrain = String(
      parrain?.ownerWhatsapp ||
        parrain?.whatsapp ||
        invData?.parrainWa ||
        ""
    );

    tracerConsultationInvitation(code, true, `Parrain ${categorieType}`);
    setInv({
      parrain_nom: nomParrain,
      parrain_type: categorieType,
      parrain_wa: waParrain,
      code,
    });
    setCharge(false);
  }, [code]);

  if (charge) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-black text-white p-6 font-bold flex items-center justify-center">
        Vérification de l&apos;invitation...
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-center flex flex-col justify-center">
        <p className="text-[40px]">🔒</p>
        <h1 className="font-black text-[20px] mt-2">
          Lien d&apos;invitation indisponible
        </h1>
        <p className="text-[12px] text-gray-600 mt-2">
          Ce code est invalide, désactivé, ou n&apos;appartient pas à un
          compte client, boutique ou prestataire éligible.
        </p>
        <Link
          href="/"
          className="mt-6 bg-black text-white py-4 rounded-full font-black text-[12px] block"
        >
          Retour à l&apos;accueil Wenze Wenze
        </Link>
      </div>
    );
  }

  const label =
    inv.parrain_type === "boutique"
      ? "🏬 Boutique"
      : inv.parrain_type === "prestataire"
      ? "🔧 Prestataire"
      : "👤 Client";

  const typeInscription =
    inv.parrain_type === "boutique"
      ? "boutique"
      : inv.parrain_type === "prestataire"
      ? "prestataire"
      : "client";

  const queryParams = new URLSearchParams({
    code: inv.code,
    type: typeInscription,
    ...(inv.parrain_wa ? { parrain: inv.parrain_wa } : {}),
  }).toString();

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 flex flex-col justify-center">
      <div className="bg-white border-2 border-black rounded-3xl p-6 text-center">
        <p className="text-[40px]">🎁</p>
        <h1 className="font-black text-[20px] leading-tight mt-1">
          {label} {inv.parrain_nom}
          <br />
          vous invite sur Wenze Wenze
        </h1>
        <p className="text-[12px] text-gray-600 mt-2">
          Plateforme de commerce et services à Kinshasa • <b>0 % commission</b>
          <br />
          Taux : {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES} annonces actives
        </p>

        <div className="bg-[#FFFBF0] border rounded-2xl p-3 mt-4 text-[11px] text-gray-700">
          Freemium : <b>{MAX_FREE_IMAGES} images max / {FREE_DAYS} jours</b>{" "}
          puis <b>is_visible = false</b> • Minimum : <b>{usd(1)}</b> (
          {toCDFString(1)})
        </div>

        <div className="bg-gray-100 rounded-full py-2 px-4 mt-4 font-black text-[12px] inline-block">
          Code d&apos;invitation : {inv.code}
        </div>

        <Link
          href={`/inscription?${queryParams}`}
          className="mt-4 bg-black text-white py-4 rounded-full font-black text-[12px] block"
        >
          S&apos;inscrire avec cette invitation
        </Link>

        <Link
          href={`/auth?code=${encodeURIComponent(inv.code)}`}
          className="mt-2 border-2 border-black py-3 rounded-full font-black text-[12px] block"
        >
          J&apos;ai déjà un compte
        </Link>

        <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
          Invitations réservées aux clients, boutiques et prestataires • 0 %
          commission.
        </p>
      </div>
    </div>
  );
                                   }
