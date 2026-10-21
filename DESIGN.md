# DESIGN.md

The WashWise design system: where the design comes from, the tokens, and how to use them.

## Figma source

- File: [`design/WashWise.fig`](design/WashWise.fig) (local export of the Figma file)
- Frame: **Homepage**, 393 × 852 (mobile)
- There's no dark design in Figma. The dark palette is derived (see below).

## Layout

- All content sits in a centered column no wider than **430 px** (`MobileColumn`).
- Page gutter: **26 px** on the left and right.

<!-- owner: 1.2 -->

## Tokens

Tokens are CSS variables in [`src/styles/tokens.css`](src/styles/tokens.css) (`--ww-*`, hex values). [`src/styles/index.css`](src/styles/index.css) maps them to Tailwind utilities via `@theme inline`, so `bg-surface`, `text-ink`, `border-go-border` and so on all follow the active theme. **Use the utilities; never hard-code a color, radius or size.**

### Colors

| Utility name        | Light                                             | Figma use                                                                             |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `bg`                | `#FFFFFF`                                         | Page background (Homepage frame)                                                      |
| `bg-subtle`         | `#FAFAF9`                                         | Named style "Background"                                                              |
| `surface`           | `#FFFFFF`                                         | Named style "Surface"                                                                 |
| `surface-muted`     | `#F2F6FB`                                         | Location pill, rain-bar track                                                         |
| `border`            | `#D3D3D3`                                         | Day-chip border                                                                       |
| `ink`               | `#1F335C`                                         | Headings, verdict word, selected day chip                                             |
| `ink-strong`        | `#1B2F55`                                         | Logo, percentages, day labels                                                         |
| `ink-muted`         | `#5A6B80`                                         | Hour labels, secondary text                                                           |
| `ink-section`       | `#4E6A8A`                                         | Section titles                                                                        |
| `on-ink`            | `#FFFFFF`                                         | Text on `ink` backgrounds                                                             |
| `accent`            | `#336FAD` ⚠️                                      | Other Days status text ("Yes"/"Wait"). Figma `#3A7BBE` is 4.41:1, darkened to pass AA |
| `accent-alt`        | `#3E86C6`                                         | Other Days icon stroke                                                                |
| `rain-1` … `rain-5` | `#9BCFEC` `#74B5E2` `#5FA1D5` `#4473A3` `#1F335C` | Rain bars, low → high chance                                                          |

**Verdict colors**: each verdict has the same five roles.

| Role      | Go Wash      | Caution _(derived)_ | Not yet      | Use                           |
| --------- | ------------ | ------------------- | ------------ | ----------------------------- |
| `-bg`     | `#D9F2EC`    | `#F5EBD3`           | `#F2D9D9`    | Verdict card fill             |
| `-border` | `#62D280`    | `#F2C46B`           | `#F7B0B0`    | Card border (decorative)      |
| `-text`   | `#07695C`    | `#8A5A00`           | `#9C3D3D`    | Sub-label ("Good to go")      |
| `-pill`   | `#CBE3DE`    | `#E8DCC0`           | `#E3CBCB`    | Weather pills inside the card |
| `-dot`    | `#2F9E4F` ⚠️ | `#B07800`           | `#D9534F` ⚠️ | Day-strip verdict dot         |

Utilities are named `bg-go-bg`, `text-caution-text`, `bg-notyet-dot` and so on.

**Deviations from Figma**, all for WCAG AA (FR-014):

- **Caution amber isn't in Figma.** It was derived to mirror the green and red sets (same lightness for bg and pill; text ≥ 4.5:1 on its bg).
- **Day-strip dots**: Figma uses the pastel border colors (`#62D280` 1.9:1, `#F7B0B0` 1.8:1). The dots are the only cue for the day's verdict, so they need 3:1. They use darker `-dot` tokens; the pastels stay on the card borders.
- **Accent text** darkened from `#3A7BBE` to `#336FAD`.

### Radii

