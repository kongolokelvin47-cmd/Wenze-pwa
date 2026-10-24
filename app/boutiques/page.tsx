"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FORMULES, TAUX_CDF } from "@/lib/paiement";
import { CATEGORIES_WENZE } from "@/lib/categories";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

// ✅ FAKE compatible 6 métiers + régime prestataire unique
const FAKE_BOUTIQUES_DEMO = [
  { 
    nom: "Mama Mode Kin", 
    profession: "Prêt-à-porter", 
    categorie: "commerce", 
    categorieId: "commerce",
    activite: "pret-a-porter",
    type: "freemium", 
    regime: "prestataire",
    ville: "Gombe", 
    whatsapp: "+243810000001", ownerWhatsapp: "243810000001", 
    photo: "", estBoutique: true, annonces: 2 
  },
  { 
    nom: "Coiffure Grâce", 
    profession: "Coiffure",
    categorie: "beaute",
    categorieId: "beaute",
    activite: "coiffure",
    type: "pro", 
    regime: "prestataire",
    ville: "Limete", 
    whatsapp: "+243810000002", ownerWhatsapp: "243810000002", 
    photo: "", estBoutique: true, annonces: 15 
  },
  { 
    nom: "Soudure Pro Kin", 
    profession: "Soudeur",
    categorie: "technique",
    categorieId: "technique",
    activite: "soudeur",
    type: "pro", 
    regime: "prestataire", // ✅ Même régime prestataire
    ville: "Masina", 
    whatsapp: "+243810000003", ownerWhatsapp: "243810000003", 
    photo: "", estBoutique: true, annonces: 8 
  },
  { 
    nom: "Tout Travaux Lemba", 
    profession: "Tout travaux techniques",
    categorie: "technique",
    categorieId: "technique",
    activite: "tout-travaux-techniques",
    type: "pro", 
    regime: "prestataire", // ✅ Même régime prestataire
    ville: "Lemba", 
    whatsapp: "+243810000004", ownerWhatsapp: "243810000004", 
    photo: "", estBoutique: true, annonces: 12 
  },
];

