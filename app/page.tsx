"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { TAUX_CDF, toCDFString, verifierAbonnement } from "@/lib/paiement";
export const dynamic = "force-dynamic";
const safeGet = (k: string) => { try { return typeof window !== "undefined" ? localStorage.getItem(k) : null; } catch { return null; } };
const readList = (k: string): any[] => { try { const raw = safeGet(k); if (!raw) return []; const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; } };
export default function HomePage() {
  const [ab, setAb] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  useEffect(() => { try { const abCheck = verifierAbonnement(); setAb(abCheck); } catch {} try { const list = readList("wenze_annonces_list"); setAnnonces(list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())); } catch {} setLoading(false); }, []);
  const filtered = useMemo(() => { let f = annonces; if (catFilter !== "all") { f = f.filter((a: any) => normalizeCategorie(a.categorieId || a.categorie) === catFilter); } if (search.trim()) { const s = search.toLowerCase(); f = f.filter((a: any) => (a.titre || "").toLowerCase().includes(s) || (a.commune || "").toLowerCase().includes(s)); } return f; }, [annonces, catFilter, search]);
  const payantCount = useMemo(() => filtered.filter((a: any) => a.isPayant).length, [filtered]);
  if (loading) { return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse" /><p className="text-[11px] text-gray-400 mt-2">Chargement...</p></div>; }
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 border-b"><div className="p-4 flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white font-black">W</div><div><h1 className="font-black text-[14px]">WENZE V6</h1><p className="text-[9px] text-gray-500">Taux {TAUX_CDF} - 0% comm</p></div></div><Link href="/publier" className="bg-black text-white px-3 py-1.5 rounded-full text-[11px] font-black">+ Publier</Link></div><div className="px-4 pb-3"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full border rounded-full px-4 py-2.5 text-[13px] bg-gray-50" /></div><div className="px-4 pb-3 flex gap-2 overflow-x-auto"><button onClick={() => setCatFilter("all")} className={"px-3 py-1.5 rounded-full text-[11px] font-bold border " + (catFilter === "all" ? "bg-black text-white border-black" : "bg-white")}>Tous ({annonces.length})</button>{CATEGORIES_WENZE.map((c: any) => (<button key={c.id} onClick={() => setCatFilter(c.id)} className={"px-3 py-1.5 rounded-full text-[11px] font-bold border " + (catFilter === c.id ? "bg-black text-white border-black" : "bg-white")}>{c.icon} {c.titreCourt}</button>))}</div></header>
      <div className="p-4"><div className="flex justify-between items-center mb-3"><p className="font-black text-[12px]">{filtered.length} annonces - Payant {payantCount}</p><p className="text-[10px] text-gray-500">{ab?.badge || "Visiteur"}</p></div>{filtered.length === 0 ? (<div className="bg-white border rounded-2xl p-8 text-center"><p className="text-[12px] font-bold">Aucune annonce</p><Link href="/publier" className="mt-4 inline-block bg-black text-white px-4 py-2 rounded-full text-[11px] font-black">Publier</Link></div>) : (<div className="grid grid-cols-2 gap-3">{filtered.map((a: any) => (<Link key={a.id} href={"/produit/" + a.id} className="bg-white border rounded-2xl overflow-hidden"><div className="h-28 bg-[#FFFBF0]">{a.photo ? <img src={a.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{getCategorieById(a.categorieId)?.icon || "P"}</div>}</div><div className="p-2.5"><p className="font-bold text-[11px] truncate">{a.titre}</p><p className="text-[11px] font-black text-orange-600">{a.prixUSD || a.prix}$ / {toCDFString(Number(a.prixUSD || a.prix || 0))}</p></div></Link>))}</div>)}</div>
    </div>
  );
}
