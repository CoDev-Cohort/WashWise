# Feature Specification: WashWise P1 · Foundation

**Created**: 2026-10-20
**Status**: Draft
**Source**: Linear COH-6 (Epic COH-5), sub-issues COH-11 – COH-18

## Overview

WashWise is a mobile-first web app that tells people whether today is a good day to **do laundry** or **wash the car**, based on the weather where they are right now. This foundation phase gives every later phase what it needs: a working app skeleton, the visual design language (light and dark), forecast retrieval, the verdict rules that turn weather into advice, a weather icon set, the ability to install the app on a phone, and a shared documentation set (README, AI-agent guide, design and infrastructure docs) that keeps people and agents aligned.

## User Stories

### Story 1 — Trustworthy laundry and car-wash verdicts (Priority: P1)

A person wants a simple answer, not raw weather data. Given a forecast for their location, the system produces one of three verdicts for laundry and for car washing — **Go Wash** (green), **Caution** (amber), **Not yet** (red) — each with a short sub-label that explains it. For laundry, it also estimates how long washing will take to dry.

**Why this priority**: The verdict is the product's core value. Every screen in later phases displays its output.

**Acceptance Criteria**:

1. **Given** the next 6 daylight hours have rain probability < 30% and estimated drying time ≤ 4 h, **When** the laundry verdict is computed, **Then** it is **Go Wash** with sub-label "Good to go".
2. **Given** rain probability is 30–60% in the laundry window, **When** the laundry verdict is computed, **Then** it is **Caution** with sub-label "Dry indoors as backup".
3. **Given** rain probability < 30% but estimated drying time is > 4 h and ≤ 8 h, **When** the laundry verdict is computed, **Then** it is **Caution** with sub-label "Slow drying day".
4. **Given** rain probability > 60% in the laundry window, or estimated drying time > 8 h, or the washing will not dry before dark, **When** the laundry verdict is computed, **Then** it is **Not yet** with sub-label "Better to wait".
5. **Given** the next 48 h have rain probability < 30% and total rain < 0.5 mm, **When** the car-wash verdict is computed, **Then** it is **Go Wash** with sub-label "Good to go".
6. **Given** the next 48 h have rain probability 30–60%, or light rain (≥ 0.5 mm and < 2 mm) is expected in hours 24–48, or ≥ 2 mm is expected only in hours 24–48, **When** the car-wash verdict is computed, **Then** it is **Caution** with sub-label "Rain likely tomorrow". If instead 0.5 mm to < 2 mm is expected in the first 24 h (and no Not yet condition applies), it is **Caution** with sub-label "Light rain expected today"; this sub-label takes precedence when both apply.
7. **Given** rain probability > 60%, or ≥ 2 mm of rain within the first 24 h, **When** the car-wash verdict is computed, **Then** it is **Not yet** with sub-label "Rain will undo it".
8. **Given** temperature, humidity, wind and cloud cover, **When** drying time is estimated, **Then** the result is a number of hours, or "tomorrow" when washing cannot dry before dark.
9. **Given** a verdict for a future day, **When** it is shown in the "Other Days" list, **Then** Go Wash / Caution / Not yet map to **Yes / Maybe / Wait**.
10. **Given** less than 2 h of usable daylight remains today (including after dark), **When** the laundry verdict is computed, **Then** it assesses tomorrow's first 6 daylight hours instead, and the sub-label says the advice is for tomorrow: "Good to go tomorrow morning" (Go Wash), "Tomorrow: dry indoors as backup" or "Tomorrow: slow drying day" (Caution), "Better to wait — tomorrow looks wet" (Not yet).
11. **Given** more than 25% of the hours in a window are missing a required value, **When** the verdict is computed, **Then** the result is "Verdict unavailable".
12. **Given** the reference drying conditions below, **When** drying time is estimated, **Then** the result falls within the stated range:
    - 25 °C, 50% RH, 15 km/h wind, clear sky → about 2–3 h (Go Wash range)
    - 18 °C, 70% RH, 5 km/h wind, mostly cloudy → about 5–7 h (Caution range)
    - 10 °C, 90% RH, calm, overcast → more than 8 h, or "tomorrow" (Not yet range)
