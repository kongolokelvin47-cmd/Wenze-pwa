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
  // ✅ NOUVEAU - Notifications personnalisées
  const [notifsPerso, setNotifsPerso] = useState<any[]>([]);
  const [titreAnnonce, setTitreAnnonce] = useState("");
  const [msgAnnonce, setMsgAnnonce] = useState("");
  const [cibleAnnonce, setCibleAnnonce] = useState("TOUS");
  const [personneAnnonce, setPersonneAnnonce] = useState("");
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  // ===== NOTIFICATIONS PERSONNALISEES DG =====
  const notifier = async (d: { user_id?: string, type_compte?: string, code_invitation?: string, titre: string, message: string, type: string, lien?: string }) => {
    if (!supabase) return;
    await supabase.from("notifications_perso").insert({
      id: "notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      user_id: d.user_id || null, type_compte: d.type_compte || "TOUS", code_invitation: d.code_invitation || null,
      titre: d.titre, message: d.message, type: d.type, lien: d.lien || "", lu: false,
    });
  };
  const envoyerAnnonceDG = async () => {
    if (!titreAnnonce.trim() || !msgAnnonce.trim()) return show("⚠️ Écris titre + message");
    if (cibleAnnonce === "UNE_PERSONNE" && !personneAnnonce) return show("⚠️ Choisis la personne");
    await notifier({ user_id: cibleAnnonce === "UNE_PERSONNE" ? personneAnnonce : undefined, type_compte: cibleAnnonce === "UNE_PERSONNE" ? "TOUS" : cibleAnnonce, titre: titreAnnonce, message: msgAnnonce, type: "ANNONCE_DG", lien: "/" });
    show(cibleAnnonce === "UNE_PERSONNE" ? "📢 Annonce envoyée à 1 personne seule !" : `📢 Annonce envoyée pour : ${cibleAnnonce} !`);
    setTitreAnnonce(""); setMsgAnnonce(""); charger();
  };

  const charger = async () => {
    if (!supabase) return;
    const [m, b, c, p, a, pr, cfg, t, np] = await Promise.all([
      supabase.from("membres").select("*").order("created_at", { ascending: false }),
      supabase.from("boutiques").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("paiements").select("*").order("created_at", { ascending: false }),
      supabase.from("annonces_publiques").select("*").order("created_at", { ascending: false }),
      supabase.from("problemes").select("*").order("created_at", { ascending: false }),
      supabase.from("config_publique").select("*").eq("id", 1).single(),
      supabase.from("tombola_config").select("*").eq("id", 1).single(),
      supabase.from("notifications_perso").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (m.data) setMembres(m.data);
    if (b.data) setBoutiques(b.data);
    if (c.data) setClients(c.data);
    if (p.data) setPaiements(p.data);
    if (a.data) setAnnonces(a.data);
    if (pr.data) setProblemes(pr.data);
    if (cfg.data) setConfig({ title: cfg.data.title, slogan: cfg.data.slogan, about: cfg.data.about, whats: cfg.data.whats, main: cfg.data.main_color, btn: cfg.data.btn_color });
    if (t.data) setTombolaCfg(t.data);
    if (np.data) setNotifsPerso(np.data);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications_perso" }, charger)
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

  // ===== ACTIONS DG - TOUTES AVEC NOTIFICATION PERSONNALISEE =====
  const validerPaiement = async (id: string) => {
    const p = paiements.find(x => x.id === id);
    await supabase.from("paiements").update({ statut: "PAYÉ" }).eq("id", id);
    if (p) {
      const b = boutiques.find(x => x.id === p.boutique_id);
      await notifier({ user_id: p.boutique_id || p.user_id || b?.id, titre: "💰 Paiement validé !", message: `Ton paiement de ${Number(p.montant || 0).toLocaleString()} CDF (${p.type}) a été validé par le DG.`, type: "PAIEMENT", lien: "/profil" });
      if (b && (b.code_invitation || b.code_amb) && (p.type === "PREMIER" || p.type === "OCCASIONNELLE")) {
        await notifier({ user_id: b.code_invitation || b.code_amb, titre: "🎉 +20 pts Tombola !", message: `Ton invité ${b.nom} a payé son abonnement. Tu gagnes +20 pts.`, type: "TOMBOLA", lien: "/" });
      }
    }
    show("✅ Paiement valide — compta + points + tombola mis a jour"); charger();
  };
  const moderer = async (id: string, statut: string) => {
    if (statut === "SUSPENDUE" && !motif.trim()) return show("⚠️ Ecris d'abord le motif");
    const a = annonces.find(x => x.id === id);
    await supabase.from("annonces_publiques").update({ statut, motif }).eq("id", id);
    if (a) {
      if (statut === "APPROUVEE") await notifier({ user_id: a.user_id || a.auteur_id || a.boutique_id, titre: "✅ Ton annonce est approuvée !", message: `"${a.titre}" est maintenant visible sur WENZE.`, type: "MODERATION", lien: "/" });
      if (statut === "SUSPENDUE") await notifier({ user_id: a.user_id || a.auteur_id || a.boutique_id, titre: "⏸️ Ton annonce est suspendue", message: `Motif du DG : ${motif}`, type: "MODERATION", lien: "/profil" });
    }
    show(statut === "APPROUVEE" ? "✅ Approuvee — visible au public" : "⏸️ Suspendue — plus visible"); setMotif(""); charger();
  };
  const changerMembre = async (id: string, statut: string) => {
    const m = membres.find(x => x.id === id);
    await supabase.from("membres").update({ statut }).eq("id", id);
    if (m) await notifier({ user_id: m.id, type_compte: m.role, titre: statut === "ACTIF" ? "✅ Ton compte est activé !" : "⏸️ Ton compte est suspendu", message: statut === "ACTIF" ? "Le DG a activé ton compte. Tu peux travailler." : "Le DG a suspendu ton compte. Contacte-le.", type: "COMPTE", lien: "/profil" });
    show("✅ Mis a jour"); charger();
  };
  const resoudre = async (id: string) => {
    const pb = problemes.find(x => x.id === id);
    await supabase.from("problemes").update({ statut: "RESOLU" }).eq("id", id);
    if (pb) await notifier({ user_id: pb.user_id || pb.qui_id || pb.boutique_id, titre: "✅ Ton problème est résolu !", message: `Le DG a résolu : ${pb.type} - ${pb.detail || ""}`, type: "PROBLEME", lien: "/profil" });
    charger();
  };
  const publierDesign = async () => { await supabase.from("config_publique").update({ title: config.title, slogan: config.slogan, about: config.about, whats: config.whats, main_color: config.main, btn_color: config.btn, updated_at: new Date().toISOString() }).eq("id", 1); show("✅ Publie — public voit en 1-2 sec"); };
  const lancerTombola = async () => {
    const debut = new Date(); const fin = new Date(debut.getTime() + Number(tombolaCfg.duree_jours || 7) * 24 * 3600 * 1000);
    await supabase.from("tombola_config").upsert({ id: 1, lot: tombolaCfg.lot, plafond: Number(tombolaCfg.plafond), regle_gagnant: tombolaCfg.regle_gagnant, duree_jours: Number(tombolaCfg.duree_jours), active: true, statut: "OUVERTE", date_debut: debut.toISOString(), date_fin: fin.toISOString(), gagnant_nom: null, gagnant_tel: null, gagnant_points: 0 });
    for (const t of TYPES_PUBLIC) { await notifier({ type_compte: t, titre: "🎟️ TOMBOLA LANCEE !", message: `Plafond : ${tombolaCfg.plafond} pts - Lot : ${tombolaCfg.lot} - ${tombolaCfg.duree_jours} jours. Invite et gagne des points !`, type: "TOMBOLA", lien: "/" }); }
    show(`✅ Tombola lancee ! Plafond ${tombolaCfg.plafond} pts`); charger();
  };
  const fermerTombola = async () => { await supabase.from("tombola_config").update({ active: false, statut: "FERMEE" }).eq("id", 1); show("⏹️ Tombola fermee"); charger(); };
  const cloturerGagnant = async () => {
    if (!gagnantPotentiel) return show("Aucun joueur");
    await supabase.from("tombola_config").update({ active: false, statut: "TERMINEE", gagnant_nom: gagnantPotentiel.nom, gagnant_tel: gagnantPotentiel.telephone, gagnant_points: gagnantPotentiel.pts.total }).eq("id", 1);
    await notifier({ user_id: gagnantPotentiel.id, titre: "🏆 TU AS GAGNÉ LA TOMBOLA !", message: `Bravo ${gagnantPotentiel.nom} ! Tu gagnes avec ${gagnantPotentiel.pts.total} pts. Lot : ${tombolaCfg.lot}. Contacte le DG.`, type: "TOMBOLA", lien: "/" });
    for (const t of TYPES_PUBLIC) { await notifier({ type_compte: t, titre: "🎉 GAGNANT TOMBOLA", message: `${gagnantPotentiel.nom} gagne avec ${gagnantPotentiel.pts.total} pts ! Lot : ${tombolaCfg.lot}`, type: "TOMBOLA", lien: "/" }); }
    show("🏆 Gagnant : " + gagnantPotentiel.nom); charger();
  };
  const validerBoutique = async (b: any) => {
    await supabase.from("boutiques").update({ statut: "VALIDEE", abonnement: "Freemium" }).eq("id", b.id);
    await notifier({ user_id: b.id, titre: "✅ Ta boutique est validée !", message: `${b.nom} est maintenant visible sur WENZE.`, type: "BOUTIQUE", lien: "/boutiques" });
    if (b.code_invitation || b.code_amb) { await notifier({ user_id: b.code_invitation || b.code_amb, titre: "🎉 +5 pts Tombola !", message: `Ta boutique invitée ${b.nom} a été validée par le DG. Tu gagnes +5 pts.`, type: "TOMBOLA", lien: "/" }); }
    show(`✅ ${b.nom} validee ! Son inviteur gagne +5 pts Tombola`); charger();
  };
  const rejeterBoutique = async (b: any) => {
    await supabase.from("boutiques").update({ statut: "REJETEE" }).eq("id", b.id);
    await notifier({ user_id: b.id, titre: "⛔ Ta boutique est rejetée", message: `Ta boutique ${b.nom} n'a pas été validée par le DG. Corrige et réessaie.`, type: "BOUTIQUE", lien: "/profil" });
    show("⛔ Boutique rejetee - 0 point"); charger();
  };

  // ===== FILTRES =====
  const filtre = (x: any) => {
    if (filtreType !== "TOUS" && (x.type_public || x.type || x.role) !== filtreType && !(filtreType === "CLIENT" && !x.type_public && !x.type)) return false;
    if (!recherche) return true;
    const s = recherche.toLowerCase();
    return (x.nom || x.proprietaire || x.telephone || x.whatsapp || x.commune || x.quartier || "").toLowerCase().includes(s);
  };

  const ONGLETS = ["DASH", "TOMBOLA", "NOTIFICATIONS", "SUPERVISEURS", "AMBASSADEURS", "INVITATIONS", "COMPTA", "STATS", "BOUTIQUES", "MODERATION", "PAIEMENTS", "PROBLEMES", "DESIGN", "PARAMETRES"];
  const labelOnglet = (t: string) => t === "DASH" ? "📊 Dashboard" : t === "TOMBOLA" ? "🎟️ Tombola" : t === "NOTIFICATIONS" ? `📢 Notifications (${notifsPerso.length})` : t === "SUPERVISEURS" ? `👔 Superviseurs (${sup.length})` : t === "AMBASSADEURS" ? `🎖️ Ambassadeurs (${amb.length})` : t === "INVITATIONS" ? "🏆 Invitations" : t === "COMPTA" ? "💰 Comptabilite" : t === "STATS" ? "📍 Stats Milieu" : t === "BOUTIQUES" ? "🏪 Boutiques" : t === "MODERATION" ? `🛡️ Moderation (${annonces.filter(a => a.statut === "EN_ATTENTE").length})` : t === "PAIEMENTS" ? "💰 Paiements" : t === "PROBLEMES" ? `🚨 Problemes (${problemes.filter(p => p.statut === "OUVERT").length})` : t === "PARAMETRES" ? "⚙️ Parametres" : "🎨 Design";
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
      <div className="px-4 mt-3 flex gap-2">
        <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="🔍 Rechercher nom, téléphone, commune..." className="flex-1 border rounded-full px-4 py-2.5 text-[12px] bg-white outline-none" />
        <select value={filtreType} onChange={e => setFiltreType(e.target.value)} className="border rounded-full px-2 py-2.5 text-[11px] bg-white font-black">
          <option value="TOUS">TOUS</option><option value="CLIENT">CLIENT</option><option value="BOUTIQUE">BOUTIQUE</option><option value="PRESTATAIRE">PRESTATAIRE</option><option value="GROSSISTE">GROSSISTE</option><option value="AMBASSADEUR">AMBASSADEUR</option><option value="SUPERVISEUR">SUPERVISEUR</option>
        </select>
      </div>
      <div className="px-4 mt-4">
        {onglet === "DASH" && (
          <div className="space-y-3">
            {boutiques.length === 0 && clients.length === 0 && <div className="bg-yellow-100 border border-yellow-300 rounded-2xl p-4 text-[12px] font-bold">📭 Aucune donnee reelle pour l'instant.</div>}
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Ventes reelles</p><p className="text-[13px] mt-1">Total : <b>{totalVentes.toLocaleString()} CDF</b> • Commission : <b>{commission.toLocaleString()} CDF</b> ({pctCommission}%) • Benefice : <b className={benefice >= 0 ? "text-green-600" : "text-red-600"}>{benefice.toLocaleString()} CDF</b></p><p className="text-[11px] text-gray-500 mt-1">Premiers : {premiers.length} • Occasionnels : {occasionnels.length} • Renouvellements : {renouvellements.length}</p></div>
            {tombolaCfg.active && <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">🎟️ Tombola en cours - {tombolaCfg.lot}</p><p className="text-[12px] mt-1">Plafond : {tombolaCfg.plafond} pts • Reste : {tempsTombola}</p><p className="text-[12px]">Top 1 : {gagnantPotentiel ? `${gagnantPotentiel.nom} - ${gagnantPotentiel.pts.total} pts` : "Aucun point"}</p><button onClick={() => setOnglet("TOMBOLA")} className="mt-2 bg-[#FF6B00] text-white px-4 py-2 rounded-full text-[11px] font-black">Voir Tombola →</button></div>}
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏆 Top 3 Concours — Points reels</p>{classement.slice(0, 3).map((c: any, i: number) => <p key={i} className="text-[12px] mt-1">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {c.nom} — {c.pts.total} pts ({c.pts.bout} bout. x5 + {c.pts.cli} cli. x3 + {c.pts.abo} abo. x20)</p>)}{classement.length === 0 && <p className="text-[12px] text-gray-500">Aucun point pour l'instant.</p>}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🚨 Problemes ouverts : {problemes.filter(p => p.statut === "OUVERT").length}</p><p className="text-[12px]">En attente paiements : {paiements.filter(p => !estPaye(p)).length} • Annonces en attente : {annonces.filter(a => a.statut === "EN_ATTENTE").length} • Boutiques en attente : {boutiques.filter(b => b.statut === "EN_ATTENTE").length}</p></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📢 Dernières notifications envoyées</p>{notifsPerso.slice(0, 3).map((n: any) => <p key={n.id} className="text-[11px] mt-1">• {n.titre} → Pour : {n.user_id ? "1 personne" : n.type_compte} {n.lu ? "✅ Lue" : "🔴 Non lue"}</p>)}{notifsPerso.length === 0 && <p className="text-[11px] text-gray-500">Aucune notification envoyée.</p>}<button onClick={() => setOnglet("NOTIFICATIONS")} className="mt-2 bg-black text-white px-4 py-2 rounded-full text-[11px] font-black">Envoyer une annonce DG →</button></div>
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
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">👥 Participants - Public Seulement</p>{participants.map((p: any, i: number) => <div key={p.id} className="mt-3 border rounded-2xl p-3"><div className="flex justify-between"><p className="font-black text-[12px]">{i + 1}. {p.nom} - {p.type_public}</p><p className="font-black text-[12px] text-[#FF6B00]">{p.pts.total} pts</p></div><p className="text-[11px] text-gray-600">{p.telephone} • {p.commune} {p.quartier || ""} • Code : {p.code}</p><p className="text-[11px] mt-1">{p.pts.bout} bout. x5 = {p.pts.ptsBout} pts • {p.pts.cli} cli. x3 = {p.pts.ptsCli} pts • {p.pts.abo} abo. x20 = {p.pts.ptsBonus} pts</p></div>)}{participants.length === 0 && <p className="text-[12px] text-gray-500 mt-2">Aucun participant.</p>}</div>
          </div>
        )}
        {onglet === "NOTIFICATIONS" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">📢 Annonce DG - Pour qui ?</p><p className="text-[11px] opacity-80 mt-1">Tu choisis qui voit. Les autres ne voient rien.</p></div>
            <div className="bg-white border rounded-2xl p-4 space-y-3">
              <label className="block"><span className="text-[11px] font-black">Titre de l'annonce</span><input value={titreAnnonce} onChange={e => setTitreAnnonce(e.target.value)} placeholder="Ex: Nouvelle règle Tombola" className="w-full border rounded-xl px-3 py-3 mt-1" /></label>
              <label className="block"><span className="text-[11px] font-black">Message</span><textarea value={msgAnnonce} onChange={e => setMsgAnnonce(e.target.value)} placeholder="Écris ton message ici..." className="w-full border rounded-xl px-3 py-3 mt-1" rows={3} /></label>
              <div><p className="text-[11px] font-black mb-2">Pour qui ?</p><div className="flex gap-1.5 flex-wrap">{["TOUS", "CLIENT", "BOUTIQUE", "PRESTATAIRE", "GROSSISTE", "AMBASSADEUR", "SUPERVISEUR", "UNE_PERSONNE"].map(t => <button key={t} onClick={() => setCibleAnnonce(t)} className={`px-3 py-2 rounded-full text-[11px] font-black ${cibleAnnonce === t ? "bg-black text-white" : "bg-gray-100"}`}>{t === "TOUS" ? "🌍 TOUS" : t === "UNE_PERSONNE" ? "👤 1 Personne seule" : t}</button>)}</div></div>
              {cibleAnnonce === "UNE_PERSONNE" && (<div><p className="text-[11px] font-black mb-2">Choisis la personne :</p><select value={personneAnnonce} onChange={e => setPersonneAnnonce(e.target.value)} className="w-full border rounded-xl px-3 py-3"><option value="">-- Choisir --</option>{[...boutiques, ...clients, ...membres].map((u: any) => <option key={u.id} value={u.id}>{u.nom || u.proprietaire || u.telephone} - {u.type_public || u.type || u.role} - {u.telephone || u.whatsapp}</option>)}</select></div>)}
              <button onClick={envoyerAnnonceDG} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black">📢 ENVOYER L'ANNONCE {cibleAnnonce === "UNE_PERSONNE" ? "À 1 PERSONNE" : `POUR ${cibleAnnonce}`}</button>
            </div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📜 Historique ({notifsPerso.length})</p>{notifsPerso.length === 0 && <p className="text-[12px] text-gray-500 mt-3">Aucune notification envoyée.</p>}{notifsPerso.slice(0, 30).map((n: any) => <div key={n.id} className="mt-3 border rounded-2xl p-3"><div className="flex justify-between gap-2"><p className="font-black text-[12px]">{n.titre}</p><span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{n.type}</span></div><p className="text-[11px] text-gray-600 mt-1">{n.message}</p><p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()} • {n.user_id ? " Pour 1 personne" : ` Pour : ${n.type_compte}`} • {n.lu ? " ✅ Lue" : " 🔴 Non lue"}</p></div>)}</div>
          </div>
        )}
        {onglet === "SUPERVISEURS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">👔 Superviseurs ({sup.length})</p><p className="text-[11px] text-gray-500">Ils ne jouent PAS à la Tombola.</p></div>
            {sup.filter(filtre).map((m: any) => <div key={m.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{m.nom || m.telephone}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{m.statut || "ACTIF"}</span></div><p className="text-[11px] text-gray-600 mt-1">{m.telephone || m.whatsapp} • {m.commune || ""} • Code : {m.code_pro || m.code_invitation || m.id}</p><div className="flex gap-2 mt-3"><button onClick={() => changerMembre(m.id, "ACTIF")} className="flex-1 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Activer</button><button onClick={() => changerMembre(m.id, "SUSPENDU")} className="flex-1 bg-red-600 text-white py-2.5 rounded-full text-[11px] font-black">⏸️ Suspendre</button><button onClick={() => { setPersonneAnnonce(m.id); setCibleAnnonce("UNE_PERSONNE"); setOnglet("NOTIFICATIONS"); }} className="flex-1 bg-black text-white py-2.5 rounded-full text-[11px] font-black">📢 Notifier</button></div></div>)}
            {sup.filter(filtre).length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun superviseur.</p>}
          </div>
        )}
        {onglet === "AMBASSADEURS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🎖️ Ambassadeurs ({amb.length})</p><p className="text-[11px] text-gray-500">Ils ne jouent PAS à la Tombola.</p></div>
            {amb.filter(filtre).map((m: any) => <div key={m.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{m.nom || m.telephone}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{m.statut || "ACTIF"}</span></div><p className="text-[11px] text-gray-600 mt-1">{m.telephone || m.whatsapp} • {m.commune || ""} • Code : {m.code_pro || m.code_invitation || m.id}</p><div className="flex gap-2 mt-3"><button onClick={() => changerMembre(m.id, "ACTIF")} className="flex-1 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Activer</button><button onClick={() => changerMembre(m.id, "SUSPENDU")} className="flex-1 bg-red-600 text-white py-2.5 rounded-full text-[11px] font-black">⏸️ Suspendre</button><button onClick={() => { setPersonneAnnonce(m.id); setCibleAnnonce("UNE_PERSONNE"); setOnglet("NOTIFICATIONS"); }} className="flex-1 bg-black text-white py-2.5 rounded-full text-[11px] font-black">📢 Notifier</button></div></div>)}
            {amb.filter(filtre).length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun ambassadeur.</p>}
          </div>
        )}
                {onglet === "INVITATIONS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏆 Invitations - Classement Tombola</p><p className="text-[11px] text-gray-500">Boutique validée = +5 pts • Client actif = +3 pts • Abo payé = +20 pts</p></div>
            {classement.map((c: any, i: number) => <div key={c.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`} {c.nom} - {c.type_public}</p><p className="font-black text-[#FF6B00]">{c.pts.total} pts</p></div><p className="text-[11px] text-gray-600 mt-1">{c.telephone} • {c.commune} • Code : {c.code}</p><p className="text-[11px] mt-1">{c.pts.bout} bout. x5 = {c.pts.ptsBout} pts • {c.pts.cli} cli. x3 = {c.pts.ptsCli} pts • {c.pts.abo} abo. x20 = {c.pts.ptsBonus} pts</p></div>)}
            {classement.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun point pour l'instant.</p>}
          </div>
        )}
        {onglet === "COMPTA" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 space-y-3"><p className="font-black">💰 Comptabilité réelle</p><label className="block"><span className="text-[11px] font-black">% Commission Ambassadeur / Superviseur</span><input type="number" value={pctCommission} onChange={e => setPctCommission(Number(e.target.value))} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="block"><span className="text-[11px] font-black">Prix abonnement de base (CDF)</span><input type="number" value={prixAbo} onChange={e => setPrixAbo(Number(e.target.value))} className="w-full border rounded-xl px-3 py-3 mt-1" /></label></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">Résumé</p><p className="text-[12px] mt-1">Total ventes payées : <b>{totalVentes.toLocaleString()} CDF</b></p><p className="text-[12px]">Base commission (Premier + Occasionnel) : <b>{baseCommission.toLocaleString()} CDF</b></p><p className="text-[12px]">Commission ({pctCommission}%) : <b>{commission.toLocaleString()} CDF</b></p><p className="text-[12px]">Bénéfice DG : <b className={benefice >= 0 ? "text-green-600" : "text-red-600"}>{benefice.toLocaleString()} CDF</b></p><p className="text-[12px]">Premiers payés : {premiers.length} • Occasionnels payés : {occasionnels.length} • Renouvellements payés : {renouvellements.length}</p></div>
          </div>
        )}
        {onglet === "STATS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📍 Stats Milieu - Communes Boutiques</p>{statsMilieu(boutiques, "commune").map(([k, v]: any) => <p key={k} className="text-[12px] mt-1">{k} : <b>{v}</b></p>)}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📍 Stats Milieu - Communes Clients</p>{statsMilieu(clients, "commune").map(([k, v]: any) => <p key={k} className="text-[12px] mt-1">{k} : <b>{v}</b></p>)}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📍 Stats Milieu - Quartiers Boutiques</p>{statsMilieu(boutiques, "quartier").map(([k, v]: any) => <p key={k} className="text-[12px] mt-1">{k} : <b>{v}</b></p>)}</div>
          </div>
        )}
        {onglet === "BOUTIQUES" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏪 Boutiques ({boutiques.length})</p><p className="text-[11px] text-gray-500">En attente : {boutiques.filter(b => b.statut === "EN_ATTENTE").length} • Validées : {boutiques.filter(b => b.statut === "VALIDEE").length} • Rejetées : {boutiques.filter(b => b.statut === "REJETEE").length}</p></div>
            {boutiques.filter(filtre).map((b: any) => <div key={b.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{b.nom}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{b.statut}</span></div><p className="text-[11px] text-gray-600 mt-1">{b.proprietaire || ""} • {b.telephone || b.whatsapp} • {b.commune} {b.quartier || ""}</p><p className="text-[11px] text-gray-500">Type : {b.type_public || b.type} • Code invité par : {b.code_invitation || b.code_amb || "Aucun"} • Abonnement : {b.abonnement || "Freemium"}</p>{b.statut === "EN_ATTENTE" && <div className="flex gap-2 mt-3"><button onClick={() => validerBoutique(b)} className="flex-1 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Valider (+5 pts inviteur)</button><button onClick={() => rejeterBoutique(b)} className="flex-1 bg-red-600 text-white py-2.5 rounded-full text-[11px] font-black">⛔ Rejeter</button></div>}<button onClick={() => { setPersonneAnnonce(b.id); setCibleAnnonce("UNE_PERSONNE"); setOnglet("NOTIFICATIONS"); }} className="w-full mt-2 bg-black text-white py-2.5 rounded-full text-[11px] font-black">📢 Notifier cette boutique seule</button></div>)}
            {boutiques.filter(filtre).length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune boutique.</p>}
          </div>
        )}
        {onglet === "MODERATION" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🛡️ Modération ({annonces.filter(a => a.statut === "EN_ATTENTE").length} en attente)</p><p className="text-[11px] text-gray-500">Si tu suspends, écris d'abord le motif. L'auteur seul verra le motif.</p><label className="block mt-3"><span className="text-[11px] font-black">Motif de suspension</span><input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex: Photo non conforme..." className="w-full border rounded-xl px-3 py-3 mt-1" /></label></div>
            {annonces.filter(filtre).map((a: any) => <div key={a.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{a.titre}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{a.statut}</span></div><p className="text-[11px] text-gray-600 mt-1">{a.description || ""}</p><p className="text-[11px] text-gray-500">Par : {a.user_id || a.auteur_id || "Inconnu"} • {a.commune || ""}</p>{a.statut === "EN_ATTENTE" && <div className="flex gap-2 mt-3"><button onClick={() => moderer(a.id, "APPROUVEE")} className="flex-1 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Approuver</button><button onClick={() => moderer(a.id, "SUSPENDUE")} className="flex-1 bg-red-600 text-white py-2.5 rounded-full text-[11px] font-black">⏸️ Suspendre</button></div>}</div>)}
            {annonces.filter(filtre).length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune annonce.</p>}
          </div>
        )}
        {onglet === "PAIEMENTS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Paiements ({paiements.length})</p><p className="text-[11px] text-gray-500">Payés : {paiements.filter(estPaye).length} • En attente : {paiements.filter(p => !estPaye(p)).length} • Total payé : {totalVentes.toLocaleString()} CDF</p></div>
            {paiements.filter(filtre).map((p: any) => <div key={p.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{Number(p.montant || 0).toLocaleString()} CDF - {p.type}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{p.statut}</span></div><p className="text-[11px] text-gray-600 mt-1">{p.qui || p.boutique_id || ""} • {new Date(p.created_at).toLocaleDateString()}</p>{!estPaye(p) && <button onClick={() => validerPaiement(p.id)} className="w-full mt-3 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Valider le paiement (+20 pts Tombola si abo)</button>}</div>)}
            {paiements.filter(filtre).length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun paiement.</p>}
          </div>
        )}
        {onglet === "PROBLEMES" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🚨 Problèmes ({problemes.filter(p => p.statut === "OUVERT").length} ouverts)</p></div>
            {problemes.filter(filtre).map((pb: any) => <div key={pb.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{pb.type}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{pb.statut}</span></div><p className="text-[11px] text-gray-600 mt-1">{pb.detail || ""}</p><p className="text-[11px] text-gray-500">Par : {pb.user_id || pb.qui_id || pb.qui || ""} • {new Date(pb.created_at).toLocaleDateString()}</p>{pb.statut === "OUVERT" && <button onClick={() => resoudre(pb.id)} className="w-full mt-3 bg-black text-white py-2.5 rounded-full text-[11px] font-black">✅ Marquer résolu (notifie la personne seule)</button>}</div>)}
            {problemes.filter(filtre).length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun problème.</p>}
          </div>
        )}
        {onglet === "DESIGN" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 space-y-3"><p className="font-black">🎨 Design Public</p>
              <label className="block"><span className="text-[11px] font-black">Titre</span><input value={config.title} onChange={e => setConfig({ ...config, title: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label>
              <label className="block"><span className="text-[11px] font-black">Slogan</span><input value={config.slogan} onChange={e => setConfig({ ...config, slogan: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label>
              <label className="block"><span className="text-[11px] font-black">À propos</span><textarea value={config.about} onChange={e => setConfig({ ...config, about: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" rows={3} /></label>
              <label className="block"><span className="text-[11px] font-black">WhatsApp DG</span><input value={config.whats} onChange={e => setConfig({ ...config, whats: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label>
              <div className="flex gap-2"><label className="flex-1"><span className="text-[11px] font-black">Couleur principale</span><input value={config.main} onChange={e => setConfig({ ...config, main: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="flex-1"><span className="text-[11px] font-black">Couleur bouton</span><input value={config.btn} onChange={e => setConfig({ ...config, btn: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label></div>
              <button onClick={publierDesign} className="w-full bg-black text-white py-4 rounded-full font-black">✅ Publier le design</button>
            </div>
          </div>
        )}
        {onglet === "PARAMETRES" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 space-y-3"><p className="font-black">⚙️ Paramètres</p><label className="block"><span className="text-[11px] font-black">% Commission</span><input type="number" value={pctCommission} onChange={e => setPctCommission(Number(e.target.value))} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="block"><span className="text-[11px] font-black">Prix abonnement de base (CDF)</span><input type="number" value={prixAbo} onChange={e => setPrixAbo(Number(e.target.value))} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><p className="text-[11px] text-gray-500">Tombola et Notifications sont dans leurs onglets dédiés.</p></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🔒 Sécurité</p><p className="text-[11px] text-gray-500 mt-1">PIN DG : 2026 - Ne partage jamais ton PIN. Tout est en temps réel depuis Supabase.</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
