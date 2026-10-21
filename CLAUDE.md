# CLAUDE.md

Guide for AI coding agents (and humans) working on WashWise. Read this before changing code.

## Read First

| File                                   | When                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `.agents/skills/`                      | On-demand AI-SDD skills (any agent; not Claude-only)                                       |
| `specs/ACTIVE_WORKFLOW.md`             | Before any spec/plan/tasks work — points to the active `specs/<slug>/` folder (local only) |
| `specs/<slug>/`                        | Implementing a feature — its `spec.md`, `plan.md` and `tasks.md` define scope              |
| [README.md](README.md)                 | Setup, prerequisites, every `pnpm` script, credits                                         |
| [DESIGN.md](DESIGN.md)                 | Any UI or styling change — Figma source, tokens, typography, icons, dark palette, contrast |
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Data fetching, caching/timeouts, external APIs, PWA/service worker, hosting, CI            |

Do not implement from chat alone. Spec → plan → tasks → code.

## AI-SDD Lifecycle

1. **Specify** — `create-spec` → `specs/spec.md` (WHAT, not HOW)
2. **Plan** — `create-plan` → `plan.md` (do not author a REST `api.md`)
3. **Tasks** — `create-tasks` → `tasks.md`
4. **Execute** — `execute` (organize `specs/<slug>/`, implement, `run-checks`)
5. **PR** — `create-pr` (base `dev`, the integration branch — not `main`)
6. **Review** — `code-review` and/or `code-reviewer`

Skill files: `.agents/skills/`. See that folder’s README for the full pipeline.

New work that is not in the active spec is out of scope until the spec is amended.

## Overview

WashWise is a mobile-first, client-only web app. It tells people whether today is a good day to **do laundry** or **wash the car**, based on the forecast at their current location. Verdicts are three-state: **Go Wash** (green), **Caution** (amber), **Not yet** (red).

Stack: React 19 · TypeScript 6 (strict) · Vite 8 · Tailwind CSS 4 · React Router 8 · TanStack Query 5 · Vitest 5 + Testing Library + MSW 3 · Playwright · vite-plugin-pwa · pnpm 11 · Node 24.

Specs live in `specs/<workflow>/` (spec, plan, tasks). Design: [DESIGN.md](DESIGN.md). Runtime: [INFRASTRUCTURE.md](INFRASTRUCTURE.md).

## Commands

| Command                                    | What it does                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `pnpm dev`                                 | Start the dev server at http://localhost:5173                                                |
| `pnpm build`                               | Type-check and build for production into `dist/`                                             |
| `pnpm preview`                             | Serve the production build at http://localhost:4173                                          |
| `pnpm typecheck`                           | Type-check only (`tsc -b`)                                                                   |
| `pnpm lint`                                | ESLint                                                                                       |
| `pnpm format` / `pnpm format:check`        | Prettier write / check                                                                       |
| `pnpm test`                                | Unit and component tests (Vitest), run once                                                  |
| `pnpm test:watch`                          | Vitest in watch mode                                                                         |
| `pnpm e2e`                                 | Playwright end-to-end tests (builds, then serves on port 4319)                               |
| `pnpm docs:check --done 1.2` / `--phase 1` | Fail if task-owned doc sections are still placeholders                                       |
| `pnpm fixtures:record`                     | Re-record real Open-Meteo responses for the golden tests (deliberate use only)               |
| `pnpm verdict:report`                      | Show how often each verdict appears per fixture location (`--gate` exits 1 on a failed gate) |
| `pnpm pwa:assets`                          | Regenerate PWA icons from `public/logo.svg`                                                  |

Before saying a change is done, run `pnpm lint && pnpm typecheck && pnpm test`. Also run `pnpm e2e` if routing, layout or the build changed.

## Folder layout

