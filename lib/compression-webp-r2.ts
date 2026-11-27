export interface ImageWebpCompressee {
  blob: Blob;
  fichierWebp: File;
  largeur: number;
  hauteur: number;
  tailleOctets: number;
}

/**
 * Compresse et convertit une image en WebP (max 800px par défaut, cible ~150 Ko).
 */
export async function compresserImageEnWebp(
  fichier: File,
  options?: {
    maxDimensionPx?: number; // 800 par défaut (ou 400 pour liste)
    cibleOctets?: number; // ~150 Ko (153_600 octets)
  }
): Promise<ImageWebpCompressee> {
  const maxDimensionPx = options?.maxDimensionPx ?? 800;
  const cibleOctets = options?.cibleOctets ?? 153_600;

  if (!fichier.type.startsWith("image/")) {
    throw new Error("Le fichier sélectionné n'est pas une image.");
  }

  const bitmap = await createImageBitmap(fichier);

  try {
    let largeur = bitmap.width;
    let hauteur = bitmap.height;

    if (largeur > maxDimensionPx || hauteur > maxDimensionPx) {
      if (largeur >= hauteur) {
        hauteur = Math.round((hauteur * maxDimensionPx) / largeur);
        largeur = maxDimensionPx;
      } else {
        largeur = Math.round((largeur * maxDimensionPx) / hauteur);
        hauteur = maxDimensionPx;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Contexte canvas indisponible.");
    }

    ctx.drawImage(bitmap, 0, 0, largeur, hauteur);

    const convertirAvecQualite = (q: number): Promise<Blob> =>
      new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Échec de l'encodage WebP."));
          },
          "image/webp",
          q
        );
      });

    // Recherche itérative de la qualité pour viser ~150 Ko
    const paliersQualite = [0.82, 0.72, 0.62, 0.52, 0.42];
    let meilleurBlob = await convertirAvecQualite(0.75);

    for (const q of paliersQualite) {
      const essai = await convertirAvecQualite(q);
      meilleurBlob = essai;
      if (essai.size <= cibleOctets) {
        break;
      }
    }

    const nomBase = fichier.name.replace(/\.[^/.]+$/, "") || "photo";
    const fichierWebp = new File([meilleurBlob], `${nomBase}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    return {
      blob: meilleurBlob,
      fichierWebp,
      largeur,
      hauteur,
      tailleOctets: meilleurBlob.size,
    };
  } finally {
    bitmap.close();
  }
}
