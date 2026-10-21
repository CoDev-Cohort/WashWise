import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState, type ReactNode } from 'react'
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary'
import { persistForecastCache, restoreForecastCache } from '@/features/forecast/cachePersistence'
import { createQueryClient } from './queryClient'

/** The app's QueryClient, with the forecasts saved on the device put back before the first render. */
function createAppQueryClient() {
  const client = createQueryClient()
  restoreForecastCache(client)
  return client
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createAppQueryClient)
  useEffect(() => persistForecastCache(queryClient), [queryClient])
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}
