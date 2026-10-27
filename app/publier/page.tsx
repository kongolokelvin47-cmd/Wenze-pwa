"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, getPrixByCategorie, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString, verifierAbonnement, checkFreemiumWenze, checkFreemiumLimit } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

function cleanWhatsapp(n: string) { return (n || "").toString().replace(/[^0-9]/g, ""); }
function getCurrentUser() {
  try { const raw = localStorage.getItem("wenze_user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function PublierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catFromUrl = normalizeCategorie(searchParams.get("cat") || searchParams.get("categorie") || "");
  const modeFromUrl = searchParams.get("mode"); // occasionnel

  const [user, setUser] = useState<any>(null);
  const [ab, setAb] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isVideo, setIsVideo] = useState(false);

  const [form, setForm] = useState({
    titre: "",
    description: "",
    prix: "",
    categorieId: "commerces-services",
    activiteId: "",
    commune: "",
    ville: "Kinshasa",
    stock: "1",
    livraison: "Retrait sur place / Livraison Kinshasa",
  });

  // Init user + freemium check
  useEffect(() => {
    const u = getCurrentUser();
    if(!u){ router.push("/connexion?next=/publier"); return; }
    const fixedCat = normalizeCategorie(catFromUrl || u.categorieId || u.categorie || "commerces-services");
    const catObj = getCategorieById(fixedCat);
    const fullUser = { ...u, categorieId: fixedCat, catObj, prixUSD: catObj ? getPrixByCategorie(catObj.id).prixUSD : 5, prixCDF: catObj ? getPrixByCategorie(catObj.id).prixCDF : 11500 };
    setUser(fullUser);
    setForm(f=> ({ ...f, categorieId: fixedCat, activiteId: u.activiteId || catObj?.activites[0]?.id || "", commune: u.commune || f.commune, ville: u.ville || "Kinshasa" }));

    // ✅ FREEMIUM OFFICIEL WENZE 2.0
    try {
      const v = verifierAbonnement();
      setAb(v);
      if(v.needsPay){
        setToast({ msg: `🆓 Freemium ${v.count}/3 à vie atteint (images only) - ${v.isEssai7j?`Essai ${v.joursRestants}j fini`:`Limite 3 vie`} - Paye ${fullUser.prixUSD}$ / ${fullUser.prixCDF.toLocaleString()} CDF ou booster 1$ occasionnel`, type:"error" });
        setTimeout(()=> router.push(`/abonnement?cat=${fixedCat}`), 1800);
      } else if(v.isEssai7j){
        setToast({ msg: `⏳ Essai gratuit ${v.joursRestants}j - Illimité images only (non vidéo) - Publie max! Après 7j → Freemium 3 à vie`, type:"success" });
        setTimeout(()=> setToast(null), 4000);
      } else if(v.isFreemium){
        setToast({ msg: `🆓 Freemium ${v.count}/3 à vie - Images only - Non vidéo - ${v.annoncesRestantes} restante(s)`, type:"info" });
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
    // ✅ FREEMIUM IMAGES ONLY CHECK
    if(file.type.startsWith("video/")){
      if(ab?.media==="image-only"){
        showToast("🎥 Vidéo réservée abonnement 5$/10$ - Freemium / Essai 7j = Images only - Non vidéo","error");
        return;
      }
      setIsVideo(true);
    } else {
      setIsVideo(false);
    }
    if(file.size>8*1024*1024){ showToast("Photo max 8Mo - Vidéo max 8Mo (payant only)","error"); return; }
    const reader = new FileReader();
    reader.onload = ()=>{
      if(file.type.startsWith("video/")){
        setPhotoPreview(reader.result as string);
        return;
      }
      const img = new Image();
      img.onload = ()=>{
        const canvas = document.createElement("canvas");
        const max = 800; let w=img.width, h=img.height;
        if(w>h){ if(w>max){ h*=max/w; w=max; } } else { if(h>max){ w*=max/h; h=max; } }
        canvas.width=w; canvas.height=h;
        canvas.getContext("2d")?.drawImage(img,0,0,w,h);
        const data = canvas.toDataURL("image/jpeg",0.75);
        setPhotoPreview(data);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = ()=>{
    if(!form.titre.trim() || form.titre.trim().length<3){ showToast("Titre min 3 caractères","error"); return; }
    if(!prixNum || prixNum<=0){ showToast("Prix $ requis","error"); return; }
    if(!photoPreview){ showToast("Ajoute 1 photo produit - Images only freemium","error"); return; }
    if(!user){ router.push("/connexion"); return; }

    // ✅ CHECK FINAL FREEMIUM 3 VIE
    try {
      const v = verifierAbonnement();
      if(v.needsPay){
        showToast(`Freemium 3/3 à vie atteint - Paye ${prixInfo.prixUSD}$ ou booster 1$ occasionnel 24h`,"error");
        setTimeout(()=> router.push(`/abonnement?cat=${form.categorieId}`), 1200);
        return;
      }
      if(v.media==="image-only" && isVideo){
        showToast("Freemium / Essai 7j = Images only - Non vidéo - Paye 5$/10$ pour vidéo","error");
        return;
      }
      // Mode occasionnel sans boutique - doit payer booster 1$
      if(modeFromUrl==="occasionnel" || form.categorieId==="client"){
        if(!user.abonnementPaye && !v.isEssai7j){
          showToast("Vente occasionnelle = Booster 1$ / 2300 CDF 24h - Redirection paiement","info");
          setTimeout(()=> router.push(`/abonnement?cat=client&mode=occasionnel`), 1000);
          return;
        }
      }
    } catch {}

    setSaving(true);
    try {
      const id = `WENZE-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      const activiteObj = getActiviteById(form.categorieId, form.activiteId);

      const annonce = {
        id,
        titre: form.titre.trim(),
        description: form.description.trim() || `${form.titre.trim()} - ${currentCat?.titre || form.categorieId} authentique Kinshasa - ${activiteObj?.label || form.activiteId} - Taux ${TAUX_CDF} fixe - 0% commission WENZE - ${ab?.droits||"freemium-3-vie"} - ${isVideo?"Vidéo payant":"Image only"}`,
        prix: prixNum,
        prixCDF,
        prixCDFString: toCDFString(prixNum),
        categorieId: normalizeCategorie(form.categorieId),
        categorie: normalizeCategorie(form.categorieId),
        activiteId: form.activiteId,
        activite: activiteObj?.label || form.activiteId,
        photo: photoPreview,
        images: [photoPreview],
        isVideo,
        media: isVideo ? "images-videos" : "image-only",
        ownerWhatsapp: cleanWhatsapp(user.ownerWhatsapp||user.whatsapp||""),
        whatsapp: cleanWhatsapp(user.ownerWhatsapp||user.whatsapp||""),
        ownerName: user.nomEtablissement || user.nom || "Boutique WENZE",
        userId: user.id || cleanWhatsapp(user.ownerWhatsapp||""),
        commune: form.commune || user.commune || "Kinshasa",
        ville: form.ville || "Kinshasa",
        stock: Number(form.stock||1),
        livraison: form.livraison,
        boutiquePrixUSD: prixInfo.prixUSD,
        boutiquePrixCDF: prixInfo.prixCDF,
        boutiqueDroits: ab?.droits || "freemium-3-vie-images-only",
        taux: TAUX_CDF,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        statut: "actif",
        boostUntil: null,
      };

      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      // Tri payant first + booster
      list.unshift(annonce);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(list));

      try {
        const all = JSON.parse(localStorage.getItem("wenze_all_annonces")||"[]");
        all.unshift(annonce);
        localStorage.setItem("wenze_all_annonces", JSON.stringify(all.slice(0,500)));
      } catch {}

      showToast(`✅ Publié ${prixNum}$ / ${prixCDF.toLocaleString()} CDF - ${isVideo?"Vidéo":"Image"} - ${ab?.isPaye?"Boutique "+prixInfo.prixUSD+"$ illimité": ab?.isEssai7j?`Essai ${ab?.joursRestants}j illimité`:`Freemium ${ab?.count||0}/3 vie`} - Taux ${TAUX_CDF}`, "success");
      setTimeout(()=> router.push(`/produit/${id}`), 900);
    } catch(e){ showToast("Erreur publication","error"); setSaving(false); }
  };

  if(loadingUser) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[10px] text-gray-400 mt-2">WENZE 2.0 Publier... {ab?.isEssai7j?`Essai ${ab?.joursRestants}j`:`Freemium ${ab?.count||0}/3`} • Taux {TAUX_CDF}</p></div>;

  const activites = currentCat?.activites || [];
  const isGros = form.categorieId==="gros-autres";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[14px]">Publier - {ab?.isPaye?`✅ ${ab?.label} ${ab?.joursRestants}j - Illimité images+vidéos`: ab?.isEssai7j?`⏳ Essai ${ab?.joursRestants}j - Illimité images only`:`🆓 Freemium ${ab?.count||0}/3 à vie - Images only`}</h1><p className="text-[10px] text-gray-500">{currentCat?.icon} {currentCat?.titre} • {prixInfo.prixUSD}$/{prixInfo.prixCDF.toLocaleString()} CDF • {ab?.media==="image-only"?"Images only - Non vidéo":"Images+Vidéo"} • Taux {TAUX_CDF} • 0% comm</p></div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-black ${ab?.isPaye?"bg-green-500 text-white": ab?.isEssai7j?"bg-orange-400 text-white": isGros?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{ab?.isPaye?`${prixInfo.prixUSD}$ Actif`: ab?.isEssai7j?`${ab?.joursRestants}j essai`:`${ab?.count||0}/3 vie`}</span>
      </header>

      <div className="p-4 space-y-3">
        {toast && <div className={`p-3 rounded-xl text-[11px] font-bold ${toast.type==="error"?"bg-red-50 text-red-700 border border-red-200": toast.type==="info"?"bg-blue-50 text-blue-700 border border-blue-200":"bg-green-50 text-green-700 border border-green-200"}`}>{toast.msg}</div>}

        {/* STATUT FREEMIUM */}
        <div className={`border-2 rounded-2xl p-3 text-[11px] ${ab?.isPaye?"bg-green-50 border-green-200": ab?.isEssai7j?"bg-orange-50 border-orange-300":"bg-white border-orange-200"}`}>
          <p className="font-black">{ab?.isPaye?`✅ ${ab?.droits} - Illimité images+vidéos - Droits instant`: ab?.isEssai7j?`⏳ ${ab?.message} - Après 7j → Freemium 3 à vie`:`🆓 ${ab?.message}`}</p>
          <p className="text-[10px] text-gray-600 mt-1">{ab?.isPaye?`Booster gratuit 1/mois inclus • Paye first dans fil d'actu • Taux ${TAUX_CDF}`: ab?.isEssai7j?`Publie illimité images only pendant essai • Vidéo réservée 5$/10$ • Sans abo retour freemium 3 vie`:`Alternative abonnement: 3 annonces à vie images only non vidéo • Essai 7j gratuit illimité images only à création pro • Sans abonnement retour ici 3 vie • Booster occasionnel 1$ / 2300 CDF 24h pour vendre sans boutique`}</p>
        </div>

        <div className="bg-white border-2 rounded-2xl p-3">
          <p className="font-black text-[11px]">{ab?.media==="image-only"?"Photo produit - Images only - Non vidéo (freemium/essai)":"Photo / Vidéo produit - Images+Vidéo (boutique payante)"} - compress 800px JPEG 75%</p>
          <input type="file" accept={ab?.media==="image-only"?"image/*":"image/*,video/*"} onChange={handlePhoto} className="mt-2 w-full text-[11px]"/>
          {photoPreview ? (isVideo ? <video src={photoPreview} controls className="mt-3 w-full h-52 bg-black rounded-xl border"/> : <img src={photoPreview} alt="preview" className="mt-3 w-full h-52 object-contain bg-[#FFFBF0] rounded-xl border"/>) : <div className="mt-3 w-full h-32 bg-[#FFFBF0] border-2 border-dashed rounded-xl flex items-center justify-center text-[11px] text-gray-400">{ab?.media==="image-only"?"Ajoute photo - Images only - Non vidéo - max 8Mo":"Ajoute photo ou vidéo - Boutique payante - max 8Mo"}</div>}
          {isVideo && ab?.media==="image-only" && <p className="text-[10px] text-red-600 font-bold mt-2">⚠️ Vidéo bloquée - Freemium / Essai 7j = Images only - Paye 5$/10$ pour vidéo</p>}
        </div>

        <div className="bg-white border-2 rounded-2xl p-3 space-y-3">
          <input value={form.titre} onChange={e=> setForm({...form, titre: e.target.value})} placeholder="Titre ex: Réparation électricité Gombe - Images only freemium..." className="w-full border-2 p-3 rounded-xl text-[13px] font-bold"/>
          <textarea value={form.description} onChange={e=> setForm({...form, description: e.target.value})} placeholder="Description qualité Kinshasa, garantie - Images only freemium..." rows={3} className="w-full border-2 p-3 rounded-xl text-[12px]"/>
          
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-[10px] font-black">Prix USD $</p><input type="number" inputMode="decimal" value={form.prix} onChange={e=> setForm({...form, prix: e.target.value})} placeholder="ex: 25" className="w-full border-2 p-3 rounded-xl text-[13px] font-black text-[#6C3CE0]"/></div>
            <div><p className="text-[10px] font-black">Prix CDF auto Taux {TAUX_CDF}</p><div className="w-full border-2 p-3 rounded-xl text-[13px] font-black bg-[#FFFBF0]">{prixCDF.toLocaleString()} CDF<br/><span className="text-[9px] text-gray-500">{toCDFString(prixNum)} • {ab?.media}</span></div></div>
          </div>

          <div>
            <p className="text-[10px] font-black">Catégorie - 2 prix WENZE 2.0 - {ab?.isPaye?"Illimité images+vidéos": ab?.isEssai7j?"Essai 7j illimité images only":"Freemium 3 à vie images only"}</p>
            <div className="mt-1 grid gap-1">
              {CATEGORIES_WENZE.map(c=> (
                <button key={c.id} type="button" onClick={()=> setForm({...form, categorieId: c.id, activiteId: c.activites[0]?.id || ""})} className={`text-left p-2.5 rounded-xl border-2 text-[11px] font-bold ${form.categorieId===c.id ? (c.id==="gros-autres"?"bg-black text-white border-black":"bg-[#6C3CE0] text-white border-[#6C3CE0]") : "bg-white"}`}>{c.icon} {c.titre} - {c.prixUSD}$/{c.prixCDF.toLocaleString()} CDF - {c.id==="commerces-services"?"Électricité, maçon, soudeur, coiffure même régime 5$ illimité images+vidéos":"Gros, import, prod 10$ illimité images+vidéos"} {ab?.media==="image-only"?" - Images only freemium":""}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black">Activité précise - {currentCat?.titreCourt} - {ab?.media}</p>
            <div className="mt-1 flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {activites.map((a:any)=> <button key={a.id} type="button" onClick={()=> setForm({...form, activiteId: a.id})} className={`text-[10px] px-2.5 py-1.5 rounded-full font-bold border ${form.activiteId===a.id?"bg-black text-white border-black":"bg-[#FFFBF0]"}`}>{a.label}</button>)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input value={form.commune} onChange={e=> setForm({...form, commune: e.target.value})} placeholder="Commune ex: Gombe" className="border-2 p-3 rounded-xl text-[12px]"/>
            <input value={form.stock} onChange={e=> setForm({...form, stock: e.target.value})} type="number" placeholder="Stock" className="border-2 p-3 rounded-xl text-[12px]"/>
          </div>
          <input value={form.livraison} onChange={e=> setForm({...form, livraison: e.target.value})} placeholder="Livraison ex: Retrait Gombe / Livraison..." className="w-full border-2 p-3 rounded-xl text-[11px]"/>

          <div className={`rounded-xl p-3 text-[10px] ${ab?.isPaye?"bg-green-500 text-white": ab?.isEssai7j?"bg-orange-400 text-white":"bg-black text-white"}`}>
            <p className="font-black">{ab?.isPaye?`Boutique ${currentCat?.icon} ${currentCat?.titreCourt} - ${prixInfo.prixUSD}$ / ${prixInfo.prixCDF.toLocaleString()} CDF - Illimité ${ab?.media} - Droits instant`: ab?.isEssai7j?`Essai ${currentCat?.icon} ${currentCat?.titreCourt} - ${ab?.joursRestants}j - Illimité images only - Taux ${TAUX_CDF}`:`Freemium ${currentCat?.icon} ${currentCat?.titreCourt} - ${prixInfo.prixUSD}$ boutique - ${ab?.count||0}/3 à vie - Images only - Taux ${TAUX_CDF}`}</p>
            <p className="opacity-80 mt-1">Ton annonce: {prixNum||0}$ / {prixCDF.toLocaleString()} CDF • WhatsApp {cleanWhatsapp(user?.ownerWhatsapp||"")} • 0% commission • {currentCat?.description} • {ab?.droits} • {ab?.media==="image-only"?"Non vidéo":"Images+Vidéo OK"}</p>
          </div>

          <button onClick={handlePublish} disabled={saving || ab?.needsPay || (ab?.media==="image-only" && isVideo)} className={`w-full py-4 rounded-full font-black text-[13px] disabled:opacity-50 ${ab?.needsPay?"bg-gray-300 text-gray-600": isGros?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{saving?"Publication...": ab?.needsPay?`Freemium 3/3 vie atteint - Paye ${prixInfo.prixUSD}$` : (ab?.media==="image-only" && isVideo)?"Vidéo bloquée - Images only":"Publier "+(prixNum||0)+"$ / "+prixCDF.toLocaleString()+" CDF • "+(ab?.isPaye?`${prixInfo.prixUSD}$ illimité ${ab?.media}`: ab?.isEssai7j?`${ab?.joursRestants}j essai illimité images only`:`${ab?.count||0}/3 vie images only`)}</button>
          
          {ab?.needsPay && (
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/abonnement?cat=${form.categorieId}`} className="bg-black text-white py-3 rounded-full font-bold text-[11px] text-center">Paye {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF - Droits instant</Link>
              <Link href="/abonnement?cat=client&mode=occasionnel" className="bg-[#25D366] text-white py-3 rounded-full font-bold text-[11px] text-center">Booster 1$ 24h occasionnel</Link>
            </div>
          )}
          <Link href="/" className="block text-center text-[11px] text-gray-500 py-2">Annuler - Retour marché - {ab?.isPaye?"Paye first":"Freemium 3 vie"}</Link>
        </div>
      </div>
    </div>
  );
}

export default function PagePublier(){
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[10px] text-gray-400 mt-2">WENZE 2.0 Chargement publier... Taux {TAUX_CDF}</p></div>}>
      <PublierContent/>
    </Suspense>
  );
          }