```
src/
  app/          providers, QueryClient, router + routes, route guards
  pages/        one component per route
  components/   shared UI (layout/, errors/, feedback/, icons/)
  features/
    forecast/   Open-Meteo client, normalizer, useForecast, fixtures
    location/   device location (useGeolocation), saved position, place name (useCityName), RequireLocation
    verdict/    pure verdict engine + config.ts (no React)
    icons/      WMO code → Meteocons map (no React)
  lib/          small generic helpers and hooks
  styles/       Tailwind entry, design tokens, fonts
  test/         Vitest setup and MSW server
e2e/            Playwright specs
scripts/        tsx scripts (docs:check, fixtures:record, verdict:report)
public/         static assets (PWA icons, vendored Meteocons)
design/         WashWise.fig (Figma source)
specs/          spec, plan and tasks per workflow
```

## Conventions

- **TypeScript strict** with `noUncheckedIndexedAccess`. No `any`; narrow `unknown`.
- **Import with `@/`** for anything outside the current feature folder (`@/features/forecast/types`). Use relative imports inside a folder.
- **Styling: design tokens only.** Use the Tailwind classes generated from `src/styles/tokens.css` (`bg-surface`, `text-ink`, `rounded-lg`, `text-title`…). Never hard-code colors, radii or font sizes. If a value is missing, add a token (and document it in DESIGN.md).
- **No React in `src/features/verdict/` or `src/features/icons/wmoIcons.ts`.** ESLint enforces this (FR-006).
- Named exports for components; one component per file; file name = component name.
- Prettier formats everything (no semicolons, single quotes, width 100). Don't fight it.
- Accessibility: meaningful icons get a label; decorative icons get `aria-hidden`. Every interactive element is a real `<button>` or `<a>`.

## Testing rules

- Tests sit next to the code: `thing.ts` → `thing.test.ts(x)`.
- **Never hit the network in tests.** MSW intercepts `fetch`, and unhandled requests fail the test. Use `server.use(...)` per test.
- Time-dependent logic takes `now` as an argument. Don't mock `Date` unless testing TanStack Query staleness.
- Verdict boundaries are table-driven (`it.each`). Add a row for every new threshold.
- Golden snapshots (`verdicts.golden.test.ts`) show real-world verdicts. Review any diff; never blindly `-u`.
- Components: query by role and accessible name (`getByRole('button', { name: 'Try again' })`), not by class or test ID, unless layout is what's being tested.
- E2E (`e2e/`) runs against the production build on Pixel 7 (Chromium) and iPhone 14 (WebKit).

## Product rules

- **Verdict thresholds live only in `src/features/verdict/config.ts`.** Changing one also means updating spec FR-004b.
- **Always the device's current location.** There's no city search and no manual location (product-wide decision).
- Three verdicts only: Go Wash / Caution / Not yet. The Other Days list shows Yes / Maybe / Wait, or "—" when unavailable.
- Dark mode is a `dark` class on `<html>`. It follows the system setting until the user taps the Sun/Moon toggle; the choice is saved (see Home page and theme).
- No accounts, no server, no analytics in P1.

<!-- owner: 1.3 -->

## App structure

```
main.tsx
└─ AppProviders            src/app/AppProviders.tsx — AppErrorBoundary › QueryClientProvider (+ devtools in dev)
   └─ RouterProvider       src/app/router.ts (createBrowserRouter) — routes in src/app/routes.tsx
      └─ MobileColumn      src/components/layout/MobileColumn.tsx — centered column, max-w 430 px, 26 px gutter
         ├─ /      → LandingPage   src/pages/LandingPage.tsx — location permission; `landingLoader` forwards returning users to /home
         ├─ (homeLoader) RequireLocation   src/features/location/RequireLocation.tsx — refreshes the position, sends the user to / if permission is revoked
         │   └─ /home → HomePage   src/pages/HomePage.tsx — header, day strip, verdict cards, rain chart, Other Days
         └─ *      → redirect to /
```

