"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Ambassadeur() {
  const [moi, setMoi] = useState<any>(null);
  const [mesBoutiques, setMesBoutiques] = useState<any[]>([]);
  const [nomBout, setNomBout] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("wenze_session") || "null");
    if (!s || s.role !== "AMBASSADEUR") { window.location.href = "/connexion"; return; }
    setMoi(s);
    const charger = async () => {
      const { data } = await supabase.from("boutiques").select("*").eq("code_amb", s.codePro);
      if (data) setMesBoutiques(data);
    };
    charger();
    const ch = supabase.channel("amb-" + s.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "boutiques", filter: `code_amb=eq.${s.codePro}` },
        () => { charger(); setMsg("✅ Mise à jour en temps réel"); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "membres", filter: `id=eq.${s.id}` },
        (pl) => {
          if ((pl.new as any).statut === "SUSPENDU") {
            alert("⛔ Suspendu par le DG."); localStorage.removeItem("wenze_session"); window.location.href = "/connexion";
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const creerBoutique = async () => {
    if (!nomBout) { setMsg("❌ Nom boutique"); return; }
    const { error } = await supabase.from("boutiques").insert({
      id: "B-" + Date.now(), nom: nomBout, proprietaire: moi.nom, telephone: moi.telephone,
      province: moi.province, commune: moi.commune, village: moi.village,
      statut: "EN_ATTENTE", abonnement: "EN_ATTENTE", code_amb: moi.codePro,
    });
    if (error) setMsg("❌ " + error.message);
    else { setNomBout(""); setMsg("✅ Boutique envoyée au DG pour validation"); }
  };

  if (!moi) return <div className="p-6">Chargement...</div>;

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#FFFBF0] p-4 pb-10">
      <h1 className="font-black text-xl">🙋 Bonjour {moi.nom}</h1>
      <p className="text-[12px] text-gray-500">Ambassadeur • {moi.commune} • {moi.codePro}</p>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-white border rounded-2xl p-4"><p className="font-black text-2xl">{mesBoutiques.length}</p><p className="text-[11px] text-gray-500">Mes boutiques</p></div>
        <div className="bg-white border rounded-2xl p-4"><p className="font-black text-2xl">{(moi.gains || 0).toLocaleString()} CDF</p><p className="text-[11px] text-gray-500">Mes gains</p></div>
      </div>
      <div className="bg-white border rounded-2xl p-4 mt-3">
        <h2 className="font-black">+ Créer une boutique</h2>
        <p className="text-[12px] text-gray-500">Elle part en EN_ATTENTE. Le DG la valide.</p>
        <input value={nomBout} onChange={e => setNomBout(e.target.value)} placeholder="Nom de la boutique" className="w-full border rounded-xl px-3 py-3 mt-2" />
        <button onClick={creerBoutique} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-2">✅ Envoyer au DG</button>
        {msg && <p className="text-[12px] font-bold text-center mt-2">{msg}</p>}
      </div>
      <div className="bg-white border rounded-2xl p-4 mt-3">
        <h2 className="font-black">🏪 Mes boutiques</h2>
        {mesBoutiques.map((b: any) => (
          <div key={b.id} className="border-b py-2"><p className="font-bold text-[13px]">{b.nom}</p><p className="text-[11px] text-gray-500">{b.statut} • {b.abonnement}</p></div>
        ))}
        {mesBoutiques.length === 0 && <p className="text-[12px] text-gray-500">Aucune boutique. Crée la première.</p>}
      </div>
      <button onClick={() => { localStorage.removeItem("wenze_session"); window.location.href = "/connexion"; }} className="w-full bg-black text-white py-3 rounded-full font-black text-[12px] mt-4">🔒 Déconnexion</button>
    </div>
  );
}
