"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { lireSession, cle9 } from "@/lib/connexion";
import { verifierPinDG } from "@/lib/dg-prive";

export const dynamic = "force-dynamic";

type RoleEquipe = "DG" | "SUPERVISEUR" | "AMBASSADEUR";

function tracerConnexionEquipe(
  roleEquipe: RoleEquipe,
  telDigits: string,
  succes: boolean
) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("wenze_journal");
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action: succes ? "CONNEXION_EQUIPE_OK" : "CONNEXION_EQUIPE_ECHEC",
      roleEquipe,
      acteurWhatsapp: telDigits,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

function verifierCodeEquipe(roleEquipe: RoleEquipe, codeSaisi: string): boolean {
  const propre = codeSaisi.trim();
  if (!propre) return false;

  if (roleEquipe === "DG") {
    try {
      if (typeof verifierPinDG === "function") {
        return Boolean(verifierPinDG(propre));
      }
    } catch {}
    const envDgPin = process.env.NEXT_PUBLIC_WENZE_DG_PIN || "";
    return Boolean(envDgPin && propre === envDgPin);
  }

  if (roleEquipe === "SUPERVISEUR") {
    const envSup = process.env.NEXT_PUBLIC_WENZE_SUP_CODE || "";
    return Boolean(envSup && propre === envSup);
  }

  const envAmb = process.env.NEXT_PUBLIC_WENZE_AMB_CODE || "";
  return Boolean(envAmb && propre === envAmb);
}

