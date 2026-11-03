"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";
import { FREEMIUM, TAUX_CDF, toCDF, toCDFString, verifierAbonnement, consommerPlace, libererPlace, checkFreemiumWenze } from "@/lib/paiement";
import { MAX_ACTIVES, MAX_PHOTOS, cleanWa, getUser, readList } from "./helpers";
import { StatusBanners, TicketPicker, PhotoPicker } from "./Sections";
import ProductForm from "./ProductForm";

export const dynamic = "force-dynamic";

// === REFORMES 2+5+6 - AJOUT MINIMAL - 0 PLACE ===
function checkAmbassadeur(code?: string){
  if(!code) return { valid:false, isAmb:false, code:"" };
  try{
    const all = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
    const found = all.find((u:any)=> (u.ambassadorCode||"").toUpperCase()===code.toUpperCase() || (u.myInviteCode||"").toUpperCase()===code.toUpperCase());
    const clean = (n:string)=> n.replace(/[^0-9]/g,"").replace(/^0+/,"");
    const isNum = clean(code).length>=9;
    return { valid: !!found || isNum, isAmb: !!found?.isAmbassadeur, parrain: found||null, code: code.toUpperCase() };
  }catch{ return { valid:false, isAmb:false, code: code.toUpperCase() }; }
}
function getBoutiqueNom(u:any){
  const nom = (u?.nomBoutique || u?.boutiqueName || u?.name || u?.nomEtablissement || "").trim();
  const marque = (u?.marque || "").trim();
  if(nom.includes("(")) return nom;
  const base = nom.replace(/^Boutiques\s*/i,"") || "Bilamba";
  const marq = marque || (base.toLowerCase().includes("bilamba")?"Maison d'habillement":"Commerce général");
  return `Boutiques ${base} (${marq})`;
}
function payerPremierAbo(inviteWa:string, montant:number){
  try{
    const clean = (n:string)=> n.replace(/[^0-9]/g,"").replace(/^0+/,"");
    const list = JSON.parse(localStorage.getItem("wenze_invitations")||"[]");
    const inv = list.find((i:any)=> clean(i.inviteWa)===clean(inviteWa) && !i.premierAbonnementPaye);
    if(!inv) return;
    inv.premierAbonnementPaye=true;
    inv.montantAbonnement=montant;
    inv.dateAbonnement=new Date().toISOString();
    if(inv.parrainType==="ambassadeur"){
      inv.montantCommission=montant*0.20;
      const comms = JSON.parse(localStorage.getItem("wenze_commissions_ambassadeurs")||"[]");
      comms.push({ parrainWa: inv.parrainWa, inviteWa: clean(inviteWa), code: inv.codeParrainage, montantAbonnement: montant, commission: inv.montantCommission, status: "en attente fin mois", date: new Date().toISOString() });
      localStorage.setItem("wenze_commissions_ambassadeurs", JSON.stringify(comms));
    } else {
      const cadeaux = JSON.parse(localStorage.getItem("wenze_cadeaux_parrainage")||"[]");
      cadeaux.push({ parrainWa: inv.parrainWa, parrainCode: inv.codeParrainage, inviteWa: clean(inviteWa), points: 1+(montant>=5?1:0), pubsInvite: montant, status: "à contacter par plateforme", date: new Date().toISOString() });
      localStorage.setItem("wenze_cadeaux_parrainage", JSON.stringify(cadeaux));
    }
    localStorage.setItem("wenze_invitations", JSON.stringify(list));
  }catch{}
}

function PublierContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp.get("edit");
  const catFromUrl = normalizeCategorie(sp.get("cat") || "");
  const ticketFromUrl = sp.get("ticket") || "";

  const [user, setUser] = useState<any>(null);
  const [ab, setAb] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(ticketFromUrl);
  const [isEditMode, setIsEditMode] = useState(false);
  const [original, setOriginal] = useState<any>(null);
  const [form, setForm] = useState<any>({
    titre: "", description: "", prix: "", categorieId: "commerces-services",
    activiteId: "", commune: "", ville: "Kinshasa", stock: "1", livraison: "Retrait / Livraison Kinshasa"
  });
  // === REFORMES - NOUVEAUX STATES SEULEMENT ===
  const [niveau, setNiveau] = useState(1);
  const [codeAmbassadeur, setCodeAmbassadeur] = useState("");
  const [codeInfo, setCodeInfo] = useState<any>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/connexion?next=/publier"); return; }
    const waU = cleanWa(u.ownerWhatsapp || u.whatsapp || u.id);

    try {
      const check: any = verifierAbonnement();
      // === REFORME 1: 3 NIVEAUX - SANS CASSER CHECK EXISTANT ===
      const hasGmail = !!(u.email && u.emailVerified);
      const hasWaVerified = !!u.whatsappVerified;
      let niv = 1;
      if(hasGmail && hasWaVerified) niv=3;
      else if(hasGmail) niv=2;
      setNiveau(niv);
      const mineCount = readList("wenze_annonces_list").filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp)===waU).length;
      const freemiumCheck:any = (()=>{ try{ return checkFreemiumWenze(u, mineCount); }catch{ return {}; }})();
      const merged = { ...check, ...freemiumCheck, niveau:niv, hasGmail, hasWaVerified, maxPlaces: check?.maxPlaces || freemiumCheck?.maxPlaces || 50 };
      // Niveau 1 = 1 image freemium seulement (au lieu de 3)
      if(niv===1 && !check?.isPaye){ merged.maxImages = 1; merged.count = Math.min(mineCount,1); }
      setAb(merged);

      const avecPlace = (merged?.ticketsActifs || []).find((t: any) => t.imagesUsed < t.imagesMax);
      if (avecPlace) setSelectedTicketId((prev: string) => prev || avecPlace.ticketId);
    } catch {}

    let old: any = null;
    if (editId) {
      try {
        old = readList("wenze_annonces_list").find((x: any) => String(x.id) === String(editId)) || null;
        if (!old) { setToast({ msg: "Annonce introuvable", type: "error" }); setLoading(false); setTimeout(() => router.push("/boutiques"), 1500); return; }
        const waA = cleanWa(old.ownerWhatsapp || old.whatsapp || old.userId);
        if (waU !== waA && u.id !== old.userId) { setToast({ msg: "⛔ Cette annonce ne vous appartient pas", type: "error" }); setLoading(false); setTimeout(() => router.push("/"), 2000); return; }
        setForm({ titre: old.titre || "", description: old.description || "", prix: String(old.prixUSD || old.prix || ""), categorieId: normalizeCategorie(old.categorieId || "commerces-services"), activiteId: old.activiteId || "", commune: old.commune || "", ville: old.ville || "Kinshasa", stock: String(old.stock || 1), livraison: old.livraison || "Retrait / Livraison Kinshasa" });
        setPhotos(old.images?.length ? old.images.slice(0, MAX_PHOTOS) : old.photo ? [old.photo] : []);
        setOriginal(old);
        if (old.ticketId) setSelectedTicketId(old.ticketId);
        setIsEditMode(true);
      } catch {}
    }

    const fixedCat = normalizeCategorie(catFromUrl || u.categorieId || "commerces-services");
    const catObj: any = getCategorieById(fixedCat);
    const firstAct = catObj?.activites?.[0]?.id || "";
    setUser({
      ownerWhatsapp: u.ownerWhatsapp || u.whatsapp || "", whatsapp: u.whatsapp || "", id: u.id || "", nom: u.nom || "",
      nomEtablissement: u.nomEtablissement || u.nom || "", commune: u.commune || "", categorieId: fixedCat,
      role: u.role || "boutique", user_type: u.user_type || u.role || "boutique", email: u.email, emailVerified: u.emailVerified, whatsappVerified: u.whatsappVerified,
      ambassadorCode: u.ambassadorCode, myInviteCode: u.myInviteCode, isAmbassadeur: u.isAmbassadeur
    });
    if (!old) { setForm((f: any) => ({ ...f, categorieId: fixedCat, activiteId: u.activiteId || firstAct, commune: u.commune || f.commune })); }
    // Pré-remplir code si vient d'invitation / inscription
    const codeFromUrl = sp.get("code") || u.codeParrainageUtilise || u.ambassadorUsed || "";
    if(codeFromUrl){ setCodeAmbassadeur(codeFromUrl); setCodeInfo(checkAmbassadeur(codeFromUrl)); }
    setLoading(false);
  }, [router, editId, catFromUrl, sp]);

  useEffect(()=>{ if(codeAmbassadeur.trim()) setCodeInfo(checkAmbassadeur(codeAmbassadeur)); else setCodeInfo(null); },[codeAmbassadeur]);

  const currentCat: any = useMemo(() => getCategorieById(form.categorieId) || {}, [form.categorieId]);
  const activites: any[] = currentCat.activites || [];
  const prixNum = Number(form.prix || 0);
  const selectedTicket: any = useMemo(() => (ab?.ticketsActifs || []).find((t: any) => t.ticketId === selectedTicketId), [ab, selectedTicketId]);

  function notify(msg: string, type: string = "success") { setToast({ msg: msg, type: type }); setTimeout(() => setToast(null), 4000); }
  function setField(key: string, value: string) { setForm((f: any) => ({ ...f, [key]: value })); }

  function handlePublish() {
    if (!ab) { notify("Vérification de l'abonnement en cours...", "error"); return; }
    if (!isEditMode) {
      if (ab.isCache) { router.push("/abonnement?msg=cache"); return; }
      // REFORME 1: Niveau 1 bloqué à 1 image
      if(niveau===1 && !ab.isPaye && ab.count>=1){ notify("Niveau 1: 1 image gratuite atteinte. Crée Gmail pour débloquer 2 images + abonnements. Code ambassadeur 0 place possible.", "error"); return; }
      if (!ab.peutPublier) { notify(ab.isFreemium ? "Limite gratuite atteinte (" + (niveau===1?1:FREEMIUM.maxImages) + " images) : achetez un abonnement dès " + toCDFString(1) : "Plus de places libres : achetez un nouveau ticket", "error"); return; }
      if (ab.isPaye && !selectedTicketId) { notify("Choisissez le ticket sur lequel publier", "error"); return; }
    }
    if (form.titre.trim().length < 3) { notify("Titre : 3 caractères minimum", "error"); return; }
    if (!(prixNum > 0)) { notify("Prix en $ requis", "error"); return; }
    if (!photos.length) { notify("Ajoutez au moins 1 photo", "error"); return; }
    if(niveau===1 && photos.length>1){ notify("Niveau 1 Sans Gmail: 1 image seulement. Crée Gmail pour 10 photos.", "error"); return; }
    if (!user) { router.push("/connexion"); return; }

    const wa = cleanWa(user.ownerWhatsapp || user.whatsapp);
    let list = readList("wenze_annonces_list");
    if (isEditMode) { list = list.filter((x: any) => String(x.id) !== String(editId)); }
    else { const nb = list.filter((a: any) => cleanWa(a.ownerWhatsapp || a.whatsapp) === wa).length; if (nb >= MAX_ACTIVES) { notify("Maximum " + MAX_ACTIVES + " annonces actives : supprimez-en une", "error"); return; } }

    const id = isEditMode && editId ? editId : "WENZE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    let placeConsommee = false;
    setSaving(true);
    try {
      if (!isEditMode && selectedTicketId) {
        if (!consommerPlace(selectedTicketId, id)) { notify("Ticket plein ou expiré : choisissez un autre ticket", "error"); setSaving(false); return; }
        placeConsommee = true;
      }

      // === REFORME 4: Client -> Vendeur en 1 clic - SANS CASSER ANCIEN USER ===
      if(user.role==="client" || user.user_type==="client"){
        const nomComplet = getBoutiqueNom({ nomBoutique: form.titre.split(" ")[0]||"Bilamba", marque: "Commerce général" });
        const newUser = { ...user, role:"vendeur", user_type:"vendeur", nomEtablissement: nomComplet, boutiqueName: nomComplet, becameSellerAt: new Date().toISOString(), myInviteCode: user.myInviteCode||`WENZE-${wa.slice(-4)}` };
        try{
          localStorage.setItem("wenze_user", JSON.stringify(newUser));
          const all=readList("wenze_all_users");
          const idx=all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp||u.whatsapp)===wa);
          if(idx>=0) all[idx]=newUser; else all.push(newUser);
          localStorage.setItem("wenze_all_users", JSON.stringify(all));
          setUser(newUser);
        }catch{}
      }

      const activiteObj: any = activites.find((x: any) => x.id === form.activiteId);
      const createdAtFinal = original?.createdAt || original?.created_at || new Date().toISOString();
      const catId = normalizeCategorie(form.categorieId);
      const ticketFields = isEditMode ? {} : { ticketId: selectedTicketId || null, palierId: selectedTicket?.palierId || ab.palierId || null, freemium: !!ab.isFreemium, expireAt: selectedTicket?.expireAt || ab.expireAt || null };

      const annonce = {
        ...(original || {}), id: id, titre: form.titre.trim(), description: form.description.trim(),
        prix: prixNum, prixUSD: prixNum, prixCDF: toCDF(prixNum), prixCDFString: toCDFString(prixNum),
        categorieId: catId, categorie: catId, activiteId: form.activiteId, activite: activiteObj?.label || activiteObj?.titre || form.activiteId,
        photo: photos[0], images: photos, ownerWhatsapp: wa, whatsapp: wa,
        ownerName: user.nomEtablissement || user.nom || getBoutiqueNom(user), userId: user.id || wa,
        commune: form.commune || user.commune || "Kinshasa", ville: form.ville || "Kinshasa",
        stock: Number(form.stock || 1), livraison: form.livraison, taux: TAUX_CDF,
        created_at: createdAtFinal, createdAt: createdAtFinal, statut: "actif",
        ...(isEditMode ? { updatedAt: new Date().toISOString() } : {}), ...ticketFields,
        // === REFORMES 2+5+6: Stocke code parrainage mais 0 place comptée ===
        codeParrainageUtilise: codeAmbassadeur||null, codeAmbassadeurUtilise: codeInfo?.isAmb?codeAmbassadeur:null,
        placesConsommeesPourCode: 0, // JAMAIS compté comme place
        parrainInfo: codeInfo?.parrain ? { parrainWa: cleanWa(codeInfo.parrain.ownerWhatsapp), code: codeInfo.code } : null,
      };

      list.unshift(annonce);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(list.slice(0, 200)));

      // === REFORME 2: Code ambassadeur ne consomme pas place + REFORME 6: crédite parrain ===
      if(codeAmbassadeur && codeInfo?.valid){
        try{
          const trans = readList("wenze_transactions");
          trans.push({ type:"code_ambassadeur_utilise", code:codeAmbassadeur, ownerWhatsapp:wa, annonceId:id, date:new Date().toISOString(), placesConsommees:0 });
          localStorage.setItem("wenze_transactions", JSON.stringify(trans));
        }catch{}
      }
      // Si premier abo payé, crédite parrain 20% ou cadeaux
      if(!isEditMode && ab.isPaye && selectedTicket){
        try{
          const montant = selectedTicket.prixUSD || selectedTicket.montant || 0;
          if(montant>0) payerPremierAbo(wa, montant);
        }catch{}
      }

      let ticketLabel = "";
      if (!isEditMode) { ticketLabel = selectedTicket ? "🎫 " + selectedTicket.palierId + " " + (selectedTicket.imagesUsed + 1) + "/" + selectedTicket.imagesMax + " places" + (codeAmbassadeur?` + Code ${codeAmbassadeur} (0 place)`:"") : "🆓 Gratuit " + ((ab.count || 0) + 1) + "/" + (niveau===1?1:FREEMIUM.maxImages) + (codeAmbassadeur?` + Code ${codeAmbassadeur} (0 place)`:""); }
      setShowSuccess({ titre: annonce.titre, prix: prixNum + "$ / " + toCDFString(prixNum), ticketLabel: ticketLabel });
      setSaving(false);
      setTimeout(() => router.push("/produit/" + id), 1800);
    } catch {
      if (placeConsommee) { try { libererPlace(id); } catch {} }
      notify("Stockage plein : réduisez les photos ou supprimez d'anciennes annonces", "error");
      setSaving(false);
    }
  }

  if (loading) { return (<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse"></div></div>); }

  const isCache = !!ab?.isCache;
  const needsTicket = !isEditMode && !!ab?.isPaye;
  const blocked = !isEditMode && (!ab || isCache || !ab.peutPublier || (niveau===1 && ab?.count>=1 && !ab?.isPaye));
  const photosDisabled = blocked || (needsTicket && !selectedTicketId);
  const headerStatus = !ab ? "..." : isCache ? "🔒 Compte caché" : ab.isPaye ? (ab.ticketsActifs?.length || 0) + " ticket(s) - " + (ab.placesRestantes || 0) + " places libres strictes + Code 0 place" : "🆓 Gratuit " + ab.count + "/" + (niveau===1?1:FREEMIUM.maxImages) + " - Niveau "+niveau;
  const isClient = user && (user.role==="client" || user.user_type==="client");

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      {showSuccess ? (<div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[28px] max-w-[360px] w-full p-6 text-center border-2 border-black shadow-2xl"><div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div><h2 className="font-black text-[18px] mt-4">{isEditMode ? "Modification enregistrée !" : "Annonce publiée !"}</h2><div className="bg-[#FFFBF0] border-2 rounded-2xl p-4 mt-4 text-left"><p className="font-black text-[13px]">{showSuccess.titre}</p><p className="text-[12px] font-black text-orange-600 mt-1">{showSuccess.prix}</p>{showSuccess.ticketLabel ? (<p className="text-[10px] mt-2 bg-black text-white inline-block px-2.5 py-1 rounded-full">{showSuccess.ticketLabel}</p>) : null}</div><p className="text-[10px] text-gray-500 mt-3">Redirection vers l'annonce...</p></div></div>) : null}

      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href={isEditMode ? "/produit/" + editId : "/"} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[13px] truncate">{isEditMode ? "Modifier l'annonce" : "Publier une annonce"} - {user?getBoutiqueNom(user):""}</h1>
          <p className="text-[9px] text-gray-500 truncate">{headerStatus} - Taux {TAUX_CDF} - Niveau {niveau} - Code 0 place</p>
        </div>
        <span className={"text-[10px] px-2.5 py-1 rounded-full font-black text-white " + (isCache ? "bg-red-600" : ab?.isPaye ? "bg-black" : "bg-orange-500")}>{ab?.badge || "..."} N{niveau}</span>
      </header>

      <div className="p-4 space-y-4">
        {toast ? (<div className={"p-3.5 rounded-xl text-[11px] font-bold border-2 " + (toast.type === "error" ? "bg-red-50 text-red-700 border-red-300" : "bg-green-50 text-green-800 border-green-300")}>{toast.msg}</div>) : null}

        {/* === REFORME 1: BANNIERE 3 NIVEAUX - AJOUT SEULEMENT === */}
        <div className={`border-2 rounded-2xl p-3 ${niveau===1?"bg-orange-50 border-orange-300":niveau===2?"bg-blue-50 border-blue-300":"bg-black text-white border-black"}`}>
          <p className="font-black text-[11px]">
            {niveau===1 && "Niveau 1 - Sans Gmail (40% vendeurs Kin): 1 image freemium seulement • Peut payer occasionnel 2$/7j seulement • Message: Crée Gmail pour 3 images + STANDARD/PRO/PREMIUM"}
            {niveau===2 && "Niveau 2 - Avec Gmail vérifié (60%): 3 images freemium + tous abonnements STANDARD 0.5$/1j - 3$/7j - 12$/30j + PRO + PREMIUM"}
            {niveau===3 && "Niveau 3 - Gmail + WhatsApp vérifié (5%): Peut tout faire + badge Vendeur Vérifié Wenze + Top 3 garanti"}
          </p>
          <p className="text-[9px] mt-1">Toi: {niveau===1?"Sans Gmail → 1 image max, 0.02$ économisé":niveau===2?"Gmail vérifié → 3 images":"Premium vérifié"} • Coût 0$ pour 95% • Places annonces: {ab?.placesRestantes||0} libres strictes • Code ambassadeur 0 place • Invitation 0 place</p>
        </div>

        <StatusBanners ab={ab} isEditMode={isEditMode} />

        {/* === REFORME 4: CLIENT PEUT PUBLIER === */}
        {isClient && (
          <div className="bg-black text-white rounded-2xl p-4">
            <p className="font-black text-[11px]">Tu es client, tu deviens vendeur en publiant - Réforme 4</p>
            <p className="text-[9px] text-white/70 mt-1">Garde ton compte client. Tu deviendras {getBoutiqueNom(user)} automatiquement après publication. Code ambassadeur facultatif 0 place. Invitation WhatsApp réservée 0 place.</p>
          </div>
        )}

        {/* === REFORMES 2+5+6: CODE AMBASSADEUR / 
