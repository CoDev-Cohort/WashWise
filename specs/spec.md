# Feature Specification: WashWise P4.4 · End-to-End Tests for Core Flows

**Created**: 2026-10-21
**Status**: Draft
**Source**: Linear COH-32 (task 4.4, phase COH-9 "P4 · Hardening"). Blocked by COH-21 (2.3 Landing page) and COH-28 (3.6 Home page assembly).

## Overview

The core user journeys of WashWise — allowing, refusing or being blocked from location, picking a day and switching theme — must be proven to work in real phone browsers on every change, without depending on a real device location or the real weather services. This task fills the gaps in the end-to-end suite for those journeys and makes the whole check (lint, types, unit tests, build, end-to-end) run automatically for every pull request.

## User Stories

### Story 1 — Every pull request is checked automatically (Priority: P1)

A contributor opens a pull request. Without doing anything else, the team sees whether it passes lint, type checks, unit tests, the production build and the end-to-end tests on both phone profiles (Android-like and iPhone-like browsers). A failing check marks the pull request as failing (and blocks merging once a repo admin makes it required) and shows which test failed, with enough evidence (trace, screenshot) to debug it without re-running locally.

**Why this priority**: "Tests run in CI" is an acceptance criterion, and no automated check exists today: every other test in the repo only protects the code if someone remembers to run it.

**Acceptance Criteria**:

1. **Given** a pull request to the integration or main branch, **When** it is opened or updated, **Then** lint, type check, unit tests, build and end-to-end tests run automatically.
2. **Given** a push to the integration or main branch, **When** it lands, **Then** the same checks run.
3. **Given** any check fails, **When** the team looks at the pull request, **Then** the failing step is shown and, for end-to-end failures, the report with traces and screenshots can be downloaded.
4. **Given** both phone profiles, **When** the end-to-end step runs, **Then** it runs on both, including the iPhone-like browser that local sandboxes may lack.
5. **Given** a new commit is pushed while a run is in progress, **When** the new run starts, **Then** the outdated run is cancelled.

### Story 2 — Location permission flows are proven (Priority: P1)

The suite walks through each way the location request can go, with the device location and the weather and place-name services faked: allowed (lands on the home page with a forecast), refused (explains it and offers "Try again"; trying again and allowing then works), permanently blocked (explains how to unblock in browser settings), and the location becoming unavailable or slow. It also covers permission being revoked while the app is open (the user is sent back to the landing page) and a returning user skipping the landing page.

**Why this priority**: Location is the gate to every verdict; a broken permission flow means the app shows nothing.

**Acceptance Criteria**:

1. **Given** a first visit with location allowed, **When** the user taps "Use my location", **Then** they reach the home page and see both verdict cards for their faked position.
2. **Given** location refused, **When** the user taps "Use my location", **Then** the refused message and "Try again" show; **When** they then allow and tap "Try again", **Then** they reach the home page.
3. **Given** location permanently blocked, **When** the landing page loads or the user taps the button, **Then** the blocked message and the browser-settings hint show and no home page is reached.
4. **Given** the position is unavailable or times out, **When** the user taps the button, **Then** the matching message and "Try again" show, and a successful retry reaches the home page.
5. **Given** a returning user (allowed and position saved), **When** they open the app, **Then** they land straight on the home page.
6. **Given** the home page is open, **When** location permission is revoked, **Then** the user is sent to the landing page.
7. **Given** the home page, **When** the user taps the location pill and the device reports a new position, **Then** the forecast for the new position is shown and the pill shows its place name.

### Story 3 — Day switching is proven (Priority: P1)

The suite picks each day in the strip and checks that the selected day, the verdict cards and the rain chart change together, by touch and by keyboard, and that Today is selected on load.

**Why this priority**: Planning ahead is the main reason to return to the app.

**Acceptance Criteria**:

1. **Given** the home page loads, **When** it renders, **Then** Today is selected and the chart shows the next hours from now.
2. **Given** any other day, **When** the user taps it, **Then** it becomes the only selected day and the cards and chart show that day's values (verdicts as computed for that day; chart 12 PM – 4 PM).
3. **Given** keyboard use, **When** the user selects a day with Enter or Space, **Then** the same happens.
4. **Given** a day is selected, **When** the user goes back to Today, **Then** Today's "from now" values return.

### Story 4 — Theme switching is proven (Priority: P2)

The suite checks that the app follows the system theme on first visit, that the toggle switches light and dark, that the choice survives a reload, and that there is no flash of the wrong theme on load.

**Why this priority**: Visible to every user, but a broken theme doesn't block the answer.

**Acceptance Criteria**:

