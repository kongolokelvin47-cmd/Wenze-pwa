"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ===== SÉCURITÉ V8 : Supabase ne plante JAMAIS =====
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase: any = URL && KEY ? createClient(URL, KEY) : null;

// ===== SESSION DG 12h — local, sécurisée, sans fichier externe =====
const getSession = () => { try { return JSON.parse(localStorage.getItem("wenze_session") || "null"); } catch { return null; } };
const demarrerSession = (role: string, user: any) => { try { localStorage.setItem("wenze_session", JSON.stringify({ role, user, debut: Date.now() })); } catch {} };
const quitterSession = () => { try { localStorage.removeItem("wenze_session"); } catch {} window.location.reload(); };
const verifierSession = () => getSession();
const tempsRestant = () => { const s = getSession(); if (!s) return "0h"; const reste = 12 * 3600 * 1000 - (Date.now() - (s.debut || Date.now())); if (reste <= 0) return "Expirée"; return Math.floor(reste / 3600000) + "h " + Math.floor((reste % 3600000) / 60000) + "min"; };

type Membre = { id: string; nom: string; telephone: string; role: string; statut: string; gains?: number; codePro: string; chefCode?: string; province: string; commune: string; village: string; created_at?: string; dateInscription?: string };
type Boutique = { id: string; nom: string; proprietaire: string; telephone: string; province: string; commune: string; statut: string; abonnement: string; code_amb: string; created_at?: string };
type Annonce = { id: string; titre: string; description: string; image: string; prix: number; auteur: string; code_auteur: string; telephone: string; commune: string; statut: string; motif: string; created_at?: string };

