"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCategorieById, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { FREEMIUM, PALIERS, OCCASIONNEL, TAUX_CDF, toCDF, toCDFString, verifierAbonnement, isCompteCache } from "@/lib/paiement";

export const dynamic = "force-dynamic";
const DAY_MS = 86400000;

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,""); }
function getCurrentUser(){ try{ const r=localStorage.getItem("wenze_user"); return r?JSON.parse(r):null; }catch{ return null; } }
function readList(k:string){ try{ const raw=localStorage.getItem(k)||"[]"; const v=JSON.parse(raw||"[]"); return Array.isArray(v)?v:[];}catch{ return []; } }

function PublierContent(){
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp.get("edit");
  const catFromUrl = normalizeCategorie(sp.get("cat")||"");
  const modeFromUrl = sp.get("mode");

  const [user,setUser] = useState<any>(null);
  const [ab,setAb] = useState<any>(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [toast,setToast] = useState<any>(null);
  const [showSuccess,setShowSuccess] = useState<any>(null);
  const [photos,setPhotos] = useState<string[]>([]); // MULTI IMAGES V5
  const [isVideo,setIsVideo] = useState(false);
  const [isEditMode,setIsEditMode] = useState(false);
  const [keepDates,setKeepDates] = useState<any>(null);
  const [form,setForm] = useState({ titre:"", description:"", prix:"", categorieId:"commerces-services", activiteId:"", commune:"", ville:"Kinshasa", stock:"1", livraison:"Retrait / Livraison Kin" });

  const isOccasionnel = useMemo(()=> form.categorieId==="client" || modeFromUrl==="occasionnel" || catFromUrl==="client", [form.categorieId, modeFromUrl, catFromUrl]);

  useEffect(()=>{
    const u = getCurrentUser();
    if(!u){ router.push("/connexion?next=/publier"); return; }
    
    // Verif abonnement V5
    let abCheck:any = null;
    try{ abCheck = verifierAbonnement(); setAb(abCheck); }catch{}

    // Si compte caché -> bloque direct
    if(abCheck?.isCache){
      // On laisse voir la page mais avec gros bandeau + bouton vers /abonnement
    }

    let old:any = null;
    if(editId){
      try{
        old = readList("wenze_annonces_list").find((x:any)=>x.id===editId)||null;
        if(!old){ setToast({msg:"Annonce introuvable", type:"error"}); setTimeout(()=>router.push("/"),1500); return; }
        const waU = cleanWa(u.ownerWhatsapp||u.whatsapp||u.id);
        const waA = cleanWa(old.ownerWhatsapp||old.whatsapp||old.userId);
        if(waU!==waA && u.id!==old.userId){ setToast({msg:"⛔ Pas ton annonce", type:"error"}); setTimeout(()=>router.push("/"),2000); return; }
        setForm({ titre:old.titre||"", description:old.description||"", prix:String(old.prix||""), categorieId:old.categorieId||"commerces-services", activiteId:old.activiteId||"", commune:old.commune||"", ville:old.ville||"Kinshasa", stock:String(old.stock||1), livraison:old.livraison||"Retrait" });
        setPhotos(old.images?.length?old.images: old.photo?[old.photo]:[]);
        setIsVideo(!!old.isVideo);
        setKeepDates({ createdAt: old.createdAt, boostUntil: old.boostUntil });
        setIsEditMode(true);
      }catch{}
    }

    const baseCat = isOccasionnel ? "client" : catFromUrl || u.categorieId || "commerces-services";
    const fixedCat = normalizeCategorie(baseCat);
    const catObj:any = getCategorieById(fixedCat);
    let firstAct = "";
    if(catObj?.activites?.[0]) firstAct = catObj.activites[0].id;
    setUser({ ownerWhatsapp:u.ownerWhatsapp||u.whatsapp||"", whatsapp:u.whatsapp||"", id:u.id||"", nom:u.nom||"", nomEtablissement:u.nomEtablissement||u.nom||"", commune:u.commune||"", categorieId:fixedCat, role: isOccasionnel?"client":"boutique", catObj });
    if(!old){ setForm((f:any)=> Object.assign({}, f, { categorieId: fixedCat, activiteId: u.activiteId || firstAct, commune: u.commune||f.commune })); }
    setLoading(false);
  },[router, editId, catFromUrl, modeFromUrl, isOccasionnel]);

  const currentCat:any = useMemo(()=> getCategorieById(form.categorieId)||{}, [form.categorieId]);
  const prixNum = Number(form.prix||0);
  const prixCDF = Number(toCDF(prixNum)||0);

  // Limites V5 selon abonnement
  const limiteImages = useMemo(()=>{
    if(!ab) return FREEMIUM.maxImages;
    if(ab.isCache) return 0;
    if(ab.palier?.imagesMax) return ab.palier.imagesMax;
    if(ab.isFreemium) return ab.imagesRestantes; // 3 - count
    return FREEMIUM.maxImages;
  },[ab]);

  const maxAutorise = ab?.palier?.imagesMax || (ab?.isFreemium ? FREEMIUM.maxImages : 50);
  const peutEncorePublier = ab ? ab.peutPublier : false;

  function showToastFn(msg:string, type="success"){ setToast({msg, type}); setTimeout(()=>setToast(null),3500); }
  function setField(k:string, v:string){ setForm((f:any)=> Object.assign({}, f, {[k]:v})); }

  function handlePhotos(e:any){
    const files = e.target.files ? Array.from(e.target.files) as File[] : [];
    if(!files.length) return;
    
    // Check limite V5
    if(photos.length + files.length > maxAutorise){
      showToastFn(`Limite ${maxAutorise} images max pour ${ab?.palier?.nom || 'Freemium'}. Tu as déjà ${photos.length}.`, "error");
      return;
    }

    files.forEach((file:File)=>{
      if(file.type.indexOf("video/")===0){
        if(file.size > 60*1024*1024){ showToastFn("Vidéo trop lourde 60Mo max", "error"); return; }
        // Check video droit V5
        if(!ab?.isPaye && !isOccasionnel){ showToastFn("Vidéo seulement si palier STANDARD/PRO/PREMIUM. Freemium = images only", "error"); return; }
        if(ab?.palier?.videoCount===0){ showToastFn("Ton palier n'autorise pas vidéo", "error"); return; }
        setIsVideo(true);
        const vr = new FileReader(); vr.onload=()=> setPhotos(prev=> [...prev, vr.result as string].slice(0,maxAutorise)); vr.readAsDataURL(file);
      } else {
        if(file.size > 8*1024*1024){ showToastFn("Photo trop lourde 8Mo max", "error"); return; }
        const reader = new FileReader();
        reader.onload=()=>{
          const img = new Image();
          img.onload=()=>{
            const max=800; let w=img.width, h=img.height;
            if(w>h && w>max){ h=(h*max)/w; w=max; } else if(h>=w && h>max){ w=(w*max)/h; h=max; }
            const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
            const ctx=canvas.getContext("2d"); if(ctx) ctx.drawImage(img,0,0,w,h);
            setPhotos(prev=> [...prev, canvas.toDataURL("image/jpeg",0.65)].slice(0,maxAutorise));
          };
          img.src=reader.result as string;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  function handlePublish(){
    if(!ab){ showToastFn("Vérification abonnement...", "error"); return; }
    if(ab.isCache){ router.push("/abonnement"); return; }
    if(!ab.peutPublier){
      if(ab.isFreemium) showToastFn(`Freemium ${ab.count}/3 images à vie atteint. Paye 5$ pour continuer`, "error");
      else showToastFn(`Limite ${maxAutorise} actives atteinte. Archive une ancienne`, "error");
      return;
    }
    if(form.titre.trim().length<3){ showToastFn("Titre 3 caractères min", "error"); return; }
    if(!prixNum){ showToastFn("Prix $ requis", "error"); return; }
    if(!photos.length){ showToastFn("Ajoute au moins 1 photo", "error"); return; }
    if(isOccasionnel && !ab.isPaye){
      // Client occasionnel sans paiement -> redirige vers paiement 0.2$
      router.push(`/abonnement?mode=occasionnel&id=NEW`);
      return;
    }
    setSaving(true);
    try{
      const id = isEditMode && editId ? editId : "WENZE-"+Date.now()+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
      const activiteObj:any = getActiviteById(form.categorieId, form.activiteId);
      const activiteLabel = activiteObj?.label || form.activiteId;
      const createdAtFinal = keepDates?.createdAt || new Date().toISOString();
      const wa = cleanWa(user.ownerWhatsapp||user.whatsapp);
      const catId = normalizeCategorie(form.categorieId);
      const annonce = {
        id, titre:form.titre.trim(), description:form.description.trim(), prix:prixNum, prixCDF, prixCDFString: toCDFString(prixNum),
        categorieId:catId, categorie:catId, activiteId:form.activiteId, activite:activiteLabel,
        photo:photos[0], images:photos, isVideo, ownerWhatsapp:wa, whatsapp:wa, ownerName:user.nomEtablissement||user.nom||"WENZE", userId:user.id||wa,
        commune:form.commune||user.commune||"Kinshasa", ville:form.ville||"Kinshasa", stock:Number(form.stock||1), livraison:form.livraison,
        taux:TAUX_CDF, created_at:createdAtFinal, createdAt:createdAtFinal, statut:"actif",
        palierId: ab.palierId||null, freemium: ab.isFreemium,
      };
      let list = readList("wenze_annonces_list");
      if(isEditMode) list = list.filter((x:any)=>x.id!==id);
      // Enforce 50 max V5: si depasse, archive la plus vieille
      const userWa = wa;
      const userAnnonces = list.filter((a:any)=>cleanWa(a.ownerWhatsapp||a.whatsapp)===userWa);
      if(userAnnonces.length >= 50){
        // Archive plus vieille
        const sorted = userAnnonces.sort((a:any,b:any)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const oldest = sorted[0];
        list = list.filter((x:any)=>x.id!==oldest.id);
      }
      list.unshift(annonce);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(list.slice(0,200)));
      setShowSuccess({ id:annonce.id, titre:annonce.titre, prix: prixNum+"$ / "+prixCDF.toLocaleString()+" CDF" });
      setSaving(false);
      setTimeout(()=> router.push("/produit/"+id), 2000);
    }catch{ showToastFn("Stockage plein", "error"); setSaving(false); }
  }

  if(loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"></div></div>;

  const abCount = ab?.count || 0;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[340px] w-full p-6 text-center border-2 border-black">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div>
            <h2 className="font-black text-[18px] mt-4">{isEditMode?"Modification OK!":"Annonce publiée!"}</h2>
            <div className="bg-[#FFFBF0] border-2 rounded-xl p-3 mt-3 text-left">
              <p className="font-bold text-[13px]">{showSuccess.titre}</p>
              <p className="text-[11px] text-[#6C3CE0] font-black">{showSuccess.prix}</p>
              <p className="text-[9px] mt-1">{ab?.palier ? `${ab.palier.imagesMax} max - TOP ${ab.joursRestants}j` : `Freemium ${abCount}/3`}</p>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href={isEditMode ? `/boutiques/${cleanWa(user?.ownerWhatsapp||"")}` : "/"} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-[11px]">WENZE - {isEditMode?"Modifier":"Publier"} - {ab ? (ab.isCache? "🔒 CACHÉ" : ab.isPaye? `${ab.palierId} ${ab.joursRestants}j` : `${ab.count}/${FREEMIUM.maxImages}`) : "..."}</h1>
          <p className="text-[8px] text-gray-500">{currentCat.icon||"📦"} {currentCat.titre||form.categorieId} - Max {maxAutorise} img - Taux {TAUX_CDF}</p>
        </div>
        <span className={`text-[8px] px-2 py-1 rounded-full font-black text-white ${ab?.isCache?'bg-red-600':ab?.isPaye?'bg-green-600':'bg-[#6C3CE0]'}`}>{ab?.badge||"..."}</span>
      </header>

      <div className="p-4 space-y-3">
        {toast && (<div className={`p-3 rounded-xl text-[11px] font-bold border ${toast.type==="error"?"bg-red-50 text-red-700 border-red-300":"bg-green-50 text-green-800 border-green-300"}`}>{toast.msg}</div>)}

        {/* BANDEAU CACHE V5 */}
        {ab?.isCache && (
          <div className="bg-red-600 text-white rounded-2xl p-4 border-2 border-black">
            <p className="font-black text-[13px]">🔒 Compte caché - 30j expirés</p>
            <p className="text-[11px] mt-1">Tes 3 images gratuites à vie sont expirées depuis 30j. Personne ne te voit. Pour réapparaître, paye un panneau ci-dessous.</p>
            <Link href="/abonnement" className="mt-3 block w-full bg-white text-black text-center py-3 rounded-full font-black text-[12px]">Payer 5$ / 11.500 CDF - Réapparaître</Link>
          </div>
        )}

        {/* BANDEAU FREEMIUM LIMITE */}
        {ab?.isFreemium && ab.imagesRestantes===0 && (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4">
            <p className="font-black text-[12px]">🆓 Freemium 3/3 à vie atteint</p>
            <p className="text-[10px] mt-1">Tu as utilisé tes 3 images gratuites à vie. Pour publier plus, paye STANDARD 5$ (1-4 images + 1 vidéo 15s)</p>
            <Link href="/abonnement" className="mt-2 block w-full bg-black text-white text-center py-2 rounded-full font-black text-[11px]">Voir Paliers 5$/10$/20$</Link>
          </div>
        )}

        {/* BANDEAU CLIENT OCCASIONNEL */}
        {isOccasionnel && (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-3">
            <p className="font-black text-[11px]">🎟️ Client occasionnel - Pas de freemium</p>
            <p className="text-[9px] mt-1">1 image = 0.2$/j ou 1$/7j - Paye avant publication. Anti-spam.</p>
          </div>
        )}

        {/* INFO PALIER */}
        {ab?.isPaye && (
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-3">
            <p className="font-black text-[11px]">{ab.badge} {ab.palier?.nom} actif - {ab.joursRestants}j restants</p>
            <p className="text-[9px] mt-1">Tu peux publier jusqu'à {ab.palier?.imagesMax} images + {ab.palier?.videos} - Max 50 actives (51ème archive auto)</p>
          </div>
        )}

        <div className="bg-white border-2 rounded-2xl p-3">
          <div className="flex justify-between items-center">
            <p className="font-black text-[11px]">Photos / Vidéo (Max {maxAutorise})</p>
            <p className="text-[9px] bg-gray-100 px-2 py-1 rounded-full font-bold">{photos.length}/{maxAutorise}</p>
          </div>
          <p className="text-[9px] text-gray-500 mt-1">{ab?.isFreemium ? "Freemium = images only, 2 photos max par annonce" : ab?.palier ? `${ab.palier.imagesMin}-${ab.palier.imagesMax} images + ${ab.palier.videos}` : ""}</p>
          <input type="file" accept="image/*,video/*" multiple onChange={handlePhotos} className="mt-2 w-full text-[11px]" disabled={!peutEncorePublier || ab?.isCache} />
          {photos.length>0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((p,i)=>(
                <div key={i} className="relative">
                  {isVideo && i===0 ? <video src={p} className="w-full h-20 bg-black rounded-lg object-cover"/> : <img src={p} alt="" className="w-full h-20 object-cover rounded-lg border"/>}
                  <button onClick={()=>setPhotos(prev=>prev.filter((_,idx)=>idx!==i))} className="absolute -top-1 -right-1 bg-red-600 text-white w-5 h-5 rounded-full text-[10px]">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border-2 rounded-2xl p-3 space-y-3">
          <input value={form.titre} onChange={(e:any)=>setField("titre", e.target.value)} placeholder="Titre ex: Sac homme" className="w-full border-2 p-3 rounded-xl text-[13px] font-bold" />
          <textarea value={form.description} onChange={(e:any)=>setField("description", e.target.value)} placeholder="Description main à main" rows={3} className="w-full border-2 p-3 rounded-xl text-[12px]"></textarea>
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-[10px] font-black">Prix USD</p><input type="number" value={form.prix} onChange={(e:any)=>setField("prix", e.target.value)} className="w-full border-2 p-3 rounded-xl font-black" placeholder="5"/></div>
            <div><p className="text-[10px] font-black">Prix CDF</p><div className="w-full border-2 p-3 rounded-xl font-black bg-gray-100 text-[12px]">{prixCDF.toLocaleString()} CDF</div></div>
          </div>
          <button type="button" onClick={handlePublish} disabled={saving || !peutEncorePublier} className="w-full bg-black text-white py-4 rounded-full font-black text-[14px] disabled:opacity-30">
            {saving ? "Publication..." : ab?.isCache ? "🔒 Compte caché - Payer pour publier" : !peutEncorePublier ? `Limite ${maxAutorise} atteinte` : isEditMode ? "Enregistrer" : isOccasionnel ? `Publier occasionnel - 0.2$` : `Publier - ${ab?.palierId||'FREEMIUM'} ${photos.length} img`}
          </button>
          <p className="text-[8px] text-center text-gray-500">0% commission - Vente main à main - Après 30j compte caché - Max 50 actives - Règle: {FREEMIUM.maxImages} images à vie gratuit</p>
        </div>
      </div>
    </div>
  );
}

export default function PublierPage(){
  return <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"></div></div>}><PublierContent/></Suspense>
    }
