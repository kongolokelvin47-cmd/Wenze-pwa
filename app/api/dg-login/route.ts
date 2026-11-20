// app/api/dg-login/route.ts — Ce fichier n'est JAMAIS visible dans le navigateur.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPin } from "@/lib/securite";

export async function POST(req: Request) {
  const { pin } = await req.json();
  if (!pin) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await supabase.from("config_publique").select("pin_hash").eq("id", 1).single();
  if (!data?.pin_hash) return NextResponse.json({ ok: false, raison: "PIN non configuré. Va dans Supabase > config_publique > pin_hash" }, { status: 500 });

  if (verifyPin(String(pin), data.pin_hash)) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false }, { status: 401 });
}
