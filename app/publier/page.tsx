"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, getActiviteById } from "@/lib/categories";
import { FORMULES, TAUX_CDF, checkFreemiumLimit } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");
const getCurrentUser = () => {
  try { 
    const raw = typeof window !== "undefined" ? localStorage.getItem("wenze_user") : null; 
    return raw ? JSON.parse(raw) : null; 
  } catch { return null; }
};

// ✅ FIX IA - fonction locale qui ne plante pas
const comprendreImageLocal = async (media: string) => {
  if(!media) return "Produit de qualité à Kinshasa";
  // Mock IA locale - tu brancheras ton API plus tard
  return "Produit authentique WENZE - qualité vérifiée Kinshasa. Livraison rapide. Contact WhatsApp.";
};

function PublierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVideoMode = searchParams.get("boost") === "video";
  const preCat = searchParams.get("categorie") || "";
  const preAct = searchParams.get("activite") || "";

  const [user, setUser] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [media, setMedia] = useState("");
  const [typeMedia, setTypeMedia] = useState<"image" | "video">("image");
  const [form, setForm] = useState({ titre: "", prix: "", description: "", categorie: preCat || "commerce", activite: preAct || "", lat: 0, lng: 0 });
  const [loadingIA, setLoadingIA] = useState(false);
  const [captionIA, setCaptionIA] = useState("");
  const [freemiumInfo, setFreemiumInfo] = useState<any>({ peutPublier: true, annoncesRestantes: 3, type: "freemium" });

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (typeof window !== "undefined") {
      setFreemiumInfo(checkFreemiumLimit());
      // compte réel depuis list
      try{
        const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
        const myWa = u ? cleanWhatsapp(u.whatsapp) : "";
        const mine = myWa ? list.filter((a:any)=> cleanWhatsapp(a.ownerWhatsapp||a.whatsapp)===myWa) : [];
        setCount(mine.length);
      }catch{}
    }
    if (isVideoMode) setTypeMedia("video");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => setForm(f => ({ ...f, lat: p.coords.latitude, lng: p.coords.longitude })), () => {});
    }
  }, [isVideoMode]);

  const handleFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith("video/")) {
        if (file.size > 10 * 1024 * 1024) { alert("Vidéo max 10MB - compresse avant"); return resolve(""); }
        setTypeMedia("video");
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
        return;
      }
      if (file.size > 5 * 1024 * 1024) { alert("Image trop lourde, je compresse à 150KB..."); }
      setTypeMedia("image");
      const reader = new FileReader();
      reader.onload = e => {
        const img = new window.Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const MAX = 800; let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } } 
          else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
          c.width = w; c.height = h;
          c.getContext("2d")?.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", 0.68)); // 150KB target
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePublish = () => {
    const current = getCurrentUser();
    if (!current || !current.whatsapp) { alert("⛔ Crée ton compte"); router.push("/inscription"); return; }
    const whatsappClean = cleanWhatsapp(current.whatsapp);
    if (whatsappClean.length < 9) { alert("⛔ WhatsApp invalide"); return; }
    const info = checkFreemiumLimit();
    if (!info.peutPublier) { router.push("/abonnement"); return; }
    if (!form.titre || !form.prix || !media) { alert("Titre, prix et photo/vidéo obligatoires"); return; }
    if (!form.categorie) { alert("Choisis une catégorie"); return; }
    if (!form.activite) { alert("Choisis ton métier (ex: soudeur, tout travaux techniques)"); return; }

    const catObj = getCategorieById(form.categorie);
    const actObj = getActiviteById(form.categorie, form.activite);
    if(!catObj || !actObj){ alert("Catégorie/métier invalide"); return; }

    const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const prixNum = parseFloat(form.prix) || 0;
    
    const nouvelle = {
      id: Date.now().toString(),
      titre: form.titre.trim(),
      prix: prixNum,
      prixCDF: Math.round(prixNum * TAUX_CDF), // ✅ NUMBER pas string
      description: form.description,
      // ✅ DOUBLE stockage pour compatibilité totale avec tes 3 pages
      categorie: catObj.id, // id pour filtre expert
      categorieId: catObj.id,
      categorieTitre: catObj.titre,
      categorieCourt: catObj.titreCourt,
      activite: actObj.slug, // slug pour URL /categorie/technique/soudeur
      activiteId: actObj.id,
      activiteSlug: actObj.slug,
      activiteLabel: actObj.label,
      // media
      photo: typeMedia === "image" ? media : "",
      video: typeMedia === "video" ? media : "",
      typeMedia,
      // user
      user: current.nom,
      userId: current.id,
      whatsapp: whatsappClean,
      telephone: whatsappClean,
      ownerWhatsapp: whatsappClean,
      // meta
      type: current.type || "freemium",
      estBoutique: current.estBoutique || false,
      captionIA,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lat: form.lat,
      lng: form.lng,
    };
    annonces.push(nouvelle);
    localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
    
    const miennes = annonces.filter((a:any) => cleanWhatsapp(a.ownerWhatsapp||a.whatsapp) === whatsappClean);
    localStorage.setItem("wenze_annonces", String(miennes.length));
    localStorage.setItem("wenze_annonces_count", String(miennes.length));
    
    alert(`✅ ${actObj.label} publié! ${form.titre} à ${prixNum}$ - visible dans ${catObj.titre} → ${actObj.label}`);
    router.push(form.categorie === "technique" ? `/categorie/${catObj.id}/${actObj.slug}` : "/");
  };

  if (!user) return <div className="max-w-[430px] mx-auto p-5 bg-[#FFFBF0] min-h-screen">Chargement... <Link href="/inscription" className="text-[#6C3CE0] font-bold">Créer compte</Link></div>;

  const blocked = !freemiumInfo.peutPublier;
  const catActive = CATEGORIES_WENZE.find((c: any) => c.id === form.categorie);
  const isPayant = user.type === "pro" || user.type === "grossiste" || freemiumInfo.type === "pro";
  const actActive = catActive ? getActiviteById(catActive.id, form.activite) : null;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-24">
      <Link href={isVideoMode ? "/video" : "/"} className="text-xs text-[#6C3CE0] font-bold">← {isVideoMode ? "Wenze Vidéo" : "Accueil"}</Link>
      <h1 className="text-xl font-black mt-2">{isVideoMode ? "Publier Vidéo 🎬 10MB" : "Publier Service / Produit"}</h1>
      <p className="text-[11px] text-gray-500">6 métiers • Photo 150KB • Vidéo 10MB • W-Pay {TAUX_CDF} CDF</p>
      
      <div className="p-2.5 rounded-xl mt-3 text-[10px] flex justify-between bg-[#6C3CE0] text-white">
        <span>🔒 {user.nom} • ...{user.whatsapp?.slice(-4)} • {user.type||"freemium"}</span>
        <span>{blocked ? "BLOQUÉ - Passe Pro" : isVideoMode ? "VIDÉO" : `${count}/3 gratuits`}</span>
      </div>

      {blocked ? (
        <div className="bg-white border p-6 rounded-2xl mt-4 text-center">
          <p className="text-3xl">👑</p>
          <p className="font-bold text-sm mt-2">Limite atteinte</p>
          <p className="text-[11px] text-gray-500 mt-1">Tu as publié {count} annonces. Passe Pro {FORMULES.pro.prix}$ pour publier illimité + IA + W-Pay</p>
          <Link href="/abonnement" className="mt-4 block bg-[#6C3CE0] text-white p-4 rounded-full font-bold">Passer Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre ex: Soudeur portail Kinshasa" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:border-[#6C3CE0]" />
          
          <div className="flex gap-2">
            <input placeholder="Prix USD ex: 50" type="number" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} className="flex-1 border p-3 rounded-xl text-sm bg-white outline-none focus:border-[#6C3CE0]" />
            <div className="bg-white border rounded-xl px-3 flex items-center text-[11px] font-bold text-[#6C3CE0]">
              {form.prix ? `${(parseFloat(form.prix||"0")*TAUX_CDF).toLocaleString()} CDF` : `${TAUX_CDF} CDF/$`}
            </div>
          </div>

          <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value, activite: "" })} className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:border-[#6C3CE0]">
            <option value="">Catégorie (6 métiers)</option>
            {CATEGORIES_WENZE.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.titre} ({c.activites.length})</option>)}
          </select>

          <select value={form.activite} onChange={e => setForm({ ...form, activite: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:border-[#6C3CE0] font-semibold">
            <option value="">Métier / Activité...</option>
            {(catActive?.activites || []).map((a: any) => <option key={a.slug} value={a.slug}>{a.label} {a.slug==="tout-travaux-techniques" ? "🔧 (Soudeur+)" : ""}</option>)}
          </select>

          {actActive?.slug === "tout-travaux-techniques" && (
            <div className="bg-[#6C3CE0]/10 border border-[#6C3CE0]/20 rounded-xl p-3 text-[11px]">
              <p className="font-bold text-[#6C3CE0]">🔧 Tout travaux techniques sélectionné</p>
              <p className="text-gray-600 mt-1">Tu seras visible pour: soudeur, carreleur, vitreur, aluminium, plombier, etc. Idéal si tu fais plusieurs travaux.</p>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold">{isVideoMode ? "Vidéo TikTok (max 10MB)" : "Photo 150KB auto / Vidéo 10MB"}</label>
            <input type="file" accept={isVideoMode ? "video/*" : "image/*,video/*"} onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await handleFile(f); if (r) setMedia(r); } }} className="w-full border p-2 rounded-xl text-xs mt-1 bg-white" />
            <div className="w-full aspect-[4/3] bg-white rounded-xl mt-2 border-2 border-dashed flex items-center justify-center overflow-hidden p-2 relative">
              {media ? (
                <>{typeMedia === "video" ? <video src={media} controls className="max-w-full max-h-full" /> : <img src={media} className="max-w-full max-h-full object-contain" alt="preview" />}<button onClick={() => setMedia("")} className="absolute top-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded-full">✕ Supprimer</button></>
              ) : (
                <div className="text-center"><p className="text-3xl">{isVideoMode ? "🎬" : "📸"}</p><p className="text-[11px] text-gray-400 font-bold">Aperçu sans couper - {isVideoMode ? "10MB max" : "compressé 150KB"}</p></div>
              )}
            </div>
          </div>

          {isPayant && media && (
            <button onClick={async () => { setLoadingIA(true); const cap = await comprendreImageLocal(media); setCaptionIA(cap); setForm(f => ({...f, description: f.description ? f.description : `🔥 ${f.titre} - ${cap}`})); setLoadingIA(false); }} disabled={loadingIA} className="w-full bg-gradient-to-r from-[#6C3CE0] to-[#FF6B35] text-white p-3 rounded-xl text-sm font-bold disabled:opacity-50">{loadingIA ? "IA analyse..." : "🤖 Générer description IA gratuite"}</button>
          )}

          <textarea placeholder="Description: ex: Je suis soudeur à Kinshasa, je fais portails, grillages..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border p-3 rounded-xl text-sm h-24 bg-white outline-none focus:border-[#6C3CE0]" />

          {actActive && (
            <div className="bg-white border rounded-xl p-3 text-[11px]">
              <p>Tu vas publier dans: <b className="text-[#6C3CE0]">{catActive?.titre} → {actActive.label}</b></p>
              <p className="text-gray-500 mt-1">Visible à: /categorie/{catActive?.id}/{actActive.slug}</p>
            </div>
          )}

          <button onClick={handlePublish} className="w-full bg-[#6C3CE0] hover:bg-[#5a32bd] text-white p-4 rounded-full font-bold shadow-lg">Publier comme {user.nom} dans {actActive?.label||"..."}</button>
          
          <p className="text-[10px] text-center text-gray-400">0% commission • W-Pay • WhatsApp masqué 🔒 • Taux {TAUX_CDF} CDF</p>
        </div>
      )}
    </div>
  );
}

export default function PublierPage() {
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto p-10 text-center bg-[#FFFBF0] min-h-screen">Chargement Wenze...</div>}>
      <PublierContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
