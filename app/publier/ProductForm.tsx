"use client";
import { CATEGORIES_WENZE } from "@/lib/categories";
import { TAUX_CDF, toCDFString } from "@/lib/paiement";

const INPUT = "w-full border rounded-xl p-3.5 text-[13px] outline-none focus:ring-2 focus:ring-black";

export default function ProductForm({
  form,
  setField,
  setForm,
  prixNum,
  activites,
  role, // NOUVEAU : "vendeur" | "grossiste" - vient de page.tsx
}: {
  form: any;
  setField: (key: string, value: string) => void;
  setForm: (fn: (f: any) => any) => void;
  prixNum: number;
  activites: any[];
  role?: string;
}) {
  const estGrossiste = role === "grossiste";
  const estVendeur = role === "vendeur" || role === "boutique" || !role;

  // CORRIGÉ : Grossiste ne voit pas les catégories de services, seulement les produits
  const categoriesVisibles = CATEGORIES_WENZE.filter((c: any) => {
    if (c.id === "client") return false;
    if (estGrossiste && (c.id === "services" || c.id === "commerces-services")) return false; // Grossiste = produits, pas services
    return true;
  });

  return (
    <div className="bg-white border rounded-2xl p-4 space-y-3 shadow-sm">
      <p className="font-black text-[13px]">
        {estGrossiste ? "🏭 Détails du produit gros" : "Détails du produit"}
      </p>

      {estGrossiste ? (
        <p className="text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-2.5">
          Tu vends en gros. Ton <b>prix détail</b> ci-dessous est visible par tout le monde. Ton <b>prix gros</b> (en bas) est visible seulement par les Grossistes + DG.
        </p>
      ) : null}

      <input
        value={form.titre}
        onChange={(e: any) => setField("titre", e.target.value)}
        placeholder={estGrossiste ? "Titre *, ex : Carton de Riz 25kg x 10" : "Titre *, ex : Sac de riz 25 kg"}
        className={INPUT}
      />
      <textarea
        value={form.description}
        onChange={(e: any) => setField("description", e.target.value)}
        placeholder={estGrossiste ? "Description : contenu du carton, origine, minimum de commande..." : "Description : détails, état, origine..."}
        rows={4}
        className={INPUT + " resize-none"}
      ></textarea>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold">
            {estGrossiste ? "Prix détail / pièce (USD) *" : "Prix USD *"}
          </label>
          <input
            value={form.prix}
            onChange={(e: any) => setField("prix", e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Ex : 25"
            inputMode="decimal"
            className={INPUT + " mt-1 font-black"}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            {prixNum > 0 ? prixNum + "$ = " + toCDFString(prixNum) : "Taux " + TAUX_CDF}
          </p>
          {estGrossiste ? (
            <p className="text-[9px] text-orange-600 mt-0.5">Visible par tout le monde</p>
          ) : null}
        </div>
        <div>
          <label className="text-[10px] font-bold">
            {estGrossiste ? "Stock (en cartons)" : "Stock"}
          </label>
          <input
            value={form.stock}
            onChange={(e: any) => setField("stock", e.target.value.replace(/[^0-9]/g, ""))}
            placeholder={estGrossiste ? "Ex : 50 cartons" : "1"}
            inputMode="numeric"
            className={INPUT + " mt-1"}
          />
          {estGrossiste ? (
            <p className="text-[9px] text-gray-500 mt-1">Nombre de cartons dispo</p>
          ) : null}
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
          {categoriesVisibles.map((c: any) => {
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
        {estGrossiste ? (
          <select value={form.livraison} onChange={(e: any) => setField("livraison", e.target.value)} className={INPUT + " mt-1 bg-white"}>
            <option value="Retrait / Livraison Kinshasa">Retrait / Livraison Kinshasa</option>
            <option value="Retrait à l'entrepôt uniquement">Retrait à l'entrepôt uniquement</option>
            <option value="Livraison gros - Kinshasa uniquement">Livraison gros - Kinshasa uniquement</option>
            <option value="Livraison partout en RDC">Livraison partout en RDC</option>
          </select>
        ) : (
          <input value={form.livraison} onChange={(e: any) => setField("livraison", e.target.value)} className={INPUT + " mt-1"} />
        )}
      </div>

      {/* RAPPEL GROSSISTE : prix gros en bas dans page.tsx */}
      {estGrossiste ? (
        <p className="text-[10px] text-gray-500 bg-[#FFFBF0] rounded-xl p-2.5">
          👇 N'oublie pas de remplir ton <b>Prix gros</b> juste en bas, sinon ton produit sera vendu seulement au détail.
        </p>
      ) : null}
    </div>
  );
                  }
