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
import { catalogLabel, failedLabel, format, RELEASES_URL, REPO_URL, type MessageKey } from "@/lib/i18n";
import { downloadBackup } from "@/lib/spotify/backup";
import { countsFor, snapshotToBackup, useRespotify } from "@/lib/spotify/store";
import type { CatalogKey, Session } from "@/lib/spotify/types";
import { cn } from "@/lib/utils";

type Tab = "transfer" | "backup" | "setup";

function useT() {
  const locale = useRespotify((s) => s.locale);
  return (key: MessageKey, vars?: Record<string, string | number>) => format(locale, key, vars);
}

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
  const t = useT();
  const label =
    step === "home"
      ? t("stepConnect")
      : step === "select"
        ? t("stepChoose")
        : step === "transfer"
          ? t("stepMove")
          : t("stepDone");
  return (
    <header className="border-b border-border/80 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Disc3 className="size-5 text-primary" strokeWidth={1.6} />
          <span className="font-display text-lg tracking-tight">{t("brand")}</span>
        </div>
        <div className="flex items-center gap-3">
          <LangSwitch />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-faint">{label}</span>
        </div>
      </div>
    </header>
  );
}

function LangSwitch() {
  const locale = useRespotify((s) => s.locale);
  const setLocale = useRespotify((s) => s.setLocale);
  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      <button
        type="button"
        className={cn("rounded-sm px-1.5 py-0.5", locale === "en" ? "text-primary" : "text-faint")}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <span className="text-faint">·</span>
      <button
        type="button"
        className={cn("rounded-sm px-1.5 py-0.5", locale === "ru" ? "text-primary" : "text-faint")}
        onClick={() => setLocale("ru")}
      >
        RU
      </button>
    </div>
  );
}

function BottomNav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const t = useT();
  const items: { id: Tab; label: string; icon: typeof ArrowLeftRight }[] = [
    { id: "transfer", label: t("navTransfer"), icon: ArrowLeftRight },
    { id: "backup", label: t("navBackup"), icon: FolderInput },
    { id: "setup", label: t("navSetup"), icon: Settings },
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

function DemoVideo() {
  const t = useT();
  const locale = useRespotify((s) => s.locale);
  const base = import.meta.env.BASE_URL;
  const src = `${base}demo-${locale}.mp4`;
  const poster = `${base}demo-${locale}.jpg`;
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-sm font-medium">{t("watchDemo")}</p>
        <p className="text-xs text-faint">{t("watchDemoHelp")}</p>
      </div>
      <video
        key={src}
        controls
        playsInline
        muted
        loop
        autoPlay
        preload="metadata"
        poster={poster}
        className="mx-auto max-h-[min(70vh,640px)] w-full bg-bg object-contain"
      >
        <source src={src} type="video/mp4" />
      </video>
    </section>
  );
}

