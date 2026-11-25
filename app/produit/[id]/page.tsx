"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { lireSession, cle9 } from "@/lib/connexion";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

const safePrix = (p: any): number => {
  const v = Number(p || 0);
  return isNaN(v) ? 0 : v;
};

const safeCDF = (p: any): string => {
  try {
    return toCDFString(safePrix(p));
  } catch {
    return "0 FC";
  }
};

const readList = (k: string): any[] => {
  try {
    if (typeof window === "undefined") return [];
    const r = localStorage.getItem(k);
    const v = r ? JSON.parse(r) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

function writeList(k: string, list: any[]) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(k, JSON.stringify(list));
  } catch {}
}

function isAnnonceVisible(a: any): boolean {
  if (
    !a ||
    a.is_visible === false ||
    a.statut === "masque" ||
    a.statut === "expire"
  ) {
    return false;
  }
  if (a.isFreemium || a.plan === "GRATUIT" || a.palier === "GRATUIT") {
    const baseTime = new Date(
      a.createdAt || a.created_at || a.updatedAt || 0
    ).getTime();
    if (baseTime > 0) {
      const ageJours = (Date.now() - baseTime) / (1000 * 60 * 60 * 24);
      const maxJours = Number(a.dureeJours || FREE_DAYS || 30);
      if (ageJours > maxJours) return false;
    }
  }
  return true;
}

function tracerProduitJournal(
  action: "PRODUIT_WHATSAPP_CLIC" | "PRODUIT_PANIER_AJOUT" | "PRODUIT_LIEN_COPIE",
  produitId: string,
  acteurWa: string
) {
  try {
    const arr = readList("wenze_journal");
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      produitId,
      acteurWhatsapp: acteurWa,
      createdAt: new Date().toISOString(),
    });
    writeList("wenze_journal", arr.slice(-500));
  } catch {}
}

function scoreSimilarite(base: any, cand: any): number {
  if (String(base.id) === String(cand.id)) return -1;
  let s = 0;
  if (base.categorieId && base.categorieId === cand.categorieId) s += 50;
  if (base.categorie && base.categorie === cand.categorie) s += 30;
  if (base.commune && base.commune === cand.commune) s += 25;
  if (
    cle9(base.ownerWhatsapp || base.whatsapp) ===
    cle9(cand.ownerWhatsapp || cand.whatsapp)
  ) {
    s += 15;
  }
  const p1 = safePrix(base.prixUSD || base.prix);
  const p2 = safePrix(cand.prixUSD || cand.prix);
  if (p1 > 0 && p2 > 0) {
    const diff = Math.abs(p1 - p2) / p1;
    if (diff < 0.3) s += 20;
    else if (diff < 0.7) s += 10;
  }
  if (cand.boostUntil && new Date(cand.boostUntil).getTime() > Date.now()) {
    s += 10;
  }
  if (cand.recommandeParDG) s += 12;
  return s;
}

function saveVu(a: any) {
  if (!a?.id) return;
  const list = readList("wenze_vus").filter(
    (x: any) => String(x.id) !== String(a.id)
  );
  list.unshift({
    id: a.id,
    categorieId: a.categorieId || a.categorie,
    commune: a.commune,
    titre: a.titre,
    prix: safePrix(a.prixUSD || a.prix),
    at: Date.now(),
  });
  writeList("wenze_vus", list.slice(0, 30));
}

