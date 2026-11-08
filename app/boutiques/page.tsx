"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

// CORRIGÉ : TAUX UNIFIÉ partout = 2850, comme dans produit/[id] et lib/paiement
const TAUX_CDF = 2300;
const toCDF = (p:any)=>{ const v=Number(p||0); return isNaN(v)?0:Math.round(v*TAUX_CDF); };
const toCDFString = (p:any)=> toCDF(p).toLocaleString()+" CDF";

function cleanWa(n:any){ return (n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,""); }
function readList(k:string):any[]{ try{ const v=JSON.parse(localStorage.getItem(k)||"[]"); return Array.isArray(v)?v:[]; }catch{ return []; } }
function readUser(){ try{ const r=localStorage.getItem("wenze_user"); return r?JSON.parse(r):null; }catch{ return null; } }

function getBoutiqueIdentite(u:any, wa:string){
  const nomBrut = (u?.nomBoutique||u?.boutiqueName||u?.nomEtablissement||u?.name||"").trim();
  const marqueBrut = (u?.marque||"").trim();
  if(nomBrut.toLowerCase().includes("boutiques") && nomBrut.includes("(")){
    const cleaned = nomBrut.replace(/Boutiques\s+Boutiques/i,"Boutiques").trim();
    return { nom: cleaned, marque: marqueBrut || "Commerce général" };
  }
  if(nomBrut) return { nom: nomBrut, marque: marqueBrut || "Commerce général" };
  // CORRIGÉ : plus de "Boutiques 1234 (Commerce général)" moche
  return { nom: `Boutique ${wa.slice(-4)}`, marque: marqueBrut || "Commerce général" };
}

