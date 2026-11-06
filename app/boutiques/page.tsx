"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

// ✅ TAUX LOCAL - Pas de lib/paiement
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
    return { nomComplet: cleaned, nomCourt: cleaned.split("(")[0].trim(), marque: cleaned.match(/\((.*?)\)/)?.[1]||marqueBrut||"Commerce général", initial: cleaned.replace(/^Boutiques\s*/i,"").trim()[0]?.toUpperCase()||"B" };
  }
  let nomBase = nomBrut.replace(/^Boutiques\s*/i,"").replace(/^Boutique\s*/i,"").split("(")[0].trim() || wa.slice(-4);
  let marqueFinale = marqueBrut || "Commerce général";
  return { nomComplet: `Boutiques ${nomBase} (${marqueFinale})`, nomCourt: `Boutiques ${nomBase}`, marque: marqueFinale, initial: nomBase[0]?.toUpperCase()||"B" };
}

export default function BoutiquesPage(){
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filleulsWas, setFilleulsWas] = useState<Set<string>>(new Set());
  const [myInvitations, setMyInvitations] = useState<any[]>([]);

  useEffect(()=>{
    const users = readList("wenze_all_users");
    const cur = readUser();
    if(cur){
      const waCur = cleanWa(cur.ownerWhatsapp||cur.whatsapp||cur.id);
      if(waCur && !users.find((u:any)=>cleanWa(u.ownerWhatsapp||u.whatsapp||u.id)===waCur)) users.push(cur);
    }
    const annonces = readList("wenze_annonces_list");
    const list = users.map((u:any)=>{
      const wa = cleanWa(u.ownerWhatsapp||u.whatsapp||u.id);
      const ident = getBoutiqueIdentite(u, wa);
      const count = annonces.filter((a:any)=>cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===wa).length;
      return { ...u, ...ident, wa, annoncesCount: count };
    }).filter((b:any)=>b.wa);
    setBoutiques(list);

    // 🎁 Mes filleuls
    const me = readUser();
    const myWa = me ? cleanWa(me.ownerWhatsapp||me.whatsapp||me.id) : "";
    const invs = readList("wenze_invitations").filter((x:any)=> !myWa || cleanWa(x.parrain_wa||x.parrainWa)===myWa);
    setMyInvitations(invs);
    setFilleulsWas(new Set(invs.filter((x:any)=>x.statut==="accepte").map((x:any)=>cleanWa(x.invite_wa||x.inviteWa))));
  },[]);

  const filtered = useMemo(()=>{
    const s = search.toLowerCase();
    return boutiques.filter(b=>{
      if(!s) return true;
      return (b.nomComplet||"").toLowerCase().includes(s) || (b.marque||"").toLowerCase().includes(s) || b.wa.includes(s) || ("0"+b.wa.slice(-9)).includes(s);
    }).sort((a,b)=>{
      // Filleuls juste après, pas de TOP gratuit, juste visibilité réseau
      const aF = filleulsWas.has(a.wa)?1:0;
      const bF = filleulsWas.has(b.wa)?1:0;
      if(aF!==bF) return bF-aF;
      return b.annoncesCount - a.annoncesCount;
    });
  },[boutiques, search, filleulsWas]);

  const shareBoutique = (b:any)=>{
    const lien = `${window.location.origin}/boutiques/${b.wa}`;
    const text = `🏬 ${b.nomComplet} sur Wenze ! ${b.annoncesCount} annonce(s) • ${b.marque}\n\n👉 ${lien}`;
    if(navigator.share){
      navigator.share({ title: b.nomComplet, text }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text);
      alert("Lien boutique copié !");
    }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28 p-4">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/" className="w-9 h-9 bg-white border rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1"><h1 className="font-black text-[17px]">Boutiques 🏬</h1><p className="text-[10px] text-gray-500">{boutiques.length} boutiques • {myInvitations.length} invitations • Taux {TAUX_CDF}</p></div>
        <Link href="/inviter" className="bg-black text-white px-4 py-2 rounded-full font-black text-[11px]">+ Inviter</Link>
      </header>

      {/* 🎁 Mes invitations */}
      {myInvitations.length>0 && (
        <Link href="/mes-invitations" className="block bg-white border-2 border-black rounded-2xl p-3 flex items-center gap-3 mb-3">
          <span className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center">🎁</span>
          <div className="flex-1"><p className="font-black text-[12px]">Mes invitations • {myInvitations.length}</p><p className="text-[10px] text-gray-500">✅ {myInvitations.filter((x:any)=>x.statut==="accepte").length} acceptées • ⏳ {myInvitations.filter((x:any)=>x.statut!=="accepte").length} en attente</p></div>
          <span>›</span>
        </Link>
      )}

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Recherche boutique, marque, 0825..." className="w-full border-2 rounded-full px-4 py-3 text-[13px] bg-white outline-none focus:border-black mb-3" />

      {filtered.length===0 ? (
        <div className="bg-white border-2 border-dashed rounded-[20px] p-8 text-center">
          <p className="text-3xl">🏬</p><p className="font-black text-[13px] mt-2">Aucune boutique</p>
          <Link href="/inviter" className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[11px]">🎁 Inviter une boutique</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b:any)=>{
            const isFilleul = filleulsWas.has(b.wa);
            return (
              <div key={b.wa} className={`bg-white border-2 rounded-[20px] p-3 ${isFilleul ? "border-orange-400" : "border-gray-200"}`}>
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-[16px] bg-black text-white flex items-center justify-center font-black text-[20px] overflow-hidden shrink-0">
                    {b.photo ? <img src={b.photo} className="w-full h-full object-cover"/> : b.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[13px] truncate">{b.nomComplet}</p>
                    <p className="text-[10px] text-orange-600 font-bold">{b.marque} • {b.ville||"Kinshasa"}</p>
                    <p className="text-[10px] text-gray-500">0{b.wa.slice(-9)} • {b.annoncesCount} annonce(s)</p>
                    {isFilleul && <p className="text-[9px] font-black text-orange-600 mt-0.5">🎁 Filleul • Invitée par toi</p>}
                  </div>
                  {isFilleul && <span className="bg-orange-500 text-white text-[8px] px-2 py-1 rounded-full font-black h-fit">🎁 FILLEUL</span>}
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-3">
                  <Link href={`/boutiques/${b.wa}`} className="bg-black text-white py-2 rounded-full font-black text-[9px] text-center">🏬 Voir</Link>
                  <a href={`https://wa.me/${b.wa}`} target="_blank" className="bg-[#25D366] text-white py-2 rounded-full font-black text-[9px] text-center">💬 WhatsApp</a>
                  <button onClick={()=>shareBoutique(b)} className="bg-white border-2 border-black py-2 rounded-full font-black text-[9px]">📤 Partager</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link href="/inviter" className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full font-black text-[12px] shadow-lg z-10">🎁 Inviter une boutique</Link>
    </div>
  );
    }
