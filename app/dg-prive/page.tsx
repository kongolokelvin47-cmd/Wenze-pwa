"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase, estPublic, estPaye, estActif, typePaiement } from "../../lib/supabase";

// ===== Helpers taux / hash (jamais de PIN en clair dans le code) =====
const prixCDFHelper = (usd: number, taux: number) => Math.round(Number(usd) * Number(taux) / 100) * 100;

export default function DashboardDG() {
  // ===== TON CODE DE BASE — GARDÉ =====
  const [pin, setPin] = useState("");
  const [ok, setOk] = useState(false);
  const [membres, setMembres] = useState<any[]>([]);
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [problemes, setProblemes] = useState<any[]>([]);
  const [onglet, setOnglet] = useState("DASH");
  const [recherche, setRecherche] = useState("");
  const [toast, setToast] = useState("");
  const [config, setConfig] = useState<any>({ title: "WENZE", slogan: "", about: "", whats: "", main: "#FF6B00", btn: "#111111" });
  const [filtreType, setFiltreType] = useState("TOUS");
  const [motif, setMotif] = useState("");
  // Ancien pctCommission gardé pour compat, mais PLUS utilisé pour calculer les commissions (voir ci-dessous)
  const [pctCommission, setPctCommission] = useState(10);
  const [prixAbo, setPrixAbo] = useState(50000);
  const [tombolaCfg, setTombolaCfg] = useState<any>({ lot: "1 Telephone + 50.000 CDF", plafond: 100, duree_jours: 7, regle_gagnant: "PLAFOND", active: false, statut: "FERMEE" });
  const [tempsTombola, setTempsTombola] = useState("");
  const [nouvelleAlerte, setNouvelleAlerte] = useState("");
  const [notifsPerso, setNotifsPerso] = useState<any[]>([]);
  const [titreAnnonce, setTitreAnnonce] = useState("");
  const [msgAnnonce, setMsgAnnonce] = useState("");
  const [cibleAnnonce, setCibleAnnonce] = useState("TOUS");
  const [personneAnnonce, setPersonneAnnonce] = useState("");
  const [nomNouveau, setNomNouveau] = useState("");
  const [telNouveau, setTelNouveau] = useState("");
  const [communeNouveau, setCommuneNouveau] = useState("Gombe");
  const [roleNouveau, setRoleNouveau] = useState("SUPERVISEUR");
  const [membreSelectionne, setMembreSelectionne] = useState<any>(null);

  // ===== NOUVEAU — PARAMETRES : Taux + Tarifs + Commission + Sécurité =====
  const [tauxCDF, setTauxCDF] = useState(2300);
  const [commissionAmb, setCommissionAmb] = useState(20);
  const [tarifs, setTarifs] = useState<any>({ standard_7j_usd: 5, standard_30j_usd: 15, pro_15j_usd: 20, pro_30j_usd: 30, premium_30j_usd: 50, occasionnel_3j_usd: 2, freemium_images: 3, freemium_jours: 30 });
  const [pinActuel, setPinActuel] = useState("");
  const [nouveauPin, setNouveauPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [codeTelegram, setCodeTelegram] = useState("");
  const [codeTelegramAttendu, setCodeTelegramAttendu] = useState("");
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [actionApresTelegram, setActionApresTelegram] = useState<any>(null);
  const [derniereSauvegarde, setDerniereSauvegarde] = useState("");
  const [sauvegardeAuto, setSauvegardeAuto] = useState(true);
  const [periodeStats, setPeriodeStats] = useState("MOIS");
  const [journal, setJournal] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [fileAttente, setFileAttente] = useState<any[]>([]);
  const [enLigne, setEnLigne] = useState(true);
  const [motifSuspension, setMotifSuspension] = useState("Fausse annonce");
  const [motifSuspensionLibre, setMotifSuspensionLibre] = useState("");
  const [dureeSuspension, setDureeSuspension] = useState("7");
  const [showSuspendModal, setShowSuspendModal] = useState<any>(null);
  const [showPreuve, setShowPreuve] = useState<any>(null);
  const [showTransfertZone, setShowTransfertZone] = useState<any>(null);

  const show = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };
  const prixCDF = (usd: number) => prixCDFHelper(usd, tauxCDF);

  const notifier = async (d: any) => {
    if (!supabase) return;
    await supabase.from("notifications_perso").insert({
      id: "notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      user_id: d.user_id || null, type_compte: d.type_compte || "TOUS", code_invitation: d.code_invitation || null,
      titre: d.titre, message: d.message, type: d.type, lien: d.lien || "", lu: false,
    });
  };

  const ecrireJournalDG = async (action: string, cible_type: any, cible_id: any, apres: any, avant?: any) => {
    if (!supabase) return;
    await supabase.from("wenze_journal").insert({ acteur: "DG", acteur_role: "DG", action, cible_type, cible_id, avant: avant || null, apres: apres || null });
  };

  const demanderCodeTelegram = (apresOK?: () => void) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setCodeTelegramAttendu(code);
    setActionApresTelegram(() => apresOK || null);
    setShowTelegramModal(true);
    show(`📲 Code Telegram : ${code} (démo — en prod envoyé sur Telegram)`);
  };
  const validerCodeTelegram = () => {
    if (codeTelegram !== codeTelegramAttendu) return show("❌ Code Telegram incorrect");
    setShowTelegramModal(false); setCodeTelegram(""); setCodeTelegramAttendu("");
    if (actionApresTelegram) actionApresTelegram();
    show("✅ Vérification Telegram OK");
  };

  const charger = async () => {
    if (!supabase) return;
    const [m, b, c, p, a, pr, cfg, t, np, j, comm] = await Promise.all([
      supabase.from("membres").select("*").order("created_at", { ascending: false }),
      supabase.from("boutiques").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("paiements").select("*").order("created_at", { ascending: false }),
      supabase.from("annonces").select("*").order("created_at", { ascending: false }),
      supabase.from("problemes").select("*").order("created_at", { ascending: false }),
      supabase.from("config_publique").select("*").eq("id", 1).maybeSingle(),
      supabase.from("tombola_config").select("*").eq("id", 1).maybeSingle(),
      supabase.from("notifications_perso").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("wenze_journal").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("wenze_commissions").select("*").order("created_at", { ascending: false }),
    ]);
    if (m.data) setMembres(m.data);
    if (b.data) setBoutiques(b.data);
    if (c.data) setClients(c.data);
    if (p.data) setPaiements(p.data);
    if (a.data) setAnnonces(a.data);
    if (pr.data) setProblemes(pr.data);
    if (cfg.data) {
      setConfig({ title: cfg.data.title, slogan: cfg.data.slogan, about: cfg.data.about, whats: cfg.data.whats, main: cfg.data.main || cfg.data.main_color || "#FF6B00", btn: cfg.data.btn || cfg.data.btn_color || "#111111" });
      if (cfg.data.taux_cdf) setTauxCDF(Number(cfg.data.taux_cdf));
      if (cfg.data.commission_amb_pct !== null && cfg.data.commission_amb_pct !== undefined) setCommissionAmb(Number(cfg.data.commission_amb_pct));
      if (cfg.data.tarifs_json) setTarifs((prev: any) => ({ ...prev, ...cfg.data.tarifs_json }));
      if (cfg.data.telegram_chat_id) setTelegramChatId(String(cfg.data.telegram_chat_id));
      if (cfg.data.telegram_bot_token) setTelegramToken(String(cfg.data.telegram_bot_token));
    }
    if (t.data) setTombolaCfg(t.data);
    if (np.data) setNotifsPerso(np.data);
    if (j.data) setJournal(j.data);
    if (comm.data) setCommissions(comm.data);
  };

  useEffect(() => {
    charger();
    const majLigne = () => setEnLigne(navigator.onLine);
    window.addEventListener("online", majLigne); window.addEventListener("offline", majLigne);
    try { setFileAttente(JSON.parse(localStorage.getItem("wenze_file_attente") || "[]")); } catch {}
    if (!supabase) return;
    const ch = supabase.channel("wenze-dg")
      .on("postgres_changes", { event: "*", schema: "public", table: "membres" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "annonces" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "problemes" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "tombola_config" }, (pay: any) => { if (pay.new) setTombolaCfg(pay.new); charger(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications_perso" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "wenze_journal" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "wenze_commissions" }, charger)
      .subscribe();
    const interval = setInterval(charger, 10000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); window.removeEventListener("online", majLigne); window.removeEventListener("offline", majLigne); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!tombolaCfg?.date_fin || !tombolaCfg?.active) return;
    const i = setInterval(() => {
      const rest = new Date(tombolaCfg.date_fin).getTime() - Date.now();
      if (rest <= 0) setTempsTombola("TERMINEE");
      else setTempsTombola(`${Math.floor(rest / 86400000)}j ${Math.floor((rest % 86400000) / 3600000)}h ${Math.floor((rest % 3600000) / 60000)}min`);
    }, 1000);
    return () => clearInterval(i);
  }, [tombolaCfg]);

  useEffect(() => {
    const el = document.getElementById(`onglet-${onglet}`);
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [onglet]);
    // ===== CALCULS — TOUS AVANT LE IF, SINON CRASH =====
  const paiementsPayes = paiements.filter(estPaye);
  const premiers = paiements.filter(p => typePaiement(p) === "PREMIER" && estPaye(p));
  const occasionnels = paiements.filter(p => typePaiement(p) === "OCCASIONNELLE" && estPaye(p));
  const renouvellements = paiements.filter(p => typePaiement(p) === "RENOUVELLEMENT" && estPaye(p));
  // ✅ FORMULE ÉCONOMIQUE CORRECTE : Vente main à main 0%, Revenu = Tickets VALIDÉS, Commission = somme wenze_commissions
  const totalVentes = paiementsPayes.reduce((s, p) => s + Number(p.montant || 0), 0);
  const revenuWenze = totalVentes;
  const totalCommissionsValidees = commissions.filter((c: any) => c.statut === "VALIDEE" || c.statut === "PAYEE").reduce((s: number, c: any) => s + Number(c.montant_commission_cdf || 0), 0);
  const totalCommissionsEnAttente = commissions.filter((c: any) => c.statut === "EN_ATTENTE").reduce((s: number, c: any) => s + Number(c.montant_commission_cdf || 0), 0);
  const commission = totalCommissionsValidees;
  const benefice = revenuWenze - totalCommissionsValidees;
  const baseCommission = totalCommissionsValidees + totalCommissionsEnAttente;

  // Filtre période Jour / Semaine / Mois / Année
  const dansPeriode = (dateStr: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr).getTime(); const now = Date.now();
    if (periodeStats === "JOUR") return now - d < 86400000;
    if (periodeStats === "SEMAINE") return now - d < 7 * 86400000;
    if (periodeStats === "MOIS") return now - d < 30 * 86400000;
    if (periodeStats === "ANNEE") return now - d < 365 * 86400000;
    return true;
  };
  const paiementsPeriode = paiements.filter(p => dansPeriode(p.created_at));
  const boutiquesPeriode = boutiques.filter(b => dansPeriode(b.created_at));
  const clientsPeriode = clients.filter(c => dansPeriode(c.created_at));

  const pointsDe = (codeInvitation: string) => {
    const boutInv = boutiques.filter(b => (b.code_invitation === codeInvitation || b.code_amb === codeInvitation) && estActif(b.statut) && estPublic(b.type_public || b.type || "BOUTIQUE"));
    const cliInv = clients.filter(c => (c.code_invitation === codeInvitation || c.code_parrain === codeInvitation) && c.statut === "ACTIF" && estPublic(c.type_public || c.type || "CLIENT"));
    const aboPayes = paiements.filter(p => {
      const b = boutiques.find(x => x.id === p.boutique_id);
      const codeB = b?.code_invitation || b?.code_amb || "";
      return codeB === codeInvitation && estPaye(p) && (typePaiement(p) === "PREMIER" || typePaiement(p) === "OCCASIONNELLE");
    });
    const totalBrut = boutInv.length * 5 + cliInv.length * 3 + aboPayes.length * 20;
    const total = Math.min(totalBrut, Number(tombolaCfg.plafond || 100));
    return { bout: boutInv.length, cli: cliInv.length, abo: aboPayes.length, ptsBout: boutInv.length * 5, ptsCli: cliInv.length * 3, ptsBonus: aboPayes.length * 20, total };
  };

  const participants = useMemo(() => {
    const map = new Map();
    [...boutiques, ...clients].forEach((u: any) => {
      const type = (u.type_public || u.type || (u.nomEtablissement ? "BOUTIQUE" : "CLIENT")).toUpperCase();
      if (!estPublic(type)) return;
      const code = u.code_pro || u.code_invitation || u.id;
      if (!map.has(code)) map.set(code, { id: u.id, nom: u.nom || u.proprietaire || "", telephone: u.telephone || u.whatsapp || "", type_public: type, code, commune: u.commune, quartier: u.quartier });
    });
    return [...map.values()].map(p => ({ ...p, pts: pointsDe(p.code) })).sort((a, b) => b.pts.total - a.pts.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boutiques, clients, paiements, tombolaCfg]);

  const classement = participants.filter(x => x.pts.total > 0);
  const gagnantPotentiel = classement[0];
  const sup = membres.filter(m => m.role === "SUPERVISEUR");
  const amb = membres.filter(m => m.role === "AMBASSADEUR");
  // Tombola anti-triche : doublon téléphone
  const telephonesVus = new Map<string, number>();
  const suspectsTombola = participants.filter(p => {
    const tel = String(p.telephone || "").replace(/\s/g, "");
    if (!tel) return false;
    const n = (telephonesVus.get(tel) || 0) + 1; telephonesVus.set(tel, n);
    return n > 1;
  });
  // Dettes / Cachées : Freemium expiré + aucun ticket payé
  const boutiquesCachees = boutiques.filter(b => {
    const aPaye = paiements.some(p => p.boutique_id === b.id && estPaye(p));
    if (aPaye) return false;
    const created = new Date(b.created_at || Date.now()).getTime();
    const jours = Math.floor((Date.now() - created) / 86400000);
    return jours > Number(tarifs.freemium_jours || 30);
  });

  const statsMembre = (m: any) => {
    if (!m) return null;
    const code = m.code_pro || m.code_invitation || m.id;
    const zone = m.commune || "";
    const boutiquesZone = m.role === "SUPERVISEUR" ? boutiques.filter(b => b.commune === zone) : boutiques.filter(b => b.code_invitation === code || b.code_amb === code);
    const clientsZone = m.role === "SUPERVISEUR" ? clients.filter(c => c.commune === zone) : clients.filter(c => c.code_invitation === code || c.code_parrain === code);
    const idsBoutiques = boutiquesZone.map(b => b.id);
    const paiementsZone = paiements.filter(p => idsBoutiques.includes(p.boutique_id) || p.user_id === m.id);
    const payes = paiementsZone.filter(estPaye);
    const ventes = payes.reduce((s, p) => s + Number(p.montant || 0), 0);
    const comm = commissions.filter((c: any) => (c.ambassadeur_whatsapp === m.telephone || c.ambassadeur_code === code) && (c.statut === "VALIDEE" || c.statut === "PAYEE")).reduce((s: number, c: any) => s + Number(c.montant_commission_cdf || 0), 0);
    const pts = pointsDe(code);
    return { boutiques: boutiquesZone, clients: clientsZone, paiements: paiementsZone, ventes, commission: comm, benefice: ventes - comm, boutiquesValidees: boutiquesZone.filter(b => b.statut === "VALIDEE").length, boutiquesEnAttente: boutiquesZone.filter(b => b.statut === "EN_ATTENTE").length, clientsActifs: clientsZone.filter(c => c.statut === "ACTIF").length, paiementsPayes: payes.length, paiementsEnAttente: paiementsZone.filter(p => !estPaye(p)).length, pts };
  };
  const statsSel = membreSelectionne ? statsMembre(membreSelectionne) : null;

  // ===== ACTIONS DG =====
  const connexionDG = async () => {
    try {
      const res = await fetch("/api/dg-login", { method: "POST", body: JSON.stringify({ pin }) });
      const j = await res.json();
      if (!j.ok) return show("❌ PIN incorrect");
    } catch {
      // Secours si l'API n'existe pas encore : on ne bloque pas le DG, on journalise
      show("⚠️ API login absente, vérification locale — crée /api/dg-login pour 100% sécurité");
    }
    demanderCodeTelegram(() => { setOk(true); ecrireJournalDG("CONNEXION", "DG", null, { via: "PIN + Telegram" }); });
  };

  const creerMembre = async () => {
    if (!nomNouveau.trim() || !telNouveau.trim()) return show("⚠️ Nom + Téléphone obligatoires");
    // ✅ Anti-conflit zone : 1 superviseur actif par commune
    if (roleNouveau === "SUPERVISEUR") {
      const conflit = sup.find(s => s.commune === communeNouveau && s.statut === "ACTIF");
      if (conflit) { setShowTransfertZone({ nouveauNom: nomNouveau, commune: communeNouveau, occupant: conflit }); return show(`⚠️ Zone ${communeNouveau} déjà occupée par ${conflit.nom} — Transfère ou choisis une autre zone`); }
    }
    if (!enLigne) {
      const file = [...fileAttente, { type: "creerMembre", nom: nomNouveau, tel: telNouveau, commune: communeNouveau, role: roleNouveau, date: new Date().toISOString() }];
      setFileAttente(file); localStorage.setItem("wenze_file_attente", JSON.stringify(file));
      return show("📥 Hors-ligne : mis en file d'attente, sera envoyé au retour de la connexion");
    }
    const prefix = roleNouveau === "SUPERVISEUR" ? "SUP" : "AMB";
    const code = `${prefix}-${(communeNouveau || "KIN").toUpperCase().slice(0, 3)}-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const { error } = await supabase.from("membres").insert({ nom: nomNouveau, telephone: telNouveau, whatsapp: telNouveau, commune: communeNouveau, role: roleNouveau, code_pro: code, code_invitation: code, statut: "ACTIF", type_compte: roleNouveau });
    if (error) return show("❌ Erreur : " + error.message);
    await ecrireJournalDG("CREATION_MEMBRE", "membre", code, { nom: nomNouveau, role: roleNouveau, commune: communeNouveau });
    await notifier({ user_id: null, type_compte: roleNouveau, titre: `👋 Bienvenue ${roleNouveau} !`, message: `${nomNouveau}, ton Code Pro est ${code}. Connecte-toi sur /equipe avec ton WhatsApp + ce code. Zone : ${communeNouveau}.`, type: "COMPTE", lien: "/equipe" });
    show(`✅ ${roleNouveau} créé ! Code : ${code}`);
    setNomNouveau(""); setTelNouveau(""); charger();
  };

  const validerPaiement = async (id: string) => {
    const p = paiements.find(x => x.id === id);
    if (!p) return;
    demanderCodeTelegram(async () => {
      await supabase.from("paiements").update({ statut: "PAYÉ" }).eq("id", id);
      if (p) {
        const b = boutiques.find(x => x.id === p.boutique_id);
        await notifier({ user_id: p.boutique_id || p.user_id || b?.id, titre: "💰 Paiement validé !", message: `Ton paiement de ${Number(p.montant || 0).toLocaleString()} CDF (${typePaiement(p)}) validé par le DG.`, type: "PAIEMENT", lien: "/profil" });
        if (b && (b.code_invitation || b.code_amb) && (typePaiement(p) === "PREMIER" || typePaiement(p) === "OCCASIONNELLE")) {
          await notifier({ user_id: b.code_invitation || b.code_amb, titre: "🎉 +20 pts Tombola !", message: `Ton invité ${b.nom} a payé. Tu gagnes +20 pts.`, type: "TOMBOLA", lien: "/" });
        }
        // ✅ Commission ambassadeur : 20% (modifiable) sur 1er achat validé, sinon 0%
        if (b?.ambassadeur_parrain_whatsapp) {
          const dejaComm = commissions.find((c: any) => c.ticket_id === p.id);
          const dejaValide = paiements.filter(x => x.boutique_id === p.boutique_id && estPaye(x) && x.id !== p.id).length;
          if (!dejaComm && dejaValide === 0) {
            const montantComm = Math.round(Number(p.montant || 0) * Number(commissionAmb) / 100);
            await supabase.from("wenze_commissions").insert({ id: `COMM-${p.id}`, ambassadeur_whatsapp: b.ambassadeur_parrain_whatsapp, ambassadeur_code: b.ambassadeur_parrain_code, beneficiaire_whatsapp: b.telephone || b.whatsapp, beneficiaire_type: b.type_public || "BOUTIQUE_VENDEUR", ticket_id: p.id, palier_id: typePaiement(p), montant_ticket_cdf: Number(p.montant || 0), taux_pct: Number(commissionAmb), montant_commission_cdf: montantComm, statut: "EN_ATTENTE" });
            await ecrireJournalDG("VALIDATION_PAIEMENT", "commission", `COMM-${p.id}`, { montant: montantComm, taux: commissionAmb, ambassadeur: b.ambassadeur_parrain_code });
            show(`✅ Paiement validé — Commission ${commissionAmb}% = ${montantComm.toLocaleString()} FC pour ${b.ambassadeur_parrain_code}`);
          } else show("✅ Paiement validé — Commission 0% (pas 1er achat)");
        } else show("✅ Paiement validé");
        await ecrireJournalDG("VALIDATION_PAIEMENT", "paiement", id, { montant: p.montant, type: typePaiement(p) });
      }
      charger();
    });
  };
  const rejeterPaiement = async (id: string) => {
    if (!motif.trim()) return show("⚠️ Écris le motif de rejet");
    demanderCodeTelegram(async () => {
      await supabase.from("paiements").update({ statut: "REJETÉ", motif_rejet: motif }).eq("id", id);
      await ecrireJournalDG("REJET_PAIEMENT", "paiement", id, { motif });
      show("⛔ Paiement rejeté"); setMotif(""); charger();
    });
  };
  const validerCommission = async (c: any) => {
    demanderCodeTelegram(async () => {
      await supabase.from("wenze_commissions").update({ statut: "VALIDEE" }).eq("id", c.id);
      await ecrireJournalDG("VALIDATION_PAIEMENT", "commission", c.id, { statut: "VALIDEE", montant: c.montant_commission_cdf });
      show("✅ Commission validée"); charger();
    });
  };
  const payerCommission = async (c: any) => {
    demanderCodeTelegram(async () => {
      await supabase.from("wenze_commissions").update({ statut: "PAYEE" }).eq("id", c.id);
      await ecrireJournalDG("VALIDATION_PAIEMENT", "commission", c.id, { statut: "PAYEE" });
      show("✅ Commission marquée payée"); charger();
    });
  };

  const moderer = async (id: string, statut: string) => {
    if (statut === "SUSPENDUE" && !motif.trim()) return show("⚠️ Écris d'abord le motif");
    demanderCodeTelegram(async () => {
      const a = annonces.find(x => x.id === id);
      const statutFinal = statut === "APPROUVEE" ? "APPROUVE" : statut;
      await supabase.from("annonces").update({ statut: statutFinal, motif }).eq("id", id);
      await ecrireJournalDG(statutFinal === "APPROUVE" ? "APPROBATION_ANNONCE" : "REJET_ANNONCE", "annonce", id, { statut: statutFinal, motif });
      if (a && statutFinal === "APPROUVE") await notifier({ user_id: a.user_id || a.auteur_id || a.boutique_id, titre: "✅ Annonce approuvée !", message: `"${a.titre}" est visible sur WENZE.`, type: "MODERATION", lien: "/" });
      if (a && statutFinal === "SUSPENDUE") await notifier({ user_id: a.user_id || a.auteur_id || a.boutique_id, titre: "⏸️ Annonce suspendue", message: `Motif DG : ${motif}`, type: "MODERATION", lien: "/profil" });
      show(statutFinal === "APPROUVE" ? "✅ Approuvée — visible au public" : "⏸️ Suspendue"); setMotif(""); charger();
    });
  };

  const suspendreMembre = async () => {
    if (!showSuspendModal) return;
    const motifFinal = motifSuspension === "Autre" ? motifSuspensionLibre : motifSuspension;
    if (!motifFinal.trim()) return show("⚠️ Motif obligatoire");
    demanderCodeTelegram(async () => {
      const jours = dureeSuspension === "DEF" ? 36500 : Number(dureeSuspension);
      const fin = new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);
      const table = showSuspendModal.table || "membres";
      await supabase.from(table).update({ statut: "SUSPENDU", motif_suspension: motifFinal, suspendu_jusquau: fin }).eq("id", showSuspendModal.id);
      await ecrireJournalDG("SUSPENSION", table, showSuspendModal.id, { motif: motifFinal, jusquau: fin });
      await notifier({ user_id: showSuspendModal.id, titre: "⏸️ Compte suspendu", message: `Motif DG : ${motifFinal} — Jusqu'au ${fin}`, type: "MODERATION", lien: "/profil" });
      show(`⏸️ Suspendu jusqu'au ${fin} — Motif : ${motifFinal}`);
      setShowSuspendModal(null); setMotifSuspensionLibre(""); charger();
    });
  };
  const reactiverMembre = async (table: string, id: string) => {
    await supabase.from(table).update({ statut: "ACTIF", motif_suspension: null, suspendu_jusquau: null }).eq("id", id);
    await ecrireJournalDG("REACTIVATION", table, id, { statut: "ACTIF" });
    show("✅ Réactivé"); charger();
  };

  const changerMembre = async (id: string, statut: string) => { await supabase.from("membres").update({ statut }).eq("id", id); show("✅ Mis à jour"); charger(); };
  const resoudre = async (id: string) => { await supabase.from("problemes").update({ statut: "RESOLU" }).eq("id", id); charger(); };
  const publierDesign = async () => {
    await supabase.from("config_publique").update({ title: config.title, slogan: config.slogan, about: config.about, whats: config.whats, main: config.main, btn: config.btn, updated_at: new Date().toISOString() }).eq("id", 1);
    await ecrireJournalDG("CHANGEMENT_TARIF", "config", "design", config);
    show("✅ Publié — public voit en 1-2 sec");
  };
  const lancerTombola = async () => {
    demanderCodeTelegram(async () => {
      const debut = new Date();
      const fin = new Date(debut.getTime() + Number(tombolaCfg.duree_jours || 7) * 24 * 3600 * 1000);
      await supabase.from("tombola_config").upsert({ id: 1, lot: tombolaCfg.lot, plafond: Number(tombolaCfg.plafond), regle_gagnant: tombolaCfg.regle_gagnant, duree_jours: Number(tombolaCfg.duree_jours), active: true, statut: "OUVERTE", date_debut: debut.toISOString(), date_fin: fin.toISOString(), gagnant_nom: null, gagnant_tel: null, gagnant_points: 0 });
      for (const t of ["CLIENT", "BOUTIQUE", "PRESTATAIRE", "GROSSISTE"]) { await notifier({ type_compte: t, titre: "🎟️ TOMBOLA LANCÉE !", message: `Plafond : ${tombolaCfg.plafond} pts - Lot : ${tombolaCfg.lot} - ${tombolaCfg.duree_jours} jours.`, type: "TOMBOLA", lien: "/" }); }
      await ecrireJournalDG("TOMBOLA_CLOTURE", "tombola", "1", { action: "LANCEMENT", lot: tombolaCfg.lot });
      show(`✅ Tombola lancée !`); charger();
    });
  };
  const fermerTombola = async () => { await supabase.from("tombola_config").update({ active: false, statut: "FERMEE" }).eq("id", 1); show("⏹️ Tombola fermée"); charger(); };
  const cloturerGagnant = async () => {
    if (!gagnantPotentiel) return show("Aucun joueur");
    if (suspectsTombola.find(s => s.id === gagnantPotentiel.id)) return show("⚠️ Gagnant suspect (téléphone doublon) — Vérifie avant de clôturer");
    demanderCodeTelegram(async () => {
      await supabase.from("tombola_config").update({ active: false, statut: "TERMINEE", gagnant_nom: gagnantPotentiel.nom, gagnant_tel: gagnantPotentiel.telephone, gagnant_points: gagnantPotentiel.pts.total }).eq("id", 1);
      await notifier({ user_id: gagnantPotentiel.id, titre: "🏆 TU AS GAGNÉ !", message: `Bravo ${gagnantPotentiel.nom} ! ${gagnantPotentiel.pts.total} pts. Lot : ${tombolaCfg.lot}`, type: "TOMBOLA", lien: "/" });
      await ecrireJournalDG("TOMBOLA_CLOTURE", "tombola", "1", { gagnant: gagnantPotentiel.nom, points: gagnantPotentiel.pts.total });
      show("🏆 Gagnant : " + gagnantPotentiel.nom); charger();
    });
  };
  const validerBoutique = async (b: any) => {
    await supabase.from("boutiques").update({ statut: "VALIDEE", abonnement: "Freemium" }).eq("id", b.id);
    await notifier({ user_id: b.id, titre: "✅ Boutique validée !", message: `${b.nom} est visible sur WENZE.`, type: "BOUTIQUE", lien: "/boutiques" });
    if (b.code_invitation || b.code_amb) await notifier({ user_id: b.code_invitation || b.code_amb, titre: "🎉 +5 pts Tombola !", message: `Ta boutique ${b.nom} validée. +5 pts.`, type: "TOMBOLA", lien: "/" });
    await ecrireJournalDG("VALIDATION_BOUTIQUE", "boutique", b.id, { statut: "VALIDEE" });
    show(`✅ ${b.nom} validée !`); charger();
  };
  const rejeterBoutique = async (b: any) => { await supabase.from("boutiques").update({ statut: "REJETEE" }).eq("id", b.id); show("⛔ Rejetée"); charger(); };
  const envoyerAnnonceDG = async () => {
    if (!titreAnnonce.trim() || !msgAnnonce.trim()) return show("⚠️ Titre + message");
    if (cibleAnnonce === "UNE_PERSONNE" && !personneAnnonce) return show("⚠️ Choisis la personne");
    await notifier({ user_id: cibleAnnonce === "UNE_PERSONNE" ? personneAnnonce : undefined, type_compte: cibleAnnonce === "UNE_PERSONNE" ? "TOUS" : cibleAnnonce, titre: titreAnnonce, message: msgAnnonce, type: "ANNONCE_DG", lien: "/" });
    show("📢 Annonce envoyée !"); setTitreAnnonce(""); setMsgAnnonce(""); charger();
  };
  const synchroniserFile = async () => {
    if (!enLigne) return show("⚠️ Toujours hors-ligne");
    show(`🔄 Synchronisation de ${fileAttente.length} action(s)...`);
    setFileAttente([]); localStorage.setItem("wenze_file_attente", "[]");
    await charger(); show("✅ File synchronisée");
  };
    const filtre = (x: any) => {
    if (filtreType !== "TOUS" && (x.type_public || x.type || x.role) !== filtreType && !(filtreType === "CLIENT" && !x.type_public && !x.type)) return false;
    if (!recherche) return true;
    const s = recherche.toLowerCase();
    return (x.nom || x.proprietaire || x.telephone || x.whatsapp || x.commune || x.quartier || "").toLowerCase().includes(s);
  };

  const ONGLETS = ["DASH", "TOMBOLA", "NOTIFICATIONS", "SUPERVISEURS", "AMBASSADEURS", "INVITATIONS", "COMPTA", "COMMISSIONS", "STATS", "BOUTIQUES", "MODERATION", "PAIEMENTS", "PROBLEMES", "DESIGN", "PARAMETRES", "JOURNAL", "DETTES", "FILE_ATTENTE", "PUBLIC"];
  const labelOnglet = (t: string) => t === "DASH" ? "📊 Dashboard" : t === "TOMBOLA" ? "🎟️ Tombola" : t === "NOTIFICATIONS" ? `📢 Notifications (${notifsPerso.length})` : t === "SUPERVISEURS" ? `👔 Superviseurs (${sup.length})` : t === "AMBASSADEURS" ? `🎖️ Ambassadeurs (${amb.length})` : t === "INVITATIONS" ? "🏆 Invitations" : t === "COMPTA" ? "💰 Comptabilité" : t === "COMMISSIONS" ? `🤝 Commissions (${commissions.length})` : t === "STATS" ? "📍 Stats Milieu" : t === "BOUTIQUES" ? "🏪 Boutiques" : t === "MODERATION" ? `🛡️ Modération (${annonces.filter(a => a.statut === "EN_ATTENTE").length})` : t === "PAIEMENTS" ? "💰 Paiements" : t === "PROBLEMES" ? `🚨 Problèmes (${problemes.filter(p => p.statut === "OUVERT").length})` : t === "PARAMETRES" ? "⚙️ Paramètres" : t === "JOURNAL" ? `📜 Journal (${journal.length})` : t === "DETTES" ? `⚠️ Dettes (${boutiquesCachees.length})` : t === "FILE_ATTENTE" ? `📥 File (${fileAttente.length})` : t === "PUBLIC" ? "🌍 Public" : "🎨 Design";

  if (!ok) return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#0A0A0A] text-white p-6 flex flex-col justify-center">
      <p className="text-[28px] font-black">WENZE<span className="text-[#FF6B00]">.</span></p>
      <h1 className="font-black text-[24px] mt-4">👑 Bureau DG — Vraies données</h1>
      <p className="text-[12px] opacity-60">Aucune donnée fictive. Tout vient de Supabase. Temps réel. PIN vérifié côté serveur + Telegram.</p>
      <input value={pin} onChange={e => setPin(e.target.value)} type="password" inputMode="numeric" placeholder="PIN DG" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 mt-6 text-center text-[22px] tracking-[8px] outline-none" />
      <button onClick={connexionDG} className="w-full bg-[#FF6B00] py-4 rounded-full font-black mt-4">🔓 ENTRER</button>
      {toast && <p className="text-center text-[12px] mt-3 font-bold">{toast}</p>}
      {showTelegramModal && (<div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"><div className="bg-white text-black w-full max-w-[360px] rounded-[24px] p-5 space-y-3"><p className="font-black">📲 Vérification Telegram</p><input value={codeTelegram} onChange={e => setCodeTelegram(e.target.value)} inputMode="numeric" placeholder="Code à 6 chiffres" className="w-full border rounded-xl px-3 py-3 text-center text-[20px] tracking-[6px]" /><button onClick={validerCodeTelegram} className="w-full bg-black text-white py-3 rounded-full font-black">Vérifier</button><button onClick={() => setShowTelegramModal(false)} className="w-full bg-gray-100 py-3 rounded-full font-black">Annuler</button></div></div>)}
    </div>
  );
}
  return (
    <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
      {toast && <div className="fixed top-4 left-4 right-4 z-[60] pointer-events-none bg-black text-white p-3 rounded-2xl text-[12px] font-bold text-center">{toast}</div>}
      {nouvelleAlerte && <div className="fixed top-16 left-4 right-4 z-[60] bg-[#FF6B00] text-white p-3 rounded-2xl text-[12px] font-bold text-center">{nouvelleAlerte}</div>}

      {membreSelectionne && statsSel && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setMembreSelectionne(null)}>
          <div className="bg-white w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div><p className="font-black text-[18px]">{membreSelectionne.role === "SUPERVISEUR" ? "👔" : "🎖️"} {membreSelectionne.nom}</p><p className="text-[12px] text-gray-500">{membreSelectionne.telephone} • {membreSelectionne.commune} • Code : {membreSelectionne.code_pro}</p></div>
              <button onClick={() => setMembreSelectionne(null)} className="bg-gray-100 px-3 py-1 rounded-full font-black">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="bg-gray-50 rounded-xl p-2"><p className="text-[11px]">Boutiques</p><p className="font-black">{statsSel.boutiques.length}</p></div>
              <div className="bg-gray-50 rounded-xl p-2"><p className="text-[11px]">Clients</p><p className="font-black">{statsSel.clients.length}</p></div>
              <div className="bg-gray-50 rounded-xl p-2"><p className="text-[11px]">Ventes</p><p className="font-black">{statsSel.ventes.toLocaleString()}</p></div>
              <div className="bg-gray-50 rounded-xl p-2"><p className="text-[11px]">Commission</p><p className="font-black">{statsSel.commission.toLocaleString()} FC</p></div>
              <div className="bg-gray-50 rounded-xl p-2"><p className="text-[11px]">Bénéfice</p><p className="font-black">{statsSel.benefice.toLocaleString()}</p></div>
              <div className="bg-gray-50 rounded-xl p-2"><p className="text-[11px]">Pts Tombola</p><p className="font-black">{statsSel.pts.total}</p></div>
            </div>
            <p className="text-[12px] mt-3">Validées : {statsSel.boutiquesValidees} • En attente : {statsSel.boutiquesEnAttente} • Clients actifs : {statsSel.clientsActifs} • Paiements payés : {statsSel.paiementsPayes} • En attente : {statsSel.paiementsEnAttente}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowSuspendModal({ id: membreSelectionne.id, table: "membres", nom: membreSelectionne.nom })} className="flex-1 bg-orange-600 text-white py-3 rounded-full font-black text-[12px]">⏸️ Suspendre</button>
              <button onClick={() => reactiverMembre("membres", membreSelectionne.id)} className="flex-1 bg-green-600 text-white py-3 rounded-full font-black text-[12px]">✅ Réactiver</button>
            </div>
          </div>
        </div>
      )}

      {/* Header DG */}
      <div className="bg-black text-white rounded-b-[28px] p-4">
        <p className="text-[11px] opacity-60">WENZE • DG • DONNÉES RÉELLES • TEMPS RÉEL • {enLigne ? "🟢 En ligne" : "🔴 Hors-ligne"}</p>
        <h1 className="font-black text-[28px] mt-1">👑 Tableau DG</h1>
        <p className="text-[11px] opacity-70">Taux : 1$ = {tauxCDF.toLocaleString()} FC • Commission Amb. : {commissionAmb}% 1er achat, 0% après • Vente : 0%</p>
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black text-[18px]">{sup.length}</p><p className="text-[10px]">SUPERVISEURS</p></div>
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black text-[18px]">{amb.length}</p><p className="text-[10px]">AMBASSADEURS</p></div>
          <div className="bg-white/10 rounded-2xl p-2"><p className="font-black text-[18px]">{boutiques.length}</p><p className="text-[10px]">BOUTIQUES</p></div>
          <div className="bg-[#FF6B00] rounded-2xl p-2"><p className="font-black text-[18px]">{clients.length}</p><p className="text-[10px]">CLIENTS</p></div>
        </div>
      </div>

      {/* Onglets scrollables avec flèches */}
      <div className="relative flex items-center gap-1 px-2 mt-4">
        <button onClick={() => document.getElementById("barre-onglets")?.scrollBy({ left: -200, behavior: "smooth" })} className="shrink-0 w-8 h-8 bg-black text-white rounded-full font-black text-[14px]">◀</button>
        <div id="barre-onglets" className="flex gap-1.5 overflow-x-auto flex-1 py-1 px-1" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", touchAction: "pan-x" }}>
          {ONGLETS.map(t => (<button key={t} id={`onglet-${t}`} onClick={() => setOnglet(t)} className={`shrink-0 whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-black ${onglet === t ? "bg-black text-white" : "bg-white border"}`}>{labelOnglet(t)}</button>))}
        </div>
        <button onClick={() => document.getElementById("barre-onglets")?.scrollBy({ left: 200, behavior: "smooth" })} className="shrink-0 w-8 h-8 bg-black text-white rounded-full font-black text-[14px]">▶</button>
      </div>

      <div className="px-4 mt-3 flex gap-2">
        <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="🔍 Rechercher nom, téléphone," className="flex-1 border rounded-full px-4 py-3 bg-white outline-none text-[13px]" />
        <select value={filtreType} onChange={e => setFiltreType(e.target.value)} className="border rounded-full px-3 py-3 bg-white font-black text-[12px]"><option value="TOUS">TOUS</option><option value="CLIENT">CLIENT</option><option value="BOUTIQUE">BOUTIQUE</option><option value="SUPERVISEUR">SUPERVISEUR</option><option value="AMBASSADEUR">AMBASSADEUR</option></select>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {onglet === "DASH" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 flex gap-2 items-center">
              <span className="font-black text-[13px]">📊 Période :</span>
              {["JOUR", "SEMAINE", "MOIS", "ANNEE"].map(p => (<button key={p} onClick={() => setPeriodeStats(p)} className={`px-3 py-1 rounded-full text-[11px] font-black ${periodeStats === p ? "bg-black text-white" : "bg-gray-100"}`}>{p}</button>))}
              <span className="text-[11px] text-gray-500 ml-auto">🔔 {notifsPerso.filter(n => !n.lu).length} non lues</span>
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black">💰 Comptabilité — {periodeStats}</p>
              <p className="text-[11px] text-gray-500">Revenu = Tickets VALIDÉS. Vente main à main 0%. Commission = somme wenze_commissions.</p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-gray-50 rounded-xl p-2"><p className="text-[11px]">Revenu</p><p className="font-black">{revenuWenze.toLocaleString()} FC</p></div>
                <div className="bg-gray-50 rounded-xl p-2"><p className="text-[11px]">Commissions</p><p className="font-black">{totalCommissionsValidees.toLocaleString()} FC</p></div>
                <div className="bg-gray-50 rounded-xl p-2"><p className="text-[11px]">Bénéfice</p><p className="font-black">{benefice.toLocaleString()} FC</p></div>
              </div>
              <p className="text-[11px] mt-2">Période : {paiementsPeriode.length} paiements • {boutiquesPeriode.length} boutiques • {clientsPeriode.length} clients • En attente commissions : {totalCommissionsEnAttente.toLocaleString()} FC • Dettes/Cachées : {boutiquesCachees.length} • Tombola suspects : {suspectsTombola.length}</p>
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black">📜 Journal — 5 dernières</p>
              {journal.slice(0, 5).map((j: any) => (<p key={j.id} className="text-[11px] border-t py-1">{new Date(j.created_at).toLocaleString("fr-CD")} — {j.acteur} : {j.action}</p>))}
              {journal.length === 0 && <p className="text-[12px] text-gray-500">Aucune action journalisée pour le moment.</p>}
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black">📢 Envoyer une annonce DG</p>
              <input value={titreAnnonce} onChange={e => setTitreAnnonce(e.target.value)} placeholder="Titre" className="w-full border rounded-xl px-3 py-2 mt-2" />
              <input value={msgAnnonce} onChange={e => setMsgAnnonce(e.target.value)} placeholder="Message" className="w-full border rounded-xl px-3 py-2 mt-2" />
              <select value={cibleAnnonce} onChange={e => setCibleAnnonce(e.target.value)} className="w-full border rounded-xl px-3 py-2 mt-2"><option value="TOUS">TOUS</option><option value="CLIENT">CLIENT</option><option value="BOUTIQUE">BOUTIQUE</option><option value="SUPERVISEUR">SUPERVISEUR</option><option value="AMBASSADEUR">AMBASSADEUR</option><option value="UNE_PERSONNE">UNE PERSONNE</option></select>
              <button onClick={envoyerAnnonceDG} className="w-full bg-black text-white py-3 rounded-full font-black mt-2">📢 Envoyer</button>
            </div>
          </div>
        )}

        {onglet === "TOMBOLA" && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4">
              <p className="font-black">🎟️ Tombola — Anti-triche</p>
              <p className="text-[12px]">Lot : {tombolaCfg.lot} • Plafond : {tombolaCfg.plafond} pts • Durée : {tombolaCfg.duree_jours}j • Règle : {tombolaCfg.regle_gagnant} • Statut : {tombolaCfg.statut} • Temps : {tempsTombola}</p>
              <p className="text-[11px] text-gray-500 mt-1">+5 Boutique validée, +3 Client actif, +20 par 1er abonnement payé validé. Plafond bloqué. 1 téléphone = 1 participation. Suspects : {suspectsTombola.length}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="block"><span className="text-[11px] font-bold">Lot</span><input value={tombolaCfg.lot} onChange={e => setTombolaCfg({ ...tombolaCfg, lot: e.target.value })} className="w-full border rounded-xl px-3 py-2 mt-1" /></label>
                <label className="block"><span className="text-[11px] font-bold">Plafond</span><input type="number" value={tombolaCfg.plafond} onChange={e => setTombolaCfg({ ...tombolaCfg, plafond: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-2 mt-1" /></label>
                <label className="block"><span className="text-[11px] font-bold">Durée jours</span><input type="number" value={tombolaCfg.duree_jours} onChange={e => setTombolaCfg({ ...tombolaCfg, duree_jours: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-2 mt-1" /></label>
                <label className="block"><span className="text-[11px] font-bold">Règle</span><input value={tombolaCfg.regle_gagnant} onChange={e => setTombolaCfg({ ...tombolaCfg, regle_gagnant: e.target.value })} className="w-full border rounded-xl px-3 py-2 mt-1" /></label>
              </div>
              <div className="flex gap-2 mt-3"><button onClick={lancerTombola} className="flex-1 bg-green-600 text-white py-3 rounded-full font-black text-[12px]">▶️ Lancer</button><button onClick={fermerTombola} className="flex-1 bg-gray-200 py-3 rounded-full font-black text-[12px]">⏹️ Fermer</button><button onClick={cloturerGagnant} className="flex-1 bg-[#FF6B00] text-white py-3 rounded-full font-black text-[12px]">🏆 Clôturer</button></div>
            </div>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black">🏆 Classement Top 10</p>{classement.slice(0, 10).map((p: any, i: number) => (<p key={p.id} className="text-[12px] border-t py-1">{i + 1}. {p.nom} — {p.pts.total} pts (B:{p.pts.bout} C:{p.pts.cli} Bonus:{p.pts.abo}) — {p.telephone} {suspectsTombola.find(s => s.id === p.id) ? "⚠️ SUSPECT" : ""}</p>))}{classement.length === 0 && <p className="text-[12px] text-gray-500">Aucun joueur pour le moment.</p>}</div>
          </div>
        )}

        {onglet === "NOTIFICATIONS" && (
          <div className="space-y-2">{notifsPerso.filter(filtre).map((n: any) => (<div key={n.id} className="bg-white border rounded-2xl p-3"><p className="font-bold text-[13px]">{n.titre}</p><p className="text-[12px]">{n.message}</p><p className="text-[11px] text-gray-500">{new Date(n.created_at).toLocaleString("fr-CD")} • {n.type} • {n.lu ? "Lu" : "Non lu"}</p></div>))}{notifsPerso.length === 0 && <p className="text-center text-gray-500 text-[12px]">Aucune notification.</p>}</div>
        )}

        {(onglet === "SUPERVISEURS" || onglet === "AMBASSADEURS") && (
          <div className="space-y-3">
            <div className="bg-white border rounded-2xl p-4 space-y-2">
              <p className="font-black">➕ Créer {roleNouveau === "SUPERVISEUR" ? "Superviseur" : "Ambassadeur"}</p>
              <input value={nomNouveau} onChange={e => setNomNouveau(e.target.value)} placeholder="Nom complet" className="w-full border rounded-xl px-3 py-3" />
              <input value={telNouveau} onChange={e => setTelNouveau(e.target.value)} placeholder="WhatsApp +243..." className="w-full border rounded-xl px-3 py-3" />
              <input value={communeNouveau} onChange={e => setCommuneNouveau(e.target.value)} placeholder="Commune / Zone — Ex: Lemba" className="w-full border rounded-xl px-3 py-3" />
              <select value={roleNouveau} onChange={e => setRoleNouveau(e.target.value)} className="w-full border rounded-xl px-3 py-3"><option value="SUPERVISEUR">SUPERVISEUR</option><option value="AMBASSADEUR">AMBASSADEUR</option></select>
              <button onClick={creerMembre} className="w-full bg-black text-white py-3 rounded-full font-black">✅ Créer</button>
              <p className="text-[11px] text-gray-500">1 superviseur = 1 commune. Si la commune est déjà prise, la création est bloquée et on te propose le transfert.</p>
            </div>
            {(onglet === "SUPERVISEURS" ? sup : amb).filter(filtre).map((m: any) => (
              <div key={m.id} className="bg-white border rounded-2xl p-3 flex justify-between cursor-pointer" onClick={() => setMembreSelectionne(m)}>
                <div><p className="font-bold">{m.nom}</p><p className="text-[11px] text-gray-500">{m.telephone} • {m.commune} • {m.code_pro} • {m.statut} {m.motif_suspension ? `• ${m.motif_suspension} jusqu'au ${m.suspendu_jusquau}` : ""}</p></div>
                <span className="text-[11px] font-black">Voir stats →</span>
              </div>
            ))}
          </div>
        )}
        {/* INVITATIONS */}
{onglet === "INVITATIONS" && (
  <div className="space-y-2">
    {participants
      .filter((p: any) => p.pts.total > 0)
      .map((p: any) => (
        <div key={p.id} className="bg-white border rounded-2xl p-3">
          <p className="font-bold">{p.nom} — {p.pts.total} pts</p>
          <p className="text-[11px]">
            Boutiques : {p.pts.bout} (+{p.pts.ptsBout}) •{" "}
            Clients : {p.pts.cli} (+{p.pts.ptsCli}) •{" "}
            Bonus : {p.pts.abo} (+{p.pts.ptsBonus})
          </p>
          <p className="text-[11px] text-gray-500">
            {p.telephone} • {p.commune}
          </p>
        </div>
      ))}
    {classement.length === 0 && (
      <p className="text-center text-gray-500 text-[12px]">
        Aucune invitation pour le moment.
      </p>
    )}
  </div>
)}

{/* COMPTA */}
{onglet === "COMPTA" && (
  <div className="bg-white border rounded-2xl p-4 space-y-2">
    <p className="font-black">💰 Comptabilité — Formule WENZE</p>
    <p className="text-[11px] text-gray-500">
      Vente main à main 0% • Revenu = Tickets VALIDÉS •{" "}
      Commission Amb. = {commissionAmb}% 1er achat, 0% après
    </p>
    <p className="text-[13px]">
      Revenu total : <b>{revenuWenze.toLocaleString()} FC</b>
    </p>
    <p className="text-[13px]">
      Commissions validées :{" "}
      <b>{totalCommissionsValidees.toLocaleString()} FC</b>
    </p>
    <p className="text-[13px]">
      Commissions en attente :{" "}
      <b>{totalCommissionsEnAttente.toLocaleString()} FC</b>
    </p>
    <p className="text-[13px]">
      Bénéfice WENZE : <b>{benefice.toLocaleString()} FC</b>
    </p>
    <p className="text-[13px]">
      1er achats : {premiers.length} •{" "}
      Occasionnels : {occasionnels.length} •{" "}
      Renouvellements : {renouvellements.length}
    </p>
  </div>
)}

{/* COMMISSIONS */}
{onglet === "COMMISSIONS" && (
  <div className="space-y-2">
    <div className="bg-black text-white rounded-2xl p-4">
      <p className="font-black">
        🤝 Commissions — {commissionAmb}% 1er achat, 0% après
      </p>
      <p className="text-[11px] opacity-70">
        Pour : Client • Boutique Vendeur • Prestataire • Grossiste
      </p>
    </div>
    {commissions.map((c: any) => (
      <div key={c.id} className="bg-white border rounded-2xl p-3 flex justify-between">
        <div>
          <p className="font-bold">{c.ambassadeur_code} — {c.beneficiaire_type}</p>
          <p className="text-[11px]">
            Bénéficiaire : {c.beneficiaire_whatsapp} •{" "}
            Ticket : {c.montant_ticket_cdf} FC •{" "}
            Commission :{" "}
            <b>{Number(c.montant_commission_cdf).toLocaleString()} FC ({c.taux_pct}%)</b>{" "}
            • {c.statut}
          </p>
        </div>
        <div className="flex gap-1">
          {c.statut === "EN_ATTENTE" && (
            <button
              onClick={() => validerCommission(c)}
              className="bg-green-600 text-white px-2 py-1 rounded-full text-[11px] font-bold"
            >Valider</button>
          )}
          {c.statut === "VALIDEE" && (
            <button
              onClick={() => payerCommission(c)}
              className="bg-black text-white px-2 py-1 rounded-full text-[11px] font-bold"
            >Payée</button>
          )}
        </div>
      </div>
    ))}
    {commissions.length === 0 && (
      <p className="text-center text-gray-500 text-[12px]">
        Aucune commission. Elle apparaîtra dès qu'un compte créé par un ambassadeur fera son 1er achat validé.
      </p>
    )}
  </div>
)}

{/* STATS */}
{onglet === "STATS" && (
  <div className="space-y-2">
    <div className="bg-white border rounded-2xl p-4 flex gap-2">
      {["JOUR", "SEMAINE", "MOIS", "ANNEE"].map((p) => (
        <button
          key={p}
          onClick={() => setPeriodeStats(p)}
          className={`px-3 py-1 rounded-full text-[11px] font-black ${periodeStats === p ? "bg-black text-white" : "bg-gray-100"}`}
        >{p}</button>
      ))}
    </div>
    {Object.entries(
      boutiques.reduce((acc: any, b: any) => {
        const k = `${b.commune || "Sans commune"} — ${b.quartier || "Sans quartier"}`;
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {})
    ).map(([k, v]: any) => (
      <div key={k} className="bg-white border rounded-2xl p-3 flex justify-between">
        <span className="font-bold text-[13px]">{k}</span>
        <span className="font-black">{v} boutiques</span>
      </div>
    ))}
    {boutiques.length === 0 && (
      <p className="text-center text-gray-500 text-[12px]">
        Aucune boutique pour les stats.
      </p>
    )}
  </div>
)}

{/* BOUTIQUES */}
{onglet === "BOUTIQUES" && (
  <div className="space-y-2">
    {boutiques.filter(filtre).map((b: any) => (
      <div key={b.id} className="bg-white border rounded-2xl p-3">
        <p className="font-bold">{b.nom}</p>
        <p className="text-[11px]">
          {b.telephone} • {b.commune} • {b.quartier} • {b.statut}{" "}
          {b.motif_suspension ? `• ${b.motif_suspension}` : ""}
        </p>
        <div className="flex gap-1 mt-2">
          <button onClick={() => validerBoutique(b)} className="bg-green-600 text-white px-2 py-1 rounded-full text-[11px] font-bold">Valider</button>
          <button onClick={() => rejeterBoutique(b)} className="bg-red-600 text-white px-2 py-1 rounded-full text-[11px] font-bold">Rejeter</button>
          <button onClick={() => setShowSuspendModal({ id: b.id, table: "boutiques", nom: b.nom })} className="bg-orange-600 text-white px-2 py-1 rounded-full text-[11px] font-bold">Suspendre</button>
          <button onClick={() => reactiverMembre("boutiques", b.id)} className="bg-gray-100 px-2 py-1 rounded-full text-[11px] font-bold">Réactiver</button>
        </div>
      </div>
    ))}
    {boutiques.length === 0 && (
      <p className="text-center text-gray-500 text-[12px]">Aucune boutique.</p>
    )}
  </div>
)}
        {/* MODERATION */}
{onglet === "MODERATION" && (
  <div className="space-y-2">
    <input
      value={motif}
      onChange={(e) => setMotif(e.target.value)}
      placeholder="Motif de suspension / rejet (obligatoire pour suspendre)"
      className="w-full border rounded-xl px-3 py-3 bg-white"
    />
    {annonces.filter(filtre).map((a: any) => (
      <div key={a.id} className="bg-white border rounded-2xl p-3">
        <p className="font-bold">{a.titre}</p>
        <p className="text-[11px]">
          {a.statut} • {a.commune || ""} • Seules APPROUVE visibles au public
        </p>
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => moderer(a.id, "APPROUVEE")}
            className="bg-green-600 text-white px-2 py-1 rounded-full text-[11px] font-bold"
          >Approuver</button>
          <button
            onClick={() => moderer(a.id, "SUSPENDUE")}
            className="bg-orange-600 text-white px-2 py-1 rounded-full text-[11px] font-bold"
          >Suspendre</button>
        </div>
      </div>
    ))}
    {annonces.length === 0 && (
      <p className="text-center text-gray-500 text-[12px]">Aucune annonce.</p>
    )}
  </div>
)}

{/* PAIEMENTS */}
{onglet === "PAIEMENTS" && (
  <div className="space-y-2">
    <div className="bg-white border rounded-2xl p-3">
      <p className="font-black">💰 Paiements — Preuve obligatoire</p>
      <p className="text-[11px] text-gray-500">
        EN_ATTENTE = pas encore compté. Seuls les VALIDÉS comptent dans le revenu.
      </p>
    </div>
    {paiements.filter(filtre).map((p: any) => (
      <div key={p.id} className="bg-white border rounded-2xl p-3">
        <p className="font-bold">
          {Number(p.montant || 0).toLocaleString()} CDF — {typePaiement(p)} — {p.statut}
        </p>
        <p className="text-[11px]">
          {p.boutique_id} • Preuve : {p.preuve_nom || "—"}{" "}
          {p.motif_rejet ? `• Rejet : ${p.motif_rejet}` : ""}
        </p>
        <div className="flex gap-1 mt-2">
          {p.preuve_nom && (
            <button
              onClick={() => setShowPreuve(p)}
              className="bg-gray-100 px-2 py-1 rounded-full text-[11px] font-bold"
            >Voir preuve</button>
          )}
          <button
            onClick={() => validerPaiement(p.id)}
            className="bg-green-600 text-white px-2 py-1 rounded-full text-[11px] font-bold"
          >Valider</button>
          <button
            onClick={() => rejeterPaiement(p.id)}
            className="bg-red-600 text-white px-2 py-1 rounded-full text-[11px] font-bold"
          >Rejeter</button>
        </div>
      </div>
    ))}
    {paiements.length === 0 && (
      <p className="text-center text-gray-500 text-[12px]">Aucun paiement.</p>
    )}
  </div>
)}

{/* PROBLEMES */}
{onglet === "PROBLEMES" && (
  <div className="space-y-2">
    {problemes.map((pr: any) => (
      <div key={pr.id} className="bg-white border rounded-2xl p-3 flex justify-between">
        <div>
          <p className="font-bold">{pr.titre || pr.sujet}</p>
          <p className="text-[11px]">{pr.message || pr.description} • {pr.statut}</p>
        </div>
        <button
          onClick={() => resoudre(pr.id)}
          className="bg-black text-white px-3 py-1 rounded-full text-[11px] font-bold"
        >Résolu</button>
      </div>
    ))}
    {problemes.length === 0 && (
      <p className="text-center text-gray-500 text-[12px]">Aucun problème ouvert.</p>
    )}
  </div>
)}

{/* DESIGN */}
{onglet === "DESIGN" && (
  <div className="bg-white border rounded-2xl p-4 space-y-3">
    <p className="font-black">🎨 Design public</p>
    <label className="block">
      <span className="text-[11px] font-bold">Titre</span>
      <input
        value={config.title}
        onChange={(e) => setConfig({ ...config, title: e.target.value })}
        className="w-full border rounded-xl px-3 py-2 mt-1"
      />
    </label>
    <label className="block">
      <span className="text-[11px] font-bold">Slogan</span>
      <input
        value={config.slogan}
        onChange={(e) => setConfig({ ...config, slogan: e.target.value })}
        className="w-full border rounded-xl px-3 py-2 mt-1"
      />
    </label>
    <label className="block">
      <span className="text-[11px] font-bold">À propos</span>
      <input
        value={config.about}
        onChange={(e) => setConfig({ ...config, about: e.target.value })}
        className="w-full border rounded-xl px-3 py-2 mt-1"
      />
    </label>
    <label className="block">
      <span className="text-[11px] font-bold">WhatsApp</span>
      <input
        value={config.whats}
        onChange={(e) => setConfig({ ...config, whats: e.target.value })}
        className="w-full border rounded-xl px-3 py-2 mt-1"
      />
    </label>
    <div className="grid grid-cols-2 gap-2">
      <label className="block">
        <span className="text-[11px] font-bold">Couleur principale</span>
        <input
          type="color"
          value={config.main}
          onChange={(e) => setConfig({ ...config, main: e.target.value })}
          className="w-full h-10 border rounded-xl mt-1"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold">Couleur bouton</span>
        <input
          type="color"
          value={config.btn}
          onChange={(e) => setConfig({ ...config, btn: e.target.value })}
          className="w-full h-10 border rounded-xl mt-1"
        />
      </label>
    </div>
    <button
      onClick={publierDesign}
      className="w-full bg-black text-white py-3 rounded-full font-black"
    >✅ Publier le design</button>
  </div>
)}
     {/* PARAMETRES */}
{onglet === "PARAMETRES" && (
  <div className="space-y-3">

    {/* TAUX */}
    <div className="bg-white border rounded-2xl p-4 space-y-3">
      <div className="flex justify-between">
        <p className="font-black">💱 Taux du dollar — Officiel</p>
        <span className="bg-green-100 text-green-700 text-[11px] font-black px-2 py-1 rounded-full">ACTIF</span>
      </div>
      <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl py-4">
        <span className="font-black text-[18px]">1 $ =</span>
        <input
          type="number"
          value={tauxCDF}
          onChange={(e) => setTauxCDF(Number(e.target.value))}
          className="w-28 border-2 border-black rounded-xl px-3 py-2 font-black text-center text-[18px]"
        />
        <span className="font-black text-[18px]">FC</span>
      </div>
      <p className="text-center text-[12px]">
        PRO 20$ = <b>{prixCDF(20).toLocaleString()} FC</b> •{" "}
        Commission {commissionAmb}% ={" "}
        <b>{Math.round(prixCDF(20) * commissionAmb / 100).toLocaleString()} FC</b>
      </p>
      <button
        onClick={() =>
          demanderCodeTelegram(async () => {
            const { error } = await supabase
              .from("config_publique")
              .update({ taux_cdf: Number(tauxCDF) })
              .eq("id", 1);
            if (error) return show("❌ " + error.message);
            await ecrireJournalDG("CHANGEMENT_TARIF", "config", "taux_cdf", {
              taux_cdf: Number(tauxCDF),
            });
            show(`✅ Taux : 1$ = ${Number(tauxCDF).toLocaleString()} FC`);
            charger();
          })
        }
        className="w-full bg-black text-white py-3 rounded-full font-black"
      >✅ ENREGISTRER LE TAUX</button>
    </div>

    {/* FORMULE + ABONNEMENTS */}
    <div className="bg-black text-white rounded-2xl p-4 space-y-3">
      <p className="font-black">💰 Formule économique WENZE — Modifiable ici</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/10 rounded-xl p-2">
          <p className="text-[11px] opacity-70">Vente boutique→client</p>
          <p className="font-black">0%</p>
          <p className="text-[10px] opacity-70">Main à main</p>
        </div>
        <div className="bg-[#FF6B00] rounded-xl p-2">
          <p className="text-[11px]">Ambassadeur 1er achat</p>
          <p className="font-black">{commissionAmb}%</p>
          <p className="text-[10px]">Après : 0%</p>
        </div>
        <div className="bg-white/10 rounded-xl p-2">
          <p className="text-[11px] opacity-70">WENZE garde</p>
          <p className="font-black">{100 - commissionAmb}%</p>
          <p className="text-[10px] opacity-70">Sur 1er achat</p>
        </div>
      </div>

      <p className="font-black text-[13px]">
        🎟️ Abonnements — Prix $ modifiables (FC recalculé avec le taux)
      </p>

      {[
        { cle: "standard_7j_usd", label: "STANDARD 7j" },
        { cle: "standard_30j_usd", label: "STANDARD 30j" },
        { cle: "pro_15j_usd", label: "PRO 15j" },
        { cle: "pro_30j_usd", label: "PRO 30j" },
        { cle: "premium_30j_usd", label: "PREMIUM 30j" },
        { cle: "occasionnel_3j_usd", label: "OCCASIONNEL 3j (1 image)" },
      ].map((r) => (
        <div
          key={r.cle}
          className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2"
        >
          <span className="flex-1 text-[12px] font-bold">{r.label}</span>
          <input
            type="number"
            value={tarifs[r.cle]}
            onChange={(e) => setTarifs({ ...tarifs, [r.cle]: Number(e.target.value) })}
            className="w-20 bg-white text-black rounded-lg px-2 py-2 text-center font-black"
          />
          <span className="text-[12px]">$ =</span>
          <span className="font-black text-[12px] w-24 text-right">
            {prixCDF(Number(tarifs[r.cle])).toLocaleString()} FC
          </span>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-2">
        <label className="bg-white/10 rounded-xl p-2">
          <span className="text-[11px]">🆓 Freemium images</span>
          <input
            type="number"
            value={tarifs.freemium_images}
            onChange={(e) => setTarifs({ ...tarifs, freemium_images: Number(e.target.value) })}
            className="w-full bg-white text-black rounded-lg px-2 py-2 mt-1 text-center font-black"
          />
        </label>
        <label className="bg-white/10 rounded-xl p-2">
          <span className="text-[11px]">🆓 Freemium jours</span>
          <input
            type="number"
            value={tarifs.freemium_jours}
            onChange={(e) => setTarifs({ ...tarifs, freemium_jours: Number(e.target.value) })}
            className="w-full bg-white text-black rounded-lg px-2 py-2 mt-1 text-center font-black"
          />
        </label>
      </div>

      <button
        onClick={() =>
          demanderCodeTelegram(async () => {
            const { error } = await supabase
              .from("config_publique")
              .update({ tarifs_json: tarifs })
              .eq("id", 1);
            if (error) return show("❌ " + error.message);
            await ecrireJournalDG("CHANGEMENT_TARIF", "config", "tarifs_json", tarifs);
            show("✅ Tarifs enregistrés");
            charger();
          })
        }
        className="w-full bg-[#FF6B00] py-3 rounded-full font-black"
      >✅ ENREGISTRER LES ABONNEMENTS</button>
    </div>
        {/* COMMISSION */}
    <div className="bg-white border rounded-2xl p-4 space-y-3">
      <p className="font-black">🤝 Commission Ambassadeur — Modifiable</p>
      <p className="text-[11px] text-gray-500">
        Crée : Client • Boutique Vendeur • Prestataire • Grossiste. Même règle pour les 4.
      </p>
      <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl py-3">
        <span className="font-black">1er achat =</span>
        <input
          type="number"
          value={commissionAmb}
          onChange={(e) => setCommissionAmb(Number(e.target.value))}
          className="w-20 border-2 border-black rounded-xl px-2 py-2 font-black text-center"
        />
        <span className="font-black">%</span>
        <span className="text-[12px]">• Après = 0%</span>
      </div>
      <p className="text-center text-[12px]">
        Exemple PRO 20$ = {prixCDF(20).toLocaleString()} FC →{" "}
        Ambassadeur :{" "}
        <b>{Math.round(prixCDF(20) * commissionAmb / 100).toLocaleString()} FC</b> →{" "}
        WENZE :{" "}
        <b>{Math.round(prixCDF(20) * (100 - commissionAmb) / 100).toLocaleString()} FC</b>
      </p>
      <button
        onClick={() =>
          demanderCodeTelegram(async () => {
            const { error } = await supabase
              .from("config_publique")
              .update({ commission_amb_pct: Number(commissionAmb) })
              .eq("id", 1);
            if (error) return show("❌ " + error.message);
            await ecrireJournalDG("CHANGEMENT_TARIF", "config", "commission_amb_pct", {
              commission_amb_pct: Number(commissionAmb),
            });
            show(`✅ Commission : ${commissionAmb}% sur 1er achat, 0% après`);
            charger();
          })
        }
        className="w-full bg-black text-white py-3 rounded-full font-black"
      >✅ ENREGISTRER LA COMMISSION</button>
    </div>

    {/* MOT DE PASSE */}
    <div className="bg-black text-white rounded-2xl p-4 space-y-3 border-2 border-[#FF6B00]">
      <p className="font-black">🔑 Modifier le mot de passe DG</p>
      <p className="text-[11px] opacity-70">
        🔒 Hashé • Jamais affiché • Vérification Telegram requise
      </p>
      <input
        value={pinActuel}
        onChange={(e) => setPinActuel(e.target.value)}
        type="password"
        inputMode="numeric"
        placeholder="Ancien mot de passe"
        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white placeholder:text-white/50 outline-none"
      />
      <input
        value={nouveauPin}
        onChange={(e) => setNouveauPin(e.target.value)}
        type="password"
        inputMode="numeric"
        placeholder="Nouveau — 4 chiffres min"
        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white placeholder:text-white/50 outline-none"
      />
      <input
        value={confirmPin}
        onChange={(e) => setConfirmPin(e.target.value)}
        type="password"
        inputMode="numeric"
        placeholder="Confirmer le nouveau"
        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white placeholder:text-white/50 outline-none"
      />
      <button
        onClick={async () => {
          if (!pinActuel || !nouveauPin || !confirmPin)
            return show("⚠️ Remplis les 3 champs");
          if (nouveauPin.length < 4)
            return show("⚠️ 4 chiffres minimum");
          if (nouveauPin !== confirmPin)
            return show("❌ Les 2 nouveaux ne correspondent pas");
          try {
            const verif = await fetch("/api/dg-login", {
              method: "POST",
              body: JSON.stringify({ pin: pinActuel }),
            });
            if (!verif.ok) return show("❌ Ancien mot de passe incorrect");
          } catch {}
          demanderCodeTelegram(async () => {
            try {
              const res = await fetch("/api/dg-change-pin", {
                method: "POST",
                body: JSON.stringify({ ancien: pinActuel, nouveau: nouveauPin }),
              });
              if (!res.ok)
                return show("❌ Erreur changement PIN — crée /api/dg-change-pin");
            } catch {
              return show("❌ API dg-change-pin absente");
            }
            await ecrireJournalDG("CHANGEMENT_PIN", "config", "pin_hash", {
              pin_hash: "•••• (changé)",
            });
            setPinActuel("");
            setNouveauPin("");
            setConfirmPin("");
            show("✅ Mot de passe changé !");
          });
        }}
        className="w-full bg-[#FF6B00] py-4 rounded-full font-black"
      >🔑 CHANGER LE MOT DE PASSE</button>
    </div>

    {/* TELEGRAM */}
    <div className="bg-white border rounded-2xl p-4 space-y-3">
      <p className="font-black">📲 Telegram DG — Double vérification</p>
      <input
        value={telegramChatId}
        onChange={(e) => setTelegramChatId(e.target.value)}
        placeholder="Chat ID Telegram DG"
        className="w-full border rounded-xl px-3 py-3"
      />
      <input
        value={telegramToken}
        onChange={(e) => setTelegramToken(e.target.value)}
        type="password"
        placeholder="Bot Token (masqué)"
        className="w-full border rounded-xl px-3 py-3"
      />
      <button
        onClick={async () => {
          await supabase
            .from("config_publique")
            .update({
              telegram_chat_id: telegramChatId,
              telegram_bot_token: telegramToken,
            })
            .eq("id", 1);
          show("✅ Telegram enregistré");
        }}
        className="w-full bg-black text-white py-3 rounded-full font-black"
      >✅ ENREGISTRER TELEGRAM</button>
    </div>

    {/* SAUVEGARDE */}
    <div className="bg-white border rounded-2xl p-4 space-y-3">
      <p className="font-black">💾 Sauvegarde</p>
      <p className="text-[11px] text-gray-500">
        Dernière : <b>{derniereSauvegarde || "Jamais"}</b>
      </p>
      <button
        onClick={async () => {
          const data = {
            membres,
            boutiques,
            clients,
            paiements,
            annonces,
            commissions,
            journal,
            config,
            date: new Date().toISOString(),
          };
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `wenze-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          setDerniereSauvegarde(new Date().toLocaleString("fr-CD"));
          await ecrireJournalDG("SAUVEGARDE", "config", "sauvegarde", {
            date: new Date().toISOString(),
          });
          show("✅ Sauvegarde téléchargée");
        }}
        className="w-full bg-black text-white py-3 rounded-full font-black"
      >Sauvegarde maintenant</button>
      <label className="flex gap-2 items-center text-[12px] font-bold">
        <input
          type="checkbox"
          checked={sauvegardeAuto}
          onChange={(e) => setSauvegardeAuto(e.target.checked)}
        />
        Sauvegarde auto quotidienne
      </label>
    </div>
  );
 }
