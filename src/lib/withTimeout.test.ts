import { afterEach, describe, expect, it, vi } from 'vitest'
import { TimeoutError, withTimeout } from './withTimeout'

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('aborts with a TimeoutError after the given time', () => {
    vi.useFakeTimers()
    const t = withTimeout(undefined, 10_000)
    vi.advanceTimersByTime(9_999)
    expect(t.signal.aborted).toBe(false)
    vi.advanceTimersByTime(1)
    expect(t.signal.aborted).toBe(true)
    expect(t.signal.reason).toBeInstanceOf(TimeoutError)
  })

  it('aborts when the caller aborts, with the caller’s reason', () => {
    const caller = new AbortController()
    const t = withTimeout(caller.signal, 10_000)
    caller.abort('cancelled')
    expect(t.signal.aborted).toBe(true)
    expect(t.signal.reason).toBe('cancelled')
    t.clear()
  })

  it('is already aborted if the caller signal was', () => {
    const caller = new AbortController()
    caller.abort('early')
    expect(withTimeout(caller.signal, 10_000).signal.aborted).toBe(true)
  })

  it('clear() stops the timer', () => {
    vi.useFakeTimers()
    const t = withTimeout(undefined, 1_000)
    t.clear()
    vi.advanceTimersByTime(5_000)
    expect(t.signal.aborted).toBe(false)
  })
})
