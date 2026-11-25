"use client";

import { lireSession } from "@/lib/connexion";
import { FREEMIUM } from "@/lib/paiement";

export const DAY_MS = 86400000;
export const MAX_ACTIVES = 50;
export const MAX_PHOTOS = 4;
export const MAX_PHOTOS_FREEMIUM = Number(FREEMIUM?.maxImages || 3);

export function cleanWa(n: any): string {
  return (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
}

export function getUser(): any {
  try {
    if (typeof window === "undefined") return null;
    const session: any = lireSession();
    if (session && typeof session === "object") return session;
    const r = localStorage.getItem("wenze_user");
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

export function readList(key: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Réduit une photo à 800 px en JPEG 65 % pour économiser le stockage du téléphone. */
export function compressImage(file: File, max: number = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("Compression d'image indisponible hors navigateur"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture de la photo impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Fichier image illisible"));
      img.onload = () => {
        let w = img.width || max;
        let h = img.height || max;
        if (w > h && w > max) {
          h = Math.round((h * max) / w);
          w = max;
        } else if (h >= w && h > max) {
          w = Math.round((w * max) / h);
          h = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w));
        canvas.height = Math.max(1, Math.round(h));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Contexte graphique indisponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
