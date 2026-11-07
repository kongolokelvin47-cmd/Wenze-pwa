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

function lireListe(cle: string): any[] {
  try {
    const v = JSON.parse(localStorage.getItem(cle) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
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
  const [edition, setEdition] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const s = lireSession();
    if (!s) {
      router.replace("/connexion?raison=action&next=%2Fprofil");
      return;
    }
    setCompte(s);
    try {
      setAb(verifierAbonnement());
    } catch {}
    const k = cle9(s.ownerWhatsapp || s.whatsapp);
    setAnnonces(
      lireListe("wenze_annonces_list")
        .filter((a: any) => cle9(a.ownerWhatsapp || a.whatsapp || a.userId) === k)
        .sort((a: any, b: any) => temps(b) - temps(a))
    );
  }, [router]);

  const afficher = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3000);
  };

  const changerPhoto = async (e: any) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = await compresserImage(f, 400);
      const r = majCompte({ photo: data, avatar: data });
      if (r.ok) {
        setCompte(r.compte);
        afficher("Photo mise à jour");
      } else {
        afficher(r.erreur || "Photo non enregistrée");
      }
    } catch (err: any) {
      afficher(err && err.message ? err.message : "Photo illisible");
    }
  };

  const supprimer = (id: string) => {
    if (!window.confirm("Supprimer cette annonce ? Sa place sera libérée.")) return;
    try {
      const reste = lireListe("wenze_annonces_list").filter((a: any) => String(a.id) !== String(id));
      localStorage.setItem("wenze_annonces_list", JSON.stringify(reste));
      try {
        libererPlace(id);
      } catch {}
      setAnnonces((prev: any[]) => prev.filter((a: any) => String(a.id) !== String(id)));
      try {
        setAb(verifierAbonnement());
      } catch {}
      afficher("Annonce supprimée, place libérée");
    } catch {
      afficher("Suppression impossible");
    }
  };

  const sortir = () => {
    deconnecter();
    router.push("/connexion");
  };

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

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href="/" className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <h1 className="flex-1 font-black text-[16px]">Mon profil</h1>
        {ab && ab.badge ? <span className="text-[10px] px-3 py-1 rounded-full font-bold bg-black text-white">{ab.badge}</span> : null}
      </header>

      <div className="p-4 space-y-4">
        {toast ? <div role="status" className="bg-black text-white p-3 rounded-xl text-[11px] font-bold text-center">{toast}</div> : null}

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
                <span className="text-[9px] font-black bg-[#FFFBF0] border px-2 py-0.5 rounded-full">{TYPES[compte.role] || "Compte"}</span>
                <span className={"text-[9px] font-black px-2 py-0.5 rounded-full " + (niveau.niveau >= 2 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600")}>
                  {niveau.niveau >= 2 ? "✔ " : ""}{niveau.titre}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">{compte.commune || "Kinshasa"}{depuis ? " • membre depuis " + depuis : ""}</p>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-[#FFFBF0] rounded-xl py-2.5">
              <p className="font-black text-[16px]">{annonces.length}</p>
              <p className="text-[9px] text-gray-500">Annonces / {MAX_ANNONCES_ACTIVES}</p>
            </div>
            <div className="bg-[#FFFBF0] rounded-xl py-2.5">
              <p className="font-black text-[16px]">{compte.estVendeur ? (libres !== null ? libres : "–") : "–"}</p>
              <p className="text-[9px] text-gray-500">Places libres</p>
            </div>
            <Link href="/portefeuille" className="bg-[#FFFBF0] rounded-xl py-2.5 block">
              <p className="font-black text-[16px]">💼</p>
              <p className="text-[9px] text-gray-500">Portefeuille</p>
            </Link>
          </div>

          <button type="button" onClick={() => setEdition(!edition)} className="mt-4 w-full bg-white border-2 border-black rounded-full py-2.5 text-[12px] font-black">
            {edition ? "Fermer" : "Modifier mes informations"}
          </button>
          {edition ? (
            <EditForm
              compte={compte}
              onCancel={() => setEdition(false)}
              onSaved={(c: any) => {
                setCompte(c);
                setEdition(false);
                afficher("Profil enregistré");
              }}
            />
          ) : null}
        </div>

        <CartesEtat compte={compte} ab={ab} />

        <InvitationsCard compte={compte} onToast={afficher} />

        {compte.estVendeur || annonces.length > 0 ? (
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b">
              <p className="font-black text-[13px]">Mes annonces ({annonces.length})</p>
              <Link href="/publier" className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black">+ Publier</Link>
            </div>
            {annonces.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl">📦</p>
                <p className="text-[12px] mt-2 font-bold">Aucune annonce pour le moment</p>
                <p className="text-[10px] text-gray-500 mt-1">Publiez votre premier produit en quelques secondes.</p>
              </div>
            ) : (
              <div className="divide-y">
                {annonces.map((a: any) => (
                  <div key={a.id} className="p-3 flex gap-3 items-center">
                    <div className="w-14 h-14 bg-[#FFFBF0] rounded-xl overflow-hidden flex items-center justify-center shrink-0 border">
                      {a.photo ? <img src={a.photo} alt="" className="w-full h-full object-cover" /> : <span>📦</span>}
                    </div>
                    <Link href={"/produit/" + a.id} className="flex-1 min-w-0">
                      <p className="font-bold text-[12px] truncate">{a.titre}</p>
                      <p className="text-[10px] text-gray-500">{a.prixUSD || a.prix}$ / {toCDFString(Number(a.prixUSD || a.prix || 0))}</p>
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

        <button type="button" onClick={sortir} className="w-full bg-gray-100 rounded-full py-3 text-[12px] font-bold">Se déconnecter</button>
      </div>
    </div>
  );
        }
                
