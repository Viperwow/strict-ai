# Design: strict-dod

**Date:** 2026-05-19  
**Status:** final  
**Placement:** `strict-workday/skills/strict-dod/SKILL.md`

## Problem

User spends too long on tasks due to undefined "done" boundary. Perfectionism and scope drift cause distraction from actual delivery. Need a lightweight contract that fixes the boundary before work starts.

## Goal

Skill generates and persists a Definition of Done for a task. User confirms and executes. AI handles cognitive load — user stays in execution mode.

## Modes

| Mode | Trigger | Behavior |
|---|---|---|
| `auto` | Session has context (see checklist below) | AI reads context → generates DoD → user confirms. 0 questions. |
| `guided` | No context detected | AI asks ≤3 focused questions → generates DoD → user confirms. |
| `guard` | DoD file already exists for this task | AI reads existing DoD → displays or shows diff → requires reason for changes. |

Mode is auto-detected. Can be overridden with `--auto` / `--guided`.

### Context Detection Checklist (auto mode triggers if ANY true)

- A task description or ticket key was passed as argument
- Session contains output from a prior skill invocation (task status, planning, analysis, etc.)
- Session contains data from a task manager (ticket, story, backlog item)
- Session contains a task breakdown, implementation plan, or PR description
- Session contains relevant data from communication tools (chat, email, comments)
- Session contains relevant corporate documentation or knowledge base content
- Session contains version control context (branch name, commit messages, PR description, diff)
- User described the task in prior messages this session

### Guided questions (≤3, only what's missing, one at a time)

1. What is the task? (if no description was provided)
2. How will you know it's done — one concrete signal?
3. What is explicitly NOT part of this task?

## Output Format (auto and guided modes)

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

On `yes` → write file. On `edit: <changes>` → apply, redisplay, confirm again.

## File Persistence

### Path
`./dod/<task-id>-<task-summary>.md` — kebab-case, relative to project root where skill is invoked.

If no task-id: `./dod/<task-summary>.md`

Examples: `dod/task-42-add-user-auth.md`, `dod/migrate-db-schema.md`

### File Contract (strict)

~~~markdown
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
~~~

### Contract Rules

| Rule | Description |
|---|---|
| Frontmatter | always: `task`, `summary`, `created`, `status` (`active` / `done`) |
| Goal | exactly one sentence, no bullets |
| Done When | only concrete verifiable conditions, `[ ]` format |
| Out of Scope | minimum 1 item, always populated |
| Changelog | append-only, never edited |
| Diff symbols | `+` added, `-` removed, `~` changed (`"old"` → `"new"`) |
| Grouping | one entry per event, all changes of that event in one diff block |
| Reason | required on every changelog entry |

## Guard Behavior

On every skill invocation, skill first checks if `./dod/<filename>.md` exists.

If exists → read before generating anything:
- **No new content provided** (invoked with no args or same task): display existing DoD, ask "Still valid?"
- **New content or description provided**: compare, show diff, block until reason given

```
DoD change detected:
  + done-when: "New criterion"
  ~ goal: "Old" → "New"

! Reason required to proceed:
```

User provides reason → DoD updates → changelog entry appended.

## Skill Invocation

```
/strict-dod [task description or ticket key]
/strict-dod --auto     # force auto mode
/strict-dod --guided   # force guided mode
/strict-dod --done     # mark task complete (status: done)
```

### Decision Tree (no flags)

```
/strict-dod called
       │
       ▼
DoD file exists for this task?
  YES → guard mode: read existing DoD, display or diff, require reason if changes
  NO  → does session have context? (see checklist)
          YES → auto mode: generate from context, 0 questions
          NO  → guided mode: ask ≤3 questions, then generate
```

`--done` sets `status: done` in frontmatter and appends a `— done` changelog entry.

## Placement

`strict-workday/skills/strict-dod/SKILL.md`
