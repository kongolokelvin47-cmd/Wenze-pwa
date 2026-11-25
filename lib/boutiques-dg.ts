import { createClient } from "@supabase/supabase-js";
import { cle9 } from "@/lib/connexion";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
} from "@/lib/paiement-base";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

const supabase: any =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : null;

export type BoutiqueDG = {
  id: string;
  nom: string;
  nomEtablissement: string;
  proprietaire: string;
  whatsapp: string;
  ownerWhatsapp: string;
  telephone: string;
  role: string;
  pays?: string;
  province?: string;
  commune: string;
  quartier: string;
  categorieId: string;
  activite: string;
  statut: "EN_ATTENTE" | "ACTIF" | "SUSPENDU" | "MASQUE";
  is_visible: boolean;
  isEssai: boolean;
  createdAt: string;
  code_amb?: string;
  resumeTarif: string;
};

function safeReadArray(key: string): any[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeReadObject(key: string): any | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function journaliserBoutiqueDG(
  action: "DG_SYNC_BOUTIQUES_ESSAI" | "BOUTIQUE_CREEE_SYNC_DG",
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
      acteurWhatsapp: acteurWa,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export function normaliserBoutiquePourDG(raw: any): BoutiqueDG | null {
  if (!raw || typeof raw !== "object") return null;
  const waClean = cle9(
    raw.ownerWhatsapp || raw.whatsapp || raw.telephone || raw.phone || ""
  );
  const nom = String(
    raw.nomEtablissement ||
      raw.nom ||
      raw.nomBoutique ||
      raw.vendor_name ||
      ""
  ).trim();

  if (!nom && !waClean) return null;

  const createdAt = String(
    raw.createdAt || raw.created_at || new Date().toISOString()
  );
  const ts = new Date(createdAt).getTime();
  const ageJours = ts > 0 ? (Date.now() - ts) / (1000 * 60 * 60 * 24) : 0;
  const palier = String(raw.palierId || "").toUpperCase();
  const estFreemiumExpire =
    ageJours > FREE_DAYS &&
    !raw.abonnementActif &&
    palier !== "STANDARD" &&
    palier !== "PRO" &&
    palier !== "PREMIUM";

  const isVisible =
    raw.is_visible === false || estFreemiumExpire ? false : true;

  const statutRaw = String(raw.statut || "").toUpperCase();
  const statut: BoutiqueDG["statut"] = !isVisible
    ? "MASQUE"
    : statutRaw === "SUSPENDU"
    ? "SUSPENDU"
    : statutRaw === "EN_ATTENTE"
    ? "EN_ATTENTE"
    : "ACTIF";

  const id = String(
    raw.id || (waClean ? `B-${waClean}` : `B-${Date.now()}`)
  );

  return {
    id,
    nom: nom || `Boutique ${waClean || id}`,
    nomEtablissement: nom || `Boutique ${waClean || id}`,
    proprietaire: String(raw.proprietaire || raw.nom || nom || "Propriétaire"),
    whatsapp: waClean,
    ownerWhatsapp: waClean,
    telephone: String(raw.telephone || raw.whatsapp || waClean || ""),
    role: String(raw.role || "vendeur"),
    pays: String(raw.pays || "République Démocratique du Congo (RDC)"),
    province: String(raw.province || "Kinshasa"),
    commune: String(raw.commune || "Kinshasa"),
    quartier: String(raw.quartier || ""),
    categorieId: String(
      raw.categorieId || raw.categorie_id || "commerces-services"
    ),
    activite: String(raw.activite || raw.activiteId || ""),
    statut,
    is_visible: isVisible,
    isEssai: Boolean(raw.isEssai || raw.essai || statutRaw === "ESSAI"),
    createdAt,
    code_amb: raw.code_amb || raw.codeAmb || undefined,
    resumeTarif: `0 % comm • Max ${MAX_FREE_IMAGES} img / ${FREE_DAYS}j • Min ${usd(
      1
    )} (${toCDFString(1)}) • Taux ${TAUX_CDF}`,
  };
}

export async function synchroniserEtChargerBoutiquesDG(): Promise<BoutiqueDG[]> {
  if (typeof window === "undefined") return [];

  const sources: any[] = [
    ...safeReadArray("wenze_dg_boutiques"),
    ...safeReadArray("wenze_all_users"),
    ...safeReadArray("wenze_boutiques_essai"),
    ...safeReadArray("wenze_boutiques"),
  ];

  const userCourant = safeReadObject("wenze_user");
  if (userCourant) sources.push(userCourant);

  if (supabase) {
    try {
      const { data } = await supabase
        .from("boutiques")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PLAFOND_ACTIVES);
      if (Array.isArray(data)) {
        sources.push(...data);
      }
    } catch {}
  }

  const map = new Map<string, BoutiqueDG>();
  for (const item of sources) {
    const norm = normaliserBoutiquePourDG(item);
    if (!norm) continue;
    const cle = norm.ownerWhatsapp || norm.id;
    const existant = map.get(cle);
    if (!existant) {
      map.set(cle, norm);
    } else {
      map.set(cle, {
        ...existant,
        ...norm,
        nom: norm.nom || existant.nom,
        nomEtablissement: norm.nomEtablissement || existant.nomEtablissement,
        commune: norm.commune !== "Kinshasa" ? norm.commune : existant.commune,
        quartier: norm.quartier || existant.quartier,
        statut: norm.statut,
        is_visible: norm.is_visible,
      });
    }
  }

  const resultat = Array.from(map.values())
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )
    .slice(0, PLAFOND_ACTIVES);

  try {
    localStorage.setItem("wenze_dg_boutiques", JSON.stringify(resultat));
    localStorage.setItem("wenze_all_users", JSON.stringify(resultat));
  } catch {}

  journaliserBoutiqueDG(
    "DG_SYNC_BOUTIQUES_ESSAI",
    cle9(userCourant?.ownerWhatsapp || userCourant?.whatsapp || ""),
    `total:${resultat.length}`
  );

  return resultat;
}

