"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, getActiviteById, normalizeCategorie } from "@/lib/categories";
import { FORMULES, TAUX_CDF, toCDF, checkFreemiumLimit, verifierAbonnement } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");
const getCurrentUser = () => {
  try { 
    const raw = typeof window !== "undefined" ? localStorage.getItem("wenze_user") : null; 
    return raw ? JSON.parse(raw) : null; 
  } catch { return null; }
};

const comprendreImageLocal = async (media: string) => {
  if(!media) return "Produit de qualité à Kinshasa";
  return "Produit authentique WENZE - qualité vérifiée Kinshasa. Taux 2300 CDF.";
};

function PublierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVideoMode = searchParams.get("boost") === "video";
  const isFlashMode = searchParams.get("type") === "flash";
  const preCat = searchParams.get("categorie") || "";
  const preAct = searchParams.get("activite") || "";

  const [user, setUser] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [media, setMedia] = useState("");
  const [typeMedia, setTypeMedia] = useState<"image" | "video">("image");
  const [form, setForm] = useState({ titre: "", prix: "", description: "", categorie: preCat, activite: preAct, lat: 0, lng: 0 });
  const [loadingIA, setLoadingIA] = useState(false);
  const [captionIA, setCaptionIA] = useState("");
  const [freemiumInfo, setFreemiumInfo] = useState<any>({ peutPublier: true, annoncesRestantes: 3, type: "freemium", isPro: false });
  const [isFlash, setIsFlash] = useState(false);
  const [isBoost, setIsBoost] = useState(false);
  const [flashRemise, setFlashRemise] = useState(30);
  const [abInfo, setAbInfo] = useState<any>({ actif: false, type: "freemium", expireDans: 0 });

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (typeof window !== "undefined") {
      setFreemiumInfo(checkFreemiumLimit());
      setAbInfo(verifierAbonnement());
      if (isFlashMode) setIsFlash(true);
      try{
        const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
        const myWa = u ? cleanWhatsapp(u.ownerWhatsapp || u.whatsapp) : "";
        const mine = myWa ? list.filter((a:any)=> cleanWhatsapp(a.ownerWhatsapp||a.whatsapp||a.ownerWhatsapp)===myWa) : [];
        setCount(mine.length);
      }catch{}
    }
    if (isVideoMode) setTypeMedia("video");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => setForm(f => ({ ...f, lat: p.coords.latitude, lng: p.coords.longitude })), () => {});
    }
  }, [isVideoMode, isFlashMode]);

  const handleFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith("video/")) {
        if (file.size > 10 * 1024 * 1024) { alert("Vidéo max 10MB"); return resolve(""); }
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
          resolve(c.toDataURL("image/jpeg", 0.68));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePublish = () => {
    const current = getCurrentUser();
    if (!current || !cleanWhatsapp(current.whatsapp || current.ownerWhatsapp)) { 
      alert("Crée ton compte"); 
      router.push("/inscription"); 
      return; 
    }
    const whatsappClean = cleanWhatsapp(current.ownerWhatsapp || current.whatsapp);
    if (whatsappClean.length < 9) { alert("WhatsApp invalide"); return; }
    if (!abInfo.actif && !freemiumInfo.peutPublier) { router.push("/abonnement"); return; }
    if (!form.titre || !form.prix || !media) { alert("Titre, prix et photo obligatoires"); return; }
    if (!form.categorie) { alert("Choisis une catégorie"); return; }
    if (!form.activite) { alert("Choisis ton métier"); return; }

    const catIdNorm = normalizeCategorie(form.categorie);
    const catObj = getCategorieById(form.categorie) || getCategorieById(catIdNorm);
    const actObj = getActiviteById(catObj?.id || catIdNorm, form.activite);
    if(!catObj || !actObj){ alert("Catégorie/métier invalide"); return; }

    const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const prixNum = parseFloat(form.prix) || 0;
    
    const nouvelle: any = {
      id: Date.now().toString(),
      titre: form.titre.trim(),
      prix: prixNum,
      prixCDF: toCDF(prixNum),
      description: form.description,
      categorie: catObj.id,
      categorieId: catObj.id,
      categorieTitre: catObj.titre,
      activite: actObj.slug,
      activiteId: actObj.id,
      activiteSlug: actObj.slug,
      activiteLabel: actObj.label,
      photo: typeMedia === "image" ? media : "",
      video: typeMedia === "video" ? media : "",
      typeMedia,
      user: current.nom,
      whatsapp: whatsappClean,
      ownerWhatsapp: whatsappClean,
      nom: current.nom,
      ville: current.ville || "Kinshasa",
      type: current.type || "freemium",
      regime: "prestataire",
      estBoutique: true,
      captionIA,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lat: form.lat,
      lng: form.lng,
      flash: isFlash,
      flashExpire: isFlash ? Date.now() + 24 * 3600000 : null,
      flashRemise: isFlash ? flashRemise : null,
      boost: isBoost,
      boostExpire: isBoost ? Date.now() + 5 * 86400000 : null,
    };

    annonces.push(nouvelle);
    localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
    
    const miennes = annonces.filter((a:any) => cleanWhatsapp(a.ownerWhatsapp||a.whatsapp) === whatsappClean);
    localStorage.setItem("wenze_annonces_count", String(miennes.length));

    try {
      const fixedUser = {
        ...current,
        ownerWhatsapp: whatsappClean,
        whatsapp: whatsappClean,
        regime: "prestataire",
        estBoutique: true,
        categorieId: catObj.id,
        profession: actObj.label,
        activiteId: actObj.id,
      };
      localStorage.setItem("wenze_user", JSON.stringify(fixedUser));
      const allRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allRaw ? JSON.parse(allRaw) : [];
      const idx = allUsers.findIndex((x:any) => cleanWhatsapp(x.ownerWhatsapp || x.whatsapp) === whatsappClean);
      if (idx >= 0) allUsers[idx] = { ...allUsers[idx], ...fixedUser };
      else allUsers.push(fixedUser);
      localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
    } catch {}

    alert("Annonce publiée - Boutique fonctionnelle - Taux 2300");
    if (isFlash) router.push("/vente-flash");
    else router.push("/");
  };

  if (!user) {
    return (
      <div className="max-w-[430px] mx-auto p-5 bg-[#FFFBF0] min-h-screen">
        Chargement... Taux {TAUX_CDF} 
        <Link href="/inscription" className="text-[#6C3CE0] font-bold ml-2">Créer compte</Link>
      </div>
    );
  }

  const blocked = !freemiumInfo.peutPublier && !abInfo.actif;
  const catActive = CATEGORIES_WENZE.find((c: any) => c.id === form.categorie) || CATEGORIES_WENZE.find((c: any) => c.id === normalizeCategorie(form.categorie));
  const isPayant = freemiumInfo.isPro || abInfo.actif;
  const actActive = catActive ? getActiviteById(catActive.id, form.activite) : null;
  const backLink = isVideoMode ? "/video" : isFlashMode ? "/vente-flash" : "/";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-24">
      <Link href={backLink} className="text-xs text-[#6C3CE0] font-bold">Retour - Taux {TAUX_CDF}</Link>
      <h1 className="text-xl font-black mt-2">Publier - {CATEGORIES_WENZE.length} métiers</h1>
      <p className="text-[11px] text-gray-500">Taux {TAUX_CDF} CDF fixe - Régime prestataire unique</p>
      
      <div className="p-2.5 rounded-xl mt-3 text-[10px] flex justify-between bg-black text-white">
        <span>{user.nom} - {user.type} - {abInfo.actif ? abInfo.type : "Freemium"}</span>
        <span>{blocked ? "BLOQUE" : count + "/3 - Taux " + TAUX_CDF}</span>
      </div>

      {blocked ? (
        <div className="bg-white border p-6 rounded-2xl mt-4 text-center">
          <p className="font-bold">Limite atteinte</p>
          <Link href="/abonnement" className="mt-4 block bg-[#6C3CE0] text-white p-4 rounded-full font-bold">Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF} CDF</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre ex: Soudeur portail" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white" />
          <div className="flex gap-2">
            <input placeholder="Prix USD" type="number" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} className="flex-1 border p-3 rounded-xl text-sm bg-white" />
            <div className="bg-white border rounded-xl px-3 flex items-center text-[11px] font-bold">{form.prix ? toCDF(parseFloat(form.prix)).toLocaleString() + " CDF" : TAUX_CDF + " CDF"}</div>
          </div>
          <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value, activite: "" })} className="w-full border p-3 rounded-xl text-sm bg-white">
            <option value="">Catégorie</option>
            {CATEGORIES_WENZE.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.titre}</option>)}
          </select>
          <select value={form.activite} onChange={e => setForm({ ...form, activite: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white">
            <option value="">Métier</option>
            {(catActive?.activites || []).map((a: any) => <option key={a.slug} value={a.slug}>{a.label}</option>)}
          </select>

          <div className="bg-white border rounded-xl p-3 space-y-2">
            <p className="text-[11px] font-black">Options - Taux {TAUX_CDF}</p>
            <label className="flex justify-between items-center bg-red-50 border border-red-200 p-2 rounded-xl">
              <span className="text-[12px] font-bold">Flash -{flashRemise}% - 24h</span>
              <input type="checkbox" checked={isFlash} onChange={e => setIsFlash(e.target.checked)} className="w-5 h-5" />
            </label>
            {isFlash && (
              <select value={flashRemise} onChange={e => setFlashRemise(parseInt(e.target.value))} className="w-full border p-2 rounded-xl text-[11px] bg-white">
                <option value={25}>-25%</option><option value={30}>-30%</option><option value={40}>-40%</option><option value={50}>-50%</option><option value={60}>-60%</option>
              </select>
            )}
            <label className="flex justify-between items-center bg-purple-50 border border-purple-200 p-2 rounded-xl">
              <span className="text-[12px] font-bold">Boost Top 5j - Pro {FORMULES.pro.prix}$</span>
              <input type="checkbox" checked={isBoost} onChange={e => setIsBoost(e.target.checked)} disabled={!isPayant} className="w-5 h-5" />
            </label>
            {isFlash && isBoost && <p className="text-[10px] bg-green-50 text-green-700 p-2 rounded-xl">Cumulé: Boost + Flash - Aucune incidence</p>}
          </div>

          <input type="file" accept={isVideoMode ? "video/*" : "image/*,video/*"} onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await handleFile(f); if (r) setMedia(r); } }} className="w-full border p-2 rounded-xl text-xs bg-white" />
          <div className="w-full aspect-[4/3] bg-white rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden">
            {media ? (typeMedia === "video" ? <video src={media} controls className="max-w-full max-h-full" /> : <img src={media} className="max-w-full max-h-full" alt="preview" />) : <span className="text-3xl">📸</span>}
          </div>

          {isPayant && media && (
            <button onClick={async () => { setLoadingIA(true); const cap = await comprendreImageLocal(media); setCaptionIA(cap); setForm(f => ({...f, description: cap})); setLoadingIA(false); }} className="w-full bg-[#6C3CE0] text-white p-3 rounded-xl text-sm font-bold">{loadingIA ? "IA..." : "Generer IA"}</button>
          )}

          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border p-3 rounded-xl text-sm h-24 bg-white" />

          {actActive && <div className="bg-white border rounded-xl p-3 text-[11px]">Publier dans: <b>{catActive?.titre} - {actActive.label}</b> - Taux {TAUX_CDF}</div>}

          <button onClick={handlePublish} className="w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold">Publier - Taux {TAUX_CDF}</button>
          <p className="text-[10px] text-center text-gray-400">Regime prestataire unique - Soudeur + Tout travaux meme regime - Pro {FORMULES.pro.prix}$ - Taux {TAUX_CDF}</p>
        </div>
      )}
    </div>
  );
}

export default function PublierPage() {
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto p-10 text-center bg-[#FFFBF0] min-h-screen">Chargement...</div>}>
      <PublierContent />
    </Suspense>
  );
}
export const dynamic = 'force-dynamic';
