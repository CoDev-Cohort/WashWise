# Tasks: WashWise P2 · Location & Landing

**Date**: 2026-10-21
**Spec**: specs/washwise-p2-location-landing/spec.md
**Plan**: specs/washwise-p2-location-landing/plan.md
**Structure**: By user story (chosen by the user: B)
**Tracker**: None. Linear parent is COH-7 (US1 = COH-19, US4 = COH-20, US2 = COH-21, US3 = COH-22)

Format: `- [ ] TaskID [P?] [Story?] Description — path`
`[HUMAN]` = needs a person (device or Linear attachment); `/implement` prepares it and leaves the box unchecked.
`[P]` = can run in parallel with the other `[P]` tasks in the same phase (different files, no shared unfinished dependency).

---

## Phase 1: Setup (blocks everything)

- [x] T001 [P] Add the `mockGeolocation({ secure?, supported?, permission?, position?, error? })` test helper. It stubs `navigator.geolocation.getCurrentPosition`, `navigator.permissions.query` (a `state` plus a settable `onchange`) and `window.isSecureContext` with `vi.stubGlobal`, restores them in `afterEach`, and returns controls: `resolvePosition`, `rejectWith(code)`, `setPermission(state)` (fires `onchange`) and `calls` — src/test/geolocation.ts
- [x] T002 [P] Clear `localStorage` in `afterEach` so saved coordinates never leak between tests — src/test/setup.ts

## Phase 2: Foundational (blocking prerequisites)

- [x] T003 [P] Define `Coordinates`, `LocationStatus` (`idle`, `requesting`, `granted`, `denied`, `blocked`, `unavailable`, `timeout`, `unsupported`), `PermissionResult` (`granted`, `denied`, `prompt`, `unknown`) and `LocationErrorKind` — src/features/location/types.ts
- [x] T004 [P] Define `LocationError` with a `kind` of `denied`, `unavailable` or `timeout`, mirroring `ForecastError` — src/features/location/errors.ts

## Phase 3: US1 — Know where the user is (P1) [COH-19]

- [x] T005 [P] [US1] Implement `isGeolocationSupported` (API present and `isSecureContext`), `getPosition` (wraps `getCurrentPosition`, `LOCATION_TIMEOUT_MS = 10_000`, `enableHighAccuracy: false`, `maximumAge` 5 min, rounds to 2 dp, maps codes 1/2/3 to `denied`/`unavailable`/`timeout`), `queryPermission` (never throws; a missing API or a throwing `query` gives `'unknown'`) and `watchPermission` (subscribes to `onchange`, returns an unsubscribe). Tests cover each error code, the timeout option, unsupported and insecure contexts, and a missing or throwing Permissions API — src/features/location/geolocation.ts, src/features/location/geolocation.test.ts
- [x] T006 [P] [US1] Implement `loadSavedLocation` and `saveLocation` for `localStorage['washwise:location:v1']` = `{ lat, lon }` rounded to 2 dp. Table-driven tests: missing key, bad JSON, `NaN`, out of range ±90/±180, wrong shape and a throwing `localStorage` all give `undefined`; save then load round-trips; a failing `setItem` doesn't throw — src/features/location/storage.ts, src/features/location/storage.test.ts
- [x] T007 [US1] Implement `useGeolocation({ refreshOnMount? })` returning `{ status, coordinates, request }`, following the plan's behaviour table: initial state from `isGeolocationSupported()` and `loadSavedLocation()`; permission `denied` on mount gives `blocked`; `request()` is ignored while requesting and resolves with the coordinates or `undefined`; a `denied` error re-queries permission to choose `blocked` or `denied`; the silent refresh updates coordinates without touching status and ignores `unavailable`/`timeout`; `onchange` to `denied` gives `blocked`; unsubscribe on unmount and drop late results. Tests: one per spec Story 1 criterion 1–9, plus refresh success, refresh timeout ignored, refresh `denied`, revocation while open, double `request()`, unmount, and saved coordinates of any age still used on the first render (FR-006a). Before writing it, decide plan risk K1 (a prompt dismissed with no answer) with the user — src/features/location/useGeolocation.ts, src/features/location/useGeolocation.test.tsx
- [x] T008 [P] [US1] Add the INFRASTRUCTURE.md "Location & storage" section in a new `<!-- owner: 2.1 -->` block: Geolocation options, the 10 s timeout, blocked vs denied, the `localStorage` key and record, and the fallback when the Permissions API is missing — INFRASTRUCTURE.md (new block only)
- [x] T009 [P] [US1] Add a CLAUDE.md "Location" entry in a new `<!-- owner: 2.1 -->` block: components get location only through `useGeolocation` (and later `useCoordinates`); no `watchPosition`; no manual location — CLAUDE.md (new `owner: 2.1` block only)

