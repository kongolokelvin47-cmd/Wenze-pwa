import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

const hashWithPepper = (pin: string) => {
  const pepper =
    process.env.DG_PIN_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return crypto.createHash("sha256").update(`${pepper}:${pin}`).digest("hex");
};

const rawSha256 = (pin: string) => {
  return crypto.createHash("sha256").update(pin).digest("hex");
};

const timingSafeEqualHex = (a: string, b: string) => {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

function aSessionDgValide(req: Request, secret: string): boolean {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)wenze_dg_session=([^;]+)/);
  if (!match?.[1]) return false;

  const token = decodeURIComponent(match[1]);
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return false;

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  if (!timingSafeEqualHex(sig, expectedSig)) return false;

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as { role?: string; exp?: number };
    return (
      parsed.role === "DG" &&
      typeof parsed.exp === "number" &&
      Date.now() < parsed.exp
    );
  } catch {
    return false;
  }
}

async function trouverTableEtHash(
  supabase: SupabaseClient
): Promise<{ table: "wenze_dg_pin" | "config_publique"; hash: string } | null> {
  const { data: dgPinRow, error: dgPinError } = await supabase
    .from("wenze_dg_pin")
    .select("pin_hash")
    .eq("id", 1)
    .maybeSingle();

  if (!dgPinError && dgPinRow?.pin_hash) {
    return { table: "wenze_dg_pin", hash: String(dgPinRow.pin_hash).trim() };
  }

  const { data: configRow, error: configError } = await supabase
    .from("config_publique")
    .select("pin_hash")
    .eq("id", 1)
    .maybeSingle();

  if (!configError && configRow?.pin_hash) {
    return {
      table: "config_publique",
      hash: String(configRow.pin_hash).trim(),
    };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const ancienRaw = body?.ancienPin ?? body?.ancien;
    const nouveauRaw = body?.nouveauPin ?? body?.nouveau;

    const ancien = typeof ancienRaw === "string" ? ancienRaw.trim() : "";
    const nouveau = typeof nouveauRaw === "string" ? nouveauRaw.trim() : "";

    if (!ancien || !nouveau) {
      return NextResponse.json(
        { ok: false, error: "Ancien et nouveau PIN requis" },
        { status: 400 }
      );
    }

    if (nouveau.length < 4 || nouveau.length > 16) {
      return NextResponse.json(
        {
          ok: false,
          error: "Le nouveau PIN doit contenir entre 4 et 16 caractères",
        },
        { status: 400 }
      );
    }

    if (ancien === nouveau) {
      return NextResponse.json(
        {
          ok: false,
          error: "Choisis un nouveau PIN différent de l'ancien",
        },
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

    const sessionSecret = process.env.DG_SESSION_SECRET || serviceRoleKey;
    if (!aSessionDgValide(req, sessionSecret)) {
      return NextResponse.json(
        { ok: false, error: "Session DG expirée ou manquante" },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cible = await trouverTableEtHash(supabase);

    if (!cible) {
      return NextResponse.json(
        { ok: false, error: "PIN DG introuvable" },
        { status: 500 }
      );
    }

    const ancienValide =
      timingSafeEqualHex(hashWithPepper(ancien), cible.hash) ||
      timingSafeEqualHex(rawSha256(ancien), cible.hash);

    if (!ancienValide) {
      return NextResponse.json(
        { ok: false, error: "Ancien PIN incorrect" },
        { status: 401 }
      );
    }

    const nouveauHash = hashWithPepper(nouveau);
    const { error: updateError } = await supabase
      .from(cible.table)
      .update({ pin_hash: nouveauHash })
      .eq("id", 1);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: "Échec de la mise à jour du PIN" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erreur /api/dg-change-pin:", message);
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
        }
        
