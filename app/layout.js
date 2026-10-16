export const metadata = {
  title: "WENZE-WENZE",
  description: "Votre plateforme, vos solutions, vos opportunités",
  manifest: "/manifest.json",
  themeColor: "#193a1e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#193a1e" />
      </head>
      <body style={{margin:0}}>{children}</body>
    </html>
  )
}
