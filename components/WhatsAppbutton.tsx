// components/WhatsappButton.tsx - BOUTON WHATSAPP POLI
"use client";

interface Props {
  telephone: string; // 2438XXXXXXXX sans +
  titre: string;
  prix: string;
  categorie: string;
}

export default function WhatsappButton({ telephone, titre, prix, categorie }: Props) {
  const cleanPhone = telephone.replace(/[^0-9]/g, "");
  
  const message = `Bonjour 👋,

Je vous contacte depuis *WENZE WENZE BUSINESS*.

Je suis intéressé(e) par:
📦 *${titre}*
📂 Catégorie: ${categorie}
💰 Prix: ${prix}

Le produit est-il toujours disponible à Kinshasa?
Quelle est la possibilité de livraison?

Merci beaucoup 🙏`;

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      className="fixed bottom-6 left-4 right-4 md:static md:w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 text-[18px] shadow-[0_8px_24px_rgba(37,211,102,0.4)] z-50"
    >
      <span className="text-2xl">💬</span> CONTACTER SUR WHATSAPP
    </a>
  );
}
