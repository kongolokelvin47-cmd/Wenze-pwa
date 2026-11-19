"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase: any = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : null;

const TYPES_PUBLIC = ["CLIENT", "BOUTIQUE", "PRESTATAIRE", "GROSSISTE"];

export default function TombolaActivite() {
  const [cfg, setCfg] = useState<any>(null);
  const [moi, setMoi] = useState<any>(null);
  const [temps, setTemps] = useState("");
  const [copie, setCopie] = useState(false);
  const [classement, setClassement] = useState<any[]>([]);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("wenze_user") || "null");
    if (!u) return;
    const type = (u.type_public || u.type || u.role || "CLIENT").toUpperCase();
    // Ambassadeur / Superviseur / DG ne voient JAMAIS la Tombola
    if (!TYPES_PUBLIC.includes(type)) return;
    setMoi(u);

    const charger = async () => {
      if (!supabase) return;
      const { data: c } = await supabase.from("tombola_config").select("*").eq("id", 1).single();
      if (c) setCfg(c);
      const [b, cl, p] = await Promise.all([
        supabase.from("boutiques").select("*"),
        supabase.from("clients").select("*"),
        supabase.from("paiements").select("*"),
      ]);
      const boutiques = b.data || []; const clients = cl.data || []; const paiements = p.data || [];
      const code = u.code_pro || u.code_invitation || u.id;

      // Meme calcul que chez le DG - Pas de triche
      const boutInv = boutiques.filter((x: any) => (x.code_invitation === code || x.code_amb === code) && ["ACTIF", "VALIDEE", "PAYE"].includes(x.statut));
      const cliInv = clients.filter((x: any) => (x.code_invitation === code || x.code_parrain === code) && x.statut === "ACTIF");
      const aboPayes = paiements.filter((pp: any) => {
        const bb = boutiques.find((x: any) => x.id === pp.boutique_id);
        return (bb?.code_invitation === code || bb?.code_amb === code) && (pp.statut === "PAYÉ" || pp.statut === "PAYE") && (pp.type === "PREMIER" || pp.type === "OCCASIONNELLE");
      });
      const pts = {
        total: boutInv.length * 5 + cliInv.length * 3 + aboPayes.length * 20,
        nbBoutiques: boutInv.length, nbClients: cliInv.length, nbAbos: aboPayes.length,
        ptsBoutiques: boutInv.length * 5, ptsClients: cliInv.length * 3, ptsAbos: aboPayes.length * 20,
      };
      setMoi({ ...u, type_public: type, pts });

      // Classement Public - Top 5
      const map = new Map();
      [...boutiques, ...clients].forEach((x: any) => {
        const t = (x.type_public || x.type || "CLIENT").toUpperCase();
        if (!TYPES_PUBLIC.includes(t)) return;
        const cCode = x.code_pro || x.code_invitation || x.id;
        if (!map.has(cCode)) map.set(cCode, { nom: x.nom || x.proprietaire || "", telephone: x.telephone || x.whatsapp || "", code: cCode });
      });
      const top = [...map.values()].map((pp: any) => {
        const bb = boutiques.filter((x: any) => (x.code_invitation === pp.code || x.code_amb === pp.code) && ["ACTIF", "VALIDEE", "PAYE"].includes(x.statut)).length;
        const cc = clients.filter((x: any) => (x.code_invitation === pp.code || x.code_parrain === pp.code) && x.statut === "ACTIF").length;
        const aa = paiements.filter((p2: any) => { const b2 = boutiques.find((x: any) => x.id === p2.boutique_id); return (b2?.code_invitation === pp.code || b2?.code_amb === pp.code) && (p2.statut === "PAYÉ" || p2.statut === "PAYE") && (p2.type === "PREMIER" || p2.type === "OCCASIONNELLE"); }).length;
        return { ...pp, total: bb * 5 + cc * 3 + aa * 20 };
      }).filter(x => x.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
      setClassement(top);

      // Enregistre le participant chez le DG avec son profil = Nom + Numero
      if (c?.active) {
        await supabase.from("tombola_participants").upsert({
          id: u.id, nom: u.nom || u.proprietaire || "", telephone: u.telephone || u.whatsapp || "",
          type_public: type, code_invitation: code, points: pts.total,
          nb_clients: pts.nbClients, nb_boutiques: pts.nbBoutiques, nb_abos: pts.nbAbos,
        }, { onConflict: "id" });
      }
    };

    charger();
    if (!supabase) return;
    const ch = supabase.channel("tombola-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "tombola_config" }, (pay: any) => { if (pay.new) setCfg(pay.new); charger(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, charger)
      .subscribe();
    const interval = setInterval(charger, 10000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!cfg?.date_fin || !cfg?.active) return;
    const i = setInterval(() => {
      const rest = new Date(cfg.date_fin).getTime() - Date.now();
      if (rest <= 0) { setTemps("TERMINEE"); clearInterval(i); }
      else setTemps(`${Math.floor(rest / 86400000)}j ${Math.floor((rest % 86400000) / 3600000)}h ${Math.floor((rest % 3600000) / 60000)}min`);
    }, 1000);
    return () => clearInterval(i);
  }, [cfg]);

  if (!cfg || !moi) return null;

  // Tombola fermee mais gagnant a afficher
  if (!cfg.active) {
    if (!cfg.gagnant_nom) return null;
    return (
      <div className="mx-4 mt-3 bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4 text-center">
        <p className="font-black">🏆 Tombola Terminee</p>
        <p className="text-[13px] mt-1">Gagnant : <b>{cfg.gagnant_nom}</b> - {cfg.gagnant_points} pts</p>
        <p className="text-[11px] text-gray-600">Lot : {cfg.lot}</p>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((moi.pts?.total || 0) / (cfg.plafond || 100) * 100));
  const lien = `${typeof window !== "undefined" ? window.location.origin : ""}/creer-boutique?code=${moi.code_pro || moi.code_invitation || moi.id}`;

  return (
    <div className="mx-4 mt-3 bg-black text-white rounded-2xl p-4 border-2 border-[#FF6B00]">
      <div className="flex justify-between items-start">
        <p className="font-black">🎟️ TOMBOLA ACTIVEE</p>
        <span className="bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">● EN COURS</span>
      </div>
      <p className="text-[12px] mt-1">🏆 Lot : <b>{cfg.lot}</b> • 🎯 Plafond : {cfg.plafond} pts • ⏱️ Reste : <b className="text-yellow-300">{temps}</b></p>

      <div className="bg-white/10 rounded-2xl p-3 mt-3">
        <p className="text-[11px] text-white/70">Ton profil = Ta candidature</p>
        <p className="font-black text-[14px] mt-0.5">{moi.nom || moi.proprietaire} • {moi.telephone || moi.whatsapp}</p>
        <p className="text-[11px] text-white/70">{moi.type_public} • Code : {moi.code_pro || moi.code_invitation || moi.id}</p>
        <p className="text-[16px] font-black mt-2">Tu as : <span className="text-yellow-300">{moi.pts?.total || 0} / {cfg.plafond} pts</span> ({pct}%)</p>
        <div className="w-full bg-white/20 h-3 rounded-full mt-1"><div className="bg-[#FF6B00] h-3 rounded-full" style={{ width: `${pct}%` }} /></div>
        <p className="text-[11px] mt-2">👥 {moi.pts?.nbClients || 0} clients x3 = {moi.pts?.ptsClients || 0} pts • 🏪 {moi.pts?.nbBoutiques || 0} bout. x5 = {moi.pts?.ptsBoutiques || 0} pts • 💰 {moi.pts?.nbAbos || 0} abos x20 = {moi.pts?.ptsAbos || 0} pts</p>
        <p className="text-[10px] text-white/60 mt-1">Boutique non validee par le DG = 0 pt. Boutique validee = +5 pts. Invite qui paie = +20 pts en plus.</p>
      </div>

      <button onClick={() => { navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); }} className="w-full mt-3 bg-[#FF6B00] text-white py-3.5 rounded-full font-black text-[13px]">
        {copie ? "✅ Lien copie !" : "📤 INVITER MES AMIS - Gagner des points"}
      </button>
      <p className="text-[10px] text-white/60 text-center mt-1">Partage ton lien, chaque ami qui finalise te donne des points automatiquement.</p>

      {classement.length > 0 && (
        <div className="bg-white/10 rounded-2xl p-3 mt-3">
          <p className="font-black text-[12px]">🏆 Top 5 en direct</p>
          {classement.map((c: any, i: number) => (
            <p key={i} className="text-[12px] mt-1">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`} {c.nom} - <b className="text-yellow-300">{c.total} pts</b> {c.code === (moi.code_pro || moi.code_invitation || moi.id) ? "← C'est toi" : ""}</p>
          ))}
        </div>
      )}
    </div>
  );
}
