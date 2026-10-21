import { afterEach, describe, expect, it, vi } from 'vitest'
import { offerInstall, setIosStandalone } from '@/test/installPrompt'
import { mockMatchMedia } from '@/test/matchMedia'
import {
  canPromptInstall,
  isStandalone,
  listenForInstallPrompt,
  promptInstall,
  subscribeInstallPrompt,
} from './installPrompt'

let stop: (() => void) | undefined
afterEach(() => stop?.())

describe('install prompt store', () => {
  it('keeps the offer, holds back the browser bar, and tells subscribers', () => {
    stop = listenForInstallPrompt()
    const listener = vi.fn()
    subscribeInstallPrompt(listener)
    expect(canPromptInstall()).toBe(false)
    const event = offerInstall()
    expect(event.defaultPrevented).toBe(true)
    expect(canPromptInstall()).toBe(true)
    expect(listener).toHaveBeenCalled()
  })

  it('opens the dialog once and reports the outcome', async () => {
    stop = listenForInstallPrompt()
    const event = offerInstall('dismissed')
    await expect(promptInstall()).resolves.toBe('dismissed')
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(canPromptInstall()).toBe(false)
    await expect(promptInstall()).resolves.toBe('unavailable')
  })

  it('forgets the offer once the app is installed', () => {
    stop = listenForInstallPrompt()
    offerInstall()
    window.dispatchEvent(new Event('appinstalled'))
    expect(canPromptInstall()).toBe(false)
  })

  it.each([
    ['a browser tab', false, undefined, false],
    ['an installed window', true, undefined, true],
    ['the iOS home screen', false, true, true],
  ])('isStandalone in %s', (_, displayMode, iosStandalone, expected) => {
    mockMatchMedia({ '(display-mode: standalone)': displayMode })
    const restore = setIosStandalone(iosStandalone)
    expect(isStandalone()).toBe(expected)
    restore()
  })
})
