"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";

export const dynamic = "force-dynamic";

// ✅ TAUX LOCAL - Pas d'import lib/paiement (écran blanc)
const TAUX_CDF = 2300;
const toCDF = (p:any)=>{ const v=Number(p||0); return isNaN(v)?0:Math.round(v*TAUX_CDF); };

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,""); }
function getCurrentUser(){ try{ const r=localStorage.getItem("wenze_user"); return r?JSON.parse(r):null; }catch{ return null; } }
function readList(k:string):any[]{ try{ const r=localStorage.getItem(k); const v=r?JSON.parse(r):[]; return Array.isArray(v)?v:[]; }catch{ return []; } }

function getBoutiqueIdentite(u:any, wa:string){
  const nomBrut = (u?.nomBoutique || u?.boutiqueName || u?.nomEtablissement || u?.name || "").trim();
  const marqueBrut = (u?.marque || u?.slogan || u?.activite || "").trim();
  if(nomBrut.toLowerCase().includes("boutiques") && nomBrut.includes("(")){
    const cleaned = nomBrut.replace(/Boutiques\s+Boutiques/i,"Boutiques").replace(/Boutique\s+Boutiques/i,"Boutiques").trim();
    return {
      nomComplet: cleaned,
      nomCourt: cleaned.split("(")[0].trim(),
      marque: cleaned.match(/\((.*?)\)/)?.[1] || marqueBrut || "Commerce général",
      initial: cleaned.replace(/^Boutiques\s*/i,"").trim()[0]?.toUpperCase() || "B"
    };
  }
  let nomBase = nomBrut.replace(/^Boutiques\s*/i,"").replace(/^Boutique\s*/i,"").split("(")[0].trim();
  if(!nomBase){
    const cat = (u?.categorieId || "").toLowerCase();
    if(cat.includes("vetement") || cat.includes("habillement")) nomBase = "Bilamba";
    else if(cat.includes("agro")) nomBase = "Mamie Wenze";
    else if(cat.includes("electronique")) nomBase = "TechZone Kin";
    else if(cat.includes("beaute")) nomBase = "Beauty Glam";
    else nomBase = wa ? wa.slice(-4) : "Wenze Shop";
  }
  let marqueFinale = marqueBrut.replace(/^Boutiques\s*/i,"").replace(/^Boutique\s*/i,"").trim();
  if(!marqueFinale){
    if(nomBase.toLowerCase().includes("bilamba")) marqueFinale = "Maison d'habillement";
    else if(nomBase.toLowerCase().includes("mamie")) marqueFinale = "Agro & Vivrier";
    else if(nomBase.toLowerCase().includes("techzone")) marqueFinale = "Téléphonie & Accessoires";
    else if(nomBase.toLowerCase().includes("beauty")) marqueFinale = "Cosmétiques & Mèches";
    else marqueFinale = "Commerce général";
  }
  return {
    nomComplet: `Boutiques ${nomBase} (${marqueFinale})`,
    nomCourt: `Boutiques ${nomBase}`,
    marque: marqueFinale,
    initial: nomBase[0]?.toUpperCase() || "B"
  };
}

