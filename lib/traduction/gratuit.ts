// lib/traduction/gratuit.ts
// Français, Anglais, Lingala, Kikongo, Tshiluba, Swahili

export const LANGUES = ["fr","en","ln","kg","lua","sw"] as const;

const DICTIONNAIRE_BASE: any = {
  fr: { bonjour:"Bonjour", prix:"Prix", acheter:"Acheter", vendre:"Vendre" },
  en: { bonjour:"Hello", prix:"Price", acheter:"Buy", vendre:"Sell" },
  ln: { bonjour:"Mbote", prix:"Talo", acheter:"Kosomba", vendre:"Koteka" },
  kg: { bonjour:"Mbote", prix:"Ntalu", acheter:"Kusumba", vendre:"Kutekisa" },
  lua: { bonjour:"Moyo", prix:"Mutengo", acheter:"Kusomba", vendre:"Kuteka" },
  sw: { bonjour:"Jambo", prix:"Bei", acheter:"Kununua", vendre:"Kuuza" }
};

// Traduction gratuite - 2 options
export const traduireGratuit = async (texte:string, de:string, vers:string): Promise<string> => {
  // Option A: MyMemory API - 100% gratuite, 5000 mots/jour sans clé
  if(vers==="fr" || vers==="en"){
    try{
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texte)}&langpair=${de}|${vers}`);
      const data = await res.json();
      if(data.responseData?.translatedText) return data.responseData.translatedText;
    }catch(e){}
  }

  // Option B: Pour langues nationales - Dictionnaire local + Groq gratuit
  if(["ln","kg","lua","sw"].includes(vers)){
    // Pour début: utilise Groq gratuit pour traduire vers langues nationales
    // Prompt spécialisé
    const prompt = `Traduis "${texte}" de ${de} vers ${vers}. 
    ln=Lingala, kg=Kikongo, lua=Tshiluba, sw=Swahili de RDC. 
    Donne seulement traduction, pas explication.`;

    try{
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": "Bearer gsk_xxx", "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{role:"user", content: prompt}],
          max_tokens: 50
        })
      });
      const data = await res.json();
      return data.choices[0].message.content;
    }catch(e){
      return texte; // fallback
    }
  }

  return texte;
};

// Traduction message chat à la demande
export const traduireMessage = async (message:string, langueCible:string) => {
  return await traduireGratuit(message, "auto", langueCible);
};
