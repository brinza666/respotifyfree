import { create } from "zustand";
import { backupToSnapshot, parseBackup, parseSpotifyHistoryExport, snapshotToBackup } from "./backup";
import { demoDestUser, demoSourceLibrary, demoWriter } from "./demo";
import { detectLocale, format, type Locale } from "../i18n";
import { grabLiveLibrary, liveWriter } from "./live";
import { clientId, redirectUri, seedClientId, setClientId, startLogin } from "./pkce";
import { clearSession, readSession, writeSession } from "./session";
import { countsFor, runTransfer } from "./transfer";
import {
  CATALOG_LABELS,
  DEFAULT_PREFS,
  DEFAULT_SELECTION,
  type AppPrefs,
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
  locale: Locale;
  showTrackNames: boolean;
  showMoreInfo: boolean;
  hydrate: () => void;
  setLocale: (locale: Locale) => void;
  setShowTrackNames: (value: boolean) => void;
  setShowMoreInfo: (value: boolean) => void;
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

const PREFS_KEY = "respotify.prefs";

function readPrefs(): AppPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS, locale: detectLocale() };
    const parsed = JSON.parse(raw) as Partial<AppPrefs>;
    return {
      locale: parsed.locale === "ru" || parsed.locale === "en" ? parsed.locale : detectLocale(),
      showTrackNames: parsed.showTrackNames !== false,
      showMoreInfo: Boolean(parsed.showMoreInfo),
    };
  } catch {
    return { ...DEFAULT_PREFS, locale: detectLocale() };
  }
}

function writePrefs(prefs: AppPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function emptyProgress(): ProgressEvent {
  return { catalog: "Preparing", done: 0, total: 1, errors: [] };
}

function reconstructNotice(locale: Locale, playlists: LibrarySnapshot["playlists"]): string | null {
  const search = playlists.filter((p) => p.trackSource === "search").length;
  const hidden = playlists.filter((p) => p.trackSource === "hidden").length;
  if (!search && !hidden) return null;
  const bits: string[] = [];
  if (search) {
    bits.push(format(locale, search === 1 ? "reconstructSearch" : "reconstructSearchPlural", { n: search }));
  }
  if (hidden) {
    bits.push(format(locale, hidden === 1 ? "reconstructHidden" : "reconstructHiddenPlural", { n: hidden }));
  }
  return bits.join(" ");
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
  locale: DEFAULT_PREFS.locale,
  showTrackNames: DEFAULT_PREFS.showTrackNames,
  showMoreInfo: DEFAULT_PREFS.showMoreInfo,

  hydrate: () => {
    if (typeof window === "undefined") return;
    seedClientId();
    const source = readSession("source");
    const dest = readSession("destination");
    const prefs = readPrefs();
    const selection = structuredClone(DEFAULT_SELECTION);
    try {
      const raw = localStorage.getItem("respotify.selection");
      if (raw) {
        const saved = JSON.parse(raw) as Partial<TransferSelection>;
        if (typeof saved.copyFollowedAsNew === "boolean") selection.copyFollowedAsNew = saved.copyFollowedAsNew;
        if (typeof saved.preciseLikes === "boolean") selection.preciseLikes = saved.preciseLikes;
      }
    } catch {
      /* keep defaults */
    }
    set({
      hydrated: true,
      source,
      dest,
      clientId: clientId(),
      redirectUri: redirectUri(),
      locale: prefs.locale,
      showTrackNames: prefs.showTrackNames,
      showMoreInfo: prefs.showMoreInfo,
      selection,
    });
    document.documentElement.lang = prefs.locale;
  },

  setLocale: (locale) => {
    const prefs = { ...readPrefs(), locale };
    writePrefs(prefs);
    set({ locale });
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  },
  setShowTrackNames: (showTrackNames) => {
    writePrefs({ ...readPrefs(), showTrackNames });
    set({ showTrackNames });
  },
  setShowMoreInfo: (showMoreInfo) => {
    writePrefs({ ...readPrefs(), showMoreInfo });
    set({ showMoreInfo });
  },

  setClientIdValue: (id) => {
    setClientId(id);
    set({ clientId: id.trim() });
  },

  connectDemo: (role) => {
    const user = role === "source" ? demoSourceLibrary().user : demoDestUser();
    const session: Session = { role, mode: "demo", user };
    writeSession(session);
    set({
      [role === "source" ? "source" : "dest"]: session,
      error: null,
      notice: format(get().locale, "demoConnected"),
    });
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
      notice: format(get().locale, "demoLoaded"),
    });
  },

  loadSourceLibrary: async () => {
    const { source, dest } = get();
    if (!source || !dest) {
      set({ error: format(get().locale, "connectBoth") });
      return;
    }
    if (!source.user?.id || !dest.user?.id) {
      set({ error: format(get().locale, "reconnect") });
      return;
    }
    if (source.user.id === dest.user.id) {
      set({
        error: format(get().locale, "sameAccount"),
      });
      return;
    }
    set({ busy: true, error: null });
    try {
      let snapshot;
      let warnings: string[] = [];
      if (source.mode === "live") {
        const grabbed = await grabLiveLibrary("source");
        snapshot = grabbed.snapshot;
        warnings = grabbed.warnings;
      } else {
        snapshot = demoSourceLibrary();
      }
      const notice = [reconstructNotice(get().locale, snapshot.playlists), ...warnings]
        .filter(Boolean)
        .join(" ");
      set({
        snapshot,
        step: "select",
        busy: false,
        notice: notice || null,
      });
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : format(get().locale, "readFail"),
      });
    }
  },

  toggleCatalog: (key) => {
    const selection = structuredClone(get().selection);
    selection.catalogs[key] = !selection.catalogs[key];
    set({ selection });
  },

  setPrecise: (value) => {
    const selection = { ...get().selection, preciseLikes: value };
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "respotify.selection",
        JSON.stringify({
          copyFollowedAsNew: selection.copyFollowedAsNew,
          preciseLikes: selection.preciseLikes,
        }),
      );
    }
    set({ selection });
  },
  setCopyFollowed: (value) => {
    const selection = { ...get().selection, copyFollowedAsNew: value };
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "respotify.selection",
        JSON.stringify({
          copyFollowedAsNew: selection.copyFollowedAsNew,
          preciseLikes: selection.preciseLikes,
        }),
      );
    }
    set({ selection });
  },

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
        set({ busy: false, notice: format(get().locale, "paused"), abort: undefined });
        return;
      }
      set({
        busy: false,
        error: err instanceof Error ? err.message : format(get().locale, "transferFail"),
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
          notice: format(get().locale, "loadedBackup", { name: snapshot.user.displayName }),
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
        notice: format(get().locale, "historyFound", { n: history.count }),
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : format(get().locale, "fileFail"),
      });
    }
  },
}));

export { CATALOG_LABELS, countsFor, snapshotToBackup };