/* ---------- PARTAGE BOUTIQUE IMAGE + LIEN ---------- */
function shareBoutiqueImage(b:any, waSearch:string, annoncesCount:number){
  try{
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFBF0"; ctx.fillRect(0,0,1080,1350);
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,1080,120);
    ctx.fillStyle = "#fff"; ctx.font = "900 42px Arial"; ctx.textAlign = "left"; ctx.fillText("WENZE WENZE BUSINESS", 40, 75);
    const finish = (img?: HTMLImageElement)=>{
      if(img){ try{ ctx.drawImage(img, 40, 160, 1000, 700); }catch{ ctx.fillStyle="#eee"; ctx.fillRect(40,160,1000,700); } }
      else { ctx.fillStyle="#eee"; ctx.fillRect(40,160,1000,700); ctx.fillStyle="#000"; ctx.font="200px Arial"; ctx.textAlign="center"; ctx.fillText("🏬", 540, 600); ctx.textAlign="left"; }
      ctx.fillStyle = "#000"; ctx.font = "900 52px Arial";
      ctx.fillText((b.nomComplet||"Boutique").slice(0,30), 40, 940);
      ctx.fillStyle = "#FF6B00"; ctx.font = "900 38px Arial";
      ctx.fillText((b.marque||"Commerce général").slice(0,40), 40, 1000);
      ctx.fillStyle = "#666"; ctx.font = "28px Arial";
      ctx.fillText(`${annoncesCount} annonce(s) • ${b.ville||"Kinshasa"} • 0${waSearch.slice(-9)}`, 40, 1060);
      const base = window.location.origin;
      const lien = `${base}/boutiques/${waSearch}`;
      ctx.fillStyle = "#25D366"; ctx.fillRect(40, 1140, 1000, 110);
      ctx.fillStyle = "#fff"; ctx.font = "900 32px Arial"; ctx.textAlign = "center";
      ctx.fillText("👉 Clique pour voir la boutique", 540, 1210);
      ctx.fillStyle = "#000"; ctx.font = "24px Arial"; ctx.fillText(lien, 540, 1300);
      canvas.toBlob(async (blob)=>{
        if(!blob) return;
        const file = new File([blob], `wenze-boutique-${waSearch}.png`, { type:"image/png" });
        const text = `🏬 ${b.nomComplet} sur Wenze ! ${annoncesCount} annonce(s)\n\n👉 ${lien}`;
        try{
          if(navigator.share && (navigator as any).canShare?.({ files:[file] })){
            await navigator.share({ title: b.nomComplet, text, files:[file] });
          } else {
            const url = URL.createObjectURL(blob);
            const l = document.createElement("a"); l.href=url; l.download=`wenze-boutique-${waSearch}.png`; l.click();
            await navigator.clipboard.writeText(text);
            alert("Image boutique téléchargée + lien copié !");
          }
        }catch{}
      }, "image/png");
    };
    if(b.photo && typeof b.photo==="string" && b.photo.length>10){
      const img = new Image(); img.crossOrigin="anonymous";
      img.onload = ()=> finish(img); img.onerror = ()=> finish();
      img.src = b.photo;
    } else finish();
  }catch{}
}

