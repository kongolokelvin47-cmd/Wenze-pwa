"use client";

import { useState } from "react";
import Link from "next/link";
import { COMMUNES_KINSHASA } from "@/lib/zones";
import { majCompte } from "@/lib/connexion";
import {
  FREEMIUM,
  PAIEMENT_MINIMUM_USD,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
} from "@/lib/paiement";

const CHAMP =
  "w-full mt-1 border rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-black bg-white";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

const ROLES_INVITATION_AUTORISES = ["client", "vendeur", "prestataire"] as const;
type RoleInvitation = (typeof ROLES_INVITATION_AUTORISES)[number];

function getRole(compte: any): string {
  if (compte?.role) return String(compte.role).toLowerCase();
  if (compte?.estVendeur) return "vendeur";
  if (compte?.estPrestataire) return "prestataire";
  if (compte?.estGrossiste) return "grossiste";
  return "client";
}

function estCompteInterneOuAdmin(compte: any): boolean {
  const role = getRole(compte);
  const roleAdmin = String(compte?.roleAdmin || "").toLowerCase();
  return (
    roleAdmin === "dg" ||
    roleAdmin === "ambassadeur" ||
    roleAdmin === "superviseur" ||
    role === "dg" ||
    role === "ambassadeur" ||
    role === "superviseur"
  );
}

function tracerModificationProfil(compte: any, champs: Record<string, any>) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("wenze_journal");
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action: "PROFIL_MODIFIE",
      acteurWhatsapp: compte?.ownerWhatsapp || compte?.whatsapp || "",
      role: getRole(compte),
      champsModifies: Object.keys(champs),
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

