import type { Role } from "./types";

const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-library-read",
  "user-library-modify",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-follow-read",
  "user-follow-modify",
  "user-read-recently-played",
  "user-top-read",
].join(" ");

function randomString(length: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let raw = "";
  view.forEach((b) => {
    raw += String.fromCharCode(b);
  });
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Base64Url(plain: string) {
  const data = new TextEncoder().encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64Url(hash);
}

export function redirectUri() {
  const base = import.meta.env.BASE_URL || "/";
  const path = `${base}callback`.replace(/\/{2,}/g, "/");
  return `${window.location.origin}${path}`;
}

export function configuredClientId() {
  return (import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "").trim();
}

export function clientId() {
  if (typeof window === "undefined") return configuredClientId();
  return window.localStorage.getItem("respotify.clientId")?.trim() || configuredClientId();
}

export function setClientId(id: string) {
  if (typeof window === "undefined") return;
  const next = id.trim();
  if (next) window.localStorage.setItem("respotify.clientId", next);
  else window.localStorage.removeItem("respotify.clientId");
}

export function seedClientId() {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem("respotify.clientId") && configuredClientId()) {
    window.localStorage.setItem("respotify.clientId", configuredClientId());
  }
}

export async function startLogin(role: Role) {
  const id = clientId();
  if (!id) throw new Error("Add a Spotify Client ID first, or use demo mode.");

  const verifier = randomString(64);
  const challenge = await sha256Base64Url(verifier);
  const nonce = randomString(24);
  const state = base64Url(
    new TextEncoder().encode(JSON.stringify({ role, nonce, ts: Date.now() })),
  );

  sessionStorage.setItem(`respotify.pkce.${role}`, verifier);
  sessionStorage.setItem("respotify.pkce.state", state);

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", id);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");

  window.location.assign(url.toString());
}

export function parseState(raw: string | null): { role: Role; nonce: string } | null {
  if (!raw) return null;
  try {
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(padded));
    if (json.role !== "source" && json.role !== "destination") return null;
    return { role: json.role, nonce: String(json.nonce ?? "") };
  } catch {
    return null;
  }
}

export async function exchangeCode(code: string, role: Role) {
  const id = clientId();
  const verifier = sessionStorage.getItem(`respotify.pkce.${role}`);
  if (!id || !verifier) throw new Error("Login session expired. Connect again.");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    client_id: id,
    code_verifier: verifier,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    const msg = data.error_description || data.error || `Token exchange failed (${res.status})`;
    if (/invalid redirect/i.test(msg) || data.error === "invalid_client") {
      throw new Error(
        "Spotify rejected the redirect URI. Add this exact URI in your Spotify Dashboard: " +
          redirectUri(),
      );
    }
    throw new Error(msg);
  }

  sessionStorage.removeItem(`respotify.pkce.${role}`);
  sessionStorage.removeItem("respotify.pkce.state");

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const id = clientId();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: id,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Spotify session expired. Connect again.");
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
}
