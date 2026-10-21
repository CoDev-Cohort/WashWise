import { test as base, expect } from '@playwright/test'

/** Requests that never leave the machine: the app under test, and in-page data. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])
const LOCAL_PROTOCOLS = new Set(['data:', 'blob:', 'about:'])

export const isLocal = (url: URL) =>
  LOCAL_HOSTS.has(url.hostname) || LOCAL_PROTOCOLS.has(url.protocol)

/**
 * The `test` every spec uses (P4.4 FR-006). E2E never reaches a real service: each test stubs what it
 * needs with `page.route` (see `support.ts`), and any other request leaving the machine is aborted and
 * fails the test, naming the URL. Page routes take priority over this context route, so stubs added at
 * any time still win.
 */
export const test = base.extend<{ externalGuard: void }>({
  externalGuard: [
    async ({ context }, use) => {
      const unexpected: string[] = []
      await context.route(
        (url) => !isLocal(url),
        (route) => {
          unexpected.push(`${route.request().method()} ${route.request().url()}`)
          return route.abort('blockedbyclient')
        },
      )
      await use()
      expect(unexpected, 'unexpected external requests (stub them in the test)').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
