"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString, verifierAbonnement, getPrixByCategorie } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

function cleanWhatsapp(n: string) { return (n || "").toString().replace(/[^0-9]/g, ""); }
function getCurrentUser() { try{ const raw=localStorage.getItem("wenze_user"); return raw?JSON.parse(raw):null; }catch{ return null; } }

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
  const [form, setForm] = useState({ titre:"", description:"", prix:"", categorieId:"commerces-services", activiteId:"", commune:"", ville:"Kinshasa", stock:"1", livraison:"Retrait sur place / Livraison Kinshasa" });

  const isOccasionnel = useMemo(()=> form.categorieId==="client" || modeFromUrl==="occasionnel" || catFromUrl==="client" || form.categorieId==="vente-occasionnelle", [form.categorieId, modeFromUrl, catFromUrl]);

  useEffect(()=>{
    const u = getCurrentUser();
    if(!u){ router.push("/connexion?next=/publier"); return; }
    const isUserClient = u.role==="client" || u.type==="client" || u.categorieId==="client" || u.categorie==="client" || catFromUrl==="client" || modeFromUrl==="occasionnel";
    const fixedCat = normalizeCategorie(isUserClient ? "client" : (catFromUrl || u.categorieId || u.categorie || "commerces-services"));
    const catObj = getCategorieById(fixedCat);
    const prixBoutique = getPrixByCategorie(catObj?.id || fixedCat);
    const fullUser = { ...u, categorieId:fixedCat, role:isUserClient?"client":"boutique", catObj, prixUSD:isUserClient?0:prixBoutique.prixUSD, prixCDF:isUserClient?0:prixBoutique.prixCDF };
    setUser(fullUser);
    setForm(f=> ({ ...f, categorieId:fixedCat, activiteId:isUserClient?"vente-occasionnelle":(u.activiteId || catObj?.activites?.[0]?.id || ""), commune:u.commune||f.commune, ville:u.ville||"Kinshasa" }));
    try{
      const v = verifierAbonnement();
      setAb(v);
      if(v.needsPay && !isUserClient) setToast({msg:`🆓 Freemium ${v.count}/3 vie atteint - Paye ${prixBoutique.prixUSD}$/${prixBoutique.prixCDF.toLocaleString()} CDF`, type:"error"});
      else if(v.isEssai7j && !isUserClient){ setToast({msg:`⏳ Essai ${v.joursRestants}j - Illimité images only`, type:"success"}); setTimeout(()=>setToast(null),4000); }
    }catch{}
    setLoadingUser(false);
  },[router, catFromUrl, modeFromUrl]);

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
    try{
      const v=verifierAbonnement();
      if(v.needsPay && !isOccasionnel){ showToast(`Freemium 3/3 atteint - Paye ${prixInfo.prixUSD}$`,"error"); setTimeout(()=>router.push(`/abonnement?cat=${form.categorieId}`),1200); return; }
      if(v.media==="image-only" && isVideo && !isOccasionnel){ showToast("Freemium = Images only - Paye 5$/10$ pour vidéo","error"); return; }
    }catch{}
    setSaving(true);
    try{
      const id=`WENZE-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      const activiteObj=getActiviteById(form.categorieId, form.activiteId);
      const isBoostPayant=isOccasionnel && boostObj && boostObj.prixUSD>0;
      const annonce={
        id, titre:form.titre.trim(), description:form.description.trim()||`${form.titre.trim()} - ${isOccasionnel?"Vente occasionnelle":""} - ${currentCat?.titre||form.categorieId} - Taux ${TAUX_CDF} - WENZE WENZE BUSINESS - 0% commission`,
        prix:prixNum, prixCDF, prixCDFString:toCDFString(prixNum), categorieId:normalizeCategorie(form.categorieId), categorie:normalizeCategorie(form.categorieId),
        activiteId:form.activiteId, activite:activiteObj?.label||form.activiteId, photo:photoPreview, images:[photoPreview], isVideo, media:isVideo?"images-videos":"image-only",
        ownerWhatsapp:cleanWhatsapp(user.ownerWhatsapp||user.whatsapp||""), whatsapp:cleanWhatsapp(user.ownerWhatsapp||user.whatsapp||""), ownerName:user.nomEtablissement||user.nom||"WENZE WENZE BUSINESS", userId:user.id||cleanWhatsapp(user.ownerWhatsapp||""),
        commune:form.commune||user.commune||"Kinshasa", ville:form.ville||"Kinshasa", stock:Number(form.stock||1), livraison:form.livraison,
        boutiquePrixUSD:isOccasionnel?boostObj?.prixUSD:prixInfo.prixUSD, boutiquePrixCDF:isOccasionnel?boostObj?.prixCDF:prixInfo.prixCDF,
        typeVente:isOccasionnel?"occasionnelle":"boutique", boostType:isOccasionnel?selectedBoost:null, boostPrixUSD:isOccasionnel?boostObj?.prixUSD:0,
        boostUntil:isOccasionnel&&boostObj&&boostObj.prixUSD>0?new Date(Date.now()+(selectedBoost==="boost-1"?1:selectedBoost==="boost-3"?3:7)*86400000).toISOString():null,
        taux:TAUX_CDF, created_at:new Date().toISOString(), createdAt:new Date().toISOString(), statut:"actif",
      };
      try{
        const list=JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
        list.unshift(annonce);
        try{ localStorage.setItem("wenze_annonces_list", JSON.stringify(list.slice(0,60))); } catch{ localStorage.setItem("wenze_annonces_list", JSON.stringify([annonce, ...list.slice(0,20)])); }
      } catch{ localStorage.setItem("wenze_annonces_list", JSON.stringify([annonce])); }
      try{ localStorage.setItem("wenze_current_produit", JSON.stringify(annonce)); } catch{}
      try{ const {notifyClientsNewAnnonce}=await import("@/lib/notifications"); notifyClientsNewAnnonce(annonce, user); } catch{}
      setShowSuccess({ id:annonce.id, titre:annonce.titre, prix:`${prixNum}$ / ${prixCDF.toLocaleString()} CDF`, type:isOccasionnel?`Vente occasionnelle - ${boostObj?.label} ${boostObj?.prixUSD>0?`${boostObj?.prixUSD}$`:"Gratuit"}`:`Boutique ${prixInfo.prixUSD}$ - ${ab?.isPaye?"Payante":"Freemium"}`, isBoostPayant });
      setSaving(false);
      if(isBoostPayant){ setTimeout(()=>router.push(`/abonnement?cat=client&mode=occasionnel&boost=${selectedBoost}&id=${id}`),2200); }
      else { setTimeout(()=>router.push(`/produit/${id}`),2200); }
    } catch(e){ showToast("Erreur publication - Stockage plein","error"); setSaving(false); }
  };

  if(loadingUser) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[10px] text-gray-400 mt-2">WENZE WENZE BUSINESS...</p></div>;

  const activites = currentCat?.activites || [];
  const isGros = form.categorieId==="gros-autres";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[340px] w-full p-6 text-center border-2 border-black">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div>
            <h2 className="font-black text-[18px] mt-4">Publication approuvée!</h2>
            <p className="text-[11px] text-gray-600">WENZE WENZE BUSINESS</p>
            <div className="bg-[#FFFBF0] border-2 rounded-xl p-3 mt-3 text-left">
              <p className="font-bold text-[13px]">{showSuccess.titre}</p>
              <p className="text-[11px] text-[#6C3CE0] font-black">{showSuccess.prix}</p>
              <p className="text-[10px] text-gray-500 mt-1">{showSuccess.type}</p>
              <p className="text-[9px] text-green-600 font-bold mt-1">🔔 {isOccasionnel?(showSuccess.isBoostPayant?"Clients notifiés - Boost payant":"Pas de notif - Gratuit"):(ab?.isPaye||ab?.isEssai7j?"Clients notifiés - Boutique a droit":"Pas de notif - Freemium")}</p>
              <p className="text-[9px] text-gray-400 mt-1">ID: {showSuccess.id}</p>
            </div>
            <p className="text-[10px] text-gray-500 mt-3">{showSuccess.isBoostPayant?`Redirection paiement ${boostObj?.prixUSD}$...`:"Redirection annonce..."}</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-[12px]">WENZE WENZE BUSINESS - {isOccasionnel?"📦 Vente occasionnelle":"Publier"} - {isOccasionnel?"Client":ab?.isPaye?`✅ ${ab?.label} ${ab?.joursRestants}j`:ab?.isEssai7j?`⏳ Essai ${ab?.joursRestants}j`:`🆓 ${ab?.count||0}/3 vie`}</h1>
          <p className="text-[8px] text-gray-500">{isOccasionnel?"Client perso - Boost 0$/1$/3$/5$ - Taux 2300 - 0% comm":`${currentCat?.icon||"🛍️"} ${currentCat?.titre} • ${prixInfo.prixUSD}$/${prixInfo.prixCDF.toLocaleString()} CDF • ${ab?.media||"image-only"} • Taux ${TAUX_CDF}`}</p>
        </div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-black ${isOccasionnel?"bg-orange-500 text-white":ab?.isPaye?"bg-green-500 text-white":"bg-[#6C3CE0] text-white"}`}>{isOccasionnel?boostObj?.label||"Occasionnel":`${ab?.count||0}/3`}</span>
      </header>

      <div className="p-4 space-y-3">
        {toast && <div className={`p-3 rounded-xl text-[11px] font-bold ${toast.type==="error"?"bg-red-50 text-red-700 border border-red-200":"bg-green-50 text-green-700 border"}`}>{toast.msg}</div>}

        {isOccasionnel ? (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-3">
            <p className="font-black text-[12px]">📦 Vente occasionnelle - Compte client</p>
            <p className="text-[10px] text-gray-600 mt-1">Tu es client, pas boutique. Objet perso. Choisis boost pour 🔔 notif clients. 0% commission.</p>
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
              <p className="text-[9px] text-gray-500">Seul boost payant notifie clients (droit boutique). Gratuit = sans notif.</p>
              <div className="mt-2 grid gap-2">
                {BOOSTS_OCCASIONNEL.map(b=>(
                  <button key={b.id} onClick={()=>setSelectedBoost(b.id)} className={`text-left p-3 rounded-xl border-2 ${selectedBoost===b.id?"bg-black text-white border-black":"bg-white"}`}>
                    <div className="flex justify-between"><p className="font-black text-[11px]">{b.label} {b.prixUSD>0?`- ${b.prixUSD}$ / ${b.prixCDF} CDF`:""}</p><p className="text-[9px] font-bold">{b.duree}</p></div>
                    <p className="text-[9px] opacity-70">{b.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={`border-2 rounded-2xl p-3 text-[11px] ${ab?.isPaye?"bg-green-50 border-green-200":"bg-white border-orange-200"}`}>
            <p className="font-black">{ab?.isPaye?`✅ ${ab?.droits||ab?.label} - Illimité images+vidéos - Droit 🔔 clients`: `🆓 ${ab?.message||"Freemium 3 vie"}`}</p>
            <p className="text-[10px] text-gray-600 mt-1">{ab?.isPaye?"Boost gratuit 1/mois + 🔔 notif auto - Taux 2300":"Freemium 3 vie images only - Sans notif client - Paye 5$ pour notifier"}</p>
          </div>
        )}

        <div className="bg-white border-2 rounded-2xl p-3">
          <p className="font-black text-[11px]">{isOccasionnel?"Photo objet": ab?.media==="image-only"?"Photo - Images only":"Photo / Vidéo"}</p>
          <input type="file" accept={isOccasionnel?"image/*":ab?.media==="image-only"?"image/*":"image/*,video/*"} onChange={handlePhoto} className="mt-2 w-full text-[11px]"/>
          {photoPreview ? (isVideo ? <video src={photoPreview} controls className="mt-3 w-full h-52 bg-black rounded-xl border"/> : <img src={photoPreview} alt="preview" className="mt-3 w-full h-52 object-contain bg-[#FFFBF0] rounded-xl border"/>) : <div className="mt-3 w-full h-32 bg-[#FFFBF0] border-2 border-dashed rounded-xl flex items-center justify-center text-[11px] text-gray-400">Ajoute photo</div>}
        </div>

        <div className="bg-white border-2 rounded-2xl p-3 space-y-3">
          <input value={form.titre} onChange={e=>setForm({...form, titre:e.target.value})} placeholder={isOccasionnel?"Ex: iPhone 12 128Go Ngaba occasion...":"Titre ex: Sacoches Homme..."} className="w-full border-2 p-3 rounded-xl text-[13px] font-bold"/>
          <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder={isOccasionnel?"Etat, raison vente...":"Description..."} rows={3} className="w-full border-2 p-3 rounded-xl text-[12px]"/>

          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-[10px] font-black">Prix USD $</p><input type="number" inputMode="decimal" value={form.prix} onChange={e=>setForm({...form, prix:e.target.value})} placeholder="ex: 15" className="w-full border-2 p-3 rounded-xl text-[13px] font-black text-[#6C3CE0]"/></div>
            <div><p className="text-[10px] font-black">Prix CDF auto {TAUX_CDF}</p><div className="w-full border-2 p-3 rounded-xl text-[13px] font-black bg-[#FFFBF0]">{prixCDF.toLocaleString()} CDF</div></div>
          </div>

          {!isOccasionnel && (
            <>
              <div><p className="text-[10px] font-black">Catégorie boutique</p><div className="mt-1 grid gap-1">{CATEGORIES_WENZE.filter(c=>c.id!=="client").map(c=> (<button key={c.id} type="button" onClick={()=>setForm({...form, categorieId:c.id, activiteId:c.activites?.[0]?.id||""})} className={`text-left p-2.5 rounded-xl border-2 text-[11px] font-bold ${form.categorieId===c.id?"bg-[#6C3CE0] text-white border-[#6C3CE0]":"bg-white"}`}>{c.icon} {c.titre} - {c.prixUSD}$/{c.prixCDF.toLocaleString()} CDF</button>))}</div></div>
              <div><p className="text-[10px] font-black">Activité précise</p><div className="mt-1 flex flex-wrap gap-1 max-h-28 overflow-y-auto">{activites.map((a:any)=> <button key={a.id} type="button" onClick={()=>setForm({...form, activiteId:a.id})} className={`text-[10px] px-2.5 py-1.5 rounded-full font-bold border ${form.activiteId===a.id?"bg-black text-white border-black":"bg-[#FFFBF0]"}`}>{a.label}</button>)}</div></div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <input value={form.commune} onChange={e=>setForm({...form, commune:e.target.value})} placeholder="Commune Gombe" className="border-2 p-3 rounded-xl text-[12px]"/>
            <input value={form.ville} onChange={e=>setForm({...form, ville:e.target.value})} placeholder="Ville Kinshasa" className="border-2 p-3 rounded-xl text-[12px]"/>
          </div>
          <input value={form.stock} onChange={e=>setForm({...form, stock:e.target.value})} placeholder="Stock 1" type="number" className="w-full border-2 p-3 rounded-xl text-[12px]"/>
          <input value={form.livraison} onChange={e=>setForm({...form, livraison:e.target.value})} placeholder="Livraison" className="w-full border-2 p-3 rounded-xl text-[12px]"/>

          <button onClick={handlePublish} disabled={saving} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px] disabled:opacity-50">
            {saving?"Publication...": isOccasionnel ? (boostObj?.prixUSD ? `Publier + Payer ${boostObj.prixUSD}$/${boostObj.prixCDF} CDF - 🔔 Notif` : "Publier Gratuit - Sans notif") : `Publier ${prixNum?`${prixNum}$`:""} - ${ab?.isPaye?"🔔 Notif clients":"Freemium"}`}
          </button>
          <p className="text-[9px] text-gray-500 text-center">Taux {TAUX_CDF} CDF fixe • 0% commission • Pub vidéo 1$/3$/15$ • Rappel J-5 J-1 auto • WENZE WENZE BUSINESS</p>
        </div>
      </div>
    </div>
  );
}

export default function PagePublier(){
  return <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">Chargement WENZE WENZE BUSINESS...</div>}><PublierContent/></Suspense>;
  }
