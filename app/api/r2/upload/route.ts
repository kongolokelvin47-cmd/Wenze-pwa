import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function creerClientR2(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Variables R2_ACCOUNT_ID, R2_ACCESS_KEY_ID ou R2_SECRET_ACCESS_KEY manquantes."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const bucket = process.env.R2_BUCKET_NAME;
    const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").replace(
      /\/+$/,
      ""
    );

    if (!bucket || !publicBaseUrl) {
      return NextResponse.json(
        {
          error: "Variables R2_BUCKET_NAME ou R2_PUBLIC_BASE_URL manquantes.",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const dossier =
      typeof body?.dossier === "string" && body.dossier.trim()
        ? body.dossier.trim().replace(/^\/+|\/+$/g, "")
        : "produits";

    const cleObjet = `${dossier}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.webp`;

    const s3 = creerClientR2();
    const commande = new PutObjectCommand({
      Bucket: bucket,
      Key: cleObjet,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    });

    const uploadUrl = await getSignedUrl(s3, commande, { expiresIn: 120 });
    const publicUrl = `${publicBaseUrl}/${cleObjet}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      cleObjet,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erreur génération URL R2." },
      { status: 500 }
    );
  }
}
  
