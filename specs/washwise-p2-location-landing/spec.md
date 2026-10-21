# Feature Specification: WashWise P2 · Location & Landing

**Created**: 2026-10-21
**Status**: Draft
**Source**: Linear COH-7 (Epic COH-5), sub-issues COH-19 – COH-22 (tasks 2.1 – 2.4)

## Overview

WashWise always advises for the place the user is standing, so it needs the device's current location before it can show anything. This phase adds the ability to find that location (and remember it), a landing page that asks for permission and explains every way the request can go wrong, a place name for the location pill, and a guard that lets returning users skip the landing page entirely.

## User Stories

### Story 1 — Know where the user is (Priority: P1)

The app can ask the device for its current position, report clearly what state the request is in, and remember the last known position so it is available the next time the app opens. The states are: not asked yet, asking, granted, denied, permanently blocked, position unavailable, timed out, and not supported (including pages not served securely).

**Why this priority**: Every other P2 story and all of P3 depend on a trustworthy location and a clear permission state.

**Acceptance Criteria**:

1. **Given** the user has not been asked yet and the browser does not already block the site, **When** the app starts, **Then** the state is "idle" and no permission prompt appears until the app requests location. If the browser already blocks the site, the state is "permanently blocked" from the start.
2. **Given** the app requests location, **When** the browser is waiting for the user or the device, **Then** the state is "requesting".
3. **Given** the user allows location and the device reports a position, **When** the request completes, **Then** the state is "granted" and the coordinates are available.
4. **Given** the user refuses the prompt, **When** the request completes, **Then** the state is "denied".
5. **Given** the browser reports that location access is blocked for the site and cannot be asked again, **When** the state is determined, **Then** it is "permanently blocked", distinct from "denied".
6. **Given** the device cannot determine a position, **When** the request completes, **Then** the state is "unavailable".
7. **Given** the device does not answer within the time limit (FR-005), **When** the limit passes, **Then** the state is "timeout".
8. **Given** the browser has no location support, or the page is not served over a secure connection, **When** the app starts, **Then** the state is "unsupported" and no request is attempted.
9. **Given** a position was obtained on a previous visit, **When** the app loads, **Then** the last coordinates are available immediately, before any new request finishes.
10. **Given** each state above, **When** automated tests run, **Then** there is a passing test for it, with no real device or network involved.

### Story 2 — Landing page asks for location and handles every outcome (Priority: P1)

A first-time visitor sees a simple landing page with the logo, a one-line pitch and a "Use my location" button. Each state after that is a single-icon, single-label screen. There is no city search; the app only ever uses the current location.

| State                    | What the user sees                                                                |
| ------------------------ | --------------------------------------------------------------------------------- |
| Idle                     | Logo, short pitch, "Use my location" button                                       |
| Requesting               | Spinner, "Finding you…"                                                           |
| Denied                   | Error, "Try again" button                                                         |
| Permanently blocked      | Error, "Try again" button, hint "Enable location in your browser's site settings" |
| Unavailable / timeout    | Error, "Try again" button                                                         |
| Unsupported / not secure | Error, "Location isn't available in this browser", no button                      |

**Why this priority**: Without it no user can get past the front door to see a verdict.

**Acceptance Criteria**:

1. **Given** the landing page in the idle state, **When** it renders, **Then** the logo, pitch and "Use my location" button are shown.
2. **Given** the user presses "Use my location", **When** the request starts, **Then** the spinner and "Finding you…" are shown.
3. **Given** the request succeeds, **When** coordinates arrive, **Then** the user is taken to `/home`.
4. **Given** the state is denied, unavailable or timeout, **When** the page renders, **Then** an error and a "Try again" button are shown, and pressing it starts a new request.
5. **Given** the state is permanently blocked, **When** the page renders, **Then** the "Try again" button and the site-settings hint are shown together.
6. **Given** the state is unsupported, **When** the page renders, **Then** the message "Location isn't available in this browser" is shown with no button.
7. **Given** any state, **When** the page is viewed in light and dark themes, **Then** it uses the design tokens and stays legible in both.
8. **Given** any state, **When** it is read by assistive technology, **Then** icons are labelled or hidden as decorative, errors are announced, and every action is a real button.
9. **Given** every state, **When** automated tests run, **Then** each one is rendered and verified.

