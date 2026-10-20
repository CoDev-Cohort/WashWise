import type { ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from './ErrorFallback'

/** Top-level boundary for render errors outside the router. "Try again" re-mounts the tree. */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => <ErrorFallback onRetry={resetErrorBoundary} />}
      onError={(error) => console.error('[WashWise] Unhandled render error', error)}
    >
      {children}
    </ErrorBoundary>
  )
}
