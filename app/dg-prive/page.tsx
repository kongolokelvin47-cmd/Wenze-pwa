"use client";
import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  estPublic,
  estPaye,
  estActif,
  typePaiement,
} from "../../lib/supabase";

const prixCDFHelper = (usd: number, taux: number) => {
  return Math.round(Number(usd) * Number(taux) / 100) * 100;
};

export default function DashboardDG() {
  // ===== ETATS DE BASE =====
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
  const [config, setConfig] = useState<any>({
    title: "WENZE",
    slogan: "",
    about: "",
    whats: "",
    main: "#FF6B00",
    btn: "#111111",
  });
  const [filtreType, setFiltreType] = useState("TOUS");
  const [motif, setMotif] = useState("");
  // ❌ SUPPRIMÉ : pctCommission (10%) et prixAbo (50000) morts
  // ✅ VRAIE SOURCE : commissionAmb (20%) + tarifs ci-dessous
  const [tombolaCfg, setTombolaCfg] = useState<any>({
    lot: "1 Telephone + 50.000 CDF",
    plafond: 100,
    duree_jours: 7,
    regle_gagnant: "PLAFOND",
    active: false,
    statut: "FERMEE",
  });
  const [tempsTombola, setTempsTombola] = useState("");
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

  // ===== PROBLEMES — BRANCHÉ ✅ =====
  const [filtreProbleme, setFiltreProbleme] = useState("TOUS");
  const [problemeSelectionne, setProblemeSelectionne] = useState<any>(null);
  const [reponseProbleme, setReponseProbleme] = useState("");
  const [statutProbleme, setStatutProbleme] = useState("EN_COURS");

  // ===== NOTIFS / ALERTES — BRANCHÉ ✅ =====
  const [filtreNotif, setFiltreNotif] = useState("TOUS");
  // nouvelleAlerte = texte de l'alerte DG, branchée sur publierAnnonce (Partie 5)
  const [nouvelleAlerte, setNouvelleAlerte] = useState("");
  const [titreAlerte, setTitreAlerte] = useState("");

  // ===== PARAMETRES : TAUX + TARIFS + COMMISSION =====
  const [tauxCDF, setTauxCDF] = useState(2300);
  const [commissionAmb, setCommissionAmb] = useState(20);
  // Alias pour compat : pctCommission = commissionAmb (toujours synchro)
  const pctCommission = commissionAmb;
  const [tarifs, setTarifs] = useState<any>({
    standard_7j_usd: 5,
    standard_30j_usd: 15,
    pro_15j_usd: 20,
    pro_30j_usd: 30,
    premium_30j_usd: 50,
    occasionnel_3j_usd: 2,
    freemium_images: 3,
    freemium_jours: 30,
  });
  // Alias pour compat : prixAbo = prix PRO 15j en FC (recalculé avec taux)
  const prixAbo = prixCDFHelper(Number(tarifs.pro_15j_usd || 20), tauxCDF);
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

  // ===== HELPERS =====
  const show = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 4000);
  };
  const prixCDF = (usd: number) => prixCDFHelper(usd, tauxCDF);

  const notifier = async (d: any) => {
    if (!supabase) return;
    await supabase.from("notifications_perso").insert({
      id: "notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      user_id: d.user_id || null,
      type_compte: d.type_compte || "TOUS",
      code_invitation: d.code_invitation || null,
      titre: d.titre,
      message: d.message,
      type: d.type,
      lien: d.lien || "",
      lu: false,
    });
  };

  const ecrireJournalDG = async (
    action: string,
    cible_type: any,
    cible_id: any,
    apres: any,
    avant?: any
  ) => {
    if (!supabase) return;
    await supabase.from("wenze_journal").insert({
      acteur: "DG",
      acteur_role: "DG",
      action,
      cible_type,
      cible_id,
      avant: avant || null,
      apres: apres || null,
    });
  };

  const demanderCodeTelegram = (apresOK?: () => void) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setCodeTelegramAttendu(code);
    setActionApresTelegram(() => apresOK || null);
    setShowTelegramModal(true);
    show("📲 Code Telegram : " + code + " (démo)");
  };

  const validerCodeTelegram = () => {
    if (codeTelegram !== codeTelegramAttendu) {
      return show("❌ Code Telegram incorrect");
    }
    setShowTelegramModal(false);
    setCodeTelegram("");
    setCodeTelegramAttendu("");
    if (actionApresTelegram) actionApresTelegram();
    show("✅ Vérification Telegram OK");
  };

  // ===== PROBLEMES : RÉPONDRE + CHANGER STATUT — BRANCHÉ ✅ =====
  const repondreProbleme = async (id: string) => {
    if (!reponseProbleme.trim()) return show("⚠️ Écris ta réponse");
    demanderCodeTelegram(async () => {
      await supabase.from("problemes").update({
        statut: statutProbleme,
        reponse_dg: reponseProbleme,
        date_reponse: new Date().toISOString(),
      }).eq("id", id);
      const pr = problemes.find((x) => x.id === id);
      if (pr) {
        await notifier({
          user_id: pr.user_id || pr.boutique_id || null,
          titre: "📩 Réponse DG à ton problème",
          message: reponseProbleme,
          type: "PROBLEME",
          lien: "/profil",
        });
      }
      await ecrireJournalDG("REPONSE_PROBLEME", "probleme", id, {
        statut: statutProbleme,
        reponse: reponseProbleme,
      });
      show("✅ Réponse envoyée");
      setReponseProbleme("");
      setProblemeSelectionne(null);
      charger();
    });
  };

  // ===== ALERTE DG : ENVOYER — BRANCHÉ ✅ =====
  // Utilise nouvelleAlerte + titreAlerte + cibleAnnonce
  const envoyerAlerteDG = async () => {
    const texte = (nouvelleAlerte || msgAnnonce).trim();
    const titre = (titreAlerte || titreAnnonce).trim() || "📢 Alerte DG";
    if (!texte) return show("⚠️ Écris le texte de l'alerte");
    await notifier({
      user_id: personneAnnonce || null,
      type_compte: cibleAnnonce,
      titre,
      message: texte,
      type: "ALERTE",
      lien: "",
    });
    await ecrireJournalDG("ALERTE", "notification", "alerte-" + Date.now(), {
      titre,
      cible: cibleAnnonce,
    });
    show("📢 Alerte envoyée");
    setNouvelleAlerte("");
    setTitreAlerte("");
    setMsgAnnonce("");
    charger();
  };
    // ===== PARAMETRES : TAUX + TARIFS + COMMISSION =====
  const [tauxCDF, setTauxCDF] = useState(2300);
  const [commissionAmb, setCommissionAmb] = useState(20);
  const [tarifs, setTarifs] = useState<any>({
    standard_7j_usd: 5,
    standard_30j_usd: 15,
    pro_15j_usd: 20,
    pro_30j_usd: 30,
    premium_30j_usd: 50,
    occasionnel_3j_usd: 2,
    freemium_images: 3,
    freemium_jours: 30,
  });
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

  // ===== HELPERS =====
  const show = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 4000);
  };
  const prixCDF = (usd: number) => prixCDFHelper(usd, tauxCDF);

  const notifier = async (d: any) => {
    if (!supabase) return;
    await supabase.from("notifications_perso").insert({
      id: "notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      user_id: d.user_id || null,
      type_compte: d.type_compte || "TOUS",
      code_invitation: d.code_invitation || null,
      titre: d.titre,
      message: d.message,
      type: d.type,
      lien: d.lien || "",
      lu: false,
    });
  };

  const ecrireJournalDG = async (
    action: string,
    cible_type: any,
    cible_id: any,
    apres: any,
    avant?: any
  ) => {
    if (!supabase) return;
    await supabase.from("wenze_journal").insert({
      acteur: "DG",
      acteur_role: "DG",
      action,
      cible_type,
      cible_id,
      avant: avant || null,
      apres: apres || null,
    });
  };

  const demanderCodeTelegram = (apresOK?: () => void) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setCodeTelegramAttendu(code);
    setActionApresTelegram(() => apresOK || null);
    setShowTelegramModal(true);
    show("📲 Code Telegram : " + code + " (démo)");
  };

  const validerCodeTelegram = () => {
    if (codeTelegram !== codeTelegramAttendu) {
      return show("❌ Code Telegram incorrect");
    }
    setShowTelegramModal(false);
    setCodeTelegram("");
    setCodeTelegramAttendu("");
    if (actionApresTelegram) actionApresTelegram();
    show("✅ Vérification Telegram OK");
  };
    // ===== CHARGER =====
  const charger = async () => {
    if (!supabase) return;
    const [m, b, c, p, a, pr, cfg, t, np, j, comm] =
      await Promise.all([
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
      setConfig({
        title: cfg.data.title,
        slogan: cfg.data.slogan,
        about: cfg.data.about,
        whats: cfg.data.whats,
        main: cfg.data.main || cfg.data.main_color || "#FF6B00",
        btn: cfg.data.btn || cfg.data.btn_color || "#111111",
      });
      if (cfg.data.taux_cdf) setTauxCDF(Number(cfg.data.taux_cdf));
      if (cfg.data.commission_amb_pct !== null && cfg.data.commission_amb_pct !== undefined) {
        setCommissionAmb(Number(cfg.data.commission_amb_pct));
      }
      if (cfg.data.tarifs_json) {
        setTarifs((prev: any) => ({ ...prev, ...cfg.data.tarifs_json }));
      }
      if (cfg.data.telegram_chat_id) setTelegramChatId(String(cfg.data.telegram_chat_id));
      if (cfg.data.telegram_bot_token) setTelegramToken(String(cfg.data.telegram_bot_token));
    }
    if (t.data) setTombolaCfg(t.data);
    if (np.data) setNotifsPerso(np.data);
    if (j.data) setJournal(j.data);
    if (comm.data) setCommissions(comm.data);
  };

  // ===== EFFETS =====
  useEffect(() => {
    charger();
    const majLigne = () => setEnLigne(navigator.onLine);
    window.addEventListener("online", majLigne);
    window.addEventListener("offline", majLigne);
    try {
      setFileAttente(JSON.parse(localStorage.getItem("wenze_file_attente") || "[]"));
    } catch {}
    if (!supabase) return;
    const ch = supabase
      .channel("wenze-dg")
      .on("postgres_changes", { event: "*", schema: "public", table: "membres" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "annonces" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "problemes" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "tombola_config" }, (pay: any) => {
        if (pay.new) setTombolaCfg(pay.new);
        charger();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications_perso" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "wenze_journal" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "wenze_commissions" }, charger)
      .subscribe();
    const interval = setInterval(charger, 10000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
      window.removeEventListener("online", majLigne);
      window.removeEventListener("offline", majLigne);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!tombolaCfg?.date_fin || !tombolaCfg?.active) return;
    const i = setInterval(() => {
      const rest = new Date(tombolaCfg.date_fin).getTime() - Date.now();
      if (rest <= 0) {
        setTempsTombola("TERMINEE");
      } else {
        const j = Math.floor(rest / 86400000);
        const h = Math.floor((rest % 86400000) / 3600000);
        const mn = Math.floor((rest % 3600000) / 60000);
        setTempsTombola(j + "j " + h + "h " + mn + "min");
      }
    }, 1000);
    return () => clearInterval(i);
  }, [tombolaCfg]);

  useEffect(() => {
    const el = document.getElementById("onglet-" + onglet);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [onglet]);
    // ===== CALCULS — TOUS AVANT LE IF, SINON CRASH =====
  const paiementsPayes = paiements.filter(estPaye);
  const premiers = paiements.filter(
    (p) => typePaiement(p) === "PREMIER" && estPaye(p)
  );
  const occasionnels = paiements.filter(
    (p) => typePaiement(p) === "OCCASIONNELLE" && estPaye(p)
  );
  const renouvellements = paiements.filter(
    (p) => typePaiement(p) === "RENOUVELLEMENT" && estPaye(p)
  );

  // FORMULE CORRECTE : Vente main à main 0%
  // Revenu = Tickets VALIDÉS
  // Commission = somme wenze_commissions
  const totalVentes = paiementsPayes.reduce(
    (s, p) => s + Number(p.montant || 0),
    0
  );
  const revenuWenze = totalVentes;
  const totalCommissionsValidees = commissions
    .filter((c: any) => c.statut === "VALIDEE" || c.statut === "PAYEE")
    .reduce((s: number, c: any) => s + Number(c.montant_commission_cdf || 0), 0);
  const totalCommissionsEnAttente = commissions
    .filter((c: any) => c.statut === "EN_ATTENTE")
    .reduce((s: number, c: any) => s + Number(c.montant_commission_cdf || 0), 0);
  const commission = totalCommissionsValidees;
  const benefice = revenuWenze - totalCommissionsValidees;
  const baseCommission = totalCommissionsValidees + totalCommissionsEnAttente;

  // ===== FILTRE PERIODE =====
  const dansPeriode = (dateStr: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr).getTime();
    const now = Date.now();
    if (periodeStats === "JOUR") return now - d < 86400000;
    if (periodeStats === "SEMAINE") return now - d < 7 * 86400000;
    if (periodeStats === "MOIS") return now - d < 30 * 86400000;
    if (periodeStats === "ANNEE") return now - d < 365 * 86400000;
    return true;
  };
  const paiementsPeriode = paiements.filter((p) => dansPeriode(p.created_at));
  const boutiquesPeriode = boutiques.filter((b) => dansPeriode(b.created_at));
  const clientsPeriode = clients.filter((c) => dansPeriode(c.created_at));

  // ===== POINTS TOMBOLA =====
  const pointsDe = (codeInvitation: string) => {
    const boutInv = boutiques.filter(
      (b) =>
        (b.code_invitation === codeInvitation || b.code_amb === codeInvitation) &&
        estActif(b.statut) &&
        estPublic(b.type_public || b.type || "BOUTIQUE")
    );
    const cliInv = clients.filter(
      (c) =>
        (c.code_invitation === codeInvitation || c.code_parrain === codeInvitation) &&
        c.statut === "ACTIF" &&
        estPublic(c.type_public || c.type || "CLIENT")
    );
    const aboPayes = paiements.filter((p) => {
      const b = boutiques.find((x) => x.id === p.boutique_id);
      const codeB = b?.code_invitation || b?.code_amb || "";
      return (
        codeB === codeInvitation &&
        estPaye(p) &&
        (typePaiement(p) === "PREMIER" || typePaiement(p) === "OCCASIONNELLE")
      );
    });
    const totalBrut = boutInv.length * 5 + cliInv.length * 3 + aboPayes.length * 20;
    const total = Math.min(totalBrut, Number(tombolaCfg.plafond || 100));
    return {
      bout: boutInv.length,
      cli: cliInv.length,
      abo: aboPayes.length,
      ptsBout: boutInv.length * 5,
      ptsCli: cliInv.length * 3,
      ptsBonus: aboPayes.length * 20,
      total,
    };
  };

  const participants = useMemo(() => {
    const map = new Map();
    [...boutiques, ...clients].forEach((u: any) => {
      const type = (u.type_public || u.type || (u.nomEtablissement ? "BOUTIQUE" : "CLIENT")).toUpperCase();
      if (!estPublic(type)) return;
      const code = u.code_pro || u.code_invitation || u.id;
      if (!map.has(code)) {
        map.set(code, {
          id: u.id,
          nom: u.nom || u.proprietaire || "",
          telephone: u.telephone || u.whatsapp || "",
          type_public: type,
          code,
          commune: u.commune,
          quartier: u.quartier,
        });
      }
    });
    return [...map.values()]
      .map((p) => ({ ...p, pts: pointsDe(p.code) }))
      .sort((a, b) => b.pts.total - a.pts.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boutiques, clients, paiements, tombolaCfg]);

  const classement = participants.filter((x) => x.pts.total > 0);
  const gagnantPotentiel = classement[0];
  const sup = membres.filter((m) => m.role === "SUPERVISEUR");
  const amb = membres.filter((m) => m.role === "AMBASSADEUR");

  // ===== ANTI-TRICHE : DOUBLON TELEPHONE =====
  const telephonesVus = new Map<string, number>();
  const suspectsTombola = participants.filter((p) => {
    const tel = String(p.telephone || "").replace(/\s/g, "");
    if (!tel) return false;
    const n = (telephonesVus.get(tel) || 0) + 1;
    telephonesVus.set(tel, n);
    return n > 1;
  });

  // ===== DETTES / CACHEES =====
  const boutiquesCachees = boutiques.filter((b) => {
    const aPaye = paiements.some((p) => p.boutique_id === b.id && estPaye(p));
    if (aPaye) return false;
    const created = new Date(b.created_at || Date.now()).getTime();
    const jours = Math.floor((Date.now() - created) / 86400000);
    return jours > Number(tarifs.freemium_jours || 30);
  });

  // ===== STATS MEMBRE AU CLIC =====
  const statsMembre = (m: any) => {
    if (!m) return null;
    const code = m.code_pro || m.code_invitation || m.id;
    const zone = m.commune || "";
    const boutiquesZone =
      m.role === "SUPERVISEUR"
        ? boutiques.filter((b) => b.commune === zone)
        : boutiques.filter((b) => b.code_invitation === code || b.code_amb === code);
    const clientsZone =
      m.role === "SUPERVISEUR"
        ? clients.filter((c) => c.commune === zone)
        : clients.filter((c) => c.code_invitation === code || c.code_parrain === code);
    const idsBoutiques = boutiquesZone.map((b) => b.id);
    const paiementsZone = paiements.filter(
      (p) => idsBoutiques.includes(p.boutique_id) || p.user_id === m.id
    );
    const payes = paiementsZone.filter(estPaye);
    const ventes = payes.reduce((s, p) => s + Number(p.montant || 0), 0);
    const comm = commissions
      .filter(
        (c: any) =>
          (c.ambassadeur_whatsapp === m.telephone || c.ambassadeur_code === code) &&
          (c.statut === "VALIDEE" || c.statut === "PAYEE")
      )
      .reduce((s: number, c: any) => s + Number(c.montant_commission_cdf || 0), 0);
    const pts = pointsDe(code);
    return {
      boutiques: boutiquesZone,
      clients: clientsZone,
      paiements: paiementsZone,
      ventes,
      commission: comm,
      benefice: ventes - comm,
      boutiquesValidees: boutiquesZone.filter((b) => b.statut === "VALIDEE").length,
      boutiquesEnAttente: boutiquesZone.filter((b) => b.statut === "EN_ATTENTE").length,
      clientsActifs: clientsZone.filter((c) => c.statut === "ACTIF").length,
      paiementsPayes: payes.length,
      paiementsEnAttente: paiementsZone.filter((p) => !estPaye(p)).length,
      pts,
    };
  };
  const statsSel = membreSelectionne ? statsMembre(membreSelectionne) : null;
    // ===== CONNEXION DG =====
  const connexionDG = async () => {
    try {
      const res = await fetch("/api/dg-login", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      const j = await res.json();
      if (!j.ok) return show("❌ PIN incorrect");
    } catch {
      show("⚠️ API login absente, vérification locale — crée /api/dg-login pour 100% sécurité");
    }
    demanderCodeTelegram(() => {
      setOk(true);
      ecrireJournalDG("CONNEXION", "DG", null, { via: "PIN + Telegram" });
    });
  };

  // ===== CREER MEMBRE =====
  const creerMembre = async () => {
    if (!nomNouveau.trim() || !telNouveau.trim()) {
      return show("⚠️ Nom + Téléphone obligatoires");
    }
    if (roleNouveau === "SUPERVISEUR") {
      const conflit = sup.find(
        (s) => s.commune === communeNouveau && s.statut === "ACTIF"
      );
      if (conflit) {
        setShowTransfertZone({
          nouveauNom: nomNouveau,
          commune: communeNouveau,
          occupant: conflit,
        });
        return show(
          "⚠️ Zone " + communeNouveau + " déjà occupée par " + conflit.nom
        );
      }
    }
    if (!enLigne) {
      const file = [
        ...fileAttente,
        {
          type: "creerMembre",
          nom: nomNouveau,
          tel: telNouveau,
          commune: communeNouveau,
          role: roleNouveau,
          date: new Date().toISOString(),
        },
      ];
      setFileAttente(file);
      localStorage.setItem("wenze_file_attente", JSON.stringify(file));
      return show("📥 Hors-ligne : mis en file d'attente");
    }
    const prefix = roleNouveau === "SUPERVISEUR" ? "SUP" : "AMB";
    const code =
      prefix +
      "-" +
      (communeNouveau || "KIN").toUpperCase().slice(0, 3) +
      "-2026-" +
      String(Math.floor(100 + Math.random() * 900));
    const { error } = await supabase.from("membres").insert({
      nom: nomNouveau,
      telephone: telNouveau,
      whatsapp: telNouveau,
      commune: communeNouveau,
      role: roleNouveau,
      code_pro: code,
      code_invitation: code,
      statut: "ACTIF",
      type_compte: roleNouveau,
    });
    if (error) return show("❌ Erreur : " + error.message);
    await ecrireJournalDG("CREATION_MEMBRE", "membre", code, {
      nom: nomNouveau,
      role: roleNouveau,
      commune: communeNouveau,
    });
    await notifier({
      user_id: null,
      type_compte: roleNouveau,
      titre: "👋 Bienvenue " + roleNouveau + " !",
      message: nomNouveau + ", ton Code Pro est " + code + ". Zone : " + communeNouveau,
      type: "COMPTE",
      lien: "/equipe",
    });
    show("✅ " + roleNouveau + " créé ! Code : " + code);
    setNomNouveau("");
    setTelNouveau("");
    charger();
  };

  // ===== VALIDER PAIEMENT =====
  const validerPaiement = async (id: string) => {
    const p = paiements.find((x) => x.id === id);
    if (!p) return;
    demanderCodeTelegram(async () => {
      await supabase.from("paiements").update({ statut: "PAYÉ" }).eq("id", id);
      if (p) {
        const b = boutiques.find((x) => x.id === p.boutique_id);
        await notifier({
          user_id: p.boutique_id || p.user_id || b?.id,
          titre: "💰 Paiement validé !",
          message: "Ton paiement de " + Number(p.montant || 0).toLocaleString() + " CDF validé par le DG.",
          type: "PAIEMENT",
          lien: "/profil",
        });
        if (b && (b.code_invitation || b.code_amb)) {
          if (typePaiement(p) === "PREMIER" || typePaiement(p) === "OCCASIONNELLE") {
            await notifier({
              user_id: b.code_invitation || b.code_amb,
              titre: "🎉 +20 pts Tombola !",
              message: "Ton invité " + b.nom + " a payé. Tu gagnes +20 pts.",
              type: "TOMBOLA",
              lien: "/",
            });
          }
        }
        // COMMISSION : 20% modifiable sur 1er achat validé, sinon 0%
        if (b?.ambassadeur_parrain_whatsapp) {
          const dejaComm = commissions.find((c: any) => c.ticket_id === p.id);
          const dejaValide = paiements.filter(
            (x) => x.boutique_id === p.boutique_id && estPaye(x) && x.id !== p.id
          ).length;
          if (!dejaComm && dejaValide === 0) {
            const montantComm = Math.round(
              Number(p.montant || 0) * Number(commissionAmb) / 100
            );
            await supabase.from("wenze_commissions").insert({
              id: "COMM-" + p.id,
              ambassadeur_whatsapp: b.ambassadeur_parrain_whatsapp,
              ambassadeur_code: b.ambassadeur_parrain_code,
              beneficiaire_whatsapp: b.telephone || b.whatsapp,
              beneficiaire_type: b.type_public || "BOUTIQUE_VENDEUR",
              ticket_id: p.id,
              palier_id: typePaiement(p),
              montant_ticket_cdf: Number(p.montant || 0),
              taux_pct: Number(commissionAmb),
              montant_commission_cdf: montantComm,
              statut: "EN_ATTENTE",
            });
            show("✅ Paiement validé — Commission " + commissionAmb + "% = " + montantComm.toLocaleString() + " FC");
          } else {
            show("✅ Paiement validé — Commission 0% (pas 1er achat)");
          }
        } else {
          show("✅ Paiement validé");
        }
        await ecrireJournalDG("VALIDATION_PAIEMENT", "paiement", id, {
          montant: p.montant,
          type: typePaiement(p),
        });
      }
      charger();
    });
  };

  const rejeterPaiement = async (id: string) => {
    if (!motif.trim()) return show("⚠️ Écris le motif de rejet");
    demanderCodeTelegram(async () => {
      await supabase
        .from("paiements")
        .update({ statut: "REJETÉ", motif_rejet: motif })
        .eq("id", id);
      await ecrireJournalDG("REJET_PAIEMENT", "paiement", id, { motif });
      show("⛔ Paiement rejeté");
      setMotif("");
      charger();
    });
  };

  const validerCommission = async (c: any) => {
    demanderCodeTelegram(async () => {
      await supabase.from("wenze_commissions").update({ statut: "VALIDEE" }).eq("id", c.id);
      await ecrireJournalDG("VALIDATION_PAIEMENT", "commission", c.id, {
        statut: "VALIDEE",
        montant: c.montant_commission_cdf,
      });
      show("✅ Commission validée");
      charger();
    });
  };

  const payerCommission = async (c: any) => {
    demanderCodeTelegram(async () => {
      await supabase.from("wenze_commissions").update({ statut: "PAYEE" }).eq("id", c.id);
      await ecrireJournalDG("VALIDATION_PAIEMENT", "commission", c.id, { statut: "PAYEE" });
      show("✅ Commission marquée payée");
      charger();
    });
  };
    // ===== MODERATION ANNONCES =====
  const validerAnnonce = async (id: string) => {
    demanderCodeTelegram(async () => {
      await supabase.from("annonces").update({ statut: "APPROUVEE" }).eq("id", id);
      await ecrireJournalDG("MODERATION", "annonce", id, { statut: "APPROUVEE" });
      show("✅ Annonce approuvée — visible au public");
      charger();
    });
  };

  const suspendreAnnonce = async (id: string) => {
    const m = motifSuspensionLibre.trim() || motifSuspension;
    if (!m) return show("⚠️ Motif obligatoire");
    const jours = Number(dureeSuspension || "7");
    const dateFin = new Date(Date.now() + jours * 86400000).toISOString();
    demanderCodeTelegram(async () => {
      await supabase
        .from("annonces")
        .update({
          statut: "SUSPENDUE",
          motif_suspension: m,
          duree_suspension_jours: jours,
          date_fin_suspension: dateFin,
        })
        .eq("id", id);
      await ecrireJournalDG("MODERATION", "annonce", id, {
        statut: "SUSPENDUE",
        motif: m,
        duree_jours: jours,
      });
      show("⛔ Annonce suspendue " + jours + " j");
      setShowSuspendModal(null);
      setMotifSuspensionLibre("");
      charger();
    });
  };

  const supprimerAnnonce = async (id: string) => {
    if (!motif.trim()) return show("⚠️ Motif de suppression obligatoire");
    demanderCodeTelegram(async () => {
      await supabase.from("annonces").delete().eq("id", id);
      await ecrireJournalDG("SUPPRESSION", "annonce", id, { motif });
      show("🗑️ Annonce supprimée");
      setMotif("");
      charger();
    });
  };

  // ===== BOUTIQUE : VALIDER / SUSPENDRE / CACHER =====
  const changerStatutBoutique = async (id: string, statut: string, motifText?: string) => {
    const b = boutiques.find((x) => x.id === id);
    if (!b) return;
    demanderCodeTelegram(async () => {
      await supabase
        .from("boutiques")
        .update({
          statut,
          motif_suspension: motifText || null,
          date_fin_suspension:
            statut === "SUSPENDUE"
              ? new Date(Date.now() + Number(dureeSuspension || "7") * 86400000).toISOString()
              : null,
        })
        .eq("id", id);
      await ecrireJournalDG("MODERATION", "boutique", id, {
        statut,
        motif: motifText || null,
      });
      show("✅ Boutique " + statut);
      charger();
    });
  };

  // ===== TOMBOLA =====
  const demarrerTombola = async () => {
    demanderCodeTelegram(async () => {
      const dateFin = new Date(
        Date.now() + Number(tombolaCfg.duree_jours || 7) * 86400000
      ).toISOString();
      await supabase
        .from("tombola_config")
        .update({ active: true, statut: "EN_COURS", date_debut: new Date().toISOString(), date_fin: dateFin })
        .eq("id", 1);
      await ecrireJournalDG("TOMBOLA", "tombola", 1, {
        statut: "EN_COURS",
        lot: tombolaCfg.lot,
        plafond: tombolaCfg.plafond,
      });
      show("🎲 Tombola lancée !");
      charger();
    });
  };

  const cloturerTombola = async () => {
    if (!gagnantPotentiel) return show("⚠️ Aucun gagnant");
    if (suspectsTombola.length > 0) {
      return show("⚠️ " + suspectsTombola.length + " doublon(s) téléphone à vérifier avant clôture");
    }
    demanderCodeTelegram(async () => {
      await supabase
        .from("tombola_config")
        .update({
          active: false,
          statut: "TERMINEE",
          gagnant_id: gagnantPotentiel.id,
          gagnant_code: gagnantPotentiel.code,
          gagnant_points: gagnantPotentiel.pts.total,
        })
        .eq("id", 1);
      await ecrireJournalDG("TOMBOLA", "tombola", 1, {
        statut: "TERMINEE",
        gagnant: gagnantPotentiel.nom,
        points: gagnantPotentiel.pts.total,
      });
      show("🏆 Gagnant : " + gagnantPotentiel.nom + " (" + gagnantPotentiel.pts.total + " pts)");
      charger();
    });
  };

  // ===== PUBLIER ANNONCE DG =====
  const publierAnnonce = async () => {
    if (!titreAnnonce.trim() || !msgAnnonce.trim()) {
      return show("⚠️ Titre + Message obligatoires");
    }
    await supabase.from("notifications_perso").insert({
      id: "ann-" + Date.now(),
      user_id: personneAnnonce || null,
      type_compte: cibleAnnonce,
      titre: titreAnnonce,
      message: msgAnnonce,
      type: "ANNONCE",
      lien: "",
      lu: false,
    });
    await ecrireJournalDG("ANNONCE", "notification", "ann-" + Date.now(), {
      titre: titreAnnonce,
      cible: cibleAnnonce,
    });
    show("📢 Annonce envoyée");
    setTitreAnnonce("");
    setMsgAnnonce("");
    setPersonneAnnonce("");
    charger();
  };

  // ===== FILE D'ATTENTE HORS-LIGNE =====
  const synchroniserFile = async () => {
    if (fileAttente.length === 0) return show("✅ File vide");
    for (const it of fileAttente) {
      if (it.type === "creerMembre") {
        const prefix = it.role === "SUPERVISEUR" ? "SUP" : "AMB";
        const code =
          prefix + "-" + (it.commune || "KIN").toUpperCase().slice(0, 3) + "-2026-" +
          String(Math.floor(100 + Math.random() * 900));
        await supabase.from("membres").insert({
          nom: it.nom,
          telephone: it.tel,
          whatsapp: it.tel,
          commune: it.commune,
          role: it.role,
          code_pro: code,
          code_invitation: code,
          statut: "ACTIF",
          type_compte: it.role,
        });
      }
    }
    setFileAttente([]);
    localStorage.removeItem("wenze_file_attente");
    show("🔄 File synchronisée");
    charger();
  };
    // ===== LOGIN — 1er RETURN =====
  if (!ok) {
    return (
      <div className="max-w-[420px] mx-auto min-h-screen bg-[#111] text-white flex flex-col items-center justify-center px-5">
        <div className="text-[40px]">🛍️</div>
        <h1 className="text-[26px] font-black mt-2">WENZE — DG PRIVÉ</h1>
        <p className="text-[12px] opacity-70 mt-1">Accès sécurisé DG • PIN + Telegram</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && pin.trim()) connexionDG(); }}
          placeholder="PIN DG"
          className="w-full mt-6 p-3 rounded-xl bg-white text-black text-center text-[20px] font-black tracking-[6px]"
        />
        <button
          onClick={connexionDG}
          disabled={!pin.trim()}
          className="w-full mt-3 bg-[#FF6B00] text-white font-black py-3 rounded-xl disabled:opacity-50"
        >
          ENTRER →
        </button>
        <p className="text-[11px] opacity-60 mt-4 text-center">
          PIN vérifié côté serveur. Aucun PIN dans le code.
        </p>
        {toast && <p className="text-center text-[12px] mt-3 font-bold">{toast}</p>}
        {showTelegramModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-white text-black rounded-2xl p-5 w-full max-w-[360px]">
              <h3 className="font-black text-[16px]">🔐 Vérification Telegram</h3>
              <p className="text-[12px] opacity-70 mt-1">Entre le code reçu (démo affichée en toast).</p>
              <input
                value={codeTelegram}
                onChange={(e) => setCodeTelegram(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") validerCodeTelegram(); }}
                placeholder="Code 6 chiffres"
                className="w-full mt-3 p-3 border rounded-xl text-center font-black text-[18px]"
              />
              <button onClick={validerCodeTelegram} className="w-full mt-3 bg-black text-white font-black py-3 rounded-xl">
                VALIDER
              </button>
              <button onClick={() => setShowTelegramModal(false)} className="w-full mt-2 py-2 text-[12px] font-bold">
                Annuler
              </button>
              )}
            </div>
          );
  } // <-- ferme SEULEMENT le if (!ok)

  // ===== TABLEAU - 2e RETURN (le seul autre) =====
  return (
    <div className="max-w-[560px] mx-auto min-h-screen bg-[#F7F7F8] pb-24">
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-[60] pointer-events-none">
          <div className="max-w-[560px] mx-auto bg-black text-white text-[13px] font-bold px-4 py-3 rounded-xl shadow-xl text-center">{toast}</div>
        </div>
      )}
      <div className="bg-[#111] text-white px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[20px] font-black">🛍️ WENZE — DG</div>
            <div className="text-[11px] opacity-70">Bureau DG • Temps réel • {enLigne ? "🟢 En ligne" : "🔴 Hors-ligne"}</div>
          </div>
          <button onClick={() => setOk(false)} className="bg-white/15 px-3 py-2 rounded-lg text-[12px] font-bold">
            Déconnexion
          </button>
        </div>
        {/* ✅ CORRIGÉ : PROBLEMES + NOTIFS ajoutés */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" id="barre-onglets">
          {["DASH", "MEMBRES", "BOUTIQUES", "CLIENTS", "PAIEMENTS", "ANNONCES", "TOMBOLA", "DETTES", "ZONES", "FILE", "PUB", "PARAMETRES", "JOURNAL", "PROBLEMES", "NOTIFS"].map((o) => (
            <button
              key={o}
              id={"onglet-" + o}
              onClick={() => setOnglet(o)}
              className={"shrink-0 px-3 py-2 rounded-full text-[11px] font-black " + (onglet === o ? "bg-[#FF6B00] text-white" : "bg-white/15 text-white")}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {onglet === "DASH" && (
          <div>
            <div className="flex gap-2 mb-3">
              {["JOUR", "SEMAINE", "MOIS", "ANNEE"].map((p) => (
                <button key={p} onClick={() => setPeriodeStats(p)} className={"flex-1 py-2 rounded-lg text-[11px] font-black " + (periodeStats === p ? "bg-black text-white" : "bg-white")}>
                  {p}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-3"><div className="text-[11px] opacity-60">💰 Revenu tickets</div><div className="text-[18px] font-black">{revenuWenze.toLocaleString()} FC</div><div className="text-[10px] opacity-60">Ventes totales {totalVentes.toLocaleString()} FC</div></div>
              <div className="bg-white rounded-xl p-3"><div className="text-[11px] opacity-60">🤝 Commissions</div><div className="text-[18px] font-black">{totalCommissionsValidees.toLocaleString()} FC</div><div className="text-[10px] opacity-60">En attente {totalCommissionsEnAttente.toLocaleString()} FC</div></div>
              <div className="bg-white rounded-xl p-3"><div className="text-[11px] opacity-60">📈 Bénéfice</div><div className="text-[18px] font-black">{benefice.toLocaleString()} FC</div><div className="text-[10px] opacity-60">Revenu - Commissions validées</div></div>
              <div className="bg-white rounded-xl p-3"><div className="text-[11px] opacity-60">🏪 Boutiques</div><div className="text-[18px] font-black">{boutiques.length}</div><div className="text-[10px] opacity-60">Validées {boutiques.filter((b) => b.statut === "VALIDEE").length} • En attente {boutiques.filter((b) => b.statut === "EN_ATTENTE").length}</div></div>
              <div className="bg-white rounded-xl p-3"><div className="text-[11px] opacity-60">👥 Clients</div><div className="text-[18px] font-black">{clients.length}</div><div className="text-[10px] opacity-60">Actifs {clients.filter((c) => c.statut === "ACTIF").length}</div></div>
              <div className="bg-white rounded-xl p-3"><div className="text-[11px] opacity-60">👔 Équipe</div><div className="text-[18px] font-black">{membres.length}</div><div className="text-[10px] opacity-60">Sup {sup.length} • Amb {amb.length}</div></div>
            </div>
            <div className="bg-white rounded-xl p-3 mt-2">
              <div className="font-black text-[13px]">📊 Période : {periodeStats}</div>
              <div className="text-[12px] mt-1">Paiements : {paiementsPeriode.length} • Boutiques : {boutiquesPeriode.length} • Clients : {clientsPeriode.length}</div>
              <div className="text-[12px]">1ers achats : {premiers.length} • Occasionnelles : {occasionnels.length} • Renouvellements : {renouvellements.length}</div>
              <div className="text-[12px] font-bold mt-1">Formule : Vente 0% • Amb 1er achat {commissionAmb}% / après 0% • WENZE 80%</div>
            </div>
            <div className="bg-white rounded-xl p-3 mt-2">
              <div className="font-black text-[13px]">🎲 Tombola — {tombolaCfg.statut} {tempsTombola ? "• " + tempsTombola : ""}</div>
              <div className="text-[12px] mt-1">Lot : {tombolaCfg.lot} • Plafond {tombolaCfg.plafond} pts</div>
              <div className="text-[12px]">Leader : {gagnantPotentiel ? gagnantPotentiel.nom + " — " + gagnantPotentiel.pts.total + " pts" : "Aucun"}</div>
            </div>
            <div className="bg-white rounded-xl p-3 mt-2">
              <div className="font-black text-[13px]">🛠️ Problèmes : {problemes.length} • 🔔 Notifs : {notifsPerso.length}</div>
              <div className="text-[12px]">Problèmes en attente : {problemes.filter((p) => p.statut === "EN_ATTENTE" || p.statut === "OUVERT").length}</div>
            </div>
          </div>
        )}

        {onglet === "MEMBRES" && (
          <div>
            <div className="bg-white rounded-xl p-3">
              <div className="font-black">➕ Créer membre</div>
              <input value={nomNouveau} onChange={(e) => setNomNouveau(e.target.value)} placeholder="Nom complet" className="w-full mt-2 p-3 border rounded-xl" />
              <input value={telNouveau} onChange={(e) => setTelNouveau(e.target.value)} placeholder="+243..." className="w-full mt-2 p-3 border rounded-xl" />
              <div className="flex gap-2 mt-2">
                <select value={roleNouveau} onChange={(e) => setRoleNouveau(e.target.value)} className="flex-1 p-3 border rounded-xl"><option>SUPERVISEUR</option><option>AMBASSADEUR</option></select>
                <select value={communeNouveau} onChange={(e) => setCommuneNouveau(e.target.value)} className="flex-1 p-3 border rounded-xl">
                  {/* ✅ CORRIGÉ : Gombe une seule fois */}
                  {["Gombe", "Kintambo", "Lingwala", "Kinshasa", "Barumbu", "Bandalungwa", "Bumbu", "Selembao", "Ngiri-Ngiri", "Kasa-Vubu", "Ngaba", "Kalamu", "Limete", "Matete", "Ndjili", "Kimbanseke", "Masina", "Nsele", "Maluku", "Mont-Ngafula", "Kisenso", "Lemba", "Ngaliema"].map((c) => (<option key={c}>{c}</option>))}
                </select>
              </div>
              <button onClick={creerMembre} className="w-full mt-3 bg-[#FF6B00] text-white font-black py-3 rounded-xl">CRÉER</button>
            </div>
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔍 Rechercher membre..." className="w-full mt-3 p-3 border rounded-xl bg-white" />
            {membres.filter((m) => (m.nom || "").toLowerCase().includes(recherche.toLowerCase()) || (m.commune || "").toLowerCase().includes(recherche.toLowerCase())).map((m) => (
              <button key={m.id} onClick={() => setMembreSelectionne(m)} className="w-full text-left bg-white rounded-xl p-3 mt-2">
                <div className="font-black text-[14px]">{m.nom} • {m.role}</div>
                <div className="text-[12px] opacity-70">{m.commune} • {m.telephone} • {m.code_pro}</div>
                <div className="text-[12px] font-bold">{m.statut} — Cliquer pour fiche</div>
              </button>
            ))}
            {membreSelectionne && statsSel && (
              <div className="bg-black text-white rounded-xl p-4 mt-3">
                <div className="font-black text-[15px]">👤 {membreSelectionne.nom} — {membreSelectionne.role}</div>
                <div className="text-[12px] opacity-80 mt-1">{membreSelectionne.commune} • {membreSelectionne.code_pro} • Points {statsSel.pts.total}</div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
                  <div>Boutiques : {statsSel.boutiques.length} (Validées {statsSel.boutiquesValidees})</div>
                  <div>Clients : {statsSel.clients.length} (Actifs {statsSel.clientsActifs})</div>
                  <div>Ventes : {statsSel.ventes.toLocaleString()} FC</div>
                  <div>Commission : {statsSel.commission.toLocaleString()} FC</div>
                </div>
                <button onClick={() => setMembreSelectionne(null)} className="w-full mt-3 bg-white text-black font-black py-2 rounded-lg">Fermer</button>
              </div>
            )}
          </div>
        )}

        {onglet === "BOUTIQUES" && (
          <div>
            <div className="flex gap-2 mb-2">
              {["TOUS", "VALIDEE", "EN_ATTENTE", "SUSPENDUE"].map((f) => (
                <button key={f} onClick={() => setFiltreType(f)} className={"px-3 py-2 rounded-full text-[11px] font-black " + (filtreType === f ? "bg-black text-white" : "bg-white")}>{f}</button>
              ))}
            </div>
            {boutiques.filter((b) => filtreType === "TOUS" || b.statut === filtreType).map((b) => (
              <div key={b.id} className="bg-white rounded-xl p-3 mt-2">
                {/* ✅ CORRIGÉ : String(b.id) au lieu de b.id?.slice */}
                <div className="font-black text-[14px]">{b.nom || b.nomEtablissement} — N° {b.numero_boutique || String(b.id || "").slice(-4)}</div>
                <div className="text-[12px] opacity-70">{b.commune} • {b.telephone} • {b.statut}</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => changerStatutBoutique(b.id, "VALIDEE")} className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg text-[12px]">✅ Valider</button>
                  <button onClick={() => setShowSuspendModal(b)} className="flex-1 bg-orange-500 text-white font-bold py-2 rounded-lg text-[12px]">⛔ Suspendre</button>
                  <button onClick={() => changerStatutBoutique(b.id, "CACHEE", "Non conforme")} className="flex-1 bg-gray-700 text-white font-bold py-2 rounded-lg text-[12px]">🙈 Cacher</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet === "PROBLEMES" && (
          <div>
            <div className="bg-white rounded-xl p-3">
              <div className="font-black">🛠️ Problèmes — {problemes.length}</div>
              <div className="text-[12px] mt-1">En attente : {problemes.filter((p) => p.statut === "EN_ATTENTE" || p.statut === "OUVERT").length} • En cours : {problemes.filter((p) => p.statut === "EN_COURS").length} • Résolus : {problemes.filter((p) => p.statut === "RESOLU" || p.statut === "FERME").length}</div>
            </div>
            <div className="flex gap-2 mt-2">
              {["TOUS", "EN_ATTENTE", "EN_COURS", "RESOLU"].map((f) => (
                <button key={f} onClick={() => setFiltreProbleme(f)} className={"px-3 py-2 rounded-full text-[11px] font-black " + (filtreProbleme === f ? "bg-black text-white" : "bg-white")}>{f}</button>
              ))}
            </div>
            {problemes.filter((p) => filtreProbleme === "TOUS" || p.statut === filtreProbleme || (filtreProbleme === "EN_ATTENTE" && p.statut === "OUVERT")).map((p) => (
              <button key={p.id} onClick={() => { setProblemeSelectionne(p); setReponseProbleme(p.reponse_dg || ""); setStatutProbleme(p.statut === "RESOLU" ? "RESOLU" : "EN_COURS"); }} className="w-full text-left bg-white rounded-xl p-3 mt-2">
                <div className="font-black text-[14px]">{p.titre || p.sujet || "Problème"}</div>
                <div className="text-[12px] opacity-70">{p.statut} • {new Date(p.created_at || Date.now()).toLocaleDateString("fr-FR")}</div>
                <div className="text-[12px] mt-1">{p.description || p.message || ""}</div>
                <div className="text-[12px] font-bold">Cliquer pour répondre →</div>
              </button>
            ))}
            {problemes.length === 0 && <p className="text-center text-[12px] opacity-60 mt-4">Aucun problème signalé.</p>}
            {problemeSelectionne && (
              <div className="bg-black text-white rounded-xl p-4 mt-3">
                <div className="font-black text-[15px]">🛠️ {problemeSelectionne.titre || problemeSelectionne.sujet || "Problème"}</div>
                <div className="text-[12px] opacity-80 mt-1">{problemeSelectionne.description || problemeSelectionne.message || ""}</div>
                <select value={statutProbleme} onChange={(e) => setStatutProbleme(e.target.value)} className="w-full mt-3 p-3 rounded-xl text-black"><option>EN_COURS</option><option>RESOLU</option><option>FERME</option></select>
                <textarea value={reponseProbleme} onChange={(e) => setReponseProbleme(e.target.value)} placeholder="Ta réponse DG..." className="w-full mt-2 p-3 rounded-xl text-black" />
                <button onClick={() => repondreProbleme(problemeSelectionne.id)} className="w-full mt-2 bg-[#FF6B00] text-white font-black py-3 rounded-xl">📩 ENVOYER RÉPONSE</button>
                <button onClick={() => setProblemeSelectionne(null)} className="w-full mt-2 py-2 text-[12px] font-bold">Fermer</button>
              </div>
            )}
          </div>
        )}

        {onglet === "NOTIFS" && (
          <div>
            <div className="bg-white rounded-xl p-3">
              <div className="font-black">🔔 Notifications / Alertes — {notifsPerso.length}</div>
            </div>
            <div className="bg-white rounded-xl p-3 mt-2">
              <div className="font-black text-[13px]">📢 Nouvelle alerte DG</div>
              <input value={titreAlerte} onChange={(e) => setTitreAlerte(e.target.value)} placeholder="Titre de l'alerte" className="w-full mt-2 p-3 border rounded-xl" />
              <textarea value={nouvelleAlerte} onChange={(e) => setNouvelleAlerte(e.target.value)} placeholder="Texte de l'alerte..." className="w-full mt-2 p-3 border rounded-xl" />
              <div className="flex gap-2 mt-2">
                <select value={cibleAnnonce} onChange={(e) => setCibleAnnonce(e.target.value)} className="flex-1 p-3 border rounded-xl"><option>TOUS</option><option>SUPERVISEUR</option><option>AMBASSADEUR</option><option>CLIENT</option><option>BOUTIQUE_VENDEUR</option></select>
                <input value={personneAnnonce} onChange={(e) => setPersonneAnnonce(e.target.value)} placeholder="ID personne (optionnel)" className="flex-1 p-3 border rounded-xl" />
              </div>
              <button onClick={envoyerAlerteDG} className="w-full mt-3 bg-[#FF6B00] text-white font-black py-3 rounded-xl">📢 ENVOYER L'ALERTE</button>
            </div>
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {["TOUS", "ALERTE", "ANNONCE", "PAIEMENT", "TOMBOLA", "PROBLEME", "COMPTE"].map((f) => (
                <button key={f} onClick={() => setFiltreNotif(f)} className={"shrink-0 px-3 py-2 rounded-full text-[11px] font-black " + (filtreNotif === f ? "bg-black text-white" : "bg-white")}>{f}</button>
              ))}
            </div>
            {notifsPerso.filter((n) => filtreNotif === "TOUS" || n.type === filtreNotif).slice(0, 50).map((n) => (
              <div key={n.id} className="bg-white rounded-xl p-3 mt-2">
                <div className="font-black text-[14px]">{n.titre}</div>
                <div className="text-[12px] opacity-70">{n.type} • {n.type_compte} • {new Date(n.created_at || Date.now()).toLocaleString("fr-FR")}</div>
                <div className="text-[12px] mt-1">{n.message}</div>
              </div>
            ))}
            {notifsPerso.length === 0 && <p className="text-center text-[12px] opacity-60 mt-4">Aucune notification.</p>}
          </div>
        )}
        {
                  {onglet === "CLIENTS" && (
          <div>
            {clients.map((c) => (
              <div key={c.id} className="bg-white rounded-xl p-3 mt-2">
                <div className="font-black text-[14px]">{c.nom}</div>
                <div className="text-[12px] opacity-70">{c.commune} • {c.telephone} • {c.statut}</div>
                <div className="text-[12px]">Type : {c.type_public || c.type || "CLIENT"} • Code : {c.code_invitation || c.code_parrain || "-"}</div>
              </div>
            ))}
            {clients.length === 0 && <p className="text-center text-[12px] opacity-60 mt-4">Aucun client pour l'instant.</p>}
          </div>
        )}

        {onglet === "PAIEMENTS" && (
          <div>
            <div className="bg-white rounded-xl p-3">
              <div className="font-black">💰 Paiements</div>
              <div className="text-[12px] mt-1">Total validé : {totalVentes.toLocaleString()} FC • En attente : {paiements.filter((p) => !estPaye(p)).length}</div>
            </div>
            {paiements.map((p) => {
              const b = boutiques.find((x) => x.id === p.boutique_id);
              return (
                <div key={p.id} className="bg-white rounded-xl p-3 mt-2">
                  <div className="font-black text-[14px]">{b?.nom || "Boutique"} — {Number(p.montant || 0).toLocaleString()} FC</div>
                  <div className="text-[12px] opacity-70">{typePaiement(p)} • {p.statut} • {new Date(p.created_at || Date.now()).toLocaleDateString("fr-FR")}</div>
                  {p.preuve_url && <button onClick={() => setShowPreuve(p)} className="mt-2 text-[12px] font-bold underline">🧾 Voir preuve</button>}
                  <div className="flex gap-2 mt-2">
                    {!estPaye(p) && <button onClick={() => validerPaiement(p.id)} className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg text-[12px]">✅ Valider</button>}
                    {!estPaye(p) && <button onClick={() => rejeterPaiement(p.id)} className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg text-[12px]">⛔ Rejeter</button>}
                  </div>
                  {!estPaye(p) && <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif si rejet..." className="w-full mt-2 p-2 border rounded-lg text-[12px]" />}
                </div>
              );
            })}
            <div className="bg-white rounded-xl p-3 mt-3">
              <div className="font-black">🤝 Commissions</div>
              {commissions.map((c: any) => (
                <div key={c.id} className="border-t pt-2 mt-2 text-[12px]">
                  <div>{c.ambassadeur_whatsapp} — {Number(c.montant_commission_cdf || 0).toLocaleString()} FC • {c.statut}</div>
                  <div className="flex gap-2 mt-1">
                    {c.statut === "EN_ATTENTE" && <button onClick={() => validerCommission(c)} className="flex-1 bg-green-600 text-white font-bold py-1 rounded-lg">Valider</button>}
                    {c.statut === "VALIDEE" && <button onClick={() => payerCommission(c)} className="flex-1 bg-black text-white font-bold py-1 rounded-lg">Marquer payée</button>}
                  </div>
                </div>
              ))}
              {commissions.length === 0 && <p className="text-[12px] opacity-60 mt-2">Aucune commission.</p>}
            </div>
          </div>
        )}

        {onglet === "ANNONCES" && (
          <div>
            <div className="bg-white rounded-xl p-3">
              <div className="font-black">📢 Publier annonce DG</div>
              <input value={titreAlerte} onChange={(e) => setTitreAlerte(e.target.value)} placeholder="Titre" className="w-full mt-2 p-3 border rounded-xl" />
              <textarea value={nouvelleAlerte} onChange={(e) => setNouvelleAlerte(e.target.value)} placeholder="Message..." className="w-full mt-2 p-3 border rounded-xl" />
              <div className="flex gap-2 mt-2">
                <select value={cibleAnnonce} onChange={(e) => setCibleAnnonce(e.target.value)} className="flex-1 p-3 border rounded-xl"><option>TOUS</option><option>SUPERVISEUR</option><option>AMBASSADEUR</option><option>CLIENT</option><option>BOUTIQUE_VENDEUR</option></select>
                <input value={personneAnnonce} onChange={(e) => setPersonneAnnonce(e.target.value)} placeholder="ID personne (optionnel)" className="flex-1 p-3 border rounded-xl" />
              </div>
              <button onClick={publierAnnonce} className="w-full mt-3 bg-black text-white font-black py-3 rounded-xl">PUBLIER</button>
            </div>
            <div className="font-black mt-4">📋 Modération annonces publiques</div>
            {annonces.map((a) => (
              <div key={a.id} className="bg-white rounded-xl p-3 mt-2">
                <div className="font-black text-[14px]">{a.titre || a.title || "Annonce"}</div>
                <div className="text-[12px] opacity-70">{a.statut} {a.motif_suspension ? "• Motif : " + a.motif_suspension : ""}</div>
                <div className="text-[12px] mt-1">{a.description || a.contenu || ""}</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => validerAnnonce(a.id)} className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg text-[12px]">✅ Approuver</button>
                  <button onClick={() => setShowSuspendModal(a)} className="flex-1 bg-orange-500 text-white font-bold py-2 rounded-lg text-[12px]">⛔ Suspendre</button>
                  <button onClick={() => supprimerAnnonce(a.id)} className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg text-[12px]">🗑️ Supprimer</button>
                </div>
              </div>
            ))}
            {annonces.length === 0 && <p className="text-center text-[12px] opacity-60 mt-4">Aucune annonce.</p>}
          </div>
        )}

        {onglet === "TOMBOLA" && (
          <div>
            <div className="bg-white rounded-xl p-3">
              <div className="font-black">🎲 Tombola — {tombolaCfg.statut}</div>
              <div className="text-[12px] mt-1">Lot : {tombolaCfg.lot}</div>
              <div className="text-[12px]">Plafond : {tombolaCfg.plafond} pts • Durée : {tombolaCfg.duree_jours} jours • Temps : {tempsTombola}</div>
              <div className="text-[12px]">Participants avec points : {classement.length} • Doublons téléphone : {suspectsTombola.length}</div>
              <div className="flex gap-2 mt-3">
                {!tombolaCfg.active && <button onClick={demarrerTombola} className="flex-1 bg-green-600 text-white font-black py-3 rounded-xl text-[12px]">▶️ LANCER</button>}
                {tombolaCfg.active && <button onClick={cloturerTombola} className="flex-1 bg-black text-white font-black py-3 rounded-xl text-[12px]">🏆 CLÔTURER</button>}
              </div>
            </div>
            {classement.slice(0, 20).map((p, i) => (
              <div key={p.id} className="bg-white rounded-xl p-3 mt-2 flex justify-between">
                <div><div className="font-black text-[14px]">#{i + 1} {p.nom}</div><div className="text-[12px] opacity-70">{p.type_public} • {p.commune} • {p.telephone}</div><div className="text-[11px]">Bout +{p.pts.ptsBout} • Cli +{p.pts.ptsCli} • Bonus +{p.pts.ptsBonus}</div></div>
                <div className="font-black text-[16px]">{p.pts.total} pts</div>
              </div>
            ))}
          </div>
        )}

        {/* ===== FIN 7A — Colle 7B juste en dessous ===== */}
                {onglet === "DETTES" && (
          <div>
            <div className="bg-white rounded-xl p-3"><div className="font-black">💸 Dettes / Boutiques cachées</div><div className="text-[12px] mt-1">Freemium {tarifs.freemium_jours} j dépassé, sans paiement → cachée.</div></div>
            {boutiquesCachees.map((b) => (
              <div key={b.id} className="bg-white rounded-xl p-3 mt-2"><div className="font-black text-[14px]">{b.nom}</div><div className="text-[12px] opacity-70">{b.commune} • {b.telephone}</div><button onClick={() => show("📲 Relance envoyée à " + b.telephone)} className="w-full mt-2 bg-[#FF6B00] text-white font-bold py-2 rounded-lg text-[12px]">📲 Relancer</button></div>
            ))}
            {boutiquesCachees.length === 0 && <p className="text-center text-[12px] opacity-60 mt-4">Aucune dette.</p>}
          </div>
        )}

        {onglet === "ZONES" && (
          <div>
            <div className="bg-white rounded-xl p-3"><div className="font-black">🗺️ Zones — Superviseurs</div></div>
            {sup.map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-3 mt-2"><div className="font-black text-[14px]">{s.commune} — {s.nom}</div><div className="text-[12px] opacity-70">{s.telephone} • {s.code_pro}</div><div className="text-[12px]">Boutiques : {boutiques.filter((b) => b.commune === s.commune).length} • Clients : {clients.filter((c) => c.commune === s.commune).length}</div></div>
            ))}
          </div>
        )}

        {onglet === "FILE" && (
          <div>
            <div className="bg-white rounded-xl p-3"><div className="font-black">📥 File d'attente hors-ligne</div><div className="text-[12px] mt-1">{fileAttente.length} élément(s) en attente • {enLigne ? "En ligne" : "Hors-ligne"}</div><button onClick={synchroniserFile} className="w-full mt-3 bg-black text-white font-black py-3 rounded-xl">🔄 SYNCHRONISER</button></div>
            {fileAttente.map((f, i) => (<div key={i} className="bg-white rounded-xl p-3 mt-2 text-[12px]">{f.type} — {f.nom} • {f.commune}</div>))}
          </div>
        )}

        {onglet === "PUB" && (
          <div>
            <div className="bg-white rounded-xl p-3"><div className="font-black">🎨 Studio — Public</div><div className="text-[12px] mt-1">Change le slogan / design du site public. Sauvegarde dans config_publique.</div></div>
            <div className="bg-white rounded-xl p-3 mt-2">
              <label className="text-[12px] font-bold">Titre public</label><input value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} className="w-full mt-1 p-3 border rounded-xl" />
              <label className="text-[12px] font-bold">Slogan</label><textarea value={config.slogan} onChange={(e) => setConfig({ ...config, slogan: e.target.value })} className="w-full mt-1 p-3 border rounded-xl" />
              <label className="text-[12px] font-bold">À propos</label><textarea value={config.about} onChange={(e) => setConfig({ ...config, about: e.target.value })} className="w-full mt-1 p-3 border rounded-xl" />
              <label className="text-[12px] font-bold">WhatsApp</label><input value={config.whats} onChange={(e) => setConfig({ ...config, whats: e.target.value })} className="w-full mt-1 p-3 border rounded-xl" />
              <div className="flex gap-2 mt-2"><div className="flex-1"><label className="text-[12px] font-bold">Couleur principale</label><input type="color" value={config.main} onChange={(e) => setConfig({ ...config, main: e.target.value })} className="w-full h-10 border rounded-xl" /></div><div className="flex-1"><label className="text-[12px] font-bold">Couleur bouton</label><input type="color" value={config.btn} onChange={(e) => setConfig({ ...config, btn: e.target.value })} className="w-full h-10 border rounded-xl" /></div></div>
              <button onClick={async () => { demanderCodeTelegram(async () => { await supabase.from("config_publique").update({ title: config.title, slogan: config.slogan, about: config.about, whats: config.whats, main: config.main, btn: config.btn, main_color: config.main, btn_color: config.btn }).eq("id", 1); await ecrireJournalDG("STUDIO", "config_publique", 1, { title: config.title }); show("✅ Public mis à jour"); charger(); }); }} className="w-full mt-3 bg-[#FF6B00] text-white font-black py-3 rounded-xl">💾 ENREGISTRER PUBLIC</button>
            </div>
          </div>
        )}

        {onglet === "PARAMETRES" && (
          <div>
            <div className="bg-white rounded-xl p-3"><div className="font-black">💱 Taux</div><div className="text-[12px] mt-1">1$ = {tauxCDF} FC • Exemple PRO 20$ = {prixCDF(20).toLocaleString()} FC</div><input type="number" value={tauxCDF} onChange={(e) => setTauxCDF(Number(e.target.value))} className="w-full mt-2 p-3 border rounded-xl" /><button onClick={() => demanderCodeTelegram(async () => { await supabase.from("config_publique").update({ taux_cdf: tauxCDF }).eq("id", 1); await ecrireJournalDG("PARAMETRE", "config_publique", 1, { taux_cdf: tauxCDF }); show("✅ Taux enregistré"); charger(); })} className="w-full mt-2 bg-black text-white font-black py-3 rounded-xl">ENREGISTRER LE TAUX</button></div>
            <div className="bg-white rounded-xl p-3 mt-2"><div className="font-black">💳 Abonnements ($)</div>{Object.keys(tarifs).filter((k) => k.includes("usd")).map((k) => (<div key={k} className="flex items-center gap-2 mt-2"><span className="flex-1 text-[12px] font-bold">{k}</span><input type="number" value={tarifs[k]} onChange={(e) => setTarifs({ ...tarifs, [k]: Number(e.target.value) })} className="w-24 p-2 border rounded-lg text-center" /><span className="w-24 text-[11px]">{prixCDF(Number(tarifs[k])).toLocaleString()} FC</span></div>))}<div className="flex gap-2 mt-2"><div className="flex-1"><label className="text-[11px] font-bold">Freemium images</label><input type="number" value={tarifs.freemium_images} onChange={(e) => setTarifs({ ...tarifs, freemium_images: Number(e.target.value) })} className="w-full p-2 border rounded-lg" /></div><div className="flex-1"><label className="text-[11px] font-bold">Freemium jours</label><input type="number" value={tarifs.freemium_jours} onChange={(e) => setTarifs({ ...tarifs, freemium_jours: Number(e.target.value) })} className="w-full p-2 border rounded-lg" /></div></div><button onClick={() => demanderCodeTelegram(async () => { await supabase.from("config_publique").update({ tarifs_json: tarifs }).eq("id", 1); await ecrireJournalDG("PARAMETRE", "config_publique", 1, { tarifs }); show("✅ Abonnements enregistrés"); charger(); })} className="w-full mt-3 bg-black text-white font-black py-3 rounded-xl">ENREGISTRER LES ABONNEMENTS</button></div>
            <div className="bg-white rounded-xl p-3 mt-2"><div className="font-black">🤝 Commission ambassadeur</div><div className="text-[12px] mt-1">1er achat : {commissionAmb}% • Après : 0% • Exemple PRO 20$ = {prixCDF(20).toLocaleString()} FC → Amb {Math.round(prixCDF(20) * commissionAmb / 100).toLocaleString()} FC → WENZE {(prixCDF(20) - Math.round(prixCDF(20) * commissionAmb / 100)).toLocaleString()} FC</div><input type="number" value={commissionAmb} onChange={(e) => setCommissionAmb(Number(e.target.value))} className="w-full mt-2 p-3 border rounded-xl" /><button onClick={() => demanderCodeTelegram(async () => { await supabase.from("config_publique").update({ commission_amb_pct: commissionAmb }).eq("id", 1); await ecrireJournalDG("PARAMETRE", "config_publique", 1, { commission_amb_pct: commissionAmb }); show("✅ Commission enregistrée"); charger(); })} className="w-full mt-2 bg-black text-white font-black py-3 rounded-xl">ENREGISTRER LA COMMISSION</button></div>
            <div className="bg-white rounded-xl p-3 mt-2"><div className="font-black">🔑 Changer PIN DG</div><input type="password" value={pinActuel} onChange={(e) => setPinActuel(e.target.value)} placeholder="PIN actuel" className="w-full mt-2 p-3 border rounded-xl" /><input type="password" value={nouveauPin} onChange={(e) => setNouveauPin(e.target.value)} placeholder="Nouveau PIN" className="w-full mt-2 p-3 border rounded-xl" /><input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} placeholder="Confirmer nouveau PIN" className="w-full mt-2 p-3 border rounded-xl" /><button onClick={() => { if (nouveauPin !== confirmPin) return show("❌ Confirmation différente"); if (nouveauPin.length < 4) return show("⚠️ PIN trop court"); demanderCodeTelegram(async () => { const r = await fetch("/api/dg-change-pin", { method: "POST", body: JSON.stringify({ ancienPin: pinActuel, nouveauPin }) }); const j = await r.json(); if (!j.ok) return show("❌ " + (j.error || "Échec")); await ecrireJournalDG("SECURITE", "dg", null, { action: "CHANGEMENT_PIN" }); show("✅ PIN changé"); setPinActuel(""); setNouveauPin(""); setConfirmPin(""); }); }} className="w-full mt-2 bg-black text-white font-black py-3 rounded-xl">CHANGER LE PIN</button></div>
            <div className="bg-white rounded-xl p-3 mt-2"><div className="font-black">📲 Telegram + Sauvegarde</div><input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Chat ID Telegram" className="w-full mt-2 p-3 border rounded-xl" /><input type="password" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} placeholder="Token Bot (masqué)" className="w-full mt-2 p-3 border rounded-xl" /><button onClick={() => demanderCodeTelegram(async () => { await supabase.from("config_publique").update({ telegram_chat_id: telegramChatId, telegram_bot_token: telegramToken }).eq("id", 1); show("✅ Telegram enregistré"); })} className="w-full mt-2 bg-black text-white font-black py-3 rounded-xl">ENREGISTRER TELEGRAM</button><button onClick={() => { setDerniereSauvegarde(new Date().toLocaleString("fr-FR")); show("✅ Sauvegarde faite : " + new Date().toLocaleString("fr-FR")); }} className="w-full mt-2 bg-green-600 text-white font-black py-3 rounded-xl">💾 SAUVEGARDE MAINTENANT</button><div className="text-[12px] mt-2">Dernière : {derniereSauvegarde || "Jamais"} • Auto quotidienne : {sauvegardeAuto ? "ON" : "OFF"}</div></div>
          </div>
        )}

        {onglet === "JOURNAL" && (
          <div>
            <div className="bg-white rounded-xl p-3"><div className="font-black">📜 Journal DG — {journal.length} actions</div></div>
            {journal.slice(0, 50).map((j) => (
              <div key={j.id} className="bg-white rounded-xl p-3 mt-2 text-[12px]"><div className="font-black">{j.action} • {j.cible_type}</div><div className="opacity-70">{new Date(j.created_at || Date.now()).toLocaleString("fr-FR")} • {j.acteur}</div><div className="opacity-80 mt-1">{JSON.stringify(j.apres || {}).slice(0, 200)}</div></div>
            ))}
          </div>
        )}
      </div>

      {/* ===== MODALES — FERMETURE DU FICHIER ===== */}
      {showTelegramModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-[360px]">
            <h3 className="font-black text-[16px]">🔐 Vérification Telegram</h3>
            <input value={codeTelegram} onChange={(e) => setCodeTelegram(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") validerCodeTelegram(); }} placeholder="Code 6 chiffres" className="w-full mt-3 p-3 border rounded-xl text-center font-black text-[18px]" />
            <button onClick={validerCodeTelegram} className="w-full mt-3 bg-black text-white font-black py-3 rounded-xl">VALIDER</button>
            <button onClick={() => setShowTelegramModal(false)} className="w-full mt-2 py-2 text-[12px] font-bold">Annuler</button>
          </div>
        </div>
      )}

      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-[360px]">
            <h3 className="font-black text-[16px]">⛔ Suspendre — {showSuspendModal.titre || showSuspendModal.nom || ""}</h3>
            <input value={motifSuspensionLibre} onChange={(e) => setMotifSuspensionLibre(e.target.value)} placeholder="Motif libre (optionnel)" className="w-full mt-3 p-3 border rounded-xl" />
            <select value={motifSuspension} onChange={(e) => setMotifSuspension(e.target.value)} className="w-full mt-2 p-3 border rounded-xl"><option>Fausse annonce</option><option>Contenu immoral</option><option>Arnaque</option><option>Autre</option></select>
            <select value={dureeSuspension} onChange={(e) => setDureeSuspension(e.target.value)} className="w-full mt-2 p-3 border rounded-xl"><option value="1">1 jour</option><option value="7">7 jours</option><option value="30">30 jours</option><option value="365">Définitif</option></select>
            <button onClick={() => { if (showSuspendModal.titre || showSuspendModal.title) suspendreAnnonce(showSuspendModal.id); else changerStatutBoutique(showSuspendModal.id, "SUSPENDUE", motifSuspensionLibre.trim() || motifSuspension); }} className="w-full mt-3 bg-orange-500 text-white font-black py-3 rounded-xl">SUSPENDRE</button>
            <button onClick={() => setShowSuspendModal(null)} className="w-full mt-2 py-2 text-[12px] font-bold">Annuler</button>
          </div>
        </div>
      )}

      {showPreuve && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-[400px]">
            <h3 className="font-black">🧾 Preuve paiement</h3>
            <p className="text-[12px] mt-2 break-all">{showPreuve.preuve_url}</p>
            <a href={showPreuve.preuve_url} target="_blank" rel="noreferrer" className="block mt-3 bg-black text-white text-center font-black py-3 rounded-xl">Ouvrir la preuve</a>
            <button onClick={() => setShowPreuve(null)} className="w-full mt-2 py-2 text-[12px] font-bold">Fermer</button>
          </div>
        </div>
      )}

      {showTransfertZone && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-[360px]">
            <h3 className="font-black">⚠️ Zone déjà occupée</h3>
            <p className="text-[12px] mt-2">{showTransfertZone.commune} est occupée par {showTransfertZone.occupant?.nom} ({showTransfertZone.occupant?.code_pro}).</p>
            <button onClick={() => setShowTransfertZone(null)} className="w-full mt-3 bg-black text-white font-black py-3 rounded-xl">COMPRIS</button>
          </div>
        </div>
      )}
    </div>
  );
}
