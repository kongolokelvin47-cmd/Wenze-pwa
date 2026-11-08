"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lireSession } from "@/lib/comptes";
import { roleDe, aDroit, DROITS } from "@/lib/admin";
import { statsInvitations, topInviteurs, mesFilleules, lienInvitation } from "@/lib/invitations";

export const dynamic = "force-dynamic";

function lire(cle: string): any[] {
  try { const v = JSON.parse(localStorage.getItem(cle) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function cleanWa(n: any) { return (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, ""); }

export default function AdminPage() {
  const router = useRouter();
  const [compte, setCompte] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [stats, setStats] = useState<any>({});
  const [top, setTop] = useState<any[]>([]);
  const [mesFilleulesList, setMesFilleulesList] = useState<any[]>([]);
  const [pret, setPret] = useState(false);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    (async () => {
      const s = lireSession();
      if (!s) { router.replace("/connexion?next=%2Fadmin"); return; }
      const r = roleDe(s) || "client";
      setCompte(s);
      setRole(r);

      // Stats globales - pour DG et Superviseur
      const users = lire("wenze_all_users");
      const annonces = lire("wenze_annonces_list");
      const paies = lire("wenze_paiements");
      const susp = lire("wenze_suspensions");
      const statsInv = await statsInvitations();
      const topList = await topInviteurs(5);

      // Mes filleules - pour Ambassadeur / Boutique / Client
      const wa = s.ownerWhatsapp || s.whatsapp || "";
      const miennes = await mesFilleules(wa);

      // Commissions - pour Ambassadeur
      const comms = lire("wenze_commissions").filter((c: any) => cleanWa(c.ambassadeur_wa) === cleanWa(wa));
      const bonus = lire("wenze_bonus").filter((b: any) => cleanWa(b.wa) === cleanWa(wa));

      // Total argent - DG SEUL
      const totalArgent = paies.reduce((acc: number, p: any) => acc + Number(p.montant || p.montantUSD || 0), 0);

      setStats({
        users: users.length,
        annonces: annonces.length,
        paiements: paies.length,
        totalArgent,
        suspensionsEnAttente: susp.filter((x: any) => x.statut === "en-attente-validation-dg").length,
        whatsappOnly: users.filter((u: any) => u.methode === "whatsapp").length,
        avecGmail: users.filter((u: any) => u.methode === "google" || u.methode === "email").length,
        vendeurs: users.filter((u: any) => u.estVendeur).length,
        ...statsInv,
        mesCommissions: comms,
        totalCommissions: comms.length,
        mesBonus: bonus,
      });
      setTop(topList);
      setMesFilleulesList(miennes);
      setPret(true);
    })();
  }, [router]);

  if (!pret) return <div className="max-w-[430px] mx-auto min-h-screen bg-black text-white p-6 text-[12px] font-bold">Vérification rôle...</div>;

  const monCode = compte?.inviteCode || compte?.codeAmbassadeur || "WENZE-XXXX";
  const monLien = lienInvitation(monCode);

  const copierLien = async () => {
    try { await navigator.clipboard.writeText(monLien); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch {}
  };

  // ============ VUE AMBASSADEUR / BOUTIQUE / CLIENT ============
  if (role === "ambassadeur" || role === "boutique" || role === "client") {
    const estAmb = role === "ambassadeur";
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
        <header className="p-4 bg-black text-white flex justify-between items-center">
          <div><h1 className="font-black text-[15px]">{estAmb ? "🎁 MON ESPACE AMBASSADEUR" : role === "boutique" ? "🏬 MON ESPACE BOUTIQUE" : "👤 MON ESPACE CLIENT"}</h1><p className="text-[10px] text-white/60">{compte?.nomEtablissement || compte?.nom}</p></div>
          <Link href="/" className="bg-white text-black px-3 py-1.5 rounded-full font-black text-[10px]">Site</Link>
        </header>

        <div className="p-4 space-y-3">
          {/* MON CODE */}
          <div className="bg-white border-2 border-black rounded-2xl p-4">
            <p className="font-black text-[13px]">🎁 Ton code d'invitation</p>
            <p className="font-black text-[16px] mt-1">{monCode}</p>
            <p className="text-[10px] text-gray-500 truncate">{monLien}</p>
            <p className="text-[11px] mt-2">{estAmb ? "Chaque boutique qui paie avec ton code = commission pour toi." : role === "boutique" ? "Chaque boutique / client invité = +7 jours de visibilité." : "Chaque ami invité = Badge Client Fidèle."}</p>
            <button onClick={copierLien} className="w-full mt-3 bg-black text-white py-3 rounded-full font-black text-[11px]">{copie ? "✅ Copié !" : "📋 Copier mon lien"}</button>
            <Link href="/inviter" className="block text-center mt-2 bg-[#FFF2CC] border-2 border-black py-3 rounded-full font-black text-[11px]">➕ Inviter une boutique / un client</Link>
          </div>

          {/* MES CHIFFRES */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white border rounded-2xl py-3"><p className="font-black text-[20px]">{mesFilleulesList.length}</p><p className="text-[9px] text-gray-500">Filleules</p></div>
            <div className="bg-white border rounded-2xl py-3"><p className="font-black text-[20px]">{mesFilleulesList.filter((x: any) => (x.invite_type || x.type) === "boutique").length}</p><p className="text-[9px] text-gray-500">Boutiques</p></div>
            <div className="bg-white border rounded-2xl py-3"><p className="font-black text-[20px]">{mesFilleulesList.filter((x: any) => (x.invite_type || x.type) === "client").length}</p><p className="text-[9px] text-gray-500">Clients</p></div>
          </div>

          {estAmb && (
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4">
              <p className="font-black text-[13px]">💰 Mes commissions</p>
              <p className="text-[11px] mt-1">{stats.totalCommissions || 0} commission(s) en attente de validation DG</p>
              <p className="text-[10px] text-gray-500 mt-1">Le DG valide, puis tu peux demander un retrait.</p>
              <Link href="/admin/commissions" className="inline-block mt-2 bg-black text-white px-4 py-2 rounded-full font-black text-[10px]">Voir mes commissions →</Link>
            </div>
          )}
          {role === "boutique" && stats.mesBonus?.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4"><p className="font-black text-[13px]">🎁 Mes bonus</p><p className="text-[11px] mt-1">{stats.mesBonus.length} bonus gagné(s) : +7 jours de visibilité</p></div>
          )}

          {/* MES FILLEULES */}
          <div className="bg-white border rounded-2xl overflow-hidden">
            <p className="p-4 font-black text-[13px] border-b">Mes filleules ({mesFilleulesList.length})</p>
            {mesFilleulesList.length === 0 ? (
              <div className="p-6 text-center"><p className="text-3xl">🎁</p><p className="text-[11px] font-bold mt-2">Pas encore de filleule</p><p className="text-[10px] text-gray-500">Partage ton lien pour commencer.</p></div>
            ) : (
              <div className="divide-y">
                {mesFilleulesList.map((f: any) => (
                  <div key={f.id || f.code} className="p-3 flex justify-between items-center">
                    <div><p className="font-bold text-[12px]">{f.invite_nom}</p><p className="text-[10px] text-gray-500">{(f.invite_type || f.type) === "boutique" ? "🏬 Boutique" : "👤 Client"} • 0{cleanWa(f.invite_wa).slice(-9)}</p></div>
                    <span className={`text-[9px] px-2 py-1 rounded-full font-black ${f.statut === "a_paye" ? "bg-green-100 text-green-700" : f.statut === "inscrit" || f.statut === "accepte" ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>{f.statut === "a_paye" ? "✅ A payé" : f.statut === "inscrit" || f.statut === "accepte" ? "📝 Inscrit" : "⏳ En attente"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ VUE DG / SUPERVISEUR ============
  const isDG = role === "dg";
  const CARTE = "bg-white text-black rounded-2xl p-4";
  const BIG = "font-black text-[24px]";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-black text-white pb-24">
      <header className="p-4 flex items-center justify-between border-b border-white/20">
        <div><h1 className="font-black text-[16px]">{isDG ? "👑 ADMIN - DG" : "🛡️ ADMIN - SUPERVISEUR"}</h1><p className="text-[10px] text-white/60">{compte?.nomEtablissement || compte?.nom} • Partie privée</p></div>
        <Link href="/" className="bg-white text-black px-3 py-1.5 rounded-full font-black text-[10px]">Voir site</Link>
      </header>

      <div className="p-4 space-y-3">
        {/* CHIFFRES */}
        <div className="grid grid-cols-2 gap-3">
          <div className={CARTE}><p className={BIG}>{stats.users}</p><p className="text-[11px] text-gray-500">Utilisateurs</p><p className="text-[9px] mt-1">✅ Gmail: {stats.avecGmail} • 📱 WhatsApp seul: {stats.whatsappOnly}</p></div>
          <div className={CARTE}><p className={BIG}>{stats.annonces}</p><p className="text-[11px] text-gray-500">Annonces</p><p className="text-[9px] mt-1">Vendeurs: {stats.vendeurs}</p></div>
          <div className={CARTE}><p className={BIG}>{stats.total}</p><p className="text-[11px] text-gray-500">Invitations totales</p><p className="text-[9px] mt-1">🏬 Par Boutiques: {stats.parBoutique} • 👤 Par Clients: {stats.parClient} • 🎁 Par Ambass.: {stats.parAmbassadeur}</p></div>
          <div className={CARTE}><p className={BIG}>{stats.boutiquesInvitees}</p><p className="text-[11px] text-gray-500">Boutiques invitées</p><p className="text-[9px] mt-1">Clients invités: {stats.clientsInvites} • Ont payé: {stats.ontPaye}</p></div>
        </div>

        {/* ARGENT - DG SEUL */}
        {isDG && (
          <div className="bg-green-400 text-black rounded-2xl p-4">
            <p className="font-black text-[13px]">💰 Total encaissé (DG seul)</p>
            <p className="font-black text-[28px]">{stats.totalArgent}$</p>
            <p className="text-[10px]">{stats.paiements} paiements • Taux conversion invitations: {stats.tauxConversion}%</p>
            <Link href="/admin/paiements" className="inline-block mt-2 bg-black text-white px-4 py-2 rounded-full font-black text-[10px]">Voir paiements →</Link>
          </div>
        )}
        {!isDG && (
          <div className="bg-white/10 rounded-2xl p-3 text-center text-[10px]">Tu es Superviseur : tu ne vois pas l'argent total. Tu vois le terrain.</div>
        )}

        {/* SUSPENSIONS EN ATTENTE - DG */}
        {isDG && stats.suspensionsEnAttente > 0 && (
          <Link href="/admin/utilisateurs" className="block bg-red-500 text-white p-4 rounded-2xl font-black text-[12px]">🚨 {stats.suspensionsEnAttente} suspension(s) en attente de ta validation →</Link>
        )}

        {/* TOP INVITEURS - DG VOIT QUI EST LE MOTEUR */}
        <div className="bg-white text-black rounded-2xl overflow-hidden">
          <p className="p-4 font-black text-[13px] border-b">🏆 Top Inviteurs - Tout le monde (Boutique / Client / Ambassadeur)</p>
          {top.length === 0 ? <p className="p-4 text-[11px] text-gray-500">Aucune invitation pour le moment.</p> : (
            <div className="divide-y">
              {top.map((t: any, i: number) => (
                <div key={t.wa} className="p-3 flex justify-between items-center">
                  <div className="flex gap-2 items-center"><span className="font-black">{i + 1}.</span><div><p className="font-bold text-[12px]">{t.nom}</p><p className="text-[10px] text-gray-500">{t.type === "boutique" ? "🏬 Boutique" : t.type === "client" ? "👤 Client" : t.type === "ambassadeur" ? "🎁 Ambassadeur" : t.type} • 0{cleanWa(t.wa).slice(-9)}</p></div></div>
                  <div className="text-right"><p className="font-black text-[13px]">{t.total} inv.</p><p className="text-[9px] text-gray-500">{t.boutiques} Bout. • {t.clients} Cli. • {t.payes} Payés</p></div>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/invitations" className="block p-3 text-center bg-black text-white font-black text-[11px]">Voir tout l'arbre →</Link>
        </div>

        {/* MENU */}
        <div className="space-y-2">
          <Link href="/admin/utilisateurs" className="block bg-white text-black p-4 rounded-2xl font-black text-[13px] flex justify-between">👥 Utilisateurs - Suspendre / Supprimer <span>→</span></Link>
          <Link href="/admin/annonces" className="block bg-white text-black p-4 rounded-2xl font-black text-[13px] flex justify-between">📸 Annonces - Modérer <span>→</span></Link>
          <Link href="/admin/paiements" className="block bg-white text-black p-4 rounded-2xl font-black text-[13px] flex justify-between">💰 Paiements - Valider <span>→</span></Link>
          <Link href="/admin/invitations" className="block bg-white text-black p-4 rounded-2xl font-black text-[13px] flex justify-between">🎁 Invitations - Arbre complet <span>→</span></Link>
          <Link href="/admin/ambassadeurs" className="block bg-white text-black p-4 rounded-2xl font-black text-[13px] flex justify-between">🎁 Ambassadeurs <span>→</span></Link>
          {isDG && <Link href="/admin/superviseurs" className="block bg-white text-black p-4 rounded-2xl font-black text-[13px] flex justify-between">🛡️ Superviseurs - Créer (DG seul) <span>→</span></Link>}
          {isDG && <Link href="/admin/parametres" className="block bg-[#FFFBF0] text-black p-4 rounded-2xl font-black text-[13px] flex justify-between border-2 border-white">⚙️ Paramètres - Taux / Prix (DG seul) <span>→</span></Link>}
          {isDG && <Link href="/admin/support" className="block bg-white text-black p-4 rounded-2xl font-black text-[13px] flex justify-between">🆘 Support - Problèmes à résoudre <span>→</span></Link>}
        </div>

        <p className="text-center text-[10px] text-white/50">DG voit tout. Superviseur voit terrain. Ambassadeur / Boutique / Client voient que leurs filleules.</p>
      </div>
    </div>
  );
        }
