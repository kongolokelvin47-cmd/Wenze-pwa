import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
export async function POST(req: Request) {
  const { pin } = await req.json();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await supabase.from("config_publique").select("pin_hash").eq("id", 1).single();
  if (!data?.pin_hash) return NextResponse.json({ ok: false }, { status: 500 });
  const hash = crypto.createHash("sha256").update(String(pin)).digest("hex");
  return NextResponse.json({ ok: hash === data.pin_hash });
}
