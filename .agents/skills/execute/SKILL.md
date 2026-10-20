---
name: execute
description: Phase 4 orchestrator — runs /analyze on spec, plan, and tasks, validates that all three exist in specs/, organizes them into a numbered workflow folder, writes ACTIVE_WORKFLOW.md, then runs /implement. Replaces a flat specs/ structure with a per-workflow subfolder.
user-invocable: true
---

## User Input

```text
{{args}}
```

**Flags:**

- `--skip-implement` — organize and write `ACTIVE_WORKFLOW.md`, but skip Step 7 (do not run `/implement`). Useful when you want to set up the workflow folder first and run implementation separately.

## Outline

Phase 4 orchestrator: run `/analyze` on spec, plan, and tasks to improve quality; verify all three workflow artifacts exist; organize them into a numbered `specs/NNN-slug/` folder; write `specs/ACTIVE_WORKFLOW.md` as an agent pointer; then execute all tasks from `tasks.md` via the implement skill.

Parse `{{args}}` at the start and set `$SKIP_IMPLEMENT = true` if `--skip-implement` is present, otherwise `false`.

---

### Step 0 — Run Analyze

Invoke the analyze skill (`/analyze`) to improve spec, plan, and tasks before organizing the workflow.

1. **Verify files exist** — check that `specs/spec.md`, `specs/plan.md`, and `specs/tasks.md` exist:

   ```sh
   for f in specs/spec.md specs/plan.md specs/tasks.md; do
     [ -f "$f" ] && echo "EXISTS: $f" || echo "MISSING: $f"
   done
   ```

2. **If any file is MISSING** → block immediately and report:

   > "BLOCKED: The following files are required before running /execute:"
   >
   > - `[list of missing files]`
   >
   > "Please complete the missing phase(s) first:"
   >
   > - Missing `spec.md` → run `/create-spec` (Phase 1)
   > - Missing `plan.md` → run `/create-plan` (Phase 2)
   > - Missing `tasks.md` → run `/create-tasks` (Phase 3)

   Stop. Do not proceed until all three files exist.

3. **If all files exist** → run the analyze skill workflow on `specs/spec.md`, `specs/plan.md`, `specs/tasks.md`:
   - Use `specs/` as the artifact root (not `specs/[branch]/`) — follow the analyze skill's flow but load from `specs/`
   - Build semantic models, run detection passes, assign severity, output the analysis report
   - Offer remediation — if the user wants concrete edit suggestions for top issues, provide them (analyze is read-only; user may apply edits manually or approve agent edits)
   - Proceed to Step 1 when done

---

### Step 1 — Check for Existing Active Workflow

Run: `cat specs/ACTIVE_WORKFLOW.md 2>/dev/null`

If `specs/ACTIVE_WORKFLOW.md` exists → show the user:

> "There is already an active workflow: **[feature name from file]** in `[folder path from file]`."
> "Continuing will create a new workflow folder and switch the active workflow."
> "Continue? (yes / cancel)"

If user says **cancel** → stop. Report: "Cancelled. Active workflow unchanged."

If user says **yes** (or no existing file) → proceed to Step 2.

---

### Step 2 — Generate Workflow Folder Name

**Read the feature name from `specs/spec.md`:**

- Look for the heading: `# Feature Specification: [FEATURE NAME]`
- Extract the feature name after the colon
- Store as `$FEATURE_NAME`

**Derive a kebab-case slug from `$FEATURE_NAME`:**

- Lowercase
- Replace spaces and non-alphanumeric characters with hyphens
- Collapse consecutive hyphens into one
- Strip leading/trailing hyphens
- Truncate to 40 characters
- Example: "Court Tab Physical Assignment" → `court-tab-physical-assignment`
- Store as `$SLUG`

**Final folder:** `$SLUG` (e.g. `court-tab-physical-assignment`)

- Store as `$WORKFLOW_FOLDER`
- Store full path as `$WORKFLOW_DIR = specs/$WORKFLOW_FOLDER`

---

### Step 3 — Confirm Folder Name with User

Present the plan to the user:

> "Workflow folder: `specs/$WORKFLOW_FOLDER/`"
>
> "The following files will be moved:"
>
> - `specs/spec.md` → `specs/$WORKFLOW_FOLDER/spec.md`
> - `specs/plan.md` → `specs/$WORKFLOW_FOLDER/plan.md`
> - `specs/tasks.md` → `specs/$WORKFLOW_FOLDER/tasks.md`

Ask: `Proceed with this folder name? (yes / rename / cancel)`

- **yes** → proceed to Step 4
- **rename** → ask: "Enter a custom folder name:"
  - Accept the user's input
  - Apply kebab-case normalization (lowercase, hyphens, collapse, truncate to 40 chars)
  - Update `$WORKFLOW_FOLDER = [normalized input]` and `$WORKFLOW_DIR`
  - Show the final name: "Folder will be: `specs/$WORKFLOW_FOLDER/`"
  - Confirm once more: `Proceed? (yes / cancel)`
- **cancel** → stop. Report: "Cancelled. No files were moved."

---

### Step 4 — Create Folder and Move Files

1. Create the workflow folder:

   ```sh
   mkdir -p specs/$WORKFLOW_FOLDER
   ```

2. Move all three files:

   ```sh
   mv specs/spec.md specs/$WORKFLOW_FOLDER/spec.md
   mv specs/plan.md specs/$WORKFLOW_FOLDER/plan.md
   mv specs/tasks.md specs/$WORKFLOW_FOLDER/tasks.md
   ```

