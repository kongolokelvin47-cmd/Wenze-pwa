"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TAUX_CDF, toCDFString, isCompteCache, checkFreemiumWenze } from "@/lib/paiement"; // ✅ TAUX 2300
import { getCategorieById, normalizeCategorie } from "@/lib/categories";

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");

type PanierItem = {
  id: string; titre: string; title?: string; name?: string;
  prix: number; prixUSD?: number; price?: number;
  // CORRIGÉ : champs gros
  typeAnnonce?: string; prixGros?: number; uniteGros?: string; minimumCommande?: number; prixAffiche?: number;
  photo?: string; images?: string[]; video?: string; typeMedia?: "image"|"video";
  vendeur: string; nomBoutique?: string; whatsapp: string; ownerWhatsapp?: string; userId?: string;
  categorieId?: string; commune?: string; quantite?: number; qty?: number;
  _vendeurCache?: boolean; _badge?: string; _palierId?: string;
};

function formatPrix(n: number){
  if(!n) return "Prix sur demande";
  return `${n}$ / ${toCDFString(n)}`;
}

export default function Panier() {
  const [items, setItems] = useState<PanierItem[]>([]);
  const [moi, setMoi] = useState<any>(null);

  // CORRIGÉ : qui peut voir / payer le prix gros ?
  const monRole = moi?.role || "client";
  const jeSuisDG = moi?.roleAdmin === "dg" || moi?.role === "dg";
  const jeSuisGrossiste = monRole === "grossiste" || jeSuisDG;
  // Prix à utiliser pour un article : gros si Grossiste + produit gros, sinon détail
  const prixPour = (it: PanierItem) => {
    if (it.typeAnnonce === "gros" && jeSuisGrossiste && Number(it.prixGros || 0) > 0) return Number(it.prixGros);
    return Number(it.prixUSD || it.prix || 0);
  };
  // CORRIGÉ : un prix gros est en FC, pas en $. On l'affiche en FC, pas en $.
  const prixAffichePour = (it: PanierItem) => {
    if (it.typeAnnonce === "gros" && jeSuisGrossiste && Number(it.prixGros || 0) > 0) return `${Number(it.prixGros).toLocaleString()} FC / ${it.uniteGros || "carton"}`;
    return formatPrix(Number(it.prixUSD || it.prix || 0));
  };

  const load = () => {
    try{
      const saved = JSON.parse(localStorage.getItem("wenze_panier")||"[]");
      const allUsers = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
      const userMap = new Map<string,any>();
      for(const u of allUsers){ const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||""); if(wa) userMap.set(wa,u); }
      try { setMoi(JSON.parse(localStorage.getItem("wenze_user") || "null")); } catch {}

      let normalized: PanierItem[] = saved.map((it:any)=>({
        id: it.id||it.annonceId, titre: it.titre||it.title||it.name||"Produit", title: it.title, name: it.name,
        prix: Number(it.prixUSD||it.prix||it.price||0), prixUSD: Number(it.prixUSD||it.prix||it.price||0), price: it.price,
        typeAnnonce: it.typeAnnonce, prixGros: Number(it.prixGros || 0), uniteGros: it.uniteGros, minimumCommande: Number(it.minimumCommande || 0), prixAffiche: it.prixAffiche,
        photo: it.photo||it.images?.[0], images: it.images, video: it.video, typeMedia: it.typeMedia,
        vendeur: it.vendeur||it.nomBoutique||it.user||"Boutique", nomBoutique: it.nomBoutique||it.vendeur, whatsapp: it.whatsapp||it.ownerWhatsapp||"", ownerWhatsapp: it.ownerWhatsapp||it.whatsapp||"", userId: it.userId,
        categorieId: normalizeCategorie(it.categorieId||"commerces-services"), commune: it.commune, quantite: Number(it.quantite||it.qty||1), qty: it.qty,
      })).map((it:PanierItem)=>{
        try{
          const wa=cleanWa(it.ownerWhatsapp||it.whatsapp||it.userId||"");
          const user=userMap.get(wa)||{ ownerWhatsapp:wa, createdAt:"", id:wa };
          const cache=isCompteCache(user);
          const ab=checkFreemiumWenze(user,0);
          return { ...it, _vendeurCache:!!cache, _badge:ab.badge, _palierId:ab.palierId };
        }catch{ return { ...it, _vendeurCache:false, _badge:"🆓" }; }
      });

      setItems(normalized);
    }catch(e){ console.log("panier V6",e); setItems([]); }
  };

  useEffect(()=>{ load(); const onStorage=(e:StorageEvent)=>{ if(e.key?.includes("panier")) load(); }; window.addEventListener("storage", onStorage); window.addEventListener("wenze-update", load); return ()=>{ window.removeEventListener("storage", onStorage); window.removeEventListener("wenze-update", load); }; },[]);

  const grouped = useMemo(()=>{
    const map = new Map<string, PanierItem[]>();
    for(const it of items){
      const wa=cleanWa(it.ownerWhatsapp||it.whatsapp||"")||it.vendeur;
      if(!map.has(wa)) map.set(wa,[]);
      map.get(wa)!.push(it);
    }
    return Array.from(map.entries()).map(([wa,list])=>({ wa, vendeur: list[0].vendeur||list[0].nomBoutique||"Boutique", items:list, totalUSD:list.reduce((s,i)=>s+(prixPour(i)*(i.quantite||1)),0), isCache:list[0]._vendeurCache, badge:list[0]._badge, palier:list[0]._palierId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[items, moi]);

  const totalGlobal = useMemo(()=> items.reduce((s,i)=> s + (prixPour(i)*(i.quantite||1)),0), [items, moi]);

  // CORRIGÉ : quantité ne peut pas descendre sous le minimum gros
  const updateQty = (id:string, delta:number)=>{
    const saved = JSON.parse(localStorage.getItem("wenze_panier")||"[]");
    const idx=saved.findIndex((it:any)=> String(it.id||it.annonceId)===String(id));
    if(idx>=0){
      const isGros = saved[idx].typeAnnonce === "gros";
      const min = isGros ? Number(saved[idx].minimumCommande || 10) : 1;
      const q=Number(saved[idx].quantite||saved[idx].qty||1)+delta;
      if(q < min){
        if(q <= 0 && !isGros) saved.splice(idx,1);
        else if(isGros && q < min){
          // On ne supprime pas, on remet au minimum
          saved[idx].quantite = min; saved[idx].qty = min;
        }
      } else { saved[idx].quantite=q; saved[idx].qty=q; }
      localStorage.setItem("wenze_panier", JSON.stringify(saved));
      load();
    }
  };

  const removeItem = (id:string)=>{
    const saved = JSON.parse(localStorage.getItem("wenze_panier")||"[]").filter((it:any)=> String(it.id||it.annonceId)!==String(id));
    localStorage.setItem("wenze_panier", JSON.stringify(saved));
    load();
  };

  const clearPanier = ()=>{
    if(!confirm(`Vider panier ? ${items.length} articles`)) return;
    localStorage.setItem("wenze_panier","[]");
    setItems([]);
  };

  // CORRIGÉ : alerte si un produit gros est dans le panier d'un Client (il ne devrait pas y être)
  const grosBloque = items.filter((it:any)=> it.typeAnnonce === "gros" && !jeSuisGrossiste);

  if(items.length===0){
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
        <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div><h1 className="font-black text-[16px]">Panier</h1><p className="text-[10px] text-gray-500">0 article • Taux {TAUX_CDF} • 0% comm</p></div>
        </header>
        <div className="p-4">
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center mt-6">
            <p className="text-4xl">🛒</p>
            <p className="font-black mt-2">Panier vide</p>
            <p className="text-[11px] text-gray-500 mt-1">Ajoute depuis l'accueil - WhatsApp direct - 0% commission - Taux {TAUX_CDF} - Même ticket ⭐5$ ({toCDFString(5)}) pour tous</p>
            <Link href="/" className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]">Aller à l'accueil</Link>
          </div>
          <div className="mt-4 bg-black text-white rounded-xl p-2.5 text-[9px]"><b>Nouvelle Politique:</b> Même ticket pour tous - Panier groupé par vendeur - 1 ticket = X places strictes sur Y jours - Max 50 - Suppression libère place - Vendeur caché 🔒 signalé mais article gardé</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-32">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1"><h1 className="font-black text-[16px]">Panier • {items.length} articles</h1><p className="text-[10px] text-gray-500">{grouped.length} boutiques • {totalGlobal}$ / {toCDFString(totalGlobal)} • Taux {TAUX_CDF} • 0% comm</p></div>
          <button onClick={clearPanier} className="text-[11px] bg-gray-100 px-3 py-1.5 rounded-full font-bold">Vider</button>
        </div>
        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[9px] flex justify-between"><span><b>V6:</b> Même ticket pour tous ⭐ 5$ ({toCDFString(5)}) 4pl/7j • 🚀 10$ 10pl • 👑 20$ 30pl • Max 50 • Suppression libère place • 0% comm • Taux {TAUX_CDF}</span><span className="bg-white text-black px-2 py-0.5 rounded-full font-black">{TAUX_CDF}</span></div>
      </header>

      <div className="p-3 space-y-4">
        {/* CORRIGÉ : alerte gros bloqué */}
        {grosBloque.length > 0 ? (
          <div className="bg-orange-50 border border-orange-300 rounded-2xl p-3">
            <p className="font-black text-[12px]">⚠️ {grosBloque.length} produit(s) gros dans ton panier</p>
            <p className="text-[11px] text-gray-600 mt-1">Tu es Client. Le prix gros est réservé aux Grossistes. Connecte-toi comme Grossiste ou supprime ces produits pour commander au détail.</p>
            <Link href="/devenir-grossiste" className="mt-2 block bg-orange-500 text-white text-center py-2 rounded-full font-black text-[11px]">Devenir Grossiste →</Link>
          </div>
        ) : null}

        {grouped.map(g=>{
          const wa=cleanWa(g.wa);
          // CORRIGÉ : message WhatsApp avec prix gros en FC si Grossiste
          const lignes = g.items.map(i=>{
            if(i.typeAnnonce === "gros" && jeSuisGrossiste) return `• ${i.titre} x${i.quantite||1} - ${Number(i.prixGros).toLocaleString()} FC / ${i.uniteGros || "carton"}`;
            return `• ${i.titre} x${i.quantite||1} - ${i.prixUSD||i.prix}$`;
          }).join("\n");
          const text=encodeURIComponent(`Bonjour ${g.vendeur} 👋 Commande WENZE Panier - ${g.items.length} articles - Total ${g.totalUSD}$ / ${toCDFString(g.totalUSD)} - Taux ${TAUX_CDF} - 0% comm\n\n${lignes}\n\nRéf : ${g.items.map(i=>i.id).join(", ")}`);
          const catObj=getCategorieById(normalizeCategorie(g.items[0].categorieId||"commerces-services")) as any;
          return (
            <div key={g.wa} className={`bg-white rounded-2xl border overflow-hidden ${g.isCache?"opacity-75 border-dashed":"shadow-sm"}`}>
              <div className="p-3 flex items-center gap-3 bg-gray-50 border-b">
                <div className="w-10 h-10 bg-white rounded-full border flex items-center justify-center text-lg">{catObj?.icon||"🏪"}</div>
                <div className="flex-1"><p className="font-black text-[13px] flex items-center gap-2">{g.vendeur} <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded-full">{g.badge} {g.palier}{g.isCache&&" 🔒 caché"}</span></p><p className="text-[10px] text-gray-500">{g.items.length} articles • {g.totalUSD}$ / {toCDFString(g.totalUSD)}</p></div>
                <span className="text-[10px] text-gray-400">{wa.slice(-9)}</span>
              </div>

              <div className="divide-y divide-gray-100">
                {g.items.map(it=>{
                  const cat=getCategorieById(normalizeCategorie(it.categorieId||"commerces-services")) as any;
                  const estGros = it.typeAnnonce === "gros";
                  const min = estGros ? Number(it.minimumCommande || 10) : 1;
                  const q = it.quantite || 1;
                  return (
                    <div key={it.id} className="p-3 flex gap-3">
                      <Link href={`/produit/${it.id}`} className="w-[64px] h-[64px] bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                        {it.photo||it.images?.[0]?<img src={it.photo||it.images?.[0]} alt={it.titre} className="w-full h-full object-cover"/>:<span className="text-xl">{cat?.icon||"📦"}</span>}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[12px] truncate">{it.titre||it.name}</p>
                        {estGros ? <span className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black">🏭 GROS</span> : null}
                        <p className="text-[11px] font-black text-orange-600 mt-0.5">{prixAffichePour(it)} {q>1?`x${q} = ${(prixPour(it)*q).toLocaleString()}${estGros && jeSuisGrossiste ? " FC" : "$"}`:""}</p>
                        {estGros ? <p className="text-[10px] text-gray-500">Minimum : {min} {it.uniteGros || "cartons"}</p> : null}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
                            <button onClick={()=>updateQty(it.id,-1)} disabled={estGros && q <= min} className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[12px] font-bold disabled:opacity-30">-</button>
                            <span className="text-[11px] font-bold px-2">{q}</span>
                            <button onClick={()=>updateQty(it.id,1)} className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[12px] font-bold">+</button>
                          </div>
                          <button onClick={()=>removeItem(it.id)} className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold">Suppr</button>
                          {it._vendeurCache&&<span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">🔒 vendeur caché</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 flex gap-2">
                <a href={`https://wa.me/${wa}?text=${text}`} target="_blank" className="flex-1 bg-[#25D366] text-white text-[12px] font-black py-3 rounded-full flex justify-center items-center gap-2">💬 Commander chez {g.vendeur} • {g.totalUSD}$</a>
                {/* CORRIGÉ : /boutiques/${wa}, pas /boutique/${wa} */}
                <Link href={`/boutiques/${wa}`} className="px-4 bg-gray-100 rounded-full flex items-center justify-center text-[11px] font-bold">Boutique</Link>
              </div>
              {g.isCache&&<div className="bg-orange-50 border-t border-orange-100 p-2 text-[9px] text-orange-700">⚠️ Vendeur actuellement 🔒 caché (Freemium 30j expiré + 0 ticket) - Tu peux encore commander via WhatsApp - Il réapparaîtra dès ticket 5$ - Même prix pour tous - Max 50</div>}
            </div>
          );
        })}

        <div className="bg-white border rounded-2xl p-4">
          <div className="flex justify-between text-[13px]"><span className="font-bold">Total global</span><span className="font-black">{totalGlobal}$ / {toCDFString(totalGlobal)}</span></div>
          <p className="text-[10px] text-gray-500 mt-1">Taux {TAUX_CDF} • 0% commission WENZE • Paiement direct vendeur via WhatsApp • Panier groupé par boutique • V6 même ticket</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {grouped.map(g=>{
              const wa=cleanWa(g.wa);
              const text=encodeURIComponent(`Bonjour ${g.vendeur} 👋 Commande globale WENZE - ${items.length} articles total ${totalGlobal}$ - Boutique ${g.vendeur} ${g.totalUSD}$ - Taux ${TAUX_CDF}`);
              return <a key={g.wa} href={`https://wa.me/${wa}?text=${text}`} target="_blank" className="bg-black text-white text-[11px] font-bold py-3 rounded-full flex justify-center">💬 {g.vendeur} {g.totalUSD}$</a>;
            })}
          </div>
        </div>

        <Link href="/" className="block text-center text-[11px] bg-white border rounded-full py-3 font-bold">← Continuer achats</Link>
      </div>

      <div className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur border-t p-3 z-30">
        <div className="flex justify-between items-center mb-2"><span className="font-black text-[13px]">Total {totalGlobal}$ / {toCDFString(totalGlobal)}</span><span className="text-[10px] text-gray-500">{items.length} articles • {grouped.length} boutiques</span></div>
        <div className="flex gap-2 overflow-x-auto">
          {grouped.map(g=>{ const wa=cleanWa(g.wa); const t=encodeURIComponent(`Bonjour ${g.vendeur} 👋 Panier WENZE - ${g.totalUSD}$ - ${g.items.map(i=>i.titre).join(", ")}`); return <a key={g.wa} href={`https://wa.me/${wa}?text=${t}`} target="_blank" className="whitespace-nowrap bg-[#25D366] text-white text-[11px] font-black px-5 py-3 rounded-full">💬 {g.vendeur}</a>; })}
        </div>
      </div>
    </div>
  )
    }
