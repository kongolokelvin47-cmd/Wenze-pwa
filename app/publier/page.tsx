"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, getActiviteById, normalizeCategorie } from "@/lib/categories";
import { FORMULES, TAUX_CDF, toCDF, checkFreemiumLimit, verifierAbonnement, toCDFString } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");
const getCurrentUser = () => {
  try { 
    const raw = typeof window !== "undefined" ? localStorage.getItem("wenze_user") : null; 
    return raw ? JSON.parse(raw) : null; 
  } catch { return null; }
};

const comprendreImageLocal = async (media: string) => {
  if(!media) return "Produit de qualité à Kinshasa";
  return "Produit authentique WENZE - qualité vérifiée Kinshasa. Taux 2300 CDF fixe - Boutique fonctionnelle.";
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
  
  // NOUVEAU FORMIDABLE - Anti-blocage
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<{msg:string, type:"loading"|"success"|"error"}|null>(null);

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

  const showToast = (msg:string, type:"loading"|"success"|"error") => {
    setToast({msg, type});
    if(type !== "loading") setTimeout(()=> setToast(null), 2500);
  };

  const handleFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith("video/")) {
        if (file.size > 10 * 1024 * 1024) { showToast("Vidéo max 10MB", "error"); return resolve(""); }
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
          resolve(c.toDataURL("image/jpeg", 0.65));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // VERSION FORMIDABLE - NON BLOQUANTE + CONFIRMATION
  const handlePublish = async () => {
    if(isPublishing) return;
    
    const current = getCurrentUser();
    if (!current || !cleanWhatsapp(current.whatsapp || current.ownerWhatsapp)) { 
      showToast("Crée ton compte d'abord", "error");
      setTimeout(()=> router.push("/inscription"), 800);
      return; 
    }
    const whatsappClean = cleanWhatsapp(current.ownerWhatsapp || current.whatsapp);
    if (whatsappClean.length < 9) { showToast("WhatsApp invalide +243...", "error"); return; }
    if (!abInfo.actif && !freemiumInfo.peutPublier) { router.push("/abonnement"); return; }
    if (!form.titre || !form.prix || !media) { showToast("Titre, prix et photo obligatoires", "error"); return; }
    if (!form.categorie) { showToast("Choisis une catégorie", "error"); return; }
    if (!form.activite) { showToast("Choisis ton métier", "error"); return; }

    const catIdNorm = normalizeCategorie(form.categorie);
    const catObj = getCategorieById(form.categorie) || getCategorieById(catIdNorm);
    const actObj = getActiviteById(catObj?.id || catIdNorm, form.activite);
    if(!catObj || !actObj){ showToast("Catégorie/métier invalide", "error"); return; }

    setIsPublishing(true);
    showToast("⏳ Publication en cours...", "loading");

    // Délai anti-freeze - laisse l'UI respirer
    await new Promise(r => setTimeout(r, 150));

    try {
      const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const prixNum = parseFloat(form.prix) || 0;
      
      const nouvelle: any = {
        id: Date.now().toString(),
        titre: form.titre.trim(),
        prix: prixNum,
        prixCDF: toCDF(prixNum),
        prixCDFString: toCDFString(prixNum),
        description: form.description || captionIA,
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
        taux: TAUX_CDF,
      };

      // Opération lourde en arrière-plan sans bloquer UI
      annonces.push(nouvelle);
      
      // Sauvegarde async pour éviter freeze
      setTimeout(() => {
        try {
          localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
          const miennes = annonces.filter((a:any) => cleanWhatsapp(a.ownerWhatsapp||a.whatsapp) === whatsappClean);
          localStorage.setItem("wenze_annonces_count", String(miennes.length));
          const fixedUser = {
            ...current,
            ownerWhatsapp: whatsappClean,
            whatsapp: whatsappClean,
            regime: "prestataire",
            estBoutique: true,
            categorieId: catObj.id,
            profession: actObj.label,
            activiteId: actObj.id,
            activiteLabel: actObj.label,
          };
          localStorage.setItem("wenze_user", JSON.stringify(fixedUser));
          const allRaw = localStorage.getItem("wenze_all_users");
          const allUsers = allRaw ? JSON.parse(allRaw) : [];
          const idx = allUsers.findIndex((x:any) => cleanWhatsapp(x.ownerWhatsapp || x.whatsapp) === whatsappClean);
          if (idx >= 0) allUsers[idx] = { ...allUsers[idx], ...fixedUser };
          else allUsers.push(fixedUser);
          localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
        } catch {}
      }, 0);

      showToast(`✅ Publié! ${form.titre} - ${toCDFString(prixNum)} - Boutique OK`, "success");
      
      setTimeout(() => {
        setIsPublishing(false);
        if (isFlash) router.push("/vente-flash");
        else router.push("/boutiques");
      }, 900);

    } catch (e) {
      showToast("❌ Erreur publication", "error");
      setIsPublishing(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-[430px] mx-auto p-5 bg-[#FFFBF0] min-h-screen">
        <div className="animate-pulse">Chargement... Taux {TAUX_CDF} </div>
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
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-28 relative">
      {/* TOAST FORMIDABLE NON BLOQUANT */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-full text-[11px] font-bold shadow-xl transition-all flex items-center gap-2
          ${toast.type==="loading"?"bg-black text-white": toast.type==="success"?"bg-[#6C3CE0] text-white":"bg-red-600 text-white"}`}>
          {toast.type==="loading" && <span className="animate-spin">⏳</span>}
          {toast.type==="success" && <span>✅</span>}
          {toast.type==="error" && <span>❌</span>}
          {toast.msg}
        </div>
      )}

      <Link href={backLink} className="text-xs text-[#6C3CE0] font-bold">← Retour - Taux {TAUX_CDF}</Link>
      <h1 className="text-xl font-black mt-2">Publier - {CATEGORIES_WENZE.length} métiers • Taux {TAUX_CDF}</h1>
      <p className="text-[11px] text-gray-500">Régime prestataire unique • Boutique fonctionnelle • Pro {FORMULES.pro.prix}$/{FORMULES.pro.prixCDF.toLocaleString()} CDF</p>
      
      <div className="p-2.5 rounded-xl mt-3 text-[10px] flex justify-between bg-black text-white">
        <span className="truncate">{user.nom} - {abInfo.actif ? abInfo.type : "Freemium"} {abInfo.actif?`• ${abInfo.expireDans}j`:''}</span>
        <span className={blocked?"text-red-400 font-bold":""}>{blocked ? "BLOQUÉ" : count + "/3"}</span>
      </div>

      {blocked ? (
        <div className="bg-white border p-6 rounded-2xl mt-4 text-center shadow-sm">
          <p className="font-bold text-[14px]">Limite atteinte • Taux {TAUX_CDF}</p>
          <p className="text-[11px] text-gray-500 mt-1">Passe Pro pour illimité • Régime unique soudeur+tout travaux même régime</p>
          <Link href="/abonnement" className="mt-4 block bg-[#6C3CE0] text-white p-4 rounded-full font-black text-[12px]">👑 Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF}</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre ex: Soudeur portail Gombe - qualité" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="w-full border-2 focus:border-[#6C3CE0] outline-none p-3.5 rounded-xl text-[13px] bg-white" />
          <div className="flex gap-2">
            <input placeholder="Prix USD ex: 15" type="number" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} className="flex-1 border-2 focus:border-[#6C3CE0] outline-none p-3.5 rounded-xl text-[13px] bg-white" />
            <div className="bg-black text-white border rounded-xl px-3 flex items-center text-[11px] font-black min-w-[110px] justify-center">{form.prix ? toCDF(parseFloat(form.prix)).toLocaleString() + " CDF" : toCDFString(0)}</div>
          </div>
          <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value, activite: "" })} className="w-full border-2 p-3.5 rounded-xl text-[13px] bg-white outline-none focus:border-[#6C3CE0]">
            <option value="">📁 Choisis Catégorie - 6 métiers</option>
            {CATEGORIES_WENZE.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.titre} - {c.activites.length} métiers</option>)}
          </select>
          <select value={form.activite} onChange={e => setForm({ ...form, activite: e.target.value })} className="w-full border-2 p-3.5 rounded-xl text-[13px] bg-white outline-none focus:border-[#6C3CE0]">
            <option value="">🔧 Choisis ton métier - Régime unique</option>
            {(catActive?.activites || []).map((a: any) => <option key={a.slug} value={a.slug}>{a.label} {a.slug==="soudeur"||a.slug==="tout-travaux-techniques"?"• Même régime Pro 5$":""}</option>)}
          </select>

          <div className="bg-white border-2 rounded-xl p-3 space-y-2">
            <p className="text-[11px] font-black">⚡ Options - Taux {TAUX_CDF} fixe - Flash+Boost sans incidence</p>
            <label className="flex justify-between items-center bg-red-50 border border-red-200 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition">
              <span className="text-[12px] font-bold">🔥 Flash -{flashRemise}% - 24h - Vente rapide</span>
              <input type="checkbox" checked={isFlash} onChange={e => setIsFlash(e.target.checked)} className="w-6 h-6 accent-red-600" />
            </label>
            {isFlash && (
              <select value={flashRemise} onChange={e => setFlashRemise(parseInt(e.target.value))} className="w-full border-2 p-3 rounded-xl text-[11px] bg-white font-bold">
                <option value={25}>-25% Remise</option><option value={30}>-30% Populaire</option><option value={40}>-40% Fort</option><option value={50}>-50% Choc</option><option value={60}>-60% Liquidation</option>
              </select>
            )}
            <label className={`flex justify-between items-center p-3 rounded-xl border-2 cursor-pointer active:scale-[0.98] transition ${isPayant?'bg-purple-50 border-purple-200':'bg-gray-50 border-gray-200 opacity-60'}`}>
              <span className="text-[12px] font-bold">🚀 Boost Top 5j - {FORMULES.boost.prix}$/{FORMULES.boost.prixCDF.toLocaleString()} CDF {isPayant?'• Inclus Pro':''}</span>
              <input type="checkbox" checked={isBoost} onChange={e => setIsBoost(e.target.checked)} disabled={!isPayant} className="w-6 h-6 accent-[#6C3CE0]" />
            </label>
            {isFlash && isBoost && <p className="text-[10px] bg-green-50 text-green-700 border border-green-200 p-2.5 rounded-xl font-bold">✅ Cumulé: Boost + Flash actif - Aucune incidence - Boutique fonctionnelle</p>}
            {!isPayant && <p className="text-[10px] text-gray-500">Boost réservé Pro {FORMULES.pro.prix}$/{FORMULES.pro.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF}</p>}
          </div>

          <div className="bg-white border-2 rounded-xl p-3">
            <input type="file" accept={isVideoMode ? "video/*" : "image/*,video/*"} onChange={async e => { const f = e.target.files?.[0]; if (f) { showToast("⏳ Compression image...", "loading"); const r = await handleFile(f); if (r) { setMedia(r); showToast("✅ Image prête - 800px 65%", "success"); } } }} className="w-full text-[11px] file:mr-3 file:bg-[#6C3CE0] file:text-white file:border-0 file:rounded-full file:px-4 file:py-2 file:text-[11px] file:font-bold" />
          </div>
          
          <div className="w-full aspect-[4/3] bg-white rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
            {media ? (typeMedia === "video" ? <video src={media} controls className="max-w-full max-h-full rounded-xl" /> : <img src={media} className="max-w-full max-h-full object-contain rounded-xl" alt="preview" />) : <div className="text-center"><span className="text-4xl">📸</span><p className="text-[10px] text-gray-400 mt-2">Photo compressée auto 800px • Léger • Rapide<br/>Taux {TAUX_CDF} • Régime unique</p></div>}
            {media && <button onClick={()=>setMedia("")} className="absolute top-2 right-2 bg-black/70 text-white w-8 h-8 rounded-full text-[12px]">✕</button>}
          </div>

          {isPayant && media && (
            <button onClick={async () => { setLoadingIA(true); showToast("🤖 IA analyse...", "loading"); const cap = await comprendreImageLocal(media); setCaptionIA(cap); setForm(f => ({...f, description: cap})); setLoadingIA(false); showToast("✅ Description IA générée", "success"); }} disabled={loadingIA} className="w-full bg-black text-white p-3.5 rounded-xl text-[12px] font-black disabled:opacity-50">{loadingIA ? "⏳ IA en cours... Taux 2300" : "🤖 Générer description IA - Boutique fonctionnelle"}</button>
          )}

          <textarea placeholder="Description détaillée - ex: Soudeur portail Gombe, tout travaux techniques disponibles, WhatsApp direct, taux 2300 CDF..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border-2 focus:border-[#6C3CE0] outline-none p-3.5 rounded-xl text-[12px] h-24 bg-white" />

          {actActive && <div className="bg-black text-white rounded-xl p-3 text-[11px] flex justify-between"><span>📍 Publier dans: <b>{catActive?.titre} - {actActive.label}</b></span><span className="font-black">{TAUX_CDF} CDF</span></div>}

          <button 
            onClick={handlePublish} 
            disabled={isPublishing}
            className={`w-full p-4 rounded-full font-black text-[13px] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2
              ${isPublishing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#6C3CE0] text-white hover:bg-[#5a32bd]'}`}>
            {isPublishing ? <><span className="animate-spin">⏳</span> Publication en cours... Taux {TAUX_CDF}</> : <>📢 Publier maintenant - {form.prix?toCDFString(parseFloat(form.prix)):toCDFString(0)} - Boutique OK</>}
          </button>
          
          <p className="text-[9px] text-center text-gray-400 leading-[12px]">Régime prestataire unique - Soudeur + Tout travaux même régime - Pro {FORMULES.pro.prix}$/{FORMULES.pro.prixCDF.toLocaleString()} CDF - Grossiste {FORMULES.grossiste.prix}$/{FORMULES.grossiste.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF} fixe - Boutique fonctionnelle garantie via wenze_all_users - Flash+Boost sans incidence</p>
        </div>
      )}
    </div>
  );
}

export default function PublierPage() {
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto p-10 text-center bg-[#FFFBF0] min-h-screen animate-pulse">Chargement publier... Taux {TAUX_CDF}</div>}>
      <PublierContent />
    </Suspense>
  );
}
export const dynamic = 'force-dynamic';
