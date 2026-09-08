# Respotify

Move a Spotify library from one account to another.

Connect **source** and **destination** through Spotify's own login (Authorization Code + PKCE). Tokens stay in the browser. Nothing is written to our servers.

This is the Tuneferry-class engine for [brinza666/respotifyfree](https://github.com/brinza666/respotifyfree).

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

A Spotify privacy-export JSON can be imported and reconstructed as a playlist. That is still not real listening history on the destination account.

## Live setup

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. Add the Redirect URI shown in Respotify (your origin + `/callback`).
3. Paste the **Client ID** into Respotify. No client secret — PKCE is public.
4. Connect source, then destination. On the second login tap **Not you** and sign into the other account.
5. Pick catalogs, transfer, optionally download a `respotify-backup.json`.

Without a Client ID, **Run demo transfer** walks the full wizard on a fixture library.

## Engine

| File | Role |
|---|---|
| `src/lib/spotify/pkce.ts` | Dual-account PKCE |
| `src/lib/spotify/live.ts` | Web API grab + write + 429 pacer |
| `src/lib/spotify/transfer.ts` | Catalog pipeline |
| `src/lib/spotify/demo.ts` | Demo writer |
| `src/lib/spotify/backup.ts` | JSON backup / GDPR parse |

Auth is official OAuth only. Cookie or password capture is not supported and will not be added.

## License

Use it on your own Spotify Developer app. Respect [Spotify Developer Terms](https://developer.spotify.com/terms).
