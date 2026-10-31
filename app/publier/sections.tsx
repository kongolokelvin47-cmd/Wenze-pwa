"use client";
import Link from "next/link";
import { PALIERS, toCDFString } from "@/lib/paiement";
import { DAY_MS, MAX_PHOTOS, compressImage } from "./helpers";

/* ---------- Bannières d'état (compte caché, limite atteinte, plus de places) ---------- */
export function StatusBanners({ ab, isEditMode }: { ab: any; isEditMode: boolean }) {
  if (isEditMode || !ab) return null;

  if (ab.isCache) {
    return (
      <div className="bg-red-600 text-white rounded-2xl p-4 border-2 border-black shadow">
        <p className="font-black text-[13px]">🔒 Compte caché : les 30 jours gratuits sont expirés</p>
        <p className="text-[11px] mt-1.5 opacity-90">Vos annonces ne sont plus visibles dans le marché. Achetez un ticket pour réapparaître immédiatement.</p>
        <Link href="/abonnement" className="mt-3 block w-full bg-white text-black text-center py-3 rounded-full font-black text-[12px]">
          🎫 Payer 5$ / {toCDFString(5)}
        </Link>
      </div>
    );
  }

  if (ab.isFreemium && ab.imagesRestantes === 0) {
    return (
      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4">
        <p className="font-black text-[12px]">🆓 Limite gratuite atteinte</p>
        <p className="text-[10px] mt-1">Le ticket ⭐ STANDARD à 5$ ({toCDFString(5)}) donne 4 places sur 7 jours. Cumulable.</p>
        <Link href="/abonnement" className="mt-3 block w-full bg-black text-white text-center py-2.5 rounded-full font-black text-[11px]">
          Voir les tickets 5$ / 10$ / 20$
        </Link>
      </div>
    );
  }

  if (ab.isPaye && !ab.peutPublier) {
    return (
      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4">
        <p className="font-black text-[12px]">Plus de places libres</p>
        <p className="text-[10px] mt-1">Supprimez une annonce vendue pour libérer une place, ou achetez un nouveau ticket.</p>
        <Link href="/abonnement" className="mt-3 block w-full bg-black text-white text-center py-2.5 rounded-full font-black text-[11px]">
          Acheter un ticket
        </Link>
      </div>
    );
  }

  return null;
}

/* ---------- Choix du ticket sur lequel publier ---------- */
export function TicketPicker({ tickets, selectedId, onSelect }: { tickets: any[]; selectedId: string; onSelect: (id: string) => void }) {
  if (!tickets || tickets.length === 0) return null;
  const selected = tickets.find((t: any) => t.ticketId === selectedId);

  return (
    <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-sm">
      <p className="font-black text-[13px]">🎫 Choisissez le ticket</p>
      <p className="text-[9px] text-gray-600 mt-1">Chaque annonce utilise 1 place du ticket. Supprimer une annonce libère sa place.</p>
      <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto">
        {tickets.map((t: any) => {
          const isSel = selectedId === t.ticketId;
          const jours = Math.max(0, Math.ceil((new Date(t.expireAt).getTime() - Date.now()) / DAY_MS));
          const pct = t.imagesMax ? Math.min(100, (t.imagesUsed / t.imagesMax) * 100) : 0;
          return (
            <button
              key={t.ticketId}
              type="button"
              onClick={() => onSelect(t.ticketId)}
              className={"w-full border-2 rounded-xl p-3 text-left " + (isSel ? "border-black bg-black text-white" : "border-gray-200 bg-white")}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-black text-[11px]">{(PALIERS as any)[t.palierId]?.badge || "🎫"} {t.palierId} - {t.imagesUsed}/{t.imagesMax} places</p>
                  <p className="text-[9px] opacity-80 mt-0.5">Expire le {new Date(t.expireAt).toLocaleDateString("fr-FR")} - {jours}j restants</p>
                </div>
                <p className={"font-black text-[11px] px-2.5 py-1 rounded-full " + (isSel ? "bg-white text-black" : "bg-black text-white")}>{t.imagesMax - t.imagesUsed} libres</p>
              </div>
              <div className="mt-2 w-full bg-gray-300 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#25D366] h-full" style={{ width: pct + "%" }}></div>
              </div>
            </button>
          );
        })}
      </div>
      {selected ? (
        <p className="text-[10px] mt-3 font-bold bg-[#FFFBF0] border rounded-xl p-2.5">
          ✅ Ticket {selected.palierId} : il reste {selected.imagesMax - selected.imagesUsed} place(s)
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Photos (4 max, compressées) ---------- */
export function PhotoPicker({
  photos,
  setPhotos,
  disabled,
  notify
}: {
  photos: string[];
  setPhotos: (fn: (prev: string[]) => string[]) => void;
  disabled: boolean;
  notify: (msg: string, type?: string) => void;
}) {
  async function handleFiles(e: any) {
    const files = Array.from(e.target.files || []) as File[];
    e.target.value = "";
    if (!files.length) return;
    const place = MAX_PHOTOS - photos.length;
    if (place <= 0) {
      notify("Maximum " + MAX_PHOTOS + " photos par annonce", "error");
      return;
    }
    for (const file of files.slice(0, place)) {
      if (file.size > 5 * 1024 * 1024) {
        notify("Photo trop lourde (5 Mo max)", "error");
        continue;
      }
      try {
        const data = await compressImage(file);
        setPhotos((prev: string[]) => [...prev, data].slice(0, MAX_PHOTOS));
      } catch (err: any) {
        notify(err?.message || "Photo illisible", "error");
      }
    }
  }

  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center">
        <p className="font-black text-[12px]">Photos ({MAX_PHOTOS} max)</p>
        <p className="text-[10px] bg-black text-white px-2.5 py-1 rounded-full font-bold">{photos.length} / {MAX_PHOTOS}</p>
      </div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        disabled={disabled}
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
  );
}
