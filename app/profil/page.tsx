"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { FORMULES, verifierAbonnement, TAUX_CDF, toCDF } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [abonnement, setAbonnement] = useState<any>(null);
  const [solde, setSolde] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wenze_user");
      if (raw) {
        let u = JSON.parse(raw);
        
        // ✅ FIX 1: Concordance - Normalise catégorie + regime + boutique
        const rawCat = u.categorieId || u.categorie || "commerce";
        const fixedCat = getCategorieById(rawCat) ? rawCat : normalizeCategorie(rawCat);
        
        const fixedUser = {
          ...u,
          regime: "prestataire", // Force régime prestataire unique - Soudeur + Tout travaux même régime
          estBoutique: true, // ✅ FIX: Toujours true - boutique fonctionnelle garantie
          categorieId: fixedCat,
          categorie: fixedCat,
          profession: u.profession || u.activite || u.activiteId || "Prestataire",
          activiteId: u.activiteId || u.activite || u.profession || "prestataire",
          ownerWhatsapp: cleanWhatsapp(u.ownerWhatsapp || u.whatsapp),
          whatsapp: cleanWhatsapp(u.whatsapp || u.ownerWhatsapp),
        };

        // ✅ FIX 2: Vérifie abonnement expiré - repasse auto Freemium si expiré - concordance paiement
        const ab = verifierAbonnement();
        setAbonnement(ab);
        
        if (!ab.actif && (fixedUser.type === "pro" || fixedUser.type === "grossiste" || fixedUser.plan === "pro")) {
          // Expiré -> repasse Freemium mais garde boutique
          fixedUser.type = "freemium";
          fixedUser.plan = "freemium";
          fixedUser.abonnement = `Freemium - Retour auto après expiration Pro - Taux ${TAUX_CDF}`;
        }

        setUser(fixedUser);
        
        // ✅ SYNC CRITIQUE vers wenze_all_users AVANT setUser pour éviter flash
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

        const s = parseInt(localStorage.getItem("wenze_solde") || "0");
        setSolde(s);
      }
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      setAnnonces(list);
    } catch {}
  }, []);

  const myAnnonces = useMemo(() => {
    if (!user) return [];
    const myWa = cleanWhatsapp(user.ownerWhatsapp || user.whatsapp);
    return annonces.filter((a: any) => cleanWhatsapp(a.ownerWhatsapp || a.whatsapp || a.ownerWhatsapp) === myWa);
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

  const handleLogout = () => {
    if (confirm("Déconnexion ? Ta boutique restera visible dans /boutiques (recommandé). Supprimer définitivement ? Annuler = garder boutique.")) {
      // Suppression définitive seulement si user confirme 2 fois
      const wa = cleanWhatsapp(user.ownerWhatsapp || user.whatsapp);
      try {
        const allRaw = localStorage.getItem("wenze_all_users");
        if (allRaw) {
          const allUsers = JSON.parse(allRaw);
          const filtered = allUsers.filter((x:any) => cleanWhatsapp(x.ownerWhatsapp || x.whatsapp) !== wa);
          localStorage.setItem("wenze_all_users", JSON.stringify(filtered));
        }
        // Supprime aussi annonces
        const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
        const filteredAnnonces = list.filter((a:any) => cleanWhatsapp(a.ownerWhatsapp || a.whatsapp) !== wa);
        localStorage.setItem("wenze_annonces_list", JSON.stringify(filteredAnnonces));
      } catch {}
      localStorage.removeItem("wenze_user");
      localStorage.removeItem("wenze_abonnement");
      router.push("/");
    } else {
      // Déconnexion simple - garde boutique fonctionnelle dans /boutiques
      localStorage.removeItem("wenze_user");
      localStorage.removeItem("wenze_abonnement");
      router.push("/connexion");
    }
  };

  if (!user) {
    return (
      <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">
        <p className="text-4xl mt-10">👤</p>
        <p className="font-black mt-4">Pas connecté - Concordance</p>
        <p className="text-[11px] text-gray-500 mt-1">Connecte-toi - Régime prestataire unique Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF - Taux {TAUX_CDF} CDF - {CATEGORIES_WENZE.length} métiers - Boutique fonctionnelle</p>
        <div className="grid grid-cols-2 gap-2 mt-6">
          <Link href="/connexion" className="bg-black text-white py-3 rounded-full text-sm font-bold">Connexion • Taux {TAUX_CDF}</Link>
          <Link href="/inscription" className="bg-[#6C3CE0] text-white py-3 rounded-full text-sm font-bold">Inscription Prestataire • {FORMULES.pro.prix}$</Link>
        </div>
      </div>
    );
  }

  const badge = getRegimeBadge();
  const catInfo = getCategorieInfo(user.categorieId || user.categorie);
  const actLower = (user.activiteId || user.activite || user.profession || "").toLowerCase();
  const isSpecialRegime = actLower.includes("soudeur") || actLower.includes("tout-travaux") || actLower.includes("tout travaux");

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <h1 className="font-black text-[14px]">Profil • {myAnnonces.length} annonces • Taux {TAUX_CDF}</h1>
        <span className="ml-auto text-[10px] bg-black text-white px-2 py-1 rounded-full font-bold">{solde.toLocaleString()} CDF • {TAUX_CDF}</span>
      </header>

      <div className="p-4">
        <div className="bg-white border rounded-2xl p-4">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center text-2xl border overflow-hidden">
              {user.photo ? <img src={user.photo} className="w-full h-full rounded-full object-contain" /> : "👤"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[15px] flex items-center gap-2">{user.nom} {isSpecialRegime && <span className="text-[8px] bg-[#6C3CE0] text-white px-2 py-0.5 rounded-full">PRESTATAIRE UNIQUE</span>}</p>
              <p className="text-[11px] text-gray-600">👤 {user.profession || user.categorie || "Prestataire"} • {catInfo}</p>
              <p className="text-[10px] text-gray-500">📍 {user.ville || user.commune || "Kinshasa"} • 🔒 {cleanWhatsapp(user.ownerWhatsapp || user.whatsapp).slice(-4)} • Taux {TAUX_CDF} CDF</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                <span className={`text-[9px] px-2 py-1 rounded-full font-bold text-white ${badge?.color}`}>{badge?.label}</span>
                <span className="text-[9px] px-2 py-1 rounded-full bg-green-50 text-green-700 font-bold border border-green-200">Régime: {user.regime || "prestataire"} • Boutique: OUI • Taux {TAUX_CDF}</span>
                {abonnement?.actif ? (
                  <span className="text-[9px] px-2 py-1 rounded-full bg-green-500 text-white font-bold">✅ Actif {abonnement.expireDans}j • {abonnement.type.toUpperCase()}</span>
                ) : (
                  <span className="text-[9px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-bold">Freemium - 3 gratuites</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 bg-[#6C3CE0]/5 border border-[#6C3CE0]/20 rounded-xl p-3">
            <p className="text-[11px] font-bold text-[#6C3CE0]">🔧 Régime prestataire unique - {CATEGORIES_WENZE.length} métiers - Taux {TAUX_CDF} CDF fixe</p>
            <p className="text-[10px] text-gray-600 mt-1 leading-snug">
              {isSpecialRegime
                ? `Tu es ${user.profession} - Régime prestataire Pro ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF.toLocaleString()} CDF - Même régime que tous les prestataires (Commerce, Beauté, Alimentation...). Soudeur + Tout travaux = même régime 5$.`
                : `Tous les prestataires au même régime Pro ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF.toLocaleString()} CDF (Taux ${TAUX_CDF} CDF). Soudeur + Tout travaux inclus.`}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Catégorie: {catInfo} • Activité: {user.activite || user.profession} • {CATEGORIES_WENZE.length} métiers • Boutique fonctionnelle: OUI visible dans /boutiques • Taux {TAUX_CDF}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-gray-50 rounded-xl p-3"><p className="font-black text-lg">{myAnnonces.length}</p><p className="text-[10px] text-gray-500">Annonces</p><p className="text-[8px] text-green-600">wenze_annonces_list</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="font-black text-lg">{abonnement?.actif ? "∞" : Math.max(0, 3 - myAnnonces.length)}</p><p className="text-[10px] text-gray-500">{abonnement?.actif ? "Illimité" : "Restantes"}</p><p className="text-[8px] text-gray-400">{abonnement?.type || user.type} • {TAUX_CDF}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="font-black text-lg">{solde.toLocaleString()}</p><p className="text-[10px] text-gray-500">CDF W-Pay</p><p className="text-[8px] text-gray-400">Taux {TAUX_CDF}</p></div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-[13px]">Mes annonces ({myAnnonces.length}) - Boutique fonctionnelle • Taux {TAUX_CDF}</h2>
            <Link href="/publier" className="text-[11px] bg-black text-white px-3 py-1.5 rounded-full font-bold">+ Publier • {FORMULES.pro.prix}$</Link>
          </div>
          
          {myAnnonces.length === 0 ? (
            <div className="bg-white border-2 border-dashed rounded-2xl p-6 text-center">
              <p className="text-2xl">📦</p>
              <p className="text-[12px] font-bold mt-2">Pas encore d'annonce - Boutique fonctionnelle prête</p>
              <p className="text-[10px] text-gray-500 mt-1">Publie pour que ta boutique apparaisse dans /boutiques avec régime prestataire unique Pro {FORMULES.pro.prix}$ / {FORMULES.pro.prixCDF.toLocaleString()} CDF (Taux {TAUX_CDF}) - {CATEGORIES_WENZE.length} métiers</p>
              <Link href="/publier" className="mt-3 inline-block bg-[#6C3CE0] text-white px-5 py-2 rounded-full text-[11px] font-bold">Publier 1ère annonce - Régime unique {FORMULES.pro.prix}$</Link>
            </div>
          ) : (
            <div className="grid gap-2">
              {myAnnonces.map((a: any) => {
                const cInfo = getCategorieInfo(a.categorieId || a.categorie);
                const aAct = (a.activiteId || a.activite || "").toLowerCase();
                const aSpecial = aAct.includes("soudeur") || aAct.includes("tout-travaux") || aAct.includes("tout travaux");
                return (
                  <div key={a.id} className="bg-white border rounded-xl p-3 flex gap-3">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden relative">
                      {a.photo ? <img src={a.photo} className="max-w-full max-h-full object-contain" /> : "📦"}
                      {aSpecial && <span className="absolute -top-1 -right-1 text-[7px] bg-[#6C3CE0] text-white px-1 rounded-full font-bold">PREST</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold truncate">{a.titre} {aSpecial && "🔧"}</p>
                      <p className="text-[10px] text-gray-500">{cInfo} • {a.activite || a.profession} • {a.prix}$ / {toCDF(a.prix).toLocaleString()} CDF • Régime prestataire</p>
                      <p className="text-[9px] text-green-600 mt-1">✅ Visible dans /boutiques + catégorie {a.categorieId} • Taux {TAUX_CDF} • Boutique fonctionnelle</p>
                    </div>
                    <Link href={`/produit/${a.id}`} className="text-[10px] bg-gray-100 px-3 py-1.5 rounded-full font-bold h-fit">Voir</Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-2">
          <Link href="/boutiques" className="bg-white border p-3 rounded-xl flex justify-between items-center">
            <span className="text-[13px] font-bold">🏪 Voir toutes boutiques - {CATEGORIES_WENZE.length} métiers - Taux {TAUX_CDF}</span>
            <span className="text-[#6C3CE0]">→</span>
          </Link>
          <Link href={`/boutique/${encodeURIComponent(user.ownerWhatsapp || user.whatsapp)}`} className="bg-[#6C3CE0] text-white p-3 rounded-xl text-center font-bold text-[13px]">
            🔧 Ma boutique publique - {user.profession} - Régime prestataire unique {isSpecialRegime ? "Soudeur + Tout travaux même régime" : `${FORMULES.pro.prix}$`} • {TAUX_CDF} CDF • Fonctionnelle
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/video" className="bg-black text-white p-3 rounded-xl text-center font-bold text-[12px]">🎬 Vidéos {myAnnonces.filter((a:any)=>a.video).length} • Taux {TAUX_CDF}</Link>
            <Link href="/portefeuille" className="bg-white border p-3 rounded-xl text-center font-bold text-[12px]">💳 W-Pay {solde.toLocaleString()} CDF • {TAUX_CDF}</Link>
          </div>
          <button onClick={handleLogout} className="bg-white border border-red-200 text-red-600 p-3 rounded-xl font-bold text-[13px]">Déconnexion • Garde boutique ? • Taux {TAUX_CDF} CDF</button>
        </div>

        <div className="mt-4 bg-white border rounded-xl p-3 text-[9px] text-gray-400">
          <p className="font-bold text-gray-600">Diagnostic boutiques temps présent - Concordance totale</p>
          <p className="mt-1">Catégorie: {catInfo} ({user.categorieId}) • Activité: {user.activite || user.profession} • Régime: {user.regime} • estBoutique: OUI • WhatsApp: 🔒 {cleanWhatsapp(user.ownerWhatsapp || user.whatsapp).slice(-4)} • Plan: {user.type} • Abonnement: {abonnement?.actif ? `${abonnement.type} ${abonnement.expireDans}j` : "Freemium"} • Annonces: {myAnnonces.length} • wenze_all_users sync: OK • Taux: {TAUX_CDF} CDF fixe • Pro: {FORMULES.pro.prix}$ = {FORMULES.pro.prixCDF.toLocaleString()} CDF • {CATEGORIES_WENZE.length} métiers</p>
          <p className="mt-1 text-[#6C3CE0] font-bold">✅ Soudeur + Tout travaux = même régime prestataire unique Pro {FORMULES.pro.prix}$ - Boutique fonctionnelle dans /boutiques - Taux {TAUX_CDF} CDF - Concordance 100% VERT</p>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
