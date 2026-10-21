import { describe, expect, it } from 'vitest'
import { errorLabel, GENERIC, OFFLINE, SERVICE, TOO_SLOW } from './errorLabel'
import { ForecastError } from './errors'

describe('errorLabel', () => {
  it.each([
    ['network', new ForecastError('network', 'x'), OFFLINE],
    ['timeout', new ForecastError('timeout', 'x'), TOO_SLOW],
    ['http 500', new ForecastError('http', 'x', { status: 500 }), SERVICE],
    ['http 503', new ForecastError('http', 'x', { status: 503 }), SERVICE],
    ['http 499', new ForecastError('http', 'x', { status: 499 }), GENERIC],
    ['http 429', new ForecastError('http', 'x', { status: 429 }), GENERIC],
    ['http without status', new ForecastError('http', 'x'), GENERIC],
    ['invalid', new ForecastError('invalid', 'x'), GENERIC],
    ['not a ForecastError', new Error('x'), GENERIC],
    ['nothing', undefined, GENERIC],
  ])('%s → its label', (_, error, copy) => {
    expect(errorLabel(error, { online: true })).toBe(copy)
  })

  it.each([
    ['timeout', new ForecastError('timeout', 'x')],
    ['http 503', new ForecastError('http', 'x', { status: 503 })],
    ['invalid', new ForecastError('invalid', 'x')],
  ])('offline wins over %s', (_, error) => {
    expect(errorLabel(error, { online: false })).toBe(OFFLINE)
  })
})
