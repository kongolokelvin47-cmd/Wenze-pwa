"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { cleanWhatsapp as cleanWaLib } from "@/lib/securite";
import { ROLES } from "@/lib/roles";
import { TAUX_CDF, toCDFString, isCompteCache, checkFreemiumWenze } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/,"");

// WENZE WENZE BUSINESS - Fonction nom boutique + marque
function getBoutiqueIdentite(u:any, wa:string, annonces:any[]=[]){
  // Champs possibles pour le nom
  const nomBrut = (u.nomBoutique || u.boutiqueName || u.name || u.nomEtablissement || "").trim();
  const marqueBrut = (u.marque || u.slogan || u.activite || u.typeBoutique || "").trim();
  
  // Si déjà formaté "Boutiques Bilamba (Maison d'habillement)" on garde
  if(nomBrut.includes("(") && nomBrut.toLowerCase().includes("boutiques")){
    return { nomComplet: nomBrut, nomCourt: nomBrut.split("(")[0].trim(), marque: nomBrut.match(/\((.*?)\)/)?.[1] || marqueBrut };
  }

  // Génère nom pro si vide - basé sur exemples Kin
  let nomBase = nomBrut;
  if(!nomBase){
    // Fallback intelligent selon catégorie
    const cat = (u.categorieId || u.categorie || annonces[0]?.categorieId || "").toLowerCase();
    if(cat.includes("vetement") || cat.includes("habillement")) nomBase = `Bilamba`;
    else if(cat.includes("agro") || cat.includes("vivrier")) nomBase = `Mamie Wenze`;
    else if(cat.includes("electronique") || cat.includes("phone")) nomBase = `TechZone Kin`;
    else if(cat.includes("beaute")) nomBase = `Beauty Glam`;
    else nomBase = `Boutique ${wa.slice(-4)}`;
  }

  let marqueFinale = marqueBrut;
  if(!marqueFinale){
    const cat = (u.categorieId || "").toLowerCase();
    if(nomBase.toLowerCase().includes("bilamba")) marqueFinale = "Maison d'habillement";
    else if(nomBase.toLowerCase().includes("mamie")) marqueFinale = "Agro & Vivrier";
    else if(nomBase.toLowerCase().includes("techzone")) marqueFinale = "Téléphonie & Accessoires";
    else marqueFinale = u.categorieLabel || "Commerce général";
  }

  const nomComplet = `Boutiques ${nomBase.replace(/^Boutiques\s*/i,"")} (${marqueFinale})`;
  return { nomComplet, nomCourt: `Boutiques ${nomBase.replace(/^Boutiques\s*/i,"")}`, marque: marqueFinale };
}

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
      const listRaw = localStorage.getItem("wenze_annonces_list");
      const list = listRaw ? JSON.parse(listRaw) : [];
      setAnnoncesList(list);

      const allUsersRaw = localStorage.getItem("wenze_all_users");
      const allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : (raw ? [JSON.parse(raw)] : []);
      
      const boutiqueMap = new Map<string, any>();
      
      for(const u of allUsers){
        const wa = cleanWhatsapp(u.ownerWhatsapp||u.whatsapp||u.telephone||u.id||"");
        if(!wa) continue;
        if(!boutiqueMap.has(wa)){
          boutiqueMap.set(wa, {
            id: wa,
            ownerWhatsapp: wa,
            whatsapp: wa,
            role: u.role || "vendeur",
            user_type: u.user_type || u.role || "vendeur",
            badge: u.badge || (ROLES as any)[u.role||"vendeur"]?.badge || "🛍️",
            createdAt: u.createdAt || u.created_at || new Date().toISOString(),
            avatar: u.avatar || u.photo || null,
            categorie: u.categorie || u.categorieId || "commerces-services",
            categorieId: u.categorieId || "commerces-services",
            verified: !!u.verified,
            rawUser: u,
          });
        }
      }

      for(const a of list){
        const wa = cleanWhatsapp(a.ownerWhatsapp||a.whatsapp||a.telephone||a.userId||"");
        if(!wa) continue;
        if(!boutiqueMap.has(wa)){
          boutiqueMap.set(wa, {
            id: wa,
            ownerWhatsapp: wa,
            whatsapp: wa,
            role: "vendeur",
            badge: "🛍️",
            createdAt: a.createdAt || new Date().toISOString(),
            categorie: normalizeCategorie(a.categorieId || a.category || "commerces-services"),
            categorieId: a.categorieId || "commerces-services",
            rawUser: { ownerWhatsapp: wa, nomBoutique: a.boutiqueName || a.ownerName, marque: a.marque || "", createdAt: a.createdAt },
          });
        }
      }

      let boutiquesArr = Array.from(boutiqueMap.values());

      // WENZE WENZE BUSINESS: Filtre comptes cachés
      boutiquesArr = boutiquesArr.filter((b:any)=>{
        if(b.role==="dg" || b.role==="superviseur") return true;
        try{
          const userToCheck = b.rawUser || { ownerWhatsapp: b.ownerWhatsapp, whatsapp: b.whatsapp, createdAt: b.createdAt, id: b.id };
          if(isCompteCache(userToCheck)) return false;
        }catch{}
        return true;
      });

      boutiquesArr = boutiquesArr.map((b:any)=>{
        const wa = b.ownerWhatsapp;
        const myAnnonces = list.filter((a:any)=> cleanWhatsapp(a.ownerWhatsapp||a.whatsapp||a.userId||"")===wa);
        
        let abonnementInfo: any = null;
        let placesRestantes = 0;
        let badge = b.badge;
        let palierId: any = null;
        try{
          const userToCheck = b.rawUser || { ownerWhatsapp: wa, whatsapp: wa, createdAt: b.createdAt, id: b.id };
          abonnementInfo = checkFreemiumWenze(userToCheck, myAnnonces.length);
          placesRestantes = abonnementInfo.placesRestantes||0;
          badge = abonnementInfo.badge || badge;
          palierId = abonnementInfo.palierId || null;
        }catch{}

        const identite = getBoutiqueIdentite(b.rawUser||{}, wa, myAnnonces);

        return {
          ...b,
          ...identite,
          annoncesCount: myAnnonces.length,
          annonces: myAnnonces.slice(0,3),
          abonnementInfo,
          placesRestantes,
          badge,
          palierId,
          isFreemium: !!abonnementInfo?.isFreemium,
          isPaye: !!abonnementInfo?.isPaye,
          isCache: !!abonnementInfo?.isCache,
          lastActive: myAnnonces.length>0 ? myAnnonces.sort((a:any,b:any)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())[0].createdAt : b.createdAt,
        };
      });

      boutiquesArr.sort((a:any,b:any)=>{
        if(a.isPaye && !b.isPaye) return -1;
        if(!a.isPaye && b.isPaye) return 1;
        if(b.annoncesCount!==a.annoncesCount) return b.annoncesCount-a.annoncesCount;
        return new Date(b.lastActive).getTime()-new Date(a.lastActive).getTime();
      });

      setBoutiques(boutiquesArr);
    } catch (e) {
      console.error("BoutiquesPage load error WENZE WENZE BUSINESS", e);
    }
  }, []);

  const filteredBoutiques = useMemo(()=>{
    let arr = [...boutiques];
    if(filter!=="all"){
      arr = arr.filter((b:any)=>{
        const cat = normalizeCategorie(b.categorie||"");
        if(filter==="commerces-services") return true;
        if(filter==="gros-autres") return cat.includes("gros") || cat.includes("agro");
        return true;
      });
    }
    if(search.trim()){
      const s = search.toLowerCase();
      arr = arr.filter((b:any)=> 
        b.nomComplet?.toLowerCase().includes(s) ||
        b.nomCourt?.toLowerCase().includes(s) ||
        b.marque?.toLowerCase().includes(s) ||
        b.ownerWhatsapp?.includes(cleanWhatsapp(s)) ||
        b.annonces?.some((a:any)=> a.titre?.toLowerCase().includes(s))
      );
    }
    return arr;
  }, [boutiques, filter, search]);

  return (
    <div className="min-h-screen bg-[#FFFBF0] pb-20">
      <div className="sticky top-0 z-10 bg-white border-b p-3">
        <div className="flex items-center gap-2 mb-3">
          <Link href="/" className="p-2 rounded-full bg-gray-100">←</Link>
          <h1 className="font-black text-[16px]">Boutiques WENZE WENZE BUSINESS</h1>
          <span className="ml-auto text-[10px] bg-[#FFF2CC] text-[#8B5A00] px-2.5 py-1 rounded-full font-bold">{filteredBoutiques.length} visibles - Cachés filtrés</span>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Recherche boutique, marque, WhatsApp, produit... Ex: Bilamba" className="w-full border rounded-xl px-4 py-3 text-[13px] focus:ring-2 focus:ring-black outline-none" />
        <div className="flex gap-2 mt-3 overflow-x-auto">
          <button onClick={()=>setFilter("all")} className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-black border ${filter==="all"?"bg-black text-white border-black":"bg-white"}`}>Tout - Même prix</button>
          <button onClick={()=>setFilter("commerces-services")} className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-black border ${filter==="commerces-services"?"bg-black text-white":"bg-white"}`}>Commerces/Services</button>
          <button onClick={()=>setFilter("gros-autres")} className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-black border ${filter==="gros-autres"?"bg-black text-white":"bg-white"}`}>Gros/Agro</button>
        </div>
        <p className="text-[9px] text-gray-500 mt-2 leading-[13px]"><b className="text-black">WENZE WENZE BUSINESS:</b> Comptes 🔒 cachés filtrés - Freemium 3 à vie 30j puis caché - ⭐ STANDARD 0.5$/1j (4pl/1vid 15s) - 🚀 PRO 1$/1j (10pl/1vid 30s) - 👑 PREMIUM 2$/1j (30pl/1vid 60s) - Max 50 - Suppression libère place - Taux {TAUX_CDF} - 0% comm - Min 1$ - Même prix Détail/Gros</p>
      </div>

      <div className="p-3 grid grid-cols-1 gap-3">
        {filteredBoutiques.map((b:any)=>(
          <Link key={b.id} href={`/boutiques/${b.ownerWhatsapp}`} className="bg-white rounded-[20px] border p-3 flex gap-3 hover:shadow-lg transition">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-200 to-orange-100 flex items-center justify-center text-[16px] font-black shrink-0 overflow-hidden border">
              {b.avatar ? <img src={b.avatar} alt={b.nomComplet} className="w-full h-full object-cover" /> : (b.nomCourt?.replace("Boutiques","").trim()[0]||"B").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-[13px] truncate">{b.nomComplet}</span>
                <span className="text-[11px]">{b.badge}</span>
                {b.isPaye && <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${b.palierId==="PREMIUM"?"bg-black text-white": b.palierId==="PRO"?"bg-green-100 text-green-700":"bg-[#FFF2CC] text-[#8B5A00]"}`}>{b.palierId} {b.abonnementInfo?.joursRestants||0}j</span>}
                {b.isFreemium && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">🆓 {b.annoncesCount}/3</span>}
              </div>
              <div className="text-[11px] text-gray-500 mt-1 truncate">
                <span className="font-bold text-black">{b.marque}</span> • 0{b.ownerWhatsapp.slice(-9)} • {b.annoncesCount}/{b.abonnementInfo?.maxPlaces||50} actives • {b.placesRestantes} places libres strictes
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 truncate">{b.isPaye ? `${b.badge} ${b.palierId} - ${b.abonnementInfo?.joursRestants}j restants` : `🆓 Gratuit ${b.annoncesCount}/3 - ${b.abonnementInfo?.joursRestants||30}j restants`}</div>
              <div className="flex gap-1.5 mt-2">
                {b.annonces?.map((a:any)=>(
                  <div key={a.id||a.annonceId} className="w-11 h-11 rounded-xl bg-gray-100 shrink-0 overflow-hidden border">
                    {a.images?.[0] ? <img src={a.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px]">IMG</div>}
                  </div>
                ))}
                {b.annoncesCount>3 && <div className="w-11 h-11 rounded-xl bg-black text-white flex items-center justify-center text-[10px] font-black">+{b.annoncesCount-3}</div>}
              </div>
            </div>
            <div className="text-gray-300 font-bold">›</div>
          </Link>
        ))}
        {filteredBoutiques.length===0 && (
          <div className="text-center py-16 bg-white rounded-[20px] border border-dashed">
            <p className="text-4xl">🏪</p>
            <p className="font-black mt-2 text-[13px]">Aucune boutique visible</p>
            <p className="text-[11px] text-gray-500 mt-1 max-w-[260px] mx-auto">WENZE WENZE BUSINESS filtre les 🔒 cachés (Freemium 30j expiré). Ex: Boutiques Bilamba (Maison d'habillement) réapparaît après paiement STANDARD 0.5$.</p>
          </div>
        )}
      </div>
    </div>
  );
      }
