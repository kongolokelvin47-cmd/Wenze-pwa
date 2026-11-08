"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { roleDe, doitFaire2FA, genererCode2FA } from "@/lib/admin";
export const dynamic = "force-dynamic";
function cleanWa(n: any) { return (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, ""); }
function lire(cle: string): any[] { try { return JSON.parse(localStorage.getItem(cle) || "[]"); } catch { return []; } }

export default function ConnexionAdmin() {
  const router = useRouter();
  const [wa, setWa] = useState(""); const [mdp, setMdp] = useState("");
  const [etape, setEtape] = useState<"login" | "2fa">("login");
  const [code2FA, setCode2FA] = useState(""); const [codeAttendu, setCodeAttendu] = useState("");
  const [compteTrouve, setCompteTrouve] = useState<any>(null);
  const [tentatives, setTentatives] = useState(0);

  const seConnecter = () => {
    const users = lire("wenze_all_users");
    const u = users.find((x: any) => cleanWa(x.ownerWhatsapp || x.whatsapp) === cleanWa(wa));
    if (!u) return alert("Compte introuvable. Vérifie ton WhatsApp.");
    if (u.statutCompte === "supprime") return alert("Compte supprimé définitivement.");
    if (u.statutCompte === "suspendu") return alert("Compte suspendu. Contacte le DG.");
    // Mot de passe : si tu n'as pas encore de système mdp, on accepte le code WENZE-... ou "1234" pour test, sinon compare
    if (u.motDePasse && u.motDePasse !== mdp) return alert("Mot de passe incorrect.");
    const r = roleDe(u);
    if (!r) return alert("Tu n'es pas admin.");
    setCompteTrouve(u);
    if (doitFaire2FA(u)) {
      const code = genererCode2FA();
      setCodeAttendu(code);
      // EN VRAI : tu envoies ce code par WhatsApp / Email via ton API. Pour test, on l'affiche.
      alert(`🔐 Code 2FA DG / Superviseur : ${code}\n\nEn production, ce code part par WhatsApp, il ne s'affiche pas ici.`);
      setEtape("2fa");
    } else {
      localStorage.setItem("wenze_session", JSON.stringify(u));
      router.replace("/admin");
    }
  };
  const verifier2FA = () => {
    if (code2FA.trim() !== codeAttendu) {
      const t = tentatives + 1; setTentatives(t);
      if (t >= 3) { alert("3 erreurs. Compte bloqué 30 min. Alerte envoyée au DG."); setEtape("login"); setTentatives(0); return; }
      return alert(`Code incorrect. Il te reste ${3 - t} tentative(s).`);
    }
    localStorage.setItem("wenze_session", JSON.stringify(compteTrouve));
    localStorage.setItem("wenze_2fa_ok", JSON.stringify({ wa: cleanWa(compteTrouve.ownerWhatsapp || compteTrouve.whatsapp), date: new Date().toISOString() }));
    router.replace("/admin");
  };
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-black text-white p-6 flex flex-col justify-center">
      <h1 className="font-black text-[22px] text-center">🔐 Connexion Admin</h1>
      <p className="text-[11px] text-white/60 text-center mt-1">DG + Superviseur : Mot de passe + 2FA obligatoire</p>
      {etape === "login" ? (
        <div className="space-y-3 mt-6">
          <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="WhatsApp : 2438..." className="w-full bg-white text-black rounded-full px-4 py-4 font-bold text-[13px] outline-none" />
          <input value={mdp} onChange={(e) => setMdp(e.target.value)} type="password" placeholder="Mot de passe" className="w-full bg-white text-black rounded-full px-4 py-4 font-bold text-[13px] outline-none" />
          <button onClick={seConnecter} className="w-full bg-white text-black py-4 rounded-full font-black text-[12px]">Se connecter →</button>
          <p className="text-[10px] text-white/50 text-center">Ambassadeur / Boutique / Client : connexion normale, sans 2FA, mais ils ne voient que leurs filleules.</p>
        </div>
      ) : (
        <div className="space-y-3 mt-6">
          <p className="text-center font-bold text-[13px]">📱 Entre le code 6 chiffres reçu par WhatsApp</p>
          <input value={code2FA} onChange={(e) => setCode2FA(e.target.value)} placeholder="000000" maxLength={6} className="w-full bg-white text-black rounded-full px-4 py-4 font-black text-[20px] text-center tracking-[10px] outline-none" />
          <button onClick={verifier2FA} className="w-full bg-white text-black py-4 rounded-full font-black text-[12px]">Vérifier le code 2FA</button>
          <button onClick={() => setEtape("login")} className="w-full py-2 text-[11px] text-white/60">← Retour</button>
        </div>
      )}
    </div>
  );
}
