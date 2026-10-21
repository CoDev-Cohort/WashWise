---
name: code-review
description: Review a pull request and output a structured review
user-invocable: true
allowed-tools: Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr list:*), Bash(git log:*), Bash(git show:*), Bash(pbcopy:*), Read, Grep, Glob
argument-hint: [pr-number-or-url]
---

# Code Review

Perform a thorough code review of a pull request and output the review in the conversation.

## Usage

```
/code-review [pr-number-or-url]
```

Examples:

- `/code-review 1` - Review PR #1
- `/code-review https://github.com/CoDev-Bench-Team/CoDev-OSRS/pull/1`
- `/code-review` - Review the PR for the current branch

## Instructions

1. **Resolve the PR**:
   - If a PR number or URL is provided (`{{args}}`), use that.
   - If no argument is provided, run `gh pr view --json number,url` to get the current branch's PR.
   - If no PR is found, inform the user.

2. **Fetch PR context** in parallel:
   - `gh pr view <number> --json title,body,baseRefName,headRefName,state,isDraft,author,files` — PR metadata, description, and changed files list
   - `gh pr diff <number>` — Full unified diff of all changes

3. **Skip if not eligible**:
   - PR is closed or merged — skip with a message
   - PR is a draft — still review (this team often opens drafts); note that it is a draft
   - PR is automated/trivial (e.g. dependency bumps, generated files only) — skip with a message

4. **Load planning documents** (primary review context):
   - Search for `spec.md`, `plan.md`, and `tasks.md` — look first under `specs/` (including `specs/ACTIVE_WORKFLOW.md` and `specs/<nnn>-*/`), then `docs/`, then repo root.
   - Read all three files if found. These documents define WHAT was planned and HOW it should be implemented.
   - If none exist, note it and proceed with general review only.

5. **Read additional context** for the changed files:
   - For each changed file, read the full file from the local workspace to understand surrounding context (not just the diff lines).
   - Focus on files that contain significant logic changes.
   - Read `AGENTS.md` at the repo root for project conventions.
   - If the PR description references other files or mentions specific areas of concern, read those too.

6. **Perform the review** across these dimensions — **spec/plan/tasks compliance is the primary lens**:

   a. **Spec compliance** _(primary — always check if spec.md found)_ — Does every changed file implement what the spec describes? Flag:
   - Behaviour that contradicts the spec's acceptance criteria or requirements
   - Features mentioned in the spec that are entirely missing from the diff
   - Anything implemented that the spec explicitly excludes

   b. **Plan compliance** _(primary — always check if plan.md found)_ — Does the implementation follow the technical approach described in the plan? Flag:
   - Data model or API contract deviations from the plan
   - Architectural decisions that contradict the plan's approach
   - Files or modules the plan said to create that are absent from the diff

   c. **Tasks compliance** _(primary — always check if tasks.md found)_ — Do the changed files map to the tasks listed? Flag:
   - Tasks marked complete whose code is absent or incomplete in the diff
   - Code that doesn't correspond to any task (scope creep)
   - Tasks that appear only partially implemented

   d. **Behavioral changes** — Does the diff change existing behavior outside of what spec/plan/tasks describe? Pay special attention to:
   - Conditions that narrowed or widened unexpectedly
   - Default values that changed
   - Error handling that was removed or altered

   e. **Bugs and correctness** — Look for:
   - Logic errors, off-by-one issues, null/undefined dereferences
   - Race conditions or async issues
   - Missing guards or validation at system boundaries
   - SQL injection, command injection, or other security issues (per OWASP Top 10)

   f. **Consistency** — Are similar patterns handled the same way across all changed files? Note inconsistencies between parallel files (e.g. dev.ts vs prod.ts implementing the same logic differently).

   g. **Data integrity** — Are empty strings used where NULL is more appropriate? Are required fields enforced? Are inserts/upserts idempotent?

   h. **Code duplication** — Is logic copy-pasted between files that should share a utility? Flag duplication that will cause maintenance problems.

   i. **Silent failures** — Are errors swallowed silently (e.g. `INSERT IGNORE`, broad try/catch, missing logging)? Flag cases where failures should be observable.

   j. **AGENTS.md compliance** — Check that changes follow project conventions in `AGENTS.md` (e.g. path aliases, migration requirements for schema changes, testing conventions).

