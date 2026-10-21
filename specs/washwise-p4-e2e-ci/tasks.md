# Tasks: WashWise P4.4 · End-to-End Tests for Core Flows

**Date**: 2026-10-21
**Spec**: specs/washwise-p4-e2e-ci/spec.md
**Plan**: specs/washwise-p4-e2e-ci/plan.md
**Structure**: By user story (B)
**Tracker**: Linear COH-32 (task 4.4, parent COH-9)

Format: `- [ ] TaskID [P?] [Story?] [COH-ID] Description — path`
Stories:

- US1 = every pull request is checked automatically (P1)
- US2 = location permission flows are proven (P1)
- US3 = day switching is proven (P1)
- US4 = theme switching is proven (P2)

Markers:

- `[HUMAN]` = needs a person; `/implement` prepares it and leaves the box unchecked.
- `[P]` = can run in parallel with the other `[P]` tasks in the same phase (different files, no shared unfinished dependency).

Red-team mitigations from the plan are built in:

- R1 WebKit failures only in CI → T011, T012
- R2 guard catches legitimate requests → T004, T006
- R3 location fake differs from browsers → T005, T007
- R4 engine import fails in Playwright → T015
- R5 workflow errors only on GitHub → T010, T011

---

## Phase 1: Setup (blocks everything)

- [x] T001 [P] [COH-32] Format `.claude/commands/commit.md` and `.mcp.json` with Prettier (content unchanged), so `pnpm format:check` passes and CI can require it — .claude/commands/commit.md, .mcp.json
- [x] T002 [P] [COH-32] Set CI `retries: 1` (was 2); on CI use the reporters `[['github'], ['html', { open: 'never' }], ['list']]`; add `screenshot: 'only-on-failure'` and keep `trace: 'on-first-retry'` — playwright.config.ts

## Phase 2: Foundational (blocking prerequisites)