export default function BoutiquePage(){
  const params = useParams();
  const rawId = (params?.id as string) || (params?.wa as string) || "";
  let idParam = rawId;
  try{ idParam = decodeURIComponent(rawId); }catch{}
  const waSearch = cleanWa(idParam);
  const fileRef = useRef<HTMLInputElement>(null);

  const [boutique, setBoutique] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"annonces"|"videos">("annonces");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [lightbox, setLightbox] = useState<any>(null);
  // 🎁 INVITATION - Est-ce ma filleule ? Qui est son parrain ?
  const [invitation, setInvitation] = useState<any>(null);
  const [isMyFilleul, setIsMyFilleul] = useState(false);

  const refresh = ()=>{
    try{
      const u = getCurrentUser(); setCurrentUser(u);
      const allUsers = readList("wenze_all_users");
      let found = allUsers.find((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp||x.id)===waSearch || x.id===idParam);
      if(!found && u && cleanWa(u.ownerWhatsapp||u.whatsapp||u.id)===waSearch) found = u;
      if(!found) found = { nom:idParam, nomEtablissement:idParam, ownerWhatsapp:waSearch, whatsapp:waSearch, categorieId:"commerces-services", ville:"Kinshasa", createdAt: new Date().toISOString() };
      if(found){
        const fixedCat = normalizeCategorie(found.categorieId||"commerces-services");
        const catObj = getCategorieById(fixedCat);
        const identite = getBoutiqueIdentite(found, waSearch);
        found = {...found, ...identite, categorieId:fixedCat, categorieTitre:catObj?.titre||fixedCat, photo: found.photo || found.avatar || "" };
      }
      setBoutique(found);
      const list = readList("wenze_annonces_list");
      const res = list.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===waSearch);
      res.sort((a:any,b:any)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime());
      setAnnonces(res);

      // 🎁 Vérifie invitation: cette boutique a-t-elle été invitée ?
      const invs = readList("wenze_invitations");
      const inv = invs.find((x:any)=> cleanWa(x.invite_wa||x.inviteWa)===waSearch);
      setInvitation(inv||null);
      if(inv && u){
        const myWa = cleanWa(u.ownerWhatsapp||u.whatsapp||u.id);
        setIsMyFilleul(cleanWa(inv.parrain_wa||inv.parrainWa)===myWa);
      } else setIsMyFilleul(false);
      // Si la boutique elle-même a un parrain dans son user
      if(!inv && found?.parrainWa){
        setInvitation({ parrain_wa: found.parrainWa, parrain_nom: found.parrainNom||"Un parrain Wenze", code: found.inviteCode||"", statut: "accepte" });
      }
    }catch{}
    setLoading(false);
  };

  useEffect(()=>{ refresh(); },[waSearch, idParam]);

  const isOwner = useMemo(()=>{
    if(!currentUser) return false;
    return cleanWa(currentUser.ownerWhatsapp||currentUser.whatsapp||currentUser.id)===waSearch || currentUser.id===idParam;
  },[currentUser, waSearch, idParam]);

  const videos = useMemo(()=> annonces.filter(a=> a.video || a.videoUrl || a.mediaType==="video"), [annonces]);

  const handlePhoto = (e:any)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    if(!isOwner){ setToast("⛔ Pas ta boutique"); setTimeout(()=>setToast(null),2500); return; }
    const reader = new FileReader();
    reader.onload = ()=>{
      const url = reader.result as string;
      const updated = { ...boutique, photo: url, avatar: url };
      setBoutique(updated);
      try{
        const me = getCurrentUser();
        if(me){ localStorage.setItem("wenze_user", JSON.stringify({...me, photo:url, avatar:url})); }
        const all = readList("wenze_all_users");
        const idx = all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp||u.id)===waSearch);
        if(idx>=0){ all[idx] = {...all[idx], photo:url, avatar:url}; localStorage.setItem("wenze_all_users", JSON.stringify(all)); }
      }catch{}
      setToast("✅ Photo boutique mise à jour");
      setTimeout(()=>setToast(null),2500);
    };
    reader.readAsDataURL(file);
  };

  const handleWhatsApp = (annonce:any)=>{
    const phone = cleanWa(boutique?.ownerWhatsapp||boutique?.whatsapp||waSearch);
    const msg = `Bonjour ${boutique?.nomComplet}! Sur WENZE WENZE BUSINESS, intéressé par *${annonce.titre}* à ${annonce.prix}$ / ${toCDF(annonce.prix).toLocaleString()} CDF - Marque: ${boutique?.marque} - Précise taille/couleur/qty? - Taux ${TAUX_CDF}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,"_blank");
  };

  const handleDelete = (annonceId:string)=>{
    if(!isOwner){ setToast("⛔ Pas ton annonce"); setTimeout(()=>setToast(null),3000); return; }
    if(!confirm("Supprimer cette annonce ?")) return;
    try{
      const list = readList("wenze_annonces_list");
      localStorage.setItem("wenze_annonces_list", JSON.stringify(list.filter((a:any)=> a.id!==annonceId)));
      setAnnonces(prev=> prev.filter(a=> a.id!==annonceId));
      setToast("✅ Supprimé");
      setTimeout(()=>setToast(null),3000);
    }catch{ setToast("Erreur suppression"); setTimeout(()=>setToast(null),3000); }
  };

  if(loading) return <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center font-black">Chargement...</div>;

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/boutiques" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-black border overflow-hidden">
          {boutique?.photo ? <img src={boutique.photo} className="w-full h-full object-cover"/> : boutique?.initial || "B"}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[13px] truncate">{boutique?.nomComplet || idParam} {isOwner?"• TOI":""}</h1>
          <p className="text-[10px] text-gray-500 truncate"><span className="font-bold text-black">{boutique?.marque}</span> • {boutique?.ville||"Kinshasa"}</p>
        </div>
        {/* 🎁 Badge Filleul dans le header */}
        {isMyFilleul && <span className="bg-orange-500 text-white text-[9px] px-2 py-1 rounded-full font-black whitespace-nowrap">🎁 Filleul</span>}
      </header>

      <div className="p-4">
        {/* BANDE PROFIL AGRANDIE - PHOTO VISIBLE + MODIFIABLE SI OWNER + NOM GRAS */}
        <div className={`bg-white border-2 rounded-[20px] p-4 mb-4 flex gap-3 ${isMyFilleul ? "border-orange-400" : "border-black"}`}>
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-[18px] bg-black text-white flex items-center justify-center text-[26px] font-black border-2 border-black overflow-hidden">
              {boutique?.photo ? <img src={boutique.photo} className="w-full h-full object-cover"/> : boutique?.initial || "B"}
            </div>
            {isOwner && (
              <>
                <button onClick={()=> fileRef.current?.click()} className="absolute -bottom-2 -right-2 bg-white border-2 border-black w-7 h-7 rounded-full flex items-center justify-center text-[12px]">📷</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[15px] leading-tight uppercase">{boutique?.nomComplet}</p>
            <p className="text-[11px] font-bold text-[#FF6B00] mt-1">{boutique?.marque} • {boutique?.ville||"Kinshasa"}</p>
            <p className="text-[10px] text-gray-500 mt-1">0{cleanWa(boutique?.ownerWhatsapp||boutique?.whatsapp||waSearch).slice(-9)} • {annonces.length} activités • {boutique?.categorieTitre}</p>
            {/* 🎁 Info parrain - Qui l'a invitée ? */}
            {invitation && (
              <p className="text-[9px] mt-1 font-bold text-orange-600">
                {isMyFilleul ? `🎁 C'est ta filleule • Invitée par toi • Code ${invitation.code}` : `🎁 Invitée par ${invitation.parrain_nom||"un parrain Wenze"} • Code ${invitation.code||""}`}
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <a href={`https://wa.me/${waSearch}`} target="_blank" className="bg-[#25D366] text-white px-3 py-1.5 rounded-full text-[10px] font-black">💬 WhatsApp</a>
              {isOwner && <Link href="/publier" className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black">+ Publier</Link>}
            </div>
            {isOwner && <p className="text-[9px] text-gray-400 mt-1.5">Clique 📷 pour changer ta photo boutique</p>}
          </div>
        </div>

        {/* 📤 Partage Boutique + Inviter - Toujours visible */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={()=>shareBoutiqueImage(boutique, waSearch, annonces.length)} className="bg-black text-white py-3 rounded-full font-black text-[10px]">📤 Partager Boutique</button>
          <Link href="/inviter" className="bg-[#FFF2CC] border-2 border-black py-3 rounded-full font-black text-[10px] text-center">🎁 Inviter une boutique</Link>
        </div>
        {isMyFilleul && (
          <Link href="/mes-invitations" className="block bg-orange-100 border border-orange-300 rounded-xl p-3 text-center text-[10px] font-bold mb-4">🎁 C'est ta filleule → Voir dans Mes Invitations</Link>
        )}

        {toast && <div className="mb-3 bg-black text-white p-3 rounded-xl text-[10px] font-bold text-center">{toast}</div>}

        <div className="flex gap-2 mb-4">
          <button onClick={()=> setTab("annonces")} className={`flex-1 py-3 rounded-full font-black text-[11px] border-2 ${tab==="annonces" ? "bg-black text-white border-black" : "bg-white"}`}>📸 Annonces ({annonces.length})</button>
          <button onClick={()=> setTab("videos")} className={`flex-1 py-3 rounded-full font-black text-[11px] border-2 ${tab==="videos" ? "bg-black text-white border-black" : "bg-white"}`}>🎬 Vidéos ({videos.length})</button>
        </div>

        {tab==="annonces" ? (
          <div className="grid gap-3">
            {annonces.length===0 ? <div className="bg-white border-2 border-dashed rounded-[20px] p-6 text-center"><p className="font-black text-[11px]">Pas d'activités pour {boutique?.nomComplet}</p><Link href="/inviter" className="mt-3 inline-block bg-black text-white px-4 py-2 rounded-full font-black text-[10px]">🎁 Inviter une boutique</Link></div> :
              annonces.map((a:any)=>(
                <div key={a.id} className="bg-white border-2 rounded-[20px] p-3 flex gap-3">
                  <div className="relative w-24 h-24 bg-gray-50 rounded-xl overflow-hidden border shrink-0 cursor-pointer" onClick={()=>setLightbox(a)}>
                    {a.video || a.videoUrl ? <video src={a.video||a.videoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata"/> : a.photo ? <img src={a.photo} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center">📦</div>}
                    {(a.video||a.videoUrl) && <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded-full">▶ VIDEO</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black truncate">{a.titre}</p>
                    <p className="text-[9px] text-gray-500">{a.commune||boutique?.ville} • {boutique?.marque}</p>
                    <p className="text-[11px] font-black mt-1">{a.prix}$ / {toCDF(a.prix).toLocaleString()} CDF</p>
                    <button onClick={()=>handleWhatsApp(a)} className="w-full mt-2 bg-[#25D366] text-white py-2 rounded-full font-black text-[9px]">💬 WhatsApp - {boutique?.nomCourt}</button>
                    <div className="flex gap-2 mt-2">
                      <Link href={`/produit/${a.id}`} className="flex-1 bg-white border-2 border-black py-2 rounded-full font-black text-[9px] text-center">👁️ Voir</Link>
                      {isOwner && <Link href={`/publier?edit=${a.id}`} className="flex-1 bg-black text-white py-2 rounded-full font-black text-[9px] text-center">✏️ Edit</Link>}
                    </div>
                    {isOwner && <button onClick={()=>handleDelete(a.id)} className="mt-2 text-[8px] text-red-600 font-black border border-red-200 px-3 py-1 rounded-full">🗑️ Supprimer</button>}
                  </div>
                </div>
              ))
            }
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {videos.length===0 ? <div className="col-span-2 bg-white border-2 border-dashed rounded-[20px] p-6 text-center"><p className="font-black text-[11px]">Pas de vidéos</p></div> :
              videos.map((a:any)=>(
                <div key={a.id} className="bg-white border rounded-xl overflow-hidden">
                  <video src={a.video||a.videoUrl} controls playsInline className="w-full aspect-square object-cover bg-black"/>
                  <div className="p-2"><p className="font-bold text-[11px] truncate">{a.titre}</p><p className="text-[10px]">{a.prix}$</p></div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4" onClick={()=>setLightbox(null)}>
          <button className="self-end bg-white w-9 h-9 rounded-full font-black mb-2">✕</button>
          {lightbox.video||lightbox.videoUrl ? <video src={lightbox.video||lightbox.videoUrl} controls autoPlay className="max-w-full max-h-[70vh] rounded-xl"/> : <img src={lightbox.photo} className="max-w-full max-h-[70vh] rounded-xl object-contain"/>}
          <p className="text-white font-black text-[13px] mt-3 text-center">{lightbox.titre} - {lightbox.prix}$</p>
          <button onClick={(e)=>{e.stopPropagation(); handleWhatsApp(lightbox);}} className="mt-3 bg-[#25D366] text-white px-6 py-3 rounded-full font-black text-[12px]">💬 Commander sur WhatsApp</button>
        </div>
      )}

      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-[9px] font
