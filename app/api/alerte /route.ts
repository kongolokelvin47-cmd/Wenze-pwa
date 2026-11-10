// WENZE - API ALERTE V2 PRO - Sécurisée + Anti-spam + Logs
// Vercel > Settings > Env :
// TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, RESEND_API_KEY, DG_EMAIL, ALERTE_SECRET

// Anti-spam en mémoire : 1 alerte toutes les 10 secondes max par urgence
const DERNIER_ENVOI = new Map<string, number>();

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : Seule ton app WENZE peut appeler cette API
    // Sans ça, n'importe qui sur internet peut spammer ton téléphone
    const secret = req.headers.get("x-wenze-secret");
    if (secret !== process.env.ALERTE_SECRET) {
      return Response.json({ ok: false, erreur: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { titre, detail, urgence, qui } = body;

    // 2. VALIDATION : On refuse les données vides ou fausses
    if (!titre || !detail || !qui) {
      return Response.json({ ok: false, erreur: "Titre, détail et qui sont obligatoires" }, { status: 400 });
    }
    if (!["NORMALE", "URGENTE", "CRITIQUE"].includes(urgence)) {
      return Response.json({ ok: false, erreur: "Urgence invalide" }, { status: 400 });
    }
    // On limite la taille pour éviter les attaques
    if (titre.length > 100 || detail.length > 500) {
      return Response.json({ ok: false, erreur: "Message trop long" }, { status: 400 });
    }

    // 3. ANTI-SPAM : Même urgence = 1 fois toutes les 10 secondes max
    const cle = `${urgence}-${titre}`;
    const maintenant = Date.now();
    const dernier = DERNIER_ENVOI.get(cle) || 0;
    if (maintenant - dernier < 10000) {
      return Response.json({ ok: true, message: "Alerte déjà envoyée il y a moins de 10s, ignorée pour anti-spam" });
    }
    DERNIER_ENVOI.set(cle, maintenant);

    const message = `🚨 ALERTE WENZE - ${urgence}\n\n${titre}\nQui : ${qui}\nDétail : ${detail}\n\n👉 Résoudre : https://wenze.cd/dg-prive`;

    // 4. ON ENVOIE LES 2 EN MÊME TEMPS (plus rapide)
    const promesses: Promise<any>[] = [];

    // TELEGRAM - Toujours envoyé
    if (process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      promesses.push(
        fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message }),
        }).then(async (r) => {
          if (!r.ok) console.error("Telegram échoué:", await r.text());
          return r.ok;
        })
      );
    } else {
      console.error("TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID manquant dans Vercel");
    }

    // GMAIL via Resend - CRITIQUE seulement
    if (urgence === "CRITIQUE" && process.env.RESEND_API_KEY && process.env.DG_EMAIL) {
      promesses.push(
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "WENZE Alerte <onboarding@resend.dev>", // CORRIGÉ : Utilise celui de Resend tant que ton domaine n'est pas vérifié
            to: [process.env.DG_EMAIL],
            subject: `🚨 ${urgence} - ${titre}`,
            html: `<h2>${titre}</h2><p><b>Qui:</b> ${qui}</p><p>${detail}</p><p><a href="https://wenze.cd/dg-prive">Résoudre maintenant</a></p>`,
          }),
        }).then(async (r) => {
          if (!r.ok) console.error("Resend échoué:", await r.text());
          return r.ok;
        })
      );
    }

    await Promise.allSettled(promesses);

    // 5. LOG pour savoir ce qui s'est passé
    console.log(`[ALERTE WENZE] ${urgence} - ${titre} - De: ${qui} - ${new Date().toISOString()}`);

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Erreur API Alerte:", e);
    return Response.json({ ok: false, erreur: "Erreur serveur" }, { status: 500 });
  }
}
