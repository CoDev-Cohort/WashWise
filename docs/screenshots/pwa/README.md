# PWA installability evidence (COH-17)

## Automated check: 2026-10-21

Chrome DevTools Protocol against `pnpm preview` (Chromium 1.64 / Playwright), the same data as DevTools → Application → Manifest:

```json
{
  "url": "http://localhost:4321/manifest.webmanifest",
  "manifestErrors": [],
  "installabilityErrors": []
}
```

The self-destroying service worker was also checked: one page load, no reload loop, and no service worker left registered.

## Manual device installs (to do, needs a person)

- [ ] Android Chrome: menu → **Install app** → launches standalone with the WashWise icon. Add screenshot `android-install.png`.
- [ ] iOS Safari: Share → **Add to Home Screen** → launches standalone with the WashWise icon. Add screenshot `ios-install.png`.

Attach both screenshots to COH-17.
