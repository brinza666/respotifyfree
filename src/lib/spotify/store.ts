import { create } from "zustand";
import { backupToSnapshot, parseBackup, parseSpotifyHistoryExport, snapshotToBackup } from "./backup";
import { demoDestUser, demoSourceLibrary, demoWriter } from "./demo";
import { grabLiveLibrary, liveWriter } from "./live";
import { clientId, setClientId, startLogin } from "./pkce";
import { clearSession, readSession, writeSession } from "./session";
import { countsFor, runTransfer } from "./transfer";
import {
  CATALOG_LABELS,
  DEFAULT_SELECTION,
  type CatalogKey,
  type LibrarySnapshot,
  type ProgressEvent,
  type Session,
  type TransferReport,
  type TransferSelection,
} from "./types";

export type Step = "home" | "select" | "transfer" | "done";

type Store = {
  hydrated: boolean;
  step: Step;
  source: Session | null;
  dest: Session | null;
  clientId: string;
  redirectUri: string;
  snapshot: LibrarySnapshot | null;
  selection: TransferSelection;
  progress: ProgressEvent | null;
  report: TransferReport | null;
  error: string | null;
  notice: string | null;
  busy: boolean;
  hydrate: () => void;
  setClientIdValue: (id: string) => void;
  connectDemo: (role: "source" | "destination") => void;
  connectLive: (role: "source" | "destination") => Promise<void>;
  disconnect: (role: "source" | "destination") => void;
  runDemoBoth: () => void;
  loadSourceLibrary: () => Promise<void>;
  toggleCatalog: (key: CatalogKey) => void;
  setPrecise: (value: boolean) => void;
  setCopyFollowed: (value: boolean) => void;
  startTransfer: () => Promise<void>;
  pause: () => void;
  reset: () => void;
  backFromWizard: () => void;
  importFile: (file: File) => Promise<void>;
  abort?: AbortController;
};

function emptyProgress(): ProgressEvent {
  return { catalog: "Preparing", done: 0, total: 1, errors: [] };
}

