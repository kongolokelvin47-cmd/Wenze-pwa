"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CodeLangueWenze = "fr" | "ln" | "sw" | "en";

const OPTIONS_LANGUE: { code: CodeLangueWenze; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "ln", label: "LN" },
  { code: "sw", label: "SW" },
  { code: "en", label: "EN" },
];

export function lireLangueCourante(): CodeLangueWenze {
  if (typeof window === "undefined") return "fr";
  try {
    const match = document.cookie.match(/(?:^|;\s*)wenze_lang=([^;]+)/);
    const val = (match?.[1] || localStorage.getItem("wenze_lang") || "fr").toLowerCase();
    if (val === "ln" || val === "sw" || val === "en") return val;
    return "fr";
  } catch {
    return "fr";
  }
}

export default function LanguageSelector({ userId }: { userId?: string | null }) {
  const [langue, setLangue] = useState<CodeLangueWenze>("fr");

  useEffect(() => {
    setLangue(lireLangueCourante());
  }, []);

  const changerLangue = async (nouvelleLangue: CodeLangueWenze) => {
    setLangue(nouvelleLangue);
    try {
      document.cookie = `wenze_lang=${nouvelleLangue}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`;
      localStorage.setItem("wenze_lang", nouvelleLangue);
      window.dispatchEvent(
        new CustomEvent("wenze:lang-changed", { detail: { lang: nouvelleLangue } })
      );
    } catch {}

    if (userId && supabase) {
      try {
        await supabase
          .from("profiles")
          .update({ preferred_lang: nouvelleLangue })
          .eq("id", userId);
      } catch {}
    }
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-1 border border-gray-200">
      {OPTIONS_LANGUE.map((opt) => (
        <button
          key={opt.code}
          type="button"
          onClick={() => changerLangue(opt.code)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-black transition ${
            langue === opt.code
              ? "bg-black text-white"
              : "text-gray-700 hover:bg-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
 }
        
