# Implementation Plan: WashWise P2 · Location & Landing

**Date**: 2026-10-21
**Spec**: specs/washwise-p2-location-landing/spec.md
**Status**: Draft
**Linear**: COH-7 (tasks 2.1–2.4 = COH-19, COH-20, COH-21, COH-22)

## Summary

P2 gives the app a location. It is a client-only addition to the P1 shell, built from four parts:

- a **location module** (`src/features/location/`): a `useGeolocation` hook over the Geolocation and Permissions APIs, plus saved coordinates
- a **place-name hook** (`useCityName`) over BigDataCloud's reverse geocoder, with a fixed fallback
- a **landing page** at `/` with one screen per state (idle, requesting, denied, blocked, unavailable/timeout, unsupported)
- **route guards** as React Router loaders. The loaders do the async permission check before the first render, so a returning user lands on `/home` with no flash of the landing page.

The browser-facing code (`geolocation.ts`, `storage.ts`) is plain TypeScript with no React. The hook is a thin state machine over it, so every state is tested with a stubbed `navigator.geolocation` and `navigator.permissions` and never touches a device.

## Technical Context

**Stack**: TypeScript (strict), React 19, Vite 8, Tailwind CSS 4, React Router 8 (data router), TanStack Query 5, pnpm 11, Node 24 (all as installed in P1)
**Primary Dependencies**: none new. Uses `react-router` (`redirect`, `Navigate`, `Outlet`), `@tanstack/react-query`, `lucide-react`
**Dev Dependencies**: none new. Uses Vitest, Testing Library, MSW, Playwright
**Storage**: `localStorage` key `washwise:location:v1` holds `{ lat, lon }` rounded to 2 dp. The place name is held only in the in-memory TanStack Query cache.
**Target Layer(s)**: Frontend only. The BigDataCloud call goes straight from the browser, no key.
**Performance Goals**: Spec SC-006 and Story 3 only ask for "renders at once". The guard adds one `permissions.query()` call (a few ms) before the first render of `/` or `/home`. The place-name lookup never blocks rendering.
**Constraints**:

- Always the device's current location. No city search, no manual entry (FR-009).
- No location request until the user acts, except the background refresh when permission is already granted (FR-002).
- Tokens only for styling. The page works in light and dark.
- Location logic never uses a real device or network in tests (FR-018).
- Coordinates sent to BigDataCloud and stored on the device are rounded to 2 dp (about 1 km).

## Plan-time decisions (resolve the spec's open questions)

| Spec item                | Decision                                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-005 timeout           | `LOCATION_TIMEOUT_MS = 10_000`, passed as the Geolocation `timeout` option. Browsers start this clock after the permission prompt is answered, so reading the prompt doesn't count             |
| FR-010a "Try again"      | `request()` always calls `getCurrentPosition`. A blocked site fails at once with `PERMISSION_DENIED`; an unblocked one prompts or succeeds. No special case for the blocked state              |
| FR-006a age limit        | None. `loadSavedLocation()` returns whatever is stored. Replaced by the background refresh                                                                                                     |
| Position options         | `enableHighAccuracy: false` (weather needs ~1 km, and coarse fixes are faster and cheaper on battery), `maximumAge: 5 min`                                                                      |
| "Permanently blocked"    | A `PERMISSION_DENIED` error **and** `permissions.query()` reporting `denied`. If the query says `prompt`, it is plain "denied" and "Try again" can prompt again                                |
| No Permissions API       | `queryPermission()` returns `'unknown'`. The guards then never skip the landing page (they only skip on `granted`), and a `PERMISSION_DENIED` error is treated as plain "denied"              |

## Data Model

No database. These are TypeScript types and one stored record.

### Location types, `src/features/location/types.ts`

```ts
interface Coordinates {
  lat: number // degrees, rounded to 2 dp
  lon: number
}

/** Spec Story 1 states. `blocked` is the spec's "permanently blocked". */
type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'

/** What `navigator.permissions.query({ name: 'geolocation' })` can tell us. */
type PermissionResult = 'granted' | 'denied' | 'prompt' | 'unknown'

type LocationErrorKind = 'denied' | 'unavailable' | 'timeout'
```

### Stored record, `src/features/location/storage.ts`

