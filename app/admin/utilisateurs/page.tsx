"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lireSession } from "@/lib/comptes";
import { roleDe, proposerSuspension, validerSuspensionDG, suspensionImmediateDG, lireSuspensions, compterSuspensions, journaliser } from "@/lib/admin";

export const dynamic = "force-dynamic";
function cleanWa(n: any) { return (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, ""); }
function lire(cle: string): any[] { try { const v = JSON.parse(localStorage.getItem(cle) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }

export default function UtilisateursAdmin() {
  const router = useRouter();
  const [compte, setCompte] = useState<any>(null);
  const [role, setRole] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [filtre, setFiltre] = useState("tous"); // tous / vendeurs / clients / ambassadeurs / suspendus
  const [recherche, setRecherche] = useState("");
  const [suspensions, setSuspensions] = useState<any[]>([]);
  const [modal, setModal] = useState<any>(null); // { user, mode: proposer | immediat }
  const [motif, setMotif] = useState("");
  const [pret, setPret] = useState(false);

  const charger = () => {
    setUsers(lire("wenze_all_users"));
    setSuspensions(lireSuspensions());
  };

  useEffect(() => {
    const s = lireSession();
    if (!s) { router.replace("/connexion?next=%2Fadmin%2Futilisateurs"); return; }
    const r = roleDe(s) || "";
    if (r !== "dg" && r !== "superviseur") { router.replace("/admin"); return; }
    setCompte(s); setRole(r); charger(); setPret(true);
  }, [router]);

  if (!pret) return <div className="max-w-[430px] mx-auto min-h-screen bg-black text-white p-6 text-[12px] font-bold">Chargement utilisateurs...</div>;
  const isDG = role === "dg";

  const filtres = users.filter((u: any) => {
    const wa = cleanWa(u.ownerWhatsapp || u.whatsapp);
    const nbSusp = compterSuspensions(wa);
    const statut = u.statutCompte || (nbSusp >= 3 ? "supprime" : nbSusp > 0 ? "suspendu" : "actif");
    if (filtre === "vendeurs" && !u.estVendeur) return false;
    if (filtre === "clients" && u.estVendeur) return false;
    if (filtre === "ambassadeurs" && !u.estAmbassadeur) return false;
    if (filtre === "suspendus" && statut === "actif") return false;
    if (filtre === "supprimes" && statut !== "supprime") return false;
    if (recherche) {
      const txt = `${u.nomEtablissement || ""} ${u.nom || ""} ${u.ownerWhatsapp || u.whatsapp || ""}`.toLowerCase();
      if (!txt.includes(recherche.toLowerCase())) return false;
    }
    return true;
  });

  // Proposer suspension - Superviseur ou DG
  const faireProposition = () => {
    if (!modal?.user || !motif.trim()) return;
    const u = modal.user;
    const wa = u.ownerWhatsapp || u.whatsapp;
    if (modal.mode === "immediat") {
      if (!isDG) return;
      suspensionImmediateDG({ wa, nom: u.nomEtablissement || u.nom, motif, dgWa: compte.ownerWhatsapp || compte.whatsapp });
      journaliser("SUSPENSION IMMEDIATE", compte.ownerWhatsapp || compte.whatsapp, compte.nom || "DG", wa, motif);
      alert("🚨 Suspension immédiate appliquée. Compte supprimé.");
    } else {
      const res = proposerSuspension({ wa, nom: u.nomEtablissement || u.nom, motif, proposePar: compte.ownerWhatsapp || compte.whatsapp });
      journaliser("PROPOSITION SUSPENSION", compte.ownerWhatsapp || compte.whatsapp, compte.nom || role, wa, `N°${res.numero} - ${motif}`);
      alert(isDG ? `Suspension N°${res.numero} proposée. Tu dois encore la valider dans l'onglet En attente.` : `Suspension N°${res.numero} proposée. En attente de validation du DG.`);
    }
    setModal(null); setMotif(""); charger();
  };

  const valider = (id: string) => {
    if (!isDG) return;
    validerSuspensionDG(id, compte.ownerWhatsapp || compte.whatsapp);
    journaliser("VALIDATION SUSPENSION DG", compte.ownerWhatsapp || compte.whatsapp, compte.nom || "DG", id, "Validée");
    charger();
  };

  const enAttente = suspensions.filter((s: any) => s.statut === "en-attente-validation-dg");

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="p-4 bg-black text-white flex justify-between items-center sticky top-0 z-10">
        <div><h1 className="font-black text-[15px]">👥 Utilisateurs</h1><p className="text-[10px] text-white/60">{isDG ? "DG - Tu valides tout" : "Superviseur - Tu proposes, DG valide"}</p></div>
        <Link href="/admin" className="bg-white text-black px-3 py-1.5 rounded-full font-black text-[10px]">← Admin</Link>
      </header>

      <div className="p-4 space-y-3">
        {/* EN ATTENTE DG */}
        {isDG && enAttente.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
            <p className="font-black text-[13px] text-red-700">🚨 {enAttente.length} suspension(s) en attente de ta validation</p>
            <div className="mt-3 space-y-2">
              {enAttente.map((s: any) => (
                <div key={s.id} className="bg-white rounded-xl p-3 flex justify-between items-center gap-2">
                  <div><p className="font-bold text-[12px]">{s.nom}</p><p className="text-[10px] text-gray-500">Suspension N°{s.numero} • {s.duree} • Motif: {s.motif}</p><p className="text-[9px] text-gray-400">Proposée par {s.proposeParRole} • 0{cleanWa(s.wa).slice(-9)}</p></div>
                  <div className="flex gap-1 shrink-0"><button onClick={() => valider(s.id)} className="bg-red-600 text-white px-3 py-2 rounded-full font-black text-[10px]">Valider</button></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!isDG && enAttente.length > 0 && (
          <div className="bg-yellow-50 border rounded-2xl p-3 text-[11px] font-bold">⏳ {enAttente.length} proposition(s) en attente du DG. Tu ne peux pas valider toi-même.</div>
        )}

        {/* FILTRES */}
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔍 Rechercher nom / WhatsApp..." className="w-full bg-white border-2 border-black rounded-full px-4 py-3 text-[12px] font-bold outline-none" />
        <div className="flex gap-1.5 flex-wrap">
          {["tous", "vendeurs", "clients", "ambassadeurs", "suspendus", "supprimes"].map((f) => (
            <button key={f} onClick={() => setFiltre(f)} className={`px-3 py-2 rounded-full font-black text-[10px] ${filtre === f ? "bg-black text-white" : "bg-white border"}`}>{f === "tous" ? "Tous" : f === "vendeurs" ? "🏬 Vendeurs" : f === "clients" ? "👤 Clients" : f === "ambassadeurs" ? "🎁 Ambassadeurs" : f === "suspendus" ? "⏸️ Suspendus" : "🗑️ Supprimés"}</button>
          ))}
        </div>

        <p className="text-[11px] font-bold">{filtres.length} utilisateur(s)</p>

        {/* LISTE */}
        <div className="space-y-2">
          {filtres.length === 0 && <div className="bg-white rounded-2xl p-6 text-center text-[11px] font-bold text-gray-500">Aucun utilisateur</div>}
          {filtres.map((u: any, idx: number) => {
            const wa = u.ownerWhatsapp || u.whatsapp || "";
            const nbSusp = compterSuspensions(wa);
            const statut = u.statutCompte || (nbSusp >= 3 ? "supprime" : nbSusp > 0 ? "suspendu" : "actif");
            const estSupprime = statut === "supprime";
            return (
              <div key={idx} className={`bg-white border rounded-2xl p-4 ${estSupprime ? "opacity-60" : ""}`}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-black text-[13px]">{u.nomEtablissement || u.nom || "Sans nom"} {u.estAmbassadeur && "🎁"}</p>
                    <p className="text-[10px] text-gray-500">0{cleanWa(wa).slice(-9)} • {u.estVendeur ? "🏬 Boutique" : "👤 Client"} • {u.methode === "google" || u.methode === "email" ? "📧 Gmail" : "📱 WhatsApp seul"}</p>
                    <p className="text-[10px] mt-1">Code: <span className="font-black">{u.inviteCode || u.codeAmbassadeur || "-"}</span></p>
                  </div>
                  <span className={`text-[9px] px-2 py-1 rounded-full font-black shrink-0 ${estSupprime ? "bg-red-100 text-red-700" : statut === "suspendu" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{estSupprime ? "🗑️ Supprimé" : statut === "suspendu" ? "⏸️ Suspendu" : "✅ Actif"}</span>
                </div>

                {/* BARRE 3 SUSPENSIONS */}
                <div className="mt-3">
                  <p className="text-[10px] font-bold flex justify-between"><span>Suspensions : {Math.min(nbSusp, 3)} / 3</span><span>{nbSusp === 0 ? "Aucun avertissement" : nbSusp === 1 ? "24h" : nbSusp === 2 ? "7 jours" : "Suppression"}</span></p>
                  <div className="flex gap-1 mt-1">{[1, 2, 3].map((n) => (<div key={n} className={`h-2 flex-1 rounded-full ${nbSusp >= n ? (n === 3 ? "bg-red-600" : "bg-yellow-500") : "bg-gray-200"}`} />))}</div>
                </div>

                {/* BOUTONS */}
                {!estSupprime && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setModal({ user: u, mode: "proposer" })} className="flex-1 bg-yellow-400 border-2 border-black py-2.5 rounded-full font-black text-[10px]">⏸️ {isDG ? "Proposer suspension" : "Proposer suspension au DG"}</button>
                    {isDG && <button onClick={() => setModal({ user: u, mode: "immediat" })} className="flex-1 bg-red-600 text-white py-2.5 rounded-full font-black text-[10px]">🚨 Immédiat DG</button>}
                  </div>
                )}
                {isDG && estSupprime && <p className="text-[10px] font-bold text-red-600 mt-2">Supprimé définitivement. WhatsApp blacklisté.</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL MOTIF */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="w-full max-w-[430px] bg-white rounded-t-3xl p-5">
            <p className="font-black text-[14px]">{modal.mode === "immediat" ? "🚨 Suspension immédiate DG" : "⏸️ Proposer une suspension"}</p>
            <p className="text-[11px] text-gray-500 mt-1">{modal.user.nomEtablissement || modal.user.nom} • {modal.mode === "immediat" ? "Suppression définitive, sans attendre les 3." : `Ce sera la suspension N°${compterSuspensions(modal.user.ownerWhatsapp || modal.user.whatsapp) + 1} / 3`}</p>
            <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} placeholder="Motif : arnaque, faux prix, insultes, annonce interdite..." className="w-full mt-3 border-2 border-black rounded-2xl p-3 text-[12px] outline-none" />
            <div className="flex gap-2 mt-3"><button onClick={() => { setModal(null); setMotif(""); }} className="flex-1 py-3 rounded-full font-black text-[11px] bg-gray-100">Annuler</button><button onClick={faireProposition} disabled={!motif.trim()} className="flex-1 py-3 rounded-full font-black text-[11px] bg-black text-white disabled:opacity-40">{modal.mode === "immediat" ? "🚨 Supprimer maintenant" : "Envoyer au DG"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
                     }
