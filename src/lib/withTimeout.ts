/** Thrown (as the abort reason) when `withTimeout` fires. */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms} ms`)
    this.name = 'TimeoutError'
  }
}

/**
 * A signal that aborts when `signal` aborts or after `ms`, whichever comes first.
 * Uses AbortController + setTimeout instead of `AbortSignal.any` for older iOS Safari.
 * Call `clear()` once the work is done.
 */
export function withTimeout(signal: AbortSignal | undefined, ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new TimeoutError(ms)), ms)
  const onAbort = () => controller.abort(signal?.reason)
  if (signal?.aborted) onAbort()
  else signal?.addEventListener('abort', onAbort, { once: true })

  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    },
  }
}
