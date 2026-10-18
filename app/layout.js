import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WENZE WENZE BUSINESS - Achetez, Vendez, Gagnez à Kinshasa",
  description: "Le marketplace qui booste votre business à Kinshasa. Mode, téléphones, beauté, maison. Wenze Video.",
  manifest: "/manifest.json",
  themeColor: "#6C3CE0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 antialiased">{children}</body>
    </html>
  );
    }
