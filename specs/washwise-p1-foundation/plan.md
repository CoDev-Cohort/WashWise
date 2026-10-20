# Implementation Plan: WashWise P1 · Foundation

**Date**: 2026-10-20
**Spec**: specs/washwise-p1-foundation/spec.md
**Status**: Draft
**Linear**: COH-6 (tasks 1.1–1.8 = COH-11 – COH-18)

## Summary

Build a client-only React + TypeScript single-page app on Vite. P1 delivers:

- the app shell: routes, a query provider, an error boundary and a ≤430px column
- design tokens in light and dark as CSS variables consumed by Tailwind
- a typed Open-Meteo client wrapped in a TanStack Query hook
- a pure, fully unit-tested verdict engine driven by one config file
- a WMO-code icon map, PWA installability, and the four project documents

The verdict engine is the core asset. It works on epoch timestamps and takes `now` as an argument, so every rule (daylight windows, the switch to tomorrow, polar days, missing data) is tested without clocks or the network.

## Technical Context

**Stack**: TypeScript 5.x (strict), React 19, Vite 7, Tailwind CSS v4, React Router v7 (declarative/data router), TanStack Query v5, pnpm 10, Node 22 LTS
**Primary Dependencies**: `react-router`, `@tanstack/react-query`, `react-error-boundary`, `lucide-react`, Meteocons SVGs (vendored), `@fontsource-variable/fraunces`, `@fontsource-variable/plus-jakarta-sans`, `@fontsource/barlow`, `vite-plugin-pwa`
**Dev Dependencies**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw` v2, `@playwright/test`, `eslint` (flat config) + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `eslint-plugin-import-x` + `eslint-import-resolver-typescript`, `prettier` + `prettier-plugin-tailwindcss`, `@vite-pwa/assets-generator`, `tsx`
**Storage**: None persistent. The forecast lives in the in-memory TanStack Query cache. localStorage for the theme choice arrives in P3.
**Target Layer(s)**: Frontend only. No backend. Public, keyless APIs are called directly from the browser.
**Performance Goals**: The spec sets none for P1. Forecast reuse is 30 min (FR-008) and the request timeout is 10 s (FR-008a).
**Constraints**:

- Verdict code must not import React (FR-006); this is enforced by an ESLint rule.
- All thresholds go in one config (FR-005).
- WCAG 2.1 AA contrast in both themes (FR-014).
- Location always comes from the device (no city search).
- Tokens are written as hex so the contrast test can parse them.

## Data Model

No database. These are TypeScript types only.

### Forecast (normalized), `src/features/forecast/types.ts`

```ts
type EpochMs = number;

interface HourlyPoint {
  time: EpochMs;                 // start of the hour
  precipProbability: number | null; // %
  precipitation: number | null;  // mm
  temperature: number | null;    // °C
  relativeHumidity: number | null; // %
  windSpeed: number | null;      // km/h
  cloudCover: number | null;     // %
  weatherCode: number | null;    // WMO
  isDay: boolean | null;
}

interface DailyPoint {
  date: string;                  // 'YYYY-MM-DD' in location tz
  start: EpochMs;                // local midnight
  sunrise: EpochMs | null;
  sunset: EpochMs | null;
  daylightDuration: number;      // seconds (0 = polar night, ≥ 86 340 = polar day)
  weatherCode: number | null;
  precipProbabilityMax: number | null;
  precipitationSum: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
}

interface Forecast {
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetSeconds: number;
  fetchedAt: EpochMs;
  hourly: HourlyPoint[];   // 168 entries
  daily: DailyPoint[];     // 7 entries
}
```

The raw Open-Meteo response type (`OpenMeteoResponse`) is kept separate. `normalizeForecast()` converts unix seconds to ms, zips the parallel arrays into objects, and checks that the array lengths match.

### Verdicts, `src/features/verdict/types.ts`

```ts
type Verdict = 'go' | 'caution' | 'notYet';
type Activity = 'laundry' | 'carWash';

type DryingEstimate =
  | { kind: 'hours'; hours: number }   // e.g. 2.6
  | { kind: 'tomorrow' };              // won't dry before sunset

type VerdictReason =
  | 'rainHigh' | 'rainModerate' | 'dryingSlow' | 'dryingTooSlow'
  | 'wontDryBeforeDark' | 'noDaylight'
  | 'heavyRainDay1' | 'rainDay1' | 'rainDay2' | 'rainTotal';

type VerdictResult =
  | {
      status: 'ok';
      activity: Activity;
      verdict: Verdict;
      subLabel: string;
      reasons: VerdictReason[];
      window: { start: EpochMs; end: EpochMs };
      forTomorrow: boolean;            // laundry switched to tomorrow (FR-001)
      drying?: DryingEstimate;         // laundry only
    }
  | { status: 'unavailable'; activity: Activity; reason: 'missingData' };

interface DayVerdicts {
  date: string;
  laundry: VerdictResult;
  carWash: VerdictResult;
}

