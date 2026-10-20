/**
 * WCAG 2.1 AA contrast for text and verdict colors in both themes (FR-014, SC-003),
 * plus a check that every token has a dark value (FR-013).
 */
import { describe, expect, it } from 'vitest'
import tokensCss from './tokens.css?raw'

type Tokens = Record<string, string>

function parseBlock(css: string, selector: string): Tokens {
  const match = new RegExp(`(?:^|\\n)${selector.replace('.', '\\.')}\\s*{([^}]*)}`).exec(css)
  if (!match) throw new Error(`No ${selector} block in tokens.css`)
  const tokens: Tokens = {}
  for (const [, name, value] of match[1]!.matchAll(/--ww-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[name!] = value!.toLowerCase()
  }
  return tokens
}

const light = parseBlock(tokensCss, ':root')
const dark = { ...light, ...parseBlock(tokensCss, '.dark') }

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

/** [foreground, background, minimum ratio]. 4.5 = normal text; 3 = large text or color-only indicators. */
const PAIRS: [string, string, number][] = [
  // Body text on surfaces
  ['ink', 'bg', 4.5],
  ['ink', 'surface', 4.5],
  ['ink-strong', 'bg', 4.5],
  ['ink-strong', 'surface-muted', 4.5],
  ['ink-muted', 'bg', 4.5],
  ['ink-muted', 'surface', 4.5],
  ['ink-section', 'bg', 4.5],
  ['accent', 'bg', 4.5],
  ['on-ink', 'ink', 4.5],
  // Verdict cards: sub-label and verdict word on the card, text on pills
  ['go-text', 'go-bg', 4.5],
  ['caution-text', 'caution-bg', 4.5],
  ['notyet-text', 'notyet-bg', 4.5],
  ['ink', 'go-bg', 4.5],
  ['ink', 'caution-bg', 4.5],
  ['ink', 'notyet-bg', 4.5],
  ['ink', 'go-pill', 4.5],
  ['ink', 'caution-pill', 4.5],
  ['ink', 'notyet-pill', 4.5],
  // Color-only indicators
  ['go-dot', 'bg', 3],
  ['caution-dot', 'bg', 3],
  ['notyet-dot', 'bg', 3],
  ['accent-alt', 'bg', 3],
]

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s theme', (_, theme) => {
  it.each(PAIRS)('%s on %s ≥ %s:1', (fg, bg, min) => {
    expect(theme[fg], `missing --ww-${fg}`).toBeDefined()
    expect(theme[bg], `missing --ww-${bg}`).toBeDefined()
    expect(contrast(theme[fg]!, theme[bg]!)).toBeGreaterThanOrEqual(min)
  })
})

describe('dark palette', () => {
  it('defines a dark value for every token', () => {
    const darkOnly = parseBlock(tokensCss, '.dark')
    expect(Object.keys(darkOnly).sort()).toEqual(Object.keys(light).sort())
  })

  it('keeps the three verdict dots distinguishable from each other', () => {
    for (const theme of [light, dark]) {
      expect(theme['go-dot']).not.toBe(theme['caution-dot'])
      expect(theme['caution-dot']).not.toBe(theme['notyet-dot'])
    }
  })

  it('the dark class on <html> switches the token values', () => {
    const style = document.createElement('style')
    style.textContent = tokensCss
    document.head.append(style)
    const read = () => getComputedStyle(document.documentElement).getPropertyValue('--ww-bg').trim()
    try {
      expect(read()).toBe(light.bg)
      document.documentElement.classList.add('dark')
      expect(read()).toBe(dark.bg)
    } finally {
      document.documentElement.classList.remove('dark')
      style.remove()
    }
  })

  it('computes contrast like the WCAG reference', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })
})
