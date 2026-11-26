import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

interface TraductionProduit {
  name_fr: string;
  name_en: string;
  name_ln: string;
  name_sw: string;
  description_fr: string;
  description_en: string;
  description_ln: string;
  description_sw: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const productId = String(body?.productId || "").trim();
    const nomSource = String(body?.name || "").trim();
    const descSource = String(body?.description || "").trim();
    const force = Boolean(body?.force);

    if (!nomSource && !descSource) {
      return NextResponse.json(
        { ok: false, error: "Nom ou description du produit requis." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    const supabaseAdmin =
      supabaseUrl && serviceKey
        ? createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false },
          })
        : null;

    // 1. Vérifier le cache Supabase (1 seul appel IA par produit à vie)
    if (productId && supabaseAdmin && !force) {
      const { data: existing } = await supabaseAdmin
        .from("products")
        .select(
          "name_fr, name_en, name_ln, name_sw, description_fr, description_en, description_ln, description_sw, ai_translated_at"
        )
        .eq("id", productId)
        .maybeSingle();

      if (
        existing &&
        existing.ai_translated_at &&
        existing.name_fr &&
        existing.name_ln &&
        existing.name_sw &&
        existing.name_en &&
        existing.description_ln &&
        existing.description_sw
      ) {
        return NextResponse.json({
          ok: true,
          cached: true,
          data: existing as TraductionProduit,
        });
      }
    }

    if (!groqKey) {
      return NextResponse.json(
        { ok: false, error: "GROQ_API_KEY manquant dans l'environnement." },
        { status: 500 }
      );
    }

    // 2. Appel Groq unique (llama-3.1-8b-instant, JSON strict)
    const prompt = [
      "Tu es l'assistant catalogue de la marketplace Wenze Wenze à Kinshasa (RDC).",
      "À partir du produit ci-dessous, génère une description commerciale courte et claire si elle est absente ou courte,",
      "puis traduis le titre et la description en Français (fr), Anglais (en), Lingala de Kinshasa (ln) et Swahili (sw).",
      "Réponds UNIQUEMENT avec un objet JSON valide contenant exactement ces clés :",
      "name_fr, name_en, name_ln, name_sw, description_fr, description_en, description_ln, description_sw.",
      `Titre source : ${nomSource || "Article Wenze"}`,
      `Description source : ${descSource || "Produit disponible sur Wenze Wenze"}`,
    ].join("\n");

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Tu produis uniquement un JSON strict et concis pour un catalogue e-commerce multilingue.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!groqRes.ok) {
      const errDetail = await groqRes.text().catch(() => "Erreur Groq");
      return NextResponse.json(
        { ok: false, error: `Groq API error: ${errDetail.slice(0, 250)}` },
        { status: 502 }
      );
    }

    const groqJson = await groqRes.json();
    const rawContent = groqJson?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent);

    const resultat: TraductionProduit = {
      name_fr: String(parsed?.name_fr || nomSource || "Produit").trim(),
      name_en: String(parsed?.name_en || nomSource || "Product").trim(),
      name_ln: String(parsed?.name_ln || nomSource || "Eloko").trim(),
      name_sw: String(parsed?.name_sw || nomSource || "Bidhaa").trim(),
      description_fr: String(
        parsed?.description_fr || descSource || nomSource
      ).trim(),
      description_en: String(
        parsed?.description_en || descSource || nomSource
      ).trim(),
      description_ln: String(
        parsed?.description_ln || descSource || nomSource
      ).trim(),
      description_sw: String(
        parsed?.description_sw || descSource || nomSource
      ).trim(),
    };

    // 3. Sauvegarder en cache dans Supabase pour ne plus jamais retraduire
    if (productId && supabaseAdmin) {
      await supabaseAdmin
        .from("products")
        .update({
          ...resultat,
          ai_translated_at: new Date().toISOString(),
        })
        .eq("id", productId);
    }

    return NextResponse.json({
      ok: true,
      cached: false,
      data: resultat,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || "Erreur traduction Groq") },
      { status: 500 }
    );
  }
}
              