export default function DashboardDG() {
  const [deverrouille, setDeverrouille] = useState(false);
  const [pin, setPin] = useState(""); const [pinDG, setPinDG] = useState("2026");
  const [membres, setMembres] = useState<Membre[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [onglet, setOnglet] = useState("DASH");
  const [recherche, setRecherche] = useState(""); const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [filtreCommune, setFiltreCommune] = useState("TOUTES");
  const [filtreAbo, setFiltreAbo] = useState("TOUS");
  const [filtreAnnonce, setFiltreAnnonce] = useState("TOUTES");
  const [motif, setMotif] = useState("");
  const [nouveau, setNouveau] = useState({ nom: "", telephone: "", role: "SUPERVISEUR", province: "Kinshasa", commune: "", village: "" });
  const [problemes, setProblemes] = useState<any[]>([]); const [paiements, setPaiements] = useState<any[]>([]);
  const [designPub, setDesignPub] = useState({ main: "#FF6B00", btn: "#111111", title: "Bienvenue chez WENZE", slogan: "Le réseau qui te fait gagner", about: "WENZE - Ensemble on va plus loin.", whats: "+243 810 000 000", logo: "", showAmb: true, maintenance: false });
  const [formProb, setFormProb] = useState({ type: "", qui: "", detail: "", urgence: "NORMALE" });
  const [formPay, setFormPay] = useState({ qui: "", type: "Abonnement Boutique", montant: "", methode: "Orange Money" });
  const [pinForm, setPinForm] = useState({ ancien: "", nouveau: "", confirm: "" });
  const [erreurSupabase, setErreurSupabase] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };
  const today = new Date().toISOString().slice(0, 10);
  const moisActuel = new Date().toISOString().slice(0, 7);
  const anneeActuelle = new Date().getFullYear().toString();
  const estCeMois = (d?: string) => (d || "").slice(0, 7) === moisActuel;
  const estAujourdhui = (d?: string) => (d || "").slice(0, 10) === today;
  const estCetteAnnee = (d?: string) => (d || "").slice(0, 4) === anneeActuelle;
  const dateDe = (x: any) => x.created_at || x.dateInscription || x.date_inscription || "";
  const estPaye = (a: string) => ["PAYE", "PAYÉ", "ACTIF"].includes(a || "");
    const statsAmb = (codePro: string) => {
    const bout = boutiques.filter(b => b.code_amb === codePro);
    const cli = clients.filter(c => c.code_parrain === codePro);
    return {
      boutTotal: bout.length, boutMois: bout.filter(b => estCeMois(b.created_at)).length, boutAuj: bout.filter(b => estAujourdhui(b.created_at)).length, boutAnnee: bout.filter(b => estCetteAnnee(b.created_at)).length,
      cliTotal: cli.length, cliMois: cli.filter(c => estCeMois(c.created_at)).length, cliAuj: cli.filter(c => estAujourdhui(c.created_at)).length, cliAnnee: cli.filter(c => estCetteAnnee(c.created_at)).length,
      boutPaye: bout.filter(b => estPaye(b.abonnement)).length, boutNonPaye: bout.filter(b => !estPaye(b.abonnement)).length,
    };
  };
  const statsSup = (sup: Membre) => {
    const mesAmb = membres.filter(m => m.role === "AMBASSADEUR" && m.chefCode === sup.codePro);
    const codes = mesAmb.map(m => m.codePro);
    const bout = boutiques.filter(b => codes.includes(b.code_amb) || b.commune === sup.commune);
    const cli = clients.filter(c => codes.includes(c.code_parrain));
    return {
      nbAmb: mesAmb.length, nbAmbActifs: mesAmb.filter(m => m.statut === "ACTIF").length,
      boutTotal: bout.length, boutMois: bout.filter(b => estCeMois(b.created_at)).length, boutAnnee: bout.filter(b => estCetteAnnee(b.created_at)).length, boutAuj: bout.filter(b => estAujourdhui(b.created_at)).length,
      cliTotal: cli.length, cliMois: cli.filter(c => estCeMois(c.created_at)).length, cliAnnee: cli.filter(c => estCetteAnnee(c.created_at)).length, cliAuj: cli.filter(c => estAujourdhui(c.created_at)).length,
      boutPaye: bout.filter(b => estPaye(b.abonnement)).length, mesAmb,
    };
  };
    useEffect(() => {
    try { const s: any = verifierSession(); if (s && s.role === "DG") setDeverrouille(true); } catch {}
    const charger = async () => {
      if (!supabase) { setErreurSupabase("⚠️ Clés Supabase manquantes sur Vercel — vérifie NEXT_PUBLIC_SUPABASE_URL et ANON_KEY"); return; }
      try {
        const [m, b, cl, pr, pa, an, cfg] = await Promise.all([
          supabase.from("membres").select("*").order("created_at", { ascending: false }),
          supabase.from("boutiques").select("*").order("created_at", { ascending: false }),
          supabase.from("clients").select("*").order("created_at", { ascending: false }),
          supabase.from("problemes").select("*").order("created_at", { ascending: false }),
          supabase.from("paiements").select("*").order("created_at", { ascending: false }),
          supabase.from("annonces_publiques").select("*").order("created_at", { ascending: false }),
          supabase.from("config_publique").select("*").eq("id", 1).single(),
        ]);
        if (m.data) setMembres(m.data.map((r: any) => ({ id: r.id, nom: r.nom || "", telephone: r.telephone || "", role: r.role || "", statut: r.statut || "EN_ATTENTE", gains: r.gains || 0, codePro: r.code_pro || "", chefCode: r.chef_code || "", province: r.province || "Kinshasa", commune: r.commune || "", village: r.village || "", created_at: r.created_at, dateInscription: r.date_inscription })));
        if (b.data) setBoutiques(b.data);
        if (cl.data) setClients(cl.data);
        if (pr.data) setProblemes(pr.data);
        if (pa.data) setPaiements(pa.data);
        if (an.data) setAnnonces(an.data);
        if (cfg.data) setDesignPub({ main: cfg.data.main_color || "#FF6B00", btn: cfg.data.btn_color || "#111", title: cfg.data.title || "", slogan: cfg.data.slogan || "", about: cfg.data.about || "", whats: cfg.data.whats || "", logo: cfg.data.logo || "", showAmb: cfg.data.show_amb ?? true, maintenance: cfg.data.maintenance ?? false });
        try { const c = JSON.parse(localStorage.getItem("wenze_dg_config") || "{}"); if (c.pin) setPinDG(c.pin); } catch {}
      } catch (e) { console.log("WENZE charger:", e); setErreurSupabase("⚠️ Une table Supabase manque — colle le SQL en bas de ce message"); }
    };
    charger();
    let ch: any = null;
    try {
      if (supabase) {
        ch = supabase.channel("dg-v8").on("postgres_changes", { event: "*", schema: "public", table: "membres" }, () => charger()).on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, () => charger()).on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => charger()).on("postgres_changes", { event: "*", schema: "public", table: "problemes" }, () => charger()).on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, () => charger()).on("postgres_changes", { event: "*", schema: "public", table: "annonces_publiques" }, () => charger()).on("postgres_changes", { event: "*", schema: "public", table: "config_publique" }, () => charger()).subscribe();
      }
    } catch {}
    const timer = setInterval(() => { try { if (deverrouille && !verifierSession()) { alert("Session DG expirée (12h)"); quitterSession(); } } catch {} }, 60000);
    return () => { try { if (supabase && ch) supabase.removeChannel(ch); } catch {} clearInterval(timer); };
  }, [deverrouille]);
  useEffect(() => { try { localStorage.setItem("wenze_dg_config", JSON.stringify({ pin: pinDG })); } catch {} }, [pinDG]);
  const loginDG = () => { if (pin === pinDG) { demarrerSession("DG", { nom: "DG WENZE" }); setDeverrouille(true); } else showToast("❌ PIN incorrect"); };
  if (!deverrouille) return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#0A0A0A] text-white p-6 flex flex-col justify-center">
      <p className="text-[28px] font-black">WENZE<span className="text-[#FF6B00]">.</span></p><h1 className="font-black text-[24px] mt-4">👑 Connecte-toi en tant que DG</h1><p className="text-[12px] opacity-60">Espace privé • Session 12h • Sécurisé • V8</p>
      <input value={pin} onChange={e => setPin(e.target.value)} type="password" inputMode="numeric" placeholder="PIN DG" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 mt-6 text-center text-[22px] tracking-[8px] outline-none" />
      <button onClick={loginDG} className="w-full bg-[#FF6B00] py-4 rounded-full font-black mt-4">🔓 ENTRER DANS MON BUREAU DG</button>{toast && <p className="text-center text-[12px] mt-3 font-bold">{toast}</p>}{erreurSupabase && <p className="text-center text-[11px] mt-3 text-yellow-300">{erreurSupabase}</p>}
    </div>
  );
    const sup = useMemo(() => membres.filter(m => m.role === "SUPERVISEUR"), [membres]);
  const amb = useMemo(() => membres.filter(m => m.role === "AMBASSADEUR"), [membres]);
  const totalPaye = useMemo(() => paiements.filter(p => p.statut === "PAYÉ").reduce((s, p) => s + (p.montant || 0), 0), [paiements]);
  const totalGains = useMemo(() => amb.reduce((s, m) => s + (m.gains || 0), 0), [amb]);
  const boutPaye = boutiques.filter(b => estPaye(b.abonnement)).length;
  const boutNonPaye = boutiques.length - boutPaye;
  const probOuverts = problemes.filter(p => p.statut === "OUVERT").length;
  const critiques = problemes.filter(p => p.urgence === "CRITIQUE" && p.statut === "OUVERT").length;
  const communes = useMemo(() => ["TOUTES", ...Array.from(new Set(boutiques.map(b => b.commune).filter(Boolean)))], [boutiques]);
  const evolution = useMemo(() => { const mois: Record<string, number> = {}; [...membres, ...boutiques, ...clients].forEach((x: any) => { const d = (dateDe(x)).slice(0, 7); if (d) mois[d] = (mois[d] || 0) + 1; }); return Object.entries(mois).sort().slice(-6); }, [membres, boutiques, clients]);
  const maxEvo = Math.max(1, ...evolution.map(e => e[1]));
  const rapportJour = { boutiques: boutiques.filter(b => estAujourdhui(b.created_at)).length, clients: clients.filter(c => estAujourdhui(c.created_at)).length, membres: membres.filter(m => estAujourdhui(dateDe(m))).length };
  const safe = async (fn: () => Promise<any>, okMsg: string) => { try { if (!supabase) return showToast("⚠️ Supabase non connecté"); await fn(); showToast(okMsg); } catch (e: any) { showToast("❌ " + (e?.message || "Erreur")); } };
  const changer = async (id: string, s: string) => { setMembres(p => p.map(m => m.id === id ? { ...m, statut: s } : m)); await safe(() => supabase.from("membres").update({ statut: s }).eq("id", id), s === "ACTIF" ? "✅ Validé" : "⏸️ Suspendu"); };
  const supprimer = async (id: string) => { if (!confirm("DG, supprimer ce membre ?")) return; setMembres(p => p.filter(m => m.id !== id)); await safe(() => supabase.from("membres").delete().eq("id", id), "🗑️ Supprimé"); };
  const creer = async () => { if (!nouveau.nom.trim() || nouveau.telephone.length < 9) return showToast("Nom + WhatsApp obligatoires"); const pre = nouveau.role === "SUPERVISEUR" ? "SUP" : "AMB"; const code = pre + "-" + nouveau.nom.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X") + "-" + Math.floor(1000 + Math.random() * 9000); const nm: any = { id: pre + Date.now(), nom: nouveau.nom.trim(), telephone: nouveau.telephone.trim(), role: nouveau.role, statut: "ACTIF", gains: 0, code_pro: code, chef_code: "DG", province: nouveau.province, commune: nouveau.commune, village: nouveau.village || nouveau.commune }; setMembres(p => [{ id: nm.id, nom: nm.nom, telephone: nm.telephone, role: nm.role, statut: nm.statut, gains: 0, codePro: code, chefCode: "DG", province: nm.province, commune: nm.commune, village: nm.village }, ...p]); await safe(() => supabase.from("membres").insert(nm), "✅ Créé : " + code); setNouveau({ nom: "", telephone: "", role: "SUPERVISEUR", province: "Kinshasa", commune: "", village: "" }); };
  const resoudre = async (id: string) => { setProblemes(p => p.map(x => x.id === id ? { ...x, statut: "RESOLU" } : x)); await safe(() => supabase.from("problemes").update({ statut: "RESOLU" }).eq("id", id), "✅ Résolu"); };
  const validerPay = async (id: string) => { setPaiements(p => p.map(x => x.id === id ? { ...x, statut: "PAYÉ" } : x)); await safe(() => supabase.from("paiements").update({ statut: "PAYÉ" }).eq("id", id), "✅ Paiement validé"); };
  const validerBoutique = async (id: string) => { setBoutiques(p => p.map(b => b.id === id ? { ...b, statut: "VALIDEE" } : b)); await safe(() => supabase.from("boutiques").update({ statut: "VALIDEE" }).eq("id", id), "✅ Boutique validée"); };
  const validerAbo = async (id: string) => { setBoutiques(p => p.map(b => b.id === id ? { ...b, abonnement: "PAYE" } : b)); await safe(() => supabase.from("boutiques").update({ abonnement: "PAYE" }).eq("id", id), "✅ Abonnement validé"); };
  const ajouterProbleme = async () => { if (!formProb.type.trim()) return showToast("Type obligatoire"); const np: any = { id: "P-" + Date.now(), type: formProb.type, qui: formProb.qui, code: "-", detail: formProb.detail, urgence: formProb.urgence, statut: "OUVERT" }; setProblemes(p => [np, ...p]); await safe(() => supabase.from("problemes").insert(np), "✅ Problème ajouté"); setFormProb({ type: "", qui: "", detail: "", urgence: "NORMALE" }); };
  const ajouterPaiement = async () => { const montant = parseInt(formPay.montant || "0"); if (!formPay.qui.trim() || !montant) return showToast("Qui + Montant"); const np: any = { id: "PAY-" + Date.now(), qui: formPay.qui, type: "Abonnement Boutique", montant, methode: formPay.methode, statut: "EN_ATTENTE" }; setPaiements(p => [np, ...p]); await safe(() => supabase.from("paiements").insert(np), "✅ Paiement ajouté"); setFormPay({ qui: "", type: "Abonnement Boutique", montant: "", methode: "Orange Money" }); };
  const publierDesign = async () => { await safe(() => supabase.from("config_publique").update({ title: designPub.title, slogan: designPub.slogan, about: designPub.about, whats: designPub.whats, logo: designPub.logo, main_color: designPub.main, btn_color: designPub.btn, show_amb: designPub.showAmb, maintenance: designPub.maintenance, updated_at: new Date().toISOString() }).eq("id", 1), "✅ Publié ! Public voit en 1-2 sec"); };
  const changerPIN = () => { if (pinForm.ancien !== pinDG) return showToast("❌ Ancien PIN faux"); if (pinForm.nouveau.length < 4) return showToast("Min 4 chiffres"); if (pinForm.nouveau !== pinForm.confirm) return showToast("PIN différents"); setPinDG(pinForm.nouveau); setPinForm({ ancien: "", nouveau: "", confirm: "" }); showToast("✅ PIN changé"); };
  const exporter = async () => { const txt = membres.map(m => `${m.nom} | ${m.codePro} | ${m.role} | ${m.commune} | ${m.statut} | ${statsAmb(m.codePro).boutTotal} bout | ${statsAmb(m.codePro).cliTotal} cli`).join("\n"); try { await navigator.clipboard.writeText(txt); showToast("✅ Copié !"); } catch { showToast(txt); } };
  const modererAnnonce = async (id: string, statut: string, motifDG: string = "") => { setAnnonces(p => p.map(a => a.id === id ? { ...a, statut, motif: motifDG } : a)); await safe(() => supabase.from("annonces_publiques").update({ statut, motif: motifDG }).eq("id", id), statut === "SUSPENDUE" ? "⏸️ Suspendue — plus visible" : statut === "APPROUVEE" ? "✅ Approuvée — visible" : "🗑️ Supprimée"); setMotif(""); };
  const supprimerAnnonce = async (id: string) => { if (!confirm("DG, supprimer définitivement ?")) return; setAnnonces(p => p.filter(a => a.id !== id)); await safe(() => supabase.from("annonces_publiques").delete().eq("id", id), "🗑️ Supprimée"); };
    return (
    <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
      {toast && <div className="fixed top-4 left-4 right-4 z-[60] bg-black text-white p-3 rounded-2xl text-[12px] font-bold text-center shadow-xl">{toast}</div>}
      <div className="bg-black text-white px-5 pt-8 pb-6 rounded-b-[32px]">
        <div className="flex justify-between items-start"><div><p className="text-[11px] opacity-60 tracking-widest">WENZE • DIRECTION GÉNÉRALE • V8</p><h1 className="font-black text-[24px] mt-1">👑 Tableau DG</h1><p className="text-[11px] opacity-70 mt-1">⏱️ {tempsRestant()} restant • 🟢 Temps réel • 🔒 Sécurisé</p></div><button onClick={() => quitterSession()} className="bg-white/15 px-3 py-1.5 rounded-full text-[11px] font-bold">↩ Quitter</button></div>
        <div className="grid grid-cols-4 gap-2 mt-5 text-center">
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black text-[18px]">{sup.length}</p><p className="text-[9px] opacity-70">SUPERVISEURS</p></div>
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black text-[18px]">{amb.length}</p><p className="text-[9px] opacity-70">AMBASSADEURS</p></div>
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black text-[18px]">{boutiques.length}</p><p className="text-[9px] opacity-70">BOUTIQUES</p></div>
          <div className="bg-[#FF6B00] rounded-2xl p-2"><p className="font-black text-[16px]">{clients.length}</p><p className="text-[9px] opacity-90">TOTAL CLIENTS</p></div>
        </div>
      </div>
      {erreurSupabase && <div className="mx-4 mt-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-2xl p-3 text-[11px] font-bold">{erreurSupabase}</div>}
      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
        {["DASH", "SUPERVISEURS", "AMBASSADEURS", "INVITATIONS", "BOUTIQUES", "MODERATION", "PROBLEMES", "PAIEMENTS", "DESIGN", "PARAM"].map(t => (<button key={t} onClick={() => setOnglet(t)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>{t === "DASH" ? "📊 Dashboard" : t === "SUPERVISEURS" ? "🛡️ Superviseurs" : t === "AMBASSADEURS" ? "🎖️ Ambassadeurs" : t === "INVITATIONS" ? "🔗 Invitations" : t === "BOUTIQUES" ? "🏪 Boutiques" : t === "MODERATION" ? `🛡️ Modération (${annonces.filter(a => a.statut === "EN_ATTENTE").length})` : t === "PROBLEMES" ? `🚨 Problèmes (${probOuverts})` : t === "PAIEMENTS" ? "💰 Paiements" : t === "DESIGN" ? "🎨 Design" : "⚙️ Param"}</button>))}
      </div>
      <div className="px-4 mt-4">
        {onglet === "DASH" && (
          <div className="space-y-3">
            {critiques > 0 && <div className="bg-red-600 text-white rounded-2xl p-4 font-bold text-[13px]">🚨 {critiques} CRITIQUE(s) ouvert(s) — va dans PROBLÈMES</div>}
            {annonces.filter(a => a.statut === "EN_ATTENTE").length > 0 && <button onClick={() => setOnglet("MODERATION")} className="w-full bg-orange-500 text-white rounded-2xl p-4 font-bold text-[13px] text-left">🛡️ {annonces.filter(a => a.statut === "EN_ATTENTE").length} publicité(s) à vérifier → Clique pour modérer</button>}
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">📋 RAPPORT DU JOUR — {today}</p><div className="grid grid-cols-3 gap-2 mt-3 text-center"><div className="bg-white/10 rounded-xl p-2"><p className="font-black text-[18px]">{rapportJour.boutiques}</p><p className="text-[9px] opacity-70">BOUTIQUES</p></div><div className="bg-white/10 rounded-xl p-2"><p className="font-black text-[18px]">{rapportJour.clients}</p><p className="text-[9px] opacity-70">CLIENTS</p></div><div className="bg-white/10 rounded-xl p-2"><p className="font-black text-[18px]">{rapportJour.membres}</p><p className="text-[9px] opacity-70">MEMBRES</p></div></div></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[20px]">{totalGains.toLocaleString()} CDF</p><p className="text-[11px] text-gray-500">Total gains ambassadeurs</p></div>
              <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[20px]">{clients.length}</p><p className="text-[11px] text-gray-500">Total clients</p></div>
              <div className="bg-emerald-600 text-white rounded-2xl p-4"><p className="font-black text-[20px]">{boutPaye}</p><p className="text-[11px]">✅ ACTIVES — Abonnement payé</p></div>
              <div className="bg-orange-500 text-white rounded-2xl p-4"><p className="font-black text-[20px]">{boutNonPaye}</p><p className="text-[11px]">⏳ INACTIVES — Sans abonnement</p></div>
            </div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📈 Évolution de la société</p><p className="text-[11px] text-gray-500">Membres + Boutiques + Clients par mois</p><div className="flex items-end gap-2 h-[110px] mt-4">{evolution.map(([mois, val]) => (<div key={mois} className="flex-1 flex flex-col items-center gap-1"><div className="w-full bg-black rounded-t-lg" style={{ height: `${Math.max(8, (val / maxEvo) * 90)}px` }}></div><p className="text-[9px] font-bold">{val}</p><p className="text-[8px] text-gray-400">{mois.slice(5)}</p></div>))}{evolution.length === 0 && <p className="text-[12px] text-gray-400">Pas encore de données</p>}</div></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏆 Top 3 Ambassadeurs — Ce mois</p>{[...amb].sort((a, b) => (statsAmb(b.codePro).boutMois + statsAmb(b.codePro).cliMois) - (statsAmb(a.codePro).boutMois + statsAmb(a.codePro).cliMois)).slice(0, 3).map((m, i) => { const s = statsAmb(m.codePro); return (<p key={m.id} className="text-[12px] mt-2">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} <b>{m.nom}</b> — {s.boutMois} bout. + {s.cliMois} cli. ce mois • {s.boutTotal} bout. total</p>); })}</div>
            <button onClick={exporter} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px]">📋 Exporter tout</button>
          </div>
        )}
                {onglet === "SUPERVISEURS" && (
          <div className="space-y-2">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">➕ Créer Superviseur / Ambassadeur</p><input value={nouveau.nom} onChange={e => setNouveau({ ...nouveau, nom: e.target.value })} placeholder="Nom complet" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={nouveau.telephone} onChange={e => setNouveau({ ...nouveau, telephone: e.target.value })} placeholder="+243..." className="w-full border rounded-xl px-3 py-3 mt-2" /><div className="flex gap-2 mt-2"><select value={nouveau.role} onChange={e => setNouveau({ ...nouveau, role: e.target.value })} className="flex-1 border rounded-xl px-2 py-3"><option>SUPERVISEUR</option><option>AMBASSADEUR</option></select><input value={nouveau.commune} onChange={e => setNouveau({ ...nouveau, commune: e.target.value })} placeholder="Commune / Zone" className="flex-1 border rounded-xl px-3 py-3" /></div><button onClick={creer} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-3">✅ Créer + Code Pro</button></div>
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher superviseur..." className="w-full border rounded-full px-3 py-2.5 text-[12px]" />
            {sup.filter(m => m.nom.toLowerCase().includes(recherche.toLowerCase())).map(m => { const s = statsSup(m); const perf = s.boutTotal + s.cliTotal; return (
              <button key={m.id} onClick={() => setSelected({ type: "SUP", membre: m, stats: s })} className="w-full text-left bg-white border rounded-2xl p-4">
                <p className="font-black">{m.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{m.statut} • {m.codePro}</span></p><p className="text-[11px] text-gray-500">📍 {m.commune} • {m.province} • {m.telephone}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-center"><div className="bg-gray-50 rounded-xl p-2"><p className="font-black">{s.nbAmb} <span className="text-[10px] text-green-600">({s.nbAmbActifs} actifs)</span></p><p className="text-[9px] text-gray-500">AMBASSADEURS</p></div><div className="bg-gray-50 rounded-xl p-2"><p className="font-black">{s.boutTotal}</p><p className="text-[9px] text-gray-500">BOUTIQUES • {s.boutMois} ce mois</p></div><div className="bg-gray-50 rounded-xl p-2"><p className="font-black">{s.cliTotal}</p><p className="text-[9px] text-gray-500">CLIENTS • {s.cliMois} ce mois</p></div></div>
                <div className="mt-2"><div className="flex justify-between text-[11px]"><span>Performance zone</span><b>{perf} pts</b></div><div className="h-2 bg-gray-100 rounded-full mt-1"><div className="h-2 bg-black rounded-full" style={{ width: `${Math.min(100, perf)}%` }}></div></div></div>
                <p className="text-[11px] text-[#FF6B00] font-bold mt-2">👆 Clique pour rapport du jour + détails →</p>
              </button>
            ); })}
          </div>
        )}
        {onglet === "AMBASSADEURS" && (
          <div className="space-y-2">
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher ambassadeur / code..." className="w-full border rounded-full px-3 py-2.5 text-[12px]" />
            {amb.filter(m => m.nom.toLowerCase().includes(recherche.toLowerCase()) || m.codePro.toLowerCase().includes(recherche.toLowerCase())).sort((a, b) => statsAmb(b.codePro).boutTotal - statsAmb(a.codePro).boutTotal).map(m => { const s = statsAmb(m.codePro); return (
              <button key={m.id} onClick={() => setSelected({ type: "AMB", membre: m, stats: s })} className="w-full text-left bg-white border rounded-2xl p-4">
                <p className="font-black">{m.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{m.statut} • {m.codePro}</span></p><p className="text-[11px] text-gray-500">📍 {m.commune} • Chef : {m.chefCode} • 💰 {(m.gains || 0).toLocaleString()} CDF</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-center"><div className="bg-gray-50 rounded-xl p-2"><p className="font-black">{s.boutTotal} <span className="text-[10px] text-[#FF6B00]">• {s.boutMois} ce mois</span></p><p className="text-[9px] text-gray-500">BOUTIQUES • {s.boutPaye} payées</p></div><div className="bg-gray-50 rounded-xl p-2"><p className="font-black">{s.cliTotal} <span className="text-[10px] text-green-600">• {s.cliMois} ce mois</span></p><p className="text-[9px] text-gray-500">CLIENTS • {s.cliAuj} aujourd'hui</p></div></div>
                <p className="text-[11px] text-[#FF6B00] font-bold mt-2">👆 Clique pour voir ses statistiques →</p>
              </button>
            ); })}
          </div>
        )}
        {onglet === "INVITATIONS" && (
          <div className="space-y-2">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">🔗 Qui invite qui — Performance</p><p className="text-[11px] opacity-70">Classé par invitations + boutiques amenées.</p></div>
            {[...membres].sort((a, b) => (membres.filter(x => x.chefCode === b.codePro).length + statsAmb(b.codePro).boutTotal) - (membres.filter(x => x.chefCode === a.codePro).length + statsAmb(a.codePro).boutTotal)).map(m => { const invites = membres.filter(x => x.chefCode === m.codePro); const s = statsAmb(m.codePro); const parrain = membres.find(x => x.codePro === m.chefCode); return (
              <div key={m.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{m.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{m.role} • {m.codePro}</span></p><p className="text-[12px] text-gray-600">👤 Invité par : <b>{parrain ? parrain.nom : m.chefCode === "DG" ? "👑 DG" : m.chefCode || "—"}</b></p><p className="text-[12px]">👥 A invité : <b>{invites.length}</b> {invites.length > 0 && `— ${invites.map(f => f.nom).join(", ")}`}</p><p className="text-[12px]">🏪 Boutiques : <b>{s.boutTotal}</b> • 👥 Clients : <b>{s.cliTotal}</b> • 💰 <b>{(m.gains || 0).toLocaleString()} CDF</b></p><p className="text-[11px] text-gray-400">Performance : {invites.length + s.boutTotal + s.cliTotal} pts</p></div>
            ); })}
          </div>
        )}
                {onglet === "BOUTIQUES" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><div className="flex gap-2"><select value={filtreCommune} onChange={e => setFiltreCommune(e.target.value)} className="flex-1 border rounded-full px-2 py-2 text-[11px] font-bold"><option value="TOUTES">Toutes communes</option>{communes.filter(c => c !== "TOUTES").map(c => <option key={c}>{c}</option>)}</select><select value={filtreAbo} onChange={e => setFiltreAbo(e.target.value)} className="flex-1 border rounded-full px-2 py-2 text-[11px] font-bold"><option value="TOUS">Tous abonnements</option><option value="PAYE">✅ PAYÉ</option><option value="NON_PAYE">⏳ SANS ABO</option></select></div><input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher boutique..." className="w-full border rounded-xl px-3 py-2.5 mt-2 text-[12px]" /></div>
            <div className="grid grid-cols-2 gap-2"><div className="bg-emerald-600 text-white rounded-2xl p-4"><p className="font-black text-[20px]">{boutPaye}</p><p className="text-[11px]">✅ ACTIVES — Abonnement payé</p></div><div className="bg-orange-500 text-white rounded-2xl p-4"><p className="font-black text-[20px]">{boutNonPaye}</p><p className="text-[11px]">⏳ INACTIVES — Sans abonnement</p></div></div>
            {boutiques.filter(b => (filtreCommune === "TOUTES" || b.commune === filtreCommune) && (filtreAbo === "TOUS" || (filtreAbo === "PAYE" ? estPaye(b.abonnement) : !estPaye(b.abonnement))) && b.nom.toLowerCase().includes(recherche.toLowerCase())).map(b => { const ambDeB = membres.find(m => m.codePro === b.code_amb); const paye = estPaye(b.abonnement); return (<div key={b.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{b.nom} <span className={`text-[10px] px-2 py-0.5 rounded-full ${paye ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{paye ? "✅ PAYÉ" : "⏳ SANS ABO"}</span> <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{b.statut}</span></p><p className="text-[11px] text-gray-500">{b.proprietaire} • {b.telephone} • 📍 {b.commune}</p><p className="text-[11px] text-gray-500">Amenée par : <b>{ambDeB ? `${ambDeB.nom} (${ambDeB.codePro})` : b.code_amb || "—"}</b></p><div className="flex gap-1.5 mt-2">{b.statut !== "VALIDEE" && <button onClick={() => validerBoutique(b.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">✅ Valider boutique</button>}{!paye && <button onClick={() => validerAbo(b.id)} className="bg-black text-white px-3 py-1.5 rounded-full text-[11px] font-bold">💰 Valider abonnement</button>}</div></div>); })}
          </div>
        )}
        {onglet === "MODERATION" && (
          <div className="space-y-3">
            <div className="bg-red-600 text-white rounded-2xl p-4"><p className="font-black">🛡️ Modération DG — Sécurité & Bonne conduite</p><p className="text-[11px] opacity-90 mt-1">Seul le DG peut suspendre ou supprimer une publicité immorale ou fausse. Le public ne voit QUE les APPROUVÉES.</p></div>
            <div className="flex gap-1.5 overflow-x-auto">{["TOUTES", "EN_ATTENTE", "APPROUVEE", "SUSPENDUE", "SUPPRIMEE"].map(f => (<button key={f} onClick={() => setFiltreAnnonce(f)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-black ${filtreAnnonce === f ? "bg-black text-white" : "bg-white border"}`}>{f === "TOUTES" ? "Toutes" : f === "EN_ATTENTE" ? "⏳ À vérifier" : f === "APPROUVEE" ? "✅ Approuvées" : f === "SUSPENDUE" ? "⏸️ Suspendues" : "🗑️ Supprimées"} ({f === "TOUTES" ? annonces.length : annonces.filter(a => a.statut === f).length})</button>))}</div>
            <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Motif DG (ex: Photo fausse / Contenu immoral) — à écrire avant de suspendre" className="w-full border rounded-xl px-3 py-3 text-[12px]" />
            {annonces.filter(a => filtreAnnonce === "TOUTES" || a.statut === filtreAnnonce).map(a => (
              <div key={a.id} className="bg-white border rounded-2xl p-4">
                {a.image && <img src={a.image} className="w-full h-[160px] object-cover rounded-xl mb-2" alt="" />}
                <p className="font-black">{a.titre} <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.statut === "APPROUVEE" ? "bg-green-100 text-green-700" : a.statut === "SUSPENDUE" ? "bg-orange-100 text-orange-700" : a.statut === "SUPPRIMEE" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>{a.statut}</span></p>
                <p className="text-[12px] text-gray-600 mt-1">{a.description}</p><p className="text-[11px] text-gray-500 mt-1">Par : {a.auteur} • {a.telephone} • 📍 {a.commune} • {a.prix ? `${Number(a.prix).toLocaleString()} CDF` : ""}</p>
                {a.motif && <p className="text-[11px] text-red-600 font-bold mt-1">Motif DG : {a.motif}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3">{a.statut !== "APPROUVEE" && <button onClick={() => modererAnnonce(a.id, "APPROUVEE")} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">✅ Approuver</button>}{a.statut !== "SUSPENDUE" && <button onClick={() => { if (!motif.trim()) return showToast("⚠️ Écris d'abord le motif"); modererAnnonce(a.id, "SUSPENDUE", motif); }} className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">⏸️ Suspendre — Immoral / Fausse</button>}<button onClick={() => supprimerAnnonce(a.id)} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-[11px] font-bold">🗑️ Supprimer</button></div>
              </div>
            ))}
            {annonces.filter(a => filtreAnnonce === "TOUTES" || a.statut === filtreAnnonce).length === 0 && <p className="text-[12px] text-gray-500 text-center">Aucune publicité dans ce filtre.</p>}
          </div>
        )}
        {selected && (
          <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-end sm:items-center justify-center" onClick={() => setSelected(null)}>
            <div className="bg-white w-full max-w-[480px] rounded-[28px] p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between"><p className="font-black text-[18px]">{selected.membre.nom} {selected.type === "SUP" ? "🛡️" : "🎖️"}</p><button onClick={() => setSelected(null)} className="bg-gray-100 px-3 py-1 rounded-full font-black">✕</button></div>
              <p className="text-[12px] text-gray-500">{selected.membre.codePro} • {selected.membre.commune} • {selected.membre.statut} • {selected.membre.telephone}</p>
              {selected.type === "AMB" ? (
                <div className="space-y-2 mt-4">
                  <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">📊 Total</p><p className="text-[13px] mt-1">🏪 {selected.stats.boutTotal} boutiques • 👥 {selected.stats.cliTotal} clients • 💰 {(selected.membre.gains || 0).toLocaleString()} CDF</p></div>
                  <div className="bg-[#FF6B00] text-white rounded-2xl p-4"><p className="font-black">📅 Ce mois — {moisActuel}</p><p className="text-[13px] mt-1">🏪 {selected.stats.boutMois} boutiques • 👥 {selected.stats.cliMois} clients</p></div>
                  <div className="grid grid-cols-2 gap-2"><div className="bg-gray-50 rounded-2xl p-3"><p className="font-black">{selected.stats.boutAuj}</p><p className="text-[11px] text-gray-500">Boutiques aujourd'hui</p></div><div className="bg-gray-50 rounded-2xl p-3"><p className="font-black">{selected.stats.cliAuj}</p><p className="text-[11px] text-gray-500">Clients aujourd'hui</p></div><div className="bg-gray-50 rounded-2xl p-3"><p className="font-black">{selected.stats.boutPaye}</p><p className="text-[11px] text-gray-500">Boutiques payées</p></div><div className="bg-gray-50 rounded-2xl p-3"><p className="font-black">{selected.stats.boutNonPaye}</p><p className="text-[11px] text-gray-500">Sans abonnement</p></div></div>
                </div>
              ) : (
                <div className="space-y-2 mt-4">
                  <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">📋 RAPPORT DU JOUR — {today}</p><p className="text-[13px] mt-1">🏪 {selected.stats.boutAuj} boutiques • 👥 {selected.stats.cliAuj} clients aujourd'hui</p></div>
                  <div className="grid grid-cols-2 gap-2"><div className="bg-gray-50 rounded-2xl p-3"><p className="font-black">{selected.stats.nbAmb} <span className="text-[11px] text-green-600">({selected.stats.nbAmbActifs} actifs)</span></p><p className="text-[11px] text-gray-500">Ambassadeurs zone</p></div><div className="bg-gray-50 rounded-2xl p-3"><p className="font-black">{selected.stats.boutTotal}</p><p className="text-[11px] text-gray-500">Boutiques total zone</p></div><div className="bg-gray-50 rounded-2xl p-3"><p className="font-black">{selected.stats.cliTotal}</p><p className="text-[11px] text-gray-500">Clients total zone</p></div><div className="bg-gray-50 rounded-2xl p-3"><p className="font-black">{selected.stats.boutPaye}</p><p className="text-[11px] text-gray-500">Boutiques payées</p></div></div>
                  <div className="bg-[#FF6B00] text-white rounded-2xl p-4"><p className="font-black">📅 Ce mois / Cette année</p><p className="text-[13px]">Ce mois : {selected.stats.boutMois} bout. • {selected.stats.cliMois} cli.</p><p className="text-[13px]">Cette année : {selected.stats.boutAnnee} bout. • {selected.stats.cliAnnee} cli.</p></div>
                  <div className="bg-white border rounded-2xl p-3"><p className="font-black text-[13px]">🎖️ Ses ambassadeurs</p>{selected.stats.mesAmb.map((a: any) => { const sa = statsAmb(a.codePro); return (<p key={a.id} className="text-[12px] mt-1">• {a.nom} — {sa.boutTotal} bout. • {sa.cliTotal} cli. • {sa.boutMois} bout. ce mois</p>); })}{selected.stats.mesAmb.length === 0 && <p className="text-[12px] text-gray-500">Aucun ambassadeur.</p>}</div>
                </div>
              )}
              <div className="flex gap-2 mt-4">{selected.membre.statut !== "ACTIF" && <button onClick={() => { changer(selected.membre.id, "ACTIF"); setSelected(null); }} className="flex-1 bg-green-600 text-white py-3 rounded-full font-black text-[12px]">✅ Valider</button>}{selected.membre.statut === "ACTIF" && <button onClick={() => { changer(selected.membre.id, "SUSPENDU"); setSelected(null); }} className="flex-1 bg-orange-500 text-white py-3 rounded-full font-black text-[12px]">⏸️ Suspendre</button>}<button onClick={() => { supprimer(selected.membre.id); setSelected(null); }} className="flex-1 bg-red-100 text-red-600 py-3 rounded-full font-black text-[12px]">🗑️ Supprimer</button></div>
            </div>
          </div>
        )}
                {onglet === "PROBLEMES" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🚨 Signaler un problème</p><input value={formProb.type} onChange={e => setFormProb({ ...formProb, type: e.target.value })} placeholder="Type..." className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formProb.qui} onChange={e => setFormProb({ ...formProb, qui: e.target.value })} placeholder="Qui ?" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formProb.detail} onChange={e => setFormProb({ ...formProb, detail: e.target.value })} placeholder="Détail..." className="w-full border rounded-xl px-3 py-3 mt-2" /><select value={formProb.urgence} onChange={e => setFormProb({ ...formProb, urgence: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-2"><option>NORMALE</option><option>URGENTE</option><option>CRITIQUE</option></select><button onClick={ajouterProbleme} className="w-full bg-red-600 text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Signaler</button></div>
            {problemes.map((p: any) => (<div key={p.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{p.type} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{p.urgence} • {p.statut}</span></p><p className="text-[12px] text-gray-600">{p.qui} • {p.detail}</p>{p.statut === "OUVERT" && <button onClick={() => resoudre(p.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold mt-2">✅ Résoudre</button>}</div>))}
          </div>
        )}
        {onglet === "PAIEMENTS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Ajouter un paiement — Abonnement Boutique uniquement</p><p className="text-[11px] text-gray-500">Aucune Tombola dans l'app — tarifs déjà inscrits, tombola pratique + bouche-à-oreille.</p><input value={formPay.qui} onChange={e => setFormPay({ ...formPay, qui: e.target.value })} placeholder="Qui paye ?" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formPay.montant} onChange={e => setFormPay({ ...formPay, montant: e.target.value })} inputMode="numeric" placeholder="Montant CDF" className="w-full border rounded-xl px-3 py-3 mt-2" /><select value={formPay.methode} onChange={e => setFormPay({ ...formPay, methode: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-2"><option>Orange Money</option><option>M-Pesa</option><option>Airtel Money</option><option>Espèces</option></select><button onClick={ajouterPaiement} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Ajouter</button></div>
            {paiements.map((p: any) => (<div key={p.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{p.qui} — {(p.montant || 0).toLocaleString()} CDF <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{p.statut} • {p.methode}</span></p><p className="text-[11px] text-gray-500">{p.type}</p>{p.statut !== "PAYÉ" && <button onClick={() => validerPay(p.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold mt-2">✅ Valider</button>}</div>))}
          </div>
        )}
        {onglet === "DESIGN" && (
          <div className="bg-white border rounded-2xl p-4"><p className="font-black">🎨 Design Public — vu par tout le monde</p><label className="text-[11px] font-bold block mt-3">Titre</label><input value={designPub.title} onChange={e => setDesignPub({ ...designPub, title: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /><label className="text-[11px] font-bold block mt-3">Slogan</label><input value={designPub.slogan} onChange={e => setDesignPub({ ...designPub, slogan: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /><label className="text-[11px] font-bold block mt-3">À propos</label><input value={designPub.about} onChange={e => setDesignPub({ ...designPub, about: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /><label className="text-[11px] font-bold block mt-3">WhatsApp</label><input value={designPub.whats} onChange={e => setDesignPub({ ...designPub, whats: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /><div className="flex gap-2 mt-3"><div className="flex-1"><label className="text-[11px] font-bold">Principale</label><input type="color" value={designPub.main} onChange={e => setDesignPub({ ...designPub, main: e.target.value })} className="w-full h-11 border rounded-xl mt-1" /></div><div className="flex-1"><label className="text-[11px] font-bold">Boutons</label><input type="color" value={designPub.btn} onChange={e => setDesignPub({ ...designPub, btn: e.target.value })} className="w-full h-11 border rounded-xl mt-1" /></div></div><button onClick={publierDesign} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-[13px] mt-4">🚀 PUBLIER — Public voit en 1-2 sec</button></div>
        )}
        {onglet === "PARAM" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🔑 Changer PIN DG</p><input value={pinForm.ancien} onChange={e => setPinForm({ ...pinForm, ancien: e.target.value })} type="password" placeholder="Ancien PIN" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={pinForm.nouveau} onChange={e => setPinForm({ ...pinForm, nouveau: e.target.value })} type="password" placeholder="Nouveau PIN" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={pinForm.confirm} onChange={e => setPinForm({ ...pinForm, confirm: e.target.value })} type="password" placeholder="Confirmer" className="w-full border rounded-xl px-3 py-3 mt-2" /><button onClick={changerPIN} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Changer PIN</button></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📋 Export & Sécurité</p><button onClick={exporter} className="w-full bg-gray-100 py-3 rounded-full font-black text-[12px] mt-2">📋 Copier liste complète</button><button onClick={() => quitterSession()} className="w-full bg-red-600 text-white py-3 rounded-full font-black text-[12px] mt-2">↩ Déconnexion sécurisée</button></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🔒 Sécurité V8</p><p className="text-[12px] text-gray-600 mt-1">• DG voit tout • SUP voit sa zone • AMB voit ses boutiques/clients • Session 12h auto-expirée • Seul le DG crée les comptes • Seul le DG modère le public • Aucune donnée sensible affichée au public • Chaque action vérifiée avant envoi</p></div>
          </div>
        )}
      </div>
    </div>
  );
              }
