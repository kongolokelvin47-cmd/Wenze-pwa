"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF } from "@/lib/paiement";

const DAY_MS = 86400000;
const DEFAULT_PRIX = { prixUSD: 5, prixCDF: 11500 };

function cleanWa(n: any): string {
  return (n || "").toString().replace(/[^0-9]/g, "");
}
function safeGet(key:string){
  try{
    if(typeof window === "undefined") return null;
    return localStorage.getItem(key);
  }catch{ return null; }
}
function readList(key: string): any[] {
  try {
    const raw = safeGet(key);
    if(!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function prixDe(catId: string): any {
  const cat: any = getCategorieById(catId);
  if(!cat) return DEFAULT_PRIX;
  return getPrixByCategorie(cat.id);
}
function createdTime(a: any): number {
  try{
    return new Date(a.createdAt || a.created_at || 0).getTime();
  }catch{ return 0; }
}

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [abonnement, setAbonnement] = useState<any>({ paye: false, joursRestants: 0 });
  const [solde, setSolde] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    nom: "", commune: "", ville: "Kinshasa", nomEtablissement: "",
    categorieId: "commerces-services", activiteId: "", bio: "", photo: ""
  });

  useEffect(function(){
    try {
      const raw = safeGet("wenze_user");
      if (!raw) {
        router.push("/connexion?next=/profil");
        return;
      }
      const u = JSON.parse(raw);
      const fixedCat = normalizeCategorie(u.categorieId || u.categorie || "commerces-services");
      const catObj: any = getCategorieById(fixedCat);
      const prix = prixDe(fixedCat);
      setUser(Object.assign({}, u, { categorieId: fixedCat, catObj: catObj, prixUSD: prix.prixUSD, prixCDF: prix.prixCDF }));
      let firstAct = "";
      if(catObj && catObj.activites && catObj.activites[0]) firstAct = catObj.activites[0].id;
      setEditForm({
        nom: u.nom || "",
        commune: u.commune || "",
        ville: u.ville || "Kinshasa",
        nomEtablissement: u.nomEtablissement || u.nom || "",
        categorieId: fixedCat,
        activiteId: u.activiteId || u.activite || firstAct,
        bio: u.bio || "",
        photo: u.photo || ""
      });
      const myWa = cleanWa(u.ownerWhatsapp || u.whatsapp);
      const mine = readList("wenze_annonces_list")
        .filter(function(a: any){ return cleanWa(a.ownerWhatsapp || a.whatsapp || a.userId) === myWa; })
        .sort(function(a: any, b: any){ return createdTime(b) - createdTime(a); });
      setAnnonces(mine);
      const total = readList("wenze_commandes_list")
        .filter(function(c: any){ return cleanWa(c.vendeur_whatsapp) === myWa; })
        .reduce(function(sum: number, c: any){ return sum + Number(c.total || 0); }, 0);
      setSolde(total);
      const now = new Date();
      let paye = !!u.abonnementPaye;
      let jours = 0;
      if (u.abonnementDate) {
        try{
          const exp = new Date(new Date(u.abonnementDate).getTime() + 30 * DAY_MS);
          jours = Math.ceil((exp.getTime() - now.getTime()) / DAY_MS);
          paye = jours > 0;
        }catch{}
      } else if (u.createdAt) {
        try{
          const diff = Math.ceil((now.getTime() - new Date(u.createdAt).getTime()) / DAY_MS);
          jours = 7 - diff;
          if (jours > 0) paye = true;
        }catch{}
      }
      setAbonnement({ paye: paye, joursRestants: jours });
    } catch {
      router.push("/connexion");
    }
  }, [router]);

  const stats = useMemo(function(){ return { annonces: annonces.length, solde: solde }; }, [annonces, solde]);

  function showToast(msg: string, type: string){
    if(!type) type = "success";
    setToast({ msg: msg, type: type });
    setTimeout(function(){ setToast(null); }, 3500);
  }
  function setField(key: string, value: string) {
    setEditForm(function(f: any){ return Object.assign({}, f, { [key]: value }); });
  }
  function handlePhoto(e: any) {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Photo trop lourde (5 Mo max)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = function(){
      const img = new Image();
      img.onload = function(){
        const max = 400;
        let w = img.width;
        let h = img.height;
        if (w > h && w > max) { h = (h * max) / w; w = max; }
        else if (h >= w && h > max) { w = (w * max) / h; h = max; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
        setField("photo", canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
  function handleSave() {
    if (!user) return;
    if (!editForm.nom.trim()) { showToast("Le nom est obligatoire", "error"); return; }
    setSaving(true);
    try {
      const fixedCat = normalizeCategorie(editForm.categorieId);
      const prix = prixDe(fixedCat);
      const activiteObj: any = getActiviteById(fixedCat, editForm.activiteId);
      const updated = Object.assign({}, user, {
        nom: editForm.nom.trim(), commune: editForm.commune, ville: editForm.ville,
        nomEtablissement: editForm.nomEtablissement || editForm.nom,
        categorieId: fixedCat, categorie: fixedCat,
        activiteId: editForm.activiteId, activite: activiteObj ? activiteObj.label : editForm.activiteId,
        bio: editForm.bio, photo: editForm.photo,
        prixUSD: prix.prixUSD, prixCDF: prix.prixCDF,
        catObj: getCategorieById(fixedCat), updatedAt: new Date().toISOString()
      });
      localStorage.setItem("wenze_user", JSON.stringify(updated));
      try {
        const all = readList("wenze_all_users");
        const wa = cleanWa(user.ownerWhatsapp || user.whatsapp);
        let idx = -1;
        for(let i=0;i<all.length;i++){ if(cleanWa(all[i].ownerWhatsapp || all[i].whatsapp) === wa){ idx=i; break; } }
        if (idx >= 0) all[idx] = Object.assign({}, all[idx], updated); else all.push(updated);
        localStorage.setItem("wenze_all_users", JSON.stringify(all));
      } catch {}
      setUser(updated); setEditing(false); showToast("Profil enregistré", "success");
    } catch (e: any) { showToast(e.message || "Erreur lors de l'enregistrement", "error"); }
    setSaving(false);
  }
  function handleEditAnnonce(a: any) {
    let remaining = null;
    if(a.boostUntil){ try{ remaining = Math.ceil((new Date(a.boostUntil).getTime() - Date.now()) / DAY_MS); }catch{} }
    localStorage.setItem("wenze_edit_annonce", JSON.stringify(Object.assign({}, a, { _remainingDays: remaining })));
    localStorage.setItem("wenze_edit_keep_dates", JSON.stringify({ createdAt: a.createdAt || a.created_at, boostUntil: a.boostUntil }));
    router.push("/publier?edit=" + a.id);
  }
  function handleDeleteAnnonce(id: string) {
    if (!confirm("Supprimer cette annonce ?")) return;
    const filtered = readList("wenze_annonces_list").filter(function(a: any){ return a.id !== id; });
    localStorage.setItem("wenze_annonces_list", JSON.stringify(filtered));
    setAnnonces(function(prev: any[]){ return prev.filter(function(a: any){ return a.id !== id; }); });
    showToast("Annonce supprimée", "success");
  }

  if (!user) {
    return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"></div></div>;
  }

  const cat: any = user.catObj || getCategorieById(user.categorieId) || CATEGORIES_WENZE[0] || {};
  const formCat: any = getCategorieById(editForm.categorieId);
  const activites: any[] = (formCat && formCat.activites) ? formCat.activites : [];
  const abonnementLabel = (abonnement.paye ? "Actif " : "Essai ") + abonnement.joursRestants + "j";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1">
          <h1 className="font-black text-[16px]">Mon compte</h1>
          <p className="text-[10px] text-gray-500">{cat.icon} {cat.titre} - {user.prixUSD}$ - Taux {TAUX_CDF}</p>
        </div>
        <span className="text-[9px] px-2 py-1 rounded-full font-black bg-[#6C3CE0] text-white">{user.prixUSD}$</span>
      </header>

      <div className="p-4 space-y-4">
        {toast ? (<div className={"p-3 rounded-xl text-[12px] font-bold border " + (toast.type === "error" ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300")}>{toast.msg}</div>) : null}

        <div className="bg-white border-2 rounded-2xl p-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-full bg-[#FFFBF0] border-2 flex items-center justify-center overflow-hidden text-2xl">
              {user.photo ? <img src={user.photo} alt={user.nom} className="w-full h-full object-cover" /> : <span>{cat.icon}</span>}
            </div>
            <div className="flex-1">
              <p className="font-black text-[14px]">{user.nomEtablissement || user.nom} <span className="text-[8px] bg-green-500 text-white px-2 py-0.5 rounded-full">MOI</span></p>
              <p className="text-[11px] text-gray-600">{user.commune} - {user.ville}</p>
              <p className="text-[11px] text-gray-600">WhatsApp {cleanWa(user.ownerWhatsapp || user.whatsapp)}</p>
              <p className="text-[10px] text-gray-400 mt-1">{cat.icon} {cat.titre}</p>
              <div className="mt-2 flex gap-2">
                <Link href="/portefeuille" className="text-[10px] bg-black text-white px-3 py-1.5 rounded-full font-bold">{solde}$</Link>
                <span className="text-[10px] px-3 py-1.5 rounded-full font-bold bg-green-500 text-white">{abonnementLabel}</span>
              </div>
            </div>
          </div>
          {editing ? (
            <div className="mt-4 space-y-3 border-t pt-4">
              <input value={editForm.nom} onChange={function(e:any){ setField("nom", e.target.value); }} placeholder="Nom complet" className="w-full border-2 p-3 rounded-xl text-[13px]" />
              <input value={editForm.nomEtablissement} onChange={function(e:any){ setField("nomEtablissement", e.target.value); }} placeholder="Nom de la boutique" className="w-full border-2 p-3 rounded-xl text-[13px]" />
              <div className="w-full border-2 p-3 rounded-xl text-[13px] bg-gray-100">WhatsApp : {cleanWa(user.ownerWhatsapp || user.whatsapp)} (non modifiable)</div>
              <div className="grid grid-cols-2 gap-2">
                <input value={editForm.commune} onChange={function(e:any){ setField("commune", e.target.value); }} placeholder="Commune" className="border-2 p-3 rounded-xl text-[13px]" />
                <input value={editForm.ville} onChange={function(e:any){ setField("ville", e.target.value); }} placeholder="Ville" className="border-2 p-3 rounded-xl text-[13px]" />
              </div>
              <textarea value={editForm.bio} onChange={function(e:any){ setField("bio", e.target.value); }} placeholder="Bio" rows={2} className="w-full border-2 p-3 rounded-xl text-[13px]"></textarea>
              <div>
                <p className="text-[11px] font-black">Catégorie</p>
                <div className="mt-1 grid gap-1">
                  {CATEGORIES_WENZE.map(function(c: any){
                    const firstId = (c.activites && c.activites[0]) ? c.activites[0].id : "";
                    const selected = editForm.categorieId === c.id;
                    return (<button key={c.id} type="button" onClick={function(){ setEditForm(function(f:any){ return Object.assign({}, f, { categorieId: c.id, activiteId: firstId }); }); }} className={"text-left p-2.5 rounded-xl border-2 text-[11px] font-bold " + (selected ? "bg-black text-white border-black" : "bg-white")}>{c.icon} {c.titre} - {c.prixUSD}$</button>);
                  })}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black">Activité</p>
                <div className="mt-1 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {activites.map(function(a: any){
                    const selected = editForm.activiteId === a.id;
                    return (<button key={a.id} type="button" onClick={function(){ setField("activiteId", a.id); }} className={"text-[10px] px-2.5 py-1.5 rounded-full font-bold border " + (selected ? "bg-[#6C3CE0] text-white border-[#6C3CE0]" : "bg-[#FFFBF0]")}>{a.label}</button>);
                  })}
                </div>
              </div>
              <div><p className="text-[11px] font-black">Photo</p><input type="file" accept="image/*" onChange={handlePhoto} className="mt-1 text-[11px]" />{editForm.photo ? <img src={editForm.photo} alt="Aperçu" className="mt-2 w-20 h-20 rounded-full object-cover border" /> : null}</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={function(){ setEditing(false); }} className="bg-white border-2 p-3 rounded-xl font-bold text-[12px]">Annuler</button>
                <button type="button" onClick={handleSave} disabled={saving} className="bg-black text-white p-3 rounded-xl font-bold text-[12px] disabled:opacity-50">{saving ? "Enregistrement..." : "Enregistrer"}</button>
              </div>
            </div>
          ) : (<button type="button" onClick={function(){ setEditing(true); }} className="mt-4 w-full bg-[#6C3CE0] text-white py-3 rounded-full font-black text-[12px]">Modifier mon profil</button>)}
        </div>

        <div className="bg-black text-white rounded-2xl p-4 flex justify-between items-center">
          <div><p className="font-black text-[12px]">Abonnement {cat.icon} {cat.titre} - {user.prixUSD}$</p><p className="text-[10px] opacity-70">{abonnementLabel} - Taux {TAUX_CDF}</p></div>
          <Link href={"/abonnement?cat=" + user.categorieId} className="bg-white text-black px-4 py-2 rounded-full font-black text-[11px]">Payer {user.prixUSD}$</Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border-2 rounded-xl p-3 text-center"><p className="font-black text-[16px]">{stats.annonces}</p><p className="text-[9px] text-gray-500">Annonces</p></div>
          <Link href="/portefeuille" className="bg-white border-2 rounded-xl p-3 text-center"><p className="font-black text-[16px]">{stats.solde}$</p><p className="text-[9px] text-gray-500">Solde</p></Link>
          <Link href="/boutiques" className="bg-white border-2 rounded-xl p-3 text-center"><p className="font-black text-[16px]">{cat.icon}</p><p className="text-[9px] text-gray-500">Boutiques</p></Link>
        </div>

        <div className="bg-white border-2 rounded-2xl p-3">
          <div className="flex justify-between items-center"><p className="font-black text-[12px]">Mes annonces - {annonces.length}</p><Link href="/publier" className="bg-[#6C3CE0] text-white text-[10px] px-3 py-1.5 rounded-full font-bold">+ Publier</Link></div>
          <div className="mt-3 grid gap-2">
            {annonces.length === 0 ? (<div className="text-center py-8 border-2 border-dashed rounded-xl"><p className="text-[11px] text-gray-500">Aucune annonce</p></div>) : (
              annonces.map(function(a: any){
                let remaining = null; if(a.boostUntil){ try{ remaining = Math.ceil((new Date(a.boostUntil).getTime() - Date.now()) / DAY_MS); }catch{} }
                return (
                  <div key={a.id} className="flex gap-2.5 border-2 rounded-xl p-2.5 relative">
                    <span className="absolute top-1 right-1 text-[7px] bg-black text-white px-2 py-0.5 rounded-full font-bold">{remaining !== null ? remaining+"j restants" : "Actif"}</span>
                    <div className="w-16 h-16 bg-[#FFFBF0] rounded-lg flex items-center justify-center overflow-hidden border">{a.photo ? <img src={a.photo} alt={a.titre} className="w-full h-full object-cover" /> : <span>📦</span>}</div>
                    <div className="flex-1"><p className="font-bold text-[12px]">{a.titre}</p><p className="text-[11px] text-[#6C3CE0] font-black">{Number(a.prix || 0)}$</p>
                      <div className="flex gap-1 mt-2"><button type="button" onClick={function(){ handleEditAnnonce(a); }} className="flex-1 bg-black text-white text-[9px] px-2 py-1.5 rounded-full font-bold">Modifier</button><Link href={"/produit/" + a.id} className="flex-1 bg-white border-2 text-[9px] px-2 py-1.5 rounded-full font-bold text-center">Voir</Link><button type="button" onClick={function(){ handleDeleteAnnonce(a.id); }} className="bg-white border border-red-200 text-red-600 text-[9px] px-2 py-1.5 rounded-full font-bold">X</button></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
        }
