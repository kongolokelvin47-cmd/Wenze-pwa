"use client";
// === AMBASSADEUR PRO — Porte Équipe uniquement ===
// wenze-pwa.vercel.app/equipe/ambassadeur — WhatsApp + Code Pro AMB-... — Aucun lien DG
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase: any = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : null;

const wa = (tel: string) => (tel || "").replace(/[^0-9]/g, "").replace(/^0+/, "");
const ouvrirWhatsApp = (tel: string, message: string) => { const n = wa(tel); if (n) window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, "_blank"); };

export default function PageAmbassadeur() {
  const router = useRouter();
  const [moi, setMoi] = useState<any>(null);
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [onglet, setOnglet] = useState("DASH");
  const [historique, setHistorique] = useState<string[]>(["DASH"]);
  const [pctCommission, setPctCommission] = useState(10);
  const [formBout, setFormBout] = useState({ nom: "", proprietaire: "", telephone: "", commune: "", quartier: "" });
  const [formCli, setFormCli] = useState({ nom: "", telephone: "", commune: "", quartier: "" });
  const [boutiqueOuverte, setBoutiqueOuverte] = useState<any>(null);
  const [imagePleinEcran, setImagePleinEcran] = useState<string | null>(null);
  const [tempsRestant, setTempsRestant] = useState("");
  const [toast, setToast] = useState("");
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const aller = (tab: string) => { setHistorique(h => [...h, tab]); setOnglet(tab); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const retour = () => {
    if (boutiqueOuverte) return setBoutiqueOuverte(null);
    if (imagePleinEcran) return setImagePleinEcran(null);
    setHistorique(h => { if (h.length <= 1) return h; const next = [...h]; next.pop(); setOnglet(next[next.length - 1]); return next; });
  };

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("wenze_session") || "null");
      if (!s || s.role !== "AMBASSADEUR" || Date.now() - (s.debut || 0) > 12 * 3600 * 1000) {
        document.cookie = "wenze-role=; path=/; max-age=0"; localStorage.removeItem("wenze_session"); router.push("/equipe"); return;
      }
      setMoi(s);
      const rest = 12 * 3600 * 1000 - (Date.now() - s.debut);
      setTempsRestant(`${Math.floor(rest / 3600000)}h ${Math.floor((rest % 3600000) / 60000)}min restant`);
    } catch { router.push("/equipe"); }
  }, [router]);

  const charger = async () => {
    if (!supabase || !moi) return;
    const [b, c, p] = await Promise.all([
      supabase.from("boutiques").select("*").eq("code_amb", moi.code_pro).order("created_at", { ascending: false }),
      supabase.from("clients").select("*").eq("code_parrain", moi.code_pro).order("created_at", { ascending: false }),
      supabase.from("paiements").select("*").order("created_at", { ascending: false }),
    ]);
    if (b.data) setBoutiques(b.data);
    if (c.data) setClients(c.data);
    if (p.data) setPaiements(p.data);
  };

  // ✅ TEMPS RÉEL — dès que le DG valide ta boutique, tu le vois sans recharger
  useEffect(() => {
    if (!moi || !supabase) return;
    charger();
    const canal = supabase.channel("amb-temps-reel")
      .on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, () => { charger(); show("🔔 Boutique mise à jour par le DG"); })
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => charger())
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, () => { charger(); show("💰 Nouveau paiement"); })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [moi]);

  const deconnexion = () => { document.cookie = "wenze-role=; path=/; max-age=0"; try { localStorage.removeItem("wenze_session"); } catch {} router.push("/equipe"); };
    // ✅ AMBASSADEUR : seulement SES boutiques / SES clients
  const mesBoutiques = boutiques;
  const mesClients = clients;
  const mesPaiements = useMemo(() => paiements.filter(p => mesBoutiques.some(b => b.id === p.boutique_id || b.nom === p.qui)), [paiements, mesBoutiques]);
  const premiersPayes = mesPaiements.filter(p => p.statut === "PAYÉ" && (p.type === "PREMIER" || p.type === "OCCASIONNELLE"));
  const renouvellements = mesPaiements.filter(p => p.statut === "PAYÉ" && p.type === "RENOUVELLEMENT");
  const baseCommission = premiersPayes.reduce((s, p) => s + Number(p.montant || 0), 0);
  const maCommission = Math.round(baseCommission * pctCommission / 100);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const ceMois = new Date().toISOString().slice(0, 7);

  const ajouterBoutique = async () => {
    if (!formBout.nom.trim() || formBout.telephone.length < 9) return show("❌ Nom + WhatsApp obligatoires");
    const { error } = await supabase.from("boutiques").insert({ id: "B-" + Date.now(), nom: formBout.nom, proprietaire: formBout.proprietaire || formBout.nom, telephone: formBout.telephone, commune: formBout.commune || moi.commune, quartier: formBout.quartier, statut: "EN_ATTENTE", abonnement: "SANS_ABO", type_abonnement: "PREMIER", code_amb: moi.code_pro });
    if (error) return show("❌ " + error.message);
    show("✅ Boutique envoyée — le DG va valider"); setFormBout({ nom: "", proprietaire: "", telephone: "", commune: "", quartier: "" }); charger();
  };
  const ajouterClient = async () => {
    if (!formCli.nom.trim() || formCli.telephone.length < 9) return show("❌ Nom + WhatsApp obligatoires");
    const { error } = await supabase.from("clients").insert({ id: "C-" + Date.now(), nom: formCli.nom, telephone: formCli.telephone, commune: formCli.commune || moi.commune, quartier: formCli.quartier, statut: "ACTIF", code_parrain: moi.code_pro });
    if (error) return show("❌ " + error.message);
    show("✅ Client ajouté"); setFormCli({ nom: "", telephone: "", commune: "", quartier: "" }); charger();
  };

  if (!moi) return <div className="p-6 text-center">Chargement...</div>;

  // ✅ FICHE BOUTIQUE — image plein écran, WhatsApp, Appeler
  if (boutiqueOuverte) {
    const b = boutiqueOuverte;
    const pays = paiements.filter(p => p.boutique_id === b.id || p.qui === b.nom);
    return (
      <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3 z-10">
          <button onClick={retour} className="w-10 h-10 bg-black text-white rounded-full font-black active:scale-90">←</button>
          <div><p className="font-black text-[15px] leading-none">{b.nom}</p><p className="text-[11px] text-gray-500">Ma boutique • {b.statut}</p></div>
        </div>
        <div className="px-4 mt-4 space-y-3">
          {(b.image_url || b.photo_url) ? <button onClick={() => setImagePleinEcran(b.image_url || b.photo_url)} className="block w-full"><img src={b.image_url || b.photo_url} className="w-full h-[240px] object-cover rounded-3xl" /><p className="text-[11px] text-gray-500 mt-1 text-center">👆 Clique pour agrandir</p></button> : <div className="w-full h-[160px] bg-gray-200 rounded-3xl flex items-center justify-center text-[40px]">🏪</div>}
          <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[18px]">{b.nom}</p><p className="text-[13px] text-gray-600 mt-1">👤 {b.proprietaire} • 📍 {b.commune} — {b.quartier}</p><p className="text-[13px] text-gray-600">📱 {b.telephone} • Abonnement : <b>{b.abonnement}</b> • Statut : <b>{b.statut}</b></p></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => ouvrirWhatsApp(b.telephone, `Bonjour ${b.proprietaire}, c'est ${moi.nom}, ton Ambassadeur WENZE pour ${b.nom}.`)} className="bg-[#25D366] text-white py-3.5 rounded-2xl font-black text-[12px] active:scale-95">💬 WhatsApp Boutique</button>
            <button onClick={() => { if (b.telephone) window.location.href = `tel:${b.telephone}`; }} className="bg-black text-white py-3.5 rounded-2xl font-black text-[12px] active:scale-95">📞 Appeler Boutique</button>
          </div>
          <div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Paiements de cette boutique</p>{pays.length === 0 ? <p className="text-[12px] text-gray-500 mt-1">Aucun paiement.</p> : pays.map(p => <p key={p.id} className="text-[12px] mt-1">• {Number(p.montant || 0).toLocaleString()} CDF — {p.type} — {p.statut}</p>)}</div>
          <button onClick={retour} className="w-full bg-white border py-3 rounded-full font-black text-[12px]">← Retour à mes boutiques</button>
        </div>
        {imagePleinEcran && <div onClick={() => setImagePleinEcran(null)} className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"><img src={imagePleinEcran} className="max-w-full max-h-[80vh] object-contain rounded-2xl" /><button onClick={() => setImagePleinEcran(null)} className="bg-white text-black px-6 py-3 rounded-full font-black mt-3">✕ Fermer</button></div>}
      </div>
    );
                                            }
    return (
    <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
      {toast && <div className="fixed top-4 left-4 right-4 z-50 bg-black text-white p-3 rounded-2xl text-[12px] font-bold text-center">{toast}</div>}
      {imagePleinEcran && <div onClick={() => setImagePleinEcran(null)} className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"><img src={imagePleinEcran} className="max-w-full max-h-[80vh] object-contain rounded-2xl" /><button onClick={() => setImagePleinEcran(null)} className="bg-white text-black px-6 py-3 rounded-full font-black mt-3">✕ Fermer</button></div>}
      <div className="bg-black text-white px-5 pt-8 pb-6 rounded-b-[32px]">
        <div className="flex items-center gap-3"><button onClick={retour} className="w-10 h-10 bg-white/15 rounded-full font-black active:scale-90">←</button><div><p className="text-[11px] opacity-60">WENZE • AMBASSADEUR • {moi.commune?.toUpperCase()}</p><h1 className="font-black text-[22px] leading-none">🎖️ Bonjour {moi.nom}</h1></div></div>
        <p className="text-[11px] opacity-70 mt-2">Code : {moi.code_pro} • ⏱️ {tempsRestant} • 🟢 Temps réel • Tu vois seulement tes boutiques</p>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <button onClick={() => aller("BOUTIQUES")} className="bg-white/10 rounded-2xl p-2 active:scale-95"><p className="font-black">{mesBoutiques.length}</p><p className="text-[9px]">MES BOUTIQUES</p></button>
          <button onClick={() => aller("CLIENTS")} className="bg-white/10 rounded-2xl p-2 active:scale-95"><p className="font-black">{mesClients.length}</p><p className="text-[9px]">MES CLIENTS</p></button>
          <button onClick={() => aller("COMMISSION")} className="bg-[#FF6B00] rounded-2xl p-2 active:scale-95"><p className="font-black">{maCommission.toLocaleString()}</p><p className="text-[9px]">MA COMMISSION CDF</p></button>
        </div>
      </div>
      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
        {["DASH", "BOUTIQUES", "CLIENTS", "COMMISSION"].map(t => <button key={t} onClick={() => aller(t)} className={`px-3 py-2 rounded-full text-[11px] font-black whitespace-nowrap ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>{t === "DASH" ? "📊 Dashboard" : t === "BOUTIQUES" ? "🏪 Mes Boutiques" : t === "CLIENTS" ? "👥 Mes Clients" : "💰 Ma Commission"}</button>)}
      </div>
      <div className="px-4 mt-4">
        {onglet === "DASH" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📋 Aujourd'hui — {aujourdHui}</p><p className="text-[13px]">🏪 {mesBoutiques.filter(b => (b.created_at || "").slice(0, 10) === aujourdHui).length} boutiques • 👥 {mesClients.filter(c => (c.created_at || "").slice(0, 10) === aujourdHui).length} clients</p><p className="text-[13px]">📅 Ce mois : {mesBoutiques.filter(b => (b.created_at || "").slice(0, 7) === ceMois).length} bout. • {mesClients.filter(c => (c.created_at || "").slice(0, 7) === ceMois).length} cli.</p></div>
            <div className="bg-[#FF6B00] text-white rounded-2xl p-4"><p className="font-black">💰 Ma commission — Règle DG</p><p className="text-[13px]">Uniquement sur 1er abonnement + vente occasionnelle. Renouvellement = 0 CDF.</p><p className="font-black mt-1">{maCommission.toLocaleString()} CDF sur {premiersPayes.length} premiers abonnements • {renouvellements.length} renouvellements (0 CDF)</p><button onClick={() => aller("COMMISSION")} className="bg-white text-black px-4 py-2 rounded-full text-[11px] font-black mt-2">Voir détail →</button></div>
          </div>
        )}
                {onglet === "BOUTIQUES" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">➕ Ajouter une boutique</p><input value={formBout.nom} onChange={e => setFormBout({ ...formBout, nom: e.target.value })} placeholder="Nom boutique" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formBout.telephone} onChange={e => setFormBout({ ...formBout, telephone: e.target.value })} placeholder="+243..." className="w-full border rounded-xl px-3 py-3 mt-2" /><div className="flex gap-2 mt-2"><input value={formBout.commune} onChange={e => setFormBout({ ...formBout, commune: e.target.value })} placeholder="Commune" className="flex-1 border rounded-xl px-3 py-3" /><input value={formBout.quartier} onChange={e => setFormBout({ ...formBout, quartier: e.target.value })} placeholder="Quartier" className="flex-1 border rounded-xl px-3 py-3" /></div><button onClick={ajouterBoutique} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Envoyer au DG</button></div>
            <p className="text-[11px] text-gray-500">👆 Clique sur une boutique pour ouvrir sa fiche</p>
            {mesBoutiques.map(b => <div key={b.id} className="bg-white border rounded-2xl p-3 flex gap-3">
              <button onClick={() => { if (b.image_url || b.photo_url) setImagePleinEcran(b.image_url || b.photo_url); else setBoutiqueOuverte(b); }} className="shrink-0">{(b.image_url || b.photo_url) ? <img src={b.image_url || b.photo_url} className="w-[72px] h-[72px] object-cover rounded-2xl" /> : <div className="w-[72px] h-[72px] bg-gray-100 rounded-2xl flex items-center justify-center text-[28px]">🏪</div>}</button>
              <button onClick={() => setBoutiqueOuverte(b)} className="flex-1 text-left"><p className="font-black text-[14px] leading-tight">{b.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{b.statut} • {b.abonnement}</span></p><p className="text-[11px] text-gray-500">{b.proprietaire} • {b.telephone} • 📍 {b.commune} — {b.quartier}</p><p className="text-[11px] text-gray-500">Voir fiche →</p></button>
              <div className="flex flex-col gap-1"><button onClick={() => ouvrirWhatsApp(b.telephone, `Bonjour ${b.proprietaire}, c'est ${moi.nom}, ton Ambassadeur WENZE.`)} className="w-9 h-9 bg-[#25D366] text-white rounded-full">💬</button><button onClick={() => { if (b.telephone) window.location.href = `tel:${b.telephone}`; }} className="w-9 h-9 bg-black text-white rounded-full">📞</button></div>
            </div>)}
          </div>
        )}
        {onglet === "CLIENTS" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">➕ Ajouter un client</p><input value={formCli.nom} onChange={e => setFormCli({ ...formCli, nom: e.target.value })} placeholder="Nom client" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formCli.telephone} onChange={e => setFormCli({ ...formCli, telephone: e.target.value })} placeholder="+243..." className="w-full border rounded-xl px-3 py-3 mt-2" /><div className="flex gap-2 mt-2"><input value={formCli.commune} onChange={e => setFormCli({ ...formCli, commune: e.target.value })} placeholder="Commune" className="flex-1 border rounded-xl px-3 py-3" /><input value={formCli.quartier} onChange={e => setFormCli({ ...formCli, quartier: e.target.value })} placeholder="Quartier" className="flex-1 border rounded-xl px-3 py-3" /></div><button onClick={ajouterClient} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Ajouter</button></div>
            {mesClients.map(c => <div key={c.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{c.nom}</p><p className="text-[11px] text-gray-500">{c.telephone} • 📍 {c.commune} — {c.quartier} • {c.statut}</p><div className="flex gap-1.5 mt-2"><button onClick={() => ouvrirWhatsApp(c.telephone, `Bonjour ${c.nom}, c'est ${moi.nom}, ton Ambassadeur WENZE.`)} className="bg-[#25D366] text-white px-3 py-1.5 rounded-full text-[11px] font-black">💬 WhatsApp</button><button onClick={() => { if (c.telephone) window.location.href = `tel:${c.telephone}`; }} className="bg-black text-white px-3 py-1.5 rounded-full text-[11px] font-black">📞 Appeler</button></div></div>)}
          </div>
        )}
        {onglet === "COMMISSION" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">💰 Détail commission — {pctCommission}% sur 1er abonnement</p>{mesPaiements.filter(p => p.statut === "PAYÉ").map(p => <p key={p.id} className="text-[12px] mt-1">• {p.qui} — {Number(p.montant).toLocaleString()} CDF — {p.type} {p.type === "RENOUVELLEMENT" ? "→ 0 CDF" : `→ ${Math.round(Number(p.montant) * pctCommission / 100).toLocaleString()} CDF`}</p>)}{mesPaiements.filter(p => p.statut === "PAYÉ").length === 0 && <p className="text-[12px] text-gray-500">Aucun paiement validé pour l'instant.</p>}</div>
          </div>
        )}
        <div className="flex gap-2 mt-4"><button onClick={retour} className="flex-1 bg-white border py-3 rounded-full font-black text-[12px]">← Retour</button><button onClick={deconnexion} className="flex-1 bg-red-600 text-white py-3 rounded-full font-black text-[12px]">↩ Déconnexion</button></div>
      </div>
    </div>
  );
            }
