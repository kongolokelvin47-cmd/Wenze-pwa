"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FORMULES, TAUX_CDF } from "@/lib/paiement";

export const dynamic = 'force-dynamic';

const PROFESSIONS_PRO = ["Vendeur boutique", "Mécanicien", "Salon de coiffure", "Électricien", "Plombier", "Menuisier", "Tailleur", "Photographe", "Restaurateur", "Autres petits services"];
const PROFESSIONS_GROSSISTE = ["Grossiste / Dépôt B2B", "Agriculteur", "Entreprise", "Grande échelle / Usine"];

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/, ""); }

function InscriptionForm() {
  const params = useSearchParams();
  const router = useRouter();
  
  // Invitation
  const inviteToken = params.get("invite") || params.get("token") || "";
  const waParam = params.get("wa") || params.get("whatsapp") || "";
  const [invitation, setInvitation] = useState<any>(null);
  const [modeInvite, setModeInvite] = useState(false);

  const initialType = params.get("type") === "pro" ? "pro" : "client";
  const [type, setType] = useState<"client"|"pro">(initialType as any);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ nom: "", whatsapp: waParam, profession: "", adresse: "", password: "", confirmPassword:"", photo: "" });
  const [preview, setPreview] = useState("");

  useEffect(()=>{
    try{
      const { getInvitationByToken, cleanupExpired } = require("@/lib/invitations");
      cleanupExpired();
      if(inviteToken){
        const inv = getInvitationByToken(inviteToken);
        if(inv && inv.status==="pending" && new Date(inv.expireAt).getTime() > Date.now()){
          setInvitation(inv);
          setModeInvite(true);
          setForm(f=> ({...f, whatsapp: waParam || inv.toWa || "", nom: inv.toName || f.nom }));
        } else if(inv){
          setToast(`Invitation ${inv.token} déjà ${inv.status} / expirée - Crée compte direct ci-dessous`);
        }
      }
    }catch{}
  },[inviteToken, waParam]);

  const compressPhoto = (file: File): Promise<string> => {
    return new Promise((res) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof window === 'undefined') return res(e.target?.result as string);
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 400;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
          res(canvas.toDataURL("image/jpeg", 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhoto = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setToast("Photo trop lourde, max 5MB"); return; }
    const b64 = await compressPhoto(file);
    setForm({ ...form, photo: b64 });
    setPreview(b64);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    // Validation commune
    if (form.password.length < 4 || form.password.length > 8) { setToast("Mot de passe 4 à 8 caractères - Créé côté toi pour validation - Règle stricte"); return; }
    if(form.password!==form.confirmPassword){ setToast("Mots de passe différents - Confirme bien"); return; }
    if (!form.nom || !form.whatsapp) { setToast("Nom et WhatsApp obligatoires"); return; }
    if (type === "pro" && !form.profession) { setToast("Choisissez profession"); return; }
    if (!form.photo) { setToast("Photo de profil obligatoire"); return; }

    const telephoneClean = cleanWa(form.whatsapp);
    const whatsappClean = telephoneClean;

    if (whatsappClean.length < 9) { setToast("Numéro invalide. Ex: +243 81... - Min 9 chiffres"); return; }

    // MODE INVITATION - validation côté autrui WhatsApp+MDP
    if(modeInvite && invitation){
      if(cleanWa(whatsappClean)!==cleanWa(invitation.toWa)){
        setToast(`⛔ Ce lien est pour ${invitation.toWa} (${invitation.toName}), pas pour ${whatsappClean}. Règle stricte anti-fraude: valide avec le numéro invité seulement.`);
        return;
      }
      setLoading(true);
      try{
        const { confirmInvitation } = require("@/lib/invitations");
        const isGrossiste = PROFESSIONS_GROSSISTE.includes(form.profession);
        // On passe profession aussi via newAccount
        const acc = confirmInvitation(invitation.token, {
          whatsapp: whatsappClean,
          password: form.password,
          nom: form.nom.trim(),
          commune: form.adresse || "Kinshasa",
          ville: "Kinshasa",
          profession: form.profession || "Client / Acheteur"
        });
        // Met à jour avec photo + profession si pro
        const allUsers = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
        const idx = allUsers.findIndex((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp)===whatsappClean);
        if(idx>=0){
          allUsers[idx] = {
            ...allUsers[idx],
            photo: form.photo,
            profession: form.profession || allUsers[idx].profession,
            type: type==="pro" ? "freemium" : "client",
            typeSouhaite: type==="pro" ? (isGrossiste ? "grossiste" : "pro") : undefined,
            categorie: form.profession || "client_perso",
            abonnement: type==="client" ? `Client Gratuit - 0$ - Vente ${FORMULES.occasionnel.prix}$` : isGrossiste ? `${FORMULES.grossiste.nom} ${FORMULES.grossiste.prix}$` : `${FORMULES.pro.nom} ${FORMULES.pro.prix}$`,
            annoncesLimite: type==="client"?0:3,
            estBoutique: type==="pro",
            adresse: form.adresse
          };
          localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));
          localStorage.setItem("wenze_user", JSON.stringify(allUsers[idx]));
        }
        setToast(`✅ Bienvenue ${form.nom}! Compte validé WhatsApp ${whatsappClean} + MDP côté toi - Parrain ${invitation.fromName} - Expérience WENZE WENZE BUSINESS commence! Taux ${TAUX_CDF} - 0% comm`);
        setTimeout(()=> router.push("/profil"), 2000);
        return;
      }catch(err:any){
        setToast(err.message);
        setLoading(false);
        return;
      }
    }

    // MODE NORMAL - création directe
    const allUsersRaw = localStorage.getItem("wenze_all_users");
    const allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : [];
    const existeDeja = allUsers.find((u:any) => cleanWa(u.whatsapp || u.telephone || u.ownerWhatsapp || "") === whatsappClean);
    if (existeDeja) {
      setToast(`Ce numéro ${form.whatsapp} a déjà un compte: ${existeDeja.nom}. Connecte-toi - Règle stricte 1 numéro = 1 compte`);
      setTimeout(()=> router.push("/connexion"), 1500);
      return;
    }

    setLoading(true);
    const isGrossiste = PROFESSIONS_GROSSISTE.includes(form.profession);
    const uniqueId = `USER-${Date.now()}-${Math.random().toString(36).slice(2,4).toUpperCase()}`;

    let userData: any;
    if (type === "client") {
      userData = {
        id: uniqueId,
        nom: form.nom,
        whatsapp: whatsappClean,
        ownerWhatsapp: whatsappClean,
        telephone: telephoneClean,
        photo: form.photo,
        password: form.password,
        type: "client",
        role:"client",
        profession: "Client / Acheteur",
        categorie: "client_perso",
        categorieId:"client",
        abonnement: `Client Gratuit - 0$ / 0 CDF - Vente occasionnelle ${FORMULES.occasionnel.prix}$ / ${FORMULES.occasionnel.prixCDF} CDF`,
        annoncesLimite: 0,
        estBoutique: false,
        peutImmigrerPro: true,
        date: new Date().toISOString(),
        dateCreation: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        abonnementDate:null,
        abonnementPaye:false,
        ville: "Kinshasa",
        commune: form.adresse || "Kinshasa",
        freemiumCount: 0,
        verified:true,
        essaisRestants:7,
        bio:`Compte perso - WENZE WENZE BUSINESS - Taux ${TAUX_CDF} - 0% comm`
      };
    } else {
      userData = {
        id: uniqueId,
        nom: form.nom,
        whatsapp: whatsappClean,
        ownerWhatsapp: whatsappClean,
        telephone: telephoneClean,
        profession: form.profession,
        adresse: form.adresse,
        photo: form.photo,
        password: form.password,
        type: "freemium",
        role:"boutique",
        typeSouhaite: isGrossiste ? "grossiste" : "pro",
        categorie: form.profession,
        categorieId: isGrossiste ? "gros-autres" : "commerces-services",
        abonnement: isGrossiste ? `${FORMULES.grossiste.nom} ${FORMULES.grossiste.prix}$ / ${FORMULES.grossiste.prixCDF} CDF/mois` : `${FORMULES.pro.nom} ${FORMULES.pro.prix}$ / ${FORMULES.pro.prixCDF} CDF/mois`,
        annoncesLimite: 3,
        estBoutique: true,
        peutImmigrerPro: false,
        date: new Date().toISOString(),
        dateCreation: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        abonnementDate:null,
        abonnementPaye:false,
        ville: "Kinshasa",
        commune: form.adresse || "Kinshasa",
        freemiumCount: 0,
        verified:true,
        essaisRestants:7,
        prixUSD: isGrossiste ? FORMULES.grossiste.prix : FORMULES.pro.prix,
        prixCDF: isGrossiste ? FORMULES.grossiste.prixCDF : FORMULES.pro.prixCDF
      };
    }

    localStorage.setItem("wenze_user", JSON.stringify(userData));
    localStorage.setItem("wenze_connecte", "true");
    localStorage.setItem("wenze_annonces", "0");
    if (!localStorage.getItem("wenze_annonces_list")) {
      localStorage.setItem("wenze_annonces_list", "[]");
    }
    localStorage.setItem("wenze_panier", "[]");
    localStorage.setItem("wenze_favoris", "[]");

    allUsers.push(userData);
    localStorage.setItem("wenze_all_users", JSON.stringify(allUsers));

    try{
      const { addNotification } = await import("@/lib/notifications");
      addNotification({
        type:"publication_approved" as any,
        title:`🎉 Bienvenue ${form.nom} dans WENZE WENZE BUSINESS - Compte créé!`,
        message:`Bienvenue ${form.nom}! Ton compte WhatsApp ${whatsappClean} + MDP validé côté toi - Règle stricte respectée - ${type==="client"?"Client perso":"Boutique Pro"} - Freemium 3 vie images only - Essai 7j illimité - Puis boutique 5$ / 11 500 CDF et 10$ / 23 000 CDF pour illimité + 🔔 notif clients + boost 1$/3$/5$ + pub vidéo 1$/3$/15$ + rappel J-5 J-1 - Taux fixe ${TAUX_CDF} - 0% commission - Vis l'expérience réelle Kinshasa!`,
        boutiqueId:whatsappClean,
        forUserId:whatsappClean,
        actionUrl:"/publier",
        priority:"high",
        data:{}
      } as any);
    }catch{}

    setTimeout(() => { setLoading(false); router.push("/profil"); }, 800);
  };

  const isGrossisteSelected = PROFESSIONS_GROSSISTE.includes(form.profession);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-20">
      <Link href="/profil" className="text-xs text-[#6C3CE0] font-bold">← Retour Profil</Link>
      
      {/* INVITATION BANNER */}
      {modeInvite && invitation && (
        <div className="mt-4 bg-black text-white rounded-2xl p-4 border-2 border-black">
          <p className="font-black text-[13px]">🎉 Tu es invité par {invitation.fromName}!</p>
          <p className="text-[11px] mt-1 opacity-90">Code {invitation.token} • Pour {invitation.toName} - {invitation.toWa} • Expire {new Date(invitation.expireAt).toLocaleString("fr-FR")} • 48h</p>
          <p className="text-[10px] mt-2 font-black bg-white text-black p-2 rounded-xl">⚠️ RÈGLE STRICTE: Ce lien est pour {invitation.toWa} seulement. Tu dois valider avec TON WhatsApp + TON MDP côté toi. Garde compteur parrain: {invitation.fromName} a {(() => { try{ return JSON.parse(localStorage.getItem("wenze_invitations")||"[]").toString()); }catch{ return 0; } })()} filleuls.</p>
        </div>
      )}

      {/* REGLES STRICTES */}
      <div className="mt-3 bg-red-50 border-2 border-red-200 rounded-xl p-3">
        <p className="font-black text-[10px]">⛔ RÈGLES STRICTES WENZE</p>
        <p className="text-[9px] mt-1 text-gray-700">Personne ne crée compte pour autrui sans validation côté autrui WhatsApp+MDP. WhatsApp = ID unique non modifiable. 1 numéro = 1 compte. Garde compteur 5j-3j=2j. 0% commission. Taux {TAUX_CDF}.</p>
      </div>

      <div className="flex gap-2 mt-4">
        <button type="button" onClick={() => setType("client")} className={`flex-1 p-3 rounded-full text-xs font-bold border-2 ${type === "client" ? "bg-black text-white border-black" : "bg-white"}`}>Client Perso</button>
        <button type="button" onClick={() => setType("pro")} className={`flex-1 p-3 rounded-full text-xs font-bold border-2 ${type === "pro" ? "bg-[#6C3CE0] text-white border-[#6C3CE0]" : "bg-white"}`}>Boutique Pro</button>
      </div>
      <h1 className="text-xl font-black mt-4">{modeInvite ? `Bienvenue ${invitation?.toName||""} - ${type === "client" ? "Compte Perso invité" : "Boutique invité"}` : type === "client" ? "Compte Personnel - Gratuit" : "Créer Boutique - Gratuit"}</h1>
      <p className="text-[11px] text-green-600 font-bold">✓ INSCRIPTION GRATUITE 0$ / 0 CDF - Taux 1$ = {TAUX_CDF} CDF - 1 numéro = 1 compte - {modeInvite?`Parrain ${invitation?.fromName} - Validation côté toi`:"Direct"} - WhatsApp+MDP</p>
      {type === "client" && <div className="bg-white border-2 rounded-xl p-3 mt-2"><p className="text-[10px] text-gray-700">✅ <b>Compte perso, pas boutique.</b> Illimité achat. Vente {FORMULES.occasionnel.prix}$ / {FORMULES.occasionnel.prixCDF} CDF - Boost 0$/1$/3$/5$ + 🔔 notif si payant - Règle stricte: chacun son compte</p></div>}
      {type === "pro" && <div className="bg-white border-2 rounded-xl p-3 mt-2"><p className="text-[10px] text-gray-700">✅ <b>Boutique Pro</b> 3 annonces gratuites à vie - Essai 7j illimité images only - Puis {FORMULES.pro.prix}$/{FORMULES.grossiste.prix}$ - 0% commission - {isGrossisteSelected?`Grossiste ${FORMULES.grossiste.prix}$`:`Pro ${FORMULES.pro.prix}$`} - Taux {TAUX_CDF}</p></div>}
      
      {toast && <div className={`mt-3 p-3 rounded-xl text-[11px] font-bold text-center ${toast.includes("✅")||toast.includes("Bienvenue")?"bg-green-600 text-white":"bg-red-50 text-red-700 border-2 border-red-200"}`}>{toast}</div>}

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div><label className="text-[11px] font-bold">Nom complet *</label><input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Jean Kabasele" className="w-full border-2 p-3 rounded-xl text-sm mt-1 bg-white" /></div>
        <div>
          <label className="text-[11px] font-bold">WhatsApp * (unique - ID non modifiable) {modeInvite?`(doit être ${invitation?.toWa})`:""}</label>
          <input required value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+243 81..." className="w-full border-2 p-3 rounded-xl text-sm mt-1 bg-white font-bold" />
        </div>
        {type === "pro" && <>
            <div><label className="text-[11px] font-bold">Profession boutique *</label><select required value={form.profession} onChange={e => setForm({ ...form, profession: e.target.value })} className="w-full border-2 p-3 rounded-xl text-sm mt-1 bg-white"><option value="">Choisissez</option><optgroup label={`Petits services - ${FORMULES.pro.prix}$`} >{PROFESSIONS_PRO.map(p => <option key={p} value={p}>{p}</option>)}</optgroup><optgroup label={`Grande échelle - ${FORMULES.grossiste.prix}$`}>{PROFESSIONS_GROSSISTE.map(p => <option key={p} value={p}>{p}</option>)}</optgroup></select></div>
            <div><label className="text-[11px] font-bold">Adresse / Commune</label><input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} placeholder="Av. Lumumba 12, Gombe" className="w-full border-2 p-3 rounded-xl text-sm mt-1 bg-white" /></div>
          </>}
        <div><label className="text-[11px] font-bold">Photo profil * (400px compressée)</label><input type="file" accept="image/*" onChange={handlePhoto} className="w-full text-xs mt-1 border-2 p-2 rounded-xl bg-white" />{preview && <div className="mt-2 flex items-center gap-2"><img src={preview} alt="preview" className="w-16 h-16 rounded-full object-cover border-2" /><p className="text-[10px] text-green-600">✓ Compressée - Règle stricte respectée</p></div>}</div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-[11px] font-bold">Mot de passe * (4 à 8)</label><input required type="password" minLength={4} maxLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="4 à 8" className="w-full border-2 p-3 rounded-xl text-sm mt-1 bg-white" /></div>
          <div><label className="text-[11px] font-bold">Confirme MDP *</label><input required type="password" minLength={4} maxLength={8} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirme" className="w-full border-2 p-3 rounded-xl text-sm mt-1 bg-white" /></div>
        </div>
        <p className="text-[9px] text-gray-500 text-center">WhatsApp+MDP validé côté toi - Règle stricte: personne ne crée compte pour autrui sans toi - Taux {TAUX_CDF} - 0% comm - 3 vie + 7j essai + boutique 5$/10$ + 🔔 notif + boost + pub vidéo</p>
        <button disabled={loading} type="submit" className={`w-full p-4 rounded-full font-bold text-white mt-2 ${type === "pro" ? "bg-[#6C3CE0]" : "bg-black"} ${loading ? "opacity-50" : ""}`}>{loading ? "Création..." : modeInvite ? `✅ Valider mon compte invité ${invitation?.token} - WhatsApp+MDP côté moi - Bienvenue 🎉` : type === "client" ? "Créer Compte Perso - Gratuit 0$ - Bienvenue 🎉" : "Créer Boutique - Gratuit 3 annonces - Bienvenue 🎉"}</button>
      </form>
    </div>
  )
}

export default function Inscription() {
  return (
    <Suspense fallback={<div className="max-w-[430px] mx-auto p-10 text-center text-sm">Chargement WENZE WENZE BUSINESS - Vérification invitation...</div>}>
      <InscriptionForm />
    </Suspense>
  );
            }
