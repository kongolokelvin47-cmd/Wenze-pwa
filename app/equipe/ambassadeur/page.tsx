"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  verifierSession,
  quitterSession,
} from "@/lib/session";
import { cle9 } from "@/lib/connexion";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  toCDF,
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

const waClean = (tel: string) => cle9(tel || "");

const ouvrirWhatsApp = (tel: string, message: string) => {
  const n = waClean(tel);
  if (n && typeof window !== "undefined") {
    window.open(
      `https://wa.me/${n}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
};

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

function tracerAmbassadeurJournal(
  action:
    | "AMB_BOUTIQUE_AJOUTEE"
    | "AMB_CLIENT_AJOUTE"
    | "AMB_DECONNEXION",
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

export default function PageAmbassadeur() {
  const router = useRouter();
  const [moi, setMoi] = useState<any>(null);
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [onglet, setOnglet] = useState<
    "DASH" | "BOUTIQUES" | "CLIENTS" | "COMMISSION"
  >("DASH");
  const [historique, setHistorique] = useState<
    ("DASH" | "BOUTIQUES" | "CLIENTS" | "COMMISSION")[]
  >(["DASH"]);
  const [pctCommission, setPctCommission] = useState(10);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});
  const [formBout, setFormBout] = useState({
    nom: "",
    proprietaire: "",
    telephone: "",
    commune: "",
    quartier: "",
  });
  const [formCli, setFormCli] = useState({
    nom: "",
    telephone: "",
    commune: "",
    quartier: "",
  });
  const [boutiqueOuverte, setBoutiqueOuverte] = useState<any>(null);
  const [imagePleinEcran, setImagePleinEcran] = useState<string | null>(null);
  const [tempsRestant, setTempsRestant] = useState("");
  const [toast, setToast] = useState("");

  const show = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3500);
  };

  const aller = (tab: "DASH" | "BOUTIQUES" | "CLIENTS" | "COMMISSION") => {
    setHistorique((h) => [...h, tab]);
    setOnglet(tab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const retour = () => {
    if (boutiqueOuverte) return setBoutiqueOuverte(null);
    if (imagePleinEcran) return setImagePleinEcran(null);
    setHistorique((h) => {
      if (h.length <= 1) return h;
      const next = [...h];
      next.pop();
      setOnglet(next[next.length - 1]);
      return next;
    });
  };

  useEffect(() => {
    try {
      const cfg = lireConfigPublique();
      setCfgPublique(cfg);
      if (typeof cfg?.pctCommissionAmbassadeur === "number") {
        setPctCommission(Math.max(0, Math.min(100, cfg.pctCommissionAmbassadeur)));
      }

      const verif: any = verifierSession();
      if (verif && verif.role === "AMBASSADEUR" && verif.data) {
        const d = verif.data;
        const codePro = d.code_pro || d.codePro || "";
        const debut = Number(d.debut || verif.debut || Date.now());
        setMoi({ ...d, code_pro: codePro });
        const rest = Math.max(0, 12 * 3600 * 1000 - (Date.now() - debut));
        setTempsRestant(
          `${Math.floor(rest / 3600000)}h ${Math.floor(
            (rest % 3600000) / 60000
          )}min restant`
        );
        return;
      }

      const s = JSON.parse(localStorage.getItem("wenze_session") || "null");
      const sessData = s?.data || s;
      const roleSess = String(s?.role || sessData?.role || "").toUpperCase();
      const debutSess = Number(s?.debut || sessData?.debut || 0);

      if (
        !sessData ||
        roleSess !== "AMBASSADEUR" ||
        !debutSess ||
        Date.now() - debutSess > 12 * 3600 * 1000
      ) {
        if (typeof document !== "undefined") {
          document.cookie = "wenze-role=; path=/; max-age=0";
        }
        localStorage.removeItem("wenze_session");
        router.push("/equipe");
        return;
      }

      const codePro = sessData.code_pro || sessData.codePro || "";
      setMoi({ ...sessData, code_pro: codePro });
      const rest = Math.max(0, 12 * 3600 * 1000 - (Date.now() - debutSess));
      setTempsRestant(
        `${Math.floor(rest / 3600000)}h ${Math.floor(
          (rest % 3600000) / 60000
        )}min restant`
      );
    } catch {
      router.push("/equipe");
    }
  }, [router]);

  const charger = useCallback(async () => {
    const codeAmb = moi?.code_pro || moi?.codePro;
    if (!supabase || !moi || !codeAmb) return;
    try {
      const [b, c, p] = await Promise.all([
        supabase
          .from("boutiques")
          .select("*")
          .eq("code_amb", codeAmb)
          .order("created_at", { ascending: false })
          .limit(PLAFOND_ACTIVES),
        supabase
          .from("clients")
          .select("*")
          .eq("code_parrain", codeAmb)
          .order("created_at", { ascending: false })
          .limit(PLAFOND_ACTIVES),
        supabase
          .from("paiements")
          .select("*")
          .eq("code_amb", codeAmb)
          .order("created_at", { ascending: false })
          .limit(PLAFOND_ACTIVES),
      ]);
      if (Array.isArray(b?.data)) setBoutiques(b.data.slice(0, PLAFOND_ACTIVES));
      if (Array.isArray(c?.data)) setClients(c.data.slice(0, PLAFOND_ACTIVES));
      if (Array.isArray(p?.data)) {
        setPaiements(p.data.slice(0, PLAFOND_ACTIVES));
      }
    } catch {}
  }, [moi]);

  useEffect(() => {
    if (!moi || !supabase) return;
    charger();
    const canal = supabase
      .channel("amb-temps-reel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "boutiques" },
        () => {
          charger();
          show("Mise à jour boutiques reçue.");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => charger()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "paiements" },
        () => {
          charger();
          show("Nouveau paiement enregistré.");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [moi, charger]);

  const deconnexion = () => {
    tracerAmbassadeurJournal(
      "AMB_DECONNEXION",
      waClean(moi?.telephone || ""),
      moi?.code_pro || ""
    );
    try {
      quitterSession();
    } catch {}
    if (typeof document !== "undefined") {
      document.cookie = "wenze-role=; path=/; max-age=0";
    }
    try {
      localStorage.removeItem("wenze_session");
    } catch {}
    router.push("/equipe");
  };

  const mesBoutiques = boutiques;
  const mesClients = clients;

  const mesPaiements = useMemo(
    () =>
      paiements.filter(
        (p) =>
          p?.code_amb === (moi?.code_pro || moi?.codePro) ||
          mesBoutiques.some(
            (b) =>
              (b?.id && b.id === p?.boutique_id) ||
              (b?.nom && b.nom === p?.qui)
          )
      ),
    [paiements, mesBoutiques, moi]
  );

  const premiersPayes = mesPaiements.filter(
    (p) =>
      p?.statut === "PAYÉ" &&
      (p?.type === "PREMIER" || p?.type === "OCCASIONNELLE")
  );
  const renouvellements = mesPaiements.filter(
    (p) => p?.statut === "PAYÉ" && p?.type === "RENOUVELLEMENT"
  );

  const baseCommissionCDF = premiersPayes.reduce(
    (s, p) => s + Number(p?.montant || 0),
    0
  );
  const maCommissionCDF = Math.round((baseCommissionCDF * pctCommission) / 100);
  const maCommissionUSD = Number((maCommissionCDF / TAUX_CDF).toFixed(2));

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const ceMois = new Date().toISOString().slice(0, 7);

  const ajouterBoutique = async () => {
    const codeAmb = moi?.code_pro || moi?.codePro;
    if (!formBout.nom.trim() || waClean(formBout.telephone).length < 9) {
      return show("Nom et numéro WhatsApp valides requis.");
    }
    if (!supabase) {
      return show("Connexion base indisponible.");
    }

    const { error } = await supabase.from("boutiques").insert({
      id: "B-" + Date.now(),
      nom: formBout.nom.trim(),
      proprietaire: (formBout.proprietaire || formBout.nom).trim(),
      telephone: formBout.telephone.trim(),
      commune: (formBout.commune || moi?.commune || "Kinshasa").trim(),
      quartier: formBout.quartier.trim(),
      statut: "EN_ATTENTE",
      abonnement: "SANS_ABO",
      type_abonnement: "PREMIER",
      code_amb: codeAmb,
    });

    if (error) return show(error.message);

    tracerAmbassadeurJournal(
      "AMB_BOUTIQUE_AJOUTEE",
      waClean(moi?.telephone || ""),
      formBout.nom.trim()
    );
    show("Boutique transmise pour validation.");
    setFormBout({
      nom: "",
      proprietaire: "",
      telephone: "",
      commune: "",
      quartier: "",
    });
    charger();
  };

  const ajouterClient = async () => {
    const codeAmb = moi?.code_pro || moi?.codePro;
    if (!formCli.nom.trim() || waClean(formCli.telephone).length < 9) {
      return show("Nom et numéro WhatsApp valides requis.");
    }
    if (!supabase) {
      return show("Connexion base indisponible.");
    }

    const { error } = await supabase.from("clients").insert({
      id: "C-" + Date.now(),
      nom: formCli.nom.trim(),
      telephone: formCli.telephone.trim(),
      commune: (formCli.commune || moi?.commune || "Kinshasa").trim(),
      quartier: formCli.quartier.trim(),
      statut: "ACTIF",
      code_parrain: codeAmb,
    });

    if (error) return show(error.message);

    tracerAmbassadeurJournal(
      "AMB_CLIENT_AJOUTE",
      waClean(moi?.telephone || ""),
      formCli.nom.trim()
    );
    show("Client ajouté.");
    setFormCli({ nom: "", telephone: "", commune: "", quartier: "" });
    charger();
  };

  if (!moi) {
    return <div className="p-6 text-center text-sm">Chargement...</div>;
  }

  if (boutiqueOuverte) {
    const b = boutiqueOuverte;
    const pays = paiements.filter(
      (p) => p?.boutique_id === b?.id || p?.qui === b?.nom
    );
    const imgSrc = b?.image_url || b?.photo_url;

    return (
      <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3 z-10">
          <button
            type="button"
            onClick={retour}
            className="w-10 h-10 bg-black text-white rounded-full font-black active:scale-90"
          >
            ←
          </button>
          <div>
            <p className="font-black text-[15px] leading-none">{b?.nom}</p>
            <p className="text-[11px] text-gray-500">
              Boutique rattachée • {b?.statut}
            </p>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-3">
          {imgSrc ? (
            <button
              type="button"
              onClick={() => setImagePleinEcran(imgSrc)}
              className="block w-full"
            >
              <img
                src={imgSrc}
                alt={b?.nom || "Boutique"}
                className="w-full h-[240px] object-cover rounded-3xl"
              />
              <p className="text-[11px] text-gray-500 mt-1 text-center">
                Agrandir l&apos;image
              </p>
            </button>
          ) : (
            <div className="w-full h-[160px] bg-gray-200 rounded-3xl flex items-center justify-center text-[40px]">
              🏪
            </div>
          )}

          <div className="bg-white border rounded-2xl p-4">
            <p className="font-black text-[18px]">{b?.nom}</p>
            <p className="text-[13px] text-gray-600 mt-1">
              {b?.proprietaire} • {b?.commune} — {b?.quartier}
            </p>
            <p className="text-[13px] text-gray-600 mt-0.5">
              {b?.telephone} • Abonnement : <b>{b?.abonnement}</b> • Statut :{" "}
              <b>{b?.statut}</b>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                ouvrirWhatsApp(
                  b?.telephone,
                  `Bonjour ${b?.proprietaire || b?.nom}, ici ${
                    moi?.nom
                  }, votre Ambassadeur Wenze Wenze pour ${b?.nom}.`
                )
              }
              className="bg-[#25D366] text-white py-3.5 rounded-2xl font-black text-[12px] active:scale-95"
            >
              💬 WhatsApp Boutique
            </button>
            <button
              type="button"
              onClick={() => {
                if (b?.telephone && typeof window !== "undefined") {
                  window.location.href = `tel:${b.telephone}`;
                }
              }}
              className="bg-black text-white py-3.5 rounded-2xl font-black text-[12px] active:scale-95"
            >
              📞 Appeler Boutique
            </button>
          </div>

          <div className="bg-white border rounded-2xl p-4">
            <p className="font-black">Paiements de cette boutique</p>
            {pays.length === 0 ? (
              <p className="text-[12px] text-gray-500 mt-1">Aucun paiement.</p>
            ) : (
              pays.map((p: any) => {
                const cdfVal = Number(p?.montant || 0);
                const usdVal = Number((cdfVal / TAUX_CDF).toFixed(2));
                return (
                  <p key={p.id} className="text-[12px] mt-1">
                    • {cdfVal.toLocaleString()} CDF ({usd(usdVal)}) — {p?.type}{" "}
                    — {p?.statut}
                  </p>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={retour}
            className="w-full bg-white border py-3 rounded-full font-black text-[12px]"
          >
            ← Retour aux boutiques
          </button>
        </div>

        {imagePleinEcran ? (
          <div
            onClick={() => setImagePleinEcran(null)}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"
          >
            <img
              src={imagePleinEcran}
              alt="Aperçu"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl"
            />
            <button
              type="button"
              onClick={() => setImagePleinEcran(null)}
              className="bg-white text-black px-6 py-3 rounded-full font-black mt-3"
            >
              ✕ Fermer
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
      {toast ? (
        <div className="fixed top-4 left-4 right-4 z-50 bg-black text-white p-3 rounded-2xl text-[12px] font-bold text-center">
          {toast}
        </div>
      ) : null}

      {imagePleinEcran ? (
        <div
          onClick={() => setImagePleinEcran(null)}
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"
        >
          <img
            src={imagePleinEcran}
            alt="Aperçu"
            className="max-w-full max-h-[80vh] object-contain rounded-2xl"
          />
          <button
            type="button"
            onClick={() => setImagePleinEcran(null)}
            className="bg-white text-black px-6 py-3 rounded-full font-black mt-3"
          >
            ✕ Fermer
          </button>
        </div>
      ) : null}

      <div className="bg-black text-white px-5 pt-8 pb-6 rounded-b-[32px]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={retour}
            className="w-10 h-10 bg-white/15 rounded-full font-black active:scale-90"
          >
            ←
          </button>
          <div>
            <p className="text-[11px] opacity-60">
              WENZE WENZE • AMBASSADEUR •{" "}
              {(moi?.commune || "KINSHASA").toUpperCase()}
            </p>
            <h1 className="font-black text-[22px] leading-none">
              {cfgPublique?.titreAmbassadeur || `Bonjour ${moi?.nom}`}
            </h1>
          </div>
        </div>

        <p className="text-[11px] opacity-70 mt-2">
          Code : {moi?.code_pro || moi?.codePro} • {tempsRestant} • Taux{" "}
          {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES} actives
        </p>

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <button
            type="button"
            onClick={() => aller("BOUTIQUES")}
            className="bg-white/10 rounded-2xl p-2 active:scale-95"
          >
            <p className="font-black">{mesBoutiques.length}</p>
            <p className="text-[9px]">MES BOUTIQUES</p>
          </button>
          <button
            type="button"
            onClick={() => aller("CLIENTS")}
            className="bg-white/10 rounded-2xl p-2 active:scale-95"
          >
            <p className="font-black">{mesClients.length}</p>
            <p className="text-[9px]">MES CLIENTS</p>
          </button>
          <button
            type="button"
            onClick={() => aller("COMMISSION")}
            className="bg-[#FF6B00] rounded-2xl p-2 active:scale-95"
          >
            <p className="font-black">
              {maCommissionCDF.toLocaleString()} FC
            </p>
            <p className="text-[9px]">
              {usd(maCommissionUSD)} • COMMISSION
            </p>
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
        {(["DASH", "BOUTIQUES", "CLIENTS", "COMMISSION"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => aller(t)}
            className={`px-3 py-2 rounded-full text-[11px] font-black whitespace-nowrap ${
              onglet === t ? "bg-black text-white" : "bg-white border"
            }`}
          >
            {t === "DASH"
              ? "📊 Dashboard"
              : t === "BOUTIQUES"
              ? "🏪 Mes Boutiques"
              : t === "CLIENTS"
              ? "👥 Mes Clients"
              : "💰 Ma Commission"}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {onglet === "DASH" ? (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black">Activité — {aujourdHui}</p>
              <p className="text-[13px] mt-1">
                {
                  mesBoutiques.filter(
                    (b) => (b?.created_at || "").slice(0, 10) === aujourdHui
                  ).length
                }{" "}
                boutique(s) •{" "}
                {
                  mesClients.filter(
                    (c) => (c?.created_at || "").slice(0, 10) === aujourdHui
                  ).length
                }{" "}
                client(s) aujourd&apos;hui
              </p>
              <p className="text-[13px] mt-0.5">
                Ce mois ({ceMois}) :{" "}
                {
                  mesBoutiques.filter(
                    (b) => (b?.created_at || "").slice(0, 7) === ceMois
                  ).length
                }{" "}
                boutique(s) •{" "}
                {
                  mesClients.filter(
                    (c) => (c?.created_at || "").slice(0, 7) === ceMois
                  ).length
                }{" "}
                client(s)
              </p>
              <p className="text-[11px] text-gray-500 mt-2">
                Freemium : {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
                puis is_visible = false • 0 % commission sur marketplace • Min{" "}
                {usd(1)} ({toCDFString(1)}).
              </p>
            </div>

            <div className="bg-[#FF6B00] text-white rounded-2xl p-4">
              <p className="font-black">Commission Ambassadeur</p>
              <p className="text-[13px] mt-1">
                1er abonnement et vente occasionnelle uniquement.
                Renouvellement = 0 CDF ({usd(0)}).
              </p>
              <p className="font-black mt-1">
                {maCommissionCDF.toLocaleString()} CDF ({usd(maCommissionUSD)})
                sur {premiersPayes.length} premier(s) paiement(s) •{" "}
                {renouvellements.length} renouvellement(s) (0 CDF)
              </p>
              <button
                type="button"
                onClick={() => aller("COMMISSION")}
                className="bg-white text-black px-4 py-2 rounded-full text-[11px] font-black mt-2"
              >
                Voir détail →
              </button>
            </div>
          </div>
        ) : null}

        {onglet === "BOUTIQUES" ? (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black">➕ Ajouter une boutique</p>
              <input
                value={formBout.nom}
                onChange={(e) =>
                  setFormBout({ ...formBout, nom: e.target.value })
                }
                placeholder="Nom boutique"
                className="w-full border rounded-xl px-3 py-3 mt-2 text-sm"
              />
              <input
                value={formBout.telephone}
                onChange={(e) =>
                  setFormBout({ ...formBout, telephone: e.target.value })
                }
                placeholder="+243..."
                className="w-full border rounded-xl px-3 py-3 mt-2 text-sm"
              />
              <div className="flex gap-2 mt-2">
                <input
                  value={formBout.commune}
                  onChange={(e) =>
                    setFormBout({ ...formBout, commune: e.target.value })
                  }
                  placeholder="Commune"
                  className="flex-1 border rounded-xl px-3 py-3 text-sm"
                />
                <input
                  value={formBout.quartier}
                  onChange={(e) =>
                    setFormBout({ ...formBout, quartier: e.target.value })
                  }
                  placeholder="Quartier"
                  className="flex-1 border rounded-xl px-3 py-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={ajouterBoutique}
                className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-3"
              >
                ✅ Soumettre la boutique
              </button>
            </div>

            {mesBoutiques.map((b: any) => {
              const imgSrc = b?.image_url || b?.photo_url;
              return (
                <div
                  key={b.id}
                  className="bg-white border rounded-2xl p-3 flex gap-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (imgSrc) setImagePleinEcran(imgSrc);
                      else setBoutiqueOuverte(b);
                    }}
                    className="shrink-0"
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={b?.nom || "Boutique"}
                        className="w-[72px] h-[72px] object-cover rounded-2xl"
                      />
                    ) : (
                      <div className="w-[72px] h-[72px] bg-gray-100 rounded-2xl flex items-center justify-center text-[28px]">
                        🏪
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setBoutiqueOuverte(b)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="font-black text-[14px] leading-tight truncate">
                      {b?.nom}{" "}
                      <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">
                        {b?.statut} • {b?.abonnement}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {b?.proprietaire} • {b?.telephone} • {b?.commune} —{" "}
                      {b?.quartier}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Voir fiche →
                    </p>
                  </button>

                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        ouvrirWhatsApp(
                          b?.telephone,
                          `Bonjour ${b?.proprietaire || b?.nom}, ici ${
                            moi?.nom
                          }, votre Ambassadeur Wenze Wenze.`
                        )
                      }
                      className="w-9 h-9 bg-[#25D366] text-white rounded-full"
                    >
                      💬
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (b?.telephone && typeof window !== "undefined") {
                          window.location.href = `tel:${b.telephone}`;
                        }
                      }}
                      className="w-9 h-9 bg-black text-white rounded-full"
                    >
                      📞
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {onglet === "CLIENTS" ? (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black">➕ Ajouter un client</p>
              <input
                value={formCli.nom}
                onChange={(e) =>
                  setFormCli({ ...formCli, nom: e.target.value })
                }
                placeholder="Nom client"
                className="w-full border rounded-xl px-3 py-3 mt-2 text-sm"
              />
              <input
                value={formCli.telephone}
                onChange={(e) =>
                  setFormCli({ ...formCli, telephone: e.target.value })
                }
                placeholder="+243..."
                className="w-full border rounded-xl px-3 py-3 mt-2 text-sm"
              />
              <div className="flex gap-2 mt-2">
                <input
                  value={formCli.commune}
                  onChange={(e) =>
                    setFormCli({ ...formCli, commune: e.target.value })
                  }
                  placeholder="Commune"
                  className="flex-1 border rounded-xl px-3 py-3 text-sm"
                />
                <input
                  value={formCli.quartier}
                  onChange={(e) =>
                    setFormCli({ ...formCli, quartier: e.target.value })
                  }
                  placeholder="Quartier"
                  className="flex-1 border rounded-xl px-3 py-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={ajouterClient}
                className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-3"
              >
                ✅ Ajouter
              </button>
            </div>

            {mesClients.map((c: any) => (
              <div key={c.id} className="bg-white border rounded-2xl p-4">
                <p className="font-black">{c?.nom}</p>
                <p className="text-[11px] text-gray-500">
                  {c?.telephone} • {c?.commune} — {c?.quartier} • {c?.statut}
                </p>
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      ouvrirWhatsApp(
                        c?.telephone,
                        `Bonjour ${c?.nom}, ici ${moi?.nom}, votre Ambassadeur Wenze Wenze.`
                      )
                    }
                    className="bg-[#25D366] text-white px-3 py-1.5 rounded-full text-[11px] font-black"
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (c?.telephone && typeof window !== "undefined") {
                        window.location.href = `tel:${c.telephone}`;
                      }
                    }}
                    className="bg-black text-white px-3 py-1.5 rounded-full text-[11px] font-black"
                  >
                    📞 Appeler
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {onglet === "COMMISSION" ? (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black">
                Détail commission ({pctCommission}% sur 1er abonnement)
              </p>
              {mesPaiements
                .filter((p: any) => p?.statut === "PAYÉ")
                .map((p: any) => {
                  const montCDF = Number(p?.montant || 0);
                  const commCDF =
                    p?.type === "RENOUVELLEMENT"
                      ? 0
                      : Math.round((montCDF * pctCommission) / 100);
                  const commUSD = Number((commCDF / TAUX_CDF).toFixed(2));
                  return (
                    <p key={p.id} className="text-[12px] mt-1">
                      • {p?.qui} — {montCDF.toLocaleString()} CDF — {p?.type} →{" "}
                      {commCDF.toLocaleString()} CDF ({usd(commUSD)})
                    </p>
                  );
                })}
              {mesPaiements.filter((p: any) => p?.statut === "PAYÉ").length ===
              0 ? (
                <p className="text-[12px] text-gray-500 mt-1">
                  Aucun paiement validé pour l&apos;instant.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={retour}
            className="flex-1 bg-white border py-3 rounded-full font-black text-[12px]"
          >
            ← Retour
          </button>
          <button
            type="button"
            onClick={deconnexion}
            className="flex-1 bg-red-600 text-white py-3 rounded-full font-black text-[12px]"
          >
            ↩ Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
