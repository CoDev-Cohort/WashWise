import { LoaderCircle, MapPin, MapPinOff, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useGeolocation } from '@/features/location/useGeolocation'

/** All landing copy in one place. The strings in quotes in the spec and Linear COH-21 are fixed. */
const LANDING_COPY = {
  brand: 'WashWise',
  pitch: 'Laundry and car-wash advice for today’s weather.',
  start: 'Use my location',
  retry: 'Try again',
  requesting: 'Finding you…',
  denied: 'Location access was denied',
  blocked: 'Location access is blocked',
  blockedHint: "Enable location in your browser's site settings",
  unavailable: 'We couldn’t find your location',
  timeout: 'Finding you took too long',
  unsupported: "Location isn't available in this browser",
} as const

const BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 font-status text-status text-on-ink focus-ring'

const ERROR_ICON_CLASS = 'text-notyet-text'

/**
 * The first screen: asks for the device location and explains every way that can go wrong (FR-008).
 * There is no city search; the app only ever uses the current location (FR-009).
 */
export function LandingPage() {
  const navigate = useNavigate()
  const { status, request } = useGeolocation()
  // `granted` can also mean "allowed on an earlier visit". Only show the spinner for a tap on this screen.
  const [started, setStarted] = useState(false)

  const start = async () => {
    setStarted(true)
    const position = await request()
    if (position) navigate('/home', { replace: true })
  }

  const retryButton = (
    <button type="button" onClick={start} className={BUTTON_CLASS}>
      {LANDING_COPY.retry}
    </button>
  )

  if (status === 'requesting' || (status === 'granted' && started)) {
    return (
      <EmptyState
        icon={
          <LoaderCircle size={40} className="animate-spin text-accent motion-reduce:animate-none" />
        }
        title={LANDING_COPY.requesting}
      />
    )
  }

  switch (status) {
    case 'denied':
      return (
        <EmptyState
          role="alert"
          icon={<MapPinOff size={40} className={ERROR_ICON_CLASS} />}
          title={LANDING_COPY.denied}
          action={retryButton}
        />
      )
    case 'blocked':
      return (
        <EmptyState
          role="alert"
          icon={<MapPinOff size={40} className={ERROR_ICON_CLASS} />}
          title={LANDING_COPY.blocked}
          hint={LANDING_COPY.blockedHint}
          action={retryButton}
        />
      )
    case 'unavailable':
      return (
        <EmptyState
          role="alert"
          icon={<TriangleAlert size={40} className={ERROR_ICON_CLASS} />}
          title={LANDING_COPY.unavailable}
          action={retryButton}
        />
      )
    case 'timeout':
      return (
        <EmptyState
          role="alert"
          icon={<TriangleAlert size={40} className={ERROR_ICON_CLASS} />}
          title={LANDING_COPY.timeout}
          action={retryButton}
        />
      )
    case 'unsupported':
      return (
        <EmptyState
          role="alert"
          icon={<MapPinOff size={40} className={ERROR_ICON_CLASS} />}
          title={LANDING_COPY.unsupported}
        />
      )
  }

  return (
    <EmptyState
      brand
      icon={<img src="/logo.svg" alt="" width={96} height={96} className="rounded-xl" />}
      title={LANDING_COPY.brand}
      hint={LANDING_COPY.pitch}
      action={
        <button type="button" onClick={start} className={BUTTON_CLASS}>
          <MapPin aria-hidden="true" size={16} />
          {LANDING_COPY.start}
        </button>
      }
    />
  )
}
