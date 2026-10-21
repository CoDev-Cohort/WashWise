# Feature Specification: WashWise P4.2 · Offline Mode, Install Prompt and Update Toast

**Created**: 2026-10-21
**Status**: Draft
**Source**: Linear COH-30 (task 4.2, phase COH-9 "P4 · Hardening"). Blocked by COH-17 (1.7 PWA base) and COH-28 (3.6 Home page assembly).

## Overview

WashWise should keep answering "should you wash?" when the connection drops. This feature makes the installed or bookmarked app open without a network, shows the last forecast it received together with how old it is, invites users on supporting browsers to install the app, and tells users when a new version is ready so they can switch to it with one tap.

## User Stories

### Story 1 — Open the app offline and see the last forecast (Priority: P1)

A returning user opens WashWise with no connection (airplane mode, poor signal). Instead of a blank page or a browser error, the app opens on the home page and shows the last forecast it received for their location, with the verdict cards, day strip, rain chart and Other Days list as usual.

**Why this priority**: People often decide about laundry or a car wash where signal is poor. Without this, the app is useless the moment the network drops, and it is the main acceptance criterion of the task.

**Acceptance Criteria**:

1. **Given** the user has opened the app online at least once and received a forecast, **When** they open it again with no connection, **Then** the app shell loads and the home page shows the last forecast received.
2. **Given** the app is offline with a cached forecast, **When** the home page renders, **Then** verdicts are computed from the cached forecast against the current time (so "Today" is the real today, not the day the forecast was fetched), and days already past are left out.
3. **Given** the cached forecast no longer covers today, **When** the app opens offline, **Then** the error state with "Try again" is shown instead.
4. **Given** the user has never received a forecast, **When** they open the app offline, **Then** the app shell still loads and the home page shows the existing error state with "Try again", not a browser error page.
5. **Given** the app is online, **When** a forecast is requested, **Then** the last cached forecast is shown straight away and a fresh one is fetched in the background and replaces it when it arrives (stale-while-revalidate).
6. **Given** the connection comes back while the app is open, **When** the app notices, **Then** it fetches a fresh forecast without the user doing anything, and the page updates in place.

### Story 2 — Know how old the forecast is (Priority: P1)

When the device is offline, or the latest forecast refresh failed, a banner tells the user how old it is ("Updated 2 h ago") so they can judge how much to trust the verdict.

**Why this priority**: A verdict built on old data without saying so is misleading. The banner is an explicit acceptance criterion.

**Acceptance Criteria**:

1. **Given** the app is offline and showing a cached forecast, **When** the home page renders, **Then** a banner shows "Updated X ago", where X is the time since that forecast was received.
2. **Given** the banner is visible, **When** time passes, **Then** X updates (at least once a minute) without a reload.
3. **Given** a fresh forecast arrives, **When** the page updates, **Then** the banner disappears.
4. **Given** the banner, **When** it is read by assistive technology, **Then** its text is announced once when it appears, not on every update.
5. **Given** the banner, **When** it renders in light or dark, **Then** it uses existing design tokens and is legible.

### Story 3 — Get told when a new version is ready (Priority: P1)

After the team ships a new version, a user who has the app open sees a small toast: "A new version is available" with a "Reload" action. Tapping it switches to the new version. Dismissing it keeps the current version until the next launch.

**Why this priority**: Once the app works offline, an old copy can stay in use indefinitely. The toast is how fixes reach users, and it is an explicit acceptance criterion.

**Acceptance Criteria**:

1. **Given** a new version has been deployed, **When** the app checks for one (on launch, on returning to the foreground, or hourly while open) and finds it, **Then** a toast says a new version is available and offers "Reload".
2. **Given** the toast, **When** the user taps "Reload", **Then** the app reloads into the new version.
3. **Given** the toast, **When** the user dismisses it, **Then** it closes and the current version keeps working.
4. **Given** no new version, **When** the app runs, **Then** no toast is shown.
5. **Given** the toast, **When** it is used by keyboard or assistive technology, **Then** its message is announced and both actions are real buttons that are reachable and labelled.

### Story 4 — Install WashWise from the app (Priority: P2)

On a browser that supports installing web apps, a user who has not installed WashWise sees an "Install app" prompt inside the app. Tapping it opens the browser's install dialog. Dismissing it hides the prompt and it does not come back on every visit.

**Why this priority**: Installing makes the app easier to return to and is the natural home for offline use, but the browser's own install menu already works without it.

**Acceptance Criteria**:

1. **Given** a browser that offers installation, the app is not installed and this is at least the user's second visit, **When** the user is on the home page, **Then** an "Install app" prompt is shown.
2. **Given** the user's first visit, **When** they reach the home page, **Then** no install prompt is shown.
3. **Given** the prompt, **When** the user taps "Install", **Then** the browser's install dialog opens; if they accept, the prompt disappears.
4. **Given** the prompt, **When** the user dismisses it, **Then** it disappears and stays hidden on later visits on that device, with no re-show timer.
5. **Given** the app is already installed and running standalone, or the browser does not offer installation, **When** the app runs, **Then** no prompt is shown.
6. **Given** the prompt, **When** it is used by keyboard or assistive technology, **Then** both actions are real buttons with labels.

### Edge Cases

