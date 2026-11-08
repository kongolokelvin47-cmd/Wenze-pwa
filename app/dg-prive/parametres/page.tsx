"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lireSession } from "@/lib/comptes";
import { roleDe, journaliser } from "@/lib/admin";
export const dynamic = "force-dynamic";

function lireParams() {
  try { return JSON.parse(localStorage.getItem("wenze_params") || "null") || { tauxCDF: 28000, prixOccasionnel: 2, prixStandard: 5, prixPro: 10, prixPremium: 20, dureeJours: 30, freemiumWhatsappImages: 1, freemiumGmailImages: 3, commissionBronze: 10, commissionArgent: 15, commissionOr: 20, bonusBoutiqueJours: 7 }; } catch { return { tauxCDF: 28000, prixOccasionnel: 2, prixStandard: 5, prixPro: 10, prixPremium: 20, dureeJours: 30, freemiumWhatsappImages: 1, freemiumGmailImages: 3, commissionBronze: 10, commissionArgent: 15, commissionOr: 20, bonusBoutiqueJours: 7 }; }
}

export default function ParametresAdmin() {
  const router = useRouter();
  const [compte, setCompte] = useState<any>(null);
  const [p, setP] = useState<any>(lireParams());
  const [sauve, setSauve] = useState(false);
  useEffect(() => {
    const s = lireSession();
    if (!s) { router.replace("/connexion"); return; }
    if (roleDe(s) !== "dg") { router.replace("/admin"); return; } // DG SEUL
    setCompte(s);
  }, [router]);
  const sauver = () => {
    localStorage.setItem("wenze_params", JSON.stringify(p));
    journaliser("CHANGEMENT PARAMETRES", compte.ownerWhatsapp || compte.whatsapp, compte.nom || "DG", "", `Taux ${p.tauxCDF} - Standard ${p.prixStandard}$ - Premium ${p.prixPremium}$`);
    setSauve(true); setTimeout(() => setSauve(false), 2500);
  };
  const Champ = ({ label, cle, suffix }: any) => (
    <div className="bg-white border rounded-2xl p-3"><p className="text-[11px] font-bold">{label}</p><div className="flex gap-2 items-center mt-2"><input type="number" value={p[cle]} onChange={(e) => setP({ ...p, [cle]: Number(e.target.value) })} className="flex-1 border-2 border-black rounded-full px-3 py-2 font-black text-[13px] outline-none" /><span className="text-[11px] font-bold">{suffix}</span></div></div>
  );
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="p-4 bg-black text-white flex justify-between items-center"><div><h1 className="font-black text-[15px]">⚙️ Paramètres - DG seul</h1><p className="text-[10px] text-white/60">Si tu changes ici, tout Wenze change</p></div><Link href="/admin" className="bg-white text-black px-3 py-1.5 rounded-full font-black text-[10px]">← Admin</Link></header>
      <div className="p-4 space-y-3">
        <p className="font-black text-[13px]">💱 Taux & Prix</p>
        <Champ label="Taux CDF pour 1$" cle="tauxCDF" suffix="CDF" />
        <Champ label="Ticket Occasionnel (2 annonces / 3 jours)" cle="prixOccasionnel" suffix="$" />
        <Champ label="Abonnement Standard (7 annonces)" cle="prixStandard" suffix="$" />
        <Champ label="Abonnement Pro (12 annonces)" cle="prixPro" suffix="$" />
        <Champ label="Abonnement Premium (20 annonces + Pub)" cle="prixPremium" suffix="$" />
        <Champ label="Durée de visibilité" cle="dureeJours" suffix="jours" />
        <p className="font-black text-[13px] mt-2">🎁 Freemium - Gratuit</p>
        <Champ label="Images gratuites si compte WhatsApp seul" cle="freemiumWhatsappImages" suffix="image(s)" />
        <Champ label="Images gratuites si compte Gmail" cle="freemiumGmailImages" suffix="image(s)" />
        <p className="font-black text-[13px] mt-2">💰 Commissions Ambassadeur</p>
        <Champ label="Bronze (0-10 filleules)" cle="commissionBronze" suffix="%" />
        <Champ label="Argent (11-30 filleules)" cle="commissionArgent" suffix="%" />
        <Champ label="Or (31+ filleules)" cle="commissionOr" suffix="%" />
        <Champ label="Bonus Boutique qui invite" cle="bonusBoutiqueJours" suffix="jours visibles" />
        <button onClick={sauver} className="w-full bg-black text-white py-4 rounded-full font-black text-[12px]">{sauve ? "✅ Enregistré !" : "💾 Enregistrer les paramètres"}</button>
        <p className="text-[10px] text-center text-gray-500">Chaque changement est enregistré dans le journal d'audit. Le Superviseur ne voit pas cette page.</p>
      </div>
    </div>
  );
}
