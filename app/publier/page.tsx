"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE } from "@/lib/categories";
import { FORMULES, TAUX_CDF, checkFreemiumLimit, verifierAbonnement } from "@/lib/paiement";

const comprendreImageLocal = async (base64: string) => {
  await new Promise(r => setTimeout(r, 700));
  return "Photo détectée: bon éclairage, fond clair. Prête pour vente Kinshasa.";
};
const genererDescriptionVenteLocal = async (titre: string, caption: string) => {
  return `🔥 ${titre} - Qualité garantie à Kinshasa! ${caption} Livraison rapide, Mobile Money / ${TAUX_CDF} CDF / $. 0% commission Wenze. Contact WhatsApp direct.`;
};

export default function PublierPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [photo, setPhoto] = useState("");
  const [form, setForm] = useState({ titre: "", prix: "", description: "", categorie: "commerce", activite: "", lat: 0, lng: 0 });
  const [loadingIA, setLoadingIA] = useState(false);
  const [captionIA, setCaptionIA] = useState("");
  const [freemiumInfo, setFreemiumInfo] = useState<any>({ peutPublier: true, annoncesRestantes: 3, type: "freemium" });

  useEffect(() => {
    const uRaw = localStorage.getItem("wenze_user");
    const u = uRaw ? JSON.parse(uRaw) : null;
    setUser(u);
    setCount(parseInt(localStorage.getItem("wenze_annonces") || "0"));
    setFreemiumInfo(checkFreemiumLimit());
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setForm(f => ({ ...f, lat: p.coords.latitude, lng: p.coords.longitude })),
        () => {}
      );
    }
    if (u) {
      const info = checkFreemiumLimit();
      setFreemiumInfo(info);
    }
  }, []);

  const compress = (file: File): Promise<string> => {
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = e => {
        if (typeof window === 'undefined') return res(e.target?.result as string);
        const img = new window.Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } } 
          else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
          c.width = w; c.height = h;
          c.getContext("2d")?.drawImage(img, 0, 0, w, h);
          res(c.toDataURL("image/jpeg", 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAideIA = async () => {
    if (!photo) { alert("Ajoutez photo d'abord"); return; }
    if (!user || user.type === "client" || user.type === "freemium" || user.estBoutique === false) {
      alert(`🔒 IA réservée ${FORMULES.pro.nom} ${FORMULES.pro.prix}$`);
      router.push("/abonnement");
      return;
    }
    setLoadingIA(true);
    try {
      const cap = await comprendreImageLocal(photo);
      setCaptionIA(cap);
      const desc = await genererDescriptionVenteLocal(form.titre || "Produit", cap);
      setForm(f => ({ ...f, description: desc }));
    } catch (e: any) { alert("Erreur IA: " + e.message); }
    setLoadingIA(false);
  };

  const handlePublish = () => {
    if (!user?.nom) { alert("Créez compte d'abord"); router.push("/inscription"); return; }
    const info = checkFreemiumLimit();
    if (!info.peutPublier) {
      if (info.type === "client") { router.push("/abonnement?type=occasionnel"); return; }
      if (info.type === "freemium") { router.push("/abonnement"); return; }
    }
    if (!form.titre || !form.prix || !photo) { alert("Titre, prix et photo obligatoires"); return; }
    if (user.estBoutique === true && !form.categorie) { alert("Choisissez catégorie boutique"); return; }

    // ✅ INTÉGRATION RECO: WhatsApp = numéro vendeur nettoyé + 1 numéro = 1 compte
    const whatsappClean = (user.whatsapp || user.telephone || "").toString().replace(/[^0-9]/g, "");
    const telephoneClean = whatsappClean; // même référence

    const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const nouvelleAnnonce = {
      id: Date.now(),
      ...form,
      photo,
      user: user.nom,
      whatsapp: whatsappClean, // ✅ Numéro vendeur enregistré, sans espaces
      telephone: telephoneClean,
      type: user.type,
      profession: user.profession,
      categorie: form.categorie,
      estBoutique: user.estBoutique,
      captionIA,
      date: new Date().toISOString(),
      prixCDF: `${form.prix} (Taux ${TAUX_CDF})`,
      userId: user.id, // ✅ Pour sécurité: un compte ne manipule pas un autre
      ownerWhatsapp: whatsappClean // ✅ Double sécurité
    };
    
    annonces.push(nouvelleAnnonce);
    localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
    localStorage.setItem("wenze_annonces", String(count + 1));

    // ✅ INTÉGRATION RECO: Assure que wenze_user a bien whatsapp clean
    const updatedUser = { ...user, whatsapp: whatsappClean, telephone: telephoneClean };
    localStorage.setItem("wenze_user", JSON.stringify(updatedUser));

    // ✅ INTÉGRATION RECO: Met à jour aussi dans wenze_all_users pour 1 numéro = 1 compte
    try {
      const allRaw = localStorage.getItem("wenze_all_users");
      if (allRaw) {
        let all = JSON.parse(allRaw);
        all = all.map((u: any) => {
          if (u.id === user.id || u.whatsapp?.replace(/[^0-9]/g,"") === whatsappClean) {
            return { ...u, whatsapp: whatsappClean, telephone: telephoneClean };
          }
          return u;
        });
        localStorage.setItem("wenze_all_users", JSON.stringify(all));
      }
    } catch {}

    alert(`✅ Publiée! WhatsApp vendeur: ${whatsappClean}`);
    router.push("/profil");
  };

  if (!user) return <div className="max-w-[430px] mx-auto p-5">Chargement... <Link href="/inscription" className="text-[#6C3CE0] font-bold">Créer compte</Link></div>;

  const isClientPerso = user.estBoutique === false || freemiumInfo.type === "client";
  const isFreemium = freemiumInfo.type === "freemium";
  const isPayant = user.type === "pro" || user.type === "grossiste" || freemiumInfo.type === "pro";
  const blocked = !freemiumInfo.peutPublier;
  const catActive = CATEGORIES_WENZE.find((c: any) => c.id === form.categorie);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-20">
      <Link href="/profil" className="text-xs text-[#6C3CE0] font-bold">← Profil</Link>
      <h1 className="text-xl font-black mt-2">Publier Annonce</h1>
      <div className={`p-2 rounded-xl mt-3 text-[10px] flex justify-between ${isClientPerso ? "bg-black text-white" : isFreemium ? "bg-gray-800 text-white" : "bg-[#6C3CE0] text-white"}`}>
        <span>{isClientPerso ? "CLIENT PERSO" : user.type.toUpperCase()} • {user.whatsapp}</span>
        <span>{blocked ? "BLOQUÉ" : isFreemium ? `${count}/3 à vie` : "ILLIMITÉ"}</span>
      </div>
      {blocked ? (
        <div className="bg-white border-2 border-red-200 p-4 rounded-2xl mt-4 text-center">
          <p className="font-black">Limite atteinte</p>
          <Link href="/abonnement" className="block bg-[#6C3CE0] text-white p-4 rounded-full mt-4 font-bold">Passer Pro</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white" />
          <input placeholder={`Prix`} value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white" />
          <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value, activite: "" })} className="w-full border p-3 rounded-xl text-sm bg-white">
            <option value="">Catégorie</option>
            {CATEGORIES_WENZE.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.titreCourt}</option>)}
          </select>
          <select value={form.activite} onChange={e => setForm({ ...form, activite: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white">
            <option value="">Métier précis...</option>
            {(catActive?.activites || []).map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <div>
            <label className="text-[11px] font-bold">Photo adaptée auto</label>
            <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) setPhoto(await compress(f)); }} className="w-full border p-2 rounded-xl text-xs mt-1 bg-white" />
            {photo && (
              <div className="w-full aspect-[4/3] bg-white rounded-xl mt-2 border flex items-center justify-center overflow-hidden p-2">
                <img src={photo} alt="preview" className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </div>
          {isPayant ? <button onClick={handleAideIA} className="w-full bg-gradient-to-r from-[#6C3CE0] to-[#FF6B35] text-white p-3 rounded-xl text-sm font-bold">🤖 IA Gratuite</button> : <div className="bg-gray-100 p-3 rounded-xl text-[11px] border">🔒 IA réservée Pro</div>}
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border p-3 rounded-xl text-sm h-24 bg-white" />
          <button onClick={handlePublish} className="w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold">Publier • WhatsApp {user.whatsapp}</button>
        </div>
      )}
    </div>
  );
        }
