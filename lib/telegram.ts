// lib/telegram.ts
// En prod, envoie via https://api.telegram.org/bot<TOKEN>/sendMessage
// Ici : génération + vérification du code, + log. Le code n'est JAMAIS dans le code du DG.
export async function envoyerCodeTelegram(chatId: string, botToken: string, code: string) {
  if (!chatId || !botToken) return { ok: false, raison: "Telegram non configuré dans PARAMETRES" };
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: `🔐 WENZE DG — Code : ${code}. Ne le partage jamais. Valide 5 min.` }),
    });
    return { ok: true };
  } catch (e: any) { return { ok: false, raison: e.message }; }
}
