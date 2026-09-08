import { DEMO_DEST_USER, DEMO_SOURCE } from "./demo-library";
import type { Writer } from "./transfer";
import type { LibrarySnapshot, SpotifyUser } from "./types";

export function demoSourceLibrary(): LibrarySnapshot {
  return structuredClone(DEMO_SOURCE);
}

export function demoDestUser(): SpotifyUser {
  return { ...DEMO_DEST_USER };
}

export function demoWriter(): Writer {
  return {
    delay: (ms) =>
      new Promise<void>((r) => {
        setTimeout(r, Math.min(ms, 160));
      }),
    saveTracks: async () => undefined,
    saveAlbums: async () => undefined,
    saveShows: async () => undefined,
    saveEpisodes: async () => undefined,
    followArtists: async () => undefined,
    followPlaylist: async () => undefined,
    createPlaylist: async (_userId, playlist) => `dest-${playlist.id}`,
    addTracks: async () => undefined,
  };
}
