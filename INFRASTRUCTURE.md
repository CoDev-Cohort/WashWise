# INFRASTRUCTURE.md

How WashWise runs: architecture, external services, caching, installability, and hosting.

## Architecture

WashWise is a **client-only single-page app**. There is no backend and no database. The browser calls public, keyless APIs directly, and forecast data lives only in the in-memory TanStack Query cache.

## Environments

| Environment              | How                          | URL                   |
| ------------------------ | ---------------------------- | --------------------- |
| Local dev                | `pnpm dev`                   | http://localhost:5173 |
| Local production preview | `pnpm build && pnpm preview` | http://localhost:4173 |
| E2E test server          | started by `pnpm e2e`        | http://localhost:4319 |

No environment variables or API keys are needed.

<!-- owner: 1.4 -->

## External services

| Service                                                   | Used for                              | Auth          | Terms                                     |
| --------------------------------------------------------- | ------------------------------------- | ------------- | ----------------------------------------- |
| [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | 7-day hourly and daily forecast       | None (no key) | Free for non-commercial use; CORS-enabled |
| BigDataCloud reverse-geocode-client                       | Place name for the location pill (P2) | None (no key) | Client-side free tier                     |

**Forecast request** (built by `buildForecastUrl` in [`src/features/forecast/query.ts`](src/features/forecast/query.ts)):

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=<2 dp>&longitude=<2 dp>
  &hourly=precipitation_probability,precipitation,temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,weather_code,is_day
  &daily=weather_code,sunrise,sunset,daylight_duration,precipitation_probability_max,precipitation_sum,temperature_2m_max,temperature_2m_min
  &timezone=auto&timeformat=unixtime&forecast_days=7&wind_speed_unit=kmh
```

- Coordinates are rounded to 2 decimal places (about 1 km). This is plenty for weather and keeps the cache key stable.
- `timeformat=unixtime` returns absolute timestamps, so the browser's own time zone never matters.
- Open-Meteo applies **one fixed UTC offset to the whole response**, the location's offset at request time. Across a clock change, day boundaries can be an hour off local midnight. Verdicts aren't affected because they compare absolute times (sunrise, sunset, hours).
- Responses are validated by `normalizeForecast`. Anything malformed becomes `ForecastError('invalid')`.

## Caching & timeouts

| Setting         | Value                                                                                              | Where                                                          |
| --------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Fresh for       | 30 min (`staleTime`)                                                                               | [`src/app/queryClient.ts`](src/app/queryClient.ts)             |
| Refetch         | On the next mount or window focus once stale; previous data stays on screen until new data arrives | TanStack Query defaults                                        |
| Kept in memory  | 24 h (`gcTime`)                                                                                    | `queryClient.ts`                                               |
| Retries         | Once for `network` or `http` ≥ 500; never for `timeout`, `invalid` or 4xx                          | `queryClient.ts`                                               |
| Request timeout | 10 s, then `ForecastError('timeout')`                                                              | [`src/features/forecast/api.ts`](src/features/forecast/api.ts) |

**How failures surface**: `useForecast` returns `error: ForecastError` with `kind` set to `network`, `timeout`, `http` (with `status`) or `invalid`. The UI reads `kind` to choose a message (P4 designs the final error states). A request cancelled by the caller isn't treated as a failure.

Forecasts are also kept on the device so the app works offline: see [Offline & updates](#offline--updates).

<!-- /owner: 1.4 -->

<!-- owner: 4.1 -->

**Failed updates keep the last forecast.** When a refetch fails, including the first fetch for a new ~1 km cell (where TanStack drops `placeholderData`), the home page keeps showing the last forecast that loaded and adds a "Couldn’t update the forecast" banner with "Try again". A failed _first_ load shows a full error with a label per cause (`errorLabel.ts`). Retry, timeout and cache rules are unchanged; "Try again" is `refetch({ cancelRefetch: false })`.

<!-- /owner: 4.1 -->

<!-- owner: 2.1 -->

## Location & storage

WashWise uses the device's current location only. Code lives in [`src/features/location/`](src/features/location/).

| Setting            | Value                                                                                                              | Where                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Position request   | `getCurrentPosition` once per request; never `watchPosition`                                                       | [`geolocation.ts`](src/features/location/geolocation.ts) |
| Accuracy           | Coarse (`enableHighAccuracy: false`). Weather needs about 1 km, and coarse fixes are faster                        | `geolocation.ts`                                         |
| Timeout            | 10 s (`LOCATION_TIMEOUT_MS`). Browsers don't count time spent on the permission prompt                             | `geolocation.ts`                                         |
| Reuse a recent fix | Up to 5 min old (`maximumAge`)                                                                                     | `geolocation.ts`                                         |
| Secure pages only  | No `navigator.geolocation` or `window.isSecureContext` false gives `unsupported`, and no request is made           | `isGeolocationSupported()`                               |
| Saved position     | `localStorage['washwise:location:v1']` = `{ "lat": 14.6, "lon": 120.98 }`, rounded to 2 dp (about 1 km). No expiry | [`storage.ts`](src/features/location/storage.ts)         |

**Denied vs blocked.** A refused request is `blocked` (the spec's "permanently blocked") when the Permissions API reports `denied`, because the browser will not show the prompt again. If it reports `prompt`, the state is plain `denied` and "Try again" can ask again. "Try again" always calls the browser again, so it succeeds once the user re-enables location in the site settings.

**No Permissions API.** Older browsers may lack `navigator.permissions` for geolocation. `queryPermission()` then returns `unknown`. The route guards only skip the landing page on a confirmed `granted`, so such users see the landing page on every visit and tap "Use my location" each time.

**Storage failures.** A missing, corrupt or out-of-range record counts as no saved position. A failed write (private mode, full quota) is ignored. The app then behaves as a first visit.

**Privacy.** The position stays on the device. Only the rounded coordinates leave it, in the forecast request and (P2 task 2.2) the place-name lookup.

<!-- /owner: 2.1 -->

<!-- owner: 2.2 -->

## Place names (BigDataCloud)

The location pill shows a place name from [BigDataCloud's `reverse-geocode-client`](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api), which needs no key and allows browser calls. Code: [`geocode.ts`](src/features/location/geocode.ts) and [`useCityName.ts`](src/features/location/useCityName.ts).

```
GET https://api.bigdatacloud.net/data/reverse-geocode-client
  ?latitude=<2 dp>&longitude=<2 dp>&localityLanguage=en
```

| Setting     | Value                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Name picked | First non-blank of `city`, `locality`, `principalSubdivision`, otherwise "Your location"                   |
| Cache key   | `['cityName', lat2dp, lon2dp]`: every position in the same ~1 km cell shares one lookup                    |
| Fresh for   | Forever within a visit (`staleTime: Infinity`). The cache is in memory only, so a reload looks it up again |
| Timeout     | 10 s, then `GeocodeError('timeout')`                                                                       |
| Retries     | Once for `network` or `http` ≥ 500; never for 429, `timeout` or `invalid`                                  |
| Failure     | `useCityName` returns "Your location". The page is never blocked, and the error is not shown               |

**Privacy.** The service receives the position rounded to about 1 km, plus the IP address any request carries, and nothing else. No key, cookie or identifier is sent.

**Limits.** The keyless endpoint has no published rate guarantee. If it throttles or changes, every user simply sees "Your location" until it recovers.

<!-- /owner: 2.2 -->

<!-- owner: 3.1 -->

## Theme storage

The user's light/dark choice is the only thing P3 stores.

| Item         | Value                                                                                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Key          | `localStorage['ww-theme']` = `'light'` or `'dark'`. Absent or anything else = follow the system setting                                                                                                                                               |
| Code         | [`themeStorage.ts`](src/features/theme/themeStorage.ts) (read, write, resolve, apply) and `useTheme.ts`                                                                                                                                               |
| Before paint | A small inline script in [`index.html`](index.html) reads the same key and `prefers-color-scheme` and adds `dark` to `<html>`, so dark mode never flashes light. `themeStorage.test.ts` runs the script and fails if it disagrees with `resolveTheme` |
| Browser UI   | `applyTheme` also sets the `theme-color` meta tags to the page color after a manual choice                                                                                                                                                            |
| Failures     | Blocked or full storage is ignored: the toggle still works for the visit, and the system setting applies next time                                                                                                                                    |

No theme data leaves the device.

<!-- /owner: 3.1 -->

<!-- owner: 1.7 -->

## PWA

WashWise is installable (Add to Home Screen) through [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app), configured in [`vite.config.ts`](vite.config.ts).

| Manifest field        | Value                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `name` / `short_name` | WashWise                                                                                                |
| `display`             | `standalone` (portrait)                                                                                 |
| `start_url` / `scope` | `/`                                                                                                     |
| `theme_color`         | `#1F335C` (`--ww-ink`)                                                                                  |
| `background_color`    | `#FFFFFF` (`--ww-bg`)                                                                                   |
| `icons`               | `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` (purpose `maskable`) |

`index.html` adds `theme-color` for both color schemes (light `#1F335C`, dark `#0E1729`), `apple-touch-icon-180x180.png`, and the `apple-mobile-web-app-*` tags iOS uses for home-screen apps.

**Icons** are generated from [`public/logo.svg`](public/logo.svg) with `pnpm pwa:assets` (`@vite-pwa/assets-generator`, minimal-2023 preset, navy background for maskable and Apple icons). ⚠️ The logo is a **placeholder**: Figma has no logo yet. Replace `public/logo.svg` (and `public/favicon.svg`), then re-run `pnpm pwa:assets`.

**Service worker**: precaches the app shell and asks before switching versions. See [Offline & updates](#offline--updates).

### Verifying installability

Lighthouse no longer has PWA audits (removed in v12), so check it this way instead:

1. `pnpm build && pnpm preview`, then open the app in Chrome.
2. DevTools → **Application → Manifest**: no errors or warnings, and every icon renders (including the maskable preview).
3. `pnpm e2e` includes `e2e/pwa.spec.ts`, which checks that the manifest is linked, has the required fields, and that every icon is served as a PNG.
4. Install on real devices:
   - **Android Chrome**: menu → _Install app_ (or the install prompt). It opens standalone with the WashWise icon.
   - **iOS Safari**: Share → _Add to Home Screen_. It opens standalone with the WashWise icon and title.

Evidence lives in [`docs/screenshots/pwa/`](docs/screenshots/pwa/).

<!-- /owner: 1.7 -->

<!-- owner: 4.2 -->

## Offline & updates

Two separate pieces make WashWise work offline: the **service worker** keeps the app's own files, and the **persisted query cache** keeps forecasts. The service worker never touches Open-Meteo or BigDataCloud requests, so timeouts, retries and `ForecastError` stay in one place (`api.ts`, `queryClient.ts`).

**App shell** ([`vite.config.ts`](vite.config.ts), Workbox `generateSW`):

| Setting         | Value                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Precache        | Every built `js, css, html, svg, png, ico, woff2, webmanifest` file (~0.8 MB, fonts and Meteocons too) |
| Navigation      | `navigateFallback: 'index.html'`, so `/` and `/home` open offline                                      |
| Runtime caching | None                                                                                                   |
| Updates         | `registerType: 'prompt'`: a new version waits until the user taps **Reload** in the update toast       |
| Update checks   | On launch (browser), hourly while open, and when the app returns to the foreground (`useAppUpdate.ts`) |
| HTTP caching    | `vercel.json` serves `sw.js`, `index.html` and the manifest with `Cache-Control: no-cache`             |

A dismissed toast comes back on the next check. When every WashWise tab or window is closed, the next launch opens the new version without asking.

**Kill switch.** If a release is broken and users are stuck on it, set `selfDestroying: true` in the `VitePWA` options and deploy. The new `sw.js` unregisters itself and deletes its caches on every device at the next check; the app then runs online-only until the switch is removed.

**Forecasts** ([`cachePersistence.ts`](src/features/forecast/cachePersistence.ts)):

| Setting       | Value                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Storage       | `localStorage['ww-forecast-cache']`: TanStack `dehydrate` output for the **3 newest** successful forecasts, plus `FORECAST_CACHE_VERSION` |
| Restore       | Synchronously, before the first render (`AppProviders`), so a returning user sees the last forecast at once                               |
| Save          | At most once a second after a forecast loads, and at once when the page is hidden                                                         |
| Max age       | 7 days (`FORECAST_CACHE_MAX_AGE`, also the `gcTime`): a forecast covers 7 days                                                            |
| Refresh       | Stale-while-revalidate through `staleTime`: a restored forecast older than 30 min refetches in the background                             |
| Shape changes | Bump `FORECAST_CACHE_VERSION` when `Forecast` changes; `cachePersistence.test.ts` fails until you do. Older saves are discarded           |
| Failures      | Blocked or full storage is ignored: the app works, without an offline copy                                                                |

**Offline on the home page** ([`homeViewState.ts`](src/features/home/homeViewState.ts)): "offline" is what the device reports (`useOnline`), never TanStack's fetch status, because TanStack assumes it is online at startup. Offline, the home page shows the forecast for the current cell, or else the newest saved one from anywhere, with a "You’re offline" banner and "Updated X ago". Days that have ended are dropped (`forecastFromToday`); once no saved day covers today, it shows the offline error. TanStack refetches when the connection returns.

**Install prompt** ([`src/features/pwa/`](src/features/pwa/)): on Chromium, the `beforeinstallprompt` event is kept (which also hides Chrome's own install bar) and an in-app "Install WashWise" prompt shows on `/home` from the second visit on. Other storage keys: `ww-visits` (visit count, once per session via `sessionStorage['ww-visit-counted']`) and `ww-install-dismissed` ("Not now", no expiry). Nothing new leaves the device.

**Testing**: `e2e/offline.spec.ts` opens the production build offline (Chromium only: Playwright's WebKit has no service workers; check iPhone by hand). Other e2e specs run with `serviceWorkers: 'block'`. To run e2e in a sandbox whose Chromium differs from Playwright's, pass `launchOptions.executablePath`.

<!-- /owner: 4.2 -->

<!-- owner: P4 -->

## Hosting & deploy

> TODO (task P4)

## CI checks

> TODO (task P4)

<!-- /owner: P4 -->
