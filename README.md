# WashWise

[![CI](https://github.com/CoDev-Cohort/WashWise/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/CoDev-Cohort/WashWise/actions/workflows/ci.yml)

Should you do laundry or wash the car today? WashWise is a mobile-first web app that answers with **Go Wash**, **Caution** or **Not yet**, based on the weather where you are right now.

## Prerequisites

- **Node.js 24** (LTS). See `.nvmrc`; run `nvm use` if you use nvm.
- **pnpm 11**. Run `corepack enable` and the version pinned in `package.json` is used automatically.
- For end-to-end tests, Playwright's browsers: `pnpm exec playwright install chromium webkit`.

## Setup

```sh
git clone https://github.com/CoDev-Cohort/WashWise.git
cd WashWise
pnpm install
pnpm dev
```

No API keys or environment variables are needed. Every external service is public and keyless.

## Scripts

| Command                                    | What it does                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `pnpm dev`                                 | Start the dev server at http://localhost:5173                                                 |
| `pnpm build`                               | Type-check and build for production into `dist/`                                              |
| `pnpm preview`                             | Serve the production build at http://localhost:4173                                           |
| `pnpm typecheck`                           | Type-check only (`tsc -b`)                                                                    |
| `pnpm lint`                                | ESLint                                                                                        |
| `pnpm format` / `pnpm format:check`        | Prettier write / check                                                                        |
| `pnpm test`                                | Unit and component tests (Vitest), run once                                                   |
| `pnpm test:watch`                          | Vitest in watch mode                                                                          |
| `pnpm e2e`                                 | Playwright end-to-end tests (builds, then serves on port 4319). CI runs them on both profiles |
| `pnpm docs:check --done 1.2` / `--phase 1` | Fail if task-owned doc sections are still placeholders                                        |
| `pnpm fixtures:record`                     | Re-record real Open-Meteo responses for the golden tests (deliberate use only)                |
| `pnpm verdict:report`                      | Show how often each verdict appears per fixture location (`--gate` exits 1 on a failed gate)  |
| `pnpm pwa:assets`                          | Regenerate PWA icons from `public/logo.svg`                                                   |

## Project docs

| Doc                                            | For                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                         | Conventions, structure and rules for contributors and AI agents. **Read before coding.** |
| [DESIGN.md](DESIGN.md)                         | Figma source, design tokens, typography, icons, dark palette                             |
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md)         | Architecture, external APIs, caching, PWA, hosting                                       |
| [Spec](specs/washwise-p1-foundation/spec.md)   | P1 Foundation feature specification                                                      |
| [Plan](specs/washwise-p1-foundation/plan.md)   | P1 technical plan                                                                        |
| [Tasks](specs/washwise-p1-foundation/tasks.md) | P1 task list                                                                             |

Work is tracked in Linear (epic COH-5; P1 Foundation is COH-6).

<!-- owner: 1.6 -->

## Credits

- Weather icons: [Meteocons](https://github.com/basmilius/weather-icons) by Bas Milius, MIT License ([`public/meteocons/LICENSE`](public/meteocons/LICENSE)). The static versions are generated from the animated originals.
- UI icons: [Lucide](https://lucide.dev), ISC License.
- Fonts: [Fraunces](https://fonts.google.com/specimen/Fraunces), [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) and [Barlow](https://fonts.google.com/specimen/Barlow), SIL Open Font License, self-hosted via [Fontsource](https://fontsource.org).
- Weather data: [Open-Meteo](https://open-meteo.com) (CC BY 4.0).

<!-- /owner: 1.6 -->
