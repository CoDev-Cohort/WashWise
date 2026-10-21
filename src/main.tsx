import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { AppProviders } from '@/app/AppProviders'
import { router } from '@/app/router'
import { listenForInstallPrompt } from '@/features/pwa/installPrompt'
import { countVisit } from '@/features/pwa/installStorage'
import './styles/fonts'
import './styles/index.css'

// Before rendering: the install offer can arrive before React mounts (4.2 FR-010).
listenForInstallPrompt()
countVisit()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
