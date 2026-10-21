# Tasks: WashWise P4.3 · Accessibility Pass in Both Themes

**Date**: 2026-10-21
**Spec**: specs/washwise-p4-accessibility/spec.md
**Plan**: specs/washwise-p4-accessibility/plan.md
**Structure**: By user story (B)
**Tracker**: Linear COH-31 (task 4.3, parent COH-9)

Format: `- [ ] TaskID [P?] [Story?] [COH-ID] Description — path`
Stories:

- US1 = no serious automated-accessibility issues on any screen (P1)
- US2 = everything works with a keyboard alone (P1)
- US3 = screen readers get the same information (P1)
- US4 = readable in both themes, zoomed and in forced colors (P2)

Markers:

- `[HUMAN]` = needs a person; `/implement` prepares it and leaves the box unchecked.
- `[P]` = can run in parallel with the other `[P]` tasks in the same phase (different files, no shared unfinished dependency).

Red-team mitigations from the plan are built in:

- R1 unstable scans → T003
- R2 route focus → T013
- R3/R4 brittle keyboard tests → T015
- R5 token changes → T010

---

## Phase 1: Setup (blocks everything)

- [ ] T001 [COH-31] Add `@axe-core/playwright` as a dev dependency with `pnpm add -D`; commit the lockfile — package.json, pnpm-lock.yaml
- [ ] T002 [P] [COH-31] Add e2e helpers:
  - `stubGeolocation(page, outcome)` (init script replacing `navigator.geolocation` and `navigator.permissions.query`): `prompt`, `pending`, `denied`, `blocked`, `unavailable`, `timeout`, `unsupported`;
  - `setTheme(page, 'light' | 'dark')` (seeds `ww-theme`);
  - `offerInstallPrompt(page)` (seeds `ww-visits = 2`, then dispatches a fake `beforeinstallprompt`).

  Check each one against the existing landing states before using it in scans — e2e/support.ts

## Phase 2: Foundational (blocking prerequisites)

- [ ] T003 [COH-31] Add `scan(page, testInfo)`:
  - WCAG tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, plus the rules `landmark-one-main`, `page-has-heading-one`, `heading-order` and `region` (analysis A1);
  - before scanning, wait for `document.fonts.ready`; callers emulate `reducedMotion: 'reduce'` (R1);
  - fail on `serious`/`critical` with rule id, help and targets;
  - attach the full JSON; log `moderate`/`minor` without failing (FR-019) — e2e/a11y/axe.ts
- [ ] T004 [COH-31] Add one setup per state, each waiting for its own element to be visible (R1):
  - landing: first visit, finding you, denied, blocked, unavailable, timeout, unsupported;
  - home: loading (held), loaded (Manila), each verdict state from the recorded fixtures, another day selected, first-load error, update-failed banner, offline banner, install prompt.

  Depends on T002 — e2e/a11y/states.ts

- [ ] T005 [P] [COH-31] Add `expectNoSeriousViolations(container)` for jsdom using `axe-core` (`color-contrast` off: jsdom has no layout) — src/test/axe.ts
- [ ] T006 [P] [COH-31] Add `@utility focus-ring` (2 px `accent` outline, 2 px offset, on `:focus-visible`; `Highlight` in forced colors) and `focus-ring-inverse` (`on-ink`) — src/styles/index.css

## Phase 3: US1 — No serious issues on any screen (P1) [COH-31]

- [ ] T007 [US1] [COH-31] Add the state × theme matrix: every state from T004 in light and dark on Pixel 7; on iPhone 14, only landing first visit and home loaded, in both themes. Run it and record every finding. Depends on T003, T004 — e2e/a11y.spec.ts
- [ ] T008 [P] [US1] [COH-31] Component-level scans with `expectNoSeriousViolations` for the update toast, the install prompt and the app-wide error screen (analysis A2). Depends on T005 — src/features/pwa/components/UpdateToast.test.tsx, src/features/pwa/components/InstallPrompt.test.tsx, src/components/errors/AppErrorBoundary.test.tsx
- [ ] T009 [US1] [COH-31] Wrap the app-wide error screen in `<main>`, keep `role="alert"` on the inner block, and give its buttons `focus-ring` (audit A3) — src/components/errors/ErrorFallback.tsx
- [ ] T010 [US1] [COH-31] Fix every serious/critical finding from T007 and T008 in the component that owns it. A fix that needs a different color value changes `tokens.css`, the `contrast.test.ts` pairs and the DESIGN.md contrast table, and is flagged to the user with before/after screenshots before it lands (R5). List any remaining moderate/minor findings with a reason for the PR (FR-019). Depends on T007, T008 — files found by the scans; notes in specs/tasks.md under "Findings"

## Phase 4: US2 — Everything works with a keyboard alone (P1) [COH-31]

