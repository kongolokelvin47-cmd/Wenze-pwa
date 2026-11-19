"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { calculerPoints } from "@/lib/tombola-points";
const supabase: any = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function TombolaActivite() {
  const [cfg, setCfg] = useState<any>(null);
  const [moi, setMoi] = useState<any>(null);
  const [temps, setTemps] = useState("");
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("wenze_user") || "null");
    if (!u) return;
    // On bloque si c'est un Ambassadeur / Superviseur
    const type = (u.type_public || u.type || u.role || "CLIENT").toUpperCase();
    if (["AMBASSADEUR", "SUPERVISEUR", "DG"].includes(type)) return;
    setMoi(u);
    (async () => {
      const { data: c } = await supabase.from("tombola_config").select("*").eq("id", 1).single();
      if (c) setCfg(c);
      const [b, cl, p] = await Promise.all([
        supabase.from("boutiques").select("*"), supabase.from("clients").select("*"), supabase.from("paiements").select("*"),
      ]);
      const pts = calculerPoints(u.code_pro || u.code_invitation || u.id, b.data || [], cl.data || [], p.data || []);
      setMoi({ ...u, pts });
      // Enregistre le participant chez le DG avec son profil = nom + numéro
      if (c?.active) {
        await supabase.from("tombola_participants").upsert({
          id: u.id, nom: u.nom || u.proprietaire || "", telephone: u.telephone || u.whatsapp || "",
          type_public: type, code_invitation: u.code_pro || u.code_invitation || u.id,
          points: pts.total, nb_clients: pts.nbClients, nb_boutiques: pts.nbBoutiques, nb_abos: pts.nbAbos,
        }, { onConflict: "id" });
      }
    })();
  }, []);

  useEffect(() => {
    if (!cfg?.date_fin || !cfg?.active) return;
    const i = setInterval(() => {
      const rest = new Date(cfg.date_fin).getTime() - Date.now();
      if (rest <= 0) { setTemps("TERMINÉE"); clearInterval(i); }
      else setTemps(`${Math.floor(rest / 86400000)}j ${Math.floor((rest % 86400000) / 3600000)}h ${Math.floor((rest % 3600000) / 60000)}min`);
    }, 1000);
    return () => clearInterval(i);
  }, [cfg]);

  if (!cfg?.active || !moi) return null;
  const pct = Math.min(100, Math.round((moi.pts?.total || 0) / (cfg.plafond || 100) * 100));
  const lien = `${window.location.origin}/creer-boutique?code=${moi.code_pro || moi.code_invitation || moi.id}`;

  return (
    <div className="mx-4 mt-3 bg-black text-white rounded-2xl p-4 border-2 border-[#FF6B00]">
      <div className="flex justify-between items-start">
        <p className="font-black">🎟️ TOMBOLA ACTIVÉE</p>
        <span className="bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">● EN COURS</span>
      </div>
      <p className="text-[12px] mt-1">🏆 Lot : <b>{cfg.lot}</b> • 🎯 Plafond : {cfg.plafond} pts • ⏱️ Reste : <b className="text-yellow-300">{temps}</b></p>
      <div className="bg-white/10 rounded-2xl p-3 mt-3">
        <p className="text-[11px] text-white/70">Ton profil = Ta candidature</p>
        <p className="font-black text-[14px] mt-0.5">{moi.nom || moi.proprietaire} • {moi.telephone || moi.whatsapp}</p>
        <p className="text-[11px] text-white/70">{moi.type_public || moi.type || "CLIENT"} • Code : {moi.code_pro || moi.code_invitation || moi.id}</p>
        <p className="text-[16px] font-black mt-2">Tu as : <span className="text-yellow-300">{moi.pts?.total || 0} / {cfg.plafond} pts</span> ({pct}%)</p>
        <div className="w-full bg-white/20 h-3 rounded-full mt-1"><div className="bg-[#FF6B00] h-3 rounded-full" style={{ width: `${pct}%` }} /></div>
        <p className="text-[11px] mt-2">👥 {moi.pts?.nbClients || 0} clients ×3 = {moi.pts?.ptsClients || 0} • 🏪 {moi.pts?.nbBoutiques || 0} bout. ×5 = {moi.pts?.ptsBoutiques || 0} • 💰 {moi.pts?.nbAbos || 0} abos ×20 = {moi.pts?.ptsAbos || 0}</p>
      </div>
      <button onClick={() => { navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); }} className="w-full mt-3 bg-[#FF6B00] text-white py-3.5 rounded-full font-black text-[13px]">
        {copie ? "✅ Lien copié !" : "📤 INVITER MES AMIS - Gagner des points"}
      </button>
      <p className="text-[10px] text-white/60 text-center mt-1">Chaque ami qui finalise son compte te donne des points automatiquement.</p>
    </div>
  );
            }
