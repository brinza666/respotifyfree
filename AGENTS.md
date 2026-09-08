# Respotify

Move a Spotify library from one account to another. Official OAuth (Authorization Code + PKCE) only. Tokens stay in the browser. No cookie or password capture.

## Layout

| Path | Role |
|---|---|
| `src/lib/spotify/*` | Engine: PKCE, grab, write, backup, demo fixture |
| `src/components/respotify-app.tsx` | Wizard UI |
| `src/routes/` | TanStack Start file routes (`/`, `/callback`) |
| `android/` | Kotlin WebView + Chrome Custom Tabs host |

## Commands

- Web: `npm run dev` (http://0.0.0.0:8080), `npm run typecheck`, `npm run build`
- Android SDK (once): `npm run setup:android`
- APK: `npm run build:apk` → `releases/respotify-debug.apk`

Toolchain is pinned in `mise.toml` (Temurin 17 + Gradle 8.11.1). Android SDK lives in `~/Android/Sdk`.

## Rules

- Keep Spotify login out of the WebView. Custom Tabs only (`accounts.spotify.com`).
- Public PKCE client: Client ID in localStorage, never a client secret.
- Do not invent write APIs for Wrapped, algorithm mixes, or followers — Spotify has none.
- Match existing UI tokens in `src/styles.css` (`bg`, `primary`, Figtree + Newsreader).
- Android `compileSdk` / `targetSdk` 35, `minSdk` 26, package `app.respotify`.
- Do not commit `android/local.properties`, debug keystores, or `.env` files.

## Live Spotify setup

1. Create an app at https://developer.spotify.com/dashboard
2. Redirect URI = origin + `/callback` (local: `http://127.0.0.1:8080/callback`)
3. Paste the Client ID in the app Setup tab

Without a Client ID, **Run demo transfer** walks the wizard on a fixture library.
