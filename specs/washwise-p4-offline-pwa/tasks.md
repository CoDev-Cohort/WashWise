# Tasks: WashWise P4.2 · Offline Mode, Install Prompt and Update Toast

**Date**: 2026-10-21
**Spec**: specs/washwise-p4-offline-pwa/spec.md
**Plan**: specs/washwise-p4-offline-pwa/plan.md
**Structure**: By user story (B)
**Tracker**: Linear COH-30 (task 4.2, parent COH-9)

Format: `- [ ] TaskID [P?] [Story?] [COH-ID] Description — path`
Stories:

- US1 = open the app offline and see the last forecast (P1)
- US2 = know how old the forecast is (P1)
- US3 = update toast (P1)
- US4 = install prompt (P2)

Markers:

- `[HUMAN]` = needs a person; `/implement` prepares it and leaves the box unchecked.
- `[P]` = can run in parallel with the other `[P]` tasks in the same phase (different files, no shared unfinished dependency).

Red-team mitigations from the plan are built in:

- R1 stuck on a bad build → T003, T030
- R2 persisted shape drift → T006
- R3 offline detection → T011, T012
- R4 e2e service-worker flakiness → T004

---

## Phase 1: Setup (blocks everything)

- [ ] T001 [P] [COH-30] Add `@tanstack/react-query-persist-client` and `@tanstack/query-sync-storage-persister` (^5, matching `@tanstack/react-query`) with `pnpm add`; commit the lockfile — package.json, pnpm-lock.yaml
- [ ] T002 [COH-30] Turn on the real service worker: remove `selfDestroying`; `registerType: 'prompt'`, `injectRegister: false`; `workbox.globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}']`, `navigateFallback: 'index.html'`, `cleanupOutdatedCaches: true`, no `runtimeCaching`; update the comment. Add `vite-plugin-pwa/react` to `types` in tsconfig.app.json. Check `pnpm build` reports a precache under ~1.5 MB — vite.config.ts, tsconfig.app.json
- [ ] T003 [P] [COH-30] Add `headers` with `Cache-Control: no-cache` for `/sw.js`, `/index.html` and `/manifest.webmanifest`, keeping the existing rewrite (R1) — vercel.json
- [ ] T004 [P] [COH-30] Set `use.serviceWorkers: 'block'` by default; `pwa.spec.ts` opts back in with `test.use({ serviceWorkers: 'allow' })` (R4) — playwright.config.ts, e2e/pwa.spec.ts

## Phase 2: Foundational (blocking prerequisites)

- [ ] T005 [P] [COH-30] Set `gcTime` to 7 days and export `FORECAST_CACHE_MAX_AGE` (7 days); note in the comment that `refetchOnReconnect` (TanStack default) is relied on for FR-007 and that `gcTime` must stay ≥ the persist max age. Update `queryClient.test.ts` if it pins 24 h — src/app/queryClient.ts
- [ ] T006 [P] [COH-30] Create the only module touching `ww-forecast-cache`:
  - `FORECAST_CACHE_VERSION` constant (the persist `buster`);
  - `safeLocalStorage()` → `localStorage` or `undefined` when access throws;
  - `createForecastPersister()` via `createSyncStoragePersister({ storage, key: 'ww-forecast-cache', throttleTime: 1000 })`;
  - `shouldPersistQuery(query, client)`: successful `['forecast', …]` queries among the 3 newest by `dataUpdatedAt`.

  Tests: non-forecast / errored / 4th-newest excluded; throwing storage; a guard test snapshotting the key set of a normalized fixture `Forecast` that fails with "bump FORECAST_CACHE_VERSION" when it changes (R2) — src/features/forecast/cachePersistence.ts, src/features/forecast/cachePersistence.test.ts

- [ ] T007 [P] [COH-30] Add `getLatestForecast(queryClient)` → `{ data, coords }` of the successful forecast query with the highest `dataUpdatedAt`, or `undefined`; tests with 0, 1 and 3 cached cells — src/features/forecast/cache.ts, src/features/forecast/cache.test.ts
- [ ] T008 [P] [COH-30] Add pure `forecastFromToday(forecast, now)`: drop daily entries with `start + 24 h ≤ now` and hourly points before today's local midnight; `undefined` when no day covers `now`; same object when nothing is dropped. Table-driven tests: fetched today, yesterday, 6 days ago, all past, across the location's midnight with an offset different from the device's — src/features/forecast/fromToday.ts, src/features/forecast/fromToday.test.ts
- [ ] T009 [COH-30] Wrap the app in `PersistQueryClientProvider` with `{ persister: createForecastPersister(), maxAge: FORECAST_CACHE_MAX_AGE, buster: FORECAST_CACHE_VERSION, dehydrateOptions: { shouldDehydrateQuery } }`; fall back to the plain provider when storage is unavailable. Depends on T005, T006 — src/app/AppProviders.tsx

## Phase 3: US1 — Open the app offline and see the last forecast (P1) [COH-30]

