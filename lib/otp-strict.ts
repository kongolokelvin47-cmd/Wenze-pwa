import { supabase } from "@/lib/supabase";
import { ajouterEmailDansFile } from "@/lib/email-queue";

export const OTP_MAX_ENVOIS = 3;
export const OTP_DUREE_VALIDITE_MS = 2 * 60 * 1000; // 2 minutes (120 secondes)
export const OTP_MAX_ESSAIS_SAISIE = 3;
export const OTP_DUREE_BLOCAGE_MS = 15 * 60 * 1000; // 15 minutes

export interface EtatCycleOtp {
  identifiant: string;
  codeHash: string;
  envoiCount: number; // 1 à 3
  attempts: number; // 0 à 3
  expiresAt: number; // timestamp ms (+2 min)
  blockedUntil: number | null; // timestamp ms (+15 min)
  notifiedBlock: boolean;
}

const STORAGE_PREFIX = "wenze_otp_cycle_";

async function sha256(texte: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const buf = await window.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(texte)
      );
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {}
  return texte;
}

function lireCycle(identifiant: string): EtatCycleOtp | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_PREFIX + identifiant);
    if (!raw) return null;
    const data = JSON.parse(raw) as EtatCycleOtp;
    if (data.blockedUntil && Date.now() >= data.blockedUntil) {
      localStorage.removeItem(STORAGE_PREFIX + identifiant);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function sauverCycle(cycle: EtatCycleOtp) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_PREFIX + cycle.identifiant, JSON.stringify(cycle));
  } catch {}
}

export function effacerCycleOtp(identifiant: string) {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_PREFIX + identifiant);
  } catch {}
}

async function notifierTropDeTentatives(identifiant: string, motif: string) {
  const messageNotif =
    "Trop de tentatives : vous avez consommé vos 3 codes OTP (validité 2 minutes chacun). Veuillez patienter 15 minutes avant de réessayer.";

  // 1. Journal d'audit Wenze
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("wenze_journal");
      const list = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(list) ? list : [];
      arr.push({
        id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        action: "OTP_TROP_DE_TENTATIVES",
        identifiant,
        detail: motif,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
    }
  } catch {}

  // 2. Notification dans Supabase (notifications_perso)
  if (supabase) {
    try {
      await supabase.from("notifications_perso").insert({
        id: "notif-otp-" + Date.now(),
        type_compte: "TOUS",
        titre: "Sécurité OTP : Trop de tentatives",
        message: `${identifiant} — ${messageNotif}`,
        type: "ALERTE_SECURITE",
        lu: false,
      });
    } catch {}
  }

  // 3. Si l'identifiant est un Gmail, mise en file email_queue (jamais d'envoi direct)
  if (identifiant.includes("@")) {
    await ajouterEmailDansFile({
      toEmail: identifiant,
      subject: "Alerte sécurité Wenze Wenze : Trop de tentatives OTP",
      html: `<p>Bonjour,</p><p>${messageNotif}</p><p>Motif : ${motif}</p>`,
      type: "OTP",
    });
  }

  return messageNotif;
}

/**
 * Demande ou renvoie un code OTP (3 reprises maximum, 2 minutes chacune).
 */
export async function demanderOuRenvoyerOtp(identifiantRaw: string): Promise<{
  ok: boolean;
  message: string;
  envoiNumero?: number;
  restants?: number;
  expiresAt?: number;
  bloque?: boolean;
}> {
  const identifiant = String(identifiantRaw || "").trim().toLowerCase();
  if (!identifiant) {
    return { ok: false, message: "Identifiant invalide." };
  }

  const existant = lireCycle(identifiant);

  // Vérification si déjà bloqué
  if (existant?.blockedUntil && Date.now() < existant.blockedUntil) {
    const minutes = Math.ceil((existant.blockedUntil - Date.now()) / 60000);
    return {
      ok: false,
      bloque: true,
      message: `Trop de tentatives. Votre accès OTP est bloqué. Veuillez réessayer dans ${minutes} minute(s).`,
    };
  }

  // Vérification si les 3 envois autorisés ont déjà été consommés
  const envoiSuivant = existant ? existant.envoiCount + 1 : 1;
  if (envoiSuivant > OTP_MAX_ENVOIS) {
    const blockedUntil = Date.now() + OTP_DUREE_BLOCAGE_MS;
    sauverCycle({
      identifiant,
      codeHash: "",
      envoiCount: OTP_MAX_ENVOIS,
      attempts: OTP_MAX_ESSAIS_SAISIE,
      expiresAt: 0,
      blockedUntil,
      notifiedBlock: true,
    });
    const msg = await notifierTropDeTentatives(
      identifiant,
      "3_envois_otp_consommes"
    );
    return { ok: false, bloque: true, message: msg };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await sha256(`${identifiant}:${code}`);
  const expiresAt = Date.now() + OTP_DUREE_VALIDITE_MS;

  const nouveauCycle: EtatCycleOtp = {
    identifiant,
    codeHash,
    envoiCount: envoiSuivant,
    attempts: 0,
    expiresAt,
    blockedUntil: null,
    notifiedBlock: false,
  };
  sauverCycle(nouveauCycle);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `🔐 OTP WENZE (${envoiSuivant}/${OTP_MAX_ENVOIS}, valide 2 min) pour ${identifiant} :`,
      code
    );
  }

  if (identifiant.includes("@")) {
    await ajouterEmailDansFile({
      toEmail: identifiant,
      subject: `Votre code Wenze Wenze (${envoiSuivant}/${OTP_MAX_ENVOIS})`,
      html: `<p>Votre code de vérification est <b>${code}</b>.</p><p>Ce code est valide pendant <b>2 minutes</b> (tentative ${envoiSuivant} sur ${OTP_MAX_ENVOIS}).</p>`,
      type: "OTP",
    });
  }

  const restants = OTP_MAX_ENVOIS - envoiSuivant;
  return {
    ok: true,
    envoiNumero: envoiSuivant,
    restants,
    expiresAt,
    message: `Code OTP envoyé (${envoiSuivant}/${OTP_MAX_ENVOIS}). Valide pendant 2 minutes.${
      restants === 0
        ? " Attention : c'est votre dernier envoi autorisé."
        : ` Il vous reste ${restants} renvoi(s) possible(s).`
    }`,
  };
}

