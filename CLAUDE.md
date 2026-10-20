# CLAUDE.md

Guide for AI coding agents (and humans) working on WashWise. Read this before changing code.

## Overview

> TODO (task 1.1)

## Commands

> TODO (task 1.1)

## Folder layout

> TODO (task 1.1)

## Conventions

> TODO (task 1.1)

## Testing rules

> TODO (task 1.1)

## Product rules

> TODO (task 1.1)

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

> TODO (task 1.1)
