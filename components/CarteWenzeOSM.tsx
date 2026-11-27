"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CENTRE_KINSHASA,
  CoordonneesGPS,
  LieuCarteWenze,
  calculerDistanceKm,
  formaterAdresseHierarchique,
  obtenirPositionActuelle,
  partagerPositionWenze,
} from "@/lib/geolocalisation-wenze";
import {
  ProfilActeurCarte,
  StatutConsentementClient,
  evaluerDroitsCarte,
} from "@/lib/acces-carte-wenze";
import { toCDFString, usd } from "@/lib/paiement-base";

export interface CarteWenzeOSMProps {
  lieux: LieuCarteWenze[];
  lieuSelectionneId?: string | null;
  hauteurPx?: number;
  profilActeur?: ProfilActeurCarte;
  abonnementActif?: boolean;
  dateExpirationAbonnement?: string | null;
  venteOccasionnelleActive?: boolean;
  abonnementPubliciteActif?: boolean;
  consentementClient?: StatutConsentementClient;
  onRepondreConsentementClient?: (accepte: boolean) => void;
  positionClientLivraison?: {
    latitude: number;
    longitude: number;
    label?: string;
  } | null;
  onPublierPositionTempsReel?: (coords: {
    latitude: number;
    longitude: number;
  }) => void;
}

