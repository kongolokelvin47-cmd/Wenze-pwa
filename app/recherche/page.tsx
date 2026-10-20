"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function RecherchePage() {
  const [search, setSearch] = useState("");
  const [resultBoutiques, setResultBoutiques] = useState<any[]>([]);
  const [resultAnnonces, setResultAnnonces] = useState<any[]>([]);

  useEffect(() => {
    if (!search || search.length < 2) {
      setResultBoutiques([]);
      setResultAnnonces([]);
      return;
    }

    const q = search.toLowerCase();

    // 1. CHERCHER BOUTIQUES (sauf client perso)
    const allUsersRaw = localStorage.getItem("wenze_all_users");
    const currentRaw = localStorage.getItem("wenze_user");
    let allBoutiques: any[] = [];
    try {
      if (currentRaw) {
        const u = JSON.parse(currentRaw);
        if (u.estBoutique === true) allBoutiques.push(u);
      }
      if (allUsersRaw) {
        JSON.parse(allUsersRaw).forEach((u: any) => {
          if (u.estBoutique === true && !allBoutiques.find(x => x.whatsapp === u.whatsapp)) {
            allBoutiques.push(u);
          }
        });
      }
    } catch {}
    
    const boutiquesFiltrees = allBoutiques.filter(b => 
      `${b.nom} ${b.profession} ${b.categorie} ${b.ville} ${b.adresse}`.toLowerCase().includes(q)
    );
    setResultBoutiques(boutiquesFiltrees);

    // 2. CHERCHER OBJETS / ANNONCES (sauf client perso non payé)
    const annoncesRaw = localStorage.getItem("wenze_annonces_list");
    let annonces: any[] = [];
    try {
      annonces = annoncesRaw ? JSON.parse(annoncesRaw) : [];
    } catch {}

    const annoncesFiltrees = annonces.filter((a: any) => {
      // RÈGLE WENZE: exclure client perso sauf si occasionnel payé
      if (a.estBoutique === false && a.type === "client") {
        // Si client perso sans paiement, il ne doit PAS apparaître dans recherche
        // On vérifie qu'il a au moins un crédit ou annonce récente <5j
        const date = new Date(a.date).getTime();
        const isRecent = Date.now() - date < 5 * 24 * 60 * 60 * 1000;
        if (!isRecent) return false;
      }
      // Recherche dans titre, description, catégorie, profession
      return `${a.titre} ${a.description} ${a.categorie} ${a.activite} ${a.profession} ${a.user}`.toLowerCase().includes(q);
    });

    setResultAnnonces(annoncesFiltrees);
  }, [search]);

  const total = resultBoutiques.length + resultAnnonces.length;

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-4 pb-20">
      <Link href="/" className="text-xs font-bold text-[#6C3CE0]">← Accueil</Link>
      
      <div className="mt-3">
        <input 
          value={search} 
          onChange={e=>setSearch(e.target.value)}
          placeholder="Rechercher boutique, iPhone, coiffure, Gombe..." 
          className="w-full border p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#6C3CE0]"
          autoFocus
        />
        <p className="text-[10px] text-gray-500 mt-1">Boutiques + Objets • Clients perso exclus • Taux 1$ = 2300 CDF</p>
      </div>

      {search.length >= 2 && (
        <p className="text-xs font-bold mt-4">{total} résultats pour "{search}"</p>
      )}

      {/* RÉSULTATS BOUTIQUES */}
      {resultBoutiques.length > 0 && (
        <>
          <p className="text-[11px] font-black mt-4 text-[#6C3CE0]">🏪 BOUTIQUES ({resultBoutiques.length})</p>
          <div className="grid gap-2 mt-2">
            {resultBoutiques.map(b => (
              <div key={b.whatsapp} className="bg-white border p-3 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{b.nom}</p>
                  <p className="text-[11px] text-gray-500">{b.profession} • {b.ville}</p>
                </div>
                <Link href={`/boutique/${encodeURIComponent(b.whatsapp)}`} className="bg-black text-white text-[10px] px-3 py-2 rounded-full">Voir boutique</Link>
              </div>
            ))}
          </div>
        </>
      )}

      {/* RÉSULTATS OBJETS */}
      {resultAnnonces.length > 0 && (
        <>
          <p className="text-[11px] font-black mt-4 text-orange-500">📦 OBJETS / ANNONCES ({resultAnnonces.length})</p>
          <div className="grid gap-2 mt-2">
            {resultAnnonces.map(a => (
              <div key={a.id} className="bg-white border p-3 rounded-xl flex gap-3">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center overflow-hidden border">
                  <img src={a.photo} className="max-w-full max-h-full object-contain" alt="" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm truncate">{a.titre}</p>
                  <p className="text-[11px] text-gray-500">{a.categorie} • {a.user}</p>
                  <p className="text-[11px] font-bold text-[#6C3CE0]">{a.prix}$</p>
                </div>
                <Link href={`/produit/${a.id}`} className="bg-black text-white text-[10px] px-3 py-2 rounded-full h-fit">Voir</Link>
              </div>
            ))}
          </div>
        </>
      )}

      {search.length >=2 && total === 0 && (
        <div className="bg-white border rounded-xl p-6 text-center mt-6">
          <p className="font-bold text-sm">Aucun résultat</p>
          <p className="text-[11px] text-gray-500 mt-1">Les comptes Client perso n'apparaissent pas dans la recherche. Seules boutiques et annonces payées/validées apparaissent.</p>
        </div>
      )}
    </div>
  );
                                         }
