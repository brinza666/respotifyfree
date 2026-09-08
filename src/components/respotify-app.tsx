import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Disc3,
  Download,
  FolderInput,
  Pause,
  Settings,
  Shield,
  Smartphone,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadBackup } from "@/lib/spotify/backup";
import { CATALOG_LABELS, countsFor, snapshotToBackup, useRespotify } from "@/lib/spotify/store";
import type { CatalogKey, Session } from "@/lib/spotify/types";
import { cn } from "@/lib/utils";

type Tab = "transfer" | "backup" | "setup";

export function RespotifyApp() {
  const hydrate = useRespotify((s) => s.hydrate);
  const step = useRespotify((s) => s.step);
  const backFromWizard = useRespotify((s) => s.backFromWizard);
  const [tab, setTab] = useState<Tab>("transfer");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (step === "home") return;
    window.history.pushState({ respotify: step }, "");
  }, [step]);

  useEffect(() => {
    const onPop = () => {
      backFromWizard();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [backFromWizard]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-6 sm:px-6">
        {tab === "transfer" && (
          <>
            {step === "home" && <HomeStep onOpenSetup={() => setTab("setup")} />}
            {step === "select" && <SelectStep />}
            {step === "transfer" && <TransferStep />}
            {step === "done" && <DoneStep />}
          </>
        )}
        {tab === "backup" && <BackupTab />}
        {tab === "setup" && <SetupTab />}
      </main>
      <BottomNav tab={tab} onTab={setTab} />
    </div>
  );
}

function Header() {
  const step = useRespotify((s) => s.step);
  return (
    <header className="border-b border-border/80 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Disc3 className="size-5 text-primary" strokeWidth={1.6} />
          <span className="font-display text-lg tracking-tight">Respotify</span>
        </div>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-faint">
          {step === "home" ? "Connect" : step === "select" ? "Choose" : step === "transfer" ? "Move" : "Done"}
        </span>
      </div>
    </header>
  );
}

function BottomNav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: typeof ArrowLeftRight }[] = [
    { id: "transfer", label: "Transfer", icon: ArrowLeftRight },
    { id: "backup", label: "Backup", icon: FolderInput },
    { id: "setup", label: "Setup", icon: Settings },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
      aria-label="App"
    >
      <div className="mx-auto grid max-w-xl grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTab(item.id)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium",
                active ? "text-primary" : "text-faint",
              )}
            >
              <Icon className="size-5" strokeWidth={1.7} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HomeStep({ onOpenSetup }: { onOpenSetup: () => void }) {
  const source = useRespotify((s) => s.source);
  const dest = useRespotify((s) => s.dest);
  const error = useRespotify((s) => s.error);
  const notice = useRespotify((s) => s.notice);
  const busy = useRespotify((s) => s.busy);
  const connectDemo = useRespotify((s) => s.connectDemo);
  const connectLive = useRespotify((s) => s.connectLive);
  const disconnect = useRespotify((s) => s.disconnect);
  const runDemoBoth = useRespotify((s) => s.runDemoBoth);
  const loadSourceLibrary = useRespotify((s) => s.loadSourceLibrary);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Spotify to Spotify</p>
        <h1 className="font-display text-[2.15rem] leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
          Move your library. Keep your music.
        </h1>
        <p className="max-w-prose text-muted">
          Connect two accounts through Spotify’s own login, then copy playlists, liked songs, albums,
          artists, and podcasts. Tokens stay on this phone.
        </p>
      </section>

      <div className="flex flex-col gap-3">
        <AccountCard
          label="Source"
          hint="The account you are leaving"
          session={source}
          onConnect={() => void connectLive("source")}
          onDemo={() => connectDemo("source")}
          onDisconnect={() => disconnect("source")}
        />
        <AccountCard
          label="Destination"
          hint="The account that receives the library"
          session={dest}
          onConnect={() => void connectLive("destination")}
          onDemo={() => connectDemo("destination")}
          onDisconnect={() => disconnect("destination")}
        />
      </div>

      {error && <Callout tone="danger">{error}</Callout>}
      {notice && <Callout>{notice}</Callout>}

      <div className="flex flex-col gap-2">
        <Button block disabled={!source || !dest || busy} onClick={() => void loadSourceLibrary()}>
          {busy ? "Reading library…" : "Continue"}
          <ArrowRight className="size-4" />
        </Button>
        <Button variant="secondary" block onClick={runDemoBoth}>
          Run demo transfer
        </Button>
        <Button variant="ghost" block onClick={onOpenSetup}>
          Client ID and install
        </Button>
      </div>

      <Honesty />
    </div>
  );
}

