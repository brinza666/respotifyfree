# Respotify

Move a Spotify library from one account to another.

Open the app: **[brinza666.github.io/respotifyfree](https://brinza666.github.io/respotifyfree/)**

You sign in to Spotify twice — **source** (the account you are leaving), then **destination** (the account that receives the library). On the second login tap **Not you**. Tokens stay in your browser. Nothing is uploaded to our servers.

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
| Radio / Popular (hidden by Spotify) | Rebuilt from search when songs can be found |
| Daily Mix / Discover Weekly / Made For You | No — Spotify hides those tracks |
| Listening history / Wrapped / algorithm / followers | No — Spotify has no write API |

## How to use

1. Open [the app](https://brinza666.github.io/respotifyfree/).
2. Connect source, then destination.
3. Pick catalogs and start the transfer.
4. Optionally download a `respotify-backup.json`.

A **demo transfer** is available if you only want to see the wizard.

Auth is official Spotify OAuth (Authorization Code + PKCE). Cookie or password capture is not supported.

## Phone

In Chrome: menu → **Add to Home screen**. Login still uses Spotify’s own page.

## Privacy

Client ID is a public OAuth identifier. Access tokens never leave your device. Respotify is not affiliated with Spotify. Use it with your own Spotify Developer app and respect the [Spotify Developer Terms](https://developer.spotify.com/terms).
