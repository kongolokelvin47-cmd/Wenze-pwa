"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ConnexionMembre() {
  const [tel, setTel] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const connecter = async () => {
    if (!tel || !code) { setMsg("❌ Téléphone + Code Pro obligatoires"); return; }
    setLoading(true);
    setMsg("⏳ Vérification...");

    // 1. Chercher le membre avec ce téléphone + ce code
    const { data, error } = await supabase
      .from("membres")
      .select("*")
      .eq("telephone", tel.trim())
      .eq("code_pro", code.trim().toUpperCase())
      .single();

    if (error || !data) {
      setMsg("❌ Téléphone ou Code Pro faux. Demande au DG.");
      setLoading(false);
      return;
    }

    // 2. Vérifier le statut
    if (data.statut === "EN_ATTENTE") {
      setMsg("⏳ Ton compte est créé mais pas encore validé par le DG. Attends sa validation.");
      setLoading(false);
      return;
    }
    if (data.statut === "SUSPENDU") {
      setMsg("⛔ Ton compte est suspendu par le DG. Contacte-le.");
      setLoading(false);
      return;
    }

    // 3. C'est bon : on garde la session dans ce téléphone
    localStorage.setItem("wenze_session", JSON.stringify({
      id: data.id, nom: data.nom, role: data.role,
      codePro: data.code_pro, telephone: data.telephone,
      province: data.province, commune: data.commune, village: data.village,
      chefCode: data.chef_code,
    }));
    setMsg("✅ Bienvenue " + data.nom + " !");

    // 4. Rediriger selon le rôle
    setTimeout(() => {
      if (data.role === "SUPERVISEUR") window.location.href = "/superviseur";
      else window.location.href = "/ambassadeur";
    }, 800);
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pt-16">
      <p className="text-center text-[40px]">👋</p>
      <h1 className="font-black text-[22px] text-center">Connexion WENZE</h1>
      <p className="text-[13px] text-center text-gray-500 mt-1">
        Superviseur ou Ambassadeur.<br />Ton Code Pro t'a été donné par le DG sur WhatsApp.
      </p>
      <div className="bg-white border rounded-2xl p-4 mt-5 space-y-2">
        <label className="text-[11px] font-bold">Téléphone WhatsApp</label>
        <input value={tel} onChange={e => setTel(e.target.value)} placeholder="+243810000011" className="w-full border rounded-xl px-3 py-3" />
        <label className="text-[11px] font-bold">Code Pro</label>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="AMB-JOE-2026-077" className="w-full border rounded-xl px-3 py-3 uppercase font-bold tracking-wider" />
        <button onClick={connecter} disabled={loading} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px]">
          {loading ? "⏳ Vérification..." : "🔓 Se connecter"}
        </button>
        {msg && <p className="text-[12px] font-bold text-center">{msg}</p>}
      </div>
      <div className="bg-yellow-50 border rounded-2xl p-4 mt-3">
        <p className="text-[12px] font-bold">❓ Tu n'as pas de Code Pro ?</p>
        <p className="text-[12px] text-gray-600 mt-1">Demande au DG de créer ton compte. Sans Code Pro, tu ne peux pas entrer. C'est pour protéger le réseau.</p>
      </div>
    </div>
  );
}
