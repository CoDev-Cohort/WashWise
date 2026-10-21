# Tasks: WashWise P4.5 · Netlify Deployment with HTTPS and Preview Builds

**Date**: 2026-10-21
**Spec**: specs/washwise-p4-netlify-deploy/spec.md
**Plan**: specs/washwise-p4-netlify-deploy/plan.md
**Structure**: By user story (B)
**Tracker**: Linear COH-33 (task 4.5, parent COH-9)

Format: `- [ ] TaskID [P?] [Story?] [COH-ID] Description — path`
Stories:

- US1 = use WashWise at a public HTTPS address (P1)
- US2 = a preview address for every pull request (P1)
- US3 = nothing unchecked reaches production (P1)
- US4 = the team knows how deploys work (P2)

Markers:

- `[HUMAN]` = needs a person with Netlify or GitHub admin access; `/implement` prepares it and leaves the box unchecked.
- `[P]` = can run in parallel with the other `[P]` tasks in the same phase (different files, no shared unfinished dependency).

Red-team mitigations from the plan are built in:

- R1 deploy check trigger → T009, T016
- R2 first build environment → T003, T015
- R3 missing assets get a 404 → T003, T004, T006
- R4 headers break features → T004, T006

---

## Phase 1: Setup (blocks everything)

- [ ] T001 [P] [COH-33] Add `smol-toml` as a dev dependency (`pnpm add -D`) and the script `"deploy:check": "tsx scripts/check-deploy.ts"` — package.json, pnpm-lock.yaml
- [ ] T002 [P] [COH-33] Add a tiny static 404 page using the token colors inline (no JS, no external requests) — public/404.html

## Phase 2: Foundational (blocking prerequisites)

- [ ] T003 [COH-33] Write the Netlify config:
  - `[build]`: `command = "corepack enable && pnpm build"`, `publish = "dist"`;
  - `[build.environment]`: `NODE_VERSION = "24"`, `COREPACK_ENABLE_STRICT = "0"` (R2);
  - redirects, in this order: `/assets/*` → `/404.html` status 404 (R3), then `/*` → `/index.html` status 200 (not forced);
  - headers:
    - `Cache-Control: no-cache` on `/`, `/index.html`, `/sw.js`, `/manifest.webmanifest`, `/registerSW.js`;
    - `public, max-age=31536000, immutable` on `/assets/*`;
    - on `/*`: HSTS `max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()`.

  Comment each block with its spec requirement — netlify.toml

- [ ] T004 [COH-33] Config guard test. Parse `netlify.toml` and assert:
  - the build command runs `pnpm build` and the publish dir is `dist` (matches `vite.config.ts`);
  - the SPA fallback is present and not forced;
  - the `/assets/*` 404 rule comes before it (R3);
  - every no-cache path and the immutable assets rule are there;
  - every security header is present, and `Permissions-Policy` contains `geolocation=(self)` (R4).

  Depends on T001, T003 — scripts/netlify-config.test.ts

- [ ] T005 [COH-33] Remove the old host config (FR-010) — vercel.json
- [ ] T006 [COH-33] Add `pnpm deploy:check <url> [--preview|--production]`, with plain `fetch` and a readable list of failures. It checks:
  1. HTTPS, and the `http://` form redirects to it;
  2. `/`, `/home` and `/no-such-page` return 200 HTML with `<div id="root">`;
  3. no-cache on `/sw.js`, `/index.html` and `/manifest.webmanifest`, and `immutable` on one `/assets/*.js` from the HTML;
  4. `/assets/does-not-exist.js` returns 404 (R3);
  5. all security headers are present, the manifest is `application/manifest+json` and `sw.js` is JavaScript (R4);
  6. `X-Robots-Tag: noindex` with `--preview`, and absent with `--production`.

  Exit 1 on any failure — scripts/check-deploy.ts

- [ ] T007 [COH-33] Unit tests with a stubbed `fetch`: a fully correct site passes; each check fails on its own broken response (missing header, deep link 404, asset fallback 200, `http` not redirecting, wrong noindex for the context). Depends on T006 — scripts/check-deploy.test.ts

## Phase 3: US1 — WashWise at a public HTTPS address (P1) [COH-33]

