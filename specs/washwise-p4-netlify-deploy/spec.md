# Feature Specification: WashWise P4.5 · Netlify Deployment with HTTPS and Preview Builds

**Created**: 2026-10-21
**Status**: Draft
**Source**: Linear COH-33 (task 4.5, phase COH-9 "P4 · Hardening"). Blocked by COH-11 (1.1 Scaffold); finalised after 4.1–4.4.

## Overview

WashWise has to be reachable by real users on a public HTTPS address, because browsers only give a web page the device location over a secure connection. This task publishes the app on Netlify: a production site that always shows the released version, a preview site for every pull request so reviewers can try changes on a real phone before merging, and a rule that nothing reaches production without passing the project's checks.

## User Stories

### Story 1 — Use WashWise at a public HTTPS address (Priority: P1)

A person opens the WashWise address on their phone. The page loads over HTTPS, asks for their location, and shows the verdicts. Reloading the home page, opening a shared link to it, or opening the installed app all work. Typing the address with `http://` sends them to the secure version.

**Why this priority**: Without a secure public address there are no users: location (the core of the app) is blocked on insecure pages.

**Acceptance Criteria**:

1. **Given** the production address, **When** it is opened, **Then** it is served over HTTPS with a valid certificate and the landing page loads.
2. **Given** the `http://` form of the address, **When** it is opened, **Then** the browser is redirected to `https://`.
3. **Given** a user who allowed location, **When** they use the production site, **Then** the location prompt appears and the home page shows verdicts for their position.
4. **Given** a direct link to the home page or any unknown path, **When** it is opened or reloaded, **Then** the app loads (and routes as it does locally) instead of a "page not found" error.
5. **Given** a new release, **When** a returning user opens the app, **Then** they get the update notice from task 4.2 (the app's own files are never cached so long that an update can't reach them).
6. **Given** the production site, **When** checked on an Android phone and an iPhone, **Then** it can be installed to the home screen and opens offline after one visit (4.2).

### Story 2 — Try every pull request on a preview address (Priority: P1)

A contributor opens a pull request. Within a few minutes a preview address for that exact change appears on the pull request. Reviewers open it on a phone, allow location, and try the change. Each new push updates the same preview. Previews never affect the production site.

**Why this priority**: "Preview URL per PR" is an acceptance criterion; it is also how the team checks phone-only behaviour (location, install, offline) that automated tests fake.

**Acceptance Criteria**:

1. **Given** a pull request to the integration or main branch, **When** it is opened, **Then** a preview address is posted on the pull request.
2. **Given** a new push to that pull request, **When** it is built, **Then** the preview updates to the new commit.
3. **Given** a preview address, **When** opened on a phone, **Then** it is HTTPS, location works, and it behaves like production (deep links, install, offline).
4. **Given** a preview, **When** search engines visit it, **Then** it is not indexed.
5. **Given** a preview build fails, **When** the team looks at the pull request, **Then** the failure is visible there, and production is unaffected.
6. **Given** a merge into the integration branch, **When** it is built, **Then** the fixed staging address shows the latest integrated build.

### Story 3 — Nothing unchecked reaches production (Priority: P1)

The production site only ever shows code that passed lint, type checks, unit tests, the build and the end-to-end tests. A change that fails them can't be merged to the release branch, so it never deploys.

**Why this priority**: "Build passes lint and tests" is an acceptance criterion; shipping a broken build to users is the main risk of automatic deploys.

**Acceptance Criteria**:

1. **Given** the release branch, **When** a change is merged into it, **Then** production deploys that change automatically.
2. **Given** a pull request whose checks fail, **When** someone tries to merge it into the release branch, **Then** merging is blocked.
3. **Given** a production deploy that fails to build, **When** it fails, **Then** the previous production version stays live.
4. **Given** a bad release reached production, **When** the team needs to undo it, **Then** they can restore the previous version in a few minutes without a code change, by a documented procedure.

### Story 4 — The team knows how deploys work (Priority: P2)

A team member can find, in the project docs, the production and preview addresses, which branch deploys where, how to roll back, the kill switch for a broken offline release (4.2), and who has access to the hosting account.

**Why this priority**: Needed to operate the app, but the site works without it.

**Acceptance Criteria**:

1. **Given** the docs, **When** a new team member reads them, **Then** they can find the production URL, how previews appear, how to roll back, and how to use the offline kill switch.
2. **Given** references to the previous hosting setup, **When** this task is done, **Then** none remain in the code or docs.

### Edge Cases

