"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { LieuCarteWenze } from "@/lib/geolocalisation-wenze";
import {
  ProfilActeurCarte,
  StatutConsentementClient,
} from "@/lib/acces-carte-wenze";

const CarteWenzeOSM = dynamic(() => import("@/components/CarteWenzeOSM"), {
  ssr: false,
});

export default function PageCarteWenze() {
  const [lieux, setLieux] = useState<LieuCarteWenze[]>([]);
  const [profilActeur, setProfilActeur] = useState<ProfilActeurCarte>("boutique");
  const [abonnementActif, setAbonnementActif] = useState<boolean>(false);
  const [dateExpiration, setDateExpiration] = useState<string | null>(null);
  const [venteOccasionnelleActive, setVenteOccasionnelleActive] =
    useState<boolean>(false);
  const [abonnementPubliciteActif, setAbonnementPubliciteActif] =
    useState<boolean>(false);
  const [consentementClient, setConsentementClient] =
    useState<StatutConsentementClient>("en_attente");

  useEffect(() => {
    async function chargerDonneesCarte() {
      if (!supabase) return;

      // 1. Boutiques / Prestataires / Grossistes
      const { data: boutiques } = await supabase
        .from("boutiques")
        .select(
          "id, nom, type_acteur, abonnement_actif, abonnement_expire_at, avenue, numero_parcelle, quartier, commune, province, pays, latitude, longitude, telephone"
        )
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      // 2. Produits visibles et actifs
      const { data: produits } = await supabase
        .from("produits")
        .select(
          "id, name_fr, prix_usd, avenue, numero_parcelle, quartier, commune, province, pays, latitude, longitude"
        )
        .eq("is_visible", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      // 3. Publicités et annonces géolocalisées
      const { data: annonces } = await supabase
        .from("annonces")
        .select(
          "id, titre, is_publicite, prix_usd, avenue, numero_parcelle, quartier, commune, province, pays, latitude, longitude"
        )
        .eq("is_visible", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      const lieuxBoutiques: LieuCarteWenze[] = (boutiques || []).map(
        (b: any) => ({
          id: `boutique-${b.id}`,
          titre: b.nom || "Boutique Wenze",
          categorie: "boutique",
          avenue: b.avenue,
          numeroParcelle: b.numero_parcelle,
          quartier: b.quartier,
          commune: b.commune,
          province: b.province || "Kinshasa",
          pays: b.pays || "RDC",
          latitude: Number(b.latitude),
          longitude: Number(b.longitude),
          telephone: b.telephone || null,
        })
      );

      const lieuxProduits: LieuCarteWenze[] = (produits || []).map(
        (p: any) => ({
          id: `produit-${p.id}`,
          titre: p.name_fr || "Produit Wenze",
          categorie: "produit",
          avenue: p.avenue,
          numeroParcelle: p.numero_parcelle,
          quartier: p.quartier,
          commune: p.commune,
          province: p.province || "Kinshasa",
          pays: p.pays || "RDC",
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          prixUsd: typeof p.prix_usd === "number" ? p.prix_usd : null,
        })
      );

      const lieuxAnnonces: LieuCarteWenze[] = (annonces || []).map(
        (a: any) => ({
          id: `annonce-${a.id}`,
          titre: a.titre || "Annonce Wenze",
          categorie: a.is_publicite ? "publicite" : "produit",
          avenue: a.avenue,
          numeroParcelle: a.numero_parcelle,
          quartier: a.quartier,
          commune: a.commune,
          province: a.province || "Kinshasa",
          pays: a.pays || "RDC",
          latitude: Number(a.latitude),
          longitude: Number(a.longitude),
          prixUsd: typeof a.prix_usd === "number" ? a.prix_usd : null,
        })
      );

      setLieux([...lieuxBoutiques, ...lieuxProduits, ...lieuxAnnonces]);
    }

    chargerDonneesCarte();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-4 space-y-4">
      <h1 className="text-xl font-black text-gray-900">
        Carte Wenze Wenze — Boutiques, Publicités &amp; Livraison
      </h1>

      <CarteWenzeOSM
        lieux={lieux}
        hauteurPx={500}
        profilActeur={profilActeur}
        abonnementActif={abonnementActif}
        dateExpirationAbonnement={dateExpiration}
        venteOccasionnelleActive={venteOccasionnelleActive}
        abonnementPubliciteActif={abonnementPubliciteActif}
        consentementClient={consentementClient}
        onRepondreConsentementClient={(accepte) =>
          setConsentementClient(accepte ? "accepte" : "refuse")
        }
      />
    </main>
  );
  }
