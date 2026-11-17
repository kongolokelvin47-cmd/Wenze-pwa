"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Role = "DG" | "SUPERVISEUR" | "AMBASSADEUR";
type Statut = "ACTIF" | "SUSPENDU" | "EN_ATTENTE";
type Membre = { id: string; nom: string; telephone: string; role: Role; zone: string; statut: Statut; filleuls?: number; boutiquesValidees?: number; gains?: number; dateInscription: string; codePro: string; chefCode?: string; province: string; commune: string; village: string };
type Probleme = { id: string; type: string; qui: string; code: string; detail: string; urgence: "NORMALE" | "URGENTE" | "CRITIQUE"; statut: "OUVERT" | "RESOLU" };
type Paiement = { id: string; qui: string; type: string; montant: number; methode: string; statut: "PAYÉ" | "EN_ATTENTE" | "ÉCHOUÉ" };
type Alerte = { id: string; heure: string; titre: string; urgence: string; resultat: string };
type DesignPub = { main: string; btn: string; title: string; slogan: string; about: string; whats: string; logo: string; showAmb: boolean; maintenance: boolean };
type DesignPrive = { adminName: string; hdr: string; btn: string; bg: string };

const MEMBRES0: Membre[] = [
  { id: "SUP-01", nom: "Grace Mbuyi", telephone: "+243810000001", role: "SUPERVISEUR", zone: "Gombe", statut: "ACTIF", boutiquesValidees: 12, dateInscription: "2026-10-01", codePro: "SUP-GOM-2026-014", chefCode: "DG", province: "Kinshasa", commune: "Gombe", village: "Gombe Centre" },
  { id: "SUP-02", nom: "Kevin Kongolo", telephone: "+243810000002", role: "SUPERVISEUR", zone: "Lemba", statut: "EN_ATTENTE", boutiquesValidees: 0, dateInscription: "2026-11-08", codePro: "SUP-LEM-2026-021", chefCode: "DG", province: "Kinshasa", commune: "Lemba", village: "Lemba" },
  { id: "SUP-03", nom: "Sarah Nsimba", telephone: "+243810000003", role: "SUPERVISEUR", zone: "Ngaliema", statut: "SUSPENDU", boutiquesValidees: 3, dateInscription: "2026-09-15", codePro: "SUP-NGA-2026-033", chefCode: "DG", province: "Kinshasa", commune: "Ngaliema", village: "Ngaliema" },
  { id: "AMB-01", nom: "Joel Kabongo", telephone: "+243810000011", role: "AMBASSADEUR", zone: "Kintambo", statut: "ACTIF", filleuls: 18, gains: 45000, dateInscription: "2026-10-05", codePro: "AMB-JOE-2026-077", chefCode: "SUP-GOM-2026-014", province: "Kinshasa", commune: "Kintambo", village: "Kintambo" },
  { id: "AMB-02", nom: "Mireille Tshiala", telephone: "+243810000012", role: "AMBASSADEUR", zone: "Masina", statut: "ACTIF", filleuls: 24, gains: 62000, dateInscription: "2026-10-02", codePro: "AMB-MIR-2026-087", chefCode: "SUP-GOM-2026-014", province: "Kinshasa", commune: "Masina", village: "Masina" },
  { id: "AMB-03", nom: "David Ilunga", telephone: "+243810000013", role: "AMBASSADEUR", zone: "Bandal", statut: "EN_ATTENTE", filleuls: 0, gains: 0, dateInscription: "2026-11-10", codePro: "AMB-DAV-2026-045", chefCode: "SUP-LEM-2026-021", province: "Kinshasa", commune: "Bandal", village: "Bandal" },
];
const PROBLEMES0: Probleme[] = [
  { id: "P-01", type: "Boutique fausse photo", qui: "Shop Lemba Fashion", code: "AMB-DAV-2026-045", detail: "Photo floue, pas de vitrine", urgence: "URGENTE", statut: "OUVERT" },
  { id: "P-02", type: "Ambassadeur inactif", qui: "David Ilunga", code: "AMB-DAV-2026-045", detail: "Aucun travail depuis 5 jours", urgence: "NORMALE", statut: "OUVERT" },
  { id: "P-03", type: "Paiement échoué", qui: "Client Joel K.", code: "AMB-MIR-2026-087", detail: "Paiement 30 000 CDF échoué", urgence: "CRITIQUE", statut: "OUVERT" },
];
const PAIEMENTS0: Paiement[] = [
  { id: "PAY-01", qui: "Boutique Mama Grace", type: "Abonnement Boutique", montant: 50000, methode: "Orange Money", statut: "PAYÉ" },
  { id: "PAY-02", qui: "Client Joel K.", type: "Ticket Tombola", montant: 30000, methode: "M-Pesa", statut: "EN_ATTENTE" },
  { id: "PAY-03", qui: "Shop Lemba Fashion", type: "Abonnement Boutique", montant: 50000, methode: "Airtel Money", statut: "PAYÉ" },
  { id: "PAY-04", qui: "Client Sarah N.", type: "Ticket Tombola", montant: 20000, methode: "Orange Money", statut: "ÉCHOUÉ" },
];
const DESIGN_PUB0: DesignPub = { main: "#FF6B00", btn: "#111111", title: "Bienvenue chez WENZE", slogan: "Le réseau qui te fait gagner", about: "WENZE - Ensemble on va plus loin.", whats: "+243 810 000 000", logo: "", showAmb: true, maintenance: false };
const DESIGN_PRIVE0: DesignPrive = { adminName: "👑 Tableau DG", hdr: "#000000", btn: "#FF6B00", bg: "#FFFBF0" };

