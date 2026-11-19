"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { toCDFString, verifierAbonnement, isCompteCache, checkFreemiumWenze } from "@/lib/paiement";
import { HomeHeader, AnnonceCard, ImageViewer, BottomNav, BandeauVisiteur, fmtUSD, waLink, APP_NAME } from "./HomeParts";
import { estConnecte, exigerCompte } from "@/lib/acces";

export const dynamic = "force-dynamic";
const cleanWa = (n: any): string => (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
function readList(key: string): any[] {
  try { if (typeof window === "undefined") return []; const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function readUser(): any {
  try { if (typeof window === "undefined") return null; const raw = localStorage.getItem("wenze_user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function readDesign(): any {
  try { const raw = localStorage.getItem("wenze_design_pub"); if (raw) return JSON.parse(raw); } catch {}
  return {};
}
const DEFAULT_DESIGN = {
  titre: "Bienvenue chez WENZE", slogan: "Le réseau qui te fait gagner",
  apropos: "WENZE - Ensemble on va plus loin. Boutiques vérifiées à Kinshasa.",
  whatsapp: "+243810000000", logo: "", couleur: "#FF6B00", couleurBouton: "#000000",
  showAmbassadeur: true, maintenance: false, showTombola: true,
};

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
  const [visiteur, setVisiteur] = useState(false);
  const [moi, setMoi] = useState<any>(null);
  const [design, setDesign] = useState<any>(DEFAULT_DESIGN);

  // === 1. DESIGN DG ===
  useEffect(() => {
    const loadDesign = () => setDesign({ ...DEFAULT_DESIGN, ...readDesign() });
    loadDesign();
    window.addEventListener("storage", loadDesign);
    window.addEventListener("wenze-update", loadDesign);
    return () => { window.removeEventListener("storage", loadDesign); window.removeEventListener("wenze-update", loadDesign); };
  }, []);

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };

  const loadAnnonces = useCallback(() => {
    try {
      const usersMap = new Map<string, any>();
      for (const u of readList("wenze_all_users")) { const wa = cleanWa(u.ownerWhatsapp || u.whatsapp); if (wa) usersMap.set(wa, u); }
      const cur = readUser(); setMoi(cur);
      if (cur) { const wa = cleanWa(cur.ownerWhatsapp || cur.whatsapp); if (wa) usersMap.set(wa, cur); }
      const statuts = new Map<string, { cache: boolean; abv: any }>();
      const statutDe = (wa: string) => {
        let s = statuts.get(wa);
        if (!s) { const vendeur = usersMap.get(wa); s = { cache: false, abv: null }; if (vendeur) { try { s.cache = isCompteCache(vendeur); s.abv = checkFreemiumWenze(vendeur, 0); } catch {} } statuts.set(wa, s); }
        return s;
      };
      const fixed = readList("wenze_annonces_list")
        .map((a: any) => ({ a, wa: cleanWa(a.ownerWhatsapp || a.whatsapp) }))
        .filter((x: any) => !statutDe(x.wa).cache)
        .map((x: any) => {
          const a = x.a; const abv = statutDe(x.wa).abv; const prix = Number(a.prixUSD || a.prix || 0);
          return { ...a, categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"), prix, prixCDF: toCDFString(prix),
            isVideo: !!a.isVideo || (typeof a.photo === "string" && a.photo.startsWith("data:video")),
            isBoosted: !!a.boostUntil && new Date(a.boostUntil).getTime() > Date.now(),
            isPayant: !!abv?.isPaye, vendeurBadge: abv?.badge || "🆓", vendeurPalier: abv?.palierId || "Freemium", _wa: x.wa };
        });
      setAnnonces(fixed);
    } catch { setAnnonces([]); }
  }, []);

  useEffect(() => {
    const refreshAb = () => { try { setAb(verifierAbonnement()); } catch {} };
    const refreshCart = () => setCartCount(readList("wenze_panier").length);
    const refreshVisiteur = () => setVisiteur(!estConnecte());
    const onChange = () => { loadAnnonces(); refreshAb(); refreshCart(); refreshVisiteur(); };
    onChange();
    let cancelled = false; let stopNotifs: (() => void) | null = null;
    import("@/lib/notifications").then((m: any) => {
      if (cancelled) return;
      const user = readUser() || {}; const wa = cleanWa(user.ownerWhatsapp || user.whatsapp || user.id);
      const updateBadge = () => { try { setNotifCount(m.getUnreadCount ? m.getUnreadCount(user.id || wa) : 0); } catch {} };
      try { if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations(); } catch {}
      updateBadge(); window.addEventListener("wenze-notif", updateBadge);
      const i1 = setInterval(() => { try { if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations(); } catch {} updateBadge(); loadAnnonces(); }, 60 * 60 * 1000);
      const i2 = setInterval(updateBadge, 3000);
      stopNotifs = () => { window.removeEventListener("wenze-notif", updateBadge); clearInterval(i1); clearInterval(i2); };
    }).catch(() => {});
    window.addEventListener("storage", onChange); window.addEventListener("wenze-update", onChange);
    return () => { cancelled = true; if (stopNotifs) stopNotifs(); window.removeEventListener("storage", onChange); window.removeEventListener("wenze-update", onChange); };
  }, [loadAnnonces]);

  // === 2. RÔLES + COHABITATION ===
  const monRole = moi?.role || (moi?.estVendeur ? "vendeur" : "client");
  const jeSuisDG = moi?.roleAdmin === "dg" || moi?.role === "dg" || moi?.role === "DG";
  const jeSuisGrossiste = monRole === "grossiste" || jeSuisDG;
  const voirTout = monRole !== "client" || jeSuisDG;
  const maCommune = moi?.commune || "Kinshasa";

  const filtered = useMemo(() => {
    let list = [...annonces];
    if (!voirTout) list = list.filter((a: any) => a.recommandeParDG === true);
    if (selectedCat !== "all") list = list.filter((a) => a.categorieId === selectedCat);
    if (debounced) {
      const s = debounced.toLowerCase();
      list = list.filter((a) => (a.titre || "").toLowerCase().includes(s) || (a.description || "").toLowerCase().includes(s) || (a.commune || "").toLowerCase().includes(s));
    }
    const time = (a: any) => new Date(a.created_at || a.createdAt || 0).getTime();
    return list.sort((a, b) => {
      const aIci = (a.commune || "") === maCommune ? 0 : 1;
      const bIci = (b.commune || "") === maCommune ? 0 : 1;
      if (aIci !== bIci) return aIci - bIci;
      if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
      if (a.isPayant !== b.isPayant) return a.isPayant ? -1 : 1;
      return time(b) - time(a);
    });
  }, [annonces, debounced, selectedCat, voirTout, maCommune]);

  const tabs = useMemo(() => CATEGORIES_WENZE.filter((c: any) => c.id !== "client").map((c: any) => ({
    id: c.id as string, label: ((c.icon || "") + " " + (c.titreCourt || c.titre || c.id)).trim(),
    count: filtered.filter((a) => a.categorieId === c.id).length
  })), [filtered]);

  const waClean = (design.whatsapp || "").toString().replace(/[^0-9]/g, "");
  const goBack = () => { if (window.history.length > 1) router.back(); else router.push("/"); };
  const goWhatsAppDG = () => window.open(`https://wa.me/${waClean}?text=${encodeURIComponent("Bonjour WENZE, je veux des infos")}`, "_blank");

  const toggleRecommande = (id: string) => {
    if (!jeSuisDG) return;
    const list = readList("wenze_annonces_list").map((a: any) => String(a.id) === String(id) ? { ...a, recommandeParDG: !a.recommandeParDG } : a);
    localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
    window.dispatchEvent(new Event("wenze-update"));
    showToast("Recommandation mise à jour ★");
  };

  const addPanier = (a: any) => {
    if (!exigerCompte(router, "/")) return;
    try {
      const panier = readList("wenze_panier");
      if (panier.some((p: any) => String(p.id) === String(a.id))) { showToast("Déjà dans le panier 🛒"); return; }
      const estGros = a.typeAnnonce === "gros";
      const minGros = estGros ? Number(a.minimumCommande || 10) : 1;
      if (estGros && !jeSuisGrossiste) { showToast("🔒 Prix gros réservé aux Grossistes"); return; }
      panier.push({ id: a.id, titre: a.titre, prix: a.prix, prixUSD: a.prix, prixCDF: a.prixCDF, categorieId: a.categorieId, commune: a.commune || "", ville: a.ville || "Kinshasa", ownerWhatsapp: a._wa, whatsapp: a._wa, ownerName: a.ownerName || "", stock: a.stock || 1, qty: minGros, quantite: minGros, typeAnnonce: a.typeAnnonce, prixGros: Number(a.prixGros || 0), uniteGros: a.uniteGros || "Carton", minimumCommande: minGros, prixAffiche: a.prixAffiche, photo: typeof a.photo === "string" && a.photo.length < 30000 ? a.photo : "" });
      localStorage.setItem("wenze_panier", JSON.stringify(panier));
      setCartCount(panier.length); window.dispatchEvent(new Event("wenze-update"));
      if (estGros) showToast(`Ajouté : ${Number(a.prixGros).toLocaleString()} FC / ${a.uniteGros || "carton"} x${minGros} 🏭`);
      else showToast("Ajouté : " + fmtUSD(a.prix) + "$ / " + a.prixCDF + " 🛒");
    } catch (e: any) { showToast(e?.name === "QuotaExceededError" ? "Stockage plein : supprimez d'anciennes annonces" : "Impossible d'ajouter au panier"); }
  };

  const contacter = (a: any) => {
    if (!exigerCompte(router, "/")) return;
    const lien = waLink(a._wa, 'Bonjour, je suis intéressé par "' + a.titre + '" à ' + fmtUSD(a.prix) + "$ sur " + APP_NAME);
    if (lien) window.open(lien, "_blank", "noopener");
  };

  const keepCurrent = (a: any) => { try { localStorage.setItem("wenze_current_produit", JSON.stringify(a)); } catch {} };
  const openProduit = (a: any) => { keepCurrent(a); router.push("/produit/" + a.id); };
  const openVideoPage = (a: any) => { keepCurrent(a); router.push("/video?id=" + a.id); };

  const prixMoyen = filtered.length ? Math.round(filtered.reduce((s, a) => s + Number(a.prix || 0), 0) / filtered.length) : 0;
  const boostedCount = filtered.filter((a) => a.isBoosted).length;
  const payantCount = filtered.filter((a) => a.isPayant).length;

  // === 3. MAINTENANCE DG ===
  if (design.maintenance && !jeSuisDG) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 pt-24 text-center">
        <p className="text-[50px]">🚧</p><h1 className="font-black text-[22px] mt-2">On revient bientôt</h1>
        <p className="text-[13px] text-gray-500 mt-2">{design.titre} est en maintenance.</p>
        <button onClick={goWhatsAppDG} className="mt-6 bg-black text-white px-6 py-3 rounded-full font-black text-[13px]">Contacter sur WhatsApp</button>
        <div className="mt-6"><button onClick={goBack} className="text-[12px] underline text-gray-500">← Retour</button></div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      {/* BARRE RETOUR + LOGO DG */}
      <div className="px-4 pt-3 flex items-center justify-between">
        <button onClick={goBack} className="w-9 h-9 bg-white border rounded-full font-black text-[16px]">←</button>
        <div className="flex items-center gap-2">
          {design.logo ? <img src={design.logo} alt="WENZE" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black">W</div>}
          <span className="font-black text-[16px]">WENZE<span style={{ color: design.couleur }}>.</span></span>
        </div>
        {moi ? <button onClick={() => router.push("/profil")} className="bg-black text-white px-3 py-2 rounded-full font-black text-[11px]">Mon profil →</button> : <button onClick={() => router.push("/connexion")} className="bg-black text-white px-3 py-2 rounded-full font-black text-[11px]">Se connecter</button>}
      </div>

      {/* HERO DG */}
      <div className="px-4 mt-3 bg-white border rounded-2xl p-4">
        <h1 className="font-black text-[22px] leading-[1.1]">{design.titre}</h1>
        <p className="text-[13px] text-gray-600 mt-1">{design.slogan}</p>
        <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{design.apropos}</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => router.push("/inscription")} style={{ background: design.couleurBouton }} className="flex-1 text-white py-3.5 rounded-full font-black text-[12px]">Créer mon compte</button>
          <button onClick={goWhatsAppDG} className="flex-1 bg-white border-2 border-black py-3.5 rounded-full font-black text-[12px]">WhatsApp DG</button>
        </div>
        {design.showAmbassadeur && <button onClick={() => router.push("/inscription?role=ambassadeur")} className="w-full mt-2 bg-[#FFF2CC] border-2 border-dashed border-black py-3.5 rounded-2xl font-black text-[12px]">⭐ Devenir Ambassadeur WENZE</button>}
        {design.maintenance && jeSuisDG && <p className="text-center text-[10px] font-black text-orange-600 mt-2">⚠️ MODE MAINTENANCE ACTIF - Seul toi DG vois la page</p>}
      </div>

      <HomeHeader ab={ab} payantCount={payantCount} boostedCount={boostedCount} notifCount={notifCount} cartCount={cartCount} search={search} onSearch={setSearch} tabs={tabs} selectedCat={selectedCat} onSelectCat={setSelectedCat} totalCount={annonces.length} />
      {visiteur ? <BandeauVisiteur /> : null}

      <div className="p-4 space-y-3">
        {toast ? <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div> : null}

        {/* BOUTONS RAPIDES */}
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => router.push("/panier")} className="bg-white border rounded-2xl py-3 text-center"><p className="text-[18px]">🛒</p><p className="text-[9px] font-black">Panier ({cartCount})</p></button>
          <button onClick={() => router.push("/notifications")} className="bg-white border rounded-2xl py-3 text-center"><p className="text-[18px]">🔔</p><p className="text-[9px] font-black">Notifs ({notifCount})</p></button>
          <button onClick={() => { if (!exigerCompte(router, "/")) return; router.push("/publier"); }} className="bg-white border rounded-2xl py-3 text-center"><p className="text-[18px]">➕</p><p className="text-[9px] font-black">Publier</p></button>
          <button onClick={goWhatsAppDG} className="bg-white border rounded-2xl py-3 text-center"><p className="text-[18px]">💬</p><p className="text-[9px] font-black">Aide</p></button>
        </div>

        {/* BANDEAU RÔLE */}
        {!voirTout ? (
          <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-3.5"><p className="font-black text-[13px]">⭐ Recommandé pour toi à {maCommune}</p><p className="text-[10px] text-gray-600 mt-0.5">Sélection vérifiée par Wenze. {filtered.length} boutique(s) vérifiée(s).</p></div>
        ) : monRole === "grossiste" ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5"><p className="font-black text-[13px]">🏭 Marché gros - Tout Kinshasa</p><p className="text-[10px] text-gray-600 mt-0.5">Tu vois tout, y compris les prix gros. Le Client ne les voit pas.</p></div>
        ) : jeSuisDG ? (
          <div className="bg-black text-white rounded-2xl p-3.5"><p className="font-black text-[13px]">👑 Mode DG - {annonces.length} annonces au total</p><p className="text-[10px] opacity-70 mt-0.5">Clique sur ★ pour recommander / retirer. Le Client ne verra que les ★.</p></div>
        ) : null}

        {notifCount > 0 ? (
          <button onClick={() => router.push("/notifications")} className="w-full bg-black text-white rounded-2xl p-3.5 flex justify-between items-center"><span className="font-black text-[11px]">🔔 {notifCount} notification(s)</span><span className="bg-white text-black px-3 py-1 rounded-full text-[10px] font-black">Voir →</span></button>
        ) : null}

        <div className="flex justify-between items-center">
          <p className="font-black text-[11px]">{filtered.length} annonce(s){payantCount > 0 ? " • ✅ " + payantCount + " payants" : ""} • {prixMoyen}$ moyen</p>
          <button onClick={() => router.push("/recherche")} className="text-[10px] text-black font-bold border px-3 py-1 rounded-full bg-white">Recherche →</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-white border-2 border-dashed rounded-2xl">
              <p className="text-4xl">📦</p><p className="text-[13px] font-black mt-3">{!voirTout ? "Aucune boutique recommandée pour l'instant" : "Aucune annonce"}</p>
              <p className="text-[11px] text-gray-500 mt-1 px-4">{!voirTout ? "Le DG n'a pas encore recommandé de boutique dans ta zone. Reviens bientôt." : ""}</p>
              {voirTout ? <button onClick={() => router.push("/publier?cat=" + (selectedCat === "all" ? "commerces-services" : selectedCat))} className="mt-4 bg-black text-white px-6 py-3 rounded-full font-black text-[11px]">+ Publier une annonce</button> : <button onClick={() => router.push("/recommandes")} className="mt-4 bg-yellow-400 text-black px-6 py-3 rounded-full font-black text-[11px]">Voir les recommandés →</button>}
            </div>
          ) : (
            filtered.map((a) => (
              <div key={a.id} className="relative">
                <AnnonceCard a={a} icon={(getCategorieById(a.categorieId) as any)?.icon || "🏬"}
                  onMedia={(x: any) => (x.isVideo ? openVideoPage(x) : setSelectedImage(x))}
                  onOpen={(x: any) => (x.isVideo ? openVideoPage(x) : openProduit(x))}
                  onCart={addPanier} onContact={contacter} />
                {jeSuisDG ? (
                  <button onClick={() => toggleRecommande(a.id)} className={"absolute top-2 left-2 z-10 text-[10px] px-2 py-1 rounded-full font-black " + (a.recommandeParDG ? "bg-yellow-400 text-black" : "bg-white text-gray-500 border")}>{a.recommandeParDG ? "★ Recommandé" : "☆ Recommander"}</button>
                ) : a.recommandeParDG ? <span className="absolute top-2 left-2 z-10 text-[9px] bg-yellow-400 px-2 py-0.5 rounded-full font-black">⭐ RECOMMANDÉ</span> : null}
              </div>
            ))
          )}
        </div>

        {design.showTombola && (
          <div className="bg-black text-white rounded-2xl p-5"><p className="font-black text-[16px]">🎟️ Tombola WENZE</p><p className="text-[12px] text-white/70 mt-1">Achète ton ticket et tente de gagner.</p><button onClick={() => router.push("/inscription")} className="w-full mt-4 bg-white text-black py-3 rounded-full font-black text-[13px]">Prendre mon ticket →</button></div>
        )}

        <div className="text-center pt-4 space-y-2">
          <button onClick={goBack} className="block w-full bg-white border py-3 rounded-full font-black text-[12px]">← Retour</button>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="block w-full text-[11px] text-gray-500 underline">↑ Remonter en haut</button>
          <p className="text-[10px] text-gray-400">WENZE © 2026 • Kinshasa • {design.whatsapp}</p>
          <button onClick={() => router.push("/dg-prive/connexion")} className="text-[10px] text-gray-300 underline">Tu es membre de l'équipe ? Connexion équipe ici</button>
        </div>
      </div>

      <BottomNav notifCount={notifCount} />
      {selectedImage ? <ImageViewer a={selectedImage} onClose={() => setSelectedImage(null)} onOpen={(x: any) => { setSelectedImage(null); openProduit(x); }} onCart={addPanier} onContact={contacter} /> : null}
    </div>
  );
}
