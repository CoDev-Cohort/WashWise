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
| Retries         | 1                                                                                                  | `queryClient.ts`                                               |
| Request timeout | 10 s, then `ForecastError('timeout')`                                                              | [`src/features/forecast/api.ts`](src/features/forecast/api.ts) |

**How failures surface**: `useForecast` returns `error: ForecastError` with `kind` set to `network`, `timeout`, `http` (with `status`) or `invalid`. The UI reads `kind` to choose a message (P4 designs the final error states). A request cancelled by the caller isn't treated as a failure.

There's no persistent cache yet. Offline support (service worker and runtime caching) arrives in task 4.2.

<!-- /owner: 1.4 -->

<!-- owner: 1.7 -->

## PWA

> TODO (task 1.7)

<!-- /owner: 1.7 -->

<!-- owner: P4 -->

## Hosting & deploy

> TODO (task P4)

## CI checks

> TODO (task P4)

<!-- /owner: P4 -->