/**
 * Vérifie le code OTP saisi (validité stricte 2 minutes + max 3 essais).
 */
export async function verifierCodeOtpStrict(
  identifiantRaw: string,
  codeSaisi: string
): Promise<{
  ok: boolean;
  message: string;
  expire?: boolean;
  bloque?: boolean;
  peutRenvoyer?: boolean;
}> {
  const identifiant = String(identifiantRaw || "").trim().toLowerCase();
  const cycle = lireCycle(identifiant);

  if (!cycle) {
    return {
      ok: false,
      expire: true,
      peutRenvoyer: true,
      message: "Aucun code actif. Demandez un code OTP.",
    };
  }

  if (cycle.blockedUntil && Date.now() < cycle.blockedUntil) {
    const minutes = Math.ceil((cycle.blockedUntil - Date.now()) / 60000);
    return {
      ok: false,
      bloque: true,
      peutRenvoyer: false,
      message: `Trop de tentatives. Veuillez réessayer dans ${minutes} minute(s).`,
    };
  }

  // 1. Contrôle strict de la fenêtre des 2 minutes (120 000 ms)
  if (Date.now() > cycle.expiresAt) {
    const peutRenvoyer = cycle.envoiCount < OTP_MAX_ENVOIS;
    if (!peutRenvoyer) {
      const blockedUntil = Date.now() + OTP_DUREE_BLOCAGE_MS;
      sauverCycle({
        ...cycle,
        blockedUntil,
        notifiedBlock: true,
      });
      const msg = await notifierTropDeTentatives(
        identifiant,
        "expiration_du_3eme_code_otp"
      );
      return {
        ok: false,
        expire: true,
        bloque: true,
        peutRenvoyer: false,
        message: msg,
      };
    }

    return {
      ok: false,
      expire: true,
      peutRenvoyer: true,
      message: `Code expiré (validité 2 minutes dépassée). Vous avez utilisé ${cycle.envoiCount}/${OTP_MAX_ENVOIS} envoi(s). Cliquez sur « Renvoyer le code ».`,
    };
  }

  // 2. Contrôle du hash du code saisi
  const hashSaisi = await sha256(`${identifiant}:${codeSaisi.trim()}`);
  if (hashSaisi !== cycle.codeHash) {
    const nextAttempts = cycle.attempts + 1;

    if (nextAttempts >= OTP_MAX_ESSAIS_SAISIE) {
      const blockedUntil = Date.now() + OTP_DUREE_BLOCAGE_MS;
      sauverCycle({
        ...cycle,
        attempts: nextAttempts,
        blockedUntil,
        notifiedBlock: true,
      });
      const msg = await notifierTropDeTentatives(
        identifiant,
        "3_erreurs_de_saisie_otp"
      );
      return {
        ok: false,
        bloque: true,
        peutRenvoyer: false,
        message: msg,
      };
    }

    sauverCycle({ ...cycle, attempts: nextAttempts });
    return {
      ok: false,
      peutRenvoyer: cycle.envoiCount < OTP_MAX_ENVOIS,
      message: `Code incorrect. Il vous reste ${
        OTP_MAX_ESSAIS_SAISIE - nextAttempts
      } essai(s) sur ce code (envoi ${cycle.envoiCount}/${OTP_MAX_ENVOIS}).`,
    };
  }

  // 3. Succès : nettoyage du cycle OTP
  effacerCycleOtp(identifiant);
  return {
    ok: true,
    message: "Code OTP validé avec succès.",
  };
}
