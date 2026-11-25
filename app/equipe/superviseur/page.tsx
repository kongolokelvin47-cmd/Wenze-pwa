"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  demarrerSession,
  verifierSession,
  quitterSession,
  tempsRestant,
} from "@/lib/session";
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

const supabase: any =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : null;

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

function tracerSuperviseurJournal(
  action: "SUP_CONNEXION" | "SUP_DECONNEXION",
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

export default function Superviseur() {
  const [moi, setMoi] = useState<any>(null);
  const [charge, setCharge] = useState(true);
  const [tel, setTel] = useState("");
  const [code, setCode] = useState("");
  const [voir, setVoir] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [ambassadeurs, setAmbassadeurs] = useState<any[]>([]);
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [onglet, setOnglet] = useState<"ACCUEIL" | "AMBASSADEURS" | "BOUTIQUES">(
    "ACCUEIL"
  );
  const [toast, setToast] = useState("");
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3500);
  };

  const initiales = (n: string) =>
    n
      ? n
          .trim()
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "SU";

  const chargerDonneesZone = useCallback(async (moiData: any) => {
    if (!supabase || !moiData) return;
    try {
      const { data: amb } = await supabase
        .from("membres")
        .select(
          "id, nom, code_pro, role, province, commune, statut, filleuls, boutiques_validees"
        )
        .eq("chef_code", moiData.codePro)
        .eq("role", "AMBASSADEUR");
      if (Array.isArray(amb)) {
        setAmbassadeurs(amb.slice(0, PLAFOND_ACTIVES));
      }

      let qBoutiques = supabase
        .from("boutiques")
        .select(
          "id, nom, proprietaire, telephone, province, commune, village, statut, abonnement, code_amb"
        )
        .eq("commune", moiData.commune);

      if (moiData.province) {
        qBoutiques = qBoutiques.eq("province", moiData.province);
      }

      const { data: bout } = await qBoutiques
        .order("created_at", { ascending: false })
        .limit(PLAFOND_ACTIVES);

      if (Array.isArray(bout)) {
        setBoutiques(bout.slice(0, PLAFOND_ACTIVES));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCfgPublique(lireConfigPublique());
    }

    const s: any = verifierSession();
    if (s && s.role === "SUPERVISEUR" && s.data) {
      const moiData = s.data;
      setMoi(moiData);
      setCharge(false);
      chargerDonneesZone(moiData);

      if (!supabase) return;

      const ch = supabase
        .channel("sup-" + moiData.id)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "membres" },
          () => chargerDonneesZone(moiData)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "boutiques" },
          () => chargerDonneesZone(moiData)
        )
        .subscribe();

      const timer = setInterval(() => {
        if (!verifierSession()) {
          showToast("Session expirée (12h). Veuillez vous reconnecter.");
          quitterSession();
          setMoi(null);
        }
      }, 60000);

      return () => {
        supabase.removeChannel(ch);
        clearInterval(timer);
      };
    }

    setCharge(false);
  }, [chargerDonneesZone]);

  const connecter = async () => {
    const telClean = tel.trim();
    const codeClean = code.trim().toUpperCase();
    if (!telClean || !codeClean) {
      setMsg("Veuillez saisir votre téléphone et votre code Superviseur.");
      return;
    }
    if (!supabase) {
      setMsg("Service de connexion indisponible.");
      return;
    }

    setLoading(true);
    setMsg("Vérification en cours...");

    try {
      const { data, error } = await supabase
        .from("membres")
        .select("*")
        .eq("telephone", telClean)
        .eq("code_pro", codeClean)
        .eq("role", "SUPERVISEUR")
        .single();

      if (error || !data) {
        setMsg("Identifiants Superviseur invalides.");
        setLoading(false);
        return;
      }
      if (data.statut !== "ACTIF") {
        setMsg("Compte Superviseur en attente de validation.");
        setLoading(false);
        return;
      }

      const membrePropre = {
        id: data.id,
        nom: data.nom,
        role: "SUPERVISEUR",
        codePro: data.code_pro,
        telephone: data.telephone,
        province: data.province || "Kinshasa",
        commune: data.commune || "",
        village: data.village || "",
        chefCode: data.chef_code || "",
      };

      demarrerSession("SUPERVISEUR", membrePropre);
      tracerSuperviseurJournal(
        "SUP_CONNEXION",
        cle9(membrePropre.telephone || ""),
        membrePropre.codePro
      );
      setMoi(membrePropre);
      setMsg("");
      await chargerDonneesZone(membrePropre);
    } catch {
      setMsg("Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuitter = () => {
    tracerSuperviseurJournal(
      "SUP_DECONNEXION",
      cle9(moi?.telephone || ""),
      moi?.codePro || ""
    );
    quitterSession();
    setMoi(null);
  };

  if (!moi && !charge) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] pb-12">
        <div className="bg-[#1A3A2F] text-white px-5 pt-10 pb-6 rounded-b-[28px]">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="text-[18px] font-black">
              WENZE WENZE<span className="text-[#FFD166]">.</span>
            </Link>
            <span className="text-[11px] bg-white/15 px-3 py-1 rounded-full">
              ESPACE SUPERVISEUR
            </span>
          </div>
          <h1 className="font-black text-[21px] mt-4">
            {cfgPublique?.titreSuperviseur || "Connexion Superviseur"}
          </h1>
          <p className="text-[12px] opacity-75 mt-1">
            0 % commission • Taux {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES}{" "}
            actives
          </p>
        </div>

        <div className="px-4 mt-4 space-y-3">
          <div className="bg-white border rounded-2xl p-4">
            <label className="text-[11px] font-black block">
              NUMÉRO DE TÉLÉPHONE
            </label>
            <input
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              placeholder="Ex: +243810000001"
              className="w-full border rounded-xl px-3 py-3 mt-1 text-sm"
            />

            <label className="text-[11px] font-black block mt-3">
              CODE SUPERVISEUR
            </label>
            <div className="relative">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                type={voir ? "text" : "password"}
                placeholder="SUP-..."
                className="w-full border rounded-xl px-3 py-3 mt-1 pr-10 uppercase text-sm"
              />
              <button
                type="button"
                onClick={() => setVoir(!voir)}
                className="absolute right-3 top-4 text-sm"
                aria-label="Afficher ou masquer le code"
              >
                {voir ? "🙈" : "👁️"}
              </button>
            </div>

            <button
              type="button"
              onClick={connecter}
              disabled={loading}
              className="w-full bg-[#1A3A2F] text-white py-4 rounded-full font-black text-[13px] mt-4 disabled:opacity-50"
            >
              {loading
                ? "Vérification..."
                : "ENTRER DANS MON BUREAU SUPERVISEUR"}
            </button>

            {msg ? (
              <p className="text-[12px] font-bold text-center mt-3">{msg}</p>
            ) : null}
          </div>

          <div className="bg-white border rounded-2xl p-3 text-[10px] text-gray-600 leading-relaxed">
            Freemium : <b>{MAX_FREE_IMAGES} images max / {FREE_DAYS} jours</b>{" "}
            puis <b>is_visible = false</b> • Minimum {usd(1)} (
            {toCDFString(1)}) • 0 % commission.
          </div>
        </div>
      </div>
    );
  }

  if (!moi) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-24 bg-white border rounded-2xl animate-pulse" />
      </div>
    );
  }

  const actifs = ambassadeurs.filter((a) => a.statut === "ACTIF").length;
  const validees = boutiques.filter((b) => b.statut === "VALIDEE").length;

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      {toast ? (
        <div className="fixed top-4 left-4 right-4 z-50 bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">
          {toast}
        </div>
      ) : null}

      <div className="bg-[#1A3A2F] text-white px-5 pt-8 pb-5 rounded-b-[28px]">
        <div className="flex justify-between items-center gap-2">
          <p className="text-[11px] opacity-75">
            WENZE WENZE • BUREAU SUPERVISEUR
          </p>
          <button
            type="button"
            onClick={handleQuitter}
            className="bg-white/15 px-3 py-1 rounded-full text-[11px] font-bold"
          >
            ↩ Quitter
          </button>
        </div>

        <p className="text-[11px] opacity-75 mt-1">
          Session : {tempsRestant()} • 0 % commission • Taux {TAUX_CDF} CDF/$
        </p>

        <div className="flex items-center gap-3 mt-3">
          <div className="w-[62px] h-[62px] bg-[#FFD166] text-black rounded-full flex items-center justify-center font-black text-[20px] shrink-0">
            {initiales(moi.nom)}
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-[20px] truncate">
              Bonjour, {String(moi.nom || "").split(" ")[0] || "Superviseur"}
            </h1>
            <p className="text-[12px] opacity-80 truncate">
              Superviseur • {moi.commune} • {moi.province}
            </p>
            <p className="text-[11px] mt-1">
              <span className="bg-[#FFD166] text-black px-2 py-0.5 rounded-full font-black">
                {moi.codePro}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-3 mt-4 text-[12px]">
          Équipe : <b>{ambassadeurs.length}</b> ambassadeur(s) ({actifs}{" "}
          actif(s)) • <b>{validees}</b> boutique(s) validée(s) • Max{" "}
          <b>{PLAFOND_ACTIVES}</b> actives
        </div>
      </div>

      <div className="flex gap-1.5 px-4 mt-4">
        {(["ACCUEIL", "AMBASSADEURS", "BOUTIQUES"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOnglet(t)}
            className={`px-3 py-2 rounded-full text-[11px] font-black ${
              onglet === t ? "bg-black text-white" : "bg-white border"
            }`}
          >
            {t === "ACCUEIL"
              ? "🏠 Accueil"
              : t === "AMBASSADEURS"
              ? "🎖️ Ambassadeurs"
              : "🏪 Boutiques"}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {onglet === "ACCUEIL" ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[22px]">{ambassadeurs.length}</p>
              <p className="text-[11px] text-gray-500">
                Ambassadeurs rattachés
                <br />
                <b className="text-emerald-600">{actifs} actifs</b>
              </p>
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[22px]">{boutiques.length}</p>
              <p className="text-[11px] text-gray-500">
                Boutiques de la zone
                <br />
                <b className="text-emerald-600">{validees} validées</b>
              </p>
            </div>
            <div className="bg-white border rounded-2xl p-4 col-span-2">
              <p className="text-[11px] font-black">ZONE ASSIGNÉE</p>
              <p className="text-[12px] text-gray-600 mt-1">
                {moi.commune} • {moi.province}
                {moi.village ? ` • ${moi.village}` : ""}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Freemium : {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
                puis is_visible = false • 0 % commission.
              </p>
            </div>
          </div>
        ) : null}

        {onglet === "AMBASSADEURS" ? (
          <div className="space-y-2">
            {ambassadeurs.map((a) => (
              <div key={a.id} className="bg-white border rounded-2xl p-4">
                <p className="font-black text-[14px]">{a.nom}</p>
                <p className="text-[11px] text-gray-500">
                  {a.code_pro} • {a.statut} • {a.filleuls || 0} filleul(s) •{" "}
                  {a.boutiques_validees || 0} boutique(s)
                </p>
              </div>
            ))}
            {ambassadeurs.length === 0 ? (
              <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">
                Aucun ambassadeur rattaché à votre code.
              </p>
            ) : null}
          </div>
        ) : null}

        {onglet === "BOUTIQUES" ? (
          <div className="space-y-2">
            {boutiques.map((b) => (
              <div key={b.id} className="bg-white border rounded-2xl p-4">
                <p className="font-black flex items-center justify-between gap-2">
                  <span>{b.nom}</span>
                  <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">
                    {b.statut}
                  </span>
                </p>
                <p className="text-[11px] text-gray-500">
                  {b.proprietaire} • {b.commune} • {b.telephone}
                </p>
                <p className="text-[11px] text-gray-400">
                  Abonnement : {b.abonnement || "EN_ATTENTE"}
                </p>
              </div>
            ))}
            {boutiques.length === 0 ? (
              <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">
                Aucune boutique enregistrée dans votre zone.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
 }
                
