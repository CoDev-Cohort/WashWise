import { describe, expect, it } from 'vitest'
import { saveLocation } from '@/features/location/storage'
import { mockGeolocation, type MockGeolocationOptions } from '@/test/geolocation'
import { homeLoader, landingLoader } from './locationGuards'

/** Where a loader sends the user: a path, or `null` when it lets the page render. */
const destination = (result: Response | null) => (result ? result.headers.get('Location') : null)

interface Scenario {
  name: string
  browser: MockGeolocationOptions
  saved: boolean
  /** Where `/` and `/home` send the user. */
  landing: string | null
  home: string | null
}

const SCENARIOS: Scenario[] = [
  {
    name: 'first visit (not asked, nothing saved)',
    browser: { permission: 'prompt' },
    saved: false,
    landing: null,
    home: '/',
  },
  {
    name: 'allowed and a position is saved',
    browser: { permission: 'granted' },
    saved: true,
    landing: '/home',
    home: null,
  },
  {
    name: 'allowed but nothing is saved',
    browser: { permission: 'granted' },
    saved: false,
    landing: null,
    home: '/',
  },
  {
    name: 'revoked (blocked) with a position saved',
    browser: { permission: 'denied' },
    saved: true,
    landing: null,
    home: '/',
  },
  {
    name: 'reset to "ask" with a position saved',
    browser: { permission: 'prompt' },
    saved: true,
    landing: null,
    home: '/',
  },
  {
    name: 'no Permissions API, a position is saved',
    browser: { permissionsApi: false },
    saved: true,
    landing: null,
    home: '/',
  },
  {
    name: 'the permission query fails, a position is saved',
    browser: { queryThrows: true },
    saved: true,
    landing: null,
    home: '/',
  },
  {
    name: 'no location support at all',
    browser: { supported: false, permissionsApi: false },
    saved: false,
    landing: null,
    home: '/',
  },
]

describe.each(SCENARIOS)('route guards: $name', ({ browser, saved, landing, home }) => {
  const arrange = () => {
    mockGeolocation(browser)
    if (saved) saveLocation({ lat: 14.6, lon: 120.98 })
  }

  it(`"/" ${landing ? `redirects to ${landing}` : 'shows the landing page'}`, async () => {
    arrange()
    expect(destination(await landingLoader())).toBe(landing)
  })

  it(`"/home" ${home ? `redirects to ${home}` : 'renders'}`, async () => {
    arrange()
    expect(destination(await homeLoader())).toBe(home)
  })
})

describe('route guards: redirects', () => {
  it('are real redirect responses', async () => {
    mockGeolocation({ permission: 'granted' })
    saveLocation({ lat: 1, lon: 1 })
    const result = await landingLoader()
    expect(result).toBeInstanceOf(Response)
    expect(result?.status).toBe(302)
  })
})
