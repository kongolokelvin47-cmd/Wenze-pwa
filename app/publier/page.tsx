"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, getPrixByCategorie, normalizeCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString, checkFreemiumLimit, verifierAbonnement, FORMULES } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

function cleanWhatsapp(n: string) { return (n || "").toString().replace(/[^0-9]/g, ""); }
function getCurrentUser() {
  try { const raw = localStorage.getItem("wenze_user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function comprendreImageLocal(media: string) {
  if (!media) return "Produit WENZE Kinshasa";
  return `Produit authentique WENZE - qualité vérifiée Kinshasa - Taux ${TAUX_CDF} CDF fixe`;
}

function PublierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVideoMode = searchParams.get("boost") === "video";
  const preCat = normalizeCategorie(searchParams.get("categorie") || "");

  const [user, setUser] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [media, setMedia] = useState("");
  const [typeMedia, setTypeMedia] = useState<"image" | "video">("image");
  const [form, setForm] = useState({ titre: "", prix: "", description: "", categorie: preCat, lat: 0, lng: 0 });
  const [freemiumInfo, setFreemiumInfo] = useState<any>({ peutPublier: true, annoncesRestantes: 3, isPro: false });
  const [abInfo, setAbInfo] = useState<any>({ actif: false, type: "freemium", expireDans: 0 });
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [isFlash, setIsFlash] = useState(false);
  const [isBoost, setIsBoost] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (typeof window !== "undefined") {
      setFreemiumInfo(checkFreemiumLimit());
      setAbInfo(verifierAbonnement());
      try {
        const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
        const myWa = u ? cleanWhatsapp(u.ownerWhatsapp || u.whatsapp) : "";
        setCount(list.filter((x:any)=> cleanWhatsapp(x.ownerWhatsapp||x.whatsapp)===myWa).length);
      } catch {}
    }
    if (isVideoMode) setTypeMedia("video");
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p)=> setForm(f=> ({...f, lat: p.coords.latitude, lng: p.coords.longitude})), ()=>{});
    }
  }, [isVideoMode]);

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    if (type !== "loading") setTimeout(() => setToast(null), 2500);
  }

  function handleFile(file: File): Promise<string> {
    return new Promise((resolve) => {
      if (file.type.startsWith("video/")) {
        if (file.size > 10 * 1024 * 1024) { showToast("Vidéo max 10MB", "error"); return resolve(""); }
        setTypeMedia("video");
        const r = new FileReader(); r.onload = e => resolve((e.target?.result as string)||""); r.readAsDataURL(file); return;
      }
      setTypeMedia("image");
      const r = new FileReader();
      r.onload = e => {
        const img = new window.Image();
        img.onload = () => {
          const c = document.createElement("canvas"); const MAX=800; let w=img.width,h=img.height;
          if (w>h){ if(w>MAX){ h=Math.round(h*MAX/w); w=MAX; } } else { if(h>MAX){ w=Math.round(w*MAX/h); h=MAX; } }
          c.width=w; c.height=h; const ctx=c.getContext("2d"); if(ctx) ctx.drawImage(img,0,0,w,h);
          resolve(c.toDataURL("image/jpeg",0.65));
        }; img.src=(e.target?.result as string)||"";
      }; r.readAsDataURL(file);
    });
  }

  async function handlePublish() {
    if (isPublishing) return;
    const current = getCurrentUser();
    if (!current || !cleanWhatsapp(current.whatsapp || current.ownerWhatsapp)) {
      showToast("Crée ton compte d'abord", "error"); setTimeout(()=> router.push("/inscription"), 800); return;
    }
    const whatsappClean = cleanWhatsapp(current.ownerWhatsapp || current.whatsapp);
    if (!abInfo.actif && !freemiumInfo.peutPublier) { router.push("/abonnement"); return; }
    if (!form.titre || !form.prix || !media) { showToast("Titre, prix et photo obligatoires", "error"); return; }
    if (!form.categorie) { showToast("Choisis une catégorie", "error"); return; }

    const catObj = getCategorieById(form.categorie);
    const prixInfo = getPrixByCategorie(catObj.id);

    setIsPublishing(true);
    showToast("Publication en cours...", "loading");
    await new Promise(r=> setTimeout(r, 150));

    try {
      const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const prixNum = parseFloat(form.prix) || 0;
      const nouvelle: any = {
        id: Date.now().toString(),
        titre: form.titre.trim(), prix: prixNum, prixCDF: toCDF(prixNum), prixCDFString: toCDFString(prixNum),
        description: form.description,
        categorie: catObj.id, categorieId: catObj.id, categorieTitre: catObj.titre, categorieIcon: catObj.icon,
        activite: catObj.activites[0].slug, activiteId: catObj.activites[0].id, activiteSlug: catObj.activites[0].slug, activiteLabel: catObj.activites[0].label,
        photo: typeMedia==="image"?media:"", video: typeMedia==="video"?media:"", typeMedia,
        user: current.nom, whatsapp: whatsappClean, ownerWhatsapp: whatsappClean, nom: current.nom,
        ville: current.ville||"Kinshasa", type: current.type||"freemium",
        regime: catObj.regime, prixFormule: prixInfo.prixUSD, estBoutique: true,
        date: new Date().toISOString(), createdAt: new Date().toISOString(),
        lat: form.lat, lng: form.lng, flash: isFlash, boost: isBoost, taux: TAUX_CDF,
      };
      annonces.push(nouvelle);

      setTimeout(()=> {
        try {
          localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
          localStorage.setItem("wenze_annonces_count", String(annonces.filter((a:any)=> cleanWhatsapp(a.ownerWhatsapp||a.whatsapp)===whatsappClean).length));
          const fixedUser = {...current, ownerWhatsapp: whatsappClean, whatsapp: whatsappClean, regime: catObj.regime, estBoutique: true, categorieId: catObj.id, prixFormule: prixInfo.prixUSD };
          localStorage.setItem("wenze_user", JSON.stringify(fixedUser));
          const allRaw = localStorage.getItem("wenze_all_users"); const allUsers = allRaw?JSON.parse(allRaw):[];
          const idx = allUsers.findIndex((j:any)=> cleanWhatsapp(j.ownerWhatsapp||j.whatsapp)===whatsappClean);
          if(idx>=0) allUsers[idx]={...allUsers[idx], ...fixedUser}; else allUsers.push(fixedUser);
          localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
          window.dispatchEvent(new Event("storage"));
        } catch {}
      }, 0);

      showToast(`✅ ${form.titre} - ${toCDFString(prixNum)} - ${catObj.titreCourt} ${prixInfo.prixUSD}$`, "success");
      setTimeout(()=> { setIsPublishing(false); router.push("/"); }, 900);
    } catch { showToast("Erreur publication","error"); setIsPublishing(false); }
  }

  const catActive = useMemo(()=> getCategorieById(form.categorie), [form.categorie]);
  const prixActif = useMemo(()=> catActive ? getPrixByCategorie(catActive.id) : null, [catActive]);

  if (!user) return <div className="max-w-[430px] mx-auto p-5 bg-[#FFFBF0] min-h-screen"><div className="animate-pulse">Chargement... Taux {TAUX_CDF}</div><Link href="/inscription" className="text-[#6C3CE0] font-bold ml-2">Créer compte</Link></div>;

  const blocked = !freemiumInfo.peutPublier && !abInfo.actif;
  const isPayant = freemiumInfo.isPro || abInfo.actif;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-28 relative">
      {toast && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-full text-[11px] font-bold shadow-xl ${toast.type==="loading"?"bg-black text-white":toast.type==="success"?"bg-[#6C3CE0] text-white":"bg-red-600 text-white"}`}>{toast.msg}</div>}

      <Link href="/" className="text-xs text-[#6C3CE0] font-bold">← Accueil - Taux {TAUX_CDF}</Link>
      <h1 className="text-xl font-black mt-2">Publier - WENZE 2.0 • 2 catégories</h1>
      <p className="text-[11px] text-gray-500">🛍️ Petites activités 5$ • 🏭 Gros & autres 10$ • Taux {TAUX_CDF} fixe</p>

      <div className="p-2.5 rounded-xl mt-3 text-[10px] flex justify-between bg-black text-white">
        <span>{user.nom} - {abInfo.actif?abInfo.type:"Freemium"}</span><span className={blocked?"text-red-400 font-bold":""}>{blocked?"BLOQUE":count+"/3"}</span>
      </div>

      {blocked ? (
        <div className="bg-white border p-6 rounded-2xl mt-4 text-center">
          <p className="font-bold text-[14px]">Limite atteinte • Taux {TAUX_CDF}</p>
          <Link href="/abonnement" className="mt-4 block bg-[#6C3CE0] text-white p-4 rounded-full font-black text-[12px]">👑 Passer Pro - 5$ / 10$</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre ex: Vente Sacs Gombe" value={form.titre} onChange={e=> setForm({...form, titre: e.target.value})} className="w-full border-2 p-3.5 rounded-xl text-[13px] bg-white outline-none focus:border-[#6C3CE0]" />
          <div className="flex gap-2">
            <input placeholder="Prix USD ex: 15" type="number" value={form.prix} onChange={e=> setForm({...form, prix: e.target.value})} className="flex-1 border-2 p-3.5 rounded-xl text-[13px] bg-white" />
            <div className="bg-black text-white border rounded-xl px-3 flex items-center text-[11px] font-black min-w-[110px] justify-center">{form.prix?toCDF(parseFloat(form.prix)).toLocaleString()+" CDF":toCDFString(0)}</div>
          </div>

          {/* ✅ 2 CATEGORIES MODERNES - PLUS DE SOUS METIER VISIBLE */}
          <div className="space-y-2">
            <p className="text-[11px] font-black">📁 Choisis ta catégorie - Boutique directe</p>
            <div className="grid grid-cols-1 gap-2.5">
              {CATEGORIES_WENZE.map((c:any)=> (
                <button key={c.id} type="button" onClick={()=> setForm({...form, categorie: c.id})}
                  className={`p-4 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${form.categorie===c.id ? "border-black bg-black text-white shadow-lg scale-[1.02]" : "border-gray-200 bg-white hover:border-black"}`}>
                  <div>
                    <div className="font-black text-[13px]">{c.icon} {c.titre}</div>
                    <div className={`text-[10px] mt-0.5 ${form.categorie===c.id?"text-white/70":"text-gray-500"}`}>{c.description}</div>
                  </div>
                  <div className={`ml-3 px-3 py-1 rounded-full font-black text-[12px] ${form.categorie===c.id?"bg-white text-black":"bg-black text-white"}`}>{c.prixUSD}$</div>
                </button>
              ))}
            </div>
          </div>

          {/* OPTIONS */}
          <div className="bg-white border-2 rounded-xl p-3 space-y-2">
            <label className="flex justify-between items-center bg-red-50 border p-3 rounded-xl cursor-pointer">
              <span className="text-[12px] font-bold">🔥 Flash 24h</span><input type="checkbox" checked={isFlash} onChange={e=> setIsFlash(e.target.checked)} className="w-5 h-5" />
            </label>
            <label className={`flex justify-between items-center p-3 rounded-xl border-2 ${isPayant?"bg-purple-50 border-purple-200":"bg-gray-50 opacity-60"}`}>
              <span className="text-[12px] font-bold">🚀 Boost Top 5j {isPayant?"• Inclus":""}</span><input type="checkbox" checked={isBoost} onChange={e=> setIsBoost(e.target.checked)} disabled={!isPayant} className="w-5 h-5" />
            </label>
          </div>

          <div className="bg-white border-2 rounded-xl p-3">
            <input type="file" accept={isVideoMode?"video/*":"image/*,video/*"} onChange={async e=>{ const f=e.target.files?.[0]; if(f){ showToast("Compression...","loading"); const r=await handleFile(f); if(r){ setMedia(r); showToast("Image prête","success"); } } }} className="w-full text-[11px] file:mr-3 file:bg-[#6C3CE0] file:text-white file:border-0 file:rounded-full file:px-4 file:py-2 file:font-bold" />
          </div>

          <div className="w-full aspect-[4/3] bg-white rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden relative">
            {media ? (typeMedia==="video"?<video src={media} controls className="max-w-full max-h-full"/>:<img src={media} className="max-w-full max-h-full object-contain" alt="preview"/>) : <div className="text-center"><span className="text-4xl">📸</span><p className="text-[10px] text-gray-400 mt-2">Photo 800px • Taux {TAUX_CDF}</p></div>}
            {media && <button onClick={()=> setMedia("")} className="absolute top-2 right-2 bg-black/70 text-white w-8 h-8 rounded-full">✕</button>}
          </div>

          <textarea placeholder="Description..." value={form.description} onChange={e=> setForm({...form, description: e.target.value})} className="w-full border-2 p-3.5 rounded-xl text-[12px] h-20 bg-white" />

          {catActive && prixActif && <div className="bg-black text-white rounded-xl p-3 text-[11px] flex justify-between"><span>{catActive.icon} {catActive.titre} • {catActive.activites[0].label}</span><span className="font-black">{prixActif.prixUSD}$ / {prixActif.prixCDF.toLocaleString()} CDF</span></div>}

          <button onClick={handlePublish} disabled={isPublishing} className={`w-full p-4 rounded-full font-black text-[13px] shadow-lg ${isPublishing?"bg-gray-300 text-gray-500":"bg-[#6C3CE0] text-white"}`}>
            {isPublishing?"⏳ Publication...":`📢 Publier - ${form.prix?toCDFString(parseFloat(form.prix)):toCDFString(0)} - ${prixActif?prixActif.prixUSD+"$":""}`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function PublierPage() {
  return <Suspense fallback={<div className="max-w-[430px] mx-auto p-10 text-center bg-[#FFFBF0] min-h-screen">Chargement WENZE 2.0... Taux {TAUX_CDF}</div>}><PublierContent/></Suspense>;
                                                         }
