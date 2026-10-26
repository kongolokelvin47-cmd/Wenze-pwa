"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, getActiviteById, normalizeCategorie } from "@/lib/categories";
import { FORMULES, verifierAbonnement, TAUX_CDF, toCDF, toCDFString } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [abonnement, setAbonnement] = useState<any>(null);
  const [solde, setSolde] = useState(0);
  
  // NOUVEAU FORMIDABLE - Edition vraie app
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string, type:"loading"|"success"|"error"}|null>(null);
  const [editForm, setEditForm] = useState({ nom:"", whatsapp:"", commune:"", ville:"", description:"", categorie:"", activite:"" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wenze_user");
      if (raw) {
        let u = JSON.parse(raw);
        const rawCat = u.categorieId || u.categorie || "commerce";
        const fixedCat = getCategorieById(rawCat) ? rawCat : normalizeCategorie(rawCat);
        const fixedUser = {
          ...u,
          regime: "prestataire",
          estBoutique: true,
          categorieId: fixedCat,
          categorie: fixedCat,
          profession: u.profession || u.activite || u.activiteId || "Prestataire",
          activiteId: u.activiteId || u.activite || u.profession || "prestataire",
          ownerWhatsapp: cleanWhatsapp(u.ownerWhatsapp || u.whatsapp),
          whatsapp: cleanWhatsapp(u.whatsapp || u.ownerWhatsapp),
        };
        const ab = verifierAbonnement();
        setAbonnement(ab);
        if (!ab.actif && (fixedUser.type === "pro" || fixedUser.type === "grossiste" || fixedUser.plan === "pro")) {
          fixedUser.type = "freemium";
          fixedUser.plan = "freemium";
          fixedUser.abonnement = `Freemium - Retour auto après expiration Pro - Taux ${TAUX_CDF}`;
        }
        setUser(fixedUser);
        setEditForm({
          nom: fixedUser.nom || "",
          whatsapp: fixedUser.ownerWhatsapp || fixedUser.whatsapp || "",
          commune: fixedUser.commune || "",
          ville: fixedUser.ville || "Kinshasa",
          description: fixedUser.description || "",
          categorie: fixedCat,
          activite: fixedUser.activiteId || fixedUser.activite || "",
        });
        try {
          const allRaw = localStorage.getItem("wenze_all_users");
          const allUsers = allRaw ? JSON.parse(allRaw) : [];
          const wa = cleanWhatsapp(fixedUser.ownerWhatsapp || fixedUser.whatsapp);
          const idx = allUsers.findIndex((x:any) => cleanWhatsapp(x.ownerWhatsapp || x.whatsapp) === wa);
          if (idx >= 0) allUsers[idx] = { ...allUsers[idx], ...fixedUser };
          else allUsers.push(fixedUser);
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

  const showToast = (msg:string, type:"loading"|"success"|"error"="success") => {
    setToast({msg, type});
    if(type!=="loading") setTimeout(()=> setToast(null), 2800);
  };

  const myAnnonces = useMemo(() => {
    if (!user) return [];
    const myWa = cleanWhatsapp(user.ownerWhatsapp || user.whatsapp);
    return annonces.filter((a: any) => cleanWhatsapp(a.ownerWhatsapp || a.whatsapp) === myWa);
  }, [user, annonces]);

  const getCategorieInfo = (catId: string) => {
    const cat = getCategorieById((catId || "").toLowerCase().trim());
    return cat ? `${cat.icon} ${cat.titreCourt}` : catId || "Commerce";
  };

  const getRegimeBadge = () => {
    if (!user) return null;
    const act = (user.activiteId || user.activite || user.profession || "").toLowerCase();
    const isTech = act.includes("soudeur") || act.includes("tout-travaux") || act.includes("tout travaux") || user.categorieId === "technique";
    if (user.type === "pro" || abonnement?.actif && abonnement?.type === "pro") {
      return { label: `PRO ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF.toLocaleString()} CDF • Régime prestataire unique ${isTech ? "🔧 Soudeur + Tout travaux inclus" : ""}`, color: "bg-[#6C3CE0]" };
    }
    if (user.type === "grossiste" || abonnement?.type === "grossiste") {
      return { label: `GROSSISTE ${FORMULES.grossiste.prix}$ / ${FORMULES.grossiste.prixCDF.toLocaleString()} CDF • Régime prestataire`, color: "bg-orange-500" };
    }
    return { label: `FREEMIUM 3 gratuites à vie • Régime prestataire • Taux ${TAUX_CDF} CDF`, color: "bg-gray-800" };
  };

  // SAUVEGARDE FORMIDABLE NON BLOQUANTE
  const sauvegarderProfil = async () => {
    if(saving) return;
    if(!editForm.nom || !editForm.whatsapp) { showToast("Nom + WhatsApp obligatoires", "error"); return; }
    setSaving(true);
    showToast("⏳ Sauvegarde profil en cours...", "loading");
    await new Promise(r=> setTimeout(r, 350));

    try {
      const cleanWa = cleanWhatsapp(editForm.whatsapp);
      const catObj = getCategorieById(editForm.categorie) || getCategorieById(normalizeCategorie(editForm.categorie));
      const actObj = catObj ? getActiviteById(catObj.id, editForm.activite) : null;

      const updated = {
        ...user,
        nom: editForm.nom.trim(),
        whatsapp: cleanWa,
        ownerWhatsapp: cleanWa,
        commune: editForm.commune.trim(),
        ville: editForm.ville.trim() || "Kinshasa",
        description: editForm.description.trim(),
        categorie: editForm.categorie,
        categorieId: editForm.categorie,
        activite: actObj?.slug || editForm.activite,
        activiteId: actObj?.id || editForm.activite,
        profession: actObj?.label || editForm.activite,
        estBoutique: true,
        regime: "prestataire",
      };

      localStorage.setItem("wenze_user", JSON.stringify(updated));
      const allRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allRaw ? JSON.parse(allRaw) : [];
      const idx = allUsers.findIndex((x:any) => cleanWhatsapp(x.ownerWhatsapp||x.whatsapp)===cleanWhatsapp(user.ownerWhatsapp||user.whatsapp) || cleanWhatsapp(x.ownerWhatsapp||x.whatsapp)===cleanWa);
      if(idx>=0) allUsers[idx] = { ...allUsers[idx], ...updated };
      else allUsers.push(updated);
      localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));

      setUser(updated);
      setEditing(false);
      showToast(`✅ Profil modifié! ${updated.nom} - Boutique fonctionnelle - Taux ${TAUX_CDF}`, "success");
    } catch {
      showToast("❌ Erreur sauvegarde", "error");
    }
    setSaving(false);
  };

  const handleLogout = () => {
    if (confirm("Déconnexion ? Ta boutique restera visible dans /boutiques (recommandé). OK = supprimer définitivement, Annuler = garder boutique.")) {
      const wa = cleanWhatsapp(user.ownerWhatsapp || user.whatsapp);
      try {
        const allRaw = localStorage.getItem("wenze_all_users");
        if (allRaw) {
          const allUsers = JSON.parse(allRaw);
          const filtered = allUsers.filter((x:any) => cleanWhatsapp(x.ownerWhatsapp || x.whatsapp) !== wa);
          localStorage.setItem("wenze_all_users", JSON.stringify(filtered));
        }
        const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
        const filteredAnnonces = list.filter((a:any) => cleanWhatsapp(a.ownerWhatsapp || a.whatsapp) !== wa);
        localStorage.setItem("wenze_annonces_list", JSON.stringify(filteredAnnonces));
      } catch {}
      localStorage.removeItem("wenze_user");
      localStorage.removeItem("wenze_abonnement");
      router.push("/");
    } else {
      localStorage.removeItem("wenze_user");
      localStorage.removeItem("wenze_abonnement");
      router.push("/connexion");
    }
  };

  if (!user) {
    return (
      <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">
        <p className="text-4xl mt-10">👤</p>
        <p className="font-black mt-4">Pas connecté</p>
        <p className="text-[11px] text-gray-500 mt-1">Connecte-toi - Régime prestataire unique Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF} - {CATEGORIES_WENZE.length} métiers - Boutique fonctionnelle</p>
        <div className="grid grid-cols-2 gap-2 mt-6">
          <Link href="/connexion" className="bg-black text-white py-3 rounded-full text-sm font-bold">Connexion • {TAUX_CDF}</Link>
          <Link href="/inscription" className="bg-[#6C3CE0] text-white py-3 rounded-full text-sm font-bold">Inscription Prestataire • {FORMULES.pro.prix}$</Link>
        </div>
      </div>
    );
  }

  const badge = getRegimeBadge();
  const catInfo = getCategorieInfo(user.categorieId || user.categorie);
  const actLower = (user.activiteId || user.activite || user.profession || "").toLowerCase();
  const isSpecialRegime = actLower.includes("soudeur") || actLower.includes("tout-travaux") || actLower.includes("tout travaux");
  const catEdit = CATEGORIES_WENZE.find(c=>c.id===editForm.categorie) || CATEGORIES_WENZE.find(c=>c.id===normalizeCategorie(editForm.categorie));

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28 relative">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-full text-[11px] font-bold shadow-xl flex items-center gap-2 ${toast.type==="loading"?"bg-black text-white":toast.type==="success"?"bg-[#6C3CE0] text-white":"bg-red-600 text-white"}`}>
          {toast.type==="loading" && <span className="animate-spin">⏳</span>}
          {toast.type==="success" && <span>✅</span>}
          {toast.msg}
        </div>
      )}

      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <h1 className="font-black text-[13px]">Profil • {myAnnonces.length} • Taux {TAUX_CDF}</h1>
        <button onClick={()=> setEditing(!editing)} className={`ml-auto text-[11px] px-4 py-1.5 rounded-full font-black active:scale-95 ${editing?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>
          {editing?"✕ Fermer":"✏️ Modifier"}
        </button>
        <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full font-bold">{solde.toLocaleString()} CDF</span>
      </header>

      <div className="p-4">
        {/* EDITION FORMIDABLE */}
        {editing && (
          <div className="bg-white border-2 border-[#6C3CE0] rounded-2xl p-4 mb-4 shadow-sm animate-in">
            <p className="font-black text-[13px]">✏️ Modifier profil - Vraie app formidable - Boutique fonctionnelle</p>
            <div className="mt-3 space-y-3">
              <input value={editForm.nom} onChange={e=>setEditForm({...editForm, nom:e.target.value})} placeholder="Nom boutique ex: Atelier Soudure Gombe" className="w-full border-2 focus:border-[#6C3CE0] outline-none p-3 rounded-xl text-[12px]"/>
              <input value={editForm.whatsapp} onChange={e=>setEditForm({...editForm, whatsapp:e.target.value})} placeholder="WhatsApp +243..." className="w-full border-2 focus:border-[#6C3CE0] outline-none p-3 rounded-xl text-[12px]"/>
              <div className="flex gap-2">
                <input value={editForm.commune} onChange={e=>setEditForm({...editForm, commune:e.target.value})} placeholder="Commune Gombe" className="flex-1 border-2 p-3 rounded-xl text-[12px]"/>
                <input value={editForm.ville} onChange={e=>setEditForm({...editForm, ville:e.target.value})} placeholder="Kinshasa" className="flex-1 border-2 p-3 rounded-xl text-[12px]"/>
              </div>
              <select value={editForm.categorie} onChange={e=>setEditForm({...editForm, categorie:e.target.value, activite:""})} className="w-full border-2 p-3 rounded-xl text-[12px] bg-white">
                <option value="">Catégorie</option>
                {CATEGORIES_WENZE.map((c:any)=><option key={c.id} value={c.id}>{c.icon} {c.titre}</option>)}
              </select>
              <select value={editForm.activite} onChange={e=>setEditForm({...editForm, activite:e.target.value})} className="w-full border-2 p-3 rounded-xl text-[12px] bg-white">
                <option value="">Métier - Régime unique</option>
                {(catEdit?.activites||[]).map((a:any)=><option key={a.slug} value={a.slug}>{a.label} {a.slug==="soudeur"||a.slug==="tout-travaux-techniques"?"• Même régime Pro 5$":""}</option>)}
              </select>
              <textarea value={editForm.description} onChange={e=>setEditForm({...editForm, description:e.target.value})} placeholder="Description boutique - Soudeur + Tout travaux même régime Pro 5$, taux 2300 CDF..." className="w-full border-2 p-3 rounded-xl text-[12px] h-20 outline-none focus:border-[#6C3CE0]"/>
              <div className="bg-black text-white rounded-xl p-2.5 text-[10px]">
                <p className="font-bold">Taux {TAUX_CDF} CDF fixe • Pro {FORMULES.pro.prix}$/{FORMULES.pro.prixCDF.toLocaleString()} CDF • Régime unique</p>
                <p className="opacity-70">Boutique fonctionnelle via wenze_all_users sync - Soudeur + Tout travaux = même régime</p>
              </div>
              <button onClick={sauvegarderProfil} disabled={saving} className={`w-full py-4 rounded-full font-black text-[12px] flex justify-center items-center gap-2 ${saving?'bg-gray-300 text-gray-500':'bg-[#6C3CE0] text-white active:scale-[0.98]'}`}>
                {saving? <><span className="animate-spin">⏳</span> Sauvegarde...</> : <>✅ Sauvegarder - {toCDFString(0).split(" ")[0]} Taux {TAUX_CDF} - Boutique OK</>}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border rounded-2xl p-4">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center text-2xl border overflow-hidden">
              {user.photo ? <img src={user.photo} className="w-full h-full rounded-full object-contain" /> : "👤"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[15px] flex items-center gap-2">{user.nom} {isSpecialRegime && <span className="text-[7px] bg-[#6C3CE0] text-white px-2 py-0.5 rounded-full">PRESTATAIRE UNIQUE</span>}</p>
              <p className="text-[11px] text-gray-600">👤 {user.profession || user.categorie || "Prestataire"} • {catInfo}</p>
              <p className="text-[10px] text-gray-500">📍 {user.ville || user.commune || "Kinshasa"} • 🔒 {cleanWhatsapp(user.ownerWhatsapp || user.whatsapp).slice(-4)} • Taux {TAUX_CDF}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                <span className={`text-[9px] px-2 py-1 rounded-full font-bold text-white ${badge?.color}`}>{badge?.label}</span>
                <span className="text-[9px] px-2 py-1 rounded-full bg-green-50 text-green-700 font-bold border border-green-200">Régime: {user.regime} • Boutique: OUI • Taux {TAUX_CDF}</span>
                {abonnement?.actif ? <span className="text-[9px] px-2 py-1 rounded-full bg-green-500 text-white font-bold">✅ Actif {abonnement.expireDans}j • {abonnement.type.toUpperCase()}</span> : <span className="text-[9px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-bold">Freemium - 3 gratuites</span>}
              </div>
            </div>
          </div>

          {!editing && user.description && (
            <div className="mt-3 bg-gray-50 rounded-xl p-3 text-[11px] text-gray-700 border">
              {user.description} • Taux {TAUX_CDF} • Boutique fonctionnelle
            </div>
          )}

          <div className="mt-4 bg-[#6C3CE0]/5 border border-[#6C3CE0]/20 rounded-xl p-3">
            <p className="text-[11px] font-bold text-[#6C3CE0]">🔧 Régime prestataire unique - {CATEGORIES_WENZE.length} métiers - Taux {TAUX_CDF} fixe</p>
            <p className="text-[10px] text-gray-600 mt-1">{isSpecialRegime ? `Tu es ${user.profession} - Régime prestataire Pro ${FORMULES.pro.prix}$ - Même régime que tous.` : `Tous prestataires même régime Pro ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF.toLocaleString()} CDF - Soudeur + Tout travaux inclus.`}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-gray-50 rounded-xl p-3"><p className="font-black text-lg">{myAnnonces.length}</p><p className="text-[10px] text-gray-500">Annonces</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="font-black text-lg">{abonnement?.actif ? "∞" : Math.max(0, 3 - myAnnonces.length)}</p><p className="text-[10px] text-gray-500">{abonnement?.actif ? "Illimité" : "Restantes"}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="font-black text-lg">{solde.toLocaleString()}</p><p className="text-[10px] text-gray-500">CDF W-Pay</p></div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-[13px]">Mes annonces ({myAnnonces.length}) - Taux {TAUX_CDF}</h2>
            <Link href="/publier" className="text-[11px] bg-black text-white px-3 py-1.5 rounded-full font-bold">+ Publier • {FORMULES.pro.prix}$</Link>
          </div>
          {myAnnonces.length === 0 ? (
            <div className="bg-white border-2 border-dashed rounded-2xl p-6 text-center">
              <p className="text-2xl">📦</p>
              <p className="text-[12px] font-bold mt-2">Pas encore d'annonce</p>
              <p className="text-[10px] text-gray-500 mt-1">Publie pour que ta boutique apparaisse dans /boutiques - Taux {TAUX_CDF}</p>
              <Link href="/publier" className="mt-3 inline-block bg-[#6C3CE0] text-white px-5 py-2 rounded-full text-[11px] font-bold">Publier 1ère annonce</Link>
            </div>
          ) : (
            <div className="grid gap-2">
              {myAnnonces.map((a: any) => (
                  <div key={a.id} className="bg-white border rounded-xl p-3 flex gap-3">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">{a.photo ? <img src={a.photo} className="max-w-full max-h-full object-contain" /> : "📦"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold truncate">{a.titre}</p>
                      <p className="text-[10px] text-gray-500">{getCategorieInfo(a.categorieId||a.categorie)} • {a.prix}$ / {toCDF(a.prix).toLocaleString()} CDF</p>
                    </div>
                    <Link href={`/produit/${a.id}`} className="text-[10px] bg-gray-100 px-3 py-1.5 rounded-full font-bold h-fit">Voir</Link>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-2">
          <Link href="/boutiques" className="bg-white border p-3 rounded-xl flex justify-between items-center"><span className="text-[13px] font-bold">🏪 Voir boutiques - {CATEGORIES_WENZE.length} métiers - {TAUX_CDF}</span><span className="text-[#6C3CE0]">→</span></Link>
          <Link href={`/boutique/${encodeURIComponent(user.ownerWhatsapp || user.whatsapp)}`} className="bg-[#6C3CE0] text-white p-3 rounded-xl text-center font-bold text-[13px]">🔧 Ma boutique publique - {user.profession} - Boutique fonctionnelle</Link>
          
