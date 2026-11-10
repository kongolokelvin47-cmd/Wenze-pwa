"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// WENZE - AMBASSADEUR V2 - RÈGLES DU DG
// Créé uniquement par un Ambassadeur ou par le DG (Super Superviseur)
// Code Pro = Identité Visuelle | Commission 20% = 1er mois SEULEMENT
// Peut créer Boutique / Client / Autres avec son code visuel
// ============================================================

type Personne = { id: string; nom: string; whatsapp: string; type: "BOUTIQUE" | "CLIENT"; date: string; ticket: number; mois: number; commission: number };

export default function AmbassadeurPageV2() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<"ACCUEIL" | "GAINS" | "CREER" | "PARRAINAGE">("ACCUEIL");
  const [typeCreation, setTypeCreation] = useState<"BOUTIQUE" | "CLIENT">("BOUTIQUE");
  const [toast, setToast] = useState("");

  // IDENTITÉ PROFESSIONNELLE DE L'AMBASSADEUR - Générée par WENZE
  // Exemple : Si créé par un Ambassadeur, il aura le parrain. Si créé par le DG, parrain = DG
  const [monCodePro] = useState("AMB-MIR-2026-087");
  const [monNom] = useState("Mireille T.");
  const [monParrain] = useState("Créée par : Ambassadeur David I. • Validé par le DG (Super Superviseur)");
  const [monLien] = useState("https://wenze.cd/invitation?code=AMB-MIR-2026-087");

  const [mesPersonnes, setMesPersonnes] = useState<Personne[]>([
    { id: "P1", nom: "Boutique Mama Grace", whatsapp: "243810000001", type: "BOUTIQUE", date: "Il y a 5 jours", ticket: 50000, mois: 1, commission: 10000 },
    { id: "P2", nom: "Client Joel K.", whatsapp: "243810000002", type: "CLIENT", date: "Il y a 10 jours", ticket: 30000, mois: 1, commission: 6000 },
    { id: "P3", nom: "Shop Lemba Fashion", whatsapp: "243810000003", type: "BOUTIQUE", date: "Il y a 40 jours", ticket: 50000, mois: 2, commission: 0 }, // 2ème mois = 0 CDF, règle 20% 1er mois seulement
    { id: "P4", nom: "Client Sarah N.", whatsapp: "243810000004", type: "CLIENT", date: "Il y a 65 jours", ticket: 20000, mois: 3, commission: 0 }, // 3ème mois = 0 CDF
  ]);

  const [formBoutique, setFormBoutique] = useState({ nom: "", vendeur: "", whatsapp: "" });
  const [formClient, setFormClient] = useState({ nom: "", whatsapp: "" });
  const [codeInvite, setCodeInvite] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  // TOTAL COMMISSIONS - Règle 20% 1er mois seulement, calculée automatiquement
  const totalCommission = mesPersonnes.reduce((s, p) => s + p.commission, 0);
  const totalPremierMois = mesPersonnes.filter(p => p.mois === 1).length;
  const totalPersonnes = mesPersonnes.length;

  // CRÉER UNE BOUTIQUE AVEC SON CODE VISUEL
  const creerBoutique = () => {
    if (!formBoutique.nom || formBoutique.whatsapp.length < 9) return showToast("Nom boutique + WhatsApp obligatoires.");
    // Commission future : si cette boutique achète un ticket ce mois-ci, l'Ambassadeur aura 20%
    setMesPersonnes(p => [...p, { id: `P-${Date.now()}`, nom: formBoutique.nom, whatsapp: formBoutique.whatsapp, type: "BOUTIQUE", date: "À l'instant", ticket: 0, mois: 1, commission: 0 }]);
    showToast(`✅ Boutique ${formBoutique.nom} créée avec ton code ${monCodePro}. Si elle achète un ticket ce 1er mois, tu gagnes 20%.`);
    setFormBoutique({ nom: "", vendeur: "", whatsapp: "" });
  };

  // CRÉER UN CLIENT AVEC SON CODE VISUEL
  const creerClient = () => {
    if (!formClient.nom || formClient.whatsapp.length < 9) return showToast("Nom client + WhatsApp obligatoires.");
    setMesPersonnes(p => [...p, { id: `P-${Date.now()}`, nom: formClient.nom, whatsapp: formClient.whatsapp, type: "CLIENT", date: "À l'instant", ticket: 0, mois: 1, commission: 0 }]);
    showToast(`✅ Client ${formClient.nom} créé avec ton code ${monCodePro}. Si il achète un ticket ce 1er mois, tu gagnes 20%.`);
    setFormClient({ nom: "", whatsapp: "" });
  };

  // CRÉER UN NOUVEL AMBASSADEUR - Droit : un Ambassadeur peut créer un autre Ambassadeur
  const creerAmbassadeur = () => {
    if (!codeInvite || codeInvite.length < 3) return showToast("Mets le nom du nouvel Ambassadeur.");
    const nouveauCode = `AMB-${codeInvite.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    showToast(`✅ Nouvel Ambassadeur ${codeInvite} créé par toi. Son code pro : ${nouveauCode}. Il est sous ta supervision. Le DG validera.`);
    setCodeInvite("");
  };

  const copierLien = () => { navigator.clipboard.writeText(monLien); showToast("🔗 Lien de parrainage copié. Partage-le."); };
  const copierCode = () => { navigator.clipboard.writeText(monCodePro); showToast(`Code ${monCodePro} copié.`); };
  const deconnecter = () => { document.cookie = "wenze-role=; path=/; max-age=0"; router.push("/dg-prive/connexion"); };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-20">
      {toast && <div className="fixed top-4 left-4 right-4 z-50 max-w-[400px] mx-auto bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center shadow-lg">{toast}</div>}

      {/* CARTE D'IDENTITÉ VISUELLE - AMBASSADEUR */}
      <div className="bg-[#FF6B00] text-white px-5 pt-8 pb-5 rounded-b-[28px]">
        <div className="flex justify-between items-start">
          <p className="text-[11px] opacity-80">WENZE • CARTE AMBASSADEUR</p>
          <button onClick={deconnecter} className="bg-white/20 px-3 py-1.5 rounded-full text-[11px] font-bold">↩ Quitter</button>
        </div>

        <div className="bg-white text-black rounded-2xl p-4 mt-3 flex justify-between items-center shadow-lg">
          <div>
            <p className="text-[10px] font-black tracking-widest text-gray-500">AMBASSADEUR WENZE</p>
            <p className="font-black text-[16px] mt-1">🎖️ {monNom}</p>
            <p className="text-[11px] text-gray-600 mt-0.5">{monParrain}</p>
            <p className="text-[10px] text-orange-600 font-bold mt-1">Commission : 20% • 1er mois seulement</p>
          </div>
          <div className="text-center shrink-0">
            <div className="w-[58px] h-[58px] bg-[#FF6B00] text-white rounded-full flex items-center justify-center font-black text-[16px]">A</div>
            <p className="text-[9px] font-black mt-1 bg-black text-white px-2 py-0.5 rounded-full">{monCodePro}</p>
          </div>
        </div>

        {/* GAINS RAPIDES */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white/15 rounded-2xl p-3 text-center"><p className="font-black text-[16px]">{totalCommission.toLocaleString()}</p><p className="text-[10px] opacity-80">CDF gagnés</p></div>
          <div className="bg-white/15 rounded-2xl p-3 text-center"><p className="font-black text-[16px]">{totalPersonnes}</p><p className="text-[10px] opacity-80">Personnes créées</p></div>
          <div className="bg-white/15 rounded-2xl p-3 text-center"><p className="font-black text-[16px]">{totalPremierMois}</p><p className="text-[10px] opacity-80">En 1er mois</p></div>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1.5 px-4 mt-4">
        {(["ACCUEIL", "GAINS", "CREER", "PARRAINAGE"] as const).map(t => (
          <button key={t} onClick={() => setOnglet(t)} className={`flex-1 py-3 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>
            {t === "ACCUEIL" ? "🏠 Accueil" : t === "GAINS" ? "💰 Gains" : t === "CREER" ? "➕ Créer" : "🔗 Lien"}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {onglet === "ACCUEIL" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">💡 Comment tu gagnes ?</p>
              <p className="text-[12px] text-gray-600 mt-2 leading-relaxed">1. Tu crées une boutique ou un client avec ton code <b>{monCodePro}</b>.<br />2. Si cette personne achète un ticket <b>pendant son 1er mois</b>, tu gagnes <b>20%</b> du ticket.<br />3. À partir du <b>2ème mois</b>, tu ne gagnes plus sur elle. C'est la règle WENZE.<br />4. Pour continuer à gagner, tu dois créer de nouvelles personnes.</p>
              <div className="bg-[#FFF2CC] border border-dashed rounded-xl p-3 mt-3">
                <p className="text-[11px] font-black">Exemple réel :</p>
                <p className="text-[11px] mt-1">Ticket 50 000 CDF → Tu gagnes <b>10 000 CDF</b> (20%) le 1er mois. Le 2ème mois → <b>0 CDF</b> sur cette personne.</p>
              </div>
            </div>
            <button onClick={() => setOnglet("CREER")} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-[13px]">➕ Créer une Boutique / Client avec mon code</button>
            <button onClick={() => setOnglet("PARRAINAGE")} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px]">🔗 Partager mon lien de parrainage</button>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">Mes dernières créations</p>
              {mesPersonnes.slice(0, 3).map(p => (
                <div key={p.id} className="flex justify-between py-2 border-b last:border-0">
                  <div><p className="text-[12px] font-bold">{p.nom}</p><p className="text-[11px] text-gray-500">{p.type} • {p.date} • Mois {p.mois}</p></div>
                  <p className={`font-black text-[12px] ${p.commission > 0 ? "text-green-600" : "text-gray-400"}`}>{p.commission > 0 ? `+${p.commission.toLocaleString()} CDF` : "0 CDF (Mois 2+)"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {onglet === "GAINS" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-5 text-center">
              <p className="text-[11px] opacity-70">TOTAL COMMISSIONS (20% 1er mois seulement)</p>
              <p className="font-black text-[28px] mt-1">{totalCommission.toLocaleString()} <span className="text-[14px]">CDF</span></p>
              <p className="text-[11px] opacity-70 mt-1">Paiement fin du mois par le DG</p>
            </div>
            {mesPersonnes.map(p => (
              <div key={p.id} className="bg-white border rounded-2xl p-4">
                <div className="flex justify-between"><p className="font-black text-[13px]">{p.type === "BOUTIQUE" ? "🏪" : "👤"} {p.nom}</p><span className={`text-[10px] font-black px-2 py-1 rounded-full h-fit ${p.mois === 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{p.mois === 1 ? "1ER MOIS • 20%" : `MOIS ${p.mois} • 0%`}</span></div>
                <p className="text-[11px] text-gray-500 mt-1">{p.whatsapp} • Créé : {p.date}</p>
                <p className="text-[12px] mt-2">Ticket acheté : <b>{p.ticket > 0 ? `${p.ticket.toLocaleString()} CDF` : "Pas encore acheté"}</b> → Ta commission : <b className={p.commission > 0 ? "text-green-600" : "text-gray-400"}>{p.commission.toLocaleString()} CDF</b></p>
                {p.mois > 1 && <p className="text-[11px] text-gray-400 mt-1">⚠️ Cette personne est au mois {p.mois}, tu ne gagnes plus sur elle. Crée de nouvelles personnes pour continuer à gagner.</p>}
              </div>
            ))}
          </div>
        )}

        {onglet === "CREER" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["BOUTIQUE", "CLIENT"] as const).map(t => (
                <button key={t} onClick={() => setTypeCreation(t)} className={`flex-1 py-3 rounded-full text-[11px] font-black ${typeCreation === t ? "bg-black text-white" : "bg-white border"}`}>{t === "BOUTIQUE" ? "🏪 Boutique" : "👤 Client"}</button>
              ))}
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">➕ Créer avec ton code visuel</p>
              <p className="text-[11px] text-gray-500 mt-1">Code utilisé : <b>{monCodePro}</b> • La personne sera liée à toi pour sa commission 1er mois.</p>
              {typeCreation === "BOUTIQUE" ? (
                <div className="space-y-2 mt-3">
                  <input value={formBoutique.nom} onChange={e => setFormBoutique({ ...formBoutique, nom: e.target.value })} placeholder="Nom de la boutique" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <input value={formBoutique.vendeur} onChange={e => setFormBoutique({ ...formBoutique, vendeur: e.target.value })} placeholder="Nom du vendeur" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <input value={formBoutique.whatsapp} onChange={e => setFormBoutique({ ...formBoutique, whatsapp: e.target.value })} placeholder="WhatsApp boutique" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <button onClick={creerBoutique} className="w-full bg-[#FF6B00] text-white py-3.5 rounded-full font-black text-[12px]">✅ Créer la Boutique</button>
                </div>
              ) : (
                <div className="space-y-2 mt-3">
                  <input value={formClient.nom} onChange={e => setFormClient({ ...formClient, nom: e.target.value })} placeholder="Nom du client" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <input value={formClient.whatsapp} onChange={e => setFormClient({ ...formClient, whatsapp: e.target.value })} placeholder="WhatsApp client" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
                  <button onClick={creerClient} className="w-full bg-[#FF6B00] text-white py-3.5 rounded-full font-black text-[12px]">✅ Créer le Client</button>
                </div>
              )}
            </div>

            {/* CRÉER UN AUTRE AMBASSADEUR - Droit Ambassadeur */}
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">🎖️ Créer un nouvel Ambassadeur</p>
              <p className="text-[11px] text-gray-500 mt-1">Un Ambassadeur peut créer un autre Ambassadeur. Le DG (Super Superviseur) validera.</p>
              <input value={codeInvite} onChange={e => setCodeInvite(e.target.value)} placeholder="Nom du nouvel Ambassadeur" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none mt-3" />
              <button onClick={creerAmbassadeur} className="w-full bg-black text-white py-3.5 rounded-full font-black text-[12px] mt-2">✅ Créer l'Ambassadeur</button>
            </div>
          </div>
        )}

        {onglet === "PARRAINAGE" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 text-center">
              <p className="font-black text-[14px]">🔗 Ton lien de parrainage</p>
              <p className="text-[11px] text-gray-500 mt-1">Partage ce lien. Toute personne qui s'inscrit avec ce lien est liée à ton code.</p>
              <div className="bg-gray-50 border rounded-xl p-3 mt-3 text-[11px] break-all font-bold">{monLien}</div>
              <button onClick={copierLien} className="w-full bg-black text-white py-3.5 rounded-full font-black text-[12px] mt-3">📋 Copier le lien</button>
              <button onClick={copierCode} className="w-full bg-[#FF6B00] text-white py-3.5 rounded-full font-black text-[12px] mt-2">📋 Copier mon code visuel : {monCodePro}</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Rejoins WENZE avec mon code ${monCodePro} : ${monLien}`)}`} target="_blank" className="block w-full bg-green-600 text-white py-3.5 rounded-full font-black text-[12px] mt-2 text-center">💬 Partager sur WhatsApp</a>
            </div>
            <div className="bg-[#FFF2CC] border border-dashed rounded-2xl p-4">
              <p className="font-black text-[12px]">Rappel de la règle commission :</p>
              <p className="text-[11px] mt-1 leading-relaxed">Tu gagnes 20% sur le ticket du 1er mois seulement. Si tu partages ton lien aujourd'hui, et que la personne achète son ticket dans 20 jours, tu gagnes 20%. Si elle achète le 2ème mois, tu gagnes 0 CDF. Donc partage vite et aide-la à acheter son ticket ce mois-ci.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
    }
