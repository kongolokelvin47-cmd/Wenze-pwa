import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_LIMIT = 10;
const PAUSE_MS = 300;
const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendKey || !supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Variables d'environnement Resend/Supabase manquantes" },
      { status: 500 }
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: pendingRows, error: fetchErr } = await admin
    .from("email_queue")
    .select("id, to_email, subject, html, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }

  const items = Array.isArray(pendingRows) ? pendingRows : [];
  let sentCount = 0;
  let failedCount = 0;

  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "Wenze Wenze <no-reply@wenze.cd>";

  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    const nextAttempts = Number(row.attempts || 0) + 1;

    await admin
      .from("email_queue")
      .update({ status: "processing", attempts: nextAttempts })
      .eq("id", row.id);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [row.to_email],
          subject: row.subject,
          html: row.html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Erreur Resend");
        await admin
          .from("email_queue")
          .update({
            status: nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
            last_error: errText.slice(0, 400),
          })
          .eq("id", row.id);
        failedCount++;
      } else {
        await admin
          .from("email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", row.id);
        sentCount++;
      }
    } catch (e: any) {
      await admin
        .from("email_queue")
        .update({
          status: nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
          last_error: String(e?.message || "Erreur réseau").slice(0, 400),
        })
        .eq("id", row.id);
      failedCount++;
    }

    if (i < items.length - 1) {
      await sleep(PAUSE_MS);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: items.length,
    sent: sentCount,
    failed: failedCount,
  });
    }
