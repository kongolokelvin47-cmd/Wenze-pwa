"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

// Son local sans dépendance externe (marche même si Mixkit est down)
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
  // Formulaires
  const [formProb, setFormProb] = useState({ type: "", qui: "", detail: "", urgence: "NORMALE" });
  const [formPay, setFormPay] = useState({ qui: "", type: "Abonnement Boutique", montant: "", methode: "Orange Money" });
  const [pinForm, setPinForm] = useState({ ancien: "", nouveau: "", confirm: "" });
  const [importText, setImportText] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  // ===== CHARGEMENT localStorage (1 seule fois) =====
  useEffect(() => {
    try {
      // Migration depuis ancienne clé HTML si elle existe
      const old = localStorage.getItem("wenze_dg_v3");
      if (old) {
        const o = JSON.parse(old);
        if (o.membres) setMembres(o.membres);
        if (o.problemes) setProblemes(o.problemes);
        if (o.paiements) setPaiements(o.paiements);
        if (o.alertes) setAlertes(o.alertes);
        if (o.pin) setPinDG(o.pin);
        if (o.designPub) setDesignPub(o.designPub);
        if (o.designPrive) setDesignPrive(o.designPrive);
      }
      const data = localStorage.getItem("wenze_dg_data");
      if (data) {
        const d = JSON.parse(data);
        if (d.membres) setMembres(d.membres);
        if (d.problemes) setProblemes(d.problemes);
        if (d.paiements) setPaiements(d.paiements);
        if (d.alertes) setAlertes(d.alertes);
      }
      const cfg = localStorage.getItem("wenze_dg_config");
      if (cfg) {
        const c = JSON.parse(cfg);
        if (c.pin) setPinDG(c.pin);
        if (typeof c.alerteActive === "boolean") setAlerteActive(c.alerteActive);
        if (typeof c.sonActif === "boolean") setSonActif(c.sonActif);
        if (c.designPub) setDesignPub(c.designPub);
        if (c.designPrive) setDesignPrive(c.designPrive);
        if (c.tg?.secret !== undefined) setSecret(c.tg.secret);
        else if (c.secret) setSecret(c.secret);
      }
    } catch {}
    setLoaded(true);
  }, []);

  // ===== SAUVEGARDE auto (data séparée de config/secrets) =====
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("wenze_dg_data", JSON.stringify({ membres, problemes, paiements, alertes }));
      localStorage.setItem("wenze_dg_config", JSON.stringify({ pin: pinDG, alerteActive, sonActif, designPub, designPrive, tg: { secret } }));
    } catch {}
  }, [loaded, membres, problemes, paiements, alertes, pinDG, alerteActive, sonActif, designPub, designPrive, secret]);

  const envoyerAlerte = async (titre: string, detail: string, urgence: string, qui: string) => {
    if (!alerteActive) return false;
    if (sonActif && urgence === "CRITIQUE") {
      try { if (navigator.vibrate) navigator.vibrate([300, 100, 300]); } catch {}
      bipLocal();
    }
    let res = "❌ Échec - Vérifie Vercel";
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (secret) headers["x-wenze-secret"] = secret;
      const r = await fetch("/api/alerte", { method: "POST", headers, body: JSON.stringify({ titre, detail, urgence, qui, secret: secret || undefined }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) res = "✅ Envoyée sur Telegram";
      else res = "❌ " + (d.error || d.erreur || "TOKEN / CHAT_ID / SECRET manquant dans Vercel");
    } catch { res = "❌ Pas de connexion / API introuvable"; }
    setDernier(res);
    setAlertes(p => [{ id: String(Date.now()), heure: new Date().toLocaleTimeString("fr-CD", { hour: "2-digit", minute: "2-digit" }), titre, urgence, resultat: res }, ...p].slice(0, 30));
    return res.startsWith("✅");
  };

  const tester = async () => { setTestEnCours(true); const ok = await envoyerAlerte("TEST - Alerte WENZE", "Si tu reçois ce message sur Telegram, ton système marche !", "CRITIQUE", "DG - Test"); showToast(ok ? "✅ Alerte envoyée ! Regarde Telegram." : "❌ Échec. Va dans ALERTES."); setTestEnCours(false); };

  const sup = useMemo(() => membres.filter(m => m.role === "SUPERVISEUR"), [membres]);
  const amb = useMemo(() => membres.filter(m => m.role === "AMBASSADEUR"), [membres]);
  const enAtt = useMemo(() => membres.filter(m => m.statut === "EN_ATTENTE"), [membres]);
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

  const changer = (id: string, s: Statut) => { setMembres(p => p.map(m => m.id === id ? { ...m, statut: s } : m)); showToast(s === "ACTIF" ? "✅ Membre validé." : "⏸️ Membre suspendu."); };
  const supprimer = (id: string) => { if (confirm("DG, supprimer ce membre ?")) { setMembres(p => p.filter(m => m.id !== id)); showToast("🗑️ Supprimé."); } };
  const creer = () => {
    if (!nouveau.nom.trim() || nouveau.telephone.length < 9) return showToast("Nom + WhatsApp obligatoires.");
    const pre = nouveau.role === "SUPERVISEUR" ? "SUP" : "AMB";
    const code = pre + "-" + nouveau.nom.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X") + "-" + Math.floor(1000 + Math.random() * 9000);
    setMembres(p => [...p, { id: pre + Date.now(), nom: nouveau.nom.trim(), telephone: nouveau.telephone.trim(), role: nouveau.role as Role, zone: nouveau.zone || nouveau.commune || "Gombe", statut: "ACTIF", filleuls: 0, boutiquesValidees: 0, gains: 0, dateInscription: new Date().toISOString().slice(0, 10), codePro: code, chefCode: "DG", province: nouveau.province || "Kinshasa", commune: nouveau.commune || nouveau.zone || "Gombe", village: nouveau.village || nouveau.commune || nouveau.zone || "Gombe" }]);
    showToast("✅ Créé. Code : " + code);
    setNouveau({ nom: "", telephone: "", role: "SUPERVISEUR", zone: "", province: "Kinshasa", commune: "", village: "" });
    envoyerAlerte("👥 Nouveau membre", "Créé : " + code, "NORMALE", "DG");
  };
  const resoudre = (id: string) => { setProblemes(p => p.map(x => x.id === id ? { ...x, statut: "RESOLU" } : x)); showToast("✅ Problème résolu."); };
  const validerPay = (id: string) => { setPaiements(p => p.map(x => x.id === id ? { ...x, statut: "PAYÉ" } : x)); showToast("✅ Paiement validé."); };
  const ajouterProbleme = () => {
    if (!formProb.type.trim() || !formProb.qui.trim()) return showToast("Type + Qui obligatoires");
    setProblemes(p => [{ id: "P-" + Date.now(), type: formProb.type.trim(), qui: formProb.qui.trim(), code: "-", detail: formProb.detail.trim(), urgence: formProb.urgence as any, statut: "OUVERT" }, ...p]);
    if (formProb.urgence === "CRITIQUE" || formProb.urgence === "URGENTE") envoyerAlerte("🚨 Problème " + formProb.urgence, formProb.type + " - " + formProb.qui + " : " + formProb.detail, formProb.urgence, formProb.qui);
    setFormProb({ type: "", qui: "", detail: "", urgence: "NORMALE" });
    showToast("✅ Problème signalé.");
  };
  const ajouterPaiement = () => {
    const montant = parseInt(formPay.montant || "0");
    if (!formPay.qui.trim() || !montant) return showToast("Qui + Montant obligatoires");
    setPaiements(p => [{ id: "PAY-" + Date.now(), qui: formPay.qui.trim(), type: formPay.type, montant, methode: formPay.methode, statut: "EN_ATTENTE" }, ...p]);
    setFormPay({ qui: "", type: "Abonnement Boutique", montant: "", methode: "Orange Money" });
    showToast("✅ Paiement ajouté.");
  };
  const changerPIN = () => {
    if (pinForm.ancien !== pinDG) return showToast("❌ Ancien PIN faux.");
    if (pinForm.nouveau.length < 4) return showToast("Nouveau PIN : min 4 chiffres.");
    if (pinForm.nouveau !== pinForm.confirm) return showToast("Les 2 nouveaux PIN ne correspondent pas.");
    setPinDG(pinForm.nouveau); setPinForm({ ancien: "", nouveau: "", confirm: "" });
    showToast("✅ PIN changé. Utilise le nouveau au prochain verrouillage.");
  };
  const exportMembres = async () => {
    const txt = membres.map(m => `${m.nom} | ${m.codePro} | ${m.telephone} | ${m.role} | ${m.province} > ${m.commune} > ${m.village} | ${m.statut}`).join("\n");
    try { await navigator.clipboard.writeText(txt); showToast("✅ Membres copiés !"); } catch { showToast(txt); }
  };
  const exportJSON = () => {
    const data = { version: "wenze_dg_next_v3", exportedAt: new Date().toISOString(), membres, problemes, paiements, alertes };
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
        <p className="text-[10px] opacity-50 mt-3">PIN par défaut : 2026 — Change-le dans PARAMÈTRES (ancien PIN demandé)</p>
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
          <div className="flex justify-between items-center"><p className="font-black text-[12px]">📱 Alertes : {alerteActive ? "✅ ON" : "❌ OFF"}</p><button onClick={() => setAlerteActive(!alerteActive)} className={`text-[11px] font-black px-3 py-1.5 rounded-full ${alerteActive ? "bg-green-500" : "bg-red-500"}`}>{alerteActive ? "Désactiver" : "Activer"}</button></div>
          <p className="text-[11px] opacity-80 mt-1">Telegram via /api/alerte • Son : {sonActif ? "ON" : "OFF"} • Secret : {secret ? "✅ configuré" : "⚠️ vide (mode test)"}</p>
          {dernier && <p className="text-[11px] font-bold mt-1 bg-black/30 p-2 rounded-lg">{dernier}</p>}
          <div className="flex gap-2 mt-2">
            <button onClick={tester} disabled={testEnCours} className="flex-1 py-2.5 rounded-full text-[11px] font-black text-white" style={{ background: designPrive.btn }}>{testEnCours ? "Envoi..." : "📱 TESTER L'ALERTE"}</button>
            <button onClick={() => setSonActif(!sonActif)} className="px-3 bg-white/20 py-2.5 rounded-full text-[11px] font-black">{sonActif ? "🔔 ON" : "🔕 OFF"}</button>
            <button onClick={() => setOnglet("ALERTES")} className="px-3 bg-white/20 py-2.5 rounded-full text-[11px] font-black">Historique →</button>
          </div>
        </div>
        {anomalies > 0 && <button onClick={() => setOnglet("PROBLEMES")} className="w-full bg-red-600 text-white p-3 rounded-2xl mt-3 text-left animate-pulse"><p className="font-black text-[12px]">🚨 {anomalies} anomalie(s) CRITIQUE(s) !</p><p className="text-[11px] opacity-90">Clique pour résoudre.</p></button>}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-white/10 rounded-2xl p-2.5 text-center"><p className="font-black text-[14px]">{totalPaye.toLocaleString()}</p><p className="text-[9px] opacity-80">CDF Payés</p></div>
          <div className="bg-white/10 rounded-2xl p-2.5 text-center"><p className="font-black text-[14px] text-red-300">{probOuverts}</p><p className="text-[9px] opacity-80">Problèmes</p></div>
          <div className="bg-white/10 rounded-2xl p-2.5 text-center"><p className="font-black text-[14px]">{sup.length}</p><p className="text-[9px] opacity-80">Superviseurs</p></div>
          <div className="bg-white/10 rounded-2xl p-2.5 text-center"><p className="font-black text-[14px]">{amb.length}</p><p className="text-[9px] opacity-80">Ambassadeurs</p></div>
        </div>
      </div>

      <div className="flex gap-1.5 px-3 mt-3 overflow-x-auto pb-1">
        {ONGLETS.map(t => <button key={t} onClick={() => setOnglet(t)} className={`whitespace-nowrap px-3 py-2.5 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>{t === "DASH" ? "🏠 Dash" : t === "MEMBRES" ? "👥 Membres" : t === "PROBLEMES" ? `🚨 Problèmes (${probOuverts})` : t === "ALERTES" ? `📱 Alertes (${alertes.length})` : t === "PAIEMENTS" ? "💰 Paiements" : t === "LIENS" ? "🔗 Liens" : t === "CARTE" ? "🗺️ Carte" : t === "TICKETS" ? "🎟️ Tickets" : t === "DESIGN" ? "🎨 Design" : t === "PARAMETRES" ? "⚙️ Paramètres" : "📊 Rapports"}</button>)}
      </div>

      <div className="px-4 mt-3">
        {onglet === "DASH" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-3 border"><p className="text-[11px] text-gray-500">Superviseurs</p><p className="font-black text-[22px]">{sup.length}</p><p className="text-[11px] text-green-600">{sup.filter(m => m.statut === "ACTIF").length} actifs</p></div>
              <div className="bg-white rounded-2xl p-3 border"><p className="text-[11px] text-gray-500">Ambassadeurs</p><p className="font-black text-[22px]">{amb.length}</p><p className="text-[11px] text-green-600">{amb.filter(m => m.statut === "ACTIF").length} actifs</p></div>
              <div className="bg-white rounded-2xl p-3 border"><p className="text-[11px] text-gray-500">En attente</p><p className="font-black text-[22px] text-orange-600">{enAtt.length}</p><p className="text-[11px]">À valider par toi</p></div>
              <div className="bg-white rounded-2xl p-3 border"><p className="text-[11px] text-gray-500">Boutiques validées</p><p className="font-black text-[22px]">{totalBout}</p></div>
            </div>
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black text-[18px]">{totalGains.toLocaleString()} CDF gains • {totalPaye.toLocaleString()} CDF payés</p></div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">➕ Créer Superviseur / Ambassadeur</p>
              <div className="space-y-2 mt-3">
                <input value={nouveau.nom} onChange={e => setNouveau({ ...nouveau, nom: e.target.value })} placeholder="Nom complet" className={inputCls} />
                <input value={nouveau.telephone} onChange={e => setNouveau({ ...nouveau, telephone: e.target.value })} placeholder="WhatsApp Ex: 0825000000" className={inputCls} />
                <input value={nouveau.zone} onChange={e => setNouveau({ ...nouveau, zone: e.target.value })} placeholder="Zone Ex: Gombe" className={inputCls} />
                <input value={nouveau.province} onChange={e => setNouveau({ ...nouveau, province: e.target.value })} placeholder="Province Ex: Kinshasa" className={inputCls} />
                <input value={nouveau.commune} onChange={e => setNouveau({ ...nouveau, commune: e.target.value })} placeholder="Commune Ex: Gombe" className={inputCls} />
                <input value={nouveau.village} onChange={e => setNouveau({ ...nouveau, village: e.target.value })} placeholder="Village / Quartier" className={inputCls} />
                <div className="flex gap-2">{["SUPERVISEUR", "AMBASSADEUR"].map(r => <button key={r} onClick={() => setNouveau({ ...nouveau, role: r })} className={`flex-1 py-3 rounded-full text-[11px] font-black ${nouveau.role === r ? "bg-black text-white" : "bg-gray-100"}`}>{r}</button>)}</div>
                <button onClick={creer} className="w-full bg-black text-white py-3.5 rounded-full font-black text-[12px]">✅ Créer + Générer Code Pro</button>
              </div>
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">🌍 Aperçu Public (ce que le client voit)</p>
              <div className="border-2 border-dashed rounded-xl p-3 mt-2 text-center">
                {designPub.maintenance ? <h3>🚧 On revient bientôt</h3> : <>
                  {designPub.logo && <img src={designPub.logo} alt="Logo" className="mx-auto max-w-[100px] rounded-xl" />}
                  <h3 style={{ color: designPub.main }}>{designPub.title}</h3>
                  <p className="text-[13px]">{designPub.slogan}</p>
                  <p className="text-[11px] text-gray-500">{designPub.about}</p>
                  <p className="text-[12px] font-bold">WhatsApp : {designPub.whats}</p>
                  {designPub.showAmb && <button className="text-white px-4 py-2 rounded-full text-[11px] font-black" style={{ background: designPub.btn }}>Devenir Ambassadeur</button>}
                </>}
              </div>
              <button onClick={() => setOnglet("DESIGN")} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-3">🎨 Modifier le Design Public + Privé →</button>
            </div>
          </div>
        )}

        {onglet === "MEMBRES" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-3 space-y-2">
              <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="🔍 Rechercher nom, zone, code, commune" className="w-full bg-white border rounded-full px-4 py-3 text-[13px] outline-none" />
              <div className="flex gap-2">
                <select value={filtreProvince} onChange={e => { setFiltreProvince(e.target.value); setFiltreCommune("TOUTES"); }} className={inputCls}><option value="TOUTES">Toutes provinces</option>{provinces.filter(p => p !== "TOUTES").map(p => <option key={p}>{p}</option>)}</select>
                <select value={filtreCommune} onChange={e => setFiltreCommune(e.target.value)} className={inputCls}><option value="TOUTES">Toutes communes</option>{communes.filter(p => p !== "TOUTES").map(p => <option key={p}>{p}</option>)}</select>
              </div>
              <div className="flex gap-2">{["TOUS", "SUPERVISEUR", "AMBASSADEUR"].map(t => <button key={t} onClick={() => setFiltreRole(t)} className={`flex-1 py-2.5 rounded-full text-[11px] font-black ${filtreRole === t ? "bg-black text-white" : "bg-white border"}`}>{t}</button>)}</div>
              <p className="text-[11px] text-gray-500">{filtres.length} membre(s) affiché(s) / {membres.length} total</p>
              <button onClick={exportMembres} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px]">📥 Copier les membres (texte)</button>
              <button onClick={exportJSON} className="w-full py-3 rounded-full font-black text-[12px] text-white" style={{ background: designPrive.btn }}>💾 Exporter Backup JSON complet</button>
            </div>
            {filtres.length === 0 && <div className="bg-white border rounded-2xl p-4 text-center text-[12px] text-gray-500">Aucun membre avec ces filtres.</div>}
            {filtres.map(m => (
              <div key={m.id} className="bg-white rounded-2xl p-4 border">
                <p className="font-black text-[14px]">{m.nom} <span className="text-[10px] font-normal text-gray-400">• {m.codePro}</span></p>
                <p className="text-[11px] text-gray-500">{m.telephone} • {m.zone} • {m.statut} • Chef : {m.chefCode}</p>
                <p className="text-[11px] text-gray-500">{m.province} → {m.commune} → {m.village}</p>
                <p className="text-[11px] text-gray-500">Filleuls: {m.filleuls || 0} • Gains: {(m.gains || 0).toLocaleString()} • Boutiques: {m.boutiquesValidees || 0}</p>
                <div className="flex gap-2 mt-3">
                  {m.statut !== "ACTIF" && <button onClick={() => changer(m.id, "ACTIF")} className="flex-1 bg-green-600 text-white py-2 rounded-full text-[11px] font-black">✅ Valider</button>}
                  <button onClick={() => changer(m.id, "SUSPENDU")} className="flex-1 bg-orange-500 text-white py-2 rounded-full text-[11px] font-black">⏸️ Suspendre</button>
                  <button onClick={() => supprimer(m.id)} className="px-3 bg-red-50 text-red-600 py-2 rounded-full text-[11px] font-black">🗑️</button>
                </div>
                <a href={`tel:${m.telephone}`} className="block text-center bg-gray-100 py-2 rounded-full text-[11px] font-bold mt-2">📞 Appeler</a>
              </div>
            ))}
          </div>
        )}
                }

        {onglet === "PROBLEMES" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 space-y-2">
              <p className="font-black text-[13px]">➕ Signaler un problème</p>
              <input value={formProb.type} onChange={e => setFormProb({ ...formProb, type: e.target.value })} placeholder="Type Ex: Boutique fausse photo" className={inputCls} />
              <input value={formProb.qui} onChange={e => setFormProb({ ...formProb, qui: e.target.value })} placeholder="Qui ? Ex: Shop Lemba" className={inputCls} />
              <input value={formProb.detail} onChange={e => setFormProb({ ...formProb, detail: e.target.value })} placeholder="Détail" className={inputCls} />
              <select value={formProb.urgence} onChange={e => setFormProb({ ...formProb, urgence: e.target.value })} className={inputCls}><option>NORMALE</option><option>URGENTE</option><option>CRITIQUE</option></select>
              <button onClick={ajouterProbleme} className="w-full bg-red-600 text-white py-3 rounded-full font-black text-[12px]">🚨 Signaler + Alerter si URGENTE/CRITIQUE</button>
            </div>
            <button onClick={tester} className="w-full bg-red-600 text-white py-3 rounded-full font-black text-[12px]">📱 TESTER ALERTE</button>
            {problemes.map(p => (
              <div key={p.id} className="bg-white border rounded-2xl p-4">
                <p className="font-black text-[13px]">{p.type} • <span className={`px-2 py-0.5 rounded-full text-[10px] ${p.urgence === "CRITIQUE" ? "bg-red-600 text-white" : p.urgence === "URGENTE" ? "bg-orange-500 text-white" : "bg-gray-100"}`}>{p.urgence}</span></p>
                <p className="text-[11px] text-gray-500">{p.qui} • {p.code} • {p.statut}</p>
                <p className="text-[13px] mt-1">{p.detail}</p>
                {p.statut === "OUVERT" ? <button onClick={() => resoudre(p.id)} className="w-full bg-black text-white py-2.5 rounded-full text-[11px] font-black mt-2">✅ Marquer Résolu</button> : <p className="text-[11px] text-green-600 font-bold mt-2">✅ Résolu</p>}
              </div>
            ))}
          </div>
        )}

        {onglet === "PAIEMENTS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 space-y-2">
              <p className="font-black text-[13px]">➕ Nouveau paiement</p>
              <input value={formPay.qui} onChange={e => setFormPay({ ...formPay, qui: e.target.value })} placeholder="Qui ? Ex: Boutique Mama Grace" className={inputCls} />
              <select value={formPay.type} onChange={e => setFormPay({ ...formPay, type: e.target.value })} className={inputCls}><option>Abonnement Boutique</option><option>Ticket Tombola</option><option>Autre</option></select>
              <input value={formPay.montant} onChange={e => setFormPay({ ...formPay, montant: e.target.value })} type="number" placeholder="Montant CDF" className={inputCls} />
              <select value={formPay.methode} onChange={e => setFormPay({ ...formPay, methode: e.target.value })} className={inputCls}><option>Orange Money</option><option>M-Pesa</option><option>Airtel Money</option><option>Espèces</option></select>
              <button onClick={ajouterPaiement} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px]">💰 Ajouter Paiement</button>
            </div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">Total PAYÉ : {totalPaye.toLocaleString()} CDF</p><p className="text-[11px] text-gray-500">En attente : {paiements.filter(p => p.statut === "EN_ATTENTE").reduce((s, p) => s + p.montant, 0).toLocaleString()} CDF • Échoué : {paiements.filter(p => p.statut === "ÉCHOUÉ").reduce((s, p) => s + p.montant, 0).toLocaleString()} CDF</p></div>
            {paiements.map(p => (
              <div key={p.id} className="bg-white border rounded-2xl p-4">
                <p className="font-black text-[13px]">{p.qui} - {p.montant.toLocaleString()} CDF</p>
                <p className="text-[11px] text-gray-500">{p.type} • {p.methode} • {p.statut}</p>
                {p.statut !== "PAYÉ" ? <button onClick={() => validerPay(p.id)} className="w-full bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black mt-2">✅ Valider PAYÉ</button> : <p className="text-[11px] text-green-600 font-bold mt-2">✅ Payé</p>}
              </div>
            ))}
          </div>
        )}

        {onglet === "ALERTES" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black text-[14px]">📱 Historique des alertes</p><p className="text-[11px] opacity-70 mt-1">Telegram passe uniquement par /api/alerte. Secret : {secret ? "✅ configuré" : "⚠️ vide"}</p></div>
            <button onClick={tester} className="w-full bg-[#FF6B00] text-white py-3.5 rounded-full font-black text-[12px]">📱 TESTER MAINTENANT</button>
            {dernier && <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3"><p className="text-[12px] font-bold">Dernier test : {dernier}</p></div>}
            {alertes.length === 0 && <div className="bg-white border rounded-2xl p-4 text-center"><p className="text-[12px] text-gray-500">Aucune alerte. Clique sur TESTER.</p></div>}
            {alertes.map(a => <div key={a.id} className="bg-white border rounded-2xl p-3"><p className="font-black text-[12px]">{a.titre}</p><p className="text-[11px] text-gray-500">{a.heure} • {a.urgence}</p><p className="text-[11px] font-bold mt-1">{a.resultat}</p></div>)}
          </div>
        )}

        {onglet === "LIENS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🔗 Liens rapides</p><p className="text-[11px] text-gray-500 mt-1">Partage ces liens à tes superviseurs / ambassadeurs.</p></div>
            {[
              { label: "🏠 Accueil Public", href: "/" },
              { label: "👑 DG Privé (cette page)", href: "/dg-prive" },
              { label: "📱 WhatsApp DG", href: `https://wa.me/${designPub.whats.replace(/[^0-9]/g, "")}` },
            ].map(l => (
              <div key={l.label} className="bg-white border rounded-2xl p-4 flex justify-between items-center">
                <p className="font-bold text-[13px]">{l.label}</p>
                <div className="flex gap-2">
                  <a href={l.href} className="bg-black text-white px-3 py-2 rounded-full text-[11px] font-black">Ouvrir</a>
                  <button onClick={async () => { try { await navigator.clipboard.writeText(window.location.origin + l.href); showToast("✅ Lien copié"); } catch {} }} className="bg-gray-100 px-3 py-2 rounded-full text-[11px] font-black">Copier</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet === "CARTE" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🗺️ Carte par Commune</p><p className="text-[11px] text-gray-500">Répartition de tes membres à Kinshasa.</p></div>
            {Array.from(new Set(membres.map(m => m.commune))).map(c => {
              const list = membres.filter(m => m.commune === c);
              return <div key={c} className="bg-white border rounded-2xl p-4 flex justify-between"><p className="font-bold text-[13px]">{c}</p><p className="text-[12px]">{list.length} membre(s) • {list.filter(m => m.statut === "ACTIF").length} actifs</p></div>;
            })}
          </div>
        )}
            }

        {onglet === "DESIGN" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 space-y-2">
              <p className="font-black">🎨 Design PUBLIC (ce que le client voit)</p>
              <input value={designPub.title} onChange={e => setDesignPub({ ...designPub, title: e.target.value })} placeholder="Titre public" className={inputCls} />
              <input value={designPub.slogan} onChange={e => setDesignPub({ ...designPub, slogan: e.target.value })} placeholder="Slogan" className={inputCls} />
              <input value={designPub.about} onChange={e => setDesignPub({ ...designPub, about: e.target.value })} placeholder="À propos" className={inputCls} />
              <input value={designPub.whats} onChange={e => setDesignPub({ ...designPub, whats: e.target.value })} placeholder="WhatsApp public" className={inputCls} />
              <input value={designPub.logo} onChange={e => setDesignPub({ ...designPub, logo: e.target.value })} placeholder="Logo (URL image)" className={inputCls} />
              <div className="flex gap-2"><div className="flex-1"><p className="text-[11px]">Couleur principale</p><input type="color" value={designPub.main} onChange={e => setDesignPub({ ...designPub, main: e.target.value })} className="w-full h-10" /></div><div className="flex-1"><p className="text-[11px]">Couleur boutons</p><input type="color" value={designPub.btn} onChange={e => setDesignPub({ ...designPub, btn: e.target.value })} className="w-full h-10" /></div></div>
              <div className="flex gap-2"><button onClick={() => setDesignPub({ ...designPub, showAmb: !designPub.showAmb })} className="flex-1 bg-gray-100 py-2.5 rounded-full text-[11px] font-black">{designPub.showAmb ? "✅ Bouton Ambassadeur ON" : "❌ Bouton Ambassadeur OFF"}</button><button onClick={() => setDesignPub({ ...designPub, maintenance: !designPub.maintenance })} className="flex-1 bg-gray-100 py-2.5 rounded-full text-[11px] font-black">{designPub.maintenance ? "🚧 Maintenance ON" : "✅ Maintenance OFF"}</button></div>
              <p className="text-[11px] text-green-600 font-bold">✅ Sauvegarde automatique (localStorage)</p>
            </div>
            <div className="bg-white border rounded-2xl p-4 space-y-2">
              <p className="font-black">👑 Design PRIVÉ (ton tableau DG)</p>
              <input value={designPrive.adminName} onChange={e => setDesignPrive({ ...designPrive, adminName: e.target.value })} placeholder="Nom admin" className={inputCls} />
              <div className="flex gap-2"><div className="flex-1"><p className="text-[11px]">Header</p><input type="color" value={designPrive.hdr} onChange={e => setDesignPrive({ ...designPrive, hdr: e.target.value })} className="w-full h-10" /></div><div className="flex-1"><p className="text-[11px]">Boutons</p><input type="color" value={designPrive.btn} onChange={e => setDesignPrive({ ...designPrive, btn: e.target.value })} className="w-full h-10" /></div><div className="flex-1"><p className="text-[11px]">Fond</p><input type="color" value={designPrive.bg} onChange={e => setDesignPrive({ ...designPrive, bg: e.target.value })} className="w-full h-10" /></div></div>
            </div>
          </div>
        )}

        {onglet === "PARAMETRES" && (
          <div className="space-y-3">
            <div className={`border rounded-2xl p-4 ${secret ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}><p className="font-black text-[13px]">{secret ? "✅ SECRET configuré" : "⚠️ SECRET vide - mode test"}</p><p className="text-[11px] text-gray-600">{secret ? "Ton /api/alerte est protégé anti-spam." : "Mets le même secret dans Vercel (ALERTE_SECRET) et ici."}</p></div>
            <div className="bg-white border rounded-2xl p-4 space-y-2">
              <p className="font-black">🔒 Changer PIN (ancien PIN obligatoire)</p>
              <p className="text-[11px] text-gray-500">Le PIN n'est jamais affiché. Il faut connaître l'ancien pour le changer.</p>
              <input value={pinForm.ancien} onChange={e => setPinForm({ ...pinForm, ancien: e.target.value })} type="password" inputMode="numeric" placeholder="Ancien PIN" className={inputCls} />
              <input value={pinForm.nouveau} onChange={e => setPinForm({ ...pinForm, nouveau: e.target.value })} type="password" inputMode="numeric" placeholder="Nouveau PIN (min 4 chiffres)" className={inputCls} />
              <input value={pinForm.confirm} onChange={e => setPinForm({ ...pinForm, confirm: e.target.value })} type="password" inputMode="numeric" placeholder="Confirme nouveau PIN" className={inputCls} />
              <button onClick={changerPIN} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px]">🔒 Changer le PIN</button>
            </div>
            <div className="bg-white border rounded-2xl p-4 space-y-2">
              <p className="font-black">🔑 SECRET Telegram - Anti-spam</p>
              <p className="text-[11px] text-gray-500">Mets EXACTEMENT le même mot dans Vercel &gt; ALERTE_SECRET et ici. TOKEN + CHAT_ID restent dans Vercel, jamais dans l'app.</p>
              <input value={secret} onChange={e => setSecret(e.target.value)} placeholder="ALERTE_SECRET Ex: wenze-dg-2026-change-moi" className={inputCls} />
              <button onClick={() => showToast("✅ SECRET sauvegardé. Vérifie que c’est le même dans Vercel, puis Redeploy.")} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px]">💾 Sauvegarder SECRET</button>
              <p className="text-[11px] text-gray-500">Pour tester vite : vide ce champ + laisse ALERTE_SECRET vide dans Vercel.</p>
            </div>
            <div className="bg-white border rounded-2xl p-4 space-y-2">
              <p className="font-black">💾 Sauvegarde / Restauration</p>
              <p className="text-[11px] text-gray-500">Export JSON = vraie sauvegarde. Garde le fichier dans WhatsApp / Drive.</p>
              <button onClick={exportJSON} className="w-full py-3 rounded-full font-black text-[12px] text-white" style={{ background: designPrive.btn }}>💾 Télécharger Backup JSON</button>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={5} placeholder="Colle ici le JSON du backup pour restaurer..." className="w-full border rounded-xl px-3 py-3 text-[12px] outline-none" />
              <button onClick={importJSON} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px]">📥 Restaurer depuis JSON</button>
              <button onClick={() => { if (confirm("DG, EFFACER TOUT ?")) { if (prompt("Tape EFFACER pour confirmer") !== "EFFACER") return; localStorage.removeItem("wenze_dg_data"); location.reload(); } }} className="w-full bg-red-600 text-white py-3 rounded-full font-black text-[12px]">🗑️ TOUT EFFACER (DG seulement)</button>
            </div>
          </div>
        )}

        {onglet === "RAPPORTS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 space-y-1">
              <p className="font-black">📊 Rapport DG - {new Date().toLocaleDateString("fr-CD")}</p>
              <p className="text-[13px]">Membres total : <b>{membres.length}</b> • Superviseurs : {sup.length} • Ambassadeurs : {amb.length}</p>
              <p className="text-[13px]">Actifs : {membres.filter(m => m.statut === "ACTIF").length} • En attente : {enAtt.length} • Suspendus : {membres.filter(m => m.statut === "SUSPENDU").length}</p>
              <p className="text-[13px]">Problèmes ouverts : {probOuverts} / {problemes.length} • CRITIQUE ouverts : {anomalies}</p>
              <p className="text-[13px]">Total PAYÉ : <b>{totalPaye.toLocaleString()} CDF</b> • Gains : <b>{totalGains.toLocaleString()} CDF</b> • Boutiques : <b>{totalBout}</b></p>
              <button onClick={copierRapport} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">📋 Copier Rapport pour WhatsApp</button>
            </div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">Par Province</p>{Array.from(new Set(membres.map(m => m.province))).map(pr => <p key={pr} className="text-[13px]">{pr} : {membres.filter(m => m.province === pr).length} membre(s)</p>)}</div>
          </div>
        )}
      </div>
    </div>
  );
                                                                                                     }
