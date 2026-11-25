"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById } from "@/lib/categories";
import { lireSession, cle9 } from "@/lib/connexion";
import { COMMUNES_KINSHASA } from "@/lib/zones";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const CHAMP =
  "w-full mt-1 border rounded-xl px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-black bg-white";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

const INTENTIONS = [
  {
    id: "detail",
    label: "Vendre au détail",
    icon: "🛍️",
    role: "vendeur",
    categorieId: "commerces-services",
  },
  {
    id: "gros",
    label: "Vendre en gros",
    icon: "📦",
    role: "grossiste",
    categorieId: "gros-autres",
  },
  {
    id: "service",
    label: "Offrir un service",
    icon: "🔧",
    role: "prestataire",
    categorieId: "commerces-services",
  },
  {
    id: "occasionnel",
    label: "Vendre occasionnellement",
    icon: "📱",
    role: "client",
    categorieId: "commerces-services",
  },
];

function tracerOnboardingJournal(
  action: string,
  role: string,
  waDigits: string,
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
      role,
      acteurWhatsapp: waDigits,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export default function OnboardingPage() {
  const router = useRouter();
  const [etape, setEtape] = useState(1);
  const [compte, setCompte] = useState<any>(null);
  const [methode, setMethode] = useState<"google" | "email" | "whatsapp" | "">(
    ""
  );
  const [intention, setIntention] = useState("");
  const [codeParain, setCodeParain] = useState("");
  const [nom, setNom] = useState("");
  const [champ2, setChamp2] = useState("Gombe");
  const [champ3, setChamp3] = useState("");
  const [categorieId, setCategorieId] = useState("commerces-services");
  const [activiteId, setActiviteId] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) setCodeParain(code.trim().toUpperCase());
    } catch {}

    const s: any = lireSession();
    if (s) {
      setCompte(s);
      setNom(s.nomBoutique || s.nomEtablissement || s.nom || "");
      setEtape(2);
    }
  }, []);

  const choisirAuth = (m: "google" | "email" | "whatsapp") => {
    setMethode(m);
    const query = codeParain
      ? `?methode=${m}&code=${encodeURIComponent(codeParain)}`
      : `?methode=${m}`;
    router.push("/auth" + query);
  };

  const intentionObj = useMemo(
    () => INTENTIONS.find((i) => i.id === intention) || null,
    [intention]
  );

  const cat: any = useMemo(
    () =>
      getCategorieById(categorieId) ||
      (Array.isArray(CATEGORIES_WENZE) ? CATEGORIES_WENZE[0] : {}) ||
      {},
    [categorieId]
  );
  const activites = cat.activites || [];

  const valider = () => {
    setErreur("");
    const nomPropre = nom.trim();
    if (nomPropre.length < 2) {
      return setErreur("Veuillez renseigner un nom valide (2 caractères min.).");
    }
    if (activites.length > 0 && !activiteId) {
      return setErreur("Veuillez sélectionner votre activité.");
    }

    const roleChoisis = intentionObj?.role || "vendeur";
    const now = new Date().toISOString();
    const expireFreemiumAt = new Date(
      Date.now() + FREE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const wa = cle9(
      compte?.ownerWhatsapp || compte?.whatsapp || compte?.telephone || ""
    );

    const compteMisAJour = {
      ...(compte || {}),
      id: compte?.id || (wa ? `USR-${wa}` : `USR-${Date.now()}`),
      ownerWhatsapp: wa,
      whatsapp: wa,
      role: roleChoisis,
      user_type: roleChoisis,
      nomBoutique:
        roleChoisis === "vendeur" || roleChoisis === "grossiste"
          ? nomPropre
          : compte?.nomBoutique || "",
      nomEtablissement: nomPropre,
      boutiqueName:
        roleChoisis === "vendeur" || roleChoisis === "grossiste"
          ? nomPropre
          : compte?.boutiqueName || "",
      commune: champ2 || compte?.commune || "Gombe",
      zone: intention === "service" ? champ2 : compte?.zone || champ2 || "Gombe",
      categorieId,
      activiteId: activiteId || compte?.activiteId || "",
      intention,
      methode: methode || compte?.methode || "email",
      codeInvitationUtilise: codeParain.trim().toUpperCase() || undefined,
      freemiumMaxImages: MAX_FREE_IMAGES,
      freemiumDureeJours: FREE_DAYS,
      freemiumExpireAt: expireFreemiumAt,
      maxAnnoncesActives: PLAFOND_ACTIVES,
      is_visible: true,
      commissionPct: 0,
      updatedAt: now,
      createdAt: compte?.createdAt || now,
    };

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("wenze_user", JSON.stringify(compteMisAJour));
        const rawUsers = localStorage.getItem("wenze_all_users");
        const users = rawUsers ? JSON.parse(rawUsers) : [];
        const arr = Array.isArray(users) ? users : [];
        const idx = arr.findIndex(
          (u: any) =>
            (wa && cle9(u.ownerWhatsapp || u.whatsapp) === wa) ||
            (compteMisAJour.id && u.id === compteMisAJour.id)
        );
        if (idx >= 0) arr[idx] = { ...arr[idx], ...compteMisAJour };
        else arr.push(compteMisAJour);
        localStorage.setItem("wenze_all_users", JSON.stringify(arr.slice(0, 500)));
      }
    } catch {
      return setErreur("Impossible d'enregistrer votre profil localement.");
    }

    tracerOnboardingJournal(
      "BOUTIQUE_OUVERTE",
      roleChoisis,
      wa,
      `${nomPropre} (${champ2})`
    );

    if (roleChoisis === "prestataire") {
      router.push("/publier-service");
    } else {
      router.push("/publier?cat=" + encodeURIComponent(categorieId));
    }
  };

  const labels: Record<
    string,
    { c2: string; c2ph: string; c3: string; c3ph: string }
  > = {
    detail: {
      c2: "Marché / Commune (Kinshasa)",
      c2ph: "Ex. : Marché Central, Gombe",
      c3: "Photo boutique / Repère (facultatif)",
      c3ph: "Lien photo ou repère quartier",
    },
    gros: {
      c2: "Commune / Dépôt (Kinshasa)",
      c2ph: "Ex. : Limete, Gombe",
      c3: "Tarif indicatif carton / unité (USD)",
      c3ph: `Ex. : ${usd(25)} / ${toCDFString(25)}`,
    },
    service: {
      c2: "Commune / Zone d'intervention",
      c2ph: "Ex. : Gombe, Lemba",
      c3: "Tarif de départ (USD - facultatif)",
      c3ph: `Ex. : ${usd(10)} / ${toCDFString(10)} ou à discuter`,
    },
    occasionnel: {
      c2: "Commune (Kinshasa)",
      c2ph: "Ex. : Gombe",
      c3: "Article / Photo (facultatif)",
      c3ph: "Ex. : Smartphone, écran...",
    },
  };
  const L = labels[intention] || labels.detail;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-16">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link
          href="/"
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[15px]">
            Wenze Wenze Business • Kinshasa
          </h1>
          <p className="text-[10px] text-gray-500">
            0 % commission • Taux {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES}{" "}
            annonces actives
          </p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white border rounded-2xl p-3 text-[11px] text-gray-700">
          Offre gratuite : <b>{MAX_FREE_IMAGES} images max</b> pendant{" "}
          <b>{FREE_DAYS} jours</b>, puis masquage automatique (
          <b>is_visible = false</b>). Tarif minimum : <b>{usd(1)}</b> (
          {toCDFString(1)}).
        </div>

        {etape === 1 ? (
          <>
            <div className="bg-white border rounded-2xl p-4 space-y-2.5">
              <p className="font-black text-[14px]">
                Démarrer sur Wenze Wenze • {usd(0)} ({toCDFString(0)})
              </p>
              <button
                type="button"
                onClick={() => choisirAuth("google")}
                className="w-full bg-black text-white py-3.5 rounded-full font-black text-[13px]"
              >
                Continuer avec Google
              </button>
              <button
                type="button"
                onClick={() => choisirAuth("email")}
                className="w-full bg-white border-2 border-black py-3.5 rounded-full font-black text-[13px]"
              >
                Continuer avec E-mail
              </button>
              <button
                type="button"
                onClick={() => choisirAuth("whatsapp")}
                className="w-full bg-green-50 border-2 border-green-600 text-green-800 py-3.5 rounded-full font-black text-[13px]"
              >
                Continuer avec WhatsApp
              </button>
              <p className="text-[10px] text-gray-500 text-center pt-1">
                Freemium : {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
                avant masquage (is_visible = false) • 0 % commission.
              </p>
            </div>
            <p className="text-center text-[11px] text-gray-500">
              Déjà un compte ?{" "}
              <Link href="/auth" className="underline font-bold">
                Se connecter
              </Link>
            </p>
          </>
        ) : null}

        {etape === 2 ? (
          <>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[14px]">
                Quel est votre objectif sur Wenze Wenze ?
              </p>
              <div className="grid gap-2 mt-3">
                {INTENTIONS.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setIntention(it.id);
                      setCategorieId(it.categorieId);
                      setActiviteId("");
                    }}
                    className={
                      "text-left p-4 rounded-xl border-2 flex items-center justify-between gap-3 " +
                      (intention === it.id
                        ? "bg-black text-white border-black"
                        : "bg-white border-gray-200")
                    }
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-2xl">{it.icon}</span>
                      <span className="font-black text-[13px]">{it.label}</span>
                    </span>
                    {intention === it.id ? <span>✓</span> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-4">
              <label
                className="text-[12px] font-black"
                htmlFor="onb-code-inv"
              >
                Code d&apos;invitation (facultatif)
              </label>
              <input
                id="onb-code-inv"
                value={codeParain}
                onChange={(e) => setCodeParain(e.target.value.toUpperCase())}
                placeholder="WENZE-INV-XXXX"
                className={CHAMP}
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Les invitations sont réservées aux clients, boutiques et
                prestataires.
              </p>
            </div>

            <button
              type="button"
              disabled={!intention}
              onClick={() => setEtape(3)}
              className="w-full bg-black text-white py-4 rounded-full font-black disabled:opacity-50"
            >
              Continuer →
            </button>
          </>
        ) : null}

        {etape === 3 ? (
          <>
            <div className="bg-white border rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-[12px] font-black" htmlFor="onb-nom">
                  {intention === "gros"
                    ? "Nom du dépôt / grossiste *"
                    : intention === "service"
                    ? "Nom du prestataire / service *"
                    : "Nom de la boutique *"}
                </label>
                <input
                  id="onb-nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex. : Boutique Kinshasa Centre"
                  className={CHAMP}
                />
              </div>

              <div>
                <label className="text-[12px] font-black" htmlFor="onb-c2">
                  {L.c2}
                </label>
                {intention === "detail" ||
                intention === "service" ||
                intention === "occasionnel" ? (
                  <select
                    id="onb-c2"
                    value={champ2}
                    onChange={(e) => setChamp2(e.target.value)}
                    className={CHAMP}
                  >
                    {COMMUNES_KINSHASA.map((c: string) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="onb-c2"
                    value={champ2}
                    onChange={(e) => setChamp2(e.target.value)}
                    placeholder={L.c2ph}
                    className={CHAMP}
                  />
                )}
              </div>

              <div>
                <label className="text-[12px] font-black" htmlFor="onb-c3">
                  {L.c3}
                </label>
                <input
                  id="onb-c3"
                  value={champ3}
                  onChange={(e) => setChamp3(e.target.value)}
                  placeholder={L.c3ph}
                  className={CHAMP}
                />
              </div>

              {activites.length > 0 ? (
                <div>
                  <p className="font-black text-[13px]">Votre activité *</p>
                  <div className="grid gap-2 mt-2 max-h-[180px] overflow-y-auto">
                    {activites.map((a: any) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setActiviteId(a.id)}
                        className={
                          "p-3 rounded-xl border text-left text-[12px] font-bold " +
                          (activiteId === a.id
                            ? "bg-black text-white border-black"
                            : "bg-white")
                        }
                      >
                        {a.label || a.titre}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {erreur ? (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-[12px] font-bold"
              >
                {erreur}
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEtape(2)}
                className="flex-1 bg-white border-2 border-black py-4 rounded-full font-black"
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={valider}
                className="flex-[2] bg-black text-white py-4 rounded-full font-black"
              >
                Valider mon espace
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
  
