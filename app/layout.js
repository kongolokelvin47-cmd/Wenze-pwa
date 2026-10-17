import './globals.css'

export const metadata = {
  title: "WENZE WENZE BUSINESS - Votre plateforme, vos solutions, vos opportunités",
  description: "BOUTIQUE - LIVRAISON - PAIEMENT SÉCURISÉ - SERVICE CLIENT - SOLUTIONS PRO à Kinshasa, Lubumbashi, Bukavu",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1"
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{margin:0}} className="bg-[#FFFBF0]">{children}</body>
    </html>
  );
}
