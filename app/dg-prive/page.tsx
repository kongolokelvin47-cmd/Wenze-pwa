"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  supabase,
  estPublic,
  estPaye,
  estActif,
  typePaiement,
} from "../../lib/supabase";

const prixCDFHelper = (usd: number, taux: number) => {
  return Math.round((Number(usd) * Number(taux)) / 100) * 100;
};

const normaliserTel = (tel?: string) => String(tel || "").replace(/\D/g, "");

const COMMUNES_KIN = [
  "Gombe",
  "Kintambo",
  "Lingwala",
  "Kinshasa",
  "Barumbu",
  "Bandalungwa",
  "Bumbu",
  "Selembao",
  "Ngiri-Ngiri",
  "Kasa-Vubu",
  "Ngaba",
  "Kalamu",
  "Limete",
  "Matete",
  "Ndjili",
  "Kimbanseke",
  "Masina",
  "Nsele",
  "Maluku",
  "Mont-Ngafula",
  "Kisenso",
  "Lemba",
  "Ngaliema",
];

const ONGLETS = [
  "DASH",
  "MEMBRES",
  "BOUTIQUES",
  "CLIENTS",
  "PAIEMENTS",
  "ANNONCES",
  "TOMBOLA",
  "DETTES",
  "ZONES",
  "FILE",
  "PUB",
  "PARAMETRES",
  "JOURNAL",
] as const;

