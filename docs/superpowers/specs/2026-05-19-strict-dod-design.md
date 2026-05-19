# Design: strict-dod

**Date:** 2026-05-19  
**Status:** draft  
**Placement:** `strict-workday/skills/strict-dod/SKILL.md`

## Problem

User spends too long on tasks due to undefined "done" boundary. Perfectionism and scope drift cause distraction from actual delivery. Need a lightweight contract that fixes the boundary before work starts.

## Goal

Skill generates and persists a Definition of Done for a task. User confirms and executes. AI handles cognitive load — user stays in execution mode.

## Modes

| Mode | Trigger | Behavior |
|---|---|---|
| `auto` | Session has context (task analysis, summary, Jira, prior conversation) | AI reads context → generates DoD → user confirms. 0 questions. |
| `guided` | Empty session, no context | AI asks ≤3 focused questions → generates DoD → user confirms. |

Mode is auto-detected. Can be overridden with `--auto` / `--guided`.

**Guided questions (≤3, only what's missing):**
1. What is the task? (if completely absent)
2. How will you know it's done — one concrete signal?
3. What is explicitly NOT part of this task?

## Output Format (both modes)

```
Goal: <one sentence — what we achieve>

Done When:
  [ ] <concrete verifiable criterion>
  [ ] <concrete verifiable criterion>
  [ ] <concrete verifiable criterion>

Out of Scope:
  - <thing explicitly NOT in scope>
  - <thing explicitly NOT in scope>

Confirm? [yes / edit: ...]
```

No timebox. No estimates. Only the boundary.

## File Persistence

### Path
`./dod/<task-id>-<task-summary>.md` — kebab-case, relative to project root where skill is invoked.

If no task-id: `./dod/<task-summary>.md`

Examples: `dod/task-42-add-user-auth.md`, `dod/migrate-db-schema.md`

### File Contract (strict)

```markdown
---
task: task-42
summary: add user auth
created: 2026-05-19T14:30:00+03:00
status: active
---

# DoD: Add user auth

## Goal
One sentence: what we achieve when done.

## Done When
- [ ] Concrete verifiable criterion
- [ ] Concrete verifiable criterion
- [ ] Concrete verifiable criterion

## Out of Scope
- Thing we explicitly will NOT do
- Thing we explicitly will NOT do

---

## Changelog

### 2026-05-19T14:30:00+03:00 — created
```diff
+ goal: "One sentence..."
+ done-when: "Criterion 1"
+ done-when: "Criterion 2"
+ out-of-scope: "Thing 1"
```
> Reason: initial DoD

### 2026-05-19T16:45:00+03:00 — refined
```diff
+ done-when: "Criterion 3"
~ goal: "Old sentence" → "New sentence"
```
> Reason: PM clarified scope in standup
```

### Contract Rules

| Rule | Description |
|---|---|
| Frontmatter | always: `task`, `summary`, `created`, `status` (`active` / `done`) |
| Goal | exactly one sentence, no bullets |
| Done When | only concrete verifiable conditions, `[ ]` format |
| Out of Scope | minimum 1 item, always populated |
| Changelog | append-only, never edited |
| Diff symbols | `+` added, `-` removed, `~` changed (`old` → `new`) |
| Grouping | one entry per event, all changes of that event in one diff block |
| Reason | required on every changelog entry |

## Guard Behavior

On every skill invocation:
1. Skill checks if `./dod/<filename>.md` exists
2. If exists → reads it before generating anything
3. If new generation differs from existing DoD → shows diff and blocks confirmation:

```
DoD change detected:
  + done-when: "New criterion"
  ~ goal: "Old" → "New"

! Reason required to proceed:
```

User must provide reason. Reason is written to Changelog. Only then DoD updates.

This prevents silent scope creep.

## Refinement

User invokes `/strict-dod refine` mid-task. Skill:
1. Reads existing DoD file
2. Re-evaluates with new session context
3. Shows diff (if any)
4. Requires reason if changes exist
5. Writes changelog entry

## Skill Invocation

```
/strict-dod [task description or Jira key]
/strict-dod --guided   # force guided mode
/strict-dod --auto     # force auto mode
```

### Decision Tree (no flags)

```
/strict-dod called
       │
       ▼
DoD file exists for this task?
  YES → refine mode: read existing DoD, check for drift, require reason if changes
  NO  → does session have context?
          YES → auto mode: generate from context, 0 questions
          NO  → guided mode: ask ≤3 questions, then generate
```

`refine` is not a separate subcommand — it is the natural behavior when a DoD file already exists. Flags `--auto` / `--guided` override only when explicitly needed.

## Placement

`strict-workday/skills/strict-dod/SKILL.md` — same package as `strict-task-status`.
