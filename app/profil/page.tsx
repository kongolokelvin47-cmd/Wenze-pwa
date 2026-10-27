"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDF } from "@/lib/paiement";

function cleanWhatsapp(n: string) { return (n || "").toString().replace(/[^0-9]/g, ""); }

function isOwner(ann: any, cur: any){
  if(!cur || !ann) return false;
  const c = cleanWhatsapp(cur.ownerWhatsapp || cur.whatsapp || "");
  const a = cleanWhatsapp(ann.ownerWhatsapp || ann.whatsapp || "");
  if(c && a) return c===a;
  return String(cur.id||cur.nom) === String(ann.userId||ann.user);
}

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [abonnement, setAbonnement] = useState<any>({ paye: false, expire: null, joursRestants: 0 });
  const [solde, setSolde] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nom: "", whatsapp: "", commune: "", ville: "Kinshasa", nomEtablissement: "", categorieId: "commerces-services", activiteId: "", bio: "", photo: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wenze_user");
      if(!raw){ router.push("/connexion?next=/profil"); return; }
      const u = JSON.parse(raw);
      const fixedCat = normalizeCategorie(u.categorieId || u.categorie || "commerces-services");
      const catObj = getCategorieById(fixedCat);
      const prixInfo = catObj ? getPrixByCategorie(catObj.id) : { prixUSD: 5, prixCDF: 11500 };
      
      const fullUser = { ...u, categorieId: fixedCat, catObj, prixUSD: prixInfo.prixUSD, prixCDF: prixInfo.prixCDF };
      setUser(fullUser);

      setEditForm({
        nom: u.nom || "",
        whatsapp: u.ownerWhatsapp || u.whatsapp || "",
        commune: u.commune || "",
        ville: u.ville || "Kinshasa",
        nomEtablissement: u.nomEtablissement || "",
        categorieId: fixedCat,
        activiteId: u.activiteId || u.activite || catObj?.activites[0]?.id || "",
        bio: u.bio || "",
        photo: u.photo || "",
      });

      // Annonces
      const allAnnonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const myWa = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp || "");
      const mine = allAnnonces.filter((a:any)=> cleanWhatsapp(a.ownerWhatsapp || a.whatsapp || "") === myWa || isOwner(a,u));
      const fixedMine = mine.map((a:any)=> ({ ...a, categorieId: normalizeCategorie(a.categorieId || a.categorie || fixedCat) }));
      setAnnonces(fixedMine);

      // Solde depuis commandes
      const cmds = JSON.parse(localStorage.getItem("wenze_commandes_list") || "[]");
      const mySales = cmds.filter((c:any)=> cleanWhatsapp(c.vendeur_whatsapp || "")===myWa);
      const total = mySales.reduce((s:any,c:any)=> s + Number(c.total||0), 0);
      setSolde(total);

      // Abonnement WENZE 2.0
      const aboDate = u.abonnementDate ? new Date(u.abonnementDate) : null;
      const now = new Date();
      let paye = !!u.abonnementPaye;
      let expire = null;
      let jours = 0;
      if(aboDate){
        expire = new Date(aboDate.getTime() + 30*24*60*60*1000);
        jours = Math.ceil((expire.getTime() - now.getTime())/(24*60*60*1000));
        paye = jours>0;
      } else if(u.createdAt){
        const created = new Date(u.createdAt);
        const diffDays = Math.ceil((now.getTime()-created.getTime())/(24*60*60*1000));
        jours = 7 - diffDays; // 7 jours essai gratuit WENZE 2.0
        if(jours>0) paye = true;
      }
      setAbonnement({ paye, expire, joursRestants: jours, date: aboDate });

    } catch(e){ router.push("/connexion"); }
  }, [router]);

  const showToast = (msg:string, type="success") => { setToast({ msg, type }); setTimeout(()=> setToast(null), 3000); }

  const handlePhoto = (e:any) => {
    const file = e.target.files?.[0]; if(!file) return;
    if(file.size > 5*1024*1024){ showToast("Photo max 5Mo","error"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 400; let w = img.width, h = img.height;
        if(w>h){ if(w>max){ h*=max/w; w=max; } } else { if(h>max){ w*=max/h; h=max; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img,0,0,w,h);
        setEditForm(f=> ({...f, photo: canvas.toDataURL("image/jpeg",0.7)}));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if(!editForm.nom.trim() || !cleanWhatsapp(editForm.whatsapp)){ showToast("Nom + WhatsApp requis","error"); return; }
    setSaving(true);
    try {
      const fixedCat = normalizeCategorie(editForm.categorieId);
      const catObj = getCategorieById(fixedCat);
      const prixInfo = catObj ? getPrixByCategorie(catObj.id) : { prixUSD:5, prixCDF:11500 };
      const activiteObj = getActiviteById(fixedCat, editForm.activiteId);
      
      const updated = {
        ...user,
        nom: editForm.nom.trim(),
        ownerWhatsapp: cleanWhatsapp(editForm.whatsapp),
        whatsapp: cleanWhatsapp(editForm.whatsapp),
        commune: editForm.commune,
        ville: editForm.ville,
        nomEtablissement: editForm.nomEtablissement,
        categorieId: fixedCat,
        categorie: fixedCat,
        activiteId: editForm.activiteId,
        activite: activiteObj?.label || editForm.activiteId,
        bio: editForm.bio,
        photo: editForm.photo,
        prixUSD: prixInfo.prixUSD,
        prixCDF: prixInfo.prixCDF,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wenze_user", JSON.stringify(updated));
      
      // update all_users
      try {
        const all = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
        const idx = all.findIndex((x:any)=> cleanWhatsapp(x.ownerWhatsapp||x.whatsapp||"")===cleanWhatsapp(user.ownerWhatsapp||""));
        if(idx>=0){ all[idx]=updated; localStorage.setItem("wenze_all_users", JSON.stringify(all)); }
      } catch {}

      setUser(updated);
      setEditing(false);
      showToast(`Profil sauvé ${prixInfo.prixUSD}$ / ${prixInfo.prixCDF.toLocaleString()} CDF - Taux ${TAUX_CDF}`);
    } catch { showToast("Erreur sauvegarde","error"); }
    finally { setSaving(false); }
  };

  const stats = useMemo(()=> ({ annonces: annonces.length, ventes: annonces.filter((a:any)=> a.prix>0).length, solde }), [annonces, solde]);

  if(!user) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"/></div>;

  const cat = user.catObj || getCategorieById(user.categorieId);
  const isGros = user.categorieId==="gros-autres";
  const activites = cat?.activites || [];

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[16px]">Profil</h1><p className="text-[10px] text-gray-500">{cat?.icon} {cat?.titre} • {user.prixUSD}$ / {user.prixCDF?.toLocaleString()} CDF • Taux {TAUX_CDF} • 0% comm</p></div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-black ${isGros?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{user.prixUSD}$</span>
      </header>

      <div className="p-4 space-y-4">
        {toast && <div className={`p-3 rounded-xl text-[12px] font-bold ${toast.type==="error"?"bg-red-50 text-red-700 border border-red-200":"bg-green-50 text-green-700 border border-green-200"}`}>{toast.msg}</div>}

        {/* CARTE PROFIL */}
        <div className="bg-white border-2 rounded-2xl p-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-full bg-[#FFFBF0] border-2 flex items-center justify-center overflow-hidden text-2xl">{user.photo ? <img src={user.photo} alt={user.nom} className="w-full h-full object-cover"/> : cat?.icon || "👤"}</div>
            <div className="flex-1">
              <p className="font-black text-[14px]">{user.nomEtablissement || user.nom}</p>
              <p className="text-[11px] text-gray-600">{user.nomEtablissement ? user.nom : ""} • {user.commune} • {user.ville}</p>
              <p className="text-[10px] text-gray-400 mt-1">{cat?.icon} {cat?.titreCourt} • {user.activite || user.activiteId} • WhatsApp {cleanWhatsapp(user.ownerWhatsapp||"")}</p>
              <div className="mt-2 flex gap-2">
                <Link href="/portefeuille" className="text-[10px] bg-black text-white px-3 py-1.5 rounded-full font-bold">{solde}$ / {toCDF(solde).toLocaleString()} CDF</Link>
                <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold ${abonnement.payé || abonnement.paye ? "bg-green-500 text-white" : "bg-orange-400 text-white"}`}>{abonnement.paye ? `Actif ${abonnement.joursRestants}j` : "Essai 7j"}</span>
              </div>
            </div>
          </div>

          {!editing ? (
            <button onClick={()=> setEditing(true)} className="mt-4 w-full bg-[#6C3CE0] text-white py-3 rounded-full font-black text-[12px]">✏️ Modifier profil - {user.prixUSD}$ / {user.prixCDF?.toLocaleString()} CDF</button>
          ) : (
            <div className="mt-4 space-y-3 border-t pt-4">
              <p className="font-black text-[12px]">Édition PRO - 2 catégories WENZE 2.0</p>
              <input value={editForm.nom} onChange={e=> setEditForm({...editForm, nom: e.target.value})} placeholder="Nom complet" className="w-full border-2 p-3 rounded-xl text-[13px]"/>
              <input value={editForm.nomEtablissement} onChange={e=> setEditForm({...editForm, nomEtablissement: e.target.value})} placeholder="Nom boutique" className="w-full border-2 p-3 rounded-xl text-[13px]"/>
              <div className="grid grid-cols-2 gap-2">
                <input value={editForm.whatsapp} onChange={e=> setEditForm({...editForm, whatsapp: e.target.value})} placeholder="WhatsApp 243..." className="border-2 p-3 rounded-xl text-[13px]"/>
                <input value={editForm.commune} onChange={e=> setEditForm({...editForm, commune: e.target.value})} placeholder="Commune Gombe..." className="border-2 p-3 rounded-xl text-[13px]"/>
              </div>
              <textarea value={editForm.bio} onChange={e=> setEditForm({...editForm, bio: e.target.value})} placeholder="Bio boutique Kinshasa..." rows={2} className="w-full border-2 p-3 rounded-xl text-[13px]"/>
              <div>
                <p className="text-[11px] font-black">Catégorie - 2 prix</p>
                <div className="mt-1 grid gap-1">
                  {CATEGORIES_WENZE.map(c=> (
                    <button key={c.id} type="button" onClick={()=> setEditForm({...editForm, categorieId: c.id, activiteId: c.activites[0]?.id || ""})} className={`text-left p-2.5 rounded-xl border-2 text-[11px] font-bold ${editForm.categorieId===c.id ? (c.id==="gros-autres"?"bg-black text-white border-black":"bg-[#6C3CE0] text-white border-[#6C3CE0]") : "bg-white"}`}>{c.icon} {c.titre} - {c.prixUSD}$/{c.prixCDF.toLocaleString()} CDF - {c.id==="commerces-services"?"Électricité, maçon, coiffure même régime":"Gros"}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black">Activité précise</p>
                <div className="mt-1 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {activites.map((a:any)=> <button key={a.id} type="button" onClick={()=> setEditForm({...editForm, activiteId: a.id})} className={`text-[10px] px-2.5 py-1.5 rounded-full font-bold border ${editForm.activiteId===a.id?"bg-black text-white border-black":"bg-[#FFFBF0]"}`}>{a.label}</button>)}
                </div>
              </div>
              <div><p className="text-[11px] font-black">Photo profil (400px)</p><input type="file" accept="image/*" onChange={handlePhoto} className="mt-1 text-[11px]"/><>{editForm.photo && <img src={editForm.photo} alt="preview" className="mt-2 w-20 h-20 rounded-full object-cover border"/>}</></div>
              <div className="grid grid-cols-2 gap-2"><button onClick={()=> setEditing(false)} className="bg-white border-2 p-3 rounded-xl font-bold text-[12px]">Annuler</button><button onClick={handleSave} disabled={saving} className="bg-black text-white p-3 rounded-xl font-bold text-[12px] disabled:opacity-50">{saving?"Sauvegarde...":`Sauver ${getPrixByCategorie(normalizeCategorie(editForm.categorieId)).prixUSD}$`}</button></div>
            </div>
          )}
        </div>

        {/* ABONNEMENT */}
        <div className="bg-black text-white rounded-2xl p-4 flex justify-between items-center">
          <div><p className="font-black text-[12px]">Abonnement {cat?.icon} {cat?.titreCourt} - {user.prixUSD}$ / {user.prixCDF?.toLocaleString()} CDF</p><p className="text-[10px] opacity-70">{abonnement.payé || abonnement.paye ? `Actif - expire ${abonnement.expire ? new Date(abonnement.expire).toLocaleDateString("fr-FR") : ""} (${abonnement.joursRestants}j restants)` : `Essai gratuit ${abonnement.joursRestants}j - Taux ${TAUX_CDF}`}</p></div>
          <Link href={`/abonnement?cat=${user.categorieId}`} className="bg-white text-black px-4 py-2 rounded-full font-black text-[11px]">Payer {user.prixUSD}$</Link>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border rounded-xl p-3 text-center"><p className="font-black text-[16px]">{stats.annonces}</p><p className="text-[9px] text-gray-500">Annonces</p></div>
          <Link href="/portefeuille" className="bg-white border rounded-xl p-3 text-center"><p className="font-black text-[16px]">{stats.solde}$</p><p className="text-[9px] text-gray-500">{toCDF(stats.solde).toLocaleString()} CDF</p></Link>
          <Link href="/boutiques" className="bg-white border rounded-xl p-3 text-center"><p className="font-black text-[16px]">{cat?.icon}</p><p className="text-[9px] text-gray-500">{user.prixUSD}$ boutique</p></Link>
        </div>

        {/* MES ANNONCES */}
        <div className="bg-white border rounded-2xl p-3">
          <div className="flex justify-between items-center"><p className="font-black text-[12px]">Mes annonces • {annonces.length} • 0% commission</p><Link href="/publier" className="bg-[#6C3CE0] text-white text-[10px] px-3 py-1.5 rounded-full font-bold">+ Publier</Link></div>
          <div className="mt-3 grid gap-2">
            {annonces.length===0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-xl"><p className="text-2xl">📦</p><p className="text-[11px] text-gray-500 mt-2">Aucune annonce - Publie ton 1er article {cat?.titre} {user.prixUSD}$</p></div>
            ) : annonces.map((a:any)=> {
              const aCat = getCategorieById(a.categorieId);
              const pInfo = aCat ? getPrixByCategorie(aCat.id) : { prixUSD:5, prixCDF:11500 };
              return (
                <div key={a.id} className="flex gap-2.5 border rounded-xl p-2">
                  <div className="w-14 h-14 bg-[#FFFBF0] rounded-lg flex items-center justify-center overflow-hidden">{a.photo ? <img src={a.photo} alt={a.titre} className="max-w-full max-h-full object-contain"/> : <span className="text-xl">{aCat?.icon || "📦"}</span>}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[12px] truncate">{a.titre}</p>
                    <p className="text-[11px] text-[#6C3CE0] font-black">{Number(a.prix||0)}$ / {toCDF(Number(a.prix||0)).toLocaleString()} CDF</p>
                    <p className="text-[9px] text-gray-400">{aCat?.icon} {aCat?.titreCourt} • Boutique {pInfo.prixUSD}$</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Link href={`/modifier/${a.id}`} className="bg-black text-white text-[10px] px-3 py-1.5 rounded-full font-bold text-center">Modifier</Link>
                    <Link href={`/produit/${a.id}`} className="bg-white border text-[10px] px-3 py-1.5 rounded-full font-bold text-center">Voir</Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/portefeuille" className="bg-white border p-3 rounded-xl text-center font-bold text-[12px]">💼 Portefeuille</Link>
          <Link href="/messages" className="bg-white border p-3 rounded-xl text-center font-bold text-[12px]">💬 Messages</Link>
          <button onClick={()=> { if(confirm("Déconnexion?")){ localStorage.removeItem("wenze_user"); router.push("/"); } }} className="col-span-2 bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl font-bold text-[12px]">🚪 Déconnexion</button>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/panier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🛒</span>Panier</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  )
}
export const dynamic = 'force-dynamic';
