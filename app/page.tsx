"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie, getActiviteById } from "@/lib/categories";
import { TAUX_CDF, toCDF, toCDFString, verifierAbonnement, checkFreemiumWenze } from "@/lib/paiement";

function cleanWa(n: string){ return (n||"").toString().replace(/[^0-9]/g,""); }
function formatPrix(p:any){
  const usd = Number(p.prix||p.prixUSD||0);
  const cdf = p.prixCDF ? Number(p.prixCDF) : toCDF(usd);
  return `${usd}$ / ${cdf.toLocaleString("fr-FR")} CDF`;
}
function getUserPayStatus(wa:string){
  try{
    const allUsers = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
    const u = allUsers.find((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp)===cleanWa(wa));
    if(!u) return { isPaye:false, isEssai:false, media:"image-only", badge:"🆓 Freemium 3 vie", droits:"freemium-3-vie" };
    const check = checkFreemiumWenze(u, 0);
    return { isPaye: check.isPaye, isEssai: check.isEssai7j, media: check.media, badge: check.isPaye ? (check.type==="gros_autres"?"🏭 10$ Actif":"🛍️ 5$ Actif") : check.isEssai7j?`⏳ Essai ${check.joursRestants}j`:`🆓 ${check.count}/3 vie`, droits: check.droits, joursRestants: check.joursRestants };
  } catch { return { isPaye:false, isEssai:false, media:"image-only", badge:"🆓", droits:"freemium" }; }
}

