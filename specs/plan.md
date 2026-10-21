# Implementation Plan: WashWise P4 · Loading Skeletons and Error/Retry States

**Date**: 2026-10-21
**Spec**: `specs/spec.md` (moves to `specs/washwise-p4-loading-error-states/` at `execute`)
**Status**: Draft

## Summary

Replace the single `HomeSkeleton` and `HomeError` from P3 with:

- one skeleton per section, built from the same outer layout as the section, so the swap causes no shift;
- one shared `StatusNotice` component (one icon, one label, an optional hint, "Try again") used for both the first-load error and a new background-update notice.

A small pure function turns the forecast query into one of four page states. It is also what keeps the last good forecast on screen when a refetch for a new cell fails. A pure `errorLabel(error)` maps the error kind to the label named in FR-005. The place-name lookup is unchanged.

## Technical Context

**Stack**: React 19, TypeScript 6 strict, Tailwind 4 (tokens only), TanStack Query 5, Vitest + Testing Library + MSW, Playwright (Pixel 7 Chromium, iPhone 14 WebKit).
**Primary Dependencies**: none new. Icon: `CircleAlert` from `lucide-react` (one icon for every cause, SC-003). Retry icon: the existing `RotateCcw`.
**Storage**: none. Errors and the last good forecast live in memory only.
**Target Layer(s)**: frontend only.
**Performance Goals**: CLS = 0 for the sections below the header when skeletons are swapped for content (SC-001).
**Constraints**:
- Use design tokens only.
- Components read forecast data only through `useForecast`.
- No change to the retry, timeout or cache rules in `queryClient.ts` and `api.ts`.
- No React in `features/verdict`.
- `useCityName` keeps its silent fallback (FR-009).

## Data Model

No persisted entities. New in-memory types:

| Type            | Shape                                                                                                     | Where                                 |
| --------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `HomeViewState` | `{ kind: 'loading' }` · `{ kind: 'error', error }` · `{ kind: 'ready', data, stale: false }` · `{ kind: 'ready', data, stale: true, error }` | `src/features/home/homeViewState.ts`  |
| `ErrorCopy`     | `{ label: string; hint: string }`                                                                         | `src/features/forecast/errorLabel.ts` |

State rules, from `(query, lastGood)`:

- No data and no last good forecast, while pending, or while fetching after an error → `loading`. Retrying from the error shows the skeleton (Story 2, criterion 2).
- No data, no last good forecast, an error, not fetching → `error`.
- Data or a last good forecast, no error → `ready` (`stale: false`).
- Data or a last good forecast, with an error → `ready` (`stale: true`).

The `stale: true` state shows the notice; `isFetching` disables its button.

**Why `lastGood` is needed.** TanStack drops `placeholderData` when the query for the new key fails. Without it, a failed refetch after the location moved would blank the page and show the first-load error, which breaks FR-007 and SC-004. A `useRef` in the page hook holds the last successful `Forecast`.

`errorLabel(error)` mapping (FR-005):

| `ForecastError`                                      | Label                                   |
| ---------------------------------------------------- | --------------------------------------- |
| `network`, or `navigator.onLine === false` at render | You're offline                          |
| `timeout`                                            | The forecast is taking too long         |
| `http` with status ≥ 500                             | The forecast service is having trouble  |
| `http` 4xx, `invalid`, or not a `ForecastError`      | We couldn't load the forecast           |

`navigator.onLine` is passed in as an argument (`errorLabel(error, { online })`) so the function stays pure and testable. The background notice always uses the label "Couldn't update the forecast" and the cause's text as its hint.

## API Contracts

None. Client-only app. Open-Meteo and BigDataCloud calls are unchanged (see `INFRASTRUCTURE.md`). No REST `api.md`.

## Component / Module Breakdown

**Pure helpers** (no React; table-driven tests):

- `src/features/forecast/errorLabel.ts`: `errorLabel(error: unknown, opts: { online: boolean }): ErrorCopy`. Tests: `errorLabel.test.ts`, one `it.each` row per FR-005 cause.
- `src/features/home/homeViewState.ts`: `getHomeViewState({ data, error, isFetching, isPending }, lastGood): HomeViewState`. Tests: one `it.each` row per state rule above.

**Hook**:

- `src/features/home/useHomeForecast.ts`: wraps `useForecast(lat, lon)`, keeps `lastGood` in a ref, and returns `{ view: HomeViewState, isFetching, retry }`.
  - `retry` calls `refetch({ cancelRefetch: false })`. A second press while a request runs joins it instead of restarting it (FR-006).
  - Reads `navigator.onLine` for `errorLabel` through `src/lib/useOnline.ts`, which uses `useSyncExternalStore` on the `online`/`offline` events.
  - Tests: `useHomeForecast.test.tsx` with MSW. Covers a failed refetch after a key change keeping the last forecast (SC-004), and retry joining an in-flight request.

**Shared error pattern**:

