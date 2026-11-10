"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// WENZE - CONNEXION ÉQUIPE PRO - VERSION SÉPARÉE B
// DG -> /dg-prive | SUPERVISEUR -> /equipe/superviseur | AMBASSADEUR -> /equipe/ambassadeur
// ============================================================
export default function ConnexionEquipePro() {
  const router = useRouter();
  const [telephone, setTelephone] = useState("");
  const [code, setCode] = useState("");
  const [afficherCode, setAfficherCode] = useState(false);
  const [role, setRole] = useState<"DG" | "SUPERVISEUR" | "AMBASSADEUR">("DG");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  // CODES ÉQUIPE - Change les codes Superviseur / Ambassadeur après ton test
  // DG : ton code personnel, ne le partage JAMAIS
  const codesValides: Record<string, string> = {
    DG: "Kelvin1997@",
    SUPERVISEUR: "WENZE-SUP-2026",
    AMBASSADEUR: "WENZE-AMB-2026",
  };

  const infosRole = {
    DG: { titre: "Bureau du Directeur Général", sousTitre: "Accès total • Contrôle de toute l'équipe WENZE", icone: "👑", couleur: "bg-black text-white", dest: "/dg-prive" },
    SUPERVISEUR: { titre: "Espace Superviseur", sousTitre: "Validation des boutiques • Gestion de ton quartier", icone: "🛡️", couleur: "bg-[#1A3A2F] text-white", dest: "/equipe/superviseur" },
    AMBASSADEUR: { titre: "Espace Ambassadeur", sousTitre: "Tes gains • Tes filleuls • Ton lien de parrainage", icone: "🎖️", couleur: "bg-[#FF6B00] text-white", dest: "/equipe/ambassadeur" },
  };

  const seConnecter = () => {
    setErreur("");
    if (telephone.trim().replace(/\D/g, "").length < 9) {
      setErreur("Numéro incomplet. Exemple : 0825888889 ou 243825888889");
      return;
    }
    if (code.length < 4) {
      setErreur("Code trop court. Vérifie ton code secret.");
      return;
    }

    setChargement(true);

    setTimeout(() => {
      if (code !== codesValides[role]) {
        setErreur("Code incorrect pour ce rôle. Vérifie ton rôle et ton code.");
        setChargement(false);
        return;
      }

      // ON DONNE LE BADGE AU GARDIEN - Valide 24h
      document.cookie = `wenze-role=${role}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `wenze-tel=${telephone.trim()}; path=/; max-age=86400; SameSite=Lax`;

      // SÉPARATION B : Chacun va dans SON bureau, pas dans celui des autres
      router.push(infosRole[role].dest);
    }, 700);
  };

  const info = infosRole[role];

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] flex flex-col">
      {/* HEADER WENZE */}
      <div className="bg-black text-white px-6 pt-10 pb-6 rounded-b-[28px]">
        <div className="flex items-center justify-between">
          <p className="font-black text-[18px] tracking-tight">WENZE<span className="text-[#FF6B00]">.</span></p>
          <span className="text-[10px] bg-white/15 px-2.5 py-1 rounded-full font-bold">🔒 ESPACE SURVEILLÉ</span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <span className="text-[36px]">{info.icone}</span>
          <div>
            <h1 className="font-black text-[19px] leading-tight">{info.titre}</h1>
            <p className="text-[11px] text-white/70 mt-0.5">{info.sousTitre}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 flex-1">
        {/* CHOIX DU RÔLE - SÉPARATION VISUELLE */}
        <p className="text-[11px] font-black tracking-wide text-gray-500">JE ME CONNECTE EN TANT QUE :</p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {([
            { id: "DG", label: "👑 DG" },
            { id: "SUPERVISEUR", label: "🛡️ SUP." },
            { id: "AMBASSADEUR", label: "🎖️ AMB." },
          ] as const).map((r) => (
            <button
              key={r.id}
              onClick={() => { setRole(r.id); setErreur(""); }}
              className={`py-3.5 rounded-2xl text-[11px] font-black border transition-all ${role === r.id ? infosRole[r.id].couleur + " border-black shadow-md scale-[1.02]" : "bg-white text-gray-600 border-gray-200"}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[24px] p-5 mt-4 border shadow-sm">
          <label className="text-[11px] font-black">NUMÉRO DE TÉLÉPHONE</label>
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="Ex: 0825888889"
            inputMode="tel"
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] outline-none mt-2 focus:border-black bg-gray-50"
          />

          <label className="text-[11px] font-black mt-4 block">CODE SECRET ÉQUIPE</label>
          <div className="relative mt-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              type={afficherCode ? "text" : "password"}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && seConnecter()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] outline-none focus:border-black bg-gray-50 pr-12"
            />
            <button onClick={() => setAfficherCode(!afficherCode)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[18px]">
              {afficherCode ? "🙈" : "👁️"}
            </button>
          </div>

          {erreur && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-[12px] font-bold p-3 rounded-xl mt-4 flex gap-2">
              <span>⚠️</span><span>{erreur}</span>
            </div>
          )}

          <button
            onClick={seConnecter}
            disabled={chargement}
            className="w-full bg-black text-white py-4 rounded-full font-black text-[13px] mt-5 active:scale-[0.98] transition disabled:opacity-60"
          >
            {chargement ? "⏳ Vérification du badge..." : `🔓 ENTRER DANS ${role === "DG" ? "MON BUREAU DG" : role === "SUPERVISEUR" ? "MON ESPACE SUP." : "MON ESPACE AMB."}`}
          </button>

          <p className="text-center text-[11px] text-gray-400 mt-3 leading-relaxed">
            Connexion enregistrée et surveillée.<br />Si tu as oublié ton code, contacte le DG sur WhatsApp.
          </p>
        </div>

        {/* SÉPARATION EXPLIQUÉE - PRO */}
        <div className="bg-white border rounded-2xl p-4 mt-4">
          <p className="font-black text-[12px]">🔐 Comment la séparation fonctionne ?</p>
          <div className="text-[11px] text-gray-600 mt-2 space-y-1.5 leading-relaxed">
            <p><b className="text-black">👑 DG :</b> Voit tout WENZE, seul à voir les gains totaux.</p>
            <p><b className="text-black">🛡️ Superviseur :</b> Voit seulement ses boutiques à valider, pas les gains.</p>
            <p><b className="text-black">🎖️ Ambassadeur :</b> Voit seulement ses gains à lui et son lien.</p>
            <p className="text-gray-400">Si un Superviseur essaie d'aller dans le bureau DG, le gardien le bloque automatiquement.</p>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-5">WENZE © 2026 • Kinshasa • Espace réservé à l'équipe</p>
      </div>
    </div>
  );
    }
