# Implementation Plan: WashWise P4.2 · Offline Mode, Install Prompt and Update Toast

**Date**: 2026-10-21
**Spec**: [spec.md](spec.md) (Linear COH-30)
**Status**: Draft

## Summary

Turn the self-destroying service worker into a real one that precaches the app shell (all routes work offline) and waits for the user before switching versions. Forecasts are kept across restarts by persisting the TanStack Query cache for forecast queries to `localStorage`. TanStack then gives stale-while-revalidate at the app level: the restored forecast shows at once, and a refetch runs in the background when it is stale and the device is online. The P4.1 home view state learns about "offline" and "cached forecast that no longer covers today", and its existing banner gains an "Updated X ago" line. A single `PwaPrompts` component in the root layout shows the update toast or, on `/home` from the second visit on, the install prompt, never both at once.

## Technical Context

**Stack**: React 19, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, React Router 8, TanStack Query 5, vite-plugin-pwa 2 (Workbox 7), Vitest 5 + Testing Library + MSW 3, Playwright.
**Primary Dependencies**: `vite-plugin-pwa` (already installed; `virtual:pwa-register/react`), `workbox-window` (already a dev dependency, used by the register module), new `@tanstack/react-query-persist-client` and `@tanstack/query-sync-storage-persister`.
**Storage**: `localStorage` only. New keys: `ww-forecast-cache` (persisted forecast queries), `ww-visits` (visit count), `ww-install-dismissed`. `sessionStorage` key `ww-visit-counted` so a visit is counted once per session. Service-worker precache (Cache Storage) for the app's own files.
**Target Layer(s)**: Frontend only (client-only app; no server).
**Performance Goals**: With a cached forecast, the home page renders it on the first render after the router loader (no network wait, SC-005). Precache stays under ~1.5 MB.
**Constraints**: Design tokens only; forecast data only via `useForecast`; cache/retry rules only in `queryClient.ts`; storage access only in the owning storage module; verdict engine untouched; no new user data stored or sent (FR-014).

## Data Model

No server data. Client-side shapes:

| Entity                             | Where                                                    | Fields / notes                                                                                                                                                                                                                                                      |
| ---------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persisted query cache              | `localStorage['ww-forecast-cache']`                      | TanStack dehydrated state. Only successful `['forecast', lat, lon]` queries, at most the **3 most recent** by `dataUpdatedAt`. `maxAge` 7 days. `buster` = `FORECAST_CACHE_VERSION` (a constant in `cachePersistence.ts`, bumped whenever the `Forecast` shape changes), so a shape change discards old data. Not the package version: it is `0.1.0` and never moves (red-team R2). |
| `Forecast.fetchedAt` (existing)    | `src/features/forecast/types.ts`                         | Already set by `normalizeForecast` at fetch time. The age banner reads it, so the age survives a restore.                                                                                                                                                           |
| `HomeViewState` (modified)         | `src/features/home/homeViewState.ts`                     | The stale `ready` variant gets `reason: 'offline' \| 'failed'` and keeps `previousLocation`. `getHomeViewState` takes `online` and `now`.                                                                                                                            |
| Install-prompt state               | `src/features/pwa/installStorage.ts`                     | `visits: number` (incremented once per session), `dismissed: boolean`. Unreadable or blocked storage reads as `visits = 0`, `dismissed = false`; writes never throw.                                                                                                 |
| Deferred install event             | `src/features/pwa/installPrompt.ts` (module-level store) | The captured `beforeinstallprompt` event, or `null`. Cleared on `appinstalled` or after `prompt()` resolves.                                                                                                                                                        |
| Update state                       | `useAppUpdate()`                                         | `needRefresh: boolean`, `dismissed: boolean` (in memory only, so the toast returns on the next launch), `reload()`.                                                                                                                                                  |

No migrations. Existing keys (`ww-location`, `ww-theme`) are unchanged.

## API Contracts

No new or changed external APIs. Open-Meteo and BigDataCloud are called exactly as today; the service worker does **not** intercept them (no runtime caching routes). Forecast offline availability comes from the persisted query cache, which keeps `ForecastError` semantics, the 10 s timeout and retry rules in one place.

## Component / Module Breakdown

### Service worker and build — FR-001, FR-008, FR-009

