"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ==========================================
// TYPES - WENZE - TON CODE GARDÉ + V5 PRO
// ==========================================
type Role = "DG" | "SUPERVISEUR" | "AMBASSADEUR";
type Statut = "ACTIF" | "SUSPENDU" | "EN_ATTENTE";
type Membre = {
  id: string; nom: string; telephone: string; role: Role; zone: string; statut: Statut;
  filleuls?: number; boutiquesValidees?: number; gains?: number; dateInscription: string;
  codePro: string; chefCode?: string; province: string; commune: string; village: string;
};
type Probleme = { id: string; type: string; qui: string; code: string; detail: string; urgence: "NORMALE" | "URGENTE" | "CRITIQUE"; statut: "OUVERT" | "RESOLU" };
type Paiement = { id: string; qui: string; type: string; montant: number; methode: string; statut: "PAYÉ" | "EN_ATTENTE" | "ÉCHOUÉ" };
// V5 PRO - Historique des alertes envoyées sur téléphone
type AlerteEnvoyee = { id: string; heure: string; titre: string; urgence: string; canal: string; statut: string };

const MEMBRES_INITIAUX: Membre[] = [
  { id: "SUP-01", nom: "Grace Mbuyi", telephone: "+243 810 000 001", role: "SUPERVISEUR", zone: "Gombe", statut: "ACTIF", boutiquesValidees: 12, dateInscription: "2026-10-01", codePro: "SUP-GOM-2026-014", chefCode: "DG", province: "Kinshasa", commune: "Gombe", village: "Gombe Centre" },
  { id: "SUP-02", nom: "Kevin Kongolo", telephone: "+243 810 000 002", role: "SUPERVISEUR", zone: "Lemba", statut: "EN_ATTENTE", boutiquesValidees: 0, dateInscription: "2026-11-08", codePro: "SUP-LEM-2026-021", chefCode: "DG", province: "Kinshasa", commune: "Lemba", village: "Lemba" },
  { id: "SUP-03", nom: "Sarah Nsimba", telephone: "+243 810 000 003", role: "SUPERVISEUR", zone: "Ngaliema", statut: "SUSPENDU", boutiquesValidees: 3, dateInscription: "2026-09-15", codePro: "SUP-NGA-2026-033", chefCode: "DG", province: "Kinshasa", commune: "Ngaliema", village: "Ngaliema" },
  { id: "AMB-01", nom: "Joel Kabongo", telephone: "+243 810 000 011", role: "AMBASSADEUR", zone: "Kintambo", statut: "ACTIF", filleuls: 18, gains: 45000, dateInscription: "2026-10-05", codePro: "AMB-JOE-2026-077", chefCode: "SUP-GOM-2026-014", province: "Kinshasa", commune: "Kintambo", village: "Kintambo" },
  { id: "AMB-02", nom: "Mireille Tshiala", telephone: "+243 810 000 012", role: "AMBASSADEUR", zone: "Masina", statut: "ACTIF", filleuls: 24, gains: 62000, dateInscription: "2026-10-02", codePro: "AMB-MIR-2026-087", chefCode: "SUP-GOM-2026-014", province: "Kinshasa", commune: "Masina", village: "Masina" },
  { id: "AMB-03", nom: "David Ilunga", telephone: "+243 810 000 013", role: "AMBASSADEUR", zone: "Bandal", statut: "EN_ATTENTE", filleuls: 0, gains: 0, dateInscription: "2026-11-10", codePro: "AMB-DAV-2026-045", chefCode: "SUP-LEM-2026-021", province: "Kinshasa", commune: "Bandal", village: "Bandal" },
];

