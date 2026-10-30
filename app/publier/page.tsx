"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCategorieById, normalizeCategorie, getActiviteById, CATEGORIES_WENZE } from "@/lib/categories";
import { FREEMIUM, PALIERS, TAUX_CDF, toCDFString, verifierAbonnement, consommerPlace, libererPlace } from "@/lib/paiement";

export const dynamic = "force-dynamic";
const cleanWa = (n: any) => (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
const getUser = () => { try { if (typeof window === "undefined") return null; const r = localStorage.getItem("wenze_user"); return r ? JSON.parse(r) : null; } catch { return null; } };
const readList = (k: string): any[] => { try { if (typeof window === "undefined") return []; const raw = localStorage.getItem(k) || "[]"; const v = JSON.parse(raw || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };

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
  const [form, setForm] = useState({ titre: "", description: "", prix: "", categorieId: "commerces-services", activiteId: "", commune: "", ville: "Kinshasa", stock: "1", livraison: "Retrait / Livraison Kinshasa" });
  const [isEditMode, setIsEditMode] = useState(false);
  const [keepDates, setKeepDates] = useState<any>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/connexion?next=/publier"); return; }
    const waU = cleanWa(u.ownerWhatsapp || u.whatsapp || u.id);
    let abCheck: any = null;
    try { abCheck = verifierAbonnement(); setAb(abCheck); if (abCheck?.ticketsActifs?.length && !selectedTicketId) { const avecPlace = abCheck.ticketsActifs.find((t: any) => t.imagesUsed < t.imagesMax); if (avecPlace) setSelectedTicketId(avecPlace.ticketId); } } catch {}
    let old: any = null;
    if (editId) {
      try {
        old = readList("wenze_annonces_list").find((x: any) => String(x.id) === String(editId)) || null;
        if (!old) { setToast({ msg: "Annonce introuvable", type: "error" }); setTimeout(() => router.push("/boutiques"), 1500); return; }
        const waA = cleanWa(old.ownerWhatsapp || old.whatsapp || old.userId);
        if (waU !== waA && u.id !== old.userId) { setToast({ msg: "Pas ton annonce", type: "error" }); setTimeout(() => router.push("/"), 2000); return; }
        setForm({ titre: old.titre || "", description: old.description || "", prix: String(old.prixUSD || old.prix || ""), categorieId: normalizeCategorie(old.categorieId || "commerces-services"), activiteId: old.activiteId || "", commune: old.commune || "", ville: old.ville || "Kinshasa", stock: String(old.stock || 1), livraison: old.livraison || "Retrait / Livraison Kin" });
        setPhotos(old.images?.length ? old.images.slice(0, 4) : old.photo ? [old.photo] : []);
        setKeepDates({ createdAt: old.createdAt, boostUntil: old.boostUntil, ticketId: old.ticketId });
        if (old.ticketId) setSelectedTicketId(old.ticketId);
        setIsEditMode(true);
      } catch {}
    }
    const baseCat = catFromUrl || u.categorieId || "commerces-services";
    const fixedCat = normalizeCategorie(baseCat);
    const catObj: any = getCategorieById(fixedCat);
    const firstAct = catObj?.activites?.[0]?.id || "";
    setUser({ ownerWhatsapp: u.ownerWhatsapp || u.whatsapp || "", whatsapp: u.whatsapp || "", id: u.id || "", nom: u.nom || "", nomEtablissement: u.nomEtablissement || u.nom || "", commune: u.commune || "", categorieId: fixedCat });
    if (!old) { setForm((f: any) => ({ ...f, categorieId: fixedCat, activiteId: u.activiteId || firstAct, commune: u.commune || f.commune })); }
    setLoading(false);
  }, [router, editId, catFromUrl, selectedTicketId]);

  const currentCat: any = useMemo(() => getCategorieById(form.categorieId) || {}, [form.categorieId]);
  const prixNum = Number(form.prix || 0);
  const selectedTicket = useMemo(() => ab?.ticketsActifs?.find((t: any) => t.ticketId === selectedTicketId), [ab, selectedTicketId]);
  const peutPublier = ab ? ab.peutPublier : false;

  const showToastFn = (msg: string, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const setField = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const handlePhotos = (e: any) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    const maxAdd = selectedTicket ? selectedTicket.imagesMax - selectedTicket.imagesUsed + (isEditMode ? 1 : 0) : (ab?.isFreemium ? ab.imagesRestantes : 4);
    if (photos.length + files.length > maxAdd) { showToastFn("Limite atteinte Max " + maxAdd, "error"); return; }
    files.slice(0, 4 - photos.length).forEach((file: File) => {
      if (file.size > 5 * 1024 * 1024) { showToastFn("Photo 5Mo max", "error"); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 800; let w = img.width, h = img.height;
          if (w > h && w > max) { h = (h * max) / w; w = max; } else if (h >= w && h > max) { w = (w * max) / h; h = max; }
          const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d"); if (ctx) ctx.drawImage(img, 0, 0, w, h);
          setPhotos(prev => [...prev, canvas.toDataURL("image/jpeg", 0.65)].slice(0, 4));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handlePublish = () => {
    if (!ab) { showToastFn("Verification abonnement", "error"); return; }
    if (ab.isCache) { router.push("/abonnement?msg=cache"); return; }
    if (!ab.peutPublier) { showToastFn("Plus de place - Achete ticket " + toCDFString(5), "error"); return; }
    if (!isEditMode && ab.isPaye && !selectedTicketId) { showToastFn("Choisis ticket", "error"); return; }
    if (form.titre.trim().length < 3) { showToastFn("Titre 3 caracteres min", "error"); return; }
    if (!prixNum) { showToastFn("Prix requis Taux " + TAUX_CDF, "error"); return; }
    if (!photos.length) { showToastFn("1 photo minimum", "error"); return; }
    setSaving(true);
    try {
      const id = isEditMode && editId ? editId : "WENZE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      const activiteObj: any = getActiviteById(form.activiteId) || (currentCat?.activites?.find((x: any) => x.id === form.activiteId));
      const createdAtFinal = keepDates?.createdAt || new Date().toISOString();
      const wa = cleanWa(user.ownerWhatsapp || user.whatsapp);
      const catId = normalizeCategorie(form.categorieId);
      if (!isEditMode && selectedTicketId) { const ok = consommerPlace(selectedTicketId, id); if (!ok) { showToastFn("Ticket plein ou expire", "error"); setSaving(false); return; } }
      const annonce = { id, titre: form.titre.trim(), description: form.description.trim(), prix: prixNum, prixUSD: prixNum, prixCDF: 0, prixCDFString: toCDFString(prixNum), categorieId: catId, categorie: catId, activiteId: form.activiteId, activite: activiteObj?.titre || activiteObj?.label || form.activiteId, photo: photos[0], images: photos, ownerWhatsapp: wa, whatsapp: wa, ownerName: user.nomEtablissement || user.nom || "WENZE", userId: user.id || wa, commune: form.commune || user.commune || "Kinshasa", ville: form.ville || "Kinshasa", stock: Number(form.stock || 1), livraison: form.livraison, taux: TAUX_CDF, created_at: createdAtFinal, createdAt: createdAtFinal, statut: "actif", ticketId: selectedTicketId || null, palierId: selectedTicket?.palierId || ab.palierId || null, freemium: ab.isFreemium, expireAt: selectedTicket?.expireAt || ab.expireAt || null };
      let list = readList("wenze_annonces_list");
      if (isEditMode) list = list.filter((x: any) => String(x.id) !== String(id));
      const userAnnonces = list.filter((a: any) => cleanWa(a.ownerWhatsapp || a.whatsapp) === wa);
      if (userAnnonces.length >= 50) { const sorted = userAnnonces.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); const oldest = sorted[0]; try { libererPlace(oldest.id); } catch {} list = list.filter((x: any) => String(x.id) !== String(oldest.id)); }
      list.unshift(annonce);
      if (typeof window !== "undefined") localStorage.setItem("wenze_annonces_list", JSON.stringify(list.slice(0, 200)));
      setShowSuccess({ id: annonce.id, titre: annonce.titre, prix: prixNum + "$ / " + toCDFString(prixNum), ticket: selectedTicket });
      setSaving(false);
      setTimeout(() => router.push("/produit/" + id), 1800);
    } catch (e: any) { showToastFn(e.message || "Stockage plein", "error"); setSaving(false); }
  };

  if (loading) { return <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6 flex items-center justify-center"><div><div className="h-24 bg-white border rounded-2xl animate-pulse" /><p className="text-[11px] text-gray-400 mt-2">V6 Chargement</p></div></div>; }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-28">
      {showSuccess && (<div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[28px] max-w-[360px] w-full p-6 text-center border-2 border-black"><div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">V</div><h2 className="font-black text-[18px] mt-4">{isEditMode ? "Modification OK" : "Publie avec succes"}</h2><div className="bg-[#FFFBF0] border-2 rounded-2xl p-4 mt-4 text-left"><p className="font-black text-[13px]">{showSuccess.titre}</p><p className="text-[12px] font-black text-orange-600 mt-1">{showSuccess.prix}</p></div></div></div>)}
      <header className="sticky top-0 bg-white/95 z-20 p-4 border-b flex items-center gap-3"><Link href={isEditMode ? "/produit/" + editId : "/"} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">{"<"}</Link><div className="flex-1 min-w-0"><h1 className="font-black text-[13px] truncate">WENZE V6 - {isEditMode ? "Modifier" : "Publier"}</h1><p className="text-[9px] text-gray-500 truncate">Taux {TAUX_CDF} - 0% comm</p></div></header>
      <div className="p-4 space-y-4">
        {toast && <div className={"p-3.5 rounded-xl text-[11px] font-bold border-2 " + (toast.type === "error" ? "bg-red-50 text-red-700 border-red-300" : "bg-green-50 border-green-300")}>{toast.msg}</div>}
        {ab?.isPaye && (<div className="bg-white border-2 border-black rounded-2xl p-4"><p className="font-black text-[13px]">Choisis le ticket</p><div className="mt-3 space-y-2">{(ab.ticketsActifs || []).map((t: any) => (<button key={t.ticketId} onClick={() => setSelectedTicketId(t.ticketId)} className={"w-full border-2 rounded-xl p-3 text-left " + (selectedTicketId === t.ticketId ? "border-black bg-black text-white" : "border-gray-200 bg-white")}><p className="font-black text-[11px]">{t.palierId} - {t.imagesUsed}/{t.imagesMax}</p><p className="text-[9px] opacity-80">Expire {new Date(t.expireAt).toLocaleDateString("fr-FR")}</p></button>))}</div></div>)}
        <div className="bg-white border rounded-2xl p-4"><p className="font-black text-[12px]">Photos 4 max</p><input type="file" accept="image/*" multiple onChange={handlePhotos} className="mt-3 w-full text-[11px] border border-dashed rounded-xl p-3 bg-gray-50" />{photos.length > 0 && (<div className="mt-4 grid grid-cols-2 gap-3">{photos.map((p, i) => (<div key={i} className="relative"><img src={p} alt="" className="w-full h-28 object-cover rounded-xl border-2" /><button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-500 text-white rounded-full">X</button></div>))}</div>)}</div>
        <div className="bg-white border rounded-2xl p-4 space-y-3"><p className="font-black text-[13px]">Details produit</p><input value={form.titre} onChange={e => setField("titre", e.target.value)} placeholder="Titre *" className="w-full border rounded-xl p-3.5 text-[13px]" /><textarea value={form.description} onChange={e => setField("description", e.target.value)} placeholder="Description" rows={4} className="w-full border rounded-xl p-3.5 text-[13px]"></textarea><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] font-bold">Prix USD *</label><input value={form.prix} onChange={e => setField("prix", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="25" className="w-full mt-1 border rounded-xl p-3.5 text-[13px] font-black" /><p className="text-[10px] text-gray-500 mt-1">{prixNum ? prixNum + "$ / " + toCDFString(prixNum) + " CDF" : ""}</p></div><div><label className="text-[10px] font-bold">Stock</label><input value={form.stock} onChange={e => setField("stock", e.target.value.replace(/[^0-9]/g, ""))} placeholder="1" className="w-full mt-1 border rounded-xl p-3.5 text-[13px]" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] font-bold">Commune</label><input value={form.commune} onChange={e => setField("commune", e.target.value)} placeholder="Gombe" className="w-full mt-1 border rounded-xl p-3.5 text-[13px]" /></div><div><label className="text-[10px] font-bold">Ville</label><input value={form.ville} onChange={e => setField("ville", e.target.value)} placeholder="Kinshasa" className="w-full mt-1 border rounded-xl p-3.5 text-[13px]" /></div></div><div><label className="text-[10px] font-bold">Categorie</label><div className="mt-2 grid grid-cols-2 gap-2">{CATEGORIES_WENZE.map((c: any) => { const sel = form.categorieId === c.id; return <button key={c.id} type="button" onClick={() => { setField("categorieId", c.id); const first = c.activites?.[0]?.id || ""; setField("activiteId", first); }} className={"text-left p-3 rounded-xl border-2 text-[11px] font-bold " + (sel ? "bg-black text-white border-black" : "bg-white border-gray-200")}>{c.icon} {c.titreCourt}</button>; })}</div></div><div><label className="text-[10px] font-bold">Activite</label><div className="mt-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">{(currentCat.activites || []).map((a: any) => { const sel = form.activiteId === a.id; return <button key={a.id} type="button" onClick={() => setField("activiteId", a.id)} className={"px-3 py-2 rounded-full text-[10px] font-bold border " + (sel ? "bg-black text-white border-black" : "bg-white")}>{a.titre || a.label}</button>; })}</div></div><div><label className="text-[10px] font-bold">Livraison</label><input value={form.livraison} onChange={e => setField("livraison", e.target.value)} className="w-full mt-1 border rounded-xl p-3.5 text-[13px]" /></div><button onClick={handlePublish} disabled={saving} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px] disabled:opacity-50">{saving ? "Publication..." : isEditMode ? "Modifier" : "Publier - Taux " + TAUX_CDF}</button></div>
      </div>
    </div>
  );
}
export default function PublierPage() { return <Suspense fallback={<div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-6"><div className="h-24 bg-white border rounded-2xl animate-pulse" /></div>}><PublierContent /></Suspense>; }
