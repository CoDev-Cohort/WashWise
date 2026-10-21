# Implementation Plan: WashWise P4.3 · Accessibility Pass in Both Themes

**Date**: 2026-10-21
**Spec**: [spec.md](spec.md) (Linear COH-31)
**Status**: Draft

## Summary

Add an axe-core scan to the Playwright suite that visits every landing and home state (and the toast, install prompt and crash screen) in light and dark, and fails on serious or critical findings against WCAG 2.2 AA. Alongside it, add e2e checks for what axe can't see: keyboard order and focus visibility, target size, reflow at 320 px, forced colors and focus hidden by the bottom prompt. Then fix what the scans and the code review below turn up. The fixes are small and local: page titles and focus after route changes, a shared focus-ring class, the crash screen's landmark and focus styles, forced-colors fallbacks for the rain bars and selected day, and scroll padding while a bottom prompt is open.

## Technical Context

**Stack**: React 19, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, React Router 8, Vitest 5 + Testing Library, Playwright (Pixel 7 Chromium, iPhone 14 WebKit).
**Primary Dependencies**: new dev dependency `@axe-core/playwright` (brings `axe-core`). Nothing new at runtime.
**Storage**: none.
**Target Layer(s)**: frontend only.
**Performance Goals**: the axe suite adds under ~60 s to `pnpm e2e` (about 20 states × 2 themes × 1 project for the full scan; WebKit runs a smaller smoke set).
**Constraints**: WCAG 2.2 AA (spec FR-016). Design tokens only; forced-colors fallbacks may use CSS system colors (`CanvasText`, `Highlight`), which are not design colors, and are documented in DESIGN.md. No change to verdict logic or copy, except the new document titles.

## Data Model

None. No stored data changes.

## API Contracts

None. No external API changes.

## Audit: known issues from reading the code

To be confirmed by the scans (T-numbers come later, in tasks.md):

| #   | Where                                                         | Issue                                                                                                                     | Spec       |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- |
| A1  | `index.html`, all pages                                       | One static title "WashWise"; titles don't change per page                                                                 | FR-005     |
| A2  | Landing → home navigation                                     | Focus is left on the removed "Use my location" button (ends on `<body>`); nothing moves focus or announces the new page   | FR-005     |
| A3  | `src/components/errors/ErrorFallback.tsx`                     | No `<main>` landmark; its buttons have no `focus-visible` style (browser default only)                                    | FR-004/006 |
| A4  | Focus rings                                                   | The same long `focus-visible:outline-*` string is copied into 6 files; no check that the ring meets 3:1 on every surface   | FR-004     |
| A5  | `src/features/home/components/RainChart.tsx`                  | Bars are background colors only; in forced colors they disappear                                                        | FR-017     |
| A6  | `src/features/home/components/DayStrip.tsx`                   | The selected day relies on background/border color; it needs a forced-colors fallback                                     | FR-017     |
| A7  | `src/features/pwa/components/PwaPrompts.tsx`                  | The fixed bottom prompt can cover the focused element when tabbing near the end of the page                              | FR-018     |
| A8  | `LocationPill` (`min-h-8`), `ThemeToggle` (`size-8`), day buttons | Probably ≥ 24 px; must be measured, including at 320 px                                                                   | FR-016     |

## Component / Module Breakdown

### Automated checks (FR-001, FR-002, FR-019, SC-001, SC-003)