- [x] T003 [COH-32] Add `test` = `base.extend` with an auto fixture `externalGuard`: `context.route` for every non-local URL aborts and records it; after the test, `expect(unexpected, 'unexpected external requests').toEqual([])`. Re-export `expect` — e2e/fixtures.ts
- [x] T004 [COH-32] Allow without a stub: `localhost`, `127.0.0.1`, `data:`, `blob:`, `about:`. Migrate all 10 specs to `import { test, expect } from './fixtures'` and run the full suite green **before** any new test (R2) — e2e/fixtures.ts, e2e/*.spec.ts
- [x] T005 [COH-32] Add `fakeLocation(page, initial)`: an init-script fake in `window.__fakeLocation` whose `PermissionStatus` is a real `EventTarget`. Its controller has `permission(state)` (fires `change`), `answer(position | { error } | 'pending')` and `unsupported()`. Re-implement `stubGeolocation` (4.3) on top of it; never combine it with `LOCATION_ALLOWED` (R3) — e2e/support.ts
- [x] T006 [COH-32] Add an ESLint `no-restricted-imports` rule for `e2e/**/*.spec.ts` that forbids `test` from `@playwright/test` ("import { test, expect } from './fixtures'") — eslint.config.js
- [x] T007 [COH-32] Sanity spec: each `fakeLocation` outcome (prompt, pending, denied, blocked, unavailable, timeout, unsupported) produces its landing screen, and `permission('granted')` + a position reaches `/home` (R3). Depends on T005 — e2e/fake-location.spec.ts
- [x] T008 [COH-32] Guard self-test: a spec that requests an unstubbed external URL fails with that URL in the message. Use `test.fail()` so the suite stays green — e2e/fixtures.spec.ts

## Phase 3: US1 — Every pull request is checked automatically (P1) [COH-32]

- [x] T009 [US1] [COH-32] Add the workflow:
  - triggers: `pull_request` to `dev`/`main` (`opened`, `synchronize`, `reopened`, `labeled`), `push` to `dev`/`main`, and `workflow_dispatch` with `repeat_each`;
  - `concurrency: ci-${{ github.ref }}`, cancel in progress; `permissions: contents: read`;
  - job `checks` (10 min): pnpm, Node 24 with cache, `install --frozen-lockfile`, then `format:check`, `lint`, `typecheck`, `test`, `build` as separate steps;
  - job `e2e` (15 min, `fail-fast: false`, matrix `android-chrome`/chromium and `ios-safari`/webkit): cache `~/.cache/ms-playwright` by Playwright version, `playwright install --with-deps <browser>` (deps only on a cache hit), `pnpm e2e --project=<project> --repeat-each=<n>` with n = 3 for the `flake-check` label, `inputs.repeat_each` when run by hand, else 1. Always upload `playwright-report/`, and `test-results/` on failure (14 days);
  - a `labeled` event for any other label skips both jobs.

  — .github/workflows/ci.yml

- [x] T010 [US1] [COH-32] Lint the workflow with `actionlint` (downloaded binary, not committed) and fix every finding (R5) — .github/workflows/ci.yml
- [x] T011 [HUMAN] [US1] [COH-32] (Done with the user's go-ahead: [CoDev-Cohort/WashWise#4](https://github.com/CoDev-Cohort/WashWise/pull/4).) With the user's go-ahead, open a **draft PR `p4-mark` → `dev`** so CI runs on GitHub. It carries the 4.1–4.4 work. Confirm both e2e legs start and the report artifact uploads (R1, R5) — GitHub
- [x] T012 [US1] [COH-32] (WebKit passed on the first run; the one failure was the flaky P1 `api.test.ts`, fixed, see plan.) Triage the `ios-safari` leg from the real run, time-boxed (R1): fix real bugs in the covered flows; skip engine limits with `test.skip(browserName === 'webkit', '<reason>')`; report anything beyond the box in the PR. Depends on T011 — e2e/*.spec.ts

## Phase 4: US2 — Location permission flows are proven (P1) [COH-32]

- [x] T013 [US2] [COH-32] Permission flows, with weather and place names stubbed and the clock pinned:
  - allowed → both verdict cards (S2.1);
  - refused → "Try again" → allow → `/home` (S2.2);
  - blocked on load and after a tap: settings hint, stays on `/` (S2.3);
  - unavailable → retry succeeds; timeout → retry succeeds (S2.4);
  - revoked while on `/home` → `/` (S2.6);
  - pill → London position: London's cards and place name (S2.7).

  Depends on T005 — e2e/permission-flows.spec.ts

- [x] T014 [US2] [COH-32] Remove the first-visit test that moved to `permission-flows.spec.ts`; keep the returning-user tests (S2.5) — e2e/location.spec.ts

## Phase 5: US3 — Day switching is proven (P1) [COH-32]

- [x] T015 [US3] [COH-32] Check that `../src/features/verdict` and `../src/features/forecast/normalize` import cleanly in Playwright (no `@/` value imports along the chain). If not, write `e2e/__expected__/manila-days.json` from a unit test and read that instead (R4) — e2e/day-switching.spec.ts
- [x] T016 [US3] [COH-32] Day switching:
  - Today is selected and the chart shows the next 5 hours (S3.1);
  - each other day: the only pressed button, the cards show that day's sub-labels from `computeDayVerdicts`, the chart shows 12–4 PM (S3.2);
  - Enter and Space on Chromium; skipped on WebKit with a reason (S3.3);
  - back to Today restores the from-now chart (S3.4).

  Depends on T015 — e2e/day-switching.spec.ts

- [x] T017 [US3] [COH-32] Remove the day tests now in `day-switching.spec.ts`, including the `isMobile`-skipped keyboard test that never ran — e2e/home.spec.ts

## Phase 6: US4 — Theme switching is proven (P2) [COH-32]

- [x] T018 [US4] [COH-32] Theme:
  - nothing saved: system light → light, system dark → dark (S4.1);
  - the toggle flips the `dark` class and the label "Switch to dark mode" ⇄ "Switch to light mode" (S4.2);
  - saved dark under a light system and saved light under a dark system both apply before first render after a reload (no flash) (S4.3).

  — e2e/theme.spec.ts

- [x] T019 [US4] [COH-32] Remove the theme tests now in `theme.spec.ts`; keep the section and overflow checks — e2e/home.spec.ts

## Phase 7: Documentation

- [x] T020 [P] [COH-32] INFRASTRUCTURE.md `## CI checks`: replace the TODO with a `<!-- owner: 4.4 -->` block covering triggers, jobs and steps, artifacts, retries/flaky, the `flake-check` label and the manual run, which checks a repo admin marks as required (`checks`, `e2e (android-chrome)`, `e2e (ios-safari)`), and that COH-33 can depend on it. Leave `Hosting & deploy` alone — INFRASTRUCTURE.md
- [x] T021 [P] [COH-32] CLAUDE.md, new `<!-- owner: 4.4 -->` block "End-to-end tests":
  - import from `./fixtures`;
  - `fakeLocation` controller;
  - stub every external service;
  - pin the clock;
  - skip with a reason;
  - debug a CI failure (download the report, `npx playwright show-trace`).

  — CLAUDE.md

- [x] T022 [P] [COH-32] Add a CI badge and one line saying `pnpm e2e` runs in CI on both profiles — README.md

## Final Phase: Verification

- [ ] T023 [COH-32] Run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build && pnpm e2e && pnpm docs:check --done 4.4` locally (Chromium). Then check that CI is green on both legs — package.json scripts, GitHub
- [ ] T024 [HUMAN] [COH-32] Add the `flake-check` label to the PR and confirm the repeat-3 run passes (SC-005). A repo admin marks `checks`, `e2e (android-chrome)` and `e2e (ios-safari)` as required on `dev` and `main` (FR-016) — GitHub settings
