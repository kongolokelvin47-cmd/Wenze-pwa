"use client";
import { useState } from "react";
import Link from "next/link";

type Role = "DG" | "SUPERVISEUR" | "AMBASSADEUR";
type Statut = "ACTIF" | "SUSPENDU" | "EN_ATTENTE";
type Membre = { id: string; nom: string; telephone: string; role: Role; zone: string; statut: Statut; filleuls?: number; boutiquesValidees?: number; gains?: number; dateInscription: string; codePro: string; chefCode?: string; province: string; commune: string; village: string };
type Probleme = { id: string; type: string; qui: string; code: string; detail: string; urgence: "NORMALE" | "URGENTE" | "CRITIQUE"; statut: "OUVERT" | "RESOLU" };
type Paiement = { id: string; qui: string; type: string; montant: number; methode: string; statut: "PAYÉ" | "EN_ATTENTE" | "ÉCHOUÉ" };
type Alerte = { id: string; heure: string; titre: string; urgence: string; resultat: string };

const MEMBRES0: Membre[] = [
  { id: "SUP-01", nom: "Grace Mbuyi", telephone: "+243810000001", role: "SUPERVISEUR", zone: "Gombe", statut: "ACTIF", boutiquesValidees: 12, dateInscription: "2026-10-01", codePro: "SUP-GOM-2026-014", chefCode: "DG", province: "Kinshasa", commune: "Gombe", village: "Gombe Centre" },
  { id: "SUP-02", nom: "Kevin Kongolo", telephone: "+243810000002", role: "SUPERVISEUR", zone: "Lemba", statut: "EN_ATTENTE", boutiquesValidees: 0, dateInscription: "2026-11-08", codePro: "SUP-LEM-2026-021", chefCode: "DG", province: "Kinshasa", commune: "Lemba", village: "Lemba" },
  { id: "SUP-03", nom: "Sarah Nsimba", telephone: "+243810000003", role: "SUPERVISEUR", zone: "Ngaliema", statut: "SUSPENDU", boutiquesValidees: 3, dateInscription: "2026-09-15", codePro: "SUP-NGA-2026-033", chefCode: "DG", province: "Kinshasa", commune: "Ngaliema", village: "Ngaliema" },
  { id: "AMB-01", nom: "Joel Kabongo", telephone: "+243810000011", role: "AMBASSADEUR", zone: "Kintambo", statut: "ACTIF", filleuls: 18, gains: 45000, dateInscription: "2026-10-05", codePro: "AMB-JOE-2026-077", chefCode: "SUP-GOM-2026-014", province: "Kinshasa", commune: "Kintambo", village: "Kintambo" },
  { id: "AMB-02", nom: "Mireille Tshiala", telephone: "+243810000012", role: "AMBASSADEUR", zone: "Masina", statut: "ACTIF", filleuls: 24, gains: 62000, dateInscription: "2026-10-02", codePro: "AMB-MIR-2026-087", chefCode: "SUP-GOM-2026-014", province: "Kinshasa", commune: "Masina", village: "Masina" },
  { id: "AMB-03", nom: "David Ilunga", telephone: "+243810000013", role: "AMBASSADEUR", zone: "Bandal", statut: "EN_ATTENTE", filleuls: 0, gains: 0, dateInscription: "2026-11-10", codePro: "AMB-DAV-2026-045", chefCode: "SUP-LEM-2026-021", province: "Kinshasa", commune: "Bandal", village: "Bandal" },
];