export const useRespotify = create<Store>((set, get) => ({
  hydrated: false,
  step: "home",
  source: null,
  dest: null,
  clientId: "",
  redirectUri: "",
  snapshot: null,
  selection: structuredClone(DEFAULT_SELECTION),
  progress: null,
  report: null,
  error: null,
  notice: null,
  busy: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    const source = readSession("source");
    const dest = readSession("destination");
    set({
      hydrated: true,
      source,
      dest,
      clientId: clientId(),
      redirectUri: `${window.location.origin}/callback`,
    });
  },

  setClientIdValue: (id) => {
    setClientId(id);
    set({ clientId: id.trim() });
  },

  connectDemo: (role) => {
    const user = role === "source" ? demoSourceLibrary().user : demoDestUser();
    const session: Session = { role, mode: "demo", user };
    writeSession(session);
    set({ [role === "source" ? "source" : "dest"]: session, error: null, notice: "Demo account connected." });
  },

  connectLive: async (role) => {
    if (!get().clientId) {
      get().connectDemo(role);
      return;
    }
    await startLogin(role);
  },

  disconnect: (role) => {
    clearSession(role);
    set({
      [role === "source" ? "source" : "dest"]: null,
      snapshot: role === "source" ? null : get().snapshot,
    });
  },

  runDemoBoth: () => {
    const source: Session = { role: "source", mode: "demo", user: demoSourceLibrary().user };
    const dest: Session = { role: "destination", mode: "demo", user: demoDestUser() };
    writeSession(source);
    writeSession(dest);
    const snapshot = demoSourceLibrary();
    set({
      source,
      dest,
      snapshot,
      step: "select",
      error: null,
      notice: "Demo library loaded. Nothing is written to a real Spotify account.",
    });
  },

  loadSourceLibrary: async () => {
    const { source, dest } = get();
    if (!source || !dest) {
      set({ error: "Connect both accounts first." });
      return;
    }
    if (source.user.id === dest.user.id) {
      set({
        error: "Source and destination are the same account. On Spotify's screen, tap Not you and sign into the other one.",
      });
      return;
    }
    set({ busy: true, error: null });
    try {
      const snapshot =
        source.mode === "live" ? await grabLiveLibrary("source") : demoSourceLibrary();
      set({ snapshot, step: "select", busy: false });
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : "Could not read the source library.",
      });
    }
  },

  toggleCatalog: (key) => {
    const selection = structuredClone(get().selection);
    selection.catalogs[key] = !selection.catalogs[key];
    set({ selection });
  },

  setPrecise: (value) => set({ selection: { ...get().selection, preciseLikes: value } }),
  setCopyFollowed: (value) => set({ selection: { ...get().selection, copyFollowedAsNew: value } }),

  startTransfer: async () => {
    const { snapshot, dest, selection, source } = get();
    if (!snapshot || !dest) return;
    const controller = new AbortController();
    set({ step: "transfer", progress: emptyProgress(), busy: true, error: null, abort: controller });
    const writer = source?.mode === "live" && dest.mode === "live" ? liveWriter("destination") : demoWriter();
    try {
      const report = await runTransfer({
        source: snapshot,
        destUser: dest.user,
        selection,
        writer,
        signal: controller.signal,
        onProgress: (progress) => set({ progress }),
      });
      set({ report, step: "done", busy: false, abort: undefined });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        set({ busy: false, notice: "Transfer paused.", abort: undefined });
        return;
      }
      set({
        busy: false,
        error: err instanceof Error ? err.message : "Transfer failed.",
        abort: undefined,
      });
    }
  },

  pause: () => {
    get().abort?.abort();
  },

  reset: () => {
    get().abort?.abort();
    set({
      step: "home",
      snapshot: null,
      progress: null,
      report: null,
      error: null,
      notice: null,
      busy: false,
      selection: structuredClone(DEFAULT_SELECTION),
    });
  },

  backFromWizard: () => {
    const { step } = get();
    if (step === "select") {
      get().reset();
      return;
    }
    if (step === "transfer") {
      get().pause();
      set({ step: "select", busy: false });
      return;
    }
    if (step === "done") get().reset();
  },

  importFile: async (file) => {
    try {
      const raw = JSON.parse(await file.text());
      if (raw.format === "respotify-backup") {
        const backup = parseBackup(raw);
        const snapshot = backupToSnapshot(backup);
        const source: Session = { role: "source", mode: "demo", user: snapshot.user };
        writeSession(source);
        set({
          source,
          snapshot,
          step: get().dest ? "select" : "home",
          notice: `Loaded backup from ${snapshot.user.displayName}. Connect a destination to restore.`,
          error: null,
        });
        return;
      }
      const history = parseSpotifyHistoryExport(raw);
      if (history.count === 0) throw new Error("No tracks found in that file.");
      const snapshot = demoSourceLibrary();
      snapshot.recentlyPlayed = history.uris.map((uri, i) => ({
        id: uri.replace("spotify:track:", ""),
        uri,
        name: history.names[i] ?? uri,
        artists: "",
      }));
      snapshot.playlists = [
        {
          id: "history-export",
          name: "Respotify · Streaming history",
          description: "Reconstructed from a Spotify privacy export. Not injected into listening history.",
          public: false,
          collaborative: false,
          owned: true,
          trackCount: snapshot.recentlyPlayed.length,
          tracks: snapshot.recentlyPlayed,
        },
      ];
      snapshot.likedTracks = [];
      snapshot.albums = [];
      snapshot.artists = [];
      snapshot.shows = [];
      snapshot.episodes = [];
      const source: Session = {
        role: "source",
        mode: "demo",
        user: { id: "history-export", displayName: "Privacy export" },
      };
      writeSession(source);
      set({
        source,
        snapshot,
        selection: {
          ...structuredClone(DEFAULT_SELECTION),
          catalogs: {
            liked: false,
            albums: false,
            ownedPlaylists: true,
            followedPlaylists: false,
            artists: false,
            shows: false,
            episodes: false,
            recentArchive: false,
          },
        },
        step: get().dest ? "select" : "home",
        notice: `Found ${history.count} unique tracks in the export. Connect a destination to save them as a playlist.`,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Could not read that file.",
      });
    }
  },
}));

export { CATALOG_LABELS, countsFor, snapshotToBackup };