```ts
// localStorage['washwise:location:v1'] = JSON
{ "lat": 14.6, "lon": 120.98 }
```

- `loadSavedLocation()` returns `Coordinates | undefined`. It returns `undefined` for a missing key, bad JSON, non-finite numbers or values outside ±90 / ±180, and when `localStorage` throws (FR-007).
- `saveLocation(c)` rounds with `roundCoord` and swallows a `localStorage` failure (quota, private mode).
- The `v1` in the key lets a later change to the record shape start clean.

### Place name, `src/features/location/geocode.ts`

```ts
interface ReverseGeocodeResponse {
  city?: string
  locality?: string
  principalSubdivision?: string
  // …many more fields we ignore
}

const FALLBACK_PLACE_NAME = 'Your location' // FR-015
```

## API Contracts

### External: BigDataCloud reverse-geocode-client (no auth, FR-015)

`GET https://api.bigdatacloud.net/data/reverse-geocode-client`

| Param                   | Value                                                         |
| ----------------------- | ------------------------------------------------------------- |
| `latitude`, `longitude` | rounded to 2 dp (also the cache key)                          |
| `localityLanguage`      | `en` (the app is English only)                                |

- **200**: JSON with string fields `city`, `locality`, `principalSubdivision` (each may be `""` when unknown). Other fields are ignored.
- **Other status / bad JSON / network failure / 10 s timeout**: `GeocodeError`.
- Name pick: first non-blank of `city`, `locality`, `principalSubdivision`, else `FALLBACK_PLACE_NAME`. Values are trimmed.

### Browser APIs used

| API                                                            | Used for                                                       | Notes                                                                                       |
| -------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `navigator.geolocation.getCurrentPosition`                     | One position fix (`request()` and background refresh)          | Never `watchPosition` (out of scope)                                                        |
| `navigator.permissions.query({ name: 'geolocation' })`         | Guards, blocked-vs-denied, revocation while the app is open    | `PermissionStatus.onchange` is subscribed in the hook and removed on unmount                |
| `window.isSecureContext`                                       | "unsupported" for non-HTTPS pages (FR-004)                     | `localhost` counts as secure                                                                |
| `localStorage`                                                 | Saved coordinates                                              | Every access in `try/catch`                                                                 |

### Internal module contracts

