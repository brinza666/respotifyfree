import type { Role, Session } from "./types";

const key = (role: Role) => `respotify.${role}`;

export function readSession(role: Role): Session | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(key(role));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function writeSession(session: Session) {
  sessionStorage.setItem(key(session.role), JSON.stringify(session));
}

export function clearSession(role: Role) {
  sessionStorage.removeItem(key(role));
}

export function clearAllSessions() {
  clearSession("source");
  clearSession("destination");
}
