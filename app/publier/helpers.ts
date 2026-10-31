export const DAY_MS = 86400000;
export const MAX_ACTIVES = 50;
export const MAX_PHOTOS = 4;

export function cleanWa(n: any): string {
  return (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
}

export function getUser(): any {
  try {
    if (typeof window === "undefined") return null;
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

/** Réduit une photo à 800 px en JPEG 65% pour économiser le stockage du téléphone. */
export function compressImage(file: File, max: number = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture de la photo impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Fichier image illisible"));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > h && w > max) {
          h = (h * max) / w;
          w = max;
        } else if (h >= w && h > max) {
          w = (w * max) / h;
          h = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
      }