| Function                 | Signature                                                                 | Notes                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isGeolocationSupported` | `() => boolean`                                                           | `'geolocation' in navigator && window.isSecureContext`                                                                                                                      |
| `getPosition`            | `(opts?: { timeoutMs?: number }) => Promise<Coordinates>`                 | Wraps `getCurrentPosition`. Rounds the result. Rejects with `LocationError { kind }`: code 1 → `denied`, 2 → `unavailable`, 3 → `timeout`                                    |
| `queryPermission`        | `() => Promise<PermissionResult>`                                         | Never throws. Missing API, a throwing `query` (older Safari) or an unknown state → `'unknown'`                                                                              |
| `watchPermission`        | `(onChange: (p: PermissionResult) => void) => () => void`                 | Subscribes to `PermissionStatus.onchange`, returns an unsubscribe. A no-op if the API is missing                                                                            |
| `loadSavedLocation`      | `() => Coordinates \| undefined`                                          | See Data Model                                                                                                                                                              |
| `saveLocation`           | `(c: Coordinates) => void`                                                | See Data Model                                                                                                                                                              |
| `useGeolocation`         | `(opts?: { refreshOnMount?: boolean }) => { status; coordinates; request }` | See the behaviour table below                                                                                                                                               |
| `fetchCityName`          | `(lat, lon, opts?: { signal? }) => Promise<string>`                       | Reuses `withTimeout` (10 s). Throws `GeocodeError { kind: 'network' \| 'timeout' \| 'http' \| 'invalid' }`. Returns a non-empty name or `FALLBACK_PLACE_NAME` for a blank response |
| `useCityName`            | `(lat?: number, lon?: number) => string`                                  | Returns `FALLBACK_PLACE_NAME` while loading, when disabled and on error. Key `['cityName', lat2dp, lon2dp]`, `staleTime: Infinity`                                          |
| `landingLoader`          | `() => Promise<Response \| null>`                                         | `redirect('/home')` when `queryPermission() === 'granted'` **and** `loadSavedLocation()` is set, else `null`                                                                |
| `homeLoader`             | `() => Promise<Response \| null>`                                         | `redirect('/')` unless permission is `granted` **and** saved coordinates exist, else `null`                                                                                 |
| `useCoordinates`         | `() => Coordinates`                                                       | Reads the outlet context set by `RequireLocation`. P3 sections call this, then `useForecast(lat, lon)`                                                                      |

### `useGeolocation` behaviour

`status` and `coordinates` start from synchronous facts: `unsupported` if `!isGeolocationSupported()`, else `idle`; `coordinates` come from `loadSavedLocation()` (lazy initial state), so a returning user's first render already has them (FR-006, Story 3).

| Event                                              | Result                                                                                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mount, permission `denied`                         | `status = 'blocked'` (so a revoked user sees the matching landing state, Story 3 criterion 5)                                                                                                                       |
| Mount, permission `granted` and saved coordinates  | `status = 'granted'`. With `refreshOnMount`, start a silent refresh (below)                                                                                                                                         |
| Mount, permission `granted`, nothing saved         | stays `idle`. The first tap on the button then succeeds without a prompt                                                                                                                                            |
| Mount, permission `prompt` or `unknown`            | stays `idle`                                                                                                                                                                                                        |
| `request()` called                                 | `status = 'requesting'`; ignored if already requesting                                                                                                                                                              |
| …position arrives                                  | Save, set `coordinates`, `status = 'granted'`, resolve with the coordinates                                                                                                                                         |
| …`denied` error                                    | Re-query permission: `denied` → `status = 'blocked'`, anything else → `'denied'`. Resolve `undefined`                                                                                                              |
| …`unavailable` / `timeout` error                   | `status = 'unavailable'` / `'timeout'`. Resolve `undefined`                                                                                                                                                         |
| Silent refresh succeeds                            | Save and set `coordinates`. `status` is untouched, so nothing flickers                                                                                                                                              |
| Silent refresh fails (`unavailable`, `timeout`)    | Ignore. Saved coordinates stay (FR-013)                                                                                                                                                                             |
| Silent refresh `denied`                            | Treated like a revocation: `blocked` or `denied` as above                                                                                                                                                           |
| `PermissionStatus.onchange` → `denied`             | `status = 'blocked'` (revoked while open, Story 3 criterion 6)                                                                                                                                                      |
| `PermissionStatus.onchange` → `prompt`             | If `status` was `granted`, back to `idle` (the user reset the permission)                                                                                                                                           |
| Unmount                                            | Unsubscribe; late results from `getPosition` are dropped                                                                                                                                                            |

`request()` resolves to the coordinates on success and `undefined` otherwise, so the landing page navigates on the awaited result, not on a status change. That avoids a race with the mount-time `granted` status.

### Route guards (FR-012, FR-014)

```ts
// src/app/routes.tsx (shape)
children: [
  { path: '/', loader: landingLoader, element: <LandingPage /> },
  {
    loader: homeLoader,
    element: <RequireLocation />,          // revocation while open + outlet context
    children: [{ path: '/home', element: <HomePage /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
```

- **Loaders** make the first-load decision before anything renders, so there is no landing flash for returning users and no home flash for new ones. They never throw: `queryPermission` catches its own errors, and `loadSavedLocation` returns `undefined` on any failure.
- **`RequireLocation`** covers what happens after load. It calls `useGeolocation({ refreshOnMount: true })` and renders `<Navigate to="/" replace />` when `coordinates` is missing or `status` is `denied`, `blocked` or `unsupported`. Otherwise it renders `<Outlet context={coordinates} />`. It deliberately does **not** redirect on `unavailable` or `timeout` (a failed refresh must not kick the user out).
- A data router with async loaders needs something to show while the loaders resolve. Use route-level `HydrateFallback` returning `null` (the wait is a few ms). Confirm the exact API against React Router 8 in task 2.4.

## Component / Module Breakdown

| Path                                                  | Responsibility                                                                                                                                                      | Task |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `src/features/location/types.ts`                      | `Coordinates`, `LocationStatus`, `PermissionResult`, `LocationErrorKind`                                                                                            | 2.1  |
| `src/features/location/errors.ts`                     | `LocationError { kind }` (mirrors `ForecastError`)                                                                                                                  | 2.1  |
| `src/features/location/geolocation.ts`                | `isGeolocationSupported`, `getPosition`, `queryPermission`, `watchPermission`, `LOCATION_TIMEOUT_MS`. No React                                                       | 2.1  |
| `src/features/location/storage.ts`                    | `loadSavedLocation`, `saveLocation`. No React                                                                                                                       | 2.1  |
| `src/features/location/useGeolocation.ts`             | The hook (behaviour table above)                                                                                                                                    | 2.1  |
| `src/features/location/geocode.ts`                    | `GEOCODE_ENDPOINT`, `buildGeocodeUrl`, `pickPlaceName`, `fetchCityName`, `GeocodeError`, `FALLBACK_PLACE_NAME`                                                       | 2.2  |
| `src/features/location/useCityName.ts`                | Query hook returning a string                                                                                                                                       | 2.2  |
| `src/components/feedback/EmptyState.tsx`              | Shared empty/error state: `icon`, `title`, optional `hint`, optional `action`, `role` of `status` or `alert`. Tokens only                                            | 2.3  |
| `src/pages/LandingPage.tsx`                           | Replaces the placeholder. Maps `status` → screen (table below), calls `useGeolocation()`, navigates to `/home` when `request()` resolves with coordinates             | 2.3  |
| `src/app/locationGuards.ts`                           | `landingLoader`, `homeLoader`                                                                                                                                       | 2.4  |
| `src/features/location/RequireLocation.tsx`           | Layout route element: redirect on revocation, background refresh, outlet context                                                                                    | 2.4  |
| `src/features/location/useCoordinates.ts`             | `useOutletContext` wrapper for P3                                                                                                                                   | 2.4  |
| `src/app/routes.tsx`                                  | Wire loaders, `RequireLocation`, `HydrateFallback`                                                                                                                  | 2.4  |
| `src/pages/HomePage.tsx`                              | Still a placeholder, but now reads `useCoordinates()` + `useCityName()` and shows "Showing weather for <name>" so the guard and the lookup can be seen working. P3 replaces it | 2.4  |
| `src/test/geolocation.ts`                             | `mockGeolocation()` test helper (see Test strategy)                                                                                                                 | 2.1  |
| `src/test/setup.ts`                                   | Clear `localStorage` in `afterEach` so saved coordinates never leak between tests                                                                                   | 2.1  |

### Landing page screens (FR-008, FR-010, FR-017)

| `status`                       | Icon (lucide, `aria-hidden`)       | Label                                   | Extra                                                           | Live region          |
| ------------------------------ | ---------------------------------- | --------------------------------------- | --------------------------------------------------------------- | -------------------- |
| `idle`                         | Logo (`/logo.svg`, decorative)     | `h1` "WashWise" + one-line pitch        | Button "Use my location" (`MapPin`)                             | none                 |
| `requesting`                   | `LoaderCircle`, spin               | "Finding you…"                          | none. Spin is off under `motion-reduce`                         | `role="status"`      |
| `denied`                       | `MapPinOff`                        | "Location access was denied"            | Button "Try again"                                              | `role="alert"`       |
| `blocked`                      | `MapPinOff`                        | "Location access is blocked"            | Button "Try again" + hint "Enable location in your browser's site settings" | `role="alert"` |
| `unavailable`                  | `TriangleAlert`                    | "We couldn't find your location"        | Button "Try again"                                              | `role="alert"`       |
| `timeout`                      | `TriangleAlert`                    | "Finding you took too long"             | Button "Try again"                                              | `role="alert"`       |
| `unsupported`                  | `MapPinOff`                        | "Location isn't available in this browser" | none (no button)                                            | `role="alert"`       |
| `granted` (brief, mid-navigate) | same as `requesting`              | "Finding you…"                          | none                                                            | `role="status"`      |

- Copy beyond the strings fixed in the spec and Linear (the button, "Finding you…", the hint, the unsupported message) is chosen here and lives in one `LANDING_COPY` object at the top of `LandingPage.tsx`.
- The page keeps the existing `h1` "WashWise" in the idle state so e2e/route tests that look for it keep working. Other states render the label as the state's heading.
- Icon names are lucide-react 1.59 exports. Task 2.3 verifies each exists at import time (`tsc` fails otherwise).
- Light and dark come free from tokens: `bg-bg`, `text-ink`, `text-ink-muted`, `bg-ink`/`text-on-ink` for the primary button (same classes as `ErrorFallback`).

## Project Structure

New and changed files only.

```
WashWise/
├── specs/washwise-p2-location-landing/  spec.md  plan.md  tasks.md
├── e2e/
│   ├── smoke.spec.ts                 # changed: /home deep link needs a granted context
│   └── location.spec.ts              # new: landing flow, returning-user skip, revoked redirect
└── src/
    ├── app/
    │   ├── routes.tsx                # changed: loaders, RequireLocation, HydrateFallback
    │   ├── routes.test.tsx           # changed: async, seeded permission + storage
    │   ├── locationGuards.ts         # new
    │   └── locationGuards.test.ts    # new
    ├── components/feedback/
    │   ├── EmptyState.tsx            # new
    │   └── EmptyState.test.tsx       # new
    ├── pages/
    │   ├── LandingPage.tsx           # changed: real landing
    │   ├── LandingPage.test.tsx      # new: every state, light/dark class check not needed (tokens)
    │   └── HomePage.tsx              # changed: placeholder shows the place name
    ├── features/location/            # new folder
    │   ├── types.ts  errors.ts  geolocation.ts  storage.ts  useGeolocation.ts
    │   ├── geocode.ts  useCityName.ts
    │   ├── RequireLocation.tsx  useCoordinates.ts
    │   └── *.test.ts(x)              # next to each file
    └── test/
        ├── geolocation.ts            # new helper
        └── setup.ts                  # changed: clear localStorage
```

No new scripts and no `package.json` changes.

**Test strategy** (FR-018, SC-001 – SC-005):

- **`src/test/geolocation.ts`** exports `mockGeolocation({ secure?, supported?, permission?, position?, error? })`. It stubs `navigator.geolocation.getCurrentPosition`, `navigator.permissions.query` (returning an object with `state` and a settable `onchange`) and `window.isSecureContext`. It returns controls: `resolvePosition(c)`, `rejectWith(code)`, `setPermission(state)` (fires `onchange`) and `calls`. It uses `vi.stubGlobal` and restores in `afterEach`, in the style of `mockMatchMedia`.
- **`geolocation.test.ts`**: `getPosition` success and rounding; codes 1/2/3 → `denied` / `unavailable` / `timeout`; the 10 s `timeout` option is passed; `isGeolocationSupported` false without the API and when not secure; `queryPermission` handles a missing API and a throwing `query`.
- **`storage.test.ts`** (`it.each`): missing key, bad JSON, `NaN`, out-of-range, wrong shape, throwing `localStorage` all give `undefined`; save then load round-trips rounded; a failing `setItem` doesn't throw.
- **`useGeolocation.test.tsx`**: one test per spec Story 1 criterion 1–9: idle with no prompt; requesting; granted + coordinates saved; denied (permission `prompt`); blocked (permission `denied`); unavailable; timeout; unsupported with no request made; saved coordinates available on the first render. Plus: refresh updates coordinates without changing status; refresh timeout is ignored; refresh `denied` flips to blocked; `onchange` → `denied` flips to blocked; a second `request()` while requesting is ignored; unmount drops late results.
- **`geocode.test.ts`** with MSW (`server.use(http.get(GEOCODE_ENDPOINT, …))`): city; locality fallback; region fallback; all blank → "Your location"; 500; malformed JSON; timeout (fake timers); asserts the request carries 2 dp coordinates.
- **`useCityName.test.tsx`**: returns the name; cached per rounded coordinates (second hook with the same rounded coordinates makes **no** second request: count handler calls); failure → "Your location"; disabled without coordinates.
- **`LandingPage.test.tsx`**: renders each of the 7 screens by driving `mockGeolocation` (not by passing `status` as a prop), asserts role and accessible name for every button/label, "Try again" starts a new request, hint appears only for blocked, no button for unsupported, success navigates to `/home` (memory router).
- **`locationGuards.test.ts`**: table-driven over {first visit, granted + saved, granted + nothing saved, denied + saved, prompt + saved, no Permissions API} for both loaders. Covers SC-003 and SC-004.
- **`routes.test.tsx`** (updated): `/` and `/home` routes now resolve async (`findByRole`); `/home` without grant lands on `/`; granted + saved reaches `/home` at once; a revoked `onchange` while on `/home` ends on `/`.
- **E2E** (`e2e/location.spec.ts`, Pixel 7 Chromium and iPhone 14 WebKit): Playwright context options `permissions: ['geolocation']` and `geolocation: { latitude, longitude }`.
  1. Fresh visit → landing → tap "Use my location" → `/home`.
  2. Reload with permission + saved coordinates → straight to `/home`.
  3. A context without the permission, with coordinates seeded in storage → `/home` redirects to `/`.
  4. Revisit sanity: BigDataCloud and Open-Meteo are routed with `page.route` fixtures, so e2e never hits the network.
- **Light/dark**: `LandingPage` uses only token classes, so there is nothing to snapshot. Task 2.3 attaches light and dark screenshots of all 7 screens to COH-21, as P1 did for the palette.

**ESLint**: no new rules. `src/features/location/{geolocation,storage,geocode,types,errors}.ts` stay React-free by convention, with no lint rule (the FR-006 rule applies to the verdict engine only).

## Dependencies

No new packages.

| Existing package                                  | Use in P2                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `react-router` 8                                  | `redirect`, loaders, `Navigate`, `Outlet` + `useOutletContext`, `useNavigate` |
| `@tanstack/react-query` 5                         | `useCityName`                                                          |
| `lucide-react`                                    | `MapPin`, `MapPinOff`, `LoaderCircle`, `TriangleAlert`                 |
| `msw` 3, `vitest`, Testing Library, Playwright    | Tests                                                                  |

External services:

- **BigDataCloud reverse-geocode-client**: keyless, free tier for client-side use, CORS-enabled. This is the only new third party. It receives coordinates rounded to ~1 km and nothing else.
- Open-Meteo is unchanged.

## Project Documentation

Each P2 task writes its doc changes in a fresh `<!-- owner: 2.x -->` block, as P1 did.

| File                | Change                                                                                                                                                                                                     | Task |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `INFRASTRUCTURE.md` | External services: replace "Client-side free tier" with the real request, fallback and privacy note for BigDataCloud. New "Location & storage" section: Geolocation options, 10 s timeout, the `localStorage` key and record | 2.1, 2.2 |
| `CLAUDE.md`         | Data access: components get location only through `useGeolocation` / `useCoordinates` and the place name through `useCityName`. App structure: `/home` sits under `RequireLocation`, loaders in `routes.tsx` | 2.1, 2.2, 2.4 |
| `DESIGN.md`         | Landing page: the 7 screens, icons used, copy table                                                                                                                                                        | 2.3  |
| `README.md`         | Nothing, unless a script is added (none is)                                                                                                                                                                | n/a  |

Done check: `pnpm docs:check --done 2.1,2.2,2.3,2.4` once the blocks are filled in.

## Constitution Compliance

There is no `AGENTS.md` and no constitution in the repository, so there are no principles to evaluate. **Status: N/A (PASS by default).** Project rules from `CLAUDE.md` are checked instead:

| Rule                                                                  | Status                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Always the device's current location, no city search                  | PASS (FR-009; no input field exists)                                            |
| Components get data only through hooks, never `fetch` directly        | PASS (`useGeolocation`, `useCityName`; `fetchCityName` is called only by the hook) |
| Design tokens only, no hard-coded colors, radii or sizes              | PASS (landing and `EmptyState` use token classes)                               |
| No accounts, no server, no analytics                                  | PASS                                                                            |
| Never hit the network in tests                                        | PASS (MSW for geocoding; stubbed browser APIs; e2e routes mocked)               |
| Time-dependent logic takes `now` as an argument                       | PASS / n/a (no clock logic; timeouts use fake timers)                           |
| New work stays inside the active spec                                 | PASS (the one addition, place name on the `/home` placeholder, is justified in Component breakdown and removed by P3) |
