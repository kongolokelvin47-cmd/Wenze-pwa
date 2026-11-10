"use client";

import { useState } from "react";
import Link from "next/link";

// ==========================================
// TYPES - WENZE - Rôles officiels
// ==========================================
type Role = "DG" | "SUPERVISEUR" | "AMBASSADEUR";
type Statut = "ACTIF" | "SUSPENDU" | "EN_ATTENTE";

type Membre = {
  id: string;
  nom: string;
  telephone: string;
  role: Role;
  zone: string;
  statut: Statut;
  filleuls?: number;
  boutiquesValidees?: number;
  gains?: number;
  dateInscription: string;
};

// ==========================================
// DONNÉES - À remplacer plus tard par ta base de données
// ==========================================
const MEMBRES_INITIAUX: Membre[] = [
  { id: "SUP-01", nom: "Grace Mbuyi", telephone: "+243 810 000 001", role: "SUPERVISEUR", zone: "Gombe", statut: "ACTIF", boutiquesValidees: 12, dateInscription: "2026-10-01" },
  { id: "SUP-02", nom: "Kevin Kongolo", telephone: "+243 810 000 002", role: "SUPERVISEUR", zone: "Lemba", statut: "EN_ATTENTE", boutiquesValidees: 0, dateInscription: "2026-11-08" },
  { id: "SUP-03", nom: "Sarah Nsimba", telephone: "+243 810 000 003", role: "SUPERVISEUR", zone: "Ngaliema", statut: "SUSPENDU", boutiquesValidees: 3, dateInscription: "2026-09-15" },
  { id: "AMB-01", nom: "Joel Kabongo", telephone: "+243 810 000 011", role: "AMBASSADEUR", zone: "Kintambo", statut: "ACTIF", filleuls: 18, gains: 45000, dateInscription: "2026-10-05" },
  { id: "AMB-02", nom: "Mireille Tshiala", telephone: "+243 810 000 012", role: "AMBASSADEUR", zone: "Masina", statut: "ACTIF", filleuls: 24, gains: 62000, dateInscription: "2026-10-02" },
  { id: "AMB-03", nom: "David Ilunga", telephone: "+243 810 000 013", role: "AMBASSADEUR", zone: "Bandal", statut: "EN_ATTENTE", filleuls: 0, gains: 0, dateInscription: "2026-11-10" },
];

