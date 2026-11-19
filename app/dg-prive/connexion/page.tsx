"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase: any = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : null;

export default function ConnexionWenze() {
  const router = useRouter();
  const [telephone, setTelephone] = useState("");
  const [codePro, setCodePro] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanTel = (t: string) => t.replace(/[^0-9]/g, "").replace(/^0+/, "");

  const connecter = async () => {
    if (!telephone.trim() || !codePro.trim()) return setMsg("❌ Mets ton WhatsApp + ton Code Pro");
    if (!supabase) return setMsg("⚠️ Supabase non connecté sur Vercel");
    setLoading(true); setMsg("");
    // Nettoie le code : enlève espaces, met en majuscules
    const code = codePro.trim().toUpperCase();
    const tel = cleanTel(telephone);
    const { data, error } = await supabase.from("membres").select("*").eq("code_pro", code).single();
    if (error || !data) { setLoading(false); return setMsg("❌ Code Pro introuvable. Demande au DG de créer ton compte."); }
    // Vérifie que le WhatsApp correspond (avec ou sans +243 / 0)
    const telBase = cleanTel(data.telephone || "");
    if (tel !== telBase && tel !== "243" + telBase && telBase !== "243" + tel) {
      setLoading(false); return setMsg("❌ Ce Code Pro ne correspond pas à ce WhatsApp.");
    }
    if (data.statut !== "ACTIF") { setLoading(false); return setMsg("⏳ Ton compte est " + data.statut + ". Demande au DG de te valider."); }
    // ✅ Sauvegarde session 12h
    try {
      localStorage.setItem("wenze_session", JSON.stringify({ role: data.role, nom: data.nom, telephone: data.telephone, code_pro: data.code_pro, commune: data.commune, province: data.province, debut: Date.now() }));
      localStorage.setItem("wenze_user", JSON.stringify(data));
    } catch {}
    setLoading(false);
    // Redirection selon rôle
    if (data.role === "SUPERVISEUR") router.push("/equipe/superviseur");
    else if (data.role === "AMBASSADEUR") router.push("/ambassadeur");
    else router.push("/");
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-4">
      <p className="text-center text-[40px] mt-8">👋</p>
      <h1 className="text-center font-black text-[26px]">Connexion WENZE</h1>
      <p className="text-center text-[13px] text-gray-500 mt-1">Superviseur ou Ambassadeur.<br />Ton Code Pro t'a été donné par le DG sur WhatsApp.</p>
      <div className="bg-white border rounded-2xl p-4 mt-6">
        <label className="font-bold text-[13px]">Téléphone WhatsApp</label>
        <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+243810000011" className="w-full border rounded-2xl px-4 py-3.5 mt-1" />
        <label className="font-bold text-[13px] block mt-4">Code Pro</label>
        <input value={codePro} onChange={e => setCodePro(e.target.value.toUpperCase())} placeholder="AMB-JOE-2026-077" className="w-full border rounded-2xl px-4 py-3.5 mt-1 uppercase" />
        <button onClick={connecter} disabled={loading} className="w-full bg-black text-white py-4 rounded-full font-black mt-4">{loading ? "Vérification..." : "🔒 Se connecter"}</button>
        {msg && <p className="text-center text-[12px] font-bold mt-3">{msg}</p>}
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mt-4">
        <p className="font-black">❓ Tu n'as pas de Code Pro ?</p>
        <p className="text-[12px] text-gray-600 mt-1">Demande au DG de créer ton compte. Sans Code Pro, tu ne peux pas entrer. C'est pour protéger le réseau.</p>
      </div>
      <div className="text-center mt-4">
        <p className="text-[12px] text-gray-500">Tu es le DG ?</p>
        <a href="/dg-prive" className="font-black text-[13px] underline">👑 Aller au Bureau DG → PIN 2026</a>
      </div>
    </div>
  );
        }
