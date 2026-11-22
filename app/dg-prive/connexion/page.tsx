"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { demarrerSession } from "@/lib/session";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

interface MembreRecord {
  id?: string | number;
  role: string;
  nom?: string;
  telephone?: string;
  code_pro: string;
  commune?: string;
  province?: string;
  statut?: string;
}

export default function ConnexionWenze() {
  const router = useRouter();
  const [telephone, setTelephone] = useState("");
  const [codePro, setCodePro] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanTel = (t: string) => t.replace(/[^0-9]/g, "").replace(/^0+/, "");

  const connecter = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMsg("");

    if (!telephone.trim() || !codePro.trim()) {
      setMsg("❌ Mets ton WhatsApp + ton Code Pro");
      return;
    }

    if (!supabase) {
      setMsg("⚠️ Supabase non connecté sur Vercel");
      return;
    }

    setLoading(true);

    try {
      const code = codePro.trim().toUpperCase();
      const tel = cleanTel(telephone);

      const { data, error } = await supabase
        .from("membres")
        .select("*")
        .eq("code_pro", code)
        .single<MembreRecord>();

      if (error || !data) {
        setMsg("❌ Code Pro introuvable. Demande au DG de créer ton compte.");
        return;
      }

      const telBase = cleanTel(data.telephone || "");
      const correspond =
        tel === telBase ||
        tel === "243" + telBase ||
        (telBase.length > 0 && telBase === "243" + tel);

      if (!correspond) {
        setMsg("❌ Ce Code Pro ne correspond pas à ce WhatsApp.");
        return;
      }

      if (data.statut !== "ACTIF") {
        setMsg(
          `⏳ Ton compte est ${data.statut || "INACTIF"}. Demande au DG de te valider.`
        );
        return;
      }

      const profilSession = {
        nom: data.nom ?? "",
        telephone: data.telephone ?? "",
        code_pro: data.code_pro,
        commune: data.commune ?? "",
        province: data.province ?? "",
      };

      demarrerSession(data.role, profilSession);

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("wenze_user", JSON.stringify(profilSession));
        } catch {
          // Ignore si le stockage local est indisponible
        }
      }

      if (data.role === "SUPERVISEUR") {
        router.push("/equipe/superviseur");
      } else if (data.role === "AMBASSADEUR") {
        router.push("/ambassadeur");
      } else {
        router.push("/");
      }
    } catch {
      setMsg("❌ Erreur de connexion. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-4">
      <p className="text-center text-[40px] mt-8">👋</p>
      <h1 className="text-center font-black text-[26px]">Connexion WENZE</h1>
      <p className="text-center text-[13px] text-gray-500 mt-1">
        Superviseur ou Ambassadeur.
        <br />
        Ton Code Pro t&apos;a été donné par le DG sur WhatsApp.
      </p>

      <form onSubmit={connecter} className="bg-white border rounded-2xl p-4 mt-6">
        <label htmlFor="tel-whatsapp" className="font-bold text-[13px]">
          Téléphone WhatsApp
        </label>
        <input
          id="tel-whatsapp"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="+243810000011"
          className="w-full border rounded-2xl px-4 py-3.5 mt-1"
        />

        <label htmlFor="code-pro" className="font-bold text-[13px] block mt-4">
          Code Pro
        </label>
        <input
          id="code-pro"
          value={codePro}
          onChange={(e) => setCodePro(e.target.value.toUpperCase())}
          placeholder="AMB-JOE-2026-077"
          className="w-full border rounded-2xl px-4 py-3.5 mt-1 uppercase"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-4 rounded-full font-black mt-4"
        >
          {loading ? "Vérification..." : "🔒 Se connecter"}
        </button>

        {msg && <p className="text-center text-[12px] font-bold mt-3">{msg}</p>}
      </form>

      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mt-4">
        <p className="font-black">❓ Tu n&apos;as pas de Code Pro ?</p>
        <p className="text-[12px] text-gray-600 mt-1">
          Demande au DG de créer ton compte. Sans Code Pro, tu ne peux pas entrer.
          C&apos;est pour protéger le réseau.
        </p>
      </div>

      <div className="text-center mt-4">
        <p className="text-[12px] text-gray-500">Tu es le DG ?</p>
        <a href="/dg-prive" className="font-black text-[13px] underline">
          👑 Aller au Bureau DG
        </a>
      </div>
    </div>
  );
            }
