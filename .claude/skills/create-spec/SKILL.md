---
name: create-spec
description: Phase 1 orchestrator — specify → clarify → checklist, then save spec.md under specs/.
user-invocable: true
---

## User Input

```text
{{args}}
```

## Outline

Phase 1 orchestrator: collect a feature description, build a spec, clarify ambiguities, validate quality, run `/clarify` for a final pass, then output a single `spec.md` file.

---

### Step 0 — Determine Output Path

Prefer this repo’s spec tree over generic `docs/` (product markdown already lives in `docs/`).

- If `specs/` exists → output to `specs/spec.md` (Phase 4 `execute` will move it into `specs/<slug>/`)
- Else if `docs/` exists → output to `docs/spec.md`
- Else → `mkdir -p specs/` → output to `specs/spec.md`
- Store the resolved path as `$SPEC_PATH` for all subsequent steps
- Never overwrite `docs/product.md`, `docs/process-flow.md`, or an existing `specs/<nnn>-*/spec.md` without asking

---

### Step 1 — Collect Feature Description

**If `{{args}}` is empty:**

- Ask the user interactively:
  > "What feature would you like to specify? Describe what it should do and who it's for."
- Wait for their response before continuing.

**If `{{args}}` is provided:**

- Analyze the description and identify what is unclear, missing, or ambiguous. Look for:

  | Signal               | Examples                                        |
  | -------------------- | ----------------------------------------------- |
  | Missing actor        | Who is doing this? (admin, end user, system?)   |
  | Undefined trigger    | When does this happen? On what action or event? |
  | Vague scope          | "manage", "handle", "improve" — what exactly?   |
  | Missing outcome      | What does success look like for the user?       |
  | Unexplained entities | New terms or domain concepts not defined        |
  | Implicit constraints | Unstated rules about who can do what, or when   |
  | Missing boundaries   | What is explicitly NOT included?                |

- Ask **only the questions that genuinely cannot be inferred** from the description — max 3, one at a time.
- Frame each question as specific to the description provided, not generic:
  > e.g. "You mentioned 'venue managers can assign courts' — should regular users also be able to see the court assignments, or is that view restricted to managers only?"
- After each answer, incorporate it into `$DESCRIPTION` before moving on.
- If the description is already sufficiently clear across all signals, skip questioning and proceed directly to Step 2.

Store the final description as `$DESCRIPTION`.

---

### Step 2 — Generate the Specification

Using `$DESCRIPTION`, write a structured feature specification to `$SPEC_PATH`:

```markdown
# Feature Specification: [FEATURE NAME]

**Created**: [DATE]
**Status**: Draft

## Overview

[1-2 sentence summary of the feature and its purpose]

## User Stories

### Story 1 — [Title] (Priority: P1)

[User journey in plain language]
**Why this priority**: [Value explanation]
**Acceptance Criteria**:

1. **Given** [state], **When** [action], **Then** [outcome]

### Story 2 — [Title] (Priority: P2)

[...]

### Edge Cases

- What happens when [boundary condition]?
- How does the system handle [error scenario]?

## Functional Requirements

- **FR-001**: System MUST [capability]
- **FR-002**: System MUST [capability]

## Out of Scope

- [Explicit exclusions to prevent scope creep]

## Success Criteria

- **SC-001**: [Measurable, technology-agnostic metric]
- **SC-002**: [Measurable metric]
```

Rules:

- Focus on WHAT and WHY — no implementation details, no tech stack, no frameworks
- Mark genuinely unclear items as `[NEEDS CLARIFICATION: question]` — max 3
- Each user story must be independently testable
- User stories ordered by priority (P1 = most critical)

---

### Step 3 — Clarify Ambiguities

Scan the written spec for ambiguities across:

| Category         | What to check                                     |
| ---------------- | ------------------------------------------------- |
| Functional Scope | Core goals, out-of-scope declarations, user roles |
| Domain & Data    | Entities, relationships, state transitions        |
| Interaction & UX | User journeys, error/empty/loading states         |
| Non-Functional   | Performance, security, scalability                |
| Edge Cases       | Boundary conditions, conflict resolution          |

