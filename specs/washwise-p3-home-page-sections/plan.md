# Implementation Plan: WashWise P3 · Home Page Sections

**Date**: 2026-10-21
**Spec**: `specs/washwise-p3-home-page-sections/spec.md`
**Status**: Draft

## Summary

Replace the placeholder `HomePage` with the real page: header (logo, location pill, theme toggle), "Should you wash?" title with a 6-day strip, Laundry and Car Wash cards, hourly rain chart and Other Days list. A single `selectedDay` state in the page drives the cards and chart. All verdict, drying and label content comes from the existing verdict engine; new code is presentational components plus small pure helpers (day strip, rain window, pills) and a theme module. The pill refresh reuses the P2 location hook by exposing its `request` through the existing `RequireLocation` outlet context.

## Technical Context

**Stack**: React 19, TypeScript 6 strict, Tailwind 4 (tokens only), TanStack Query 5, React Router 8, Vitest + Testing Library + MSW, Playwright.
**Primary Dependencies**: none new. Icons from `lucide-react` (`Sun`, `Moon`, `MapPin`, `LoaderCircle`, `Shirt`, `Car`, `Check`, `CircleHelp`/`Minus`, `X`) and `WeatherIcon`.
**Storage**: `localStorage` key `ww-theme` (`'light' | 'dark'`; absent = follow system), via try/catch wrappers. Forecast stays in the in-memory query cache.
**Target Layer(s)**: frontend only (client-only app).
**Performance Goals**: the page renders at once from the cached/previous forecast; theme applied before first paint (inline script).
**Constraints**: design tokens only; no React in `src/features/verdict/` or `wmoIcons.ts`; components read forecast only via `useForecast`, position only via `useCoordinates`; no new thresholds (verdict thresholds stay in `config.ts`); no city search.

## Data Model

No new persisted entities. New in-memory view types in `src/features/home/types.ts`:

| Type          | Fields                                                                                         | Built from                       |
| ------------- | ---------------------------------------------------------------------------------------------- | -------------------------------- |
| `StripDay`    | `index`, `date`, `label` ("Today" / "WED"), `dateLabel` ("21"), `weatherCode`                  | `Forecast.daily[0..5]`           |
| `RainBar`     | `time`, `hourLabel`, `percent: number \| null`, `isNextDay: boolean`                           | `Forecast.hourly`                |
| `CardPill`    | `kind: 'drying' \| 'condition'`, `text`, `icon?`                                               | `VerdictResult` + forecast hour  |
| `OtherDayRow` | `index`, `label`, `laundry: OtherDaysLabel`, `carWash: OtherDaysLabel`, `weatherCode`          | `computeDayVerdicts`             |

Selected day is `useState<number>(0)` (index into `forecast.daily`); it resets to 0 if the index no longer exists after a refetch.

## API Contracts

None. The app is client-only. External calls (Open-Meteo, BigDataCloud) are unchanged and documented in `INFRASTRUCTURE.md`. No REST `api.md`.

## Component / Module Breakdown

Pure helpers (no React, unit-tested table-driven, take `now`):

- `src/features/home/dayStrip.ts` `buildDayStrip(forecast, count = 6): StripDay[]` — labels via `Intl.DateTimeFormat` with `timeZone: forecast.timezone`.
- `src/features/home/rainWindow.ts` `getRainBars(forecast, dayIndex, now): RainBar[]` — Today: 5 hours from the current hour, rolling into the next day; other days: 12:00–16:00 local (5 bars, 12/1/2/3/4 PM); missing value → `percent: null`.
- `src/features/home/cardContent.ts` `getCardContent(forecast, dayIndex, now)` — Today uses `computeLaundryVerdict` / `computeCarWashVerdict` (so the tomorrow-switch applies); other days use `computeDayVerdicts(forecast)[i]`. Returns `VerdictResult` plus `CardPill[]`: "Dries in ~2.5 hrs" / "Dries tomorrow" (from `drying`) and the condition label from `getWeatherIcon`. Today's condition = current hour code; other days = `daily.weatherCode`.
- `src/features/home/otherDays.ts` `buildOtherDays(forecast): OtherDayRow[]` — `toOtherDaysLabel` per activity for days after Today.
- `src/features/theme/themeStorage.ts` `readTheme()`, `writeTheme()` (try/catch), `resolveTheme(stored, systemDark)`, `applyTheme(theme)` (toggles `dark` on `<html>` and updates the `theme-color` meta).

Hooks:

- `src/lib/useNow.ts` `useNow(intervalMs = 60_000)` — re-renders each minute so "next 5 hours" stays current.
- `src/features/theme/useTheme.ts` `{ theme, toggle }`; follows system changes only while no explicit choice is saved.
- `src/features/location/useCoordinates.ts` — keep `useCoordinates()` unchanged; add `useLocationRefresh()` returning `{ refresh: () => Promise<Coordinates | undefined>, refreshing: boolean }` from the same outlet context.
- `src/features/location/RequireLocation.tsx` — outlet context becomes `{ coordinates, request, status }`; `useCoordinates` reads `.coordinates`. Update `RequireLocation.test.tsx` and any test using the old shape.

Components (named exports, one per file, each with `.test.tsx`):