export default function DashboardDG() {
  // ===== ETATS DE BASE =====
  const [pin, setPin] = useState("");
  const [ok, setOk] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [membres, setMembres] = useState<any[]>([]);
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [problemes, setProblemes] = useState<any[]>([]);
  const [onglet, setOnglet] = useState<string>("DASH");
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

  // ===== PARAMETRES : TAUX + TARIFS + COMMISSION + POLITIQUE =====
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
  const [alertesTelegramActives, setAlertesTelegramActives] = useState(true);
  const [codeTelegram, setCodeTelegram] = useState("");
  const [envoiTelegramEnCours, setEnvoiTelegramEnCours] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [actionApresTelegram, setActionApresTelegram] = useState<
    (() => void) | null
  >(null);
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
  const [politiqueNotes, setPolitiqueNotes] = useState(
    "Validation sous 24h max • Preuve de paiement obligatoire • Zéro doublon Tombola"
  );

  // ===== HELPERS =====
  const show = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => {
      setToast((prev) => (prev === m ? "" : prev));
    }, 4000);
  }, []);

  const prixCDF = useCallback(
    (usd: number) => prixCDFHelper(usd, tauxCDF),
    [tauxCDF]
  );

  const ajouterFileAttente = useCallback((item: any) => {
    setFileAttente((prev) => {
      const maj = [
        {
          id: "queue-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5),
          date: new Date().toISOString(),
          ...item,
        },
        ...prev,
      ];
      try {
        localStorage.setItem("wenze_file_attente", JSON.stringify(maj));
      } catch {}
      return maj;
    });
  }, []);

  const envoyerAlerteTelegram = useCallback(
    async (titre: string, message: string, forcer = false) => {
      if (!alertesTelegramActives && !forcer) return;
      try {
        await fetch("/api/dg-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "ALERT", titre, message }),
        });
      } catch {
        // N'interrompt pas l'opération principale si le réseau est instable
      }
    },
    [alertesTelegramActives]
  );

  const notifier = useCallback(async (d: any) => {
    if (!supabase) return;
    const { error } = await supabase.from("notifications_perso").insert({
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
    if (error) console.error("Erreur notifier:", error.message);
  }, []);

  const ecrireJournalDG = useCallback(
    async (
      action: string,
      cible_type: any,
      cible_id: any,
      apres: any,
      avant?: any
    ) => {
      if (!supabase) return;
      const { error } = await supabase.from("wenze_journal").insert({
        acteur: "DG",
        acteur_role: "DG",
        action,
        cible_type,
        cible_id,
        avant: avant || null,
        apres: apres || null,
      });
      if (error) console.error("Erreur journal DG:", error.message);
    },
    []
  );

  const demanderCodeTelegram = useCallback(
    async (apresOK?: () => void) => {
      setEnvoiTelegramEnCours(true);
      try {
        const res = await fetch("/api/dg-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "SEND_OTP" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          show(`❌ Telegram : ${data?.error || "échec d'envoi du code"}`);
          return;
        }
        setCodeTelegram("");
        setActionApresTelegram(() => apresOK || null);
        setShowTelegramModal(true);
        show("📲 Code OTP à 6 chiffres envoyé sur ton Telegram");
      } catch {
        show("❌ API /api/dg-telegram indisponible");
      } finally {
        setEnvoiTelegramEnCours(false);
      }
    },
    [show]
  );

  const validerCodeTelegram = async () => {
    const code = codeTelegram.trim();
    if (!/^\d{6}$/.test(code)) {
      return show("⚠️ Entre le code à 6 chiffres reçu sur Telegram");
    }

    setEnvoiTelegramEnCours(true);
    try {
      const res = await fetch("/api/dg-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "VERIFY_OTP", code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        return show(`❌ ${data?.error || "Code Telegram incorrect"}`);
      }

      const callback = actionApresTelegram;
      setShowTelegramModal(false);
      setCodeTelegram("");
      setActionApresTelegram(null);
      if (callback) callback();
      show("✅ Vérification Telegram OK");
    } catch {
      show("❌ Erreur lors de la vérification Telegram");
    } finally {
      setEnvoiTelegramEnCours(false);
    }
  };

  // ===== CHARGER =====
  const charger = useCallback(async () => {
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
      supabase
        .from("notifications_perso")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("wenze_journal")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("wenze_commissions")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (m.data) setMembres(m.data);
    if (b.data) setBoutiques(b.data);
    if (c.data) setClients(c.data);
    if (p.data) setPaiements(p.data);
    if (a.data) setAnnonces(a.data);
    if (pr.data) setProblemes(pr.data);
    if (cfg.data) {
      setConfig({
        title: cfg.data.title || "WENZE",
        slogan: cfg.data.slogan || "",
        about: cfg.data.about || "",
        whats: cfg.data.whats || "",
        main: cfg.data.main || cfg.data.main_color || "#FF6B00",
        btn: cfg.data.btn || cfg.data.btn_color || "#111111",
      });
      if (cfg.data.taux_cdf) setTauxCDF(Number(cfg.data.taux_cdf));
      if (
        cfg.data.commission_amb_pct !== null &&
        cfg.data.commission_amb_pct !== undefined
      ) {
        setCommissionAmb(Number(cfg.data.commission_amb_pct));
      }
      if (cfg.data.tarifs_json) {
        setTarifs((prev: any) => ({ ...prev, ...cfg.data.tarifs_json }));
      }
      if (cfg.data.telegram_chat_id) {
        setTelegramChatId(String(cfg.data.telegram_chat_id));
      }
      if (cfg.data.telegram_bot_token) {
        setTelegramToken(String(cfg.data.telegram_bot_token));
      }
      if (cfg.data.politique_notes) {
        setPolitiqueNotes(String(cfg.data.politique_notes));
      }
    }
    if (t.data) setTombolaCfg((prev: any) => ({ ...prev, ...t.data }));
    if (np.data) setNotifsPerso(np.data);
    if (j.data) setJournal(j.data);
    if (comm.data) setCommissions(comm.data);
  }, []);

  // ===== EFFETS =====
  useEffect(() => {
    charger();
    setEnLigne(typeof navigator !== "undefined" ? navigator.onLine : true);
    const majLigne = () => setEnLigne(navigator.onLine);
    window.addEventListener("online", majLigne);
    window.addEventListener("offline", majLigne);
    try {
      setFileAttente(
        JSON.parse(localStorage.getItem("wenze_file_attente") || "[]")
      );
      const savedDate = localStorage.getItem("wenze_derniere_sauvegarde");
      if (savedDate) setDerniereSauvegarde(savedDate);
    } catch {}
    if (!supabase) {
      return () => {
        window.removeEventListener("online", majLigne);
        window.removeEventListener("offline", majLigne);
      };
    }
    const ch = supabase
      .channel("wenze-dg")
      .on("postgres_changes", { event: "*", schema: "public", table: "membres" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "boutiques" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "annonces" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "problemes" }, charger)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tombola_config" },
        (pay: any) => {
          if (pay.new) setTombolaCfg((prev: any) => ({ ...prev, ...pay.new }));
          charger();
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications_perso" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "wenze_journal" }, charger)
      .on("postgres_changes", { event: "*", schema: "public", table: "wenze_commissions" }, charger)
      .subscribe();
    const interval = setInterval(charger, 15000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
      window.removeEventListener("online", majLigne);
      window.removeEventListener("offline", majLigne);
    };
  }, [charger]);

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
        setTempsTombola(`${j}j ${h}h ${mn}min`);
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
  const paiementsEnAttente = paiements.filter((p) => !estPaye(p));
  const premiers = paiements.filter(
    (p) => typePaiement(p) === "PREMIER" && estPaye(p)
  );
  const occasionnels = paiements.filter(
    (p) => typePaiement(p) === "OCCASIONNELLE" && estPaye(p)
  );
  const renouvellements = paiements.filter(
    (p) => typePaiement(p) === "RENOUVELLEMENT" && estPaye(p)
  );

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
  const benefice = revenuWenze - totalCommissionsValidees;

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
  const ventesPeriode = paiementsPeriode
    .filter(estPaye)
    .reduce((s, p) => s + Number(p.montant || 0), 0);
  const boutiquesPeriode = boutiques.filter((b) => dansPeriode(b.created_at));
  const clientsPeriode = clients.filter((c) => dansPeriode(c.created_at));

  // ===== POINTS TOMBOLA =====
  const pointsDe = useCallback(
    (codeInvitation: string) => {
      const boutInv = boutiques.filter(
        (b) =>
          (b.code_invitation === codeInvitation || b.code_amb === codeInvitation) &&
          estActif(b.statut) &&
          estPublic(b.type_public || b.type || "BOUTIQUE")
      );
      const cliInv = clients.filter(
        (c) =>
          (c.code_invitation === codeInvitation ||
            c.code_parrain === codeInvitation) &&
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
      const totalBrut =
        boutInv.length * 5 + cliInv.length * 3 + aboPayes.length * 20;
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
    },
    [boutiques, clients, paiements, tombolaCfg.plafond]
  );

  const participants = useMemo(() => {
    const map = new Map();
    [...boutiques, ...clients].forEach((u: any) => {
      const type = String(
        u.type_public || u.type || (u.nomEtablissement ? "BOUTIQUE" : "CLIENT")
      ).toUpperCase();
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
  }, [boutiques, clients, pointsDe]);

  const classement = participants.filter((x) => x.pts.total > 0);
  const gagnantPotentiel = classement[0];
  const sup = membres.filter((m) => m.role === "SUPERVISEUR");
  const amb = membres.filter((m) => m.role === "AMBASSADEUR");

  // ===== ANTI-TRICHE : DOUBLON TELEPHONE =====
  const suspectsTombola = useMemo(() => {
    const comptes = new Map<string, number>();
    participants.forEach((p) => {
      const tel = normaliserTel(p.telephone);
      if (tel) comptes.set(tel, (comptes.get(tel) || 0) + 1);
    });
    return participants.filter((p) => {
      const tel = normaliserTel(p.telephone);
      return tel && (comptes.get(tel) || 0) > 1;
    });
  }, [participants]);

  // ===== LOGISTIQUE : COUVERTURE DES 23 COMMUNES =====
  const statsZones = useMemo(() => {
    return COMMUNES_KIN.map((commune) => {
      const supsZone = sup.filter(
        (m) =>
          String(m.commune || "").toLowerCase() === commune.toLowerCase() &&
          m.statut === "ACTIF"
      );
      const ambsZone = amb.filter(
        (m) => String(m.commune || "").toLowerCase() === commune.toLowerCase()
      );
      const boutsZone = boutiques.filter(
      (b) => String(b.commune || "").toLowerCase() === commune.toLowerCase()
      );
      const clisZone = clients.filter(
        (c) => String(c.commune || "").toLowerCase() === commune.toLowerCase()
      );
      return {
        commune,
        superviseurs: supsZone,
        ambassadeurs: ambsZone,
        boutiques: boutsZone,
        clients: clisZone,
        couverte: supsZone.length > 0,
      };
    });
  }, [sup, amb, boutiques, clients]);

  const zonesSansSuperviseur = statsZones.filter((z) => !z.couverte);

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
        : boutiques.filter(
            (b) => b.code_invitation === code || b.code_amb === code
          );
    const clientsZone =
      m.role === "SUPERVISEUR"
        ? clients.filter((c) => c.commune === zone)
        : clients.filter(
            (c) => c.code_invitation === code || c.code_parrain === code
          );
    const idsBoutiques = boutiquesZone.map((b) => b.id);
    const paiementsZone = paiements.filter(
      (p) => idsBoutiques.includes(p.boutique_id) || p.user_id === m.id
    );
    const payes = paiementsZone.filter(estPaye);
    const ventes = payes.reduce((s, p) => s + Number(p.montant || 0), 0);
    const comm = commissions
      .filter(
        (c: any) =>
          (c.ambassadeur_whatsapp === m.telephone ||
            c.ambassadeur_code === code) &&
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
      boutiquesValidees: boutiquesZone.filter((b) => b.statut === "VALIDEE")
        .length,
      boutiquesEnAttente: boutiquesZone.filter((b) => b.statut === "EN_ATTENTE")
        .length,
      clientsActifs: clientsZone.filter((c) => c.statut === "ACTIF").length,
      paiementsPayes: payes.length,
      paiementsEnAttente: paiementsZone.filter((p) => !estPaye(p)).length,
      pts,
    };
  };
  const statsSel = membreSelectionne ? statsMembre(membreSelectionne) : null;

  // ===== CONNEXION & VERROUILLAGE DG =====
  const connexionDG = async () => {
    const cleanPin = pin.trim();
    if (!cleanPin) return show("⚠️ Entre ton PIN DG");
    setLoadingAuth(true);
    try {
      const res = await fetch("/api/dg-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin: cleanPin }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setLoadingAuth(false);
        return show(j?.error ? `❌ ${j.error}` : "❌ PIN incorrect");
      }
    } catch {
      setLoadingAuth(false);
      return show("❌ API /api/dg-login indisponible");
    }
    setLoadingAuth(false);

    await demanderCodeTelegram(() => {
      setOk(true);
      setPin("");
      ecrireJournalDG("CONNEXION", "DG", null, { via: "PIN + Telegram OTP" });
      void envoyerAlerteTelegram(
        "Connexion Bureau DG",
        `Accès validé sur WENZE DG Privé le ${new Date().toLocaleString("fr-FR")}.`,
        true
      );
    });
  };

  const verrouillerBureauDG = async () => {
    await ecrireJournalDG("DECONNEXION", "DG", null, {
      via: "Verrouillage manuel",
    });
    setOk(false);
    setPin("");
    show("🔒 Bureau DG verrouillé");
  };

  // ===== CREER & GERER MEMBRES =====
  const creerMembre = async (forcerTransfert = false) => {
    if (!nomNouveau.trim() || !telNouveau.trim()) {
      return show("⚠️ Nom + Téléphone obligatoires");
    }
    if (!supabase) return show("⚠️ Supabase non connecté");

    if (roleNouveau === "SUPERVISEUR" && !forcerTransfert) {
      const supExistant = sup.find(
        (m) =>
          String(m.commune || "").toLowerCase() ===
            communeNouveau.toLowerCase() && m.statut === "ACTIF"
      );
      if (supExistant) {
        setShowTransfertZone({
          commune: communeNouveau,
          ancienSup: supExistant,
          nouveauNom: nomNouveau.trim(),
          nouveauTel: telNouveau.trim(),
        });
        return show(
          `⚠️ Un superviseur actif existe déjà à ${communeNouveau}`
        );
      }
    }

    if (forcerTransfert && showTransfertZone?.ancienSup) {
      await supabase
        .from("membres")
        .update({ statut: "REMPLACE" })
        .eq("id", showTransfertZone.ancienSup.id);
    }

    const prefixe = roleNouveau === "SUPERVISEUR" ? "SUP" : "AMB";
    const cleanNom = nomNouveau
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 3)
      .padEnd(3, "X");
    const alea = String(Math.floor(100 + Math.random() * 900));
    const codePro = `${prefixe}-${cleanNom}-2026-${alea}`;

    const nouveauMembre = {
      nom: nomNouveau.trim(),
      telephone: telNouveau.trim(),
      commune: communeNouveau,
      province: "Kinshasa",
      role: roleNouveau,
      code_pro: codePro,
      statut: "ACTIF",
    };

    if (!enLigne) {
      ajouterFileAttente({ type: "CREATION_MEMBRE", payload: nouveauMembre });
      setNomNouveau("");
      setTelNouveau("");
      setShowTransfertZone(null);
      return show("📴 Hors-ligne : création enregistrée dans la file");
    }

    const { data, error } = await supabase
      .from("membres")
      .insert(nouveauMembre)
      .select()
      .single();

    if (error) {
      return show("❌ Erreur création membre : " + error.message);
    }

    await ecrireJournalDG("CREATION_MEMBRE", "MEMBRE", data?.id || codePro, data);
    void envoyerAlerteTelegram(
      `Nouveau ${roleNouveau}`,
      `Nom : ${nouveauMembre.nom}\nZone : ${communeNouveau}\nCode Pro : <code>${codePro}</code>`
    );

    setNomNouveau("");
    setTelNouveau("");
    setShowTransfertZone(null);
    show(`✅ ${roleNouveau} créé (${codePro})`);
    await charger();
  };

  const changerStatutMembre = async (m: any, nouveauStatut: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("membres")
      .update({ statut: nouveauStatut })
      .eq("id", m.id);
    if (error) return show("❌ Erreur : " + error.message);
    await ecrireJournalDG(
      "STATUT_MEMBRE",
      "MEMBRE",
      m.id,
      { statut: nouveauStatut },
      { statut: m.statut }
    );
    show(`✅ ${m.nom} → ${nouveauStatut}`);
    await charger();
  };

  // ===== GESTION BOUTIQUES & MODERATION =====
  const validerBoutique = async (b: any) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("boutiques")
      .update({ statut: "VALIDEE", motif_suspension: null })
      .eq("id", b.id);
    if (error) return show("❌ Erreur : " + error.message);
    await ecrireJournalDG("VALIDATION_BOUTIQUE", "BOUTIQUE", b.id, {
      statut: "VALIDEE",
    });
    await notifier({
      user_id: b.id,
      type_compte: "BOUTIQUE",
      titre: "Boutique validée ✅",
      message: `Votre boutique ${b.nomEtablissement || b.nom || ""} est désormais active sur WENZE.`,
      type: "VALIDATION",
    });
    show("✅ Boutique validée");
    await charger();
  };

  const confirmerSuspension = async () => {
    if (!showSuspendModal || !supabase) return;
    const motifFinal =
      motifSuspension === "AUTRE"
        ? motifSuspensionLibre.trim() || "Non-conformité"
        : motifSuspension;
    const finSuspension = new Date(
      Date.now() + Number(dureeSuspension || 7) * 86400000
    ).toISOString();

    const { table, item } = showSuspendModal;
    const { error } = await supabase
      .from(table)
      .update({
        statut: "SUSPENDU",
        motif_suspension: motifFinal,
        suspension_fin: finSuspension,
      })
      .eq("id", item.id);

    if (error) return show("❌ Erreur suspension : " + error.message);

    await ecrireJournalDG("SUSPENSION", table.toUpperCase(), item.id, {
      motif: motifFinal,
      duree_jours: dureeSuspension,
      fin: finSuspension,
    });
    void envoyerAlerteTelegram(
      "Suspension de compte",
      `Table : ${table}\nCible : ${item.nomEtablissement || item.nom || item.id}\nMotif : ${motifFinal} (${dureeSuspension}j)`
    );
    setShowSuspendModal(null);
    setMotifSuspensionLibre("");
    show("⛔ Compte suspendu");
    await charger();
  };

  // ===== PAIEMENTS & COMMISSIONS =====
  const validerPaiement = async (p: any) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("paiements")
      .update({ statut: "PAYE", valide_par: "DG", valide_le: new Date().toISOString() })
      .eq("id", p.id);
    if (error) return show("❌ Erreur paiement : " + error.message);

    if (p.boutique_id) {
      await supabase
        .from("boutiques")
        .update({ statut: "VALIDEE" })
        .eq("id", p.boutique_id);
    }

    await ecrireJournalDG("VALIDATION_PAIEMENT", "PAIEMENT", p.id, {
      montant: p.montant,
      statut: "PAYE",
    });
    void envoyerAlerteTelegram(
      "Paiement Validé ✅",
      `Réf : ${p.id}\nMontant : ${Number(p.montant || 0).toLocaleString("fr-FR")} CDF`
    );
    show("✅ Paiement validé");
    await charger();
  };

  const validerCommission = async (c: any, statut: "VALIDEE" | "PAYEE") => {
    if (!supabase) return;
    const { error } = await supabase
      .from("wenze_commissions")
      .update({ statut })
      .eq("id", c.id);
    if (error) return show("❌ Erreur commission : " + error.message);
    await ecrireJournalDG("COMMISSION_" + statut, "COMMISSION", c.id, {
      statut,
      montant: c.montant_commission_cdf,
    });
    show(`✅ Commission → ${statut}`);
    await charger();
  };

  // ===== ANNONCES & DIFFUSION =====
  const publierAnnonceDG = async () => {
    if (!titreAnnonce.trim() || !msgAnnonce.trim()) {
      return show("⚠️ Titre et message obligatoires");
    }
    if (!supabase) return;
    await notifier({
      type_compte: cibleAnnonce,
      code_invitation: personneAnnonce.trim() || null,
      titre: titreAnnonce.trim(),
      message: msgAnnonce.trim(),
      type: "ANNONCE_DG",
    });
    await ecrireJournalDG("DIFFUSION_ANNONCE", "NOTIFICATION", null, {
      cible: cibleAnnonce,
      titre: titreAnnonce.trim(),
    });
    setTitreAnnonce("");
    setMsgAnnonce("");
    setPersonneAnnonce("");
    show("📢 Annonce diffusée");
    await charger();
  };

  // ===== TOMBOLA =====
  const piloterTombola = async (lancer: boolean) => {
    if (!supabase) return;
    const dateFin = lancer
      ? new Date(
          Date.now() + Number(tombolaCfg.duree_jours || 7) * 86400000
        ).toISOString()
      : null;

    const maj = {
      id: 1,
      lot: tombolaCfg.lot,
      plafond: Number(tombolaCfg.plafond || 100),
      duree_jours: Number(tombolaCfg.duree_jours || 7),
      regle_gagnant: tombolaCfg.regle_gagnant || "PLAFOND",
      active: lancer,
      statut: lancer ? "OUVERTE" : "FERMEE",
      date_fin: dateFin,
    };

    const { error } = await supabase.from("tombola_config").upsert(maj);
    if (error) return show("❌ Erreur tombola : " + error.message);

    await ecrireJournalDG(
      lancer ? "TOMBOLA_OUVERTE" : "TOMBOLA_CLOTUREE",
      "TOMBOLA",
      1,
      maj
    );
    void envoyerAlerteTelegram(
      lancer ? "Tombola Lancée 🎉" : "Tombola Clôturée 🏁",
      `Lot : ${maj.lot}\nPlafond : ${maj.plafond} pts\nLeader : ${gagnantPotentiel?.nom || "Aucun"}`
    );
    show(lancer ? "🎉 Tombola ouverte" : "🏁 Tombola clôturée");
    await charger();
  };
    // ===== PARAMETRES, POLITIQUE & CHANGEMENT PIN =====
  const sauvegarderParametres = async () => {
    if (!supabase) return;
    const payload = {
      id: 1,
      title: config.title,
      slogan: config.slogan,
      about: config.about,
      whats: config.whats,
      main: config.main,
      btn: config.btn,
      taux_cdf: Number(tauxCDF),
      commission_amb_pct: Number(commissionAmb),
      tarifs_json: tarifs,
      telegram_chat_id: telegramChatId.trim(),
      telegram_bot_token: telegramToken.trim(),
      politique_notes: politiqueNotes,
    };

    const { error } = await supabase.from("config_publique").upsert(payload);
    if (error) return show("❌ Erreur sauvegarde : " + error.message);

    const horodatage = new Date().toLocaleString("fr-FR");
    setDerniereSauvegarde(horodatage);
    try {
      localStorage.setItem("wenze_derniere_sauvegarde", horodatage);
    } catch {}

    await ecrireJournalDG("MAJ_PARAMETRES", "CONFIG", 1, {
      taux_cdf: tauxCDF,
      commission_amb_pct: commissionAmb,
    });
    void envoyerAlerteTelegram(
      "Paramètres WENZE mis à jour",
      `Taux : 1 USD = ${tauxCDF} CDF\nCommission Ambassadeur : ${commissionAmb}%`
    );
    show("✅ Paramètres enregistrés");
    await charger();
  };

  const changerPinDG = async () => {
    if (!pinActuel.trim() || !nouveauPin.trim()) {
      return show("⚠️ Remplis l'ancien et le nouveau PIN");
    }
    if (nouveauPin.trim() !== confirmPin.trim()) {
      return show("❌ La confirmation du nouveau PIN ne correspond pas");
    }

    await demanderCodeTelegram(async () => {
      try {
        const res = await fetch("/api/dg-change-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ancienPin: pinActuel.trim(),
            nouveauPin: nouveauPin.trim(),
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) {
          return show(`❌ ${j?.error || "Échec changement PIN"}`);
        }
        setPinActuel("");
        setNouveauPin("");
        setConfirmPin("");
        await ecrireJournalDG("CHANGEMENT_PIN_DG", "SECURITE", 1, {
          via: "PIN + Telegram OTP",
        });
        void envoyerAlerteTelegram(
          "Sécurité : PIN DG modifié 🔐",
          `Le code PIN du Bureau DG a été changé le ${new Date().toLocaleString("fr-FR")}.`,
          true
        );
        show("✅ PIN DG mis à jour avec succès");
      } catch {
        show("❌ API /api/dg-change-pin indisponible");
      }
    });
  };

  const synchroniserFileAttente = async () => {
    if (!enLigne) return show("📴 Toujours hors-ligne");
    if (!supabase || fileAttente.length === 0) return;
    let traites = 0;
    for (const item of fileAttente) {
      if (item.type === "CREATION_MEMBRE" && item.payload) {
        const { error } = await supabase.from("membres").insert(item.payload);
        if (!error) traites++;
      }
    }
    setFileAttente([]);
    try {
      localStorage.removeItem("wenze_file_attente");
    } catch {}
    show(`✅ ${traites} opération(s) synchronisée(s)`);
    await charger();
  };

  const exporterSauvegardeJSON = () => {
    const snapshot = {
      date: new Date().toISOString(),
      tauxCDF,
      commissionAmb,
      tarifs,
      membres,
      boutiques,
      clients,
      paiements,
      commissions,
      tombolaCfg,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wenze-dg-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    show("💾 Sauvegarde JSON téléchargée");
  };

  // ===== ECRAN DE VERROUILLAGE DG =====
  if (!ok) {
    return (
      <div className="min-h-screen bg-[#0F1115] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] bg-[#181B22] border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-orange-500/20 text-orange-400">
              Direction Générale • Kinshasa
            </span>
            <span
              className={`text-[11px] font-bold ${
                enLigne ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {enLigne ? "● En ligne" : "● Hors-ligne"}
            </span>
          </div>

          <div className="text-center mt-6">
            <div className="text-4xl">👑</div>
            <h1 className="text-2xl font-black mt-2">WENZE — DG PRIVÉ</h1>
            <p className="text-xs text-gray-400 mt-1">
              Double authentification : Code PIN + Confirmation Telegram
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void connexionDG();
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="text-xs font-bold text-gray-300">
                Code PIN Direction Générale
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full mt-1.5 bg-[#0F1115] border border-white/15 rounded-2xl px-4 py-3.5 text-center text-xl tracking-[0.4em] font-black focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={loadingAuth || envoiTelegramEnCours}
              className="w-full bg-[#FF6B00] hover:bg-orange-500 text-black font-black py-3.5 rounded-2xl transition disabled:opacity-50"
            >
              {loadingAuth || envoiTelegramEnCours
                ? "Vérification en cours..."
                : "🔐 Déverrouiller & Recevoir Code Telegram"}
            </button>
          </form>

          {toast && (
            <div className="mt-4 bg-white/10 border border-white/15 rounded-xl p-3 text-center text-xs font-bold">
              {toast}
            </div>
          )}
        </div>

        {/* MODAL OTP TELEGRAM */}
        {showTelegramModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-[380px] bg-[#181B22] border border-white/15 rounded-3xl p-6">
              <h2 className="text-lg font-black">📲 Confirmation Telegram</h2>
              <p className="text-xs text-gray-400 mt-1">
                Saisis le code à 6 chiffres envoyé par ton bot Telegram WENZE.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={codeTelegram}
                onChange={(e) => setCodeTelegram(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full mt-4 bg-[#0F1115] border border-white/20 rounded-2xl px-4 py-3 text-center text-2xl tracking-[0.35em] font-black"
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTelegramModal(false);
                    setCodeTelegram("");
                  }}
                  className="flex-1 bg-white/10 py-3 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={envoiTelegramEnCours}
                  onClick={() => void validerCodeTelegram()}
                  className="flex-1 bg-[#FF6B00] text-black py-3 rounded-xl text-xs font-black"
                >
                  Valider le code
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  // ===== FILTRES DE RECHERCHE =====
  const q = recherche.trim().toLowerCase();
  const membresFiltres = membres.filter(
    (m) =>
      !q ||
      String(m.nom || "").toLowerCase().includes(q) ||
      String(m.code_pro || "").toLowerCase().includes(q) ||
      String(m.commune || "").toLowerCase().includes(q) ||
      String(m.telephone || "").includes(q)
  );
  const boutiquesFiltrees = boutiques.filter(
    (b) =>
      !q ||
      String(b.nomEtablissement || b.nom || "").toLowerCase().includes(q) ||
      String(b.commune || "").toLowerCase().includes(q) ||
      String(b.telephone || "").includes(q)
  );
  const clientsFiltres = clients.filter(
    (c) =>
      !q ||
      String(c.nom || "").toLowerCase().includes(q) ||
      String(c.commune || "").toLowerCase().includes(q) ||
      String(c.telephone || "").includes(q)
  );
  const paiementsFiltres = paiements.filter((p) => {
    const matchType =
      filtreType === "TOUS" ||
      (filtreType === "EN_ATTENTE" && !estPaye(p)) ||
      typePaiement(p) === filtreType;
    const matchQ =
      !q ||
      String(p.id || "").toLowerCase().includes(q) ||
      String(p.reference || "").toLowerCase().includes(q);
    return matchType && matchQ;
  });

  // ===== BUREAU DG OUVERT =====
  return (
    <div className="min-h-screen bg-[#F5F6F8] text-gray-900 pb-24">
      {/* BARRE SUPERIEURE EXÉCUTIVE */}
      <header className="sticky top-0 z-30 bg-[#111318] text-white px-4 py-3 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-tight">
                👑 {config.title || "WENZE"} — BUREAU DG
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  enLigne
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-red-500/20 text-red-300"
                }`}
              >
                {enLigne ? "EN LIGNE" : "HORS-LIGNE"}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              1 USD = {tauxCDF.toLocaleString("fr-FR")} CDF • Comm. Amb :{" "}
              {commissionAmb}% • Zones couvertes :{" "}
              {COMMUNES_KIN.length - zonesSansSuperviseur.length}/
              {COMMUNES_KIN.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void charger()}
              className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-bold"
              title="Actualiser"
            >
              🔄
            </button>
            <button
              type="button"
              onClick={() => void verrouillerBureauDG()}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-2 rounded-xl text-xs font-black"
            >
              🔒 Verrouiller
            </button>
          </div>
        </div>

        {/* NAVIGATION ONGLETS */}
        <nav className="max-w-5xl mx-auto flex gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar">
          {ONGLETS.map((tab) => (
            <button
              key={tab}
              id={"onglet-" + tab}
              type="button"
              onClick={() => setOnglet(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition ${
                onglet === tab
                  ? "bg-[#FF6B00] text-black"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {tab}
              {tab === "PAIEMENTS" && paiementsEnAttente.length > 0
                ? ` (${paiementsEnAttente.length})`
                : ""}
              {tab === "FILE" && fileAttente.length > 0
                ? ` (${fileAttente.length})`
                : ""}
            </button>
          ))}
        </nav>
      </header>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-black">
          {toast}
        </div>
      )}

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {/* BARRE DE RECHERCHE GLOBALE */}
        <div className="flex gap-2">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="🔍 Rechercher membre, code pro, boutique, commune, téléphone..."
            className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche("")}
              className="bg-gray-200 px-3 rounded-2xl text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* ===== 1. DASHBOARD EXÉCUTIF ===== */}
        {onglet === "DASH" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base">📊 Pilotage & Statistiques</h2>
              <div className="flex gap-1 bg-white p-1 rounded-xl border">
                {["JOUR", "SEMAINE", "MOIS", "ANNEE", "TOUT"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodeStats(p)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                      periodeStats === p
                        ? "bg-black text-white"
                        : "text-gray-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border">
                <p className="text-[11px] text-gray-500 font-bold">
                  Revenu Total (CDF)
                </p>
                <p className="text-lg font-black mt-1">
                  {revenuWenze.toLocaleString("fr-FR")} FC
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                  Période : {ventesPeriode.toLocaleString("fr-FR")} FC
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border">
                <p className="text-[11px] text-gray-500 font-bold">
                  Bénéfice Net WENZE
                </p>
                <p className="text-lg font-black text-emerald-700 mt-1">
                  {benefice.toLocaleString("fr-FR")} FC
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Comm. versées :{" "}
                  {totalCommissionsValidees.toLocaleString("fr-FR")} FC
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border">
                <p className="text-[11px] text-gray-500 font-bold">
                  Réseau Kinshasa
                </p>
                <p className="text-lg font-black mt-1">
                  {boutiques.length} Boutiques • {clients.length} Clients
                </p>
                <p className="text-[11px] text-orange-600 font-bold mt-0.5">
                  +{boutiquesPeriode.length} bout. / +{clientsPeriode.length}{" "}
                  cli. ({periodeStats})
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border">
                <p className="text-[11px] text-gray-500 font-bold">
                  Force Terrain & Alertes
                </p>
                <p className="text-lg font-black mt-1">
                  {sup.length} Sup • {amb.length} Amb
                </p>
                <p className="text-[11px] text-red-600 font-bold mt-0.5">
                  {paiementsEnAttente.length} paie. attente •{" "}
                  {boutiquesCachees.length} dettes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border">
                <p className="text-xs font-black">Abonnements Payés</p>
                <p className="text-xs text-gray-600 mt-2">
                  • Premiers : <b>{premiers.length}</b>
                  <br />• Occasionnels : <b>{occasionnels.length}</b>
                  <br />• Renouvellements : <b>{renouvellements.length}</b>
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border">
                <p className="text-xs font-black">Surveillance & Conformité</p>
                <p className="text-xs text-gray-600 mt-2">
                  • Suspects doublons Tombola :{" "}
                  <b className="text-red-600">{suspectsTombola.length}</b>
                  <br />• Problèmes signalés : <b>{problemes.length}</b>
                  <br />• Commissions en attente :{" "}
                  <b>{totalCommissionsEnAttente.toLocaleString("fr-FR")} FC</b>
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border">
                <p className="text-xs font-black">Politique Opérationnelle</p>
                <p className="text-xs text-gray-600 mt-2">{politiqueNotes}</p>
              </div>
            </div>
          </div>
        )}
     {/* ===== 2. MEMBRES (SUPERVISEURS & AMBASSADEURS) ===== */}
        {onglet === "MEMBRES" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border space-y-3">
              <h2 className="font-black text-sm">
                ➕ Créer un Superviseur ou Ambassadeur
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  value={nomNouveau}
                  onChange={(e) => setNomNouveau(e.target.value)}
                  placeholder="Nom complet"
                  className="border rounded-xl px-3 py-2 text-xs"
                />
                <input
                  value={telNouveau}
                  onChange={(e) => setTelNouveau(e.target.value)}
                  placeholder="WhatsApp (+243...)"
                  className="border rounded-xl px-3 py-2 text-xs"
                />
                <select
                  value={communeNouveau}
                  onChange={(e) => setCommuneNouveau(e.target.value)}
                  className="border rounded-xl px-3 py-2 text-xs"
                >
                  {COMMUNES_KIN.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={roleNouveau}
                  onChange={(e) => setRoleNouveau(e.target.value)}
                  className="border rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="SUPERVISEUR">SUPERVISEUR</option>
                  <option value="AMBASSADEUR">AMBASSADEUR</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => void creerMembre(false)}
                className="bg-black text-white px-4 py-2.5 rounded-xl text-xs font-black"
              >
                Créer & Générer Code Pro
              </button>
            </div>

            {statsSel && membreSelectionne && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-sm">
                    📈 Performance : {membreSelectionne.nom} (
                    {membreSelectionne.code_pro})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMembreSelectionne(null)}
                    className="text-xs font-bold underline"
                  >
                    Fermer
                  </button>
                </div>
                <p className="text-xs mt-2">
                  Boutiques : <b>{statsSel.boutiques.length}</b> (validées :{" "}
                  {statsSel.boutiquesValidees}) • Clients :{" "}
                  <b>{statsSel.clients.length}</b> • Ventes :{" "}
                  <b>{statsSel.ventes.toLocaleString("fr-FR")} FC</b> •
                  Commission :{" "}
                  <b>{statsSel.commission.toLocaleString("fr-FR")} FC</b> •
                  Points Tombola : <b>{statsSel.pts.total}</b>
                </p>
              </div>
            )}

            <div className="space-y-2">
              {membresFiltres.map((m) => (
                <div
                  key={m.id}
                  className="bg-white p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2"
                >
                  <div
                    onClick={() => setMembreSelectionne(m)}
                    className="cursor-pointer"
                  >
                    <p className="font-black text-xs">
                      {m.nom}{" "}
                      <span className="text-orange-600">({m.code_pro})</span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {m.role} • {m.commune} • {m.telephone} • Statut :{" "}
                      <b>{m.statut}</b>
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => void changerStatutMembre(m, "ACTIF")}
                      className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                    >
                      Activer
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setShowSuspendModal({ table: "membres", item: m })
                      }
                      className="bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                    >
                      Suspendre
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ===== 3. BOUTIQUES ===== */}
        {onglet === "BOUTIQUES" && (
          <div className="space-y-2">
            <h2 className="font-black text-sm">
              🏪 Boutiques ({boutiquesFiltrees.length})
            </h2>
            {boutiquesFiltrees.map((b) => (
              <div
                key={b.id}
                className="bg-white p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="font-black text-xs">
                    {b.nomEtablissement || b.nom || "Boutique"}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {b.commune} • {b.telephone || b.whatsapp} • Statut :{" "}
                    <b>{b.statut}</b>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => void validerBoutique(b)}
                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setShowSuspendModal({ table: "boutiques", item: b })
                    }
                    className="bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-[11px] font-bold"
                  >
                    Suspendre
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== 4. CLIENTS ===== */}
        {onglet === "CLIENTS" && (
          <div className="space-y-2">
            <h2 className="font-black text-sm">
              👥 Clients ({clientsFiltres.length})
            </h2>
            {clientsFiltres.map((c) => (
              <div
                key={c.id}
                className="bg-white p-3.5 rounded-2xl border flex items-center justify-between"
              >
                <div>
                  <p className="font-black text-xs">{c.nom || "Client"}</p>
                  <p className="text-[11px] text-gray-500">
                    {c.commune} • {c.telephone} • Statut : <b>{c.statut}</b>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setShowSuspendModal({ table: "clients", item: c })
                  }
                  className="bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-[11px] font-bold"
                >
                  Suspendre
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ===== 5. PAIEMENTS & COMMISSIONS ===== */}
        {onglet === "PAIEMENTS" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {["TOUS", "EN_ATTENTE", "PREMIER", "OCCASIONNELLE", "RENOUVELLEMENT"].map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFiltreType(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                      filtreType === f ? "bg-black text-white" : "bg-white border"
                    }`}
                  >
                    {f}
                  </button>
                )
              )}
            </div>

            <div className="space-y-2">
              {paiementsFiltres.map((p) => (
                <div
                  key={p.id}
                  className="bg-white p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-black text-xs">
                      {Number(p.montant || 0).toLocaleString("fr-FR")} CDF —{" "}
                      {typePaiement(p)}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Statut : <b>{p.statut}</b> • Réf : {p.reference || p.id}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {p.preuve_url && (
                      <button
                        type="button"
                        onClick={() => setShowPreuve(p)}
                        className="bg-gray-100 px-3 py-1.5 rounded-xl text-[11px] font-bold"
                      >
                        Preuve
                      </button>
                    )}
                    {!estPaye(p) && (
                      <button
                        type="button"
                        onClick={() => void validerPaiement(p)}
                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-black"
                      >
                        Valider Paiement
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {commissions.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="font-black text-xs">
                  💸 Commissions Ambassadeurs ({commissions.length})
                </h3>
                {commissions.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white p-3 rounded-2xl border flex items-center justify-between"
                  >
                    <div className="text-xs">
                      <b>
                        {Number(c.montant_commission_cdf || 0).toLocaleString(
                          "fr-FR"
                        )}{" "}
                        FC
                      </b>{" "}
                      — {c.ambassadeur_code || c.ambassadeur_whatsapp} (
                      {c.statut})
                    </div>
                    {c.statut === "EN_ATTENTE" && (
                      <button
                        type="button"
                        onClick={() => void validerCommission(c, "VALIDEE")}
                        className="bg-black text-white px-3 py-1 rounded-xl text-[11px] font-bold"
                      >
                        Valider
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== 6. ANNONCES & DIFFUSION ===== */}
        {onglet === "ANNONCES" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border space-y-3">
              <h2 className="font-black text-sm">
                📢 Diffuser une note ou alerte interne
              </h2>
              <input
                value={titreAnnonce}
                onChange={(e) => setTitreAnnonce(e.target.value)}
                placeholder="Titre de l'annonce"
                className="w-full border rounded-xl px-3 py-2 text-xs"
              />
              <textarea
                value={msgAnnonce}
                onChange={(e) => setMsgAnnonce(e.target.value)}
                placeholder="Message..."
                rows={3}
                className="w-full border rounded-xl px-3 py-2 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={cibleAnnonce}
                  onChange={(e) => setCibleAnnonce(e.target.value)}
                  className="border rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="TOUS">TOUS</option>
                  <option value="SUPERVISEUR">SUPERVISEURS</option>
                  <option value="AMBASSADEUR">AMBASSADEURS</option>
                  <option value="BOUTIQUE">BOUTIQUES</option>
                </select>
                <input
                  value={personneAnnonce}
                  onChange={(e) => setPersonneAnnonce(e.target.value)}
                  placeholder="Code Pro ciblé (optionnel)"
                  className="flex-1 border rounded-xl px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => void publierAnnonceDG()}
                  className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black"
                >
                  Envoyer
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {annonces.map((a) => (
                <div key={a.id} className="bg-white p-3 rounded-2xl border text-xs">
                  <b>{a.titre || "Annonce"}</b> —{" "}
                  <span className="text-gray-500">{a.statut || "ACTIVE"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
           {/* ===== 7. TOMBOLA & ANTI-TRICHE ===== */}
        {onglet === "TOMBOLA" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-sm">
                  🎁 Tombola ({tombolaCfg.statut || "FERMEE"})
                </h2>
                {tempsTombola && (
                  <span className="text-xs font-black text-orange-600">
                    ⏱ {tempsTombola}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  value={tombolaCfg.lot || ""}
                  onChange={(e) =>
                    setTombolaCfg({ ...tombolaCfg, lot: e.target.value })
                  }
                  placeholder="Lot à gagner"
                  className="border rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="number"
                  value={tombolaCfg.plafond || 100}
                  onChange={(e) =>
                    setTombolaCfg({ ...tombolaCfg, plafond: Number(e.target.value) })
                  }
                  placeholder="Plafond points"
                  className="border rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="number"
                  value={tombolaCfg.duree_jours || 7}
                  onChange={(e) =>
                    setTombolaCfg({
                      ...tombolaCfg,
                      duree_jours: Number(e.target.value),
                    })
                  }
                  placeholder="Durée (jours)"
                  className="border rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void piloterTombola(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black"
                >
                  🚀 Lancer Tombola
                </button>
                <button
                  type="button"
                  onClick={() => void piloterTombola(false)}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black"
                >
                  🛑 Clôturer
                </button>
              </div>
            </div>

            {suspectsTombola.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
                <h3 className="font-black text-xs text-red-800">
                  🚨 Anti-triche : {suspectsTombola.length} compte(s) avec numéro
                  en doublon
                </h3>
                {suspectsTombola.map((s) => (
                  <p key={s.id} className="text-[11px] text-red-700 mt-1">
                    • {s.nom} ({s.code}) — {s.telephone}
                  </p>
                ))}
              </div>
            )}

            <div className="bg-white p-4 rounded-2xl border space-y-2">
              <h3 className="font-black text-xs">
                🏆 Classement ({classement.length} participants)
              </h3>
              {classement.slice(0, 20).map((p, idx) => (
                <div
                  key={p.code}
                  className="flex justify-between text-xs border-b py-1.5"
                >
                  <span>
                    #{idx + 1} <b>{p.nom}</b> ({p.commune || "Kinshasa"})
                  </span>
                  <span className="font-black text-orange-600">
                    {p.pts.total} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 8. DETTES & FREEMIUM DÉPASSÉ ===== */}
        {onglet === "DETTES" && (
          <div className="space-y-2">
            <h2 className="font-black text-sm">
              ⚠️ Boutiques hors période Freemium ({boutiquesCachees.length})
            </h2>
            {boutiquesCachees.map((b) => (
              <div
                key={b.id}
                className="bg-white p-3.5 rounded-2xl border flex items-center justify-between"
              >
                <div>
                  <p className="font-black text-xs">
                    {b.nomEtablissement || b.nom}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {b.commune} • {b.telephone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setShowSuspendModal({ table: "boutiques", item: b })
                  }
                  className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold"
                >
                  Restreindre
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ===== 9. LOGISTIQUE & ZONES KINSHASA ===== */}
        {onglet === "ZONES" && (
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-2xl border">
              <h2 className="font-black text-sm">
                🗺️ Maillage Logistique Kinshasa ({COMMUNES_KIN.length} communes)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Communes sans superviseur actif :{" "}
                <b className="text-red-600">{zonesSansSuperviseur.length}</b>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {statsZones.map((z) => (
                <div
                  key={z.commune}
                  className={`p-3.5 rounded-2xl border ${
                    z.couverte ? "bg-white" : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs">{z.commune}</span>
                    <span className="text-[11px] font-bold">
                      {z.couverte
                        ? `👑 ${z.superviseurs[0]?.nom}`
                        : "⚠️ Sans superviseur"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Ambassadeurs : {z.ambassadeurs.length} • Boutiques :{" "}
                    {z.boutiques.length} • Clients : {z.clients.length}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 10. FILE D'ATTENTE HORS-LIGNE ===== */}
        {onglet === "FILE" && (
          <div className="bg-white p-4 rounded-2xl border space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-sm">
                📴 File Hors-Ligne ({fileAttente.length})
              </h2>
              {fileAttente.length > 0 && (
                <button
                  type="button"
                  onClick={() => void synchroniserFileAttente()}
                  className="bg-black text-white px-3 py-1.5 rounded-xl text-xs font-black"
                >
                  Synchroniser maintenant
                </button>
              )}
            </div>
            {fileAttente.length === 0 ? (
              <p className="text-xs text-gray-500">
                Aucune opération en attente de synchronisation.
              </p>
            ) : (
              fileAttente.map((item) => (
                <div key={item.id} className="border rounded-xl p-2.5 text-xs">
                  <b>{item.type}</b> — {item.date}
                </div>
              ))
            )}
          </div>
        )}

        {/* ===== 11. VITRINE PUBLIQUE (PUB) ===== */}
        {onglet === "PUB" && (
          <div className="bg-white p-4 rounded-2xl border space-y-3">
            <h2 className="font-black text-sm">🎨 Identité & Vitrine Publique</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Nom plateforme"
                className="border rounded-xl px-3 py-2 text-xs"
              />
              <input
                value={config.whats}
                onChange={(e) => setConfig({ ...config, whats: e.target.value })}
                placeholder="WhatsApp Support"
                className="border rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <input
              value={config.slogan}
              onChange={(e) => setConfig({ ...config, slogan: e.target.value })}
              placeholder="Slogan"
              className="w-full border rounded-xl px-3 py-2 text-xs"
            />
            <textarea
              value={config.about}
              onChange={(e) => setConfig({ ...config, about: e.target.value })}
              placeholder="À propos"
              rows={3}
              className="w-full border rounded-xl px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={() => void sauvegarderParametres()}
              className="bg-black text-white px-4 py-2.5 rounded-xl text-xs font-black"
            >
              Enregistrer la vitrine
            </button>
          </div>
        )}
             {/* ===== 12. PARAMETRES, SÉCURITÉ, TELEGRAM & POLITIQUE ===== */}
        {onglet === "PARAMETRES" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border space-y-3">
              <h2 className="font-black text-sm">
                💱 Taux, Commissions & Politique Tarifaire
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] font-bold">Taux 1 USD (CDF)</label>
                  <input
                    type="number"
                    value={tauxCDF}
                    onChange={(e) => setTauxCDF(Number(e.target.value))}
                    className="w-full border rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold">
                    Commission Amb. (%)
                  </label>
                  <input
                    type="number"
                    value={commissionAmb}
                    onChange={(e) => setCommissionAmb(Number(e.target.value))}
                    className="w-full border rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold">
                    Standard 30j (USD)
                  </label>
                  <input
                    type="number"
                    value={tarifs.standard_30j_usd}
                    onChange={(e) =>
                      setTarifs({
                        ...tarifs,
                        standard_30j_usd: Number(e.target.value),
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 text-xs mt-1"
                  />
                  <p className="text-[10px] text-gray-500">
                    = {prixCDF(tarifs.standard_30j_usd).toLocaleString("fr-FR")} FC
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-bold">Pro 30j (USD)</label>
                  <input
                    type="number"
                    value={tarifs.pro_30j_usd}
                    onChange={(e) =>
                      setTarifs({
                        ...tarifs,
                        pro_30j_usd: Number(e.target.value),
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 text-xs mt-1"
                  />
                  <p className="text-[10px] text-gray-500">
                    = {prixCDF(tarifs.pro_30j_usd).toLocaleString("fr-FR")} FC
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold">
                  Règles de gouvernance & politique interne
                </label>
                <textarea
                  value={politiqueNotes}
                  onChange={(e) => setPolitiqueNotes(e.target.value)}
                  rows={2}
                  className="w-full border rounded-xl px-3 py-2 text-xs mt-1"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={alertesTelegramActives}
                    onChange={(e) => setAlertesTelegramActives(e.target.checked)}
                  />
                  Activer les alertes Telegram en temps réel
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void envoyerAlerteTelegram(
                        "Test Alerte Telegram",
                        "La liaison entre WENZE DG Privé et Telegram est opérationnelle.",
                        true
                      )
                    }
                    className="bg-sky-600 text-white px-3 py-2 rounded-xl text-xs font-bold"
                  >
                    📲 Tester Telegram
                  </button>
                  <button
                    type="button"
                    onClick={() => void sauvegarderParametres()}
                    className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black"
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>

            {/* CHANGEMENT PIN DG AVEC OTP TELEGRAM */}
            <div className="bg-white p-4 rounded-2xl border space-y-3">
              <h2 className="font-black text-sm">
                🔐 Sécurité : Modifier le PIN DG (validation Telegram requise)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="password"
                  value={pinActuel}
                  onChange={(e) => setPinActuel(e.target.value)}
                  placeholder="PIN actuel"
                  className="border rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="password"
                  value={nouveauPin}
                  onChange={(e) => setNouveauPin(e.target.value)}
                  placeholder="Nouveau PIN (4-16)"
                  className="border rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Confirmer nouveau PIN"
                  className="border rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => void changerPinDG()}
                className="bg-[#FF6B00] text-black px-4 py-2.5 rounded-xl text-xs font-black"
              >
                Changer le PIN DG
              </button>
            </div>

            {/* SAUVEGARDE */}
            <div className="bg-white p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                <b>Sauvegarde locale & export</b>
                {derniereSauvegarde && (
                  <p className="text-[11px] text-gray-500">
                    Dernière sauvegarde : {derniereSauvegarde}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={exporterSauvegardeJSON}
                className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                💾 Exporter JSON
              </button>
            </div>
          </div>
        )}

        {/* ===== 13. JOURNAL D'AUDIT ===== */}
        {onglet === "JOURNAL" && (
          <div className="space-y-2">
            <h2 className="font-black text-sm">
              📜 Journal d&apos;audit DG ({journal.length})
            </h2>
            {journal.map((j, idx) => (
              <div
                key={j.id || idx}
                className="bg-white p-3 rounded-2xl border text-xs"
              >
                <div className="flex justify-between">
                  <b>{j.action}</b>
                  <span className="text-[11px] text-gray-400">
                    {j.created_at
                      ? new Date(j.created_at).toLocaleString("fr-FR")
                      : ""}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Cible : {j.cible_type || "-"} {j.cible_id ? `#${j.cible_id}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL TRANSFERT DE ZONE SUPERVISEUR */}
      {showTransfertZone && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3">
            <h3 className="font-black text-sm">
              🔄 Transfert de zone — {showTransfertZone.commune}
            </h3>
            <p className="text-xs text-gray-600">
              <b>{showTransfertZone.ancienSup?.nom}</b> supervise déjà cette
              commune. Confirmer le remplacement par{" "}
              <b>{showTransfertZone.nouveauNom}</b> ?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTransfertZone(null)}
                className="flex-1 bg-gray-100 py-2.5 rounded-xl text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void creerMembre(true)}
                className="flex-1 bg-black text-white py-2.5 rounded-xl text-xs font-black"
              >
                Confirmer transfert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUSPENSION MOTIVÉE */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3">
            <h3 className="font-black text-sm">⛔ Suspendre le compte</h3>
            <select
              value={motifSuspension}
              onChange={(e) => setMotifSuspension(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-xs"
            >
              <option value="Fausse annonce">Fausse annonce</option>
              <option value="Non-paiement abonnement">
                Non-paiement abonnement
              </option>
              <option value="Fraude / Doublon">Fraude / Doublon</option>
              <option value="AUTRE">Autre motif</option>
            </select>
            {motifSuspension === "AUTRE" && (
              <input
                value={motifSuspensionLibre}
                onChange={(e) => setMotifSuspensionLibre(e.target.value)}
                placeholder="Préciser le motif..."
                className="w-full border rounded-xl px-3 py-2 text-xs"
              />
            )}
            <select
              value={dureeSuspension}
              onChange={(e) => setDureeSuspension(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-xs"
            >
              <option value="3">3 jours</option>
              <option value="7">7 jours</option>
              <option value="30">30 jours</option>
              <option value="365">Définitive (365j)</option>
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSuspendModal(null)}
                className="flex-1 bg-gray-100 py-2.5 rounded-xl text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void confirmerSuspension()}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-xs font-black"
              >
                Suspendre
              </button>
            </div>
          </div>
        </div>
      )}
                        {/* MODAL PREUVE PAIEMENT */}
      {showPreuve && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full space-y-3">
            <h3 className="font-black text-sm">🧾 Preuve de paiement</h3>
            {showPreuve.preuve_url ? (
              <img
                src={showPreuve.preuve_url}
                alt="Preuve de paiement"
                className="w-full max-h-80 object-contain rounded-xl border"
              />
            ) : (
              <p className="text-xs text-gray-500">Aucune image jointe.</p>
            )}
            <button
              type="button"
              onClick={() => setShowPreuve(null)}
              className="w-full bg-black text-white py-2.5 rounded-xl text-xs font-black"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* MODAL OTP TELEGRAM (ACTIONS SENSIBLES INTERNES) */}
      {showTelegramModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3">
            <h3 className="font-black text-sm">
              📲 Confirmation de sécurité Telegram
            </h3>
            <p className="text-xs text-gray-600">
              Entre le code à 6 chiffres envoyé sur ton Telegram pour valider
              cette opération sensible.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={codeTelegram}
              onChange={(e) => setCodeTelegram(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full border rounded-xl px-3 py-2.5 text-center text-xl tracking-[0.35em] font-black"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTelegramModal(false);
                  setCodeTelegram("");
                }}
                className="flex-1 bg-gray-100 py-2.5 rounded-xl text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={envoiTelegramEnCours}
                onClick={() => void validerCodeTelegram()}
                className="flex-1 bg-black text-white py-2.5 rounded-xl text-xs font-black"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
              }
