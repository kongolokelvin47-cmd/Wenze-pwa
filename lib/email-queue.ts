import { supabase } from "@/lib/supabase";
import { TAUX_CDF, toCDFString, usd } from "@/lib/paiement-base";

export type TypeEmailQueue = "OTP" | "FACTURE" | "COMMANDE" | "ALERTE_DG";

export interface EnqueueEmailInput {
  toEmail: string;
  subject: string;
  html: string;
  type?: TypeEmailQueue;
}

function journaliserEmailQueue(
  action: "EMAIL_QUEUE_AJOUTE" | "EMAIL_QUEUE_LOCAL",
  toEmail: string,
  type: TypeEmailQueue
) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("wenze_journal");
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      cible: toEmail,
      detail: `${type} • 0% comm • Taux ${TAUX_CDF} (${usd(1)} = ${toCDFString(1)})`,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export async function ajouterEmailDansFile({
  toEmail,
  subject,
  html,
  type = "COMMANDE",
}: EnqueueEmailInput): Promise<{ ok: boolean; mode: "supabase" | "local" }> {
  const emailPropre = String(toEmail || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPropre)) {
    return { ok: false, mode: "local" };
  }

  const payload = {
    to_email: emailPropre,
    subject: String(subject || "").trim(),
    html: String(html || "").trim(),
    type,
    status: "pending",
    attempts: 0,
  };

  if (supabase) {
    try {
      const { error } = await supabase.from("email_queue").insert(payload);
      if (!error) {
        journaliserEmailQueue("EMAIL_QUEUE_AJOUTE", emailPropre, type);
        return { ok: true, mode: "supabase" };
      }
    } catch {}
  }

  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("wenze_email_queue_local");
      const list = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(list) ? list : [];
      arr.push({
        id: "eq_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        ...payload,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("wenze_email_queue_local", JSON.stringify(arr.slice(-200)));
    }
  } catch {}

  journaliserEmailQueue("EMAIL_QUEUE_LOCAL", emailPropre, type);
  return { ok: true, mode: "local" };
      }
        