- [ ] T008 [US1] [COH-33] Build locally (`pnpm build`) and confirm `dist/` holds `index.html`, `sw.js`, `manifest.webmanifest`, `404.html` and `assets/`, so every path the config names exists. Note any extra root files the service worker needs in the no-cache list — dist/ (not committed)

## Phase 4: US2 — Preview address for every pull request (P1) [COH-33]

- [ ] T009 [US2] [COH-33] Add a workflow on `deployment_status`:
  - runs when `state == 'success'` and the creator is Netlify;
  - checkout, pnpm, Node 24, then `pnpm deploy:check "$URL"` with `--production` when `deployment.environment == 'Production'`, else `--preview`;
  - `permissions: contents: read, deployments: read`; not a required check.

  Lint it with `actionlint`. Note the R1 fallback (`status` events from `netlify/*`) in a comment — .github/workflows/deploy-check.yml

## Phase 5: US3 — Nothing unchecked reaches production (P1) [COH-33]

- [ ] T010 [P] [US3] [COH-33] Write the rollback procedure (Deploys → last good deploy → "Publish deploy"; optionally "Lock publishing") and link it to the 4.2 offline kill switch. Goes into T011's block — INFRASTRUCTURE.md

## Phase 6: US4 — The team knows how deploys work (P2) [COH-33]

- [ ] T011 [US4] [COH-33] INFRASTRUCTURE.md, the `## Hosting & deploy` placeholder: replace its TODO with a `<!-- owner: 4.5 -->` block covering:
  - the addresses table (production `main`, staging `dev`, previews per PR);
  - build settings (Node 24, pnpm via Corepack);
  - the redirects and why `/assets/*` misses are 404s;
  - cache and security headers;
  - previews are `noindex` and keep separate saved data (allow location on each, FR-014);
  - `deploy:check` and its workflow;
  - rollback (T010) and the kill switch;
  - who has Netlify access.

  In the 4.2 block, change the "HTTP caching" row from `vercel.json` to `netlify.toml` — INFRASTRUCTURE.md

- [ ] T012 [P] [US4] [COH-33] Change the "Deep links" line from `vercel.json` to `netlify.toml` — CLAUDE.md
- [ ] T013 [P] [US4] [COH-33] Add a "Live" line with the production URL and a Netlify status badge (placeholder until T014 gives the site name), and add `pnpm deploy:check` to the scripts table — README.md

## Manual steps (people with access)

- [ ] T014 [HUMAN] [US1] [COH-33] Create the Netlify site: import `CoDev-Cohort/WashWise`; production branch `main`; branch deploys for `dev` only; deploy previews for PRs to `main` and `dev`. Build settings come from `netlify.toml`. Name the site (`washwise` if free). Verify: the first production deploy succeeds and `pnpm deploy:check https://<site>.netlify.app --production` passes. Record the URL in README/INFRASTRUCTURE (T011, T013) — Netlify UI
- [ ] T015 [HUMAN] [US1] [COH-33] If the first build fails on pnpm/Node (R2), apply the documented fallback (`PNPM_FLAGS` or install in the build command), push, and rebuild. Verify: the build log shows Node 24 and pnpm 11 — netlify.toml, Netlify UI
- [ ] T016 [HUMAN] [US2] [COH-33] On PR #4: the Netlify bot posts "Deploy Preview ready", and the `deploy-check` workflow runs on it and passes. If no GitHub Deployment appears, switch T009's trigger to Netlify commit statuses (R1). Open the preview on an Android phone and an iPhone: HTTPS, location, verdicts, install, offline after one visit (SC-004) — GitHub, phones
- [ ] T017 [HUMAN] [US3] [COH-33] A repo admin requires `checks`, `e2e / android-chrome` and `e2e / ios-safari` on `dev` and `main` (branch up to date before merge). Verify: a throwaway PR with a failing test can't be merged, then close it (SC-005) — GitHub settings
- [ ] T018 [HUMAN] [US4] [COH-33] Add at least two maintainers to the Netlify team and list them in the docs. Time a practice rollback on staging (`dev`): under 5 min (SC-006) — Netlify UI, INFRASTRUCTURE.md

## Final Phase: Verification

- [ ] T019 [COH-33] Run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build && pnpm docs:check --done 4.5` locally and confirm CI is green on PR #4. No golden snapshot diff is expected — package.json scripts, GitHub
