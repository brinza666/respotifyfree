import { refreshAccessToken } from "./pkce";
import {
  isMadeForYou,
  parseArtistStation,
  pickPlaylistMatch,
  pickTrackMatch,
  trackSearchQuery,
} from "./reconstruct";
import { readSession, writeSession } from "./session";
import type { Writer } from "./transfer";
import type {
  AlbumRef,
  ArtistRef,
  EpisodeRef,
  LibrarySnapshot,
  PlaylistRef,
  Role,
  Session,
  ShowRef,
  SpotifyUser,
  TrackRef,
} from "./types";

const API = "https://api.spotify.com/v1";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureFresh(session: Session) {
  if (!session.refreshToken || !session.expiresAt) return session;
  if (Date.now() < session.expiresAt) return session;
  const next = await refreshAccessToken(session.refreshToken);
  const updated: Session = { ...session, ...next };
  writeSession(updated);
  return updated;
}

export async function spotifyFetch(
  role: Role,
  path: string,
  init: RequestInit = {},
  attempt = 0,
): Promise<Response> {
  let session = readSession(role);
  if (!session?.accessToken) throw new Error("Not connected.");
  session = await ensureFresh(session);

  const url = path.startsWith("http") ? path : `${API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && attempt === 0 && session.refreshToken) {
    const next = await refreshAccessToken(session.refreshToken);
    writeSession({ ...session, ...next });
    return spotifyFetch(role, path, init, 1);
  }
  if (res.status === 429) {
    const wait = Number(res.headers.get("Retry-After") ?? Math.min(2 ** attempt, 30));
    if (attempt >= 6) throw new Error("Spotify asked us to slow down. Try again in a minute.");
    await sleep(wait * 1000);
    return spotifyFetch(role, path, init, attempt + 1);
  }
  return res;
}

async function errorText(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const json = JSON.parse(raw) as {
      error?: { message?: string; reason?: string } | string;
      error_description?: string;
      message?: string;
    };
    const nested = typeof json.error === "object" && json.error ? json.error : null;
    const message =
      nested?.message ||
      json.error_description ||
      json.message ||
      (typeof json.error === "string" ? json.error : "") ||
      raw.slice(0, 180);
    const reason = nested?.reason ? ` ${nested.reason}` : "";
    return `${message}${reason}`.trim() || String(res.status);
  } catch {
    return raw.slice(0, 180) || String(res.status);
  }
}

function explainStatus(status: number, detail: string): string {
  if (status === 403 && /not registered|allowlist|whitelist/i.test(detail)) {
    return "Spotify blocked this account. Dashboard → Users Management → add that Spotify email.";
  }
  if (status === 403) {
    return `Spotify 403${detail ? `: ${detail}` : ""}. Dest account must be on the app allowlist (Users Management).`;
  }
  return `Spotify ${status}${detail ? `: ${detail}` : ""}`;
}

async function fail(label: string, res: Response): Promise<never> {
  throw new Error(`${label} (${explainStatus(res.status, await errorText(res))})`);
}

async function send(
  role: Role,
  primary: string,
  init: RequestInit,
  fallback?: { path: string; init?: RequestInit },
): Promise<Response> {
  const first = await spotifyFetch(role, primary, init);
  if (first.ok) return first;
  if (fallback && (first.status === 404 || first.status === 405)) {
    const second = await spotifyFetch(role, fallback.path, fallback.init ?? init);
    if (second.ok) return second;
    return second;
  }
  return first;
}

function libraryUris(kind: "track" | "album" | "show" | "episode" | "artist" | "playlist", ids: string[]) {
  return ids.filter(Boolean).map((id) => `spotify:${kind}:${id}`);
}

async function saveLibrary(role: Role, uris: string[], legacy: () => Promise<Response>, label: string) {
  if (uris.length === 0) return;
  const qs = uris.map(encodeURIComponent).join(",");
  const res = await spotifyFetch(role, `/me/library?uris=${qs}`, { method: "PUT" });
  if (res.ok) return;
  if (res.status === 404 || res.status === 405) {
    const old = await legacy();
    if (old.ok) return;
    await fail(label, old);
  }
  await fail(label, res);
}

async function fetchMe(role: Role): Promise<SpotifyUser> {
  const res = await spotifyFetch(role, "/me");
  if (!res.ok) throw new Error("Could not read the Spotify profile.");
  const me = (await res.json()) as {
    id?: string;
    display_name?: string;
    email?: string;
    images?: { url: string }[] | null;
    product?: string;
  } | null;
  if (!me?.id) throw new Error("Could not read the Spotify profile.");
  return {
    id: me.id,
    displayName: me.display_name || me.id,
    email: me.email,
    imageUrl: me.images?.[0]?.url,
    product: me.product,
  };
}

async function paginate<T>(
  role: Role,
  path: string,
  pick: (json: Record<string, unknown>) => T[],
  opts?: { skipStatuses?: number[] },
): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = path;
  while (next) {
    const res = await spotifyFetch(role, next);
    if (!res.ok) {
      if (opts?.skipStatuses?.includes(res.status)) return out;
      throw new Error(`Spotify ${res.status} on ${path}`);
    }
    const json = (await res.json()) as Record<string, unknown> & {
      next?: string | null;
      artists?: { next?: string | null; items?: unknown[] };
      items?: unknown[];
    };
    out.push(...pick(json));
    next = json.next ?? json.artists?.next ?? null;
  }
  return out;
}

async function playlistTracks(role: Role, playlistId: string): Promise<TrackRef[]> {
  const pick = (j: Record<string, unknown>) => compactMap(itemsOf(j), asTrack);
  const modern = await paginate(role, `/playlists/${playlistId}/items?limit=50&market=from_token`, pick, {
    skipStatuses: [403, 404],
  });
  if (modern.length) return modern;
  return paginate(role, `/playlists/${playlistId}/tracks?limit=50&market=from_token`, pick, {
    skipStatuses: [403, 404],
  });
}

function asTrack(item: unknown): TrackRef | null {
  if (item == null || typeof item !== "object") return null;
  const row = item as {
    track?: TrackLike | null;
    item?: TrackLike | null;
    added_at?: string;
    played_at?: string;
  } & TrackLike;
  const track = row.item ?? row.track ?? row;
  if (track == null || typeof track !== "object") return null;
  const name = track.name ?? "";
  const artists = (track.artists ?? [])
    .map((a) => a?.name)
    .filter((n): n is string => Boolean(n))
    .join(", ");
  if (track.id && track.uri?.startsWith("spotify:track:")) {
    return {
      id: track.id,
      uri: track.uri,
      name: name || "Untitled",
      artists,
      addedAt: row.added_at ?? row.played_at,
    };
  }
  if (name) {
    return {
      id: track.id ?? "",
      uri: track.uri ?? "",
      name,
      artists,
      addedAt: row.added_at ?? row.played_at,
    };
  }
  return null;
}

type TrackLike = {
  id?: string;
  uri?: string;
  name?: string;
  artists?: { name?: string }[] | null;
};

function compactMap<T>(items: unknown[], map: (item: unknown) => T | null): T[] {
  const out: T[] = [];
  for (const item of items) {
    if (item == null) continue;
    const next = map(item);
    if (next) out.push(next);
  }
  return out;
}

function asAlbum(item: unknown): AlbumRef | null {
  const album = (item as { album?: { id?: string; name?: string; artists?: { name?: string }[] | null } | null } | null)
    ?.album;
  if (!album?.id) return null;
  return {
    id: album.id,
    name: album.name ?? "Untitled album",
    artists: (album.artists ?? [])
      .map((a) => a?.name)
      .filter((n): n is string => Boolean(n))
      .join(", "),
  };
}

function asShow(item: unknown): ShowRef | null {
  const show = (item as { show?: { id?: string; name?: string } | null } | null)?.show;
  if (!show?.id) return null;
  return { id: show.id, name: show.name ?? show.id };
}

function asEpisode(item: unknown): EpisodeRef | null {
  const episode = (item as { episode?: { id?: string; name?: string } | null } | null)?.episode;
  if (!episode?.id) return null;
  return { id: episode.id, name: episode.name ?? episode.id };
}

function asArtist(item: unknown): ArtistRef | null {
  const row = item as { id?: string; name?: string } | null;
  if (!row?.id) return null;
  return { id: row.id, name: row.name ?? row.id };
}

async function tryCatalog<T>(label: string, run: () => Promise<T[]>, warnings: string[]): Promise<T[]> {
  try {
    return await run();
  } catch (err) {
    warnings.push(`${label} could not be read: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

function itemsOf(json: Record<string, unknown> | null | undefined): unknown[] {
  if (!json || typeof json !== "object") return [];
  if (Array.isArray(json.items)) return json.items;
  const artists = json.artists as { items?: unknown[] } | undefined;
  if (Array.isArray(artists?.items)) return artists.items;
  const tracks = json.tracks as { items?: unknown[] } | undefined;
  if (Array.isArray(tracks?.items)) return tracks.items;
  return [];
}

async function searchTracks(role: Role, q: string, pages = 5): Promise<TrackRef[]> {
  if (!q) return [];
  const out: TrackRef[] = [];
  const seen = new Set<string>();
  for (let page = 0; page < pages; page++) {
    const res = await spotifyFetch(
      role,
      `/search?q=${encodeURIComponent(q)}&type=track&limit=10&market=from_token&offset=${page * 10}`,
    );
    if (!res.ok) break;
    const json = (await res.json()) as Record<string, unknown>;
    const batch = itemsOf((json.tracks as Record<string, unknown>) ?? {}).map(asTrack);
    for (const track of batch) {
      if (!track?.id || seen.has(track.id)) continue;
      seen.add(track.id);
      out.push(track);
    }
    if (batch.length < 10) break;
    await sleep(80);
  }
  return out;
}

async function searchPlaylists(role: Role, q: string): Promise<{ id: string; name: string }[]> {
  const res = await spotifyFetch(
    role,
    `/search?q=${encodeURIComponent(q)}&type=playlist&limit=10&market=from_token`,
  );
  if (!res.ok) return [];
  const json = (await res.json()) as Record<string, unknown>;
  return compactMap(itemsOf((json.playlists as Record<string, unknown>) ?? {}), (raw) => {
    const p = raw as { id?: string; name?: string } | null;
    return p?.id && p.name ? { id: p.id, name: p.name } : null;
  });
}

async function resolveLooseTracks(role: Role, tracks: TrackRef[]): Promise<TrackRef[]> {
  const out: TrackRef[] = [];
  const seen = new Set<string>();
  for (const track of tracks) {
    if (track.id && track.uri.startsWith("spotify:track:")) {
      if (!seen.has(track.id)) {
        seen.add(track.id);
        out.push(track);
      }
      continue;
    }
    const hits = await searchTracks(role, trackSearchQuery(track), 1);
    const pick = pickTrackMatch(track, hits);
    if (pick && !seen.has(pick.id)) {
      seen.add(pick.id);
      out.push(pick);
    }
    await sleep(80);
  }
  return out;
}

async function fillPlaylist(role: Role, list: PlaylistRef): Promise<PlaylistRef> {
  let tracks = await playlistTracks(role, list.id);
  let trackSource = list.trackSource;

  if (tracks.length === 0 && isMadeForYou(list.name)) {
    return { ...list, tracks: [], trackCount: 0, trackSource: "hidden" };
  }

  if (tracks.length === 0) {
    const station = parseArtistStation(list.name);
    if (station) {
      tracks = await searchTracks(role, `artist:"${station.artist}"`);
      if (tracks.length) trackSource = "search";
    } else if (!list.owned) {
      const match = pickPlaylistMatch(list.name, await searchPlaylists(role, list.name));
      if (match && match.id !== list.id) {
        tracks = await playlistTracks(role, match.id);
        if (tracks.length) trackSource = "search";
      }
    }
  }

  const resolved = await resolveLooseTracks(role, tracks);
  return {
    ...list,
    tracks: resolved,
    trackCount: resolved.length,
    trackSource: resolved.length === 0 && !list.owned ? trackSource ?? "hidden" : trackSource,
  };
}

export async function grabLiveLibrary(role: Role): Promise<{ snapshot: LibrarySnapshot; warnings: string[] }> {
  const user = await fetchMe(role);
  const warnings: string[] = [];

  const [liked, albums, shows, episodes, playlists, artists, recentlyPlayed, topTracks] =
    await Promise.all([
      tryCatalog("Liked songs", () => paginate(role, "/me/tracks?limit=50", (j) => compactMap(itemsOf(j), asTrack)), warnings),
      tryCatalog("Saved albums", () => paginate(role, "/me/albums?limit=50", (j) => compactMap(itemsOf(j), asAlbum)), warnings),
      tryCatalog("Podcasts", () => paginate(role, "/me/shows?limit=50", (j) => compactMap(itemsOf(j), asShow)), warnings),
      tryCatalog("Saved episodes", () => paginate(role, "/me/episodes?limit=50", (j) => compactMap(itemsOf(j), asEpisode)), warnings),
      tryCatalog("Playlists", () => paginate(role, "/me/playlists?limit=50", (j) => itemsOf(j).filter((p) => p != null)), warnings),
      tryCatalog(
        "Followed artists",
        () => paginate(role, "/me/following?type=artist&limit=50", (j) => compactMap(itemsOf(j), asArtist)),
        warnings,
      ),
      tryCatalog("Recently played", async () => {
        const res = await spotifyFetch(role, "/me/player/recently-played?limit=50");
        if (!res.ok) return [] as TrackRef[];
        const j = (await res.json()) as Record<string, unknown>;
        return compactMap(itemsOf(j), asTrack);
      }, warnings),
      tryCatalog("Top tracks", async () => {
        const res = await spotifyFetch(role, "/me/top/tracks?time_range=long_term&limit=50");
        if (!res.ok) return [] as TrackRef[];
        const j = (await res.json()) as Record<string, unknown>;
        return compactMap(itemsOf(j), (t) => asTrack({ track: t }));
      }, warnings),
    ]);

  const detailed: PlaylistRef[] = [];
  for (const raw of playlists) {
    if (raw == null || typeof raw !== "object") continue;
    const p = raw as {
      id?: string;
      name?: string;
      description?: string;
      public?: boolean;
      collaborative?: boolean;
      owner?: { id?: string } | null;
      items?: { total?: number };
      tracks?: { total?: number };
    };
    if (!p.id) continue;
    const stub: PlaylistRef = {
      id: p.id,
      name: p.name ?? "Untitled playlist",
      description: p.description ?? "",
      public: Boolean(p.public),
      collaborative: Boolean(p.collaborative),
      owned: p.owner?.id === user.id,
      trackCount: p.items?.total ?? p.tracks?.total ?? 0,
      tracks: [],
    };
    try {
      detailed.push(await fillPlaylist(role, stub));
    } catch (err) {
      warnings.push(
        `${stub.name} could not be filled: ${err instanceof Error ? err.message : String(err)}`,
      );
      detailed.push({ ...stub, trackSource: "hidden" });
    }
  }

  return {
    snapshot: {
      user,
      likedTracks: liked,
      albums,
      artists,
      shows,
      episodes,
      playlists: detailed,
      recentlyPlayed,
      topTracks,
    },
    warnings,
  };
}

export function liveWriter(role: Role): Writer {
  return {
    delay: sleep,
    saveTracks: async (ids) => {
      await saveLibrary(
        role,
        libraryUris("track", ids),
        () => spotifyFetch(role, `/me/tracks?ids=${ids.join(",")}`, { method: "PUT" }),
        "Save tracks failed",
      );
    },
    saveAlbums: async (ids) => {
      await saveLibrary(
        role,
        libraryUris("album", ids),
        () => spotifyFetch(role, `/me/albums?ids=${ids.join(",")}`, { method: "PUT" }),
        "Save albums failed",
      );
    },
    saveShows: async (ids) => {
      await saveLibrary(
        role,
        libraryUris("show", ids),
        () => spotifyFetch(role, `/me/shows?ids=${ids.join(",")}`, { method: "PUT" }),
        "Save shows failed",
      );
    },
    saveEpisodes: async (ids) => {
      await saveLibrary(
        role,
        libraryUris("episode", ids),
        () => spotifyFetch(role, `/me/episodes?ids=${ids.join(",")}`, { method: "PUT" }),
        "Save episodes failed",
      );
    },
    followArtists: async (ids) => {
      await saveLibrary(
        role,
        libraryUris("artist", ids),
        () =>
          spotifyFetch(role, `/me/following?type=artist&ids=${ids.join(",")}`, { method: "PUT" }),
        "Follow artists failed",
      );
    },
    followPlaylist: async (id) => {
      await saveLibrary(
        role,
        libraryUris("playlist", [id]),
        () => spotifyFetch(role, `/playlists/${id}/followers`, { method: "PUT" }),
        "Follow playlist failed",
      );
    },
    createPlaylist: async (_userId, playlist) => {
      const body = (isPublic: boolean) =>
        JSON.stringify({
          name: playlist.name,
          description: playlist.description?.slice(0, 300) ?? "",
          public: isPublic,
        });
      let res = await send(role, "/me/playlists", { method: "POST", body: body(Boolean(playlist.public)) }, {
        path: `/users/${encodeURIComponent(_userId)}/playlists`,
        init: { method: "POST", body: body(Boolean(playlist.public)) },
      });
      if (!res.ok && res.status === 403 && playlist.public) {
        res = await spotifyFetch(role, "/me/playlists", { method: "POST", body: body(false) });
      }
      if (!res.ok) await fail("Create playlist failed", res);
      const json = (await res.json()) as { id?: string } | null;
      if (!json?.id) throw new Error("Create playlist failed (empty response).");
      return json.id;
    },
    addTracks: async (playlistId, uris) => {
      if (uris.length === 0) return;
      const res = await send(
        role,
        `/playlists/${playlistId}/items`,
        { method: "POST", body: JSON.stringify({ uris }) },
        {
          path: `/playlists/${playlistId}/tracks`,
          init: { method: "POST", body: JSON.stringify({ uris }) },
        },
      );
      if (!res.ok) await fail("Add tracks failed", res);
    },
  };
}

export function reconstructSummary(playlists: PlaylistRef[]): string | null {
  const search = playlists.filter((p) => p.trackSource === "search").length;
  const hidden = playlists.filter((p) => p.trackSource === "hidden").length;
  if (!search && !hidden) return null;
  const bits: string[] = [];
  if (search) {
    bits.push(
      `${search} playlist${search === 1 ? "" : "s"} rebuilt from Spotify search (Radio / Popular / public match)`,
    );
  }
  if (hidden) {
    bits.push(
      `${hidden} Made For You or locked list${hidden === 1 ? "" : "s"} have hidden tracks and cannot copy`,
    );
  }
  return bits.join(". ") + ".";
}

export { fetchMe as fetchLiveUser };