type OtherDaysLabel = 'Yes' | 'Maybe' | 'Wait' | '—';
```

### Verdict config, `src/features/verdict/config.ts` (FR-005, FR-004g)

```ts
export const VERDICT_CONFIG = {
  rain: { goBelowPct: 30, notYetAbovePct: 60 },          // 30–60 inclusive = caution
  laundry: {
    windowHours: 6,
    switchToTomorrowBelowHours: 2,
    usableDaylightEndsBeforeSunsetHours: 1,
    dryingGoMaxHours: 4,
    dryingCautionMaxHours: 8,
  },
  carWash: {
    windowHours: 48,
    goMaxTotalMm: 0.5,          // < 0.5 mm over 48 h
    notYetDay1Mm: 2,            // ≥ 2 mm in hours 0–24
    cautionDay2MinMm: 0.5,      // ≥ 0.5 mm in hours 24–48
  },
  missingData: { maxMissingRatio: 0.25 },
  polar: { polarDayMinSeconds: 86_340 },
  drying: { k: 0.1328, vpdExponent: 0.3, windCoeffPerKmh: 0.05, windFactorMax: 2.5, sunCoeff: 0.5 },
} as const;
```

### Weather icon map, `src/features/icons/wmoIcons.ts`

```ts
interface WeatherIconSpec { day: string; night: string; label: string } // Meteocons names
const WMO_ICONS: Record<number, WeatherIconSpec>;   // all Open-Meteo WMO codes
const FALLBACK_ICON: WeatherIconSpec;               // 'not-available'
```

The codes covered are 0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96 and 99, mapped to Meteocons names such as `clear-day`/`clear-night`, `partly-cloudy-day`/`-night`, `overcast-day`/`-night`, `fog-day`/`-night`, `drizzle`, `sleet`, `rain`, `snow`, `hail` and `thunderstorms-day`/`-night`/`-rain`.

## Figma Token Inventory (extracted 2026-10-21 from `design/WashWise.fig`, Homepage 393×852)

These were decoded from the file's canvas data. T047 transcribes them; there's no guesswork left.

**Colors (light)**

| Token                                                        | Hex                                                       | Used for in Figma                                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `--color-bg`                                                 | `#FFFFFF`                                                 | Homepage frame                                                                                                                       |
| `--color-bg-subtle`                                          | `#FAFAF9`                                                 | Named style "Background"                                                                                                             |
| `--color-surface`                                            | `#FFFFFF`                                                 | Named style "Surface"                                                                                                                |
| `--color-surface-muted`                                      | `#F2F6FB`                                                 | Location pill, rain-bar track                                                                                                        |
| `--color-ink`                                                | `#1F335C`                                                 | Headings, verdict word, selected day chip, chip text                                                                                 |
| `--color-ink-strong`                                         | `#1B2F55`                                                 | Logo, percentages, day labels, location text                                                                                         |
| `--color-ink-muted`                                          | `#5A6B80`                                                 | Hour labels                                                                                                                          |
| `--color-ink-section`                                        | `#4E6A8A`                                                 | Section titles (RAIN CHANCE, OTHER DAYS)                                                                                             |
| `--color-on-ink`                                             | `#FFFFFF`                                                 | Text on the selected day chip                                                                                                        |
| `--color-accent`                                             | `#3A7BBE`                                                 | Other Days status text and icons                                                                                                     |
| `--color-accent-alt`                                         | `#3E86C6`                                                 | Other Days "Yes" icon stroke                                                                                                         |
| `--color-border`                                             | `#D3D3D3`                                                 | Day chip border                                                                                                                      |
| `--color-rain-1` … `--color-rain-5`                          | `#9BCFEC` `#74B5E2` `#5FA1D5` `#4473A3` `#1F335C`         | Rain bar fill, rising chance                                                                                                         |
| `--color-go-bg` / `-border` / `-text` / `-pill` / `-dot`     | `#D9F2EC` / `#62D280` / `#07695C` / `#CBE3DE` / `#62D280` | Go Wash card, day dot                                                                                                                |
| `--color-notyet-bg` / `-border` / `-text` / `-pill` / `-dot` | `#F2D9D9` / `#F7B0B0` / `#9C3D3D` / `#E3CBCB` / `#F7B0B0` | Not yet card, day dot                                                                                                                |
| `--color-caution-*`                                          | _derived in T047_                                         | **Not in Figma.** Derive an amber set with the same structure (bg / border / text / pill / dot). The text must reach 4.5:1 on the bg |

**Radii**: `--radius-sm 4px` (location pill), `--radius-md 8px` (weather pill), `--radius-lg 12px` (day chip), `--radius-xl 16px` (verdict card).

**Spacing**: the frame doesn't use auto-layout, so spacing comes from positions:

- page gutter `26px`. Rain Chance and Other Days sit at 31px, an inconsistency normalised to 26
- day-chip gap `12px`
- verdict-card gap `18px`

Everything else uses Tailwind's 4px scale.

**Type scale**

