"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { lireSession, cle9 } from "@/lib/connexion";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  usd,
  toCDFString,
  verifierAbonnement,
  libererPlace,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

function estProprietaireStrict(ann: any, session: any): boolean {
  if (!session || !ann) return false;
  const roleSession = String(session?.role || "").toLowerCase();
  if (session?.roleAdmin === "dg" || roleSession === "dg" || session?.dgSessionActive) {
    return true;
  }
  const curWa = cle9(session?.ownerWhatsapp || session?.whatsapp || session?.telephone || "");
  const annWa = cle9(ann?.ownerWhatsapp || ann?.whatsapp || ann?.userId || "");
  if (curWa && annWa && curWa === annWa) return true;
  if (session?.id && ann?.userId && String(session.id) === String(ann.userId)) return true;
  if (session?.ownerId && ann?.ownerId && String(session.ownerId) === String(ann.ownerId)) return true;
  return false;
}

function estAnnonceExpireeFreemium(ann: any): boolean {
  if (!ann) return false;
  if (ann.isFreemium || ann.plan === "GRATUIT" || ann.palier === "GRATUIT") {
    const baseTime = new Date(ann.createdAt || ann.created_at || ann.updatedAt || 0).getTime();
    if (baseTime > 0) {
      const ageJours = (Date.now() - baseTime) / (1000 * 60 * 60 * 24);
      const maxJours = Number(ann.dureeJours || FREE_DAYS || 30);
      if (ageJours > maxJours) return true;
    }
  }
  return false;
}

