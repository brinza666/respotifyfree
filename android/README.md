# Respotify Android host

This folder is a **WebView + Chrome Custom Tabs** shell around the TypeScript
engine in `src/lib/spotify`. It does not copy a library by itself.

Build an APK from the repo root:

```
npm run setup:android   # once — JDK 17, Gradle, and ~/Android/Sdk
npm run build:apk       # writes releases/respotify-debug.apk
```

Or open `android/` in Android Studio. Debug builds may load `http://` engine URLs on the local network; release still requires HTTPS.

## Engine URL

`app/src/main/res/values/strings.xml` → `engine_url`

Paste the HTTPS origin where Respotify is hosted (this Grok preview origin, or
your later deploy). Register that origin + `/callback` in the Spotify Dashboard.

Spotify login **must** leave the WebView. The host intercepts
`accounts.spotify.com` and opens Custom Tabs. A WebView login will fail.

## What it uses from git

| Path | Role |
|---|---|
| `src/lib/spotify/*` | PKCE, grab, write, backup — the engine |
| This `android/` folder | Kotlin host only |

## Scopes and honesty

Same as the web app. History / Wrapped / algorithm / followers cannot be written.
