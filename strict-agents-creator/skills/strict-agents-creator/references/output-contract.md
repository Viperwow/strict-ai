# Output contract

Where the files land, and what the skill reports after writing.

## Paths

Decide the destination before the gate, so the human approves the real paths rather than placeholders.

| Scope | Agent | Eval |
|---|---|---|
| project | `.claude/agents/<name>.md` | `.claude/agent-evals/<name>/case-01.md` |
| user | `~/.claude/agents/<name>.md` | `~/.claude/agent-evals/<name>/case-01.md` |

Evals live *outside* the agents directory on purpose: Claude Code scans `.claude/agents/` and `~/.claude/agents/` recursively for agent definitions, and eval cases are not agents.

Rules:

- `name` uses lowercase letters and hyphens, and stays unique across the whole agents tree — a duplicate name shadows the other file.
- Number further cases `case-02`, `case-03`.
- Never write until the human clears gate 7 and a golden case exists.

## Gate 7 block

Show all three together — the agent, the case, and the paths — so one confirmation covers everything:

```text
Agent   → <agent path>
Eval    → <eval path>
Model   → <model> (<one-line rationale>)
Skills  → <preloaded skills, or "none">

<the assembled agent .md>

<the golden case>

Write these? [yes / edit: ... / user  (write to ~/.claude instead)]
```

## Report block

Print this after writing:

```text
✓ Agent created: <name>
  Agent:  <agent path>   ·  model: <model> — <rationale>
  Eval:   <eval path>   (1 golden case)

Activate:
  Claude Code scans the agents directories, so there is no install step. Ask for the
  agent by name, or pick it from the @-mention typeahead. If it is not offered yet,
  restart the session.
```

## Recurring gap — print only when one exists

Step 3 inlines a procedure whenever no available skill covers the need. When that procedure will clearly recur across future agents, append this block; when it will not, omit the block entirely. A permanent "Recurring gap: none" line trains the reader to skip it.

```text
Recurring gap:
  <the inlined procedure> — worth extracting into a reusable skill as a separate task.
```

Report it and stop there. Extracting the skill is its own task with its own review and eval, and starting it here derails the agent you were asked to build.
