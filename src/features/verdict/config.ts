/**
 * Every verdict threshold lives here (FR-005). Change numbers here, never in the rule code,
 * and update the spec (FR-004b) when a threshold changes.
 */
export const VERDICT_CONFIG = {
  rain: {
    /** Go when the worst hour is below this (%). */
    goBelowPct: 30,
    /** Not yet when the worst hour is above this (%). 30–60 inclusive is Caution. */
    notYetAbovePct: 60,
  },
  laundry: {
    windowHours: 6,
    /** Switch to tomorrow when less usable daylight than this remains today. */
    switchToTomorrowBelowHours: 2,
    /** Usable daylight ends this long before sunset. */
    usableDaylightEndsBeforeSunsetHours: 1,
    dryingGoMaxHours: 4,
    dryingCautionMaxHours: 8,
  },
  carWash: {
    windowHours: 48,
    /** Go needs less than this total over the window (mm). */
    goMaxTotalMm: 0.5,
    /** Not yet at or above this in the first 24 h (mm). */
    notYetDay1Mm: 2,
    /** Light rain at or above this (mm) in a 24 h half makes it Caution. */
    cautionMinMm: 0.5,
  },
  missingData: {
    /** More than this share of read hours missing a required value → "Verdict unavailable". */
    maxMissingRatio: 0.25,
  },
  polar: {
    /** Daylight at or above this (s) counts as polar day. */
    polarDayMinSeconds: 86_340,
  },
  /** Drying model: rate/h = k · VPD^vpdExponent · min(1 + windCoeffPerKmh·wind, windFactorMax) · (1 + sunCoeff·(1 − cloud/100)). */
  drying: {
    k: 0.1328,
    vpdExponent: 0.3,
    windCoeffPerKmh: 0.05,
    windFactorMax: 2.5,
    sunCoeff: 0.5,
  },
} as const

export type VerdictConfig = typeof VERDICT_CONFIG
