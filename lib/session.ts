export type RoleEquipe = "SUPERVISEUR" | "AMBASSADEUR";

export type SessionEquipePayload = {
  id?: string | number;
  nom?: string;
  role: RoleEquipe;
  code_pro?: string;
  codePro?: string;
  telephone?: string;
  province?: string;
  commune?: string;
  village?: string;
  chefCode?: string;
  debut: number;
};

const DUREE_SESSION_MS = 12 * 60 * 60 * 1000;
const CLE_SESSION = "wenze_session";

function lireConfigPubliqueSession(): Record<string, any> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("wenze_config_publique");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function journaliserSession(
  action: "SESSION_DEMARREE" | "SESSION_QUITTEE",
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
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export function demarrerSession(
  role: string,
  data: Record<string, any>
): SessionEquipePayload | null {
  try {
    if (typeof window === "undefined") return null;
    const roleUpper = String(role || "").toUpperCase();
    if (roleUpper !== "SUPERVISEUR" && roleUpper !== "AMBASSADEUR") {
      return null;
    }

    const cfg = lireConfigPubliqueSession();
    const dureeMinutes = Number(cfg?.dureeSessionEquipeMinutes || 0);
    const dureeEffective =
      dureeMinutes > 0 ? dureeMinutes * 60 * 1000 : DUREE_SESSION_MS;

    const codePro = data?.code_pro || data?.codePro || "";
    const payload: SessionEquipePayload = {
      ...data,
      role: roleUpper as RoleEquipe,
      code_pro: codePro,
      codePro,
      debut: Date.now(),
    };

    localStorage.setItem(
      CLE_SESSION,
      JSON.stringify({
        role: roleUpper,
        debut: payload.debut,
        expireAt: payload.debut + dureeEffective,
        data: payload,
      })
    );
    localStorage.setItem("wenze_membre", JSON.stringify(payload));
    localStorage.setItem("wenze_role", roleUpper);

    if (typeof document !== "undefined") {
      document.cookie = `wenze-role=${roleUpper}; path=/; max-age=43200; SameSite=Lax`;
    }

    journaliserSession("SESSION_DEMARREE", `${roleUpper}:${codePro}`);
    return payload;
  } catch {
    return null;
  }
}

export function verifierSession(): {
  valide: boolean;
  role?: RoleEquipe;
  debut?: number;
  expireAt?: number;
  data?: SessionEquipePayload;
} | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(CLE_SESSION);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const roleUpper = String(
      parsed?.role || parsed?.data?.role || ""
    ).toUpperCase();
    if (roleUpper !== "SUPERVISEUR" && roleUpper !== "AMBASSADEUR") {
      return null;
    }

    const cfg = lireConfigPubliqueSession();
    const dureeMinutes = Number(cfg?.dureeSessionEquipeMinutes || 0);
    const dureeEffective =
      dureeMinutes > 0 ? dureeMinutes * 60 * 1000 : DUREE_SESSION_MS;

    const debut = Number(parsed?.debut || parsed?.data?.debut || 0);
    const expireAt = Number(
      parsed?.expireAt || (debut > 0 ? debut + dureeEffective : 0)
    );

    if (!debut || Date.now() > expireAt) {
      quitterSession(false);
      return null;
    }

    const data: SessionEquipePayload = {
      ...(parsed?.data || parsed),
      role: roleUpper as RoleEquipe,
      debut,
    };

    return {
      valide: true,
      role: roleUpper as RoleEquipe,
      debut,
      expireAt,
      data,
    };
  } catch {
    return null;
  }
}

export function tempsRestant(): string {
  const s = verifierSession();
  if (!s || !s.valide || !s.expireAt) return "0h 00min";
  const rest = Math.max(0, s.expireAt - Date.now());
  const h = Math.floor(rest / 3600000);
  const m = Math.floor((rest % 3600000) / 60000);
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

export function quitterSession(rediriger = true): void {
  try {
    if (typeof window === "undefined") return;
    const cur = verifierSession();
    if (cur?.data) {
      journaliserSession(
        "SESSION_QUITTEE",
        `${cur.role}:${cur.data.code_pro || cur.data.codePro || ""}`
      );
    }
    localStorage.removeItem(CLE_SESSION);
    localStorage.removeItem("wenze_membre");
    localStorage.removeItem("wenze_role");
    if (typeof document !== "undefined") {
      document.cookie = "wenze-role=; path=/; max-age=0";
    }
    if (rediriger && typeof window.location !== "undefined") {
      window.location.href = "/equipe";
    }
  } catch {}
  }
