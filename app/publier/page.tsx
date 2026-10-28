"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString, verifierAbonnement, getPrixByCategorie } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

function cleanWa(n:string){ return (n||"").toString().replace(/[^0-9]/g,""); }
function getCurrentUser(){ try{ const raw=localStorage.getItem("wenze_user"); return raw?JSON.parse(raw):null; }catch{ return null; } }

const BOOSTS_OCCASIONNEL = [
  { id:"free", label:"Gratuit", prixUSD:0, prixCDF:0, duree:"Essai 7j / 3 vie", desc:"Sans boost - Visible normal - Sans 🔔 notif clients" },
  { id:"boost-1", label:"Boost 24h", prixUSD:1, prixCDF:2300, duree:"24h TOP", desc:"1$ / 2300 CDF - Top feed + 🔔 notif clients" },
  { id:"boost-3", label:"Boost 3j", prixUSD:3, prixCDF:6900, duree:"3 jours", desc:"3$ / 6900 CDF - Recommandé" },
  { id:"boost-7", label:"Boost 7j", prixUSD:5, prixCDF:11500, duree:"7j MAX", desc:"5$ / 11500 CDF - Max visibilité" },
];
const CATEGORIES_OCCASIONNEL = [
  { id:"telephone", label:"📱 Téléphone" }, { id:"electromenager", label:"🔌 Électroménager" },
  { id:"vetement", label:"👕 Vêtement" }, { id:"meuble", label:"🛋️ Meuble" },
  { id:"moto-velo", label:"🏍️ Moto/Vélo" }, { id:"autre-occasion", label:"📦 Autre occasion" },
];

