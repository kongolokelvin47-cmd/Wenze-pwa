import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Espace privé - WENZE",
  robots: { index: false, follow: false },
};

export default function DgPriveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0d0d0f] text-white min-h-screen">
      {children}
    </div>
  );
}
