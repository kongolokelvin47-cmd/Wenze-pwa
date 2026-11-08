"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cleanWa, getUser, readList } from "@/app/publier/helpers";

export const dynamic = "force-dynamic";

// ✅ PRIX EN FC - jamais en $ ici
const fmtFC = (n: number) => Number(n || 0).toLocaleString("fr-FR") + " FC";

const METIERS = [
  { id: "plomberie", label: "🔧 Plombier", prix: "15000" },
  { id: "electricite", label: "⚡ Électricien", prix: "15000" },
  { id: "coiffure", label: "💇 Coiffeur / Coiffeuse", prix: "10000" },
  { id: "menage", label: "🧹 Ménage / Repassage", prix: "10000" },
  { id: "maconnerie", label: "🧱 Maçon", prix: "20000" },
  { id: "peinture", label: "🎨 Peintre", prix: "15000" },
  { id: "menuiserie", label: "🪚 Menuisier", prix: "20000" },
  { id: "mecanique", label: "🔩 Mécanicien", prix: "15000" },
  { id: "livraison", label: "🛵 Livreur", prix: "5000" },
  { id: "autre", label: "✨ Autre service", prix: "" },
];

// ✅ Toutes les communes de Kinshasa, pas juste 10
const COMMUNES = ["Gombe", "Lemba", "Matete", "Limete", "Ngaliema", "Kasa-Vubu", "Bandalungwa", "Kintambo", "Lingwala", "Kinshasa", "Ngiri-Ngiri", "Bumbu", "Selembao", "Makala", "Ngaba", "Kalamu", "Barumbu", "Masina", "Ndjili", "Kimbanseke", "Maluku", "Mont-Ngafula", "Kisenso", "Nsele"];

function PublierServiceContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp.get("edit");

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
    const u = getUser();
    if (!u) { router.push("/connexion?next=/publier-service"); return; }
    const role = u.role || (u.estVendeur ? "vendeur" : "client");

    if (role === "client") { setBloque("client"); setUser({ ...u, role }); setLoading(false); return; }
    if (role === "vendeur" || role === "grossiste" || role === "boutique") {
      setBloque("vendeur"); setUser({ ...u, role }); setLoading(false); return;
    }

    setUser({ ...u, role: "prestataire" });

    if (editId) {
      const old = readList("wenze_services_list").find((x: any) => String(x.id) === String(editId));
      if (old) {
        // ✅ CORRIGÉ DÉFINITIVEMENT : si l'ancien prix a été corrompu par toCDFString (x2300), on le répare
        // Ex : ancien prix stocké 34.500.000 = 15000 x 2300 -> on le redivise
        let prixCorrige = old.prixPrestation ? Number(old.prixPrestation) : 0;
        if (prixCorrige >= 2300000) prixCorrige = Math.round(prixCorrige / 2300);
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
      setForm((f: any) => ({ ...f, commune: u.commune || f.commune, zone: u.commune || f.zone }));
    }
    setLoading(false);
  }, [router, editId]);

  const setField = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const choisirMetier = (m: any) => {
    setForm((f: any) => ({
      ...f,
      metier: m.id,
      titre: f.titre || m.label.replace(/^[^\s]+\s/, ""),
      prixPrestation: f.prixPrestation || m.prix || "",
    }));
  };

  const publier = () => {
    if (!form.metier) { setToast("Choisis ton métier"); setTimeout(() => setToast(""), 3000); return; }
    if (form.titre.trim().length < 3) { setToast("Titre : 3 caractères minimum"); setTimeout(() => setToast(""), 3000); return; }
    if (!form.zone && !form.commune) { setToast("Zone d'intervention requise"); setTimeout(() => setToast(""), 3000); return; }

    const wa = cleanWa(user.ownerWhatsapp || user.whatsapp);
    let list = readList("wenze_services_list");
    if (editId) list = list.filter((x: any) => String(x.id) !== String(editId));

    const id = editId || "SRV-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const metierObj = METIERS.find((m) => m.id === form.metier);

    const prixNum = Number(form.prixPrestation || 0);
    const aUnPrix = prixNum > 0;

    const service = {
      id,
      type: "service",
      metier: form.metier,
      activiteId: form.metier,
      activite: metierObj?.label || form.metier,
      titre: form.titre.trim(),
      description: form.description.trim(),
      // ✅ Prix en FC, jamais multiplié par 2300
      prixPrestation: aUnPrix ? prixNum : null,
      prix: aUnPrix ? prixNum : null,
      prixFC: aUnPrix ? prixNum : null,
      prixCDFString: aUnPrix ? fmtFC(prixNum) : "Prix à discuter",
      prixAffiche: aUnPrix ? fmtFC(prixNum) : "Prix à discuter",
      prixADiscuter: !aUnPrix,
      devise: "CDF",
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
    };
    list.unshift(service);
    localStorage.setItem("wenze_services_list", JSON.stringify(list.slice(0, 200)));
    setSaving(true);
    setTimeout(() => router.push("/profil"), 1200);
  };

  if (loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"></div></div>;

  if (bloque === "client") {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 flex flex-col justify-center text-center">
        <p className="text-5xl">🔧</p>
        <h1 className="font-black text-[18px] mt-4">Tu es encore Client</h1>
        <p className="text-[12px] text-gray-600 mt-2">Pour proposer un service, deviens d'abord Prestataire.</p>
        <Link href="/devenir-prestataire" className="bg-black text-white py-3.5 rounded-full font-black text-[13px] mt-6 block">Devenir Prestataire →</Link>
        <Link href="/" className="border py-3.5 rounded-full font-bold text-[12px] mt-2 block">Retour</Link>
      </div>
    );
  }
  if (bloque === "vendeur") {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 flex flex-col justify-center text-center">
        <p className="text-5xl">🛍️</p>
        <h1 className="font-black text-[18px] mt-4">Tu es Vendeur</h1>
        <p className="text-[12px] text-gray-600 mt-2">Tu vends des produits. Pour proposer un service, crée un compte Prestataire.</p>
        <Link href="/publier" className="bg-black text-white py-3.5 rounded-full font-black text-[13px] mt-6 block">Publier un produit →</Link>
      </div>
    );
  }

  const prixAffiche = Number(form.prixPrestation || 0) > 0;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href="/profil" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[13px]">{editId ? "Modifier mon service" : "Publier un service"}</h1><p className="text-[9px] text-gray-500">Les Clients de ta zone te trouveront</p></div>
        <span className="text-[10px] px-2.5 py-1 rounded-full font-black text-white bg-purple-600">🔧 PRESTATAIRE</span>
      </header>

      <div className="p-4 space-y-4">
        {toast ? <div className="bg-red-50 text-red-700 border-2 border-red-300 p-3.5 rounded-xl text-[11px] font-bold">{toast}</div> : null}

        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <p className="font-black text-[12px]">🔧 Comment ça marche ?</p>
          <p className="text-[11px] text-gray-600 mt-1">1. Tu publies ton service → 2. Un Client dans ta zone demande un devis → 3. Tu réponds sur WhatsApp → 4. Tu es payé après le service.</p>
        </div>

        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <p className="font-black text-[13px]">Ton métier *</p>
          <div className="flex flex-wrap gap-1.5">
            {METIERS.map((m) => (
              <button key={m.id} type="button" onClick={() => choisirMetier(m)} className={"text-[11px] px-3 py-2 rounded-full font-bold border " + (form.metier === m.id ? "bg-purple-600 text-white border-purple-600" : "bg-[#FFFBF0]")}>
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-bold">Titre de ton service *</label>
            <input value={form.titre} onChange={(e) => setField("titre", e.target.value)} placeholder="Ex : Plomberie rapide à domicile" className="w-full border rounded-xl p-3.5 text-[13px] mt-1 outline-none focus:ring-2 focus:ring-black" />
          </div>

          <div>
            <label className="text-[10px] font-bold">Description</label>
            <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Ex : Je répare fuites, robinets, installations... 5 ans d'expérience à Lemba." rows={3} className="w-full border rounded-xl p-3.5 text-[13px] mt-1 outline-none resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold">À partir de (FC) - facultatif</label>
              <input value={form.prixPrestation} onChange={(e) => setField("prixPrestation", e.target.value.replace(/[^0-9]/g, ""))} placeholder="Laisse vide = à discuter" inputMode="numeric" className="w-full border rounded-xl p-3.5 text-[13px] mt-1 font-black" />
              {prixAffiche ? (
                <p className="text-[10px] text-gray-500 mt-1">{fmtFC(Number(form.prixPrestation))}</p>
              ) : (
                <p className="text-[10px] text-purple-600 font-bold mt-1">💬 Sera affiché : Prix à discuter</p>
              )}
              <button type="button" onClick={() => setField("prixPrestation", "")} className="text-[10px] text-gray-500 underline mt-1">Effacer le prix</button>
            </div>
            <div>
              <label className="text-[10px] font-bold">Disponibilité</label>
              <select value={form.dispo} onChange={(e) => setField("dispo", e.target.value)} className="w-full border rounded-xl p-3.5 text-[13px] mt-1 bg-white">
                <option>Disponible aujourd'hui</option>
                <option>Disponible cette semaine</option>
                <option>Sur rendez-vous</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold">Commune *</label>
              <select value={form.commune} onChange={(e) => { setField("commune", e.target.value); setField("zone", e.target.value); }} className="w-full border rounded-xl p-3.5 text-[13px] mt-1 bg-white">
                <option value="">Choisir...</option>
                {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold">Zone d'intervention</label>
              <input value={form.zone} onChange={(e) => setField("zone", e.target.value)} placeholder="Ex : Lemba, Matete" className="w-full border rounded-xl p-3.5 text-[13px] mt-1" />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t p-3">
        <div className="max-w-[430px] mx-auto">
          <button onClick={publier} disabled={saving} className="w-full bg-black text-white py-3.5 rounded-full font-black text-[13px] disabled:opacity-50">
            {saving ? "Enregistrement..." : editId ? "Enregistrer" : "Publier mon service"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PublierServicePage() {
  return <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"></div></div>}><PublierServiceContent /></Suspense>;
}
