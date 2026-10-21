# Feature Specification: WashWise P3 · Home Page Sections

**Created**: 2026-10-21
**Status**: Draft
**Source**: Linear COH-8 (Epic COH-5), sub-issues COH-23 – COH-28 (tasks 3.1 – 3.6)

## Overview

The home page is where WashWise answers its question. This phase builds every section of the Figma "Homepage" frame (header, "Should you wash?" day strip, Laundry and Car Wash verdict cards, rain chance chart, Other Days list) and assembles them on `/home`, so that picking a day updates the verdicts and the chart for that day. It also adds the theme toggle and the tap-to-refresh location pill.

## User Stories

### Story 1 — See today's verdicts at a glance (Priority: P1)

A user opens the home page and sees two cards, Laundry and Car Wash. Each shows a three-state verdict (Go Wash / Caution / Not yet), its sub-label and weather pills (for example "Dries in ~2.5 hrs", "Partly cloudy", "Dries tomorrow"). The card colors follow the verdict: green, amber or red, in both themes.

**Why this priority**: The verdict is the product. Without these cards the page has no answer.

**Acceptance Criteria**:

1. **Given** a forecast for the user's location, **When** the home page renders, **Then** a Laundry card and a Car Wash card are shown, each with verdict word, sub-label and pills.
2. **Given** a Go Wash, Caution or Not yet result, **When** the card renders, **Then** it uses the matching green, amber or red tokens in light and dark.
3. **Given** the verdict engine's output, **When** the pills are shown, **Then** the drying pill ("Dries in ~2.5 hrs" / "Dries tomorrow") comes from the verdict engine's output and the condition pill ("Partly cloudy") from the forecast's weather code, with no separate verdict logic in the card.
4. **Given** a verdict of "unavailable", **When** the card renders, **Then** it shows a neutral "Verdict unavailable" state instead of a verdict.
5. **Given** the card, **When** it is read by assistive technology, **Then** the verdict, sub-label and pills are available as text, and weather icons are labelled or hidden as decorative.

### Story 2 — Pick a day with the 6-day strip (Priority: P1)

Under the title "Should you wash?" a strip of six days (Today, then weekday and date for each following day) lets the user choose a day. The selected day is clearly marked and drives the verdict cards and the rain chart. Days come from the forecast, in the location's local time zone.

**Why this priority**: Planning ahead is the main reason to return to the app, and the strip is the control for it.

**Acceptance Criteria**:

1. **Given** a forecast, **When** the strip renders, **Then** it shows six days: "Today" first, then weekday and date for each next day, in the location's local time zone.
2. **Given** the page opens, **When** the strip renders, **Then** Today is selected.
3. **Given** the user taps or presses Enter/Space on another day, **When** the selection changes, **Then** that day is marked as selected and the cards and chart show that day.
4. **Given** keyboard-only use, **When** the user tabs through the strip, **Then** every day is reachable, the focus is visible, and the selected day is announced as selected.
5. **Given** the selected day is not Today, **When** the Laundry and Car Wash cards render, **Then** they show that day's verdicts (computed the way the Other Days list does for that day).

### Story 3 — See when rain is likely (Priority: P1)

A rain chance chart shows hourly rain-probability bars. For Today it shows the next 5 hours from now; for any other day it shows the 12 PM to 4 PM window. Every bar has its percentage and hour label.

**Why this priority**: It shows the "why" behind the verdict and is part of the main page.

**Acceptance Criteria**:

1. **Given** Today is selected, **When** the chart renders, **Then** it shows the next 5 hours starting from the current hour.
2. **Given** another day is selected, **When** the chart renders, **Then** it shows the hourly bars for 12 PM to 4 PM of that day.
3. **Given** rain probabilities, **When** bars render, **Then** a higher chance gives a darker/more prominent rain-scale color and a taller fill, and each bar shows its percentage and hour.
4. **Given** the chart, **When** it is read by assistive technology, **Then** a text alternative gives each hour and its percentage.
5. **Given** an hour with a missing value, **When** the chart renders, **Then** that hour is shown as unavailable and not as 0%.