function bipLocal() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22);
    });
  } catch {}
}

const inputStyle: React.CSSProperties = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" };
const btnStyle = (bg: string, color = "#fff"): React.CSSProperties => ({ padding: "10px 14px", borderRadius: 10, border: 0, background: bg, color, fontWeight: 700, cursor: "pointer", fontSize: 13 });
const cardStyle: React.CSSProperties = { background: "#fff", padding: 14, borderRadius: 12, border: "1px solid #eee" };
export default function DashboardDG() {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<any>(null);
  const [deverrouille, setDeverrouille] = useState(false);
  const [pin, setPin] = useState("");
  const [pinDG, setPinDG] = useState("2026");
  const [membres, setMembres] = useState<Membre[]>(MEMBRES0);
  const [onglet, setOnglet] = useState("DASH");
  const [filtreRole, setFiltreRole] = useState("TOUS");
  const [recherche, setRecherche] = useState("");
  const [filtreProvince, setFiltreProvince] = useState("TOUTES");
  const [filtreCommune, setFiltreCommune] = useState("TOUTES");
  const [toast, setToast] = useState("");
  const [nouveau, setNouveau] = useState({ nom: "", telephone: "", role: "SUPERVISEUR", zone: "", province: "Kinshasa", commune: "", village: "" });
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [alerteActive, setAlerteActive] = useState(true);
  const [sonActif, setSonActif] = useState(true);
  const [testEnCours, setTestEnCours] = useState(false);
  const [dernier, setDernier] = useState("");
  const [problemes, setProblemes] = useState<Probleme[]>(PROBLEMES0);
  const [paiements, setPaiements] = useState<Paiement[]>(PAIEMENTS0);
  const [designPub, setDesignPub] = useState<DesignPub>(DESIGN_PUB0);
  const [designPrive, setDesignPrive] = useState<DesignPrive>(DESIGN_PRIVE0);
  const [secret, setSecret] = useState("wenze-dg-2026-change-moi");
  const [loaded, setLoaded] = useState(false);
  const [statutLive, setStatutLive] = useState("🟢 Temps réel : prêt");
  const [formProb, setFormProb] = useState({ type: "", qui: "", detail: "", urgence: "NORMALE" });
  const [formPay, setFormPay] = useState({ qui: "", type: "Abonnement Boutique", montant: "", methode: "Orange Money" });
  const [pinForm, setPinForm] = useState({ ancien: "", nouveau: "", confirm: "" });
  const [importText, setImportText] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };
  const mapMembre = (r: any): Membre => ({ id: String(r.id), nom: r.nom || "", telephone: r.telephone || "", role: (r.role || "AMBASSADEUR") as Role, zone: r.zone || "", statut: (r.statut || "EN_ATTENTE") as Statut, filleuls: r.filleuls ?? 0, boutiquesValidees: r.boutiques_validees ?? 0, gains: r.gains ?? 0, dateInscription: r.date_inscription || "", codePro: r.code_pro || "", chefCode: r.chef_code || "", province: r.province || "Kinshasa", commune: r.commune || "", village: r.village || "" });
  const mapProbleme = (r: any): Probleme => ({ id: String(r.id), type: r.type || "", qui: r.qui || "", code: r.code || "", detail: r.detail || "", urgence: (r.urgence || "NORMALE") as Probleme["urgence"], statut: (r.statut || "OUVERT") as Probleme["statut"] });
  const mapPaiement = (r: any): Paiement => ({ id: String(r.id), qui: r.qui || "", type: r.type || "", montant: Number(r.montant || 0), methode: r.methode || "", statut: (r.statut || "EN_ATTENTE") as Paiement["statut"] });

  useEffect(() => {
    let cancelled = false;
    const charger = async () => {
      try {
        const [m, pr, pa, cfg] = await Promise.all([
          supabase.from("membres").select("*"),
          supabase.from("problemes").select("*"),
          supabase.from("paiements").select("*"),
          supabase.from("config_publique").select("*").eq("id", 1).maybeSingle(),
        ]);
        if (cancelled) return;
        if (m.data?.length) setMembres(m.data.map(mapMembre));
        if (pr.data?.length) setProblemes(pr.data.map(mapProbleme));
        if (pa.data?.length) setPaiements(pa.data.map(mapPaiement));
        if (cfg.data) setDesignPub({ main: cfg.data.main_color || DESIGN_PUB0.main, btn: cfg.data.btn_color || DESIGN_PUB0.btn, title: cfg.data.title || DESIGN_PUB0.title, slogan: cfg.data.slogan || DESIGN_PUB0.slogan, about: cfg.data.about || DESIGN_PUB0.about, whats: cfg.data.whats || DESIGN_PUB0.whats, logo: cfg.data.logo || "", showAmb: cfg.data.show_amb ?? true, maintenance: cfg.data.maintenance ?? false });
        try {
          const c = JSON.parse(localStorage.getItem("wenze_dg_config") || "{}");
          if (c.pin) setPinDG(String(c.pin));
          if (c.designPrive) setDesignPrive(c.designPrive);
          if (c.tg?.secret) setSecret(c.tg.secret);
          if (typeof c.alerteActive === "boolean") setAlerteActive(c.alerteActive);
          if (typeof c.sonActif === "boolean") setSonActif(c.sonActif);
        } catch {}
      } catch {}
      if (!cancelled) setLoaded(true);
    };
    charger();
    if (channelRef.current) { try { supabase.removeChannel(channelRef.current); } catch {} }
    const ch = supabase.channel("dg-prive-v4")
      .on("postgres_changes", { event: "*", schema: "public", table: "membres" }, (pl: any) => {
        if (pl.eventType === "INSERT") setMembres((p) => [...p, mapMembre(pl.new)]);
        if (pl.eventType === "UPDATE") setMembres((p) => p.map((x) => x.id === String(pl.new.id) ? mapMembre(pl.new) : x));
        if (pl.eventType === "DELETE") setMembres((p) => p.filter((x) => x.id !== String(pl.old.id)));
        setStatutLive("🟢 Synchro à l'instant");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "problemes" }, (pl: any) => {
        if (pl.eventType === "INSERT") {
          setProblemes((p) => [mapProbleme(pl.new), ...p]);
          if (pl.new.urgence === "CRITIQUE") { bipLocal(); try { if (navigator.vibrate) navigator.vibrate([300, 100, 300]); } catch {} }
        }
        if (pl.eventType === "UPDATE") setProblemes((p) => p.map((x) => x.id === String(pl.new.id) ? mapProbleme(pl.new) : x));
        if (pl.eventType === "DELETE") setProblemes((p) => p.filter((x) => x.id !== String(pl.old.id)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, (pl: any) => {
        if (pl.eventType === "INSERT") setPaiements((p) => [mapPaiement(pl.new), ...p]);
        if (pl.eventType === "UPDATE") setPaiements((p) => p.map((x) => x.id === String(pl.new.id) ? mapPaiement(pl.new) : x));
        if (pl.eventType === "DELETE") setPaiements((p) => p.filter((x) => x.id !== String(pl.old.id)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "config_publique" }, (pl: any) => {
        const d: any = pl.new;
        if (!d) return;
        setDesignPub({ main: d.main_color || DESIGN_PUB0.main, btn: d.btn_color || DESIGN_PUB0.btn, title: d.title || DESIGN_PUB0.title, slogan: d.slogan || DESIGN_PUB0.slogan, about: d.about || DESIGN_PUB0.about, whats: d.whats || DESIGN_PUB0.whats, logo: d.logo || "", showAmb: d.show_amb ?? true, maintenance: d.maintenance ?? false });
      })
      .subscribe();
    channelRef.current = ch;
    return () => { cancelled = true; try { supabase.removeChannel(ch); } catch {} channelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem("wenze_dg_config", JSON.stringify({ pin: pinDG, alerteActive, sonActif, designPrive, tg: { secret } })); } catch {}
  }, [loaded, pinDG, alerteActive, sonActif, designPrive, secret]);
    const envoyerAlerte = async (titre: string, detail: string, urgence: string, qui: string) => {
    if (!alerteActive) return false;
    if (sonActif && urgence === "CRITIQUE") { try { if (navigator.vibrate) navigator.vibrate([300, 100, 300]); } catch {} bipLocal(); }
    let res = "❌ Échec - Vérifie Vercel";
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (secret) headers["x-wenze-secret"] = secret;
      const r = await fetch("/api/alerte", { method: "POST", headers, body: JSON.stringify({ titre, detail, urgence, qui, secret: secret || undefined }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) res = "✅ Envoyée sur Telegram";
      else res = "❌ " + (d.error || d.erreur || "TOKEN / CHAT_ID / SECRET manquant");
    } catch { res = "❌ Pas de connexion / API introuvable"; }
    setDernier(res);
    setAlertes((p) => [{ id: String(Date.now()), heure: new Date().toLocaleTimeString("fr-CD", { hour: "2-digit", minute: "2-digit" }), titre, urgence, resultat: res }, ...p].slice(0, 30));
    return res.startsWith("✅");
  };
  const tester = async () => { setTestEnCours(true); const ok = await envoyerAlerte("TEST - Alerte WENZE", "Si tu reçois ce message sur Telegram, ton système marche !", "CRITIQUE", "DG - Test"); showToast(ok ? "✅ Alerte envoyée ! Regarde Telegram." : "❌ Échec. Va dans ALERTES."); setTestEnCours(false); };

  const sup = useMemo(() => membres.filter((m) => m.role === "SUPERVISEUR"), [membres]);
  const amb = useMemo(() => membres.filter((m) => m.role === "AMBASSADEUR"), [membres]);
  const totalPaye = useMemo(() => paiements.filter((p) => p.statut === "PAYÉ").reduce((s, p) => s + p.montant, 0), [paiements]);
  const totalGains = useMemo(() => amb.reduce((s, m) => s + (m.gains || 0), 0), [amb]);
  const totalBout = useMemo(() => sup.reduce((s, m) => s + (m.boutiquesValidees || 0), 0), [sup]);
  const probOuverts = useMemo(() => problemes.filter((p) => p.statut === "OUVERT").length, [problemes]);
  const anomalies = useMemo(() => problemes.filter((p) => p.urgence === "CRITIQUE" && p.statut === "OUVERT").length, [problemes]);
  const provinces = useMemo(() => ["TOUTES", ...Array.from(new Set(membres.map((m) => m.province || "Kinshasa")))], [membres]);
  const communes = useMemo(() => ["TOUTES", ...Array.from(new Set(membres.filter((m) => filtreProvince === "TOUTES" || m.province === filtreProvince).map((m) => m.commune || "")))], [membres, filtreProvince]);
  const filtres = useMemo(() => membres.filter((m) =>
    (filtreRole === "TOUS" || m.role === filtreRole) &&
    (filtreProvince === "TOUTES" || m.province === filtreProvince) &&
    (filtreCommune === "TOUTES" || m.commune === filtreCommune) &&
    (m.nom.toLowerCase().includes(recherche.toLowerCase()) || m.zone.toLowerCase().includes(recherche.toLowerCase()) || m.codePro.toLowerCase().includes(recherche.toLowerCase()) || (m.commune || "").toLowerCase().includes(recherche.toLowerCase()))
  ), [membres, filtreRole, filtreProvince, filtreCommune, recherche]);

  const changer = async (id: string, s: Statut) => {
    const avant = membres;
    setMembres((p) => p.map((m) => m.id === id ? { ...m, statut: s } : m));
    const { error } = await supabase.from("membres").update({ statut: s }).eq("id", id);
    if (error) { setMembres(avant); showToast("❌ " + error.message); return; }
    showToast(s === "ACTIF" ? "✅ Membre validé." : "⏸️ Membre suspendu.");
  };
  const supprimer = async (id: string) => {
    if (!confirm("DG, supprimer ce membre ?")) return;
    const avant = membres;
    setMembres((p) => p.filter((m) => m.id !== id));
    const { error } = await supabase.from("membres").delete().eq("id", id);
    if (error) { setMembres(avant); showToast("❌ " + error.message); return; }
    showToast("🗑️ Supprimé.");
  };
  const creer = async () => {
    if (!nouveau.nom.trim() || nouveau.telephone.length < 9) return showToast("Nom + WhatsApp obligatoires.");
    const pre = nouveau.role === "SUPERVISEUR" ? "SUP" : "AMB";
    const code = pre + "-" + nouveau.nom.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X") + "-" + Math.floor(1000 + Math.random() * 9000);
    const nm: Membre = { id: pre + Date.now(), nom: nouveau.nom.trim(), telephone: nouveau.telephone.trim(), role: nouveau.role as Role, zone: nouveau.zone || nouveau.commune || "Gombe", statut: "ACTIF", filleuls: 0, boutiquesValidees: 0, gains: 0, dateInscription: new Date().toISOString().slice(0, 10), codePro: code, chefCode: "DG", province: nouveau.province || "Kinshasa", commune: nouveau.commune || nouveau.zone || "Gombe", village: nouveau.village || nouveau.commune || nouveau.zone || "Gombe" };
    setMembres((p) => [...p, nm]);
    const { error } = await supabase.from("membres").insert({ id: nm.id, nom: nm.nom, telephone: nm.telephone, role: nm.role, zone: nm.zone, statut: nm.statut, filleuls: nm.filleuls, boutiques_validees: nm.boutiquesValidees, gains: nm.gains, date_inscription: nm.dateInscription, code_pro: nm.codePro, chef_code: nm.chefCode, province: nm.province, commune: nm.commune, village: nm.village });
    if (error) { setMembres((p) => p.filter((m) => m.id !== nm.id)); showToast("❌ " + error.message); return; }
    showToast("✅ Créé. Code : " + code);
    setNouveau({ nom: "", telephone: "", role: "SUPERVISEUR", zone: "", province: "Kinshasa", commune: "", village: "" });
    envoyerAlerte("👥 Nouveau membre", "Créé : " + code, "NORMALE", "DG");
  };
  const resoudre = async (id: string) => {
    const avant = problemes;
    setProblemes((p) => p.map((x) => x.id === id ? { ...x, statut: "RESOLU" } : x));
    const { error } = await supabase.from("problemes").update({ statut: "RESOLU" }).eq("id", id);
    if (error) { setProblemes(avant); showToast("❌ " + error.message); return; }
    showToast("✅ Problème résolu.");
  };
  const validerPay = async (id: string) => {
    const avant = paiements;
    setPaiements((p) => p.map((x) => x.id === id ? { ...x, statut: "PAYÉ" } : x));
    const { error } = await supabase.from("paiements").update({ statut: "PAYÉ" }).eq("id", id);
    if (error) { setPaiements(avant); showToast("❌ " + error.message); return; }
    showToast("✅ Paiement validé.");
  };
  const ajouterProbleme = async () => {
    if (!formProb.type.trim() || !formProb.qui.trim()) return showToast("Type + Qui obligatoires");
    const np: Probleme = { id: "P-" + Date.now(), type: formProb.type.trim(), qui: formProb.qui.trim(), code: "-", detail: formProb.detail.trim(), urgence: formProb.urgence as Probleme["urgence"], statut: "OUVERT" };
    setProblemes((p) => [np, ...p]);
    const { error } = await supabase.from("problemes").insert({ id: np.id, type: np.type, qui: np.qui, code: np.code, detail: np.detail, urgence: np.urgence, statut: np.statut });
    if (error) { setProblemes((p) => p.filter((x) => x.id !== np.id)); showToast("❌ " + error.message); return; }
    if (formProb.urgence === "CRITIQUE" || formProb.urgence === "URGENTE") envoyerAlerte("🚨 Problème " + formProb.urgence, formProb.type + " - " + formProb.qui + " : " + formProb.detail, formProb.urgence, formProb.qui);
    setFormProb({ type: "", qui: "", detail: "", urgence: "NORMALE" });
    showToast("✅ Problème signalé.");
  };
  const ajouterPaiement = async () => {
    const montant = parseInt(formPay.montant || "0");
    if (!formPay.qui.trim() || !montant) return showToast("Qui + Montant obligatoires");
    const np: Paiement = { id: "PAY-" + Date.now(), qui: formPay.qui.trim(), type: formPay.type, montant, methode: formPay.methode, statut: "EN_ATTENTE" };
    setPaiements((p) => [np, ...p]);
    const { error } = await supabase.from("paiements").insert({ id: np.id, qui: np.qui, type: np.type, montant: np.montant, methode: np.methode, statut: np.statut });
    if (error) { setPaiements((p) => p.filter((x) => x.id !== np.id)); showToast("❌ " + error.message); return; }
    setFormPay({ qui: "", type: "Abonnement Boutique", montant: "", methode: "Orange Money" });
    showToast("✅ Paiement ajouté.");
  };
  const publierDesign = async () => {
    const { error } = await supabase.from("config_publique").update({ title: designPub.title, slogan: designPub.slogan, about: designPub.about, whats: designPub.whats, logo: designPub.logo, main_color: designPub.main, btn_color: designPub.btn, show_amb: designPub.showAmb, maintenance: designPub.maintenance, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) showToast("❌ " + error.message);
    else showToast("✅ Publié ! Le public voit déjà.");
  };
  const changerPIN = () => {
    if (pinForm.ancien !== pinDG) return showToast("❌ Ancien PIN faux.");
    if (pinForm.nouveau.length < 4) return showToast("Nouveau PIN : min 4 chiffres.");
    if (pinForm.nouveau !== pinForm.confirm) return showToast("Les 2 nouveaux PIN ne correspondent pas.");
    setPinDG(pinForm.nouveau); setPinForm({ ancien: "", nouveau: "", confirm: "" });
    showToast("✅ PIN changé.");
  };
  const exportMembres = async () => {
    const txt = membres.map((m) => `${m.nom} | ${m.codePro} | ${m.telephone} | ${m.role} | ${m.province} > ${m.commune} > ${m.village} | ${m.statut}`).join("\n");
    try { await navigator.clipboard.writeText(txt); showToast("✅ Membres copiés !"); } catch { showToast(txt); }
  };
  const exportJSON = () => {
    const data = { version: "wenze_dg_next_v4", exportedAt: new Date().toISOString(), membres, problemes, paiements, alertes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wenze-dg-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("✅ Backup téléchargé.");
  };
  const importerMembres = () => {
    if (!importText.trim()) return showToast("Colle d'abord du texte : Nom | Téléphone | Role");
    const lignes = importText.split("\n").map((l) => l.trim()).filter(Boolean);
    let ajout = 0;
    const nouveaux: Membre[] = [];
    lignes.forEach((ligne) => {
      const parts = ligne.split("|").map((s) => s.trim());
      if (parts.length < 2) return;
      const [nom, telephone, roleTxt] = parts;
      const role: Role = (roleTxt || "AMBASSADEUR").toUpperCase().includes("SUP") ? "SUPERVISEUR" : "AMBASSADEUR";
      const pre = role === "SUPERVISEUR" ? "SUP" : "AMB";
      nouveaux.push({ id: pre + Date.now() + "-" + ajout, nom, telephone, role, zone: "Gombe", statut: "EN_ATTENTE", filleuls: 0, boutiquesValidees: 0, gains: 0, dateInscription: new Date().toISOString().slice(0, 10), codePro: pre + "-" + nom.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X") + "-" + Math.floor(1000 + Math.random() * 9000), chefCode: "DG", province: "Kinshasa", commune: "Gombe", village: "Gombe" });
      ajout++;
    });
    if (!ajout) return showToast("Aucune ligne valide.");
    setMembres((p) => [...p, ...nouveaux]);
    setImportText("");
    showToast(`✅ ${ajout} membre(s) importé(s) en local. Ils seront sync au prochain refresh.`);
  };
    if (!deverrouille) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", padding: 20 }}>
        <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: "100%", maxWidth: 360, textAlign: "center" }}>
          <div style={{ fontSize: 32 }}>👑</div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Tableau DG WENZE</h1>
          <p style={{ color: "#666", fontSize: 13 }}>Entre ton PIN DG pour déverrouiller</p>
          <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { if (pin === pinDG) { setDeverrouille(true); showToast("✅ Bienvenue DG"); } else showToast("❌ PIN faux"); } }} placeholder="PIN DG" style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd", marginTop: 12, textAlign: "center", fontSize: 18, boxSizing: "border-box" }} />
          <button onClick={() => { if (pin === pinDG) { setDeverrouille(true); showToast("✅ Bienvenue DG"); } else showToast("❌ PIN faux"); }} style={{ width: "100%", marginTop: 12, padding: 12, borderRadius: 10, background: "#FF6B00", color: "#fff", fontWeight: 800, border: 0, cursor: "pointer" }}>DÉVERROUILLER</button>
          {toast && <p style={{ marginTop: 12, fontSize: 13 }}>{toast}</p>}
          <Link href="/" style={{ display: "block", marginTop: 16, fontSize: 13, color: "#666" }}>← Retour accueil</Link>
        </div>
      </div>
    );
  }

  const onglets = ["DASH", "MEMBRES", "PROBLEMES", "PAIEMENTS", "DESIGN", "ALERTES", "PARAMETRES"] as const;

  return (
    <div style={{ minHeight: "100vh", background: designPrive.bg, padding: 16, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ background: designPrive.hdr, color: "#fff", padding: 16, borderRadius: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div><div style={{ fontWeight: 900, fontSize: 20 }}>{designPrive.adminName}</div><div style={{ fontSize: 12, opacity: 0.8 }}>{statutLive} • {loaded ? "Chargé" : "Chargement..."}</div></div>
          <button onClick={() => setDeverrouille(false)} style={btnStyle("#fff", "#000")}>🔒 Verrouiller</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 12 }}>
          <div style={cardStyle}><div>👥 Membres</div><b style={{ fontSize: 22 }}>{membres.length}</b><div style={{ fontSize: 12, color: "#666" }}>{sup.length} SUP • {amb.length} AMB</div></div>
          <div style={cardStyle}><div>🏪 Boutiques validées</div><b style={{ fontSize: 22 }}>{totalBout}</b></div>
          <div style={cardStyle}><div>💰 Payé</div><b style={{ fontSize: 22 }}>{totalPaye.toLocaleString()} CDF</b><div style={{ fontSize: 12, color: "#666" }}>Gains AMB : {totalGains.toLocaleString()} CDF</div></div>
          <div style={cardStyle}><div>🚨 Problèmes ouverts</div><b style={{ fontSize: 22 }}>{probOuverts}</b><div style={{ fontSize: 12, color: anomalies ? "#ef4444" : "#666" }}>{anomalies} critique(s)</div></div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {onglets.map((o) => (<button key={o} onClick={() => setOnglet(o)} style={{ padding: "10px 16px", borderRadius: 20, border: 0, background: onglet === o ? "#111" : "#fff", color: onglet === o ? "#fff" : "#111", fontWeight: 700, cursor: "pointer" }}>{o}</button>))}
        </div>

        {onglet === "DASH" && (
          <div style={{ ...cardStyle, marginTop: 12 }}>
            <h3 style={{ margin: "0 0 8px" }}>Vue rapide DG</h3>
            <p style={{ color: "#555", fontSize: 14, margin: 0 }}>Tu as {membres.length} membres, {probOuverts} problème(s) ouvert(s) dont {anomalies} critique(s), et {totalPaye.toLocaleString()} CDF déjà payé.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={() => setOnglet("MEMBRES")} style={btnStyle("#111")}>👥 Voir membres</button>
              <button onClick={() => setOnglet("PROBLEMES")} style={btnStyle("#ef4444")}>🚨 Voir problèmes</button>
              <button onClick={() => setOnglet("PAIEMENTS")} style={btnStyle("#16a34a")}>💰 Voir paiements</button>
            </div>
          </div>
        )}

        {onglet === "MEMBRES" && (
          <div style={{ ...cardStyle, marginTop: 12 }}>
            <h3 style={{ margin: "0 0 10px" }}>Créer un membre</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
              <input value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} placeholder="Nom complet" style={inputStyle} />
              <input value={nouveau.telephone} onChange={(e) => setNouveau({ ...nouveau, telephone: e.target.value })} placeholder="WhatsApp ex: +243..." style={inputStyle} />
              <select value={nouveau.role} onChange={(e) => setNouveau({ ...nouveau, role: e.target.value })} style={inputStyle}><option value="SUPERVISEUR">SUPERVISEUR</option><option value="AMBASSADEUR">AMBASSADEUR</option></select>
              <input value={nouveau.commune} onChange={(e) => setNouveau({ ...nouveau, commune: e.target.value, zone: e.target.value })} placeholder="Commune / Zone" style={inputStyle} />
              <input value={nouveau.village} onChange={(e) => setNouveau({ ...nouveau, village: e.target.value })} placeholder="Village / Quartier" style={inputStyle} />
            </div>
            <button onClick={creer} style={{ ...btnStyle(designPrive.btn), marginTop: 10 }}>➕ Créer membre</button>
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "0 0 8px" }}>Import rapide (1 par ligne : Nom | Téléphone | Role)</h4>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={"Grace Mbuyi | +243810000001 | SUPERVISEUR"} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              <button onClick={importerMembres} style={{ ...btnStyle("#111"), marginTop: 8 }}>📥 Importer</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔍 Chercher nom, zone, code, commune..." style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
              <select value={filtreRole} onChange={(e) => setFiltreRole(e.target.value)} style={{ ...inputStyle, width: 150 }}><option value="TOUS">TOUS Rôles</option><option value="SUPERVISEUR">SUPERVISEUR</option><option value="AMBASSADEUR">AMBASSADEUR</option></select>
              <select value={filtreProvince} onChange={(e) => { setFiltreProvince(e.target.value); setFiltreCommune("TOUTES"); }} style={{ ...inputStyle, width: 150 }}>{provinces.map((p) => (<option key={p} value={p}>{p}</option>))}</select>
              <select value={filtreCommune} onChange={(e) => setFiltreCommune(e.target.value)} style={{ ...inputStyle, width: 150 }}>{communes.map((c) => (<option key={c} value={c}>{c}</option>))}</select>
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {filtres.map((m) => (
                <div key={m.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div><b>{m.nom}</b> <span style={{ fontSize: 12, color: "#666" }}>• {m.role} • {m.codePro}</span><br /><span style={{ fontSize: 12 }}>{m.telephone} • {m.province} &gt; {m.commune} &gt; {m.village} • {m.statut} • {m.dateInscription}</span><br /><span style={{ fontSize: 12, color: "#666" }}>Filleuls: {m.filleuls ?? 0} • Boutiques: {m.boutiquesValidees ?? 0} • Gains: {(m.gains ?? 0).toLocaleString()} CDF</span></div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <button onClick={() => changer(m.id, "ACTIF")} style={btnStyle("#16a34a")}>✅</button>
                    <button onClick={() => changer(m.id, "SUSPENDU")} style={btnStyle("#f59e0b")}>⏸️</button>
                    <button onClick={() => supprimer(m.id)} style={btnStyle("#ef4444")}>🗑️</button>
                  </div>
                </div>
              ))}
              {filtres.length === 0 && <p style={{ color: "#666" }}>Aucun membre.</p>}
            </div>
          </div>
        )}

        {onglet === "PROBLEMES" && (
          <div style={{ ...cardStyle, marginTop: 12 }}>
            <h3 style={{ margin: "0 0 10px" }}>Signaler un problème</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
              <input value={formProb.type} onChange={(e) => setFormProb({ ...formProb, type: e.target.value })} placeholder="Type ex: Boutique fausse photo" style={inputStyle} />
              <input value={formProb.qui} onChange={(e) => setFormProb({ ...formProb, qui: e.target.value })} placeholder="Qui ? Boutique / Membre" style={inputStyle} />
              <select value={formProb.urgence} onChange={(e) => setFormProb({ ...formProb, urgence: e.target.value })} style={inputStyle}><option value="NORMALE">NORMALE</option><option value="URGENTE">URGENTE</option><option value="CRITIQUE">CRITIQUE</option></select>
              <input value={formProb.detail} onChange={(e) => setFormProb({ ...formProb, detail: e.target.value })} placeholder="Détail..." style={inputStyle} />
            </div>
            <button onClick={ajouterProbleme} style={{ ...btnStyle("#ef4444"), marginTop: 10 }}>🚨 Signaler</button>
            <div style={{ marginTop: 14 }}>{problemes.map((p) => (<div key={p.id} style={{ padding: 10, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div><b>{p.type}</b> - {p.qui} <span style={{ fontSize: 12 }}>({p.urgence} • {p.statut})</span><br /><span style={{ fontSize: 13, color: "#555" }}>{p.detail}</span></div>{p.statut === "OUVERT" && <button onClick={() => resoudre(p.id)} style={btnStyle("#16a34a")}>✅ Résoudre</button>}</div>))}</div>
          </div>
        )}

        {onglet === "PAIEMENTS" && (
          <div style={{ ...cardStyle, marginTop: 12 }}>
            <h3 style={{ margin: "0 0 10px" }}>Ajouter un paiement</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
              <input value={formPay.qui} onChange={(e) => setFormPay({ ...formPay, qui: e.target.value })} placeholder="Qui ?" style={inputStyle} />
              <select value={formPay.type} onChange={(e) => setFormPay({ ...formPay, type: e.target.value })} style={inputStyle}><option value="Abonnement Boutique">Abonnement Boutique</option><option value="Ticket Tombola">Ticket Tombola</option><option value="Autre">Autre</option></select>
              <input value={formPay.montant} onChange={(e) => setFormPay({ ...formPay, montant: e.target.value })} placeholder="Montant CDF" inputMode="numeric" style={inputStyle} />
              <select value={formPay.methode} onChange={(e) => setFormPay({ ...formPay, methode: e.target.value })} style={inputStyle}><option>Orange Money</option><option>M-Pesa</option><option>Airtel Money</option><option>Espèces</option></select>
            </div>
            <button onClick={ajouterPaiement} style={{ ...btnStyle("#16a34a"), marginTop: 10 }}>➕ Ajouter paiement</button>
            <div style={{ marginTop: 14 }}>{paiements.map((p) => (<div key={p.id} style={{ padding: 10, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div><b>{p.qui}</b> - {p.type} - {p.montant.toLocaleString()} CDF - {p.methode} - <b>{p.statut}</b></div>{p.statut !== "PAYÉ" && <button onClick={() => validerPay(p.id)} style={btnStyle("#16a34a")}>✅ Valider</button>}</div>))}</div>
          </div>
        )}

        {onglet === "DESIGN" && (
          <div style={{ ...cardStyle, marginTop: 12 }}>
            <h3 style={{ margin: "0 0 10px" }}>Design public WENZE</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
              <label>Titre<input value={designPub.title} onChange={(e) => setDesignPub({ ...designPub, title: e.target.value })} style={inputStyle} /></label>
              <label>Slogan<input value={designPub.slogan} onChange={(e) => setDesignPub({ ...designPub, slogan: e.target.value })} style={inputStyle} /></label>
              <label>WhatsApp<input value={designPub.whats} onChange={(e) => setDesignPub({ ...designPub, whats: e.target.value })} style={inputStyle} /></label>
              <label>Couleur principale<input type="color" value={designPub.main} onChange={(e) => setDesignPub({ ...designPub, main: e.target.value })} style={inputStyle} /></label>
              <label>Couleur bouton<input type="color" value={designPub.btn} onChange={(e) => setDesignPub({ ...designPub, btn: e.target.value })} style={inputStyle} /></label>
              <label>Logo (URL)<input value={designPub.logo} onChange={(e) => setDesignPub({ ...designPub, logo: e.target.value })} style={inputStyle} /></label>
            </div>
            <textarea value={designPub.about} onChange={(e) => setDesignPub({ ...designPub, about: e.target.value })} rows={3} style={{ ...inputStyle, marginTop: 8 }} />
            <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={designPub.showAmb} onChange={(e) => setDesignPub({ ...designPub, showAmb: e.target.checked })} /> Afficher Ambassadeurs</label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={designPub.maintenance} onChange={(e) => setDesignPub({ ...designPub, maintenance: e.target.checked })} /> Mode maintenance</label>
            </div>
            <button onClick={publierDesign} style={{ ...btnStyle(designPrive.btn), marginTop: 12 }}>🚀 Publier le design</button>
            <h4 style={{ marginTop: 20 }}>Design privé DG</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
              <input value={designPrive.adminName} onChange={(e) => setDesignPrive({ ...designPrive, adminName: e.target.value })} placeholder="Nom admin" style={inputStyle} />
              <input type="color" value={designPrive.hdr} onChange={(e) => setDesignPrive({ ...designPrive, hdr: e.target.value })} style={inputStyle} />
              <input type="color" value={designPrive.btn} onChange={(e) => setDesignPrive({ ...designPrive, btn: e.target.value })} style={inputStyle} />
              <input type="color" value={designPrive.bg} onChange={(e) => setDesignPrive({ ...designPrive, bg: e.target.value })} style={inputStyle} />
            </div>
          </div>
        )}

        {onglet === "ALERTES" && (
          <div style={{ ...cardStyle, marginTop: 12 }}>
            <h3 style={{ margin: "0 0 10px" }}>Alertes Telegram</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={alerteActive} onChange={(e) => setAlerteActive(e.target.checked)} /> Alertes actives</label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={sonActif} onChange={(e) => setSonActif(e.target.checked)} /> Son + Vibration</label>
            </div>
            <button onClick={tester} style={{ ...btnStyle("#FF6B00"), marginTop: 12 }}>{testEnCours ? "Envoi..." : "📣 Tester alerte Telegram"}</button>
            {dernier && <p style={{ fontSize: 13, color: "#555" }}>Dernière alerte : {dernier}</p>}
            <div style={{ marginTop: 10 }}>{alertes.map((a) => (<div key={a.id} style={{ padding: 8, borderBottom: "1px solid #eee", fontSize: 13 }}><b>{a.heure}</b> - {a.titre} ({a.urgence}) - {a.resultat}</div>))}{alertes.length === 0 && <p style={{ color: "#666", fontSize: 13 }}>Aucune alerte encore. Clique Tester.</p>}</div>
          </div>
        )}

        {onglet === "PARAMETRES" && (
          <div style={{ ...cardStyle, marginTop: 12 }}>
            <h3 style={{ margin: "0 0 10px" }}>Changer le PIN DG</h3>
            <p style={{ fontSize: 13, color: "#e11d48", margin: "0 0 10px" }}>⚠️ Change ton PIN 2026 dès maintenant. Ne le partage avec personne.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
              <input type="password" value={pinForm.ancien} onChange={(e) => setPinForm({ ...pinForm, ancien: e.target.value })} placeholder="Ancien PIN" style={inputStyle} />
              <input type="password" value={pinForm.nouveau} onChange={(e) => setPinForm({ ...pinForm, nouveau: e.target.value })} placeholder="Nouveau PIN (min 4)" style={inputStyle} />
              <input type="password" value={pinForm.confirm} onChange={(e) => setPinForm({ ...pinForm, confirm: e.target.value })} placeholder="Confirmer nouveau PIN" style={inputStyle} />
            </div>
            <button onClick={changerPIN} style={{ ...btnStyle("#111"), marginTop: 10 }}>🔑 Changer PIN</button>
            <h4 style={{ marginTop: 20 }}>Secret Telegram (API)</h4>
            <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="wenze-dg-2026-change-moi" style={inputStyle} />
            <p style={{ fontSize: 12, color: "#666" }}>Ce secret doit être le même que dans Vercel : WENZE_SECRET et dans ton API /api/alerte.</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={exportMembres} style={btnStyle("#111")}>📋 Copier membres</button>
          <button onClick={exportJSON} style={btnStyle("#fff", "#111")}>💾 Backup JSON</button>
          <button onClick={tester} style={btnStyle("#FF6B00")}>{testEnCours ? "Envoi..." : "📣 Tester alerte Telegram"}</button>
          <Link href="/" style={{ ...btnStyle("#fff", "#111"), textDecoration: "none", display: "inline-block" }}>← Accueil</Link>
        </div>
        {toast && <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#fff", padding: "10px 16px", borderRadius: 20, fontSize: 13, zIndex: 50 }}>{toast}</div>}
      </div>
    </div>
  );
                                                                                                                               }
