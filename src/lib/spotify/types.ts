export type Role = "source" | "destination";

/** PUT /me/library accepts at most 40 URIs per request. */
export const LIBRARY_CHUNK = 40;

export type SpotifyUser = {
  id: string;
  displayName: string;
  email?: string;
  imageUrl?: string;
  product?: string;
};

export type TrackRef = {
  id: string;
  uri: string;
  name: string;
  artists: string;
  addedAt?: string;
};

export type AlbumRef = { id: string; name: string; artists: string };
export type ArtistRef = { id: string; name: string };
export type ShowRef = { id: string; name: string };
export type EpisodeRef = { id: string; name: string };

export type PlaylistRef = {
  id: string;
  name: string;
  description: string;
  public: boolean;
  collaborative: boolean;
  owned: boolean;
  trackCount: number;
  tracks: TrackRef[];
  /** How the track list was filled. Omit when Spotify returned the songs. */
  trackSource?: "search" | "hidden";
};

export type LibrarySnapshot = {
  user: SpotifyUser;
  likedTracks: TrackRef[];
  albums: AlbumRef[];
  artists: ArtistRef[];
  shows: ShowRef[];
  episodes: EpisodeRef[];
  playlists: PlaylistRef[];
  recentlyPlayed: TrackRef[];
  topTracks: TrackRef[];
};

export type CatalogKey =
  | "liked"
  | "albums"
  | "ownedPlaylists"
  | "followedPlaylists"
  | "artists"
  | "shows"
  | "episodes"
  | "recentArchive";

export type TransferSelection = {
  catalogs: Record<CatalogKey, boolean>;
  preciseLikes: boolean;
  copyFollowedAsNew: boolean;
};

export type ProgressEvent = {
  catalog: string;
  done: number;
  total: number;
  currentName?: string;
  currentTrack?: string;
  message?: string;
  errors: { item: string; message: string }[];
};

export type AppPrefs = {
  locale: "en" | "ru";
  showTrackNames: boolean;
  showMoreInfo: boolean;
};

export const DEFAULT_PREFS: AppPrefs = {
  locale: "en",
  showTrackNames: true,
  showMoreInfo: false,
};

export type TransferReport = {
  startedAt: string;
  finishedAt: string;
  copied: Record<string, number>;
  errors: { item: string; message: string }[];
  playlistMap: Record<string, string>;
};

export type BackupFile = {
  format: "respotify-backup";
  version: 1;
  exportedAt: string;
  source: { id: string; displayName: string };
  likedTracks: { id: string; addedAt?: string }[];
  albums: { id: string }[];
  artists: { id: string }[];
  shows: { id: string }[];
  episodes: { id: string }[];
  playlists: {
    id: string;
    name: string;
    description: string;
    public: boolean;
    collaborative: boolean;
    owned: boolean;
    tracks: { uri: string; addedAt?: string }[];
  }[];
  recentlyPlayed: { id: string; uri: string; name: string; artists: string }[];
};

export type Session = {
  role: Role;
  mode: "demo" | "live";
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user: SpotifyUser;
};

export const DEFAULT_SELECTION: TransferSelection = {
  catalogs: {
    liked: true,
    albums: true,
    ownedPlaylists: true,
    followedPlaylists: true,
    artists: true,
    shows: true,
    episodes: true,
    recentArchive: true,
  },
  preciseLikes: false,
  copyFollowedAsNew: true,
};

export const CATALOG_LABELS: Record<CatalogKey, string> = {
  liked: "Liked songs",
  albums: "Saved albums",
  ownedPlaylists: "Owned playlists",
  followedPlaylists: "Followed playlists",
  artists: "Followed artists",
  shows: "Podcast subscriptions",
  episodes: "Saved episodes",
  recentArchive: "Recently played archive",
};
