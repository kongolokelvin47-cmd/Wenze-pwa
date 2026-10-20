import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WENZE WENZE BUSINESS - Achetez, Vendez, Gagnez à Kinshasa",
  description: "Le marketplace qui booste votre business à Kinshasa. Mode, téléphones, beauté, maison, services Pro. 0% commission. Wenze Video 60s.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WENZE WENZE",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  keywords: ["Wenze", "Wenze Business", "Kinshasa", "marketplace RDC", "vendre Kinshasa", "acheter Kinshasa", "0% commission"],
};

export const viewport: Viewport = {
  themeColor: "#6C3CE0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="WENZE WENZE" />
      </head>
      <body className="bg-gray-50 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
        }
