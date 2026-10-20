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

> TODO (task 1.4)

## Caching & timeouts

> TODO (task 1.4)

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