| Token      | Font              | Weight | Size               | Figma use                            |
| ---------- | ----------------- | ------ | ------------------ | ------------------------------------ |
| `display`  | Fraunces          | 700    | 40                 | Logo                                 |
| `title`    | Plus Jakarta Sans | 700    | 24                 | "Should you wash?"                   |
| `verdict`  | Plus Jakarta Sans | 800    | 28                 | "Go Wash" / "Not yet"                |
| `date`     | Barlow            | 600    | 20                 | Day-chip date                        |
| `metric`   | Plus Jakarta Sans | 700    | 15                 | Rain %                               |
| `body`     | Plus Jakarta Sans | 400    | 13.5               | Hour labels                          |
| `status`   | Plus Jakarta Sans | 700    | 13                 | Yes / Maybe / Wait                   |
| `section`  | Plus Jakarta Sans | 700    | 12                 | Section titles (uppercase)           |
| `sublabel` | Barlow            | 700    | 12                 | "Good to go"                         |
| `day`      | Plus Jakarta Sans | 700    | 11.5               | TODAY / WED                          |
| `eyebrow`  | Barlow            | 600    | 10                 | LAUNDRY / CAR WASH                   |
| `caption`  | Barlow            | 500    | 10                 | Weekday in chip                      |
| `pill`     | Plus Jakarta Sans | 800    | **10** (Figma 4.5) | Weather pills, raised for legibility |
| `location` | Barlow            | 500    | **10** (Figma 8)   | Location pill, raised for legibility |

Line height is 100% throughout, and letter spacing is 0. Weights to load: Fraunces 700; Plus Jakarta Sans 400, 700, 800; Barlow 500, 600, 700.

## API Contracts

### External: Open-Meteo Forecast (no auth, FR-007)

`GET https://api.open-meteo.com/v1/forecast`

| Param                   | Value                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `latitude`, `longitude` | rounded to 2 dp (≈1 km), which also stabilises the cache key                                                                          |
| `hourly`                | `precipitation_probability,precipitation,temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,weather_code,is_day`          |
| `daily`                 | `weather_code,sunrise,sunset,daylight_duration,precipitation_probability_max,precipitation_sum,temperature_2m_max,temperature_2m_min` |
| `timezone`              | `auto`                                                                                                                                |
| `timeformat`            | `unixtime` (absolute timestamps avoid confusion between the browser's time zone and the location's)                                   |
| `forecast_days`         | `7`                                                                                                                                   |
| `wind_speed_unit`       | `kmh` (explicit)                                                                                                                      |

- **200**: `OpenMeteoResponse` with `utc_offset_seconds`, `timezone`, `hourly{time[], …}` and `daily{time[], …}`. Arrays may contain `null`.
- **400**: `{ error: true, reason: string }`.

### Internal module contracts

