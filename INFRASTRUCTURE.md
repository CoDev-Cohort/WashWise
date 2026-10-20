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

There's no persistent cache yet. Offline support (service worker and runtime caching) arrives in task 4.2.

<!-- /owner: 1.4 -->

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

**Service worker**: until task 4.2, the plugin runs with `selfDestroying: true`. The generated `sw.js` caches nothing, unregisters itself and clears any old caches, so testers never see a stale build. Chrome doesn't need a service worker to install, and iOS never has. **Offline support arrives in task 4.2**, which removes `selfDestroying` and adds precaching and runtime caching for the forecast API.

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

<!-- owner: P4 -->

## Hosting & deploy

> TODO (task P4)

## CI checks

> TODO (task P4)

<!-- /owner: P4 -->
