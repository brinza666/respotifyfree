# Respotify

Move a Spotify library from one account to another.

Connect **source** and **destination** through Spotify’s own login (Authorization Code + PKCE). Tokens stay in the browser. Nothing is written to our servers.

Engine: [brinza666/respotifyfree](https://github.com/brinza666/respotifyfree).

## Develop here

```
cd /home/brinza/Work/respotifyfree
mise trust
npm install
npm run dev          # http://127.0.0.1:8080
npm run typecheck
npm run setup:android
npm run build:apk    # releases/respotify-debug.apk
```

Register `http://127.0.0.1:8080/callback` (and later your HTTPS origin + `/callback`) in the Spotify Dashboard.

## Android

This repo is the **background engine**. The phone UI is the same web app (Add to Home screen in Chrome).

`android/` is a Kotlin **WebView + Chrome Custom Tabs** host. Open it in Android Studio to build an APK. Spotify login must use Custom Tabs — an embedded WebView login is blocked.

Set `engine_url` in `android/app/src/main/res/values/strings.xml` to the HTTPS origin of this app, and register `https://<that-origin>/callback` in the Spotify Dashboard.

## What copies

| Catalog | Copied? |
|---|---|
| Owned playlists (track order kept) | Yes |
| Followed playlists | Follow, or copy as new |
| Liked songs (optional original order) | Yes |
| Saved albums | Yes |
| Followed artists | Yes |
| Podcast subscriptions | Yes |
| Saved episodes | Yes |
| Recently played | Saved as a playlist archive |
| Listening history / Wrapped / algorithm / followers | **No** — Spotify has no write API |

## Live setup

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. Add the Redirect URI shown in Respotify (your origin + `/callback`).
3. Paste the **Client ID**. No client secret — PKCE is public.
4. Connect source, then destination. On the second login tap **Not you**.
5. Pick catalogs, transfer, optionally download a `respotify-backup.json`.

Without a Client ID, **Run demo transfer** walks the full wizard on a fixture library.

Auth is official OAuth only. Cookie or password capture is not supported.

## License

Use it on your own Spotify Developer app. Respect [Spotify Developer Terms](https://developer.spotify.com/terms).