## Phase 4: US2 — Landing page asks for location and handles every outcome (P1) [COH-21]

- [x] T010 [P] [US2] Create the shared `EmptyState` (props: `icon`, `title`, optional `hint`, optional `action`, `role` of `status` or `alert`; token classes only; decorative icon `aria-hidden`). Test role, accessible name, hint and action rendering — src/components/feedback/EmptyState.tsx, src/components/feedback/EmptyState.test.tsx
- [x] T011 [US2] Replace the placeholder `LandingPage` with the 7 screens from the plan (idle with logo, `h1` "WashWise", pitch and "Use my location"; requesting "Finding you…"; denied; blocked with the site-settings hint; unavailable; timeout; unsupported with no button). Keep all copy in one `LANDING_COPY` object; the idle pitch is the existing line "Laundry and car-wash advice for today’s weather." Navigate to `/home` when `request()` resolves with coordinates. Tests drive `mockGeolocation` (not a `status` prop): every screen by role and name, "Try again" starts a new request, the hint only when blocked, no button when unsupported, success navigates to `/home`, no text input or search field on any screen (FR-009), and "Try again" while blocked either stays on the blocked screen (browser still refuses) or reaches `/home` (permission re-enabled) (FR-010a) — src/pages/LandingPage.tsx, src/pages/LandingPage.test.tsx
- [x] T012 [US2] Add the DESIGN.md "Landing page" section in a new `<!-- owner: 2.3 -->` block: the 7 screens, icons used (`MapPin`, `MapPinOff`, `LoaderCircle`, `TriangleAlert`), copy table and live-region roles — DESIGN.md (new `owner: 2.3` block only)
- [ ] T013 [HUMAN] [US2] Take light and dark screenshots of all 7 landing screens and attach them to COH-21. `/implement` prepares the capture steps and leaves this unchecked — docs/screenshots/landing/

## Phase 5: US3 — Returning users skip the landing page (P1) [COH-22]

