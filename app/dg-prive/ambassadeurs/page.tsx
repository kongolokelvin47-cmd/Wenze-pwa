"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lireSession } from "@/lib/comptes";
import { roleDe, genererCodePro, journaliser } from "@/lib/admin";
import { mesFilleules, lienInvitation } from "@/lib/invitations";
export const dynamic = "force-dynamic";
function cleanWa(n: any) { return (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, ""); }
function lire(cle: string): any[] { try { return JSON.parse(localStorage.getItem(cle) || "[]"); } catch { return []; } }

export default function AmbassadeursAdmin() {
  const router = useRouter();
  const [compte, setCompte] = useState<any>(null); const [role, setRole] = useState("");
  const [list, setList] = useState<any[]>([]); const [statsMap, setStatsMap] = useState<any>({});
  const [nom, setNom] = useState(""); const [wa, setWa] = useState(""); const [pret, setPret] = useState(false);
  useEffect(() => {
    (async () => {
      const s = lireSession();
      if (!s) { router.replace("/connexion"); return; }
      const r = roleDe(s) || "";
      if (r !== "dg" && r !== "superviseur") { router.replace("/admin"); return; }
      setCompte(s); setRole(r);
      const all = lire("wenze_all_users").filter((u: any) => u.estAmbassadeur || u.roleAdmin === "ambassadeur");
      setList(all);
      const m: any = {};
      for (const u of all) { const f = await mesFilleules(u.ownerWhatsapp || u.whatsapp || ""); m[cleanWa(u.ownerWhatsapp || u.whatsapp)] = { total: f.length, boutiques: f.filter((x: any) => (x.invite_type || x.type) === "boutique").length, payes: f.filter((x: any) => x.statut === "a_paye").length }; }
      setStatsMap(m); setPret(true);
    })();
  }, [router]);
  if (!pret) return <div className="max-w-[430px] mx-auto min-h-screen bg-black text-white p-6 text-[12px] font-bold">Chargement ambassadeurs...</div>;
  const creer = () => {
    if (!nom.trim() || !wa.trim()) return alert("Nom + WhatsApp obligatoires");
    const code = genererCodePro("ambassadeur");
    const users = lire("wenze_all_users");
    const existe = users.find((u: any) => cleanWa(u.ownerWhatsapp || u.whatsapp) === cleanWa(wa));
    if (existe) { existe.estAmbassadeur = true; existe.roleAdmin = "ambassadeur"; existe.codeAmbassadeur = code; existe.inviteCode = code; }
    else { users.push({ nomEtablissement: nom, nom, ownerWhatsapp: cleanWa(wa), whatsapp: cleanWa(wa), estAmbassadeur: true, roleAdmin: "ambassadeur", codeAmbassadeur: code, inviteCode: code, estVendeur: false, methode: "whatsapp", statutCompte: "actif", dateInscription: new Date().toISOString() }); }
    localStorage.setItem("wenze_all_users", JSON.stringify(users));
    journaliser("CREATION AMBASSADEUR", compte.ownerWhatsapp, compte.nom || role, wa, `Code ${code} - ${nom}`);
    alert(`✅ Ambassadeur créé\nCode : ${code}\nLien : ${lienInvitation(code)}`);
    setNom(""); setWa(""); setList(lire("wenze_all_users").filter((u: any) => u.estAmbassadeur || u.roleAdmin === "ambassadeur"));
  };
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="p-4 bg-black text-white flex justify-between items-center"><div><h1 className="font-black text-[15px]">🎁 Ambassadeurs</h1><p className="text-[10px] text-white/60">{role === "dg" ? "DG - Tu crées et tu contrôles" : "Superviseur - Tu crées, DG valide les commissions"}</p></div><Link href="/admin" className="bg-white text-black px-3 py-1.5 rounded-full font-black text-[10px]">← Admin</Link></header>
      <div className="p-4 space-y-3">
        <div className="bg-white border-2 border-black rounded-2xl p-4 space-y-2">
          <p className="font-black text-[13px]">➕ Créer un Ambassadeur</p>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className="w-full border-2 border-black rounded-full px-4 py-3 text-[12px] font-bold outline-none" />
          <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="WhatsApp : 2438..." className="w-full border-2 border-black rounded-full px-4 py-3 text-[12px] font-bold outline-none" />
          <button onClick={creer} className="w-full bg-black text-white py-3 rounded-full font-black text-[11px]">Créer + Générer Code WENZE-AMB</button>
        </div>
        <p className="font-black text-[12px]">{list.length} ambassadeur(s)</p>
        {list.map((u: any, i: number) => {
          const waC = cleanWa(u.ownerWhatsapp || u.whatsapp);
          const st = statsMap[waC] || { total: 0, boutiques: 0, payes: 0 };
          const niveau = st.total >= 31 ? "🥇 Or 20%" : st.total >= 11 ? "🥈 Argent 15%" : "🥉 Bronze 10%";
          return (
            <div key={i} className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><div><p className="font-black text-[13px]">{u.nomEtablissement || u.nom} 🎁</p><p className="text-[10px] text-gray-500">0{waC.slice(-9)} • Code: <span className="font-black">{u.codeAmbassadeur || u.inviteCode}</span></p></div><span className="text-[10px] font-black bg-yellow-100 px-2 py-1 rounded-full h-fit">{niveau}</span></div><div className="flex gap-2 mt-3 text-center"><div className="flex-1 bg-gray-50 rounded-xl py-2"><p className="font-black">{st.total}</p><p className="text-[9px] text-gray-500">Filleules</p></div><div className="flex-1 bg-gray-50 rounded-xl py-2"><p className="font-black">{st.boutiques}</p><p className="text-[9px] text-gray-500">Boutiques</p></div><div className="flex-1 bg-gray-50 rounded-xl py-2"><p className="font-black">{st.payes}</p><p className="text-[9px] text-gray-500">Ont payé</p></div></div><button onClick={async () => { await navigator.clipboard.writeText(lienInvitation(u.codeAmbassadeur || u.inviteCode)); alert("Lien copié"); }} className="w-full mt-3 py-2 rounded-full font-black text-[10px] border-2 border-black">📋 Copier son lien</button></div>
          );
        })}
      </div>
    </div>
  );
}