- **`vite.config.ts`**: remove `selfDestroying`; `registerType: 'prompt'` (never `skipWaiting` on its own, FR-009); `injectRegister: false` (we register from React); `workbox.globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}']` so fonts and the vendored Meteocons are precached; `workbox.navigateFallback: 'index.html'` so `/home` and `/` open offline; `cleanupOutdatedCaches: true`; no `runtimeCaching`. Update the comment.
- **`vercel.json`** (red-team R1): add `headers` with `Cache-Control: no-cache` for `/sw.js`, `/index.html` and `/manifest.webmanifest`, so the browser always revalidates them and a fix reaches users on their next check. Keep the existing rewrite.
- **`tsconfig.app.json`**: add `vite-plugin-pwa/react` to `types`.

### Forecast persistence — FR-002, FR-003, FR-007, FR-014, FR-016

- **`src/app/queryClient.ts`**: `gcTime` 7 days (must be ≥ persist `maxAge`, or restored queries are dropped). Export `FORECAST_CACHE_MAX_AGE`. Keep `refetchOnReconnect` (TanStack default) and say so in the comment (FR-007). Retry rules unchanged.
- **`src/features/forecast/cachePersistence.ts`** (new, the only module touching `ww-forecast-cache`): `createForecastPersister()` wraps `createSyncStoragePersister({ storage: safeLocalStorage, key, throttleTime: 1000 })`; `shouldPersistQuery(query, client)` keeps successful forecast queries that are among the 3 newest; `safeLocalStorage` returns `null` storage when access throws, so the app runs without persistence.
- **`src/features/forecast/cache.ts`** (new, pure-ish): `getLatestForecast(queryClient)` returns `{ data, coords }` for the forecast query with the highest `dataUpdatedAt`, or `undefined`. Used to seed `lastGood` after a restart (FR-016).
- **`src/app/AppProviders.tsx`**: swap `QueryClientProvider` for `PersistQueryClientProvider` with `{ persister, maxAge, buster: FORECAST_CACHE_VERSION, dehydrateOptions: { shouldDehydrateQuery } }`. Restore is synchronous from `localStorage`, so the first `/home` render already has data. Tests keep using a plain `QueryClientProvider` via `createQueryClient()`.

### "Covers today" trimming — FR-004, FR-017

