"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TAUX_CDF, toCDF } from "@/lib/paiement";
import { getCategorieById, normalizeCategorie, getPrixByCategorie } from "@/lib/categories";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

type PanierItem = {
  id: string;
  titre: string;
  prix: number;
  prixUSD?: number;
  prixCDF?: number;
  photo?: string;
  vendeur: string;
  whatsapp: string;
  ownerWhatsapp?: string;
  categorieId?: string;
  commune?: string;
  quantite?: number;
  typeMedia?: "image" | "video";
  video?: string;
};

function formatPrixUSD(n: number){
  return `${n}$ / ${toCDF(n).toLocaleString("fr-FR")} CDF`;
}

export default function Panier() {
  const [items, setItems] = useState<PanierItem[]>([]);

  useEffect(() => {
    try {
      // ✅ WENZE 2.0 FIX: panier séparé de favoris - favoris = ancien nom
      const saved = JSON.parse(localStorage.getItem("wenze_panier") || "[]");
      const normalized = saved.map((i:any)=> ({
        ...i,
        prix: Number(i.prix || i.prixUSD || 0),
        categorieId: normalizeCategorie(i.categorieId || i.categorie || "commerces-services"),
        quantite: Number(i.quantite || 1),
      }));
      setItems(normalized);
    } catch {}
  }, []);

  const removeItem = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    localStorage.setItem("wenze_panier", JSON.stringify(newItems));
  };

  const clearPanier = () => {
    if(!confirm("Vider tout le panier ?")) return;
    setItems([]);
    localStorage.setItem("wenze_panier", JSON.stringify([]));
  };

  const updateQty = (id: string, delta: number) => {
    const newItems = items.map(i=> {
      if(i.id===id){
        const q = Math.max(1, (i.quantite||1)+delta);
        return {...i, quantite: q};
      }
      return i;
    });
    setItems(newItems);
    localStorage.setItem("wenze_panier", JSON.stringify(newItems));
  };

  // Groupage par vendeur WhatsApp pour checkout pro
  const grouped = useMemo(()=>{
    const map = new Map<string, { wa: string, vendeur: string, items: PanierItem[], total: number }>();
    for(const it of items){
      const wa = cleanWhatsapp(it.ownerWhatsapp || it.whatsapp || "");
      if(!map.has(wa)){
        map.set(wa, { wa, vendeur: it.vendeur || "Vendeur", items: [], total: 0 });
      }
      const g = map.get(wa)!;
      g.items.push(it);
      g.total += (Number(it.prix)||0) * (it.quantite||1);
    }
    return Array.from(map.values());
  }, [items]);

  const totalGlobal = useMemo(()=> items.reduce((s,it)=> s + (Number(it.prix)||0)*(it.quantite||1), 0), [items]);
  const totalCDF = toCDF(totalGlobal);

  const checkout = (group: {wa: string, vendeur: string, items: PanierItem[], total: number}) => {
    // Sauve en commandes
    try {
      const existing = JSON.parse(localStorage.getItem("wenze_commandes_list") || "[]");
      const now = new Date().toISOString();
      const newOrders = group.items.map(it=> ({
        id: it.id,
        status: "attente",
        total: Number(it.prix)*(it.quantite||1),
        total_cdf: toCDF(Number(it.prix)*(it.quantite||1)),
        created_at: now,
        categorie_id: it.categorieId,
        titre: it.titre,
        photo: it.photo,
        vendeur_whatsapp: group.wa,
        vendeur: group.vendeur,
        quantite: it.quantite||1,
      }));
      localStorage.setItem("wenze_commandes_list", JSON.stringify([...newOrders, ...existing]));
      
      // Retire du panier ce groupe
      const rest = items.filter(i=> cleanWhatsapp(i.ownerWhatsapp || i.whatsapp || "") !== group.wa);
      setItems(rest);
      localStorage.setItem("wenze_panier", JSON.stringify(rest));

      // Messages historique
      const msgs = JSON.parse(localStorage.getItem("wenze_messages_list") || "[]");
      msgs.unshift({
        id: `MSG-${Date.now()}-${group.wa}`,
        vendor_name: group.vendeur,
        vendor_phone: group.wa,
        last_text: `Commande ${group.items.length} articles - ${group.total}$ / ${toCDF(group.total).toLocaleString()} CDF`,
        last_date: now,
        categorie_id: group.items[0]?.categorieId || "commerces-services",
        total: group.total,
      });
      localStorage.setItem("wenze_messages_list", JSON.stringify(msgs.slice(0,50)));
    } catch {}

    const text = `Bonjour ${group.vendeur} 👋 WENZE 2.0\nJe veux commander:\n${group.items.map(it=> `- ${it.titre} x${it.quantite||1} = ${Number(it.prix)*(it.quantite||1)}$`).join("\n")}\nTOTAL: ${group.total}$ / ${toCDF(group.total).toLocaleString()} CDF - Taux ${TAUX_CDF}\n0% commission WENZE - Livraison Kinshasa ?`;
    window.open(`https://wa.me/${group.wa}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if(items.length===0){
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 pb-24">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 bg-white border rounded-full flex items-center justify-center">←</Link>
          <h1 className="font-black text-[18px]">Panier</h1>
        </div>
        <div className="mt-10 bg-white border-2 border-dashed rounded-2xl p-8 text-center">
          <p className="text-4xl">🛒</p>
          <p className="font-black mt-3 text-[14px]">Panier vide</p>
          <p className="text-[11px] text-gray-500 mt-1">WENZE 2.0 - 🛍️ 5$ / 11 500 CDF • 🏭 10$ / 23 000 CDF • Taux {TAUX_CDF} • 0% commission</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/market" className="bg-[#6C3CE0] text-white p-3 rounded-xl font-bold text-[12px]">🏪 Marché</Link>
            <Link href="/boutiques" className="bg-black text-white p-3 rounded-xl font-bold text-[12px]">🏬 Boutiques</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-32">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">Panier • {items.length} articles</h1>
            <p className="text-[10px] text-gray-500">Total {totalGlobal}$ / {totalCDF.toLocaleString()} CDF • Taux {TAUX_CDF} • 0% commission • {grouped.length} vendeur(s)</p>
          </div>
          <button onClick={clearPanier} className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-full font-bold">Vider</button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-black text-white rounded-xl p-3 flex justify-between items-center">
          <div><p className="font-black text-[12px]">Panier WENZE 2.0 - Groupé par vendeur</p><p className="text-[10px] opacity-70">1 WhatsApp par vendeur - Paiement direct - 0% comm</p></div>
          <span className="bg-white text-black text-[9px] px-2 py-1 rounded-full font-black">{totalGlobal}$</span>
        </div>

        {grouped.map(g=>{
          const catId = g.items[0]?.categorieId || "commerces-services";
          const catObj = getCategorieById(normalizeCategorie(catId));
          const prixBoutique = catObj ? getPrixByCategorie(catObj.id) : { prixUSD: 5, prixCDF: 11500 };
          return (
            <div key={g.wa} className="bg-white border-2 rounded-2xl p-3 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#FFFBF0] border flex items-center justify-center text-[14px]">{catObj?.icon || "🏪"}</div>
                  <div>
                    <p className="font-bold text-[12px]">{g.vendeur}</p>
                    <p className="text-[9px] text-gray-500">{catObj?.icon} {catObj?.titreCourt || catId} • Boutique {prixBoutique.prixUSD}$ / {prixBoutique.prixCDF.toLocaleString()} CDF</p>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-1 rounded-full font-black ${prixBoutique.prixUSD===10?"bg-black text-white":"bg-[#6C3CE0] text-white"}`}>{prixBoutique.prixUSD}$</span>
              </div>

              <div className="mt-3 grid gap-2">
                {g.items.map(it=>{
                  const cat = getCategorieById(normalizeCategorie(it.categorieId || "commerces-services"));
                  return (
                    <div key={it.id} className="flex gap-2.5 border rounded-xl p-2">
                      <div className="w-14 h-14 bg-[#FFFBF0] rounded-lg flex items-center justify-center overflow-hidden border">
                        {it.photo ? <img src={it.photo} alt={it.titre} className="max-w-full max-h-full object-contain"/> : <span className="text-xl">{cat?.icon || "📦"}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[11px] truncate">{it.titre}</p>
                        <p className="text-[10px] text-[#6C3CE0] font-black">{formatPrixUSD(Number(it.prix))} x {it.quantite||1} = {(Number(it.prix)*(it.quantite||1))}$</p>
                        <p className="text-[9px] text-gray-400">{cat?.icon} {cat?.titreCourt} • {it.commune || "Kinshasa"}</p>
                        <div className="mt-1 flex gap-2 items-center">
                          <button onClick={()=> updateQty(it.id, -1)} className="w-6 h-6 bg-gray-100 rounded-full text-[12px] font-bold">-</button>
                          <span className="text-[11px] font-bold">{it.quantite||1}</span>
                          <button onClick={()=> updateQty(it.id, 1)} className="w-6 h-6 bg-gray-100 rounded-full text-[12px] font-bold">+</button>
                          <button onClick={()=> removeItem(it.id)} className="ml-auto text-[10px] text-red-500 font-bold">✕ Retirer</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-between items-center border-t pt-3">
                <div><p className="font-black text-[13px]">Total: {g.total}$ / {toCDF(g.total).toLocaleString()} CDF</p><p className="text-[9px] text-gray-500">Taux {TAUX_CDF} • 0% commission WENZE</p></div>
                <button onClick={()=> checkout(g)} className="bg-[#25D366] text-white px-5 py-2.5 rounded-full font-black text-[11px]">💬 Commander WhatsApp</button>
              </div>
            </div>
          );
        })}

        <div className="bg-white border rounded-2xl p-4">
          <div className="flex justify-between font-black text-[14px]"><span>Total Global</span><span>{totalGlobal}$ / {totalCDF.toLocaleString()} CDF</span></div>
          <p className="text-[10px] text-gray-500 mt-1">Taux fixe {TAUX_CDF} CDF • 🛍️ 5$ / 11 500 CDF - 🏭 10$ / 23 000 CDF boutiques - 0% commission - Livraison à charge vendeur/client</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/market" className="bg-black text-white text-center p-3 rounded-xl font-bold text-[12px]">Continuer achats</Link>
            <Link href="/mes-commandes" className="bg-white border text-center p-3 rounded-xl font-bold text-[12px]">Mes commandes</Link>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/panier" className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">🛒</span>Panier • {items.length}</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  );
}
export const dynamic = 'force-dynamic';