export async function enregistrerBoutiqueEtNotifierDG(
  boutiqueInput: Record<string, any>
): Promise<BoutiqueDG | null> {
  if (typeof window === "undefined") return null;

  const norm = normaliserBoutiquePourDG({
    ...boutiqueInput,
    createdAt: boutiqueInput?.createdAt || new Date().toISOString(),
  });
  if (!norm) return null;

  const actuelles = safeReadArray("wenze_dg_boutiques");
  const allUsers = safeReadArray("wenze_all_users");

  const filtrerSansDoublon = (arr: any[]) =>
    arr.filter((x: any) => {
      const waX = cle9(x?.ownerWhatsapp || x?.whatsapp || x?.telephone || "");
      const cleX = waX || String(x?.id || "");
      const cleN = norm.ownerWhatsapp || norm.id;
      return cleX !== cleN;
    });

  const nextDG = [norm, ...filtrerSansDoublon(actuelles)].slice(
    0,
    PLAFOND_ACTIVES
  );
  const nextUsers = [norm, ...filtrerSansDoublon(allUsers)].slice(0, 500);

  try {
    localStorage.setItem("wenze_dg_boutiques", JSON.stringify(nextDG));
    localStorage.setItem("wenze_all_users", JSON.stringify(nextUsers));
  } catch {}

  if (supabase) {
    try {
      await supabase.from("boutiques").upsert({
        id: norm.id,
        nom: norm.nom,
        proprietaire: norm.proprietaire,
        telephone: norm.telephone,
        commune: norm.commune,
        quartier: norm.quartier,
        statut: norm.statut,
        is_visible: norm.is_visible,
        code_amb: norm.code_amb || null,
        created_at: norm.createdAt,
      });
    } catch {}
  }

  journaliserBoutiqueDG(
    "BOUTIQUE_CREEE_SYNC_DG",
    norm.ownerWhatsapp,
    `${norm.id}:${norm.nom}`
  );

  return norm;
}
                                         
