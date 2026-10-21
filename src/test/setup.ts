import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { restoreGeolocation } from './geolocation'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  restoreGeolocation()
  try {
    localStorage.clear()
  } catch {
    // jsdom always has storage; ignore in case a test replaced it.
  }
})
afterAll(() => server.close())
