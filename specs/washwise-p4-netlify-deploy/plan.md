# Implementation Plan: WashWise P4.5 · Netlify Deployment with HTTPS and Preview Builds

**Date**: 2026-10-21
**Spec**: [spec.md](spec.md) (Linear COH-33)
**Status**: Draft

## Summary

Replace `vercel.json` with a `netlify.toml` that builds with the same Node/pnpm as CI, publishes `dist/`, rewrites every path to `index.html`, and sends the cache and security headers. Netlify's Git integration then deploys `main` to production, `dev` to a branch deploy (staging) and every pull request to a deploy preview. The COH-32 CI checks are the gate: they are required for merging into `dev` and `main`. A small `pnpm deploy:check <url>` script, plus a GitHub workflow that runs it on every successful Netlify deployment, proves each address is HTTPS, serves deep links and sends the right headers. The steps that need account access are explicit manual tasks with a verification for each.

## Technical Context

**Stack**: Vite 8 static build (`dist/`), vite-plugin-pwa service worker, pnpm 11 (`packageManager`), Node 24 (`.nvmrc`), GitHub Actions (COH-32).
**Primary Dependencies**: none new in the app. Netlify (Git integration, Deploy Previews, Branch Deploys, automatic Let's Encrypt HTTPS on `*.netlify.app`).
**Storage**: none.
**Target Layer(s)**: hosting config, a verification script, CI workflow, docs.
**Performance Goals**: preview ready within 10 min of a push (SC-002); rollback under 5 min (SC-006). A typical build takes about 1 min.
**Constraints**: no deploy tokens or secrets in GitHub (clarification: Netlify builds, CI gates). The same build command and Node version as CI (FR-009). No app behaviour change.

## Data Model

None.

## API Contracts

None. Open-Meteo and BigDataCloud are called from the browser exactly as today. Neither needs a key or a per-origin allow-list, so they work from every Netlify address.

## Component / Module Breakdown

### Hosting config: `netlify.toml` (new; FR-001 – FR-004, FR-009, FR-013)

- `[build]`: `command = "corepack enable && pnpm build"`, `publish = "dist"`.
- `[build.environment]`: `NODE_VERSION = "24"` and `COREPACK_ENABLE_STRICT = "0"`. The build command is `corepack enable && pnpm build`, so pnpm 11 comes from `packageManager` even if the image's default pnpm is older (R2). Fallback, documented, if the image's install step fails: set `PNPM_FLAGS = "--frozen-lockfile"`, or install in the command (`corepack enable && pnpm install --frozen-lockfile && pnpm build`). This is checked on the first deploy (manual step 1).
- `[[redirects]] from = "/assets/*" to = "/404.html" status = 404`, **before** the fallback. A missing fingerprinted asset (an old page asking for a file the new release removed) must get a real 404, not `index.html` served as JavaScript, which breaks a returning user's page mid-update (R3). `public/404.html` is a tiny static page.
- `[[redirects]] from = "/*" to = "/index.html" status = 200`. This is the SPA fallback; real files are served first, because Netlify only rewrites when no file matches (`force` stays off).
- **Cache headers** (carried over from `vercel.json`, 4.2 R1):
  - `/index.html`, `/sw.js`, `/manifest.webmanifest`, `/registerSW.js` if present, and `/` → `Cache-Control: no-cache`;
  - `/assets/*` (fingerprinted by Vite) → `public, max-age=31536000, immutable`.
- **Security headers** on `/*`:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`;
  - `X-Content-Type-Options: nosniff`;
  - `X-Frame-Options: DENY`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()`.

  No CSP in this task: the inline theme script in `index.html` would need a hash, and a wrong CSP silently breaks the app (see Known Risks).
- HTTP → HTTPS: Netlify forces HTTPS on `*.netlify.app` by default (FR-001). Verified by `deploy:check`, not configured.
- No-index on previews: Netlify adds `X-Robots-Tag: noindex` to deploy previews and branch deploys automatically (FR-006). Also verified.
- **Remove** `vercel.json` (FR-010).

### Config guard: `scripts/netlify-config.test.ts` (new)

A Vitest test that parses `netlify.toml` (with the `smol-toml` dev dependency) and asserts:

- the build command and publish dir match `package.json` / `vite.config.ts`;
- the SPA rewrite is present and not forced;
- each required cache and security header exists on the right path;
- `Permissions-Policy` keeps `geolocation=(self)` (R4);
- the `/assets/*` 404 rule comes before the SPA fallback (R3).

This catches a config edit that would break location, updates or deep links before anything deploys. It works like `contrast.test.ts` parsing `tokens.css`.

### Deployed-site check: `scripts/check-deploy.ts` + `pnpm deploy:check <url>` (new; SC-001, SC-003)

Plain `fetch` against a deployed URL. It fails, naming what is wrong, unless:

1. the URL is `https://` and the `http://` form redirects (301/308) to it;
2. `/`, `/home` and `/no-such-page` return 200 HTML containing the app root (`<div id="root">`);
3. `/sw.js`, `/index.html` and `/manifest.webmanifest` have `Cache-Control: no-cache`, and one `/assets/*.js` from the HTML is `immutable`;
4. every security header from the list above is present; `/manifest.webmanifest` is served as `application/manifest+json` and `/sw.js` as JavaScript, so `nosniff` can't break install or updates (R4); `/assets/does-not-exist.js` returns 404 (R3);
5. on a preview or branch deploy (`--preview`), `X-Robots-Tag` contains `noindex`; on production (`--production`), it doesn't.

Unit-tested against a stubbed `fetch` (`scripts/check-deploy.test.ts`), as the other `scripts/*.test.ts` are.

### Workflow: `.github/workflows/deploy-check.yml` (new)

- Trigger: `deployment_status`, when `state == 'success'` and the creator is Netlify, assuming Netlify's GitHub integration creates a GitHub Deployment for each deploy preview, branch deploy and production deploy. **Verify on PR #4 once the site exists (R1).** If no deployments appear, switch the trigger to `status` events from `netlify/<site>/deploy-preview` (and the production context) with `state == 'success'`, using `target_url`.
- Job: checkout, pnpm, Node 24, `pnpm deploy:check "${{ github.event.deployment_status.environment_url }}" --preview|--production`, choosing the flag from `deployment.environment` (`Production` vs others).
- `permissions: contents: read, deployments: read`. No secrets.
- It shows as a check on the PR, next to the Netlify statuses. It is **not** a required check: it runs after deploy, and a rollback, not a blocked merge, is the fix if production fails it.

### Branch → environment (FR-004, FR-005)

| Branch / event          | Netlify context | Address                                          |
| ----------------------- | --------------- | ------------------------------------------------ |
| `main`                  | production      | `https://<site>.netlify.app`                     |
| `dev`                   | branch-deploy   | `https://dev--<site>.netlify.app` (staging)      |
| PR to `dev` or `main`   | deploy-preview  | `https://deploy-preview-<n>--<site>.netlify.app` |

The same `netlify.toml` applies to all contexts; nothing differs per context except Netlify's own preview headers.

### Manual steps (FR-012)

Each is a `[HUMAN]` task with its verification:

1. **Create the Netlify site** (team member with Netlify access): Add new site → Import from GitHub → `CoDev-Cohort/WashWise`. Production branch `main`; Branch deploys: "Let me add individual branches" → `dev`; Deploy Previews: on, "Any pull request against your production branch / branch deploy branches". Build settings come from `netlify.toml`. Pick the site name (`washwise` if free). Verify: the first production deploy succeeds and `pnpm deploy:check https://<site>.netlify.app --production` passes.
2. **Install the Netlify GitHub App** on the repo (done as part of import), so it posts statuses, deploy-preview comments and GitHub Deployments. Verify: PR #4 shows "Deploy Preview ready" and the `deploy-check` run passes.
3. **Branch protection** (repo admin), from COH-32: require `checks`, `e2e / android-chrome` and `e2e / ios-safari` on `dev` and `main`, and require branches to be up to date. Verify: a PR with a deliberately failing check can't be merged (SC-005). Use a throwaway PR, closed after.
4. **Access**: list in the docs who has Netlify team access; add at least two maintainers so a rollback never waits on one person.

### Rollback and kill switch (FR-008, Story 1.5)

- **Rollback** (documented, under 5 min): Netlify → Deploys → pick the last good production deploy → "Publish deploy". Optionally "Lock publishing" while fixing. No code change.
- A failed build never replaces the live deploy (Netlify default).
- The **offline kill switch** from 4.2 (`selfDestroying: true`) stays the answer for a broken service worker; rollback alone doesn't help users whose old worker is cached. The docs link the two.

### Docs (FR-010, FR-011, FR-014)

- **INFRASTRUCTURE.md**, the `## Hosting & deploy` placeholder (owner `P4`): replace its TODO with a `<!-- owner: 4.5 -->` block covering:
  - the addresses table;
  - contexts and branch mapping;
  - build settings;
  - headers (cache and security);
  - previews are `noindex` and have separate storage, so testers allow location on each (FR-014);
  - `deploy:check` and the workflow;
  - rollback, the kill switch and access.

  Also update the 4.2 block's "HTTP caching" row from `vercel.json` to `netlify.toml`.
- **CLAUDE.md**: the "Deep links" line moves from `vercel.json` to `netlify.toml`.
- **README.md**: the production URL and a Netlify status badge, once the site exists (filled in by the manual task; a placeholder line until then).
- **Linear**: the description already says Netlify; nothing to change.

## Project Structure

```
netlify.toml                         new
public/404.html                      new: real 404 for missing assets
vercel.json                          removed
scripts/
  check-deploy.ts (+ .test.ts)       new: pnpm deploy:check <url> [--preview|--production]
  netlify-config.test.ts             new: guards netlify.toml
.github/workflows/deploy-check.yml   new: runs deploy:check on each successful Netlify deployment
package.json                         (scripts.deploy:check; devDependency smol-toml)
INFRASTRUCTURE.md, CLAUDE.md, README.md
```

## Dependencies

| Package / service       | Why                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `smol-toml` (dev)       | parse `netlify.toml` in the config guard test                                                 |
| Netlify (free tier)     | hosting, HTTPS, previews, branch deploys; Git integration, so there are no tokens in GitHub   |

## Resolved items

The spec has no open `[NEEDS CLARIFICATION]` items. Planning decisions:

- **Config in `netlify.toml`**, not `_headers`/`_redirects`, so build, redirects and headers live in one reviewed file.
- **No CSP yet**: it is out of the spec's FR-013 list; it would need the inline script hashed and the two API origins listed. It can be a follow-up.
- **`deploy-check` is not required**: it runs after a deploy, so it can't block one.

## Implementation notes

- `registerSW.js` is not emitted (`injectRegister: false`; the app registers from React), so its no-cache rule was dropped.
- `deploy:check` against `vite preview` confirms the R3 problem is real: locally a missing asset answers 200 with the app page. On Netlify the `/assets/*` 404 rule prevents it.
- The README links to INFRASTRUCTURE.md for the live addresses. The Netlify status badge needs the site ID, so it is added when the site exists (manual step).

## Known Risks

| Risk                                                                   | Status                                                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| R1 Netlify doesn't create GitHub Deployments, so `deploy-check` never runs | Mitigated: verified on PR #4; fallback trigger on Netlify commit statuses                    |
| R2 First Netlify build fails on pnpm 11 / Node 24                      | Mitigated: `NODE_VERSION`, Corepack in the build command, documented fallback; first-deploy check |
| R3 A missing asset is answered with `index.html` and breaks updating pages | Mitigated: `/assets/*` 404 rule before the SPA fallback; guarded by test and `deploy:check`  |
| R4 A security header breaks location, install or updates               | Mitigated: config test (`geolocation=(self)`); `deploy:check` checks content types             |
| R5 Free-tier build minutes run out from preview builds                 | Accepted: builds are ~1 min; an ignore rule for docs-only changes is a follow-up if needed      |
| No CSP                                                                 | Accepted (out of FR-013); follow-up with a hashed inline theme script                          |

## Constitution Compliance

There is no `AGENTS.md`; the `CLAUDE.md` conventions act as the constitution.

| Rule                                                  | Status | Note                                                                          |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| Spec → plan → tasks before code                       | PASS   | This plan precedes tasks                                                      |
| Client-only, no server, no accounts, no analytics     | PASS   | Static hosting only; no functions                                             |
| Never hit the network in tests                        | PASS   | `check-deploy.test.ts` stubs `fetch`; the real check runs only in its workflow |
| Tests next to code                                    | PASS   | `scripts/*.test.ts` beside the scripts                                        |
| PR base `dev`; checks before merge                    | PASS   | Required checks on `dev` and `main`                                           |
| No product behaviour change                           | PASS   | Config, script, workflow, docs                                                |
