import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { REAL_FIXTURES } from '@/features/forecast/__fixtures__/realFixtures'
import { normalizeForecast } from '@/features/forecast/normalize'
import { FORECAST_ENDPOINT } from '@/features/forecast/query'
import { forecastKey } from '@/features/forecast/useForecast'
import { GEOCODE_ENDPOINT } from '@/features/location/geocode'
import { RequireLocation } from '@/features/location/RequireLocation'
import { saveLocation } from '@/features/location/storage'
import { DARK_QUERY } from '@/features/theme/themeStorage'
import { computeDayVerdicts } from '@/features/verdict'
import { mockGeolocation } from '@/test/geolocation'
import { mockMatchMedia } from '@/test/matchMedia'
import { server } from '@/test/msw/server'
import { HomePage } from './HomePage'

const manila = REAL_FIXTURES.find((f) => f.meta.place === 'manila')!.response as JsonBodyType
const otherPlace = REAL_FIXTURES.find((f) => f.meta.place === 'london')!.response as JsonBodyType

/** 10:00 on the first forecast day in Manila (the fixture's day 0 is 2026-10-21 there). */
const NOW = Date.UTC(2026, 9, 21, 2, 0)

interface Setup {
  forecast?: () => Response | Promise<Response>
  geocode?: () => Response | Promise<Response>
  /** A client with forecasts already in it, as restored from the device. */
  client?: QueryClient
}

async function setup({ forecast, geocode, client = createQueryClient() }: Setup = {}) {
  mockMatchMedia({ [DARK_QUERY]: false })
  const geo = mockGeolocation({ permission: 'granted' })
  saveLocation({ lat: 14.6, lon: 120.98 })
  let requests = 0
  server.use(
    http.get(GEOCODE_ENDPOINT, async () =>
      geocode ? geocode() : HttpResponse.json({ city: 'Manila' }),
    ),
    http.get(FORECAST_ENDPOINT, async () => {
      requests++
      return forecast ? forecast() : HttpResponse.json(manila)
    }),
  )
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Landing</p> },
      { element: <RequireLocation />, children: [{ path: '/home', element: <HomePage /> }] },
    ],
    { initialEntries: ['/home'] },
  )
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  // The quiet position refresh on mount: answer it with the same cell.
  await waitFor(() => expect(geo.pending()).toBe(1))
  await act(async () => geo.resolvePosition({ lat: 14.6, lon: 120.98 }))
  return { geo, router, requests: () => requests }
}

const chartTimes = () =>
  within(screen.getByRole('region', { name: 'Rain chance' }))
    .getAllByRole('listitem', { hidden: true })
    .map((li) => li.textContent ?? '')
    .filter((text) => text.includes(':'))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
})
afterEach(() => {
  vi.useRealTimers()
  document.documentElement.className = ''
  document.documentElement.removeAttribute('style')
})