- **`e2e/a11y/axe.ts`** (new): `scan(page, testInfo, { context? })` runs `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])`. It also enables the best-practice rules behind FR-006 (`landmark-one-main`, `page-has-heading-one`, `heading-order`, `region`) and fails on them like WCAG rules (analysis A1). It fails on `serious` or `critical` impact, with a message listing rule id, help text and target selectors. It attaches the full results as JSON to the test report and logs `moderate`/`minor` findings without failing (FR-019). Before scanning it waits for `document.fonts.ready` and runs with `reducedMotion: 'reduce'` emulated, so no skeleton pulse or spinner is mid-frame; each state setup waits for its own landmark element (e.g. the Laundry article, the alert) to be visible first (R1).
- **`e2e/a11y/states.ts`** (new): one function per state that puts the page in that state, reusing `e2e/support.ts` (`stubForecast`, `holdForecast`, `seedSavedLocation`, `stubExternalServices`). New helpers in `e2e/support.ts`:
  - `stubGeolocation(page, outcome)`: an init script that replaces `navigator.geolocation` and `navigator.permissions.query` to give `prompt` (first visit), `pending` (never answers, the "Finding you…" state), `denied`, `blocked`, `unavailable`, `timeout` or `unsupported`.
  - `setTheme(page, 'light' | 'dark')`: seeds `ww-theme` before load.
  - `offerInstallPrompt(page)`: seeds `ww-visits = 2`, then dispatches a fake `beforeinstallprompt` event.
  - The update toast (needs a second deployed build) and the crash screen (needs a forced render error) are not reachable in e2e at a sensible cost; they get the component-level scan below.
- **`e2e/a11y.spec.ts`** (new): `for theme of [light, dark] × state of STATES → test(...)`. The states are:
  - Landing: first visit, finding you, denied, blocked, unavailable, timeout, unsupported.
  - Home: loading (held), each verdict state (Manila and London/Phoenix/McMurdo fixtures cover Go Wash / Caution / Not yet / unavailable), another day selected, first-load error, update-failed banner, offline banner (Chromium only, `serviceWorkers: 'allow'` not needed: `context.setOffline` after load), install prompt.
  - The full matrix runs on Pixel 7. iPhone 14 runs landing first visit and home loaded in both themes.
- **Component-level axe** for states e2e can't reach cheaply: add `axe-core` (already a dependency of `@axe-core/playwright`) in Vitest via a small helper `src/test/axe.ts` (`expectNoSeriousViolations(container)`, color-contrast rule off in jsdom since it has no layout). Used in `UpdateToast.test.tsx`, `InstallPrompt.test.tsx` and `AppErrorBoundary.test.tsx`. Their colors are token pairs already covered by `contrast.test.ts` (`on-ink` on `ink`, `ink` on `bg`), so the structural scan plus the token test covers them.
- **`src/styles/contrast.test.ts`**: add focus-ring pairs (3:1, FR-004): `accent` on `bg`, `surface`, `surface-muted`; `on-ink` on `ink` (prompt card ring). Add disabled-control pairs at 3:1 (spec CHK003): `ink` at the `disabled:opacity-60` blend on `surface` and `bg`, computed by blending in the test.

### Keyboard, focus, size, reflow, forced colors (FR-003 – FR-005, FR-011, FR-016 – FR-018, SC-002, SC-005)

- **`e2e/keyboard.spec.ts`** (new, Chromium only: Playwright's WebKit doesn't Tab to buttons and links by default; iOS keyboard use is covered by the manual walkthrough, R4):
  - Tab order on landing and home: press Tab until focus wraps, and compare the sequence with the DOM order of visible, enabled interactive elements on the page, so the test doesn't hard-code every name. Only the first stop (location pill / "Use my location") and the last stop are named. Every interactive element is reached exactly once (SC-002, R3).
  - Every focused element has a visible ring: computed `outline-style` ≠ `none` and `outline-width` ≥ 2 px, in both themes.
  - Activating a day, the theme toggle, "Try again" and the location pill by keyboard keeps focus on that control (FR-005).
  - When the update-failed banner, the offline banner or the install prompt appears, focus stays where it was (FR-009, analysis A3). Announcement roles are already unit-tested: `StatusNotice.test.tsx` (`alert` for the block, `status` for the banner, age line outside it), `HomeStates.test.tsx` (one "Loading forecast" status), `UpdateToast.test.tsx` (`status`), `LandingPage.test.tsx` (`alert` for errors). The screen-reader walkthrough confirms each is read once.
  - Landing "Use my location" by keyboard → `/home`: focus lands on the `h1` "Should you wash?", and `document.title` is "WashWise — Should you wash?".
