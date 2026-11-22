import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const hashPin = (pin: string) => {
  const pepper = process.env.DG_PIN_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return crypto.createHash("sha256").update(`${pepper}:${pin}`).digest("hex");
};

const timingSafeEqualHex = (a: string, b: string) => {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

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

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Configuration serveur manquante" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("config_publique")
      .select("pin_hash")
      .eq("id", 1)
      .single();

    if (error || !data?.pin_hash) {
      return NextResponse.json(
        { ok: false, error: "PIN DG non configuré" },
        { status: 500 }
      );
    }

    // Supporte un hash avec pepper ou un sha256 brut existant en base
    const digestWithPepper = hashPin(pin);
    const rawSha256 = crypto.createHash("sha256").update(pin).digest("hex");
    const storedHash = String(data.pin_hash).trim();

    const isValid =
      timingSafeEqualHex(digestWithPepper, storedHash) ||
      timingSafeEqualHex(rawSha256, storedHash);

    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "PIN incorrect" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true });

    // Cookie de session DG signé (HttpOnly, SameSite=Lax)
    const secret = process.env.DG_SESSION_SECRET || serviceRoleKey;
    const exp = Date.now() + 1000 * 60 * 60 * 12; // 12 heures
    const payload = Buffer.from(JSON.stringify({ role: "DG", exp })).toString("base64url");
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    res.cookies.set("wenze_dg_session", `${payload}.${sig}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (err: any) {
    console.error("Erreur /api/dg-login:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
  }
