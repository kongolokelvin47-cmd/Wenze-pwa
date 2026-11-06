"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Lien court d'invitation : /invitation/CODE ouvre l'inscription avec le code déjà rempli.
export default function Invitation() {
  const router = useRouter();
  const params = useParams();
  const brut = params && (params as any).code ? String((params as any).code) : "";

  useEffect(() => {
    const code = decodeURIComponent(brut).trim().toUpperCase().slice(0, 40);
    router.replace(code ? "/inscription?code=" + encodeURIComponent(code) : "/inscription");
  }, [router, brut]);

  return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-[12px]">Ouverture de votre invitation…</div>;
}