- [ ] T010 [US1] [COH-30] Extend `getHomeViewState(query, lastGood, coords, { online, now })`:
  - trim `query.data` and `lastGood.data` with `forecastFromToday`; one that no longer covers today counts as absent (FR-017);
  - data present → `ready`; `stale` with `reason: 'offline'` when offline, `reason: 'failed'` on an error; a fetch in flight alone is never stale;
  - no data and offline → stale `ready` from `lastGood` (with `previousLocation`), else `error` (FR-016, Story 1 criterion 4);
  - no data and online → unchanged.

  Depends on T008 — src/features/home/homeViewState.ts

- [ ] T011 [US1] [COH-30] Treat "offline" as `useOnline()` false **or** a `network` error, never TanStack's fetch status alone (R3). Table-driven rows: online/offline × data/lastGood/none × (no error, paused, `network` error, other error), plus "fetching only → not stale", "`navigator.onLine` true but `network` error" and "cached forecast all in the past" — src/features/home/homeViewState.ts, src/features/home/homeViewState.test.ts
- [ ] T012 [US1] [COH-30] Update `useHomeForecast`: pass `online` and `now` to the view state; seed `lastGood` lazily from `getLatestForecast(useQueryClient())`; expose the shown forecast's `fetchedAt`. Tests with a pre-seeded client: offline cold start in the same cell, offline in a new cell (FR-016), offline with nothing cached → error, `online` event → refetch and stale cleared (FR-007). Depends on T007, T010 — src/features/home/useHomeForecast.ts, src/features/home/useHomeForecast.test.tsx
- [ ] T013 [US1] [COH-30] Feed the trimmed forecast to the day strip, cards, chart and Other Days, so Today is the real today on a restored forecast (FR-004) — src/pages/HomePage.tsx
- [ ] T014 [US1] [COH-30] Page tests (MSW, `vi.useFakeTimers({ toFake: ['Date'], now })`): a forecast restored from a seeded client renders without waiting for the network (SC-005); a forecast fetched yesterday shows today first; a restored forecast older than 30 min refetches in the background and one younger does not (Story 1 criterion 5) — src/pages/HomePage.test.tsx
- [ ] T015 [US1] [COH-30] E2E, Pixel 7 only (`test.skip` on WebKit with the reason; `serviceWorkers: 'allow'`): load `/home` online with `stubForecast`, wait for `navigator.serviceWorker.ready` and a controller, `context.setOffline(true)`, reload → verdict cards and the "Updated" banner visible; deep link `/home` and `/` load offline (FR-001, SC-001). Extend `pwa.spec.ts`: a service worker registers and the precache holds `index.html` — e2e/offline.spec.ts, e2e/pwa.spec.ts

## Phase 4: US2 — Know how old the forecast is (P1) [COH-30]

- [ ] T016 [P] [US2] [COH-30] Add pure `formatDataAge(fetchedAt, now)` → `just now` (< 1 min, also for negative skew), `N min ago`, `N h ago`, `N days ago`. `it.each` on every boundary: −5 s, 59 s, 60 s, 59 min, 60 min, 23 h 59 min, 24 h, 47 h, 48 h — src/features/home/dataAge.ts, src/features/home/dataAge.test.ts
- [ ] T017 [P] [US2] [COH-30] Add an optional `meta` prop to the `banner` variant, rendered **outside** the `role="status"` element in `text-ink-muted` caption tokens, so the label and hint are announced once and the ticking age is not re-announced. Tests: `meta` is visible and not inside the status role — src/components/feedback/StatusNotice.tsx, src/components/feedback/StatusNotice.test.tsx
- [ ] T018 [US2] [COH-30] Wire the banner: label "You’re offline" for `reason: 'offline'`, P4.1's "Couldn’t update the forecast" for `'failed'`; `meta` = `Updated ${formatDataAge(fetchedAt, now)}`. Depends on T012, T016, T017 — src/pages/HomePage.tsx
- [ ] T019 [US2] [COH-30] Page tests: offline shows "You’re offline" and "Updated 2 h ago"; advancing the clock one minute updates the age; the banner goes after the `online` event and a successful refetch (FR-006); no banner while a background refetch is only pending (CHK002); a failed online refetch shows the age too — src/pages/HomePage.test.tsx

## Phase 5: US3 — Update toast (P1) [COH-30]

