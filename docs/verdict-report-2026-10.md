# Verdict distribution gate: 2026-10-21

Plan R2 gate, run before P3 against the real fixtures recorded 2026-10-20 (`pnpm verdict:report --gate`). Samples are every daylight hour of days 0–4.

| Place        | Samples | Laundry go / caution / notYet / unavail | Car wash go / caution / notYet / unavail |
| ------------ | ------- | --------------------------------------- | ---------------------------------------- |
| Manila       | 60      | 38% / 60% / 2% / 0%                     | 0% / 33% / 67% / 0%                      |
| London       | 50      | 0% / 30% / 70% / 0%                     | 0% / 0% / 100% / 0%                      |
| Phoenix      | 55      | 69% / 11% / 20% / 0%                    | 40% / 0% / 60% / 0%                      |
| Longyearbyen | 20      | 0% / 0% / 100% / 0%                     | 0% / 15% / 85% / 0%                      |
| McMurdo      | 113     | 0% / 28% / 72% / 0%                     | 100% / 0% / 0% / 0%                      |

## Gates

| Gate                                        | Result     |
| ------------------------------------------- | ---------- |
| London: car wash Caution + Not yet ≤ 70%    | ✖ **100%** |
| Phoenix: car wash Caution + Not yet ≤ 70%   | ✔ 60%      |
| Phoenix: laundry Go on ≥ 1 day              | ✔ 4 days   |
| Manila / London / Phoenix: unavailable < 2% | ✔ 0%       |

## Reading the London failure

London's recorded week is wet on every day the 48 h car-wash window covers:

| Day | Worst-hour rain chance | Rain total |
| --- | ---------------------- | ---------- |
| 0   | 100%                   | 5.2 mm     |
| 1   | 70%                    | 7.2 mm     |
| 2   | 82%                    | 2.5 mm     |
| 3   | 100%                   | 19.4 mm    |
| 4   | 88%                    | 3.8 mm     |
| 5   | 72%                    | 3.0 mm     |
| 6   | 41%                    | 0 mm       |

Every sample has a worst hour above 60% or at least 2 mm in its first 24 h, so **"Not yet" is the correct verdict**. The failure reflects this week's weather, not an over-strict threshold. A one-week sample can't separate the two.

**Decision needed (product owner)**, choosing one of:

1. **Keep thresholds; re-run the gate on a drier London week** (or across several weeks) before P3. _(Recommended: the rules behaved correctly here.)_
2. Relax car-wash thresholds (spec FR-004b + `config.ts`).
3. Replace the single-week gate with a seasonal sample.

## Other observations from the golden snapshots (for review)

- **Sub-zero laundry**: McMurdo at −12 °C returns "Caution – Slow drying day". Washing freezes below 0 °C. The spec has no frost rule; consider "Not yet" below a temperature threshold.
- **"Better to wait — tomorrow looks wet"** is shown even when the reason is slow drying, not rain (McMurdo 22:00, 6% rain). The spec defines one tomorrow-Not-yet label; consider a drying-specific variant.
- Car wash is rarely green on day 0 in humid or rainy climates (Manila 0%). This is expected with worst-hour-wins, but worth watching in user feedback.
