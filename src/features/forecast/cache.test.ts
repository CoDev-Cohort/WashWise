import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { REAL_FIXTURES } from './__fixtures__/realFixtures'
import { getLatestForecast } from './cache'
import { normalizeForecast } from './normalize'
import { forecastKey } from './useForecast'

const fixture = (place: string) =>
  normalizeForecast(REAL_FIXTURES.find((f) => f.meta.place === place)!.response)

describe('getLatestForecast', () => {
  it('is undefined with nothing cached', () => {
    expect(getLatestForecast(createQueryClient())).toBeUndefined()
  })

  it('returns the newest forecast and its position, whatever the cell', () => {
    const client = createQueryClient()
    client.setQueryData(forecastKey(14.6, 120.98), fixture('manila'), { updatedAt: 3_000 })
    client.setQueryData(forecastKey(51.51, -0.13), fixture('london'), { updatedAt: 5_000 })
    client.setQueryData(forecastKey(33.45, -112.07), fixture('phoenix'), { updatedAt: 4_000 })
    client.setQueryData(['place', 1, 2], 'not a forecast', { updatedAt: 9_000 })

    expect(getLatestForecast(client)).toEqual({
      data: client.getQueryData(forecastKey(51.51, -0.13)),
      coords: { lat: 51.51, lon: -0.13 },
    })
  })

  it('skips the disabled placeholder key', () => {
    const client = createQueryClient()
    client.setQueryData(['forecast', 'disabled'], fixture('manila'))
    expect(getLatestForecast(client)).toBeUndefined()
  })
})
