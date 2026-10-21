import { useEffect } from 'react'
import { useMatch } from 'react-router'
import { useAppUpdate } from '../useAppUpdate'
import { useInstallPrompt } from '../useInstallPrompt'
import { InstallPrompt } from './InstallPrompt'
import { UpdateToast } from './UpdateToast'

/**
 * The one slot at the bottom of the column for the update toast and the install prompt (4.2 FR-012,
 * FR-018). The toast wins; the install prompt only shows on `/home` and only when there's no toast.
 * A spacer as tall as the slot lets the page scroll clear of it, so it never hides a section for good,
 * and `has-bottom-prompt` on <html> adds scroll padding so a focused control is never hidden behind it
 * (P4.3 FR-018).
 */
export function PwaPrompts() {
  const update = useAppUpdate()
  const install = useInstallPrompt()
  const onHome = useMatch('/home') !== null

  const prompt = update.visible ? (
    <UpdateToast onReload={update.reload} onDismiss={update.dismiss} />
  ) : onHome && install.canShow ? (
    <InstallPrompt onInstall={install.install} onDismiss={install.dismiss} />
  ) : null

  const visible = prompt !== null
  useEffect(() => {
    if (!visible) return
    document.documentElement.classList.add('has-bottom-prompt')
    return () => document.documentElement.classList.remove('has-bottom-prompt')
  }, [visible])

  if (!prompt) return null

  return (
    <>
      <div aria-hidden="true" className="h-28 shrink-0" />
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[430px] px-gutter pb-4">
        <div className="mb-[env(safe-area-inset-bottom)]">{prompt}</div>
      </div>
    </>
  )
}
