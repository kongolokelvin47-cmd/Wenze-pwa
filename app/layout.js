export const metadata = {
  title: "WENZE-WENZE - Votre plateforme, vos solutions",
  description: "Boutique, Livraison, Paiement sécurisé à Kinshasa",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1"
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