// ==========================================
// PAGE DG
// ==========================================
export default function DashboardDG() {
  const [membres, setMembres] = useState<Membre[]>(MEMBRES_INITIAUX);
  const [onglet, setOnglet] = useState<"TOUS" | "SUPERVISEUR" | "AMBASSADEUR">("TOUS");
  const [recherche, setRecherche] = useState("");

  // --- STATISTIQUES DG ---
  const superviseurs = membres.filter((m) => m.role === "SUPERVISEUR");
  const ambassadeurs = membres.filter((m) => m.role === "AMBASSADEUR");
  const enAttente = membres.filter((m) => m.statut === "EN_ATTENTE");
  const totalGains = ambassadeurs.reduce((s, m) => s + (m.gains || 0), 0);
  const totalBoutiques = superviseurs.reduce((s, m) => s + (m.boutiquesValidees || 0), 0);

  // --- FILTRE ---
  const membresFiltres = membres.filter((m) => {
    const matchOnglet = onglet === "TOUS" || m.role === onglet;
    const matchRecherche = m.nom.toLowerCase().includes(recherche.toLowerCase()) || m.zone.toLowerCase().includes(recherche.toLowerCase());
    return matchOnglet && matchRecherche;
  });

  // --- ACTIONS DG : C'est ici que le DG contrôle ---
  const changerStatut = (id: string, nouveauStatut: Statut) => {
    setMembres((prev) => prev.map((m) => (m.id === id ? { ...m, statut: nouveauStatut } : m)));
  };

  const supprimerMembre = (id: string) => {
    if (confirm("DG, tu es sûr de vouloir supprimer ce membre ? Cette action est définitive.")) {
      setMembres((prev) => prev.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-20">
      {/* HEADER DG */}
      <div className="bg-black text-white p-5 pt-10">
        <p className="text-[11px] opacity-70">WENZE • ESPACE PRIVÉ</p>
        <h1 className="font-black text-[20px] mt-1">👑 Tableau de bord DG</h1>
        <p className="text-[12px] opacity-80 mt-1">Bonjour Directeur Général. Tu contrôles toute l'équipe ici.</p>
        <Link href="/" className="inline-block mt-3 text-[11px] bg-white text-black px-3 py-1.5 rounded-full font-bold">← Retour accueil</Link>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-white rounded-2xl p-3 shadow-sm border"><p className="text-[11px] text-gray-500">Superviseurs</p><p className="font-black text-[22px]">{superviseurs.length}</p><p className="text-[11px] text-green-600">{superviseurs.filter(m=>m.statut==="ACTIF").length} actifs</p></div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border"><p className="text-[11px] text-gray-500">Ambassadeurs</p><p className="font-black text-[22px]">{ambassadeurs.length}</p><p className="text-[11px] text-green-600">{ambassadeurs.filter(m=>m.statut==="ACTIF").length} actifs</p></div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border"><p className="text-[11px] text-gray-500">En attente de validation</p><p className="font-black text-[22px] text-orange-600">{enAttente.length}</p><p className="text-[11px]">À valider par toi</p></div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border"><p className="text-[11px] text-gray-500">Boutiques validées</p><p className="font-black text-[22px]">{totalBoutiques}</p><p className="text-[11px]">Par les superviseurs</p></div>
      </div>

      <div className="mx-4 bg-black text-white rounded-2xl p-4 flex justify-between items-center">
        <div><p className="text-[11px] opacity-70">Total gains Ambassadeurs</p><p className="font-black text-[20px]">{totalGains.toLocaleString()} CDF</p></div>
        <span className="text-2xl">💰</span>
      </div>

      {/* RECHERCHE + ONGLETS */}
      <div className="p-4">
        <input value={recherche} onChange={(e)=>setRecherche(e.target.value)} placeholder="🔍 Rechercher nom ou zone (Gombe, Lemba...)" className="w-full bg-white border rounded-full px-4 py-3 text-[13px] outline-none" />
        <div className="flex gap-2 mt-3">
          {(["TOUS","SUPERVISEUR","AMBASSADEUR"] as const).map((t)=>(
            <button key={t} onClick={()=>setOnglet(t)} className={`flex-1 py-2.5 rounded-full text-[11px] font-black ${onglet===t ? "bg-black text-white" : "bg-white border"}`}>
              {t==="TOUS" ? "Tous" : t==="SUPERVISEUR" ? "Superviseurs" : "Ambassadeurs"}
            </button>
          ))}
        </div>
      </div>

      {/* LISTE MEMBRES */}
      <div className="px-4 space-y-3">
        {membresFiltres.length===0 && <p className="text-center text-[12px] text-gray-500 py-6">Aucun membre trouvé.</p>}
        {membresFiltres.map((m)=>(
          <div key={m.id} className="bg-white rounded-2xl p-4 border shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-black text-[14px]">{m.nom} <span className="text-[10px] font-normal text-gray-400">• {m.id}</span></p>
                <p className="text-[11px] text-gray-500">{m.telephone} • {m.zone}</p>
                <p className="text-[11px] mt-1">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${m.role==="SUPERVISEUR" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{m.role}</span>{" "}
                  <span className={`px-2 py-0.5 rounded-full font-bold ${m.statut==="ACTIF" ? "bg-green-100 text-green-700" : m.statut==="EN_ATTENTE" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>{m.statut}</span>
                </p>
              </div>
              <span className="text-2xl">{m.role==="SUPERVISEUR" ? "🛡️" : "🎖️"}</span>
            </div>

            <div className="flex gap-4 mt-2 text-[11px] text-gray-600">
              {m.role==="SUPERVISEUR" && <span>🏪 {m.boutiquesValidees} boutiques validées</span>}
              {m.role==="AMBASSADEUR" && <><span>👥 {m.filleuls} filleuls</span><span>💰 {m.gains?.toLocaleString()} CDF</span></>}
            </div>

            {/* CONTRÔLES DG */}
            <div className="flex gap-2 mt-3">
              {m.statut!=="ACTIF" && <button onClick={()=>changerStatut(m.id,"ACTIF")} className="flex-1 bg-green-600 text-white py-2 rounded-full text-[11px] font-black">✅ Valider</button>}
              {m.statut!=="SUSPENDU" && <button onClick={()=>changerStatut(m.id,"SUSPENDU")} className="flex-1 bg-orange-500 text-white py-2 rounded-full text-[11px] font-black">⏸️ Suspendre</button>}
              {m.statut!=="ACTIF" && <button onClick={()=>changerStatut(m.id,"ACTIF")} className="flex-1 bg-black text-white py-2 rounded-full text-[11px] font-black">🔄 Réactiver</button>}
              <button onClick={()=>supprimerMembre(m.id)} className="px-3 bg-red-50 text-red-600 py-2 rounded-full text-[11px] font-black">🗑️</button>
            </div>

            <div className="flex gap-2 mt-2">
              <Link href={`/dg-prive/${m.role==="SUPERVISEUR" ? "superviseurs" : "ambassadeurs"}`} className="flex-1 text-center bg-gray-100 py-2 rounded-full text-[11px] font-bold">Voir le détail →</Link>
              <a href={`tel:${m.telephone}`} className="flex-1 text-center bg-gray-100 py-2 rounded-full text-[11px] font-bold">📞 Appeler</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