function AccountCard({
  label,
  hint,
  session,
  onConnect,
  onDemo,
  onDisconnect,
}: {
  label: string;
  hint: string;
  session: Session | null;
  onConnect: () => void;
  onDemo: () => void;
  onDisconnect: () => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">{label}</p>
          {session ? (
            <div className="mt-2">
              <p className="font-medium">{session.user.displayName}</p>
              <p className="text-sm text-muted">
                {session.mode === "demo" ? "Demo account" : session.user.email || session.user.id}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{hint}</p>
          )}
        </div>
        {session && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-raised px-2 py-1 text-xs text-primary">
            <Check className="size-3" />
            Connected
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {session ? (
          <Button variant="secondary" block onClick={onDisconnect}>
            <Unplug className="size-4" />
            Disconnect
          </Button>
        ) : (
          <>
            <Button block onClick={onConnect}>
              Connect {label.toLowerCase()}
            </Button>
            <Button variant="ghost" onClick={onDemo}>
              Use demo
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function SelectStep() {
  const snapshot = useRespotify((s) => s.snapshot);
  const selection = useRespotify((s) => s.selection);
  const dest = useRespotify((s) => s.dest);
  const toggleCatalog = useRespotify((s) => s.toggleCatalog);
  const setPrecise = useRespotify((s) => s.setPrecise);
  const setCopyFollowed = useRespotify((s) => s.setCopyFollowed);
  const startTransfer = useRespotify((s) => s.startTransfer);
  const backFromWizard = useRespotify((s) => s.backFromWizard);
  const notice = useRespotify((s) => s.notice);
  const counts = useMemo(() => (snapshot ? countsFor(snapshot) : null), [snapshot]);

  if (!snapshot || !counts) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Choose what to move</h1>
        <p className="mt-2 text-sm text-muted">
          From {snapshot.user.displayName} to {dest?.user.displayName}. Uncheck anything you want to
          leave behind.
        </p>
        {notice ? <div className="mt-3"><Callout>{notice}</Callout></div> : null}
      </div>
      <ul className="flex flex-col gap-2">
        {(Object.keys(CATALOG_LABELS) as CatalogKey[]).map((key) => (
          <li key={key}>
            <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4">
              <span>
                <span className="block text-sm font-medium">{CATALOG_LABELS[key]}</span>
                {key === "recentArchive" && (
                  <span className="block text-xs text-faint">Saved as a playlist — not real history</span>
                )}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-sm tabular-nums text-muted">{counts[key]}</span>
                <input
                  type="checkbox"
                  checked={selection.catalogs[key]}
                  onChange={() => toggleCatalog(key)}
                  className="size-5 accent-primary"
                />
              </span>
            </label>
          </li>
        ))}
      </ul>
      <label className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-5 accent-primary"
          checked={selection.preciseLikes}
          onChange={(e) => setPrecise(e.target.checked)}
        />
        <span>
          <span className="font-medium">Precise liked-song order</span>
          <span className="mt-1 block text-muted">
            Older saves first so the original newest track lands on top. Slower on large libraries.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-5 accent-primary"
          checked={selection.copyFollowedAsNew}
          onChange={(e) => setCopyFollowed(e.target.checked)}
        />
        <span>
          <span className="font-medium">Copy followed playlists as new</span>
          <span className="mt-1 block text-muted">
            Default is follow-in-place. Turn this on to duplicate the track list instead. Radio /
            Popular lists rebuild from Spotify search when the original songs are hidden.
          </span>
        </span>
      </label>
      <div className="flex flex-col gap-2">
        <Button block onClick={() => void startTransfer()}>
          Start transfer
        </Button>
        <Button variant="ghost" onClick={backFromWizard}>
          Back
        </Button>
      </div>
    </div>
  );
}

function TransferStep() {
  const progress = useRespotify((s) => s.progress);
  const pause = useRespotify((s) => s.pause);
  const error = useRespotify((s) => s.error);
  const notice = useRespotify((s) => s.notice);
  const startTransfer = useRespotify((s) => s.startTransfer);
  const busy = useRespotify((s) => s.busy);
  const pct =
    progress && progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Moving your library</h1>
        <p className="mt-2 text-sm text-muted">
          {progress?.catalog ?? "Preparing"}
          {progress?.currentName ? ` · ${progress.currentName}` : ""}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-muted">Progress</span>
          <span className="font-mono text-sm tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 font-mono text-xs tabular-nums text-faint">
          {progress ? `${progress.done} / ${progress.total}` : "0 / 0"}
        </p>
      </div>
      {error && <Callout tone="danger">{error}</Callout>}
      {notice && <Callout>{notice}</Callout>}
      {progress?.errors.length ? <ErrorList errors={progress.errors} /> : null}
      <div className="flex flex-col gap-2">
        {busy ? (
          <Button variant="secondary" block onClick={pause}>
            <Pause className="size-4" />
            Pause
          </Button>
        ) : (
          <Button block onClick={() => void startTransfer()}>
            Resume
          </Button>
        )}
      </div>
    </div>
  );
}

function DoneStep() {
  const report = useRespotify((s) => s.report);
  const snapshot = useRespotify((s) => s.snapshot);
  const dest = useRespotify((s) => s.dest);
  const reset = useRespotify((s) => s.reset);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Transfer complete</h1>
        <p className="mt-2 text-sm text-muted">
          Copied into {dest?.user.displayName}. Open Spotify on the destination account to confirm.
        </p>
      </div>
      {report && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {Object.entries(report.copied).map(([key, n]) => (
            <li key={key} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{CATALOG_LABELS[key as CatalogKey] ?? key}</span>
              <span className="font-mono tabular-nums text-muted">{n}</span>
            </li>
          ))}
        </ul>
      )}
      {report?.errors.length ? <ErrorList errors={report.errors} /> : null}
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          block
          disabled={!snapshot}
          onClick={() => snapshot && downloadBackup(snapshotToBackup(snapshot))}
        >
          <Download className="size-4" />
          Download library backup
        </Button>
        <Button block onClick={reset}>
          Start another transfer
        </Button>
      </div>
    </div>
  );
}

function BackupTab() {
  const snapshot = useRespotify((s) => s.snapshot);
  const importFile = useRespotify((s) => s.importFile);
  const notice = useRespotify((s) => s.notice);
  const error = useRespotify((s) => s.error);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Backup</h1>
        <p className="mt-2 text-sm text-muted">
          Download a JSON snapshot of the source library, or restore a Respotify backup / Spotify
          privacy export as playlists.
        </p>
      </div>
      {error && <Callout tone="danger">{error}</Callout>}
      {notice && <Callout>{notice}</Callout>}
      <Button
        variant="secondary"
        block
        disabled={!snapshot}
        onClick={() => snapshot && downloadBackup(snapshotToBackup(snapshot))}
      >
        <Download className="size-4" />
        {snapshot ? "Download current library" : "Connect a source first"}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = "";
        }}
      />
      <Button block onClick={() => fileRef.current?.click()}>
        <FolderInput className="size-4" />
        Import backup or privacy export
      </Button>
      <Honesty />
    </div>
  );
}

