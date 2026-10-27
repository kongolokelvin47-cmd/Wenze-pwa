"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie } from "@/lib/categories";
import { FORMULES, verifierAbonnement, TAUX_CDF } from "@/lib/paiement";

function cleanWhatsapp(n: string) { return (n || "").toString().replace(/[^0-9]/g, ""); }

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [abonnement, setAbonnement] = useState<any>(null);
  const [solde, setSolde] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nom: "", whatsapp: "", commune: "", ville: "", description: "", categorie: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wenze_user");
      if (raw) {
        const u = JSON.parse(raw);
        const fixedCat = normalizeCategorie(u.categorieId || u.categorie || "commerces-services");
        const catObj = getCategorieById(fixedCat);
        const prixInfo = catObj ? getPrixByCategorie(catObj.id) : { prixUSD: 5, prixCDF: 11500 };
        
        const fixedUser = {
          ...u,
          regime: catObj?.regime || "petites-activites",
          estBoutique: true,
          categorieId: fixedCat,
          categorie: fixedCat,
          categorieTitre: catObj?.titre || fixedCat,
          profession: catObj?.activites[0]?.label || u.profession || "Commerçant",
          activite: catObj?.activites[0]?.slug || "detail",
          activiteId: catObj?.activites[0]?.id || "detail",
          prixFormule: prixInfo.prixUSD,
          ownerWhatsapp: cleanWhatsapp(u.ownerWhatsapp || u.whatsapp),
          whatsapp: cleanWhatsapp(u.whatsapp || u.ownerWhatsapp),
        };
        const ab = verifierAbonnement();
        setAbonnement(ab);
        if (!ab.actif && (fixedUser.type === "pro" || fixedUser.type === "grossiste" || fixedUser.type==="commerces_services" || fixedUser.type==="gros_autres")) {
          // Ne force pas freemium si abonnement encore valide via autre clé - laisse verifierAbonnement décider
        }
        setUser(fixedUser);
        setEditForm({
          nom: fixedUser.nom || "",
          whatsapp: fixedUser.ownerWhatsapp || "",
          commune: fixedUser.commune || "",
          ville: fixedUser.ville || "Kinshasa",
          description: fixedUser.description || "",
          categorie: fixedCat,
        });
        try {
          const allRaw = localStorage.getItem("wenze_all_users");
          const allUsers = allRaw ? JSON.parse(allRaw) : [];
          const wa = cleanWhatsapp(fixedUser.ownerWhatsapp);
          let found = false;
          for (let i = 0; i < allUsers.length; i++) {
            if (cleanWhatsapp(allUsers[i].ownerWhatsapp || allUsers[i].whatsapp) === wa) {
              allUsers[i] = { ...allUsers[i], ...fixedUser };
              found = true; break;
            }
          }
          if (!found) allUsers.push(fixedUser);
          localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
          localStorage.setItem("wenze_user", JSON.stringify(fixedUser));
        } catch {}
        const s = parseInt(localStorage.getItem("wenze_solde") || localStorage.getItem("wenze_wallet_solde") || "0");
        setSolde(s);
      }
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      setAnnonces(list);
    } catch {}
  }, []);

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    if (type !== "loading") setTimeout(() => setToast(null), 2500);
  }

  const myAnnonces = useMemo(() => {
    if (!user) return [];
    const myWa = cleanWhatsapp(user.ownerWhatsapp || user.whatsapp);
    return annonces.filter((a:any)=> cleanWhatsapp(a.ownerWhatsapp || a.whatsapp) === myWa);
  }, [user, annonces]);

  function getCategorieInfo(catId: string) {
    const cat = getCategorieById(catId);
    return cat ? `${cat.icon} ${cat.titre}` : catId;
  }

  async function sauvegarderProfil() {
    if (saving) return;
    if (!editForm.nom || !editForm.whatsapp) { showToast("Nom + WhatsApp obligatoires", "error"); return; }
    setSaving(true);
    showToast("Sauvegarde...", "loading");
    await new Promise(r=> setTimeout(r, 350));
    try {
      const cleanWa = cleanWhatsapp(editForm.whatsapp);
      const catObj = getCategorieById(editForm.categorie) || getCategorieById(normalizeCategorie(editForm.categorie));
      if (!catObj) { showToast("Catégorie invalide", "error"); setSaving(false); return; }
      const prixInfo = getPrixByCategorie(catObj.id);
      const updated = {
        ...user,
        nom: editForm.nom.trim(),
        whatsapp: cleanWa,
        ownerWhatsapp: cleanWa,
        commune: editForm.commune.trim(),
        ville: editForm.ville.trim() || "Kinshasa",
        description: editForm.description.trim(),
        categorie: catObj.id,
        categorieId: catObj.id,
        categorieTitre: catObj.titre,
        activite: catObj.activites[0].slug,
        activiteId: catObj.activites[0].id,
        profession: catObj.activites[0].label,
        estBoutique: true,
        regime: catObj.regime,
        prixFormule: prixInfo.prixUSD,
      };
      localStorage.setItem("wenze_user", JSON.stringify(updated));
      const allRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allRaw ? JSON.parse(allRaw) : [];
      let idx = allUsers.findIndex((x:any)=> cleanWhatsapp(x.ownerWhatsapp||x.whatsapp)===cleanWa);
      if (idx>=0) allUsers[idx]={...allUsers[idx], ...updated}; else allUsers.push(updated);
      localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
      setUser(updated);
      setEditing(false);
      showToast(`Profil modifié - ${catObj.titre} ${prixInfo.prixUSD}$ - Taux ${TAUX_CDF}`, "success");
    } catch { showToast("Erreur sauvegarde", "error"); }
    setSaving(false);
  }

  function handleLogout() {
    const ok = window.confirm("Deconnexion ? Boutique restera visible");
    if (ok) {
      localStorage.removeItem("wenze_user");
      localStorage.removeItem("wenze_abonnement");
      router.push("/connexion");
    }
  }

  if (!user) {
    return (
      <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">
        <p className="text-4xl mt-10">👤</p>
        <p className="font-black mt-4">Pas connecté - Taux {TAUX_CDF}</p>
        <div className="grid grid-cols-2 gap-2 mt-6">
          <Link href="/connexion" className="bg-black text-white py-3 rounded-full text-sm font-bold">Connexion</Link>
          <Link href="/inscription" className="bg-[#6C3CE0] text-white py-3 rounded-full text-sm font-bold">Inscription 🛍️ 5$</Link>
        </div>
      </div>
    );
  }

  const catUser = getCategorieById(user.categorieId);
  const prixUser = catUser ? getPrixByCategorie(catUser.id) : { prixUSD: 5, prixCDF: 11500 };
  const isPro = abonnement && abonnement.actif;
  const badgeLabel = isPro ? `${abonnement.label} - ${abonnement.prixUSD}$ / ${abonnement.prixUSD*TAUX_CDF} CDF - ${abonnement.expireDans}j` : `FREEMIUM 3 gratuites - Taux ${TAUX_CDF}`;

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28 relative">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-full text-[11px] font-bold shadow-xl bg-black text-white">{toast.msg}</div>}
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <h1 className="font-black text-[13px]">Profil - {myAnnonces.length} - Taux {TAUX_CDF}</h1>
        <button onClick={()=> setEditing(!editing)} className="ml-auto text-[11px] px-4 py-1.5 rounded-full font-black bg-[#6C3CE0] text-white">{editing?"Fermer":"Modifier"}</button>
        <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full font-bold">{solde.toLocaleString()} CDF</span>
      </header>

      <div className="p-4">
        {editing && (
          <div className="bg-white border-2 border-[#6C3CE0] rounded-2xl p-4 mb-4">
            <p className="font-black text-[13px]">Modifier profil - WENZE 2.0</p>
            <div className="mt-3 space-y-3">
              <input value={editForm.nom} onChange={e=> setEditForm({...editForm, nom: e.target.value})} placeholder="Nom boutique" className="w-full border-2 p-3 rounded-xl text-[12px]" />
              <input value={editForm.whatsapp} onChange={e=> setEditForm({...editForm, whatsapp: e.target.value})} placeholder="WhatsApp +243" className="w-full border-2 p-3 rounded-xl text-[12px]" />
              <div className="flex gap-2">
                <input value={editForm.commune} onChange={e=> setEditForm({...editForm, commune: e.target.value})} placeholder="Commune" className="flex-1 border-2 p-3 rounded-xl text-[12px]" />
                <input value={editForm.ville} onChange={e=> setEditForm({...editForm, ville: e.target.value})} placeholder="Kinshasa" className="flex-1 border-2 p-3 rounded-xl text-[12px]" />
              </div>

              {/* ✅ 2 CATEGORIES SEULEMENT - PLUS DE SOUS METIER VISIBLE */}
              <div className="space-y-2">
                <p className="text-[11px] font-black">📁 Ta catégorie - Boutique directe</p>
                <div className="grid grid-cols-1 gap-2">
                  {CATEGORIES_WENZE.map((c:any)=> (
                    <button key={c.id} type="button" onClick={()=> setEditForm({...editForm, categorie: c.id})}
                      className={`p-3 rounded-xl border-2 text-left flex justify-between items-center ${editForm.categorie===c.id?"bg-black text-white border-black":"bg-white border-gray-200"}`}>
                      <span className="font-bold text-[12px]">{c.icon} {c.titre}</span>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full ${editForm.categorie===c.id?"bg-white text-black":"bg-black text-white"}`}>{c.prixUSD}$</span>
                    </button>
                  ))}
                </div>
              </div>

              <textarea value={editForm.description} onChange={e=> setEditForm({...editForm, description: e.target.value})} placeholder="Description boutique" className="w-full border-2 p-3 rounded-xl text-[12px] h-20" />
              <button onClick={sauvegarderProfil} disabled={saving} className="w-full py-4 rounded-full font-black text-[12px] bg-[#6C3CE0] text-white">{saving?"Sauvegarde...":"Sauvegarder - Boutique OK"}</button>
            </div>
          </div>
        )}

        <div className="bg-white border rounded-2xl p-4">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-2xl border">{catUser?.icon || "👤"}</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[15px]">{user.nom}</p>
              <p className="text-[11px] text-gray-600">{user.profession} - {getCategorieInfo(user.categorieId)}</p>
              <p className="text-[10px] text-gray-500">📍 {user.ville || user.commune} - Taux {TAUX_CDF} - {prixUser.prixUSD}$ / {prixUser.prixCDF.toLocaleString()} CDF</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                <span className="text-[9px] px-2 py-1 rounded-full font-bold text-white bg-[#6C3CE0]">{badgeLabel}</span>
                <span className="text-[9px] px-2 py-1 rounded-full bg-green-50 text-green-700 font-bold border">Boutique OUI • {catUser?.regime}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-gray-50 rounded-xl p-3"><p className="font-black text-lg">{myAnnonces.length}</p><p className="text-[10px] text-gray-500">Annonces</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="font-black text-lg">{isPro?"∞":Math.max(0,3-myAnnonces.length)}</p><p className="text-[10px] text-gray-500">{isPro?"Illimité":"Restantes"}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="font-black text-lg">{solde.toLocaleString()}</p><p className="text-[10px] text-gray-500">CDF W-Pay</p></div>
          </div>
          {catUser && <div className="mt-3 bg-black text-white rounded-xl p-3 text-[11px] flex justify-between"><span>{catUser.icon} {catUser.titre} • {catUser.regime}</span><span className="font-black">{prixUser.prixUSD}$ / {prixUser.prixCDF.toLocaleString()} CDF</span></div>}
        </div>

        <div className="mt-6 grid gap-2">
          <Link href="/publier" className="bg-[#6C3CE0] text-white p-3 rounded-xl text-center font-bold text-[13px]">Publier - Taux {TAUX_CDF} - {prixUser.prixUSD}$</Link>
          <Link href="/boutiques" className="bg-white border p-3 rounded-xl flex justify-between items-center"><span className="text-[13px] font-bold">Voir boutiques - {CATEGORIES_WENZE.length} catégories</span><span>→</span></Link>
          <Link href={"/boutique/" + encodeURIComponent(user.ownerWhatsapp || user.whatsapp)} className="bg-black text-white p-3 rounded-xl text-center font-bold text-[13px]">Ma boutique publique</Link>
          <button onClick={handleLogout} className="bg-white border border-red-200 text-red-600 p-3 rounded-xl font-bold text-[13px]">Deconnexion</button>
        </div>
      </div>
    </div>
  );
      }