export default function ConnexionEquipePro() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [telephone, setTelephone] = useState("");
  const [code, setCode] = useState("");
  const [afficherCode, setAfficherCode] = useState(false);
  const [role, setRole] = useState<RoleEquipe>("DG");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    const session: any = lireSession();
    if (session?.dgSessionActive) {
      router.replace("/dg-prive");
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  const infosRole: Record<
    RoleEquipe,
    {
      titre: string;
      sousTitre: string;
      icone: string;
      couleur: string;
      dest: string;
    }
  > = {
    DG: {
      titre: "Bureau du Directeur Général",
      sousTitre: "Accès isolé • Contrôle global WENZE (0 % commission)",
      icone: "👑",
      couleur: "bg-black text-white",
      dest: "/dg-prive",
    },
    SUPERVISEUR: {
      titre: "Espace Superviseur",
      sousTitre: "Validation des boutiques • Gestion de votre zone à Kinshasa",
      icone: "🛡️",
      couleur: "bg-[#1A3A2F] text-white",
      dest: "/equipe/superviseur",
    },
    AMBASSADEUR: {
      titre: "Espace Ambassadeur",
      sousTitre: "Suivi d'activité • Périmètre ambassadeur dédié",
      icone: "🎖️",
      couleur: "bg-[#FF6B00] text-white",
      dest: "/equipe/ambassadeur",
    },
  };

  const seConnecter = () => {
    if (chargement) return;
    setErreur("");

    const telDigits = cle9(telephone);
    if (telDigits.length < 9) {
      setErreur("Numéro incomplet. Exemple : 082 588 8889");
      return;
    }
    if (code.trim().length < 4) {
      setErreur("Code trop court. Vérifiez votre code d'accès.");
      return;
    }

    setChargement(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const valide = verifierCodeEquipe(role, code);
      tracerConnexionEquipe(role, telDigits, valide);

      if (!valide) {
        setErreur(
          "Accès refusé. Vérifiez le rôle sélectionné et votre code d'accès."
        );
        setChargement(false);
        return;
      }

      try {
        if (role === "DG") {
          sessionStorage.setItem(
            "wenze_dg_auth",
            JSON.stringify({
              role: "dg",
              roleAdmin: "dg",
              dgSessionActive: true,
              whatsapp: telDigits,
              at: Date.now(),
            })
          );
        } else {
          sessionStorage.setItem(
            "wenze_equipe_auth",
            JSON.stringify({
              role: role.toLowerCase(),
              whatsapp: telDigits,
              at: Date.now(),
            })
          );
        }
      } catch {}

      router.push(infosRole[role].dest);
    }, 500);
  };

  const info = infosRole[role];

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] flex flex-col">
      <div className="bg-black text-white px-6 pt-10 pb-6 rounded-b-[28px]">
        <div className="flex items-center justify-between">
          <p className="font-black text-[18px] tracking-tight">
            WENZE<span className="text-[#FF6B00]">.</span>
          </p>
          <span className="text-[10px] bg-white/15 px-2.5 py-1 rounded-full font-bold">
            🔒 ESPACE SURVEILLÉ
          </span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <span className="text-[36px]">{info.icone}</span>
          <div>
            <h1 className="font-black text-[19px] leading-tight">
              {info.titre}
            </h1>
            <p className="text-[11px] text-white/70 mt-0.5">{info.sousTitre}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 flex-1">
        <p className="text-[11px] font-black tracking-wide text-gray-500">
          JE ME CONNECTE EN TANT QUE :
        </p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(
            [
              { id: "DG", label: "👑 DG" },
              { id: "SUPERVISEUR", label: "🛡️ SUP." },
              { id: "AMBASSADEUR", label: "🎖️ AMB." },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setRole(r.id);
                setErreur("");
              }}
              className={`py-3.5 rounded-2xl text-[11px] font-black border transition-all ${
                role === r.id
                  ? infosRole[r.id].couleur + " border-black shadow-md scale-[1.02]"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[24px] p-5 mt-4 border shadow-sm">
          <label className="text-[11px] font-black" htmlFor="eq-tel">
            NUMÉRO DE TÉLÉPHONE
          </label>
          <input
            id="eq-tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="Ex: 082 588 8889"
            inputMode="tel"
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] outline-none mt-2 focus:border-black bg-gray-50"
          />

          <label className="text-[11px] font-black mt-4 block" htmlFor="eq-code">
            CODE SECRET D&apos;ACCÈS
          </label>
          <div className="relative mt-2">
            <input
              id="eq-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              type={afficherCode ? "text" : "password"}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && seConnecter()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] outline-none focus:border-black bg-gray-50 pr-12"
            />
            <button
              type="button"
              aria-label="Afficher ou masquer le code"
              onClick={() => setAfficherCode(!afficherCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[18px]"
            >
              {afficherCode ? "🙈" : "👁️"}
            </button>
          </div>

          {erreur ? (
            <div
              role="alert"
              className="bg-red-50 border border-red-100 text-red-700 text-[12px] font-bold p-3 rounded-xl mt-4 flex gap-2"
            >
              <span>⚠️</span>
              <span>{erreur}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={seConnecter}
            disabled={chargement}
            className="w-full bg-black text-white py-4 rounded-full font-black text-[13px] mt-5 active:scale-[0.98] transition disabled:opacity-60"
          >
            {chargement
              ? "⏳ Vérification..."
              : `🔓 ENTRER DANS ${
                  role === "DG"
                    ? "MON BUREAU DG"
                    : role === "SUPERVISEUR"
                    ? "MON ESPACE SUP."
                    : "MON ESPACE AMB."
                }`}
          </button>

          <p className="text-center text-[11px] text-gray-400 mt-3 leading-relaxed">
            Connexion enregistrée dans le journal et contrôlée.
            <br />
            0 % commission sur les ventes • Invitations réservées aux clients,
            boutiques et prestataires.
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4 mt-4">
          <p className="font-black text-[12px]">
            🔐 Comment l&apos;isolation et le contrôle fonctionnent
          </p>
          <div className="text-[11px] text-gray-600 mt-2 space-y-1.5 leading-relaxed">
            <p>
              <b className="text-black">👑 Bureau DG :</b> Authentification
              isolée et contrôle global de la plateforme.
            </p>
            <p>
              <b className="text-black">🛡️ Superviseur :</b> Périmètre limité à
              la supervision locale ; accès Bureau DG interdit.
            </p>
            <p>
              <b className="text-black">🎖️ Ambassadeur :</b> Périmètre limité au
              rôle ambassadeur (sans accès aux invitations réseau clients/boutiques/prestataires).
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-5">
          WENZE • Kinshasa • Espace réservé
        </p>
      </div>
    </div>
  );
 }