export default function CarteWenzeOSM({
  lieux,
  lieuSelectionneId = null,
  hauteurPx = 460,
  profilActeur = "boutique",
  abonnementActif = false,
  dateExpirationAbonnement = null,
  venteOccasionnelleActive = false,
  abonnementPubliciteActif = false,
  consentementClient = "en_attente",
  onRepondreConsentementClient,
  positionClientLivraison = null,
  onPublierPositionTempsReel,
}: CarteWenzeOSMProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const clientMarkerRef = useRef<L.CircleMarker | null>(null);

  const [positionUser, setPositionUser] = useState<CoordonneesGPS | null>(null);
  const [statutGps, setStatutGps] = useState<string>("");
  const [messagePartage, setMessagePartage] = useState<string>("");

  // Filtres hiérarchiques : Catégorie + Pays -> Province -> Commune -> Quartier -> Avenue
  const [categorieFiltre, setCategorieFiltre] = useState<string>("tous");
  const [paysFiltre, setPaysFiltre] = useState<string>("tous");
  const [provinceFiltre, setProvinceFiltre] = useState<string>("tous");
  const [communeFiltre, setCommuneFiltre] = useState<string>("tous");
  const [quartierFiltre, setQuartierFiltre] = useState<string>("tous");
  const [avenueFiltre, setAvenueFiltre] = useState<string>("tous");
  const [actifId, setActifId] = useState<string | null>(lieuSelectionneId);

  const droits = useMemo(
    () =>
      evaluerDroitsCarte({
        profil: profilActeur,
        abonnementActif,
        dateExpirationAbonnement,
        venteOccasionnelleActive,
        abonnementPubliciteActif,
        consentementClient,
      }),
    [
      profilActeur,
      abonnementActif,
      dateExpirationAbonnement,
      venteOccasionnelleActive,
      abonnementPubliciteActif,
      consentementClient,
    ]
  );

  const paysDisponibles = useMemo(
    () =>
      Array.from(
        new Set(lieux.map((l) => (l.pays || "RDC").trim()).filter(Boolean))
      ).sort(),
    [lieux]
  );

  const provincesDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          lieux
            .filter(
              (l) => paysFiltre === "tous" || (l.pays || "RDC") === paysFiltre
            )
            .map((l) => (l.province || "Kinshasa").trim())
            .filter(Boolean)
        )
      ).sort(),
    [lieux, paysFiltre]
  );

  const communesDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          lieux
            .filter(
              (l) =>
                (paysFiltre === "tous" || (l.pays || "RDC") === paysFiltre) &&
                (provinceFiltre === "tous" ||
                  (l.province || "Kinshasa") === provinceFiltre)
            )
            .map((l) => (l.commune || "").trim())
            .filter(Boolean)
        )
      ).sort(),
    [lieux, paysFiltre, provinceFiltre]
  );

  const quartiersDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          lieux
            .filter(
              (l) =>
                (paysFiltre === "tous" || (l.pays || "RDC") === paysFiltre) &&
                (provinceFiltre === "tous" ||
                  (l.province || "Kinshasa") === provinceFiltre) &&
                (communeFiltre === "tous" ||
                  (l.commune || "") === communeFiltre)
            )
            .map((l) => (l.quartier || "").trim())
            .filter(Boolean)
        )
      ).sort(),
    [lieux, paysFiltre, provinceFiltre, communeFiltre]
  );

  const avenuesDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          lieux
            .filter(
              (l) =>
                (paysFiltre === "tous" || (l.pays || "RDC") === paysFiltre) &&
                (provinceFiltre === "tous" ||
                  (l.province || "Kinshasa") === provinceFiltre) &&
                (communeFiltre === "tous" ||
                  (l.commune || "") === communeFiltre) &&
                (quartierFiltre === "tous" ||
                  (l.quartier || "") === quartierFiltre)
            )
            .map((l) => (l.avenue || "").trim())
            .filter(Boolean)
        )
      ).sort(),
    [lieux, paysFiltre, provinceFiltre, communeFiltre, quartierFiltre]
  );

  const lieuxFiltres = useMemo(() => {
    return lieux
      .filter((lieu) => {
        if (categorieFiltre !== "tous" && lieu.categorie !== categorieFiltre) {
          return false;
        }
        if (paysFiltre !== "tous" && (lieu.pays || "RDC") !== paysFiltre) {
          return false;
        }
        if (
          provinceFiltre !== "tous" &&
          (lieu.province || "Kinshasa") !== provinceFiltre
        ) {
          return false;
        }
        if (
          communeFiltre !== "tous" &&
          (lieu.commune || "").trim() !== communeFiltre
        ) {
          return false;
        }
        if (
          quartierFiltre !== "tous" &&
          (lieu.quartier || "").trim() !== quartierFiltre
        ) {
          return false;
        }
        if (
          avenueFiltre !== "tous" &&
          (lieu.avenue || "").trim() !== avenueFiltre
        ) {
          return false;
        }
        return (
          typeof lieu.latitude === "number" &&
          typeof lieu.longitude === "number" &&
          !Number.isNaN(lieu.latitude) &&
          !Number.isNaN(lieu.longitude)
        );
      })
      .map((lieu) => ({
        ...lieu,
        distanceKm: positionUser
          ? calculerDistanceKm(
              positionUser.latitude,
              positionUser.longitude,
              lieu.latitude,
              lieu.longitude
            )
          : null,
      }))
      .sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        return a.titre.localeCompare(b.titre);
      });
  }, [
    lieux,
    categorieFiltre,
    paysFiltre,
    provinceFiltre,
    communeFiltre,
    quartierFiltre,
    avenueFiltre,
    positionUser,
  ]);

  const lieuActif = useMemo(
    () => lieuxFiltres.find((l) => l.id === actifId) || lieuxFiltres[0] || null,
    [lieuxFiltres, actifId]
  );

  // Initialisation Leaflet + OSM uniquement si les droits carte sont actifs
  useEffect(() => {
    if (!droits.carteActive || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: CENTRE_KINSHASA,
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [droits.carteActive]);

  // Marqueurs lieux (boutiques, produits, publicités géolocalisées)
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = markersLayerRef.current;
    if (!droits.carteActive || !map || !layerGroup) return;

    layerGroup.clearLayers();
    const bounds: [number, number][] = [];

    lieuxFiltres.forEach((lieu) => {
      const couleur =
        lieu.categorie === "boutique"
          ? "#111827"
          : lieu.categorie === "publicite"
          ? "#b45309"
          : lieu.categorie === "produit"
          ? "#15803d"
          : "#1d4ed8";

      const badgeType =
        lieu.categorie === "publicite"
          ? "Publicité géolocalisée"
          : lieu.categorie === "boutique"
          ? "Boutique"
          : lieu.categorie === "produit"
          ? "Produit"
          : "Point d'intérêt";

      const marker = L.circleMarker([lieu.latitude, lieu.longitude], {
        radius: lieu.id === lieuActif?.id ? 10 : 7,
        fillColor: couleur,
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.92,
      });

      const adresse = formaterAdresseHierarchique(lieu);
      const prixHtml =
        typeof lieu.prixUsd === "number" && lieu.prixUsd > 0
          ? `<div style="margin-top:4px;font-weight:700;">${usd(
              lieu.prixUsd
            )} • ${toCDFString(lieu.prixUsd)}</div>`
          : "";

      marker.bindPopup(
        `<div style="min-width:180px;font-family:sans-serif;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${couleur};">${badgeType}</div>
          <div style="font-weight:800;font-size:13px;margin-top:2px;">${lieu.titre}</div>
          <div style="font-size:11px;color:#4b5563;margin-top:2px;">${adresse}</div>
          ${prixHtml}
        </div>`
      );

      marker.on("click", () => {
        setActifId(lieu.id);
      });

      marker.addTo(layerGroup);
      bounds.push([lieu.latitude, lieu.longitude]);
    });

    if (lieuActif) {
      map.setView(
        [lieuActif.latitude, lieuActif.longitude],
        Math.max(map.getZoom(), 14),
        { animate: true }
      );
    } else if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    }
  }, [droits.carteActive, lieuxFiltres, lieuActif]);

  // Marqueur de suivi client / livraison
  useEffect(() => {
    const map = mapRef.current;
    if (!droits.carteActive || !droits.suiviLivraisonActif || !map) return;

    if (clientMarkerRef.current) {
      clientMarkerRef.current.remove();
      clientMarkerRef.current = null;
    }

    if (positionClientLivraison) {
      clientMarkerRef.current = L.circleMarker(
        [positionClientLivraison.latitude, positionClientLivraison.longitude],
        {
          radius: 9,
          fillColor: "#dc2626",
          color: "#ffffff",
          weight: 3,
          opacity: 1,
          fillOpacity: 1,
        }
      )
        .bindPopup(
          `<b>${positionClientLivraison.label || "Position client / livraison"}</b>`
        )
        .addTo(map);
    }
  }, [droits.carteActive, droits.suiviLivraisonActif, positionClientLivraison]);

  useEffect(() => {
    if (lieuSelectionneId) {
      setActifId(lieuSelectionneId);
    }
  }, [lieuSelectionneId]);

  const gererLocalisationUtilisateur = async () => {
    if (!droits.carteActive) return;
    setStatutGps("Recherche du signal GPS...");
    setMessagePartage("");
    try {
      const coords = await obtenirPositionActuelle();
      setPositionUser(coords);
      setStatutGps(
        `Position active : ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
      );

      if (droits.partageTempsReelActif && onPublierPositionTempsReel) {
        onPublierPositionTempsReel({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }

      if (mapRef.current) {
        mapRef.current.setView([coords.latitude, coords.longitude], 15, {
          animate: true,
        });

        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }
        userMarkerRef.current = L.circleMarker(
          [coords.latitude, coords.longitude],
          {
            radius: 9,
            fillColor: "#2563eb",
            color: "#ffffff",
            weight: 3,
            opacity: 1,
            fillOpacity: 1,
          }
        )
          .bindPopup("<b>Ma position en temps réel</b>")
          .addTo(mapRef.current);
      }
    } catch (err: any) {
      setStatutGps(err?.message || "Localisation indisponible.");
    }
  };

  const gererPartagePosition = async () => {
    if (!droits.partageTempsReelActif) {
      setMessagePartage(
        "Le partage de position en temps réel nécessite un abonnement actif ou l'acceptation du partage."
      );
      return;
    }

    if (positionUser) {
      const res = await partagerPositionWenze({
        latitude: positionUser.latitude,
        longitude: positionUser.longitude,
        titre: "Ma position en temps réel — Wenze Wenze",
        adresse: "Suivi livraison / boutique",
      });
      setMessagePartage(
        res.mode === "share"
          ? "Position temps réel partagée avec le client."
          : "Lien et coordonnées GPS copiés dans le presse-papiers."
      );
      return;
    }

    if (lieuActif) {
      const res = await partagerPositionWenze({
        latitude: lieuActif.latitude,
        longitude: lieuActif.longitude,
        titre: lieuActif.titre,
        adresse: formaterAdresseHierarchique(lieuActif),
      });
      setMessagePartage(
        res.mode === "share"
          ? `Position de « ${lieuActif.titre} » partagée.`
          : `Lien de « ${lieuActif.titre} » copié.`
      );
    }
  };

  // Écran verrouillé si abonnement expiré ou consentement client requis
  if (!droits.carteActive) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <div className="text-sm font-black text-gray-900">
          Carte interactive &amp; suivi GPS verrouillés
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          {droits.motifBlocage}
        </p>

        {profilActeur === "client" && consentementClient === "en_attente" && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onRepondreConsentementClient?.(true)}
              className="rounded-xl bg-black px-4 py-2 text-xs font-extrabold text-white hover:bg-gray-800"
            >
              Accepter le partage de position
            </button>
            <button
              type="button"
              onClick={() => onRepondreConsentementClient?.(false)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Refuser
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      {/* Barre d'actions GPS & Partage */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={gererLocalisationUtilisateur}
            className="rounded-xl bg-black px-3.5 py-2 text-xs font-extrabold text-white hover:bg-gray-800"
          >
            📍 Ma position
          </button>
          {droits.partageTempsReelActif && (
            <button
              type="button"
              onClick={gererPartagePosition}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-extrabold text-gray-900 hover:bg-gray-50"
            >
              🔗 Partager position en direct
            </button>
          )}
        </div>

        <span className="text-xs font-semibold text-gray-600">
          {lieuxFiltres.length} emplacement(s) visible(s)
        </span>
      </div>

      {(statutGps || messagePartage) && (
        <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-medium text-gray-800 border border-gray-200">
          {statutGps}
          {statutGps && messagePartage ? " • " : ""}
          {messagePartage}
        </div>
      )}

      {/* Filtres Catégorie + Pays + Province + Commune + Quartier + Avenue */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select
          value={categorieFiltre}
          onChange={(e) => setCategorieFiltre(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-bold text-gray-800"
        >
          <option value="tous">Toutes catégories</option>
          <option value="boutique">Boutiques</option>
          <option value="publicite">Publicités géolocalisées</option>
          <option value="produit">Produits / Annonces</option>
          <option value="point_interet">Autres lieux</option>
        </select>

        <select
          value={paysFiltre}
          onChange={(e) => {
            setPaysFiltre(e.target.value);
            setProvinceFiltre("tous");
            setCommuneFiltre("tous");
            setQuartierFiltre("tous");
            setAvenueFiltre("tous");
          }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-bold text-gray-800"
        >
          <option value="tous">Tous les pays</option>
          {paysDisponibles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={provinceFiltre}
          onChange={(e) => {
            setProvinceFiltre(e.target.value);
            setCommuneFiltre("tous");
            setQuartierFiltre("tous");
            setAvenueFiltre("tous");
          }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-bold text-gray-800"
        >
          <option value="tous">Toutes provinces</option>
          {provincesDisponibles.map((pr) => (
            <option key={pr} value={pr}>
              {pr}
            </option>
          ))}
        </select>

        <select
          value={communeFiltre}
          onChange={(e) => {
            setCommuneFiltre(e.target.value);
            setQuartierFiltre("tous");
            setAvenueFiltre("tous");
          }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-bold text-gray-800"
        >
          <option value="tous">Toutes communes</option>
          {communesDisponibles.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={quartierFiltre}
          onChange={(e) => {
            setQuartierFiltre(e.target.value);
            setAvenueFiltre("tous");
          }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-bold text-gray-800"
        >
          <option value="tous">Tous quartiers</option>
          {quartiersDisponibles.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>

        <select
          value={avenueFiltre}
          onChange={(e) => setAvenueFiltre(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-bold text-gray-800"
        >
          <option value="tous">Toutes avenues</option>
          {avenuesDisponibles.map((av) => (
            <option key={av} value={av}>
              Av. {av}
            </option>
          ))}
        </select>
      </div>

      {/* Conteneur de la carte Leaflet */}
      <div
        ref={containerRef}
        style={{ height: `${hauteurPx}px` }}
        className="w-full overflow-hidden rounded-2xl border border-gray-200 z-0"
      />

      {/* Liste rapide des emplacements (Boutiques, Publicités, Produits) */}
      {lieuxFiltres.length > 0 && (
        <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-100">
          {lieuxFiltres.map((lieu) => {
            const estActif = lieu.id === lieuActif?.id;
            return (
              <button
                key={lieu.id}
                type="button"
                onClick={() => setActifId(lieu.id)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition ${
                  estActif ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-gray-900">
                      {lieu.titre}
                    </span>
                    {lieu.categorie === "publicite" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Pub
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    {formaterAdresseHierarchique(lieu)}
                  </div>
                </div>
                <div className="text-right">
                  {typeof lieu.prixUsd === "number" && lieu.prixUsd > 0 && (
                    <div className="text-xs font-bold text-gray-900">
                      {usd(lieu.prixUsd)}
                    </div>
                  )}
                  {lieu.distanceKm !== null && (
                    <div className="text-[11px] font-semibold text-blue-700">
                      {lieu.distanceKm} km
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