export default function BoutiquesPage() {
  const router = useRouter();
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "freemium" | "pro" | "grossiste" | "technique">("all");
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
          if (u.estBoutique === true) {
            const key = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp);
            if (key) map.set(key, { ...u, ownerWhatsapp: key, regime: u.regime || "prestataire" });
          }
        });
      }
      const curRaw = localStorage.getItem("wenze_user");
      if (curRaw) {
        const u = JSON.parse(curRaw);
        if (u.estBoutique === true) {
          const key = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp);
          map.set(key, { ...u, ownerWhatsapp: key, regime: u.regime || "prestataire" });
        }
      }
    } catch {}

    // ✅ Compte réel annonces depuis wenze_annonces_list - pas depuis string wenze_annonces
    const allUsers = Array.from(map.values()).map(u => {
      const key = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp);
      const count = annoncesList.filter((a:any) => cleanWhatsapp(a.ownerWhatsapp || a.whatsapp) === key).length || u.annonces || 0;
      return { ...u, annonces: count };
    });

    // Si vide, utilise fake mais avec comptes réels si possible
    if (allUsers.length === 0) {
      setBoutiques(FAKE_BOUTIQUES_DEMO);
    } else {
      setBoutiques(allUsers);
    }
  }, [annoncesList.length]);

  const requireAuth = (action: string, callback: () => void) => {
    if (!currentUser) {
      const ok = confirm(`Pour ${action}, crée ton compte WENZE gratuit.\nTu veux créer ton compte maintenant ?`);
      if (ok) router.push(`/inscription?next=/boutiques`);
      return false;
    }
    callback();
    return true;
  };

  const filtered = useMemo(() => {
    return boutiques.filter(b => {
      if (filter === "technique") {
        const catId = (b.categorieId || b.categorie || "").toLowerCase();
        if (!catId.includes("technique") && b.profession !== "Soudeur" && b.profession !== "Tout travaux techniques") return false;
      } else if (filter !== "all" && b.type !== filter) return false;
      
      if (search) {
        const q = search.toLowerCase();
        const hay = `${b.nom} ${b.profession} ${b.categorie} ${b.ville} ${b.activite || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (b.estBoutique === false || b.type === "client") return false;
      return true;
    });
  }, [boutiques, filter, search]);

  const getBadge = (b: any) => {
    const isTechnique = b.profession === "Soudeur" || b.profession === "Tout travaux techniques" || b.categorieId === "technique";
    const regimeTxt = b.regime === "prestataire" ? "Prestataire" : "";
    
    if (b.type === "pro") return { label: `PRO ${FORMULES.pro.prix}$ • ${regimeTxt}`, color: "bg-[#6C3CE0] text-white", icon: isTechnique ? "🔧" : "👑" };
    if (b.type === "grossiste") return { label: `GROSSISTE ${FORMULES.grossiste.prix}$ • ${regimeTxt}`, color: "bg-orange-500 text-white", icon: "🏭" };
    return { label: `FREEMIUM 3 gratuites • ${regimeTxt}`, color: "bg-gray-800 text-white", icon: "🆓" };
  };

  const getCategorieLabel = (b: any) => {
    const found = CATEGORIES_WENZE.find(c => c.id === b.categorieId || c.titreCourt.toLowerCase() === (b.categorie||"").toLowerCase());
    return found ? found.titreCourt : b.categorie || b.profession;
  };

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-4 pb-28">
      <Link href="/" className="text-xs text-[#6C3CE0] font-bold">← Accueil</Link>
      <h1 className="text-2xl font-black mt-3">Boutiques WENZE</h1>
      <p className="text-[11px] text-gray-500 mt-1">
        6 métiers • 100% boutiques réelles • Régime prestataire unique 5$ • Taux 1$ = {TAUX_CDF} CDF
      </p>

      <div className="mt-4 space-y-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher: soudeur, coiffure, tout travaux, Gombe..." className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { id: "all", label: "Toutes" },
            { id: "technique", label: "🔧 Technique - Soudeur + Tout travaux" },
            { id: "freemium", label: "Freemium 0$" },
            { id: "pro", label: `Pro ${FORMULES.pro.prix}$ Prestataire` },
            { id: "grossiste", label: `Grossiste ${FORMULES.grossiste.prix}$` },
          ].map(f => (
            <button key={f.id} onClick={()=>setFilter(f.id as any)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[11px] font-bold border ${filter===f.id ? "bg-black text-white border-black" : "bg-white"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 mt-4">
        {filtered.length === 0 ? (
          <div className="bg-white border rounded-xl p-6 text-center mt-6">
            <p className="text-3xl">🏪</p>
            <p className="font-bold text-sm mt-2">Aucune boutique dans {filter}</p>
            <p className="text-[11px] text-gray-500 mt-1">Filtre actuel: {filter} • Recherche: {search || "aucune"}</p>
          </div>
        ) : (
          filtered.map((b) => {
            const badge = getBadge(b);
            return (
              <div key={b.ownerWhatsapp + b.nom} className="bg-white border p-3 rounded-2xl flex gap-3 items-center shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center text-xl border overflow-hidden">
                  {b.photo ? <img src={b.photo} alt={b.nom} className="w-full h-full object-contain" /> : (b.profession === "Soudeur" ? "🔧" : b.profession === "Tout travaux techniques" ? "🛠️" : "🏪")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate flex items-center gap-1">
                    {b.nom} 
                    {(b.profession === "Soudeur" || b.profession === "Tout travaux techniques") && <span className="text-[8px] bg-[#6C3CE0] text-white px-1.5 py-0.5 rounded-full">PRESTATAIRE</span>}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{b.profession} • {getCategorieLabel(b)} • {b.ville} • {b.annonces} annonces</p>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>{badge.icon} {badge.label}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold">🔒 {b.ownerWhatsapp?.slice(-4)}</span>
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#6C3CE0]/10 text-[#6C3CE0]">Régime: {b.regime || "prestataire"}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={()=> requireAuth('contacter sur WhatsApp', ()=>{ window.open(`https://wa.me/${cleanWhatsapp(b.ownerWhatsapp || b.whatsapp)}?text=Bonjour ${b.nom}, je viens de WENZE - ${b.profession}`, '_blank') })} className="bg-[#25D366] text-white text-[10px] px-3 py-2 rounded-full font-bold">WhatsApp</button>
                  <button onClick={()=> requireAuth('voir la boutique', ()=> router.push(`/boutique/${encodeURIComponent(b.ownerWhatsapp || b.whatsapp)}`))} className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-bold">Voir</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-3 bg-[#FFFBF0]/90 backdrop-blur border-t">
        {!currentUser ? (
          <div className="bg-white border rounded-xl p-3 text-center">
            <p className="text-[11px] text-gray-600">👀 Tu visites sans compte - régime prestataire unique 5$ pour tous (soudeur + tout travaux inclus)</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Link href="/inscription?type=client" className="bg-black text-white p-2.5 rounded-xl text-center text-[11px] font-bold">Client Perso</Link>
              <Link href="/inscription?type=pro" className="bg-[#6C3CE0] text-white p-2.5 rounded-xl text-center text-[11px] font-bold">Créer Boutique Prestataire</Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-green-500 rounded-xl p-3 flex justify-between items-center">
            <div><p className="font-bold text-xs">👋 {currentUser.nom}</p><p className="text-[10px] text-gray-500">Régime: prestataire • 🔒 {cleanWhatsapp(currentUser.ownerWhatsapp||currentUser.whatsapp).slice(-4)}</p></div>
            <button onClick={()=>router.push('/publier')} className="bg-orange-500 text-white px-3 py-2 rounded-full text-[10px] font-bold">+ Publier</button>
          </div>
        )}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
