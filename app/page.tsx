"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { HomeHeader, AnnonceCard, ImageViewer, BottomNav, fmtUSD } from "./HomeParts";

export const dynamic = "force-dynamic";

const cleanWa = (n: any): string => (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
const TAUX_CDF = 2850;
const safeCDF = (p:any)=>{ try{ const v=Number(p||0); return isNaN(v)?"0 CDF":(v*TAUX_CDF).toLocaleString()+" CDF"; }catch{ return "0 CDF"; } };
const norm = (s:any)=>(s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");

function readList(key: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
function readUser(): any {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("wenze_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function WenzeBusiness() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [notifCount, setNotifCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const loadAnnonces = useCallback(() => {
    try {
      const usersMap = new Map<string, any>();
      for (const u of readList("wenze_all_users")) {
        const wa = cleanWa(u.ownerWhatsapp || u.whatsapp || u.id);
        if (wa) usersMap.set(wa, u);
      }
      const cur = readUser();
      if (cur) {
        const wa = cleanWa(cur.ownerWhatsapp || cur.whatsapp || cur.id);
        if (wa) usersMap.set(wa, cur);
      }

      // FIX ECRAN BLANC + ANNONCES CACHÉES: on n'utilise plus isCompteCache / checkFreemiumWenze ici
      // Avant: .filter(x => !statutDe(x.wa).cache) -> supprimait les annonces
      // Après: on affiche TOUT, le filtre prix/abonnement reste que dans /tarif
      const fixed = readList("wenze_annonces_list")
        .map((a: any) => {
          const wa = cleanWa(a.ownerWhatsapp || a.whatsapp || a.userId);
          const vendeur = usersMap.get(wa);
          const prix = Number(a.prixUSD || a.prix || 0);
          const nomBoutique = (vendeur?.nomBoutique || vendeur?.boutiqueName || a.boutiqueName || a.nomEtablissement || `Boutique ${wa.slice(-4)}`).toString().replace(/^Boutiques\s*/i,"").replace(/^Boutique\s*/i,"").trim();
          return {
            ...a,
            categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"),
            prix: isNaN(prix)?0:prix,
            prixCDF: safeCDF(prix),
            isVideo: !!a.isVideo || !!a.video || !!a.videoUrl || (typeof a.photo === "string" && a.photo.startsWith("data:video")),
            isBoosted: !!a.boostUntil && new Date(a.boostUntil).getTime() > Date.now(),
            isPayant: false,
            vendeurBadge: "",
            vendeurPalier: "",
            vendeurNom: `Boutiques ${nomBoutique}`,
            _wa: wa,
            _vendeur: vendeur || null,
          };
        });
      setAnnonces(fixed);
    } catch { setAnnonces([]); }
  }, []);

  useEffect(() => {
    const refreshCart = () => setCartCount(readList("wenze_panier").length);
    const onChange = () => { loadAnnonces(); refreshCart(); };
    onChange();

    let cancelled = false;
    let stopNotifs: (() => void) | null = null;
    import("@/lib/notifications")
      .then((m: any) => {
        if (cancelled) return;
        const user = readUser() || {};
        const wa = cleanWa(user.ownerWhatsapp || user.whatsapp || user.id);
        const updateBadge = () => { try{ setNotifCount(m.getUnreadCount ? m.getUnreadCount(user.id || wa) : 0); }catch{} };
        try{ if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations(); }catch{}
        updateBadge();
        window.addEventListener("wenze-notif", updateBadge);
        const i1 = setInterval(() => { try{ if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations(); }catch{} updateBadge(); loadAnnonces(); }, 60*60*1000);
        const i2 = setInterval(updateBadge, 3000);
        stopNotifs = () => { window.removeEventListener("wenze-notif", updateBadge); clearInterval(i1); clearInterval(i2); };
      }).catch(() => {});

    window.addEventListener("storage", onChange);
    window.addEventListener("wenze-update", onChange);
    return () => {
      cancelled = true;
      if (stopNotifs) stopNotifs();
      window.removeEventListener("storage", onChange);
      window.removeEventListener("wenze-update", onChange);
    };
  }, [loadAnnonces]);

  // RECHERCHE INTELLIGENTE COMME /boutiques: B, 8, Bilamba, 0825, pagne, prix
  const filtered = useMemo(() => {
    let list = [...annonces];
    if (selectedCat !== "all") list = list.filter((a) => a.categorieId === selectedCat);
    if (debounced) {
      const s = norm(debounced);
      list = list.filter((a) => {
        const wa = a._wa || "";
        const wa9 = wa.slice(-9);
        const hay = norm(`${a.titre||""} ${a.description||""} ${a.commune||""} ${a.ville||""} ${a.vendeurNom||""} ${a.marque||""} ${wa} ${wa9} 0${wa9} ${a.prix||""}`);
        return hay.includes(s);
      });
    }
    const time = (a: any) => new Date(a.created_at || a.createdAt || 0).getTime();
    return list.sort((a, b) => {
      if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
      return time(b) - time(a);
    });
  }, [annonces, debounced, selectedCat]);

  const tabs = useMemo(
    () => CATEGORIES_WENZE.filter((c: any) => c.id !== "client").map((c: any) => ({
      id: c.id as string,
      label: ((c.icon || "") + " " + (c.titreCourt || c.titre || c.id)).trim(),
      count: annonces.filter((a) => a.categorieId === c.id).length
    })),
    [annonces]
  );

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const addPanier = (a: any) => {
    try {
      const panier = readList("wenze_panier");
      if (panier.some((p: any) => String(p.id) === String(a.id))) { showToast("Déjà dans le panier 🛒"); return; }
      panier.push({
        id: a.id, titre: a.titre, prix: a.prix, prixUSD: a.prix, prixCDF: a.prixCDF,
        categorieId: a.categorieId, commune: a.commune || "", ville: a.ville || "Kinshasa",
        ownerWhatsapp: a._wa, whatsapp: a._wa, ownerName: a.ownerName || "", stock: a.stock || 1, qty: 1,
        photo: typeof a.photo === "string" && a.photo.length < 30000 ? a.photo : ""
      });
      localStorage.setItem("wenze_panier", JSON.stringify(panier));
      setCartCount(panier.length);
      window.dispatchEvent(new Event("wenze-update"));
      showToast("Ajouté : " + fmtUSD(a.prix) + "$ / " + a.prixCDF + " 🛒");
    } catch (e: any) { showToast(e && e.name === "QuotaExceededError" ? "Stockage plein : supprimez d'anciennes annonces" : "Impossible d'ajouter au panier"); }
  };

  const keepCurrent = (a: any) => { try{ localStorage.setItem("wenze_current_produit", JSON.stringify(a)); }catch{} };
  const openProduit = (a: any) => {
    if(!a?.id) return;
    keepCurrent(a);
    // FIX LIEN INACCESSIBLE: encodeURIComponent pour WENZE-... + id propre
    router.push("/produit/" + encodeURIComponent(a.id));
  };
  const openVideoPage = (a: any) => {
    if(!a?.id) return;
    keepCurrent(a);
    router.push("/video?id=" + encodeURIComponent(a.id));
  };

  const prixMoyen = filtered.length ? Math.round(filtered.reduce((s, a) => s + Number(a.prix || 0), 0) / filtered.length) : 0;
  const boostedCount = filtered.filter((a) => a.isBoosted).length;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <HomeHeader
        ab={null}
        payantCount={0}
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
          <p className="font-black text-[11px]">{filtered.length} annonce(s){boostedCount > 0 ? " • 🔥 " + boostedCount + " boostés" : ""} • {prixMoyen}$ moyen</p>
          <Link href="/recherche" className="text-[10px] text-black font-bold border px-3 py-1 rounded-full bg-white">Recherche →</Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-white border-2 border-dashed rounded-2xl">
              <p className="text-4xl">📦</p>
              <p className="text-[13px] font-black mt-3">Aucune annonce</p>
              <Link href={"/publier?cat=" + (selectedCat === "all" ? "commerces-services" : selectedCat)} className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[11px]">+ Publier une annonce</Link>
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
          onOpen={(x: any) => { setSelectedImage(null); openProduit(x); }}
          onCart={addPanier}
        />
      ) : null}
    </div>
  );
}