| Function                | Signature                                                                                                           | Notes                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetchForecast`         | `(lat: number, lon: number, opts?: { signal?: AbortSignal }) => Promise<Forecast>`                                  | Builds the URL, applies the 10 s timeout, normalizes the response. Throws `ForecastError { kind: 'network' \| 'timeout' \| 'http' \| 'invalid'; status?; message }` |
| `useForecast`           | `(lat?: number, lon?: number) => UseQueryResult<Forecast, ForecastError>`                                           | Key `['forecast', lat2dp, lon2dp]`. `enabled` only when both coordinates are defined (P2 supplies location)                                                         |
| `computeLaundryVerdict` | `(f: Forecast, now: EpochMs, cfg = VERDICT_CONFIG) => VerdictResult`                                                | Today's verdict, with the switch to tomorrow                                                                                                                        |
| `computeCarWashVerdict` | `(f: Forecast, now: EpochMs, cfg?) => VerdictResult`                                                                | 48 h from the current hour                                                                                                                                          |
| `computeDayVerdicts`    | `(f: Forecast, cfg?) => DayVerdicts[]`                                                                              | One entry per forecast day, windows anchored at that day's sunrise (FR-004f)                                                                                        |
| `estimateDrying`        | `(hours: HourlyPoint[], start: EpochMs, deadline: EpochMs, cfg?) => DryingEstimate`                                 | Accumulates hourly drying progress (see the algorithm below)                                                                                                        |
| `toOtherDaysLabel`      | `(r: VerdictResult) => OtherDaysLabel`                                                                              | Maps go/caution/notYet/unavailable to Yes/Maybe/Wait/—                                                                                                              |
| `getWeatherIcon`        | `(code: number \| null, isDay: boolean \| null, variant: 'static' \| 'animated') => { src: string; label: string }` | Unknown or null code gives the fallback. Null `isDay` gives the day icon                                                                                            |
| `getUsableDaylight`     | `(day: DailyPoint, cfg?) => { start: EpochMs; end: EpochMs } \| null`                                               | `null` means polar night                                                                                                                                            |

### Verdict engine algorithms (spec FR-001 – FR-004g)

**Time bucketing**: hour `h` belongs to day `d` when `d.start ≤ h.time < next.start`. Using the next day's start, rather than adding 24 h, handles 23 h and 25 h DST days. All comparisons use epoch ms, so the browser's time zone never matters.

**Usable daylight** (FR-004d):

- Normally `[sunrise, sunset − 1 h]`.
- If `daylightDuration ≥ 86 340` (polar day), it is the whole day `[d.start, next.start)`.
- If sunrise/sunset is missing, or `sunset − 1 h` is not after sunrise, it is `null`. This covers polar night, which Open-Meteo reports as `sunrise == sunset ==` the day's start (`daylightDuration` is only used to detect polar day).

**Laundry today** (FR-001, FR-004g):

1. `today` is the day containing `now`, and `u = getUsableDaylight(today)`.
2. `remaining = u ? u.end − max(now, u.start) : 0`.
3. If `remaining < 2 h`, set `target = tomorrow` and `forTomorrow = true`. Otherwise `target = today`.
4. If `getUsableDaylight(target)` is null, return **Not yet** ("Better to wait", or the tomorrow variant) with reason `noDaylight`. This is where FR-004d's polar-night rule applies to the assessed day; the switch to tomorrow has already run (Analysis A1).
5. `start = floorHour(max(now, uTarget.start))` and `end = min(start + 6 h, uTarget.end)`. Window hours are those with `start ≤ h.time < end`.
6. `rainMax = max(precipProbability)` over the window hours, skipping nulls (FR-004a).
7. `drying = estimateDrying(hours, start, deadline = target.sunset ?? u.end)`. "Dark" means sunset (FR-004d, Analysis A3). For a polar day the deadline is the end of the day.
8. Missing check (FR-004c): take every hour the verdict reads (the window, plus the drying span up to the deadline or the completion hour). If more than 25% of them have a null in any required field (`precipProbability` for window hours; `temperature`, `relativeHumidity`, `windSpeed`, `cloudCover` for drying hours), return `unavailable`.
9. Rules: `rain = rainMax < 30 ? go : rainMax ≤ 60 ? caution : notYet`. `dry = drying.tomorrow ? notYet : h ≤ 4 ? go : h ≤ 8 ? caution : notYet`. The verdict is the more severe of `rain` and `dry`.
10. Sub-label:

    | Verdict                               | Today                   | Tomorrow (`forTomorrow`)              |
    | ------------------------------------- | ----------------------- | ------------------------------------- |
    | Go Wash                               | "Good to go"            | "Good to go tomorrow morning"         |
    | Caution caused by rain (wins if both) | "Dry indoors as backup" | "Tomorrow: dry indoors as backup"     |
    | Caution caused by drying              | "Slow drying day"       | "Tomorrow: slow drying day"           |
    | Not yet                               | "Better to wait"        | "Better to wait — tomorrow looks wet" |

**Drying estimate** (FR-003, FR-003a):

- Each hour from `start` adds `progress += rate(h)`, where
  `rate = k · VPD^0.3 · min(1 + 0.05·wind, 2.5) · (1 + 0.5·(1 − cloud/100))`
  and `VPD = 0.6108·e^(17.27T/(T+237.3)) · (1 − RH/100)` in kPa.
- Drying is complete when `progress ≥ 1`. Interpolate within the final hour to get fractional hours.
- If the deadline arrives first, return `{ kind: 'tomorrow' }`.
- A null hour reuses the previous hour's rate (carry-forward). If there is no earlier hour, use the next available one (FR-004c, Analysis A4).
- Calibrated against the spec's reference cases:

  | Conditions                       | Result  | Target            |
  | -------------------------------- | ------- | ----------------- |
  | 25 °C / 50% / 15 km/h / clear    | ≈ 2.5 h | 2–3 h             |
  | 18 °C / 70% / 5 km/h / 75% cloud | ≈ 6.2 h | 5–7 h             |
  | 10 °C / 90% / calm / overcast    | ≈ 14 h  | > 8 h or tomorrow |

  All constants live in `VERDICT_CONFIG.drying`.

**Car wash today** (FR-002, FR-004b):

1. The window is `[floorHour(now), +48 h)`, made of `day1 = [0, 24 h)` and `day2 = [24 h, 48 h)`.
2. Compute `rainMax` over 48 h, `sum1` over day 1 and `sum2` over day 2. Missing values are skipped, subject to FR-004c.
3. **Not yet** when `rainMax > 60` or `sum1 ≥ 2` → "Rain will undo it".
4. **Go Wash** when `rainMax < 30` and `sum1 + sum2 < 0.5` → "Good to go".
5. Everything else is **Caution**. The sub-label is "Light rain expected today" when `0.5 ≤ sum1 < 2` (reason `rainDay1`, takes precedence). Otherwise it is "Rain likely tomorrow", which covers 30–60% and day-2 rain ≥ 0.5 mm (reasons `rainModerate`, `rainDay2`, or `rainTotal` when only the < 0.5 mm Go total failed). See Analysis A2.

**Future days** (FR-004f):

- Laundry uses `[uDay.start, min(+6 h, uDay.end))`, with the drying deadline at that day's sunset. There is no switch-to-tomorrow step.
- Car wash uses `[day.sunrise ?? day.start, +48 h)`, truncated at the forecast end. Truncated hours are not counted as missing.

## Component / Module Breakdown

| Path                                                  | Responsibility                                                                                                                                   | Task        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `src/main.tsx`                                        | Mount `<AppProviders><RouterProvider/></AppProviders>`; import global CSS and fonts                                                              | 1.1/1.3     |
| `src/app/router.tsx`                                  | `createBrowserRouter`: `/` → `LandingPage`, `/home` → `HomePage`, `*` → redirect to `/`; root `errorElement` → `ErrorFallback`                   | 1.3         |
| `src/app/AppProviders.tsx`                            | `QueryClientProvider` + `AppErrorBoundary`                                                                                                       | 1.3         |
| `src/app/queryClient.ts`                              | `new QueryClient({ defaultOptions: { queries: { staleTime: 30 min, gcTime: 24 h, refetchOnWindowFocus: true, retry: once for network / 5xx only } } })`                    | 1.3/1.4     |
| `src/components/layout/MobileColumn.tsx`              | `mx-auto w-full max-w-[430px] min-h-dvh`, used as the root layout via `<Outlet/>`                                                                | 1.3         |
| `src/components/errors/AppErrorBoundary.tsx`          | `react-error-boundary` wrapper whose reset re-mounts the tree                                                                                    | 1.3         |
| `src/components/errors/ErrorFallback.tsx`             | Friendly message with "Try again" (reset) and "Reload" buttons; lucide `RotateCcw`                                                               | 1.3         |
| `src/pages/LandingPage.tsx`, `src/pages/HomePage.tsx` | Placeholders (content arrives in P2/P3)                                                                                                          | 1.3         |
| `src/features/forecast/api.ts`                        | `fetchForecast`, `buildForecastUrl`, `ForecastError`                                                                                             | 1.4         |
| `src/features/forecast/normalize.ts`                  | Raw response → `Forecast`, with shape validation                                                                                                 | 1.4         |
| `src/features/forecast/useForecast.ts`                | Query hook                                                                                                                                       | 1.4         |
| `src/lib/withTimeout.ts`                              | Combines the caller's signal with a 10 s timeout using `AbortController` + `setTimeout` (avoids `AbortSignal.any` for older iOS)                 | 1.4         |
| `src/features/verdict/config.ts`                      | `VERDICT_CONFIG`                                                                                                                                 | 1.5         |
| `src/features/verdict/daylight.ts`                    | `getUsableDaylight`, `dayForTime`, `hoursInRange`                                                                                                | 1.5         |
| `src/features/verdict/drying.ts`                      | `estimateDrying`, `dryingRate`                                                                                                                   | 1.5         |
| `src/features/verdict/laundry.ts`                     | `computeLaundryVerdict`, `computeLaundryForDay`                                                                                                  | 1.5         |
| `src/features/verdict/carWash.ts`                     | `computeCarWashVerdict`, `computeCarWashForDay`                                                                                                  | 1.5         |
| `src/features/verdict/days.ts`                        | `computeDayVerdicts`                                                                                                                             | 1.5         |
| `src/features/verdict/labels.ts`                      | Sub-label table and `toOtherDaysLabel`                                                                                                           | 1.5         |
| `src/features/verdict/missing.ts`                     | `exceedsMissingRatio`                                                                                                                            | 1.5         |
| `src/features/verdict/index.ts`                       | Public barrel                                                                                                                                    | 1.5         |
| `src/features/icons/wmoIcons.ts`                      | `WMO_ICONS`, `FALLBACK_ICON`                                                                                                                     | 1.6         |
| `src/features/icons/getWeatherIcon.ts`                | Resolves the asset URL by variant and day/night                                                                                                  | 1.6         |
| `src/components/icons/WeatherIcon.tsx`                | `<img>`. Props: `code`, `isDay`, `variant`, `decorative?`. Switches to the static icon under reduced motion; `alt=label` or `alt="" aria-hidden` | 1.6         |
| `src/lib/usePrefersReducedMotion.ts`                  | `matchMedia('(prefers-reduced-motion: reduce)')` subscription                                                                                    | 1.6         |
| `src/styles/index.css`                                | `@import "tailwindcss"`; `@custom-variant dark (&:where(.dark, .dark *))`; `@theme inline` mapping tokens to CSS vars                            | 1.2         |
| `src/styles/tokens.css`                               | `:root { --color-…: #hex; --radius-…; --space-…; --text-… }` and `.dark { … }`                                                                   | 1.2 / 1.8   |
| `src/styles/fonts.ts`                                 | Fontsource imports (bundled CSS uses `font-display: swap`); fallback stacks defined in `@theme`                                                  | 1.2         |
| `src/styles/contrast.test.ts`                         | Parses `tokens.css` for `:root` and `.dark`, then asserts WCAG ratios for a declared list of foreground/background pairs (SC-003)                | 1.8         |
| `vite.config.ts`                                      | React, Tailwind (`@tailwindcss/vite`), `VitePWA`, `@/` alias, Vitest `test` block                                                                | 1.1/1.2/1.7 |
| `vercel.json`                                         | SPA rewrite `/(.*)` → `/index.html` so deep links like `/home` work                                                                              | 1.3         |

UI icons are imported directly from `lucide-react` (`Sun`, `Moon`, `MapPin`, `Shirt`, `Car`, `Check`, `RotateCcw`). The convention is decorative `aria-hidden` by default, plus `aria-label` on the parent button when the icon carries meaning.

## Project Structure

```
WashWise/
├── README.md  CLAUDE.md  DESIGN.md  INFRASTRUCTURE.md
├── docs/ spec.md  plan.md
├── index.html                      # theme-color meta, apple-touch-icon, apple-mobile-web-app-* metas
├── package.json  pnpm-lock.yaml  .nvmrc (22)  .npmrc
├── vite.config.ts  playwright.config.ts  eslint.config.js  .prettierrc
├── tsconfig.json  tsconfig.app.json  tsconfig.node.json   # strict, paths { "@/*": ["src/*"] }
├── pwa-assets.config.ts            # @vite-pwa/assets-generator preset
├── vercel.json
├── public/
│   ├── logo.svg                    # source for generated icons
│   ├── pwa-192x192.png  pwa-512x512.png  maskable-icon-512x512.png
│   ├── apple-touch-icon-180x180.png  favicon.ico
│   └── meteocons/  animated/*.svg  static/*.svg  LICENSE   # vendored subset (MIT)
├── scripts/
│   ├── record-fixtures.ts          # saves real Open-Meteo responses → src/features/forecast/__fixtures__/real/
│   ├── verdict-report.ts           # verdict distribution per fixture location
│   └── check-docs.ts               # fails on leftover task markers (R5)
├── e2e/
│   └── smoke.spec.ts               # both routes render, column ≤ 430 px, manifest link present
└── src/
    ├── main.tsx
    ├── app/        router.tsx  AppProviders.tsx  queryClient.ts
    ├── pages/      LandingPage.tsx  HomePage.tsx
    ├── components/
    │   ├── layout/MobileColumn.tsx
    │   ├── errors/AppErrorBoundary.tsx  ErrorFallback.tsx
    │   └── icons/WeatherIcon.tsx
    ├── features/
    │   ├── forecast/  api.ts  normalize.ts  types.ts  useForecast.ts  __fixtures__/{synthetic,real}/*.json  *.test.ts
    │   ├── verdict/   config.ts  types.ts  daylight.ts  drying.ts  laundry.ts  carWash.ts  days.ts
    │   │              labels.ts  missing.ts  index.ts  *.test.ts  verdicts.golden.test.ts  __fixtures__/builders.ts
    │   └── icons/     wmoIcons.ts  getWeatherIcon.ts  *.test.ts
    ├── lib/        withTimeout.ts  usePrefersReducedMotion.ts
    ├── styles/     index.css  tokens.css  fonts.ts  contrast.test.ts
    └── test/       setup.ts  msw/handlers.ts  msw/server.ts
```

**Scripts** (`package.json`, FR-020):

- `dev`: `vite`
- `build`: `tsc -b && vite build`
- `preview`: `vite preview`
- `typecheck`: `tsc -b --noEmit`
- `lint`: `eslint .`
- `format`: `prettier --write .`
- `test`: `vitest run`
- `test:watch`: `vitest`
- `e2e`: `playwright test` (the webServer runs `pnpm build && pnpm preview --port 4173`)
- `pwa:assets`: `pwa-assets-generator`
- `fixtures:record`: `tsx scripts/record-fixtures.ts` (R1–R3)
- `verdict:report`: `tsx scripts/verdict-report.ts` (R2)
- `docs:check`: `tsx scripts/check-docs.ts` (R5)

**Test strategy**:

- **Verdict engine**: table-driven Vitest tests built from fixtures (`makeForecast({ hours: […] })`), with an explicit `now`. They cover:
  - every boundary in FR-004b (29.9/30/60/60.1%, 4/4.01 h, 8/8.01 h, 0.49/0.5 mm, 1.99/2 mm)
  - the switch to tomorrow at 1:59 and 2:00 remaining
  - car-wash day-1 light rain (0.49 / 0.5 / 1.99 mm in hours 0–24) → "Light rain expected today"
  - polar night today with a normal tomorrow (switches, so not forced Not yet), and polar night on both days (Not yet)
  - a missing hour mid-drying uses the carry-forward rate
  - pre-sunrise
  - polar day and polar night
  - DST days
  - 25% vs 26% missing data
  - forecast-end truncation
  - the three drying reference cases
- **Forecast**: MSW handlers serve 200, 400, 500, malformed responses and a delayed response for the timeout (fake timers).
- **Icons**: every WMO code resolves, `isDay` true and false pick the right variant, and unknown codes give the fallback.
- **Components**: RTL tests for `ErrorFallback` (a thrown child shows the fallback and reset recovers) and `WeatherIcon` (alt text, reduced motion).
- **E2E**: a Playwright smoke test on a Pixel 7 and an iPhone 14 viewport.

**ESLint guard (FR-006)**: a `no-restricted-imports` rule for `src/features/verdict/**` and `src/features/icons/wmoIcons.ts` bans `react`, `react-dom` and `@tanstack/*`.

## Dependencies

| Package                                                                                         | Purpose                                     | Notes                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react`, `react-dom` 19                                                                         | UI                                          | Vite React-TS template                                                                                                                                                                                                                                                                                                                                                       |
| `react-router` 7                                                                                | Routing                                     | `createBrowserRouter`                                                                                                                                                                                                                                                                                                                                                        |
| `@tanstack/react-query` 5 (+ devtools in dev)                                                   | Server-state cache                          |                                                                                                                                                                                                                                                                                                                                                                              |
| `react-error-boundary`                                                                          | Top-level error boundary with reset         |                                                                                                                                                                                                                                                                                                                                                                              |
| `tailwindcss` 4 + `@tailwindcss/vite`                                                           | Styling with CSS-variable tokens            | `class` dark variant via `@custom-variant`                                                                                                                                                                                                                                                                                                                                   |
| `@fontsource-variable/fraunces`, `@fontsource-variable/plus-jakarta-sans`, `@fontsource/barlow` | Self-hosted fonts with `font-display: swap` | Self-hosting avoids a third-party request and lets the fonts be precached in 4.2                                                                                                                                                                                                                                                                                             |
| Meteocons (Bas Milius, MIT)                                                                     | Weather SVGs, static and animated           | **Vendored**, not installed from npm. Checked 2026-10-20: `@bybas/weather-icons@2.0.0` ships only the animated fill set (`production/fill/all`), and `@meteocons/svg@0.1.0` is a proof of concept. Copy the ~35 icons the WMO map needs, in both animated and static form, from the Meteocons GitHub release into `public/meteocons/{animated,static}/` along with `LICENSE` |
| `lucide-react`                                                                                  | UI icons                                    | Tree-shaken named imports                                                                                                                                                                                                                                                                                                                                                    |
| `vite-plugin-pwa` + `@vite-pwa/assets-generator`                                                | Manifest, service worker shell, icons       | P1–P3: `selfDestroying: true`, so the manifest and icons are emitted but the service worker caches nothing and unregisters itself. This avoids stale builds (R4). Task 4.2 turns it off and adds precache and runtime caching. `devOptions.enabled: false`                                                                                                                   |
| `msw` 2                                                                                         | Network mocking in tests                    |                                                                                                                                                                                                                                                                                                                                                                              |
| `vitest`, `jsdom`, `@testing-library/*`                                                         | Unit and component tests                    |                                                                                                                                                                                                                                                                                                                                                                              |
| `@playwright/test`                                                                              | E2E                                         | Chromium + WebKit projects                                                                                                                                                                                                                                                                                                                                                   |
| ESLint/Prettier stack                                                                           | Lint and format                             | `@/` alias resolved through `eslint-import-resolver-typescript`                                                                                                                                                                                                                                                                                                              |

External services:

- **Open-Meteo Forecast API**: keyless, free for non-commercial use, and CORS-enabled.
- **Vercel** hosting: deploy is in P4. `vercel.json` is added now for deep links.

## Project Documentation (FR-021 – FR-023)

| File                | Sections created in 1.1 (placeholders show `> TODO (task X.Y)`)                                                                                                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`         | About · Prerequisites (Node 22, pnpm 10) · Setup · Scripts table · Project docs links (CLAUDE, DESIGN, INFRASTRUCTURE, specs/washwise-p1-foundation/spec.md, specs/washwise-p1-foundation/plan.md) · Credits _(Meteocons, TODO 1.6)_                                                                                                         |
| `CLAUDE.md`         | Overview · Commands · Folder layout · Conventions (TS strict, `@/` imports, tokens only, no React in `features/verdict`) · Testing rules · Product rules (thresholds only in `config.ts`; no city search; device location only) · App structure _(TODO 1.3)_ · Data access via `useForecast` only _(TODO 1.4)_ · Verdict engine _(TODO 1.5)_ |
| `DESIGN.md`         | Figma source · Tokens _(TODO 1.2)_ · Typography _(TODO 1.2)_ · Layout (≤430px column) · Icons _(TODO 1.6)_ · Dark palette & contrast _(TODO 1.8)_ · Verdict colors                                                                                                                                                                           |
| `INFRASTRUCTURE.md` | Architecture (client-only SPA) · External services _(TODO 1.4)_ · Caching & timeouts _(TODO 1.4)_ · PWA _(TODO 1.7)_ · Environments · Hosting & deploy _(TODO P4)_ · CI checks _(TODO P4)_                                                                                                                                                   |

Done check (FR-022): `grep -rn "TODO (task 1\." *.md` returns nothing once P1 is complete (SC-007).

## Constitution Compliance

There is no `AGENTS.md` and no constitution in the repository, so there are no principles to evaluate. **Status: N/A (PASS by default).** Product rules from the spec are enforced instead:

| Rule                                                                      | Status             |
| ------------------------------------------------------------------------- | ------------------ |
| Verdict logic is UI-independent (FR-006)                                  | PASS (lint rule)   |
| Thresholds in one config (FR-005)                                         | PASS (`config.ts`) |
| No implementation of out-of-scope items (location, theme toggle, offline) | PASS               |

## Risk Mitigations (red-team, 2026-10-20)

**R1 + R2 + R3: Real-forecast fixtures, golden verdicts and a distribution gate** (tasks 1.4 / 1.5)

`pnpm fixtures:record` fetches the production query for each location below and saves `{ meta: { place, lat, lon, recordedAt }, response }` to `src/features/forecast/__fixtures__/real/<place>-<date>.json`. The fixtures are committed and only re-recorded on purpose.

| Fixture                     | Why                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Manila (14.60, 120.98)      | Humid tropical. Stress test for R1 drying and R2 "always amber"                                                 |
| London (51.51, −0.13)       | Temperate. The window recorded on 2026-10-20 covers the DST end on 2026-10-25 (a 25 h day)                      |
| Phoenix (33.45, −112.07)    | Dry and sunny. Should produce Go verdicts                                                                       |
| Longyearbyen (78.22, 15.65) | Polar night begins around 2026-10-26, so recording now captures the last sunrises, then `daylight_duration = 0` |
| McMurdo (−77.85, 166.67)    | Polar day begins around 2026-10-24, so `daylight_duration ≈ 86 400`                                             |

- **Contract test (R3)**: `normalize.test.ts` runs every real fixture through `normalizeForecast()`. It asserts 168 hourly and 7 daily entries, day start times that increase, and every hour bucketed into exactly one day. It also records the share of null `precipitation_probability`. If that share is above 5% for any non-polar fixture, the test fails and the missing-data rule (FR-004c) has to be revisited.
- **Golden verdicts (R1)**: `verdicts.golden.test.ts` runs `computeLaundryVerdict`, `computeCarWashVerdict` and `computeDayVerdicts` over each fixture at fixed `now` values (07:00, 13:00, 17:30 and 22:00 local). It compares the results to a committed snapshot. A person reviews the first snapshot against the actual weather and signs it off in the 1.5 PR. After that, any change to the formula or thresholds shows up as a snapshot diff.
- **Distribution gate (R2)**: `pnpm verdict:report` prints the Go / Caution / Not yet / unavailable shares per activity and location, across all hourly `now` values in daylight. **Gate before P3 starts:**
  - car wash is Caution or Not yet on ≤ 70% of samples for London and Phoenix
  - laundry is Go on ≥ 1 sample day for Phoenix
  - "unavailable" is < 2% for non-polar fixtures

  If a gate fails, the threshold change goes through a spec update (FR-004b) and an edit to `config.ts`, never a code change.

**R4: Manifest-only PWA and verification that doesn't rely on Lighthouse** (task 1.7)

- `vite-plugin-pwa` runs with `selfDestroying: true` until 4.2. No app-shell caching means no stale builds for testers through P2 and P3.
- Installability evidence, replacing Lighthouse (whose PWA audits were removed in v12):
  1. Chrome DevTools → Application → Manifest shows no errors or warnings, and the icons for 192, 512 and maskable render.
  2. A manual install on one Android Chrome device and one iOS Safari device (Add to Home Screen), with screenshots attached to COH-17.
- Spec Story 8 criterion 1 and COH-17 were reworded to match.

**R5: Section ownership in docs, checked by a script** (task 1.1, then every task)

- In 1.1, every section in `CLAUDE.md`, `DESIGN.md`, `INFRASTRUCTURE.md` and `README.md` that a later task completes gets wrapped like this:

  ```md
  <!-- owner: 1.4 -->

  ## External services

  > TODO (task 1.4)

  <!-- /owner: 1.4 -->
  ```

  Each task edits only between its own markers. Parallel PRs then touch separate blocks, so merges stay clean.

- `pnpm docs:check --done 1.2,1.4` fails if a `TODO (task X.Y)` line remains for a listed task. Each task's PR runs it with its own number.
- `pnpm docs:check --phase 1` fails if any `TODO (task 1.` remains. This is the SC-007 exit check.
- Until CI exists (P4), both checks are on the PR checklist in `CLAUDE.md`.

## Known Risks

All five red-team risks were chosen for mitigation. The risks that remain after mitigation are:

| Risk                        | Remaining exposure                                                                               | Owner / trigger                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| R1: Drying formula accuracy | The golden snapshot is checked by eye against the forecast, not against real drying measurements | Revisit if user feedback in P4 disputes verdicts                                                                    |
| R2: Verdict skew            | The gate covers only the recorded climates and dates                                             | Re-record fixtures seasonally (`pnpm fixtures:record`)                                                              |
| R3: Open-Meteo changes      | The upstream API or weather models can change after recording                                    | The contract test catches it when fixtures are re-recorded. Runtime normalization throws `ForecastError('invalid')` |
| R4: iOS install behaviour   | iOS install depends on the user finding "Add to Home Screen" manually                            | P2/P3 may add an install hint (out of scope for P1)                                                                 |
| R5: Marker discipline       | Relies on PR checklist compliance until CI arrives in P4                                         | P4 adds `docs:check --phase 1` to CI                                                                                |

## Analysis Overrides

Findings from the spec ↔ plan consistency check (2026-10-20):

| ID  | Severity | Finding                                                                           | Resolution                                                                                                                    |
| --- | -------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A1  | HIGH     | FR-004d (polar night → Not yet) conflicted with FR-001 (switch to tomorrow)       | **Fixed**: the switch runs first and the polar-night rule applies to the assessed day. Spec FR-004d reworded                  |
| A2  | MEDIUM   | Car-wash 0.5 to < 2 mm in the first 24 h fit no rule, and its sub-label was wrong | **Fixed**: Caution, "Light rain expected today". Spec FR-004b and Story 1 criterion 6 updated                                 |
| A3  | MEDIUM   | "Won't dry before dark" didn't define dark                                        | **Fixed**: dark = sunset (end of day on polar days). Spec FR-004d                                                             |
| A4  | LOW      | "Skip missing hours" was undefined for drying time                                | **Fixed**: carry forward the nearest earlier hour's rate. Spec FR-004c                                                        |
| A5  | LOW      | Laundry Caution caused by both rain and slow drying: which sub-label?             | **Dismissed**: the plan keeps the rain label ("Dry indoors as backup") as an implementation choice, not written into the spec |
| A6  | LOW      | No manual device-install check for SC-004                                         | **Dismissed**: handled ad hoc during 1.7 review                                                                               |

## Strengthened Position

The verdict engine is still the pure, config-driven core. It is now tested against **real recorded forecasts** from five contrasting places, covering humid tropics, DST, dry desert, polar night and polar day, as well as synthetic boundary cases. That turns "the rules are implemented correctly" into "the rules produce sensible advice in real weather". A distribution gate before P3 catches threshold skew while it's still a one-line config change. The PWA work in P1 is limited to installability, with no caching risk and verification that doesn't depend on the retired Lighthouse audits. Docs ownership markers let 1.2–1.8 run in parallel without conflicts, with a script checking the SC-007 exit criterion.
