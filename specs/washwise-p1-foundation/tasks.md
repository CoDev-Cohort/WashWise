# Tasks: WashWise P1 · Foundation

**Date**: 2026-10-20
**Spec**: specs/washwise-p1-foundation/spec.md
**Plan**: specs/washwise-p1-foundation/plan.md
**Structure**: By user story (chosen by the skill: the spec has 8 stories)
**Tracker**: Linear. `[COH-xx]` = sub-issue of COH-6

Format: `- [ ] TaskID [P?] [Story?] [Linear] Description — path`
`[HUMAN]` = needs a person (device or Linear attachment); `/implement` prepares it and leaves the box unchecked.
`[P]` = can run in parallel with the other `[P]` tasks in the same phase (different files, no shared unfinished dependency).

---

## Phase 1: Setup (blocks everything)

- [x] T000 [COH-11] Initialise git on `main`, set the remote `origin` to https://github.com/CoDev-Cohort/WashWise (empty repo), add a Node/Vite `.gitignore`, and copy the Figma source to `design/WashWise.fig` — .gitignore, design/WashWise.fig
- [x] T001 [COH-11] Scaffold the Vite React-TS app with pnpm 10. Pin Node 22 and set the `packageManager` field — package.json, .nvmrc, .npmrc, index.html, src/main.tsx
- [x] T002 [COH-11] Enable TypeScript strict mode and the `@/*` → `src/*` path alias in TS and Vite — tsconfig.json, tsconfig.app.json, tsconfig.node.json, vite.config.ts
- [x] T003 [P] [COH-11] Configure ESLint flat config: typescript-eslint, react-hooks, react-refresh, import-x with the TypeScript resolver (so `@/` resolves), and a `no-restricted-imports` rule that bans react/react-dom/@tanstack in `src/features/verdict/**` and `src/features/icons/wmoIcons.ts` — eslint.config.js
- [x] T004 [P] [COH-11] Configure Prettier with prettier-plugin-tailwindcss — .prettierrc, .prettierignore
- [x] T005 [COH-11] Configure Vitest (jsdom), React Testing Library and jest-dom matchers through the `test` block — vite.config.ts, src/test/setup.ts
- [x] T006 [COH-11] Add an MSW v2 node server and empty default handlers, and wire them into the test setup (listen/reset/close) — src/test/msw/server.ts, src/test/msw/handlers.ts, src/test/setup.ts
- [x] T007 [P] [COH-11] Configure Playwright with Chromium (Pixel 7) and WebKit (iPhone 14) projects. The webServer runs `pnpm build && pnpm preview --port 4173` — playwright.config.ts
- [x] T008 [COH-11] Add the scripts dev, build (`tsc -b && vite build`), preview, typecheck, lint, format, test, test:watch and e2e, plus a trivial passing unit test and e2e test so each command runs — package.json, src/App.test.tsx, e2e/smoke.spec.ts

## Phase 2: Foundational (blocking prerequisites)

The doc skeletons must exist before any parallel task edits them (R5). The normalized forecast types, the normalizer and the real fixtures must exist before the verdict engine and its golden tests.