7. **Score each issue** on confidence (0–100):
   - 0–40: Likely false positive or nitpick — discard
   - 41–69: Possible issue, low severity — include as minor
   - 70–84: Real issue, should fix — include as major
   - 85–100: Definite issue, must fix — include as critical

   Discard issues with score < 50.

8. **Identify positives** — Note at least 1–3 things done well (clean abstractions, good security practices, correct ordering of operations, etc.).

9. **Output the review** directly in the conversation using the format below, then copy it to the clipboard with `pbcopy`.

## Output Format

The review must follow this exact structure:

```
### Code Review: <PR title>

**Summary**
<1–3 sentences describing what the PR does, based on the description and diff>

**Planning documents used**: spec.md ✓/✗ | plan.md ✓/✗ | tasks.md ✓/✗

---

**Spec / Plan / Tasks Compliance**

<If all planning docs absent, write: "No planning documents found — skipped compliance check.">
<If present, list each deviation found or write: "All changes align with spec, plan, and tasks.">

- [ ] <deviation or missing requirement, referencing the doc and section>

---

**Issues Found**

<If no issues, write: "No issues found.">

<Otherwise, number each issue:>

1. **<Issue title>** — <file.ts, ~line N>

   <Explanation of the problem. If there is a behavioral change, show the old vs new behavior with a code snippet. Be specific about why it is a problem and what the impact is.>

   <If applicable, suggest a fix or alternative approach.>

2. **<Issue title>** — <file.ts, ~line N>

   ...

---

**Positives**

- <Positive observation>
- <Positive observation>

---

**Overall Assessment**
<1–2 sentences summarizing whether the PR is ready to merge, what must be addressed, and your confidence level. When referencing issues by number, use "Issue 1", "Issue 2" format — never "Issue #1" as GitHub will auto-link that to a PR/issue.>
```

## Review Guidelines

### DO

- Reference specific file names and approximate line numbers
- Show old vs new code snippets when explaining behavioral changes
- Confirm intentionality of subtle behavioral changes before calling them bugs
- Praise good patterns (security, ordering, abstractions)
- Distinguish between "must fix before merge" and "nice to have"
- Keep tone professional and constructive

### DO NOT

- Flag issues already caught by TypeScript, linting, or CI
- Nitpick formatting or style unless explicitly violating `AGENTS.md`
- Block on personal preferences
- Flag pre-existing issues not touched by this PR
- Be condescending or prescriptive about subjective choices
- Repeat the same issue multiple times
- Use "Issue #N" format — always use "Issue N" (no `#`) to avoid GitHub auto-linking to PRs/issues
- Append attribution footers (e.g. `Generated with [Codex](https://Codex.ai/code)`) to the review output
- Apply fixes to code files or run `git commit` after the review — output only, never modify files

## Notes

- Output the review in the conversation — do not post it to GitHub automatically
- After outputting, copy the review text to clipboard using: `printf '%s' "<review>" | pbcopy`
- Use `gh` to fetch PR data — do not use WebFetch for GitHub URLs
- If the diff is very large (>1000 lines), focus on the most impactful files first
- Schema changes without a migration file are a `AGENTS.md` violation — always flag these
- The project uses NestJS + Prisma + Firebase Functions — understand module/service patterns before flagging architectural issues
- **Spec/plan/tasks take priority**: if the spec says X should exist and the diff doesn't include it, that is always a critical finding regardless of other code quality
- Search for planning docs using these patterns (in order): `specs/*/spec.md`, `specs/spec.md`, `docs/spec.md`, `spec.md`, same for `plan.md` and `tasks.md`
