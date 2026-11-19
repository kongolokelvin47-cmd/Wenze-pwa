"use client";
// === BUREAU DG COMPLET — PORTE DG UNIQUEMENT ===
// wenze-pwa.vercel.app/dg-prive — PIN 2026 — Aucun lien Équipe
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase: any = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : null;

export default function PageDG() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [connecte, setConnecte] = useState(false);
  const [tempsRestant, setTempsRestant] = useState("");
  const [onglet, setOnglet] = useState("DASH");
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [membres, setMembres] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ slogan: "", couleur: "#FF6B00" });
  const [toast, setToast] = useState("");
  const [filtreProvince, setFiltreProvince] = useState("TOUT");
  const [filtreCommune, setFiltreCommune] = useState("TOUT");
  const [recherche, setRecherche] = useState("");
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("wenze_session") || "null");
      if (s && s.role === "DG" && Date.now() - (s.debut || 0) < 12 * 3600 * 1000) {
        setConnecte(true);
        const rest = 12 * 3600 * 1000 - (Date.now() - s.debut);
        setTempsRestant(`${Math.floor(rest / 3600000)}h ${Math.floor((rest % 3600000) / 60000)}min restant`);
      } else { document.cookie = "wenze-role=; path=/; max-age=0"; localStorage.removeItem("wenze_session"); }
    } catch {}
  }, []);

  const entrer = () => {
    if (pin !== "2026") return setMsg("❌ PIN incorrect");
    document.cookie = "wenze-role=DG; path=/; max-age=43200; SameSite=Lax";
    try { localStorage.setItem("wenze_session", JSON.stringify({ role: "DG", debut: Date.now() })); } catch {}
    setMsg(""); setConnecte(true); setTempsRestant("12h 00min restant");
  };
  const deconnexion = () => { document.cookie = "wenze-role=; path=/; max-age=0"; try { localStorage.removeItem("wenze_session"); } catch {} setConnecte(false); setPin(""); router.push("/dg-prive"); };

  const charger = async () => {
    if (!supabase) return;
    const [b, c, p, m, a, inv, cfg] = await Promise.all([
      supabase.from("boutiques").select("*"),
      supabase.from("clients").select("*"),
      supabase.from("paiements").select("*"),
      supabase.from("membres").select("*"),
      supabase.from("annonces").select("*"),
      supabase.from("invitations").select("*"),
      supabase.from("config_publique").select("*").limit(1).single(),
    ]);
    if (b.data) setBoutiques(b.data);
    if (c.data) setClients(c.data);
    if (p.data) setPaiements(p.data);
    if (m.data) setMembres(m.data);
    if (a.data) setAnnonces(a.data);
    if (inv.data) setInvitations(inv.data);
    if (cfg.data) setConfig(cfg.data);
  };
  useEffect(() => { if (connecte) charger(); }, [connecte]);
    const aujourdHui = new Date().toISOString().slice(0, 10);
  const ceMois = new Date().toISOString().slice(0, 7);
  const boutiquesFiltrees = useMemo(() => boutiques.filter(b => (filtreProvince === "TOUT" || b.province === filtreProvince) && (filtreCommune === "TOUT" || b.commune === filtreCommune) && (recherche === "" || (b.nom + b.proprietaire + b.telephone).toLowerCase().includes(recherche.toLowerCase()))), [boutiques, filtreProvince, filtreCommune, recherche]);
  const clientsFiltres = useMemo(() => clients.filter(c => (filtreProvince === "TOUT" || c.province === filtreProvince) && (filtreCommune === "TOUT" || c.commune === filtreCommune)), [clients, filtreProvince, filtreCommune]);
  const paiementsPayes = paiements.filter(p => p.statut === "PAYÉ");
  const totalEncaisse = paiementsPayes.reduce((s, p) => s + Number(p.montant || 0), 0);
  const totalMois = paiementsPayes.filter(p => (p.created_at || "").slice(0, 7) === ceMois).reduce((s, p) => s + Number(p.montant || 0), 0);
  const totalJour = paiementsPayes.filter(p => (p.created_at || "").slice(0, 10) === aujourdHui).reduce((s, p) => s + Number(p.montant || 0), 0);
  const provinces = useMemo(() => ["TOUT", ...new Set(boutiques.map(b => b.province).filter(Boolean))], [boutiques]);
  const communes = useMemo(() => ["TOUT", ...new Set(boutiques.filter(b => filtreProvince === "TOUT" || b.province === filtreProvince).map(b => b.commune).filter(Boolean))], [boutiques, filtreProvince]);

  // Invitations — Points réels : Boutique validée 5 pts, Client actif 3 pts, +20 pts par abonnement payé de l'invité
  const classementInvitations = useMemo(() => {
    const map: any = {};
    invitations.forEach(inv => {
      const cle = inv.parrain_nom || inv.parrain_tel || inv.parrain || "Inconnu";
      if (!map[cle]) map[cle] = { nom: cle, tel: inv.parrain_tel || "", boutiques: 0, clients: 0, abosPayes: 0, points: 0 };
      if (inv.type_invite === "BOUTIQUE" && inv.statut_invite === "VALIDEE") { map[cle].boutiques++; map[cle].points += 5; }
      if (inv.type_invite === "CLIENT" && inv.statut_invite === "ACTIF") { map[cle].clients++; map[cle].points += 3; }
      if (inv.abonnement_paye) { map[cle].abosPayes++; map[cle].points += 20; }
    });
    return Object.values(map).sort((a: any, b: any) => b.points - a.points);
  }, [invitations]);

  // Commissions Ambassadeurs — 1er abonnement + occasionnelle seulement, Renouvellement = 0
  const commissions = useMemo(() => {
    const map: any = {};
    membres.filter(m => m.role === "AMBASSADEUR").forEach(a => { map[a.code_pro] = { nom: a.nom, code: a.code_pro, total: 0, premiers: 0, renouvellements: 0 }; });
    paiementsPayes.forEach(p => {
      const bout = boutiques.find(b => b.id === p.boutique_id || b.nom === p.qui);
      const codeAmb = bout?.code_amb || p.code_amb;
      if (!codeAmb || !map[codeAmb]) return;
      if (p.type === "RENOUVELLEMENT") map[codeAmb].renouvellements++;
      else { map[codeAmb].premiers++; map[codeAmb].total += Math.round(Number(p.montant || 0) * 0.10); }
    });
    return Object.values(map);
  }, [paiementsPayes, boutiques, membres]);

  const majStatut = async (table: string, id: string, champ: string, valeur: string) => {
    const { error } = await supabase.from(table).update({ [champ]: valeur }).eq("id", id);
    if (error) return show("❌ " + error.message);
    show("✅ Mis à jour"); charger();
  };
  const supprimer = async (table: string, id: string) => {
    if (!confirm("Supprimer définitivement ?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return show("❌ " + error.message);
    show("✅ Supprimé"); charger();
  };
  const sauverConfig = async () => {
    const { error } = await supabase.from("config_publique").upsert({ id: 1, slogan: config.slogan, couleur: config.couleur, updated_at: new Date().toISOString() });
    if (error) return show("❌ " + error.message);
    show("✅ Studio public publié en temps réel");
  };
    if (!connecte) return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#0A0A0A] text-white p-6 flex flex-col justify-center">
      <p className="text-[28px] font-black">WENZE<span className="text-[#FF6B00]">.</span></p>
      <h1 className="font-black text-[24px] mt-4">👑 Bureau DG</h1>
      <p className="text-[12px] opacity-60 mt-1">Accès réservé au Directeur Général.<br />Porte DG uniquement — dg-prive.</p>
      <input value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => { if (e.key === "Enter") entrer(); }} type="password" inputMode="numeric" placeholder="PIN DG" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 mt-6 text-center text-[22px] tracking-[8px] outline-none" />
      <button onClick={entrer} className="w-full bg-[#FF6B00] py-4 rounded-full font-black mt-4">🔓 ENTRER DANS MON BUREAU DG</button>
      {msg && <p className="text-center text-[12px] mt-3 font-bold">{msg}</p>}
      <p className="text-center text-[11px] opacity-40 mt-8">Porte DG — dg-prive uniquement</p>
    </div>
  );

  return (
    <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
      {toast && <div className="fixed top-4 left-4 right-4 z-50 bg-black text-white p-3 rounded-2xl text-[12px] font-bold text-center">{toast}</div>}
      <div className="bg-black text-white px-5 pt-8 pb-6 rounded-b-[32px]">
        <p className="text-[11px] opacity-60">WENZE • DIRECTEUR GÉNÉRAL • BUREAU DG</p>
        <h1 className="font-black text-[22px]">👑 Bonjour DG</h1>
        <p className="text-[11px] opacity-70">⏱️ {tempsRestant} • Données réelles Supabase</p>
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black">{boutiques.length}</p><p className="text-[9px]">BOUTIQUES</p></div>
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black">{clients.length}</p><p className="text-[9px]">CLIENTS</p></div>
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black">{membres.filter(m => m.role === "AMBASSADEUR").length}</p><p className="text-[9px]">AMBASS.</p></div>
          <div className="bg-[#FF6B00] rounded-2xl p-2"><p className="font-black">{totalEncaisse.toLocaleString()}</p><p className="text-[9px]">CDF ENCAISSÉ</p></div>
        </div>
      </div>
      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
        {["DASH", "BOUTIQUES", "CLIENTS", "COMPTA", "INVITATIONS", "ANNONCES", "EQUIPE", "STUDIO"].map(t => <button key={t} onClick={() => setOnglet(t)} className={`px-3 py-2 rounded-full text-[11px] font-black whitespace-nowrap ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>{t === "DASH" ? "📊 Dashboard" : t === "BOUTIQUES" ? "🏪 Boutiques" : t === "CLIENTS" ? "👥 Clients" : t === "COMPTA" ? "💰 Compta" : t === "INVITATIONS" ? "🏆 Invitations" : t === "ANNONCES" ? "📢 Annonces" : t === "EQUIPE" ? "🛡️ Équipe" : "🎨 Studio"}</button>)}
      </div>
            <div className="px-4 mt-4">
        {onglet === "DASH" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📋 Rapport — {aujourdHui}</p><p className="text-[13px] mt-1">Aujourd'hui : <b>{totalJour.toLocaleString()} CDF</b> • Ce mois : <b>{totalMois.toLocaleString()} CDF</b> • Total : <b>{totalEncaisse.toLocaleString()} CDF</b></p><p className="text-[13px]">🏪 {boutiques.filter(b => (b.created_at || "").slice(0, 10) === aujourdHui).length} boutiques aujourd'hui • 👥 {clients.filter(c => (c.created_at || "").slice(0, 10) === aujourdHui).length} clients aujourd'hui</p></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🗺️ Hiérarchie — Province / Commune / Quartier</p><p className="text-[12px] mt-1">Filtre par province / commune en haut de l'onglet Boutiques. Exemple : Kinshasa → Lemba, Limete → quartier.</p><p className="text-[12px]">Boutiques validées : <b>{boutiques.filter(b => b.statut === "VALIDEE").length}</b> • En attente : <b>{boutiques.filter(b => b.statut === "EN_ATTENTE").length}</b> • Suspendues : <b>{boutiques.filter(b => b.statut === "SUSPENDUE").length}</b></p></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">⚠️ Annonces en attente de modération</p><p className="text-[13px]">{annonces.filter(a => a.statut === "EN_ATTENTE").length} annonce(s) à valider • {annonces.filter(a => a.statut === "APPROUVE").length} visible(s) public</p></div>
          </div>
        )}
        {onglet === "BOUTIQUES" && (
          <div className="space-y-2">
            <div className="flex gap-2"><select value={filtreProvince} onChange={e => { setFiltreProvince(e.target.value); setFiltreCommune("TOUT"); }} className="flex-1 border rounded-xl px-2 py-2 text-[12px] bg-white">{provinces.map(p => <option key={p} value={p}>{p === "TOUT" ? "Toutes provinces" : p}</option>)}</select><select value={filtreCommune} onChange={e => setFiltreCommune(e.target.value)} className="flex-1 border rounded-xl px-2 py-2 text-[12px] bg-white">{communes.map(c => <option key={c} value={c}>{c === "TOUT" ? "Toutes communes" : c}</option>)}</select></div>
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="🔍 Rechercher boutique, proprio, téléphone..." className="w-full border rounded-xl px-3 py-3 bg-white" />
            {boutiquesFiltrees.map(b => <div key={b.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{b.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{b.statut} • {b.abonnement}</span></p><p className="text-[11px] text-gray-500">{b.proprietaire} • {b.telephone} • 📍 {b.province} — {b.commune} — {b.quartier}</p><p className="text-[11px]">Amenée par : {membres.find(m => m.code_pro === b.code_amb)?.nom || b.code_amb || "—"}</p><div className="flex gap-1.5 mt-2">{b.statut !== "VALIDEE" && <button onClick={() => majStatut("boutiques", b.id, "statut", "VALIDEE")} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">✅ Valider</button>}<button onClick={() => majStatut("boutiques", b.id, "statut", "SUSPENDUE")} className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[11px] font-black">⏸️ Suspendre</button>}<button onClick={() => supprimer("boutiques", b.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">🗑️ Supprimer</button></div></div>)}{boutiquesFiltrees.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune boutique.</p>}
          </div>
        )}
        {onglet === "CLIENTS" && (
          <div className="space-y-2">{clientsFiltres.map(c => <div key={c.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{c.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{c.statut}</span></p><p className="text-[11px] text-gray-500">{c.telephone} • 📍 {c.province} — {c.commune} — {c.quartier} • Parrain : {c.code_parrain}</p><div className="flex gap-1.5 mt-2"><button onClick={() => majStatut("clients", c.id, "statut", "ACTIF")} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">✅ Activer</button><button onClick={() => majStatut("clients", c.id, "statut", "SUSPENDU")} className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[11px] font-black">⏸️ Suspendre</button><button onClick={() => supprimer("clients", c.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">🗑️ Supprimer</button></div></div>)}{clientsFiltres.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun client.</p>}</div>
        )}
        {onglet === "COMPTA" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4"><p className="font-black">💰 Comptabilité — Réel</p><p className="text-[13px]">Aujourd'hui : <b>{totalJour.toLocaleString()} CDF</b> • Ce mois : <b>{totalMois.toLocaleString()} CDF</b> • Total : <b>{totalEncaisse.toLocaleString()} CDF</b></p><p className="text-[11px] opacity-70">Seules les boutiques qui ont payé apparaissent ici.</p></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🧾 Paiements</p>{paiementsPayes.map(p => <p key={p.id} className="text-[12px] mt-1">• {p.qui} — {Number(p.montant || 0).toLocaleString()} CDF — {p.type} — {(p.created_at || "").slice(0, 10)}</p>)}{paiementsPayes.length === 0 && <p className="text-[12px] text-gray-500">Aucun paiement validé.</p>}</div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🎖️ Commissions Ambassadeurs — 1er abonnement seulement</p>{(commissions as any[]).map((c: any) => <p key={c.code} className="text-[12px] mt-1">• {c.nom} ({c.code}) — <b>{c.total.toLocaleString()} CDF</b> • {c.premiers} premiers • {c.renouvellements} renouvellements (0 CDF)</p>)}</div>
          </div>
        )}
                      {onglet === "INVITATIONS" && (
          <div className="space-y-2">
            <div className="bg-[#FF6B00] text-white rounded-2xl p-4"><p className="font-black">🏆 Concours Invitations — Réservé au public</p><p className="text-[12px]">Boutique validée = 5 pts • Client actif = 3 pts • +20 pts par abonnement payé de l'invité. Seules les invitations créées et actives comptent.</p></div>
            {(classementInvitations as any[]).map((r: any, i: number) => <div key={r.nom} className="bg-white border rounded-2xl p-4"><p className="font-black">{i + 1}. {r.nom} — <span className="text-[#FF6B00]">{r.points} pts</span></p><p className="text-[12px]">{r.boutiques} boutiques • {r.clients} clients • {r.abosPayes} abos payés • {r.tel}</p></div>)}{(classementInvitations as any[]).length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune invitation pour l'instant.</p>}
          </div>
        )}
        {onglet === "ANNONCES" && (
          <div className="space-y-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4"><p className="font-black">📢 Modération — Seul APPROUVÉ est visible public</p><p className="text-[12px]">Tu peux approuver, rejeter ou supprimer une annonce immorale ou fausse. Pas de Tombola — les tarifs sont déjà affichés.</p></div>
            {annonces.map(a => <div key={a.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{a.titre} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{a.statut}</span></p><p className="text-[12px] text-gray-600">{a.description}</p><p className="text-[11px] text-gray-500">Par : {a.auteur} • {a.telephone}</p><div className="flex gap-1.5 mt-2"><button onClick={() => majStatut("annonces", a.id, "statut", "APPROUVE")} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">✅ Approuver</button><button onClick={() => majStatut("annonces", a.id, "statut", "REJETE")} className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[11px] font-black">⛔ Rejeter</button><button onClick={() => supprimer("annonces", a.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">🗑️ Supprimer</button></div></div>)}{annonces.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucune annonce.</p>}
          </div>
        )}
        {onglet === "EQUIPE" && (
          <div className="space-y-2">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🛡️ Équipe — Créée par le DG uniquement</p><p className="text-[12px] text-gray-500">Les Superviseurs voient leur zone, les Ambassadeurs voient leurs boutiques. Personne ne voit le DG.</p></div>
            {membres.map(m => <div key={m.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{m.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{m.role} • {m.statut}</span></p><p className="text-[11px] text-gray-500">{m.telephone} • {m.code_pro} • 📍 {m.province} — {m.commune} — {m.quartier}</p><p className="text-[12px]">🏪 {boutiques.filter(b => b.code_amb === m.code_pro).length} boutiques amenées • 👥 {clients.filter(c => c.code_parrain === m.code_pro).length} clients</p><div className="flex gap-1.5 mt-2"><button onClick={() => majStatut("membres", m.id, "statut", "ACTIF")} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">✅ Activer</button><button onClick={() => majStatut("membres", m.id, "statut", "SUSPENDU")} className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[11px] font-black">⏸️ Suspendre</button><button onClick={() => supprimer("membres", m.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-full text-[11px] font-black">🗑️ Supprimer</button></div></div>)}{membres.length === 0 && <p className="text-[12px] text-gray-500 bg-white border rounded-2xl p-4">Aucun membre d'équipe.</p>}
          </div>
        )}
        {onglet === "STUDIO" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🎨 Studio Public — Temps réel</p><p className="text-[12px] text-gray-500">Ce que tu changes ici apparaît sur le site public wenze-pwa.vercel.app, en temps réel.</p><label className="font-bold text-[12px] block mt-3">Slogan public</label><input value={config.slogan || ""} onChange={e => setConfig({ ...config, slogan: e.target.value })} placeholder="Ex : Tout vendre, tout acheter, près de chez toi" className="w-full border rounded-xl px-3 py-3 mt-1" /><label className="font-bold text-[12px] block mt-3">Couleur principale</label><input value={config.couleur || "#FF6B00"} onChange={e => setConfig({ ...config, couleur: e.target.value })} type="color" className="w-full h-12 border rounded-xl mt-1" /><button onClick={sauverConfig} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-3">✅ Publier sur le site public</button></div>
          </div>
        )}
        <button onClick={deconnexion} className="w-full bg-red-600 text-white py-3 rounded-full font-black text-[12px] mt-4">↩ Déconnexion DG</button>
      </div>
    </div>
  );
}
