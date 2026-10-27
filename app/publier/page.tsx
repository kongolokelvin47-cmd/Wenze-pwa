"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, getPrixByCategorie, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

function cleanWhatsapp(n: string) { return (n || "").toString().replace(/[^0-9]/g, ""); }
function getCurrentUser() {
  try { const raw = localStorage.getItem("wenze_user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function PublierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catFromUrl = normalizeCategorie(searchParams.get("cat") || searchParams.get("categorie") || "");

  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

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

  // Init user + categorie
  useEffect(() => {
    const u = getCurrentUser();
    if(!u){ router.push("/connexion?next=/publier"); return; }
    const fixedCat = normalizeCategorie(catFromUrl || u.categorieId || u.categorie || "commerces-services");
    const catObj = getCategorieById(fixedCat);
    const fullUser = { ...u, categorieId: fixedCat, catObj, prixUSD: catObj ? getPrixByCategorie(catObj.id).prixUSD : 5, prixCDF: catObj ? getPrixByCategorie(catObj.id).prixCDF : 11500 };
    setUser(fullUser);
    setForm(f=> ({ 
      ...f, 
      categorieId: fixedCat, 
      activiteId: u.activiteId || catObj?.activites[0]?.id || "", 
      commune: u.commune || f.commune,
      ville: u.ville || "Kinshasa"
    }));
    setLoadingUser(false);

    // Check abonnement WENZE 2.0 - essai 7j + 30j payé
    try {
      const allAnnonces = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      const myWa = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp || "");
      const mineCount = allAnnonces.filter((a:any)=> cleanWhatsapp(a.ownerWhatsapp||a.whatsapp||"")===myWa).length;
      
      const aboDate = u.abonnementDate ? new Date(u.abonnementDate) : null;
      const created = u.createdAt ? new Date(u.createdAt) : new Date();
      const now = new Date();
      let joursRestants = 0;
      if(aboDate){ 
        const exp = new Date(aboDate.getTime()+30*24*60*60*1000); 
        joursRestants = Math.ceil((exp.getTime()-now.getTime())/(24*60*60*1000));
      } else {
        const diff = Math.ceil((now.getTime()-created.getTime())/(24*60*60*1000));
        joursRestants = 7 - diff;
      }
      const isPaye = joursRestants>0 || !!u.abonnementPaye;
      if(!isPaye && mineCount>=3){
        setToast({ msg: `Limite atteinte ${mineCount}/3 - Paye abonnement ${fullUser.prixUSD}$ / ${fullUser.prixCDF.toLocaleString()} CDF`, type:"error" });
        setTimeout(()=> router.push(`/abonnement?cat=${fixedCat}`), 1500);
      }
    } catch {}
  }, [router, catFromUrl]);

  const currentCat = useMemo(()=> getCategorieById(form.categorieId), [form.categorieId]);
  const prixInfo = useMemo(()=> getPrixByCategorie(form.categorieId), [form.categorieId]);
  const prixNum = Number(form.prix||0);
  const prixCDF = toCDF(prixNum);

  const showToast = (msg:string, type="success")=> { setToast({msg,type}); setTimeout(()=> setToast(null), 3000); };

  const handlePhoto = (e:any)=>{
    const file = e.target.files?.[0]; if(!file) return;
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
    if(!photoPreview){ showToast("Ajoute 1 photo produit","error"); return; }
    if(!user){ router.push("/connexion"); return; }

    setSaving(true);
    try {
      const id = `WENZE-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      const activiteObj = getActiviteById(form.categorieId, form.activiteId);

      const annonce = {
        id,
        titre: form.titre.trim(),
        description: form.description.trim() || `${form.titre.trim()} - ${currentCat?.titre || form.categorieId} authentique Kinshasa - ${activiteObj?.label || form.activiteId} - Taux ${TAUX_CDF} fixe - 0% commission WENZE`,
        prix: prixNum,
        prixCDF,
        prixCDFString: toCDFString(prixNum),
        categorieId: normalizeCategorie(form.categorieId),
        categorie: normalizeCategorie(form.categorieId),
        activiteId: form.activiteId,
        activite: activiteObj?.label || form.activiteId,
        photo: photoPreview,
        images: [photoPreview],
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
        taux: TAUX_CDF,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        statut: "actif",
      };

      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      list.unshift(annonce);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(list));

      // all annonces global
      try {
        const all = JSON.parse(localStorage.getItem("wenze_all_annonces")||"[]");
        all.unshift(annonce);
        localStorage.setItem("wenze_all_annonces", JSON.stringify(all.slice(0,500)));
      } catch {}

      showToast(`Publié ${prixNum}$ / ${prixCDF.toLocaleString()} CDF - Boutique ${prixInfo.prixUSD}$`, "success");
      setTimeout(()=> router.push(`/produit/${id}`), 800);
    } catch(e){ showToast("Erreur publication","error"); setSaving(false); }
  };

  if(loadingUser) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[10px] text-gray-400 mt-2">WENZE 2.0 Publier... Taux {TAUX_CDF}</p></div>;

  const activites = currentCat?.activites || [];
  const isGros = form.categorieId==="gros-autres";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[15px]">Publier - WENZE 2.0</h1><p className="text-[10px] text-gray-500">{currentCat?.icon} {currentCat?.titre} • {prixInfo.prixUSD}$/{prixInfo.prixCDF.toLocaleString()} CDF • Taux {TAUX_CDF} • 0% comm</p></div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-black ${isGros?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixInfo.prixUSD}$</span>
      </header>

      <div className="p-4 space-y-3">
        {toast && <div className={`p-3 rounded-xl text-[12px] font-bold ${toast.type==="error"?"bg-red-50 text-red-700 border border-red-200":"bg-green-50 text-green-700 border border-green-200"}`}>{toast.msg}</div>}

        <div className="bg-white border-2 rounded-2xl p-3">
          <p className="font-black text-[11px]">Photo produit - compress 800px JPEG 75%</p>
          <input type="file" accept="image/*" onChange={handlePhoto} className="mt-2 w-full text-[11px]"/>
          {photoPreview ? <img src={photoPreview} alt="preview" className="mt-3 w-full h-52 object-contain bg-[#FFFBF0] rounded-xl border"/> : <div className="mt-3 w-full h-32 bg-[#FFFBF0] border-2 border-dashed rounded-xl flex items-center justify-center text-[11px] text-gray-400">Ajoute photo - max 8Mo</div>}
        </div>

        <div className="bg-white border-2 rounded-2xl p-3 space-y-3">
          <input value={form.titre} onChange={e=> setForm({...form, titre: e.target.value})} placeholder="Titre ex: Réparation électricité Gombe..." className="w-full border-2 p-3 rounded-xl text-[13px] font-bold"/>
          <textarea value={form.description} onChange={e=> setForm({...form, description: e.target.value})} placeholder="Description qualité Kinshasa, garantie..." rows={3} className="w-full border-2 p-3 rounded-xl text-[12px]"/>
          
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-[10px] font-black">Prix USD $</p><input type="number" inputMode="decimal" value={form.prix} onChange={e=> setForm({...form, prix: e.target.value})} placeholder="ex: 25" className="w-full border-2 p-3 rounded-xl text-[13px] font-black text-[#6C3CE0]"/></div>
            <div><p className="text-[10px] font-black">Prix CDF auto Taux {TAUX_CDF}</p><div className="w-full border-2 p-3 rounded-xl text-[13px] font-black bg-[#FFFBF0]">{prixCDF.toLocaleString()} CDF<br/><span className="text-[9px] text-gray-500">{toCDFString(prixNum)}</span></div></div>
          </div>

          <div>
            <p className="text-[10px] font-black">Catégorie - 2 prix WENZE 2.0</p>
            <div className="mt-1 grid gap-1">
              {CATEGORIES_WENZE.map(c=> (
                <button key={c.id} type="button" onClick={()=> setForm({...form, categorieId: c.id, activiteId: c.activites[0]?.id || ""})} className={`text-left p-2.5 rounded-xl border-2 text-[11px] font-bold ${form.categorieId===c.id ? (c.id==="gros-autres"?"bg-black text-white border-black":"bg-[#6C3CE0] text-white border-[#6C3CE0]") : "bg-white"}`}>{c.icon} {c.titre} - {c.prixUSD}$/{c.prixCDF.toLocaleString()} CDF - {c.id==="commerces-services"?"Électricité, maçon, soudure, coiffure même régime 5$":"Gros, import, prod 10$"}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black">Activité précise - {currentCat?.titreCourt}</p>
            <div className="mt-1 flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {activites.map((a:any)=> <button key={a.id} type="button" onClick={()=> setForm({...form, activiteId: a.id})} className={`text-[10px] px-2.5 py-1.5 rounded-full font-bold border ${form.activiteId===a.id?"bg-black text-white border-black":"bg-[#FFFBF0]"}`}>{a.label}</button>)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input value={form.commune} onChange={e=> setForm({...form, commune: e.target.value})} placeholder="Commune ex: Gombe" className="border-2 p-3 rounded-xl text-[12px]"/>
            <input value={form.stock} onChange={e=> setForm({...form, stock: e.target.value})} type="number" placeholder="Stock" className="border-2 p-3 rounded-xl text-[12px]"/>
          </div>
          <input value={form.livraison} onChange={e=> setForm({...form, livraison: e.target.value})} placeholder="Livraison ex: Retrait Gombe / Livraison..." className="w-full border-2 p-3 rounded-xl text-[11px]"/>

          <div className="bg-black text-white rounded-xl p-3 text-[10px]">
            <p className="font-black">Boutique {currentCat?.icon} {currentCat?.titreCourt} - {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF - Taux fixe {TAUX_CDF}</p>
            <p className="opacity-70 mt-1">Ton annonce: {prixNum||0}$ / {prixCDF.toLocaleString()} CDF • WhatsApp {cleanWhatsapp(user?.ownerWhatsapp||"")} • 0% commission • {currentCat?.description}</p>
          </div>

          <button onClick={handlePublish} disabled={saving} className={`w-full py-4 rounded-full font-black text-[13px] disabled:opacity-50 ${isGros?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{saving?"Publication...":`Publier ${prixNum||0}$ / ${prixCDF.toLocaleString()} CDF • ${prixInfo.prixUSD}$ boutique`}</button>
          <Link href="/" className="block text-center text-[11px] text-gray-500 py-2">Annuler - Retour marché</Link>
        </div>
      </div>
    </div>
  );
}

export default function PagePublier(){
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[10px] text-gray-400 mt-2">WENZE 2.0 Chargement... Taux {TAUX_CDF}</p></div>}>
      <PublierContent/>
    </Suspense>
  );
        }
