import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Garde anti-spam en mémoire (complétée par le cookie signé)
let dernierEnvoiOtpMs = 0;
const COOLDOWN_OTP_MS = 30_000; // 30 secondes anti-spam Telegram 429

const timingSafeEqualStr = (a: string, b: string) => {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function extraireInfosConnexion(req: Request) {
  const countryCode = (
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "CD"
  ).toUpperCase();

  let paysNom = countryCode;
  try {
    const regionNames = new Intl.DisplayNames(["fr"], { type: "region" });
    paysNom = regionNames.of(countryCode) || countryCode;
  } catch {}

  const drapeau =
    countryCode.length === 2
      ? String.fromCodePoint(
          ...[...countryCode].map((c) => 127397 + c.charCodeAt(0))
        )
      : "🌍";

  const villeRaw = req.headers.get("x-vercel-ip-city") || "";
  let ville = villeRaw;
  try {
    ville = decodeURIComponent(villeRaw);
  } catch {}

  const ip =
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "IP inconnue";

  const ua = (req.headers.get("user-agent") || "Navigateur inconnu").slice(0, 90);

  return {
    countryCode,
    paysAffichage: `${drapeau} ${paysNom} (${countryCode})`,
    ville: ville || "Ville non précisée",
    ip,
    ua,
  };
}

async function verifierVerrouBlocage(): Promise<{
  bloque: boolean;
  resteMin: number;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) return { bloque: false, resteMin: 0 };

  const { data } = await admin
    .from("config_publique")
    .select("tarifs_json")
    .eq("id", 1)
    .maybeSingle();

  const lockUntil = Number(data?.tarifs_json?.dg_lock_until || 0);
  if (lockUntil > Date.now()) {
    return {
      bloque: true,
      resteMin: Math.ceil((lockUntil - Date.now()) / 60000),
    };
  }
  return { bloque: false, resteMin: 0 };
}

async function appliquerVerrouBlocage(minutes: number) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { data } = await admin
    .from("config_publique")
    .select("tarifs_json")
    .eq("id", 1)
    .maybeSingle();

  const tarifsActuels =
    data?.tarifs_json && typeof data.tarifs_json === "object"
      ? data.tarifs_json
      : {};

  await admin.from("config_publique").upsert({
    id: 1,
    tarifs_json: {
      ...tarifsActuels,
      dg_lock_until: minutes > 0 ? Date.now() + minutes * 60_000 : 0,
    },
  });
}

