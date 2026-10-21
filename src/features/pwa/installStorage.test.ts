import { afterEach, describe, expect, it, vi } from 'vitest'
import { countVisit, dismissInstall, getVisits, isInstallDismissed } from './installStorage'

afterEach(() => sessionStorage.clear())

describe('installStorage', () => {
  it('counts one visit per session', () => {
    expect(getVisits()).toBe(0)
    countVisit()
    countVisit()
    expect(getVisits()).toBe(1)
    sessionStorage.clear() // a new session
    countVisit()
    expect(getVisits()).toBe(2)
  })

  it('ignores a garbled count', () => {
    localStorage.setItem('ww-visits', 'lots')
    expect(getVisits()).toBe(0)
  })

  it('remembers a dismissal', () => {
    expect(isInstallDismissed()).toBe(false)
    dismissInstall()
    expect(isInstallDismissed()).toBe(true)
  })

  it('never throws when storage is blocked', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)
    expect(() => countVisit()).not.toThrow()
    expect(() => dismissInstall()).not.toThrow()
    expect(getVisits()).toBe(0)
    expect(isInstallDismissed()).toBe(false)
  })
})
