"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase: any = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : null;

const TYPES_PUBLIC = ["CLIENT", "BOUTIQUE", "PRESTATAIRE", "GROSSISTE"];
const estPublic = (t: string) => TYPES_PUBLIC.includes((t || "").toUpperCase());

export default function DashboardDG() {
  const [pin, setPin] = useState(""); const [ok, setOk] = useState(false);
  const [membres, setMembres] = useState<any[]>([]);
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [problemes, setProblemes] = useState<any[]>([]);
  const [onglet, setOnglet] = useState("DASH");
  const [recherche, setRecherche] = useState("");
  const [toast, setToast] = useState("");
  const [config, setConfig] = useState<any>({ title: "", slogan: "", about: "", whats: "", main: "#FF6B00", btn: "#111111" });
  const [filtreType, setFiltreType] = useState("TOUS");
  const [motif, setMotif] = useState("");
  const [pctCommission, setPctCommission] = useState(10);
  const [prixAbo, setPrixAbo] = useState(50000);
  const [tombolaCfg, setTombolaCfg] = useState<any>({ lot: "1 Telephone + 50.000 CDF", plafond: 100, duree_jours: 7, regle_gagnant: "PLAFOND", active: false, statut: "FERMEE" });
  const [tempsTombola, setTempsTombola] = useState("");
  const [nouvelleAlerte, setNouvelleAlerte] = useState("");
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  const charger = async () => {
    if (!supabase) return;
    const [m, b, c, p, a, pr, cfg, t] = await Promise.all([
      supabase.from("membres").select("*").order("created_at", { ascending: false }),
      supabase.from("boutiques").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("paiements").select("*").order("created_at", { ascending: false }),
      supabase.from("annonces_publiques").select("*").order("created_at", { ascending: false }),
      supabase.from("problemes").select("*").order("created_at", { ascending: false }),
      supabase.from("config_publique").select("*").eq("id", 1).single(),
      supabase.from("tombola_config").select("*").eq("id", 1).single(),
    ]);
    if (m.data) setMembres(m.data);
    if (b.data) setBoutiques(b.data);
    if (c.data) setClients(c.data);
    if (p.data) setPaiements(p.data);
    if (a.data) setAnnonces(a.data);
    if (pr.data) setProblemes(pr.data);
    if (cfg.data) setConfig({ title: cfg.data.title, slogan: cfg.data.slogan, about: cfg.data.about, whats: cfg.data.whats, main: cfg.data.main_color, btn: cfg.data.btn_color });
    if (t.data) setTombolaCfg(t.data);
  };

  useEffect(() => {
    charger();
    if (!supabase) return;
    const ch = supabase.channel("wenze-reel-final")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "boutiques" }, (pay: any) => { setNouvelleAlerte(`🏪 Nouvelle boutique : ${pay.new.nom} - ${pay.new.commune}`); setTimeout(() => setNouvelleAlerte(""), 6000); charger(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "paiements" }, (pay: any) => { setNouvelleAlerte(`💰 Paiement recu : ${pay.new.qui} - ${Number(pay.new.montant).toLocaleString()} CDF`); setTimeout(() => setNouvelleAlerte(""), 6000); charger(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "membres" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "annonces_publiques" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "problemes" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "tombola_config" }, (pay: any) => { if (pay.new) setTombolaCfg(pay.new); charger(); })
      .subscribe();
    const interval = setInterval(charger, 10000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!tombolaCfg?.date_fin || !tombolaCfg?.active) return;
    const i = setInterval(() => {
      const rest = new Date(tombolaCfg.date_fin).getTime() - Date.now();
      if (rest <= 0) setTempsTombola("TERMINEE");
      else setTempsTombola(`${Math.floor(rest / 86400000)}j ${Math.floor((rest % 86400000) / 3600000)}h ${Math.floor((rest % 3600000) / 60000)}min`);
    }, 1000);
    return () => clearInterval(i);
  }, [tombolaCfg]);

  if (!ok) return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#0A0A0A] text-white p-6 flex flex-col justify-center">
      <p className="text-[28px] font-black">WENZE<span className="text-[#FF6B00]">.</span></p>
      <h1 className="font-black text-[24px] mt-4">👑 Bureau DG — Vraies donnees</h1>
      <p className="text-[12px] opacity-60">Aucune donnee fictive. Tout vient de Supabase. Temps reel.</p>
      <input value={pin} onChange={e => setPin(e.target.value)} type="password" inputMode="numeric" placeholder="PIN DG" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 mt-6 text-center text-[22px] tracking-[8px] outline-none" />
      <button onClick={() => pin === "2026" ? setOk(true) : show("❌ PIN incorrect")} className="w-full bg-[#FF6B00] py-4 rounded-full font-black mt-4">🔓 ENTRER</button>
      {toast && <p className="text-center text-[12px] mt-3 font-bold">{toast}</p>}
    </div>
  );
    // ===== REGLES REELLES =====
  const estActif = (s: string) => s === "ACTIF" || s === "VALIDEE" || s === "PAYE";
  const estPaye = (p: any) => p.statut === "PAYÉ" || p.statut === "PAYE";
  const premiers = paiements.filter(p => p.type === "PREMIER" && estPaye(p));
  const occasionnels = paiements.filter(p => p.type === "OCCASIONNELLE" && estPaye(p));
  const renouvellements = paiements.filter(p => p.type === "RENOUVELLEMENT" && estPaye(p));
  const baseCommission = [...premiers, ...occasionnels].reduce((s, p) => s + Number(p.montant || 0), 0);
  const totalVentes = paiements.filter(estPaye).reduce((s, p) => s + Number(p.montant || 0), 0);
  const commission = Math.round(baseCommission * pctCommission / 100);
  const benefice = totalVentes - commission;

  // ===== POINTS TOMBOLA / INVITATIONS - PUBLIC SEULEMENT =====
  const pointsDe = (codeInvitation: string) => {
    const boutInv = boutiques.filter(b => (b.code_invitation === codeInvitation || b.code_amb === codeInvitation) && estActif(b.statut) && estPublic(b.type_public || b.type || "BOUTIQUE"));
    const cliInv = clients.filter(c => (c.code_invitation === codeInvitation || c.code_parrain === codeInvitation) && c.statut === "ACTIF" && estPublic(c.type_public || c.type || "CLIENT"));
    const aboPayes = paiements.filter(p => { const b = boutiques.find(x => x.id === p.boutique_id); const codeB = b?.code_invitation || b?.code_amb || ""; return codeB === codeInvitation && estPaye(p) && (p.type === "PREMIER" || p.type === "OCCASIONNELLE"); });
    return { bout: boutInv.length, cli: cliInv.length, abo: aboPayes.length, ptsBout: boutInv.length * 5, ptsCli: cliInv.length * 3, ptsBonus: aboPayes.length * 20, total: boutInv.length * 5 + cliInv.length * 3 + aboPayes.length * 20 };
  };

  const statsMilieu = (liste: any[], niveau: string) => { const map = new Map<string, number>(); liste.forEach(x => { const k = x[niveau] || "Non precise"; map.set(k, (map.get(k) || 0) + 1); }); return [...map.entries()].sort((a, b) => b[1] - a[1]); };
  const sup = membres.filter(m => m.role === "SUPERVISEUR");
  const amb = membres.filter(m => m.role === "AMBASSADEUR");

  const participants = useMemo(() => {
    const map = new Map();
    [...boutiques, ...clients].forEach((u: any) => {
      const type = (u.type_public || u.type || (u.nomEtablissement ? "BOUTIQUE" : "CLIENT")).toUpperCase();
      if (!estPublic(type)) return;
      const code = u.code_pro || u.code_invitation || u.id;
      if (!map.has(code)) map.set(code, { id: u.id, nom: u.nom || u.proprietaire || "", telephone: u.telephone || u.whatsapp || "", type_public: type, code, commune: u.commune, quartier: u.quartier });
    });
    return [...map.values()].map(p => ({ ...p, pts: pointsDe(p.code) })).sort((a, b) => b.pts.total - a.pts.total);
  }, [boutiques, clients, paiements]);

  const classement = participants.filter(x => x.pts.total > 0);
  const gagnantPotentiel = classement[0];

  const validerPaiement = async (id: string) => { await supabase.from("paiements").update({ statut: "PAYÉ" }).eq("id", id); show("✅ Paiement valide — compta + points + tombola mis a jour"); charger(); };
  const moderer = async (id: string, statut: string) => { if (statut === "SUSPENDUE" && !motif.trim()) return show("⚠️ Ecris d'abord le motif"); await supabase.from("annonces_publiques").update({ statut, motif }).eq("id", id); show(statut === "APPROUVEE" ? "✅ Approuvee — visible au public" : "⏸️ Suspendue — plus visible"); setMotif(""); charger(); };
  const changerMembre = async (id: string, statut: string) => { await supabase.from("membres").update({ statut }).eq("id", id); show("✅ Mis a jour"); charger(); };
  const resoudre = async (id: string) => { await supabase.from("problemes").update({ statut: "RESOLU" }).eq("id", id); charger(); };
  const publierDesign = async () => { await supabase.from("config_publique").update({ title: config.title, slogan: config.slogan, about: config.about, whats: config.whats, main_color: config.main, btn_color: config.btn, updated_at: new Date().toISOString() }).eq("id", 1); show("✅ Publie — public voit en 1-2 sec"); };
  const lancerTombola = async () => { const debut = new Date(); const fin = new Date(debut.getTime() + Number(tombolaCfg.duree_jours || 7) * 24 * 3600 * 1000); await supabase.from("tombola_config").upsert({ id: 1, lot: tombolaCfg.lot, plafond: Number(tombolaCfg.plafond), regle_gagnant: tombolaCfg.regle_gagnant, duree_jours: Number(tombolaCfg.duree_jours), active: true, statut: "OUVERTE", date_debut: debut.toISOString(), date_fin: fin.toISOString(), gagnant_nom: null, gagnant_tel: null, gagnant_points: 0 }); await supabase.from("notifications_publiques").insert({ id: "tomb-" + Date.now(), titre: "🎟️ TOMBOLA LANCEE !", message: `Plafond : ${tombolaCfg.plafond} pts - Lot : ${tombolaCfg.lot} - ${tombolaCfg.duree_jours} jours`, type: "TOMBOLA" }); show(`✅ Tombola lancee ! Plafond ${tombolaCfg.plafond} pts`); charger(); };
  const fermerTombola = async () => { await supabase.from("tombola_config").update({ active: false, statut: "FERMEE" }).eq("id", 1); show("⏹️ Tombola fermee"); charger(); };
  const cloturerGagnant = async () => { if (!gagnantPotentiel) return show("Aucun joueur"); await supabase.from("tombola_config").update({ active: false, statut: "TERMINEE", gagnant_nom: gagnantPotentiel.nom, gagnant_tel: gagnantPotentiel.telephone, gagnant_points: gagnantPotentiel.pts.total }).eq("id", 1); await supabase.from("notifications_publiques").insert({ id: "gagn-" + Date.now(), titre: "🎉 GAGNANT TOMBOLA", message: `${gagnantPotentiel.nom} gagne avec ${gagnantPotentiel.pts.total} pts ! Lot : ${tombolaCfg.lot}`, type: "TOMBOLA" }); show("🏆 Gagnant : " + gagnantPotentiel.nom); charger(); };
  const validerBoutique = async (b: any) => { await supabase.from("boutiques").update({ statut: "VALIDEE", abonnement: "Freemium" }).eq("id", b.id); show(`✅ ${b.nom} validee ! Son inviteur gagne +5 pts Tombola`); charger(); };
  const rejeterBoutique = async (b: any) => { await supabase.from("boutiques").update({ statut: "REJETEE" }).eq("id", b.id); show("⛔ Boutique rejetee - 0 point"); charger(); };

  const ONGLETS = ["DASH", "TOMBOLA", "SUPERVISEURS", "AMBASSADEURS", "INVITATIONS", "COMPTA", "STATS", "BOUTIQUES", "MODERATION", "PAIEMENTS", "PROBLEMES", "DESIGN", "PARAMETRES"];
  const labelOnglet = (t: string) => t === "DASH" ? "📊 Dashboard" : t === "TOMBOLA" ? "🎟️ Tombola" : t === "SUPERVISEURS" ? `👔 Superviseurs (${sup.length})` : t === "AMBASSADEURS" ? `🎖️ Ambassadeurs (${amb.length})` : t === "INVITATIONS" ? "🏆 Invitations" : t === "COMPTA" ? "💰 Comptabilite" : t === "STATS" ? "📍 Stats Milieu" : t === "BOUTIQUES" ? "🏪 Boutiques" : t === "MODERATION" ? `🛡️ Moderation (${annonces.filter(a => a.statut === "EN_ATTENTE").length})` : t === "PAIEMENTS" ? "💰 Paiements" : t === "PROBLEMES" ? `🚨 Problemes (${problemes.filter(p => p.statut === "OUVERT").length})` : t === "PARAMETRES" ? "⚙️ Parametres" : "🎨 Design";
    return (
    <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
      {toast && <div className="fixed top-4 left-4 right-4 z-[60] bg-black text-white p-3 rounded-2xl text-[12px] font-bold text-center">{toast}</div>}
      {nouvelleAlerte && <div className="fixed top-16 left-4 right-4 z-[60] bg-[#FF6B00] text-white p-3 rounded-2xl text-[12px] font-bold text-center animate-bounce">{nouvelleAlerte}</div>}
      <div className="bg-black text-white px-5 pt-8 pb-6 rounded-b-[32px]">
        <p className="text-[11px] opacity-60">WENZE • DG • DONNEES REELLES • TEMPS REEL</p>
        <h1 className="font-black text-[24px]">👑 Tableau DG</h1>
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black">{sup.length}</p><p className="text-[9px]">SUPERVISEURS</p></div>
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black">{amb.length}</p><p className="text-[9px]">AMBASSADEURS</p></div>
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black">{boutiques.length}</p><p className="text-[9px]">BOUTIQUES</p></div>
          <div className="bg-[#FF6B00] rounded-2xl p-2"><p className="font-black">{clients.length}</p><p className="text-[9px]">CLIENTS</p></div>
        </div>
        {tombolaCfg.active && <div className="bg-[#FF6B00] rounded-2xl p-2 mt-2 text-center text-[11px] font-black">🎟️ TOMBOLA OUVERTE - Plafond {tombolaCfg.plafond} pts - ⏱️ {tempsTombola} - Lot : {tombolaCfg.lot}</div>}
      </div>
      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">{ONGLETS.map(t => <button key={t} onClick={() => setOnglet(t)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>{labelOnglet(t)}</button>)}</div>
      <div className="px-4 mt-4">
        {onglet === "DASH" && (
          <div className="space-y-3">
            {boutiques.length === 0 && clients.length === 0 && <div className="bg-yellow-100 border border-yellow-300 rounded-2xl p-4 text-[12px] font-bold">📭 Aucune donnee reelle pour l'instant. Des que le public creera une boutique ou un client, ca apparaitra ici automatiquement.</div>}
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Ventes reelles</p><p className="text-[13px] mt-1">Total : <b>{totalVentes.toLocaleString()} CDF</b> • Commission : <b>{commission.toLocaleString()} CDF</b> ({pctCommission}%) • Benefice : <b className={benefice >= 0 ? "text-green-600" : "text-red-600"}>{benefice.toLocaleString()} CDF</b></p></div>
            {tombolaCfg.active && <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">🎟️ Tombola en cours - {tombolaCfg.lot}</p><p className="text-[12px] mt-1">Plafond : {tombolaCfg.plafond} pts • Reste : {tempsTombola}</p><p className="text-[12px]">Top 1 : {gagnantPotentiel ? `${gagnantPotentiel.nom} - ${gagnantPotentiel.pts.total} pts` : "Aucun point"}</p><button onClick={() => setOnglet("TOMBOLA")} className="mt-2 bg-[#FF6B00] text-white px-4 py-2 rounded-full text-[11px] font-black">Voir Tombola →</button></div>}
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏆 Top 3 Concours — Points reels</p>{classement.slice(0, 3).map((c: any, i: number) => <p key={i} className="text-[12px] mt-1">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {c.nom} — {c.pts.total} pts ({c.pts.bout} bout. x5 + {c.pts.cli} cli. x3 + {c.pts.abo} abo. x20)</p>)}{classement.length === 0 && <p className="text-[12px] text-gray-500">Aucun point pour l'instant.</p>}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🚨 Problemes ouverts : {problemes.filter(p => p.statut === "OUVERT").length}</p><p className="text-[12px]">En attente paiements : {paiements.filter(p => !estPaye(p)).length} • Annonces en attente : {annonces.filter(a => a.statut === "EN_ATTENTE").length} • Boutiques en attente : {boutiques.filter(b => b.statut === "EN_ATTENTE").length}</p></div>
          </div>
        )}
        {onglet === "TOMBOLA" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">🎟️ Tombola a Points - Public Seulement</p><p className="text-[11px] opacity-80 mt-1">✅ Client, Boutique, Prestataire, Grossiste • ❌ Ambassadeur, Superviseur, DG ne jouent pas</p><p className="text-[11px] opacity-80">Statut : <b>{tombolaCfg.statut}</b> • Plafond : <b>{tombolaCfg.plafond} pts</b> • Lot : {tombolaCfg.lot}</p>{tombolaCfg.active && <p className="text-[12px] mt-1">⏱️ Ferme dans : {tempsTombola}</p>}{tombolaCfg.gagnant_nom && <p className="text-[13px] font-black text-yellow-300 mt-1">🏆 Gagnant : {tombolaCfg.gagnant_nom} - {tombolaCfg.gagnant_points} pts</p>}</div>
            <div className="bg-white border rounded-2xl p-4 space-y-3">
              <label className="block"><span className="text-[11px] font-black">Lot a gagner</span><input value={tombolaCfg.lot} onChange={e => setTombolaCfg({ ...tombolaCfg, lot: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label>
              <div className="flex gap-2"><label className="flex-1"><span className="text-[11px] font-black">🎯 Plafond (pts)</span><input type="number" value={tombolaCfg.plafond} onChange={e => setTombolaCfg({ ...tombolaCfg, plafond: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="flex-1"><span className="text-[11px] font-black">📅 Duree (jours)</span><input type="number" value={tombolaCfg.duree_jours} onChange={e => setTombolaCfg({ ...tombolaCfg, duree_jours: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label></div>
              <div className="flex gap-2"><button onClick={() => setTombolaCfg({ ...tombolaCfg, regle_gagnant: "PLAFOND" })} className={`flex-1 py-3 rounded-xl font-black text-[11px] ${tombolaCfg.regle_gagnant === "PLAFOND" ? "bg-black text-white" : "bg-gray-100"}`}>🏁 1er au plafond gagne</button><button onClick={() => setTombolaCfg({ ...tombolaCfg, regle_gagnant: "TOP_1_FIN" })} className={`flex-1 py-3 rounded-xl font-black text-[11px] ${tombolaCfg.regle_gagnant === "TOP_1_FIN" ? "bg-black text-white" : "bg-gray-100"}`}>🏆 Plus de pts a la fin gagne</button></div>
              {!tombolaCfg.active ? <button onClick={lancerTombola} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black">🚀 LANCER LA TOMBOLA - {tombolaCfg.plafond} pts - {tombolaCfg.duree_jours} jours</button> : <div className="flex gap-2"><button onClick={fermerTombola} className="flex-1 bg-red-600 text-white py-4 rounded-full font-black">⏹️ FERMER</button><button onClick={cloturerGagnant} className="flex-1 bg-black text-white py-4 rounded-full font-black">🏆 CLOTURER + GAGNANT</button></div>}
            </div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">👥 Participants - Public Seulement</p><p className="text-[11px] text-gray-500">Nom + Numero enregistres avec le profil.</p>{participants.map((p: any, i: number) => <div key={p.id} className="mt-3"><div className="flex justify-between"><p className="text-[12px] font-black">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`} {p.nom} - {p.telephone}</p><p className="text-[11px] font-black text-[#FF6B00]">{p.pts.total} / {tombolaCfg.plafond} pts</p></div><p className="text-[11px] text-gray-500">{p.type_public} • {p.commune} • Code : {p.code}</p><div className="w-full bg-gray-100 h-2.5 rounded-full mt-1"><div className="bg-[#FF6B00] h-2.5 rounded-full" style={{ width: `${Math.min(100, p.pts.total / (tombolaCfg.plafond || 100) * 100)}%` }} /></div><p className="text-[11px] text-gray-500 mt-1">{p.pts.bout} bout. x5 = {p.pts.ptsBout} • {p.pts.cli} cli. x3 = {p.pts.ptsCli} • {p.pts.abo} abos x20 = {p.pts.ptsBonus}</p></div>)}{participants.length === 0 && <p className="text-[12px] text-gray-500 mt-2">Aucun participant pour l'instant.</p>}</div>
          </div>
        )}
                {onglet === "SUPERVISEURS" && (
          <div className="space-y-2">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">👔 Superviseurs - DG SEUL</p><p className="text-[11px] opacity-80">Ils supervisent les Ambassadeurs. Ils ne jouent JAMAIS a la Tombola.</p></div>
            {sup.map((m: any) => <div key={m.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{m.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{m.statut} • {m.commune}</span></p><p className="text-[11px] text-gray-500">{m.telephone} • Code : {m.code_pro || m.code_invitation || "—"}</p><p className="text-[11px]">Ambassadeurs sous lui : {amb.filter(a => a.superviseur_id === m.id || a.code_sup === m.code_pro).length}</p><div className="flex gap-2 mt-2"><button onClick={() => changerMembre(m.id, "ACTIF")} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">✅ Activer</button><button onClick={() => changerMembre(m.id, "SUSPENDU")} className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[11px] font-black">⏸️ Suspendre</button><button onClick={() => changerMembre(m.id, "REJETE")} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-[11px] font-black">⛔ Rejeter</button></div></div>)}
            {sup.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun superviseur reel.</p>}
          </div>
        )}
        {onglet === "AMBASSADEURS" && (
          <div className="space-y-2">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">🎖️ Ambassadeurs - DG SEUL</p><p className="text-[11px] opacity-80">Ils creent des boutiques. Ils ne jouent JAMAIS a la Tombola. Leurs boutiques arrivent ici en temps reel.</p></div>
            {amb.map((m: any) => <div key={m.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{m.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{m.statut} • {m.commune} - {m.quartier}</span></p><p className="text-[11px] text-gray-500">{m.telephone} • Code : {m.code_pro || m.code_invitation || "—"}</p><p className="text-[11px]">🏪 Boutiques creees par lui : <b>{boutiques.filter(b => b.code_amb === m.code_pro || b.code_invitation === m.code_pro || b.code_invitation === m.id).length}</b></p><p className="text-[11px]">💰 Paiements de ses boutiques : <b>{paiements.filter(p => { const b = boutiques.find(x => x.id === p.boutique_id); return b && (b.code_amb === m.code_pro || b.code_invitation === m.code_pro); }).filter(p => p.statut === "PAYÉ" || p.statut === "PAYE").reduce((s, p) => s + Number(p.montant || 0), 0).toLocaleString()} CDF</b></p><div className="flex gap-2 mt-2"><button onClick={() => changerMembre(m.id, "ACTIF")} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">✅ Activer</button><button onClick={() => changerMembre(m.id, "SUSPENDU")} className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[11px] font-black">⏸️ Suspendre</button><button onClick={() => changerMembre(m.id, "REJETE")} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-[11px] font-black">⛔ Rejeter</button></div></div>)}
            {amb.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun ambassadeur reel.</p>}
          </div>
        )}
        {onglet === "INVITATIONS" && (
          <div className="space-y-2">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">🏆 Invitations — Reserve au public</p><p className="text-[11px] opacity-80 mt-1">Client actif = 3 pts • Boutique active = 5 pts • +20 pts par abonnement paye par l'invite. En attente / suspendu = 0 pt.</p></div>
            {classement.map((c: any, i: number) => <div key={i} className="bg-white border rounded-2xl p-4"><p className="font-black">{i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`} {c.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{c.type_public} • {c.commune}</span></p><p className="text-[12px] mt-1">{c.pts.bout} bout. x5 = {c.pts.ptsBout} pts • {c.pts.cli} cli. x3 = {c.pts.ptsCli} pts • {c.pts.abo} abo. payes x20 = {c.pts.ptsBonus} pts</p><p className="font-black text-[14px] mt-1">TOTAL : {c.pts.total} pts</p><p className="text-[11px] text-gray-500">{c.telephone}</p></div>)}
            {classement.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune invitation validee pour l'instant.</p>}
          </div>
        )}
        {onglet === "COMPTA" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">⚙️ Parametres DG</p><div className="flex gap-2 mt-2"><label className="text-[11px] flex-1">% Commission<input value={pctCommission} onChange={e => setPctCommission(Number(e.target.value))} type="number" className="w-full border rounded-xl px-3 py-2 mt-1" /></label><label className="text-[11px] flex-1">Prix abonnement CDF<input value={prixAbo} onChange={e => setPrixAbo(Number(e.target.value))} type="number" className="w-full border rounded-xl px-3 py-2 mt-1" /></label></div><p className="text-[11px] text-gray-500 mt-2">Commission = uniquement sur 1er abonnement + vente occasionnelle. Renouvellement = 0 CDF.</p></div>
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">💰 Comptabilite reelle - Instantanee</p><p className="text-[13px] mt-1">Ventes totales : {totalVentes.toLocaleString()} CDF</p><p className="text-[13px]">Base commission (1ers + occasionnelles) : {baseCommission.toLocaleString()} CDF</p><p className="text-[13px]">Renouvellements : {renouvellements.reduce((s, p) => s + Number(p.montant || 0), 0).toLocaleString()} CDF → commission 0 CDF</p><p className="text-[13px]">Commission ({pctCommission}%) : {commission.toLocaleString()} CDF</p><p className="font-black mt-1">Benefice net : {benefice.toLocaleString()} CDF</p></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📋 Rapport jour a jour — ce mois</p>{paiements.filter(p => estPaye(p)).slice(0, 20).map(p => <p key={p.id} className="text-[12px] mt-1">• {(p.created_at || "").slice(0, 10)} — {p.qui} — {Number(p.montant).toLocaleString()} CDF — {p.type} {p.type === "RENOUVELLEMENT" ? "(0 commission)" : `(${Math.round(Number(p.montant) * pctCommission / 100).toLocaleString()} CDF commission)`}</p>)}{paiements.filter(estPaye).length === 0 && <p className="text-[12px] text-gray-500">Aucun paiement reel.</p>}</div>
          </div>
        )}
        {onglet === "STATS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏪 Boutiques par Commune — Reel</p>{statsMilieu(boutiques, "commune").map(([k, v]) => <p key={k} className="text-[12px] mt-1">• {k} : <b>{v} boutiques</b></p>)}{boutiques.length === 0 && <p className="text-[12px] text-gray-500">Aucune boutique reelle.</p>}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏪 Boutiques par Quartier — Reel</p>{statsMilieu(boutiques, "quartier").map(([k, v]) => <p key={k} className="text-[12px] mt-1">• {k} : <b>{v}</b></p>)}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">👥 Clients par Commune — Reel</p>{statsMilieu(clients, "commune").map(([k, v]) => <p key={k} className="text-[12px] mt-1">• {k} : <b>{v} clients</b></p>)}{clients.length === 0 && <p className="text-[12px] text-gray-500">Aucun client reel.</p>}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">👥 Clients par Quartier — Reel</p>{statsMilieu(clients, "quartier").map(([k, v]) => <p key={k} className="text-[12px] mt-1">• {k} : <b>{v}</b></p>)}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🌍 Par Province — Reel</p><p className="text-[12px] mt-1">Boutiques : {statsMilieu(boutiques, "province").map(([k, v]) => `${k} (${v})`).join(", ") || "—"}</p><p className="text-[12px]">Clients : {statsMilieu(clients, "province").map(([k, v]) => `${k} (${v})`).join(", ") || "—"}</p></div>
          </div>
        )}
                {onglet === "BOUTIQUES" && (
          <div className="space-y-2">
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher boutique reelle..." className="w-full border rounded-full px-3 py-2.5 text-[12px]" />
            {boutiques.filter(b => b.nom.toLowerCase().includes(recherche.toLowerCase())).map(b => <div key={b.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{b.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{b.statut} • {b.abonnement}</span></p><p className="text-[11px] text-gray-500">{b.proprietaire} • {b.telephone} • 📍 {b.commune} — {b.quartier}</p><p className="text-[11px]">Type : {b.type_abonnement} • Code invitation : {b.code_invitation || "—"} • Inviteur : {b.code_amb || "—"}</p>{b.statut === "EN_ATTENTE" && <div className="flex gap-2 mt-2"><button onClick={() => validerBoutique(b)} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">✅ Valider - +5 pts inviteur</button><button onClick={() => rejeterBoutique(b)} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-[11px] font-black">⛔ Rejeter</button></div>}</div>)}
            {boutiques.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune boutique reelle.</p>}
          </div>
        )}
        {onglet === "MODERATION" && (
          <div className="space-y-3">
            <div className="bg-red-600 text-white rounded-2xl p-4"><p className="font-black">🛡️ Moderation DG</p><p className="text-[11px] opacity-90">Seul le DG approuve. Le public ne voit que les APPROUVEES.</p></div>
            <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Motif DG avant de suspendre..." className="w-full border rounded-xl px-3 py-3 text-[12px]" />
            {annonces.map(a => <div key={a.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{a.titre} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{a.statut}</span></p><p className="text-[12px] text-gray-600">{a.description}</p><p className="text-[11px] text-gray-500">{a.auteur} • {a.telephone} • {a.commune} • {Number(a.prix || 0).toLocaleString()} CDF</p>{a.motif && <p className="text-[11px] text-red-600 font-bold">Motif : {a.motif}</p>}<div className="flex gap-1.5 mt-2"><button onClick={() => moderer(a.id, "APPROUVEE")} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">✅ Approuver</button><button onClick={() => moderer(a.id, "SUSPENDUE")} className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">⏸️ Suspendre</button><button onClick={() => moderer(a.id, "SUPPRIMEE")} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-[11px] font-bold">🗑️ Supprimer</button></div></div>)}
            {annonces.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune annonce reelle.</p>}
          </div>
        )}
        {onglet === "PAIEMENTS" && (
          <div className="space-y-3">
            <div className="flex gap-1.5">{["TOUS", "PREMIER", "RENOUVELLEMENT", "OCCASIONNELLE"].map(f => <button key={f} onClick={() => setFiltreType(f)} className={`px-3 py-2 rounded-full text-[11px] font-black ${filtreType === f ? "bg-black text-white" : "bg-white border"}`}>{f === "TOUS" ? "Tous" : f === "PREMIER" ? "🆕 1er" : f === "RENOUVELLEMENT" ? "🔄 Renouv." : "🎯 Occas."}</button>)}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Boutiques ayant paye — Reel - Instantane</p><p className="text-[12px]">Total encaisse : {totalVentes.toLocaleString()} CDF • Payees : {paiements.filter(estPaye).length}</p></div>
            {paiements.filter(p => estPaye(p) && (filtreType === "TOUS" || p.type === filtreType)).map(p => <div key={p.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{p.qui} — {Number(p.montant).toLocaleString()} CDF <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{p.type} • {p.methode} • {(p.created_at || "").slice(0, 10)}</span></p><p className="text-[11px]">{p.type === "RENOUVELLEMENT" ? "🔄 Renouvellement — Commission 0 CDF" : `🆕 Commission ${Math.round(Number(p.montant) * pctCommission / 100).toLocaleString()} CDF (${pctCommission}%)`}</p></div>)}
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">⏳ En attente de validation</p>{paiements.filter(p => !estPaye(p)).map(p => <div key={p.id} className="flex justify-between items-center mt-2"><p className="text-[12px]">{p.qui} — {Number(p.montant).toLocaleString()} CDF — {p.type}</p><button onClick={() => validerPaiement(p.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">✅ Valider</button></div>)}{paiements.filter(p => !estPaye(p)).length === 0 && <p className="text-[12px] text-gray-500">Aucun en attente.</p>}</div>
          </div>
        )}
        {onglet === "PROBLEMES" && (
          <div className="space-y-2">{problemes.map(p => <div key={p.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{p.type} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{p.urgence} • {p.statut}</span></p><p className="text-[12px]">{p.qui} • {p.detail}</p>{p.statut === "OUVERT" && <button onClick={() => resoudre(p.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold mt-2">✅ Resoudre</button>}</div>)}{problemes.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun probleme reel.</p>}</div>
        )}
        {onglet === "DESIGN" && (
          <div className="bg-white border rounded-2xl p-4"><p className="font-black">🎨 Design Public</p><input value={config.title} onChange={e => setConfig({ ...config, title: e.target.value })} placeholder="Titre" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={config.slogan} onChange={e => setConfig({ ...config, slogan: e.target.value })} placeholder="Slogan" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={config.about} onChange={e => setConfig({ ...config, about: e.target.value })} placeholder="A propos" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={config.whats} onChange={e => setConfig({ ...config, whats: e.target.value })} placeholder="WhatsApp" className="w-full border rounded-xl px-3 py-3 mt-2" /><button onClick={publierDesign} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-[13px] mt-3">🚀 PUBLIER — Public voit en 1-2 sec</button></div>
        )}
        {onglet === "PARAMETRES" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">⚙️ Parametres DG - Tout WENZE</p><p className="text-[11px] opacity-80">Seul le DG change ca. Ca s'applique partout, en temps reel.</p></div>
            <div className="bg-white border rounded-2xl p-4 space-y-3"><p className="font-black">💰 Argent</p><label className="block text-[11px] font-black">% Commission (1er + Occasionnelle)<input value={pctCommission} onChange={e => setPctCommission(Number(e.target.value))} type="number" className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="block text-[11px] font-black">Prix Abonnement CDF<input value={prixAbo} onChange={e => setPrixAbo(Number(e.target.value))} type="number" className="w-full border rounded-xl px-3 py-3 mt-1" /></label><p className="text-[11px] text-gray-500">Renouvellement = 0 CDF de commission, toujours.</p></div>
            <div className="bg-white border rounded-2xl p-4 space-y-3"><p className="font-black">🎟️ Tombola - Points</p><p className="text-[12px]">Client finalise = <b>3 pts</b> • Boutique validee = <b>5 pts</b> • Abonnement paye par l'invite = <b>20 pts</b></p><p className="text-[11px] text-gray-500">Public seulement : Client, Boutique, Prestataire, Grossiste. Ambassadeur / Superviseur = 0 pt, jamais dans le classement.</p><label className="block text-[11px] font-black">Plafond par defaut<input value={tombolaCfg.plafond} onChange={e => setTombolaCfg({ ...tombolaCfg, plafond: Number(e.target.value) })} type="number" className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="block text-[11px] font-black">Duree par defaut (jours)<input value={tombolaCfg.duree_jours} onChange={e => setTombolaCfg({ ...tombolaCfg, duree_jours: Number(e.target.value) })} type="number" className="w-full border rounded-xl px-3 py-3 mt-1" /></label></div>
            <div className="bg-white border rounded-2xl p-4 space-y-3"><p className="font-black">🏪 Regles Boutiques</p><p className="text-[12px]">✅ Boutique creee par Ambassadeur ou Public = <b>EN_ATTENTE</b> → DG valide → Visible au Public</p><p className="text-[12px]">✅ Boutique non validee = <b>0 point</b> pour l'inviteur</p><p className="text-[12px]">✅ Annonce = <b>EN_ATTENTE</b> → DG approuve → Visible au Public</p></div>
            <button onClick={() => show("✅ Parametres enregistres dans cette session DG")} className="w-full bg-black text-white py-4 rounded-full font-black">💾 ENREGISTRER PARAMETRES</button>
          </div>
        )}
      </div>
    </div>
  );
}
