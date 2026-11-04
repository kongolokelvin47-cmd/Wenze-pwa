"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const cleanWa = (n:any)=>(n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
const norm = (s:any)=>(s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const safeGet=(k:string)=>{try{return typeof window!=="undefined"?localStorage.getItem(k):null;}catch{return null;}};
const readList=(k:string):any[]=>{try{const r=safeGet(k);if(!r)return[];const v=JSON.parse(r);return Array.isArray(v)?v:[];}catch{return[];}};

// FIX TAUTOLOGIE
function boutiqueName(u:any){
  if(!u) return "Bilamba";
  const brut=(u?.nomBoutique||u?.boutiqueName||u?.name||u?.nomEtablissement||"").trim();
  if(brut.toLowerCase().includes("boutiques") && brut.includes("(")) return brut.replace(/Boutiques\s+Boutiques/i,"Boutiques").trim();
  const base=brut.replace(/^Boutiques\s*/i,"").split("(")[0].trim()||"Bilamba";
  const marque=(u?.marque||u?.slogan||"").replace(/^Boutiques\s*/i,"").trim() || (base.toLowerCase().includes("bilamba")?"Maison d'habillement":"Commerce général");
  return `Boutiques ${base} (${marque})`;
}

export default function BoutiquesPage(){
  const router=useRouter();
  const [users,setUsers]=useState<any[]>([]);
  const [annonces,setAnnonces]=useState<any[]>([]);
  const [q,setQ]=useState("");
  const [cat,setCat]=useState("tout");
  const [selectedWa,setSelectedWa]=useState<string|null>(null);

  useEffect(()=>{
    const allUsers=readList("wenze_all_users");
    const allAnnonces=readList("wenze_annonces_list");
    // Si pas de users, construit boutiques depuis annonces
    if(allUsers.length===0 && allAnnonces.length>0){
      const map=new Map();
      allAnnonces.forEach((a:any)=>{
        const wa=cleanWa(a.ownerWhatsapp||a.whatsapp);
        if(!map.has(wa)) map.set(wa,{ownerWhatsapp:wa,whatsapp:wa,nomBoutique:a.boutiqueName||a.nomEtablissement||`Boutique ${wa.slice(-4)}`,marque:a.marque||"Commerce général",photo:a.photo});
      });
      setUsers(Array.from(map.values()));
    } else setUsers(allUsers);
    setAnnonces(allAnnonces);
  },[]);

  // RECHERCHE INTELLIGENTE - dès 1 lettre / 1 chiffre
  const filtered = useMemo(()=>{
    const query = q.trim();
    const nq = norm(query);
    let list = users.filter(u=>{
      const wa = cleanWa(u.ownerWhatsapp||u.whatsapp||u.id);
      const nom = boutiqueName(u);
      const produits = annonces.filter(a=>cleanWa(a.ownerWhatsapp||a.whatsapp)===wa).map(a=>a.titre||"").join(" ");
      const hay = norm(`${nom} ${u.marque||""} ${u.commune||""} ${wa} 0${wa.slice(-9)} ${produits} ${u.nom||""}`);
      // Si query vide -> tout
      if(!nq) return true;
      // Si query = 1 lettre -> cherche lettre dans nom
      // Si query = chiffre -> cherche dans WA + nom
      return hay.includes(nq);
    });
    if(cat!=="tout") list=list.filter(u=> norm(u.categorieId||"commerces-services").includes(norm(cat)) || norm(u.marque||"").includes(norm(cat)));
    return list;
  },[users,annonces,q,cat]);

  const selectedUser = selectedWa ? users.find(u=>cleanWa(u.ownerWhatsapp||u.whatsapp)===selectedWa) : null;
  const selectedAnnonces = selectedWa ? annonces.filter(a=>cleanWa(a.ownerWhatsapp||a.whatsapp)===cleanWa(selectedWa)) : [];

  // DETAIL BOUTIQUE - MODAL QUI S'OUVRE AU CLIC, PLUS DE 404
  const openBoutique = (wa:string)=>{ setSelectedWa(wa); };
  const goDetailPage = (wa:string)=>{ router.push(`/boutique/${wa}`); };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[17px] leading-tight">Boutiques WENZE WENZE BUSINESS</h1>
            <p className="text-[10px] text-gray-500">{filtered.length} visibles {q && `pour "${q}"`}</p>
          </div>
          <Link href="/tarif" className="text-[10px] font-black bg-black text-white px-3 py-1.5 rounded-full">Tarifs</Link>
        </div>

        {/* RECHERCHE INTELLIGENTE */}
        <div className="relative mt-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Recherche boutique, marque, WhatsApp, produit... Ex: B, 8, Bilamba, 0825" className="w-full p-3.5 pl-10 rounded-full border-2 border-black text-[13px] font-bold bg-white outline-none" autoFocus />
          <span className="absolute left-3.5 top-3.5">🔍</span>
          {q && <button onClick={()=>setQ("")} className="absolute right-3 top-3 w-6 h-6 bg-black text-white rounded-full text-[11px]">✕</button>}
        </div>
        {q && <p className="text-[10px] mt-1.5 text-gray-600">🔍 {filtered.length} boutique{filtered.length>1?"s":""} contenant <b>"{q}"</b> - Tape 1 lettre = filtre instantané</p>}

        <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
          {["tout","Commerces/Services","Gros/Agence","Habillement"].map(c=>(
            <button key={c} onClick={()=>setCat(c)} className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-black border-2 ${cat===c?"bg-black text-white border-black":"bg-white"}`}>{c==="tout"?"Tout - Même prix":c}</button>
          ))}
        </div>
      </header>

      {/* PANNEAU PRIX SUPPRIME - RESTE QUE DANS /tarif - PLUS DE: STANDARD 0.5$ PRO 1$ etc */}

      <div className="p-3 space-y-3">
        {filtered.length===0 ? (
          <div className="bg-white border rounded-2xl p-8 text-center">
            <p className="text-3xl">🔍</p><p className="font-black text-[13px] mt-2">Aucune boutique pour "{q}"</p><p className="text-[11px] text-gray-500 mt-1">Essaie une autre lettre: B, 8, 0, Bilamba...</p>
            <button onClick={()=>setQ("")} className="mt-3 bg-black text-white px-4 py-2 rounded-full text-[11px] font-black">Voir tout</button>
          </div>
        ) : filtered.map((u:any)=>{
          const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||u.id);
          const myAnnonces=annonces.filter(a=>cleanWa(a.ownerWhatsapp||a.whatsapp)===wa);
          return (
            <div key={wa} onClick={()=>openBoutique(wa)} className="bg-white border rounded-2xl p-3 flex gap-3 cursor-pointer active:scale-[0.99]">
              <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center font-black text-[20px] overflow-hidden shrink-0">
                {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover"/> : boutiqueName(u).replace("Boutiques ","").slice(0,1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[13px] truncate">{boutiqueName(u)}</p>
                <p className="text-[11px] text-gray-600 truncate">{u.marque||"Commerce général"} • 0{wa.slice(-9)} • {myAnnonces.length}/50 actives</p>
                <div className="flex gap-1.5 mt-2 overflow-hidden">
                  {myAnnonces.slice(0,3).map((a:any)=>(
                    <div key={a.id} className="w-10 h-10 bg-[#FFFBF0] border rounded-lg overflow-hidden flex items-center justify-center text-[9px]">{a.photo?<img src={a.photo} className="w-full h-full object-cover"/>:a.video?<span>🎬</span>:<span>IMG</span>}</div>
                  ))}
                  {myAnnonces.length>3 && <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center text-[10px] font-black">+{myAnnonces.length-3}</div>}
                </div>
              </div>
              <span className="text-gray-400">›</span>
            </div>
          );
        })}
      </div>

      {/* DETAIL BOUTIQUE - OUVERT AU CLIC - ACTIVITES IMAGES + VIDEOS */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={()=>setSelectedWa(null)}>
          <div className="bg-white w-full max-w-[430px] max-h-[85vh] overflow-y-auto rounded-t-[24px] p-4" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-black text-white rounded-[16px] flex items-center justify-center font-black text-[22px] overflow-hidden">{selectedUser.photo?<img src={selectedUser.photo} className="w-full h-full object-cover"/>:boutiqueName(selectedUser).replace("Boutiques ","").slice(0,1)}</div>
                <div>
                  <p className="font-black text-[15px] leading-tight">{boutiqueName(selectedUser)}</p>
                  <p className="text-[11px] text-gray-500">0{cleanWa(selectedUser.ownerWhatsapp).slice(-9)} • {selectedUser.commune||"Kinshasa"}</p>
                  <p className="text-[10px] mt-1 bg-black text-white inline-block px-2 py-0.5 rounded-full font-bold">{selectedAnnonces.length} activités</p>
                </div>
              </div>
              <button onClick={()=>setSelectedWa(null)} className="w-8 h-8 bg-gray-100 rounded-full">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <a href={`https://wa.me/${cleanWa(selectedUser.ownerWhatsapp)}?text=${encodeURIComponent(`Bonjour ${boutiqueName(selectedUser)} ! Je viens de WENZE`)}`} target="_blank" className="bg-[#25D366] text-white py-3 rounded-full text-center font-black text-[12px]">💬 WhatsApp</a>
              <button onClick={()=>goDetailPage(cleanWa(selectedUser.ownerWhatsapp))} className="bg-black text-white py-3 rounded-full font-black text-[12px]">Voir page complète →</button>
            </div>

            <p className="font-black text-[13px] mt-5 mb-2">Activités - Publicités images & vidéos</p>
            {selectedAnnonces.length===0 ? <p className="text-[11px] text-gray-500 bg-[#FFFBF0] p-4 rounded-xl text-center">Aucune publicité pour le moment</p> :
            <div className="grid grid-cols-2 gap-2">
              {selectedAnnonces.map((a:any)=>(
                <div key={a.id} className="border rounded-xl overflow-hidden">
                  <div className="aspect-square bg-[#FFFBF0] flex items-center justify-center overflow-hidden">{a.video ? <video src={a.video} controls className="w-full h-full object-cover"/> : a.photo ? <img src={a.photo} className="w-full h-full object-cover"/> : <span>📦</span>}</div>
                  <div className="p-2"><p className="font-bold text-[11px] truncate">{a.titre}</p><p className="text-[10px] text-gray-500">{a.prixUSD||a.prix}$</p></div>
                </div>
              ))}
            </div>}
          </div>
        </div>
      )}
    </div>
  );
                                                                                                                                            }
