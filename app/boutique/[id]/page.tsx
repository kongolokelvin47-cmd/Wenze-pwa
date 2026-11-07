"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { lireComptes, lireSession, cle9, niveauDe } from "@/lib/comptes";
import { exigerCompte } from "@/lib/acces";
import { isCompteCache, toCDFString } from "@/lib/paiement";
import { waLink, fmtUSD, APP_NAME } from "../../HomeParts";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { client: "Client", vendeur: "Vendeur", prestataire: "Prestataire", grossiste: "Grossiste" };

function lireAnnonces(): any[] {
  try {
    const v = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function temps(a: any): number {
  return new Date(a.createdAt || a.created_at || 0).getTime() || 0;
}

export default function BoutiquePage() {
  const router = useRouter();
  const params = useParams();
  const id = params && (params as any).id ? decodeURIComponent(String((params as any).id)) : "";

  const [etat, setEtat] = useState<"chargement" | "introuvable" | "masquee" | "ok">("chargement");
  const [boutique, setBoutique] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [proprietaire, setProprietaire] = useState(false);

  useEffect(() => {
    const cle = cle9(id);
    const compte = lireComptes().find((u: any) => String(u.id) === id || (cle && cle9(u.ownerWhatsapp || u.whatsapp) === cle)) || null;
    const liste = lireAnnonces()
      .filter((a: any) => cle && cle9(a.ownerWhatsapp || a.whatsapp || a.userId) === cle)
      .sort((a: any, b: any) => temps(b) - temps(a));

    if (!compte && liste.length === 0) {
      setEtat("introuvable");
      return;
    }
    const session = lireSession();
    const moi = !!session && cle9(session.ownerWhatsapp || session.whatsapp) === cle;
    setProprietaire(moi);
    const base = compte || { ownerWhatsapp: liste[0].ownerWhatsapp || liste[0].whatsapp, nomEtablissement: liste[0].ownerName };
    setBoutique(base);
    setAnnonces(liste);

    let masquee = false;
    try {
      masquee = !!compte && isCompteCache(compte);
    } catch {}
    setEtat(masquee && !moi ? "masquee" : "ok");
  }, [id]);

  const contacter = () => {
    if (!exigerCompte(router, "/boutique/" + encodeURIComponent(id))) return;
    const lien = waLink(boutique && (boutique.ownerWhatsapp || boutique.whatsapp), "Bonjour, je vous contacte depuis " + APP_NAME + ".");
    if (lien) window.open(lien, "_blank", "noopener");
  };

  if (etat === "chargement") {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-28 bg-white border rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  if (etat === "introuvable" || etat === "masquee") {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-center pt-16">
        <p className="text-5xl">{etat === "masquee" ? "🔒" : "🔎"}</p>
        <h1 className="font-black text-[16px] mt-4">{etat === "masquee" ? "Boutique indisponible" : "Boutique introuvable"}</h1>
        <p className="text-[12px] text-gray-600 mt-2">
          {etat === "masquee" ? "Cette boutique n'est pas visible pour le moment." : "Ce lien ne correspond à aucune boutique."}
        </p>
        <Link href="/boutiques" className="mt-6 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]">Voir les boutiques</Link>
      </div>
    );
  }

  const nom = boutique.nomEtablissement || boutique.nomBoutique || boutique.nom || "Boutique";
  const niveau = niveauDe(boutique);
  const depuis = boutique.createdAt ? new Date(boutique.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href="/boutiques" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <h1 className="flex-1 font-black text-[15px] truncate">{nom}</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white border-2 border-black rounded-[24px] p-5">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 bg-black text-white rounded-[18px] flex items-center justify-center font-black text-[24px] overflow-hidden shrink-0">
              {boutique.photo ? <img src={boutique.photo} alt="" className="w-full h-full object-cover" /> : nom.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-[17px] leading-tight truncate">{nom}</h2>
              <p className="text-[11px] text-gray-500">{boutique.commune || "Kinshasa"}{depuis ? " • depuis " + depuis : ""}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {boutique.role ? <span className="text-[9px] font-black bg-[#FFFBF0] border px-2 py-0.5 rounded-full">{TYPES[boutique.role] || "Vendeur"}</span> : null}
                {niveau.niveau >= 2 ? <span className="text-[9px] font-black bg-green-100 text-green-800 px-2 py-0.5 rounded-full">✔ {niveau.titre}</span> : null}
              </div>
            </div>
          </div>
          {proprietaire ? (
            <Link href="/profil" className="mt-4 block text-center bg-white border-2 border-black rounded-full py-3 font-black text-[12px]">Gérer ma boutique</Link>
          ) : (
            <button type="button" onClick={contacter} className="mt-4 w-full bg-[#25D366] text-white rounded-full py-3.5 font-black text-[13px]">
              Contacter sur WhatsApp
            </button>
          )}
        </div>

        <p className="font-black text-[13px]">{annonces.length} annonce{annonces.length > 1 ? "s" : ""}</p>

        {annonces.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-dashed rounded-2xl">
            <p className="text-4xl">📦</p>
            <p className="text-[13px] font-black mt-3">Aucune annonce pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {annonces.map((a: any) => {
              const prix = Number(a.prixUSD || a.prix || 0);
              return (
                <Link key={a.id} href={"/produit/" + a.id} className="bg-white border rounded-2xl overflow-hidden block">
                  <div className="h-32 bg-[#FFFBF0] flex items-center justify-center overflow-hidden">
                    {a.photo ? <img src={a.photo} alt={a.titre} className="max-w-full max-h-full object-contain" /> : <span className="text-3xl">📦</span>}
                  </div>
                  <div className="p-2.5">
                    <p className="font-bold text-[12px] line-clamp-2">{a.titre}</p>
                    <p className="font-black text-[12px] mt-1">{fmtUSD(prix)}$ / {toCDFString(prix)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
  }
    
