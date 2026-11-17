"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function SuperviseurPerso() {
  const router = useRouter();
  const [moi, setMoi] = useState<any>(null);
  const [ambassadeurs, setAmbassadeurs] = useState<any[]>([]);
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [onglet, setOnglet] = useState("ACCUEIL");
  const [toast, setToast] = useState("");
  const [formAmb, setFormAmb] = useState({ nom: "", whatsapp: "" });
  const [formBout, setFormBout] = useState({ nom: "", vendeur: "", whatsapp: "", quartier: "" });
  const [rapport, setRapport] = useState({ sujet: "", detail: "", urgence: "NORMALE" });

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const initiales = (nom: string) => nom.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const salutation = () => { const h = new Date().getHours(); return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir"; };
  const heure = new Date().toLocaleDateString("fr-CD", { weekday: "long", day: "numeric", month: "long" });

  useEffect(() => {
    const s: any = JSON.parse(localStorage.getItem("wenze_session") || "null");
    if (!s || s.role !== "SUPERVISEUR") { router.push("/"); return; }
    setMoi(s);
    const charger = async () => {
      const { data: amb } = await supabase.from("membres").select("*").eq("chef_code", s.codePro).eq("role", "AMBASSADEUR");
      if (amb) setAmbassadeurs(amb);
      const { data: bout } = await supabase.from("boutiques").select("*").order("created_at", { ascending: false });
      if (bout) setBoutiques(bout);
    };
    charger();
    const ch = supabase.channel("sup-perso-" + s.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "membres" }, () => charger())
      .on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, () => charger())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [router]);

  const mesAmbActifs = useMemo(() => ambassadeurs.filter(a => a.statut === "ACTIF").length, [ambassadeurs]);
  const mesBoutValidees = useMemo(() => boutiques.filter(b => b.statut === "VALIDEE").length, [boutiques]);
  const mesBoutAttente = useMemo(() => boutiques.filter(b => b.statut === "EN_ATTENTE").length, [boutiques]);
  const totalGainsEquipe = useMemo(() => ambassadeurs.reduce((sum, a) => sum + (a.gains || 0), 0), [ambassadeurs]);

  const creerAmb = async () => {
    if (!formAmb.nom || formAmb.whatsapp.length < 9) return showToast("Nom + WhatsApp obligatoires");
    const code = `AMB-${formAmb.nom.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error } = await supabase.from("membres").insert({ id: "A-" + Date.now(), nom: formAmb.nom, telephone: formAmb.whatsapp, role: "AMBASSADEUR", zone: moi.commune, statut: "EN_ATTENTE", filleuls: 0, boutiques_validees: 0, gains: 0, date_inscription: new Date().toISOString().slice(0, 10), code_pro: code, chef_code: moi.codePro, province: moi.province, commune: moi.commune, village: moi.village });
    if (error) showToast("❌ " + error.message); else { showToast(`✅ ${formAmb.nom} créé. Code : ${code}`); setFormAmb({ nom: "", whatsapp: "" }); }
  };
  const creerBout = async () => {
    if (!formBout.nom || !formBout.whatsapp) return showToast("Nom + WhatsApp boutique");
    const { error } = await supabase.from("boutiques").insert({ id: "B-" + Date.now(), nom: formBout.nom, proprietaire: formBout.vendeur, telephone: formBout.whatsapp, province: moi.province, commune: formBout.quartier || moi.commune, village: formBout.quartier || moi.commune, statut: "EN_ATTENTE", abonnement: "EN_ATTENTE", code_amb: moi.codePro });
    if (error) showToast("❌ " + error.message); else { showToast(`✅ Boutique ${formBout.nom} créée`); setFormBout({ nom: "", vendeur: "", whatsapp: "", quartier: "" }); }
  };
  const envoyerRapport = async () => {
    if (!rapport.sujet || !rapport.detail) return showToast("Sujet + détail");
    await supabase.from("problemes").insert({ id: "P-" + Date.now(), type: rapport.sujet, qui: `${moi.nom} (${moi.codePro})`, code: moi.codePro, detail: rapport.detail, urgence: rapport.urgence, statut: "OUVERT" });
    if (rapport.urgence === "URGENTE") { try { await fetch("/api/alerte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titre: `RAPPORT SUP ${moi.codePro}`, detail: rapport.detail, urgence: "URGENTE", qui: moi.nom }) }); } catch {} }
    const msg = `📋 RAPPORT ${moi.codePro} - ${moi.nom}%0ASujet: ${rapport.sujet}%0ADétail: ${rapport.detail}`;
    window.open(`https://wa.me/243825888889?text=${msg}`, "_blank");
    showToast("📤 Rapport envoyé au DG"); setRapport({ sujet: "", detail: "", urgence: "NORMALE" });
  };

  if (!moi) return <div className="p-6">Chargement de ton bureau...</div>;
  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] pb-20">
      {toast && <div className="fixed top-4 left-4 right-4 z-50 bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div>}
      {/* HEADER PERSONNALISÉ */}
      <div className="bg-[#1A3A2F] text-white px-5 pt-8 pb-5 rounded-b-[28px]">
        <div className="flex justify-between"><p className="text-[11px] opacity-70">WENZE • MON BUREAU SUPERVISEUR</p><button onClick={() => { localStorage.removeItem("wenze_session"); router.push("/"); }} className="bg-white/15 px-3 py-1 rounded-full text-[11px] font-bold">↩ Quitter</button></div>
        <p className="text-[11px] opacity-70 mt-3 capitalize">{heure}</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="w-[62px] h-[62px] bg-[#FFD166] text-black rounded-full flex items-center justify-center font-black text-[20px] shrink-0">{initiales(moi.nom)}</div>
          <div>
            <h1 className="font-black text-[20px] leading-tight">{salutation()}, {moi.nom.split(" ")[0]} 👋</h1>
            <p className="text-[12px] opacity-80">🛡️ Superviseur • {moi.commune} • {moi.province}</p>
            <p className="text-[11px] mt-1"><span className="bg-[#FFD166] text-black px-2 py-0.5 rounded-full font-black">{moi.codePro}</span> <span className="bg-white/15 px-2 py-0.5 rounded-full">📞 {moi.telephone}</span></p>
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 mt-4 text-[12px]">🔗 <b>Ta chaîne :</b> DG → <b>Toi ({moi.codePro})</b> → {ambassadeurs.length} Ambassadeurs<br />🎯 <b>Ton objectif :</b> {mesAmbActifs} actifs / {ambassadeurs.length} — {mesBoutValidees} boutiques validées</div>
      </div>
      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
        {["ACCUEIL", "AMBASSADEURS", "BOUTIQUES", "CREER", "RAPPORT"].map(t => (<button key={t} onClick={() => setOnglet(t)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>{t === "ACCUEIL" ? "🏠 Mon Accueil" : t === "AMBASSADEURS" ? "🎖️ Mes Amb." : t === "BOUTIQUES" ? "🏪 Mes Boutiques" : t === "CREER" ? "➕ Créer" : "📋 Rapport DG"}</button>))}
      </div>
      <div className="px-4 mt-4">
        {onglet === "ACCUEIL" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[22px]">{ambassadeurs.length}</p><p className="text-[11px] text-gray-500">Mes ambassadeurs<br /><b className="text-green-600">{mesAmbActifs} actifs</b></p></div>
              <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[22px]">{boutiques.length}</p><p className="text-[11px] text-gray-500">Mes boutiques<br /><b className="text-green-600">{mesBoutValidees} validées</b> • <b className="text-orange-500">{mesBoutAttente} en attente</b></p></div>
              <div className="bg-white border rounded-2xl p-4 col-span-2"><p className="font-black text-[22px]">{totalGainsEquipe.toLocaleString()} CDF</p><p className="text-[11px] text-gray-500">Gains générés par TON équipe</p></div>
            </div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">⭐ Top de ton équipe</p>{ambassadeurs.sort((a, b) => (b.gains || 0) - (a.gains || 0)).slice(0, 3).map((a, i) => (<p key={a.id} className="text-[12px] mt-2">{i + 1}️⃣ <b>{a.nom}</b> — {(a.gains || 0).toLocaleString()} CDF • {a.filleuls || 0} filleuls</p>))}{ambassadeurs.length === 0 && <p className="text-[12px] text-gray-500">Aucun ambassadeur. Crée le premier.</p>}</div>
            <button onClick={() => setOnglet("CREER")} className="w-full bg-[#1A3A2F] text-white py-4 rounded-full font-black text-[13px]">➕ Créer un ambassadeur avec ton code</button>
          </div>
        )}
        {onglet === "AMBASSADEURS" && (<div className="space-y-2">{ambassadeurs.map(a => (<div key={a.id} className="bg-white border rounded-2xl p-4"><div className="flex items-center gap-3"><div className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center font-black">{initiales(a.nom)}</div><div className="flex-1"><p className="font-black text-[14px]">{a.nom}</p><p className="text-[11px] text-gray-500">{a.code_pro} • {a.statut} • {a.commune}</p><p className="text-[11px]">{a.filleuls || 0} filleuls • {(a.gains || 0).toLocaleString()} CDF</p></div><a href={`https://wa.me/${a.telephone}`} target="_blank" className="bg-green-100 px-3 py-2 rounded-full text-[12px]">💬</a></div></div>))}{ambassadeurs.length === 0 && <p className="text-[12px] text-gray-500">Aucun ambassadeur sous toi.</p>}</div>)}
        {onglet === "BOUTIQUES" && (<div className="space-y-2">{boutiques.map(b => (<div key={b.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{b.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{b.statut}</span></p><p className="text-[11px] text-gray-500">{b.proprietaire} • {b.commune} • {b.telephone}</p><p className="text-[10px] text-gray-400">Créée par : {b.code_amb}</p></div>))}</div>)}
        {onglet === "CREER" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">➕ Créer un Ambassadeur — avec TON code {moi.codePro}</p><input value={formAmb.nom} onChange={e => setFormAmb({ ...formAmb, nom: e.target.value })} placeholder="Nom complet" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formAmb.whatsapp} onChange={e => setFormAmb({ ...formAmb, whatsapp: e.target.value })} placeholder="WhatsApp" className="w-full border rounded-xl px-3 py-3 mt-2" /><button onClick={creerAmb} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Créer</button></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏪 Créer une Boutique — avec TON code {moi.codePro}</p><input value={formBout.nom} onChange={e => setFormBout({ ...formBout, nom: e.target.value })} placeholder="Nom boutique" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formBout.vendeur} onChange={e => setFormBout({ ...formBout, vendeur: e.target.value })} placeholder="Nom vendeur" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formBout.whatsapp} onChange={e => setFormBout({ ...formBout, whatsapp: e.target.value })} placeholder="WhatsApp boutique" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formBout.quartier} onChange={e => setFormBout({ ...formBout, quartier: e.target.value })} placeholder="Quartier" className="w-full border rounded-xl px-3 py-3 mt-2" /><button onClick={creerBout} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Créer boutique</button></div>
          </div>
        )}
        {onglet === "RAPPORT" && (<div className="bg-white border rounded-2xl p-4 space-y-2"><p className="font-black">📋 Rapport au DG — de {moi.nom}</p><input value={rapport.sujet} onChange={e => setRapport({ ...rapport, sujet: e.target.value })} placeholder="Sujet" className="w-full border rounded-xl px-3 py-3" /><div className="flex gap-2">{["NORMALE", "URGENTE"].map(u => (<button key={u} onClick={() => setRapport({ ...rapport, urgence: u })} className={`flex-1 py-2 rounded-full font-bold text-[11px] ${rapport.urgence === u ? "bg-black text-white" : "bg-gray-100"}`}>{u}</button>))}</div><textarea value={rapport.detail} onChange={e => setRapport({ ...rapport, detail: e.target.value })} rows={4} placeholder="Décris le problème..." className="w-full border rounded-xl px-3 py-3" /><button onClick={envoyerRapport} className="w-full bg-[#FF6B00] text-white py-3 rounded-full font-black text-[12px]">📤 Envoyer au DG</button></div>)}
      </div>
    </div>
  );
    }
