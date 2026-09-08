import type { CatalogKey } from "./spotify/types";

export const REPO_URL = "https://github.com/brinza666/respotifyfree";
export const RELEASES_URL = `${REPO_URL}/releases`;
export const APP_URL = "https://brinza666.github.io/respotifyfree/";

export type Locale = "en" | "ru";

const en = {
  title: "Respotify",
  brand: "Respotify",
  tag: "Spotify to Spotify",
  headline: "Move your library. Keep your music.",
  lead: "Connect two accounts through Spotify’s own login, then copy playlists, liked songs, albums, artists, and podcasts. Tokens stay on this device.",
  stepConnect: "Connect",
  stepChoose: "Choose",
  stepMove: "Move",
  stepDone: "Done",
  navTransfer: "Transfer",
  navBackup: "Backup",
  navSetup: "Setup",
  source: "Source",
  destination: "Destination",
  sourceHint: "The account you are leaving",
  destHint: "The account that receives the library",
  connected: "Connected",
  disconnect: "Disconnect",
  connectSource: "Connect source",
  connectDest: "Connect destination",
  useDemo: "Use demo",
  demoAccount: "Demo account",
  continue: "Continue",
  readingLibrary: "Reading library…",
  runDemo: "Run demo transfer",
  openSetup: "Setup and Android APK",
  copyFollowed: "Copy followed playlists as new",
  copyFollowedHelp:
    "On before you scan. Radio / Popular lists rebuild from Spotify search when the original songs are hidden. Uncheck to only follow the original list.",
  honestyTitle: "What this can and cannot copy",
  honestyBody:
    "Playlists, liked songs, albums, artists, podcasts, and episodes copy through Spotify’s official API. Radio / Popular lists that Spotify will not return are rebuilt from search (songs Spotify can find). Daily Mix, Discover Weekly, and similar Made For You lists stay hidden. Listening history, Wrapped, followers, and the taste algorithm cannot be written to another account. Recently played is saved as a playlist archive.",
  chooseTitle: "Choose what to move",
  chooseLead: "From {from} to {to}. Uncheck anything you want to leave behind.",
  recentNote: "Saved as a playlist — not real history",
  preciseLikes: "Precise liked-song order",
  preciseLikesHelp: "Older saves first so the original newest track lands on top. Slower on large libraries.",
  startTransfer: "Start transfer",
  back: "Back",
  movingTitle: "Moving your library",
  preparing: "Preparing",
  progress: "Progress",
  pause: "Pause",
  resume: "Resume",
  doneTitle: "Transfer complete",
  doneLead: "Copied into {name}. Open Spotify on the destination account to confirm.",
  downloadBackup: "Download library backup",
  another: "Start another transfer",
  copyFailed: "{n} item could not be copied",
  copyFailedPlural: "{n} items could not be copied",
  backupTitle: "Backup",
  backupLead:
    "Download a JSON snapshot of the source library, or restore a Respotify backup / Spotify privacy export as playlists.",
  downloadCurrent: "Download current library",
  connectSourceFirst: "Connect a source first",
  importBackup: "Import backup or privacy export",
  setupTitle: "Setup",
  setupLead: "Install the Android APK, set your Spotify app, and choose what the wizard shows.",
  installAndroid: "Install on Android",
  runningInstalled: "Running as an installed app",
  installPwa:
    "In Chrome: menu → Add to Home screen. Spotify login still uses Spotify’s own page, not a WebView.",
  runningPwa: "Chrome opened Respotify without the browser chrome.",
  downloadApk: "Download Android APK",
  apkHelp: "Sideload the debug APK from GitHub Releases. Enable Install unknown apps if Android asks.",
  githubReleases: "Open GitHub Releases",
  githubRepo: "Source on GitHub",
  liveSpotify: "Live Spotify",
  liveHelp:
    "Create an app in the Spotify Developer Dashboard, add this Redirect URI, then paste the Client ID. Add both Spotify emails under Users Management (development mode, max 5). The dashboard owner needs Premium.",
  clientId: "Client ID",
  clientIdPh: "Paste your Spotify Client ID",
  redirectLabel: "Redirect URI (tap to copy)",
  displayOpts: "Display",
  showTrackNames: "Show track names",
  showTrackNamesHelp: "During a transfer, show the song that is being copied.",
  showMoreInfo: "Show more info",
  showMoreInfoHelp: "Show playlist names, rebuild notes, and extra transfer detail.",
  transferOpts: "Transfer defaults",
  language: "Language",
  langEn: "English",
  langRu: "Русский",
  catalog_liked: "Liked songs",
  catalog_albums: "Saved albums",
  catalog_ownedPlaylists: "Owned playlists",
  catalog_followedPlaylists: "Followed playlists",
  catalog_artists: "Followed artists",
  catalog_shows: "Podcast subscriptions",
  catalog_episodes: "Saved episodes",
  catalog_recentArchive: "Recently played archive",
  rebuilt: "rebuilt from search",
  hiddenList: "hidden by Spotify",
  demoConnected: "Demo account connected.",
  demoLoaded: "Demo library loaded. Nothing is written to a real Spotify account.",
  connectBoth: "Connect both accounts first.",
  reconnect: "Reconnect both accounts. Profile did not load.",
  sameAccount:
    "Source and destination are the same account. On Spotify's screen, tap Not you and sign into the other one.",
  readFail: "Could not read the source library.",
  paused: "Transfer paused.",
  transferFail: "Transfer failed.",
  fileFail: "Could not read that file.",
  noTracksFile: "No tracks found in that file.",
  loadedBackup: "Loaded backup from {name}. Connect a destination to restore.",
  historyFound: "Found {n} unique tracks in the export. Connect a destination to save them as a playlist.",
  reconstructSearch:
    "{n} playlist rebuilt from Spotify search (Radio / Popular / public match).",
  reconstructSearchPlural:
    "{n} playlists rebuilt from Spotify search (Radio / Popular / public match).",
  reconstructHidden: "{n} Made For You or locked list has hidden tracks and cannot copy.",
  reconstructHiddenPlural: "{n} Made For You or locked lists have hidden tracks and cannot copy.",
  redirectMissing: "Redirect URI appears here in the browser",
};

