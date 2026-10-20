import { Outlet } from 'react-router'

/** Root layout: a centered, phone-width column (≤ 430 px) on every screen size (FR-011). */
export function MobileColumn() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div
        data-testid="mobile-column"
        className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-gutter"
      >
        <Outlet />
      </div>
    </div>
  )
}
