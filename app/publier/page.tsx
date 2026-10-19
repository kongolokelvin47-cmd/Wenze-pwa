"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { comprendreImage, ameliorerImageGratuit, genererDescriptionVente, getPosition } from "@/lib/ai/gratuit";

export default function Publier() {
  const [user, setUser] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [photo, setPhoto] = useState("");
  const [form, setForm] = useState({ titre: "", prix: "", description: "", categorie: "", lat: 0, lng: 0 });
  const [loadingIA, setLoadingIA] = useState(false);
  const [captionIA, setCaptionIA] = useState("");

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("wenze_user") || "{}");
    setUser(u);
    setCount(parseInt(localStorage.getItem("wenze_annonces") || "0"));
    // Géoloc gratuite auto
    getPosition().then(p=>setForm(f=>({...f, lat:p.lat, lng:p.lng}))).catch(()=>{});
  }, []);

  const compress = (file: File): Promise<string> => {
    return new Promise(res=>{
      const reader = new FileReader();
      reader.onload = e=>{
        const img = new Image();
        img.onload = ()=>{
          const c = document.createElement("canvas");
          const MAX=800;
          let w=img.width,h=img.height;
          if(w>h){ if(w>MAX){ h*=MAX/w; w=MAX; } } else { if(h>MAX){ w*=MAX/h; h=MAX; } }
          c.width=w; c.height=h;
          c.getContext("2d")?.drawImage(img,0,0,w,h);
          res(c.toDataURL("image/jpeg",0.6));
        };
        img.src=e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAideIA = async () => {
    if(!photo){ alert("Ajoutez photo d'abord"); return; }
    
    // Vérif abonnement
    if(user.type==="client" || user.type==="freemium"){
      alert("🔒 IA réservée Pro 5$ / 11 500 CDF et Grossiste 25$ / 57 500 CDF. Vous êtes "+user.type+". Passez Pro pour utiliser IA gratuite.\n\nRègle: Non-paiement=retour Freemium. Paiement=activation immédiate.");
      window.location.href="/tarifs";
      return;
    }

    setLoadingIA(true);
    try{
      // 1. Comprendre image (gratuit)
      const cap = await comprendreImage(photo);
      setCaptionIA(cap);
      // 2. Améliorer image (gratuit navigateur)
      const improved = await ameliorerImageGratuit(photo);
      setPhoto(improved);
      // 3. Générer description vente (gratuit Groq mais réservé payants)
      const desc = await genererDescriptionVente(form.titre || "Produit", cap, "fr");
      setForm(f=>({...f, description: desc}));
    }catch(e:any){
      if(e.message==="IA_VENTE_RESERVEE_PAYANT"){
        alert("IA réservée abonnés payants. Pro 5$ / Grossiste 25$ - $ ou CDF");
      }else{
        alert("Erreur IA: "+e.message);
      }
    }
    setLoadingIA(false);
  };

  const handlePublish = () => {
    if(!user?.nom){ alert("Créez compte"); window.location.href="/inscription"; return; }
    
    // Client occasionnel - paiement avant
    if(user.type==="client" && !localStorage.getItem("paid_occasionnel")){
      alert("Client: Payez Publication Occasionnelle 3$ / 6 900 CDF avant lancement (Boost)");
      window.location.href="/tarifs";
      return;
    }
    
    // Freemium 3 à vie
    if(user.type==="freemium" && count>=3){
      alert("Freemium: 3 annonces à vie atteinte. Passez Pro 5$ ou Grossiste 25$");
      window.location.href="/tarifs";
      return;
    }

    const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
    annonces.push({ ...form, photo, user: user.nom, whatsapp: user.whatsapp, type: user.type, profession: user.profession, captionIA, date: new Date().toISOString() });
    localStorage.setItem("wenze_annonces_list", JSON.stringify(annonces));
    localStorage.setItem("wenze_annonces", String(count+1));
    if(user.type==="client") localStorage.removeItem("paid_occasionnel");
    
    alert(`✅ Publiée! ${user.type==="freemium" ? `${2-count} restantes` : "Illimité"} - Géoloc + IA + Traduction gratuites intégrées`);
    window.location.href="/profil";
  };

  if(!user?.nom) return <div className="max-w-[430px] mx-auto p-5">Chargement... <Link href="/inscription" className="text-blue-600">Créer compte Client: nom + WhatsApp + photo compressée + password 4-8 / Pro: nom + profession + adresse facultatif + photo + password</Link></div>;

  const isClient = user.type==="client";
  const isFreemium = user.type==="freemium";
  const isPayant = user.type==="pro" || user.type==="grossiste";
  const blocked = isFreemium && count>=3;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white p-5 pb-20">
      <Link href="/profil" className="text-xs">← Profil</Link>
      <h1 className="text-xl font-black mt-2">Publier - Partie Utilisateurs</h1>
      
      <div className="bg-black text-white p-2 rounded-xl mt-3 text-[10px] flex justify-between">
        <span>{user.type.toUpperCase()} - {user.profession||"Client"} - {user.type==="pro" ? "5$ / 11 500 CDF" : user.type==="grossiste" ? "25$ / 57 500 CDF" : "0$ Gratuit"}</span>
        <span>{isFreemium ? `${count}/3 à vie` : isClient ? "Occasionnel 3$" : "ILLIMITÉ"}</span>
      </div>

      {blocked ? (
        <div className="bg-red-50 p-4 rounded-xl mt-4 text-center">
          <p className="font-bold text-red-600">Limite Freemium atteinte</p>
          <Link href="/tarifs" className="block bg-red-600 text-white p-3 rounded-full mt-3">Passer Pro 5$ / Grossiste 25$ - $ ou CDF</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input placeholder="Titre produit/service" value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} className="w-full border p-3 rounded-xl text-sm" />
          <input placeholder="Prix $ ou CDF (ex: 10$ ou 25 000 CDF)" value={form.prix} onChange={e=>setForm({...form,prix:e.target.value})} className="w-full border p-3 rounded-xl text-sm" />
          <select value={form.categorie} onChange={e=>setForm({...form,categorie:e.target.value})} className="w-full border p-3 rounded-xl text-sm">
            <option value="">Catégorie</option><option>Électronique</option><option>Mode</option><option>Alimentation</option><option>Services</option><option>Matériaux</option>
          </select>

          <div>
            <label className="text-[11px] font-bold">Photo produit (compressée auto - compréhension image gratuite)</label>
            <input type="file" accept="image/*" onChange={async e=>{ const f=e.target.files?.[0]; if(f) setPhoto(await compress(f)); }} className="w-full border p-2 rounded-xl text-xs mt-1" />
            {photo && <img src={photo} className="w-full h-48 object-cover rounded-xl mt-2" />}
            {captionIA && <p className="text-[10px] text-gray-500 mt-1">🤖 IA voit: {captionIA}</p>}
          </div>

          {/* BOUTON IA - RÉSERVÉ PAYANTS */}
          {isPayant ? (
            <button onClick={handleAideIA} disabled={loadingIA} className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white p-3 rounded-xl text-sm font-bold">
              {loadingIA ? "🤖 IA analyse image + améliore + rédige..." : "🤖 IA Gratuite Pro: Améliorer image + Générer message vente"}
            </button>
          ) : (
            <div className="bg-gray-100 p-3 rounded-xl text-[11px]">
              <p className="font-bold">🔒 IA avancée réservée Pro/Grossiste</p>
              <p>Compréhension image + géoloc gratuites pour tous. Mais génération message vente + amélioration auto = seulement si abonnement payé 5$ / 11 500 CDF ou 25$ / 57 500 CDF. {isClient ? "Client: payez occasionnel 3$ + devenez Pro." : "Freemium: passez Pro."}</p>
            </div>
          )}

          <textarea placeholder="Description - Sera générée par IA si Pro" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full border p-3 rounded-xl text-sm h-24" />
          
          <div className="bg-green-50 p-2 rounded-xl text-[10px]">
            <p>📍 Géoloc: {form.lat ? `${form.lat.toFixed(4)}, ${form.lng.toFixed(4)} - Gratuit` : "Activation..."}</p>
            <p>💱 Paiement $ ou CDF - Traduction fr/en/ln/kg/lua/sw à la demande gratuite</p>
          </div>

          <button onClick={handlePublish} className="w-full bg-[#6C3CE0] text-white p-4 rounded-full font-bold">
            {isClient ? "Publier - Vérif paiement 3$ / 6 900 CDF" : isFreemium ? `Publier - ${3-count} restantes à vie` : "Publier - Illimité + IA + Géoloc"}
          </button>
        </div>
      )}
    </div>
  )
            }
