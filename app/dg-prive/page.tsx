"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase, estPublic, estPaye, estActif, typePaiement } from "../../lib/supabase";

export default function DashboardDG() {
  const [pin, setPin] = useState("");
  const [ok, setOk] = useState(false);
  const [membres, setMembres] = useState<any[]>([]);
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [problemes, setProblemes] = useState<any[]>([]);
  const [onglet, setOnglet] = useState("DASH");
  const [recherche, setRecherche] = useState("");
  const [toast, setToast] = useState("");
  const [config, setConfig] = useState<any>({ title: "WENZE", slogan: "", about: "", whats: "", main: "#FF6B00", btn: "#111111" });
  const [filtreType, setFiltreType] = useState("TOUS");
  const [motif, setMotif] = useState("");
  const [pctCommission, setPctCommission] = useState(10);
  const [prixAbo, setPrixAbo] = useState(50000);
  const [tombolaCfg, setTombolaCfg] = useState<any>({ lot: "1 Telephone + 50.000 CDF", plafond: 100, duree_jours: 7, regle_gagnant: "PLAFOND", active: false, statut: "FERMEE" });
  const [tempsTombola, setTempsTombola] = useState("");
  const [nouvelleAlerte, setNouvelleAlerte] = useState("");
  const [notifsPerso, setNotifsPerso] = useState<any[]>([]);
  const [titreAnnonce, setTitreAnnonce] = useState("");
  const [msgAnnonce, setMsgAnnonce] = useState("");
  const [cibleAnnonce, setCibleAnnonce] = useState("TOUS");
  const [personneAnnonce, setPersonneAnnonce] = useState("");

  // ✅ NOUVEAU : Créer Superviseur / Ambassadeur
  const [nomNouveau, setNomNouveau] = useState("");
  const [telNouveau, setTelNouveau] = useState("");
  const [communeNouveau, setCommuneNouveau] = useState("Gombe");
  const [roleNouveau, setRoleNouveau] = useState("SUPERVISEUR");
  // ✅ NOUVEAU : Cliquer sur un membre = voir ses stats
  const [membreSelectionne, setMembreSelectionne] = useState<any>(null);

  const show = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  const notifier = async (d: any) => {
    if (!supabase) return;
    await supabase.from("notifications_perso").insert({
      id: "notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      user_id: d.user_id || null, type_compte: d.type_compte || "TOUS", code_invitation: d.code_invitation || null,
      titre: d.titre, message: d.message, type: d.type, lien: d.lien || "", lu: false,
    });
  };

  const charger = async () => {
    if (!supabase) return;
    const [m, b, c, p, a, pr, cfg, t, np] = await Promise.all([
      supabase.from("membres").select("*").order("created_at", { ascending: false }),
      supabase.from("boutiques").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("paiements").select("*").order("created_at", { ascending: false }),
      supabase.from("annonces").select("*").order("created_at", { ascending: false }),
      supabase.from("problemes").select("*").order("created_at", { ascending: false }),
      supabase.from("config_publique").select("*").eq("id", 1).maybeSingle(),
      supabase.from("tombola_config").select("*").eq("id", 1).maybeSingle(),
      supabase.from("notifications_perso").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (m.data) setMembres(m.data);
    if (b.data) setBoutiques(b.data);
    if (c.data) setClients(c.data);
    if (p.data) setPaiements(p.data);
    if (a.data) setAnnonces(a.data);
    if (pr.data) setProblemes(pr.data);
    if (cfg.data) setConfig({ title: cfg.data.title, slogan: cfg.data.slogan, about: cfg.data.about, whats: cfg.data.whats, main: cfg.data.main || cfg.data.main_color || "#FF6B00", btn: cfg.data.btn || cfg.data.btn_color || "#111111" });
    if (t.data) setTombolaCfg(t.data);
    if (np.data) setNotifsPerso(np.data);
  };

  useEffect(() => {
    charger();
    if (!supabase) return;
    const ch = supabase.channel("wenze-dg")
      .on("postgres_changes", { event: "*", schema: "public", table: "membres" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "annonces" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "problemes" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "tombola_config" }, (pay: any) => { if (pay.new) setTombolaCfg(pay.new); charger(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications_perso" }, charger)
      .subscribe();
    const interval = setInterval(charger, 10000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
// ===== CALCULS — TOUS AVANT LE IF, SINON CRASH =====
  const premiers = paiements.filter(p => typePaiement(p) === "PREMIER" && estPaye(p));
  const occasionnels = paiements.filter(p => typePaiement(p) === "OCCASIONNELLE" && estPaye(p));
  const renouvellements = paiements.filter(p => typePaiement(p) === "RENOUVELLEMENT" && estPaye(p));
  const baseCommission = [...premiers, ...occasionnels].reduce((s, p) => s + Number(p.montant || 0), 0);
  const totalVentes = paiements.filter(estPaye).reduce((s, p) => s + Number(p.montant || 0), 0);
  const commission = Math.round(baseCommission * pctCommission / 100);
  const benefice = totalVentes - commission;

  const pointsDe = (codeInvitation: string) => {
    const boutInv = boutiques.filter(b => (b.code_invitation === codeInvitation || b.code_amb === codeInvitation) && estActif(b.statut) && estPublic(b.type_public || b.type || "BOUTIQUE"));
    const cliInv = clients.filter(c => (c.code_invitation === codeInvitation || c.code_parrain === codeInvitation) && c.statut === "ACTIF" && estPublic(c.type_public || c.type || "CLIENT"));
    const aboPayes = paiements.filter(p => {
      const b = boutiques.find(x => x.id === p.boutique_id);
      const codeB = b?.code_invitation || b?.code_amb || "";
      return codeB === codeInvitation && estPaye(p) && (typePaiement(p) === "PREMIER" || typePaiement(p) === "OCCASIONNELLE");
    });
    return { bout: boutInv.length, cli: cliInv.length, abo: aboPayes.length, ptsBout: boutInv.length * 5, ptsCli: cliInv.length * 3, ptsBonus: aboPayes.length * 20, total: boutInv.length * 5 + cliInv.length * 3 + aboPayes.length * 20 };
  };

  const participants = useMemo(() => {
    const map = new Map();
    [...boutiques, ...clients].forEach((u: any) => {
      const type = (u.type_public || u.type || (u.nomEtablissement ? "BOUTIQUE" : "CLIENT")).toUpperCase();
      if (!estPublic(type)) return;
      const code = u.code_pro || u.code_invitation || u.id;
      if (!map.has(code)) map.set(code, { id: u.id, nom: u.nom || u.proprietaire || "", telephone: u.telephone || u.whatsapp || "", type_public: type, code, commune: u.commune, quartier: u.quartier });
    });
    return [...map.values()].map(p => ({ ...p, pts: pointsDe(p.code) })).sort((a, b) => b.pts.total - a.pts.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boutiques, clients, paiements]);

  const classement = participants.filter(x => x.pts.total > 0);
  const gagnantPotentiel = classement[0];
  const sup = membres.filter(m => m.role === "SUPERVISEUR");
  const amb = membres.filter(m => m.role === "AMBASSADEUR");

  // ✅ STATS DU MEMBRE SÉLECTIONNÉ — quand tu cliques sur lui
  const statsMembre = (m: any) => {
    if (!m) return null;
    const code = m.code_pro || m.code_invitation || m.id;
    const zone = m.commune || "";
    // Superviseur = toute sa commune. Ambassadeur = seulement ses boutiques/clients invités
    const boutiquesZone = m.role === "SUPERVISEUR"
      ? boutiques.filter(b => b.commune === zone)
      : boutiques.filter(b => b.code_invitation === code || b.code_amb === code);
    const clientsZone = m.role === "SUPERVISEUR"
      ? clients.filter(c => c.commune === zone)
      : clients.filter(c => c.code_invitation === code || c.code_parrain === code);
    const idsBoutiques = boutiquesZone.map(b => b.id);
    const paiementsZone = paiements.filter(p => idsBoutiques.includes(p.boutique_id) || p.user_id === m.id);
    const payes = paiementsZone.filter(estPaye);
    const ventes = payes.reduce((s, p) => s + Number(p.montant || 0), 0);
    const baseComm = payes.filter(p => typePaiement(p) === "PREMIER" || typePaiement(p) === "OCCASIONNELLE").reduce((s, p) => s + Number(p.montant || 0), 0);
    const comm = Math.round(baseComm * pctCommission / 100);
    const pts = pointsDe(code);
    return {
      boutiques: boutiquesZone, clients: clientsZone, paiements: paiementsZone,
      ventes, commission: comm, benefice: ventes - comm,
      boutiquesValidees: boutiquesZone.filter(b => b.statut === "VALIDEE").length,
      boutiquesEnAttente: boutiquesZone.filter(b => b.statut === "EN_ATTENTE").length,
      clientsActifs: clientsZone.filter(c => c.statut === "ACTIF").length,
      paiementsPayes: payes.length, paiementsEnAttente: paiementsZone.filter(p => !estPaye(p)).length,
      pts,
    };
  };
  const statsSel = membreSelectionne ? statsMembre(membreSelectionne) : null;

  // ===== ACTIONS DG =====
  const creerMembre = async () => {
    if (!nomNouveau.trim() || !telNouveau.trim()) return show("⚠️ Nom + Téléphone obligatoires");
    const prefix = roleNouveau === "SUPERVISEUR" ? "SUP" : "AMB";
    const code = `${prefix}-${(communeNouveau || "KIN").toUpperCase().slice(0, 3)}-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const { error } = await supabase.from("membres").insert({
      nom: nomNouveau, telephone: telNouveau, whatsapp: telNouveau,
      commune: communeNouveau, role: roleNouveau,
      code_pro: code, code_invitation: code,
      statut: "ACTIF", type_compte: roleNouveau,
    });
    if (error) return show("❌ Erreur : " + error.message);
    await notifier({ user_id: null, type_compte: roleNouveau, titre: `👋 Bienvenue ${roleNouveau} !`, message: `${nomNouveau}, ton Code Pro est ${code}. Connecte-toi sur /equipe avec ton WhatsApp + ce code. Zone : ${communeNouveau}.`, type: "COMPTE", lien: "/equipe" });
    show(`✅ ${roleNouveau} créé ! Code : ${code}`);
    setNomNouveau(""); setTelNouveau(""); charger();
  };

  const validerPaiement = async (id: string) => {
    const p = paiements.find(x => x.id === id);
    await supabase.from("paiements").update({ statut: "PAYÉ" }).eq("id", id);
    if (p) {
      const b = boutiques.find(x => x.id === p.boutique_id);
      await notifier({ user_id: p.boutique_id || p.user_id || b?.id, titre: "💰 Paiement validé !", message: `Ton paiement de ${Number(p.montant || 0).toLocaleString()} CDF (${typePaiement(p)}) validé par le DG.`, type: "PAIEMENT", lien: "/profil" });
      if (b && (b.code_invitation || b.code_amb) && (typePaiement(p) === "PREMIER" || typePaiement(p) === "OCCASIONNELLE")) {
        await notifier({ user_id: b.code_invitation || b.code_amb, titre: "🎉 +20 pts Tombola !", message: `Ton invité ${b.nom} a payé. Tu gagnes +20 pts.`, type: "TOMBOLA", lien: "/" });
      }
    }
    show("✅ Paiement validé"); charger();
  };

  const moderer = async (id: string, statut: string) => {
    if (statut === "SUSPENDUE" && !motif.trim()) return show("⚠️ Écris d'abord le motif");
    const a = annonces.find(x => x.id === id);
    const statutFinal = statut === "APPROUVEE" ? "APPROUVE" : statut;
    await supabase.from("annonces").update({ statut: statutFinal, motif }).eq("id", id);
    if (a && statutFinal === "APPROUVE") await notifier({ user_id: a.user_id || a.auteur_id || a.boutique_id, titre: "✅ Annonce approuvée !", message: `"${a.titre}" est visible sur WENZE.`, type: "MODERATION", lien: "/" });
    if (a && statutFinal === "SUSPENDUE") await notifier({ user_id: a.user_id || a.auteur_id || a.boutique_id, titre: "⏸️ Annonce suspendue", message: `Motif DG : ${motif}`, type: "MODERATION", lien: "/profil" });
    show(statutFinal === "APPROUVE" ? "✅ Approuvée — visible au public" : "⏸️ Suspendue"); setMotif(""); charger();
  };

  const changerMembre = async (id: string, statut: string) => {
    await supabase.from("membres").update({ statut }).eq("id", id);
    show("✅ Mis à jour"); charger();
  };

  const resoudre = async (id: string) => {
    await supabase.from("problemes").update({ statut: "RESOLU" }).eq("id", id);
    charger();
  };

  const publierDesign = async () => {
    await supabase.from("config_publique").update({ title: config.title, slogan: config.slogan, about: config.about, whats: config.whats, main: config.main, btn: config.btn, updated_at: new Date().toISOString() }).eq("id", 1);
    show("✅ Publié — public voit en 1-2 sec");
  };

  const lancerTombola = async () => {
    const debut = new Date();
    const fin = new Date(debut.getTime() + Number(tombolaCfg.duree_jours || 7) * 24 * 3600 * 1000);
    await supabase.from("tombola_config").upsert({ id: 1, lot: tombolaCfg.lot, plafond: Number(tombolaCfg.plafond), regle_gagnant: tombolaCfg.regle_gagnant, duree_jours: Number(tombolaCfg.duree_jours), active: true, statut: "OUVERTE", date_debut: debut.toISOString(), date_fin: fin.toISOString(), gagnant_nom: null, gagnant_tel: null, gagnant_points: 0 });
    for (const t of ["CLIENT", "BOUTIQUE", "PRESTATAIRE", "GROSSISTE"]) { await notifier({ type_compte: t, titre: "🎟️ TOMBOLA LANCÉE !", message: `Plafond : ${tombolaCfg.plafond} pts - Lot : ${tombolaCfg.lot} - ${tombolaCfg.duree_jours} jours.`, type: "TOMBOLA", lien: "/" }); }
    show(`✅ Tombola lancée !`); charger();
  };
  const fermerTombola = async () => { await supabase.from("tombola_config").update({ active: false, statut: "FERMEE" }).eq("id", 1); show("⏹️ Tombola fermée"); charger(); };
  const cloturerGagnant = async () => {
    if (!gagnantPotentiel) return show("Aucun joueur");
    await supabase.from("tombola_config").update({ active: false, statut: "TERMINEE", gagnant_nom: gagnantPotentiel.nom, gagnant_tel: gagnantPotentiel.telephone, gagnant_points: gagnantPotentiel.pts.total }).eq("id", 1);
    await notifier({ user_id: gagnantPotentiel.id, titre: "🏆 TU AS GAGNÉ !", message: `Bravo ${gagnantPotentiel.nom} ! ${gagnantPotentiel.pts.total} pts. Lot : ${tombolaCfg.lot}`, type: "TOMBOLA", lien: "/" });
    show("🏆 Gagnant : " + gagnantPotentiel.nom); charger();
  };

  const validerBoutique = async (b: any) => {
    await supabase.from("boutiques").update({ statut: "VALIDEE", abonnement: "Freemium" }).eq("id", b.id);
    await notifier({ user_id: b.id, titre: "✅ Boutique validée !", message: `${b.nom} est visible sur WENZE.`, type: "BOUTIQUE", lien: "/boutiques" });
    if (b.code_invitation || b.code_amb) await notifier({ user_id: b.code_invitation || b.code_amb, titre: "🎉 +5 pts Tombola !", message: `Ta boutique ${b.nom} validée. +5 pts.`, type: "TOMBOLA", lien: "/" });
    show(`✅ ${b.nom} validée !`); charger();
  };
  const rejeterBoutique = async (b: any) => { await supabase.from("boutiques").update({ statut: "REJETEE" }).eq("id", b.id); show("⛔ Rejetée"); charger(); };

  const envoyerAnnonceDG = async () => {
    if (!titreAnnonce.trim() || !msgAnnonce.trim()) return show("⚠️ Titre + message");
    if (cibleAnnonce === "UNE_PERSONNE" && !personneAnnonce) return show("⚠️ Choisis la personne");
    await notifier({ user_id: cibleAnnonce === "UNE_PERSONNE" ? personneAnnonce : undefined, type_compte: cibleAnnonce === "UNE_PERSONNE" ? "TOUS" : cibleAnnonce, titre: titreAnnonce, message: msgAnnonce, type: "ANNONCE_DG", lien: "/" });
    show("📢 Annonce envoyée !"); setTitreAnnonce(""); setMsgAnnonce(""); charger();
  };

  const filtre = (x: any) => {
    if (filtreType !== "TOUS" && (x.type_public || x.type || x.role) !== filtreType && !(filtreType === "CLIENT" && !x.type_public && !x.type)) return false;
    if (!recherche) return true;
    const s = recherche.toLowerCase();
    return (x.nom || x.proprietaire || x.telephone || x.whatsapp || x.commune || x.quartier || "").toLowerCase().includes(s);
  };

  const ONGLETS = ["DASH", "TOMBOLA", "NOTIFICATIONS", "SUPERVISEURS", "AMBASSADEURS", "INVITATIONS", "COMPTA", "STATS", "BOUTIQUES", "MODERATION", "PAIEMENTS", "PROBLEMES", "DESIGN", "PARAMETRES"];
  const labelOnglet = (t: string) => t === "DASH" ? "📊 Dashboard" : t === "TOMBOLA" ? "🎟️ Tombola" : t === "NOTIFICATIONS" ? `📢 Notifications (${notifsPerso.length})` : t === "SUPERVISEURS" ? `👔 Superviseurs (${sup.length})` : t === "AMBASSADEURS" ? `🎖️ Ambassadeurs (${amb.length})` : t === "INVITATIONS" ? "🏆 Invitations" : t === "COMPTA" ? "💰 Comptabilité" : t === "STATS" ? "📍 Stats Milieu" : t === "BOUTIQUES" ? "🏪 Boutiques" : t === "MODERATION" ? `🛡️ Modération (${annonces.filter(a => a.statut === "EN_ATTENTE").length})` : t === "PAIEMENTS" ? "💰 Paiements" : t === "PROBLEMES" ? `🚨 Problèmes (${problemes.filter(p => p.statut === "OUVERT").length})` : t === "PARAMETRES" ? "⚙️ Paramètres" : "🎨 Design";

  // ✅ LE IF EST APRÈS TOUS LES HOOKS — PLUS DE CRASH
  if (!ok) return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#0A0A0A] text-white p-6 flex flex-col justify-center">
      <p className="text-[28px] font-black">WENZE<span className="text-[#FF6B00]">.</span></p>
      <h1 className="font-black text-[24px] mt-4">👑 Bureau DG — Vraies données</h1>
      <p className="text-[12px] opacity-60">Aucune donnée fictive. Tout vient de Supabase. Temps réel.</p>
      <input value={pin} onChange={e => setPin(e.target.value)} type="password" inputMode="numeric" placeholder="PIN DG" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 mt-6 text-center text-[22px] tracking-[8px] outline-none" />
      <button onClick={() => pin === "2026" ? setOk(true) : show("❌ PIN incorrect")} className="w-full bg-[#FF6B00] py-4 rounded-full font-black mt-4">🔓 ENTRER</button>
      {toast && <p className="text-center text-[12px] mt-3 font-bold">{toast}</p>}
    </div>
  );
  return (
    <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
      {toast && <div className="fixed top-4 left-4 right-4 z-[60] bg-black text-white p-3 rounded-2xl text-[12px] font-bold text-center">{toast}</div>}
      {nouvelleAlerte && <div className="fixed top-16 left-4 right-4 z-[60] bg-[#FF6B00] text-white p-3 rounded-2xl text-[12px] font-bold text-center">{nouvelleAlerte}</div>}

      {/* ✅ FICHE STATS AU CLIC — s'affiche par-dessus quand tu cliques sur un membre */}
      {membreSelectionne && statsSel && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setMembreSelectionne(null)}>
          <div className="bg-white w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div><p className="font-black text-[18px]">{membreSelectionne.role === "SUPERVISEUR" ? "👔" : "🎖️"} {membreSelectionne.nom}</p><p className="text-[12px] text-gray-500">{membreSelectionne.telephone} • {membreSelectionne.commune} • Code : {membreSelectionne.code_pro || membreSelectionne.code_invitation}</p><p className="text-[11px] mt-1">Statut : <b>{membreSelectionne.statut || "ACTIF"}</b> • {membreSelectionne.role === "SUPERVISEUR" ? "Zone : toute la commune" : "Périmètre : seulement ses invités"}</p></div>
              <button onClick={() => setMembreSelectionne(null)} className="bg-black text-white w-8 h-8 rounded-full font-black">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="bg-gray-100 rounded-2xl p-3"><p className="font-black text-[18px]">{statsSel.boutiques.length}</p><p className="text-[9px]">BOUTIQUES</p></div>
              <div className="bg-gray-100 rounded-2xl p-3"><p className="font-black text-[18px]">{statsSel.clients.length}</p><p className="text-[9px]">CLIENTS</p></div>
              <div className="bg-[#FF6B00] text-white rounded-2xl p-3"><p className="font-black text-[18px]">{statsSel.pts.total}</p><p className="text-[9px]">PTS TOMBOLA</p></div>
            </div>
            <div className="bg-black text-white rounded-2xl p-4 mt-3"><p className="font-black text-[13px]">💰 Ventes de sa zone</p><p className="text-[12px] mt-1">Ventes : <b>{statsSel.ventes.toLocaleString()} CDF</b> • Commission : <b>{statsSel.commission.toLocaleString()} CDF</b> • Bénéfice : <b>{statsSel.benefice.toLocaleString()} CDF</b></p><p className="text-[11px] mt-1">Paiements payés : {statsSel.paiementsPayes} • En attente : {statsSel.paiementsEnAttente}</p></div>
            <div className="bg-gray-50 border rounded-2xl p-4 mt-3"><p className="font-black text-[13px]">🏪 Boutiques</p><p className="text-[12px] mt-1">Validées : {statsSel.boutiquesValidees} • En attente : {statsSel.boutiquesEnAttente}</p><p className="text-[12px]">Clients actifs : {statsSel.clientsActifs}</p><p className="text-[12px]">Points : {statsSel.pts.bout} bout. x5 = {statsSel.pts.ptsBout} • {statsSel.pts.cli} cli. x3 = {statsSel.pts.ptsCli} • {statsSel.pts.abo} abo. x20 = {statsSel.pts.ptsBonus}</p></div>
            <div className="mt-3"><p className="font-black text-[13px] mb-2">Ses boutiques :</p>{statsSel.boutiques.length === 0 && <p className="text-[12px] text-gray-500">Aucune boutique dans sa zone pour l'instant.</p>}{statsSel.boutiques.slice(0, 10).map((b: any) => <p key={b.id} className="text-[12px] border-b py-2">• {b.nom} — {b.statut} — {b.commune} {b.quartier || ""}</p>)}</div>
            <div className="flex gap-2 mt-4"><button onClick={() => { setPersonneAnnonce(membreSelectionne.id); setCibleAnnonce("UNE_PERSONNE"); setMembreSelectionne(null); setOnglet("NOTIFICATIONS"); }} className="flex-1 bg-[#FF6B00] text-white py-3 rounded-full text-[12px] font-black">📢 Lui envoyer une notif</button><button onClick={() => { changerMembre(membreSelectionne.id, membreSelectionne.statut === "ACTIF" ? "SUSPENDU" : "ACTIF"); setMembreSelectionne(null); }} className="flex-1 bg-black text-white py-3 rounded-full text-[12px] font-black">{membreSelectionne.statut === "ACTIF" ? "⏸️ Suspendre" : "✅ Activer"}</button></div>
          </div>
        </div>
      )}

      <div className="bg-black text-white px-5 pt-8 pb-6 rounded-b-[32px]">
        <p className="text-[11px] opacity-60">WENZE • DG • DONNÉES RÉELLES • TEMPS RÉEL</p>
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
        <select value={filtreType} onChange={e => setFiltreType(e.target.value)} className="border rounded-full px-2 py-2.5 text-[11px] bg-white font-black"><option value="TOUS">TOUS</option><option value="CLIENT">CLIENT</option><option value="BOUTIQUE">BOUTIQUE</option><option value="PRESTATAIRE">PRESTATAIRE</option><option value="GROSSISTE">GROSSISTE</option><option value="AMBASSADEUR">AMBASSADEUR</option><option value="SUPERVISEUR">SUPERVISEUR</option></select>
      </div>
      <div className="px-4 mt-4">
        {onglet === "DASH" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Ventes réelles</p><p className="text-[13px] mt-1">Total : <b>{totalVentes.toLocaleString()} CDF</b> • Commission : <b>{commission.toLocaleString()} CDF</b> ({pctCommission}%) • Bénéfice : <b>{benefice.toLocaleString()} CDF</b></p><p className="text-[11px] text-gray-500 mt-1">Premiers : {premiers.length} • Occasionnels : {occasionnels.length} • Renouvellements : {renouvellements.length}</p></div>
            {tombolaCfg.active && <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">🎟️ Tombola en cours - {tombolaCfg.lot}</p><p className="text-[12px] mt-1">Plafond : {tombolaCfg.plafond} pts • Reste : {tempsTombola}</p><p className="text-[12px]">Top 1 : {gagnantPotentiel ? `${gagnantPotentiel.nom} - ${gagnantPotentiel.pts.total} pts` : "Aucun point"}</p><button onClick={() => setOnglet("TOMBOLA")} className="mt-2 bg-[#FF6B00] text-white px-4 py-2 rounded-full text-[11px] font-black">Voir Tombola →</button></div>}
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏆 Top 3 — Points réels</p>{classement.slice(0, 3).map((c: any, i: number) => <p key={i} className="text-[12px] mt-1">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {c.nom} — {c.pts.total} pts</p>)}{classement.length === 0 && <p className="text-[12px] text-gray-500">Aucun point pour l'instant.</p>}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🚨 Problèmes ouverts : {problemes.filter(p => p.statut === "OUVERT").length}</p><p className="text-[12px]">Paiements en attente : {paiements.filter(p => !estPaye(p)).length} • Annonces en attente : {annonces.filter(a => a.statut === "EN_ATTENTE").length} • Boutiques en attente : {boutiques.filter(b => b.statut === "EN_ATTENTE").length}</p></div>
          </div>
        )}
        {onglet === "TOMBOLA" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">🎟️ Tombola à Points - Public Seulement</p><p className="text-[11px] opacity-80 mt-1">Statut : <b>{tombolaCfg.statut}</b> • Plafond : <b>{tombolaCfg.plafond} pts</b> • Lot : {tombolaCfg.lot}</p>{tombolaCfg.active && <p className="text-[12px] mt-1">⏱️ Ferme dans : {tempsTombola}</p>}{tombolaCfg.gagnant_nom && <p className="text-[13px] font-black text-yellow-300 mt-1">🏆 Gagnant : {tombolaCfg.gagnant_nom} - {tombolaCfg.gagnant_points} pts</p>}</div>
            <div className="bg-white border rounded-2xl p-4 space-y-3">
              <label className="block"><span className="text-[11px] font-black">Lot à gagner</span><input value={tombolaCfg.lot} onChange={e => setTombolaCfg({ ...tombolaCfg, lot: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label>
              <div className="flex gap-2"><label className="flex-1"><span className="text-[11px] font-black">Plafond (pts)</span><input type="number" value={tombolaCfg.plafond} onChange={e => setTombolaCfg({ ...tombolaCfg, plafond: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="flex-1"><span className="text-[11px] font-black">Durée (jours)</span><input type="number" value={tombolaCfg.duree_jours} onChange={e => setTombolaCfg({ ...tombolaCfg, duree_jours: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label></div>
              <div className="flex gap-2"><button onClick={() => setTombolaCfg({ ...tombolaCfg, regle_gagnant: "PLAFOND" })} className={`flex-1 py-3 rounded-xl font-black text-[11px] ${tombolaCfg.regle_gagnant === "PLAFOND" ? "bg-black text-white" : "bg-gray-100"}`}>🏁 1er au plafond gagne</button><button onClick={() => setTombolaCfg({ ...tombolaCfg, regle_gagnant: "TOP_1_FIN" })} className={`flex-1 py-3 rounded-xl font-black text-[11px] ${tombolaCfg.regle_gagnant === "TOP_1_FIN" ? "bg-black text-white" : "bg-gray-100"}`}>🏆 Plus de pts à la fin gagne</button></div>
              {!tombolaCfg.active ? <button onClick={lancerTombola} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black">🚀 LANCER LA TOMBOLA</button> : <div className="flex gap-2"><button onClick={fermerTombola} className="flex-1 bg-red-600 text-white py-4 rounded-full font-black">⏹️ FERMER</button><button onClick={cloturerGagnant} className="flex-1 bg-black text-white py-4 rounded-full font-black">🏆 CLÔTURER + GAGNANT</button></div>}
            </div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">👥 Participants - Public Seulement</p>{participants.map((p: any, i: number) => <div key={p.id} className="mt-3 border rounded-2xl p-3"><div className="flex justify-between"><p className="font-black text-[12px]">{i + 1}. {p.nom} - {p.type_public}</p><p className="font-black text-[12px] text-[#FF6B00]">{p.pts.total} pts</p></div><p className="text-[11px] text-gray-600">{p.telephone} • {p.commune} • Code : {p.code}</p><p className="text-[11px] mt-1">{p.pts.bout} bout. x5 = {p.pts.ptsBout} • {p.pts.cli} cli. x3 = {p.pts.ptsCli} • {p.pts.abo} abo. x20 = {p.pts.ptsBonus}</p></div>)}</div>
          </div>
        )}
        {onglet === "NOTIFICATIONS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 space-y-3">
              <label className="block"><span className="text-[11px] font-black">Titre</span><input value={titreAnnonce} onChange={e => setTitreAnnonce(e.target.value)} placeholder="Ex: Nouvelle règle Tombola" className="w-full border rounded-xl px-3 py-3 mt-1" /></label>
              <label className="block"><span className="text-[11px] font-black">Message</span><textarea value={msgAnnonce} onChange={e => setMsgAnnonce(e.target.value)} className="w-full border rounded-xl px-3 py-3 mt-1" rows={3} /></label>
              <div><p className="text-[11px] font-black mb-2">Pour qui ?</p><div className="flex gap-1.5 flex-wrap">{["TOUS", "CLIENT", "BOUTIQUE", "PRESTATAIRE", "GROSSISTE", "AMBASSADEUR", "SUPERVISEUR", "UNE_PERSONNE"].map(t => <button key={t} onClick={() => setCibleAnnonce(t)} className={`px-3 py-2 rounded-full text-[11px] font-black ${cibleAnnonce === t ? "bg-black text-white" : "bg-gray-100"}`}>{t === "UNE_PERSONNE" ? "👤 1 Personne seule" : t}</button>)}</div></div>
              {cibleAnnonce === "UNE_PERSONNE" && <select value={personneAnnonce} onChange={e => setPersonneAnnonce(e.target.value)} className="w-full border rounded-xl px-3 py-3"><option value="">-- Choisir --</option>{[...boutiques, ...clients, ...membres].map((u: any) => <option key={u.id} value={u.id}>{u.nom || u.proprietaire || u.telephone} - {u.type_public || u.type || u.role}</option>)}</select>}
              <button onClick={envoyerAnnonceDG} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black">📢 ENVOYER L'ANNONCE</button>
            </div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📜 Historique ({notifsPerso.length})</p>{notifsPerso.slice(0, 30).map((n: any) => <div key={n.id} className="mt-3 border rounded-2xl p-3"><p className="font-black text-[12px]">{n.titre}</p><p className="text-[11px] text-gray-600 mt-1">{n.message}</p><p className="text-[10px] text-gray-400 mt-1">{n.user_id ? "Pour 1 personne" : `Pour : ${n.type_compte}`} • {n.lu ? "✅ Lue" : "🔴 Non lue"}</p></div>)}</div>
          </div>
        )}
        {onglet === "SUPERVISEURS" && (
          <div className="space-y-3">
            {/* ✅ CRÉER SUPERVISEUR */}
            <div className="bg-black text-white rounded-2xl p-4 space-y-3"><p className="font-black">➕ Créer un Superviseur</p><input value={nomNouveau} onChange={e => setNomNouveau(e.target.value)} placeholder="Nom complet — Ex: Grace" className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white placeholder:text-white/50" /><input value={telNouveau} onChange={e => setTelNouveau(e.target.value)} placeholder="WhatsApp — Ex: +243810000001" className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white placeholder:text-white/50" /><select value={communeNouveau} onChange={e => setCommuneNouveau(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white"><option className="text-black">Gombe</option><option className="text-black">Kintambo</option><option className="text-black">Lemba</option><option className="text-black">Limete</option><option className="text-black">Bandal</option><option className="text-black">Ngaliema</option><option className="text-black">Kinshasa</option></select><button onClick={() => { setRoleNouveau("SUPERVISEUR"); setTimeout(() => creerMembre(), 0); }} className="w-full bg-[#FF6B00] py-3 rounded-full font-black text-[12px]">✅ CRÉER SUPERVISEUR — Code auto SUP-...</button><p className="text-[11px] opacity-70">Le code Pro est généré automatiquement. Le superviseur se connecte sur /equipe avec WhatsApp + Code Pro.</p></div>
            {sup.filter(filtre).map((m: any) => <div key={m.id} onClick={() => setMembreSelectionne(m)} className="bg-white border rounded-2xl p-4 cursor-pointer active:scale-[0.99]"><div className="flex justify-between"><p className="font-black">👔 {m.nom || m.telephone}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{m.statut || "ACTIF"}</span></div><p className="text-[11px] text-gray-600 mt-1">{m.telephone || m.whatsapp} • {m.commune} • Code : {m.code_pro || m.code_invitation}</p><p className="text-[11px] text-[#FF6B00] font-black mt-1">👆 Clique pour voir ses statistiques →</p></div>)}
            {sup.filter(filtre).length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun superviseur. Crée le premier ci-dessus.</p>}
          </div>
        )}
        {onglet === "AMBASSADEURS" && (
          <div className="space-y-3">
            {/* ✅ CRÉER AMBASSADEUR */}
            <div className="bg-black text-white rounded-2xl p-4 space-y-3"><p className="font-black">➕ Créer un Ambassadeur</p><input value={nomNouveau} onChange={e => setNomNouveau(e.target.value)} placeholder="Nom complet — Ex: Joel" className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white placeholder:text-white/50" /><input value={telNouveau} onChange={e => setTelNouveau(e.target.value)} placeholder="WhatsApp — Ex: +243810000011" className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white placeholder:text-white/50" /><select value={communeNouveau} onChange={e => setCommuneNouveau(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white"><option className="text-black">Gombe</option><option className="text-black">Kintambo</option><option className="text-black">Lemba</option><option className="text-black">Limete</option><option className="text-black">Bandal</option><option className="text-black">Ngaliema</option><option className="text-black">Kinshasa</option></select><button onClick={() => { setRoleNouveau("AMBASSADEUR"); setTimeout(() => creerMembre(), 0); }} className="w-full bg-[#FF6B00] py-3 rounded-full font-black text-[12px]">✅ CRÉER AMBASSADEUR — Code auto AMB-...</button></div>
            {amb.filter(filtre).map((m: any) => <div key={m.id} onClick={() => setMembreSelectionne(m)} className="bg-white border rounded-2xl p-4 cursor-pointer active:scale-[0.99]"><div className="flex justify-between"><p className="font-black">🎖️ {m.nom || m.telephone}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{m.statut || "ACTIF"}</span></div><p className="text-[11px] text-gray-600 mt-1">{m.telephone || m.whatsapp} • {m.commune} • Code : {m.code_pro || m.code_invitation}</p><p className="text-[11px] text-[#FF6B00] font-black mt-1">👆 Clique pour voir ses statistiques →</p></div>)}
            {amb.filter(filtre).length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun ambassadeur. Crée le premier ci-dessus.</p>}
          </div>
        )}
                {onglet === "INVITATIONS" && (
          <div className="space-y-3"><div className="bg-white border rounded-2xl p-4"><p className="font-black">🏆 Invitations - Classement Tombola</p><p className="text-[11px] text-gray-500">Boutique validée = +5 • Client actif = +3 • Abo payé = +20</p></div>
          {classement.map((c: any, i: number) => <div key={c.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`} {c.nom} - {c.type_public}</p><p className="font-black text-[#FF6B00]">{c.pts.total} pts</p></div><p className="text-[11px] text-gray-600 mt-1">{c.telephone} • {c.commune} • Code : {c.code}</p><p className="text-[11px] mt-1">{c.pts.bout} bout. x5 = {c.pts.ptsBout} • {c.pts.cli} cli. x3 = {c.pts.ptsCli} • {c.pts.abo} abo. x20 = {c.pts.ptsBonus}</p></div>)}
          {classement.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun point pour l'instant.</p>}</div>
        )}
        {onglet === "COMPTA" && (
          <div className="space-y-3"><div className="bg-white border rounded-2xl p-4 space-y-3"><p className="font-black">💰 Comptabilité réelle</p><label className="block"><span className="text-[11px] font-black">% Commission</span><input type="number" value={pctCommission} onChange={e => setPctCommission(Number(e.target.value))} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="block"><span className="text-[11px] font-black">Prix abonnement (CDF)</span><input type="number" value={prixAbo} onChange={e => setPrixAbo(Number(e.target.value))} className="w-full border rounded-xl px-3 py-3 mt-1" /></label></div><div className="bg-white border rounded-2xl p-4"><p className="font-black">Résumé</p><p className="text-[12px] mt-1">Total ventes : <b>{totalVentes.toLocaleString()} CDF</b></p><p className="text-[12px]">Base commission : <b>{baseCommission.toLocaleString()} CDF</b></p><p className="text-[12px]">Commission ({pctCommission}%) : <b>{commission.toLocaleString()} CDF</b></p><p className="text-[12px]">Bénéfice DG : <b>{benefice.toLocaleString()} CDF</b></p><p className="text-[12px]">Premiers : {premiers.length} • Occasionnels : {occasionnels.length} • Renouvellements : {renouvellements.length} (0 CDF commission)</p></div></div>
        )}
        {onglet === "STATS" && (
          <div className="space-y-3"><div className="bg-white border rounded-2xl p-4"><p className="font-black">📍 Communes Boutiques</p>{(() => { const map = new Map(); boutiques.forEach(x => map.set(x.commune || "Non précisé", (map.get(x.commune || "Non précisé") || 0) + 1)); return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]: any) => <p key={k} className="text-[12px] mt-1">{k} : <b>{v}</b></p>); })()}</div><div className="bg-white border rounded-2xl p-4"><p className="font-black">📍 Communes Clients</p>{(() => { const map = new Map(); clients.forEach(x => map.set(x.commune || "Non précisé", (map.get(x.commune || "Non précisé") || 0) + 1)); return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]: any) => <p key={k} className="text-[12px] mt-1">{k} : <b>{v}</b></p>); })()}</div><div className="bg-white border rounded-2xl p-4"><p className="font-black">📍 Quartiers Boutiques</p>{(() => { const map = new Map(); boutiques.forEach(x => map.set(x.quartier || "Non précisé", (map.get(x.quartier || "Non précisé") || 0) + 1)); return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]: any) => <p key={k} className="text-[12px] mt-1">{k} : <b>{v}</b></p>); })()}</div></div>
        )}
        {onglet === "BOUTIQUES" && (
          <div className="space-y-3"><div className="bg-white border rounded-2xl p-4"><p className="font-black">🏪 Boutiques ({boutiques.length})</p><p className="text-[11px] text-gray-500">En attente : {boutiques.filter(b => b.statut === "EN_ATTENTE").length} • Validées : {boutiques.filter(b => b.statut === "VALIDEE").length} • Rejetées : {boutiques.filter(b => b.statut === "REJETEE").length}</p></div>
          {boutiques.filter(filtre).map((b: any) => <div key={b.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{b.nom}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{b.statut}</span></div><p className="text-[11px] text-gray-600 mt-1">{b.proprietaire || ""} • {b.telephone || b.whatsapp} • {b.commune} {b.quartier || ""}</p><p className="text-[11px] text-gray-500">Type : {b.type_public || b.type} • Invité par : {b.code_invitation || b.code_amb || "Aucun"}</p>{b.statut === "EN_ATTENTE" && <div className="flex gap-2 mt-3"><button onClick={() => validerBoutique(b)} className="flex-1 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Valider (+5 pts)</button><button onClick={() => rejeterBoutique(b)} className="flex-1 bg-red-600 text-white py-2.5 rounded-full text-[11px] font-black">⛔ Rejeter</button></div>}</div>)}
          </div>
        )}
        {onglet === "MODERATION" && (
          <div className="space-y-3"><div className="bg-white border rounded-2xl p-4"><p className="font-black">🛡️ Modération ({annonces.filter(a => a.statut === "EN_ATTENTE").length} en attente)</p><label className="block mt-3"><span className="text-[11px] font-black">Motif de suspension</span><input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex: Photo non conforme..." className="w-full border rounded-xl px-3 py-3 mt-1" /></label></div>
          {annonces.filter(filtre).map((a: any) => <div key={a.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{a.titre}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{a.statut}</span></div><p className="text-[11px] text-gray-600 mt-1">{a.description || ""}</p>{a.statut === "EN_ATTENTE" && <div className="flex gap-2 mt-3"><button onClick={() => moderer(a.id, "APPROUVE")} className="flex-1 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Approuver</button><button onClick={() => moderer(a.id, "SUSPENDUE")} className="flex-1 bg-red-600 text-white py-2.5 rounded-full text-[11px] font-black">⏸️ Suspendre</button></div>}</div>)}
          </div>
        )}
        {onglet === "PAIEMENTS" && (
          <div className="space-y-3"><div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Paiements ({paiements.length})</p><p className="text-[11px] text-gray-500">Payés : {paiements.filter(estPaye).length} • En attente : {paiements.filter(p => !estPaye(p)).length} • Total payé : {totalVentes.toLocaleString()} CDF</p></div>
          {paiements.filter(filtre).map((p: any) => <div key={p.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{Number(p.montant || 0).toLocaleString()} CDF - {typePaiement(p)}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{p.statut}</span></div><p className="text-[11px] text-gray-600 mt-1">{p.qui || p.boutique_id || ""} • {new Date(p.created_at).toLocaleDateString()}</p>{!estPaye(p) && <button onClick={() => validerPaiement(p.id)} className="w-full mt-3 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Valider le paiement (+20 pts si abo)</button>}</div>)}
          </div>
        )}
        {onglet === "PROBLEMES" && (
          <div className="space-y-3"><div className="bg-white border rounded-2xl p-4"><p className="font-black">🚨 Problèmes ({problemes.filter(p => p.statut === "OUVERT").length} ouverts)</p></div>
          {problemes.filter(filtre).map((pb: any) => <div key={pb.id} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><p className="font-black">{pb.type}</p><span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 font-black">{pb.statut}</span></div><p className="text-[11px] text-gray-600 mt-1">{pb.detail || ""}</p>{pb.statut === "OUVERT" && <button onClick={() => resoudre(pb.id)} className="w-full mt-3 bg-black text-white py-2.5 rounded-full text-[11px] font-black">✅ Marquer résolu</button>}</div>)}
          </div>
        )}
        {onglet === "DESIGN" && (
          <div className="space-y-3"><div className="bg-white border rounded-2xl p-4 space-y-3"><p className="font-black">🎨 Design Public</p><label className="block"><span className="text-[11px] font-black">Titre</span><input value={config.title} onChange={e => setConfig({ ...config, title: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="block"><span className="text-[11px] font-black">Slogan</span><input value={config.slogan} onChange={e => setConfig({ ...config, slogan: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="block"><span className="text-[11px] font-black">À propos</span><textarea value={config.about} onChange={e => setConfig({ ...config, about: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" rows={3} /></label><label className="block"><span className="text-[11px] font-black">WhatsApp DG</span><input value={config.whats} onChange={e => setConfig({ ...config, whats: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><div className="flex gap-2"><label className="flex-1"><span className="text-[11px] font-black">Couleur principale</span><input value={config.main} onChange={e => setConfig({ ...config, main: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="flex-1"><span className="text-[11px] font-black">Couleur bouton</span><input value={config.btn} onChange={e => setConfig({ ...config, btn: e.target.value })} className="w-full border rounded-xl px-3 py-3 mt-1" /></label></div><button onClick={publierDesign} className="w-full bg-black text-white py-4 rounded-full font-black">✅ Publier le design</button></div></div>
        )}
        {onglet === "PARAMETRES" && (
          <div className="space-y-3"><div className="bg-white border rounded-2xl p-4 space-y-3"><p className="font-black">⚙️ Paramètres</p><label className="block"><span className="text-[11px] font-black">% Commission</span><input type="number" value={pctCommission} onChange={e => setPctCommission(Number(e.target.value))} className="w-full border rounded-xl px-3 py-3 mt-1" /></label><label className="block"><span className="text-[11px] font-black">Prix abonnement (CDF)</span><input type="number" value={prixAbo} onChange={e => setPrixAbo(Number(e.target.value))} className="w-full border rounded-xl px-3 py-3 mt-1" /></label></div><div className="bg-white border rounded-2xl p-4"><p className="font-black">🔒 Sécurité</p><p className="text-[11px] text-gray-500 mt-1">PIN DG : 2026 — Ne partage jamais ton PIN.</p></div></div>
        )}
      </div>
    </div>
  );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 }
