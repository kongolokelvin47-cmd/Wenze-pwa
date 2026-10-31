"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCategorieById, normalizeCategorie } from "@/lib/categories";
import { FREEMIUM, TAUX_CDF, toCDF, toCDFString, verifierAbonnement, consommerPlace, libererPlace } from "@/lib/paiement";
import { MAX_ACTIVES, MAX_PHOTOS, cleanWa, getUser, readList } from "./helpers";
import { StatusBanners, TicketPicker, PhotoPicker } from "./Sections";
import ProductForm from "./ProductForm";

export const dynamic = "force-dynamic";

function PublierContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp.get("edit");
  const catFromUrl = normalizeCategorie(sp.get("cat") || "");
  const ticketFromUrl = sp.get("ticket") || "";

  const [user, setUser] = useState<any>(null);
  const [ab, setAb] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(ticketFromUrl);
  const [isEditMode, setIsEditMode] = useState(false);
  const [original, setOriginal] = useState<any>(null);
  const [form, setForm] = useState<any>({
    titre: "",
    description: "",
    prix: "",
    categorieId: "commerces-services",
    activiteId: "",
    commune: "",
    ville: "Kinshasa",
    stock: "1",
    livraison: "Retrait / Livraison Kinshasa"
  });

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/connexion?next=/publier");
      return;
    }
    const waU = cleanWa(u.ownerWhatsapp || u.whatsapp || u.id);

    try {
      const check: any = verifierAbonnement();
      setAb(check);
      const avecPlace = (check?.ticketsActifs || []).find((t: any) => t.imagesUsed < t.imagesMax);
      if (avecPlace) setSelectedTicketId((prev: string) => prev || avecPlace.ticketId);
    } catch {}

    let old: any = null;
    if (editId) {
      try {
        old = readList("wenze_annonces_list").find((x: any) => String(x.id) === String(editId)) || null;
        if (!old) {
          setToast({ msg: "Annonce introuvable", type: "error" });
          setLoading(false);
          setTimeout(() => router.push("/boutiques"), 1500);
          return;
        }
        const waA = cleanWa(old.ownerWhatsapp || old.whatsapp || old.userId);
        if (waU !== waA && u.id !== old.userId) {
          setToast({ msg: "⛔ Cette annonce ne vous appartient pas", type: "error" });
          setLoading(false);
          setTimeout(() => router.push("/"), 2000);
          return;
        }
        setForm({
          titre: old.titre || "",
          description: old.description || "",
          prix: String(old.prixUSD || old.prix || ""),
          categorieId: normalizeCategorie(old.categorieId || "commerces-services"),
          activiteId: old.activiteId || "",
          commune: old.commune || "",
          ville: old.ville || "Kinshasa",
          stock: String(old.stock || 1),
          livraison: old.livraison || "Retrait / Livraison Kinshasa"
        });
        setPhotos(old.images?.length ? old.images.slice(0, MAX_PHOTOS) : old.photo ? [old.photo] : []);
        setOriginal(old);
        if (old.ticketId) setSelectedTicketId(old.ticketId);
        setIsEditMode(true);
      } catch {}
    }

    const fixedCat = normalizeCategorie(catFromUrl || u.categorieId || "commerces-services");
    const catObj: any = getCategorieById(fixedCat);
    const firstAct = catObj?.activites?.[0]?.id || "";
    setUser({
      ownerWhatsapp: u.ownerWhatsapp || u.whatsapp || "",
      whatsapp: u.whatsapp || "",
      id: u.id || "",
      nom: u.nom || "",
      nomEtablissement: u.nomEtablissement || u.nom || "",
      commune: u.commune || "",
      categorieId: fixedCat,
      role: "boutique"
    });
    if (!old) {
      setForm((f: any) => ({ ...f, categorieId: fixedCat, activiteId: u.activiteId || firstAct, commune: u.commune || f.commune }));
    }
    setLoading(false);
  }, [router, editId, catFromUrl]);

  const currentCat: any = useMemo(() => getCategorieById(form.categorieId) || {}, [form.categorieId]);
  const activites: any[] = currentCat.activites || [];
  const prixNum = Number(form.prix || 0);
  const selectedTicket: any = useMemo(
    () => (ab?.ticketsActifs || []).find((t: any) => t.ticketId === selectedTicketId),
    [ab, selectedTicketId]
  );

  function notify(msg: string, type: string = "success") {
    setToast({ msg: msg, type: type });
    setTimeout(() => setToast(null), 4000);
  }

  function setField(key: string, value: string) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function handlePublish() {
    if (!ab) {
      notify("Vérification de l'abonnement en cours...", "error");
      return;
    }
    if (!isEditMode) {
      if (ab.isCache) {
        router.push("/abonnement?msg=cache");
        return;
      }
      if (!ab.peutPublier) {
        notify(
          ab.isFreemium
            ? "Limite gratuite atteinte (" + FREEMIUM.maxImages + ") - ticket 5$ (" + toCDFString(5) + ")"
            : "Plus de places libres : achetez un nouveau ticket",
          "error"
        );
        return;
      }
      if (ab.isPaye && !selectedTicketId) {
        notify("Choisissez le ticket sur lequel publier", "error");
        return;
      }
    }
    if (form.titre.trim().length < 3) {
      notify("Titre : 3 caractères minimum", "error");
      return;
    }
    if (!(prixNum > 0)) {
      notify("Prix en $ requis", "error");
      return;
    }
    if (!photos.length) {
      notify("Ajoutez au moins 1 photo", "error");
      return;
    }
    if (!user) {
      router.push("/connexion");
      return;
    }

    const wa = cleanWa(user.ownerWhatsapp || user.whatsapp);
    let list = readList("wenze_annonces_list");
    if (isEditMode) {
      list = list.filter((x: any) => String(x.id) !== String(editId));
    } else {
      const nb = list.filter((a: any) => cleanWa(a.ownerWhatsapp || a.whatsapp) === wa).length;
      if (nb >= MAX_ACTIVES) {
        notify("Maximum " + MAX_ACTIVES + " annonces actives : supprimez-en une pour en publier une nouvelle", "error");
        return;
      }
    }

    const id = isEditMode && editId ? editId : "WENZE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    let placeConsommee = false;
    setSaving(true);
    try {
      if (!isEditMode && selectedTicketId) {
        if (!consommerPlace(selectedTicketId, id)) {
          notify("Ticket plein ou expiré : choisissez un autre ticket", "error");
          setSaving(false);
          return;
        }
        placeConsommee = true;
      }

      const activiteObj: any = activites.find((x: any) => x.id === form.activiteId);
      const createdAtFinal = original?.createdAt || original?.created_at || new Date().toISOString();
      const catId = normalizeCategorie(form.categorieId);
      const ticketFields = isEditMode
        ? {}
        : {
            ticketId: selectedTicketId || null,
            palierId: selectedTicket?.palierId || ab.palierId || null,
            freemium: !!ab.isFreemium,
            expireAt: selectedTicket?.expireAt || ab.expireAt || null
          };

      const annonce = {
        ...(original || {}),
        id: id,
        titre: form.titre.trim(),
        description: form.description.trim(),
        prix: prixNum,
        prixUSD: prixNum,
        prixCDF: toCDF(prixNum),
        prixCDFString: toCDFString(prixNum),
        categorieId: catId,
        categorie: catId,
        activiteId: form.activiteId,
        activite: activiteObj?.label || activiteObj?.titre || form.activiteId,
        photo: photos[0],
        images: photos,
        ownerWhatsapp: wa,
        whatsapp: wa,
        ownerName: user.nomEtablissement || user.nom || "WENZE",
        userId: user.id || wa,
        commune: form.commune || user.commune || "Kinshasa",
        ville: form.ville || "Kinshasa",
        stock: Number(form.stock || 1),
        livraison: form.livraison,
        taux: TAUX_CDF,
        created_at: createdAtFinal,
        createdAt: createdAtFinal,
        statut: "actif",
        ...(isEditMode ? { updatedAt: new Date().toISOString() } : {}),
        ...ticketFields
      };

      list.unshift(annonce);
      localStorage.setItem("wenze_annonces_list", JSON.stringify(list.slice(0, 200)));

      let ticketLabel = "";
      if (!isEditMode) {
        ticketLabel = selectedTicket
          ? "🎫 " + selectedTicket.palierId + " " + (selectedTicket.imagesUsed + 1) + "/" + selectedTicket.imagesMax + " places"
          : "🆓 Gratuit " + ((ab.count || 0) + 1) + "/" + FREEMIUM.maxImages;
      }
      setShowSuccess({ titre: annonce.titre, prix: prixNum + "$ / " + toCDFString(prixNum), ticketLabel: ticketLabel });
      setSaving(false);
      setTimeout(() => router.push("/produit/" + id), 1800);
    } catch {
      if (placeConsommee) {
        try {
          libererPlace(id);
        } catch {}
      }
      notify("Stockage plein : réduisez les photos ou supprimez d'anciennes annonces", "error");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
        <div className="h-24 bg-white border rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  const isCache = !!ab?.isCache;
  const needsTicket = !isEditMode && !!ab?.isPaye;
  const blocked = !isEditMode && (!ab || isCache || !ab.peutPublier);
  const photosDisabled = blocked || (needsTicket && !selectedTicketId);
  const headerStatus = !ab
    ? "..."
    : isCache
    ? "🔒 Compte caché"
    : ab.isPaye
    ? (ab.ticketsActifs?.length || 0) + " ticket(s) - " + (ab.placesRestantes || 0) + " places libres"
    : "🆓 Gratuit " + ab.count + "/" + FREEMIUM.maxImages;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      {showSuccess ? (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-[360px] w-full p-6 text-center border-2 border-black shadow-2xl">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">✓</div>
            <h2 className="font-black text-[18px] mt-4">{isEditMode ? "Modification enregistrée !" : "Annonce publiée !"}</h2>
            <div className="bg-[#FFFBF0] border-2 rounded-2xl p-4 mt-4 text-left">
              <p className="font-black text-[13px]">{showSuccess.titre}</p>
              <p className="text-[12px] font-black text-orange-600 mt-1">{showSuccess.prix}</p>
              {showSuccess.ticketLabel ? (
                <p className="text-[10px] mt-2 bg-black text-white inline-block px-2.5 py-1 rounded-full">{showSuccess.ticketLabel}</p>
              ) : null}
            </div>
            <p className="text-[10px] text-gray-500 mt-3">Redirection vers l'annonce...</p>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 bg-white/95 backdrop-blur z-20 p-4 border-b flex items-center gap-3">
        <Link href={isEditMode ? "/produit/" + editId : "/"} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">←</Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[13px] truncate">{isEditMode ? "Modifier l'annonce" : "Publier une annonce"}</h1>
          <p className="text-[9px] text-gray-500 truncate">{headerStatus} - Taux {TAUX_CDF}</p>
        </div>
        <span className={"text-[10px] px-2.5 py-1 rounded-full font-black text-white " + (isCache ? "bg-red-600" : ab?.isPaye ? "bg-black" : "bg-orange-500")}>
          {ab?.badge || "..."}
        </span>
      </header>

      <div className="p-4 space-y-4">
        {toast ? (
          <div className={"p-3.5 rounded-xl text-[11px] font-bold border-2 " + (toast.type === "error" ? "bg-red-50 text-red-700 border-red-300" : "bg-green-50 text-green-800 border-green-300")}>
            {toast.msg}
          </div>
        ) : null}

        <StatusBanners ab={ab} isEditMode={isEditMode} />

        {needsTicket ? <TicketPicker tickets={ab?.ticketsActifs || []} selectedId={selectedTicketId} onSelect={setSelectedTicketId} /> : null}

        <PhotoPicker photos={photos} setPhotos={setPhotos} disabled={photosDisabled} notify={notify} />

        <ProductForm form={form} setField={setField} setForm={setForm} prixNum={prixNum} activites={activites} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t p-3">
        <div className="max-w-[430px] mx-auto">
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving || !!showSuccess || blocked}
            className="w-full bg-black text-white py-3.5 rounded-full font-black text-[13px] disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : isEditMode ? "Enregistrer les modifications" : "Publier l'annonce"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PublierPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6">
          <div className="h-24 bg-white border rounded-2xl animate-pulse"></div>
        </div>
      }
    >
      <PublierContent />
    </Suspense>
  );
    }
    
