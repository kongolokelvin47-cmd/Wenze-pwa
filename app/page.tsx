"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, normalizeCategorie } from "@/lib/categories";
import { toCDFString, verifierAbonnement, isCompteCache, checkFreemiumWenze } from "@/lib/paiement";
import { HomeHeader, AnnonceCard, ImageViewer, BottomNav, BandeauVisiteur, fmtUSD, waLink, APP_NAME } from "./HomeParts";
import { estConnecte, exigerCompte } from "@/lib/acces";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null as any;

const cleanWa = (n: any): string => (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
const ouvrirWhatsAppDirect = (tel: string, message: string) => { const n = cleanWa(tel); if (n) window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, "_blank"); };

function readList(key: string): any[] {
  try { if (typeof window === "undefined") return []; const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function readUser(): any {
  try {
    if (typeof window === "undefined") return null;
    const s = localStorage.getItem("wenze_session");
    if (s) { const session = JSON.parse(s); return { ...session, whatsapp: session.telephone || session.whatsapp, ownerWhatsapp: session.telephone || session.whatsapp, role: session.role, commune: session.commune || "Kinshasa" }; }
    const raw = localStorage.getItem("wenze_user"); return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeList(key: string, list: any[]) { try { localStorage.setItem(key, JSON.stringify(list)); } catch {} }
function saveRecherche(q: string) { if (!q || q.length < 2) return; const list = readList("wenze_recherches").filter((x: any) => String(x.q).toLowerCase() !== q.toLowerCase()); list.unshift({ q, at: Date.now() }); writeList("wenze_recherches", list.slice(0, 20)); }
function saveVu(a: any) { if (!a?.id) return; const list = readList("wenze_vus").filter((x: any) => String(x.id) !== String(a.id)); list.unshift({ id: a.id, categorieId: a.categorieId, commune: a.commune, titre: a.titre, prix: a.prix, at: Date.now() }); writeList("wenze_vus", list.slice(0, 30)); }
function scoreSimilarite(base: any, cand: any): number {
  if (String(base.id) === String(cand.id)) return -1; let s = 0;
  if (base.categorieId && base.categorieId === cand.categorieId) s += 50;
  if (base.commune && base.commune === cand.commune) s += 25;
  if (base._wa && base._wa === cand._wa) s += 15;
  const p1 = Number(base.prix || 0), p2 = Number(cand.prix || 0);
  if (p1 > 0 && p2 > 0) { const diff = Math.abs(p1 - p2) / p1; if (diff < 0.3) s += 20; else if (diff < 0.7) s += 10; }
  if (cand.isBoosted) s += 10; if (cand.isPayant) s += 8; if (cand.recommandeParDG) s += 12; return s;
}
const DESIGN_DEFAUT = { main: "#FF6B00", btn: "#111111", title: "Bienvenue chez WENZE", slogan: "Le réseau qui te fait gagner", about: "WENZE - Ensemble on va plus loin.", whats: "+243 810 000 000", logo: "", showAmb: true, maintenance: false };
export default function WenzeBusiness() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [boutiquesPub, setBoutiquesPub] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [ab, setAb] = useState<any>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [visiteur, setVisiteur] = useState(false);
  const [moi, setMoi] = useState<any>(null);
  const [designPub, setDesignPub] = useState<any>(DESIGN_DEFAUT);
  const [recherches, setRecherches] = useState<any[]>([]);
  const [vus, setVus] = useState<any[]>([]);
  const [suggestNotifs, setSuggestNotifs] = useState<any[]>([]);
  const [showSuggestNotifs, setShowSuggestNotifs] = useState(false);
  const [filtreProvince, setFiltreProvince] = useState("TOUT");
  const [filtreCommune, setFiltreCommune] = useState("TOUT");
  const [vueBoutique, setVueBoutique] = useState<any>(null);
  const [vueAnnonce, setVueAnnonce] = useState<any>(null);
  // Formulaires qui envoient VRAIMENT au DG
  const [formBout, setFormBout] = useState({ nom: "", proprietaire: "", telephone: "", province: "Kinshasa", commune: "", quartier: "", code_parrain: "" });
  const [formCli, setFormCli] = useState({ nom: "", telephone: "", province: "Kinshasa", commune: "", quartier: "", code_parrain: "" });
  const [formInvit, setFormInvit] = useState({ parrain_nom: "", parrain_tel: "", invite_nom: "", invite_tel: "", type_invite: "BOUTIQUE" });
  const designChannelRef = useRef<any>(null);
  const dataChannelRef = useRef<any>(null);

  useEffect(() => { const t = setTimeout(() => { const q = search.trim(); setDebounced(q); if (q.length >= 2) saveRecherche(q); }, 300); return () => clearTimeout(t); }, [search]);

  const lireDesignDG = useCallback(async () => {
    if (supabase) {
      try {
        const { data } = await supabase.from("config_publique").select("*").eq("id", 1).single();
        if (data) {
          setDesignPub((p: any) => ({ ...p, title: data.title || data.slogan || p.title, slogan: data.slogan || p.slogan, about: data.about || p.about, main: data.main || data.couleur || p.main, whats: data.whats || p.whats, logo: data.logo || p.logo, showAmb: data.showAmb ?? p.showAmb, maintenance: data.maintenance ?? p.maintenance }));
          try { localStorage.setItem("wenze_design_pub", JSON.stringify(data)); } catch {} return;
        }
      } catch {}
    }
    try { let d: any = null; const v1 = localStorage.getItem("wenze_design_pub"); if (v1) d = JSON.parse(v1); if (!d) { const v2 = localStorage.getItem("wenze_dg_v3"); if (v2) d = JSON.parse(v2)?.designPub; } if (!d) { const v3 = localStorage.getItem("wenze_design"); if (v3) d = JSON.parse(v3); } if (d?.title || d?.slogan) setDesignPub((p: any) => ({ ...p, ...d })); } catch {}
  }, []);

  // ✅ CORRIGÉ — Lit Supabase, pas localStorage. Seules APPROUVE / VALIDEE.
  const loadAnnonces = useCallback(async () => {
    try {
      const cur = readUser(); setMoi(cur);
      setRecherches(readList("wenze_recherches")); setVus(readList("wenze_vus"));
      if (supabase) {
        const [aRes, bRes] = await Promise.all([
          supabase.from("annonces").select("*").eq("statut", "APPROUVE").order("created_at", { ascending: false }),
          supabase.from("boutiques").select("*").eq("statut", "VALIDEE").order("created_at", { ascending: false }),
        ]);
        // Annonces Supabase → format attendu par AnnonceCard
        const usersMap = new Map<string, any>(); for (const u of readList("wenze_all_users")) { const w = cleanWa(u.ownerWhatsapp || u.whatsapp); if (w) usersMap.set(w, u); }
        if (cur) { const w = cleanWa(cur.ownerWhatsapp || cur.whatsapp); if (w) usersMap.set(w, cur); }
        const fixed = (aRes.data || []).filter((a: any) => { const w = cleanWa(a.telephone || a.ownerWhatsapp || a.whatsapp); const v = usersMap.get(w); if (!v) return true; try { return !isCompteCache(v); } catch { return true; } }).map((a: any) => {
          const wa = cleanWa(a.telephone || a.ownerWhatsapp || a.whatsapp); const vendeur = usersMap.get(wa); let abv: any = null; try { if (vendeur) abv = checkFreemiumWenze(vendeur, 0); } catch {}
          const prix = Number(a.prixUSD || a.prix || 0);
          return { ...a, categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"), prix, prixCDF: toCDFString(prix), isVideo: !!a.isVideo || (typeof a.photo === "string" && a.photo.startsWith("data:video")), isBoosted: !!a.boostUntil && new Date(a.boostUntil).getTime() > Date.now(), isPayant: !!abv?.isPaye, vendeurBadge: abv?.badge || "🆓", vendeurPalier: abv?.palierId || "Freemium", _wa: wa, titre: a.titre, description: a.description, commune: a.commune, photo: a.image_url || a.photo_url || a.photo };
        });
        setAnnonces(fixed);
        setBoutiquesPub(bRes.data || []);
        return;
      }
      // Fallback local si Supabase absent — jamais en production
      const fixed = readList("wenze_annonces_list").map((a: any) => ({ ...a, categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"), prix: Number(a.prixUSD || a.prix || 0), prixCDF: toCDFString(Number(a.prixUSD || a.prix || 0)), _wa: cleanWa(a.ownerWhatsapp || a.whatsapp) }));
      setAnnonces(fixed);
    } catch { setAnnonces([]); }
  }, []);
    useEffect(() => {
    lireDesignDG(); loadAnnonces();
    if (supabase && !designChannelRef.current) {
      designChannelRef.current = supabase.channel("design-public-v1").on("postgres_changes", { event: "*", schema: "public", table: "config_publique", filter: "id=eq.1" }, (payload: any) => { if (payload.new) { setDesignPub((p: any) => ({ ...p, ...payload.new, main: payload.new.main || payload.new.couleur || p.main })); try { localStorage.setItem("wenze_design_pub", JSON.stringify(payload.new)); } catch {} } }).subscribe();
    }
    // ✅ TEMPS RÉEL — DG approuve / valide / publie → public voit sans recharger
    if (supabase && !dataChannelRef.current) {
      dataChannelRef.current = supabase.channel("public-data-v2")
        .on("postgres_changes", { event: "*", schema: "public", table: "annonces" }, () => loadAnnonces())
        .on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, () => loadAnnonces())
        .on("postgres_changes", { event: "*", schema: "public", table: "config_publique" }, () => lireDesignDG())
        .subscribe();
    }
    const refreshAb = () => { try { setAb(verifierAbonnement()); } catch {} };
    const refreshCart = () => setCartCount(readList("wenze_panier").length);
    const refreshVisiteur = () => setVisiteur(!estConnecte());
    const onChange = () => { loadAnnonces(); refreshAb(); refreshCart(); refreshVisiteur(); lireDesignDG(); };
    onChange();
    let cancelled = false; let stopNotifs: (() => void) | null = null;
    import("@/lib/notifications").then((m: any) => {
      if (cancelled) return; const user = readUser() || {}; const wa = cleanWa(user.ownerWhatsapp || user.whatsapp || user.id);
      const updateBadge = () => { try { setNotifCount(m.getUnreadCount ? m.getUnreadCount(user.id || wa) : 0); } catch {} };
      try { if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations(); } catch {}; updateBadge();
      window.addEventListener("wenze-notif", updateBadge);
      const i1 = setInterval(() => { try { if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations(); } catch {} updateBadge(); loadAnnonces(); }, 60 * 60 * 1000);
      const i2 = setInterval(updateBadge, 3000);
      stopNotifs = () => { window.removeEventListener("wenze-notif", updateBadge); clearInterval(i1); clearInterval(i2); };
    }).catch(() => {});
    window.addEventListener("storage", onChange); window.addEventListener("wenze-update", onChange);
    return () => { cancelled = true; if (designChannelRef.current && supabase) { supabase.removeChannel(designChannelRef.current); designChannelRef.current = null; } if (dataChannelRef.current && supabase) { supabase.removeChannel(dataChannelRef.current); dataChannelRef.current = null; } if (stopNotifs) stopNotifs(); window.removeEventListener("storage", onChange); window.removeEventListener("wenze-update", onChange); };
  }, [loadAnnonces, lireDesignDG]);

  // ✅ CORRIGÉ — Plus de Mode DG sur le public. Le DG a dg-prive. Ici tout le monde voit la même vitrine.
  const monRole = moi?.role || (moi?.estVendeur ? "vendeur" : "client");
  const jeSuisDG = false; // Volontaire : jamais de Mode DG sur la page publique
  const maCommune = moi?.commune || "Kinshasa";

  const filtered = useMemo(() => {
    let list = [...annonces];
    // ✅ CORRIGÉ — Le client voit TOUTES les annonces APPROUVÉES, pas seulement les recommandées
    if (selectedCat !== "all") list = list.filter((a) => a.categorieId === selectedCat);
    if (filtreProvince !== "TOUT") list = list.filter((a: any) => (a.province || "Kinshasa") === filtreProvince);
    if (filtreCommune !== "TOUT") list = list.filter((a: any) => a.commune === filtreCommune);
    if (debounced) { const s = debounced.toLowerCase(); list = list.filter((a) => (a.titre || "").toLowerCase().includes(s) || (a.description || "").toLowerCase().includes(s) || (a.commune || "").toLowerCase().includes(s)); }
    const time = (a: any) => new Date(a.created_at || a.createdAt || 0).getTime();
    return list.sort((a, b) => { const aIci = (a.commune || "") === maCommune ? 0 : 1; const bIci = (b.commune || "") === maCommune ? 0 : 1; if (aIci !== bIci) return aIci - bIci; if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1; if (a.isPayant !== b.isPayant) return a.isPayant ? -1 : 1; return time(b) - time(a); });
  }, [annonces, debounced, selectedCat, filtreProvince, filtreCommune, maCommune]);

  const boutiquesFiltrees = useMemo(() => boutiquesPub.filter(b => (filtreProvince === "TOUT" || (b.province || "Kinshasa") === filtreProvince) && (filtreCommune === "TOUT" || b.commune === filtreCommune) && (debounced === "" || (b.nom + " " + b.proprietaire + " " + b.commune).toLowerCase().includes(debounced.toLowerCase()))), [boutiquesPub, filtreProvince, filtreCommune, debounced]);
  const provinces = useMemo(() => ["TOUT", ...new Set(boutiquesPub.map(b => b.province || "Kinshasa").filter(Boolean))], [boutiquesPub]);
  const communes = useMemo(() => ["TOUT", ...new Set(boutiquesPub.filter(b => filtreProvince === "TOUT" || (b.province || "Kinshasa") === filtreProvince).map(b => b.commune).filter(Boolean))], [boutiquesPub, filtreProvince]);

  const suggestionsPourToi = useMemo(() => {
    if (!annonces.length) return []; const baseList = annonces; const lastQ = recherches[0]?.q || ""; let fromSearch: any[] = [];
    if (lastQ) { const s = lastQ.toLowerCase(); fromSearch = baseList.filter((a) => (a.titre || "").toLowerCase().includes(s) || (a.description || "").toLowerCase().includes(s)).slice(0, 6); }
    let fromVu: any[] = []; if (vus[0]) { const base = baseList.find((a) => String(a.id) === String(vus[0].id)) || vus[0]; fromVu = baseList.map((a) => ({ a, score: scoreSimilarite(base, a) })).filter((x) => x.score > 40).sort((x, y) => y.score - x.score).map((x) => x.a).slice(0, 6); }
    const fromCommune = baseList.filter((a) => a.commune === maCommune && !fromSearch.some((x) => x.id === a.id) && !fromVu.some((x) => x.id === a.id)).slice(0, 6);
    const merged: any[] = []; for (const a of [...fromSearch, ...fromVu, ...fromCommune]) if (!merged.some((x) => x.id === a.id)) merged.push(a); return merged.slice(0, 10);
  }, [annonces, recherches, vus, maCommune]);

  useEffect(() => {
    if (!suggestionsPourToi.length || visiteur) return; const lastQ = recherches[0]?.q || vus[0]?.titre || "toi"; const key = "wenze_suggest_notif_" + String(suggestionsPourToi[0]?.id) + "_" + lastQ; const deja = readList("wenze_suggest_notifs_vues").some((x: any) => x.key === key); if (deja) return;
    const notif = { key, titre: `🔥 Nouvelle suggestion pour toi`, texte: `Parce que tu as cherché "${lastQ}", on a trouvé ${suggestionsPourToi.length} produit(s) similaire(s) à ${maCommune}.`, produitId: suggestionsPourToi[0]?.id, at: Date.now(), lu: false };
    const all = readList("wenze_suggest_notifs"); all.unshift(notif); writeList("wenze_suggest_notifs", all.slice(0, 20)); setSuggestNotifs(all.slice(0, 5));
  }, [suggestionsPourToi, recherches, vus, visiteur, maCommune]);
  useEffect(() => { setSuggestNotifs(readList("wenze_suggest_notifs").slice(0, 5)); }, [annonces]);
  const marquerSuggestLu = () => { const all = readList("wenze_suggest_notifs").map((n: any) => ({ ...n, lu: true })); writeList("wenze_suggest_notifs", all); const vues = readList("wenze_suggest_notifs_vues"); for (const n of all) vues.push({ key: n.key }); writeList("wenze_suggest_notifs_vues", vues.slice(-50)); setSuggestNotifs([]); setShowSuggestNotifs(false); };

  // ✅ NOUVEAU — Inscriptions qui envoient VRAIMENT au DG (Supabase), pas localStorage
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };
  const inscrireBoutique = async () => {
    if (!formBout.nom.trim() || formBout.telephone.length < 9) return showToast("❌ Nom boutique + WhatsApp obligatoires");
    if (!supabase) return showToast("⚠️ Supabase non connecté");
    const { error } = await supabase.from("boutiques").insert({ id: "B-" + Date.now(), nom: formBout.nom, proprietaire: formBout.proprietaire || formBout.nom, telephone: formBout.telephone, province: formBout.province, commune: formBout.commune, quartier: formBout.quartier, statut: "EN_ATTENTE", abonnement: "SANS_ABO", type_abonnement: "PREMIER", code_amb: formBout.code_parrain || null });
    if (error) return showToast("❌ " + error.message);
    if (formBout.code_parrain) await supabase.from("invitations").insert({ id: "INV-" + Date.now(), parrain_nom: formBout.code_parrain, parrain_tel: "", type_invite: "BOUTIQUE", invite_nom: formBout.nom, statut_invite: "EN_ATTENTE", abonnement_paye: false });
    showToast("✅ Demande envoyée — le DG va valider ta boutique"); setFormBout({ nom: "", proprietaire: "", telephone: "", province: "Kinshasa", commune: "", quartier: "", code_parrain: "" });
  };
  const inscrireClient = async () => {
    if (!formCli.nom.trim() || formCli.telephone.length < 9) return showToast("❌ Nom + WhatsApp obligatoires");
    if (!supabase) return showToast("⚠️ Supabase non connecté");
    const { error } = await supabase.from("clients").insert({ id: "C-" + Date.now(), nom: formCli.nom, telephone: formCli.telephone, province: formCli.province, commune: formCli.commune, quartier: formCli.quartier, statut: "ACTIF", code_parrain: formCli.code_parrain || null });
    if (error) return showToast("❌ " + error.message);
    if (formCli.code_parrain) await supabase.from("invitations").insert({ id: "INV-" + Date.now(), parrain_nom: formCli.code_parrain, parrain_tel: "", type_invite: "CLIENT", invite_nom: formCli.nom, statut_invite: "ACTIF", abonnement_paye: false });
    showToast("✅ Bienvenue sur WENZE !"); setFormCli({ nom: "", telephone: "", province: "Kinshasa", commune: "", quartier: "", code_parrain: "" });
  };
  const envoyerInvitation = async () => {
    if (!formInvit.parrain_nom.trim() || !formInvit.invite_nom.trim() || formInvit.invite_tel.length < 9) return showToast("❌ Ton nom + nom invité + son WhatsApp obligatoires");
    if (!supabase) return showToast("⚠️ Supabase non connecté");
    const { error } = await supabase.from("invitations").insert({ id: "INV-" + Date.now(), parrain_nom: formInvit.parrain_nom, parrain_tel: formInvit.parrain_tel, type_invite: formInvit.type_invite, invite_nom: formInvit.invite_nom, invite_tel: formInvit.invite_tel, statut_invite: "INVITE", abonnement_paye: false });
    if (error) return showToast("❌ " + error.message);
    showToast("✅ Invitation envoyée — tu gagnes des points quand ton invité est validé"); setFormInvit({ parrain_nom: "", parrain_tel: "", invite_nom: "", invite_tel: "", type_invite: "BOUTIQUE" });
  };
    const tabs = useMemo(() => CATEGORIES_WENZE.filter((c: any) => c.id !== "client").map((c: any) => ({ id: c.id as string, label: ((c.icon || "") + " " + (c.titreCourt || c.titre || c.id)).trim(), count: filtered.filter((a) => a.categorieId === c.id).length })), [filtered]);
  // ✅ SUPPRIMÉ : toggleRecommande (DG) — le DG ne recommande plus depuis le public, il le fait dans dg-prive
  const addPanier = (a: any) => {
    if (!exigerCompte(router, "/")) return;
    try {
      const panier = readList("wenze_panier");
      if (panier.some((p: any) => String(p.id) === String(a.id))) { showToast("Déjà dans le panier 🛒"); return; }
      const estGros = a.typeAnnonce === "gros"; const minGros = estGros ? Number(a.minimumCommande || 10) : 1;
      const jeSuisGrossiste = moi?.role === "grossiste";
      if (estGros && !jeSuisGrossiste) { showToast("🔒 Prix gros réservé aux Grossistes"); return; }
      panier.push({ id: a.id, titre: a.titre, prix: a.prix, prixUSD: a.prix, prixCDF: a.prixCDF, categorieId: a.categorieId, commune: a.commune || "", ville: a.ville || "Kinshasa", ownerWhatsapp: a._wa, whatsapp: a._wa, ownerName: a.ownerName || "", stock: a.stock || 1, qty: minGros, quantite: minGros, typeAnnonce: a.typeAnnonce, prixGros: Number(a.prixGros || 0), uniteGros: a.uniteGros || "Carton", minimumCommande: minGros, prixAffiche: a.prixAffiche, photo: typeof a.photo === "string" && a.photo.length < 30000 ? a.photo : "" });
      localStorage.setItem("wenze_panier", JSON.stringify(panier)); setCartCount(panier.length); window.dispatchEvent(new Event("wenze-update"));
      if (estGros) showToast(`Ajouté : ${Number(a.prixGros).toLocaleString()} FC / ${a.uniteGros || "carton"} x${minGros} 🏭`); else showToast("Ajouté : " + fmtUSD(a.prix) + "$ / " + a.prixCDF + " 🛒");
    } catch (e: any) { showToast(e && e.name === "QuotaExceededError" ? "Stockage plein : supprimez d'anciennes annonces" : "Impossible d'ajouter au panier"); }
  };
  const contacter = (a: any) => { if (!exigerCompte(router, "/")) return; const lien = waLink(a._wa, 'Bonjour, je suis intéressé par "' + a.titre + '" à ' + fmtUSD(a.prix) + "$ sur " + APP_NAME); if (lien) window.open(lien, "_blank", "noopener"); };
  const keepCurrent = (a: any) => { try { localStorage.setItem("wenze_current_produit", JSON.stringify(a)); } catch {} };
  const openProduit = (a: any) => { saveVu(a); setVus(readList("wenze_vus")); keepCurrent(a); router.push("/produit/" + a.id); };
  const openVideoPage = (a: any) => { saveVu(a); keepCurrent(a); router.push("/video?id=" + a.id); };
  const prixMoyen = filtered.length ? Math.round(filtered.reduce((s, a) => s + Number(a.prix || 0), 0) / filtered.length) : 0;
  const boostedCount = filtered.filter((a) => a.isBoosted).length;
  const payantCount = filtered.filter((a) => a.isPayant).length;
  const suggestNonLus = suggestNotifs.filter((n: any) => !n.lu).length;
  const retourFiche = () => { setVueBoutique(null); setVueAnnonce(null); setSelectedImage(null); };
    // ✅ NOUVEAU — Fiche Boutique publique PRO
  if (vueBoutique) {
    const b = vueBoutique;
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3 z-10">
          <button onClick={retourFiche} className="w-10 h-10 bg-black text-white rounded-full font-black">←</button>
          <div><p className="font-black text-[15px] leading-none">{b.nom}</p><p className="text-[11px] text-gray-500">Boutique WENZE • Validée par le DG</p></div>
        </div>
        <div className="px-4 mt-4 space-y-3">
          {(b.image_url || b.photo_url || b.photo) ? <button onClick={() => setSelectedImage({ photo: b.image_url || b.photo_url || b.photo })} className="block w-full"><img src={b.image_url || b.photo_url || b.photo} className="w-full h-[260px] object-cover rounded-3xl" /><p className="text-[11px] text-gray-500 mt-1 text-center">👆 Clique pour agrandir</p></button> : <div className="w-full h-[180px] bg-gray-200 rounded-3xl flex items-center justify-center text-[48px]">🏪</div>}
          <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[20px]">{b.nom}</p><p className="text-[13px] text-gray-600 mt-1">👤 {b.proprietaire} • 📍 {b.province || "Kinshasa"} — {b.commune} — {b.quartier}</p><p className="text-[13px] text-gray-600">Abonnement : <b>{b.abonnement}</b> • <span className="text-green-600 font-bold">✅ Validée</span></p></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => ouvrirWhatsAppDirect(b.telephone, `Bonjour ${b.proprietaire}, j'ai vu ta boutique ${b.nom} sur WENZE. Je veux acheter.`)} className="bg-[#25D366] text-white py-3.5 rounded-2xl font-black text-[12px]">💬 WhatsApp Boutique</button>
            <button onClick={() => { if (b.telephone) window.location.href = `tel:${b.telephone}`; }} className="bg-black text-white py-3.5 rounded-2xl font-black text-[12px]">📞 Appeler Boutique</button>
          </div>
          <button onClick={retourFiche} className="w-full bg-white border py-3 rounded-full font-black text-[12px]">← Retour</button>
        </div>
        {selectedImage ? <ImageViewer image={selectedImage} onClose={() => setSelectedImage(null)} /> : null}
      </div>
    );
  }
  if (vueAnnonce) {
    const a = vueAnnonce;
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3 z-10">
          <button onClick={retourFiche} className="w-10 h-10 bg-black text-white rounded-full font-black">←</button>
          <div><p className="font-black text-[15px] leading-none">{a.titre}</p><p className="text-[11px] text-gray-500">Annonce approuvée par le DG</p></div>
        </div>
        <div className="px-4 mt-4 space-y-3">
          {(a.image_url || a.photo_url || a.photo) && <button onClick={() => setSelectedImage({ photo: a.image_url || a.photo_url || a.photo })} className="block w-full"><img src={a.image_url || a.photo_url || a.photo} className="w-full h-[260px] object-cover rounded-3xl" /><p className="text-[11px] text-gray-500 mt-1 text-center">👆 Clique pour agrandir</p></button>}
          <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[18px]">{a.titre}</p><p className="text-[13px] text-gray-600 mt-1">{a.description}</p><p className="text-[12px] text-gray-500 mt-2">Par : {a.auteur || a.ownerName} • {a.telephone || a._wa} • 📍 {a.commune}</p><p className="font-black mt-2">{fmtUSD(a.prix)}$ / {a.prixCDF}</p></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { if (!exigerCompte(router, "/")) return; ouvrirWhatsAppDirect(a.telephone || a._wa, `Bonjour, j'ai vu ton annonce "${a.titre}" sur WENZE. C'est encore disponible ?`); }} className="bg-[#25D366] text-white py-3.5 rounded-2xl font-black text-[12px]">💬 WhatsApp vendeur</button>
            <button onClick={() => { const t = a.telephone || a._wa; if (t) window.location.href = `tel:${t}`; }} className="bg-black text-white py-3.5 rounded-2xl font-black text-[12px]">📞 Appeler</button>
          </div>
          <button onClick={() => addPanier(a)} className="w-full text-white py-3 rounded-full font-black text-[12px]" style={{ background: designPub.main }}>🛒 Ajouter au panier</button>
          <button onClick={retourFiche} className="w-full bg-white border py-3 rounded-full font-black text-[12px]">← Retour</button>
        </div>
        {selectedImage ? <ImageViewer image={selectedImage} onClose={() => setSelectedImage(null)} /> : null}
      </div>
    );
  }
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
        <p className="text-[11px] font-bold mt-1">🟢 {boutiquesPub.length} boutiques validées • 📢 {annonces.length} annonces approuvées</p>
        <div className="flex gap-2 mt-3">
          <a href={"https://wa.me/" + (designPub.whats || "").replace(/[^0-9]/g, "")} target="_blank" rel="noreferrer" className="flex-1 py-3 rounded-full font-black text-[12px] text-white" style={{ background: designPub.main }}>📱 {designPub.whats}</a>
          {designPub.showAmb ? <Link href="/devenir-ambassadeur" className="flex-1 py-3 rounded-full font-black text-[12px] bg-black text-white text-center">Devenir Ambassadeur →</Link> : null}
        </div>
      </div>

      {/* ✅ NOUVEAU — Filtres Province / Commune PRO */}
      <div className="mx-4 mt-3 flex gap-2">
        <select value={filtreProvince} onChange={e => { setFiltreProvince(e.target.value); setFiltreCommune("TOUT"); }} className="flex-1 border rounded-xl px-2 py-2 text-[12px] bg-white">{provinces.map(p => <option key={p} value={p}>{p === "TOUT" ? "Toutes provinces" : p}</option>)}</select>
        <select value={filtreCommune} onChange={e => setFiltreCommune(e.target.value)} className="flex-1 border rounded-xl px-2 py-2 text-[12px] bg-white">{communes.map(c => <option key={c} value={c}>{c === "TOUT" ? "Toutes communes" : c}</option>)}</select>
      </div>

      {/* ✅ NOUVEAU — Boutiques validées en avant */}
      <div className="p-4 space-y-3">
        {toast ? <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div> : null}
        {monRole === "grossiste" ? (<div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5"><p className="font-black text-[13px]">🏭 Marché gros - Tout Kinshasa</p><p className="text-[10px] text-gray-600 mt-0.5">Tu vois tout, y compris les prix gros. Le Client ne les voit pas.</p></div>) : null}
        <div className="bg-white border rounded-2xl p-3.5"><p className="font-black text-[13px]">🏪 Boutiques validées par le DG — {boutiquesFiltrees.length}</p><p className="text-[10px] text-gray-600 mt-0.5">👆 Clique sur une boutique pour ouvrir sa fiche, WhatsApp, Appeler.</p></div>
        {boutiquesFiltrees.slice(0, 5).map((b: any) => (
          <div key={b.id} className="bg-white border rounded-2xl p-3 flex gap-3">
            <button onClick={() => { const img = b.image_url || b.photo_url || b.photo; if (img) setSelectedImage({ photo: img }); else setVueBoutique(b); }} className="shrink-0">{(b.image_url || b.photo_url || b.photo) ? <img src={b.image_url || b.photo_url || b.photo} className="w-[72px] h-[72px] object-cover rounded-2xl" /> : <div className="w-[72px] h-[72px] bg-gray-100 rounded-2xl flex items-center justify-center text-[28px]">🏪</div>}</button>
            <button onClick={() => setVueBoutique(b)} className="flex-1 text-left"><p className="font-black text-[14px]">{b.nom}</p><p className="text-[11px] text-gray-500">{b.proprietaire} • 📍 {b.commune} — {b.quartier}</p><p className="text-[11px] font-bold" style={{ color: designPub.main }}>Voir boutique →</p></button>
            <div className="flex flex-col gap-1"><button onClick={() => ouvrirWhatsAppDirect(b.telephone, `Bonjour, j'ai vu ${b.nom} sur WENZE.`)} className="w-9 h-9 bg-[#25D366] text-white rounded-full">💬</button><button onClick={() => { if (b.telephone) window.location.href = `tel:${b.telephone}`; }} className="w-9 h-9 bg-black text-white rounded-full">📞</button></div>
          </div>
        ))}
        {boutiquesFiltrees.length === 0 ? <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune boutique validée pour ce filtre. Le DG doit valider les boutiques en attente.</p> : null}

        {/* ✅ NOUVEAU — Inscription + Invitation qui envoient au DG */}
        <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏪 Inscrire ma boutique</p><input value={formBout.nom} onChange={e => setFormBout({ ...formBout, nom: e.target.value })} placeholder="Nom boutique *" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formBout.telephone} onChange={e => setFormBout({ ...formBout, telephone: e.target.value })} placeholder="WhatsApp +243... *" className="w-full border rounded-xl px-3 py-3 mt-2" /><div className="flex gap-2 mt-2"><input value={formBout.commune} onChange={e => setFormBout({ ...formBout, commune: e.target.value })} placeholder="Commune" className="flex-1 border rounded-xl px-3 py-3" /><input value={formBout.quartier} onChange={e => setFormBout({ ...formBout, quartier: e.target.value })} placeholder="Quartier" className="flex-1 border rounded-xl px-3 py-3" /></div><input value={formBout.code_parrain} onChange={e => setFormBout({ ...formBout, code_parrain: e.target.value })} placeholder="Code parrain (si on t'a invité)" className="w-full border rounded-xl px-3 py-3 mt-2" /><button onClick={inscrireBoutique} className="w-full text-white py-3 rounded-full font-black text-[12px] mt-2" style={{ background: designPub.main }}>✅ Envoyer ma boutique au DG</button></div>
        <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏆 Inviter & Gagner — Public</p><p className="text-[11px] text-gray-500">Boutique validée = 5 pts • Client actif = 3 pts • +20 pts par abonnement payé.</p><input value={formInvit.parrain_nom} onChange={e => setFormInvit({ ...formInvit, parrain_nom: e.target.value })} placeholder="Ton nom *" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formInvit.invite_nom} onChange={e => setFormInvit({ ...formInvit, invite_nom: e.target.value })} placeholder="Nom de ton invité *" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formInvit.invite_tel} onChange={e => setFormInvit({ ...formInvit, invite_tel: e.target.value })} placeholder="WhatsApp invité *" className="w-full border rounded-xl px-3 py-3 mt-2" /><button onClick={envoyerInvitation} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">🏆 Envoyer l'invitation</button></div>

        <p className="text-[11px] text-gray-500 text-center">{filtered.length} annonce(s) approuvée(s) • Prix moyen {fmtUSD(prixMoyen)}$ • {boostedCount} boostées</p>
        {filtered.map((a: any) => (
          <AnnonceCard key={a.id} annonce={a} onOpen={() => { saveVu(a); setVus(readList("wenze_vus")); setVueAnnonce(a); }} onContact={() => contacter(a)} onAddPanier={() => addPanier(a)} onImage={(img: any) => setSelectedImage(img)} onOpenVideo={() => openVideoPage(a)} isDG={false} onToggleRecommande={() => {}} />
        ))}
        {filtered.length === 0 ? <div className="bg-white border rounded-2xl p-6 text-center"><p className="text-[13px] font-bold">Aucune annonce approuvée pour ce filtre.</p><p className="text-[11px] text-gray-500 mt-1">Le DG doit approuver les annonces en attente.</p></div> : null}
      </div>
      </>
      )}
      {selectedImage ? <ImageViewer image={selectedImage} onClose={() => setSelectedImage(null)} /> : null}
      {showSuggestNotifs && suggestNotifs.length ? (<div className="fixed bottom-24 left-4 right-4 z-50 bg-black text-white rounded-2xl p-4"><p className="font-black text-[13px]">{suggestNotifs[0]?.titre}</p><p className="text-[11px] mt-1">{suggestNotifs[0]?.texte}</p><div className="flex gap-2 mt-3"><button onClick={() => { marquerSuggestLu(); if (suggestNotifs[0]?.produitId) { const p = annonces.find(a => String(a.id) === String(suggestNotifs[0].produitId)); if (p) setVueAnnonce(p); } }} className="flex-1 py-2 rounded-full font-black text-[12px] text-white" style={{ background: designPub.main }}>Voir →</button><button onClick={marquerSuggestLu} className="flex-1 py-2 rounded-full font-black text-[12px] bg-white text-black">Plus tard</button></div></div>) : null}
      <BottomNav cartCount={cartCount} notifCount={notifCount + suggestNonLus} onShowSuggest={() => setShowSuggestNotifs(true)} />
    </div>
  );
                                                                                                                                      }
