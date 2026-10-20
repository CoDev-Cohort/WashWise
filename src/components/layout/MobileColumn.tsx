import { Outlet } from 'react-router'

/** Root layout: a centered, phone-width column (≤ 430 px) on every screen size (FR-011). */
export function MobileColumn() {
  return (
    <div className="bg-bg text-ink min-h-dvh">
      <div
        data-testid="mobile-column"
        className="px-gutter mx-auto flex min-h-dvh w-full max-w-[430px] flex-col"
      >
        <Outlet />
      </div>
    </div>
  )
}
