---
name: run-checks
description: Phase 5 quality gate — typecheck, lint, build, and tests discovered from this repo’s package.json. Blocks on failure.
user-invocable: true
---

## User Input

```text
{{args}}
```

## Outline

Quality gate between implementation and review. **Discover commands from the current repo.** This project is a single Vite SPA (`npm run lint`, `npm run build`). The turbo / `apps/` examples below apply only if those directories exist.

---

### Step 0 — Discover Apps and Commands

**Scan the monorepo:**

- Read `package.json` at root — extract turbo-level scripts (`typecheck`, `lint`, `build`)
- List all directories under `apps/`
- For each app, read `apps/[name]/package.json` and extract available scripts:
  - `typecheck` → record as typecheck command
  - `lint` → record as lint command
  - `build` → record as build command
  - `test` → record as test command (optional — only if script exists)

Build a check matrix:

| App             | Typecheck         | Lint                        | Build                       | Test         |
| --------------- | ----------------- | --------------------------- | --------------------------- | ------------ |
| (root)          | `turbo typecheck` | `turbo lint`                | `node scripts/dev.js build` | —            |
| api             | `tsc --noEmit`    | —                           | `tsc -p tsconfig.json`      | `jest`       |
| player-web      | `tsc --noEmit`    | `eslint . --max-warnings 0` | `next build`                | `vitest run` |
| super-admin-web | `tsc --noEmit`    | `eslint . --max-warnings 0` | `next build`                | —            |
| venue-web       | `tsc --noEmit`    | `eslint . --max-warnings 0` | `next build`                | —            |

**Prefer root-level turbo commands** when available (they run all apps in parallel). Fall back to per-app commands only if the root script is missing.

---

### Step 1 — Typecheck (all apps)

Run: `turbo typecheck`

**If it passes:**

- Report: "Typecheck PASSED across all apps."
- Proceed to Step 2.

**If it fails:**

- Report which app(s) and files have type errors.
- **BLOCK** — do not proceed.
- Show the errors clearly and instruct the user to fix them.
- After the user indicates they've made fixes, re-run `turbo typecheck`.
- Repeat until it passes.
- If errors are complex or non-obvious, recommend:
  > "These type errors look non-trivial. Run `/debugging-wizard` for root cause analysis."

---

### Step 2 — Lint (all apps)

Run: `turbo lint`

**If it passes:**

- Report: "Lint PASSED across all apps."
- Proceed to Step 3.

**If it fails:**

- Show which files have lint violations and the specific rules triggered.
- **BLOCK** — do not proceed.
- Attempt to auto-fix safe lint issues:
  - Run: `turbo lint -- --fix` (if supported)
  - Report what was auto-fixed vs what remains
- For remaining violations: show them and wait for the user to resolve.
- Re-run `turbo lint` after user indicates fixes are done.
- Repeat until it passes.

---

### Step 3 — Design System Audit

**Detect if UI changes are involved:**

- Run: `git diff --name-only HEAD | grep -E "\.(tsx|jsx)$"`
- If no UI files changed → skip this step, report "Audit: SKIPPED (no UI changes)" and proceed to Step 4.

**If UI changes are detected:**

- Invoke the `audit` skill to check all changed UI files against the design system.
- The audit checks for: token usage, component contracts, import discipline, naming conventions, and consistency with established design system patterns.

**If audit passes (no violations):**

- Report: "Design System Audit PASSED."
- Proceed to Step 4.

**If audit finds violations:**

- Show each violation with file, line, and rule.
- **BLOCK** — do not proceed.
- Fix violations directly in the affected files.
- Re-run audit after fixes.
- Repeat until clean.

---

### Step 4 — Build (all apps)

Run: `node scripts/dev.js build`

**If it passes:**

- Report: "Build PASSED across all apps."
- Proceed to Step 5.

**If it fails:**

- Show the full build error output per app.
- **BLOCK** — do not proceed.
- Triage the error type:
  - **Missing module / import error** → fix the import path or missing dependency
  - **Compilation error** → show the exact file and line, fix directly
  - **Environment / config error** → flag to user (likely needs manual intervention)
  - **Complex / unclear error** → recommend:
    > "This build error needs deeper investigation. Invoking debugging-wizard..."
    - Apply `debugging-wizard` methodology: reproduce → isolate → hypothesize → fix → verify
- Re-run build after fixes.
- Repeat until it passes.

---

### Step 5 — Tests (apps with test scripts)

Run tests per app where a `test` script exists:

- `apps/api` → `npm run test --workspace=apps/api` (Jest)
- `apps/player-web` → `npm run test --workspace=apps/player-web` (Vitest)

Run both in parallel if no shared state dependency.

**If all pass:**

- Report: "Tests PASSED — [N] suites, [N] tests."
- Proceed to Step 6.

**If any fail:**

