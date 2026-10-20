# Agent skills (tool-agnostic)

On-demand skills for anyone who clones this repo, regardless of agent (Cursor, Copilot, Codex, Claude Code, Gemini, …).

Layout ([Agent Skills](https://agentskills.io)):

```
.agents/skills/<skill-name>/SKILL.md
```

Always-on project law stays in root `AGENTS.md`. Skills load when their `description` matches the task (or when invoked by name). **Do not** treat `.claude/skills/` or `.cursor/skills/` as the source of truth.

## AI-SDD workflow

Run in this order. Do not skip a phase.

```
create-spec → create-plan → create-tasks → execute → create-pr → code-review / code-reviewer
```

| Phase | Skill           | What it produces                                                |
| ----- | --------------- | --------------------------------------------------------------- |
| 1     | `create-spec`   | `spec.md` — WHAT to build (stories, FRs, success criteria)      |
| 2     | `create-plan`   | `plan.md` — HOW to build (stack, structure, constitution check) |
| 3     | `create-tasks`  | `tasks.md` — ordered, path-specific work                        |
| 4     | `execute`       | Organizes `specs/<slug>/`, implements tasks, then quality gate  |
| 5     | `create-pr`     | Pull request against `dev`                                      |
| 6     | `code-review`   | Structured review of the PR vs spec/plan/tasks                  |
| 6     | `code-reviewer` | Deeper quality/security review (checklist + report)             |

**Invoke** by asking the agent to run the skill by name (for example “run create-spec” or `/create-spec`). After each phase, stop for human confirmation before the next.

### Supporting skills (used inside the pipeline)

| Skill        | Role                                                                                 |
| ------------ | ------------------------------------------------------------------------------------ |
| `analyze`    | Read-only consistency check across spec, plan, and tasks (`execute` runs this first) |
| `run-checks` | Typecheck / lint / build / tests after implementation (`execute` runs this last)     |

`create-spec` also runs an inline clarify + checklist pass. There is no separate `clarify` folder in this repo; follow the steps inside `create-spec`.

`execute` implements tasks itself (there is no separate `implement` skill here). Flag `--skip-implement` organizes the workflow folder only.

### Artifact location (this repo)

Active product work already lives in `specs/001-office-supplies-mvp/`. New features should land as `specs/<nnn>-<slug>/` after `execute` organizes them. Do **not** write a REST `api.md` — the backend team owns HTTP (`specs/001-office-supplies-mvp/contracts/README.md`).

## Skill inventory

| Folder          | Present | Notes                                                                                              |
| --------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `create-spec`   | yes     | Prefer writing under `specs/`, not `docs/` (product docs already live there)                       |
| `create-plan`   | yes     | Must not invent REST routes; consume the backend contract                                          |
| `create-tasks`  | yes     | ClickUp IDs are optional; skip unless the user asks                                                |
| `execute`       | yes     | Expects `specs/spec.md` + `plan.md` + `tasks.md` before organizing                                 |
| `create-pr`     | yes     | Base branch for feature PRs is **`dev`** (integration), not `main`                                 |
| `code-review`   | yes     | PR review vs spec/plan/tasks                                                                       |
| `code-reviewer` | yes     | Report-style review; references under `code-reviewer/references/`                                  |
| `analyze`       | yes     | Supporting                                                                                         |
| `run-checks`    | yes     | Supporting — discover scripts from **this** `package.json` (`lint`, `build`), not a turbo monorepo |

## Project constraints the skills must honor

- Constitution in `AGENTS.md`
- Three roles only: Employee, Approver, Supply Admin
- SPA only; no backend stack or invented API contract
- Default git branch: `main`. Feature PRs target **`dev`**, the integration branch