13. **Given** a verdict of "Verdict unavailable" for a future day, **When** it is shown in the Other Days list, **Then** a neutral "—" is shown instead of Yes / Maybe / Wait.
14. **Given** each rule boundary (exactly 30%, 60%, 4 h, 8 h, 0.5 mm, 2 mm), **When** the verdict is computed, **Then** the outcome matches the rule tables above, and an automated test covers that boundary.

### Story 2 — Forecast for the user's location (Priority: P1)

Given a latitude and longitude, the system retrieves a 7-day forecast in the location's local time zone, with hourly and daily values for: rain probability, rain amount, temperature, relative humidity, wind speed, cloud cover, weather condition code and whether it is day or night. The user never needs an account or API key.

**Why this priority**: Verdicts, icons and every home-screen section depend on this data.

**Acceptance Criteria**:

1. **Given** valid coordinates, **When** the forecast is requested, **Then** 7 days of hourly and daily data are returned, with times in the location's local time zone.
2. **Given** the forecast service is unavailable or returns an error, **When** the forecast is requested, **Then** the failure is reported to the caller in a form the UI can show, and the app does not crash.
3. **Given** a forecast was fetched recently, **When** the same location is requested again within 30 minutes, **Then** the cached result is reused without a new network request.
4. **Given** mocked forecast responses, **When** automated tests run, **Then** the data handling is verified without network access.

### Story 3 — App skeleton and navigation (Priority: P1)

A person who opens WashWise lands on a starting page (`/`, later the location-permission landing) and can reach the home page (`/home`). Content sits in a centered, phone-width column (≤ 430 px) on any screen. If something unexpected breaks, they see a friendly fallback instead of a blank page.

**Why this priority**: Every later feature plugs into this structure; developers cannot build or verify anything without it.

**Acceptance Criteria**:

1. **Given** the app is opened at `/`, **When** it loads, **Then** a placeholder landing page renders.
2. **Given** the app is opened at `/home`, **When** it loads, **Then** a placeholder home page renders.
3. **Given** an unexpected rendering error occurs, **When** the error is thrown, **Then** a fallback message with a way to recover (retry or reload) is shown instead of a blank screen.
4. **Given** any viewport width, **When** a page renders, **Then** content sits in a centered column no wider than 430 px.
5. **Given** a fresh checkout, **When** a developer runs the standard dev, build, lint, unit-test and end-to-end commands, **Then** each one succeeds, and the README documents them.

### Story 4 — Shared project documentation (Priority: P1)

Anyone joining the project — a developer, a designer, or an AI coding agent — finds one up-to-date set of documents explaining what WashWise is, how to run it, how it should be built, how it should look, and where it runs. The set is created with the scaffold. Sections that depend on later tasks start as clearly marked placeholders that name the task that fills them.

| Document                   | Covers                                                                                                                                                                                | Completed by                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| README                     | What the app is, prerequisites, setup, every project command, links to the other documents, third-party credits                                                                       | 1.1 (credits in 1.6)                                                         |
| CLAUDE.md (AI-agent guide) | Project overview, commands, folder layout, coding and testing conventions, product rules agents must respect (e.g. thresholds live only in the verdict configuration; no city search) | 1.1 → app structure in 1.3, verdict rules in 1.5; kept current by every task |
| DESIGN.md                  | Figma source, design tokens, typefaces, light and dark palettes with contrast ratios, verdict colors, icon usage, mobile column width                                                 | Outline in 1.1 → 1.2, 1.6, 1.8                                               |
| INFRASTRUCTURE.md          | External data services, caching and timeouts, installability, environments, hosting and deployment, automated checks                                                                  | Outline in 1.1 → 1.4, 1.7, P4                                                |

**Why this priority**: It ships with task 1.1, which everything else depends on. Without shared documentation, parallel work across 1.2–1.8 (by people or agents) drifts from the agreed rules.

**Acceptance Criteria**:

1. **Given** the scaffold is complete, **When** the repository root is inspected, **Then** README, CLAUDE.md, DESIGN.md and INFRASTRUCTURE.md exist with the sections listed above.
2. **Given** a section depends on a later task, **When** it is read before that task is done, **Then** it is marked as a placeholder that names the owning task.
3. **Given** the README, **When** it is read, **Then** it links to CLAUDE.md, DESIGN.md, INFRASTRUCTURE.md and this specification.
4. **Given** a fresh checkout, **When** every command listed in README and CLAUDE.md is run, **Then** each one succeeds.
5. **Given** a P1 task (1.2–1.8) is completed, **When** its work is reviewed, **Then** the document sections it owns are filled in and no longer marked as placeholders.

