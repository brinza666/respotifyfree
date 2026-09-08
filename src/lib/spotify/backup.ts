import type { BackupFile, LibrarySnapshot } from "./types";

export function snapshotToBackup(snap: LibrarySnapshot): BackupFile {
  return {
    format: "respotify-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    source: { id: snap.user.id, displayName: snap.user.displayName },
    likedTracks: snap.likedTracks.map((t) => ({ id: t.id, addedAt: t.addedAt })),
    albums: snap.albums.map((a) => ({ id: a.id })),
    artists: snap.artists.map((a) => ({ id: a.id })),
    shows: snap.shows.map((s) => ({ id: s.id })),
    episodes: snap.episodes.map((e) => ({ id: e.id })),
    playlists: snap.playlists.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      public: p.public,
      collaborative: p.collaborative,
      owned: p.owned,
      tracks: p.tracks.map((t) => ({ uri: t.uri, addedAt: t.addedAt })),
    })),
    recentlyPlayed: snap.recentlyPlayed.map((t) => ({
      id: t.id,
      uri: t.uri,
      name: t.name,
      artists: t.artists,
    })),
  };
}

export function downloadBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `respotify-backup-${backup.source.displayName.replace(/\s+/g, "-").toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(raw: unknown): BackupFile {
  const data = raw as BackupFile;
  if (!data || data.format !== "respotify-backup") {
    throw new Error("Not a Respotify backup file.");
  }
  return data;
}

export function backupToSnapshot(backup: BackupFile): LibrarySnapshot {
  return {
    user: { id: backup.source.id, displayName: backup.source.displayName },
    likedTracks: backup.likedTracks.map((t) => ({
      id: t.id,
      uri: `spotify:track:${t.id}`,
      name: t.id,
      artists: "",
      addedAt: t.addedAt,
    })),
    albums: backup.albums.map((a) => ({ id: a.id, name: a.id, artists: "" })),
    artists: backup.artists.map((a) => ({ id: a.id, name: a.id })),
    shows: backup.shows.map((s) => ({ id: s.id, name: s.id })),
    episodes: backup.episodes.map((e) => ({ id: e.id, name: e.id })),
    playlists: backup.playlists.map((p) => ({
      ...p,
      trackCount: p.tracks.length,
      tracks: p.tracks.map((t, i) => ({
        id: t.uri.replace("spotify:track:", ""),
        uri: t.uri,
        name: `${p.name} · ${i + 1}`,
        artists: "",
        addedAt: t.addedAt,
      })),
    })),
    recentlyPlayed: backup.recentlyPlayed ?? [],
    topTracks: [],
  };
}

type HistoryRow = {
  trackName?: string;
  artistName?: string;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  spotify_track_uri?: string | null;
};

export function parseSpotifyHistoryExport(raw: unknown): { label: string; count: number; uris: string[]; names: string[] } {
  const rows = Array.isArray(raw) ? (raw as HistoryRow[]) : [];
  const names: string[] = [];
  const uris: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const title = row.master_metadata_track_name || row.trackName;
    const artist = row.master_metadata_album_artist_name || row.artistName;
    const uri = row.spotify_track_uri || "";
    if (!title) continue;
    const key = uri || `${title}::${artist ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(artist ? `${title} — ${artist}` : title);
    if (uri.startsWith("spotify:track:")) uris.push(uri);
  }
  return {
    label: "Spotify privacy export",
    count: names.length,
    uris,
    names,
  };
}
