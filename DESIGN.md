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

> TODO (task 1.6)

<!-- /owner: 1.6 -->

<!-- owner: 1.8 -->

## Dark palette & contrast

> TODO (task 1.8)

<!-- /owner: 1.8 -->
