"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { normalizeCategorie, getCategorieById, getPrixByCategorie } from "@/lib/categories";
import { TAUX_CDF } from "@/lib/paiement";

const cleanWa = (n: string) => (n || "").toString().replace(/[^0-9]/g, "");

export default function Connexion() {
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    const waClean = cleanWa(whatsapp);
    if (!waClean || !password) { 
      setError("WhatsApp et mot de passe requis"); 
      return; 
    }
    if(waClean.length < 9){
      setError("Numéro WhatsApp invalide - ex: +243810...");
      return;
    }
    
    setLoading(true);
    
    try {
      // ✅ WENZE 2.0 FIX: check wenze_all_users d'abord (multi-comptes), puis wenze_user
      let foundUser: any = null;
      
      const allRaw = localStorage.getItem("wenze_all_users");
      if(allRaw){
        const all = JSON.parse(allRaw);
        foundUser = all.find((u:any)=> cleanWa(u.ownerWhatsapp || u.whatsapp) === waClean);
      }
      
      // Fallback ancien single user
      if(!foundUser){
        const singleRaw = localStorage.getItem("wenze_user");
        if(singleRaw){
          const u = JSON.parse(singleRaw);
          if(cleanWa(u.ownerWhatsapp || u.whatsapp) === waClean) foundUser = u;
        }
      }

      if (!foundUser) {
        setError("Aucun compte avec ce WhatsApp. Crée un compte d'abord - 🛍️ 5$ ou 🏭 10$.");
        setLoading(false);
        return;
      }

      // ✅ Vérif password simple MVP - password stocké dans user pour WENZE 2.0 local
      if (foundUser.password && foundUser.password !== password) {
        setError("Mot de passe incorrect.");
        setLoading(false);
        return;
      }

      // ✅ FIX: normalise categorieId ancien → nouveau 2 catégories
      const fixedCatId = normalizeCategorie(foundUser.categorieId || foundUser.categorie || "commerces-services");
      const catObj = getCategorieById(fixedCatId);
      const prix = catObj ? getPrixByCategorie(catObj.id) : { prixUSD: 5, prixCDF: 11500 };

      const finalUser = {
        ...foundUser,
        categorieId: fixedCatId,
        ownerWhatsapp: waClean,
        whatsapp: waClean,
        categorieTitre: catObj?.titre || fixedCatId,
        prixUSD: prix.prixUSD,
        prixCDF: prix.prixCDF,
      };

      // Sauve session active
      localStorage.setItem("wenze_user", JSON.stringify(finalUser));
      
      // Met à jour aussi dans all_users avec categorie fixée
      if(allRaw){
        const all = JSON.parse(allRaw);
        const idx = all.findIndex((u:any)=> cleanWa(u.ownerWhatsapp || u.whatsapp) === waClean);
        if(idx >= 0){
          all[idx] = finalUser;
          localStorage.setItem("wenze_all_users", JSON.stringify(all));
        }
      }

      setLoading(false);
      // ✅ Redirection vers profil avec next param si présent
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/profil";
      router.push(next);
      
    } catch(e){
      setError("Erreur lecture compte - vide cache et réessaie.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-5 pb-24">
      <Link href="/" className="text-[#6C3CE0] font-bold text-xs">← Accueil</Link>
      
      <div className="mt-4">
        <h1 className="text-2xl font-black">Connexion WENZE 2.0</h1>
        <p className="text-[11px] text-gray-500 mt-1">🛍️ Commerces & Services 5$ / 11 500 CDF • 🏭 Gros & Autres 10$ / 23 000 CDF • Taux fixe {TAUX_CDF} CDF • 0% commission</p>
      </div>

      <div className="mt-6 bg-black text-white rounded-2xl p-4 flex justify-between items-center">
        <div>
          <p className="font-black text-[12px]">WENZE 2.0 - 2 catégories</p>
          <p className="text-[10px] opacity-70">Électricité, maçon, soudeur, coiffure = 5$ même régime</p>
        </div>
        <span className="bg-white text-black text-[9px] px-2 py-1 rounded-full font-black">Taux {TAUX_CDF}</span>
      </div>

      <div className="mt-6 bg-white border-2 rounded-2xl p-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] p-3 rounded-xl font-bold">{error}</div>
        )}

        <div>
          <label className="text-[11px] font-black">WhatsApp (+243)</label>
          <input value={whatsapp} onChange={e=> setWhatsapp(e.target.value)} placeholder="+243810..." className="mt-1 w-full border-2 p-3 rounded-xl text-sm outline-none focus:border-[#6C3CE0] focus:ring-2 focus:ring-[#6C3CE0]/20" />
          <p className="text-[9px] text-gray-400 mt-1">On nettoie auto: +243, 0, espaces → 243...</p>
        </div>

        <div>
          <label className="text-[11px] font-black">Mot de passe</label>
          <input type="password" value={password} onChange={e=> setPassword(e.target.value)} placeholder="••••••••" className="mt-1 w-full border-2 p-3 rounded-xl text-sm outline-none focus:border-[#6C3CE0]" onKeyDown={e=> e.key==="Enter" && handleLogin()} />
        </div>

        <button onClick={handleLogin} disabled={loading} className="w-full bg-[#6C3CE0] text-white font-black py-3.5 rounded-full text-[13px] disabled:opacity-50 active:scale-[0.98] transition">
          {loading ? "Connexion..." : "Se connecter →"}
        </button>

        <div className="text-center space-y-2 pt-2">
          <p className="text-[11px] text-gray-500">Pas de compte? WENZE 2.0 - 2 prix seulement</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/inscription?type=client" className="bg-black text-white p-3 rounded-xl text-center text-[11px] font-bold">Client 0$</Link>
            <Link href="/inscription" className="bg-[#6C3CE0] text-white p-3 rounded-xl text-center text-[11px] font-bold">🛍️ Boutique 5$</Link>
          </div>
          <Link href="/confidentialite" className="block text-[10px] text-gray-400 mt-3">Politique confidentialité • Taux {TAUX_CDF}</Link>
        </div>
      </div>

      <div className="mt-6 bg-white border rounded-2xl p-4">
        <p className="font-black text-[11px]">Comment ça marche - WENZE 2.0</p>
        <ul className="text-[11px] text-gray-600 mt-2 space-y-1 list-disc ml-4">
          <li>Connexion cherche dans <b>wenze_all_users</b> (multi-comptes) + fallback wenze_user</li>
          <li>Numéro nettoyé: +243810 → 243810 (compatible tous formats)</li>
          <li>Anciens comptes <b>technique/commerce</b> auto convertis → 🛍️ 5$ ou 🏭 10$</li>
          <li>Après login, boutique visible dans /boutiques avec badge prix</li>
        </ul>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
