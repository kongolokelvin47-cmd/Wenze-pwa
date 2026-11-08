"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PageInvitationPublique() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string || "").toUpperCase();
  const [inv, setInv] = useState<any>(null);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    // On cherche qui a invité avec ce code
    const all = JSON.parse(localStorage.getItem("wenze_all_users") || "[]");
    const parrain = all.find((u: any) => (u.inviteCode || u.codeAmbassadeur || "").toUpperCase() === code);
    const invitations = JSON.parse(localStorage.getItem("wenze_invitations") || "[]");
    const invData = invitations.find((x: any) => (x.code || "").toUpperCase() === code);
    if (parrain || invData) {
      setInv({
        parrain_nom: parrain?.nomEtablissement || parrain?.nom || invData?.parrain_nom || "Un membre Wenze",
        parrain_type: parrain?.roleAdmin || invData?.parrain_type || "ambassadeur",
        code,
      });
    }
    setCharge(false);
  }, [code]);

  if (charge) return <div className="max-w-[430px] mx-auto min-h-screen bg-black text-white p-6 font-bold">Chargement invitation...</div>;

  if (!inv) return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-center flex flex-col justify-center">
      <h1 className="font-black text-[20px]">❌ Lien invalide</h1>
      <p className="text-[12px] mt-2">Ce code n'existe pas ou a été bloqué par le DG.</p>
      <Link href="/" className="mt-6 bg-black text-white py-4 rounded-full font-black text-[12px] block">Aller sur Wenze</Link>
    </div>
  );

  const label = inv.parrain_type === "boutique" ? "🏬 Boutique" : inv.parrain_type === "client" ? "👤 Client" : inv.parrain_type === "superviseur" ? "🛡️ Superviseur" : "🎁 Ambassadeur";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 flex flex-col justify-center">
      <div className="bg-white border-2 border-black rounded-3xl p-6 text-center">
        <p className="text-[40px]">🎁</p>
        <h1 className="font-black text-[20px] leading-tight">{label} {inv.parrain_nom}<br/>t'invite sur Wenze</h1>
        <p className="text-[12px] text-gray-500 mt-2">Rejoins la 1ère plateforme Business de Kinshasa.<br/>Publie, vends, gagne.</p>
        <div className="bg-gray-100 rounded-full py-2 px-4 mt-4 font-black text-[12px]">Code : {code}</div>
        <Link href={`/inscription?code=${code}`} className="mt-4 bg-black text-white py-4 rounded-full font-black text-[12px] block">✅ S'inscrire avec ce code</Link>
        <Link href={`/connexion?code=${code}`} className="mt-2 border-2 border-black py-3 rounded-full font-black text-[12px] block">J'ai déjà un compte</Link>
        <p className="text-[10px] text-gray-400 mt-4">En t'inscrivant, ton parrain gagne sa récompense.<br/>Lien public - Ne montre pas la partie admin.</p>
      </div>
    </div>
  );
    }
