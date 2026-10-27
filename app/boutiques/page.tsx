"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TAUX_CDF } from "@/lib/paiement";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie, getPrixByCategorie } from "@/lib/categories";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function BoutiquesPage() {
  const router = useRouter();
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "commerces-services" | "gros-autres">("all");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [annoncesList, setAnnoncesList] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wenze_user");
      if (raw) setCurrentUser(JSON.parse(raw));
      const list = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      setAnnoncesList(list);
    } catch {}

    const map = new Map<string, any>();
    try {
      const allRaw = localStorage.getItem("wenze_all_users");
      if (allRaw) {
        const parsed = JSON.parse(allRaw);
        parsed.forEach((u: any) => {
          const key = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp);
          if (key && u.nom) {
            const fixedCat = normalizeCategorie(u.categorieId || u.categorie || "commerces-services");
            map.set(key, { ...u, ownerWhatsapp: key, categorieId: fixedCat });
          }
        });
      }
      const curRaw = localStorage.getItem("wenze_user");
      if (curRaw) {
        const u = JSON.parse(curRaw);
        const key = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp);
        if (key && u.nom) {
          const fixedCat = normalizeCategorie(u.categorieId || u.categorie || "commerces-services");
          map.set(key, { ...u, ownerWhatsapp: key, categorieId: fixedCat });
        }
      }
    } catch {}

    const allUsers = Array.from(map.values()).map(u => {
      const key = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp);
      const count = annoncesList.filter((a:any) => cleanWhatsapp(a.ownerWhatsapp || a.whatsapp) === key).length;
      const catObj = getCategorieById(u.categorieId);
      return { ...u, annonces: count, categorieTitre: catObj?.titre || u.categorieId, categorieIcon: catObj?.icon || "🛍️", prix: catObj ? getPrixByCategorie(catObj.id) : { prixUSD: 5, prixCDF: 11500 } };
    });

    // ✅ PLUS DE FAKE - vraies boutiques seulement
    setBoutiques(allUsers);
  }, [annoncesList.length]);

  const requireAuth = (action: string, callback: () => void) => {
    if (!currentUser) {
      const ok = confirm(`Pour ${action}, crée ton compte WENZE gratuit.`);
      if (ok) router.push(`/inscription?next=/boutiques`);
      return false;
    }
    callback();
    return true;
  };

  const filtered = useMemo(() => {
    return boutiques.filter(b => {
      if (filter !== "all" && normalizeCategorie(b.categorieId) !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${b.nom} ${b.categorieTitre} ${b.ville} ${b.commune} ${b.categorieId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [boutiques, filter, search]);

  const getBadge = (b: any) => {
    const cat = getCategorieById(b.categorieId);
    const prix = cat ? getPrixByCategorie(cat.id) : { prixUSD: 5, prixCDF: 11500 };
    if (cat?.id === "gros-autres") return { label: `🏭 Gros & Autres ${prix.prixUSD}$ / ${prix.prixCDF.toLocaleString()} CDF`, color: "bg-black text-white", icon: "🏭" };
    return { label: `🛍️ Commerces & Services ${prix.prixUSD}$ / ${prix.prixCDF.toLocaleString()} CDF`, color: "bg-[#6C3CE0] text-white", icon: "🛍️" };
  };

  const totalCommerces = boutiques.filter(b=> normalizeCategorie(b.categorieId)==="commerces-services").length;
  const totalGros = boutiques.filter(b=> normalizeCategorie(b.categorieId)==="gros-autres").length;

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-4 pb-28">
      <Link href="/" className="text-xs text-[#6C3CE0] font-bold">← Accueil</Link>
      <h1 className="text-2xl font-black mt-3">Boutiques WENZE 2.0</h1>
      <p className="text-[11px] text-gray-500 mt-1">
        {CATEGORIES_WENZE.length} catégories • 🛍️ {totalCommerces} boutiques 5$ • 🏭 {totalGros} boutiques 10$ • Taux {TAUX_CDF} CDF • 0% commission
      </p>

      <div className="mt-4 space-y-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher: nom, ville, 🛍️ commerces-services, 🏭 gros..." className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { id: "all", label: `Toutes • ${boutiques.length}` },
            { id: "commerces-services", label: `🛍️ Commerces & Services 5$ • ${totalCommerces}` },
            { id: "gros-autres", label: `🏭 Gros & Autres 10$ • ${totalGros}` },
          ].map(f => (
            <button key={f.id} onClick={()=>setFilter(f.id as any)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-bold border-2 ${filter===f.id ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 bg-black text-white rounded-xl p-3 flex justify-between items-center">
        <div><p className="font-black text-[11px]">🛍️ Petites activités 5$ • 🏭 Gros & autres 10$</p><p className="text-[10px] opacity-70">Électricité, maçon, coiffure etc = 5$ - Gros/production = 10$</p></div>
        <span className="bg-white text-black text-[9px] px-2 py-1 rounded-full font-black">Taux {TAUX_CDF}</span>
      </div>

      <div className="grid gap-3 mt-4">
        {filtered.length === 0 ? (
          <div className="bg-white border-2 border-dashed rounded-xl p-8 text-center mt-4">
            <p className="text-4xl">🏪</p>
            <p className="font-bold text-sm mt-2">{search ? `Aucune boutique pour "${search}"` : filter==="all" ? "Pas encore de boutiques - Crée la première!" : `Aucune boutique ${filter==="commerces-services"?"🛍️ 5$":"🏭 10$"}`}</p>
            <p className="text-[11px] text-gray-500 mt-1">Taux {TAUX_CDF} • 🛍️ 5$ / 11 500 CDF • 🏭 10$ / 23 000 CDF</p>
            <Link href="/inscription" className="mt-3 inline-block bg-[#6C3CE0] text-white px-6 py-3 rounded-full text-[12px] font-bold">Créer boutique 🛍️ 5$</Link>
          </div>
        ) : (
          filtered.map((b) => {
            const badge = getBadge(b);
            const catObj = getCategorieById(b.categorieId);
            return (
              <div key={b.ownerWhatsapp + b.nom} className="bg-white border p-3 rounded-2xl flex gap-3 items-center shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-xl border overflow-hidden">
                  {b.photo ? <img src={b.photo} alt={b.nom} className="w-full h-full object-contain" /> : catObj?.icon || "🏪"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{b.nom}</p>
                  <p className="text-[11px] text-gray-500 truncate">{catObj?.icon} {b.categorieTitre} • {b.ville||"Kinshasa"}{b.commune ? " • "+b.commune : ""} • {b.annonces} annonces</p>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>{badge.label}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold">🔒 {b.ownerWhatsapp?.slice(-4)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={()=> requireAuth('contacter WhatsApp', ()=> window.open(`https://wa.me/${cleanWhatsapp(b.ownerWhatsapp)}?text=Bonjour ${b.nom}, je viens de WENZE - ${b.categorieTitre}`, '_blank'))} className="bg-[#25D366] text-white text-[10px] px-3 py-2 rounded-full font-bold">WhatsApp</button>
                  <button onClick={()=> requireAuth('voir boutique', ()=> router.push(`/boutique/${encodeURIComponent(b.ownerWhatsapp)}`))} className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-bold">Voir</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 bg-white border rounded-2xl p-4">
        <p className="font-black text-[12px]">WENZE 2.0 - {CATEGORIES_WENZE.length} catégories</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          {CATEGORIES_WENZE.map((c:any)=> (
            <div key={c.id} className={`p-3 rounded-xl border-2 ${c.id==="gros-autres"?"bg-black text-white border-black":"bg-purple-50 border-[#6C3CE0]/20"}`}>
              <p className="font-black text-[12px]">{c.icon} {c.titre}</p>
              <p className="opacity-70 mt-1">{c.description}</p>
              <p className="font-black mt-2">{c.prixUSD}$ / {c.prixCDF.toLocaleString()} CDF</p>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-3 bg-[#FFFBF0]/90 backdrop-blur border-t">
        {!currentUser ? (
          <div className="bg-white border rounded-xl p-3 text-center">
            <p className="text-[11px] text-gray-600">👀 Sans compte - 🛍️ Petites activités 5$ • 🏭 Gros & autres 10$ • Taux {TAUX_CDF}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Link href="/inscription?type=client" className="bg-black text-white p-2.5 rounded-xl text-center text-[11px] font-bold">Client 0$</Link>
              <Link href="/inscription" className="bg-[#6C3CE0] text-white p-2.5 rounded-xl text-center text-[11px] font-bold">Créer Boutique 5$</Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-green-500 rounded-xl p-3 flex justify-between items-center">
            <div><p className="font-bold text-xs">👋 {currentUser.nom}</p><p className="text-[10px] text-gray-500">{getCategorieById(normalizeCategorie(currentUser.categorieId))?.titre} • 🔒 {cleanWhatsapp(currentUser.ownerWhatsapp||currentUser.whatsapp).slice(-4)}</p></div>
            <button onClick={()=>router.push('/publier')} className="bg-[#6C3CE0] text-white px-3 py-2 rounded-full text-[10px] font-bold">+ Publier</button>
          </div>
        )}
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