### Story 5 — Visual design language from Figma (Priority: P2)

The app uses the colors, corner radii, spacing, type scale and three typefaces (Fraunces, Plus Jakarta Sans, Barlow) from the Figma "Homepage" frame (393 × 852). These are defined once as named design tokens, so later screens match the design without hard-coded values.

**Why this priority**: Later phases need consistent styling, but nothing breaks functionally without it.

**Design source notes**: The Figma frame defines green (Go Wash) and red (Not yet) verdict colors but **no amber (Caution) set**. Caution colors are derived to match the green and red sets and labelled as derived in DESIGN.md. Figma's weather-pill text (4.5 px) and location-pill text (8 px) are below a legible size; the tokens raise them to at least 10 px, and DESIGN.md records the deviation.

**Acceptance Criteria**:

1. **Given** the Figma Homepage frame, **When** tokens are defined, **Then** every color, radius, spacing step and text style used in the frame has a named token.
2. **Given** a slow network, **When** the page loads, **Then** text appears straight away in a fallback font and switches to the brand font once it loads (no invisible text).
3. **Given** the dark theme is switched on, **When** tokens are resolved, **Then** every token switches to its dark value without per-component changes.

### Story 6 — Dark palette (Priority: P2)

Figma has no dark design, so a dark value is derived for every light token. Body text and the green/amber/red verdict colors stay easy to read in both themes.

**Why this priority**: The epic commits to dark mode (system default, user toggle in P3), but the palette can come after the light tokens.

**Acceptance Criteria**:

1. **Given** the light token set, **When** the dark palette is finished, **Then** every token has a dark value.
2. **Given** either theme, **When** text and verdict colors are checked against their backgrounds, **Then** they meet WCAG 2.1 AA contrast (4.5:1 for normal text, 3:1 for large text and non-text indicators).
3. **Given** the dark palette is finished, **When** it is reviewed, **Then** before/after screenshots of both themes are attached to the work item.

### Story 7 — Weather and UI icons (Priority: P2)

Each weather condition the forecast can report is shown with a matching icon, in a day or night version depending on the hour. Small cards and pills use static icons; the large hero icon is animated. General UI actions (theme toggle, location, laundry, car, confirm, retry) use one consistent icon set.

**Why this priority**: Icons communicate conditions at a glance, but verdict text works without them.

**Acceptance Criteria**:

1. **Given** any weather condition code the forecast service can return, **When** an icon is requested, **Then** a matching icon is returned, with a defined fallback for codes not in the map.
2. **Given** a day/night flag, **When** an icon is chosen for a condition that has day and night versions, **Then** the matching version is used.
3. **Given** an icon that carries meaning, **When** it renders, **Then** it has an accessible text label; purely decorative icons are hidden from assistive technology.
4. **Given** the user's device has reduced motion turned on, **When** the hero weather icon renders, **Then** the static version of the same icon is shown.
5. **Given** the weather icon set's license, **When** the app is distributed, **Then** the license is credited in the app or its documentation.

### Story 8 — Installable app (Priority: P3)

A person can add WashWise to their phone's home screen and launch it like an app, with the correct name, icon and theme color.

**Why this priority**: Nice for repeat use but not needed for the core verdict experience. Offline behaviour comes in P4 (task 4.2).

**Acceptance Criteria**:

1. **Given** the app is served over HTTPS, **When** the manifest is inspected in the browser's developer tools (e.g. Chrome DevTools → Application → Manifest), **Then** it reports no errors or warnings and all icons render.
2. **Given** the manifest, **When** its icons are inspected, **Then** 192 px, 512 px and maskable icons are present.
3. **Given** Android Chrome or iOS Safari, **When** the user chooses "Install" / "Add to Home Screen", **Then** the app installs and launches standalone with its name and icon.

### Edge Cases