export default function BoutiquesPage(){
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [moi, setMoi] = useState<any>(null);
  const [filtre, setFiltre] = useState<"tout"|"recommande"|"gros">("tout");

  useEffect(()=>{
    const u = readUser();
    setMoi(u);

    const annonces = readList("wenze_annonces_list");
    const users = readList("wenze_all_users");
    const usersMap = new Map<string, any>();
    for(const usr of users){
      const wa = cleanWa(usr.ownerWhatsapp || usr.whatsapp);
      if(wa) usersMap.set(wa, usr);
    }
    if(u){
      const wa = cleanWa(u.ownerWhatsapp || u.whatsapp);
      if(wa) usersMap.set(wa, u);
    }

    // Groupe les annonces par boutique (par WhatsApp vendeur)
    const map = new Map<string, any>();
    for(const a of annonces){
      const wa = cleanWa(a.ownerWhatsapp || a.whatsapp || a.userId);
      if(!wa) continue;
      if(!map.has(wa)){
        const vendeur = usersMap.get(wa) || {};
        const ident = getBoutiqueIdentite({ ...vendeur, nomBoutique: a.boutiqueName || vendeur.nomBoutique }, wa);
        map.set(wa, {
          wa,
          nom: ident.nom,
          marque: ident.marque,
          commune: a.commune || vendeur.commune || "Kinshasa",
          photo: vendeur.photo || vendeur.avatar || a.photo || "",
          annonces: [],
          // CORRIGÉ : on garde le statut Recommandé au niveau boutique
          recommandeParDG: false,
          nbGros: 0,
          vendeur,
        });
      }
      const b = map.get(wa);
      b.annonces.push(a);
      if(a.recommandeParDG === true) b.recommandeParDG = true;
      if(a.typeAnnonce === "gros") b.nbGros += 1;
    }

    setBoutiques(Array.from(map.values()));
  },[]);

  // CORRIGÉ : RÈGLE D'OR - Client voit seulement les Recommandés
  const monRole = moi?.role || "client";
  const jeSuisDG = moi?.roleAdmin === "dg" || moi?.role === "dg";
  const voirTout = monRole !== "client" || jeSuisDG;
  const maCommune = moi?.commune || "Kinshasa";

  const filtered = useMemo(()=>{
    let list = [...boutiques];

    // Client / Visiteur : seulement les boutiques avec au moins 1 annonce Recommandée
    if(!voirTout){
      list = list.filter((b:any)=> b.recommandeParDG === true);
    }

    // Filtres boutons
    if(filtre === "recommande") list = list.filter((b:any)=> b.recommandeParDG);
    if(filtre === "gros") list = list.filter((b:any)=> b.nbGros > 0);

    if(search.trim()){
      const s = search.trim().toLowerCase();
      list = list.filter((b:any)=> (b.nom||"").toLowerCase().includes(s) || (b.marque||"").toLowerCase().includes(s) || (b.commune||"").toLowerCase().includes(s));
    }

    // Tri : ma commune d'abord, puis Recommandé, puis nb annonces
    return list.sort((a:any,b:any)=>{
      const aIci = (a.commune||"") === maCommune ? 0 : 1;
      const bIci = (b.commune||"") === maCommune ? 0 : 1;
      if(aIci !== bIci) return aIci - bIci;
      if(a.recommandeParDG !== b.recommandeParDG) return a.recommandeParDG ? -1 : 1;
      return b.annonces.length - a.annonces.length;
    });
  },[boutiques, voirTout, filtre, search, maCommune]);

  const toggleRecommandeBoutique = (wa: string) => {
    if(!jeSuisDG) return;
    const list = readList("wenze_annonces_list").map((a:any)=>{
      const aWa = cleanWa(a.ownerWhatsapp || a.whatsapp || a.userId);
      if(aWa !== wa) return a;
      return { ...a, recommandeParDG: !a.recommandeParDG };
    });
    localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
    window.location.reload();
  };

  const totalAnnonces = boutiques.reduce((s,b)=> s + b.annonces.length, 0);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1">
            <h1 className="font-black text-[16px]">🏬 Boutiques</h1>
            <p className="text-[10px] text-gray-500">{filtered.length} boutique(s) • {totalAnnonces} annonce(s)</p>
          </div>
        </div>
        <div className="mt-3 relative">
          <input value={search} onChange={(e)=> setSearch(e.target.value)} placeholder="Recherche boutique, Gombe, Lemba..." className="w-full border-2 pl-10 pr-4 py-3 rounded-full text-[13px] bg-[#FFFBF0] outline-none" />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto">
          <button onClick={()=> setFiltre("tout")} className={"px-4 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap " + (filtre==="tout" ? "bg-black text-white" : "bg-white")}>Tout • {boutiques.length}</button>
          <button onClick={()=> setFiltre("recommande")} className={"px-4 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap " + (filtre==="recommande" ? "bg-black text-white" : "bg-white")}>⭐ Recommandées</button>
          <button onClick={()=> setFiltre("gros")} className={"px-4 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap " + (filtre==="gros" ? "bg-black text-white" : "bg-white")}>🏭 Gros</button>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {/* CORRIGÉ : bandeau par rôle */}
        {!voirTout ? (
          <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-3.5">
            <p className="font-black text-[13px]">⭐ Boutiques vérifiées à {maCommune}</p>
            <p className="text-[11px] text-gray-600 mt-0.5">Tu vois seulement les boutiques recommandées par Wenze. Pour voir tout, ouvre ta boutique.</p>
          </div>
        ) : monRole === "grossiste" ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5">
            <p className="font-black text-[13px]">🏭 Boutiques gros - Tout Kinshasa</p>
            <p className="text-[11px] text-gray-600 mt-0.5">Tu vois tout, y compris les prix gros.</p>
          </div>
        ) : jeSuisDG ? (
          <div className="bg-black text-white rounded-2xl p-3.5">
            <p className="font-black text-[13px]">👑 Mode DG - {boutiques.length} boutiques</p>
            <p className="text-[10px] opacity-70">Clique sur ★ pour recommander toute la boutique d'un coup.</p>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-dashed rounded-2xl">
            <p className="text-4xl">🏬</p>
            <p className="text-[13px] font-black mt-3">{!voirTout ? "Aucune boutique vérifiée pour l'instant" : "Aucune boutique"}</p>
            <p className="text-[11px] text-gray-500 mt-1 px-4">{!voirTout ? "Le DG n'a pas encore recommandé de boutique dans ta zone." : "Sois le premier à publier."}</p>
            <Link href="/publier" className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[11px]">+ Publier</Link>
          </div>
        ) : (
          filtered.map((b:any)=>{
            const prixMin = Math.min(...b.annonces.map((a:any)=> Number(a.prixUSD || a.prix || 0)));
            return (
              <div key={b.wa} className="bg-white border rounded-2xl overflow-hidden">
                <Link href={`/boutiques/${b.wa}`} className="flex gap-3 p-3 items-center">
                  <div className="w-16 h-16 bg-[#FFFBF0] rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border">
                    {b.photo ? <img src={b.photo} className="w-full h-full object-cover" /> : <span className="text-2xl">🏬</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1">
                      {b.recommandeParDG ? <span className="text-[9px] bg-yellow-400 px-2 py-0.5 rounded-full font-black">⭐ RECOMMANDÉ</span> : null}
                      {b.nbGros > 0 ? <span className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black">🏭 GROS ({b.nbGros})</span> : null}
                    </div>
                    <p className="font-black text-[14px] truncate mt-1">{b.nom}</p>
                    <p className="text-[11px] text-gray-500 truncate">{b.marque} • {b.commune}</p>
                    <p className="text-[11px] font-bold mt-0.5">{b.annonces.length} annonce(s) • Dès {prixMin}$ / {toCDFString(prixMin)}</p>
                  </div>
                  <span className="text-gray-400">›</span>
                </Link>
                {/* CORRIGÉ : DG peut recommander toute la boutique */}
                {jeSuisDG ? (
                  <button onClick={()=> toggleRecommandeBoutique(b.wa)} className={"w-full py-2 text-[10px] font-black border-t " + (b.recommandeParDG ? "bg-yellow-100" : "bg-gray-50")}>
                    {b.recommandeParDG ? "★ Retirer Recommandé (toute la boutique)" : "☆ Recommander toute la boutique"}
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
         }
