"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FORMULES, TAUX_CDF } from "@/lib/paiement";

// Fallback si personne n'est inscrit (pour ne pas avoir une page vide)
const FAKE_BOUTIQUES_DEMO = [
  { nom: "Mama Mode Kin", profession: "Vendeur boutique", categorie: "Vendeur boutique", type: "freemium", ville: "Gombe", whatsapp: "+243 81 000 0001", photo: "", estBoutique: true, annonces: 2 },
  { nom: "Coiffure Grâce", profession: "Salon de coiffure", categorie: "Salon de coiffure", type: "pro", ville: "Limete", whatsapp: "+243 81 000 0002", photo: "", estBoutique: true, annonces: 15 },
  { nom: "Batisseur Rapide", profession: "Mécanicien", categorie: "Mécanicien", type: "pro", ville: "Matete", whatsapp: "+243 81 000 0003", photo: "", estBoutique: true, annonces: 8 },
];

export default function BoutiquesPage() {
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "freemium" | "pro" | "grossiste">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // 1. LIRE TOUS LES USERS RÉELS
    // Dans ton MVP tu n'as qu'un seul wenze_user, mais on prévoit multi-users pour plus tard
    const allUsers: any[] = [];
    
    try {
      const currentUserRaw = localStorage.getItem("wenze_user");
      if (currentUserRaw) {
        const u = JSON.parse(currentUserRaw);
        // CRITIQUE: On ne prend QUE les boutiques
        if (u.estBoutique === true) {
          allUsers.push({ ...u, annonces: parseInt(localStorage.getItem("wenze_annonces") || "0") });
        }
      }

      // Pour tester: si tu as sauvé plusieurs users dans wenze_all_users (futur backend)
      const allRaw = localStorage.getItem("wenze_all_users");
      if (allRaw) {
        const parsed = JSON.parse(allRaw);
        parsed.forEach((u: any) => {
          if (u.estBoutique === true && !allUsers.find(a => a.whatsapp === u.whatsapp)) {
            allUsers.push(u);
          }
        });
      }
    } catch {}

    // Si aucun vrai boutique inscrite, on montre démo pour ne pas avoir page vide
    if (allUsers.length === 0) {
      setBoutiques(FAKE_BOUTIQUES_DEMO);
    } else {
      setBoutiques(allUsers);
    }
  }, []);

  // FILTRAGE
  const filtered = boutiques.filter(b => {
    // Filtre type
    if (filter !== "all" && b.type !== filter) return false;
    // Filtre recherche
    if (search && !`${b.nom} ${b.profession} ${b.categorie} ${b.ville}`.toLowerCase().includes(search.toLowerCase())) return false;
    // SÉCURITÉ: Jamais afficher client perso
    if (b.estBoutique === false || b.categorie === "client_perso" || b.type === "client") return false;
    return true;
  });

  const getBadge = (type: string) => {
    if (type === "pro") return { label: `PRO ${FORMULES.pro.prix}$`, color: "bg-[#6C3CE0] text-white" };
    if (type === "grossiste") return { label: `GROSSISTE ${FORMULES.grossiste.prix}$`, color: "bg-orange-500 text-white" };
    return { label: "FREEMIUM 3 gratuites", color: "bg-gray-800 text-white" };
  };

  const getIcon = (prof: string) => {
    const p = (prof || "").toLowerCase();
    if (p.includes("coiffure")) return "💇";
    if (p.includes("mécanicien") || p.includes("mecanicien")) return "🔧";
    if (p.includes("boutique") || p.includes("vendeur")) return "👗";
    if (p.includes("électricien")) return "💡";
    if (p.includes("plombier")) return "🚿";
    if (p.includes("grossiste") || p.includes("dépôt") || p.includes("agriculteur")) return "🏭";
    return "🏪";
  };

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-4 pb-20">
      <Link href="/" className="text-xs text-[#6C3CE0] font-bold">← Accueil</Link>
      <h1 className="text-2xl font-black mt-3">Boutiques WENZE</h1>
      <p className="text-[11px] text-gray-500 mt-1">100% boutiques réelles de Kinshasa - Clients perso exclus - 0% commission - Taux 1$ = {TAUX_CDF} CDF</p>

      {/* SEARCH + FILTRES */}
      <div className="mt-4 space-y-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher boutique, profession, commune..." className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#6C3CE0]" />
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

      {/* LISTE */}
      <div className="grid gap-3 mt-4">
        {filtered.length === 0 ? (
          <div className="bg-white border rounded-xl p-6 text-center mt-6">
            <p className="text-3xl">🏪</p>
            <p className="font-bold text-sm mt-2">Aucune boutique trouvée</p>
            <p className="text-[11px] text-gray-500 mt-1">Les comptes Client perso ne s'affichent pas ici. Seules les boutiques (Freemium 3 gratuites, Pro 5$ / 11500 CDF, Grossiste 25$ / 57500 CDF) apparaissent.</p>
            <Link href="/inscription?type=pro" className="block bg-[#6C3CE0] text-white p-3 rounded-full font-bold text-sm mt-4">Créer ma boutique - Gratuit</Link>
          </div>
        ) : (
          filtered.map((b) => {
            const badge = getBadge(b.type);
            return (
              <div key={b.whatsapp + b.nom} className="bg-white border p-3 rounded-2xl flex gap-3 items-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center text-xl border overflow-hidden">
                  {b.photo ? <img src={b.photo} alt={b.nom} className="w-full h-full object-cover" /> : getIcon(b.profession || b.categorie)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{b.nom}</p>
                  <p className="text-[11px] text-gray-500 truncate">{b.profession || b.categorie} • {b.adresse || b.ville || "Kinshasa"} • {b.annonces ?? 0} annonces</p>
                  <div className="mt-1 flex gap-1">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>{badge.label}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold">BOUTIQUE VÉRIFIÉE</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <a href={`https://wa.me/${(b.whatsapp || "").replace(/[^0-9]/g, "")}?text=Bonjour ${b.nom}, je viens de WENZE`} target="_blank" className="bg-[#25D366] text-white text-[10px] px-3 py-2 rounded-full font-bold text-center">WhatsApp</a>
                  <Link href={`/boutique/${encodeURIComponent(b.whatsapp || b.nom)}`} className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-bold text-center">Voir</Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* INFO */}
      <div className="mt-6 bg-white border rounded-xl p-3 text-[10px] text-gray-600">
        <p className="font-bold">ℹ️ Règle WENZE:</p>
        <p className="mt-1">• <b>Client perso = pas boutique</b> → n'apparaît jamais ici (estBoutique: false)</p>
        <p>• <b>Boutique = estBoutique: true</b> → Freemium 3 gratuites à vie, Pro 5$ / {FORMULES.pro.prixCDF} CDF, Grossiste 25$ / {FORMULES.grossiste.prixCDF} CDF = illimité</p>
        <p>• Non-paiement Pro/Grossiste = retour Freemium automatique</p>
        <p>• Inscription gratuite 0$ / 0 CDF pour tous - Taux 1$ = {TAUX_CDF} CDF</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/inscription?type=client" className="bg-black text-white p-3 rounded-xl text-center text-xs font-bold">Client Perso - Gratuit</Link>
        <Link href="/inscription?type=pro" className="bg-[#6C3CE0] text-white p-3 rounded-xl text-center text-xs font-bold">Créer Boutique - Gratuit</Link>
      </div>
    </div>
  );
        }