export default function ProduitPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = (params?.id as string) || "";
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    id = rawId;
  }

  const [a, setA] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [similaires, setSimilaires] = useState<any[]>([]);
  const [aussiVu, setAussiVu] = useState<any[]>([]);
  const [added, setAdded] = useState(false);
  const [vendeurInfo, setVendeurInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bloqueClient, setBloqueClient] = useState(false);
  const [designPub, setDesignPub] = useState<any>({
    main: "#FF6B00",
    title: "WENZE WENZE",
  });

  useEffect(() => {
    try {
      try {
        let d: any = null;
        const cfgRaw =
          typeof window !== "undefined"
            ? localStorage.getItem("wenze_config_publique")
            : null;
        if (cfgRaw) {
          const cfg = JSON.parse(cfgRaw);
          if (cfg?.designPub) d = cfg.designPub;
        }
        const v1 =
          typeof window !== "undefined"
            ? localStorage.getItem("wenze_design_pub")
            : null;
        if (!d && v1) d = JSON.parse(v1);
        if (d && typeof d === "object") {
          setDesignPub((p: any) => ({ ...p, ...d }));
        }
      } catch {}

      const u: any =
        lireSession() ||
        (() => {
          try {
            const uRaw =
              typeof window !== "undefined"
                ? localStorage.getItem("wenze_user")
                : null;
            return uRaw ? JSON.parse(uRaw) : null;
          } catch {
            return null;
          }
        })();
      setUser(u);

      const toutesAnnonces = readList("wenze_annonces_list");
      const found = toutesAnnonces.find(
        (x: any) =>
          String(x.id) === id ||
          String(x.id) === decodeURIComponent(id) ||
          (cle9(x.id) && cle9(x.id) === cle9(id))
      );

      if (!found) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const monRole = String(u?.role || "client").toLowerCase();
      const jeSuisDG =
        u?.roleAdmin === "dg" ||
        monRole === "dg" ||
        Boolean(u?.dgSessionActive);
      const isOwner =
        Boolean(u) &&
        (cle9(u.ownerWhatsapp || u.whatsapp || u.id) ===
          cle9(found.ownerWhatsapp || found.whatsapp || found.userId) ||
          (found.userId && u.id === found.userId));

      if (!isAnnonceVisible(found) && !jeSuisDG && !isOwner) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const voirTout = monRole !== "client" || jeSuisDG || isOwner;
      if (!voirTout && found.recommandeParDG !== true) {
        setBloqueClient(true);
        setA(found);
        setLoading(false);
        return;
      }

      setA(found);
      saveVu(found);

      const activesList = toutesAnnonces
        .filter((x: any) => isAnnonceVisible(x) || jeSuisDG)
        .slice(0, PLAFOND_ACTIVES);

      const allUsers = readList("wenze_all_users");
      const waVendeur = cle9(
        found.ownerWhatsapp || found.whatsapp || found.userId
      );
      const vendeur =
        allUsers.find(
          (x: any) =>
            cle9(x.ownerWhatsapp || x.whatsapp || x.id) === waVendeur
        ) || (isOwner ? u : null);

      setVendeurInfo(
        vendeur
          ? { ...vendeur, wa: waVendeur }
          : {
              wa: waVendeur,
              nomBoutique:
                found.boutiqueName || `Boutique ${waVendeur.slice(-4)}`,
              marque: found.marque || "Commerce général",
            }
      );

      const rel = activesList
        .filter(
          (x: any) =>
            String(x.id) !== String(found.id) &&
            cle9(x.ownerWhatsapp || x.whatsapp || x.userId) === waVendeur
        )
        .slice(0, 4);
      setRelated(rel);

      const baseList = voirTout
        ? activesList
        : activesList.filter((x: any) => x.recommandeParDG === true);

      const scored = baseList
        .map((x: any) => ({ x, score: scoreSimilarite(found, x) }))
        .filter((y: any) => y.score > 40)
        .sort((p: any, q: any) => q.score - p.score)
        .map((y: any) => y.x);

      const sim = scored
        .filter((x: any) => !rel.some((r: any) => String(r.id) === String(x.id)))
        .slice(0, 8);
      setSimilaires(sim);

      const vus = readList("wenze_vus");
      const panier = readList("wenze_panier");
      const aussi = baseList
        .filter(
          (x: any) =>
            String(x.id) !== String(found.id) &&
            !sim.some((s: any) => String(s.id) === String(x.id)) &&
            !rel.some((r: any) => String(r.id) === String(x.id))
        )
        .map((x: any) => {
          let s = scoreSimilarite(found, x);
          if (vus.some((v: any) => String(v.id) === String(x.id))) s += 20;
          if (panier.some((p: any) => String(p.id) === String(x.id))) s += 15;
          return { x, score: s };
        })
        .filter((y: any) => y.score > 30)
        .sort((p: any, q: any) => q.score - p.score)
        .map((y: any) => y.x)
        .slice(0, 4);
      setAussiVu(aussi);
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }, [id]);

  const isOwnerMe = useMemo(() => {
    if (!user || !a) return false;
    try {
      return (
        cle9(user.ownerWhatsapp || user.whatsapp || user.id) ===
          cle9(a.ownerWhatsapp || a.whatsapp || a.userId) ||
        (a.userId && user.id === a.userId)
      );
    } catch {
      return false;
    }
  }, [user, a]);

  const monRole = String(user?.role || "client").toLowerCase();
  const jeSuisDG =
    user?.roleAdmin === "dg" ||
    monRole === "dg" ||
    Boolean(user?.dgSessionActive);
  const estGros = a?.typeAnnonce === "gros";

  const peutVoirGros = useMemo(() => {
    if (!estGros) return false;
    return monRole === "grossiste" || jeSuisDG;
  }, [estGros, monRole, jeSuisDG]);

  const handleWhatsApp = () => {
    if (!a) return;
    try {
      const phone = cle9(
        a.ownerWhatsapp || a.whatsapp || vendeurInfo?.wa || ""
      );
      if (!phone) return;
      const base =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://wenze.cd";
      const lien = `${base}/produit/${encodeURIComponent(a.id)}`;
      const prixUnitaire = safePrix(a.prixUSD || a.prix);
      const prixGrosUnitaire = safePrix(a.prixGrosUSD || a.prixGros);

      const lignePrix =
        estGros && peutVoirGros
          ? `- Prix gros : ${usd(prixGrosUnitaire)} / ${safeCDF(
              prixGrosUnitaire
            )} / ${a.uniteGros || "carton"} (Min ${a.minimumCommande || 10})\n- Prix détail : ${usd(
              prixUnitaire
            )} / ${safeCDF(prixUnitaire)}`
          : estGros
          ? `- Prix détail : ${usd(prixUnitaire)} / ${safeCDF(prixUnitaire)}`
          : `- Prix affiché : ${usd(prixUnitaire)} / ${safeCDF(prixUnitaire)}`;

      const msg = `Bonjour,\n\nJe vous contacte depuis Wenze Wenze (0 % commission).\n\nArticle : ${
        a.titre || "Article"
      }\n${lignePrix}\n- Référence : ${a.id}\n\nLien : ${lien}`;

      tracerProduitJournal(
        "PRODUIT_WHATSAPP_CLIC",
        String(a.id),
        cle9(user?.ownerWhatsapp || user?.whatsapp || "")
      );
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch {}
  };

  const handleAdd = () => {
    if (!a) return;
    if (estGros && !peutVoirGros) {
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
      return;
    }
    try {
      const panier = readList("wenze_panier");
      if (panier.some((p: any) => String(p.id) === String(a.id))) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        return;
      }
      const minGros = estGros ? Number(a.minimumCommande || 10) : 1;
      const prixRef =
        estGros && peutVoirGros
          ? safePrix(a.prixGrosUSD || a.prixGros)
          : safePrix(a.prixUSD || a.prix);

      panier.push({
        ...a,
        qty: minGros,
        quantite: minGros,
        typeAnnonce: a.typeAnnonce,
        prixGros: safePrix(a.prixGrosUSD || a.prixGros),
        uniteGros: a.uniteGros || "Carton",
        minimumCommande: minGros,
        prixAffiche: prixRef,
      });
      writeList("wenze_panier", panier);
      tracerProduitJournal(
        "PRODUIT_PANIER_AJOUT",
        String(a.id),
        cle9(user?.ownerWhatsapp || user?.whatsapp || "")
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("wenze-update"));
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      const base =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://wenze.cd";
      const lien = `${base}/produit/${encodeURIComponent(id)}`;
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(lien);
      }
      tracerProduitJournal(
        "PRODUIT_LIEN_COPIE",
        String(id),
        cle9(user?.ownerWhatsapp || user?.whatsapp || "")
      );
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center font-black">
        Chargement du produit...
      </div>
    );
  }

  if (bloqueClient) {
    return (
      <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">
        <div className="bg-white border rounded-[20px] p-8 mt-10">
          <p className="text-3xl">⭐</p>
          <p className="font-black mt-2">Boutique pas encore vérifiée</p>
          <p className="text-[11px] text-gray-500 mt-2">
            Cette boutique n&apos;a pas encore été recommandée sur Wenze Wenze.
          </p>
          <Link
            href="/"
            className="mt-4 block bg-black text-white py-3 rounded-full font-black text-[11px]"
          >
            ← Voir les boutiques vérifiées
          </Link>
          <Link
            href="/recommandes"
            className="mt-2 block bg-white border-2 border-black py-3 rounded-full font-black text-[11px]"
          >
            Voir les recommandés
          </Link>
        </div>
      </div>
    );
  }

  if (notFound || !a) {
    return (
      <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen p-6 text-center">
        <div className="bg-white border rounded-[20px] p-8 mt-10">
          <p className="text-3xl">😕</p>
          <p className="font-black mt-2">Produit indisponible ou introuvable</p>
          <p className="text-[11px] text-gray-500 mt-2">
            Référence : <b>{id}</b>
          </p>
          <Link
            href="/"
            className="mt-4 block bg-black text-white py-3 rounded-full font-black text-[11px]"
          >
            ← Retour accueil
          </Link>
          <Link
            href="/boutiques"
            className="mt-2 block bg-white border-2 border-black py-3 rounded-full font-black text-[11px]"
          >
            Voir boutiques
          </Link>
        </div>
      </div>
    );
  }

  const waVendeur = cle9(a.ownerWhatsapp || a.whatsapp || a.userId);
  const nomBoutique =
    vendeurInfo?.nomBoutique ||
    vendeurInfo?.boutiqueName ||
    a.boutiqueName ||
    `Boutique ${waVendeur.slice(-4)}`;
  const prixPrincipal = safePrix(a.prixUSD || a.prix);
  const prixGrosPrincipal = safePrix(a.prixGrosUSD || a.prixGros);

  return (
    <div className="max-w-[430px] mx-auto bg-[#FFFBF0] min-h-screen pb-28">
      <header className="sticky top-0 bg-white z-20 p-4 border-b flex items-center gap-3">
        <Link
          href="/boutiques"
          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-[13px] truncate">{a.titre}</h1>
          <p className="text-[10px] text-gray-500 truncate">
            Réf. : {a.id} • 0 % commission
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyLink}
          className="text-[10px] font-black bg-black text-white px-3 py-1.5 rounded-full"
        >
          {added ? "✅ Copié" : "🔗 Copier lien"}
        </button>
      </header>

      <div className="p-4">
        <div className="bg-white border-2 border-black rounded-[20px] overflow-hidden">
          {a.video || a.videoUrl ? (
            <video
              src={a.video || a.videoUrl}
              controls
              playsInline
              className="w-full aspect-square object-cover bg-black"
            />
          ) : a.photo ? (
            <img
              src={a.photo}
              alt={a.titre}
              className="w-full aspect-square object-cover"
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-4xl">
              📦
            </div>
          )}

          <div className="p-4">
            <div className="flex gap-1.5">
              {estGros ? (
                <span className="text-[9px] bg-orange-500 text-white px-2 py-1 rounded-full font-black">
                  🏭 PRODUIT GROS
                </span>
              ) : null}
              {a.recommandeParDG ? (
                <span className="text-[9px] bg-yellow-400 px-2 py-1 rounded-full font-black">
                  ⭐ RECOMMANDÉ
                </span>
              ) : null}
            </div>

            <p className="font-black text-[16px] mt-2">{a.titre}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              {a.commune || "Kinshasa"} •{" "}
              {a.marque || vendeurInfo?.marque || "Commerce général"}
            </p>
            <p className="font-black text-[17px] mt-2">
              {usd(prixPrincipal)} / {safeCDF(prixPrincipal)}
            </p>
            <p className="text-[10px] text-gray-500">
              Prix détail • Taux {TAUX_CDF} CDF/$ • 0 % commission
            </p>

            {estGros ? (
              peutVoirGros ? (
                <div className="bg-orange-50 border border-orange-300 rounded-xl p-3 mt-3">
                  <p className="font-black text-[12px] text-orange-700">
                    🏭 Prix gros : {usd(prixGrosPrincipal)} /{" "}
                    {safeCDF(prixGrosPrincipal)} / {a.uniteGros || "carton"}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    Commande minimum : {a.minimumCommande || 10}{" "}
                    {a.uniteGros || "cartons"}
                  </p>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-300 rounded-xl p-3 mt-3">
                  <p className="font-black text-[12px]">
                    🔒 Prix gros réservé aux Grossistes et au DG
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Accès restreint aux comptes Grossiste et DG.
                  </p>
                </div>
              )
            ) : null}

            <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
              {a.description ||
                "Article disponible à Kinshasa. Contactez le vendeur pour disponibilité et stock."}
            </p>

            <div className="bg-[#FFF2CC] rounded-xl p-3 mt-3 text-[10px]">
              <p className="font-black">Référence : {a.id}</p>
              <p className="text-gray-600 mt-0.5">
                0 % commission • Max {PLAFOND_ACTIVES} annonces actives
              </p>
            </div>
          </div>
        </div>

        <Link
          href={`/boutiques/${waVendeur}`}
          className="bg-white border-2 rounded-[20px] p-3 mt-3 flex gap-3 items-center"
        >
          <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-black overflow-hidden shrink-0">
            {vendeurInfo?.photo ? (
              <img
                src={vendeurInfo.photo}
                alt={nomBoutique}
                className="w-full h-full object-cover"
                         />
            ) : (
              nomBoutique.replace(/^Boutiques\s*/i, "")[0] || "B"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[13px] truncate">{nomBoutique}</p>
            <p className="text-[10px] text-gray-500">
              0{waVendeur.slice(-9)} • Voir boutique ›
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleWhatsApp}
          className="w-full mt-3 bg-[#25D366] text-white py-4 rounded-full font-black text-[12px]"
        >
          💬 Commander sur WhatsApp
        </button>

        <button
          type="button"
          onClick={handleAdd}
          disabled={estGros && !peutVoirGros}
          className="w-full mt-2 bg-black text-white py-3 rounded-full font-black text-[11px] disabled:opacity-60"
        >
          {estGros && !peutVoirGros
            ? "🔒 Panier gros : Grossiste / DG uniquement"
            : added
            ? "✅ Ajouté au panier"
            : "🛒 Ajouter au panier"}
        </button>

        {isOwnerMe ? (
          <Link
            href={`/publier?edit=${encodeURIComponent(a.id)}`}
            className="mt-2 block bg-white border-2 border-black py-3 rounded-full font-black text-[11px] text-center"
          >
            ✏️ Modifier mon annonce
          </Link>
        ) : null}

        {related.length > 0 ? (
          <div className="mt-5">
            <p className="font-black text-[13px] mb-2">Même boutique</p>
            <div className="grid grid-cols-2 gap-2">
              {related.map((r: any) => {
                const pRel = safePrix(r.prixUSD || r.prix);
                return (
                  <Link
                    key={r.id}
                    href={`/produit/${encodeURIComponent(r.id)}`}
                    className="bg-white border rounded-xl overflow-hidden block"
                  >
                    {r.photo ? (
                      <img
                        src={r.photo}
                        alt={r.titre}
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center">
                        📦
                      </div>
                    )}
                    <div className="p-2">
                      <p className="font-bold text-[11px] truncate">{r.titre}</p>
                      <p className="text-[10px]">
                        {usd(pRel)} / {safeCDF(pRel)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {similaires.length > 0 ? (
          <div className="mt-5">
            <div className="bg-white border rounded-[20px] p-3">
              <p className="font-black text-[13px]">🔥 Produits similaires</p>
              <p className="text-[10px] text-gray-500">
                Même catégorie • Même commune • Prix proche
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {similaires.map((r: any) => {
                  const pSim = safePrix(r.prixUSD || r.prix);
                  return (
                    <Link
                      key={r.id}
                      href={`/produit/${encodeURIComponent(r.id)}`}
                      className="bg-[#FFFBF0] border rounded-xl overflow-hidden block"
                    >
                      {r.photo ? (
                        <img
                          src={r.photo}
                          alt={r.titre}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center">
                          📦
                        </div>
                      )}
                      <div className="p-2">
                        <p className="font-bold text-[11px] truncate">
                          {r.titre}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {r.commune || "Kinshasa"}
                        </p>
                        <p className="text-[11px] font-black">
                          {usd(pSim)} / {safeCDF(pSim)}
                        </p>
                        {r.recommandeParDG ? (
                          <span className="text-[8px] bg-yellow-400 px-1.5 py-0.5 rounded-full font-black">
                            ⭐ RECOMMANDÉ
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {aussiVu.length > 0 ? (
          <div className="mt-4">
            <p className="font-black text-[13px] mb-2">
              👀 Les autres ont aussi vu
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {aussiVu.map((r: any) => {
                const pVu = safePrix(r.prixUSD || r.prix);
                return (
                  <Link
                    key={r.id}
                    href={`/produit/${encodeURIComponent(r.id)}`}
                    className="min-w-[140px] bg-white border rounded-xl overflow-hidden block"
                  >
                    {r.photo ? (
                      <img
                        src={r.photo}
                        alt={r.titre}
                        className="w-full h-[110px] object-cover"
                      />
                    ) : (
                      <div className="w-full h-[110px] flex items-center justify-center">
                        📦
                      </div>
                    )}
                    <div className="p-2">
                      <p className="font-bold text-[11px] truncate">{r.titre}</p>
                      <p className="text-[10px]">
                        {usd(pVu)} / {safeCDF(pVu)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full mt-4 py-3 rounded-full font-black text-[11px] text-white"
          style={{ background: designPub.main || "#FF6B00" }}
        >
          🔔 Voir plus de suggestions à Kinshasa →
        </button>
      </div>

      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-[9px] font-bold whitespace-nowrap">
        WENZE WENZE • {a.id}
      </div>
    </div>
  );
}
