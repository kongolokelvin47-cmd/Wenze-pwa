// app/api/ia/vente/route.ts - Clé cachée côté serveur
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { titre, caption, langue } = await req.json();
  
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if(!GROQ_KEY) return NextResponse.json({ error: "Clé manquante" }, { status: 500 });

  const langueLabel = langue === "ln" ? "Lingala" : langue === "sw" ? "Swahili RDC" : langue === "kg" ? "Kikongo" : langue === "lua" ? "Tshiluba" : langue === "en" ? "Anglais" : "Français";

  const prompt = `Tu es vendeur Wenze Wenze Kinshasa. Produit: ${titre}. Image: ${caption}.
Rédige description vente courte 2 lignes max en ${langueLabel}. Prix $ et CDF, livraison Kinshasa, WhatsApp. Direct, sans hashtag.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    const texte = data.choices?.[0]?.message?.content || `${titre} - Disponible Kinshasa.`;
    return NextResponse.json({ texte });
  } catch (e) {
    return NextResponse.json({ texte: `${titre} - Qualité garantie. Disponible Kinshasa. Contact WhatsApp.` });
  }
}
