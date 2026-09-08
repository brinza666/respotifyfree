import type { TrackRef } from "./types";

const MADE_FOR_YOU =
  /^(daily mix|discover weekly|release radar|on repeat|repeat rewind|your time capsule|daylist)\b/i;

export function isMadeForYou(name: string): boolean {
  return MADE_FOR_YOU.test(name.trim());
}

export function parseArtistStation(name: string): { artist: string; kind: string } | null {
  const dashed = name.trim().match(/^(.*?)\s+[–—-]\s+(Popular|Radio|Collaborations)\s*$/i);
  if (dashed?.[1] && dashed[2]) {
    return { artist: dashed[1].trim(), kind: dashed[2].toLowerCase() };
  }
  const radio = name.trim().match(/^(.+?)\s+Radio$/i);
  if (radio?.[1] && radio[1].trim().length >= 2) {
    return { artist: radio[1].trim(), kind: "radio" };
  }
  return null;
}

export function trackSearchQuery(track: { name: string; artists: string }): string {
  const title = track.name.replace(/["'`]/g, " ").trim();
  const artist = track.artists.split(",")[0]?.replace(/["'`]/g, " ").trim() ?? "";
  if (title && artist) return `track:"${title}" artist:"${artist}"`;
  if (title) return `track:"${title}"`;
  return artist;
}

export function pickTrackMatch(
  want: { name: string; artists: string },
  hits: TrackRef[],
): TrackRef | null {
  const title = want.name.trim().toLowerCase();
  const artist = want.artists.split(",")[0]?.trim().toLowerCase() ?? "";
  const exact = hits.find((hit) => {
    const sameTitle = hit.name.trim().toLowerCase() === title;
    const sameArtist = !artist || hit.artists.toLowerCase().includes(artist);
    return sameTitle && sameArtist;
  });
  return exact ?? hits[0] ?? null;
}

export function pickPlaylistMatch(
  name: string,
  hits: { id: string; name: string }[],
): { id: string; name: string } | null {
  const want = name.trim().toLowerCase();
  if (!want) return null;
  return (
    hits.find((hit) => hit.name.trim().toLowerCase() === want) ??
    hits.find((hit) => hit.name.trim().toLowerCase().includes(want)) ??
    hits[0] ??
    null
  );
}