- `src/components/feedback/StatusNotice.tsx`, the FR-004 pattern, with props `{ label, hint?, onRetry, retrying, variant: 'block' | 'banner' }`.
  - The `CircleAlert` icon is `aria-hidden`; the label is the text.
  - The button is a real `<button>` labelled "Try again", `disabled` and showing "Retrying…" while `retrying`.
  - `block` (first-load error): `role="alert"`, centered, takes the sections' place.
  - `banner` (background update): `role="status"` (polite), one row, `rounded-lg border bg-surface`, inline button.
  - Tests: `StatusNotice.test.tsx`, by role and name.
- `HomeError.tsx` is deleted. Its job moves to `StatusNotice variant="block"`; `HomeStates.test.tsx` is updated to match.

**Skeletons**: one per section, with the same outer element, padding, gap and grid as the real section. Each placeholder line is a `<span>` with the section's own font token and a non-breaking space, painted `bg-surface-muted`, so its line height matches the real text exactly. All are `aria-hidden`.

| File | Same frame as | Placeholder content |
| ---- | ------------- | ------------------- |
| `src/features/home/components/DayStripSkeleton.tsx` | `DayStrip` | `grid grid-cols-6`, 6 cells with the same border, padding, day and date font tokens and icon box size |
| `src/features/home/components/VerdictCardSkeleton.tsx` | `VerdictCard` | Real activity icon and eyebrow title ("Laundry" / "Car Wash" are known before data), verdict and sub-label lines, one row of 2 pill placeholders. Neutral `border-border bg-surface` |
| `src/features/home/components/RainChartSkeleton.tsx` | `RainChart` | Real section heading, 5 bar columns at the chart's fixed bar height, metric and hour lines |
| `src/features/home/components/OtherDaysSkeleton.tsx` | `OtherDaysList` | Real heading, 5 rows (Open-Meteo returns 7 days, so the strip always has 6 and the list 5) |

- `HomeSkeleton.tsx` is kept as the composer. It holds a single `role="status" aria-label="Loading forecast"` wrapper (FR-003) and renders the four section skeletons in page order. Each skeleton is `motion-reduce:animate-none`.
- `VerdictCard.tsx` gets `min-h-*` from a new token so a short card never ends up shorter than the skeleton. The pill row keeps one-line height via `flex-wrap` with a min height.

**Page**: `src/pages/HomePage.tsx` switches on `view.kind`:

- `loading` → `<HomeSkeleton />`
- `error` → `<StatusNotice variant="block" … />`
- `ready` → the sections. When `stale`, `<StatusNotice variant="banner" … />` sits between the h1 and `DayStrip` (Story 3, criterion 4).

`refreshing` for the pill still uses `isFetching`.

**Tokens**: if the skeleton needs a fixed height that isn't on the spacing scale (card min height, bar track height), add it to `src/styles/tokens.css` (for example `--size-card-min`) and document it in `DESIGN.md`.

## Project Structure

```
src/
  components/feedback/StatusNotice.tsx (+ test)        shared one-icon/one-label pattern
  features/forecast/errorLabel.ts (+ test)             FR-005 copy
  features/home/
    homeViewState.ts (+ test)                          pure page-state rules
    useHomeForecast.ts (+ test)                        wraps useForecast + lastGood + retry
    components/
      DayStripSkeleton.tsx, VerdictCardSkeleton.tsx,
      RainChartSkeleton.tsx, OtherDaysSkeleton.tsx     per-section skeletons
      HomeSkeleton.tsx                                 composes them (modified)
      HomeError.tsx                                    removed
      HomeStates.test.tsx                              updated
  lib/useOnline.ts (+ test)
  pages/HomePage.tsx (+ HomePage.test.tsx)             switch on view state
e2e/home-states.spec.ts                                layout-shift + retry flows
```

**Docs**, each inside `<!-- owner: 4.1 -->` blocks:

- `CLAUDE.md`, "Home page and theme" → **States**: describe the per-section skeletons, `StatusNotice`, `useHomeForecast` and the stale banner.
- `DESIGN.md`: the error and loading pattern, plus any new tokens.
- `INFRASTRUCTURE.md`, Caching & timeouts: one line saying a failed refetch keeps the last forecast.

## Test Plan

- **Unit**:
  - `errorLabel`: one row per cause, plus offline overriding the error kind.
  - `getHomeViewState`: one row per rule.
  - `useOnline`: responds to `online` and `offline` events.
- **Component**:
  - `StatusNotice`: both variants, roles, disabled while retrying, icon hidden.
  - `HomeSkeleton`: a single status and no other accessible content.
- **Page** (`HomePage.test.tsx`, MSW + `mockGeolocation` + pinned `Date`), one test each:
  - first load shows the skeleton;
  - each FR-005 cause shows its label (MSW `HttpResponse.error()`, a delayed response past the timeout using fake timers, 503, malformed JSON);
  - "Try again" sends exactly one new request and shows the forecast;
  - a second press while retrying sends no extra request;
  - a background failure keeps the forecast and shows the banner; a later success removes it;
  - a failed refetch after the cell moves keeps the old forecast (SC-004);
  - a failed geocode shows no alert (SC-005).