- **`src/features/forecast/fromToday.ts`** (new, pure, takes `now`): `forecastFromToday(forecast, now)` drops `daily` entries whose local day has ended (`start + 24 h ≤ now`, using the forecast's own `start` values) and hourly points before today's local midnight. Returns `undefined` when no daily entry covers `now`. Returns the same object when nothing was dropped, so memoised consumers don't re-render. Verdict functions are unchanged; they already take `now`.

### Home view state and age banner — FR-005, FR-006, FR-016, FR-017

- **`src/features/home/homeViewState.ts`**: signature `getHomeViewState(query, lastGood, coords, { online, now })`.
  - Trim every candidate (`query.data`, `lastGood.data`) with `forecastFromToday`; a candidate that no longer covers today counts as absent.
  - Data present → `ready`. `stale` when `!online` (`reason: 'offline'`) or `query.error` (`reason: 'failed'`). A background fetch in flight alone is never stale (CHK002).
  - No data, offline: `lastGood` → stale `ready` with `previousLocation`; else `error` (the offline query is `paused`, not errored, so today it would sit on the skeleton forever — Story 1 criterion 4).
  - No data, online: unchanged (`loading`, or `error` after a failure).
  - Offline is decided by `useOnline()` **or** a `network` error, never by TanStack's fetch status alone: TanStack v5 assumes "online" at startup, so an offline cold start shows up as a failed fetch (after one retry), not a paused query; and `navigator.onLine` can be `true` on a dead connection. The banner wording comes from `errorLabel`, which already handles both (red-team R3).
- **`src/features/home/useHomeForecast.ts`**: pass `online` and `now`; seed `lastGood` lazily from `getLatestForecast(useQueryClient())` so a restart in a new cell still has something to show (FR-016). Expose `fetchedAt` of the shown forecast.
- **`src/features/home/dataAge.ts`** (new, pure): `formatDataAge(fetchedAt, now)` → `just now` (< 1 min), `N min ago` (< 60 min), `N h ago` (< 24 h), `N days ago`; clamps negative skew to `just now`. Table-driven tests on every boundary.
- **`src/components/feedback/StatusNotice.tsx`**: optional `meta` prop (the "Updated X ago" line) for the `banner` variant, rendered **outside** the `role="status"` element, so the label/hint are announced once when the banner appears and the per-minute age changes are not re-announced (Story 2 criterion 4) but stay readable.
- **`src/pages/HomePage.tsx`**: banner label by reason — `offline`: "You’re offline"; `failed`: "Couldn’t update the forecast" (P4.1 copy, unchanged). `meta`: `Updated ${formatDataAge(fetchedAt, now)}`. `days`, cards, chart and Other Days use the trimmed forecast. `now` from the existing `useNow()`.

### Update toast — FR-008, FR-009, FR-012, FR-013

- **`src/features/pwa/useAppUpdate.ts`** (new): wraps `useRegisterSW` from `virtual:pwa-register/react`. In `onRegisteredSW` it calls `registration.update()` every hour and on `visibilitychange` to visible (launch is covered by registration itself). Each check also clears an earlier dismissal while a version is still waiting, so the toast returns (spec Story 3, A3). Returns `{ needRefresh, dismiss, reload }`; `reload` calls `updateServiceWorker(true)`. Swallows registration errors (no SW support → nothing shown). Registered once, from `PwaPrompts`.
- **`src/features/pwa/components/UpdateToast.tsx`** (new): `role="status"`, text "A new version is available", buttons "Reload" and "Dismiss" (labelled `<button>`s). Tokens only.

### Install prompt — FR-010, FR-011, FR-018

- **`src/features/pwa/installPrompt.ts`** (new, no React): module-level store. `listenForInstallPrompt()` is called from `main.tsx` before render (the event can fire before React mounts); it `preventDefault()`s and keeps `beforeinstallprompt`, and clears it on `appinstalled`. `subscribe` / `getSnapshot` for `useSyncExternalStore`, `promptInstall()` → `'accepted' | 'dismissed' | 'unavailable'`. `isStandalone()` checks `matchMedia('(display-mode: standalone)')` and `navigator.standalone`.
- **`src/features/pwa/installStorage.ts`** (new): the only module touching `ww-visits`, `ww-visit-counted`, `ww-install-dismissed`. `countVisit()` (once per session), `getVisits()`, `isInstallDismissed()`, `dismissInstall()`. All wrapped in `try/catch`.
- **`src/features/pwa/useInstallPrompt.ts`** (new): `{ canShow, install, dismiss }`. `canShow` = event available ∧ `!isStandalone()` ∧ `visits ≥ 2` ∧ `!dismissed`.
- **`src/features/pwa/components/InstallPrompt.tsx`** (new): "Install WashWise" + short hint, buttons "Install" and "Not now".
- **`src/features/pwa/components/PwaPrompts.tsx`** (new): calls `useAppUpdate` and `useInstallPrompt`. Shows `UpdateToast` when `needRefresh && !dismissed`; otherwise `InstallPrompt` when `canShow` and the route matches `/home` (`useMatch`). One fixed slot at the bottom of the column (`max-w-[430px]`, gutter, `env(safe-area-inset-bottom)`), so the two can never stack (FR-018).
- **`src/components/layout/MobileColumn.tsx`**: render `<PwaPrompts />` after the `Outlet`; add bottom padding while a prompt is visible so the last section can scroll clear of it (FR-012).
- **`src/main.tsx`**: call `listenForInstallPrompt()` and `countVisit()` before `createRoot`.

### Docs

- **INFRASTRUCTURE.md**: rewrite the "Service worker" paragraph (precache, prompt update, hourly/foreground checks, no-cache headers) and add a **kill switch** runbook: re-deploy with `selfDestroying: true` to unregister the worker and clear its caches for everyone (R1); and the "no persistent cache" line in Caching & timeouts (persisted forecasts, 7-day `gcTime`/`maxAge`, newest 3, buster); add the new storage keys to Location & storage.
- **DESIGN.md**: document the toast / install prompt slot and the banner age line (tokens used; any new token, e.g. a toast shadow, added to `tokens.css` first).
- **CLAUDE.md**: short "Offline and PWA" section: where persistence lives, `PwaPrompts`, test mocks for `virtual:pwa-register/react`.

## Project Structure

```
src/
  app/
    AppProviders.tsx              (modified: PersistQueryClientProvider)
    queryClient.ts                (modified: gcTime 7 d, FORECAST_CACHE_MAX_AGE)
  components/
    feedback/StatusNotice.tsx     (modified: `meta` line outside the live region)
    layout/MobileColumn.tsx       (modified: PwaPrompts slot)
  features/
    forecast/
      cache.ts (+ .test.ts)                 getLatestForecast
      cachePersistence.ts (+ .test.ts)      persister, shouldPersistQuery, safe storage
      fromToday.ts (+ .test.ts)             forecastFromToday
    home/
      dataAge.ts (+ .test.ts)               formatDataAge
      homeViewState.ts (+ .test.ts)         (modified: online, now, reason, trimming)
      useHomeForecast.ts (+ .test.tsx)      (modified: seed lastGood, fetchedAt)
    pwa/
      installPrompt.ts (+ .test.ts)
      installStorage.ts (+ .test.ts)
      useAppUpdate.ts (+ .test.tsx)
      useInstallPrompt.ts (+ .test.tsx)
      components/
        InstallPrompt.tsx (+ .test.tsx)
        PwaPrompts.tsx (+ .test.tsx)
        UpdateToast.tsx (+ .test.tsx)
  pages/HomePage.tsx (+ .test.tsx)          (modified: offline label, age line, trimmed forecast)
  main.tsx                                  (modified)
  test/pwaRegister.ts                       vi.mock helper for virtual:pwa-register/react
e2e/
  offline.spec.ts                           new (test.use({ serviceWorkers: 'allow' }))
  pwa.spec.ts                               (modified: SW registered, precache present; serviceWorkers 'allow')
playwright.config.ts                        (modified: use.serviceWorkers 'block' by default, R4)
vite.config.ts, tsconfig.app.json, vercel.json
```

## Test Plan

- **Unit (table-driven)**: `formatDataAge` boundaries (59 s, 1 min, 59 min, 60 min, 23 h 59, 24 h, negative); `forecastFromToday` (fetched today, yesterday, 6 days ago, all past, across the location's midnight with a non-device offset); `getHomeViewState` rows for every online/offline × data/lastGood/none × (no error, paused, `network` error, other error) combination, including "fetching only → not stale" and "`navigator.onLine` true but `network` error" (R3); `shouldPersistQuery` (non-forecast, errored, 4th-newest excluded); a guard test that snapshots the key set of a normalized fixture `Forecast` and fails with "bump FORECAST_CACHE_VERSION" when it changes (R2); `installStorage` with throwing storage.
- **Hooks/components** (MSW, no network): `useHomeForecast` restores from a pre-seeded client while offline (`navigator.onLine` stubbed + `offline` event); `HomePage` shows "You’re offline" + "Updated 2 h ago", age ticks with fake timers, banner hidden after the `online` event and a successful refetch; `PwaPrompts` with a mocked `useRegisterSW` (toast shows, Reload calls `updateServiceWorker(true)`, Dismiss hides) and a dispatched fake `beforeinstallprompt` (hidden on visit 1, shown on visit 2, hidden while the toast shows, Not now persists, hidden in standalone).
- **E2E** (`e2e/offline.spec.ts`, production build, **Pixel 7 / Chromium only**: `test.skip` on WebKit, which has no service workers in Playwright; iOS is checked by hand on a device, screenshot in `docs/screenshots/pwa/`, per SC-001): visit `/home` online with the stubbed forecast, wait for `navigator.serviceWorker.ready` and the controller, `context.setOffline(true)`, reload → verdict cards and "Updated" banner visible; deep link `/home` offline loads. Update toast: covered by component tests (deploying a second build inside e2e is out of proportion).

## Dependencies

| Package                                   | Why                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `@tanstack/react-query-persist-client` ^5 | `PersistQueryClientProvider`, restore before first render             |
| `@tanstack/query-sync-storage-persister` ^5 | `localStorage` persister with throttle and error handling           |

No new service; `vite-plugin-pwa` and `workbox-window` are already installed.

## Task mapping

Single Linear task COH-30 (4.2). Suggested order for `/create-tasks`: SW config → persistence → `fromToday` + view state → age banner → update toast → install prompt → `PwaPrompts` slot → e2e → docs.

## Resolved items

The spec has no open `[NEEDS CLARIFICATION]` items. Planning decisions:

- **Where SWR lives**: app-level (persisted TanStack cache), not a Workbox `StaleWhileRevalidate` route. A SW-level SWR would hand the app an old response as if it were fresh (no age, no banner, and the "fresh" copy only lands in the cache for next time), and would bypass `ForecastError`/timeout handling.
- **SC-001 on WebKit** (analysis, HIGH): the offline e2e runs on Chromium only; the spec SC-001 was amended to a manual iPhone check.
- **Analysis A1–A3** (MEDIUM/LOW, fixed in the spec): SWR refetch follows the 30-min `staleTime`; banner message announced once with the age line outside the live region; a dismissed toast reappears on the next update check (`needRefresh` stays true, `dismissed` is in-memory only) and a full restart activates the waiting worker.
- **Banner announcement**: label and hint announced once; the ticking age line sits outside the live region.
- **Visit**: one browser session (`sessionStorage` flag), counted at startup.

## Implementation notes

- **No new packages (changes T001, T009).** `createSyncStoragePersister` is deprecated in TanStack Query 5.104, and `PersistQueryClientProvider` restores asynchronously, which would flash the skeleton before a cached forecast. Persistence uses TanStack's own `dehydrate` / `hydrate` instead (`cachePersistence.ts`): a synchronous restore in `AppProviders` before the first render, and a throttled save on each forecast success plus on `visibilitychange` → hidden. Same storage key, cap, max age and `FORECAST_CACHE_VERSION` buster as planned.
- **`useHomeForecast(coords, now)`** takes `now` from `HomePage`; the shown forecast's age is read from `view.data.fetchedAt` rather than a separate field.
- **ESLint**: `import-x/no-unresolved` ignores `^virtual:` (Vite plugin virtual modules).

## Known Risks

| Risk                                                                                                    | Status                                                                                               |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| R1 Users stuck on a bad or stale build                                                                  | Mitigated: no-cache headers on `sw.js` / `index.html` / manifest; `selfDestroying` kill switch documented |
| R2 Persisted forecast shape drifts after a deploy                                                       | Mitigated: `FORECAST_CACHE_VERSION` buster + key-set guard test                                       |
| R3 Offline detection (TanStack assumes online at start; `navigator.onLine` can lie)                     | Mitigated: view state treats `useOnline()` false or a `network` error as offline; table covers both   |
| R4 A live service worker makes existing e2e flaky                                                       | Mitigated: `serviceWorkers: 'block'` by default; allowed only in offline/pwa specs                     |
| R5 Storage: quota errors; iOS Safari evicts site storage after 7 days unused when not installed         | Accepted: capped at 3 forecasts, safe storage wrapper, 7-day max age matches iOS eviction anyway       |
| `beforeinstallprompt` timing is up to Chromium's engagement heuristics; `preventDefault` also hides Chrome's own mini-infobar | Accepted: intended (one in-app prompt); covered by component tests, not e2e                           |

## Constitution Compliance

There is no `AGENTS.md`; the `CLAUDE.md` conventions act as the constitution.

| Rule                                                               | Status | Note                                                                                              |
| ------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------- |
| Spec → plan → tasks before code                                    | PASS   | This plan precedes tasks                                                                          |
| Design tokens only                                                 | PASS   | Toast/prompt use existing tokens; any new one goes to `tokens.css` + DESIGN.md                    |
| Forecast only via `useForecast`                                    | PASS   | Persistence sits under the QueryClient; components still read `useForecast` / `useHomeForecast`  |
| Cache, retry and timeout rules only in `queryClient.ts` / `api.ts` | PASS   | `gcTime` and max age live in `queryClient.ts`; persister options reference them                   |
| Location / theme storage only in their modules                     | PASS   | New keys each have one owning module                                                              |
| No React in `features/verdict` / `wmoIcons.ts`                     | PASS   | Not touched; `fromToday`, `dataAge`, `installPrompt` are React-free                               |
| Time-dependent logic takes `now`                                   | PASS   | `forecastFromToday`, `formatDataAge`, `getHomeViewState` take `now`                               |
| Tests next to code, no network, query by role                      | PASS   | MSW; SW register module mocked                                                                    |
| Accessibility                                                      | PASS   | Real labelled buttons, `role="status"`, decorative icons hidden                                   |
| No city search, accounts, analytics; client-only                   | PASS   | None added; nothing new leaves the device                                                         |
| Named exports, one component per file                              | PASS   |                                                                                                   |
