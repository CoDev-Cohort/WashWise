import { useMemo, useState } from 'react'
import { StatusNotice } from '@/components/feedback/StatusNotice'
import { getCardContent } from '@/features/home/cardContent'
import { DayStrip } from '@/features/home/components/DayStrip'
import { HomeHeader } from '@/features/home/components/HomeHeader'
import { HomeSkeleton } from '@/features/home/components/HomeSkeleton'
import { OtherDaysList } from '@/features/home/components/OtherDaysList'
import { RainChart } from '@/features/home/components/RainChart'
import { VerdictCards } from '@/features/home/components/VerdictCards'
import { formatDataAge } from '@/features/home/dataAge'
import { buildDayStrip } from '@/features/home/dayStrip'
import { buildOtherDays } from '@/features/home/otherDays'
import { getRainBars } from '@/features/home/rainWindow'
import { useHomeForecast } from '@/features/home/useHomeForecast'
import { useCityName } from '@/features/location/useCityName'
import { useCoordinates, useLocationRefresh } from '@/features/location/useCoordinates'
import { useTheme } from '@/features/theme/useTheme'
import { useNow } from '@/lib/useNow'

/**
 * The home page: header, day strip, verdict cards, rain chart and Other Days for the selected day
 * (FR-012). Section skeletons on the first load, one error pattern when it fails, and once a forecast
 * has loaded it stays: a failed update only adds a banner (P4 spec FR-001 – FR-007). Offline, the last
 * forecast (from the device after a restart) shows from today on, under a banner with its age (P4.2).
 */
export function HomePage() {
  const coords = useCoordinates()
  const now = useNow()
  const forecast = useHomeForecast(coords, now)
  const { view, copy } = forecast
  // The pill names the place the forecast on screen is for, so the two always agree.
  const place = useCityName(forecast.shownCoords.lat, forecast.shownCoords.lon)
  const { refresh, refreshing } = useLocationRefresh()
  const { theme, toggle } = useTheme()
  const [selected, setSelected] = useState(0)

  const data = view.kind === 'ready' ? view.data : undefined
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
      {view.kind === 'ready' && view.stale && copy && (
        <StatusNotice
          variant="banner"
          label={view.reason === 'offline' ? copy.label : 'Couldn’t update the forecast'}
          hint={
            view.reason === 'offline'
              ? view.previousLocation
                ? 'Showing the last forecast, for your previous location.'
                : 'Showing the last forecast that loaded.'
              : view.previousLocation
                ? `${copy.label}. Showing the forecast for your previous location.`
                : `${copy.label}. Showing the last forecast that loaded.`
          }
          meta={`Updated ${formatDataAge(view.data.fetchedAt, now)}`}
          onRetry={forecast.retry}
          retrying={forecast.isFetching}
        />
      )}
      {data ? (
        <>
          <DayStrip days={days} selected={dayIndex} onSelect={setSelected} />
          <VerdictCards {...getCardContent(data, dayIndex, now)} />
          <RainChart bars={getRainBars(data, dayIndex, now)} />
          <OtherDaysList rows={otherDays} />
        </>
      ) : view.kind === 'error' && copy ? (
        <StatusNotice
          variant="block"
          label={copy.label}
          hint={copy.hint}
          onRetry={forecast.retry}
        />
      ) : (
        <HomeSkeleton />
      )}
    </main>
  )
}
