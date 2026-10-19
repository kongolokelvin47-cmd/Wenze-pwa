// lib/ai/gratuit.ts

// 1. Vision Image gratuite - Pour comprendre image/vidéo
export const comprendreImage = async (base64: string) => {
  // Option A 100% gratuite côté navigateur - pas d'API
  // On utilise description auto + tags
  // Pour version pro gratuite: Hugging Face Inference API gratuite
  const response = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large", {
    method: "POST",
    headers: { "Authorization": "Bearer hf_xxx_GRATUIT" }, // clé gratuite huggingface.co
    body: JSON.stringify({ image: base64 })
  });
  // Retourne: "a pair of shoes on a market table"
  return await response.json();
};

// 2. Génération description vente optimisée - GRATUIT
export const genererDescriptionVente = async (titre: string, imageCaption: string, langue: string = "fr") => {
  // Option gratuite: Hugging Face ou Groq gratuit (14 400 req/jour gratuit)
  // Seuls Pro 5$ et Grossiste 25$ ont accès
  const user = JSON.parse(localStorage.getItem("wenze_user")||"{}");
  if(user.type==="client" || user.type==="freemium"){
    throw new Error("IA réservée abonnés Pro 5$ et Grossiste 25$");
  }

  const prompt = `Tu es assistant Wenze Wenze. Produit: ${titre}. Image: ${imageCaption}. 
  Génère description de vente courte, percutante, en ${langue}. 
  Pour Kinshasa. Avec prix $ et CDF. Max 3 lignes. Pas de blabla.`;

  // Groq gratuit - très rapide et gratuit
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { 
      "Authorization": "Bearer gsk_xxx_GRATUIT", // clé gratuite sur groq.com
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant", // gratuit et rapide
      messages: [{role:"user", content: prompt}],
      max_tokens: 150
    })
  });
  const data = await res.json();
  return data.choices[0].message.content;
};

// 3. Amélioration image - Gratuit côté navigateur
export const ameliorerImage = (base64: string): Promise<string> => {
  return new Promise(res=>{
    const img = new Image();
    img.onload = ()=>{
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = "contrast(1.1) brightness(1.05) saturate(1.1)"; // amélioration auto gratuite
      ctx.drawImage(img,0,0);
      res(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = base64;
  });
};