- **`e2e/layout-a11y.spec.ts`** (new):
  - Target size: every `button`/`a` bounding box ≥ 24 × 24 px at 393 and 320 px, both pages (FR-016).
  - Reflow: at a 320 px viewport, `scrollWidth ≤ clientWidth`, and no button is clipped (its box lies inside the viewport) (FR-011, SC-005); screenshots attached.
  - Forced colors: `page.emulateMedia({ forcedColors: 'active' })`, then assert rain bars have a non-transparent background, the selected day's border differs from the others, and focus rings are still drawn; screenshots attached (FR-017).
  - Reduced motion: `emulateMedia({ reducedMotion: 'reduce' })`, then no element has a running CSS animation (`getAnimations()` empty) on landing "Finding you…", the home skeleton and the pill refresh (FR-012).
  - Focus not obscured: with the install prompt showing, tab to each control and assert its box is not fully under the prompt's box (FR-018).

### Fixes

- **Page titles and route focus** (A1, A2, FR-005):
  - `src/lib/usePageTitle.ts` (new): sets `document.title` on mount.
  - `LandingPage` uses `WashWise — Allow location`; `HomePage` uses `WashWise — Should you wash?`.
  - `src/app/useRouteFocus.ts` (new), called in `MobileColumn`: on a pathname change after the first render, focuses `main h1` (`tabIndex={-1}`, `focus({ preventScroll: true })`). Unit tests: no focus move on first load (including the loader redirect `/` → `/home`), focus moves on landing → home, and on revoked permission → landing (R2).
  - `EmptyState` and `HomePage` give their `h1` `tabIndex={-1}` and `outline-none` for programmatic focus only.
- **Shared focus ring** (A3, A4, FR-004): `src/styles/index.css` adds an `@utility focus-ring` (`focus-visible:outline-2 outline-offset-2 outline-accent`) and a `focus-ring-inverse` variant (`outline-on-ink`) for the prompt card. Replace the copies in `LandingPage`, `StatusNotice`, `DayStrip`, `LocationPill`, `ThemeToggle`, `promptStyles.ts` and add it to `ErrorFallback`. In forced colors the outline uses `Highlight`.
- **ErrorFallback** (A3): wrap in `<main>`; keep `role="alert"` on the inner block; add `focus-ring`.
- **Forced colors** (A5, A6, FR-017): `RainChart` bars get `forced-colors:bg-[CanvasText]` and the track `forced-colors:border forced-colors:border-[CanvasText]`. The selected `DayStrip` button gets `forced-colors:border-[Highlight] forced-colors:border-2`. Verdict cards already have a word and border; verified by screenshot.
- **Focus not obscured** (A7, FR-018): while a prompt is visible, `PwaPrompts` adds a class to `<html>` that sets `scroll-padding-bottom` to the slot height, removed on unmount. Browsers then scroll focused elements clear of the slot.
- **Whatever the scans find**: fixed in the component that owns it. Moderate/minor findings that stay are listed in the PR with a reason (FR-019). A fix that needs a different color value changes the token in `tokens.css`, updates the `contrast.test.ts` pairs and the DESIGN.md contrast table, and is flagged to the user with before/after screenshots before it lands (R5).

### Manual check (FR-015, SC-004)

- **`docs/a11y/screen-reader-walkthrough.md`** (new): the script (landing → allow → home → change day → toggle theme → go offline), what should be read at each step, and a results table filled in by a person with VoiceOver on iPhone Safari (required) and TalkBack on Android Chrome (if available).

### Docs

- **DESIGN.md**, new `<!-- owner: 4.3 -->` block "Accessibility": the WCAG 2.2 AA target, the `focus-ring` utilities and their contrast, the target-size rule, forced-colors fallbacks (system colors allowed only there), page titles, and route focus.
- **CLAUDE.md**, new `<!-- owner: 4.3 -->` block: use `focus-ring` for every interactive element; set titles with `usePageTitle`; run `pnpm e2e` for the a11y suites; how to add a state to `e2e/a11y/states.ts`; `expectNoSeriousViolations` in component tests.
- **README.md**: mention that `pnpm e2e` includes the accessibility scans (one line in the scripts table, if it fits there; otherwise CLAUDE.md only).

## Project Structure

