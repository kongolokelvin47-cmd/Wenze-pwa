"use client";

import { useState, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cle9 } from "@/lib/connexion";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
} from "@/lib/paiement-base";

export const dynamic = "force-dynamic";

const DUREE_BLOCAGE_MS = 15 * 60 * 1000;
const DUREE_OTP_MS = 120 * 1000;
const DUREE_CONFIANCE_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_ESSAIS_OTP = 3;

function normaliserIdentifiant(val: string): {
  type: "email" | "tel" | "invalide";
  cle: string;
  affichage: string;
} {
  const brut = String(val || "").trim();
  if (!brut) return { type: "invalide", cle: "", affichage: "" };
  if (brut.includes("@")) {
    const email = brut.toLowerCase();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return ok
      ? { type: "email", cle: email, affichage: email }
      : { type: "invalide", cle: "", affichage: brut };
  }
  const tel = cle9(brut);
  return tel.length >= 9
    ? { type: "tel", cle: tel, affichage: `0${tel.slice(-9)}` }
    : { type: "invalide", cle: "", affichage: brut };
}

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("wenze_device_id");
  if (!id) {
    id =
      "DEV-" +
      Math.random().toString(36).slice(2, 10).toUpperCase() +
      "-" +
      Date.now().toString().slice(-4);
    localStorage.setItem("wenze_device_id", id);
  }
  return id;
}

async function hashOtp(code: string, identifiant: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const data = new TextEncoder().encode(`${identifiant}:${code}`);
      const buf = await window.crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {}
  return `${identifiant}:${code}`;
}

function journaliserConnexion(
  action:
    | "CONNEXION_OTP_DEMANDE"
    | "CONNEXION_OTP_ECHEC"
    | "CONNEXION_BLOQUE_15M"
    | "CONNEXION_OK"
    | "CONNEXION_APPAREIL_CONFIANCE"
    | "CONNEXION_ROBOT_HONEYPOT",
  identifiant: string,
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
      identifiant,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

function verifierBlocageActif(cle: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem("wenze_blocked_" + cle);
  if (!raw) return 0;
  const until = Number(raw);
  if (!Number.isFinite(until) || Date.now() >= until) {
    localStorage.removeItem("wenze_blocked_" + cle);
    return 0;
  }
  return Math.ceil((until - Date.now()) / 60000);
}

function trouverUtilisateur(
  identifiant: ReturnType<typeof normaliserIdentifiant>
): any | null {
  if (typeof window === "undefined") return null;
  const all = JSON.parse(localStorage.getItem("wenze_all_users") || "[]");
  if (!Array.isArray(all)) return null;
  return (
    all.find((u: any) => {
      if (identifiant.type === "email") {
        return String(u?.email || "").trim().toLowerCase() === identifiant.cle;
      }
      if (identifiant.type === "tel") {
        return (
          cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "") ===
          identifiant.cle
        );
      }
      return false;
    }) || null
  );
}

function ConnexionContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/profil";

  const [identifiantInput, setIdentifiantInput] = useState("");
  const [otp, setOtp] = useState("");
  const [etape, setEtape] = useState<"saisie" | "otp">("saisie");
  const [cibleAffichage, setCibleAffichage] = useState("");
  const [toast, setToast] = useState("");
  const [chargement, setChargement] = useState(false);
  const [essais, setEssais] = useState(0);
  const [tempsRestant, setTempsRestant] = useState(120);

  const honeypotRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  const plafondActives = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
  const maxFreeImages = Math.min(3, Number(FREEMIUM?.maxImages || 3));
  const freeDays = Number(FREEMIUM?.dureeJours || 30);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const startTimer = () => {
    setTempsRestant(120);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTempsRestant((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          localStorage.removeItem("wenze_otp_temp");
          showToast("Code expiré. Redemande un nouveau code.");
          setEtape("saisie");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleDemandeConnexion = async () => {
    const idNorm = normaliserIdentifiant(identifiantInput);
    if (idNorm.type === "invalide") {
      showToast("Entre un numéro valide (ex: 0825000000) ou un Gmail valide.");
      return;
    }

    if (honeypotRef.current?.value) {
      journaliserConnexion("CONNEXION_ROBOT_HONEYPOT", idNorm.cle, getDeviceId());
      showToast("Si ce compte existe, un code d'authentification a été envoyé.");
      return;
    }

    const minutesBlocage = verifierBlocageActif(idNorm.cle);
    if (minutesBlocage > 0) {
      showToast(`Trop d'essais. Réessaie dans ${minutesBlocage} min.`);
      return;
    }

    const found = trouverUtilisateur(idNorm);
    const roleMembre = String(found?.role || "").toUpperCase();
    const estEquipe =
      roleMembre === "DG" ||
      roleMembre === "SUPERVISEUR" ||
      roleMembre === "AMBASSADEUR";

    if (found && estEquipe) {
      showToast("Espace équipe isolé. Redirection...");
      setTimeout(() => router.push("/dg-prive"), 700);
      return;
    }

    const deviceId = getDeviceId();
    const trusted = JSON.parse(
      localStorage.getItem("wenze_trusted_devices") || "{}"
    );
    const devEntry = trusted?.[idNorm.cle];

    if (
      found &&
      devEntry &&
      typeof devEntry === "object" &&
      devEntry.deviceId === deviceId &&
      Number(devEntry.expiresAt || 0) > Date.now()
    ) {
      localStorage.setItem("wenze_user", JSON.stringify(found));
      journaliserConnexion("CONNEXION_APPAREIL_CONFIANCE", idNorm.cle, deviceId);
      showToast(
        `Bienvenue ${found.nomEtablissement || found.nom || ""}`.trim()
      );
      setTimeout(() => router.push(next), 600);
      return;
    }

    setChargement(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await hashOtp(code, idNorm.cle);

      localStorage.setItem(
        "wenze_otp_temp",
        JSON.stringify({
          cle: idNorm.cle,
          type: idNorm.type,
          codeHash,
          expires: Date.now() + DUREE_OTP_MS,
          used: false,
        })
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("🔐 CODE CONNEXION WENZE pour", idNorm.cle, ":", code);
      }

      journaliserConnexion("CONNEXION_OTP_DEMANDE", idNorm.cle, idNorm.type);
      setCibleAffichage(idNorm.affichage);
      setEssais(0);
      setOtp("");
      setEtape("otp");
      startTimer();
      showToast(
        `Code d'authentification envoyé vers ${idNorm.affichage}.`
      );
    } finally {
      setChargement(false);
    }
  };

  const handleVerifConnexion = async () => {
    const stored = JSON.parse(localStorage.getItem("wenze_otp_temp") || "{}");
    if (!stored.codeHash || stored.used || Date.now() > Number(stored.expires || 0)) {
      localStorage.removeItem("wenze_otp_temp");
      showToast("Code expiré. Redemande un nouveau code.");
      setEtape("saisie");
      return;
    }

    const minutesBlocage = verifierBlocageActif(stored.cle);
    if (minutesBlocage > 0) {
      showToast(`Accès bloqué (${minutesBlocage} min restantes).`);
      return;
    }

    const saisieHash = await hashOtp(otp.trim(), stored.cle);
    if (saisieHash !== stored.codeHash) {
      const nextEssais = essais + 1;
      setEssais(nextEssais);
      journaliserConnexion(
        "CONNEXION_OTP_ECHEC",
        stored.cle,
        `essai:${nextEssais}/${MAX_ESSAIS_OTP}`
      );

      if (nextEssais >= MAX_ESSAIS_OTP) {
        localStorage.removeItem("wenze_otp_temp");
        localStorage.setItem(
          "wenze_blocked_" + stored.cle,
          String(Date.now() + DUREE_BLOCAGE_MS)
        );
        journaliserConnexion("CONNEXION_BLOQUE_15M", stored.cle, "3_echecs");
        showToast("Trop d'essais. Bloqué 15 minutes.");
        setEtape("saisie");
        return;
      }

      showToast(
        `Code incorrect. Il te reste ${MAX_ESSAIS_OTP - nextEssais} essai(s).`
      );
      return;
    }

    localStorage.setItem(
      "wenze_otp_temp",
      JSON.stringify({ ...stored, used: true })
    );
    if (timerRef.current) clearInterval(timerRef.current);

    const idNorm = normaliserIdentifiant(stored.cle);
    const found = trouverUtilisateur(idNorm);

    if (!found) {
      localStorage.removeItem("wenze_otp_temp");
      showToast("Aucun compte trouvé. Crée ton compte en quelques secondes.");
      setTimeout(() => {
        const param =
          idNorm.type === "tel"
            ? `?tel=${encodeURIComponent(idNorm.cle)}`
            : `?email=${encodeURIComponent(idNorm.cle)}`;
        router.push(`/inscription${param}`);
      }, 800);
      return;
    }

    const roleMembre = String(found.role || "").toUpperCase();
    if (
      roleMembre === "DG" ||
      roleMembre === "SUPERVISEUR" ||
      roleMembre === "AMBASSADEUR"
    ) {
      showToast("Espace équipe isolé. Redirection...");
      setTimeout(() => router.push("/dg-prive"), 700);
      return;
    }

    const deviceId = getDeviceId();
    const trusted = JSON.parse(
      localStorage.getItem("wenze_trusted_devices") || "{}"
    );
    trusted[stored.cle] = {
      deviceId,
      expiresAt: Date.now() + DUREE_CONFIANCE_MS,
    };
    localStorage.setItem("wenze_trusted_devices", JSON.stringify(trusted));

    localStorage.setItem("wenze_user", JSON.stringify(found));
    localStorage.removeItem("wenze_otp_temp");
    journaliserConnexion("CONNEXION_OK", stored.cle, `role:${roleMembre}`);

    showToast(
      `Bienvenue ${found.nomEtablissement || found.nom || ""}`.trim()
    );
    setTimeout(() => router.push(next), 600);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-4 pb-24 flex flex-col justify-between">
      {toast && (
        <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center fixed top-4 left-4 right-4 z-50 max-w-[400px] mx-auto shadow-lg">
          {toast}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between text-xs mb-3">
          <Link href="/" className="font-bold text-[#6C3CE0]">
            ← Accueil
          </Link>
          <span className="text-[11px] font-semibold text-gray-600">
            {usd(1)} = {toCDFString(1)} • Taux {TAUX_CDF}
          </span>
        </div>

        {/* GRANDE TABLE ÉCRAN D'ACCUEIL */}
        <section className="rounded-[28px] bg-black text-white p-6 shadow-md">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-300">
            Wenze Wenze • Kinshasa RDC
          </span>
          <h1 className="mt-4 text-[24px] font-black leading-tight">
            Bienvenue chez Wenze Wenze Business
          </h1>
          <p className="mt-2 text-xs text-white/80 leading-relaxed">
            La plateforme commerciale de Kinshasa • 0 % commission sur vos
            ventes • Visibilité freemium ({maxFreeImages} images max /{" "}
            {freeDays}j) • Max {plafondActives} annonces actives.
          </p>
        </section>

        {/* BLOC CONNEXION */}
        <section className="mt-5 rounded-[24px] border border-gray-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-black text-black">Connexion</h2>
            <span className="text-[10px] font-bold uppercase text-gray-400">
              Sans mot de passe
            </span>
          </div>

          {etape === "saisie" ? (
            <>
              <p className="text-[11px] text-gray-500">
                Entre ton <b>numéro de téléphone</b> ou ton <b>adresse Gmail</b>{" "}
                pour recevoir ton code d&apos;authentification.
              </p>

              <input
                ref={honeypotRef}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                style={{
                  position: "absolute",
                  left: "-9999px",
                  opacity: 0,
                  height: 0,
                }}
              />

              <input
                type="text"
                value={identifiantInput}
                onChange={(e) => setIdentifiantInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDemandeConnexion()}
                placeholder="Numéro (ex: 0825000000) ou Gmail"
                className="w-full rounded-2xl border-2 border-black bg-[#FAFAFA] px-4 py-3.5 text-sm font-bold text-black outline-none"
              />

              <button
                type="button"
                onClick={handleDemandeConnexion}
                disabled={chargement}
                className="w-full rounded-full bg-black py-3.5 text-[13px] font-black text-white disabled:opacity-50"
              >
                {chargement
                  ? "Envoi du code..."
                  : "Recevoir mon code et me connecter"}
              </button>
            </>
          ) : (
            <>
              <p className="text-[11px] text-gray-600">
                Code d&apos;authentification envoyé à <b>{cibleAffichage}</b>.
                Expire dans{" "}
                <b className="text-red-600">
                  {Math.floor(tempsRestant / 60)}:
                  {(tempsRestant % 60).toString().padStart(2, "0")}
                </b>
              </p>

              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                }
                onKeyDown={(e) => e.key === "Enter" && handleVerifConnexion()}
                placeholder="Code à 6 chiffres"
                className="w-full rounded-2xl border-2 border-black bg-[#FAFAFA] py-3.5 text-center text-[20px] font-black tracking-[8px] text-black outline-none"
              />

              <button
                type="button"
                onClick={handleVerifConnexion}
                className="w-full rounded-full bg-black py-3.5 text-[13px] font-black text-white"
              >
                Valider et se connecter
              </button>

              <button
                type="button"
                onClick={() => setEtape("saisie")}
                className="w-full text-[11px] text-gray-500 underline"
              >
                Modifier le numéro ou Gmail
              </button>
            </>
          )}
        </section>

        {/* ESPACE / BOUTON S'INSCRIRE EN DESSOUS */}
        <section className="mt-4 rounded-[24px] border border-gray-200 bg-white p-4 text-center space-y-2.5">
          <p className="text-[12px] font-bold text-gray-700">
            Nouveau sur Wenze Wenze Business ?
          </p>
          <Link
            href="/inscription"
            className="block w-full rounded-full border-2 border-black bg-[#FF6B00] py-3.5 text-[13px] font-black text-white shadow-xs"
          >
            S&apos;inscrire
          </Link>
          <p className="text-[10px] text-gray-400">
            Client, Boutique, Grossiste ou Prestataire • Invitations réservées
            aux clients, boutiques et prestataires.
          </p>
        </section>
      </div>

      <footer className="mt-6 text-center">
        <Link
          href="/dg-prive"
          className="text-[11px] text-gray-400 underline"
        >
          Accès réservé équipe WENZE (DG / Superviseur / Ambassadeur)
        </Link>
      </footer>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense
      fallback={<div className="max-w-[430px] mx-auto p-6">Chargement...</div>}
    >
      <ConnexionContent />
    </Suspense>
  );
 }
        
