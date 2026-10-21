import { describe, expect, it } from 'vitest'
import { checkDeploy } from './check-deploy'

const BASE = 'https://washwise.netlify.app'
const PAGE =
  '<html><body><div id="root"></div><script src="/assets/index-abc123.js"></script></body></html>'
const SECURITY = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'geolocation=(self), camera=(), microphone=(), payment=()',
}

type Site = Record<string, { status?: number; headers?: Record<string, string>; body?: string }>

/** A correctly configured deploy, as `netlify.toml` produces it. */
function goodSite(kind: 'preview' | 'production'): Site {
  const robots: Record<string, string> = kind === 'preview' ? { 'x-robots-tag': 'noindex' } : {}
  // A fresh object per path, so a test can break one path without touching the others.
  const app = () => ({
    body: PAGE,
    headers: { ...SECURITY, ...robots, 'cache-control': 'no-cache' },
  })
  return {
    'http://washwise.netlify.app/': { status: 301, headers: { location: `${BASE}/` } },
    [`${BASE}/`]: app(),
    [`${BASE}/home`]: app(),
    [`${BASE}/no-such-page`]: app(),
    [`${BASE}/index.html`]: app(),
    [`${BASE}/sw.js`]: {
      headers: { 'cache-control': 'no-cache', 'content-type': 'application/javascript' },
    },
    [`${BASE}/manifest.webmanifest`]: {
      headers: { 'cache-control': 'no-cache', 'content-type': 'application/manifest+json' },
    },
    [`${BASE}/assets/index-abc123.js`]: {
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
    },
    [`${BASE}/assets/does-not-exist.js`]: { status: 404 },
  }
}

const fetchFrom = (site: Site) => async (url: string) => {
  const page = site[url]
  if (!page) return new Response('not stubbed', { status: 599 })
  return new Response(page.body ?? '', { status: page.status ?? 200, headers: page.headers })
}

function broken(kind: 'preview' | 'production', change: (site: Site) => void) {
  const site = goodSite(kind)
  change(site)
  return checkDeploy(BASE, kind, fetchFrom(site))
}

describe('checkDeploy', () => {
  it.each(['preview', 'production'] as const)('a correct %s deploy passes', async (kind) => {
    expect(await checkDeploy(BASE, kind, fetchFrom(goodSite(kind)))).toEqual([])
  })

  it.each([
    ['http:// not redirected', (s: Site) => (s['http://washwise.netlify.app/'] = { body: PAGE })],
    ['a deep link 404s', (s: Site) => (s[`${BASE}/home`] = { status: 404 })],
    [
      'a missing asset answered with the app (R3)',
      (s: Site) => (s[`${BASE}/assets/does-not-exist.js`] = { body: PAGE }),
    ],
    [
      'sw.js cached',
      (s: Site) =>
        (s[`${BASE}/sw.js`] = {
          headers: { 'cache-control': 'max-age=3600', 'content-type': 'application/javascript' },
        }),
    ],
    [
      'the manifest served with the wrong type (R4)',
      (s: Site) =>
        (s[`${BASE}/manifest.webmanifest`] = {
          headers: { 'cache-control': 'no-cache', 'content-type': 'text/plain' },
        }),
    ],
    [
      'location blocked by Permissions-Policy (R4)',
      (s: Site) =>
        (s[`${BASE}/`]!.headers = {
          ...s[`${BASE}/`]!.headers,
          'permissions-policy': 'geolocation=()',
        }),
    ],
    [
      'a security header missing',
      (s: Site) => {
        delete s[`${BASE}/`]!.headers!['x-frame-options']
      },
    ],
    [
      'assets not immutable',
      (s: Site) =>
        (s[`${BASE}/assets/index-abc123.js`] = { headers: { 'cache-control': 'no-cache' } }),
    ],
  ])('fails when %s', async (_, change) => {
    expect(await broken('production', change)).toHaveLength(1)
  })

  it('fails a preview that search engines could index', async () => {
    const problems = await broken('preview', (s) => {
      s[`${BASE}/`]!.headers = { ...SECURITY, 'cache-control': 'no-cache' }
    })
    expect(problems).toEqual(['preview is missing X-Robots-Tag: noindex'])
  })

  it('fails production marked noindex', async () => {
    const problems = await broken('production', (s) => {
      s[`${BASE}/`]!.headers = { ...SECURITY, 'x-robots-tag': 'noindex' }
    })
    expect(problems).toEqual(['production sends X-Robots-Tag: noindex'])
  })

  it('fails a non-https address', async () => {
    const problems = await checkDeploy(
      'http://washwise.netlify.app',
      'production',
      fetchFrom(goodSite('production')),
    )
    expect(problems[0]).toBe('http://washwise.netlify.app is not https://')
  })
})
