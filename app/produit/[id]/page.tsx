"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TAUX_CDF, toCDFString } from "@/lib/paiement";

const cleanWa = (n:any)=>(n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const safePrix = (p:any)=>{ const v=Number(p||0); return isNaN(v)?0:v; };
const safeCDF = (p:any)=>{ try{ return toCDFString(safePrix(p)); }catch{ return "0"; } };
const fmtFC = (n:any)=> Number(n||0).toLocaleString("fr-FR") + " FC";
const readList = (k:string):any[]=>{ try{ const r=localStorage.getItem(k); const v=r?JSON.parse(r):[]; return Array.isArray(v)?v:[]; }catch{ return []; } };
function writeList(k:string, list:any[]){ try{ localStorage.setItem(k, JSON.stringify(list)); }catch{} }

function scoreSimilarite(base:any, cand:any):number{
  if(String(base.id)===String(cand.id)) return -1;
  let s=0;
  if(base.categorieId && base.categorieId===cand.categorieId) s+=50;
  if(base.categorie && base.categorie===cand.categorie) s+=30;
  if(base.commune && base.commune===cand.commune) s+=25;
  if(cleanWa(base.ownerWhatsapp||base.whatsapp)===cleanWa(cand.ownerWhatsapp||cand.whatsapp)) s+=15;
  const p1=Number(base.prixUSD||base.prix||0), p2=Number(cand.prixUSD||cand.prix||0);
  if(p1>0 && p2>0){ const diff=Math.abs(p1-p2)/p1; if(diff<0.3) s+=20; else if(diff<0.7) s+=10; }
  if(cand.boostUntil && new Date(cand.boostUntil).getTime()>Date.now()) s+=10;
  if(cand.recommandeParDG) s+=12;
  return s;
}
function saveVu(a:any){
  if(!a?.id) return;
  const list = readList("wenze_vus").filter((x:any)=> String(x.id)!==String(a.id));
  list.unshift({ id:a.id, categorieId:a.categorieId||a.categorie, commune:a.commune, titre:a.titre, prix:a.prixUSD||a.prix, at:Date.now() });
  writeList("wenze_vus", list.slice(0,30));
}

export default function ProduitPage(){
  const params = useParams();
  const rawId = (params?.id as string) || "";
  let id = rawId;
  try{ id = decodeURIComponent(rawId); }catch{ id = rawId; }
  const [a, setA] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [similaires, setSimilaires] = useState<any[]>([]);
  const [aussiVu, setAussiVu] = useState<any[]>([]);
  const [added, setAdded] = useState(false);
  const [vendeurInfo, setVendeurInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bloqueClient, setBloqueClient] = useState(false);
  const [designPub, setDesignPub] = useState<any>({ main:"#FF6B00", title:"WENZE", whats:"+243 810 000 000" });
    useEffect(()=>{
    try{
      try{
        let d:any=null;
        const v1=localStorage.getItem("wenze_design_pub"); if(v1) d=JSON.parse(v1);
        if(!d){ const v2=localStorage.getItem("wenze_dg_v3"); if(v2) d=JSON.parse(v2)?.designPub; }
        if(d?.title) setDesignPub((p:any)=>({...p,...d}));
      }catch{}
      const uRaw = localStorage.getItem("wenze_user");
      const u = uRaw ? JSON.parse(uRaw) : null;
      setUser(u);
      const list = readList("wenze_annonces_list");
      const found = list.find((x:any)=> x.id===id || x.id===decodeURIComponent(id) || cleanWa(x.id)===cleanWa(id));
      if(!found){ setNotFound(true); setLoading(false); return; }
      const monRole = u?.role || "client";
      const jeSuisDG = u?.roleAdmin === "dg" || u?.role === "dg";
      const voirTout = monRole !== "client" || jeSuisDG;
      if (!voirTout && found.recommandeParDG !== true) { setBloqueClient(true); setA(found); setLoading(false); return; }
      setA(found);
      saveVu(found);
      const allUsers = readList("wenze_all_users");
      const waVendeur = cleanWa(found.ownerWhatsapp||found.whatsapp||found.userId);
      const vendeur = allUsers.find((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp||x.id)===waVendeur) || u;
      setVendeurInfo(vendeur ? {...vendeur, wa: waVendeur} : {wa: waVendeur, nomBoutique: found.boutiqueName||`Boutique ${waVendeur.slice(-4)}`, marque: found.marque||"Commerce général"});
      const rel = list.filter((x:any)=> x.id!==found.id && cleanWa(x.ownerWhatsapp||x.whatsapp||x.userId)===waVendeur).slice(0,4);
      setRelated(rel);
      const baseList = voirTout ? list : list.filter((x:any)=> x.recommandeParDG===true);
      const scored = baseList.map((x:any)=>({ x, score: scoreSimilarite(found, x) })).filter((y:any)=> y.score>40).sort((p:any,q:any)=> q.score-p.score).map((y:any)=> y.x);
      const sim = scored.filter((x:any)=> !rel.some((r:any)=> r.id===x.id)).slice(0,8);
      setSimilaires(sim);
      const vus = readList("wenze_vus");
      const panier = readList("wenze_panier");
      const aussi = baseList.filter((x:any)=> x.id!==found.id && !sim.some((s:any)=> s.id===x.id) && !rel.some((r:any)=> r.id===x.id))
        .map((x:any)=>{ let s = scoreSimilarite(found, x); if(vus.some((v:any)=> String(v.id)===String(x.id))) s+=20; if(panier.some((p:any)=> String(p.id)===String(x.id))) s+=15; return { x, score:s }; })
        .filter((y:any)=> y.score>30).sort((p:any,q:any)=> q.score-p.score).map((y:any)=> y.x).slice(0,4);
      setAussiVu(aussi);
      if(!jeSuisDG && sim.length>0){
        const key = "suggest_produit_" + String(found.id);
        const deja = readList("wenze_suggest_notifs_vues").some((n:any)=> n.key===key);
        if(!deja){
          const notifs = readList("wenze_suggest_notifs");
          notifs.unshift({ key, titre:"🔥 Produits similaires trouvés", texte:`Tu regardes "${found.titre}". On a trouvé ${sim.length} produit(s) similaire(s) à ${found.commune||"Kinshasa"}.`, produitId: sim[0]?.id, at: Date.now(), lu:false });
          writeList("wenze_suggest_notifs", notifs.slice(0,20));
        }
      }
    }catch{ setNotFound(true); }
    setLoading(false);
  },[id]);

  const isOwnerMe = useMemo(()=>{
    if(!user || !a) return false;
    try{ return cleanWa(user.ownerWhatsapp||user.whatsapp||user.id)===cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId) || user.id===a.userId; }catch{ return false; }
  },[user,a]);
  const monRole = user?.role || "client";
  const jeSuisDG = user?.roleAdmin === "dg" || user?.role === "dg";
  const estGros = a?.typeAnnonce === "gros";
  const peutVoirGros = useMemo(()=>{
    if(!estGros) return false;
    if(monRole === "grossiste" || jeSuisDG || isOwnerMe) return true;
    return false;
  },[estGros, monRole, jeSuisDG, isOwnerMe]);

  const handleWhatsApp = ()=>{
    if(!a) return;
    try{
      const phone = cleanWa(a.ownerWhatsapp||a.whatsapp||vendeurInfo?.wa||"");
      if(!phone) return;
      const base = typeof window!=="undefined" ? window.location.origin : "https://wenze.cd";
      const lien = `${base}/produit/${encodeURIComponent(a.id)}`;
      const lignePrix = estGros && peutVoirGros ? `- Prix gros : ${fmtFC(a.prixGros)} / ${a.uniteGros || "carton"} (Min ${a.minimumCommande || 10})\n- Prix détail : ${safePrix(a.prix)}$ / ${safeCDF(a.prix)}` : estGros ? `- Prix détail : ${safePrix(a.prix)}$ / ${safeCDF(a.prix)}\n- Je veux le prix gros (je suis Grossiste)` : `- Prix affiché : ${safePrix(a.prix)}$ / ${safeCDF(a.prix)}`;
      const msg = `Bonjour,\n\nJe vous contacte depuis Wenze Wenze Business.\n\nJe suis intéressé(e) par votre article :\n\n- Article : ${a.titre || "Article"}\n${lignePrix}\n- Référence : ${a.id}\n\nJe souhaiterais acheter cet article. Est-il toujours disponible ?\n\nMerci de bien vouloir me renseigner sur les modalités d'achat.\n\nCordialement.\n\nLien annonce : ${lien}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    }catch{}
  };
  const handleAdd = ()=>{
    if(estGros && !peutVoirGros){ setAdded(true); setTimeout(()=>setAdded(false),3000); return; }
    try{
      const panier = readList("wenze_panier");
      if(panier.some((p:any)=> String(p.id)===String(a.id))){ setAdded(true); setTimeout(()=>setAdded(false),2000); return; }
      const minGros = estGros ? Number(a.minimumCommande || 10) : 1;
      panier.push({ ...a, qty: minGros, quantite: minGros, typeAnnonce: a.typeAnnonce, prixGros: Number(a.prixGros || 0), uniteGros: a.uniteGros || "Carton", minimumCommande: minGros, prixAffiche: estGros && peutVoirGros ? a.prixGros : a.prix });
      localStorage.setItem("wenze_panier", JSON.stringify(panier));
      window.dispatchEvent(new Event("wenze-update"));
      setAdded(true); setTimeout(()=>setAdded(false),2500);
    }catch{}
  };
  const handleCopyLink = async ()=>{
    try{
      const base = typeof window!=="undefined" ? window.location.origin : "https://wenze.cd";
      const lien = `${base}/produit/${encodeURIComponent(id)}`;
      await navigator.clipboard.writeText(lien);
      setAdded(true); setTimeout(()=>setAdded(false),2000);
    }catch{}
  };
    if(loading) return <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center font-black">Chargement produit {id}...</div>;
  if(bloqueClient) return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">
      <div className="bg-white border rounded-[20px] p-8 mt-10">
        <p className="text-3xl">⭐</p><p className="font-black mt-2">Boutique pas encore vérifiée</p>
        <p className="text-[11px] text-gray-500 mt-2">Cette boutique n&apos;a pas encore été recommandée par Wenze. Pour ta sécurité, tu ne peux voir que les boutiques vérifiées.</p>
        <Link href="/" className="mt-4 block bg-black text-white py-3 rounded-full font-black text-[11px]">← Voir les boutiques vérifiées</Link>
        <Link href="/recommandes" className="mt-2 block bg-white border-2 border-black py-3 rounded-full font-black text-[11px]">Voir les recommandés</Link>
      </div>
    </div>
  );
  if(notFound || !a) return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">
      <div className="bg-white border rounded-[20px] p-8 mt-10">
        <p className="text-3xl">😕</p><p className="font-black mt-2">Produit introuvable sur ce téléphone</p>
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
        <div className="flex-1 min-w-0"><h1 className="font-black text-[13px] truncate">{a.titre}</h1><p className="text-[10px] text-gray-500 truncate">Réf: {a.id}</p></div>
        <button onClick={handleCopyLink} className="text-[10px] font-black bg-black text-white px-3 py-1.5 rounded-full">{added?"✅ Copié":"🔗 Copier lien"}</button>
      </header>
      <div className="p-4">
        <div className="bg-white border-2 border-black rounded-[20px] overflow-hidden">
          {a.video||a.videoUrl ? <video src={a.video||a.videoUrl} controls playsInline className="w-full aspect-square object-cover bg-black"/> : a.photo ? <img src={a.photo} className="w-full aspect-square object-cover"/> : <div className="w-full aspect-square flex items-center justify-center text-4xl">📦</div>}
          <div className="p-4">
            <div className="flex gap-1.5">
              {estGros ? <span className="text-[9px] bg-orange-500 text-white px-2 py-1 rounded-full font-black">🏭 PRODUIT GROS</span> : null}
              {a.recommandeParDG ? <span className="text-[9px] bg-yellow-400 px-2 py-1 rounded-full font-black">⭐ RECOMMANDÉ</span> : null}
            </div>
            <p className="font-black text-[16px] mt-2">{a.titre}</p>
            <p className="text-[11px] text-gray-500 mt-1">{a.commune||"Kinshasa"} • {a.marque||vendeurInfo?.marque||"Commerce général"}</p>
            <p className="font-black text-[18px] mt-2">{safePrix(a.prix)}$ / {safeCDF(a.prix)}</p>
            <p className="text-[10px] text-gray-500">Prix détail - à l&apos;unité • Taux {TAUX_CDF}</p>
            {estGros ? (peutVoirGros ? (<div className="bg-orange-50 border border-orange-300 rounded-xl p-3 mt-3"><p className="font-black text-[12px] text-orange-700">🏭 Prix gros : {fmtFC(a.prixGros)} / {a.uniteGros || "carton"}</p><p className="text-[10px] text-gray-600 mt-0.5">Commande minimum : {a.minimumCommande || 10} {a.uniteGros || "cartons"}</p></div>) : (<div className="bg-orange-50 border border-orange-300 rounded-xl p-3 mt-3"><p className="font-black text-[12px]">🔒 Prix gros réservé aux Grossistes</p><p className="text-[10px] text-gray-600 mt-1">Connecte-toi comme Grossiste pour voir le prix par {a.uniteGros || "carton"} et commander en gros.</p><Link href="/devenir-grossiste" className="mt-2 block bg-orange-500 text-white text-center py-2 rounded-full font-black text-[10px]">Devenir Grossiste →</Link></div>)) : null}
            <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">{a.description||"Article disponible. Contacte le vendeur pour taille / couleur / stock."}</p>
            <div className="bg-[#FFF2CC] rounded-xl p-3 mt-3 text-[10px]"><p className="font-black">Référence: {a.id}</p><p className="text-gray-600 mt-0.5">Partage ce lien: {typeof window!=="undefined" ? `${window.location.origin}/produit/${a.id}` : ""}</p></div>
          </div>
        </div>
        <Link href={`/boutiques/${waVendeur}`} className="bg-white border-2 rounded-[20px] p-3 mt-3 flex gap-3 items-center block">
          <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-black overflow-hidden">{vendeurInfo?.photo ? <img src={vendeurInfo.photo} className="w-full h-full object-cover"/> : (nomBoutique.replace(/^Boutiques\s*/i,"")[0]||"B")}</div>
          <div className="flex-1 min-w-0"><p className="font-black text-[13px] truncate">{nomBoutique}</p><p className="text-[10px] text-gray-500">0{waVendeur.slice(-9)} • Voir boutique ›</p></div>
        </Link>
        <button onClick={handleWhatsApp} className="w-full mt-3 bg-[#25D366] text-white py-4 rounded-full font-black text-[12px]">{estGros && !peutVoirGros ? "💬 Demander le prix gros" : "💬 Commander sur WhatsApp"}</button>
        <button onClick={handleAdd} className="w-full mt-2 bg-black text-white py-3 rounded-full font-black text-[11px]">{estGros && !peutVoirGros ? "🔒 Réservé aux Grossistes" : added ? "✅ Ajouté au panier" : "🛒 Ajouter au panier"}</button>
        {isOwnerMe && <Link href={`/publier?edit=${a.id}`} className="mt-2 block bg-white border-2 border-black py-3 rounded-full font-black text-[11px] text-center">✏️ Modifier mon annonce</Link>}
        {related.length>0 && (
          <div className="mt-5">
            <p className="font-black text-[13px] mb-2">Même boutique</p>
            <div className="grid grid-cols-2 gap-2">
              {related.map((r:any)=>(
                <Link key={r.id} href={`/produit/${r.id}`} className="bg-white border rounded-xl overflow-hidden block">
                  {r.photo ? <img src={r.photo} className="w-full aspect-square object-cover"/> : <div className="w-full aspect-square flex items-center justify-center">📦</div>}
                  <div className="p-2"><p className="font-bold text-[11px] truncate">{r.titre}</p><p className="text-[10px]">{safePrix(r.prix)}$ / {safeCDF(r.prix)}</p></div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {similaires.length>0 && (
          <div className="mt-5">
            <div className="bg-white border rounded-[20px] p-3">
              <p className="font-black text-[13px]">🔥 Produits similaires</p>
              <p className="text-[10px] text-gray-500">Même catégorie • Même commune • Prix proche • Comme sur Alibaba</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {similaires.map((r:any)=>(
                  <Link key={r.id} href={`/produit/${r.id}`} className="bg-[#FFFBF0] border rounded-xl overflow-hidden block">
                    {r.photo ? <img src={r.photo} className="w-full aspect-square object-cover"/> : <div className="w-full aspect-square flex items-center justify-center">📦</div>}
                    <div className="p-2"><p className="font-bold text-[11px] truncate">{r.titre}</p><p className="text-[10px] text-gray-500">{r.commune||"Kinshasa"}</p><p className="text-[11px] font-black">{safePrix(r.prixUSD||r.prix)}$ / {safeCDF(r.prixUSD||r.prix)}</p>{r.recommandeParDG ? <span className="text-[8px] bg-yellow-400 px-1.5 py-0.5 rounded-full font-black">⭐ RECOMMANDÉ</span> : null}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
        {aussiVu.length>0 && (
          <div className="mt-4">
            <p className="font-black text-[13px] mb-2">👀 Les autres ont aussi vu</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {aussiVu.map((r:any)=>(
                <Link key={r.id} href={`/produit/${r.id}`} className="min-w-[140px] bg-white border rounded-xl overflow-hidden block">
                  {r.photo ? <img src={r.photo} className="w-full h-[110px] object-cover"/> : <div className="w-full h-[110px] flex items-center justify-center">📦</div>}
                  <div className="p-2"><p className="font-bold text-[11px] truncate">{r.titre}</p><p className="text-[10px]">{safePrix(r.prixUSD||r.prix)}$</p></div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <button onClick={()=>{ window.location.href="/"; }} className="w-full mt-4 py-3 rounded-full font-black text-[11px] text-white" style={{ background: designPub.main }}>🔔 Voir plus de suggestions pour toi →</button>
      </div>
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-[9px] font-bold whitespace-nowrap">WENZE WENZE BUSINESS • {a.id}</div>
    </div>
  );
        }
