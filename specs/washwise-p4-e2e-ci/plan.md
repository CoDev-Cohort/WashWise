# Implementation Plan: WashWise P4.4 · End-to-End Tests for Core Flows

**Date**: 2026-10-21
**Spec**: [spec.md](spec.md) (Linear COH-32)
**Status**: Draft

## Summary

Add a GitHub Actions workflow, `.github/workflows/ci.yml`, that runs every quality check on pull requests and pushes to `dev`/`main`. It has a `checks` job (format, lint, typecheck, unit tests, build, docs check) and an `e2e` job matrixed over the two Playwright projects, with the HTML report uploaded on failure. On the test side, add a shared Playwright `test` fixture that fails any test making an unexpected external request, and a controllable fake for the browser location (grant, refuse, block, unavailable, timeout, revoke, move). Then fill the flow gaps the current suite leaves: refused → retry → allowed, unavailable/timeout retry, revoked while open, pill refresh to a new cell, cards changing with the day, back to Today, system light default, and a keyboard day test that actually runs.

## Technical Context

**Stack**: Playwright 1.64 (Pixel 7 Chromium, iPhone 14 WebKit) against the production build (`pnpm build && pnpm preview`), GitHub Actions, pnpm 11, Node 24.
**Primary Dependencies**: none new. GitHub Actions used: `actions/checkout@v4`, `pnpm/action-setup@v4` (reads `packageManager`), `actions/setup-node@v4` (pnpm cache), `actions/cache@v4` (Playwright browsers), `actions/upload-artifact@v4`.
**Storage**: none. CI artifacts: `playwright-report/` and `test-results/`, kept 14 days.
**Target Layer(s)**: tests and CI only. No product code changes unless a test finds a bug that blocks a covered flow (spec Out of Scope).
**Performance Goals**: whole run under 15 min (SC-004). `checks` (~3 min) and the two e2e matrix legs (~6–8 min each) run in parallel.
**Constraints**: no real network or location in tests (FR-005, FR-006); the clock is pinned inside the recorded forecast (FR-010); at most 1 retry in CI (FR-011).

## Data Model

None.

## API Contracts

None. Open-Meteo and BigDataCloud are faked at the network layer with the recorded fixtures already used by the suite (`src/features/forecast/__fixtures__/real/`).

## Current coverage vs. spec

