"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Les invitations se gèrent maintenant depuis le profil (carte « Inviter un ami »).
export default function Inviter() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/profil");
  }, [router]);
  return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-[12px]">Redirection vers votre profil…</div>;
}
