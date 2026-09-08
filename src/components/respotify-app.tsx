import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Disc3,
  Download,
  FolderInput,
  Pause,
  Shield,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadBackup } from "@/lib/spotify/backup";
import { CATALOG_LABELS, countsFor, snapshotToBackup, useRespotify } from "@/lib/spotify/store";
import type { CatalogKey, Session } from "@/lib/spotify/types";
import { cn } from "@/lib/utils";

export function RespotifyApp() {
  const hydrate = useRespotify((s) => s.hydrate);
  const step = useRespotify((s) => s.step);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <Header />
      <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-6 sm:px-6">
        {step === "home" && <HomeStep />}
        {step === "select" && <SelectStep />}
        {step === "transfer" && <TransferStep />}
        {step === "done" && <DoneStep />}
      </main>
    </div>
  );
}

function Header() {
  const step = useRespotify((s) => s.step);
  return (
    <header className="border-b border-border/80">
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

function HomeStep() {
  const source = useRespotify((s) => s.source);
  const dest = useRespotify((s) => s.dest);
  const clientIdValue = useRespotify((s) => s.clientId);
  const redirectUri = useRespotify((s) => s.redirectUri);
  const error = useRespotify((s) => s.error);
  const notice = useRespotify((s) => s.notice);
  const busy = useRespotify((s) => s.busy);
  const setClientIdValue = useRespotify((s) => s.setClientIdValue);
  const connectDemo = useRespotify((s) => s.connectDemo);
  const connectLive = useRespotify((s) => s.connectLive);
  const disconnect = useRespotify((s) => s.disconnect);
  const runDemoBoth = useRespotify((s) => s.runDemoBoth);
  const loadSourceLibrary = useRespotify((s) => s.loadSourceLibrary);
  const importFile = useRespotify((s) => s.importFile);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Spotify to Spotify</p>
        <h1 className="font-display text-[2.15rem] leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
          Move your library. Keep your music.
        </h1>
        <p className="max-w-prose text-muted">
          Connect two accounts through Spotify’s own login, then copy playlists, liked songs, albums,
          artists, and podcasts. Tokens stay in this browser.
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
        <Button
          block
          disabled={!source || !dest || busy}
          onClick={() => void loadSourceLibrary()}
        >
          {busy ? "Reading library…" : "Continue"}
          <ArrowRight className="size-4" />
        </Button>
        <Button variant="secondary" block onClick={runDemoBoth}>
          Run demo transfer
        </Button>
      </div>

      <Honesty />

      <details className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium">Live Spotify setup</summary>
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-muted">
            Create an app in the Spotify Developer Dashboard, then paste the Client ID. Add this
            Redirect URI exactly:
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
          <p className="text-xs text-faint">
            Without a Client ID, Connect uses demo accounts so you can try the full flow.
          </p>
        </div>
      </details>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Restore</p>
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
        <Button variant="secondary" block onClick={() => fileRef.current?.click()}>
          <FolderInput className="size-4" />
          Import backup or Spotify privacy export
        </Button>
      </div>
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
  const reset = useRespotify((s) => s.reset);
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
            Default is follow-in-place. Turn this on to duplicate the track list instead.
          </span>
        </span>
      </label>
      <div className="flex flex-col gap-2">
        <Button block onClick={() => void startTransfer()}>
          Start transfer
        </Button>
        <Button variant="ghost" onClick={reset}>
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
      {progress?.errors.length ? (
        <ul className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          {progress.errors.slice(0, 6).map((e, i) => (
            <li key={i}>
              {e.item}: {e.message}
            </li>
          ))}
        </ul>
      ) : null}
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
      {report?.errors.length ? (
        <Callout tone="danger">{report.errors.length} items could not be copied.</Callout>
      ) : null}
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

function Honesty() {
  return (
    <aside className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 size-4 text-primary" />
        <div className="text-sm">
          <p className="font-medium">What this can and cannot copy</p>
          <p className="mt-1 text-muted">
            Playlists, liked songs, albums, artists, podcasts, and episodes copy through Spotify’s
            official API. Listening history, Wrapped, followers, and the taste algorithm cannot be
            written to another account. Recently played is saved as a playlist archive.
          </p>
        </div>
      </div>
    </aside>
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
