import "./globals.css";

export const metadata = {
  title: "WENZE-WENZE - Éveil de la Conscience",
  description: "Plateforme d'éducation et transformation Kinshasa",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
