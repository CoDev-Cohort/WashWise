import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { REAL_FIXTURES } from '@/features/forecast/__fixtures__/realFixtures'
import { normalizeForecast } from '@/features/forecast/normalize'
import { FORECAST_ENDPOINT } from '@/features/forecast/query'
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
}

async function setup({ forecast }: Setup = {}) {
  mockMatchMedia({ [DARK_QUERY]: false })
  const geo = mockGeolocation({ permission: 'granted' })
  saveLocation({ lat: 14.6, lon: 120.98 })
  let requests = 0
  server.use(
    http.get(GEOCODE_ENDPOINT, () => HttpResponse.json({ city: 'Manila' })),
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
    <QueryClientProvider client={createQueryClient()}>
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
    const target = dayButtons.find((b) => b.getAttribute('aria-label')?.startsWith('SAT'))!
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
