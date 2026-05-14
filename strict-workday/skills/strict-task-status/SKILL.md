---
name: strict-task-status
description: Get current status of a task, one atomic next step, and a scope guard. Use when returning to a task, asking "what's next", "where am I", "task status", or running /strict-task-status on a named task or Jira key.
---

# strict-task-status

Three outputs: **Where** (current state) · **Next** (one atomic step) · **Guard** (scope drift).

Always combines session history with project change history — never skip either.

## Evidence

| Source | What to collect |
|:---|:---|
| **Session** | recent messages, decisions, blockers, goals, intent |
| **Project** | working tree, diffs, recent commits, touched files |
| **Optional** | Jira issue, memory files, local docs, Slack, Confluence, Obsidian Vault — when cheap and relevant |

## Energy

Read local time automatically. Derive energy level and step bias:

| Time | Energy | Step bias |
|:---|:---|:---|
| 06:00–10:00 | `low` | clarify, capture, unblock |
| 10:00–15:00 | `high` | execute, make real progress |
| 15:00–18:00 | `mid` | execute one concrete piece |
| 18:00–06:00 | `low` | capture state, stop clean |

Render at top of output: `Time: midday · Energy: high`

## Output

### Task link
If resolvable: `Task: [<key or title>](<url>)` — Jira > GitHub/GitLab > other tracker > local path. Omit if nothing resolves.

### Where

```
Progress: [██████░░░░] ~60% — <stage label>
```

| Phase | Status | Item |
|:---|:---|:---|
| req | done | ... |
| impl | in progress | ... |
| tests | pending | ... |
| pr | pending | ... |

Phases are inferred from the task type. Typical order: `req` · `impl` · `tests` · `pr`. Add or drop phases as the task demands. Row order within each phase: done → in progress → pending.

When `req` is the active phase, render Contact Points directly below the checkpoint table — inferred from the task domain:

| Contact | Why and what                         |
|:---|:-------------------------------------|
| <role or name> | <whya and what to clarify with them> |

### Next

Always one atomic action. Choose the smallest step that moves the task forward given current energy.

| Time | Action | Why |
|:---|:---|:---|
| Nm | concrete atomic action | reason |

### Companions

Tasks outside the current workflow but in the same domain — things that could be affected or that shouldn't be forgotten. Keep it short.

| Item | Where to track |
|:---|:---|
| ... | current task / backlog / separate task |

Write `No companions identified.` when clean.

### Guard

Per drifted item: **What** · **Why off scope** · **Recommendation** (`drop` / `defer` / `split` / `keep`).

Write `No drift detected.` when clean.