export default function WenzeBusiness() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [ab, setAb] = useState<any>(null);

  const loadAnnonces = ()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const fixed = list.map((a:any)=> ({
        ...a,
        categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"),
        prixCDF: a.prixCDF || toCDF(Number(a.prix||0)),
        isVideo: !!a.isVideo,
        media: a.isVideo ? "images-videos" : "image-only",
        ownerStatus: getUserPayStatus(a.ownerWhatsapp||a.whatsapp||""),
      }));
      setAnnonces(fixed);
    } catch { setAnnonces([]); }
  };

  useEffect(()=> { 
    loadAnnonces(); 
    try{ setAb(verifierAbonnement()); } catch {}
    const onStorage = ()=> { loadAnnonces(); try{ setAb(verifierAbonnement()); } catch {} };
    window.addEventListener("storage", onStorage); 
    return ()=> window.removeEventListener("storage", onStorage); 
  }, []);

  const filtered = useMemo(()=>{
    let list = [...annonces];
    if(selectedCat!=="all"){ list = list.filter(a=> a.categorieId===selectedCat); }
    if(search.trim()){
      const s = search.toLowerCase();
      list = list.filter(a=> 
        (a.titre||"").toLowerCase().includes(s) ||
        (a.description||"").toLowerCase().includes(s) ||
        (a.activite||"").toLowerCase().includes(s) ||
        (a.commune||"").toLowerCase().includes(s)
      );
    }
    // ✅ TRI WENZE 2.0 FINAL: Payé 5$/10$ first + Booster + Essai 7j + Freemium 3 vie last + Vidéo indicator
    return list.sort((a,b)=>{
      const payA = a.ownerStatus?.isPaye ? 2 : a.ownerStatus?.isEssai ? 1 : 0;
      const payB = b.ownerStatus?.isPaye ? 2 : b.ownerStatus?.isEssai ? 1 : 0;
      if(payA!==payB) return payB-payA;
      const boostA = a.boostUntil && new Date(a.boostUntil).getTime()>Date.now() ? 1 : 0;
      const boostB = b.boostUntil && new Date(b.boostUntil).getTime()>Date.now() ? 1 : 0;
      if(boostA!==boostB) return boostB-boostA;
      return new Date(b.created_at||b.createdAt||0).getTime() - new Date(a.created_at||a.createdAt||0).getTime();
    });
  }, [annonces, search, selectedCat]);

  const showToast = (m:string)=> { setToast(m); setTimeout(()=> setToast(""), 2500); };

  const addPanier = (a:any)=>{
    try{
      const panier = JSON.parse(localStorage.getItem("wenze_panier")||"[]");
      const exists = panier.find((p:any)=> p.id===a.id);
      if(exists){ showToast("Déjà dans panier 🛒"); return; }
      panier.push({ ...a, qty:1, prixCDF: a.prixCDF || toCDF(Number(a.prix||0)) });
      localStorage.setItem("wenze_panier", JSON.stringify(panier));
      showToast(`Ajouté ${a.prix}$ / ${(a.prixCDF||toCDF(a.prix)).toLocaleString()} CDF 🛒 - ${a.ownerStatus?.badge||""}`);
    } catch { showToast("Panier plein"); }
  };

  const totalUSD = filtered.reduce((s,a)=> s + Number(a.prix||0), 0);
  const countPaye = filtered.filter(a=> a.ownerStatus?.isPaye).length;
  const countEssai = filtered.filter(a=> a.ownerStatus?.isEssai).length;
  const countFreemium = filtered.filter(a=> !a.ownerStatus?.isPaye && !a.ownerStatus?.isEssai).length;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 border-b">
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white font-black">W</div>
          <div className="flex-1">
            <h1 className="font-black text-[15px] leading-none">WENZE 2.0 - {ab?.isPaye?`✅ ${ab?.label} ${ab?.joursRestants}j`: ab?.isEssai7j?`⏳ Essai ${ab?.joursRestants}j`:`🆓 ${ab?.count||0}/3 vie`}</h1>
            <p className="text-[9px] text-gray-500">{ab?.message || `Kinshasa • Freemium 3 vie images only • Essai 7j illimité • 5$/10$ illimité images+vidéos • Booster 1$ 24h • Taux ${TAUX_CDF} • 0% comm`}</p>
          </div>
          <Link href="/panier" className="w-9 h-9 bg-[#FFFBF0] border rounded-full flex items-center justify-center">🛒</Link>
          <Link href="/profil" className="w-9 h-9 bg-[#6C3CE0] text-white rounded-full flex items-center justify-center">👤</Link>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Recherche électricité, maçon, coiffure, gros, vidéo..." className="flex-1 border-2 p-3 rounded-full text-[13px] bg-[#FFFBF0]"/>
          <Link href="/publier" className="bg-[#6C3CE0] text-white px-5 rounded-full font-black text-[12px] flex items-center">+ Publier</Link>
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          <button onClick={()=> setSelectedCat("all")} className={`px-3 py-2 rounded-full text-[10px] font-black border-2 whitespace-nowrap ${selectedCat==="all"?"bg-black text-white border-black":"bg-white"}`}>Tout • {annonces.length} • {countPaye}✅ {countEssai}⏳ {countFreemium}🆓</button>
          {CATEGORIES_WENZE.map(c=> {
            const count = annonces.filter(a=> a.categorieId===c.id).length;
            const pi = getPrixByCategorie(c.id);
            return <button key={c.id} onClick={()=> setSelectedCat(c.id)} className={`px-3 py-2 rounded-full text-[10px] font-black border-2 whitespace-nowrap ${selectedCat===c.id ? (c.id==="gros-autres"?"bg-black text-white border-black":"bg-[#6C3CE0] text-white border-[#6C3CE0]") : "bg-white"}`}>{c.icon} {c.titreCourt} • {count} • {pi.prixUSD}$</button>
          })}
        </div>
      </header>

      <div className="p-4 space-y-3">
        {toast && <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div>}

        <div className="bg-black text-white rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1"><p className="font-black text-[12px]">WENZE 2.0 FINAL AJUSTÉ - VERT</p><p className="text-[9px] opacity-70 mt-1">🆓 Freemium 3 à vie images only non vidéo (alternative abo) • ⏳ 7j essai gratuit illimité images only à création pro • Sans abo retour freemium 3 vie • 🛍️ 5$ / 11 500 CDF illimité images+vidéos + 1 booster/mois • 🏭 10$ / 23 000 CDF idem gros • 🎟️ Booster occasionnel 1$ / 2 300 CDF 24h image only • Tri: Payé first + Booster top • Taux fixe {TAUX_CDF}</p></div>
            <Link href="/boutiques" className="bg-white text-black px-3 py-2 rounded-full font-black text-[10px] ml-2">Boutiques</Link>
          </div>
          <div className="mt-2 flex gap-2 text-[8px]">
            <span className="bg-green-500 text-white px-2 py-1 rounded-full font-bold">{countPaye}✅ Payé 5$/10$</span>
            <span className="bg-orange-400 text-white px-2 py-1 rounded-full font-bold">{countEssai}⏳ Essai 7j</span>
            <span className="bg-white/20 px-2 py-1 rounded-full font-bold">{countFreemium}🆓 Freemium 3 vie images only</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <p className="font-black text-[11px]">{filtered.length} annonces • {formatPrix({ prix: filtered.reduce((s,a)=> s + Number(a.prix||0),0)/Math.max(1,filtered.length) })} moyen • Taux {TAUX_CDF} • Payé first</p>
          <Link href="/categories" className="text-[9px] text-[#6C3CE0] font-bold">Catégories →</Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.length===0 ? (
            <div className="col-span-2 text-center py-12 bg-white border-2 border-dashed rounded-2xl">
              <p className="text-3xl">📦</p><p className="text-[12px] font-bold mt-2">Aucune annonce {selectedCat!=="all" ? `en ${getCategorieById(selectedCat)?.titreCourt}` : ""} {search?`pour "${search}"`:""}</p><p className="text-[10px] text-gray-500 mt-1">Sois le 1er à publier en {selectedCat==="all"?"🛍️ 5$ ou 🏭 10$": getCategorieById(selectedCat)?.titreCourt + ` ${getPrixByCategorie(selectedCat).prixUSD}$`} • {ab?.isPaye?"Illimité images+vidéos": ab?.isEssai7j?`Essai ${ab?.joursRestants}j illimité images only`:`Freemium ${ab?.count||0}/3 vie images only`} • Taux {TAUX_CDF}</p><Link href={`/publier?cat=${selectedCat==="all"?"commerces-services":selectedCat}`} className="inline-block mt-3 bg-[#6C3CE0] text-white px-4 py-2 rounded-full font-black text-[11px]">+ Publier {selectedCat==="all"?"5$":`${getPrixByCategorie(selectedCat).prixUSD}$`} - {ab?.media==="image-only"?"Images only":"Images+Vidéo"}</Link>
            </div>
          ) : filtered.map((a:any)=>{
            const cat = getCategorieById(a.categorieId);
            const pi = cat ? getPrixByCategorie(cat.id) : { prixUSD:5, prixCDF:11500 };
            const activite = getActiviteById(a.categorieId, a.activiteId);
            const status = a.ownerStatus;
            return (
              <div key={a.id} className={`bg-white border-2 rounded-2xl overflow-hidden flex flex-col ${status?.isPaye?"border-green-200": status?.isEssai?"border-orange-200":"border-gray-100"}`}>
                <button onClick={()=> setSelectedImage(a)} className="h-36 bg-[#FFFBF0] flex items-center justify-center overflow-hidden relative">
                  {a.isVideo ? <video src={a.photo} className="max-w-full max-h-full object-contain" muted/> : a.photo ? <img src={a.photo} alt={a.titre} className="max-w-full max-h-full object-contain"/> : <span className="text-3xl">{cat?.icon || "📦"}</span>}
                  <span className={`absolute top-2 left-2 text-[7px] px-2 py-1 rounded-full font-black ${status?.isPaye ? (a.categorieId==="gros-autres"?"bg-black text-white":"bg-green-500 text-white") : status?.isEssai ? "bg-orange-400 text-white" : "bg-gray-200 text-gray-600"}`}>{status?.badge || `${cat?.icon} ${pi.prixUSD}$`} {a.isVideo?"🎥":"🖼️"}</span>
                  {a.boostUntil && new Date(a.boostUntil).getTime()>Date.now() && <span className="absolute top-2 right-2 text-[7px] bg-[#25D366] text-white px-2 py-1 rounded-full font-black">🚀 BOOST</span>}
                </button>
                <div className="p-2.5 flex-1 flex flex-col">
                  <Link href={`/produit/${a.id}`} className="font-bold text-[12px] leading-tight line-clamp-2">{a.titre}</Link>
                  <p className="text-[9px] text-gray-500 mt-0.5 truncate">{activite?.label || a.activite || cat?.titreCourt} • {a.commune} • {a.media==="image-only"?"Images only":"Images+Vidéo"} • {status?.droits||""}</p>
                  <p className="font-black text-[12px] text-[#6C3CE0] mt-1">{Number(a.prix||0)}$ <span className="text-[10px] text-gray-500 font-normal">/ {(a.prixCDF||toCDF(a.prix)).toLocaleString()} CDF</span> {a.isVideo?<span className="text-[8px] bg-red-100 text-red-600 px-1 rounded">VIDÉO</span>:<span className="text-[8px] bg-gray-100 px-1 rounded">IMG</span>}</p>
                  <p className="text-[8px] text-gray-400">{status?.badge} • Boutique {pi.prixUSD}$ • Taux {TAUX_CDF} • {status?.isPaye?"Droits instant":"Freemium 3 vie"}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <a href={`https://wa.me/${cleanWa(a.ownerWhatsapp||a.whatsapp||"")}?text=${encodeURIComponent(`Bonjour WENZE 👋 ${a.titre} ${a.prix}$ / ${(a.prixCDF||toCDF(a.prix)).toLocaleString()} CDF - ${a.id} - ${a.media} - Taux ${TAUX_CDF} - ${status?.badge}`)}`} target="_blank" className="bg-[#25D366] text-white text-center py-2 rounded-full font-bold text-[10px]">WhatsApp</a>
                    <button onClick={()=> addPanier(a)} className="bg-black text-white py-2 rounded-full font-bold text-[10px]">🛒 Panier</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white border rounded-2xl p-4 text-[10px] text-gray-600">
          <p className="font-black text-[11px] text-black">WENZE 2.0 - Accueil FINAL AJUSTÉ PRO</p>
          <ul className="list-disc ml-4 mt-2 space-y-1">
            <li>Tri: <b>Payé 5$/10$ first + Booster 🚀 top + Essai 7j ⏳ + Freemium 3 vie 🆓 last</b> - Droits instant après paiement mensuel</li>
            <li>Freemium: <b>3 annonces à vie images only non vidéo - Alternative abonnement</b> - Sans abo retour freemium 3 vie</li>
            <li>Essai: <b>7j gratuits illimité images only à création compte pro (boutiques & autres)</b> - Puis freemium 3 vie</li>
            <li>Booster: <b>Client occasionnel 1$ / 2 300 CDF 24h image only</b> + <b>Boost 72h 2$ / 4 600 CDF</b> - Boutique payante 1 booster/mois gratuit</li>
            <li>Prix: 🛍️ 5$ / 11 500 CDF et 🏭 10$ / 23 000 CDF - {`usd$ / cdf CDF`} via toCDF() taux fixe {TAUX_CDF} - 0% commission WA direct cleanWa - Vidéo réservée payant</li>
          </ul>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={()=> setSelectedImage(null)}>
          <div className="bg-white rounded-2xl max-w-[380px] w-full overflow-hidden" onClick={e=> e.stopPropagation()}>
            <div className="h-72 bg-[#FFFBF0] flex items-center justify-center">{selectedImage.isVideo ? <video src={selectedImage.photo} controls className="max-w-full max-h-full"/> : selectedImage.photo ? <img src={selectedImage.photo} alt={selectedImage.titre} className="max-w-full max-h-full object-contain"/> : <span className="text-4xl">{getCategorieById(selectedImage.categorieId)?.icon}</span>}</div>
            <div className="p-4"><p className="font-black text-[13px]">{selectedImage.titre} {selectedImage.isVideo?"🎥":"🖼️"}</p><p className="text-[10px] text-gray-500">{selectedImage.ownerStatus?.badge} • {selectedImage.ownerStatus?.droits} • {selectedImage.media}</p><p className="text-[11px] text-gray-600 mt-1 line-clamp-3">{selectedImage.description}</p><p className="font-black text-[#6C3CE0] mt-2">{formatPrix(selectedImage)} • Boutique {getPrixByCategorie(selectedImage.categorieId).prixUSD}$ • Taux {TAUX_CDF} • {selectedImage.media}</p><div className="mt-3 grid grid-cols-2 gap-2"><Link href={`/produit/${selectedImage.id}`} className="bg-black text-white text-center py-3 rounded-full font-bold text-[12px]">Voir produit {selectedImage.isVideo?"🎥":"🖼️"}</Link><button onClick={()=> setSelectedImage(null)} className="bg-white border py-3 rounded-full font-bold text-[12px]">Fermer</button></div></div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-white border-t flex justify-around py-2.5 text-[10px] z-30">
        <Link href="/" className="font-bold text-[#6C3CE0] flex flex-col items-center gap-0.5"><span className="text-[18px]">🏠</span>Accueil</Link>
        <Link href="/market" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏪</span>Marché</Link>
        <Link href="/publier" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">➕</span>Publier {ab?.needsPay?`🆓 ${ab?.count}/3`: ab?.isEssai7j?`⏳ ${ab?.joursRestants}j`: ab?.isPaye?`✅ ${ab?.joursRestants}j`:""}</Link>
        <Link href="/boutiques" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">🏬</span>Boutiques</Link>
        <Link href="/profil" className="flex flex-col items-center gap-0.5 text-gray-500"><span className="text-[18px]">👤</span>Profil</Link>
      </nav>
    </div>
  );
                                   }
