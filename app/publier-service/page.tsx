"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cleanWa, getUser, readList } from "@/app/publier/helpers";
import { COMMUNES_KINSHASA } from "@/lib/zones";
import { TAUX_CDF, toCDFString, usd } from "@/lib/paiement";

export const dynamic = "force-dynamic";

const METIERS = [
  { id: "plomberie", label: "🔧 Plombier", prixUSD: "8" },
  { id: "electricite", label: "⚡ Électricien", prixUSD: "8" },
  { id: "coiffure", label: "💇 Coiffeur / Coiffeuse", prixUSD: "5" },
  { id: "menage", label: "🧹 Ménage / Repassage", prixUSD: "5" },
  { id: "maconnerie", label: "🧱 Maçon", prixUSD: "10" },
  { id: "peinture", label: "🎨 Peintre", prixUSD: "8" },
  { id: "menuiserie", label: "🪚 Menuisier", prixUSD: "10" },
  { id: "mecanique", label: "🔩 Mécanicien", prixUSD: "8" },
  { id: "livraison", label: "🛵 Livreur", prixUSD: "3" },
  { id: "autre", label: "✨ Autre service", prixUSD: "" },
];

function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function tracerServiceJournal(
  action: "SERVICE_CREE" | "SERVICE_MODIFIE",
  serviceId: string,
  wa: string
) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("wenze_journal");
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      cibleId: serviceId,
      acteurWhatsapp: wa,
      role: "prestataire",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

function PublierServiceContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp.get("edit");

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [bloque, setBloque] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    metier: "",
    titre: "",
    description: "",
    prixPrestation: "",
    zone: "",
    commune: "",
    ville: "Kinshasa",
    dispo: "Disponible aujourd'hui",
  });

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const notifier = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    const u: any = getUser();
    if (!u) {
      router.push("/connexion?next=/publier-service");
      return;
    }

    const role = String(u.role || (u.estVendeur ? "vendeur" : "client")).toLowerCase();
    const roleAdmin = String(u.roleAdmin || "").toLowerCase();

    if (
      roleAdmin === "dg" ||
      roleAdmin === "ambassadeur" ||
      roleAdmin === "superviseur" ||
      role === "dg" ||
      role === "ambassadeur" ||
      role === "superviseur"
    ) {
      setBloque("interdit");
      setUser({ ...u, role });
      setLoading(false);
      return;
    }

    if (role === "client") {
      setBloque("client");
      setUser({ ...u, role });
      setLoading(false);
      return;
    }

    if (role === "vendeur" || role === "grossiste" || role === "boutique") {
      setBloque("vendeur");
      setUser({ ...u, role });
      setLoading(false);
      return;
    }

    setUser({ ...u, role: "prestataire" });

    if (editId) {
      const old = readList("wenze_services_list").find(
        (x: any) => String(x.id) === String(editId)
      );
      if (old) {
        let prixCorrige = Number(old.prixUSD ?? old.prixPrestation ?? 0);
        if (prixCorrige >= 2300000) {
          prixCorrige = Number((prixCorrige / Number(TAUX_CDF || 2300)).toFixed(2));
        }
        setForm({
          metier: old.metier || old.activiteId || "",
          titre: old.titre || "",
          description: old.description || "",
          prixPrestation: prixCorrige > 0 ? String(prixCorrige) : "",
          zone: old.zone || "",
          commune: old.commune || u.commune || "",
          ville: old.ville || "Kinshasa",
          dispo: old.dispo || "Disponible aujourd'hui",
        });
      }
    } else {
      setForm((f: any) => ({
        ...f,
        commune: u.commune || f.commune,
        zone: u.commune || f.zone,
      }));
    }

    setLoading(false);
  }, [router, editId]);

  const setField = (k: string, v: string) =>
    setForm((f: any) => ({ ...f, [k]: v }));

  const choisirMetier = (m: any) => {
    setForm((f: any) => ({
      ...f,
      metier: m.id,
      titre: f.titre || m.label.replace(/^[^\s]+\s/, ""),
      prixPrestation: f.prixPrestation || m.prixUSD || "",
    }));
  };

  const publier = () => {
    if (saving || !user) return;
    if (!form.metier) {
      return notifier("Choisis ton métier");
    }
    if (form.titre.trim().length < 3) {
      return notifier("Titre : 3 caractères minimum");
    }
    if (!form.zone && !form.commune) {
      return notifier("Zone d'intervention requise");
    }

    const wa = cleanWa(user.ownerWhatsapp || user.whatsapp);
    let list = readList("wenze_services_list");
    if (editId) {
      list = list.filter((x: any) => String(x.id) !== String(editId));
    }

    const id =
      editId ||
      "SRV-" +
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2, 6).toUpperCase();
    const metierObj = METIERS.find((m) => m.id === form.metier);

    const prixUsdNum = Number(form.prixPrestation || 0);
    const aUnPrix = prixUsdNum > 0;
    const cdfStr = aUnPrix ? toCDFString(prixUsdNum) : "Prix à discuter";
    const usdStr = aUnPrix ? usd(prixUsdNum) : "Prix à discuter";

    const service = {
      id,
      type: "service",
      metier: form.metier,
      activiteId: form.metier,
      activite: metierObj?.label || form.metier,
      titre: form.titre.trim(),
      description: form.description.trim(),
      prixUSD: aUnPrix ? prixUsdNum : null,
      prixPrestation: aUnPrix ? prixUsdNum : null,
      prix: aUnPrix ? prixUsdNum : null,
      prixCDFString: cdfStr,
      prixAffiche: aUnPrix ? `${usdStr} / ${cdfStr}` : "Prix à discuter",
      prixADiscuter: !aUnPrix,
      tauxCDF: TAUX_CDF,
      commissionPct: 0,
      zone: form.zone || form.commune,
      commune: form.commune || form.zone || "Kinshasa",
      ville: form.ville || "Kinshasa",
      dispo: form.dispo,
      ownerWhatsapp: wa,
      whatsapp: wa,
      ownerName: user.nomEtablissement || user.nom || "WENZE",
      userId: user.id || wa,
      roleVendeur: "prestataire",
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      statut: "actif",
      is_visible: true,
    };

    list.unshift(service);
    localStorage.setItem(
      "wenze_services_list",
      JSON.stringify(list.slice(0, 200))
    );
    tracerServiceJournal(
      editId ? "SERVICE_MODIFIE" : "SERVICE_CREE",
      id,
      wa
    );

    setSaving(true);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = setTimeout(() => router.push("/profil"), 1200);
  };

  if (loading) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-24 bg-white border rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (bloque === "interdit") {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 flex flex-col justify-center text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="font-black text-[18px] mt-4">Accès non autorisé</h1>
        <p className="text-[12px] text-gray-600 mt-2">
          Cet espace est réservé aux comptes prestataires.
        </p>
        <Link
          href="/"
          className="bg-black text-white py-3.5 rounded-full font-black text-[13px] mt-6 block"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  if (bloque === "client") {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 flex flex-col justify-center text-center">
        <p className="text-5xl">🔧</p>
        <h1 className="font-black text-[18px] mt-4">Tu es encore Client</h1>
        <p className="text-[12px] text-gray-600 mt-2">
          Pour proposer un service, deviens d&apos;abord Prestataire (0 %
          commission).
        </p>
        <Link
          href="/devenir-prestataire"
          className="bg-black text-white py-3.5 rounded-full font-black text-[13px] mt-6 block"
        >
          Devenir Prestataire →
        </Link>
        <Link
          href="/"
          className="border py-3.5 rounded-full font-bold text-[12px] mt-2 block"
        >
          Retour
        </Link>
      </div>
    );
  }

  if (bloque === "vendeur") {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 flex flex-col justify-center text-center">
        <p className="text-5xl">🛍️</p>
        <h1 className="font-black text-[18px] mt-4">Tu es Vendeur</h1>
        <p className="text-[12px] text-gray-600 mt-2">
          Tu vends des produits. Pour proposer un service, utilise un compte
          Prestataire.
        </p>
        <Link
          href="/publier"
          className="bg-black text-white py-3.5 rounded-full font-black text-[13px] mt-6 block"
        >
          Publier un produit →
        </Link>
      </div>
    );
  }

  const prixNum = Number(form.prixPrestation || 0);
  const prixAffiche = prixNum > 0;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link
          href="/profil"
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
        >
          ←
        </Link>
        <div className="flex-1">
          <h1 className="font-black text-[13px]">
            {editId ? "Modifier mon service" : "Publier un service"}
          </h1>
          <p className="text-[9px] text-gray-500">
            Kinshasa • 0 % commission • Taux {TAUX_CDF} CDF/$
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full font-black text-white bg-purple-600">
          🔧 PRESTATAIRE
        </span>
      </header>

      <div className="p-4 space-y-4">
        {toast ? (
          <div className="bg-red-50 text-red-700 border-2 border-red-300 p-3.5 rounded-xl text-[11px] font-bold">
            {toast}
          </div>
        ) : null}

        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <p className="font-black text-[12px]">🔧 Comment ça marche ?</p>
          <p className="text-[11px] text-gray-600 mt-1">
            1. Tu publies ton service → 2. Un Client dans ta zone demande un
            devis → 3. Tu réponds sur WhatsApp → 4. Tu es payé après le
            service (0 % commission).
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <p className="font-black text-[13px]">Ton métier *</p>
          <div className="flex flex-wrap gap-1.5">
            {METIERS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => choisirMetier(m)}
                className={
                  "text-[11px] px-3 py-2 rounded-full font-bold border " +
                  (form.metier === m.id
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-[#FFFBF0]")
                }
              >
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-bold">Titre de ton service *</label>
            <input
              value={form.titre}
              onChange={(e) => setField("titre", e.target.value)}
              placeholder="Ex : Plomberie rapide à domicile"
              className="w-full border rounded-xl p-3.5 text-[13px] mt-1 outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Ex : Je répare fuites, robinets, installations... 5 ans d'expérience à Lemba."
              rows={3}
              className="w-full border rounded-xl p-3.5 text-[13px] mt-1 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold">
                À partir de (USD) - facultatif
              </label>
              <input
                value={form.prixPrestation}
                onChange={(e) =>
                  setField("prixPrestation", sanitizeDecimal(e.target.value))
                }
                placeholder="Vide = à discuter"
                inputMode="decimal"
                className="w-full border rounded-xl p-3.5 text-[13px] mt-1 font-black"
              />
              {prixAffiche ? (
                <p className="text-[10px] text-gray-500 mt-1">
                  {usd(prixNum)} / {toCDFString(prixNum)}
                </p>
              ) : (
                <p className="text-[10px] text-purple-600 font-bold mt-1">
                  💬 Sera affiché : Prix à discuter
                </p>
              )}
              <button
                type="button"
                onClick={() => setField("prixPrestation", "")}
                className="text-[10px] text-gray-500 underline mt-1"
              >
                Effacer le prix
              </button>
            </div>
            <div>
              <label className="text-[10px] font-bold">Disponibilité</label>
              <select
                value={form.dispo}
                onChange={(e) => setField("dispo", e.target.value)}
                className="w-full border rounded-xl p-3.5 text-[13px] mt-1 bg-white"
              >
                <option>Disponible aujourd&apos;hui</option>
                <option>Disponible cette semaine</option>
                <option>Sur rendez-vous</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold">Commune *</label>
              <select
                value={form.commune}
                onChange={(e) => {
                  setField("commune", e.target.value);
                  setField("zone", e.target.value);
                }}
                className="w-full border rounded-xl p-3.5 text-[13px] mt-1 bg-white"
              >
                <option value="">Choisir...</option>
                {COMMUNES_KINSHASA.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold">
                Zone d&apos;intervention
              </label>
              <input
                value={form.zone}
                onChange={(e) => setField("zone", e.target.value)}
                placeholder="Ex : Lemba, Matete"
                className="w-full border rounded-xl p-3.5 text-[13px] mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t p-3">
        <div className="max-w-[430px] mx-auto">
          <button
            onClick={publier}
            disabled={saving}
            className="w-full bg-black text-white py-3.5 rounded-full font-black text-[13px] disabled:opacity-50"
          >
            {saving
              ? "Enregistrement..."
              : editId
              ? "Enregistrer"
              : "Publier mon service"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PublierServicePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
          <div className="h-24 bg-white border rounded-2xl animate-pulse" />
        </div>
      }
    >
      <PublierServiceContent />
    </Suspense>
  );
}
  