- What happens when the remaining daylight is shorter than the 6 h laundry window (e.g. late afternoon) or it is already dark? → Resolved: with less than 2 h of usable daylight left, laundry is assessed for tomorrow's first 6 daylight hours, and the sub-label says so (see Clarifications).
- What happens when a value sits exactly on a threshold (30%, 60%, 4 h, 8 h, 0.5 mm, 2 mm)? → Resolved by FR-004b: 30% and 60% are Caution, 4 h is Go, 8 h is Caution, 0.5 mm leaves Go, and 2 mm in the first 24 h is Not yet.
- How does the system handle missing or null hourly values in the forecast (e.g. a gap in rain probability)? → Resolved by FR-004c: missing hours are skipped; if > 25% of a window's hours lack a required value, the result is "Verdict unavailable".
- What happens when the forecast service returns a weather code with no icon mapping? → Resolved by FR-015: a defined fallback icon is shown.
- How does the system handle locations in polar regions, where the sun may not set or rise on a given day? → Resolved by FR-004d: 24 h daylight counts as all daylight; a day with no daylight sends laundry straight to "Not yet".
- What happens when the forecast request is slow or times out? → Resolved by FR-008a: a request with no response after 10 s is treated as a failure.
- What does the user see if fonts fail to load entirely? → Resolved by FR-012: text stays readable in the fallback font.

## Functional Requirements

- **FR-001**: System MUST compute a laundry verdict (Go Wash / Caution / Not yet) with a sub-label from the forecast for the next 6 daylight hours plus the estimated drying time, using the rule table in Story 1. When less than 2 h of usable daylight remains today, the window MUST move to tomorrow's first 6 daylight hours, and the sub-label MUST say the advice is for tomorrow.
- **FR-002**: System MUST compute a car-wash verdict (Go Wash / Caution / Not yet) with a sub-label from the forecast for the next 48 hours, using the rule table in Story 1.
- **FR-003**: System MUST estimate laundry drying time from temperature, relative humidity, wind speed and cloud cover, returning either a number of hours or "tomorrow".
- **FR-003a**: The drying-time estimate MUST produce results within the ranges of the reference conditions in Story 1, criterion 12.
- **FR-004**: System MUST map Go Wash / Caution / Not yet to Yes / Maybe / Wait for the multi-day list.
- **FR-004a**: Wherever a rule refers to "rain probability" over a window (the laundry daylight window or the 48 h car-wash window), System MUST use the **highest** hourly rain probability within that window.
- **FR-004b**: Rule boundaries MUST give every input exactly one verdict:
  - Rain probability (laundry and car wash): Go < 30%; Caution 30–60% inclusive; Not yet > 60%.
  - Laundry drying time: Go ≤ 4 h; Caution > 4 h to ≤ 8 h; Not yet > 8 h or won't dry before dark.
  - Car-wash rain amount: Go needs < 0.5 mm total over 48 h; ≥ 2 mm within the first 24 h means Not yet; 0.5 mm to < 2 mm in hours 24–48, or ≥ 2 mm only in hours 24–48, means Caution.
  - Car-wash rain amount: 0.5 mm to < 2 mm in the first 24 h, with no other Not yet condition, means Caution with sub-label "Light rain expected today".
  - Any car-wash input that fails Go and meets no Not yet condition is Caution.
  - When several rules apply, the most severe verdict wins.
