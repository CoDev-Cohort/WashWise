import type { CardContent } from '../cardContent'
import { VerdictCard } from './VerdictCard'

interface VerdictCardsProps {
  laundry: CardContent
  carWash: CardContent
}

/** The Laundry and Car Wash cards for the selected day. */
export function VerdictCards({ laundry, carWash }: VerdictCardsProps) {
  return (
    <div className="flex flex-col gap-card-gap">
      <VerdictCard activity="laundry" result={laundry.result} pills={laundry.pills} />
      <VerdictCard activity="carWash" result={carWash.result} pills={carWash.pills} />
    </div>
  )
}
