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
        <div className="bg-white/10 rounded-xl px-3 py-2 mt-3 text-[11px] text-center">🔗 <b>TA CHAÎNE :</b> DG → {monCodePro} (Toi) → {ambassadeurs.length} Ambassadeurs</div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => { navigator.clipboard.writeText(monCodePro); showToast(`Code ${monCodePro} copié.`); }} className="flex-1 bg-[#FFD166] text-black py-2.5 rounded-full text-[11px] font-black">📋 Copier mon code : {monCodePro}</button>
        </div>
      </div>

      <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
        {["ACCUEIL", "BOUTIQUES", "AMBASSADEURS", "CREER", "RAPPORT", "LIEN"].map(t => (
          <button key={t} onClick={() => setOnglet(t)} className={`whitespace-nowrap px-3.5 py-2.5 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>
            {t === "ACCUEIL" ? "🏠 Accueil" : t === "BOUTIQUES" ? "🏪 Boutiques" : t === "AMBASSADEURS" ? "🎖️ Amb." : t === "CREER" ? "➕ Créer" : t === "RAPPORT" ? "📋 Rapport DG" : "🔗 Lien"}
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
              <p className="font-black text-[13px]">🎯 Tes pouvoirs</p>
              <p className="text-[12px] text-gray-600 mt-2 leading-relaxed">✅ Créer Ambassadeur, Boutique, Client avec ton code <b>{monCodePro}</b><br />✅ Contrôler les Ambassadeurs<br />✅ Superviser les boutiques et rapporter au DG<br />❌ Tu ne peux <b>ni supprimer ni bloquer</b>. Tu rapportes, le DG décide.</p>
            </div>
            <button onClick={() => setOnglet("CREER")} className="w-full bg-[#1A3A2F] text-white py-4 rounded-full font-black text-[13px]">➕ Créer Ambassadeur / Boutique / Client</button>
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
                <p className="text-[10px] text-gray-400 mt-0.5">🔗 Créée par : {b.codeAmb} → {monCodePro} → DG</p>
                {b.probleme && <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-xl mt-2">⚠️ Problème : {b.probleme}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setBoutiques(p => p.map(x => x.id === b.id ? { ...x, statut: "VALIDEE" } : x))} className="flex-1 bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">✅ Supervisé OK</button>
                  <button onClick={() => { setRapport({ sujet: `Problème boutique : ${b.nom}`, detail: `Boutique ${b.nom} - ${b.vendeur} - À vérifier.`, urgence: "NORMALE" }); setOnglet("RAPPORT"); }} className="flex-1 bg-orange-500 text-white py-2.5 rounded-full text-[11px] font-black">📋 Signaler au DG</button>
                  <a href={`https://wa.me/${b.whatsapp}`} target="_blank" className="px-3 py-2.5 bg-green-50 border rounded-full">💬</a>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Tu ne peux pas supprimer ou bloquer. Tu supervises et tu rapportes.</p>
              </div>
            ))}
          </div>
        )}

        {onglet === "AMBASSADEURS" && (
          <div className="space-y-3">
            <div className="bg-[#1A3A2F] text-white rounded-2xl p-4">
              <p className="font-black text-[13px]">🛡️ Mes Ambassadeurs liés</p>
              <p className="text-[11px] opacity-70 mt-1">Code : {monCodePro} • Sous TA supervision.</p>
            </div>
            {ambassadeurs.map(a => (
              <div key={a.id} className="bg-white border rounded-2xl p-4">
                <div className="flex justify-between"><p className="font-black text-[14px]">🎖️ {a.nom}</p><span className={`text-[10px] font-black px-2 py-1 rounded-full h-fit ${a.statut === "ACTIF" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{a.statut}</span></div>
                <p className="text-[11px] text-gray-500 mt-1">Code pro : <b>{a.codePro}</b> • {a.creePar}</p>
                <p className="text-[11px] text-gray-500">{a.filleuls} filleuls • {a.boutiquesCrees} boutiques • Dernier travail : {a.dernierTravail}</p>
                <p className="text-[10px] text-gray-400 mt-1">🔗 Lien : {a.codePro} → {monCodePro} → DG</p>
                <div className="flex gap-2 mt-3">
                  <a href={`https://wa.me/${a.whatsapp}`} target="_blank" className="flex-1 text-center bg-green-600 text-white py-2.5 rounded-full text-[11px] font-black">💬 Contacter</a>
                  <button onClick={() => { setRapport({ sujet: `Contrôle Ambassadeur : ${a.nom}`, detail: `Ambassadeur ${a.nom} (${a.codePro}) - ${a.filleuls} filleuls - Dernier travail : ${a.dernierTravail}`, urgence: "NORMALE" }); setOnglet("RAPPORT"); }} className="flex-1 bg-orange-500 text-white py-2.5 rounded-full text-[11px] font-black">📋 Signaler au DG</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet === "CREER" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {["AMBASSADEUR", "BOUTIQUE", "CLIENT"].map(t => (
                <button key={t} onClick={() => setTypeCreation(t)} className={`flex-1 py-3 rounded-full text-[11px] font-black ${typeCreation === t ? "bg-black text-white" : "bg-white border"}`}>{t}</button>
              ))}
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">➕ Créer un {typeCreation.toLowerCase()} avec ton code</p>
              <p className="text-[11px] text-gray-500 mt-1">Code utilisé : <b>{monCodePro}</b> • Lié à toi.</p>
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
            <p className="text-[11px] text-gray-500">Tu as vu un problème ? Tu ne bloques personne. Tu rapportes, et le DG décide.</p>
            <input value={rapport.sujet} onChange={e => setRapport({ ...rapport, sujet: e.target.value })} placeholder="Sujet Ex: Boutique avec fausse photo" className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
            <div className="flex gap-2">
              {["NORMALE", "URGENTE"].map(u => (
                <button key={u} onClick={() => setRapport({ ...rapport, urgence: u })} className={`flex-1 py-2.5 rounded-full text-[11px] font-black ${rapport.urgence === u ? (u === "URGENTE" ? "bg-red-600 text-white" : "bg-black text-white") : "bg-gray-100"}`}>{u}</button>
              ))}
            </div>
            <textarea value={rapport.detail} onChange={e => setRapport({ ...rapport, detail: e.target.value })} placeholder="Décris le problème : qui, quoi, où, quand..." rows={4} className="w-full border rounded-xl px-3 py-3 text-[13px] outline-none" />
            {dernierRapport && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3"><p className="text-[11px] font-bold">{dernierRapport}</p></div>}
            <button onClick={envoyerRapport} disabled={envoiEnCours} className="w-full bg-[#FF6B00] text-white py-4 rounded-full font-black text-[13px]">
              {envoiEnCours ? "Envoi..." : rapport.urgence === "URGENTE" ? "🚨 Envoyer + Alerter le DG sur son téléphone" : "📤 Envoyer le rapport au DG"}
            </button>
            <p className="text-[11px] text-gray-500 text-center">URGENTE = Telegram DG + WhatsApp<br />NORMALE = WhatsApp seulement</p>
          </div>
        )}

        {onglet === "LIEN" && (
          <div className="space-y-3">
            <div className="bg-black text-white rounded-2xl p-4 text-center">
              <p className="font-black text-[14px]">🔗 Ta Chaîne WENZE</p>
              <p className="text-[13px] mt-3 leading-loose">👑 DG<br />↓<br />🛡️ {monCodePro}<br />Toi - {monNom}<br />↓<br />🎖️ {ambassadeurs.length} Ambassadeurs<br />↓<br />🏪 {boutiques.length} Boutiques</p>
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">Tes Ambassadeurs</p>
              {ambassadeurs.map(a => <div key={a.id} className="flex justify-between py-2 border-b last:border-0"><p className="text-[12px] font-bold">{a.nom}</p><p className="text-[11px] text-gray-500">{a.codePro} → {monCodePro}</p></div>)}
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black text-[13px]">Tes Boutiques</p>
              {boutiques.map(b => <div key={b.id} className="flex justify-between py-2 border-b last:border-0"><p className="text-[12px] font-bold">{b.nom}</p><p className="text-[11px] text-gray-500">{b.statut}</p></div>)}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(monCodePro); showToast("Code copié : " + monCodePro); }} className="w-full bg-[#FFD166] text-black py-3.5 rounded-full font-black text-[12px]">📋 Copier mon code pro</button>
          </div>
        )}
      </div>
    </div>
  );
            }
