"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TAUX_CDF, toCDF } from "@/lib/paiement";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";

export const dynamic = "force-dynamic";

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,""); }
function formatDate(d:any){ try{ return new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}); }catch{ return ""; } }
function getCurrentUser(){ try{ const r=localStorage.getItem("wenze_user"); return r?JSON.parse(r):null; }catch{ return null; } }
function readList(k:string):any[]{ try{ const r=localStorage.getItem(k); const v=r?JSON.parse(r):[]; return Array.isArray(v)?v:[]; }catch{ return []; } }

// FIX TAUTOLOGIE EXPERT - Boutiques Boutique 8889 -> Boutiques 8889
function getBoutiqueIdentite(u:any, wa:string){
  const nomBrut = (u?.nomBoutique || u?.boutiqueName || u?.nomEtablissement || u?.name || "").trim();
  const marqueBrut = (u?.marque || u?.slogan || u?.activite || "").trim();

  // Cas déjà bon: "Boutiques Bilamba (Maison d'habillement)" -> garde, nettoie double
  if(nomBrut.toLowerCase().includes("boutiques") && nomBrut.includes("(")){
    const cleaned = nomBrut.replace(/Boutiques\s+Boutiques/i,"Boutiques").replace(/Boutique\s+Boutiques/i,"Boutiques").trim();
    return {
      nomComplet: cleaned,
      nomCourt: cleaned.split("(")[0].trim(),
      marque: cleaned.match(/\((.*?)\)/)?.[1] || marqueBrut || "Commerce général",
      initial: cleaned.replace(/^Boutiques\s*/i,"").trim()[0]?.toUpperCase() || "B"
    };
  }

  // Nettoie Boutiques + Boutique au singulier
  let nomBase = nomBrut.replace(/^Boutiques\s*/i,"").replace(/^Boutique\s*/i,"").split("(")[0].trim();
  if(!nomBase){
    const cat = (u?.categorieId || "").toLowerCase();
    if(cat.includes("vetement") || cat.includes("habillement")) nomBase = "Bilamba";
    else if(cat.includes("agro")) nomBase = "Mamie Wenze";
    else if(cat.includes("electronique")) nomBase = "TechZone Kin";
    else if(cat.includes("beaute")) nomBase = "Beauty Glam";
    else nomBase = wa ? `8889`.length ? `${wa.slice(-4)}` : "Wenze Shop" : "Wenze Shop";
    // Si wa existe, on met le numéro: ex 8889
    if(wa && nomBase === wa.slice(-4)) nomBase = wa.slice(-4);
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

export default function BoutiquePage(){
  const params = useParams();
  const rawId = (params?.id as string) || (params?.wa as string) || "";
  let idParam = rawId;
  try{ idParam = decodeURIComponent(rawId); }catch{}
  const waSearch = cleanWa(idParam);

  const [boutique, setBoutique] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"annonces"|"videos">("annonces");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [lightbox, setLightbox] = useState<any>(null);

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
    }catch{}
    setLoading(false);
  };

  useEffect(()=>{ refresh(); },[waSearch, idParam]);

  const isOwner = useMemo(()=>{
    if(!currentUser) return false;
    return cleanWa(currentUser.ownerWhatsapp||currentUser.whatsapp||currentUser.id)===waSearch || currentUser.id===idParam;
  },[currentUser, waSearch, idParam]);

  const videos = useMemo(()=> annonces.filter(a=> a.video || a.videoUrl || a.mediaType==="video"), [annonces]);
  const images = useMemo(()=> annonces.filter(a=> !a.video && !a.videoUrl), [annonces]);

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
      </header>

      <div className="p-4">
        {/* BANDE PROFIL AGRANDIE - PHOTO VISIBLE + NOM GRAS */}
        <div className="bg-white border-2 border-black rounded-[20px] p-4 mb-4 flex gap-3">
          <div className="w-20 h-20 rounded-[18px] bg-black text-white flex items-center justify-center text-[26px] font-black border-2 border-black overflow-hidden shrink-0">
            {boutique?.photo ? <img src={boutique.photo} className="w-full h-full object-cover"/> : boutique?.initial || "B"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[15px] leading-tight uppercase">{boutique?.nomComplet}</p>
            <p className="text-[11px] font-bold text-[#FF6B00] mt-1">{boutique?.marque} • {boutique?.ville||"Kinshasa"}</p>
            <p className="text-[10px] text-gray-500 mt-1">0{cleanWa(boutique?.ownerWhatsapp||boutique?.whatsapp||waSearch).slice(-9)} • {annonces.length} activités • {boutique?.categorieTitre}</p>
            <div className="flex gap-2 mt-2">
              <a href={`https://wa.me/${waSearch}`} target="_blank" className="bg-[#25D366] text-white px-3 py-1.5 rounded-full text-[10px] font-black">💬 WhatsApp</a>
              {isOwner && <Link href="/publier" className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black">+ Publier</Link>}
            </div>
          </div>
        </div>

        {/* PANNEAU PRIX ABONNEMENT SUPPRIME - RESTE QUE DANS /tarif */}

        {toast && <div className="mb-3 bg-black text-white p-3 rounded-xl text-[10px] font-bold text-center">{toast}</div>}

        <div className="flex gap-2 mb-4">
          <button onClick={()=> setTab("annonces")} className={`flex-1 py-3 rounded-full font-black text-[11px] border-2 ${tab==="annonces" ? "bg-black text-white border-black" : "bg-white"}`}>📸 Annonces ({annonces.length})</button>
          <button onClick={()=> setTab("videos")} className={`flex-1 py-3 rounded-full font-black text-[11px] border-2 ${tab==="videos" ? "bg-black text-white border-black" : "bg-white"}`}>🎬 Vidéos ({videos.length})</button>
        </div>

        {tab==="annonces" ? (
          <div className="grid gap-3">
            {annonces.length===0 ? <div className="bg-white border-2 border-dashed rounded-[20px] p-6 text-center"><p className="font-black text-[11px]">Pas d'activités pour {boutique?.nomComplet}</p></div> :
              annonces.map((a:any)=>(
                <div key={a.id} className="bg-white border-2 rounded-[20px] p-3 flex gap-3">
                  <div className="w-24 h-24 bg-gray-50 rounded-xl overflow-hidden border shrink-0 cursor-pointer" onClick={()=>setLightbox(a)}>
                    {a.video || a.videoUrl ? <video src={a.video||a.videoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata"/> : a.photo ? <img src={a.photo} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center">📦</div>}
                    {(a.video||a.videoUrl) && <span className="absolute -mt-6 ml-1 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded-full">▶ VIDEO</span>}
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

      {/* LIGHTBOX IMAGE / VIDEO PLEIN ECRAN AU CLIC */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4" onClick={()=>setLightbox(null)}>
          <button className="self-end bg-white w-9 h-9 rounded-full font-black mb-2">✕</button>
          {lightbox.video||lightbox.videoUrl ? <video src={lightbox.video||lightbox.videoUrl} controls autoPlay className="max-w-full max-h-[70vh] rounded-xl"/> : <img src={lightbox.photo} className="max-w-full max-h-[70vh] rounded-xl object-contain"/>}
          <p className="text-white font-black text-[13px] mt-3 text-center">{lightbox.titre} - {lightbox.prix}$</p>
          <button onClick={(e)=>{e.stopPropagation(); handleWhatsApp(lightbox);}} className="mt-3 bg-[#25D366] text-white px-6 py-3 rounded-full font-black text-[12px]">💬 Commander sur WhatsApp</button>
        </div>
      )}

      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-[9px] font-bold whitespace-nowrap">WENZE WENZE BUSINESS • {boutique?.nomComplet}</div>
    </div>
  );
        }
