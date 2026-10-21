# Tasks: WashWise P4 · Loading Skeletons and Error/Retry States

**Date**: 2026-10-21
**Spec**: specs/washwise-p4-loading-error-states/spec.md
**Plan**: specs/washwise-p4-loading-error-states/plan.md
**Structure**: By user story (B)
**Tracker**: Linear COH-29 (task 4.1, parent COH-9)

Format: `- [ ] TaskID [P?] [Story?] [COH-ID] Description — path`
Stories:
- US1 = per-section skeletons, no layout shift (P1)
- US2 = first-load error and retry (P1)
- US3 = background-update notice (P2)
- US4 = place name stays a silent fallback (P3)

Markers:
- `[HUMAN]` = needs a person; `/implement` prepares it and leaves the box unchecked.
- `[P]` = can run in parallel with the other `[P]` tasks in the same phase (different files, no shared unfinished dependency).

Red-team mitigations from the plan are built in:
- card taller than skeleton → T011
- fonts shifting the e2e measurement → T011
- old forecast shown under the new place name → T004, T018
- clash with parallel 4.2–4.4 work → T001, T024

---

## Phase 1: Setup (blocks everything)

- [x] T001 [P] [COH-29] Check that `lucide-react` ~1.59 exports `CircleAlert` and `RotateCcw`. Note in the PR that `HomePage.tsx`'s state switch and `errorLabel.ts` are the extension points for 4.2–4.4 — package.json
- [x] T002 [P] [COH-29] Add an e2e helper `holdForecast(page)`. It routes Open-Meteo to a deferred promise and returns `{ release(fixture), fail() }`, so a test can hold the skeleton on screen and then answer or abort the request. Add `stubForecastFixture(page, file, now)` for any recorded fixture — e2e/support.ts

## Phase 2: Foundational (blocking prerequisites)

- [x] T003 [P] [COH-29] Implement `errorLabel(error, { online }): ErrorCopy` per FR-005:
  - `network` or offline → "You're offline"
  - `timeout` → "The forecast is taking too long"
  - `http` ≥ 500 → "The forecast service is having trouble"
  - anything else → "We couldn't load the forecast"

  Each label comes with its hint. Table-driven `it.each`, one row per cause, plus offline overriding the error kind — src/features/forecast/errorLabel.ts, src/features/forecast/errorLabel.test.ts
- [x] T004 [P] [COH-29] Define `HomeViewState` (`loading`, `error`, and `ready` with `stale: false` or `stale: true` + `error`). Implement `getHomeViewState(query, lastGood)` with the plan's four rules, carrying `lastGood.coords` so a stale state knows whether it shows a previous location. Table-driven, one row per rule, including "fetching after an error with no data → loading" — src/features/home/homeViewState.ts, src/features/home/homeViewState.test.ts
- [x] T005 [P] [COH-29] Implement `useOnline()` with `useSyncExternalStore` on the `online`/`offline` events, falling back to `navigator.onLine`. Test that it responds to dispatched events — src/lib/useOnline.ts, src/lib/useOnline.test.ts
- [x] T006 [COH-29] Implement `useHomeForecast(lat, lon)`:
  - wraps `useForecast`;
  - keeps `lastGood = { data, coords }` in a ref, updated on every successful fetch;
  - returns `{ view, isFetching, retry, copy }`;
  - `retry` = `refetch({ cancelRefetch: false })`.

  MSW tests: a failed refetch after a key change keeps the old forecast (SC-004); a second `retry` while one runs sends no extra request — src/features/home/useHomeForecast.ts, src/features/home/useHomeForecast.test.tsx
- [x] T007 [P] [COH-29] Implement `StatusNotice` (`label`, `hint?`, `onRetry`, `retrying`, `variant: 'block' | 'banner'`):
  - one `aria-hidden` `CircleAlert` icon;
  - a real `<button>` "Try again", disabled and showing "Retrying…" while `retrying`;
  - `block` uses `role="alert"`; `banner` uses `role="status"`, one row, with `rounded-lg border bg-surface`.

  Tests by role and name for both variants — src/components/feedback/StatusNotice.tsx, src/components/feedback/StatusNotice.test.tsx

## Phase 3: US1 — See the page take shape while it loads (P1) [COH-29]

