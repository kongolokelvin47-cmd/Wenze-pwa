"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const cleanWa = (n:any)=>(n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const TAUX_CDF = 2850;
const safePrix = (p:any)=>{ const v=Number(p||0); return isNaN(v)?0:v; };
const safeCDF = (p:any)=>{ try{ return (safePrix(p)*TAUX_CDF).toLocaleString(); }catch{ return "0"; } };
const readList = (k:string):any[]=>{ try{ const r=localStorage.getItem(k); const v=r?JSON.parse(r):[]; return Array.isArray(v)?v:[]; }catch{ return []; } };

export default function ProduitPage(){
  const params = useParams();
  const rawId = (params?.id as string) || "";
  let id = rawId;
  try{ id = decodeURIComponent(rawId); }catch{ id = rawId; }

  const [a, setA] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [added, setAdded] = useState(false);
  const [vendeurInfo, setVendeurInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(()=>{
    try{
      const uRaw = localStorage.getItem("wenze_user");
      const u = uRaw ? JSON.parse(uRaw) : null;
      setUser(u);

      const list = readList("wenze_annonces_list");
      // FIX: cherche par id exact OU id sans préfixe WENZE- OU titre
      const found = list.find((x:any)=> x.id===id || x.id===decodeURIComponent(id) || cleanWa(x.id)===cleanWa(id));
      if(!found){
        setNotFound(true);
        setLoading(false);
        return;
      }
      setA(found);

      // Vendeur
      const allUsers = readList("wenze_all_users");
      const waVendeur = cleanWa(found.ownerWhatsapp||found.whatsapp||found.userId);
      const vendeur = allUsers.find((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp||x.id)===waVendeur) || u;
      setVendeurInfo(vendeur ? {...vendeur, wa: waVendeur} : {wa: waVendeur, nomBoutique: found.boutiqueName||`Boutique ${waVendeur.slice(-4)}`, marque: found.marque||"Commerce général"});

      // Produits similaires même vendeur
      const rel = list.filter((x:any)=> x.id!==found.id && cleanWa(x.ownerWhatsapp||x.whatsapp||x.userId)===waVendeur).slice(0,4);
      setRelated(rel);
    }catch{
      setNotFound(true);
    }
    setLoading(false);
  },[id]);

  const isOwnerMe = useMemo(()=>{
    if(!user || !a) return false;
    try{ return cleanWa(user.ownerWhatsapp||user.whatsapp||user.id)===cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId) || user.id===a.userId; }catch{ return false; }
  },[user,a]);

  // NOUVEAU MESSAGE WHATSAPP - Ton modèle exact + LIEN CLIQUABLE
  const handleWhatsApp = ()=>{
    if(!a) return;
    try{
      const phone = cleanWa(a.ownerWhatsapp||a.whatsapp||vendeurInfo?.wa||"");
      if(!phone) return;
      const base = typeof window!=="undefined" ? window.location.origin : "https://wenze.cd";
      const lien = `${base}/produit/${encodeURIComponent(a.id)}`;
      const msg = `Bonjour,

Je vous contacte depuis Wenze Wenze Business.

Je suis intéressé(e) par votre article :

- Article : ${a.titre || "Article"}
- Prix affiché : ${safePrix(a.prix)}$ / ${safeCDF(a.prix)} CDF
- Référence : ${a.id}

Je souhaiterais acheter cet article. Est-il toujours disponible ?

Merci de bien vouloir me renseigner sur les modalités d'achat.

Cordialement.

Lien annonce : ${lien}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    }catch{}
  };

  const handleAdd = ()=>{
    try{
      const panier = readList("wenze_panier");
      panier.push({...a, qty:1});
      localStorage.setItem("wenze_panier", JSON.stringify(panier));
      setAdded(true);
      setTimeout(()=>setAdded(false),2500);
    }catch{}
  };

  const handleCopyLink = async ()=>{
    try{
      const base = typeof window!=="undefined" ? window.location.origin : "https://wenze.cd";
      const lien = `${base}/produit/${encodeURIComponent(id)}`;
      await navigator.clipboard.writeText(lien);
      setAdded(true);
      setTimeout(()=>setAdded(false),2000);
    }catch{}
  };

  if(loading) return <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center font-black">Chargement produit {id}...</div>;

  // FIX LIEN INACCESSIBLE: au lieu d'écran blanc, on montre la référence + bouton WhatsApp
  if(notFound || !a) return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">
      <div className="bg-white border rounded-[20px] p-8 mt-10">
        <p className="text-3xl">😕</p>
        <p className="font-black mt-2">Produit introuvable sur ce téléphone</p>
        <p className="text-[11px] text-gray-500 mt-2">Référence : <b>{id}</b></p>
        <p className="text-[11px] text-gray-500 mt-1">Ce lien a été créé sur le téléphone du vendeur. Demande-lui de te renvoyer la photo + prix sur WhatsApp.</p>
        <Link href="/" className="mt-4 block bg-black text-white py-3 rounded-full font-black text-[11px]">← Retour accueil</Link>
        <Link href="/boutiques" className="mt-2 block bg-white border-2 border-black py-3 rounded-full font-black text-[11px]">Voir boutiques</Link>
      </div>
    </div>
  );

  const waVendeur = cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId);
  const nomBoutique = vendeurInfo?.nomBoutique || vendeurInfo?.boutiqueName || a.boutiqueName || `Boutiques ${waVendeur.slice(-4)} (${a.marque||"Commerce général"})`;

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link href="/boutiques" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[13px] truncate">{a.titre}</h1>
          <p className="text-[10px] text-gray-500 truncate">Réf: {a.id}</p>
        </div>
        <button onClick={handleCopyLink} className="text-[10px] font-black bg-black text-white px-3 py-1.5 rounded-full">{added?"✅ Copié":"🔗 Copier lien"}</button>
      </header>

      <div className="p-4">
        <div className="bg-white border-2 border-black rounded-[20px] overflow-hidden">
          {a.video||a.videoUrl ? <video src={a.video||a.videoUrl} controls playsInline className="w-full aspect-square object-cover bg-black"/> : a.photo ? <img src={a.photo} className="w-full aspect-square object-cover"/> : <div className="w-full aspect-square flex items-center justify-center text-4xl">📦</div>}
          <div className="p-4">
            <p className="font-black text-[16px]">{a.titre}</p>
            <p className="text-[11px] text-gray-500 mt-1">{a.commune||"Kinshasa"} • {a.marque||vendeurInfo?.marque||"Commerce général"}</p>
            <p className="font-black text-[18px] mt-2">{safePrix(a.prix)}$ / {safeCDF(a.prix)} CDF</p>
            <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">{a.description||"Article disponible. Contacte le vendeur pour taille / couleur / stock."}</p>
            <div className="bg-[#FFF2CC] rounded-xl p-3 mt-3 text-[10px]">
              <p className="font-black">Référence: {a.id}</p>
              <p className="text-gray-600 mt-0.5">Partage ce lien: {typeof window!=="undefined" ? `${window.location.origin}/produit/${a.id}` : ""}</p>
            </div>
          </div>
        </div>

        <Link href={`/boutiques/${waVendeur}`} className="bg-white border-2 rounded-[20px] p-3 mt-3 flex gap-3 items-center block">
          <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-black overflow-hidden">{vendeurInfo?.photo ? <img src={vendeurInfo.photo} className="w-full h-full object-cover"/> : (nomBoutique.replace(/^Boutiques\s*/i,"")[0]||"B")}</div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[13px] truncate">{nomBoutique}</p>
            <p className="text-[10px] text-gray-500">0{waVendeur.slice(-9)} • Voir boutique ›</p>
          </div>
        </Link>

        <button onClick={handleWhatsApp} className="w-full mt-3 bg-[#25D366] text-white py-4 rounded-full font-black text-[12px]">💬 Commander sur WhatsApp</button>
        <button onClick={handleAdd} className="w-full mt-2 bg-black text-white py-3 rounded-full font-black text-[11px]">{added?"✅ Ajouté au panier":"🛒 Ajouter au panier"}</button>
        {isOwnerMe && <Link href={`/publier?edit=${a.id}`} className="mt-2 block bg-white border-2 border-black py-3 rounded-full font-black text-[11px] text-center">✏️ Modifier mon annonce</Link>}

        {related.length>0 && (
          <div className="mt-5">
            <p className="font-black text-[13px] mb-2">Même boutique</p>
            <div className="grid grid-cols-2 gap-2">
              {related.map((r:any)=>(
                <Link key={r.id} href={`/produit/${r.id}`} className="bg-white border rounded-xl overflow-hidden block">
                  {r.photo ? <img src={r.photo} className="w-full aspect-square object-cover"/> : <div className="w-full aspect-square flex items-center justify-center">📦</div>}
                  <div className="p-2"><p className="font-bold text-[11px] truncate">{r.titre}</p><p className="text-[10px]">{safePrix(r.prix)}$</p></div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-[9px] font-bold whitespace-nowrap">WENZE WENZE BUSINESS • {a.id}</div>
    </div>
  );
            }
