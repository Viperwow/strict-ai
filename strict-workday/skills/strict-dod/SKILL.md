---
name: strict-dod
description: Define and lock the Definition of Done for a task before starting work. Prevents scope creep and perfectionism by fixing a clear, verifiable boundary upfront. Use when starting any task, or mid-task to check or refine scope. Call /strict-dod with a task description or Jira key, or with no args to auto-detect context.
---

# strict-dod

Fixes the boundary of a task before work starts. You handle cognitive load — user confirms and executes.

## Invocation

```
/strict-dod [task description or Jira key]
/strict-dod --auto    # force auto mode
/strict-dod --guided  # force guided mode
```

No args triggers automatic mode detection.

## Routing Logic

Follow this decision tree on every invocation:

1. **Check for existing DoD file**
   - Look in `./dod/` for a file matching the current task (by task ID if provided, or by keyword match against filenames)
   - File found → **GUARD mode**
   - No file found → continue

2. **Detect session context** (only when no file found)
   - Session contains task analysis, prior `/strict-task-status` output, Jira data, a task description, or other task context? → **AUTO mode**
   - Nothing → **GUIDED mode**

3. **Flag overrides**
   - `--auto` forces AUTO mode
   - `--guided` forces GUIDED mode

---

## AUTO Mode

Context exists. Generate DoD immediately — zero questions.

1. Read all available context: session history, task descriptions, Jira data, prior analysis
2. Extract:
   - Core goal: one sentence — what changes when this task is done
   - 3–5 concrete verifiable done criteria (not "it works" — use "endpoint returns 200 with schema X")
   - At least 1 explicit out-of-scope item
3. Generate and present output (see Output Format)
4. Wait for confirmation

---

## GUIDED Mode

No context. Ask only what is missing. Maximum 3 questions. One question at a time. Stop asking as soon as you have enough to generate DoD.

**Q1** (ask if task is completely unclear):
> What is this task? One or two sentences.

**Q2** (ask if done criterion is unclear):
> How will you know this task is done — one concrete signal?
> Example: "the button submits without error", "migration runs clean in staging"

**Q3** (ask if scope boundary is unclear):
> What is explicitly NOT part of this task right now?

After answers → generate output → wait for confirmation.

---

## GUARD Mode

DoD file exists. Read it before doing anything else.

1. Read the existing DoD file completely
2. Determine intent:
   - **View only** (no new task description, no refinement intent): display current DoD, ask "Still valid?"
   - **Change detected** (new context, new description, or explicit refinement intent): proceed to diff

3. On change detected:

```
DoD change detected:

[diff block — see Changelog format]

! Reason required to proceed:
```

Stop until user provides reason. Without reason — do not update.

4. On reason provided → update DoD body → append changelog entry → write file.

---

## Output Format

Always produce exactly this structure:

```
Goal: <one sentence>

Done When:
  [ ] <concrete verifiable criterion>
  [ ] <concrete verifiable criterion>
  [ ] <concrete verifiable criterion>

Out of Scope:
  - <explicit exclusion>
  - <explicit exclusion>

Confirm? [yes / edit: ...]
```

Rules:
- **Goal**: one sentence, no bullets
- **Done When**: 3–5 items, each independently verifiable, no vague language ("works", "is done", "looks good")
- **Out of Scope**: minimum 1 item, always present
- On `yes` → write file
- On `edit: <changes>` → apply edits, redisplay, confirm again

---

## File Writing

### Path

`./dod/<filename>.md` — relative to current project root (where skill is invoked).

Filename rule: `<task-id>-<task-summary>.md`, all kebab-case.
- Task ID present: `task-42-add-user-auth.md`
- No task ID: `add-user-auth.md`
- Derive summary from goal: max 5 words, kebab-case

### File Contract

Strict. Never deviate from this structure:

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
~~~

### Changelog Rules

- Entry header: `### <ISO 8601 datetime with timezone> — <action>` where action is `created`, `refined`, or `done`
- One entry per event — group all changes from that event into one diff block
- Diff symbols: `+` added · `-` removed · `~` changed (`"old value"` → `"new value"`)
- `> Reason: <text>` required on every entry
- Append-only: never edit existing entries

### On Create (new file)

Write full file. Changelog entry: `— created`, reason: `initial DoD`.

### On Update (GUARD mode, reason confirmed)

Update body sections (Goal / Done When / Out of Scope). Append new changelog entry. Never edit prior entries.

### On Completion

User signals task is done (explicit confirmation or `/strict-dod --done`).
Set frontmatter `status: done`. Append entry: `— done` with user-provided reason.