- [x] T009 [P] [US4] [COH-11] Create the README skeleton: About, Prerequisites, Setup, Scripts, Project docs links, and Credits (`<!-- owner: 1.6 -->` block with `> TODO (task 1.6)`) — README.md
- [x] T010 [P] [US4] [COH-11] Create the CLAUDE.md skeleton: Overview, Commands, Folder layout, Conventions, Testing rules, Product rules, PR checklist. Add owner-marked TODO blocks for App structure (1.3), Data access (1.4) and Verdict engine (1.5) — CLAUDE.md
- [x] T011 [P] [US4] [COH-11] Create the DESIGN.md skeleton: Figma source, Layout (≤430px). Add owner-marked TODO blocks for Tokens and Typography (1.2), Icons (1.6), and Dark palette & contrast (1.8) — DESIGN.md
- [x] T012 [P] [US4] [COH-11] Create the INFRASTRUCTURE.md skeleton: Architecture (client-only SPA), Environments. Add owner-marked TODO blocks for External services and Caching & timeouts (1.4), PWA (1.7), and Hosting/deploy and CI (P4) — INFRASTRUCTURE.md
- [x] T013 [US4] [COH-11] Write the `docs:check` script. `--done <ids>` fails if `TODO (task X.Y)` remains for any listed task; `--phase 1` fails on any `TODO (task 1.`. Add `tsx` as a dev dependency and register the script — scripts/check-docs.ts, package.json
- [x] T014 [US2] [COH-14] Define the raw `OpenMeteoResponse` and the normalized `Forecast`, `HourlyPoint` and `DailyPoint` types (epoch ms, nullable fields) — src/features/forecast/types.ts
- [x] T015 [US2] [COH-14] ⚠️ **Time-sensitive: run before 2026-10-24.** Write `fixtures:record` and record real Open-Meteo responses (production query, `timeformat=unixtime`) for Manila, London (DST ends 2026-10-25), Phoenix, Longyearbyen (polar night begins around 10-26) and McMurdo (polar day begins around 10-24). Commit them with metadata — scripts/record-fixtures.ts, src/features/forecast/**fixtures**/real/*.json, package.json
- [x] T016 [US2] [COH-14] Implement `normalizeForecast()`: unix seconds → ms, zip the parallel arrays, validate lengths, throw `ForecastError('invalid')` on bad shape. Add contract tests over every real fixture (168 hourly / 7 daily, start times increasing, each hour in exactly one day, null `precipitation_probability` share ≤ 5% for non-polar fixtures, and per-day `date` strings that follow the location's time zone even when the tests run with a different `TZ`, e.g. `TZ=America/New_York` against Manila) — src/features/forecast/normalize.ts, src/features/forecast/normalize.test.ts, src/features/forecast/errors.ts

## Phase 3: US1 — Trustworthy laundry and car-wash verdicts (P1) [COH-15]

- [x] T017 [US1] [COH-15] Define `Verdict`, `Activity`, `DryingEstimate`, `VerdictReason`, `VerdictResult`, `DayVerdicts` and `OtherDaysLabel` — src/features/verdict/types.ts
- [x] T018 [US1] [COH-15] Create `VERDICT_CONFIG` with every threshold: rain 30/60, laundry window 6 h, 2 h cutoff, sunset −1 h, drying 4/8 h, car-wash 48 h / 0.5 / 2 mm, missing data 0.25, polar 86 340 s, drying constants k=0.1328, exponent 0.3, wind 0.05 capped at 2.5, sun 0.5 — src/features/verdict/config.ts
- [x] T019 [US1] [COH-15] Write synthetic forecast builders, `makeForecast({ days, hours, overrides })`, with sunrise/sunset/daylight control, null injection and DST-length days — src/features/verdict/**fixtures**/builders.ts
- [x] T020 [P] [US1] [COH-15] Implement `getUsableDaylight` (sunrise to sunset −1 h; polar day = whole day; polar night = null), `dayForTime` (bucketed by the next day's start, so DST-safe) and `hoursInRange`, with tests for normal, polar-day, polar-night and 23 h/25 h days — src/features/verdict/daylight.ts, src/features/verdict/daylight.test.ts
- [x] T021 [P] [US1] [COH-15] Implement `exceedsMissingRatio` (> 25% of read hours with a null required field), with tests for 25% vs 26% — src/features/verdict/missing.ts, src/features/verdict/missing.test.ts
- [x] T022 [P] [US1] [COH-15] Implement `dryingRate` (VPD^0.3 × wind factor × sun factor) and `estimateDrying` (hourly accumulation, interpolated finish, `tomorrow` if the deadline passes first, carry-forward for null hours). Test the three reference cases (≈2.5 h, ≈6.2 h, ≈14 h), deadline cutoff and a null hour mid-drying — src/features/verdict/drying.ts, src/features/verdict/drying.test.ts
- [x] T023 [P] [US1] [COH-15] Implement the sub-label table (today and tomorrow variants for laundry; "Rain will undo it", "Light rain expected today", "Rain likely tomorrow", "Good to go" for car wash) and `toOtherDaysLabel` (Yes/Maybe/Wait/—), with tests — src/features/verdict/labels.ts, src/features/verdict/labels.test.ts
- [x] T024 [US1] [COH-15] Implement `computeLaundryVerdict(forecast, now)`: switch to tomorrow below 2 h remaining (tested at 1:59 and 2:00), window start = max(now, sunrise), 6 h window capped at the end of usable daylight, worst-hour rain, drying deadline at sunset, the missing-data check, the most-severe rule, and the polar-night rule applied after the switch. Also implement `computeLaundryForDay`. Tests cover every FR-004b boundary (29.9/30/60/60.1%, 4/4.01 h, 8/8.01 h), pre-sunrise, polar night today + normal tomorrow, and polar night on both days — src/features/verdict/laundry.ts, src/features/verdict/laundry.test.ts
- [x] T025 [P] [US1] [COH-15] Implement `computeCarWashVerdict(forecast, now)` and `computeCarWashForDay`: 48 h window, worst-hour rain, day-1 and day-2 sums, Not yet for > 60% or ≥ 2 mm on day 1, Go for < 30% and < 0.5 mm total, otherwise Caution with "Light rain expected today" taking precedence. Tests cover 0.49/0.5/1.99/2 mm on each day, 30%/60% and missing data — src/features/verdict/carWash.ts, src/features/verdict/carWash.test.ts
- [x] T026 [US1] [COH-15] Implement `computeDayVerdicts(forecast)`: per-day windows anchored at sunrise, car-wash window truncated at the forecast end without counting those hours as missing. Test it, including the last forecast day — src/features/verdict/days.ts, src/features/verdict/days.test.ts
- [x] T027 [US1] [COH-15] Add the public barrel exporting the compute functions, `toOtherDaysLabel`, the types and `VERDICT_CONFIG` — src/features/verdict/index.ts
- [x] T028 [US1] [COH-15] Add golden verdict snapshot tests over the real fixtures at 07:00, 13:00, 17:30 and 22:00 local time. A person reviews the first snapshot and signs it off in the PR — src/features/verdict/verdicts.golden.test.ts, src/features/verdict/**snapshots**/verdicts.golden.test.ts.snap
- [x] T029 [US1] [COH-15] Write the `verdict:report` script, which prints the Go/Caution/Not yet/unavailable shares per activity and location over all daylight hours, and register it — scripts/verdict-report.ts, package.json
- [x] T030 [US1] [COH-15] Fill in the CLAUDE.md "Verdict engine" owner block: config location, rule tables, boundaries, window rules, missing data, drying inputs, label mapping. Run `pnpm docs:check --done 1.5` — CLAUDE.md

## Phase 4: US2 — Forecast for the user's location (P1) [COH-14]

- [x] T031 [P] [US2] [COH-14] Implement `withTimeout(signal?, ms)` with AbortController + setTimeout (no `AbortSignal.any`), with tests for timeout, caller abort and cleanup — src/lib/withTimeout.ts, src/lib/withTimeout.test.ts
- [x] T032 [US2] [COH-14] Implement `buildForecastUrl` (lat/lon rounded to 2 dp; hourly/daily fields; `timezone=auto`; `timeformat=unixtime`; `forecast_days=7`; `wind_speed_unit=kmh`) and `fetchForecast` (10 s timeout, `ForecastError` kinds network/timeout/http/invalid). Add MSW tests for 200, 400 with a reason, 500, malformed body and a delayed response with fake timers. Confirm no API key is sent — src/features/forecast/api.ts, src/features/forecast/api.test.ts, src/test/msw/handlers.ts
- [x] T033 [US2] [COH-14] Implement `useForecast(lat?, lon?)`: key `['forecast', lat2dp, lon2dp]`, `enabled` only when both are defined. Tests check that a cache hit within 30 min makes no second request, that a disabled query makes no request, and that after 30 min a window-focus event triggers exactly one refetch while the previous data stays visible until the new data arrives — src/features/forecast/useForecast.ts, src/features/forecast/useForecast.test.tsx
- [x] T034 [P] [US2] [COH-14] Fill in the INFRASTRUCTURE.md "External services" and "Caching & timeouts" owner blocks (endpoint, fields, no key, 30 min freshness, refetch on focus, 10 s timeout, how failures surface) — INFRASTRUCTURE.md
- [x] T035 [P] [US2] [COH-14] Fill in the CLAUDE.md "Data access" owner block (forecast only through `useForecast`, no direct fetches). Run `pnpm docs:check --done 1.4` — CLAUDE.md

## Phase 5: US3 — App skeleton and navigation (P1) [COH-13]

- [x] T036 [P] [US3] [COH-13] Create the QueryClient with defaults: staleTime 30 min, gcTime 24 h, refetchOnWindowFocus true, retry 1 — src/app/queryClient.ts
- [x] T037 [P] [US3] [COH-13] Create the `MobileColumn` root layout (`mx-auto w-full max-w-[430px] min-h-dvh` + `<Outlet/>`) — src/components/layout/MobileColumn.tsx
- [x] T038 [P] [US3] [COH-13] Create placeholder pages — src/pages/LandingPage.tsx, src/pages/HomePage.tsx
- [x] T039 [US3] [COH-13] Create `ErrorFallback` (friendly message, "Try again" reset, "Reload", lucide `RotateCcw` with aria-hidden) and `AppErrorBoundary` (react-error-boundary). Tests check that a thrown child shows the fallback and that reset recovers — src/components/errors/ErrorFallback.tsx, src/components/errors/AppErrorBoundary.tsx, src/components/errors/AppErrorBoundary.test.tsx
- [x] T040 [US3] [COH-13] Create the router: `MobileColumn` layout, `/` → LandingPage, `/home` → HomePage, `*` → redirect to `/`, root `errorElement` → ErrorFallback — src/app/router.tsx
- [x] T041 [US3] [COH-13] Create AppProviders (QueryClientProvider, AppErrorBoundary, Query Devtools in dev only), wire up `main.tsx`, and remove the scaffold demo `App.tsx` and its test — src/app/AppProviders.tsx, src/main.tsx
- [x] T042 [P] [US3] [COH-13] Add the SPA rewrite so deep links such as `/home` load index.html — vercel.json
- [x] T043 [US3] [COH-13] Replace the trivial e2e test with a smoke test: `/` and `/home` render their placeholders, an unknown path redirects to `/`, and the column is ≤ 430 px at a 1280 px viewport — e2e/smoke.spec.ts
- [x] T044 [US3] [COH-13] Fill in the CLAUDE.md "App structure" owner block (routes, QueryClient defaults, error boundary and how to trigger it in tests, layout wrapper). Run `pnpm docs:check --done 1.3` — CLAUDE.md

## Phase 6: US4 — Shared project documentation (P1) [COH-11]

- [x] T045 [US4] [COH-11] Complete the README sections owned by 1.1: About, prerequisites (Node 22, pnpm 10), setup, a full scripts table (including fixtures:record, verdict:report, docs:check), and links to CLAUDE.md, DESIGN.md, INFRASTRUCTURE.md, specs/washwise-p1-foundation/spec.md and specs/washwise-p1-foundation/plan.md — README.md
- [x] T046 [US4] [COH-11] Complete the CLAUDE.md sections owned by 1.1: commands, folder layout, conventions (strict TS, `@/` imports, tokens only, no React in verdict), testing rules, product rules (thresholds only in config.ts; no city search; device location only), and a PR checklist (`docs:check --done <task>`, lint, typecheck, test) — CLAUDE.md

## Phase 7: US5 — Visual design language from Figma (P2) [COH-12]

- [x] T047 [US5] [COH-12] Transcribe the Figma Token Inventory (plan.md) into `:root` CSS variables as hex values, and derive the amber `--color-caution-*` set (not in Figma) so its text reaches ≥ 4.5:1 on its bg — src/styles/tokens.css
- [x] T048 [US5] [COH-12] Set up Tailwind v4: `@import "tailwindcss"`, `@custom-variant dark (&:where(.dark, .dark *))`, and an `@theme inline` mapping of every token, with fallback font stacks. Add the `@tailwindcss/vite` plugin — src/styles/index.css, vite.config.ts
- [x] T049 [P] [US5] [COH-12] Self-host the fonts (Fontsource Fraunces variable, Plus Jakarta Sans variable, Barlow) with `font-display: swap`, imported from `main.tsx` — src/styles/fonts.ts, src/main.tsx
- [x] T050 [US5] [COH-12] Fill in the DESIGN.md "Tokens" and "Typography" owner blocks (name → value → usage, font loading), and check that the "tokens only" rule (added to CLAUDE.md conventions in T046) is present. Run `pnpm docs:check --done 1.2` — DESIGN.md

## Phase 8: US6 — Dark palette (P2) [COH-18]

- [x] T051 [US6] [COH-18] Derive a `.dark` value for every token in tokens.css, keeping the green/amber/red verdict colors distinct — src/styles/tokens.css
- [x] T052 [US6] [COH-18] Write the contrast test: parse `:root` and `.dark` from tokens.css and assert WCAG AA (4.5:1 text, 3:1 large text and indicators) for a declared list of foreground/background pairs, including the verdict colors, in both themes. Also check in jsdom that adding the `dark` class to `<html>` changes a computed token value — src/styles/contrast.test.ts
- [ ] T053 [HUMAN] [US6] [COH-18] Capture before/after screenshots of both themes and attach them to COH-18 — docs/screenshots/dark-palette/
- [x] T054 [US6] [COH-18] Fill in the DESIGN.md "Dark palette & contrast" owner block (light vs dark per token, measured ratios, how the `dark` class works). Run `pnpm docs:check --done 1.8` — DESIGN.md

## Phase 9: US7 — Weather and UI icons (P2) [COH-16]

- [x] T055 [P] [US7] [COH-16] Vendor the needed Meteocons SVGs (about 35, animated and static fill sets) and the MIT LICENSE from the Meteocons GitHub release. If the release has no static set, generate the static SVGs by stripping `<animate*>`/`<animateTransform>` elements and CSS animations from the animated files with a small script, and document this in DESIGN.md — public/meteocons/animated/, public/meteocons/static/, public/meteocons/LICENSE
- [x] T056 [P] [US7] [COH-16] Create `WMO_ICONS` for every Open-Meteo WMO code (0, 1, 2, 3, 45, 48, 51–57, 61–67, 71–77, 80–82, 85, 86, 95, 96, 99) with day and night names and labels, plus `FALLBACK_ICON` (not-available) — src/features/icons/wmoIcons.ts
- [x] T057 [US7] [COH-16] Implement `getWeatherIcon(code, isDay, variant)` returning `{ src, label }`. Tests check that every code resolves to an existing file, that day/night selection works, that a null `isDay` gives the day icon, and that unknown codes give the fallback — src/features/icons/getWeatherIcon.ts, src/features/icons/getWeatherIcon.test.ts
- [x] T058 [P] [US7] [COH-16] Implement the `usePrefersReducedMotion` matchMedia hook, with a test — src/lib/usePrefersReducedMotion.ts, src/lib/usePrefersReducedMotion.test.ts
- [x] T059 [US7] [COH-16] Create the `WeatherIcon` component (`<img>`; switches to static under reduced motion; `alt=label`, or `alt="" aria-hidden` when decorative), with RTL tests — src/components/icons/WeatherIcon.tsx, src/components/icons/WeatherIcon.test.tsx
- [x] T060 [US7] [COH-16] Fill in the DESIGN.md "Icons" owner block (Meteocons static vs animated, the reduced-motion rule, map location, fallback, lucide conventions) and the README Credits block (Meteocons MIT). Run `pnpm docs:check --done 1.6` — DESIGN.md, README.md

## Phase 10: US8 — Installable app (P3) [COH-17]

- [ ] T061 [US8] [COH-17] Add a placeholder source logo (the WashWise wordmark initial "W" in `--color-ink` on `--color-bg`; there's no logo in Figma, and INFRASTRUCTURE.md notes it's to be replaced) and the `@vite-pwa/assets-generator` config, then generate the 192, 512, maskable-512, apple-touch-180 and favicon icons. Add the `pwa:assets` script — public/logo.svg, pwa-assets.config.ts, public/pwa-192x192.png, public/pwa-512x512.png, public/maskable-icon-512x512.png, public/apple-touch-icon-180x180.png, public/favicon.ico, package.json
- [ ] T062 [US8] [COH-17] Configure `VitePWA`: manifest (name, short_name, theme/background colors from tokens, display standalone, icons), `selfDestroying: true` until 4.2, `devOptions.enabled: false` — vite.config.ts
- [ ] T063 [P] [US8] [COH-17] Add the `theme-color` (light and dark media), `apple-touch-icon` and `apple-mobile-web-app-*` metas — index.html
- [ ] T064 [US8] [COH-17] Add an e2e test that the manifest link is present and that the fetched manifest has its name, icons (192, 512, maskable) and standalone display — e2e/pwa.spec.ts
- [ ] T065 [HUMAN] [US8] [COH-17] Verify manually: Chrome DevTools → Application → Manifest shows no errors, then install on one Android Chrome and one iOS Safari device. Save screenshots and attach them to COH-17 — docs/screenshots/pwa/
- [ ] T066 [US8] [COH-17] Fill in the INFRASTRUCTURE.md "PWA" owner block (manifest, colors, icons, verification steps, install steps, "offline arrives in 4.2"). Run `pnpm docs:check --done 1.7` — INFRASTRUCTURE.md

## Final Phase: Polish & exit checks

- [ ] T067 [US1] [COH-15] Run the distribution gate (before P3 starts) and record the results: car wash Caution or Not yet ≤ 70% for London and Phoenix, laundry Go on ≥ 1 day for Phoenix, unavailable < 2% for non-polar fixtures. If a gate fails, open a spec/config change — docs/verdict-report-2026-10.md
- [ ] T068 [US4] [COH-11] Fresh-clone check (SC-005, SC-007): clone into a clean directory, follow the README only, run every listed command, run `pnpm docs:check --phase 1`, and fix any gaps — README.md
- [ ] T069 [COH-6] Final quality pass: `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` all green. Confirm every FR has at least one test or verification artifact — specs/washwise-p1-foundation/spec.md

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** blocks everything. T003, T004 and T007 can run alongside the T001 → T002 → T005 → T006 → T008 chain once T002 is done.
- **Phase 2 (Foundational)** blocks Phases 3–10.
  - T009–T012 can run in parallel.
  - T013 needs T009–T012.
  - T014 → T015 → T016 run in order.
  - **T015 has a hard deadline (before 2026-10-24)** because the polar and DST transitions it records fall in the next 7 days.
- **After Phase 2, the story phases are largely independent** and match the parallelism in the Linear tickets:
  - US1 (COH-15) needs only T014 and T016. Its T028 also needs the T015 fixtures.
  - US2 (COH-14) needs T014 and T016.
  - US3 (COH-13), US4 (COH-11), US5 (COH-12) and US7 (COH-16) need only Phase 1 plus the doc skeletons.
  - US6 (COH-18) needs US5 (T047, T048).
  - US8 (COH-17) needs Phase 1. T062 reads its colors from US5 tokens, so it can start with placeholder colors and be updated afterwards.
- **Inside US1**: T017 → T018 → T019 → {T020, T021, T022, T023} → {T024, T025} → T026 → T027 → T028 → T029 → T030.
- **Shared-file caution**: each task edits only its own `<!-- owner: X.Y -->` block in CLAUDE.md, DESIGN.md, INFRASTRUCTURE.md and README.md. vite.config.ts is touched by T002, T005, T048 and T062; merge these one after another.
- **Final phase**: T067 must finish before P3 starts. T068 and T069 come last.

## Parallel example (after Phase 2)

```
Agent A: US1 verdict engine     T017 → … → T030   [COH-15]
Agent B: US2 forecast client    T031 → … → T035   [COH-14]
Agent C: US3 app shell          T036 → … → T044   [COH-13]
Agent D: US5 → US6 tokens/dark  T047 → … → T054   [COH-12, COH-18]
Agent E: US7 icons              T055 → … → T060   [COH-16]
Agent F: US8 PWA                T061 → … → T066   [COH-17]
```

## MVP scope

Phases 1–3 (Setup, Foundational, US1) give a tested, config-driven verdict engine running on real forecast data. That is the product's core value and de-risks the thresholds before any UI is built. Adding Phases 4–5 (US2, US3) gives a runnable app shell that fetches a live forecast.
