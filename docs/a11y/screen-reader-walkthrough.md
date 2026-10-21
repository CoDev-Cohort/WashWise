# Screen-reader walkthrough (P4.3, COH-31)

A person runs this before a release, on a real phone with the production build. It checks what automated tests can't: reading order, what is announced and when (spec FR-009, FR-015, SC-004).

**Required**: VoiceOver on iPhone Safari. **If a device is available**: TalkBack on Android Chrome.

## Setup

- Fresh site data (Settings → Safari → Advanced → Website Data → remove the site), so the first visit shows the landing page.
- Light theme first; repeat steps 5–8 after switching to dark.
- Swipe right to move to the next item; double-tap to activate.

## Script

| #   | Do                                               | Should hear (roughly)                                                                                                                                                      |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the app                                     | Page title "WashWise — Allow location"; heading "WashWise"; "Laundry and car-wash advice for today’s weather."; "Use my location, button"                                  |
| 2   | Activate "Use my location", then **Don’t allow** | "Location access was denied" read **once**, without moving focus elsewhere; "Try again, button"                                                                            |
| 3   | "Try again", then **Allow**                      | "Finding you…", then the home page: title "WashWise — Should you wash?"; focus on heading "Should you wash?"                                                               |
| 4   | Swipe from the top                               | "WashWise"; "Update location, _place_, button"; "Switch to dark mode, button"; heading "Should you wash?"                                                                  |
| 5   | Swipe through the day strip                      | "Choose a day" group; "Today, 21, selected, button" (or "toggle button, on"); then "THU, 22, button" … for six days                                                        |
| 6   | Swipe through the cards                          | "Laundry" heading, the verdict word ("Go Wash" / "Caution" / "Not yet"), the sub-label, each pill; then "Car wash" the same way                                            |
| 7   | Swipe through Rain chance                        | Heading "Rain chance"; one item per hour: "10 AM: 5% chance of rain" … (no separate reading of the bars)                                                                   |
| 8   | Swipe through Other days                         | Each day: "THU 22", "Laundry Maybe", "Car wash Wait" … No icon is read on its own                                                                                          |
| 9   | Select another day (double-tap "SAT")            | It becomes "selected"; the cards and chart read that day’s values                                                                                                          |
| 10  | "Switch to dark mode"                            | Button now reads "Switch to light mode"; nothing else is re-read                                                                                                           |
| 11  | Turn on airplane mode, then return to the app    | "You’re offline. Showing the last forecast that loaded." read **once**; focus stays where it was; "Updated _n_ min ago" readable when swiped to, not repeated every minute |
| 12  | Turn airplane mode off                           | The banner goes; nothing is announced over the current item                                                                                                                |

## Results

Fill in one row per step. Mark ✅ pass, ⚠️ pass with a note, ❌ fail (open an issue and link it).

| #   | VoiceOver (iOS, version) | TalkBack (Android, version) | Notes |
| --- | ------------------------ | --------------------------- | ----- |
| 1   |                          |                             |       |
| 2   |                          |                             |       |
| 3   |                          |                             |       |
| 4   |                          |                             |       |
| 5   |                          |                             |       |
| 6   |                          |                             |       |
| 7   |                          |                             |       |
| 8   |                          |                             |       |
| 9   |                          |                             |       |
| 10  |                          |                             |       |
| 11  |                          |                             |       |
| 12  |                          |                             |       |

Tester: — · Date: — · Build (commit): —
