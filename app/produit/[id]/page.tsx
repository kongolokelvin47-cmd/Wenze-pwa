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

// --- MOTEUR SUGGESTION V4 - Alibaba ---
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
      // Design DG
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
      if (!voirTout && found.recommandeParDG !== true) {
        setBloqueClient(true); setA(found); setLoading(false); return;
      }
      setA(found);
      saveVu(found); // ✅ TRACKING : Ce produit sera re-proposé à l'accueil

      const allUsers = readList("wenze_all_users");
      const waVendeur = cleanWa(found.ownerWhatsapp||found.whatsapp||found.userId);
      const vendeur = allUsers.find((x:any)=> cleanWa(x.ownerWhatsapp||x.whatsapp||x.id)===waVendeur) || u;
      setVendeurInfo(vendeur ? {...vendeur, wa: waVendeur} : {wa: waVendeur, nomBoutique: found.boutiqueName||`Boutique ${waVendeur.slice(-4)}`, marque: found.marque||"Commerce général"});

      // 1. Même boutique - comme avant, mais 4
      const rel = list.filter((x:any)=> x.id!==found.id && cleanWa(x.ownerWhatsapp||x.whatsapp||x.userId)===waVendeur).slice(0,4);
      setRelated(rel);

      // 2. PRODUITS SIMILAIRES - Moteur Alibaba V4
      const baseList = voirTout ? list : list.filter((x:any)=> x.recommandeParDG===true);
      const scored = baseList.map((x:any)=>({ x, score: scoreSimilarite(found, x) })).filter((y:any)=> y.score>40).sort((p:any,q:any)=> q.score-p.score).map((y:any)=> y.x);
      const sim = scored.filter((x:any)=> !rel.some((r:any)=> r.id===x.id)).slice(0,8);
      setSimilaires(sim);

      // 3. LES AUTRES ONT AUSSI VU - Basé sur wenze_vus + panier populaire
      const vus = readList("wenze_vus");
      const panier = readList("wenze_panier");
      const aussi = baseList.filter((x:any)=> x.id!==found.id && !sim.some((s:any)=> s.id===x.id) && !rel.some((r:any)=> r.id===x.id))
        .map((x:any)=>{
          let s = scoreSimilarite(found, x);
          if(vus.some((v:any)=> String(v.id)===String(x.id))) s+=20;
          if(panier.some((p:any)=> String(p.id)===String(x.id))) s+=15;
          return { x, score:s };
        }).filter((y:any)=> y.score>30).sort((p:any,q:any)=> q.score-p.score).map((y:any)=> y.x).slice(0,4);
      setAussiVu(aussi);

      // 4. NOTIFICATION SUGGESTION - Comme Facebook / Snapchat
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
          {/* 🔥 PRODUITS SIMILAIRES - Moteur Alibaba V4 */}
        {similaires.length>0 && (
          <div className="mt-5">
            <div className="bg-white border rounded-[20px] p-3">
              <p className="font-black text-[13px]">🔥 Produits similaires</p>
              <p className="text-[10px] text-gray-500">Même catégorie • Même commune • Prix proche • Comme sur Alibaba</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {similaires.map((r:any)=>(
                  <Link key={r.id} href={`/produit/${r.id}`} className="bg-[#FFFBF0] border rounded-xl overflow-hidden block">
                    {r.photo ? <img src={r.photo} className="w-full aspect-square object-cover"/> : <div className="w-full aspect-square flex items-center justify-center">📦</div>}
                    <div className="p-2">
                      <p className="font-bold text-[11px] truncate">{r.titre}</p>
                      <p className="text-[10px] text-gray-500">{r.commune||"Kinshasa"}</p>
                      <p className="text-[11px] font-black">{safePrix(r.prixUSD||r.prix)}$ / {safeCDF(r.prixUSD||r.prix)}</p>
                      {r.recommandeParDG ? <span className="text-[8px] bg-yellow-400 px-1.5 py-0.5 rounded-full font-black">⭐ RECOMMANDÉ</span> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 👀 LES AUTRES ONT AUSSI VU */}
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

        {/* 🔔 BOUTON SUGGESTION NOTIF - Style géant */}
        <button onClick={()=>{ window.location.href="/"; }} className="w-full mt-4 py-3 rounded-full font-black text-[11px] text-white" style={{ background: designPub.main }}>
          🔔 Voir plus de suggestions pour toi →
        </button>