- **FR-004c**: When hourly values a rule needs are missing, System MUST skip those hours. For rain probability and amounts, skipped hours are left out of the max and the sums. For drying, time still passes during a skipped hour, which uses the drying rate of the nearest earlier available hour (or the next one if there is no earlier hour). If more than 25% of the hours in a window lack a required value, System MUST return **"Verdict unavailable"** for that activity instead of Go Wash / Caution / Not yet.
- **FR-004d**: "Usable daylight" MUST mean the period from sunrise to 1 hour before sunset at the user's location. If the sun does not set that day, the whole day counts as usable daylight. If the sun does not rise on the day being assessed, the laundry verdict MUST be **Not yet**. The switch-to-tomorrow rule (FR-001) runs first, so on a polar-night today the assessed day is tomorrow, and it is Not yet only if tomorrow also has no sunrise. "Dark", as in "won't dry before dark", means sunset; on a polar day it means the end of the day.
- **FR-004e**: In the Other Days list, "Verdict unavailable" MUST be shown as a neutral "—".
- **FR-004f**: For each future day in the Other Days list, System MUST apply the same rules with the window anchored to that day: laundry uses that day's first 6 usable-daylight hours, and car wash uses 48 h starting at that day's sunrise. If the 48 h window runs past the end of the forecast, the available hours are used. Hours past the end of the forecast do not count as "missing" under FR-004c.
- **FR-004g**: The laundry window MUST be exactly 6 hours of usable daylight, cut short if usable daylight ends sooner. The window length (6 h) and the switch-to-tomorrow cutoff (2 h) MUST live in the central threshold configuration (FR-005).
- **FR-005**: All verdict thresholds MUST be defined in one central configuration, so they can be tuned without changing the rule logic.
- **FR-006**: Verdict logic MUST be independent of the user interface and fully covered by automated tests at every rule boundary.
- **FR-007**: System MUST retrieve a 7-day hourly and daily forecast (rain probability, rain amount, temperature, humidity, wind speed, cloud cover, weather code, day/night) for given coordinates, in the location's local time zone, without requiring credentials.
- **FR-008**: System MUST reuse a fetched forecast for 30 minutes. After that it MUST refresh the next time the app is opened or brought back into focus, keep showing the previous data until the new data arrives, and report retrieval failures to the UI without crashing.
- **FR-008a**: A forecast request with no response after 10 seconds MUST be treated as a retrieval failure.
- **FR-009**: System MUST provide two routes: a landing page at `/` and a home page at `/home`.
- **FR-010**: System MUST show a recoverable fallback screen when an unexpected error occurs, instead of a blank page.
- **FR-011**: System MUST present all content in a centered column no wider than 430 px.
- **FR-012**: System MUST define Figma's colors, radii, spacing and type scale as named, themeable design tokens, and load the three brand typefaces without blocking text rendering.
- **FR-013**: System MUST provide a dark value for every design token and switch the whole token set when dark mode is active.
- **FR-014**: Text and verdict colors MUST meet WCAG 2.1 AA contrast in both light and dark themes.
- **FR-015**: System MUST map every forecast weather code to a weather icon, choosing day or night versions from the day/night flag, with a fallback icon for unknown codes.
- **FR-016**: System MUST provide static weather icons for small elements and an animated weather icon for the hero display. When the user's device has reduced motion turned on, the hero MUST show the static version of the same icon.
- **FR-017**: Meaningful icons MUST have accessible labels; decorative icons MUST be hidden from assistive technology.
- **FR-018**: System MUST credit the weather icon set's license.
- **FR-019**: System MUST provide a valid web app manifest with name, theme colors and 192 px, 512 px and maskable icons, so the app can be installed on Android Chrome and iOS Safari.
- **FR-020**: The project MUST offer documented, working commands for development, production build, linting, unit tests and end-to-end tests, with strict type checking on.
- **FR-021**: The project MUST include a README, an AI-agent guide (CLAUDE.md), a design document (DESIGN.md) and an infrastructure document (INFRASTRUCTURE.md), created with the scaffold and covering the topics in Story 4.
- **FR-022**: Document sections that depend on later tasks MUST be marked as placeholders naming the owning task, and each P1 task MUST fill in its sections before it is considered done.
- **FR-023**: Commands and rules stated in the documentation MUST match the project's actual behaviour (every listed command runs successfully on a fresh checkout).

## Out of Scope

- Getting the user's location, reverse-geocoding a place name, and the permission landing content (P2).
- Home-screen sections: header, day strip, verdict cards, rain chart, Other Days list (P3).
- The user-facing theme toggle and remembering the theme choice (P3; this phase only provides the token switch).
- Offline support and service-worker caching (P4, task 4.2).
- Final loading/error UI, full accessibility audit, deployment (P4).
- Desktop two-column layout (P5).
- City search or manually chosen locations (excluded product-wide).
- User accounts, notifications, or server-side storage.

## Success Criteria

