"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById } from "@/lib/categories";
import { lireSession, ouvrirBoutique, COMMUNES } from "@/lib/comptes";
import { freemiumImagesDe, originOf, PALIERS } from "@/lib/paiement";

export const dynamic = "force-dynamic";
const CHAMP = "w-full mt-1 border rounded-xl px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-black bg-white";

const INTENTIONS = [
  { id: "detail", label: "Vendre au détail", icon: "🛍️", categorieId: "commerces-services" },
  { id: "gros", label: "Vendre en gros", icon: "📦", categorieId: "gros-autres" },
  { id: "service", label: "Offrir un service", icon: "💇‍♀️", categorieId: "commerces-services" },
  { id: "occasionnel", label: "Vendre 1 truc occasionnellement", icon: "📱", categorieId: "commerces-services" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [etape, setEtape] = useState(1);
  const [compte, setCompte] = useState<any>(null);
  const [methode, setMethode] = useState<"google"|"email"|"whatsapp"|"">("");
  const [intention, setIntention] = useState("");
  const [codeAmb, setCodeAmb] = useState("");
  const [nom, setNom] = useState("");
  const [champ2, setChamp2] = useState("Gombe"); // Marché / Prix carton / Zone / Produit
  const [champ3, setChamp3] = useState(""); // Photo ou Tarif
  const [categorieId, setCategorieId] = useState("commerces-services");
  const [activiteId, setActiviteId] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    // Pré-rempli si vient via ambassadeur : /onboarding?code=WENZE-AMB-XXXX
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) setCodeAmb(code.toUpperCase());
    const s = lireSession();
    if (s) { setCompte(s); setNom(s.nomBoutique || s.nomEtablissement || ""); setEtape(2); }
  }, []);

  // ÉCRAN 1 : Choix Auth
  const choisirAuth = (m: any) => {
    setMethode(m);
    if (m === "google") { /* Ici tu appelles ton Google 1 Tap */ router.push("/inscription?methode=google"); return; }
    if (m === "email") { router.push("/inscription?methode=email"); return; }
    // WhatsApp seulement : pas de Gmail, 1 image, pas de récupération
    router.push("/inscription?methode=whatsapp");
  };

  const valider = () => {
    // Règle Sans Gmail : WhatsApp seulement = 1 image max, occasionnel seulement
    const isWhatsappOnly = methode === "whatsapp" || compte?.methode === "whatsapp";
    const r = ouvrirBoutique({
      nomBoutique: nom, categorieId, activiteId,
      commune: champ2, // Marché / Zone
      champ2, champ3, // Prix carton / Tarif / Produit
      codeAmbassadeur: codeAmb.trim().toUpperCase() || undefined,
      intention, methode: methode || compte?.methode || "email",
      freemiumMax: isWhatsappOnly ? 1 : 3, // <-- LA RÈGLE
    });
    if (!r.ok) { setErreur(r.erreur || "Impossible"); return; }
    router.push("/publier?cat=" + categorieId);
  };

  const cat: any = useMemo(() => getCategorieById(categorieId) || {}, [categorieId]);
  const activites = cat.activites || [];

  // Labels dynamiques Écran 3 selon intention
  const labels: any = {
    detail: { c2: "Marché / Commune", c2ph: "Ex : Marché Central, Gombe", c3: "Photo boutique" },
    gros: { c2: "Prix carton", c2ph: "Ex : 25$ / carton", c3: "Photo dépôt" },
    service: { c2: "Zone", c2ph: "Ex : Gombe, Kintambo", c3: "Tarif" },
    occasionnel: { c2: "Qu'est-ce que tu vends ?", c2ph: "Ex : iPhone 11", c3: "Photo" },
  };
  const L = labels[intention as keyof typeof labels] || labels.detail;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-16">
      <header className="sticky top-0 bg-white/95 p-4 border-b flex items-center gap-3"><Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link><h1 className="font-black">Wenze Business - 20 secondes</h1></header>
      <div className="p-4 space-y-4">
        {etape === 1 && (
          <>
            <div className="bg-white border rounded-2xl p-4 space-y-2">
              <p className="font-black text-[14px]">Créer mon compte - 0$</p>
              <button onClick={() => choisirAuth("google")} className="w-full bg-black text-white py-3.5 rounded-full font-black text-[13px]">Continuer avec Google - 1 Tap</button>
              <button onClick={() => choisirAuth("email")} className="w-full bg-white border-2 border-black py-3.5 rounded-full font-black text-[13px]">Continuer avec Email</button>
              <button onClick={() => choisirAuth("whatsapp")} className="w-full bg-green-50 border-2 border-green-600 text-green-800 py-3.5 rounded-full font-black text-[13px]">Continuer avec WhatsApp seulement</button>
              <p className="text-[10px] text-gray-500 text-center">WhatsApp seulement = 1 image gratuite. Créez Gmail pour débloquer 2 images + Standard / Pro / Premium.</p>
            </div>
            <p className="text-center text-[11px] text-gray-500">Déjà un compte ? <Link href="/connexion" className="underline font-bold">Se connecter</Link></p>
          </>
        )}
        {etape === 2 && (
          <>
            <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[14px]">Que voulez-vous vendre sur Wenze Business ?</p>
              <div className="grid gap-2 mt-3">{INTENTIONS.map((it) => (<button key={it.id} onClick={() => { setIntention(it.id); setCategorieId(it.categorieId); setActiviteId(""); }} className={"text-left p-4 rounded-xl border-2 flex gap-3 " + (intention === it.id ? "bg-black text-white border-black" : "bg-white border-gray-200")}><span className="text-2xl">{it.icon}</span><span className="font-black text-[13px]">{it.label}</span>{intention === it.id ? <span>✓</span> : null}</button>))}</div>
            </div>
            <div className="bg-white border rounded-2xl p-4"><label className="text-[12px] font-black">Code Ambassadeur (facultatif)</label><input value={codeAmb} onChange={(e) => setCodeAmb(e.target.value.toUpperCase())} placeholder="WENZE-AMB-XXXX-XXXX" className={CHAMP} /><p className="text-[10px] text-gray-500 mt-1">ℹ️ Si un ambassadeur vous a aidé, entrez son code ici. Sinon laissez vide.</p></div>
            <button disabled={!intention} onClick={() => setEtape(3)} className="w-full bg-black text-white py-4 rounded-full font-black disabled:opacity-50">Continuer →</button>
          </>
        )}
        {etape === 3 && (
          <>
            <div className="bg-white border rounded-2xl p-4 space-y-3">
              <div><label className="text-[12px] font-black">{intention === "gros" ? "Nom dépôt *" : intention === "service" ? "Service *" : "Nom boutique *"}</label><input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Salon Glam" className={CHAMP} /></div>
              <div><label className="text-[12px] font-black">{L.c2}</label>{intention === "detail" || intention === "service" ? <select value={champ2} onChange={(e) => setChamp2(e.target.value)} className={CHAMP}>{COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}</select> : <input value={champ2} onChange={(e) => setChamp2(e.target.value)} placeholder={L.c2ph} className={CHAMP} />}</div>
              <div><label className="text-[12px] font-black">{L.c3}</label><input value={champ3} onChange={(e) => setChamp3(e.target.value)} placeholder={intention === "service" ? "Ex : 10$ coiffure" : "Photo / Tarif"} className={CHAMP} /></div>
              {activites.length > 0 && <div><p className="font-black text-[13px]">Votre activité *</p><div className="grid gap-2 mt-2 max-h-[180px] overflow-y-auto">{activites.map((a: any) => (<button key={a.id} onClick={() => setActiviteId(a.id)} className={"p-3 rounded-xl border text-left " + (activiteId === a.id ? "bg-black text-white" : "bg-white")}>{a.label || a.titre}</button>))}</div></div>}
            </div>
            {erreur && <div className="bg-red-50 border text-red-700 p-3 rounded-xl text-[12px] font-bold">{erreur}</div>}
            <div className="flex gap-2"><button onClick={() => setEtape(2)} className="flex-1 bg-white border-2 border-black py-4 rounded-full font-black">← Retour</button><button onClick={valider} className="flex-[2] bg-black text-white py-4 rounded-full font-black">Ouvrir ma boutique</button></div>
          </>
        )}
      </div>
    </div>
  );
        }
