"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ConnexionEquipe() {
  const [whats, setWhats] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const connecter = async () => {
    if (!whats.trim() || !code.trim()) return setMsg("⚠️ WhatsApp + Code Pro");
    const { data } = await supabase.from("membres").select("*").eq("telephone", whats.trim()).eq("code_pro", code.trim().toUpperCase()).maybeSingle();
    if (!data) return setMsg("❌ WhatsApp ou Code Pro incorrect. Demande ton code au DG.");
    if (data.statut !== "ACTIF") return setMsg("⏸️ Ton compte est suspendu. Contacte le DG.");
    localStorage.setItem("wenze_membre", JSON.stringify(data));
    localStorage.setItem("wenze_role", data.role);
    window.location.href = data.role === "SUPERVISEUR" ? "/equipe/superviseur" : "/equipe/ambassadeur";
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-black text-white p-6 flex flex-col justify-center">
      <p className="text-[28px] font-black">WENZE<span className="text-[#FF6B00]">.</span></p>
      <h1 className="font-black text-[24px] mt-4">👔 Connexion Équipe</h1>
      <p className="text-[12px] opacity-60">Superviseurs et Ambassadeurs seulement. Ton Code Pro te donne ta zone.</p>
      <input value={whats} onChange={e => setWhats(e.target.value)} placeholder="WhatsApp — Ex: +243810000001" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 mt-6 outline-none" />
      <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Code Pro — Ex: SUP-GOM-2026-014" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 mt-3 outline-none" />
      <button onClick={connecter} className="w-full bg-[#FF6B00] py-4 rounded-full font-black mt-4">🔓 ENTRER DANS MON ESPACE</button>
      {msg && <p className="text-center text-[12px] mt-3 font-bold">{msg}</p>}
      <p className="text-[11px] text-center opacity-50 mt-6">Pas de compte ? Demande ton Code Pro au DG.</p>
    </div>
  );
}
