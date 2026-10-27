"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getActiviteById, getPrixByCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDF } from "@/lib/paiement";

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

function isOwnerCheck(ann: any, cur: any){
  if(!cur || !ann) return false;
  const curWa = cleanWa(cur.ownerWhatsapp || cur.whatsapp || "");
  const annWa = cleanWa(ann.ownerWhatsapp || ann.whatsapp || "");
  if(curWa && annWa) return curWa === annWa;
  // fallback id user
  if(cur.id && ann.userId) return String(cur.id) === String(ann.userId);
  if(cur.nom && ann.user) return cur.nom === ann.user;
  return false;
}

export default function ModifierPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<any>(null);
  const [form, setForm] = useState<any>({
    titre: "",
    description: "",
    prix: 0,
    categorieId: "commerces-services",
    activiteId: "",
    photo: "",
  });

  useEffect(() => {
    try {
      if (!id) return;
      const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const annonce = annonces.find((a:any) => String(a.id) === String(id));
      
      if (!annonce) { router.push("/profil"); return; }

      const saved = localStorage.getItem("wenze_user");
      const cur = saved ? JSON.parse(saved) : null;
      setCurrent(cur);

      if(!isOwnerCheck(annonce, cur)){
        setError("⛔ Tu n'es pas propriétaire de cette annonce - WENZE 2.0 vérifie WhatsApp");
        setLoading(false);
        return;
      }

      // ✅ WENZE 2.0 FIX - normalise ancienne categorie
      const fixedCat = normalizeCategorie(annonce.categorieId || annonce.categorie || "commerces-services");
      const catObj = getCategorieById(fixedCat);

      setForm({
        titre: annonce.titre || "",
        description: annonce.description || "",
        prix: annonce.prix || 0,
        categorieId: fixedCat,
        activiteId: (annonce.activiteId || annonce.activite || catObj?.activites[0]?.id || "").toLowerCase(),
        photo: annonce.photo || "",
      });
      
      setLoading(false);
    } catch(e){
      setError("Erreur chargement annonce");
      setLoading(false);
    }
  }, [id, router]);

  const catObj = getCategorieById(normalizeCategorie(form.categorieId));
  const prixInfo = catObj ? getPrixByCategorie(catObj.id) : { prixUSD: 5, prixCDF: 11500 };
  const activites = catObj?.activites || [];

  const handleSave = () => {
    if(!form.titre.trim() || !form.prix){
      setError("Titre + prix requis");
      return;
    }
    setSaving(true);
    try {
      const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const idx = annonces.findIndex((a:any)=> String(a.id)===String(id));
      if(idx>=0){
        const activiteObj = getActiviteById(form.categorieId, form.activiteId);
        annonces[idx] = {
          ...annonces[idx],
          titre: form.titre.trim(),
          description: form.description.trim(),
          prix: Number(form.prix),
          prixCDF: toCDF(Number(form.prix)),
          categorieId: normalizeCategorie(form.categorieId),
          categorie: normalizeCategorie(form.categorieId),
          activiteId: form.activiteId,
          activite: activiteObj?.label || form.activiteId,
          photo: form.photo,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
        router.push(`/produit/${id}?updated=1`);
      }
    } catch(e){
      setError("Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = (e:any) => {
    const file = e.target.files?.[0];
    if(!file) return;
    if(file.size > 5*1024*1024){ setError("Photo max 5Mo"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      // compress 400px comme profil
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 800;
        let w = img.width, h = img.height;
        if(w>h){ if(w>max){ h*=max/w; w=max; } } else { if(h>max){ w*=max/h; h=max; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img,0,0,w,h);
        setForm((f:any)=> ({...f, photo: canvas.toDataURL("image/jpeg", 0.7)}));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  if(loading){
    return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Chargement annonce {id}... Taux {TAUX_CDF}</p></div>;
  }

  if(error){
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-center">
        <p className="text-3xl mt-10">⛔</p>
        <p className="font-black mt-4 text-[13px]">{error}</p>
        <p className="text-[11px] text-gray-500 mt-1">WENZE 2.0 - 2 catégories • {current?.ownerWhatsapp ? `Tu: ${cleanWa(current.ownerWhatsapp)}` : "Pas connecté"}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link href="/profil" className="bg-black text-white p-3 rounded-xl font-bold text-[12px]">Profil</Link>
          <Link href="/" className="bg-white border p-3 rounded-xl font-bold text-[12px]">Accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <button onClick={()=> router.back()} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</button>
        <div className="flex-1">
          <h1 className="font-black text-[15px]">Modifier Annonce</h1>
          <p className="text-[10px] text-gray-500">ID {id.slice(0,8)} • {catObj?.icon} {catObj?.titre} • {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF • Taux {TAUX_CDF}</p>
        </div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-black ${form.categorieId==="gros-autres"?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixInfo.prixUSD}$</span>
      </header>

      <div className="p-4 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-[12px] font-bold">{error}</div>}

        <div className="bg-black text-white rounded-xl p-3 flex justify-between items-center">
          <div><p className="font-black text-[12px]">WENZE 2.0 - Edition PRO</p><p className="text-[10px] opacity-70">🛍️ 5$ = électricité, maçon, soudeur, coiffure inclus • 🏭 10$ = gros - 0% comm</p></div>
          <span className="bg-white text-black text-[9px] px-2 py-1 rounded-full font-black">Taux {TAUX_CDF}</span>
        </div>

        <div className="bg-white border-2 rounded-2xl p-4 space-y-4">
          <div>
            <label className="text-[11px] font-black">Titre annonce *</label>
            <input value={form.titre} onChange={e=> setForm({...form, titre: e.target.value})} placeholder="Ex: Soudeur métallique Gombe" className="mt-1 w-full border-2 p-3 rounded-xl text-[13px] outline-none focus:border-[#6C3CE0]" />
          </div>

          <div>
            <label className="text-[11px] font-black">Description</label>
            <textarea value={form.description} onChange={e=> setForm({...form, description: e.target.value})} placeholder="Détails, disponibilité Kinshasa..." rows={3} className="mt-1 w-full border-2 p-3 rounded-xl text-[13px] outline-none focus:border-[#6C3CE0]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black">Prix USD *</label>
              <input type="number" value={form.prix} onChange={e=> setForm({...form, prix: e.target.value})} placeholder="50" className="mt-1 w-full border-2 p-3 rounded-xl text-[13px] outline-none focus:border-[#6C3CE0]" />
              <p className="text-[9px] text-gray-500 mt-1">= {toCDF(Number(form.prix)||0).toLocaleString()} CDF - Taux {TAUX_CDF}</p>
            </div>
            <div>
              <label className="text-[11px] font-black">Boutique - 2 prix</label>
              <div className="mt-1 grid gap-1">
                {CATEGORIES_WENZE.map(c=> (
                  <button key={c.id} type="button" onClick={()=> setForm({...form, categorieId: c.id, activiteId: c.activites[0]?.id || ""})} className={`text-left p-2 rounded-xl border-2 text-[11px] font-bold ${form.categorieId===c.id ? (c.id==="gros-autres"?"bg-black text-white border-black":"bg-[#6C3CE0] text-white border-[#6C3CE0]") : "bg-white border-gray-200"}`}>
                    {c.icon} {c.titreCourt} - {c.prixUSD}$/{c.prixCDF.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black">Activité précise - inclus dans {prixInfo.prixUSD}$</label>
            <div className="mt-2 flex gap-1.5 flex-wrap max-h-28 overflow-y-auto p-1">
              {activites.map((a:any)=> (
                <button key={a.id} type="button" onClick={()=> setForm({...form, activiteId: a.id})} className={`text-[10px] px-2.5 py-1.5 rounded-full font-bold border ${form.activiteId===a.id ? "bg-black text-white border-black" : "bg-[#FFFBF0] border-gray-200"}`}>{a.label}</button>
              ))}
            </div>
            <p className="text-[9px] text-gray-400 mt-1">Électricité, maçon, soudeur, plombier, coiffure = 🛍️ 5$ même régime</p>
          </div>

          <div>
            <label className="text-[11px] font-black">Photo produit (compressée 800px)</label>
            <input type="file" accept="image/*" onChange={handlePhoto} className="mt-1 w-full text-[11px]" />
            {form.photo && <div className="mt-2 w-full h-40 bg-[#FFFBF0] border rounded-xl flex items-center justify-center overflow-hidden"><img src={form.photo} alt="preview" className="max-w-full max-h-full object-contain"/></div>}
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full bg-[#6C3CE0] text-white font-black py-3.5 rounded-full text-[13px] disabled:opacity-50 active:scale-[0.98] transition">
            {saving ? "Sauvegarde..." : `Sauvegarder ${form.prix ? `${form.prix}$ / ${toCDF(Number(form.prix)).toLocaleString()} CDF` : ""} →`}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <Link href={`/produit/${id}`} className="bg-white border-2 text-center p-3 rounded-xl font-bold text-[12px]">Annuler</Link>
            <button onClick={()=>{
              if(!confirm("Supprimer cette annonce?")) return;
              const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
              const rest = annonces.filter((a:any)=> String(a.id)!==String(id));
              localStorage.setItem("wenze_annonces_list", JSON.stringify(rest));
              router.push("/profil");
            }} className="bg-red-500 text-white text-center p-3 rounded-xl font-bold text-[12px]">🗑️ Supprimer</button>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="font-black text-[11px]">Check WENZE 2.0 PRO</p>
          <ul className="text-[10px] text-gray-600 mt-2 list-disc ml-4 space-y-1">
            <li>isOwner via <b>cleanWa(whatsapp)</b> - compare ownerWhatsapp/current</li>
            <li>categorieId normalisé: ancien <b>technique/commerce/beaute</b> → {form.categorieId}</li>
            <li>Prix boutique: {prixInfo.prixUSD}$ / {prixInfo.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF} fixe - 0% comm</li>
            <li>Après save → <b>/produit/{id}</b> + localStorage mis à jour</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
