"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDF } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,""); }
function getCurrentUser(){ try{ const r=localStorage.getItem("wenze_user"); return r?JSON.parse(r):null; }catch{ return null; } }

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [abonnement, setAbonnement] = useState<any>({ paye:false, expire:null, joursRestants:0 });
  const [solde, setSolde] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [invits, setInvits] = useState<any[]>([]);
  const [inviteForm, setInviteForm] = useState({ wa:"", name:"" });
  const [inviteLink, setInviteLink] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nom:"", commune:"", ville:"Kinshasa", nomEtablissement:"", categorieId:"commerces-services", activiteId:"", bio:"", photo:"" });

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
        commune: u.commune || "",
        ville: u.ville || "Kinshasa",
        nomEtablissement: u.nomEtablissement || u.nom || "",
        categorieId: fixedCat,
        activiteId: u.activiteId || u.activite || catObj?.activites[0]?.id || "",
        bio: u.bio || "",
        photo: u.photo || "",
      });

      const allAnnonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const myWa = cleanWa(u.ownerWhatsapp || u.whatsapp || "");
      const mine = allAnnonces.filter((a:any)=> cleanWa(a.ownerWhatsapp || a.whatsapp || a.userId || "")===myWa);
      mine.sort((a:any,b:any)=> new Date(b.createdAt||b.created_at||0).getTime() - new Date(a.createdAt||a.created_at||0).getTime());
      setAnnonces(mine);

      const cmds = JSON.parse(localStorage.getItem("wenze_commandes_list") || "[]");
      const mySales = cmds.filter((c:any)=> cleanWa(c.vendeur_whatsapp || "")===myWa);
      const total = mySales.reduce((s:any,c:any)=> s + Number(c.total||0), 0);
      setSolde(total);

      const aboDate = u.abonnementDate ? new Date(u.abonnementDate) : null;
      const now = new Date();
      let paye = !!u.abonnementPaye;
      let expire = null;
      let jours = 0;
      if(aboDate){
        expire = new Date(aboDate.getTime() + 30*86400000);
        jours = Math.ceil((expire.getTime() - now.getTime())/86400000);
        paye = jours>0;
      } else if(u.createdAt){
        const created = new Date(u.createdAt);
        const diffDays = Math.ceil((now.getTime()-created.getTime())/86400000);
        jours = 7 - diffDays;
        if(jours>0) paye = true;
      }
      setAbonnement({ paye, expire, joursRestants: jours, date: aboDate });

      // Invitations
      try{
        const { getMyInvitations } = require("@/lib/invitations");
        setInvits(getMyInvitations());
      }catch{}

      // Notif bienvenue profil
      const keyBienvenueProfil = `wenze_bienvenue_profil_${myWa}`;
      if(!localStorage.getItem(keyBienvenueProfil)){
        import("@/lib/notifications").then(({ addNotification })=>{
          addNotification({
            type:"publication_approved" as any,
            title:`🎉 Bienvenue ${u.nomEtablissement||u.nom} dans WENZE WENZE BUSINESS - Profil validé!`,
            message:`WENZE WENZE BUSINESS: Ton profil est validé - Taux fixe ${TAUX_CDF} CDF - 0% commission - ${mine.length} annonces - Boutique ${prixInfo.prixUSD}$ active - 🔔 notif clients à chaque pub payante - Boost 1$/3$/5$ - Pub vidéo 1$/3$/15$ - Rappel J-5 J-1 auto - Règles strictes: chacun son profil, personne ne modifie pour autrui - Expérience forte!`,
            boutiqueId: myWa, forUserId: myWa, actionUrl:"/profil", priority:"high", data:{}
          } as any);
        });
        localStorage.setItem(keyBienvenueProfil,"1");
      }

    } catch{ router.push("/connexion"); }
  }, [router]);

  const showToast = (msg:string, type="success") => { setToast({ msg, type }); setTimeout(()=> setToast(null), 4000); }

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
    if(!editForm.nom.trim()){ showToast("Nom requis","error"); return; }
    setSaving(true);
    try {
      const { assertCanEditProfile } = require("@/lib/auth");
      assertCanEditProfile(user.ownerWhatsapp||user.whatsapp||user.id, user);

      const fixedCat = normalizeCategorie(editForm.categorieId);
      const catObj = getCategorieById(fixedCat);
      const prixInfo = catObj ? getPrixByCategorie(catObj.id) : { prixUSD:5, prixCDF:11500 };
      const activiteObj = getActiviteById(fixedCat, editForm.activiteId);
      
      const updated = {
        ...user,
        nom: editForm.nom.trim(),
        // WhatsApp NON MODIFIABLE - règle stricte
        commune: editForm.commune,
        ville: editForm.ville,
        nomEtablissement: editForm.nomEtablissement || editForm.nom,
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
      
      try {
        const all = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
        const wa = cleanWa(user.ownerWhatsapp||user.whatsapp);
        const idx = all.findIndex((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp||"")===wa);
        if(idx>=0){ all[idx]= {...all[idx], ...updated}; } else { all.push(updated); }
        localStorage.setItem("wenze_all_users", JSON.stringify(all));
      } catch {}

      setUser(updated);
      setEditing(false);
      showToast(`✅ Profil sauvé - ${prixInfo.prixUSD}$ / ${prixInfo.prixCDF.toLocaleString()} CDF - Taux ${TAUX_CDF} - Règle stricte respectée: chacun son profil`);
    } catch(e:any){ showToast(e.message||"Erreur sauvegarde","error"); }
    finally { setSaving(false); }
  };

  const handleInvite = ()=>{
    try{
      const { createInvitation } = require("@/lib/invitations");
      const { link, waLink, inv } = createInvitation(inviteForm.wa, inviteForm.name);
      setInviteLink({ link, waLink, inv });
      const { getMyInvitations } = require("@/lib/invitations");
      setInvits(getMyInvitations());
      showToast(`✅ Invitation créée pour ${inviteForm.name} - En attente confirmation WhatsApp + MDP côté autrui - Lien valide 48h`);
      setInviteForm({ wa:"", name:"" });
    }catch(e:any){ showToast(e.message,"error"); }
  };

  const handleEditAnnonce = (a:any)=>{
    try{
      const { assertCanEdit } = require("@/lib/auth");
      assertCanEdit(a, user);
      const remaining = a.boostUntil ? Math.ceil((new Date(a.boostUntil).getTime()-Date.now())/86400000) : null;
      localStorage.setItem("wenze_edit_annonce", JSON.stringify({...a, _originalCreatedAt: a.createdAt||a.created_at, _originalBoostUntil: a.boostUntil, _originalExpireAt: a.expireAt||a.boostUntil, _isEdit:true, _remainingDays: remaining }));
      localStorage.setItem("wenze_edit_keep_dates", JSON.stringify({ createdAt: a.createdAt||a.created_at, boostUntil: a.boostUntil, expireAt: a.expireAt||a.boostUntil }));
      router.push(`/publier?edit=${a.id}`);
    }catch(e:any){ showToast(e.message,"error"); }
  };

  const handleDeleteAnnonce = (annonceId:string)=>{
    try{
      const { assertCanDelete } = require("@/lib/auth");
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      const annonce = list.find((x:any)=> x.id===annonceId);
      assertCanDelete(annonce, user);
      if(!confirm("Supprimer cette annonce? Compteur pub conservé (règle stricte).")) return;
      const filtered = list.filter((a:any)=> a.id!==annonceId);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(filtered));
      setAnnonces(prev=> prev.filter(a=> a.id!==annonceId));
      showToast("✅ Annonce supprimée - Délai conservé");
    }catch(e:any){ showToast(e.message,"error"); }
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
        <div className="flex-1"><h1 className="font-black text-[16px]">Profil - Règles strictes</h1><p className="text-[10px] text-gray-500">{cat?.icon} {cat?.titre} • {user.prixUSD}$ / {user.prixCDF?.toLocaleString()} CDF • Taux {TAUX_CDF} • 0% comm • Toi seul peux modifier</p></div>
        <span className={`text-[9px] px-2 py-1 rounded-full font-black ${isGros?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{user.prixUSD}$</span>
      </header>

      <div className="p-4 space-y-4">
        {toast && <div className={`p-3 rounded-xl text-[12px] font-bold ${toast.type==="error"?"bg-red-50 text-red-700 border border-red-200":"bg-green-50 text-green-700 border border-green-200"}`}>{toast.msg}</div>}

        {/* REGLES STRICTES */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3">
          <p className="font-black text-[11px]">⛔ RÈGLES STRICTES WENZE WENZE BUSINESS</p>
          <ul className="text-[10px] mt-1 list-disc ml-4 space-y-1 text-gray-700">
            <li>Personne ne peut modifier, changer, publier pour autrui</li>
            <li>Chacun publie, modifie son propre profil/annonces - WhatsApp = ID unique non modifiable</li>
            <li>Modif annonce garde compteur: 5j pub - 3j consommé = reste 2j, ne repart pas à zéro</li>
            <li>Invitation amis = tu crées lien, mais compte validé côté autrui par WhatsApp + MDP</li>
          </ul>
        </div>

        {/* CARTE PROFIL */}
        <div className="bg-white border-2 rounded-2xl p-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-full bg-[#FFFBF0] border-2 flex items-center justify-center overflow-hidden text-2xl">{user.photo ? <img src={user.photo} alt={user.nom} className="w-full h-full object-cover"/> : cat?.icon || "👤"}</div>
            <div className="flex-1">
              <p className="font-black text-[14px]">{user.nomEtablissement || user.nom} <span className="text-[9px] bg-green-500 text-white px-2 py-0.5 rounded-full">TOI - PROPRIO</span></p>
              <p className="text-[11px] text-gray-600">{user.commune} • {user.ville} • WhatsApp {cleanWa(user.ownerWhatsapp||"")} (non modifiable)</p>
              <p className="text-[10px] text-gray-400 mt-1">{cat?.icon} {cat?.titre} • {user.activite || user.activiteId}</p>
              <div className="mt-2 flex gap-2">
                <Link href="/portefeuille" className="text-[10px] bg-black text-white px-3 py-1.5 rounded-full font-bold">{solde}$ / {toCDF(solde).toLocaleString()} CDF</Link>
                <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold ${abonnement.paye ? "bg-green-500 text-white" : "bg-orange-400 text-white"}`}>{abonnement.paye ? `Actif ${abonnement.joursRestants}j` : `Essai ${abonnement.joursRestants}j`}</span>
              </div>
            </div>
          </div>

          {!editing ? (
            <button onClick={()=> setEditing(true)} className="mt-4 w-full bg-[#6C3CE0] text-white py-3 rounded-full font-black text-[12px]">✏️ Modifier mon profil - Toi seul - {user.prixUSD}$</button>
          ) : (
            <div className="mt-4 space-y-3 border-t pt-4">
              <p className="font-black text-[12px]">Édition PRO - Toi seul peux modifier</p>
              <input value={editForm.nom} onChange={e=> setEditForm({...editForm, nom: e.target.value})} placeholder="Nom complet" className="w-full border-2 p-3 rounded-xl text-[13px]"/>
              <input value={editForm.nomEtablissement} onChange={e=> setEditForm({...editForm, nomEtablissement: e.target.value})} placeholder="Nom boutique" className="w-full border-2 p-3 rounded-xl text-[13px]"/>
              <div className="w-full border-2 p-3 rounded-xl text-[13px] bg-gray-100 text-gray-500">WhatsApp: {cleanWa(user.ownerWhatsapp||user.whatsapp)} (non modifiable - ID unique - règle stricte)</div>
              <p className="text-[9px] text-gray-500">WhatsApp = ton ID unique - Non modifiable pour sécurité. Pour changer, crée nouveau compte via invitation.</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={editForm.commune} onChange={e=> setEditForm({...editForm, commune: e.target.value})} placeholder="Commune Gombe..." className="border-2 p-3 rounded-xl text-[13px]"/>
                <input value={editForm.ville} onChange={e=> setEditForm({...editForm, ville: e.target.value})} placeholder="Ville" className="border-2 p-3 rounded-xl text-[13px]"/>
              </div>
              <textarea value={editForm.bio} onChange={e=> setEditForm({...editForm, bio: e.target.value})} placeholder="Bio boutique Kinshasa..." rows={2} className="w-full border-2 p-3 rounded-xl text-[13px]"/>
              <div>
                <p className="text-[11px] font-black">Catégorie - 2 prix - Toi seul</p>
                <div className="mt-1 grid gap-1">
                  {CATEGORIES_WENZE.map(c=> (
                    <button key={c.id} type="button" onClick={()=> setEditForm({...editForm, categorieId: c.id, activiteId: c.activites[0]?.id || ""})} className={`text-left p-2.5 rounded-xl border-2 text-[11px] font-bold ${editForm.categorieId===c.id ? (c.id==="gros-autres"?"bg-black text-white border-black":"bg-[#6C3CE0] text-white border-[#6C3CE0]") : "bg-white"}`}>{c.icon} {c.titre} - {c.prixUSD}$/{c.prixCDF.toLocaleString()} CDF</button>
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
              <div className="grid grid-cols-2 gap-2"><button onClick={()=> setEditing(false)} className="bg-white border-2 p-3 rounded-xl font-bold text-[12px]">Annuler</button><button onClick={handleSave} disabled={saving} className="bg-black text-white p-3 rounded-xl font-bold text-[12px] disabled:opacity-50">{saving?"Sauvegarde...":`Sauver ${getPrixByCategorie(normalizeCategorie(editForm.categorieId)).prixUSD}$ - Toi seul`}</button></div>
            </div>
          )}
        </div>

        {/* INVITATION AMIS */}
        <div className="bg-[#6C3CE0] text-white rounded-2xl p-4">
          <p className="font-black text-[12px]">🤝 Inviter un ami - Créer compte pour autrui (validé côté autrui)</p>
          <p className="text-[10px] mt-1 opacity-90">Tu crées invitation avec son WhatsApp. Il doit confirmer avec SON numéro + SON MDP pour être validé. Tu ne peux pas créer compte sans lui - règle stricte.</p>
          <div className="mt-3 space-y-2">
            <input value={inviteForm.name} onChange={e=>setInviteForm({...inviteForm, name:e.target.value})} placeholder="Nom ami ex: Jacques" className="w-full border-2 p-3 rounded-xl text-[12px] text-black"/>
            <input value={inviteForm.wa} onChange={e=>setInviteForm({...inviteForm, wa:e.target.value})} placeholder="WhatsApp ami 243970000000" className="w-full border-2 p-3 rounded-xl text-[12px] text-black"/>
            <button onClick={handleInvite} className="w-full bg-white text-[#6C3CE0] py-3 rounded-full font-black text-[11px]">Créer invitation + lien WhatsApp - 48h</button>
          </div>
          {inviteLink && (
            <div className="mt-3 bg-white text-black rounded-xl p-3">
              <p className="font-black text-[11px]">✅ Invitation {inviteLink.inv.token} créée!</p>
              <p className="text-[10px] mt-1 break-all">Lien: {inviteLink.link}</p>
              <div className="flex gap-2 mt-2">
                <a href={inviteLink.waLink} target="_blank" className="flex-1 bg-[#25D366] text-white py-2 rounded-full text-[10px] font-black text-center">📲 WhatsApp</a>
                <button onClick={()=>{ navigator.clipboard.writeText(inviteLink.link); showToast("Lien copié"); }} className="flex-1 bg-black text-white py-2 rounded-full text-[10px] font-black">Copier</button>
              </div>
              <p className="text-[9px] text-gray-500 mt-2">Expire 48h - Il doit entrer SON WhatsApp + SON MDP pour valider - Sans lui, pas de compte.</p>
            </div>
          )}
          <div className="mt-4">
            <p className="font-black text-[11px]">Mes invitations ({invits.length}) - Parrainage</p>
            <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
              {invits.length===0 ? <p className="text-[10px] opacity-70">Aucune invitation - Invite tes amis Kinshasa!</p> : invits.map((i:any)=>(
                <div key={i.id} className="bg-white/20 rounded-xl p-2 flex justify-between">
                  <div><p className="font-bold text-[11px]">{i.toName} - {i.toWa}</p><p className="text-[9px] opacity-80">{i.token} • {i.status} • {new Date(i.createdAt).toLocaleDateString()}</p></div>
                  <span className={`text-[9px] px-2 py-1 rounded-full font-black h-fit ${i.st