- [x] T014 [P] [US3] Implement `landingLoader` (redirect to `/home` only when permission is `granted` and saved coordinates exist) and `homeLoader` (redirect to `/` unless both hold). Neither throws. Table-driven tests over: first visit, granted + saved, granted + nothing saved, denied + saved, prompt + saved, no Permissions API — src/app/locationGuards.ts, src/app/locationGuards.test.ts
- [x] T015 [P] [US3] Implement `RequireLocation` (calls `useGeolocation({ refreshOnMount: true })`; `<Navigate to="/" replace />` when coordinates are missing or status is `denied`, `blocked` or `unsupported`; never redirects on `unavailable`/`timeout`; otherwise `<Outlet context={coordinates} />`) and `useCoordinates()` over `useOutletContext`. Tests: renders from saved coordinates at once, redirects on revocation while open, a failed refresh keeps the page — src/features/location/RequireLocation.tsx, src/features/location/useCoordinates.ts, src/features/location/RequireLocation.test.tsx
- [x] T016 [US3] Wire the loaders into the routes: `/` gets `landingLoader`; a pathless layout with `homeLoader` and `RequireLocation` wraps `/home`; add a `HydrateFallback` returning `null` (confirm the React Router 8 API). Update `routes.test.tsx` to async queries with seeded permission and storage: `/home` without a grant ends on `/`, granted + saved reaches `/home`, a revoked `onchange` on `/home` ends on `/`, and an unknown path for a returning user ends on `/home` (`*` → `/` → loader) — src/app/routes.tsx, src/app/routes.test.tsx
- [x] T017 [US3] Update `e2e/smoke.spec.ts` so the `/home` deep-link test runs in a context with geolocation granted and coordinates seeded. Add `e2e/location.spec.ts` for Pixel 7 and iPhone 14: fresh visit → "Use my location" → `/home`; reload with grant + saved coordinates → straight to `/home`; no grant with seeded storage → `/home` redirects to `/`. Route the Open-Meteo and BigDataCloud calls with `page.route` so e2e never uses the network. Check early that WebKit (iPhone 14) reports `granted` through `permissions.query`; if it does not, run the "reload with grant" scenario on Chromium only and note it in the spec file (plan risk K2) — e2e/smoke.spec.ts, e2e/location.spec.ts
- [x] T018 [US3] Add the CLAUDE.md notes in a new `<!-- owner: 2.4 -->` block: loaders and `RequireLocation` on `/home`, `useCoordinates` for P3, the no-flash rule, and the P3 hand-off (keep the previous forecast on screen while a new location loads). Also update the stale App structure tree in the P1 `owner: 1.3` block (`/` is now the location landing, `/home` sits under `RequireLocation`). This is the one allowed edit outside your own marker — CLAUDE.md

## Phase 6: US4 — Place name for the location pill (P2) [COH-20]

This phase can start as soon as Phase 1 is done. Only T021 waits for US3.

- [x] T019 [P] [US4] Implement `GEOCODE_ENDPOINT`, `buildGeocodeUrl` (coordinates rounded to 2 dp, `localityLanguage=en`), `pickPlaceName` (first non-blank of `city`, `locality`, `principalSubdivision`, else `FALLBACK_PLACE_NAME` = "Your location") and `fetchCityName` (10 s via `withTimeout`, `GeocodeError` kinds network/timeout/http/invalid). MSW tests: city, locality fallback, region fallback, all blank, 500, malformed JSON, delayed response with fake timers, 2 dp in the request — src/features/location/geocode.ts, src/features/location/geocode.test.ts
- [x] T020 [US4] Implement `useCityName(lat?, lon?)` returning a string: key `['cityName', lat2dp, lon2dp]`, `staleTime: Infinity`, disabled without coordinates, "Your location" while loading and on error. Tests: returns the name; a second hook with the same rounded coordinates makes no second request; failure gives "Your location" without throwing — src/features/location/useCityName.ts, src/features/location/useCityName.test.tsx
- [x] T021 [US4] Make the `HomePage` placeholder read `useCoordinates()` and `useCityName()` and show "Showing weather for <name>", so the guard and the lookup are visible until P3 replaces the page. Test through the memory router with granted permission, saved coordinates and an MSW geocode handler — src/pages/HomePage.tsx, src/app/routes.test.tsx
- [x] T022 [P] [US4] Add the BigDataCloud details to INFRASTRUCTURE.md in a new `<!-- owner: 2.2 -->` block, leaving the P1 `owner: 1.4` table untouched: request, name fallback order, 2 dp privacy note, in-session cache, failure behaviour — INFRASTRUCTURE.md (new block only)
- [x] T023 [P] [US4] Add a CLAUDE.md entry in a new `<!-- owner: 2.2 -->` block, separate from T009's `owner: 2.1` block: the place name only through `useCityName`, never call `fetchCityName` from a component — CLAUDE.md (new block only)

## Final Phase: Verification

- [x] T024 Run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm e2e && pnpm build`. Fix anything that fails. (`docs:check` is not a P2 gate: P2 adds no TODO placeholders — see plan "Project Documentation".)
- [ ] T025 [HUMAN] Check on real devices (Android Chrome, iOS Safari): first prompt then home; deny; blocked screen with hint; re-enable in site settings then "Try again"; revoke while the app is open; reopen as a returning user. Record the results on COH-7 — docs/screenshots/landing/
