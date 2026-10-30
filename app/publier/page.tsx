"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCategorieById, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { FREEMIUM, PALIERS, TAUX_CDF, toCDF, toCDFString, verifierAbonnement, consommerPlace, libererPlace } from "@/lib/paiement";

export const dynamic = "force-dynamic";

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,""); }
function getCurrentUser(){ try{ const r=localStorage.getItem("wenze_user"); return r?JSON.parse(r):null; }catch{ return null; } }
function readList(k:string){ try{ const raw=localStorage.getItem(k)||"[]"; const v=JSON.parse(raw||"[]"); return Array.isArray(v)?v:[];}catch{ return []; } }

function PublierContent(){
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp.get("edit");
  const catFromUrl = normalizeCategorie(sp.get("cat")||"");
  const modeFromUrl = sp.get("mode");
  const ticketFromUrl = sp.get("ticket");

  const [user,setUser] = useState<any>(null);
  const [ab,setAb] = useState<any>(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [toast,setToast] = useState<any>(null);
  const [showSuccess,setShowSuccess] = useState<any>(null);
  const [photos,setPhotos] = useState<string[]>([]);
  const [isVideo,setIsVideo] = useState(false);
  const [isEditMode,setIsEditMode] = useState(false);
  const [keepDates,setKeepDates] = useState<any>(null);
  const [selectedTicketId,setSelectedTicketId] = useState<string>(ticketFromUrl||"");
  const [form,setForm] = useState({ titre:"", description:"", prix:"", categorieId:"commerces-services", activiteId:"", commune:"", ville:"Kinshasa", stock:"1", livraison:"Retrait / Livraison Kin" });

  const isOccasionnel = useMemo(()=> form.categorieId==="client" || modeFromUrl==="occasionnel" || catFromUrl==="client", [form.categorieId, modeFromUrl, catFromUrl]);

  useEffect(()=>{
    const u = getCurrentUser();
    if(!u){ router.push("/connexion?next=/publier"); return; }
    let abCheck:any = null;
    try{ abCheck = verifierAbonnement(); setAb(abCheck); if(abCheck.ticketsActifs?.length && !selectedTicketId){ const avecPlace = abCheck.ticketsActifs.find((t:any)=> t.imagesUsed < t.imagesMax); if(avecPlace) setSelectedTicketId(avecPlace.ticketId); } }catch{}
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
        setKeepDates({ createdAt: old.createdAt, boostUntil: old.boostUntil, ticketId: old.ticketId });
        if(old.ticketId) setSelectedTicketId(old.ticketId);
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
  },[router, editId, catFromUrl, modeFromUrl, isOccasionnel, selectedTicketId]);

  const currentCat:any = useMemo(()=> getCategorieById(form.categorieId)||{}, [form.categorieId]);
  const prixNum = Number(form.prix||0);
  const prixCDF = Number(toCDF(prixNum)||0);

  const selectedTicket = useMemo(()=> ab?.ticketsActifs?.find((t:any)=>t.ticketId===selectedTicketId) || ab?.ticketsOccasionnel?.find((t:any)=>t.ticketId===selectedTicketId), [ab, selectedTicketId]);

  const maxAutoriseGlobal = 50;
  const peutEncorePublier = ab ? ab.peutPublier : false;
  const placesTicket = selectedTicket ? selectedTicket.imagesMax - selectedTicket.imagesUsed : (ab?.placesRestantes||0);

  function showToastFn(msg:string, type="success"){ setToast({msg, type}); setTimeout(()=>setToast(null),4000); }
  function setField(k:string, v:string){ setForm((f:any)=> Object.assign({}, f, {[k]:v})); }

  function handlePhotos(e:any){
    const files = e.target.files ? Array.from(e.target.files) as File[] : [];
    if(!files.length) return;
    // STRICT: check ticket choisi
    if(selectedTicket && photos.length + files.length > (selectedTicket.imagesMax - selectedTicket.imagesUsed + (isEditMode?1:0))){
      showToastFn(`Ticket ${selectedTicket.palierId||'OCC'} ${selectedTicket.dureeId||''}: ${selectedTicket.imagesUsed}/${selectedTicket.imagesMax} places strictes déjà utilisées. Il ne reste que ${selectedTicket.imagesMax - selectedTicket.imagesUsed} places libres sur ${selectedTicket.jours}j. Achète un autre ticket.`, "error");
      return;
    }
    if(!selectedTicket && ab?.isFreemium && photos.length + files.length > ab.imagesRestantes){
      showToastFn(`Freemium ${ab.count}/${FREEMIUM.maxImages} à vie - Il reste ${ab.imagesRestantes} images`, "error");
      return;
    }

    files.forEach((file:File)=>{
      if(file.type.indexOf("video/")===0){
        if(file.size > 60*1024*1024){ showToastFn("Vidéo trop lourde 60Mo max", "error"); return; }
        if(!ab?.isPaye && !isOccasionnel){ showToastFn("Vidéo seulement si ticket STANDARD/PRO/PREMIUM. Freemium = images only", "error"); return; }
        const palier = selectedTicket ? PALIERS[selectedTicket.palierId as any] : null;
        if(palier && palier.videoCount===0){ showToastFn("Ton ticket n'autorise pas vidéo", "error"); return; }
        setIsVideo(true);
        const vr = new FileReader(); vr.onload=()=> setPhotos(prev=> [...prev, vr.result as string].slice(0,4)); vr.readAsDataURL(file);
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
            setPhotos(prev=> [...prev, canvas.toDataURL("image/jpeg",0.65)]);
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
    if(!ab.peutPublier){ showToastFn(ab.isFreemium?`Freemium ${ab.count}/3 à vie atteint`:`Plus de places libres - Achète nouveau ticket`, "error"); return; }
    if(isOccasionnel && !ab.isPaye && !ab.ticketsOccasionnel?.length){ router.push(`/abonnement?mode=occasionnel`); return; }
    if(!isEditMode && ab.isPaye && !selectedTicketId){ showToastFn("Choisis le ticket où publier - Principe strict", "error"); return; }
    if(form.titre.trim().length<3){ showToastFn("Titre 3 caractères min", "error"); return; }
    if(!prixNum){ showToastFn("Prix $ requis", "error"); return; }
    if(!photos.length){ showToastFn("Ajoute au moins 1 photo", "error"); return; }

    setSaving(true);
    try{
      const id = isEditMode && editId ? editId : "WENZE-"+Date.now()+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
      const activiteObj:any = getActiviteById(form.categorieId, form.activiteId);
      const activiteLabel = activiteObj?.label || form.activiteId;
      const createdAtFinal = keepDates?.createdAt || new Date().toISOString();
      const wa = cleanWa(user.ownerWhatsapp||user.whatsapp);
      const catId = normalizeCategorie(form.categorieId);

      // STRICT: consomme place dans ticket choisi si nouveau
      if(!isEditMode && selectedTicketId){
        const ok = consommerPlace(selectedTicketId, id);
        if(!ok){ showToastFn(`Ticket ${selectedTicket?.palierId} plein ou expiré - ${selectedTicket?.imagesUsed}/${selectedTicket?.imagesMax} strictes`, "error"); setSaving(false); return; }
      }

      const annonce = {
        id, titre:form.titre.trim(), description:form.description.trim(), prix:prixNum, prixCDF, prixCDFString: toCDFString(prixNum),
        categorieId:catId, categorie:catId, activiteId:form.activiteId, activite:activiteLabel,
        photo:photos[0], images:photos, isVideo, ownerWhatsapp:wa, whatsapp:wa, ownerName:user.nomEtablissement||user.nom||"WENZE", userId:user.id||wa,
        commune:form.commune||user.commune||"Kinshasa", ville:form.ville||"Kinshasa", stock:Number(form.stock||1), livraison:form.livraison,
        taux:TAUX_CDF, created_at:createdAtFinal, createdAt:createdAtFinal, statut:"actif",
        ticketId: selectedTicketId||null, palierId: selectedTicket?.palierId||ab.palierId||null, freemium: ab.isFreemium,
        expireAt: selectedTicket?.expireAt || ab.expireAt || null,
      };
      let list = readList("wenze_annonces_list");
      if(isEditMode) list = list.filter((x:any)=>x.id!==id);
      const userAnnonces = list.filter((a:any)=>cleanWa(a.ownerWhatsapp||a.whatsapp)===wa);
      if(userAnnonces.length >= 50){
        const sorted = userAnnonces.sort((a:any,b:any)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const oldest = sorted[0];
        // libère place de l'ancienne archivée
        libererPlace(oldest.id);
        list = list.filter((x:any)=>x.id!==oldest.id);
      }
      list.unshift(annonce);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(list.slice(0,200)));
      setShowSuccess({ id:annonce.id, titre:annonce.titre, prix: prixNum+"$ / "+prixCDF.toLocaleString()+" CDF", ticket: selectedTicket });
      setSaving(false);
      setTimeout(()=> router.push("/produit/"+id), 2000);
    }catch{ showToastFn("Stockage plein", "error"); setSaving(false); }
  }

  function handleRemovePhoto(idx:number){
    const removed = photos[idx];
    // Si on supprime une photo locale pas encore publiée, rien
    setPhotos(prev=>prev.filter((_,i)=>i!==idx));
    if(photos.length===1) setIsVideo(false);
  }

  if(loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"></div></div>;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-[340px] w-full p-6 text-center border-2 border-black">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div>
            <h2 className="font-black text-[16px] mt-3">{isEditMode?"Modif OK! Place libérée conservée":"Publié!"}</h2>
            <div className="bg-[#FFFBF0] border-2 rounded-xl p-3 mt-3 text-left">
              <p className="font-bold text-[12px]">{showSuccess.titre}</p>
              <p className="text-[10px] text-[#6C3CE0] font-black">{showSuccess.prix}</p>
              <p className="text-[9px] mt-1">{showSuccess.ticket?`Ticket ${showSuccess.ticket.palierId||'OCC'} ${showSuccess.ticket.dureeId||''} - ${showSuccess.ticket.imagesUsed+1}/${showSuccess.ticket.imagesMax} strictes - Expire ${new Date(showSuccess.ticket.expireAt).toLocaleDateString("fr-FR")}`:`Freemium ${ab?.count||0}/${FREEMIUM.maxImages}`}</p>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href={isEditMode ? `/boutiques/${cleanWa(user?.ownerWhatsapp||"")}` : "/"} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-[10px]">WENZE - {isEditMode?"Modifier":"Publier"} - {ab ? (ab.isCache? "🔒 CACHÉ" : ab.isPaye? `${ab.ticketsActifs?.length||0} tickets ${ab.placesRestantes||0} libres` : `${ab.count}/${FREEMIUM.maxImages}`) : "..."}</h1>
          <p className="text-[8px] text-gray-500">{currentCat.icon||"📦"} {currentCat.titre||form.categorieId} - Strict: 1 ticket = X places sur Y jours</p>
        </div>
        <span className={`text-[8px] px-2 py-1 rounded-full font-black text-white ${ab?.isCache?'bg-red-600':ab?.isPaye?'bg-green-600':'bg-[#6C3CE0]'}`}>{ab?.badge||"..."}</span>
      </header>

      <div className="p-4 space-y-3">
        {toast && (<div className={`p-3 rounded-xl text-[11px] font-bold border ${toast.type==="error"?"bg-red-50 text-red-700 border-red-300":"bg-green-50 text-green-800 border-green-300"}`}>{toast.msg}</div>)}

        {ab?.isCache && (
          <div className="bg-red-600 text-white rounded-2xl p-4 border-2 border-black">
            <p className="font-black text-[12px]">🔒 Compte caché - 30j expirés</p>
            <p className="text-[10px] mt-1">Freemium 3 à vie expiré. Achète un ticket pour réapparaître. Tes anciens tickets restent archivés.</p>
            <Link href="/abonnement" className="mt-3 block w-full bg-white text-black text-center py-3 rounded-full font-black text-[11px]">Payer 5$ / 11.500 CDF - Réapparaître</Link>
          </div>
        )}

        {ab?.isFreemium && ab.imagesRestantes===0 && (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4">
            <p className="font-black text-[11px]">🆓 Freemium 3/3 à vie atteint - Strict</p>
            <p className="text-[9px] mt-1">Tu as utilisé tes 3 places strictes à vie. Achète STANDARD 5$ (1-4 places strictes + 1 vidéo 15s)</p>
            <Link href="/abonnement" className="mt-2 block w-full bg-black text-white text-center py-2 rounded-full font-black text-[10px]">Voir tickets 5$/10$/20$ - Cumulables</Link>
          </div>
        )}

        {ab?.isPaye && (
          <div className="bg-white border-2 border-black rounded-2xl p-3">
            <p className="font-black text-[11px]">🎫 Choisis le ticket où publier - Strict & Interchangeable</p>
            <p className="text-[8px] text-gray-600 mt-1">1 ticket 4 places/7j = tu peux poster 1/j pendant 4j jusqu'à 4/4, pas 4/j. Suppression libère place. Renouvelable. Occasionnel cumulable.</p>
            <div className="mt-3 space-y-2">
              {(ab.ticketsActifs||[]).map((t:any)=>(
                <div key={t.ticketId} onClick={()=>setSelectedTicketId(t.ticketId)} className={`border-2 rounded-xl p-3 cursor-pointer ${selectedTicketId===t.ticketId?"border-black bg-black text-white":"border-gray-200 bg-white"}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-black text-[10px]">{PALIERS[t.palierId]?.badge||"🎫"} {t.palierId} {t.dureeId} - {t.imagesUsed}/{t.imagesMax} places strictes</p>
                      <p className="text-[8px] opacity-80">{t.jours}j strict - Expire {new Date(t.expireAt).toLocaleDateString("fr-FR")} - {Math.ceil((new Date(t.expireAt).getTime()-Date.now())/86400000)}j restants</p>
                    </div>
                    <p className="font-black text-[10px]">{t.imagesMax - t.imagesUsed} libres</p>
                  </div>
                  <div className="mt-1 w-full bg-gray-300 h-1 rounded-full overflow-hidden"><div className="bg-green-500 h-full" style={{width:`${(t.imagesUsed/t.imagesMax)*100}%`}}></div></div>
                </div>
              ))}
              {(ab.ticketsOccasionnel||[]).map((t:any)=>(
                <div key={t.ticketId} onClick={()=>setSelectedTicketId(t.ticketId)} className={`border-2 rounded-xl p-3 cursor-pointer ${selectedTicketId===t.ticketId?"border-purple-600 bg-purple-600 text-white":"border-purple-200 bg-purple-50"}`}>
                  <p className="font-black text-[10px]">🎟️ Occasionnel {t.jours}j - {t.imagesUsed}/{t.imagesMax} places</p>
                  <p className="text-[8px]">Expire {new Date(t.expireAt).toLocaleDateString("fr-FR")}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Link href="/abonnement" className="flex-1 bg-white border-2 border-black py-2 rounded-full text-center font-black text-[9px]">+ Acheter autre ticket - N'écrase pas</Link>
              <Link href="/abonnement?mode=occasionnel" className="flex-1 bg-purple-600 text-white py-2 rounded-full text-center font-black text-[9px]">+ Occasionnel cumulable</Link>
            </div>
            {selectedTicket && <p className="text-[9px] mt-2 font-bold">Ticket choisi: {selectedTicket.palierId||'OCC'} {selectedTicket.dureeId||''} - Reste {placesTicket} places strictes sur {selectedTicket.jours}j - 1 image/j jusqu'à {selectedTicket.imagesMax}</p>}
          </div>
        )}

        {isOccasionnel && !ab?.isPaye && (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-3">
            <p className="font-black text-[10px]">🎟️ Client occasionnel - Pas de freemium - Ticket strict</p>
            <p className="text-[8px] mt-1">1 image = 0.2$/1j ou 1$/7j - Ticket strict cumulable avec tickets pub. Achète ticket occasionnel avant.</p>
            <Link href="/abonnement?mode=occasionnel" className="mt-2 block w-full bg-black text-white text-center py-2 rounded-full font-black text-[10px]">Acheter ticket occasionnel</Link>
          </div>
        )}

        <div className="bg-white border-2 rounded-2xl p-3">
          <div className="flex justify-between items-center">
            <p className="font-black text-[11px]">Photos (strict selon ticket choisi)</p>
            <p className="text-[9px] bg-gray-100 px-2 py-1 rounded-full font-bold">{photos.length} / {selectedTicket ? selectedTicket.imagesMax - selectedTicket.imagesUsed + (isEditMode?1:0) : ab?.isFreemium?ab.imagesRestantes:4}</p>
          </div>
          <p className="text-[8px] text-gray-500 mt-1">{selectedTicket ? `Ticket ${selectedTicket.palierId} ${selectedTicket.dureeId}: ${selectedTicket.imagesUsed}/${selectedTicket.imagesMax} strictes - Tu peux poster 1/j jusqu'à ${selectedTicket.imagesMax}` : ab?.isFreemium?`Freemium ${ab.count}/${FREEMIUM.maxImages} à vie strictes`:`Choisis un ticket`}</p>
          <input type="file" accept="image/*,video/*" multiple onChange={handlePhotos} className="mt-2 w-full text-[11px]" disabled={!peutEncorePublier || ab?.isCache || (ab?.isPaye && !selectedTicketId)} />
          {photos.length>0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((p,i)=>(
                <div key={i} className="relative">
                  {isVideo && i===0 ? <video src={p} className="w-full h-20 bg-black rounded-lg object-cover"/> : <img src={p} alt="" className="w-full h-20 object-cover rounded-lg border"/>}
                  <button o