describe('HomePage', () => {
  it('shows the sections in order: header, title and strip, cards, chart, Other Days', async () => {
    await setup()
    const day = await screen.findByRole('group', { name: 'Choose a day' })
    const order = [
      screen.getByRole('button', { name: 'Update location, Manila' }),
      screen.getByRole('heading', { name: 'Should you wash?' }),
      day,
      screen.getByRole('article', { name: 'Laundry' }),
      screen.getByRole('article', { name: 'Car wash' }),
      screen.getByRole('region', { name: 'Rain chance' }),
      screen.getByRole('region', { name: 'Other days' }),
    ]
    order.slice(1).forEach((el, i) => {
      expect(order[i]!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  it('selects Today first and shows its next five hours', async () => {
    await setup()
    expect(await screen.findByRole('button', { name: /^Today/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const hours = chartTimes().map((text) => text.split(':')[0])
    expect(hours).toEqual(['10 AM', '11 AM', '12 PM', '1 PM', '2 PM'])
  })

  it('choosing another day updates the cards and the chart together', async () => {
    await setup()
    const forecast = normalizeForecast(manila)
    const verdicts = computeDayVerdicts(forecast)
    const dayButtons = await screen.findAllByRole('button', { pressed: false })
    const target = dayButtons.find((b) => b.textContent?.startsWith('SAT'))!
    await userEvent.click(target)

    expect(target).toHaveAttribute('aria-pressed', 'true')
    expect(chartTimes().map((text) => text.split(':')[0])).toEqual([
      '12 PM',
      '1 PM',
      '2 PM',
      '3 PM',
      '4 PM',
    ])
    const saturday = verdicts[3]!
    const laundry = screen.getByRole('article', { name: 'Laundry' })
    const carWash = screen.getByRole('article', { name: 'Car wash' })
    if (saturday.laundry.status === 'ok') {
      expect(laundry).toHaveTextContent(saturday.laundry.subLabel)
    }
    if (saturday.carWash.status === 'ok') {
      expect(carWash).toHaveTextContent(saturday.carWash.subLabel)
    }
  })

  it('shows a loading state first, then the forecast', async () => {
    await setup({
      forecast: async () => {
        await delay(50)
        return HttpResponse.json(manila)
      },
    })
    expect(screen.getByRole('heading', { name: 'Should you wash?' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading forecast' })).toBeInTheDocument()
    expect(await screen.findByRole('article', { name: 'Laundry' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading forecast' })).not.toBeInTheDocument()
  })

  it('shows an alert when the forecast fails, and Try again loads it', async () => {
    let fail = true
    await setup({
      forecast: () =>
        fail ? new HttpResponse('nope', { status: 400 }) : HttpResponse.json(manila),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load the forecast')
    expect(screen.getByRole('heading', { name: 'Should you wash?' })).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('article', { name: 'Laundry' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('tapping the pill shows the spinner, asks for the position and refetches', async () => {
    const { geo, requests } = await setup()
    await screen.findByRole('article', { name: 'Laundry' })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Update location, Manila' })).toBeEnabled(),
    )
    const before = requests()

    await userEvent.click(screen.getByRole('button', { name: 'Update location, Manila' }))
    await waitFor(() => expect(geo.pending()).toBe(1))
    expect(screen.getByTestId('pill-spinner')).toBeInTheDocument()
    await act(async () => geo.resolvePosition({ lat: 14.6, lon: 120.98 }))
    await waitFor(() => expect(requests()).toBe(before + 1))
    await waitFor(() => expect(screen.queryByTestId('pill-spinner')).not.toBeInTheDocument())
  })

  it('keeps the forecast on screen when the pill refresh fails', async () => {
    const { geo, router } = await setup()
    await screen.findByRole('article', { name: 'Laundry' })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Update location, Manila' })).toBeEnabled(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Update location, Manila' }))
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.rejectWith(3))
    await waitFor(() => expect(screen.queryByTestId('pill-spinner')).not.toBeInTheDocument())
    expect(screen.getByRole('article', { name: 'Laundry' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
  })

  it('keeps the previous forecast visible while a new location loads', async () => {
    const { geo } = await setup({
      forecast: async () => {
        await delay(10)
        return HttpResponse.json(manila)
      },
    })
    await screen.findByRole('article', { name: 'Laundry' })
    server.use(
      http.get(FORECAST_ENDPOINT, async ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('latitude') === '10.31') {
          await delay(200)
          return HttpResponse.json(otherPlace)
        }
        return HttpResponse.json(manila)
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Update location, Manila' })).toBeEnabled(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Update location, Manila' }))
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.resolvePosition({ lat: 10.31, lon: 123.89 }))
    // While the new cell loads, the cards never disappear.
    expect(screen.getByRole('article', { name: 'Laundry' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading forecast' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('pill-spinner')).not.toBeInTheDocument())
    expect(screen.getByRole('article', { name: 'Laundry' })).toBeInTheDocument()
  })

  it('the theme toggle flips the dark class and keeps the choice', async () => {
    await setup()
    await screen.findByRole('article', { name: 'Laundry' })
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('ww-theme')).toBe('dark')
    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('ww-theme')).toBe('light')
  })

  it('lists Other Days without Today', async () => {
    await setup()
    const section = await screen.findByRole('region', { name: 'Other days' })
    expect(within(section).getAllByRole('listitem')).toHaveLength(5)
  })
})

const PILL = (place: string) => ({ name: `Update location, ${place}` })

async function tapPill(
  geo: Awaited<ReturnType<typeof setup>>['geo'],
  to = { lat: 14.6, lon: 120.98 },
) {
  await waitFor(() => expect(screen.getByRole('button', PILL('Manila'))).toBeEnabled())
  await userEvent.click(screen.getByRole('button', PILL('Manila')))
  await waitFor(() => expect(geo.pending()).toBe(1))
  await act(async () => geo.resolvePosition(to))
}

describe('HomePage first-load errors (P4 FR-004 – FR-006)', () => {
  it.each([
    ['offline', () => HttpResponse.error(), 'You’re offline'],
    [
      'a service error',
      () => new HttpResponse('down', { status: 503 }),
      'The forecast service is having trouble',
    ],
    [
      'an unusable response',
      () => new HttpResponse('{not json', { status: 200 }),
      'We couldn’t load the forecast',
    ],
  ])('%s shows its own label with the same icon and Try again', async (_, forecast, label) => {
    await setup({ forecast })
    // Network and 5xx are retried once (about 1 s) before the error shows.
    const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
    expect(within(alert).getByRole('heading', { name: label })).toBeInTheDocument()
    expect(alert.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('a forecast that never answers shows the "too long" label', async () => {
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout'],
      now: NOW,
      shouldAdvanceTime: true,
    })
    await setup({
      forecast: async () => {
        await delay('infinite')
        return HttpResponse.json(manila)
      },
    })
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByRole('heading', { name: 'The forecast is taking too long' }),
    ).toBeInTheDocument()
  })

  it('Try again shows the skeleton, sends one request and then the forecast', async () => {
    let fail = true
    const { requests } = await setup({
      forecast: async () => {
        await delay(30)
        return fail ? new HttpResponse('nope', { status: 400 }) : HttpResponse.json(manila)
      },
    })
    await screen.findByRole('alert')
    const before = requests()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading forecast' })).toBeInTheDocument()
    expect(await screen.findByRole('article', { name: 'Laundry' })).toBeInTheDocument()
    expect(requests()).toBe(before + 1)
  })

  it('keeps the header usable on the error screen', async () => {
    await setup({ forecast: () => new HttpResponse('nope', { status: 400 }) })
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeEnabled()
    await waitFor(() => expect(screen.getByRole('button', PILL('Manila'))).toBeEnabled())
  })
})

describe('HomePage failed updates (P4 FR-007)', () => {
  it('keeps the forecast and shows a polite banner; a later success removes it', async () => {
    let fail = false
    const { geo } = await setup({
      forecast: async () => {
        await delay(30)
        return fail ? new HttpResponse('nope', { status: 400 }) : HttpResponse.json(manila)
      },
    })
    await screen.findByRole('article', { name: 'Laundry' })
    fail = true
    await tapPill(geo)

    const banner = await screen.findByRole('status')
    expect(banner).toHaveTextContent('Couldn’t update the forecast')
    expect(banner).toHaveTextContent('Showing the last forecast that loaded')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Laundry' })).toBeInTheDocument()

    expect(screen.getByText('Updated just now')).toBeInTheDocument()

    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled()
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.getByRole('article', { name: 'Laundry' })).toBeInTheDocument()
  })

  it('when the new place fails, keeps the old forecast and its place name, and says so', async () => {
    const { geo } = await setup()
    await screen.findByRole('article', { name: 'Laundry' })
    server.use(
      http.get(GEOCODE_ENDPOINT, ({ request }) =>
        HttpResponse.json({
          city: new URL(request.url).searchParams.get('latitude') === '10.31' ? 'Cebu' : 'Manila',
        }),
      ),
      http.get(FORECAST_ENDPOINT, ({ request }) =>
        new URL(request.url).searchParams.get('latitude') === '10.31'
          ? new HttpResponse('nope', { status: 400 })
          : HttpResponse.json(manila),
      ),
    )
    await tapPill(geo, { lat: 10.31, lon: 123.89 })

    const banner = await screen.findByRole('status')
    expect(banner).toHaveTextContent('Showing the forecast for your previous location')
    expect(screen.getByRole('article', { name: 'Laundry' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading forecast' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', PILL('Manila'))).toBeInTheDocument())
  })
})

describe('HomePage place name (P4 FR-009)', () => {
  it('a failed place-name lookup shows "Your location" and no error', async () => {
    await setup({ geocode: () => new HttpResponse('nope', { status: 400 }) })
    expect(await screen.findByRole('article', { name: 'Laundry' })).toBeInTheDocument()
    expect(screen.getByRole('button', PILL('Your location'))).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders the whole page without waiting for a slow place name', async () => {
    await setup({
      geocode: async () => {
        await delay('infinite')
        return HttpResponse.json({ city: 'Manila' })
      },
    })
    expect(await screen.findByRole('region', { name: 'Other days' })).toBeInTheDocument()
    expect(screen.getByRole('button', PILL('Your location'))).toBeInTheDocument()
  })
})

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** A client holding the Manila forecast as if restored from the device, received `age` ms ago. */
function restoredClient(age: number, fetchedAt = NOW - age) {
  const client = createQueryClient()
  client.setQueryData(forecastKey(14.6, 120.98), normalizeForecast(manila, fetchedAt), {
    updatedAt: NOW - age,
  })
  return client
}

/**
 * What the device reports. TanStack only hears the event once a client is mounted, so offline tests
 * also make the network fail, as it would for real.
 */
function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  window.dispatchEvent(new Event(online ? 'online' : 'offline'))
}

let networkUp = true
const forecastWhenUp = () => (networkUp ? HttpResponse.json(manila) : HttpResponse.error())

describe('HomePage offline and restored forecasts (P4.2)', () => {
  afterEach(() => {
    onlineManager.setOnline(true)
    networkUp = true
  })

  it('a restored forecast renders without waiting for the network (SC-005)', async () => {
    const { requests } = await setup({
      client: restoredClient(5 * MINUTE),
      forecast: async () => {
        await delay('infinite')
        return HttpResponse.json(manila)
      },
    })
    expect(screen.getByRole('article', { name: 'Laundry' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // Younger than the 30-minute freshness window: no background request.
    expect(requests()).toBe(0)
  })

  it('a restored forecast older than 30 minutes refetches in the background, with no banner', async () => {
    const { requests } = await setup({
      client: restoredClient(31 * MINUTE),
      forecast: async () => {
        await delay('infinite')
        return HttpResponse.json(manila)
      },
    })
    expect(screen.getByRole('article', { name: 'Laundry' })).toBeInTheDocument()
    await waitFor(() => expect(requests()).toBe(1))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('a forecast received yesterday starts at the real today', async () => {
    vi.setSystemTime(NOW + 24 * HOUR)
    setOnline(false)
    await setup({ client: restoredClient(24 * HOUR), forecast: () => HttpResponse.error() })
    const today = screen.getByRole('button', { name: /^Today/ })
    const days = within(screen.getByRole('group', { name: 'Choose a day' })).getAllByRole('button')
    expect(days[0]).toBe(today)
    // The fixture's second day (THU 22) is now Today, so no strip button is labelled THU.
    expect(screen.queryByRole('button', { name: /^THU/ })).not.toBeInTheDocument()
  })

  it('offline: shows the last forecast with "You’re offline" and its age, which keeps counting', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'], now: NOW })
    setOnline(false)
    networkUp = false
    await setup({ client: restoredClient(2 * HOUR), forecast: forecastWhenUp })
    expect(screen.getByRole('article', { name: 'Laundry' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('You’re offline')
    expect(screen.getByRole('status')).toHaveTextContent('Showing the last forecast that loaded')
    expect(screen.getByText('Updated 2 h ago')).toBeInTheDocument()

    await act(async () => vi.advanceTimersByTime(60 * MINUTE))
    await waitFor(() => expect(screen.getByText('Updated 3 h ago')).toBeInTheDocument())
  })

  it('the banner goes once the connection is back and a fresh forecast loads (FR-006)', async () => {
    setOnline(false)
    networkUp = false
    await setup({ client: restoredClient(2 * HOUR), forecast: forecastWhenUp })
    expect(screen.getByText('Updated 2 h ago')).toBeInTheDocument()

    networkUp = true
    act(() => setOnline(true))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.getByRole('article', { name: 'Laundry' })).toBeInTheDocument()
  })

  it('offline with nothing saved shows the offline error, not a skeleton', async () => {
    setOnline(false)
    await setup({ forecast: () => HttpResponse.error() })
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re offline')
  })
})