### Story 4 — Look ahead with the Other Days list (Priority: P2)

A list of the upcoming days (the strip's days after Today, so up to 5 rows) shows a Yes / Maybe / Wait marker with an icon for each activity, Laundry and Car Wash, taken from the verdict engine (Caution becomes Maybe). A day whose verdict is unavailable shows "—".

**Why this priority**: A quick look-ahead is useful, but the strip and cards already cover the core need.

**Acceptance Criteria**:

1. **Given** the forecast, **When** the list renders, **Then** each upcoming day has a marker of Yes, Maybe, Wait or "—".
2. **Given** Go Wash, Caution, Not yet or unavailable, **When** the marker is chosen, **Then** it is Yes, Maybe, Wait or "—" respectively, with a distinct icon per marker.
3. **Given** the marker, **When** it is read by assistive technology, **Then** the day, the activity and the marker are read as text.

### Story 5 — Header, location pill and theme toggle (Priority: P2)

The header shows the WashWise logo (wordmark), a location pill with the current city, and a Sun/Moon toggle in the upper right. Tapping the pill asks for the location again and refreshes the forecast, with a small spinner while it works. The toggle switches between light and dark; by default the app follows the system setting, and a chosen theme is remembered.

**Why this priority**: Valuable, but the page already gives an answer without it.

**Acceptance Criteria**:

1. **Given** the home page, **When** the header renders, **Then** it shows the logo, the pill with the place name (or "Your location" until one is known), and the toggle.
2. **Given** the user taps the pill, **When** the refresh runs, **Then** a spinner shows in the pill until it ends, and the forecast reflects the new position afterwards.
3. **Given** the refresh fails, **When** it ends, **Then** the previous position and forecast stay on screen and the pill returns to normal.
4. **Given** no saved choice, **When** the app opens, **Then** the theme matches the system setting.
5. **Given** the user toggles the theme, **When** they reload the app, **Then** the chosen theme is applied.
6. **Given** the app loads in dark mode, **When** the first screen paints, **Then** there is no flash of the light theme.
7. **Given** the toggle, **When** it is read by assistive technology, **Then** it has a label saying what it will do (for example "Switch to dark mode").

### Story 6 — Home page assembly (Priority: P1)

All sections are composed on `/home` in the Figma order, at 393 px and in the ≤ 430 px column, in light and dark. While the forecast loads or fails, the page shows a sensible state instead of breaking.

**Why this priority**: Without the assembled page, the individual sections are not usable.

**Acceptance Criteria**:

1. **Given** the user is on `/home`, **When** the page renders, **Then** the order is header, title and day strip, verdict cards, rain chart, Other Days.
2. **Given** the user changes the selected day, **When** the page updates, **Then** the cards and chart update together.
3. **Given** the page at 393 px width, **When** compared with the Figma Homepage frame, **Then** section order, token-based styling and spacing match it, with no horizontal overflow, as confirmed by a reviewed screenshot of each section.
4. **Given** the saved position moves to a different forecast cell, **When** the new forecast loads, **Then** the previous forecast stays visible until it arrives.
5. **Given** the forecast is loading for the first time, **When** the page renders, **Then** a loading state is shown in place of the verdict sections.
6. **Given** the forecast request fails, **When** the page renders, **Then** an error with a "Try again" action is shown and the app does not crash.
7. **Given** automated tests run, **When** they cover the page, **Then** day selection, theme toggle, pill refresh and the loading/error states each have a passing test, with no network.

### Edge Cases

- What happens when the forecast has fewer than six days? → The strip shows the days available.
- What happens when it is late in the day and fewer than 5 hours remain for Today's chart? → Resolved by FR-005: the chart still shows 5 bars, continuing into the next day's hours (clarification below). It shows fewer only when the forecast itself ends.
- What happens when the device's time zone differs from the location's? → The days, "Today" and the chart hours follow the location's local time zone.
- What happens when saved theme data is unreadable or storage is blocked? → The app follows the system setting and does not crash.
- What happens when the user taps the pill repeatedly? → Only one refresh runs at a time.
- What happens when the place name is slow or unavailable? → "Your location" is shown (P2 behaviour); the page is never blocked.

## Functional Requirements

- **FR-001**: System MUST show a Laundry card and a Car Wash card with the verdict, sub-label and weather pills for the selected day, using verdict engine output only.
- **FR-002**: System MUST color the cards with the green, amber or red design tokens in both themes, and show a neutral state when a verdict is unavailable.
- **FR-003**: System MUST show a day strip of six days (Today, then weekday and date) from the forecast, in the location's local time zone, with Today selected on load.
- **FR-004**: System MUST make the day strip operable by keyboard and show the selected day visibly and to assistive technology.
- **FR-005**: System MUST show hourly rain-chance bars: the next 5 hours from now for Today (continuing into the next day's hours late at night, so there are always 5 while the forecast lasts), and 12 PM to 4 PM for other days, each with its percentage and hour label.
- **FR-006**: System MUST give the rain chart a text alternative listing each hour and its percentage.
- **FR-007**: System MUST list upcoming days with a Yes / Maybe / Wait marker and icon from the verdict engine, and "—" when unavailable.
- **FR-008**: System MUST show a header with the logo, a location pill and a Sun/Moon theme toggle.
- **FR-009**: Tapping the location pill MUST request the device location again and refresh the forecast, showing a spinner while it runs and keeping the previous data if it fails.
- **FR-010**: The theme MUST follow the system setting by default, remember an explicit choice on the device, tolerate unreadable storage, and apply before first paint so there is no flash.
- **FR-011**: The theme toggle MUST have an accessible label that states its action.
- **FR-012**: System MUST compose the sections on `/home` in the Figma order and update the cards and chart together when the selected day changes.
- **FR-013**: System MUST show a loading state while the first forecast loads, a recoverable error state if it fails, and keep the previous forecast visible while a new one loads.
- **FR-014**: All styling MUST use the existing design tokens and stay legible in light and dark; no city search or manual location entry may be added.
- **FR-015**: Icons that carry meaning MUST have accessible labels; decorative icons MUST be hidden from assistive technology.
- **FR-016**: Section and page behaviour MUST be covered by automated tests that use no real device or network.

## Out of Scope

- City search or manually chosen locations (excluded product-wide).
- Changes to verdict thresholds or rules (P1 verdict engine).
- Offline support, service-worker behaviour and the final loading/error polish and full accessibility audit (P4).
- Desktop two-column layout (P5).
- Notifications, accounts, analytics.
- More than six days in the strip.

## Success Criteria

- **SC-001**: A user with saved location sees both verdicts for Today on `/home` without further input.
- **SC-002**: Selecting any of the six days updates both cards and the chart in a single action, 100% of the time in tests.
- **SC-003**: Every verdict state (Go Wash, Caution, Not yet, unavailable) renders correctly in both themes, verified by tests or screenshots.
- **SC-004**: With no saved theme the page matches the system setting, and a chosen theme persists across reloads with no visible flash.
- **SC-005**: The assembled page at 393 px matches the Figma Homepage frame in section order, token styling and spacing, with no horizontal overflow, confirmed by reviewed screenshots in both themes.
- **SC-006**: Every interactive element (days, pill, toggle, retry) is reachable and usable by keyboard.

## Clarifications

### Session 2026-10-21 (resolved during planning; recommended defaults, change them if you disagree)

- Q: Late in the day, what does Today's rain chart show when fewer than 5 hours remain? → A: Always 5 bars, rolling into the next day's hours; hour labels carry a day cue after midnight (FR-005, Story 3 criterion 1).
