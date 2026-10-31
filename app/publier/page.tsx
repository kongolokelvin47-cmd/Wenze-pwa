"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCategorieById, normalizeCategorie, CATEGORIES_WENZE } from "@/lib/categories";
import { FREEMIUM, PALIERS, TAUX_CDF, toCDF, toCDFString, verifierAbonnement, consommerPlace, libererPlace } from "@/lib/paiement";

export const dynamic = "force-dynamic";

const DAY_MS = 86400000;
const MAX_ACTIVES = 50;
const MAX_PHOTOS = 4;

function cleanWa(n: any): string {
  return (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
}

function getUser(): any {
  try {
    if (typeof window === "undefined") return null;
    const r = localStorage.getItem("wenze_user");
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

function readList(key: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

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
  const [form, setForm] = useState({
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

  function handlePhotos(e: any) {
    const files = Array.from(e.target.files || []) as File[];
    e.target.value = "";
    if (!files.length) return;
    const place = MAX_PHOTOS - photos.length;
    if (place <= 0) {
      notify("Maximum " + MAX_PHOTOS + " photos par annonce", "error");
      return;
    }
    files.slice(0, place).forEach((file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        notify("Photo trop lourde (5 Mo max)", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 800;
          let w = img.width;
          let h = img.height;
          if (w > h && w > max) {
            h = (h * max) / w;
            w = max;
          } else if (h >= w && h > max) {
            w = (w * max) / h;
            h = max;
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0, w, h);
          setPhotos((prev: string[]) => [...prev, canvas.toDataURL("image/jpeg", 0.65)].slice(0, MAX_PHOTOS));
        };
        img.onerror = () => notify("Fichier image illisible", "error");
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
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
  const placesTicket = selectedTicket ? selectedTicket.imagesMax - selectedTicket.imagesUsed : 0;
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
        <span className={"text-[10px] px-2.5 py-1 rounded-full font-black text-white " + (isCache ? "bg-red-600" : ab?.isPaye ? "bg-black" : "bg-orange-500")}>{ab?.badge || "..."}</span>
      </header>

      <div className="p-4 space-y-4">
        {toast ? (
          <div className={"p-3.5 rounded-xl text-[11px] font-bold border-2 " + (toast.type === "error" ? "bg-red-50 text-red-700 border-red-300" : "bg-green-50 text-green-800 border-green-300")}>
            {toast.msg}
          </div>
        ) : null}

        {!isEditMode && isCache ? (
          <div className="bg-red-600 text-white rounded-2xl p-4 border-2 border-black shadow">
            <p className="font-black text-[13px]">🔒 Compte caché : les 30 jours gratuits sont expirés</p>
            <p className="text-[11px] mt-1.5 opacity-90">Vos annonces ne sont plus visibles dans le marché. Achetez un ticket pour réapparaître immédiatement.</p>
            <Link href="/abonnement" className="mt-3 block w-full bg-white text-black text-center py-3 rounded-full font-black text-[12px]">
              🎫 Payer 5$ / {toCDFString(5)}
            </Link>
          </div>
        ) : null}

        {!isEditMode && !isCache && ab?.isFreemium && ab.imagesRestantes === 0 ? (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4">
            <p className="font-black text-[12px]">🆓 Limite gratuite atteinte ({FREEMIUM.maxImages}/{FREEMIUM.maxImages})</p>
            <p className="text-[10px] mt-1">Le ticket ⭐ STANDARD à 5$ ({toCDFString(5)}) donne 4 places sur 7 jours. Cumulable.</p>
            <Link href="/abonnement" className="mt-3 block w-full bg-black text-white text-center py-2.5 rounded-full font-black text-[11px]">
              Voir les tickets 5$ / 10$ / 20$
            </Link>
          </div>
        ) : null}

        {!isEditMode && !isCache && ab?.isPaye && !ab.peutPublier ? (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4">
            <p className="font-black text-[12px]">Plus de places libres</p>
            <p className="text-[10px] mt-1">Supprimez une annonce vendue pour libérer une place, ou achetez un nouveau ticket.</p>
            <Link href="/abonnement" className="mt-3 block w-full bg-black text-white text-center py-2.5 rounded-full font-black text-[11px]">
              Acheter un ticket
            </Link>
          </div>
        ) : null}

        {needsTicket && (ab.ticketsActifs || []).length > 0 ? (
          <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-sm">
            <p className="font-black text-[13px]">🎫 Choisissez le ticket</p>
            <p className="text-[9px] text-gray-600 mt-1">Chaque annonce utilise 1 place du ticket. Supprimer une annonce libère sa place.</p>
            <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto">
              {(ab.ticketsActifs || []).map((t: any) => {
                const selected = selectedTicketId === t.ticketId;
                const jours = Math.max(0, Math.ceil((new Date(t.expireAt).getTime() - Date.now()) / DAY_MS));
                const pct = t.imagesMax ? Math.min(100, (t.imagesUsed / t.imagesMax) * 100) : 0;
                return (
                  <button
                    key={t.ticketId}
                    type="button"
                    onClick={() => setSelectedTicketId(t.ticketId)}
                    className={"w-full border-2 rounded-xl p-3 text-left " + (selected ? "border-black bg-black text-white" : "border-gray-200 bg-white")}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-black text-[11px]">{(PALIERS as any)[t.palierId]?.badge || "🎫"} {t.palierId} - {t.imagesUsed}/{t.imagesMax} places</p>
                        <p className="text-[9px] opacity-80 mt-0.5">Expire le {new Date(t.expireAt).toLocaleDateString("fr-FR")} - {jours}j restants</p>
                      </div>
                      <p className={"font-black text-[11px] px-2.5 py-1 rounded-full " + (selected ? "bg-white text-black" : "bg-black text-white")}>{t.imagesMax - t.imagesUsed} libres</p>
                    </div>
                    <div className="mt-2 w-full bg-gray-300 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#25D366] h-full" style={{ width: pct + "%" }}></div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedTicket ? (
              <p className="text-[10px] mt-3 font-bold bg-[#FFFBF0] border rounded-xl p-2.5">
                ✅ Ticket {selectedTicket.palierId} : il reste {placesTicket} place(s)
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="bg-white border rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <p className="font-black text-[12px]">Photos ({MAX_PHOTOS} max)</p>
            <p className="text-[10px] bg-black text-white px-2.5 py-1 rounded-full font-bold">{photos.length} / {MAX_PHOTOS}</p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotos}
            disabled={photosDisabled}
            className="mt-3 w-full text-[11px] border border-dashed rounded-xl p-3 bg-gray-50 disabled:opacity-50"
          />
          {photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {photos.map((p: string, i: number) => (
                <div key={i} className="relative">
                  <img src={p} alt={"Photo " + (i + 1)} className="w-full h-28 object-cover rounded-xl border-2" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev: string[]) => prev.filter((_: any, idx: number) => idx !== i))}
                    className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-[12px] font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        
