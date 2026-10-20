import type { OtherDaysLabel, Verdict, VerdictResult } from './types'

export const LAUNDRY_LABELS = {
  today: {
    go: 'Good to go',
    cautionRain: 'Dry indoors as backup',
    cautionDrying: 'Slow drying day',
    notYet: 'Better to wait',
  },
  tomorrow: {
    go: 'Good to go tomorrow morning',
    cautionRain: 'Tomorrow: dry indoors as backup',
    cautionDrying: 'Tomorrow: slow drying day',
    notYet: 'Better to wait — tomorrow looks wet',
  },
} as const

export const CAR_WASH_LABELS = {
  go: 'Good to go',
  cautionToday: 'Light rain expected today',
  cautionTomorrow: 'Rain likely tomorrow',
  notYet: 'Rain will undo it',
} as const

const SEVERITY: Record<Verdict, number> = { go: 0, caution: 1, notYet: 2 }

/** The more severe of two verdicts (FR-004b). */
export const worst = (a: Verdict, b: Verdict): Verdict => (SEVERITY[a] >= SEVERITY[b] ? a : b)

const OTHER_DAYS: Record<Verdict, OtherDaysLabel> = { go: 'Yes', caution: 'Maybe', notYet: 'Wait' }

/** Other Days list label (FR-004, FR-004e). */
export function toOtherDaysLabel(result: VerdictResult): OtherDaysLabel {
  return result.status === 'ok' ? OTHER_DAYS[result.verdict] : '—'
}
