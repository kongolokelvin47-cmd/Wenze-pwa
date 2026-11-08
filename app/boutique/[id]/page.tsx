"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { lireComptes, lireSession, cle9, niveauDe } from "@/lib/comptes";
import { exigerCompte } from "@/lib/acces";
import { isCompteCache, toCDFString } from "@/lib/paiement"; // ✅ TAUX 2300 depuis lib/paiement
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

  const [etat, setEtat] = useState<"chargement" | "introuvable" | "masquee" | "non-recommandee" | "ok">("chargement");
  const [boutique, setBoutique] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [proprietaire, setProprietaire] = useState(false);
  const [moi, setMoi] = useState<any>(null);

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
    setMoi(session);
    const estMoi = !!session && cle9(session.ownerWhatsapp || session.whatsapp) === cle;
    setProprietaire(estMoi);
    const base = compte || { ownerWhatsapp: liste[0].ownerWhatsapp || liste[0].whatsapp, nomEtablissement: liste[0].ownerName };
    setBoutique(base);
    setAnnonces(liste);

    // CORRIGÉ : Compte caché ?
    let masquee = false;
    try {
      masquee = !!compte && isCompteCache(compte);
    } catch {}
    if (masquee && !estMoi) {
      setEtat("masquee");
      return;
    }

    // CORRIGÉ : CLIENT ne peut pas ouvrir une boutique NON recommandée, même avec le lien direct
    const monRole = session?.role || "client";
    const jeSuisDG = session?.roleAdmin === "dg" || session?.role === "dg";
    const voirTout = monRole !== "client" || jeSuisDG || estMoi;
    const aAuMoinsUnRecommande = liste.some((a: any) => a.recommandeParDG === true);
    if (!voirTout && !aAuMoinsUnRecommande) {
      setEtat("non-recommandee");
      return;
    }

    setEtat("ok");
  }, [id]);

  const contacter = () => {
    if (!exigerCompte(router, "/boutique/" + encodeURIComponent(id))) return;
    const lien = waLink(boutique && (boutique.ownerWhatsapp || boutique.whatsapp), "Bonjour, je vous contacte depuis " + APP_NAME + ".");
    if (lien) window.open(lien, "_blank", "noopener");
  };

  // CORRIGÉ : DG peut recommander toute la boutique d'un coup
  const toggleRecommandeBoutique = () => {
    if (!moi || (moi.roleAdmin !== "dg" && moi.role !== "dg")) return;
    const cle = cle9(id);
    const list = lireAnnonces().map((a: any) => {
      if (cle9(a.ownerWhatsapp || a.whatsapp || a.userId) !== cle) return a;
      return { ...a, recommandeParDG: !a.recommandeParDG };
    });
    localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
    window.location.reload();
  };

  if (etat === "chargement") {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-28 bg-white border rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  // CORRIGÉ : 3 états bloqués : introuvable / masquee / non-recommandee
  if (etat === "introuvable" || etat === "masquee" || etat === "non-recommandee") {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 text-center pt-16">
        <p className="text-5xl">{etat === "masquee" ? "🔒" : etat === "non-recommandee" ? "⭐" : "🔎"}</p>
        <h1 className="font-black text-[16px] mt-4">
          {etat === "masquee" ? "Boutique indisponible" : etat === "non-recommandee" ? "Boutique pas encore vérifiée" : "Boutique introuvable"}
        </h1>
        <p className="text-[12px] text-gray-600 mt-2">
          {etat === "masquee"
            ? "Cette boutique n'est pas visible pour le moment."
            : etat === "non-recommandee"
            ? "Cette boutique n'a pas encore été recommandée par Wenze. Pour ta sécurité, tu ne vois que les boutiques vérifiées."
            : "Ce lien ne correspond à aucune boutique."}
        </p>
        <Link href="/boutiques" className="mt-6 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[12px]">Voir les boutiques vérifiées</Link>
        <Link href="/recommandes" className="mt-2 inline-block bg-white border-2 border-black px-6 py-3 rounded-full font-black text-[12px]">Voir les recommandés</Link>
      </div>
    );
  }

  const nom = boutique.nomEtablissement || boutique.nomBoutique || boutique.nom || "Boutique";
  const niveau = niveauDe(boutique);
  const depuis = boutique.createdAt ? new Date(boutique.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";

  // CORRIGÉ : qui peut voir le prix gros sur cette boutique ?
  const monRole = moi?.role || "client";
  const jeSuisDG = moi?.roleAdmin === "dg" || moi?.role === "dg";
  const peutVoirGros = monRole === "grossiste" || jeSuisDG || proprietaire;
  const estRecommandee = annonces.some((a: any) => a.recommandeParDG === true);
  const nbGros = annonces.filter((a: any) => a.typeAnnonce === "gros").length;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href="/boutiques" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <h1 className="flex-1 font-black text-[15px] truncate">{nom}</h1>
        {jeSuisDG ? <button onClick={toggleRecommandeBoutique} className={"text-[10px] px-3 py-1.5 rounded-full font-black " + (estRecommandee ? "bg-yellow-400 text-black" : "bg-white border")}>{estRecommandee ? "★ Recommandée" : "☆ Recommander"}</button> : null}
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
                {estRecommandee ? <span className="text-[9px] font-black bg-yellow-400 px-2 py-0.5 rounded-full">⭐ RECOMMANDÉ</span> : null}
                {nbGros > 0 ? <span className="text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full">🏭 GROS ({nbGros})</span> : null}
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
              const estGros = a.typeAnnonce === "gros";
              return (
                <Link key={a.id} href={"/produit/" + a.id} className="bg-white border rounded-2xl overflow-hidden block">
                  <div className="h-32 bg-[#FFFBF0] flex items-center justify-center overflow-hidden relative">
                    {a.photo ? <img src={a.photo} alt={a.titre} className="max-w-full max-h-full object-contain" /> : <span className="text-3xl">📦</span>}
                    {estGros ? <span className="absolute bottom-2 left-2 text-[8px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black">🏭 GROS</span> : null}
                    {a.recommandeParDG ? <span className="absolute top-2 left-2 text-[8px] bg-yellow-400 px-2 py-0.5 rounded-full font-black">⭐</span> : null}
                  </div>
                  <div className="p-2.5">
                    <p className="font-bold text-[12px] line-clamp-2">{a.titre}</p>
                    <p className="font-black text-[12px] mt-1">{fmtUSD(prix)}$ / {toCDFString(prix)}</p>
                    {/* CORRIGÉ : prix gros caché au Client, visible au Grossiste / DG / propriétaire */}
                    {estGros ? (
                      peutVoirGros ? (
                        <p className="text-[10px] font-bold text-orange-600 mt-0.5">🏭 Gros : {a.prixGros ? fmtUSD(a.prixGros) + " FC" : ""} / {a.uniteGros || "carton"}</p>
                      ) : (
                        <p className="text-[10px] text-orange-600 mt-0.5">🔒 Prix gros : Grossiste</p>
                      )
                    ) : null}
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