- **Routes**: add pages in `src/app/routes.tsx` as children of the `MobileColumn` layout so they inherit the column. `routes` is exported separately from `router` so tests can use `createMemoryRouter(routes, { initialEntries })`.
- **QueryClient defaults** (`src/app/queryClient.ts`): `staleTime` 30 min, `gcTime` 24 h, `refetchOnWindowFocus`, and `retry` once only for transient failures (`ForecastError` `network` or `http` ≥ 500; never `timeout`, `invalid` or 4xx). Tests call `createQueryClient()` to get a fresh client.
- **Errors**: there are two boundaries, and both render `ErrorFallback` (`role="alert"`, "Try again" / "Reload"):
  - `AppErrorBoundary` catches render errors anywhere. "Try again" re-mounts the tree.
  - The route `errorElement` (`RouteErrorFallback`) catches errors thrown inside routes.

  To test it, render a component that throws inside `AppErrorBoundary`, or inside a memory router whose layout has `errorElement: <RouteErrorFallback />`. Silence the expected `console.error` with `vi.spyOn`.

- **Deep links**: `netlify.toml` rewrites every path to `index.html` so `/home` works on reload (missing `/assets/*` files are real 404s). `vite preview` already does the rewrite locally. Hosting: [INFRASTRUCTURE.md](INFRASTRUCTURE.md#hosting--deploy).

<!-- /owner: 1.3 -->

<!-- owner: 1.4 -->

## Data access

- Components get forecast data **only through `useForecast(lat, lon)`** ([`src/features/forecast/useForecast.ts`](src/features/forecast/useForecast.ts)). Never call `fetch` or `fetchForecast` directly from a component.
- The hook stays disabled until both coordinates are defined, and returns the TanStack Query result (`data: Forecast`, `error: ForecastError`).
- Cache, refetch and timeout rules are in [INFRASTRUCTURE.md](INFRASTRUCTURE.md#caching--timeouts). Change them in `src/app/queryClient.ts` and `api.ts`, not per call.
- In tests, mock the network with MSW (`server.use(http.get(FORECAST_ENDPOINT, …))`). Unhandled requests fail the test.
- Real recorded forecasts are in `src/features/forecast/__fixtures__/real/`. Re-record them with `pnpm fixtures:record` only on purpose, and review the golden snapshot diff afterwards.

<!-- /owner: 1.4 -->

<!-- owner: 2.1 -->

## Location

- Components get the device location **only through `useGeolocation()`** ([`src/features/location/useGeolocation.ts`](src/features/location/useGeolocation.ts)). Never call `navigator.geolocation`, `navigator.permissions` or `localStorage` for it from a component.
- It returns `{ status, coordinates, request }`. `status` is `idle`, `requesting`, `granted`, `denied`, `blocked` (the spec's "permanently blocked"), `unavailable`, `timeout` or `unsupported`.
- `request()` resolves with the coordinates, or `undefined` if it failed. Navigate on that result, not on a status change.
- It never asks for the position by itself. The one exception is `useGeolocation({ refreshOnMount: true })`, which quietly refreshes a position when permission is already granted.
- Saved coordinates (rounded to 2 dp, no expiry) are available on the first render. Use `.coordinates` for instant rendering.
- One fix per request: no `watchPosition`, no manual location, no city search.
- In tests, call `mockGeolocation()` from [`src/test/geolocation.ts`](src/test/geolocation.ts). `setup.ts` restores the stubs and clears `localStorage` after every test.
- Settings and fallbacks are in [INFRASTRUCTURE.md](INFRASTRUCTURE.md#location--storage).

<!-- /owner: 2.1 -->

<!-- owner: 2.2 -->

## Place name

- The place name for the location pill comes **only from `useCityName(lat, lon)`** ([`src/features/location/useCityName.ts`](src/features/location/useCityName.ts)). Never call `fetchCityName` from a component.
- It returns a plain string and always has something to show: "Your location" while loading, without coordinates, and when the lookup fails. No loading or error branch is needed.
- Names are cached per ~1 km cell for the rest of the visit.
- In tests, mock it with MSW: `server.use(http.get(GEOCODE_ENDPOINT, …))`. Any test that renders `HomePage` needs a handler, because unhandled requests fail the test.
- Details and privacy notes are in [INFRASTRUCTURE.md](INFRASTRUCTURE.md#place-names-bigdatacloud).

<!-- /owner: 2.2 -->

<!-- owner: 2.4 -->

## Route guard

- Who sees what is decided by React Router **loaders** in [`src/app/locationGuards.ts`](src/app/locationGuards.ts), before anything renders, so there is no flash of the wrong page. `landingLoader` on `/` redirects to `/home`; `homeLoader` on `/home` redirects to `/`. Both check the same thing: the browser reports location as `granted` **and** a position is saved. They never throw.
- A returning user never sees the landing page. A new user, a revoked user and a browser without the Permissions API always do.
- `RequireLocation` wraps `/home`. It handles what happens after load: it refreshes the position quietly, and sends the user to `/` if permission is revoked or refused while the app is open. A failed refresh keeps the saved position and never redirects.
- **Pages under `/home` get the position from `useCoordinates()`** ([`src/features/location/useCoordinates.ts`](src/features/location/useCoordinates.ts)), which is always defined there, then call `useForecast(lat, lon)`. They never read `localStorage` or the Geolocation API.
- **P3 hand-off**: the refresh can move the position to a different ~1 km cell, which changes the forecast query key. `useForecast` keeps the previous forecast as `data` while the new one loads (`placeholderData: keepPreviousData`), so the page never blanks.
- Tests that render the real routes must call `mockGeolocation()` and, for a returning user, `saveLocation()` first. The loaders are async, so wait for `router.state.initialized` (see `src/app/routes.test.tsx`).

<!-- /owner: 2.4 -->

<!-- owner: 3.6 -->

## Home page and theme

`HomePage` ([`src/pages/HomePage.tsx`](src/pages/HomePage.tsx)) only wires things together; the sections live in `src/features/home/`.

```
HomePage
├─ HomeHeader        wordmark · LocationPill (tap = re-request location + refetch) · ThemeToggle
├─ h1 "Should you wash?"
├─ DayStrip          6 days, Today first (HomePage holds `selectedDay`)
├─ VerdictCards      Laundry + Car Wash for the selected day
├─ RainChart         5 hourly bars (+ screen-reader list)
├─ OtherDaysList     the strip's days after Today, Laundry + Car Wash markers
└─ HomeSkeleton / StatusNotice   while the first forecast loads / when it fails (see Loading and error states)
```

- **One selected day drives the cards and the chart.** `selectedDay` is an index into `Forecast.daily`. Today (index 0) uses the "from now" engine (`computeLaundryVerdict`, `computeCarWashVerdict`), which can move laundry to tomorrow late in the day. Other days use `computeDayVerdicts`, the same results as Other Days.
- **Pure helpers take `now`** and are tested table-driven: `buildDayStrip`, `getRainBars` (Today = 5 hours from the current one, rolling into the next day; other days = 12–4 PM), `getCardContent`, `buildOtherDays`. Day names and dates come from `DailyPoint.date` and `Forecast.utcOffsetSeconds`, never the device's time zone. `HomePage` gets the time from `useNow()` (re-renders each minute).
- **Location pill**: `useLocationRefresh()` (in `useCoordinates.ts`) calls the same `request()` that `RequireLocation` owns, shared through the router outlet context `{ coordinates, request, status }`, then invalidates the forecast for the new position. One refresh at a time; a failed one keeps the old position and forecast.
- **Theme**: `src/features/theme/`. `useTheme()` returns `{ theme, toggle }`; only `themeStorage.ts` touches `localStorage` (`ww-theme`, `'light' | 'dark'`, absent = follow the system). An inline script in `index.html` sets the `dark` class before first paint; `themeStorage.test.ts` fails if it drifts from `resolveTheme`. Never read the theme from a component directly.
- **States**: see [Loading and error states](#loading-and-error-states) (P4).
- **Tests that render `HomePage`** need MSW handlers for both the forecast and the geocoder, and `vi.useFakeTimers({ toFake: ['Date'], now })` to pin `now` inside the recorded forecast (see `src/pages/HomePage.test.tsx`).

<!-- /owner: 3.6 -->

<!-- owner: 4.1 -->

## Loading and error states

- **`HomePage` switches on one state**: `useHomeForecast(coords)` ([`src/features/home/useHomeForecast.ts`](src/features/home/useHomeForecast.ts)) wraps `useForecast` and returns `{ view, copy, shownCoords, isFetching, retry }`. `view` comes from the pure `getHomeViewState` ([`homeViewState.ts`](src/features/home/homeViewState.ts)): `loading` → `HomeSkeleton`, `error` → `StatusNotice variant="block"`, `ready` → the sections, plus `StatusNotice variant="banner"` when `stale`.
- **Once a forecast has loaded it never leaves the screen.** The hook keeps the last real result (`lastGood`) because TanStack drops `placeholderData` when the query for a new cell fails. A failed update marks the view `stale`; `previousLocation` says the forecast is for an earlier cell, and `shownCoords` then points the pill's `useCityName` at that cell, so the pill and the forecast always agree.
- **One error pattern**: [`StatusNotice`](src/components/feedback/StatusNotice.tsx): one decorative `CircleAlert`, one label, a hint, "Try again". `block` is an `alert`; `banner` is a polite `status` with "Retrying…" (disabled) while `isFetching`. `retry` is `refetch({ cancelRefetch: false })`, so repeated presses join the running request.
- **Error wording lives only in [`errorLabel.ts`](src/features/forecast/errorLabel.ts)**: `network` or the device offline (`useOnline()`) → "You’re offline", `timeout` → "The forecast is taking too long", `http` ≥ 500 → "The forecast service is having trouble", anything else → "We couldn’t load the forecast". Extend it there (4.2 offline work included); never write error copy in a component.
- **Skeletons** (`DayStripSkeleton`, `VerdictCardSkeleton`, `RainChartSkeleton`, `OtherDaysSkeleton`, composed by `HomeSkeleton`) copy their section's frame and use the section's font tokens with a non-breaking space (`BONE` in `skeleton.ts`). If you change a section's padding, gap, type or fixed height, change its skeleton too: `e2e/home-states.spec.ts` compares every `[data-section]` box before and after the forecast arrives, for every recorded fixture at 393 and 430 px in both themes.
- **The place name stays a silent fallback**: no error state for BigDataCloud.
- **Tests**: `getHomeViewState` and `errorLabel` are table-driven; page tests cover each cause, retry, the banner and the previous-location case. In e2e, `holdForecast(page)` (in `e2e/support.ts`) holds Open-Meteo until `release(response)` or `fail()`.

<!-- /owner: 4.1 -->

<!-- owner: 1.5 -->

<!-- owner: 4.2 -->

## Offline and PWA

- **Forecasts persist under the QueryClient**, not in components: [`cachePersistence.ts`](src/features/forecast/cachePersistence.ts) restores them in `AppProviders` before the first render and saves the 3 newest. Components still read `useForecast` / `useHomeForecast`. Changing the `Forecast` shape? Bump `FORECAST_CACHE_VERSION` (a test fails until you do).
- **Offline is `useOnline()`**, passed to `getHomeViewState` with `now`. Stale `ready` states carry `reason: 'offline' | 'failed'`. `forecastFromToday(forecast, now)` drops ended days, so a restored forecast starts at the real today.
- **`PwaPrompts`** (in `MobileColumn`) is the one bottom slot: the update toast (`useAppUpdate`, registers the service worker) wins over the install prompt (`useInstallPrompt`, `/home` only, from the second visit).
- Storage: only `cachePersistence.ts` touches `ww-forecast-cache`; only `installStorage.ts` touches `ww-visits`, `ww-visit-counted`, `ww-install-dismissed`.
- **Tests**: mock the service worker with `vi.mock('virtual:pwa-register/react', () => import('@/test/pwaRegister'))` and drive it with `pwaRegister`. Fake install offers come from `offerInstall()` in [`src/test/installPrompt.ts`](src/test/installPrompt.ts). For offline page tests, stub `navigator.onLine`, dispatch `offline`, and make MSW fail too (TanStack only hears the event once mounted). Reset `onlineManager.setOnline(true)` after.
- Details: [INFRASTRUCTURE.md](INFRASTRUCTURE.md#offline--updates).

<!-- /owner: 4.2 -->

<!-- owner: 4.3 -->

## Accessibility

- Target WCAG 2.2 AA. Design rules (focus ring, targets, forced colors, reflow) are in [DESIGN.md](DESIGN.md#accessibility).
- Every interactive element gets the `focus-ring` utility (`focus-ring-inverse` on `bg-ink`). Busy buttons use `aria-disabled`, never `disabled`, so focus isn't lost.
- Pages set their title with `usePageTitle(...)` ([`src/lib/usePageTitle.ts`](src/lib/usePageTitle.ts)). `useRouteFocus()` in `MobileColumn` focuses `main h1` (`tabIndex={-1}`) after an in-app page change, never on first load.
- **Automated checks** run with `pnpm e2e`:
  - `e2e/a11y.spec.ts`: axe (WCAG 2.2 AA tags plus landmark/heading rules) over every state in [`e2e/a11y/states.ts`](e2e/a11y/states.ts), light and dark. Serious/critical findings fail; moderate/minor are logged as `[axe]`. **Add a state there** when you add a screen or a message.
  - `e2e/keyboard.spec.ts`: Tab order matches DOM order, every stop has a ring, focus stays put after actions (Chromium only).
  - `e2e/layout-a11y.spec.ts`: 24 px targets, 320 px reflow (no overflow, nothing clipped), forced colors, reduced motion, focus not hidden by the bottom prompt.
- States e2e can't reach (update toast, crash screen) use `expectNoSeriousViolations(container)` from [`src/test/axe.ts`](src/test/axe.ts) in their component tests.
- e2e landing states come from `stubGeolocation(page, outcome)` in `e2e/support.ts`; themes from `setTheme(page, theme)`.
- Screen-reader walkthrough (by hand, before release): [`docs/a11y/screen-reader-walkthrough.md`](docs/a11y/screen-reader-walkthrough.md).

<!-- /owner: 4.3 -->

<!-- owner: 4.4 -->

## End-to-end tests

- Specs import **`{ test, expect }` from `./fixtures`**, never from `@playwright/test` (ESLint enforces it). The fixture **fails any test that makes an external request it didn't stub** and names the URL, so stub every service the page calls: `stubExternalServices(page)` (place names; forecast refused), `stubForecast(page)` (recorded Manila forecast and a pinned clock), or your own `page.route`.
- **Location** comes from `fakeLocation(page, { permission, answer })` in `e2e/support.ts`. It returns `{ permission(state), answer(next) }`, so a test can refuse, then allow, or revoke while the page is open; it fires the permission `change` event the app listens to. `stubGeolocation(page, outcome)` is the preset for one landing state. Don't mix it with `LOCATION_ALLOWED` (Playwright's own geolocation), which is fine for specs that only need "granted".
- **Pin the clock** (`page.clock.setFixedTime`) inside the recorded forecast whenever verdicts or hours are checked.
- Flow specs: `permission-flows`, `day-switching` (expected verdicts come from the real engine via a relative import), `theme`. Page checks: `home`, `location`, `smoke`. Accessibility: `a11y`, `keyboard`, `layout-a11y`. PWA: `pwa`, `offline`.
- A test that can't run on one engine is **skipped with a reason** (`test.skip(browserName === 'webkit', '…')`), never deleted. Playwright's WebKit doesn't Tab to buttons; Chromium-only features (offline service worker, forced colors) are skipped on WebKit.
- CI runs everything on both profiles (see [INFRASTRUCTURE.md](INFRASTRUCTURE.md#ci-checks)). If your sandbox lacks WebKit, the PR's `e2e / ios-safari` job is where it runs.

<!-- /owner: 4.4 -->

## Verdict engine

Lives in `src/features/verdict/`. It is pure TypeScript: **no React or TanStack imports** (enforced by ESLint, FR-006). Every function takes `now` as an argument, so tests never touch the clock.

**Thresholds live only in [`config.ts`](src/features/verdict/config.ts)** (`VERDICT_CONFIG`). Never hard-code a number in rule code. If a threshold changes, update spec FR-004b too.

| Function                               | What it returns                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `computeLaundryVerdict(forecast, now)` | Today's laundry verdict (switches to tomorrow when < 2 h usable daylight is left) |
| `computeCarWashVerdict(forecast, now)` | Car-wash verdict for the 48 h from the current hour                               |
| `computeDayVerdicts(forecast)`         | Both verdicts for every forecast day, windows anchored at that day's sunrise      |
| `toOtherDaysLabel(result)`             | `Yes` / `Maybe` / `Wait` / `—`                                                    |

**Laundry** (6 h of usable daylight from now, or from sunrise; usable daylight = sunrise → sunset − 1 h; whole day on a polar day)

| Verdict | Rule                                                               | Sub-label (today / tomorrow)                            |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Go Wash | worst-hour rain < 30% and dries in ≤ 4 h                           | Good to go / Good to go tomorrow morning                |
| Caution | rain 30–60% _(rain label wins)_                                    | Dry indoors as backup / Tomorrow: dry indoors as backup |
| Caution | dries in > 4 h and ≤ 8 h                                           | Slow drying day / Tomorrow: slow drying day             |
| Not yet | rain > 60%, dries in > 8 h, won't dry before sunset, or no sunrise | Better to wait / Better to wait — tomorrow looks wet    |

**Car wash** (48 h from the current hour; "day 1" = first 24 h, "day 2" = next 24 h)

| Verdict | Rule                                      | Sub-label                 |
| ------- | ----------------------------------------- | ------------------------- |
| Not yet | worst-hour rain > 60%, or ≥ 2 mm on day 1 | Rain will undo it         |
| Go Wash | worst-hour rain < 30% and < 0.5 mm total  | Good to go                |
| Caution | 0.5 to < 2 mm on day 1 _(wins)_           | Light rain expected today |
| Caution | anything else (30–60%, ≥ 0.5 mm on day 2) | Rain likely tomorrow      |

**Rules that apply to both**

- Worst hour wins: "rain chance" is the highest hourly value in the window.
- The most severe verdict wins when several rules apply.
- Missing data: skip missing hours. If more than 25% of the hours read are missing a required value, the result is `{ status: 'unavailable' }`, shown as "—" in Other Days. Hours past the forecast end are not "missing".
- Drying: `rate/h = k · VPD^0.3 · wind factor · sun factor`, accumulated hour by hour until dry or dark. A missing hour reuses the previous hour's rate.

**Tests**: boundaries are in `laundry.test.ts` and `carWash.test.ts` (pure `laundryRules` / `carWashRules`). `verdicts.golden.test.ts` snapshots verdicts over real recorded forecasts. A snapshot diff after a change means verdicts changed for real users: review it, don't just update it. `pnpm verdict:report` shows how often each verdict appears per location.

<!-- /owner: 1.5 -->

## PR checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass (and `pnpm e2e` if routing, layout or the build changed)
- [ ] `pnpm docs:check --done <your task, e.g. 1.4>` passes: your doc sections are filled in
- [ ] Only edited doc blocks between your own `<!-- owner: X.Y -->` markers (plus shared sections you were asked to update)
- [ ] Golden snapshot diffs (if any) reviewed and explained in the PR
- [ ] The Linear issue is linked in the PR title or description (`COH-xx`)
