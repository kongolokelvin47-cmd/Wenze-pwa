"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, getPrixByCategorie, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString, verifierAbonnement } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

function cleanWhatsapp(n: string) { return (n || "").toString().replace(/[^0-9]/g, ""); }
function getCurrentUser() {
  try { const raw = localStorage.getItem("wenze_user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function PublierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catFromUrl = normalizeCategorie(searchParams.get("cat") || searchParams.get("categorie") || "");
  const modeFromUrl = searchParams.get("mode");

  const [user, setUser] = useState<any>(null);
  const [ab, setAb] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isVideo, setIsVideo] = useState(false);

  const [form, setForm] = useState({
    titre: "", description: "", prix: "", categorieId: "commerces-services",
    activiteId: "", commune: "", ville: "Kinshasa", stock: "1",
    livraison: "Retrait sur place / Livraison Kinshasa",
  });

  useEffect(() => {
    const u = getCurrentUser();
    if(!u){ router.push("/connexion?next=/publier"); return; }
    const fixedCat = normalizeCategorie(catFromUrl || u.categorieId || u.categorie || "commerces-services");
    const catObj = getCategorieById(fixedCat);
    const fullUser = { ...u, categorieId: fixedCat, catObj, prixUSD: catObj ? getPrixByCategorie(catObj.id).prixUSD : 5, prixCDF: catObj ? getPrixByCategorie(catObj.id).prixCDF : 11500 };
    setUser(fullUser);
    setForm(f=> ({ ...f, categorieId: fixedCat, activiteId: u.activiteId || catObj?.activites[0]?.id || "", commune: u.commune || f.commune, ville: u.ville || "Kinshasa" }));
    try {
      const v = verifierAbonnement();
      setAb(v);
      if(v.needsPay){
        setToast({ msg: `🆓 Freemium ${v.count}/3 à vie atteint (images only) - Paye ${fullUser.prixUSD}$ / ${fullUser.prixCDF.toLocaleString()} CDF ou booster 1$`, type:"error" });
        setTimeout(()=> router.push(`/abonnement?cat=${fixedCat}`), 1800);
      } else if(v.isEssai7j){
        setToast({ msg: `⏳ Essai gratuit ${v.joursRestants}j - Illimité images only - Publie max!`, type:"success" });
        setTimeout(()=> setToast(null), 4000);
      }
    } catch {}
    setLoadingUser(false);
  }, [router, catFromUrl]);

  const currentCat = useMemo(()=> getCategorieById(form.categorieId), [form.categorieId]);
  const prixInfo = useMemo(()=> getPrixByCategorie(form.categorieId), [form.categorieId]);
  const prixNum = Number(form.prix||0);
  const prixCDF = toCDF(prixNum);

  const showToast = (msg:string, type="success")=> { setToast({msg,type}); setTimeout(()=> setToast(null), 3500); };

  const handlePhoto = (e:any)=>{
    const file = e.target.files?.[0]; if(!file) return;
    // ✅ FIX PRO - Freemium check
    if(file.type.startsWith("video/")){
      if(ab?.media==="image-only"){
        showToast("🎥 Vidéo réservée abonnement 5$/10$ - Freemium / Essai 7j = Images only","error"); return;
      }
      if(file.size>25*1024*1024){ showToast("Vidéo max 25Mo pour boutique payante","error"); return; }
      setIsVideo(true);
      const reader = new FileReader();
      reader.onload = ()=> setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }
    setIsVideo(false);
    if(file.size>8*1024*1024){ showToast("Photo max 8Mo","error"); return; }
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        const canvas = document.createElement("canvas");
        const max = 800; let w=img.width, h=img.height;
        if(w>h){ if(w>max){ h*=max/w; w=max; } } else { if(h>max){ w*=max/h; h=max; } }
        canvas.width=w; canvas.height=h;
        canvas.getContext("2d")?.drawImage(img,0,0,w,h);
        setPhotoPreview(canvas.toDataURL("image/jpeg",0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = ()=>{
    if(!form.titre.trim() || form.titre.trim().length<3){ showToast("Titre min 3 caractères","error"); return; }
    if(!prixNum || prixNum<=0){ showToast("Prix $ requis","error"); return; }
    if(!photoPreview){ showToast("Ajoute 1 photo - Images only freemium","error"); return; }
    if(!user){ router.push("/connexion"); return; }
    try {
      const v = verifierAbonnement();
      if(v.needsPay){ showToast(`Freemium 3/3 vie atteint - Paye ${prixInfo.prixUSD}$ ou booster 1$ 24h`,"error"); setTimeout(()=> router.push(`/abonnement?cat=${form.categorieId}`), 1200); return; }
      if(v.media==="image-only" && isVideo){ showToast("Freemium / Essai 7j = Images only - Non vidéo - Paye 5$/10$ pour vidéo","error"); return; }
      if((modeFromUrl==="occasionnel" || form.categorieId==="client") && !v.isPaye && !v.isEssai7j){
        showToast("Vente occasionnelle = Booster 1$ / 2300 CDF 24h","info");
        setTimeout(()=> router.push(`/abonnement?cat=client&mode=occasionnel`), 1000); return;
      }
    } catch {}
    setSaving(true);
    try {
      const id = `WENZE-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      const activiteObj = getActiviteById(form.categorieId, form.activiteId);
      const annonce = {
        id, titre: form.titre.trim(),
        description: form.description.trim() || `${form.titre.trim()} - ${currentCat?.titre} - ${activiteObj?.label} - Taux ${TAUX_CDF} - WENZE WENZE BUSINESS - 0% commission`,
        prix: prixNum, prixCDF, prixCDFString: toCDFString(prixNum),
        categorieId: normalizeCategorie(form.categorieId), categorie: normalizeCategorie(form.categorieId),
        activiteId: form.activiteId, activite: activiteObj?.label || form.activiteId,
        photo: photoPreview, images: [photoPreview], isVideo, media: isVideo ? "images-videos" : "image-only",
        ownerWhatsapp: cleanWhatsapp(user.ownerWhatsapp||user.whatsapp||""), whatsapp: cleanWhatsapp(user.ownerWhatsapp||user.whatsapp||""),
        ownerName: user.nomEtablissement || user.nom || "WENZE WENZE BUSINESS", userId: user.id || cleanWhatsapp(user.ownerWhatsapp||""),
        commune: form.commune || user.commune || "Kinshasa", ville: form.ville || "Kinshasa", stock: Number(form.stock||1), livraison: form.livraison,
        boutiquePrixUSD: prixInfo.prixUSD, boutiquePrixCDF: prixInfo.prixCDF, taux: TAUX_CDF,
        created_at: new Date().toISOString(), createdAt: new Date().toISOString(), statut: "actif", boostUntil: null,
      };
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      list.unshift(annonce); 
      // ✅ FIX LOCALSTORAGE FULL - garde 100 max
      try{ localStorage.setItem("wenze_annonces_list", JSON.stringify(list.slice(0,100))); } catch{ localStorage.setItem("wenze_annonces_list", JSON.stringify(list.slice(0,30))); }
      try{ localStorage.setItem("wenze_current_produit", JSON.stringify(annonce)); } catch {}
      showToast(`✅ Publié ${prixNum}$ / ${prixCDF.toLocaleString()} CDF - ${isVideo?"🎥":"🖼️"} - WENZE WENZE BUSINESS`, "success");
      setTimeout(()=> router.push(`/produit/${id}`), 900);
    } catch(e){ showToast("Erreur publication - Stockage plein, supprime anciennes annonces","error"); setSaving(false); }
  };

  if(loadingUser) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[10px] text-gray-400 mt-2">WENZE WENZE BUSINESS Chargement publier... Taux {TAUX_CDF}</p></div>;

  const activites = currentCat?.activites || [];
  const isGros = form.categorieId==="gros-autres";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          {/* ✅ NOM GARDÉ WENZE WENZE BUSINESS */}
          <h1 className="font-black text-[13px]">WENZE WENZE BUSINESS - Publier - {ab?.isPaye?`✅ ${ab?.label} ${ab?.joursRestants}j`: ab?.isEssai7j?`⏳ Essai ${ab?.joursRestants}j`:`🆓 Freemium ${ab?.count||0}/3 vie`}</h1>
          <p className="text-[9px] text-gray-500">{currentCat?.icon} {currentCat?.titre} • {prixInfo.prixUSD}$/{prixInfo.prixCDF.toLocaleString()} CDF • {ab?.media==="image-only"?"Images only - Non vidéo":"Images+Vidéo"} • Taux {TAUX_CDF} • 0% comm</p>
        </div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-black ${ab?.isPaye?"bg-green-500 text-white": ab?.isEssai7j?"bg-orange-400 text-white": isGros?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{ab?.isPaye?`${prixInfo.prixUSD}$ Actif`: ab?.isEssai7j?`${ab?.joursRestants}j essai`:`${ab?.count||0}/3 vie`}</span>
      </header>

      <div className="p-4 space-y-3">
        {toast && <div className={`p-3 rounded-xl text-[11px] font-bold ${toast.type==="error"?"bg-red-50 text-red-700 border border-red-200": toast.type==="info"?"bg-blue-50 text-blue-700 border":"bg-green-50 text-green-700 border"}`}>{toast.msg}</div>}

        <div className={`border-2 rounded-2xl p-3 text-[11px] ${ab?.isPaye?"bg-green-50 border-green-200": ab?.isEssai7j?"bg-orange-50 border-orange-300":"bg-white border-orange-200"}`}>
          <p className="font-black">{ab?.isPaye?`✅ ${ab?.droits} - Illimité images+vidéos - Droits instant`: ab?.isEssai7j?`⏳ ${ab?.message} - Après 7j → Freemium 3 à vie`:`🆓 ${ab?.message}`}</p>
          <p className="text-[10px] text-gray-600 mt-1">{ab?.isPaye?`Booster gratuit 1/mois inclus • Paye first • Taux ${TAUX_CDF}`: ab?.isEssai7j?`Publie illimité images only pendant essai • Vidéo réservée 5$/10$`:`3 annonces à vie images only non vidéo • Booster occasionnel 1$ / 2300 CDF 24h`}</p>
        </div>

        <div className="bg-white border-2 rounded-2xl p-3">
          <p className="font-black text-[11px]">{ab?.media==="image-only"?"Photo produit - Images only - Non vidéo":"Photo / Vidéo produit - Images+Vidéo (payant)"}</p>
          <input type="file" accept={ab?.media==="image-only"?"image/*":"image/*,video/*"} onChange={handlePhoto} className="mt-2 w-full text-[11px]"/>
          {photoPreview ? (isVideo ? <video src={photoPreview} controls className="mt-3 w-full h-52 bg-black rounded-xl border"/> : <img src={photoPreview} alt="preview" className="mt-3 w-full h-52 object-contain bg-[#FFFBF0] rounded-xl border"/>) : <div className="mt-3 w-full h-32 bg-[#FFFBF0] border-2 border-dashed rounded-xl flex items-center justify-center text-[11px] text-gray-400">{ab?.media==="image-only"?"Ajoute photo - Images only - max 8Mo":"Ajoute photo ou vidéo - max 25Mo"}</div>}
        </div>

        <div className="bg-white border-2 rounded-2xl p-3 space-y-3">
          <input value={form.titre} onChange={e=> setForm({...form, titre: e.target.value})} placeholder="Titre ex: Sacoches Homme Gombe WENZE WENZE BUSINESS..." className="w-full border-2 p-3 rounded-xl text-[13px] font-bold"/>
          <textarea value={form.description} onChange={e=> setForm({...form, description: e.target.value})} placeholder="Description qualité Kinshasa..." rows={3} className="w-full border-2 p-3 rounded-xl text-[12px]"/>
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-[10px] font-black">Prix USD $</p><input type="number" inputMode="decimal" value={form.prix} onChange={e=> setForm({...form, prix: e.target.value})} placeholder="ex: 25" className="w-full border-2 p-3 rounded-xl text-[13px] font-black text-[#6C3CE0]"/></div>
            <div><p className="text-[10px] font-black">Prix CDF auto Taux {TAUX_CDF}</p><div className="w-full border-2 p-3 rounded-xl text-[13px] font-black bg-[#FFFBF0]">{prixCDF.toLocaleString()} CDF<br/><span className="text-[9px] text-gray-500">{toCDFString(prixNum)}</span></div></div>
          </div>
          <div><p className="text-[10px] font-black">Catégorie - WENZE WENZE BUSINESS</p><div className="mt-1 grid gap-1">{CATEGORIES_WENZE.map(c=> (<button key={c.id} type="button" onClick={()=> setForm({...form, categorieId: c.id, activiteId: c.activites[0]?.id || ""})} className={`text-left p-2.5 rounded-xl border-2 text-[11px] font-bold ${form.categorieId===c.id ? (c.id==="gros-autres"?"bg-black text-white border-black":"bg-[#6C3CE0] text-white border-[#6C3CE0]") : "bg-white"}`}>{c.icon} {c.titre} - {c.prixUSD}$/{c.prixCDF.toLocaleString()} CDF</button>))}</div></div>
          <div><p className="text-[10px] font-black">Activité précise</p><div className="mt-1 flex flex-wrap gap-1 max-h-28 overflow-y-auto">{activites.map((a:any)=> <button key={a.id} type="button" onClick={()=> setForm({...form, activiteId: a.id})} className={`text-[10px] px-2.5 py-1.5 rounded-full font-bold border ${form.activiteId===a.id?"bg-black text-white border-black":"bg-[#FFFBF0]"}`}>{a.label}</button>)}</div></div>
          <div className="grid grid-cols-2 gap-2"><input value={form.commune} onChange={e=> setForm({...form, commune: e.target.value})} placeholder="Commune Gombe" className="border-2 p-3 rounded-xl text-[12px]"/><input value={form.stock} onChange={e=> setForm({...form, stock: e.target.value})} type="number" placeholder="Stock" className="border-2 p-3 rounded-xl text-[12px]"/></div>
          <div className={`rounded-xl p-3 text-[10px] ${ab?.isPaye?"bg-green-500 text-white": ab?.isEssai7j?"bg-orange-400 text-white":"bg-black text-white"}`}><p className="font-black">WENZE WENZE BUSINESS - {currentCat?.icon} {currentCat?.titreCourt} - {prixInfo.prixUSD}$ • {ab?.media}</p><p className="opacity-80 mt-1">{prixNum||0}$ / {prixCDF.toLocaleString()} CDF • Taux {TAUX_CDF} • {ab?.droits}</p></div>
          <button onClick={handlePublish} disabled={saving || ab?.needsPay || (ab?.media==="image-only" && isVideo)} className={`w-full py-4 rounded-full font-black text-[13px] disabled:opacity-50 ${ab?.needsPay?"bg-gray-300": isGros?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{saving?"Publication...": ab?.needsPay?`Freemium 3/3 vie atteint - Paye ${prixInfo.prixUSD}$`:`Publier ${prixNum||0}$ / ${prixCDF.toLocaleString()} CDF • WENZE WENZE BUSINESS`}</button>
          {ab?.needsPay && <div className="grid grid-cols-2 gap-2"><Link href={`/abonnement?cat=${form.categorieId}`} className="bg-black text-white py-3 rounded-full font-bold text-[11px] text-center">Paye {prixInfo.prixUSD}$ - Droits instant</Link><Link href="/abonnement?cat=client&mode=occasionnel" className="bg-[#25D366] text-white py-3 rounded-full font-bold text-[11px] text-center">Booster 1$ 24h</Link></div>}
        </div>
      </div>
    </div>
  );
}

export default function PagePublier(){
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[10px] text-gray-400 mt-2">WENZE WENZE BUSINESS Chargement...</p></div>}>
      <PublierContent/>
    </Suspense>
  );
                                  }
