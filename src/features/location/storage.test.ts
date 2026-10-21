import { afterEach, describe, expect, it, vi } from 'vitest'
import { LOCATION_STORAGE_KEY, loadSavedLocation, saveLocation } from './storage'

afterEach(() => vi.restoreAllMocks())

describe('loadSavedLocation', () => {
  it('returns undefined when nothing is saved', () => {
    expect(loadSavedLocation()).toBeUndefined()
  })

  it.each([
    ['bad JSON', '{nope'],
    ['not an object', '42'],
    ['null', 'null'],
    ['missing lon', '{"lat":1}'],
    ['strings instead of numbers', '{"lat":"1","lon":"2"}'],
    ['NaN written as null', '{"lat":null,"lon":2}'],
    ['latitude above 90', '{"lat":91,"lon":0}'],
    ['latitude below -90', '{"lat":-90.5,"lon":0}'],
    ['longitude above 180', '{"lat":0,"lon":181}'],
    ['longitude below -180', '{"lat":0,"lon":-181}'],
  ])('returns undefined for %s', (_name, raw) => {
    localStorage.setItem(LOCATION_STORAGE_KEY, raw)
    expect(loadSavedLocation()).toBeUndefined()
  })

  it.each([[{ lat: 90, lon: 180 }], [{ lat: -90, lon: -180 }], [{ lat: 14.6, lon: 120.98 }]])(
    'accepts %j',
    (coords) => {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(coords))
      expect(loadSavedLocation()).toEqual(coords)
    },
  )

  it('returns undefined, without throwing, when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(loadSavedLocation()).toBeUndefined()
  })

  it('drops extra fields from the stored record', () => {
    localStorage.setItem(LOCATION_STORAGE_KEY, '{"lat":1,"lon":2,"name":"x"}')
    expect(loadSavedLocation()).toEqual({ lat: 1, lon: 2 })
  })
})

describe('saveLocation', () => {
  it('round-trips, rounded to 2 dp', () => {
    saveLocation({ lat: 14.59951, lon: 120.98421 })
    expect(loadSavedLocation()).toEqual({ lat: 14.6, lon: 120.98 })
  })

  it('overwrites the previous position', () => {
    saveLocation({ lat: 1, lon: 1 })
    saveLocation({ lat: 2, lon: 2 })
    expect(loadSavedLocation()).toEqual({ lat: 2, lon: 2 })
  })

  it('does not throw when storage is full or blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => saveLocation({ lat: 1, lon: 1 })).not.toThrow()
  })
})
