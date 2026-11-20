import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
export async function POST(req: Request) {
  const { ancien, nouveau } = await req.json();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await supabase.from("config_publique").select("pin_hash").eq("id", 1).single();
  const hashAncien = crypto.createHash("sha256").update(String(ancien)).digest("hex");
  if (hashAncien !== data?.pin_hash) return NextResponse.json({ ok: false }, { status: 401 });
  const hashNouveau = crypto.createHash("sha256").update(String(nouveau)).digest("hex");
  await supabase.from("config_publique").update({ pin_hash: hashNouveau }).eq("id", 1);
  return NextResponse.json({ ok: true });
}