- [x] T008 [P] [US1] [COH-29] `DayStripSkeleton`: the same `grid grid-cols-6 gap-chip-gap` and cell border, padding and font tokens as `DayStrip`, with nbsp lines on `bg-surface-muted`. `aria-hidden` — src/features/home/components/DayStripSkeleton.tsx
- [x] T009 [P] [US1] [COH-29] `VerdictCardSkeleton`: the same frame as `VerdictCard`, with the real activity icon and eyebrow, verdict and sub-label lines, and one row of 2 pill placeholders on neutral `border-border bg-surface`. Add a card min-height token (`--size-card-min`) if the measurement in T011 needs one, apply it to both `VerdictCard` and the skeleton, and document it — src/features/home/components/VerdictCardSkeleton.tsx, src/features/home/components/VerdictCard.tsx, src/styles/tokens.css
- [x] T010 [P] [US1] [COH-29] `RainChartSkeleton` (real heading, 5 bar columns at the chart's bar height, metric and hour lines) and `OtherDaysSkeleton` (real heading, 5 rows with the row frame) — src/features/home/components/RainChartSkeleton.tsx, src/features/home/components/OtherDaysSkeleton.tsx
- [x] T011 [US1] [COH-29] Rework `HomeSkeleton` into a composer: one `role="status" aria-label="Loading forecast"` wrapper rendering the four skeletons in page order, `motion-reduce:animate-none`. Add a `data-section` attribute to each real section and its skeleton. Update `HomeStates.test.tsx`: there is one status, and the placeholders have no other accessible content — src/features/home/components/HomeSkeleton.tsx, src/features/home/components/HomeStates.test.tsx, src/features/home/components/{DayStrip,VerdictCards,RainChart,OtherDaysList}.tsx
- [x] T012 [US1] [COH-29] `e2e/home-states.spec.ts` layout-shift test, run for every fixture in `src/features/forecast/__fixtures__/real/`, at 393 and 430 px, in light and dark, on both projects:
  1. Hold the forecast (T002).
  2. Await `document.fonts.ready` and `document.fonts.check` for each font token.
  3. Record each `[data-section]` box.
  4. Release the forecast.
  5. Assert that `y` and `height` are unchanged (±0.5 px).

  On Chromium, also assert that the `layout-shift` `PerformanceObserver` sum is 0. Fix any failure through T009's token, not by loosening the tolerance — e2e/home-states.spec.ts

## Phase 4: US2 — Recover when the forecast can't load (P1) [COH-29]

- [x] T013 [US2] [COH-29] Wire `HomePage` to `useHomeForecast`: `loading` → `HomeSkeleton`; `error` → `<StatusNotice variant="block">` with `copy` and `retry`; `ready` → the sections. Delete `HomeError.tsx` and remove its import — src/pages/HomePage.tsx, src/features/home/components/HomeError.tsx
- [x] T014 [US2] [COH-29] Page tests (MSW, `mockGeolocation`, saved location, pinned `Date`), one per FR-005 cause:
  - `HttpResponse.error()` → offline;
  - a response held past `FORECAST_TIMEOUT_MS` using fake timers → too long;
  - 503 → service trouble;
  - malformed body → generic.

  Also test that "Try again" shows the skeleton, sends exactly one new request and shows the forecast; that a second press while retrying sends no extra request; and that the header stays usable on the error screen — src/pages/HomePage.test.tsx
- [x] T015 [US2] [COH-29] E2E: abort Open-Meteo, see the alert with "Try again", fulfil the next request, press "Try again" by keyboard, and see the forecast (SC-006) — e2e/home-states.spec.ts

## Phase 5: US3 — Know when the forecast couldn't be updated (P2) [COH-29]

- [x] T016 [US3] [COH-29] Render `<StatusNotice variant="banner" label="Couldn't update the forecast">` between the h1 and `DayStrip` when `view.stale`, with `retrying={isFetching}`. When `lastGood.coords` is in a different cell from the current coordinates, the hint reads "Showing the forecast for your previous location" — src/pages/HomePage.tsx
- [x] T017 [US3] [COH-29] Show the place name for `lastGood.coords` in the location pill while the view is stale with a previous location, so the pill and the forecast agree (plan risk 3) — src/pages/HomePage.tsx
- [x] T018 [US3] [COH-29] Page tests:
  - a background refetch failure keeps the forecast and shows the banner (polite status, not an alert);
  - the banner button is disabled while retrying;
  - a later success removes the banner;
  - a failed refetch after the cell moves keeps the old forecast and the old place name, with the "previous location" hint (SC-004) — src/pages/HomePage.test.tsx

## Phase 6: US4 — Place name never blocks the page (P3) [COH-29]

- [x] T019 [US4] [COH-29] Regression tests:
  - a failed geocode shows "Your location" and no alert or banner (SC-005);
  - a forecast that arrives before the name renders the full page;
  - the change in pill width doesn't move `[data-section]` boxes (covered by T012's run with a delayed geocode) — src/pages/HomePage.test.tsx, e2e/home-states.spec.ts

## Phase 7: Documentation

- [x] T020 [P] [COH-29] Update CLAUDE.md "Home page and theme" in a new `<!-- owner: 4.1 -->` block:
  - per-section skeletons and `data-section`;
  - `useHomeForecast` and `HomeViewState` (`lastGood`);
  - `StatusNotice` (block and banner);
  - `errorLabel` as the single place for error copy.

  Replace the `HomeSkeleton / HomeError` line in the tree — CLAUDE.md
- [x] T021 [P] [COH-29] Add a DESIGN.md "Loading and error states" section in a new `<!-- owner: 4.1 -->` block: the skeleton rules (same frame and font tokens), the one-icon/one-label pattern, the banner placement and any new tokens — DESIGN.md (new block only)
- [x] T022 [P] [COH-29] Add one line to INFRASTRUCTURE.md Caching & timeouts in a new `<!-- owner: 4.1 -->` block: a failed refetch keeps the last good forecast and shows the banner; retry rules are unchanged — INFRASTRUCTURE.md (new block only)

## Final Phase: Verification

- [x] T023 [COH-29] Run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm e2e && pnpm build && pnpm docs:check --done 4.1`. Fix anything that fails. No golden snapshot diff is expected, because the verdict engine is unchanged
- [ ] T024 [HUMAN] [COH-29] Review the screenshots of the skeleton, the error and the banner at 393 px in light and dark, and attach them to COH-29. With your go-ahead, comment on the 4.2 Linear issue pointing at `errorLabel.ts` and `homeViewState.ts` — docs/screenshots/home-states/
