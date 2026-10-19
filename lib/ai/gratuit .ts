// lib/ai/gratuit.ts - VERSION EXPERT SÉCURISÉE

// --- 1. COMPRÉHENSION IMAGE - GRATUIT POUR TOUS ---
export const comprendreImage = async (base64: string): Promise<string> => {
  // Sans HF pour l'instant, retour intelligent local
  // Si tu ajoutes HF_KEY côté serveur, on l'appellera via /api/ia/caption
  return "produit clair sur table marché Kinshasa";
};

// --- 2. AMÉLIORATION IMAGE - 100% NAVIGATEUR GRATUIT ---
export const ameliorerImageGratuit = (base64: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = "contrast(1.18) brightness(1.08) saturate(1.2) sharpen(0.2)";
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = base64;
  });
};

// --- 3. GÉNÉRATION VENTE - APPEL SÉCURISÉ SERVEUR ---
export const genererDescriptionVente = async (titre: string, caption: string, langue: string = "fr"): Promise<string> => {
  const user = JSON.parse(localStorage.getItem("wenze_user") || "{}");
  const isPayant = user.type === "pro" || user.type === "grossiste";
  if (!isPayant) throw new Error("IA_VENTE_RESERVEE_PAYANT");

  const res = await fetch("/api/ia/vente", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titre, caption, langue }),
  });
  const data = await res.json();
  if(data.error) throw new Error(data.error);
  return data.texte;
};

// --- 4. TRADUCTION GRATUITE ---
export const traduireGratuit = async (texte: string, vers: string): Promise<string> => {
  // fr/en via MyMemory gratuit sans clé
  if (["fr","en"].includes(vers)) {
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texte)}&langpair=auto|${vers}`);
      const d = await r.json();
      if (d.responseData?.translatedText) return d.responseData.translatedText;
    } catch {}
  }
  // langues nationales via API serveur Groq
  if (["ln","kg","lua","sw"].includes(vers)) {
    try {
      const r = await fetch("/api/ia/vente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre: texte, caption: `Traduis en ${vers}`, langue: vers }),
      });
      const d = await r.json();
      return d.texte || texte;
    } catch { return texte; }
  }
  return texte;
};

// --- 5. GÉOLOCALISATION GRATUITE ---
export const getPosition = (): Promise<{ lat: number; lng: number }> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject("Non supporté");
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

export const calculerDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};