- Show failing test names, file locations, and error messages.
- **BLOCK** — do not proceed.
- Triage the failure type:
  - **Assertion failure** (expected X, got Y) → fix the implementation or update the test if behavior intentionally changed
  - **Test infrastructure error** (setup/teardown, mock failures) → fix the test config
  - **Flaky test** (passes/fails inconsistently) → flag explicitly, ask user whether to skip or fix
  - **Complex failure** → recommend:
    > "These test failures need deeper analysis. Invoking test-master..."
    - Apply `test-master` methodology: scope → strategy → fix → re-run → report
- Re-run tests after fixes.
- Repeat until all pass (or flaky tests are explicitly acknowledged and skipped).

---

### Step 6 — QA / Browser Verification

**Detect if UI changes are involved:**

- Run: `git diff --name-only HEAD | grep -E "\.(tsx|jsx)$|apps/(player-web|venue-web|super-admin-web)/"`
- If no frontend files changed → skip this step, report "QA: SKIPPED (no UI changes)" and proceed to Step 7
- If frontend files changed → determine which apps are affected:
  - `apps/player-web` → `http://localhost:3000`
  - `apps/venue-web` → `http://localhost:3001`
  - `apps/super-admin-web` → `http://localhost:3002`

**Check if the dev server is running:**

- Run: `lsof -i :3000 -i :3001 -i :3002 2>/dev/null | grep LISTEN`
- If not running → ask the user:
  > "The dev server does not appear to be running. Start it before QA, or skip browser verification?"
  - Options: `I'll start it now (wait for me)` / `Skip QA`
  - If skip → report "QA: SKIPPED (dev server not running)" and proceed to Step 7

**Run agent-browser smoke test:**

Use `agent-browser` (if available) to live-verify the changed feature against the P1 user story in the active `spec.md` under `specs/` (not a turbo `apps/` host unless those apps exist):

1. **Navigate and baseline:**

   ```bash
   agent-browser open http://localhost:[PORT] && agent-browser wait --load networkidle
   agent-browser screenshot --full baseline.png
   agent-browser snapshot -i
   ```

2. **Exercise the changed feature:**
   - Derive the user flow from the spec — follow the P1 user story acceptance criteria (Given → When → Then)
   - Navigate to the relevant page/section
   - Interact with the feature: click, fill, submit as the spec describes
   - After each significant action: `agent-browser diff snapshot` to verify DOM changed as expected

3. **Verify outcomes:**
   - Take a final screenshot: `agent-browser screenshot --full after.png`
   - Run visual diff: `agent-browser diff screenshot --baseline baseline.png`

4. **Report findings:**
   - If interactions succeed and no unexpected regressions → "QA Smoke Test: PASS"
   - If unexpected behavior or visual regressions found:
     - **BLOCK** — do not proceed
     - Show diff output and screenshot paths
     - Describe what failed vs what the spec expected
     - Wait for the user to fix, then re-run from step 1

5. **Close the session:**
   ```bash
   agent-browser close
   ```

---

### Step 7 — Final Report

Once all checks pass, output a consolidated summary:

```
Quality Gate PASSED

  Typecheck   PASS   [N apps]
  Lint        PASS   [N apps]
  Audit       PASS   [N violations fixed] | SKIPPED (no UI changes)
  Build       PASS   [N apps]
  Tests       PASS   [N suites / N tests] | SKIPPED (no test scripts)
  QA          PASS   [Smoke: N flows verified] | SKIPPED (no UI changes)

All checks passed. ✋ STOP — do not run `/commit`, `/review-changes`, or any subsequent skill automatically. Wait for the user to decide next steps.
```

If any check was resolved interactively (not a clean first-run pass), note:

```
  Resolved during run:
  - Typecheck: [N] errors fixed in [files]
  - Lint: [N] violations auto-fixed, [N] manually fixed
  - Audit: [N] design system violations fixed
  - Build: [N] errors fixed
  - Tests: [N] failures fixed | [N] flaky tests acknowledged
  - QA: [N] issues found and fixed | smoke test re-run [N] times
```

---

### Key Rules

- Run checks in order: typecheck → lint → audit → build → tests → QA
- Never skip a failing check — every failure is a hard block
- Prefer root-level turbo commands over per-app commands when available
- Auto-fix only safe, deterministic lint issues — never auto-fix build or type errors
- Audit runs only when UI files changed — invoke `audit` skill directly
- Delegate to `debugging-wizard` for non-obvious build errors
- Delegate to `test-master` for complex test failures
- Use `agent-browser` for QA smoke testing — follow the P1 user story from spec.md
- Always close the `agent-browser` session after QA completes
- Do not proceed to `/review-changes` until all checks pass
- **Never auto-run `/commit`, `/review-changes`, or any other skill after this gate** — always stop and wait for the user
