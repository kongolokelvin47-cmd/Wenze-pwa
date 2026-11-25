"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { demarrerSession } from "@/lib/session";
import { cle9 } from "@/lib/connexion";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

function lireConfigPublique(): Record<string, any> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("wenze_config_publique");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function tracerEquipeJournal(
  action: "EQUIPE_CONNEXION",
  acteurWa: string,
  detail?: string
) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("wenze_journal");
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      acteurWhatsapp: acteurWa,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export default function ConnexionEquipe() {
  const [whats, setWhats] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCfgPublique(lireConfigPublique());
    }
  }, []);

  const connecter = async () => {
    const rawTel = whats.trim();
    const normTel = cle9(rawTel);
    const codePro = code.trim().toUpperCase();

    if (!normTel || !codePro) {
      setMsg("Veuillez renseigner votre numéro WhatsApp et votre Code Pro.");
      return;
    }
    if (!supabase) {
      setMsg("Service de connexion indisponible.");
      return;
    }

    setLoading(true);
    setMsg("Vérification en cours...");

    try {
      const { data: rows, error } = await supabase
        .from("membres")
        .select("*")
        .eq("code_pro", codePro)
        .limit(5);

      if (error || !Array.isArray(rows) || rows.length === 0) {
        setMsg("Identifiants équipe invalides.");
        setLoading(false);
        return;
      }

      const membre = rows.find((m: any) => {
        const mTel = cle9(m?.telephone || m?.whatsapp || "");
        return mTel && mTel === normTel;
      });

      if (!membre) {
        setMsg("Identifiants équipe invalides.");
        setLoading(false);
        return;
      }

      const roleUpper = String(membre?.role || "").toUpperCase();
      if (roleUpper !== "SUPERVISEUR" && roleUpper !== "AMBASSADEUR") {
        setMsg("Accès réservé aux Superviseurs et Ambassadeurs.");
        setLoading(false);
        return;
      }

      if (String(membre?.statut || "").toUpperCase() !== "ACTIF") {
        setMsg("Compte inactif ou en attente de validation.");
        setLoading(false);
        return;
      }

      const payloadSession = {
        id: membre.id,
        nom: membre.nom,
        role: roleUpper,
        code_pro: membre.code_pro,
        codePro: membre.code_pro,
        telephone: membre.telephone || rawTel,
        province: membre.province || "Kinshasa",
        commune: membre.commune || "",
        village: membre.village || "",
        chefCode: membre.chef_code || "",
        debut: Date.now(),
      };

      try {
        demarrerSession(roleUpper, payloadSession);
      } catch {}

      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("wenze_membre", JSON.stringify(payloadSession));
          localStorage.setItem("wenze_role", roleUpper);
        }
      } catch {}

      tracerEquipeJournal("EQUIPE_CONNEXION", normTel, `${roleUpper}:${codePro}`);

      if (typeof window !== "undefined") {
        window.location.href =
          roleUpper === "SUPERVISEUR"
            ? "/equipe/superviseur"
            : "/equipe/ambassadeur";
      }
    } catch {
      setMsg("Erreur lors de la vérification.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-black text-white p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="text-[26px] font-black">
            WENZE WENZE<span className="text-[#FF6B00]">.</span>
          </Link>
          <span className="text-[10px] bg-white/10 border border-white/20 px-3 py-1 rounded-full font-bold">
            ÉQUIPE TERRAIN
          </span>
        </div>

        <h1 className="font-black text-[22px] mt-6">
          {cfgPublique?.titreConnexionEquipe || "Connexion Équipe"}
        </h1>
        <p className="text-[12px] opacity-65 mt-1">
          Superviseurs et Ambassadeurs • 0 % commission • Taux {TAUX_CDF}{" "}
          CDF/$
        </p>

        <div className="mt-6 space-y-3">
          <input
            value={whats}
            onChange={(e) => setWhats(e.target.value)}
            placeholder="WhatsApp — Ex: +243810000001"
            className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 text-sm outline-none focus:border-[#FF6B00]"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code Pro — Ex: SUP-... ou AMB-..."
            className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 text-sm uppercase outline-none focus:border-[#FF6B00]"
          />
          <button
            type="button"
            onClick={connecter}
            disabled={loading}
            className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-sm disabled:opacity-50"
          >
            {loading ? "Vérification..." : "ENTRER DANS MON ESPACE"}
          </button>
        </div>

        {msg ? (
          <p className="text-center text-[12px] mt-4 font-bold text-[#FFD166]">
            {msg}
          </p>
        ) : null}
      </div>

      <div className="mt-8 pt-4 border-t border-white/10 text-[10px] opacity-60 leading-relaxed space-y-1">
        <p>
          Freemium : {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours puis
          is_visible = false • Max {PLAFOND_ACTIVES} annonces actives • Min{" "}
          {usd(1)} ({toCDFString(1)}).
        </p>
        <p>
          <Link href="/" className="underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
  }
