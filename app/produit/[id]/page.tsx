"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDFString, isCompteCache, checkFreemiumWenze } from "@/lib/paiement";
import { isOwner } from "@/lib/roles";

const cleanWa = (n:string)=> (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");

export default function ProduitPage(){
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [a, setA] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [added, setAdded] = useState(false);
  const [isOwnerMe, setIsOwnerMe] = useState(false);
  const [vendeurInfo, setVendeurInfo] = useState<any>(null);

  useEffect(()=>{
    try{
      const uRaw = localStorage.getItem("wenze_user");
      const u = uRaw ? JSON.parse(uRaw) : null;
      setUser(u);

      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      let found = list.find((x:any)=> String(x.id||x.annonceId)===String(id));
      if(!found){
        // V6: pas de fallback current_produit non sécurisé - vérifie quand même si même id
        const cur = JSON.parse(localStorage.getItem("wenze_current_produit")||"null");
        if(cur && String(cur.id||cur.annonceId)===String(id)) found = cur;
      }
      if(found){
        // V6: Vérifie compte caché
        const allUsers = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
        const waFound = cleanWa(found.ownerWhatsapp||found.whatsapp||found.userId||"");
        const vendeur = allUsers.find((uu:any)=> cleanWa(uu.ownerWhatsapp||"")===waFound) || { ownerWhatsapp:waFound, createdAt:found.createdAt||found.created_at||"" };
        const cache = isCompteCache(vendeur);
        const ab = checkFreemiumWenze(vendeur,0);
        setVendeurInfo({ ...vendeur, _cache:cache, _badge:ab.badge, _palierId:ab.palierId, _jours:ab.joursRestants });

        // Owner check sécurisé V6 = WA uniquement, pas nom
        try{ if(u && isOwner(u, found)) setIsOwnerMe(true); }catch{
          if(u && cleanWa(u.ownerWhatsapp||"")===waFound && waFound) setIsOwnerMe(true);
        }

        setA(found);

        // Related: même catégorie, non cachés, pas lui-même
        const rel = list.filter((x:any)=>{
          if(String(x.id)===String(found.id)) return false;
          const waX = cleanWa(x.ownerWhatsapp||"");
          const uu = allUsers.find((uu:any)=> cleanWa(uu.ownerWhatsapp||"")===waX) || { ownerWhatsapp:waX, createdAt:x.createdAt||"" };
          if(isCompteCache(uu)) return false;
          return normalizeCategorie(x.categorieId||"")==normalizeCategorie(found.categorieId||"");
        }).slice(0,6);
        setRelated(rel);
      }
    } catch(e){ console.log("produit V6",e); }
  },[id]);

  const handleAddPanier = () => {
    try{
      const saved = JSON.parse(localStorage.getItem("wenze_panier")||"[]");
      const exists = saved.find((it:any)=> String(it.id||it.annonceId)===String(a.id||a.annonceId));
      if(exists){ exists.quantite=(exists.quantite||1)+1; exists.qty=exists.quantite; } else { saved.push({ id:a.id||a.annonceId, titre:a.titre||a.title||"Produit", title:a.title, prixUSD:Number(a.prixUSD||a.prix||0), prix:Number(a.prixUSD||a.prix||0), photo:a.images?.[0]||a.photo, vendeur:a.nomBoutique||a.vendeur||a.user||"Boutique", whatsapp:a.ownerWhatsapp||a.whatsapp||"", ownerWhatsapp:a.ownerWhatsapp||a.whatsapp||"", categorieId:a.categorieId, commune:a.commune, quantite:1, qty:1 }); }
      localStorage.setItem("wenze_panier", JSON.stringify(saved));
      setAdded(true); setTimeout(()=>setAdded(false),2000);
    }catch{}
  };

  if(!a) return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-center">
      <p className="font-black mt-20 text-[16px]">Produit {id?.slice(0,8)} introuvable</p>
      <p className="text-[11px] text-gray-500 mt-2">V6: Produit peut être supprimé (suppression libère place) ou vendeur 🔒 caché (Freemium 30j expiré + 0 ticket)</p>
      <div className="mt-4 flex gap-2 justify-center">
        <button onClick={()=> router.push("/market")} className="bg-black text-white px-6 py-3 rounded-full font-bold text-[12px]">Marché</button>
        <button onClick={()=> router.back()} className="bg-white border px-6 py-3 rounded-full font-bold text-[12px]">Retour</button>
      </div>
      <p className="text-[9px] text-gray-400 mt-4">Taux {TAUX_CDF} • Même ticket ⭐ 5$ ({toCDFString(5)}) 🚀 10$ 👑 20$ • Max 50 • 0% comm</p>
    </div>
  );

  const cat = getCategorieById(normalizeCategorie(a.categorieId||"commerces-services")) as any;
  const prixUSD = Number(a.prixUSD||a.prix||a.price||0);
  const wa = cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId||"");
  const waText = encodeURIComponent(`Bonjour ${a.nomBoutique||a.vendeur||"Boutique"} 👋 WENZE V6 - Je veux "${a.titre||a.title}" - ${prixUSD}$ / ${toCDFString(prixUSD)} - Taux ${TAUX_CDF} - 0% comm - Produit #${id?.slice(0,8)} - Lien: wenze.cd/produit/${id}`);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white pb-32">
      <div className="sticky top-0 bg-white/95 backdrop-blur z-20 p-3 border-b flex items-center gap-3">
        <button onClick={()=>router.back()} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</button>
        <div className="flex-1 min-w-0"><p className="font-black text-[13px] truncate">{a.titre||a.title||"Produit"}</p><p className="text-[10px] text-gray-500 truncate">{cat?.icon} {cat?.titre||a.categorieId} • {prixUSD}$ • Taux {TAUX_CDF}</p></div>
        <Link href="/panier" className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white text-[14px]">🛒</Link>
      </div>

      <div className="relative bg-gray-50">
        <div className="aspect-[4/3] overflow-hidden">
          {a.images?.[0]||a.photo ? <img src={a.images?.[0]||a.photo} alt={a.titre} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><span className="text-5xl">{cat?.icon||"📦"}</span><p className="text-[11px] mt-2">Pas de photo</p></div>}
        </div>
        {a.images && a.images.length>1 && (
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto">
            {a.images.map((img:string,i:number)=><img key={i} src={img} alt={`${a.titre}-${i}`} className="w-14 h-14 rounded-xl border-2 border-white object-cover shadow" />)}
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-black text-white text-[10px] px-2.5 py-1 rounded-full font-bold">{cat?.icon} {cat?.titreCourt||cat?.titre||"Cat"}</span>
          {vendeurInfo?._cache && <span className="bg-red-500 text-white text-[10px] px-2.5 py-1 rounded-full font-bold">🔒 Caché</span>}
        </div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold border">{vendeurInfo?._badge||"🆓"} {vendeurInfo?._palierId||"Freemium"}</div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h1 className="font-black text-[18px] leading-tight">{a.titre||a.title||a.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="font-black text-[22px] text-orange-600">{prixUSD?`${prixUSD}$`:"Prix à discuter"}</p>
            {prixUSD>0 && <p className="text-[13px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-bold">{toCDFString(prixUSD)} CDF</p>}
            <span className="text-[9px] bg-black text-white px-2 py-0.5 rounded-full">Taux {TAUX_CDF}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">{a.description||a.desc||"Aucune description - Contacte vendeur via WhatsApp pour détails - 0% commission - Taux fixe"}</p>
        </div>

        <div className="bg-gray-50 border rounded-2xl p-3 flex items-center gap-3">
          <div className="w-11 h-11 bg-white border rounded-full flex items-center justify-center text-lg">{cat?.icon||"🏪"}</div>
          <div className="flex-1">
            <p className="font-bold text-[13px]">{a.nomBoutique||a.vendeur||a.user||"Boutique"} <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded-full">{vendeurInfo?._badge||"🆓"} {vendeurInfo?._palierId||""}{vendeurInfo?._cache&&" 🔒"}</span></p>
            <p className="text-[10px] text-gray-500">{a.commune||"Kinshasa"} • WA {wa.slice(-9)} • {vendeurInfo?._jours||0}j restants</p>
          </div>
          <Link href={`/boutique/${wa}`} className="text-[11px] bg-white border px-3 py-1.5 rounded-full font-bold">Voir boutique</Link>
        </div>

        {isOwnerMe && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-3 flex gap-2">
            <Link href={`/modifier/${id}`} className="flex-1 bg-black text-white rounded-full py-2.5 text-center text-[12px] font-black">✏️ Modifier (isOwner WA)</Link>
            <button onClick={async()=>{
              if(!confirm(`Supprimer "${a.titre}" ? Suppression libère 1 place immédiatement - Max 50`)) return;
              try{ const list=JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]"); const filtered=list.filter((x:any)=>String(x.id)!==String(id)); localStorage.setItem("wenze_annonces_list", JSON.stringify(filtered)); try{ const {libererPlace}=await import("@/lib/paiement"); libererPlace(JSON.parse(localStorage.getItem("wenze_user")||"{}")); }catch{} router.push("/boutiques?deleted=1"); }catch{}
            }} className="px-5 bg-red-50 border border-red-200 text-red-700 rounded-full py-2.5 text-[12px] font-bold">🗑️ Suppr</button>
          </div>
        )}

        {vendeurInfo?._cache && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700">⚠️ Vendeur actuellement 🔒 caché (Freemium 30j expiré + 0 ticket) - Produit encore visible via lien direct - Commande WhatsApp possible - Il réapparaîtra dès ticket 5$ ({toCDFString(5)}) - Même prix pour tous - Max 50 - 0% comm</div>}

        <div className="flex gap-2">
          <button onClick={handleAddPanier} className={`flex-1 border-2 rounded-full py-3.5 font-black text-[13px] transition ${added?"bg-green-500 text-white border-green-500":"bg-white border-black text-black"}`}>{added?"✓ Ajouté au panier":"🛒 Ajouter au panier"}</button>
          <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" className="flex-1 bg-[#25D366] text-white rounded-full py-3.5 font-black text-[13px] flex justify-center items-center gap-2">💬 WhatsApp {prixUSD?`${prixUSD}$`:""}</a>
        </div>
        <p className="text-[9px] text-gray-400 text-center">V6 Politique: Même ticket pour tous - ⭐ 5$ ({toCDFString(5)}) 4 places strictes/7j • 🚀 10$ 10 places • 👑 20$ 30 places • Max 50 • Suppression libère place • 0% commission • Taux {TAUX_CDF} • isOwner sécurisé par WA, pas par nom</p>

        {related.length>0 && (
          <div>
            <p className="font-black text-[13px] mb-3">Produits similaires • Même catégorie</p>
            <div className="grid grid-cols-2 gap-3">
              {related.map((r:any)=>{
                const c=getCategorieById(normalizeCategorie(r.categorieId||"")) as any;
                return <Link key={r.id} href={`/produit/${r.id}`} className="bg-white border rounded-2xl overflow-hidden hover:shadow transition">
                  <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">{r.images?.[0]||r.photo?<img src={r.images?.[0]||r.photo} alt={r.titre} className="w-full h-full object-cover"/>:<span className="text-2xl">{c?.icon||"📦"}</span>}</div>
                  <div className="p-2.5"><p className="font-bold text-[11px] truncate">{r.titre||r.title}</p><p className="text-[11px] font-black text-orange-600 mt-1">{Number(r.prixUSD||r.prix||0)}$ / {toCDFString(Number(r.prixUSD||r.prix||0))}</p></div>
                </Link>;
              })}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t p-3 flex gap-2 z-30">
        <button onClick={handleAddPanier} className="px-5 bg-gray-100 rounded-full font-bold text-[12px]">{added?"✓":"🛒"}</button>
        <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" className="flex-1 bg-[#25D366] text-white rounded-full py-3.5 font-black text-[14px] flex justify-center items-center gap-2">💬 Commander {prixUSD?`${prixUSD}$ / ${toCDFString(prixUSD)}`:"sur WhatsApp"} - 0% comm</a>
      </div>
    </div>
  )
           }
