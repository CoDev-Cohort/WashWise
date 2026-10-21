import { Outlet } from 'react-router'
import { PwaPrompts } from '@/features/pwa/components/PwaPrompts'

/**
 * Root layout: a centered, phone-width column (≤ 430 px) on every screen size (FR-011), with the slot
 * for the update toast and install prompt at the bottom (4.2).
 */
export function MobileColumn() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div
        data-testid="mobile-column"
        className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-gutter"
      >
        <Outlet />
        <PwaPrompts />
      </div>
    </div>
  )
}
