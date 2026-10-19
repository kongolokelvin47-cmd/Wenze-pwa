"use client";
import { useState } from "react";

export default function AssistantVendeur() {
  const [produit, setProduit] = useState("");
  const [reponse, setReponse] = useState("");

  const generer = async () => {
    setReponse("Wenze IA réfléchit...");
    // VERSION GRATUITE - Utilise Groq API (gratuit 14 400 req/jour)
    // Tu créeras une clé gratuite sur console.groq.com
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_GROQ_KEY || "gsk_..."}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // gratuit, ultra rapide
          messages: [
            { role: "system", content: "Tu es l'assistante Wenze Wenze Business à Kinshasa. Tu aides les vendeurs congolais. Tu parles en français simple avec un peu de Lingala. Tu vends bien." },
            { role: "user", content: `J'ai ce produit: ${produit}. Génère: 1. Un titre vendeur 2. Description courte 3. Prix en CDF 4. Script vidéo TikTok 15 sec` }
          ]
        })
      });
      const data = await res.json();
      setReponse(data.choices[0].message.content);
    } catch {
      // FALLBACK 100% LOCAL GRATUIT SI PAS DE CLÉ
      setReponse(`🔥 TITRE: ${produit} - Qualité Kinshasa\n\n📝 DESCRIPTION: Disponible maintenant à Gombe. Livraison rapide partout à Kin. Qualité garantie, prix abordable. Contact WhatsApp.\n\n💰 PRIX CONSEILLÉ: 45 000 CDF\n\n🎬 SCRIPT VIDEO: "Mbote ba ndeko! Na zali na ${produit} ya kitoko... Venez vite!"`);
    }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-4 bg-white">
      <h1 className="text-xl font-black">🤖 Assistante Wenze IA</h1>
      <p className="text-xs text-gray-500">Ton employée qui ne dort jamais</p>

      <div className="bg-purple-50 p-3 rounded-xl mt-4">
        <p className="text-xs font-bold">Que vends-tu aujourd'hui?</p>
        <input value={produit} onChange={e=>setProduit(e.target.value)} placeholder="Ex: Robe wax, Téléphone Samsung, Poulet..." className="w-full p-3 rounded-lg mt-2 border text-sm" />
        <button onClick={generer} className="w-full bg-[#6C3CE0] text-white p-3 rounded-full font-bold mt-3">Générer ma vente ✨</button>
      </div>

      {reponse && (
        <div className="bg-black text-white p-4 rounded-xl mt-4 text-sm whitespace-pre-wrap">{reponse}</div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-6">
        <button className="border p-3 rounded-xl text-xs">💬 Réponse auto client</button>
        <button className="border p-3 rounded-xl text-xs">📦 Alerte stock</button>
        <button className="border p-3 rounded-xl text-xs">💰 Conseil prix</button>
        <button className="border p-3 rounded-xl text-xs">🎬 Idée vidéo</button>
      </div>
    </div>
  )
        }