1. **Given** no saved choice, **When** the app loads with the system in light or dark, **Then** it matches the system.
2. **Given** the toggle, **When** the user taps it, **Then** the theme switches and the toggle's label says what it will do next.
3. **Given** a chosen theme, **When** the user reloads, **Then** the chosen theme applies before the first paint, even if the system setting differs.

### Edge Cases

- What happens when a test would reach a real external service? → The test fails and names the URL (FR-006).
- What happens when the clock affects the verdict (late in the day, the forecast's first day)? → The browser clock is pinned to a time inside the recorded forecast.
- What happens with a flaky end-to-end failure? → One automatic retry in CI only; a test that needs the retry is reported as flaky, not silently passed.
- What happens when the iPhone-like browser can't run a test (e.g. offline service worker, keyboard Tab)? → The test is skipped on that profile with a stated reason, never deleted.
- What happens to the pre-existing end-to-end tests? → They stay and run in CI too; new tests reuse their helpers instead of duplicating them.

## Functional Requirements

- **FR-001**: Every pull request to the integration and main branches, and every push to them, MUST automatically run lint, type check, formatting check, unit tests, the production build and the end-to-end tests.
- **FR-002**: The end-to-end tests MUST run on both phone profiles (Android-like Chromium and iPhone-like WebKit) in CI.
- **FR-003**: A failing check MUST fail the pull request status, and end-to-end failures MUST publish the test report with traces and screenshots for download.
- **FR-004**: An in-progress run MUST be cancelled when a newer commit is pushed to the same branch.
- **FR-005**: The device location MUST be faked in every end-to-end test; tests MUST be able to grant, refuse, block, make unavailable, time out and revoke it, and change the position.
- **FR-006**: The weather and place-name services MUST be faked in every end-to-end test. Any unexpected external request MUST fail the test and name the URL.
- **FR-007**: The tests MUST cover the permission flows of Story 2: allowed, refused then retried, blocked, unavailable and timeout with retry, returning user, revoked while open, and location refresh to a new position.
- **FR-008**: The tests MUST cover day switching (Story 3) by touch and keyboard, checking the selected day, cards and chart together.
- **FR-009**: The tests MUST cover theme behaviour (Story 4): system default, toggle, persistence across reload, no flash.
- **FR-010**: Time-dependent tests MUST pin the browser clock inside the recorded forecast so results don't depend on when CI runs.
- **FR-011**: CI MUST retry a failed end-to-end test at most once and report retried tests as flaky.
- **FR-012**: Tests that can't run on one profile MUST be skipped there with a stated reason.
- **FR-013**: The whole CI run SHOULD finish within 15 minutes.
- **FR-014**: How to run, debug and extend the suite, and what CI checks, MUST be documented for contributors.
- **FR-015**: The check MUST be runnable by hand with an option to repeat every end-to-end test several times, to look for flaky tests (SC-005).
- **FR-016**: Making the check required for merging is a repository setting done by a repo admin; the documentation MUST say which checks to mark as required.

## Out of Scope

- Deployment, preview URLs and HTTPS (task 4.5, COH-33), though its "build passes lint and tests" gate can reuse this check.
- Visual regression (pixel-diff) testing.
- Tests against the real weather or place-name services, or real device location.
- Desktop browsers beyond what existing tests already cover; physical-device testing.
- New product behaviour; this task only tests and wires checks (a bug found while testing is fixed only if it blocks a covered flow, otherwise reported).

## Success Criteria

- **SC-001**: 100% of pull requests to the integration and main branches show the checks' result before merge.
- **SC-002**: Every flow listed in COH-32 (granted, denied, blocked, day switching, theme toggle) has at least one passing end-to-end test on both profiles, or a stated skip reason.
- **SC-003**: 0 end-to-end tests reach a real external service (verified by the refused-request guard).
- **SC-004**: The CI run completes in under 15 minutes on a typical pull request.
- **SC-005**: Before merge, one manual CI run with every end-to-end test repeated 3 times passes with no failures (flake check).

## Clarifications

### Session 2026-10-21

- Q: The repo has no CI workflow. What should this task's CI cover? → A: A full pull-request check: lint, type check, unit tests, build, then end-to-end on both phone profiles; the deploy task can reuse it (FR-001, FR-002).

### Checklist 2026-10-21

- CHK001 [Consistency] Blocking merges needs a repo admin to mark the check required; documented, not automated (FR-016).
- CHK002 [Measurability] Flake check: a manual run repeating each end-to-end test 3 times (FR-015, SC-005).
- CHK003 [Consistency] An unexpected external request fails the test and names the URL (FR-006, edge case).
