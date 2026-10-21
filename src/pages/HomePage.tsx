import { useMemo, useState } from 'react'
import { useForecast } from '@/features/forecast/useForecast'
import { getCardContent } from '@/features/home/cardContent'
import { DayStrip } from '@/features/home/components/DayStrip'
import { HomeError } from '@/features/home/components/HomeError'
import { HomeHeader } from '@/features/home/components/HomeHeader'
import { HomeSkeleton } from '@/features/home/components/HomeSkeleton'
import { OtherDaysList } from '@/features/home/components/OtherDaysList'
import { RainChart } from '@/features/home/components/RainChart'
import { VerdictCards } from '@/features/home/components/VerdictCards'
import { buildDayStrip } from '@/features/home/dayStrip'
import { buildOtherDays } from '@/features/home/otherDays'
import { getRainBars } from '@/features/home/rainWindow'
import { useCityName } from '@/features/location/useCityName'
import { useCoordinates, useLocationRefresh } from '@/features/location/useCoordinates'
import { useTheme } from '@/features/theme/useTheme'
import { useNow } from '@/lib/useNow'

/**
 * The home page: header, day strip, verdict cards, rain chart and Other Days for the selected day
 * (FR-012). The previous forecast stays on screen while a new one loads (`useForecast`).
 */
export function HomePage() {
  const { lat, lon } = useCoordinates()
  const place = useCityName(lat, lon)
  const now = useNow()
  const forecast = useForecast(lat, lon)
  const { refresh, refreshing } = useLocationRefresh()
  const { theme, toggle } = useTheme()
  const [selected, setSelected] = useState(0)

  const data = forecast.data
  const days = useMemo(() => (data ? buildDayStrip(data) : []), [data])
  const otherDays = useMemo(() => (data ? buildOtherDays(data) : []), [data])
  // A refetch can return fewer days; fall back to Today rather than pointing past the end.
  const dayIndex = selected < days.length ? selected : 0

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <HomeHeader
        place={place}
        refreshing={refreshing || forecast.isFetching}
        onRefresh={() => void refresh()}
        theme={theme}
        onToggleTheme={toggle}
      />
      <h1 className="font-title text-title text-ink">Should you wash?</h1>
      {data ? (
        <>
          <DayStrip days={days} selected={dayIndex} onSelect={setSelected} />
          <VerdictCards {...getCardContent(data, dayIndex, now)} />
          <RainChart bars={getRainBars(data, dayIndex, now)} />
          <OtherDaysList rows={otherDays} />
        </>
      ) : forecast.isError ? (
        <HomeError onRetry={() => void forecast.refetch()} />
      ) : (
        <HomeSkeleton />
      )}
    </main>
  )
}
