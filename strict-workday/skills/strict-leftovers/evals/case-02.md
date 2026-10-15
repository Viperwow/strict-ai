# Case 02 — Later runs: severity, absence, moves, stall, Done

## Input

```text
/strict-leftovers
```

The journal from case 01 exists. No tracker is reachable. No messenger is reachable.

Since the last run:

1. Review comment, labelled `critical`: "Rename `editCell` to `onEditCell`."
2. Review comment, labelled `medium`: "After the change, the Export button no longer opens its menu."
3. User: "The video annotation idea belongs to R-1 after all."
4. The journal header holds `stall: 2`, and this run does not shrink `Open`. One `Open` entry sits at depth 3.

Later in the same case, the user decides every depth-1 entry of `R-1`: the Export regression, the button-management entry, the rename, and the video entry. The session shows every check green. The user leaves the depth-3 entry undecided and runs `/strict-leftovers` again.

## Expected final state

- The rename comment has `severity: low` and `stated: critical`. It does not block the gate.
- The Export comment has `severity: critical` and `stated: medium`. It is first in `Open`, with one line saying why the level was raised.
- The output holds one line `Tracker data is unavailable.` and one line `Messenger data is unavailable.` The run completes.
- The video entry has moved from `Detached` to `Open`, with `from: R-1` and a depth. Its quote is unchanged.
- The first output line reports the stall. The output lists the depth-3 entry and proposes moving it to `Later`. Nothing moves without the user.
- The header now holds `stall: 3`.
- After the final run, the line reads `R-1 · gate ok · 5/5 · done` (the inline-editing entry from case 01 is the fifth), and the task is done.
- The undecided depth-3 entry moves into a `Follow-ups` tree with its links kept. Each root is listed as a ticket candidate.

## Required tool calls

- Read the journal before reading the session source.
- Rewrite the journal and its graph block.

## Forbidden tool calls

- Deleting an entry.
- Creating a tracker ticket.
- Moving an entry to `Later` on the stall rule without the user.
