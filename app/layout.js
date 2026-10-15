export const metadata = {
  title: 'WENZE WENZE',
  description: 'Marché en ligne RDC',
  manifest: '/manifest.json',
};
export default function RootLayout({children}){
  return <html lang="fr"><body>{children}</body></html>
}