export default function DashboardDG() {
  const [deverrouille, setDeverrouille] = useState(false);
  const [pin, setPin] = useState("");
  const [pinDG, setPinDG] = useState("2026");
  const [membres, setMembres] = useState<Membre[]>(MEMBRES0);
  const [onglet, setOnglet] = useState("DASH");
  const [filtreRole, setFiltreRole] = useState("TOUS");
  const [recherche, setRecherche] = useState("");
  const [toast, setToast] = useState("");
  const [nouveau, setNouveau] = useState({ nom: "", telephone: "", role: "SUPERVISEUR", zone: "" });
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [alerteActive, setAlerteActive] = useState(true);
  const [sonActif, setSonActif] = useState(true);
  const [testEnCours, setTestEnCours] = useState(false);
  const [dernier, setDernier] = useState("");
  const [problemes, setProblemes] = useState<Probleme[]>([
    { id: "P-01", type: "Boutique fausse photo", qui: "Shop Lemba Fashion", code: "AMB-DAV-2026-045", detail: "Photo floue, pas de vitrine", urgence: "URGENTE", statut: "OUVERT" },
    { id: "P-02", type: "Ambassadeur inactif", qui: "David Ilunga", code: "AMB-DAV-2026-045", detail: "Aucun travail depuis 5 jours", urgence: "NORMALE", statut: "OUVERT" },
    { id: "P-03", type: "Paiement échoué", qui: "Client Joel K.", code: "AMB-MIR-2026-087", detail: "Paiement 30 000 CDF échoué", urgence: "CRITIQUE", statut: "OUVERT" },
  ]);
  const [paiements, setPaiements] = useState<Paiement[]>([
    { id: "PAY-01", qui: "Boutique Mama Grace", type: "Abonnement Boutique", montant: 50000, methode: "Orange Money", statut: "PAYÉ" },
    { id: "PAY-02", qui: "Client Joel K.", type: "Ticket Tombola", montant: 30000, methode: "M-Pesa", statut: "EN_ATTENTE" },
    { id: "PAY-03", qui: "Shop Lemba Fashion", type: "Abonnement Boutique", montant: 50000, methode: "Airtel Money", statut: "PAYÉ" },
    { id: "PAY-04", qui: "Client Sarah N.", type: "Ticket Tombola", montant: 20000, methode: "Orange Money", statut: "ÉCHOUÉ" },
  ]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };
  const envoyerAlerte = async (titre: string, detail: string, urgence: string, qui: string) => {
    if (!alerteActive) return false;
    if (sonActif && urgence === "CRITIQUE") { try { if (navigator.vibrate) navigator.vibrate([300, 100, 300]); const a = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3"); a.play().catch(() => {}); } catch {} }
    let res = "❌ Échec - Vérifie Vercel";
    try {
      const r = await fetch("/api/alerte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titre, detail, urgence, qui }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) res = "✅ Envoyée sur Telegram"; else res = "❌ " + (d.erreur || "TOKEN ou CHAT_ID manquant dans Vercel");
    } catch { res = "❌ Pas de connexion / API introuvable"; }
    setDernier(res);
    setAlertes(p => [{ id: String(Date.now()), heure: new Date().toLocaleTimeString("fr-CD", { hour: "2-digit", minute: "2-digit" }), titre, urgence, resultat: res }, ...p].slice(0, 30));
    return res.startsWith("✅");
  };
  const tester = async () => { setTestEnCours(true); const ok = await envoyerAlerte("TEST - Alerte WENZE", "Si tu reçois ce message sur Telegram, ton système marche !", "CRITIQUE", "DG - Test"); showToast(ok ? "✅ Alerte envoyée ! Regarde Telegram." : "❌ Échec. Va dans ALERTES."); setTestEnCours(false); };
  const sup = membres.filter(m => m.role === "SUPERVISEUR");
  const amb = membres.filter(m => m.role === "AMBASSADEUR");
  const enAtt = membres.filter(m => m.statut === "EN_ATTENTE");
  const totalPaye = paiements.filter(p => p.statut === "PAYÉ").reduce((s, p) => s + p.montant, 0);
  const totalGains = amb.reduce((s, m) => s + (m.gains || 0), 0);
  const totalBout = sup.reduce((s, m) => s + (m.boutiquesValidees || 0), 0);
  const probOuverts = problemes.filter(p => p.statut === "OUVERT").length;
  const anomalies = problemes.filter(p => p.urgence === "CRITIQUE" && p.statut === "OUVERT").length;
  const filtres = membres.filter(m => (filtreRole === "TOUS" || m.role === filtreRole) && (m.nom.toLowerCase().includes(recherche.toLowerCase()) || m.zone.toLowerCase().includes(recherche.toLowerCase()) || m.codePro.toLowerCase().includes(recherche.toLowerCase())));
  const changer = (id: string, s: Statut) => { setMembres(p => p.map(m => m.id === id ? { ...m, statut: s } : m)); showToast(s === "ACTIF" ? "✅ Membre validé." : "⏸️ Membre suspendu."); };
  const supprimer = (id: string) => { if (confirm("DG, supprimer ce membre ?")) { setMembres(p => p.filter(m => m.id !== id)); showToast("🗑️ Supprimé."); } };
  const creer = () => {
    if (!nouveau.nom || nouveau.telephone.length < 9) return showToast("Nom + WhatsApp obligatoires.");
    const pre = nouveau.role === "SUPERVISEUR" ? "SUP" : "AMB";
    const code = pre + "-" + nouveau.nom.slice(0, 3).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
    setMembres(p => [...p, { id: pre + Date.now(), nom: nouveau.nom, telephone: nouveau.telephone, role: nouveau.role as Role, zone: nouveau.zone || "Gombe", statut: "ACTIF", filleuls: 0, boutiquesValidees: 0, gains: 0, dateInscription: "Aujourd'hui", codePro: code, chefCode: "DG", province: "Kinshasa", commune: nouveau.zone || "Gombe", village: nouveau.zone || "Gombe" }]);
    showToast("✅ Créé. Code : " + code); setNouveau({ nom: "", telephone: "", role: "SUPERVISEUR", zone: "" });
  };
  const resoudre = (id: string) => { setProblemes(p => p.map(x => x.id === id ? { ...x, statut: "RESOLU" } : x)); showToast("✅ Problème résolu."); };
  const validerPay = (id: string) => { setPaiements(p => p.map(x => x.id === id ? { ...x, statut: "PAYÉ" } : x)); showToast("✅ Paiement validé."); };