const ru: typeof en = {
  title: "Respotify",
  brand: "Respotify",
  tag: "Из Spotify в Spotify",
  headline: "Перенесите библиотеку. Оставьте музыку себе.",
  lead: "Войдите в два аккаунта через официальный вход Spotify, затем скопируйте плейлисты, любимые треки, альбомы, исполнителей и подкасты. Токены остаются на этом устройстве.",
  stepConnect: "Вход",
  stepChoose: "Выбор",
  stepMove: "Копирование",
  stepDone: "Готово",
  navTransfer: "Перенос",
  navBackup: "Архив",
  navSetup: "Настройка",
  source: "Источник",
  destination: "Назначение",
  sourceHint: "Аккаунт, который вы покидаете",
  destHint: "Аккаунт, который получит библиотеку",
  connected: "Подключено",
  disconnect: "Отключить",
  connectSource: "Подключить источник",
  connectDest: "Подключить назначение",
  useDemo: "Демо",
  demoAccount: "Демо-аккаунт",
  continue: "Продолжить",
  readingLibrary: "Читаем библиотеку…",
  runDemo: "Демо-перенос",
  openSetup: "Настройка и Android APK",
  copyFollowed: "Копировать чужие плейлисты как новые",
  copyFollowedHelp:
    "Включайте до сканирования. Радио и Popular собираются поиском Spotify, если исходные треки скрыты. Снимите галочку, чтобы только подписаться на оригинал.",
  honestyTitle: "Что копируется и что нет",
  honestyBody:
    "Плейлисты, любимые треки, альбомы, исполнители, подкасты и эпизоды копируются через официальный API Spotify. Радио и Popular, которые Spotify не отдаёт, собираются поиском (те треки, которые Spotify находит). Daily Mix, Discover Weekly и другие Made For You остаются скрытыми. Историю прослушивания, Wrapped, подписчиков и алгоритм вкуса записать в другой аккаунт нельзя. Недавно проигранное сохраняется как архивный плейлист.",
  chooseTitle: "Что перенести",
  chooseLead: "С {from} на {to}. Снимите галочки с того, что оставляете.",
  recentNote: "Сохраняется как плейлист — это не настоящая история",
  preciseLikes: "Точный порядок любимых треков",
  preciseLikesHelp: "Сначала старые сохранения, чтобы сверху оказался исходный самый новый трек. На больших библиотеках медленнее.",
  startTransfer: "Начать перенос",
  back: "Назад",
  movingTitle: "Копируем библиотеку",
  preparing: "Подготовка",
  progress: "Прогресс",
  pause: "Пауза",
  resume: "Продолжить",
  doneTitle: "Перенос завершён",
  doneLead: "Скопировано в {name}. Откройте Spotify в аккаунте назначения и проверьте.",
  downloadBackup: "Скачать архив библиотеки",
  another: "Новый перенос",
  copyFailed: "Не удалось скопировать {n} элемент",
  copyFailedPlural: "Не удалось скопировать {n} элементов",
  backupTitle: "Архив",
  backupLead:
    "Скачайте JSON-снимок библиотеки источника или восстановите архив Respotify / выгрузку приватности Spotify как плейлисты.",
  downloadCurrent: "Скачать текущую библиотеку",
  connectSourceFirst: "Сначала подключите источник",
  importBackup: "Импорт архива или выгрузки",
  setupTitle: "Настройка",
  setupLead: "Установите Android APK, укажите приложение Spotify и выберите, что показывает мастер.",
  installAndroid: "Установка на Android",
  runningInstalled: "Запущено как установленное приложение",
  installPwa:
    "В Chrome: меню → Добавить на главный экран. Вход в Spotify всё равно идёт через страницу Spotify, не через WebView.",
  runningPwa: "Chrome открыл Respotify без панели браузера.",
  downloadApk: "Скачать Android APK",
  apkHelp: "Установите debug APK со страницы GitHub Releases. Разрешите установку из неизвестных источников, если Android спросит.",
  githubReleases: "Открыть GitHub Releases",
  githubRepo: "Исходный код на GitHub",
  liveSpotify: "Живой Spotify",
  liveHelp:
    "Создайте приложение в Spotify Developer Dashboard, добавьте этот Redirect URI, затем вставьте Client ID. Добавьте оба email Spotify в Users Management (режим разработки, максимум 5). Владельцу кабинета нужен Premium.",
  clientId: "Client ID",
  clientIdPh: "Вставьте Spotify Client ID",
  redirectLabel: "Redirect URI (нажмите, чтобы скопировать)",
  displayOpts: "Отображение",
  showTrackNames: "Показывать названия треков",
  showTrackNamesHelp: "Во время переноса показывать песню, которая копируется.",
  showMoreInfo: "Показывать подробности",
  showMoreInfoHelp: "Показывать имена плейлистов, заметки о сборке поиском и лишние детали переноса.",
  transferOpts: "Параметры переноса",
  language: "Язык",
  langEn: "English",
  langRu: "Русский",
  catalog_liked: "Любимые треки",
  catalog_albums: "Сохранённые альбомы",
  catalog_ownedPlaylists: "Свои плейлисты",
  catalog_followedPlaylists: "Подписки на плейлисты",
  catalog_artists: "Подписки на исполнителей",
  catalog_shows: "Подписки на подкасты",
  catalog_episodes: "Сохранённые эпизоды",
  catalog_recentArchive: "Архив недавно проигранного",
  rebuilt: "собрано поиском",
  hiddenList: "скрыто Spotify",
  demoConnected: "Демо-аккаунт подключён.",
  demoLoaded: "Демо-библиотека загружена. В настоящий Spotify ничего не пишется.",
  connectBoth: "Сначала подключите оба аккаунта.",
  reconnect: "Подключите оба аккаунта снова. Профиль не загрузился.",
  sameAccount:
    "Источник и назначение — один аккаунт. На экране Spotify нажмите Not you и войдите в другой.",
  readFail: "Не удалось прочитать библиотеку источника.",
  paused: "Перенос на паузе.",
  transferFail: "Перенос не удался.",
  fileFail: "Не удалось прочитать этот файл.",
  noTracksFile: "В этом файле нет треков.",
  loadedBackup: "Загружен архив {name}. Подключите назначение, чтобы восстановить.",
  historyFound: "В выгрузке найдено {n} уникальных треков. Подключите назначение, чтобы сохранить их как плейлист.",
  reconstructSearch: "{n} плейлист собран поиском Spotify (Radio / Popular / публичная копия).",
  reconstructSearchPlural: "{n} плейлистов собрано поиском Spotify (Radio / Popular / публичная копия).",
  reconstructHidden: "{n} список Made For You или закрытый список скрывает треки и не копируется.",
  reconstructHiddenPlural: "{n} списков Made For You или закрытых списков скрывают треки и не копируются.",
  redirectMissing: "Redirect URI появится здесь в браузере",
};

export const messages: Record<Locale, typeof en> = { en, ru };

export type MessageKey = keyof typeof en;

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function format(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  let text: string = messages[locale][key] ?? messages.en[key] ?? String(key);
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function catalogLabel(locale: Locale, key: CatalogKey): string {
  return format(locale, `catalog_${key}` as MessageKey);
}

export function failedLabel(locale: Locale, n: number): string {
  return format(locale, n === 1 ? "copyFailed" : "copyFailedPlural", { n });
}
