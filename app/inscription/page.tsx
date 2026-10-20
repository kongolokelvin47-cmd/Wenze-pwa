"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FORMULES, TAUX_CDF } from "@/lib/paiement";

const PROFESSIONS_PRO = ["Vendeur boutique", "Mécanicien", "Salon de coiffure", "Électricien", "Plombier", "Menuisier", "Tailleur", "Photographe", "Restaurateur", "Autres petits services"];
const PROFESSIONS_GROSSISTE = ["Grossiste / Dépôt B2B", "Agriculteur", "Entreprise", "Grande échelle / Usine"];

function InscriptionForm() {
  const params = useSearchParams();
  const router = useRouter();
  const initialType = params.get("type") === "pro" ? "pro" : "client";
  const [type, setType] = useState<"client"|"pro">(initialType as any);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nom: "", whatsapp: "", profession: "", adresse: "", password: "", photo: "" });
  const [preview, setPreview] = useState("");

  const compressPhoto = (file: File): Promise<string> => {
    return new Promise((res) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof window === 'undefined') return res(e.target?.result as string);
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 400;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
          res(canvas.toDataURL("image/jpeg", 0.6));
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
    if (form.password.length < 4 || form.password.length > 8) { alert("Mot de passe 4 à 8 caractères"); return; }
    if (!form.nom || !form.whatsapp) { alert("Nom et WhatsApp obligatoires"); return; }
    if (type === "pro" && !form.profession) { alert("Choisissez profession"); return; }
    if (!form.photo) { alert("Photo de profil obligatoire"); return; }

    setLoading(true);
    const isGrossiste = PROFESSIONS_GROSSISTE.includes(form.profession);

    let userData: any;
    if (type === "client") {
      // CLIENT = 100% PERSONNEL - PAS DE BOUTIQUE - GRATUIT 0$ / 0 CDF
      userData = {
        nom: form.nom,
        whatsapp: form.whatsapp,
        photo: form.photo,
        password: form.password, // CRITIQUE: pour connexion
        type: "client",
        profession: "Client / Acheteur",
        categorie: "client_perso",
        abonnement: `Client Gratuit - 0$ / 0 CDF - Vente occasionnelle ${FORMULES.occasionnel.prix}$ / ${FORMULES.occasionnel.prixCDF} CDF`,
        annoncesLimite: 0,
        estBoutique: false, // JAMAIS boutique
        peutImmigrerPro: true, // Peut devenir Pro plus tard
        date: new Date().toISOString(),
        freemiumCount: 0
      };
    } else {
      // BOUTIQUE = FREEMIUM 3 GRATUITES À VIE - GRATUIT AU DÉBUT
      userData = {
        nom: form.nom,
        whatsapp: form.whatsapp,
        profession: form.profession,
        adresse: form.adresse,
        photo: form.photo,
        password: form.password, // CRITIQUE
        type: "freemium", // Démarre freemium, pas pro direct
        typeSouhaite: isGrossiste ? "grossiste" : "pro",
        categorie: form.profession,
        abonnement: isGrossiste ? `${FORMULES.grossiste.nom} ${FORMULES.grossiste.prix}$ / ${FORMULES.grossiste.prixCDF} CDF/mois` : `${FORMULES.pro.nom} ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF} CDF/mois`,
        annoncesLimite: 3,
        estBoutique: true,
        peutImmigrerPro: false,
        date: new Date().toISOString(),
        freemiumCount: 0
      };
    }

    localStorage.setItem("wenze_user", JSON.stringify(userData));
    localStorage.setItem("wenze_connecte", "true");
    localStorage.setItem("wenze_annonces", "0");
    localStorage.setItem("wenze_annonces_list", "[]");
    localStorage.setItem("wenze_panier", "[]");
    localStorage.setItem("wenze_favoris", "[]");

    setTimeout(() => { setLoading(false); router.push("/profil"); }, 600);
  };

  const isGrossisteSelected = PROFESSIONS_GROSSISTE.includes(form.profession);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-20">
      <Link href="/profil" className="text-xs text-[#6C3CE0] font-bold">← Retour Profil</Link>

      <div className="flex gap-2 mt-4">
        <button onClick={() => setType("client")} className={`flex-1 p-3 rounded-full text-xs font-bold border ${type === "client" ? "bg-black text-white border-black" : "bg-white"}`}>
          Client Perso
        </button>
        <button onClick={() => setType("pro")} className={`flex-1 p-3 rounded-full text-xs font-bold border ${type === "pro" ? "bg-[#6C3CE0] text-white border-[#6C3CE0]" : "bg-white"}`}>
          Boutique Pro
        </button>
      </div>

      <h1 className="text-xl font-black mt-4">{type === "client" ? "Compte Personnel - Gratuit" : "Créer Boutique - Gratuit"}</h1>
      <p className="text-[11px] text-green-600 font-bold">✓ INSCRIPTION GRATUITE 0$ / 0 CDF - Taux 1$ = {TAUX_CDF} CDF</p>
      
      {type === "client" && (
        <div className="bg-white border rounded-xl p-3 mt-2">
          <p className="text-[10px] text-gray-700">✅ <b>Compte perso, pas boutique.</b> Vous achetez en illimité. Vous ne créez pas de boutique.</p>
          <p className="text-[10px] text-gray-500 mt-1">Vente occasionnelle: {FORMULES.occasionnel.prix}$ / {FORMULES.occasionnel.prixCDF} CDF par annonce avant lancement.</p>
          <p className="text-[10px] text-[#6C3CE0] font-bold mt-1">→ Plus tard, vous pouvez immigrer vers Compte Pro en 1 clic dans Profil → Devenir Vendeur Pro</p>
        </div>
      )}
      
      {type === "pro" && (
        <div className="bg-white border rounded-xl p-3 mt-2">
          <p className="text-[10px] text-gray-700">✅ <b>Boutique Pro - Inscription gratuite.</b> Vous démarrez avec 3 annonces gratuites à vie (Freemium).</p>
          <p className="text-[10px] text-gray-500 mt-1">Après 3: Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF} CDF ou Grossiste {FORMULES.grossiste.prix}$ / {FORMULES.grossiste.prixCDF} CDF / mois = illimité + IA. Non-paiement = retour Freemium.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div>
          <label className="text-[11px] font-bold">Nom complet *</label>
          <input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Jean Kabasele" className="w-full border p-3 rounded-xl text-sm mt-1 bg-white" />
        </div>
        <div>
          <label className="text-[11px] font-bold">WhatsApp *</label>
          <input required value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+243 81..." className="w-full border p-3 rounded-xl text-sm mt-1 bg-white" />
        </div>
        {type === "pro" && (
          <>
            <div>
              <label className="text-[11px] font-bold">Profession boutique *</label>
              <select required value={form.profession} onChange={e => setForm({ ...form, profession: e.target.value })} className="w-full border p-3 rounded-xl text-sm mt-1 bg-white">
                <option value="">Choisissez</option>
                <optgroup label={`Petits services - ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF} CDF`}>
                  {PROFESSIONS_PRO.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
                <optgroup label={`Grande échelle - ${FORMULES.grossiste.prix}$ / ${FORMULES.grossiste.prixCDF} CDF`}>
                  {PROFESSIONS_GROSSISTE.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
              </select>
              {form.profession && <p className="text-[10px] mt-1 font-bold text-[#6C3CE0]">{isGrossisteSelected ? `→ Grossiste ${FORMULES.grossiste.prix}$ / ${FORMULES.grossiste.prixCDF} CDF` : `→ Pro ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF} CDF`} - 3 gratuites</p>}
            </div>
            <div>
              <label className="text-[11px] font-bold">Adresse boutique <span className="text-gray-400 font-normal">(facultatif)</span></label>
              <input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} placeholder="Av. Lumumba 12, Gombe" className="w-full border p-3 rounded-xl text-sm mt-1 bg-white" />
            </div>
          </>
        )}
        <div>
          <label className="text-[11px] font-bold">Photo profil *</label>
          <input type="file" accept="image/*" onChange={handlePhoto} className="w-full text-xs mt-1 border p-2 rounded-xl bg-white" />
          {preview && <div className="mt-2 flex items-center gap-2"><img src={preview} alt="preview" className="w-16 h-16 rounded-full object-cover border" /><p className="text-[10px] text-green-600">✓ Compressée</p></div>}
        </div>
        <div>
          <label className="text-[11px] font-bold">Mot de passe * (4 à 8)</label>
          <input required type="password" minLength={4} maxLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="4 à 8 caractères" className="w-full border p-3 rounded-xl text-sm mt-1 bg-white" />
        </div>
        <button disabled={loading} type="submit" className={`w-full p-4 rounded-full font-bold text-white mt-2 ${type === "pro" ? "bg-[#6C3CE0]" : "bg-black"} ${loading ? "opacity-50" : ""}`}>
          {loading ? "Création..." : type === "client" ? "Créer Compte Perso - Gratuit 0$" : "Créer Boutique - Gratuit 3 annonces"}
        </button>
      </form>

      {type === "client" && (
        <div className="mt-4 text-center">
          <Link href="/profil" className="text-[11px] text-[#6C3CE0] font-bold underline">Déjà client? Devenir Vendeur Pro →</Link>
          <p className="text-[10px] text-gray-400 mt-1">Cette action se fait dans Profil: bouton Immigrer vers Pro</p>
        </div>
      )}
    </div>
  )
}

export default function Inscription() {
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto p-10 text-center text-sm">Chargement...</div>}>
      <InscriptionForm />
    </Suspense>
  );
}
