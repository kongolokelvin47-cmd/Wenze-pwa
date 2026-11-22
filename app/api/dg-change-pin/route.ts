import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
        { ok: false, error: "Le nouveau PIN doit contenir entre 4 et 16 caractères" },
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

    const { data, error: selectError } = await supabase
      .from("config_publique")
      .select("pin_hash")
      .eq("id", 1)
      .single();

    if (selectError || !data?.pin_hash) {
      return NextResponse.json(
        { ok: false, error: "PIN DG introuvable" },
        { status: 500 }
      );
    }

    const storedHash = String(data.pin_hash).trim();
    const ancienValide =
      timingSafeEqualHex(hashWithPepper(ancien), storedHash) ||
      timingSafeEqualHex(rawSha256(ancien), storedHash);

    if (!ancienValide) {
      return NextResponse.json(
        { ok: false, error: "Ancien PIN incorrect" },
        { status: 401 }
      );
    }

    const nouveauHash = hashWithPepper(nouveau);
    const { error: updateError } = await supabase
      .from("config_publique")
      .update({ pin_hash: nouveauHash })
      .eq("id", 1);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: "Échec de la mise à jour du PIN" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Erreur /api/dg-change-pin:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
  