function HomeStep({ onOpenSetup }: { onOpenSetup: () => void }) {
  const t = useT();
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
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">{t("tag")}</p>
        <h1 className="font-display text-[2.15rem] leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
          {t("headline")}
        </h1>
        <p className="max-w-prose text-muted">{t("lead")}</p>
      </section>

      {typeof window !== "undefined" && new URLSearchParams(window.location.search).has("shot") ? null : (
        <DemoVideo />
      )}

      <div className="flex flex-col gap-3">
        <AccountCard
          label={t("source")}
          hint={t("sourceHint")}
          session={source}
          connectLabel={t("connectSource")}
          onConnect={() => void connectLive("source")}
          onDemo={() => connectDemo("source")}
          onDisconnect={() => disconnect("source")}
        />
        <AccountCard
          label={t("destination")}
          hint={t("destHint")}
          session={dest}
          connectLabel={t("connectDest")}
          onConnect={() => void connectLive("destination")}
          onDemo={() => connectDemo("destination")}
          onDisconnect={() => disconnect("destination")}
        />
      </div>

      {error && <Callout tone="danger">{error}</Callout>}
      {notice && <Callout>{notice}</Callout>}

      <CopyFollowedToggle />

      <div className="flex flex-col gap-2">
        <Button block disabled={!source || !dest || busy} onClick={() => void loadSourceLibrary()}>
          {busy ? t("readingLibrary") : t("continue")}
          <ArrowRight className="size-4" />
        </Button>
        <Button variant="secondary" block onClick={runDemoBoth}>
          {t("runDemo")}
        </Button>
        <Button variant="ghost" block onClick={onOpenSetup}>
          {t("openSetup")}
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
  connectLabel,
  onConnect,
  onDemo,
  onDisconnect,
}: {
  label: string;
  hint: string;
  session: Session | null;
  connectLabel: string;
  onConnect: () => void;
  onDemo: () => void;
  onDisconnect: () => void;
}) {
  const t = useT();
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">{label}</p>
          {session ? (
            <div className="mt-2">
              <p className="font-medium">{session.user.displayName}</p>
              <p className="text-sm text-muted">
                {session.mode === "demo" ? t("demoAccount") : session.user.email || session.user.id}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{hint}</p>
          )}
        </div>
        {session && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-raised px-2 py-1 text-xs text-primary">
            <Check className="size-3" />
            {t("connected")}
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {session ? (
          <Button variant="secondary" block onClick={onDisconnect}>
            <Unplug className="size-4" />
            {t("disconnect")}
          </Button>
        ) : (
          <>
            <Button block onClick={onConnect}>
              {connectLabel}
            </Button>
            <Button variant="ghost" onClick={onDemo}>
              {t("useDemo")}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function SelectStep() {
  const t = useT();
  const locale = useRespotify((s) => s.locale);
  const snapshot = useRespotify((s) => s.snapshot);
  const selection = useRespotify((s) => s.selection);
  const dest = useRespotify((s) => s.dest);
  const toggleCatalog = useRespotify((s) => s.toggleCatalog);
  const setPrecise = useRespotify((s) => s.setPrecise);
  const startTransfer = useRespotify((s) => s.startTransfer);
  const backFromWizard = useRespotify((s) => s.backFromWizard);
  const notice = useRespotify((s) => s.notice);
  const showMoreInfo = useRespotify((s) => s.showMoreInfo);
  const counts = useMemo(() => (snapshot ? countsFor(snapshot) : null), [snapshot]);

  if (!snapshot || !counts) return null;

  const owned = snapshot.playlists.filter((p) => p.owned);
  const followed = snapshot.playlists.filter((p) => !p.owned);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">{t("chooseTitle")}</h1>
        <p className="mt-2 text-sm text-muted">
          {t("chooseLead", { from: snapshot.user.displayName, to: dest?.user.displayName ?? "" })}
        </p>
        {notice ? (
          <div className="mt-3">
            <Callout>{notice}</Callout>
          </div>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2">
        {(
          [
            "liked",
            "albums",
            "ownedPlaylists",
            "followedPlaylists",
            "artists",
            "shows",
            "episodes",
            "recentArchive",
          ] as CatalogKey[]
        ).map((key) => (
          <li key={key}>
            <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4">
              <span>
                <span className="block text-sm font-medium">{catalogLabel(locale, key)}</span>
                {key === "recentArchive" && (
                  <span className="block text-xs text-faint">{t("recentNote")}</span>
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
            {showMoreInfo && key === "ownedPlaylists" ? <PlaylistPeek lists={owned} /> : null}
            {showMoreInfo && key === "followedPlaylists" ? <PlaylistPeek lists={followed} /> : null}
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
          <span className="font-medium">{t("preciseLikes")}</span>
          <span className="mt-1 block text-muted">{t("preciseLikesHelp")}</span>
        </span>
      </label>
      <CopyFollowedToggle />
      <div className="flex flex-col gap-2">
        <Button block onClick={() => void startTransfer()}>
          {t("startTransfer")}
        </Button>
        <Button variant="ghost" onClick={backFromWizard}>
          {t("back")}
        </Button>
      </div>
    </div>
  );
}

function PlaylistPeek({
  lists,
}: {
  lists: { name: string; trackCount: number; trackSource?: "search" | "hidden" }[];
}) {
  const t = useT();
  if (lists.length === 0) return null;
  return (
    <ul className="mt-1 mb-2 max-h-40 overflow-y-auto rounded-md border border-border/70 bg-raised px-3 py-2 text-xs text-muted">
      {lists.slice(0, 40).map((list, i) => (
        <li key={`${list.name}-${i}`} className="flex items-baseline justify-between gap-2 py-0.5">
          <span className="truncate">{list.name}</span>
          <span className="shrink-0 font-mono tabular-nums text-faint">
            {list.trackCount}
            {list.trackCount === 0 && !list.trackSource ? ` · ${t("emptyList")}` : ""}
            {list.trackSource === "search" ? ` · ${t("rebuilt")}` : ""}
            {list.trackSource === "hidden" ? ` · ${t("hiddenList")}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TransferStep() {
  const t = useT();
  const progress = useRespotify((s) => s.progress);
  const pause = useRespotify((s) => s.pause);
  const error = useRespotify((s) => s.error);
  const notice = useRespotify((s) => s.notice);
  const startTransfer = useRespotify((s) => s.startTransfer);
  const busy = useRespotify((s) => s.busy);
  const showTrackNames = useRespotify((s) => s.showTrackNames);
  const showMoreInfo = useRespotify((s) => s.showMoreInfo);
  const pct =
    progress && progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">{t("movingTitle")}</h1>
        <p className="mt-2 text-sm text-muted">
          {progress?.catalog ?? t("preparing")}
          {progress?.currentName ? ` · ${progress.currentName}` : ""}
        </p>
        {showTrackNames && progress?.currentTrack ? (
          <p className="mt-1 text-sm text-fg">{progress.currentTrack}</p>
        ) : null}
        {showMoreInfo && progress?.message ? (
          <p className="mt-1 text-xs text-faint">{progress.message}</p>
        ) : null}
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-muted">{t("progress")}</span>
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
            {t("pause")}
          </Button>
        ) : (
          <Button block onClick={() => void startTransfer()}>
            {t("resume")}
          </Button>
        )}
      </div>
    </div>
  );
}

function DoneStep() {
  const t = useT();
  const locale = useRespotify((s) => s.locale);
  const report = useRespotify((s) => s.report);
  const snapshot = useRespotify((s) => s.snapshot);
  const dest = useRespotify((s) => s.dest);
  const reset = useRespotify((s) => s.reset);
  const showMoreInfo = useRespotify((s) => s.showMoreInfo);
  const copiedOwned = useMemo(() => {
    if (!snapshot || !report) return [];
    return snapshot.playlists.filter((p) => p.owned && report.playlistMap[p.id]);
  }, [snapshot, report]);
  const copiedFollowed = useMemo(() => {
    if (!snapshot || !report) return [];
    return snapshot.playlists.filter((p) => !p.owned && report.playlistMap[p.id]);
  }, [snapshot, report]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">{t("doneTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("doneLead", { name: dest?.user.displayName ?? "" })}</p>
      </div>
      {report && (
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {Object.entries(report.copied).map(([key, n]) => (
            <li key={key} className="border-t border-border first:border-t-0">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{catalogLabel(locale, key as CatalogKey)}</span>
                <span className="font-mono tabular-nums text-muted">{n}</span>
              </div>
              {showMoreInfo && key === "ownedPlaylists" ? (
                <div className="px-3 pb-2">
                  <PlaylistPeek lists={copiedOwned} />
                </div>
              ) : null}
              {showMoreInfo && key === "followedPlaylists" ? (
                <div className="px-3 pb-2">
                  <PlaylistPeek lists={copiedFollowed} />
                </div>
              ) : null}
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
          {t("downloadBackup")}
        </Button>
        <Button block onClick={reset}>
          {t("another")}
        </Button>
      </div>
    </div>
  );
}

function BackupTab() {
  const t = useT();
  const snapshot = useRespotify((s) => s.snapshot);
  const importFile = useRespotify((s) => s.importFile);
  const notice = useRespotify((s) => s.notice);
  const error = useRespotify((s) => s.error);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">{t("backupTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("backupLead")}</p>
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
        {snapshot ? t("downloadCurrent") : t("connectSourceFirst")}
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
        {t("importBackup")}
      </Button>
      <Honesty />
    </div>
  );
}

function SetupTab() {
  const t = useT();
  const clientIdValue = useRespotify((s) => s.clientId);
  const redirectUri = useRespotify((s) => s.redirectUri);
  const setClientIdValue = useRespotify((s) => s.setClientIdValue);
  const showTrackNames = useRespotify((s) => s.showTrackNames);
  const setShowTrackNames = useRespotify((s) => s.setShowTrackNames);
  const showMoreInfo = useRespotify((s) => s.showMoreInfo);
  const setShowMoreInfo = useRespotify((s) => s.setShowMoreInfo);
  const locale = useRespotify((s) => s.locale);
  const setLocale = useRespotify((s) => s.setLocale);
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">{t("setupTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("setupLead")}</p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-4 text-primary" />
          <div className="text-sm">
            <p className="font-medium">{standalone ? t("runningInstalled") : t("installAndroid")}</p>
            <p className="mt-1 text-muted">{standalone ? t("runningPwa") : t("installPwa")}</p>
            <p className="mt-2 text-muted">{t("apkHelp")}</p>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-fg"
            >
              <Download className="size-4" />
              {t("downloadApk")}
            </a>
          </div>
        </div>
      </section>

      <details open className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium">{t("displayOpts")}</summary>
        <div className="mt-3 flex flex-col gap-3">
          <CheckRow
            checked={showTrackNames}
            onChange={setShowTrackNames}
            title={t("showTrackNames")}
            help={t("showTrackNamesHelp")}
          />
          <CheckRow
            checked={showMoreInfo}
            onChange={setShowMoreInfo}
            title={t("showMoreInfo")}
            help={t("showMoreInfoHelp")}
          />
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">{t("language")}</span>
            <div className="flex gap-2">
              <button
                type="button"
                className={cn(
                  "min-h-9 rounded-md px-3",
                  locale === "en" ? "bg-primary text-primary-fg" : "bg-raised text-muted",
                )}
                onClick={() => setLocale("en")}
              >
                {t("langEn")}
              </button>
              <button
                type="button"
                className={cn(
                  "min-h-9 rounded-md px-3",
                  locale === "ru" ? "bg-primary text-primary-fg" : "bg-raised text-muted",
                )}
                onClick={() => setLocale("ru")}
              >
                {t("langRu")}
              </button>
            </div>
          </div>
        </div>
      </details>

      <details open className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium">{t("transferOpts")}</summary>
        <div className="mt-3 flex flex-col gap-3">
          <CopyFollowedToggle nested />
          <PreciseLikesToggle />
        </div>
      </details>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium">{t("liveSpotify")}</p>
        <p className="text-sm text-muted">{t("liveHelp")}</p>
        <p className="text-xs text-faint">{t("redirectLabel")}</p>
        <CopyField value={redirectUri} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">{t("clientId")}</span>
          <input
            value={clientIdValue}
            onChange={(e) => setClientIdValue(e.target.value)}
            placeholder={t("clientIdPh")}
            className="min-h-11 rounded-md border border-border bg-raised px-3 text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/70"
          />
        </label>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-sm text-primary">
          {t("githubRepo")}
        </a>
      </div>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  title,
  help,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  help: string;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-5 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium">{title}</span>
        <span className="mt-1 block text-muted">{help}</span>
      </span>
    </label>
  );
}

function PreciseLikesToggle() {
  const t = useT();
  const selection = useRespotify((s) => s.selection);
  const setPrecise = useRespotify((s) => s.setPrecise);
  return (
    <CheckRow
      checked={selection.preciseLikes}
      onChange={setPrecise}
      title={t("preciseLikes")}
      help={t("preciseLikesHelp")}
    />
  );
}

function CopyFollowedToggle({ nested = false }: { nested?: boolean }) {
  const t = useT();
  const selection = useRespotify((s) => s.selection);
  const setCopyFollowed = useRespotify((s) => s.setCopyFollowed);
  if (nested) {
    return (
      <CheckRow
        checked={selection.copyFollowedAsNew}
        onChange={setCopyFollowed}
        title={t("copyFollowed")}
        help={t("copyFollowedHelp")}
      />
    );
  }
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-5 accent-primary"
        checked={selection.copyFollowedAsNew}
        onChange={(e) => setCopyFollowed(e.target.checked)}
      />
      <span>
        <span className="font-medium">{t("copyFollowed")}</span>
        <span className="mt-1 block text-muted">{t("copyFollowedHelp")}</span>
      </span>
    </label>
  );
}

function Honesty() {
  const t = useT();
  return (
    <aside className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 size-4 text-primary" />
        <div className="text-sm">
          <p className="font-medium">{t("honestyTitle")}</p>
          <p className="mt-1 text-muted">{t("honestyBody")}</p>
        </div>
      </div>
    </aside>
  );
}

function ErrorList({ errors }: { errors: { item: string; message: string }[] }) {
  const locale = useRespotify((s) => s.locale);
  return (
    <div className="overflow-hidden rounded-xl border border-danger/40 bg-danger/10">
      <p className="border-b border-danger/30 px-4 py-3 text-sm">{failedLabel(locale, errors.length)}</p>
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
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(value)}
      className="min-h-11 truncate rounded-md border border-border bg-raised px-3 text-left font-mono text-xs text-fg"
    >
      {value || t("redirectMissing")}
    </button>
  );
}
