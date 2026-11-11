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
    if (!deverrouille) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <p className="text-[11px] opacity-70">WENZE • ESPACE PRIVÉ DG</p>
        <p className="text-[40px] mt-4">👑</p>
        <h1 className="font-black text-[20px] mt-2 text-center">Tableau de bord DG</h1>
        <p className="text-[12px] opacity-70 mt-1 text-center">Entre ton PIN. Seul le DG connaît ce code.</p>
        <input value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && (pin === pinDG ? setDeverrouille(true) : showToast("❌ Code faux"))} type="password" inputMode="numeric" placeholder="••••" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 text-center text-[22px] tracking-[10px] outline-none mt-6" />
        <button onClick={() => pin === pinDG ? setDeverrouille(true) : showToast("❌ Code faux")} className="w-full bg-[#FF6B00] py-4 rounded-full font-black text-[13px] mt-3">🔓 Déverrouiller</button>
        <p className="text-[10px] opacity-50 mt-3">Code par défaut : 2026</p>
        {toast && <div className="fixed top-4 left-4 right-4 bg-white text-black p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div>}
      </div>
    );
  }

  const ONGLETS = ["DASH", "MEMBRES", "PROBLEMES", "PAIEMENTS", "ALERTES", "LIENS", "CARTE", "TICKETS", "DESIGN", "PARAMETRES", "RAPPORTS"];

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] pb-20">
      {toast && <div className="fixed top-4 left-4 right-4 z-50 max-w-[450px] mx-auto bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center shadow-lg">{toast}</div>}
      <div className="bg-black text-white p-5 pt-10 rounded-b-[28px]">
        <div className="flex justify-between items-start">
          <div><p className="text-[11px] opacity-70">WENZE • ESPACE PRIVÉ</p><h1 className="font-black text-[20px] mt-1">👑 Tableau DG</h1><p className="text-[12px] opacity-80 mt-1">Bonjour Directeur Général.</p></div>
          <div className="flex flex-col gap-2 items-end">
            <Link href="/" className="text-[11px] bg-white text-black px-3 py-1.5 rounded-full font-bold">← Accueil</Link>
            <button onClick={() => setDeverrouille(false)} className="text-[11px] bg-white/10 px-3 py-1.5 rounded-full font-bold">🔒 Verrouiller</button>
          </div>
        </div>
        <div className="bg-white/10 rounded-2xl p-3 mt-3">
          <div className="flex justify-between items-center"><p className="font-black text-[12px]">📱 Alertes : {alerteActive ? "✅ ON" : "❌ OFF"}</p><button onClick={() => setAlerteActive(!alerteActive)} className={`text-[11px] font-black px-3 py-1.5 rounded-full ${alerteActive ? "bg-green-500" : "bg-red-500"}`}>{alerteActive ? "Désactiver" : "Activer"}</button></div>
          <p className="text-[11px] opacity-80 mt-1">Telegram @wenze_alerte_bot • Son : {sonActif ? "ON" : "OFF"}</p>
          {dernier && <p className="text-[11px] font-bold mt-1 bg-black/30 p-2 rounded-lg">{dernier}</p>}
          <div className="flex gap-2 mt-2">
            <button onClick={tester} disabled={testEnCours} className="flex-1 bg-[#FF6B00] py-2.5 rounded-full text-[11px] font-black">{testEnCours ? "Envoi..." : "📱 TESTER L'ALERTE"}</button>
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
        {onglet === "ALERTES" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black text-[14px]">📱 Historique des alertes</p><p className="text-[11px] opacity-70 mt-1">Si ça dit ❌, c'est que Vercel n'a pas la clé.</p></div>
            <button onClick={tester} className="w-full bg-[#FF6B00] text-white py-3.5 rounded-full font-black text-[12px]">📱 TESTER MAINTENANT</button>
            {dernier && <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3"><p className="text-[12px] font-bold">Dernier test : {dernier}</p></div>}
            {alertes.length === 0 && <div className="bg-white border rounded-2xl p-4 text-center"><p className="text-[12px] text-gray-500">Aucune alerte. Clique sur TESTER.</p></div>}
            {alertes.map(a => <div key={a.id} className="bg-white border rounded-2xl p-3"><p className="font-black text-[12px]">{a.titre}</p><p className="text-[11px] text-gray-500">{a.heure} • {a.urgence}</p><p className="text-[11px] font-bold mt-1">{a.resultat}</p></div>)}
          </div>
        )}

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
                <input value={nouveau.nom} onChange={e => setNouveau({ ...nouveau, nom: e.target.value })} placeholder="Nom complet" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                <input value={nouveau.telephone} onChange={e => setNouveau({ ...nouveau, telephone: e.target.value })} placeholder="WhatsApp Ex: 0825000000" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                <input value={nouveau.zone} onChange={e => setNouveau({ ...nouveau, zone: e.target.value })} placeholder="Zone Ex: Gombe" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                <div className="flex gap-2">{["SUPERVISEUR", "AMBASSADEUR"].map(r => <button key={r} onClick={() => setNouveau({ ...nouveau, role: r })} className={`flex-1 py-3 rounded-full text-[11px] font-black ${nouveau.role === r ? "bg-black text-white" : "bg-gray-100"}`}>{r}</button>)}</div>
                <button onClick={creer} className="w-full bg-black text-white py-3.5 rounded-full font-black text-[12px]">✅ Créer + Générer Code Pro</button>
              </div>
            </div>
          </div>
        )}

        {onglet === "MEMBRES" && (
          <div className="space-y-3">
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="🔍 Rechercher nom, zone ou code" className="w-full bg-white border rounded-full px-4 py-3 text-[13px] outline-none" />
            <div className="flex gap-2">{["TOUS", "SUPERVISEUR", "AMBASSADEUR"].map(t => <button key={t} onClick={() => setFiltreRole(t)} className={`flex-1 py-2.5 rounded-full text-[11px] font-black ${filtreRole === t ? "bg-black text-white" : "bg-white border"}`}>{t}</button>)}</div>
            {filtres.map(m => (
              <div key={m.id} className="bg-white rounded-2xl p-4 border">
                <p className="font-black text-[14px]">{m.nom} <span className="text-[10px] font-normal text-gray-400">• {m.codePro}</span></p>
                <p className="text-[11px] text-gray-500">{m.telephone} • {m.zone} • {m.statut} • Chef : {m.chefCode}</p>
                <p className="text-[11px] text-gray-500">{m.province} → {m.commune} → {m.village}</p>
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

        {onglet === "PROBLEMES" && (
          <div className="space-y-3">
            <button onClick={tester} className="w-full bg-red-600 text-white py-3 rounded-full font-black text-[12px]">📱 TESTER ALERTE</button>
            {problemes.map(p => (
              <div key={p.id} className="bg-white border rounded-2xl p-4">
                <p className="font-black text-[13px]">{p.type} <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${p.urgence === "CRITIQUE" ? "bg-red-100 text-red-700" : p.urgence === "URGENTE" ? "bg-orange-100 text-orange-700" : "bg-gray-100"}`}>{p.urgence}</span></p>
                <p className="text-[11px] text-gray-600 mt-1">{p.qui} • {p.code}</p><p className="text-[11px] mt-1">{p.detail}</p>
                <div className="flex gap-2 mt-3">
                  {p.statut === "OUVERT" && <button onClick={() => resoudre(p.id)} className="flex-1 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Résoudre</button>}
                  <button onClick={() => envoyerAlerte(p.type, p.detail, p.urgence, p.qui)} className="flex-1 bg-black text-white py-2.5 rounded-full text-[11px] font-black">📱 Renvoyer alerte</button>
                </div>
                {p.statut === "RESOLU" && <p className="text-[11px] text-green-600 font-bold mt-2">✅ Résolu</p>}
              </div>
            ))}
          </div>
        )}

        {onglet === "PAIEMENTS" && (
          <div className="space-y-3">{paiements.map(p => (
            <div key={p.id} className="bg-white border rounded-2xl p-4 flex justify-between items-center"><div><p className="font-black text-[13px]">{p.qui}</p><p className="text-[11px] text-gray-500">{p.type} • {p.methode} • {p.montant.toLocaleString()} CDF</p></div>{p.statut !== "PAYÉ" ? <button onClick={() => validerPay(p.id)} className="bg-green-600 text-white px-3 py-2 rounded-full text-[11px] font-black">Valider</button> : <span className="text-[11px] font-black text-green-600">✅ PAYÉ</span>}</div>
          ))}</div>
        )}

        {onglet === "LIENS" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4 text-center"><p className="font-black">🔗 Chaîne WENZE</p><p className="text-[12px] mt-2">👑 DG<br />↓<br />🛡️ {sup.length} Superviseurs<br />↓<br />🎖️ {amb.length} Ambassadeurs</p></div>
            {membres.map(m => <div key={m.id} className="bg-white border rounded-2xl p-3 flex justify-between"><p className="text-[12px] font-bold">{m.nom}</p><p className="text-[11px] text-gray-500">{m.codePro} → {m.chefCode}</p></div>)}
          </div>
        )}

        {onglet === "CARTE" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[13px]">🗺️ Carte par Province</p>{["Kinshasa"].map(prov => { const nb = membres.filter(m => m.province === prov).length; return <div key={prov} className="flex justify-between py-2"><p className="text-[12px] font-bold">{prov}</p><p className="text-[12px]">{nb} membre(s)</p></div>; })}</div>
            {membres.map(m => <div key={m.id} className="bg-white border rounded-2xl p-3"><p className="text-[12px] font-bold">{m.nom} - {m.zone}</p><p className="text-[11px] text-gray-500">{m.province} → {m.commune} → {m.village}</p></div>)}
          </div>
        )}

        {onglet === "TICKETS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[13px]">🎟️ Tickets Tombola</p><p className="text-[12px] mt-2">Boutique : 50 000 CDF<br />Client : 20 000 CDF</p></div>
            {paiements.filter(p => p.type.includes("Ticket")).map(p => <div key={p.id} className="bg-white border rounded-2xl p-3 flex justify-between"><p className="text-[12px] font-bold">{p.qui}</p><p className="text-[11px]">{p.montant.toLocaleString()} CDF - {p.statut}</p></div>)}
          </div>
        )}

        {onglet === "DESIGN" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[13px]">🎨 Design Public</p><p className="text-[12px] mt-2">WENZE - Achetez, Gagnez, Partagez<br />🎉 GRAND TIRAGE - Gagnez 500 000 CDF</p><button onClick={() => showToast("✅ Design sauvegardé")} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">Sauvegarder</button></div>
          </div>
        )}

        {onglet === "PARAMETRES" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[13px]">🔒 PIN DG - Actuel : {pinDG}</p><input value={pinDG} onChange={e => setPinDG(e.target.value)} className="w-full border rounded-xl px-3 py-3 text-[13px] mt-2 outline-none" placeholder="Nouveau PIN" /><button onClick={() => showToast("✅ PIN changé")} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">Sauvegarder PIN</button></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[13px]">📱 Alertes</p><div className="flex justify-between mt-3"><p className="text-[12px]">Alertes téléphone</p><button onClick={() => setAlerteActive(!alerteActive)} className={`px-4 py-1.5 rounded-full text-[11px] font-black ${alerteActive ? "bg-green-600 text-white" : "bg-gray-200"}`}>{alerteActive ? "ON" : "OFF"}</button></div><div className="flex justify-between mt-2"><p className="text-[12px]">Son + Vibration</p><button onClick={() => setSonActif(!sonActif)} className={`px-4 py-1.5 rounded-full text-[11px] font-black ${sonActif ? "bg-green-600 text-white" : "bg-gray-200"}`}>{sonActif ? "ON" : "OFF"}</button></div></div>
          </div>
        )}

        {onglet === "RAPPORTS" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black text-[14px]">📊 Rapport DG</p><p className="text-[12px] mt-1">Payés : {totalPaye.toLocaleString()} CDF<br />Gains Amb : {totalGains.toLocaleString()} CDF<br />Boutiques : {totalBout}<br />Problèmes ouverts : {probOuverts}</p></div>
            <button onClick={() => showToast("📊 Rapport copié")} className="w-full bg-[#FF6B00] text-white py-3.5 rounded-full font-black text-[12px]">📤 Partager Rapport</button>
          </div>
        )}
      </div>
    </div>
  );
        }
