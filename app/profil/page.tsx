"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lireSession, majCompte, deconnecter, cle9, niveauDe } from "@/lib/comptes";
import { compresserImage } from "@/lib/images";
import { toCDFString, verifierAbonnement, libererPlace, MAX_ANNONCES_ACTIVES } from "@/lib/paiement";
import { EditForm, CartesEtat, InvitationsCard } from "./profil-parts";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { client: "Client", vendeur: "Vendeur", prestataire: "Prestataire", grossiste: "Grossiste" };
const BADGE_ROLE: Record<string, string> = {
  client: "👤 CLIENT",
  vendeur: "🛍️ BOUTIQUE",
  grossiste: "🏭 GROSSISTE",
  prestataire: "🔧 PRESTATAIRE",
};

function lireListe(cle: string): any[] {
  try {
    const v = JSON.parse(localStorage.getItem(cle) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
function formaterWa(wa: any): string {
  const d = (wa || "").toString().replace(/[^0-9]/g, "");
  return d.length === 12 ? "+243 " + d.slice(3, 5) + " " + d.slice(5, 8) + " " + d.slice(8) : d ? "+" + d : "";
}
function temps(a: any): number {
  return new Date(a.createdAt || a.created_at || a.updatedAt || 0).getTime() || 0;
}

export default function ProfilPage() {
  const router = useRouter();
  const fichier = useRef<HTMLInputElement>(null);
  const [compte, setCompte] = useState<any>(null);
  const [ab, setAb] = useState<any>(null);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [demandes, setDemandes] = useState<any[]>([]);
  // CORRIGÉ : services du prestataire
  const [mesServices, setMesServices] = useState<any[]>([]);
  const [edition, setEdition] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const s = lireSession();
    if (!s) { router.replace("/connexion?raison=action&next=%2Fprofil"); return; }
    setCompte(s);
    try { setAb(verifierAbonnement()); } catch {}
    const k = cle9(s.ownerWhatsapp || s.whatsapp);
    setAnnonces(
      lireListe("wenze_annonces_list")
        .filter((a: any) => cle9(a.ownerWhatsapp || a.whatsapp || a.userId) === k)
        .sort((a: any, b: any) => temps(b) - temps(a))
    );
    setDemandes(
      lireListe("wenze_demandes_list")
        .filter((d: any) => cle9(d.prestataireWa || d.prestataireWhatsapp) === k)
        .sort((a: any, b: any) => temps(b) - temps(a))
    );
    // CORRIGÉ : on charge aussi les services du prestataire
    setMesServices(
      lireListe("wenze_services_list")
        .filter((sv: any) => cle9(sv.ownerWhatsapp || sv.whatsapp || sv.userId) === k)
        .sort((a: any, b: any) => temps(b) - temps(a))
    );
  }, [router]);

  const afficher = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const changerPhoto = async (e: any) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = await compresserImage(f, 400);
      const r = majCompte({ photo: data, avatar: data });
      if (r.ok) { setCompte(r.compte); afficher("Photo mise à jour"); } else { afficher(r.erreur || "Photo non enregistrée"); }
    } catch (err: any) { afficher(err && err.message ? err.message : "Photo illisible"); }
  };

  const supprimer = (id: string) => {
    if (!window.confirm("Supprimer cette annonce ? Sa place sera libérée.")) return;
    try {
      const reste = lireListe("wenze_annonces_list").filter((a: any) => String(a.id) !== String(id));
      localStorage.setItem("wenze_annonces_list", JSON.stringify(reste));
      try { libererPlace(id); } catch {}
      setAnnonces((prev: any[]) => prev.filter((a: any) => String(a.id) !== String(id)));
      try { setAb(verifierAbonnement()); } catch {}
      afficher("Annonce supprimée, place libérée");
    } catch { afficher("Suppression impossible"); }
  };

  // CORRIGÉ : supprimer un service prestataire
  const supprimerService = (id: string) => {
    if (!window.confirm("Supprimer ce service ?")) return;
    const reste = lireListe("wenze_services_list").filter((s: any) => String(s.id) !== String(id));
    localStorage.setItem("wenze_services_list", JSON.stringify(reste));
    setMesServices((prev: any[]) => prev.filter((s: any) => String(s.id) !== String(id)));
    afficher("Service supprimé");
  };

  const sortir = () => { deconnecter(); router.push("/connexion"); };

  if (!compte) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-28 bg-white border rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  const niveau = niveauDe(compte);
  const nomAffiche = compte.nomEtablissement || compte.nom || "Mon compte";
  const depuis = compte.createdAt ? new Date(compte.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";
  const photo = compte.photo || compte.avatar || "";
  const libres = ab && ab.placesRestantes !== undefined ? ab.placesRestantes : null;

  const role = compte.role || "client";
  const estClient = role === "client";
  const estVendeur = role === "vendeur";
  const estGrossiste = role === "grossiste";
  const estPrestataire = role === "prestataire";
  const estVendeurOuGrossiste = estVendeur || estGrossiste;
  const estDG = compte.roleAdmin === "dg";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <h1 className="flex-1 font-black text-[16px]">Mon profil</h1>
        {estDG ? <span className="text-[10px] px-3 py-1 rounded-full font-bold bg-red-600 text-white">DG</span> : null}
        {ab && ab.badge ? <span className="text-[10px] px-3 py-1 rounded-full font-bold bg-black text-white">{ab.badge}</span> : null}
      </header>

      <div className="p-4 space-y-4">
        {toast ? <div role="status" className="bg-black text-white p-3 rounded-xl text-[11px] font-bold text-center">{toast}</div> : null}

        {/* ===== CARTE PROFIL ===== */}
        <div className="bg-white border-2 border-black rounded-[24px] p-5">
          <div className="flex gap-4 items-center">
            <div className="relative shrink-0">
              <div className="w-20 h-20 bg-black text-white rounded-[20px] flex items-center justify-center font-black text-[28px] overflow-hidden">
                {photo ? <img src={photo} alt="Ma photo" className="w-full h-full object-cover" /> : nomAffiche.slice(0, 1).toUpperCase()}
              </div>
              <button type="button" aria-label="Changer la photo" onClick={() => fichier.current && fichier.current.click()} className="absolute -bottom-2 -right-2 bg-white border-2 border-black w-8 h-8 rounded-full flex items-center justify-center text-[13px]">📷</button>
              <input ref={fichier} type="file" accept="image/*" className="hidden" onChange={changerPhoto} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-[18px] leading-tight truncate">{nomAffiche}</h2>
              <p className="text-[11px] text-gray-500 truncate">{formaterWa(compte.ownerWhatsapp || compte.whatsapp)}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={"text-[9px] font-black px-2 py-0.5 rounded-full border " + (estClient ? "bg-blue-50 text-blue-700" : estGrossiste ? "bg-orange-100 text-orange-800" : estPrestataire ? "bg-purple-100 text-purple-800" : "bg-[#FFFBF0]")}>
                  {BADGE_ROLE[role] || "Compte"}
                </span>
                <span className={"text-[9px] font-black px-2 py-0.5 rounded-full " + (niveau.niveau >= 2 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600")}>
                  {niveau.niveau >= 2 ? "✔ " : ""}{niveau.titre}
                </span>
                {compte.recommandeParDG ? <span className="text-[9px] font-black bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">⭐ RECOMMANDÉ</span> : null}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">{compte.commune || "Kinshasa"}{depuis ? " • membre depuis " + depuis : ""}</p>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {estClient ? (
              <>
                <Link href="/mes-commandes" className="bg-[#FFFBF0] rounded-xl py-2.5 block"><p className="font-black text-[16px]">🛒</p><p className="text-[9px] text-gray-500">Mes achats</p></Link>
                <Link href="/favoris" className="bg-[#FFFBF0] rounded-xl py-2.5 block"><p className="font-black text-[16px]">❤️</p><p className="text-[9px] text-gray-500">Favoris</p></Link>
                <Link href="/portefeuille" className="bg-[#FFFBF0] rounded-xl py-2.5 block"><p className="font-black text-[16px]">💼</p><p className="text-[9px] text-gray-500">Portefeuille</p></Link>
              </>
            ) : estPrestataire ? (
              <>
                <div className="bg-[#FFFBF0] rounded-xl py-2.5"><p className="font-black text-[16px]">{demandes.length}</p><p className="text-[9px] text-gray-500">Demandes</p></div>
                <div className="bg-[#FFFBF0] rounded-xl py-2.5"><p className="font-black text-[16px]">{mesServices.length}</p><p className="text-[9px] text-gray-500">Services</p></div>
                <Link href="/portefeuille" className="bg-[#FFFBF0] rounded-xl py-2.5 block"><p className="font-black text-[16px]">💼</p><p className="text-[9px] text-gray-500">Portefeuille</p></Link>
              </>
            ) : (
              <>
                <div className="bg-[#FFFBF0] rounded-xl py-2.5"><p className="font-black text-[16px]">{annonces.length}</p><p className="text-[9px] text-gray-500">{estGrossiste ? "Produits gros" : "Annonces"} / {MAX_ANNONCES_ACTIVES}</p></div>
                <div className="bg-[#FFFBF0] rounded-xl py-2.5"><p className="font-black text-[16px]">{libres !== null ? libres : "–"}</p><p className="text-[9px] text-gray-500">Places libres</p></div>
                <Link href="/portefeuille" className="bg-[#FFFBF0] rounded-xl py-2.5 block"><p className="font-black text-[16px]">💼</p><p className="text-[9px] text-gray-500">Portefeuille</p></Link>
              </>
            )}
          </div>

          {/* CORRIGÉ : Vendeur a maintenant son bouton */}
          {estClient ? (
            <Link href="/ouvrir-boutique" className="mt-4 block w-full bg-black text-white rounded-full py-2.5 text-[12px] font-black text-center">🛍️ Ouvrir ma boutique</Link>
          ) : estPrestataire ? (
            <Link href="/publier-service" className="mt-4 block w-full bg-black text-white rounded-full py-2.5 text-[12px] font-black text-center">+ Ajouter un service</Link>
          ) : estGrossiste ? (
            <Link href="/publier?gros=1" className="mt-4 block w-full bg-black text-white rounded-full py-2.5 text-[12px] font-black text-center">+ Publier un produit gros</Link>
          ) : estVendeur ? (
            <Link href="/publier" className="mt-4 block w-full bg-black text-white rounded-full py-2.5 text-[12px] font-black text-center">+ Publier une annonce</Link>
          ) : null}

          <button type="button" onClick={() => setEdition(!edition)} className="mt-2 w-full bg-white border-2 border-black rounded-full py-2.5 text-[12px] font-black">
            {edition ? "Fermer" : "Modifier mes informations"}
          </button>
          {edition ? <EditForm compte={compte} onCancel={() => setEdition(false)} onSaved={(c: any) => { setCompte(c); setEdition(false); afficher("Profil enregistré"); }} /> : null}
        </div>

        {/* ===== DG : ACCÈS RAPIDE ===== */}
        {estDG ? (
          <div className="bg-black text-white rounded-2xl p-4">
            <p className="font-black text-[13px]">👑 Espace DG</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link href="/admin" className="bg-white text-black py-2.5 rounded-full text-[11px] font-black text-center">Admin</Link>
              <Link href="/" className="bg-yellow-400 text-black py-2.5 rounded-full text-[11px] font-black text-center">★ Recommander</Link>
            </div>
          </div>
        ) : null}

        {estGrossiste ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="font-black text-[13px]">🏭 Mon espace Grossiste</p>
            <p className="text-[11px] text-gray-600 mt-1">Minimum de commande : <b>{compte.minimumCommande || 10} pièces</b></p>
            <p className="text-[11px] text-gray-600">Unité : <b>{compte.uniteGros || "Carton"}</b></p>
            <p className="text-[11px] text-gray-600">Prix gros : visible seulement par les Grossistes + DG</p>
            <Link href="/profil/gros" className="block text-center bg-orange-500 text-white py-2.5 rounded-full text-[11px] font-black mt-3">Gérer mes prix gros</Link>
          </div>
        ) : null}

        {/* CORRIGÉ : PRESTATAIRE - prix à discuter */}
        {estPrestataire ? (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <p className="font-black text-[13px]">🔧 Mon service</p>
            <p className="text-[11px] text-gray-600 mt-1">Service : <b>{compte.activiteId || mesServices[0]?.activite || "—"}</b></p>
            <p className="text-[11px] text-gray-600">Zone : <b>{compte.zone || compte.commune || "—"}</b></p>
            <p className="text-[11px] text-gray-600">À partir de : <b>{mesServices[0]?.prixADiscuter || !mesServices[0]?.prixPrestation ? "💬 Prix à discuter" : mesServices[0]?.prixPrestation + " FC"}</b></p>
          </div>
        ) : null}

        {estClient ? (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="font-black text-[13px]">👀 Recommandé pour toi à {compte.commune || "Kinshasa"}</p>
            <p className="text-[11px] text-gray-600 mt-1">Tu vois seulement les boutiques vérifiées et recommandées par Wenze. Pour voir tout, ouvre ta boutique.</p>
            <Link href="/recommandes" className="block text-center bg-blue-600 text-white py-2.5 rounded-full text-[11px] font-black mt-3">Voir les recommandations</Link>
          </div>
        ) : null}

        {/* CORRIGÉ : CartesEtat seulement pour Vendeur / Grossiste (pas pour Client / Prestataire qui n'ont pas de ticket) */}
        {estVendeurOuGrossiste ? <CartesEtat compte={compte} ab={ab} /> : null}
        <InvitationsCard compte={compte} onToast={afficher} />

        {estVendeurOuGrossiste ? (
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b">
              <p className="font-black text-[13px]">{estGrossiste ? "Mes produits gros" : "Mes annonces"} ({annonces.length})</p>
              <Link href={estGrossiste ? "/publier?gros=1" : "/publier"} className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black">+ Publier</Link>
            </div>
            {annonces.length === 0 ? (
              <div className="p-8 text-center"><p className="text-3xl">📦</p><p className="text-[12px] mt-2 font-bold">Aucune annonce pour le moment</p><p className="text-[10px] text-gray-500 mt-1">Publiez votre premier produit en quelques secondes.</p></div>
            ) : (
              <div className="divide-y">
                {annonces.map((a: any) => (
                  <div key={a.id} className="p-3 flex gap-3 items-center">
                    <div className="w-14 h-14 bg-[#FFFBF0] rounded-xl overflow-hidden flex items-center justify-center shrink-0 border">{a.photo ? <img src={a.photo} alt="" className="w-full h-full object-cover" /> : <span>📦</span>}</div>
                    <Link href={"/produit/" + a.id} className="flex-1 min-w-0">
                      <p className="font-bold text-[12px] truncate">{a.titre}</p>
                      <p className="text-[10px] text-gray-500">{a.prixUSD || a.prix}$ / {toCDFString(Number(a.prixUSD || a.prix || 0))}</p>
                      {a.typeAnnonce === "gros" ? <p className="text-[9px] font-black text-orange-600">🏭 GROS</p> : null}
                      {a.recommandeParDG ? <p className="text-[9px] font-black text-yellow-600">⭐ RECOMMANDÉ</p> : <p className="text-[9px] text-gray-400">☆ Non recommandé - invisible pour les Clients</p>}
                      {estGrossiste && a.prixGros ? <p className="text-[10px] font-bold text-orange-600">Gros : {a.prixGros} FC / {a.uniteGros || "carton"}</p> : null}
                    </Link>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Link href={"/publier?edit=" + a.id} className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold text-center">Modifier</Link>
                      <button type="button" onClick={() => supprimer(a.id)} className="bg-red-50 border border-red-200 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold">Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* CORRIGÉ : MES SERVICES - Prestataire peut voir / modifier / supprimer */}
                {estPrestataire ? (
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b">
              <p className="font-black text-[13px]">Mes demandes ({demandes.length})</p>
              <Link href="/publier-service" className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black">+ Service</Link>
            </div>
            {demandes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl">📩</p>
                <p className="text-[12px] mt-2 font-bold">Aucune demande pour le moment</p>
                <p className="text-[10px] text-gray-500 mt-1">Quand un Client te demandera, ça apparaîtra ici.</p>
              </div>
            ) : (
              <div className="divide-y">
                {demandes.map((d: any) => (
                  <div key={d.id} className="p-3 flex gap-3 items-center">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[12px] truncate">{d.titre || d.service || "Demande"}</p>
                      <p className="text-[10px] text-gray-500">{d.commune || d.zone || ""} • {d.nomClient || d.client || ""}</p>
                    </div>
                    <Link href={"/profil"} className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold text-center">Voir</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <button type="button" onClick={sortir} className="w-full bg-gray-100 rounded-full py-3 text-[12px] font-bold">Se déconnecter</button>
      </div>
    </div>
  );
}
