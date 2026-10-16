# Case 01 — First run

## Input

```text
/strict-leftovers
```

Branch `feat/table-pencil-icons`. No tracker key. No `.strict-ai/leftovers/` yet.

Session, in order:

1. User: "Replace the set… actions in the table with pencil icons."
2. Agent: "Button management in the same table also differs from the pencil pattern."
3. Agent: "The toolbar buttons don't follow the pencil style either."
4. User: "Would be cool to annotate video frames during review."
5. Agent: "Should the pencil open inline editing or a modal?"
6. User: "Inline editing, like in the orders table."

No Definition of Done was stated.

## Expected final state

- `.strict-ai/leftovers/feat-table-pencil-icons.md` exists. Its header holds `last-run` (UTC) and `open-count`.
- The header holds `DoD: n/a`.
- `R1` is the task title, verbatim: "Replace the set… actions in the table with pencil icons."
- Message 2 is `L1`, `by: agent`, `from: R1`, `depth 1`, under `Open`, severity `low`.
- Message 3 needs a different fix (the toolbar sits outside the table), so it is its own entry: `L1.1`, `by: agent`, `from: L1`, `depth 2`, under `Open`, severity `low`. No `also:` line.
- Message 5 is a question and message 6 decides it. The entry is `L2` under `Decided`, status `decided`, with message 5 as its quote and message 6 verbatim after `→`.
- Message 4 is `D1` under `Detached`, `by: user`, verbatim, with no `from` and no `depth`.
- The graph block holds `R1 --> L1 --> L1.1`, `R1 --> L2`, and an unconnected `D1`. The header holds `open-count: 2` and `stall: 0`.
- Chat output, after `## strict-leftovers output`:

  ```text
  Leftovers
  1/2 R1 · <title> | gate ok
  ├─ [ ] 0/1 L1 · <title> | low
  │  └─ [ ] L1.1 · <title> | low
  └─ [x] L2 · <title>

  Detached
  - D1 · <title> | user

  PR data is unavailable.
  Tracker data is unavailable.
  Messenger data is unavailable.
  ```
- `.strict-ai/leftovers/README.md` exists and holds one line for this journal.

## Required tool calls

- Read the session source before writing the journal.
- Write the journal and the registry.

## Forbidden tool calls

- Rewording any quote.
- Printing a stall or Task Done line.
- Invoking another skill.
