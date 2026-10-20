"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FORMULES, TAUX_CDF, verifierAbonnement } from "@/lib/paiement";

const cleanWhatsapp = (num: string) => (num || "").toString().replace(/[^0-9]/g, "");
const getCurrentUser = () => {
  try { 
    const raw = typeof window !== "undefined" ? localStorage.getItem("wenze_user") : null; 
    return raw ? JSON.parse(raw) : null; 
  } catch { return null; }
};
const isOwner = (annonce: any, current: any) => {
  if (!current || !annonce) return false;
  const currentClean = cleanWhatsapp(current.whatsapp || current.telephone || current.ownerWhatsapp);
  const annonceClean = cleanWhatsapp(annonce.ownerWhatsapp || annonce.whatsapp || annonce.telephone);
  const sameWhatsapp = currentClean && annonceClean && currentClean === annonceClean;
  const sameId = current.id && annonce.userId && current.id === annonce.userId;
  return sameWhatsapp || sameId;
};

function ProfilContent() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [annoncesCount, setAnnoncesCount] = useState(0);
  const [mesAnnonces, setMesAnnonces] = useState<any[]>([]);

  useEffect(()=>{
    const saved = typeof window !== "undefined" ? localStorage.getItem("wenze_user") : null;
    const allAnnonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const current = saved ? JSON.parse(saved) : null;
    
    if (current) {
      const miennes = allAnnonces.filter((a:any) => isOwner(a, current));
      setMesAnnonces(miennes.reverse());
      setAnnoncesCount(miennes.length);
      localStorage.setItem("wenze_annonces", String(miennes.length)); // sync compteur
    }

    if(saved) {
      let u = JSON.parse(saved);
      try {
        const ab = verifierAbonnement();
        if(!ab.actif && (u.type==="pro" || u.type==="grossiste")){
          u.type = "freemium";
          u.abonnement = "Freemium - Retour auto non-paiement";
          localStorage.setItem("wenze_user", JSON.stringify(u));
          if(!sessionStorage.getItem("downgrade_alert")) {
            alert("⚠️ Abonnement expiré. Repassé Freemium.");
            sessionStorage.setItem("downgrade_alert", "1");
          }
        }
      } catch {}
      
      const paiementReussi = localStorage.getItem("paiement_reussi");
      const typePaye = localStorage.getItem("type_paye") as any;
      if(paiementReussi==="true" && typePaye){
        const key = String(typePaye).toLowerCase();
        if(key==="pro" || key==="grossiste") {
          u.type = key; u.estBoutique = true; u.annoncesLimite = 9999;
          u.abonnement = key==="pro" ? `Pro ${FORMULES.pro.prix}$ - Actif` : `Grossiste ${FORMULES.grossiste.prix}$ - Actif`;
        }
        localStorage.setItem("wenze_user", JSON.stringify(u));
        localStorage.removeItem("paiement_reussi");
        alert(`✅ Paiement ${typePaye} activé!`);
      }
      setUser(u);
    }
  }, []);

  const handleDeleteAnnonce = (id: number) => {
    const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const annonce = annonces.find((a:any) => a.id === id);
    const current = getCurrentUser();
    if (!annonce || !isOwner(annonce, current)) {
      alert(`⛔ Accès refusé. Annonce de ${annonce?.user}. Tu es ${current?.nom}.`);
      return;
    }
    if (!confirm(`Supprimer "${annonce.titre}"?`)) return;
    const filtered = annonces.filter((a:any) => a.id !== id);
    localStorage.setItem("wenze_annonces_list", JSON.stringify(filtered));
    const miennes = filtered.filter((a:any) => isOwner(a, current));
    setMesAnnonces(miennes.reverse());
    setAnnoncesCount(miennes.length);
    localStorage.setItem("wenze_annonces", String(miennes.length));
  };

  const handleEditAnnonce = (id: number) => {
    const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    const annonce = annonces.find((a:any) => a.id === id);
    if (!isOwner(annonce, getCurrentUser())) { alert("⛔ Pas ton annonce"); return; }
    router.push(`/modifier/${id}`);
  };

  const logout = () => {
    localStorage.removeItem("wenze_user");
    localStorage.removeItem("wenze_connecte");
    window.location.href = "/";
  };

  if(!user){
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 flex flex-col justify-center">
        <h1 className="text-2xl font-black">👤 Profil</h1>
        <p className="text-sm text-gray-500 mt-1">1 numéro = 1 compte - Taux 1$ = {TAUX_CDF} CDF</p>
        <div className="mt-8 space-y-3">
          <Link href="/inscription?type=client" className="block w-full bg-black text-white p-4 rounded-full font-bold text-center">Client Perso - 0$</Link>
          <Link href="/inscription?type=pro" className="block w-full bg-gray-800 text-white p-4 rounded-full font-bold text-center">Boutique Freemium - 0$</Link>
          <Link href="/tarifs" className="block w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold text-center">Tarifs Pro 5$ & Grossiste 25$</Link>
        </div>
      </div>
    )
  }

  const isClientPerso = user.estBoutique === false || user.type === "client";
  const isFreemium = user.type==="freemium" && user.estBoutique === true;
  const isPro = user.type==="pro"; const isGrossiste = user.type==="grossiste";
  const limite = isClientPerso ? 0 : isFreemium ? 3 : 9999;
  const restant = limite === 9999 ? 9999 : limite - annoncesCount;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 pb-20">
      <Link href="/" className="text-xs text-[#6C3CE0] font-bold">← Accueil</Link>
      <h1 className="text-xl font-black mt-3">👤 Mon Profil - {user.nom}</h1>
      
      <div className="mt-4 bg-gradient-to-br from-purple-50 to-orange-50 p-4 rounded-2xl flex gap-4 items-center border">
        <img src={user.photo || "https://via.placeholder.com/80"} alt="profil" className="w-16 h-16 rounded-full object-cover border-2 border-white" />
        <div className="flex-1">
          <p className="font-bold text-sm">{user.nom} • 🔒 {cleanWhatsapp(user.ownerWhatsapp||user.whatsapp).slice(-4)}</p>
          <p className="text-xs text-gray-600">{user.whatsapp} • {isClientPerso ? "Client Perso" : user.categorie}</p>
          <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${isPro ? "bg-[#6C3CE0] text-white" : isGrossiste ? "bg-orange-500 text-white" : isFreemium ? "bg-gray-800 text-white" : "bg-black text-white"}`}>{user.type?.toUpperCase()} {user.estBoutique ? "• BOUTIQUE" : ""}</span>
        </div>
      </div>

      <div className="mt-4 bg-black text-white p-3 rounded-xl flex justify-between">
        <div><p className="text-[11px]">{isClientPerso ? "Statut" : "Annonces"}</p><p className="font-black text-lg">{isClientPerso ? "Client" : `${annoncesCount} / ${limite===9999 ? "ILLIMITÉ" : limite}`}</p></div>
        <div className="text-right text-[10px]">{isFreemium && restant<=0 && <p className="text-red-400 font-bold">Limite 3 atteinte!</p>}{isFreemium && restant>0 && <p>{restant} restantes</p>}{(isPro || isGrossiste) && <p>Illimité ✅</p>}</div>
      </div>

      {mesAnnonces.length > 0 && (
        <>
          <p className="font-black text-sm mt-6">📦 Mes annonces ({mesAnnonces.length}) - ownerWhatsapp</p>
          <div className="mt-2 grid gap-2">
            {mesAnnonces.map((a:any) => (
              <div key={a.id} className="bg-white border p-3 rounded-xl flex gap-3">
                <div className="w-16 h-16 bg-white rounded-xl border flex items-center justify-center overflow-hidden">
                  {a.typeMedia === "video" ? <video src={a.video} className="max-w-full max-h-full" /> : <img src={a.photo} className="max-w-full max-h-full object-contain" alt={a.titre} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{a.titre}</p>
                  <p className="text-[10px] text-gray-500">{a.prix}$ • owner {cleanWhatsapp(a.ownerWhatsapp).slice(-4)} • {a.typeMedia === "video" ? "🎬 10MB" : "📸 150KB"}</p>
                  <div className="flex gap-2 mt-1">
                    <button onClick={()=>handleEditAnnonce(a.id)} className="text-[10px] bg-black text-white px-3 py-1 rounded-full">Modifier</button>
                    <button onClick={()=>handleDeleteAnnonce(a.id)} className="text-[10px] bg-red-50 text-red-600 border px-3 py-1 rounded-full">Supprimer</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 space-y-2">
        {isFreemium && (restant>0 ? <Link href="/publier" className="block bg-black text-white p-3 rounded-xl text-center text-sm font-bold">+ Publier ({restant} restantes)</Link> : <Link href="/tarifs" className="block bg-red-600 text-white p-3 rounded-full text-center font-bold">Passer Pro 5$ - Illimité</Link>)}
        {(isPro || isGrossiste) && <Link href="/publier" className="block bg-black text-white p-3 rounded-xl text-center text-sm font-bold">+ Publier Illimité</Link>}
        <button onClick={logout} className="w-full bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold">Déconnexion</button>
      </div>
      <p className="text-[10px] text-center text-gray-400 mt-8">SÉCURITÉ: ownerWhatsapp + userId • 1 numéro=1 compte</p>
    </div>
  )
}

export default function ProfilPage() {
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto p-10 text-center">Chargement Wenze...</div>}>
      <ProfilContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
