// lib/session.ts - Session WENZE 12h
export const DUREE_SESSION_MS = 12 * 60 * 60 * 1000; // 12h
export const CLE_SESSION = "wenze_session";

export type WenzeRole =
  | "DG"
  | "SUPERVISEUR"
  | "AMBASSADEUR"
  | "BOUTIQUE"
  | "CLIENT"
  | (string & {});

export interface SessionPayload<T = Record<string, unknown>> {
  role: WenzeRole;
  data: T;
  debut: number;
  expire: number;
}

function estNavigateur(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function demarrerSession<T = Record<string, unknown>>(
  role: WenzeRole,
  data: T
): SessionPayload<T> {
  const maintenant = Date.now();
  const session: SessionPayload<T> = {
    role,
    data,
    debut: maintenant,
    expire: maintenant + DUREE_SESSION_MS,
  };

  if (estNavigateur()) {
    try {
      window.localStorage.setItem(CLE_SESSION, JSON.stringify(session));
    } catch {
      // Ignore si le stockage local est indisponible ou plein
    }
  }

  return session;
}

export function verifierSession<T = Record<string, unknown>>(): SessionPayload<T> | null {
  if (!estNavigateur()) return null;

  try {
    const raw = window.localStorage.getItem(CLE_SESSION);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SessionPayload<T>>;
    if (
      typeof parsed?.role !== "string" ||
      typeof parsed?.expire !== "number" ||
      Number.isNaN(parsed.expire)
    ) {
      window.localStorage.removeItem(CLE_SESSION);
      return null;
    }

    if (Date.now() > parsed.expire) {
      window.localStorage.removeItem(CLE_SESSION);
      return null;
    }

    return parsed as SessionPayload<T>;
  } catch {
    try {
      window.localStorage.removeItem(CLE_SESSION);
    } catch {
      // Ignore
    }
    return null;
  }
}

export function quitterSession(redirectTo = "/"): void {
  if (estNavigateur()) {
    try {
      window.localStorage.removeItem(CLE_SESSION);
    } catch {
      // Ignore
    }
    window.location.href = redirectTo;
  }
}

export function tempsRestant(): string | null {
  const session = verifierSession();
  if (!session) return null;

  const reste = Math.max(0, session.expire - Date.now());
  const h = Math.floor(reste / 3_600_000);
  const m = Math.floor((reste % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}
  
