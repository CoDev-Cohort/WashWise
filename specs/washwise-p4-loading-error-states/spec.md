# Feature Specification: WashWise P4 · Loading Skeletons and Error/Retry States

**Created**: 2026-10-21
**Status**: Draft
**Source**: Linear COH-29 (task 4.1, parent COH-9). Blocked by 3.6 (COH-28, done). Can run in parallel with 4.2 – 4.4.

## Overview

P3 gave the home page a single loading placeholder and a single error message. This task finishes those states. Each section gets its own skeleton, shaped like the content it stands in for, so nothing jumps when the forecast arrives. Every error uses one shared pattern (one icon, one label, a "Try again" action), names what went wrong, and retries the request. A failed background update no longer goes unnoticed: the old forecast stays, with a small notice offering a retry.

## User Stories

### Story 1 — See the page take shape while it loads (Priority: P1)

A user opens `/home` and the forecast isn't there yet. The header shows straight away. Below it, each section (day strip, Laundry and Car Wash cards, rain chart, Other Days) shows a placeholder with the same size and position as the real section. When the forecast arrives, each placeholder is replaced by its content and nothing on the page moves.

**Why this priority**: The first load is the first thing every visitor sees. A layout that jumps looks broken and can make people tap the wrong thing.

**Acceptance Criteria**:

1. **Given** the first forecast is loading, **When** the home page renders, **Then** the header is shown and each of the five sections below it shows its own placeholder, in the same order as the loaded page.
2. **Given** the placeholders are shown, **When** the forecast arrives, **Then** no section changes position or size (no layout shift) at 393 px and at 430 px width, in light and dark.
3. **Given** the placeholders are shown, **When** they are read by assistive technology, **Then** one "Loading forecast" status is announced for the whole page, and the placeholders themselves are not read out one by one.
4. **Given** the user prefers reduced motion, **When** placeholders are shown, **Then** they do not animate.
5. **Given** an older forecast is already on screen and a new one is loading (for example after the location moved), **When** the page renders, **Then** the older forecast stays and no placeholders are shown.

### Story 2 — Recover when the forecast can't load (Priority: P1)

The forecast fails on the first load. In place of the sections, the user sees one error: an icon, a label that says what went wrong, a short hint, and a "Try again" button. Pressing it asks for the forecast again, shows the loading state, and then the forecast or the error again.

**Why this priority**: Without a working retry, a dropped connection leaves the user stuck on an error with no way out other than reloading.

**Acceptance Criteria**:

1. **Given** the first forecast request fails, **When** the page renders, **Then** the header stays usable and an error is shown in place of the sections, with one icon, one label, a hint and a "Try again" button.
2. **Given** the error is shown, **When** the user presses "Try again", **Then** the forecast is requested again and the loading state is shown while it runs.
3. **Given** the retry succeeds, **When** the forecast arrives, **Then** the error is replaced by the loaded page.
4. **Given** the retry fails, **When** it ends, **Then** the error is shown again with the label for the new cause.
5. **Given** the failure cause, **When** the label is chosen, **Then** it follows FR-005: offline, too slow, service problem, or a generic fallback.
6. **Given** the error appears, **When** assistive technology is running, **Then** the error is announced at once, the icon is hidden as decorative, and "Try again" is reachable and usable by keyboard.

### Story 3 — Know when the forecast couldn't be updated (Priority: P2)

The user already has a forecast on screen. A background update (when the app comes back to the foreground, after the location moved, or after tapping the location pill) fails. The forecast on screen stays. A small notice above the sections says the forecast couldn't be updated, using the same icon and label pattern as Story 2, with a "Try again" button. When an update succeeds, the notice goes away.

**Why this priority**: The page still gives an answer, but the user should know it may be out of date.

**Acceptance Criteria**:

