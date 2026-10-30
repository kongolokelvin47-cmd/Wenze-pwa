"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDFString, verifierAbonnement, PALIERS, isCompteCache, libererPlace } from "@/lib/paiement";

export const dynamic = "force-dynamic";
const DAY_MS = 86400000;
const cleanWa = (n: any) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const safeGet = (k:string)=>{ try{ return typeof window!=="undefined"?localStorage.getItem(k):null; }catch{return null;} };
const readList = (k:string):any[]=>{ try{ const raw=safeGet(k); if(!raw) return []; const v=JSON.parse(raw); return Array.isArray(v)?v:[]; }catch{return[];} };
const createdTime = (a:any)=>{ try{ return new Date(a.createdAt||a.created_at||a.updatedAt||0).getTime(); }catch{return 0;} };

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [abInfo, setAbInfo] = useState<any>(null);
  const [solde, setSolde] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nom:"", commune:"", ville:"Kinshasa", nomEtablissement:"", categorieId:"commerces-services", activiteId:"", bio:"", photo:"" });

  useEffect(()=>{
    try {
      const raw = safeGet("wenze_user");
      if(!raw){ router.push("/connexion?next=/profil"); return; }
      const u = JSON.parse(raw);
      const fixedCat = normalizeCategorie(u.categorieId||u.categorie||"commerces-services");
      const catObj: any = getCategorieById(fixedCat);
      setUser({ ...u, categorieId:fixedCat, catObj });
      let firstAct = catObj?.activites?.[0]?.id || "";
      setEditForm({
        nom: u.nom||"", commune: u.commune||"", ville: u.ville||"Kinshasa",
        nomEtablissement: u.nomEtablissement||u.nom||"", categorieId:fixedCat,
        activiteId: u.activiteId||u.activite||firstAct, bio: u.bio||"", photo: u.photo||""
      });

      const myWa = cleanWa(u.ownerWhatsapp||u.whatsapp);
      const mine = readList("wenze_annonces_list")
        .filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===myWa)
        .sort((a:any,b:any)=> createdTime(b)-createdTime(a));
      setAnnonces(mine);

      const total = readList("wenze_commandes_list")
        .filter((c:any)=> cleanWa(c.vendeur_whatsapp||c.ownerWhatsapp)===myWa)
        .reduce((sum:number,c:any)=> sum+Number(c.total||c.totalUSD||0),0);
      setSolde(total);

      try{ const ab=verifierAbonnement(); setAbInfo(ab); }catch{}
    } catch{ router.push("/connexion"); }
  },[router]);

  const stats = useMemo(()=>({ annonces:annonces.length, solde }),[annonces,solde]);
  const showToast = (msg:string,type="success")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),3500); };
  const setField = (k:string,v:string)=> setEditForm(f=>({ ...f, [k]:v }));

  const handlePhoto = (e:any)=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(file.size>5*1024*1024){ showToast("Photo 5Mo max","error"); return; }
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const max=400; let w=img.width,h=img.height;
        if(w>h&&w>max){ h=(h*max)/w; w=max; } else if(h>=w&&h>max){ w=(w*max)/h; h=max; }
        const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext("2d"); if(ctx) ctx.drawImage(img,0,0,w,h);
        setField("photo", canvas.toDataURL("image/jpeg",0.7));
      };
      img.src=reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = ()=>{
    if(!user) return;
    if(!editForm.nom.trim()){ showToast("Nom obligatoire","error"); return; }
    setSaving(true);
    try{
      const fixedCat=normalizeCategorie(editForm.categorieId);
      const activiteObj:any = getActiviteById(editForm.activiteId) || (getCategorieById(fixedCat) as any)?.activites?.find((x:any)=>x.id===editForm.activiteId);
      const updated={ ...user, nom:editForm.nom.trim(), commune:editForm.commune, ville:editForm.ville, nomEtablissement:editForm.nomEtablissement||editForm.nom, categorieId:fixedCat, categorie:fixedCat, activiteId:editForm.activiteId, activite:activiteObj?.titre||activiteObj?.label||editForm.activiteId, bio:editForm.bio, photo:editForm.photo, catObj:getCategorieById(fixedCat), updatedAt:new Date().toISOString() };
      localStorage.setItem("wenze_user", JSON.stringify(updated));
      try{
        const all=readList("wenze_all_users");
        const wa=cleanWa(user.ownerWhatsapp||user.whatsapp);
        const idx=all.findIndex((x:any)=>cleanWa(x.ownerWhatsapp||x.whatsapp)===wa);
        if(idx>=0) all[idx]={...all[idx],...updated}; else all.push(updated);
        localStorage.setItem("wenze_all_users", JSON.stringify(all));
      }catch{}
      setUser(updated); setEditing(false); showToast("Profil enregistré V6.4","success");
    }catch(e:any){ showToast(e.message||"Erreur","error"); }
    setSaving(false);
  };

  const handleEditAnnonce = (a:any)=>{
    let remaining=null; if(a.boostUntil){ try{ remaining=Math.ceil((new Date(a.boostUntil).getTime()-Date.now())/DAY_MS);}catch{} }
    if(typeof window!=="undefined"){
      localStorage.setItem("wenze_edit_annonce", JSON.stringify({...a,_remainingDays:remaining}));
      localStorage.setItem("wenze_edit_keep_dates", JSON.stringify({createdAt:a.createdAt||a.created_at,boostUntil:a.boostUntil}));
    }
    router.push("/publier?edit="+a.id);
  };

  const handleDeleteAnnonce = (id:string)=>{
    if(!confirm("Supprimer cette annonce ?\n\nV6: Suppression libère 1 place immédiatement - Max 50 actives")) return;
    const filtered=readList("wenze_annonces_list").filter((a:any)=>a.id!==id);
    if(typeof window!=="undefined") localStorage.setItem("wenze_annonces_list", JSON.stringify(filtered));
    setAnnonces(prev=>prev.filter((a:any)=>a.id!==id));
    try{ libererPlace(id); }catch{}
    showToast("Annonce supprimée - 1 place libérée V6.4","success");
  };

  if(!user) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Chargement profil V6 - Taux {TAUX_CDF}...</p></div>;

  const cat:any = user.catObj||getCategorieById(user.categorieId)||CATEGORIES_WENZE[0]||{};
  const formCat:any = getCategorieById(editForm.categorieId);
  const activites:any[] = formCat?.activites||[];

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[16px]">Mon compte V6.4</h1><p className="text-[10px] text-gray-500">{cat.icon} {cat.titre} • Même ticket ⭐5$ 🚀10$ 👑20$ • Taux {TAUX_CDF} • 0% comm</p></div>
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black ${abInfo?.isPaye?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"} ${abInfo?.isCache?"bg-red-100 text-red-700":""}`}>{abInfo?.badge||"🆓"} {abInfo?.palierId||"Freemium"}{abInfo?.isCache?" 🔒":""}</span>
      </header>

      <div className="p-4 space-y-4">
        {toast&&<div className={`p-3 rounded-xl text-[12px] font-bold border ${toast.type==="error"?"bg-red-50 border-red-300 text-red-700":"bg-green-50 border-green-300 text-green-700"}`}>{toast.msg}</div>}

        <div className="bg-white border rounded-3xl p-5 shadow-sm">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-full bg-[#FFFBF0] border-2 flex items-center justify-center overflow-hidden text-3xl shrink-0">{user.photo?<img src={user.photo} alt={user.nom} className="w-full h-full object-cover"/>:<span>{cat.icon}</span>}</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[15px] truncate">{user.nomEtablissement||user.nom} <span className="text-[8px] bg-green-500 text-white px-2 py-0.5 rounded-full">MOI</span> <span className="text-[8px] bg-black text-white px-2 py-0.5 rounded-full">isOwner WA</span></p>
              <p className="text-[11px] text-gray-600">{user.commune||"Commune"} - {user.ville||"Kinshasa"}</p>
              <p className="text-[11px] text-gray-600">WA {cleanWa(user.ownerWhatsapp||user.whatsapp).slice(-9)} • {abInfo?.placesRestantes||0} places libres / {abInfo?.maxPlaces||50} max</p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <Link href="/portefeuille" className="text-[11px] bg-black text-white px-3.5 py-1.5 rounded-full font-bold">{solde}$ • {toCDFString(solde)} • Solde</Link>
                <span className={`text-[11px] px-3.5 py-1.5 rounded-full font-bold ${abInfo?.isPaye?"bg-green-100 text-green-700 border":"bg-orange-100 text-orange-700 border"} ${abInfo?.isCache?"bg-red-100 text-red-700":""}`}>{abInfo?`${abInfo.badge} ${abInfo.palierId} • ${abInfo.joursRestants||0}j • ${abInfo.totalAnnonces||0}/${abInfo.maxPlaces||50}`:"🆓 Freemium 3 à vie 30j"}</span>
              </div>
            </div>
          </div>

          {abInfo?.isCache&&<div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700">🔒 Compte caché V6 - Freemium 30j expiré + 0 ticket actif - Tes {annonces.length} annonces non visibles - Active ticket 5$ ({toCDFString(5)}) pour réapparaître immédiatement - Max 50 - 0% comm</div>}

          {editing?(
            <div className="mt-5 space-y-3 border-t pt-5">
              <input value={editForm.nom} onChange={e=>setField("nom",e.target.value)} placeholder="Nom complet *" className="w-full border rounded-xl p-3.5 text-[13px] focus:ring-2 focus:ring-black outline-none" />
              <input value={editForm.nomEtablissement} onChange={e=>setField("nomEtablissement",e.target.value)} placeholder="Nom boutique" className="w-full border rounded-xl p-3.5 text-[13px] focus:ring-2 focus:ring-black outline-none" />
              <div className="w-full border rounded-xl p-3.5 text-[13px] bg-gray-100">WhatsApp : {cleanWa(user.ownerWhatsapp||user.whatsapp)} (clé unique non modifiable)</div>
              <div className="grid grid-cols-2 gap-2">
                <input value={editForm.commune} onChange={e=>setField("commune",e.target.value)} placeholder="Commune" className="border rounded-xl p-3.5 text-[13px] focus:ring-2 focus:ring-black outline-none" />
                <input value={editForm.ville} onChange={e=>setField("ville",e.target.value)} placeholder="Ville" className="border rounded-xl p-3.5 text-[13px] focus:ring-2 focus:ring-black outline-none" />
              </div>
              <textarea value={editForm.bio} onChange={e=>setField("bio",e.target.value)} placeholder="Bio boutique..." rows={3} className="w-full border rounded-xl p-3.5 text-[13px] focus:ring-2 focus:ring-black outline-none resize-none"></textarea>
              <div><p className="text-[11px] font-black">Catégorie - Même ticket pour tous</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CATEGORIES_WENZE.map((c:any)=>{
                    const firstId=c.activites?.[0]?.id||""; const sel=editForm.categorieId===c.id;
                    return <button key={c.id} type="button" onClick={()=>setEditForm(f=>({...f,categorieId:c.id,activiteId:firstId}))} className={`text-left p-3 rounded-xl border-2 text-[11px] font-bold ${sel?"bg-black text-white border-black":"bg-white border-gray-200"}`}><p>{c.icon} {c.titreCourt||c.titre}</p><p className="text-[9px] opacity-70 mt-1">Même prix • 0% comm</p></button>;
                  })}
                </div>
              </div>
              <div><p className="text-[11px] font-black">Activité</p>
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {activites.map((a:any)=>{ const sel=editForm.activiteId===a.id; return <button key={a.id} type="button" onClick={()=>setField("activiteId",a.id)} className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition ${sel?"bg-black text-white border-black":"bg-gray-50 border-gray-200"}`}>{a.titre||a.label}</button>; })}
                </div>
              </div>
              <div><p className="text-[11px] font-black">Photo profil (400px, JPEG 70%)</p><input type="file" accept="image/*" onChange={handlePhoto} className="mt-2 text-[11px]" />{editForm.photo&&<img src={editForm.photo} alt="Aperçu" className="mt-3 w-24 h-24 rounded-full object-cover border-2" />}</div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button type="button" onClick={()=>setEditing(false)} className="bg-white border-2 p-3.5 rounded-xl font-bold text-[12px]">Annuler</button>
                <button type="button" onClick={handleSave} disabled={saving} className="bg-black text-white p-3.5 rounded-xl font-black text-[12px] disabled:opacity-50">{saving?"Enregistrement...":"💾 Enregistrer"}</button>
              </div>
            </div>
          ):(
            <button type="button" onClick={()=>setEditing(true)} className="mt-5 w-full bg-black text-white py-3.5 rounded-full font-black text-[12px]">✏️ Modifier mon profil - V6 isOwner() sécurisé</button>
          )}
        </div>

        <div className="bg-black text-white rounded-2xl p-4">
          <div className="flex justify-between items-center">
            <div><p className="font-black text-[13px] flex items-center gap-2">{cat.icon} {abInfo?.badge||"🆓"} {abInfo?.palierId||"Freemium"} • {abInfo?.joursRestants||0}j restants</p><p className="text-[10px] opacity-70 mt-1">{abInfo?.placesRestantes||0} places libres / {abInfo?.maxPlaces||50} max • {abInfo?.totalAnnonces||annonces.length} actives • Taux {TAUX_CDF} • 0% comm</p></div>
            <Link href={`/abonnement?cat=${user.categorieId}`} className="bg-white text-black px-5 py-2.5 rounded-full font-black text-[11px]">🎫 Payer ticket</Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Object.entries(PALIERS).map(([k,v]:any)=>(
              <div key={k} className={`rounded-xl p-2.5 text-center border ${abInfo?.palierId===k?"bg-white text-black border-white":"bg-white/10 border-white/20"}`}>
                <p className="font-black text-[11px]">{v.badge} {k}</p><p className="font-black text-[12px] mt-1">{v.prixUSD}$</p><p className="text-[9px] opacity-80">{toCDFString(v.prixUSD)}</p><p className="text-[9px] font-bold mt-1">{v.places}pl / {v.jours}j</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] opacity-50 mt-3 text-center">1 ticket = X places strictes sur Y jours (pas X/j) - Cumulable - Max 50 - Suppression libère place - Freemium 3 images à vie 30j puis 🔒 caché - Taux {TAUX_CDF} - 0% comm - isOwner = ownerWhatsapp</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border rounded-2xl p-4 text-center"><p className="font-black text-[20px]">{stats.annonces}</p><p className="text-[10px] text-gray-500 mt-1">Annonces<br/>{abInfo?.maxPlaces||50} max</p></div>
          <Link href="/portefeuille" className="bg-white border rounded-2xl p-4 text-center"><p className="font-black text-[20px]">{stats.solde}$</p><p className="text-[10px] text-gray-500 mt-1">Solde<br/>0% comm</p></Link>
          <Link href="/boutiques" className="bg-white border rounded-2xl p-4 text-center"><p className="font-black text-[20px]">{cat.icon}</p><p className="text-[10px] text-gray-500 mt-1">Boutiques<br/>{user.commune||"Kin"}</p></Link>
        </div>

        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center"><p className="font-black text-[13px]">Mes annonces V6 - {annonces.length}/{abInfo?.maxPlaces||50}</p><Link href="/publier" className="bg-black text-white text-[11px] px-4 py-2 rounded-full font-black">+ Publier</Link></div>
          <div className="mt-4 grid gap-3">
            {annonces.length===0?(
              <div className="text-center py-10 border-2 border-dashed rounded-2xl"><p className="text-4xl">📦</p><p className="text-[12px] font-bold mt-2">Aucune annonce</p><p className="text-[10px] text-gray-500 mt-1">Freemium 3 images à vie 30j visibles puis 🔒 caché - Active ticket 5$ ({toCDFString(5)}) - Même prix - Max 50 - Suppression libère place</p><Link href="/publier" className="mt-3 inline-block bg-black text-white px-5 py-2.5 rounded-full text-[11px] font-black">Publier première annonce</Link></div>
            ):(
              annonces.map((a:any)=>{
                let remaining=null; if(a.boostUntil){ try{ remaining=Math.ceil((new Date(a.boostUntil).getTime()-Date.now())/DAY_MS);}catch{} }
                const prix=Number(a.prixUSD||a.prix||0);
                return (
                  <div key={a.id} className="flex gap-3 border rounded-2xl p-3 relative hover:shadow transition">
                    <span className={`absolute top-2 right-2 text-[8px] px-2.5 py-1 rounded-full font-bold ${remaining!==null&&remaining>0?"bg-green-100 text-green-700 border":remaining!==null&&remaining<=0?"bg-red-100 text-red-700 border":"bg-black text-white"}`}>{remaining!==null?`${remaining}j restants`:"Actif"}</span>
                    <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden border shrink-0">{a.photo||a.images?.[0]?<img src={a.photo||a.images?.[0]} alt={a.titre} className="w-full h-full object-cover"/>:<span className="text-2xl">📦</span>}</div>
                    <div className="flex-1 min-w-0"><p className="font-bold text-[13px] truncate pr-20">{a.titre}</p><p className="text-[12px] font-black text-orange-600 mt-1">{prix}$ / {toCDFString(prix)} • {a.commune||"Kin"}</p>
                      <div className="flex gap-1.5 mt-3"><button type="button" onClick={()=>handleEditAnnonce(a)} className="flex-1 bg-black text-white text-[10px] px-3 py-2 rounded-full font-bold">✏️ Modifier</button><Link href={`/produit/${a.id}`} className="flex-1 bg-white border text-[10px] px-3 py-2 rounded-full font-bold text-center">👁️ Voir</Link><button type="button" onClick={()=>handleDeleteAnnonce(a.id)} className="bg-red-50 border border-red-200 text-red-600 text-[10px] px-3 py-2 rounded-full font-bold">🗑️</button></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[11px]">Politique Économique Nouvelle V6.4 - 5 étoiles</p>
          <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">On vend <b>VISIBILITÉ</b>, pas catégorie. Même ticket pour tous 🛍️ Détail et 🏭 Gros. 1 ticket = X places <b>strictes</b> sur Y jours (pas X/j). ⭐ STANDARD 5$ ({toCDFString(5)}) = 4 places sur 7j, 🚀 PRO 10$ ({toCDFString(10)}) = 10 places sur 15j, 👑 PREMIUM 20$ ({toCDFString(20)}) = 30 places sur 30j. Freemium 3 images à vie visibles 30j puis 🔒 caché si 0 ticket. Max 50 actives. Suppression libère place immédiatement. Cumulable. Renouvelable. 0% commission. Taux {TAUX_CDF}. isOwner = ownerWhatsapp cleanWa().replace(/^0+/,&quot;&quot;).</p>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/video" className="flex flex-col items-center gap-0.5 text-gray-500"><span className
