# Feature Specification: WashWise P4.3 · Accessibility Pass in Both Themes

**Created**: 2026-10-21
**Status**: Draft
**Source**: Linear COH-31 (task 4.3, phase COH-9 "P4 · Hardening"). Blocked by COH-28 (3.6 Home page assembly) and COH-18 (1.8 Dark palette).

## Overview

WashWise must be usable by people who navigate by keyboard, use a screen reader, zoom the page or need strong contrast, in light and in dark. This task audits every state of the landing and home pages, fixes what fails, and adds automated checks so regressions are caught before they ship.

## User Stories

### Story 1 — No serious accessibility issues on any screen (Priority: P1)

A team member runs the automated accessibility check against every state of the landing page and the home page, in light and dark, and it reports no serious or critical issues. The same check runs with the end-to-end tests, so a later change that breaks accessibility fails the build.

**Why this priority**: It is the first acceptance criterion of the task and the only way to keep accessibility from regressing.

**Acceptance Criteria**:

1. **Given** each landing-page state (first visit, asking for location, denied, blocked, unavailable, timed out, unsupported) and the app-wide error screen ("Try again" / "Reload"), **When** the automated check runs in light and dark, **Then** it reports no serious or critical issues.
2. **Given** each home-page state (loading, loaded with each verdict, another day selected, first-load error, update-failed banner, offline banner), **When** the automated check runs in light and dark, **Then** it reports no serious or critical issues.
3. **Given** the update toast or the install prompt is showing, **When** the check runs, **Then** it reports no serious or critical issues.
4. **Given** a change introduces a serious issue, **When** the end-to-end tests run, **Then** they fail and name the rule and the element.

### Story 2 — Everything works with a keyboard alone (Priority: P1)

A keyboard user opens WashWise, allows location, and on the home page reaches every control in a sensible order — location pill, theme toggle, each day, retry actions, and the toast or prompt buttons — and can operate each one. They can always see where focus is.

**Why this priority**: Explicit acceptance criterion; a control that can't be reached by keyboard is unusable for many people.

**Acceptance Criteria**:

1. **Given** the landing page, **When** the user presses Tab, **Then** focus reaches the location action (and any retry/help action in error states) and Enter or Space activates it.
2. **Given** the home page, **When** the user tabs from the top, **Then** focus moves in visual order through the header controls, the day strip, any banner action, and any toast or prompt buttons, with no element skipped and no focus trap.
3. **Given** any focused control, in light or dark, **When** it receives focus from the keyboard, **Then** a visible focus indicator appears that contrasts at least 3:1 with the surrounding colors.
4. **Given** a control that changes the page (day selected, retry, theme toggle, location refresh), **When** it is activated by keyboard, **Then** focus stays on it or moves to a predictable place, never to the top of the page or nowhere.
5. **Given** a page change from landing to home, **When** it happens, **Then** focus and the announced page title reflect the new page ("WashWise — Allow location" on landing, "WashWise — Should you wash?" on home).

### Story 3 — Screen readers get the same information (Priority: P1)

A screen-reader user hears the verdicts, sub-labels, weather pills, rain chance per hour, the Other Days markers, the selected day, the place name, the theme toggle's action, and every status or error message, in a sensible reading order. Decorative icons are silent.

**Why this priority**: The verdict is the product; if it isn't announced, the app gives no answer.

**Acceptance Criteria**:

1. **Given** each page, **When** read by a screen reader, **Then** there is one main landmark, one top-level heading, and headings for each section in order.
2. **Given** every interactive element, **When** it is focused, **Then** it has an accessible name that says what it does, and toggles/selections announce their state.
3. **Given** every meaningful icon (weather, verdict marker), **When** read, **Then** it has a text alternative; every decorative icon is hidden.
4. **Given** loading, error, offline and update messages, **When** they appear, **Then** they are announced once, politely or at once as appropriate, without stealing focus.

### Story 4 — Readable in both themes and when zoomed (Priority: P2)

A user with low vision reads every text and indicator in light and dark, zooms the page to 200%, or enlarges the system font, and nothing becomes unreadable, clipped or overlapping.

**Why this priority**: Token contrast is already checked automatically (task 1.8); this story closes the remaining gaps (real rendered pairs, focus rings, zoom), so it ranks after the P1 checks.

**Acceptance Criteria**:

1. **Given** every text and its rendered background in light and dark, **When** measured, **Then** it meets AA contrast (4.5:1 normal text, 3:1 large text and meaningful non-text indicators).
2. **Given** the page at 200% zoom (or a 320 px-wide viewport), **When** viewed, **Then** all content and controls are usable without horizontal scrolling and nothing is clipped or overlapping.
3. **Given** the user's system prefers reduced motion, **When** the page loads or updates, **Then** no non-essential animation plays.
4. **Given** verdicts and markers, **When** viewed, **Then** they are never told apart by color alone (a word or icon always goes with the color).
5. **Given** forced-colors mode, **When** the home page renders, **Then** controls, focus indicators, the selected day and verdict markers are still visible and distinguishable.
6. **Given** any button or toggle, **When** measured, **Then** its target is at least 24×24 px or spaced as WCAG 2.2 allows.

### Edge Cases

