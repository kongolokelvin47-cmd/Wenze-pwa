"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, normalizeCategorie } from "@/lib/categories";
import {
  toCDFString,
  verifierAbonnement,
  isCompteCache,
  checkFreemiumWenze,
} from "@/lib/paiement";
import { estConnecte, exigerCompte, lireSession } from "@/lib/connexion";
import {
  AnnonceCard,
  ImageViewer,
  BottomNav,
  fmtUSD,
  waLink,
  APP_NAME,
} from "./HomeParts";

export const dynamic = "force-dynamic";

const MAX_ANNONCES_ACTIVES = 50;

export const PROVINCES_RDC = [
  "Kinshasa",
  "Kongo-Central",
  "Kwango",
  "Kwilu",
  "Mai-Ndombe",
  "Kasaï",
  "Kasaï-Central",
  "Kasaï-Oriental",
  "Lomami",
  "Sankuru",
  "Maniema",
  "Sud-Kivu",
  "Nord-Kivu",
  "Ituri",
  "Haut-Uele",
  "Bas-Uele",
  "Tshopo",
  "Mongala",
  "Nord-Ubangi",
  "Sud-Ubangi",
  "Équateur",
  "Tshuapa",
  "Tanganyika",
  "Haut-Lomami",
  "Lualaba",
  "Haut-Katanga",
] as const;

export const COMMUNES_KINSHASA = [
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
] as const;