### Story 3 — Returning users skip the landing page (Priority: P1)

A user who already allowed location opens the app and goes straight to the home page. The home page shows immediately using the saved coordinates while the app refreshes the position in the background. If permission is later revoked, they are sent back to the landing page.

**Why this priority**: Most visits are repeat visits; making them wait on a landing page or a fresh position fix would make the app feel slow.

**Acceptance Criteria**:

1. **Given** permission is granted and coordinates are saved, **When** the user opens any route, **Then** they reach `/home` without seeing the landing page.
2. **Given** the user lands on `/home` with saved coordinates, **When** the page renders, **Then** it renders at once from those coordinates without waiting for a new position.
3. **Given** the home page is showing, **When** a new position arrives in the background, **Then** the app uses it for later requests, and when the new position is within about 1 km of the old one there is no visible reload or flicker.
4. **Given** the user has never granted permission, **When** they open `/home` directly, **Then** they are redirected to `/`.
5. **Given** permission was revoked in the browser, **When** the user opens the app, **Then** they are redirected to `/` and see the matching landing state.
6. **Given** permission is revoked while the app is open, **When** the app next checks, **Then** the user is sent to `/`.
7. **Given** the guard's decisions, **When** automated tests run, **Then** first visit, returning with permission, and revoked permission are each covered.

### Story 4 — Place name for the location pill (Priority: P2)

Given coordinates, the app finds a human-readable place name (city, or the nearest locality or region) to show in the location pill. If the name cannot be found, the pill still shows something sensible.

**Why this priority**: The name is a nicety; verdicts work without it.

**Acceptance Criteria**:

1. **Given** coordinates inside a city, **When** the name is requested, **Then** the city name is returned.
2. **Given** coordinates with no city, **When** the name is requested, **Then** the locality is used, or the region if there is no locality.
3. **Given** the same coordinates were already looked up during the same visit, **When** the name is requested again, **Then** the earlier answer is reused without a new network request.
4. **Given** the lookup fails or returns no usable name, **When** the name is requested, **Then** "Your location" is shown and the app does not crash.
5. **Given** mocked responses, **When** automated tests run, **Then** every case above is verified without network access.

### Edge Cases

- What happens when the user dismisses the browser prompt without choosing? → Resolved by FR-001: treated as denied; "Try again" can ask again unless the browser has now blocked the site (FR-003).
- What happens when "Try again" is pressed while permanently blocked? → Resolved by FR-010a: it asks the browser again; if the site is still blocked the same screen stays, and if the user re-enabled location in the browser's settings the request succeeds.
- What happens when the saved coordinates are very old (the user travelled)? → Resolved by FR-006a: there is no age limit; the saved coordinates are used for the first render and replaced as soon as the background refresh succeeds.
- What happens when the background refresh fails or times out while the home page is showing saved coordinates? → Resolved by FR-013: the saved coordinates stay in use and no error is shown.
- What happens when permission is granted but the very first position fix times out? → Resolved by FR-005: the "timeout" state with "Try again" is shown.
- What happens when saved data is missing, corrupt or the device blocks saving? → Resolved by FR-007: the app behaves as a first visit and does not crash.
- What happens when the user reloads on `/home` with permission granted? → Resolved by FR-012: they stay on `/home`.
- What happens when the place-name service is slow or offline? → Resolved by FR-016: "Your location" is shown until a name arrives; the home page is never blocked by it.

## Functional Requirements

