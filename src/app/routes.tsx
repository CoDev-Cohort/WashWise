import { Navigate, type RouteObject } from 'react-router'
import { RouteErrorFallback } from '@/components/errors/RouteErrorFallback'
import { MobileColumn } from '@/components/layout/MobileColumn'
import { HomePage } from '@/pages/HomePage'
import { LandingPage } from '@/pages/LandingPage'

/** App routes (FR-009). Unknown paths go back to the landing page. */
export const routes: RouteObject[] = [
  {
    element: <MobileColumn />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/home', element: <HomePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
