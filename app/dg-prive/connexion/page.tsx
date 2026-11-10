"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ==========================================
// CONNEXION ÉQUIPE WENZE - DG / SUPERVISEUR / AMBASSADEUR
// ==========================================
export default function ConnexionEquipe() {
  const router = useRouter();
  const [telephone, setTelephone] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState("DG");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const seConnecter = () => {
    setErreur("");
    setChargement(true);

    // CODES PROVISOIRES - À CHANGER APRÈS TON TEST
    // DG : WENZE-DG-2026
    // SUPERVISEUR : WENZE-SUP-2026
    // AMBASSADEUR : WENZE-AMB-2026
    const codesValides: Record<string, string> = {
      "DG": "WENZE-DG-2026",
      "SUPERVISEUR": "WENZE-SUP-2026",
      "AMBASSADEUR": "WENZE-AMB-2026",
    };

    setTimeout(() => {
      if (telephone.trim().length < 9) {
        setErreur("Entre ton numéro de téléphone complet. Ex: 0810000000");
        setChargement(false);
        return;
      }
      if (code !== codesValides[role]) {
        setErreur("Code incorrect pour ce rôle. Vérifie ton code DG / Superviseur / Ambassadeur.");
        setChargement(false);
        return;
      }

      // ON DONNE LE BADGE AU GARDIEN
      // C'est ce cookie que middleware.ts va vérifier
      document.cookie = `wenze-role=${role}; path=/; max-age=86400`; // 24h
      document.cookie = `wenze-tel=${telephone}; path=/; max-age=86400`;

      // ON ENVOIE VERS LE BON TABLEAU
      if (role === "DG") router.push("/dg-prive");
      if (role === "SUPERVISEUR") router.push("/dg-prive/superviseurs");
      if (role === "AMBASSADEUR") router.push("/dg-prive/ambassadeurs");
    }, 600);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 pt-14">
      <div className="text-center">
        <p className="text-5xl">🛡️</p>
        <h1 className="font-black text-[20px] mt-3">Connexion de l'équipe</h1>
        <p className="text-[12px] text-gray-600 mt-1">WENZE • Espace réservé • Kinshasa</p>
      </div>

      <div className="bg-white rounded-3xl p-5 mt-6 shadow-sm border">
        {/* CHOIX DU RÔLE */}
        <p className="text-[11px] font-black mb-2">JE SUIS :</p>
        <div className="grid grid-cols-3 gap-2">
          {["DG", "SUPERVISEUR", "AMBASSADEUR"].map((r) => (
            <button key={r} onClick={() => setRole(r)} className={`py-3 rounded-xl text-[10px] font-black ${role === r ? "bg-black text-white" : "bg-gray-100"}`}>
              {r === "DG" ? "👑 DG" : r === "SUPERVISEUR" ? "🛡️ SUP." : "🎖️ AMB."}
            </button>
          ))}
        </div>

        {/* TÉLÉPHONE */}
        <p className="text-[11px] font-black mt-5 mb-2">NUMÉRO DE TÉLÉPHONE</p>
        <input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Ex: 0810000000" className="w-full border rounded-xl px-4 py-3 text-[14px] outline-none" />

        {/* CODE */}
        <p className="text-[11px] font-black mt-4 mb-2">CODE SECRET ÉQUIPE</p>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Entre ton code" className="w-full border rounded-xl px-4 py-3 text-[14px] outline-none" />

        {erreur && <p className="bg-red-50 text-red-600 text-[12px] font-bold p-3 rounded-xl mt-4">⚠️ {erreur}</p>}

        <button onClick={seConnecter} disabled={chargement} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px] mt-5">
          {chargement ? "Vérification..." : "🔓 SE CONNECTER"}
        </button>

        <p className="text-center text-[11px] text-gray-400 mt-3">Si tu as oublié ton code, contacte le DG sur WhatsApp.</p>
      </div>

      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mt-4">
        <p className="font-black text-[12px]">🧪 CODES DE TEST - Pour tester maintenant :</p>
        <p className="text-[11px] mt-1">DG : <b>WENZE-DG-2026</b></p>
        <p className="text-[11px]">Superviseur : <b>WENZE-SUP-2026</b></p>
        <p className="text-[11px]">Ambassadeur : <b>WENZE-AMB-2026</b></p>
        <p className="text-[11px] text-gray-500 mt-1">Tu changeras ces codes après le test.</p>
      </div>
    </div>
  );
              }