function tracerModificationJournal(
  action: "ANNONCE_MODIFIEE" | "ANNONCE_SUPPRIMEE",
  annonceId: string,
  acteurWa: string,
  detail?: string
) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("wenze_journal");
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      annonceId,
      acteurWhatsapp: acteurWa,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export default function ModifierPage() {
  const params = useParams();
  const router = useRouter();
  const id = String((params?.id as string) || "");

  const [loading, setLoading] = useState(true);
  const [annonce, setAnnonce] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    titre: "",
    prix: "",
    description: "",
    categorieId: "commerces-services",
    activiteId: "",
  });
  const [saving, setSaving] = useState(false);
  const [abInfo, setAbInfo] = useState<any>(null);

  useEffect(() => {
    try {
      const session: any = lireSession();
      setUser(session);
      if (!session) {
        setError("Connexion requise pour modifier cette annonce.");
        setLoading(false);
        return;
      }

      let ab: any = null;
      try {
        ab = verifierAbonnement();
        setAbInfo(ab);
      } catch {}

      const rawList =
        typeof window !== "undefined"
          ? localStorage.getItem("wenze_annonces_list")
          : null;
      const list = rawList ? JSON.parse(rawList) : [];
      const arr = Array.isArray(list) ? list : [];
      const found = arr.find(
        (a: any) => String(a?.id || a?.annonceId || "") === id
      );

      if (!found) {
        setError(`Annonce #${id} introuvable.`);
        setLoading(false);
        return;
      }

      if (!estProprietaireStrict(found, session)) {
        setError(
          "Accès refusé : seul le propriétaire de l'annonce (ownerWhatsapp) peut la modifier ou la supprimer."
        );
        setLoading(false);
        return;
      }

      const expireFreemium = estAnnonceExpireeFreemium(found);
      if ((ab?.isCache || expireFreemium) && !session?.dgSessionActive) {
        setError(
          `Offre gratuite expirée (${FREE_DAYS} jours) : annonce masquée (is_visible = false). Renouvelez votre formule pour réactiver.`
        );
      }

      setAnnonce(found);
      setForm({
        titre: found.titre || found.title || "",
        prix: String(found.prixUSD ?? found.prix ?? found.price ?? ""),
        description: found.description || "",
        categorieId: normalizeCategorie(
          found.categorieId || found.categorie || "commerces-services"
        ),
        activiteId: found.activiteId || "",
      });
    } catch (e: any) {
      setError(e?.message || "Erreur lors du chargement de l'annonce.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleSave = async () => {
    if (!annonce || !user || saving) return;
    setError("");

    const titrePropre = form.titre.trim();
    if (!titrePropre || !form.prix) {
      setError("Le titre et le prix en USD sont obligatoires.");
      return;
    }

    const prixNum = Number(form.prix);
    if (isNaN(prixNum) || prixNum < 0) {
      setError("Veuillez saisir un prix valide en USD.");
      return;
    }

    setSaving(true);
    try {
      const rawList =
        typeof window !== "undefined"
          ? localStorage.getItem("wenze_annonces_list")
          : null;
      const list = rawList ? JSON.parse(rawList) : [];
      const arr = Array.isArray(list) ? list : [];
      const idx = arr.findIndex(
        (a: any) => String(a?.id || a?.annonceId || "") === id
      );
      if (idx === -1) throw new Error("Annonce introuvable.");
      if (!estProprietaireStrict(arr[idx], user)) {
        throw new Error("Accès refusé : propriétaire non vérifié.");
      }

      const expireFreemium = estAnnonceExpireeFreemium(arr[idx]);
      const imagesExistantes = Array.isArray(arr[idx].images)
        ? arr[idx].images.slice(0, MAX_FREE_IMAGES)
        : arr[idx].photo
        ? [arr[idx].photo]
        : [];

      arr[idx] = {
        ...arr[idx],
        titre: titrePropre,
        title: titrePropre,
        prix: prixNum,
        prixUSD: prixNum,
        description: form.description.trim(),
        categorieId: normalizeCategorie(form.categorieId),
        activiteId: form.activiteId,
        images: imagesExistantes,
        is_visible: expireFreemium ? false : arr[idx].is_visible !== false,
        updatedAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("wenze_annonces_list", JSON.stringify(arr));
      }

      tracerModificationJournal(
        "ANNONCE_MODIFIEE",
        String(id),
        cle9(user?.ownerWhatsapp || user?.whatsapp || ""),
        `${titrePropre} (${usd(prixNum)})`
      );

      router.push(`/produit/${encodeURIComponent(id)}?updated=1`);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!annonce || !user || saving) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Supprimer définitivement "${annonce?.titre || "cette annonce"}" ? Cela libère 1 place (max ${PLAFOND_ACTIVES} annonces actives).`
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const rawList =
        typeof window !== "undefined"
          ? localStorage.getItem("wenze_annonces_list")
          : null;
      const list = rawList ? JSON.parse(rawList) : [];
      const arr = Array.isArray(list) ? list : [];
      const idx = arr.findIndex(
        (a: any) => String(a?.id || a?.annonceId || "") === id
      );
      if (idx === -1) throw new Error("Annonce introuvable.");
      if (!estProprietaireStrict(arr[idx], user)) {
        throw new Error("Accès refusé : propriétaire non vérifié.");
      }

      arr.splice(idx, 1);
      if (typeof window !== "undefined") {
        localStorage.setItem("wenze_annonces_list", JSON.stringify(arr));
      }

      try {
        libererPlace(user);
      } catch {}

      tracerModificationJournal(
        "ANNONCE_SUPPRIMEE",
        String(id),
        cle9(user?.ownerWhatsapp || user?.whatsapp || ""),
        annonce?.titre || ""
      );

      router.push("/boutiques?deleted=1&liberation=1");
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la suppression.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-24 bg-white border rounded-2xl animate-pulse" />
        <p className="text-[11px] text-gray-400 mt-3">
          Chargement de l&apos;édition • Taux {TAUX_CDF} CDF/$ • 0 % commission
        </p>
      </div>
    );
  }

  const prixApercu = Number(form.prix) || 0;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            href={annonce ? `/produit/${encodeURIComponent(id)}` : "/boutiques"}
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[16px] truncate">
              Modifier l&apos;annonce
            </h1>
            <p className="text-[10px] text-gray-500 truncate">
              Réf. {id.slice(0, 10)} • 0 % commission • Taux {TAUX_CDF} CDF/$
            </p>
          </div>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
              abInfo?.isPaye
                ? "bg-emerald-100 text-emerald-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {abInfo?.palierId || "FREEMIUM"}
          </span>
        </div>

        <div className="mt-3 bg-black text-white rounded-xl p-2.5 text-[10px] leading-relaxed">
          <b>0 % commission</b> • Freemium : <b>{MAX_FREE_IMAGES} images max / {FREE_DAYS} jours</b> puis <b>is_visible = false</b> • Max <b>{PLAFOND_ACTIVES}</b> annonces actives.
        </div>
      </header>

      <div className="p-4">
        {error ? (
          <div
            role="alert"
            className="bg-red-50 border-2 border-red-200 text-red-700 text-[11px] font-bold p-3 rounded-xl mb-4"
          >
            {error}
          </div>
        ) : null}

        {!annonce ? (
          <div className="bg-white border-2 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl">🔒</p>
            <p className="font-black mt-2">{error || "Accès non autorisé"}</p>
            <Link
              href="/boutiques"
              className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-bold text-[12px]"
            >
              Retour aux boutiques
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border rounded-2xl p-4 flex gap-3">
              <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                {annonce.images?.[0] || annonce.photo ? (
                  <img
                    src={annonce.images?.[0] || annonce.photo}
                    alt={annonce.titre || "Annonce"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">
                    {(
                      getCategorieById(
                        normalizeCategorie(annonce.categorieId)
                      ) as any
                    )?.icon || "📦"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[12px] truncate">
                  {annonce.titre}
                </p>
                <p className="text-[11px] font-bold mt-0.5">
                  {usd(Number(annonce.prixUSD ?? annonce.prix ?? 0))} /{" "}
                  {toCDFString(Number(annonce.prixUSD ?? annonce.prix ?? 0))}
                </p>
                <p className="text-[9px] text-gray-400 mt-1">
                  Statut visibilité :{" "}
                  {estAnnonceExpireeFreemium(annonce) ||
                  annonce.is_visible === false
                    ? "is_visible = false"
                    : "is_visible = true"}
                </p>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold" htmlFor="mod-titre">
                  Titre *
                </label>
                <input
                  id="mod-titre"
                  value={form.titre}
                  onChange={(e) => setForm({ ...form, titre: e.target.value })}
                  placeholder="Ex. : Sac de riz 25 kg"
                  className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold" htmlFor="mod-prix">
                    Prix USD *
                  </label>
                  <input
                    id="mod-prix"
                    value={form.prix}
                    onChange={(e) => setForm({ ...form, prix: e.target.value })}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="25"
                    className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
                  />
                  <p className="text-[9px] text-gray-500 mt-1">
                    {usd(prixApercu)} / {toCDFString(prixApercu)}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold" htmlFor="mod-cat">
                    Catégorie
                  </label>
                  <select
                    id="mod-cat"
                    value={form.categorieId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        categorieId: e.target.value,
                        activiteId: "",
                      })
                    }
                    className="w-full mt-1 border rounded-xl px-3 py-3 text-sm bg-white"
                  >
                    {CATEGORIES_WENZE.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.titreCourt || c.titre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold" htmlFor="mod-act">
                  Activité (facultatif)
                </label>
                <select
                  id="mod-act"
                  value={form.activiteId}
                  onChange={(e) =>
                    setForm({ ...form, activiteId: e.target.value })
                  }
                  className="w-full mt-1 border rounded-xl px-3 py-3 text-sm bg-white"
                >
                  <option value="">-- Aucune --</option>
                  {CATEGORIES_WENZE.flatMap((c: any) =>
                    (c.activites || []).map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {c.icon} {a.titre}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold" htmlFor="mod-desc">
                  Description
                </label>
                <textarea
                  id="mod-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={4}
                  placeholder="Détails de l'article à Kinshasa..."
                  className="w-full mt-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-black text-white rounded-full py-3.5 text-sm font-black disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "💾 Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-6 bg-red-50 border border-red-200 text-red-700 rounded-full py-3.5 text-sm font-bold disabled:opacity-50"
                >
                  🗑️ Supprimer
                </button>
              </div>

              <p className="text-[9px] text-gray-400 text-center">
                Suppression = libération immédiate d&apos;une place • Max{" "}
                {PLAFOND_ACTIVES} annonces actives • 0 % commission
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
  