| Spec flow                                | Today                                                                  | Gap → this task                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Allowed → home with both cards (S2.1)    | `location.spec.ts` reaches `/home`, checks heading only                | Assert both verdict cards for the faked position                            |
| Refused → Try again → allowed (S2.2)     | a11y scan shows the refused screen only                                | New flow test                                                               |
| Blocked (S2.3)                           | a11y scan only                                                         | New: message + settings hint, button doesn't leave landing                  |
| Unavailable / timeout + retry (S2.4)     | a11y scan only                                                         | New flow tests                                                              |
| Returning user (S2.5)                    | `location.spec.ts`                                                     | Keep                                                                        |
| Revoked while open (S2.6)                | none                                                                   | New: permission `change` → back to `/`                                      |
| Pill → new position (S2.7)               | none in e2e                                                            | New: new forecast + new place name                                          |
| Today selected, from-now chart (S3.1)    | `home.spec.ts`                                                         | Keep                                                                        |
| Day changes cards + chart (S3.2)         | `home.spec.ts` checks the chart only                                   | Also assert cards = that day's verdicts                                     |
| Keyboard day select (S3.3)               | `home.spec.ts` test is skipped on `isMobile`, so it **never runs**     | Rewrite to run on Chromium (WebKit doesn't Tab to buttons; skip with reason) |
| Back to Today (S3.4)                     | none                                                                   | New                                                                         |
| System light/dark default (S4.1)         | dark only (`home.spec.ts`)                                             | Add light                                                                   |
| Toggle + label (S4.2)                    | toggle only                                                            | Assert the label flips                                                      |
| Persist + no flash (S4.3)                | `home.spec.ts`                                                         | Add "saved light while system is dark" (no dark flash)                      |

## Component / Module Breakdown

### CI (FR-001 – FR-004, FR-011, FR-013, FR-015, FR-016)

- **`.github/workflows/ci.yml`** (new):
  - Triggers: `pull_request` to `dev`/`main` (types `opened`, `synchronize`, `reopened`, `labeled`), `push` to `dev`/`main`, and `workflow_dispatch` with input `repeat_each` (number, default 1).
  - **Flake check** (FR-015, SC-005): adding the label `flake-check` to a PR runs e2e with `--repeat-each=3`. GitHub only offers "Run workflow" (`workflow_dispatch`) once the file is on the default branch, so the label is the way before merge; `workflow_dispatch` covers later checks. A `labeled` event for any other label skips the jobs (`if:`), so labelling a PR doesn't re-run CI for nothing.
  - `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }` (FR-004).
  - `permissions: contents: read`.
  - **Job `checks`** (ubuntu-latest, timeout 10 min): checkout, pnpm, Node 24 with pnpm cache, `pnpm install --frozen-lockfile`, then `format:check`, `lint`, `typecheck`, `test`, `build`. (`docs:check --done X.Y` is a per-task gate for authors, so it isn't in CI.) Separate steps, so the failing step is named on the PR (FR-003).
  - **Job `e2e`** (timeout 15 min, `strategy.fail-fast: false`, matrix `project: [android-chrome, ios-safari]` with `browser: [chromium, webkit]`):
    - install, then cache `~/.cache/ms-playwright` keyed by the `@playwright/test` version and browser;
    - `pnpm exec playwright install --with-deps <browser>` (only `install-deps` on a cache hit);
    - `pnpm e2e --project=<project> --repeat-each=<n>`, where n is 3 with the `flake-check` label, `inputs.repeat_each` on a manual run, else 1;
    - always upload `playwright-report/` (and `test-results/` on failure) as `playwright-report-<project>`, kept 14 days (FR-003).
- **`playwright.config.ts`**: `retries: process.env.CI ? 1 : 0` (was 2, FR-011); reporter on CI `[['github'], ['html', { open: 'never' }], ['list']]` so the report exists to upload; `trace: 'on-first-retry'` and `screenshot: 'only-on-failure'`. Retried-then-passed tests show as "flaky" in the report and the GitHub annotations.
- **Format check** must pass on CI: `.claude/commands/commit.md` and `.mcp.json` fail `prettier --check` today (pre-existing). Format them with `pnpm format` (content unchanged).
- **Branch protection** (FR-016): documented, not automated. A repo admin marks `checks`, `e2e (android-chrome)` and `e2e (ios-safari)` as required on `dev` and `main`.
- **First real runs** (R1, R5): lint the workflow with `actionlint` (downloaded binary) before pushing. Once the workflow is in, open a **draft PR `p4-mark` → `dev`** so CI runs on GitHub, and triage the iPhone/WebKit leg first: fix real bugs, skip engine limits with a reason. Time-box the WebKit triage; anything beyond it is reported, not fixed in this task.

### Test harness (FR-005, FR-006, FR-010, FR-012)

- **`e2e/fixtures.ts`** (new): `export const test = base.extend<…>({...})` with an **auto fixture** `externalGuard`. It calls `context.route(url => !isLocal(url), …)`, so any request leaving `localhost` that no page-level stub answered is aborted and recorded. After the test, `expect(unexpected, 'unexpected external requests').toEqual([])` fails with the URLs (FR-006, SC-003). Page-level `page.route` stubs take priority over context routes, so existing stubs keep working. Re-exports `expect`. Allowed without a stub: `localhost`, `127.0.0.1`, `data:`, `blob:`, `about:`. All 10 existing specs are migrated and the full suite is run green **before** any new test is written (R2).
- **ESLint** (`eslint.config.js`): in `e2e/**/*.spec.ts`, `no-restricted-imports` for `test` from `@playwright/test` with the message "import { test, expect } from './fixtures'", so new specs can't skip the guard.
- **`e2e/support.ts`**: replace `stubGeolocation(page, outcome)` (4.3) with **`fakeLocation(page, initial)`**. It installs an init-script fake for `navigator.geolocation` and `navigator.permissions` and returns a controller:
  - `permission(state: 'granted' | 'prompt' | 'denied')`: sets the state and fires the `change` event the app listens to (`watchPermission` in `geolocation.ts`);
  - `answer(next: { position } | { error: 'denied' | 'unavailable' | 'timeout' } | 'pending')`: how the next `getCurrentPosition` calls behave;
  - `unsupported()`: removes `navigator.geolocation`.

  The state lives in `window.__fakeLocation` and is driven with `page.evaluate`, so a test can change it mid-flow (refuse, then allow; revoke while open). `stubGeolocation` becomes a thin wrapper so the 4.3 a11y states keep working. `LOCATION_ALLOWED` stays for specs that only need "granted". The fake `PermissionStatus` is a real `EventTarget` (so `addEventListener('change')` works as in browsers), and the fake is never combined with `LOCATION_ALLOWED` / context geolocation permissions in the same test. `e2e/fake-location.spec.ts` checks that each outcome produces its landing screen before the flow specs rely on it (R3).
- Clock: the existing `page.clock.setFixedTime(FIXED_NOW | fixture.now)` (FR-010).

### Flow specs (FR-007 – FR-009)

- **`e2e/permission-flows.spec.ts`** (new), with Story 2 criteria as tests:
  - allowed → home with both cards (S2.1);
  - refused → "Try again" → allow → home (S2.2);
  - blocked on load, and after a tap: settings hint, stays on `/` (S2.3);
  - unavailable → retry succeeds; timeout → retry succeeds (S2.4);
  - revoked while on `/home` → `/` (S2.6);
  - pill → new position (London fixture): London's cards and place name (S2.7).
- **`e2e/location.spec.ts`**: keep the returning-user tests (S2.5). Its first test moves into `permission-flows.spec.ts` (no duplicate).
- **`e2e/day-switching.spec.ts`** (new), replacing the day tests in `home.spec.ts`:
  - Today is selected and the chart shows the next 5 hours (S3.1);
  - each other day: only that day is pressed, the cards show `computeDayVerdicts(forecast)[i]` sub-labels, and the chart shows 12–4 PM (S3.2);
  - keyboard Enter and Space on Chromium (WebKit skipped with a reason, FR-012) (S3.3);
  - back to Today restores the from-now chart (S3.4).

  Expected verdicts come from importing the pure engine relatively (`../src/features/verdict`, `../src/features/forecast/normalize`). Both are React-free and use relative imports only. First check the import chain resolves in Playwright (no `@/` value imports). If it doesn't, a unit test writes the expected per-day sub-labels to `e2e/__expected__/manila-days.json` and the e2e reads that (R4).
- **`e2e/theme.spec.ts`** (new), replacing the theme tests in `home.spec.ts`:
  - system light → light, system dark → dark, nothing saved (S4.1);
  - the toggle flips the class and its label "Switch to dark mode" ⇄ "Switch to light mode" (S4.2);
  - a saved choice survives reload, with no flash, both ways: saved dark while the system is light, and saved light while the system is dark (S4.3).
- **`e2e/home.spec.ts`**: keeps the page-level checks (sections present, no overflow) only.
- **All specs** import `test`/`expect` from `./fixtures` (the 10 existing spec files are migrated).

### Docs (FR-014, FR-016)

- **INFRASTRUCTURE.md**, the `## CI checks` placeholder (owner `P4`): fill in this section only, as a new `<!-- owner: 4.4 -->` block inside it, replacing its TODO line. It covers the triggers, jobs and steps, artifacts, retries/flaky, the manual `repeat_each` run, which checks to mark required, and how COH-33 can depend on it. `Hosting & deploy` stays for 4.5.
- **CLAUDE.md**, new `<!-- owner: 4.4 -->` block "End-to-end tests":
  - import from `./fixtures`;
  - `fakeLocation` controller;
  - stub every external service (`stubExternalServices`, `stubForecast`), since unexpected requests fail;
  - pin the clock;
  - skip with a reason, never delete;
  - how to debug a CI failure (download the report, `npx playwright show-trace`).
- **README.md**: a CI badge and one line under scripts saying `pnpm e2e` runs in CI on both profiles.

## Project Structure

```
.github/workflows/ci.yml          new
e2e/
  fixtures.ts                     new: test with external-request guard
  support.ts                      (modified: fakeLocation controller; stubGeolocation wraps it)
  permission-flows.spec.ts        new
  day-switching.spec.ts           new
  theme.spec.ts                   new
  home.spec.ts, location.spec.ts  (trimmed: moved tests)
  *.spec.ts                       (import from ./fixtures)
playwright.config.ts              (retries 1 on CI, html report, screenshots)
eslint.config.js                  (no-restricted-imports in e2e specs)
.claude/commands/commit.md, .mcp.json   (prettier only)
INFRASTRUCTURE.md, CLAUDE.md, README.md
```

## Dependencies

No new packages. New external service: GitHub Actions (free for this repo's usage). It needs the repository's Actions enabled; a repo admin sets the required checks.

## Resolved items

The spec has no open `[NEEDS CLARIFICATION]` items. Planning decisions:

- **Reuse the build in e2e?** No. Each e2e leg runs `pnpm build` through Playwright's `webServer`, as locally. That costs ~30 s per leg but keeps one way to run e2e.
- **Guard at the context level** (`context.route`), so stubs added later by `page.route` still win.
- **Flake check trigger** (analysis, HIGH): a `flake-check` PR label, because `workflow_dispatch` only works from the default branch. Spec FR-015 amended.
- **Keyboard tests on WebKit**: skipped with a reason (Playwright WebKit doesn't Tab to buttons by default), as in 4.3.

## Implementation notes

- **Three workflow files, not one** (changes the CI section above). Putting the `labeled` trigger in `ci.yml` meant any label cancelled the in-progress run (shared concurrency group). A skipped job would also have shared the required checks' names and could hide an earlier failure. So:
  - `e2e.yml` is a reusable workflow (`workflow_call`, input `repeat_each`);
  - `ci.yml` runs `checks` and calls it (check names `checks`, `e2e / android-chrome`, `e2e / ios-safari`);
  - `flake-check.yml` calls it with 3 repeats on the `flake-check` label, under its own names and concurrency group.
- **First real CI run** (T011, T012): both e2e legs passed on the first run, including WebKit, so no WebKit triage was needed. `checks` failed once on a P1 unit test, `api.test.ts` "passes a caller abort during the body read through". It aborted on a fixed 50 ms timer, and on the runner the mocked connection sometimes failed first ("network" instead of the abort). The test now aborts the moment `response.json()` starts, which is deterministic. It was checked to still fail when `api.ts` stops passing aborts through. It didn't reproduce locally on Node 24 (6 runs).
- 9 spec files were migrated to `./fixtures` (the plan said 10).

## Known Risks

| Risk                                                         | Status                                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| R1 WebKit failures appear only in CI                         | Mitigated: early draft PR to `dev`, WebKit triaged first, time-boxed                     |
| R2 The guard catches legitimate requests                     | Mitigated: allowlist; migrate and run green before new tests                             |
| R3 The location fake differs from real browsers              | Mitigated: `EventTarget` permission status, no mixing, `fake-location.spec.ts` sanity    |
| R4 Engine import fails in Playwright                         | Mitigated: check first; JSON expectations as fallback                                    |
| R5 Workflow errors only visible on GitHub                    | Mitigated: `actionlint` locally, then the draft PR run                                   |

## Constitution Compliance

There is no `AGENTS.md`; the `CLAUDE.md` conventions act as the constitution.

| Rule                                                | Status | Note                                                                          |
| --------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| Spec → plan → tasks before code                     | PASS   | This plan precedes tasks                                                      |
| Never hit the network in tests                      | PASS   | Enforced in e2e by the guard fixture (and by MSW in unit tests, unchanged)    |
| Time-dependent logic pinned                         | PASS   | Clock fixed in every flow test                                                |
| Query by role and accessible name                   | PASS   | Flow specs use roles/names; `data-section` only where layout is tested        |
| E2E on Pixel 7 and iPhone 14 against the prod build | PASS   | Both projects in CI                                                           |
| No product behaviour change                         | PASS   | Tests and CI only; formatting of two config files                             |
| PR base `dev`                                       | PASS   | Workflow targets `dev` and `main`                                             |
