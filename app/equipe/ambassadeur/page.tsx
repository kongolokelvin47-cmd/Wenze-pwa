"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AmbassadeurPerso() {
  const router = useRouter();
  const [moi, setMoi] = useState<any>(null);
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [onglet, setOnglet] = useState("ACCUEIL");
  const [toast, setToast] = useState("");
  const [formBout, setFormBout] = useState({ nom: "", vendeur: "", whatsapp: "", quartier: "" });
  const [formClient, setFormClient] = useState({ nom: "", whatsapp: "" });
  const [clients, setClients] = useState<any[]>([]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const initiales = (nom: string) => nom.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const salutation = () => { const h = new Date().getHours(); return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir"; };

  useEffect(() => {
    const s: any = JSON.parse(localStorage.getItem("wenze_session") || "null");
    if (!s || s.role !== "AMBASSADEUR") { router.push("/"); return; }
    setMoi(s);
    const charger = async () => {
      const { data: bout } = await supabase.from("boutiques").select("*").eq("code_amb", s.codePro);
      if (bout) setBoutiques(bout);
      const { data: cli } = await supabase.from("clients").select("*").eq("code_parrain", s.codePro);
      if (cli) setClients(cli);
    };
    charger();
    const ch = supabase.channel("amb-perso-" + s.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, () => charger())
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => charger())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "membres", filter: `id=eq.${s.id}` }, (pl: any) => {
        if (pl.new.statut === "SUSPENDU") { alert("⛔ Suspendu par le DG."); localStorage.removeItem("wenze_session"); router.push("/"); }
        setMoi((m: any) => ({ ...m, gains: pl.new.gains }));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [router]);

  const boutValidees = useMemo(() => boutiques.filter(b => b.statut === "VALIDEE").length, [boutiques]);
  const boutAttente = useMemo(() => boutiques.filter(b => b.statut === "EN_ATTENTE").length, [boutiques]);

  const creerBout = async () => {
    if (!formBout.nom || !formBout.whatsapp) return showToast("Nom + WhatsApp boutique");
    const { error } = await supabase.from("boutiques").insert({ id: "B-" + Date.now(), nom: formBout.nom, proprietaire: formBout.vendeur || moi.nom, telephone: formBout.whatsapp, province: moi.province, commune: formBout.quartier || moi.commune, village: formBout.quartier || moi.commune, statut: "EN_ATTENTE", abonnement: "EN_ATTENTE", code_amb: moi.codePro });
    if (error) showToast("❌ " + error.message); else { showToast(`✅ Boutique ${formBout.nom} envoyée au DG`); setFormBout({ nom: "", vendeur: "", whatsapp: "", quartier: "" }); }
  };
  const creerClient = async () => {
    if (!formClient.nom || formClient.whatsapp.length < 9) return showToast("Nom + WhatsApp client");
    const { error } = await supabase.from("clients").insert({ id: "C-" + Date.now(), nom: formClient.nom, telephone: formClient.whatsapp, code_parrain: moi.codePro, province: moi.province, commune: moi.commune, statut: "ACTIF" });
    if (error) showToast("⚠️ Client créé en local"); else { showToast(`✅ Client ${formClient.nom} créé avec ton code`); setFormClient({ nom: "", whatsapp: "" }); }
  };

  if (!moi) return <div className="p-6">Chargement de ton bureau...</div>;
  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] pb-20">
      {toast && <div className="fixed top-4 left-4 right-4 z-50 bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div>}
      {/* HEADER PERSONNALISÉ */}
      <div className="bg-black text-white px-5 pt-8 pb-5 rounded-b-[28px]">
        <div className="flex justify-between"><p className="text-[11px] opacity-70">WENZE • MON BUREAU AMBASSADEUR</p><button onClick={() => { localStorage.removeItem("wenze_session"); router.push("/"); }} className="bg-white/15 px-3 py-1 rounded-full text-[11px] font-bold">↩ Quitter</button></div>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-[62px] h-[62px] bg-[#FF6B00] rounded-full flex items-center justify-center font-black text-[20px] shrink-0">{initiales(moi.nom)}</div>
          <div>
            <h1 className="font-black text-[20px] leading-tight">{salutation()}, {moi.nom.split(" ")[0]} 👋</h1>
            <p className="text-[12px] opacity-80">🎖️ Ambassadeur • {moi.commune} • {moi.province}</p>
            <p className="text-[11px] mt-1"><span className="bg-[#FF6B00] px-2 py-0.5 rounded-full font-black">{moi.codePro}</span> <span className="bg-white/15 px-2 py-0.5 rounded-full">👤 Chef : {moi.chefCode}</span></p>
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 mt-4 text-[12px]">💰 <b>TES gains :</b> {(moi.gains || 0).toLocaleString()} CDF<br />🔗 <b>Ton code :</b> {moi.codePro} — Donne-le à tes clients, ils seront liés à toi.</div>
      </div>
      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
        {["ACCUEIL", "BOUTIQUES", "CLIENTS", "CREER"].map(t => (<button key={t} onClick={() => setOnglet(t)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>{t === "ACCUEIL" ? "🏠 Mon Accueil" : t === "BOUTIQUES" ? "🏪 Mes Boutiques" : t === "CLIENTS" ? "👥 Mes Clients" : "➕ Créer"}</button>))}
      </div>
      <div className="px-4 mt-4">
        {onglet === "ACCUEIL" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[22px]">{boutiques.length}</p><p className="text-[11px] text-gray-500">Mes boutiques<br /><b className="text-green-600">{boutValidees} validées</b> • <b className="text-orange-500">{boutAttente} en attente</b></p></div>
              <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[22px]">{clients.length}</p><p className="text-[11px] text-gray-500">Mes clients<br />liés à ton code</p></div>
              <div className="bg-[#FF6B00] text-white rounded-2xl p-4 col-span-2"><p className="font-black text-[22px]">{(moi.gains || 0).toLocaleString()} CDF</p><p className="text-[11px] opacity-90">Tes gains personnels — seul toi et le DG les voient</p></div>
            </div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">📋 Tes dernières boutiques</p>{boutiques.slice(0, 3).map(b => (<p key={b.id} className="text-[12px] mt-2">🏪 <b>{b.nom}</b> — {b.statut} • {b.commune}</p>))}{boutiques.length === 0 && <p className="text-[12px] text-gray-500">Aucune boutique. Crée la première.</p>}</div>
            <button onClick={() => { navigator.clipboard.writeText(moi.codePro); showToast(`Code ${moi.codePro} copié. Envoie-le à tes clients.`); }} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px]">📋 Copier MON code : {moi.codePro}</button>
            <button onClick={() => setOnglet("CREER")} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-[13px]">➕ Créer une boutique / un client</button>
          </div>
        )}
        {onglet === "BOUTIQUES" && (<div className="space-y-2">{boutiques.map(b => (<div key={b.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{b.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{b.statut}</span></p><p className="text-[11px] text-gray-500">{b.proprietaire} • {b.commune} • {b.telephone}</p></div>))}{boutiques.length === 0 && <p className="text-[12px] text-gray-500">Aucune boutique.</p>}</div>)}
        {onglet === "CLIENTS" && (<div className="space-y-2">{clients.map((c: any) => (<div key={c.id} className="bg-white border rounded-2xl p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black">{initiales(c.nom)}</div><div><p className="font-black text-[14px]">{c.nom}</p><p className="text-[11px] text-gray-500">{c.telephone} • Lié à toi via {c.code_parrain}</p></div></div></div>))}{clients.length === 0 && <p className="text-[12px] text-gray-500">Aucun client lié à ton code pour l'instant.</p>}</div>)}
        {onglet === "CREER" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏪 Créer une Boutique — avec TON code {moi.codePro}</p><input value={formBout.nom} onChange={e => setFormBout({ ...formBout, nom: e.target.value })} placeholder="Nom boutique" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formBout.vendeur} onChange={e => setFormBout({ ...formBout, vendeur: e.target.value })} placeholder="Nom vendeur" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formBout.whatsapp} onChange={e => setFormBout({ ...formBout, whatsapp: e.target.value })} placeholder="WhatsApp boutique" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formBout.quartier} onChange={e => setFormBout({ ...formBout, quartier: e.target.value })} placeholder="Quartier" className="w-full border rounded-xl px-3 py-3 mt-2" /><button onClick={creerBout} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Envoyer au DG</button></div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">👥 Créer un Client — lié à TOI</p><input value={formClient.nom} onChange={e => setFormClient({ ...formClient, nom: e.target.value })} placeholder="Nom client" className="w-full border rounded-xl px-3 py-3 mt-2" /><input value={formClient.whatsapp} onChange={e => setFormClient({ ...formClient, whatsapp: e.target.value })} placeholder="WhatsApp client" className="w-full border rounded-xl px-3 py-3 mt-2" /><button onClick={creerClient} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Créer client</button></div>
          </div>
        )}
      </div>
    </div>
  );
      }
