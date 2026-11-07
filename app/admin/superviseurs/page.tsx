"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lireSession } from "@/lib/comptes";
import { roleDe, genererCodePro, journaliser } from "@/lib/admin";
export const dynamic = "force-dynamic";
function cleanWa(n: any) { return (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, ""); }
function lire(cle: string): any[] { try { return JSON.parse(localStorage.getItem(cle) || "[]"); } catch { return []; } }

export default function SuperviseursAdmin() {
  const router = useRouter();
  const [compte, setCompte] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [nom, setNom] = useState(""); const [wa, setWa] = useState("");
  const [pret, setPret] = useState(false);
  useEffect(() => {
    const s = lireSession();
    if (!s || roleDe(s) !== "dg") { router.replace("/admin"); return; } // DG SEUL
    setCompte(s); setList(lire("wenze_all_users").filter((u: any) => u.roleAdmin === "superviseur")); setPret(true);
  }, [router]);
  if (!pret) return <div className="max-w-[430px] mx-auto min-h-screen bg-black text-white p-6 text-[12px] font-bold">Vérification DG...</div>;
  const creer = () => {
    if (!nom.trim() || !wa.trim()) return alert("Nom + WhatsApp obligatoires");
    const code = genererCodePro("superviseur");
    const users = lire("wenze_all_users");
    const existe = users.find((u: any) => cleanWa(u.ownerWhatsapp || u.whatsapp) === cleanWa(wa));
    if (existe) {
      existe.roleAdmin = "superviseur"; existe.inviteCode = existe.inviteCode || code; existe.nomEtablissement = nom;
      localStorage.setItem("wenze_all_users", JSON.stringify(users));
    } else {
      users.push({ nomEtablissement: nom, nom, ownerWhatsapp: cleanWa(wa), whatsapp: cleanWa(wa), roleAdmin: "superviseur", inviteCode: code, estVendeur: false, methode: "whatsapp", statutCompte: "actif", dateInscription: new Date().toISOString() });
      localStorage.setItem("wenze_all_users", JSON.stringify(users));
    }
    journaliser("CREATION SUPERVISEUR", compte.ownerWhatsapp, compte.nom || "DG", wa, `Code ${code} - ${nom}`);
    alert(`✅ Superviseur créé\nCode Pro : ${code}\nIl se connecte avec son WhatsApp + 2FA.`);
    setNom(""); setWa(""); setList(lire("wenze_all_users").filter((u: any) => u.roleAdmin === "superviseur"));
  };
  const retirer = (waCible: string) => {
    if (!confirm("Retirer ce Superviseur ? Il redevient Client.")) return;
    const users = lire("wenze_all_users");
    const idx = users.findIndex((u: any) => cleanWa(u.ownerWhatsapp || u.whatsapp) === cleanWa(waCible));
    if (idx >= 0) { users[idx].roleAdmin = null; localStorage.setItem("wenze_all_users", JSON.stringify(users)); }
    setList(lire("wenze_all_users").filter((u: any) => u.roleAdmin === "superviseur"));
  };
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="p-4 bg-black text-white flex justify-between items-center"><div><h1 className="font-black text-[15px]">🛡️ Superviseurs - DG seul</h1><p className="text-[10px] text-white/60">Tu crées, tu contrôles, tu retires</p></div><Link href="/admin" className="bg-white text-black px-3 py-1.5 rounded-full font-black text-[10px]">← Admin</Link></header>
      <div className="p-4 space-y-3">
        <div className="bg-white border-2 border-black rounded-2xl p-4 space-y-2">
          <p className="font-black text-[13px]">➕ Créer un Superviseur</p>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom complet" className="w-full border-2 border-black rounded-full px-4 py-3 text-[12px] font-bold outline-none" />
          <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="WhatsApp : 2438..." className="w-full border-2 border-black rounded-full px-4 py-3 text-[12px] font-bold outline-none" />
          <button onClick={creer} className="w-full bg-black text-white py-3 rounded-full font-black text-[11px]">Créer Superviseur + Générer Code Pro</button>
          <p className="text-[10px] text-gray-500">Il recevra : Code WENZE-SUP-XXXX + 2FA obligatoire à chaque connexion.</p>
        </div>
        <p className="font-black text-[12px]">{list.length} superviseur(s)</p>
        {list.map((u: any, i: number) => (
          <div key={i} className="bg-white border rounded-2xl p-4 flex justify-between items-center"><div><p className="font-black text-[13px]">{u.nomEtablissement || u.nom}</p><p className="text-[10px] text-gray-500">0{cleanWa(u.ownerWhatsapp || u.whatsapp).slice(-9)} • Code: <span className="font-black">{u.inviteCode}</span></p></div><button onClick={() => retirer(u.ownerWhatsapp || u.whatsapp)} className="bg-red-100 text-red-700 px-3 py-2 rounded-full font-black text-[10px]">Retirer</button></div>
        ))}
      </div>
    </div>
  );
}
