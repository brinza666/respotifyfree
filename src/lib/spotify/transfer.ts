import {
  LIBRARY_CHUNK,
  type CatalogKey,
  type LibrarySnapshot,
  type PlaylistRef,
  type ProgressEvent,
  type SpotifyUser,
  type TrackRef,
  type TransferReport,
  type TransferSelection,
} from "./types";

export type Writer = {
  saveTracks: (ids: string[], signal?: AbortSignal) => Promise<void>;
  saveAlbums: (ids: string[]) => Promise<void>;
  saveShows: (ids: string[]) => Promise<void>;
  saveEpisodes: (ids: string[]) => Promise<void>;
  followArtists: (ids: string[]) => Promise<void>;
  followPlaylist: (id: string) => Promise<void>;
  createPlaylist: (userId: string, playlist: PlaylistRef) => Promise<string>;
  addTracks: (playlistId: string, uris: string[]) => Promise<void>;
  delay: (ms: number) => Promise<void>;
  rebuildTracks?: (list: PlaylistRef) => Promise<TrackRef[]>;
};

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Transfer paused", "AbortError");
}

export async function runTransfer(opts: {
  source: LibrarySnapshot;
  destUser: SpotifyUser;
  selection: TransferSelection;
  writer: Writer;
  onProgress: (event: ProgressEvent) => void;
  signal?: AbortSignal;
}): Promise<TransferReport> {
  const { source, destUser, selection, writer, onProgress, signal } = opts;
  const errors: { item: string; message: string }[] = [];
  const copied: Record<string, number> = {};
  const playlistMap: Record<string, string> = {};
  const startedAt = new Date().toISOString();

  const emit = (partial: Omit<ProgressEvent, "errors"> & { errors?: ProgressEvent["errors"] }) => {
    onProgress({ errors, ...partial });
  };

  const fail = (item: string, err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    errors.push({ item, message });
  };

  const catalogs: { key: CatalogKey; run: () => Promise<number> }[] = [
    {
      key: "liked",
      run: async () => {
        const tracks = [...source.likedTracks].filter((t) => t.id);
        const ordered = selection.preciseLikes
          ? [...tracks].sort((a, b) => String(a.addedAt).localeCompare(String(b.addedAt)))
          : [...tracks].reverse();
        const size = selection.preciseLikes ? 5 : LIBRARY_CHUNK;
        const batches = chunk(ordered, size);
        let done = 0;
        for (const batch of batches) {
          throwIfAborted(signal);
          emit({
            catalog: "Liked songs",
            done,
            total: tracks.length,
            currentName: batch[0]?.name,
          });
          try {
            await writer.saveTracks(
              batch.map((t) => t.id),
              signal,
            );
          } catch (err) {
            fail("Liked songs batch", err);
          }
          done += batch.length;
          await writer.delay(selection.preciseLikes ? 350 : 100);
        }
        emit({ catalog: "Liked songs", done: tracks.length, total: tracks.length });
        return tracks.length;
      },
    },
    {
      key: "albums",
      run: async () => {
        const albums = source.albums;
        let done = 0;
        for (const batch of chunk(albums, LIBRARY_CHUNK)) {
          throwIfAborted(signal);
          emit({ catalog: "Saved albums", done, total: albums.length, currentName: batch[0]?.name });
          try {
            await writer.saveAlbums(batch.map((a) => a.id));
          } catch (err) {
            fail("Albums batch", err);
          }
          done += batch.length;
          await writer.delay(100);
        }
        return albums.length;
      },
    },
    {
      key: "ownedPlaylists",
      run: async () => {
        const lists = source.playlists.filter((p) => p.owned);
        let copiedCount = 0;
        for (const list of lists) {
          throwIfAborted(signal);
          emit({
            catalog: "Owned playlists",
            done: copiedCount,
            total: lists.length,
            currentName: list.name,
          });
          try {
            const uris = list.tracks.map((t) => t.uri).filter((u) => u.startsWith("spotify:track:"));
            if (uris.length === 0 && list.trackSource === "hidden") {
              fail(list.name, new Error("Spotify hid this list. Cannot copy Daily Mix / similar."));
              continue;
            }
            const destId = await writer.createPlaylist(destUser.id, { ...list, public: false });
            playlistMap[list.id] = destId;
            for (const batch of chunk(uris, 100)) {
              await writer.addTracks(destId, batch);
              await writer.delay(80);
            }
            copiedCount += 1;
          } catch (err) {
            fail(list.name, err);
          }
        }
        return copiedCount;
      },
    },
    {
      key: "followedPlaylists",
      run: async () => {
        const lists = source.playlists.filter((p) => !p.owned);
        let n = 0;
        for (const list of lists) {
          throwIfAborted(signal);
          emit({
            catalog: "Followed playlists",
            done: n,
            total: lists.length,
            currentName: list.name,
          });
          try {
            let uris = list.tracks.map((t) => t.uri).filter((u) => u.startsWith("spotify:track:"));
            if (selection.copyFollowedAsNew && uris.length === 0 && writer.rebuildTracks) {
              const rebuilt = await writer.rebuildTracks(list);
              uris = rebuilt.map((t) => t.uri).filter((u) => u.startsWith("spotify:track:"));
            }
            if (selection.copyFollowedAsNew && uris.length > 0) {
              const destId = await writer.createPlaylist(destUser.id, { ...list, owned: true, public: false });
              playlistMap[list.id] = destId;
              for (const batch of chunk(uris, 100)) await writer.addTracks(destId, batch);
            } else {
              try {
                await writer.followPlaylist(list.id);
              } catch (followErr) {
                if (writer.rebuildTracks) {
                  const rebuilt = await writer.rebuildTracks(list);
                  uris = rebuilt.map((t) => t.uri).filter((u) => u.startsWith("spotify:track:"));
                  if (uris.length > 0) {
                    const destId = await writer.createPlaylist(destUser.id, {
                      ...list,
                      owned: true,
                      public: false,
                    });
                    playlistMap[list.id] = destId;
                    for (const batch of chunk(uris, 100)) await writer.addTracks(destId, batch);
                    n += 1;
                    await writer.delay(80);
                    continue;
                  }
                }
                throw followErr;
              }
            }
            n += 1;
          } catch (err) {
            fail(list.name, err);
          }
          await writer.delay(80);
        }
        return n;
      },
    },
    {
      key: "artists",
      run: async () => {
        const artists = source.artists;
        let done = 0;
        for (const batch of chunk(artists, LIBRARY_CHUNK)) {
          throwIfAborted(signal);
          emit({ catalog: "Followed artists", done, total: artists.length, currentName: batch[0]?.name });
          try {
            await writer.followArtists(batch.map((a) => a.id));
          } catch (err) {
            fail("Artists batch", err);
          }
          done += batch.length;
          await writer.delay(100);
        }
        return artists.length;
      },
    },
    {
      key: "shows",
      run: async () => {
        const shows = source.shows;
        let done = 0;
        for (const batch of chunk(shows, LIBRARY_CHUNK)) {
          throwIfAborted(signal);
          emit({ catalog: "Podcasts", done, total: shows.length, currentName: batch[0]?.name });
          try {
            await writer.saveShows(batch.map((s) => s.id));
          } catch (err) {
            fail("Shows batch", err);
          }
          done += batch.length;
          await writer.delay(100);
        }
        return shows.length;
      },
    },
    {
      key: "episodes",
      run: async () => {
        const episodes = source.episodes;
        let done = 0;
        for (const batch of chunk(episodes, LIBRARY_CHUNK)) {
          throwIfAborted(signal);
          emit({ catalog: "Saved episodes", done, total: episodes.length, currentName: batch[0]?.name });
          try {
            await writer.saveEpisodes(batch.map((e) => e.id));
          } catch (err) {
            fail("Episodes batch", err);
          }
          done += batch.length;
          await writer.delay(100);
        }
        return episodes.length;
      },
    },
    {
      key: "recentArchive",
      run: async () => {
        const tracks: TrackRef[] = source.recentlyPlayed;
        if (tracks.length === 0) return 0;
        emit({
          catalog: "Recently played archive",
          done: 0,
          total: 1,
          currentName: "Respotify · Recently played",
        });
        const archive: PlaylistRef = {
          id: "recent-archive",
          name: "Respotify · Recently played",
          description: "Archive of recently played tracks. This is not injected into Spotify history.",
          public: false,
          collaborative: false,
          owned: true,
          trackCount: tracks.length,
          tracks,
        };
        try {
          const destId = await writer.createPlaylist(destUser.id, archive);
          const uris = tracks.map((t) => t.uri).filter((u) => u.startsWith("spotify:track:"));
          for (const batch of chunk(uris, 100)) await writer.addTracks(destId, batch);
        } catch (err) {
          fail("Recently played archive", err);
        }
        return tracks.length;
      },
    },
  ];

  for (const step of catalogs) {
    if (!selection.catalogs[step.key]) continue;
    throwIfAborted(signal);
    try {
      copied[step.key] = await step.run();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      fail(step.key, err);
      copied[step.key] = copied[step.key] ?? 0;
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    copied,
    errors,
    playlistMap,
  };
}

export function countsFor(snap: LibrarySnapshot) {
  return {
    liked: snap.likedTracks.length,
    albums: snap.albums.length,
    ownedPlaylists: snap.playlists.filter((p) => p.owned).length,
    followedPlaylists: snap.playlists.filter((p) => !p.owned).length,
    artists: snap.artists.length,
    shows: snap.shows.length,
    episodes: snap.episodes.length,
    recentArchive: snap.recentlyPlayed.length,
  };
}
