"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  lireSession,
  majCompte,
  deconnecter,
  cle9,
  niveauDe,
} from "@/lib/connexion";
import { compresserImage } from "@/lib/images";
import {
  toCDFString,
  usd,
  verifierAbonnement,
  libererPlace,
  MAX_ANNONCES_ACTIVES,
} from "@/lib/paiement";
import { EditForm, CartesEtat, InvitationsCard } from "./profil-parts";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));

const BADGE_ROLE: Record<string, string> = {
  client: "👤 CLIENT",
  vendeur: "🛍️ BOUTIQUE",
  grossiste: "🏭 GROSSISTE",
  prestataire: "🔧 PRESTATAIRE",
};

interface EntreeJournal {
  id: string;
  ts?: number;
  date: string;
  role: string;
  type: "navigation" | "panier" | "annonce" | "contact" | "compte";
  message: string;
}

function lireListe(cle: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const v = JSON.parse(localStorage.getItem(cle) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function ecrireListe(cle: string, val: any[]): boolean {
  try {
    if (typeof window === "undefined") return false;
    localStorage.setItem(cle, JSON.stringify(val));
    return true;
  } catch {
    return false;
  }
}

function formaterWa(wa: any): string {
  const d = (wa || "").toString().replace(/[^0-9]/g, "");
  return d.length === 12
    ? "+243 " + d.slice(3, 5) + " " + d.slice(5, 8) + " " + d.slice(8)
    : d
    ? "+" + d
    : "";
}

function temps(a: any): number {
  return (
    new Date(a.createdAt || a.created_at || a.updatedAt || 0).getTime() || 0
  );
}

export default function ProfilPage() {
  const router = useRouter();
  const fichier = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [compte, setCompte] = useState<any>(null);
  const [ab, setAb] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [demandes, setDemandes] = useState<any[]>([]);
  const [mesServices, setMesServices] = useState<any[]>([]);
  const [panierCount, setPanierCount] = useState(0);
  const [journal, setJournal] = useState<EntreeJournal[]>([]);
  const [filtreJournal, setFiltreJournal] = useState<string>("tous");
  const [edition, setEdition] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const afficher = useCallback((m: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(m);
    toastTimerRef.current = setTimeout(() => setToast(""), 3000);
  }, []);

  const enregistrerJournal = useCallback(
    (
      type: EntreeJournal["type"],
      message: string,
      roleActuel?: string
    ) => {
      const prev = lireListe("wenze_journal_activite") as EntreeJournal[];
      const entry: EntreeJournal = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        date: new Date().toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        role: roleActuel || String(compte?.role || "client"),
        type,
        message,
      };
      const next = [entry, ...prev].slice(0, 60);
      ecrireListe("wenze_journal_activite", next);
      setJournal(next);
    },
    [compte?.role]
  );

  const chargerTout = useCallback(
    (sessionCourante?: any) => {
      const s: any = sessionCourante || lireSession();
      if (!s) return null;
      setCompte(s);
      try {
        setAb(verifierAbonnement());
      } catch {}

      const k = cle9(s.ownerWhatsapp || s.whatsapp);
      setAnnonces(
        lireListe("wenze_annonces_list")
          .filter(
            (a: any) => cle9(a.ownerWhatsapp || a.whatsapp || a.userId) === k
          )
          .sort((a: any, b: any) => temps(b) - temps(a))
      );
      setDemandes(
        lireListe("wenze_demandes_list")
          .filter(
            (d: any) => cle9(d.prestataireWa || d.prestataireWhatsapp) === k
          )
          .sort((a: any, b: any) => temps(b) - temps(a))
      );
      setMesServices(
        lireListe("wenze_services_list")
          .filter(
            (sv: any) =>
              cle9(sv.ownerWhatsapp || sv.whatsapp || sv.userId) === k
          )
          .sort((a: any, b: any) => temps(b) - temps(a))
      );
      setPanierCount(lireListe("wenze_panier").length);
      setJournal(lireListe("wenze_journal_activite") as EntreeJournal[]);
      return s;
    },
    []
  );

  useEffect(() => {
    const s = chargerTout();
    if (!s) {
      router.replace("/connexion?raison=action&next=%2Fprofil");
      return;
    }

    const sync = () => {
      chargerTout();
    };
    window.addEventListener("storage", sync);
    window.addEventListener("wenze-update", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("wenze-update", sync);
    };
  }, [chargerTout, router]);

  const changerPhoto = async (e: any) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = await compresserImage(f, 400);
      const r: any = majCompte({ photo: data, avatar: data });
      if (r?.ok) {
        setCompte(r.compte);
        enregistrerJournal(
          "compte",
          "Photo de profil mise à jour",
          r.compte?.role
        );
        afficher("Photo mise à jour");
      } else {
        afficher(r?.erreur || "Photo non enregistrée");
      }
    } catch (err: any) {
      afficher(err?.message || "Photo illisible");
    }
  };

  const supprimer = (id: string) => {
    if (!window.confirm("Supprimer cette annonce ? Sa place sera libérée.")) {
      return;
    }
    try {
      const cible = annonces.find((a: any) => String(a.id) === String(id));
      const reste = lireListe("wenze_annonces_list").filter(
        (a: any) => String(a.id) !== String(id)
      );
      localStorage.setItem("wenze_annonces_list", JSON.stringify(reste));
      try {
        libererPlace(id);
      } catch {}
      setAnnonces((prev: any[]) =>
        prev.filter((a: any) => String(a.id) !== String(id))
      );
      try {
        setAb(verifierAbonnement());
      } catch {}
      enregistrerJournal(
        "annonce",
        `Annonce supprimée : "${cible?.titre || `#${id}`}"`
      );
      afficher("Annonce supprimée, place libérée");
    } catch {
      afficher("Suppression impossible");
    }
  };

  const supprimerService = (id: string) => {
    if (!window.confirm("Supprimer ce service ?")) return;
    try {
      const cible = mesServices.find((s: any) => String(s.id) === String(id));
      const reste = lireListe("wenze_services_list").filter(
        (s: any) => String(s.id) !== String(id)
      );
      localStorage.setItem("wenze_services_list", JSON.stringify(reste));
      setMesServices((prev: any[]) =>
        prev.filter((s: any) => String(s.id) !== String(id))
      );
      enregistrerJournal(
        "annonce",
        `Service supprimé : "${cible?.titre || cible?.activite || `#${id}`}"`
      );
      afficher("Service supprimé");
    } catch {
      afficher("Suppression impossible");
    }
  };

  const viderJournal = () => {
    ecrireListe("wenze_journal_activite", []);
    setJournal([]);
    afficher("Journal d'activité effacé");
  };

  const sortir = () => {
    deconnecter();
    router.push("/connexion");
  };

  const statsActivite = useMemo(() => {
    const valeurCatalogueUsd = annonces.reduce(
      (sum: number, a: any) => sum + Number(a.prixUSD || a.prix || 0),
      0
    );
    const recommandeesCount = annonces.filter(
      (a: any) => a.recommandeParDG === true
    ).length;
    const evenementsJournal = journal.length;

    return {
      valeurCatalogueUsd,
      recommandeesCount,
      evenementsJournal,
      servicesCount: mesServices.length,
      demandesCount: demandes.length,
      panierCount,
    };
  }, [annonces, mesServices.length, demandes.length, panierCount, journal.length]);

  const journalFiltre = useMemo(() => {
    if (filtreJournal === "tous") return journal;
    return journal.filter((e) => e.type === filtreJournal);
  }, [journal, filtreJournal]);

  if (!compte) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-28 bg-white border rounded-2xl animate-pulse" />
      </div>
    );
  }

  const niveau: any = niveauDe(compte);
  const nomAffiche = compte.nomEtablissement || compte.nom || "Mon compte";
  const depuis = compte.createdAt
    ? new Date(compte.createdAt).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      })
    : "";
  const photo = compte.photo || compte.avatar || "";
  const libres =
    ab && ab.placesRestantes !== undefined ? ab.placesRestantes : null;

  const role = String(compte.role || "client").toLowerCase();
  const estClient = role === "client";
  const estVendeur = role === "vendeur";
  const estGrossiste = role === "grossiste";
  const estPrestataire = role === "prestataire";
  const estVendeurOuGrossiste = estVendeur || estGrossiste;
  const estDG =
    compte.roleAdmin === "dg" ||
    role === "dg" ||
    role === "ambassadeur" ||
    role === "superviseur";
  const peutInviter =
    !estDG && ["client", "vendeur", "grossiste", "prestataire"].includes(role);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link
          href="/"
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[16px] truncate">Mon profil</h1>
          <p className="text-[9px] text-gray-500">0 % commission sur vos ventes</p>
        </div>
        {estDG ? (
          <span className="text-[10px] px-3 py-1 rounded-full font-bold bg-red-600 text-white">
            DG
          </span>
        ) : null}
        {ab && ab.badge ? (
          <span className="text-[10px] px-3 py-1 rounded-full font-bold bg-black text-white">
            {ab.badge}
          </span>
        ) : null}
      </header>

      <div className="p-4 space-y-4">
        {toast ? (
          <div
            role="status"
            className="bg-black text-white p-3 rounded-xl text-[11px] font-bold text-center"
          >
            {toast}
          </div>
        ) : null}

        {/* ===== CARTE PROFIL ===== */}
        <div className="bg-white border-2 border-black rounded-[24px] p-5">
          <div className="flex gap-4 items-center">
            <div className="relative shrink-0">
              <div className="w-20 h-20 bg-black text-white rounded-[20px] flex items-center justify-center font-black text-[28px] overflow-hidden">
                {photo ? (
                  <img
                    src={photo}
                    alt="Ma photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  nomAffiche.slice(0, 1).toUpperCase()
                )}
              </div>
              <button
                type="button"
                aria-label="Changer la photo"
                onClick={() => fichier.current && fichier.current.click()}
                className="absolute -bottom-2 -right-2 bg-white border-2 border-black w-8 h-8 rounded-full flex items-center justify-center text-[13px]"
              >
                📷
              </button>
              <input
                ref={fichier}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={changerPhoto}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-black text-[18px] leading-tight truncate">
                {nomAffiche}
              </h2>
              <p className="text-[11px] text-gray-500 truncate">
                {formaterWa(compte.ownerWhatsapp || compte.whatsapp)}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span
                  className={
                    "text-[9px] font-black px-2 py-0.5 rounded-full border " +
                    (estClient
                      ? "bg-blue-50 text-blue-700"
                      : estGrossiste
                      ? "bg-orange-100 text-orange-800"
                      : estPrestataire
                      ? "bg-purple-100 text-purple-800"
                      : "bg-[#FFFBF0]")
                  }
                >
                  {BADGE_ROLE[role] || "Compte"}
                </span>
                <span
                  className={
                    "text-[9px] font-black px-2 py-0.5 rounded-full " +
                    (niveau.niveau >= 2
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600")
                  }
                >
                  {niveau.niveau >= 2 ? "✔ " : ""}
                  {niveau.titre}
                </span>
                {compte.recommandeParDG ? (
                  <span className="text-[9px] font-black bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    ⭐ RECOMMANDÉ
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 mt-3">
            {compte.province ? `${compte.province} • ` : ""}
            {compte.commune || "Kinshasa"}
            {compte.quartier ? ` • Q/ ${compte.quartier}` : ""}
            {compte.avenue ? ` • Av/ ${compte.avenue}` : ""}
            {depuis ? " • membre depuis " + depuis : ""}
          </p>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {estClient ? (
              <>
                <Link
                  href="/mes-commandes"
                  className="bg-[#FFFBF0] rounded-xl py-2.5 block"
                >
                  <p className="font-black text-[16px]">🛒</p>
                  <p className="text-[9px] text-gray-500">Mes achats</p>
                </Link>
                <Link
                  href="/favoris"
                  className="bg-[#FFFBF0] rounded-xl py-2.5 block"
                >
                  <p className="font-black text-[16px]">❤️</p>
                  <p className="text-[9px] text-gray-500">Favoris</p>
                </Link>
                <Link
                  href="/portefeuille"
                  className="bg-[#FFFBF0] rounded-xl py-2.5 block"
                >
                  <p className="font-black text-[16px]">💼</p>
                  <p className="text-[9px] text-gray-500">Portefeuille</p>
                </Link>
              </>
            ) : estPrestataire ? (
              <>
                <div className="bg-[#FFFBF0] rounded-xl py-2.5">
                  <p className="font-black text-[16px]">{demandes.length}</p>
                  <p className="text-[9px] text-gray-500">Demandes</p>
                </div>
                <div className="bg-[#FFFBF0] rounded-xl py-2.5">
                  <p className="font-black text-[16px]">{mesServices.length}</p>
                  <p className="text-[9px] text-gray-500">Services</p>
                </div>
                <Link
                  href="/portefeuille"
                  className="bg-[#FFFBF0] rounded-xl py-2.5 block"
                >
                  <p className="font-black text-[16px]">💼</p>
                  <p className="text-[9px] text-gray-500">Portefeuille</p>
                </Link>
              </>
            ) : (
              <>
                <div className="bg-[#FFFBF0] rounded-xl py-2.5">
                  <p className="font-black text-[16px]">{annonces.length}</p>
                  <p className="text-[9px] text-gray-500">
                    {estGrossiste ? "Produits gros" : "Annonces"} /{" "}
                    {PLAFOND_ACTIVES}
                  </p>
                </div>
                <div className="bg-[#FFFBF0] rounded-xl py-2.5">
                  <p className="font-black text-[16px]">
                    {libres !== null ? libres : "–"}
                  </p>
                  <p className="text-[9px] text-gray-500">Places libres</p>
                </div>
                <Link
                  href="/portefeuille"
                  className="bg-[#FFFBF0] rounded-xl py-2.5 block"
                >
                  <p className="font-black text-[16px]">💼</p>
                  <p className="text-[9px] text-gray-500">Portefeuille</p>
                </Link>
              </>
            )}
          </div>

          {estClient ? (
            <Link
              href="/ouvrir-boutique"
              className="mt-4 block w-full bg-black text-white rounded-full py-2.5 text-[12px] font-black text-center"
            >
              🛍️ Ouvrir ma boutique
            </Link>
          ) : estPrestataire ? (
            <Link
              href="/publier-service"
              className="mt-4 block w-full bg-black text-white rounded-full py-2.5 text-[12px] font-black text-center"
            >
              + Ajouter un service
            </Link>
          ) : estGrossiste ? (
            <Link
              href="/publier?gros=1"
              className="mt-4 block w-full bg-black text-white rounded-full py-2.5 text-[12px] font-black text-center"
            >
              + Publier un produit gros
            </Link>
          ) : estVendeur ? (
            <Link
              href="/publier"
              className="mt-4 block w-full bg-black text-white rounded-full py-2.5 text-[12px] font-black text-center"
            >
              + Publier une annonce
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => setEdition(!edition)}
            className="mt-2 w-full bg-white border-2 border-black rounded-full py-2.5 text-[12px] font-black"
          >
            {edition ? "Fermer" : "Modifier mes informations"}
          </button>

          {edition ? (
            <EditForm
              compte={compte}
              onCancel={() => setEdition(false)}
              onSaved={(c: any) => {
                setCompte(c);
                setEdition(false);
                enregistrerJournal(
                  "compte",
                  "Informations du profil enregistrées",
                  c?.role
                );
                afficher("Profil enregistré");
              }}
            />
          ) : null}
        </div>

        {/* ===== STATISTIQUES SUR LE DÉROULEMENT DES ACTIVITÉS ===== */}
        <div className="bg-white border rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="font-black text-[13px]">
              📊 Statistiques d&apos;activité
            </p>
            <span className="text-[10px] font-bold text-gray-500">
              {statsActivite.evenementsJournal} trace(s)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#FFFBF0] border rounded-xl p-3">
              <p className="text-[9px] font-bold text-gray-500">
                {estClient
                  ? "Articles au panier"
                  : estPrestataire
                  ? "Services & demandes"
                  : "Annonces recommandées"}
              </p>
              <p className="font-black text-[16px] mt-0.5">
                  {estClient
                  ? statsActivite.panierCount
                  : estPrestataire
                  ? `${statsActivite.servicesCount} / ${statsActivite.demandesCount}`
                  : `${statsActivite.recommandeesCount} / ${annonces.length}`}
              </p>
            </div>

            <div className="bg-[#FFFBF0] border rounded-xl p-3">
              <p className="text-[9px] font-bold text-gray-500">
                Valeur catalogue
              </p>
              <p className="font-black text-[13px] mt-1">
                {usd(statsActivite.valeurCatalogueUsd)} /{" "}
                {toCDFString(statsActivite.valeurCatalogueUsd)}
              </p>
            </div>
          </div>
        </div>

        {/* ===== DG : ACCÈS RAPIDE ===== */}
        {estDG ? (
          <div className="bg-black text-white rounded-2xl p-4">
            <p className="font-black text-[13px]">👑 Espace DG</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link
                href="/dg-prive"
                className="bg-white text-black py-2.5 rounded-full text-[11px] font-black text-center"
              >
                Bureau DG
              </Link>
              <Link
                href="/"
                className="bg-yellow-400 text-black py-2.5 rounded-full text-[11px] font-black text-center"
              >
                ★ Recommander
              </Link>
            </div>
          </div>
        ) : null}

        {estGrossiste ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="font-black text-[13px]">🏭 Mon espace Grossiste</p>
            <p className="text-[11px] text-gray-600 mt-1">
              Minimum de commande :{" "}
              <b>{compte.minimumCommande || 10} pièces</b>
            </p>
            <p className="text-[11px] text-gray-600">
              Unité : <b>{compte.uniteGros || "Carton"}</b>
            </p>
            <p className="text-[11px] text-gray-600">
              Prix gros : visible seulement par les Grossistes + DG
            </p>
            <Link
              href="/profil/gros"
              className="block text-center bg-orange-500 text-white py-2.5 rounded-full text-[11px] font-black mt-3"
            >
              Gérer mes prix gros
            </Link>
          </div>
        ) : null}

        {estPrestataire ? (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <p className="font-black text-[13px]">🔧 Mon service</p>
            <p className="text-[11px] text-gray-600 mt-1">
              Service :{" "}
              <b>{compte.activiteId || mesServices[0]?.activite || "—"}</b>
            </p>
            <p className="text-[11px] text-gray-600">
              Zone : <b>{compte.zone || compte.commune || "—"}</b>
            </p>
            <p className="text-[11px] text-gray-600">
              À partir de :{" "}
              <b>
                {mesServices[0]?.prixADiscuter || !mesServices[0]?.prixPrestation
                  ? "💬 Prix à discuter"
                  : `${usd(Number(mesServices[0]?.prixPrestation))} / ${toCDFString(Number(mesServices[0]?.prixPrestation))}`}
              </b>
            </p>
          </div>
        ) : null}

        {estClient ? (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="font-black text-[13px]">
              👀 Recommandé pour toi à {compte.commune || "Kinshasa"}
            </p>
            <p className="text-[11px] text-gray-600 mt-1">
              Tu vois seulement les boutiques vérifiées et recommandées par
              Wenze. Pour voir tout, ouvre ta boutique.
            </p>
            <Link
              href="/recommandes"
              className="block text-center bg-blue-600 text-white py-2.5 rounded-full text-[11px] font-black mt-3"
            >
              Voir les recommandations
            </Link>
          </div>
        ) : null}

        {estVendeurOuGrossiste ? <CartesEtat compte={compte} ab={ab} /> : null}
        {peutInviter ? <InvitationsCard compte={compte} onToast={afficher} /> : null}

        {estVendeurOuGrossiste ? (
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b">
              <p className="font-black text-[13px]">
                {estGrossiste ? "Mes produits gros" : "Mes annonces"} (
                {annonces.length}/{PLAFOND_ACTIVES})
              </p>
              <Link
                href={estGrossiste ? "/publier?gros=1" : "/publier"}
                className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black"
              >
                + Publier
              </Link>
            </div>
            {annonces.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl">📦</p>
                <p className="text-[12px] mt-2 font-bold">
                  Aucune annonce pour le moment
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Publiez votre premier produit en quelques secondes (0 %
                  commission).
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {annonces.map((a: any) => {
                  const pUsd = Number(a.prixUSD || a.prix || 0);
                  const gUsd = Number(a.prixGrosUSD || a.prixGros || 0);
                  return (
                    <div key={a.id} className="p-3 flex gap-3 items-center">
                      <div className="w-14 h-14 bg-[#FFFBF0] rounded-xl overflow-hidden flex items-center justify-center shrink-0 border">
                        {a.photo ? (
                          <img
                            src={a.photo}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>📦</span>
                        )}
                      </div>
                      <Link href={"/produit/" + a.id} className="flex-1 min-w-0">
                        <p className="font-bold text-[12px] truncate">
                          {a.titre}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {usd(pUsd)} / {toCDFString(pUsd)}
                        </p>
                        {a.typeAnnonce === "gros" ? (
                          <p className="text-[9px] font-black text-orange-600">
                            🏭 GROS
                          </p>
                        ) : null}
                        {a.recommandeParDG ? (
                          <p className="text-[9px] font-black text-yellow-600">
                            ⭐ RECOMMANDÉ
                          </p>
                        ) : (
                          <p className="text-[9px] text-gray-400">
                            ☆ Non recommandé - invisible pour les Clients
                          </p>
                        )}
                        {estGrossiste && gUsd > 0 ? (
                          <p className="text-[10px] font-bold text-orange-600">
                            Gros : {usd(gUsd)} / {toCDFString(gUsd)} /{" "}
                            {a.uniteGros || "carton"}
                          </p>
                        ) : null}
                      </Link>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Link
                          href={"/publier?edit=" + a.id}
                          className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold text-center"
                        >
                          Modifier
                        </Link>
                        <button
                          type="button"
                          onClick={() => supprimer(a.id)}
                          className="bg-red-50 border border-red-200 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {estPrestataire ? (
          <>
            <div className="bg-white border rounded-2xl overflow-hidden">
              <div className="p-4 flex justify-between items-center border-b">
                <p className="font-black text-[13px]">
                  Mes services ({mesServices.length})
                </p>
                <Link
                  href="/publier-service"
                  className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black"
                >
                  + Service
                </Link>
              </div>
              {mesServices.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-2xl">🔧</p>
                  <p className="text-[12px] mt-1.5 font-bold">
                    Aucun service publié
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {mesServices.map((sv: any) => (
                    <div key={sv.id} className="p-3 flex gap-3 items-center">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[12px] truncate">
                          {sv.titre || sv.activite || "Service"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {sv.commune || sv.zone || "Kinshasa"} •{" "}
                          {sv.prixADiscuter || !sv.prixPrestation
                            ? "Prix à discuter"
                            : `${usd(Number(sv.prixPrestation))} / ${toCDFString(Number(sv.prixPrestation))}`}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Link
                          href={"/publier-service?edit=" + sv.id}
                          className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold"
                        >
                          Modifier
                        </Link>
                        <button
                          type="button"
                          onClick={() => supprimerService(sv.id)}
                          className="bg-red-50 border border-red-200 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border rounded-2xl overflow-hidden">
              <div className="p-4 flex justify-between items-center border-b">
                <p className="font-black text-[13px]">
                  Mes demandes ({demandes.length})
                </p>
              </div>
              {demandes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-3xl">📩</p>
                  <p className="text-[12px] mt-2 font-bold">
                    Aucune demande pour le moment
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Quand un Client te demandera, ça apparaîtra ici.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {demandes.map((d: any) => (
                    <div key={d.id} className="p-3 flex gap-3 items-center">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[12px] truncate">
                          {d.titre || d.service || "Demande"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {d.commune || d.zone || ""} •{" "}
                          {d.nomClient || d.client || ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* ===== JOURNAL D'ACTIVITÉ ===== */}
        <div className="bg-white border rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="font-black text-[13px]">
              📓 Journal d&apos;activité ({journalFiltre.length})
            </p>
            {journal.length > 0 ? (
              <button
                type="button"
                onClick={viderJournal}
                className="text-[10px] font-black text-red-600 underline"
              >
                Effacer
              </button>
            ) : null}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(
              [
                ["tous", "Tout"],
                ["panier", "Panier"],
                ["contact", "WhatsApp"],
                ["annonce", "Annonces"],
                ["navigation", "Navigation"],
                ["compte", "Compte"],
              ] as const
            ).map(([cle, libelle]) => (
              <button
                key={cle}
                type="button"
                onClick={() => setFiltreJournal(cle)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black border ${
                  filtreJournal === cle
                    ? "bg-black text-white border-black"
                    : "bg-[#FFFBF0] text-gray-700 border-gray-200"
                }`}
              >
                {libelle}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {journalFiltre.length === 0 ? (
              <p className="text-[11px] text-gray-500 py-4 text-center">
                Aucune activité enregistrée pour ce filtre.
              </p>
            ) : (
              journalFiltre.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-[#FFFBF0] border border-gray-100 px-3 py-2 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-gray-900 leading-snug">
                      {item.message}
                    </p>
                    <p className="text-[9px] text-gray-500 mt-0.5">
                      {item.date} • Rôle : {item.role}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] font-black uppercase bg-white border px-2 py-0.5 rounded-full text-gray-700">
                    {item.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={sortir}
          className="w-full bg-gray-100 rounded-full py-3 text-[12px] font-bold"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
  }
