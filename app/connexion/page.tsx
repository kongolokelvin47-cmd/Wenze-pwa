"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";
const cleanWa = (n:any)=> (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");

function ConnexionContent(){
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next")||"/profil";
  const [wa, setWa] = useState("");
  const [toast, setToast] = useState("");

  const handleLogin = ()=>{
    const cleaned = cleanWa(wa);
    if(cleaned.length<9){ setToast("Numéro invalide Ex: 0825000000"); setTimeout(()=>setToast(""),3000); return; }
    try{
      const all = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
      const found = all.find((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp)===cleaned);
      if(!found){
        setToast(`Aucun compte avec 0${cleaned.slice(-9)} - Va t'inscrire - Boutiques Bilamba (Maison d'habillement) exemple`);
        setTimeout(()=> router.push(`/inscription?invite=${cleaned}`), 1500);
        return;
      }
      localStorage.setItem("wenze_user", JSON.stringify(found));
      setToast(`✅ Connecté ${found.nomEtablissement||found.name||found.nom} - Niveau ${found.niveau||1} - ${found.isAmbassadeur?`Ambassadeur ${found.ambassadorCode}`:`Code parrainage ${found.myInviteCode||cleaned.slice(-4)} (0 place)`}`);
      setTimeout(()=> router.push(next), 800);
    }catch(e){ setToast("Erreur connexion"); }
  };

  const handleDemo = ()=>{
    // Compte démo pour toi - Boutiques Bilamba
    const demo = {
      id: "243825000000",
      ownerWhatsapp: "243825000000",
      whatsapp: "243825000000",
      role: "vendeur",
      user_type: "vendeur",
      name: "Bilamba",
      nomBoutique: "Bilamba",
      marque: "Maison d'habillement",
      nomEtablissement: "Boutiques Bilamba (Maison d'habillement)",
      boutiqueName: "Boutiques Bilamba (Maison d'habillement)",
      commune: "Gombe",
      ville: "Kinshasa",
      email: "",
      emailVerified: false,
      whatsappVerified: true,
      niveau: 1,
      hasGmail: false,
      myInviteCode: "BILAMBA2026",
      ambassadorCode: "BILAMBA2026",
      isAmbassadeur: true,
      createdAt: new Date().toISOString(),
    };
    if(typeof window!=="undefined"){
      localStorage.setItem("wenze_user", JSON.stringify(demo));
      const all = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
      const idx = all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp)===cleanWa(demo.ownerWhatsapp));
      if(idx>=0) all[idx]=demo; else all.push(demo);
      localStorage.setItem("wenze_all_users", JSON.stringify(all));
    }
    setToast(`✅ Compte démo Boutiques Bilamba (Maison d'habillement) - Ambassadeur BILAMBA2026 - Code parrainage BILAMBA2026 (0 place) - 20% 1er abo`);
    setTimeout(()=> router.push(next), 800);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-4">
      {toast&&<div className="bg-black text-white p-3 rounded-xl text-[11px] font-bold text-center mb-4">{toast}</div>}
      
      <header className="py-6 text-center">
        <h1 className="font-black text-[20px]">Connexion WENZE WENZE BUSINESS V7</h1>
        <p className="text-[10px] text-gray-600 mt-1">Sans Gmail = Niveau 1 - 1 image - Avec Gmail = Niveau 2 - 3 images - Code ambassadeur 0 place - Invitation 0 place</p>
      </header>

      <div className="bg-white border rounded-2xl p-5 space-y-4">
        <p className="font-black text-[12px]">Entre ton numéro WhatsApp de la plateforme</p>
        <p className="text-[9px] text-gray-500">Ton numéro WhatsApp = ton code parrainage si tu es client/boutique. Code ambassadeur BILAMBA2026 = code parrainage si ambassadeur. 0 place comptée.</p>
        <input value={wa} onChange={e=>setWa(e.target.value)} placeholder="Ex: 0825000000 - Numéro utilisé comme code parrainage" className="w-full p-4 rounded-full border-2 border-black text-[15px] font-bold text-center" />
        <button onClick={handleLogin} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px]">Se connecter - 0% comm</button>
        <button onClick={handleDemo} className="w-full bg-[#FFF2CC] border-2 border-black py-3 rounded-full font-black text-[11px]">🎯 Utiliser compte démo Boutiques Bilamba (Maison d'habillement) - BILAMBA2026</button>
        
        <div className="pt-4 border-t">
          <p className="text-[10px] text-center">Pas de compte?</p>
          <Link href="/inscription" className="mt-2 block w-full bg-white border-2 border-black py-3 rounded-full text-center font-black text-[11px]">Créer compte Client ou Boutique - Code 0 place + Ticket Tombola</Link>
          <p className="text-[8px] text-center text-gray-400 mt-2">Formule: Tout le monde peut inviter. Ambassadeur sollicite invitation boutique/client - 20% 1er abo fin mois. Client/Boutique utilise numéro WhatsApp comme parrainage - cadeaux plateforme.</p>
        </div>
      </div>

      <div className="bg-[#FFF2CC] border-2 border-dashed rounded-2xl p-4 mt-4">
        <p className="font-black text-[10px]">Pourquoi tu ne pouvais pas te connecter avant?</p>
        <p className="text-[9px] mt-1">Ton ancienne connexion demandait email + password Firebase. Maintenant c'est juste WhatsApp. Si tu t'inscris avec 0825..., tu te connectes avec 0825... Pareil pour invitation: numéro invité réservé 0{cleanWa(wa).slice(-4)} + code parrainage BILAMBA2026 ou numéro WhatsApp.</p>
      </div>
    </div>
  );
}

export default function ConnexionPage(){
  return <Suspense fallback={<div className="max-w-[430px] mx-auto p-6">Chargement...</div>}><ConnexionContent/></Suspense>;
}