**Ask ONE question at a time** (max 5 questions total):

- Present the question with a recommendation and options table:

  | Option | Answer   | Implications |
  | ------ | -------- | ------------ |
  | A      | [answer] | [impact]     |
  | B      | [answer] | [impact]     |

- User can reply with option letter, "yes"/"recommended" to accept suggestion, or a custom answer
- After each answer: update `$SPEC_PATH` immediately — add a `## Clarifications` section with `### Session [DATE]` and append `- Q: <question> → A: <answer>`
- Stop when: all critical ambiguities resolved, user says "done"/"skip"/"proceed", or 5 questions asked
- If no meaningful ambiguities found: report "No critical ambiguities detected" and proceed to Step 4

---

### Step 4 — Validate with Checklist

Evaluate the spec against these quality dimensions:

| Dimension     | What it checks                              |
| ------------- | ------------------------------------------- |
| Completeness  | Are all necessary requirements present?     |
| Clarity       | Are requirements specific and unambiguous?  |
| Consistency   | Do requirements align without conflicts?    |
| Measurability | Can requirements be objectively verified?   |
| Coverage      | Are all scenarios and edge cases addressed? |
| Edge Cases    | Are boundary conditions defined?            |

**For each failing item:**

- **CRITICAL / HIGH issues** (e.g., conflicting requirements, missing acceptance criteria on P1 stories):
  - Block output
  - Show the issue clearly:
    > "BLOCKED: [issue description]. Please resolve this before the spec can be finalized."
  - Ask the user to provide the missing information, then update the spec and re-check

- **MEDIUM / LOW issues** (e.g., vague wording, minor gaps):
  - List them and ask interactively:
    > "The following items were flagged. Choose which to fix, which to dismiss, or reply 'all' / 'none':"
    - `[CHK001] Are performance requirements defined for real-time features? [Completeness]`
    - `[CHK002] Is 'fast response' quantified with a specific threshold? [Clarity]`
  - Apply fixes the user approves, skip dismissed items
  - Document dismissed items in a `## Checklist Overrides` section in `$SPEC_PATH`

---

### Step 5 — Run Clarify (Additional Pass)

After checklist validation passes, invoke the clarify skill (`/clarify`) to catch any remaining underspecified areas. The clarify skill scans for ambiguities across functional scope, domain & data, integration, constraints, terminology, and edge cases.

- Operate on the spec at `$SPEC_PATH` (e.g. `specs/spec.md`)
- Follow the clarify skill's flow: scan, generate questions (max 5), ask one at a time, update spec after each answer
- Stop when: critical ambiguities resolved, user says "done"/"skip"/"proceed", or 5 questions asked
- If no meaningful ambiguities found: report "No critical ambiguities detected" and proceed to Step 6

---

### Step 6 — Confirm or Cancel

Once spec passes validation and clarify:

- Show a summary:

  > "spec.md is ready at `$SPEC_PATH`"
  >
  > - User stories: [N]
  > - Requirements: [N]
  > - Clarifications resolved: [N]
  > - Checklist: [N passed / N dismissed]

- Ask: `Finalize and save? (yes / cancel)`

**If user confirms:**

- Ensure `$SPEC_PATH` is saved and up to date
- Report: "spec.md saved to `$SPEC_PATH`. Run `/create-plan` when ready for Phase 2."

**If user cancels:**

- Do NOT write or overwrite the file
- Report: "Cancelled. spec.md was not saved."
- Stop

---

### Key Rules

- Never write implementation details to the spec (no languages, frameworks, APIs, file paths)
- Never proceed to the next step while a CRITICAL/HIGH checklist issue is unresolved
- Save the spec after every clarification answer — do not batch writes
- Always stop and wait for user confirmation before finalizing output
- Run `/clarify` on `$SPEC_PATH` in Step 5 — use the clarify skill's workflow even if its default path differs
