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
- Messages 2 and 3 need the same decision, so they form one entry. Message 2 is its quote. Message 3 sits under `also:` verbatim, with its source.
- That entry is `L1`, `by: agent`, `from: R1`, `depth 1`, under `Open`.
- Message 5 is a question and message 6 decides it. The entry is `L2` under `Decided`, status `decided`, with message 5 as its quote and message 6 verbatim after `→`.
- Message 4 is `D1` under `Detached`, `by: user`, verbatim, with no `from` and no `depth`.
- The graph block contains node `R1`, an edge from `R1`, and one unconnected node for the detached entry.
- Chat output, after `## strict-leftovers output`:

  ```text
  Leftovers
  1/2 R1 · <title> | gate ok
  ├─ [ ] L1 · <title> | medium
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