function SetupTab() {
  const clientIdValue = useRespotify((s) => s.clientId);
  const redirectUri = useRespotify((s) => s.redirectUri);
  const setClientIdValue = useRespotify((s) => s.setClientIdValue);
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Setup</h1>
        <p className="mt-2 text-sm text-muted">
          This phone app runs the same engine as the git repo. Spotify login is official OAuth — not
          a Grok connector.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-4 text-primary" />
          <div className="text-sm">
            <p className="font-medium">{standalone ? "Running as an installed app" : "Install on Android"}</p>
            <p className="mt-1 text-muted">
              {standalone
                ? "Chrome opened Respotify without the browser chrome."
                : "In Chrome: menu → Add to Home screen. Spotify login still uses Spotify’s own page, not a WebView."}
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium">Live Spotify</p>
        <p className="text-sm text-muted">
          Create an app in the Spotify Developer Dashboard, add this Redirect URI, then paste the
          Client ID. Add both Spotify emails under Users Management (development mode, max 5). The
          dashboard owner needs Premium.
        </p>
        <CopyField value={redirectUri} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Client ID</span>
          <input
            value={clientIdValue}
            onChange={(e) => setClientIdValue(e.target.value)}
            placeholder="Paste your Spotify Client ID"
            className="min-h-11 rounded-md border border-border bg-raised px-3 text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/70"
          />
        </label>
      </div>
    </div>
  );
}

function Honesty() {
  return (
    <aside className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 size-4 text-primary" />
        <div className="text-sm">
          <p className="font-medium">What this can and cannot copy</p>
          <p className="mt-1 text-muted">
            Playlists, liked songs, albums, artists, podcasts, and episodes copy through Spotify’s
            official API. Radio / Popular lists that Spotify will not return are rebuilt from search
            (songs Spotify can find). Daily Mix, Discover Weekly, and similar Made For You lists
            stay hidden. Listening history, Wrapped, followers, and the taste algorithm cannot be
            written to another account. Recently played is saved as a playlist archive.
          </p>
        </div>
      </div>
    </aside>
  );
}

function ErrorList({ errors }: { errors: { item: string; message: string }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-danger/40 bg-danger/10">
      <p className="border-b border-danger/30 px-4 py-3 text-sm">
        {errors.length} item{errors.length === 1 ? "" : "s"} could not be copied
      </p>
      <ul className="max-h-80 overflow-y-auto">
        {errors.map((e, i) => (
          <li key={`${e.item}-${i}`} className="border-t border-danger/20 px-4 py-3 text-sm">
            <p className="font-medium">{e.item}</p>
            <p className="mt-1 break-words text-muted">{e.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Callout({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "danger" }) {
  return (
    <p
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "danger"
          ? "border-danger/40 bg-danger/10 text-fg"
          : "border-border bg-raised text-muted",
      )}
    >
      {children}
    </p>
  );
}

function CopyField({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(value)}
      className="min-h-11 truncate rounded-md border border-border bg-raised px-3 text-left font-mono text-xs text-fg"
    >
      {value || "Redirect URI appears here in the browser"}
    </button>
  );
}
