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
function writeList(key: string, list: any[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}
// --- MOTEUR SUGGESTION WENZE V4 - Comme Alibaba ---
function saveRecherche(q: string) {
  if (!q || q.length < 2) return;
  const list = readList("wenze_recherches").filter((x: any) => String(x.q).toLowerCase() !== q.toLowerCase());
  list.unshift({ q, at: Date.now() });
  writeList("wenze_recherches", list.slice(0, 20));
}
function saveVu(a: any) {
  if (!a?.id) return;
  const list = readList("wenze_vus").filter((x: any) => String(x.id) !== String(a.id));
  list.unshift({ id: a.id, categorieId: a.categorieId, commune: a.commune, titre: a.titre, prix: a.prix, at: Date.now() });
  writeList("wenze_vus", list.slice(0, 30));
}
function scoreSimilarite(base: any, cand: any): number {
  if (String(base.id) === String(cand.id)) return -1;
  let s = 0;
  if (base.categorieId && base.categorieId === cand.categorieId) s += 50;
  if (base.commune && base.commune === cand.commune) s += 25;
  if (base._wa && base._wa === cand._wa) s += 15;
  const p1 = Number(base.prix || 0), p2 = Number(cand.prix || 0);
  if (p1 > 0 && p2 > 0) { const diff = Math.abs(p1 - p2) / p1; if (diff < 0.3) s += 20; else if (diff < 0.7) s += 10; }
  if (cand.isBoosted) s += 10;
  if (cand.isPayant) s += 8;
  if (cand.recommandeParDG) s += 12;
  return s;
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
  const [visiteur, setVisiteur] = useState(false);
  const [moi, setMoi] = useState<any>(null);
  // V4 - Design DG + Suggestions + Notifs Suggestion
  const [designPub, setDesignPub] = useState<any>({ main: "#FF6B00", btn: "#111111", title: "Bienvenue chez WENZE", slogan: "Le réseau qui te fait gagner", about: "WENZE - Ensemble on va plus loin.", whats: "+243 810 000 000", logo: "", showAmb: true, maintenance: false });
  const [recherches, setRecherches] = useState<any[]>([]);
  const [vus, setVus] = useState<any[]>([]);
  const [suggestNotifs, setSuggestNotifs] = useState<any[]>([]);
  const [showSuggestNotifs, setShowSuggestNotifs] = useState(false);
    useEffect(() => {
    const t = setTimeout(() => {
      const q = search.trim();
      setDebounced(q);
      if (q.length >= 2) saveRecherche(q);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const lireDesignDG = useCallback(() => {
    try {
      let d: any = null;
      const v1 = localStorage.getItem("wenze_design_pub");
      if (v1) d = JSON.parse(v1);
      if (!d) { const v2 = localStorage.getItem("wenze_dg_v3"); if (v2) d = JSON.parse(v2)?.designPub; }
      if (!d) { const v3 = localStorage.getItem("wenze_design"); if (v3) d = JSON.parse(v3); }
      if (d?.title) setDesignPub((p: any) => ({ ...p, ...d }));
    } catch {}
  }, []);

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
          if (vendeur) { try { s.cache = isCompteCache(vendeur); s.abv = checkFreemiumWenze(vendeur, 0); } catch {} }
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
          return { ...a, categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"), prix, prixCDF: toCDFString(prix), isVideo: !!a.isVideo || (typeof a.photo === "string" && a.photo.startsWith("data:video")), isBoosted: !!a.boostUntil && new Date(a.boostUntil).getTime() > Date.now(), isPayant: !!abv?.isPaye, vendeurBadge: abv?.badge || "🆓", vendeurPalier: abv?.palierId || "Freemium", _wa: x.wa };
        });
      setAnnonces(fixed);
      setRecherches(readList("wenze_recherches"));
      setVus(readList("wenze_vus"));
    } catch { setAnnonces([]); }
  }, []);
    useEffect(() => {
    lireDesignDG();
    const refreshAb = () => { try { setAb(verifierAbonnement()); } catch {} };
    const refreshCart = () => setCartCount(readList("wenze_panier").length);
    const refreshVisiteur = () => setVisiteur(!estConnecte());
    const onChange = () => { loadAnnonces(); refreshAb(); refreshCart(); refreshVisiteur(); lireDesignDG(); };
    onChange();
    let cancelled = false;
    let stopNotifs: (() => void) | null = null;
    import("@/lib/notifications").then((m: any) => {
      if (cancelled) return;
      const user = readUser() || {};
      const wa = cleanWa(user.ownerWhatsapp || user.whatsapp || user.id);
      const updateBadge = () => { try { setNotifCount(m.getUnreadCount ? m.getUnreadCount(user.id || wa) : 0); } catch {} };
      try { if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations(); } catch {}
      updateBadge();
      window.addEventListener("wenze-notif", updateBadge);
      const i1 = setInterval(() => { try { if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations(); } catch {} updateBadge(); loadAnnonces(); }, 60 * 60 * 1000);
      const i2 = setInterval(updateBadge, 3000);
      stopNotifs = () => { window.removeEventListener("wenze-notif", updateBadge); clearInterval(i1); clearInterval(i2); };
    }).catch(() => {});
    window.addEventListener("storage", onChange);
    window.addEventListener("wenze-update", onChange);
    return () => { cancelled = true; if (stopNotifs) stopNotifs(); window.removeEventListener("storage", onChange); window.removeEventListener("wenze-update", onChange); };
  }, [loadAnnonces, lireDesignDG]);

  const monRole = moi?.role || (moi?.estVendeur ? "vendeur" : "client");
  const jeSuisDG = moi?.roleAdmin === "dg" || moi?.role === "dg";
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

  // --- SUGGESTIONS ALIBABA V4 ---
  const suggestionsPourToi = useMemo(() => {
    if (!annonces.length || jeSuisDG) return [];
    const baseList = annonces.filter((a) => voirTout || a.recommandeParDG);
    // 1. Basé sur dernière recherche
    const lastQ = recherches[0]?.q || "";
    let fromSearch: any[] = [];
    if (lastQ) { const s = lastQ.toLowerCase(); fromSearch = baseList.filter((a) => (a.titre || "").toLowerCase().includes(s) || (a.description || "").toLowerCase().includes(s)).slice(0, 6); }
    // 2. Basé sur dernier produit vu
    let fromVu: any[] = [];
    if (vus[0]) {
      const base = baseList.find((a) => String(a.id) === String(vus[0].id)) || vus[0];
      fromVu = baseList.map((a) => ({ a, score: scoreSimilarite(base, a) })).filter((x) => x.score > 40).sort((x, y) => y.score - x.score).map((x) => x.a).slice(0, 6);
    }
    // 3. Basé sur commune
    const fromCommune = baseList.filter((a) => a.commune === maCommune && !fromSearch.some((x) => x.id === a.id) && !fromVu.some((x) => x.id === a.id)).slice(0, 6);
    const merged: any[] = [];
    for (const a of [...fromSearch, ...fromVu, ...fromCommune]) if (!merged.some((x) => x.id === a.id)) merged.push(a);
    return merged.slice(0, 10);
  }, [annonces, recherches, vus, voirTout, jeSuisDG, maCommune]);

  // --- NOTIFICATIONS SUGGESTIONS - Comme Facebook / Snapchat ---
  useEffect(() => {
    if (!suggestionsPourToi.length || jeSuisDG || visiteur) return;
    const lastQ = recherches[0]?.q || vus[0]?.titre || "toi";
    const key = "wenze_suggest_notif_" + String(suggestionsPourToi[0]?.id) + "_" + lastQ;
    const deja = readList("wenze_suggest_notifs_vues").some((x: any) => x.key === key);
    if (deja) return;
    const notif = { key, titre: `🔥 Nouvelle suggestion pour toi`, texte: `Parce que tu as cherché "${lastQ}", on a trouvé ${suggestionsPourToi.length} produit(s) similaire(s) à ${maCommune}.`, produitId: suggestionsPourToi[0]?.id, at: Date.now(), lu: false };
    const all = readList("wenze_suggest_notifs");
    all.unshift(notif);
    writeList("wenze_suggest_notifs", all.slice(0, 20));
    setSuggestNotifs(all.slice(0, 5));
  }, [suggestionsPourToi, recherches, vus, jeSuisDG, visiteur, maCommune]);

  useEffect(() => { setSuggestNotifs(readList("wenze_suggest_notifs").slice(0, 5)); }, [annonces]);

  const marquerSuggestLu = () => {
    const all = readList("wenze_suggest_notifs").map((n: any) => ({ ...n, lu: true }));
    writeList("wenze_suggest_notifs", all);
    const vues = readList("wenze_suggest_notifs_vues");
    for (const n of all) vues.push({ key: n.key });
    writeList("wenze_suggest_notifs_vues", vues.slice(-50));
    setSuggestNotifs([]);
    setShowSuggestNotifs(false);
  };
    const tabs = useMemo(() => CATEGORIES_WENZE.filter((c: any) => c.id !== "client").map((c: any) => ({ id: c.id as string, label: ((c.icon || "") + " " + (c.titreCourt || c.titre || c.id)).trim(), count: filtered.filter((a) => a.categorieId === c.id).length })), [filtered]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };
  const toggleRecommande = (id: string) => {
    if (!jeSuisDG) return;
    const list = readList("wenze_annonces_list").map((a: any) => String(a.id) === String(id) ? { ...a, recommandeParDG: !a.recommandeParDG } : a);
    localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
    window.dispatchEvent(new Event("wenze-update"));
    showToast("Recommandation mise à jour");
  };
  const addPanier = (a: any) => {
    if (!exigerCompte(router, "/")) return;
    try {
      const panier = readList("wenze_panier");
      if (panier.some((p: any) => String(p.id) === String(a.id))) { showToast("Déjà dans le panier 🛒"); return; }
      const estGros = a.typeAnnonce === "gros";
      const minGros = estGros ? Number(a.minimumCommande || 10) : 1;
      const jeSuisGrossiste = moi?.role === "grossiste" || moi?.roleAdmin === "dg" || moi?.role === "dg";
      if (estGros && !jeSuisGrossiste) { showToast("🔒 Prix gros réservé aux Grossistes"); return; }
      panier.push({ id: a.id, titre: a.titre, prix: a.prix, prixUSD: a.prix, prixCDF: a.prixCDF, categorieId: a.categorieId, commune: a.commune || "", ville: a.ville || "Kinshasa", ownerWhatsapp: a._wa, whatsapp: a._wa, ownerName: a.ownerName || "", stock: a.stock || 1, qty: minGros, quantite: minGros, typeAnnonce: a.typeAnnonce, prixGros: Number(a.prixGros || 0), uniteGros: a.uniteGros || "Carton", minimumCommande: minGros, prixAffiche: a.prixAffiche, photo: typeof a.photo === "string" && a.photo.length < 30000 ? a.photo : "" });
      localStorage.setItem("wenze_panier", JSON.stringify(panier));
      setCartCount(panier.length);
      window.dispatchEvent(new Event("wenze-update"));
      if (estGros) showToast(`Ajouté : ${Number(a.prixGros).toLocaleString()} FC / ${a.uniteGros || "carton"} x${minGros} 🏭`);
      else showToast("Ajouté : " + fmtUSD(a.prix) + "$ / " + a.prixCDF + " 🛒");
    } catch (e: any) { showToast(e && e.name === "QuotaExceededError" ? "Stockage plein : supprimez d'anciennes annonces" : "Impossible d'ajouter au panier"); }
  };
  const contacter = (a: any) => {
    if (!exigerCompte(router, "/")) return;
    const lien = waLink(a._wa, 'Bonjour, je suis intéressé par "' + a.titre + '" à ' + fmtUSD(a.prix) + "$ sur " + APP_NAME);
    if (lien) window.open(lien, "_blank", "noopener");
  };
  const keepCurrent = (a: any) => { try { localStorage.setItem("wenze_current_produit", JSON.stringify(a)); } catch {} };
  const openProduit = (a: any) => { saveVu(a); setVus(readList("wenze_vus")); keepCurrent(a); router.push("/produit/" + a.id); };
  const openVideoPage = (a: any) => { saveVu(a); keepCurrent(a); router.push("/video?id=" + a.id); };
  const prixMoyen = filtered.length ? Math.round(filtered.reduce((s, a) => s + Number(a.prix || 0), 0) / filtered.length) : 0;
  const boostedCount = filtered.filter((a) => a.isBoosted).length;
  const payantCount = filtered.filter((a) => a.isPayant).length;
  const suggestNonLus = suggestNotifs.filter((n: any) => !n.lu).length;
    return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <HomeHeader ab={ab} payantCount={payantCount} boostedCount={boostedCount} notifCount={notifCount + suggestNonLus} cartCount={cartCount} search={search} onSearch={setSearch} tabs={tabs} selectedCat={selectedCat} onSelectCat={setSelectedCat} totalCount={annonces.length} />
      {visiteur ? <BandeauVisiteur /> : null}
      {designPub.maintenance ? (
        <div className="p-4"><div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed"><p className="text-4xl">🚧</p><h2 className="font-black text-[18px] mt-2">On revient bientôt</h2><p className="text-[12px] text-gray-500 mt-1">{designPub.about}</p><p className="text-[12px] font-bold mt-3">WhatsApp : {designPub.whats}</p></div></div>
      ) : (
      <>
      <div className="mx-4 mt-4 rounded-2xl p-4 text-center bg-white border" style={{ borderColor: designPub.main }}>
        {designPub.logo ? <img src={designPub.logo} alt="WENZE" className="w-[80px] h-[80px] object-cover rounded-2xl mx-auto mb-2" /> : null}
        <h1 className="font-black text-[18px] leading-tight" style={{ color: designPub.main }}>{designPub.title}</h1>
        <p className="text-[12px] font-bold mt-1">{designPub.slogan}</p>
        <p className="text-[11px] text-gray-500 mt-1">{designPub.about}</p>
        <div className="flex gap-2 mt-3">
          <a href={"https://wa.me/" + designPub.whats.replace(/[^0-9]/g, "")} target="_blank" rel="noreferrer" className="flex-1 py-3 rounded-full font-black text-[12px] text-white" style={{ background: designPub.main }}>📱 {designPub.whats}</a>
          {designPub.showAmb ? <Link href="/devenir-ambassadeur" className="flex-1 py-3 rounded-full font-black text-[12px] bg-black text-white text-center">Devenir Ambassadeur →</Link> : null}
        </div>
      </div>
      <div className="p-4 space-y-3">
        {toast ? <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div> : null}
        {!voirTout ? (<div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-3.5"><p className="font-black text-[13px]">⭐ Recommandé pour toi à {maCommune}</p><p className="text-[10px] text-gray-600 mt-0.5">Sélection vérifiée par Wenze. {filtered.length} boutique(s) vérifiée(s).</p></div>) : monRole === "grossiste" ? (<div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5"><p className="font-black text-[13px]">🏭 Marché gros - Tout Kinshasa</p><p className="text-[10px] text-gray-600 mt-0.5">Tu vois tout, y compris les prix gros. Le Client ne les voit pas.</p></div>) : jeSuisDG ? (<div className="bg-black text-white rounded-2xl p-3.5"><p className="font-black text-[13px]">👑 Mode DG - {annonces.length} annonces au total</p><p className="text-[10px] opacity-70 mt-0.5">Clique sur ★ pour recommander / retirer. Le Client ne verra que les ★.</p></div>) : null}

        {/* 🔔 NOTIFICATIONS SUGGESTIONS - Style Facebook / Snapchat */}
        {suggestNonLus > 0 ? (
          <button onClick={() => setShowSuggestNotifs(!showSuggestNotifs)} className="w-full bg-black text-white rounded-2xl p-3.5 flex justify-between items-center text-left">
            <span className="font-black text-[11px]">🔔 {suggestNonLus} suggestion(s) pour toi</span>
            <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black">{showSuggestNotifs ? "Fermer ↑" : "Voir →"}</span>
          </button>
        ) : null}
        {showSuggestNotifs && suggestNotifs.length > 0 ? (
          <div className="space-y-2">
            {suggestNotifs.map((n: any, i: number) => (
              <div key={i} className="bg-white border border-yellow-300 rounded-2xl p-3 flex gap-2">
                <span className="text-2xl">💡</span>
                <div className="flex-1"><p className="font-black text-[12px]">{n.titre}</p><p className="text-[11px] text-gray-600">{n.texte}</p><button onClick={() => { marquerSuggestLu(); const p = annonces.find((a) => String(a.id) === String(n.produitId)); if (p) openProduit(p); }} className="mt-2 bg-black text-white px-4 py-2 rounded-full text-[10px] font-black">Voir la suggestion →</button></div>
              </div>
            ))}
          </div>
        ) : null}

        {/* 🔥 SUGGESTIONS POUR TOI - Moteur Alibaba */}
        {!jeSuisDG && suggestionsPourToi.length > 0 && !debounced ? (
          <div className="bg-white border rounded-2xl p-3">
            <p className="font-black text-[13px]">🔥 Suggestions pour toi {recherches[0]?.q ? `• Parce que tu as cherché "${recherches[0].q}"` : vus[0]?.titre ? `• Similaire à "${vus[0].titre}"` : `• À ${maCommune}`}</p>
            <p className="text-[10px] text-gray-500">Comme Alibaba, basé sur tes recherches et tes vues.</p>
            <div className="flex gap-2 overflow-x-auto mt-2 pb-1">
              {suggestionsPourToi.slice(0, 6).map((a: any) => (
                <button key={a.id} onClick={() => openProduit(a)} className="min-w-[130px] text-left bg-[#FFFBF0] border rounded-xl p-2">
                  <p className="font-black text-[11px] line-clamp-2">{a.titre}</p>
                  <p className="text-[10px] text-gray-500">{a.commune} • {fmtUSD(a.prix)}$</p>
                  <p className="text-[10px] font-black" style={{ color: designPub.main }}>Voir →</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* 🕘 TES RECHERCHES RECENTES */}
        {recherches.length > 0 && !debounced && !jeSuisDG ? (
          <div className="flex gap-2 overflow-x-auto">
            <span className="text-[10px] font-black py-1">🕘 Récents :</span>
            {recherches.slice(0, 5).map((r: any, i: number) => (<button key={i} onClick={() => setSearch(r.q)} className="bg-white border px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap">{r.q}</button>))}
          </div>
        ) : null}

        {notifCount > 0 ? (<Link href="/notifications" className="w-full bg-black text-white rounded-2xl p-3.5 flex justify-between items-center"><span className="font-black text-[11px]">🔔 {notifCount} notification(s)</span><span className="bg-white text-black px-3 py-1 rounded-full text-[10px] font-black">Voir →</span></Link>) : null}
        <div className="flex justify-between items-center"><p className="font-black text-[11px]">{filtered.length} annonce(s){payantCount > 0 ? " • ✅ " + payantCount + " payants" : ""} • {prixMoyen}$ moyen</p><Link href="/recherche" className="text-[10px] text-black font-bold border px-3 py-1 rounded-full bg-white">Recherche →</Link></div>
        <div className="grid grid-cols-2 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-white border-2 border-dashed rounded-2xl"><p className="text-4xl">📦</p><p className="text-[13px] font-black mt-3">{!voirTout ? "Aucune boutique recommandée pour l'instant" : "Aucune annonce"}</p><p className="text-[11px] text-gray-500 mt-1 px-4">{!voirTout ? "Le DG n'a pas encore recommandé de boutique dans ta zone. Reviens bientôt." : ""}</p>{voirTout ? (<Link href={"/publier?cat=" + (selectedCat === "all" ? "commerces-services" : selectedCat)} className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[11px]">+ Publier une annonce</Link>) : (<Link href="/recommandes" className="mt-4 inline-block bg-yellow-400 text-black px-6 py-3 rounded-full font-black text-[11px]">Voir les recommandés →</Link>)}</div>
          ) : (filtered.map((a) => (
              <div key={a.id} className="relative">
                <AnnonceCard a={a} icon={(getCategorieById(a.categorieId) as any)?.icon || "🏬"} onMedia={(x: any) => (x.isVideo ? openVideoPage(x) : setSelectedImage(x))} onOpen={(x: any) => (x.isVideo ? openVideoPage(x) : openProduit(x))} onCart={addPanier} onContact={contacter} />
                {jeSuisDG ? (<button onClick={() => toggleRecommande(a.id)} className={"absolute top-2 left-2 z-10 text-[10px] px-2 py-1 rounded-full font-black " + (a.recommandeParDG ? "bg-yellow-400 text-black" : "bg-white text-gray-500 border")}>{a.recommandeParDG ? "★ Recommandé" : "☆ Recommander"}</button>) : a.recommandeParDG ? (<span className="absolute top-2 left-2 z-10 text-[9px] bg-yellow-400 px-2 py-0.5 rounded-full font-black">⭐ RECOMMANDÉ</span>) : null}
              </div>
            )))}
        </div>
      </div>
      </>
      )}
      <BottomNav notifCount={notifCount + suggestNonLus} />
      {selectedImage ? (<ImageViewer a={selectedImage} onClose={() => setSelectedImage(null)} onOpen={(x: any) => { setSelectedImage(null); openProduit(x); }} onCart={addPanier} onContact={contacter} />) : null}
    </div>
  );
        }
