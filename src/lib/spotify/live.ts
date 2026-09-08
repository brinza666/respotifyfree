import { refreshAccessToken } from "./pkce";
import { readSession, writeSession } from "./session";
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
import type { Writer } from "./transfer";

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

async function fetchMe(role: Role): Promise<SpotifyUser> {
  const res = await spotifyFetch(role, "/me");
  if (!res.ok) throw new Error("Could not read the Spotify profile.");
  const me = (await res.json()) as {
    id: string;
    display_name?: string;
    email?: string;
    images?: { url: string }[];
    product?: string;
  };
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
  // Some library playlists (Made For You, local files, region-locked) return 403
  // on /tracks. Skip them so one playlist cannot abort the whole sync.
  return paginate(
    role,
    `/playlists/${playlistId}/tracks?limit=100&market=from_token`,
    (j) => itemsOf(j).map(asTrack).filter((x): x is TrackRef => Boolean(x)),
    { skipStatuses: [403, 404] },
  );
}

function asTrack(item: unknown): TrackRef | null {
  const row = item as {
    track?: TrackLike;
    item?: TrackLike;
    added_at?: string;
    played_at?: string;
  } & TrackLike;
  const track = row.track ?? row.item ?? row;
  if (!track?.id || !track.uri?.startsWith("spotify:track:")) return null;
  return {
    id: track.id,
    uri: track.uri,
    name: track.name ?? "Untitled",
    artists: (track.artists ?? []).map((a) => a.name).join(", "),
    addedAt: row.added_at ?? row.played_at,
  };
}

type TrackLike = {
  id?: string;
  uri?: string;
  name?: string;
  artists?: { name: string }[];
};


function itemsOf(json: Record<string, unknown>): unknown[] {
  if (Array.isArray(json.items)) return json.items;
  const artists = json.artists as { items?: unknown[] } | undefined;
  if (Array.isArray(artists?.items)) return artists.items;
  return [];
}

export async function grabLiveLibrary(role: Role): Promise<LibrarySnapshot> {
  const user = await fetchMe(role);

  const [liked, albums, shows, episodes, playlists, artists, recentlyPlayed, topTracks] =
    await Promise.all([
      paginate(role, "/me/tracks?limit=50", (j) =>
        itemsOf(j).map(asTrack).filter((x): x is TrackRef => Boolean(x)),
      ),
      paginate(role, "/me/albums?limit=50", (j) =>
        itemsOf(j).map((it) => {
          const row = it as { album: { id: string; name: string; artists?: { name: string }[] } };
          return {
            id: row.album.id,
            name: row.album.name,
            artists: (row.album.artists ?? []).map((a) => a.name).join(", "),
          } satisfies AlbumRef;
        }),
      ),
      paginate(role, "/me/shows?limit=50", (j) =>
        itemsOf(j).map((it) => {
          const row = it as { show: { id: string; name: string } };
          return { id: row.show.id, name: row.show.name } satisfies ShowRef;
        }),
      ),
      paginate(role, "/me/episodes?limit=50", (j) =>
        itemsOf(j)
          .map((it) => (it as { episode?: { id: string; name: string } }).episode)
          .filter((ep): ep is { id: string; name: string } => Boolean(ep))
          .map((ep) => ({ id: ep.id, name: ep.name }) satisfies EpisodeRef),
      ),
      paginate(role, "/me/playlists?limit=50", (j) => itemsOf(j)),
      paginate(role, "/me/following?type=artist&limit=50", (j) =>
        itemsOf(j).map((a) => {
          const row = a as { id: string; name: string };
          return { id: row.id, name: row.name } satisfies ArtistRef;
        }),
      ),
      (async () => {
        const res = await spotifyFetch(role, "/me/player/recently-played?limit=50");
        if (!res.ok) return [] as TrackRef[];
        const j = (await res.json()) as Record<string, unknown>;
        return itemsOf(j).map(asTrack).filter((x): x is TrackRef => Boolean(x));
      })(),
      (async () => {
        const res = await spotifyFetch(role, "/me/top/tracks?time_range=long_term&limit=50");
        if (!res.ok) return [] as TrackRef[];
        const j = (await res.json()) as Record<string, unknown>;
        return itemsOf(j)
          .map((t) => asTrack({ track: t }))
          .filter((x): x is TrackRef => Boolean(x));
      })(),
    ]);

  const detailed: PlaylistRef[] = [];
  for (const raw of playlists) {
    const p = raw as {
      id?: string;
      name?: string;
      description?: string;
      public?: boolean;
      collaborative?: boolean;
      owner?: { id?: string };
    };
    if (!p.id) continue;
    const tracks = await playlistTracks(role, p.id);
    detailed.push({
      id: p.id,
      name: p.name ?? "Untitled playlist",
      description: p.description ?? "",
      public: Boolean(p.public),
      collaborative: Boolean(p.collaborative),
      owned: p.owner?.id === user.id,
      trackCount: tracks.length,
      tracks,
    });
  }

  return {
    user,
    likedTracks: liked,
    albums,
    artists,
    shows,
    episodes,
    playlists: detailed,
    recentlyPlayed,
    topTracks,
  };
}

export function liveWriter(role: Role): Writer {
  return {
    delay: sleep,
    saveTracks: async (ids) => {
      if (ids.length === 0) return;
      const res = await spotifyFetch(role, `/me/tracks?ids=${ids.join(",")}`, { method: "PUT" });
      if (!res.ok && res.status !== 200) throw new Error(`Save tracks failed (${res.status})`);
    },
    saveAlbums: async (ids) => {
      if (ids.length === 0) return;
      const res = await spotifyFetch(role, `/me/albums?ids=${ids.join(",")}`, { method: "PUT" });
      if (!res.ok) throw new Error(`Save albums failed (${res.status})`);
    },
    saveShows: async (ids) => {
      if (ids.length === 0) return;
      const res = await spotifyFetch(role, `/me/shows?ids=${ids.join(",")}`, { method: "PUT" });
      if (!res.ok) throw new Error(`Save shows failed (${res.status})`);
    },
    saveEpisodes: async (ids) => {
      if (ids.length === 0) return;
      const res = await spotifyFetch(role, `/me/episodes?ids=${ids.join(",")}`, { method: "PUT" });
      if (!res.ok) throw new Error(`Save episodes failed (${res.status})`);
    },
    followArtists: async (ids) => {
      if (ids.length === 0) return;
      const res = await spotifyFetch(role, `/me/following?type=artist&ids=${ids.join(",")}`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error(`Follow artists failed (${res.status})`);
    },
    followPlaylist: async (id) => {
      const res = await spotifyFetch(role, `/playlists/${id}/followers`, { method: "PUT" });
      if (!res.ok) throw new Error(`Follow playlist failed (${res.status})`);
    },
    createPlaylist: async (userId, playlist) => {
      const res = await spotifyFetch(role, `/users/${encodeURIComponent(userId)}/playlists`, {
        method: "POST",
        body: JSON.stringify({
          name: playlist.name,
          description: playlist.description?.slice(0, 300) ?? "",
          public: playlist.public,
        }),
      });
      if (!res.ok) throw new Error(`Create playlist failed (${res.status})`);
      const json = (await res.json()) as { id: string };
      return json.id;
    },
    addTracks: async (playlistId, uris) => {
      if (uris.length === 0) return;
      const res = await spotifyFetch(role, `/playlists/${playlistId}/tracks`, {
        method: "POST",
        body: JSON.stringify({ uris }),
      });
      if (!res.ok) throw new Error(`Add tracks failed (${res.status})`);
    },
  };
}

export { fetchMe as fetchLiveUser };