async function envoyerMessageTelegram(
  texte: string,
  replyMarkup?: Record<string, unknown>
) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID || "").trim();

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: texte,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Erreur Telegram (${res.status}): ${errText}`);
  }
}

// ===== GET : ACTION DIRECTE DEPUIS LES BOUTONS TELEGRAM (CONFIRMER / BLOQUER) =====
export async function GET(req: Request) {
  const url = new URL(req.url);
  const decision = url.searchParams.get("decision"); // "ALLOW" | "BLOCK" | "UNLOCK"
  const ts = url.searchParams.get("ts") || "";
  const sig = url.searchParams.get("sig") || "";

  const secret =
    process.env.DG_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.DG_PIN ||
    "wenze-telegram-secret";

  if (!decision || !ts || !sig) {
    return new NextResponse("Lien de sécurité incomplet.", { status: 400 });
  }

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${decision}:${ts}`)
    .digest("hex")
    .slice(0, 24);

  if (!timingSafeEqualStr(sig, expectedSig)) {
    return new NextResponse("Signature de sécurité invalide.", { status: 403 });
  }

  if (Date.now() - Number(ts) > 15 * 60_000) {
    return new NextResponse("Ce lien d'action a expiré.", { status: 410 });
  }

  if (decision === "BLOCK") {
    await appliquerVerrouBlocage(60);
    await envoyerMessageTelegram(
      "🚨 <b>BUREAU DG BLOQUÉ (60 min)</b>\n\nToutes les tentatives de connexion au Bureau DG sont verrouillées immédiatement."
    );
    return new NextResponse(
      "<html><body style='font-family:sans-serif;background:#111;color:#fff;padding:32px;text-align:center'><h2>🚫 Accès DG Bloqué pendant 60 minutes</h2><p>Toute tentative de connexion a été verrouillée.</p></body></html>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (decision === "UNLOCK" || decision === "ALLOW") {
    await appliquerVerrouBlocage(0);
    await envoyerMessageTelegram(
      "✅ <b>Connexion DG confirmée par le titulaire</b>\n\nTu peux valider ton code OTP sur l'écran WENZE DG Privé."
    );
    return new NextResponse(
      "<html><body style='font-family:sans-serif;background:#111;color:#fff;padding:32px;text-align:center'><h2>✅ Identité DG Confirmée</h2><p>Tu peux finaliser ta connexion sur WENZE DG Privé.</p></body></html>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  return new NextResponse("Action inconnue.", { status: 400 });
}

// ===== POST : SEND_OTP | VERIFY_OTP | ALERT =====
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const action = body?.action; // "SEND_OTP" | "VERIFY_OTP" | "ALERT"
    const secret =
      process.env.DG_SESSION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.DG_PIN ||
      "wenze-telegram-secret";

    // Vérifier si le DG a déclenché un blocage d'urgence
    if (action === "SEND_OTP" || action === "VERIFY_OTP") {
      const etatVerrou = await verifierVerrouBlocage();
      if (etatVerrou.bloque) {
        return NextResponse.json(
          {
            ok: false,
            error: `Accès DG verrouillé par sécurité (${etatVerrou.resteMin} min restantes). Débloque via le lien Telegram.`,
          },
          { status: 423 }
        );
      }
    }

    // 1. Envoi d'un code OTP avec anti-spam + Pays + Boutons Confirmer/Bloquer
    if (action === "SEND_OTP") {
      const maintenant = Date.now();
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)wenze_dg_otp=([^;]+)/);

      // Anti-spam cookie (30s)
      if (match?.[1]) {
        try {
          const [payloadB64] = decodeURIComponent(match[1]).split(".");
          const parsedPrev = JSON.parse(
            Buffer.from(payloadB64, "base64url").toString("utf8")
          ) as { sentAt?: number };
          if (
            parsedPrev?.sentAt &&
            maintenant - parsedPrev.sentAt < COOLDOWN_OTP_MS
          ) {
            const reste = Math.ceil(
              (COOLDOWN_OTP_MS - (maintenant - parsedPrev.sentAt)) / 1000
            );
            return NextResponse.json(
              {
                ok: false,
                error: `Anti-spam : patiente ${reste}s ou utilise le code déjà envoyé sur Telegram.`,
              },
              { status: 429 }
            );
          }
        } catch {}
      }

      // Anti-spam mémoire serveur (30s)
      if (maintenant - dernierEnvoiOtpMs < COOLDOWN_OTP_MS) {
        const reste = Math.ceil(
          (COOLDOWN_OTP_MS - (maintenant - dernierEnvoiOtpMs)) / 1000
        );
        return NextResponse.json(
          {
            ok: false,
            error: `Anti-spam Telegram : patiente encore ${reste}s.`,
          },
          { status: 429 }
        );
      }

      const code = String(crypto.randomInt(100000, 999999));
      const exp = maintenant + 5 * 60 * 1000;
      const hashCode = crypto
        .createHmac("sha256", secret)
        .update(`${code}:${exp}`)
        .digest("hex");

      const geo = extraireInfosConnexion(req);
      const origin = new URL(req.url).origin;
      const ts = String(maintenant);

      const sigAllow = crypto
        .createHmac("sha256", secret)
        .update(`ALLOW:${ts}`)
        .digest("hex")
        .slice(0, 24);
      const sigBlock = crypto
        .createHmac("sha256", secret)
        .update(`BLOCK:${ts}`)
        .digest("hex")
        .slice(0, 24);

      const urlConfirmer = `${origin}/api/dg-telegram?decision=ALLOW&ts=${ts}&sig=${sigAllow}`;
      const urlBloquer = `${origin}/api/dg-telegram?decision=BLOCK&ts=${ts}&sig=${sigBlock}`;

      await envoyerMessageTelegram(
        `🔐 <b>WENZE — Tentative de connexion DG</b>\n\n` +
          `🌍 <b>Pays :</b> ${geo.paysAffichage}\n` +
          `🏙️ <b>Ville :</b> ${geo.ville}\n` +
          `🌐 <b>IP :</b> <code>${geo.ip}</code>\n` +
          `📱 <b>Appareil :</b> ${geo.ua}\n\n` +
          `🔑 <b>Code OTP :</b> <code>${code}</code> (valable 5 min)\n\n` +
          `<i>C'est toi DG ? Confirme ou bloque immédiatement ci-dessous :</i>`,
        {
          inline_keyboard: [
            [
              { text: "✅ C'est moi, confirmer", url: urlConfirmer },
              { text: "🚫 Bloquer l'accès", url: urlBloquer },
            ],
          ],
        }
      );

      dernierEnvoiOtpMs = maintenant;

      const res = NextResponse.json({
        ok: true,
        pays: geo.paysAffichage,
        ville: geo.ville,
      });

      const payload = Buffer.from(
        JSON.stringify({ hashCode, exp, sentAt: maintenant })
      ).toString("base64url");
      const sig = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64url");

      const isHttps =
        req.headers.get("x-forwarded-proto") === "https" ||
        req.url.startsWith("https://");

      res.cookies.set("wenze_dg_otp", `${payload}.${sig}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        path: "/",
        maxAge: 300,
      });

      return res;
    }

    // 2. Vérification du code OTP saisi par le DG
    if (action === "VERIFY_OTP") {
      const codeSaisi = typeof body?.code === "string" ? body.code.trim() : "";
      if (!/^\d{6}$/.test(codeSaisi)) {
        return NextResponse.json(
          { ok: false, error: "Code à 6 chiffres requis" },
          { status: 400 }
        );
      }

      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)wenze_dg_otp=([^;]+)/);
      if (!match?.[1]) {
        return NextResponse.json(
          { ok: false, error: "Code expiré, redemande un nouveau code" },
          { status: 401 }
        );
      }

      const [payloadB64, sig] = decodeURIComponent(match[1]).split(".");
      if (!payloadB64 || !sig) {
        return NextResponse.json(
          { ok: false, error: "Session OTP invalide" },
          { status: 401 }
        );
      }

      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(payloadB64)
        .digest("base64url");

      if (!timingSafeEqualStr(sig, expectedSig)) {
        return NextResponse.json(
          { ok: false, error: "Signature OTP invalide" },
          { status: 401 }
        );
      }

      const parsed = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf8")
      ) as { hashCode: string; exp: number };

      if (Date.now() > parsed.exp) {
        return NextResponse.json(
          { ok: false, error: "Code expiré" },
          { status: 401 }
        );
      }

      const hashSaisi = crypto
        .createHmac("sha256", secret)
        .update(`${codeSaisi}:${parsed.exp}`)
        .digest("hex");

      if (!timingSafeEqualStr(hashSaisi, parsed.hashCode)) {
        return NextResponse.json(
          { ok: false, error: "Code Telegram incorrect" },
          { status: 401 }
        );
      }

      const res = NextResponse.json({ ok: true });
      res.cookies.delete("wenze_dg_otp");
      return res;
    }

    // 3. Envoi d'une alerte administrative DG
    if (action === "ALERT") {
      const titre =
        typeof body?.titre === "string" ? body.titre.trim() : "Alerte WENZE";
      const message =
        typeof body?.message === "string" ? body.message.trim() : "";
      if (!message) {
        return NextResponse.json(
          { ok: false, error: "Message d'alerte vide" },
          { status: 400 }
        );
      }

      await envoyerMessageTelegram(`🚨 <b>${titre}</b>\n\n${message}`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Action non reconnue" },
      { status: 400 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Erreur /api/dg-telegram:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
      }
      
