"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const cleanWa = (n:any)=>(n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");
// Normalise: enlève accents, espaces, tirets -> "Bilamba" = "bilamba", "Boutiques" = "boutiques"
const norm = (s:any)=>(s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const readList=(k:string):any[]=>{ try{ const r=localStorage.getItem(k); const v=r?JSON.parse(r):[]; return Array.isArray(v)?v:[]; }catch{ return []; } };

// FIX TAUTOLOGIE - Boutiques Boutique 8889 -> Boutiques 8889
function boutiqueName(u:any){
  if(!u) return "Bilamba";
  const brut=(u?.nomBoutique||u?.boutiqueName||u?.name||u?.nomEtablissement||"").trim();
  if(brut.toLowerCase().includes("boutiques") && brut.includes("(")) return brut.replace(/Boutiques\s+Boutiques/i,"Boutiques").replace(/Boutique\s+Boutiques/i,"Boutiques").trim();
  const base=brut.replace(/^Boutiques\s*/i,"").replace(/^Boutique\s*/i,"").split("(")[0].trim() || "Bilamba";
  const marque=(u?.marque||u?.slogan||"").replace(/^Boutiques\s*/i,"").replace(/^Boutique\s*/i,"").trim() || (base.toLowerCase().includes("bilamba")?"Maison d'habillement":"Commerce général");
  return `Boutiques ${base} (${marque})`;
}

export default function BoutiquesPage(){
  const router=useRouter();
  const [users,setUsers]=useState<any[]>([]);
  const [annonces,setAnnonces]=useState<any[]>([]);
  const [q,setQ]=useState("");
  const [cat,setCat]=useState("tout");

  useEffect(()=>{
    const allUsers=readList("wenze_all_users");
    const allAnnonces=readList("wenze_annonces_list");
    if(allUsers.length===0 && allAnnonces.length>0){
      const map=new Map();
      allAnnonces.forEach((a:any)=>{
        const wa=cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId);
        if(wa && !map.has(wa)) map.set(wa,{ownerWhatsapp:wa,whatsapp:wa,nomBoutique:a.boutiqueName||a.nomEtablissement||`Boutique ${wa.slice(-4)}`,marque:a.marque||"Commerce général",photo:a.photo,commune:a.commune||"Kinshasa",categorieId:a.categorieId||"commerces-services"});
      });
      setUsers(Array.from(map.values()));
    } else {
      setUsers(allUsers);
    }
    setAnnonces(allAnnonces);
  },[]);

  // RECHERCHE INTELLIGENTE - dès 1 lettre / 1 chiffre
  const filtered = useMemo(()=>{
    const query = q.trim();
    const nq = norm(query);
    // Si vide -> tout
    if(!nq) {
      let all = [...users];
      if(cat!=="tout") all = all.filter(u=> norm(u.categorieId||"")===norm(cat) || norm(u.marque||"").includes(norm(cat)) || norm(u.commune||"").includes(norm(cat)));
      return all;
    }

    // Cherche dans: nom, marque, commune, WA complet, WA sans 243, WA derniers 9 chiffres, produits
    const res = users.filter(u=>{
      const wa = cleanWa(u.ownerWhatsapp||u.whatsapp||u.id||"");
      const wa9 = wa.slice(-9);
      const waSans243 = wa.replace(/^243/,"");
      const nom = boutiqueName(u);
      const produits = annonces.filter(a=>cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===wa).map(a=>a.titre||"").join(" ");
      const hay = norm(`${nom} ${u.marque||""} ${u.slogan||""} ${u.commune||""} ${u.ville||""} ${wa} ${wa9} 0${wa9} ${waSans243} ${produits} ${u.nom||""}`);

      // Cas spécial: query = "8" doit trouver "0825888889" et "Boutique 8889"
      // Cas spécial: query = "b" doit trouver "Bilamba", "Boutique 8889", "Beauty"
      // Cas spécial: query = "bilamba" doit trouver Bilamba
      return hay.includes(nq);
    });

    if(cat!=="tout") return res.filter(u=> norm(u.categorieId||"").includes(norm(cat)) || norm(u.marque||"").includes(norm(cat)));
    return res;
  },[users,annonces,q,cat]);

  // Suggestions rapides quand on tape 1 lettre
  const suggestions = useMemo(()=>{
    if(q.trim().length!==1) return [];
    const nq = norm(q);
    return users.filter(u=> norm(boutiqueName(u)).startsWith(nq)).slice(0,3).map(u=> boutiqueName(u));
  },[q,users]);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[17px] leading-tight">Boutiques WENZE WENZE BUSINESS</h1>
            <p className="text-[10px] text-gray-500">{filtered.length} visibles {q && `pour "${q}"`}</p>
          </div>
          <Link href="/tarif" className="text-[10px] font-black bg-black text-white px-3 py-1.5 rounded-full whitespace-nowrap">Tarifs</Link>
        </div>

        {/* RECHERCHE INTELLIGENTE */}
        <div className="relative mt-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Recherche: B, 8, Bilamba, 0825, pagne..." className="w-full p-3.5 pl-10 pr-10 rounded-full border-2 border-black text-[13px] font-bold bg-white outline-none" />
          <span className="absolute left-3.5 top-3.5">🔍</span>
          {q && <button onClick={()=>setQ("")} className="absolute right-3 top-3 w-6 h-6 bg-black text-white rounded-full text-[11px] flex items-center justify-center">✕</button>}
        </div>

        {/* EXEMPLES CLIQUABLES - Pour tester en 1 clic */}
        {!q && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <span className="text-[9px] text-gray-500 py-1">Essaie:</span>
            {["B","8","Bilamba","0825"].map(ex=>(
              <button key={ex} onClick={()=>setQ(ex)} className="text-[10px] bg-[#FFF2CC] border px-2.5 py-1 rounded-full font-bold">"{ex}"</button>
            ))}
          </div>
        )}

        {q && <p className="text-[10px] mt-1.5 text-gray-600">🔍 <b>{filtered.length}</b> boutique{filtered.length>1?"s":""} contenant <b>"{q}"</b> - Tape 1 lettre = filtre instantané</p>}
        {suggestions.length>0 && (
          <div className="mt-1.5 flex gap-1.5 flex-wrap">
            {suggestions.map(s=>(<button key={s} onClick={()=>setQ(s.replace("Boutiques ","").split(" (")[0])} className="text-[9px] bg-black text-white px-2 py-1 rounded-full">{s}</button>))}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
          {["tout","Commerces/Services","Habillement","Agro"].map(c=>(
            <button key={c} onClick={()=>setCat(c)} className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-black border-2 ${cat===c?"bg-black text-white border-black":"bg-white"}`}>{c==="tout"?"Tout - Même prix":c}</button>
          ))}
        </div>
      </header>

      {/* PANNEAU PRIX SUPPRIME - RESTE QUE DANS /tarif */}

      <div className="p-3 space-y-3">
        {filtered.length===0 ? (
          <div className="bg-white border rounded-2xl p-8 text-center">
            <p className="text-3xl">🔍</p><p className="font-black text-[13px] mt-2">Aucune boutique pour "{q}"</p><p className="text-[11px] text-gray-500 mt-1">Essaie: B, 8, Bilamba, 0825, pagne...</p>
            <button onClick={()=>setQ("")} className="mt-3 bg-black text-white px-4 py-2 rounded-full text-[11px] font-black">Voir tout</button>
          </div>
        ) : filtered.map((u:any)=>{
          const wa=cleanWa(u.ownerWhatsapp||u.whatsapp||u.id);
          const myAnnonces=annonces.filter(a=>cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===wa);
          const hasVideo = myAnnonces.some(a=> a.video || a.videoUrl);
          return (
            <div key={wa} onClick={()=>router.push(`/boutiques/${wa}`)} className="bg-white border rounded-2xl p-3 flex gap-3 cursor-pointer active:scale-[0.99] hover:border-black">
              <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center font-black text-[20px] overflow-hidden shrink-0">
                {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover"/> : boutiqueName(u).replace(/^Boutiques\s*/i,"").slice(0,1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[13px] truncate">{boutiqueName(u)}</p>
                <p className="text-[11px] text-gray-600 truncate">{u.marque||"Commerce général"} • 0{wa.slice(-9)} • {myAnnonces.length} activités {hasVideo?"• 🎬 vidéo":""}</p>
                <div className="flex gap-1.5 mt-2">
                  {myAnnonces.slice(0,3).map((a:any)=>(
                    <div key={a.id} className="w-10 h-10 bg-[#FFFBF0] border rounded-lg overflow-hidden flex items-center justify-center text-[9px] relative">
                      {a.video||a.videoUrl ? <span>🎬</span> : a.photo ? <img src={a.photo} className="w-full h-full object-cover"/> : <span>IMG</span>}
                    </div>
                  ))}
                  {myAnnonces.length>3 && <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center text-[10px] font-black">+{myAnnonces.length-3}</div>}
                </div>
              </div>
              <span className="text-gray-400 text-[18px]">›</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
