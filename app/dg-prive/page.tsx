"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
export default function DashboardDG() {
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
  const mapMembre = (r: any): Membre => ({ id: r.id, nom: r.nom, telephone: r.telephone, role: r.role, zone: r.zone, statut: r.statut, filleuls: r.filleuls, boutiquesValidees: r.boutiques_validees, gains: r.gains, dateInscription: r.date_inscription, codePro: r.code_pro, chefCode: r.chef_code, province: r.province, commune: r.commune, village: r.village });
  const mapProbleme = (r: any): Probleme => ({ id: r.id, type: r.type, qui: r.qui, code: r.code, detail: r.detail, urgence: r.urgence, statut: r.statut });
  const mapPaiement = (r: any): Paiement => ({ id: r.id, qui: r.qui, type: r.type, montant: r.montant, methode: r.methode, statut: r.statut });

  // ===== CHARGEMENT + TEMPS RÉEL SUPABASE =====
  useEffect(() => {
    const charger = async () => {
      try {
        const [m, pr, pa, cfg] = await Promise.all([
          supabase.from("membres").select("*"),
          supabase.from("problemes").select("*"),
          supabase.from("paiements").select("*"),
          supabase.from("config_publique").select("*").eq("id", 1).single(),
        ]);
        if (m.data?.length) setMembres(m.data.map(mapMembre));
        if (pr.data?.length) setProblemes(pr.data.map(mapProbleme));
        if (pa.data?.length) setPaiements(pa.data.map(mapPaiement));
        if (cfg.data) setDesignPub({ main: cfg.data.main_color, btn: cfg.data.btn_color, title: cfg.data.title, slogan: cfg.data.slogan, about: cfg.data.about, whats: cfg.data.whats, logo: cfg.data.logo || "", showAmb: cfg.data.show_amb, maintenance: cfg.data.maintenance });
        const c = JSON.parse(localStorage.getItem("wenze_dg_config") || "{}");
        if (c.pin) setPinDG(c.pin);
        if (c.designPrive) setDesignPrive(c.designPrive);
        if (c.tg?.secret) setSecret(c.tg.secret);
      } catch {}
      setLoaded(true);
    };
    charger();

    const ch = supabase.channel("dg-prive-v4")
      .on("postgres_changes", { event: "*", schema: "public", table: "membres" }, (pl: any) => {
        if (pl.eventType === "INSERT") setMembres(p => [...p, mapMembre(pl.new)]);
        if (pl.eventType === "UPDATE") setMembres(p => p.map(x => x.id === pl.new.id ? mapMembre(pl.new) : x));
        if (pl.eventType === "DELETE") setMembres(p => p.filter(x => x.id !== pl.old.id));
        setStatutLive("🟢 Synchro à l'instant");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "problemes" }, (pl: any) => {
        if (pl.eventType === "INSERT") {
          setProblemes(p => [mapProbleme(pl.new), ...p]);
          if (pl.new.urgence === "CRITIQUE") { bipLocal(); try { if (navigator.vibrate) navigator.vibrate([300, 100, 300]); } catch {} }
        }
        if (pl.eventType === "UPDATE") setProblemes(p => p.map(x => x.id === pl.new.id ? mapProbleme(pl.new) : x));
        if (pl.eventType === "DELETE") setProblemes(p => p.filter(x => x.id !== pl.old.id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, (pl: any) => {
        if (pl.eventType === "INSERT") setPaiements(p => [mapPaiement(pl.new), ...p]);
        if (pl.eventType === "UPDATE") setPaiements(p => p.map(x => x.id === pl.new.id ? mapPaiement(pl.new) : x));
        if (pl.eventType === "DELETE") setPaiements(p => p.filter(x => x.id !== pl.old.id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "config_publique" }, (pl: any) => {
        const d: any = pl.new;
        setDesignPub({ main: d.main_color, btn: d.btn_color, title: d.title, slogan: d.slogan, about: d.about, whats: d.whats, logo: d.logo || "", showAmb: d.show_amb, maintenance: d.maintenance });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Sauvegarde locale : design privé + PIN seulement (le reste est dans Supabase)
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
    setAlertes(p => [{ id: String(Date.now()), heure: new Date().toLocaleTimeString("fr-CD", { hour: "2-digit", minute: "2-digit" }), titre, urgence, resultat: res }, ...p].slice(0, 30));
    return res.startsWith("✅");
  };
  const tester = async () => { setTestEnCours(true); const ok = await envoyerAlerte("TEST - Alerte WENZE", "Si tu reçois ce message sur Telegram, ton système marche !", "CRITIQUE", "DG - Test"); showToast(ok ? "✅ Alerte envoyée ! Regarde Telegram." : "❌ Échec. Va dans ALERTES."); setTestEnCours(false); };

  const sup = useMemo(() => membres.filter(m => m.role === "SUPERVISEUR"), [membres]);
  const amb = useMemo(() => membres.filter(m => m.role === "AMBASSADEUR"), [membres]);
  const totalPaye = useMemo(() => paiements.filter(p => p.statut === "PAYÉ").reduce((s, p) => s + p.montant, 0), [paiements]);
  const totalGains = useMemo(() => amb.reduce((s, m) => s + (m.gains || 0), 0), [amb]);
  const totalBout = useMemo(() => sup.reduce((s, m) => s + (m.boutiquesValidees || 0), 0), [sup]);
  const probOuverts = useMemo(() => problemes.filter(p => p.statut === "OUVERT").length, [problemes]);
  const anomalies = useMemo(() => problemes.filter(p => p.urgence === "CRITIQUE" && p.statut === "OUVERT").length, [problemes]);
  const provinces = useMemo(() => ["TOUTES", ...Array.from(new Set(membres.map(m => m.province || "Kinshasa")))], [membres]);
  const communes = useMemo(() => ["TOUTES", ...Array.from(new Set(membres.filter(m => filtreProvince === "TOUTES" || m.province === filtreProvince).map(m => m.commune || "")))], [membres, filtreProvince]);
  const filtres = useMemo(() => membres.filter(m =>
    (filtreRole === "TOUS" || m.role === filtreRole) &&
    (filtreProvince === "TOUTES" || m.province === filtreProvince) &&
    (filtreCommune === "TOUTES" || m.commune === filtreCommune) &&
    (m.nom.toLowerCase().includes(recherche.toLowerCase()) || m.zone.toLowerCase().includes(recherche.toLowerCase()) || m.codePro.toLowerCase().includes(recherche.toLowerCase()) || (m.commune || "").toLowerCase().includes(recherche.toLowerCase()))
  ), [membres, filtreRole, filtreProvince, filtreCommune, recherche]);

  // --- ACTIONS -> SUPABASE (temps réel) ---
  const changer = async (id: string, s: Statut) => {
    setMembres(p => p.map(m => m.id === id ? { ...m, statut: s } : m));
    await supabase.from("membres").update({ statut: s }).eq("id", id);
    showToast(s === "ACTIF" ? "✅ Membre validé." : "⏸️ Membre suspendu.");
  };
  const supprimer = async (id: string) => {
    if (!confirm("DG, supprimer ce membre ?")) return;
    setMembres(p => p.filter(m => m.id !== id));
    await supabase.from("membres").delete().eq("id", id);
    showToast("🗑️ Supprimé.");
  };
  const creer = async () => {
    if (!nouveau.nom.trim() || nouveau.telephone.length < 9) return showToast("Nom + WhatsApp obligatoires.");
    const pre = nouveau.role === "SUPERVISEUR" ? "SUP" : "AMB";
    const code = pre + "-" + nouveau.nom.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X") + "-" + Math.floor(1000 + Math.random() * 9000);
    const nm: Membre = { id: pre + Date.now(), nom: nouveau.nom.trim(), telephone: nouveau.telephone.trim(), role: nouveau.role as Role, zone: nouveau.zone || nouveau.commune || "Gombe", statut: "ACTIF", filleuls: 0, boutiquesValidees: 0, gains: 0, dateInscription: new Date().toISOString().slice(0, 10), codePro: code, chefCode: "DG", province: nouveau.province || "Kinshasa", commune: nouveau.commune || nouveau.zone || "Gombe", village: nouveau.village || nouveau.commune || nouveau.zone || "Gombe" };
    setMembres(p => [...p, nm]);
    await supabase.from("membres").insert({ id: nm.id, nom: nm.nom, telephone: nm.telephone, role: nm.role, zone: nm.zone, statut: nm.statut, filleuls: nm.filleuls, boutiques_validees: nm.boutiquesValidees, gains: nm.gains, date_inscription: nm.dateInscription, code_pro: nm.codePro, chef_code: nm.chefCode, province: nm.province, commune: nm.commune, village: nm.village });
    showToast("✅ Créé. Code : " + code);
    setNouveau({ nom: "", telephone: "", role: "SUPERVISEUR", zone: "", province: "Kinshasa", commune: "", village: "" });
    envoyerAlerte("👥 Nouveau membre", "Créé : " + code, "NORMALE", "DG");
  };
  const resoudre = async (id: string) => {
    setProblemes(p => p.map(x => x.id === id ? { ...x, statut: "RESOLU" } : x));
    await supabase.from("problemes").update({ statut: "RESOLU" }).eq("id", id);
    showToast("✅ Problème résolu.");
  };
  const validerPay = async (id: string) => {
    setPaiements(p => p.map(x => x.id === id ? { ...x, statut: "PAYÉ" } : x));
    await supabase.from("paiements").update({ statut: "PAYÉ" }).eq("id", id);
    showToast("✅ Paiement validé.");
  };
  const ajouterProbleme = async () => {
    if (!formProb.type.trim() || !formProb.qui.trim()) return showToast("Type + Qui obligatoires");
    const np: Probleme = { id: "P-" + Date.now(), type: formProb.type.trim(), qui: formProb.qui.trim(), code: "-", detail: formProb.detail.trim(), urgence: formProb.urgence as any, statut: "OUVERT" };
    setProblemes(p => [np, ...p]);
    await supabase.from("problemes").insert({ id: np.id, type: np.type, qui: np.qui, code: np.code, detail: np.detail, urgence: np.urgence, statut: np.statut });
    if (formProb.urgence === "CRITIQUE" || formProb.urgence === "URGENTE") envoyerAlerte("🚨 Problème " + formProb.urgence, formProb.type + " - " + formProb.qui + " : " + formProb.detail, formProb.urgence, formProb.qui);
    setFormProb({ type: "", qui: "", detail: "", urgence: "NORMALE" });
    showToast("✅ Problème signalé.");
  };
  const ajouterPaiement = async () => {
    const montant = parseInt(formPay.montant || "0");
    if (!formPay.qui.trim() || !montant) return showToast("Qui + Montant obligatoires");
    const np: Paiement = { id: "PAY-" + Date.now(), qui: formPay.qui.trim(), type: formPay.type, montant, methode: formPay.methode, statut: "EN_ATTENTE" };
    setPaiements(p => [np, ...p]);
    await supabase.from("paiements").insert({ id: np.id, qui: np.qui, type: np.type, montant: np.montant, methode: np.methode, statut: np.statut });
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
    const txt = membres.map(m => `${m.nom} | ${m.codePro} | ${m.telephone} | ${m.role} | ${m.province} > ${m.commune} > ${m.village} | ${m.statut}`).join("\n");
    try { await navigator.clipboard.writeText(txt); showToast("✅ Membres copiés !"); } catch { showToast(txt); }
  };
  const exportJSON = () => {
    const data = { version: "wenze_dg_next_v4", exportedAt: new Date().toISOString(), membres, problemes, paiements, alertes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "wenze-dg-backup-" + new Date().toISOString().slice(0, 10) + ".json"; a.click(); URL.revokeObjectURL(a.href);
    showToast("✅ Backup téléchargé.");
  };
  const importJSON = () => {
    try {
      const d = JSON.parse(importText.trim());
      if (!d.membres) throw new Error("Format invalide");
      if (!confirm("Remplacer TOUTES les données par ce backup ?")) return;
      setMembres(d.membres); setProblemes(d.problemes || []); setPaiements(d.paiements || []); setAlertes(d.alertes || []);
      showToast("✅ Backup restauré !");
    } catch (e: any) { showToast("❌ JSON invalide : " + e.message); }
  };
  const copierRapport = async () => {
    const txt = `📊 RAPPORT WENZE - ${new Date().toLocaleDateString("fr-CD")}\nMembres: ${membres.length} (Sup: ${sup.length} / Amb: ${amb.length})\nActifs: ${membres.filter(m => m.statut === "ACTIF").length}\nProblèmes ouverts: ${probOuverts}\nTotal PAYÉ: ${totalPaye.toLocaleString()} CDF`;
    try { await navigator.clipboard.writeText(txt); showToast("✅ Rapport copié !"); } catch { showToast(txt); }
  };
    if (!deverrouille) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <p className="text-[11px] opacity-70">WENZE • ESPACE PRIVÉ DG</p>
        <p className="text-[40px] mt-4">👑</p>
        <h1 className="font-black text-[20px] mt-2 text-center">Tableau de bord DG</h1>
        <p className="text-[12px] opacity-70 mt-1 text-center">Entre ton PIN. Seul le DG connaît ce code.</p>
        <input value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && (pin === pinDG ? setDeverrouille(true) : showToast("❌ Code faux"))} type="password" inputMode="numeric" placeholder="••••" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 text-center text-[22px] tracking-[10px] outline-none mt-6" />
        <button onClick={() => pin === pinDG ? setDeverrouille(true) : showToast("❌ Code faux")} className="w-full bg-[#FF6B00] py-4 rounded-full font-black text-[13px] mt-3">🔓 Déverrouiller</button>
        <p className="text-[10px] opacity-50 mt-3">PIN par défaut : 2026 — Change-le dans PARAMÈTRES</p>
        {toast && <div className="fixed top-4 left-4 right-4 bg-white text-black p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div>}
      </div>
    );
  }

  const ONGLETS = ["DASH", "MEMBRES", "PROBLEMES", "PAIEMENTS", "ALERTES", "LIENS", "CARTE", "TICKETS", "DESIGN", "PARAMETRES", "RAPPORTS"];
  const inputCls = "w-full border rounded-xl px-3 py-3 text-[13px] outline-none";

  return (
    <div className="max-w-[480px] mx-auto min-h-screen pb-20" style={{ background: designPrive.bg }}>
      {toast && <div className="fixed top-4 left-4 right-4 z-50 max-w-[450px] mx-auto bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center shadow-lg">{toast}</div>}
      <div className="text-white p-5 pt-10 rounded-b-[28px]" style={{ background: designPrive.hdr }}>
        <div className="flex justify-between items-start">
          <div><p className="text-[11px] opacity-70">WENZE • ESPACE PRIVÉ</p><h1 className="font-black text-[20px] mt-1">{designPrive.adminName}</h1><p className="text-[12px] opacity-80 mt-1">Bonjour Directeur Général.</p></div>
          <div className="flex flex-col gap-2 items-end">
            <Link href="/" className="text-[11px] bg-white text-black px-3 py-1.5 rounded-full font-bold">← Accueil</Link>
            <button onClick={() => { setDeverrouille(false); setPin(""); }} className="text-[11px] bg-white/10 px-3 py-1.5 rounded-full font-bold">🔒 Verrouiller</button>
          </div>
        </div>
        <div className="bg-white/10 rounded-2xl p-3 mt-3">
          <div className="flex justify-between items-center"><p className="font-black text-[12px]">📱 {statutLive}</p><p className="font-black text-[12px]">🕒 {new Date().toLocaleTimeString("fr-CD")}</p></div>
          <p className="text-[11px] opacity-80 mt-1">Si tu ouvres ce bureau sur 2 téléphones, une action sur l'un apparaît sur l'autre sans recharger.</p>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          <div className="bg-white/10 rounded-xl p-2"><p className="font-black text-[16px]">{membres.length}</p><p className="text-[9px] opacity-80">MEMBRES</p></div>
          <div className="bg-white/10 rounded-xl p-2"><p className="font-black text-[16px]">{totalBout}</p><p className="text-[9px] opacity-80">BOUTIQUES</p></div>
          <div className="bg-white/10 rounded-xl p-2"><p className="font-black text-[16px]">{totalPaye.toLocaleString()}</p><p className="text-[9px] opacity-80">CDF PAYÉ</p></div>
          <div className="bg-white/10 rounded-xl p-2"><p className="font-black text-[16px] text-red-300">{anomalies}</p><p className="text-[9px] opacity-80">CRITIQUES</p></div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto p-3 sticky top-0 z-10" style={{ background: designPrive.bg }}>
        {ONGLETS.map(o => (
          <button key={o} onClick={() => setOnglet(o)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-bold ${onglet === o ? "bg-black text-white" : "bg-white border"}`}>{o}</button>
        ))}
      </div>

      <div className="px-3">
      {onglet === "DASH" && (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border rounded-2xl p-3"><p className="font-black text-[20px]">{sup.length} / {amb.length}</p><p className="text-[11px] text-gray-500">Sup / Amb</p></div>
            <div className="bg-white border rounded-2xl p-3"><p className="font-black text-[20px]">{membres.filter(m => m.statut === "EN_ATTENTE").length}</p><p className="text-[11px] text-gray-500">En attente</p></div>
            <div className="bg-white border rounded-2xl p-3"><p className="font-black text-[20px]">{totalGains.toLocaleString()} CDF</p><p className="text-[11px] text-gray-500">Gains Amb</p></div>
            <div className="bg-white border rounded-2xl p-3"><p className="font-black text-[20px]">{probOuverts}</p><p className="text-[11px] text-gray-500">Problèmes ouverts</p></div>
          </div>
          <div className="bg-white border rounded-2xl p-4 mt-3">
            <h2 className="font-black text-[15px]">🚨 Critiques à traiter</h2>
            {problemes.filter(p => p.urgence === "CRITIQUE" && p.statut === "OUVERT").map(p => (
              <p key={p.id} className="text-[12px] mt-2">🔴 <b>{p.type}</b> — {p.qui} : {p.detail} <button onClick={() => resoudre(p.id)} className="bg-green-100 px-2 py-1 rounded-full font-bold text-[11px]">Résoudre</button></p>
            ))}
            {anomalies === 0 && <p className="text-[12px] text-gray-500 mt-2">Aucune critique. Bravo.</p>}
            <button onClick={() => { bipLocal(); showToast("✅ Test : son + vibration OK"); }} className="w-full bg-[#FF6B00] text-white py-3 rounded-full font-black text-[12px] mt-3">🔔 Tester alerte + bip</button>
          </div>
          <div className="bg-white border rounded-2xl p-4 mt-3">
            <h2 className="font-black text-[15px]">⏳ Membres en attente</h2>
            {membres.filter(m => m.statut === "EN_ATTENTE").map(m => (
              <p key={m.id} className="text-[12px] mt-2">{m.nom} — {m.role} • {m.commune} <button onClick={() => changer(m.id, "ACTIF")} className="bg-green-100 px-2 py-1 rounded-full font-bold text-[11px]">Valider</button></p>
            ))}
            {membres.filter(m => m.statut === "EN_ATTENTE").length === 0 && <p className="text-[12px] text-gray-500 mt-2">Aucun en attente.</p>}
          </div>
          <div className="bg-white border rounded-2xl p-4 mt-3">
            <h2 className="font-black text-[15px]">📊 Paiements par statut</h2>
            {["PAYÉ", "EN_ATTENTE", "ÉCHOUÉ"].map(s => {
              const n = paiements.filter(p => p.statut === s).length;
              return (<div key={s} className="mt-2"><div className="flex justify-between text-[11px] font-bold"><span>{s}</span><span>{n}</span></div><div className="h-3 bg-gray-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-[#FF6B00]" style={{ width: `${n / Math.max(1, paiements.length) * 100}%` }} /></div></div>);
            })}
          </div>
        </div>
      )}

      {onglet === "MEMBRES" && (
        <div>
          <div className="bg-white border rounded-2xl p-4">
            <h2 className="font-black text-[15px]">👥 Membres ({filtres.length})</h2>
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher nom, zone, code, commune..." className={inputCls} />
            <div className="grid grid-cols-3 gap-2 mt-2">
              <select value={filtreRole} onChange={e => setFiltreRole(e.target.value)} className={inputCls}><option>TOUS</option><option>SUPERVISEUR</option><option>AMBASSADEUR</option></select>
              <select value={filtreProvince} onChange={e => { setFiltreProvince(e.target.value); setFiltreCommune("TOUTES"); }} className={inputCls}>{provinces.map(p => <option key={p}>{p}</option>)}</select>
              <select value={filtreCommune} onChange={e => setFiltreCommune(e.target.value)} className={inputCls}>{communes.map(c => <option key={c}>{c}</option>)}</select>
            </div>
            <h3 className="font-black text-[13px] mt-4">+ Créer membre</h3>
            <input value={nouveau.nom} onChange={e => setNouveau({ ...nouveau, nom: e.target.value })} placeholder="Nom complet" className={inputCls} />
            <input value={nouveau.telephone} onChange={e => setNouveau({ ...nouveau, telephone: e.target.value })} placeholder="Téléphone +243..." className={inputCls} />
            <select value={nouveau.role} onChange={e => setNouveau({ ...nouveau, role: e.target.value })} className={inputCls}><option>SUPERVISEUR</option><option>AMBASSADEUR</option></select>
            <select value={nouveau.province} onChange={e => setNouveau({ ...nouveau, province: e.target.value })} className={inputCls}><option>Kinshasa</option><option>Kongo-Central</option><option>Kwango</option><option>Kwilu</option><option>Mai-Ndombe</option><option>Équateur</option><option>Mongala</option><option>Nord-Ubangi</option><option>Sud-Ubangi</option><option>Tshuapa</option><option>Haut-Katanga</option><option>Lualaba</option><option>Haut-Lomami</option><option>Tanganyika</option><option>Kasaï</option><option>Kasaï-Central</option><option>Kasaï-Oriental</option><option>Lomami</option><option>Sankuru</option><option>Maniema</option><option>Nord-Kivu</option><option>Sud-Kivu</option><option>Ituri</option><option>Haut-Uele</option><option>Bas-Uele</option><option>Tshopo</option></select>
            <input value={nouveau.commune} onChange={e => setNouveau({ ...nouveau, commune: e.target.value })} placeholder="Commune" className={inputCls} />
            <input value={nouveau.village} onChange={e => setNouveau({ ...nouveau, village: e.target.value })} placeholder="Village / quartier" className={inputCls} />
            <input value={nouveau.zone} onChange={e => setNouveau({ ...nouveau, zone: e.target.value })} placeholder="Zone (ex: Gombe)" className={inputCls} />
            <button onClick={creer} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Créer membre</button>
            <button onClick={exportMembres} className="w-full bg-gray-100 py-3 rounded-full font-black text-[12px] mt-2">📋 Copier liste membres</button>
          </div>
          {filtres.map(m => (
            <div key={m.id} className="bg-white border rounded-2xl p-4 mt-2">
              <p className="font-black text-[14px]">{m.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{m.statut}</span> <span className="text-[10px] bg-orange-100 px-2 py-0.5 rounded-full">{m.role}</span></p>
              <p className="text-[11px] text-gray-500 mt-1">{m.telephone} • {m.codePro} • Chef : {m.chefCode}<br />{m.province} • {m.commune} • {m.village} • Zone {m.zone}<br />Filleuls {m.filleuls || 0} • Boutiques {m.boutiquesValidees || 0} • Gains {(m.gains || 0).toLocaleString()} CDF • Inscrit {m.dateInscription}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button onClick={() => changer(m.id, "ACTIF")} className="bg-green-100 px-3 py-1.5 rounded-full font-bold text-[11px]">Activer</button>
                <button onClick={() => changer(m.id, "SUSPENDU")} className="bg-red-100 px-3 py-1.5 rounded-full font-bold text-[11px]">Suspendre</button>
                <button onClick={() => changer(m.id, "EN_ATTENTE")} className="bg-yellow-100 px-3 py-1.5 rounded-full font-bold text-[11px]">En attente</button>
                <button onClick={() => supprimer(m.id)} className="bg-gray-100 px-3 py-1.5 rounded-full font-bold text-[11px]">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
              {onglet === "PROBLEMES" && (
        <div>
          <div className="bg-white border rounded-2xl p-4">
            <h2 className="font-black text-[15px]">🚨 Problèmes</h2>
            <input value={formProb.type} onChange={e => setFormProb({ ...formProb, type: e.target.value })} placeholder="Type : Boutique fausse, Paiement..." className={inputCls} />
            <input value={formProb.qui} onChange={e => setFormProb({ ...formProb, qui: e.target.value })} placeholder="Qui ?" className={inputCls} />
            <input value={formProb.detail} onChange={e => setFormProb({ ...formProb, detail: e.target.value })} placeholder="Détail" className={inputCls} />
            <select value={formProb.urgence} onChange={e => setFormProb({ ...formProb, urgence: e.target.value })} className={inputCls}><option>NORMALE</option><option>URGENTE</option><option>CRITIQUE</option></select>
            <button onClick={ajouterProbleme} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Signaler problème</button>
          </div>
          {problemes.map(p => (
            <div key={p.id} className="bg-white border rounded-2xl p-4 mt-2">
              <p className="font-black text-[14px]">{p.type} <span className="text-[10px] bg-red-100 px-2 py-0.5 rounded-full">{p.urgence}</span> <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{p.statut}</span></p>
              <p className="text-[11px] text-gray-500 mt-1">{p.qui} • Code {p.code}<br />{p.detail}</p>
              <button onClick={() => resoudre(p.id)} className="bg-green-100 px-3 py-1.5 rounded-full font-bold text-[11px] mt-2">Résoudre</button>
            </div>
          ))}
        </div>
      )}

      {onglet === "PAIEMENTS" && (
        <div>
          <div className="bg-white border rounded-2xl p-4">
            <h2 className="font-black text-[15px]">💰 Paiements — Total PAYÉ : {totalPaye.toLocaleString()} CDF</h2>
            <input value={formPay.qui} onChange={e => setFormPay({ ...formPay, qui: e.target.value })} placeholder="Qui ?" className={inputCls} />
            <select value={formPay.type} onChange={e => setFormPay({ ...formPay, type: e.target.value })} className={inputCls}><option>Abonnement Boutique</option><option>Ticket Tombola</option><option>Autre</option></select>
            <input value={formPay.montant} onChange={e => setFormPay({ ...formPay, montant: e.target.value })} type="number" placeholder="Montant CDF" className={inputCls} />
            <select value={formPay.methode} onChange={e => setFormPay({ ...formPay, methode: e.target.value })} className={inputCls}><option>Orange Money</option><option>M-Pesa</option><option>Airtel Money</option></select>
            <button onClick={ajouterPaiement} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Ajouter paiement</button>
          </div>
          {paiements.map(p => (
            <div key={p.id} className="bg-white border rounded-2xl p-4 mt-2">
              <p className="font-black text-[14px]">{p.qui} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{p.statut}</span></p>
              <p className="text-[11px] text-gray-500">{p.type} • {p.montant.toLocaleString()} CDF • {p.methode}</p>
              <div className="flex gap-2 mt-2"><button onClick={() => validerPay(p.id)} className="bg-green-100 px-3 py-1.5 rounded-full font-bold text-[11px]">PAYÉ</button></div>
            </div>
          ))}
        </div>
      )}

      {onglet === "ALERTES" && (
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[15px]">🔔 Alertes Telegram</h2>
          <p className="text-[12px] text-gray-500 mt-1">Dernier envoi : {dernier || "—"}</p>
          <div className="flex gap-2 mt-2"><button onClick={() => setAlerteActive(!alerteActive)} className="flex-1 bg-gray-100 py-2 rounded-full font-bold text-[11px]">Alertes : {alerteActive ? "ON" : "OFF"}</button><button onClick={() => setSonActif(!sonActif)} className="flex-1 bg-gray-100 py-2 rounded-full font-bold text-[11px]">Son : {sonActif ? "ON" : "OFF"}</button></div>
          <button onClick={tester} disabled={testEnCours} className="w-full bg-[#FF6B00] text-white py-3 rounded-full font-black text-[12px] mt-3">{testEnCours ? "⏳ Envoi..." : "🧪 Tester alerte CRITIQUE"}</button>
          {alertes.map(a => (<div key={a.id} className="border-b py-2"><p className="font-bold text-[12px]">{a.titre} <span className="text-[10px] bg-red-100 px-2 py-0.5 rounded-full">{a.urgence}</span></p><p className="text-[11px] text-gray-500">{a.heure} — {a.resultat}</p></div>))}
          {alertes.length === 0 && <p className="text-[12px] text-gray-500 mt-2">Aucune alerte envoyée.</p>}
        </div>
      )}

      {onglet === "LIENS" && (
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[15px]">🔗 Liens rapides</h2>
          <p className="text-[12px] text-gray-500">Ces liens sont pour toi, le DG. Le public ne les voit pas.</p>
          <div className="flex gap-2 mt-2"><Link href="/" className="flex-1 text-center bg-black text-white py-3 rounded-full font-black text-[12px]">🏠 Accueil public</Link><Link href="/connexion" className="flex-1 text-center bg-gray-100 py-3 rounded-full font-black text-[12px]">👥 Connexion membres</Link></div>
          <button onClick={copierRapport} className="w-full bg-gray-100 py-3 rounded-full font-black text-[12px] mt-2">📋 Copier rapport</button>
          <button onClick={exportJSON} className="w-full bg-gray-100 py-3 rounded-full font-black text-[12px] mt-2">⬇️ Backup JSON</button>
        </div>
      )}

      {onglet === "CARTE" && (
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[15px]">🗺️ Carte membres — Kinshasa</h2>
          <p className="text-[12px] text-gray-500">Membres par commune. Pas besoin d'internet.</p>
          <div className="relative h-[340px] bg-[#0f2040] rounded-2xl overflow-hidden mt-3">
            {membres.map((m, i) => {
              const POS: Record<string, [number, number]> = { Gombe: [48, 28], Lemba: [38, 68], Ngaliema: [30, 38], Kintambo: [38, 45], Masina: [72, 62], Bandal: [32, 52] };
              const p = POS[m.commune] || [50, 50];
              return (<button key={m.id} onClick={() => showToast(`👤 ${m.nom} — ${m.commune} • ${m.statut} • ${m.codePro}`)} className="absolute w-7 h-7 rounded-full text-[13px] flex items-center justify-center border-2 border-white" style={{ left: `${p[0] + (i % 3 - 1) * 2}%`, top: `${p[1]}%`, background: m.statut === "ACTIF" ? "#22c55e" : m.statut === "SUSPENDU" ? "#ef4444" : "#f59e0b" }}>👤</button>);
            })}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">🟢 ACTIF • 🟡 EN_ATTENTE • 🔴 SUSPENDU — Clique sur un point.</p>
        </div>
      )}

      {onglet === "TICKETS" && (
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[15px]">🎟️ Tickets Tombola</h2>
          <p className="text-[12px] text-gray-500">Les tickets sont dans PAIEMENTS, type Ticket Tombola. Total tickets : {paiements.filter(p => p.type === "Ticket Tombola").length} — Total PAYÉ tickets : {paiements.filter(p => p.type === "Ticket Tombola" && p.statut === "PAYÉ").reduce((s, p) => s + p.montant, 0).toLocaleString()} CDF</p>
          {paiements.filter(p => p.type === "Ticket Tombola").map(p => (
            <div key={p.id} className="border-b py-2"><p className="font-bold text-[12px]">{p.qui} — {p.montant.toLocaleString()} CDF <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{p.statut}</span></p><p className="text-[11px] text-gray-500">{p.methode}</p></div>
          ))}
        </div>
      )}

      {onglet === "DESIGN" && (
        <div>
          <div className="bg-white border rounded-2xl p-4">
            <h2 className="font-black text-[15px]">🎨 Studio DG — Contrôle du Public</h2>
            <p className="text-[12px] text-gray-500">Ce que tu changes ici, le public le voit en 1-2 sec après PUBLIER.</p>
            <label className="text-[11px] font-bold">Titre public</label><input value={designPub.title} onChange={e => setDesignPub({ ...designPub, title: e.target.value })} className={inputCls} />
            <label className="text-[11px] font-bold">Slogan public</label><input value={designPub.slogan} onChange={e => setDesignPub({ ...designPub, slogan: e.target.value })} className={inputCls} />
            <label className="text-[11px] font-bold">À propos</label><input value={designPub.about} onChange={e => setDesignPub({ ...designPub, about: e.target.value })} className={inputCls} />
            <label className="text-[11px] font-bold">WhatsApp public</label><input value={designPub.whats} onChange={e => setDesignPub({ ...designPub, whats: e.target.value })} className={inputCls} />
            <label className="text-[11px] font-bold">Logo URL</label><input value={designPub.logo} onChange={e => setDesignPub({ ...designPub, logo: e.target.value })} placeholder="https://..." className={inputCls} />
            <label className="text-[11px] font-bold">Couleur titre</label><input value={designPub.main} onChange={e => setDesignPub({ ...designPub, main: e.target.value })} type="color" className={inputCls} />
            <label className="text-[11px] font-bold">Couleur bouton</label><input value={designPub.btn} onChange={e => setDesignPub({ ...designPub, btn: e.target.value })} type="color" className={inputCls} />
            <div className="flex gap-2 mt-2"><button onClick={() => setDesignPub({ ...designPub, showAmb: !designPub.showAmb })} className="flex-1 bg-gray-100 py-2 rounded-full font-bold text-[11px]">Ambassadeur : {designPub.showAmb ? "ON" : "OFF"}</button><button onClick={() => setDesignPub({ ...designPub, maintenance: !designPub.maintenance })} className="flex-1 bg-gray-100 py-2 rounded-full font-bold text-[11px]">Maintenance : {designPub.maintenance ? "ON" : "OFF"}</button></div>
            <button onClick={publierDesign} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-3">✅ PUBLIER SUR LE PUBLIC</button>
          </div>
          <div className="bg-white border-2 border-dashed rounded-2xl p-4 mt-3 text-center">
            <p className="text-[11px] text-gray-500">👁️ Aperçu public en direct</p>
            {designPub.logo && <img src={designPub.logo} alt="logo" className="max-w-[80px] rounded-xl mx-auto mt-2" />}
            <h2 className="font-black text-[18px] mt-2" style={{ color: designPub.main }}>{designPub.title}</h2>
            <p className="text-[13px]">{designPub.slogan}</p>
            <p className="text-[11px] text-gray-500">{designPub.about}</p>
            <p className="text-[12px] font-bold">WhatsApp : {designPub.whats}</p>
            {designPub.showAmb ? <button className="px-4 py-2 rounded-full text-white font-bold text-[12px] mt-2" style={{ background: designPub.btn }}>Devenir Ambassadeur</button> : <p className="text-[11px] text-gray-500">Inscriptions fermées par le DG.</p>}
            {designPub.maintenance && <p className="text-[12px] font-bold text-red-600 mt-2">🚧 Maintenance ON — public voit "On revient bientôt"</p>}
          </div>
          <div className="bg-white border rounded-2xl p-4 mt-3">
            <h2 className="font-black text-[15px]">🎨 Design Privé (ton bureau)</h2>
            <label className="text-[11px] font-bold">Nom admin</label><input value={designPrive.adminName} onChange={e => setDesignPrive({ ...designPrive, adminName: e.target.value })} className={inputCls} />
            <label className="text-[11px] font-bold">Couleur header</label><input value={designPrive.hdr} onChange={e => setDesignPrive({ ...designPrive, hdr: e.target.value })} type="color" className={inputCls} />
            <label className="text-[11px] font-bold">Couleur bouton</label><input value={designPrive.btn} onChange={e => setDesignPrive({ ...designPrive, btn: e.target.value })} type="color" className={inputCls} />
            <button onClick={() => showToast("✅ Design privé appliqué")} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">Appliquer design privé</button>
          </div>
        </div>
      )}

      {onglet === "PARAMETRES" && (
        <div>
          <div className="bg-white border rounded-2xl p-4">
            <h2 className="font-black text-[15px]">⚙️ Paramètres</h2>
            <p className="text-[12px] text-gray-500">PIN actuel : {pinDG}</p>
            <label className="text-[11px] font-bold">Ancien PIN</label><input value={pinForm.ancien} onChange={e => setPinForm({ ...pinForm, ancien: e.target.value })} type="password" className={inputCls} />
            <label className="text-[11px] font-bold">Nouveau PIN</label><input value={pinForm.nouveau} onChange={e => setPinForm({ ...pinForm, nouveau: e.target.value })} type="password" className={inputCls} />
            <label className="text-[11px] font-bold">Confirmer nouveau PIN</label><input value={pinForm.confirm} onChange={e => setPinForm({ ...pinForm, confirm: e.target.value })} type="password" className={inputCls} />
            <button onClick={changerPIN} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">Changer PIN</button>
            <label className="text-[11px] font-bold mt-3 block">Secret Telegram</label><input value={secret} onChange={e => setSecret(e.target.value)} type="password" className={inputCls} />
          </div>
          <div className="bg-white border rounded-2xl p-4 mt-3">
            <h2 className="font-black text-[15px]">📦 Backup</h2>
            <button onClick={exportJSON} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px]">⬇️ Export JSON</button>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={4} placeholder='{"membres": [...]}' className={inputCls} />
            <button onClick={importJSON} className="w-full bg-gray-100 py-3 rounded-full font-black text-[12px] mt-2">Restaurer backup</button>
          </div>
        </div>
      )}

      {onglet === "RAPPORTS" && (
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="font-black text-[15px]">📊 Rapports</h2>
          <pre className="whitespace-pre-wrap text-[13px] bg-gray-50 p-3 rounded-xl mt-2">{`📊 RAPPORT WENZE - ${new Date().toLocaleDateString("fr-CD")}\nMembres: ${membres.length} (Sup: ${sup.length} / Amb: ${amb.length})\nActifs: ${membres.filter(m => m.statut === "ACTIF").length}\nProblèmes ouverts: ${probOuverts}\nTotal PAYÉ: ${totalPaye.toLocaleString()} CDF`}</pre>
          <button onClick={copierRapport} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">📋 Copier rapport</button>
          <button onClick={exportJSON} className="w-full bg-gray-100 py-3 rounded-full font-black text-[12px] mt-2">⬇️ Export JSON complet</button>
        </div>
      )}
      </div>
    </div>
  );
          }
