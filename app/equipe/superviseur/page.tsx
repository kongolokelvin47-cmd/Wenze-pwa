"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// WENZE - SUPERVISEUR V2 - RÈGLES DU DG
// Créé uniquement par le DG | Peut créer Ambassadeur, Boutique, Client
// Ne peut NI supprimer NI bloquer | Il fait un rapport au DG
// ============================================================

type Boutique = { id: string; nom: string; vendeur: string; whatsapp: string; quartier: string; statut: "EN_ATTENTE" | "VALIDEE" | "A_VERIFIER"; probleme?: string };
type Ambassadeur = { id: string; nom: string; whatsapp: string; filleuls: number; boutiquesCrees: number; statut: "ACTIF" | "INACTIF"; dernierTravail: string };

export default function SuperviseurPageV2() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<"ACCUEIL" | "BOUTIQUES" | "AMBASSADEURS" | "CREER" | "RAPPORT">("ACCUEIL");
  const [recherche, setRecherche] = useState("");

  // IDENTITÉ PROFESSIONNELLE DU SUPERVISEUR - Générée par WENZE, comme une carte d'identité
  // En vrai, ce code sera généré par le DG quand il crée le Superviseur
  const [monCodePro] = useState("SUP-GOM-2026-014");
  const [monNom] = useState("Superviseur Gombe");
  const [monQuartier] = useState("Gombe • Lemba • Ngaliema");
  const [monTelephone] = useState("243810000000");

  const [boutiques, setBoutiques] = useState<Boutique[]>([
    { id: "B-01", nom: "Boutique Mama Grace", vendeur: "Mama Grace", whatsapp: "243810000001", quartier: "Gombe", statut: "EN_ATTENTE" },
    { id: "B-02", nom: "Shop Lemba Fashion", vendeur: "Kevin Lemba", whatsapp: "243810000002", quartier: "Lemba", statut: "A_VERIFIER", probleme: "Photo floue, pas de vitrine" },
    { id: "B-03", nom: "Kiosque Ngaliema", vendeur: "Sarah N.", whatsapp: "243810000003", quartier: "Ngaliema", statut: "VALIDEE" },
  ]);

  const [ambassadeurs, setAmbassadeurs] = useState<Ambassadeur[]>([
    { id: "A-01", nom: "Mireille T.", whatsapp: "243810000011", filleuls: 12, boutiquesCrees: 5, statut: "ACTIF", dernierTravail: "Aujourd'hui, 10h" },
    { id: "A-02", nom: "David I.", whatsapp: "243810000012", filleuls: 8, boutiquesCrees: 3, statut: "ACTIF", dernierTravail: "Hier" },
    { id: "A-03", nom: "Grace M.", whatsapp: "243810000013", filleuls: 0, boutiquesCrees: 0, statut: "INACTIF", dernierTravail: "Il y a 5 jours" },
  ]);

  // FORMULAIRES DE CRÉATION - Avec le code du Superviseur
  const [formAmb, setFormAmb] = useState({ nom: "", whatsapp: "" });
  const [formBoutique, setFormBoutique] = useState({ nom: "", vendeur: "", whatsapp: "", quartier: "" });
  const [formClient, setFormClient] = useState({ nom: "", whatsapp: "" });
  const [typeCreation, setTypeCreation] = useState<"AMBASSADEUR" | "BOUTIQUE" | "CLIENT">("AMBASSADEUR");
  const [toast, setToast] = useState("");

  // RAPPORT AU DG
  const [rapport, setRapport] = useState({ sujet: "", detail: "", urgence: "NORMALE" as "NORMALE" | "URGENTE" });

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  // 1. CRÉER UN AMBASSADEUR - Droit du Superviseur
  const creerAmbassadeur = () => {
    if (!formAmb.nom || formAmb.whatsapp.length < 9) return showToast("Nom et WhatsApp obligatoires pour l'Ambassadeur.");
    const codeAmb = `AMB-${formAmb.nom.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setAmbassadeurs(p => [...p, { id: `A-${Date.now()}`, nom: formAmb.nom, whatsapp: formAmb.whatsapp, filleuls: 0, boutiquesCrees: 0, statut: "ACTIF", dernierTravail: "À l'instant - Créé par toi" }]);
    showToast(`✅ Ambassadeur ${formAmb.nom} créé. Son code pro : ${codeAmb}. Il est sous ta supervision.`);
    setFormAmb({ nom: "", whatsapp: "" });
  };

  // 2. CRÉER UNE BOUTIQUE AVEC SON CODE SUPERVISEUR
  const creerBoutique = () => {
    if (!formBoutique.nom || !formBoutique.whatsapp) return showToast("Nom de boutique et WhatsApp obligatoires.");
    setBoutiques(p => [...p, { id: `B-${Date.now()}`, nom: formBoutique.nom, vendeur: formBoutique.vendeur, whatsapp: formBoutique.whatsapp, quartier: formBoutique.quartier || monQuartier, statut: "EN_ATTENTE" }]);
    showToast(`✅ Boutique ${formBoutique.nom} créée avec ton code ${monCodePro}. En attente de validation.`);
    setFormBoutique({ nom: "", vendeur: "", whatsapp: "", quartier: "" });
  };

  // 3. CRÉER UN COMPTE CLIENT AVEC SON CODE SUPERVISEUR
  const creerClient = () => {
    if (!formClient.nom || formClient.whatsapp.length < 9) return showToast("Nom et WhatsApp du client obligatoires.");
    showToast(`✅ Client ${formClient.nom} créé avec ton code ${monCodePro}. Il a reçu son ticket tombola.`);
    setFormClient({ nom: "", whatsapp: "" });
  };

  // 4. ENVOYER RAPPORT AU DG - Le Superviseur ne résout pas, il rapporte
  const envoyerRapport = () => {
    if (!rapport.sujet || !rapport.detail) return showToast("Sujet et détail du rapport obligatoires.");
    const msg = `📋 RAPPORT SUPERVISEUR ${monCodePro} - ${monNom}%0A%0ASujet: ${rapport.sujet}%0AUrgence: ${rapport.urgence}%0AQuartier: ${monQuartier}%0A%0ADétail: ${rapport.detail}%0A%0AJe demande l'intervention du DG.`;
    window.open(`https://wa.me/243825888889?text=${msg}`, "_blank");
    showToast("📤 Rapport envoyé au DG sur WhatsApp. Attends sa réponse, ne bloque personne.");
    setRapport({ sujet: "", detail: "", urgence: "NORMALE" });
  };

  const deconnecter = () => { document.cookie = "wenze-role=; path=/; max-age=0"; router.push("/dg-prive/connexion"); };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-20">
      {toast && <div className="fixed top-4 left-4 right-4 z-50 max-w-[400px] mx-auto bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center shadow-lg">{toast}</div>}

      {/* CARTE D'IDENTITÉ PROFESSIONNELLE - Générée par WENZE */}
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
        <div className="flex gap-2 mt-3">
          <button onClick={() => { navigator.clipboard.writeText(monCodePro); showToast(`Code ${monCodePro} copié. Partage-le pour créer boutique / client.`); }} className="flex-1 bg-[#FFD166] text-black py-2.5 rounded-full text-[11px] font-black">📋 Copier mon code pro : {monCodePro}</button>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
        {(["ACCUEIL", "BOUTIQUES", "AMBASSADEURS", "CREER", "RAPPORT"] as const).map(t => (
          <button key={t} onClick={() => setOnglet(t)} className={`whitespace-nowrap px-3.5 py-2.5 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>
            {t === "ACCUEIL" ? "🏠 Accueil" : t === "BOUTIQUES" ? `🏪 Boutiques` : t === "AMBASSADEURS" ? "🎖️ Amb." : t === "CREER" ? "➕ Créer" : "📋 Rapport DG"}
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
            <p className="text-[11px] text-gray-500 bg-white border rounded-2xl p-3">Tu contrôles le travail de TES Ambassadeurs. Si un Ambassadeur ne travaille pas, tu ne le bloques pas, tu le signales au DG dans ton rapport.</p>
            {ambassadeurs.map(a => (
              <div key={a.id} className="bg-white border rounded-2xl p-4">
                <div className="flex justify-between"><p className="font-black text-[14px]">🎖️ {a.nom}</p><span className={`text-[10px] font-black px-2 py-1 rounded-full h-fit ${a.statut === "ACTIF" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{a.statut}</span></div>
                <p className="text-[11px] text-gray-500 mt-1">{a.filleuls} filleuls • {a.boutiquesCrees} boutiques créées • Dernier travail : {a.dernierTravail}</p>
                <div className="flex gap-2 mt-3">
                  <a href={`https://wa.me/${a.whatsapp}`} target="_blank" className="flex-1 text-center bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">💬 Contacter</a>
                  <button onClick={() => { setRapport({ sujet: `Contrôle Ambassadeur : ${a.nom}`, detail: `Ambassadeur ${a.nom} - ${a.filleuls} filleuls - Dernier travail : ${a.dernierTravail} - À vérifier.`, urgence: "NORMALE" }); setOnglet("RAPPORT"); }} className="flex-1 bg-orange-500 text-white py-2.5 rounded-full text-[11px] font-black">📋 Signaler au DG</button>
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

        {onglet === "RAPPORT" && (
          <div className="bg-white border rounded-2xl p-4 space-y-3">
            <p className="font-black text-[14px]">📋 Rapport au DG</p>
            <p className="text-[11px] text-gray-500">Tu as vu un problème ? Tu ne bloques personne. Tu rapportes, et le DG décide et résout.</p>
            <input value={rapport.sujet} onChange={e => setRapport({ ...rapport, sujet: e.target.value })} placeholder="Sujet Ex: Boutique avec fausse photo" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
            <div className="flex gap-2">
              {(["NORMALE", "URGENTE"] as const).map(u => (
                <button key={u} onClick={() => setRapport({ ...rapport, urgence: u })} className={`flex-1 py-2.5 rounded-full text-[11px] font-black ${rapport.urgence === u ? (u === "URGENTE" ? "bg-red-600 text-white" : "bg-black text-white") : "bg-gray-100"}`}>{u}</button>
              ))}
            </div>
            <textarea value={rapport.detail} onChange={e => setRapport({ ...rapport, detail: e.target.value })} placeholder="Décris le problème en détail : qui, quoi, où, quand..." rows={4} className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
            <button onClick={envoyerRapport} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-[13px]">📤 Envoyer le rapport au DG sur WhatsApp</button>
            <p className="text-[10px] text-gray-400 text-center">Le rapport va directement sur le WhatsApp du DG : 243825888889</p>
          </div>
        )}
      </div>
    </div>
  );
         }