- **E2E** (`e2e/home-states.spec.ts`, both projects, light and dark, viewport widths 393 and 430):
  - Hold the Open-Meteo route until the skeleton has painted. Record `boundingBox()` of each section frame, release the route, then assert every section's `y` and `height` are unchanged (±0.5 px). Sections are located by `data-section` attributes; layout is what's being tested, so this is allowed.
  - On Chromium, also assert that a `PerformanceObserver('layout-shift')` sum over the swap equals 0. WebKit has no layout-shift API, so it relies on the box check.
  - Test the abort → error → "Try again" → fulfilled flow.

## Dependencies

No new packages. Builds on:
- P1: `ForecastError` kinds, `queryClient` retry rules, tokens;
- P2: `useCityName` fallback;
- P3: the section components, `HomePage`, `useForecast` with `keepPreviousData`, and the e2e helpers `stubForecast` / `stubExternalServices` in `e2e/support.ts`.

Parallel P4 tasks 4.2–4.4 must not edit `HomePage.tsx`'s state switch. If 4.2 (offline) needs a cached-offline label, it extends `errorLabel.ts`.

## Task mapping

| Linear        | Plan work                                                                 |
| ------------- | ------------------------------------------------------------------------- |
| 4.1 (COH-29)  | Everything above. One PR, base `dev`, branch `p4-mark`                    |

## Resolved items

- Place name stays a silent fallback (spec clarification, FR-009). No code change; it's covered by a regression test.
- The banner sits between the title and the day strip and takes its own space. Its appearance moves the sections down, and Story 3 allows this. SC-001's zero-shift applies only to the skeleton → content swap.
- Offline detection uses `ForecastError.kind === 'network'` or `navigator.onLine === false`. Neither alone is reliable: `onLine` can be true behind a dead Wi-Fi, and a CORS failure also reports `network`.

## Known Risks

Every risk from the red-team pass is mitigated. None is accepted as-is.

| Risk | Mitigation (in scope for 4.1) |
| ---- | ----------------------------- |
| A real card (long sub-label, wrapping pills) is taller than its skeleton at 393 px and shifts the page | The e2e box check runs once per recorded fixture in `src/features/forecast/__fixtures__/real/`, not only Manila, with `now` pinned inside each. Any fixture that wraps fails the test and drives the card min-height token. |
| Web fonts finish loading during the swap and fail the ±0.5 px check | Before recording boxes, the e2e awaits `document.fonts.ready`, and checks that each font token's family is loaded (`document.fonts.check`). Only then is the Open-Meteo route released. |
| After a move to a new cell fails, the old cell's forecast stays under the new place name | `useHomeForecast` records the coordinates `lastGood` was fetched for. When they differ from the current ones, the banner's hint reads "Showing the forecast for your previous location", and the pill shows the place name for `lastGood`'s coordinates, not the new ones. Covered by a page test. |
| Parallel 4.2–4.4 work clashes in `HomePage.tsx` or the error copy | Land 4.1 first. `HomePage.tsx` only switches on `view.kind`, and every cause and label lives in `errorLabel.ts`, which 4.2 extends rather than forks. When the PR opens, add a comment to the 4.2 Linear issue (with the user's go-ahead) pointing at `errorLabel.ts` and `homeViewState.ts`. |

**Strengthened position**: the swap from skeleton to content is shift-free by construction, because each skeleton reuses its section's frame and font tokens. A fixture-wide, font-settled e2e proves it. Errors flow through one pure state function and one label map, so the UI can never show a blank page, a misattributed place, or two error styles, and parallel P4 tasks have one obvious place to extend.

## Constitution Compliance

There is no `AGENTS.md`; the `CLAUDE.md` conventions act as the constitution.

| Rule                                                                 | Status | Note                                                                                    |
| -------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| Spec → plan → tasks before code                                      | PASS   | This plan precedes tasks                                                               |
| Design tokens only                                                   | PASS   | New fixed sizes become tokens, documented in DESIGN.md                                 |
| Forecast only via `useForecast`                                      | PASS   | `useHomeForecast` wraps it; nothing calls `fetch` directly                             |
| Cache, retry and timeout rules only in `queryClient.ts` / `api.ts`   | PASS   | Unchanged. `cancelRefetch: false` is about what a button press does, not a cache rule  |
| No React in `features/verdict` / `wmoIcons.ts`                       | PASS   | Not touched. The new pure helpers are React-free                                       |
| Time-dependent logic takes `now`                                     | PASS   | No new clock reads                                                                     |
| Tests next to code, no network, query by role                        | PASS   | MSW throughout. `data-section` only in the e2e layout test                             |
| Accessibility: decorative icons hidden, real buttons                 | PASS   | `StatusNotice` icon `aria-hidden`; "Try again" is a `<button>`                         |
| No city search, accounts or analytics                                | PASS   | None added                                                                             |
| Named exports, one component per file                                | PASS   |                                                                                        |