- [ ] T011 [P] [US2] [COH-31] Replace the copied `focus-visible:outline-*` classes with `focus-ring` (and `focus-ring-inverse` on the prompt card). Depends on T006 — src/pages/LandingPage.tsx, src/components/feedback/StatusNotice.tsx, src/features/home/components/DayStrip.tsx, src/features/home/components/LocationPill.tsx, src/features/home/components/ThemeToggle.tsx, src/features/pwa/components/promptStyles.ts
- [ ] T012 [P] [US2] [COH-31] Add `usePageTitle(title)`. Use "WashWise — Allow location" on landing and "WashWise — Should you wash?" on home. Unit test — src/lib/usePageTitle.ts, src/lib/usePageTitle.test.ts, src/pages/LandingPage.tsx, src/pages/HomePage.tsx
- [ ] T013 [US2] [COH-31] Add `useRouteFocus()`: on a pathname change after the first render, focus `main h1` with `preventScroll`. Call it from `MobileColumn`. Give the `h1` in `EmptyState` and `HomePage` `tabIndex={-1}` and no outline for programmatic focus. Unit tests: no move on first load (including the `/` → `/home` loader redirect), a move on landing → home, and a move on revoked permission → landing (R2) — src/app/useRouteFocus.ts, src/app/useRouteFocus.test.tsx, src/components/layout/MobileColumn.tsx, src/components/feedback/EmptyState.tsx, src/pages/HomePage.tsx
- [ ] T014 [US2] [COH-31] While a bottom prompt is visible, add a class on `<html>` that sets `scroll-padding-bottom` to the slot height, and remove it on unmount (audit A7, FR-018). Unit test that the class comes and goes — src/features/pwa/components/PwaPrompts.tsx, src/features/pwa/components/PwaPrompts.test.tsx, src/styles/index.css
- [ ] T015 [US2] [COH-31] Keyboard e2e, Chromium only (R4):
  - Tab until focus wraps on landing and home; the sequence equals the DOM order of visible, enabled controls, with only the first and last stop named (R3);
  - every focused element has `outline-style` ≠ none and `outline-width` ≥ 2 px, in both themes;
  - a day, the theme toggle, "Try again" and the location pill keep focus when activated;
  - landing → home by keyboard focuses the `h1` and sets the title;
  - focus doesn't move when the banner or the install prompt appears (FR-009, A3).

  Depends on T011 – T014 — e2e/keyboard.spec.ts

## Phase 5: US3 — Screen readers get the same information (P1) [COH-31]

- [ ] T016 [P] [US3] [COH-31] Check that every interactive element has a name stating its action and exposes its state (day `aria-pressed`, pill `aria-busy`, toggle label); add missing unit assertions in the owning component tests — src/features/home/components/*.test.tsx, src/pages/LandingPage.test.tsx
- [ ] T017 [P] [US3] [COH-31] Write the walkthrough script: landing → allow → home → change day → toggle theme → go offline, with what should be read at each step and an empty results table for VoiceOver (iPhone Safari) and TalkBack (Android Chrome) — docs/a11y/screen-reader-walkthrough.md

## Phase 6: US4 — Readable in both themes, zoomed and in forced colors (P2) [COH-31]

- [ ] T018 [P] [US4] [COH-31] Add contrast pairs: focus ring `accent` on `bg`, `surface` and `surface-muted` (3:1); `on-ink` on `ink` for the inverse ring (3:1); disabled `ink` blended at 60% on `bg` and `surface` (3:1, CHK003) — src/styles/contrast.test.ts
- [ ] T019 [P] [US4] [COH-31] Forced-colors fallbacks: rain bars `forced-colors:bg-[CanvasText]` and a `CanvasText` track border; selected day `forced-colors:border-2 forced-colors:border-[Highlight]` (audit A5, A6) — src/features/home/components/RainChart.tsx, src/features/home/components/DayStrip.tsx
- [ ] T020 [US4] [COH-31] Layout e2e:
  - every button and link ≥ 24 × 24 px at 393 and 320 px (FR-016, A8);
  - 320 px reflow: no horizontal scroll and no clipped control, with screenshots;
  - forced colors (`emulateMedia({ forcedColors: 'active' })`): bars visible, selected day distinct, focus ring drawn, with screenshots;
  - reduced motion: no running animations on "Finding you…", the skeleton and the pill refresh;
  - focus not obscured by the install prompt.

  Depends on T014, T019 — e2e/layout-a11y.spec.ts

## Phase 7: Documentation

- [ ] T021 [P] [COH-31] DESIGN.md, new `<!-- owner: 4.3 -->` block "Accessibility": the WCAG 2.2 AA target, `focus-ring` / `focus-ring-inverse` and their contrast, 24 px targets, forced-colors fallbacks (system colors only there), page titles, route focus — DESIGN.md
- [ ] T022 [P] [COH-31] CLAUDE.md, new `<!-- owner: 4.3 -->` block: use `focus-ring` on every interactive element; titles via `usePageTitle`; how to add a state to `e2e/a11y/states.ts`; `expectNoSeriousViolations` in component tests; the a11y specs run with `pnpm e2e` — CLAUDE.md

## Final Phase: Verification

- [ ] T023 [COH-31] Run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm e2e && pnpm build && pnpm docs:check --done 4.3`. Fix anything that fails. No golden snapshot diff is expected — package.json scripts
- [ ] T024 [HUMAN] [COH-31] Run the walkthrough with VoiceOver on an iPhone (required) and TalkBack on Android (if available); fill in the results table and attach it, with the 320 px and forced-colors screenshots, to COH-31 (SC-004, SC-005) — docs/a11y/screen-reader-walkthrough.md
