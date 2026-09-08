import type { LibrarySnapshot, PlaylistRef, TrackRef } from "./types";

const TITLES = [
  "Night Bus",
  "Glass Harbor",
  "Second Kitchen",
  "Low Voltage",
  "Paper Lantern",
  "Eastern Platform",
  "Warm Static",
  "River Clock",
  "After Hours Market",
  "Copper Thread",
  "Quiet Corridor",
  "Salt Window",
  "Last Elevator",
  "Green Signal",
  "Borrowed Coat",
  "Atlas Folded",
  "Thin Ice Tea",
  "Harbor Radio",
  "Monday Filter",
  "Soft Perimeter",
  "Under the Overpass",
  "Field Notes",
  "Velvet Switch",
  "Orange Ticket",
  "Slow Commute",
  "Hidden Stair",
  "Blue Invoice",
  "Northern Socket",
  "Dust Jacket",
  "Late Museum",
  "Iron Balcony",
  "Spare Key",
  "Window Seat",
  "Cassette Rain",
  "Old Frequency",
  "Marble Lobby",
  "Two Stops Early",
  "Ink on Newsprint",
  "Winter Outlet",
  "Half-Drawn Curtain",
];

const ARTISTS = [
  "Kite District",
  "Mara Voss",
  "Lumen Row",
  "The Night Clerks",
  "Ada North",
  "Hollow Pier",
  "Juniper Static",
  "Red Mezzanine",
];

const ALBUMS = [
  "Civic Light",
  "Unlisted Rooms",
  "Second Shift",
  "Harbor Drawings",
  "Low Season",
  "The Quiet Index",
];

function track(i: number, addedDaysAgo: number): TrackRef {
  const title = TITLES[i % TITLES.length]!;
  const artist = ARTISTS[i % ARTISTS.length]!;
  const id = `demotrack${String(i + 1).padStart(3, "0")}`;
  const added = new Date(Date.now() - addedDaysAgo * 86400000).toISOString();
  return {
    id,
    uri: `spotify:track:${id}`,
    name: title,
    artists: artist,
    addedAt: added,
  };
}

const likedTracks = TITLES.map((_, i) => track(i, i + 1));

function playlist(
  id: string,
  name: string,
  owned: boolean,
  indexes: number[],
): PlaylistRef {
  const tracks = indexes.map((i) => likedTracks[i]!);
  return {
    id,
    name,
    description: owned ? "Copied from the source library." : "",
    public: owned,
    collaborative: false,
    owned,
    trackCount: tracks.length,
    tracks,
  };
}

export const DEMO_SOURCE: LibrarySnapshot = {
  user: {
    id: "demo-source",
    displayName: "Old account",
    email: "old@respotify.demo",
    product: "premium",
  },
  likedTracks,
  albums: ALBUMS.map((name, i) => ({
    id: `demoalbum${i + 1}`,
    name,
    artists: ARTISTS[i % ARTISTS.length]!,
  })),
  artists: ARTISTS.map((name, i) => ({ id: `demoartist${i + 1}`, name })),
  shows: [
    { id: "demoshow1", name: "Late Dispatch" },
    { id: "demoshow2", name: "Room Tone" },
    { id: "demoshow3", name: "The Transfer" },
  ],
  episodes: [
    { id: "demoep1", name: "Episode 12 — Moving house" },
    { id: "demoep2", name: "Episode 7 — Spare keys" },
  ],
  playlists: [
    playlist("demopl1", "Night drives", true, [0, 1, 2, 3, 4, 5, 6, 7]),
    playlist("demopl2", "Kitchen radio", true, [8, 9, 10, 11, 12, 13]),
    playlist("demopl3", "Deep work", true, [14, 15, 16, 17, 18, 19, 20, 21, 22]),
    playlist("demopl4", "Discover mix (followed)", false, [23, 24, 25, 26]),
  ],
  recentlyPlayed: likedTracks.slice(0, 18),
  topTracks: likedTracks.slice(0, 10),
};

export const DEMO_DEST_USER = {
  id: "demo-dest",
  displayName: "New account",
  email: "new@respotify.demo",
  product: "premium",
};