- What happens with very long place names in the location pill? → The name is truncated visually but the full name is in the accessible name.
- What happens when the theme is toggled while a screen reader is reading? → The toggle's new label is announced; nothing else is re-announced.
- What happens when a toast appears while the user is typing/tabbing? → It does not take focus; it is reachable by Tab.
- What happens when the bottom toast or install prompt sits over a focused control? → The focused control is never hidden behind it: the page scrolls it into view above the prompt (FR-018).
- What happens to the skeleton placeholders? → Announced once as a single "Loading forecast" status (P4.1), individually hidden.
- What happens when the system forces high-contrast / forced colors? → Basic support: controls, focus indicators, selected day and verdict markers stay visible and distinguishable; exact colors are left to the system (FR-017).
- What happens to touch targets that are small (pill, toggle, day buttons)? → Every target is at least 24×24 px, or has enough spacing around it, per WCAG 2.2 AA (FR-016).

## Functional Requirements

- **FR-001**: Every state of the landing and home pages, including toasts and prompts, MUST have no serious or critical automated-accessibility findings, in light and dark.
- **FR-002**: The automated accessibility check MUST run with the end-to-end tests on the production build and fail them on any serious or critical finding.
- **FR-003**: Every interactive element MUST be reachable and operable by keyboard alone, in visual order, with no focus trap.
- **FR-004**: Every keyboard-focusable element MUST show a visible focus indicator with at least 3:1 contrast against adjacent colors in both themes.
- **FR-005**: After an action that changes the page content, focus MUST stay on the control or move to a predictable target; after a route change, focus and the document title MUST reflect the new page: "WashWise — Allow location" on landing, "WashWise — Should you wash?" on home.
- **FR-006**: Each page MUST have one main landmark, one top-level heading and a logical heading order.
- **FR-007**: Every interactive element MUST have an accessible name describing its action, and selection/toggle state MUST be exposed.
- **FR-008**: Meaningful icons MUST have text alternatives; decorative icons MUST be hidden from assistive technology.
- **FR-009**: Status, error, offline and update messages MUST be announced once with the right urgency and MUST NOT move focus.
- **FR-010**: All rendered text and meaningful indicators MUST meet WCAG AA contrast in both themes, measured on the rendered page, not only on token pairs. Disabled controls (e.g. "Retrying…") are exempt from AA but MUST still reach 3:1.
- **FR-011**: Content MUST remain usable at 200% zoom and at 320 px width without horizontal scrolling, clipping or overlap.
- **FR-012**: Non-essential motion MUST stop when the user prefers reduced motion.
- **FR-013**: Information MUST never be conveyed by color alone.
- **FR-014**: Fixes MUST use existing design tokens (new tokens added and documented if needed) and MUST NOT change verdict logic or product behaviour.
- **FR-015**: Findings that need human judgement (screen-reader reading order, announcements) MUST be checked by hand with at least one mobile screen reader, and the results recorded.

- **FR-016**: The target standard is WCAG 2.2 level AA. Every pointer target MUST be at least 24×24 CSS px, or have the spacing WCAG 2.2 allows instead.
- **FR-017**: In forced-colors (high-contrast) mode, controls, focus indicators, the selected day and verdict markers MUST stay visible and distinguishable.
- **FR-018**: A focused element MUST NOT be entirely hidden by the bottom toast or install prompt.
- **FR-019**: Moderate and minor automated findings MUST NOT fail the build; each MUST be fixed when the fix is small, or listed with a reason in the PR.
## Out of Scope

- New features, copy rewrites or layout redesigns beyond what an accessibility fix needs.
- Verdict rules and thresholds.
- Desktop two-column layout (P5).
- Languages other than English; right-to-left layouts.
- A formal third-party WCAG audit or conformance statement.
- City search or manual location (excluded product-wide).

## Success Criteria

- **SC-001**: The automated check reports 0 serious and 0 critical findings across every listed state in both themes, and runs on every end-to-end run.
- **SC-002**: 100% of interactive elements on landing and home are reached and operated by keyboard in automated tests.
- **SC-003**: Every rendered text/background pair meets AA in both themes (0 automated contrast findings).
- **SC-004**: A screen-reader walkthrough of landing → home → change day → toggle theme is completed with VoiceOver on iPhone Safari (required) and TalkBack on Android Chrome (if a device is available), with every verdict, label and message read correctly, and recorded with the PR.
- **SC-005**: At 200% zoom and 320 px width, no state shows horizontal scrolling or clipped controls, confirmed by screenshots.

## Clarifications

### Session 2026-10-21

- Q: Which WCAG level is the target? → A: WCAG 2.2 AA, including 24×24 px target size and focus not obscured (FR-016, FR-018).
- Q: Is Windows forced-colors mode in scope? → A: Basic support: things stay visible and distinguishable, checked by emulation; no pixel-perfect styling (FR-017).
- Q: What happens to moderate and minor automated findings? → A: They don't fail the build; fix when cheap, otherwise list with a reason in the PR (FR-019).

### Checklist 2026-10-21

- CHK001 [Clarity] Page titles defined: "WashWise — Allow location" / "WashWise — Should you wash?" (Story 2, FR-005).
- CHK002 [Completeness] Screen readers: VoiceOver on iPhone required; TalkBack if a device is available (SC-004).
- CHK003 [Measurability] Disabled controls exempt from AA but at least 3:1 (FR-010).
- CHK004 [Coverage] App-wide error screen added to the audited states (Story 1).
