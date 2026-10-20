---
name: create-tasks
description: Phase 3 orchestrator — reads plan.md and spec.md from specs/ (or docs/ fallback), generates a dependency-ordered tasks.md. Stops for confirmation before saving.
user-invocable: true
---

## User Input

```text
{{args}}
```

## Outline

Phase 3 orchestrator: read the existing plan and spec, ask about breakdown preferences, generate a dependency-ordered task list, and save `tasks.md`.

---

### Step 0 — Locate plan.md and spec.md

Check in this order (spec and plan must sit in the same directory):

1. `specs/plan.md` → `specs/spec.md`
2. Active `specs/<nnn>-*/` or `specs/ACTIVE_WORKFLOW.md` folder
3. `docs/plan.md` → `docs/spec.md`
4. `plan.md` (root) → `spec.md` (root)

- If `plan.md` is not found:
  > "No plan.md found. Please run `/create-plan` first to generate an implementation plan."
  - Stop.
- If `spec.md` is not found:
  > "No spec.md found. Please ensure spec.md exists alongside plan.md."
  - Stop.

Store:

- `$PLAN_PATH` — path to plan.md
- `$SPEC_PATH` — path to spec.md
- `$OUTPUT_PATH` — same directory as plan.md → `tasks.md`

---

### Step 1 — Ask: Task Breakdown Structure

Ask the user:

> "How would you like the tasks structured?"

| Option | Description                                                             |
| ------ | ----------------------------------------------------------------------- |
| A      | **By layer** — separate phases for DB / API / Frontend / Tests          |
| B      | **By user story** — one phase per story in priority order (P1 first)    |
| C      | **Let the skill decide** — based on the plan's complexity and structure |

- Wait for response before proceeding
- Store the choice as `$STRUCTURE`

---

### Step 2 — Ask: Tracker IDs (optional)

Ask the user:

> "Tag tasks with an external tracker ID (Linear, GitHub, ClickUp)? Default is none."

- If no / skip / default: `$CLICKUP` = `none` (no ID suffix on tasks)
- If yes: store the IDs they provide

---

### Step 3 — Generate Tasks

Read `$PLAN_PATH` and `$SPEC_PATH` fully. Extract:

- User stories with priorities (P1, P2, P3...) from spec.md
- Tech stack, project structure, file paths from plan.md
- Entities, API endpoints, components from plan.md

**Task format** (required for every task):

```
- [ ] [TaskID] [P?] [Story?] [CU-ID?] Description — path/to/file.ts
```

- `- [ ]` = markdown checkbox
- `TaskID` = T001, T002, T003... (sequential)
- `[P]` = parallelizable — only if task has no dependencies on sibling tasks
- `[Story]` = `[US1]`, `[US2]`, etc. — required for user-story-scoped tasks
- `[CU-XXXXX]` = ClickUp ID — only if `$CLICKUP` is set
- Description must include exact file path

**Phase structure based on `$STRUCTURE`:**

**Option A — By layer:**

```
## Phase 1: Setup
## Phase 2: Database / Data Model
## Phase 3: Backend / API
## Phase 4: Frontend / UI
## Phase 5: Integration & Tests (if applicable)
## Phase 6: Polish
```

**Option B — By user story:**

```
## Phase 1: Setup
## Phase 2: Foundational (blocking prerequisites)
## Phase 3: [User Story 1 Name] (P1)
## Phase 4: [User Story 2 Name] (P2)
...
## Final Phase: Polish
```

**Option C — Skill decides:**

- Use Option B (by user story) if the spec has 2+ distinct user stories
- Use Option A (by layer) if the feature is primarily infrastructure or a single story

**Within each phase**, order tasks:

- Models / schema → Services / logic → Endpoints / controllers → UI components → Integration

Mark parallel tasks `[P]` only when they truly operate on different files with no shared dependencies.

---

### Step 4 — Preview and Confirm

Show a summary before saving:

> "tasks.md preview:"
>
> - Total tasks: [N]
> - Phases: [list phase names]
> - Parallel opportunities: [N tasks marked [P]]
> - MVP scope: [suggested minimum — typically Phase 1 + Story P1 phase]
> - Output path: `$OUTPUT_PATH`
> - ClickUp IDs: [included / not included]

Ask: `Save tasks.md? (yes / cancel)`

**If user confirms:**

- Write `$OUTPUT_PATH`
- Report: "tasks.md saved to `$OUTPUT_PATH`. Run `/execute` when ready for Phase 4."

**If user cancels:**

- Do NOT write the file
- Report: "Cancelled. tasks.md was not saved."
- Stop

---

### Key Rules

- Never begin without both plan.md and spec.md
- Always ask about structure and ClickUp IDs before generating — never assume
- Every task must have an exact file path in its description
- Never generate test tasks unless the spec or plan explicitly mentions testing requirements
- Stop and wait for confirmation before writing the output file
