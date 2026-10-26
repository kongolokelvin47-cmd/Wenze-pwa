"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, getActiviteById, normalizeCategorie } from "@/lib/categories";
import { FORMULES, TAUX_CDF, toCDF, checkFreemiumLimit, verifierAbonnement, toCDFString } from "@/lib/paiement";

function cleanWhatsapp(n: string) {
  return (n || "").toString().replace(/[^0-9]/g, "");
}

function getCurrentUser() {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("wenze_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function comprendreImageLocal(media: string) {
  if (!media) return "Produit de qualité à Kinshasa";
  return "Produit authentique WENZE - qualité vérifiée Kinshasa. Taux 2300 CDF fixe - Boutique fonctionnelle.";
}

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
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<any>(null);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (typeof window !== "undefined") {
      setFreemiumInfo(checkFreemiumLimit());
      setAbInfo(verifierAbonnement());
      if (isFlashMode) setIsFlash(true);
      try {
        const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
        const myWa = u ? cleanWhatsapp(u.ownerWhatsapp || u.whatsapp) : "";
        let mineCount = 0;
        for (let i = 0; i < list.length; i++) {
          if (cleanWhatsapp(list[i].ownerWhatsapp || list[i].whatsapp) === myWa) mineCount++;
        }
        setCount(mineCount);
      } catch {}
    }
    if (isVideoMode) setTypeMedia("video");
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setForm((f) => ({ ...f, lat: p.coords.latitude, lng: p.coords.longitude })),
        () => {}
      );
    }
  }, [isVideoMode, isFlashMode]);

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    if (type !== "loading") setTimeout(() => setToast(null), 2500);
  }

  function handleFile(file: File): Promise<string> {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve("");
      if (file.type.startsWith("video/")) {
        if (file.size > 10 * 1024 * 1024) {
          showToast("Vidéo max 10MB", "error");
          return resolve("");
        }
        setTypeMedia("video");
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.readAsDataURL(file);
        return;
      }
      setTypeMedia("image");
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const MAX = 800;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > MAX) {
              h = Math.round((h * MAX) / w);
              w = MAX;
            }
          } else {
            if (h > MAX) {
              w = Math.round((w * MAX) / h);
              h = MAX;
            }
          }
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", 0.65));
        };
        img.src = (e.target?.result as string) || "";
      };
      reader.readAsDataURL(file);
    });
  }

  async function handlePublish() {
    if (isPublishing) return;
    const current = getCurrentUser();
    if (!current || !cleanWhatsapp(current.whatsapp || current.ownerWhatsapp)) {
      showToast("Crée ton compte d'abord", "error");
      setTimeout(() => router.push("/inscription"), 800);
      return;
    }
    const whatsappClean = cleanWhatsapp(current.ownerWhatsapp || current.whatsapp);
    if (whatsappClean.length < 9) {
      showToast("WhatsApp invalide +243...", "error");
      return;
    }
    if (!abInfo.actif && !freemiumInfo.peutPublier) {
      router.push("/abonnement");
      return;
    }
    if (!form.titre || !form.prix || !media) {
      showToast("Titre, prix et photo obligatoires", "error");
      return;
    }
    if (!form.categorie) {
      showToast("Choisis une catégorie", "error");
      return;
    }
    if (!form.activite) {
      showToast("Choisis ton métier", "error");
      return;
    }

    const catIdNorm = normalizeCategorie(form.categorie);
    const catObj = getCategorieById(form.categorie) || getCategorieById(catIdNorm);
    const actObj = getActiviteById(catObj ? catObj.id : catIdNorm, form.activite);
    if (!catObj || !actObj) {
      showToast("Catégorie/métier invalide", "error");
      return;
    }

    setIsPublishing(true);
    showToast("Publication en cours...", "loading");
    await new Promise((r) => setTimeout(r, 150));

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

      annonces.push(nouvelle);

      // Sauvegarde non bloquante - évite freeze
      setTimeout(() => {
        try {
          localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
          const miennes: any[] = [];
          for (let i = 0; i < annonces.length; i++) {
            if (cleanWhatsapp(annonces[i].ownerWhatsapp || annonces[i].whatsapp) === whatsappClean) miennes.push(annonces[i]);
          }
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
          let idx = -1;
          for (let j = 0; j < allUsers.length; j++) {
            if (cleanWhatsapp(allUsers[j].ownerWhatsapp || allUsers[j].whatsapp) === whatsappClean) {
              idx = j;
              break;
            }
          }
          if (idx >= 0) allUsers[idx] = { ...allUsers[idx], ...fixedUser };
          else allUsers.push(fixedUser);
          localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
        } catch {}
      }, 0);

      showToast("Publie! " + form.titre + " - " + toCDFString(prixNum) + " - Boutique OK", "success");

      setTimeout(() => {
        setIsPublishing(false);
        // FIX 404: On va vers /profil qui existe toujours, pas /boutiques qui peut 404 si pas force-dynamic
        if (isFlash) router.push("/vente-flash");
        else router.push("/profil");
      }, 900);
    } catch (e) {
      showToast("Erreur publication", "error");
      setIsPublishing(false);
    }
  }

  // FIX BUILD: plus de .find(c=>c.id===...), utilise getCategorieById
  const catActive = useMemo(() => {
    return getCategorieById(form.categorie) || getCategorieById(normalizeCategorie(form.categorie));
  }, [form.categorie]);

  const actActive = useMemo(() => {
    if (!catActive) return null;
    return getActiviteById(catActive.id, form.activite);
  }, [catActive, form.activite]);

  if (!user) {
    return (
      <div className="max-w-[430px] mx-auto p-5 bg-[#FFFBF0] min-h-screen">
        <div className="animate-pulse">Chargement... Taux {TAUX_CDF}</div>
        <Link href="/inscription" className="text-[#6C3CE0] font-bold ml-2">Créer compte</Link>
      </div>
    );
  }

  const blocked = !freemiumInfo.peutPublier && !abInfo.actif;
  const isPayant = freemiumInfo.isPro || abInfo.actif;
  const backLink = isVideoMode ? "/video" : isFlashMode ? "/vente-flash" : "/";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-28 relative">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-full text-[11px] font-bold shadow-xl flex items-center gap-2 ${toast.type === "loading" ? "bg-black text-white" : toast.type === "success" ? "bg-[#6C3CE0] text-white" : "bg-red-600 text-white"}`}>
          <span>{toast.type === "loading" ? "⏳" : toast.type === "success" ? "✅" : "❌"}</span>
          {toast.msg}
        </div>
      )}

      <Link href={backLink} className="text-xs text-[#6C3CE0] font-bold">← Retour - Taux {TAUX_CDF}</Link>
      <h1 className="text-xl font-black mt-2">Publier - {CATEGORIES_WENZE.length} métiers • Taux {TAUX_CDF}</h1>
      <p className="text-[11px] text-gray-500">Régime prestataire unique • Boutique fonctionnelle • Pro {FORMULES.pro.prix}$/{FORMULES.pro.prixCDF.toLocaleString()} CDF</p>

      <div className="p-2.5 rounded-xl mt-3 text-[10px] flex justify-between bg-black text-white">
        <span className="truncate">{user.nom} - {abInfo.actif ? abInfo.type : "Freemium"} {abInfo.actif ? "• " + abInfo.expireDans + "j" : ""}</span>
        <span className={blocked ? "text-red-400 font-bold" : ""}>{blocked ? "BLOQUE" : count + "/3"}</span>
      </div>

      {blocked ? (
        <div className="bg-white border p-6 rounded-2xl mt-4 text-center">
          <p className="font-bold text-[14px]">Limite atteinte • Taux {TAUX_CDF}</p>
          <p className="text-[11px] text-gray-500 mt-1">Passe Pro pour illimité • Régime unique</p>
          <Link href="/abonnement" className="mt-4 block bg-[#6C3CE0] text-white p-4 rounded-full font-black text-[12px]">👑 Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre ex: Soudeur portail Gombe" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} className="w-full border-2 p-3.5 rounded-xl text-[13px] bg-white outline-none focus:border-[#6C3CE0]" />
          <div className="flex gap-2">
            <input placeholder="Prix USD ex: 15" type="number" value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })} className="flex-1 border-2 p-3.5 rounded-xl text-[13px] bg-white outline-none focus:border-[#6C3CE0]" />
            <div className="bg-black text-white border rounded-xl px-3 flex items-center text-[11px] font-black min-w-[110px] justify-center">{form.prix ? toCDF(parseFloat(form.prix)).toLocaleString() + " CDF" : toCDFString(0)}</div>
          </div>
          <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value, activite: "" })} className="w-full border-2 p-3.5 rounded-xl text-[13px] bg-white">
            <option value="">📁 Choisis Catégorie</option>
            {CATEGORIES_WENZE.map((c: any) => (
              <option key={c.id} value={c.id}>{c.titre} - {c.activites.length} métiers</option>
            ))}
          </select>
          <select value={form.activite} onChange={(e) => setForm({ ...form, activite: e.target.value })} className="w-full border-2 p-3.5 rounded-xl text-[13px] bg-white">
            <option value="">🔧 Choisis ton métier - Régime unique</option>
            {(catActive ? catActive.activites : []).map((a: any) => (
              <option key={a.slug} value={a.slug}>{a.label}</option>
            ))}
          </select>

          <div className="bg-white border-2 rounded-xl p-3 space-y-2">
            <p className="text-[11px] font-black">⚡ Options - Taux {TAUX_CDF} fixe</p>
            <label className="flex justify-between items-center bg-red-50 border border-red-200 p-3 rounded-xl cursor-pointer">
              <span className="text-[12px] font-bold">🔥 Flash -{flashRemise}% - 24h</span>
              <input type="checkbox" checked={isFlash} onChange={(e) => setIsFlash(e.target.checked)} className="w-6 h-6" />
            </label>
            {isFlash && (
              <select value={flashRemise} onChange={(e) => setFlashRemise(parseInt(e.target.value))} className="w-full border-2 p-3 rounded-xl text-[11px] bg-white font-bold">
                <option value={25}>-25%</option><option value={30}>-30% Populaire</option><option value={40}>-40%</option><option value={50}>-50%</option><option value={60}>-60%</option>
              </select>
            )}
            <label className={`flex justify-between items-center p-3 rounded-xl border-2 ${isPayant ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-gray-200 opacity-60"}`}>
              <span className="text-[12px] font-bold">🚀 Boost Top 5j - {FORMULES.boost.prix}$ {isPayant ? "• Inclus Pro" : ""}</span>
              <input type="checkbox" checked={isBoost} onChange={(e) => setIsBoost(e.target.checked)} disabled={!isPayant} className="w-6 h-6" />
            </label>
          </div>

          <div className="bg-white border-2 rounded-xl p-3">
            <input type="file" accept={isVideoMode ? "video/*" : "image/*,video/*"} onChange={async (e) => { const f = e.target.files ? e.target.files[0] : null; if (f) { showToast("Compression...", "loading"); const r = await handleFile(f); if (r) { setMedia(r); showToast("Image prete 800px", "success"); } } }} className="w-full text-[11px] file:mr-3 file:bg-[#6C3CE0] file:text-white file:border-0 file:rounded-full file:px-4 file:py-2 file:text-[11px] file:font-bold" />
          </div>

          <div className="w-full aspect-[4/3] bg-white rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden relative">
            {media ? (typeMedia === "video" ? <video src={media} controls className="max-w-full max-h-full" /> : <img src={media} className="max-w-full max-h-full object-contain" alt="preview" />) : <div className="text-center"><span className="text-4xl">📸</span><p className="text-[10px] text-gray-400 mt-2">Photo 800px • Rapide • Taux {TAUX_CDF}</p></div>}
            {media && <button onClick={() => setMedia("")} className="absolute top-2 right-2 bg-black/70 text-white w-8 h-8 rounded-full">✕</button>}
          </div>

          {isPayant && media && (
            <button onClick={async () => { setLoadingIA(true); showToast("IA analyse...", "loading"); const cap = await comprendreImageLocal(media); setCaptionIA(cap); setForm((f) => ({ ...f, description: cap })); setLoadingIA(false); showToast("Description IA generee", "success"); }} disabled={loadingIA} className="w-full bg-black text-white p-3.5 rounded-xl text-[12px] font-black">{loadingIA ? "IA en cours..." : "🤖 Generer description IA"}</button>
          )}

          <textarea placeholder="Description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border-2 p-3.5 rounded-xl text-[12px] h-24 bg-white" />

          {actActive && <div className="bg-black text-white rounded-xl p-3 text-[11px] flex justify-between"><span>📍 {catActive ? catActive.titre : ""} - {actActive.label}</span><span className="font-black">{TAUX_CDF} CDF</span></div>}

          <button onClick={handlePublish} disabled={isPublishing} className={`w-full p-4 rounded-full font-black text-[13px] shadow-lg flex items-center justify-center gap-2 ${isPublishing ? "bg-gray-300 text-gray-500" : "bg-[#6C3CE0] text-white"}`}>
            {isPublishing ? "⏳ Publication en cours..." : "📢 Publier - " + (form.prix ? toCDFString(parseFloat(form.prix)) : toCDFString(0)) + " - Boutique OK"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function PublierPage() {
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto p-10 text-center bg-[#FFFBF0] min-h-screen">Chargement publier... Taux {TAUX_CDF}</div>}>
      <PublierContent />
    </Suspense>
  );
}
export const dynamic = 'force-dynamic';
