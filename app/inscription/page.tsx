"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const PROFESSIONS = [
  // Pro petits services - 5$ / 11 500 CDF
  "Vendeur boutique", "Mécanicien", "Salon de coiffure", "Électricien", 
  "Plombier", "Menuisier", "Tailleur", "Photographe", "Restaurateur", "Autres petits services",
  // Grossiste grande échelle - 25$ / 57 500 CDF
  "Grossiste / Dépôt B2B", "Agriculteur", "Entreprise", "Grande échelle / Usine"
];

export default function Inscription() {
  const params = useSearchParams();
  const router = useRouter();
  const initialType = params.get("type") === "pro" ? "pro" : "client";
  const [type, setType] = useState<"client"|"pro">(initialType as any);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    whatsapp: "",
    profession: "",
    adresse: "",
    password: "",
    photo: ""
  });
  const [preview, setPreview] = useState("");

  const compressPhoto = (file: File): Promise<string> => {
    return new Promise((res) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 400;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          res(canvas.toDataURL("image/jpeg", 0.6)); // compressé 60%
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhoto = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Photo trop lourde, max 5MB"); return; }
    const b64 = await compressPhoto(file);
    setForm({ ...form, photo: b64 });
    setPreview(b64);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Validation mot de passe 4 à 8 caractères
    if (form.password.length < 4 || form.password.length > 8) {
      alert("Mot de passe doit être entre 4 et 8 caractères");
      return;
    }
    if (!form.nom || !form.whatsapp) {
      alert("Nom complet et WhatsApp obligatoires");
      return;
    }
    if (type === "pro" && !form.profession) {
      alert("Choisissez votre profession");
      return;
    }
    if (!form.photo) {
      alert("Photo de profil obligatoire (sera compressée automatiquement)");
      return;
    }

    setLoading(true);

    // Détermine tarif selon profession
    const isGrossiste = ["Grossiste / Dépôt B2B", "Agriculteur", "Entreprise", "Grande échelle / Usine"].includes(form.profession);
    const userData = {
      nom: form.nom,
      whatsapp: form.whatsapp,
      profession: type === "pro" ? form.profession : "Client / Acheteur",
      adresse: form.adresse || "",
      photo: form.photo,
      type: type === "client" ? "client" : isGrossiste ? "grossiste" : "pro",
      categorie: form.profession || "Client",
      abonnement: type === "client" 
        ? "Client Gratuit - 0 $ / 0 CDF - Peut vendre occasionnellement 3$ / 6 900 CDF avant lancement"
        : isGrossiste 
        ? "Grossiste 25 $ / 57 500 CDF / mois - Grande échelle - Dès paiement activation immédiate - Non-paiement retour Freemium"
        : "Pro 5 $ / 11 500 CDF / mois - Petits services - Dès paiement activation immédiate - Non-paiement retour Freemium",
      annoncesLimite: type === "client" ? 0 : type === "pro" && !isGrossiste ? 9999 : isGrossiste ? 9999 : 3,
      date: new Date().toISOString(),
      freemiumCount: 0
    };

    localStorage.setItem("wenze_user", JSON.stringify(userData));
    localStorage.setItem("wenze_annonces", "0");

    setTimeout(() => {
      setLoading(false);
      router.push("/profil");
    }, 600);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5">
      <Link href="/profil" className="text-xs">← Retour Profil</Link>

      <div className="flex gap-2 mt-4">
        <button onClick={() => setType("client")} className={`flex-1 p-3 rounded-full text-xs font-bold border ${type === "client" ? "bg-black text-white border-black" : "bg-white"}`}>
          Compte Client
        </button>
        <button onClick={() => setType("pro")} className={`flex-1 p-3 rounded-full text-xs font-bold border ${type === "pro" ? "bg-[#6C3CE0] text-white border-[#6C3CE0]" : "bg-white"}`}>
          Compte Professionnel
        </button>
      </div>

      <h1 className="text-xl font-black mt-4">
        {type === "client" ? "Créer Compte Client" : "Créer Compte Professionnel"}
      </h1>
      <p className="text-[11px] text-green-600 font-bold">✓ INSCRIPTION GRATUITE - 0 $ / 0 CDF - Paiement $ ou CDF après</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        {/* NOM COMPLET - LES DEUX */}
        <div>
          <label className="text-[11px] font-bold">Nom complet *</label>
          <input required placeholder="Ex: Jean Kabasele" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="w-full border p-3 rounded-xl text-sm mt-1" />
        </div>

        {/* WHATSAPP - CLIENT SEULEMENT */}
        {type === "client" && (
          <div>
            <label className="text-[11px] font-bold">Numéro WhatsApp *</label>
            <input required placeholder="Ex: +243 81..." value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className="w-full border p-3 rounded-xl text-sm mt-1" />
          </div>
        )}

        {/* WHATSAPP - PRO AUSSI MAIS ON GARDE MÊME CHAMP */}
        {type === "pro" && (
          <div>
            <label className="text-[11px] font-bold">Numéro WhatsApp *</label>
            <input required placeholder="Numéro WhatsApp" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className="w-full border p-3 rounded-xl text-sm mt-1" />
          </div>
        )}

        {/* PROFESSION - PRO SEULEMENT */}
        {type === "pro" && (
          <div>
            <label className="text-[11px] font-bold">Profession *</label>
            <select required value={form.profession} onChange={e => setForm({ ...form, profession: e.target.value })} className="w-full border p-3 rounded-xl text-sm mt-1 bg-gray-50">
              <option value="">Choisissez votre profession</option>
              <optgroup label="Petits services - 5$ / 11 500 CDF / mois">
                {PROFESSIONS.slice(0, 10).map(p => <option key={p} value={p}>{p}</option>)}
              </optgroup>
              <optgroup label="Grande échelle - 25$ / 57 500 CDF / mois">
                {PROFESSIONS.slice(10).map(p => <option key={p} value={p}>{p}</option>)}
              </optgroup>
            </select>
            <p className="text-[10px] text-gray-500 mt-1">
              {form.profession && ["Grossiste / Dépôt B2B", "Agriculteur", "Entreprise", "Grande échelle / Usine"].includes(form.profession) 
                ? "→ Tarif Grossiste: 25 $ / 57 500 CDF / mois" 
                : form.profession ? "→ Tarif Pro: 5 $ / 11 500 CDF / mois" : ""}
            </p>
          </div>
        )}

        {/* ADRESSE PHYSIQUE FACULTATIF - PRO SEULEMENT */}
        {type === "pro" && (
          <div>
            <label className="text-[11px] font-bold">Adresse physique <span className="font-normal text-gray-400">(facultatif)</span></label>
            <input placeholder="Ex: Av. Lumumba 12, Kinshasa" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} className="w-full border p-3 rounded-xl text-sm mt-1" />
          </div>
        )}

        {/* PHOTO PROFIL COMPRESSÉ - LES DEUX */}
        <div>
          <label className="text-[11px] font-bold">Photo profil * (compressée auto)</label>
          <input type="file" accept="image/*" required={!form.photo} onChange={handlePhoto} className="w-full text-xs mt-1 border p-2 rounded-xl" />
          {preview && (
            <div className="mt-2 flex items-center gap-2">
              <img src={preview} className="w-16 h-16 rounded-full object-cover border" />
              <p className="text-[10px] text-green-600">✓ Photo compressée - Prête</p>
            </div>
          )}
        </div>

        {/* MOT DE PASSE 4 À 8 CARACTÈRES - LES DEUX */}
        <div>
          <label className="text-[11px] font-bold">Mot de passe * (4 à 8 caractères)</label>
          <input required type="password" minLength={4} maxLength={8} placeholder="4 à 8 caractères" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border p-3 rounded-xl text-sm mt-1" />
          <p className="text-[10px] text-gray-500 mt-1">{form.password.length}/8 caractères {form.password.length>=4 && form.password.length<=8 ? "✓ Valide" : "✗ 4-8 requis"}</p>
        </div>

        <button disabled={loading} type="submit" className={`w-full p-4 rounded-full font-bold text-white mt-2 ${type === "pro" ? "bg-[#6C3CE0]" : "bg-black"} ${loading ? "opacity-50" : ""}`}>
          {loading ? "Création..." : type === "client" ? "Créer Compte Client - Gratuit" : "Créer Compte Pro - Gratuit"}
        </button>

        <p className="text-center text-[10px] text-gray-500 mt-2">
          {type === "client" 
            ? "Client peut vendre occasionnellement: 3$ / 6 900 CDF avant lancement"
            : "Après inscription gratuite: Pro 5$ / 11 500 CDF ou Grossiste 25$ / 57 500 CDF. Non-paiement = retour Freemium (3 annonces). Paiement = activation immédiate."}
        </p>
      </form>
    </div>
  )
            }
