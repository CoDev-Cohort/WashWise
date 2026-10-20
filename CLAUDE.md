# CLAUDE.md

Guide for AI coding agents (and humans) working on WashWise. Read this before changing code.

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
  app/          providers, QueryClient, router + routes
  pages/        one component per route
  components/   shared UI (layout/, errors/, icons/)
  features/
    forecast/   Open-Meteo client, normalizer, useForecast, fixtures
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
- Dark mode is a `dark` class on `<html>`. The toggle and its persistence come in P3; it defaults to the system setting.
- No accounts, no server, no analytics in P1.

<!-- owner: 1.3 -->

## App structure

```
main.tsx
└─ AppProviders            src/app/AppProviders.tsx — AppErrorBoundary › QueryClientProvider (+ devtools in dev)
   └─ RouterProvider       src/app/router.ts (createBrowserRouter) — routes in src/app/routes.tsx
      └─ MobileColumn      src/components/layout/MobileColumn.tsx — centered column, max-w 430 px, 26 px gutter
         ├─ /      → LandingPage   (placeholder; location permission in P2)
         ├─ /home  → HomePage      (placeholder; sections in P3)
         └─ *      → redirect to /
```

- **Routes**: add pages in `src/app/routes.tsx` as children of the `MobileColumn` layout so they inherit the column. `routes` is exported separately from `router` so tests can use `createMemoryRouter(routes, { initialEntries })`.
- **QueryClient defaults** (`src/app/queryClient.ts`): `staleTime` 30 min, `gcTime` 24 h, `refetchOnWindowFocus`, `retry: 1`. Tests call `createQueryClient()` to get a fresh client.
- **Errors**: there are two boundaries, and both render `ErrorFallback` (`role="alert"`, "Try again" / "Reload"):
  - `AppErrorBoundary` catches render errors anywhere. "Try again" re-mounts the tree.
  - The route `errorElement` (`RouteErrorFallback`) catches errors thrown inside routes.

  To test it, render a component that throws inside `AppErrorBoundary`, or inside a memory router whose layout has `errorElement: <RouteErrorFallback />`. Silence the expected `console.error` with `vi.spyOn`.

- **Deep links**: `vercel.json` rewrites every path to `index.html` so `/home` works on reload. `vite preview` already does this locally.

<!-- /owner: 1.3 -->

<!-- owner: 1.4 -->

## Data access

- Components get forecast data **only through `useForecast(lat, lon)`** ([`src/features/forecast/useForecast.ts`](src/features/forecast/useForecast.ts)). Never call `fetch` or `fetchForecast` directly from a component.
- The hook stays disabled until both coordinates are defined, and returns the TanStack Query result (`data: Forecast`, `error: ForecastError`).
- Cache, refetch and timeout rules are in [INFRASTRUCTURE.md](INFRASTRUCTURE.md#caching--timeouts). Change them in `src/app/queryClient.ts` and `api.ts`, not per call.
- In tests, mock the network with MSW (`server.use(http.get(FORECAST_ENDPOINT, …))`). Unhandled requests fail the test.
- Real recorded forecasts are in `src/features/forecast/__fixtures__/real/`. Re-record them with `pnpm fixtures:record` only on purpose, and review the golden snapshot diff afterwards.

<!-- /owner: 1.4 -->

<!-- owner: 1.5 -->

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
