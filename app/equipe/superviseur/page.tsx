"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { demarrerSession, verifierSession, quitterSession, tempsRestant } from "@/lib/session";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Superviseur() {
  const router = useRouter();
  const [moi, setMoi] = useState<any>(null);
  const [charge, setCharge] = useState(true);
  const [tel, setTel] = useState(""); const [code, setCode] = useState("");
  const [voir, setVoir] = useState(false); const [msg, setMsg] = useState(""); const [loading, setLoading] = useState(false);
  const [ambassadeurs, setAmbassadeurs] = useState<any[]>([]); const [boutiques, setBoutiques] = useState<any[]>([]);
  const [onglet, setOnglet] = useState("ACCUEIL"); const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const initiales = (n: string) => n ? n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "SU";

  useEffect(() => {
    const s: any = verifierSession();
    if (s && s.role === "SUPERVISEUR" && s.data) {
      const moiData = s.data;
      setMoi(moiData);
      const charger = async () => {
        // STRICT : seulement MES ambassadeurs (ceux qui ont mon code comme chef)
        const { data: amb } = await supabase.from("membres").select("id, nom, code_pro, role, province, commune, statut, filleuls, boutiques_validees").eq("chef_code", moiData.codePro).eq("role", "AMBASSADEUR");
        if (amb) setAmbassadeurs(amb);
        // STRICT : seulement MES boutiques (ma commune + ma province)
        const { data: bout } = await supabase.from("boutiques").select("id, nom, proprietaire, telephone, province, commune, village, statut, abonnement, code_amb").eq("commune", moiData.commune).order("created_at", { ascending: false });
        if (bout) setBoutiques(bout);
      };
      charger();
      const ch = supabase.channel("sup-" + moiData.id).on("postgres_changes", { event: "*", schema: "public", table: "membres" }, () => charger()).on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, () => charger()).subscribe();
      const timer = setInterval(() => {
        if (!verifierSession()) { alert('Session expirée (12h). Reconnecte-toi.'); quitterSession(); }
      }, 60000);
      return () => { supabase.removeChannel(ch); clearInterval(timer); };
    }
    setCharge(false);
  }, []);

  const connecter = async () => {
    if (!tel.trim() || !code.trim()) { setMsg("❌ Téléphone + Code"); return; }
    setLoading(true); setMsg("⏳ Vérification...");
    const { data, error } = await supabase.from("membres").select("*").eq("telephone", tel.trim()).eq("code_pro", code.trim().toUpperCase()).eq("role", "SUPERVISEUR").single();
    if (error || !data) { setMsg("❌ Ce code n'est pas un code Superviseur."); setLoading(false); return; }
    if (data.statut !== "ACTIF") { setMsg("⏳ Pas encore validé par le DG."); setLoading(false); return; }
    const membrePropre = { id: data.id, nom: data.nom, role: data.role, codePro: data.code_pro, telephone: data.telephone, province: data.province, commune: data.commune, village: data.village, chefCode: data.chef_code };
    demarrerSession('SUPERVISEUR', membrePropre);
    setMoi(membrePropre); window.location.reload();
  };
    // --- SI PAS CONNECTÉ : PAGE CONNEXION SUPERVISEUR ---
  if (!moi && !charge) return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] pb-10">
      <div className="bg-[#1A3A2F] text-white px-5 pt-10 pb-6 rounded-b-[28px]">
        <p className="text-[18px] font-black">WENZE<span className="text-[#FFD166]">.</span> <span className="float-right text-[11px] bg-white/15 px-3 py-1 rounded-full">🔒 ESPACE SURVEILLÉ</span></p>
        <h1 className="font-black text-[22px] mt-4">🛡️ Connecte-toi en tant que Superviseur</h1>
        <p className="text-[12px] opacity-70">Ton bureau • Ta zone • Ton équipe</p>
      </div>
      <div className="px-4 mt-4"><div className="bg-white border rounded-2xl p-4">
        <label className="text-[11px] font-black">NUMÉRO DE TÉLÉPHONE</label>
        <input value={tel} onChange={e => setTel(e.target.value)} placeholder="Ex: +243810000001" className="w-full border rounded-xl px-3 py-3 mt-1" />
        <label className="text-[11px] font-black block mt-3">TON CODE SUPERVISEUR</label>
        <div className="relative"><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} type={voir ? "text" : "password"} placeholder="SUP-..." className="w-full border rounded-xl px-3 py-3 mt-1 uppercase" /><button onClick={() => setVoir(!voir)} className="absolute right-3 top-4">👁️</button></div>
        <button onClick={connecter} disabled={loading} className="w-full bg-[#1A3A2F] text-white py-4 rounded-full font-black text-[13px] mt-4">{loading ? "⏳ Vérification..." : "🔓 ENTRER DANS MON BUREAU SUPERVISEUR"}</button>
        {msg && <p className="text-[12px] font-bold text-center mt-3">{msg}</p>}
      </div></div>
    </div>
  );
  if (!moi) return <div className="p-6">Chargement...</div>;
    // --- SI CONNECTÉ : SON BUREAU PERSONNALISÉ ---
  const actifs = ambassadeurs.filter(a => a.statut === "ACTIF").length;
  const validees = boutiques.filter(b => b.statut === "VALIDEE").length;
  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] pb-20">
      {toast && <div className="fixed top-4 left-4 right-4 z-50 bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div>}
      <div className="bg-[#1A3A2F] text-white px-5 pt-8 pb-5 rounded-b-[28px]">
        <div className="flex justify-between"><p className="text-[11px] opacity-70">WENZE • MON BUREAU SUPERVISEUR</p><button onClick={() => quitterSession()} className="bg-white/15 px-3 py-1 rounded-full text-[11px] font-bold">↩ Quitter</button></div>
        <p className="text-[11px] opacity-70 mt-1">⏱️ Session : {tempsRestant()} restant • 🔒 Zone sécurisée</p>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-[62px] h-[62px] bg-[#FFD166] text-black rounded-full flex items-center justify-center font-black text-[20px]">{initiales(moi.nom)}</div>
          <div><h1 className="font-black text-[20px]">Bonjour, {moi.nom.split(" ")[0]} 👋</h1><p className="text-[12px] opacity-80">🛡️ Superviseur • {moi.commune} • {moi.province}</p><p className="text-[11px] mt-1"><span className="bg-[#FFD166] text-black px-2 py-0.5 rounded-full font-black">{moi.codePro}</span></p></div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 mt-4 text-[12px]">🎯 <b>Ton équipe :</b> {ambassadeurs.length} ambassadeurs ({actifs} actifs) • {validees} boutiques validées</div>
      </div>
      <div className="flex gap-1.5 px-4 mt-4">{["ACCUEIL", "AMBASSADEURS", "BOUTIQUES"].map(t => (<button key={t} onClick={() => setOnglet(t)} className={`px-3 py-2 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>{t === "ACCUEIL" ? "🏠 Mon Accueil" : t === "AMBASSADEURS" ? "🎖️ Mes Amb." : "🏪 Mes Boutiques"}</button>))}</div>
            <div className="px-4 mt-4">
        {onglet === "ACCUEIL" && <div className="grid grid-cols-2 gap-2"><div className="bg-white border rounded-2xl p-4"><p className="font-black text-[22px]">{ambassadeurs.length}</p><p className="text-[11px] text-gray-500">Mes ambassadeurs<br /><b className="text-green-600">{actifs} actifs</b></p></div><div className="bg-white border rounded-2xl p-4"><p className="font-black text-[22px]">{boutiques.length}</p><p className="text-[11px] text-gray-500">Mes boutiques<br /><b className="text-green-600">{validees} validées</b></p></div><div className="bg-white border rounded-2xl p-4 col-span-2"><p className="text-[11px] font-black">📍 TA ZONE</p><p className="text-[12px] text-gray-600 mt-1">{moi.commune} • {moi.province} {moi.village ? `• ${moi.village}` : ""}</p><p className="text-[11px] text-gray-400 mt-1">Tu ne vois que ta zone. Les autres zones sont cachées.</p></div></div>}
        {onglet === "AMBASSADEURS" && <div className="space-y-2">{ambassadeurs.map(a => (<div key={a.id} className="bg-white border rounded-2xl p-4"><p className="font-black text-[14px]">{a.nom}</p><p className="text-[11px] text-gray-500">{a.code_pro} • {a.statut} • {a.filleuls || 0} filleuls • {a.boutiques_validees || 0} boutiques</p></div>))}{ambassadeurs.length === 0 && <p className="text-[12px] text-gray-500">Aucun ambassadeur sous toi.</p>}</div>}
        {onglet === "BOUTIQUES" && <div className="space-y-2">{boutiques.map(b => (<div key={b.id} className="bg-white border rounded-2xl p-4"><p className="font-black">{b.nom} <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{b.statut}</span></p><p className="text-[11px] text-gray-500">{b.proprietaire} • {b.commune} • {b.telephone}</p><p className="text-[11px] text-gray-400">Abonnement : {b.abonnement || "EN_ATTENTE"}</p></div>))}{boutiques.length === 0 && <p className="text-[12px] text-gray-500">Aucune boutique dans ta zone.</p>}</div>}
      </div>
    </div>
  );
}