- [ ] T020 [P] [US3] [COH-30] Add a test helper that `vi.mock`s `virtual:pwa-register/react` with a controllable `useRegisterSW` (set `needRefresh`, spy on `updateServiceWorker`, capture `onRegisteredSW`) — src/test/pwaRegister.ts
- [ ] T021 [US3] [COH-30] Add `useAppUpdate()` around `useRegisterSW`: in `onRegisteredSW`, call `registration.update()` hourly and on `visibilitychange` to visible; each check clears an earlier dismissal while a version is still waiting; swallow registration errors. Returns `{ needRefresh, dismiss, reload }` (`reload` = `updateServiceWorker(true)`). Tests with fake timers for the hourly check, the visibility check, dismissal and its reset. Depends on T020 — src/features/pwa/useAppUpdate.ts, src/features/pwa/useAppUpdate.test.tsx
- [ ] T022 [P] [US3] [COH-30] Add `UpdateToast`: `role="status"`, "A new version is available", `<button>`s "Reload" and "Dismiss", tokens only. Tests by role and name — src/features/pwa/components/UpdateToast.tsx, src/features/pwa/components/UpdateToast.test.tsx
- [ ] T023 [US3] [COH-30] Add `PwaPrompts` (update half) and mount it after the `Outlet` in `MobileColumn`: one fixed slot at the bottom of the ≤ 430 px column with the gutter and `env(safe-area-inset-bottom)`; bottom padding on the column while a prompt shows (FR-012). Tests: toast shows when `needRefresh`, Reload calls `updateServiceWorker(true)`, Dismiss hides it, nothing when there is no update. Depends on T021, T022 — src/features/pwa/components/PwaPrompts.tsx, src/features/pwa/components/PwaPrompts.test.tsx, src/components/layout/MobileColumn.tsx

## Phase 6: US4 — Install prompt (P2) [COH-30]

- [ ] T024 [P] [US4] [COH-30] Add the only module touching `ww-visits`, `ww-visit-counted` (sessionStorage) and `ww-install-dismissed`: `countVisit()` (once per session), `getVisits()`, `isInstallDismissed()`, `dismissInstall()`; all `try/catch`. Tests with a throwing storage and two sessions — src/features/pwa/installStorage.ts, src/features/pwa/installStorage.test.ts
- [ ] T025 [P] [US4] [COH-30] Add the React-free install store: `listenForInstallPrompt()` (keeps a `preventDefault`ed `beforeinstallprompt`, clears on `appinstalled`), `subscribe` / `getSnapshot`, `promptInstall()` → `'accepted' | 'dismissed' | 'unavailable'`, `isStandalone()` (`display-mode: standalone` or `navigator.standalone`). Tests with a dispatched fake event — src/features/pwa/installPrompt.ts, src/features/pwa/installPrompt.test.ts
- [ ] T026 [US4] [COH-30] Call `listenForInstallPrompt()` and `countVisit()` before `createRoot`. Depends on T024, T025 — src/main.tsx
- [ ] T027 [US4] [COH-30] Add `useInstallPrompt()` → `{ canShow, install, dismiss }`, `canShow` = event ∧ not standalone ∧ visits ≥ 2 ∧ not dismissed. Depends on T024, T025 — src/features/pwa/useInstallPrompt.ts, src/features/pwa/useInstallPrompt.test.tsx
- [ ] T028 [P] [US4] [COH-30] Add `InstallPrompt`: "Install WashWise", a short hint, `<button>`s "Install" and "Not now"; tokens only — src/features/pwa/components/InstallPrompt.tsx, src/features/pwa/components/InstallPrompt.test.tsx
- [ ] T029 [US4] [COH-30] Add the install half to `PwaPrompts`: show `InstallPrompt` only on `/home` (`useMatch`), when `canShow` and no update toast is showing (FR-018). Tests: hidden on visit 1, shown on visit 2, hidden while the toast shows and back after Dismiss, "Not now" persists across a remount, hidden when standalone, hidden on `/` — src/features/pwa/components/PwaPrompts.tsx, src/features/pwa/components/PwaPrompts.test.tsx

## Phase 7: Documentation

- [ ] T030 [P] [COH-30] INFRASTRUCTURE.md, new `<!-- owner: 4.2 -->` block "Offline & updates": the precache, the persisted forecast cache (key, newest 3, 7-day max age, `FORECAST_CACHE_VERSION`), stale-while-revalidate via `staleTime`, the update check timing, the no-cache headers and a **kill switch** runbook (re-deploy with `selfDestroying: true`) (R1); the new storage keys. In the 1.4 and 1.7 blocks, only replace the two "arrives in task 4.2" sentences with a link to the new block — INFRASTRUCTURE.md
- [ ] T031 [P] [COH-30] DESIGN.md, new `<!-- owner: 4.2 -->` block: the bottom prompt slot (toast and install prompt), the banner age line, the tokens used and any new token (added to `src/styles/tokens.css` first) — DESIGN.md
- [ ] T032 [P] [COH-30] CLAUDE.md, new `<!-- owner: 4.2 -->` block "Offline and PWA": persistence lives under the QueryClient (`cachePersistence.ts`), `forecastFromToday`, `PwaPrompts` in `MobileColumn`, storage-owning modules, and mocking `virtual:pwa-register/react` with `src/test/pwaRegister.ts` — CLAUDE.md

## Final Phase: Verification

- [ ] T033 [COH-30] Run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm e2e && pnpm build && pnpm docs:check --done 4.2`. Fix anything that fails. No golden snapshot diff is expected: the verdict engine is unchanged — package.json scripts
- [ ] T034 [HUMAN] [COH-30] On a real iPhone and an Android phone: install, open offline (last forecast + age banner), deploy a second build and use the update toast; Android install prompt on the second visit. Screenshots at 393 px in light and dark, attached to COH-30 (SC-001, SC-003, SC-004) — docs/screenshots/pwa/