- `src/features/home/components/HomeHeader.tsx`, `LocationPill.tsx`, `ThemeToggle.tsx`
- `DayStrip.tsx` (one real `<button>` per day with `aria-pressed` for the selected day; every day is a Tab stop, so no arrow-key roving is needed)
- `VerdictCard.tsx` (props: activity, `VerdictResult`, pills; verdict word, sub-label, `-bg`/`-border`/`-text`/`-pill` tokens), `VerdictCards.tsx`
- `RainChart.tsx` (bars + a visually hidden `<ul>`/`<table>` text alternative)
- `OtherDaysList.tsx`, `OtherDayMarker.tsx` (Yes/Maybe/Wait/— with distinct icon + text)
- `HomeSkeleton.tsx` (loading) and `HomeError.tsx` (alert + "Try again" calling `refetch`)
- `src/pages/HomePage.tsx` — assembles: `useCoordinates` → `useForecast(lat, lon)` with `placeholderData: keepPreviousData` (see note below) → sections; owns `selectedDay`.

`useForecast` currently takes no options, so P3 adds an optional `options` argument (`{ placeholderData }`) or applies `keepPreviousData` inside the hook; do it inside the hook so every page gets it (update `useForecast.test.tsx`).

Pill refresh flow: `refresh()` awaits `request()`; if the position stays in the same ~1 km cell the forecast key is unchanged, so the pill also calls `queryClient.invalidateQueries({ queryKey: forecastKey(lat, lon) })`. The spinner shows while `request` is pending or the forecast `isFetching` from that action. A failed request keeps the data; a `denied` outcome makes `RequireLocation` redirect to `/` (existing revoked-permission behaviour).

No-flash theme: an inline `<script>` in `index.html` `<head>` (before CSS) reads `ww-theme`, falls back to `prefers-color-scheme`, and adds `dark` to `<html>`. It is wrapped in try/catch. The same logic lives in `themeStorage.ts`. The script is a small duplicate kept in `index.html` (with a comment pointing at `themeStorage.ts`), and `themeStorage.test.ts` reads `index.html`, evaluates the script against stubbed storage/`matchMedia`, and asserts it agrees with `resolveTheme` for every stored/system combination.

## Project Structure

```
src/
  features/
    home/                 pure helpers + components for the home sections
      components/
      dayStrip.ts, rainWindow.ts, cardContent.ts, otherDays.ts, types.ts (+ tests)
    theme/                themeStorage.ts, useTheme.ts (+ tests)
  lib/useNow.ts
  pages/HomePage.tsx      assembly + HomePage.test.tsx
index.html                inline no-flash theme script
e2e/home.spec.ts          home page flow (select day, toggle theme, no flash)
```

Docs updated by the matching tasks (owner markers per `docs:check`): `DESIGN.md` (home sections, theme toggle, pill states), `CLAUDE.md` (App structure, Theme section, new hooks), `INFRASTRUCTURE.md` (theme storage key).

## Dependencies

No new packages. Relies on P1 (forecast client, verdict engine, icons, tokens) and P2 (`useCoordinates`, `useCityName`, `RequireLocation`). Tests use the existing MSW server, `mockGeolocation()`, real recorded fixtures and `src/features/verdict/__fixtures__/builders.ts`.

## Task mapping

| Linear | Plan work                                                                           |
| ------ | ----------------------------------------------------------------------------------- |
| 3.1    | HomeHeader, LocationPill, ThemeToggle, theme module, inline script, `useLocationRefresh` |
| 3.2    | `dayStrip.ts`, DayStrip, title                                                      |
| 3.3    | `cardContent.ts`, VerdictCard(s)                                                    |
| 3.4    | `rainWindow.ts`, RainChart                                                          |
| 3.5    | `otherDays.ts`, OtherDaysList                                                       |
| 3.6    | HomePage assembly, loading/error, `keepPreviousData`, e2e, docs                     |

3.1–3.5 are independent (each takes plain props from the helpers) and can proceed in parallel; 3.6 integrates.

## Resolved items

- Spec clarification (chart late at night): always 5 bars, rolling into the next day (spec FR-005).
- Strip has 6 days while the forecast has 7; the Other Days list shows the days after Today within the same 6 (5 rows). Rows show both activities' markers (decided 2026-10-21; T021 only double-checks it against Figma and does not block 3.5).

## Constitution Compliance

No `AGENTS.md`; `CLAUDE.md` conventions are the constitution.

| Rule                                                              | Status | Note                                                                 |
| ----------------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| Spec → plan → tasks before code                                   | PASS   | This plan precedes tasks                                             |
| Design tokens only                                                | PASS   | No raw colors/sizes; add tokens + DESIGN.md if one is missing        |
| No React in `features/verdict` / `wmoIcons.ts`                    | PASS   | New helpers live in `features/home` (also React-free) and `theme`    |
| Forecast only via `useForecast`; position only via `useCoordinates` | PASS | Components never fetch or touch geolocation/localStorage directly (theme storage is behind `themeStorage.ts`) |
| Thresholds only in `verdict/config.ts`                            | PASS   | No new thresholds. Chart window sizes (5 h, 12–4 PM) are display constants in `rainWindow.ts` |
| Time-dependent logic takes `now`                                  | PASS   | `getRainBars`, `getCardContent` take `now`; `useNow` is the only clock reader |
| Tests next to code, no network, query by role                     | PASS   | MSW; role/name queries                                               |
| No city search, no accounts/analytics                             | PASS   | None added                                                           |
| Named exports, one component per file                             | PASS   |                                                                      |