| Utility      | Value | Figma use         |
| ------------ | ----- | ----------------- |
| `rounded-sm` | 4 px  | Location pill     |
| `rounded-md` | 8 px  | Weather pill      |
| `rounded-lg` | 12 px | Day chip, buttons |
| `rounded-xl` | 16 px | Verdict card      |

### Spacing

| Utility        | Value | Use                                                          |
| -------------- | ----- | ------------------------------------------------------------ |
| `px-gutter`    | 26 px | Page gutter (Figma's 31 px on two sections normalised to 26) |
| `gap-chip-gap` | 12 px | Between day chips                                            |
| `gap-card-gap` | 18 px | Between verdict cards                                        |

Everything else uses Tailwind's 4 px scale (`gap-2`, `p-4`…).

## Typography

Three self-hosted typefaces are loaded in [`src/styles/fonts.ts`](src/styles/fonts.ts) (Fontsource, `font-display: swap`). Text renders immediately in the fallback font and switches when the brand font arrives. If a font fails to load, the fallback stays and remains readable.

| Family                       | Weights       | Fallback              |
| ---------------------------- | ------------- | --------------------- |
| Fraunces (variable)          | 700           | Georgia, serif        |
| Plus Jakarta Sans (variable) | 400, 700, 800 | system-ui, sans-serif |
| Barlow                       | 500, 600, 700 | system-ui, sans-serif |

Each style is a pair of utilities, `font-<style> text-<style>`. The `text-` utility sets size, line height and weight.

| Style      | Font     | Weight | Size      | Figma use                                          |
| ---------- | -------- | ------ | --------- | -------------------------------------------------- |
| `display`  | Fraunces | 700    | 40        | Logo                                               |
| `title`    | Jakarta  | 700    | 24        | "Should you wash?"                                 |
| `verdict`  | Jakarta  | 800    | 28        | "Go Wash" / "Not yet"                              |
| `date`     | Barlow   | 600    | 20        | Day-chip date                                      |
| `metric`   | Jakarta  | 700    | 15        | Rain %                                             |
| `body`     | Jakarta  | 400    | 13.5      | Hour labels, paragraphs                            |
| `status`   | Jakarta  | 700    | 13        | Yes / Maybe / Wait, buttons                        |
| `section`  | Jakarta  | 700    | 12        | Section titles (write them uppercase)              |
| `sublabel` | Barlow   | 700    | 12        | "Good to go"                                       |
| `day`      | Jakarta  | 700    | 11.5      | TODAY / WED                                        |
| `eyebrow`  | Barlow   | 600    | 10        | LAUNDRY / CAR WASH                                 |
| `caption`  | Barlow   | 500    | 10        | Weekday in a day chip                              |
| `pill`     | Jakarta  | 800    | **10** ⚠️ | Weather pills. Figma 4.5 px, raised for legibility |
| `location` | Barlow   | 500    | **10** ⚠️ | Location pill. Figma 8 px, raised for legibility   |

Line height is 1 (as in Figma), except `title` (1.2) and `body` (1.4), which can wrap to several lines. Letter spacing is 0.

<!-- /owner: 1.2 -->

<!-- owner: 1.6 -->

## Icons

Two icon sets, each with its own job:

| Set                             | For                | How                                                                                                                   |
| ------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Meteocons** (fill style, MIT) | Weather conditions | `<WeatherIcon code isDay variant />` ([`src/components/icons/WeatherIcon.tsx`](src/components/icons/WeatherIcon.tsx)) |
| **lucide-react**                | UI actions         | `import { Sun, Moon, MapPin, Shirt, Car, Check, RotateCcw } from 'lucide-react'`                                      |

### Weather icons

- **Static vs animated**: cards, pills and the day strip use `variant="static"` (the default). Only the large hero icon uses `variant="animated"`.
- **Reduced motion**: when the device asks for reduced motion, `WeatherIcon` serves the static version of the same icon automatically (`usePrefersReducedMotion`).
- **Mapping**: [`src/features/icons/wmoIcons.ts`](src/features/icons/wmoIcons.ts) maps every WMO code Open-Meteo returns (0–99) to a Meteocons name, with day/night variants where they exist and an accessible label ("Light rain", "Thunderstorm"…). Unknown or missing codes show the **`not-available`** fallback ("Weather unavailable").
- **Day / night** comes from the forecast's `is_day` flag for the hour. When it's unknown, the day icon is used.
- **Files**: 23 icons in [`public/meteocons/`](public/meteocons/), with `animated/` from Meteocons v2.0.0 and `static/` generated from them. Meteocons ships no static set, so [`scripts/vendor-meteocons.ts`](scripts/vendor-meteocons.ts) strips the SMIL `<animate*>` elements, leaving each icon at its resting frame. To add an icon, add it to the map, then re-run the script against a Meteocons v2.0.0 checkout (`pnpm tsx scripts/vendor-meteocons.ts <weather-icons>/production/fill/all <weather-icons>/LICENSE`).

### Accessibility

- **Meaningful** icons get a label. `WeatherIcon` uses the condition label as `alt`.
- **Decorative** icons, where the same information is written next to them, are hidden: `<WeatherIcon decorative />` renders `alt="" aria-hidden="true"`.
- lucide icons are decorative by default: pass `aria-hidden="true"` and put the accessible name on the parent button (`<button aria-label="Switch to dark mode"><Moon aria-hidden="true" /></button>`).

<!-- /owner: 1.6 -->

<!-- owner: 2.3 -->

## Landing page

There is no Figma frame for the landing page. It is built from the existing tokens only, so it works in light and dark with no extra styling. Every screen is an `EmptyState` ([`src/components/feedback/EmptyState.tsx`](src/components/feedback/EmptyState.tsx)): one icon, one label, at most one action, centered in the ≤ 430 px column. The page is [`src/pages/LandingPage.tsx`](src/pages/LandingPage.tsx); all its copy sits in one `LANDING_COPY` object.

| Location state      | Icon (lucide, decorative) | Label (`h1`)                             | Extra                                                                  | Announced as |
| ------------------- | ------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- | ------------ |
| Idle                | Logo (`/logo.svg`)        | WashWise (wordmark style)                | Pitch line, button **Use my location** (`MapPin`)                      | none         |
| Requesting          | `LoaderCircle`, spinning  | Finding you…                             | None. The spin stops under reduced motion                              | status       |
| Denied              | `MapPinOff`               | Location access was denied               | **Try again**                                                          | alert        |
| Permanently blocked | `MapPinOff`               | Location access is blocked               | **Try again** + hint "Enable location in your browser's site settings" | alert        |
| Unavailable         | `TriangleAlert`           | We couldn’t find your location           | **Try again**                                                          | alert        |
| Timeout             | `TriangleAlert`           | Finding you took too long                | **Try again**                                                          | alert        |
| Unsupported         | `MapPinOff`               | Location isn't available in this browser | No action                                                              | alert        |

- **Colors**: wordmark `text-ink-strong`, labels `text-ink`, hint `text-ink-muted`, spinner `text-accent`, error icons `text-notyet-text`, button `bg-ink` / `text-on-ink` (the same primary button as `ErrorFallback`).
- **Type**: wordmark `font-display text-display`, labels `font-title text-title`, hint and pitch `font-body text-body`, button `font-status text-status`.
- **Accessibility**: icons are `aria-hidden` (the label carries the meaning), the logo has empty alt text, and every action is a real `<button>`. Progress is a polite `status`; failures are an `alert`. Contrast comes from the token pairs already measured in [Dark palette & contrast](#dark-palette--contrast).
- **No city search**: the landing page has no text field of any kind. The app always uses the device location.

<!-- /owner: 2.3 -->

<!-- owner: 3.6 -->

## Home page

Built from the existing tokens only. The page is [`src/pages/HomePage.tsx`](src/pages/HomePage.tsx) and the sections are in [`src/features/home/components/`](src/features/home/components/). Order, top to bottom:

| Section           | Component                         | Tokens and type                                                                                                                         |
| ----------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Header            | `HomeHeader`                      | wordmark `font-display text-display text-ink-strong`; pill `bg-surface-muted rounded-sm font-location text-location`; toggle `text-ink` |
| Title             | `h1` in `HomePage`                | `font-title text-title text-ink`                                                                                                        |
| Day strip         | `DayStrip`                        | chip `rounded-lg`, `gap-chip-gap`; selected `bg-ink text-on-ink`, others `border-border bg-surface`; `font-day`, `font-date`            |
| Verdict cards     | `VerdictCard`                     | `rounded-xl border`, `gap-card-gap`; per verdict `-bg` / `-border` / `-text` / `-pill`; word `font-verdict`, sub-label `font-sublabel`  |
| Rain chance       | `RainChart`                       | title `font-section text-ink-section`; bar `rain-1…5` by chance on `bg-surface-muted`; `%` `font-metric`, hour `font-body`              |
| Other days        | `OtherDaysList`, `OtherDayMarker` | row `border-border bg-surface rounded-lg`; Yes `text-accent`, Maybe `text-accent-alt`, Wait `text-ink-strong`, "—" `text-ink-muted`     |
| Loading / failure | `HomeSkeleton`, `StatusNotice`    | see [Loading and error states](#loading-and-error-states)                                                                               |

- **Rain bar colors** (chance → token): < 20 `rain-1`, < 40 `rain-2`, < 60 `rain-3`, < 80 `rain-4`, otherwise `rain-5`. The dark palette flips the scale so a higher chance is lighter.
- **Cards**: green, amber and red come from the verdict; an unavailable verdict uses `bg-surface-muted` and "Verdict unavailable". Weather pills hold the drying time ("Dries in ~2.5 hrs", "Dries tomorrow") and the condition with a decorative static icon.
- **Location pill**: shows the place name; the spinner replaces the pin while refreshing, and the button is disabled and `aria-busy`. Its name is "Update location" plus the place (for example "Update location, Manila").
- **Theme toggle**: `Sun` in dark mode, `Moon` in light mode; the label states the action ("Switch to dark mode" / "Switch to light mode"). Icons are `aria-hidden`.
- **Markers**: Yes `Check`, Maybe `CircleHelp`, Wait `X`, unavailable `Minus`. Each marker is icon plus text, never color alone.
- **Accessibility**: day chips are real buttons with `aria-pressed`; the chart's bars are `aria-hidden` and a visually hidden list reads "3 PM: 55% chance of rain"; each card is an `article` named by its activity.
- **To check against Figma**: the Figma export was not inspected in code, so section spacing (`gap-6`), the chart's bar height (`h-24`) and the Other Days row layout (both activities per row) are approximations. They are verified by the human tasks T013, T018, T021 and T028.

<!-- /owner: 3.6 -->

<!-- owner: 4.1 -->

## Loading and error states

**Skeletons** have the same frame as the section they stand in for, so nothing moves when the forecast arrives (no layout shift at 393 and 430 px, in both themes).

- Each placeholder line uses the real text's font token (`font-verdict text-verdict`, `font-day text-day`…) holding a non-breaking space, so it takes exactly that line height. Fill: `bg-surface-muted`, `rounded-sm`, `animate-pulse` (none under reduced motion).
- Section frames are copied as is: strip cells `rounded-lg border-border bg-surface`, cards `rounded-xl border-border bg-surface p-4` with the real activity icon and title, chart bars `h-24 rounded-md`, Other Days rows as in the list. Section headings ("Rain chance", "Other days") show for real.
- The header and the "Should you wash?" title are never skeletons.

**Errors** use one pattern: one `CircleAlert` icon (decorative), one label, a short hint, and "Try again" (`RotateCcw`).

| Variant  | Where                                 | Look                                                                                                                                                |
| -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block`  | in place of the sections (first load) | centered; icon 40 `text-ink-muted`; label `font-title text-title text-ink`; hint `font-body text-ink-muted`; button `bg-ink text-on-ink rounded-lg` |
| `banner` | between the title and the day strip   | one row, `rounded-lg border-border bg-surface`; icon 20; label `font-status`; hint `font-caption text-ink-muted`; outline button                    |

- Labels name the cause: "You’re offline", "The forecast is taking too long", "The forecast service is having trouble", "We couldn’t load the forecast". The banner says "Couldn’t update the forecast" and its hint gives the cause, or that the forecast is for your previous location.
- While retrying, the banner button reads "Retrying…", is disabled (`opacity-60`) and its icon spins (`motion-safe` only).
- The place-name pill has no error state: it shows "Your location".
- No new tokens were needed.

<!-- /owner: 4.1 -->

<!-- owner: 4.2 -->

## Offline, update and install prompts

Figma has no frames for these; they reuse existing tokens only.

- **Offline / stale banner**: the P4.1 `StatusNotice` banner. Offline it reads "You’re offline" with "Showing the last forecast that loaded." A third line, "Updated X ago" (`font-caption text-caption text-ink-muted`), sits outside the live region so it can tick every minute without being re-announced.
- **Bottom prompt slot** (`PwaPrompts`): fixed to the bottom of the ≤ 430 px column, inside the gutter, above the safe-area inset. A spacer of the same height lets the page scroll clear of it. One prompt at a time; the update toast wins.
- **Prompt card** (`promptStyles.ts`): inverted card, `bg-ink text-on-ink rounded-lg shadow-lg`, a decorative 20 px Lucide icon, `font-status` label. Primary action `bg-on-ink text-ink`, secondary action underlined `text-on-ink`; both at least 44 px tall. Inverting `ink`/`on-ink` keeps it legible in dark mode with no new tokens.
- **Update toast**: "A new version is available" · Dismiss · **Reload**.
- **Install prompt**: "Install WashWise" / "Open it from your home screen, even offline." · Not now · **Install**.

<!-- /owner: 4.2 -->

<!-- owner: 1.8 -->

## Dark palette & contrast

Figma has no dark design, so every token's dark value was **derived** from the light set. Each keeps its role and hue: surfaces become deep navy, ink becomes near-white, and verdict cards become dark tints with light text. The rain scale flips so more rain is lighter (it stays the most prominent bar on a dark background).

**How it switches**: dark values live in a `.dark { … }` block in [`tokens.css`](src/styles/tokens.css). Adding `class="dark"` to `<html>` swaps every `--ww-*` variable, and Tailwind utilities follow automatically (`@custom-variant dark` is also available for the rare one-off `dark:` override). The Sun/Moon toggle (see [Home page](#home-page)) defaults to the system setting and is saved in localStorage; an inline script in `index.html` applies it before first paint.

| Token                                                 | Light                                             | Dark                                              |
| ----------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| `bg`                                                  | `#FFFFFF`                                         | `#0E1729`                                         |
| `bg-subtle`                                           | `#FAFAF9`                                         | `#121C30`                                         |
| `surface`                                             | `#FFFFFF`                                         | `#16223A`                                         |
| `surface-muted`                                       | `#F2F6FB`                                         | `#1D2B46`                                         |
| `border`                                              | `#D3D3D3`                                         | `#34445F`                                         |
| `ink`                                                 | `#1F335C`                                         | `#E6ECF5`                                         |
| `ink-strong`                                          | `#1B2F55`                                         | `#F3F6FB`                                         |
| `ink-muted`                                           | `#5A6B80`                                         | `#A6B3C5`                                         |
| `ink-section`                                         | `#4E6A8A`                                         | `#9FB5D1`                                         |
| `on-ink`                                              | `#FFFFFF`                                         | `#0E1729`                                         |
| `accent`                                              | `#336FAD`                                         | `#84B6E8`                                         |
| `accent-alt`                                          | `#3E86C6`                                         | `#6FA8DD`                                         |
| `rain-1` … `rain-5`                                   | `#9BCFEC` `#74B5E2` `#5FA1D5` `#4473A3` `#1F335C` | `#2F5878` `#3F77A3` `#5A97CB` `#8BBDE6` `#CFE5F6` |
| `go-bg` / `-border` / `-text` / `-pill` / `-dot`      | `#D9F2EC` `#62D280` `#07695C` `#CBE3DE` `#2F9E4F` | `#0F3A33` `#2E8B5A` `#84E3B6` `#17493F` `#4CC77A` |
| `caution-bg` / `-border` / `-text` / `-pill` / `-dot` | `#F5EBD3` `#F2C46B` `#8A5A00` `#E8DCC0` `#B07800` | `#3B2E12` `#B8892B` `#F2C66F` `#4A3A19` `#E0A73A` |
| `notyet-bg` / `-border` / `-text` / `-pill` / `-dot`  | `#F2D9D9` `#F7B0B0` `#9C3D3D` `#E3CBCB` `#D9534F` | `#3D1D20` `#B25656` `#F5A8A8` `#4D272A` `#E87474` |

### Measured contrast (WCAG 2.1 AA)

Checked automatically by [`src/styles/contrast.test.ts`](src/styles/contrast.test.ts). The test parses `tokens.css`, so adding or changing a token re-runs these checks. Minimum 4.5:1 for normal text; 3:1 for color-only indicators.

| Pair                                                | Min | Light                | Dark                  |
| --------------------------------------------------- | --- | -------------------- | --------------------- |
| `ink` on `bg`                                       | 4.5 | 12.45                | 15.07                 |
| `ink` on `surface`                                  | 4.5 | 12.45                | 13.35                 |
| `ink-strong` on `bg`                                | 4.5 | 13.25                | 16.52                 |
| `ink-strong` on `surface-muted`                     | 4.5 | 12.21                | 13.04                 |
| `ink-muted` on `bg`                                 | 4.5 | 5.46                 | 8.42                  |
| `ink-muted` on `surface`                            | 4.5 | 5.46                 | 7.46                  |
| `ink-section` on `bg`                               | 4.5 | 5.60                 | 8.53                  |
| `accent` on `bg`                                    | 4.5 | 5.23                 | 8.38                  |
| `on-ink` on `ink`                                   | 4.5 | 12.45                | 15.07                 |
| `go-text` on `go-bg`                                | 4.5 | 5.61                 | 8.15                  |
| `caution-text` on `caution-bg`                      | 4.5 | 5.00                 | 8.25                  |
| `notyet-text` on `notyet-bg`                        | 4.5 | 4.99                 | 7.92                  |
| `ink` on `go-bg` / `caution-bg` / `notyet-bg`       | 4.5 | 10.59 / 10.50 / 9.31 | 10.57 / 11.15 / 12.67 |
| `ink` on `go-pill` / `caution-pill` / `notyet-pill` | 4.5 | 9.24 / 9.15 / 8.11   | 8.58 / 9.26 / 10.79   |
| `go-dot` on `bg`                                    | 3   | 3.43                 | 8.32                  |
| `caution-dot` on `bg`                               | 3   | 3.80                 | 8.32                  |
| `notyet-dot` on `bg`                                | 3   | 3.96                 | 6.12                  |
| `accent-alt` on `bg`                                | 3   | 3.87                 | 7.09                  |

**Not checked**: `border`, the `-border` tokens and the rain bars against their track. These are decorative boundaries, or always sit next to a text label (the % above each bar), so WCAG 1.4.11 doesn't require 3:1.

Screenshots of both themes: [`docs/screenshots/dark-palette/`](docs/screenshots/dark-palette/).

<!-- /owner: 1.8 -->
