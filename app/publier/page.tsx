"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString, verifierAbonnement, getPrixByCategorie } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

function cleanWa(n:any){
  return (n || "").toString().replace(/[^0-9]/g,"");
}

function getCurrentUser(){
  try{
    const r = localStorage.getItem("wenze_user");
    return r ? JSON.parse(r) : null;
  }catch{
    return null;
  }
}

const BOOSTS_OCCASIONNEL = [
  { id:"free", label:"Gratuit", prixUSD:0, prixCDF:0, duree:"7j / 3 vie", desc:"Sans boost - Sans notif" },
  { id:"boost-1", label:"Boost 24h", prixUSD:1, prixCDF:2300, duree:"24h TOP", desc:"1$ - Top + notif" },
  { id:"boost-3", label:"Boost 3j", prixUSD:3, prixCDF:6900, duree:"3j", desc:"3$ - Recommande" },
  { id:"boost-7", label:"Boost 7j", prixUSD:5, prixCDF:11500, duree:"7j MAX", desc:"5$ - Max visibilite" },
];

const CATEGORIES_OCCASIONNEL = [
  { id:"telephone", label:"📱 Telephone" },
  { id:"electromenager", label:"🔌 Electromenager" },
  { id:"vetement", label:"👕 Vetement" },
  { id:"meuble", label:"🛋️ Meuble" },
  { id:"moto-velo", label:"🏍️ Moto/Velo" },
  { id:"autre-occasion", label:"📦 Autre" },
];