/* ---------- Modification des informations du compte ---------- */
export function EditForm({
  compte,
  onSaved,
  onCancel,
}: {
  compte: any;
  onSaved: (c: any) => void;
  onCancel: () => void;
}) {
  const role = getRole(compte);
  const estClient = role === "client";
  const estVendeur = role === "vendeur";
  const estGrossiste = role === "grossiste";
  const estPrestataire = role === "prestataire";
  const estVendeurOuGrossiste = estVendeur || estGrossiste;

  const [nom, setNom] = useState<string>(compte.nom || "");
  const [boutique, setBoutique] = useState<string>(
    compte.nomBoutique || compte.nomEtablissement || ""
  );
  const [commune, setCommune] = useState<string>(compte.commune || "Gombe");
  const [email, setEmail] = useState<string>(compte.email || "");
  const [activite, setActivite] = useState<string>(
    compte.activiteId || compte.metier || ""
  );
  const [zone, setZone] = useState<string>(
    compte.zone || compte.commune || ""
  );
  const [prixPrestation, setPrixPrestation] = useState<string>(
    compte.prixPrestation ? String(compte.prixPrestation) : ""
  );
  const [minimumCommande, setMinimumCommande] = useState<string>(
    compte.minimumCommande ? String(compte.minimumCommande) : "10"
  );
  const [uniteGros, setUniteGros] = useState<string>(
    compte.uniteGros || "Carton"
  );
  const [erreur, setErreur] = useState("");

  const enregistrer = () => {
    setErreur("");
    if (nom.trim().length < 2) return setErreur("Indiquez votre nom");
    if (estVendeurOuGrossiste && boutique.trim().length < 2) {
      return setErreur("Indiquez le nom de votre boutique");
    }
    if (estPrestataire && !activite) {
      return setErreur("Choisissez votre métier");
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return setErreur("Adresse e-mail invalide");
    }

    const champs: any = {
      nom: nom.trim(),
      name: nom.trim(),
      commune,
      email: email.trim(),
      role,
    };

    if (estVendeurOuGrossiste) {
      champs.nomBoutique = boutique.trim();
      champs.nomEtablissement = boutique.trim();
      champs.boutiqueName = boutique.trim();
    } else if (estClient) {
      champs.nomEtablissement = nom.trim();
    }

    if (estPrestataire) {
      champs.activiteId = activite;
      champs.metier = activite;
      champs.zone = zone.trim() || commune;
      const prixNum = Number(prixPrestation || 0);
      champs.prixPrestation = prixNum > 0 ? prixNum : null;
      champs.prixADiscuter = prixNum === 0;
      champs.nomEtablissement = nom.trim();
    }

    if (estGrossiste) {
      champs.minimumCommande = Math.max(1, Number(minimumCommande || 10));
      champs.uniteGros = uniteGros || "Carton";
    }

    const r: any = majCompte(champs);
    if (!r?.ok) {
      return setErreur(r?.erreur || "Enregistrement impossible");
    }
    tracerModificationProfil(compte, champs);
    onSaved(r.compte);
  };

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <div>
        <label className="text-[11px] font-bold" htmlFor="e-nom">
          Votre nom
        </label>
        <input
          id="e-nom"
          value={nom}
          onChange={(e: any) => setNom(e.target.value)}
          className={CHAMP}
        />
      </div>

      {estVendeurOuGrossiste ? (
        <div>
          <label className="text-[11px] font-bold" htmlFor="e-bout">
            Nom de la boutique
          </label>
          <input
            id="e-bout"
            value={boutique}
            onChange={(e: any) => setBoutique(e.target.value)}
            className={CHAMP}
            placeholder="Ex : Boutique Wenze"
          />
        </div>
      ) : null}

      {estPrestataire ? (
        <>
          <div>
            <label className="text-[11px] font-bold" htmlFor="e-metier">
              Ton métier
            </label>
            <select
              id="e-metier"
              value={activite}
              onChange={(e: any) => setActivite(e.target.value)}
              className={CHAMP}
            >
              <option value="">Choisir...</option>
              <option value="plomberie">🔧 Plombier</option>
              <option value="electricite">⚡ Électricien</option>
              <option value="coiffure">💇 Coiffeur / Coiffeuse</option>
              <option value="menage">🧹 Ménage / Repassage</option>
              <option value="maconnerie">🧱 Maçon</option>
              <option value="peinture">🎨 Peintre</option>
              <option value="menuiserie">🪚 Menuisier</option>
              <option value="mecanique">🔩 Mécanicien</option>
              <option value="livraison">🛵 Livreur</option>
              <option value="autre">✨ Autre service</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold" htmlFor="e-zone">
              Zone d&apos;intervention (Kinshasa)
            </label>
            <input
              id="e-zone"
              value={zone}
              onChange={(e: any) => setZone(e.target.value)}
              className={CHAMP}
              placeholder="Ex : Lemba, Matete"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold" htmlFor="e-prix">
              À partir de (USD) - facultatif
            </label>
            <input
              id="e-prix"
              value={prixPrestation}
              onChange={(e: any) =>
                setPrixPrestation(e.target.value.replace(/[^0-9.]/g, ""))
              }
              className={CHAMP}
              placeholder="Laisse vide = Prix à discuter"
              inputMode="decimal"
            />
            {!prixPrestation ? (
              <p className="text-[10px] text-purple-600 font-bold mt-1">
                💬 Sera affiché : Prix à discuter
              </p>
            ) : (
              <p className="text-[10px] text-gray-600 mt-1">
                {usd(Number(prixPrestation || 0))} /{" "}
                {toCDFString(Number(prixPrestation || 0))}
              </p>
            )}
          </div>
        </>
      ) : null}

      {estGrossiste ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold" htmlFor="e-min">
              Commande minimum
            </label>
            <input
              id="e-min"
              value={minimumCommande}
              onChange={(e: any) =>
                setMinimumCommande(e.target.value.replace(/[^0-9]/g, ""))
              }
              className={CHAMP}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold" htmlFor="e-unite">
              Unité gros
            </label>
            <select
              id="e-unite"
              value={uniteGros}
              onChange={(e: any) => setUniteGros(e.target.value)}
              className={CHAMP}
            >
              <option>Carton</option>
              <option>Sac</option>
              <option>Balle</option>
              <option>Paquet</option>
              <option>Pièce</option>
            </select>
          </div>
        </div>
      ) : null}

      <div>
        <label className="text-[11px] font-bold" htmlFor="e-com">
          Commune
        </label>
        <select
          id="e-com"
          value={commune}
          onChange={(e: any) => setCommune(e.target.value)}
          className={CHAMP}
        >
          {COMMUNES_KINSHASA.map((c: string) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[11px] font-bold" htmlFor="e-mail">
          E-mail (facultatif)
        </label>
        <input
          id="e-mail"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
          type="email"
          className={CHAMP}
        />
      </div>

      <p className="text-[10px] text-gray-400">
        Le numéro WhatsApp est votre identifiant : il ne peut pas être modifié.
        Les modifications sont tracées dans le journal (0 % commission).
      </p>

      {erreur ? (
        <p role="alert" className="text-[11px] font-bold text-red-600">
          {erreur}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="bg-white border-2 py-3 rounded-full font-bold text-[12px]"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={enregistrer}
          className="bg-black text-white py-3 rounded-full font-black text-[12px]"
        >
          Enregistrer
        </button>
      </div>

      {estClient ? (
        <p className="text-[10px] text-gray-500 text-center">
          Tu es Client. Pour vendre, ouvre une boutique.
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Cartes d'état du compte ---------- */
export function CartesEtat({ compte, ab }: { compte: any; ab: any }) {
  const role = getRole(compte);
  const estClient = role === "client";
  const estPrestataire = role === "prestataire";
  const estGrossiste = role === "grossiste";
  const estVendeurOuGrossiste = role === "vendeur" || estGrossiste;
  const niveau = compte.niveau || 1;
  const minUsd = Number(PAIEMENT_MINIMUM_USD || 1);

  return (
    <>
      {estClient ? (
        <div className="bg-black text-white rounded-2xl p-4">
          <p className="font-black text-[14px]">🏪 Envie de vendre ?</p>
          <p className="text-[11px] text-white/80 mt-1">
            Ouvrez votre boutique en 1 minute (0 % commission, max{" "}
            {PLAFOND_ACTIVES} annonces actives). Offre gratuite :{" "}
            {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours puis masquage
            (is_visible = false), ou ticket dès {usd(minUsd)} (
            {toCDFString(minUsd)}).
          </p>
          <Link
            href="/onboarding"
            className="mt-3 block text-center bg-white text-black rounded-full py-3 font-black text-[12px]"
          >
            Ouvrir ma boutique
          </Link>
        </div>
      ) : null}

      {estPrestataire ? (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <p className="font-black text-[13px]">🔧 Ton statut Prestataire</p>
          <p className="text-[11px] text-gray-600 mt-1">
            Service : <b>{compte.activiteId || compte.metier || "—"}</b> •
            Zone : <b>{compte.zone || compte.commune || "Kinshasa"}</b>
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            Prix :{" "}
            <b>
              {compte.prixADiscuter || !compte.prixPrestation
                ? "💬 Prix à discuter"
                : `${usd(Number(compte.prixPrestation))} / ${toCDFString(Number(compte.prixPrestation))}`}
            </b>
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            0 % de commission sur vos prestations • Pas de ticket d&apos;annonce
            produit.
          </p>
        </div>
      ) : null}

      {estVendeurOuGrossiste ? (
        <div className="bg-white border-2 border-black rounded-2xl p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <p className="font-black text-[13px]">
                {ab && ab.badge ? ab.badge + " " : ""}Mon abonnement
              </p>
              <p className="text-[11px] text-gray-600 mt-1">
                {ab && ab.message ? ab.message : "Chargement…"}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                0 % commission • Plafond : {PLAFOND_ACTIVES} actives • Freemium
                : {MAX_FREE_IMAGES} images max / {FREE_DAYS}j → masquage
                (is_visible = false).
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/abonnement"
              className="bg-black text-white rounded-full py-2.5 text-center text-[11px] font-black"
            >
              Abonnements
            </Link>
            <Link
              href={estGrossiste ? "/publier?gros=1" : "/publier"}
              className="bg-white border-2 border-black rounded-full py-2.5 text-center text-[11px] font-black"
            >
              + Publier
            </Link>
          </div>
        </div>
      ) : null}

      {estVendeurOuGrossiste && niveau < 2 && !compte.whatsappVerifie ? (
        <div className="bg-white border-2 border-dashed rounded-2xl p-4">
          <p className="font-black text-[12px]">
            ✔️ Vérifier mon numéro WhatsApp
          </p>
          <p className="text-[10px] text-gray-600 mt-1">
            La vérification débloquera vos {MAX_FREE_IMAGES} images gratuites
            sur {FREE_DAYS} jours et le badge « Numéro vérifié ».
          </p>
        </div>
      ) : null}
    </>
  );
}

/* ---------- Invitations réseau (Client, Boutique/Vendeur, Prestataire uniquement) ---------- */
const ETATS: Record<string, string> = {
  invité: "En attente",
  inscrit: "Inscrit(e)",
  validé: "Validé(e)",
  expiré: "Expirée",
};

const LABEL_TYPE: Record<RoleInvitation, string> = {
  client: "Client",
  vendeur: "Boutique",
  prestataire: "Prestataire",
};

function lireInvitationsLocales(waDigits: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem("wenze_invitations_list");
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter(
      (i: any) =>
        String(i.parWhatsapp || "").replace(/[^0-9]/g, "") === waDigits
    );
  } catch {
    return [];
  }
}

function reste(inv: any): string {
  if (inv.status !== "invité" || !inv.reservedUntil) return "";
  const h = Math.max(
    0,
    Math.ceil((new Date(inv.reservedUntil).getTime() - Date.now()) / 3600000)
  );
  return " · expire dans " + h + " h";
}

export function InvitationsCard({
  compte,
  onToast,
}: {
  compte: any;
  onToast: (m: string) => void;
}) {
  const role = getRole(compte);
  const estAutorise =
    !estCompteInterneOuAdmin(compte) &&
    (ROLES_INVITATION_AUTORISES as readonly string[]).includes(role);

  const [nom, setNom] = useState("");
  const [numero, setNumero] = useState("");
  const [type, setType] = useState<RoleInvitation>("client");
  const [erreur, setErreur] = useState("");
  const [tick, setTick] = useState(0);

  if (!estAutorise) return null;

  const wa = String(compte.ownerWhatsapp || compte.whatsapp || "");
  const waDigits = wa.replace(/[^0-9]/g, "");
  const toutes = lireInvitationsLocales(waDigits);
  const total = 5;
  const libres = Math.max(0, total - toutes.length);
  const liste = toutes.slice(-5).reverse();
  const code = compte.codeInvitation || compte.monCode || "";

  const envoyer = () => {
    setErreur("");
    const digitsCible = numero.replace(/[^0-9]/g, "");
    if (nom.trim().length < 2) {
      return setErreur("Indiquez le nom de l'invité");
    }
    if (digitsCible.length < 9) {
      return setErreur("Numéro WhatsApp invalide");
    }
    if (libres <= 0) {
      return setErreur("Plus de places d'invitation disponibles");
    }
    if (!ROLES_INVITATION_AUTORISES.includes(type)) {
      return setErreur("Rôle non autorisé pour l'invitation");
    }

    try {
      const raw = localStorage.getItem("wenze_invitations_list");
      const list = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(list) ? list : [];
      const inv = {
        id: "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        parWhatsapp: waDigits,
        inviteNom: nom.trim(),
        inviteWhatsapp: digitsCible,
        type,
        status: "invité",
        reservedUntil: new Date(Date.now() + 48 * 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      arr.push(inv);
      localStorage.setItem("wenze_invitations_list", JSON.stringify(arr));
      tracerModificationProfil(compte, { invitationCreee: type });

      const texte = encodeURIComponent(
        `Bonjour ${nom.trim()}, rejoins Wenze Wenze (${LABEL_TYPE[type]}) : https://wenze.cd`
      );
      const lien = `https://wa.me/${digitsCible}?text=${texte}`;
      setNom("");
      setNumero("");
      setTick((t) => t + 1);
      onToast("Invitation prête : envoyez le message sur WhatsApp");
      window.open(lien, "_blank", "noopener");
    } catch {
      setErreur("Invitation impossible");
    }
  };

  const copier = () => {
    if (!code) return;
    try {
      navigator.clipboard.writeText(code).then(() => onToast("Code copié"));
    } catch {}
  };

  return (
    <div
      className="bg-white border-2 border-dashed rounded-2xl p-4"
      data-tick={tick}
    >
      <div className="flex justify-between items-center">
        <p className="font-black text-[13px]">🎟️ Inviter un ami</p>
        <span className="text-[10px] font-black bg-black text-white px-2.5 py-1 rounded-full">
          {libres}/{total} places
        </span>
      </div>
      <p className="text-[10px] text-gray-600 mt-1">
        Réservé aux clients, boutiques et prestataires. La place est réservée
        48 h.
      </p>
      {code ? (
        <button
          type="button"
          onClick={copier}
          className="mt-2 text-[10px] bg-[#FFFBF0] border rounded-full px-3 py-1 font-bold"
        >
          Mon code : {code} · copier
        </button>
      ) : null}

      <div className="flex flex-wrap gap-2 mt-3">
        {ROLES_INVITATION_AUTORISES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={
                   "px-3 py-2 rounded-full text-[11px] font-black border-2 " +
              (type === t
                ? "bg-black text-white border-black"
                : "bg-white")
            }
          >
            {LABEL_TYPE[t]}
          </button>
        ))}
      </div>

      <input
        value={nom}
        onChange={(e: any) => setNom(e.target.value)}
        placeholder="Nom de l'invité"
        className={CHAMP}
      />
      <input
        value={numero}
        onChange={(e: any) => setNumero(e.target.value)}
        placeholder="Son numéro WhatsApp, ex : 082 500 0000"
        type="tel"
        inputMode="tel"
        className={CHAMP}
      />

      {erreur ? (
        <p role="alert" className="text-[11px] font-bold text-red-600 mt-2">
          {erreur}
        </p>
      ) : null}

      <button
        type="button"
        onClick={envoyer}
        className="w-full mt-3 bg-[#25D366] text-white py-3.5 rounded-full font-black text-[12px]"
      >
        Préparer le message WhatsApp
      </button>

      {liste.length > 0 ? (
        <div className="mt-3 border rounded-xl divide-y">
          {liste.map((inv: any) => (
            <div
              key={inv.id}
              className="p-2.5 flex justify-between gap-2 text-[10px]"
            >
              <span className="truncate">
                {inv.inviteNom} • {LABEL_TYPE[inv.type as RoleInvitation] || inv.type}
              </span>
              <span className="font-bold shrink-0">
                {(ETATS[inv.status] || inv.status) + reste(inv)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
