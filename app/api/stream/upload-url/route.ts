import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        {
          error:
            "Variables CLOUDFLARE_ACCOUNT_ID ou CLOUDFLARE_STREAM_API_TOKEN manquantes.",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const palier = body?.palier === "30s_50vues" ? "30s_50vues" : "15s_30vues";
    const maxDurationSeconds = palier === "30s_50vues" ? 30 : 15;
    const maxVues = palier === "30s_50vues" ? 50 : 30;

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds,
          requireSignedURLs: false,
          meta: {
            platform: "wenze-wenze",
            palier,
            maxVues,
          },
        }),
      }
    );

    const data = await cfRes.json();

    if (!cfRes.ok || !data?.success || !data?.result?.uploadURL) {
      return NextResponse.json(
        {
          error:
            data?.errors?.[0]?.message ||
            "Impossible de générer le lien d'upload Cloudflare Stream.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      uploadURL: data.result.uploadURL,
      uid: data.result.uid,
      maxDurationSeconds,
      maxVues,
      palier,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erreur serveur Cloudflare Stream." },
      { status: 500 }
    );
  }
  }
