# CLAUDE.md

Guide for AI coding agents (and humans) working on WashWise. Read this before changing code.

## Overview

> TODO (task 1.1)

## Commands

> TODO (task 1.1)

## Folder layout

> TODO (task 1.1)

## Conventions

> TODO (task 1.1)

## Testing rules

> TODO (task 1.1)

## Product rules

> TODO (task 1.1)

<!-- owner: 1.3 -->

## App structure

> TODO (task 1.3)

<!-- /owner: 1.3 -->

<!-- owner: 1.4 -->

## Data access

> TODO (task 1.4)

<!-- /owner: 1.4 -->

<!-- owner: 1.5 -->

## Verdict engine

Lives in `src/features/verdict/`. It is pure TypeScript: **no React or TanStack imports** (enforced by ESLint, FR-006). Every function takes `now` as an argument, so tests never touch the clock.

**Thresholds live only in [`config.ts`](src/features/verdict/config.ts)** (`VERDICT_CONFIG`). Never hard-code a number in rule code. If a threshold changes, update spec FR-004b too.

| Function                               | What it returns                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `computeLaundryVerdict(forecast, now)` | Today's laundry verdict (switches to tomorrow when < 2 h usable daylight is left) |
| `computeCarWashVerdict(forecast, now)` | Car-wash verdict for the 48 h from the current hour                               |
| `computeDayVerdicts(forecast)`         | Both verdicts for every forecast day, windows anchored at that day's sunrise      |
| `toOtherDaysLabel(result)`             | `Yes` / `Maybe` / `Wait` / `—`                                                    |

**Laundry** (6 h of usable daylight from now, or from sunrise; usable daylight = sunrise → sunset − 1 h; whole day on a polar day)

| Verdict | Rule                                                               | Sub-label (today / tomorrow)                            |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Go Wash | worst-hour rain < 30% and dries in ≤ 4 h                           | Good to go / Good to go tomorrow morning                |
| Caution | rain 30–60% _(rain label wins)_                                    | Dry indoors as backup / Tomorrow: dry indoors as backup |
| Caution | dries in > 4 h and ≤ 8 h                                           | Slow drying day / Tomorrow: slow drying day             |
| Not yet | rain > 60%, dries in > 8 h, won't dry before sunset, or no sunrise | Better to wait / Better to wait — tomorrow looks wet    |

**Car wash** (48 h from the current hour; "day 1" = first 24 h, "day 2" = next 24 h)

| Verdict | Rule                                      | Sub-label                 |
| ------- | ----------------------------------------- | ------------------------- |
| Not yet | worst-hour rain > 60%, or ≥ 2 mm on day 1 | Rain will undo it         |
| Go Wash | worst-hour rain < 30% and < 0.5 mm total  | Good to go                |
| Caution | 0.5 to < 2 mm on day 1 _(wins)_           | Light rain expected today |
| Caution | anything else (30–60%, ≥ 0.5 mm on day 2) | Rain likely tomorrow      |

**Rules that apply to both**

- Worst hour wins: "rain chance" is the highest hourly value in the window.
- The most severe verdict wins when several rules apply.
- Missing data: skip missing hours. If more than 25% of the hours read are missing a required value, the result is `{ status: 'unavailable' }`, shown as "—" in Other Days. Hours past the forecast end are not "missing".
- Drying: `rate/h = k · VPD^0.3 · wind factor · sun factor`, accumulated hour by hour until dry or dark. A missing hour reuses the previous hour's rate.

**Tests**: boundaries are in `laundry.test.ts` and `carWash.test.ts` (pure `laundryRules` / `carWashRules`). `verdicts.golden.test.ts` snapshots verdicts over real recorded forecasts. A snapshot diff after a change means verdicts changed for real users: review it, don't just update it. `pnpm verdict:report` shows how often each verdict appears per location.

<!-- /owner: 1.5 -->

## PR checklist

> TODO (task 1.1)
