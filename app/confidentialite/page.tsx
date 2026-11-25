"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function Confidentialite() {
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCfgPublique(lireConfigPublique());
    }
  }, []);

  const now = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-[430px] mx-auto min-h-screen p-5 bg-[#FFFBF0] pb-24">
      <Link href="/" className="text-[#6C3CE0] font-bold text-xs">
        ← Accueil
      </Link>

      <div className="mt-4 bg-black text-white rounded-2xl p-4">
        <h1 className="text-xl font-black">
          {cfgPublique?.titreConfidentialite || "Politique de Confidentialité"}
        </h1>
        <p className="text-[11px] opacity-75 mt-1">
          Wenze Wenze • Kinshasa, RDC • Mise à jour : {now}
        </p>
        <p className="text-[10px] mt-2 bg-white/15 inline-block px-2.5 py-1 rounded-full">
          0 % commission • Taux {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES} actives
        </p>
      </div>

      <div className="mt-5 space-y-5 text-[12px] leading-relaxed">
        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-sm">1. Données traitées</h2>
          <ul className="list-disc ml-5 mt-2 space-y-1.5 text-[11px] text-gray-700">
            <li>
              <b>Identifiant WhatsApp normalisé :</b> utilisé pour
              l&apos;identification du compte, la gestion des publications et le
              contact direct entre acheteurs et vendeurs.
            </li>
            <li>
              <b>Profil et rôles :</b> gestion des comptes clients, boutiques,
              prestataires, grossistes, ambassadeurs, superviseurs et
              administration DG, avec isolation stricte du Bureau DG et
              restriction des prix gros aux grossistes et au DG.
            </li>
            <li>
              <b>Réseau d&apos;invitations :</b> réservé aux clients, boutiques
              et prestataires ; les ambassadeurs et superviseurs sont exclus du
              réseau d&apos;invitations.
            </li>
            <li>
              <b>Annonces, tickets et journal :</b> suivi des publications
              (plafond de {PLAFOND_ACTIVES} annonces actives), des paliers
              d&apos;abonnement (minimum {usd(1)} / {toCDFString(1)}) et du
              journal d&apos;activité (<code>wenze_journal</code>).
            </li>
            <li>
              <b>Stockage local et Supabase :</b> persistance locale sur
              l&apos;appareil et synchronisation avec Supabase selon les règles
              d&apos;accès en vigueur.
            </li>
          </ul>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-sm">
            2. Règles de visibilité et freemium
          </h2>
          <p className="mt-2 text-[11px] text-gray-700">
            Wenze Wenze applique <b>0 % de commission</b> sur les transactions
            entre membres, avec double affichage <b>USD</b> et{" "}
            <b>Franc Congolais (CDF)</b> au taux de référence de{" "}
            <b>{TAUX_CDF} CDF/$</b>. Les paramètres publics sont ajustables
            dynamiquement par la DG via <code>config_publique</code>.
          </p>
          <div className="mt-2 bg-[#FFFBF0] border rounded-xl p-3 text-[11px] text-gray-700 space-y-1">
            <p>
              • <b>Freemium :</b>{" "}
              <b>
                {MAX_FREE_IMAGES} images max pendant {FREE_DAYS} jours
              </b>
              , puis passage automatique à <code>is_visible = false</code> en
              l&apos;absence d&apos;abonnement actif.
            </p>
            <p>
              • <b>Plafond global :</b> maximum <b>{PLAFOND_ACTIVES}</b>{" "}
              annonces actives.
            </p>
            <p>
              • <b>Prix gros :</b> visibles exclusivement pour les comptes{" "}
              <b>grossiste</b> et le <b>DG</b>.
            </p>
          </div>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-sm">3. Finalités et sécurité</h2>
          <ul className="list-disc ml-5 mt-2 space-y-1.5 text-[11px] text-gray-700">
            <li>
              Vérification de propriété des annonces avant modification ou
              suppression et libération des places lors d&apos;un retrait.
            </li>
            <li>
              Séparation stricte des espaces d&apos;authentification pour le
              Bureau DG, les superviseurs et les ambassadeurs.
            </li>
            <li>
              Aucun démarchage commercial abusif : les échanges commerciaux se
              font directement via les canaux choisis par l&apos;utilisateur.
            </li>
          </ul>
        </section>

        <section className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-sm">4. Vos droits et gestion des données</h2>
          <p className="mt-2 text-[11px] text-gray-700">
            Vous pouvez supprimer vos annonces à tout moment depuis votre
            espace afin de libérer votre quota, effacer les données locales de
            votre navigateur ou contacter le support via les canaux officiels de
            Wenze Wenze à Kinshasa.
          </p>
        </section>

        <div className="text-center pt-1">
          <Link
            href="/"
            className="inline-block bg-black text-white px-6 py-3 rounded-xl text-xs font-bold"
          >
            ← Retour à l&apos;accueil • {usd(1)} ({toCDFString(1)}) min
          </Link>
        </div>
      </div>
    </div>
  );
}