1. **Given** a forecast is on screen, **When** a background update fails, **Then** the forecast stays and a notice says it couldn't be updated, with a "Try again" button.
2. **Given** the notice is shown, **When** the user presses "Try again", **Then** the forecast is requested again and the notice shows that it is retrying (the button is disabled while it runs).
3. **Given** the notice is shown, **When** any update succeeds, **Then** the notice disappears.
4. **Given** the notice appears or disappears, **When** it does, **Then** the sections below do not jump unexpectedly: the notice takes its own space above the sections rather than covering them.
5. **Given** the notice appears, **When** assistive technology is running, **Then** it is announced politely (it doesn't interrupt), and its icon is decorative.

### Story 4 — Place name never blocks the page (Priority: P3)

The place-name lookup fails or is slow. The location pill shows "Your location" as it does today, and no error is shown for it. Tapping the pill asks for the location again, which also tries the name again.

**Why this priority**: This is already how P2 works. This story just confirms it stays that way and stays consistent with the new error states.

**Acceptance Criteria**:

1. **Given** the place-name lookup fails, **When** the header renders, **Then** the pill shows "Your location" and no error or notice is shown for it.
2. **Given** the pill shows "Your location" after a failure, **When** the user taps the pill, **Then** the location is requested again and the place name is looked up again.
3. **Given** the place-name lookup is slow, **When** the forecast arrives first, **Then** the page renders fully without waiting for the name, and the pill width change doesn't move the sections below the header.

### Edge Cases

- What happens when the device is offline on the first load? → The error label is the offline one (FR-005). "Try again" still works; it fails again until the connection comes back.
- What happens when the user presses "Try again" several times quickly? → Only one request runs at a time; extra presses do nothing until it ends.
- What happens when the forecast loads but a single verdict is unavailable? → Not an error: the P3 "Verdict unavailable" and "—" states apply.
- What happens when the forecast loads with fewer than six days? → The strip shows the days available (P3). The skeleton always shows six day placeholders; a strip with fewer days is allowed to be narrower, as that change is horizontal and doesn't move other sections.
- What happens when both the forecast and the place name fail? → Only the forecast error is shown; the pill shows "Your location".
- What happens when a background update fails, then the location moves to a new cell? → The notice stays until an update succeeds; the old forecast stays until the new one arrives (P3 FR-013).
- What happens when the response arrives but its content is unusable? → Treated as a failure, with the generic label.

## Functional Requirements

- **FR-001**: On the first forecast load, the system MUST show the real header and one placeholder per section (day strip, Laundry card, Car Wash card, rain chart, Other Days), in the loaded page's order.
- **FR-002**: Each placeholder MUST take the same size and position as the section it replaces, so that swapping a placeholder for its section causes no layout shift at 393 px and 430 px widths in either theme.
- **FR-003**: Placeholders MUST be announced as a single "Loading forecast" status, be hidden individually from assistive technology, and not animate when the user prefers reduced motion.
- **FR-004**: Every forecast error state and notice MUST use one shared pattern: one decorative icon, one label, an optional hint, and one "Try again" action. The first-load error and the background-update notice MUST both use it.
- **FR-005**: The error label MUST name the cause:
  - Offline or connection dropped → "You're offline"
  - No answer in time → "The forecast is taking too long"
  - Service error → "The forecast service is having trouble"
  - Anything else, including an unusable response → "We couldn't load the forecast"
- **FR-006**: "Try again" MUST request the forecast again, show progress while the request runs, ignore further presses until it ends, and update the state to the result.
- **FR-007**: When a background update fails while a forecast is shown, the system MUST keep that forecast and show a non-blocking notice using the FR-004 pattern ("Couldn't update the forecast") with a "Try again" action. The notice MUST disappear when an update succeeds. If the forecast on screen is for a previous location (the new location's forecast failed), the notice MUST say so and the location pill MUST show that previous location's name, so the pill and the forecast always agree.
- **FR-008**: The first-load error MUST be announced at once to assistive technology; the background-update notice MUST be announced politely.
- **FR-009**: The place-name lookup MUST keep its silent fallback: "Your location" on failure, no error state, retried when the user taps the location pill.
- **FR-010**: All loading and error states MUST use the existing design tokens and stay legible in light and dark; any new value MUST be added as a design token and documented.
- **FR-011**: Loading, first-load error, retry, each FR-005 cause, and the background-update notice MUST be covered by automated tests that use no real network; no-layout-shift MUST be verified at 393 px and 430 px in a real browser.

## Out of Scope

- Offline support, cached forecasts and service-worker behaviour (task 4.2).
- Accessibility audit of the whole app and deployment (other P4 tasks).
- Changing retry counts, timeouts or caching rules (they stay as in P1).
- A visible error or retry button for the place name.
- The landing page's location states (P2) and the app-wide crash fallback (P1); they keep their own screens.
- City search or manual location (excluded product-wide).

## Success Criteria

- **SC-001**: Swapping placeholders for loaded content causes no measurable layout shift (cumulative layout shift of 0 for the sections below the header) at 393 px and 430 px, in both themes.
- **SC-002**: In tests, pressing "Try again" after a failed first load sends a new forecast request 100% of the time, and the page shows the result.
- **SC-003**: Each of the four FR-005 causes shows its own label, with the same icon and layout, verified by tests.
- **SC-004**: A failed background update never removes the forecast from the screen, and always shows the notice, in tests.
- **SC-005**: A failed place-name lookup never shows an error, in tests.
- **SC-006**: Every "Try again" action is reachable and usable by keyboard, and every error is announced to assistive technology.

## Clarifications

### Session 2026-10-21

- Q: When the place-name lookup (BigDataCloud) fails, what should the location pill do? → A: Silent fallback, as today: "Your location", retried when the pill is tapped (FR-009, Story 4).
- Q: If a background refresh fails while an older forecast is on screen, what should happen? → A: Keep the forecast and show a non-blocking notice with "Try again" (FR-007, Story 3).
- Q: Should the forecast error label depend on the cause? → A: Yes. Same layout for every error, with a label per cause: offline, too slow, service problem, generic (FR-005).
