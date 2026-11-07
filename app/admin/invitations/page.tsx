"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lireSession } from "@/lib/comptes";
import { roleDe } from "@/lib/admin";
import { listInvitations, statsInvitations, topInviteurs } from "@/lib/invitations";

export const dynamic = "force-dynamic";
function cleanWa(n: any) { return (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, ""); }

export default function InvitationsAdmin() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [all, setAll] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [top, setTop] = useState<any[]>([]);
  const [filtreParrain, setFiltreParrain] = useState("tous"); // tous / ambassadeur / boutique / client / superviseur
  const [filtreInvite, setFiltreInvite] = useState("tous"); // tous / boutique / client
  const [filtreStatut, setFiltreStatut] = useState("tous"); // tous / en_attente / inscrit / a_paye
  const [recherche, setRecherche] = useState("");
  const [arbreOuvert, setArbreOuvert] = useState<string | null>(null);
  const [pret, setPret] = useState(false);
  const [codesBloques, setCodesBloques] = useState<string[]>([]);

  const charger = async () => {
    const list = await listInvitations();
    setAll(list);
    setStats(await statsInvitations());
    setTop(await topInviteurs(10));
    try { setCodesBloques(JSON.parse(localStorage.getItem("wenze_codes_bloques") || "[]")); } catch { setCodesBloques([]); }
  };

  useEffect(() => {
    (async () => {
      const s = lireSession();
      if (!s) { router.replace("/connexion?next=%2Fadmin%2Finvitations"); return; }
      const r = roleDe(s) || "";
      if (r !== "dg" && r !== "superviseur") { router.replace("/admin"); return; }
      setRole(r); await charger(); setPret(true);
    })();
  }, [router]);

  if (!pret) return <div className="max-w-[430px] mx-auto min-h-screen bg-black text-white p-6 text-[12px] font-bold">Chargement arbre...</div>;
  const isDG = role === "dg";

  // Bloquer un code - DG seul
  const bloquerCode = (code: string) => {
    if (!isDG) return;
    const next = codesBloques.includes(code) ? codesBloques.filter((c) => c !== code) : [...codesBloques, code];
    setCodesBloques(next);
    localStorage.setItem("wenze_codes_bloques", JSON.stringify(next));
  };

  const filtres = all.filter((x: any) => {
    if (filtreParrain !== "tous" && x.parrain_type !== filtreParrain) return false;
    if (filtreInvite !== "tous" && (x.invite_type || x.type) !== filtreInvite) return false;
    if (filtreStatut !== "tous" && x.statut !== filtreStatut) return false;
    if (recherche) {
      const txt = `${x.parrain_nom || ""} ${x.invite_nom || ""} ${x.code || ""} ${x.parrain_wa || ""} ${x.invite_wa || ""}`.toLowerCase();
      if (!txt.includes(recherche.toLowerCase())) return false;
    }
    return true;
  });

  // Construire l'arbre : Parrain -> Ses filleules -> Leurs filleules
  const filleulesDe = (wa: string) => all.filter((x: any) => cleanWa(x.parrain_wa) === cleanWa(wa));
  const racines = all.filter((x: any) => x.parrain_type === "ambassadeur" || x.parrain_type === "superviseur" || x.parrain_type === "dg");

  const labelType = (t: string) => t === "boutique" ? "🏬 Boutique" : t === "client" ? "👤 Client" : t === "ambassadeur" ? "🎁 Ambassadeur" : t === "superviseur" ? "🛡️ Superviseur" : "👑 DG";
  const labelStatut = (s: string) => s === "a_paye" ? "✅ A payé" : s === "inscrit" || s === "accepte" ? "📝 Inscrit" : s === "clique" ? "👀 A cliqué" : s === "boutique_ouverte" ? "🏬 Boutique ouverte" : "⏳ En attente";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="p-4 bg-black text-white flex justify-between items-center sticky top-0 z-10">
        <div><h1 className="font-black text-[15px]">🎁 Invitations - Arbre complet</h1><p className="text-[10px] text-white/60">{isDG ? "DG - Tu vois tout" : "Superviseur - Tu vois le terrain"}</p></div>
        <Link href="/admin" className="bg-white text-black px-3 py-1.5 rounded-full font-black text-[10px]">← Admin</Link>
      </header>

      <div className="p-4 space-y-3">
        {/* STATS */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white border rounded-2xl p-3 text-center"><p className="font-black text-[22px]">{stats.total || 0}</p><p className="text-[9px] text-gray-500">Total invitations</p></div>
          <div className="bg-white border rounded-2xl p-3 text-center"><p className="font-black text-[22px]">{stats.tauxConversion || 0}%</p><p className="text-[9px] text-gray-500">Taux conversion</p></div>
          <div className="bg-white border rounded-2xl p-3 text-center"><p className="font-black text-[16px]">🏬 {stats.parBoutique || 0} • 👤 {stats.parClient || 0}</p><p className="text-[9px] text-gray-500">Par Boutique / Par Client</p></div>
          <div className="bg-white border rounded-2xl p-3 text-center"><p className="font-black text-[16px]">🎁 {stats.parAmbassadeur || 0} • 🛡️ {stats.parSuperviseur || 0}</p><p className="text-[9px] text-gray-500">Par Ambassadeur / Superviseur</p></div>
        </div>
        <div className="bg-black text-white rounded-2xl p-3 flex justify-between text-[11px] font-bold"><span>🏬 Boutiques invitées : {stats.boutiquesInvitees || 0}</span><span>👤 Clients : {stats.clientsInvites || 0}</span><span>💰 Payés : {stats.ontPaye || 0}</span></div>

        {/* TOP INVITEURS */}
        <div className="bg-white border rounded-2xl overflow-hidden">
          <p className="p-3 font-black text-[12px] border-b">🏆 Top Inviteurs - Qui est le moteur de Wenze ?</p>
          {top.length === 0 ? <p className="p-3 text-[11px] text-gray-500">Aucun inviteur.</p> : top.map((t: any, i: number) => (
            <div key={t.wa} className="p-3 flex justify-between border-b last:border-0">
              <div><p className="font-bold text-[12px]">{i + 1}. {t.nom}</p><p className="text-[10px] text-gray-500">{labelType(t.type)} • 0{cleanWa(t.wa).slice(-9)}</p></div>
              <div className="text-right"><p className="font-black text-[12px]">{t.total} inv.</p><p className="text-[9px] text-gray-500">{t.boutiques} Bout. • {t.clients} Cli. • {t.payes} Payés</p></div>
            </div>
          ))}
        </div>

        {/* FILTRES DG */}
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔍 Nom, WhatsApp, code..." className="w-full bg-white border-2 border-black rounded-full px-4 py-3 text-[12px] font-bold outline-none" />
        <div>
          <p className="text-[10px] font-black mb-1">Qui a invité ?</p>
          <div className="flex gap-1.5 flex-wrap">{["tous", "ambassadeur", "boutique", "client", "superviseur"].map((f) => (<button key={f} onClick={() => setFiltreParrain(f)} className={`px-3 py-2 rounded-full font-black text-[10px] ${filtreParrain === f ? "bg-black text-white" : "bg-white border"}`}>{f === "tous" ? "Tous" : labelType(f)}</button>))}</div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1"><p className="text-[10px] font-black mb-1">Qui a été invité ?</p><div className="flex gap-1.5">{["tous", "boutique", "client"].map((f) => (<button key={f} onClick={() => setFiltreInvite(f)} className={`px-3 py-2 rounded-full font-black text-[10px] ${filtreInvite === f ? "bg-black text-white" : "bg-white border"}`}>{f === "tous" ? "Tous" : f === "boutique" ? "🏬 Boutique" : "👤 Client"}</button>))}</div></div>
          <div className="flex-1"><p className="text-[10px] font-black mb-1">Statut</p><div className="flex gap-1.5 flex-wrap">{["tous", "en_attente", "inscrit", "a_paye"].map((f) => (<button key={f} onClick={() => setFiltreStatut(f)} className={`px-3 py-2 rounded-full font-black text-[10px] ${filtreStatut === f ? "bg-black text-white" : "bg-white border"}`}>{f === "tous" ? "Tous" : f === "en_attente" ? "⏳ Attente" : f === "inscrit" ? "📝 Inscrit" : "✅ Payé"}</button>))}</div></div>
        </div>

        {/* LISTE PLATE - Toutes les invitations */}
        <p className="font-black text-[12px] mt-2">{filtres.length} invitation(s) filtrée(s)</p>
        <div className="space-y-2">
          {filtres.length === 0 && <div className="bg-white rounded-2xl p-6 text-center text-[11px] font-bold text-gray-500">Aucune invitation avec ces filtres.</div>}
          {filtres.map((x: any, idx: number) => {
            const bloque = codesBloques.includes(x.code);
            return (
              <div key={idx} className="bg-white border rounded-2xl p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500">{labelType(x.parrain_type)} <span className="font-bold text-black">{x.parrain_nom}</span> → {labelType(x.invite_type || x.type)} <span className="font-bold text-black">{x.invite_nom}</span></p>
                    <p className="text-[10px] mt-1">Code: <span className="font-black">{x.code}</span> {bloque && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-black">🚫 Bloqué</span>}</p>
                    <p className="text-[10px] text-gray-500">Parrain: 0{cleanWa(x.parrain_wa).slice(-9)} • Filleul: 0{cleanWa(x.invite_wa).slice(-9)} • {x.ambassadeur_origine_wa ? `Origine Amb.: 0${cleanWa(x.ambassadeur_origine_wa).slice(-9)}` : ""}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-1 rounded-full font-black shrink-0 ${x.statut === "a_paye" ? "bg-green-100 text-green-700" : x.statut === "inscrit" || x.statut === "accepte" ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>{labelStatut(x.statut)}</span>
                </div>
                {isDG && <button onClick={() => bloquerCode(x.code)} className="mt-2 w-full py-2 rounded-full font-black text-[10px] border-2 border-black">{bloque ? "✅ Débloquer ce code" : "🚫 Bloquer ce code (DG seul)"}</button>}
              </div>
            );
          })}
        </div>

        {/* ARBRE - Cliquer pour déplier */}
        <p className="font-black text-[13px] mt-4">🌳 Arbre - Qui a créé qui ?</p>
        <div className="space-y-2">
          {racines.length === 0 && <p className="bg-white rounded-2xl p-4 text-[11px] text-gray-500">Pas encore d'arbre. Les invitations par Ambassadeur / Superviseur apparaîtront ici.</p>}
          {racines.map((r: any, idx: number) => {
            const ouvert = arbreOuvert === r.parrain_wa;
            const filleules = filleulesDe(r.parrain_wa);
            return (
              <div key={idx} className="bg-white border rounded-2xl overflow-hidden">
                <button onClick={() => setArbreOuvert(ouvert ? null : r.parrain_wa)} className="w-full p-3 flex justify-between items-center text-left">
                  <div><p className="font-bold text-[12px]">{labelType(r.parrain_type)} {r.parrain_nom}</p><p className="text-[10px] text-gray-500">0{cleanWa(r.parrain_wa).slice(-9)} • {filleules.length} filleule(s) direct(s)</p></div>
                  <span className="font-black">{ouvert ? "▲" : "▼"}</span>
                </button>
                {ouvert && (
                  <div className="px-3 pb-3 space-y-2 border-t pt-3">
                    {filleules.map((f: any, i: number) => {
                      const petitsEnfants = filleulesDe(f.invite_wa);
                      return (
                        <div key={i} className="bg-[#FFFBF0] border rounded-xl p-3">
                          <p className="text-[11px]">└─ {labelType(f.invite_type || f.type)} <span className="font-bold">{f.invite_nom}</span> • {labelStatut(f.statut)}</p>
                          {petitsEnfants.length > 0 && petitsEnfants.map((pe: any, j: number) => (
                            <p key={j} className="text-[11px] ml-4 mt-1">└─ └─ {labelType(pe.invite_type || pe.type)} <span className="font-bold">{pe.invite_nom}</span> • {labelStatut(pe.statut)} <span className="text-gray-400">(invité par {f.invite_nom})</span></p>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
        }
