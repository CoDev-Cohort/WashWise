import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockMatchMedia } from '@/test/matchMedia'
import indexHtml from '../../../index.html?raw'
import {
  applyTheme,
  DARK_QUERY,
  readTheme,
  resolveTheme,
  THEME_KEY,
  writeTheme,
  type Theme,
} from './themeStorage'

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.className = ''
  document.documentElement.removeAttribute('style')
})

describe('resolveTheme', () => {
  it.each([
    [undefined, false, 'light'],
    [undefined, true, 'dark'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
  ] as const)('stored %s, system dark %s → %s', (stored, systemDark, expected) => {
    expect(resolveTheme(stored, systemDark)).toBe(expected)
  })
})

describe('readTheme / writeTheme', () => {
  it('round-trips a choice', () => {
    writeTheme('dark')
    expect(readTheme()).toBe('dark')
  })

  it.each([null, '', 'blue', 'DARK', '{"theme":"dark"}'])(
    'ignores the stored value %j',
    (value) => {
      if (value !== null) localStorage.setItem(THEME_KEY, value)
      expect(readTheme()).toBeUndefined()
    },
  )

  it('tolerates storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readTheme()).toBeUndefined()
    expect(() => writeTheme('dark')).not.toThrow()
  })
})

describe('applyTheme', () => {
  it('sets the dark class and the browser UI color', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#1F335C">'
    applyTheme('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#0E1729')
    applyTheme('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#1F335C')
    document.head.innerHTML = ''
  })
})

/**
 * index.html carries a copy of the choice logic that runs before first paint (no flash). This keeps
 * the copy and `resolveTheme` in agreement (plan risk 2).
 */
describe('the no-flash script in index.html', () => {
  const script = /<script id="theme-init">([\s\S]*?)<\/script>/.exec(indexHtml)?.[1]

  it('exists and uses the same storage key and media query', () => {
    expect(script).toBeDefined()
    expect(script).toContain(THEME_KEY)
    expect(script).toContain(DARK_QUERY)
  })

  it.each([
    [undefined, false],
    [undefined, true],
    ['light', true],
    ['light', false],
    ['dark', true],
    ['dark', false],
    ['garbage', true],
  ] as const)('stored %s, system dark %s → same theme as resolveTheme', (stored, systemDark) => {
    mockMatchMedia({ [DARK_QUERY]: systemDark })
    if (stored) localStorage.setItem(THEME_KEY, stored)
    new Function(script!)()
    const valid: Theme | undefined = stored === 'light' || stored === 'dark' ? stored : undefined
    const expected = resolveTheme(valid, systemDark)
    expect(document.documentElement.classList.contains('dark')).toBe(expected === 'dark')
    expect(document.documentElement.style.colorScheme).toBe(expected)
  })

  it('does not throw when storage and matchMedia fail', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    window.matchMedia = (() => {
      throw new Error('no matchMedia')
    }) as typeof window.matchMedia
    expect(() => new Function(script!)()).not.toThrow()
  })
})