- **SC-001**: 100% of verdict rule boundaries have a passing automated test, and the verdict for a sample forecast can be checked against the rule tables.
- **SC-002**: 100% of weather codes the forecast service documents map to an icon (or the defined fallback), with day/night versions where they exist.
- **SC-003**: All text and verdict-color pairs meet WCAG 2.1 AA in both themes when checked with a contrast tool.
- **SC-004**: The browser's manifest inspector reports no errors, and the app installs on at least one Android Chrome and one iOS Safari device.
- **SC-005**: A new developer can go from a fresh checkout to a running app and passing test suites by following the README alone.
- **SC-006**: Forcing a rendering error shows the fallback screen 100% of the time; it never shows a blank page.
- **SC-007**: When P1 is complete, all four documents exist, none of their P1-owned sections are still placeholders, and 100% of the commands they list run successfully on a fresh checkout.

## Clarifications

### Session 2026-10-20

- Q: How should the laundry verdict behave when less than 6 h of daylight remains (late afternoon or night)? → A: If less than 2 h of usable daylight remains, assess tomorrow's first 6 daylight hours instead and state "tomorrow" in the sub-label (e.g. "Good to go tomorrow morning").
- Q: How are hourly rain probabilities across a window combined into the single value the rules compare against? → A: Use the highest hourly rain probability in the window (worst hour wins).
- Q: How are rule boundaries and gaps in the threshold tables resolved? → A: Rain: Go < 30%, Caution 30–60% inclusive, Not yet > 60% (both activities). Drying: Go ≤ 4 h, Caution > 4–≤ 8 h, Not yet > 8 h or won't dry before dark. Car wash: light rain on day 2 = 0.5 to < 2 mm in hours 24–48; ≥ 2 mm in the first 24 h = Not yet; ≥ 2 mm only on day 2 = Caution.
- Q: What happens when forecast values the verdict needs are missing? → A: Skip missing hours; if > 25% of a window's hours lack a required value, return "Verdict unavailable".
- Q: How long is a fetched forecast reused before refetching? → A: 30 minutes; after that, refresh when the app is opened or regains focus, showing the previous data until the new data arrives.

- Q: How are verdicts computed for future days in the Other Days list? → A: Same rules anchored to that day — laundry uses that day's first 6 usable-daylight hours; car wash uses 48 h from that day's sunrise, truncated at the forecast end.

- Q: Is the laundry window exactly 6 h or approximate? → A: Exactly 6 h of usable daylight, cut short at end of usable daylight; window length and the 2 h cutoff are configurable in the central config.

- Q: How does the animated hero icon behave when the user prefers reduced motion? → A: Show the static version of the same icon.

- Q: Should P1 include the project documentation set (CLAUDE.md, DESIGN.md, INFRASTRUCTURE.md)? → A: Yes. Added to task 1.1 (COH-11): created with the scaffold, with later-task sections as marked placeholders filled in by 1.2, 1.4, 1.6, 1.7, 1.8 and P4. New Story 4, FR-021–FR-023, SC-007.

### Plan analysis fixes 2026-10-20

- A1: Polar night vs switch-to-tomorrow → the switch runs first; the polar-night rule applies to the assessed day (FR-004d).
- A2: Car-wash 0.5 to < 2 mm in the first 24 h → Caution, "Light rain expected today" (FR-004b, Story 1 criterion 6).
- A3: "Dark" = sunset (end of day on polar days) (FR-004d).
- A4: Missing hours during drying use the nearest earlier hour's rate (FR-004c).
- R4 (red-team): Lighthouse no longer has PWA audits (removed in v12), so installability is verified in the browser's manifest inspector plus a manual install on devices (Story 8 criterion 1, SC-004).

### Execute-phase analysis 2026-10-21

- F1: Design source is the local Figma export `WashWise.fig`, committed to the repo as `design/WashWise.fig`. It has no Caution (amber) colors, so they are derived, and its sub-10 px pill text is raised to 10 px (Story 5 design source notes).
- F11/F12: Unknown-weather-code edge case marked resolved; requirement IDs reordered.

### Checklist fixes 2026-10-20

- CHK001: "Usable daylight" defined as sunrise to 1 h before sunset (FR-004d).
- CHK002: Reference drying cases added (Story 1 criterion 12, FR-003a).
- CHK003: "Verdict unavailable" shows "—" in Other Days (FR-004e).
- CHK004: Forecast request timeout set to 10 s (FR-008a).
- CHK005: Polar day/night behaviour defined (FR-004d).
- CHK006: "Tomorrow" sub-labels defined for each verdict (Story 1 criterion 10).
