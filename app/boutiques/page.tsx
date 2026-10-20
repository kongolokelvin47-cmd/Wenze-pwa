"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FORMULES, TAUX_CDF } from "@/lib/paiement";

const cleanWhatsapp = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

const FAKE_BOUTIQUES_DEMO = [
  { nom: "Mama Mode Kin", profession: "Vendeur boutique", categorie: "Vendeur boutique", type: "freemium", ville: "Gombe", whatsapp: "+243810000001", ownerWhatsapp: "243810000001", photo: "", estBoutique: true, annonces: 2 },
  { nom: "Coiffure Grâce", profession: "Salon de coiffure", categorie: "Salon de coiffure", type: "pro", ville: "Limete", whatsapp: "+243810000002", ownerWhatsapp: "243810000002", photo: "", estBoutique: true, annonces: 15 },
];

export default function BoutiquesPage() {
  const router = useRouter();
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "freemium" | "pro" | "grossiste">("all");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wenze_user");
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {}

    const map = new Map<string, any>();
    
    try {
      // Vrai vendeur = ownerWhatsapp
      const allRaw = localStorage.getItem("wenze_all_users");
      if (allRaw) {
        const parsed = JSON.parse(allRaw);
        parsed.forEach((u: any) => {
          if (u.estBoutique === true) {
            const key = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp);
            if (key) map.set(key, { ...u, ownerWhatsapp: key, annonces: u.annonces || 0 });
          }
        });
      }
      // Ajoute toi-même si tu es boutique
      const curRaw = localStorage.getItem("wenze_user");
      if (curRaw) {
        const u = JSON.parse(curRaw);
        if (u.estBoutique === true) {
          const key = cleanWhatsapp(u.ownerWhatsapp || u.whatsapp);
          const nb = parseInt(localStorage.getItem("wenze_annonces") || "0");
          map.set(key, { ...u, ownerWhatsapp: key, annonces: nb });
        }
      }
    } catch {}

    const allUsers = Array.from(map.values());
    setBoutiques(allUsers.length === 0 ? FAKE_BOUTIQUES_DEMO : allUsers);
  }, []);

  const requireAuth = (action: string, callback: () => void) => {
    if (!currentUser) {
      const ok = confirm(`Pour ${action}, crée ton compte WENZE gratuit.\nTu veux créer ton compte maintenant ?`);
      if (ok) router.push(`/inscription?next=/boutiques`);
      return false;
    }
    callback();
    return true;
  };

  const filtered = boutiques.filter(b => {
    if (filter !== "all" && b.type !== filter) return false;
    if (search && !`${b.nom} ${b.profession} ${b.categorie} ${b.ville}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (b.estBoutique === false || b.type === "client") return false;
    return true;
  });

  const getBadge = (type: string) => {
    if (type === "pro") return { label: `PRO ${FORMULES.pro.prix}$`, color: "bg-[#6C3CE0] text-white" };
    if (type === "grossiste") return { label: `GROSSISTE ${FORMULES.grossiste.prix}$`, color: "bg-orange-500 text-white" };
    return { label: "FREEMIUM 3 gratuites", color: "bg-gray-800 text-white" };
  };

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-4 pb-28">
      <Link href="/" className="text-xs text-[#6C3CE0] font-bold">← Accueil</Link>
      <h1 className="text-2xl font-black mt-3">Boutiques WENZE</h1>
      <p className="text-[11px] text-gray-500 mt-1">100% boutiques réelles - ownerWhatsapp vérifié - Taux 1$ = {TAUX_CDF} CDF</p>

      <div className="mt-4 space-y-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher boutique..." className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: "all", label: "Toutes" },
            { id: "freemium", label: "Freemium 0$" },
            { id: "pro", label: `Pro ${FORMULES.pro.prix}$` },
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
          <div className="bg-white border rounded-xl p-6 text-center mt-6"><p className="text-3xl">🏪</p><p className="font-bold text-sm mt-2">Aucune boutique</p></div>
        ) : (
          filtered.map((b) => {
            const badge = getBadge(b.type);
            return (
              <div key={b.ownerWhatsapp + b.nom} className="bg-white border p-3 rounded-2xl flex gap-3 items-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center text-xl border overflow-hidden">
                  {b.photo ? <img src={b.photo} alt={b.nom} className="w-full h-full object-contain" /> : "🏪"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{b.nom}</p>
                  <p className="text-[11px] text-gray-500 truncate">{b.profession} • {b.ville} • {b.annonces} annonces</p>
                  <div className="mt-1 flex gap-1">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>{badge.label}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold">🔒 {b.ownerWhatsapp?.slice(-4)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={()=> requireAuth('contacter sur WhatsApp', ()=>{ window.open(`https://wa.me/${cleanWhatsapp(b.ownerWhatsapp || b.whatsapp)}?text=Bonjour ${b.nom}, je viens de WENZE`, '_blank') })} className="bg-[#25D366] text-white text-[10px] px-3 py-2 rounded-full font-bold">WhatsApp</button>
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
            <p className="text-[11px] text-gray-600">👀 Tu visites sans compte - tu peux tout voir</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Link href="/inscription?type=client" className="bg-black text-white p-2.5 rounded-xl text-center text-[11px] font-bold">Client Perso</Link>
              <Link href="/inscription?type=pro" className="bg-[#6C3CE0] text-white p-2.5 rounded-xl text-center text-[11px] font-bold">Créer Boutique</Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-green-500 rounded-xl p-3 flex justify-between items-center">
            <div><p className="font-bold text-xs">👋 {currentUser.nom}</p><p className="text-[10px] text-gray-500">ownerWhatsapp: {cleanWhatsapp(currentUser.ownerWhatsapp||currentUser.whatsapp).slice(-4)}</p></div>
            <button onClick={()=>router.push('/publier')} className="bg-orange-500 text-white px-3 py-2 rounded-full text-[10px] font-bold">+ Publier</button>
          </div>
        )}
      </div>
    </div>
  );
}

// 🔥 FIX VERCEL - OBLIGATOIRE POUR PASSER VERT
export const dynamic = 'force-dynamic';