function PublierContent(){
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const catFromUrl = normalizeCategorie(searchParams.get("cat") || searchParams.get("categorie") || "");
  const modeFromUrl = searchParams.get("mode");

  const [user, setUser] = useState<any>(null);
  const [ab, setAb] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isVideo, setIsVideo] = useState(false);
  const [selectedBoost, setSelectedBoost] = useState("free");
  const [isEditMode, setIsEditMode] = useState(false);
  const [keepDates, setKeepDates] = useState<any>(null);
  const [form, setForm] = useState({ titre:"", description:"", prix:"", categorieId:"commerces-services", activiteId:"", commune:"", ville:"Kinshasa", stock:"1", livraison:"Retrait sur place / Livraison Kinshasa" });

  const isOccasionnel = useMemo(()=> form.categorieId==="client" || modeFromUrl==="occasionnel" || catFromUrl==="client" || form.categorieId==="vente-occasionnelle", [form.categorieId, modeFromUrl, catFromUrl]);

  // 1. CHARGEMENT USER + REGLES STRICTES + EDIT MODE
  useEffect(()=>{
    const u = getCurrentUser();
    if(!u){ router.push("/connexion?next=/publier"); return; }

    // MODE EDIT - charge annonce existante
    if(editId){
      try{
        const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
        const old = list.find((x:any)=> x.id===editId);
        if(!old){ setToast({msg:"Annonce introuvable", type:"error"}); router.push("/"); return; }
        // REGLE STRICTE - personne ne modifie pour autrui
        const { isOwnerOf } = require("@/lib/auth");
        if(!isOwnerOf(old, u)){
          setToast({msg:"⛔ INTERDIT - Tu ne peux pas modifier annonce d'autrui. Règle stricte WENZE WENZE BUSINESS", type:"error"});
          setTimeout(()=> router.push(`/boutiques/${cleanWa(u.ownerWhatsapp||u.whatsapp)}`), 2000);
          return;
        }
        // Charge données
        setForm({
          titre: old.titre||"", description: old.description||"", prix: String(old.prix||""),
          categorieId: old.categorieId||"commerces-services", activiteId: old.activiteId||"",
          commune: old.commune||"", ville: old.ville||"Kinshasa", stock: String(old.stock||1), livraison: old.livraison||"Retrait sur place"
        });
        setPhotoPreview(old.photo||"");
        setIsVideo(!!old.isVideo);
        setSelectedBoost(old.boostType||"free");
        setKeepDates({ createdAt: old.createdAt||old.created_at, boostUntil: old.boostUntil, expireAt: old.expireAt||old.boostUntil });
        setIsEditMode(true);
        const remaining = old.boostUntil ? Math.ceil((new Date(old.boostUntil).getTime()-Date.now())/86400000) : null;
        if(remaining!==null){
          setToast({msg:`✏️ Mode Modification - Compteur conservé: ${remaining>0?`${remaining}j restant`:"Expiré"} - 5j consommé 3j → reste 2j, ne repart pas à zéro`, type:"success"});
          setTimeout(()=> setToast(null), 5000);
        }
      }catch{}
    }

    const isUserClient = u.role==="client" || u.type==="client" || u.categorieId==="client" || u.categorie==="client" || catFromUrl==="client" || modeFromUrl==="occasionnel";
    const fixedCat = normalizeCategorie(isUserClient ? "client" : (editId ? "" : (catFromUrl || u.categorieId || u.categorie || "commerces-services")));
    const finalCat = isEditMode ? form.categorieId : fixedCat;
    const catObj = getCategorieById(finalCat);
    const prixBoutique = getPrixByCategorie(catObj?.id || finalCat);
    const fullUser = { ...u, categorieId:finalCat, role:isUserClient?"client":"boutique", catObj, prixUSD:isUserClient?0:prixBoutique.prixUSD, prixCDF:isUserClient?0:prixBoutique.prixCDF };
    setUser(fullUser);
    if(!isEditMode){
      setForm(f=> ({ ...f, categorieId:finalCat, activiteId:isUserClient?"vente-occasionnelle":(u.activiteId || catObj?.activites?.[0]?.id || ""), commune:u.commune||f.commune, ville:u.ville||"Kinshasa" }));
    }
    try{
      const v = verifierAbonnement();
      setAb(v);
      if(v.needsPay && !isUserClient && !isEditMode) setToast({msg:`🆓 Freemium ${v.count}/3 vie atteint - Paye ${prixBoutique.prixUSD}$/${prixBoutique.prixCDF.toLocaleString()} CDF`, type:"error"});
      else if(v.isEssai7j && !isUserClient && !isEditMode){ setToast({msg:`⏳ Essai ${v.joursRestants}j - Illimité images only`, type:"success"}); setTimeout(()=>setToast(null),4000); }
    }catch{}
    setLoadingUser(false);
  },[router, catFromUrl, modeFromUrl, editId]);

  const currentCat = useMemo(()=> getCategorieById(form.categorieId), [form.categorieId]);
  const prixInfo = useMemo(()=> getPrixByCategorie(form.categorieId), [form.categorieId]);
  const prixNum = Number(form.prix||0);
  const prixCDF = toCDF(prixNum);
  const boostObj = BOOSTS_OCCASIONNEL.find(b=> b.id===selectedBoost);
  const showToast = (msg:string, type="success")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const handlePhoto = (e:any)=>{
    const file = e.target.files?.[0]; if(!file) return;
    if(file.type.startsWith("video/")){
      if(ab?.media==="image-only" && !isOccasionnel){ showToast("🎥 Vidéo réservée boutique 5$/10$ - Freemium = Images only","error"); return; }
      if(file.size>25*1024*1024){ showToast("Vidéo max 25Mo","error"); return; }
      setIsVideo(true);
      const reader = new FileReader(); reader.onload=()=> setPhotoPreview(reader.result as string); reader.readAsDataURL(file); return;
    }
    setIsVideo(false);
    if(file.size>8*1024*1024){ showToast("Photo max 8Mo","error"); return; }
    const reader = new FileReader();
    reader.onload=()=>{
      const img = new Image();
      img.onload=()=>{
        const canvas=document.createElement("canvas"); const max=800; let w=img.width, h=img.height;
        if(w>h){ if(w>max){ h*=max/w; w=max; } } else { if(h>max){ w*=max/h; h=max; } }
        canvas.width=w; canvas.height=h; canvas.getContext("2d")?.drawImage(img,0,0,w,h);
        setPhotoPreview(canvas.toDataURL("image/jpeg",0.65));
      }; img.src=reader.result as string;
    }; reader.readAsDataURL(file);
  };

  const handlePublish = async ()=>{
    if(!form.titre.trim()||form.titre.trim().length<3){ showToast("Titre min 3 caractères","error"); return; }
    if(!prixNum||prixNum<=0){ showToast("Prix $ requis","error"); return; }
    if(!photoPreview){ showToast("Ajoute 1 photo","error"); return; }
    if(!user){ router.push("/connexion"); return; }

    // REGLES STRICTES
    try{
      const { canPublish, assertCanEdit } = require("@/lib/auth");
      const chk = canPublish(user);
      if(!chk.ok && !isEditMode){ showToast(chk.msg,"error"); setTimeout(()=>router.push(`/abonnement?cat=${form.categorieId}`),1200); return; }
      if(isEditMode && editId){
        const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
        const old = list.find((x:any)=> x.id===editId);
        if(old) assertCanEdit(old, user);
      }
      const v=verifierAbonnement();
      if(v.needsPay && !isOccasionnel && !isEditMode){ showToast(`Freemium 3/3 atteint - Paye ${prixInfo.prixUSD}$`,"error"); setTimeout(()=>router.push(`/abonnement?cat=${form.categorieId}`),1200); return; }
      if(v.media==="image-only" && isVideo && !isOccasionnel){ showToast("Freemium = Images only - Paye 5$/10$ pour vidéo","error"); return; }
    }catch(e:any){ if(e.message?.includes("INTERDIT")){ showToast(e.message,"error"); return; } }

    setSaving(true);
    try{
      const id = isEditMode && editId ? editId : `WENZE-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      const activiteObj=getActiviteById(form.categorieId, form.activiteId);
      const isBoostPayant=isOccasionnel && boostObj && boostObj.prixUSD>0;

      // GARDE COMPTEUR - ne repart pas à zéro
      let boostUntilFinal:any = null;
      if(isEditMode && keepDates?.boostUntil){
        boostUntilFinal = keepDates.boostUntil; // garde 2j restant si 5j consommé 3j
      } else if(isBoostPayant){
        boostUntilFinal = new Date(Date.now()+(selectedBoost==="boost-1"?1:selectedBoost==="boost-3"?3:7)*86400000).toISOString();
      }

      const annonce={
        id, titre:form.titre.trim(), description:form.description.trim()||`${form.titre.trim()} - ${isOccasionnel?"Vente occasionnelle":""} - ${currentCat?.titre||form.categorieId} - Taux ${TAUX_CDF} - WENZE WENZE BUSINESS - 0% commission`,
        prix:prixNum, prixCDF, prixCDFString:toCDFString(prixNum), categorieId:normalizeCategorie(form.categorieId), categorie:normalizeCategorie(form.categorieId),
        activiteId:form.activiteId, activite:activiteObj?.label||form.activiteId, photo:photoPreview, images:[photoPreview], isVideo, media:isVideo?"images-videos":"image-only",
        ownerWhatsapp:cleanWa(user.ownerWhatsapp||user.whatsapp||""), whatsapp:cleanWa(user.ownerWhatsapp||user.whatsapp||""), ownerName:user.nomEtablissement||user.nom||"WENZE WENZE BUSINESS", userId:user.id||cleanWa(user.ownerWhatsapp||""),
        commune:form.commune||user.commune||"Kinshasa", ville:form.ville||"Kinshasa", stock:Number(form.stock||1), livraison:form.livraison,
        boutiquePrixUSD:isOccasionnel?boostObj?.prixUSD:prixInfo.prixUSD, boutiquePrixCDF:isOccasionnel?boostObj?.prixCDF:prixInfo.prixCDF,
        typeVente:isOccasionnel?"occasionnelle":"boutique", boostType:isOccasionnel?selectedBoost:null, boostPrixUSD:isOccasionnel?boostObj?.prixUSD:0,
        boostUntil: boostUntilFinal,
        taux:TAUX_CDF, created_at: keepDates?.createdAt || new Date().toISOString(), createdAt: keepDates?.createdAt || new Date().toISOString(), statut:"actif",
        updatedAt: isEditMode ? new Date().toISOString() : undefined,
      };

      try{
        let list=JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
        if(isEditMode) list = list.filter((x:any)=> x.id!==id);
        list.unshift(annonce);
        try{ localStorage.setItem("wenze_annonces_list", JSON.stringify(list.slice(0,60))); } catch{ localStorage.setItem("wenze_annonces_list", JSON.stringify([annonce, ...list.slice(0,20)])); }
      } catch{ localStorage.setItem("wenze_annonces_list", JSON.stringify([annonce])); }

      try{ localStorage.setItem("wenze_current_produit", JSON.stringify(annonce)); } catch{}
      try{
        const { notifyClientsNewAnnonce, addNotification } = await import("@/lib/notifications");
        notifyClientsNewAnnonce(annonce, user);
        if(isEditMode){
          addNotification({ type:"publication_approved" as any, title:"✏️ Annonce modifiée - Compteur conservé!", message:`${annonce.titre} modifiée! Ton délai pub est conservé: ${keepDates?.boostUntil?`${Math.ceil((new Date(keepDates.boostUntil).getTime()-Date.now())/86400000)}j restant`:"Actif"} - Ne repart pas à zéro - Règle stricte WENZE`, annonceId:id, forUserId: user.id||cleanWa(user.ownerWhatsapp||""), actionUrl:`/produit/${id}`, priority:"high", data:{ annonceId:id } } as any);
        } else {
          addNotification({ type:"publication_approved" as any, title:"🎉 Bienvenue - Publication validée - Expérience WENZE!", message:`Bienvenue dans WENZE WENZE BUSINESS! ${annonce.titre} à ${prixNum}$ validée - Taux ${TAUX_CDF} fixe - 0% commission - ${isOccasionnel?(isBoostPayant?"🔔 Clients notifiés - Boost payant":"Sans notif - Gratuit"):(ab?.isPaye?"🔔 Clients notifiés":"Sans notif - Freemium")} - Vis l'expérience réelle!`, annonceId:id, forUserId: user.id||cleanWa(user.ownerWhatsapp||""), actionUrl:`/produit/${id}`, priority:"high", data:{ annonceId:id } } as any);
        }
      } catch{}

      setShowSuccess({ id:annonce.id, titre:annonce.titre, prix:`${prixNum}$ / ${prixCDF.toLocaleString()} CDF`, type: isEditMode ? `Modifiée - Garde compteur ${keepDates?.boostUntil?`${Math.ceil((new Date(keepDates.boostUntil).getTime()-Date.now())/86400000)}j restant`:"Actif"}` : isOccasionnel?`Vente occasionnelle - ${boostObj?.label} ${boostObj?.prixUSD>0?`${boostObj?.prixUSD}$`:"Gratuit"}`:`Boutique ${prixInfo.prixUSD}$ - ${ab?.isPaye?"Payante":"Freemium"}`, isBoostPayant });
      setSaving(false);

      // Nettoyage edit
      localStorage.removeItem("wenze_edit_annonce");
      localStorage.removeItem("wenze_edit_keep_dates");

      if(isBoostPayant && !isEditMode){ setTimeout(()=>router.push(`/abonnement?cat=client&mode=occasionnel&boost=${selectedBoost}&id=${id}`),2200); }
      else { setTimeout(()=>router.push(`/produit/${id}`),2200); }
    } catch(e){ showToast("Erreur publication - Stockage plein","error"); setSaving(false); }
  };

  if(loadingUser) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[10px] text-gray-400 mt-2">WENZE WENZE BUSINESS...</p></div>;

  const activites = currentCat?.activites || [];

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[340px] w-full p-6 text-center border-2 border-black">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div>
            <h2 className="font-black text-[18px] mt-4">{isEditMode?"Modification approuvée!":"Publication approuvée!"}</h2>
            <p className="text-[11px] text-gray-600">WENZE WENZE BUSINESS - 0% comm</p>
            <div className="bg-[#FFFBF0] border-2 rounded-xl p-3 mt-3 text-left">
              <p className="font-bold text-[13px]">{showSuccess.titre}</p>
              <p className="text-[11px] text-[#6C3CE0] font-black">{showSuccess.prix}</p>
              <p className="text-[10px] text-gray-500 mt-1">{showSuccess.type}</p>
              <p className="text-[9px] text-green-600 font-bold mt-1">🔒 Règle stricte respectée - {isEditMode?"Compteur conservé - Ne repart pas à zéro":"Chacun son profil"}</p>
              <p className="text-[9px] text-gray-400 mt-1">ID: {showSuccess.id}</p>
            </div>
            <p className="text-[10px] text-gray-500 mt-3">{showSuccess.isBoostPayant?`Redirection paiement ${boostObj?.prixUSD}$...`:"Redirection annonce..."}</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href={isEditMode?`/boutiques/${cleanWa(user?.ownerWhatsapp||user?.whatsapp||"")}`:"/"} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-[12px]">WENZE WENZE BUSINESS - {isEditMode?"✏️ Modifier":""} {isOccasionnel?"📦 Vente occasionnelle":"Publier"} - {isOccasionnel?"Client":ab?.isPaye?`✅ ${ab?.label} ${ab?.joursRestants}j`:ab?.isEssai7j?`⏳ Essai ${ab?.joursRestants}j`:`🆓 ${ab?.count||0}/3 vie`}</h1>
          <p className="text-[8px] text-gray-500">{isEditMode?`Mode edit - Garde compteur ${keepDates?.boostUntil?`${Math.ceil((new Date(keepDates.boostUntil).getTime()-Date.now())/86400000)}j restant`:"Actif"} - Règle stricte` : isOccasionnel?"Client perso - Boost 0$/1$/3$/5$ - Taux 2300 - 0% comm":`${currentCat?.icon||"🛍️"} ${currentCat?.titre} • ${prixInfo.prixUSD}$/${prixInfo.prixCDF.toLocaleString()} CDF • ${ab?.media||"image-only"} • Taux ${TAUX_CDF}`}</p>
        </div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-black ${isEditMode?"bg-black text-white":isOccasionnel?"bg-orange-500 text-white":ab?.isPaye?"bg-green-500 text-white":"bg-[#6C3CE0] text-white"}`}>{isEditMode?"EDIT":isOccasionnel?boostObj?.label||"Occasionnel":`${ab?.count||0}/3`}</span>
      </header>

      <div className="p-4 space-y-3">
        {toast && <div className={`p-3 rounded-xl text-[11px] font-bold ${toast.type==="error"?"bg-red-50 text-red-700 border border-red-200":"bg-green-50 text-green-700 border"}`}>{toast.msg}</div>}

        {isEditMode && (
          <div className="bg-black text-white rounded-2xl p-3 border-2 border-black">
            <p className="font-black text-[11px]">✏️ Mode Modification - Règle stricte</p>
            <p className="text-[10px] mt-1 opacity-90">Tu modifies ta propre annonce seulement. Compteur conservé: {keepDates?.boostUntil?`${Math.ceil((new Date(keepDates.boostUntil).getTime()-Date.now())/86400000)}j restant - Ex: 5j pub - 3j consommé = reste 2j`:"Actif"} - Ne repart pas à zéro. Personne ne peut modifier pour autrui.</p>
          </div>
        )}

        {isOccasionnel ? (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-3">
            <p className="font-black text-[12px]">📦 Vente occasionnelle - Compte client</p>
            <p className="text-[10px] text-gray-600 mt-1">Tu es client, pas boutique. Objet perso. Choisis boost pour 🔔 notif clients. 0% commission. Chacun son compte.</p>
            <div className="mt-2">
              <p className="font-black text-[10px]">Type d'objet</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {CATEGORIES_OCCASIONNEL.map(a=>(
                  <button key={a.id} type="button" onClick={()=>setForm({...form, activiteId:a.id})} className={`p-2.5 rounded-xl border-2 text-[11px] font-bold text-left ${form.activiteId===a.id?"bg-black text-white border-black":"bg-white"}`}>{a.label}</button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <p className="font-black text-[10px]">Prix boost - Pour 🔔 notif clients + TOP</p>
              <p className="text-[9px] text-gray-500">Seul boost payant notifie clients. Gratuit = sans notif. Garde compteur si edit.</p>
              <div className="mt-2 grid gap-2">
                {BOOSTS_OCCASIONNEL.map(b=>(
                  <button key={b.id} onClick={()=>setSelectedBoost(b.id)} className={`text-left p-3 rounded-xl border-2 ${selectedBoost===b.id?"bg-black text-white border-black":"bg-white"}`}>
                    <div className="flex justify-between"><p className="font-black text-[11px]">{b.label} {b.prixUSD>0?`- ${b.prixUSD}$ / ${b.prixCDF} CDF`:""}</p><p className="text-[9px] font-bold">{b.duree}</p></div>
         
