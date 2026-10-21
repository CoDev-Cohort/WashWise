# Tasks: WashWise P3 · Home Page Sections

**Date**: 2026-10-21
**Spec**: specs/washwise-p3-home-page-sections/spec.md
**Plan**: specs/washwise-p3-home-page-sections/plan.md
**Structure**: Skill decided (C): follows the Linear sub-issues 3.1–3.6, one phase per section
**Tracker**: Linear parent COH-8 (3.1 = COH-23, 3.2 = COH-24, 3.3 = COH-25, 3.4 = COH-26, 3.5 = COH-27, 3.6 = COH-28)

Format: `- [ ] TaskID [P?] [Story?] [COH-ID] Description — path`
Stories: US1 = verdict cards, US2 = day strip, US3 = rain chart, US4 = Other Days, US5 = header/pill/theme, US6 = assembly.
`[HUMAN]` = needs a person (screenshots, Figma check, Linear attachment); `/implement` prepares it and leaves the box unchecked.
`[P]` = can run in parallel with the other `[P]` tasks in the same phase (different files, no shared unfinished dependency).

Plan red-team mitigations are built in, using the suggested split (the red-team question was not answered): risk 1 pill refresh → T004; risk 2 theme script drift → T008; risk 3 time zone/midnight → T014, T019; risk 5 Figma drift → T013, T018, T028. Risk 4 (Today's card vs Other Days) is accepted as designed and has a test in T016.

---

## Phase 1: Setup (blocks everything)

- [ ] T001 [P] Confirm the existing `mockMatchMedia({ '(prefers-color-scheme: dark)': … })` helper and its `set()` change event cover the theme tests; extend it only if something is missing. The `localStorage` reset in `setup.ts` already clears the theme key — src/test/matchMedia.ts
- [ ] T002 [P] Add a `makeHomeForecast(now)` builder that returns a `Forecast` with 7 days, 24 hourly rows per day and `weatherCode`/`isDay` set, for helper and component tests (extends `makeForecast`; no network) — src/features/verdict/__fixtures__/builders.ts

## Phase 2: Foundational (blocking prerequisites)

- [ ] T003 [P] Define the view types `StripDay`, `RainBar`, `CardPill`, `OtherDayRow` — src/features/home/types.ts
- [ ] T004 Change the `RequireLocation` outlet context to `{ coordinates, request, status }`. Keep `useCoordinates()` returning `Coordinates`; add `useLocationRefresh()` returning `{ refresh, refreshing }` (`refresh` awaits `request()`, then invalidates the forecast key for the resulting position; one refresh at a time). Update `RequireLocation.test.tsx` and any test that read the old context. Tests: same-cell refresh refetches, new-cell refresh switches key, a failed request keeps data, a `denied` refresh leaves for `/`, a double tap starts only one refresh (plan risk 1) — src/features/location/RequireLocation.tsx, src/features/location/useCoordinates.ts, src/features/location/RequireLocation.test.tsx, src/features/location/useCoordinates.test.tsx
- [ ] T005 [P] Keep the previous forecast visible while a new location loads: apply `placeholderData: keepPreviousData` inside `useForecast`. Update `useForecast.test.tsx` (key change keeps old `data`, `isPlaceholderData` true until the new one arrives) — src/features/forecast/useForecast.ts, src/features/forecast/useForecast.test.tsx
- [ ] T006 [P] Implement `useNow(intervalMs = 60_000)` returning the current time in ms, re-rendering on the interval and clearing it on unmount. Test with fake timers — src/lib/useNow.ts, src/lib/useNow.test.ts

## Phase 3: US5 — Header, location pill and theme toggle (P2) [COH-23]

- [ ] T007 [P] [US5] [COH-23] Implement `themeStorage.ts`: `readTheme()` and `writeTheme()` (try/catch, key `ww-theme`), `resolveTheme(stored, systemDark)` and `applyTheme(theme)` (toggles `dark` on `<html>`, updates the `theme-color` meta). Table-driven tests: nothing stored × system light/dark, stored light/dark × system either, corrupt value, throwing storage — src/features/theme/themeStorage.ts, src/features/theme/themeStorage.test.ts
- [ ] T008 [US5] [COH-23] Add the no-flash inline script to `<head>` (before the stylesheet, wrapped in try/catch, comment pointing at `themeStorage.ts`). In `themeStorage.test.ts`, read `index.html`, evaluate the script against stubbed storage and `matchMedia`, and assert it agrees with `resolveTheme` for every stored/system combination (plan risk 2) — index.html, src/features/theme/themeStorage.test.ts
- [ ] T009 [US5] [COH-23] Implement `useTheme()` returning `{ theme, toggle }`: initial value from `resolveTheme`; follows system changes only while nothing is saved; `toggle` saves and applies. Tests: default follows system, toggle persists across a remount, system change ignored after a choice, blocked storage still toggles — src/features/theme/useTheme.ts, src/features/theme/useTheme.test.tsx
- [ ] T010 [P] [US5] [COH-23] Implement `ThemeToggle` (Sun/Moon from `lucide-react`, `aria-hidden`; one `<button>` with `aria-label` "Switch to dark mode" / "Switch to light mode"). Test by role and name, and that clicking calls `toggle` — src/features/home/components/ThemeToggle.tsx, src/features/home/components/ThemeToggle.test.tsx
- [ ] T011 [P] [US5] [COH-23] Implement `LocationPill` (`MapPin`, place name from props, `LoaderCircle` spinner while `refreshing`, a `<button>` named "Update location, <place>", disabled while refreshing). Test: shows the name, spinner state, click calls `onRefresh` once — src/features/home/components/LocationPill.tsx, src/features/home/components/LocationPill.test.tsx
- [ ] T012 [US5] [COH-23] Implement `HomeHeader` (Fraunces wordmark `font-display`, pill, toggle, laid out as in the Figma header; props only, no data hooks). Test that all three render and the spinner/label wiring passes through — src/features/home/components/HomeHeader.tsx, src/features/home/components/HomeHeader.test.tsx
- [ ] T013 [HUMAN] [US5] [COH-23] Compare the header with the Figma Homepage frame at 393 px in both themes and attach screenshots to COH-23. `/implement` prepares the capture steps and leaves this unchecked — docs/screenshots/home/

## Phase 4: US2 — "Should you wash?" title and 6-day strip (P1) [COH-24]

- [ ] T014 [P] [US2] [COH-24] Implement `buildDayStrip(forecast, count = 6)`: "Today" then weekday + date, formatted with `Intl.DateTimeFormat` and `timeZone: forecast.timezone`; fewer days if the forecast is shorter. Table-driven tests: device time zone ≠ location time zone, forecast starting just before/after midnight, a clock-change day, 7-day vs 3-day forecast (plan risk 3) — src/features/home/dayStrip.ts, src/features/home/dayStrip.test.ts
- [ ] T015 [US2] [COH-24] Implement `DayStrip` (one real `<button>` per day with `aria-pressed` on the selected one; visible focus and selected styles from tokens; weather icon `decorative`; `onSelect(index)`). Tests: six days, Today selected first, click and Enter/Space select, every day reachable by Tab, selected day announced — src/features/home/components/DayStrip.tsx, src/features/home/components/DayStrip.test.tsx

## Phase 5: US1 — Verdict cards: Laundry and Car Wash (P1) [COH-25]

- [ ] T016 [P] [US1] [COH-25] Implement `getCardContent(forecast, dayIndex, now)`: day 0 uses `computeLaundryVerdict`/`computeCarWashVerdict`, other days use `computeDayVerdicts(forecast)[i]`; pills "Dries in ~2.5 hrs" (rounded to 0.5 h) / "Dries tomorrow" from `drying`, plus the condition label (current hour for Today, `daily.weatherCode` otherwise). Table-driven tests over go/caution/notYet/unavailable, `forTomorrow`, a missing weather code, and Today vs the same date in `computeDayVerdicts` (plan risk 4) — src/features/home/cardContent.ts, src/features/home/cardContent.test.ts
- [ ] T017 [US1] [COH-25] Implement `VerdictCard` (verdict word `font-verdict`, sub-label, pills, activity eyebrow LAUNDRY / CAR WASH and `Shirt`/`Car` icon; the `-bg`/`-border`/`-text`/`-pill` tokens per verdict; a neutral "Verdict unavailable" state) and `VerdictCards` (two cards, `gap-card-gap`). Tests: each verdict, unavailable, text available to assistive tech, no hard-coded colors (class names are token utilities) — src/features/home/components/VerdictCard.tsx, src/features/home/components/VerdictCards.tsx, src/features/home/components/VerdictCard.test.tsx
- [ ] T018 [HUMAN] [US1] [COH-25] Screenshot green, amber, red and unavailable cards in light and dark and attach them to COH-25. `/implement` prepares the capture steps and leaves this unchecked — docs/screenshots/home/

## Phase 6: US3 — Rain chance chart (P1) [COH-26]

- [ ] T019 [P] [US3] [COH-26] Implement `getRainBars(forecast, dayIndex, now)`: Today = 5 hours from the current hour, rolling into the next day (`isNextDay` set, so labels carry a day cue); other days = 12–4 PM local (5 bars); missing value → `percent: null`; fewer bars only when the forecast ends. Table-driven tests: now at 09:30, 22:30 and 23:30; last day of the forecast; device time zone ≠ location time zone; a missing hour (plan risk 3) — src/features/home/rainWindow.ts, src/features/home/rainWindow.test.ts
- [ ] T020 [US3] [COH-26] Implement `RainChart` (bars colored by `rain-1`…`rain-5`, height by percent, `percent` and hour label above/below, "—" for unavailable; a visually hidden list "<hour>: <n>% chance of rain" as the text alternative; section title "RAIN CHANCE"). Tests: bar count, labels, hidden list text, unavailable hour is not 0% — src/features/home/components/RainChart.tsx, src/features/home/components/RainChart.test.tsx

## Phase 7: US4 — Other Days list (P2) [COH-27]

- [ ] T021 [HUMAN] [US4] [COH-27] Double-check the Figma Other Days list in `design/WashWise.fig` against the decision (Laundry and Car Wash markers on each row). Does not block T022–T023; if Figma differs, adjust `OtherDaysList` afterwards. `/implement` leaves this unchecked
- [ ] T022 [P] [US4] [COH-27] Implement `buildOtherDays(forecast)`: rows for the strip days after Today using `computeDayVerdicts` and `toOtherDaysLabel`; Today never appears. Tests: Go/Caution/Not yet/unavailable → Yes/Maybe/Wait/—, Today excluded, short forecast — src/features/home/otherDays.ts, src/features/home/otherDays.test.ts
- [ ] T023 [US4] [COH-27] Implement `OtherDaysList` and `OtherDayMarker` (Yes `Check`, Maybe `CircleHelp`, Wait `X`, "—" neutral; icon plus text, `text-accent`/`accent-alt` per DESIGN.md; each row readable as "<day>, <activity>: <marker>"). Tests: three marker variants plus "—", accessible text, icons `aria-hidden` — src/features/home/components/OtherDaysList.tsx, src/features/home/components/OtherDayMarker.tsx, src/features/home/components/OtherDaysList.test.tsx

## Phase 8: US6 — Home page assembly (P1) [COH-28]

Starts when Phases 2–7 are done.

- [ ] T024 [P] [US6] [COH-28] Implement `HomeSkeleton` (placeholders for strip, cards, chart, list; `role="status"` "Loading forecast") and `HomeError` (`role="alert"`, message, "Try again" calls `refetch`). Tests by role and name — src/features/home/components/HomeSkeleton.tsx, src/features/home/components/HomeError.tsx, src/features/home/components/HomeStates.test.tsx
- [ ] T025 [US6] [COH-28] Replace the placeholder `HomePage`: `useCoordinates` → `useForecast` → `useNow`, `useCityName`, `useLocationRefresh`, `useTheme`; owns `selectedDay` (reset to 0 if the index disappears after a refetch); renders header → title + strip → cards → chart → Other Days in the Figma order; skeleton on first load, `HomeError` on failure, previous forecast kept while a new one loads. Stays inside the `MobileColumn` — src/pages/HomePage.tsx
- [ ] T026 [US6] [COH-28] Page tests through the memory router with `mockGeolocation`, a seeded saved location and MSW handlers for forecast and geocode (recorded fixture): sections appear in order; selecting a day updates both cards and the chart together (SC-002); first-load skeleton; forecast failure shows the alert and "Try again" refetches; pill tap shows the spinner and refetches; theme toggle flips the `dark` class and persists; the previous forecast stays visible when the location moves to a new cell — src/pages/HomePage.test.tsx
- [ ] T027 [US6] [COH-28] Add `e2e/home.spec.ts` for Pixel 7 and iPhone 14 with `page.route` for Open-Meteo and BigDataCloud: home renders with seeded location; choosing a day changes the chart; theme toggle persists across reload; with system dark and empty storage there is no light flash (check the `dark` class on `<html>` before first paint); keyboard-only day selection — e2e/home.spec.ts
- [ ] T028 [HUMAN] [US6] [COH-28] Compare the assembled page with the Figma Homepage frame at 393 px in light and dark (plan risk 5) and attach screenshots to COH-28. `/implement` prepares the capture steps and leaves this unchecked — docs/screenshots/home/

## Phase 9: Documentation

- [ ] T029 [P] Add the DESIGN.md "Home page" section in a new `<!-- owner: 3.6 -->` block: section order, card/strip/chart/list token use, pill and spinner states, theme toggle and no-flash script, marker icons — DESIGN.md (new block only)
- [ ] T030 [P] Update CLAUDE.md in a new `<!-- owner: 3.6 -->` block: the new App structure under `/home`, the outlet context (`useCoordinates`, `useLocationRefresh`), theme module (`ww-theme`, `useTheme` only), `features/home` helpers take `now`, `useForecast` keeps previous data. Update the stale `/home` placeholder line in the App structure tree — CLAUDE.md
- [ ] T031 [P] Add the theme storage key and the no-flash script to INFRASTRUCTURE.md in a new `<!-- owner: 3.1 -->` block — INFRASTRUCTURE.md (new block only)

## Final Phase: Verification

- [ ] T032 Run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm e2e && pnpm build && pnpm docs:check --done 3.1,3.6`. Fix anything that fails. Review any golden snapshot diff (none expected: the verdict engine is unchanged)