- **FR-001**: System MUST expose the location request state as one of: idle, requesting, granted, denied, permanently blocked, unavailable, timeout, unsupported.
- **FR-002**: System MUST NOT ask the device for location until the user takes an action, except to refresh in the background when permission is already granted.
- **FR-003**: System MUST distinguish "permanently blocked" from "denied" using the browser's permission status.
- **FR-004**: System MUST treat a browser without location support, or a page not served securely, as "unsupported" and make no request.
- **FR-005**: System MUST treat a position request with no answer after 10 seconds (the time spent waiting for the user to answer the permission prompt does not count) as "timeout".
- **FR-006**: System MUST save the last obtained coordinates on the device, rounded to about 1 km (all the precision the forecast uses), and restore them on load.
- **FR-006a**: Saved coordinates MUST have no expiry. They are used for the first render and replaced when a newer position is obtained.
- **FR-007**: System MUST tolerate missing, unreadable or unwritable saved data by behaving as a first visit.
- **FR-008**: System MUST provide a landing page at `/` showing the layout for each state in Story 2, using only the existing design tokens, in light and dark themes.
- **FR-009**: The landing page MUST NOT offer city search or manual location entry.
- **FR-010**: The landing page MUST show the site-settings hint next to "Try again" when permanently blocked, and MUST show no action when unsupported.
- **FR-010a**: Pressing "Try again" MUST ask the browser for the position again, whatever the error state. If the browser still blocks the site, the blocked screen stays; if the user has since allowed location, the request succeeds.
- **FR-011**: System MUST navigate to `/home` when a position is obtained from the landing page.
- **FR-012**: System MUST send users with permission already granted and saved coordinates directly to `/home`, rendering from the saved coordinates immediately.
- **FR-013**: System MUST refresh the position in the background when the home page opens with permission granted, without blocking rendering, and keep the saved coordinates if the refresh fails.
- **FR-014**: System MUST redirect to `/` any visit to `/home` where permission is not granted or no coordinates are available, and when permission is revoked.
- **FR-015**: System MUST provide a place name for given coordinates: city, else locality, else region, else "Your location".
- **FR-016**: System MUST reuse a place name looked up for the same coordinates, and MUST NOT block or break the page when the lookup fails.
- **FR-017**: Icons on the landing page MUST have accessible labels when meaningful and be hidden from assistive technology when decorative; error states MUST be announced.
- **FR-018**: Location and place-name logic MUST be covered by automated tests that never use a real device or the network.

## Out of Scope

- City search or manually chosen locations (excluded product-wide).
- The location pill's visual design and placement on the home page (P3); this phase only supplies the name.
- The theme toggle (P3).
- Final loading/error polish, offline behaviour and the full accessibility audit (P4).
- An "install the app" hint on the landing page.
- Tracking the user as they move, or any continuous location watching.
- User accounts, analytics, or sending the location to any server of our own.

## Success Criteria

- **SC-001**: Each of the eight location states has at least one passing automated test.
- **SC-002**: Each of the six landing page states renders its specified content, in both light and dark themes, verified by tests or screenshots.
- **SC-003**: A returning user with permission and saved coordinates reaches a rendered `/home` without the landing page ever appearing, 100% of the time in tests.
- **SC-004**: A user with revoked permission is redirected to `/` 100% of the time in tests.
- **SC-005**: A failed place-name lookup never prevents the home page from rendering; "Your location" is shown instead.
- **SC-006**: From first tap on "Use my location" to the home page, a user who allows location needs no further input.

## Clarifications

### Session 2026-10-21 (resolved during planning; recommended defaults, change them if you disagree)

- Q: How long should the app wait for a position before showing "timeout"? → A: 10 seconds, matching the forecast timeout (FR-005).
- Q: What does "Try again" do when the site is permanently blocked? → A: It asks the browser again; the blocked screen stays if the browser still refuses, and the request succeeds if the user has re-enabled location (FR-010a).
- Q (analysis fixes): Story 1 criterion 1 now covers a site the browser already blocks; Story 3 criterion 3 limits "no flicker" to moves under about 1 km; Story 4 criterion 3 says "during the same visit".
- Q: Do saved coordinates expire? → A: No. They render the home page at once and are replaced by the background refresh; they are stored rounded to about 1 km (FR-006, FR-006a).
