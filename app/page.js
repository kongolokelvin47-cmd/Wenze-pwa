export const metadata = { title: "WENZE-WENZE", manifest: "/manifest.json", themeColor: "#193a1e" };
export default function RootLayout({ children }) {
  return (<html lang="fr"><head><link rel="manifest" href="/manifest.json" /></head><body style={{margin:0}}>{children}</body></html>)
}
