/** Controllable `window.matchMedia` stub for jsdom (which doesn't implement it). */
export function mockMatchMedia(initial: Record<string, boolean> = {}) {
  const state = { ...initial }
  const listeners = new Map<string, Set<EventListener>>()
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return state[query] ?? false
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: EventListener) => {
        if (!listeners.has(query)) listeners.set(query, new Set())
        listeners.get(query)!.add(cb)
      },
      removeEventListener: (_: string, cb: EventListener) => {
        listeners.get(query)?.delete(cb)
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
  return {
    set(query: string, matches: boolean) {
      state[query] = matches
      listeners.get(query)?.forEach((cb) => cb(new Event('change')))
    },
  }
}
