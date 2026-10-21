import { useCallback, useEffect, useRef, useState } from 'react'
import { LocationError } from './errors'
import {
  getPosition,
  isGeolocationSupported,
  queryPermission,
  watchPermission,
} from './geolocation'
import { loadSavedLocation, saveLocation } from './storage'
import type { Coordinates, LocationStatus } from './types'

export interface UseGeolocationOptions {
  /** With permission already granted, quietly fetch a fresh position on mount (FR-013). */
  refreshOnMount?: boolean
}

export interface UseGeolocationResult {
  status: LocationStatus
  /** The saved position on the first render, then the latest one obtained. */
  coordinates: Coordinates | undefined
  /** Asks the device for the position. Resolves with it, or `undefined` if it failed. */
  request: () => Promise<Coordinates | undefined>
}

/** Keeps the same object when the position hasn't changed, so dependants don't re-run. */
const keepIfSame = (next: Coordinates) => (prev: Coordinates | undefined) =>
  prev && prev.lat === next.lat && prev.lon === next.lon ? prev : next

/**
 * The device's location and the state of the permission request (FR-001 – FR-007, FR-013).
 * Never asks for the position on its own, except to refresh it when permission is already granted.
 */
export function useGeolocation({
  refreshOnMount = false,
}: UseGeolocationOptions = {}): UseGeolocationResult {
  const [status, setStatus] = useState<LocationStatus>(() =>
    isGeolocationSupported() ? 'idle' : 'unsupported',
  )
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>(loadSavedLocation)
  const mounted = useRef(true)
  const requesting = useRef(false)

  /** A refused request is "blocked" if the browser won't ask again, otherwise plain "denied". */
  const handleDenied = useCallback(async () => {
    const permission = await queryPermission()
    if (mounted.current) setStatus(permission === 'denied' ? 'blocked' : 'denied')
  }, [])

  const request = useCallback(async () => {
    if (!isGeolocationSupported() || requesting.current) return undefined
    requesting.current = true
    setStatus('requesting')
    try {
      const position = await getPosition()
      saveLocation(position)
      if (mounted.current) {
        setCoordinates(keepIfSame(position))
        setStatus('granted')
      }
      return position
    } catch (error) {
      const kind = error instanceof LocationError ? error.kind : 'unavailable'
      if (kind === 'denied') await handleDenied()
      else if (mounted.current) setStatus(kind)
      return undefined
    } finally {
      requesting.current = false
    }
  }, [handleDenied])

  useEffect(() => {
    mounted.current = true
    if (!isGeolocationSupported()) return

    let active = true

    /** The background refresh. Failures other than a refusal are ignored: the saved position stays. */
    const refresh = async () => {
      try {
        const position = await getPosition()
        saveLocation(position)
        if (active) setCoordinates(keepIfSame(position))
      } catch (error) {
        if (error instanceof LocationError && error.kind === 'denied') await handleDenied()
      }
    }

    void queryPermission().then((permission) => {
      if (!active) return
      if (permission === 'denied') {
        setStatus((current) => (current === 'requesting' ? current : 'blocked'))
      } else if (permission === 'granted' && loadSavedLocation()) {
        setStatus((current) => (current === 'idle' ? 'granted' : current))
        if (refreshOnMount) void refresh()
      }
    })

    const stopWatching = watchPermission((permission) => {
      if (!active) return
      if (permission === 'denied') setStatus('blocked')
      else if (permission === 'prompt')
        setStatus((current) => (current === 'granted' ? 'idle' : current))
    })

    return () => {
      active = false
      mounted.current = false
      stopWatching()
    }
  }, [refreshOnMount, handleDenied])

  return { status, coordinates, request }
}
