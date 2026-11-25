"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  TABLES,
  TYPES_PUBLIC,
  estActif,
  estPaye,
  typePaiement,
} from "@/lib/supabase";
import { lireSession } from "@/lib/connexion";

function readPublicUser(): any {
  try {
    if (typeof window === "undefined") return null;
    const sess: any = lireSession();
    if (sess && typeof sess === "object") return sess;
    const raw = localStorage.getItem("wenze_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function calculerPointsCode(
  code: string,
  boutiques: any[],
  clients: any[],
  paiements: any[],
  plafond = 100
) {
  if (!code) {
    return {
      total: 0,
      brut: 0,
      nbBoutiques: 0,
      nbClients: 0,
      nbAbos: 0,
      ptsBoutiques: 0,
      ptsClients: 0,
      ptsAbos: 0,
    };
  }

  const boutInv = boutiques.filter(
    (x: any) =>
      (x.code_invitation === code || x.code_amb === code) &&
      estActif(x.statut)
  );
  const cliInv = clients.filter(
    (x: any) =>
      (x.code_invitation === code || x.code_parrain === code) &&
      estActif(x.statut)
  );
  const aboPayes = paiements.filter((pp: any) => {
    const bb = boutiques.find((x: any) => x.id === pp.boutique_id);
    const tp = typePaiement(pp);
    return (
      (bb?.code_invitation === code || bb?.code_amb === code) &&
      estPaye(pp) &&
      (tp === "PREMIER" || tp === "OCCASIONNELLE")
    );
  });

  const ptsBoutiques = boutInv.length * 5;
  const ptsClients = cliInv.length * 3;
  const ptsAbos = aboPayes.length * 20;
  const brut = ptsBoutiques + ptsClients + ptsAbos;
  const total = Math.min(Number(plafond || 100), brut);

  return {
    total,
    brut,
    nbBoutiques: boutInv.length,
    nbClients: cliInv.length,
    nbAbos: aboPayes.length,
    ptsBoutiques,
    ptsClients,
    ptsAbos,
  };
}

export default function TombolaActivite() {
  const [cfg, setCfg] = useState<any>(null);
  const [moi, setMoi] = useState<any>(null);
  const [temps, setTemps] = useState("");
  const [copie, setCopie] = useState(false);
  const [classement, setClassement] = useState<any[]>([]);

  useEffect(() => {
    const u = readPublicUser();
    if (!u) return;

    const roleInterne = (u.roleAdmin || u.role || "").toLowerCase();
    if (["dg", "superviseur", "ambassadeur"].includes(roleInterne)) return;

    const type = (u.type_public || u.type || u.role || "CLIENT").toUpperCase();
    if (!TYPES_PUBLIC.includes(type as any)) return;

    setMoi(u);
    let cancelled = false;

    const charger = async () => {
      if (!supabase || cancelled) return;
      try {
        const { data: c } = await supabase
          .from(TABLES.tombola)
          .select("*")
          .eq("id", 1)
          .maybeSingle();

        if (cancelled) return;
        if (c) setCfg(c);
        const plafond = Number(c?.plafond || 100);

        const [b, cl, p] = await Promise.all([
          supabase.from(TABLES.boutiques).select("*"),
          supabase.from(TABLES.clients).select("*"),
          supabase.from(TABLES.paiements).select("*"),
        ]);

        if (cancelled) return;
        const boutiques = b.data || [];
        const clients = cl.data || [];
        const paiements = p.data || [];
        const code = u.code_pro || u.code_invitation || u.id;

        const pts = calculerPointsCode(
          code,
          boutiques,
          clients,
          paiements,
          plafond
        );
        setMoi({ ...u, type_public: type, pts });

        const map = new Map<string, { nom: string; code: string }>();
        [...boutiques, ...clients].forEach((x: any) => {
          const t = (x.type_public || x.type || "CLIENT").toUpperCase();
          if (!TYPES_PUBLIC.includes(t as any)) return;
          const cCode = x.code_pro || x.code_invitation || x.id;
          if (cCode && !map.has(cCode)) {
            map.set(cCode, {
              nom: x.nom || x.proprietaire || "Membre WENZE",
              code: cCode,
            });
          }
        });

        const top = [...map.values()]
          .map((pp) => ({
            ...pp,
            total: calculerPointsCode(
              pp.code,
              boutiques,
              clients,
              paiements,
              plafond
            ).total,
          }))
          .filter((x) => x.total > 0)
          .sort((a, b2) => b2.total - a.total)
          .slice(0, 5);

        setClassement(top);

        if (c?.active && u.id) {
          await supabase.from("tombola_participants").upsert(
            {
              id: u.id,
              nom: u.nom || u.proprietaire || "",
              telephone: u.telephone || u.whatsapp || "",
              type_public: type,
              code_invitation: code,
              points: pts.total,
              nb_clients: pts.nbClients,
              nb_boutiques: pts.nbBoutiques,
              nb_abos: pts.nbAbos,
            },
            { onConflict: "id" }
          );
        }
      } catch {}
    };

    charger();
    if (!supabase) return;

    const ch = supabase
      .channel("tombola-public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLES.tombola },
        (pay: any) => {
          if (pay.new) setCfg(pay.new);
          charger();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLES.boutiques },
        charger
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLES.clients },
        charger
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLES.paiements },
        charger
      )
      .subscribe();

    const interval = setInterval(charger, 60000);
    return () => {
      cancelled = true;
      supabase?.removeChannel(ch);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!cfg?.date_fin || !cfg?.active) return;
    const tick = () => {
      const rest = new Date(cfg.date_fin).getTime() - Date.now();
      if (rest <= 0) {
        setTemps("TERMINÉE");
        return false;
      }
      setTemps(
        `${Math.floor(rest / 86400000)}j ${Math.floor(
          (rest % 86400000) / 3600000
        )}h ${Math.floor((rest % 3600000) / 60000)}min`
      );
      return true;
    };
    if (!tick()) return;
    const i = setInterval(() => {
      if (!tick()) clearInterval(i);
    }, 1000);
    return () => clearInterval(i);
  }, [cfg]);

  if (!cfg || !moi) return null;

  if (!cfg.active) {
    if (!cfg.gagnant_nom) return null;
    return (
      <div className="mx-4 mt-3 bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4 text-center">
        <p className="font-black">🏆 Tombola Terminée</p>
        <p className="text-[13px] mt-1">
          Gagnant : <b>{cfg.gagnant_nom}</b> — {cfg.gagnant_points} pts
        </p>
        <p className="text-[11px] text-gray-600">Lot : {cfg.lot}</p>
      </div>
    );
  }

  const plafond = Number(cfg.plafond || 100);
  const monCode = moi.code_pro || moi.code_invitation || moi.id;
  const pct = Math.min(
    100,
    Math.round(((moi.pts?.total || 0) / plafond) * 100)
  );
  const lien = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/creer-boutique?code=${encodeURIComponent(monCode || "")}`;

  const copierLien = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(lien);
      }
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {}
  };

  return (
    <div className="mx-4 mt-3 bg-black text-white rounded-2xl p-4 border-2 border-[#FF6B00]">
      <div className="flex justify-between items-start">
        <p className="font-black">🎟️ TOMBOLA ACTIVÉE</p>
        <span className="bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">
          ● EN COURS
        </span>
      </div>
      <p className="text-[12px] mt-1">
        🏆 Lot : <b>{cfg.lot}</b> • 🎯 Plafond : {plafond} pts • ⏱️ Reste :{" "}
        <b className="text-yellow-300">{temps}</b>
      </p>

      <div className="bg-white/10 rounded-2xl p-3 mt-3">
        <p className="text-[11px] text-white/70">Ton profil = Ta candidature</p>
        <p className="font-black text-[14px] mt-0.5">
          {moi.nom || moi.proprietaire} • {moi.telephone || moi.whatsapp}
        </p>
        <p className="text-[11px] text-white/70">
          {moi.type_public} • Code : {monCode}
        </p>
        <p className="text-[16px] font-black mt-2">
          Tu as :{" "}
          <span className="text-yellow-300">
            {moi.pts?.total || 0} / {plafond} pts
          </span>{" "}
          ({pct}%)
        </p>
        <div className="w-full bg-white/20 h-3 rounded-full mt-1">
          <div
            className="bg-[#FF6B00] h-3 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] mt-2">
          👥 {moi.pts?.nbClients || 0} clients x3 = {moi.pts?.ptsClients || 0}{" "}
          pts • 🏪 {moi.pts?.nbBoutiques || 0} bout. x5 ={" "}
          {moi.pts?.ptsBoutiques || 0} pts • 💰 {moi.pts?.nbAbos || 0} abos x20
          = {moi.pts?.ptsAbos || 0} pts
        </p>
        <p className="text-[10px] text-white/60 mt-1">
          Boutique non validée par le DG = 0 pt. Boutique validée = +5 pts.
          Invité qui paie = +20 pts en plus.
        </p>
      </div>

      <button
        type="button"
        onClick={copierLien}
        className="w-full mt-3 bg-[#FF6B00] text-white py-3.5 rounded-full font-black text-[13px]"
      >
        {copie
          ? "✅ Lien copié !"
          : "📤 INVITER MES AMIS — Gagner des points"}
      </button>
      <p className="text-[10px] text-white/60 text-center mt-1">
        Partage ton lien : chaque ami qui finalise te donne des points
        automatiquement.
      </p>

      {classement.length > 0 && (
        <div className="bg-white/10 rounded-2xl p-3 mt-3">
          <p className="font-black text-[12px]">🏆 Top 5 en direct</p>
          {classement.map((c: any, i: number) => (
            <p key={c.code || i} className="text-[12px] mt-1">
              {i === 0
                ? "🥇"
                : i === 1
                ? "🥈"
                : i === 2
                ? "🥉"
                : `#${i + 1}`}{" "}
              {c.nom} — <b className="text-yellow-300">{c.total} pts</b>{" "}
              {c.code === monCode ? "← C'est toi" : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
          }
    
