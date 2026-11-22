import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

const hashPin = (pin: string) => {
  const pepper =
    process.env.DG_PIN_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return crypto.createHash("sha256").update(`${pepper}:${pin}`).digest("hex");
};

const rawSha256 = (pin: string) => {
  return crypto.createHash("sha256").update(pin).digest("hex");
};

const timingSafeEqualHex = (a: string, b: string) => {
  const bufA = Buffer.from(a.toLowerCase(), "utf8");
  const bufB = Buffer.from(b.toLowerCase(), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

async function lireHashSupabase(supabase: SupabaseClient): Promise<string | null> {
  // 1. Priorité à la table dédiée wenze_dg_pin (id = 1)
  const { data: dgPinRow, error: dgPinError } = await supabase
    .from("wenze_dg_pin")
    .select("pin_hash")
    .eq("id", 1)
    .maybeSingle();

  if (!dgPinError && dgPinRow?.pin_hash) {
    return String(dgPinRow.pin_hash).trim();
  }

  // 2. Repli sur config_publique (id = 1)
  const { data: configRow, error: configError } = await supabase
    .from("config_publique")
    .select("pin_hash")
    .eq("id", 1)
    .maybeSingle();

  if (!configError && configRow?.pin_hash) {
    return String(configRow.pin_hash).trim();
  }

  return null;
}

function lireHashEnvVercel(): string | null {
  const envPin = (process.env.DG_PIN || "").trim();
  if (!envPin) return null;

  // Si DG_PIN contient déjà un SHA-256 hexadécimal de 64 caractères, on le garde tel quel ;
  // sinon (ex. "2026" ou "1234"), on calcule son SHA-256 côté serveur.
  const estDejaSha256 = /^[0-9a-fA-F]{64}$/.test(envPin);
  return estDejaSha256 ? envPin.toLowerCase() : rawSha256(envPin);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";

    if (!pin || pin.length < 4 || pin.length > 16) {
      return NextResponse.json(
        { ok: false, error: "PIN invalide" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let storedHash: string | null = null;

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      storedHash = await lireHashSupabase(supabase);
    }

    // Repli sur la variable d'environnement Vercel DG_PIN
    if (!storedHash) {
      storedHash = lireHashEnvVercel();
    }

    if (!storedHash) {
      return NextResponse.json(
        { ok: false, error: "PIN DG non configuré (DG_PIN manquant)" },
        { status: 500 }
      );
    }

    const digestWithPepper = hashPin(pin);
    const digestRaw = rawSha256(pin);
    const envHash = lireHashEnvVercel();

    const isValid =
      timingSafeEqualHex(digestWithPepper, storedHash) ||
      timingSafeEqualHex(digestRaw, storedHash) ||
      (envHash !== null && timingSafeEqualHex(digestRaw, envHash));

    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "PIN incorrect" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true });

    const secret =
      process.env.DG_SESSION_SECRET ||
      serviceRoleKey ||
      process.env.DG_PIN ||
      "wenze-dg-fallback-secret";
    const exp = Date.now() + 1000 * 60 * 60 * 12; // 12 heures
    const payload = Buffer.from(
      JSON.stringify({ role: "DG", exp })
    ).toString("base64url");
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      req.url.startsWith("https://");

    res.cookies.set("wenze_dg_session", `${payload}.${sig}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erreur /api/dg-login:", message);
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