- What happens when a preview is opened after its pull request is merged or closed? → It may stay reachable (host default) but is never linked from production; it is not indexed.
- What happens when a preview and production are installed on the same phone? → They are separate apps on separate addresses, each with its own saved data.
- What happens if the release branch receives a commit while checks are not yet required? → It deploys; requiring checks (Story 3) is what prevents this, so it is part of this task's done criteria.
- What happens when the host has an outage? → Users with the app installed still open it offline with the last forecast (4.2).
- What happens to the place-name and weather services from a preview address? → They work the same as production (no keys, no allow-list per address).

## Functional Requirements

- **FR-001**: The app MUST be published on Netlify at a production address served over HTTPS with a valid certificate; `http://` MUST redirect to `https://`.
- **FR-002**: Every path the app routes (home, landing, unknown paths) MUST load the app on direct open and reload.
- **FR-003**: The files that decide which version runs (the page shell, the service worker, the app manifest) MUST be served so browsers always check for a newer version; fingerprinted assets MAY be cached long-term.
- **FR-004**: Production MUST deploy automatically from the release branch (`main`). The integration branch (`dev`) MUST deploy automatically to its own fixed staging address.
- **FR-005**: Every pull request to the integration or release branch MUST get its own HTTPS preview address, posted on the pull request and updated on every push.
- **FR-006**: Previews MUST NOT be indexed by search engines and MUST NOT change production.
- **FR-007**: Merging into the release branch and the integration branch MUST require the project checks (lint, types, formatting, unit tests, build, end-to-end on both phone profiles) to pass, so neither production nor staging ever builds unchecked code.
- **FR-008**: A failed build MUST leave the previous deploy live, and the team MUST be able to restore an earlier production deploy without a code change.
- **FR-009**: The production build MUST use the same build command and runtime version as the project checks.
- **FR-010**: Configuration for the previous host MUST be removed, and docs MUST describe the new hosting accurately.
- **FR-011**: Docs MUST state the production URL, preview behaviour, branch-to-environment mapping, rollback, the offline kill switch, and how access to the hosting account is managed.
- **FR-012**: Steps only a person with account access can do (creating the site, connecting the repository, requiring checks) MUST be listed as explicit manual steps with their verification.
- **FR-013**: Every address (production, staging, previews) MUST send HSTS and a small set of safe security headers: no MIME-type sniffing, no embedding in other sites' frames, a strict referrer policy, and device location allowed only for the site itself. They MUST NOT break the weather or place-name requests, fonts, icons or the service worker.
- **FR-014**: Previews and staging MUST be separate addresses from production, so saved location, theme and forecasts on one never leak into another; the docs MUST say so (testers allow location separately on each).

## Out of Scope

- A custom domain (the host's default address is used; a domain can be added later without code changes).
- Server-side code, functions, analytics or monitoring.
- Moving the project checks into the host's build (CI stays the gate, per clarification).
- Load or performance testing of the hosting.
- Changes to app behaviour.

## Success Criteria

- **SC-001**: The production address loads over HTTPS with a valid certificate, and `http://` redirects to it.
- **SC-002**: 100% of pull requests opened after setup show a working preview address within 10 minutes of each push.
- **SC-003**: A deep link to `/home` and an unknown path both load the app on production and on a preview.
- **SC-004**: On a real phone, production asks for location and shows verdicts, and installs to the home screen.
- **SC-005**: A pull request with a failing check can't be merged into the release branch.
- **SC-006**: A rollback to the previous production deploy, following the docs, takes under 5 minutes.
- **SC-007**: The staging address always shows the latest commit on the integration branch within 10 minutes of a merge.

## Clarifications

### Session 2026-10-21

- Q: The issue says Netlify but the repo was set up for Vercel. Which host? → A: Netlify, as the issue says; the Vercel configuration and docs are replaced (FR-001, FR-010).
- Q: How are deploys gated on the project checks? → A: The host builds from Git (production from the release branch, previews per pull request); the CI checks are required for merging, so nothing unchecked reaches the release branch (FR-007).
- Q: Does a Netlify site exist? → A: No; a team member with access creates it and connects the repository (manual step, FR-012).
- Q: Which branch is production; does the integration branch get an address? → A: `main` is production; `dev` deploys to a fixed staging address; pull requests get previews (FR-004, Story 2 criterion 6).

### Checklist 2026-10-21

- CHK001 [Consistency] Checks required on both `dev` and `main` (FR-007).
- CHK002 [Completeness] HSTS and basic security headers on every address (FR-013).
- CHK003 [Clarity] Previews/staging never share saved data with production; documented (FR-014).
