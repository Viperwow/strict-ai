---
name: strict-task-status
description: Get current status of a task, one atomic next step, and a scope guard. Use when returning to a task, asking "what's next", "where am I", "task status", or running /strict-task-status on a named task or Jira key.
---

# strict-task-status

Four outputs: **Summary** (task context) · **Steps** (full path of atomic steps with estimates) · **Recommendations** (what to do next if blocked) · **Guard** (scope drift).

Always combines session history with project change history — never skip either.

## Evidence

| Source | What to collect |
|:---|:---|
| **Session** | recent messages, decisions, blockers, goals, intent, tried approaches |
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

Prefer time blocks for not more than 30 min for one task step to keep going by small steps.

## Output

### Task link
If resolvable: `Task: [<key or title>](<url>)` — Jira > GitHub/GitLab > another tracker > local path. Omit if nothing resolves.

### Summary

```
Goal: <what must be achieved>
Context: <why this matters / where it came from>
Vector: <what has been done so far and in what direction the work has been moving>
```

`Vector` captures trajectory, not current status — what was tried, what direction emerged, what momentum exists, why previous work was done.

### Steps

```
Progress: [██████░░░░] ~60% — <stage label>
```

Show the full recommended path, all steps in order. Time is an estimate only based on the user's previous performance.

| Phase | Status | Step | Est. |
|:---|:---|:---|:---|
| req | done | ... | ~Nm |
| req | done | ... | ~Nm |
| impl | in progress | ... | ~Nh |
| impl | in progress | ... | ~Nh |
| impl | in progress | ... | ~Nh |
| tests | pending | ... | ~Nm |
| tests | pending | ... | ~Nm |
| pr | pending | ... | ~Nm |

Phases are inferred from the task type. Typical order: `req` · `impl` · `tests` · `pr`. Add or drop phases as the task demands. Row order within each phase: done → in progress → blocked → pending.

No forks or alternatives in this table — recommended path only.

Statuses:
- `done` — completed
- `in progress` — actively being worked on (includes async steps waiting on external input; Est. format for async: `~Nm · wait ~Nh`)
- `blocked` — cannot start because it depends on an in-progress async step that has not resolved yet
- `pending` — not started, no dependency blocking it

Parallelism rules: mark a step `blocked` only if it directly depends on an unresolved async step. Independent steps are unaffected — the nearest independent pending step becomes `in progress`.
Atomic actions. Choose the smallest step that moves the task forward given current energy.

When `req` is the active phase, render Contact Points directly below the step table — inferred from the task domain:

### Recommendations

If some steps are blocked, there should be a list of alterternatives for in-progress tasks. 

| Est. | Action | Why |
|:---|:---|:---|
| Nm | concrete atomic action | reason |
| Nm | concrete atomic action | reason |
| Nm | concrete atomic action | reason |

Write `No recommendations identified.` when clean.

### Contact points

| Contact | Why and what |
|:---|:---|
| <role or name> | <why and what to clarify with them> |

### Companions

Tasks outside the current workflow but in the same domain — things that could be affected or that shouldn't be forgotten. Keep it short.

| Item | Where to track                    |
|:---|:----------------------------------|
| ... | task tracker task / side activity |

Write `No companions identified.` when clean.

### Guard

Per drifted item: **What** · **Why off scope** · **Recommendation** (`drop` / `defer` / `split` / `keep`).

Write `No drift detected.` when clean.