const cleanWa = (n: any): string =>
  (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function readList(key: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function readUser(): any {
  try {
    if (typeof window === "undefined") return null;
    const sess: any = lireSession();
    if (sess && typeof sess === "object") return sess;
    const raw = localStorage.getItem("wenze_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readDesign(): any {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("wenze_design_pub");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function safeWriteStorage(key: string, value: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_DESIGN = {
  titre: "Bienvenue chez WENZE",
  slogan: "Là où les opportunités deviennent une réalité.",
  apropos:
    "WENZE - Ensemble on va plus loin. Boutiques vérifiées à Kinshasa et dans les 26 provinces de la RDC.",
  whatsapp: "+243810000000",
  logo: "",
  couleur: "#FF6B00",
  couleurBouton: "#000000",
  showAmbassadeur: true,
  maintenance: false,
  showTombola: true,
};

function FlashVideo({ annonces, onOpen }: any) {
  const videos = useMemo(() => {
    const list = (annonces || []).filter(
      (a: any) =>
        a.is_visible !== false &&
        (a.isVideo ||
          a.video ||
          a.videoUrl ||
          (typeof a.photo === "string" && a.photo.startsWith("data:video")))
    );
    return list
      .sort((a: any, b: any) => {
        if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
        return (
          new Date(b.created_at || b.createdAt || 0).getTime() -
          new Date(a.created_at || a.createdAt || 0).getTime()
        );
      })
      .slice(0, 8);
  }, [annonces]);

  if (videos.length === 0) return null;

  return (
    <div className="bg-black text-white rounded-2xl p-4">
      <div className="flex justify-between items-center">
        <p className="font-black text-[14px]">⚡ FLASH VIDEO</p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/video";
          }}
          className="text-[11px] bg-white text-black px-3 py-1 rounded-full font-black"
        >
          Tout voir →
        </button>
      </div>
      <p className="text-[11px] text-white/70 mt-1">
        Pubs vidéo à jour — clique pour regarder en plein écran
      </p>
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {videos.map((v: any) => (
          <button
            type="button"
            key={v.id}
            onClick={() => onOpen(v)}
            className="min-w-[120px] w-[120px] text-left bg-white/10 rounded-2xl overflow-hidden shrink-0"
          >
            <div className="h-[90px] bg-white/20 flex items-center justify-center relative">
              {v.photo && !String(v.photo).startsWith("data:video") ? (
                <img
                  src={v.photo}
                  className="w-full h-full object-cover"
                  alt={v.titre || "Vidéo"}
                />
              ) : (
                <span className="text-[28px]">🎬</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center text-[14px]">
                  ▶️
                </span>
              </span>
              {v.isBoosted && (
                <span className="absolute top-1 left-1 bg-[#FF6B00] text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  BOOST
                </span>
              )}
              {v.vendeurBadge && (
                <span className="absolute bottom-1 right-1 bg-black/70 text-[8px] px-1 rounded-full">
                  {v.vendeurBadge}
                </span>
              )}
            </div>
            <p className="font-black text-[11px] p-2 leading-tight truncate">
              {v.titre}
            </p>
            <p className="text-[10px] text-white/70 px-2 pb-2 -mt-1 truncate">
              {v.commune || v.province} • {fmtUSD(v.prix)}$ / {v.prixCDF}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WenzeBusiness() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [modalCategoriesOuvert, setModalCategoriesOuvert] = useState(false);
  const [tri, setTri] = useState<"recent" | "moins_cher" | "plus_cher" | "proximite">("recent");
  const [videoSeulement, setVideoSeulement] = useState(false);
  const [filtreOuvert, setFiltreOuvert] = useState(false);

  // Couverture géographique RDC : 26 provinces, 24 communes Kinshasa, quartier, avenue + GPS
  const [selectedProvince, setSelectedProvince] = useState<string>("toutes");
  const [selectedCommune, setSelectedCommune] = useState<string>("toutes");
  const [filtreQuartier, setFiltreQuartier] = useState<string>("");
  const [filtreAvenue, setFiltreAvenue] = useState<string>("");
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [, setAb] = useState<any>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [, setVisiteur] = useState(false);
  const [moi, setMoi] = useState<any>(null);
  const [design, setDesign] = useState<any>(DEFAULT_DESIGN);

  useEffect(() => {
    const loadDesign = () => setDesign({ ...DEFAULT_DESIGN, ...readDesign() });
    loadDesign();
    window.addEventListener("storage", loadDesign);
    window.addEventListener("wenze-update", loadDesign);
    return () => {
      window.removeEventListener("storage", loadDesign);
      window.removeEventListener("wenze-update", loadDesign);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2800);
  };

  const activerGeolocalisation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      showToast("Géolocalisation non disponible sur cet appareil");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setTri("proximite");
        setGeoLoading(false);
        showToast("📍 Position GPS activée — tri par proximité");
      },
      () => {
        setGeoLoading(false);
        showToast("Autorisez la position GPS dans votre navigateur");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadAnnonces = useCallback(() => {
    try {
      const usersMap = new Map<string, any>();
      for (const u of readList("wenze_all_users")) {
        const wa = cleanWa(u.ownerWhatsapp || u.whatsapp);
        if (wa) usersMap.set(wa, u);
      }
      const cur = readUser();
      setMoi(cur);
      if (cur) {
        const wa = cleanWa(cur.ownerWhatsapp || cur.whatsapp);
        if (wa) usersMap.set(wa, cur);
      }

      const statuts = new Map<string, { cache: boolean; abv: any }>();
      const statutDe = (wa: string) => {
        let s = statuts.get(wa);
        if (!s) {
          const vendeur = usersMap.get(wa);
          s = { cache: false, abv: null };
          if (vendeur) {
            try {
              s.cache = Boolean(isCompteCache(vendeur));
              s.abv = checkFreemiumWenze(vendeur, 0);
            } catch {}
          }
          statuts.set(wa, s);
        }
        return s;
      };

      const fixed = readList("wenze_annonces_list")
        .filter((a: any) => a && a.is_visible !== false && a.masque !== true)
        .map((a: any) => ({ a, wa: cleanWa(a.ownerWhatsapp || a.whatsapp) }))
        .filter((x: any) => !statutDe(x.wa).cache)
        .slice(0, MAX_ANNONCES_ACTIVES)
        .map((x: any) => {
          const a = x.a;
          const abv = statutDe(x.wa).abv;
          const prix = Number(a.prixUSD || a.prix || 0);
          return {
            ...a,
            province: a.province || "Kinshasa",
            commune: a.commune || "",
            quartier: a.quartier || "",
            avenue: a.avenue || "",
            is_visible: true,
            categorieId: normalizeCategorie(
              a.categorieId || a.categorie || "commerces-services"
            ),
            prix,
            prixCDF: toCDFString(prix),
            isVideo:
              !!a.isVideo ||
              (typeof a.photo === "string" && a.photo.startsWith("data:video")),
            isBoosted:
              !!a.boostUntil && new Date(a.boostUntil).getTime() > Date.now(),
            isPayant: !!abv?.isPaye,
            vendeurBadge: abv?.badge || "🆓",
            vendeurPalier: abv?.palierId || "Freemium",
            _wa: x.wa,
          };
        });
      setAnnonces(fixed);
    } catch {
      setAnnonces([]);
    }
  }, []);

  useEffect(() => {
    const refreshAb = () => {
      try {
        setAb(verifierAbonnement());
      } catch {}
    };
    const refreshCart = () => setCartCount(readList("wenze_panier").length);
    const refreshVisiteur = () => setVisiteur(!estConnecte());
    const onChange = () => {
      loadAnnonces();
      refreshAb();
      refreshCart();
      refreshVisiteur();
    };
    onChange();

    let cancelled = false;
    let stopNotifs: (() => void) | null = null;

    import("@/lib/notifications")
      .then((m: any) => {
        if (cancelled) return;
        const user = readUser() || {};
        const wa = cleanWa(user.ownerWhatsapp || user.whatsapp || user.id);
        const updateBadge = () => {
          try {
            setNotifCount(
              m.getUnreadCount ? m.getUnreadCount(user.id || wa) : 0
            );
          } catch {}
        };
        try {
          if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations();
        } catch {}
        updateBadge();
        window.addEventListener("wenze-notif", updateBadge);
        const i1 = setInterval(() => {
          try {
            if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations();
          } catch {}
          updateBadge();
          loadAnnonces();
        }, 60 * 60 * 1000);
        const i2 = setInterval(updateBadge, 3000);
        stopNotifs = () => {
          window.removeEventListener("wenze-notif", updateBadge);
          clearInterval(i1);
          clearInterval(i2);
        };
      })
      .catch(() => {});

    window.addEventListener("storage", onChange);
    window.addEventListener("wenze-update", onChange);
    return () => {
      cancelled = true;
      if (stopNotifs) stopNotifs();
      window.removeEventListener("storage", onChange);
      window.removeEventListener("wenze-update", onChange);
    };
  }, [loadAnnonces]);

  const monRole = moi?.role || (moi?.estVendeur ? "vendeur" : "client");
  const jeSuisDG =
    moi?.roleAdmin === "dg" || moi?.role === "dg" || moi?.role === "DG";
  const jeSuisGrossiste = monRole === "grossiste" || jeSuisDG;
  const voirTout = monRole !== "client" || jeSuisDG;
  const maCommune = moi?.commune || "Kinshasa";

  const filtered = useMemo(() => {
    let list = [...annonces];
    if (!voirTout) {
      list = list.filter((a: any) => a.recommandeParDG === true);
    }
    if (selectedCat !== "all") {
      list = list.filter((a) => a.categorieId === selectedCat);
    }
    if (selectedProvince !== "toutes") {
      list = list.filter(
        (a) =>
          (a.province || "Kinshasa").toLowerCase() ===
          selectedProvince.toLowerCase()
      );
    }
    if (selectedCommune !== "toutes") {
      list = list.filter(
        (a) =>
          (a.commune || "").toLowerCase() === selectedCommune.toLowerCase()
      );
    }
    if (filtreQuartier.trim()) {
      const q = filtreQuartier.trim().toLowerCase();
      list = list.filter((a) => (a.quartier || "").toLowerCase().includes(q));
    }
    if (filtreAvenue.trim()) {
      const av = filtreAvenue.trim().toLowerCase();
      list = list.filter((a) => (a.avenue || "").toLowerCase().includes(av));
    }
    if (videoSeulement) {
      list = list.filter((a) => a.isVideo);
    }
    if (debounced) {
      const s = debounced.toLowerCase();
      list = list.filter(
        (a) =>
          (a.titre || "").toLowerCase().includes(s) ||
          (a.description || "").toLowerCase().includes(s) ||
          (a.province || "").toLowerCase().includes(s) ||
          (a.commune || "").toLowerCase().includes(s) ||
          (a.quartier || "").toLowerCase().includes(s) ||
          (a.avenue || "").toLowerCase().includes(s)
      );
    }

    const withDist = list.map((a) => {
      if (
        geoCoords &&
        typeof a.lat === "number" &&
        typeof a.lng === "number"
      ) {
        return {
          ...a,
          _distanceKm: distanceKm(geoCoords.lat, geoCoords.lng, a.lat, a.lng),
        };
      }
      return { ...a, _distanceKm: null };
    });

    const time = (a: any) =>
      new Date(a.created_at || a.createdAt || 0).getTime();

    return withDist
      .sort((a, b) => {
        if (tri === "proximite") {
          const da =
            typeof a._distanceKm === "number"
              ? a._distanceKm
              : Number.POSITIVE_INFINITY;
          const db =
            typeof b._distanceKm === "number"
              ? b._distanceKm
              : Number.POSITIVE_INFINITY;
          if (da !== db) return da - db;
        }
        if (tri === "moins_cher") {
          return Number(a.prix || 0) - Number(b.prix || 0);
        }
        if (tri === "plus_cher") {
          return Number(b.prix || 0) - Number(a.prix || 0);
        }
        const aIci = (a.commune || "") === maCommune ? 0 : 1;
        const bIci = (b.commune || "") === maCommune ? 0 : 1;
        if (aIci !== bIci) return aIci - bIci;
        if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
        if (a.isPayant !== b.isPayant) return a.isPayant ? -1 : 1;
        return time(b) - time(a);
      })
      .slice(0, MAX_ANNONCES_ACTIVES);
  }, [
    annonces,
    debounced,
    selectedCat,
    selectedProvince,
    selectedCommune,
    filtreQuartier,
    filtreAvenue,
    geoCoords,
    voirTout,
    maCommune,
    tri,
    videoSeulement,
  ]);

  const tabs = useMemo(
    () =>
      CATEGORIES_WENZE.filter((c: any) => c.id !== "client").map((c: any) => ({
        id: c.id as string,
        label: ((c.icon || "") + " " + (c.titreCourt || c.titre || c.id)).trim(),
        count: filtered.filter((a) => a.categorieId === c.id).length,
      })),
    [filtered]
  );

  // Résolution des 4 choix principaux demandés dans la modale Catégories :
  // Tout le service, Boutique, Grossiste, Prestataires
  const optionsModalCategories = useMemo(() => {
    const findTabId = (keywords: string[], fallback: string) => {
      const found = tabs.find((t: any) => {
        const low = `${t.id} ${t.label}`.toLowerCase();
        return keywords.some((k) => low.includes(k));
      });
      return found ? found.id : fallback;
    };

    const boutiqueId = findTabId(["boutique"], "boutique");
    const grossisteId = findTabId(["grossiste", "gros"], "grossiste");
    const prestataireId = findTabId(
      ["prestataire", "service"],
      "prestataires"
    );

    return [
      {
        id: "all",
        emoji: "🌐",
        titre: "Tout le service",
        description: "Toutes les annonces et services disponibles",
        count: filtered.length,
      },
      {
        id: boutiqueId,
        emoji: "🏪",
        titre: "Boutique",
        description: "Produits et articles au détail",
        count: filtered.filter((a) => a.categorieId === boutiqueId).length,
      },
      {
        id: grossisteId,
        emoji: "📦",
        titre: "Grossiste",
        description: "Achat en gros et commandes minimum",
        count: filtered.filter((a) => a.categorieId === grossisteId).length,
      },
      {
        id: prestataireId,
        emoji: "🛠️",
        titre: "Prestataires",
        description: "Prestataires et services locaux",
        count: filtered.filter((a) => a.categorieId === prestataireId).length,
      },
    ];
  }, [tabs, filtered]);

  const choisirCategorieModal = (catId: string) => {
    setSelectedCat(catId);
    setModalCategoriesOuvert(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const waClean = (design.whatsapp || "").toString().replace(/[^0-9]/g, "");
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };
  const goWhatsAppDG = () => {
    if (!waClean) return;
    window.open(
      `https://wa.me/${waClean}?text=${encodeURIComponent(
        "Bonjour WENZE, je veux des infos"
      )}`,
      "_blank",
      "noopener"
    );
  };

  const toggleRecommande = (id: string) => {
    if (!jeSuisDG) return;
    const list = readList("wenze_annonces_list").map((a: any) =>
      String(a.id) === String(id)
        ? { ...a, recommandeParDG: !a.recommandeParDG }
        : a
    );
    if (safeWriteStorage("wenze_annonces_list", JSON.stringify(list))) {
      window.dispatchEvent(new Event("wenze-update"));
      showToast("Recommandation mise à jour ★");
    }
  };

  const addPanier = (a: any) => {
    if (!exigerCompte(router, "/")) return;
    try {
      const panier = readList("wenze_panier");
      if (panier.some((p: any) => String(p.id) === String(a.id))) {
        showToast("Déjà dans le panier 🛒");
        return;
      }
      const estGros = a.typeAnnonce === "gros";
      const minGros = estGros ? Number(a.minimumCommande || 10) : 1;
      if (estGros && !jeSuisGrossiste) {
        showToast("🔒 Prix gros réservé aux Grossistes");
        return;
      }
      panier.push({
        id: a.id,
        titre: a.titre,
        prix: a.prix,
        prixUSD: a.prix,
        prixCDF: a.prixCDF,
        categorieId: a.categorieId,
        province: a.province || "Kinshasa",
        commune: a.commune || "",
        quartier: a.quartier || "",
        avenue: a.avenue || "",
        ville: a.ville || a.province || "Kinshasa",
        ownerWhatsapp: a._wa,
        whatsapp: a._wa,
        ownerName: a.ownerName || "",
        stock: a.stock || 1,
        qty: minGros,
        quantite: minGros,
        typeAnnonce: a.typeAnnonce,
        prixGros: Number(a.prixGros || 0),
        uniteGros: a.uniteGros || "Carton",
        minimumCommande: minGros,
        prixAffiche: a.prixAffiche,
        photo:
          typeof a.photo === "string" && a.photo.length < 30000 ? a.photo : "",
      });
      if (!safeWriteStorage("wenze_panier", JSON.stringify(panier))) {
        showToast("Stockage plein : supprimez d'anciennes annonces");
        return;
      }
      setCartCount(panier.length);
      window.dispatchEvent(new Event("wenze-update"));
      if (estGros) {
        const grosUsd = Number(a.prixGros || a.prix || 0);
        showToast(
          `Ajouté : ${fmtUSD(grosUsd)}$ / ${toCDFString(grosUsd)} (${
            a.uniteGros || "carton"
          } x${minGros}) • 0 % comm`
        );
      } else {
        showToast(
          "Ajouté : " + fmtUSD(a.prix) + "$ / " + a.prixCDF + " • 0 % comm 🛒"
        );
      }
    } catch (e: any) {
      showToast(
        e?.name === "QuotaExceededError"
          ? "Stockage plein : supprimez d'anciennes annonces"
          : "Impossible d'ajouter au panier"
      );
    }
  };

  const contacter = (a: any) => {
    if (!exigerCompte(router, "/")) return;
    const lien = waLink(
      a._wa,
      'Bonjour, je suis intéressé par "' +
        a.titre +
        '" à ' +
        fmtUSD(a.prix) +
        "$ / " +
        a.prixCDF +
        " sur " +
        APP_NAME
    );
    if (lien) window.open(lien, "_blank", "noopener");
  };

  const keepCurrent = (a: any) => {
    safeWriteStorage("wenze_current_produit", JSON.stringify(a));
  };
  const openProduit = (a: any) => {
    keepCurrent(a);
    router.push("/produit/" + a.id);
  };
  const openVideoPage = (a: any) => {
    keepCurrent(a);
    router.push("/video?id=" + a.id);
  };

  const prixMoyen = filtered.length
    ? Math.round(
        filtered.reduce((s, a) => s + Number(a.prix || 0), 0) / filtered.length
      )
    : 0;
  const payantCount = filtered.filter((a) => a.isPayant).length;

  const resetLocalisation = () => {
    setSelectedProvince("toutes");
    setSelectedCommune("toutes");
    setFiltreQuartier("");
    setFiltreAvenue("");
    setGeoCoords(null);
    if (tri === "proximite") setTri("recent");
  };

  if (design.maintenance && !jeSuisDG) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 pt-24 text-center">
        <p className="text-[50px]">🚧</p>
        <h1 className="font-black text-[22px] mt-2">On revient bientôt</h1>
        <p className="text-[13px] text-gray-500 mt-2">
          {design.titre} est en maintenance.
        </p>
        <button
          type="button"
          onClick={goWhatsAppDG}
          className="mt-6 bg-black text-white px-6 py-3 rounded-full font-black text-[13px]"
        >
          Contacter sur WhatsApp
        </button>
        <div className="mt-6">
          <button
            type="button"
            onClick={goBack}
            className="text-[12px] underline text-gray-500"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      {/* ===== BLOC EN HAUT : RETOUR + LOGO WENZE. + SE CONNECTER + BIENVENUE ===== */}
      <header className="px-4 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            aria-label="Retour"
            className="w-9 h-9 bg-white border rounded-full font-black text-[16px] flex items-center justify-center"
          >
            ←
          </button>

          <div className="flex items-center gap-2">
            {design.logo ? (
              <img
                src={design.logo}
                alt={APP_NAME}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black">
                W
              </div>
            )}
            <span className="font-black text-[16px] tracking-tight text-black">
              {APP_NAME}
              <span style={{ color: design.couleur }}>.</span>
            </span>
          </div>

          {moi ? (
            <button
              type="button"
              onClick={() => router.push("/profil")}
              className="bg-black text-white px-4 py-2 rounded-full font-black text-[11px]"
            >
              Mon profil →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/connexion")}
              className="bg-black text-white px-4 py-2 rounded-full font-black text-[11px]"
            >
              Se connecter
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h1 className="font-black text-[22px] leading-[1.15] text-gray-900">
            {design.titre || "Bienvenue chez WENZE"}
          </h1>
          <p className="text-[13px] text-gray-600 mt-1">
            {design.slogan || "Là où les opportunités deviennent une réalité."}
          </p>
          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
            {design.apropos ||
              "WENZE - Ensemble on va plus loin. Boutiques vérifiées à Kinshasa et dans les 26 provinces de la RDC."}
          </p>
        </div>
      </header>

      {/* ===== CONTENU PRINCIPAL ===== */}
      <div className="p-4 pt-3 space-y-3">
        {toast ? (
          <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">
            {toast}
          </div>
        ) : null}

        {/* Recherche + Géolocalisation + Filtre */}
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Produit, province, commune, quartier, avenue..."
            className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
          />
          <button
            type="button"
            onClick={activerGeolocalisation}
            disabled={geoLoading}
            title="Activer ma position GPS"
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${
              geoCoords
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-gray-900"
            }`}
          >
            {geoLoading ? "GPS..." : "📍"}
          </button>
          <button
            type="button"
            onClick={() => setFiltreOuvert((v) => !v)}
            className="shrink-0 rounded-full bg-black px-3.5 py-2 text-xs font-black text-white"
          >
            Filtre
          </button>
        </div>

        {/* Couverture RDC : 26 provinces / 24 communes Kinshasa */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px] font-bold">
          <select
            aria-label="Province de la RDC"
            value={selectedProvince}
            onChange={(e) => {
              const prov = e.target.value;
              setSelectedProvince(prov);
              if (prov !== "Kinshasa" && prov !== "toutes") {
                setSelectedCommune("toutes");
              }
            }}
            className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-black text-gray-900"
          >
            <option value="toutes">🇨🇩 26 Provinces (Toutes)</option>
            {PROVINCES_RDC.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>

          {(selectedProvince === "toutes" ||
            selectedProvince === "Kinshasa") && (
            <select
              aria-label="Commune de Kinshasa"
              value={selectedCommune}
              onChange={(e) => setSelectedCommune(e.target.value)}
              className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-black text-gray-900"
            >
              <option value="toutes">🏙️ 24 Communes Kinshasa</option>
              {COMMUNES_KINSHASA.map((com) => (
                <option key={com} value={com}>
                  {com}
                </option>
              ))}
            </select>
          )}

          {(selectedProvince !== "toutes" ||
            selectedCommune !== "toutes" ||
            filtreQuartier ||
            filtreAvenue ||
            geoCoords) && (
            <button
              type="button"
              onClick={resetLocalisation}
              className="shrink-0 rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-black text-gray-800"
            >
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {/* Panneau Filtre avancé : Tri + Quartier + Avenue + Vidéo + GPS */}
        {filtreOuvert && (
          <div className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2.5">
            <p className="text-[11px] font-black">Trier par</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["recent", "Plus récents"],
                  ["moins_cher", "Moins cher"],
                  ["plus_cher", "Plus cher"],
                  ["proximite", "📍 Plus proche"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    if (val === "proximite" && !geoCoords) {
                      activerGeolocalisation();
                      return;
                    }
                    setTri(val);
                  }}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
                    tri === val
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white text-gray-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                value={filtreQuartier}
                onChange={(e) => setFiltreQuartier(e.target.value)}
                placeholder="Quartier (ex: Matonge)"
                className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-[11px] text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
              />
              <input
                type="text"
                value={filtreAvenue}
                onChange={(e) => setFiltreAvenue(e.target.value)}
                placeholder="Avenue (ex: Victoire)"
                className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-[11px] text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 pt-1 text-[11px] font-bold">
              <input
                type="checkbox"
                checked={videoSeulement}
                onChange={(e) => setVideoSeulement(e.target.checked)}
                className="h-4 w-4 accent-black"
              />
              Avec vidéo seulement
            </label>
          </div>
        )}

        {/* Onglets catégories sans doublon */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCat("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${
              selectedCat === "all"
                ? "bg-black text-white"
                : "bg-white border text-gray-800"
            }`}
          >
            Tout ({filtered.length})
          </button>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedCat(t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${
                selectedCat === t.id
                  ? "bg-black text-white"
                  : "bg-white border text-gray-800"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* 4 boutons rapides (Panier, Notifs, Publier, Aide) */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => router.push("/panier")}
            className="bg-white border rounded-2xl py-3 text-center"
          >
            <p className="text-[18px]">🛒</p>
            <p className="text-[9px] font-black">Panier ({cartCount})</p>
          </button>
          <button
            type="button"
            onClick={() => router.push("/notifications")}
            className="bg-white border rounded-2xl py-3 text-center relative"
          >
            <p className="text-[18px]">🔔</p>
            <p className="text-[9px] font-black">Notifs ({notifCount})</p>
            {notifCount > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-black">
                {notifCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!exigerCompte(router, "/")) return;
              router.push("/publier");
            }}
            className="bg-white border rounded-2xl py-3 text-center"
          >
            <p className="text-[18px]">➕</p>
            <p className="text-[9px] font-black">Publier</p>
          </button>
          <button
            type="button"
            onClick={goWhatsAppDG}
            className="bg-white border rounded-2xl py-3 text-center"
          >
            <p className="text-[18px]">💬</p>
            <p className="text-[9px] font-black">Aide</p>
          </button>
        </div>

        {!voirTout ? (
          <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-3.5">
            <p className="font-black text-[13px]">
              ⭐ Recommandé pour toi à{" "}
              {selectedCommune !== "toutes" ? selectedCommune : maCommune}
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5">
              Sélection vérifiée par Wenze • 0 % commission • {filtered.length}{" "}
              annonce(s) vérifiée(s).
            </p>
          </div>
        ) : monRole === "grossiste" ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5">
            <p className="font-black text-[13px]">
              🏭 Marché gros — RDC & Kinshasa
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5">
              Tu vois tout, y compris les prix gros • 0 % commission.
            </p>
          </div>
      ) : jeSuisDG ? (
          <div className="bg-black text-white rounded-2xl p-3.5">
            <p className="font-black text-[13px]">
              👑 Mode DG — {filtered.length}/{MAX_ANNONCES_ACTIVES} annonces
              actives affichées
            </p>
            <p className="text-[10px] opacity-70 mt-0.5">
              Clique sur ★ pour recommander ou retirer. Le Client ne verra que
              les ★.
            </p>
          </div>
        ) : null}

        <div className="flex justify-between items-center">
          <p className="font-black text-[11px]">
            {filtered.length}/{MAX_ANNONCES_ACTIVES} annonce(s)
            {payantCount > 0 ? " • ✅ " + payantCount + " payants" : ""} •{" "}
            {prixMoyen}$ / {toCDFString(prixMoyen)} moy • 0 % comm
          </p>
          <button
            type="button"
            onClick={() => router.push("/recherche")}
            className="text-[10px] text-black font-bold border px-3 py-1 rounded-full bg-white"
          >
            Recherche →
          </button>
        </div>

        <FlashVideo annonces={filtered} onOpen={(a: any) => openVideoPage(a)} />

        <div className="grid grid-cols-2 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-white border rounded-2xl p-4">
              <p className="text-[32px]">🛍️</p>
              <p className="font-black text-[13px] mt-2">
                Aucune annonce visible pour cette zone
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Modifiez vos filtres (province, commune, quartier, avenue) ou
                publiez votre première annonce.
              </p>
            </div>
          ) : (
            filtered.map((a: any) => (
              <AnnonceCard
                key={a.id}
                annonce={a}
                jeSuisDG={jeSuisDG}
                jeSuisGrossiste={jeSuisGrossiste}
                onOpen={() => openProduit(a)}
                onImage={() => setSelectedImage(a)}
                onAddPanier={() => addPanier(a)}
                onContacter={() => contacter(a)}
                onToggleRecommande={() => toggleRecommande(a.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ===== MODALE CATÉGORIES : TOUT LE SERVICE, BOUTIQUE, GROSSISTE, PRESTATAIRES ===== */}
      {modalCategoriesOuvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3"
          onClick={() => setModalCategoriesOuvert(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-2xl bg-white p-4 space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-black text-[14px] text-gray-900">
                Catégories WENZE
              </p>
              <button
                type="button"
                onClick={() => setModalCategoriesOuvert(false)}
                className="w-8 h-8 rounded-full bg-gray-100 font-black text-[13px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-2">
              {optionsModalCategories.map((opt) => (
                <button
                  key={opt.titre}
                  type="button"
                  onClick={() => choisirCategorieModal(opt.id)}
                  className="flex items-center justify-between rounded-xl border border-gray-200 p-3 text-left hover:border-black"
                >
                  <div>
                    <p className="font-black text-[13px] text-gray-900">
                      {opt.emoji} {opt.titre}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {opt.description}
                    </p>
                  </div>
                  <span className="font-black text-[12px] text-gray-900">
                    ({opt.count}) →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedImage ? (
        <ImageViewer
          annonce={selectedImage}
          onClose={() => setSelectedImage(null)}
          onOpenProduit={() => {
            const cur = selectedImage;
            setSelectedImage(null);
            openProduit(cur);
          }}
          onAddPanier={() => addPanier(selectedImage)}
          onContacter={() => contacter(selectedImage)}
        />
      ) : null}

      <BottomNav
        active="accueil"
        cartCount={cartCount}
        onOpenCategories={() => setModalCategoriesOuvert(true)}
      />
    </div>
  );
}
    
