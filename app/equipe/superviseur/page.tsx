"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// WENZE - SUPERVISEUR V3 CORRIGÉ - Fichier complet
// SUP -> AMB -> BOUTIQUE / CLIENT -> DG
// NOUVEAU V4 : Si rapport URGENTE, alerte téléphone du DG
// ============================================================

type Boutique = { id: string; nom: string; vendeur: string; whatsapp: string; quartier: string; statut: "EN_ATTENTE" | "VALIDEE" | "A_VERIFIER"; probleme?: string; codeAmb?: string };
type Ambassadeur = { id: string; nom: string; whatsapp: string; codePro: string; creePar: string; filleuls: number; boutiquesCrees: number; statut: "ACTIF" | "INACTIF"; dernierTravail: string };

export default function SuperviseurPageV2() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<"ACCUEIL" | "BOUTIQUES" | "AMBASSADEURS" | "CREER" | "RAPPORT" | "LIEN">("ACCUEIL");
  const [recherche, setRecherche] = useState("");

  const [monCodePro] = useState("SUP-GOM-2026-014");
  const [monNom] = useState("Superviseur Gombe");
  const [monQuartier] = useState("Gombe • Lemba • Ngaliema");

  const [boutiques, setBoutiques] = useState<Boutique[]>([
    { id: "B-01", nom: "Boutique Mama Grace", vendeur: "Mama Grace", whatsapp: "243810000001", quartier: "Gombe", statut: "EN_ATTENTE", codeAmb: "AMB-MIR-2026-087" },
    { id: "B-02", nom: "Shop Lemba Fashion", vendeur: "Kevin Lemba", whatsapp: "243810000002", quartier: "Lemba", statut: "A_VERIFIER", probleme: "Photo floue, pas de vitrine", codeAmb: "AMB-DAV-2026-045" },
    { id: "B-03", nom: "Kiosque Ngaliema", vendeur: "Sarah N.", whatsapp: "243810000003", quartier: "Ngaliema", statut: "VALIDEE", codeAmb: "AMB-MIR-2026-087" },
  ]);

  const [ambassadeurs, setAmbassadeurs] = useState<Ambassadeur[]>([
    { id: "A-01", nom: "Mireille T.", whatsapp: "243810000011", codePro: "AMB-MIR-2026-087", creePar: "Par Amb. David I. • Validé DG", filleuls: 12, boutiquesCrees: 5, statut: "ACTIF", dernierTravail: "Aujourd'hui, 10h" },
    { id: "A-02", nom: "David I.", whatsapp: "243810000012", codePro: "AMB-DAV-2026-045", creePar: "Par DG", filleuls: 8, boutiquesCrees: 3, statut: "ACTIF", dernierTravail: "Hier" },
    { id: "A-03", nom: "Grace M.", whatsapp: "243810000013", codePro: "AMB-GRA-2026-099", creePar: "Par DG", filleuls: 0, boutiquesCrees: 0, statut: "INACTIF", dernierTravail: "Il y a 5 jours" },
  ]);

  const [formAmb, setFormAmb] = useState({ nom: "", whatsapp: "" });
  const [formBoutique, setFormBoutique] = useState({ nom: "", vendeur: "", whatsapp: "", quartier: "" });
  const [formClient, setFormClient] = useState({ nom: "", whatsapp: "" });
  const [typeCreation, setTypeCreation] = useState<"AMBASSADEUR" | "BOUTIQUE" | "CLIENT">("AMBASSADEUR");
  const [toast, setToast] = useState("");
  const [rapport, setRapport] = useState({ sujet: "", detail: "", urgence: "NORMALE" as "NORMALE" | "URGENTE" });
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const creerAmbassadeur = () => {
    if (!formAmb.nom || formAmb.whatsapp.length < 9) return showToast("Nom et WhatsApp obligatoires pour l'Ambassadeur.");
    const codeAmb = `AMB-${formAmb.nom.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setAmbassadeurs(p => [...p, { id: `A-${Date.now()}`, nom: formAmb.nom, whatsapp: formAmb.whatsapp, codePro: codeAmb, creePar: `Par toi (${monCodePro}) • En attente DG`, filleuls: 0, boutiquesCrees: 0, statut: "ACTIF", dernierTravail: "À l'instant - Créé par toi" }]);
    showToast(`✅ Ambassadeur ${formAmb.nom} créé. Son code pro : ${codeAmb}. Lien : ${codeAmb} → ${monCodePro} → DG.`);
    setFormAmb({ nom: "", whatsapp: "" });
  };

  const creerBoutique = () => {
    if (!formBoutique.nom || !formBoutique.whatsapp) return showToast("Nom de boutique et WhatsApp obligatoires.");
    setBoutiques(p => [...p, { id: `B-${Date.now()}`, nom: formBoutique.nom, vendeur: formBoutique.vendeur, whatsapp: formBoutique.whatsapp, quartier: formBoutique.quartier || monQuartier, statut: "EN_ATTENTE", codeAmb: "Créée directement par toi" }]);
    showToast(`✅ Boutique ${formBoutique.nom} créée avec ton code ${monCodePro}. En attente de validation.`);
    setFormBoutique({ nom: "", vendeur: "", whatsapp: "", quartier: "" });
  };

  const creerClient = () => {
    if (!formClient.nom || formClient.whatsapp.length < 9) return showToast("Nom et WhatsApp du client obligatoires.");
    showToast(`✅ Client ${formClient.nom} créé avec ton code ${monCodePro}. Il a reçu son ticket tombola.`);
    setFormClient({ nom: "", whatsapp: "" });
  };

  // ===== V4 - RAPPORT AU DG + ALERTE TÉLÉPHONE SI URGENTE =====
  const envoyerRapport = async () => {
    if (!rapport.sujet || !rapport.detail) return showToast("Sujet et détail du rapport obligatoires.");
    setEnvoiEnCours(true);

    // 1. Si URGENTE -> on réveille le DG sur son téléphone via Telegram + Gmail
    if (rapport.urgence === "URGENTE") {
      try {
        await fetch("/api/alerte", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titre: `RAPPORT SUP ${monCodePro} - ${rapport.sujet}`,
            detail: rapport.detail,
            urgence: "URGENTE",
            qui: `${monNom} (${monCodePro}) - ${monQuartier}`,
          }),
        });
      } catch {}
    }

    // 2. On ouvre WhatsApp comme avant
    const msg = `📋 RAPPORT SUPERVISEUR ${monCodePro} - ${monNom}%0A%0ASujet: ${rapport.sujet}%0AUrgence: ${rapport.urgence}%0AQuartier: ${monQuartier}%0A%0ADétail: ${rapport.detail}%0A%0AJe demande l'intervention du DG.`;
    window.open(`https://wa.me/243825888889?text=${msg}`, "_blank");

    showToast(rapport.urgence === "URGENTE" ? "🚨 Rapport URGENT envoyé + Alerte téléphone DG envoyée." : "📤 Rapport envoyé au DG sur WhatsApp.");
    setRapport({ sujet: "", detail: "", urgence: "NORMALE" });
    setEnvoiEnCours(false);
  };

  const deconnecter = () => { document.cookie = "wenze-role=; path=/; max-age=0"; router.push("/dg-prive/connexion"); };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-20">
      {toast && <div className="fixed top-4 left-4 right-4 z-50 max-w-[400px] mx-auto bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center shadow-lg">{toast}</div>}

      <div className="bg-[#1A3A2F] text-white px-5 pt-8 pb-5 rounded-b-[28px]">
        <div className="flex justify-between items-start">
          <p className="text-[11px] opacity-70">WENZE • CARTE SUPERVISEUR</p>
          <button onClick={deconnecter} className="bg-white/15 px-3 py-1.5 rounded-full text-[11px] font-bold">↩ Quitter</button>
        </div>
        <div className="bg-white text-black rounded-2xl p-4 mt-3 flex justify-between items-center shadow-lg">
          <div>
            <p className="text-[10px] font-black tracking-widest text-gray-500">SUPERVISEUR WENZE</p>
            <p className="font-black text-[16px] mt-1">🛡️ {monNom}</p>
            <p className="text-[11px] text-gray-600">{monQuartier}</p>
            <p className="text-[10px] text-gray-400 mt-1">Créé par le DG • Ne peut pas supprimer / bloquer</p>
          </div>
          <div className="text-center">
            <div className="w-[58px] h-[58px] bg-black text-white rounded-full flex items-center justify-center font-black text-[16px]">S</div>
            <p className="text-[9px] font-black mt-1 bg-[#FFD166] px-2 py-0.5 rounded-full">{monCodePro}</p>
          </div>
        </div>
        <div className="bg-white/10 rounded-xl px-3 py-2 mt-3 text-[11px] text-center">
          🔗 <b>TA CHAÎNE :</b> DG → {monCodePro} (Toi) → {ambassadeurs.length} Ambassadeurs
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => { navigator.clipboard.writeText(monCodePro); showToast(`Code ${monCodePro} copié.`); }} className="flex-1 bg-[#FFD166] text-black py-2.5 rounded-full text-[11px] font-black">📋 Copier mon code pro : {monCodePro}</button>
        </div>
      </div>

      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
        {(["ACCUEIL", "BOUTIQUES", "AMBASSADEURS", "CREER", "RAPPORT", "LIEN"] as const).map(t => (
          <button key={t} onClick={() => setOnglet(t)} className={`whitespace-nowrap px-3.5 py-2.5 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>
            {t === "ACCUEIL" ? "🏠 Accueil" : t === "BOUTIQUES" ? `🏪 Boutiques` : t === "AMBASSADEURS" ? "🎖️ Amb." : t === "CREER" ? "➕ Créer" : t === "RAPPORT" ? "📋 Rapport DG" : "🔗 Lien"}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {onglet === "ACCUEIL" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white border rounded-2xl p-3 text-center"><p className="font-black text-[18px]">{boutiques.filter(b => b.statut === "EN_ATTENTE").length}</p><p className="text-[10px] text-gray-500">À superviser</p></div>
              <div className="bg-white border rounded-2xl p-3 text-center"><p className="font-black text-[18px]">{ambassadeurs.length}</p><p className="text-[10px] text-gray-500">Amb. sous toi</p></div>
              <div className="bg-white border rounded-2xl p-3 text-center"><p className="font-black text-[18px]">{boutiques.filter(b => b.statut === "VALIDEE").length}</p><p className="text-[10px] text-gray-500">Bout. validées</p></div>
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">🎯 Tes pouvoirs de Superviseur</p>
              <p className="text-[12px] text-gray-600 mt-2 leading-relaxed">✅ Créer Ambassadeur, Boutique, Client avec ton code <b>{monCodePro}</b><br />✅ Contrôler le travail des Ambassadeurs<br />✅ Superviser les boutiques et faire un rapport au DG<br />❌ Tu ne peux <b>ni supprimer ni bloquer</b> quelqu'un. Si problème, tu fais un rapport, c'est le DG qui décide.</p>
            </div>
            <button onClick={() => setOnglet("CREER")} className="w-full bg-[#1A3A2F] text-white py-4 rounded-full font-black text-[13px]">➕ Créer un Ambassadeur / Boutique / Client</button>
            <button onClick={() => setOnglet("LIEN")} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px]">🔗 Voir ma chaîne : DG → Moi → Mes Ambassadeurs</button>
            <button onClick={() => setOnglet("RAPPORT")} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-[13px]">📋 Faire un rapport au DG</button>
          </div>
        )}

        {onglet === "BOUTIQUES" && (
          <div className="space-y-3">
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="🔍 Rechercher boutique..." className="w-full bg-white border rounded-full px-4 py-3 text-[13px] outline-none" />
            {boutiques.filter(b => b.nom.toLowerCase().includes(recherche.toLowerCase())).map(b => (
              <div key={b.id} className="bg-white border rounded-2xl p-4">
                <div className="flex justify-between"><p className="font-black text-[14px]">{b.nom}</p><span className={`text-[10px] font-black px-2 py-1 rounded-full h-fit ${b.statut === "VALIDEE" ? "bg-green-100 text-green-700" : b.statut === "A_VERIFIER" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>{b.statut}</span></div>
                <p className="text-[11px] text-gray-500 mt-1">{b.vendeur} • {b.quartier} • {b.whatsapp}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">🔗 Créée par : {b.codeAmb || monCodePro} → {monCodePro} → DG</p>
                {b.probleme && <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-xl mt-2">⚠️ Problème signalé : {b.probleme}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setBoutiques(p => p.map(x => x.id === b.id ? { ...x, statut: "VALIDEE" } : x))} className="flex-1 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Supervisé OK</button>
                  <button onClick={() => { setRapport({ sujet: `Problème boutique : ${b.nom}`, detail: `Boutique ${b.nom} - ${b.vendeur} - Problème à vérifier.`, urgence: "NORMALE" }); setOnglet("RAPPORT"); }} className="flex-1 bg-orange-500 text-white py-2.5 rounded-full text-[11px] font-black">📋 Signaler au DG</button>
                  <a href={`https://wa.me/${b.whatsapp}`} target="_blank" className="px-3 py-2.5 bg-green-50 border rounded-full">💬</a>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Tu ne peux pas supprimer ou bloquer cette boutique. Tu supervises et tu rapportes.</p>
              </div>
            ))}
          </div>
        )}

        {onglet === "AMBASSADEURS" && (
          <div className="space-y-3">
            <div className="bg-[#1A3A2F] text-white rounded-2xl p-4">
              <p className="font-black text-[13px]">🛡️ Mes Ambassadeurs liés</p>
              <p className="text-[11px] opacity-70 mt-1">Code : {monCodePro} • Ces Ambassadeurs sont sous TA supervision.</p>
            </div>
            {ambassadeurs.map(a => (
              <div key={a.id} className="bg-white border rounded-2xl p-4">
                <div className="flex justify-between"><p className="font-black text-[14px]">🎖️ {a.nom}</p><span className={`text-[10px] font-black px-2 py-1 rounded-full h-fit ${a.statut === "ACTIF" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{a.statut}</span></div>
                <p className="text-[11px] text-gray-500 mt-1">Code pro : <b>{a.codePro}</b> • {a.creePar}</p>
                <p className="text-[11px] text-gray-500">{a.filleuls} filleuls • {a.boutiquesCrees} boutiques créées • Dernier travail : {a.dernierTravail}</p>
                <p className="text-[10px] text-gray-400 mt-1">🔗 Lien : {a.codePro} → {monCodePro} → DG</p>
                <div className="flex gap-2 mt-3">
                  <a href={`https://wa.me/${a.whatsapp}`} target="_blank" className="flex-1 text-center bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">💬 Contacter</a>
                  <button onClick={() => { setRapport({ sujet: `Contrôle Ambassadeur : ${a.nom}`, detail: `Ambassadeur ${a.nom} (${a.codePro}) - ${a.filleuls} filleuls - Dernier travail : ${a.dernierTravail} - À vérifier.`, urgence: "NORMALE" }); setOnglet("RAPPORT"); }} className="flex-1 bg-orange-500 text-white py-2.5 rounded-full text-[11px] font-black">📋 Signaler au DG</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet === "CREER" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["AMBASSADEUR", "BOUTIQUE", "CLIENT"] as const).map(t => (
                <button key={t} onClick={() => setTypeCreation(t)} className={`flex-1 py-3 rounded-full text-[11px] font-black ${typeCreation === t ? "bg-black text-white" : "bg-white border"}`}>{t}</button>
              ))}
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">➕ Créer un {typeCreation.toLowerCase()} avec ton code</p>
              <p className="text-[11px] text-gray-500 mt-1">Code Superviseur utilisé : <b>{monCodePro}</b> • Ce compte sera lié à toi.</p>
              {typeCreation === "AMBASSADEUR" && (
                <div className="space-y-2 mt-3">
                  <input value={formAmb.nom} onChange={e => setFormAmb({ ...formAmb, nom: e.target.value })} placeholder="Nom complet de l'Ambassadeur" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <input value={formAmb.whatsapp} onChange={e => setFormAmb({ ...formAmb, whatsapp: e.target.value })} placeholder="WhatsApp Ex: 0825000000" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <button onClick={creerAmbassadeur} className="w-full bg-black text-white py-3.5 rounded-full font-black text-[12px] mt-1">✅ Créer l'Ambassadeur</button>
                </div>
              )}
              {typeCreation === "BOUTIQUE" && (
                <div className="space-y-2 mt-3">
                  <input value={formBoutique.nom} onChange={e => setFormBoutique({ ...formBoutique, nom: e.target.value })} placeholder="Nom de la boutique" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <input value={formBoutique.vendeur} onChange={e => setFormBoutique({ ...formBoutique, vendeur: e.target.value })} placeholder="Nom du vendeur" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <input value={formBoutique.whatsapp} onChange={e => setFormBoutique({ ...formBoutique, whatsapp: e.target.value })} placeholder="WhatsApp boutique" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <input value={formBoutique.quartier} onChange={e => setFormBoutique({ ...formBoutique, quartier: e.target.value })} placeholder="Quartier Ex: Gombe" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <button onClick={creerBoutique} className="w-full bg-black text-white py-3.5 rounded-full font-black text-[12px] mt-1">✅ Créer la Boutique</button>
                </div>
              )}
              {typeCreation === "CLIENT" && (
                <div className="space-y-2 mt-3">
                  <input value={formClient.nom} onChange={e => setFormClient({ ...formClient, nom: e.target.value })} placeholder="Nom du client" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <input value={formClient.whatsapp} onChange={e => setFormClient({ ...formClient, whatsapp: e.target.value })} placeholder="WhatsApp client" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <button onClick={creerClient} className="w-full bg-black text-white py-3.5 rounded-full font-black text-[12px] mt-1">✅ Créer le compte Client</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== CORRIGÉ : C'ÉTAIT ICI QUE ÇA CASSAIT ===== */}
        {onglet === "RAPPORT" && (
          <div className="bg-white border rounded-2xl p-4 space-y-3">
            <p className="font-black text-[14px]">📋 Rapport au DG</p>
            <p className="text-[11px] text-gray-500">Tu as vu un problème ? Tu ne bloques personne. Tu rapportes, et le DG décide.</p>
            <input value={rapport.sujet} onChange={e => setRapport({ ...rapport, sujet: e.target.value })} placeholder="Sujet Ex: Boutique avec fausse photo" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
            <div className="flex gap-2">
              {(["NORMALE", "URGENTE"] as const).map(u => (
                <button key={u} onClick={() => setRapport({ ...rapport, urgence: u })} className={`flex-1 py-2.5 rounded-full text-[11px] font-black ${rapport.urgence === u ? (u === "URGENTE" ? "bg-red-600 text-white" : "bg-black text-white") : "bg-gray-100"}`}>{u}</button>
              ))}
            </div>
            <textarea value={rapport.detail} onChange={e => setRapport({ ...rapport, detail: e.target.value })} placeholder="Décris le problème en détail : qui, quoi, où, quand..." rows={4} className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
            <button onClick={envoyerRapport} disabled={envoiEnCours} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-[13px]">
              {envoiEnCours ? "Envoi..." : rapport.urgence === "URGENTE" ? "🚨 Envoyer + Alerter le DG sur son téléphone" : "📤 Envoyer le rapport au DG"}
            </button>
          