function PublierContent(){
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp.get("edit");
  const catFromUrl = normalizeCategorie(sp.get("cat") || sp.get("categorie") || "");
  const modeFromUrl = sp.get("mode");

  const [user,setUser] = useState<any>(null);
  const [ab,setAb] = useState<any>(null);
  const [loadingUser,setLoadingUser] = useState(true);
  const [saving,setSaving] = useState(false);
  const [toast,setToast] = useState<any>(null);
  const [showSuccess,setShowSuccess] = useState<any>(null);
  const [photoPreview,setPhotoPreview] = useState("");
  const [isVideo,setIsVideo] = useState(false);
  const [selectedBoost,setSelectedBoost] = useState("free");
  const [isEditMode,setIsEditMode] = useState(false);
  const [keepDates,setKeepDates] = useState<any>(null);
  const [form,setForm] = useState({
    titre:"",
    description:"",
    prix:"",
    categorieId:"commerces-services",
    activiteId:"",
    commune:"",
    ville:"Kinshasa",
    stock:"1",
    livraison:"Retrait sur place / Livraison Kinshasa"
  });

  const isOccasionnel = useMemo(function(){
    return form.categorieId === "client" || modeFromUrl === "occasionnel" || catFromUrl === "client";
  },[form.categorieId, modeFromUrl, catFromUrl]);

  useEffect(function(){
    const u = getCurrentUser();
    if(!u){
      router.push("/connexion?next=/publier");
      return;
    }
    let oldAnnonce:any = null;
    if(editId){
      try{
        const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
        oldAnnonce = list.find(function(x:any){ return x.id === editId; });
        if(!oldAnnonce){
          setToast({msg:"Annonce introuvable",type:"error"});
          setTimeout(function(){ router.push("/"); },1500);
          return;
        }
        const waU = cleanWa(u.ownerWhatsapp || u.whatsapp || u.id);
        const waA = cleanWa(oldAnnonce.ownerWhatsapp || oldAnnonce.whatsapp || oldAnnonce.userId);
        if(waU !== waA && u.id !== oldAnnonce.userId){
          setToast({msg:"⛔ INTERDIT - Tu ne peux pas modifier annonce d'autrui",type:"error"});
          setTimeout(function(){ router.push("/boutiques/"+waU); },2000);
          return;
        }
        setForm({
          titre: oldAnnonce.titre || "",
          description: oldAnnonce.description || "",
          prix: String(oldAnnonce.prix || ""),
          categorieId: oldAnnonce.categorieId || "commerces-services",
          activiteId: oldAnnonce.activiteId || "",
          commune: oldAnnonce.commune || "",
          ville: oldAnnonce.ville || "Kinshasa",
          stock: String(oldAnnonce.stock || 1),
          livraison: oldAnnonce.livraison || "Retrait"
        });
        setPhotoPreview(oldAnnonce.photo || "");
        setIsVideo(!!oldAnnonce.isVideo);
        setSelectedBoost(oldAnnonce.boostType || "free");
        setKeepDates({createdAt: oldAnnonce.createdAt || oldAnnonce.created_at, boostUntil: oldAnnonce.boostUntil});
        setIsEditMode(true);
        const remaining = oldAnnonce.boostUntil ? Math.ceil((new Date(oldAnnonce.boostUntil).getTime()-Date.now())/86400000) : null;
        if(remaining !== null){
          setToast({msg:"✏️ Modification - Compteur conserve: "+(remaining>0 ? remaining+"j restant" : "Expire")+" - Ne repart pas a zero",type:"success"});
          setTimeout(function(){ setToast(null); },5000);
        }
      }catch{}
    }
    const isUserClient = u.role === "client" || u.type === "client" || u.categorieId === "client" || catFromUrl === "client" || modeFromUrl === "occasionnel";
    const baseCat = isUserClient ? "client" : (catFromUrl || u.categorieId || "commerces-services");
    const fixedCat = normalizeCategorie(oldAnnonce ? oldAnnonce.categorieId : baseCat);
    const catObj = getCategorieById(fixedCat);
    let prixB = {prixUSD:5, prixCDF:11500};
    if(catObj){
      const p = getPrixByCategorie(catObj.id);
      if(p){ prixB = p; }
    }
    setUser({
      ownerWhatsapp: u.ownerWhatsapp || u.whatsapp || "",
      whatsapp: u.whatsapp || "",
      id: u.id || "",
      nom: u.nom || "",
      nomEtablissement: u.nomEtablissement || u.nom || "",
      commune: u.commune || "",
      categorieId: fixedCat,
      role: isUserClient ? "client" : "boutique",
      catObj: catObj,
      prixUSD: isUserClient ? 0 : prixB.prixUSD,
      prixCDF: isUserClient ? 0 : prixB.prixCDF,
      activiteId: u.activiteId || ""
    });
    if(!oldAnnonce){
      let firstActivite = "";
      if(catObj && catObj.activites && catObj.activites[0]){ firstActivite = catObj.activites[0].id; }
      setForm(function(f:any){
        return Object.assign({}, f, {
          categorieId: fixedCat,
          activiteId: isUserClient ? "vente-occasionnelle" : (u.activiteId || firstActivite),
          commune: u.commune || f.commune
        });
      });
    }
    try{
      const v = verifierAbonnement();
      setAb(v);
      if(v.needsPay && !isUserClient && !editId){
        setToast({msg:"Freemium "+v.count+"/3 atteint - Paye "+prixB.prixUSD+"$",type:"error"});
      }
    }catch{}
    setLoadingUser(false);
  },[router,editId,catFromUrl,modeFromUrl]);

  const currentCat = useMemo(function(){ return getCategorieById(form.categorieId); },[form.categorieId]);
  const prixInfo = useMemo(function(){ return getPrixByCategorie(form.categorieId); },[form.categorieId]);
  const prixNum = Number(form.prix || 0);
  const prixCDF = toCDF(prixNum);
  const boostObj = BOOSTS_OCCASIONNEL.find(function(b){ return b.id === selectedBoost; });

  function showToast(msg:string, type:string){
    setToast({msg:msg, type:type});
    setTimeout(function(){ setToast(null); },3500);
  }

  function handlePhoto(e:any){
    const file = e.target.files ? e.target.files[0] : null;
    if(!file) return;
    if(file.type.startsWith("video/")){
      let media = "";
      if(ab && ab.media){ media = ab.media; }
      if(media === "image-only" && !isOccasionnel){
        showToast("Video reservee boutique 5$/10$","error");
        return;
      }
      if(file.size > 25*1024*1024){ showToast("Video max 25Mo","error"); return; }
      setIsVideo(true);
      const reader = new FileReader();
      reader.onload = function(){ setPhotoPreview(reader.result as string); };
      reader.readAsDataURL(file);
      return;
    }
    setIsVideo(false);
    if(file.size > 8*1024*1024){ showToast("Photo max 8Mo","error"); return; }
    const reader = new FileReader();
    reader.onload = function(){
      const img = new Image();
      img.onload = function(){
        const canvas = document.createElement("canvas");
        const max = 800;
        let w = img.width;
        let h = img.height;
        if(w > h){ if(w > max){ h = h * max / w; w = max; } }
        else { if(h > max){ w = w * max / h; h = max; } }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if(ctx) ctx.drawImage(img,0,0,w,h);
        setPhotoPreview(canvas.toDataURL("image/jpeg",0.65));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handlePublish(){
    if(!form.titre.trim() || form.titre.trim().length < 3){ showToast("Titre min 3 caracteres","error"); return; }
    if(!prixNum || prixNum <= 0){ showToast("Prix $ requis","error"); return; }
    if(!photoPreview){ showToast("Ajoute 1 photo","error"); return; }
    if(!user){ router.push("/connexion"); return; }
    try{
      const v = verifierAbonnement();
      if(v.needsPay && !isOccasionnel && !isEditMode){
        showToast("Freemium 3/3 atteint - Paye "+prixInfo.prixUSD+"$","error");
        setTimeout(function(){ router.push("/abonnement?cat="+form.categorieId); },1200);
        return;
      }
    }catch{}
    setSaving(true);
    try{
      const id = isEditMode && editId ? editId : "WENZE-"+Date.now()+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
      const activiteObj = getActiviteById(form.categorieId, form.activiteId);
      const isBoostPayant = isOccasionnel && boostObj && boostObj.prixUSD > 0;
      let boostUntilFinal:any = null;
      if(isEditMode && keepDates && keepDates.boostUntil){
        boostUntilFinal = keepDates.boostUntil;
      } else if(isBoostPayant){
        const days = selectedBoost === "boost-1" ? 1 : selectedBoost === "boost-3" ? 3 : 7;
        boostUntilFinal = new Date(Date.now()+days*86400000).toISOString();
      }
      let activiteLabel = form.activiteId;
      if(activiteObj && activiteObj.label){ activiteLabel = activiteObj.label; }

      let createdAtFinal = new Date().toISOString();
      if(keepDates && keepDates.createdAt){ createdAtFinal = keepDates.createdAt; }

      let boostPrix = 0;
      if(boostObj){ boostPrix = boostObj.prixUSD; }
      let boutiquePrix = prixInfo.prixUSD;
      if(isOccasionnel && boostObj){ boutiquePrix = boostObj.prixUSD; }

      const annonce = {
        id: id,
        titre: form.titre.trim(),
        description: form.description.trim(),
        prix: prixNum,
        prixCDF: prixCDF,
        prixCDFString: toCDFString(prixNum),
        categorieId: normalizeCategorie(form.categorieId),
        categorie: normalizeCategorie(form.categorieId),
        activiteId: form.activiteId,
        activite: activiteLabel,
        photo: photoPreview,
        images: [photoPreview],
        isVideo: isVideo,
        media: isVideo ? "images-videos" : "image-only",
        ownerWhatsapp: cleanWa(user.ownerWhatsapp || user.whatsapp || ""),
        whatsapp: cleanWa(user.ownerWhatsapp || user.whatsapp || ""),
        ownerName: user.nomEtablissement || user.nom || "WENZE",
        userId: user.id || cleanWa(user.ownerWhatsapp || ""),
        commune: form.commune || user.commune || "Kinshasa",
        ville: form.ville || "Kinshasa",
        stock: Number(form.stock || 1),
        livraison: form.livraison,
        boutiquePrixUSD: boutiquePrix,
        typeVente: isOccasionnel ? "occasionnelle" : "boutique",
        boostType: isOccasionnel ? selectedBoost : null,
        boostPrixUSD: isOccasionnel ? boostPrix : 0,
        boostUntil: boostUntilFinal,
        taux: TAUX_CDF,
        created_at: createdAtFinal,
        createdAt: createdAtFinal,
        statut: "actif",
        updatedAt: isEditMode ? new Date().toISOString() : undefined
      };

      let list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      if(isEditMode){ list = list.filter(function(x:any){ return x.id !== id; }); }
      list.unshift(annonce);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(list.slice(0,60)));
      try{ localStorage.setItem("wenze_current_produit", JSON.stringify(annonce)); }catch{}

      let prixText = prixNum+"$ / "+prixCDF.toLocaleString()+" CDF";
      let typeText = "";
      if(isEditMode){
        let j = "compteur";
        if(keepDates && keepDates.boostUntil){
          const r = Math.ceil((new Date(keepDates.boostUntil).getTime()-Date.now())/86400000);
          j = r+"j";
        }
        typeText = "Modifiee - Garde "+j;
      } else {
        typeText = "Boutique "+prixInfo.prixUSD+"$";
      }

      setShowSuccess({id:annonce.id, titre:annonce.titre, prix:prixText, type:typeText});
      setSaving(false);
      localStorage.removeItem("wenze_edit_annonce");

      if(isBoostPayant && !isEditMode){
        setTimeout(function(){ router.push("/abonnement?cat=client&mode=occasionnel&boost="+selectedBoost+"&id="+id); },2000);
      } else {
        setTimeout(function(){ router.push("/produit/"+id); },2000);
      }
    }catch(e){
      showToast("Erreur stockage plein","error");
      setSaving(false);
    }
  }

  if(loadingUser){
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-24 bg-white border rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  const activites = currentCat && currentCat.activites ? currentCat.activites : [];
  const abCount = ab && ab.count ? ab.count : 0;
  const abJours = ab && ab.joursRestants ? ab.joursRestants : 0;
  const abIsPaye = ab && ab.isPaye ? true : false;
  const abNeedsPay = ab && ab.needsPay ? true : false;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      {showSuccess ? (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[340px] w-full p-6 text-center border-2 border-black">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div>
            <h2 className="font-black text-[18px] mt-4">{isEditMode ? "Modification approuvee!" : "Publication approuvee!"}</h2>
            <div className="bg-[#FFFBF0] border-2 rounded-xl p-3 mt-3 text-left">
              <p className="font-bold text-[13px]">{showSuccess.titre}</p>
              <p className="text-[11px] text-[#6C3CE0] font-black">{showSuccess.prix}</p>
              <p className="text-[10px] text-gray-500 mt-1">{showSuccess.type}</p>
            </div>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href={isEditMode ? "/boutiques/"+cleanWa(user ? user.ownerWhatsapp || user.whatsapp || "" : "") : "/"} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-[12px]">WENZE - {isEditMode ? "Modifier" : "Publier"} - {abIsPaye ? abJours+"j" : abCount+"/3"}</h1>
          <p className="text-[8px] text-gray-500">{currentCat.icon} {currentCat.titre} - {prixInfo.prixUSD}$ - Taux {TAUX_CDF}</p>
        </div>
        <span className="text-[9px] px-2 py-1 rounded-full font-black bg-[#6C3CE0] text-white">{isEditMode ? "EDIT" : abCount+"/3"}</span>
      </header>

      <div className="p-4 space-y-3">
        {toast ? <div className="p-3 rounded-xl text-[11px] font-bold bg-red-50 text-red-700 border">{toast.msg}</div> : null}

        {isEditMode ? (
          <div className="bg-black text-white rounded-2xl p-3 border-2">
            <p className="font-black text-[11px]">Mode Modification - Regle stricte</p>
            <p className="text-[10px] mt-1 opacity-90">
              Compteur conserve: {keepDates && keepDates.boostUntil ? Math.ceil((new Date(keepDates.boostUntil).getTime()-Date.now())/86400000)+"j restant" : "Actif"} - Ne repart pas a zero
            </p>
          </div>
        ) : null}

        {isOccasionnel ? (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-3">
            <p className="font-black text-[12px]">Vente occasionnelle - Client</p>
            <div className="mt-2">
              <p className="font-black text-[10px]">Type objet</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {CATEGORIES_OCCASIONNEL.map(function(a:any){
                  return (
                    <button key={a.id} type="button" onClick={function(){ setForm(Object.assign({}, form, {activiteId:a.id})); }} className="p-2.5 rounded-xl border-2 text-[11px] font-bold text-left bg-white">{a.label}</button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3">
              <p className="font-black text-[10px]">Boost pour notif clients</p>
              <div className="mt-2 grid gap-2">
                {BOOSTS_OCCASIONNEL.map(function(b:any){
                  return (
                    <button key={b.id} type="button" onClick={function(){ setSelectedBoost(b.id); }} className="text-left p-3 rounded-xl border-2 bg-white">
                      <div className="flex justify-between">
                        <p className="font-black text-[11px]">{b.label} - {b.prixUSD > 0 ? b.prixUSD+"$" : ""}</p>
                        <p className="text-[9px] font-bold">{b.duree}</p>
                      </div>
                      <p className="text-[9px] opacity-70">{b.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 rounded-2xl p-3 text-[11px] bg-white">
            <p className="font-black">{abIsPaye ? "Actif "+abJours+"j" : "Freemium "+abCount+"/3"}</p>
          </div>
        )}

        <div className="bg-white border-2 rounded-2xl p-3">
          <p className="font-black text-[11px]">Photo</p>
          <input type="file" accept="image/*,video/*" onChange={handlePhoto} className="mt-2 w-full text-[11px]"/>
          {photoPreview ? (
            <div className="mt-3">
              {isVideo ? <video src={photoPreview} controls className="w-full h-52 bg-black rounded-xl"></video> : <img src={photoPreview} alt="preview" className="w-full h-52 object-contain bg-[#FFFBF0] rounded-xl border"/>}
            </div>
          ) : null}
        </div>

        <div className="bg-white border-2 rounded-2xl p-3 space-y-3">
          <input value={form.titre} onChange={function(e:any){ setForm(Object.assign({}, form, {titre:e.target.value})); }} placeholder="Titre ex: Sacs Homme" className="w-full border-2 p-3 rounded-xl text-[13px] font-bold"/>
          <textarea value={form.description} onChange={function(e:any){ setForm(Object.assign({}, form, {description:e.target.value})); }} placeholder="Description" rows={3} className="w-full border-2 p-3 rounded-xl text-[12px]"></textarea>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-black">Prix USD</p>
              <input type="number" value={form.prix} onChange={function(e:any){ setForm(Object.assign({}, form, {prix:e.target.value})); }} className="w-full border-2 p-3 rounded-xl font-black"/>
            </div>
            <div>
              <p className="text-[10px] font-black">CDF auto {TAUX_CDF}</p>
              <div className="w-full border-2 p-3 rounded-xl font-black bg-[#FFFBF0]">{prixCDF.toLocaleString()}</div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black">Activite - {activites.length} options</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {activites.map(function(a:any){
                return (
                  <button key={a.id} type="button" onClick={function(){ setForm(Object.assign({}, form, {activiteId:a.id})); }} className="text-[10px] px-2 py-1 rounded-full border bg-[#FFFBF0]">{
