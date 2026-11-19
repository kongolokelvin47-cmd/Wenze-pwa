"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase: any = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : null;

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
  const [filtreCommune, setFiltreCommune] = useState("TOUTES");
  const [filtreType, setFiltreType] = useState("TOUS");
  const [motif, setMotif] = useState("");
  const [pctCommission, setPctCommission] = useState(10);
  const [prixAbo, setPrixAbo] = useState(50000);
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  const charger = async () => {
    if (!supabase) return show("⚠️ Clés Supabase manquantes sur Vercel");
    const [m, b, c, p, a, pr, cfg] = await Promise.all([
      supabase.from("membres").select("*").order("created_at", { ascending: false }),
      supabase.from("boutiques").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("paiements").select("*").order("created_at", { ascending: false }),
      supabase.from("annonces_publiques").select("*").order("created_at", { ascending: false }),
      supabase.from("problemes").select("*").order("created_at", { ascending: false }),
      supabase.from("config_publique").select("*").eq("id", 1).single(),
    ]);
    if (m.data) setMembres(m.data);
    if (b.data) setBoutiques(b.data);
    if (c.data) setClients(c.data);
    if (p.data) setPaiements(p.data);
    if (a.data) setAnnonces(a.data);
    if (pr.data) setProblemes(pr.data);
    if (cfg.data) setConfig({ title: cfg.data.title, slogan: cfg.data.slogan, about: cfg.data.about, whats: cfg.data.whats, main: cfg.data.main_color, btn: cfg.data.btn_color });
  };

  useEffect(() => {
    charger();
    if (!supabase) return;
    const ch = supabase.channel("wenze-reel")
      .on("postgres_changes", { event: "*", schema: "public", table: "membres" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "annonces_publiques" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "problemes" }, charger)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (!ok) return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#0A0A0A] text-white p-6 flex flex-col justify-center">
      <p className="text-[28px] font-black">WENZE<span className="text-[#FF6B00]">.</span></p>
      <h1 className="font-black text-[24px] mt-4">👑 Bureau DG — Vraies données</h1>
      <p className="text-[12px] opacity-60">Aucune donnée fictive. Tout vient de Supabase.</p>
      <input value={pin} onChange={e => setPin(e.target.value)} type="password" inputMode="numeric" placeholder="PIN DG" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 mt-6 text-center text-[22px] tracking-[8px] outline-none" />
      <button onClick={() => pin === "2026" ? setOk(true) : show("❌ PIN incorrect")} className="w-full bg-[#FF6B00] py-4 rounded-full font-black mt-4">🔓 ENTRER</button>
      {toast && <p className="text-center text-[12px] mt-3 font-bold">{toast}</p>}
    </div>
  );
    // ===== RÈGLES RÉELLES — AUCUN CHIFFRE EN DUR =====
  const estActif = (s: string) => s === "ACTIF" || s === "VALIDEE" || s === "PAYE";
  const estPaye = (p: any) => p.statut === "PAYÉ" || p.statut === "PAYE";
  const premiers = paiements.filter(p => p.type === "PREMIER" && estPaye(p));
  const occasionnels = paiements.filter(p => p.type === "OCCASIONNELLE" && estPaye(p));
  const renouvellements = paiements.filter(p => p.type === "RENOUVELLEMENT" && estPaye(p));
  const baseCommission = [...premiers, ...occasionnels].reduce((s, p) => s + Number(p.montant || 0), 0);
  const totalVentes = paiements.filter(estPaye).reduce((s, p) => s + Number(p.montant || 0), 0);
  const commission = Math.round(baseCommission * pctCommission / 100);
  const benefice = totalVentes - commission;

  // Points invitations — RÉSERVÉ PUBLIC (boutiques + clients), seulement ACTIFS
  const pointsDe = (codeInvitation: string) => {
    const boutInv = boutiques.filter(b => b.code_invitation === codeInvitation && estActif(b.statut));
    const cliInv = clients.filter(c => c.code_invitation === codeInvitation && c.statut === "ACTIF");
    const aboPayesParInvites = paiements.filter(p => {
      const b = boutiques.find(x => x.id === p.boutique_id);
      return b && b.code_invitation === codeInvitation && estPaye(p) && (p.type === "PREMIER" || p.type === "OCCASIONNELLE");
    });
    return {
      bout: boutInv.length, cli: cliInv.length, abo: aboPayesParInvites.length,
      ptsBout: boutInv.length * 5, ptsCli: cliInv.length * 3, ptsBonus: aboPayesParInvites.length * 20,
      total: boutInv.length * 5 + cliInv.length * 3 + aboPayesParInvites.length * 20,
      boutInv, cliInv,
    };
  };

  // Stats par milieu — RÉELLES
  const statsMilieu = (liste: any[], niveau: string) => {
    const map = new Map<string, number>();
    liste.forEach(x => { const k = x[niveau] || "Non précisé"; map.set(k, (map.get(k) || 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  const sup = membres.filter(m => m.role === "SUPERVISEUR");
  const amb = membres.filter(m => m.role === "AMBASSADEUR");
  const invitantsPublic = [
    ...boutiques.map(b => ({ type: "BOUTIQUE", nom: b.nom, code: b.code_pro || b.id, commune: b.commune, quartier: b.quartier })),
    ...clients.map(c => ({ type: "CLIENT", nom: c.nom, code: c.code_invitation || c.id, commune: c.commune, quartier: c.quartier })),
  ];
  const classement = invitantsPublic.map(inv => ({ ...inv, pts: pointsDe(inv.code) })).filter(x => x.pts.total > 0).sort((a, b) => b.pts.total - a.pts.total);
    const validerPaiement = async (id: string) => {
    await supabase.from("paiements").update({ statut: "PAYÉ" }).eq("id", id);
    show("✅ Paiement validé — comptabilité + points mis à jour"); charger();
  };
  const moderer = async (id: string, statut: string) => {
    if (statut === "SUSPENDUE" && !motif.trim()) return show("⚠️ Écris d'abord le motif");
    await supabase.from("annonces_publiques").update({ statut, motif }).eq("id", id);
    show(statut === "APPROUVEE" ? "✅ Approuvée — visible au public" : "⏸️ Suspendue — plus visible"); setMotif(""); charger();
  };
  const changerMembre = async (id: string, statut: string) => {
    await supabase.from("membres").update({ statut }).eq("id", id); show("✅ Mis à jour"); charger();
  };
  const resoudre = async (id: string) => { await supabase.from("problemes").update({ statut: "RESOLU" }).eq("id", id); charger(); };
  const publierDesign = async () => {
    await supabase.from("config_publique").update({ title: config.title, slogan: config.slogan, about: config.about, whats: config.whats, main_color: config.main, btn_color: config.btn, updated_at: new Date().toISOString() }).eq("id", 1);
    show("✅ Publié — public voit en 1-2 sec");
  };

  return (
    <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
      {toast && <div className="fixed top-4 left-4 right-4 z-[60] bg-black text-white p-3 rounded-2xl text-[12px] font-bold text-center">{toast}</div>}
      <div className="bg-black text-white px-5 pt-8 pb-6 rounded-b-[32px]">
        <p className="text-[11px] opacity-60">WENZE • DG • DONNÉES RÉELLES</p>
        <h1 className="font-black text-[24px]">👑 Tableau DG</h1>
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black">{sup.length}</p><p className="text-[9px]">SUPERVISEURS</p></div>
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black">{amb.length}</p><p className="text-[9px]">AMBASSADEURS</p></div>
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black">{boutiques.length}</p><p className="text-[9px]">BOUTIQUES</p></div>
          <div className="bg-[#FF6B00] rounded-2xl p-2"><p className="font-black">{clients.length}</p><p className="text-[9px]">CLIENTS</p></div>
        </div>
      </div>
      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
        {["DASH", "INVITATIONS", "COMPTA", "STATS", "BOUTIQUES", "MODERATION", "PAIEMENTS", "PROBLEMES", "DESIGN"].map(t => (
          <button key={t} onClick={() => setOnglet(t)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>{t === "DASH" ? "📊 Dashboard" : t === "INVITATIONS" ? "🏆 Invitations" : t === "COMPTA" ? "💰 Comptabilité" : t === "STATS" ? "📍 Stats Milieu" : t === "BOUTIQUES" ? "🏪 Boutiques" : t === "MODERATION" ? `🛡️ Modération (${annonces.filter(a => a.statut === "EN_ATTENTE").length})` : t === "PAIEMENTS" ? "💰 Paiements" : t === "PROBLEMES" ? "🚨 Problèmes" : "🎨 Design"}</button>
        ))}
      </div>
      <div className="px-4 mt-4">
        {onglet === "DASH" && (
          <div className="space-y-3">
            {boutiques.length === 0 && clients.length === 0 && <div className="bg-yellow-100 border border-yellow-300 rounded-2xl p-4 text-[12px] font-bold">📭 Aucune donnée réelle pour l'instant. Dès que le public créera une boutique ou un client, ça apparaîtra ici automatiquement. Aucune donnée fictive affichée.</div>}
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Ventes réelles</p><p className="text-[13px] mt-1">Total : <b>{totalVentes.toLocaleString()} CDF</b> • Commission : <b>{commission.toLocaleString()} CDF</b> ({pctCommission}% sur 1ers + occasionnelles) • Bénéfice : <b className={benefice >= 0 ? "text-green-600" : "text-red-600"}>{benefice.toLocaleString()} CDF</b></p></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏆 Top 3 Concours — Points réels</p>{classement.slice(0, 3).map((c, i) => <p key={i} className="text-[12px] mt-1">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {c.nom} — {c.pts.total} pts ({c.pts.bout} bout. ×5 + {c.pts.cli} cli. ×3 + {c.pts.abo} abo. ×20)</p>)}{classement.length === 0 && <p className="text-[12px] text-gray-500">Aucun point pour l'instant.</p>}</div>
          </div>
        )}
        {onglet === "INVITATIONS" && (
          <div className="space-y-2">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">🏆 Invitations — Réservé au public</p><p className="text-[11px] opacity-80 mt-1">Seules Boutiques + Clients peuvent inviter. Client actif = 3 pts • Boutique active = 5 pts • +20 pts par abonnement payé par l'invité (1er abonnement ou vente occasionnelle). En attente / suspendu = 0 pt bonus.</p></div>
            {classement.map((c, i) => (
              <div key={i} className="bg-white border rounded-2xl p-4"><p className="font-black">{i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`} {c.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{c.type} • {c.commune}</span></p><p className="text-[12px] mt-1">{c.pts.bout} bout. ×5 = {c.pts.ptsBout} pts • {c.pts.cli} cli. ×3 = {c.pts.ptsCli} pts • {c.pts.abo} abo. payés ×20 = {c.pts.ptsBonus} pts</p><p className="font-black text-[14px] mt-1">TOTAL : {c.pts.total} pts</p></div>
            ))}
            {classement.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune invitation validée pour l'instant.</p>}
          </div>
        )}
        {onglet === "COMPTA" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">⚙️ Paramètres DG</p><div className="flex gap-2 mt-2"><label className="text-[11px] flex-1">% Commission<input value={pctCommission} onChange={e => setPctCommission(Number(e.target.value))} type="number" className="w-full border rounded-xl px-3 py-2 mt-1" /></label><label className="text-[11px] flex-1">Prix abonnement CDF<input value={prixAbo} onChange={e => setPrixAbo(Number(e.target.value))} type="number" className="w-full border rounded-xl px-3 py-2 mt-1" /></label></div><p className="text-[11px] text-gray-500 mt-2">Commission = uniquement sur 1er abonnement + vente occasionnelle. Renouvellement = 0 CDF.</p></div>
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">💰 Comptabilité réelle</p><p className="text-[13px] mt-1">Ventes totales : {totalVentes.toLocaleString()} CDF</p><p className="text-[13px]">Base commission (1ers + occasionnelles) : {baseCommission.toLocaleString()} CDF</p><p className="text-[13px]">Renouvellements : {renouvellements.reduce((s, p) => s + Number(p.montant || 0), 0).toLocaleString()} CDF → commission 0 CDF</p><p className="text-[13px]">Commission ({pctCommission}%) : {commission.toLocaleString()} CDF</p><p className="font-black mt-1">Bénéfice net : {benefice.toLocaleString()} CDF</p></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📋 Rapport jour à jour — ce mois</p>{paiements.filter(p => estPaye(p)).slice(0, 20).map(p => <p key={p.id} className="text-[12px] mt-1">• {(p.created_at || "").slice(0, 10)} — {p.qui} — {Number(p.montant).toLocaleString()} CDF — {p.type} {p.type === "RENOUVELLEMENT" ? "(0 commission)" : `(${Math.round(Number(p.montant) * pctCommission / 100).toLocaleString()} CDF commission)`}</p>)}{paiements.filter(estPaye).length === 0 && <p className="text-[12px] text-gray-500">Aucun paiement réel.</p>}</div>
          </div>
        )}
                {onglet === "STATS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏪 Boutiques par Commune — Réel</p>{statsMilieu(boutiques, "commune").map(([k, v]) => <p key={k} className="text-[12px] mt-1">• {k} : <b>{v} boutiques</b></p>)}{boutiques.length === 0 && <p className="text-[12px] text-gray-500">Aucune boutique réelle.</p>}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏪 Boutiques par Quartier — Réel</p>{statsMilieu(boutiques, "quartier").map(([k, v]) => <p key={k} className="text-[12px] mt-1">• {k} : <b>{v}</b></p>)}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">👥 Clients par Commune — Réel</p>{statsMilieu(clients, "commune").map(([k, v]) => <p key={k} className="text-[12px] mt-1">• {k} : <b>{v} clients</b></p>)}{clients.length === 0 && <p className="text-[12px] text-gray-500">Aucun client réel.</p>}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">👥 Clients par Quartier — Réel</p>{statsMilieu(clients, "quartier").map(([k, v]) => <p key={k} className="text-[12px] mt-1">• {k} : <b>{v}</b></p>)}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🌍 Par Province / Pays — Réel</p><p className="text-[12px] mt-1">Boutiques par province : {statsMilieu(boutiques, "province").map(([k, v]) => `${k} (${v})`).join(", ") || "—"}</p><p className="text-[12px]">Clients par province : {statsMilieu(clients, "province").map(([k, v]) => `${k} (${v})`).join(", ") || "—"}</p></div>
          </div>
        )}
        {onglet === "BOUTIQUES" && (
          <div className="space-y-2">
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher boutique réelle..." className="w-full border rounded-full px-3 py-2.5 text-[12px]" />
            {boutiques.filter(b => b.nom.toLowerCase().includes(recherche.toLowerCase())).map(b => (
              <div key={b.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{b.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{b.statut} • {b.abonnement}</span></p><p className="text-[11px] text-gray-500">{b.proprietaire} • {b.telephone} • 📍 {b.commune} — {b.quartier}</p><p className="text-[11px]">Type : {b.type_abonnement} • Code invitation : {b.code_invitation || "—"}</p></div>
            ))}
            {boutiques.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune boutique réelle.</p>}
          </div>
        )}
        {onglet === "MODERATION" && (
          <div className="space-y-3">
            <div className="bg-red-600 text-white rounded-2xl p-4"><p className="font-black">🛡️ Modération DG</p><p className="text-[11px] opacity-90">Seul le DG approuve. Le public ne voit que les APPROUVÉES.</p></div>
            <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Motif DG avant de suspendre..." className="w-full border rounded-xl px-3 py-3 text-[12px]" />
            {annonces.map(a => (
              <div key={a.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{a.titre} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{a.statut}</span></p><p className="text-[12px] text-gray-600">{a.description}</p><p className="text-[11px] text-gray-500">{a.auteur} • {a.telephone} • {a.commune} • {Number(a.prix || 0).toLocaleString()} CDF</p>{a.motif && <p className="text-[11px] text-red-600 font-bold">Motif : {a.motif}</p>}<div className="flex gap-1.5 mt-2"><button onClick={() => moderer(a.id, "APPROUVEE")} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">✅ Approuver</button><button onClick={() => moderer(a.id, "SUSPENDUE")} className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">⏸️ Suspendre</button><button onClick={() => moderer(a.id, "SUPPRIMEE")} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-[11px] font-bold">🗑️ Supprimer</button></div></div>
            ))}
            {annonces.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune annonce réelle.</p>}
          </div>
        )}
        {onglet === "PAIEMENTS" && (
          <div className="space-y-3">
            <div className="flex gap-1.5">{["TOUS", "PREMIER", "RENOUVELLEMENT", "OCCASIONNELLE"].map(f => <button key={f} onClick={() => setFiltreType(f)} className={`px-3 py-2 rounded-full text-[11px] font-black ${filtreType === f ? "bg-black text-white" : "bg-white border"}`}>{f === "TOUS" ? "Tous" : f === "PREMIER" ? "🆕 1er" : f === "RENOUVELLEMENT" ? "🔄 Renouv." : "🎯 Occas."}</button>)}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Boutiques ayant payé — Réel</p><p className="text-[12px]">Total encaissé : {totalVentes.toLocaleString()} CDF • Payées : {paiements.filter(estPaye).length}</p></div>
            {paiements.filter(p => estPaye(p) && (filtreType === "TOUS" || p.type === filtreType)).map(p => (
              <div key={p.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{p.qui} — {Number(p.montant).toLocaleString()} CDF <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{p.type} • {p.methode} • {(p.created_at || "").slice(0, 10)}</span></p><p className="text-[11px]">{p.type === "RENOUVELLEMENT" ? "🔄 Renouvellement — Commission 0 CDF" : `🆕 Commission ${Math.round(Number(p.montant) * pctCommission / 100).toLocaleString()} CDF (${pctCommission}%)`}</p></div>
            ))}
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">⏳ En attente de validation</p>{paiements.filter(p => !estPaye(p)).map(p => <div key={p.id} className="flex justify-between items-center mt-2"><p className="text-[12px]">{p.qui} — {Number(p.montant).toLocaleString()} CDF — {p.type}</p><button onClick={() => validerPaiement(p.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">✅ Valider</button></div>)}{paiements.filter(p => !estPaye(p)).length === 0 && <p className="text-[12px] text-gray-500">Aucun en attente.</p>}</div>
          </div>
        )}
        {onglet === "PROBLEMES" && (
          <div className="space-y-2">{problemes.map(p => <div key={p.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{p.type} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{p.urgence} • {p.statut}</span></p><p className="text-[12px]">{p.qui} • {p.detail}</p>{p.statut === "OUVERT" && <button onClick={() => resoudre(p.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold mt-2">✅ Résoudre</button>}</div>)}{problemes.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun problème réel.</p>}</div>
        )}
        {onglet === "DESIGN" && (
          <div className="bg-white border rounded-2xl p-4"><p className="font-black">🎨 Design Public</p><input value={config.title} onChange={e => setConfig({ ...config, title: e.target.value })} placeholder="Titre" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={config.slogan} onChange={e => setConfig({ ...config, slogan: e.target.value })} placeholder="Slogan" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={config.about} onChange={e => setConfig({ ...config, about: e.target.value })} placeholder="À propos" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={config.whats} onChange={e => setConfig({ ...config, whats: e.target.value })} placeholder="WhatsApp" className="w-full border rounded-xl px-3 py-3 mt-2" /><button onClick={publierDesign} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-[13px] mt-3">🚀 PUBLIER — Public voit en 1-2 sec</button></div>
        )}
      </div>
    </div>
  );
            }
