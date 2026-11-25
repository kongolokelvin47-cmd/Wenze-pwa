"use client";

import { useState, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cle9 } from "@/lib/connexion";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
} from "@/lib/paiement-base";
import { enregistrerBoutiqueEtNotifierDG } from "@/lib/boutiques-dg";

export const dynamic = "force-dynamic";

type TypeComptePublic = "client" | "vendeur" | "grossiste" | "prestataire";

const PAYS_LISTE = [
  "République Démocratique du Congo (RDC)",
  "République du Congo (Brazzaville)",
  "Angola",
  "Rwanda",
  "Burundi",
  "Ouganda",
  "Zambie",
  "Tanzanie",
  "Kenya",
  "Afrique du Sud",
  "Autre pays",
];

const PROVINCES_RDC_26 = [
  "Kinshasa",
  "Bas-Uele",
  "Équateur",
  "Haut-Katanga",
  "Haut-Lomami",
  "Haut-Uele",
  "Ituri",
  "Kasaï",
  "Kasaï-Central",
  "Kasaï-Oriental",
  "Kongo-Central",
  "Kwango",
  "Kwilu",
  "Lomami",
  "Lualaba",
  "Mai-Ndombe",
  "Maniema",
  "Mongala",
  "Nord-Kivu",
  "Nord-Ubangi",
  "Sankuru",
  "Sud-Kivu",
  "Sud-Ubangi",
  "Tanganyika",
  "Tshopo",
  "Tshuapa",
];

const COMMUNES_KINSHASA_24 = [
  "Bandalungwa",
  "Barumbu",
  "Bumbu",
  "Gombe",
  "Kalamu",
  "Kasa-Vubu",
  "Kimbanseke",
  "Kinshasa",
  "Kintambo",
  "Kisenso",
  "Lemba",
  "Limete",
  "Lingwala",
  "Makala",
  "Maluku",
  "Masina",
  "Matete",
  "Mont-Ngafula",
  "Ndjili",
  "Ngaba",
  "Ngaliema",
  "Ngiri-Ngiri",
  "Nsele",
  "Selembao",
];

const ACTIVITES_PAR_TYPE: Record<
  Exclude<TypeComptePublic, "client">,
  string[]
> = {
  vendeur: [
    "Habillement & Mode",
    "Alimentation générale",
    "Téléphones & Électronique",
    "Beauté & Cosmétique",
    "Maison & Décoration",
    "Quincaillerie",
    "Autre commerce",
  ],
  grossiste: [
    "Alimentation en gros",
    "Habillement & Friperie en gros",
    "Boissons & Vivres frais",
    "Cosmétiques en gros",
    "Matériaux & Quincaillerie en gros",
    "Électronique en gros",
    "Autre gros",
  ],
  prestataire: [
    "Coiffure & Esthétique",
    "Couture & Retouches",
    "Réparation & Dépannage",
    "Transport & Livraison",
    "Restauration & Traiteur",
    "Informatique & Graphisme",
    "Autre prestation",
  ],
};

async function hashOtp(code: string, wa: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const data = new TextEncoder().encode(`${wa}:${code}`);
      const buf = await window.crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {}
  return `${wa}:${code}`;
}