export default function DashboardDG() {
  // ===== V5 PRO - VERROU DG =====
  const [deverrouille, setDeverrouille] = useState(false);
  const [pin, setPin] = useState("");
  const [codePinDG, setCodePinDG] = useState("2026");

  const [membres, setMembres] = useState<Membre[]>(MEMBRES_INITIAUX);
  const [onglet, setOnglet] = useState<"DASH" | "MEMBRES" | "LIENS" | "CARTE" | "PAIEMENTS" | "TICKETS" | "PROBLEMES" | "DESIGN" | "PARAMETRES" | "RAPPORTS" | "ALERTES">("DASH");
  const [filtreRole, setFiltreRole] = useState<"TOUS" | "SUPERVISEUR" | "AMBASSADEUR">("TOUS");
  const [recherche, setRecherche] = useState("");
  const [filtreProvince, setFiltreProvince] = useState("TOUT PAYS");
  const [periodeRapport, setPeriodeRapport] = useState<"JOUR" | "SEMAINE" | "MOIS">("JOUR");
  const [toast, setToast] = useState("");
  const [membreDetail, setMembreDetail] = useState<Membre | null>(null);
  const [nouveauMembre, setNouveauMembre] = useState({ nom: "", telephone: "", role: "SUPERVISEUR" as Role, zone: "" });
  const [params, setParams] = useState({ commissionAmb: 20, dureeCommissionMois: 1, prixTicketBoutique: 50000, prixTicketClient: 20000, inscriptionOuverte: true, tombolaActive: true, paiementMobileMoney: true });
  const [design, setDesign] = useState({ couleurPrincipale: "#FF6B00", fondPublic: "#FFFBF0", nomApp: "WENZE", slogan: "Achetez, Gagnez, Partagez", banniere: "🎉 GRAND TIRAGE - Gagnez 500 000 CDF" });

  // ===== V5 PRO - ALERTES TELEPHONE =====
  const [alertes, setAlertes] = useState<AlerteEnvoyee[]>([]);
  const [alerteActive, setAlerteActive] = useState(true);
  const [sonActif, setSonActif] = useState(true);
  const alertesDejaEnvoyees = useRef<Set<string>>(new Set());
  const [testEnCours, setTestEnCours] = useState(false);

  const [problemes, setProblemes] = useState<Probleme[]>([
    { id: "P-01", type: "Boutique fausse photo", qui: "Shop Lemba Fashion", code: "AMB-DAV-2026-045", detail: "Photo floue, pas de vitrine, signalé par SUP-GOM-2026-014", urgence: "URGENTE", statut: "OUVERT" },
    { id: "P-02", type: "Ambassadeur inactif", qui: "David Ilunga", code: "AMB-DAV-2026-045", detail: "Aucun travail depuis 5 jours, signalé par SUP-LEM-2026-021", urgence: "NORMALE", statut: "OUVERT" },
    { id: "P-03", type: "Paiement échoué", qui: "Client Joel K.", code: "AMB-MIR-2026-087", detail: "Paiement Mobile Money 30 000 CDF échoué, ticket non délivré", urgence: "CRITIQUE", statut: "OUVERT" },
  ]);
  const [paiements, setPaiements] = useState<Paiement[]>([
    { id: "PAY-01", qui: "Boutique Mama Grace", type: "Abonnement Boutique", montant: 50000, methode: "Orange Money", statut: "PAYÉ" },
    { id: "PAY-02", qui: "Client Joel K.", type: "Ticket Tombola", montant: 30000, methode: "M-Pesa", statut: "EN_ATTENTE" },
    { id: "PAY-03", qui: "Shop Lemba Fashion", type: "Abonnement Boutique", montant: 50000, methode: "Airtel Money", statut: "PAYÉ" },
    { id: "PAY-04", qui: "Client Sarah N.", type: "Ticket Tombola", montant: 20000, methode: "Orange Money", statut: "ÉCHOUÉ" },
  ]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  // ===== V5 PRO - FONCTION ALERTE CENTRALE =====
  const envoyerAlerteDG = async (titre: string, detail: string, urgence: "NORMALE" | "URGENTE" | "CRITIQUE", qui: string, cleAntiSpam?: string) => {
    if (!alerteActive) return;
    // Anti-spam : même problème = 1 seule alerte
    if (cleAntiSpam && alertesDejaEnvoyees.current.has(cleAntiSpam)) return;
    if (cleAntiSpam) alertesDejaEnvoyees.current.add(cleAntiSpam);

    // 1. Son + Vibration si tu es sur la page
    if (sonActif && urgence === "CRITIQUE") {
      try {
        if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
        const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3");
        audio.play().catch(() => {});
      } catch {}
    }
    // 2. Envoi vrai sur téléphone via API
    try {
      await fetch("/api/alerte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titre, detail, urgence, qui }) });
    } catch {}
    // 3. Historique dans l'onglet ALERTES
    setAlertes(p => [{ id: `A-${Date.now()}`, heure: new Date().toLocaleTimeString("fr-CD", { hour: "2-digit", minute: "2-digit" }), titre, urgence, canal: urgence === "CRITIQUE" ? "Telegram + Gmail" : "Telegram", statut: "Envoyée" }, ...p].slice(0, 30));
  };

  // V5 PRO - Auto-alerte dès qu'un CRITIQUE / URGENT apparaît
  useEffect(() => {
    problemes.filter(p => p.statut === "OUVERT" && p.urgence !== "NORMALE").forEach(p => {
      envoyerAlerteDG(p.type, p.detail, p.urgence, p.qui, `auto-${p.id}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemes]);

  // V5 PRO - Tester l'alerte sur ton téléphone
  const testerAlerte = async () => {
    setTestEnCours(true);
    await envoyerAlerteDG("TEST - Alerte WENZE", "Si tu reçois ce message sur Telegram, ton système marche !", "CRITIQUE", "DG - Test");
    showToast("📱 Alerte test envoyée ! Regarde ton Telegram.");
    setTimeout(() => setTestEnCours(false), 2000);
  };

  // --- STATS - TON CODE GARDÉ ---
  const superviseurs = membres.filter((m) => m.role === "SUPERVISEUR");
  const ambassadeurs = membres.filter((m) => m.role === "AMBASSADEUR");
  const enAttente = membres.filter((m) => m.statut === "EN_ATTENTE");
  const totalGains = ambassadeurs.reduce((s, m) => s + (m.gains || 0), 0);
  const totalBoutiques = superviseurs.reduce((s, m) => s + (m.boutiquesValidees || 0), 0);
  const totalPaye = paiements.filter(p => p.statut === "PAYÉ").reduce((s, p) => s + p.montant, 0);
  const totalAttentePaye = paiements.filter(p => p.statut === "EN_ATTENTE").reduce((s, p) => s + p.montant, 0);
  const problemesOuverts = problemes.filter(p => p.statut === "OUVERT").length;
  const anomalies = problemes.filter(p => p.urgence === "CRITIQUE" && p.statut === "OUVERT").length;

  const membresFiltres = membres.filter((m) => {
    const matchOnglet = filtreRole === "TOUS" || m.role === filtreRole;
    const matchRecherche = m.nom.toLowerCase().includes(recherche.toLowerCase()) || m.zone.toLowerCase().includes(recherche.toLowerCase()) || m.codePro.toLowerCase().includes(recherche.toLowerCase());
    const matchProvince = filtreProvince === "TOUT PAYS" || m.province === filtreProvince;
    return matchOnglet && matchRecherche && matchProvince;
  });

  // --- ACTIONS DG - TON CODE GARDÉ + ALERTE SUR ACTIONS IMPORTANTES ---
  const changerStatut = (id: string, nouveauStatut: Statut) => { setMembres((prev) => prev.map((m) => (m.id === id ? { ...m, statut: nouveauStatut } : m))); showToast(nouveauStatut === "ACTIF" ? "✅ Membre validé / réactivé." : nouveauStatut === "SUSPENDU" ? "⏸️ Membre suspendu par le DG." : "Statut changé."); };
  const supprimerMembre = (id: string) => { if (confirm("DG, tu es sûr de vouloir supprimer ce membre ? Cette action est définitive.")) { setMembres((prev) => prev.filter((m) => m.id !== id)); showToast("🗑️ Membre supprimé par le DG."); } };
  const creerMembre = () => {
    if (!nouveauMembre.nom || nouveauMembre.telephone.length < 9) return showToast("Nom + WhatsApp obligatoires.");
    const prefix = nouveauMembre.role === "SUPERVISEUR" ? "SUP" : "AMB";
    const code = `${prefix}-${nouveauMembre.nom.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setMembres(p => [...p, { id: `${prefix}-${Date.now()}`, nom: nouveauMembre.nom, telephone: nouveauMembre.telephone, role: nouveauMembre.role, zone: nouveauMembre.zone || "Gombe", statut: "ACTIF", filleuls: 0, boutiquesValidees: 0, gains: 0, dateInscription: "Aujourd'hui", codePro: code, chefCode: "DG", province: "Kinshasa", commune: nouveauMembre.zone || "Gombe", village: nouveauMembre.zone || "Gombe" }]);
    showToast(`✅ ${nouveauMembre.role} ${nouveauMembre.nom} créé par le DG. Son code pro : ${code}.`);
    setNouveauMembre({ nom: "", telephone: "", role: "SUPERVISEUR", zone: "" });
  };
  const resoudreProbleme = (id: string) => { setProblemes(p => p.map(x => x.id === id ? { ...x, statut: "RESOLU" } : x)); showToast("✅ Problème résolu par le DG."); };
  const validerPaiement = (id: string) => { setPaiements(p => p.map(x => x.id === id ? { ...x, statut: "PAYÉ" } : x)); showToast("✅ Paiement validé. Ticket / Abonnement délivré."); };
  const deplacerAmbassadeur = (amb: Membre) => {
    const nouveauSup = prompt(`Déplacer ${amb.nom} (${amb.codePro}) vers quel Superviseur ? Tape le code SUP, ex: SUP-GOM-2026-014`);
    if (!nouveauSup) return;
    setMembres(p => p.map(m => m.id === amb.id ? { ...m, chefCode: nouveauSup } : m));
    showToast(`🔀 ${amb.nom} déplacé vers ${nouveauSup}. Seul le DG peut déplacer.`);
  };

  // ===== V5 PRO - ECRAN VERROUILLÉ =====
  if (!deverrouille) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <p className="text-[11px] opacity-70">WENZE • ESPACE PRIVÉ DG</p>
        <p className="text-[40px] mt-4">👑</p>
        <h1 className="font-black text-[20px] mt-2 text-center">Tableau de bord DG</h1>
        <p className="text-[12px] opacity-70 mt-1 text-center">Entre ton code PIN pour entrer. Seul le DG connaît ce code.</p>
        <input value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && (pin === codePinDG ? setDeverrouille(true) : showToast("❌ Code faux"))} type="password" inputMode="numeric" placeholder="••••" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 text-center text-[22px] tracking-[10px] outline-none mt-6" />
        <button onClick={() => pin === codePinDG ? setDeverrouille(true) : showToast("❌ Code faux, essaie encore.")} className="w-full bg-[#FF6B00] py-4 rounded-full font-black text-[13px] mt-3">🔓 Déverrouiller</button>
        <p className="text-[10px] opacity-50 mt-3">Code par défaut : 2026 - Change-le dans Paramètres</p>
        {toast && <div className="fixed top-4 left-4 right-4 bg-white text-black p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] pb-20">
      {toast && <div className="fixed top-4 left-4 right-4 z-50 max-w-[450px] mx-auto bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center shadow-lg">{toast}</div>}

      {/* HEADER DG - TON CODE + V5 PRO ALERTE */}
      <div className="bg-black text-white p-5 pt-10 rounded-b-[28px]">
        <div className="flex justify-between items-start">
          <div><p className="text-[11px] opacity-70">WENZE • ESPACE PRIVÉ</p><h1 className="font-black text-[20px] mt-1">👑 Tableau de bord DG</h1><p className="text-[12px] opacity-80 mt-1">Bonjour Directeur Général. Tu contrôles toute l'équipe ici.</p></div>
          <div className="flex flex-col gap-2 items-end">
            <Link href="/" className="text-[11px] bg-white text-black px-3 py-1.5 rounded-full font-bold">← Accueil</Link>
            <button onClick={() => setDeverrouille(false)} className="text-[11px] bg-white/10 px-3 py-1.5 rounded-full font-bold">🔒 Verrouiller</button>
          </div>
        </div>

        {/* V5 PRO - PANNEAU ALERTE TELEPHONE */}
        <div className="bg-white/10 rounded-2xl p-3 mt-3">
          <div className="flex justify-between items-center"><p className="font-black text-[12px]">📱 Alertes téléphone : {alerteActive ? "✅ ON" : "❌ OFF"}</p><button onClick={() => setAlerteActive(!alerteActive)} className={`text-[11px] font-black px-3 py-1.5 rounded-full ${alerteActive ? "bg-green-500" : "bg-red-500"}`}>{alerteActive ? "Désactiver" : "Activer"}</button></div>
          <p className="text-[11px] opacity-80 mt-1">Telegram @wenze_alerte_bot + Gmail pour CRITIQUE. Son : {sonActif ? "ON" : "OFF"}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={testerAlerte} disabled={testEnCours} className="flex-1 bg-[#FF6B00] py-2.5 rounded-full text-[11px] font-black">{testEnCours ? "Envoi..." : "📱 TESTER L'ALERTE"}</button>
            <button onClick={() => { setSonActif(!sonActif); showToast(sonActif ? "🔕 Son désactivé" : "🔔 Son activé"); }} className="px-3 bg-white/20 py-2.5 rounded-full text-[11px] font-black">{sonActif ? "🔔 Son ON" : "🔕 Son OFF"}</button>
            <button onClick={() => setOnglet("ALERTES")} className="px-3 bg-white/20 py-2.5 rounded-full text-[11px] font-black">Historique →</button>
          </div>
        </div>

        {anomalies > 0 && <button onClick={() => setOnglet("PROBLEMES")} className="w-full bg-red-600 text-white p-3 rounded-2xl mt-3 text-left animate-pulse"><p className="font-black text-[12px]">🚨 ALERTE : {anomalies} anomalie(s) CRITIQUE(s) !</p><p className="text-[11px] opacity-90">Clique pour résoudre maintenant. Alerte déjà envoyée sur ton téléphone.</p></button>}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-white/10 rounded-2xl p-2.5 text-center"><p className="font-black text-[14px]">{totalPaye.toLocaleString()}</p><p className="text-[9px] opacity-80">CDF Payés</p></div>
          <div className="bg-white/10 rounded-2xl p-2.5 text-center"><p className="font-black text-[14px] text-red-300">{problemesOuverts}</p><p className="text-[9px] opacity-80">Problèmes</p></div>
          <div className="bg-white/10 rounded-2xl p-2.5 text-center"><p className="font-black text-[14px]">{superviseurs.length}</p><p className="text-[9px] opacity-80">Superviseurs</p></div>
          <div className="bg-white/10 rounded-2xl p-2.5 text-center"><p className="font-black text-[14px]">{ambassadeurs.length}</p><p className="text-[9px] opacity-80">Ambassadeurs</p></div>
        </div>
      </div>

      {/* ONGLETS - TON CODE + ALERTES */}
      <div className="flex gap-1.5 px-3 mt-3 overflow-x-auto pb-1">
        {(["DASH", "MEMBRES", "LIENS", "CARTE", "PAIEMENTS", "TICKETS", "PROBLEMES", "ALERTES", "DESIGN", "PARAMETRES", "RAPPORTS"] as const).map(t => (
          <button key={t} onClick={() => setOnglet(t)} className={`whitespace-nowrap px-3 py-2.5 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>
            {t === "DASH" ? "🏠 Dash" : t === "MEMBRES" ? "👥 Membres" : t === "LIENS" ? "🔗 Liens" : t === "CARTE" ? "🗺️ Carte" : t === "PAIEMENTS" ? "💰 Paiements" : t === "TICKETS" ? "🎟️ Tickets" : t === "PROBLEMES" ? `🚨 Problèmes${problemesOuverts > 0 ? ` (${problemesOuverts})` : ""}` : t === "ALERTES" ? `📱 Alertes${alertes.length > 0 ? ` (${alertes.length})` : ""}` : t === "DESIGN" ? "🎨 Design" : t === "PARAMETRES" ? "⚙️ Paramètres" : "📊 Rapports"}
          </button>
        ))}
      </div>

      <div className="px-4 mt-3">
        {/* V5 PRO - ONGLET ALERTES */}
        {onglet === "ALERTES" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black text-[14px]">📱 Historique des alertes téléphone</p><p className="text-[11px] opacity-70 mt-1">Chaque alerte CRITIQUE / URGENTE envoyée sur ton Telegram + Gmail apparaît ici.</p></div>
            <button onClick={testerAlerte} className="w-full bg-[#FF6B00] text-white py-3.5 rounded-full font-black text-[12px]">📱 TESTER MAINTENANT - Vérifie ton Telegram</button>
            {alertes.length === 0 && <div className="bg-white border rounded-2xl p-4 text-center"><p className="text-[12px] text-gray-500">Aucune alerte envoyée pour le moment.<br/>Clique sur TESTER pour vérifier ton téléphone.</p></div>}
            {alertes.map(a => (
              <div key={a.id} className="bg-white border rounded-2xl p-3 flex justify-between items-center">
                <div><p className="font-black text-[12px]">{a.titre}</p><p className="text-[11px] text-gray-500">{a.canal} • {a.heure}</p></div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-black ${a.urgence === "CRITIQUE" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{a.urgence}</span>
              </div>
            ))}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3"><p className="text-[11px] font-bold">⚙️ Comment ça marche ?</p><p className="text-[11px] text-gray-600 mt-1">1. CRITIQUE = Telegram + Gmail + Son + Vibration<br/>2. URGENTE = Telegram seulement<br/>3. NORMALE = Pas d'alerte téléphone, juste dans le tableau.</p></div>
          </div>
        )}

        {/* ============ DASH - TON CODE GARDÉ ============ */}
        {onglet === "DASH" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-3 shadow-sm border"><p className="text-[11px] text-gray-500">Superviseurs</p><p className="font-black text-[22px]">{superviseurs.length}</p><p className="text-[11px] text-green-600">{superviseurs.filter(m => m.statut === "ACTIF").length} actifs</p></div>
              <div className="bg-white rounded-2xl p-3 shadow-sm border"><p className="tex
