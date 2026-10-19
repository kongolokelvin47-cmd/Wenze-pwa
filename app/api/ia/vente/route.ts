// app/api/ia/vente/route.ts - Clé lue depuis .env.local / Vercel ENV
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { titre, caption, langue } = await req.json();

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY manquante dans .env.local" }, { status: 500 });
  }

  const langueLabel = 
    langue === "ln" ? "Lingala" :
    langue === "sw" ? "Swahili RDC" :
    langue === "kg" ? "Kikongo" :
    langue === "lua" ? "Tshiluba" :
    langue === "en" ? "Anglais" : "Français";

  const prompt = `Tu es vendeur Wenze Wenze Kinshasa. Produit: ${titre}. Image: ${caption}. Rédige description vente 2 lignes max en ${langueLabel}. Style: direct, prix $ et CDF, livraison Kinshasa, WhatsApp. Pas de hashtags.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    
    if (data.error) {
      console.error("Groq error:", data.error);
      return NextResponse.json({ texte: `${titre} - Qualité garantie. Disponible Kinshasa. Contact WhatsApp.` });
    }

    const texte = data.choices?.[0]?.message?.content || `${titre} - Disponible Kinshasa.`;
    return NextResponse.json({ texte });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ texte: `${titre} - Disponible Kinshasa. Prix $ ou CDF. Livraison rapide.` });
  }
        }
