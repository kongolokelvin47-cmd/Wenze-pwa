"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { toCDFString, verifierAbonnement, isCompteCache, checkFreemiumWenze } from "@/lib/paiement";
import { HomeHeader, AnnonceCard, ImageViewer, BottomNav, fmtUSD } from "./HomeParts";

export const dynamic = "force-dynamic";

const cleanWa = (n: any): string => (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");

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
    const raw = localStorage.getItem("wenze_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function WenzeBusiness() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [ab, setAb] = useState<any>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadAnnonces = useCallback(() => {
    try {
      const usersMap = new Map<string, any>();
      for (const u of readList("wenze_all_users")) {
        const wa = cleanWa(u.ownerWhatsapp || u.whatsapp);
        if (wa) usersMap.set(wa, u);
      }
      const cur = readUser();
      if (cur) {
        const wa = cleanWa(cur.ownerWhatsapp || cur.whatsapp);
        if (wa) usersMap.set(wa, cur);
      }

      // Statut de chaque vendeur calculé une seule fois (et non une fois par annonce)
      const statuts = new Map<string, { cache: boolean; abv: any }>();
      const statutDe = (wa: string) => {
        let s = statuts.get(wa);
        if (!s) {
          const vendeur = usersMap.get(wa);
          s = { cache: false, abv: null };
          if (vendeur) {
            try {
              s.cache = isCompteCache(vendeur);
              s.abv = checkFreemiumWenze(vendeur, 0);
            } catch {}
          }
          statuts.set(wa, s);
        }
        return s;
      };

      const fixed = readList("wenze_annonces_list")
        .map((a: any) => ({ a, wa: cleanWa(a.ownerWhatsapp || a.whatsapp) }))
        .filter((x: any) => !statutDe(x.wa).cache)
        .map((x: any) => {
          const a = x.a;
          const abv = statutDe(x.wa).abv;
          const prix = Number(a.prixUSD || a.prix || 0);
          return {
            ...a,
            categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"),
            prix: prix,
            prixCDF: toCDFString(prix),
            isVideo: !!a.isVideo || (typeof a.photo === "string" && a.photo.startsWith("data:video")),
            isBoosted: !!a.boostUntil && new Date(a.boostUntil).getTime() > Date.now(),
            isPayant: !!abv?.isPaye,
            vendeurBadge: abv?.badge || "🆓",
            vendeurPalier: abv?.palierId || "Freemium",
            _wa: x.wa
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
    const onChange = () => {
      loadAnnonces();
      refreshAb();
      refreshCart();
    };
    onChange();

    // Notifications : chargées à part, une erreur ici ne bloque jamais l'accueil
    let cancelled = false;
    let stopNotifs: (() => void) | null = null;
    import("@/lib/notifications")
      .then((m: any) => {
        if (cancelled) return;
        const user = readUser() || {};
        const wa = cleanWa(user.ownerWhatsapp || user.whatsapp || user.id);
        const updateBadge = () => {
          try {
            setNotifCount(m.getUnreadCount ? m.getUnreadCount(user.id || wa) : 0);
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

  const filtered = useMemo(() => {
    let list = [...annonces];
    if (selectedCat !== "all") list = list.filter((a) => a.categorieId === selectedCat);
    if (debounced) {
      const s = debounced.toLowerCase();
      list = list.filter(
        (a) => (a.titre || "").toLowerCase().includes(s) || (a.description || "").toLowerCase().includes(s) || (a.commune || "").toLowerCase().includes(s)
      );
    }
    const time = (a: any) => new Date(a.created_at || a.createdAt || 0).getTime();
    return list.sort((a, b) => {
      if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
      if (a.isPayant !== b.isPayant) return a.isPayant ? -1 : 1;
      return time(b) - time(a);
    });
  }, [annonces, debounced, selectedCat]);

  const tabs = useMemo(
    () =>
      CATEGORIES_WENZE.filter((c: any) => c.id !== "client").map((c: any) => ({
        id: c.id as string,
        label: ((c.icon || "") + " " + (c.titreCourt || c.titre || c.id)).trim(),
        count: annonces.filter((a) => a.categorieId === c.id).length
      })),
    [annonces]
  );

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };

  const addPanier = (a: any) => {
    try {
      const panier = readList("wenze_panier");
      if (panier.some((p: any) => String(p.id) === String(a.id))) {
        showToast("Déjà dans le panier 🛒");
        return;
      }
      // Version légère : copier la photo complète remplissait le stockage ("Panier erreur")
      panier.push({
        id: a.id,
        titre: a.titre,
        prix: a.prix,
        prixUSD: a.prix,
        prixCDF: a.prixCDF,
        categorieId: a.categorieId,
        commune: a.commune || "",
        ville: a.ville || "Kinshasa",
        ownerWhatsapp: a._wa,
        whatsapp: a._wa,
        ownerName: a.ownerName || "",
        stock: a.stock || 1,
        qty: 1,
        photo: typeof a.photo === "string" && a.photo.length < 30000 ? a.photo : ""
      });
      localStorage.setItem("wenze_panier", JSON.stringify(panier));
      setCartCount(panier.length);
      window.dispatchEvent(new Event("wenze-update"));
      showToast("Ajouté : " + fmtUSD(a.prix) + "$ / " + a.prixCDF + " 🛒");
    } catch (e: any) {
      showToast(e && e.name === "QuotaExceededError" ? "Stockage plein : supprimez d'anciennes annonces" : "Impossible d'ajouter au panier");
    }
  };

  const keepCurrent = (a: any) => {
    try {
      localStorage.setItem("wenze_current_produit", JSON.stringify(a));
    } catch {}
  };
  const openProduit = (a: any) => {
    keepCurrent(a);
    router.push("/produit/" + a.id);
  };
  const openVideoPage = (a: any) => {
    keepCurrent(a);
    router.push("/video?id=" + a.id);
  };

  const prixMoyen = filtered.length ? Math.round(filtered.reduce((s, a) => s + Number(a.prix || 0), 0) / filtered.length) : 0;
  const boostedCount = filtered.filter((a) => a.isBoosted).length;
  const payantCount = filtered.filter((a) => a.isPayant).length;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <HomeHeader
        ab={ab}
        payantCount={payantCount}
        boostedCount={boostedCount}
        notifCount={notifCount}
        cartCount={cartCount}
        search={search}
        onSearch={setSearch}
        tabs={tabs}
        selectedCat={selectedCat}
        onSelectCat={setSelectedCat}
        totalCount={annonces.length}
      />

      <div className="p-4 space-y-3">
        {toast ? <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div> : null}

        {notifCount > 0 ? (
          <Link href="/notifications" className="w-full bg-black text-white rounded-2xl p-3.5 flex justify-between items-center">
            <span className="font-black text-[11px]">🔔 {notifCount} notification(s)</span>
            <span className="bg-white text-black px-3 py-1 rounded-full text-[10px] font-black">Voir →</span>
          </Link>
        ) : null}

        <div className="flex justify-between items-center">
          <p className="font-black text-[11px]">
            {filtered.length} annonce(s){payantCount > 0 ? " • ✅ " + payantCount + " payants" : ""} • {prixMoyen}$ moyen
          </p>
          <Link href="/recherche" className="text-[10px] text-black font-bold border px-3 py-1 rounded-full bg-white">Recherche →</Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-white border-2 border-dashed rounded-2xl">
              <p className="text-4xl">📦</p>
              <p className="text-[13px] font-black mt-3">Aucune annonce</p>
              <Link
                href={"/publier?cat=" + (selectedCat === "all" ? "commerces-services" : selectedCat)}
                className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[11px]"
              >
                + Publier une annonce
              </Link>
            </div>
          ) : (
            filtered.map((a) => (
              <AnnonceCard
                key={a.id}
                a={a}
                icon={(getCategorieById(a.categorieId) as any)?.icon || "🏬"}
                onMedia={(x: any) => (x.isVideo ? openVideoPage(x) : setSelectedImage(x))}
                onOpen={(x: any) => (x.isVideo ? openVideoPage(x) : openProduit(x))}
                onCart={addPanier}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav notifCount={notifCount} />

      {selectedImage ? (
        <ImageViewer
          a={selectedImage}
          onClose={() => setSelectedImage(null)}
          onOpen={(x: any) => {
            setSelectedImage(null);
            openProduit(x);
          }}
          onCart={addPanier}
        />
      ) : null}
    </div>
  );
          }
                     
