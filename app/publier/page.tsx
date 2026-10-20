"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE } from "@/lib/categories";
import { FORMULES, TAUX_CDF, checkFreemiumLimit } from "@/lib/paiement";

const comprendreImageLocal = async (base64: string) => {
  await new Promise(r => setTimeout(r, 700));
  return "Photo détectée: bon éclairage, fond clair. Prête pour vente Kinshasa.";
};
const genererDescriptionVenteLocal = async (titre: string, caption: string) => {
  return `🔥 ${titre} - Qualité garantie! ${caption} Livraison rapide Kinshasa.`;
};

// ✅ SÉCURITÉ + VRAI VENDEUR
const cleanWhatsapp = (num: string) => (num || "").toString().replace(/[^0-9]/g, "");
const getCurrentUser = () => {
  try { const raw = localStorage.getItem("wenze_user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export default function PublierPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVideoMode = searchParams.get("boost") === "video";

  const [user, setUser] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [media, setMedia] = useState(""); // base64 image OU video
  const [typeMedia, setTypeMedia] = useState<"image" | "video">("image");
  const [form, setForm] = useState({ titre: "", prix: "", description: "", categorie: "commerce", activite: "", lat: 0, lng: 0 });
  const [loadingIA, setLoadingIA] = useState(false);
  const [captionIA, setCaptionIA] = useState("");
  const [freemiumInfo, setFreemiumInfo] = useState<any>({ peutPublier: true, annoncesRestantes: 3, type: "freemium" });

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setCount(parseInt(localStorage.getItem("wenze_annonces") || "0"));
    setFreemiumInfo(checkFreemiumLimit());
    if (isVideoMode) setTypeMedia("video");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => setForm(f => ({ ...f, lat: p.coords.latitude, lng: p.coords.longitude })), () => {});
    }
  }, [isVideoMode]);

  // ✅ AMÉLIORATION: Image + Vidéo
  const handleFile = (file: File): Promise<string> => {
    return new Promise((res, rej) => {
      if (file.type.startsWith("video/")) {
        if (file.size > 25 * 1024 * 1024) { alert("Vidéo max 25MB pour Wenze Vidéo"); rej(); return; }
        setTypeMedia("video");
        const reader = new FileReader();
        reader.onload = e => res(e.target?.result as string);
        reader.readAsDataURL(file);
        return;
      }
      // Image avec compression
      setTypeMedia("image");
      const reader = new FileReader();
      reader.onload = e => {
        if (typeof window === 'undefined') return res(e.target?.result as string);
        const img = new window.Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const MAX = 800; let w = img.width, h = img.height;
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
    if (!media) { alert("Ajoutez photo/vidéo d'abord"); return; }
    if (typeMedia === "video") { alert("IA description bientôt pour vidéo"); return; }
    if (!user || user.type === "client" || user.type === "freemium" || user.estBoutique === false) {
      alert(`🔒 IA réservée Pro ${FORMULES.pro.prix}$`); router.push("/abonnement"); return;
    }
    setLoadingIA(true);
    try {
      const cap = await comprendreImageLocal(media);
      setCaptionIA(cap);
      const desc = await genererDescriptionVenteLocal(form.titre || "Produit", cap);
      setForm(f => ({ ...f, description: desc }));
    } catch (e: any) { alert("Erreur IA"); }
    setLoadingIA(false);
  };

  const handlePublish = () => {
    // 🔒 SÉCURITÉ RENFORCÉE
    const current = getCurrentUser();
    if (!current || !current.whatsapp) {
      alert("⛔ Connecte-toi d'abord"); router.push("/inscription"); return;
    }
    const whatsappClean = cleanWhatsapp(current.whatsapp);
    if (!whatsappClean || whatsappClean.length < 9) {
      alert("⛔ Numéro WhatsApp invalide"); return;
    }
    if (!current?.nom) { alert("Créez compte d'abord"); router.push("/inscription"); return; }
    
    const info = checkFreemiumLimit();
    if (!info.peutPublier) { router.push("/abonnement"); return; }
    if (!form.titre || !form.prix || !media) { alert("Titre, prix et photo/vidéo obligatoires"); return; }
    if (current.estBoutique === true && !form.categorie) { alert("Choisissez catégorie"); return; }

    const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const nouvelleAnnonce = {
      id: Date.now(),
      ...form,
      photo: typeMedia === "image" ? media : "",
      video: typeMedia === "video" ? media : "",
      typeMedia, // ✅ pour Wenze Vidéo
      user: current.nom,
      whatsapp: whatsappClean,
      telephone: whatsappClean,
      type: current.type,
      profession: current.profession,
      categorie: form.categorie,
      estBoutique: current.estBoutique,
      captionIA,
      date: new Date().toISOString(),
      prixCDF: `${form.prix} (Taux ${TAUX_CDF})`,
      userId: current.id,
      ownerWhatsapp: whatsappClean,
      createdBy: current.id
    };
    
    annonces.push(nouvelleAnnonce);
    localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
    
    const miennes = annonces.filter((a:any) => cleanWhatsapp(a.ownerWhatsapp||a.whatsapp) === whatsappClean);
    localStorage.setItem("wenze_annonces", String(miennes.length));

    const updatedUser = { ...current, whatsapp: whatsappClean, telephone: whatsappClean };
    localStorage.setItem("wenze_user", JSON.stringify(updatedUser));

    try {
      const allRaw = localStorage.getItem("wenze_all_users");
      if (allRaw) {
        let all = JSON.parse(allRaw);
        all = all.map((u: any) => {
          if (u.id === current.id || cleanWhatsapp(u.whatsapp) === whatsappClean) {
            return { ...u, whatsapp: whatsappClean, telephone: whatsappClean };
          }
          return u;
        });
        localStorage.setItem("wenze_all_users", JSON.stringify(all));
      }
    } catch {}

    alert(`✅ ${typeMedia === "video" ? "Vidéo" : "Annonce"} publiée! Vendeur: ${current.nom} (${whatsappClean})`);
    router.push(typeMedia === "video" ? "/video" : "/profil");
  };

  if (!user) return <div className="max-w-[430px] mx-auto p-5">Chargement... <Link href="/inscription" className="text-[#6C3CE0] font-bold">Créer compte</Link></div>;

  const isClientPerso = user.estBoutique === false || freemiumInfo.type === "client";
  const isFreemium = freemiumInfo.type === "freemium";
  const isPayant = user.type === "pro" || user.type === "grossiste" || freemiumInfo.type === "pro";
  const blocked = !freemiumInfo.peutPublier;
  const catActive = CATEGORIES_WENZE.find((c: any) => c.id === form.categorie);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-20">
      <Link href={isVideoMode ? "/video" : "/profil"} className="text-xs text-[#6C3CE0] font-bold">← {isVideoMode ? "Wenze Vidéo" : "Profil"}</Link>
      <h1 className="text-xl font-black mt-2">{isVideoMode ? "Publier Vidéo Vendeur 🎬" : "Publier Annonce"}</h1>
      <div className={`p-2 rounded-xl mt-3 text-[10px] flex justify-between ${isClientPerso ? "bg-black text-white" : isFreemium ? "bg-gray-800 text-white" : "bg-[#6C3CE0] text-white"}`}>
        <span>🔒 {user.nom} • {user.whatsapp} • ID {user.id?.slice(-4)}</span>
        <span>{blocked ? "BLOQUÉ" : isFreemium ? `${count}/3` : isVideoMode ? "VIDÉO" : "ILLIMITÉ"}</span>
      </div>
      {blocked ? (
        <div className="bg-white border-2 border-red-200 p-4 rounded-2xl mt-4 text-center"><p className="font-black">Limite atteinte</p><Link href="/abonnement" className="block bg-[#6C3CE0] text-white p-4 rounded-full mt-4 font-bold">Passer Pro</Link></div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white" />
          <input placeholder="Prix" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white" />
          <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value, activite: "" })} className="w-full border p-3 rounded-xl text-sm bg-white">
            <option value="">Catégorie</option>{CATEGORIES_WENZE.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.titreCourt}</option>)}
          </select>
          <select value={form.activite} onChange={e => setForm({ ...form, activite: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white">
            <option value="">Métier précis...</option>{(catActive?.activites || []).map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          
          {/* ✅ FIX: Zone toujours visible */}
          <div>
            <label className="text-[11px] font-bold">{isVideoMode ? "Vidéo verticale TikTok (max 25MB)" : "Photo / Vidéo adaptée auto (sans couper)"}</label>
            <input type="file" accept={isVideoMode ? "video/*" : "image/*,video/*"} onChange={async e => { const f = e.target.files?.[0]; if (f) setMedia(await handleFile(f)); }} className="w-full border p-2 rounded-xl text-xs mt-1 bg-white" />
            <div className="w-full aspect-[4/3] bg-white rounded-xl mt-2 border-2 border-dashed flex items-center justify-center overflow-hidden p-2 relative">
              {media ? (
                <>
                  {typeMedia === "video" ? <video src={media} controls className="max-w-full max-h-full" /> : <img src={media} className="max-w-full max-h-full object-contain" alt="preview" />}
                  <button onClick={() => setMedia("")} className="absolute top-2 right-2 bg-black text-white text-[10px] px-2 py-1 rounded-full">✕ Supprimer</button>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-3xl">{isVideoMode ? "🎬" : "📸"}</p>
                  <p className="text-[11px] text-gray-400 font-bold mt-1">{isVideoMode ? "Aperçu vidéo TikTok ici" : "Aperçu robe/iPhone/voiture entière ici"}</p>
                </div>
              )}
            </div>
          </div>

          {isPayant ? <button onClick={handleAideIA} disabled={loadingIA} className="w-full bg-gradient-to-r from-[#6C3CE0] to-[#FF6B35] text-white p-3 rounded-xl text-sm font-bold">{loadingIA ? "IA..." : "🤖 IA Gratuite"}</button> : <div className="bg-gray-100 p-3 rounded-xl text-[11px] border">🔒 IA réservée Pro</div>}
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border p-3 rounded-xl text-sm h-24 bg-white" />
          <button onClick={handlePublish} className="w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold">Publier {typeMedia === "video" ? "Vidéo 🎬" : "🔒"} comme {user.nom}</button>
          <p className="text-[9px] text-center text-gray-500">Sécurité: {user.id?.slice(-4)} • {user.whatsapp} • Photo et vidéo = même logique vrai vendeur</p>
        </div>
      )}
    </div>
  );
        }
