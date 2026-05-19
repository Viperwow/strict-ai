---
name: strict-dod
description: Define and lock the Definition of Done for a task before starting work. Prevents scope creep and perfectionism by fixing a clear, verifiable boundary upfront. Use when starting any task, or mid-task to check or refine scope. Call /strict-dod with a task description or Jira key, or with no args to auto-detect context.
---

# strict-dod

Fixes the boundary of a task before work starts. You handle a cognitive load — user confirms and executes.

## Invocation

```
/strict-dod [task description or Jira key]
/strict-dod --auto    # force auto mode
/strict-dod --guided  # force guided mode
/strict-dod --done    # mark current task DoD as complete
```

No args or description triggers automatic mode detection.

## Routing Logic

Follow this decision tree on every invocation:

1. **Check for existing DoD file**
   - Look in `./dod/` for a file matching the current task (by task ID if provided, or by keyword match against filenames)
   - File found → **GUARD mode**
   - No file found → continue

2. **Detect session context** (only when no file is found)
   - Context is present if ANY of these are true:
     - A task description or ticket key was passed as an argument
     - Session contains output from a prior skill invocation (task status, planning, analysis, etc.)
     - Session contains data from a task manager (ticket, story, backlog item)
     - Session contains a task breakdown, implementation plan, or PR description
     - Session contains relevant data from communication tools (chat, email, comments)
     - Session contains relevant corporate documentation or knowledge base content
     - Session contains version control context (branch name, commit messages, PR description, diff)
     - User described the task in prior messages this session
   - Context present → **AUTO mode**
   - None of the above → **GUIDED mode**

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

**Q1** (ask when no task description was provided):
> What is this task? One or two sentences.

**Q2** (ask when a done criterion is still unclear after Q1):
> How will you know this task is done — one concrete signal?
> Example: "the button submits without error", "migration runs clean in staging"

**Q3** (ask when the scope boundary is still unclear after Q1–Q2):
> What is explicitly NOT part of this task right now?

After answers → generate output → wait for confirmation.

---

## GUARD Mode

DoD file exists. Read it before doing anything else.

1. **Read and display existing DoD.** Ask "Still valid?" — do this when invoked with no new task description or content.

2. **If a new task description or content was provided:** compare against existing DoD and show diff:

```
DoD change detected:

[diff block — see Changelog Rules]

! Reason required to proceed:
```

Stop until the user provides a reason. Without reason — do not update.

3. On the reason provided → update DoD body → follow **File Writing › On Update**.

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

---

## File Writing

On user confirmation (`yes`) → write a file. On `edit: <changes>` → apply edits, redisplay output, confirm again.

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

### On Create

Write a full file. Changelog entry: `— created`, reason: `initial DoD`.

### On Update (GUARD mode, reason confirmed)

Update body sections (Goal / Done When / Out of Scope). Append a new changelog entry.

### On Completion

Triggered by `/strict-dod --done` or user explicitly confirming the task is finished.
Set frontmatter `status: done`. Append entry: `— done` with user-provided reason.
