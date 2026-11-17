"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Superviseur() {
  const [moi, setMoi] = useState<any>(null);
  const [mesAmb, setMesAmb] = useState<any[]>([]);
  const [mesBoutiques, setMesBoutiques] = useState<any[]>([]);

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("wenze_session") || "null");
    if (!s) { window.location.href = "/connexion"; return; }
    if (s.role !== "SUPERVISEUR") { window.location.href = "/connexion"; return; }
    setMoi(s);

    const charger = async () => {
      // MES ambassadeurs = ceux dont chef_code = MON code Pro
      const { data: amb } = await supabase.from("membres").select("*").eq("chef_code", s.codePro);
      if (amb) setMesAmb(amb);

      // MES boutiques = celles de MA commune
      const { data: bout } = await supabase.from("boutiques").select("*").eq("commune", s.commune);
      if (bout) setMesBoutiques(bout);
    };
    charger();

    // TEMPS RÉEL : si le DG me suspend, je suis coupé tout de suite
    const ch = supabase.channel("sup-" + s.id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "membres", filter: `id=eq.${s.id}` },
        (pl) => {
          if ((pl.new as any).statut === "SUSPENDU") {
            alert("⛔ Ton compte a été suspendu par le DG.");
            localStorage.removeItem("wenze_session");
            window.location.href = "/connexion";
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (!moi) return <div className="p-6">Chargement...</div>;

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] p-4 pb-10">
      <h1 className="font-black text-xl">👔 Bonjour {moi.nom}</h1>
      <p className="text-[12px] text-gray-500">Superviseur • {moi.commune} • Code : {moi.codePro}</p>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-white border rounded-2xl p-4"><p className="font-black text-2xl">{mesAmb.length}</p><p className="text-[11px] text-gray-500">Mes ambassadeurs</p></div>
        <div className="bg-white border rounded-2xl p-4"><p className="font-black text-2xl">{mesBoutiques.length}</p><p className="text-[11px] text-gray-500">Boutiques à {moi.commune}</p></div>
      </div>

      <div class="bg-white border rounded-2xl p-4 mt-3">
        <h2 className="font-black">👥 Mes ambassadeurs</h2>
        {mesAmb.map((a: any) => (
          <div key={a.id} className="border-b py-2 flex justify-between">
            <div><p className="font-bold text-[13px]">{a.nom}</p><p className="text-[11px] text-gray-500">{a.code_pro} • {a.statut}</p></div>
            <span className="text-[11px] font-bold">{a.gains?.toLocaleString()} CDF</span>
          </div>
        ))}
        {mesAmb.length === 0 && <p className="text-[12px] text-gray-500">Aucun ambassadeur sous toi pour l'instant.</p>}
      </div>

      <div className="bg-white border rounded-2xl p-4 mt-3">
        <h2 className="font-black">🏪 Boutiques de {moi.commune}</h2>
        {mesBoutiques.map((b: any) => (
          <div key={b.id} className="border-b py-2"><p className="font-bold text-[13px]">{b.nom}</p><p className="text-[11px] text-gray-500">{b.proprietaire} • {b.statut} • {b.abonnement}</p></div>
        ))}
      </div>

      <button onClick={() => { localStorage.removeItem("wenze_session"); window.location.href = "/connexion"; }} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-4">🔒 Déconnexion</button>
    </div>
  );
      }
