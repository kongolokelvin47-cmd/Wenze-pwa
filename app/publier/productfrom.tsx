"use client";
import { CATEGORIES_WENZE } from "@/lib/categories";
import { TAUX_CDF, toCDFString } from "@/lib/paiement";

const INPUT = "w-full border rounded-xl p-3.5 text-[13px] outline-none focus:ring-2 focus:ring-black";

export default function ProductForm({
  form,
  setField,
  setForm,
  prixNum,
  activites
}: {
  form: any;
  setField: (key: string, value: string) => void;
  setForm: (fn: (f: any) => any) => void;
  prixNum: number;
  activites: any[];
}) {
  return (
    <div className="bg-white border rounded-2xl p-4 space-y-3 shadow-sm">
      <p className="font-black text-[13px]">Détails du produit</p>

      <input value={form.titre} onChange={(e: any) => setField("titre", e.target.value)} placeholder="Titre *, ex : Sac de riz 25 kg" className={INPUT} />
      <textarea
        value={form.description}
        onChange={(e: any) => setField("description", e.target.value)}
        placeholder="Description : détails, état, origine..."
        rows={4}
        className={INPUT + " resize-none"}
      ></textarea>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold">Prix USD *</label>
          <input
            value={form.prix}
            onChange={(e: any) => setField("prix", e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Ex : 25"
            inputMode="decimal"
            className={INPUT + " mt-1 font-black"}
          />
          <p className="text-[10px] text-gray-500 mt-1">{prixNum > 0 ? prixNum + "$ = " + toCDFString(prixNum) : "Taux " + TAUX_CDF}</p>
        </div>
        <div>
          <label className="text-[10px] font-bold">Stock</label>
          <input
            value={form.stock}
            onChange={(e: any) => setField("stock", e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="1"
            inputMode="numeric"
            className={INPUT + " mt-1"}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold">Commune</label>
          <input value={form.commune} onChange={(e: any) => setField("commune", e.target.value)} placeholder="Ex : Gombe" className={INPUT + " mt-1"} />
        </div>
        <div>
          <label className="text-[10px] font-bold">Ville</label>
          <input value={form.ville} onChange={(e: any) => setField("ville", e.target.value)} placeholder="Kinshasa" className={INPUT + " mt-1"} />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold">Catégorie</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CATEGORIES_WENZE.filter((c: any) => c.id !== "client").map((c: any) => {
            const selected = form.categorieId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setForm((f: any) => ({ ...f, categorieId: c.id, activiteId: c.activites?.[0]?.id || "" }))}
                className={"text-left p-3 rounded-xl border-2 text-[11px] font-bold " + (selected ? "bg-black text-white border-black" : "bg-white border-gray-200")}
              >
                {c.icon} {c.titreCourt || c.titre}
              </button>
            );
          })}
        </div>
      </div>

      {activites.length > 0 ? (
        <div>
          <label className="text-[10px] font-bold">Activité</label>
          <div className="mt-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {activites.map((a: any) => {
              const selected = form.activiteId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setField("activiteId", a.id)}
                  className={"text-[10px] px-2.5 py-1.5 rounded-full font-bold border " + (selected ? "bg-[#6C3CE0] text-white border-[#6C3CE0]" : "bg-[#FFFBF0]")}
                >
                  {a.label || a.titre}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <label className="text-[10px] font-bold">Livraison</label>
        <input value={form.livraison} onChange={(e: any) => setField("livraison", e.target.value)} className={INPUT + " mt-1"} />
      </div>
    </div>
  );
                       }
                  