3. Verify the moves succeeded:
   ```sh
   for f in spec.md plan.md tasks.md; do
     [ -f "specs/$WORKFLOW_FOLDER/$f" ] && echo "OK: $f" || echo "FAILED: $f"
   done
   ```
   If any move failed → report the error and stop. Do not proceed to Step 5.

---

### Step 5 — Write ACTIVE_WORKFLOW.md

Write the following to `specs/ACTIVE_WORKFLOW.md` (substituting actual values):

```markdown
# Active Workflow

**Feature**: [FEATURE NAME]
**Folder**: `specs/NNN-slug/`
**Created**: [DATE]
**Status**: In Progress

## Artifacts

| File  | Path                      | Status |
| ----- | ------------------------- | ------ |
| Spec  | `specs/NNN-slug/spec.md`  | Ready  |
| Plan  | `specs/NNN-slug/plan.md`  | Ready  |
| Tasks | `specs/NNN-slug/tasks.md` | Ready  |

## Agent Instructions

All workflow artifacts for this feature live in: `specs/NNN-slug/`

When running any skill that references `spec.md`, `plan.md`, or `tasks.md`,
use the paths from this file. Do NOT look in `specs/spec.md`, `specs/plan.md`,
`specs/tasks.md`, or root-level files — those no longer exist.

| Skill              | Reads                                          | Writes            |
| ------------------ | ---------------------------------------------- | ----------------- |
| `/implement`       | `tasks.md` + `plan.md` in this folder          | marks tasks `[x]` |
| `/run-checks`      | `spec.md` in this folder (for QA user stories) | —                 |
| `/review-changes`  | —                                              | —                 |
| `/checkout-branch` | `spec.md` in this folder (for branch name)     | —                 |

## Workflow Folder

`specs/NNN-slug/`
```

---

### Step 6 — Update .gitignore

Add `specs/ACTIVE_WORKFLOW.md` to `.gitignore` if not already present:

```sh
grep -qF "specs/ACTIVE_WORKFLOW.md" .gitignore 2>/dev/null || echo "specs/ACTIVE_WORKFLOW.md" >> .gitignore
```

---

### Step 7 — Run Implementation

**If `$SKIP_IMPLEMENT = true`:**

- Report:
  > "Workflow organized. Skipping implementation (--skip-implement)."
  > "Active: `specs/$WORKFLOW_FOLDER/`"
  > "Run `/implement` when ready, reading from `specs/$WORKFLOW_FOLDER/`."
- Stop here. Do not proceed.

**If `$SKIP_IMPLEMENT = false`:**

Report:

> "Workflow organized."
> "Active: `specs/$WORKFLOW_FOLDER/`"
> "Starting implementation..."

Now invoke the `implement` skill with the following overrides — use the paths from `$WORKFLOW_DIR`, not the default `specs/[branch]/` paths the implement skill normally uses:

- **tasks.md**: `specs/$WORKFLOW_FOLDER/tasks.md`
- **plan.md**: `specs/$WORKFLOW_FOLDER/plan.md`
- **spec.md**: `specs/$WORKFLOW_FOLDER/spec.md`

Execute all tasks from `specs/$WORKFLOW_FOLDER/tasks.md` following the implement skill's execution flow:

1. Parse tasks.md — extract phases, IDs, descriptions, file paths, dependencies, and parallel markers `[P]`
2. Execute phase by phase — complete each phase before starting the next
3. Respect dependencies — sequential tasks in order, parallel `[P]` tasks can overlap
4. Follow TDD if test tasks are present — write tests first, verify they fail, then implement
5. Mark completed tasks as `[x]` in `specs/$WORKFLOW_FOLDER/tasks.md` as you go
6. Report progress after each completed task
7. Halt if a non-parallel task fails

**Completion:**

- Verify all tasks are marked `[x]`
- Check that features match acceptance criteria in `specs/$WORKFLOW_FOLDER/spec.md`
- Report: summary of completed work, any issues

---

### Step 8 — Run Checks

Invoke the `run-checks` skill to run the full quality gate on the implemented changes:

- Pass `specs/$WORKFLOW_FOLDER/spec.md` as the spec reference for QA user stories
- Follow run-checks flow: typecheck → lint → audit → build → tests → QA
- Block on any failure — do not report completion until all checks pass
- After run-checks completes, report:
  > "Implementation complete. All quality checks passed."
  > "Run `/review-changes` when ready for final review."

---

### Key Rules

- Run `/analyze` on `specs/spec.md`, `specs/plan.md`, `specs/tasks.md` in Step 0 — use specs/ as artifact root, not specs/[branch]
- Never proceed past Step 0 if any of the three required files is missing
- Never create the folder or move files until the user confirms in Step 3
- Always write `ACTIVE_WORKFLOW.md` immediately after a successful file move — never skip it
- Always add `specs/ACTIVE_WORKFLOW.md` to `.gitignore` — it is a local agent pointer, not committed
- When running implementation, always read from `specs/$WORKFLOW_FOLDER/` — never from `specs/spec.md` etc.
- Mark tasks `[x]` in `specs/$WORKFLOW_FOLDER/tasks.md`, not in any other location
- Always run `run-checks` after implementation completes — never skip it
- Do not report final completion until run-checks passes all gates
