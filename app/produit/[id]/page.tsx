"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getCategorieById, getPrixByCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDF } from "@/lib/paiement";

function cleanWa(n:string){ return (n||"").toString().replace(/[^0-9]/g,""); }

export default function ProduitPage(){
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [a, setA] = useState<any>(null);

  useEffect(()=>{
    try{
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list")||"[]");
      let found = list.find((x:any)=> x.id===id);
      if(!found){ found = JSON.parse(localStorage.getItem("wenze_current_produit")||"null"); }
      setA(found);
    } catch {}
  },[id]);

  if(!a) return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-center"><p className="font-bold mt-20">Produit {id} introuvable</p><button onClick={()=> router.push("/")} className="mt-4 bg-black text-white px-4 py-2 rounded-full">Accueil WENZE WENZE BUSINESS</button></div>;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-20">
      <header className="bg-white p-4 border-b flex items-center gap-3 sticky top-0 z-20">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <p className="font-black text-[13px] truncate">WENZE WENZE BUSINESS - {a.titre}</p>
      </header>
      <div className="bg-black h-[400px] flex items-center justify-center">
        {a.isVideo ? <video src={a.photo} controls autoPlay className="max-w-full max-h-full"/> : <img src={a.photo} alt={a.titre} className="max-w-full max-h-full object-contain bg-[#FFFBF0]"/>}
      </div>
      <div className="p-4 space-y-3">
        <p className="font-black text-[16px]">{a.titre} {a.isVideo?"🎥":"🖼️"}</p>
        <p className="font-black text-[#6C3CE0]">{Math.round(a.prix)}$ / {Math.round(a.prixCDF||toCDF(a.prix)).toLocaleString()} CDF • Taux {TAUX_CDF}</p>
        <p className="text-[12px] text-gray-600">{a.description}</p>
        <div className="grid grid-cols-2 gap-2">
          <a href={`https://wa.me/${cleanWa(a.ownerWhatsapp||"")}`} target="_blank" className="bg-[#25D366] text-white text-center py-4 rounded-full font-black">WhatsApp</a>
          <button onClick={()=> router.push("/")} className="bg-black text-white py-4 rounded-full font-black">Accueil</button>
        </div>
      </div>
    </div>
  )
        }
