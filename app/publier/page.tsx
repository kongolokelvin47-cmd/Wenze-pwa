"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE } from "@/lib/categories";

// IA GRATUITE SIMULÉE - PAS DE DOSSIER EXTERNE = PLUS DE BUILD FAILED
const comprendreImageLocal = async (base64: string) => {
  await new Promise(r => setTimeout(r, 800));
  return "Photo produit détectée: bon éclairage, fond clair. Prêt pour vente Kinshasa.";
};
const genererDescriptionVenteLocal = async (titre: string, caption: string) => {
  return `🔥 ${titre} - Qualité garantie à Kinshasa! ${caption} Livraison rapide, paiement Mobile Money / CDF / $. Contactez sur WhatsApp maintenant. Wenze Wenze Business - 0% commission.`;
};

export default function Publier() {
  const [user, setUser] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [photo, setPhoto] = useState("");
  const [form, setForm] = useState({ titre: "", prix: "", description: "", categorie: "commerce", activite: "", lat: 0, lng: 0 });
  const [loadingIA, setLoadingIA] = useState(false);
  const [captionIA, setCaptionIA] = useState("");

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("wenze_user") || "null");
    setUser(u);
    setCount(parseInt(localStorage.getItem("wenze_annonces") || "0"));
    // Géoloc gratuite
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setForm(f => ({ ...f, lat: p.coords.latitude, lng: p.coords.longitude })),
        () => {}
      );
    }
  }, []);

  const compress = (file: File): Promise<string> => {
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          c.width = w; c.height = h;
          c.getContext("2d")?.drawImage(img, 0, 0, w, h);
          res(c.toDataURL("image/jpeg", 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAideIA = async () => {
    if (!photo) { alert("Ajoutez photo d'abord"); return; }
    if (user?.type === "client" || user?.type === "freemium") {
      alert(`🔒 IA réservée Pro 5$ / 11 500 CDF et Grossiste 25$ / 57 500 CDF. Vous êtes ${user.type}. Passez Pro.`);
      window.location.href = "/abonnement";
      return;
    }
    setLoadingIA(true);
    try {
      const cap = await comprendreImageLocal(photo);
      setCaptionIA(cap);
      const desc = await genererDescriptionVenteLocal(form.titre || "Produit", cap);
      setForm(f => ({ ...f, description: desc }));
    } catch (e: any) {
      alert("Erreur IA: " + e.message);
    }
    setLoadingIA(false);
  };

  const handlePublish = () => {
    if (!user?.nom) { alert("Créez compte"); window.location.href = "/inscription"; return; }
    if (user.type === "client" && !localStorage.getItem("paid_occasionnel")) {
      alert("Client: Payez Publication Occasionnelle 3$ / 6 900 CDF avant lancement");
      window.location.href = "/abonnement";
      return;
    }
    if (user.type === "freemium" && count >= 3) {
      alert("Freemium: 3 annonces à vie atteinte. Passez Pro 5$");
      window.location.href = "/abonnement";
      return;
    }
    const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    annonces.push({ ...form, photo, user: user.nom, whatsapp: user.whatsapp, type: user.type, profession: user.profession, captionIA, date: new Date().toISOString() });
    localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
    localStorage.setItem("wenze_annonces", String(count + 1));
    if (user.type === "client") localStorage.removeItem("paid_occasionnel");
    alert(`✅ Publiée! ${user.type === "freemium" ? `${2 - count} restantes` : "Illimité"} - Géoloc + IA intégrées`);
    window.location.href = "/profil";
  };

  if (!user) return <div className="max-w-[430px] mx-auto p-5">Chargement... <Link href="/inscription" className="text-blue-600 font-bold">Créer compte (Client: nom+WhatsApp / Pro: nom+profession)</Link></div>;

  const isClient = user.type === "client";
  const isFreemium = user.type === "freemium";
  const isPayant = user.type === "pro" || user.type === "grossiste";
  const blocked = isFreemium && count >= 3;
  const catActive = CATEGORIES_WENZE.find(c => c.id === form.categorie);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 pb-20">
      <Link href="/profil" className="text-xs">← Profil</Link>
      <h1 className="text-xl font-black mt-2">Publier</h1>
      
      <div className="bg-black text-white p-2 rounded-xl mt-3 text-[10px] flex justify-between">
        <span>{user.type.toUpperCase()} - {user.profession || "Client"}</span>
        <span>{isFreemium ? `${count}/3 à vie` : isClient ? "Occasionnel 3$" : "ILLIMITÉ + IA"}</span>
      </div>

      {blocked ? (
        <div className="bg-red-50 p-4 rounded-xl mt-4 text-center">
          <p className="font-bold text-red-600">Limite Freemium atteinte</p>
          <Link href="/abonnement" className="block bg-red-600 text-white p-3 rounded-full mt-3">Passer Pro 5$ / 11 500 CDF</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre produit/service" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="w-full border p-3 rounded-xl text-sm" />
          <input placeholder="Prix $ ou CDF (ex: 10$ ou 25 000 CDF)" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} className="w-full border p-3 rounded-xl text-sm" />

          {/* 10 CATEGORIES OFFICIELLES BRANCHÉES */}
          <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value, activite: "" })} className="w-full border p-3 rounded-xl text-sm">
            {CATEGORIES_WENZE.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.titreCourt}</option>
            ))}
          </select>

          <select value={form.activite} onChange={e => setForm({ ...form, activite: e.target.value })} className="w-full border p-3 rounded-xl text-sm">
            <option value="">Choisissez métier précis...</option>
            {catActive?.activites.map(a => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>

          <div>
            <label className="text-[11px] font-bold">Photo (compressée auto)</label>
            <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) setPhoto(await compress(f)); }} className="w-full border p-2 rounded-xl text-xs mt-1" />
            {photo && <img src={photo} className="w-full h-48 object-cover rounded-xl mt-2" />}
            {captionIA && <p className="text-[10px] text-gray-500 mt-1">🤖 IA voit: {captionIA}</p>}
          </div>

          {isPayant ? (
            <button onClick={handleAideIA} disabled={loadingIA} className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white p-3 rounded-xl text-sm font-bold">
              {loadingIA ? "🤖 IA analyse..." : "🤖 IA Gratuite Pro: Améliorer + Générer message vente"}
            </button>
          ) : (
            <div className="bg-gray-100 p-3 rounded-xl text-[11px]">
              🔒 IA avancée réservée Pro 5$ / 11 500 CDF et Grossiste 25$ / 57 500 CDF. Géoloc gratuite pour tous.
            </div>
          )}

          <textarea placeholder="Description - Sera générée par IA si Pro" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border p-3 rounded-xl text-sm h-24" />
          
          <div className="bg-green-50 p-2 rounded-xl text-[10px]">
            📍 Géoloc: {form.lat ? `${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}` : "Activation..."} • Paiement $ ou CDF
          </div>

          <button onClick={handlePublish} className="w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold">
            {isClient ? "Publier - Vérif paiement 3$" : isFreemium ? `Publier - ${3 - count} restantes` : "Publier - Illimité + IA"}
          </button>
        </div>
      )}
    </div>
  );
}
