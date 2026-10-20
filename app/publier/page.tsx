"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE } from "@/lib/categories";
import { FORMULES, TAUX_CDF, checkFreemiumLimit } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");
const getCurrentUser = () => {
  try { 
    const raw = typeof window !== "undefined" ? localStorage.getItem("wenze_user") : null; 
    return raw ? JSON.parse(raw) : null; 
  } catch { return null; }
};

function PublierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVideoMode = searchParams.get("boost") === "video";

  const [user, setUser] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [media, setMedia] = useState("");
  const [typeMedia, setTypeMedia] = useState<"image" | "video">("image");
  const [form, setForm] = useState({ titre: "", prix: "", description: "", categorie: "commerce", activite: "", lat: 0, lng: 0 });
  const [loadingIA, setLoadingIA] = useState(false);
  const [captionIA, setCaptionIA] = useState("");
  const [freemiumInfo, setFreemiumInfo] = useState<any>({ peutPublier: true, annoncesRestantes: 3, type: "freemium" });

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (typeof window !== "undefined") {
      setCount(parseInt(localStorage.getItem("wenze_annonces") || "0"));
      setFreemiumInfo(checkFreemiumLimit());
    }
    if (isVideoMode) setTypeMedia("video");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => setForm(f => ({ ...f, lat: p.coords.latitude, lng: p.coords.longitude })), () => {});
    }
  }, [isVideoMode]);

  // ✅ FIX: pas de rej() qui bloque
  const handleFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith("video/")) {
        if (file.size > 10 * 1024 * 1024) { alert("Vidéo max 10MB (anti-facture)"); return resolve(""); }
        setTypeMedia("video");
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
        return;
      }
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
          resolve(c.toDataURL("image/jpeg", 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePublish = () => {
    const current = getCurrentUser();
    if (!current || !current.whatsapp) { alert("⛔ Connecte-toi"); router.push("/inscription"); return; }
    const whatsappClean = cleanWhatsapp(current.whatsapp);
    if (whatsappClean.length < 9) { alert("⛔ WhatsApp invalide"); return; }
    const info = checkFreemiumLimit();
    if (!info.peutPublier) { router.push("/abonnement"); return; }
    if (!form.titre || !form.prix || !media) { alert("Titre, prix et media obligatoires"); return; }

    const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const nouvelle = {
      id: Date.now(), ...form,
      photo: typeMedia === "image" ? media : "",
      video: typeMedia === "video" ? media : "",
      typeMedia, user: current.nom, whatsapp: whatsappClean, telephone: whatsappClean,
      type: current.type, categorie: form.categorie, estBoutique: current.estBoutique,
      captionIA, date: new Date().toISOString(), prixCDF: `${form.prix} (Taux ${TAUX_CDF})`,
      userId: current.id, ownerWhatsapp: whatsappClean,
    };
    annonces.push(nouvelle);
    localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
    const miennes = annonces.filter((a:any) => cleanWhatsapp(a.ownerWhatsapp||a.whatsapp) === whatsappClean);
    localStorage.setItem("wenze_annonces", String(miennes.length));
    alert(`✅ ${typeMedia === "video" ? "Vidéo" : "Annonce"} publiée!`);
    router.push(isVideoMode ? "/video" : "/");
  };

  if (!user) return <div className="max-w-[430px] mx-auto p-5">Chargement... <Link href="/inscription" className="text-[#6C3CE0] font-bold">Créer compte</Link></div>;

  const blocked = !freemiumInfo.peutPublier;
  const catActive = CATEGORIES_WENZE.find((c: any) => c.id === form.categorie);
  const isPayant = user.type === "pro" || user.type === "grossiste" || freemiumInfo.type === "pro";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-20">
      <Link href={isVideoMode ? "/video" : "/"} className="text-xs text-[#6C3CE0] font-bold">← {isVideoMode ? "Wenze Vidéo" : "Accueil"}</Link>
      <h1 className="text-xl font-black mt-2">{isVideoMode ? "Publier Vidéo 🎬" : "Publier Annonce"}</h1>
      <div className="p-2 rounded-xl mt-3 text-[10px] flex justify-between bg-[#6C3CE0] text-white">
        <span>🔒 {user.nom} • {user.whatsapp?.slice(-4)}</span>
        <span>{blocked ? "BLOQUÉ" : isVideoMode ? "VIDÉO" : `${count}/3`}</span>
      </div>
      {blocked ? (
        <div className="bg-white border p-4 rounded-2xl mt-4 text-center"><Link href="/abonnement" className="block bg-[#6C3CE0] text-white p-4 rounded-full font-bold">Passer Pro</Link></div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white" />
          <input placeholder="Prix USD" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white" />
          <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value, activite: "" })} className="w-full border p-3 rounded-xl text-sm bg-white">
            <option value="">Catégorie</option>{CATEGORIES_WENZE.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.titreCourt}</option>)}
          </select>
          <select value={form.activite} onChange={e => setForm({ ...form, activite: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white">
            <option value="">Métier...</option>{(catActive?.activites || []).map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <div>
            <label className="text-[11px] font-bold">{isVideoMode ? "Vidéo TikTok (max 10MB)" : "Photo / Vidéo adaptée auto"}</label>
            <input type="file" accept={isVideoMode ? "video/*" : "image/*,video/*"} onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await handleFile(f); if (r) setMedia(r); } }} className="w-full border p-2 rounded-xl text-xs mt-1 bg-white" />
            <div className="w-full aspect-[4/3] bg-white rounded-xl mt-2 border-2 border-dashed flex items-center justify-center overflow-hidden p-2 relative">
              {media ? (
                <>{typeMedia === "video" ? <video src={media} controls className="max-w-full max-h-full" /> : <img src={media} className="max-w-full max-h-full object-contain" alt="preview" />}<button onClick={() => setMedia("")} className="absolute top-2 right-2 bg-black text-white text-[10px] px-2 py-1 rounded-full">✕</button></>
              ) : (
                <div className="text-center"><p className="text-3xl">{isVideoMode ? "🎬" : "📸"}</p><p className="text-[11px] text-gray-400 font-bold">Aperçu sans couper</p></div>
              )}
            </div>
          </div>
          {isPayant && <button onClick={async () => { setLoadingIA(true); const cap = await comprendreImageLocal(media); setCaptionIA(cap); setForm(f => ({...f, description: `🔥 ${f.titre} - ${cap}`})); setLoadingIA(false); }} disabled={loadingIA} className="w-full bg-gradient-to-r from-[#6C3CE0] to-[#FF6B35] text-white p-3 rounded-xl text-sm font-bold">{loadingIA ? "IA..." : "🤖 IA Gratuite"}</button>}
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border p-3 rounded-xl text-sm h-24 bg-white" />
          <button onClick={handlePublish} className="w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold">Publier comme {user.nom}</button>
        </div>
      )}
    </div>
  );
}

export default function PublierPage() {
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto p-10 text-center">Chargement Wenze...</div>}>
      <PublierContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
