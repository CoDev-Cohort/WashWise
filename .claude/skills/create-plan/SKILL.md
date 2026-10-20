---
name: create-plan
description: Phase 2 orchestrator — reads spec.md from specs/ (or docs/ fallback), writes plan.md beside it, analyzes and red-teams before save.
user-invocable: true
---

## User Input

```text
{{args}}
```

## Outline

Phase 2 orchestrator: read the existing spec, build a technical plan, validate it for consistency, and red-team it. Output is a single `plan.md` file.

---

### Step 0 — Locate spec.md

Check in this order:

1. `specs/spec.md`
2. `specs/ACTIVE_WORKFLOW.md` folder’s `spec.md` if that file exists
3. `specs/<nnn>-*/spec.md` (if exactly one numbered feature folder, use it; if several, ask)
4. `docs/spec.md`
5. `spec.md` in root

- If none exist:
  > "No spec.md found. Please run `/create-spec` first to generate a specification."
  - Stop.
- Store the resolved path as `$SPEC_PATH`
- `$PLAN_PATH` is `plan.md` in the **same directory** as the spec

---

### Step 1 — Load Context

- Read `$SPEC_PATH` fully
- Check for `AGENTS.md` in root → load `## Constitution` section if present
- If `{{args}}` contains tech stack info (e.g., "React/NestJS", "Next.js + Supabase") → use it
- If no tech stack provided in args, infer from:
  - Existing config files (`package.json`, `tsconfig.json`, etc.)
  - Folder structure (check for `apps/`, `packages/`, `src/`)
  - Ask only if inference is impossible:
    > "What is the tech stack for this feature? (e.g., React + NestJS, Next.js + Supabase)"

---

### Step 2 — Generate the Plan

Write a structured technical implementation plan to `$PLAN_PATH`:

```markdown
# Implementation Plan: [FEATURE NAME]

**Date**: [DATE]
**Spec**: [SPEC_PATH]
**Status**: Draft

## Summary

[Primary requirement + technical approach in 2-3 sentences]

## Technical Context

**Stack**: [languages, frameworks]
**Primary Dependencies**: [libraries to add or use]
**Storage**: [database, cache, files]
**Target Layer(s)**: [frontend / backend / both]
**Performance Goals**: [domain-specific targets if defined in spec]
**Constraints**: [any explicit constraints from spec or constitution]

## Data Model

[New or modified entities, fields, relationships, migrations needed]

## API Contracts

[Link the backend team’s published REST contract. Do NOT invent routes, payloads, or error codes in this repo.]

## Component / Module Breakdown

[UI components or backend modules to create or modify, with file paths]

## Project Structure

[Where new files go, directory layout for new additions]

## Dependencies

[New packages, services, or integrations required]

## Constitution Compliance

[Status per principle — PASS / FAIL with justification if FAIL]
```

Rules:

- Resolve ALL `[NEEDS CLARIFICATION]` items from the spec during this step
- No implementation — stop at planning
- Use concrete file paths throughout
- Constitution violations without justification are ERRORS — block output

---

### Step 3 — Analyze for Consistency

Perform a read-only cross-check between `$SPEC_PATH` and `$PLAN_PATH`:

| Check        | What to detect                                      |
| ------------ | --------------------------------------------------- |
| Coverage     | Are all spec requirements addressed in the plan?    |
| Conflicts    | Does the plan contradict any spec requirement?      |
| Ambiguity    | Are there vague items in the plan (TODO, ???, TBD)? |
| Data model   | Do entities in the plan match entities in the spec? |
| Constitution | Are all MUST principles satisfied?                  |

**Severity:**

- **CRITICAL**: Missing requirement coverage, constitution MUST violations
- **HIGH**: Conflicting or contradicting requirements
- **MEDIUM**: Terminology drift, vague non-functional coverage
- **LOW**: Minor wording or style gaps

**For CRITICAL / HIGH issues:**

- Block output
- Present findings clearly and ask the user to resolve them before continuing:
  > "BLOCKED: [issue]. Please clarify or adjust before the plan can be finalized."
- Update `$PLAN_PATH` with the resolution, then re-check

**For MEDIUM / LOW issues:**

- Present findings and ask interactively which to fix or dismiss
- Apply approved fixes, document dismissed items in a `## Analysis Overrides` section

---

### Step 4 — Red-Team the Plan (always runs)

Challenge the plan using structured critical reasoning. Always run — not optional.

Steelman the plan first (restate in its strongest form), then apply **pre-mortem analysis**:

> "Assuming this plan fails — what are the most likely reasons?"

Present the **3-5 strongest failure modes**, each with:

- Failure narrative (how it plays out)
- Early warning signs
- Suggested mitigation

Ask the user to respond to the challenges before synthesizing:

> "Which of these risks do you want to mitigate in the plan, and which are acceptable?"

Based on their response:

- Update `$PLAN_PATH` to address mitigations the user accepts
- Document accepted risks in a `## Known Risks` section
- Produce a final synthesis:
  > "Strengthened position: [updated framing of the plan's approach after addressing risks]"

---

### Step 5 — Confirm or Cancel

Once plan passes analysis and red-team:

- Show a summary:

  > "plan.md is ready at `$PLAN_PATH`"
  >
  > - Requirements covered: [N/N]
  > - Analysis issues resolved: [N] / dismissed: [N]
  > - Risks mitigated: [N] / accepted: [N]
  > - Constitution: [PASS / FAIL]

- Ask: `Finalize and save? (yes / cancel)`

**If user confirms:**

- Ensure `$PLAN_PATH` is saved and up to date
- Report: "plan.md saved to `$PLAN_PATH`. Run `/create-tasks` when ready for Phase 3."

**If user cancels:**

- Do NOT write or overwrite the file
- Report: "Cancelled. plan.md was not saved."
- Stop

---

### Key Rules

- Never begin without a valid spec.md
- Never skip the red-team step — it always runs
- Never leave CRITICAL or HIGH analysis issues unresolved before outputting
- Update the plan file after every user response during Steps 3 and 4
- Stop at planning — do NOT generate task lists or write implementation code
