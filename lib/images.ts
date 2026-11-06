/** Réduit une image à `max` pixels de côté en JPEG pour économiser le stockage du téléphone. */
export function compresserImage(file: File, max: number = 800, qualite: number = 0.65): Promise<string> {
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
        resolve(canvas.toDataURL("image/jpeg", qualite));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
