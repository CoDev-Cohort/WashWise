import { Navigate, type RouteObject } from 'react-router'
import { RouteErrorFallback } from '@/components/errors/RouteErrorFallback'
import { MobileColumn } from '@/components/layout/MobileColumn'
import { RequireLocation } from '@/features/location/RequireLocation'
import { HomePage } from '@/pages/HomePage'
import { LandingPage } from '@/pages/LandingPage'
import { homeLoader, landingLoader } from './locationGuards'

/**
 * App routes (FR-009). The loaders decide, before anything renders, whether the user belongs on the
 * landing page or on `/home` (FR-012, FR-014). Unknown paths go to `/`, whose loader then forwards
 * returning users to `/home`.
 */
export const routes: RouteObject[] = [
  {
    element: <MobileColumn />,
    errorElement: <RouteErrorFallback />,
    // The loaders only read the browser's permission state, so the wait is a few milliseconds.
    HydrateFallback: () => null,
    children: [
      { path: '/', loader: landingLoader, element: <LandingPage /> },
      {
        loader: homeLoader,
        element: <RequireLocation />,
        children: [{ path: '/home', element: <HomePage /> }],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
