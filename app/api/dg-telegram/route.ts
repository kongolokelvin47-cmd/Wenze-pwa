import { NextResponse } from "next/server";
import crypto from "crypto";

const timingSafeEqualStr = (a: string, b: string) => {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

async function envoyerMessageTelegram(texte: string) {
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
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Erreur Telegram (${res.status}): ${errText}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const action = body?.action; // "SEND_OTP" | "VERIFY_OTP" | "ALERT"
    const secret =
      process.env.DG_SESSION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.DG_PIN ||
      "wenze-telegram-secret";

    // 1. Envoi d'un code OTP de connexion DG (6 chiffres, valide 5 min)
    if (action === "SEND_OTP") {
      const code = String(crypto.randomInt(100000, 999999));
      const exp = Date.now() + 5 * 60 * 1000;
      const hashCode = crypto
        .createHmac("sha256", secret)
        .update(`${code}:${exp}`)
        .digest("hex");

      await envoyerMessageTelegram(
        `🔐 <b>WENZE — Code de vérification DG</b>\n\nTon code : <code>${code}</code>\nValable 5 minutes.`
      );

      const res = NextResponse.json({ ok: true });
      const payload = Buffer.from(JSON.stringify({ hashCode, exp })).toString(
        "base64url"
      );
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

    // 3. Envoi d'une alerte administrative DG (ex. changement de PIN, paiement, suspension)
    if (action === "ALERT") {
      const titre = typeof body?.titre === "string" ? body.titre.trim() : "Alerte WENZE";
      const message = typeof body?.message === "string" ? body.message.trim() : "";
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
          
