import type { EpochMs } from '@/features/forecast/types'

export type Verdict = 'go' | 'caution' | 'notYet'
export type Activity = 'laundry' | 'carWash'

export type DryingEstimate =
  | { kind: 'hours'; hours: number }
  /** Won't dry before dark. */
  | { kind: 'tomorrow' }

export type VerdictReason =
  | 'rainHigh'
  | 'rainModerate'
  | 'dryingSlow'
  | 'dryingTooSlow'
  | 'wontDryBeforeDark'
  | 'noDaylight'
  | 'heavyRainDay1'
  | 'rainDay1'
  | 'rainDay2'

export type VerdictResult =
  | {
      status: 'ok'
      activity: Activity
      verdict: Verdict
      subLabel: string
      reasons: VerdictReason[]
      window: { start: EpochMs; end: EpochMs }
      /** Laundry was switched to tomorrow because too little daylight was left today (FR-001). */
      forTomorrow: boolean
      /** Laundry only. */
      drying?: DryingEstimate
    }
  | { status: 'unavailable'; activity: Activity; reason: 'missingData' }

export interface DayVerdicts {
  date: string
  laundry: VerdictResult
  carWash: VerdictResult
}

export type OtherDaysLabel = 'Yes' | 'Maybe' | 'Wait' | '—'
