"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { lireSession } from "@/lib/connexion";
import {
  TAUX_CDF,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
} from "@/lib/paiement";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));

function cleanWa(n: any): string {
  return (n || "")
    .toString()
    .replace(/[^0-9]/g, "")
    .replace(/^0+/, "");
}

function readList(k: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const v = JSON.parse(localStorage.getItem(k) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function isAnnonceVisible(a: any): boolean {
  if (!a || a.is_visible === false || a.statut === "masque" || a.statut === "expire") {
    return false;
  }
  if (a.isFreemium || a.plan === "GRATUIT" || a.palier === "GRATUIT") {
    const baseTime = new Date(
      a.createdAt || a.created_at || a.updatedAt || 0
    ).getTime();
    if (baseTime > 0) {
      const ageJours = (Date.now() - baseTime) / (1000 * 60 * 60 * 24);
      const maxJours = Number(a.dureeJours || 30);
      if (ageJours > maxJours) return false;
    }
  }
  return true;
}

function getBoutiqueIdentite(u: any, wa: string) {
  const nomBrut = (
    u?.nomBoutique ||
    u?.boutiqueName ||
    u?.nomEtablissement ||
    u?.name ||
    ""
  ).trim();
  const marqueBrut = (u?.marque || "").trim();
  if (nomBrut.toLowerCase().includes("boutiques") && nomBrut.includes("(")) {
    const cleaned = nomBrut.replace(/Boutiques\s+Boutiques/i, "Boutiques").trim();
    return { nom: cleaned, marque: marqueBrut || "Commerce général" };
  }
  if (nomBrut) {
    return { nom: nomBrut, marque: marqueBrut || "Commerce général" };
  }
  return {
    nom: `Boutique ${wa.slice(-4)}`,
    marque: marqueBrut || "Commerce général",
  };
}

function tracerRecommandationDG(waCible: string, recommande: boolean, acteurWa: string) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("wenze_journal");
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action: recommande ? "BOUTIQUE_RECOMMANDEE_DG" : "BOUTIQUE_RETIRER_RECOMMANDATION_DG",
      cibleWhatsapp: waCible,
      acteurWhatsapp: acteurWa,
      role: "dg",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export default function BoutiquesPage() {
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [moi, setMoi] = useState<any>(null);
  const [filtre, setFiltre] = useState<"tout" | "recommande" | "gros">("tout");

  const chargerBoutiques = useCallback(() => {
    const u: any = lireSession() || (() => {
      try {
        const r = localStorage.getItem("wenze_user");
        return r ? JSON.parse(r) : null;
      } catch {
        return null;
      }
    })();
    setMoi(u);

    const annoncesBrutes = readList("wenze_annonces_list")
      .filter(isAnnonceVisible)
      .slice(0, PLAFOND_ACTIVES);
    const users = readList("wenze_all_users");
    const usersMap = new Map<string, any>();

    for (const usr of users) {
      const wa = cleanWa(usr.ownerWhatsapp || usr.whatsapp);
      if (wa) usersMap.set(wa, usr);
    }
    if (u) {
      const wa = cleanWa(u.ownerWhatsapp || u.whatsapp);
      if (wa) usersMap.set(wa, u);
    }

    const map = new Map<string, any>();
    for (const a of annoncesBrutes) {
      const wa = cleanWa(a.ownerWhatsapp || a.whatsapp || a.userId);
      if (!wa) continue;
      if (!map.has(wa)) {
        const vendeur = usersMap.get(wa) || {};
        const ident = getBoutiqueIdentite(
          { ...vendeur, nomBoutique: a.boutiqueName || vendeur.nomBoutique },
          wa
        );
        map.set(wa, {
          wa,
          nom: ident.nom,
          marque: ident.marque,
          commune: a.commune || vendeur.commune || "Kinshasa",
          photo: vendeur.photo || vendeur.avatar || a.photo || "",
          annonces: [],
          recommandeParDG: false,
          nbGros: 0,
          vendeur,
        });
      }
      const b = map.get(wa);
      b.annonces.push(a);
      if (a.recommandeParDG === true) b.recommandeParDG = true;
      if (a.typeAnnonce === "gros") b.nbGros += 1;
    }

    setBoutiques(Array.from(map.values()));
  }, []);

  useEffect(() => {
    chargerBoutiques();
    if (typeof window === "undefined") return;
    const onSync = () => chargerBoutiques();
    window.addEventListener("storage", onSync);
    window.addEventListener("wenze_annonces_updated", onSync);
    return () => {
      window.removeEventListener("storage", onSync);
      window.removeEventListener("wenze_annonces_updated", onSync);
    };
  }, [chargerBoutiques]);

  const monRole = String(moi?.role || "client").toLowerCase();
  const jeSuisDG =
    moi?.roleAdmin === "dg" ||
    monRole === "dg" ||
    Boolean(moi?.dgSessionActive);
  const peutVoirPrixGros = jeSuisDG || monRole === "grossiste";
  const voirTout = monRole !== "client" || jeSuisDG;
  const maCommune = moi?.commune || "Kinshasa";

  const filtered = useMemo(() => {
    let list = [...boutiques];

    if (!voirTout) {
      list = list.filter((b: any) => b.recommandeParDG === true);
    }

    if (filtre === "recommande") {
      list = list.filter((b: any) => b.recommandeParDG);
    }
    if (filtre === "gros") {
      list = list.filter((b: any) => b.nbGros > 0);
    }

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (b: any) =>
          (b.nom || "").toLowerCase().includes(s) ||
          (b.marque || "").toLowerCase().includes(s) ||
          (b.commune || "").toLowerCase().includes(s)
      );
    }

    return list.sort((a: any, b: any) => {
      const aIci = (a.commune || "") === maCommune ? 0 : 1;
      const bIci = (b.commune || "") === maCommune ? 0 : 1;
      if (aIci !== bIci) return aIci - bIci;
      if (a.recommandeParDG !== b.recommandeParDG) {
        return a.recommandeParDG ? -1 : 1;
      }
      return b.annonces.length - a.annonces.length;
    });
  }, [boutiques, voirTout, filtre, search, maCommune]);

  const toggleRecommandeBoutique = (wa: string, actuel: boolean) => {
    if (!jeSuisDG) return;
    const prochainEtat = !actuel;
    const list = readList("wenze_annonces_list").map((a: any) => {
      const aWa = cleanWa(a.ownerWhatsapp || a.whatsapp || a.userId);
      if (aWa !== wa) return a;
      return { ...a, recommandeParDG: prochainEtat };
    });
    localStorage.setItem("wenze_annonces_list", JSON.stringify(list));
    tracerRecommandationDG(
      wa,
      prochainEtat,
      cleanWa(moi?.ownerWhatsapp || moi?.whatsapp || "dg")
    );
    chargerBoutiques();
  };

  const totalAnnonces = boutiques.reduce((s, b) => s + b.annonces.length, 0);

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <header className="sticky top-0 bg-white z-20 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-[16px]">🏬 Boutiques</h1>
            <p className="text-[10px] text-gray-500">
              {filtered.length} boutique(s) • {totalAnnonces}/{PLAFOND_ACTIVES}{" "}
              annonce(s) • 0 % commission • {TAUX_CDF} CDF/$
            </p>
          </div>
        </div>

        <div className="mt-3 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche boutique, Gombe, Lemba..."
            className="w-full border-2 pl-10 pr-4 py-3 rounded-full text-[13px] bg-[#FFFBF0] outline-none"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFiltre("tout")}
            className={
              "px-4 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap " +
              (filtre === "tout" ? "bg-black text-white" : "bg-white")
            }
          >
            Tout • {boutiques.length}
          </button>
          <button
            type="button"
            onClick={() => setFiltre("recommande")}
            className={
              "px-4 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap " +
              (filtre === "recommande" ? "bg-black text-white" : "bg-white")
            }
          >
            ⭐ Recommandées
          </button>
          <button
            type="button"
            onClick={() => setFiltre("gros")}
            className={
              "px-4 py-2 rounded-full text-[11px] font-black border-2 whitespace-nowrap " +
              (filtre === "gros" ? "bg-black text-white" : "bg-white")
            }
          >
            🏭 Gros
          </button>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {!voirTout ? (
          <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-3.5">
            <p className="font-black text-[13px]">
              ⭐ Boutiques vérifiées à {maCommune}
            </p>
            <p className="text-[11px] text-gray-600 mt-0.5">
              Tu vois seulement les boutiques recommandées par Wenze. Pour voir
              tout, ouvre ta boutique.
            </p>
          </div>
        ) : peutVoirPrixGros && monRole === "grossiste" ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5">
            <p className="font-black text-[13px]">
              🏭 Boutiques gros - Tout Kinshasa
            </p>
            <p className="text-[11px] text-gray-600 mt-0.5">
              Accès activé aux tarifs gros (Grossistes + DG) • 0 % commission.
            </p>
          </div>
        ) : jeSuisDG ? (
          <div className="bg-black text-white rounded-2xl p-3.5">
            <p className="font-black text-[13px]">
              👑 Mode DG - {boutiques.length} boutiques
            </p>
            <p className="text-[10px] opacity-70">
              Recommandation boutique et accès complet aux prix gros.
            </p>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-dashed rounded-2xl">
            <p className="text-4xl">🏬</p>
            <p className="text-[13px] font-black mt-3">
              {!voirTout
                ? "Aucune boutique vérifiée pour l'instant"
                : "Aucune boutique"}
            </p>
            <p className="text-[11px] text-gray-500 mt-1 px-4">
              {!voirTout
                ? "Le DG n'a pas encore recommandé de boutique dans ta zone."
                : "Sois le premier à publier."}
            </p>
            <Link
              href="/publier"
              className="mt-4 inline-block bg-black text-white px-6 py-3 rounded-full font-black text-[11px]"
            >
              + Publier
            </Link>
          </div>
        ) : (
          filtered.map((b: any) => {
            const prixMin = Math.min(
              ...b.annonces.map((a: any) => Number(a.prixUSD || a.prix || 0))
            );
            const prixGrosList = b.annonces
              .map((a: any) => Number(a.prixGrosUSD || a.prixGros || 0))
              .filter((v: number) => v > 0);
            const grosMin =
              prixGrosList.length > 0 ? Math.min(...prixGrosList) : 0;

            return (
              <div
                key={b.wa}
                className="bg-white border rounded-2xl overflow-hidden"
              >
                <Link
                  href={`/boutiques/${b.wa}`}
                  className="flex gap-3 p-3 items-center"
                >
                  <div className="w-16 h-16 bg-[#FFFBF0] rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border">
                    {b.photo ? (
                      <img
                        src={b.photo}
                        alt={b.nom}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🏬</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1">
                      {b.recommandeParDG ? (
                        <span className="text-[9px] bg-yellow-400 px-2 py-0.5 rounded-full font-black">
                          ⭐ RECOMMANDÉ
                        </span>
                      ) : null}
                      {b.nbGros > 0 ? (
                        <span className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black">
                          🏭 GROS ({b.nbGros})
                        </span>
                      ) : null}
                    </div>
                    <p className="font-black text-[14px] truncate mt-1">
                      {b.nom}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {b.marque} • {b.commune}
                    </p>
                    <p className="text-[11px] font-bold mt-0.5">
                      {b.annonces.length} annonce(s) • Dès {usd(prixMin)} /{" "}
                      {toCDFString(prixMin)}
                    </p>
                    {peutVoirPrixGros && grosMin > 0 ? (
                      <p className="text-[10px] font-bold text-orange-600 mt-0.5">
                        Gros dès {usd(grosMin)} / {toCDFString(grosMin)}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-gray-400">›</span>
                </Link>

                {jeSuisDG ? (
                  <button
                    type="button"
                    onClick={() =>
                      toggleRecommandeBoutique(b.wa, Boolean(b.recommandeParDG))
                    }
                    className={
                      "w-full py-2 text-[10px] font-black border-t " +
                      (b.recommandeParDG ? "bg-yellow-100" : "bg-gray-50")
                    }
                  >
                    {b.recommandeParDG
                      ? "★ Retirer Recommandé (toute la boutique)"
                      : "☆ Recommander toute la boutique"}
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
 }
          