- What happens when the device moves to a different ~1 km cell while offline? → The most recent cached forecast (from the previous cell) is shown with the "Updated X ago" banner; the page never blanks (see Clarifications).
- What happens when the cached forecast is very old (for example its days are mostly in the past)? → It is shown as long as it still covers today; days already past are dropped from the strip and the Other Days list. Once no cached day covers today, the error state with "Try again" is shown (FR-017).
- What happens when the place name lookup fails offline? → The pill shows "Your location" (existing behaviour).
- What happens when the app is online with a cached forecast and a background refresh is still running? → No banner; it appears only if that refresh fails or the device is offline.
- What happens when the forecast request fails online (server error, timeout) while cached data exists? → The cached forecast stays on screen and the age banner is shown.
- What happens when the user taps the location pill while offline? → The refresh fails as today; the previous position and forecast stay, with the banner.
- What happens when both the update toast and the install prompt would show? → Only the update toast is shown; the install prompt waits until the toast is gone or the next visit (FR-018).
- What happens when storage for the dismissed install prompt is blocked? → The prompt may reappear next visit; the app does not crash.
- What happens when the app is opened offline at a deep link (`/home`) or on the landing page? → The app shell loads for every route.

## Functional Requirements

- **FR-001**: System MUST load the app shell (all pages, styles, fonts and icons the app needs) with no network after it has been opened online once.
- **FR-002**: System MUST keep the last successful forecast response on the device across app restarts, and serve it when the network is unavailable.
- **FR-003**: Forecast requests MUST follow stale-while-revalidate: show the cached forecast immediately when one exists, fetch a fresh one in the background, and replace the cached one when it arrives.
- **FR-004**: System MUST compute verdicts from a cached forecast against the current time, exactly as for a fresh one.
- **FR-005**: System MUST show an "Updated X ago" banner while the device is offline or after a forecast refresh has failed, never merely while a background refresh is in flight. X is the time since the forecast on screen was received, worded "just now" (under 1 min), "N min ago", "N h ago" or "N days ago", and kept current at least once a minute.
- **FR-006**: System MUST hide the banner as soon as a fresh forecast is shown.
- **FR-007**: System MUST refetch the forecast automatically when the connection returns.
- **FR-008**: System MUST check for a newly deployed version on launch, when the app returns to the foreground, and at most once an hour while it stays open, and on finding one show an update toast with "Reload" and a dismiss action; "Reload" MUST load the new version, dismissing MUST keep the current one running.
- **FR-009**: System MUST NOT switch versions without the user's action while the app is open.
- **FR-010**: On browsers that offer installation, System MUST show an in-app install prompt on the home page from the user's second visit onwards when the app is not installed (never on the first visit), open the browser's install dialog on "Install", and remember a dismissal on that device with no expiry (until site data is cleared).
- **FR-011**: System MUST NOT show the install prompt when the app runs installed (standalone) or the browser does not offer installation.
- **FR-012**: The banner, toast and prompt MUST use existing design tokens, be legible in light and dark, fit the ≤ 430 px column with no horizontal overflow, and never cover the verdict cards permanently.
- **FR-013**: The banner, toast and prompt MUST be accessible: announced to assistive technology, actions as real labelled buttons, reachable by keyboard.
- **FR-014**: Only forecast data and the app's own files may be cached; no new data about the user may be stored or sent beyond what the app already keeps (saved position, theme).
- **FR-015**: Offline, update and install behaviour MUST be covered by automated tests that use no real network, including an end-to-end check that the production build opens offline with the last forecast.
- **FR-016**: When offline and no forecast is cached for the current position, System MUST show the most recently cached forecast from any position, with the age banner.
- **FR-017**: A cached forecast MUST be shown only while it still covers today in the location's time zone; past days MUST be left out of the day strip and Other Days. When no cached day covers today, System MUST show the error state.
- **FR-018**: When the update toast is visible, the install prompt MUST NOT be shown at the same time.

## Out of Scope

- Push notifications, background sync and periodic background refresh.
- Offline place-name (city) caching beyond the existing per-visit cache.
- A custom install guide for browsers that do not offer installation (for example iOS Safari).
- Changes to verdict rules or thresholds.
- City search or manual location (excluded product-wide).
- Accounts, server-side storage, analytics.
- The broader loading/error-state redesign and accessibility audit (other P4 tasks).

## Success Criteria

- **SC-001**: After one online visit, the production build opens on the home page with the last forecast with the network disabled, on both e2e device profiles.
- **SC-002**: Whenever a cached forecast is shown offline, the age banner is visible and its age is correct to the minute.
- **SC-003**: After a new deployment, a user with the app open sees the update toast and is on the new version after one tap on "Reload".
- **SC-004**: On a supporting browser, a user can install the app from the in-app prompt in two taps (Install, then confirm).
- **SC-005**: With a connection, the home page shows a forecast (cached or fresh) without waiting for the network when a cached one exists.
- **SC-006**: All new UI passes keyboard and screen-reader checks and stays legible in both themes.

## Clarifications

### Session 2026-10-21

- Q: Offline, the location refresh moves the user to a new ~1 km cell with no cached forecast. What does the home page show? → A: The most recently cached forecast (previous cell) with the "Updated X ago" banner (FR-016).
- Q: Is there a maximum age for a cached forecast offline? → A: No fixed age; it is shown while it still covers today, past days dropped; otherwise the error state (FR-017).
- Q: Update toast and install prompt at the same time? → A: Update toast wins; the install prompt waits (FR-018).
- Q: When does the install prompt first appear? → A: From the second visit on `/home`, never on the first (FR-010, Story 4).

### Checklist 2026-10-21

- CHK001 [Clarity] Banner age wording defined: "just now", "N min ago", "N h ago", "N days ago" (FR-005).
- CHK002 [Consistency] Banner shows only when offline or after a failed refresh, never while a refresh is in flight (FR-005).
- CHK003 [Completeness] Update check timing: on launch, on return to foreground, at most hourly while open (FR-008).
- CHK004 [Clarity] Install-prompt dismissal is remembered with no expiry (FR-010).
