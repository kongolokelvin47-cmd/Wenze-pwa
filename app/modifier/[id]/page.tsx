"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDFString, verifierAbonnement, libererPlace } from "@/lib/paiement";
import { isOwner, hasRole, type Role } from "@/lib/roles";

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");

// V6 SÉCURITÉ - remplace ton isOwnerCheck faille
function isOwnerSecure(ann: any, cur: any){
  if(!cur || !ann) return false;
  try{ if(typeof isOwner==="function") return isOwner(cur, ann); }catch{}
  const curWa = cleanWa(cur.ownerWhatsapp||cur.whatsapp||"");
  const annWa = cleanWa(ann.ownerWhatsapp||ann.whatsapp||ann.userId||"");
  if(curWa && annWa && curWa===annWa) return true;
  if(cur.id && ann.userId && String(cur.id)===String(ann.userId)) return true;
  if(cur.ownerId && ann.ownerId && String(cur.ownerId)===String(ann.ownerId)) return true;
  return false;
}

export default function ModifierPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "";
  const [loading, setLoading] = useState(true);
  const [annonce, setAnnonce] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ titre:"", prix:"", description:"", categorieId:"commerces-services", activiteId:"" });
  const [saving, setSaving] = useState(false);
  const [abInfo, setAbInfo] = useState<any>(null);

  useEffect(()=>{
    try{
      const uRaw = localStorage.getItem("wenze_user");
      const u = uRaw ? JSON.parse(uRaw) : null;
      setUser(u);
      if(!u){ setError("Non connecté"); setLoading(false); return; }

      try{ const ab = verifierAbonnement(); setAbInfo(ab); if(ab.isCache) setError(`🔒 Compte caché - ${ab.message} - Active ticket 5$ pour modifier`); }catch{}

      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      const found = list.find((a:any)=> String(a.id||a.annonceId)===String(id));
      if(!found){ setError(`Annonce #${id} introuvable`); setLoading(false); return; }

      if(!isOwnerSecure(found, u) && !hasRole(u.role as Role, "superviseur")){
        setError(`⛔ Sécurité V6 - Non propriétaire (WA ${cleanWa(u.ownerWhatsapp||"").slice(-6)} ≠ ${cleanWa(found.ownerWhatsapp||"").slice(-6)}) - Vérif par ownerWhatsapp uniquement, pas par nom`);
        setLoading(false); return;
      }

      setAnnonce(found);
      setForm({
        titre: found.titre||found.title||"",
        prix: String(found.prixUSD||found.prix||found.price||""),
        description: found.description||"",
        categorieId: normalizeCategorie(found.categorieId||found.categorie||"commerces-services"),
        activiteId: found.activiteId||"",
      });
    }catch(e:any){ setError(e.message||"Erreur"); } finally{ setLoading(false); }
  },[id]);

  const handleSave = async () => {
    if(!annonce || !user) return;
    if(!form.titre.trim() || !form.prix){ setError("Titre + prix requis"); return; }
    const prixNum = Number(form.prix);
    if(isNaN(prixNum)||prixNum<0){ setError("Prix invalide"); return; }
    setSaving(true);
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      const idx = list.findIndex((a:any)=> String(a.id||a.annonceId)===String(id));
      if(idx===-1) throw new Error("Annonce introuvable");
      if(!isOwnerSecure(list[idx], user) && !hasRole(user.role as Role, "superviseur")) throw new Error("Sécurité - Non propriétaire");

      list[idx] = { ...list[idx], titre:form.titre.trim(), title:form.titre.trim(), prix:prixNum, prixUSD:prixNum, description:form.description.trim(), categorieId:normalizeCategorie(form.categorieId), activiteId:form.activiteId, updatedAt:new Date().toISOString() };
      localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
      router.push(`/produit/${id}?updated=1`);
    }catch(e:any){ setError(e.message||"Erreur sauvegarde"); } finally{ setSaving(false); }
  };

  const handleDelete = async () => {
    if(!confirm(`Supprimer "${annonce?.titre}" ?\n\nV6: Suppression libère 1 place immédiatement - Max 50 actives`)) return;
    setSaving(true);
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      const idx = list.findIndex((a:any)=> String(a.id||a.annonceId)===String(id));
      if(idx===-1) throw new Error("Annonce introuvable");
      if(!isOwnerSecure(list[idx], user) && !hasRole(user.role as Role, "superviseur")) throw new Error("Sécurité - Non propriétaire");
      list.splice(idx,1);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
      try{ libererPlace(user); }catch{}
      router.push(`/boutiques?deleted=1&liberation=1`);
    }catch(e:any){ setError(e.message||"Erreur suppression"); } finally{ setSaving(false); }
  };

  if(loading) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/><p className="text-[11px] text-gray-400 mt-3">Chargement modifier V6 - Sécurité isOwner() WA - Taux {TAUX_CDF}...</p></div>;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href={annonce?`/produit/${id}`:"/boutiques"} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1"><h1 className="font-black text-[16px]">Modifier V6 Sécurisé</h1><p className="text-[10px] text-gray-500">ID {id.slice(0,8)} • isOwner()=ownerWhatsapp • Taux {TAUX_CDF}</p></div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${abInfo?.isPaye?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"}`}>{abInfo?.badge||"🆓"} {abInfo?.palierId||"Freemium"}</span>
        </div>
        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px]"><b>POLITIQUE NOUVELLE V6:</b> Même ticket pour tous - ⭐ 5$ ({toCDFString(5)}) 4 places strictes/7j • 🚀 10$ 10 places • 👑 20$ 30 places • Max 50 • Suppression libère place • isOwner sécurisé par WA, pas par nom • 0% comm • Compte caché 🔒 = Freemium 30j + 0 ticket</div>
      </header>

      <div className="p-4">
        {error && <div className="bg-red-50 border-2 border-red-200 text-red-700 text-[11px] p-3 rounded-xl mb-4">{error}</div>}
        {!annonce ? (
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center"><p className="text-4xl">🔒</p><p className="font-black mt-2">{error||"Non accessible"}</p><Link href="/boutiques" className="mt-3 inline-block bg-black text-white px-6 py-3 rounded-full font-bold text-[12px]">Mes boutiques</Link></div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border rounded-2xl p-4 flex gap-3">
              <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0">{annonce.images?.[0]||annonce.photo?<img src={annonce.images?.[0]||annonce.photo} alt={annonce.titre} className="w-full h-full object-cover"/>:<span className="text-2xl">{(getCategorieById(normalizeCategorie(annonce.categorieId)) as any)?.icon||"📦"}</span>}</div>
              <div className="flex-1"><p className="font-black text-[12px]">{annonce.titre}</p><p className="text-[11px] text-gray-500">{annonce.prixUSD||annonce.prix}$ / {toCDFString(Number(annonce.prixUSD||annonce.prix||0))}</p><p className="text-[9px] text-gray-400 mt-1">Owner WA {cleanWa(annonce.ownerWhatsapp||"").slice(-9)} • {new Date(annonce.createdAt||Date.now()).toLocaleDateString("fr-FR")}</p></div>
            </div>

            <div className="bg-white border rounded-2xl p-4 space-y-3">
              <div><label className="text-[11px] font-bold">Titre *</label><input value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Ex: Riz 25kg" className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-bold">Prix USD *</label><input value={form.prix} onChange={e=>setForm({...form,prix:e.target.value})} type="number" placeholder="25" className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none" /><p className="text-[9px] text-gray-400 mt-1">{form.prix?`${toCDFString(Number(form.prix)||0)} CDF`:""} • Prix produit, pas ticket</p></div>
                <div><label className="text-[11px] font-bold">Catégorie</label><select value={form.categorieId} onChange={e=>setForm({...form,categorieId:e.target.value})} className="w-full mt-1 border rounded-xl px-3 py-3 text-sm"><option value="">Catégorie</option>{CATEGORIES_WENZE.map((c:any)=><option key={c.id} value={c.id}>{c.icon} {c.titreCourt||c.titre}</option>)}</select></div>
              </div>
              <div><label className="text-[11px] font-bold">Activité (optionnel)</label><select value={form.activiteId} onChange={e=>setForm({...form,activiteId:e.target.value})} className="w-full mt-1 border rounded-xl px-3 py-3 text-sm"><option value="">-- Aucune --</option>{CATEGORIES_WENZE.flatMap((c:any)=>(c.activites||[]).map((a:any)=><option key={a.id} value={a.id}>{c.icon} {a.titre}</option>))}</select></div>
              <div><label className="text-[11px] font-bold">Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={4} placeholder="Détails..." className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none resize-none" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-black text-white rounded-full py-3.5 text-sm font-black disabled:opacity-50">{saving?"Sauvegarde...":"💾 Sauvegarder - isOwner() WA"}</button>
                <button onClick={handleDelete} disabled={saving} className="px-6 bg-red-50 border border-red-200 text-red-700 rounded-full py-3.5 text-sm font-bold disabled:opacity-50">🗑️ Suppr</button>
              </div>
              <p className="text-[9px] text-gray-400 text-center">V6: Suppression → libère 1 place immédiatement (Max 50) - isOwner sécurisé par ownerWhatsapp, pas par nom - 0% comm</p>
            </div>

            {abInfo && <div className="bg-white border rounded-2xl p-3 text-[10px]"><p className="font-black">Ton abonnement V6</p><div className="mt-2 flex gap-2"><span className="bg-black text-white px-2 py-1 rounded-full font-bold">{abInfo.badge} {abInfo.palierId}</span><span className="bg-gray-100 px-2 py-1 rounded-full">{abInfo.placesRestantes||0} places libres / {abInfo.maxPlaces||50} max</span><span className="bg-gray-100 px-2 py-1 rounded-full">{abInfo.joursRestants||0}j restants</span></div></div>}
          </div>
        )}
      </div>
    </div>
  )
                        }
