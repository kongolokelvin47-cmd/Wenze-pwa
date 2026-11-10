// app/dg-prive/layout.tsx
export const metadata = { title: "Espace privé - WENZE", robots: { index: false, follow: false } };

export default function DgPriveLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#FFFBF0] min-h-screen">{children}</div>;
}
