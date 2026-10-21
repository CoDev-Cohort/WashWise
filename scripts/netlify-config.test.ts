import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'smol-toml'
import { describe, expect, it } from 'vitest'
import { SECURITY_HEADERS } from './check-deploy'

// Guards netlify.toml (P4.5): a wrong edit here breaks location, updates or deep links for every user.

interface NetlifyConfig {
  build: { command: string; publish: string; environment: Record<string, string> }
  redirects: { from: string; to: string; status: number; force?: boolean }[]
  headers: { for: string; values: Record<string, string> }[]
}

const config = parse(
  readFileSync(resolve(process.cwd(), 'netlify.toml'), 'utf8'),
) as unknown as NetlifyConfig
const headersFor = (path: string) =>
  Object.fromEntries(
    Object.entries(config.headers.find((h) => h.for === path)?.values ?? {}).map(([k, v]) => [
      k.toLowerCase(),
      v,
    ]),
  )

describe('netlify.toml', () => {
  it('builds like CI and publishes the Vite output', () => {
    expect(config.build.command).toContain('pnpm build')
    expect(config.build.publish).toBe('dist')
    expect(config.build.environment.NODE_VERSION).toBe(
      readFileSync(resolve(process.cwd(), '.nvmrc'), 'utf8').trim(),
    )
  })

  it('serves the app for every path, without overriding real files', () => {
    const fallback = config.redirects.find((r) => r.from === '/*')
    expect(fallback).toMatchObject({ to: '/index.html', status: 200 })
    expect(fallback?.force).not.toBe(true)
  })

  it('answers a missing asset with a real 404, before the app fallback (R3)', () => {
    const assets = config.redirects.findIndex((r) => r.from === '/assets/*')
    const fallback = config.redirects.findIndex((r) => r.from === '/*')
    expect(config.redirects[assets]).toMatchObject({ to: '/404.html', status: 404 })
    expect(assets).toBeLessThan(fallback)
  })

  it.each(['/', '/index.html', '/sw.js', '/manifest.webmanifest'])(
    '%s is always revalidated',
    (path) => {
      expect(headersFor(path)['cache-control']).toBe('no-cache')
    },
  )

  it('serves the manifest with its own type, so nosniff keeps install working (R4)', () => {
    expect(headersFor('/manifest.webmanifest')['content-type']).toBe('application/manifest+json')
  })

  it('caches fingerprinted assets for good', () => {
    expect(headersFor('/assets/*')['cache-control']).toContain('immutable')
  })

  it.each(Object.entries(SECURITY_HEADERS))('sends %s on every path', (name, ok) => {
    const value = headersFor('/*')[name]
    expect(value, name).toBeDefined()
    expect(ok(value!)).toBe(true)
  })
})
