// lib/ai/gratuit.ts - OUTILS GRATUITS WENZE WENZE
// Seule IA avancée est réservée aux payants Pro 5$ / Grossiste 25$

// --- CONFIG CLÉS GRATUITES ---
// 1. Va sur groq.com → crée compte gratuit → clé API gratuite (14 400 req/jour)
// 2. Va sur huggingface.co → settings → tokens → clé gratuite
// Remplace les xxx par tes clés

const GROQ_KEY = "gsk_xxx_TA_CLE_GROQ_GRATUITE"; // gratuit
const HF_KEY = "hf_xxx_TA_CLE_HUGGINGFACE_GRATUITE"; // gratuit

// --- 1. COMPRÉHENSION IMAGE / VIDÉO - GRATUIT POUR TOUS ---
export const comprendreImage = async (base64: string): Promise<string> => {
  try {
    // Option navigateur si pas de clé - retourne placeholder
    if (HF_KEY.includes("xxx")) {
      return "produit sur table marché Kinshasa";
    }

    const res = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large", {
      method: "POST",
      headers: { Authorization: `Bearer ${HF_KEY}` },
      body: JSON.stringify({ image: base64 }),
    });
    const data = await res.json();
    return data[0]?.generated_text || "produit";
  } catch {
    return "produit";
  }
};

// --- 2. AMÉLIORATION IMAGE - 100% GRATUIT NAVIGATEUR - POUR TOUS MAIS IA RÉSERVÉE PAYANTS ---
export const ameliorerImageGratuit = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = "contrast(1.15) brightness(1.08) saturate(1.15)"; // boost auto
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = base64;
  });
};

// --- 3. GÉNÉRATION DESCRIPTION VENTE - RÉSERVÉ PRO/GROSSISTE PAYANT ---
export const genererDescriptionVente = async (titre: string, caption: string, langue: string = "fr"): Promise<string> => {
  const user = JSON.parse(localStorage.getItem("wenze_user") || "{}");
  const isPayant = user.type === "pro" || user.type === "grossiste";
  
  if (!isPayant) {
    throw new Error("IA_VENTE_RESERVEE_PAYANT");
  }

  const langueLabel = langue === "ln" ? "Lingala" : langue === "sw" ? "Swahili RDC" : langue === "kg" ? "Kikongo" : langue === "lua" ? "Tshiluba" : langue === "en" ? "Anglais" : "Français";

  const prompt = `Tu es vendeur Wenze Wenze Kinshasa. Produit: ${titre}. Image montre: ${caption}.
Rédige description vente courte 2-3 lignes max en ${langueLabel}.
Style: direct, prix $ et CDF, livraison Kinshasa, WhatsApp.
Pas de hashtags, pas d'emojis excessifs.`;

  // Si pas de clé Groq, fallback template gratuit
  if (GROQ_KEY.includes("xxx")) {
    return `${titre} - Qualité garantie. Disponible Kinshasa. Prix en $ ou CDF. Contact WhatsApp pour livraison rapide. Stock limité.`;
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || `${titre} - Disponible Kinshasa.`;
};

// --- 4. TRADUCTION GRATUITE - 6 LANGUES ---
export const traduireGratuit = async (texte: string, vers: string): Promise<string> => {
  // MyMemory pour fr/en - gratuit sans clé
  if (vers === "fr" || vers === "en") {
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texte)}&langpair=auto|${vers}`);
      const d = await r.json();
      if (d.responseData?.translatedText) return d.responseData.translatedText;
    } catch {}
  }

  // Pour langues nationales: utilise Groq gratuit
  if (["ln", "kg", "lua", "sw"].includes(vers)) {
    if (GROQ_KEY.includes("xxx")) return texte; // fallback si pas de clé
    
    const prompt = `Traduis exactement "${texte}" en ${vers} (ln=Lingala, kg=Kikongo, lua=Tshiluba, sw=Swahili RDC). Donne seulement traduction.`;
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 60,
        }),
      });
      const d = await r.json();
      return d.choices?.[0]?.message?.content || texte;
    } catch {
      return texte;
    }
  }
  return texte;
};

// --- 5. GÉOLOCALISATION GRATUITE ---
export const getPosition = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject("Non supporté");
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
};

export const calculerDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
