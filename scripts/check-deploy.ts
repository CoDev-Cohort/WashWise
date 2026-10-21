/**
 * Checks a deployed WashWise address (P4.5): HTTPS, deep links, update-safe caching, security headers
 * and search-engine indexing. Run by `.github/workflows/deploy-check.yml` after each Netlify deploy.
 *
 *   pnpm deploy:check https://washwise.netlify.app --production
 *   pnpm deploy:check https://deploy-preview-4--washwise.netlify.app --preview
 */
import { pathToFileURL } from 'node:url'

export type DeployKind = 'production' | 'preview'
type Fetch = (url: string, init?: RequestInit) => Promise<Response>

/** Security headers every address sends (spec FR-013, `netlify.toml`). */
export const SECURITY_HEADERS: Record<string, (value: string) => boolean> = {
  'strict-transport-security': (v) => /max-age=\d{7,}/.test(v),
  'x-content-type-options': (v) => v === 'nosniff',
  'x-frame-options': (v) => v.toUpperCase() === 'DENY',
  'referrer-policy': (v) => v === 'strict-origin-when-cross-origin',
  // Location must stay allowed for the site itself, or the app can't work.
  'permissions-policy': (v) => v.includes('geolocation=(self)'),
}

const NO_CACHE_PATHS = ['/index.html', '/sw.js', '/manifest.webmanifest']
const APP_PATHS = ['/', '/home', '/no-such-page']
const APP_ROOT = '<div id="root">'

/** Returns every problem found; an empty list means the address is fine. */
export async function checkDeploy(
  baseUrl: string,
  kind: DeployKind,
  fetchImpl: Fetch = fetch,
): Promise<string[]> {
  const problems: string[] = []
  const base = new URL(baseUrl)
  if (base.protocol !== 'https:') problems.push(`${baseUrl} is not https://`)
  const at = (path: string) => new URL(path, base).toString()

  // 1. http:// redirects to https:// (FR-001)
  const http = new URL(base)
  http.protocol = 'http:'
  const redirect = await fetchImpl(http.toString(), { redirect: 'manual' })
  const location = redirect.headers.get('location') ?? ''
  if (![301, 302, 307, 308].includes(redirect.status) || !location.startsWith('https://')) {
    problems.push(
      `http:// answers ${redirect.status}${location ? ` → ${location}` : ''}, not a redirect to https://`,
    )
  }

  // 2. Every app path loads the app (FR-002), with the security headers (FR-013)
  let html = ''
  for (const path of APP_PATHS) {
    const res = await fetchImpl(at(path))
    const body = await res.text()
    if (path === '/') html = body
    if (res.status !== 200 || !body.includes(APP_ROOT)) {
      problems.push(`${path} answers ${res.status} without the app`)
    }
    if (path === '/') {
      for (const [name, ok] of Object.entries(SECURITY_HEADERS)) {
        const value = res.headers.get(name)
        if (value === null) problems.push(`missing header ${name}`)
        else if (!ok(value)) problems.push(`header ${name} is "${value}"`)
      }
      const robots = res.headers.get('x-robots-tag') ?? ''
      // 6. Previews stay out of search engines; production must not (FR-006)
      if (kind === 'preview' && !robots.includes('noindex')) {
        problems.push('preview is missing X-Robots-Tag: noindex')
      }
      if (kind === 'production' && robots.includes('noindex')) {
        problems.push('production sends X-Robots-Tag: noindex')
      }
    }
  }

  // 3. Version-deciding files are always revalidated; fingerprinted assets are immutable (FR-003)
  for (const path of NO_CACHE_PATHS) {
    const res = await fetchImpl(at(path))
    const cache = res.headers.get('cache-control') ?? ''
    if (res.status !== 200) problems.push(`${path} answers ${res.status}`)
    else if (!cache.includes('no-cache'))
      problems.push(`${path} Cache-Control is "${cache}", not no-cache`)
    const type = res.headers.get('content-type') ?? ''
    if (path === '/manifest.webmanifest' && !type.includes('application/manifest+json')) {
      problems.push(`manifest Content-Type is "${type}"`)
    }
    if (path === '/sw.js' && !type.includes('javascript')) {
      problems.push(`sw.js Content-Type is "${type}"`)
    }
  }
  const asset = /\/assets\/[^"']+\.js/.exec(html)?.[0]
  if (!asset) {
    problems.push('no /assets/*.js script found in the page')
  } else {
    const cache = (await fetchImpl(at(asset))).headers.get('cache-control') ?? ''
    if (!cache.includes('immutable'))
      problems.push(`${asset} Cache-Control is "${cache}", not immutable`)
  }

  // 4. A missing asset is a real 404, never the app page (plan R3)
  const missing = await fetchImpl(at('/assets/does-not-exist.js'))
  if (missing.status !== 404) {
    problems.push(`/assets/does-not-exist.js answers ${missing.status}, not 404`)
  }

  return problems
}

async function main(argv: string[]) {
  const url = argv.find((a) => !a.startsWith('--'))
  const kind: DeployKind = argv.includes('--production') ? 'production' : 'preview'
  if (!url) {
    console.error('Usage: pnpm deploy:check <https-url> [--preview|--production]')
    process.exit(2)
  }
  const problems = await checkDeploy(url, kind)
  if (problems.length > 0) {
    console.error(`✖ ${url} (${kind}):\n${problems.map((p) => `  - ${p}`).join('\n')}`)
    process.exit(1)
  }
  console.log(`✔ ${url} (${kind}) passed every deploy check`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main(process.argv.slice(2))
}
