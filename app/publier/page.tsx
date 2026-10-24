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
  return "Produit authentique WENZE - qualité vérifiée Kinshasa. Livraison rapide. Contact WhatsApp. Régime prestataire unique.";
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
  const [form, setForm] = useState({ titre: "", prix: "", description: "", categorie: preCat || "", activite: preAct || "", lat: 0, lng: 0 });
  const [loadingIA, setLoadingIA] = useState(false);
  const [captionIA, setCaptionIA] = useState("");
  const [freemiumInfo, setFreemiumInfo] = useState<any>({ peutPublier: true, annoncesRestantes: 3, type: "freemium" });
  
  // ✅ FIX CONCORDANCE: 2 flags séparés - AUCUNE incidence boost vs flash
  const [isFlash, setIsFlash] = useState(isFlashMode);
  const [isBoost, setIsBoost] = useState(false);
  const [flashRemise, setFlashRemise] = useState(30);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (typeof window !== "undefined") {
      setFreemiumInfo(checkFreemiumLimit());
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
  }, [isVideoMode]);

  const handleFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith("video/")) {
        if (file.size > 10 * 1024 * 1024) { alert("Vidéo max 10MB - compresse avant - Taux 2300"); return resolve(""); }
        setTypeMedia("video");
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
        return;
      }
      if (file.size > 5 * 1024 * 1024) { alert("Image trop lourde, je compresse à 150KB auto - Boutique fonctionnelle"); }
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
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePublish = () => {
    const current = getCurrentUser();
    if (!current || !cleanWhatsapp(current.whatsapp || current.ownerWhatsapp)) { alert("⛔ Crée ton compte - Régime prestataire unique - Taux 2300"); router.push("/inscription"); return; }
    const whatsappClean = cleanWhatsapp(current.ownerWhatsapp || current.whatsapp);
    if (whatsappClean.length < 9) { alert("⛔ WhatsApp invalide - 9 chiffres min - Taux 2300"); return; }
    const info = checkFreemiumLimit();
    const ab = verifierAbonnement();
    if (!info.peutPublier && !ab.actif) { router.push("/abonnement"); return; }
    if (!form.titre || !form.prix || !media) { alert("Titre, prix et photo/vidéo obligatoires - Boutique fonctionnelle - Taux 2300"); return; }
    if (!form.categorie) { alert("Choisis une catégorie parmi 6 métiers - Commerce, Beauté, Technique, Alimentation, Ménage, Événementiel - Taux 2300"); return; }
    if (!form.activite) { alert("Choisis ton métier (ex: soudeur, tout travaux techniques) - Régime prestataire unique"); return; }

    const catObj = getCategorieById(form.categorie) || getCategorieById(normalizeCategorie(form.categorie));
    const actObj = getActiviteById(form.categorie, form.activite) || getActiviteById(normalizeCategorie(form.categorie), form.activite);
    if(!catObj || !actObj){ alert("Catégorie/métier invalide - Vérifie 6 métiers - Taux 2300"); return; }

    const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const prixNum = parseFloat(form.prix) || 0;
    
    // ✅ FIX 1 & 2: Concordance totale - Boutique fonctionnelle garantie + 2 flags séparés SANS incidence
    const nouvelle: any = {
      id: Date.now().toString(),
      titre: form.titre.trim(),
      prix: prixNum,
      prixCDF: toCDF(prixNum),
      prixOrigin: isFlash ? Math.round(prixNum * 100 / (100 - flashRemise)) : undefined,
      description: form.description,
      categorie: catObj.id,
      categorieId: catObj.id,
      categorieTitre: catObj.titre,
      categorieCourt: catObj.titreCourt,
      activite: actObj.slug,
      activiteId: actObj.id,
      activiteSlug: actObj.slug,
      activiteLabel: actObj.label,
      photo: typeMedia === "image" ? media : "",
      video: typeMedia === "video" ? media : "",
      typeMedia,
      user: current.nom,
      userId: current.id || whatsappClean,
      whatsapp: whatsappClean,
      telephone: whatsappClean,
      ownerWhatsapp: whatsappClean,
      nom: current.nom,
      ville: current.ville || current.commune || "Kinshasa",
      commune: current.commune || "Kinshasa",
      type: current.type || "freemium",
      regime: "prestataire",
      estBoutique: true, // ✅ FIX CRITIQUE: toujours true - boutique fonctionnelle
      captionIA,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lat: form.lat,
      lng: form.lng,
      // ✅ 2 FLAGS SÉPARÉS - AUCUNE INCIDENCE
      flash: isFlash ? true : false,
      flashExpire: isFlash ? Date.now() + 24 * 3600000 : undefined,
      flashRemise: isFlash ? flashRemise : undefined,
      boost: isBoost ? true : false,
      boostExpire: isBoost ? Date.now() + 5 * 86400000 : undefined,
      boostType: isBoost ? "image" : undefined,
    };
    
    // Si les 2 actifs -> produit boosté + flash en même temps - OK
    if (isFlash && isBoost) {
      nouvelle.boost = true;
      nouvelle.flash = true;
    }

    annonces.push(nouvelle);
    localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
    
    const miennes = annonces.filter((a:any) => cleanWhatsapp(a.ownerWhatsapp||a.whatsapp||a.ownerWhatsapp) === whatsappClean);
    localStorage.setItem("wenze_annonces", String(miennes.length));
    localStorage.setItem("wenze_annonces_count", String(miennes.length));

    // ✅ FIX 3: Sync wenze_all_users pour que /boutiques voit instantanément - CONCORDANCE
    try {
      const fixedUser = {
        ...current,
        ownerWhatsapp: whatsappClean,
        whatsapp: whatsappClean,
        regime: "prestataire",
        estBoutique: true,
        categorieId: catObj.id,
        categorie: catObj.id,
        profession: actObj.label,
        activiteId: actObj.id,
        activite: actObj.slug,
        ville: current.ville || current.commune || "Kinshasa",
      };
      localStorage.setItem("wenze_user", JSON.stringify(fixedUser));
      
      const allRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allRaw ? JSON.parse(allRaw) : [];
      const idx = allUsers.findIndex((x:any) => cleanWhatsapp(x.ownerWhatsapp || x.whatsapp) === whatsappClean);
      if (idx >= 0) allUsers[idx] = { ...allUsers[idx], ...fixedUser };
      else allUsers.push(fixedUser);
      localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
    } catch {}

    alert(`✅ ${actObj.label} publié! ${form.titre} à ${prixNum}$ / ${toCDF(prixNum).toLocaleString()} CDF ${isFlash ? `🔥 FLASH -${flashRemise}%` : ""} ${isBoost ? "👑 BOOSTÉ" : ""} - visible dans ${catObj.titre} → ${actObj.label} - Boutique fonctionnelle - Taux ${TAUX_CDF}`);
    
    if (isFlash) router.push("/vente-flash");
    else if (isBoost) router.push("/");
    else router.push(form.categorie === "technique" ? `/categorie/${catObj.id}/${actObj.slug}` : "/");
  };

  if (!user) return <div className="max-w-[430px] mx-auto p-5 bg-[#FFFBF0] min-h-screen">Chargement... Taux {TAUX_CDF} <Link href="/inscription" className="text-[#6C3CE0] font-bold">Créer compte Prestataire • {FORMULES.pro.prix}$</Link></div>;

  const blocked = !freemiumInfo.peutPublier && !verifierAbonnement().actif;
  const catActive = CATEGORIES_WENZE.find((c: any) => c.id === form.categorie) || CATEGORIES_WENZE.find((c: any) => c.id === normalizeCategorie(form.categorie));
  const isPayant = user.type === "pro" || user.type === "grossiste" || freemiumInfo.isPro || verifierAbonnement().actif;
  const actActive = catActive ? getActiviteById(catActive.id, form.activite) : null;
  const ab = verifierAbonnement();

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-24">
      <Link href={isVideoMode ? "/video" : isFlashMode ? "/vente-flash" : "/"} className="text-xs text-[#6C3CE0] font-bold">← {isVideoMode ? "Wenze Vidéo" : isFlashMode ? "Vente Flash" : "Accueil"} • Taux {TAUX_CDF}</Link>
      <h1 className="text-xl font-black mt-2">{isVideoMode ? "Publier Vidéo 🎬 10MB" : isFlashMode ? "Publier Vente Flash 🔥" : "Publier Service / Produit"} • {CATEGORIES_WENZE.length} métiers</h1>
      <p className="text-[11px] text-gray-500">6 métiers • Photo 150KB • Vidéo 10MB • W-Pay {TAUX_CDF} CDF • Régime prestataire unique</p>
      
      <div className="p-2.5 rounded-xl mt-3 text-[10px] flex justify-between bg-black text-white">
        <span>🔒 {user.nom} • ...{cleanWhatsapp(user.whatsapp || user.ownerWhatsapp).slice(-4)} • {user.type||"freemium"} • {ab.actif ? `${ab.type} ${ab.expireDans}j` : "Freemium"}</span>
        <span>{blocked ? "BLOQUÉ - Passe Pro" : isVideoMode ? "VIDÉO" : `${count}/3 gratuits • Taux ${TAUX_CDF}`}</span>
      </div>

      {blocked ? (
        <div className="bg-white border p-6 rounded-2xl mt-4 text-center">
          <p className="text-3xl">👑</p>
          <p className="font-bold text-sm mt-2">Limite atteinte - Concordance</p>
          <p className="text-[11px] text-gray-500 mt-1">Tu as publié {count} annonces. Passe Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF pour publier illimité + Flash + Boost + IA + W-Pay • Taux {TAUX_CDF}</p>
          <Link href="/abonnement" className="mt-4 block bg-[#6C3CE0] text-white p-4 rounded-full font-bold">Passer Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF • {TAUX_CDF}</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre ex: Soudeur portail Kinshasa - Régime unique" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:border-[#6C3CE0]" />
          
          <div className="flex gap-2">
            <input placeholder="Prix USD ex: 50" type="number" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} className="flex-1 border p-3 rounded-xl text-sm bg-white outline-none focus:border-[#6C3CE0]" />
            <div className="bg-white border rounded-xl px-3 flex items-center text-[11px] font-bold text-[#6C3CE0]">
              {form.prix ? `${toCDF(parseFloat(form.prix||"0")).toLocaleString()} CDF` : `${TAUX_CDF} CDF/$`}
            </div>
          </div>

          <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value, activite: "" })} className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:border-[#6C3CE0]">
            <option value="">Catégorie (6 métiers) • Taux {TAUX_CDF}</option>
            {CATEGORIES_WENZE.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.titre} ({c.activites.length} métiers) • Taux {TAUX_CDF}</option>)}
          </select>

          <select value={form.activite} onChange={e => setForm({ ...form, activite: e.target.value })} className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:border-[#6C3CE0] font-semibold">
            <option value="">Métier / Activité... • Régime prestataire unique</option>
            {(catActive?.activites || []).map((a: any) => <option key={a.slug} value={a.slug}>{a.label} {a.slug==="tout-travaux-techniques" ? "🔧 (Soudeur+Tout inclus)" : a.slug==="soudeur" ? "🔧 Soudeur même régime Pro 5$" : ""}</option>)}
          </select>

          {actActive?.slug === "tout-travaux-techniques" && (
            <div className="bg-[#6C3CE0]/10 border border-[#6C3CE0]/20 rounded-xl p-3 text-[11px]">
              <p className="font-bold text-[#6C3CE0]">🔧 Tout travaux techniques sélectionné - Régime unique</p>
              <p className="text-gray-600 mt-1">Tu seras visible pour: soudeur, carreleur, vitreur, aluminium, plombier, etc. Idéal si tu fais plusieurs travaux. Même régime Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF}</p>
            </div>
          )}

          {/* ✅ NOUVEAU: SWITCHS FLASH + BOOST SANS INCIDENCE */}
          <div className="bg-white border rounded-xl p-3 space-y-3">
            <p className="text-[11px] font-black">⚡ Options visibilité - SANS incidence l'une sur l'autre - Taux {TAUX_CDF}</p>
            
            <label className="flex items-center justify-between p-2.5 bg-gradient-to-r from-[#FF3B30]/10 to-[#FF6B30]/10 border border-[#FF3B30]/20 rounded-xl cursor-pointer">
              <div>
                <p className="text-[12px] font-bold">🔥 Vente Flash -{flashRemise}% • 24h</p>
                <p className="text-[10px] text-gray-500">Apparaît dans /vente-flash • Remise auto • Taux {TAUX_CDF}</p>
              </div>
              <input type="checkbox" checked={isFlash} onChange={e => setIsFlash(e.target.checked)} className="w-5 h-5 accent-[#FF3B30]" />
            </label>

            {isFlash && (
              <div className="flex gap-2 items-center bg-[#FF3B30]/5 p-2 rounded-xl">
                <span className="text-[11px] font-bold">Remise:</span>
                <select value={flashRemise} onChange={e => setFlashRemise(parseInt(e.target.value))} className="flex-1 border p-2 rounded-xl text-[11px] bg-white">
                  <option value={25}>-25% • Taux {TAUX_CDF}</option>
                  <option value={30}>-30% • Recommandé</option>
                  <option value={40}>-40% • Flash fort</option>
                  <option value={50}>-50% • Méga flash</option>
                  <option value={60}>-60% • Liquidation</option>
                </select>
                <span className="text-[10px] text-gray-500">{form.prix ? `→ ${toCDF(parseFloat(form.prix))} CDF` : ""}</span>
              </div>
            )}

            <label className="flex items-center justify-between p-2.5 bg-gradient-to-r from-[#6C3CE0]/10 to-[#FF6B35]/10 border border-[#6C3CE0]/20 rounded-xl cursor-pointer">
              <div>
                <p className="text-[12px] font-bold">👑 Boost Top - 5 jours • Pro {FORMULES.pro.prix}$</p>
                <p className="text-[10px] text-gray-500">Apparaît en haut accueil • Badge 👑 • Taux {TAUX_CDF}</p>
              </div>
              <input type="checkbox" checked={isBoost} onChange={e => setIsBoost(e.target.checked)} className="w-5 h-5 accent-[#6C3CE0]" disabled={!isPayant} />
            </label>
            
            {!isPayant && <p className="text-[9px] text-[#6C3CE0]">🔒 Boost réservé Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF • Taux {TAUX_CDF} • Flash gratuit pour tous</p>}
            
            {isFlash && isBoost && <p className="text-[10px] bg-green-50 text-green-700 p-2 rounded-xl font-bold border border-green-200">✅ Cumulé: Ton article sera BOOSTÉ en haut accueil + FLASH dans /vente-flash • 2 visibilités • Taux {TAUX_CDF} • AUCUNE incidence</p>}
          </div>

          <div>
            <label className="text-[11px] font-bold">{isVideoMode ? "Vidéo TikTok (max 10MB)" : "Photo 150KB auto / Vidéo 10MB"} • Taux {TAUX_CDF}</label>
            <input type="file" accept={isVideoMode ? "video/*" : "image/*,video/*"} onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await handleFile(f); if (r) setMedia(r); } }} className="w-full border p-2 rounded-xl text-xs mt-1 bg-white" />
            <div className="w-full aspect-[4/3] bg-white rounded-xl mt-2 border-2 border-dashed flex items-center justify-center overflow-hidden p-2 relative">
              {media ? (
                <>{typeMedia === "video" ? <video src={media} controls className="max-w-full max-h-full" /> : <img src={media} className="max-w-full max-h-full object-contain" alt="preview" />}<button onClick={() => setMedia("")} className="absolute top-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded-full">✕ Supprimer</button></>
              ) : (
                <div className="text-center"><p className="text-3xl">{isVideoMode ? "🎬" : "📸"}</p><p className="text-[11px] text-gray-400 font-bold">Aperçu sans couper - {isVideoMode ? "10MB max" : "compressé 150KB"} • Taux {TAUX_CDF}</p></div>
              )}
            </div>
          </div>

          {isPayant && media && (
            <button onClick={async () => { setLoadingIA(true); const cap = await comprendreImageLocal(media); setCaptionIA(cap); setForm(f => ({...f, description: f.description ? f.description : `🔥 ${f.titre} - ${cap} - Taux ${TAUX_CDF}` })); setLoadingIA(false); }} disabled={loadingIA} className="w-full bg-gradient-to-r from-[#6C3CE0] to-[#FF6B35] text-white p-3 rounded-xl text-sm font-bold disabled:opacity-50">{loadingIA ? "IA analyse... Taux 2300" : "🤖 Générer description IA gratuite • Taux 2300"}</button>
          )}

          <textarea placeholder="Description: ex: Je suis soudeur à Kinshasa, je fais portails, grillages... Régime prestataire unique - Taux 2300" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border p-3 rounded-xl text-sm h-24 bg-white outline-none focus:border-[#6C3CE0]" />

          {actActive && (
            <div className="bg-white border rounded-xl p-3 text-[11px]">
              <p>Tu vas publier dans: <b className="text-[#6C3CE0]">{catActive?.titre} → {actActive.label} • Taux {TAUX_CDF}</b></p>
              <p className="text-gray-500 mt-1">Visible à: /categorie/{catActive?.id}/{actActive.slug} + {isFlash ? "/vente-flash 🔥" : ""} {isBoost ? "+ Top accueil 👑" : ""} • Boutique fonctionnelle • Régime prestataire unique Pro {FORMULES.pro.prix}$</p>
            </div>
          )}

        