function journaliserInscription(
  action:
    | "INSCRIPTION_OTP_ENVOYE"
    | "INSCRIPTION_OTP_VALIDE"
    | "INSCRIPTION_TERMINEE",
  wa: string,
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
      acteurWhatsapp: cle9(wa),
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

function InscriptionContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [etape, setEtape] = useState<"numero" | "auth" | "activite">("numero");
  const [telephone, setTelephone] = useState(sp.get("tel") || "");
  const [otp, setOtp] = useState("");
  const [essais, setEssais] = useState(0);
  const [tempsRestant, setTempsRestant] = useState(120);

  const [typeCompte, setTypeCompte] = useState<TypeComptePublic>("client");
  const [nomPrenom, setNomPrenom] = useState("");
  const [nomProfilPublic, setNomProfilPublic] = useState("");
  const [activite, setActivite] = useState("");

  // Localisation détaillée
  const [pays, setPays] = useState("République Démocratique du Congo (RDC)");
  const [province, setProvince] = useState("Kinshasa");
  const [communeKin, setCommuneKin] = useState("Gombe");
  const [communeOuVillage, setCommuneOuVillage] = useState("");
  const [quartier, setQuartier] = useState("");

  const [gmail, setGmail] = useState(sp.get("email") || "");
  const [codeAmbassadeur, setCodeAmbassadeur] = useState(
    sp.get("amb") || sp.get("invite") || ""
  );

  const [toast, setToast] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const timerRef = useRef<any>(null);

  const plafondActives = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
  const maxFreeImages = Math.min(3, Number(FREEMIUM?.maxImages || 3));
  const freeDays = Number(FREEMIUM?.dureeJours || 30);

  const estRDC = pays === "République Démocratique du Congo (RDC)";
  const estKinshasa = estRDC && province === "Kinshasa";

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const startTimer = () => {
    setTempsRestant(120);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTempsRestant((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          localStorage.removeItem("wenze_reg_otp");
          setErreur("Code expiré. Redemande un nouveau code.");
          setEtape("numero");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleEnvoyerCode = async () => {
    setErreur("");
    const telClean = cle9(telephone);
    if (telClean.length < 9) {
      setErreur("Saisis un numéro de téléphone valide (ex: 0825000000).");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await hashOtp(code, telClean);

    localStorage.setItem(
      "wenze_reg_otp",
      JSON.stringify({
        wa: telClean,
        codeHash,
        expires: Date.now() + 120 * 1000,
      })
    );

    if (process.env.NODE_ENV !== "production") {
      console.log("🔐 CODE INSCRIPTION WENZE pour", telClean, ":", code);
    }

    journaliserInscription("INSCRIPTION_OTP_ENVOYE", telClean);
    setEssais(0);
    setOtp("");
    setEtape("auth");
    startTimer();
    showToast(`Code d'authentification envoyé au 0${telClean.slice(-9)}.`);
  };

  const handleValiderOtp = async () => {
    setErreur("");
    const stored = JSON.parse(localStorage.getItem("wenze_reg_otp") || "{}");
    if (!stored.codeHash || Date.now() > Number(stored.expires || 0)) {
      localStorage.removeItem("wenze_reg_otp");
      setErreur("Code expiré. Recommence avec ton numéro.");
      setEtape("numero");
      return;
    }

    const hashSaisi = await hashOtp(otp.trim(), stored.wa);
    if (hashSaisi !== stored.codeHash) {
      const nextEssais = essais + 1;
      setEssais(nextEssais);
      if (nextEssais >= 3) {
        localStorage.removeItem("wenze_reg_otp");
        setErreur("3 essais échoués. Redemande un code.");
        setEtape("numero");
        return;
      }
      setErreur(`Code incorrect (${3 - nextEssais} essai(s) restant(s)).`);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    localStorage.removeItem("wenze_reg_otp");
    journaliserInscription("INSCRIPTION_OTP_VALIDE", stored.wa);

    setTypeCompte("client");
    setEtape("activite");
  };

  const choisirTypeCompte = (nouveauType: TypeComptePublic) => {
    setTypeCompte(nouveauType);
    setErreur("");
    if (nouveauType !== "client") {
      const liste = ACTIVITES_PAR_TYPE[nouveauType];
      setActivite(liste[0] || "");
    } else {
      setActivite("");
    }
  };

  const handleFinaliserInscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");

    const telClean = cle9(telephone);
    if (telClean.length < 9) {
      setErreur("Numéro de téléphone invalide.");
      return;
    }

    if (!nomPrenom.trim()) {
      setErreur("Indique ton nom et prénom.");
      return;
    }

    if (typeCompte !== "client" && !nomProfilPublic.trim()) {
      setErreur(
        typeCompte === "vendeur"
          ? "Indique le nom de ta boutique."
          : typeCompte === "grossiste"
          ? "Indique le nom de ton établissement grossiste."
          : "Indique le nom de ton service / enseigne."
      );
      return;
    }

    if (typeCompte !== "client" && !activite.trim()) {
      setErreur("Choisis ton domaine d'activité.");
      return;
    }

    const communeFinale = estKinshasa
      ? communeKin
      : communeOuVillage.trim();

    if (!communeFinale) {
      setErreur(
        estKinshasa
          ? "Sélectionne ta commune à Kinshasa."
          : "Indique ta commune, ville, territoire ou village."
      );
      return;
    }

    if (!quartier.trim()) {
      setErreur("Indique ton quartier.");
      return;
    }

    const emailPropre = gmail.trim().toLowerCase();
    if (emailPropre && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPropre)) {
      setErreur("L'adresse Gmail facultative n'est pas valide.");
      return;
    }

    setChargement(true);
    try {
      const nowIso = new Date().toISOString();
      const nomAfficheProfil =
        typeCompte === "client" ? nomPrenom.trim() : nomProfilPublic.trim();
      const codeAmbPropre = codeAmbassadeur.trim().toUpperCase();
      const provinceFinale = estRDC ? province : pays;

      const nouveauMembre = {
        id: `usr_${telClean}_${Date.now()}`,
        role: typeCompte,
        nom: nomPrenom.trim(),
        nomPrenom: nomPrenom.trim(),
        nomEtablissement:
          typeCompte !== "client" ? nomProfilPublic.trim() : undefined,
        activite: typeCompte !== "client" ? activite.trim() : undefined,
        telephone: telClean,
        whatsapp: telClean,
        ownerWhatsapp: telClean,
        email: emailPropre || undefined,
        code_amb: codeAmbPropre || undefined,
        pays,
        province: provinceFinale,
        commune: communeFinale,
        quartier: quartier.trim(),
        whatsappVerified: true,
        is_visible: true,
        createdAt: nowIso,
      };

      localStorage.setItem("wenze_user", JSON.stringify(nouveauMembre));

      const rawAll = localStorage.getItem("wenze_all_users");
      const allUsers = rawAll ? JSON.parse(rawAll) : [];
      const nextUsers = [
        nouveauMembre,
        ...(Array.isArray(allUsers) ? allUsers : []).filter(
          (u: any) =>
            cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "") !==
            telClean
        ),
      ].slice(0, 500);
      localStorage.setItem("wenze_all_users", JSON.stringify(nextUsers));

      if (typeCompte !== "client") {
        await enregistrerBoutiqueEtNotifierDG({
          id: `B-${telClean}`,
          nom: nomAfficheProfil,
          nomEtablissement: nomAfficheProfil,
          proprietaire: nomPrenom.trim(),
          telephone: telClean,
          whatsapp: telClean,
          ownerWhatsapp: telClean,
          role: typeCompte,
          activite: activite.trim(),
          pays,
          province: provinceFinale,
          commune: communeFinale,
          quartier: quartier.trim(),
          code_amb: codeAmbPropre || undefined,
          statut: "ACTIF",
          is_visible: true,
          createdAt: nowIso,
        });
      }

      journaliserInscription(
        "INSCRIPTION_TERMINEE",
        telClean,
        `role:${typeCompte};prov:${provinceFinale};commune:${communeFinale};quartier:${quartier.trim()}`
      );

      showToast(`Compte ${nomAfficheProfil} créé avec succès !`);
      setTimeout(() => {
        router.push(typeCompte === "client" ? "/" : "/profil");
      }, 700);
    } catch {
      setErreur("Erreur lors de l'enregistrement du compte.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-4 pb-24">
      {toast && (
        <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center fixed top-4 left-4 right-4 z-50 max-w-[400px] mx-auto shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between text-xs mb-3">
        <Link href="/connexion" className="font-bold text-[#6C3CE0]">
          ← Retour connexion
        </Link>
        <span className="text-[11px] font-semibold text-gray-600">
          {usd(1)} = {toCDFString(1)} • Taux {TAUX_CDF}
        </span>
      </div>

      {/* INDICATEUR DES 3 ÉTAPES */}
      <div className="rounded-3xl bg-black p-5 text-white">
        <span className="text-[10px] font-black uppercase tracking-wider text-orange-300">
          Inscription Wenze Wenze Business • Étape{" "}
          {etape === "numero" ? "1/3" : etape === "auth" ? "2/3" : "3/3"}
        </span>
        <h1 className="mt-1 text-xl font-black">
          {etape === "numero"
            ? "Ton numéro de téléphone"
            : etape === "auth"
            ? "Authentification du numéro"
            : "Ton activité & localisation"}
        </h1>
        <p className="mt-1 text-[11px] text-white/75">
          0 % commission • {maxFreeImages} images max / {freeDays}j puis{" "}
          <code>is_visible = false</code> • Max {plafondActives} actives
        </p>
      </div>

      {/* ÉTAPE 1 : SAISIE DU NUMÉRO */}
      {etape === "numero" && (
        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 space-y-4">
          <p className="text-xs text-gray-600">
            Entre ton numéro de téléphone pour passer à la page
            d&apos;authentification.
          </p>

          <div>
            <label
              htmlFor="reg-tel"
              className="block text-[11px] font-bold uppercase text-gray-600"
            >
              Numéro de téléphone
            </label>
            <input
              id="reg-tel"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnvoyerCode()}
              placeholder="Ex: 0825000000"
              className="mt-1.5 w-full rounded-2xl border-2 border-black bg-[#FAFAFA] px-4 py-3.5 text-center text-base font-black text-black outline-none"
            />
          </div>

          {erreur ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {erreur}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleEnvoyerCode}
            className="w-full rounded-full bg-black py-3.5 text-[13px] font-black text-white"
          >
            Continuer vers l&apos;authentification →
          </button>
        </div>
      )}

      {/* ÉTAPE 2 : AUTHENTIFICATION OTP */}
      {etape === "auth" && (
        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 space-y-4">
          <p className="text-xs text-gray-600">
            Entre le code à 6 chiffres envoyé au{" "}
            <b>0{cle9(telephone).slice(-9)}</b>. Expire dans{" "}
            <b className="text-red-600">
              {Math.floor(tempsRestant / 60)}:
              {(tempsRestant % 60).toString().padStart(2, "0")}
            </b>
          </p>

          <input
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
            }
            onKeyDown={(e) => e.key === "Enter" && handleValiderOtp()}
            placeholder="Code à 6 chiffres"
            className="w-full rounded-2xl border-2 border-black bg-[#FAFAFA] py-3.5 text-center text-[22px] font-black tracking-[8px] text-black outline-none"
          />

          {erreur ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {erreur}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleValiderOtp}
            className="w-full rounded-full bg-black py-3.5 text-[13px] font-black text-white"
          >
            Valider mon numéro
          </button>

          <button
            type="button"
            onClick={() => setEtape("numero")}
            className="w-full text-[11px] text-gray-500 underline"
          >
            Modifier le numéro
          </button>
        </div>
      )}

      {/* ÉTAPE 3 : FENÊTRE CHOIX D'ACTIVITÉ, LOCALISATION ET COORDONNÉES */}
      {etape === "activite" && (
        <form
          onSubmit={handleFinaliserInscription}
          className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 space-y-4"
        >
          {/* TYPE DE COMPTE */}
          <div>
            <p className="text-[11px] font-bold uppercase text-gray-600">
              Précise ton activité *
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => choisirTypeCompte("client")}
                className={`rounded-2xl border p-3 text-left transition ${
                  typeCompte === "client"
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-[#FAFAFA] text-black"
                }`}
              >
                <div className="text-xs font-black">🛍️ Compte Client</div>
                <div
                  className={`text-[10px] ${
                    typeCompte === "client" ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  Acheter sur Wenze
                </div>
              </button>

              <button
                type="button"
                onClick={() => choisirTypeCompte("vendeur")}
                className={`rounded-2xl border p-3 text-left transition ${
                  typeCompte === "vendeur"
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-[#FAFAFA] text-black"
                }`}
              >
                <div className="text-xs font-black">🏪 Boutique</div>
                <div
                  className={`text-[10px] ${
                    typeCompte === "vendeur" ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  Vendre mes produits
                </div>
              </button>

              <button
                type="button"
                onClick={() => choisirTypeCompte("grossiste")}
                className={`rounded-2xl border p-3 text-left transition ${
                  typeCompte === "grossiste"
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-[#FAFAFA] text-black"
                }`}
              >
                <div className="text-xs font-black">📦 Grossiste</div>
                <div
                  className={`text-[10px] ${
                    typeCompte === "grossiste"
                      ? "text-white/75"
                      : "text-gray-500"
                  }`}
                >
                  Vente & prix gros
                </div>
              </button>

              <button
                type="button"
                onClick={() => choisirTypeCompte("prestataire")}
                className={`rounded-2xl border p-3 text-left transition ${
                  typeCompte === "prestataire"
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-[#FAFAFA] text-black"
                }`}
              >
                <div className="text-xs font-black">🛠️ Prestataire</div>
                <div
                  className={`text-[10px] ${
                    typeCompte === "prestataire"
                      ? "text-white/75"
                      : "text-gray-500"
          }`}
                >
                  Vente & prix gros
                </div>
              </button>

              <button
                type="button"
                onClick={() => choisirTypeCompte("prestataire")}
                className={`rounded-2xl border p-3 text-left transition ${
                  typeCompte === "prestataire"
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-[#FAFAFA] text-black"
                }`}
              >
                <div className="text-xs font-black">🛠️ Prestataire</div>
                <div
                  className={`text-[10px] ${
                    typeCompte === "prestataire"
                      ? "text-white/75"
                      : "text-gray-500"
                  }`}
                >
                  Proposer un service
                </div>
              </button>
            </div>
          </div>

          {/* NOM & PRÉNOM */}
          <div>
            <label
              htmlFor="nom-prenom"
              className="block text-[11px] font-bold uppercase text-gray-600"
            >
              Nom et prénom {typeCompte !== "client" ? "personnel" : ""} *
            </label>
            <input
              id="nom-prenom"
              type="text"
              value={nomPrenom}
              onChange={(e) => setNomPrenom(e.target.value)}
              placeholder="Ex: Kelvin Kongolo"
              className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-black outline-none focus:border-black"
            />
          </div>

          {/* CHAMPS SPÉCIFIQUES BOUTIQUE / GROSSISTE / PRESTATAIRE */}
          {typeCompte !== "client" && (
            <>
              <div>
                <label
                  htmlFor="nom-profil-public"
                  className="block text-[11px] font-bold uppercase text-gray-600"
                >
                  {typeCompte === "vendeur"
                    ? "Nom de la boutique (affiché sur ton profil) *"
                    : typeCompte === "grossiste"
                    ? "Nom de l'établissement grossiste (affiché sur ton profil) *"
                    : "Nom du service / enseigne (affiché sur ton profil) *"}
                </label>
                <input
                  id="nom-profil-public"
                  type="text"
                  value={nomProfilPublic}
                  onChange={(e) => setNomProfilPublic(e.target.value)}
                  placeholder={
                    typeCompte === "vendeur"
                      ? "Ex: Boutique Bilamba Gombe"
                      : typeCompte === "grossiste"
                      ? "Ex: Dépôt Central Kinshasa"
                      : "Ex: Salon Éclat Lemba"
                  }
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-black outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="activite-select"
                  className="block text-[11px] font-bold uppercase text-gray-600"
                >
                  Domaine d&apos;activité *
                </label>
                <select
                  id="activite-select"
                  value={activite}
                  onChange={(e) => setActivite(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-black outline-none focus:border-black"
                >
                  {ACTIVITES_PAR_TYPE[typeCompte].map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* BLOC LOCALISATION PRÉCISE */}
          <div className="rounded-2xl border border-gray-200 bg-[#FFFBF0] p-3.5 space-y-3">
            <p className="text-[11px] font-black uppercase text-black">
              📍 Localisation précise
            </p>

            {/* 1. PAYS */}
            <div>
              <label
                htmlFor="pays-select"
                className="block text-[11px] font-bold uppercase text-gray-600"
              >
                Pays *
              </label>
              <select
                id="pays-select"
                value={pays}
                onChange={(e) => {
                  setPays(e.target.value);
                  setErreur("");
                }}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black"
              >
                {PAYS_LISTE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. PROVINCE (26 PROVINCES RDC) */}
            {estRDC && (
              <div>
                <label
                  htmlFor="province-select"
                  className="block text-[11px] font-bold uppercase text-gray-600"
                >
                  Province (26 provinces RDC) *
                </label>
                <select
                  id="province-select"
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setErreur("");
                  }}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black"
                >
                  {PROVINCES_RDC_26.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. COMMUNE (24 COMMUNES DE KINSHASA) OU VILLAGE/VILLE */}
            {estKinshasa ? (
              <div>
                <label
                  htmlFor="commune-kin-24"
                  className="block text-[11px] font-bold uppercase text-gray-600"
                >
                  Commune de Kinshasa (24 communes) *
                </label>
                <select
                  id="commune-kin-24"
                  value={communeKin}
                  onChange={(e) => setCommuneKin(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black"
                >
                  {COMMUNES_KINSHASA_24.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="commune-village-input"
                  className="block text-[11px] font-bold uppercase text-gray-600"
                >
                  Commune, ville, territoire ou village *
                </label>
                <input
                  id="commune-village-input"
                  type="text"
                  value={communeOuVillage}
                  onChange={(e) => setCommuneOuVillage(e.target.value)}
                  placeholder="Ex: Matadi, Lubumbashi, Mbanza-Ngungu, village..."
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black"
                />
              </div>
            )}

            {/* 4. QUARTIER */}
            <div>
              <label
                htmlFor="quartier-input"
                className="block text-[11px] font-bold uppercase text-gray-600"
              >
                Quartier *
              </label>
              <input
                id="quartier-input"
                type="text"
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                placeholder="Ex: Quartier Salongo, Matonge, GB, Binza..."
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black"
              />
            </div>
          </div>

          {/* GMAIL FACULTATIF */}
          <div>
            <label
              htmlFor="gmail-opt"
              className="block text-[11px] font-bold uppercase text-gray-600"
            >
              Compte Gmail (facultatif)
            </label>
            <input
              id="gmail-opt"
              type="email"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              placeholder="exemple@gmail.com"
              className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-black outline-none focus:border-black"
            />
          </div>

          {/* CODE AMBASSADEUR FACULTATIF */}
          <div>
            <label
              htmlFor="code-amb-opt"
              className="block text-[11px] font-bold uppercase text-gray-600"
            >
              Code d&apos;ambassadeur (facultatif)
            </label>
            <input
              id="code-amb-opt"
              type="text"
              value={codeAmbassadeur}
              onChange={(e) => setCodeAmbassadeur(e.target.value.toUpperCase())}
              placeholder="Ex: AMB-KIN-01"
              className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-black outline-none focus:border-black"
            />
          </div>

          {erreur ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {erreur}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={chargement}
            className="w-full rounded-full bg-black py-3.5 text-[13px] font-black text-white disabled:opacity-50"
          >
            {chargement ? "Création du compte..." : "Créer mon compte Wenze"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense
      fallback={<div className="max-w-[430px] mx-auto p-6">Chargement...</div>}
    >
      <InscriptionContent />
    </Suspense>
  );
}
