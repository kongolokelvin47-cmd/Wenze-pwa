// lib/session.ts - Session WENZE 12h
const DUREE = 12 * 60 * 60 * 1000; // 12h

export function demarrerSession(role: string, data: any) {
  const session = {
    role,
    data,
    debut: Date.now(),
    expire: Date.now() + DUREE,
  };
  localStorage.setItem('wenze_session', JSON.stringify(session));
  return session;
}

export function verifierSession() {
  try {
    const raw = localStorage.getItem('wenze_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() > s.expire) {
      localStorage.removeItem('wenze_session');
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function quitterSession() {
  localStorage.removeItem('wenze_session');
  window.location.href = '/';
}

export function tempsRestant() {
  const s = verifierSession();
  if (!s) return 0;
  const reste = s.expire - Date.now();
  const h = Math.floor(reste / 3600000);
  const m = Math.floor((reste % 3600000) / 60000);
  return `${h}h ${m}m`;
}