```
e2e/
  a11y/
    axe.ts                 scan(): WCAG 2.2 AA tags, fail on serious/critical, attach JSON
    states.ts              one setup per landing/home state
  a11y.spec.ts             state × theme matrix
  keyboard.spec.ts         tab order, visible focus, focus after actions and route change
  layout-a11y.spec.ts      target size, 320 px reflow, forced colors, reduced motion, focus not obscured
  support.ts               (modified: stubGeolocation, setTheme, offerInstallPrompt)
src/
  app/useRouteFocus.ts (+ .test.tsx)
  lib/usePageTitle.ts (+ .test.ts)
  test/axe.ts              expectNoSeriousViolations for jsdom
  styles/index.css         (modified: focus-ring utilities)
  styles/contrast.test.ts  (modified: focus-ring and disabled pairs)
  components/errors/ErrorFallback.tsx            (modified)
  components/errors/AppErrorBoundary.test.tsx    (modified: axe)
  components/feedback/EmptyState.tsx, StatusNotice.tsx
  components/layout/MobileColumn.tsx             (modified: useRouteFocus)
  features/home/components/DayStrip.tsx, LocationPill.tsx, ThemeToggle.tsx, RainChart.tsx
  features/pwa/components/PwaPrompts.tsx, promptStyles.ts, UpdateToast.test.tsx, InstallPrompt.test.tsx
  pages/LandingPage.tsx, HomePage.tsx
docs/a11y/screen-reader-walkthrough.md
DESIGN.md, CLAUDE.md
```

## Dependencies

| Package                       | Why                                                                     |
| ----------------------------- | ----------------------------------------------------------------------- |
| `@axe-core/playwright` (dev)  | axe scans in Playwright; `axe-core` comes with it and is reused in Vitest |

## Resolved items

The spec has no open `[NEEDS CLARIFICATION]` items. Planning decisions:

- **Where axe runs**: in e2e on the production build (real layout, real contrast, both themes). jsdom has no layout, so the component-level scan disables `color-contrast` and only covers the toast, install prompt and crash screen, which e2e can't reach cheaply. Their colors are covered by `contrast.test.ts`.
- **Contrast**: axe's `color-contrast` rule on the rendered page (SC-003), plus the token test (FR-010 "not only token pairs").
- **WebKit**: a smaller smoke set (landing first visit and home loaded, both themes); the full matrix runs on Chromium.
- **Toast and crash screen** (analysis A2): scanned structurally in jsdom; their contrast is covered by the token pairs in `contrast.test.ts`. Spec Story 1 criterion 3 was amended to say so.
- **System colors** in forced-colors variants are the one allowed exception to "tokens only".

## Known Risks

| Risk                                                                                | Status                                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| R1 Unstable scans (animations, font swap, transitions)                              | Mitigated: reduced motion, `document.fonts.ready`, state element visible before each scan   |
| R2 Route focus fires on redirects, scrolls or double-announces                      | Mitigated: skip first render, `preventScroll`, unit tests, screen-reader walkthrough        |
| R3 Tab-order test hard-codes names                                                  | Mitigated: compared with DOM order of visible controls; only first and last stop named      |
| R4 Playwright WebKit doesn't Tab to buttons                                         | Mitigated: keyboard spec on Chromium; iOS keyboard via the manual walkthrough               |
| R5 A contrast fix needs a token change                                              | Mitigated: contrast test + DESIGN.md table updated; flagged to the user with screenshots     |
| Update toast and crash screen get no real-browser scan                              | Accepted (analysis A2): jsdom structural scan + token contrast test                          |

## Constitution Compliance

There is no `AGENTS.md`; the `CLAUDE.md` conventions act as the constitution.

| Rule                                                       | Status | Note                                                                                              |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Spec → plan → tasks before code                            | PASS   | This plan precedes tasks                                                                          |
| Design tokens only                                         | PASS   | `focus-ring` uses `accent` / `on-ink`; forced-colors system colors are a documented exception     |
| Accessibility: labelled meaningful icons, real buttons     | PASS   | This task enforces it                                                                             |
| Tests next to code, query by role, no network              | PASS   | New unit tests sit next to code; e2e stubs every external service                                 |
| No React in `features/verdict` / `wmoIcons.ts`             | PASS   | Not touched                                                                                       |
| Product rules (three verdicts, device location only)       | PASS   | No behaviour change                                                                               |
| Named exports, one component per file                      | PASS   | New hooks are named exports                                                                       |
